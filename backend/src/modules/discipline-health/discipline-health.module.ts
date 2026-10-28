import { Module } from '@nestjs/common';
import { DisciplineHealthService } from './discipline-health.service';
import { DisciplineHealthController } from './discipline-health.controller';

@Module({
  controllers: [DisciplineHealthController],
  providers: [DisciplineHealthService],
  exports: [DisciplineHealthService],
})
export class DisciplineHealthModule {}
