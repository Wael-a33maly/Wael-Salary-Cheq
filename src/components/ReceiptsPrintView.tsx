import { useState, useMemo } from 'react';
import { 
  Printer, 
  Mail, 
  FileText, 
  Building2, 
  Search, 
  SlidersHorizontal,
  ChevronDown,
  CheckCircle2,
  Calendar,
  Layers,
  Sparkles,
  ArrowRight
} from 'lucide-react';
import { Employee, Branch, Department, CompanySettings, MonthlyPayroll } from '../types';
import { tafqeetKuwaiti } from '../utils/tafqeet';
import { roundCashDown } from '../mockData';

interface ReceiptsPrintViewProps {
  payrolls: MonthlyPayroll[];
  employees: Employee[];
  branches: Branch[];
  departments: Department[];
  settings: CompanySettings;
  selectedMonthId?: string;
  onUpdateVoucherBase?: (payrollId: string, baseNumber: number) => void;
}

export function ReceiptsPrintView({
  payrolls,
  employees,
  branches,
  departments,
  settings,
  selectedMonthId: propSelectedMonthId,
  onUpdateVoucherBase,
}: ReceiptsPrintViewProps) {
  // Select which saved payroll month to print
  const [activePayrollId, setActivePayrollId] = useState<string>(
    propSelectedMonthId || (payrolls.length > 0 ? payrolls[0].id : '2026-09')
  );

  const currentPayroll = useMemo(() => {
    return payrolls.find((p) => p.id === activePayrollId) || payrolls[0];
  }, [payrolls, activePayrollId]);

  // Base voucher number state (e.g. 1349 or 1245)
  const [baseVoucherNumber, setBaseVoucherNumber] = useState<number>(
    currentPayroll?.voucherBaseNumber || 1349
  );

  // Update base voucher when month changes
  useMemo(() => {
    if (currentPayroll) {
      setBaseVoucherNumber(currentPayroll.voucherBaseNumber || 1349);
    }
  }, [currentPayroll]);

  // Choice of printed amount: 'cash' (النقدي), 'net' (الصافي المستحق), or 'bank' (التحويل البنكي)
  const [amountType, setAmountType] = useState<'cash' | 'net' | 'bank'>(
    settings.receiptAmountType || 'cash'
  );

  // Filter state
  const [branchFilter, setBranchFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // View mode: 'vouchers' (5 per A4) or 'envelopes' (أظرف نقدية)
  const [viewMode, setViewMode] = useState<'vouchers' | 'envelopes'>('vouchers');

  // Single envelope to print modal
  const [singleEnvelopeIndex, setSingleEnvelopeIndex] = useState<number | null>(null);

  // Compute receipt items for current payroll
  const receiptItems = useMemo(() => {
    if (!currentPayroll) return [];

    const activeEmpIds = new Set(currentPayroll.employeeIds);
    const includedEmployees = employees.filter((e) => activeEmpIds.has(e.id));

    return includedEmployees
      .map((emp, index) => {
        const inp = currentPayroll.inputs[emp.id] || {
          absentDays: 0,
          absentHours: 0,
          overtimeHours: 0,
          advanceDeduction: 0,
        };

        const branch = branches.find((b) => b.id === emp.branchId);
        const dept = departments.find((d) => d.id === emp.departmentId);

        // Daily and Hourly rates
        const dailyRate = emp.basicSalary / (currentPayroll.daysInMonth || 30);
        const hourlyRate = dailyRate / emp.dailyHours;

        // Deductions & additions
        const absentDed = inp.absentDays * dailyRate + inp.absentHours * hourlyRate;
        const overtimeAmount = inp.overtimeHours * hourlyRate * (settings.overtimeRate || 1.25);
        const netSalary = Math.max(0, emp.basicSalary - absentDed + overtimeAmount - inp.advanceDeduction);

        const bankAmount = Math.min(netSalary, emp.bankTransferAmount);
        const rawCash = Math.max(0, netSalary - bankAmount);
        const finalCash = roundCashDown(rawCash, settings.roundingStep || 0.050);

        // Decide which amount is shown on the receipt based on user configuration
        let printedAmount = finalCash;
        let amountLabel = 'المبلغ النقدي المصروف';
        if (amountType === 'net') {
          printedAmount = netSalary;
          amountLabel = 'صافي الراتب المستحق';
        } else if (amountType === 'bank') {
          printedAmount = bankAmount;
          amountLabel = 'قيمة التحويل البنكي';
        }

        const voucherSeq = `${baseVoucherNumber} / ${index + 1}`;
        const tafqeetText = tafqeetKuwaiti(printedAmount);

        return {
          index: index + 1,
          employee: emp,
          branchName: branch?.name || 'الفرع الرئيسي',
          deptName: dept?.name || 'عام',
          voucherSeq,
          printedAmount,
          amountLabel,
          finalCash,
          netSalary,
          bankAmount,
          tafqeetText,
          issueDate: currentPayroll.createdAt || '2026-09-02',
        };
      })
      .filter((item) => {
        if (branchFilter !== 'all' && item.employee.branchId.toString() !== branchFilter) {
          return false;
        }
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          return (
            item.employee.fullName.toLowerCase().includes(q) ||
            item.employee.civilId.includes(q) ||
            item.voucherSeq.includes(q)
          );
        }
        return true;
      });
  }, [currentPayroll, employees, branches, departments, settings, baseVoucherNumber, amountType, branchFilter, searchQuery]);

  // Group receipts into chunks of 5 for A4 pages
  const pagedVouchers = useMemo(() => {
    const pages: typeof receiptItems[] = [];
    for (let i = 0; i < receiptItems.length; i += 5) {
      pages.push(receiptItems.slice(i, i + 5));
    }
    return pages;
  }, [receiptItems]);

  const handleBaseNumberChange = (val: number) => {
    setBaseVoucherNumber(val);
    if (onUpdateVoucherBase && currentPayroll) {
      onUpdateVoucherBase(currentPayroll.id, val);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="max-w-7xl mx-auto py-6 space-y-6">
      
      {/* Top Header & Settings Controller (Hidden in Print) */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm print:hidden space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-black text-slate-900">
                طباعة إيصالات الصرف المتسلسلة وأظرف الرواتب
              </h2>
              <span className="text-xs bg-blue-100 text-blue-800 font-bold px-2.5 py-0.5 rounded-full border border-blue-200">
                A4 &bull; 5 إيصالات في الورقة
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              طباعة سندات صرف فرعية متسلسلة بتصميم رسمي مطابق للمعايير مع التفقيط بالدينار الكويتي، وطباعة أظرف الموظفين بالأرقام النقدية
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              onClick={() => {
                setViewMode('vouchers');
                setTimeout(handlePrint, 100);
              }}
              className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow-md transition active:scale-95"
            >
              <Printer className="w-4 h-4" />
              <span>طباعة الإيصالات (5 بالورقة)</span>
            </button>

            <button
              onClick={() => {
                setViewMode('envelopes');
                setTimeout(handlePrint, 100);
              }}
              className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow-md transition active:scale-95"
            >
              <Mail className="w-4 h-4" />
              <span>طباعة كافة أظرف الرواتب</span>
            </button>
          </div>
        </div>

        {/* Filters & Control Panel */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 pt-3 border-t border-slate-100 text-xs">
          
          {/* Select Month Card */}
          <div>
            <label className="block text-slate-500 font-bold mb-1">شهر المسير المطلوب:</label>
            <select
              value={activePayrollId}
              onChange={(e) => setActivePayrollId(e.target.value)}
              className="w-full p-2 border border-slate-300 rounded-lg font-bold bg-white focus:ring-2 focus:ring-blue-500"
            >
              {payrolls.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.monthName} ({p.employeeIds.length} موظفاً)
                </option>
              ))}
            </select>
          </div>

          {/* Base Paper Voucher Number (e.g. 1349 or 1245) */}
          <div>
            <label className="block text-slate-500 font-bold mb-1">رقم السند الرئيسي الورقي:</label>
            <div className="relative">
              <input
                type="number"
                min={1}
                value={baseVoucherNumber}
                onChange={(e) => handleBaseNumberChange(Number(e.target.value) || 1)}
                className="w-full p-2 border border-amber-300 bg-amber-50/50 rounded-lg font-mono font-black text-amber-900 focus:ring-2 focus:ring-amber-500"
                placeholder="مثال: 1349 أو 1245"
              />
              <span className="absolute left-2 top-2 text-[10px] text-amber-700 font-mono">سلسلة: {baseVoucherNumber}/1...</span>
            </div>
          </div>

          {/* Choice of Amount to Print */}
          <div>
            <label className="block text-slate-500 font-bold mb-1">المبلغ المعتمد بالسند:</label>
            <select
              value={amountType}
              onChange={(e) => setAmountType(e.target.value as any)}
              className="w-full p-2 border border-slate-300 rounded-lg font-bold bg-white focus:ring-2 focus:ring-blue-500 text-xs"
            >
              <option value="cash">المبلغ النقدي</option>
              <option value="net">صافي الراتب المستحق</option>
              <option value="bank">التحويل البنكي</option>
            </select>
          </div>

          {/* Branch Filter */}
          <div>
            <label className="block text-slate-500 font-bold mb-1">تصفية حسب الفرع:</label>
            <select
              value={branchFilter}
              onChange={(e) => setBranchFilter(e.target.value)}
              className="w-full p-2 border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">كافة الفروع ({branches.length})</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id.toString()}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>

          {/* Search by Employee Name or Civil ID */}
          <div>
            <label className="block text-slate-500 font-bold mb-1">بحث موظف / رقم مدني:</label>
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="ابحث بالاسم أو الرقم..."
                className="w-full p-2 pl-7 border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 text-xs"
              />
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2 top-2.5" />
            </div>
          </div>

        </div>

        {/* View Mode Switcher Pills */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-100">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setViewMode('vouchers')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold text-xs transition ${
                viewMode === 'vouchers'
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>معاينة إيصالات الصرف (5 في الورقة) ({receiptItems.length})</span>
            </button>

            <button
              onClick={() => setViewMode('envelopes')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold text-xs transition ${
                viewMode === 'envelopes'
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              <Mail className="w-3.5 h-3.5" />
              <span>معاينة أظرف الرواتب النقدية ({receiptItems.length})</span>
            </button>
          </div>

          <div className="text-[11px] text-slate-500">
            عدد الصفحات التقديري: <strong className="font-mono text-slate-900">{pagedVouchers.length}</strong> ورقة A4
          </div>
        </div>

      </div>

      {/* ========================================================= */}
      {/* 1. VOUCHERS VIEW (5 Receipts per A4 Page) */}
      {/* ========================================================= */}
      {viewMode === 'vouchers' && (
        <div className="space-y-8 print:space-y-0">
          {pagedVouchers.map((pageItems, pageIndex) => (
            <div
              key={pageIndex}
              className="bg-white p-6 rounded-2xl border border-slate-300 shadow-sm a4-voucher-page print:p-0 print:border-0 print:shadow-none print:m-0"
              style={{ minHeight: '1050px' }}
            >
              <div className="print:hidden text-[11px] text-slate-400 font-mono mb-2 flex justify-between border-b pb-1">
                <span>ورقة A4 رقم: {pageIndex + 1} من {pagedVouchers.length}</span>
                <span>تحتوي على {pageItems.length} إيصالات متسلسلة</span>
              </div>

              <div className="flex flex-col justify-between h-full gap-3 print:gap-1.5">
                {pageItems.map((item) => (
                  <div
                    key={item.index}
                    className="voucher-card border-2 border-slate-900 rounded-lg p-2.5 bg-white text-slate-900 flex flex-col justify-between text-xs"
                    style={{ minHeight: '190px' }}
                  >
                    {/* Top Row: Logo & Company Name (Right) + Greenish Box 'سند صرف فرعي متسلسل' (Left) */}
                    <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
                      {/* Right: Company Logo and Name */}
                      <div className="flex items-center gap-2">
                        {settings.logoUrl ? (
                          <img
                            src={settings.logoUrl}
                            alt="Logo"
                            className="w-9 h-9 object-contain rounded"
                          />
                        ) : (
                          <div className="w-8 h-8 rounded-lg bg-amber-500 text-white flex items-center justify-center font-black text-sm shadow-sm">
                            1
                          </div>
                        )}
                        <div>
                          <div className="font-black text-xs text-slate-900 leading-tight">
                            {settings.companyName}
                          </div>
                          <div className="text-[10px] text-slate-500 font-semibold">
                            {item.branchName} &bull; دولة الكويت
                          </div>
                        </div>
                      </div>

                      {/* Left: Shaded Box 'سند صرف فرعي متسلسل' */}
                      <div className="bg-emerald-50 border border-emerald-300 text-emerald-950 px-4 py-1 rounded font-black text-xs shadow-xs">
                        سند صرف فرعي متسلسل
                      </div>
                    </div>

                    {/* Second Row: Date (Right) | Receipt No (Center) | Amount (Left) */}
                    <div className="grid grid-cols-3 border-b border-slate-800 py-1 text-center items-center bg-slate-50/70">
                      {/* Date */}
                      <div className="text-right px-2 border-l border-slate-300">
                        <span className="text-[10px] text-slate-500 font-bold">التاريخ: </span>
                        <span className="font-mono font-bold text-xs">{item.issueDate}</span>
                      </div>

                      {/* Receipt No */}
                      <div className="px-2 border-l border-slate-300">
                        <span className="text-[10px] text-slate-500 font-bold">رقم الايصال: </span>
                        <span className="font-mono font-black text-red-600 text-sm">{item.voucherSeq}</span>
                      </div>

                      {/* Amount */}
                      <div className="text-left px-2">
                        <span className="text-[10px] text-slate-500 font-bold">المبلغ: </span>
                        <span className="font-mono font-black text-base text-slate-900">
                          {item.printedAmount.toFixed(3)}
                        </span>
                        <span className="text-[10px] font-bold text-slate-700 mr-1">د.ك</span>
                      </div>
                    </div>

                    {/* Third Row: صرفنا الي السيد / ة */}
                    <div className="border-b border-slate-300 py-1 px-1 flex items-center gap-2">
                      <span className="font-bold text-slate-700 text-[11px] whitespace-nowrap">
                        صرفنا الي السيد / ة :
                      </span>
                      <strong className="font-black text-slate-900 text-xs">
                        {item.employee.fullName}
                      </strong>
                      <span className="text-[10px] text-slate-600 font-mono">
                        (الرقم المدني: {item.employee.civilId})
                      </span>
                    </div>

                    {/* Fourth Row: مبلغ وقدرة (Tafqeet) */}
                    <div className="border-b border-slate-300 py-1 px-1 flex items-center gap-2 bg-blue-50/20">
                      <span className="font-bold text-slate-700 text-[11px] whitespace-nowrap">
                        مبلغ وقدرة :
                      </span>
                      <span className="font-bold text-blue-950 text-xs">
                        {item.tafqeetText}
                      </span>
                    </div>

                    {/* Fifth Row: وذلك عن */}
                    <div className="border-b border-slate-300 py-1 px-1 flex items-center gap-2">
                      <span className="font-bold text-slate-700 text-[11px] whitespace-nowrap">
                        وذلك عن :
                      </span>
                      <span className="text-slate-800 text-[11px]">
                        صرف راتبه ومستحقاته وكامل بدلاته حتي شهر {currentPayroll.monthName}
                      </span>
                    </div>

                    {/* Sixth Row (Bottom): مرفقات السند رقم (Highlighted in Yellow) & توقيع المستلم */}
                    <div className="flex items-center justify-between pt-1.5 px-1">
                      {/* Attachment Base Voucher No */}
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-bold text-slate-700">مرفقات السند رقم:</span>
                        <span className="bg-yellow-300 text-slate-950 font-black font-mono px-3 py-0.5 rounded border border-yellow-400 text-xs">
                          {baseVoucherNumber}
                        </span>
                      </div>

                      {/* Recipient Signature */}
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-bold text-slate-700">توقيع المستلم:</span>
                        <span className="font-mono text-slate-400">..................................</span>
                      </div>
                    </div>

                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ========================================================= */}
      {/* 2. ENVELOPES VIEW (طباعة الأظرف باسم الموظف والمبلغ فقط) */}
      {/* ========================================================= */}
      {viewMode === 'envelopes' && (
        <div className="space-y-4 print:space-y-0">
          {receiptItems.map((item) => (
            <div
              key={item.index}
              className="envelope-card bg-white border border-slate-300 rounded-xl p-8 shadow-xs flex items-center justify-start print:border-0 print:shadow-none print:p-8 print:m-0"
              style={{ pageBreakInside: 'avoid', pageBreakAfter: 'always' }}
            >
              <div className="text-xl sm:text-2xl font-black text-slate-900 leading-normal flex items-center gap-3 flex-wrap">
                <span>السيد / {item.employee.fullName}</span>
                <span className="font-mono font-black text-slate-900 whitespace-nowrap">
                  ({item.printedAmount.toFixed(3)} د.ك)
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

    </div>
  );
}
