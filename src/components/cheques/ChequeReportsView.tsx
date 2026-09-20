import React, { useState, useMemo } from 'react';
import { 
  FileText, 
  Download, 
  Printer, 
  CheckCircle2, 
  Clock, 
  User, 
  BookOpen, 
  Calendar, 
  Building,
  Landmark,
  AlertCircle
} from 'lucide-react';
import { IssuedCheque, BankAccount, ChequeBook, Beneficiary } from '../../types';

interface ChequeReportsViewProps {
  issuedCheques: IssuedCheque[];
  bankAccounts: BankAccount[];
  chequeBooks: ChequeBook[];
  beneficiaries: Beneficiary[];
  selectedAccountId: string;
  onSelectAccount: (accId: string) => void;
  initialReportTab?: string;
  initialBeneficiaryId?: string;
  onPrintCheque: (cheque: IssuedCheque) => void;
}

export function ChequeReportsView({
  issuedCheques,
  bankAccounts,
  chequeBooks,
  beneficiaries,
  selectedAccountId,
  onSelectAccount,
  initialReportTab = 'cashed',
  initialBeneficiaryId = '',
  onPrintCheque,
}: ChequeReportsViewProps) {
  const [activeTab, setActiveTab] = useState<string>(initialReportTab);
  const [selectedBenId, setSelectedBenId] = useState<string>(initialBeneficiaryId || (beneficiaries[0]?.id || ''));
  const [selectedBookAuditId, setSelectedBookAuditId] = useState<string>(chequeBooks[0]?.id || '');

  // Filter cheques by account if specified
  const accountCheques = useMemo(() => {
    if (selectedAccountId === 'all') return issuedCheques;
    return issuedCheques.filter((c) => c.bankAccountId === selectedAccountId);
  }, [issuedCheques, selectedAccountId]);

  // 1. Cashed Cheques
  const cashedList = useMemo(() => {
    return accountCheques.filter((c) => c.status === 'cashed');
  }, [accountCheques]);
  const totalCashedAmount = cashedList.reduce((s, c) => s + c.amount, 0);

  // 2. Uncashed / Outstanding Cheques
  const uncashedList = useMemo(() => {
    return accountCheques.filter((c) => c.status === 'issued');
  }, [accountCheques]);
  const totalUncashedAmount = uncashedList.reduce((s, c) => s + c.amount, 0);

  // 3. Cheques by Beneficiary
  const beneficiaryCheques = useMemo(() => {
    if (!selectedBenId) return [];
    const ben = beneficiaries.find((b) => b.id === selectedBenId);
    if (!ben) return [];
    return accountCheques.filter(
      (c) => c.beneficiaryId === selectedBenId || c.beneficiaryName === ben.nameAr
    );
  }, [accountCheques, selectedBenId, beneficiaries]);

  const benTotalIssued = beneficiaryCheques.reduce((s, c) => s + c.amount, 0);
  const benTotalCashed = beneficiaryCheques.filter((c) => c.status === 'cashed').reduce((s, c) => s + c.amount, 0);
  const benTotalPending = beneficiaryCheques.filter((c) => c.status === 'issued').reduce((s, c) => s + c.amount, 0);

  // 4. Cheque Book Serials Audit
  const auditedBook = chequeBooks.find((b) => b.id === selectedBookAuditId) || chequeBooks[0];
  const auditLeaves = useMemo(() => {
    if (!auditedBook) return [];
    const leaves = [];
    const bookCheques = issuedCheques.filter((c) => c.chequeBookId === auditedBook.id);

    for (let serial = auditedBook.serialFrom; serial <= auditedBook.serialTo; serial++) {
      const chk = bookCheques.find((c) => c.chequeNumber === serial);
      leaves.push({
        serial,
        serialStr: String(serial).padStart(8, '0'),
        isUsed: !!chk,
        cheque: chk,
        status: chk ? chk.status : 'available',
      });
    }
    return leaves;
  }, [auditedBook, issuedCheques]);

  const handlePrint = () => {
    window.print();
  };

  const handleExportCSV = (filename: string, headers: string[], rows: any[][]) => {
    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${filename}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      
      {/* Title Bar */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4 print:hidden">
        <div>
          <h2 className="text-xl font-black text-slate-900">مركز تقارير الشيكات المصرفية</h2>
          <p className="text-xs text-slate-500 mt-1">
            تقارير الشيكات المنصرفة، الشيكات المعلقة، كشوف حسابات المستفيدين، وتدقيق دفاتر الشيكات
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Account Filter */}
          <div className="flex items-center gap-1.5 bg-slate-50 p-1.5 rounded-xl border border-slate-200 text-xs">
            <span className="font-bold text-slate-600">الحساب:</span>
            <select
              value={selectedAccountId}
              onChange={(e) => onSelectAccount(e.target.value)}
              className="bg-white border border-slate-300 font-bold rounded-lg px-2.5 py-1 text-slate-800"
            >
              <option value="all">كافة الحسابات البنكية</option>
              {bankAccounts.map((acc) => (
                <option key={acc.id} value={acc.id}>
                  {acc.bankName}
                </option>
              ))}
            </select>
          </div>

          <button
            type="button"
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl text-xs transition shadow-xs"
          >
            <Printer className="w-4 h-4" />
            <span>طباعة التقرير</span>
          </button>
        </div>
      </div>

      {/* Sub Tabs Navigation */}
      <div className="bg-white p-1.5 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-1 overflow-x-auto print:hidden">
        <button
          type="button"
          onClick={() => setActiveTab('cashed')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition shrink-0 ${
            activeTab === 'cashed'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <CheckCircle2 className="w-4 h-4" />
          <span>1. تقرير الشيكات المنصرفة ({cashedList.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('uncashed')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition shrink-0 ${
            activeTab === 'uncashed'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <Clock className="w-4 h-4" />
          <span>2. تقرير الشيكات التي لم تصرف ({uncashedList.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('beneficiary')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition shrink-0 ${
            activeTab === 'beneficiary'
              ? 'bg-purple-600 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <User className="w-4 h-4" />
          <span>3. تقرير الشيكات المصدرة لمستفيد</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('book_audit')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition shrink-0 ${
            activeTab === 'book_audit'
              ? 'bg-amber-600 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <BookOpen className="w-4 h-4" />
          <span>4. تدقيق دفاتر الشيكات وتسلسل الأرقام</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* 1. REPORT: CASHED CHEQUES                                                */}
      {/* ========================================================================= */}
      {activeTab === 'cashed' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                <span>تقرير الشيكات المنصرفة والمخصومة من الحسابات البنكية</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                حصر الشيكات التي قدمت للمقاصة وصُرفت فعلياً مع تواريخ الخصم ومبالغها
              </p>
            </div>

            <div className="flex items-center gap-3">
              <div className="text-left bg-emerald-50 px-3.5 py-1.5 rounded-xl border border-emerald-200">
                <span className="text-[10px] text-emerald-700 font-bold block">إجمالي المنصرف:</span>
                <span className="text-base font-mono font-black text-emerald-950">
                  {totalCashedAmount.toFixed(3)} د.ك
                </span>
              </div>

              <button
                type="button"
                onClick={() => {
                  const headers = ['رقم الشيك', 'الحساب البنكي', 'المستفيد', 'المبلغ (د.ك)', 'تاريخ التحرير', 'تاريخ الصرف', 'البيان'];
                  const rows = cashedList.map((c) => [
                    `"${c.chequeNumberStr}"`,
                    `"${bankAccounts.find((a) => a.id === c.bankAccountId)?.bankName || ''}"`,
                    `"${c.beneficiaryName}"`,
                    c.amount.toFixed(3),
                    c.issueDate,
                    c.cashedDate || '',
                    `"${c.purpose || ''}"`,
                  ]);
                  handleExportCSV('تقرير_الشيكات_المنصرفة', headers, rows);
                }}
                className="p-2 border border-slate-300 hover:bg-slate-50 rounded-xl text-slate-700 text-xs font-bold transition flex items-center gap-1 print:hidden"
                title="تصدير Excel"
              >
                <Download className="w-4 h-4 text-emerald-600" />
                <span>Excel</span>
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-emerald-50/70 font-bold text-emerald-950 border-b border-emerald-100">
                <tr>
                  <th className="p-3">رقم الشيك</th>
                  <th className="p-3">اسم المستفيد</th>
                  <th className="p-3">البنك والحساب</th>
                  <th className="p-3 text-center">المبلغ (د.ك)</th>
                  <th className="p-3 text-center">تاريخ التحرير</th>
                  <th className="p-3 text-center">تاريخ الصرف بالبنك</th>
                  <th className="p-3">البيان والغرض</th>
                  <th className="p-3 text-center print:hidden">إجراء</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {cashedList.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-6 text-center text-slate-400">
                      لا توجد شيكات منصرفة مسجلة لهذا الحساب
                    </td>
                  </tr>
                ) : (
                  cashedList.map((c) => {
                    const acc = bankAccounts.find((a) => a.id === c.bankAccountId);
                    return (
                      <tr key={c.id} className="hover:bg-slate-50 transition">
                        <td className="p-3 font-mono font-black text-slate-900 bg-slate-50/50">
                          #{c.chequeNumberStr}
                        </td>
                        <td className="p-3 font-bold text-slate-900">{c.beneficiaryName}</td>
                        <td className="p-3 text-slate-600 text-[11px]">{acc?.bankName}</td>
                        <td className="p-3 text-center font-mono font-black text-emerald-900 text-sm">
                          {c.amount.toFixed(3)}
                        </td>
                        <td className="p-3 text-center font-mono text-slate-600">{c.issueDate}</td>
                        <td className="p-3 text-center font-mono font-bold text-emerald-700 bg-emerald-50/40">
                          {c.cashedDate || '-'}
                        </td>
                        <td className="p-3 text-slate-600 text-[11px]">{c.purpose || '-'}</td>
                        <td className="p-3 text-center print:hidden">
                          <button
                            type="button"
                            onClick={() => onPrintCheque(c)}
                            className="p-1 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded transition"
                            title="عرض وطباعة الشيك"
                          >
                            <Printer className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
              {cashedList.length > 0 && (
                <tfoot className="bg-slate-50 font-bold border-t-2 border-slate-200">
                  <tr>
                    <td colSpan={3} className="p-3 text-slate-900 text-sm">
                      الإجمالي الكلي للشيكات المنصرفة ({cashedList.length} شيك):
                    </td>
                    <td className="p-3 text-center font-mono font-black text-emerald-900 text-base">
                      {totalCashedAmount.toFixed(3)} د.ك
                    </td>
                    <td colSpan={4}></td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. REPORT: UNCASHED / OUTSTANDING CHEQUES                                */}
      {/* ========================================================================= */}
      {activeTab === 'uncashed' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                <Clock className="w-5 h-5 text-blue-600" />
                <span>تقرير الشيكات التي لم تصرف بعد (الالتزامات المعلقة قيد التداول)</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                متابعة الشيكات المحررة التي لم تقدم للمقاصة أو لم يتم خصمها من رصيد الحساب حتى الآن
              </p>
            </div>

            <div className="flex items-center gap-3">
              <div className="text-left bg-blue-50 px-3.5 py-1.5 rounded-xl border border-blue-200">
                <span className="text-[10px] text-blue-700 font-bold block">إجمالي الشيكات المعلقة:</span>
                <span className="text-base font-mono font-black text-blue-950">
                  {totalUncashedAmount.toFixed(3)} د.ك
                </span>
              </div>

              <button
                type="button"
                onClick={() => {
                  const headers = ['رقم الشيك', 'الحساب البنكي', 'المستفيد', 'المبلغ (د.ك)', 'تاريخ التحرير', 'تاريخ الاستحقاق', 'البيان'];
                  const rows = uncashedList.map((c) => [
                    `"${c.chequeNumberStr}"`,
                    `"${bankAccounts.find((a) => a.id === c.bankAccountId)?.bankName || ''}"`,
                    `"${c.beneficiaryName}"`,
                    c.amount.toFixed(3),
                    c.issueDate,
                    c.dueDate,
                    `"${c.purpose || ''}"`,
                  ]);
                  handleExportCSV('تقرير_الشيكات_التي_لم_تصرف', headers, rows);
                }}
                className="p-2 border border-slate-300 hover:bg-slate-50 rounded-xl text-slate-700 text-xs font-bold transition flex items-center gap-1 print:hidden"
                title="تصدير Excel"
              >
                <Download className="w-4 h-4 text-blue-600" />
                <span>Excel</span>
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-blue-50/70 font-bold text-blue-950 border-b border-blue-100">
                <tr>
                  <th className="p-3">رقم الشيك</th>
                  <th className="p-3">اسم المستفيد</th>
                  <th className="p-3">البنك والحساب</th>
                  <th className="p-3 text-center">المبلغ (د.ك)</th>
                  <th className="p-3 text-center">تاريخ التحرير</th>
                  <th className="p-3 text-center">تاريخ الاستحقاق</th>
                  <th className="p-3 text-center">المدة المنقضية</th>
                  <th className="p-3">البيان والغرض</th>
                  <th className="p-3 text-center print:hidden">إجراء</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {uncashedList.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="p-6 text-center text-slate-400">
                      لا توجد شيكات معلقة - كافة الشيكات المحررة تم صرفها بنجاح
                    </td>
                  </tr>
                ) : (
                  uncashedList.map((c) => {
                    const acc = bankAccounts.find((a) => a.id === c.bankAccountId);
                    const today = new Date();
                    const issDate = new Date(c.issueDate);
                    const daysAgo = Math.floor((today.getTime() - issDate.getTime()) / (1000 * 60 * 60 * 24));

                    return (
                      <tr key={c.id} className="hover:bg-slate-50 transition">
                        <td className="p-3 font-mono font-black text-slate-900 bg-slate-50/50">
                          #{c.chequeNumberStr}
                        </td>
                        <td className="p-3 font-bold text-slate-900">{c.beneficiaryName}</td>
                        <td className="p-3 text-slate-600 text-[11px]">{acc?.bankName}</td>
                        <td className="p-3 text-center font-mono font-black text-blue-950 text-sm">
                          {c.amount.toFixed(3)}
                        </td>
                        <td className="p-3 text-center font-mono text-slate-600">{c.issueDate}</td>
                        <td className="p-3 text-center font-mono font-bold text-slate-800">{c.dueDate}</td>
                        <td className="p-3 text-center">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            daysAgo > 30 ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-700'
                          }`}>
                            {daysAgo > 0 ? `منذ ${daysAgo} يوماً` : 'اليوم'}
                          </span>
                        </td>
                        <td className="p-3 text-slate-600 text-[11px]">{c.purpose || '-'}</td>
                        <td className="p-3 text-center print:hidden">
                          <button
                            type="button"
                            onClick={() => onPrintCheque(c)}
                            className="p-1 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded transition"
                            title="عرض وطباعة الشيك"
                          >
                            <Printer className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
              {uncashedList.length > 0 && (
                <tfoot className="bg-slate-50 font-bold border-t-2 border-slate-200">
                  <tr>
                    <td colSpan={3} className="p-3 text-slate-900 text-sm">
                      إجمالي الالتزامات المعلقة لم تصرف ({uncashedList.length} شيك):
                    </td>
                    <td className="p-3 text-center font-mono font-black text-blue-950 text-base">
                      {totalUncashedAmount.toFixed(3)} د.ك
                    </td>
                    <td colSpan={5}></td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. REPORT: CHEQUES ISSUED TO BENEFICIARY                                 */}
      {/* ========================================================================= */}
      {activeTab === 'beneficiary' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                <User className="w-5 h-5 text-purple-600" />
                <span>تقرير وكشف حساب الشيكات المصدرة لمستفيد محدد</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                استعراض كشف تفصيلي لكافة الشيكات المحررة لمستفيد معين وتتبع حالتها
              </p>
            </div>

            {/* Select Beneficiary */}
            <div className="flex items-center gap-2 print:hidden">
              <span className="text-xs font-bold text-slate-600">اختر المستفيد:</span>
              <select
                value={selectedBenId}
                onChange={(e) => setSelectedBenId(e.target.value)}
                className="p-2 border border-slate-300 rounded-xl bg-slate-50 text-xs font-bold text-slate-800"
              >
                {beneficiaries.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.nameAr}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Beneficiary Header Info Card */}
          {(() => {
            const ben = beneficiaries.find((b) => b.id === selectedBenId);
            if (!ben) return null;
            return (
              <div className="bg-purple-50/50 p-4 rounded-2xl border border-purple-200 grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
                <div>
                  <span className="text-purple-700 font-bold block text-[10px]">اسم المستفيد:</span>
                  <strong className="text-slate-900 text-sm font-black">{ben.nameAr}</strong>
                  {ben.nameEn && <div className="text-[10px] text-slate-500 font-sans">{ben.nameEn}</div>}
                </div>

                <div>
                  <span className="text-purple-700 font-bold block text-[10px]">الرقم المدني / السجل:</span>
                  <span className="font-mono font-bold text-slate-800">{ben.civilIdOrCR || '-'}</span>
                </div>

                <div>
                  <span className="text-purple-700 font-bold block text-[10px]">البنك والآيبان:</span>
                  <span className="text-slate-800 block">{ben.bankName || '-'}</span>
                  <span className="font-mono text-[10px] text-slate-500">{ben.iban || ''}</span>
                </div>

                <div className="text-left">
                  <span className="text-purple-700 font-bold block text-[10px]">إجمالي المبالغ المصدرة:</span>
                  <strong className="text-base font-mono font-black text-purple-950">
                    {benTotalIssued.toFixed(3)} د.ك
                  </strong>
                </div>
              </div>
            );
          })()}

          {/* Sub Totals */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-slate-50 p-3 rounded-xl text-center border border-slate-200">
              <span className="text-[10px] text-slate-500 block">إجمالي الشيكات:</span>
              <strong className="font-mono font-black text-slate-900">{beneficiaryCheques.length} شيك</strong>
            </div>

            <div className="bg-emerald-50/60 p-3 rounded-xl text-center border border-emerald-200">
              <span className="text-[10px] text-emerald-700 block font-bold">المنصرف منها:</span>
              <strong className="font-mono font-black text-emerald-950">{benTotalCashed.toFixed(3)} د.ك</strong>
            </div>

            <div className="bg-blue-50/60 p-3 rounded-xl text-center border border-blue-200">
              <span className="text-[10px] text-blue-700 block font-bold">المعلق قيد الصرف:</span>
              <strong className="font-mono font-black text-blue-950">{benTotalPending.toFixed(3)} د.ك</strong>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-50 font-bold text-slate-700 border-b border-slate-200">
                <tr>
                  <th className="p-3">رقم الشيك</th>
                  <th className="p-3">البنك والحساب</th>
                  <th className="p-3 text-center">المبلغ (د.ك)</th>
                  <th className="p-3 text-center">تاريخ التحرير</th>
                  <th className="p-3 text-center">تاريخ الاستحقاق</th>
                  <th className="p-3 text-center">الحالة</th>
                  <th className="p-3">البيان والغرض</th>
                  <th className="p-3 text-center print:hidden">إجراء</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {beneficiaryCheques.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-6 text-center text-slate-400">
                      لم يتم إصدار شيكات لهذا المستفيد حتى الآن
                    </td>
                  </tr>
                ) : (
                  beneficiaryCheques.map((c) => {
                    const acc = bankAccounts.find((a) => a.id === c.bankAccountId);
                    return (
                      <tr key={c.id} className="hover:bg-slate-50 transition">
                        <td className="p-3 font-mono font-black text-slate-900 bg-slate-50/50">
                          #{c.chequeNumberStr}
                        </td>
                        <td className="p-3 text-slate-600 text-[11px]">{acc?.bankName}</td>
                        <td className="p-3 text-center font-mono font-black text-slate-900 text-sm">
                          {c.amount.toFixed(3)}
                        </td>
                        <td className="p-3 text-center font-mono text-slate-600">{c.issueDate}</td>
                        <td className="p-3 text-center font-mono text-slate-600">{c.dueDate}</td>
                        <td className="p-3 text-center">
                          {c.status === 'cashed' && (
                            <span className="bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full text-[10px]">
                              منصرف
                            </span>
                          )}
                          {c.status === 'issued' && (
                            <span className="bg-blue-100 text-blue-800 font-bold px-2 py-0.5 rounded-full text-[10px]">
                              معلق
                            </span>
                          )}
                          {c.status === 'cancelled' && (
                            <span className="bg-rose-100 text-rose-800 font-bold px-2 py-0.5 rounded-full text-[10px]">
                              ملغى
                            </span>
                          )}
                        </td>
                        <td className="p-3 text-slate-600 text-[11px]">{c.purpose || '-'}</td>
                        <td className="p-3 text-center print:hidden">
                          <button
                            type="button"
                            onClick={() => onPrintCheque(c)}
                            className="p-1 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded transition"
                            title="عرض وطباعة الشيك"
                          >
                            <Printer className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. REPORT: CHEQUE BOOKS AND SERIALS AUDIT                                 */}
      {/* ========================================================================= */}
      {activeTab === 'book_audit' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-amber-600" />
                <span>تقرير تدقيق دفاتر الشيكات وتسلسل الأوراق (من رقم كذا إلى رقم كذا)</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                مراجعة تسلسل كل ورقة شيك بالدفتر لمعرفة المستخدم، المنصرف، الشاغر، والملغى
              </p>
            </div>

            {/* Select Book */}
            <div className="flex items-center gap-2 print:hidden">
              <span className="text-xs font-bold text-slate-600">دفتر الشيكات:</span>
              <select
                value={selectedBookAuditId}
                onChange={(e) => setSelectedBookAuditId(e.target.value)}
                className="p-2 border border-slate-300 rounded-xl bg-slate-50 text-xs font-bold text-slate-800"
              >
                {chequeBooks.map((bk) => {
                  const acc = bankAccounts.find((a) => a.id === bk.bankAccountId);
                  return (
                    <option key={bk.id} value={bk.id}>
                      {bk.bookName} ({bk.serialFrom} - {bk.serialTo}) - {acc?.bankName}
                    </option>
                  );
                })}
              </select>
            </div>
          </div>

          {/* Book Header Card */}
          {auditedBook && (
            <div className="bg-amber-50/70 p-4 rounded-2xl border border-amber-200 grid grid-cols-2 sm:grid-cols-5 gap-3 text-xs">
              <div>
                <span className="text-amber-800 font-bold block text-[10px]">كود الدفتر:</span>
                <strong className="font-mono text-slate-900 font-black">{auditedBook.bookCode}</strong>
              </div>
              <div>
                <span className="text-amber-800 font-bold block text-[10px]">بداية التسلسل:</span>
                <strong className="font-mono text-slate-900 font-black">{auditedBook.serialFrom}</strong>
              </div>
              <div>
                <span className="text-amber-800 font-bold block text-[10px]">نهاية التسلسل:</span>
                <strong className="font-mono text-slate-900 font-black">{auditedBook.serialTo}</strong>
              </div>
              <div>
                <span className="text-amber-800 font-bold block text-[10px]">إجمالي الأوراق:</span>
                <strong className="font-mono text-slate-900 font-black">{auditedBook.totalLeaves} ورقة</strong>
              </div>
              <div>
                <span className="text-amber-800 font-bold block text-[10px]">الشيك التالي:</span>
                <span className="bg-amber-200 text-amber-950 font-mono font-black px-2 py-0.5 rounded text-xs">
                  {auditedBook.currentSerial}
                </span>
              </div>
            </div>
          )}

          {/* Leaves Audit Grid */}
          <div className="space-y-3">
            <div className="flex items-center gap-4 text-xs font-bold">
              <span className="text-slate-600">دليل ألوان حالة الأوراق:</span>
              <span className="flex items-center gap-1 text-emerald-800">
                <span className="w-3 h-3 rounded-full bg-emerald-500" /> منصرف
              </span>
              <span className="flex items-center gap-1 text-blue-800">
                <span className="w-3 h-3 rounded-full bg-blue-500" /> صادر (معلق)
              </span>
              <span className="flex items-center gap-1 text-rose-800">
                <span className="w-3 h-3 rounded-full bg-rose-500" /> ملغى
              </span>
              <span className="flex items-center gap-1 text-slate-500">
                <span className="w-3 h-3 rounded-full bg-slate-200 border border-slate-300" /> شاغر متاح
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-5 md:grid-cols-8 lg:grid-cols-10 gap-2 font-mono">
              {auditLeaves.map((leaf) => {
                const bgClass =
                  leaf.status === 'cashed' ? 'bg-emerald-100 border-emerald-400 text-emerald-950' :
                  leaf.status === 'issued' ? 'bg-blue-100 border-blue-400 text-blue-950' :
                  leaf.status === 'cancelled' ? 'bg-rose-100 border-rose-400 text-rose-950 line-through' :
                  'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100';

                return (
                  <div
                    key={leaf.serial}
                    className={`p-2 rounded-xl border text-center text-xs transition cursor-default ${bgClass}`}
                    title={
                      leaf.cheque
                        ? `شيك #${leaf.serialStr}\nالمستفيد: ${leaf.cheque.beneficiaryName}\nالمبلغ: ${leaf.cheque.amount.toFixed(3)} د.ك\nالحالة: ${leaf.cheque.status}`
                        : `ورقة شيك رقم #${leaf.serialStr} (شاغرة ومتاحة بالدفتر)`
                    }
                  >
                    <div className="font-black text-[11px]">{leaf.serial}</div>
                    <div className="text-[9px] mt-0.5">
                      {leaf.status === 'cashed' && 'منصرف'}
                      {leaf.status === 'issued' && 'معلق'}
                      {leaf.status === 'cancelled' && 'ملغى'}
                      {leaf.status === 'available' && 'شاغر'}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

        </div>
      )}

    </div>
  );
}
