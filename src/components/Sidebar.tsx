import { useState, useEffect } from 'react';
import { 
  LayoutDashboard, 
  Calculator, 
  Printer, 
  Users, 
  Building2, 
  FileText, 
  ShieldCheck, 
  Settings, 
  ChevronRight, 
  ChevronLeft,
  ChevronDown,
  LogOut,
  BarChart3,
  Building,
  CreditCard,
  Percent,
  Coins,
  AlertTriangle,
  Archive,
  WalletCards,
  Landmark,
  Receipt,
  ListOrdered,
  FileSpreadsheet,
  BookOpen,
  Sliders
} from 'lucide-react';

export const REPORTS_SUB_ITEMS = [
  { id: 1, title: '1. التقرير المالي المجمع للفروع', icon: BarChart3 },
  { id: 2, title: '2. كشف رواتب فرع محدد', icon: Building },
  { id: 3, title: '3. كشف التحويلات ومبالغ النقد', icon: CreditCard },
  { id: 4, title: '4. كشف مبالغ التقريب (0.050)', icon: Percent },
  { id: 5, title: '5. كشف استقطاعات السلف', icon: Coins },
  { id: 6, title: '6. تقرير انتهاء الإقامات', icon: AlertTriangle },
  { id: 7, title: '7. الأرشيف المالي للشهور', icon: Archive },
];

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  isCollapsed: boolean;
  setIsCollapsed: (collapsed: boolean) => void;
  companyName: string;
  currentUser: { fullName: string; username: string; role: string } | null;
  residencyAlertCount: number;
  activeReportId?: number;
  onSelectReportId?: (id: number) => void;
  activeChequeSubTab?: string;
  onSelectChequeSubTab?: (subTab: string) => void;
  onLogout: () => void;
}

export function Sidebar({
  activeTab,
  setActiveTab,
  isCollapsed,
  setIsCollapsed,
  companyName,
  currentUser,
  residencyAlertCount,
  activeReportId = 1,
  onSelectReportId,
  activeChequeSubTab = 'dashboard',
  onSelectChequeSubTab,
  onLogout,
}: SidebarProps) {
  // Accordion state: only one section open at a time ('cheques' | 'payroll' | null)
  const [expandedSection, setExpandedSection] = useState<'cheques' | 'payroll' | null>(() => {
    if (activeTab === 'cheques') return 'cheques';
    return 'payroll';
  });

  // State for collapsible reports sub-menu inside payroll
  const [reportsOpen, setReportsOpen] = useState(false);

  // Sub-items belonging to the "الرواتب" section
  const payrollSubItems = [
    { id: 'payroll', label: 'مسير الرواتب', icon: Calculator },
    { id: 'receipts', label: 'طباعة الإيصالات والأظرف', icon: Printer, badge: 'جديد' },
    { id: 'employees', label: 'الموظفون', icon: Users },
    { id: 'branches', label: 'الفروع والأقسام', icon: Building2 },
    { id: 'reports', label: 'مركز التقارير (7 تقارير)', icon: FileText, alertBadge: residencyAlertCount },
  ];

  const isPayrollActive = payrollSubItems.some((item) => item.id === activeTab);

  // Sub-items belonging to the "طباعة الشيكات" section
  const chequeSubItems = [
    { id: 'dashboard', label: 'لوحة التحكم والداشبورد', icon: LayoutDashboard },
    { id: 'issue', label: 'تحرير وطباعة شيك', icon: Receipt, badge: 'CBK' },
    { id: 'ledger', label: 'سجل الشيكات والمتابعة', icon: ListOrdered },
    { id: 'beneficiaries', label: 'شاشة تسجيل المستفيدين', icon: Users },
    { id: 'reports', label: 'مركز التقارير المصرفية', icon: FileSpreadsheet },
    { id: 'settings', label: 'دفاتر الشيكات والحسابات', icon: BookOpen },
    { id: 'calibration', label: 'معايرة مقاسات الشيك', icon: Sliders, badge: 'جديد' },
  ];

  const isChequesActive = activeTab === 'cheques';

  // Handle navigation click with strict accordion behavior (opening one closes others)
  const handleNavClick = (tabId: string) => {
    setActiveTab(tabId);
    if (tabId === 'cheques') {
      setExpandedSection('cheques');
    } else if (payrollSubItems.some((item) => item.id === tabId)) {
      setExpandedSection('payroll');
    } else {
      // Standalone top level tabs (dashboard, users, settings) collapse accordion
      setExpandedSection(null);
    }
    if (typeof window !== 'undefined' && window.innerWidth < 768) {
      setIsCollapsed(true);
    }
  };

  // Keep accordion in sync with activeTab changes from external clicks
  useEffect(() => {
    if (isChequesActive) {
      setExpandedSection('cheques');
    } else if (isPayrollActive) {
      setExpandedSection('payroll');
    }
  }, [activeTab, isChequesActive, isPayrollActive]);

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {!isCollapsed && (
        <div 
          onClick={() => setIsCollapsed(true)}
          className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs z-40 md:hidden print:hidden"
          aria-hidden="true"
        />
      )}

      <aside
        className={`bg-slate-900 text-white flex flex-col border-l border-slate-800 transition-all duration-300 z-50 print:hidden 
          fixed md:sticky top-0 h-screen overflow-hidden flex-shrink-0
          ${isCollapsed ? 'translate-x-full md:translate-x-0 md:w-18' : 'translate-x-0 w-64 shadow-2xl md:shadow-none'}
        `}
      >
        {/* Brand Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-2.5 overflow-hidden">
            <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center text-lg font-bold flex-shrink-0 shadow-md shadow-blue-500/30">
              💼
            </div>
            {!isCollapsed && (
              <div className="truncate">
                <h1 className="text-xs font-black tracking-tight text-white truncate">
                  {companyName}
                </h1>
                <span className="text-[10px] text-blue-400 font-mono block">
                  نظام الرواتب &bull; KWD
                </span>
              </div>
            )}
          </div>

          {/* Collapse / Close Toggle Button */}
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition flex-shrink-0"
            title={isCollapsed ? 'توسيع القائمة' : 'طي القائمة'}
          >
            {isCollapsed ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </button>
        </div>

        {/* Navigation List */}
        <nav className="flex-1 py-3 px-2 space-y-1.5 overflow-y-auto">
          
          {/* 1. Dashboard (Outside الرواتب) */}
          <button
            onClick={() => handleNavClick('dashboard')}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition group relative ${
              activeTab === 'dashboard'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                : 'text-slate-300 hover:bg-slate-800 hover:text-white'
            } ${isCollapsed ? 'justify-center' : 'justify-start'}`}
            title={isCollapsed ? 'لوحة التحكم' : undefined}
          >
            <LayoutDashboard className="w-4 h-4 flex-shrink-0" />
            {!isCollapsed && (
              <span className="truncate flex-1 text-right">لوحة التحكم</span>
            )}

            {isCollapsed && (
              <div className="absolute right-full mr-2 hidden group-hover:block bg-slate-800 text-white text-xs font-bold px-2.5 py-1 rounded-md whitespace-nowrap shadow-xl border border-slate-700 z-50 pointer-events-none">
                لوحة التحكم
              </div>
            )}
          </button>

          {/* SECTION: طباعة الشيكات البنكية (CBK) */}
          <div className="pt-1">
            {/* Header / Group Button for الشيكات */}
            <button
              onClick={() => {
                if (isCollapsed) {
                  setIsCollapsed(false);
                }
                handleNavClick('cheques');
                setExpandedSection((prev) => (prev === 'cheques' ? null : 'cheques'));
              }}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition group ${
                isChequesActive && expandedSection !== 'cheques'
                  ? 'bg-amber-600/30 text-amber-300 border border-amber-500/40'
                  : isChequesActive
                  ? 'bg-amber-950/40 text-amber-200 border border-amber-500/30'
                  : 'text-slate-200 hover:bg-slate-800/80'
              } ${isCollapsed ? 'justify-center' : ''}`}
              title="قسم طباعة الشيكات (CBK)"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <Landmark className={`w-4 h-4 flex-shrink-0 ${isChequesActive ? 'text-amber-400' : 'text-slate-400'}`} />
                {!isCollapsed && (
                  <span className="font-black tracking-wide text-xs text-slate-100">
                    طباعة الشيكات
                  </span>
                )}
                {!isCollapsed && (
                  <span className="text-[9px] bg-amber-500/30 text-amber-300 border border-amber-500/50 px-1.5 py-0.5 rounded-full font-bold">
                    CBK
                  </span>
                )}
              </div>

              {!isCollapsed && (
                <ChevronDown
                  className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${
                    expandedSection === 'cheques' ? 'rotate-180' : ''
                  }`}
                />
              )}
            </button>

            {/* Sub-items list of الشيكات */}
            {(!isCollapsed ? expandedSection === 'cheques' : isChequesActive) && (
              <div className={`space-y-1 mt-1 ${!isCollapsed ? 'mr-2 pr-2 border-r-2 border-amber-600/50' : ''}`}>
                {chequeSubItems.map((item) => {
                  const Icon = item.icon;
                  const isSubActive = activeTab === 'cheques' && (activeChequeSubTab === item.id || (!activeChequeSubTab && item.id === 'dashboard'));

                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        handleNavClick('cheques');
                        if (onSelectChequeSubTab) {
                          onSelectChequeSubTab(item.id);
                        }
                      }}
                      className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold transition group relative ${
                        isSubActive
                          ? 'bg-amber-600 text-white shadow-md shadow-amber-600/30'
                          : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                      } ${isCollapsed ? 'justify-center' : 'justify-between'}`}
                      title={isCollapsed ? item.label : undefined}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <Icon className={`w-3.5 h-3.5 flex-shrink-0 ${isSubActive ? 'text-white' : 'text-amber-400/80'}`} />
                        {!isCollapsed && (
                          <span className="truncate text-right">{item.label}</span>
                        )}
                      </div>

                      {!isCollapsed && item.badge && (
                        <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold ${
                          isSubActive
                            ? 'bg-amber-800/80 text-amber-200 border border-amber-400/40'
                            : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                        }`}>
                          {item.badge}
                        </span>
                      )}

                      {/* Tooltip for Collapsed State */}
                      {isCollapsed && (
                        <div className="absolute right-full mr-2 hidden group-hover:block bg-slate-800 text-white text-xs font-bold px-2.5 py-1 rounded-md whitespace-nowrap shadow-xl border border-slate-700 z-50 pointer-events-none">
                          {item.label}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* 2. SECTION / TAB: الرواتب (Contains Payroll, Receipts, Employees, Branches, Reports) */}
          <div className="pt-1">
            {/* Header / Group Button for الرواتب */}
            <button
              onClick={() => {
                if (isCollapsed) {
                  setIsCollapsed(false);
                }
                if (!isPayrollActive) {
                  handleNavClick('payroll');
                }
                setExpandedSection((prev) => (prev === 'payroll' ? null : 'payroll'));
              }}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition group ${
                isPayrollActive && expandedSection !== 'payroll'
                  ? 'bg-blue-600/30 text-blue-300 border border-blue-500/40'
                  : 'text-slate-200 hover:bg-slate-800/80'
              } ${isCollapsed ? 'justify-center' : ''}`}
              title="قسم الرواتب"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <WalletCards className={`w-4 h-4 flex-shrink-0 ${isPayrollActive ? 'text-blue-400' : 'text-slate-400'}`} />
                {!isCollapsed && (
                  <span className="font-black tracking-wide text-xs text-slate-100">
                    الرواتب
                  </span>
                )}
              </div>

              {!isCollapsed && (
                <ChevronDown
                  className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${
                    expandedSection === 'payroll' ? 'rotate-180' : ''
                  }`}
                />
              )}
            </button>

            {/* Sub-items list of الرواتب */}
            {(!isCollapsed ? expandedSection === 'payroll' : true) && (
              <div className={`space-y-1 mt-1 ${!isCollapsed ? 'mr-2 pr-2 border-r-2 border-slate-800' : ''}`}>
                {payrollSubItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeTab === item.id;

                  // Special sub-accordion for Reports inside Payroll section
                  if (item.id === 'reports') {
                    return (
                      <div key={item.id} className="space-y-0.5">
                        <button
                          onClick={() => {
                            handleNavClick('reports');
                            if (!isCollapsed) {
                              setReportsOpen(!reportsOpen);
                            }
                          }}
                          className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-bold transition group relative ${
                            isActive
                              ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                              : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                          } ${isCollapsed ? 'justify-center' : 'justify-between'}`}
                          title={isCollapsed ? item.label : undefined}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <Icon className="w-4 h-4 flex-shrink-0" />
                            {!isCollapsed && (
                              <span className="truncate text-right">{item.label}</span>
                            )}
                          </div>

                          {!isCollapsed && (
                            <div className="flex items-center gap-1.5">
                              {item.alertBadge && item.alertBadge > 0 && (
                                <span className="text-[10px] bg-amber-500 text-slate-950 px-1.5 py-0.2 rounded-full font-bold">
                                  {item.alertBadge}
                                </span>
                              )}
                              <ChevronDown
                                className={`w-3.5 h-3.5 text-slate-400 transition-transform ${
                                  reportsOpen ? 'rotate-180' : ''
                                }`}
                              />
                            </div>
                          )}

                          {/* Tooltip on collapsed hover */}
                          {isCollapsed && (
                            <div className="absolute right-full mr-2 hidden group-hover:block bg-slate-800 text-white text-xs font-bold px-2.5 py-1 rounded-md whitespace-nowrap shadow-xl border border-slate-700 z-50 pointer-events-none">
                              {item.label}
                            </div>
                          )}
                        </button>

                        {/* Sub-menu for Reports */}
                        {!isCollapsed && reportsOpen && (
                          <div className="mr-3 pr-2 border-r border-slate-700/70 space-y-1 pt-1 pb-1">
                            {REPORTS_SUB_ITEMS.map((sub) => {
                              const isSubActive = activeTab === 'reports' && activeReportId === sub.id;
                              const SubIcon = sub.icon;
                              return (
                                <button
                                  key={sub.id}
                                  onClick={() => {
                                    handleNavClick('reports');
                                    if (onSelectReportId) {
                                      onSelectReportId(sub.id);
                                    }
                                  }}
                                  className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold transition text-right ${
                                    isSubActive
                                      ? 'bg-blue-500/20 text-blue-300 font-bold border border-blue-500/40'
                                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                                  }`}
                                >
                                  <SubIcon className="w-3 h-3 flex-shrink-0 text-slate-400" />
                                  <span className="truncate">{sub.title}</span>
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  }

                  return (
                    <button
                      key={item.id}
                      onClick={() => handleNavClick(item.id)}
                      className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-bold transition group relative ${
                        isActive
                          ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                          : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                      } ${isCollapsed ? 'justify-center' : 'justify-start'}`}
                      title={isCollapsed ? item.label : undefined}
                    >
                      <Icon className="w-4 h-4 flex-shrink-0" />
                      {!isCollapsed && (
                        <span className="truncate flex-1 text-right">{item.label}</span>
                      )}

                      {!isCollapsed && item.badge && (
                        <span className="text-[9px] bg-emerald-500 text-white px-1.5 py-0.5 rounded-full font-bold">
                          {item.badge}
                        </span>
                      )}

                      {/* Tooltip on collapsed hover */}
                      {isCollapsed && (
                        <div className="absolute right-full mr-2 hidden group-hover:block bg-slate-800 text-white text-xs font-bold px-2.5 py-1 rounded-md whitespace-nowrap shadow-xl border border-slate-700 z-50 pointer-events-none">
                          {item.label}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Divider */}
          <div className="pt-2 pb-1 border-t border-slate-800/60" />

          {/* 3. Users (Outside الرواتب) */}
          <button
            onClick={() => handleNavClick('users')}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition group relative ${
              activeTab === 'users'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                : 'text-slate-300 hover:bg-slate-800 hover:text-white'
            } ${isCollapsed ? 'justify-center' : 'justify-start'}`}
            title={isCollapsed ? 'المستخدمون' : undefined}
          >
            <ShieldCheck className="w-4 h-4 flex-shrink-0" />
            {!isCollapsed && (
              <span className="truncate flex-1 text-right">المستخدمون</span>
            )}

            {isCollapsed && (
              <div className="absolute right-full mr-2 hidden group-hover:block bg-slate-800 text-white text-xs font-bold px-2.5 py-1 rounded-md whitespace-nowrap shadow-xl border border-slate-700 z-50 pointer-events-none">
                المستخدمون
              </div>
            )}
          </button>

          {/* 4. Settings (Outside الرواتب) */}
          <button
            onClick={() => handleNavClick('settings')}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition group relative ${
              activeTab === 'settings'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                : 'text-slate-300 hover:bg-slate-800 hover:text-white'
            } ${isCollapsed ? 'justify-center' : 'justify-start'}`}
            title={isCollapsed ? 'الإعدادات والتدقيق' : undefined}
          >
            <Settings className="w-4 h-4 flex-shrink-0" />
            {!isCollapsed && (
              <span className="truncate flex-1 text-right">الإعدادات والتدقيق</span>
            )}

            {isCollapsed && (
              <div className="absolute right-full mr-2 hidden group-hover:block bg-slate-800 text-white text-xs font-bold px-2.5 py-1 rounded-md whitespace-nowrap shadow-xl border border-slate-700 z-50 pointer-events-none">
                الإعدادات والتدقيق
              </div>
            )}
          </button>

        </nav>

        {/* Bottom User Area */}
        <div className="p-3 border-t border-slate-800 bg-slate-950/60 flex-shrink-0">
          <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'justify-between gap-2'}`}>
            {!isCollapsed && currentUser && (
              <div className="truncate text-right">
                <div className="text-xs font-bold text-white truncate">{currentUser.fullName}</div>
                <div className="text-[10px] text-blue-400 font-mono">
                  {currentUser.role === 'admin' ? 'مدير نظام (Admin)' : 'محاسب (Accountant)'}
                </div>
              </div>
            )}

            <button
              onClick={onLogout}
              className="p-2 text-slate-400 hover:text-red-400 hover:bg-slate-800 rounded-lg transition flex-shrink-0"
              title="تسجيل الخروج"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
