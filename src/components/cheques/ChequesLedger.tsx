import React, { useState, useMemo } from 'react';
import { 
  Receipt, 
  Search, 
  Filter, 
  Download, 
  Printer, 
  CheckCircle2, 
  Clock, 
  ShieldAlert, 
  RotateCcw,
  Landmark,
  Eye,
  Plus,
  FileText
} from 'lucide-react';
import { IssuedCheque, BankAccount, Beneficiary } from '../../types';

interface ChequesLedgerProps {
  issuedCheques: IssuedCheque[];
  bankAccounts: BankAccount[];
  beneficiaries: Beneficiary[];
  selectedAccountId: string;
  onSelectAccount: (accId: string) => void;
  onPrintCheque: (cheque: IssuedCheque) => void;
  onPrintReceiptOrEnvelope?: (cheque: IssuedCheque) => void;
  onStatusChange: (chequeId: string, newStatus: 'issued' | 'cashed' | 'cancelled', notes?: string) => void;
  onNavigateToIssue: () => void;
  initialFilterStatus?: 'all' | 'issued' | 'cashed' | 'cancelled';
}

export function ChequesLedger({
  issuedCheques,
  bankAccounts,
  beneficiaries,
  selectedAccountId,
  onSelectAccount,
  onPrintCheque,
  onPrintReceiptOrEnvelope,
  onStatusChange,
  onNavigateToIssue,
  initialFilterStatus = 'all',
}: ChequesLedgerProps) {
  const [filterStatus, setFilterStatus] = useState<string>(initialFilterStatus);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterBeneficiary, setFilterBeneficiary] = useState<string>('all');
  const [cancelModalCheque, setCancelModalCheque] = useState<IssuedCheque | null>(null);
  const [cancelReason, setCancelReason] = useState<string>('');

  // Filtered Cheques
  const filteredCheques = useMemo(() => {
    return issuedCheques.filter((c) => {
      // Account filter
      if (selectedAccountId !== 'all' && c.bankAccountId !== selectedAccountId) {
        return false;
      }
      // Status filter
      if (filterStatus !== 'all' && c.status !== filterStatus) {
        return false;
      }
      // Beneficiary filter
      if (filterBeneficiary !== 'all' && c.beneficiaryId !== filterBeneficiary && c.beneficiaryName !== filterBeneficiary) {
        return false;
      }
      // Search query (cheque number, beneficiary, purpose)
      if (searchQuery.trim()) {
        const query = searchQuery.trim().toLowerCase();
        const matchSerial = c.chequeNumberStr.toLowerCase().includes(query) || String(c.chequeNumber).includes(query);
        const matchName = c.beneficiaryName.toLowerCase().includes(query);
        const matchPurpose = c.purpose ? c.purpose.toLowerCase().includes(query) : false;
        if (!matchSerial && !matchName && !matchPurpose) {
          return false;
        }
      }
      return true;
    });
  }, [issuedCheques, selectedAccountId, filterStatus, filterBeneficiary, searchQuery]);

  // Calculations for filtered set
  const totalCount = filteredCheques.length;
  const totalAmount = filteredCheques.reduce((s, c) => s + c.amount, 0);
  const cashedAmount = filteredCheques.filter((c) => c.status === 'cashed').reduce((s, c) => s + c.amount, 0);
  const pendingAmount = filteredCheques.filter((c) => c.status === 'issued').reduce((s, c) => s + c.amount, 0);

  // Export to CSV
  const handleExportCSV = () => {
    const headers = ['رقم الشيك', 'الحساب البنكي', 'اسم المستفيد', 'المبلغ بالدينار الكويتي', 'تاريخ التحرير', 'تاريخ الاستحقاق', 'الحالة', 'تاريخ الصرف', 'البيان والغرض'];
    const rows = filteredCheques.map((c) => {
      const acc = bankAccounts.find((a) => a.id === c.bankAccountId);
      const statusLabel = c.status === 'cashed' ? 'منصرف' : c.status === 'issued' ? 'صادر (معلق)' : 'ملغى';
      return [
        `"${c.chequeNumberStr}"`,
        `"${acc?.accountName || acc?.bankName || ''}"`,
        `"${c.beneficiaryName}"`,
        c.amount.toFixed(3),
        c.issueDate,
        c.dueDate,
        statusLabel,
        c.cashedDate || '',
        `"${c.purpose || ''}"`,
      ];
    });

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `كشف_سجل_الشيكات_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleConfirmCancel = () => {
    if (cancelModalCheque) {
      onStatusChange(cancelModalCheque.id, 'cancelled', cancelReason.trim() || 'ملغى بطلب الإدارة');
      setCancelModalCheque(null);
      setCancelReason('');
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Title Bar */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-slate-900">سجل الشيكات الصادرة والبحث والمتابعة</h2>
          <p className="text-xs text-slate-500 mt-1">
            كافة الشيكات المحررة عبر الحسابات البنكية مع إمكانية التصفية، الطباعة، وتسجيل حركة الصرف
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={onNavigateToIssue}
            className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-xs shadow-md transition"
          >
            <Plus className="w-4 h-4" />
            <span>إصدار شيك جديد</span>
          </button>

          <button
            type="button"
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold rounded-xl text-xs border border-emerald-200 transition"
          >
            <Download className="w-4 h-4 text-emerald-600" />
            <span>تصدير Excel (CSV)</span>
          </button>
        </div>
      </div>

      {/* Summary KPI Strip for Current Filters */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs">
          <span className="text-[11px] text-slate-500 font-bold block">إجمالي النتائج:</span>
          <span className="text-lg font-mono font-black text-slate-900">{totalCount} شيك</span>
          <span className="text-[10px] text-slate-400 block mt-0.5">مطابقة لشروط البحث</span>
        </div>

        <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs">
          <span className="text-[11px] text-slate-500 font-bold block">إجمالي القيمة بالدينار:</span>
          <span className="text-lg font-mono font-black text-slate-900">{totalAmount.toFixed(3)} د.ك</span>
          <span className="text-[10px] text-slate-400 block mt-0.5">المجموع الكلي للشيكات</span>
        </div>

        <div className="bg-emerald-50/70 p-3.5 rounded-2xl border border-emerald-200 shadow-2xs">
          <span className="text-[11px] text-emerald-700 font-bold block">المنصرف من البنك:</span>
          <span className="text-lg font-mono font-black text-emerald-950">{cashedAmount.toFixed(3)} د.ك</span>
          <span className="text-[10px] text-emerald-600 block mt-0.5">تم خصمها من الرصيد</span>
        </div>

        <div className="bg-blue-50/70 p-3.5 rounded-2xl border border-blue-200 shadow-2xs">
          <span className="text-[11px] text-blue-700 font-bold block">المعلق (لم يصرف بعد):</span>
          <span className="text-lg font-mono font-black text-blue-950">{pendingAmount.toFixed(3)} د.ك</span>
          <span className="text-[10px] text-blue-600 block mt-0.5">التزامات قيد التداول</span>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
          
          {/* Account Filter */}
          <div>
            <label className="block text-slate-700 font-bold mb-1">الحساب البنكي:</label>
            <select
              value={selectedAccountId}
              onChange={(e) => onSelectAccount(e.target.value)}
              className="w-full p-2 border border-slate-300 rounded-xl bg-slate-50 font-bold text-slate-800"
            >
              <option value="all">كافة الحسابات البنكية</option>
              {bankAccounts.map((acc) => (
                <option key={acc.id} value={acc.id}>
                  {acc.bankName} - {acc.accountName}
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <label className="block text-slate-700 font-bold mb-1">حالة الشيك:</label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full p-2 border border-slate-300 rounded-xl bg-slate-50 font-bold text-slate-800"
            >
              <option value="all">كافة الحالات (الكل)</option>
              <option value="cashed">الشيكات المنصرفة فقط</option>
              <option value="issued">الشيكات التي لم تصرف (المعلقة)</option>
              <option value="cancelled">الشيكات الملغاة</option>
            </select>
          </div>

          {/* Beneficiary Filter */}
          <div>
            <label className="block text-slate-700 font-bold mb-1">المستفيد المخصص:</label>
            <select
              value={filterBeneficiary}
              onChange={(e) => setFilterBeneficiary(e.target.value)}
              className="w-full p-2 border border-slate-300 rounded-xl bg-slate-50 font-bold text-slate-800"
            >
              <option value="all">كافة المستفيدين</option>
              {beneficiaries.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.nameAr}
                </option>
              ))}
            </select>
          </div>

          {/* Search Query */}
          <div>
            <label className="block text-slate-700 font-bold mb-1">بحث برقم الشيك أو البيان:</label>
            <div className="relative">
              <input
                type="text"
                placeholder="ابحث برقم الشيك أو المستفيد..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full p-2 pr-8 border border-slate-300 rounded-xl"
              />
              <Search className="w-4 h-4 text-slate-400 absolute right-2.5 top-2.5" />
            </div>
          </div>

        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-slate-50 font-bold text-slate-700 border-b border-slate-200">
              <tr>
                <th className="p-3">رقم الشيك</th>
                <th className="p-3">اسم المستفيد</th>
                <th className="p-3">البنك والحساب</th>
                <th className="p-3 text-center">المبلغ (د.ك)</th>
                <th className="p-3 text-center">تاريخ التحرير</th>
                <th className="p-3 text-center">تاريخ الاستحقاق</th>
                <th className="p-3 text-center">الحالة</th>
                <th className="p-3">البيان والغرض</th>
                <th className="p-3 text-center">إجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredCheques.length === 0 ? (
                <tr>
                  <td colSpan={9} className="p-8 text-center text-slate-400">
                    لا توجد شيكات مطابقة لمعايير البحث أو التصفية المختارة
                  </td>
                </tr>
              ) : (
                filteredCheques.map((c) => {
                  const acc = bankAccounts.find((a) => a.id === c.bankAccountId);
                  return (
                    <tr key={c.id} className="hover:bg-slate-50 transition">
                      <td className="p-3 font-mono font-black text-slate-900 bg-slate-50/40">
                        #{c.chequeNumberStr}
                      </td>
                      <td className="p-3 font-bold text-slate-900 max-w-[200px]">
                        <div>{c.beneficiaryName}</div>
                        {c.isCrossed && (
                          <span className="text-[10px] text-blue-600 font-sans font-bold">
                            // للمستفيد الأول فقط
                          </span>
                        )}
                      </td>
                      <td className="p-3 text-slate-600 text-[11px]">
                        <div>{acc?.bankName || 'البنك'}</div>
                        <div className="font-mono text-slate-400 text-[10px]">{acc?.accountNumber}</div>
                      </td>
                      <td className="p-3 text-center font-mono font-black text-slate-900 text-sm">
                        {c.amount.toFixed(3)}
                      </td>
                      <td className="p-3 text-center font-mono text-slate-600">{c.issueDate}</td>
                      <td className="p-3 text-center font-mono text-slate-600 font-bold">{c.dueDate}</td>
                      <td className="p-3 text-center">
                        {c.status === 'cashed' && (
                          <div className="inline-flex flex-col items-center">
                            <span className="bg-emerald-100 text-emerald-800 font-bold px-2.5 py-0.5 rounded-full text-[10px] flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              <span>منصرف</span>
                            </span>
                            {c.cashedDate && (
                              <span className="text-[9px] text-emerald-700 font-mono mt-0.5">
                                {c.cashedDate}
                              </span>
                            )}
                          </div>
                        )}
                        {c.status === 'issued' && (
                          <span className="bg-blue-100 text-blue-800 font-bold px-2.5 py-0.5 rounded-full text-[10px] flex items-center gap-1">
                            <Clock className="w-3 h-3 text-blue-600" />
                            <span>معلق (لم يصرف)</span>
                          </span>
                        )}
                        {c.status === 'cancelled' && (
                          <span className="bg-rose-100 text-rose-800 font-bold px-2.5 py-0.5 rounded-full text-[10px] flex items-center gap-1" title={c.cancelReason}>
                            <ShieldAlert className="w-3 h-3 text-rose-600" />
                            <span>ملغى</span>
                          </span>
                        )}
                      </td>
                      <td className="p-3 text-slate-600 text-[11px] max-w-[200px] truncate" title={c.purpose}>
                        {c.purpose || '-'}
                      </td>
                      <td className="p-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            type="button"
                            onClick={() => onPrintCheque(c)}
                            className="flex items-center gap-1 px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold rounded-lg text-[11px] transition"
                            title="معاينة وطباعة الشيك"
                          >
                            <Printer className="w-3.5 h-3.5" />
                            <span>شيك</span>
                          </button>

                          {onPrintReceiptOrEnvelope && (
                            <button
                              type="button"
                              onClick={() => onPrintReceiptOrEnvelope(c)}
                              className="flex items-center gap-1 px-2 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 font-bold rounded-lg text-[11px] transition"
                              title="طباعة سند الصرف أو مظروف الشيك للمستفيد"
                            >
                              <FileText className="w-3.5 h-3.5 text-amber-600" />
                              <span>سند/ظرف</span>
                            </button>
                          )}

                          {c.status === 'issued' && (
                            <>
                              <button
                                type="button"
                                onClick={() => onStatusChange(c.id, 'cashed')}
                                className="px-2 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold rounded-lg text-[10px] transition"
                                title="تسجيل الصرف من البنك"
                              >
                                صرف
                              </button>
                              <button
                                type="button"
                                onClick={() => setCancelModalCheque(c)}
                                className="px-2 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold rounded-lg text-[10px] transition"
                                title="إلغاء الشيك"
                              >
                                إلغاء
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Cancel Modal */}
      {cancelModalCheque && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl border border-slate-200 space-y-4">
            <h4 className="font-black text-slate-900 text-base flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-rose-600" />
              <span>إلغاء الشيك رقم #{cancelModalCheque.chequeNumberStr}</span>
            </h4>
            <p className="text-xs text-slate-500">
              يرجى توضيح سبب إلغاء الشيك أو إتلافه لتوثيقه في سجل التدقيق المحاسبي:
            </p>
            <textarea
              rows={3}
              placeholder="مثال: خطأ في كتابة المبلغ، تلف الورقة عند التغذية في الطابعة، إلغاء المعاملة من قبل المستفيد..."
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              className="w-full p-2.5 border border-slate-300 rounded-xl text-xs"
            />
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setCancelModalCheque(null)}
                className="px-4 py-2 border border-slate-300 text-slate-700 font-bold rounded-xl text-xs hover:bg-slate-50 transition"
              >
                تراجع
              </button>
              <button
                type="button"
                onClick={handleConfirmCancel}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-xl text-xs transition shadow-md"
              >
                تأكيد الإلغاء
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
