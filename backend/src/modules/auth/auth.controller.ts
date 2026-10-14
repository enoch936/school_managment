import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import type { Response } from 'express';
import type { AppConfig } from '../../config/configuration';
import { Public } from '../../common/decorators/public.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthenticatedRequest, AuthPrincipal } from '../../common/interfaces/auth-principal.interface';
import { AuthService, AuthResult } from './auth.service';
import {
  ChangePasswordDto,
  ForgotPasswordDto,
  LoginDto,
  MfaCodeDto,
  RefreshDto,
  RegisterDto,
  ResetPasswordDto,
  VerifyEmailDto,
} from './dto/auth.dto';
import {
  ACCESS_COOKIE,
  REFRESH_COOKIE,
  accessCookieOptions,
  clearCookieOptions,
  refreshCookieOptions,
} from './cookie.util';

const REFRESH_MAX_AGE_MS = 30 * 24 * 3600 * 1000;

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly config: ConfigService<AppConfig, true>,
  ) {}

  private get secureCookies(): boolean {
    return this.config.get('COOKIE_SECURE', { infer: true });
  }

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @ApiOperation({ summary: 'Register a school owner and organization' })
  @Post('register')
  async register(@Body() dto: RegisterDto, @Res({ passthrough: true }) res: Response) {
    return this.finish(res, await this.auth.register(dto));
  }

  @Public()
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @ApiOperation({ summary: 'Authenticate with email and password (optionally MFA code)' })
  @HttpCode(HttpStatus.OK)
  @Post('login')
  async login(
    @Body() dto: LoginDto,
    @Req() req: AuthenticatedRequest,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.auth.login(dto, {
      ip: req.ip,
      userAgent: req.header('user-agent') ?? undefined,
    });
    return this.finish(res, result);
  }

  @Public()
  @ApiOperation({ summary: 'Rotate refresh token and issue a new access token' })
  @HttpCode(HttpStatus.OK)
  @Post('refresh')
  async refresh(
    @Body() dto: RefreshDto,
    @Req() req: AuthenticatedRequest,
    @Res({ passthrough: true }) res: Response,
  ) {
    const raw = dto.refreshToken ?? (req.cookies?.[REFRESH_COOKIE] as string | undefined);
    if (!raw) throw new UnauthorizedException('No refresh token supplied');
    return this.finish(res, await this.auth.refresh(raw));
  }

  @ApiBearerAuth()
  @ApiOperation({ summary: 'Log out and revoke the current session' })
  @HttpCode(HttpStatus.OK)
  @Post('logout')
  async logout(
    @Req() req: AuthenticatedRequest,
    @CurrentUser() user: AuthPrincipal,
    @Body() dto: RefreshDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const raw = dto?.refreshToken ?? (req.cookies?.[REFRESH_COOKIE] as string | undefined);
    await this.auth.logout(raw, user?.sessionId ?? null);
    res.clearCookie(ACCESS_COOKIE, clearCookieOptions(this.secureCookies));
    res.clearCookie(REFRESH_COOKIE, clearCookieOptions(this.secureCookies));
    return { loggedOut: true };
  }

  @ApiBearerAuth()
  @ApiOperation({ summary: 'Current principal and profile' })
  @Get('me')
  async me(@CurrentUser() user: AuthPrincipal) {
    return this.auth.principal(user.userId, user.activeOrganizationId, user.sessionId);
  }

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @ApiOperation({ summary: 'Request a password reset link' })
  @HttpCode(HttpStatus.OK)
  @Post('forgot-password')
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    await this.auth.forgotPassword(dto);
    return { status: 'ok' };
  }

  @Public()
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @ApiOperation({ summary: 'Reset password with a valid token' })
  @HttpCode(HttpStatus.OK)
  @Post('reset-password')
  async resetPassword(@Body() dto: ResetPasswordDto) {
    await this.auth.resetPassword(dto);
    return { status: 'ok' };
  }

  @ApiBearerAuth()
  @ApiOperation({ summary: 'Change the current user password' })
  @HttpCode(HttpStatus.OK)
  @Post('change-password')
  async changePassword(@CurrentUser() user: AuthPrincipal, @Body() dto: ChangePasswordDto) {
    await this.auth.changePassword(user.userId, dto);
    return { status: 'ok' };
  }

  @Public()
  @ApiOperation({ summary: 'Verify an email address using a token' })
  @HttpCode(HttpStatus.OK)
  @Post('verify-email')
  async verifyEmail(@Body() dto: VerifyEmailDto) {
    await this.auth.verifyEmail(dto.token);
    return { status: 'ok' };
  }

  @ApiBearerAuth()
  @ApiOperation({ summary: 'Begin TOTP MFA setup' })
  @Post('mfa/setup')
  async setupMfa(@CurrentUser() user: AuthPrincipal) {
    return this.auth.setupMfa(user.userId, user.email);
  }

  @ApiBearerAuth()
  @ApiOperation({ summary: 'Confirm TOTP MFA setup and receive recovery codes' })
  @HttpCode(HttpStatus.OK)
  @Post('mfa/confirm')
  async confirmMfa(@CurrentUser() user: AuthPrincipal, @Body() dto: MfaCodeDto) {
    return this.auth.confirmMfa(user.userId, dto.code);
  }

  @ApiBearerAuth()
  @ApiOperation({ summary: 'Disable MFA' })
  @HttpCode(HttpStatus.OK)
  @Post('mfa/disable')
  async disableMfa(@CurrentUser() user: AuthPrincipal, @Body() dto: MfaCodeDto) {
    await this.auth.disableMfa(user.userId, dto.code);
    return { status: 'ok' };
  }

  // ---------------------------------------------------------------------------

  private finish(res: Response, result: AuthResult) {
    res.cookie(
      ACCESS_COOKIE,
      result.accessToken,
      accessCookieOptions(this.secureCookies, 15 * 60 * 1000),
    );
    res.cookie(
      REFRESH_COOKIE,
      result.refreshToken,
      refreshCookieOptions(this.secureCookies, REFRESH_MAX_AGE_MS),
    );
    return {
      accessToken: result.accessToken,
      expiresAt: result.expiresAt,
      user: result.user,
    };
  }
}
