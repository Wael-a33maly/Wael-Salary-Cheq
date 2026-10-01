import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
  Landmark,
  FileSpreadsheet,
  Upload,
  Play,
  Save,
  Lock,
  Download,
  Printer,
  Sliders,
  CheckCircle2,
  AlertCircle,
  Clock,
  ArrowRight,
  Filter,
  Search,
  PlusCircle,
  HelpCircle,
  ShieldCheck,
  RotateCcw,
  Percent,
  Check,
  Sparkles,
  RefreshCw,
  Building2,
  BookOpen,
  ArrowUpDown,
  Layers,
  ChevronDown,
  Database,
  Plus
} from 'lucide-react';
import {
  BankStatementTransaction,
  AccountingTransaction,
  BankReconciliationSession,
  ReconciliationDifference,
  ReconciliationJournalEntry,
  BankReconciliationSettings,
  UserReconciliationPermissions,
  ReconciliationSummary
} from '../../types/reconciliationTypes';
import { BankAccount } from '../../types';
import {
  DEFAULT_RECONCILIATION_SETTINGS,
  DEFAULT_PERMISSIONS,
  INITIAL_RECONCILIATION_SESSIONS,
  INITIAL_ACCOUNTING_TRANSACTIONS,
  SAMPLE_BANK_STATEMENT_TRANSACTIONS
} from '../../mockReconciliation';
import { executeReconciliationEngine, calculateReconciliationSummary } from '../../utils/reconciliationEngine';
import {
  exportReconciliationToExcel,
  triggerPrintReconciliationReport,
  downloadSampleBankExcel,
  downloadSampleAppExcel
} from '../../utils/reconciliationExport';
import { dbService } from '../../services/apiService';
import { ExcelImportModal } from './ExcelImportModal';
import { JournalEntryModal } from './JournalEntryModal';
import { ReconciliationSettingsModal } from './ReconciliationSettingsModal';
import { MatchStatusBadge } from './MatchStatusBadge';

// Standalone Bank Presets (independent from any active bank account in the app)
const STANDALONE_BANK_OPTIONS = [
  { name: 'البنك التجاري الكويتي (CBK)', defaultAcc: '0101-998234-01', defaultIban: 'KW82CBKU00000000000010199823401' },
  { name: 'بنك الكويت الوطني (NBK)', defaultAcc: '1020-554120-02', defaultIban: 'KW45NBOK00000000000010205541202' },
  { name: 'بيت التمويل الكويتي (KFH)', defaultAcc: '2030-778901-03', defaultIban: 'KW12KFH000000000000020307789013' },
  { name: 'بنك بوبيان (Boubyan Bank)', defaultAcc: '3040-112233-04', defaultIban: 'KW67BOUB000000000000304011223304' },
  { name: 'بنك الخليج (Gulf Bank)', defaultAcc: '4050-667788-05', defaultIban: 'KW90GULF000000000000405066778805' },
  { name: 'بنك وربة (Warba Bank)', defaultAcc: '5060-889900-06', defaultIban: 'KW33WARB000000000000506088990006' },
  { name: 'بنك برقان (Burgan Bank)', defaultAcc: '6070-223344-07', defaultIban: 'KW21BURG000000000000607022334407' },
  { name: 'البنك الأهلي الكويتي (ABK)', defaultAcc: '7080-445566-08', defaultIban: 'KW55ABKK000000000000708044556608' },
];

interface BankReconciliationViewProps {
  bankAccounts?: BankAccount[];
  currentUserName: string;
}

export function BankReconciliationView({
  bankAccounts,
  currentUserName,
}: BankReconciliationViewProps) {
  // 1. Settings & Permissions (stored locally and completely standalone)
  const [settings, setSettings] = useState<BankReconciliationSettings>(() => {
    const saved = localStorage.getItem('app_rec_settings');
    return saved ? JSON.parse(saved) : DEFAULT_RECONCILIATION_SETTINGS;
  });

  const [permissions, setPermissions] = useState<UserReconciliationPermissions>(() => {
    const saved = localStorage.getItem('app_rec_permissions');
    return saved ? JSON.parse(saved) : DEFAULT_PERMISSIONS;
  });

  // 2. Standalone Bank Profile (Decoupled from global active bank account)
  const [standaloneBankName, setStandaloneBankName] = useState<string>(() => {
    const saved = localStorage.getItem('app_rec_standalone_bank_name');
    return saved || settings.customBankName || 'البنك التجاري الكويتي (CBK)';
  });

  const [standaloneAccountNumber, setStandaloneAccountNumber] = useState<string>(() => {
    const saved = localStorage.getItem('app_rec_standalone_acc_num');
    return saved || settings.customAccountNumber || '0101-998234-01';
  });

  const [standaloneCurrency, setStandaloneCurrency] = useState<string>('KWD');

  // 3. Sessions
  const [sessions, setSessions] = useState<BankReconciliationSession[]>(() => {
    const saved = localStorage.getItem('app_rec_sessions');
    if (saved !== null) {
      try {
        const arr = JSON.parse(saved);
        if (Array.isArray(arr)) return arr;
      } catch {}
    }
    return [];
  });

  const [activeSessionId, setActiveSessionId] = useState<string>(() => {
    const saved = localStorage.getItem('app_rec_sessions');
    if (saved) {
      try {
        const arr = JSON.parse(saved);
        if (arr && arr.length > 0) return arr[0].id;
      } catch {}
    }
    return '';
  });

  const fallbackSession: BankReconciliationSession = useMemo(() => ({
    id: activeSessionId || 'rec-session-fresh',
    bankAccountId: 'acc-standalone',
    bankAccountName: standaloneBankName || 'البنك التجاري الكويتي (CBK)',
    bankAccountNumber: standaloneAccountNumber || '0101-998234-01',
    periodStart: new Date().toISOString().substring(0, 7) + '-01',
    periodEnd: new Date().toISOString().substring(0, 10),
    currency: 'KWD',
    openingBalanceBank: 0,
    closingBalanceBank: 0,
    openingBalanceAccounting: 0,
    closingBalanceAccounting: 0,
    status: 'draft',
    isMonthClosed: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }), [activeSessionId, standaloneBankName, standaloneAccountNumber]);

  const activeSession = useMemo(() => {
    return sessions.find((s) => s.id === activeSessionId) || sessions[0] || fallbackSession;
  }, [sessions, activeSessionId, fallbackSession]);

  // Working Period
  const [periodStart, setPeriodStart] = useState<string>(activeSession?.periodStart || '2026-09-01');
  const [periodEnd, setPeriodEnd] = useState<string>(activeSession?.periodEnd || '2026-09-30');

  // Input Opening / Closing Bank balances
  const [bankOpeningBal, setBankOpeningBal] = useState<number>(activeSession?.openingBalanceBank || 0);
  const [bankClosingBal, setBankClosingBal] = useState<number>(activeSession?.closingBalanceBank || 0);

  // 4. Working Transactions State (Bank statement and Application Ledger)
  const [bankTransactions, setBankTransactions] = useState<BankStatementTransaction[]>(() => {
    if (!activeSessionId) return [];
    const saved = localStorage.getItem(`app_rec_bank_tx_${activeSessionId}`);
    if (saved !== null) {
      try { return JSON.parse(saved); } catch {}
    }
    return [];
  });

  const [accountingTransactions, setAccountingTransactions] = useState<AccountingTransaction[]>(() => {
    if (!activeSessionId) return [];
    const saved = localStorage.getItem(`app_rec_acc_tx_${activeSessionId}`);
    if (saved !== null) {
      try { return JSON.parse(saved); } catch {}
    }
    return [];
  });

  const [differences, setDifferences] = useState<ReconciliationDifference[]>(() => {
    const saved = localStorage.getItem(`app_rec_diffs_${activeSessionId}`);
    return saved ? JSON.parse(saved) : [];
  });

  const [journalEntries, setJournalEntries] = useState<ReconciliationJournalEntry[]>(() => {
    const saved = localStorage.getItem(`app_rec_jvs_${activeSessionId}`);
    return saved ? JSON.parse(saved) : [];
  });

  // Database connection & live sync status
  const [dbConnected, setDbConnected] = useState<boolean>(false);
  const [dbSyncMessage, setDbSyncMessage] = useState<string>('جاري فحص الاتصال بقاعدة بيانات MySQL...');
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [lastSyncTime, setLastSyncTime] = useState<string>('');

  // UI Flow Stages (1 through 7)
  const [currentStage, setCurrentStage] = useState<number>(1);

  // الاستماع لحدث تصفير وإعادة تعيين البيانات الشاملة
  useEffect(() => {
    const handleResetEvent = (e: any) => {
      const keys = e.detail?.selectedKeys || [];
      const isAll = e.detail?.isAll || false;
      if (isAll || keys.includes('reconciliation')) {
        setSessions([]);
        setBankTransactions([]);
        setAccountingTransactions([]);
        setDifferences([]);
        setJournalEntries([]);
        setCurrentStage(1);
        setActiveSessionId('');
        setBankOpeningBal(0);
        setBankClosingBal(0);
        localStorage.setItem('app_rec_sessions', '[]');
      }
    };
    window.addEventListener('app_data_reset', handleResetEvent);
    return () => window.removeEventListener('app_data_reset', handleResetEvent);
  }, []);

  // دالة بدء دورة مطابقة جديدة
  const handleCreateNewSession = () => {
    const today = new Date();
    const ym = today.toISOString().substring(0, 7);
    const newId = `rec-session-${ym}-${Date.now().toString().slice(-4)}`;
    const newSession: BankReconciliationSession = {
      id: newId,
      bankAccountId: 'acc-standalone',
      bankAccountName: standaloneBankName || 'البنك التجاري الكويتي (CBK)',
      bankAccountNumber: standaloneAccountNumber || '0101-998234-01',
      periodStart: `${ym}-01`,
      periodEnd: today.toISOString().substring(0, 10),
      currency: 'KWD',
      openingBalanceBank: 0,
      closingBalanceBank: 0,
      openingBalanceAccounting: 0,
      closingBalanceAccounting: 0,
      status: 'draft',
      isMonthClosed: false,
      createdAt: today.toISOString(),
      updatedAt: today.toISOString(),
    };
    const updated = [newSession, ...sessions];
    setSessions(updated);
    setActiveSessionId(newId);
    setBankTransactions([]);
    setAccountingTransactions([]);
    setDifferences([]);
    setJournalEntries([]);
    setCurrentStage(1);
    localStorage.setItem('app_rec_sessions', JSON.stringify(updated));
  };

  // دالة تحميل بيانات نموذجية تجريبية للتوضيح
  const handleLoadDemoData = () => {
    const demoSession = INITIAL_RECONCILIATION_SESSIONS[0];
    setSessions(INITIAL_RECONCILIATION_SESSIONS);
    setActiveSessionId(demoSession.id);
    setBankTransactions(SAMPLE_BANK_STATEMENT_TRANSACTIONS);
    setAccountingTransactions(INITIAL_ACCOUNTING_TRANSACTIONS);
    setDifferences([]);
    setJournalEntries([]);
    setCurrentStage(1);
    localStorage.setItem('app_rec_sessions', JSON.stringify(INITIAL_RECONCILIATION_SESSIONS));
    localStorage.setItem(`app_rec_bank_tx_${demoSession.id}`, JSON.stringify(SAMPLE_BANK_STATEMENT_TRANSACTIONS));
    localStorage.setItem(`app_rec_acc_tx_${demoSession.id}`, JSON.stringify(INITIAL_ACCOUNTING_TRANSACTIONS));

    // حفظ تلقائي في قاعدة بيانات MySQL
    dbService.saveReconciliationSessionToDb(
      demoSession,
      SAMPLE_BANK_STATEMENT_TRANSACTIONS,
      INITIAL_ACCOUNTING_TRANSACTIONS,
      [],
      []
    ).catch((e) => console.warn('Could not save demo session to DB:', e));
  };

  // Update balances when active session changes
  useEffect(() => {
    if (activeSession) {
      setPeriodStart(activeSession.periodStart || '2026-09-01');
      setPeriodEnd(activeSession.periodEnd || '2026-09-30');
      setBankOpeningBal(activeSession.openingBalanceBank || 0);
      setBankClosingBal(activeSession.closingBalanceBank || 0);
    }
  }, [activeSession]);

  // Load session specific transactions when activeSessionId changes
  useEffect(() => {
    if (!activeSessionId) return;
    const bTx = localStorage.getItem(`app_rec_bank_tx_${activeSessionId}`);
    if (bTx) {
      try { setBankTransactions(JSON.parse(bTx)); } catch {}
    }
    const aTx = localStorage.getItem(`app_rec_acc_tx_${activeSessionId}`);
    if (aTx) {
      try { setAccountingTransactions(JSON.parse(aTx)); } catch {}
    }
    const diffs = localStorage.getItem(`app_rec_diffs_${activeSessionId}`);
    if (diffs) {
      try { setDifferences(JSON.parse(diffs)); } catch {}
    }
    const jvs = localStorage.getItem(`app_rec_jvs_${activeSessionId}`);
    if (jvs) {
      try { setJournalEntries(JSON.parse(jvs)); } catch {}
    }
  }, [activeSessionId]);

  const [diffFilterStatus, setDiffFilterStatus] = useState<string>('all');
  const [diffSearchQuery, setDiffSearchQuery] = useState<string>('');
  const [mainViewSubTab, setMainViewSubTab] = useState<'all' | 'differences' | 'matched' | 'import_center' | 'statement' | 'report'>('all');

  // مزامنة البيانات تلقائياً مع خادم وقاعدة بيانات MySQL عند فتح الصفحة أو تبديل الجلسة
  const syncWithDatabase = useCallback(async () => {
    setIsSyncing(true);
    try {
      const status = await dbService.checkConnection();
      setDbConnected(status.isConnected);
      setDbSyncMessage(status.message);

      if (status.isConnected) {
        setLastSyncTime(new Date().toLocaleTimeString('ar-KW'));
        const data = await dbService.fetchBootstrapData();
        if (data) {
          if (data.reconciliationSettings) {
            setSettings(data.reconciliationSettings);
          }
          if (Array.isArray(data.reconciliationSessions) && data.reconciliationSessions.length > 0) {
            setSessions(data.reconciliationSessions);
            if (!activeSessionId) {
              setActiveSessionId(data.reconciliationSessions[0].id);
            }
          }
        }

        // جلب حركات الجلسة المحددة من MySQL
        if (activeSessionId) {
          const details = await dbService.fetchSessionDetailsFromDb(activeSessionId);
          if (details) {
            if (Array.isArray(details.bankTransactions)) {
              setBankTransactions(details.bankTransactions);
            }
            if (Array.isArray(details.ledgerTransactions)) {
              setAccountingTransactions(details.ledgerTransactions);
            }
            if (Array.isArray(details.differences)) {
              setDifferences(details.differences);
            }
          }
        }
        setDbSyncMessage('مربوط بقاعدة بيانات MySQL المركزية على الدومين (مزامنة فورية)');
      }
    } catch (err) {
      console.warn('Reconciliation DB sync error:', err);
    } finally {
      setIsSyncing(false);
    }
  }, [activeSessionId]);

  // Modals state
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importTarget, setImportTarget] = useState<'bank' | 'app'>('bank');
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isJournalModalOpen, setIsJournalModalOpen] = useState(false);
  const [activeTxForJournal, setActiveTxForJournal] = useState<BankStatementTransaction | null>(null);
  const [activeDiffForJournal, setActiveDiffForJournal] = useState<ReconciliationDifference | null>(null);

  // Save to localStorage when updated & push to MySQL
  const saveStateToStorage = () => {
    localStorage.setItem('app_rec_standalone_bank_name', standaloneBankName);
    localStorage.setItem('app_rec_standalone_acc_num', standaloneAccountNumber);
    localStorage.setItem('app_rec_sessions', JSON.stringify(sessions));
    if (activeSessionId && activeSessionId !== 'rec-session-fresh') {
      localStorage.setItem(`app_rec_bank_tx_${activeSessionId}`, JSON.stringify(bankTransactions));
      localStorage.setItem(`app_rec_acc_tx_${activeSessionId}`, JSON.stringify(accountingTransactions));
      localStorage.setItem(`app_rec_diffs_${activeSessionId}`, JSON.stringify(differences));
      localStorage.setItem(`app_rec_jvs_${activeSessionId}`, JSON.stringify(journalEntries));
    }
    localStorage.setItem('app_rec_settings', JSON.stringify(settings));
    localStorage.setItem('app_rec_permissions', JSON.stringify(permissions));

    // حفظ فوري في قاعدة بيانات MySQL على الخادم / الدومين فقط إذا كانت هناك جلسات مسجلة ومفتوحة
    if (sessions.length > 0 && activeSession && activeSession.id !== 'rec-session-fresh') {
      dbService.saveReconciliationSessionToDb(
        activeSession,
        bankTransactions,
        accountingTransactions,
        differences,
        journalEntries
      ).then((saved) => {
        if (saved) {
          setLastSyncTime(new Date().toLocaleTimeString('ar-KW'));
          setDbConnected(true);
        }
      });
    }
  };

  // Re-calculate Summary dynamically without any hardcoded ghost balances
  const summary: ReconciliationSummary = useMemo(() => {
    let accClosing = 0;
    if (sessions.length > 0 && activeSession) {
      if (typeof activeSession.closingBalanceAccounting === 'number' && activeSession.closingBalanceAccounting !== 0) {
        accClosing = activeSession.closingBalanceAccounting;
      } else if (accountingTransactions.length > 0) {
        const netLedger = accountingTransactions.reduce((sum, tx) => sum + (tx.debit || 0) - (tx.credit || 0), 0);
        accClosing = (activeSession.openingBalanceAccounting || 0) + netLedger;
      }
    } else if (accountingTransactions.length > 0) {
      accClosing = accountingTransactions.reduce((sum, tx) => sum + (tx.debit || 0) - (tx.credit || 0), 0);
    }

    return calculateReconciliationSummary(
      bankClosingBal || 0,
      accClosing,
      bankTransactions,
      accountingTransactions,
      differences
    );
  }, [bankClosingBal, activeSession, sessions.length, bankTransactions, accountingTransactions, differences]);

  // Mask bank account helper
  const formatMaskedAccount = (accNum: string) => {
    if (!settings.maskBankAccountsInReports) return accNum;
    if (accNum.length <= 4) return accNum;
    return `******${accNum.slice(-4)}`;
  };

  // Open Import Modal with specified target
  const openImportModal = (target: 'bank' | 'app') => {
    setImportTarget(target);
    setIsImportModalOpen(true);
  };

  // Handle Bank Excel Import Completion
  const handleImportBankSuccess = (importedRows: BankStatementTransaction[]) => {
    setBankTransactions(importedRows);
    saveStateToStorage();
    setCurrentStage(3); // Jump to review stage
  };

  // Handle App Excel Import Completion
  const handleImportAppSuccess = (importedRows: AccountingTransaction[]) => {
    setAccountingTransactions(importedRows);
    saveStateToStorage();
    setCurrentStage(3); // Jump to review stage
  };

  // Quick reset to sample datasets
  const handleResetBankSample = () => {
    setBankTransactions(SAMPLE_BANK_STATEMENT_TRANSACTIONS);
    saveStateToStorage();
  };

  const handleResetAppSample = () => {
    setAccountingTransactions(INITIAL_ACCOUNTING_TRANSACTIONS);
    saveStateToStorage();
  };

  // Run Matching Algorithm (3 Levels with auto-difference extraction)
  const handleRunMatching = () => {
    const result = executeReconciliationEngine(
      bankTransactions,
      accountingTransactions,
      settings,
      activeSessionId,
      currentUserName
    );

    setBankTransactions(result.updatedBankTx);
    setAccountingTransactions(result.updatedAccTx);
    setDifferences(result.differences);
    setCurrentStage(4);
    setMainViewSubTab('all');
    saveStateToStorage();
  };

  // Close Difference as bank fee or adjustment directly (no threshold restriction!)
  const handleQuickCloseFee = (diff: ReconciliationDifference) => {
    const newJv: ReconciliationJournalEntry = {
      id: `jv-quick-${Date.now()}`,
      sessionId: activeSessionId,
      entryNumber: `JV-AUTO-${Math.floor(1000 + Math.random() * 9000)}`,
      entryDate: diff.transactionDate,
      bankAccountId: 'standalone-acc',
      counterAccountId: settings.bankFeeExpenseAccountId,
      counterAccountName: settings.bankFeeExpenseAccountName,
      amount: diff.differenceValue,
      entryType: 'bank_fee',
      referenceNumber: diff.referenceNumber || 'AUTO-DIFF',
      description: `تسوية وإقفال الفرق المستخرج آلياً (${diff.description || 'عمولة بنكية'})`,
      createdBy: currentUserName,
      createdAt: new Date().toISOString(),
      sourceTxId: diff.id,
      status: 'posted',
    };

    setJournalEntries((prev) => [newJv, ...prev]);

    setDifferences((prev) =>
      prev.map((d) =>
        d.id === diff.id
          ? {
              ...d,
              processingStatus: 'closed_as_fee',
              journalEntryNumber: newJv.entryNumber,
              actionTakenNotes: `تم إقفال الفرق آلياً بحساب ${settings.bankFeeExpenseAccountName}`,
            }
          : d
      )
    );

    saveStateToStorage();
  };

  // Save Custom Journal Entry
  const handleSaveCustomJournalEntry = (jv: ReconciliationJournalEntry) => {
    setJournalEntries((prev) => [jv, ...prev]);

    if (activeDiffForJournal) {
      setDifferences((prev) =>
        prev.map((d) =>
          d.id === activeDiffForJournal.id
            ? {
                ...d,
                processingStatus: 'resolved',
                journalEntryNumber: jv.entryNumber,
                actionTakenNotes: `تمت التسوية بقيد ${jv.entryNumber}`,
              }
            : d
        )
      );
    }

    if (activeTxForJournal) {
      setBankTransactions((prev) =>
        prev.map((b) =>
          b.id === activeTxForJournal.id
            ? {
                ...b,
                matchStatus: 'matched',
                actionTakenNotes: `تم إنشاء قيد محاسبي ${jv.entryNumber}`,
              }
            : b
        )
      );
    }

    saveStateToStorage();
  };

  // Close Month Action
  const handleCloseMonth = () => {
    if (!permissions.canCloseMonth) {
      alert('عذراً، ليس لديك صلاحية إغلاق الشهر');
      return;
    }

    if (!summary.isBalanced) {
      const confirmClose = window.confirm(
        `تنبيه: التسوية غير متوازنة ويوجد فرق بقيمة (${summary.netDifference.toFixed(
          3
        )} د.ك).\nهل ترغب في المتابعة وتوليد رمز التسوية؟`
      );
      if (!confirmClose) return;
    }

    const token = `REC-${new Date().getFullYear()}${(new Date().getMonth() + 1)
      .toString()
      .padStart(2, '0')}-${Math.floor(1000 + Math.random() * 9000)}`;

    const updatedSessions = sessions.map((s) =>
      s.id === activeSessionId
        ? {
            ...s,
            isMonthClosed: true,
            reconciliationToken: token,
            closedAt: new Date().toISOString(),
            closedBy: currentUserName,
          }
        : s
    );

    setSessions(updatedSessions);
    saveStateToStorage();
    setCurrentStage(7);
  };

  // Reopen Month
  const handleReopenMonth = () => {
    if (!permissions.canReopenMonth) {
      alert('عذراً، يتطلب إعادة فتح الشهر صلاحية المدير المالي');
      return;
    }

    const confirmReopen = window.confirm('هل أنت متأكد من إعادة فتح هذا الشهر للتعديل؟');
    if (!confirmReopen) return;

    const updatedSessions = sessions.map((s) =>
      s.id === activeSessionId
        ? {
            ...s,
            isMonthClosed: false,
            reconciliationToken: undefined,
            closedAt: undefined,
            closedBy: undefined,
          }
        : s
    );

    setSessions(updatedSessions);
    saveStateToStorage();
  };

  // Calculation for totals
  const bankDebitTotal = useMemo(() => bankTransactions.reduce((acc, t) => acc + (t.debit || 0), 0), [bankTransactions]);
  const bankCreditTotal = useMemo(() => bankTransactions.reduce((acc, t) => acc + (t.credit || 0), 0), [bankTransactions]);
  const appDebitTotal = useMemo(() => accountingTransactions.reduce((acc, t) => acc + (t.debit || 0), 0), [accountingTransactions]);
  const appCreditTotal = useMemo(() => accountingTransactions.reduce((acc, t) => acc + (t.credit || 0), 0), [accountingTransactions]);

  const STAGES = [
    { num: 1, title: 'إعداد الحساب والفترة' },
    { num: 2, title: 'رفع إكسيل البنك والتطبيق' },
    { num: 3, title: 'مراجعة وتدقيق البيانات' },
    { num: 4, title: 'المطابقة التلقائية الذكية' },
    { num: 5, title: 'معالجة الفروقات المستخرجة' },
    { num: 6, title: 'اعتماد العمولات والقيود' },
    { num: 7, title: 'التسوية وإغلاق الشهر' },
  ];

  return (
    <div className="space-y-6 pb-16 print:p-0 print:m-0" dir="rtl">
      
      {/* شريط حالة الاتصال والمزامنة الفورية بقاعدة بيانات MySQL على الدومين */}
      <div className={`p-3.5 rounded-2xl border flex flex-wrap items-center justify-between gap-3 text-xs font-sans print:hidden shadow-2xs transition ${
        dbConnected 
          ? 'bg-emerald-50/90 border-emerald-200 text-emerald-950' 
          : 'bg-slate-50 border-slate-200 text-slate-700'
      }`}>
        <div className="flex items-center gap-3">
          <span className={`w-3 h-3 rounded-full shrink-0 ${dbConnected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-400'}`} />
          <div className="flex items-center gap-2">
            <Database className={`w-4 h-4 ${dbConnected ? 'text-emerald-600' : 'text-slate-500'}`} />
            <span className="font-bold">
              {dbConnected ? '🟢 متصل بقاعدة بيانات MySQL المركزية على الدومين (مزامنة فورية لكافة الحركات والتسويات)' : '💾 وضع التخزين المحلي (تلقائي)'}
            </span>
            <span className="text-[11px] text-slate-500 hidden md:inline">
              — {dbSyncMessage}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {lastSyncTime && (
            <span className="text-[11px] text-slate-500 font-mono">
              آخر مزامنة: {lastSyncTime}
            </span>
          )}
          <button
            type="button"
            onClick={syncWithDatabase}
            disabled={isSyncing}
            className="flex items-center gap-1.5 px-3 py-1 bg-white hover:bg-slate-100 text-slate-700 font-bold rounded-xl border border-slate-300 shadow-2xs transition text-[11px] disabled:opacity-50"
            title="مزامنة فورية مع قاعدة بيانات MySQL"
          >
            <RefreshCw className={`w-3 h-3 ${isSyncing ? 'animate-spin text-emerald-600' : ''}`} />
            <span>{isSyncing ? 'جاري المزامنة...' : 'مزامنة مع MySQL'}</span>
          </button>
        </div>
      </div>

      {/* Top Banner / Session Header */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 print:hidden">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-600 flex items-center justify-center text-white shadow-md shadow-emerald-500/20">
              <Landmark className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-black text-slate-900">مطابقة البنك Bank Reconciliation</h2>
                <span className="bg-emerald-100 text-emerald-800 text-[11px] font-black px-2.5 py-0.5 rounded-full">
                  تبويب مستقل تماماً
                </span>
                {activeSession.isMonthClosed ? (
                  <span className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-800 text-xs px-2.5 py-0.5 rounded-full font-bold">
                    <Lock className="w-3.5 h-3.5" />
                    <span>الشهر مغلق ({activeSession.reconciliationToken})</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 bg-amber-100 text-amber-800 text-xs px-2.5 py-0.5 rounded-full font-bold">
                    <Clock className="w-3.5 h-3.5" />
                    <span>جلسة مفتوحة للتعديل</span>
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                مقارنة كشف حساب البنك بدفاتر التطبيق عبر ملفات Excel مستقلة واستخراج الفروقات تلقائياً بدون قيود.
              </p>
            </div>
          </div>

          {/* Action Toolbar */}
          <div className="flex flex-wrap items-center gap-2">
            
            {/* New Session Button */}
            <button
              onClick={handleCreateNewSession}
              className="px-3.5 py-2.5 rounded-xl font-bold text-xs flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white transition shadow-xs"
              title="بدء دورة مطابقة بنكية جديدة"
            >
              <Plus className="w-4 h-4" />
              <span>دورة جديدة</span>
            </button>

            {/* Run Match */}
            <button
              onClick={handleRunMatching}
              disabled={activeSession.isMonthClosed}
              className={`px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 shadow-xs transition ${
                activeSession.isMonthClosed
                  ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                  : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-500/20'
              }`}
            >
              <Play className="w-4 h-4 fill-white" />
              <span>بدء المطابقة الآلية الذكية</span>
            </button>

            {/* Upload Modal button */}
            <button
              onClick={() => openImportModal('bank')}
              disabled={activeSession.isMonthClosed || !permissions.canImport}
              className={`px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 border transition ${
                activeSession.isMonthClosed
                  ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'
                  : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-300'
              }`}
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
              <span>استيراد ملفات Excel</span>
            </button>

            {/* Save Session */}
            <button
              onClick={() => {
                saveStateToStorage();
                alert('تم حفظ جلسة المطابقة المستقلة بنجاح');
              }}
              className="px-3.5 py-2.5 rounded-xl font-bold text-xs flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 transition"
              title="حفظ التغييرات"
            >
              <Save className="w-4 h-4" />
              <span>حفظ</span>
            </button>

            {/* Close / Reopen Month */}
            {activeSession.isMonthClosed ? (
              <button
                onClick={handleReopenMonth}
                className="px-3.5 py-2.5 rounded-xl font-bold text-xs flex items-center gap-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 transition"
              >
                <RotateCcw className="w-4 h-4" />
                <span>إعادة فتح الشهر</span>
              </button>
            ) : (
              <button
                onClick={handleCloseMonth}
                className="px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-1.5 bg-slate-900 hover:bg-slate-800 text-white shadow-xs transition"
              >
                <Lock className="w-4 h-4" />
                <span>إغلاق الشهر</span>
              </button>
            )}

            {/* Export Dropdown / Buttons */}
            <button
              onClick={() => exportReconciliationToExcel(activeSession, summary, bankTransactions, accountingTransactions, differences)}
              className="p-2.5 rounded-xl bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 text-slate-700 transition border border-slate-200"
              title="تصدير إلى Excel"
            >
              <Download className="w-4 h-4" />
            </button>

            <button
              onClick={triggerPrintReconciliationReport}
              className="p-2.5 rounded-xl bg-slate-100 hover:bg-blue-50 hover:text-blue-700 text-slate-700 transition border border-slate-200"
              title="طباعة تقرير التسوية أو الحفظ كـ PDF"
            >
              <Printer className="w-4 h-4" />
            </button>

            {/* Settings */}
            <button
              onClick={() => setIsSettingsModalOpen(true)}
              className="p-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition border border-slate-200"
              title="إعدادات الحساب المستقل والفروقات"
            >
              <Sliders className="w-4 h-4" />
            </button>

          </div>

        </div>

        {/* Stepper Progress Bar (المراحل السبعة) */}
        <div className="mt-6 pt-5 border-t border-slate-200 overflow-x-auto">
          <div className="flex items-center justify-between min-w-[700px] gap-2">
            {STAGES.map((s) => {
              const isPast = currentStage > s.num;
              const isCurrent = currentStage === s.num;
              return (
                <button
                  key={s.num}
                  onClick={() => setCurrentStage(s.num)}
                  className={`flex items-center gap-2 group text-right flex-1 transition ${
                    isCurrent
                      ? 'text-emerald-700 font-black'
                      : isPast
                      ? 'text-emerald-600 font-bold'
                      : 'text-slate-400 font-medium hover:text-slate-600'
                  }`}
                >
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center text-xs flex-shrink-0 font-bold transition ${
                      isCurrent
                        ? 'bg-emerald-600 text-white ring-4 ring-emerald-100'
                        : isPast
                        ? 'bg-emerald-700 text-white'
                        : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    {isPast ? <Check className="w-4 h-4" /> : s.num}
                  </div>
                  <div className="truncate text-xs">
                    <span className="block truncate text-[11px] font-sans">{s.title}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

      </div>

      {/* STAGE 1: المعايير، الحساب البنكي المستقل، والأرصدة */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 print:hidden">
        
        {/* Card 1: Independent Bank Account Selection */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-1">
            <label className="block text-xs font-bold text-slate-700">البنك والحساب المستهدف:</label>
            <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded-md font-bold">مستقل</span>
          </div>
          
          <select
            value={standaloneBankName}
            onChange={(e) => {
              const chosen = STANDALONE_BANK_OPTIONS.find((b) => b.name === e.target.value);
              setStandaloneBankName(e.target.value);
              if (chosen) {
                setStandaloneAccountNumber(chosen.defaultAcc);
              }
            }}
            disabled={activeSession.isMonthClosed}
            className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2 text-xs font-bold text-slate-900 focus:ring-2 focus:ring-emerald-500 mb-2"
          >
            {STANDALONE_BANK_OPTIONS.map((b) => (
              <option key={b.name} value={b.name}>{b.name}</option>
            ))}
          </select>

          <div className="flex items-center gap-1.5">
            <input
              type="text"
              value={standaloneAccountNumber}
              onChange={(e) => setStandaloneAccountNumber(e.target.value)}
              disabled={activeSession.isMonthClosed}
              placeholder="رقم الحساب / الآيبان"
              className="w-full bg-slate-50 border border-slate-300 rounded-lg p-1.5 text-xs font-mono font-bold text-slate-800"
            />
          </div>
        </div>

        {/* Card 2: Period & Currency */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <label className="block text-xs font-bold text-slate-700 mb-1">فترة المطابقة والعملة:</label>
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={periodStart}
              onChange={(e) => setPeriodStart(e.target.value)}
              disabled={activeSession.isMonthClosed}
              className="w-1/2 bg-slate-50 border border-slate-300 rounded-xl p-2 text-xs font-mono text-slate-800"
            />
            <span className="text-slate-400 text-xs">إلى</span>
            <input
              type="date"
              value={periodEnd}
              onChange={(e) => setPeriodEnd(e.target.value)}
              disabled={activeSession.isMonthClosed}
              className="w-1/2 bg-slate-50 border border-slate-300 rounded-xl p-2 text-xs font-mono text-slate-800"
            />
          </div>
          <div className="mt-2 flex items-center justify-between text-[11px] font-bold">
            <span className="text-slate-500">العملة:</span>
            <select
              value={standaloneCurrency}
              onChange={(e) => setStandaloneCurrency(e.target.value)}
              className="bg-slate-50 border border-slate-300 rounded-md px-2 py-0.5 text-xs font-bold text-emerald-800"
            >
              <option value="KWD">دينار كويتي (KWD)</option>
              <option value="SAR">ريال سعودي (SAR)</option>
              <option value="AED">درهم إماراتي (AED)</option>
              <option value="USD">دولار أمريكي (USD)</option>
              <option value="EUR">يورو (EUR)</option>
            </select>
          </div>
        </div>

        {/* Card 3: Opening Balance */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <label className="block text-xs font-bold text-slate-700 mb-1">الرصيد الافتتاحي (كشف البنك):</label>
          <div className="relative">
            <input
              type="number"
              step="0.001"
              value={bankOpeningBal}
              onChange={(e) => setBankOpeningBal(parseFloat(e.target.value) || 0)}
              disabled={activeSession.isMonthClosed}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2 text-xs font-mono font-bold text-slate-900 text-left pl-12"
            />
            <span className="absolute left-2.5 top-2 text-xs font-bold text-slate-400">د.ك</span>
          </div>
          <div className="mt-2 text-[10px] text-emerald-700 font-semibold">
            مطابق للرصيد الختامي للشهر السابق
          </div>
        </div>

        {/* Card 4: Closing Balance */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <label className="block text-xs font-bold text-slate-700 mb-1">الرصيد الختامي (كشف البنك):</label>
          <div className="relative">
            <input
              type="number"
              step="0.001"
              value={bankClosingBal}
              onChange={(e) => setBankClosingBal(parseFloat(e.target.value) || 0)}
              disabled={activeSession.isMonthClosed}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2 text-xs font-mono font-black text-emerald-900 text-left pl-12"
            />
            <span className="absolute left-2.5 top-2 text-xs font-bold text-slate-400">د.ك</span>
          </div>
          <div className="mt-2 flex items-center justify-between text-[10px]">
            <span className="text-slate-500">رصيد الأستاذ: {summary.accountingClosingBalance.toFixed(3)} د.ك</span>
            <span className={summary.isBalanced ? 'text-emerald-700 font-bold' : 'text-red-600 font-bold'}>
              {summary.isBalanced ? 'متوازن ✅' : `فرق: ${summary.netDifference.toFixed(3)}`}
            </span>
          </div>
        </div>

      </div>

      {/* DUAL EXCEL IMPORT CENTER (مركز رفع كشف البنك ودفاتر التطبيق) */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-850 to-slate-900 text-white rounded-2xl p-5 shadow-lg border border-slate-800 print:hidden">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between pb-4 border-b border-slate-800 gap-3">
          <div>
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-amber-400" />
              <h3 className="text-sm font-black text-white">
                مركز استيراد ملفات Excel للمطابقة المستقلة (Dual Data Center)
              </h3>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              قم برفع كشف حساب البنك من جهة ودفاتر حركات التطبيق من جهة أخرى للبدء بالمطابقة التلقائية بدون وسيط.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleRunMatching}
              className="bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black text-xs px-4 py-2 rounded-xl shadow-md transition flex items-center gap-1.5"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>بدء المقارنة التلقائية</span>
            </button>
          </div>
        </div>

        {/* Two Import Columns */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
          
          {/* Card 1: Bank Excel Statement */}
          <div className="bg-slate-800/80 rounded-xl p-4 border border-emerald-500/30 flex flex-col justify-between space-y-4">
            <div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                    <Building2 className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-white">1. كشف حساب البنك (Bank Statement)</h4>
                    <span className="text-[10px] text-slate-400">ملف الإكسيل المصرفي المستخرج من البنك</span>
                  </div>
                </div>
                <span className="bg-emerald-500/20 text-emerald-300 text-[11px] font-mono font-bold px-2 py-0.5 rounded-md">
                  {bankTransactions.length} حركة
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-slate-700/60 text-xs font-mono">
                <div>
                  <span className="text-[10px] text-slate-400 block font-sans">إجمالي السحب (مدين):</span>
                  <span className="text-red-400 font-bold">{bankDebitTotal.toFixed(3)} د.ك</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block font-sans">إجمالي الإيداع (دائن):</span>
                  <span className="text-emerald-400 font-bold">{bankCreditTotal.toFixed(3)} د.ك</span>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-700/60">
              <button
                onClick={() => openImportModal('bank')}
                className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold py-2 px-3 rounded-lg shadow-xs transition flex items-center justify-center gap-1.5"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>رفع إكسيل كشف البنك</span>
              </button>

              <button
                onClick={downloadSampleBankExcel}
                className="bg-slate-700 hover:bg-slate-600 text-slate-200 text-[11px] font-bold py-2 px-3 rounded-lg transition flex items-center gap-1"
                title="تحميل نموذج كشف البنك بصيغة Excel"
              >
                <Download className="w-3 h-3" />
                <span>النموذج</span>
              </button>

              <button
                onClick={handleResetBankSample}
                className="bg-slate-700 hover:bg-slate-600 text-slate-300 text-[11px] font-bold p-2 rounded-lg transition"
                title="استعادة عينة البنك النموذجية للتجربة"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Card 2: App / Accounting Excel */}
          <div className="bg-slate-800/80 rounded-xl p-4 border border-blue-500/30 flex flex-col justify-between space-y-4">
            <div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center">
                    <BookOpen className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-white">2. دفاتر وحركات التطبيق (App Ledger)</h4>
                    <span className="text-[10px] text-slate-400">ملف حركات الأستاذ العام وقيود التطبيق</span>
                  </div>
                </div>
                <span className="bg-blue-500/20 text-blue-300 text-[11px] font-mono font-bold px-2 py-0.5 rounded-md">
                  {accountingTransactions.length} حركة
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-slate-700/60 text-xs font-mono">
                <div>
                  <span className="text-[10px] text-slate-400 block font-sans">إجمالي المقبوض (مدين):</span>
                  <span className="text-emerald-400 font-bold">{appDebitTotal.toFixed(3)} د.ك</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block font-sans">إجمالي المدفوع (دائن):</span>
                  <span className="text-red-400 font-bold">{appCreditTotal.toFixed(3)} د.ك</span>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-700/60">
              <button
                onClick={() => openImportModal('app')}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold py-2 px-3 rounded-lg shadow-xs transition flex items-center justify-center gap-1.5"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>رفع إكسيل حركات التطبيق</span>
              </button>

              <button
                onClick={downloadSampleAppExcel}
                className="bg-slate-700 hover:bg-slate-600 text-slate-200 text-[11px] font-bold py-2 px-3 rounded-lg transition flex items-center gap-1"
                title="تحميل نموذج حركات التطبيق بصيغة Excel"
              >
                <Download className="w-3 h-3" />
                <span>النموذج</span>
              </button>

              <button
                onClick={handleResetAppSample}
                className="bg-slate-700 hover:bg-slate-600 text-slate-300 text-[11px] font-bold p-2 rounded-lg transition"
                title="استعادة عينة التطبيق النموذجية للتجربة"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

        </div>

        {/* Auto Difference Extraction Notice */}
        <div className="mt-4 pt-3 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-300 gap-2">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>
              <strong>محرك الاستخراج الذكي:</strong> يستخرج النظام تلقائياً كافة الفروقات الصغيرة والكبيرة بدون قيود مسبقة مع توفير زر لإقفالها كعمولة أو قيد بنقرة واحدة.
            </span>
          </div>

          <div className="text-emerald-400 font-bold">
            جاهزية المقارنة: {bankTransactions.length > 0 && accountingTransactions.length > 0 ? 'مكتملة 100%' : 'بانتظار رفع الملفات'}
          </div>
        </div>

      </div>

      {/* EQUATION BAROMETER / التسوية المصرفية الرياضية الحية */}
      <div className="bg-white rounded-2xl p-5 shadow-xs border border-slate-200">
        
        <div className="flex flex-col md:flex-row items-center justify-between pb-4 border-b border-slate-200 gap-4">
          <div>
            <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-emerald-600" />
              <span>مذكرة التسوية البنكية المصرفية الحية (Live Reconciliation Barometer)</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              تطبيق معادلة التسوية القياسية: الرصيد المعدل للبنك مقابل الرصيد المعدل للدفاتر المحاسبية
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className={`px-4 py-2 rounded-xl text-xs font-black flex items-center gap-2 border ${
              summary.isBalanced
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200 shadow-2xs'
                : 'bg-red-50 text-red-700 border-red-200 shadow-2xs'
            }`}>
              {summary.isBalanced ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>التسوية متوازنة بالكامل (0.000 د.ك)</span>
                </>
              ) : (
                <>
                  <AlertCircle className="w-4 h-4 text-red-600" />
                  <span>غير متوازن - يوجد فرق: {summary.netDifference.toFixed(3)} د.ك</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* 4 Metric Boxes */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4">
          
          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
            <span className="text-[11px] text-slate-500 block font-semibold">رصيد كشف البنك الفعلي</span>
            <div className="text-base font-black font-mono text-slate-900 mt-1">
              {summary.bankClosingBalance.toFixed(3)} <span className="text-xs text-slate-400">د.ك</span>
            </div>
            <span className="text-[10px] text-emerald-700 block mt-1">حسب كشف الحساب المصرفي</span>
          </div>

          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
            <span className="text-[11px] text-slate-500 block font-semibold">شيكات صادرة لم تصرف</span>
            <div className="text-base font-black font-mono text-amber-600 mt-1">
              -{summary.unpresentedChequesTotal.toFixed(3)} <span className="text-xs text-slate-400">د.ك</span>
            </div>
            <span className="text-[10px] text-amber-700 block mt-1">تخصم من رصيد البنك</span>
          </div>

          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
            <span className="text-[11px] text-slate-500 block font-semibold">عمولات وفروقات غير مسجلة</span>
            <div className="text-base font-black font-mono text-purple-600 mt-1">
              {summary.totalBankFees.toFixed(3)} <span className="text-xs text-slate-400">د.ك</span>
            </div>
            <span className="text-[10px] text-purple-700 block mt-1">مستخرجة آلياً للمعالجة</span>
          </div>

          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
            <span className="text-[11px] text-slate-500 block font-semibold">الرصيد المعدل للبنك</span>
            <div className="text-base font-black font-mono text-emerald-600 mt-1">
              {summary.adjustedBankBalance.toFixed(3)} <span className="text-xs text-slate-400">د.ك</span>
            </div>
            <span className="text-[10px] text-emerald-700 block mt-1">
              {summary.isBalanced ? 'مطابق لدفاتر المحاسبة 100%' : 'يتطلب معالجة الفروقات'}
            </span>
          </div>

        </div>

      </div>

      {/* Main Working Tabs (All, Matched, Differences, etc.) */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        
        {/* Navigation Sub-Tabs */}
        <div className="flex border-b border-slate-200 bg-slate-50 px-4 pt-3 gap-2 overflow-x-auto print:hidden">
          
          <button
            onClick={() => setMainViewSubTab('all')}
            className={`px-4 py-2 text-xs font-bold rounded-t-xl transition flex items-center gap-1.5 ${
              mainViewSubTab === 'all'
                ? 'bg-white text-emerald-700 border-t-2 border-r border-l border-emerald-600 -mb-px'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span>عرض المقارنة الشامل (جانب إلى جانب)</span>
            <span className="bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded-full text-[10px]">
              {bankTransactions.length + accountingTransactions.length}
            </span>
          </button>

          <button
            onClick={() => setMainViewSubTab('differences')}
            className={`px-4 py-2 text-xs font-bold rounded-t-xl transition flex items-center gap-1.5 ${
              mainViewSubTab === 'differences'
                ? 'bg-white text-red-600 border-t-2 border-r border-l border-red-600 -mb-px'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span>سجل الفروقات المستخرجة آلياً</span>
            {differences.length > 0 && (
              <span className="bg-red-100 text-red-700 px-1.5 py-0.5 rounded-full text-[10px] font-bold">
                {differences.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setMainViewSubTab('matched')}
            className={`px-4 py-2 text-xs font-bold rounded-t-xl transition flex items-center gap-1.5 ${
              mainViewSubTab === 'matched'
                ? 'bg-white text-emerald-600 border-t-2 border-r border-l border-emerald-600 -mb-px'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span>الحركات المتطابقة ({summary.totalMatchedCount})</span>
          </button>

          <button
            onClick={() => setMainViewSubTab('statement')}
            className={`px-4 py-2 text-xs font-bold rounded-t-xl transition flex items-center gap-1.5 ${
              mainViewSubTab === 'statement'
                ? 'bg-white text-purple-600 border-t-2 border-r border-l border-purple-600 -mb-px'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span>كشف البنك المستورد ({bankTransactions.length})</span>
          </button>

          <button
            onClick={() => setMainViewSubTab('report')}
            className={`px-4 py-2 text-xs font-bold rounded-t-xl transition flex items-center gap-1.5 ${
              mainViewSubTab === 'report'
                ? 'bg-white text-slate-900 border-t-2 border-r border-l border-slate-900 -mb-px'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span>تقرير التسوية الشهرية للطباعة</span>
          </button>

        </div>

        {/* CONTENT 1: SIDE-BY-SIDE COMPARISON (كشف البنك مقابل المحاسبة) */}
        {mainViewSubTab === 'all' && (
          <div className="p-4 space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between text-xs text-slate-500 pb-2 gap-2">
              <span className="font-bold text-slate-700">
                مقارنة كشف حساب البنك (اليمين) بحركات دفاتر التطبيق (اليسار):
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => openImportModal('bank')}
                  className="text-emerald-700 hover:underline text-xs font-bold flex items-center gap-1"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>تحديث كشف البنك</span>
                </button>
                <span className="text-slate-300">|</span>
                <button
                  onClick={() => openImportModal('app')}
                  className="text-blue-700 hover:underline text-xs font-bold flex items-center gap-1"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>تحديث دفاتر التطبيق</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              
              {/* Column 1: Bank Transactions */}
              <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
                <div className="bg-slate-100 px-3.5 py-2.5 border-b border-slate-200 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-emerald-600" />
                    <span className="font-bold text-xs text-slate-800">حركات كشف حساب البنك ({standaloneBankName})</span>
                  </div>
                  <span className="text-[11px] font-mono font-bold text-slate-600">
                    {bankTransactions.length} حركة
                  </span>
                </div>

                <div className="overflow-x-auto max-h-96">
                  <table className="w-full text-right text-xs">
                    <thead className="bg-slate-50 text-slate-600 font-bold sticky top-0 border-b border-slate-200">
                      <tr>
                        <th className="p-2">التاريخ</th>
                        <th className="p-2">المرجع</th>
                        <th className="p-2">البيان</th>
                        <th className="p-2 text-center">المبلغ</th>
                        <th className="p-2 text-center">الحالة</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-mono">
                      {bankTransactions.map((b) => (
                        <tr key={b.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="p-2 font-sans font-bold text-slate-800 text-[11px]">{b.transactionDate}</td>
                          <td className="p-2 text-emerald-700 font-semibold text-[11px]">{b.referenceNumber}</td>
                          <td className="p-2 font-sans text-slate-700 truncate max-w-[140px]" title={b.description}>
                            {b.description}
                          </td>
                          <td className="p-2 text-center font-black">
                            <span className={b.credit > 0 ? 'text-emerald-600' : 'text-red-600'}>
                              {Math.abs(b.netAmount).toFixed(3)}
                            </span>
                          </td>
                          <td className="p-2 text-center font-sans">
                            <MatchStatusBadge status={b.matchStatus} level={b.matchedLevel} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Column 2: Accounting Transactions */}
              <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
                <div className="bg-slate-100 px-3.5 py-2.5 border-b border-slate-200 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-blue-600" />
                    <span className="font-bold text-xs text-slate-800">حركات دفاتر وحسابات التطبيق</span>
                  </div>
                  <span className="text-[11px] font-mono font-bold text-slate-600">
                    {accountingTransactions.length} حركة
                  </span>
                </div>

                <div className="overflow-x-auto max-h-96">
                  <table className="w-full text-right text-xs">
                    <thead className="bg-slate-50 text-slate-600 font-bold sticky top-0 border-b border-slate-200">
                      <tr>
                        <th className="p-2">التاريخ</th>
                        <th className="p-2">رقم القيد/المرجع</th>
                        <th className="p-2">البيان والطرف</th>
                        <th className="p-2 text-center">المبلغ</th>
                        <th className="p-2 text-center">الحالة</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-mono">
                      {accountingTransactions.map((a) => (
                        <tr key={a.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="p-2 font-sans font-bold text-slate-800 text-[11px]">{a.entryDate}</td>
                          <td className="p-2 text-blue-700 font-semibold text-[11px]">{a.journalEntryNumber || a.referenceNumber}</td>
                          <td className="p-2 font-sans text-slate-700 truncate max-w-[140px]" title={a.description}>
                            {a.description}
                          </td>
                          <td className="p-2 text-center font-black">
                            <span className={a.debit > 0 ? 'text-emerald-600' : 'text-red-600'}>
                              {Math.abs(a.netAmount).toFixed(3)}
                            </span>
                          </td>
                          <td className="p-2 text-center font-sans">
                            <MatchStatusBadge status={a.matchStatus} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>
          </div>
        )}

        {/* CONTENT 2: DIFFERENCES SECTION (سجل الفروقات المستخرجة آلياً) */}
        {mainViewSubTab === 'differences' && (
          <div className="p-4 space-y-4">
            
            {/* Auto-extraction Banner */}
            <div className="bg-linear-to-r from-emerald-50 via-teal-50 to-emerald-50 border border-emerald-300 rounded-xl p-3.5 flex items-start gap-3 shadow-2xs">
              <Sparkles className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
              <div className="text-xs">
                <span className="font-bold text-emerald-950 block text-xs mb-0.5">
                  تم استخراج {differences.length} فروقات تلقائياً بواسطة المحرك الذكي (بدون اشتراط سقف أو حد مسبق)
                </span>
                <p className="text-emerald-800 text-[11px] leading-relaxed">
                  يقوم المحرك الذكي باكتشاف كافة الفروقات الصغيرة (مثل عمولات نقاط البيع KNET وفروقات الفلس) والفروقات المحاسبية الكبيرة تلقائياً. يمكنك بنقرة زر واحدة إقفال أي فرق مباشرة كعمولة أو إنشاء قيد تسوية.
                </p>
              </div>
            </div>

            {/* Filter Bar */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <Search className="w-4 h-4 text-slate-400 flex-shrink-0" />
                <input
                  type="text"
                  placeholder="بحث برقم المرجع، البيان، المبلغ..."
                  value={diffSearchQuery}
                  onChange={(e) => setDiffSearchQuery(e.target.value)}
                  className="bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs text-slate-800 focus:ring-2 focus:ring-emerald-500 w-full sm:w-64"
                />
              </div>

              <div className="flex items-center gap-2">
                <Filter className="w-3.5 h-3.5 text-slate-400" />
                <span className="text-xs text-slate-600 font-bold">تصفية:</span>
                <select
                  value={diffFilterStatus}
                  onChange={(e) => setDiffFilterStatus(e.target.value)}
                  className="bg-white border border-slate-300 rounded-lg px-2.5 py-1 text-xs font-medium focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="all">كافة الفروقات</option>
                  <option value="pending">معلقة وتحتاج معالجة</option>
                  <option value="closed_as_fee">تم إقفالها كعمولة</option>
                  <option value="resolved">تمت التسوية بنجاح</option>
                </select>
              </div>
            </div>

            {/* Differences Table */}
            <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs">
                  <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                    <tr>
                      <th className="p-3">التاريخ</th>
                      <th className="p-3">المرجع</th>
                      <th className="p-3">البيان والسبب المستخرج</th>
                      <th className="p-3 text-center">مبلغ البنك</th>
                      <th className="p-3 text-center">مبلغ المحاسبة</th>
                      <th className="p-3 text-center">قيمة الفرق</th>
                      <th className="p-3 text-center">الحالة</th>
                      <th className="p-3 text-center">الإجراء المتاح</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-mono">
                    {differences.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="p-8 text-center text-slate-500 font-sans">
                          لا توجد فروقات مسجلة حالياً. اضغط على زر &quot;بدء المطابقة الآلية الذكية&quot; لاكتشاف واستخراج الفروقات.
                        </td>
                      </tr>
                    ) : (
                      differences.map((d) => {
                        return (
                          <tr key={d.id} className="hover:bg-slate-50 transition-colors">
                            <td className="p-3 font-sans font-bold text-slate-800">{d.transactionDate}</td>
                            <td className="p-3 text-emerald-700 font-semibold">{d.referenceNumber}</td>
                            <td className="p-3 font-sans text-slate-700 max-w-xs">
                              <span className="font-bold block text-slate-900">{d.description}</span>
                              <span className="text-[11px] text-slate-500">{d.cause}</span>
                            </td>
                            <td className="p-3 text-center text-slate-800 font-bold">{d.bankAmount.toFixed(3)}</td>
                            <td className="p-3 text-center text-slate-800 font-bold">{d.accountingAmount.toFixed(3)}</td>
                            <td className="p-3 text-center font-black text-red-600 bg-red-50/50">
                              {d.differenceValue.toFixed(3)} د.ك
                            </td>
                            <td className="p-3 text-center font-sans">
                              {d.processingStatus === 'closed_as_fee' ? (
                                <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-bold">
                                  مقفل كعمولة ✅
                                </span>
                              ) : d.processingStatus === 'resolved' ? (
                                <span className="text-[10px] bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full font-bold">
                                  تمت التسوية
                                </span>
                              ) : (
                                <span className="text-[10px] bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full font-bold">
                                  فرق مستخرج آلياً
                                </span>
                              )}
                            </td>
                            <td className="p-3 text-center font-sans">
                              <div className="flex items-center justify-center gap-1.5">
                                
                                {/* Quick Close directly without threshold gating! */}
                                {d.processingStatus === 'pending' && (
                                  <button
                                    onClick={() => handleQuickCloseFee(d)}
                                    disabled={activeSession.isMonthClosed}
                                    className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold shadow-2xs transition flex items-center gap-1"
                                    title="إقفال فوري كعمولة بنكية بحساب المصروفات"
                                  >
                                    <Percent className="w-3 h-3" />
                                    <span>إقفال كعمولة</span>
                                  </button>
                                )}

                                {/* Create General Journal Entry */}
                                <button
                                  onClick={() => {
                                    setActiveDiffForJournal(d);
                                    setActiveTxForJournal(null);
                                    setIsJournalModalOpen(true);
                                  }}
                                  disabled={activeSession.isMonthClosed}
                                  className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 text-[11px] font-bold transition flex items-center gap-1"
                                >
                                  <PlusCircle className="w-3 h-3 text-emerald-600" />
                                  <span>قيد محاسبي</span>
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        )}

        {/* CONTENT 3: MATCHED TRANSACTIONS */}
        {mainViewSubTab === 'matched' && (
          <div className="p-4 space-y-4">
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 flex items-center gap-2 text-xs text-emerald-800 font-bold">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>
                إجمالي الحركات المتطابقة بنجاح: {summary.totalMatchedCount} حركة بقيمة إجمالية {summary.totalMatchedAmount.toFixed(3)} د.ك
              </span>
            </div>

            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <table className="w-full text-right text-xs font-mono">
                <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                  <tr>
                    <th className="p-3 font-sans">تاريخ البنك</th>
                    <th className="p-3">مرجع البنك</th>
                    <th className="p-3 font-sans">البيان</th>
                    <th className="p-3 text-center">المبلغ (د.ك)</th>
                    <th className="p-3">رقم القيد المقابل</th>
                    <th className="p-3 font-sans text-center">مستوى المطابقة</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {bankTransactions
                    .filter((b) => b.matchStatus === 'matched' || b.matchStatus === 'partial_match')
                    .map((b) => {
                      const matchedAcc = accountingTransactions.find((a) => a.id === b.matchedAccountingId);
                      return (
                        <tr key={b.id} className="hover:bg-slate-50">
                          <td className="p-3 font-sans font-bold text-slate-800">{b.transactionDate}</td>
                          <td className="p-3 text-emerald-700 font-semibold">{b.referenceNumber}</td>
                          <td className="p-3 font-sans text-slate-700 truncate max-w-xs">{b.description}</td>
                          <td className="p-3 text-center font-black text-emerald-600">
                            {Math.abs(b.netAmount).toFixed(3)}
                          </td>
                          <td className="p-3 text-blue-700 font-semibold">
                            {matchedAcc?.journalEntryNumber || 'تسوية تلقائية'}
                          </td>
                          <td className="p-3 text-center font-sans">
                            <MatchStatusBadge status={b.matchStatus} level={b.matchedLevel} />
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* CONTENT 4: IMPORTED STATEMENT PREVIEW */}
        {mainViewSubTab === 'statement' && (
          <div className="p-4 space-y-4">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-slate-700">كشف الحساب البنكي المصرفي المستورد بالكامل:</span>
              <button
                onClick={() => openImportModal('bank')}
                disabled={activeSession.isMonthClosed}
                className="text-emerald-700 font-bold hover:underline flex items-center gap-1"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>استيراد كشف حساب جديد</span>
              </button>
            </div>

            <div className="border border-slate-200 rounded-xl overflow-hidden max-h-96 overflow-y-auto">
              <table className="w-full text-right text-xs font-mono">
                <thead className="bg-slate-100 text-slate-700 font-bold sticky top-0 border-b border-slate-200">
                  <tr>
                    <th className="p-2.5 font-sans">#</th>
                    <th className="p-2.5 font-sans">التاريخ</th>
                    <th className="p-2.5">المرجع</th>
                    <th className="p-2.5 font-sans">البيان والتفاصيل</th>
                    <th className="p-2.5 text-center">مدين (سحب)</th>
                    <th className="p-2.5 text-center">دائن (إيداع)</th>
                    <th className="p-2.5 text-center">الرصيد بعد</th>
                    <th className="p-2.5 font-sans text-center">الحالة</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {bankTransactions.map((tx) => (
                    <tr key={tx.id} className="hover:bg-slate-50">
                      <td className="p-2.5 text-slate-400 font-sans">{tx.rowNumber}</td>
                      <td className="p-2.5 font-sans font-bold text-slate-800">{tx.transactionDate}</td>
                      <td className="p-2.5 text-emerald-700 font-semibold">{tx.referenceNumber}</td>
                      <td className="p-2.5 font-sans text-slate-700 truncate max-w-sm">{tx.description}</td>
                      <td className="p-2.5 text-center text-red-600 font-bold">
                        {tx.debit > 0 ? tx.debit.toFixed(3) : '-'}
                      </td>
                      <td className="p-2.5 text-center text-emerald-600 font-bold">
                        {tx.credit > 0 ? tx.credit.toFixed(3) : '-'}
                      </td>
                      <td className="p-2.5 text-center text-slate-800">
                        {tx.balanceAfter > 0 ? tx.balanceAfter.toFixed(3) : '-'}
                      </td>
                      <td className="p-2.5 text-center font-sans">
                        <MatchStatusBadge status={tx.matchStatus} level={tx.matchedLevel} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* CONTENT 5: PRINTABLE RECONCILIATION STATEMENT */}
        {mainViewSubTab === 'report' && (
          <div className="p-8 max-w-3xl mx-auto space-y-6 bg-white" id="printable-reconciliation-report">
            
            {/* Report Header */}
            <div className="text-center border-b-2 border-slate-900 pb-4">
              <h2 className="text-base font-black text-slate-900">شركة الأعمال الحديثة للتجارة والمقاولات ذ.م.م</h2>
              <h3 className="text-sm font-bold text-emerald-900 mt-1">
                مذكرة التسوية البنكية المصرفية المستقلة - Bank Reconciliation Statement
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                عن الفترة من {periodStart} إلى {periodEnd} &bull; العملة: {standaloneCurrency}
              </p>
            </div>

            {/* Bank Metadata */}
            <div className="grid grid-cols-2 gap-4 text-xs font-medium border border-slate-200 rounded-xl p-4 bg-slate-50">
              <div>
                <span className="text-slate-500 block">اسم البنك المستهدف:</span>
                <span className="font-bold text-slate-900">{standaloneBankName}</span>
              </div>
              <div>
                <span className="text-slate-500 block">رقم الحساب المستقل:</span>
                <span className="font-mono font-bold text-slate-900">
                  {formatMaskedAccount(standaloneAccountNumber)}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block">رقم اعتماد التسوية:</span>
                <span className="font-mono font-bold text-emerald-800">
                  {activeSession.reconciliationToken || 'قيد المراجعة والمطابقة'}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block">حالة التسوية:</span>
                <span className={`font-bold ${summary.isBalanced ? 'text-emerald-700' : 'text-red-600'}`}>
                  {summary.isBalanced ? 'متوازنة ومعتمدة (0.000 د.ك)' : 'غير متوازنة (يوجد فرق)'}
                </span>
              </div>
            </div>

            {/* Official Reconciliation Table */}
            <div className="border border-slate-300 rounded-xl overflow-hidden font-mono text-xs">
              <table className="w-full text-right">
                <thead className="bg-slate-100 text-slate-800 font-bold border-b border-slate-300">
                  <tr>
                    <th className="p-3 font-sans">البيان</th>
                    <th className="p-3 text-center">المبلغ الجزئي (د.ك)</th>
                    <th className="p-3 text-center">المبلغ الإجمالي (د.ك)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  
                  {/* Bank Section */}
                  <tr className="bg-emerald-50/40 font-bold">
                    <td className="p-3 font-sans" colSpan={2}>
                      الرصيد الختامي حسب كشف حساب البنك المصرفي (Bank Statement Balance)
                    </td>
                    <td className="p-3 text-center font-black text-emerald-900">
                      {summary.bankClosingBalance.toFixed(3)}
                    </td>
                  </tr>

                  <tr>
                    <td className="p-3 font-sans pr-6 text-slate-700">
                      يضاف: الإيداعات والتحويلات النقدية بالطريق (قيد التنفيذ)
                    </td>
                    <td className="p-3 text-center text-emerald-700">
                      {summary.uncreditedDepositsTotal.toFixed(3)}
                    </td>
                    <td className="p-3 text-center text-slate-400">-</td>
                  </tr>

                  <tr>
                    <td className="p-3 font-sans pr-6 text-slate-700">
                      يخصم: الشيكات المسحوبة ولم تقدم للصرف بعد (Unpresented Cheques)
                    </td>
                    <td className="p-3 text-center text-red-600">
                      ({summary.unpresentedChequesTotal.toFixed(3)})
                    </td>
                    <td className="p-3 text-center text-slate-400">-</td>
                  </tr>

                  <tr className="bg-slate-100/70 font-bold">
                    <td className="p-3 font-sans">
                      = الرصيد المعدل لحساب البنك (Adjusted Bank Balance)
                    </td>
                    <td className="p-3 text-center text-slate-400">-</td>
                    <td className="p-3 text-center font-black text-emerald-800 text-sm">
                      {summary.adjustedBankBalance.toFixed(3)}
                    </td>
                  </tr>

                  {/* Accounting Section */}
                  <tr className="bg-blue-50/40 font-bold">
                    <td className="p-3 font-sans" colSpan={2}>
                      الرصيد الختامي حسب الدفاتر المحاسبية (الأستاذ العام)
                    </td>
                    <td className="p-3 text-center font-black text-blue-900">
                      {summary.accountingClosingBalance.toFixed(3)}
                    </td>
                  </tr>

                  <tr>
                    <td className="p-3 font-sans pr-6 text-slate-700">
                      يخصم: الفروقات والعمولات البنكية المستخرجة آلياً
                    </td>
                    <td className="p-3 text-center text-red-600">
                      ({summary.totalBankFees.toFixed(3)})
                    </td>
                    <td className="p-3 text-center text-slate-400">-</td>
                  </tr>

                  <tr className="bg-slate-100/70 font-bold">
                    <td className="p-3 font-sans">
                      = الرصيد المعدل للدفاتر المحاسبية (Adjusted Books Balance)
                    </td>
                    <td className="p-3 text-center text-slate-400">-</td>
                    <td className="p-3 text-center font-black text-emerald-800 text-sm">
                      {summary.adjustedAccountingBalance.toFixed(3)}
                    </td>
                  </tr>

                  {/* Net Discrepancy */}
                  <tr className="bg-slate-900 text-white font-black">
                    <td className="p-3.5 font-sans" colSpan={2}>
                      صافي الفرق النهائي (Net Reconciliation Discrepancy)
                    </td>
                    <td className="p-3.5 text-center text-sm font-mono">
                      {summary.netDifference.toFixed(3)} د.ك
                    </td>
                  </tr>

                </tbody>
              </table>
            </div>

            {/* Signatures Footer */}
            <div className="grid grid-cols-3 gap-8 pt-8 text-center text-xs font-bold text-slate-700 border-t border-slate-200">
              <div>
                <span className="block mb-8">إعداد / المحاسب:</span>
                <span className="border-t border-slate-400 pt-1 block">{currentUserName}</span>
              </div>
              <div>
                <span className="block mb-8">تدقيق / رئيس الحسابات:</span>
                <span className="border-t border-slate-400 pt-1 block">فهد العازمي</span>
              </div>
              <div>
                <span className="block mb-8">اعتماد / المدير المالي:</span>
                <span className="border-t border-slate-400 pt-1 block">طلال المطيري</span>
              </div>
            </div>

          </div>
        )}

      </div>

      {/* MODALS */}
      <ExcelImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        importTarget={importTarget}
        onImportBankSuccess={handleImportBankSuccess}
        onImportAppSuccess={handleImportAppSuccess}
        currency={standaloneCurrency}
      />

      <JournalEntryModal
        isOpen={isJournalModalOpen}
        onClose={() => setIsJournalModalOpen(false)}
        bankTx={activeTxForJournal}
        difference={activeDiffForJournal}
        bankAccountName={standaloneBankName}
        defaultFeeAccount={settings.bankFeeExpenseAccountName}
        onSaveEntry={handleSaveCustomJournalEntry}
      />

      <ReconciliationSettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        settings={settings}
        permissions={permissions}
        onSaveSettings={(s) => {
          setSettings(s);
          saveStateToStorage();
        }}
        onSavePermissions={(p) => {
          setPermissions(p);
          saveStateToStorage();
        }}
      />

    </div>
  );
}
