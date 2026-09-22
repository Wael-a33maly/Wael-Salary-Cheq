import React, { useState, useMemo, useEffect } from 'react';
import { 
  UserCheck, 
  Search, 
  Plus, 
  Edit3, 
  Trash2, 
  Receipt, 
  Phone, 
  Building2, 
  CreditCard, 
  ArrowUpRight,
  Landmark,
  FileSpreadsheet,
  Tag,
  Check,
  X,
  Palette,
  Layers
} from 'lucide-react';
import { Beneficiary, IssuedCheque, BankAccount, BeneficiaryCategory } from '../../types';
import { INITIAL_BENEFICIARY_CATEGORIES } from '../../mockCheques';

interface BeneficiariesViewProps {
  beneficiaries: Beneficiary[];
  issuedCheques: IssuedCheque[];
  bankAccounts: BankAccount[];
  selectedAccountId: string;
  onSelectAccount: (accId: string) => void;
  onAddBeneficiary: (ben: Omit<Beneficiary, 'id' | 'createdAt'>) => void;
  onUpdateBeneficiary: (ben: Beneficiary) => void;
  onDeleteBeneficiary: (id: string) => void;
  onIssueChequeForBeneficiary: (beneficiaryId: string) => void;
  onViewBeneficiaryReport: (beneficiaryId: string) => void;
}

export function BeneficiariesView({
  beneficiaries,
  issuedCheques,
  bankAccounts,
  selectedAccountId,
  onSelectAccount,
  onAddBeneficiary,
  onUpdateBeneficiary,
  onDeleteBeneficiary,
  onIssueChequeForBeneficiary,
  onViewBeneficiaryReport,
}: BeneficiariesViewProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBeneficiary, setEditingBeneficiary] = useState<Beneficiary | null>(null);

  // إدارة تصنيفات المستفيدين مع التخزين المحلي
  const [categories, setCategories] = useState<BeneficiaryCategory[]>(() => {
    try {
      const saved = localStorage.getItem('app_beneficiary_categories');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error(e);
    }
    return INITIAL_BENEFICIARY_CATEGORIES;
  });

  useEffect(() => {
    try {
      localStorage.setItem('app_beneficiary_categories', JSON.stringify(categories));
    } catch (e) {
      console.error(e);
    }
  }, [categories]);

  // حالة نافذة إدارة التصنيفات
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [newCatColor, setNewCatColor] = useState('blue');
  const [newCatDesc, setNewCatDesc] = useState('');
  const [editingCatId, setEditingCatId] = useState<string | null>(null);
  const [editingCatName, setEditingCatName] = useState('');
  const [editingCatColor, setEditingCatColor] = useState('blue');

  // إضافة تصنيف سريع ومباشر داخل نموذج المستفيد بدون تداخل نوافذ
  const [showInlineAddCategory, setShowInlineAddCategory] = useState(false);
  const [inlineCatName, setInlineCatName] = useState('');
  const [inlineCatColor, setInlineCatColor] = useState('blue');

  const handleSaveInlineCategory = () => {
    if (!inlineCatName.trim()) return;
    const newCategory: BeneficiaryCategory = {
      id: `cat_${Date.now()}`,
      name: inlineCatName.trim(),
      color: inlineCatColor,
      isCustom: true,
    };
    setCategories((prev) => [...prev, newCategory]);
    setFormData((prev) => ({ ...prev, category: newCategory.id }));
    setInlineCatName('');
    setShowInlineAddCategory(false);
  };

  // Form State
  const [formData, setFormData] = useState({
    nameAr: '',
    nameEn: '',
    category: categories[0]?.id || 'vendor',
    bankAccountId: 'all',
    civilIdOrCR: '',
    bankName: '',
    iban: '',
    phoneNumber: '',
    notes: '',
    status: 'active' as Beneficiary['status'],
  });

  const handleOpenAdd = () => {
    setEditingBeneficiary(null);
    setFormData({
      nameAr: '',
      nameEn: '',
      category: categories[0]?.id || 'vendor',
      bankAccountId: selectedAccountId === 'all' ? 'all' : selectedAccountId,
      civilIdOrCR: '',
      bankName: 'البنك التجاري الكويتي (CBK)',
      iban: '',
      phoneNumber: '',
      notes: '',
      status: 'active',
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (b: Beneficiary) => {
    setEditingBeneficiary(b);
    setFormData({
      nameAr: b.nameAr,
      nameEn: b.nameEn || '',
      category: b.category,
      bankAccountId: b.bankAccountId || 'all',
      civilIdOrCR: b.civilIdOrCR || '',
      bankName: b.bankName || '',
      iban: b.iban || '',
      phoneNumber: b.phoneNumber || '',
      notes: b.notes || '',
      status: b.status,
    });
    setIsModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nameAr.trim()) return;

    if (editingBeneficiary) {
      onUpdateBeneficiary({
        ...editingBeneficiary,
        nameAr: formData.nameAr.trim(),
        nameEn: formData.nameEn.trim() || undefined,
        category: formData.category,
        bankAccountId: formData.bankAccountId,
        civilIdOrCR: formData.civilIdOrCR.trim() || undefined,
        bankName: formData.bankName.trim() || undefined,
        iban: formData.iban.trim() || undefined,
        phoneNumber: formData.phoneNumber.trim() || undefined,
        notes: formData.notes.trim() || undefined,
        status: formData.status,
      });
    } else {
      onAddBeneficiary({
        nameAr: formData.nameAr.trim(),
        nameEn: formData.nameEn.trim() || undefined,
        category: formData.category,
        bankAccountId: formData.bankAccountId,
        civilIdOrCR: formData.civilIdOrCR.trim() || undefined,
        bankName: formData.bankName.trim() || undefined,
        iban: formData.iban.trim() || undefined,
        phoneNumber: formData.phoneNumber.trim() || undefined,
        notes: formData.notes.trim() || undefined,
        status: formData.status,
      });
    }
    setIsModalOpen(false);
  };

  // دوال إدارة التصنيفات (CRUD)
  const handleAddCategory = () => {
    if (!newCatName.trim()) return;
    const catId = `cat-${Date.now()}`;
    const newCategory: BeneficiaryCategory = {
      id: catId,
      name: newCatName.trim(),
      color: newCatColor,
      description: newCatDesc.trim() || undefined,
    };
    setCategories([...categories, newCategory]);
    setFormData((prev) => ({ ...prev, category: catId }));
    setNewCatName('');
    setNewCatDesc('');
  };

  const handleStartEditCategory = (cat: BeneficiaryCategory) => {
    setEditingCatId(cat.id);
    setEditingCatName(cat.name);
    setEditingCatColor(cat.color || 'blue');
  };

  const handleSaveEditCategory = (id: string) => {
    if (!editingCatName.trim()) return;
    setCategories(
      categories.map((c) =>
        c.id === id ? { ...c, name: editingCatName.trim(), color: editingCatColor } : c
      )
    );
    setEditingCatId(null);
  };

  const handleDeleteCategory = (id: string) => {
    if (categories.length <= 1) {
      alert('يجب الإبقاء على تصنيف واحد على الأقل في المنظومة.');
      return;
    }
    if (confirm('هل أنت متأكد من حذف هذا التصنيف؟')) {
      setCategories(categories.filter((c) => c.id !== id));
      if (filterCategory === id) {
        setFilterCategory('all');
      }
    }
  };

  // Helper للحصول على معلومات التصنيف
  const getCategoryInfo = (catKey: string) => {
    const found = categories.find((c) => c.id === catKey);
    if (found) return found;

    const fallbackMap: Record<string, string> = {
      vendor: 'مورد / مقاول',
      company: 'شركة / منشأة',
      government: 'جهة حكومية',
      employee: 'موظف',
      individual: 'فرد / مستشار',
    };
    return {
      id: catKey,
      name: fallbackMap[catKey] || catKey,
      color: 'slate',
    };
  };

  const getColorBadge = (color?: string) => {
    switch (color) {
      case 'blue':
        return 'bg-blue-50 text-blue-800 border-blue-200';
      case 'purple':
        return 'bg-purple-50 text-purple-800 border-purple-200';
      case 'emerald':
        return 'bg-emerald-50 text-emerald-800 border-emerald-200';
      case 'amber':
        return 'bg-amber-50 text-amber-800 border-amber-200';
      case 'rose':
        return 'bg-rose-50 text-rose-800 border-rose-200';
      default:
        return 'bg-slate-100 text-slate-800 border-slate-200';
    }
  };

  // Filter Beneficiaries
  const filteredList = useMemo(() => {
    return beneficiaries.filter((b) => {
      // Category filter
      if (filterCategory !== 'all' && b.category !== filterCategory) {
        return false;
      }
      // Account filter
      if (selectedAccountId !== 'all') {
        if (b.bankAccountId && b.bankAccountId !== 'all' && b.bankAccountId !== selectedAccountId) {
          return false;
        }
      }
      // Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchAr = b.nameAr.toLowerCase().includes(q);
        const matchEn = b.nameEn ? b.nameEn.toLowerCase().includes(q) : false;
        const matchCR = b.civilIdOrCR ? b.civilIdOrCR.toLowerCase().includes(q) : false;
        const matchPhone = b.phoneNumber ? b.phoneNumber.includes(q) : false;
        if (!matchAr && !matchEn && !matchCR && !matchPhone) {
          return false;
        }
      }
      return true;
    });
  }, [beneficiaries, filterCategory, selectedAccountId, searchQuery]);

  return (
    <div className="space-y-6">
      
      {/* Title Bar */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-slate-900">شاشة تسجيل وإدارة المستفيدين</h2>
          <p className="text-xs text-slate-500 mt-1">
            دليل الشركات، الموردين، الجهات الحكومية، والموظفين المعتمدين لصرف الشيكات المصرفية
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* زر إدارة التصنيفات */}
          <button
            type="button"
            onClick={() => setIsCategoryModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-xl text-xs transition border border-slate-200"
          >
            <Tag className="w-4 h-4 text-slate-600" />
            <span>إدارة التصنيفات ({categories.length})</span>
          </button>

          <button
            type="button"
            onClick={handleOpenAdd}
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-xs shadow-md transition"
          >
            <Plus className="w-4 h-4" />
            <span>إضافة مستفيد جديد</span>
          </button>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto">
          <span className="font-bold text-slate-600">التصنيف:</span>
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="p-2 border border-slate-300 rounded-xl bg-slate-50 font-bold text-slate-800"
          >
            <option value="all">كافة التصنيفات ({beneficiaries.length})</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>

          <span className="font-bold text-slate-600 mr-2">تصفية الحساب:</span>
          <select
            value={selectedAccountId}
            onChange={(e) => onSelectAccount(e.target.value)}
            className="p-2 border border-slate-300 rounded-xl bg-slate-50 font-bold text-slate-800"
          >
            <option value="all">كافة الحسابات البنكية</option>
            {bankAccounts.map((acc) => (
              <option key={acc.id} value={acc.id}>
                {acc.bankName} - {acc.accountName}
              </option>
            ))}
          </select>
        </div>

        <div className="w-full sm:w-72 relative">
          <input
            type="text"
            placeholder="بحث بالاسم أو الرقم المدني أو الهاتف..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full p-2 pr-8 border border-slate-300 rounded-xl text-xs"
          />
          <Search className="w-4 h-4 text-slate-400 absolute right-2.5 top-2.5" />
        </div>
      </div>

      {/* Beneficiaries Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredList.length === 0 ? (
          <div className="col-span-full p-8 text-center bg-white rounded-2xl border border-slate-200 text-slate-400 text-xs">
            لا يوجد مستفيدون مطابقون لمعايير البحث
          </div>
        ) : (
          filteredList.map((b) => {
            const benCheques = issuedCheques.filter(
              (c) => c.beneficiaryId === b.id || c.beneficiaryName === b.nameAr
            );
            const totalAmount = benCheques.reduce((s, c) => s + c.amount, 0);
            const catInfo = getCategoryInfo(b.category);
            const linkedAcc = bankAccounts.find((a) => a.id === b.bankAccountId);

            return (
              <div
                key={b.id}
                className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-3.5 hover:border-slate-300 transition flex flex-col justify-between"
              >
                <div>
                  {/* Top Bar of Card */}
                  <div className="flex justify-between items-start gap-2">
                    <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${getColorBadge(catInfo.color)}`}>
                      {catInfo.name}
                    </span>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleOpenEdit(b)}
                        className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                        title="تعديل بيانات المستفيد"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (confirm(`هل أنت متأكد من حذف المستفيد "${b.nameAr}"؟`)) {
                            onDeleteBeneficiary(b.id);
                          }
                        }}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                        title="حذف المستفيد"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Name and English */}
                  <h3 className="text-sm font-black text-slate-900 mt-2">{b.nameAr}</h3>
                  {b.nameEn && <p className="text-[11px] text-slate-400 font-sans">{b.nameEn}</p>}

                  {/* Metadata */}
                  <div className="mt-3 space-y-1.5 text-xs text-slate-600 border-t border-slate-100 pt-2.5">
                    {b.civilIdOrCR && (
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-slate-400">الرقم المدني / السجل:</span>
                        <strong className="font-mono text-slate-800">{b.civilIdOrCR}</strong>
                      </div>
                    )}
                    {b.bankName && (
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-slate-400">بنك المستفيد:</span>
                        <span className="text-slate-700 font-medium">{b.bankName}</span>
                      </div>
                    )}
                    {b.phoneNumber && (
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-slate-400">رقم الهاتف:</span>
                        <span className="font-mono text-slate-700">{b.phoneNumber}</span>
                      </div>
                    )}
                    {linkedAcc && (
                      <div className="flex items-center justify-between text-[11px] bg-amber-50/60 px-2 py-1 rounded">
                        <span className="text-amber-900">مرتبط بحساب:</span>
                        <strong className="text-amber-950 font-bold">{linkedAcc.accountName}</strong>
                      </div>
                    )}
                  </div>
                </div>

                {/* Financial Summary for this Beneficiary */}
                <div className="pt-2 border-t border-slate-100 space-y-2">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-500 font-medium">الشيكات المصدرة:</span>
                    <strong className="font-mono text-slate-900">{benCheques.length} شيك</strong>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-500 font-medium">إجمالي المبالغ:</span>
                    <strong className="font-mono text-emerald-700 font-bold">
                      {totalAmount.toFixed(3)} د.ك
                    </strong>
                  </div>

                  {/* Quick Actions */}
                  <div className="pt-2 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => onIssueChequeForBeneficiary(b.id)}
                      className="flex-1 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-xs rounded-xl flex items-center justify-center gap-1 transition"
                    >
                      <Receipt className="w-3.5 h-3.5" />
                      <span>إصدار شيك</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => onViewBeneficiaryReport(b.id)}
                      className="px-2.5 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-600 font-bold text-xs rounded-xl transition"
                      title="كشف حساب المستفيد"
                    >
                      <ArrowUpRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

              </div>
            );
          })
        )}
      </div>

      {/* ========================================================================= */}
      {/* نافذة إضافة وتعديل مستفيد                                                 */}
      {/* ========================================================================= */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-lg w-full shadow-2xl border border-slate-200 space-y-4 text-right">
            
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="text-base font-black text-slate-900">
                {editingBeneficiary ? 'تعديل بيانات المستفيد' : 'تسجيل مستفيد جديد'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                ✕
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-700 font-bold mb-1">
                  الاسم باللغة العربية (كما سيطبع على الشيك): <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="مثال: شركة الخليج للتوريدات والمقاولات العامة"
                  value={formData.nameAr}
                  onChange={(e) => setFormData({ ...formData, nameAr: e.target.value })}
                  className="w-full p-2.5 border border-slate-300 rounded-xl font-bold font-serif text-slate-900"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">الاسم بالإنجليزية (اختياري):</label>
                <input
                  type="text"
                  placeholder="e.g. Gulf Supplies & General Contracting Co."
                  value={formData.nameEn}
                  onChange={(e) => setFormData({ ...formData, nameEn: e.target.value })}
                  className="w-full p-2.5 border border-slate-300 rounded-xl font-sans"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="block text-slate-700 font-bold">التصنيف:</label>
                    <button
                      type="button"
                      onClick={() => setShowInlineAddCategory(!showInlineAddCategory)}
                      className="text-[10px] text-blue-600 hover:underline font-bold"
                    >
                      {showInlineAddCategory ? 'إلغاء' : '+ تصنيف جديد مباشر'}
                    </button>
                  </div>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full p-2.5 border border-slate-300 rounded-xl bg-slate-50 font-bold"
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>

                  {/* نموذج إضافة التصنيف المباشر داخل الفورم بدون نوافذ متداخلة */}
                  {showInlineAddCategory && (
                    <div className="mt-2 p-2.5 bg-blue-50/80 border border-blue-200 rounded-xl space-y-2 text-right">
                      <div className="text-[10.5px] font-bold text-blue-900">إضافة تصنيف فوري للمستفيد:</div>
                      <div className="flex gap-1.5">
                        <input
                          type="text"
                          placeholder="اسم التصنيف الجديد..."
                          value={inlineCatName}
                          onChange={(e) => setInlineCatName(e.target.value)}
                          className="flex-1 p-1.5 text-xs bg-white border border-blue-300 rounded-lg font-bold"
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleSaveInlineCategory();
                            }
                          }}
                        />
                        <select
                          value={inlineCatColor}
                          onChange={(e) => setInlineCatColor(e.target.value)}
                          className="p-1.5 text-xs bg-white border border-blue-300 rounded-lg text-slate-700"
                        >
                          <option value="blue">أزرق</option>
                          <option value="emerald">أخضر</option>
                          <option value="purple">بنفسجي</option>
                          <option value="amber">كهرماني</option>
                          <option value="rose">وردي</option>
                        </select>
                      </div>
                      <div className="flex items-center justify-between pt-1">
                        <button
                          type="button"
                          onClick={() => setIsCategoryModalOpen(true)}
                          className="text-[10px] text-slate-500 hover:text-blue-600 underline"
                        >
                          إدارة كافة التصنيفات
                        </button>
                        <div className="flex gap-1.5">
                          <button
                            type="button"
                            onClick={() => setShowInlineAddCategory(false)}
                            className="px-2 py-1 text-[11px] text-slate-600 hover:text-slate-900"
                          >
                            إلغاء
                          </button>
                          <button
                            type="button"
                            onClick={handleSaveInlineCategory}
                            className="px-3 py-1 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg text-xs shadow-xs"
                          >
                            + إضافة واعتماد
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">ربط بحساب بنكي محدد:</label>
                  <select
                    value={formData.bankAccountId}
                    onChange={(e) => setFormData({ ...formData, bankAccountId: e.target.value })}
                    className="w-full p-2.5 border border-slate-300 rounded-xl bg-slate-50"
                  >
                    <option value="all">متاح لكافة الحسابات البنكية</option>
                    {bankAccounts.map((acc) => (
                      <option key={acc.id} value={acc.id}>
                        {acc.accountName}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">
                    الرقم المدني أو السجل التجاري:
                  </label>
                  <input
                    type="text"
                    placeholder="الرقم المدني / CR"
                    value={formData.civilIdOrCR}
                    onChange={(e) => setFormData({ ...formData, civilIdOrCR: e.target.value })}
                    className="w-full p-2.5 border border-slate-300 rounded-xl font-mono"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">رقم الهاتف للتواصل:</label>
                  <input
                    type="text"
                    placeholder="+965 ...."
                    value={formData.phoneNumber}
                    onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                    className="w-full p-2.5 border border-slate-300 rounded-xl font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">بنك المستفيد المسجل:</label>
                  <input
                    type="text"
                    placeholder="مثال: البنك التجاري الكويتي"
                    value={formData.bankName}
                    onChange={(e) => setFormData({ ...formData, bankName: e.target.value })}
                    className="w-full p-2.5 border border-slate-300 rounded-xl"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">رقم الآيبان (IBAN):</label>
                  <input
                    type="text"
                    placeholder="KW..."
                    value={formData.iban}
                    onChange={(e) => setFormData({ ...formData, iban: e.target.value })}
                    className="w-full p-2.5 border border-slate-300 rounded-xl font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">ملاحظات إضافية:</label>
                <textarea
                  rows={2}
                  placeholder="ملاحظات حول طريقة التسليم، فواتير التوريد، جهات الاتصال..."
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full p-2.5 border border-slate-300 rounded-xl"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 text-slate-700 font-bold rounded-xl text-xs hover:bg-slate-50 transition"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-xs shadow-md transition"
                >
                  {editingBeneficiary ? 'حفظ التعديلات' : 'تسجيل المستفيد'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* نافذة إدارة تصنيفات المستفيدين (تظهر دائماً بالأعلى z-[70] فوق أي نموذج) */}
      {/* ========================================================================= */}
      {isCategoryModalOpen && (
        <div 
          className="fixed inset-0 z-[99999] bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4"
          style={{ zIndex: 99999 }}
        >
          <div className="bg-white rounded-2xl p-6 max-w-lg w-full shadow-2xl border border-slate-200 space-y-4 text-right">
            
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-blue-50 text-blue-600">
                  <Tag className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900">إدارة تصنيفات المستفيدين</h3>
                  <p className="text-[11px] text-slate-400">إضافة وتعديل وحذف فئات المستفيدين للفلترة والتنظيم</p>
                </div>
              </div>
              <button 
                type="button"
                onClick={() => setIsCategoryModalOpen(false)} 
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Existing Categories List */}
            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              <span className="text-[11px] font-bold text-slate-500 block">التصنيفات الحالية ({categories.length}):</span>
              {categories.map((cat) => (
                <div 
                  key={cat.id} 
                  className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between gap-2"
                >
                  {editingCatId === cat.id ? (
                    <div className="flex-1 flex items-center gap-2">
                      <input
                        type="text"
                        value={editingCatName}
                        onChange={(e) => setEditingCatName(e.target.value)}
                        className="flex-1 p-1.5 text-xs border border-blue-400 rounded-lg font-bold"
                        placeholder="اسم التصنيف..."
                        autoFocus
                      />
                      <select
                        value={editingCatColor}
                        onChange={(e) => setEditingCatColor(e.target.value)}
                        className="p-1.5 text-xs border border-slate-300 rounded-lg font-bold"
                      >
                        <option value="blue">أزرق</option>
                        <option value="purple">بنفسجي</option>
                        <option value="emerald">أخضر</option>
                        <option value="amber">كهرماني</option>
                        <option value="rose">وردي</option>
                      </select>
                      <button
                        type="button"
                        onClick={() => handleSaveEditCategory(cat.id)}
                        className="p-1.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-500"
                        title="حفظ"
                      >
                        <Check className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingCatId(null)}
                        className="p-1.5 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300"
                        title="إلغاء"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center gap-2">
                        <span className={`text-[11px] font-bold px-2 py-0.5 rounded border ${getColorBadge(cat.color)}`}>
                          {cat.name}
                        </span>
                        {cat.description && (
                          <span className="text-[10px] text-slate-400 truncate max-w-[180px]">
                            {cat.description}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleStartEditCategory(cat)}
                          className="p-1.5 text-slate-400 hover:text-blue-600 rounded-lg transition"
                          title="تعديل اسم ولون التصنيف"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteCategory(cat.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg transition"
                          title="حذف التصنيف"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>

            {/* Add New Category Section */}
            <div className="border-t border-slate-100 pt-3 space-y-2">
              <span className="text-xs font-black text-slate-900 block">إضافة تصنيف جديد:</span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                <input
                  type="text"
                  placeholder="اسم التصنيف الجديد..."
                  value={newCatName}
                  onChange={(e) => setNewCatName(e.target.value)}
                  className="sm:col-span-2 p-2 border border-slate-300 rounded-xl font-bold"
                />
                <select
                  value={newCatColor}
                  onChange={(e) => setNewCatColor(e.target.value)}
                  className="p-2 border border-slate-300 rounded-xl bg-slate-50 font-bold"
                >
                  <option value="blue">لون أزرق</option>
                  <option value="purple">لون بنفسجي</option>
                  <option value="emerald">لون أخضر</option>
                  <option value="amber">لون كهرماني</option>
                  <option value="rose">لون وردي</option>
                </select>
              </div>

              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="وصف مختصر للتصنيف (اختياري)..."
                  value={newCatDesc}
                  onChange={(e) => setNewCatDesc(e.target.value)}
                  className="flex-1 p-2 border border-slate-300 rounded-xl text-xs"
                />
                <button
                  type="button"
                  onClick={handleAddCategory}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-xs shadow-xs transition"
                >
                  إضافة التصنيف
                </button>
              </div>
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsCategoryModalOpen(false)}
                className="px-5 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition"
              >
                تم والعودة
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
