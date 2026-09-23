import React, { useState } from 'react';
import { 
  LayoutDashboard, 
  Receipt, 
  ListOrdered, 
  Users, 
  FileSpreadsheet, 
  Sliders, 
  Landmark, 
  Plus,
  BookOpen
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
  onSubTabChange?: (tab: string) => void;
  companyName?: string;
}

export function ChequePrintingModule({ 
  initialSubTab = 'dashboard', 
  initialChequeIdToPrint,
  activeSubTab,
  onSubTabChange,
  companyName,
}: ChequePrintingModuleProps) {
  // Master State
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>(INITIAL_BANK_ACCOUNTS);
  const [chequeBooks, setChequeBooks] = useState<ChequeBook[]>(INITIAL_CHEQUE_BOOKS);
  const [beneficiaries, setBeneficiaries] = useState<Beneficiary[]>(INITIAL_BENEFICIARIES);
  const [issuedCheques, setIssuedCheques] = useState<IssuedCheque[]>(INITIAL_ISSUED_CHEQUES);
  const [printSettings, setPrintSettings] = useState<ChequePrintSettings>(() => {
    try {
      const saved = localStorage.getItem('app_cheque_print_settings');
      if (saved) {
        const parsed = JSON.parse(saved);
        // Ensure default is vector_template as requested by user
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

  const handleUpdatePrintSettings = (newSettings: ChequePrintSettings) => {
    setPrintSettings(newSettings);
    try {
      localStorage.setItem('app_cheque_print_settings', JSON.stringify(newSettings));
    } catch (e) {
      console.error(e);
    }
  };

  // Navigation State
  const [internalSubTab, setInternalSubTab] = useState<string>(initialSubTab);
  const currentSubTab = activeSubTab !== undefined ? activeSubTab : internalSubTab;

  const setCurrentSubTab = (tab: string) => {
    setInternalSubTab(tab);
    if (onSubTabChange) {
      onSubTabChange(tab);
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

  // Handlers for data updates
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
    setBeneficiaries((prev) => [...prev, newBen]);
  };

  const handleUpdateBeneficiary = (updated: Beneficiary) => {
    setBeneficiaries((prev) => prev.map((b) => (b.id === updated.id ? updated : b)));
  };

  const handleDeleteBeneficiary = (id: string) => {
    setBeneficiaries((prev) => prev.filter((b) => b.id !== id));
  };

  // Add Bank Account
  const handleAddAccount = (acc: Omit<BankAccount, 'id'>) => {
    const newAcc: BankAccount = {
      ...acc,
      id: `acc-${Date.now()}`,
    };
    setBankAccounts((prev) => [...prev, newAcc]);
  };

  const handleUpdateAccount = (updated: BankAccount) => {
    setBankAccounts((prev) => prev.map((a) => (a.id === updated.id ? updated : a)));
  };

  // Add Cheque Book
  const handleAddChequeBook = (book: Omit<ChequeBook, 'id'>) => {
    const newBk: ChequeBook = {
      ...book,
      id: `bk-${Date.now()}`,
    };
    setChequeBooks((prev) => [...prev, newBk]);
  };

  const handleUpdateChequeBook = (updated: ChequeBook) => {
    setChequeBooks((prev) => prev.map((b) => (b.id === updated.id ? updated : b)));
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
      
      {/* Top Main Header for Cheque Printing */}
      <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3 print:hidden">
        
        {/* Module Title & Active Sub-Tab Indicator */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-600 flex items-center justify-center text-white shadow-md">
            <Landmark className="w-5 h-5" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-base font-black text-slate-900">
                منظومة طباعة الشيكات البنكية وإدارة الدفاتر
              </h1>
              <span className="bg-amber-100 text-amber-900 text-[10px] font-bold px-2 py-0.5 rounded border border-amber-300">
                البنك التجاري CBK
              </span>
              <span className="text-slate-300">|</span>
              {(() => {
                const activeInfo = subTabs.find((t) => t.id === currentSubTab);
                const ActiveIcon = activeInfo?.icon || LayoutDashboard;
                return (
                  <span className="font-bold text-amber-800 bg-amber-50 px-2.5 py-0.5 rounded-lg border border-amber-200/80 flex items-center gap-1 text-xs">
                    <ActiveIcon className="w-3.5 h-3.5 text-amber-600" />
                    {activeInfo?.label || 'لوحة التحكم والداشبورد'}
                  </span>
                );
              })()}
            </div>
            <p className="text-[11px] text-slate-500">
              دعم متعدد الحسابات البنكية، تتبع تسلسل الدفاتر، التفقيط التلقائي، والطباعة الدقيقة
            </p>
          </div>
        </div>

        {/* Quick action button */}
        {currentSubTab !== 'issue' && (
          <button
            type="button"
            onClick={() => {
              setPrefillBeneficiaryForIssue('');
              setCurrentSubTab('issue');
            }}
            className="flex items-center gap-1.5 px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-xl text-xs shadow-md transition"
          >
            <Plus className="w-4 h-4" />
            <span>تحرير شيك جديد</span>
          </button>
        )}
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
