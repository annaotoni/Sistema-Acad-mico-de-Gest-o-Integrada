import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import Redis from 'ioredis';
import { ThrottlerStorageRedisService } from 'nestjs-throttler-storage-redis';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { validateEnv } from './config/env.validation';
import { BullMqModule } from './infrastructure/bullmq/bullmq.module';
import { RedisModule } from './infrastructure/redis/redis.module';
import { AuditModule } from './common/audit/audit.module';
import { JobsModule } from './jobs/jobs.module';
import { AcademicModule } from './modules/academic/academic.module';
import { AssignmentsModule } from './modules/assignments/assignments.module';
import { AttendanceModule } from './modules/attendance/attendance.module';
import { AuthModule } from './modules/auth/auth.module';
import { ContentModule } from './modules/content/content.module';
import { DocumentsModule } from './modules/documents/documents.module';
import { FinanceModule } from './modules/finance/finance.module';
import { GradesModule } from './modules/grades/grades.module';
import { LiveClassesModule } from './modules/live-classes/live-classes.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { SettingsModule } from './modules/settings/settings.module';
import { TicketsModule } from './modules/tickets/tickets.module';
import { PrismaModule } from './prisma/prisma.module';
import { WebhooksModule } from './webhooks/webhooks.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: validateEnv,
    }),
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        throttlers: [{ ttl: 60_000, limit: 60 }],
        storage: new ThrottlerStorageRedisService(
          new Redis(config.getOrThrow<string>('REDIS_URL')),
        ),
      }),
    }),
    RedisModule,
    BullMqModule,
    AuditModule,
    PrismaModule,
    AuthModule,
    SettingsModule,
    AcademicModule,
    ContentModule,
    AssignmentsModule,
    GradesModule,
    AttendanceModule,
    NotificationsModule,
    FinanceModule,
    DocumentsModule,
    LiveClassesModule,
    TicketsModule,
    WebhooksModule,
    JobsModule,
  ],
  controllers: [AppController],
  providers: [AppService, { provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
