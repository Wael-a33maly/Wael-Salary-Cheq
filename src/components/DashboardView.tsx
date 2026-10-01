import { useState, useMemo } from 'react';
import { 
  Users, 
  Building2, 
  DollarSign, 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle2, 
  ArrowUpRight, 
  Calendar, 
  ShieldCheck, 
  FileText,
  Clock,
  Sparkles,
  Landmark
} from 'lucide-react';
import { Branch, Employee, AuditRecord, CompanySettings, MonthlyPayroll } from '../types';
import { getResidenceStatus } from '../mockData';

interface DashboardViewProps {
  branches: Branch[];
  employees: Employee[];
  auditLogs: AuditRecord[];
  settings: CompanySettings;
  onNavigate: (tab: string) => void;
  payrolls?: MonthlyPayroll[];
}

export function DashboardView({
  branches,
  employees,
  auditLogs,
  settings,
  onNavigate,
  payrolls = [],
}: DashboardViewProps) {
  // حساب الإحصائيات الحية المتكيفة
  const activeEmployees = employees.filter((e) => e.status === 'active');
  const activeBranches = branches.filter((b) => b.status === 'active');
  const totalBasic = activeEmployees.reduce((sum, e) => sum + (e.basicSalary || 0), 0);

  // حساب وفر الخزينة التراكمي من المسيرات أو الموظفين الفعليين
  const totalRoundingSavings = useMemo(() => {
    if (payrolls && payrolls.length > 0) {
      const sum = payrolls.reduce((acc, p) => acc + (p.totals?.roundingDiff || 0), 0);
      if (sum > 0) return sum;
    }
    const step = settings.roundingStep || 0.050;
    return activeEmployees.reduce((sum, e) => {
      const rounded = Math.floor(e.basicSalary / step) * step;
      return sum + (e.basicSalary - rounded);
    }, 0);
  }, [payrolls, activeEmployees, settings.roundingStep]);

  // حساب تنبيهات الإقامات
  const alertEmployees = employees
    .map((e) => ({
      ...e,
      resStatus: getResidenceStatus(e.residenceExpiryDate, settings.residenceAlertDays),
    }))
    .filter((e) => e.resStatus.category !== 'valid')
    .sort((a, b) => a.resStatus.daysRemaining - b.resStatus.daysRemaining);

  // أسماء الفروع العاملة الحالية
  const activeBranchNames = activeBranches.length > 0
    ? activeBranches.map((b) => b.name).join('، ')
    : 'لا توجد فروع مضافة حالياً';

  // مسار تطور تكلفة الرواتب المتكيف ديناميكياً
  const monthlyTrend = useMemo(() => {
    const monthNamesAr = [
      'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
      'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'
    ];
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonthIdx = now.getMonth();

    if (payrolls && payrolls.length > 0) {
      const sorted = [...payrolls].sort((a, b) => {
        if (a.year !== b.year) return a.year - b.year;
        return a.month - b.month;
      });
      const recent = sorted.slice(-6);
      const maxVal = Math.max(...recent.map((p) => p.totals?.net || p.totals?.basic || 1000), 1000) * 1.15;
      return recent.map((p, idx) => ({
        month: p.monthName,
        total: p.totals?.net || p.totals?.basic || 0,
        max: maxVal,
        current: idx === recent.length - 1,
      }));
    }

    // توليد مسار آخر 6 أشهر متكيف مع الراتب الإجمالي الحالي
    const result = [];
    for (let i = 5; i >= 0; i--) {
      let mIdx = currentMonthIdx - i;
      let y = currentYear;
      if (mIdx < 0) {
        mIdx += 12;
        y -= 1;
      }
      const isCurrent = i === 0;
      const total = activeEmployees.length > 0 ? totalBasic : 0;
      result.push({
        month: `${monthNamesAr[mIdx]} ${y}${isCurrent ? ' (الحالي)' : ''}`,
        total,
        max: totalBasic > 0 ? totalBasic * 1.2 : 1000,
        current: isCurrent,
      });
    }
    return result;
  }, [payrolls, activeEmployees.length, totalBasic]);

  // توزيع الرواتب الفعلي الحقيقي حسب الفروع
  const branchDistribution = useMemo(() => {
    return branches.map((b) => {
      const bEmps = employees.filter((e) => e.branchId === b.id && e.status === 'active');
      const bSalary = bEmps.reduce((sum, e) => sum + (e.basicSalary || 0), 0);
      const bPct = totalBasic > 0 ? Math.round((bSalary / totalBasic) * 100) : 0;
      return {
        ...b,
        calculatedSalary: bSalary,
        calculatedCount: bEmps.length,
        pct: bPct,
      };
    });
  }, [branches, employees, totalBasic]);

  return (
    <div className="max-w-7xl mx-auto py-6 space-y-6">
      
      {/* Quick Actions Bar (أزرار الإجراءات السريعة بالأعلى) */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
              ⚡
            </div>
            <h3 className="text-xs font-black text-slate-900">
              الإجراءات السريعة المباشرة
            </h3>
          </div>
          <span className="text-[11px] text-slate-400">
            وصول فوري لكافة وظائف النظام والمسيرات
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
          <button
            onClick={() => onNavigate('payroll')}
            className="flex items-center gap-2.5 p-3 rounded-xl bg-blue-50/70 hover:bg-blue-100/70 text-blue-900 font-bold text-xs transition border border-blue-200 shadow-2xs text-right active:scale-95"
          >
            <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center flex-shrink-0 shadow-sm">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-black">إضافة مسير جديد</div>
              <div className="text-[10px] text-blue-600 font-normal">احتساب واعتماد الشهور</div>
            </div>
          </button>

          <button
            onClick={() => onNavigate('cheques')}
            className="flex items-center gap-2.5 p-3 rounded-xl bg-amber-50/70 hover:bg-amber-100/70 text-amber-950 font-bold text-xs transition border border-amber-200 shadow-2xs text-right active:scale-95"
          >
            <div className="w-8 h-8 rounded-lg bg-amber-600 text-white flex items-center justify-center flex-shrink-0 shadow-sm">
              <Landmark className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-black">الشيكات المصرفية</div>
              <div className="text-[10px] text-amber-700 font-normal">طباعة وإصدار الشيكات</div>
            </div>
          </button>

          <button
            onClick={() => onNavigate('receipts')}
            className="flex items-center gap-2.5 p-3 rounded-xl bg-emerald-50/70 hover:bg-emerald-100/70 text-emerald-950 font-bold text-xs transition border border-emerald-200 shadow-2xs text-right active:scale-95"
          >
            <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center flex-shrink-0 shadow-sm">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-black">طباعة الإيصالات</div>
              <div className="text-[10px] text-emerald-700 font-normal">5 إيصالات في ورقة A4</div>
            </div>
          </button>

          <button
            onClick={() => onNavigate('receipts')}
            className="flex items-center gap-2.5 p-3 rounded-xl bg-amber-50/70 hover:bg-amber-100/70 text-amber-950 font-bold text-xs transition border border-amber-200 shadow-2xs text-right active:scale-95"
          >
            <div className="w-8 h-8 rounded-lg bg-amber-500 text-white flex items-center justify-center flex-shrink-0 shadow-sm">
              <Clock className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-black">أظرف الرواتب</div>
              <div className="text-[10px] text-amber-700 font-normal">أرقام نقدية للأظرف</div>
            </div>
          </button>

          <button
            onClick={() => onNavigate('employees')}
            className="flex items-center gap-2.5 p-3 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-800 font-bold text-xs transition border border-slate-200 shadow-2xs text-right active:scale-95"
          >
            <div className="w-8 h-8 rounded-lg bg-slate-800 text-white flex items-center justify-center flex-shrink-0 shadow-sm">
              <Users className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-black">سجل الموظفين</div>
              <div className="text-[10px] text-slate-500 font-normal">إضافة وبطاقات الموظفين</div>
            </div>
          </button>

          <button
            onClick={() => onNavigate('reports')}
            className="flex items-center gap-2.5 p-3 rounded-xl bg-rose-50/70 hover:bg-rose-100/70 text-rose-950 font-bold text-xs transition border border-rose-200 shadow-2xs text-right active:scale-95"
          >
            <div className="w-8 h-8 rounded-lg bg-rose-600 text-white flex items-center justify-center flex-shrink-0 shadow-sm">
              <AlertTriangle className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-black">تقرير الإقامات</div>
              <div className="text-[10px] text-rose-600 font-normal">{alertEmployees.length} إقامات منتهية/قريبة</div>
            </div>
          </button>
        </div>
      </div>

      {/* 5 KPI Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        
        {/* Metric 1 */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-bold">الموظفون النشطون</span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-black text-slate-900 font-mono">
              {activeEmployees.length} <span className="text-xs font-sans text-slate-500">موظف</span>
            </div>
            <div className="text-[11px] text-emerald-600 font-bold mt-1 flex items-center gap-1">
              <span>✓ مسجلون برقم مدني كويتي</span>
            </div>
          </div>
        </div>

        {/* Metric 2 */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-bold">الفروع العاملة</span>
            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Building2 className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-black text-slate-900 font-mono">
              {activeBranches.length} <span className="text-xs font-sans text-slate-500">فروع</span>
            </div>
            <div className="text-[11px] text-slate-500 font-bold mt-1 truncate max-w-full" title={activeBranchNames}>
              {activeBranchNames}
            </div>
          </div>
        </div>

        {/* Metric 3 */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-bold">إجمالي الرواتب الأساسية</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-black text-emerald-700 font-mono">
              {totalBasic.toFixed(3)} <span className="text-xs font-sans text-slate-500">د.ك</span>
            </div>
            <div className="text-[11px] text-slate-500 font-bold mt-1">
              شهرياً قبل الإضافي والغياب
            </div>
          </div>
        </div>

        {/* Metric 4 */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-bold">التقريب (وفر الخزينة)</span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <Sparkles className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-black text-amber-700 font-mono">
              {totalRoundingSavings.toFixed(3)} <span className="text-xs font-sans text-slate-500">د.ك</span>
            </div>
            <div className="text-[11px] text-amber-700 font-bold mt-1">
              تراكمي الفلس (Floor {settings.roundingStep || 0.050})
            </div>
          </div>
        </div>

        {/* Metric 5 */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-bold">تنبيهات الإقامات</span>
            <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-black text-rose-600 font-mono">
              {alertEmployees.length} <span className="text-xs font-sans text-slate-500">إقامات</span>
            </div>
            <div className="text-[11px] text-rose-600 font-bold mt-1">
              منتهية أو تنتهي خلال 60 يوماً
            </div>
          </div>
        </div>

      </div>

      {/* Urgent Residency Expirations Alert Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-600 animate-ping"></span>
            <h3 className="font-bold text-slate-900 text-sm">
              تنبيهات الإقامات المستعجلة (نظام الإنذار المبكر)
            </h3>
            <span className="text-xs bg-rose-100 text-rose-800 font-bold px-2 py-0.5 rounded-full">
              {alertEmployees.length} موظفين بحاجة لإجراءات
            </span>
          </div>

          <button
            onClick={() => onNavigate('reports')}
            className="text-xs text-blue-600 hover:text-blue-800 font-bold flex items-center gap-1 self-start sm:self-auto"
          >
            <span>فتح تقرير الإقامات الشامل (بفلاتر المدد) &larr;</span>
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-slate-100/70 text-slate-700 font-bold border-b border-slate-200">
              <tr>
                <th className="p-3">الموظف</th>
                <th className="p-3">الرقم المدني</th>
                <th className="p-3">الفرع والقسم</th>
                <th className="p-3">تاريخ انتهاء الإقامة</th>
                <th className="p-3">الحالة والمهلة المتبقية</th>
                <th className="p-3 text-center">الإجراء</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {alertEmployees.map((emp) => {
                const branch = branches.find((b) => b.id === emp.branchId);
                return (
                  <tr key={emp.id} className={`hover:bg-slate-50 transition ${emp.resStatus.rowHighlight}`}>
                    <td className="p-3 font-bold text-slate-900">{emp.fullName}</td>
                    <td className="p-3 font-mono text-slate-600">{emp.civilId}</td>
                    <td className="p-3 text-slate-600">{branch?.name || 'الفرع الرئيسي'}</td>
                    <td className="p-3 font-mono font-bold text-slate-800">{emp.residenceExpiryDate}</td>
                    <td className="p-3">
                      <span className={`inline-block px-2.5 py-1 rounded-md text-[11px] shadow-sm ${emp.resStatus.colorBadge}`}>
                        {emp.resStatus.label}
                      </span>
                    </td>
                    <td className="p-3 text-center">
                      <button
                        onClick={() => onNavigate('employees')}
                        className="px-2.5 py-1 bg-white hover:bg-slate-100 text-slate-700 font-bold rounded border border-slate-300 text-[11px] shadow-sm"
                      >
                        عرض بطاقة الموظف
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Charts & Analytical Section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Monthly Payroll Cost Trend (6 Months) */}
        <div className="lg:col-span-7 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h3 className="font-bold text-slate-900 text-sm">مسار تطور تكلفة الرواتب الشهرية (آخر 6 أشهر)</h3>
              <p className="text-[11px] text-slate-500">مقارنة صافي الرواتب بالدينار الكويتي KWD</p>
            </div>
            <span className="text-xs font-mono font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded">2026</span>
          </div>

          {/* Bar Chart Visualization */}
          <div className="space-y-3 pt-2">
            {monthlyTrend.map((item, idx) => {
              const pct = item.max > 0 ? Math.min(100, Math.round((item.total / item.max) * 100)) : 0;
              return (
                <div key={idx} className="space-y-1">
                  <div className="flex justify-between text-xs font-bold">
                    <span className={item.current ? 'text-blue-700' : 'text-slate-700'}>
                      {item.month}
                    </span>
                    <span className="font-mono text-slate-900">{item.total.toFixed(3)} د.ك</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        item.current ? 'bg-blue-600' : 'bg-slate-400'
                      }`}
                      style={{ width: `${pct}%` }}
                    ></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Branch Budget Distribution */}
        <div className="lg:col-span-5 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h3 className="font-bold text-slate-900 text-sm">توزيع الرواتب حسب الفروع</h3>
              <p className="text-[11px] text-slate-500">نسبة مساهمة كل فرع من إجمالي المسير</p>
            </div>
            <Building2 className="w-4 h-4 text-slate-400" />
          </div>

          <div className="space-y-3 pt-1">
            {branchDistribution.length > 0 ? (
              branchDistribution.map((b) => (
                <div key={b.id} className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <div className="flex justify-between items-center text-xs mb-1.5">
                    <div className="font-bold text-slate-800">{b.name}</div>
                    <span className="font-mono font-bold text-blue-600">
                      {b.calculatedSalary.toFixed(3)} د.ك ({b.pct}%)
                    </span>
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-indigo-600 h-full rounded-full transition-all duration-500"
                      style={{ width: `${b.pct}%` }}
                    ></div>
                  </div>
                  <div className="flex justify-between text-[10px] text-slate-500 mt-1">
                    <span>الكود: {b.code}</span>
                    <span>{b.calculatedCount} موظف</span>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-4 text-center text-xs text-slate-400">
                لا توجد فروع مضافة حالياً
              </div>
            )}
          </div>
        </div>

      </div>

      {/* Quick Action Shortcuts & Audit Log */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Quick Actions */}
        <div className="lg:col-span-6 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
          <h3 className="font-bold text-slate-900 text-sm pb-2 border-b border-slate-100">
            الوصول السريع للمهام اليومية والشهرية
          </h3>
          <div className="grid grid-cols-2 gap-3 pt-1">
            <button
              onClick={() => onNavigate('payroll')}
              className="p-3 text-right bg-blue-50/70 hover:bg-blue-100/70 rounded-xl border border-blue-200 transition group"
            >
              <div className="font-bold text-xs text-blue-900 group-hover:text-blue-950 flex items-center justify-between">
                <span>إعداد مسير الرواتب</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </div>
              <p className="text-[11px] text-blue-700 mt-1">احتساب مسير رواتب الشهر والقسائم والتقريب</p>
            </button>

            <button
              onClick={() => onNavigate('employees')}
              className="p-3 text-right bg-indigo-50/70 hover:bg-indigo-100/70 rounded-xl border border-indigo-200 transition group"
            >
              <div className="font-bold text-xs text-indigo-900 group-hover:text-indigo-950 flex items-center justify-between">
                <span>إدارة الموظفين</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </div>
              <p className="text-[11px] text-indigo-700 mt-1">إضافة، تعديل، وبيانات البنوك والإقامات</p>
            </button>

            <button
              onClick={() => onNavigate('reports')}
              className="p-3 text-right bg-emerald-50/70 hover:bg-emerald-100/70 rounded-xl border border-emerald-200 transition group"
            >
              <div className="font-bold text-xs text-emerald-900 group-hover:text-emerald-950 flex items-center justify-between">
                <span>التقارير الثمانية المعتمدة</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </div>
              <p className="text-[11px] text-emerald-700 mt-1">كشف البنوك، التقريب، المجمع، والإقامات</p>
            </button>

            <button
              onClick={() => onNavigate('branches')}
              className="p-3 text-right bg-purple-50/70 hover:bg-purple-100/70 rounded-xl border border-purple-200 transition group"
            >
              <div className="font-bold text-xs text-purple-900 group-hover:text-purple-950 flex items-center justify-between">
                <span>الفروع والأقسام</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </div>
              <p className="text-[11px] text-purple-700 mt-1">إدارة الأقسام وتوزيع موظفي الفروع</p>
            </button>
          </div>
        </div>

        {/* Recent Audit Activities */}
        <div className="lg:col-span-6 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <h3 className="font-bold text-slate-900 text-sm">
              أحدث حركات سجل التدقيق (Audit Trail)
            </h3>
            <button
              onClick={() => onNavigate('settings')}
              className="text-xs text-blue-600 hover:underline font-bold"
            >
              السجل الكامل &larr;
            </button>
          </div>

          <div className="divide-y divide-slate-100 text-xs">
            {auditLogs.slice(0, 4).map((log) => (
              <div key={log.id} className="py-2.5 flex items-start justify-between gap-3">
                <div className="flex items-start gap-2">
                  <div className="w-2 h-2 rounded-full bg-blue-600 mt-1.5 flex-shrink-0"></div>
                  <div>
                    <span className="font-bold text-slate-900">{log.details}</span>
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      المستخدم: <strong className="text-slate-700">{log.username}</strong> &bull; جدول: {log.tableName}
                    </div>
                  </div>
                </div>
                <span className="text-[10px] font-mono text-slate-400 whitespace-nowrap">
                  {log.createdAt.substring(11, 16)}
                </span>
              </div>
            ))}
          </div>
        </div>

      </div>

    </div>
  );
}
