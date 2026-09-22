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
  onNavigateToCalibration?: () => void;
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
  onNavigateToCalibration,
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

          {/* Dedicated Calibration Tab Card */}
          <div className="bg-gradient-to-br from-amber-50 to-orange-50/40 p-5 rounded-2xl border border-amber-200/80 shadow-xs space-y-4">
            <div className="flex items-center gap-2.5 border-b border-amber-200/60 pb-3">
              <div className="p-2 rounded-xl bg-amber-600 text-white">
                <Sliders className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-black text-slate-900 text-sm">
                  معايرة مقاسات الشيك (18cm × 9cm)
                </h3>
                <p className="text-[11px] text-slate-500">
                  سحب وإفلات تفاعلي مع لوحة توجيه بالأسهم لكافة الحقول
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              تم تخصيص تبويب مستقل في القائمة الجانبية لمعايرة أبعاد الشيك المعتمد (18 سم عرض × 9 سم ارتفاع) ومواضع الحقول (التاريخ، اسم المستفيد، التفقيط، والمبلغ) بنظام السحب والإفلات المباشر والأسهم في كل الاتجاهات.
            </p>

            <div className="bg-white/80 p-3 rounded-xl border border-amber-200/60 space-y-1.5 text-xs">
              <div className="flex justify-between text-slate-600">
                <span>أبعاد ورقة الشيك:</span>
                <strong className="font-mono text-slate-900">180mm × 90mm</strong>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>الإزاحة الأفقية العامة X:</span>
                <strong className="font-mono text-slate-900">{printSettings.offsetX || 0} مم</strong>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>الإزاحة الرأسية العامة Y:</span>
                <strong className="font-mono text-slate-900">{printSettings.offsetY || 0} مم</strong>
              </div>
            </div>

            {onNavigateToCalibration && (
              <button
                type="button"
                onClick={onNavigateToCalibration}
                className="w-full flex items-center justify-center gap-2 py-2.5 bg-amber-600 hover:bg-amber-500 text-white font-black rounded-xl text-xs shadow-md transition transform active:scale-98"
              >
                <Sliders className="w-4 h-4" />
                <span>فتح شاشة معايرة مقاسات الشيك</span>
              </button>
            )}
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
