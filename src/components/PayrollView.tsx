import { useState, useMemo, useEffect } from 'react';
import { 
  Calculator, 
  Printer, 
  FileText, 
  Save, 
  CheckCircle2, 
  X, 
  Building2, 
  TrendingUp, 
  DollarSign, 
  Sparkles,
  ArrowRight,
  Plus,
  Calendar,
  Layers,
  Users,
  Eye,
  Trash2,
  Share2,
  FileSpreadsheet,
  CheckSquare,
  Square,
  ChevronLeft,
  Copy
} from 'lucide-react';
import { Employee, Branch, Department, CompanySettings, MonthlyPayroll, MonthlyInputRecord } from '../types';
import { roundCashDown } from '../mockData';

interface PayrollViewProps {
  employees: Employee[];
  branches: Branch[];
  departments: Department[];
  settings: CompanySettings;
  savedPayrolls: MonthlyPayroll[];
  onSavePayroll: (payroll: MonthlyPayroll) => void;
  onDeletePayroll?: (payrollId: string) => void;
  onNavigateToPrint?: (monthId: string) => void;
  initialOpenPayrollId?: string;
  onClearInitialOpenPayrollId?: () => void;
}

export function PayrollView({
  employees,
  branches,
  departments,
  settings,
  savedPayrolls,
  onSavePayroll,
  onDeletePayroll,
  onNavigateToPrint,
  initialOpenPayrollId,
  onClearInitialOpenPayrollId,
}: PayrollViewProps) {
  // Main view state: 'cards' (عرض كروت الشهور) | 'new_modal' (معالج إضافة مسير وتحديد العاملين) | 'editor' (جدول الاحتساب) | 'print_branches' (طباعة المسير كل فرع بورقة)
  const [viewState, setViewState] = useState<'cards' | 'editor' | 'print_branches'>('cards');
  const [showNewModal, setShowNewModal] = useState(false);

  // Active payroll being edited or viewed
  const [currentEditingPayroll, setCurrentEditingPayroll] = useState<MonthlyPayroll | null>(null);

  // New Payroll Wizard Form States
  const [newYear, setNewYear] = useState<number>(2026);
  const [newMonth, setNewMonth] = useState<number>(10); // أكتوبر مثلاً
  const [newDaysInMonth, setNewDaysInMonth] = useState<number>(31);
  const [newVoucherBase, setNewVoucherBase] = useState<number>(1350);
  const [selectedEmpIds, setSelectedEmpIds] = useState<number[]>(
    employees.filter((e) => e.status === 'active').map((e) => e.id)
  );

  // Inputs for currently edited payroll
  const [inputs, setInputs] = useState<Record<number, MonthlyInputRecord>>({});
  const [savedSuccessMessage, setSavedSuccessMessage] = useState<string | null>(null);
  const [selectedBranchFilter, setSelectedBranchFilter] = useState<string>('all');

  // Single payslip modal
  const [activePayslipEmployee, setActivePayslipEmployee] = useState<any | null>(null);

  const monthNamesArabic = [
    '',
    'يناير',
    'فبراير',
    'مارس',
    'أبريل',
    'مايو',
    'يونيو',
    'يوليو',
    'أغسطس',
    'سبتمبر',
    'أكتوبر',
    'نوفمبر',
    'ديسمبر',
  ];

  // Open an existing saved payroll in editor
  const handleOpenPayroll = (payroll: MonthlyPayroll) => {
    setCurrentEditingPayroll(payroll);
    setInputs(payroll.inputs || {});
    setViewState('editor');
  };

  useEffect(() => {
    if (initialOpenPayrollId) {
      const p = savedPayrolls.find((item) => item.id === initialOpenPayrollId);
      if (p) {
        handleOpenPayroll(p);
        if (onClearInitialOpenPayrollId) {
          onClearInitialOpenPayrollId();
        }
      }
    }
  }, [initialOpenPayrollId, savedPayrolls]);

  // Toggle employee selection in the wizard
  const toggleEmployeeSelection = (id: number) => {
    setSelectedEmpIds((prev) =>
      prev.includes(id) ? prev.filter((empId) => empId !== id) : [...prev, id]
    );
  };

  // Toggle all employees in a specific branch
  const toggleBranchEmployees = (branchId: number) => {
    const branchEmpIds = employees
      .filter((e) => e.branchId === branchId && e.status === 'active')
      .map((e) => e.id);
    const allSelected = branchEmpIds.every((id) => selectedEmpIds.includes(id));

    if (allSelected) {
      setSelectedEmpIds((prev) => prev.filter((id) => !branchEmpIds.includes(id)));
    } else {
      setSelectedEmpIds((prev) => Array.from(new Set([...prev, ...branchEmpIds])));
    }
  };

  // Start new payroll from wizard
  const handleCreateNewPayroll = () => {
    const payrollId = `${newYear}-${String(newMonth).padStart(2, '0')}`;
    const monthName = `${monthNamesArabic[newMonth]} ${newYear}`;

    // Initialize inputs for selected employees
    const initialInputs: Record<number, MonthlyInputRecord> = {};
    selectedEmpIds.forEach((id) => {
      initialInputs[id] = {
        absentDays: 0,
        absentHours: 0,
        overtimeHours: 0,
        advanceDeduction: 0,
      };
    });

    const newPayroll: MonthlyPayroll = {
      id: payrollId,
      year: newYear,
      month: newMonth,
      monthName,
      daysInMonth: newDaysInMonth,
      voucherBaseNumber: newVoucherBase,
      createdAt: new Date().toISOString().split('T')[0],
      status: 'draft',
      employeeIds: selectedEmpIds,
      inputs: initialInputs,
      totals: {
        basic: 0,
        absenceDed: 0,
        overtime: 0,
        advances: 0,
        net: 0,
        bank: 0,
        rawCash: 0,
        finalCash: 0,
        roundingDiff: 0,
      },
    };

    setCurrentEditingPayroll(newPayroll);
    setInputs(initialInputs);
    setShowNewModal(false);
    setViewState('editor');
  };

  // Update input row
  const updateInput = (empId: number, field: keyof MonthlyInputRecord, val: number) => {
    setInputs((prev) => ({
      ...prev,
      [empId]: {
        ...(prev[empId] || { absentDays: 0, absentHours: 0, overtimeHours: 0, advanceDeduction: 0 }),
        [field]: val,
      },
    }));
  };

  // Calculate rows for current editing payroll
  const calculatedRows = useMemo(() => {
    if (!currentEditingPayroll) return [];

    const activeEmpIds = new Set(currentEditingPayroll.employeeIds);
    const includedEmployees = employees.filter((e) => activeEmpIds.has(e.id));
    const daysInMonth = currentEditingPayroll.daysInMonth || 30;

    return includedEmployees.map((emp) => {
      const inp = inputs[emp.id] || { absentDays: 0, absentHours: 0, overtimeHours: 0, advanceDeduction: 0 };
      const branch = branches.find((b) => b.id === emp.branchId);
      const department = departments.find((d) => d.id === emp.departmentId);

      // Rates
      const dailyRate = emp.basicSalary / daysInMonth;
      const hourlyRate = dailyRate / emp.dailyHours;

      // Deductions
      const absentDaysDed = inp.absentDays * dailyRate;
      const absentHoursDed = inp.absentHours * hourlyRate;
      const totalAbsenceDed = absentDaysDed + absentHoursDed;

      const salaryAfterDed = Math.max(0, emp.basicSalary - totalAbsenceDed);

      // Overtime
      const overtimeHourlyRate = hourlyRate * (settings.overtimeRate || 1.25);
      const overtimeAmount = inp.overtimeHours * overtimeHourlyRate;

      // Raw Net salary
      const rawNetSalary = Math.max(0, salaryAfterDed + overtimeAmount - inp.advanceDeduction);

      // Bank vs Cash breakdown
      const bankAmount = Math.min(rawNetSalary, emp.bankTransferAmount);
      const rawCash = Math.max(0, rawNetSalary - bankAmount);

      // Rounding cash down to nearest step (0.050 KWD)
      const finalCash = roundCashDown(rawCash, settings.roundingStep || 0.050);
      const roundingDiff = rawCash - finalCash;

      // Net salary after deducting rounding:
      const netSalary = bankAmount + finalCash; // Net payable after deducting rounding!

      return {
        emp,
        branchId: emp.branchId,
        branchName: branch?.name || 'الفرع الرئيسي',
        deptName: department?.name || 'عام',
        dailyRate,
        hourlyRate,
        inp,
        absentDaysDed,
        absentHoursDed,
        totalAbsenceDed,
        salaryAfterDed,
        overtimeHourlyRate,
        overtimeAmount,
        netSalary,
        bankAmount,
        rawCash,
        finalCash,
        roundingDiff,
      };
    });
  }, [currentEditingPayroll, employees, inputs, branches, departments, settings]);

  // Filtered rows for editor
  const filteredRows = useMemo(() => {
    return calculatedRows.filter((r) => {
      if (selectedBranchFilter === 'all') return true;
      return r.emp.branchId.toString() === selectedBranchFilter;
    });
  }, [calculatedRows, selectedBranchFilter]);

  // Totals for editor
  const totals = useMemo(() => {
    return calculatedRows.reduce(
      (acc, r) => {
        acc.basic += r.emp.basicSalary;
        acc.absenceDed += r.totalAbsenceDed;
        acc.absentDaysDed += r.absentDaysDed;
        acc.absentHoursDed += r.absentHoursDed;
        acc.overtime += r.overtimeAmount;
        acc.advances += r.inp.advanceDeduction;
        acc.net += r.netSalary;
        acc.bank += r.bankAmount;
        acc.rawCash += r.rawCash;
        acc.finalCash += r.finalCash;
        acc.roundingDiff += r.roundingDiff;
        return acc;
      },
      {
        basic: 0,
        absenceDed: 0,
        absentDaysDed: 0,
        absentHoursDed: 0,
        overtime: 0,
        advances: 0,
        net: 0,
        bank: 0,
        rawCash: 0,
        finalCash: 0,
        roundingDiff: 0,
      }
    );
  }, [calculatedRows]);

  // Save current payroll back to month card
  const handleSaveCurrentPayroll = () => {
    if (!currentEditingPayroll) return;

    const updatedPayroll: MonthlyPayroll = {
      ...currentEditingPayroll,
      status: 'approved',
      inputs,
      totals,
    };

    onSavePayroll(updatedPayroll);
    setCurrentEditingPayroll(updatedPayroll);
    setSavedSuccessMessage(`تم حفظ واعتماد مسير ${updatedPayroll.monthName} بنجاح في كارت الشهر!`);
    setTimeout(() => setSavedSuccessMessage(null), 4000);
  };

  // Group calculated rows by branch for the "Print each branch in a separate page" feature
  const rowsByBranch = useMemo(() => {
    const map = new Map<number, { branch: Branch; rows: typeof calculatedRows }>();
    branches.forEach((b) => {
      map.set(b.id, { branch: b, rows: [] });
    });

    calculatedRows.forEach((r) => {
      if (map.has(r.branchId)) {
        map.get(r.branchId)!.rows.push(r);
      }
    });

    return Array.from(map.values()).filter((item) => item.rows.length > 0);
  }, [branches, calculatedRows]);

  return (
    <div className="max-w-7xl mx-auto py-6 space-y-6">
      
      {/* ========================================================= */}
      {/* 1. CARDS VIEW (كروت علي الشاشة لكل شهر تم حفظة) */}
      {/* ========================================================= */}
      {viewState === 'cards' && (
        <div className="space-y-6">
          
          {/* Header Bar with 'إضافة مسير رواتب جديد' */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-black text-slate-900">
                سجل مسيرات الرواتب الشهرية
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                كروت الشهور المعتمدة واحتساب رواتب الفروع، تقريب النقدي للأسفل (0.050 د.ك)، وإصدار سندات الصرف
              </p>
            </div>

            <button
              onClick={() => setShowNewModal(true)}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow-md transition active:scale-95 whitespace-nowrap"
            >
              <Plus className="w-4 h-4" />
              <span>إضافة مسير رواتب جديد</span>
            </button>
          </div>

          {savedSuccessMessage && (
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center justify-between animate-in fade-in">
              <div className="flex items-center gap-2 font-bold">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>{savedSuccessMessage}</span>
              </div>
            </div>
          )}

          {/* Cards Grid of Saved Months */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {savedPayrolls.map((payroll) => (
              <div
                key={payroll.id}
                className="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition overflow-hidden flex flex-col justify-between"
              >
                {/* Card Header */}
                <div className="p-4 bg-gradient-to-r from-slate-900 to-slate-800 text-white flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center font-black text-sm text-white shadow-sm">
                      <Calendar className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="font-black text-sm">{payroll.monthName}</h3>
                      <span className="text-[10px] text-slate-300 font-mono">
                        {payroll.daysInMonth} يوماً &bull; تم الإعداد: {payroll.createdAt}
                      </span>
                    </div>
                  </div>

                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${
                    payroll.status === 'approved'
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                      : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                  }`}>
                    {payroll.status === 'approved' ? 'معتمد ومحفوظ' : 'مسودة قيد الإعداد'}
                  </span>
                </div>

                {/* Card Body Financial KPIs */}
                <div className="p-4 space-y-3">
                  
                  {/* Voucher Base No Badge */}
                  <div className="flex items-center justify-between text-xs bg-slate-50 p-2 rounded-lg border border-slate-200">
                    <span className="text-slate-500 font-bold">رقم السند الرئيسي الورقي:</span>
                    <span className="font-mono font-black bg-yellow-300 text-slate-900 px-2.5 py-0.5 rounded border border-yellow-400">
                      {payroll.voucherBaseNumber || 1349}
                    </span>
                  </div>

                  {/* Metrics 2x2 Grid */}
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200">
                      <span className="text-[10px] text-slate-500 block font-bold">عدد العاملين:</span>
                      <strong className="font-mono text-slate-900">{payroll.employeeIds.length} موظفاً</strong>
                    </div>

                    <div className="p-2.5 bg-blue-50/50 rounded-lg border border-blue-100">
                      <span className="text-[10px] text-blue-700 block font-bold">صافي الرواتب:</span>
                      <strong className="font-mono text-blue-950 font-black">
                        {(payroll.totals?.net || 0).toFixed(3)} د.ك
                      </strong>
                    </div>

                    <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200">
                      <span className="text-[10px] text-slate-500 block font-bold">التحويلات البنكية:</span>
                      <strong className="font-mono text-slate-800">
                        {(payroll.totals?.bank || 0).toFixed(3)} د.ك
                      </strong>
                    </div>

                    <div className="p-2.5 bg-emerald-50/60 rounded-lg border border-emerald-200">
                      <span className="text-[10px] text-emerald-800 block font-bold">الصرف النقدي:</span>
                      <strong className="font-mono text-emerald-950 font-black">
                        {(payroll.totals?.finalCash || 0).toFixed(3)} د.ك
                      </strong>
                    </div>
                  </div>

                </div>

                {/* Card Actions Footer */}
                <div className="p-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-2">
                  <button
                    onClick={() => handleOpenPayroll(payroll)}
                    className="flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold transition active:scale-95"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>عرض وتعديل المسير</span>
                  </button>

                  <button
                    onClick={() => {
                      setCurrentEditingPayroll(payroll);
                      setInputs(payroll.inputs || {});
                      setViewState('print_branches');
                      setTimeout(window.print, 200);
                    }}
                    className="p-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg transition"
                    title="طباعة كامل المسير (لكل فرع ورقة مستقلة)"
                  >
                    <Printer className="w-4 h-4" />
                  </button>

                  {onNavigateToPrint && (
                    <button
                      onClick={() => onNavigateToPrint(payroll.id)}
                      className="p-1.5 bg-amber-100 hover:bg-amber-200 text-amber-900 rounded-lg transition"
                      title="طباعة إيصالات الصرف والأظرف لهذا الشهر"
                    >
                      <FileText className="w-4 h-4" />
                    </button>
                  )}

                  {onDeletePayroll && (
                    <button
                      onClick={() => {
                        if (window.confirm(`هل أنت متأكد من حذف كارت مسير شهر ${payroll.monthName}؟ سيتم حذف بيانات المسير نهائياً.`)) {
                          onDeletePayroll(payroll.id);
                        }
                      }}
                      className="p-1.5 bg-red-50 hover:bg-red-100 text-red-600 hover:text-red-700 rounded-lg border border-red-200 transition"
                      title="حذف كارت مسير الرواتب لهذا الشهر"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>

              </div>
            ))}
          </div>

        </div>
      )}

      {/* ========================================================= */}
      {/* 2. NEW PAYROLL MODAL / WIZARD (تحديد الافرع والعاملين) */}
      {/* ========================================================= */}
      {showNewModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-3xl w-full overflow-hidden shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95">
            
            {/* Modal Header */}
            <div className="bg-slate-900 text-white p-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Calculator className="w-5 h-5 text-blue-400" />
                <h3 className="font-bold text-sm">إضافة مسير رواتب شهري جديد واختيار العاملين</h3>
              </div>
              <button
                onClick={() => setShowNewModal(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-5 text-xs max-h-[75vh] overflow-y-auto">
              
              {/* Month / Year / Days / Base Voucher */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                <div>
                  <label className="block text-slate-600 font-bold mb-1">السنة المالية:</label>
                  <select
                    value={newYear}
                    onChange={(e) => setNewYear(Number(e.target.value))}
                    className="w-full p-2 border border-slate-300 rounded-lg font-mono font-bold bg-white"
                  >
                    <option value={2026}>2026</option>
                    <option value={2025}>2025</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-600 font-bold mb-1">الشهر:</label>
                  <select
                    value={newMonth}
                    onChange={(e) => {
                      const m = Number(e.target.value);
                      setNewMonth(m);
                      setNewDaysInMonth(m === 2 ? 28 : [4, 6, 9, 11].includes(m) ? 30 : 31);
                    }}
                    className="w-full p-2 border border-slate-300 rounded-lg font-bold bg-white"
                  >
                    {monthNamesArabic.map((name, idx) => {
                      if (idx === 0) return null;
                      return (
                        <option key={idx} value={idx}>
                          {name} ({idx})
                        </option>
                      );
                    })}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-600 font-bold mb-1">أيام الشهر:</label>
                  <input
                    type="number"
                    min={28}
                    max={31}
                    value={newDaysInMonth}
                    onChange={(e) => setNewDaysInMonth(Number(e.target.value) || 30)}
                    className="w-full p-2 border border-slate-300 rounded-lg font-mono font-bold bg-white text-center"
                  />
                </div>

                <div>
                  <label className="block text-slate-600 font-bold mb-1">رقم السند الرئيسي:</label>
                  <input
                    type="number"
                    min={1}
                    value={newVoucherBase}
                    onChange={(e) => setNewVoucherBase(Number(e.target.value) || 1)}
                    className="w-full p-2 border border-amber-300 bg-amber-50 rounded-lg font-mono font-black text-amber-900 text-center"
                    placeholder="1350"
                  />
                </div>
              </div>

              {/* Branch & Employee Selection Area */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-black text-slate-900 text-sm">
                      تحديد العاملين حسب الفروع لإدراجهم في المسير:
                    </h4>
                    <p className="text-[11px] text-slate-500">
                      تم تحديد <strong className="text-blue-600">{selectedEmpIds.length}</strong> من أصل {employees.filter(e => e.status === 'active').length} موظفاً نشطاً
                    </p>
                  </div>

                  <div className="flex items-center gap-3">
                    {savedPayrolls.length > 0 && (
                      <button
                        type="button"
                        onClick={() => {
                          const lastPayroll = savedPayrolls[0];
                          if (lastPayroll && lastPayroll.employeeIds && lastPayroll.employeeIds.length > 0) {
                            const activeIds = new Set(employees.filter(e => e.status === 'active').map(e => e.id));
                            const validClonedIds = lastPayroll.employeeIds.filter(id => activeIds.has(id));
                            setSelectedEmpIds(validClonedIds);
                          }
                        }}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-200 rounded-lg text-xs font-bold transition shadow-xs"
                      >
                        <Copy className="w-3.5 h-3.5 text-blue-600" />
                        <span>استنساخ جدول أسماء الموظفين من المسير للشهر السابق ({savedPayrolls[0]?.monthName})</span>
                      </button>
                    )}

                    <button
                      onClick={() => {
                        const allActive = employees.filter(e => e.status === 'active').map(e => e.id);
                        if (selectedEmpIds.length === allActive.length) {
                          setSelectedEmpIds([]);
                        } else {
                          setSelectedEmpIds(allActive);
                        }
                      }}
                      className="text-xs font-bold text-blue-600 hover:underline"
                    >
                      {selectedEmpIds.length === employees.filter(e => e.status === 'active').length
                        ? 'إلغاء تحديد الكل'
                        : 'تحديد كافة العاملين'}
                    </button>
                  </div>
                </div>

                {/* Branch Accordions */}
                <div className="space-y-3">
                  {branches.map((branch) => {
                    const branchEmployees = employees.filter(
                      (e) => e.branchId === branch.id && e.status === 'active'
                    );
                    const selectedCount = branchEmployees.filter((e) =>
                      selectedEmpIds.includes(e.id)
                    ).length;

                    return (
                      <div
                        key={branch.id}
                        className="border border-slate-200 rounded-xl overflow-hidden bg-white"
                      >
                        {/* Branch Title Bar */}
                        <div className="p-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => toggleBranchEmployees(branch.id)}
                              className="text-slate-700 hover:text-blue-600"
                            >
                              {selectedCount === branchEmployees.length ? (
                                <CheckSquare className="w-4 h-4 text-blue-600" />
                              ) : selectedCount > 0 ? (
                                <div className="w-4 h-4 bg-blue-100 border border-blue-600 rounded flex items-center justify-center text-[10px] font-bold text-blue-600">
                                  -
                                </div>
                              ) : (
                                <Square className="w-4 h-4 text-slate-400" />
                              )}
                            </button>
                            <span className="font-bold text-slate-900">{branch.name}</span>
                            <span className="text-[11px] text-slate-500 font-mono">({branch.code})</span>
                          </div>

                          <span className="text-[11px] text-slate-600 font-bold">
                            المحدد: {selectedCount} / {branchEmployees.length}
                          </span>
                        </div>

                        {/* Employees List */}
                        <div className="p-2 divide-y divide-slate-100">
                          {branchEmployees.map((emp) => {
                            const isChecked = selectedEmpIds.includes(emp.id);
                            return (
                              <label
                                key={emp.id}
                                className={`flex items-center justify-between p-2 rounded-lg cursor-pointer transition ${
                                  isChecked ? 'bg-blue-50/60' : 'hover:bg-slate-50'
                                }`}
                              >
                                <div className="flex items-center gap-2">
                                  <input
                                    type="checkbox"
                                    checked={isChecked}
                                    onChange={() => toggleEmployeeSelection(emp.id)}
                                    className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                                  />
                                  <div>
                                    <span className="font-bold text-slate-800">{emp.fullName}</span>
                                    <span className="text-[10px] text-slate-500 mr-2 font-mono">
                                      (مدني: {emp.civilId})
                                    </span>
                                  </div>
                                </div>

                                <div className="text-left font-mono">
                                  <span className="text-slate-900 font-bold">
                                    {emp.basicSalary.toFixed(3)} د.ك
                                  </span>
                                </div>
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>

              </div>

            </div>

            {/* Modal Actions */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
              <button
                onClick={() => setShowNewModal(false)}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold rounded-xl text-xs"
              >
                إلغاء
              </button>

              <button
                onClick={handleCreateNewPayroll}
                disabled={selectedEmpIds.length === 0}
                className="flex items-center gap-1.5 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-xs shadow-md transition disabled:opacity-50"
              >
                <span>إضافة وتجهيز جدول المسير ({selectedEmpIds.length} موظفاً) &larr;</span>
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 3. EDITOR VIEW (جدول احتساب المسير مع زر حفظ بالكارت) */}
      {/* ========================================================= */}
      {viewState === 'editor' && currentEditingPayroll && (
        <div className="space-y-6">
          
          {/* Top Control Bar */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setViewState('cards')}
                className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition"
                title="الرجوع إلى كروت الشهور"
              >
                <ArrowRight className="w-4 h-4" />
              </button>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-black text-slate-900">
                    مسير رواتب {currentEditingPayroll.monthName}
                  </h2>
                  <span className="text-xs bg-slate-100 text-slate-700 font-mono font-bold px-2 py-0.5 rounded-full border border-slate-200">
                    {currentEditingPayroll.daysInMonth} يوماً
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  أدخل استقطاعات الغياب، الساعات الإضافية، والسلف ثم اضغط &quot;حفظ المسير في كارت الشهر&quot;
                </p>
              </div>
            </div>

            {/* Actions: Save to Card & Print */}
            <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
              
              {/* Branch Filter */}
              <select
                value={selectedBranchFilter}
                onChange={(e) => setSelectedBranchFilter(e.target.value)}
                className="px-3 py-2 text-xs border border-slate-300 rounded-xl bg-white focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">كافة الفروع ({branches.length})</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id.toString()}>
                    {b.name}
                  </option>
                ))}
              </select>

              {/* Print Full Payroll (each branch in separate page) */}
              <button
                onClick={() => {
                  setViewState('print_branches');
                  setTimeout(window.print, 150);
                }}
                className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs px-3.5 py-2 rounded-xl shadow-sm transition active:scale-95"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>طباعة المسير (لكل فرع ورقة)</span>
              </button>

              {/* Save Payroll button */}
              <button
                onClick={handleSaveCurrentPayroll}
                className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-4 py-2 rounded-xl shadow-md transition active:scale-95 whitespace-nowrap"
              >
                <Save className="w-4 h-4" />
                <span>حفظ المسير في كارت الشهر</span>
              </button>
            </div>
          </div>

          {savedSuccessMessage && (
            <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-xl text-emerald-800 text-xs flex items-center justify-between animate-in fade-in">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                <span className="font-bold">{savedSuccessMessage}</span>
              </div>
              <button
                onClick={() => setViewState('cards')}
                className="text-xs font-bold text-emerald-900 underline"
              >
                العودة لعرض كافة الكروت
              </button>
            </div>
          )}

          {/* Financial KPIs Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
            <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
              <div className="text-[10px] text-slate-500 font-bold mb-0.5">الرواتب الأساسية</div>
              <div className="text-sm font-mono font-bold text-slate-900">{totals.basic.toFixed(3)} د.ك</div>
            </div>

            <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
              <div className="text-[10px] text-red-500 font-bold mb-0.5">استقطاعات الغياب</div>
              <div className="text-sm font-mono font-bold text-red-600">-{totals.absenceDed.toFixed(3)} د.ك</div>
            </div>

            <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
              <div className="text-[10px] text-emerald-600 font-bold mb-0.5">الإضافي (+1.25)</div>
              <div className="text-sm font-mono font-bold text-emerald-700">+{totals.overtime.toFixed(3)} د.ك</div>
            </div>

            <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
              <div className="text-[10px] text-amber-600 font-bold mb-0.5">استقطاع السلف</div>
              <div className="text-sm font-mono font-bold text-amber-700">-{totals.advances.toFixed(3)} د.ك</div>
            </div>

            <div className="bg-white p-3 rounded-xl border border-blue-200 bg-blue-50/40 shadow-sm">
              <div className="text-[10px] text-blue-700 font-bold mb-0.5">صافي الرواتب</div>
              <div className="text-sm font-mono font-black text-blue-900">{totals.net.toFixed(3)} د.ك</div>
            </div>

            <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
              <div className="text-[10px] text-slate-500 font-bold mb-0.5">تحويلات البنوك</div>
              <div className="text-sm font-mono font-bold text-slate-800">{totals.bank.toFixed(3)} د.ك</div>
            </div>

            {/* Changed from 'وفر الشركة' to 'التقريب' */}
            <div className="bg-amber-50 p-3 rounded-xl border border-amber-200 shadow-sm">
              <div className="text-[10px] text-amber-800 font-bold mb-0.5">التقريب (وفر الخزينة)</div>
              <div className="text-sm font-mono font-black text-amber-900">+{totals.roundingDiff.toFixed(3)} د.ك</div>
            </div>
          </div>

          {/* Interactive Calculation Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800">
                جدول احتساب الرواتب التفصيلي ({filteredRows.length} موظفاً)
              </span>
              <span className="text-[11px] text-slate-500">
                التقريب للأسفل لأقرب 0.050 د.ك مطبق على المبالغ النقدية
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                  <tr>
                    <th className="p-2.5">الموظف والفرع</th>
                    <th className="p-2.5 text-center">الأساسي</th>
                    <th className="p-2.5 text-center">أيام غياب</th>
                    <th className="p-2.5 text-center text-red-700 font-bold">قيمة أيام الغياب</th>
                    <th className="p-2.5 text-center">ساعات غياب</th>
                    <th className="p-2.5 text-center text-red-700 font-bold">قيمة ساعات الغياب</th>
                    <th className="p-2.5 text-center">ساعات إضافي</th>
                    <th className="p-2.5 text-center text-emerald-700 font-bold">قيمة الإضافي</th>
                    <th className="p-2.5 text-center">سلفة (د.ك)</th>
                    <th className="p-2.5 text-center font-bold text-amber-800">التقريب</th>
                    <th className="p-2.5 text-center font-black text-blue-900">الصافي المستحق</th>
                    <th className="p-2.5 text-center">تحويل بنكي</th>
                    <th className="p-2.5 text-center font-bold text-emerald-800">النقدي (0.050)</th>
                    <th className="p-2.5 text-center">القسيمة</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredRows.map((r) => (
                    <tr key={r.emp.id} className="hover:bg-slate-50/70 transition">
                      <td className="p-2.5">
                        <div className="font-bold text-slate-900">{r.emp.fullName}</div>
                        <div className="text-[10px] text-slate-500">{r.branchName}</div>
                      </td>

                      <td className="p-2.5 text-center font-mono font-semibold text-slate-800">
                        {r.emp.basicSalary.toFixed(3)}
                      </td>

                      <td className="p-2.5 text-center">
                        <input
                          type="number"
                          min={0}
                          max={currentEditingPayroll.daysInMonth}
                          value={r.inp.absentDays}
                          onChange={(e) => updateInput(r.emp.id, 'absentDays', Number(e.target.value) || 0)}
                          className={`w-12 text-center mx-auto block p-1 font-mono rounded border text-xs ${
                            r.inp.absentDays > 0 ? 'bg-red-50 border-red-300 text-red-700 font-bold' : 'border-slate-200'
                          }`}
                        />
                      </td>

                      <td className="p-2.5 text-center font-mono font-bold text-red-600">
                        {r.absentDaysDed > 0 ? `-${r.absentDaysDed.toFixed(3)}` : '-'}
                      </td>

                      <td className="p-2.5 text-center">
                        <input
                          type="number"
                          min={0}
                          max={200}
                          value={r.inp.absentHours}
                          onChange={(e) => updateInput(r.emp.id, 'absentHours', Number(e.target.value) || 0)}
                          className={`w-12 text-center mx-auto block p-1 font-mono rounded border text-xs ${
                            r.inp.absentHours > 0 ? 'bg-red-50 border-red-300 text-red-700 font-bold' : 'border-slate-200'
                          }`}
                        />
                      </td>

                      <td className="p-2.5 text-center font-mono font-bold text-red-600">
                        {r.absentHoursDed > 0 ? `-${r.absentHoursDed.toFixed(3)}` : '-'}
                      </td>

                      <td className="p-2.5 text-center">
                        <input
                          type="number"
                          min={0}
                          max={100}
                          value={r.inp.overtimeHours}
                          onChange={(e) => updateInput(r.emp.id, 'overtimeHours', Number(e.target.value) || 0)}
                          className={`w-12 text-center mx-auto block p-1 font-mono rounded border text-xs ${
                            r.inp.overtimeHours > 0 ? 'bg-emerald-50 border-emerald-300 text-emerald-700 font-bold' : 'border-slate-200'
                          }`}
                        />
                      </td>

                      <td className="p-2.5 text-center font-mono font-bold text-emerald-600">
                        {r.overtimeAmount > 0 ? `+${r.overtimeAmount.toFixed(3)}` : '-'}
                      </td>

                      <td className="p-2.5 text-center">
                        <input
                          type="number"
                          step="0.001"
                          min={0}
                          value={r.inp.advanceDeduction}
                          onChange={(e) => updateInput(r.emp.id, 'advanceDeduction', parseFloat(e.target.value) || 0)}
                          className={`w-16 text-center mx-auto block p-1 font-mono rounded border text-xs ${
                            r.inp.advanceDeduction > 0 ? 'bg-amber-50 border-amber-300 text-amber-700 font-bold' : 'border-slate-200'
                          }`}
                        />
                      </td>

                      <td className="p-2.5 text-center font-mono font-bold text-amber-800 bg-amber-50/40">
                        +{r.roundingDiff.toFixed(3)}
                      </td>

                      <td className="p-2.5 text-center font-mono font-black text-blue-900 bg-blue-50/20">
                        {r.netSalary.toFixed(3)}
                      </td>

                      <td className="p-2.5 text-center font-mono text-slate-700">
                        {r.bankAmount.toFixed(3)}
                      </td>

                      <td className="p-2.5 text-center font-mono font-black text-emerald-800 bg-emerald-50/40">
                        {r.finalCash.toFixed(3)}
                      </td>

                      <td className="p-2.5 text-center">
                        <button
                          onClick={() => setActivePayslipEmployee(r)}
                          className="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold rounded text-[11px] border border-blue-200 transition"
                          title="عرض القسيمة"
                        >
                          القسيمة
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
                {/* Table Footer */}
                <tfoot className="bg-slate-100 font-bold border-t-2 border-slate-300">
                  <tr>
                    <td className="p-3 text-slate-900 font-black">الإجمالي (KWD):</td>
                    <td className="p-3 text-center font-mono text-slate-900">{totals.basic.toFixed(3)}</td>
                    <td className="p-3 text-center font-mono text-slate-600 font-bold text-[11px]">
                      {filteredRows.reduce((s, r) => s + r.inp.absentDays, 0)} يوم
                    </td>
                    <td className="p-3 text-center font-mono text-red-700 font-bold">
                      -{totals.absentDaysDed.toFixed(3)}
                    </td>
                    <td className="p-3 text-center font-mono text-slate-600 font-bold text-[11px]">
                      {filteredRows.reduce((s, r) => s + r.inp.absentHours, 0)} س
                    </td>
                    <td className="p-3 text-center font-mono text-red-700 font-bold">
                      -{totals.absentHoursDed.toFixed(3)}
                    </td>
                    <td className="p-3 text-center font-mono text-emerald-700 font-bold text-[11px]">
                      {filteredRows.reduce((s, r) => s + r.inp.overtimeHours, 0)} س
                    </td>
                    <td className="p-3 text-center font-mono text-emerald-700 font-bold">
                      +{totals.overtime.toFixed(3)}
                    </td>
                    <td className="p-3 text-center font-mono text-amber-700">-{totals.advances.toFixed(3)}</td>
                    <td className="p-3 text-center font-mono font-black text-amber-800">+{totals.roundingDiff.toFixed(3)}</td>
                    <td className="p-3 text-center font-mono font-black text-blue-900">{totals.net.toFixed(3)}</td>
                    <td className="p-3 text-center font-mono text-slate-900">{totals.bank.toFixed(3)}</td>
                    <td className="p-3 text-center font-mono font-black text-emerald-900">{totals.finalCash.toFixed(3)}</td>
                    <td className="p-3"></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

        </div>
      )}

      {/* ========================================================= */}
      {/* 4. PRINT VIEW: EACH BRANCH IN SEPARATE PAGE */}
      {/* ========================================================= */}
      {viewState === 'print_branches' && currentEditingPayroll && (
        <div className="space-y-6">
          <div className="print:hidden p-4 bg-slate-900 text-white rounded-2xl flex items-center justify-between">
            <div>
              <h3 className="font-bold text-sm">معاينة طباعة مسير الرواتب (كل فرع في ورقة مستقلة)</h3>
              <p className="text-xs text-slate-400">
                يتم فصل كل فرع تلقائياً في صفحة مستقلة مع ترويسته وإجمالياته الرسمية
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => window.print()}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl shadow-md transition"
              >
                طباعة الآن
              </button>
              <button
                onClick={() => setViewState('editor')}
                className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 font-bold text-xs rounded-xl transition"
              >
                إغلاق المعاينة
              </button>
            </div>
          </div>

          {/* Branches Printable Sections */}
          <div className="space-y-8 print:space-y-0">
            {rowsByBranch.map(({ branch, rows }, bIdx) => {
              const bTotals = rows.reduce(
                (acc, r) => {
                  acc.basic += r.emp.basicSalary;
                  acc.absenceDed += r.totalAbsenceDed;
                  acc.overtime += r.overtimeAmount;
                  acc.advances += r.inp.advanceDeduction;
                  acc.net += r.netSalary;
                  acc.bank += r.bankAmount;
                  acc.cash += r.finalCash;
                  acc.rounding += r.roundingDiff;
                  return acc;
                },
                { basic: 0, absenceDed: 0, overtime: 0, advances: 0, net: 0, bank: 0, cash: 0, rounding: 0 }
              );

              return (
                <div
                  key={branch.id}
                  className="bg-white p-6 rounded-2xl border border-slate-300 shadow-sm print:p-0 print:border-0 print:shadow-none branch-page page-break"
                >
                  {/* Branch Official Header */}
                  <div className="border-b-2 border-slate-900 pb-3 mb-3 flex items-center justify-between">
                    <div>
                      <h3 className="font-black text-base text-slate-900">{settings.companyName}</h3>
                      <div className="text-xs text-slate-700 font-bold mt-0.5">
                        مسير رواتب: <strong className="text-blue-900">{branch.name}</strong> ({branch.code})
                      </div>
                    </div>
                    <div className="text-left font-mono">
                      <div className="font-black text-sm text-slate-900">{currentEditingPayroll.monthName}</div>
                      <div className="text-[11px] text-slate-500">صفحة الفرع: {bIdx + 1} من {rowsByBranch.length}</div>
                    </div>
                  </div>

                  {/* Branch Table */}
                  <table className="w-full text-right text-xs border border-slate-300 mb-4">
                    <thead className="bg-slate-100 font-bold border-b border-slate-300">
                      <tr>
                        <th className="p-2 border-l border-slate-300">الموظف</th>
                        <th className="p-2 border-l border-slate-300 text-center">الأساسي</th>
                        <th className="p-2 border-l border-slate-300 text-center">خصم غياب</th>
                        <th className="p-2 border-l border-slate-300 text-center">إضافي</th>
                        <th className="p-2 border-l border-slate-300 text-center">سلف</th>
                        <th className="p-2 border-l border-slate-300 text-center font-bold text-amber-800">التقريب</th>
                        <th className="p-2 border-l border-slate-300 text-center font-black">الصافي المستحق</th>
                        <th className="p-2 border-l border-slate-300 text-center">تحويل بنكي</th>
                        <th className="p-2 text-center font-black">النقدي (0.050)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {rows.map((r) => (
                        <tr key={r.emp.id}>
                          <td className="p-2 border-l border-slate-300 font-bold">
                            {r.emp.fullName}
                            <span className="block text-[10px] text-slate-500 font-normal">
                              المدني: {r.emp.civilId}
                            </span>
                          </td>
                          <td className="p-2 border-l border-slate-300 text-center font-mono">{r.emp.basicSalary.toFixed(3)}</td>
                          <td className="p-2 border-l border-slate-300 text-center font-mono text-red-700">
                            {r.totalAbsenceDed > 0 ? `-${r.totalAbsenceDed.toFixed(3)}` : '-'}
                          </td>
                          <td className="p-2 border-l border-slate-300 text-center font-mono text-emerald-700">
                            {r.overtimeAmount > 0 ? `+${r.overtimeAmount.toFixed(3)}` : '-'}
                          </td>
                          <td className="p-2 border-l border-slate-300 text-center font-mono text-amber-700">
                            {r.inp.advanceDeduction > 0 ? `-${r.inp.advanceDeduction.toFixed(3)}` : '-'}
                          </td>
                          <td className="p-2 border-l border-slate-300 text-center font-mono font-bold text-amber-800">+{r.roundingDiff.toFixed(3)}</td>
                          <td className="p-2 border-l border-slate-300 text-center font-mono font-black">{r.netSalary.toFixed(3)}</td>
                          <td className="p-2 border-l border-slate-300 text-center font-mono">{r.bankAmount.toFixed(3)}</td>
                          <td className="p-2 text-center font-mono font-black bg-slate-50">{r.finalCash.toFixed(3)}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-slate-100 font-bold border-t-2 border-slate-400">
                      <tr>
                        <td className="p-2 border-l border-slate-300 font-black">إجمالي فرع {branch.name}:</td>
                        <td className="p-2 border-l border-slate-300 text-center font-mono">{bTotals.basic.toFixed(3)}</td>
                        <td className="p-2 border-l border-slate-300 text-center font-mono text-red-700">-{bTotals.absenceDed.toFixed(3)}</td>
                        <td className="p-2 border-l border-slate-300 text-center font-mono text-emerald-700">+{bTotals.overtime.toFixed(3)}</td>
                        <td className="p-2 border-l border-slate-300 text-center font-mono text-amber-700">-{bTotals.advances.toFixed(3)}</td>
                        <td className="p-2 border-l border-slate-300 text-center font-mono font-bold text-amber-900">+{bTotals.rounding.toFixed(3)}</td>
                        <td className="p-2 border-l border-slate-300 text-center font-mono font-black">{bTotals.net.toFixed(3)}</td>
                        <td className="p-2 border-l border-slate-300 text-center font-mono">{bTotals.bank.toFixed(3)}</td>
                        <td className="p-2 text-center font-mono font-black">{bTotals.cash.toFixed(3)}</td>
                      </tr>
                    </tfoot>
                  </table>

                  {/* Signatures for Branch Page */}
                  <div className="grid grid-cols-3 gap-4 pt-6 border-t border-slate-300 text-center text-xs">
                    <div>
                      <div className="text-slate-600 mb-6 font-bold">المحاسب المالي:</div>
                      <div className="border-t border-slate-400 w-3/4 mx-auto"></div>
                    </div>
                    <div>
                      <div className="text-slate-600 mb-6 font-bold">مدير فرع {branch.name}:</div>
                      <div className="border-t border-slate-400 w-3/4 mx-auto"></div>
                    </div>
                    <div>
                      <div className="text-slate-600 mb-6 font-bold">الاعتماد العام / الختم:</div>
                      <div className="border-t border-slate-400 w-3/4 mx-auto"></div>
                    </div>
                  </div>

                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Payslip Modal */}
      {activePayslipEmployee && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full overflow-hidden shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95">
            <div className="bg-slate-900 text-white p-4 flex items-center justify-between print:hidden">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-blue-400" />
                <h3 className="font-bold text-sm">قسيمة راتب شهرية رسمية</h3>
              </div>
              <button
                onClick={() => setActivePayslipEmployee(null)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs bg-white text-slate-900">
              <div className="border-b-2 border-slate-900 pb-3 flex justify-between items-start">
                <div>
                  <h3 className="text-base font-black text-slate-900">{settings.companyName}</h3>
                  <p className="text-xs text-slate-600 mt-0.5">
                    الفرع: {activePayslipEmployee.branchName} &bull; القسم: {activePayslipEmployee.deptName}
                  </p>
                </div>
                <div className="text-left font-mono">
                  <div className="text-base font-black text-blue-900">قسيمة راتب</div>
                  <div className="text-xs text-slate-600 font-bold">
                    {currentEditingPayroll?.monthName}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-slate-50 p-3 rounded-lg border border-slate-200">
                <div>
                  <span className="text-[10px] text-slate-500 block">اسم الموظف:</span>
                  <strong className="text-xs font-bold text-slate-900">{activePayslipEmployee.emp.fullName}</strong>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 block">الرقم المدني:</span>
                  <strong className="text-xs font-mono text-slate-800">{activePayslipEmployee.emp.civilId}</strong>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 block">ساعات العمل:</span>
                  <strong className="text-xs font-bold text-slate-800">{activePayslipEmployee.emp.dailyHours} ساعات/يوم</strong>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 block">تاريخ الإقامة:</span>
                  <strong className="text-xs font-mono text-slate-800">{activePayslipEmployee.emp.residenceExpiryDate}</strong>
                </div>
              </div>

              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-1.5">
                <div className="flex justify-between">
                  <span>الراتب الأساسي:</span>
                  <strong className="font-mono">{activePayslipEmployee.emp.basicSalary.toFixed(3)} د.ك</strong>
                </div>
                {activePayslipEmployee.totalAbsenceDed > 0 && (
                  <div className="flex justify-between text-red-700">
                    <span>خصم الغياب والتأخير:</span>
                    <strong className="font-mono">-{activePayslipEmployee.totalAbsenceDed.toFixed(3)} د.ك</strong>
                  </div>
                )}
                {activePayslipEmployee.overtimeAmount > 0 && (
                  <div className="flex justify-between text-emerald-700">
                    <span>بدل ساعات إضافية:</span>
                    <strong className="font-mono">+{activePayslipEmployee.overtimeAmount.toFixed(3)} د.ك</strong>
                  </div>
                )}
                {activePayslipEmployee.inp.advanceDeduction > 0 && (
                  <div className="flex justify-between text-amber-700">
                    <span>استقطاع سلفة:</span>
                    <strong className="font-mono">-{activePayslipEmployee.inp.advanceDeduction.toFixed(3)} د.ك</strong>
                  </div>
                )}
                <div className="flex justify-between pt-2 border-t border-slate-300 font-bold text-blue-900">
                  <span>صافي الراتب المستحق:</span>
                  <span className="font-mono text-sm">{activePayslipEmployee.netSalary.toFixed(3)} د.ك</span>
                </div>
                <div className="flex justify-between text-emerald-800 font-bold">
                  <span>النقدي المصروف (مقرب للأسفل):</span>
                  <span className="font-mono">{activePayslipEmployee.finalCash.toFixed(3)} د.ك</span>
                </div>
                <div className="flex justify-between text-amber-800 text-[11px]">
                  <span>التقريب:</span>
                  <span className="font-mono">+{activePayslipEmployee.roundingDiff.toFixed(3)} د.ك</span>
                </div>
              </div>

              <div className="pt-4 flex justify-between print:hidden">
                <button
                  onClick={() => window.print()}
                  className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg text-xs"
                >
                  <Printer className="w-4 h-4" />
                  <span>طباعة القسيمة</span>
                </button>
                <button
                  onClick={() => setActivePayslipEmployee(null)}
                  className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold rounded-lg text-xs"
                >
                  إغلاق
                </button>
              </div>

            </div>
          </div>
        </div>
      )}

    </div>
  );
}
