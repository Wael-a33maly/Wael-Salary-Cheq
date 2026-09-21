export interface Branch {
  id: number;
  code: string;
  name: string;
  status: 'active' | 'inactive';
  employeeCount?: number;
  totalSalary?: number;
}

export interface Department {
  id: number;
  branchId: number;
  name: string;
  status: 'active' | 'inactive';
}

export interface Employee {
  id: number;
  civilId: string;
  fullName: string;
  branchId: number;
  departmentId: number;
  basicSalary: number;
  dailyHours: number;
  bankName: string;
  iban: string;
  bankTransferAmount: number;
  residenceExpiryDate: string;
  status: 'active' | 'inactive';
  // Calculated fields
  residenceStatus?: {
    daysRemaining: number;
    colorClass: string;
    label: string;
  };
}

export interface PayrollRow {
  employeeId: number;
  civilId: string;
  employeeName: string;
  branchName: string;
  departmentName: string;
  basicSalary: number;
  dailyHours: number;
  dailyRate: number;
  hourlyRate: number;
  absentDays: number;
  absentDaysDeduction: number;
  absentHours: number;
  absentHoursDeduction: number;
  salaryAfterDeductions: number;
  overtimeHours: number;
  overtimeHourlyRate: number;
  overtimeAmount: number;
  advanceDeduction: number;
  netSalary: number;
  bankTransferAmount: number;
  rawCash: number;
  finalCash: number;
  roundingDifference: number;
  bankName: string;
  iban: string;
}

export interface UserAccount {
  id: number;
  username: string;
  fullName: string;
  email: string;
  role: 'admin' | 'accountant' | 'viewer';
  status: 'active' | 'inactive';
  branchId: number | null;
  createdAt: string;
}

export interface SystemConfig {
  dbHost: string;
  dbName: string;
  dbUser: string;
  dbPass: string;
}

export interface CompanySettings {
  companyName: string;
  logoUrl?: string;
  overtimeRate: number;
  residenceAlertDays: number;
  chequeDueDateAlertDays?: number; // أيام تنبيه استحقاق الشيكات
  defaultChequePrinter?: string; // اسم طابعة الشيكات الافتراضية
  currency: string;
  roundingStep: number;
  // Printing settings
  receiptAmountType?: 'net' | 'cash' | 'bank'; // نوع المبلغ المطبوع بالإيصال: صافي، نقدي، أو بنكي
  defaultVoucherBase?: number; // رقم السند الورقي الافتراضي
  chequePrintSettings?: ChequePrintSettings;
}

export interface ChequePrintSettings {
  offsetX: number; // إزاحة أفقية عامة بالملليمتر
  offsetY: number; // إزاحة رأسية عامة بالملليمتر
  showBackgroundOnPrint: boolean; // طباعة تصميم الشيك بالكامل أم طباعة النصوص فقط على شيك ورقي فعلي
  defaultCrossing: boolean; // تسطير افتراضي (للمستفيد الأول فقط)
  defaultBearerCrossing: boolean; // شطب عبارة "أو لحامله"
  defaultPrinterName?: string; // اسم طابعة الشيكات الافتراضية
  chequeDueDateAlertDays?: number; // عدد الأيام لتنبيه استحقاق الشيك
  templateMode?: 'scanned_image' | 'vector_template' | 'blank' | 'none'; // قالب المعاينة: صورة ممسوحة، تصميم متجهي، أو بدون خلفية
  // ضبط كل حقل منفرداً (أعلى/أسفل Y، يمين/يسار X بالملليمتر)
  dateOffsetX?: number;
  dateOffsetY?: number;
  payeeOffsetX?: number;
  payeeOffsetY?: number;
  wordsOffsetX?: number;
  wordsOffsetY?: number;
  amountOffsetX?: number;
  amountOffsetY?: number;
}

export interface BeneficiaryCategory {
  id: string;
  name: string;
  color?: string;
  description?: string;
  isDefault?: boolean;
}

export interface BankAccount {
  id: string; // e.g. "acc-cbk-main"
  accountName: string; // e.g. "حساب العمليات الرئيسي - البنك التجاري"
  bankName: string; // e.g. "البنك التجاري الكويتي (CBK)"
  bankCode: 'CBK' | 'NBK' | 'KFH' | 'GULF' | 'BURGAN' | 'BOUBYAN' | 'WARBA';
  accountNumber: string; // e.g. "1020491823"
  iban: string; // e.g. "KW18CBKU000000001020491823"
  branchName: string; // e.g. "الفرع الرئيسي - شارع مبارك الكبير"
  currency: string; // "د.ك"
  currentBalance: number; // الرصيد الحالي التقديري بالدينار الكويتي
  isDefault: boolean;
  status: 'active' | 'inactive';
  chequeTemplate: 'CBK' | 'NBK' | 'KFH' | 'STANDARD';
  createdAt?: string;
}

export interface ChequeBook {
  id: string; // e.g. "cb-cbk-01"
  bankAccountId: string; // معرف الحساب البنكي المرتبط به الدفتر
  bookCode: string; // e.g. "BK-CBK-2026-01"
  bookName: string; // e.g. "دفتر شيكات التجاري رقم 1"
  serialFrom: number; // من رقم كذا e.g. 100001
  serialTo: number; // إلى رقم كذا e.g. 100050
  totalLeaves: number; // 50 ورقة
  currentSerial: number; // الرقم التسلسلي التالي المتاح للإصدار
  receivedDate: string; // YYYY-MM-DD
  status: 'active' | 'completed' | 'cancelled';
  notes?: string;
}

export interface Beneficiary {
  id: string; // e.g. "ben-1"
  nameAr: string; // الاسم بالعربية (كما سيطبع على الشيك)
  nameEn?: string; // Beneficiary English Name
  bankAccountId?: string | 'all'; // مرتبط بحساب بنكي معين أو عام لكافة الحسابات
  category: 'company' | 'vendor' | 'employee' | 'government' | 'individual' | string;
  civilIdOrCR?: string; // الرقم المدني أو السجل التجاري
  bankName?: string;
  iban?: string;
  phoneNumber?: string;
  notes?: string;
  status: 'active' | 'inactive';
  createdAt: string;
}

export interface IssuedCheque {
  id: string; // e.g. "chk-1001"
  bankAccountId: string;
  chequeBookId: string;
  chequeNumber: number; // e.g. 100001
  chequeNumberStr: string; // e.g. "00100001"
  beneficiaryId?: string;
  beneficiaryName: string; // الاسم المطبوع على الشيك
  amount: number; // بالدينار الكويتي مثلاً 1450.750
  amountInWordsAr: string; // تفقيط المبلغ بالحروف العربية
  amountInWordsEn?: string; // تفقيط المبلغ بالإنجليزية
  tafqeetLang?: 'ar' | 'en'; // لغة التفقيط المختارة (عربي أو إنجليزي)
  issueDate: string; // YYYY-MM-DD
  dueDate: string; // YYYY-MM-DD (تاريخ الشيك / الاستحقاق)
  status: 'issued' | 'cashed' | 'cancelled'; // صادر (لم يصرف بعد / معلق) | منصرف | ملغى
  cashedDate?: string; // تاريخ الصرف الفعلي من البنك
  cancelledDate?: string; // تاريخ الإلغاء
  cancelReason?: string; // سبب الإلغاء
  isCrossed: boolean; // تسطير الشيك (للمستفيد الأول فقط A/C PAYEE ONLY)
  bearerCrossed: boolean; // شطب عبارة "أو لحامله"
  purpose: string; // البيان / الغرض (مثال: مستخلص توريدات، إيجار، رواتب...)
  notes?: string;
  createdBy: string;
  createdAt: string;
}

export interface MonthlyInputRecord {
  absentDays: number;
  absentHours: number;
  overtimeHours: number;
  advanceDeduction: number;
}

export interface MonthlyPayroll {
  id: string; // e.g. "2026-09"
  year: number;
  month: number;
  monthName: string; // e.g. "سبتمبر 2026"
  daysInMonth: number;
  voucherBaseNumber: number; // رقم السند الرئيسي الورقي مثلاً 1245
  createdAt: string;
  status: 'approved' | 'draft';
  employeeIds: number[];
  inputs: Record<number, MonthlyInputRecord>;
  totals: {
    basic: number;
    absenceDed: number;
    overtime: number;
    advances: number;
    net: number;
    bank: number;
    rawCash: number;
    finalCash: number;
    roundingDiff: number;
  };
}

export interface AuditRecord {
  id: number;
  username: string;
  action: string;
  tableName: string;
  ipAddress: string;
  details: string;
  createdAt: string;
  oldValues?: any;
  newValues?: any;
}

export interface SystemState {
  isInstalled: boolean;
  isLocked: boolean;
  installedAt?: string;
  config: SystemConfig;
  settings: CompanySettings;
  branches: Branch[];
  departments: Department[];
  employees: Employee[];
  users: UserAccount[];
  auditLogs: AuditRecord[];
  currentUser: {
    id: number;
    username: string;
    fullName: string;
    role: string;
  } | null;
}
