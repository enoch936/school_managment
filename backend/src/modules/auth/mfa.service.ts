import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash, randomBytes } from 'crypto';
import { authenticator } from 'otplib';
import type { AppConfig } from '../../config/configuration';
import { PrismaService } from '../../database/prisma.service';

export interface MfaSetupResult {
  secret: string;
  otpauthUrl: string;
}

@Injectable()
export class MfaService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService<AppConfig, true>,
  ) {
    authenticator.options = { window: 1, step: 30 };
  }

  private hashRecoveryCode(code: string): string {
    return createHash('sha256').update(code).digest('hex');
  }

  async beginSetup(userId: string, email: string): Promise<MfaSetupResult> {
    const secret = authenticator.generateSecret();
    const issuer = this.config.get('MFA_ISSUER', { infer: true });
    const otpauthUrl = authenticator.keyuri(email, issuer, secret);

    await this.prisma.mfaFactor.deleteMany({ where: { userId, isConfirmed: false } });
    await this.prisma.mfaFactor.create({
      data: { userId, type: 'TOTP', secret, isConfirmed: false },
    });

    return { secret, otpauthUrl };
  }

  async confirm(userId: string, code: string): Promise<{ recoveryCodes: string[] }> {
    const factor = await this.prisma.mfaFactor.findFirst({
      where: { userId, type: 'TOTP', isConfirmed: false },
      orderBy: { createdAt: 'desc' },
    });
    if (!factor) throw new BadRequestException('No pending MFA setup found');

    if (!this.verifyCode(factor.secret, code)) {
      throw new BadRequestException('Invalid verification code');
    }

    const recoveryCodes = Array.from({ length: 10 }, () =>
      randomBytes(5).toString('hex'),
    );

    await this.prisma.mfaFactor.update({
      where: { id: factor.id },
      data: {
        isConfirmed: true,
        confirmedAt: new Date(),
        recoveryCodes: recoveryCodes.map((c) => this.hashRecoveryCode(c)),
      },
    });

    return { recoveryCodes };
  }

  async verifyForUser(userId: string, code: string): Promise<boolean> {
    const factor = await this.prisma.mfaFactor.findFirst({
      where: { userId, type: 'TOTP', isConfirmed: true },
    });
    if (!factor) return false;

    if (this.verifyCode(factor.secret, code)) return true;

    const hashed = this.hashRecoveryCode(code);
    const idx = factor.recoveryCodes.indexOf(hashed);
    if (idx >= 0) {
      const remaining = [...factor.recoveryCodes];
      remaining.splice(idx, 1);
      await this.prisma.mfaFactor.update({
        where: { id: factor.id },
        data: { recoveryCodes: remaining },
      });
      return true;
    }
    return false;
  }

  async isEnabled(userId: string): Promise<boolean> {
    const count = await this.prisma.mfaFactor.count({
      where: { userId, isConfirmed: true },
    });
    return count > 0;
  }

  async disable(userId: string): Promise<void> {
    await this.prisma.mfaFactor.deleteMany({ where: { userId } });
  }

  private verifyCode(secret: string, code: string): boolean {
    try {
      return authenticator.verify({ token: code.replace(/\s/g, ''), secret });
    } catch {
      return false;
    }
  }
}
