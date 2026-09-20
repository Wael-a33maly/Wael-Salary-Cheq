import { useState } from 'react';
import { 
  Bell, 
  AlertTriangle,
  Menu,
  Calculator,
  Printer,
  FileText
} from 'lucide-react';

interface AppHeaderProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  companyName: string;
  currentUser: { fullName: string; username: string; role: string } | null;
  residencyAlertCount: number;
  onLogout: () => void;
  onToggleSidebar?: () => void;
  onSelectReportId?: (id: number) => void;
}

export function AppHeader({
  activeTab,
  setActiveTab,
  companyName,
  currentUser,
  residencyAlertCount,
  onLogout,
  onToggleSidebar,
  onSelectReportId,
}: AppHeaderProps) {
  const [showNotifications, setShowNotifications] = useState(false);

  const getTabLabel = (tab: string) => {
    switch (tab) {
      case 'dashboard': return 'لوحة التحكم المالية';
      case 'payroll': return 'مسير الرواتب الشهري';
      case 'receipts': return 'طباعة الإيصالات والأظرف';
      case 'cheques': return 'طباعة الشيكات البنكية (CBK)';
      case 'employees': return 'سجل الموظفين';
      case 'branches': return 'الفروع والأقسام';
      case 'reports': return 'مركز التقارير والتدقيق';
      case 'users': return 'إدارة المستخدمين';
      case 'settings': return 'الإعدادات والشركة';
      default: return 'نظام إدارة الرواتب';
    }
  };

  return (
    <header className="bg-slate-900 text-white shadow-md sticky top-0 z-40 border-b border-slate-800 print:hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-2.5">
        <div className="flex items-center justify-between gap-3">
          
          {/* Right: Sidebar Toggle & Company Title */}
          <div className="flex items-center gap-3">
            {onToggleSidebar && (
              <button
                onClick={onToggleSidebar}
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition"
                title="تبديل القائمة الجانبية"
              >
                <Menu className="w-4 h-4" />
              </button>
            )}

            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-sm sm:text-base font-black tracking-tight text-white">
                  {companyName}
                </h1>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 font-bold border border-blue-500/30">
                  د.ك KWD
                </span>
              </div>
              <span className="text-[11px] text-slate-400">
                {getTabLabel(activeTab)}
              </span>
            </div>
          </div>

          {/* Left: Quick Actions & Notifications */}
          <div className="flex items-center gap-2.5">
            
            {/* Quick action buttons */}
            <button
              onClick={() => setActiveTab('payroll')}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded-lg text-xs font-bold transition border border-slate-700"
              title="مسير الرواتب"
            >
              <Calculator className="w-3.5 h-3.5 text-blue-400" />
              <span>مسير الرواتب</span>
            </button>

            <button
              onClick={() => setActiveTab('receipts')}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded-lg text-xs font-bold transition border border-slate-700"
              title="طباعة إيصالات الصرف والأظرف"
            >
              <Printer className="w-3.5 h-3.5 text-emerald-400" />
              <span>طباعة الإيصالات والأظرف</span>
            </button>

            {/* Residency Expiration Alerts Bell */}
            <div className="relative">
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className={`p-2 rounded-lg relative transition ${
                  residencyAlertCount > 0
                    ? 'bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 border border-amber-500/40'
                    : 'bg-slate-800 text-slate-400 hover:text-white'
                }`}
                title="تنبيهات الإقامات"
              >
                <Bell className="w-4 h-4" />
                {residencyAlertCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center animate-pulse">
                    {residencyAlertCount}
                  </span>
                )}
              </button>

              {showNotifications && (
                <div className="absolute left-0 mt-2 w-80 bg-white text-slate-800 rounded-xl shadow-2xl border border-slate-200 p-3 z-50 animate-in fade-in">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                    <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                      تنبيهات انتهاء الإقامات ({residencyAlertCount})
                    </span>
                    <button
                      onClick={() => {
                        setShowNotifications(false);
                        if (onSelectReportId) {
                          onSelectReportId(6);
                        }
                        setActiveTab('reports');
                      }}
                      className="text-[11px] text-blue-600 hover:underline font-bold"
                    >
                      عرض تقرير الإقامات
                    </button>
                  </div>
                  <div className="py-2 text-xs space-y-1.5 max-h-56 overflow-y-auto">
                    <div 
                      onClick={() => {
                        setShowNotifications(false);
                        if (onSelectReportId) {
                          onSelectReportId(6);
                        }
                        setActiveTab('reports');
                      }}
                      className="p-2 bg-red-50 hover:bg-red-100/80 rounded-lg text-red-900 border border-red-200 cursor-pointer transition"
                    >
                      <div className="font-bold flex items-center justify-between">
                        <span>خالد عبد الرحمن المنصور (الإدارة)</span>
                        <span className="text-[10px] text-red-600 underline">عرض</span>
                      </div>
                      <div className="text-[11px] text-red-700">الإقامة منتهية منذ 10 أيام (تتطلب تجديداً فورياً)</div>
                    </div>
                    <div 
                      onClick={() => {
                        setShowNotifications(false);
                        if (onSelectReportId) {
                          onSelectReportId(6);
                        }
                        setActiveTab('reports');
                      }}
                      className="p-2 bg-red-50 hover:bg-red-100/80 rounded-lg text-red-900 border border-red-200 cursor-pointer transition"
                    >
                      <div className="font-bold flex items-center justify-between">
                        <span>فهد عادل الشمري (فرع الأحمدي)</span>
                        <span className="text-[10px] text-red-600 underline">عرض</span>
                      </div>
                      <div className="text-[11px] text-red-700">الإقامة منتهية منذ 19 يوماً</div>
                    </div>
                    <div 
                      onClick={() => {
                        setShowNotifications(false);
                        if (onSelectReportId) {
                          onSelectReportId(6);
                        }
                        setActiveTab('reports');
                      }}
                      className="p-2 bg-orange-50 hover:bg-orange-100/80 rounded-lg text-orange-900 border border-orange-200 cursor-pointer transition"
                    >
                      <div className="font-bold flex items-center justify-between">
                        <span>سامي عبد الله الحداد (فرع حولي)</span>
                        <span className="text-[10px] text-orange-600 underline">عرض</span>
                      </div>
                      <div className="text-[11px] text-orange-700">تنتهي خلال 8 أيام (2026-09-28)</div>
                    </div>
                  </div>
                </div>
              )}
            </div>

          </div>

        </div>
      </div>
    </header>
  );
}
