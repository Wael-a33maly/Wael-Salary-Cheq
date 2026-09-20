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
import { CbkChequePrint } from './CbkChequePrint';

interface ChequePrintingModuleProps {
  initialSubTab?: string;
  initialChequeIdToPrint?: string;
}

export function ChequePrintingModule({ 
  initialSubTab = 'dashboard', 
  initialChequeIdToPrint 
}: ChequePrintingModuleProps) {
  // Master State
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>(INITIAL_BANK_ACCOUNTS);
  const [chequeBooks, setChequeBooks] = useState<ChequeBook[]>(INITIAL_CHEQUE_BOOKS);
  const [beneficiaries, setBeneficiaries] = useState<Beneficiary[]>(INITIAL_BENEFICIARIES);
  const [issuedCheques, setIssuedCheques] = useState<IssuedCheque[]>(INITIAL_ISSUED_CHEQUES);
  const [printSettings, setPrintSettings] = useState<ChequePrintSettings>(DEFAULT_PRINT_SETTINGS);

  // Navigation State
  const [currentSubTab, setCurrentSubTab] = useState<string>(initialSubTab);
  const [selectedAccountId, setSelectedAccountId] = useState<string>('all');
  const [ledgerInitialFilter, setLedgerInitialFilter] = useState<'all' | 'issued' | 'cashed' | 'cancelled'>('all');
  const [reportsInitialTab, setReportsInitialTab] = useState<string>('cashed');
  const [reportsBeneficiaryId, setReportsBeneficiaryId] = useState<string>('');
  const [prefillBeneficiaryForIssue, setPrefillBeneficiaryForIssue] = useState<string>('');

  // Print modal state
  const [printingCheque, setPrintingCheque] = useState<IssuedCheque | null>(
    initialChequeIdToPrint ? issuedCheques.find((c) => c.id === initialChequeIdToPrint) || null : null
  );

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
  const handleAddBeneficiary = (ben: Omit<Beneficiary, 'id' | 'createdAt'>) => {
    const newBen: Beneficiary = {
      ...ben,
      id: `ben-${Date.now()}`,
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
    { id: 'settings', label: 'دفاتر الشيكات والحسابات', icon: BookOpen },
  ];

  return (
    <div className="space-y-6">
      
      {/* Top Main Navigation for Cheque Printing */}
      <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3 print:hidden">
        
        {/* Module Title */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-md">
            <Landmark className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-black text-slate-900">
                منظومة طباعة الشيكات البنكية وإدارة الدفاتر
              </h1>
              <span className="bg-amber-100 text-amber-900 text-[10px] font-bold px-2 py-0.5 rounded border border-amber-300">
                البنك التجاري الكويتي CBK (د.ك)
              </span>
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
            className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-xs shadow-md transition"
          >
            <Plus className="w-4 h-4" />
            <span>تحرير شيك جديد</span>
          </button>
        )}
      </div>

      {/* Sub Tabs Pill Bar */}
      <div className="bg-white p-1.5 rounded-2xl border border-slate-200 shadow-2xs flex items-center gap-1.5 overflow-x-auto print:hidden">
        {subTabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = currentSubTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setCurrentSubTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition shrink-0 ${
                isActive
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
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

      {currentSubTab === 'settings' && (
        <ChequeBooksSettings
          bankAccounts={bankAccounts}
          chequeBooks={chequeBooks}
          printSettings={printSettings}
          onAddAccount={handleAddAccount}
          onUpdateAccount={handleUpdateAccount}
          onAddChequeBook={handleAddChequeBook}
          onUpdateChequeBook={handleUpdateChequeBook}
          onUpdatePrintSettings={setPrintSettings}
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
          onClose={() => setPrintingCheque(null)}
          onUpdateSettings={(newSettings) => setPrintSettings(newSettings)}
        />
      )}

    </div>
  );
}
