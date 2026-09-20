import { useState, useMemo } from 'react';
import { 
  FileText, 
  Download, 
  Printer, 
  Building2, 
  CreditCard, 
  Calendar, 
  AlertTriangle, 
  Archive, 
  ArrowLeft,
  ArrowRight,
  RotateCcw,
  Eye,
  Building,
  DollarSign,
  Users
} from 'lucide-react';
import { Employee, Branch, Department, CompanySettings, MonthlyPayroll } from '../types';
import { roundCashDown, getResidenceStatus } from '../mockData';

interface ReportsViewProps {
  employees: Employee[];
  branches: Branch[];
  departments: Department[];
  settings: CompanySettings;
  activeReportId?: number;
  savedPayrolls?: MonthlyPayroll[];
  onViewPayroll?: (payrollId: string) => void;
}

type BankColId = 'name' | 'civilId' | 'amount' | 'iban';

const BANK_COL_DEFINITIONS: Record<BankColId, { title: string; align: 'right' | 'center' | 'left' }> = {
  name: { title: 'الاسم', align: 'right' },
  civilId: { title: 'الرقم المدني', align: 'center' },
  amount: { title: 'المبلغ (د.ك)', align: 'left' },
  iban: { title: 'الايبان (IBAN)', align: 'left' },
};

export function ReportsView({
  employees,
  branches,
  departments,
  settings,
  activeReportId = 1,
  savedPayrolls = [],
  onViewPayroll,
}: ReportsViewProps) {
  const [selectedBranchId, setSelectedBranchId] = useState<number>(1);
  const [selectedResFilter, setSelectedResFilter] = useState<string>('all');

  // Interactive controls for Bank Transfer Report (Report 3)
  const [bankCols, setBankCols] = useState<BankColId[]>(['name', 'civilId', 'amount', 'iban']);
  const [selectedBankName, setSelectedBankName] = useState<string>('all');
  const [selectedPayrollMonth, setSelectedPayrollMonth] = useState<string>('current');

  // Reports Definitions (Attendance/Absence report 7 was removed as requested)
  const reportsList = [
    { id: 1, title: 'التقرير المالي المجمع لكافة فروع الشركة', desc: 'إجمالي الرواتب والاستقطاعات والإضافي والتقريب لكل فرع مع المجموع العام' },
    { id: 2, title: 'كشف رواتب فرع محدد وتفاصيل موظفيه', desc: 'مسير تفصيلي بالموظفين لفرع معين مع مجموع الفرع في التذييل' },
    { id: 3, title: 'كشف التحويلات المصرفية ومبالغ النقد المطلوبة من الخزينة', desc: 'كشف رواتب حسب البنك وحسب الشهر للموظفين المحول لهم مع إمكانية إعادة ترتيب الأعمدة يدوياً وتصديرها' },
    { id: 4, title: 'كشف مبالغ التقريب (Floor 0.050)', desc: 'تفاصيل التقريب لكل موظف ولكل فرع نتيجة التقريب للأسفل' },
    { id: 5, title: 'كشف استقطاعات السلف الشهرية', desc: 'حصر المبالغ المستردة من رواتب الموظفين لصالح سداد السلف' },
    { id: 6, title: 'تقرير متابعة انتهاء الإقامات بالألوان الخمسة', desc: 'نظام الإنذار المبكر للإقامات المنتهية وتلك التي تنتهي خلال 30، 60، و90 يوماً' },
    { id: 7, title: 'الأرشيف المالي للشهور والسنوات السابقة', desc: 'سجل المسيرات المعتمدة السابقة مع زر استعراض المسير التفصيلي' },
  ];

  // Helper calculation for an employee in current active calculation
  const computeEmp = (emp: Employee) => {
    const daysInMonth = 30;
    const dailyRate = emp.basicSalary / daysInMonth;
    const hourlyRate = dailyRate / emp.dailyHours;
    
    // Realistic variations
    const absentDays = emp.id === 2 ? 1 : emp.id === 5 ? 2 : 0;
    const overtimeHours = [1, 3, 6, 10, 12].includes(emp.id) ? 10 : 0;
    const advance = emp.id === 2 ? 50 : emp.id === 4 ? 25 : emp.id === 7 ? 20 : 0;

    const absentDed = absentDays * dailyRate;
    const overtimeAmount = overtimeHours * (hourlyRate * settings.overtimeRate);
    const net = Math.max(0, emp.basicSalary - absentDed + overtimeAmount - advance);
    const bank = Math.min(net, emp.bankTransferAmount);
    const rawCash = Math.max(0, net - bank);
    const finalCash = roundCashDown(rawCash, settings.roundingStep);
    const roundingDiff = rawCash - finalCash;

    return {
      emp,
      basic: emp.basicSalary,
      absentDays,
      absentDed,
      overtimeHours,
      overtimeAmount,
      advance,
      net,
      bank,
      rawCash,
      finalCash,
      roundingDiff,
    };
  };

  const calculatedAll = useMemo(() => {
    return employees.map((e) => computeEmp(e));
  }, [employees, settings.overtimeRate, settings.roundingStep]);

  // Export CSV Function (with UTF-8 BOM for Arabic support in Excel)
  const exportCsv = (filename: string, headers: string[], rows: (string | number)[][]) => {
    const bom = '\uFEFF';
    const csvContent = [
      headers.join(','),
      ...rows.map((r) => r.map((c) => `"${c}"`).join(',')),
    ].join('\r\n');

    const blob = new Blob([bom + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Move column in bank report: dir = -1 (move earlier) | 1 (move later)
  const handleMoveBankCol = (index: number, dir: -1 | 1) => {
    const target = index + dir;
    if (target < 0 || target >= bankCols.length) return;
    const updated = [...bankCols];
    const temp = updated[index];
    updated[index] = updated[target];
    updated[target] = temp;
    setBankCols(updated);
  };

  // Reset columns order
  const handleResetBankCols = () => {
    setBankCols(['name', 'civilId', 'amount', 'iban']);
  };

  // Distinct banks list from employees
  const availableBanks = useMemo(() => {
    const list = Array.from(new Set(employees.map((e) => e.bankName).filter(Boolean)));
    return list.sort();
  }, [employees]);

  // Compute bank transfer rows for selected month and bank
  const bankTransferRows = useMemo(() => {
    // If a saved payroll is chosen
    if (selectedPayrollMonth !== 'current') {
      const p = savedPayrolls.find((item) => item.id === selectedPayrollMonth);
      if (p) {
        const daysInMonth = p.daysInMonth || 30;
        return employees
          .filter((e) => p.employeeIds.includes(e.id))
          .map((emp) => {
            const inp = p.inputs?.[emp.id] || { absentDays: 0, absentHours: 0, overtimeHours: 0, advanceDeduction: 0 };
            const dailyRate = emp.basicSalary / daysInMonth;
            const hourlyRate = dailyRate / emp.dailyHours;
            const absentDed = (inp.absentDays * dailyRate) + (inp.absentHours * hourlyRate);
            const overtimeAmount = inp.overtimeHours * (hourlyRate * settings.overtimeRate);
            const netSalary = Math.max(0, emp.basicSalary - absentDed + overtimeAmount - inp.advanceDeduction);
            const bankAmount = Math.min(netSalary, emp.bankTransferAmount);
            return {
              emp,
              bank: bankAmount,
              net: netSalary,
            };
          })
          .filter((item) => item.bank > 0)
          .filter((item) => selectedBankName === 'all' || item.emp.bankName === selectedBankName);
      }
    }

    // Default current calculation
    return calculatedAll
      .filter((item) => item.bank > 0)
      .filter((item) => selectedBankName === 'all' || item.emp.bankName === selectedBankName);
  }, [calculatedAll, selectedPayrollMonth, savedPayrolls, employees, selectedBankName, settings.overtimeRate]);

  // Export handler for current bank report in active custom column order
  const handleExportBankReport = () => {
    const headers = bankCols.map((c) => BANK_COL_DEFINITIONS[c].title);
    const rows = bankTransferRows.map((item) => {
      return bankCols.map((col) => {
        if (col === 'name') return item.emp.fullName;
        if (col === 'civilId') return item.emp.civilId;
        if (col === 'amount') return item.bank.toFixed(3);
        if (col === 'iban') return item.emp.iban;
        return '';
      });
    });

    const bankPart = selectedBankName === 'all' ? 'all_banks' : selectedBankName.replace(/\s+/g, '_');
    const monthPart = selectedPayrollMonth === 'current' ? 'current_month' : selectedPayrollMonth;
    exportCsv(`bank_transfer_report_${bankPart}_${monthPart}`, headers, rows);
  };

  const handleExportCurrent = () => {
    if (activeReportId === 1) {
      // Reordered: Rounding and Net Salary after Overtime
      const headers = [
        'كود الفرع', 
        'اسم الفرع', 
        'عدد الموظفين', 
        'الأساسي (د.ك)', 
        'الاستقطاعات (د.ك)', 
        'الإضافي (د.ك)', 
        'التقريب (د.ك)', 
        'صافي المستحق (د.ك)',
        'البنك (د.ك)', 
        'النقدي (د.ك)'
      ];
      const rows = branches.map((b) => {
        const bEmps = calculatedAll.filter((c) => c.emp.branchId === b.id);
        const basic = bEmps.reduce((s, c) => s + c.basic, 0);
        const ded = bEmps.reduce((s, c) => s + c.absentDed + c.advance, 0);
        const ot = bEmps.reduce((s, c) => s + c.overtimeAmount, 0);
        const diff = bEmps.reduce((s, c) => s + c.roundingDiff, 0);
        const net = bEmps.reduce((s, c) => s + c.net, 0);
        const bank = bEmps.reduce((s, c) => s + c.bank, 0);
        const cash = bEmps.reduce((s, c) => s + c.finalCash, 0);
        return [b.code, b.name, bEmps.length, basic.toFixed(3), ded.toFixed(3), ot.toFixed(3), diff.toFixed(3), net.toFixed(3), bank.toFixed(3), cash.toFixed(3)];
      });
      exportCsv('aggregated_financial_report_kwd', headers, rows);
    } else if (activeReportId === 3) {
      handleExportBankReport();
    } else if (activeReportId === 6) {
      const headers = ['اسم الموظف', 'الرقم المدني', 'الفرع', 'تاريخ الإقامة', 'المهلة المتبقية (يوم)', 'التصنيف'];
      const rows = employees.map((e) => {
        const branch = branches.find((b) => b.id === e.branchId);
        const st = getResidenceStatus(e.residenceExpiryDate);
        return [e.fullName, e.civilId, branch?.name || '', e.residenceExpiryDate, st.daysRemaining, st.label];
      });
      exportCsv('residency_expiration_report_kwd', headers, rows);
    } else {
      alert('تم تجهيز التقرير للتصدير بنجاح.');
    }
  };

  // Archived payrolls list (real saved ones, or default sample months if none)
  const archiveList = useMemo(() => {
    if (savedPayrolls && savedPayrolls.length > 0) {
      return savedPayrolls;
    }
    return [
      {
        id: '2026-08',
        year: 2026,
        month: 8,
        monthName: 'أغسطس 2026',
        daysInMonth: 31,
        voucherBaseNumber: 1200,
        createdAt: '2026-08-31',
        status: 'approved' as const,
        employeeIds: employees.map((e) => e.id),
        inputs: {},
        totals: {
          basic: 4850.000,
          absenceDed: 65.250,
          overtime: 140.500,
          advances: 95.000,
          net: 4830.250,
          bank: 2815.000,
          rawCash: 2015.250,
          finalCash: 2015.000,
          roundingDiff: 0.250,
        }
      },
      {
        id: '2026-07',
        year: 2026,
        month: 7,
        monthName: 'يوليو 2026',
        daysInMonth: 31,
        voucherBaseNumber: 1050,
        createdAt: '2026-07-31',
        status: 'approved' as const,
        employeeIds: employees.map((e) => e.id),
        inputs: {},
        totals: {
          basic: 4850.000,
          absenceDed: 45.000,
          overtime: 120.000,
          advances: 110.000,
          net: 4815.000,
          bank: 2815.000,
          rawCash: 2000.000,
          finalCash: 2000.000,
          roundingDiff: 0.000,
        }
      }
    ];
  }, [savedPayrolls, employees]);

  return (
    <div className="max-w-7xl mx-auto py-6 space-y-6">
      
      {/* Title & Action Bar */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-black text-slate-900">
              مركز التقارير المالية والإدارية (7 تقارير)
            </h2>
            <span className="text-xs bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full">
              تقارير معتمدة &bull; Excel + Print
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            كشوف الرواتب، التحويلات البنكية، سحب النقد من الخزينة، وفورات التقريب، واستحقاقات الإقامات
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => window.print()}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-xl text-xs border border-slate-200 transition"
          >
            <Printer className="w-4 h-4" />
            <span>طباعة التقرير</span>
          </button>

          <button
            onClick={handleExportCurrent}
            className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-4 py-2 rounded-xl shadow-md transition active:scale-95"
          >
            <Download className="w-4 h-4" />
            <span>تصدير Excel (CSV UTF-8)</span>
          </button>
        </div>
      </div>

      {/* ========================================================= */}
      {/* Report 1: Aggregated Financial Report (Rounding & Net AFTER Overtime) */}
      {/* ========================================================= */}
      {activeReportId === 1 && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
          <div className="border-b border-slate-200 pb-3 flex justify-between items-center">
            <div>
              <h3 className="text-base font-black text-slate-900">
                1. التقرير المالي المجمع لكافة فروع الشركة
              </h3>
              <p className="text-xs text-slate-500">
                المبالغ بالدينار الكويتي (3 خانات عشرية) &bull; التقريب وصافي المستحق بعد الإضافي
              </p>
            </div>
            <span className="text-xs bg-blue-50 text-blue-800 font-bold px-2.5 py-1 rounded-lg">
              {branches.length} فروع &bull; {employees.length} موظفاً
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-100 font-bold text-slate-700 border-b border-slate-200">
                <tr>
                  <th className="p-3 text-center">كود الفرع</th>
                  <th className="p-3">اسم الفرع</th>
                  <th className="p-3 text-center">الكوادر</th>
                  <th className="p-3 text-center">الرواتب الأساسية</th>
                  <th className="p-3 text-center">الاستقطاعات</th>
                  <th className="p-3 text-center">الإضافي</th>
                  <th className="p-3 text-center font-bold text-amber-800">التقريب</th>
                  <th className="p-3 text-center font-black text-blue-900">صافي المستحق</th>
                  <th className="p-3 text-center">التحويل البنكي</th>
                  <th className="p-3 text-center font-bold text-emerald-800">النقدي (0.050)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {branches.map((b) => {
                  const bEmps = calculatedAll.filter((c) => c.emp.branchId === b.id);
                  const basic = bEmps.reduce((s, c) => s + c.basic, 0);
                  const ded = bEmps.reduce((s, c) => s + c.absentDed + c.advance, 0);
                  const ot = bEmps.reduce((s, c) => s + c.overtimeAmount, 0);
                  const net = bEmps.reduce((s, c) => s + c.net, 0);
                  const bank = bEmps.reduce((s, c) => s + c.bank, 0);
                  const cash = bEmps.reduce((s, c) => s + c.finalCash, 0);
                  const diff = bEmps.reduce((s, c) => s + c.roundingDiff, 0);

                  return (
                    <tr key={b.id} className="hover:bg-slate-50 transition">
                      <td className="p-3 text-center font-mono font-bold text-slate-700">{b.code}</td>
                      <td className="p-3 font-bold text-slate-900">{b.name}</td>
                      <td className="p-3 text-center font-bold text-slate-600">{bEmps.length}</td>
                      <td className="p-3 text-center font-mono">{basic.toFixed(3)}</td>
                      <td className="p-3 text-center font-mono text-red-600">-{ded.toFixed(3)}</td>
                      <td className="p-3 text-center font-mono text-emerald-600">+{ot.toFixed(3)}</td>
                      <td className="p-3 text-center font-mono font-bold text-amber-800 bg-amber-50/40">+{diff.toFixed(3)}</td>
                      <td className="p-3 text-center font-mono font-black text-blue-900">{net.toFixed(3)}</td>
                      <td className="p-3 text-center font-mono">{bank.toFixed(3)}</td>
                      <td className="p-3 text-center font-mono font-black text-emerald-800 bg-emerald-50/40">{cash.toFixed(3)}</td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot className="bg-slate-100 font-bold border-t-2 border-slate-300">
                <tr>
                  <td colSpan={2} className="p-3 text-slate-900 font-black">الإجمالي العام للشركة:</td>
                  <td className="p-3 text-center text-slate-900">{employees.length}</td>
                  <td className="p-3 text-center font-mono">{calculatedAll.reduce((s, c) => s + c.basic, 0).toFixed(3)}</td>
                  <td className="p-3 text-center font-mono text-red-700">-{calculatedAll.reduce((s, c) => s + c.absentDed + c.advance, 0).toFixed(3)}</td>
                  <td className="p-3 text-center font-mono text-emerald-700">+{calculatedAll.reduce((s, c) => s + c.overtimeAmount, 0).toFixed(3)}</td>
                  <td className="p-3 text-center font-mono font-black text-amber-800">+{calculatedAll.reduce((s, c) => s + c.roundingDiff, 0).toFixed(3)}</td>
                  <td className="p-3 text-center font-mono font-black text-blue-900">{calculatedAll.reduce((s, c) => s + c.net, 0).toFixed(3)}</td>
                  <td className="p-3 text-center font-mono text-slate-900">{calculatedAll.reduce((s, c) => s + c.bank, 0).toFixed(3)}</td>
                  <td className="p-3 text-center font-mono font-black text-emerald-900">{calculatedAll.reduce((s, c) => s + c.finalCash, 0).toFixed(3)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* Report 2: Specific Branch Report */}
      {/* ========================================================= */}
      {activeReportId === 2 && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
          <div className="border-b border-slate-200 pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-black text-slate-900">
                2. كشف رواتب فرع محدد وتفاصيل موظفيه
              </h3>
              <p className="text-xs text-slate-500">اختر الفرع لعرض المسير التفصيلي الخاص به &bull; التقريب وصافي المستحق بعد الإضافي</p>
            </div>
            
            <div className="flex items-center gap-2">
              <label className="text-xs font-bold text-slate-700">الفرع المطلوب:</label>
              <select
                value={selectedBranchId}
                onChange={(e) => setSelectedBranchId(Number(e.target.value))}
                className="bg-slate-50 border border-slate-300 text-xs font-bold rounded-lg p-2 text-slate-800 focus:ring-2 focus:ring-blue-500"
              >
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name} ({b.code})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-100 font-bold border-b border-slate-200">
                <tr>
                  <th className="p-3">الموظف</th>
                  <th className="p-3">القسم</th>
                  <th className="p-3 text-center">الأساسي</th>
                  <th className="p-3 text-center">الاستقطاعات</th>
                  <th className="p-3 text-center">الإضافي</th>
                  <th className="p-3 text-center font-bold text-amber-800">التقريب</th>
                  <th className="p-3 text-center font-black text-blue-900">صافي المستحق</th>
                  <th className="p-3 text-center">التحويل البنكي</th>
                  <th className="p-3 text-center font-bold text-emerald-800">النقدي (0.050)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {calculatedAll
                  .filter((c) => c.emp.branchId === selectedBranchId)
                  .map((c) => {
                    const dept = departments.find((d) => d.id === c.emp.departmentId);
                    return (
                      <tr key={c.emp.id} className="hover:bg-slate-50 transition">
                        <td className="p-3 font-bold text-slate-900">{c.emp.fullName}</td>
                        <td className="p-3 text-slate-600">{dept?.name || 'عام'}</td>
                        <td className="p-3 text-center font-mono">{c.basic.toFixed(3)}</td>
                        <td className="p-3 text-center font-mono text-red-600">
                          -{(c.absentDed + c.advance).toFixed(3)}
                        </td>
                        <td className="p-3 text-center font-mono text-emerald-600">
                          +{c.overtimeAmount.toFixed(3)}
                        </td>
                        <td className="p-3 text-center font-mono font-bold text-amber-800 bg-amber-50/40">
                          +{c.roundingDiff.toFixed(3)}
                        </td>
                        <td className="p-3 text-center font-mono font-black text-blue-900">
                          {c.net.toFixed(3)}
                        </td>
                        <td className="p-3 text-center font-mono">{c.bank.toFixed(3)}</td>
                        <td className="p-3 text-center font-mono font-black text-emerald-800 bg-emerald-50/40">
                          {c.finalCash.toFixed(3)}
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
              <tfoot className="bg-slate-100 font-bold border-t-2 border-slate-300">
                {(() => {
                  const bEmps = calculatedAll.filter((c) => c.emp.branchId === selectedBranchId);
                  const basic = bEmps.reduce((s, c) => s + c.basic, 0);
                  const ded = bEmps.reduce((s, c) => s + c.absentDed + c.advance, 0);
                  const ot = bEmps.reduce((s, c) => s + c.overtimeAmount, 0);
                  const diff = bEmps.reduce((s, c) => s + c.roundingDiff, 0);
                  const net = bEmps.reduce((s, c) => s + c.net, 0);
                  const bank = bEmps.reduce((s, c) => s + c.bank, 0);
                  const cash = bEmps.reduce((s, c) => s + c.finalCash, 0);

                  return (
                    <tr>
                      <td colSpan={2} className="p-3 text-slate-900 font-black">
                        إجمالي الفرع ({bEmps.length} موظفاً):
                      </td>
                      <td className="p-3 text-center font-mono">{basic.toFixed(3)}</td>
                      <td className="p-3 text-center font-mono text-red-700">-{ded.toFixed(3)}</td>
                      <td className="p-3 text-center font-mono text-emerald-700">+{ot.toFixed(3)}</td>
                      <td className="p-3 text-center font-mono font-black text-amber-800">+{diff.toFixed(3)}</td>
                      <td className="p-3 text-center font-mono font-black text-blue-900">{net.toFixed(3)}</td>
                      <td className="p-3 text-center font-mono text-slate-900">{bank.toFixed(3)}</td>
                      <td className="p-3 text-center font-mono font-black text-emerald-900">{cash.toFixed(3)}</td>
                    </tr>
                  );
                })()}
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* Report 3: Banking & Cash Withdrawal with Interactive Builder */}
      {/* ========================================================= */}
      {activeReportId === 3 && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6">
          <div className="border-b border-slate-200 pb-3 flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-black text-slate-900">
                3. كشف التحويلات المصرفية ومبالغ النقد المطلوبة من الخزينة
              </h3>
              <p className="text-xs text-slate-500">
                تجهيز كشف رواتب المحول لهم للبنك (الاسم - الرقم المدني - المبلغ - الايبان) مع حرية إعادة ترتيب الأعمدة يدوياً وتصديره إلى Excel
              </p>
            </div>
            <button
              onClick={handleExportBankReport}
              className="flex items-center gap-1.5 self-start md:self-auto bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-3.5 py-2 rounded-xl shadow transition active:scale-95"
            >
              <Download className="w-4 h-4" />
              <span>تصدير كشف البنك إلى Excel (CSV)</span>
            </button>
          </div>

          {/* Summary KPIs */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-blue-50/70 rounded-xl border border-blue-200">
              <div className="text-xs text-blue-800 font-bold mb-1">إجمالي التحويلات المصرفية (البنوك)</div>
              <div className="text-2xl font-mono font-black text-blue-950">
                {bankTransferRows.reduce((s, c) => s + c.bank, 0).toFixed(3)} د.ك
              </div>
              <div className="text-[11px] text-blue-700 mt-1">
                إجمالي المبالغ المستحقة للتحويل الآلي في هذا الكشف ({bankTransferRows.length} مستفيداً)
              </div>
            </div>

            <div className="p-4 bg-emerald-50/70 rounded-xl border border-emerald-200">
              <div className="text-xs text-emerald-800 font-bold mb-1">المبلغ النقدي المطلوب سحبه من الخزينة</div>
              <div className="text-2xl font-mono font-black text-emerald-950">
                {calculatedAll.reduce((s, c) => s + c.finalCash, 0).toFixed(3)} د.ك
              </div>
              <div className="text-[11px] text-emerald-700 mt-1">مقرب للأسفل لأقرب 50 فلساً نقداً لكل موظف</div>
            </div>
          </div>

          {/* Interactive Filters and Column Reordering Tool */}
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-3">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-bold text-slate-700">تصفية حسب البنك:</span>
                <select
                  value={selectedBankName}
                  onChange={(e) => setSelectedBankName(e.target.value)}
                  className="bg-white border border-slate-300 text-xs font-bold rounded-lg px-2.5 py-1.5 text-slate-800"
                >
                  <option value="all">كافة البنوك المعتمدة ({availableBanks.length})</option>
                  {availableBanks.map((bName) => (
                    <option key={bName} value={bName}>
                      {bName}
                    </option>
                  ))}
                </select>

                <span className="text-xs font-bold text-slate-700 mr-2">تصفية حسب الشهر:</span>
                <select
                  value={selectedPayrollMonth}
                  onChange={(e) => setSelectedPayrollMonth(e.target.value)}
                  className="bg-white border border-slate-300 text-xs font-bold rounded-lg px-2.5 py-1.5 text-slate-800"
                >
                  <option value="current">المسير الحالي (المحسوب الآن)</option>
                  {savedPayrolls.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.monthName} (معتمد)
                    </option>
                  ))}
                </select>
              </div>

              <button
                onClick={handleResetBankCols}
                className="flex items-center gap-1 text-[11px] font-bold text-slate-600 hover:text-slate-900 bg-white border border-slate-300 px-2.5 py-1 rounded-lg transition"
                title="استعادة الترتيب الافتراضي للأعمدة"
              >
                <RotateCcw className="w-3 h-3" />
                <span>إعادة ضبط ترتيب الأعمدة</span>
              </button>
            </div>

            {/* Column Reordering Controls */}
            <div>
              <div className="text-xs font-bold text-slate-800 mb-2">
                إعادة ترتيب أعمدة الكشف يدوياً (انقر على الأسهم لتغيير الترتيب حسب متطلبات البنك):
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                {bankCols.map((colKey, idx) => (
                  <div
                    key={colKey}
                    className="flex items-center gap-1.5 bg-white border-2 border-blue-200 text-blue-900 px-2.5 py-1.5 rounded-xl shadow-xs text-xs font-black"
                  >
                    <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-800 flex items-center justify-center text-[10px] font-bold font-mono">
                      {idx + 1}
                    </span>
                    <span>{BANK_COL_DEFINITIONS[colKey].title}</span>
                    
                    <div className="flex items-center gap-0.5 mr-1 border-r border-blue-200 pr-1">
                      <button
                        onClick={() => handleMoveBankCol(idx, 1)}
                        disabled={idx === bankCols.length - 1}
                        className="p-1 rounded hover:bg-blue-50 text-blue-700 disabled:opacity-30 transition"
                        title="تحريك يساراً"
                      >
                        <ArrowLeft className="w-3 h-3" />
                      </button>
                      <button
                        onClick={() => handleMoveBankCol(idx, -1)}
                        disabled={idx === 0}
                        className="p-1 rounded hover:bg-blue-50 text-blue-700 disabled:opacity-30 transition"
                        title="تحريك يميناً"
                      >
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Interactive Dynamic Bank Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-100 font-bold text-slate-700 border-b border-slate-200">
                <tr>
                  <th className="p-3 text-center w-12">#</th>
                  {bankCols.map((colKey) => (
                    <th
                      key={colKey}
                      className={`p-3 font-black text-slate-800 text-${BANK_COL_DEFINITIONS[colKey].align}`}
                    >
                      {BANK_COL_DEFINITIONS[colKey].title}
                    </th>
                  ))}
                  <th className="p-3">البنك</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {bankTransferRows.length === 0 ? (
                  <tr>
                    <td colSpan={bankCols.length + 2} className="p-6 text-center text-slate-400 font-bold">
                      لا يوجد تحويلات بنكية مطابقة للشروط المحددة
                    </td>
                  </tr>
                ) : (
                  bankTransferRows.map((item, idx) => (
                    <tr key={item.emp.id} className="hover:bg-slate-50 transition">
                      <td className="p-3 text-center font-mono text-slate-400 font-bold">
                        {idx + 1}
                      </td>
                      {bankCols.map((colKey) => {
                        if (colKey === 'name') {
                          return (
                            <td key={colKey} className="p-3 font-bold text-slate-900 text-right">
                              {item.emp.fullName}
                            </td>
                          );
                        }
                        if (colKey === 'civilId') {
                          return (
                            <td key={colKey} className="p-3 font-mono font-bold text-slate-700 text-center">
                              {item.emp.civilId}
                            </td>
                          );
                        }
                        if (colKey === 'amount') {
                          return (
                            <td key={colKey} className="p-3 font-mono font-black text-blue-900 text-left">
                              {item.bank.toFixed(3)} د.ك
                            </td>
                          );
                        }
                        if (colKey === 'iban') {
                          return (
                            <td key={colKey} className="p-3 font-mono text-slate-600 text-left select-all">
                              {item.emp.iban || '-'}
                            </td>
                          );
                        }
                        return null;
                      })}
                      <td className="p-3 text-slate-600 text-xs">
                        {item.emp.bankName}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
              <tfoot className="bg-slate-100 font-bold border-t-2 border-slate-300">
                <tr>
                  <td colSpan={2} className="p-3 text-slate-900 font-black">
                    إجمالي المستفيدين ({bankTransferRows.length} موظفاً):
                  </td>
                  <td colSpan={bankCols.length} className="p-3 text-left font-mono font-black text-blue-950 text-sm">
                    {bankTransferRows.reduce((s, c) => s + c.bank, 0).toFixed(3)} د.ك
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* Report 4: Rounding Savings (Floor 0.050) */}
      {/* ========================================================= */}
      {activeReportId === 4 && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
          <div className="border-b border-slate-200 pb-3 flex justify-between items-center">
            <div>
              <h3 className="text-base font-black text-slate-900">
                4. كشف مبالغ التقريب للأسفل (Floor 0.050 د.ك)
              </h3>
              <p className="text-xs text-slate-500">
                تفاصيل الفروقات المحتجزة لصالح الخزينة والوفر المحقق نتيجة التقريب للأسفل
              </p>
            </div>
            <div className="text-left">
              <span className="text-xs text-slate-500 font-bold block">إجمالي التقريب (وفر الخزينة):</span>
              <span className="font-mono font-black text-lg text-amber-900">
                +{calculatedAll.reduce((s, c) => s + c.roundingDiff, 0).toFixed(3)} د.ك
              </span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-100 font-bold">
                <tr>
                  <th className="p-3">الموظف</th>
                  <th className="p-3">الفرع</th>
                  <th className="p-3 text-left">النقدي الفعلي قبل التقريب</th>
                  <th className="p-3 text-left font-black text-emerald-900">النقدي المصروف (Floor 0.050)</th>
                  <th className="p-3 text-left font-black text-amber-800">مبلغ التقريب المحتجز</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {calculatedAll.map((c) => (
                  <tr key={c.emp.id} className="hover:bg-slate-50 transition">
                    <td className="p-3 font-bold text-slate-900">{c.emp.fullName}</td>
                    <td className="p-3 text-slate-600">
                      {branches.find((b) => b.id === c.emp.branchId)?.name}
                    </td>
                    <td className="p-3 text-left font-mono">{c.rawCash.toFixed(3)}</td>
                    <td className="p-3 text-left font-mono font-black text-emerald-800 bg-emerald-50/40">
                      {c.finalCash.toFixed(3)}
                    </td>
                    <td className="p-3 text-left font-mono font-bold text-amber-800 bg-amber-50/40">
                      +{c.roundingDiff.toFixed(3)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* Report 5: Advances Deductions Schedule */}
      {/* ========================================================= */}
      {activeReportId === 5 && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
          <div className="border-b border-slate-200 pb-3 flex justify-between items-center">
            <div>
              <h3 className="text-base font-black text-slate-900">
                5. كشف استقطاعات السلف الشهرية
              </h3>
              <p className="text-xs text-slate-500">حصر أقساط السلف المستردة من الموظفين لصالح الخزينة</p>
            </div>
            <div className="text-left">
              <span className="text-xs text-slate-500 font-bold block">إجمالي السلف المستقطعة:</span>
              <span className="font-mono font-black text-lg text-red-600">
                {calculatedAll.reduce((s, c) => s + c.advance, 0).toFixed(3)} د.ك
              </span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-100 font-bold">
                <tr>
                  <th className="p-3">الموظف</th>
                  <th className="p-3">الرقم المدني</th>
                  <th className="p-3">الفرع</th>
                  <th className="p-3 text-left">الراتب الأساسي</th>
                  <th className="p-3 text-left font-black text-rose-700">قسط السلفة المستقطع</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {calculatedAll
                  .filter((c) => c.advance > 0)
                  .map((c) => (
                    <tr key={c.emp.id} className="hover:bg-slate-50 transition">
                      <td className="p-3 font-bold text-slate-900">{c.emp.fullName}</td>
                      <td className="p-3 font-mono text-slate-600">{c.emp.civilId}</td>
                      <td className="p-3 text-slate-700">
                        {branches.find((b) => b.id === c.emp.branchId)?.name}
                      </td>
                      <td className="p-3 text-left font-mono">{c.basic.toFixed(3)}</td>
                      <td className="p-3 text-left font-mono font-black text-rose-700 bg-rose-50/50">
                        -{c.advance.toFixed(3)} د.ك
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* Report 6: Residence Expiry 5-Color Alert Report */}
      {/* ========================================================= */}
      {activeReportId === 6 && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
          <div className="border-b border-slate-200 pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-black text-slate-900">
                6. تقرير متابعة انتهاء الإقامات بنظام الألوان الخمسة
              </h3>
              <p className="text-xs text-slate-500">نظام الإنذار المبكر لتفادي الغرامات والمخالفات العمالية</p>
            </div>

            <div className="flex items-center gap-2">
              <label className="text-xs font-bold text-slate-700">تصفية الحالات:</label>
              <select
                value={selectedResFilter}
                onChange={(e) => setSelectedResFilter(e.target.value)}
                className="bg-slate-50 border border-slate-300 text-xs font-bold rounded-lg p-2 text-slate-800"
              >
                <option value="all">كافة الموظفين ({employees.length})</option>
                <option value="expired">منتهية (أحمر)</option>
                <option value="under_30">تنتهي خلال شهر (برتقالي)</option>
                <option value="under_alert">تنتهي خلال شهرين (أصفر)</option>
                <option value="under_90">تنتهي خلال 3 شهور (أزرق)</option>
                <option value="safe">سارية لأكثر من 3 شهور (أخضر)</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-100 font-bold">
                <tr>
                  <th className="p-3">الموظف</th>
                  <th className="p-3">الرقم المدني</th>
                  <th className="p-3">الفرع</th>
                  <th className="p-3 text-center">تاريخ انتهاء الإقامة</th>
                  <th className="p-3 text-center">المدة المتبقية</th>
                  <th className="p-3 text-center">حالة الإقامة</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {employees
                  .map((e) => ({
                    ...e,
                    st: getResidenceStatus(e.residenceExpiryDate),
                    branch: branches.find((b) => b.id === e.branchId),
                  }))
                  .filter((e) => (selectedResFilter === 'all' ? true : e.st.category === selectedResFilter))
                  .map((e) => (
                    <tr key={e.id} className="hover:bg-slate-50 transition">
                      <td className="p-3 font-bold text-slate-900">{e.fullName}</td>
                      <td className="p-3 font-mono text-slate-600">{e.civilId}</td>
                      <td className="p-3 text-slate-700">{e.branch?.name || '-'}</td>
                      <td className="p-3 text-center font-mono font-bold text-slate-800">
                        {e.residenceExpiryDate}
                      </td>
                      <td className="p-3 text-center font-mono font-black text-slate-900">
                        {e.st.daysRemaining} يوماً
                      </td>
                      <td className="p-3 text-center">
                        <span className={`inline-block px-2.5 py-1 rounded-md text-[11px] font-bold ${e.st.colorBadge}`}>
                          {e.st.label}
                        </span>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* Report 7: Financial Archive (with Working View Payroll) */}
      {/* ========================================================= */}
      {activeReportId === 7 && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
          <div className="border-b border-slate-200 pb-3 flex justify-between items-center">
            <div>
              <h3 className="text-base font-black text-slate-900">
                7. الأرشيف المالي للشهور والسنوات السابقة
              </h3>
              <p className="text-xs text-slate-500">
                سجل المسيرات الشهرية المعتمدة والمحفوظة في النظام مع إمكانية استعراض وتعديل وطباعة المسير مباشرة
              </p>
            </div>
            <span className="text-xs font-mono font-bold bg-slate-100 px-3 py-1 rounded-lg text-slate-700">
              {archiveList.length} شهور مؤرشفة
            </span>
          </div>

          <div className="space-y-3">
            {archiveList.map((arch) => (
              <div
                key={arch.id}
                className="p-4 bg-slate-50 hover:bg-blue-50/30 transition rounded-xl border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4 text-xs"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-black text-slate-900 text-sm">{arch.monthName}</span>
                    <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded">
                      معتمد
                    </span>
                    <span className="text-[10px] bg-yellow-100 text-yellow-800 font-mono px-2 py-0.5 rounded border border-yellow-200 font-bold">
                      سند ورقي: #{arch.voucherBaseNumber}
                    </span>
                  </div>
                  <div className="text-slate-500 text-[11px] mt-1">
                    تاريخ الإنشاء: {arch.createdAt} &bull; عدد الكوادر: {arch.employeeIds?.length || employees.length} موظفاً
                  </div>
                </div>

                <div className="flex items-center gap-4 flex-wrap">
                  <div className="text-right">
                    <span className="text-[10px] text-slate-400 block font-bold">التحويل البنكي:</span>
                    <span className="font-mono font-bold text-slate-700">
                      {(arch.totals?.bank || 0).toFixed(3)} د.ك
                    </span>
                  </div>

                  <div className="text-right">
                    <span className="text-[10px] text-emerald-700 block font-bold">الصرف النقدي:</span>
                    <span className="font-mono font-black text-emerald-950">
                      {(arch.totals?.finalCash || 0).toFixed(3)} د.ك
                    </span>
                  </div>

                  <div className="text-right pl-2 border-l border-slate-200">
                    <span className="text-[10px] text-blue-700 block font-bold">صافي المسير:</span>
                    <span className="font-mono font-black text-blue-950 text-sm">
                      {(arch.totals?.net || 0).toFixed(3)} د.ك
                    </span>
                  </div>

                  <button
                    onClick={() => {
                      if (onViewPayroll) {
                        onViewPayroll(arch.id);
                      }
                    }}
                    className="flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl shadow-xs transition active:scale-95"
                    title="فتح هذا المسير في جدول الاحتساب والطباعة"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>استعراض المسير</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
}
