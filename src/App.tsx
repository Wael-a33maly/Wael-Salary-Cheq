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
      if (data.payrolls && data.payrolls.length > 0) {
        setSavedPayrolls(data.payrolls);
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
    // حفظ ومزامنة حية مباشرة في قاعدة بيانات MySQL
    dbService.savePayrollToDb(payroll).catch((err) => console.warn('Save payroll to MySQL warning:', err));
    addAuditLog('PAYROLL_SAVE', 'payrolls', `حفظ مسير رواتب: ${payroll.monthName} ورقم السند ${payroll.voucherBaseNumber || '-'}`);
  };

  // Payroll delete handler
  const handleDeletePayroll = (id: string) => {
    const p = savedPayrolls.find((item) => item.id === id);
    const monthName = p?.monthName || id;
    setSavedPayrolls((prev) => prev.filter((item) => item.id !== id));
    // حذف مباشر من قاعدة بيانات MySQL
    dbService.deletePayrollFromDb(id).catch((err) => console.warn('Delete payroll from MySQL warning:', err));
    addAuditLog('PAYROLL_DELETE', 'payrolls', `حذف كارت مسير الرواتب لشهر: ${monthName}`);
  };

  // Reset & Wipe Selected Data Handler
  const handleResetData = async (selectedKeys: string[], wipeRemoteDb: boolean, preserveChequeImages = true) => {
    const isAll = selectedKeys.includes('all');

    // 1. مسيرات وقسائم الرواتب
    if (isAll || selectedKeys.includes('payrolls')) {
      setSavedPayrolls([]);
      localStorage.removeItem('payroll_saved_months');
    }

    // 2. الموظفين
    if (isAll || selectedKeys.includes('employees')) {
      setEmployees([]);
      localStorage.removeItem('payroll_employees');
    }

    // 3. الفروع والأقسام
    if (isAll || selectedKeys.includes('branches_departments')) {
      setBranches([]);
      setDepartments([]);
      localStorage.removeItem('payroll_branches');
      localStorage.removeItem('payroll_departments');
    }

    // 4. الشيكات ودفاتر الشيكات
    if (isAll || selectedKeys.includes('cheques')) {
      localStorage.removeItem('app_issued_cheques');
      localStorage.removeItem('app_cheque_books');
    }

    // 5. الحسابات البنكية والمستفيدين
    if (isAll || selectedKeys.includes('bank_accounts_beneficiaries')) {
      if (preserveChequeImages) {
        // حماية صور وقوالب الشيكات والمسار المخصص لها عند إعادة التعيين
        try {
          const rawAccs = localStorage.getItem('app_bank_accounts');
          if (rawAccs) {
            const accs = JSON.parse(rawAccs);
            const preserved = accs.map((a: any) => ({
              ...a,
              currentBalance: 0,
            }));
            localStorage.setItem('app_bank_accounts', JSON.stringify(preserved));
          }
        } catch {}
      } else {
        localStorage.removeItem('app_bank_accounts');
      }
      localStorage.removeItem('app_beneficiaries');
    }

    // 6. جلسات مطابقة البنك
    if (isAll || selectedKeys.includes('reconciliation')) {
      localStorage.removeItem('rec_sessions');
      localStorage.removeItem('rec_settings');
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('rec_session_')) {
          localStorage.removeItem(key);
        }
      }
    }

    // 7. إعدادات المنشأة والطباعة
    if (isAll || selectedKeys.includes('settings')) {
      setSettings(INITIAL_SETTINGS);
      localStorage.removeItem('payroll_settings');
      localStorage.removeItem('app_cheque_print_settings');
    }

    // 8. سجل التدقيق
    if (isAll || selectedKeys.includes('audit_logs')) {
      setAuditLogs([]);
      localStorage.removeItem('payroll_audit_logs');
    }

    // تنفيذ الحذف عن بعد في قاعدة بيانات MySQL
    let remoteResult: any = null;
    if (wipeRemoteDb) {
      try {
        remoteResult = await dbService.resetDataInDb(selectedKeys, preserveChequeImages);
      } catch (e) {
        console.warn('Remote reset warning:', e);
      }
    }

    // تسجيل العملية في سجل التدقيق
    const resetDetails = `إعادة تعيين وحذف مخصص للبيانات: [${selectedKeys.join(', ')}] ${preserveChequeImages ? '(مع حماية صور الشيكات بالمسار المخصص)' : ''} ${wipeRemoteDb ? '(مع حذف MySQL)' : '(محلي فقط)'}`;
    if (!isAll && !selectedKeys.includes('audit_logs')) {
      addAuditLog('SYSTEM_RESET', 'system', resetDetails);
    } else {
      const initialLog: AuditRecord = {
        id: Date.now(),
        username: currentUser?.username || 'admin',
        action: 'FACTORY_RESET',
        tableName: 'system',
        ipAddress: '127.0.0.1',
        details: resetDetails,
        createdAt: new Date().toISOString().replace('T', ' ').substring(0, 19),
      };
      setAuditLogs([initialLog]);
      localStorage.setItem('payroll_audit_logs', JSON.stringify([initialLog]));
    }

    return remoteResult;
  };

  // Full Backup Restore Handler (استعادة كامل قاعدة البيانات وصور الشيكات)
  const handleRestoreBackup = async (backupData: any, restoreToRemoteDb = true): Promise<{ success: boolean; message: string }> => {
    if (!backupData) {
      return { success: false, message: 'بيانات ملف النسخة الاحتياطية فارغة أو غير صالحة' };
    }

    try {
      // 1. استعادة إعدادات الشركة
      if (backupData.tables?.settings && backupData.tables.settings.length > 0) {
        const s = backupData.tables.settings[0];
        const newSettings: CompanySettings = {
          ...settings,
          companyName: s.company_name || settings.companyName,
          overtimeRate: parseFloat(s.overtime_multiplier) || settings.overtimeRate,
          residenceAlertDays: parseInt(s.residency_alert_days, 10) || settings.residenceAlertDays,
          currency: s.currency || settings.currency,
          roundingStep: parseFloat(s.rounding_step) || settings.roundingStep,
          backupConfig: backupData.backupConfig || settings.backupConfig,
        };
        setSettings(newSettings);
        localStorage.setItem('payroll_settings', JSON.stringify(newSettings));
      } else if (backupData.settings) {
        setSettings(backupData.settings);
        localStorage.setItem('payroll_settings', JSON.stringify(backupData.settings));
      }

      // 2. استعادة الفروع
      if (backupData.tables?.branches) {
        const mappedBranches: Branch[] = backupData.tables.branches.map((b: any) => ({
          id: parseInt(b.id, 10),
          code: b.code || `B-${b.id}`,
          name: b.name,
          status: b.status || 'active',
          employeeCount: parseInt(b.employee_count, 10) || 0,
          totalSalary: parseFloat(b.total_salary) || 0,
        }));
        setBranches(mappedBranches);
        localStorage.setItem('payroll_branches', JSON.stringify(mappedBranches));
      } else if (backupData.branches) {
        setBranches(backupData.branches);
        localStorage.setItem('payroll_branches', JSON.stringify(backupData.branches));
      }

      // 3. استعادة الأقسام
      if (backupData.tables?.departments) {
        const mappedDepts: Department[] = backupData.tables.departments.map((d: any) => ({
          id: parseInt(d.id, 10),
          branchId: parseInt(d.branch_id, 10),
          name: d.name,
          status: d.status || 'active',
        }));
        setDepartments(mappedDepts);
        localStorage.setItem('payroll_departments', JSON.stringify(mappedDepts));
      } else if (backupData.departments) {
        setDepartments(backupData.departments);
        localStorage.setItem('payroll_departments', JSON.stringify(backupData.departments));
      }

      // 4. استعادة الموظفين
      if (backupData.tables?.employees) {
        const mappedEmps: Employee[] = backupData.tables.employees.map((e: any) => ({
          id: parseInt(e.id, 10),
          civilId: e.civil_id,
          fullName: e.name || e.full_name || '',
          branchId: parseInt(e.branch_id, 10),
          departmentId: parseInt(e.department_id, 10),
          basicSalary: parseFloat(e.basic_salary) || 0,
          dailyHours: parseInt(e.daily_hours, 10) || 8,
          bankName: e.bank_name || '',
          iban: e.iban || '',
          bankTransferAmount: parseFloat(e.bank_transfer_amount) || 0,
          residenceExpiryDate: e.residency_expiry || e.residence_expiry_date || '',
          status: e.status || 'active',
        }));
        setEmployees(mappedEmps);
        localStorage.setItem('payroll_employees', JSON.stringify(mappedEmps));
      } else if (backupData.employees) {
        setEmployees(backupData.employees);
        localStorage.setItem('payroll_employees', JSON.stringify(backupData.employees));
      }

      // 5. استعادة مسيرات الرواتب الشهرية
      if (backupData.tables?.monthly_payrolls) {
        const mappedPayrolls: MonthlyPayroll[] = backupData.tables.monthly_payrolls.map((p: any) => {
          let details: any = {};
          if (p.details_json) {
            try { details = JSON.parse(p.details_json); } catch {}
          }
          return {
            id: p.id,
            monthName: p.month_name,
            monthYear: p.month_year,
            voucherBaseNumber: parseInt(p.voucher_base_number, 10) || 1000,
            totalEmployees: parseInt(p.total_employees, 10) || 0,
            totalNetSalary: parseFloat(p.total_net_salary) || 0,
            totalCash: parseFloat(p.total_cash) || 0,
            totalBankTransfer: parseFloat(p.total_bank_transfer) || 0,
            totalAdvance: parseFloat(p.total_advance) || 0,
            totalOvertimeAmount: parseFloat(p.total_overtime_amount) || 0,
            totalAbsentAmount: parseFloat(p.total_absent_amount) || 0,
            status: p.status || 'draft',
            notes: p.notes || '',
            savedAt: p.saved_at || p.created_at || new Date().toISOString(),
            records: details.records || [],
            ...details,
          };
        });
        setSavedPayrolls(mappedPayrolls);
        localStorage.setItem('payroll_saved_months', JSON.stringify(mappedPayrolls));
      } else if (backupData.payrolls) {
        setSavedPayrolls(backupData.payrolls);
        localStorage.setItem('payroll_saved_months', JSON.stringify(backupData.payrolls));
      }

      // 6. استعادة الشيكات ودفاتر الشيكات والحسابات وقوالب وصور الشيكات
      if (backupData.tables?.issued_cheques) {
        localStorage.setItem('app_issued_cheques', JSON.stringify(backupData.tables.issued_cheques));
      } else if (backupData.issuedCheques) {
        localStorage.setItem('app_issued_cheques', JSON.stringify(backupData.issuedCheques));
      }

      if (backupData.tables?.cheque_books) {
        localStorage.setItem('app_cheque_books', JSON.stringify(backupData.tables.cheque_books));
      } else if (backupData.chequeBooks) {
        localStorage.setItem('app_cheque_books', JSON.stringify(backupData.chequeBooks));
      }

      if (backupData.tables?.bank_accounts) {
        const accs = backupData.tables.bank_accounts.map((a: any) => {
          const templates = (backupData.tables?.cheque_templates || []).filter((t: any) => t.bank_account_id === a.id);
          const defaultTpl = templates.find((t: any) => t.is_default) || templates[0];
          return {
            id: a.id,
            accountName: a.account_name,
            bankName: a.bank_name,
            bankCode: a.bank_code,
            accountNumber: a.account_number,
            iban: a.iban,
            branchName: a.branch_name,
            currency: a.currency,
            currentBalance: parseFloat(a.current_balance) || 0,
            isDefault: !!a.is_default,
            status: a.status,
            chequeImageUrl: defaultTpl?.cheque_image_url || a.cheque_image_url,
            chequeImageName: defaultTpl?.cheque_image_name || a.cheque_image_name,
            activeTemplateId: defaultTpl?.id,
            chequeTemplates: templates,
          };
        });
        localStorage.setItem('app_bank_accounts', JSON.stringify(accs));
      } else if (backupData.bankAccounts) {
        localStorage.setItem('app_bank_accounts', JSON.stringify(backupData.bankAccounts));
      }

      if (backupData.tables?.beneficiaries) {
        localStorage.setItem('app_beneficiaries', JSON.stringify(backupData.tables.beneficiaries));
      } else if (backupData.beneficiaries) {
        localStorage.setItem('app_beneficiaries', JSON.stringify(backupData.beneficiaries));
      }

      // استعادة لقاعدة بيانات MySQL في الاستضافة
      let remoteRes: any = null;
      if (restoreToRemoteDb) {
        try {
          remoteRes = await dbService.restoreBackup({ backupData });
        } catch (e) {
          console.warn('MySQL restore error:', e);
        }
      }

      addAuditLog('DATABASE_RESTORE', 'system', `تمت استعادة قاعدة البيانات والمنظومة وقوالب الشيكات بنجاح من نسخة: ${backupData.createdAt || 'تاريخ غير محدد'}`);

      return {
        success: true,
        message: 'تمت استعادة كافة البيانات وقاعدة بيانات MySQL وصور الشيكات بنجاح!',
      };
    } catch (err: any) {
      console.error('Restore error:', err);
      return { success: false, message: `فشل استعادة النسخة: ${err?.message || err}` };
    }
  };

  // Data counts summary for reset options
  const dataCounts = useMemo(() => {
    let chequesCount = 0;
    try {
      const c = localStorage.getItem('app_issued_cheques');
      if (c) chequesCount = JSON.parse(c).length;
    } catch {}

    let bankAccountsCount = 0;
    try {
      const b = localStorage.getItem('app_bank_accounts');
      if (b) bankAccountsCount = JSON.parse(b).length;
    } catch {}

    let recSessionsCount = 0;
    try {
      const s = localStorage.getItem('rec_sessions');
      if (s) recSessionsCount = JSON.parse(s).length;
    } catch {}

    return {
      payrolls: savedPayrolls.length,
      employees: employees.length,
      branches: branches.length,
      departments: departments.length,
      auditLogs: auditLogs.length,
      cheques: chequesCount,
      bankAccounts: bankAccountsCount,
      recSessions: recSessionsCount,
    };
  }, [savedPayrolls, employees, branches, departments, auditLogs]);

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
              dataCounts={dataCounts}
              onResetData={handleResetData}
              onRestoreBackup={handleRestoreBackup}
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
