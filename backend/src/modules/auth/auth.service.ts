import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { randomBytes, createHash } from 'crypto';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { CacheService } from '../../infrastructure/cache/cache.service';
import { EmailService } from '../../infrastructure/email/email.service';
import { AuthorizationService } from '../authorization/authorization.service';
import { ROLE_KEYS } from '../../common/constants/roles';
import type { AuthPrincipal } from '../../common/interfaces/auth-principal.interface';
import {
  ChangePasswordDto,
  ForgotPasswordDto,
  LoginDto,
  RegisterDto,
  ResetPasswordDto,
} from './dto/auth.dto';
import { MfaService } from './mfa.service';
import { PasswordService } from './password.service';
import { TokenService } from './token.service';

const MAX_FAILED_ATTEMPTS = 5;
const LOCK_MINUTES = 15;

export interface AuthResult {
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    isPlatformAdmin: boolean;
  };
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly passwords: PasswordService,
    private readonly tokens: TokenService,
    private readonly mfa: MfaService,
    private readonly email: EmailService,
    private readonly cache: CacheService,
    private readonly authorization: AuthorizationService,
  ) {}

  // ---------------------------------------------------------------------------
  // Registration
  // ---------------------------------------------------------------------------

  async register(dto: RegisterDto): Promise<AuthResult> {
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) throw new BadRequestException('An account with this email already exists');

    const passwordHash = await this.passwords.hash(dto.password);

    const result = await this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email: dto.email,
          phone: dto.phone,
          passwordHash,
          firstName: dto.firstName,
          lastName: dto.lastName,
        },
      });

      const organization = await tx.organization.create({
        data: {
          name: dto.organizationName,
          slug: await this.uniqueSlug(tx, dto.organizationName),
          email: dto.email,
        },
      });

      await tx.userOrganization.create({
        data: { userId: user.id, organizationId: organization.id, isOwner: true },
      });

      const ownerRole = await tx.role.findFirst({
        where: { key: ROLE_KEYS.SCHOOL_OWNER, organizationId: null },
      });

      await tx.membership.create({
        data: {
          userId: user.id,
          organizationId: organization.id,
          roleId: ownerRole?.id,
          status: 'ACTIVE',
          isPrimary: true,
        },
      });

      return { user };
    });

    const issued = await this.tokens.issueTokens(result.user.id, result.user.email);
    await this.sendVerificationEmail(result.user.id, result.user.email);

    return {
      accessToken: issued.accessToken,
      refreshToken: issued.refreshToken,
      expiresAt: issued.refreshExpiresAt,
      user: this.serializeUser(result.user),
    };
  }

  // ---------------------------------------------------------------------------
  // Login / logout / refresh
  // ---------------------------------------------------------------------------

  async login(dto: LoginDto, meta: { ip?: string; userAgent?: string }): Promise<AuthResult> {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (!user || !user.passwordHash) {
      throw new UnauthorizedException('Invalid email or password');
    }
    if (user.deletedAt) throw new UnauthorizedException('Account is not available');

    if (user.lockedUntil && user.lockedUntil > new Date()) {
      throw new UnauthorizedException(
        'Account is temporarily locked due to failed login attempts. Try again later.',
      );
    }

    const valid = await this.passwords.verify(user.passwordHash, dto.password);
    if (!valid) {
      await this.registerFailedAttempt(user.id, user.failedLoginAttempts);
      throw new UnauthorizedException('Invalid email or password');
    }

    if (!user.isActive) throw new UnauthorizedException('Account is not active');

    if (await this.mfa.isEnabled(user.id)) {
      if (!dto.mfaCode) {
        throw new UnauthorizedException('MFA code required');
      }
      const ok = await this.mfa.verifyForUser(user.id, dto.mfaCode);
      if (!ok) {
        await this.registerFailedAttempt(user.id, user.failedLoginAttempts);
        throw new UnauthorizedException('Invalid MFA code');
      }
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: { failedLoginAttempts: 0, lockedUntil: null, lastLoginAt: new Date() },
    });

    const issued = await this.tokens.issueTokens(user.id, user.email, meta);

    return {
      accessToken: issued.accessToken,
      refreshToken: issued.refreshToken,
      expiresAt: issued.refreshExpiresAt,
      user: this.serializeUser(user),
    };
  }

  async refresh(rawToken: string): Promise<AuthResult> {
    const user = await this.prisma.user
      .findFirst({
        where: { refreshTokens: { some: { tokenHash: this.hash(rawToken) } } },
        select: { id: true, email: true, firstName: true, lastName: true, isPlatformAdmin: true, isActive: true },
      })
      .catch(() => null);
    if (!user || !user.isActive) throw new UnauthorizedException('Invalid refresh token');

    const issued = await this.tokens.rotate(rawToken, user.email);
    return {
      accessToken: issued.accessToken,
      refreshToken: issued.refreshToken,
      expiresAt: issued.refreshExpiresAt,
      user: this.serializeUser(user),
    };
  }

  async logout(rawRefresh?: string, sessionId?: string | null): Promise<void> {
    if (rawRefresh) {
      await this.tokens.revokeByRawToken(rawRefresh);
    }
    if (sessionId) {
      await this.prisma.session.updateMany({
        where: { id: sessionId, isActive: true },
        data: { isActive: false, revokedAt: new Date() },
      });
    }
  }

  async revokeAllSessions(userId: string): Promise<void> {
    await this.tokens.revokeAllForUser(userId);
    await this.authorization.invalidate(userId);
  }

  // ---------------------------------------------------------------------------
  // Password reset / change
  // ---------------------------------------------------------------------------

  async forgotPassword(dto: ForgotPasswordDto): Promise<void> {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });
    // Always behave the same to avoid account enumeration.
    if (!user || user.deletedAt) return;

    const token = randomBytes(32).toString('base64url');
    await this.cache.set(`pwdreset:${this.hash(token)}`, user.id, 15 * 60);
    const resetUrl = `${process.env.CORS_ORIGINS?.split(',')[0] ?? ''}/reset-password?token=${token}`;
    await this.email.send({
      to: user.email,
      subject: 'Reset your password',
      html: `<p>Use the link below to reset your password. It expires in 15 minutes.</p><p><a href="${resetUrl}">${resetUrl}</a></p>`,
    });
  }

  async resetPassword(dto: ResetPasswordDto): Promise<void> {
    const key = `pwdreset:${this.hash(dto.token)}`;
    const userId = await this.cache.get<string>(key);
    if (!userId) throw new BadRequestException('Reset token is invalid or expired');

    const passwordHash = await this.passwords.hash(dto.password);
    await this.prisma.user.update({ where: { id: userId }, data: { passwordHash } });
    await this.cache.del(key);
    await this.revokeAllSessions(userId);
  }

  async changePassword(userId: string, dto: ChangePasswordDto): Promise<void> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user?.passwordHash) throw new BadRequestException('Account has no password set');
    const valid = await this.passwords.verify(user.passwordHash, dto.currentPassword);
    if (!valid) throw new BadRequestException('Current password is incorrect');

    const passwordHash = await this.passwords.hash(dto.newPassword);
    await this.prisma.user.update({ where: { id: userId }, data: { passwordHash } });
  }

  // ---------------------------------------------------------------------------
  // Email verification
  // ---------------------------------------------------------------------------

  async sendVerificationEmail(userId: string, email: string): Promise<void> {
    const token = randomBytes(32).toString('base64url');
    await this.cache.set(`emailverify:${this.hash(token)}`, userId, 24 * 3600);
    const url = `${process.env.CORS_ORIGINS?.split(',')[0] ?? ''}/verify-email?token=${token}`;
    await this.email.send({
      to: email,
      subject: 'Verify your email address',
      html: `<p>Confirm your email address:</p><p><a href="${url}">${url}</a></p>`,
    });
  }

  async verifyEmail(token: string): Promise<void> {
    const key = `emailverify:${this.hash(token)}`;
    const userId = await this.cache.get<string>(key);
    if (!userId) throw new BadRequestException('Verification link is invalid or expired');
    await this.prisma.user.update({
      where: { id: userId },
      data: { emailVerifiedAt: new Date() },
    });
    await this.cache.del(key);
  }

  // ---------------------------------------------------------------------------
  // MFA passthroughs
  // ---------------------------------------------------------------------------

  async setupMfa(userId: string, email: string) {
    return this.mfa.beginSetup(userId, email);
  }

  async confirmMfa(userId: string, code: string) {
    return this.mfa.confirm(userId, code);
  }

  async disableMfa(userId: string, code: string): Promise<void> {
    const ok = await this.mfa.verifyForUser(userId, code);
    if (!ok) throw new BadRequestException('Invalid MFA code');
    await this.mfa.disable(userId);
  }

  async principal(userId: string, organizationId: string | null, sessionId: string | null) {
    const principal = await this.authorization.buildPrincipal(userId, organizationId, sessionId);
    const profile = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        middleName: true,
        lastName: true,
        avatarUrl: true,
        isPlatformAdmin: true,
        emailVerifiedAt: true,
        lastLoginAt: true,
      },
    });
    return { principal: this.serializePrincipal(principal), user: profile };
  }

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  private serializeUser(user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    isPlatformAdmin?: boolean;
  }) {
    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      isPlatformAdmin: user.isPlatformAdmin ?? false,
    };
  }

  private serializePrincipal(principal: AuthPrincipal) {
    return {
      userId: principal.userId,
      email: principal.email,
      isPlatformAdmin: principal.isPlatformAdmin,
      permissions: [...principal.permissions],
      memberships: principal.memberships,
      activeOrganizationId: principal.activeOrganizationId,
      activeSchoolId: principal.activeSchoolId,
      activeCampusId: principal.activeCampusId,
    };
  }

  private async registerFailedAttempt(userId: string, current: number): Promise<void> {
    const attempts = current + 1;
    const data: { failedLoginAttempts: number; lockedUntil?: Date } = {
      failedLoginAttempts: attempts,
    };
    if (attempts >= MAX_FAILED_ATTEMPTS) {
      data.lockedUntil = new Date(Date.now() + LOCK_MINUTES * 60 * 1000);
    }
    await this.prisma.user.update({ where: { id: userId }, data });
  }

  private hash(value: string): string {
    return createHash('sha256').update(value).digest('hex');
  }

  private async uniqueSlug(tx: Prisma.TransactionClient, name: string): Promise<string> {
    const base =
      name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 40) || 'org';
    let slug = base;
    let suffix = 1;
    for (;;) {
      const existing = await tx.organization.findUnique({ where: { slug } });
      if (!existing) return slug;
      suffix += 1;
      slug = `${base}-${suffix}`;
    }
  }
}
