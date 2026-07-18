import { z } from 'zod';
import {
  UserRole,
  TenantStatus,
  UserStatus,
  CompanyStatus,
  EmploymentStatus,
  ContractType,
  ContractStatus,
  OnboardingTaskStatus,
  DocumentType,
  DocumentStatus,
  PayrollCycleStatus,
  PayrollItemStatus,
  BenefitType,
  BenefitStatus,
  SupportCategory,
  SupportPriority,
  SupportStatus,
} from './constants';

export const LoginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

export type LoginInput = z.infer<typeof LoginSchema>;

export const CompanyCreateSchema = z.object({
  name: z.string().min(2, 'Company name must be at least 2 characters'),
  legalName: z.string().min(2, 'Legal name must be at least 2 characters'),
  industry: z.string().min(2, 'Industry must be at least 2 characters'),
  headquartersCountry: z.string().length(2, 'Headquarters country must be a 2-letter ISO code'),
  primaryContactName: z.string().min(2, 'Contact name must be at least 2 characters'),
  primaryContactEmail: z.string().email('Invalid contact email address'),
});

export type CompanyCreateInput = z.infer<typeof CompanyCreateSchema>;

export const WorkerCreateSchema = z.object({
  companyId: z.string().uuid('Invalid company selection'),
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  email: z.string().email('Invalid email address'),
  countryCode: z.string().length(2, 'Country code must be a 2-letter ISO code'),
  jobTitle: z.string().min(2, 'Job title is required'),
  department: z.string().min(2, 'Department is required'),
  startDate: z.string().refine((val) => !isNaN(Date.parse(val)), 'Invalid start date format'),
  managerName: z.string().optional(),
  managerEmail: z.string().email('Invalid manager email address').optional().or(z.literal('')),
});

export type WorkerCreateInput = z.infer<typeof WorkerCreateSchema>;

export const ContractCreateSchema = z.object({
  workerId: z.string().uuid('Invalid worker ID'),
  countryId: z.string().uuid('Invalid country selection'),
  contractType: z.nativeEnum(ContractType),
  compensationAmount: z.number().positive('Compensation must be greater than zero'),
  compensationCurrency: z.string().length(3, 'Currency must be a 3-letter code (e.g. USD, EUR)'),
  effectiveDate: z.string().refine((val) => !isNaN(Date.parse(val)), 'Invalid effective date format'),
  terminationDate: z.string().refine((val) => !val || !isNaN(Date.parse(val)), 'Invalid termination date format').optional().nullable(),
});

export type ContractCreateInput = z.infer<typeof ContractCreateSchema>;

export const SupportCaseCreateSchema = z.object({
  workerId: z.string().uuid().optional().nullable(),
  companyId: z.string().uuid().optional().nullable(),
  category: z.nativeEnum(SupportCategory),
  priority: z.nativeEnum(SupportPriority),
  subject: z.string().min(5, 'Subject must be at least 5 characters'),
  description: z.string().min(10, 'Description must be at least 10 characters'),
});

export type SupportCaseCreateInput = z.infer<typeof SupportCaseCreateSchema>;

export const SupportCaseCommentCreateSchema = z.object({
  body: z.string().min(2, 'Comment must be at least 2 characters'),
  isInternal: z.boolean().default(false),
});

export type SupportCaseCommentCreateInput = z.infer<typeof SupportCaseCommentCreateSchema>;

export const DocumentRejectSchema = z.object({
  rejectionReason: z.string().min(3, 'Rejection reason must be at least 3 characters'),
});

export type DocumentRejectInput = z.infer<typeof DocumentRejectSchema>;

export const DocumentUploadSchema = z.object({
  documentType: z.nativeEnum(DocumentType),
  fileName: z.string().min(1, 'File name is required'),
  fileUrl: z.string().min(1, 'File URL or path is required'),
});

export type DocumentUploadInput = z.infer<typeof DocumentUploadSchema>;

export const PayrollCycleCreateSchema = z.object({
  companyId: z.string().uuid('Invalid company ID'),
  countryId: z.string().uuid('Invalid country ID'),
  periodStart: z.string().refine((val) => !isNaN(Date.parse(val)), 'Invalid start date'),
  periodEnd: z.string().refine((val) => !isNaN(Date.parse(val)), 'Invalid end date'),
  payDate: z.string().refine((val) => !isNaN(Date.parse(val)), 'Invalid pay date'),
});

export type PayrollCycleCreateInput = z.infer<typeof PayrollCycleCreateSchema>;

export const BenefitEnrollmentUpdateSchema = z.object({
  status: z.nativeEnum(BenefitStatus),
  providerName: z.string().min(2, 'Provider name is required'),
  effectiveDate: z.string().refine((val) => !isNaN(Date.parse(val)), 'Invalid effective date').optional().nullable(),
});

export type BenefitEnrollmentUpdateInput = z.infer<typeof BenefitEnrollmentUpdateSchema>;
