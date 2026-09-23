import React, { useState, useRef } from 'react';
import { 
  BookOpen, 
  Landmark, 
  Plus, 
  Edit3, 
  Trash2, 
  CheckCircle2, 
  Sliders, 
  Save, 
  Building,
  Upload,
  Image as ImageIcon,
  Ruler,
  Layers,
  Copy,
  Check,
  Info,
  Maximize2,
  X,
  FileCheck,
  Eye,
  AlertCircle
} from 'lucide-react';
import { BankAccount, ChequeBook, ChequePrintSettings, ChequeSizeTemplate } from '../../types';
import { STANDARD_CHEQUE_SIZES } from '../../mockCheques';

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
  const [activeAccountTab, setActiveAccountTab] = useState<'basic' | 'cheque_dimensions' | 'templates'>('basic');

  // Account Form State with Cheque Dimensions and Uploaded Stamp Image
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
    chequeWidthCm: 21.0,
    chequeHeightCm: 8.5,
    chequeImageUrl: '',
    chequeImageName: '',
    activeTemplateId: '',
    chequeTemplates: [] as ChequeSizeTemplate[],
  });

  // Additional Cheque Template Modal (for banks with multiple sizes e.g. standard vs corporate wide)
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<ChequeSizeTemplate | null>(null);
  const [templateForm, setTemplateForm] = useState({
    name: 'شيك شركات عريض',
    widthCm: 23.5,
    heightCm: 9.0,
    chequeImageUrl: '',
    chequeImageName: '',
    isDefault: false,
    notes: '',
  });

  // Cheque Book Modal State
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
  const [uploadError, setUploadError] = useState('');

  // Image Upload Refs
  const accountImageInputRef = useRef<HTMLInputElement>(null);
  const templateImageInputRef = useRef<HTMLInputElement>(null);

  // Common Kuwaiti Banks list for quick selection
  const commonBanks = [
    { code: 'CBK', name: 'البنك التجاري الكويتي (CBK)', defW: 18.0, defH: 9.0 },
    { code: 'NBK', name: 'بنك الكويت الوطني (NBK)', defW: 20.0, defH: 8.5 },
    { code: 'KFH', name: 'بيت التمويل الكويتي (KFH)', defW: 21.0, defH: 8.5 },
    { code: 'BOUBYAN', name: 'بنك بوبيان (Boubyan)', defW: 21.0, defH: 8.5 },
    { code: 'GULF', name: 'بنك الخليج (Gulf Bank)', defW: 20.0, defH: 8.5 },
    { code: 'WARBA', name: 'بنك وربة (Warba Bank)', defW: 21.0, defH: 8.5 },
    { code: 'BURGAN', name: 'بنك برقان (Burgan Bank)', defW: 20.0, defH: 8.5 },
    { code: 'AUB', name: 'البنك الأهلي المتحد (AUB)', defW: 21.0, defH: 8.5 },
    { code: 'ABK', name: 'البنك الأهلي الكويتي (ABK)', defW: 20.0, defH: 8.5 },
  ];

  // Open Add Account Modal
  const handleOpenAddAccount = () => {
    setEditingAccount(null);
    setActiveAccountTab('basic');
    setUploadError('');
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
      chequeWidthCm: 21.0,
      chequeHeightCm: 8.5,
      chequeImageUrl: '',
      chequeImageName: '',
      activeTemplateId: 'tpl-default-1',
      chequeTemplates: [
        {
          id: 'tpl-default-1',
          name: 'المقاس القياسي الأساسي (21.0 × 8.5 سم)',
          widthCm: 21.0,
          heightCm: 8.5,
          isDefault: true,
          notes: 'المقاس الافتراضي للطباعة على دفاتر الشيكات لهذا الحساب',
        }
      ],
    });
    setIsAccountModalOpen(true);
  };

  // Open Edit Account Modal
  const handleOpenEditAccount = (acc: BankAccount) => {
    setEditingAccount(acc);
    setActiveAccountTab('basic');
    setUploadError('');

    const defaultTemplates: ChequeSizeTemplate[] = acc.chequeTemplates && acc.chequeTemplates.length > 0 
      ? acc.chequeTemplates 
      : [
          {
            id: `tpl-${acc.id}-default`,
            name: `مقاس شيك ${acc.bankName} (${acc.chequeWidthCm || 21.0} × ${acc.chequeHeightCm || 8.5} سم)`,
            widthCm: acc.chequeWidthCm || 21.0,
            heightCm: acc.chequeHeightCm || 8.5,
            chequeImageUrl: acc.chequeImageUrl,
            chequeImageName: acc.chequeImageName,
            isDefault: true,
          }
        ];

    setAccountForm({
      accountName: acc.accountName,
      bankName: acc.bankName,
      bankCode: acc.bankCode as BankAccount['bankCode'],
      accountNumber: acc.accountNumber,
      iban: acc.iban,
      branchName: acc.branchName,
      currency: acc.currency,
      currentBalance: acc.currentBalance,
      isDefault: acc.isDefault,
      status: acc.status,
      chequeTemplate: acc.chequeTemplate,
      chequeWidthCm: acc.chequeWidthCm || 21.0,
      chequeHeightCm: acc.chequeHeightCm || 8.5,
      chequeImageUrl: acc.chequeImageUrl || '',
      chequeImageName: acc.chequeImageName || '',
      activeTemplateId: acc.activeTemplateId || defaultTemplates[0].id,
      chequeTemplates: defaultTemplates,
    });
    setIsAccountModalOpen(true);
  };

  // Handle Account Cheque Image Upload (base64)
  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setUploadError('يرجى اختيار ملف صورة صالح (JPG, PNG, WebP)');
      return;
    }

    if (file.size > 8 * 1024 * 1024) {
      setUploadError('حجم الصورة كبير جداً، يرجى اختيار صورة أقل من 8 ميغابايت');
      return;
    }

    setUploadError('');
    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      if (dataUrl) {
        setAccountForm((prev) => {
          // Also update default template image if present
          const updatedTemplates = prev.chequeTemplates.map((t, idx) => 
            idx === 0 || t.isDefault ? { ...t, chequeImageUrl: dataUrl, chequeImageName: file.name } : t
          );
          return {
            ...prev,
            chequeImageUrl: dataUrl,
            chequeImageName: file.name,
            chequeTemplates: updatedTemplates,
          };
        });
      }
    };
    reader.readAsDataURL(file);
  };

  // Handle Template Cheque Image Upload
  const handleTemplateImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      if (dataUrl) {
        setTemplateForm((prev) => ({
          ...prev,
          chequeImageUrl: dataUrl,
          chequeImageName: file.name,
        }));
      }
    };
    reader.readAsDataURL(file);
  };

  // Save Account Handler
  const handleSaveAccount = (e: React.FormEvent) => {
    e.preventDefault();
    if (!accountForm.accountName || !accountForm.accountNumber) return;

    // Validate and build templates
    const templates = accountForm.chequeTemplates.length > 0
      ? accountForm.chequeTemplates
      : [
          {
            id: `tpl-${Date.now()}`,
            name: `المقاس المعتمد (${accountForm.chequeWidthCm} × ${accountForm.chequeHeightCm} سم)`,
            widthCm: accountForm.chequeWidthCm,
            heightCm: accountForm.chequeHeightCm,
            chequeImageUrl: accountForm.chequeImageUrl,
            chequeImageName: accountForm.chequeImageName,
            isDefault: true,
          }
        ];

    const accountData: Omit<BankAccount, 'id'> = {
      accountName: accountForm.accountName,
      bankName: accountForm.bankName,
      bankCode: accountForm.bankCode,
      accountNumber: accountForm.accountNumber,
      iban: accountForm.iban,
      branchName: accountForm.branchName,
      currency: accountForm.currency,
      currentBalance: accountForm.currentBalance,
      isDefault: accountForm.isDefault,
      status: accountForm.status,
      chequeTemplate: accountForm.chequeTemplate,
      chequeWidthCm: accountForm.chequeWidthCm,
      chequeHeightCm: accountForm.chequeHeightCm,
      chequeImageUrl: accountForm.chequeImageUrl,
      chequeImageName: accountForm.chequeImageName,
      activeTemplateId: accountForm.activeTemplateId || templates[0].id,
      chequeTemplates: templates,
    };

    if (editingAccount) {
      onUpdateAccount({ ...editingAccount, ...accountData });
    } else {
      onAddAccount(accountData);
    }
    setIsAccountModalOpen(false);
  };

  // Template Management (Multiple Sizes per Account)
  const handleOpenAddTemplate = () => {
    setEditingTemplate(null);
    setTemplateForm({
      name: 'مقاس شيك إضافي (شركات عريض)',
      widthCm: 23.5,
      heightCm: 9.0,
      chequeImageUrl: '',
      chequeImageName: '',
      isDefault: false,
      notes: 'مقاس مخصص لدفاتر الشيكات العريضة',
    });
    setIsTemplateModalOpen(true);
  };

  const handleOpenEditTemplate = (tpl: ChequeSizeTemplate) => {
    setEditingTemplate(tpl);
    setTemplateForm({
      name: tpl.name,
      widthCm: tpl.widthCm,
      heightCm: tpl.heightCm,
      chequeImageUrl: tpl.chequeImageUrl || '',
      chequeImageName: tpl.chequeImageName || '',
      isDefault: tpl.isDefault || false,
      notes: tpl.notes || '',
    });
    setIsTemplateModalOpen(true);
  };

  const handleSaveTemplate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!templateForm.name) return;

    if (editingTemplate) {
      setAccountForm((prev) => ({
        ...prev,
        chequeTemplates: prev.chequeTemplates.map((t) =>
          t.id === editingTemplate.id
            ? {
                ...t,
                name: templateForm.name,
                widthCm: Number(templateForm.widthCm),
                heightCm: Number(templateForm.heightCm),
                chequeImageUrl: templateForm.chequeImageUrl,
                chequeImageName: templateForm.chequeImageName,
                isDefault: templateForm.isDefault,
                notes: templateForm.notes,
              }
            : templateForm.isDefault ? { ...t, isDefault: false } : t
        ),
      }));
    } else {
      const newTpl: ChequeSizeTemplate = {
        id: `tpl-${Date.now()}`,
        name: templateForm.name,
        widthCm: Number(templateForm.widthCm),
        heightCm: Number(templateForm.heightCm),
        chequeImageUrl: templateForm.chequeImageUrl,
        chequeImageName: templateForm.chequeImageName,
        isDefault: templateForm.isDefault,
        notes: templateForm.notes,
      };

      setAccountForm((prev) => ({
        ...prev,
        chequeTemplates: templateForm.isDefault 
          ? [...prev.chequeTemplates.map((t) => ({ ...t, isDefault: false })), newTpl]
          : [...prev.chequeTemplates, newTpl],
      }));
    }

    setIsTemplateModalOpen(false);
  };

  const handleDeleteTemplate = (id: string) => {
    setAccountForm((prev) => ({
      ...prev,
      chequeTemplates: prev.chequeTemplates.filter((t) => t.id !== id),
    }));
  };

  const handleSetDefaultTemplate = (id: string) => {
    setAccountForm((prev) => {
      const target = prev.chequeTemplates.find((t) => t.id === id);
      return {
        ...prev,
        activeTemplateId: id,
        chequeWidthCm: target?.widthCm || prev.chequeWidthCm,
        chequeHeightCm: target?.heightCm || prev.chequeHeightCm,
        chequeImageUrl: target?.chequeImageUrl || prev.chequeImageUrl,
        chequeTemplates: prev.chequeTemplates.map((t) => ({
          ...t,
          isDefault: t.id === id,
        })),
      };
    });
  };

  // Cheque Book Handlers
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
    if (!bookForm.bookCode || !bookForm.bookName) return;

    if (editingBook) {
      onUpdateChequeBook({ ...editingBook, ...bookForm });
    } else {
      onAddChequeBook(bookForm);
    }
    setIsBookModalOpen(false);
  };

  return (
    <div className="space-y-6">
      
      {/* Top Banner & Action Buttons */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-black text-slate-900">
              إدارة الحسابات البنكية وقوالب مقاسات الشيكات
            </h2>
            <span className="bg-blue-100 text-blue-800 text-[10px] font-bold px-2 py-0.5 rounded-full font-mono">
              ديناميكي لكل البنوك
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            إمكانية رفع صورة ستامب الشيك وإدخال المقاسات بالسنتيمتر (cm) بدقة مع دعم المقاسات المتعددة لكل بنك
          </p>
        </div>

        <div className="flex flex-wrap gap-2.5">
          <button
            type="button"
            onClick={handleOpenAddAccount}
            className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-xs shadow-md transition transform active:scale-98"
          >
            <Plus className="w-4 h-4" />
            <span>إضافة حساب بنكي ومقاس شيك جديد</span>
          </button>

          <button
            type="button"
            onClick={handleOpenAddBook}
            className="flex items-center gap-1.5 px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-xl text-xs shadow-md transition transform active:scale-98"
          >
            <Plus className="w-4 h-4" />
            <span>إضافة دفتر شيكات جديد</span>
          </button>
        </div>
      </div>

      {saveSuccess && (
        <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-xl text-emerald-800 text-xs flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span className="font-bold">تم حفظ الإعدادات وقوالب مقاسات الشيكات بنجاح!</span>
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

        {/* Right: Bank Accounts List & Multi-Size Cheque Details (5 Cols) */}
        <div className="lg:col-span-5 space-y-6">
          
          {/* Bank Accounts with Cheque Dimensions and Images */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
            <div className="flex justify-between items-center border-b border-slate-100 pb-2">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <Landmark className="w-4 h-4 text-blue-600" />
                <span>الحسابات البنكية ومقاسات الشيكات</span>
              </h3>
              <span className="text-xs font-mono text-slate-400">{bankAccounts.length} حسابات</span>
            </div>

            <div className="space-y-3">
              {bankAccounts.map((acc) => {
                const templatesCount = acc.chequeTemplates?.length || 1;
                const width = acc.chequeWidthCm || 21.0;
                const height = acc.chequeHeightCm || 8.5;

                return (
                  <div
                    key={acc.id}
                    className="p-3.5 bg-slate-50 hover:bg-white rounded-xl border border-slate-200 hover:border-blue-300 transition space-y-2.5 shadow-2xs"
                  >
                    <div className="flex justify-between items-start gap-2">
                      <div className="flex items-start gap-2.5">
                        {/* Cheque thumbnail or icon */}
                        <div className="w-12 h-9 rounded-lg border border-slate-300 bg-white overflow-hidden flex items-center justify-center relative shadow-xs shrink-0">
                          {acc.chequeImageUrl ? (
                            <img
                              src={acc.chequeImageUrl}
                              alt="ستامب الشيك"
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <ImageIcon className="w-5 h-5 text-slate-300" />
                          )}
                        </div>

                        <div>
                          <div className="font-black text-slate-900 text-xs flex items-center gap-1.5 flex-wrap">
                            <span>{acc.bankName}</span>
                            {acc.isDefault && (
                              <span className="bg-blue-100 text-blue-800 text-[9px] px-1.5 py-0.2 rounded font-bold">
                                افتراضي
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                            {acc.accountName} | رقم: {acc.accountNumber}
                          </div>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleOpenEditAccount(acc)}
                        className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                        title="تعديل الحساب ومقاسات الشيك"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Dimensions & Template Badge */}
                    <div className="flex flex-wrap items-center justify-between gap-1.5 pt-1.5 border-t border-slate-100 text-[11px]">
                      <div className="flex items-center gap-1.5 text-slate-600 font-mono">
                        <Ruler className="w-3.5 h-3.5 text-amber-600" />
                        <span className="font-bold text-slate-800">{width} × {height} سم</span>
                        <span className="text-slate-400">({width * 10}×{height * 10} مم)</span>
                      </div>

                      <div className="flex items-center gap-1 text-[10px] text-blue-700 bg-blue-50 px-2 py-0.5 rounded font-bold border border-blue-200">
                        <Layers className="w-3 h-3" />
                        <span>{templatesCount} {templatesCount > 1 ? 'مقاسات شيكات' : 'مقاس شيك'}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Quick Calibration Navigator Card */}
          <div className="bg-gradient-to-br from-amber-50 to-orange-50/40 p-5 rounded-2xl border border-amber-200/80 shadow-xs space-y-4">
            <div className="flex items-center gap-2.5 border-b border-amber-200/60 pb-3">
              <div className="p-2 rounded-xl bg-amber-600 text-white shadow-xs">
                <Sliders className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-black text-slate-900 text-sm">
                  شاشة معايرة أبعاد وستامب الشيكات
                </h3>
                <p className="text-[11px] text-slate-500">
                  معاينة دقيقة ومطابقة إحداثيات الحقول بالسنتيمتر والملليمتر
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              يمكنك معايرة أماكن التاريخ والمستفيد والمبلغ بالأرقام والتفقيط بدقة متناهية على أي ستامب شيك لأي بنك بالسحب والإفلات والأسهم التفاعلية.
            </p>

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

      {/* Main Account Modal: Comprehensive Bank Account & Cheque Dimensions/Stamp Designer */}
      {isAccountModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-3xl w-full shadow-2xl border border-slate-200 overflow-hidden my-6">
            
            {/* Modal Header */}
            <div className="bg-slate-900 text-white p-5 flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white">
                  <Landmark className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-black text-base">
                    {editingAccount ? 'تعديل الحساب البنكي وإعدادات مقاسات الشيك' : 'فتح حساب بنكي جديد وتحديد ستامب الشيك ومقاساته'}
                  </h4>
                  <p className="text-xs text-slate-400 mt-0.5">
                    إدخال أبعاد الشيك بالسنتيمتر (cm) ورفع صورة الشيك للطباعة على أي بنك
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAccountModalOpen(false)}
                className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Sub-Tabs inside Modal */}
            <div className="flex border-b border-slate-200 bg-slate-50 px-6 pt-3 gap-2">
              <button
                type="button"
                onClick={() => setActiveAccountTab('basic')}
                className={`flex items-center gap-2 py-2.5 px-4 font-bold text-xs rounded-t-xl transition border-b-2 ${
                  activeAccountTab === 'basic'
                    ? 'border-blue-600 text-blue-700 bg-white shadow-2xs'
                    : 'border-transparent text-slate-500 hover:text-slate-900'
                }`}
              >
                <Landmark className="w-4 h-4" />
                <span>1. بيانات الحساب البنكي الأساسية</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveAccountTab('cheque_dimensions')}
                className={`flex items-center gap-2 py-2.5 px-4 font-bold text-xs rounded-t-xl transition border-b-2 ${
                  activeAccountTab === 'cheque_dimensions'
                    ? 'border-blue-600 text-blue-700 bg-white shadow-2xs'
                    : 'border-transparent text-slate-500 hover:text-slate-900'
                }`}
              >
                <Ruler className="w-4 h-4 text-amber-600" />
                <span>2. أبعاد الشيك (بالسنتيمتر) ورفع صورة الستامب</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveAccountTab('templates')}
                className={`flex items-center gap-2 py-2.5 px-4 font-bold text-xs rounded-t-xl transition border-b-2 ${
                  activeAccountTab === 'templates'
                    ? 'border-blue-600 text-blue-700 bg-white shadow-2xs'
                    : 'border-transparent text-slate-500 hover:text-slate-900'
                }`}
              >
                <Layers className="w-4 h-4 text-purple-600" />
                <span>3. مقاسات الشيكات المتعددة لهذا البنك ({accountForm.chequeTemplates.length})</span>
              </button>
            </div>

            {/* Modal Form Body */}
            <form onSubmit={handleSaveAccount}>
              <div className="p-6 space-y-5 max-h-[70vh] overflow-y-auto">
                
                {/* TAB 1: Basic Account Info */}
                {activeAccountTab === 'basic' && (
                  <div className="space-y-4 text-xs animate-in fade-in">
                    
                    {/* Quick Bank Selector Buttons */}
                    <div>
                      <label className="block text-slate-700 font-bold mb-1.5">
                        اختيار سريع من البنوك الكويتية المعتمدة:
                      </label>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {commonBanks.map((b) => (
                          <button
                            key={b.code}
                            type="button"
                            onClick={() => {
                              setAccountForm((prev) => ({
                                ...prev,
                                bankName: b.name,
                                bankCode: b.code as BankAccount['bankCode'],
                                chequeWidthCm: b.defW,
                                chequeHeightCm: b.defH,
                              }));
                            }}
                            className={`p-2 rounded-xl border text-right transition flex items-center justify-between ${
                              accountForm.bankName === b.name
                                ? 'border-blue-600 bg-blue-50/70 text-blue-900 font-black'
                                : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                            }`}
                          >
                            <span className="truncate">{b.name}</span>
                            <span className="text-[10px] text-slate-400 font-mono">{b.defW}×{b.defH} سم</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-slate-700 font-bold mb-1">اسم الحساب في النظام:</label>
                        <input
                          type="text"
                          required
                          placeholder="مثال: حساب العمليات الرئيسي - البنك التجاري"
                          value={accountForm.accountName}
                          onChange={(e) => setAccountForm({ ...accountForm, accountName: e.target.value })}
                          className="w-full p-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 font-bold"
                        />
                      </div>

                      <div>
                        <label className="block text-slate-700 font-bold mb-1">اسم البنك المعتمد:</label>
                        <input
                          type="text"
                          required
                          value={accountForm.bankName}
                          onChange={(e) => setAccountForm({ ...accountForm, bankName: e.target.value })}
                          className="w-full p-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 font-bold"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-slate-700 font-bold mb-1">رقم الحساب البنكي:</label>
                        <input
                          type="text"
                          required
                          placeholder="1020491823"
                          value={accountForm.accountNumber}
                          onChange={(e) => setAccountForm({ ...accountForm, accountNumber: e.target.value })}
                          className="w-full p-2.5 border border-slate-300 rounded-xl font-mono text-slate-900 font-bold"
                        />
                      </div>

                      <div>
                        <label className="block text-slate-700 font-bold mb-1">الرصيد الافتتاحي التقديري:</label>
                        <div className="relative">
                          <input
                            type="number"
                            step="0.001"
                            value={accountForm.currentBalance}
                            onChange={(e) => setAccountForm({ ...accountForm, currentBalance: parseFloat(e.target.value) || 0 })}
                            className="w-full p-2.5 pl-12 border border-slate-300 rounded-xl font-mono text-slate-900 font-bold"
                          />
                          <span className="absolute left-3 top-2.5 text-slate-400 font-bold">د.ك</span>
                        </div>
                      </div>

                      <div>
                        <label className="block text-slate-700 font-bold mb-1">اسم الفرع المصرفي:</label>
                        <input
                          type="text"
                          placeholder="الفرع الرئيسي - العاصمة"
                          value={accountForm.branchName}
                          onChange={(e) => setAccountForm({ ...accountForm, branchName: e.target.value })}
                          className="w-full p-2.5 border border-slate-300 rounded-xl"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-slate-700 font-bold mb-1">رقم الآيبان الدولي (IBAN):</label>
                      <input
                        type="text"
                        placeholder="KW18CBKU000000001020491823"
                        value={accountForm.iban}
                        onChange={(e) => setAccountForm({ ...accountForm, iban: e.target.value })}
                        className="w-full p-2.5 border border-slate-300 rounded-xl font-mono text-slate-900"
                      />
                    </div>

                    <div className="flex items-center gap-3 pt-2">
                      <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-800">
                        <input
                          type="checkbox"
                          checked={accountForm.isDefault}
                          onChange={(e) => setAccountForm({ ...accountForm, isDefault: e.target.checked })}
                          className="w-4 h-4 text-blue-600 rounded"
                        />
                        <span>تعيين هذا الحساب كحساب رئيسي وافتراضي للإصدار والطباعة</span>
                      </label>
                    </div>
                  </div>
                )}

                {/* TAB 2: Cheque Dimensions (cm) & Image Upload */}
                {activeAccountTab === 'cheque_dimensions' && (
                  <div className="space-y-5 text-xs animate-in fade-in">
                    
                    {/* Info Notice */}
                    <div className="bg-amber-50 border border-amber-200 p-3.5 rounded-2xl flex items-start gap-3">
                      <Info className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
                      <div className="space-y-1">
                        <p className="font-bold text-amber-900">
                          نظام طباعة شيكات ديناميكي متوافق مع كافة البنوك والأحجام:
                        </p>
                        <p className="text-amber-800 leading-relaxed text-[11px]">
                          قم بإدخال عرض وارتفاع ورقة الشيك بالسنتيمتر (cm) بدقة، وارفع صورة ممسوحة ضوئياً للشيك لاستخدامها كستامب مرجعي لضبط ومحاذاة الطباعة. عند الطباعة على الشيك الورقي الفعلي في الطابعة، سيتم إخفاء الخلفية وطباعة النصوص بدقة على الحقول.
                        </p>
                      </div>
                    </div>

                    {/* Standard Preset Buttons */}
                    <div>
                      <label className="block text-slate-700 font-bold mb-1.5 flex items-center gap-1.5">
                        <Ruler className="w-4 h-4 text-blue-600" />
                        <span>اختيار مقاس شيك قياسي جاهز (بالسنتيمتر):</span>
                      </label>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {STANDARD_CHEQUE_SIZES.map((sz) => (
                          <button
                            key={sz.id}
                            type="button"
                            onClick={() => {
                              setAccountForm((prev) => ({
                                ...prev,
                                chequeWidthCm: sz.widthCm,
                                chequeHeightCm: sz.heightCm,
                              }));
                            }}
                            className={`p-2.5 rounded-xl border text-right transition space-y-0.5 ${
                              accountForm.chequeWidthCm === sz.widthCm && accountForm.chequeHeightCm === sz.heightCm
                                ? 'border-amber-500 bg-amber-50/70 text-amber-900 font-black ring-1 ring-amber-500'
                                : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                            }`}
                          >
                            <div className="font-bold text-[11px] truncate">{sz.name}</div>
                            <div className="text-[10px] text-amber-800 font-mono font-bold">
                              {sz.widthCm} × {sz.heightCm} سم
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Exact Centimeter Inputs */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-200">
                      <div>
                        <label className="block text-slate-800 font-bold mb-1 flex items-center gap-1">
                          <span>عرض ورقة الشيك بالسنتيمتر (Width in cm):</span>
                          <span className="text-red-500">*</span>
                        </label>
                        <div className="relative">
                          <input
                            type="number"
                            step="0.1"
                            min="10"
                            max="35"
                            required
                            value={accountForm.chequeWidthCm}
                            onChange={(e) => setAccountForm({ ...accountForm, chequeWidthCm: parseFloat(e.target.value) || 21.0 })}
                            className="w-full p-2.5 pl-12 border border-slate-300 rounded-xl font-mono text-base font-black text-slate-900 bg-white"
                          />
                          <span className="absolute left-3 top-2.5 text-slate-400 font-bold font-mono">سم cm</span>
                        </div>
                        <p className="text-[10px] text-slate-400 mt-1 font-mono">
                          يعادل: {(accountForm.chequeWidthCm * 10).toFixed(0)} ملليمتر (mm)
                        </p>
                      </div>

                      <div>
                        <label className="block text-slate-800 font-bold mb-1 flex items-center gap-1">
                          <span>ارتفاع ورقة الشيك بالسنتيمتر (Height in cm):</span>
                          <span className="text-red-500">*</span>
                        </label>
                        <div className="relative">
                          <input
                            type="number"
                            step="0.1"
                            min="5"
                            max="20"
                            required
                            value={accountForm.chequeHeightCm}
                            onChange={(e) => setAccountForm({ ...accountForm, chequeHeightCm: parseFloat(e.target.value) || 8.5 })}
                            className="w-full p-2.5 pl-12 border border-slate-300 rounded-xl font-mono text-base font-black text-slate-900 bg-white"
                          />
                          <span className="absolute left-3 top-2.5 text-slate-400 font-bold font-mono">سم cm</span>
                        </div>
                        <p className="text-[10px] text-slate-400 mt-1 font-mono">
                          يعادل: {(accountForm.chequeHeightCm * 10).toFixed(0)} ملليمتر (mm)
                        </p>
                      </div>
                    </div>

                    {/* Image Upload for Cheque Stamp */}
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <label className="block text-slate-800 font-bold flex items-center gap-1.5">
                          <ImageIcon className="w-4 h-4 text-blue-600" />
                          <span>رفع صورة الشيك / ستامب الشيك (JPG, PNG, WebP):</span>
                        </label>
                        {accountForm.chequeImageUrl && (
                          <button
                            type="button"
                            onClick={() => setAccountForm((prev) => ({ ...prev, chequeImageUrl: '', chequeImageName: '' }))}
                            className="text-[11px] text-red-600 hover:text-red-700 flex items-center gap-1 font-bold"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>حذف الصورة</span>
                          </button>
                        )}
                      </div>

                      <input
                        ref={accountImageInputRef}
                        type="file"
                        accept="image/png,image/jpeg,image/webp,image/jpg"
                        onChange={handleImageFileChange}
                        className="hidden"
                      />

                      {/* Upload Box or Image Preview */}
                      {!accountForm.chequeImageUrl ? (
                        <div
                          onClick={() => accountImageInputRef.current?.click()}
                          className="border-2 border-dashed border-slate-300 hover:border-blue-500 hover:bg-blue-50/40 rounded-2xl p-6 text-center cursor-pointer transition space-y-2 group"
                        >
                          <div className="w-12 h-12 rounded-2xl bg-blue-50 group-hover:bg-blue-100 flex items-center justify-center text-blue-600 mx-auto transition">
                            <Upload className="w-6 h-6" />
                          </div>
                          <div>
                            <span className="font-bold text-slate-800 block text-xs">
                              انقر لرفع صورة الشيك أو اسحب الصورة وأفلتها هنا
                            </span>
                            <span className="text-[11px] text-slate-400">
                              صورة ممسوحة ضوئياً للشيك المعتمد بالمقاس الحقيقي ({accountForm.chequeWidthCm} × {accountForm.chequeHeightCm} سم)
                            </span>
                          </div>
                        </div>
                      ) : (
                        <div className="bg-slate-900 rounded-2xl p-4 space-y-3">
                          <div className="flex justify-between items-center text-white text-xs">
                            <span className="font-bold flex items-center gap-2">
                              <FileCheck className="w-4 h-4 text-emerald-400" />
                              <span>{accountForm.chequeImageName || 'صورة الشيك المعتمد'}</span>
                            </span>
                            <button
                              type="button"
                              onClick={() => accountImageInputRef.current?.click()}
                              className="px-3 py-1 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-300 hover:text-white transition font-bold"
                            >
                              استبدال الصورة
                            </button>
                          </div>

                          {/* Scaled Preview Frame with Real Aspect Ratio */}
                          <div className="relative rounded-xl overflow-hidden border border-slate-700 bg-slate-800 shadow-inner flex items-center justify-center p-2">
                            <div 
                              className="relative border-2 border-amber-400/80 rounded-lg overflow-hidden shadow-2xl max-w-full"
                              style={{
                                aspectRatio: `${accountForm.chequeWidthCm} / ${accountForm.chequeHeightCm}`,
                                maxHeight: '220px',
                                width: '100%',
                              }}
                            >
                              <img
                                src={accountForm.chequeImageUrl}
                                alt="معاينة الشيك"
                                className="w-full h-full object-contain bg-white"
                              />
                              <div className="absolute bottom-1 right-1 bg-black/70 backdrop-blur-xs text-amber-300 text-[10px] px-2 py-0.5 rounded font-mono font-bold">
                                {accountForm.chequeWidthCm} × {accountForm.chequeHeightCm} سم
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {uploadError && (
                        <div className="text-red-600 text-xs font-bold flex items-center gap-1">
                          <AlertCircle className="w-3.5 h-3.5" />
                          <span>{uploadError}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* TAB 3: Multiple Cheque Sizes for this Bank */}
                {activeAccountTab === 'templates' && (
                  <div className="space-y-4 text-xs animate-in fade-in">
                    <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                      <div>
                        <h5 className="font-bold text-slate-900 text-xs">
                          مقاسات وقوالب الشيكات المسجلة لهذا الحساب:
                        </h5>
                        <p className="text-[11px] text-slate-500">
                          بعض البنوك توفر دفتر شيكات عادي ودفتر شيكات شركات عريض مع كعب، يمكنك إدارتها هنا:
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={handleOpenAddTemplate}
                        className="flex items-center gap-1 px-3 py-1.5 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-xl text-xs transition"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>إضافة مقاس شيك جديد</span>
                      </button>
                    </div>

                    <div className="space-y-2.5">
                      {accountForm.chequeTemplates.map((tpl) => (
                        <div
                          key={tpl.id}
                          className={`p-3.5 rounded-2xl border transition flex items-center justify-between gap-3 ${
                            tpl.isDefault
                              ? 'border-purple-300 bg-purple-50/50'
                              : 'border-slate-200 bg-white hover:bg-slate-50'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-12 h-9 rounded-lg border border-slate-300 bg-white overflow-hidden flex items-center justify-center shrink-0">
                              {tpl.chequeImageUrl ? (
                                <img src={tpl.chequeImageUrl} alt={tpl.name} className="w-full h-full object-cover" />
                              ) : (
                                <Ruler className="w-4 h-4 text-slate-400" />
                              )}
                            </div>
                            <div>
                              <div className="font-bold text-slate-900 flex items-center gap-2">
                                <span>{tpl.name}</span>
                                {tpl.isDefault && (
                                  <span className="bg-purple-200 text-purple-900 text-[9px] font-bold px-1.5 py-0.2 rounded">
                                    المقاس الافتراضي
                                  </span>
                                )}
                              </div>
                              <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                                الأبعاد: <strong className="text-slate-800">{tpl.widthCm} × {tpl.heightCm} سم</strong> ({tpl.widthCm * 10} × {tpl.heightCm * 10} مم)
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            {!tpl.isDefault && (
                              <button
                                type="button"
                                onClick={() => handleSetDefaultTemplate(tpl.id)}
                                className="px-2.5 py-1 text-[11px] border border-slate-300 hover:border-purple-500 rounded-lg text-slate-600 hover:text-purple-700 font-bold transition"
                              >
                                تعيين كافتراضي
                              </button>
                            )}

                            <button
                              type="button"
                              onClick={() => handleOpenEditTemplate(tpl)}
                              className="p-1.5 text-slate-400 hover:text-blue-600 rounded-lg transition"
                              title="تعديل المقاس"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>

                            {accountForm.chequeTemplates.length > 1 && (
                              <button
                                type="button"
                                onClick={() => handleDeleteTemplate(tpl.id)}
                                className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg transition"
                                title="حذف المقاس"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

              </div>

              {/* Modal Footer */}
              <div className="bg-slate-50 px-6 py-4 border-t border-slate-200 flex justify-between items-center">
                <div className="text-[11px] text-slate-500 font-mono">
                  الأبعاد المحددة: {accountForm.chequeWidthCm} × {accountForm.chequeHeightCm} سم
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setIsAccountModalOpen(false)}
                    className="px-4 py-2 border border-slate-300 text-slate-700 font-bold rounded-xl text-xs hover:bg-slate-100 transition"
                  >
                    إلغاء
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-xs shadow-md transition transform active:scale-98"
                  >
                    {editingAccount ? 'حفظ تعديلات الحساب ومقاسات الشيك' : 'فتح واعتماد الحساب البنكي'}
                  </button>
                </div>
              </div>
            </form>

          </div>
        </div>
      )}

      {/* Sub-Modal: Add/Edit Additional Cheque Template/Size */}
      {isTemplateModalOpen && (
        <div className="fixed inset-0 z-60 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden space-y-4">
            <div className="bg-purple-900 text-white p-4 flex justify-between items-center">
              <h5 className="font-black text-sm">
                {editingTemplate ? 'تعديل مقاس وقالب الشيك' : 'إضافة مقاس شيك إضافي لهذا البنك'}
              </h5>
              <button
                type="button"
                onClick={() => setIsTemplateModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveTemplate} className="p-5 space-y-4 text-xs">
              <div>
                <label className="block text-slate-700 font-bold mb-1">اسم المقاس / وصف الدفتر:</label>
                <input
                  type="text"
                  required
                  placeholder="مثال: شيك شركات عريض (Corporate) أو شيك عادي"
                  value={templateForm.name}
                  onChange={(e) => setTemplateForm({ ...templateForm, name: e.target.value })}
                  className="w-full p-2.5 border border-slate-300 rounded-xl font-bold"
                />
              </div>

              {/* Quick Sizes */}
              <div>
                <label className="block text-slate-700 font-bold mb-1">مقاسات قياسية مقترحة:</label>
                <div className="grid grid-cols-2 gap-2">
                  {STANDARD_CHEQUE_SIZES.slice(0, 4).map((sz) => (
                    <button
                      key={sz.id}
                      type="button"
                      onClick={() => setTemplateForm((prev) => ({ ...prev, widthCm: sz.widthCm, heightCm: sz.heightCm }))}
                      className="p-1.5 border border-slate-200 hover:border-purple-400 rounded-lg text-right font-mono text-[10px]"
                    >
                      {sz.name}: <strong>{sz.widthCm}×{sz.heightCm} سم</strong>
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">العرض بالسنتيمتر (cm):</label>
                  <input
                    type="number"
                    step="0.1"
                    required
                    value={templateForm.widthCm}
                    onChange={(e) => setTemplateForm({ ...templateForm, widthCm: parseFloat(e.target.value) || 21.0 })}
                    className="w-full p-2 border border-slate-300 rounded-lg font-mono font-black"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-bold mb-1">الارتفاع بالسنتيمتر (cm):</label>
                  <input
                    type="number"
                    step="0.1"
                    required
                    value={templateForm.heightCm}
                    onChange={(e) => setTemplateForm({ ...templateForm, heightCm: parseFloat(e.target.value) || 8.5 })}
                    className="w-full p-2 border border-slate-300 rounded-lg font-mono font-black"
                  />
                </div>
              </div>

              {/* Image Upload for this template */}
              <div>
                <label className="block text-slate-700 font-bold mb-1">صورة ستامب الشيك الخاصة بهذا المقاس (اختياري):</label>
                <input
                  ref={templateImageInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/jpg"
                  onChange={handleTemplateImageChange}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => templateImageInputRef.current?.click()}
                  className="w-full p-2.5 border border-dashed border-slate-300 hover:border-purple-500 rounded-xl text-center text-slate-600 hover:text-purple-700 font-bold flex items-center justify-center gap-2"
                >
                  <Upload className="w-4 h-4" />
                  <span>{templateForm.chequeImageName || 'اختر صورة ممسوحة لهذا المقاس'}</span>
                </button>
              </div>

              <div>
                <label className="flex items-center gap-2 font-bold text-slate-800 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={templateForm.isDefault}
                    onChange={(e) => setTemplateForm({ ...templateForm, isDefault: e.target.checked })}
                    className="w-4 h-4 text-purple-600 rounded"
                  />
                  <span>جعله المقاس الافتراضي للطباعة</span>
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsTemplateModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 text-slate-700 font-bold rounded-xl text-xs"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-xl text-xs shadow-md"
                >
                  حفظ المقاس
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
