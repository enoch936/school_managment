import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { createHash, randomUUID } from 'crypto';
import type { AppConfig } from '../../config/configuration';
import { PrismaService } from '../../database/prisma.service';
import type { JwtPayload } from './strategies/jwt.strategy';

export interface IssuedTokens {
  accessToken: string;
  refreshToken: string;
  sessionId: string;
  refreshExpiresAt: Date;
}

interface AccessPayload extends JwtPayload {
  type: 'access';
}

/**
 * Issues access tokens and rotates opaque refresh tokens.
 *
 * Refresh tokens are stored only as SHA-256 hashes and belong to a "family".
 * Presenting an already-rotated token (reuse) revokes the entire family, which
 * mitigates token-theft replay.
 */
@Injectable()
export class TokenService {
  constructor(
    private readonly jwt: JwtService,
    private readonly config: ConfigService<AppConfig, true>,
    private readonly prisma: PrismaService,
  ) {}

  private hashToken(raw: string): string {
    return createHash('sha256').update(raw).digest('hex');
  }

  private generateOpaqueToken(): string {
    // Two UUIDs provide 244 bits of entropy; stored hashed.
    return `${randomUUID()}.${randomUUID()}`;
  }

  async issueTokens(
    userId: string,
    email: string,
    context: { ip?: string; userAgent?: string; device?: string; familyId?: string } = {},
  ): Promise<IssuedTokens> {
    const refreshTtl = this.config.get('JWT_REFRESH_TTL', { infer: true });
    const refreshExpiresAt = this.addDuration(new Date(), refreshTtl);

    const sessionId = randomUUID();
    const familyId = context.familyId ?? randomUUID();

    const accessToken = await this.jwt.signAsync(
      { sub: userId, email, sid: sessionId, type: 'access' } satisfies AccessPayload,
      {
        secret: this.config.get('JWT_ACCESS_SECRET', { infer: true }),
        expiresIn: this.config.get('JWT_ACCESS_TTL', { infer: true }),
      },
    );

    const rawRefresh = this.generateOpaqueToken();

    await this.prisma.$transaction(async (tx) => {
      const refresh = await tx.refreshToken.create({
        data: {
          userId,
          tokenHash: this.hashToken(rawRefresh),
          familyId,
          expiresAt: refreshExpiresAt,
        },
      });
      await tx.session.create({
        data: {
          id: sessionId,
          userId,
          refreshTokenId: refresh.id,
          ipAddress: context.ip,
          userAgent: context.userAgent,
          device: context.device,
          expiresAt: refreshExpiresAt,
        },
      });
    });

    return {
      accessToken,
      refreshToken: rawRefresh,
      sessionId,
      refreshExpiresAt,
    };
  }

  async rotate(rawRefresh: string, email: string): Promise<IssuedTokens> {
    const tokenHash = this.hashToken(rawRefresh);
    const existing = await this.prisma.refreshToken.findUnique({
      where: { tokenHash },
      include: { session: true },
    });

    if (!existing) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    if (existing.revokedAt) {
      // Reuse detected: revoke the whole family.
      await this.prisma.refreshToken.updateMany({
        where: { familyId: existing.familyId, revokedAt: null },
        data: { revokedAt: new Date() },
      });
      await this.prisma.session.updateMany({
        where: { userId: existing.userId, isActive: true },
        data: { isActive: false, revokedAt: new Date() },
      });
      throw new UnauthorizedException('Refresh token reuse detected; sessions revoked');
    }

    if (existing.expiresAt < new Date()) {
      throw new UnauthorizedException('Refresh token expired');
    }

    // Revoke old session row and issue a new token in the same family.
    if (existing.session) {
      await this.prisma.session.update({
        where: { id: existing.session.id },
        data: { isActive: false, revokedAt: new Date() },
      });
    }

    const issued = await this.issueTokens(existing.userId, email, {
      familyId: existing.familyId,
    });

    await this.prisma.refreshToken.update({
      where: { id: existing.id },
      data: { revokedAt: new Date(), replacedBy: issued.sessionId },
    });

    return issued;
  }

  async revokeByRawToken(rawRefresh: string): Promise<void> {
    const tokenHash = this.hashToken(rawRefresh);
    const existing = await this.prisma.refreshToken.findUnique({ where: { tokenHash } });
    if (!existing) return;
    await this.prisma.$transaction([
      this.prisma.refreshToken.update({
        where: { id: existing.id },
        data: { revokedAt: new Date() },
      }),
      this.prisma.session.updateMany({
        where: { userId: existing.userId, refreshTokenId: existing.id },
        data: { isActive: false, revokedAt: new Date() },
      }),
    ]);
  }

  async revokeAllForUser(userId: string): Promise<void> {
    await this.prisma.$transaction([
      this.prisma.refreshToken.updateMany({
        where: { userId, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
      this.prisma.session.updateMany({
        where: { userId, isActive: true },
        data: { isActive: false, revokedAt: new Date() },
      }),
    ]);
  }

  private addDuration(from: Date, duration: string): Date {
    const match = /^(\d+)([smhd])$/.exec(duration.trim());
    if (!match) return new Date(from.getTime() + 30 * 24 * 3600 * 1000);
    const value = parseInt(match[1], 10);
    const unit = match[2];
    const multipliers: Record<string, number> = {
      s: 1000,
      m: 60 * 1000,
      h: 3600 * 1000,
      d: 24 * 3600 * 1000,
    };
    return new Date(from.getTime() + value * multipliers[unit]);
  }
}
