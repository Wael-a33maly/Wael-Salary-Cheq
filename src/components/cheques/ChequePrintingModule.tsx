import React, { useState, useEffect, useCallback } from 'react';
import { 
  LayoutDashboard, 
  Receipt, 
  ListOrdered, 
  Users, 
  FileSpreadsheet, 
  Sliders, 
  Landmark, 
  Plus,
  BookOpen,
  Database,
  RefreshCw,
  CheckCircle2
} from 'lucide-react';
import { 
  BankAccount, 
  ChequeBook, 
  Beneficiary, 
  IssuedCheque, 
  ChequePrintSettings 
} from '../../types';
import { 
  INITIAL_BANK_ACCOUNTS, 
  INITIAL_CHEQUE_BOOKS, 
  INITIAL_BENEFICIARIES, 
  INITIAL_ISSUED_CHEQUES, 
  DEFAULT_PRINT_SETTINGS 
} from '../../mockCheques';
import { dbService } from '../../services/apiService';
import { ChequesDashboard } from './ChequesDashboard';
import { IssueChequeForm } from './IssueChequeForm';
import { ChequesLedger } from './ChequesLedger';
import { BeneficiariesView } from './BeneficiariesView';
import { ChequeReportsView } from './ChequeReportsView';
import { ChequeBooksSettings } from './ChequeBooksSettings';
import { ChequeCalibrationTab } from './ChequeCalibrationTab';
import { CbkChequePrint } from './CbkChequePrint';
import { ChequeReceiptAndEnvelopeModal } from './ChequeReceiptAndEnvelopeModal';

interface ChequePrintingModuleProps {
  initialSubTab?: string;
  initialChequeIdToPrint?: string;
  activeSubTab?: string;
  onSubTabChange?: (subTab: string) => void;
  companyName?: string;
}

export function ChequePrintingModule({
  initialSubTab = 'dashboard',
  initialChequeIdToPrint,
  activeSubTab,
  onSubTabChange,
  companyName,
}: ChequePrintingModuleProps) {
  // State for database connection and live sync status
  const [dbConnected, setDbConnected] = useState<boolean>(false);
  const [dbSyncMessage, setDbSyncMessage] = useState<string>('جاري فحص الاتصال بقاعدة البيانات...');
  const [isSyncing, setIsSyncing] = useState<boolean>(false);

  // Master State with LocalStorage persistence and Database sync (respects empty arrays on reset)
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>(() => {
    try {
      const saved = localStorage.getItem('app_bank_accounts');
      if (saved !== null) return JSON.parse(saved);
      return INITIAL_BANK_ACCOUNTS;
    } catch {
      return [];
    }
  });

  const [chequeBooks, setChequeBooks] = useState<ChequeBook[]>(() => {
    try {
      const saved = localStorage.getItem('app_cheque_books');
      if (saved !== null) return JSON.parse(saved);
      return INITIAL_CHEQUE_BOOKS;
    } catch {
      return [];
    }
  });

  const [beneficiaries, setBeneficiaries] = useState<Beneficiary[]>(() => {
    try {
      const saved = localStorage.getItem('app_beneficiaries');
      if (saved !== null) return JSON.parse(saved);
      return INITIAL_BENEFICIARIES;
    } catch {
      return [];
    }
  });

  const [issuedCheques, setIssuedCheques] = useState<IssuedCheque[]>(() => {
    try {
      const saved = localStorage.getItem('app_issued_cheques');
      if (saved !== null) return JSON.parse(saved);
      return INITIAL_ISSUED_CHEQUES;
    } catch {
      return [];
    }
  });

  const [printSettings, setPrintSettings] = useState<ChequePrintSettings>(() => {
    try {
      const saved = localStorage.getItem('app_cheque_print_settings');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (!parsed.templateMode || parsed.templateMode === 'scanned_image') {
          parsed.templateMode = 'vector_template';
        }
        return parsed;
      }
    } catch (e) {
      console.error(e);
    }
    return DEFAULT_PRINT_SETTINGS;
  });

  // الاستماع لحدث إعادة التعيين العام لتصفير البيانات فوراً
  useEffect(() => {
    const handleAppReset = (e: any) => {
      const { selectedKeys = [], isAll = false, preserveChequeImages = true } = e.detail || {};
      if (isAll || selectedKeys.includes('cheques')) {
        setIssuedCheques([]);
        setChequeBooks([]);
      }
      if (isAll || selectedKeys.includes('bank_accounts_beneficiaries')) {
        if (!preserveChequeImages) {
          setBankAccounts([]);
        }
        setBeneficiaries([]);
      }
      if (isAll || selectedKeys.includes('settings')) {
        setPrintSettings(DEFAULT_PRINT_SETTINGS);
      }
    };
    window.addEventListener('app_data_reset', handleAppReset);
    return () => window.removeEventListener('app_data_reset', handleAppReset);
  }, []);

  // مزامنة البيانات تلقائياً مع خادم وقاعدة بيانات MySQL عند فتح الصفحة
  const syncWithDatabase = useCallback(async () => {
    setIsSyncing(true);
    try {
      const status = await dbService.checkConnection();
      setDbConnected(status.isConnected);
      setDbSyncMessage(status.message);

      if (status.isConnected) {
        const data = await dbService.fetchBootstrapData();
        if (data) {
          if (data.bankAccounts && data.bankAccounts.length > 0) {
            setBankAccounts(data.bankAccounts);
          }
          if (data.chequeBooks && data.chequeBooks.length > 0) {
            setChequeBooks(data.chequeBooks);
          }
          if (data.beneficiaries && data.beneficiaries.length > 0) {
            setBeneficiaries(data.beneficiaries);
          }
          if (data.issuedCheques && data.issuedCheques.length > 0) {
            setIssuedCheques(data.issuedCheques);
          }
          if (data.printSettings) {
            setPrintSettings(data.printSettings);
          }
          setDbSyncMessage('مربوط بقاعدة بيانات MySQL المركزية (مزامنة حية)');
        }
      }
    } catch (err) {
      console.warn('Sync failed:', err);
    } finally {
      setIsSyncing(false);
    }
  }, []);

  useEffect(() => {
    syncWithDatabase();
  }, [syncWithDatabase]);

  // تحديث التخزين المحلي كطبقة احتياطية سريعة
  useEffect(() => {
    try {
      localStorage.setItem('app_bank_accounts', JSON.stringify(bankAccounts));
    } catch (e) {
      console.error(e);
    }
  }, [bankAccounts]);

  useEffect(() => {
    try {
      localStorage.setItem('app_cheque_books', JSON.stringify(chequeBooks));
    } catch (e) {
      console.error(e);
    }
  }, [chequeBooks]);

  useEffect(() => {
    try {
      localStorage.setItem('app_beneficiaries', JSON.stringify(beneficiaries));
    } catch (e) {
      console.error(e);
    }
  }, [beneficiaries]);

  useEffect(() => {
    try {
      localStorage.setItem('app_issued_cheques', JSON.stringify(issuedCheques));
    } catch (e) {
      console.error(e);
    }
  }, [issuedCheques]);

  const handleUpdatePrintSettings = (newSettings: ChequePrintSettings) => {
    setPrintSettings(newSettings);
    try {
      localStorage.setItem('app_cheque_print_settings', JSON.stringify(newSettings));
    } catch (e) {
      console.error(e);
    }
    // حفظ في MySQL إذا كان متصلاً
    dbService.savePrintSettingsToDb(newSettings);
  };

  // Navigation State
  const [internalSubTab, setInternalSubTab] = useState<string>(initialSubTab);
  const rawSubTab = activeSubTab !== undefined ? activeSubTab : internalSubTab;
  let currentSubTab = rawSubTab === 'print' ? 'issue' : (rawSubTab || 'dashboard');
  const validSubTabs = ['dashboard', 'issue', 'ledger', 'beneficiaries', 'reports', 'calibration', 'settings'];
  if (!validSubTabs.includes(currentSubTab)) {
    currentSubTab = 'dashboard';
  }

  const setCurrentSubTab = (tab: string) => {
    const normalized = tab === 'print' ? 'issue' : tab;
    setInternalSubTab(normalized);
    if (onSubTabChange) {
      onSubTabChange(normalized);
    }
  };
  const [selectedAccountId, setSelectedAccountId] = useState<string>('all');
  const [ledgerInitialFilter, setLedgerInitialFilter] = useState<'all' | 'issued' | 'cashed' | 'cancelled'>('all');
  const [reportsInitialTab, setReportsInitialTab] = useState<string>('cashed');
  const [reportsBeneficiaryId, setReportsBeneficiaryId] = useState<string>('');
  const [prefillBeneficiaryForIssue, setPrefillBeneficiaryForIssue] = useState<string>('');

  // Print modal state
  const [printingCheque, setPrintingCheque] = useState<IssuedCheque | null>(
    initialChequeIdToPrint ? issuedCheques.find((c) => c.id === initialChequeIdToPrint) || null : null
  );

  // Receipt & Envelope modal state
  const [receiptEnvelopeCheque, setReceiptEnvelopeCheque] = useState<IssuedCheque | null>(null);

  // Handlers for data updates with real MySQL persistence
  const handleSaveCheque = (newCheque: IssuedCheque) => {
    setIssuedCheques((prev) => [newCheque, ...prev]);

    // Update currentSerial in the ChequeBook
    setChequeBooks((prev) =>
      prev.map((bk) =>
        bk.id === newCheque.chequeBookId
          ? { ...bk, currentSerial: newCheque.chequeNumber + 1 }
          : bk
      )
    );

    // حفظ في MySQL قاعدة البيانات
    dbService.saveChequeToDb(newCheque);
  };

  const handleSaveAndPrint = (newCheque: IssuedCheque) => {
    handleSaveCheque(newCheque);
    setPrintingCheque(newCheque);
  };

  const handleStatusChange = (
    chequeId: string, 
    newStatus: 'issued' | 'cashed' | 'cancelled', 
    notes?: string
  ) => {
    const todayStr = new Date().toISOString().split('T')[0];
    setIssuedCheques((prev) =>
      prev.map((c) => {
        if (c.id === chequeId) {
          return {
            ...c,
            status: newStatus,
            cashedDate: newStatus === 'cashed' ? (c.cashedDate || todayStr) : c.cashedDate,
            cancelReason: notes || c.cancelReason,
          };
        }
        return c;
      })
    );

    // تحديث في قاعدة بيانات MySQL
    dbService.updateChequeStatusInDb(chequeId, newStatus, todayStr, notes);
  };

  // Add Beneficiary
  const handleAddBeneficiary = (ben: Partial<Beneficiary>) => {
    const newBen: Beneficiary = {
      id: `ben-${Date.now()}`,
      nameAr: ben.nameAr || '',
      nameEn: ben.nameEn || '',
      civilIdOrCR: ben.civilIdOrCR || '',
      category: ben.category || 'vendor',
      phoneNumber: ben.phoneNumber || '',
      bankName: ben.bankName || '',
      iban: ben.iban || '',
      bankAccountId: ben.bankAccountId || 'all',
      notes: ben.notes || '',
      status: ben.status || 'active',
      createdAt: new Date().toISOString().split('T')[0],
    };
    const updatedList = [...beneficiaries, newBen];
    setBeneficiaries(updatedList);
    dbService.saveBeneficiariesToDb(updatedList);
  };

  const handleUpdateBeneficiary = (updated: Beneficiary) => {
    const updatedList = beneficiaries.map((b) => (b.id === updated.id ? updated : b));
    setBeneficiaries(updatedList);
    dbService.saveBeneficiariesToDb(updatedList);
  };

  const handleDeleteBeneficiary = (id: string) => {
    const updatedList = beneficiaries.filter((b) => b.id !== id);
    setBeneficiaries(updatedList);
    dbService.saveBeneficiariesToDb(updatedList);
  };

  // Add Bank Account
  const handleAddAccount = (acc: Omit<BankAccount, 'id'>) => {
    const newAcc: BankAccount = {
      ...acc,
      id: `acc-${Date.now()}`,
    };
    const updatedList = [...bankAccounts, newAcc];
    setBankAccounts(updatedList);
    dbService.saveBankAccountsToDb(updatedList);
  };

  const handleUpdateAccount = (updated: BankAccount) => {
    const updatedList = bankAccounts.map((a) => (a.id === updated.id ? updated : a));
    setBankAccounts(updatedList);
    dbService.saveBankAccountsToDb(updatedList);
  };

  // Add Cheque Book
  const handleAddChequeBook = (book: Omit<ChequeBook, 'id'>) => {
    const newBk: ChequeBook = {
      ...book,
      id: `bk-${Date.now()}`,
    };
    const updatedList = [...chequeBooks, newBk];
    setChequeBooks(updatedList);
    dbService.saveChequeBooksToDb(updatedList);
  };

  const handleUpdateChequeBook = (updated: ChequeBook) => {
    const updatedList = chequeBooks.map((b) => (b.id === updated.id ? updated : b));
    setChequeBooks(updatedList);
    dbService.saveChequeBooksToDb(updatedList);
  };

  // Quick navigation helpers
  const handleViewAllCheques = (filter?: 'all' | 'issued' | 'cashed' | 'cancelled') => {
    setLedgerInitialFilter(filter || 'all');
    setCurrentSubTab('ledger');
  };

  const handleOpenBeneficiaryReport = (benId: string) => {
    setReportsInitialTab('beneficiary');
    setReportsBeneficiaryId(benId);
    setCurrentSubTab('reports');
  };

  const handleIssueForBeneficiary = (benId: string) => {
    setPrefillBeneficiaryForIssue(benId);
    setCurrentSubTab('issue');
  };

  const handleOpenBookSettings = (bookId?: string) => {
    setCurrentSubTab('settings');
  };

  // Sub Navigation Tabs
  const subTabs = [
    { id: 'dashboard', label: 'لوحة التحكم والداشبورد', icon: LayoutDashboard },
    { id: 'issue', label: 'تحرير وطباعة شيك', icon: Receipt },
    { id: 'ledger', label: 'سجل الشيكات والمتابعة', icon: ListOrdered },
    { id: 'beneficiaries', label: 'شاشة تسجيل المستفيدين', icon: Users },
    { id: 'reports', label: 'مركز التقارير المصرفية', icon: FileSpreadsheet },
    { id: 'calibration', label: 'معايرة مقاسات الشيك', icon: Sliders },
    { id: 'settings', label: 'دفاتر الشيكات والحسابات', icon: BookOpen },
  ];

  return (
    <div className="space-y-6">
      
      {/* Top Main Header for Cheque Printing with Live Database Status */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4 print:hidden">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-amber-600 text-white flex items-center justify-center shadow-md shadow-amber-600/20">
            <Landmark className="w-6 h-6" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg font-black text-slate-900">منظومة طباعة الشيكات المصرفية وإدارة الدفاتر</h2>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-900 border border-amber-300">
                البنك التجاري الكويتي (CBK)
              </span>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-500 mt-1">
              <Database className={`w-3.5 h-3.5 ${dbConnected ? 'text-emerald-600' : 'text-slate-400'}`} />
              <span className={`font-semibold ${dbConnected ? 'text-emerald-700' : 'text-slate-600'}`}>
                {dbSyncMessage}
              </span>
              <button 
                onClick={syncWithDatabase}
                disabled={isSyncing}
                title="تحديث البيانات من قاعدة بيانات MySQL"
                className="hover:text-blue-600 p-0.5"
              >
                <RefreshCw className={`w-3 h-3 ${isSyncing ? 'animate-spin text-amber-600' : ''}`} />
              </button>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Quick Issue Button */}
          {currentSubTab !== 'issue' && (
            <button
              onClick={() => {
                setPrefillBeneficiaryForIssue('');
                setCurrentSubTab('issue');
              }}
              className="flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-xl text-xs shadow-md transition"
            >
              <Plus className="w-4 h-4" />
              <span>تحرير شيك جديد</span>
            </button>
          )}
        </div>
      </div>

      {/* Sub Tabs Navigation Bar */}
      <div className="bg-white p-2 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap gap-1.5 print:hidden">
        {subTabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = currentSubTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setCurrentSubTab(tab.id)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition ${
                isActive
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Render Active View */}
      {currentSubTab === 'dashboard' && (
        <ChequesDashboard
          bankAccounts={bankAccounts}
          chequeBooks={chequeBooks}
          beneficiaries={beneficiaries}
          issuedCheques={issuedCheques}
          selectedAccountId={selectedAccountId}
          onSelectAccount={setSelectedAccountId}
          onNavigateToIssue={() => {
            setPrefillBeneficiaryForIssue('');
            setCurrentSubTab('issue');
          }}
          onNavigateToLedger={handleViewAllCheques}
          onNavigateToBeneficiaries={() => setCurrentSubTab('beneficiaries')}
          onNavigateToReports={(reportTab) => {
            setReportsInitialTab(reportTab || 'cashed');
            setCurrentSubTab('reports');
          }}
          onPrintCheque={(chk) => setPrintingCheque(chk)}
          onPrintReceiptOrEnvelope={(chk) => setReceiptEnvelopeCheque(chk)}
          onStatusChange={handleStatusChange}
          onOpenSettings={handleOpenBookSettings}
        />
      )}

      {currentSubTab === 'issue' && (
        <IssueChequeForm
          bankAccounts={bankAccounts}
          chequeBooks={chequeBooks}
          beneficiaries={beneficiaries}
          selectedAccountId={selectedAccountId}
          onSelectAccount={setSelectedAccountId}
          printSettings={printSettings}
          onUpdatePrintSettings={handleUpdatePrintSettings}
          onSaveCheque={handleSaveCheque}
          onSaveAndPrint={handleSaveAndPrint}
          onAddNewBeneficiary={handleAddBeneficiary}
          prefillBeneficiaryId={prefillBeneficiaryForIssue}
        />
      )}

      {currentSubTab === 'ledger' && (
        <ChequesLedger
          issuedCheques={issuedCheques}
          bankAccounts={bankAccounts}
          beneficiaries={beneficiaries}
          selectedAccountId={selectedAccountId}
          onSelectAccount={setSelectedAccountId}
          onPrintCheque={(chk) => setPrintingCheque(chk)}
          onPrintReceiptOrEnvelope={(chk) => setReceiptEnvelopeCheque(chk)}
          onStatusChange={handleStatusChange}
          onNavigateToIssue={() => {
            setPrefillBeneficiaryForIssue('');
            setCurrentSubTab('issue');
          }}
          initialFilterStatus={ledgerInitialFilter}
        />
      )}

      {currentSubTab === 'beneficiaries' && (
        <BeneficiariesView
          beneficiaries={beneficiaries}
          issuedCheques={issuedCheques}
          bankAccounts={bankAccounts}
          selectedAccountId={selectedAccountId}
          onSelectAccount={setSelectedAccountId}
          onAddBeneficiary={handleAddBeneficiary}
          onUpdateBeneficiary={handleUpdateBeneficiary}
          onDeleteBeneficiary={handleDeleteBeneficiary}
          onIssueChequeForBeneficiary={handleIssueForBeneficiary}
          onViewBeneficiaryReport={handleOpenBeneficiaryReport}
        />
      )}

      {currentSubTab === 'reports' && (
        <ChequeReportsView
          issuedCheques={issuedCheques}
          bankAccounts={bankAccounts}
          chequeBooks={chequeBooks}
          beneficiaries={beneficiaries}
          selectedAccountId={selectedAccountId}
          onSelectAccount={setSelectedAccountId}
          initialReportTab={reportsInitialTab}
          initialBeneficiaryId={reportsBeneficiaryId}
          onPrintCheque={(chk) => setPrintingCheque(chk)}
        />
      )}

      {currentSubTab === 'calibration' && (
        <ChequeCalibrationTab
          printSettings={printSettings}
          onUpdatePrintSettings={handleUpdatePrintSettings}
          bankAccounts={bankAccounts}
        />
      )}

      {currentSubTab === 'settings' && (
        <ChequeBooksSettings
          bankAccounts={bankAccounts}
          chequeBooks={chequeBooks}
          printSettings={printSettings}
          onAddAccount={handleAddAccount}
          onUpdateAccount={handleUpdateAccount}
          onAddChequeBook={handleAddChequeBook}
          onUpdateChequeBook={handleUpdateChequeBook}
          onUpdatePrintSettings={handleUpdatePrintSettings}
          onNavigateToCalibration={() => setCurrentSubTab('calibration')}
        />
      )}

      {/* Cheque Printing & Calibration Modal */}
      {printingCheque && (
        <CbkChequePrint
          cheque={printingCheque}
          bankAccount={
            bankAccounts.find((a) => a.id === printingCheque.bankAccountId) || bankAccounts[0]
          }
          printSettings={printSettings}
          companyName={companyName}
          onUpdatePrintSettings={handleUpdatePrintSettings}
          onClose={() => setPrintingCheque(null)}
          onNavigateToCalibration={() => {
            setPrintingCheque(null);
            setCurrentSubTab('calibration');
          }}
        />
      )}

      {/* Cheque Receipt & Envelope Modal */}
      {receiptEnvelopeCheque && (
        <ChequeReceiptAndEnvelopeModal
          cheque={receiptEnvelopeCheque}
          bankAccount={
            bankAccounts.find((a) => a.id === receiptEnvelopeCheque.bankAccountId) || bankAccounts[0]
          }
          companyName={companyName}
          onClose={() => setReceiptEnvelopeCheque(null)}
        />
      )}

    </div>
  );
}
