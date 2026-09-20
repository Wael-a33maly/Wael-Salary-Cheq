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
  AlertCircle
} from 'lucide-react';
import { BankAccount, ChequeBook, Beneficiary, IssuedCheque, ChequePrintSettings } from '../../types';
import { tafqeetKwd } from '../../utils/tafqeetKwd';

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
  const [amountInWords, setAmountInWords] = useState<string>('');
  const [isManualWords, setIsManualWords] = useState<boolean>(false);
  const [issueDate, setIssueDate] = useState<string>(todayStr);
  const [dueDate, setDueDate] = useState<string>(todayStr);
  const [isCrossed, setIsCrossed] = useState<boolean>(printSettings.defaultCrossing ?? true);
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

  // Auto-generate Tafqeet when amount changes (unless user manually modified)
  useEffect(() => {
    if (!isManualWords) {
      setAmountInWords(tafqeetKwd(amount));
    }
  }, [amount, isManualWords]);

  const handleAmountChange = (val: number) => {
    setAmount(val);
    if (!isManualWords) {
      setAmountInWords(tafqeetKwd(val));
    }
  };

  const handleResetWordsToAuto = () => {
    setIsManualWords(false);
    setAmountInWords(tafqeetKwd(amount));
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
      amountInWordsAr: amountInWords || tafqeetKwd(amount),
      issueDate,
      dueDate,
      status: 'issued',
      isCrossed,
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
          <div className="bg-slate-900 text-white p-4 rounded-2xl flex justify-between items-center">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-xs font-bold">معاينة حية ومباشرة لشيك البنك التجاري الكويتي (CBK)</span>
            </div>
            <span className="text-[11px] font-mono text-amber-400 font-bold">Live Preview</span>
          </div>

          {/* Cheque Graphic */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm overflow-x-auto flex justify-center items-center">
            
            <div className="w-[620px] h-[270px] relative bg-gradient-to-br from-amber-50/70 via-white to-amber-50/50 border-2 border-amber-900/60 rounded-xl shadow-lg p-4 select-none flex flex-col justify-between">
              
              {/* Pattern Simulation */}
              <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[radial-gradient(#92400e_1px,transparent_1px)] [background-size:10px_10px]" />

              {/* Crossing Lines Top Left */}
              {isCrossed && (
                <div className="absolute top-2 left-4 z-20 border-l-2 border-r-2 border-slate-800 h-14 w-24 -rotate-12 flex flex-col justify-center items-center text-[8px] font-black uppercase tracking-wider text-slate-900">
                  <div className="bg-white/80 px-1 whitespace-nowrap">A/C PAYEE ONLY</div>
                  <div className="bg-white/80 px-1 whitespace-nowrap text-[7px] font-sans">
                    للمستفيد الأول فقط
                  </div>
                </div>
              )}

              {/* Header */}
              <div className="flex justify-between items-start border-b border-amber-900/20 pb-2">
                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 rounded-full border border-amber-800 flex items-center justify-center bg-amber-700 text-white font-serif font-black text-sm">
                    ★
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-amber-950 font-serif leading-tight">
                      البنك التجاري الكويتي
                    </h3>
                    <div className="text-[9px] font-bold text-amber-900 uppercase font-sans">
                      Commercial Bank of Kuwait
                    </div>
                    <div className="text-[8px] text-amber-800/80 font-mono">
                      {activeAccount.branchName}
                    </div>
                  </div>
                </div>

                {/* Serial and Date */}
                <div className="text-left space-y-1">
                  <div className="flex items-center justify-end gap-1.5">
                    <span className="text-[9px] font-bold text-amber-900">رقم الشيك:</span>
                    <span className="font-mono font-black text-xs text-slate-900 bg-amber-100/70 px-1.5 py-0.5 rounded border border-amber-300">
                      {String(chequeSerial).padStart(8, '0')}
                    </span>
                  </div>

                  <div className="flex items-center justify-end gap-1 text-[10px] font-mono">
                    <span className="text-[9px] text-amber-900 font-bold ml-1">التاريخ:</span>
                    <div className="flex items-center gap-0.5">
                      <div className="w-4 h-5 bg-white border border-amber-900/40 flex items-center justify-center font-bold text-slate-900 text-xs">
                        {dayStr[0]}
                      </div>
                      <div className="w-4 h-5 bg-white border border-amber-900/40 flex items-center justify-center font-bold text-slate-900 text-xs">
                        {dayStr[1]}
                      </div>
                    </div>
                    <span>/</span>
                    <div className="flex items-center gap-0.5">
                      <div className="w-4 h-5 bg-white border border-amber-900/40 flex items-center justify-center font-bold text-slate-900 text-xs">
                        {monthStr[0]}
                      </div>
                      <div className="w-4 h-5 bg-white border border-amber-900/40 flex items-center justify-center font-bold text-slate-900 text-xs">
                        {monthStr[1]}
                      </div>
                    </div>
                    <span>/</span>
                    <div className="flex items-center gap-0.5">
                      <div className="w-4 h-5 bg-white border border-amber-900/40 flex items-center justify-center font-bold text-slate-900 text-xs">
                        {yearStr[0]}
                      </div>
                      <div className="w-4 h-5 bg-white border border-amber-900/40 flex items-center justify-center font-bold text-slate-900 text-xs">
                        {yearStr[1]}
                      </div>
                      <div className="w-4 h-5 bg-white border border-amber-900/40 flex items-center justify-center font-bold text-slate-900 text-xs">
                        {yearStr[2]}
                      </div>
                      <div className="w-4 h-5 bg-white border border-amber-900/40 flex items-center justify-center font-bold text-slate-900 text-xs">
                        {yearStr[3]}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Body */}
              <div className="space-y-2 py-1">
                {/* Payee */}
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-bold text-amber-950 whitespace-nowrap">
                    ادفعوا لأمر:
                  </span>
                  <div className="flex-1 relative border-b border-slate-700/60 pb-0.5">
                    <span className="text-xs font-black text-slate-950 font-serif px-1">
                      {beneficiaryName || '...................................................'}
                    </span>
                    {bearerCrossed && (
                      <span className="absolute left-0 top-0.5 text-[9px] font-bold text-slate-800 line-through decoration-rose-600">
                        أو لحامله
                      </span>
                    )}
                  </div>
                </div>

                {/* Words of Sum & Box */}
                <div className="flex items-start gap-1.5">
                  <span className="text-[10px] font-bold text-amber-950 whitespace-nowrap pt-0.5">
                    مبلغ وقدره:
                  </span>
                  <div className="flex-1 border-b border-slate-700/60 pb-0.5">
                    <span className="text-[11px] font-black text-slate-900 font-serif leading-tight px-1">
                      {amountInWords || '...................................................'}
                    </span>
                  </div>

                  {/* Amount Box */}
                  <div className="mr-1 min-w-[130px] h-9 bg-amber-100/60 border border-amber-900/60 rounded px-2 flex items-center justify-between">
                    <span className="text-[9px] font-black text-amber-950">د.ك</span>
                    <span className="text-xs font-mono font-black text-slate-950">
                      #{amount.toFixed(3)}#
                    </span>
                  </div>
                </div>
              </div>

              {/* Bottom Row */}
              <div className="flex justify-between items-end pt-1">
                <div className="text-[9px] text-slate-600 max-w-[220px] truncate">
                  {purpose ? `البيان: ${purpose}` : `حساب رقم: ${activeAccount.accountNumber}`}
                </div>

                <div className="text-center w-36">
                  <div className="h-6 border-b border-slate-700/70 mb-0.5" />
                  <div className="text-[8px] font-bold text-amber-950">
                    التوقيع المعتمد / Authorized Signature
                  </div>
                </div>
              </div>

              {/* MICR Line */}
              <div className="pt-1 border-t border-amber-900/20 text-center font-mono text-[10px] tracking-[0.2em] text-slate-900 font-bold select-all">
                ⑈ {String(chequeSerial).padStart(8, '0')} ⑈ 019 ⑈ {activeAccount.accountNumber} ⑈ 01
              </div>

            </div>

          </div>

          {/* Helper details */}
          <div className="bg-amber-50 border border-amber-200 p-3 rounded-2xl text-xs text-amber-900 space-y-1">
            <div className="font-bold flex items-center gap-1.5">
              <AlertCircle className="w-4 h-4 text-amber-600" />
              <span>ملاحظات الإصدار والطباعة:</span>
            </div>
            <p className="text-[11px] text-amber-800 leading-relaxed">
              عند النقر على "حفظ ومعاينة الطباعة"، سيتم فتح شاشة الطباعة المخصصة مع خيارين: إما طباعة السند والشيك كاملاً لملف الأرشيف المحاسبي، أو الطباعة المباشرة على ورقة الشيك الفعلي الصادرة من البنك التجاري الكويتي مع ضبط الملليمترات بدقة.
            </p>
          </div>
        </div>

      </div>

    </div>
  );
}
