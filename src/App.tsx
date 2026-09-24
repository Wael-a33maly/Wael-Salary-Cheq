import { useState, useEffect, useMemo } from 'react';
import { AppHeader } from './components/AppHeader';
import { Sidebar } from './components/Sidebar';
import { DashboardView } from './components/DashboardView';
import { EmployeesView } from './components/EmployeesView';
import { BranchesView } from './components/BranchesView';
import { PayrollView } from './components/PayrollView';
import { ReceiptsPrintView } from './components/ReceiptsPrintView';
import { ReportsView } from './components/ReportsView';
import { UsersView } from './components/UsersView';
import { SettingsView } from './components/SettingsView';
import { HostingerGuideModal } from './components/HostingerGuideModal';
import { LoginView } from './components/LoginView';
import { ChequePrintingModule } from './components/cheques/ChequePrintingModule';
import { INITIAL_ISSUED_CHEQUES, INITIAL_BANK_ACCOUNTS } from './mockCheques';
import { BankReconciliationView } from './components/reconciliation/BankReconciliationView';
import { dbService } from './services/apiService';
import { 
  INITIAL_SETTINGS, 
  INITIAL_BRANCHES, 
  INITIAL_DEPARTMENTS, 
  INITIAL_EMPLOYEES, 
  INITIAL_USERS, 
  INITIAL_AUDIT_LOGS,
  INITIAL_SAVED_PAYROLLS,
  getResidenceStatus
} from './mockData';
import { 
  Branch, 
  Department, 
  Employee, 
  UserAccount, 
  CompanySettings, 
  AuditRecord, 
  MonthlyPayroll 
} from './types';

export default function App() {
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [chequeSubTab, setChequeSubTab] = useState<string>('dashboard');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isGuideOpen, setIsGuideOpen] = useState(false);
  const [activeReportId, setActiveReportId] = useState<number>(1);
  const [selectedReceiptMonthId, setSelectedReceiptMonthId] = useState<string | undefined>(undefined);
  const [selectedPayrollMonthId, setSelectedPayrollMonthId] = useState<string | undefined>(undefined);

  // Core application state
  const [settings, setSettings] = useState<CompanySettings>(() => {
    const saved = localStorage.getItem('payroll_settings');
    return saved ? JSON.parse(saved) : INITIAL_SETTINGS;
  });

  const [branches, setBranches] = useState<Branch[]>(() => {
    const saved = localStorage.getItem('payroll_branches');
    return saved ? JSON.parse(saved) : INITIAL_BRANCHES;
  });

  const [departments, setDepartments] = useState<Department[]>(() => {
    const saved = localStorage.getItem('payroll_departments');
    return saved ? JSON.parse(saved) : INITIAL_DEPARTMENTS;
  });

  const [employees, setEmployees] = useState<Employee[]>(() => {
    const saved = localStorage.getItem('payroll_employees');
    return saved ? JSON.parse(saved) : INITIAL_EMPLOYEES;
  });

  const [users, setUsers] = useState<UserAccount[]>(() => {
    const saved = localStorage.getItem('payroll_users');
    return saved ? JSON.parse(saved) : INITIAL_USERS;
  });

  const [auditLogs, setAuditLogs] = useState<AuditRecord[]>(() => {
    const saved = localStorage.getItem('payroll_audit_logs');
    return saved ? JSON.parse(saved) : INITIAL_AUDIT_LOGS;
  });

  // Saved monthly payrolls (cards)
  const [savedPayrolls, setSavedPayrolls] = useState<MonthlyPayroll[]>(() => {
    const saved = localStorage.getItem('payroll_saved_months');
    return saved ? JSON.parse(saved) : INITIAL_SAVED_PAYROLLS;
  });

  // Current authenticated user
  const [currentUser, setCurrentUser] = useState<{
    id: number;
    username: string;
    fullName: string;
    role: string;
  } | null>({
    id: 1,
    username: 'admin',
    fullName: 'المسؤول العام للنظام',
    role: 'admin',
  });

  // Save changes to localStorage for continuity
  useEffect(() => {
    localStorage.setItem('payroll_settings', JSON.stringify(settings));
  }, [settings]);

  useEffect(() => {
    localStorage.setItem('payroll_branches', JSON.stringify(branches));
  }, [branches]);

  useEffect(() => {
    localStorage.setItem('payroll_departments', JSON.stringify(departments));
  }, [departments]);

  useEffect(() => {
    localStorage.setItem('payroll_employees', JSON.stringify(employees));
  }, [employees]);

  useEffect(() => {
    localStorage.setItem('payroll_users', JSON.stringify(users));
  }, [users]);

  useEffect(() => {
    localStorage.setItem('payroll_audit_logs', JSON.stringify(auditLogs));
  }, [auditLogs]);

  useEffect(() => {
    localStorage.setItem('payroll_saved_months', JSON.stringify(savedPayrolls));
  }, [savedPayrolls]);

  // استرجاع البيانات الأولية من MySQL تلقائياً عند تشغيل النظام على الدومين
  useEffect(() => {
    dbService.fetchBootstrapData().then((data) => {
      if (!data) return;
      if (data.companySettings && data.companySettings.company_name) {
        setSettings((prev) => ({
          ...prev,
          companyName: data.companySettings.company_name || prev.companyName,
          overtimeRate: parseFloat(data.companySettings.overtime_multiplier) || prev.overtimeRate,
          residenceAlertDays: parseInt(data.companySettings.residency_alert_days, 10) || prev.residenceAlertDays,
          roundingStep: parseFloat(data.companySettings.rounding_step) || prev.roundingStep,
        }));
      }
      if (data.branches && data.branches.length > 0) {
        setBranches(data.branches.map((b: any) => ({
          id: parseInt(b.id, 10),
          name: b.name,
          code: b.code,
          status: b.status === 'inactive' ? 'inactive' : 'active',
          notes: b.notes || '',
        })));
      }
      if (data.departments && data.departments.length > 0) {
        setDepartments(data.departments.map((d: any) => ({
          id: parseInt(d.id, 10),
          branchId: parseInt(d.branch_id, 10),
          name: d.name,
          status: d.status === 'inactive' ? 'inactive' : 'active',
        })));
      }
      if (data.employees && data.employees.length > 0) {
        setEmployees(data.employees.map((e: any) => ({
          id: parseInt(e.id, 10),
          civilId: e.civil_id,
          fullName: e.name || e.full_name || '',
          branchId: parseInt(e.branch_id, 10),
          departmentId: parseInt(e.department_id, 10),
          basicSalary: parseFloat(e.basic_salary) || 0,
          dailyHours: parseInt(e.daily_work_hours, 10) || 8,
          bankName: e.bank_name || '',
          iban: e.iban || '',
          bankTransferAmount: parseFloat(e.bank_transfer_amount) || 0,
          residenceExpiryDate: e.residence_expiry_date || '',
          status: e.status === 'inactive' || e.status === 'suspended' || e.status === 'resigned' ? 'inactive' : 'active',
        })));
      }
    }).catch((err) => console.warn('App bootstrap from MySQL error:', err));
  }, []);

  // Log Audit Action helper
  const addAuditLog = (action: string, tableName: string, details: string) => {
    const newLog: AuditRecord = {
      id: Date.now(),
      username: currentUser?.username || 'admin',
      action,
      tableName,
      ipAddress: '127.0.0.1',
      details,
      createdAt: new Date().toISOString().replace('T', ' ').substring(0, 19),
    };
    setAuditLogs((prev) => [newLog, ...prev]);
  };

  // Branch handlers
  const handleAddBranch = (b: Partial<Branch>) => {
    const newBranch: Branch = {
      id: Date.now(),
      code: b.code || `BR-${branches.length + 1}`,
      name: b.name || 'فرع جديد',
      status: b.status || 'active',
      employeeCount: 0,
      totalSalary: 0,
    };
    setBranches((prev) => [...prev, newBranch]);
    addAuditLog('BRANCH_CREATE', 'branches', `إضافة فرع جديد: ${newBranch.name} (${newBranch.code})`);
  };

  const handleUpdateBranch = (id: number, b: Partial<Branch>) => {
    setBranches((prev) => prev.map((item) => (item.id === id ? { ...item, ...b } : item)));
    addAuditLog('BRANCH_UPDATE', 'branches', `تحديث بيانات الفرع رقم ${id}`);
  };

  const handleAddDepartment = (d: Partial<Department>) => {
    const newDept: Department = {
      id: Date.now(),
      branchId: d.branchId || 1,
      name: d.name || 'قسم جديد',
      status: d.status || 'active',
    };
    setDepartments((prev) => [...prev, newDept]);
    addAuditLog('DEPT_CREATE', 'departments', `إضافة قسم جديد: ${newDept.name}`);
  };

  // Employee handlers
  const handleAddEmployee = (emp: Partial<Employee>) => {
    const newEmp: Employee = {
      id: Date.now(),
      civilId: emp.civilId || '290000000000',
      fullName: emp.fullName || 'موظف جديد',
      branchId: emp.branchId || 1,
      departmentId: emp.departmentId || 1,
      basicSalary: emp.basicSalary || 350.000,
      dailyHours: emp.dailyHours || 11,
      bankName: emp.bankName || 'بنك الكويت الوطني (NBK)',
      iban: emp.iban || 'KW00NBOK0000000000000000000000',
      bankTransferAmount: emp.bankTransferAmount || 150.000,
      residenceExpiryDate: emp.residenceExpiryDate || '2027-01-01',
      status: emp.status || 'active',
    };
    setEmployees((prev) => [...prev, newEmp]);
    addAuditLog('EMPLOYEE_CREATE', 'employees', `إضافة موظف جديد: ${newEmp.fullName}`);
  };

  const handleUpdateEmployee = (id: number, emp: Partial<Employee>) => {
    setEmployees((prev) => prev.map((item) => (item.id === id ? { ...item, ...emp } : item)));
    addAuditLog('EMPLOYEE_UPDATE', 'employees', `تحديث بيانات الموظف: ${emp.fullName || id}`);
  };

  // User handlers
  const handleAddUser = (u: Partial<UserAccount>) => {
    const newUser: UserAccount = {
      id: Date.now(),
      username: u.username || 'user',
      fullName: u.fullName || 'مستخدم جديد',
      email: u.email || 'user@company.com',
      role: u.role || 'accountant',
      status: u.status || 'active',
      branchId: u.branchId || null,
      createdAt: new Date().toISOString().replace('T', ' ').substring(0, 19),
    };
    setUsers((prev) => [...prev, newUser]);
    addAuditLog('USER_CREATE', 'users', `إنشاء مستخدم جديد: ${newUser.username} (${newUser.role})`);
  };

  // Payroll save handler
  const handleSavePayroll = (payroll: MonthlyPayroll) => {
    setSavedPayrolls((prev) => {
      const idx = prev.findIndex((p) => p.id === payroll.id);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = payroll;
        return copy;
      }
      return [payroll, ...prev];
    });
    addAuditLog('PAYROLL_SAVE', 'payrolls', `حفظ مسير رواتب: ${payroll.monthName} ورقم السند ${payroll.voucherBaseNumber || '-'}`);
  };

  // Payroll delete handler
  const handleDeletePayroll = (id: string) => {
    const p = savedPayrolls.find((item) => item.id === id);
    const monthName = p?.monthName || id;
    setSavedPayrolls((prev) => prev.filter((item) => item.id !== id));
    addAuditLog('PAYROLL_DELETE', 'payrolls', `حذف كارت مسير الرواتب لشهر: ${monthName}`);
  };

  // Settings handler
  const handleUpdateSettings = (newSettings: CompanySettings) => {
    setSettings(newSettings);
    addAuditLog('SETTINGS_UPDATE', 'settings', 'تحديث إعدادات الشركة والمعاملات المالية');
  };

  // Urgent residency alerts count
  const residencyAlertCount = employees.filter((e) => {
    const st = getResidenceStatus(e.residenceExpiryDate, settings.residenceAlertDays);
    return st.category === 'expired' || st.category === 'under_30' || st.category === 'under_alert';
  }).length;

  // Cheque due date alerts based on settings.chequeDueDateAlertDays (default 7 days)
  const chequeDueDateAlertDays = settings.chequeDueDateAlertDays ?? 7;
  const upcomingCheques = useMemo(() => {
    try {
      const stored = localStorage.getItem('app_issued_cheques');
      const cheques = stored ? JSON.parse(stored) : INITIAL_ISSUED_CHEQUES;
      const today = new Date('2026-09-21');
      return cheques.filter((c: any) => {
        if (c.status !== 'issued') return false;
        const due = new Date(c.dueDate);
        const diffDays = Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        return diffDays >= -2 && diffDays <= chequeDueDateAlertDays;
      });
    } catch (e) {
      return [];
    }
  }, [settings.chequeDueDateAlertDays]);

  // If user is logged out, render the official Login page
  if (!currentUser) {
    return (
      <LoginView
        settings={settings}
        onLoginSuccess={(u) => {
          setCurrentUser(u);
          addAuditLog('LOGIN', 'users', `تسجيل دخول ناجح للمستخدم: ${u.username}`);
        }}
        onOpenGuide={() => setIsGuideOpen(true)}
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-100/70 text-slate-900 font-sans antialiased flex" dir="rtl">
      
      {/* Collapsible Vertical Navigation Sidebar */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={(tab) => {
          setActiveTab(tab);
          if (tab !== 'receipts') {
            setSelectedReceiptMonthId(undefined);
          }
        }}
        isCollapsed={isSidebarCollapsed}
        setIsCollapsed={setIsSidebarCollapsed}
        companyName={settings.companyName}
        currentUser={currentUser}
        residencyAlertCount={residencyAlertCount}
        activeReportId={activeReportId}
        onSelectReportId={(id) => setActiveReportId(id)}
        activeChequeSubTab={chequeSubTab}
        onSelectChequeSubTab={(sub) => {
          setActiveTab('cheques');
          setChequeSubTab(sub);
        }}
        onLogout={() => {
          addAuditLog('LOGOUT', 'users', `تسجيل خروج للمستخدم: ${currentUser.username}`);
          setCurrentUser(null);
        }}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        
        {/* Official Application Top Header */}
        <AppHeader
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          companyName={settings.companyName}
          currentUser={currentUser}
          residencyAlertCount={residencyAlertCount}
          upcomingCheques={upcomingCheques}
          onLogout={() => {
            addAuditLog('LOGOUT', 'users', `تسجيل خروج للمستخدم: ${currentUser.username}`);
            setCurrentUser(null);
          }}
          onToggleSidebar={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
          onSelectReportId={(id) => setActiveReportId(id)}
          onNavigateToCheques={(sub) => {
            setActiveTab('cheques');
            if (sub) setChequeSubTab(sub);
          }}
        />

        {/* Dynamic Main Workspace View */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8">
          {activeTab === 'dashboard' && (
            <DashboardView
              branches={branches}
              employees={employees}
              auditLogs={auditLogs}
              settings={settings}
              onNavigate={(tab) => setActiveTab(tab)}
            />
          )}

          {activeTab === 'cheques' && (
            <ChequePrintingModule
              activeSubTab={chequeSubTab}
              onSubTabChange={(sub) => setChequeSubTab(sub)}
              companyName={settings.companyName}
            />
          )}

          {activeTab === 'employees' && (
            <EmployeesView
              employees={employees}
              branches={branches}
              departments={departments}
              onAddEmployee={handleAddEmployee}
              onUpdateEmployee={handleUpdateEmployee}
            />
          )}

          {activeTab === 'branches' && (
            <BranchesView
              branches={branches}
              departments={departments}
              employees={employees}
              onAddBranch={handleAddBranch}
              onUpdateBranch={handleUpdateBranch}
              onAddDepartment={handleAddDepartment}
            />
          )}

          {activeTab === 'payroll' && (
            <PayrollView
              employees={employees}
              branches={branches}
              departments={departments}
              settings={settings}
              savedPayrolls={savedPayrolls}
              onSavePayroll={handleSavePayroll}
              onDeletePayroll={handleDeletePayroll}
              initialOpenPayrollId={selectedPayrollMonthId}
              onClearInitialOpenPayrollId={() => setSelectedPayrollMonthId(undefined)}
              onNavigateToPrint={(monthId) => {
                setSelectedReceiptMonthId(monthId);
                setActiveTab('receipts');
              }}
            />
          )}

          {activeTab === 'receipts' && (
            <ReceiptsPrintView
              payrolls={savedPayrolls}
              employees={employees}
              branches={branches}
              departments={departments}
              settings={settings}
              selectedMonthId={selectedReceiptMonthId}
              onUpdateVoucherBase={(payrollId, baseNumber) => {
                setSavedPayrolls((prev) =>
                  prev.map((p) => (p.id === payrollId ? { ...p, voucherBaseNumber: baseNumber } : p))
                );
              }}
            />
          )}

          {activeTab === 'reports' && (
            <ReportsView
              employees={employees}
              branches={branches}
              departments={departments}
              settings={settings}
              activeReportId={activeReportId}
              savedPayrolls={savedPayrolls}
              onViewPayroll={(payrollId) => {
                setSelectedPayrollMonthId(payrollId);
                setActiveTab('payroll');
              }}
            />
          )}

          {activeTab === 'users' && (
            <UsersView
              users={users}
              branches={branches}
              onAddUser={handleAddUser}
            />
          )}

          {activeTab === 'reconciliation' && (
            <BankReconciliationView
              currentUserName={currentUser?.fullName || 'المسؤول العام'}
            />
          )}

          {activeTab === 'settings' && (
            <SettingsView
              settings={settings}
              auditLogs={auditLogs}
              onUpdateSettings={handleUpdateSettings}
              onOpenGuide={() => setIsGuideOpen(true)}
            />
          )}
        </main>

        {/* App Footer */}
        <footer className="bg-white border-t border-slate-200 py-4 text-center text-xs text-slate-600 print:hidden mt-auto">
          <div className="max-w-7xl mx-auto px-4 flex items-center justify-center">
            <span className="font-sans font-bold">
              &copy; 2025 A33maly - جميع الحقوق محفوظة
            </span>
          </div>
        </footer>

      </div>

      {/* Deployment Guide Modal */}
      <HostingerGuideModal
        isOpen={isGuideOpen}
        onClose={() => setIsGuideOpen(false)}
      />

    </div>
  );
}
