import React, { useState, useEffect } from 'react';
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
  Image as ImageIcon
} from 'lucide-react';
import { BankAccount, ChequeBook, Beneficiary, IssuedCheque, ChequePrintSettings } from '../../types';
import { tafqeetKwd, tafqeetKwdEn } from '../../utils/tafqeetKwd';

interface IssueChequeFormProps {
  bankAccounts: BankAccount[];
  chequeBooks: ChequeBook[];
  beneficiaries: Beneficiary[];
  selectedAccountId: string;
  onSelectAccount: (accId: string) => void;
  printSettings: ChequePrintSettings;
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

  // Form State
  const [selectedBookId, setSelectedBookId] = useState<string>(activeBook?.id || '');
  const [chequeSerial, setChequeSerial] = useState<number>(activeBook?.currentSerial || 100001);
  const [selectedBeneficiaryId, setSelectedBeneficiaryId] = useState<string>(prefillBeneficiaryId || '');
  const [beneficiaryName, setBeneficiaryName] = useState<string>('');
  const [amount, setAmount] = useState<number>(1000.000);
  const [tafqeetLang, setTafqeetLang] = useState<'ar' | 'en'>('ar');
  const [amountInWords, setAmountInWords] = useState<string>(tafqeetKwd(1000.000));
  const [isManualWords, setIsManualWords] = useState<boolean>(false);
  const [showRealImagePreview, setShowRealImagePreview] = useState<boolean>(false);
  const [issueDate, setIssueDate] = useState<string>(todayStr);
  const [dueDate, setDueDate] = useState<string>(todayStr);
  const [isCrossed, setIsCrossed] = useState<boolean>(false); // غير مطلوب طباعتها لأنها مطبوعة مسبقاً
  const [bearerCrossed, setBearerCrossed] = useState<boolean>(printSettings.defaultBearerCrossing ?? true);
  const [purpose, setPurpose] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [saveAsBeneficiary, setSaveAsBeneficiary] = useState<boolean>(false);
  const [successMessage, setSuccessMessage] = useState<string>('');

  // Synchronize when account changes
  useEffect(() => {
    const books = chequeBooks.filter((b) => b.bankAccountId === effectiveAccountId && b.status === 'active');
    if (books.length > 0) {
      setSelectedBookId(books[0].id);
      setChequeSerial(books[0].currentSerial);
    }
  }, [effectiveAccountId, chequeBooks]);

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
      isCrossed: false, // لا تطبع جملة Account Payee Only بخطين
      bearerCrossed,
      purpose: purpose.trim(),
      notes: notes.trim(),
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
            <div className="grid grid-cols-2 gap-3">
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

            {/* Cheque Flags: Crossing & Bearer Crossing */}
            <div className="grid grid-cols-2 gap-3 pt-1">
              <label className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl flex items-center gap-2 cursor-pointer hover:bg-slate-100 transition">
                <input
                  type="checkbox"
                  checked={isCrossed}
                  onChange={(e) => setIsCrossed(e.target.checked)}
                  className="rounded text-blue-600"
                />
                <div>
                  <span className="font-bold text-slate-800 block">تسطير الشيك (//)</span>
                  <span className="text-[10px] text-slate-500">للمستفيد الأول فقط (A/C Payee)</span>
                </div>
              </label>

              <label className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl flex items-center gap-2 cursor-pointer hover:bg-slate-100 transition">
                <input
                  type="checkbox"
                  checked={bearerCrossed}
                  onChange={(e) => setBearerCrossed(e.target.checked)}
                  className="rounded text-blue-600"
                />
                <div>
                  <span className="font-bold text-slate-800 block">شطب عبارة "أو لحامله"</span>
                  <span className="text-[10px] text-slate-500">يصرف فقط للاسم المدون</span>
                </div>
              </label>
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
                <span>حفظ ومعاينة الطباعة</span>
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
              <span className="text-xs font-bold">معاينة حية ومباشرة لشيك البنك التجاري الكويتي (CBK)</span>
            </div>
            
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowRealImagePreview(!showRealImagePreview)}
                className={`text-[11px] font-bold px-2.5 py-1 rounded-lg transition border flex items-center gap-1 ${
                  showRealImagePreview
                    ? 'bg-emerald-600 text-white border-emerald-500'
                    : 'bg-slate-800 text-slate-300 border-slate-700 hover:text-white'
                }`}
                title="إظهار صورة الشيك الفعلي المقصوصة كخلفية"
              >
                <ImageIcon className="w-3.5 h-3.5" />
                <span>صورة الشيك الفعلية</span>
              </button>
              <span className="text-[10px] font-mono text-emerald-400 font-bold bg-slate-800 px-2 py-0.5 rounded border border-slate-700">
                178mm × 82mm
              </span>
            </div>
          </div>

          {/* Cheque Graphic with Exact 178mm x 82mm Aspect Ratio */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm overflow-x-auto flex justify-center items-center">
            
            <div 
              className="w-[580px] h-[268px] relative rounded-xl shadow-md p-3 select-none flex flex-col justify-between overflow-hidden border border-emerald-800/30"
              style={
                showRealImagePreview
                  ? {
                      backgroundImage: `url('/cbk_cheque_template.jpg')`,
                      backgroundSize: '100% 100%',
                      backgroundPosition: 'center',
                      backgroundRepeat: 'no-repeat',
                    }
                  : {
                      backgroundColor: '#f4faf7',
                    }
              }
            >
              
              {/* If real image is toggled off, show the vector representation */}
              {!showRealImagePreview && (
                <>
                  <div 
                    className="absolute inset-0 pointer-events-none opacity-20"
                    style={{
                      backgroundImage: `radial-gradient(#00875A 0.75px, transparent 0.75px), radial-gradient(#00875A 0.75px, #f4faf7 0.75px)`,
                      backgroundSize: '10px 10px',
                      backgroundPosition: '0 0, 5px 5px',
                    }}
                  />
                  <div className="flex justify-end items-start pl-8">
                    <div className="flex items-center gap-1.5 text-right">
                      <div>
                        <div className="flex items-center justify-end gap-1 leading-none">
                          <span className="text-[10px] font-bold font-sans text-[#00875A]">Al-Tijari</span>
                          <span className="text-sm font-black font-serif text-[#00875A]">التجاري</span>
                        </div>
                        <div className="text-[6.5px] font-bold text-[#00875A]/90 mt-0.5">
                          البنك التجاري الكويتي (ش.م.ك.ع)
                        </div>
                      </div>
                      <svg viewBox="0 0 100 100" className="w-6 h-6 text-[#00875A]" fill="currentColor">
                        <path d="M50 0 L58 35 L95 20 L68 50 L95 80 L58 65 L50 100 L42 65 L5 80 L32 50 L5 20 L42 35 Z" />
                      </svg>
                    </div>
                  </div>
                </>
              )}

              {/* 1. Date Field (التاريخ) */}
              <div 
                className="absolute flex items-center justify-center font-mono font-black text-slate-950 text-[11.5px] tracking-wider"
                style={{
                  right: '34px',
                  top: '84px',
                  width: '120px',
                }}
              >
                <span className="bg-white/70 px-1.5 py-0.5 rounded shadow-2xs border border-slate-300">
                  {dayStr}/{monthStr}/{yearStr}
                </span>
              </div>

              {/* 2. Beneficiary Field (إدفعوا لأمر) */}
              <div 
                className="absolute flex items-center font-serif font-black text-slate-950 text-[13px] px-1 truncate"
                style={{
                  left: '110px',
                  top: '112px',
                  width: '360px',
                }}
              >
                <span className="bg-white/80 px-2 py-0.5 rounded shadow-2xs border border-slate-300/80 truncate block w-full text-right">
                  {beneficiaryName || '...................................................'}
                </span>
              </div>

              {/* 3. Amount in Words / Tafqeet (دينار كويتي) */}
              <div 
                className="absolute flex items-center font-sans font-bold text-slate-900 text-[11px] leading-tight px-1"
                style={{
                  left: '110px',
                  top: '146px',
                  width: '260px',
                }}
              >
                <span className="bg-white/80 px-2 py-0.5 rounded shadow-2xs border border-slate-300/80 truncate block w-full">
                  {amountInWords || '...................................................'}
                </span>
              </div>

              {/* 4. Amount in Digits with single # at both ends (KD Box) */}
              <div 
                className="absolute flex items-center justify-center font-mono font-black text-slate-950 text-[13.5px] tracking-wider"
                style={{
                  right: '30px',
                  top: '144px',
                  width: '140px',
                  height: '34px',
                }}
              >
                <span className="bg-white px-3 py-1 rounded shadow-xs border-2 border-[#00875A] font-black">
                  #{amount.toFixed(3)}#
                </span>
              </div>

            </div>

          </div>

          {/* Helper details */}
          <div className="bg-emerald-50 border border-emerald-200 p-3 rounded-2xl text-xs text-emerald-950 space-y-1">
            <div className="font-bold flex items-center gap-1.5 text-emerald-900">
              <AlertCircle className="w-4 h-4 text-emerald-600" />
              <span>ملاحظات الإصدار والطباعة وفق المقاسات المعتمدة:</span>
            </div>
            <p className="text-[11px] text-emerald-800 leading-relaxed">
              تمت معايرة تصميم شيك البنك التجاري الكويتي (CBK) وفق الأبعاد الرسمية (178mm × 82mm) مع دعم التفقيط بالعربية والإنجليزية وخيارات الطباعة على الورق الفعلي أو ورقة A4.
            </p>
          </div>
        </div>

      </div>

    </div>
  );
}
