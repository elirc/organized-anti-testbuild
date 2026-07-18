import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seeding...');

  // 1. Clear database in correct order
  await prisma.auditLog.deleteMany({});
  await prisma.supportCaseComment.deleteMany({});
  await prisma.supportCase.deleteMany({});
  await prisma.benefitEnrollment.deleteMany({});
  await prisma.payrollItem.deleteMany({});
  await prisma.payrollCycle.deleteMany({});
  await prisma.document.deleteMany({});
  await prisma.onboardingTask.deleteMany({});
  await prisma.onboardingPlan.deleteMany({});
  await prisma.employmentContract.deleteMany({});
  await prisma.complianceRequirement.deleteMany({});
  await prisma.worker.deleteMany({});
  await prisma.company.deleteMany({});
  await prisma.user.deleteMany({});
  await prisma.tenant.deleteMany({});
  await prisma.country.deleteMany({});

  console.log('🧹 Cleaned existing database records.');

  // Common password hash for demo users
  const passwordHash = await bcrypt.hash('Password123!', 10);

  // 2. Seed Countries
  const us = await prisma.country.create({
    data: {
      code: 'US',
      name: 'United States',
      region: 'North America',
      currencyCode: 'USD',
      payrollFrequency: 'SEMI_MONTHLY',
      requiresLocalContract: true,
      requiresRightToWorkCheck: true,
    },
  });

  const gb = await prisma.country.create({
    data: {
      code: 'GB',
      name: 'United Kingdom',
      region: 'Europe',
      currencyCode: 'GBP',
      payrollFrequency: 'MONTHLY',
      requiresLocalContract: true,
      requiresRightToWorkCheck: true,
    },
  });

  const de = await prisma.country.create({
    data: {
      code: 'DE',
      name: 'Germany',
      region: 'Europe',
      currencyCode: 'EUR',
      payrollFrequency: 'MONTHLY',
      requiresLocalContract: true,
      requiresRightToWorkCheck: true,
    },
  });

  console.log('🌍 Seeded Countries.');

  // 3. Seed Compliance Requirements
  // US
  const usReq1 = await prisma.complianceRequirement.create({
    data: {
      countryId: us.id,
      name: 'W-4 Tax Form',
      description: 'Federal employee withholding allowance certificate.',
      requirementType: 'DOCUMENT',
      isRequired: true,
    },
  });
  const usReq2 = await prisma.complianceRequirement.create({
    data: {
      countryId: us.id,
      name: 'Form I-9 Right to Work',
      description: 'Employment eligibility verification.',
      requirementType: 'RIGHT_TO_WORK',
      isRequired: true,
    },
  });
  const usReq3 = await prisma.complianceRequirement.create({
    data: {
      countryId: us.id,
      name: 'Direct Deposit Authorization',
      description: 'Bank details verification for payroll delivery.',
      requirementType: 'DOCUMENT',
      isRequired: true,
    },
  });

  // GB
  const gbReq1 = await prisma.complianceRequirement.create({
    data: {
      countryId: gb.id,
      name: 'HMRC Starter Checklist',
      description: 'Tax code configuration checklist for new starters.',
      requirementType: 'DOCUMENT',
      isRequired: true,
    },
  });
  const gbReq2 = await prisma.complianceRequirement.create({
    data: {
      countryId: gb.id,
      name: 'Passport Verification',
      description: 'Proof of identity and right to work in the UK.',
      requirementType: 'RIGHT_TO_WORK',
      isRequired: true,
    },
  });

  // DE
  const deReq1 = await prisma.complianceRequirement.create({
    data: {
      countryId: de.id,
      name: 'German Tax ID',
      description: 'Steueridentifikationsnummer registration document.',
      requirementType: 'DOCUMENT',
      isRequired: true,
    },
  });
  const deReq2 = await prisma.complianceRequirement.create({
    data: {
      countryId: de.id,
      name: 'Statutory Health Insurance Certificate',
      description: 'Proof of membership in a public or private health insurance provider.',
      requirementType: 'DOCUMENT',
      isRequired: true,
    },
  });

  console.log('📜 Seeded Compliance Requirements.');

  // 4. Seed Tenants
  const tenantAcme = await prisma.tenant.create({
    data: {
      name: 'ACME Corp',
      slug: 'acme-corp',
      status: 'ACTIVE',
    },
  });

  const tenantStark = await prisma.tenant.create({
    data: {
      name: 'Stark Industries',
      slug: 'stark-industries',
      status: 'ACTIVE',
    },
  });

  console.log('🏢 Seeded Tenants.');

  // 5. Seed Users
  // Platform Admin (No Tenant)
  const platformAdmin = await prisma.user.create({
    data: {
      email: 'platform.admin@example.com',
      passwordHash,
      firstName: 'Alex',
      lastName: 'Admin',
      role: 'PLATFORM_ADMIN',
      status: 'ACTIVE',
    },
  });

  // Internal Ops (No Tenant, manages operations across tenants)
  const internalOps = await prisma.user.create({
    data: {
      email: 'ops@example.com',
      passwordHash,
      firstName: 'Sarah',
      lastName: 'Ops',
      role: 'INTERNAL_OPS',
      status: 'ACTIVE',
    },
  });

  // ACME Client Admin
  const acmeAdmin = await prisma.user.create({
    data: {
      tenantId: tenantAcme.id,
      email: 'client.admin@acme.example.com',
      passwordHash,
      firstName: 'Thomas',
      lastName: 'Acme',
      role: 'CLIENT_ADMIN',
      status: 'ACTIVE',
    },
  });

  // ACME Client HR
  const acmeHr = await prisma.user.create({
    data: {
      tenantId: tenantAcme.id,
      email: 'hr@acme.example.com',
      passwordHash,
      firstName: 'Helen',
      lastName: 'HR',
      role: 'CLIENT_HR',
      status: 'ACTIVE',
    },
  });

  // Stark Client Admin
  const starkAdmin = await prisma.user.create({
    data: {
      tenantId: tenantStark.id,
      email: 'client.admin@stark.example.com',
      passwordHash,
      firstName: 'Pepper',
      lastName: 'Potts',
      role: 'CLIENT_ADMIN',
      status: 'ACTIVE',
    },
  });

  // Workers users (will link to Workers soon)
  const userWorker1 = await prisma.user.create({
    data: {
      tenantId: tenantAcme.id,
      email: 'worker.one@example.com',
      passwordHash,
      firstName: 'John',
      lastName: 'Doe',
      role: 'WORKER',
      status: 'ACTIVE',
    },
  });

  const userWorker2 = await prisma.user.create({
    data: {
      tenantId: tenantAcme.id,
      email: 'worker.two@example.com',
      passwordHash,
      firstName: 'Jane',
      lastName: 'Smith',
      role: 'WORKER',
      status: 'ACTIVE',
    },
  });

  const userWorker3 = await prisma.user.create({
    data: {
      tenantId: tenantStark.id,
      email: 'worker.three@example.com',
      passwordHash,
      firstName: 'Peter',
      lastName: 'Parker',
      role: 'WORKER',
      status: 'ACTIVE',
    },
  });

  console.log('👤 Seeded Users.');

  // 6. Seed Companies
  const acmeTech = await prisma.company.create({
    data: {
      tenantId: tenantAcme.id,
      name: 'ACME Tech Solutions',
      legalName: 'ACME Tech Solutions Inc.',
      industry: 'Software & Technology',
      headquartersCountry: 'US',
      primaryContactName: 'Thomas Acme',
      primaryContactEmail: 'client.admin@acme.example.com',
      status: 'ACTIVE',
    },
  });

  const starkLogistics = await prisma.company.create({
    data: {
      tenantId: tenantStark.id,
      name: 'Stark Logistics',
      legalName: 'Stark Logistics GmbH',
      industry: 'Supply Chain & Manufacturing',
      headquartersCountry: 'DE',
      primaryContactName: 'Pepper Potts',
      primaryContactEmail: 'client.admin@stark.example.com',
      status: 'ACTIVE',
    },
  });

  console.log('🏭 Seeded Companies.');

  // 7. Seed Workers (Linked to Company and User)
  const worker1 = await prisma.worker.create({
    data: {
      tenantId: tenantAcme.id,
      companyId: acmeTech.id,
      userId: userWorker1.id,
      firstName: 'John',
      lastName: 'Doe',
      email: 'worker.one@example.com',
      countryCode: 'US',
      jobTitle: 'Senior Software Engineer',
      department: 'Engineering',
      employmentStatus: 'ACTIVE',
      startDate: new Date('2025-01-15'),
      managerName: 'Thomas Acme',
      managerEmail: 'client.admin@acme.example.com',
    },
  });

  const worker2 = await prisma.worker.create({
    data: {
      tenantId: tenantAcme.id,
      companyId: acmeTech.id,
      userId: userWorker2.id,
      firstName: 'Jane',
      lastName: 'Smith',
      email: 'worker.two@example.com',
      countryCode: 'GB',
      jobTitle: 'Product Designer',
      department: 'Product Development',
      employmentStatus: 'ONBOARDING',
      startDate: new Date('2026-06-01'),
      managerName: 'Helen HR',
      managerEmail: 'hr@acme.example.com',
    },
  });

  const worker3 = await prisma.worker.create({
    data: {
      tenantId: tenantStark.id,
      companyId: starkLogistics.id,
      userId: userWorker3.id,
      firstName: 'Peter',
      lastName: 'Parker',
      email: 'worker.three@example.com',
      countryCode: 'DE',
      jobTitle: 'Safety Inspector',
      department: 'Operations',
      employmentStatus: 'ONBOARDING',
      startDate: new Date('2026-07-01'),
      managerName: 'Pepper Potts',
      managerEmail: 'client.admin@stark.example.com',
    },
  });

  console.log('👷 Seeded Workers.');

  // 8. Seed Employment Contracts
  const contract1 = await prisma.employmentContract.create({
    data: {
      tenantId: tenantAcme.id,
      workerId: worker1.id,
      countryId: us.id,
      contractType: 'FULL_TIME',
      status: 'ACTIVE',
      compensationAmount: 120000,
      compensationCurrency: 'USD',
      effectiveDate: new Date('2025-01-15'),
    },
  });

  const contract2 = await prisma.employmentContract.create({
    data: {
      tenantId: tenantAcme.id,
      workerId: worker2.id,
      countryId: gb.id,
      contractType: 'FULL_TIME',
      status: 'IN_REVIEW',
      compensationAmount: 85000,
      compensationCurrency: 'GBP',
      effectiveDate: new Date('2026-06-01'),
    },
  });

  const contract3 = await prisma.employmentContract.create({
    data: {
      tenantId: tenantStark.id,
      workerId: worker3.id,
      countryId: de.id,
      contractType: 'PART_TIME',
      status: 'DRAFT',
      compensationAmount: 60000,
      compensationCurrency: 'EUR',
      effectiveDate: new Date('2026-07-01'),
    },
  });

  console.log('✏️ Seeded Contracts.');

  // 9. Seed Onboarding Plans & Tasks
  // Worker 1: Completed Onboarding
  const plan1 = await prisma.onboardingPlan.create({
    data: {
      tenantId: tenantAcme.id,
      workerId: worker1.id,
      status: 'COMPLETED',
      dueDate: new Date('2025-01-14'),
      completedAt: new Date('2025-01-12'),
    },
  });

  await prisma.onboardingTask.createMany({
    data: [
      {
        tenantId: tenantAcme.id,
        onboardingPlanId: plan1.id,
        title: 'Upload Passport Details',
        description: 'Verify identity check by uploading international passport.',
        taskType: 'DOCUMENT_UPLOAD',
        assignedToRole: 'WORKER',
        status: 'DONE',
        dueDate: new Date('2025-01-14'),
        completedAt: new Date('2025-01-10'),
      },
      {
        tenantId: tenantAcme.id,
        onboardingPlanId: plan1.id,
        title: 'Complete W-4 Withholding',
        description: 'Complete federal tax allowance certificate details.',
        taskType: 'PROFILE_INFO',
        assignedToRole: 'WORKER',
        status: 'DONE',
        dueDate: new Date('2025-01-14'),
        completedAt: new Date('2025-01-11'),
      },
      {
        tenantId: tenantAcme.id,
        onboardingPlanId: plan1.id,
        title: 'Verify Direct Deposit Bank Info',
        description: 'Supply primary checking routing/account numbers.',
        taskType: 'DOCUMENT_UPLOAD',
        assignedToRole: 'WORKER',
        status: 'DONE',
        dueDate: new Date('2025-01-14'),
        completedAt: new Date('2025-01-12'),
      },
    ],
  });

  // Worker 2: Active In-Progress Onboarding
  const plan2 = await prisma.onboardingPlan.create({
    data: {
      tenantId: tenantAcme.id,
      workerId: worker2.id,
      status: 'IN_PROGRESS',
      dueDate: new Date('2026-05-30'),
    },
  });

  await prisma.onboardingTask.createMany({
    data: [
      {
        tenantId: tenantAcme.id,
        onboardingPlanId: plan2.id,
        title: 'Upload UK Passport',
        description: 'Upload valid passport copy for UK Right-to-Work check.',
        taskType: 'DOCUMENT_UPLOAD',
        assignedToRole: 'WORKER',
        status: 'DONE',
        dueDate: new Date('2026-05-25'),
        completedAt: new Date('2026-05-20'),
      },
      {
        tenantId: tenantAcme.id,
        onboardingPlanId: plan2.id,
        title: 'Fill HMRC Starter Checklist',
        description: 'Provide historic tax category info.',
        taskType: 'DOCUMENT_UPLOAD',
        assignedToRole: 'WORKER',
        status: 'TODO',
        dueDate: new Date('2026-05-28'),
      },
      {
        tenantId: tenantAcme.id,
        onboardingPlanId: plan2.id,
        title: 'Verify UK Local Contract Signature',
        description: 'Ops review of local employment contract.',
        taskType: 'CONTRACT_SIGNATURE',
        assignedToRole: 'INTERNAL_OPS',
        status: 'TODO',
        dueDate: new Date('2026-05-30'),
      },
    ],
  });

  // Worker 3: Blocked Onboarding
  const plan3 = await prisma.onboardingPlan.create({
    data: {
      tenantId: tenantStark.id,
      workerId: worker3.id,
      status: 'BLOCKED',
      dueDate: new Date('2026-06-25'),
    },
  });

  await prisma.onboardingTask.createMany({
    data: [
      {
        tenantId: tenantStark.id,
        onboardingPlanId: plan3.id,
        title: 'Provide German Tax ID',
        description: 'Upload official tax identification number document.',
        taskType: 'DOCUMENT_UPLOAD',
        assignedToRole: 'WORKER',
        status: 'BLOCKED',
        dueDate: new Date('2026-06-20'),
      },
      {
        tenantId: tenantStark.id,
        onboardingPlanId: plan3.id,
        title: 'Health Insurance Proof',
        description: 'Upload public statutory health insurance certificate.',
        taskType: 'DOCUMENT_UPLOAD',
        assignedToRole: 'WORKER',
        status: 'TODO',
        dueDate: new Date('2026-06-20'),
      },
    ],
  });

  console.log('📋 Seeded Onboarding Plans & Tasks.');

  // 10. Seed Documents
  // Worker 1 (Approved documents)
  await prisma.document.createMany({
    data: [
      {
        tenantId: tenantAcme.id,
        workerId: worker1.id,
        uploadedByUserId: userWorker1.id,
        documentType: 'PASSPORT',
        fileName: 'us_passport_johndoe.pdf',
        fileUrl: '/uploads/acme-corp/worker-1/passport.pdf',
        status: 'APPROVED',
      },
      {
        tenantId: tenantAcme.id,
        workerId: worker1.id,
        uploadedByUserId: userWorker1.id,
        documentType: 'TAX_FORM',
        fileName: 'w4_johndoe_2025.pdf',
        fileUrl: '/uploads/acme-corp/worker-1/w4.pdf',
        status: 'APPROVED',
      },
      {
        tenantId: tenantAcme.id,
        workerId: worker1.id,
        uploadedByUserId: userWorker1.id,
        documentType: 'BANK_INFO',
        fileName: 'bank_auth_doe.pdf',
        fileUrl: '/uploads/acme-corp/worker-1/bank_info.pdf',
        status: 'APPROVED',
      },
    ],
  });

  // Worker 2 (Pending and approved)
  await prisma.document.createMany({
    data: [
      {
        tenantId: tenantAcme.id,
        workerId: worker2.id,
        uploadedByUserId: userWorker2.id,
        documentType: 'PASSPORT',
        fileName: 'uk_passport_janesmith.pdf',
        fileUrl: '/uploads/acme-corp/worker-2/passport.pdf',
        status: 'APPROVED',
      },
      {
        tenantId: tenantAcme.id,
        workerId: worker2.id,
        uploadedByUserId: userWorker2.id,
        documentType: 'TAX_FORM',
        fileName: 'hmrc_checklist_smith.pdf',
        fileUrl: '/uploads/acme-corp/worker-2/hmrc_checklist.pdf',
        status: 'PENDING_REVIEW',
      },
    ],
  });

  console.log('📁 Seeded Documents.');

  // 11. Seed Payroll Cycles & Items
  const payrollCycle1 = await prisma.payrollCycle.create({
    data: {
      tenantId: tenantAcme.id,
      companyId: acmeTech.id,
      countryId: us.id,
      periodStart: new Date('2026-05-01'),
      periodEnd: new Date('2026-05-15'),
      payDate: new Date('2026-05-20'),
      status: 'REVIEW',
    },
  });

  const payrollItem1 = await prisma.payrollItem.create({
    data: {
      tenantId: tenantAcme.id,
      payrollCycleId: payrollCycle1.id,
      workerId: worker1.id,
      grossAmount: 5000.0,
      currency: 'USD',
      status: 'APPROVED',
      notes: 'May First Half Base Salary',
    },
  });

  console.log('💰 Seeded Payroll.');

  // 12. Seed Benefit Enrollments
  await prisma.benefitEnrollment.createMany({
    data: [
      {
        tenantId: tenantAcme.id,
        workerId: worker1.id,
        benefitType: 'HEALTH',
        providerName: 'Blue Shield PPO',
        status: 'ENROLLED',
        effectiveDate: new Date('2025-02-01'),
      },
      {
        tenantId: tenantAcme.id,
        workerId: worker1.id,
        benefitType: 'DENTAL',
        providerName: 'Delta Dental Premier',
        status: 'ENROLLED',
        effectiveDate: new Date('2025-02-01'),
      },
      {
        tenantId: tenantAcme.id,
        workerId: worker2.id,
        benefitType: 'HEALTH',
        providerName: 'Bupa Global UK',
        status: 'ELIGIBLE',
      },
    ],
  });

  console.log('🛡️ Seeded Benefits.');

  // 13. Seed Support Cases & Comments
  const case1 = await prisma.supportCase.create({
    data: {
      tenantId: tenantAcme.id,
      workerId: worker2.id,
      companyId: acmeTech.id,
      createdByUserId: userWorker2.id,
      assignedToUserId: internalOps.id,
      category: 'ONBOARDING',
      priority: 'MEDIUM',
      status: 'OPEN',
      subject: 'Clarification regarding HMRC Starter Checklist',
      description: 'Hi Support, I am unsure about how to fill section C of the HMRC checklist because I had a secondary job earlier this year. Can you advise?',
    },
  });

  // Comments for Case 1
  await prisma.supportCaseComment.createMany({
    data: [
      {
        tenantId: tenantAcme.id,
        supportCaseId: case1.id,
        authorUserId: internalOps.id,
        body: 'Hello Jane, if you held a secondary job, please tick Statement C. We will verify this against your last P45.',
        isInternal: false,
      },
      {
        tenantId: tenantAcme.id,
        supportCaseId: case1.id,
        authorUserId: userWorker2.id,
        body: 'Thanks Sarah! That makes perfect sense. I will fill it out and upload it tonight.',
        isInternal: false,
      },
      {
        tenantId: tenantAcme.id,
        supportCaseId: case1.id,
        authorUserId: internalOps.id,
        body: 'Note: Worker seems helpful and responsive. Right-to-work visa is verified, checklist is the only blocker.',
        isInternal: true,
      },
    ],
  });

  console.log('💬 Seeded Support Cases.');

  // 14. Seed Audit Logs
  await prisma.auditLog.createMany({
    data: [
      {
        tenantId: tenantAcme.id,
        actorUserId: platformAdmin.id,
        action: 'TENANT_CREATED',
        entityType: 'Tenant',
        entityId: tenantAcme.id,
        metadata: JSON.stringify({ name: 'ACME Corp', slug: 'acme-corp' }),
      },
      {
        tenantId: tenantAcme.id,
        actorUserId: acmeAdmin.id,
        action: 'COMPANY_CREATED',
        entityType: 'Company',
        entityId: acmeTech.id,
        metadata: JSON.stringify({ name: 'ACME Tech Solutions' }),
      },
      {
        tenantId: tenantAcme.id,
        actorUserId: internalOps.id,
        action: 'CONTRACT_STATUS_CHANGED',
        entityType: 'EmploymentContract',
        entityId: contract2.id,
        metadata: JSON.stringify({ oldStatus: 'DRAFT', newStatus: 'IN_REVIEW' }),
      },
      {
        tenantId: tenantAcme.id,
        actorUserId: internalOps.id,
        action: 'DOCUMENT_APPROVED',
        entityType: 'Document',
        entityId: worker2.id,
        metadata: JSON.stringify({ documentType: 'PASSPORT' }),
      },
    ],
  });

  console.log('📜 Seeded Audit Logs.');
  console.log('🏁 Database seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
