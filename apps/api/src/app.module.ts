import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { AuditLogModule } from './modules/audit-logs/audit-log.module';
import { TenantsModule } from './modules/tenants/tenants.module';
import { CompaniesModule } from './modules/companies/companies.module';
import { WorkersModule } from './modules/workers/workers.module';
import { CountriesModule } from './modules/countries/countries.module';
import { ContractsModule } from './modules/contracts/contracts.module';
import { OnboardingModule } from './modules/onboarding/onboarding.module';
import { DocumentsModule } from './modules/documents/documents.module';
import { PayrollModule } from './modules/payroll/payroll.module';
import { BenefitsModule } from './modules/benefits/benefits.module';
import { SupportCasesModule } from './modules/support-cases/support-cases.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';

@Module({
  imports: [
    // Global Config
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    
    // Global DB Access
    PrismaModule,
    
    // Security & Identity
    AuthModule,
    AuditLogModule,
    
    // Core Domain Modules
    TenantsModule,
    CompaniesModule,
    WorkersModule,
    CountriesModule,
    ContractsModule,
    OnboardingModule,
    DocumentsModule,
    PayrollModule,
    BenefitsModule,
    SupportCasesModule,
    DashboardModule,
  ],
})
export class AppModule {}
