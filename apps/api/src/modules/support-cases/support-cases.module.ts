import { Module } from '@nestjs/common';
import { SupportCasesService } from './support-cases.service';
import { SupportCasesController } from './support-cases.controller';

@Module({
  providers: [SupportCasesService],
  controllers: [SupportCasesController],
  exports: [SupportCasesService],
})
export class SupportCasesModule {}
