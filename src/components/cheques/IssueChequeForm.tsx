import React, { useState, useEffect, useRef } from 'react';
import { 
  Printer, 
  Save, 
  RotateCcw, 
  UserPlus, 
  CheckCircle2, 
  Landmark, 
  Sliders, 
  Calendar,
  AlertCircle,
  Languages,
  Image as ImageIcon,
  Upload,
  Trash2,
  BookOpen,
  Hash,
  Ruler,
  Layers
} from 'lucide-react';
import { BankAccount, ChequeBook, Beneficiary, IssuedCheque, ChequePrintSettings, ChequeSizeTemplate } from '../../types';
import { tafqeetKwd, tafqeetKwdEn, formatChequeAmount } from '../../utils/tafqeetKwd';
import { CBK_CHEQUE_BASE_COORDS } from './ChequeCalibrationTab';

interface IssueChequeFormProps {
  bankAccounts: BankAccount[];
  chequeBooks: ChequeBook[];
  beneficiaries: Beneficiary[];
  selectedAccountId: string;
  onSelectAccount: (accId: string) => void;
  printSettings: ChequePrintSettings;
  onUpdatePrintSettings?: (settings: ChequePrintSettings) => void;
  onSaveCheque: (newCheque: IssuedCheque) => void;
  onSaveAndPrint: (newCheque: IssuedCheque) => void;
  onAddNewBeneficiary: (beneficiary: Partial<Beneficiary>) => void;
  prefillBeneficiaryId?: string;
}

export function IssueChequeForm({
  bankAccounts,
  chequeBooks,
  beneficiaries,
  selectedAccountId,
  onSelectAccount,
  printSettings,
  onUpdatePrintSettings,
  onSaveCheque,
  onSaveAndPrint,
  onAddNewBeneficiary,
  prefillBeneficiaryId,
}: IssueChequeFormProps) {
  // Active Account
  const effectiveAccountId = selectedAccountId === 'all' 
    ? (bankAccounts[0]?.id || 'acc-cbk-main') 
    : selectedAccountId;
  
  const activeAccount = bankAccounts.find((a) => a.id === effectiveAccountId) || bankAccounts[0];

  // Cheque books for this account
  const accountBooks = chequeBooks.filter((b) => b.bankAccountId === effectiveAccountId && b.status === 'active');
  const activeBook = accountBooks[0] || chequeBooks[0];

  // Today date format
  const todayStr = new Date().toISOString().split('T')[0];

  // Cheque templates for this bank account (supporting multiple sizes)
  const templates: ChequeSizeTemplate[] = activeAccount?.chequeTemplates && activeAccount.chequeTemplates.length > 0
    ? activeAccount.chequeTemplates
    : [
        {
          id: `tpl-${activeAccount?.id || 'std'}-default`,
          name: `المقاس المعتمد (${activeAccount?.chequeWidthCm || 18.0} × ${activeAccount?.chequeHeightCm || 9.0} سم)`,
          widthCm: activeAccount?.chequeWidthCm || 18.0,
          heightCm: activeAccount?.chequeHeightCm || 9.0,
          chequeImageUrl: activeAccount?.chequeImageUrl,
          chequeImageName: activeAccount?.chequeImageName,
          isDefault: true,
        }
      ];

  const [selectedTemplateId, setSelectedTemplateId] = useState<string>(
    activeAccount?.activeTemplateId || templates[0]?.id || ''
  );

  // Form State
  const [selectedBookId, setSelectedBookId] = useState<string>(activeBook?.id || '');
  const [chequeSerial, setChequeSerial] = useState<number>(activeBook?.currentSerial || 100001);
  const [selectedBeneficiaryId, setSelectedBeneficiaryId] = useState<string>(prefillBeneficiaryId || '');
  const [beneficiaryName, setBeneficiaryName] = useState<string>('');
  const [amount, setAmount] = useState<number>(1000.000);
  const [tafqeetLang, setTafqeetLang] = useState<'ar' | 'en'>('ar');
  const [amountInWords, setAmountInWords] = useState<string>(tafqeetKwd(1000.000));
  const [isManualWords, setIsManualWords] = useState<boolean>(false);
  const [issueDate, setIssueDate] = useState<string>(todayStr);
  const [dueDate, setDueDate] = useState<string>(todayStr);
  const [purpose, setPurpose] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [saveAsBeneficiary, setSaveAsBeneficiary] = useState<boolean>(false);
  const [successMessage, setSuccessMessage] = useState<string>('');

  // Custom Cheque Image Upload State
  const [uploadMessage, setUploadMessage] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleChequeImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setUploadMessage('يرجى اختيار ملف صورة صالح (JPG, PNG, WebP)');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      if (dataUrl && onUpdatePrintSettings) {
        const updated: ChequePrintSettings = {
          ...printSettings,
          customChequeImageUrl: dataUrl,
          customChequeImageName: file.name,
        };
        onUpdatePrintSettings(updated);
        try {
          localStorage.setItem('app_cheque_print_settings', JSON.stringify(updated));
        } catch (err) {
          console.error(err);
        }
        setUploadMessage(`تم رفع وحفظ صورة الشيك بنجاح وتطبيق مقاس 9×18 سم: ${file.name}`);
        setTimeout(() => setUploadMessage(''), 4500);
      }
    };
    reader.readAsDataURL(file);
    if (e.target) {
      e.target.value = '';
    }
  };

  const handleResetToDefaultImage = () => {
    if (onUpdatePrintSettings) {
      const updated: ChequePrintSettings = {
        ...printSettings,
        customChequeImageUrl: undefined,
        customChequeImageName: undefined,
      };
      onUpdatePrintSettings(updated);
      try {
        localStorage.setItem('app_cheque_print_settings', JSON.stringify(updated));
      } catch (err) {
        console.error(err);
      }
      setUploadMessage('تمت استعادة صورة الشيك الأصلية الافتراضية.');
      setTimeout(() => setUploadMessage(''), 3000);
    }
  };

  // Synchronize when account changes
  useEffect(() => {
    const books = chequeBooks.filter((b) => b.bankAccountId === effectiveAccountId && b.status === 'active');
    if (books.length > 0) {
      setSelectedBookId(books[0].id);
      setChequeSerial(books[0].currentSerial);
    }
    if (activeAccount) {
      const accTemplates = activeAccount.chequeTemplates && activeAccount.chequeTemplates.length > 0
        ? activeAccount.chequeTemplates
        : [
            {
              id: `tpl-${activeAccount.id}-std`,
              name: `المقاس المعتمد (${activeAccount.chequeWidthCm || 18.0} × ${activeAccount.chequeHeightCm || 9.0} سم)`,
              widthCm: activeAccount.chequeWidthCm || 18.0,
              heightCm: activeAccount.chequeHeightCm || 9.0,
              chequeImageUrl: activeAccount.chequeImageUrl,
              chequeImageName: activeAccount.chequeImageName,
              isDefault: true,
            }
          ];
      setSelectedTemplateId(activeAccount.activeTemplateId || accTemplates[0]?.id || '');
    }
  }, [effectiveAccountId, chequeBooks, activeAccount]);

  // Active Template & Dynamic Dimensions
  const currentTemplate = templates.find((t) => t.id === selectedTemplateId) || templates[0];
  const currentWidthCm = currentTemplate?.widthCm || activeAccount?.chequeWidthCm || 18.0;
  const currentHeightCm = currentTemplate?.heightCm || activeAccount?.chequeHeightCm || 9.0;
  const currentWidthMm = Math.round(currentWidthCm * 10);
  const currentHeightMm = Math.round(currentHeightCm * 10);
  const currentChequeImage = currentTemplate?.chequeImageUrl || activeAccount?.chequeImageUrl || printSettings.customChequeImageUrl || '/cbk_cheque_bg.jpg';

  // Synchronize when book changes
  useEffect(() => {
    const currentBk = chequeBooks.find((b) => b.id === selectedBookId);
    if (currentBk) {
      setChequeSerial(currentBk.currentSerial);
    }
  }, [selectedBookId, chequeBooks]);

  // Synchronize beneficiary selection
  useEffect(() => {
    if (selectedBeneficiaryId) {
      const b = beneficiaries.find((item) => item.id === selectedBeneficiaryId);
      if (b) {
        setBeneficiaryName(b.nameAr);
      }
    }
  }, [selectedBeneficiaryId, beneficiaries]);

  // Auto-generate Tafqeet when amount or language changes (unless user manually modified)
  useEffect(() => {
    if (!isManualWords) {
      setAmountInWords(tafqeetLang === 'en' ? tafqeetKwdEn(amount) : tafqeetKwd(amount));
    }
  }, [amount, tafqeetLang, isManualWords]);

  const handleAmountChange = (val: number) => {
    setAmount(val);
    if (!isManualWords) {
      setAmountInWords(tafqeetLang === 'en' ? tafqeetKwdEn(val) : tafqeetKwd(val));
    }
  };

  const handleTafqeetLangChange = (lang: 'ar' | 'en') => {
    setTafqeetLang(lang);
    setIsManualWords(false);
    setAmountInWords(lang === 'en' ? tafqeetKwdEn(amount) : tafqeetKwd(amount));
  };

  const handleResetWordsToAuto = () => {
    setIsManualWords(false);
    setAmountInWords(tafqeetLang === 'en' ? tafqeetKwdEn(amount) : tafqeetKwd(amount));
  };

  // Calculated dynamic coordinates from calibration / printSettings for live preview
  const previewDateLeft = Math.round((CBK_CHEQUE_BASE_COORDS.date.left + (printSettings.offsetX || 0) + (printSettings.dateOffsetX || 0)) * 10) / 10;
  const previewDateTop = Math.round((CBK_CHEQUE_BASE_COORDS.date.top + (printSettings.offsetY || 0) + (printSettings.dateOffsetY || 0)) * 10) / 10;
  const previewDateWidth = Math.round((printSettings.dateWidth ?? CBK_CHEQUE_BASE_COORDS.date.width) * 10) / 10;
  const previewDateHeight = Math.round((printSettings.dateHeight ?? CBK_CHEQUE_BASE_COORDS.date.height) * 10) / 10;
  const previewDateFontSize = printSettings.dateFontSize ?? CBK_CHEQUE_BASE_COORDS.date.fontSize;

  const previewPayeeLeft = Math.round((CBK_CHEQUE_BASE_COORDS.payee.left + (printSettings.offsetX || 0) + (printSettings.payeeOffsetX || 0)) * 10) / 10;
  const previewPayeeTop = Math.round((CBK_CHEQUE_BASE_COORDS.payee.top + (printSettings.offsetY || 0) + (printSettings.payeeOffsetY || 0)) * 10) / 10;
  const previewPayeeWidth = Math.round((printSettings.payeeWidth ?? CBK_CHEQUE_BASE_COORDS.payee.width) * 10) / 10;
  const previewPayeeHeight = Math.round((printSettings.payeeHeight ?? CBK_CHEQUE_BASE_COORDS.payee.height) * 10) / 10;
  const previewPayeeFontSize = printSettings.payeeFontSize ?? CBK_CHEQUE_BASE_COORDS.payee.fontSize;

  const previewWordsLeft = Math.round((CBK_CHEQUE_BASE_COORDS.words.left + (printSettings.offsetX || 0) + (printSettings.wordsOffsetX || 0)) * 10) / 10;
  const previewWordsTop = Math.round((CBK_CHEQUE_BASE_COORDS.words.top + (printSettings.offsetY || 0) + (printSettings.wordsOffsetY || 0)) * 10) / 10;
  const previewWordsWidth = Math.round((printSettings.wordsWidth ?? CBK_CHEQUE_BASE_COORDS.words.width) * 10) / 10;
  const previewWordsHeight = Math.round((printSettings.wordsHeight ?? CBK_CHEQUE_BASE_COORDS.words.height) * 10) / 10;
  const previewWordsFontSize = printSettings.wordsFontSize ?? CBK_CHEQUE_BASE_COORDS.words.fontSize;

  const previewAmountLeft = Math.round((CBK_CHEQUE_BASE_COORDS.amount.left + (printSettings.offsetX || 0) + (printSettings.amountOffsetX || 0)) * 10) / 10;
  const previewAmountTop = Math.round((CBK_CHEQUE_BASE_COORDS.amount.top + (printSettings.offsetY || 0) + (printSettings.amountOffsetY || 0)) * 10) / 10;
  const previewAmountWidth = Math.round((printSettings.amountWidth ?? CBK_CHEQUE_BASE_COORDS.amount.width) * 10) / 10;
  const previewAmountHeight = Math.round((printSettings.amountHeight ?? CBK_CHEQUE_BASE_COORDS.amount.height) * 10) / 10;
  const previewAmountFontSize = printSettings.amountFontSize ?? CBK_CHEQUE_BASE_COORDS.amount.fontSize;

  // Build the issued cheque object
  const buildChequeObject = (): IssuedCheque => {
    const serialStr = String(chequeSerial).padStart(8, '0');
    return {
      id: `chk-${Date.now()}`,
      bankAccountId: effectiveAccountId,
      chequeBookId: selectedBookId,
      chequeNumber: chequeSerial,
      chequeNumberStr: serialStr,
      beneficiaryId: selectedBeneficiaryId || undefined,
      beneficiaryName: beneficiaryName.trim() || 'لحامله',
      amount: amount || 0,
      amountInWordsAr: tafqeetLang === 'ar' ? amountInWords : tafqeetKwd(amount),
      amountInWordsEn: tafqeetLang === 'en' ? amountInWords : tafqeetKwdEn(amount),
      tafqeetLang,
      issueDate,
      dueDate,
      status: 'issued',
      isCrossed: false,
      bearerCrossed: false,
      purpose: purpose.trim(),
      notes: notes.trim(),
      templateId: currentTemplate?.id,
      templateName: currentTemplate?.name,
      chequeWidthCm: currentWidthCm,
      chequeHeightCm: currentHeightCm,
      createdBy: 'admin',
      createdAt: new Date().toISOString().replace('T', ' ').substring(0, 19),
    };
  };

  const handleSubmit = (andPrint = false) => {
    if (!beneficiaryName.trim()) {
      alert('يرجى تحديد أو إدخال اسم المستفيد أولاً');
      return;
    }
    if (amount <= 0) {
      alert('يرجى إدخال مبلغ صحيح بالدينار الكويتي');
      return;
    }

    // Save as new beneficiary if checked and doesn't exist
    if (saveAsBeneficiary && !selectedBeneficiaryId) {
      onAddNewBeneficiary({
        nameAr: beneficiaryName.trim(),
        bankAccountId: effectiveAccountId,
        category: 'vendor',
        status: 'active',
      });
    }

    const chequeObj = buildChequeObject();

    if (andPrint) {
      onSaveAndPrint(chequeObj);
    } else {
      onSaveCheque(chequeObj);
    }

    setSuccessMessage(`تم إصدار الشيك رقم #${chequeObj.chequeNumberStr} بنجاح وحفظه في السجل!`);
    setTimeout(() => setSuccessMessage(''), 4000);

    // Increment serial for next cheque
    setChequeSerial((prev) => prev + 1);
  };

  // Date formatted for preview
  const dateObj = new Date(dueDate || issueDate);
  const dayStr = String(dateObj.getDate()).padStart(2, '0');
  const monthStr = String(dateObj.getMonth() + 1).padStart(2, '0');
  const yearStr = String(dateObj.getFullYear());

  return (
    <div className="space-y-6">
      
      {/* Title Bar */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-slate-900">
            تحرير وإصدار شيك بنكي جديد (البنك التجاري الكويتي CBK)
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            إدخال بيانات الشيك، التفقيط التلقائي بالدينار الكويتي، ومعاينة حية فورية ومطابقة لأصل الشيك
          </p>
        </div>

        {/* Selected Bank Account Indicator */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-600">الحساب المسحوب عليه:</span>
          <select
            value={effectiveAccountId}
            onChange={(e) => onSelectAccount(e.target.value)}
            className="bg-slate-50 border border-slate-300 text-xs font-bold rounded-xl px-3 py-2 text-slate-800 focus:ring-2 focus:ring-blue-500"
          >
            {bankAccounts.map((acc) => (
              <option key={acc.id} value={acc.id}>
                {acc.bankName} - {acc.accountName}
              </option>
            ))}
          </select>
        </div>
      </div>

      {successMessage && (
        <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-xl text-emerald-800 text-xs flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span className="font-bold">{successMessage}</span>
        </div>
      )}

      {/* Main Grid: Form on the Right, Live Cheque on the Left */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        
        {/* Right Form: 6 Cols on XL */}
        <div className="xl:col-span-6 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="font-black text-slate-900 text-sm flex items-center gap-2">
              <Landmark className="w-4 h-4 text-blue-600" />
              <span>بيانات الشيك والتسلسل البنكي</span>
            </h3>
            <span className="text-[11px] font-mono text-slate-500">
              الرصيد: {activeAccount.currentBalance.toFixed(3)} د.ك
            </span>
          </div>

          <div className="space-y-3.5 text-xs">
            
            {/* Cheque Book and Serial Number */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-700 font-bold mb-1">دفتر الشيكات النشط:</label>
                <select
                  value={selectedBookId}
                  onChange={(e) => setSelectedBookId(e.target.value)}
                  className="w-full p-2.5 border border-slate-300 rounded-xl text-xs bg-slate-50 font-bold text-slate-800"
                >
                  {accountBooks.map((bk) => (
                    <option key={bk.id} value={bk.id}>
                      {bk.bookName} ({bk.serialFrom} - {bk.serialTo})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">
                  رقم الشيك التالي (تسلسلي):
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={chequeSerial}
                    onChange={(e) => setChequeSerial(parseInt(e.target.value) || 0)}
                    className="w-full p-2.5 border border-amber-300 bg-amber-50/50 rounded-xl font-mono font-black text-slate-900 text-sm"
                  />
                </div>
              </div>
            </div>

            {/* قالب ومقاس الشيك */}
            <div className="bg-slate-50 border border-slate-200/80 p-3 rounded-xl">
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-slate-800 font-bold flex items-center gap-1.5 text-xs">
                  <Ruler className="w-3.5 h-3.5 text-amber-600" />
                  <span>مقاس وقالب الشيك المعتمد:</span>
                </label>
                <span className="text-[11px] font-mono font-bold text-amber-700 bg-amber-100/70 px-2 py-0.5 rounded-lg border border-amber-200">
                  {currentWidthCm} × {currentHeightCm} سم ({currentWidthMm} × {currentHeightMm} مم)
                </span>
              </div>
              <select
                value={selectedTemplateId}
                onChange={(e) => setSelectedTemplateId(e.target.value)}
                className="w-full p-2 border border-slate-300 rounded-xl text-xs bg-white font-bold text-slate-800 focus:ring-2 focus:ring-amber-500"
              >
                {templates.map((tpl) => (
                  <option key={tpl.id} value={tpl.id}>
                    {tpl.name} — {tpl.widthCm} × {tpl.heightCm} سم
                  </option>
                ))}
              </select>
            </div>

            {/* Beneficiary Selection / Entry */}
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="text-slate-700 font-bold">اسم المستفيد (ادفعوا لأمر):</label>
                <select
                  value={selectedBeneficiaryId}
                  onChange={(e) => {
                    setSelectedBeneficiaryId(e.target.value);
                    if (!e.target.value) setBeneficiaryName('');
                  }}
                  className="text-[11px] bg-slate-50 border border-slate-300 rounded-lg px-2 py-1 text-blue-700 font-bold"
                >
                  <option value="">اختيار من سجل المستفيدين ({beneficiaries.length})...</option>
                  {beneficiaries.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.nameAr} ({b.category})
                    </option>
                  ))}
                </select>
              </div>
              <input
                type="text"
                required
                placeholder="اكتب الاسم كما سيطبع على الشيك بدقة..."
                value={beneficiaryName}
                onChange={(e) => {
                  setBeneficiaryName(e.target.value);
                  if (selectedBeneficiaryId) setSelectedBeneficiaryId('');
                }}
                className="w-full p-2.5 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:ring-2 focus:ring-blue-500"
              />
              {!selectedBeneficiaryId && beneficiaryName.trim() && (
                <label className="flex items-center gap-2 mt-1 text-[11px] text-slate-600 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={saveAsBeneficiary}
                    onChange={(e) => setSaveAsBeneficiary(e.target.checked)}
                    className="rounded text-blue-600"
                  />
                  <span>حفظ هذا الاسم تلقائياً في دليل المستفيدين للمعاملات القادمة</span>
                </label>
              )}

              {/* اختيار لغة التفقيط عند إدخال المستفيد */}
              <div className="mt-2.5 p-2 bg-emerald-50/80 border border-emerald-300/80 rounded-xl flex flex-wrap items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-1.5 text-emerald-950 font-bold">
                  <Languages className="w-4 h-4 text-emerald-700" />
                  <span>لغة التفقيط المعتمدة للشيك:</span>
                </div>
                <div className="inline-flex bg-white rounded-lg p-0.5 border border-emerald-300 shadow-xs">
                  <button
                    type="button"
                    onClick={() => handleTafqeetLangChange('ar')}
                    className={`px-3 py-1 rounded-md text-xs font-bold transition ${
                      tafqeetLang === 'ar'
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    العربية (فقط ... دينار لا غير)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleTafqeetLangChange('en')}
                    className={`px-3 py-1 rounded-md text-xs font-bold transition ${
                      tafqeetLang === 'en'
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    English (Kuwaiti Dinars ... Only)
                  </button>
                </div>
              </div>
            </div>

            {/* Amount in KWD and Auto Tafqeet */}
            <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-2.5">
              <div className="grid grid-cols-2 gap-3 items-center">
                <div>
                  <label className="block text-slate-800 font-black mb-1">
                    المبلغ بالأرقام (دينار كويتي . فلس):
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      step="0.001"
                      min="0.001"
                      value={amount}
                      onChange={(e) => handleAmountChange(parseFloat(e.target.value) || 0)}
                      className="w-full p-2.5 border-2 border-blue-400 bg-white rounded-xl font-mono font-black text-slate-900 text-base"
                    />
                    <span className="font-bold text-blue-800 whitespace-nowrap text-xs">د.ك</span>
                  </div>
                </div>

                <div className="text-[11px] text-slate-500 space-y-1">
                  <div>قاعدة العملة: <strong>1 د.ك = 1000 فلس</strong></div>
                  <div>المبلغ المقرب: <strong className="font-mono text-slate-800">{amount.toFixed(3)} د.ك</strong></div>
                </div>
              </div>

              {/* Tafqeet Words */}
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-slate-800 font-bold">التفقيط العربي (مبلغ وقدره بالحروف):</label>
                  {isManualWords ? (
                    <button
                      type="button"
                      onClick={handleResetWordsToAuto}
                      className="flex items-center gap-1 text-[10px] text-blue-600 font-bold hover:underline"
                    >
                      <RotateCcw className="w-3 h-3" />
                      استعادة التفقيط التلقائي
                    </button>
                  ) : (
                    <span className="text-[10px] text-emerald-700 font-bold">توليد آلي دقيق</span>
                  )}
                </div>
                <textarea
                  rows={2}
                  value={amountInWords}
                  onChange={(e) => {
                    setAmountInWords(e.target.value);
                    setIsManualWords(true);
                  }}
                  className="w-full p-2.5 border border-slate-300 bg-white rounded-xl text-xs font-serif leading-relaxed text-slate-900 font-bold"
                />
              </div>
            </div>

            {/* Dates: Issue & Due */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-700 font-bold mb-1">تاريخ تحرير الشيك:</label>
                <input
                  type="date"
                  value={issueDate}
                  onChange={(e) => setIssueDate(e.target.value)}
                  className="w-full p-2.5 border border-slate-300 rounded-xl text-xs font-mono font-bold"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">
                  تاريخ الاستحقاق (تاريخ الشيك المطبوع):
                </label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full p-2.5 border border-slate-300 rounded-xl text-xs font-mono font-bold text-blue-800"
                />
              </div>
            </div>

            {/* Purpose / البيان */}
            <div>
              <label className="block text-slate-700 font-bold mb-1">
                البيان والغرض من الصرف (Memo / Purpose):
              </label>
              <input
                type="text"
                placeholder="مثال: سداد إيجار شهر أكتوبر، مستخلص توريد مواد، مكافأة..."
                value={purpose}
                onChange={(e) => setPurpose(e.target.value)}
                className="w-full p-2.5 border border-slate-300 rounded-xl text-xs"
              />
            </div>

            {/* Buttons */}
            <div className="pt-3 border-t border-slate-100 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => handleSubmit(true)}
                className="flex-1 flex items-center justify-center gap-2 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-xs shadow-md transition"
              >
                <Printer className="w-4 h-4" />
                <span>حفظ ومعاينة الطباعة المباشرة</span>
              </button>

              <button
                type="button"
                onClick={() => handleSubmit(false)}
                className="flex items-center justify-center gap-2 px-5 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs shadow-md transition"
              >
                <Save className="w-4 h-4" />
                <span>حفظ في السجل</span>
              </button>
            </div>

          </div>
        </div>

        {/* Left: Live Visual Cheque Preview: 6 Cols on XL */}
        <div className="xl:col-span-6 space-y-4">
          <div className="bg-slate-900 text-white p-3.5 rounded-2xl flex flex-wrap justify-between items-center gap-2">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-xs font-bold">معاينة حية ومباشرة لشيك {activeAccount.bankName}</span>
            </div>
            
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono text-emerald-400 font-bold bg-slate-800 px-2.5 py-1 rounded-lg border border-slate-700">
                {currentWidthCm} × {currentHeightCm} سم ({currentWidthMm} × {currentHeightMm} مم)
              </span>
            </div>
          </div>

          {/* Cheque Graphic with Exact Dynamic Aspect Ratio */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm overflow-x-auto flex justify-center items-center">
            
            <div 
              style={{
                width: '100%',
                maxWidth: '576px',
                aspectRatio: `${currentWidthMm} / ${currentHeightMm}`,
              }}
              className="relative rounded-xl shadow-md select-none overflow-hidden border border-slate-300 bg-white"
            >
              {/* صورة الشيك الفعلية (المخصصة أو الافتراضية) */}
              <img 
                src={currentChequeImage}
                alt={`شيك ${activeAccount.bankName}`}
                className="absolute inset-0 w-full h-full object-fill pointer-events-none select-none z-0"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = '/cbk_cheque_template.jpg';
                }}
              />

              {/* 1. حقل التاريخ DATE */}
              <div 
                className="absolute flex items-center justify-center font-mono font-black text-slate-950 tracking-widest z-10 overflow-hidden"
                style={{
                  left: `${(previewDateLeft / currentWidthMm) * 100}%`,
                  top: `${(previewDateTop / currentHeightMm) * 100}%`,
                  width: `${(previewDateWidth / currentWidthMm) * 100}%`,
                  height: `${(previewDateHeight / currentHeightMm) * 100}%`,
                  fontSize: `${previewDateFontSize}px`,
                }}
                title="التاريخ"
              >
                <span className="w-full h-full flex items-center justify-center text-center font-black font-mono tracking-widest truncate select-none px-0.5">
                  {dayStr}/{monthStr}/{yearStr}
                </span>
              </div>

              {/* 2. حقل المستفيد PAYEE */}
              <div 
                className="absolute flex items-center font-serif font-black text-slate-950 px-1 z-10 overflow-hidden"
                dir="rtl"
                style={{
                  left: `${(previewPayeeLeft / currentWidthMm) * 100}%`,
                  top: `${(previewPayeeTop / currentHeightMm) * 100}%`,
                  width: `${(previewPayeeWidth / currentWidthMm) * 100}%`,
                  height: `${(previewPayeeHeight / currentHeightMm) * 100}%`,
                  fontSize: `${previewPayeeFontSize}px`,
                }}
                title="اسم المستفيد"
              >
                <span className="truncate block w-full text-right font-serif font-black text-slate-950">
                  {beneficiaryName || '...................................................'}
                </span>
              </div>

              {/* 3. حقل التفقيط WORDS */}
              <div 
                className="absolute flex items-center font-sans font-bold text-slate-900 px-1 z-10 overflow-hidden"
                dir="rtl"
                style={{
                  left: `${(previewWordsLeft / currentWidthMm) * 100}%`,
                  top: `${(previewWordsTop / currentHeightMm) * 100}%`,
                  width: `${(previewWordsWidth / currentWidthMm) * 100}%`,
                  height: `${(previewWordsHeight / currentHeightMm) * 100}%`,
                  fontSize: `${previewWordsFontSize}px`,
                }}
                title="المبلغ كتابة (التفقيط)"
              >
                <span 
                  className="line-clamp-2 break-words block w-full text-slate-950 font-serif font-bold text-right leading-tight max-h-full overflow-hidden"
                  style={{ fontSize: `${previewWordsFontSize}px`, lineHeight: 1.2 }}
                >
                  {amountInWords || '...................................................'}
                </span>
              </div>

              {/* 4. حقل المبلغ رقماً */}
              <div 
                className="absolute flex items-center justify-center font-mono font-black text-slate-950 z-10 overflow-hidden"
                style={{
                  left: `${(previewAmountLeft / currentWidthMm) * 100}%`,
                  top: `${(previewAmountTop / currentHeightMm) * 100}%`,
                  width: `${(previewAmountWidth / currentWidthMm) * 100}%`,
                  height: `${(previewAmountHeight / currentHeightMm) * 100}%`,
                  fontSize: `${previewAmountFontSize}px`,
                }}
                title="المبلغ رقماً"
              >
                <span 
                  className="w-full h-full flex items-center justify-center font-mono font-black text-slate-950 tracking-wider truncate text-center"
                  style={{ fontSize: `${previewAmountFontSize}px` }}
                >
                  {formatChequeAmount(amount)}
                </span>
              </div>

            </div>

          </div>

          {/* مستطيل رفع صورة الشيك وحفظها تحت المعاينة وضبطها لمقاس 9*18 سم تلقائياً */}
          <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                  <ImageIcon className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900">رفع صورة الشيك وضبط المقاس تلقائياً</h4>
                  <p className="text-[10px] text-slate-500">
                    ارفع أي صورة لشيك البنك وسيقوم النظام بضبطها تلقائياً لمقاس الشيك الفعلي 9 × 18 سم (180mm × 90mm)
                  </p>
                </div>
              </div>

              {printSettings.customChequeImageUrl && (
                <span className="bg-emerald-50 text-emerald-700 text-[10px] font-bold px-2 py-0.5 rounded border border-emerald-200 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                  <span>تم اعتماد صورة مخصصة</span>
                </span>
              )}
            </div>

            {/* أزرار رفع الصورة وحفظها */}
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <input
                type="file"
                ref={fileInputRef}
                accept="image/*"
                onChange={handleChequeImageUpload}
                className="hidden"
                id="cheque-image-upload-input"
              />

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-2 px-3.5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold shadow-xs transition"
              >
                <Upload className="w-4 h-4" />
                <span>رفع صورة الشيك (تلقائي 9×18 سم)</span>
              </button>

              {printSettings.customChequeImageUrl && (
                <button
                  type="button"
                  onClick={handleResetToDefaultImage}
                  className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-rose-50 hover:text-rose-700 text-slate-700 rounded-xl text-xs font-medium border border-slate-200 transition"
                  title="استعادة صورة الشيك الأصلية الافتراضية"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>استعادة الصورة الافتراضية</span>
                </button>
              )}

              {printSettings.customChequeImageName && (
                <span className="text-[11px] font-mono text-slate-500 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-200 truncate max-w-[200px]" title={printSettings.customChequeImageName}>
                  {printSettings.customChequeImageName}
                </span>
              )}
            </div>

            {uploadMessage && (
              <div className="text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-xl flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>{uploadMessage}</span>
              </div>
            )}
          </div>

          {/* مستطيل بيانات الشيك (بعيد عن صورة الشيك وتحت التصميم): الحساب، رقم الدفتر، رقم الشيك */}
          <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 shadow-2xs space-y-2.5">
            <div className="text-[11px] font-bold text-slate-700 flex items-center justify-between border-b border-slate-200/80 pb-2">
              <span className="flex items-center gap-1.5">
                <Landmark className="w-3.5 h-3.5 text-amber-600" />
                <span>بيانات الحساب والدفتر الخاصة بالشيك الحالي:</span>
              </span>
              <span className="text-[10px] font-mono text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-200">
                مقاس الشيك: 180mm × 90mm (9×18 سم)
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
              {/* الحساب البنكي */}
              <div className="bg-white p-2.5 rounded-xl border border-slate-200">
                <div className="text-[10px] text-slate-400 font-bold mb-0.5">الحساب البنكي المصدر</div>
                <div className="font-bold text-slate-800 text-[11px] truncate">
                  {activeAccount?.accountName || 'حساب البنك التجاري'}
                </div>
                <div className="text-[9.5px] font-mono text-slate-500 mt-0.5">
                  {activeAccount?.accountNumber || '-'}
                </div>
              </div>

              {/* رقم الدفتر */}
              <div className="bg-white p-2.5 rounded-xl border border-slate-200">
                <div className="text-[10px] text-slate-400 font-bold mb-0.5 flex items-center gap-1">
                  <BookOpen className="w-3 h-3 text-slate-400" />
                  <span>دفتر الشيكات</span>
                </div>
                <div className="font-bold text-slate-800 text-[11px] truncate">
                  {activeBook?.bookName || 'دفتر التجاري'}
                </div>
                <div className="text-[9.5px] font-mono text-slate-500 mt-0.5">
                  كود: {activeBook?.bookCode || '-'}
                </div>
              </div>

              {/* رقم الشيك التسلسلي */}
              <div className="bg-white p-2.5 rounded-xl border border-slate-200">
                <div className="text-[10px] text-slate-400 font-bold mb-0.5 flex items-center gap-1">
                  <Hash className="w-3 h-3 text-slate-400" />
                  <span>رقم الشيك التسلسلي</span>
                </div>
                <div className="font-mono font-black text-blue-700 text-sm">
                  {String(chequeSerial).padStart(8, '0')}
                </div>
                <div className="text-[9.5px] text-slate-500 mt-0.5">
                  المتبقي بالدفتر: {activeBook ? (activeBook.serialTo - chequeSerial + 1) : '-'} ورقة
                </div>
              </div>
            </div>
          </div>

          {/* Helper details */}
          <div className="bg-emerald-50 border border-emerald-200 p-3 rounded-2xl text-xs text-emerald-950 space-y-1">
            <div className="font-bold flex items-center gap-1.5 text-emerald-900">
              <AlertCircle className="w-4 h-4 text-emerald-600" />
              <span>ملاحظات الإصدار والطباعة المعتمدة:</span>
            </div>
            <p className="text-[11px] text-emerald-800 leading-relaxed">
              تمت معايرة تصميم شيك البنك التجاري الكويتي (CBK) وفق الأبعاد المعتمدة 180mm × 90mm (عرض 18 سم وارتفاع 9 سم) مع التفقيط التلقائي الدقيق بالدينار الكويتي وخيارات الطباعة المباشرة على ورقة الشيك.
            </p>
          </div>
        </div>

      </div>

    </div>
  );
}
