import { Branch, Department, Employee, UserAccount, CompanySettings, AuditRecord, MonthlyPayroll } from './types';

export const INITIAL_SETTINGS: CompanySettings = {
  companyName: 'شركة عطوي التجارية - أسواق الريامي الأول ذ.م.م',
  logoUrl: '',
  overtimeRate: 1.25,
  residenceAlertDays: 60,
  currency: 'د.ك',
  roundingStep: 0.050,
  receiptAmountType: 'cash',
  defaultVoucherBase: 1349,
  backupConfig: {
    enabled: true,
    frequency: 'daily',
    scheduledTime: '02:00',
    retentionCount: 14,
    autoIncludeUploads: true,
    chequeImagesCustomPath: 'uploads/cheques',
    preserveImagesOnReset: true,
    lastBackupDate: '2026-09-24 02:00:00',
    nextBackupDate: '2026-09-25 02:00:00',
  },
};

export const INITIAL_BRANCHES: Branch[] = [
  { id: 1, code: 'KWT-01', name: 'الفرع الرئيسي - العاصمة (شرق)', status: 'active', employeeCount: 4, totalSalary: 1850.000 },
  { id: 2, code: 'HAW-02', name: 'فرع حولي - شارع تونس', status: 'active', employeeCount: 3, totalSalary: 1120.000 },
  { id: 3, code: 'FRW-03', name: 'فرع الفروانية - العارضية الحرفية', status: 'active', employeeCount: 3, totalSalary: 1040.000 },
  { id: 4, code: 'AHD-04', name: 'فرع الأحمدي - مجمع الفحيحيل', status: 'active', employeeCount: 2, totalSalary: 740.000 },
];

export const INITIAL_DEPARTMENTS: Department[] = [
  { id: 1, branchId: 1, name: 'الإدارة والمالية', status: 'active' },
  { id: 2, branchId: 1, name: 'المبيعات والتسويق', status: 'active' },
  { id: 3, branchId: 2, name: 'المبيعات وخدمة العملاء', status: 'active' },
  { id: 4, branchId: 2, name: 'الصيانة والدعم الفني', status: 'active' },
  { id: 5, branchId: 3, name: 'المستودعات واللوجستيات', status: 'active' },
  { id: 6, branchId: 3, name: 'التوزيع والتوصيل', status: 'active' },
  { id: 7, branchId: 4, name: 'صالة العرض والمبيعات', status: 'active' },
];

export const INITIAL_EMPLOYEES: Employee[] = [
  {
    id: 1,
    civilId: '290041501234',
    fullName: 'أحمد محمود السعيد',
    branchId: 1,
    departmentId: 1,
    basicSalary: 650.000,
    dailyHours: 8,
    bankName: 'بنك الكويت الوطني (NBK)',
    iban: 'KW82NBOK0000000000001234567890',
    bankTransferAmount: 300.000,
    residenceExpiryDate: '2026-10-15', // أقل من 30 يوماً
    status: 'active',
  },
  {
    id: 2,
    civilId: '288120805678',
    fullName: 'خالد عبد الرحمن المنصور',
    branchId: 1,
    departmentId: 1,
    basicSalary: 550.000,
    dailyHours: 8,
    bankName: 'بيت التمويل الكويتي (KFH)',
    iban: 'KW35KFH0000000000000987654321',
    bankTransferAmount: 250.000,
    residenceExpiryDate: '2026-09-10', // منتهية!
    status: 'active',
  },
  {
    id: 3,
    civilId: '294062103456',
    fullName: 'محمد إبراهيم الفارسي',
    branchId: 1,
    departmentId: 2,
    basicSalary: 350.000,
    dailyHours: 8,
    bankName: 'بنك بوبيان (Boubyan)',
    iban: 'KW12BOUB0000000000005544332211',
    bankTransferAmount: 150.000,
    residenceExpiryDate: '2026-11-05', // أقل من 60 يوماً
    status: 'active',
  },
  {
    id: 4,
    civilId: '292081409876',
    fullName: 'طارق صلاح الدين النجار',
    branchId: 1,
    departmentId: 2,
    basicSalary: 300.000,
    dailyHours: 8,
    bankName: 'بنك الخليج (Gulf Bank)',
    iban: 'KW71GULB0000000000008877665544',
    bankTransferAmount: 100.000,
    residenceExpiryDate: '2027-04-20', // سارية
    status: 'active',
  },
  {
    id: 5,
    civilId: '291030504321',
    fullName: 'يوسف جمال العوضي',
    branchId: 2,
    departmentId: 3,
    basicSalary: 420.000,
    dailyHours: 8,
    bankName: 'بيت التمويل الكويتي (KFH)',
    iban: 'KW45KFH0000000000000332211445',
    bankTransferAmount: 200.000,
    residenceExpiryDate: '2026-10-02', // أقل من 30 يوماً
    status: 'active',
  },
  {
    id: 6,
    civilId: '295111908765',
    fullName: 'عمر شريف الدسوقي',
    branchId: 2,
    departmentId: 3,
    basicSalary: 380.000,
    dailyHours: 8,
    bankName: 'بنك الكويت الوطني (NBK)',
    iban: 'KW19NBOK0000000000009988776655',
    bankTransferAmount: 150.000,
    residenceExpiryDate: '2027-01-18', // سارية
    status: 'active',
  },
  {
    id: 7,
    civilId: '293072802468',
    fullName: 'سامي عبد الله الحداد',
    branchId: 2,
    departmentId: 4,
    basicSalary: 320.000,
    dailyHours: 8,
    bankName: 'بنك برقان (Burgan)',
    iban: 'KW60BURG0000000000001122334455',
    bankTransferAmount: 100.000,
    residenceExpiryDate: '2026-09-28', // أقل من 30 يوماً
    status: 'active',
  },
  {
    id: 8,
    civilId: '289051001357',
    fullName: 'بسام نبيل العلي',
    branchId: 3,
    departmentId: 5,
    basicSalary: 390.000,
    dailyHours: 8,
    bankName: 'بيت التمويل الكويتي (KFH)',
    iban: 'KW88KFH0000000000000778899001',
    bankTransferAmount: 150.000,
    residenceExpiryDate: '2026-11-20', // أقل من 90 يوماً
    status: 'active',
  },
  {
    id: 9,
    civilId: '296021508901',
    fullName: 'رامي كمال الشيخ',
    branchId: 3,
    departmentId: 6,
    basicSalary: 330.000,
    dailyHours: 8,
    bankName: 'بنك الخليج (Gulf Bank)',
    iban: 'KW44GULB0000000000002233445566',
    bankTransferAmount: 120.000,
    residenceExpiryDate: '2027-08-15', // سارية
    status: 'active',
  },
  {
    id: 10,
    civilId: '290091807654',
    fullName: 'ماجد عبد الحميد رضوان',
    branchId: 3,
    departmentId: 6,
    basicSalary: 320.000,
    dailyHours: 8,
    bankName: 'بنك بوبيان (Boubyan)',
    iban: 'KW66BOUB0000000000008899001122',
    bankTransferAmount: 100.000,
    residenceExpiryDate: '2026-10-25', // أقل من 60 يوماً
    status: 'active',
  },
  {
    id: 11,
    civilId: '292100405432',
    fullName: 'حسام الدين مصطفى',
    branchId: 4,
    departmentId: 7,
    basicSalary: 380.000,
    dailyHours: 8,
    bankName: 'بنك الكويت الوطني (NBK)',
    iban: 'KW22NBOK0000000000004455667788',
    bankTransferAmount: 150.000,
    residenceExpiryDate: '2027-05-10', // سارية
    status: 'active',
  },
  {
    id: 12,
    civilId: '294121206789',
    fullName: 'فهد عادل الشمري',
    branchId: 4,
    departmentId: 7,
    basicSalary: 360.000,
    dailyHours: 8,
    bankName: 'بيت التمويل الكويتي (KFH)',
    iban: 'KW77KFH0000000000000556677889',
    bankTransferAmount: 120.000,
    residenceExpiryDate: '2026-09-01', // منتهية!
    status: 'active',
  },
];

export const INITIAL_USERS: UserAccount[] = [
  {
    id: 1,
    username: 'admin',
    fullName: 'المسؤول العام للنظام',
    email: 'admin@company.com.kw',
    role: 'admin',
    status: 'active',
    branchId: null,
    createdAt: '2026-01-01 10:00:00',
  },
  {
    id: 2,
    username: 'accountant_kw',
    fullName: 'أحمد المحاسب المالي',
    email: 'accountant@company.com.kw',
    role: 'accountant',
    status: 'active',
    branchId: null,
    createdAt: '2026-01-15 11:30:00',
  },
  {
    id: 3,
    username: 'auditor_view',
    fullName: 'مراقب التدقيق المالي',
    email: 'auditor@company.com.kw',
    role: 'viewer',
    status: 'active',
    branchId: 1,
    createdAt: '2026-02-01 09:15:00',
  },
];

export const INITIAL_AUDIT_LOGS: AuditRecord[] = [
  {
    id: 1,
    username: 'admin',
    action: 'SYSTEM_INSTALL',
    tableName: 'system',
    ipAddress: '127.0.0.1',
    details: 'اكتمال تثبيت النظام وقفل معالج التنصيب بنجاح',
    createdAt: '2026-09-20 08:30:00',
  },
  {
    id: 2,
    username: 'admin',
    action: 'BRANCH_CREATE',
    tableName: 'branches',
    ipAddress: '127.0.0.1',
    details: 'إضافة فرع جديد: فرع العاصمة - شرق (KWT-01)',
    createdAt: '2026-09-20 08:35:12',
  },
  {
    id: 3,
    username: 'accountant_kw',
    action: 'PAYROLL_CALCULATE',
    tableName: 'payslips',
    ipAddress: '192.168.1.15',
    details: 'احتساب مسير رواتب شهر سبتمبر 2026 لـ 12 موظفاً',
    createdAt: '2026-09-20 09:10:45',
  },
  {
    id: 4,
    username: 'accountant_kw',
    action: 'PAYSLIP_PRINT',
    tableName: 'payslips',
    ipAddress: '192.168.1.15',
    details: 'طباعة قسيمة راتب الموظف: أحمد محمود السعيد',
    createdAt: '2026-09-20 09:45:00',
  },
];

// دالة احتساب الأيام المتبقية وتصنيف ألوان الإقامة
export function getResidenceStatus(expiryDateStr: string, alertThreshold = 60) {
  const today = new Date('2026-09-20');
  const expiry = new Date(expiryDateStr);
  const diffTime = expiry.getTime() - today.getTime();
  const days = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (days < 0) {
    return {
      daysRemaining: days,
      label: `منتهية منذ ${Math.abs(days)} يوماً`,
      category: 'expired',
      colorBadge: 'bg-red-500 text-white font-bold',
      rowHighlight: 'bg-red-50/70',
      iconColor: 'text-red-600',
    };
  }
  if (days <= 30) {
    return {
      daysRemaining: days,
      label: `تنتهي خلال ${days} يوماً (عاجل جداً)`,
      category: 'under_30',
      colorBadge: 'bg-orange-500 text-white font-bold',
      rowHighlight: 'bg-orange-50/70',
      iconColor: 'text-orange-600',
    };
  }
  if (days <= alertThreshold) {
    return {
      daysRemaining: days,
      label: `تنتهي خلال ${days} يوماً (إنذار)`,
      category: 'under_alert',
      colorBadge: 'bg-amber-400 text-slate-900 font-bold',
      rowHighlight: 'bg-amber-50/70',
      iconColor: 'text-amber-600',
    };
  }
  if (days <= 90) {
    return {
      daysRemaining: days,
      label: `متبقي ${days} يوماً (متابعة)`,
      category: 'under_90',
      colorBadge: 'bg-blue-100 text-blue-800 font-semibold',
      rowHighlight: '',
      iconColor: 'text-blue-600',
    };
  }
  return {
    daysRemaining: days,
    label: `سارية (متبقي ${days} يوماً)`,
    category: 'valid',
    colorBadge: 'bg-emerald-100 text-emerald-800 font-semibold',
    rowHighlight: '',
    iconColor: 'text-emerald-600',
  };
}

// دالة تقريب النقدي للأسفل الصارمة لأقرب 0.050 د.ك
export function roundCashDown(rawAmount: number, step = 0.050): number {
  if (rawAmount <= 0) return 0;
  const stepFils = Math.round(step * 1000) || 50;
  let fils = Math.round(rawAmount * 1000);
  fils = fils - (fils % stepFils);
  return Math.round(fils) / 1000;
}

export const INITIAL_SAVED_PAYROLLS: MonthlyPayroll[] = [
  {
    id: '2026-09',
    year: 2026,
    month: 9,
    monthName: 'سبتمبر 2026',
    daysInMonth: 30,
    voucherBaseNumber: 1349,
    createdAt: '2026-09-02',
    status: 'approved',
    employeeIds: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
    inputs: {
      1: { absentDays: 0, absentHours: 0, overtimeHours: 8, advanceDeduction: 0 },
      2: { absentDays: 1, absentHours: 0, overtimeHours: 0, advanceDeduction: 50.000 },
      3: { absentDays: 0, absentHours: 3, overtimeHours: 12, advanceDeduction: 0 },
      4: { absentDays: 0, absentHours: 0, overtimeHours: 0, advanceDeduction: 25.000 },
      5: { absentDays: 2, absentHours: 0, overtimeHours: 6, advanceDeduction: 0 },
      6: { absentDays: 0, absentHours: 0, overtimeHours: 10, advanceDeduction: 0 },
      7: { absentDays: 0, absentHours: 4, overtimeHours: 0, advanceDeduction: 20.000 },
      8: { absentDays: 0, absentHours: 0, overtimeHours: 5, advanceDeduction: 0 },
      9: { absentDays: 1, absentHours: 2, overtimeHours: 0, advanceDeduction: 30.000 },
      10: { absentDays: 0, absentHours: 0, overtimeHours: 8, advanceDeduction: 0 },
      11: { absentDays: 0, absentHours: 0, overtimeHours: 0, advanceDeduction: 0 },
      12: { absentDays: 0, absentHours: 0, overtimeHours: 15, advanceDeduction: 0 },
    },
    totals: {
      basic: 4750.000,
      absenceDed: 68.420,
      overtime: 142.650,
      advances: 125.000,
      net: 4699.230,
      bank: 2350.000,
      rawCash: 2349.230,
      finalCash: 2349.000,
      roundingDiff: 0.230,
    },
  },
  {
    id: '2026-08',
    year: 2026,
    month: 8,
    monthName: 'أغسطس 2026',
    daysInMonth: 31,
    voucherBaseNumber: 1245,
    createdAt: '2026-08-31',
    status: 'approved',
    employeeIds: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
    inputs: {
      1: { absentDays: 0, absentHours: 0, overtimeHours: 10, advanceDeduction: 0 },
      2: { absentDays: 0, absentHours: 0, overtimeHours: 0, advanceDeduction: 50.000 },
      3: { absentDays: 0, absentHours: 0, overtimeHours: 8, advanceDeduction: 0 },
      4: { absentDays: 0, absentHours: 0, overtimeHours: 0, advanceDeduction: 0 },
      5: { absentDays: 0, absentHours: 0, overtimeHours: 4, advanceDeduction: 0 },
      6: { absentDays: 0, absentHours: 0, overtimeHours: 6, advanceDeduction: 0 },
      7: { absentDays: 0, absentHours: 0, overtimeHours: 0, advanceDeduction: 20.000 },
      8: { absentDays: 0, absentHours: 0, overtimeHours: 0, advanceDeduction: 0 },
      9: { absentDays: 0, absentHours: 0, overtimeHours: 0, advanceDeduction: 0 },
      10: { absentDays: 0, absentHours: 0, overtimeHours: 12, advanceDeduction: 0 },
      11: { absentDays: 0, absentHours: 0, overtimeHours: 0, advanceDeduction: 0 },
      12: { absentDays: 0, absentHours: 0, overtimeHours: 8, advanceDeduction: 0 },
    },
    totals: {
      basic: 4750.000,
      absenceDed: 0,
      overtime: 118.200,
      advances: 70.000,
      net: 4798.200,
      bank: 2350.000,
      rawCash: 2448.200,
      finalCash: 2448.000,
      roundingDiff: 0.200,
    },
  },
  {
    id: '2026-07',
    year: 2026,
    month: 7,
    monthName: 'يوليو 2026',
    daysInMonth: 31,
    voucherBaseNumber: 1120,
    createdAt: '2026-07-31',
    status: 'approved',
    employeeIds: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
    inputs: {
      1: { absentDays: 0, absentHours: 0, overtimeHours: 5, advanceDeduction: 0 },
      2: { absentDays: 0, absentHours: 0, overtimeHours: 0, advanceDeduction: 50.000 },
      3: { absentDays: 0, absentHours: 0, overtimeHours: 6, advanceDeduction: 0 },
      4: { absentDays: 0, absentHours: 0, overtimeHours: 0, advanceDeduction: 0 },
      5: { absentDays: 0, absentHours: 0, overtimeHours: 0, advanceDeduction: 0 },
      6: { absentDays: 0, absentHours: 0, overtimeHours: 8, advanceDeduction: 0 },
      7: { absentDays: 0, absentHours: 0, overtimeHours: 0, advanceDeduction: 0 },
      8: { absentDays: 0, absentHours: 0, overtimeHours: 0, advanceDeduction: 0 },
      9: { absentDays: 0, absentHours: 0, overtimeHours: 0, advanceDeduction: 0 },
      10: { absentDays: 0, absentHours: 0, overtimeHours: 4, advanceDeduction: 0 },
      11: { absentDays: 0, absentHours: 0, overtimeHours: 0, advanceDeduction: 0 },
    },
    totals: {
      basic: 4400.000,
      absenceDed: 0,
      overtime: 65.400,
      advances: 50.000,
      net: 4415.400,
      bank: 2150.000,
      rawCash: 2265.400,
      finalCash: 2265.350,
      roundingDiff: 0.050,
    },
  },
];
