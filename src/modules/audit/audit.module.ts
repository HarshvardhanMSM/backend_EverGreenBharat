import { Module, Global } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditLog } from './entities/audit-log.entity';
import { AuditService } from './audit.service';
import { AdminAuditController } from './admin-audit.controller';
import { AuditLogInterceptor } from '../../common/interceptors/audit-log.interceptor';

@Global()
@Module({
  imports: [TypeOrmModule.forFeature([AuditLog])],
  controllers: [AdminAuditController],
  providers: [AuditService, AuditLogInterceptor],
  exports: [AuditService, AuditLogInterceptor, TypeOrmModule],
})
export class AuditModule {}
