import { Module } from '@nestjs/common';
import { DatabaseModule } from '../shared/database/database.module';
import { AuditLogRepository } from './audit-log.repository';
import { AuditLogService } from './audit-log.service';

@Module({
  imports: [DatabaseModule],
  providers: [AuditLogRepository, AuditLogService],
})
export class AuditLogModule {}
