import { useState, useEffect } from 'react';
import { 
  Bell, 
  AlertTriangle,
  Menu,
  Calculator,
  Printer,
  FileText,
  Landmark,
  ArrowUpRight,
  LayoutDashboard,
  Database,
  RefreshCw,
  Users,
  Building2,
  Settings,
  FileSpreadsheet,
  LogOut,
  UserCheck
} from 'lucide-react';
import { IssuedCheque } from '../types';
import { dbService } from '../services/apiService';

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
  const [dbConnected, setDbConnected] = useState<boolean>(false);
  const [dbStatusMessage, setDbStatusMessage] = useState<string>('جاري فحص الاتصال بقاعدة البيانات...');
  const [isCheckingDb, setIsCheckingDb] = useState<boolean>(false);

  const checkDb = async () => {
    setIsCheckingDb(true);
    try {
      const res = await dbService.checkConnection();
      setDbConnected(res.isConnected);
      setDbStatusMessage(res.message);
    } catch {
      setDbConnected(false);
      setDbStatusMessage('وضع التخزين المؤقت المحلي (تلقائي)');
    } finally {
      setIsCheckingDb(false);
    }
  };

  useEffect(() => {
    checkDb();
  }, []);

  const totalAlertCount = residencyAlertCount + upcomingCheques.length;

  const getTabInfo = (tab: string) => {
    switch (tab) {
      case 'dashboard': 
        return { 
          title: 'لوحة التحكم المالية', 
          subtitle: 'مؤشرات السيولة وحركات الشيكات والرواتب', 
          badge: 'نظرة شاملة',
          badgeClass: 'bg-blue-500/20 text-blue-300 border-blue-500/30'
        };
      case 'payroll': 
        return { 
          title: 'مسير الرواتب الشهري', 
          subtitle: 'احتساب الأجور والبدلات والاستقطاعات بدقة الفلس (0.001 د.ك)', 
          badge: 'دقة 0.001 د.ك',
          badgeClass: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
        };
      case 'receipts': 
        return { 
          title: 'طباعة الإيصالات والأظرف', 
          subtitle: 'سندات الصرف الرسمية وأظرف الرواتب الورقية', 
          badge: 'طباعة معتمدة',
          badgeClass: 'bg-teal-500/20 text-teal-300 border-teal-500/30'
        };
      case 'cheques': 
        return { 
          title: 'منظومة الشيكات المصرفية (CBK)', 
          subtitle: 'إصدار الشيكات المعتمدة ومتابعة تواريخ الاستحقاق', 
          badge: 'شيكات رسمية',
          badgeClass: 'bg-amber-500/20 text-amber-300 border-amber-500/30'
        };
      case 'employees': 
        return { 
          title: 'سجل وملفات الموظفين', 
          subtitle: 'بيانات العاملين، الحسابات البنكية، وتواريخ الإقامات', 
          badge: 'ملفات نشطة',
          badgeClass: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30'
        };
      case 'branches': 
        return { 
          title: 'الفروع والأقسام التنظيمية', 
          subtitle: 'الهيكل الإداري ومراكز التكلفة للفروع الأربعة', 
          badge: 'هيكل منظم',
          badgeClass: 'bg-purple-500/20 text-purple-300 border-purple-500/30'
        };
      case 'reconciliation': 
        return { 
          title: 'المطابقة والتسوية البنكية', 
          subtitle: 'مطابقة كشوف الحساب المصرفية واستخراج الفروقات آلياً', 
          badge: 'تسوية ذكية',
          badgeClass: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30'
        };
      case 'reports': 
        return { 
          title: 'مركز التقارير والتدقيق', 
          subtitle: 'التقارير المالية المجمعة، كشوف البنوك، والإقامات', 
          badge: 'تقارير مالية',
          badgeClass: 'bg-violet-500/20 text-violet-300 border-violet-500/30'
        };
      case 'users': 
        return { 
          title: 'إدارة المستخدمين والصلاحيات', 
          subtitle: 'حسابات المشرفين والمحاسبين وصلاحيات الوصول', 
          badge: 'أمان النظام',
          badgeClass: 'bg-slate-500/20 text-slate-300 border-slate-500/30'
        };
      case 'settings': 
        return { 
          title: 'الإعدادات والنسخ الاحتياطي', 
          subtitle: 'جدولة النسخ التلقائي، مسار صور الشيكات، وتصفير البيانات', 
          badge: 'إدارة المنظومة',
          badgeClass: 'bg-rose-500/20 text-rose-300 border-rose-500/30'
        };
      default: 
        return { 
          title: 'نظام إدارة الرواتب', 
          subtitle: 'المنظومة المالية والإدارية', 
          badge: 'A33maly',
          badgeClass: 'bg-blue-500/20 text-blue-300 border-blue-500/30'
        };
    }
  };

  const currentTabInfo = getTabInfo(activeTab);

  // Render contextual action buttons tailored specifically to the active tab
  const renderContextualActions = () => {
    switch (activeTab) {
      case 'payroll':
        return (
          <>
            <button
              type="button"
              onClick={() => setActiveTab('receipts')}
              className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-bold transition border bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white border-slate-700"
              title="طباعة إيصالات الصرف والأظرف الورقية"
            >
              <Printer className="w-3.5 h-3.5 text-emerald-400" />
              <span className="hidden md:inline">طباعة الإيصالات</span>
            </button>

            <button
              type="button"
              onClick={() => {
                onSelectReportId?.(1);
                setActiveTab('reports');
              }}
              className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-bold transition border bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white border-slate-700"
              title="التقرير المالي المجمع"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-blue-400" />
              <span className="hidden md:inline">تقرير الرواتب</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('dashboard')}
              className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded-lg text-xs font-bold transition border border-slate-700"
              title="الرجوع للوحة التحكم الرئيسية"
            >
              <LayoutDashboard className="w-3.5 h-3.5 text-slate-300" />
              <span className="hidden sm:inline">لوحة التحكم</span>
            </button>
          </>
        );

      case 'cheques':
        return (
          <>
            <button
              type="button"
              onClick={() => onNavigateToCheques?.('ledger')}
              className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-bold transition border bg-amber-500/20 text-amber-300 border-amber-500/40 hover:bg-amber-500/30"
              title="كشف حركة الشيكات المسجلة"
            >
              <Landmark className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden sm:inline">سجل الشيكات</span>
            </button>

            <button
              type="button"
              onClick={() => onNavigateToCheques?.('issue')}
              className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-bold transition border bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white border-slate-700"
              title="إصدار وطباعة شيك جديد"
            >
              <Calculator className="w-3.5 h-3.5 text-blue-400" />
              <span className="hidden md:inline">إصدار شيك</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('reconciliation')}
              className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-bold transition border bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white border-slate-700"
              title="مطابقة كشف الحساب البنكي"
            >
              <RefreshCw className="w-3.5 h-3.5 text-teal-400" />
              <span className="hidden md:inline">المطابقة البنكية</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('dashboard')}
              className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded-lg text-xs font-bold transition border border-slate-700"
            >
              <LayoutDashboard className="w-3.5 h-3.5 text-slate-300" />
              <span className="hidden sm:inline">لوحة التحكم</span>
            </button>
          </>
        );

      case 'receipts':
        return (
          <>
            <button
              type="button"
              onClick={() => setActiveTab('payroll')}
              className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-bold transition border bg-blue-600/30 text-blue-300 border-blue-500 hover:bg-blue-600/40"
              title="العودة لمسير الرواتب"
            >
              <Calculator className="w-3.5 h-3.5 text-blue-400" />
              <span className="hidden sm:inline">مسير الرواتب</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTab('cheques');
                onNavigateToCheques?.('dashboard');
              }}
              className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-bold transition border bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white border-slate-700"
            >
              <Landmark className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden md:inline">الشيكات المصرفية</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('dashboard')}
              className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded-lg text-xs font-bold transition border border-slate-700"
            >
              <LayoutDashboard className="w-3.5 h-3.5 text-slate-300" />
              <span className="hidden sm:inline">لوحة التحكم</span>
            </button>
          </>
        );

      case 'employees':
        return (
          <>
            <button
              type="button"
              onClick={() => setActiveTab('payroll')}
              className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-bold transition border bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white border-slate-700"
              title="احتساب مسير الرواتب"
            >
              <Calculator className="w-3.5 h-3.5 text-blue-400" />
              <span className="hidden sm:inline">مسير الرواتب</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('branches')}
              className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-bold transition border bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white border-slate-700"
              title="الفروع والأقسام"
            >
              <Building2 className="w-3.5 h-3.5 text-purple-400" />
              <span className="hidden md:inline">الفروع والأقسام</span>
            </button>

            {residencyAlertCount > 0 && (
              <button
                type="button"
                onClick={() => {
                  onSelectReportId?.(6);
                  setActiveTab('reports');
                }}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold transition border bg-rose-500/20 text-rose-300 border-rose-500/40 hover:bg-rose-500/30"
                title="تنبيهات الإقامات المنتهية"
              >
                <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
                <span className="hidden sm:inline">{residencyAlertCount} إقامات منتهية</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => setActiveTab('dashboard')}
              className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded-lg text-xs font-bold transition border border-slate-700"
            >
              <LayoutDashboard className="w-3.5 h-3.5 text-slate-300" />
              <span className="hidden sm:inline">لوحة التحكم</span>
            </button>
          </>
        );

      case 'branches':
        return (
          <>
            <button
              type="button"
              onClick={() => setActiveTab('employees')}
              className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-bold transition border bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white border-slate-700"
              title="سجل الموظفين"
            >
              <Users className="w-3.5 h-3.5 text-blue-400" />
              <span className="hidden sm:inline">سجل الموظفين</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('payroll')}
              className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-bold transition border bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white border-slate-700"
            >
              <Calculator className="w-3.5 h-3.5 text-emerald-400" />
              <span className="hidden md:inline">مسير الرواتب</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('dashboard')}
              className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded-lg text-xs font-bold transition border border-slate-700"
            >
              <LayoutDashboard className="w-3.5 h-3.5 text-slate-300" />
              <span className="hidden sm:inline">لوحة التحكم</span>
            </button>
          </>
        );

      case 'reconciliation':
        return (
          <>
            <button
              type="button"
              onClick={() => {
                setActiveTab('cheques');
                onNavigateToCheques?.('dashboard');
              }}
              className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-bold transition border bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white border-slate-700"
              title="منظومة الشيكات المصرفية"
            >
              <Landmark className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden sm:inline">الشيكات المصرفية</span>
            </button>

            <button
              type="button"
              onClick={() => {
                onSelectReportId?.(3);
                setActiveTab('reports');
              }}
              className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-bold transition border bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white border-slate-700"
              title="كشف التحويلات البنكية"
            >
              <FileText className="w-3.5 h-3.5 text-blue-400" />
              <span className="hidden md:inline">كشف البنوك</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('dashboard')}
              className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded-lg text-xs font-bold transition border border-slate-700"
            >
              <LayoutDashboard className="w-3.5 h-3.5 text-slate-300" />
              <span className="hidden sm:inline">لوحة التحكم</span>
            </button>
          </>
        );

      case 'reports':
        return (
          <>
            <button
              type="button"
              onClick={() => onSelectReportId?.(1)}
              className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-bold transition border bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white border-slate-700"
              title="التقرير المالي المجمع"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
              <span className="hidden sm:inline">التقرير المجمع</span>
            </button>

            <button
              type="button"
              onClick={() => onSelectReportId?.(3)}
              className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-bold transition border bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white border-slate-700"
              title="كشف التحويلات البنكية"
            >
              <Landmark className="w-3.5 h-3.5 text-blue-400" />
              <span className="hidden md:inline">كشف البنوك</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('dashboard')}
              className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded-lg text-xs font-bold transition border border-slate-700"
            >
              <LayoutDashboard className="w-3.5 h-3.5 text-slate-300" />
              <span className="hidden sm:inline">لوحة التحكم</span>
            </button>
          </>
        );

      case 'settings':
        return (
          <>
            <button
              type="button"
              onClick={() => setActiveTab('payroll')}
              className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-bold transition border bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white border-slate-700"
              title="مسير الرواتب"
            >
              <Calculator className="w-3.5 h-3.5 text-blue-400" />
              <span className="hidden md:inline">مسير الرواتب</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTab('cheques');
                onNavigateToCheques?.('dashboard');
              }}
              className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-bold transition border bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white border-slate-700"
            >
              <Landmark className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden sm:inline">الشيكات المصرفية</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('dashboard')}
              className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded-lg text-xs font-bold transition border border-slate-700"
            >
              <LayoutDashboard className="w-3.5 h-3.5 text-slate-300" />
              <span className="hidden sm:inline">لوحة التحكم</span>
            </button>
          </>
        );

      case 'users':
        return (
          <>
            <button
              type="button"
              onClick={() => setActiveTab('settings')}
              className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-bold transition border bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white border-slate-700"
              title="الإعدادات وقاعدة البيانات"
            >
              <Settings className="w-3.5 h-3.5 text-slate-300" />
              <span className="hidden sm:inline">الإعدادات</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('dashboard')}
              className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded-lg text-xs font-bold transition border border-slate-700"
            >
              <LayoutDashboard className="w-3.5 h-3.5 text-slate-300" />
              <span className="hidden sm:inline">لوحة التحكم</span>
            </button>
          </>
        );

      default: // dashboard
        return (
          <>
            <button
              type="button"
              onClick={() => setActiveTab('payroll')}
              className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-bold transition border bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white border-slate-700"
              title="مسير الرواتب الشهري"
            >
              <Calculator className="w-3.5 h-3.5 text-blue-400" />
              <span className="hidden sm:inline">مسير الرواتب</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTab('cheques');
                onNavigateToCheques?.('dashboard');
              }}
              className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-bold transition border bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white border-slate-700"
              title="طباعة وإدارة الشيكات المصرفية (CBK)"
            >
              <Landmark className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden sm:inline">الشيكات المصرفية</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('receipts')}
              className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-bold transition border bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white border-slate-700"
              title="طباعة الإيصالات والأظرف"
            >
              <Printer className="w-3.5 h-3.5 text-emerald-400" />
              <span className="hidden md:inline">الإيصالات والأظرف</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('reconciliation')}
              className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-bold transition border bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white border-slate-700"
              title="مطابقة كشف الحساب البنكي"
            >
              <RefreshCw className="w-3.5 h-3.5 text-teal-400" />
              <span className="hidden lg:inline">مطابقة البنك</span>
            </button>
          </>
        );
    }
  };

  return (
    <header className="bg-slate-900 text-white shadow-md sticky top-0 z-40 border-b border-slate-800 print:hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-2.5">
        <div className="flex items-center justify-between gap-3">
          
          {/* Right: Sidebar Toggle, Company Title & Adaptive Tab Info */}
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
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-sm sm:text-base font-black tracking-tight text-white">
                  {companyName}
                </h1>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 font-bold border border-blue-500/30">
                  د.ك KWD
                </span>

                {/* Adaptive Tab Badge */}
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold border hidden sm:inline-block ${currentTabInfo.badgeClass}`}>
                  {currentTabInfo.badge}
                </span>

                {/* Database Connectivity Status Indicator */}
                <button
                  type="button"
                  onClick={checkDb}
                  disabled={isCheckingDb}
                  className={`hidden md:inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold border transition cursor-pointer ${
                    dbConnected 
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 hover:bg-emerald-500/30' 
                      : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                  }`}
                  title={`${dbStatusMessage} (انقر لإعادة فحص الاتصال بـ MySQL)`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${dbConnected ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
                  <Database className="w-3 h-3" />
                  <span>{isCheckingDb ? 'فحص...' : dbConnected ? 'MySQL متصل' : 'تخزين محلي'}</span>
                  {isCheckingDb && <RefreshCw className="w-2.5 h-2.5 animate-spin" />}
                </button>
              </div>

              {/* Contextual Subtitle that adapts per Tab */}
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-xs font-black text-slate-200">
                  {currentTabInfo.title}
                </span>
                <span className="text-slate-600 text-xs hidden sm:inline">•</span>
                <span className="text-[11px] text-slate-400 hidden sm:inline truncate max-w-[280px] lg:max-w-none">
                  {currentTabInfo.subtitle}
                </span>
              </div>
            </div>
          </div>

          {/* Left: Context-Adaptive Actions & Notifications */}
          <div className="flex items-center gap-2">
            
            {/* Dynamic Actions for Active Tab */}
            {renderContextualActions()}

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

            {/* User Profile / Logout Button */}
            {currentUser && (
              <button
                type="button"
                onClick={onLogout}
                className="flex items-center gap-1.5 p-2 sm:px-2.5 sm:py-1.5 bg-slate-800 hover:bg-red-900/40 text-slate-300 hover:text-red-300 rounded-lg text-xs font-bold border border-slate-700 transition"
                title={`تسجيل الخروج (${currentUser.fullName})`}
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden xl:inline">{currentUser.username}</span>
              </button>
            )}

          </div>

        </div>
      </div>
    </header>
  );
}
