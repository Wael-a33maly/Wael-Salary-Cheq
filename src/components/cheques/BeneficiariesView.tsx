import React, { useState, useMemo } from 'react';
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
  FileSpreadsheet
} from 'lucide-react';
import { Beneficiary, IssuedCheque, BankAccount } from '../../types';

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

  // Form State
  const [formData, setFormData] = useState({
    nameAr: '',
    nameEn: '',
    category: 'vendor' as Beneficiary['category'],
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
      category: 'vendor',
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
        ...formData,
      });
    } else {
      onAddBeneficiary(formData);
    }
    setIsModalOpen(false);
  };

  // Filter Beneficiaries
  const filteredList = useMemo(() => {
    return beneficiaries.filter((b) => {
      // Category filter
      if (filterCategory !== 'all' && b.category !== filterCategory) {
        return false;
      }
      // Account filter: if account chosen, show 'all' or specifically linked to this account
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
            <option value="vendor">موردون ومقاولون</option>
            <option value="company">شركات ومؤسسات</option>
            <option value="government">جهات حكومية ورسمية</option>
            <option value="employee">موظفون ومكافآت</option>
            <option value="individual">أفراد ومستشارون</option>
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
            // Cheques issued for this beneficiary
            const benCheques = issuedCheques.filter(
              (c) => c.beneficiaryId === b.id || c.beneficiaryName === b.nameAr
            );
            const totalAmount = benCheques.reduce((s, c) => s + c.amount, 0);

            // Category badge
            const categoryLabel =
              b.category === 'vendor' ? 'مورد / مقاول' :
              b.category === 'company' ? 'شركة / منشأة' :
              b.category === 'government' ? 'جهة حكومية' :
              b.category === 'employee' ? 'موظف' : 'فرد / مستشار';

            const linkedAcc = bankAccounts.find((a) => a.id === b.bankAccountId);

            return (
              <div
                key={b.id}
                className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-3.5 hover:border-slate-300 transition flex flex-col justify-between"
              >
                <div>
                  {/* Top Bar of Card */}
                  <div className="flex justify-between items-start gap-2">
                    <span className="bg-slate-100 text-slate-800 text-[10px] font-bold px-2.5 py-0.5 rounded-full">
                      {categoryLabel}
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
                  <div className="flex justify-between items-center bg-slate-50 p-2 rounded-xl text-xs">
                    <div>
                      <span className="text-[10px] text-slate-400 block">الشيكات المصدرة:</span>
                      <strong className="font-mono font-bold text-slate-900">{benCheques.length} شيك</strong>
                    </div>
                    <div className="text-left">
                      <span className="text-[10px] text-slate-400 block">إجمالي المبالغ:</span>
                      <strong className="font-mono font-black text-blue-900 text-sm">
                        {totalAmount.toFixed(3)} د.ك
                      </strong>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => onIssueChequeForBeneficiary(b.id)}
                      className="flex items-center justify-center gap-1 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-[11px] transition shadow-xs"
                    >
                      <Receipt className="w-3.5 h-3.5" />
                      <span>تحرير شيك</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => onViewBeneficiaryReport(b.id)}
                      className="flex items-center justify-center gap-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-[11px] transition"
                    >
                      <FileSpreadsheet className="w-3.5 h-3.5 text-slate-600" />
                      <span>كشف حساب</span>
                    </button>
                  </div>
                </div>

              </div>
            );
          })
        )}
      </div>

      {/* Add / Edit Beneficiary Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl p-6 max-w-lg w-full shadow-2xl border border-slate-200 space-y-4 my-6">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="font-black text-slate-900 text-base flex items-center gap-2">
                <UserCheck className="w-5 h-5 text-blue-600" />
                <span>{editingBeneficiary ? 'تعديل بيانات المستفيد' : 'تسجيل مستفيد جديد في المنظومة'}</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-700 font-bold mb-1">
                  الاسم بالعربية (كما سيطبع بدقة على الشيك): *
                </label>
                <input
                  type="text"
                  required
                  placeholder="مثال: شركة الخليج للتجارة العامة ذ.م.م"
                  value={formData.nameAr}
                  onChange={(e) => setFormData({ ...formData, nameAr: e.target.value })}
                  className="w-full p-2.5 border border-slate-300 rounded-xl font-bold"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">الاسم بالإنجليزية (اختياري):</label>
                <input
                  type="text"
                  placeholder="Beneficiary English Name"
                  value={formData.nameEn}
                  onChange={(e) => setFormData({ ...formData, nameEn: e.target.value })}
                  className="w-full p-2.5 border border-slate-300 rounded-xl font-sans"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">التصنيف:</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value as any })}
                    className="w-full p-2.5 border border-slate-300 rounded-xl bg-slate-50 font-bold"
                  >
                    <option value="vendor">مورد / مقاول</option>
                    <option value="company">شركة ومؤسسة</option>
                    <option value="government">جهة حكومية ورسمية</option>
                    <option value="employee">موظف في الشركة</option>
                    <option value="individual">فرد / مستشار مستقل</option>
                  </select>
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

    </div>
  );
}
