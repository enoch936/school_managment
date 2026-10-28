import { MiddlewareConsumer, Module, NestModule, ValidationPipe } from '@nestjs/common';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR, APP_PIPE } from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { LoggerModule } from 'nestjs-pino';
import type { AppConfig } from './config/configuration';
import { configuration } from './config/configuration';
import { CorrelationIdMiddleware } from './common/middleware/correlation-id.middleware';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { PermissionsGuard } from './common/guards/permissions.guard';
import { DatabaseModule } from './database/database.module';
import { CacheModule } from './infrastructure/cache/cache.module';
import { EmailModule } from './infrastructure/email/email.module';
import { StorageModule } from './infrastructure/storage/storage.module';
import { AuthorizationModule } from './modules/authorization/authorization.module';
import { AuditModule } from './modules/audit/audit.module';
import { AuditInterceptor } from './modules/audit/audit.interceptor';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { SchoolsModule } from './modules/schools/schools.module';
import { AcademicsModule } from './modules/academics/academics.module';
import { StudentsModule } from './modules/students/students.module';
import { GuardiansModule } from './modules/guardians/guardians.module';
import { ExaminationsModule } from './modules/examinations/examinations.module';
import { FinanceModule } from './modules/finance/finance.module';
import { LibraryModule } from './modules/library/library.module';
import { TransportModule } from './modules/transport/transport.module';
import { ReportsModule } from './modules/reports/reports.module';
import { AttendanceModule } from './modules/attendance/attendance.module';
import { StaffModule } from './modules/staff/staff.module';
import { TimetablesModule } from './modules/timetables/timetables.module';
import { AssignmentsModule } from './modules/assignments/assignments.module';
import { DisciplineHealthModule } from './modules/discipline-health/discipline-health.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { HealthModule } from './health/health.module';
import { MonitoringModule } from './modules/monitoring/monitoring.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      load: [configuration],
      envFilePath: ['.env', '../.env'],
    }),
    LoggerModule.forRoot({
      pinoHttp: {
        level: process.env.LOG_LEVEL ?? 'info',
        redact: {
          paths: [
            'req.headers.authorization',
            'req.headers.cookie',
            'res.headers["set-cookie"]',
            'req.body.password',
            'req.body.currentPassword',
            'req.body.newPassword',
            'req.body.mfaCode',
            'req.body.refreshToken',
          ],
          censor: '[REDACTED]',
        },
        customProps: (req) => ({ requestId: (req as { requestId?: string }).requestId }),
        autoLogging: {
          ignore: (req) => req.url?.includes('/health') ?? false,
        },
      },
    }),
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService<AppConfig, true>) => ({
        throttlers: [
          {
            ttl: config.get('THROTTLE_TTL_SECONDS', { infer: true }) * 1000,
            limit: config.get('THROTTLE_LIMIT', { infer: true }),
          },
        ],
      }),
    }),
    ScheduleModule.forRoot(),
    DatabaseModule,
    CacheModule,
    EmailModule,
    StorageModule,
    AuthorizationModule,
    AuditModule,
    AuthModule,
    UsersModule,
    SchoolsModule,
    AcademicsModule,
    StudentsModule,
    GuardiansModule,
    ExaminationsModule,
    FinanceModule,
    LibraryModule,
    TransportModule,
    ReportsModule,
    AttendanceModule,
    StaffModule,
    TimetablesModule,
    AssignmentsModule,
    DisciplineHealthModule,
    DashboardModule,
    NotificationsModule,
    HealthModule,
    MonitoringModule,
  ],
  providers: [
    {
      provide: APP_PIPE,
      useValue: new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        transformOptions: { enableImplicitConversion: true },
      }),
    },
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
    { provide: APP_INTERCEPTOR, useClass: TransformInterceptor },
    { provide: APP_INTERCEPTOR, useClass: AuditInterceptor },
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: PermissionsGuard },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(CorrelationIdMiddleware).forRoutes('*');
  }
}
