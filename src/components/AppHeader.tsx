import { useState } from 'react';
import { 
  Bell, 
  AlertTriangle,
  Menu,
  Calculator,
  Printer,
  FileText,
  Landmark,
  Calendar,
  ArrowUpRight,
  LayoutDashboard
} from 'lucide-react';
import { IssuedCheque } from '../types';

interface AppHeaderProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  companyName: string;
  currentUser: { fullName: string; username: string; role: string } | null;
  residencyAlertCount: number;
  upcomingCheques?: IssuedCheque[];
  onLogout: () => void;
  onToggleSidebar?: () => void;
  onSelectReportId?: (id: number) => void;
  onNavigateToCheques?: (subTab?: string) => void;
}

export function AppHeader({
  activeTab,
  setActiveTab,
  companyName,
  currentUser,
  residencyAlertCount,
  upcomingCheques = [],
  onLogout,
  onToggleSidebar,
  onSelectReportId,
  onNavigateToCheques,
}: AppHeaderProps) {
  const [showNotifications, setShowNotifications] = useState(false);
  const [notificationTab, setNotificationTab] = useState<'cheques' | 'residency'>('cheques');

  const totalAlertCount = residencyAlertCount + upcomingCheques.length;

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
          <div className="flex items-center gap-2">
            
            {/* Quick action: لوحة التحكم (إذا كان خارج الداشبورد) */}
            {activeTab !== 'dashboard' && (
              <button
                type="button"
                onClick={() => setActiveTab('dashboard')}
                className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded-lg text-xs font-bold transition border border-slate-700"
                title="الرجوع للوحة التحكم الرئيسية"
              >
                <LayoutDashboard className="w-3.5 h-3.5 text-blue-400" />
                <span className="hidden md:inline">لوحة التحكم</span>
              </button>
            )}

            {/* Quick action: مسير الرواتب (مخفي تماماً عند فتح تبويب الشيكات بناءً على طلب المستخدم) */}
            {activeTab !== 'cheques' && (
              <button
                type="button"
                onClick={() => setActiveTab('payroll')}
                className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-bold transition border ${
                  activeTab === 'payroll'
                    ? 'bg-blue-600/30 text-blue-300 border-blue-500'
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white border-slate-700'
                }`}
                title="مسير الرواتب"
              >
                <Calculator className="w-3.5 h-3.5 text-blue-400" />
                <span className="hidden sm:inline">مسير الرواتب</span>
              </button>
            )}

            {/* Quick action: الشيكات المصرفية (ظاهر في لوحة التحكم وباقي التبويبات) */}
            <button
              type="button"
              onClick={() => {
                setActiveTab('cheques');
                if (onNavigateToCheques) {
                  onNavigateToCheques('dashboard');
                }
              }}
              className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-bold transition border ${
                activeTab === 'cheques'
                  ? 'bg-amber-500/25 text-amber-300 border-amber-500/60 shadow-xs'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white border-slate-700'
              }`}
              title="طباعة وإدارة الشيكات المصرفية (CBK)"
            >
              <Landmark className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden sm:inline">الشيكات المصرفية</span>
            </button>

            {/* Quick action: طباعة الإيصالات والأظرف */}
            {activeTab !== 'cheques' && (
              <button
                type="button"
                onClick={() => setActiveTab('receipts')}
                className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-bold transition border ${
                  activeTab === 'receipts'
                    ? 'bg-emerald-600/30 text-emerald-300 border-emerald-500'
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white border-slate-700'
                }`}
                title="طباعة إيصالات الصرف والأظرف"
              >
                <Printer className="w-3.5 h-3.5 text-emerald-400" />
                <span className="hidden sm:inline">الإيصالات والأظرف</span>
              </button>
            )}

            {/* Unified Alerts Bell: Residency + Upcoming Cheques */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowNotifications(!showNotifications)}
                className={`p-2 rounded-lg relative transition ${
                  totalAlertCount > 0
                    ? 'bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 border border-amber-500/40'
                    : 'bg-slate-800 text-slate-400 hover:text-white'
                }`}
                title="تنبيهات النظام (الشيكات المستحقة والإقامات)"
              >
                <Bell className="w-4 h-4" />
                {totalAlertCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center animate-pulse">
                    {totalAlertCount}
                  </span>
                )}
              </button>

              {showNotifications && (
                <div className="absolute left-0 mt-2 w-88 bg-white text-slate-800 rounded-2xl shadow-2xl border border-slate-200 p-3 z-50 animate-in fade-in">
                  
                  {/* Notification Category Tabs */}
                  <div className="flex border-b border-slate-100 pb-2 mb-2 gap-1">
                    <button
                      type="button"
                      onClick={() => setNotificationTab('cheques')}
                      className={`flex-1 py-1.5 px-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1 ${
                        notificationTab === 'cheques'
                          ? 'bg-amber-50 text-amber-900 border border-amber-200'
                          : 'text-slate-500 hover:bg-slate-50'
                      }`}
                    >
                      <Landmark className="w-3.5 h-3.5 text-amber-600" />
                      <span>شيكات مستحقة ({upcomingCheques.length})</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setNotificationTab('residency')}
                      className={`flex-1 py-1.5 px-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1 ${
                        notificationTab === 'residency'
                          ? 'bg-rose-50 text-rose-900 border border-rose-200'
                          : 'text-slate-500 hover:bg-slate-50'
                      }`}
                    >
                      <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                      <span>الإقامات ({residencyAlertCount})</span>
                    </button>
                  </div>

                  {/* Cheques Due Alerts Tab Content */}
                  {notificationTab === 'cheques' && (
                    <div>
                      <div className="flex items-center justify-between pb-2 border-b border-slate-100 text-xs">
                        <span className="font-bold text-slate-700">شيكات اقترب موعد صرفها:</span>
                        <button
                          type="button"
                          onClick={() => {
                            setShowNotifications(false);
                            setActiveTab('cheques');
                            if (onNavigateToCheques) {
                              onNavigateToCheques('ledger');
                            }
                          }}
                          className="text-[11px] text-blue-600 hover:underline font-bold flex items-center gap-0.5"
                        >
                          <span>سجل الشيكات</span>
                          <ArrowUpRight className="w-3 h-3" />
                        </button>
                      </div>

                      <div className="py-2 space-y-1.5 max-h-60 overflow-y-auto pr-1">
                        {upcomingCheques.length === 0 ? (
                          <div className="text-center py-4 text-xs text-slate-400">
                            لا توجد شيكات مستحقة الصرف خلال هذه الفترة.
                          </div>
                        ) : (
                          upcomingCheques.map((chk) => (
                            <div
                              key={chk.id}
                              onClick={() => {
                                setShowNotifications(false);
                                setActiveTab('cheques');
                                if (onNavigateToCheques) {
                                  onNavigateToCheques('ledger');
                                }
                              }}
                              className="p-2.5 bg-amber-50/70 hover:bg-amber-100/80 rounded-xl text-amber-950 border border-amber-200 cursor-pointer transition"
                            >
                              <div className="flex items-center justify-between font-bold text-xs">
                                <span className="truncate max-w-[170px]">{chk.beneficiaryName}</span>
                                <span className="font-mono text-amber-800 font-black">{chk.amount.toFixed(3)} د.ك</span>
                              </div>
                              <div className="flex items-center justify-between text-[11px] text-amber-700 mt-1 font-mono">
                                <span>شيك #{chk.chequeNumberStr}</span>
                                <span>استحقاق: {chk.dueDate}</span>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  )}

                  {/* Residency Alerts Tab Content */}
                  {notificationTab === 'residency' && (
                    <div>
                      <div className="flex items-center justify-between pb-2 border-b border-slate-100 text-xs">
                        <span className="font-bold text-slate-700">إقامات قاربت على الانتهاء:</span>
                        <button
                          type="button"
                          onClick={() => {
                            setShowNotifications(false);
                            if (onSelectReportId) {
                              onSelectReportId(6);
                            }
                            setActiveTab('reports');
                          }}
                          className="text-[11px] text-blue-600 hover:underline font-bold"
                        >
                          عرض التقرير الكامل
                        </button>
                      </div>

                      <div className="py-2 text-xs space-y-1.5 max-h-60 overflow-y-auto pr-1">
                        <div 
                          onClick={() => {
                            setShowNotifications(false);
                            if (onSelectReportId) {
                              onSelectReportId(6);
                            }
                            setActiveTab('reports');
                          }}
                          className="p-2 bg-red-50 hover:bg-red-100/80 rounded-xl text-red-900 border border-red-200 cursor-pointer transition"
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
                          className="p-2 bg-red-50 hover:bg-red-100/80 rounded-xl text-red-900 border border-red-200 cursor-pointer transition"
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
                          className="p-2 bg-orange-50 hover:bg-orange-100/80 rounded-xl text-orange-900 border border-orange-200 cursor-pointer transition"
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
              )}
            </div>

          </div>

        </div>
      </div>
    </header>
  );
}
