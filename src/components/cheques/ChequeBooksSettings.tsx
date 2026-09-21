import React, { useState } from 'react';
import { 
  BookOpen, 
  Landmark, 
  Plus, 
  Edit3, 
  Trash2, 
  CheckCircle2, 
  Sliders, 
  Save,
  Building
} from 'lucide-react';
import { BankAccount, ChequeBook, ChequePrintSettings } from '../../types';

interface ChequeBooksSettingsProps {
  bankAccounts: BankAccount[];
  chequeBooks: ChequeBook[];
  printSettings: ChequePrintSettings;
  onAddAccount: (account: Omit<BankAccount, 'id'>) => void;
  onUpdateAccount: (account: BankAccount) => void;
  onAddChequeBook: (book: Omit<ChequeBook, 'id'>) => void;
  onUpdateChequeBook: (book: ChequeBook) => void;
  onUpdatePrintSettings: (settings: ChequePrintSettings) => void;
}

export function ChequeBooksSettings({
  bankAccounts,
  chequeBooks,
  printSettings,
  onAddAccount,
  onUpdateAccount,
  onAddChequeBook,
  onUpdateChequeBook,
  onUpdatePrintSettings,
}: ChequeBooksSettingsProps) {
  // Modal states
  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<BankAccount | null>(null);
  const [accountForm, setAccountForm] = useState({
    accountName: '',
    bankName: 'البنك التجاري الكويتي (CBK)',
    bankCode: 'CBK' as BankAccount['bankCode'],
    accountNumber: '',
    iban: '',
    branchName: '',
    currency: 'د.ك',
    currentBalance: 10000.000,
    isDefault: false,
    status: 'active' as BankAccount['status'],
    chequeTemplate: 'CBK' as BankAccount['chequeTemplate'],
  });

  const [isBookModalOpen, setIsBookModalOpen] = useState(false);
  const [editingBook, setEditingBook] = useState<ChequeBook | null>(null);
  const [bookForm, setBookForm] = useState({
    bankAccountId: bankAccounts[0]?.id || '',
    bookCode: '',
    bookName: '',
    serialFrom: 100001,
    serialTo: 100050,
    totalLeaves: 50,
    currentSerial: 100001,
    receivedDate: new Date().toISOString().split('T')[0],
    status: 'active' as ChequeBook['status'],
    notes: '',
  });

  const [settingsForm, setSettingsForm] = useState<ChequePrintSettings>({ ...printSettings });
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Open Account Modal
  const handleOpenAddAccount = () => {
    setEditingAccount(null);
    setAccountForm({
      accountName: '',
      bankName: 'البنك التجاري الكويتي (CBK)',
      bankCode: 'CBK',
      accountNumber: '',
      iban: 'KW',
      branchName: 'الفرع الرئيسي',
      currency: 'د.ك',
      currentBalance: 10000.000,
      isDefault: false,
      status: 'active',
      chequeTemplate: 'CBK',
    });
    setIsAccountModalOpen(true);
  };

  const handleOpenEditAccount = (acc: BankAccount) => {
    setEditingAccount(acc);
    setAccountForm({ ...acc });
    setIsAccountModalOpen(true);
  };

  const handleSaveAccount = (e: React.FormEvent) => {
    e.preventDefault();
    if (!accountForm.accountName || !accountForm.accountNumber) return;

    if (editingAccount) {
      onUpdateAccount({ ...editingAccount, ...accountForm });
    } else {
      onAddAccount(accountForm);
    }
    setIsAccountModalOpen(false);
  };

  // Open Book Modal
  const handleOpenAddBook = () => {
    setEditingBook(null);
    setBookForm({
      bankAccountId: bankAccounts[0]?.id || '',
      bookCode: `BK-CBK-${new Date().getFullYear()}-01`,
      bookName: 'دفتر شيكات جديد (50 ورقة)',
      serialFrom: 100101,
      serialTo: 100150,
      totalLeaves: 50,
      currentSerial: 100101,
      receivedDate: new Date().toISOString().split('T')[0],
      status: 'active',
      notes: '',
    });
    setIsBookModalOpen(true);
  };

  const handleOpenEditBook = (b: ChequeBook) => {
    setEditingBook(b);
    setBookForm({
      bankAccountId: b.bankAccountId,
      bookCode: b.bookCode,
      bookName: b.bookName,
      serialFrom: b.serialFrom,
      serialTo: b.serialTo,
      totalLeaves: b.totalLeaves,
      currentSerial: b.currentSerial,
      receivedDate: b.receivedDate,
      status: b.status,
      notes: b.notes || '',
    });
    setIsBookModalOpen(true);
  };

  const handleSaveBook = (e: React.FormEvent) => {
    e.preventDefault();
    if (!bookForm.bookName || !bookForm.serialFrom || !bookForm.serialTo) return;

    const total = Math.max(1, bookForm.serialTo - bookForm.serialFrom + 1);
    const updatedForm = { ...bookForm, totalLeaves: total };

    if (editingBook) {
      onUpdateChequeBook({ ...editingBook, ...updatedForm });
    } else {
      onAddChequeBook(updatedForm);
    }
    setIsBookModalOpen(false);
  };

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdatePrintSettings(settingsForm);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  return (
    <div className="space-y-6">
      
      {/* Title Bar */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-slate-900">
            إعدادات الحسابات البنكية وتتبع دفاتر الشيكات
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            تعريف حسابات البنوك، دفاتر الشيكات وتسلسل الأرقام (من رقم كذا إلى رقم كذا)، وإعدادات ومعايرة الطباعة
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleOpenAddAccount}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-xl text-xs transition"
          >
            <Landmark className="w-4 h-4 text-blue-600" />
            <span>إضافة حساب بنكي</span>
          </button>

          <button
            type="button"
            onClick={handleOpenAddBook}
            className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-xs shadow-md transition"
          >
            <Plus className="w-4 h-4" />
            <span>إضافة دفتر شيكات جديد</span>
          </button>
        </div>
      </div>

      {saveSuccess && (
        <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-xl text-emerald-800 text-xs flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span className="font-bold">تم حفظ إعدادات ومعايرة طباعة الشيكات بنجاح!</span>
        </div>
      )}

      {/* Grid: 2 Columns */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left: Cheque Books Table (7 Cols) */}
        <div className="lg:col-span-7 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex justify-between items-center border-b border-slate-100 pb-3">
            <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-amber-600" />
              <span>دفاتر الشيكات المسجلة وحصص التسلسل</span>
            </h3>
            <span className="text-xs font-mono text-slate-500">{chequeBooks.length} دفاتر</span>
          </div>

          <div className="space-y-3">
            {chequeBooks.map((book) => {
              const acc = bankAccounts.find((a) => a.id === book.bankAccountId);
              return (
                <div
                  key={book.id}
                  className="p-4 rounded-2xl border border-slate-200 bg-slate-50/50 hover:bg-slate-50 transition space-y-2"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-black text-slate-900 text-xs">{book.bookName}</h4>
                        <span className="bg-amber-100 text-amber-900 font-mono text-[10px] font-bold px-2 py-0.5 rounded">
                          {book.bookCode}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        الحساب: {acc?.bankName || 'البنك'} ({acc?.accountNumber})
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleOpenEditBook(book)}
                      className="p-1.5 text-slate-400 hover:text-blue-600 rounded-lg transition"
                      title="تعديل الدفتر"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Serial Details */}
                  <div className="grid grid-cols-3 gap-2 bg-white p-2.5 rounded-xl border border-slate-200 text-center font-mono text-xs">
                    <div>
                      <span className="text-[10px] text-slate-400 block">من رقم شيك:</span>
                      <strong className="text-slate-900 font-bold">{book.serialFrom}</strong>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block">إلى رقم شيك:</span>
                      <strong className="text-slate-900 font-bold">{book.serialTo}</strong>
                    </div>
                    <div>
                      <span className="text-[10px] text-amber-700 block font-bold">الشيك التالي:</span>
                      <strong className="text-amber-800 font-black">{book.currentSerial}</strong>
                    </div>
                  </div>

                  <div className="flex justify-between items-center text-[10px] text-slate-400 font-mono">
                    <span>تاريخ الاستلام: {book.receivedDate}</span>
                    <span>إجمالي الأوراق: {book.totalLeaves} ورقة</span>
                    <span className="text-emerald-700 font-bold">
                      {book.status === 'active' ? 'نشط ومفعل' : 'مكتمل'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: Bank Accounts List & Printer Calibration (5 Cols) */}
        <div className="lg:col-span-5 space-y-6">
          
          {/* Bank Accounts */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
            <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2 border-b border-slate-100 pb-2">
              <Landmark className="w-4 h-4 text-blue-600" />
              <span>الحسابات البنكية المعتمدة</span>
            </h3>

            <div className="space-y-2.5">
              {bankAccounts.map((acc) => (
                <div
                  key={acc.id}
                  className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex justify-between items-center text-xs"
                >
                  <div>
                    <div className="font-bold text-slate-900">{acc.bankName}</div>
                    <div className="text-[11px] text-slate-500 font-mono">
                      رقم: {acc.accountNumber} | الرصيد: {acc.currentBalance.toFixed(3)} د.ك
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleOpenEditAccount(acc)}
                    className="p-1.5 text-slate-400 hover:text-blue-600 rounded-lg transition"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Printer Calibration Settings */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2 border-b border-slate-100 pb-2">
              <Sliders className="w-4 h-4 text-amber-600" />
              <span>إعدادات معايرة طباعة الشيكات الافتراضية</span>
            </h3>

            <form onSubmit={handleSaveSettings} className="space-y-4 text-xs">
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                <span className="font-bold text-slate-800 block mb-2">إزاحة الشيك ككل (Global Offset):</span>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-600 font-medium mb-1">
                      الإزاحة الأفقية X (mm):
                    </label>
                    <input
                      type="number"
                      step="0.5"
                      value={settingsForm.offsetX}
                      onChange={(e) => setSettingsForm({ ...settingsForm, offsetX: parseFloat(e.target.value) || 0 })}
                      className="w-full p-2 border border-slate-300 rounded-lg font-mono font-bold bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-600 font-medium mb-1">
                      الإزاحة الرأسية Y (mm):
                    </label>
                    <input
                      type="number"
                      step="0.5"
                      value={settingsForm.offsetY}
                      onChange={(e) => setSettingsForm({ ...settingsForm, offsetY: parseFloat(e.target.value) || 0 })}
                      className="w-full p-2 border border-slate-300 rounded-lg font-mono font-bold bg-white"
                    />
                  </div>
                </div>
              </div>

              {/* ضبط الحقول المنفردة */}
              <div className="bg-emerald-50/50 p-3 rounded-xl border border-emerald-200 space-y-3">
                <span className="font-bold text-emerald-900 block">معايرة كل حقل منفرداً (أعلى/أسفل/يمين/يسار):</span>
                
                {/* التاريخ */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-700 font-medium mb-1">حقل التاريخ X (mm):</label>
                    <input
                      type="number"
                      step="0.5"
                      value={settingsForm.dateOffsetX || 0}
                      onChange={(e) => setSettingsForm({ ...settingsForm, dateOffsetX: parseFloat(e.target.value) || 0 })}
                      className="w-full p-1.5 border border-slate-300 rounded-lg font-mono bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-700 font-medium mb-1">حقل التاريخ Y (mm):</label>
                    <input
                      type="number"
                      step="0.5"
                      value={settingsForm.dateOffsetY || 0}
                      onChange={(e) => setSettingsForm({ ...settingsForm, dateOffsetY: parseFloat(e.target.value) || 0 })}
                      className="w-full p-1.5 border border-slate-300 rounded-lg font-mono bg-white"
                    />
                  </div>
                </div>

                {/* المستفيد */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-700 font-medium mb-1">حقل المستفيد X (mm):</label>
                    <input
                      type="number"
                      step="0.5"
                      value={settingsForm.payeeOffsetX || 0}
                      onChange={(e) => setSettingsForm({ ...settingsForm, payeeOffsetX: parseFloat(e.target.value) || 0 })}
                      className="w-full p-1.5 border border-slate-300 rounded-lg font-mono bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-700 font-medium mb-1">حقل المستفيد Y (mm):</label>
                    <input
                      type="number"
                      step="0.5"
                      value={settingsForm.payeeOffsetY || 0}
                      onChange={(e) => setSettingsForm({ ...settingsForm, payeeOffsetY: parseFloat(e.target.value) || 0 })}
                      className="w-full p-1.5 border border-slate-300 rounded-lg font-mono bg-white"
                    />
                  </div>
                </div>

                {/* التفقيط */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-700 font-medium mb-1">حقل التفقيط X (mm):</label>
                    <input
                      type="number"
                      step="0.5"
                      value={settingsForm.wordsOffsetX || 0}
                      onChange={(e) => setSettingsForm({ ...settingsForm, wordsOffsetX: parseFloat(e.target.value) || 0 })}
                      className="w-full p-1.5 border border-slate-300 rounded-lg font-mono bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-700 font-medium mb-1">حقل التفقيط Y (mm):</label>
                    <input
                      type="number"
                      step="0.5"
                      value={settingsForm.wordsOffsetY || 0}
                      onChange={(e) => setSettingsForm({ ...settingsForm, wordsOffsetY: parseFloat(e.target.value) || 0 })}
                      className="w-full p-1.5 border border-slate-300 rounded-lg font-mono bg-white"
                    />
                  </div>
                </div>

                {/* المبلغ بالأرقام */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-700 font-medium mb-1">حقل المبلغ بالأرقام X (mm):</label>
                    <input
                      type="number"
                      step="0.5"
                      value={settingsForm.amountOffsetX || 0}
                      onChange={(e) => setSettingsForm({ ...settingsForm, amountOffsetX: parseFloat(e.target.value) || 0 })}
                      className="w-full p-1.5 border border-slate-300 rounded-lg font-mono bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-700 font-medium mb-1">حقل المبلغ بالأرقام Y (mm):</label>
                    <input
                      type="number"
                      step="0.5"
                      value={settingsForm.amountOffsetY || 0}
                      onChange={(e) => setSettingsForm({ ...settingsForm, amountOffsetY: parseFloat(e.target.value) || 0 })}
                      className="w-full p-1.5 border border-slate-300 rounded-lg font-mono bg-white"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2 pt-1">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settingsForm.defaultBearerCrossing}
                    onChange={(e) => setSettingsForm({ ...settingsForm, defaultBearerCrossing: e.target.checked })}
                    className="rounded text-emerald-600"
                  />
                  <span className="text-slate-700 font-bold">شطب عبارة "أو لحامله" تلقائياً</span>
                </label>
              </div>

              <button
                type="submit"
                className="w-full flex items-center justify-center gap-2 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs shadow-md transition mt-2"
              >
                <Save className="w-4 h-4" />
                <span>حفظ إعدادات المعايرة</span>
              </button>
            </form>
          </div>

        </div>

      </div>

      {/* Account Modal */}
      {isAccountModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl border border-slate-200 space-y-4">
            <h4 className="font-black text-slate-900 text-base">
              {editingAccount ? 'تعديل بيانات الحساب البنكي' : 'إضافة حساب بنكي جديد'}
            </h4>
            <form onSubmit={handleSaveAccount} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-700 font-bold mb-1">اسم الحساب في النظام:</label>
                <input
                  type="text"
                  required
                  placeholder="مثال: حساب العمليات - البنك التجاري"
                  value={accountForm.accountName}
                  onChange={(e) => setAccountForm({ ...accountForm, accountName: e.target.value })}
                  className="w-full p-2 border border-slate-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">اسم البنك المعتمد:</label>
                <input
                  type="text"
                  required
                  value={accountForm.bankName}
                  onChange={(e) => setAccountForm({ ...accountForm, bankName: e.target.value })}
                  className="w-full p-2 border border-slate-300 rounded-lg"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">رقم الحساب:</label>
                  <input
                    type="text"
                    required
                    value={accountForm.accountNumber}
                    onChange={(e) => setAccountForm({ ...accountForm, accountNumber: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded-lg font-mono"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">الرصيد الافتتاحي (د.ك):</label>
                  <input
                    type="number"
                    step="0.001"
                    value={accountForm.currentBalance}
                    onChange={(e) => setAccountForm({ ...accountForm, currentBalance: parseFloat(e.target.value) || 0 })}
                    className="w-full p-2 border border-slate-300 rounded-lg font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">الآيبان الدولي (IBAN):</label>
                <input
                  type="text"
                  value={accountForm.iban}
                  onChange={(e) => setAccountForm({ ...accountForm, iban: e.target.value })}
                  className="w-full p-2 border border-slate-300 rounded-lg font-mono"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAccountModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 text-slate-700 font-bold rounded-xl text-xs"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 text-white font-bold rounded-xl text-xs"
                >
                  حفظ الحساب
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Cheque Book Modal */}
      {isBookModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl border border-slate-200 space-y-4">
            <h4 className="font-black text-slate-900 text-base">
              {editingBook ? 'تعديل بيانات دفتر الشيكات' : 'إضافة دفتر شيكات بنكي جديد'}
            </h4>
            <form onSubmit={handleSaveBook} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-700 font-bold mb-1">الحساب البنكي المرتبط:</label>
                <select
                  value={bookForm.bankAccountId}
                  onChange={(e) => setBookForm({ ...bookForm, bankAccountId: e.target.value })}
                  className="w-full p-2 border border-slate-300 rounded-lg bg-slate-50 font-bold"
                >
                  {bankAccounts.map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.bankName} - {acc.accountName}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">كود الدفتر:</label>
                  <input
                    type="text"
                    required
                    placeholder="BK-CBK-2026-01"
                    value={bookForm.bookCode}
                    onChange={(e) => setBookForm({ ...bookForm, bookCode: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded-lg font-mono"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">اسم / وصف الدفتر:</label>
                  <input
                    type="text"
                    required
                    placeholder="دفتر شيكات التجاري رقم 2"
                    value={bookForm.bookName}
                    onChange={(e) => setBookForm({ ...bookForm, bookName: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded-lg"
                  />
                </div>
              </div>

              {/* من رقم كذا إلى رقم كذا */}
              <div className="grid grid-cols-2 gap-3 bg-amber-50/60 p-3 rounded-xl border border-amber-200">
                <div>
                  <label className="block text-amber-900 font-bold mb-1">من رقم شيك (بداية):</label>
                  <input
                    type="number"
                    required
                    value={bookForm.serialFrom}
                    onChange={(e) => {
                      const from = parseInt(e.target.value) || 0;
                      setBookForm({ ...bookForm, serialFrom: from, currentSerial: from });
                    }}
                    className="w-full p-2 border border-amber-300 rounded-lg font-mono font-black"
                  />
                </div>

                <div>
                  <label className="block text-amber-900 font-bold mb-1">إلى رقم شيك (نهاية):</label>
                  <input
                    type="number"
                    required
                    value={bookForm.serialTo}
                    onChange={(e) => setBookForm({ ...bookForm, serialTo: parseInt(e.target.value) || 0 })}
                    className="w-full p-2 border border-amber-300 rounded-lg font-mono font-black"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">الرقم التسلسلي التالي:</label>
                  <input
                    type="number"
                    required
                    value={bookForm.currentSerial}
                    onChange={(e) => setBookForm({ ...bookForm, currentSerial: parseInt(e.target.value) || 0 })}
                    className="w-full p-2 border border-slate-300 rounded-lg font-mono"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">تاريخ استلام الدفتر:</label>
                  <input
                    type="date"
                    value={bookForm.receivedDate}
                    onChange={(e) => setBookForm({ ...bookForm, receivedDate: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded-lg font-mono"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsBookModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 text-slate-700 font-bold rounded-xl text-xs"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 text-white font-bold rounded-xl text-xs shadow-md"
                >
                  حفظ الدفتر
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
