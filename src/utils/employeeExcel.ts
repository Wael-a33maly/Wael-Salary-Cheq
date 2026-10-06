import * as XLSX from 'xlsx';
import { Branch, Department, Employee } from '../types';

export interface ParsedEmployeeRow {
  index: number;
  civilId: string;
  fullName: string;
  branchName: string;
  branchId: number;
  departmentName: string;
  departmentId: number;
  basicSalary: number;
  dailyHours: number;
  bankName: string;
  iban: string;
  bankTransferAmount: number;
  residenceExpiryDate: string;
  status: 'active' | 'inactive';
  isValid: boolean;
  errors: string[];
  warnings: string[];
  isDuplicateCivilIdInFile: boolean;
  isExistingCivilIdInSystem: boolean;
}

export const EMPLOYEE_TEMPLATE_COLUMNS = [
  'الرقم المدني (12 رقماً)',
  'اسم الموظف بالكامل',
  'الفرع',
  'القسم',
  'الراتب الأساسي (د.ك)',
  'ساعات العمل اليومية',
  'اسم البنك',
  'رقم الآيبان IBAN',
  'المبلغ المحول للبنك (د.ك)',
  'تاريخ انتهاء الإقامة (YYYY-MM-DD)',
  'الحالة (نشط / موقوف)',
];

const KUWAIT_BANKS_GUIDE = [
  { 'اسم البنك باللغة العربية': 'بنك الكويت الوطني (NBK)', 'الرمز': 'NBK', 'صيغة الآيبان': 'KW..NBOK......................' },
  { 'اسم البنك باللغة العربية': 'بيت التمويل الكويتي (KFH)', 'الرمز': 'KFH', 'صيغة الآيبان': 'KW..KFH0......................' },
  { 'اسم البنك باللغة العربية': 'بنك الخليج (GBK)', 'الرمز': 'GBK', 'صيغة الآيبان': 'KW..GULK......................' },
  { 'اسم البنك باللغة العربية': 'البنك التجاري الكويتي (CBK)', 'الرمز': 'CBK', 'صيغة الآيبان': 'KW..CBOK......................' },
  { 'اسم البنك باللغة العربية': 'بنك بوبيان (Boubyan)', 'الرمز': 'Boubyan', 'صيغة الآيبان': 'KW..BOUB......................' },
  { 'اسم البنك باللغة العربية': 'بنك برقان (Burgan)', 'الرمز': 'Burgan', 'صيغة الآيبان': 'KW..BURG......................' },
  { 'اسم البنك باللغة العربية': 'البنك الأهلي الكويتي (ABK)', 'الرمز': 'ABK', 'صيغة الآيبان': 'KW..ABKK......................' },
  { 'اسم البنك باللغة العربية': 'بنك وربة (Warba)', 'الرمز': 'Warba', 'صيغة الآيبان': 'KW..WARB......................' },
  { 'اسم البنك باللغة العربية': 'بنك الكويت الدولي (KIB)', 'الرمز': 'KIB', 'صيغة الآيبان': 'KW..IIBK......................' },
  { 'اسم البنك باللغة العربية': 'البنك الأهلي المتحد (AUB)', 'الرمز': 'AUB', 'صيغة الآيبان': 'KW..BKME......................' },
];

/**
 * Generates and downloads an Excel template for employee data import.
 * @param emptyOnly If true, downloads a clean blank template with headers only.
 */
export function exportEmployeeImportTemplate(
  branches: Branch[],
  departments: Department[],
  emptyOnly: boolean = false
): void {
  const defaultBranchName = branches[0]?.name || 'الفرع الرئيسي';
  const defaultDeptName = departments[0]?.name || 'الإدارة العامة';
  const secondDeptName = departments[1]?.name || departments[0]?.name || 'العمليات والتشغيل';

  const wb = XLSX.utils.book_new();

  // 1. Data Sheet
  let wsData: XLSX.WorkSheet;

  if (emptyOnly) {
    // Clean blank sheet with headers only
    wsData = XLSX.utils.aoa_to_sheet([EMPLOYEE_TEMPLATE_COLUMNS]);
  } else {
    // Template with illustrative sample rows
    const sampleRows = [
      {
        'الرقم المدني (12 رقماً)': '294051201234',
        'اسم الموظف بالكامل': 'أحمد محمد عبد الله الكندري',
        'الفرع': defaultBranchName,
        'القسم': defaultDeptName,
        'الراتب الأساسي (د.ك)': 450.0,
        'ساعات العمل اليومية': 11,
        'اسم البنك': 'بنك الكويت الوطني (NBK)',
        'رقم الآيبان IBAN': 'KW82NBOK0000000000001234567890',
        'المبلغ المحول للبنك (د.ك)': 200.0,
        'تاريخ انتهاء الإقامة (YYYY-MM-DD)': '2027-06-30',
        'الحالة (نشط / موقوف)': 'نشط',
      },
      {
        'الرقم المدني (12 رقماً)': '288112304567',
        'اسم الموظف بالكامل': 'محمود حسن علي المصري',
        'الفرع': defaultBranchName,
        'القسم': secondDeptName,
        'الراتب الأساسي (د.ك)': 380.0,
        'ساعات العمل اليومية': 11,
        'اسم البنك': 'بيت التمويل الكويتي (KFH)',
        'رقم الآيبان IBAN': 'KW12KFH0000000000009876543210',
        'المبلغ المحول للبنك (د.ك)': 150.0,
        'تاريخ انتهاء الإقامة (YYYY-MM-DD)': '2026-12-31',
        'الحالة (نشط / موقوف)': 'نشط',
      },
    ];
    wsData = XLSX.utils.json_to_sheet(sampleRows);
  }

  wsData['!cols'] = [
    { wch: 22 }, // الرقم المدني
    { wch: 32 }, // اسم الموظف
    { wch: 24 }, // الفرع
    { wch: 24 }, // القسم
    { wch: 18 }, // الراتب الأساسي
    { wch: 18 }, // ساعات العمل
    { wch: 26 }, // اسم البنك
    { wch: 34 }, // الآيبان
    { wch: 22 }, // المحول للبنك
    { wch: 24 }, // انتهاء الإقامة
    { wch: 18 }, // الحالة
  ];
  wsData['!dir'] = 'rtl';
  XLSX.utils.book_append_sheet(wb, wsData, 'بيانات الموظفين');

  // 2. Guide sheet: Branches
  const branchesGuide = branches.map((b) => ({
    'رقم الفرع': b.id,
    'رمز الفرع': b.code,
    'اسم الفرع': b.name,
  }));
  const wsBranches = XLSX.utils.json_to_sheet(branchesGuide);
  wsBranches['!cols'] = [{ wch: 12 }, { wch: 16 }, { wch: 28 }];
  wsBranches['!dir'] = 'rtl';
  XLSX.utils.book_append_sheet(wb, wsBranches, 'دليل الفروع');

  // 3. Guide sheet: Departments
  const deptsGuide = departments.map((d) => ({
    'رقم القسم': d.id,
    'اسم القسم': d.name,
  }));
  const wsDepts = XLSX.utils.json_to_sheet(deptsGuide);
  wsDepts['!cols'] = [{ wch: 12 }, { wch: 28 }];
  wsDepts['!dir'] = 'rtl';
  XLSX.utils.book_append_sheet(wb, wsDepts, 'دليل الأقسام');

  // 4. Guide sheet: Banks & Instructions
  const wsBanks = XLSX.utils.json_to_sheet(KUWAIT_BANKS_GUIDE);
  wsBanks['!cols'] = [{ wch: 32 }, { wch: 14 }, { wch: 36 }];
  wsBanks['!dir'] = 'rtl';
  XLSX.utils.book_append_sheet(wb, wsBanks, 'دليل البنوك الكويتية');

  // Write and trigger download
  const filename = emptyOnly
    ? 'نموذج_استيراد_الموظفين_فارغ.xlsx'
    : 'نموذج_استيراد_بيانات_الموظفين.xlsx';
  XLSX.writeFile(wb, filename);
}

/**
 * Parses a raw date from Excel into YYYY-MM-DD
 */
export function parseExcelDate(val: any): string {
  if (!val) return '2027-01-01';

  // If already Date object
  if (val instanceof Date) {
    if (!isNaN(val.getTime())) {
      return val.toISOString().substring(0, 10);
    }
  }

  // If number (Excel serial date)
  if (typeof val === 'number') {
    try {
      const parsed = XLSX.SSF.parse_date_code(val);
      if (parsed) {
        const y = String(parsed.y).padStart(4, '0');
        const m = String(parsed.m).padStart(2, '0');
        const d = String(parsed.d).padStart(2, '0');
        return `${y}-${m}-${d}`;
      }
    } catch {
      // fallback
    }
  }

  const str = String(val).trim();

  // Excel serial number as string (e.g. "45473")
  if (/^\d{5}$/.test(str)) {
    try {
      const parsed = XLSX.SSF.parse_date_code(parseInt(str, 10));
      if (parsed) {
        const y = String(parsed.y).padStart(4, '0');
        const m = String(parsed.m).padStart(2, '0');
        const d = String(parsed.d).padStart(2, '0');
        return `${y}-${m}-${d}`;
      }
    } catch {
      // fallback
    }
  }

  // Match YYYY-MM-DD or YYYY/MM/DD
  if (/^\d{4}[\/\-\.]\d{1,2}[\/\-\.]\d{1,2}$/.test(str)) {
    const parts = str.split(/[\/\-\.]/);
    const y = parts[0];
    const m = parts[1].padStart(2, '0');
    const d = parts[2].padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  // Match DD/MM/YYYY or DD-MM-YYYY
  if (/^\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{4}$/.test(str)) {
    const parts = str.split(/[\/\-\.]/);
    const d = parts[0].padStart(2, '0');
    const m = parts[1].padStart(2, '0');
    const y = parts[2];
    return `${y}-${m}-${d}`;
  }

  return str || '2027-01-01';
}

/**
 * Smart column matching to support diverse header aliases.
 */
function findColValue(row: Record<string, any>, aliases: string[]): any {
  const keys = Object.keys(row);
  for (const alias of aliases) {
    const cleanAlias = alias.toLowerCase().replace(/[\s\-_]/g, '');
    const foundKey = keys.find((k) => k.toLowerCase().replace(/[\s\-_]/g, '') === cleanAlias);
    if (foundKey && row[foundKey] !== undefined && row[foundKey] !== null && String(row[foundKey]).trim() !== '') {
      return row[foundKey];
    }
  }
  return undefined;
}

/**
 * Parses employee records from an Excel workbook buffer/array.
 */
export function parseEmployeesFromExcel(
  fileBuffer: ArrayBuffer,
  branches: Branch[],
  departments: Department[],
  existingEmployees: Employee[]
): ParsedEmployeeRow[] {
  const wb = XLSX.read(fileBuffer, { type: 'array', cellDates: true });
  const firstSheetName = wb.SheetNames[0];
  if (!firstSheetName) return [];

  const ws = wb.Sheets[firstSheetName];
  const rawRows: Record<string, any>[] = XLSX.utils.sheet_to_json(ws, { defval: '' });

  const existingCivilIdSet = new Set(
    existingEmployees.map((e) => String(e.civilId || '').trim()).filter(Boolean)
  );

  const defaultBranchName = branches[0]?.name || 'الفرع الرئيسي';
  const defaultDeptName = departments[0]?.name || 'الإدارة العامة';

  const seenCivilIdsInFile = new Set<string>();
  const parsedRows: ParsedEmployeeRow[] = [];

  rawRows.forEach((row, idx) => {
    // 1. Civil ID
    const rawCivilId = findColValue(row, [
      'الرقم المدني (12 رقماً)',
      'الرقم المدني',
      'الرقم_المدني',
      'الرقم المدنى',
      'رقم مدني',
      'المدني',
      'المدنى',
      'بطاقة مدنية',
      'البطاقة المدنية',
      'civilId',
      'civil_id',
      'civilID',
      'idNumber',
      'id',
      'national_id',
      'nationalId',
    ]);
    let cleanCivilId = '';
    if (typeof rawCivilId === 'number' && Number.isFinite(rawCivilId)) {
      cleanCivilId = BigInt(Math.floor(rawCivilId)).toString();
    } else {
      cleanCivilId = String(rawCivilId || '').replace(/\D/g, '').trim();
    }

    // 2. Full Name
    const rawName = findColValue(row, [
      'اسم الموظف بالكامل',
      'اسم الموظف',
      'الاسم بالكامل',
      'الاسم',
      'اسم العامل',
      'الموظف',
      'fullName',
      'full_name',
      'name',
      'employeeName',
      'employee_name',
      'emp_name',
    ]);
    const cleanName = String(rawName || '').trim();

    // Skip completely empty spacer rows
    if (!cleanCivilId && !cleanName) return;

    // 3. Branch
    const rawBranch = findColValue(row, ['الفرع', 'فرع', 'branch', 'branchName', 'branch_name', 'branchId']);
    let matchedBranch = branches[0];
    if (rawBranch) {
      const bStr = String(rawBranch).trim();
      const byId = branches.find((b) => String(b.id) === bStr);
      const byName = branches.find(
        (b) => b.name.includes(bStr) || bStr.includes(b.name)
      );
      if (byId) matchedBranch = byId;
      else if (byName) matchedBranch = byName;
    }

    // 4. Department
    const rawDept = findColValue(row, ['القسم', 'قسم', 'department', 'departmentName', 'department_name', 'departmentId', 'dept']);
    let matchedDept = departments[0];
    if (rawDept) {
      const dStr = String(rawDept).trim();
      const byId = departments.find((d) => String(d.id) === dStr);
      const byName = departments.find(
        (d) => d.name.includes(dStr) || dStr.includes(d.name)
      );
      if (byId) matchedDept = byId;
      else if (byName) matchedDept = byName;
    }

    // 5. Basic Salary
    const rawSalary = findColValue(row, [
      'الراتب الأساسي (د.ك)',
      'الراتب الأساسي',
      'الراتب',
      'basicSalary',
      'basic_salary',
      'salary',
    ]);
    const numSalary = parseFloat(String(rawSalary).replace(/[^\d.]/g, '')) || 0;

    // 6. Daily Hours
    const rawHours = findColValue(row, [
      'ساعات العمل اليومية',
      'ساعات العمل',
      'الساعات',
      'dailyHours',
      'daily_hours',
      'hours',
    ]);
    const numHours = parseFloat(String(rawHours).replace(/[^\d.]/g, '')) || 11;

    // 7. Bank Name
    const rawBank = findColValue(row, ['اسم البنك', 'البنك', 'bankName', 'bank_name', 'bank']);
    const cleanBank = String(rawBank || 'بنك الكويت الوطني (NBK)').trim();

    // 8. IBAN
    const rawIban = findColValue(row, ['رقم الآيبان IBAN', 'رقم الآيبان', 'الآيبان', 'ايبان', 'iban', 'IBAN']);
    const cleanIban = String(rawIban || '').replace(/\s+/g, '').toUpperCase().trim();

    // 9. Bank Transfer Amount
    const rawTransfer = findColValue(row, [
      'المبلغ المحول للبنك (د.ك)',
      'المبلغ المحول للبنك',
      'المحول للبنك',
      'تحويل بنكي',
      'bankTransferAmount',
      'bank_transfer_amount',
      'transfer_amount',
    ]);
    const numTransfer = parseFloat(String(rawTransfer).replace(/[^\d.]/g, '')) || 0;

    // 10. Residence Expiry Date
    const rawExpiry = findColValue(row, [
      'تاريخ انتهاء الإقامة (YYYY-MM-DD)',
      'تاريخ انتهاء الإقامة',
      'انتهاء الإقامة',
      'صلاحية الإقامة',
      'الإقامة',
      'residenceExpiryDate',
      'residence_expiry_date',
      'residenceExpiry',
    ]);
    const parsedExpiry = parseExcelDate(rawExpiry);

    // 11. Status
    const rawStatus = findColValue(row, ['الحالة (نشط / موقوف)', 'الحالة', 'status', 'الحاله']);
    const strStatus = String(rawStatus || '').trim();
    const cleanStatus: 'active' | 'inactive' =
      strStatus === 'موقوف' || strStatus === 'inactive' || strStatus === 'معطل' ? 'inactive' : 'active';

    // Errors & Warnings
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!cleanName) {
      errors.push('اسم الموظف مفقود');
    }

    if (!cleanCivilId) {
      errors.push('الرقم المدني مفقود');
    } else if (cleanCivilId.length !== 12) {
      warnings.push(`الرقم المدني (${cleanCivilId.length} رقماً) - الرقم الكويتي القياسي 12 رقماً`);
    }

    let isDuplicateCivilIdInFile = false;
    if (cleanCivilId) {
      if (seenCivilIdsInFile.has(cleanCivilId)) {
        isDuplicateCivilIdInFile = true;
        warnings.push('الرقم المدني مكرر داخل نفس الملف');
      } else {
        seenCivilIdsInFile.add(cleanCivilId);
      }
    }

    const isExistingCivilIdInSystem = Boolean(cleanCivilId && existingCivilIdSet.has(cleanCivilId));
    if (isExistingCivilIdInSystem) {
      warnings.push('الرقم المدني مسجل مسبقاً في النظام (سيتم التحديث إذا تم التفعيل)');
    }

    if (cleanCivilId === '294051201234' || cleanCivilId === '288112304567') {
      warnings.push('صف تجريبي توضيحي من القالب الافتراضي - تأكد من رغبتك في استيراده أو حذفه');
    }

    if (numSalary <= 0) {
      warnings.push('الراتب الأساسي صفر أو غير محدد');
    }

    parsedRows.push({
      index: idx + 1,
      civilId: cleanCivilId || '290000000000',
      fullName: cleanName,
      branchName: matchedBranch?.name || defaultBranchName,
      branchId: matchedBranch?.id || branches[0]?.id || 1,
      departmentName: matchedDept?.name || defaultDeptName,
      departmentId: matchedDept?.id || departments[0]?.id || 1,
      basicSalary: numSalary,
      dailyHours: numHours,
      bankName: cleanBank,
      iban: cleanIban,
      bankTransferAmount: numTransfer,
      residenceExpiryDate: parsedExpiry,
      status: cleanStatus,
      isValid: errors.length === 0,
      errors,
      warnings,
      isDuplicateCivilIdInFile,
      isExistingCivilIdInSystem,
    });
  });

  return parsedRows;
}
