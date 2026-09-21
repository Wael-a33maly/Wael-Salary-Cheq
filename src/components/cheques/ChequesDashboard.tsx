import React from 'react';
import { 
  Landmark, 
  Receipt, 
  CheckCircle2, 
  Clock, 
  ShieldAlert, 
  Plus, 
  ArrowUpRight, 
  Printer, 
  TrendingUp, 
  Building,
  UserCheck,
  FileText
} from 'lucide-react';
import { BankAccount, ChequeBook, IssuedCheque, Beneficiary } from '../../types';

interface ChequesDashboardProps {
  bankAccounts: BankAccount[];
  selectedAccountId: string;
  onSelectAccount: (accId: string) => void;
  chequeBooks: ChequeBook[];
  issuedCheques: IssuedCheque[];
  beneficiaries: Beneficiary[];
  onNavigateToIssue: (prefillBeneficiaryId?: string) => void;
  onNavigateToLedger: (filterStatus?: 'all' | 'issued' | 'cashed' | 'cancelled') => void;
  onNavigateToBeneficiaries: () => void;
  onNavigateToReports: (reportType?: string) => void;
  onPrintCheque: (cheque: IssuedCheque) => void;
  onPrintReceiptOrEnvelope?: (cheque: IssuedCheque) => void;
  onStatusChange: (chequeId: string, newStatus: 'issued' | 'cashed' | 'cancelled') => void;
  onOpenSettings?: (bookId?: string) => void;
}

export function ChequesDashboard({
  bankAccounts,
  selectedAccountId,
  onSelectAccount,
  chequeBooks,
  issuedCheques,
  beneficiaries,
  onNavigateToIssue,
  onNavigateToLedger,
  onNavigateToBeneficiaries,
  onNavigateToReports,
  onPrintCheque,
  onPrintReceiptOrEnvelope,
  onStatusChange,
}: ChequesDashboardProps) {
  // Filter data by selected account (or all)
  const isAllAccounts = selectedAccountId === 'all';
  const activeAccount = bankAccounts.find((a) => a.id === selectedAccountId) || bankAccounts[0];

  const relevantCheques = isAllAccounts
    ? issuedCheques
    : issuedCheques.filter((c) => c.bankAccountId === selectedAccountId);

  const relevantBooks = isAllAccounts
    ? chequeBooks
    : chequeBooks.filter((b) => b.bankAccountId === selectedAccountId);

  // Totals calculations in KWD
  const totalIssuedCount = relevantCheques.length;
  const totalIssuedAmount = relevantCheques.reduce((s, c) => s + c.amount, 0);

  const cashedCheques = relevantCheques.filter((c) => c.status === 'cashed');
  const cashedAmount = cashedCheques.reduce((s, c) => s + c.amount, 0);

  const pendingCheques = relevantCheques.filter((c) => c.status === 'issued'); // لم تصرف
  const pendingAmount = pendingCheques.reduce((s, c) => s + c.amount, 0);

  const cancelledCheques = relevantCheques.filter((c) => c.status === 'cancelled');
  const cancelledAmount = cancelledCheques.reduce((s, c) => s + c.amount, 0);

  // Active book for the selected account
  const activeBook = relevantBooks.find((b) => b.status === 'active') || relevantBooks[0];
  const usedLeaves = activeBook
    ? issuedCheques.filter((c) => c.chequeBookId === activeBook.id).length
    : 0;
  const remainingLeaves = activeBook ? Math.max(0, activeBook.totalLeaves - usedLeaves) : 0;
  const usagePercentage = activeBook ? Math.round((usedLeaves / activeBook.totalLeaves) * 100) : 0;

  // Recent cheques
  const recentCheques = [...relevantCheques]
    .sort((a, b) => new Date(b.issueDate).getTime() - new Date(a.issueDate).getTime())
    .slice(0, 6);

  return (
    <div className="space-y-6">

      {/* Account Selector Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        <div
          onClick={() => onSelectAccount('all')}
          className={`cursor-pointer p-4 rounded-2xl border transition-all ${
            isAllAccounts
              ? 'bg-blue-50/80 border-blue-500 shadow-md ring-2 ring-blue-500/20'
              : 'bg-white border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="flex justify-between items-center mb-1">
            <span className="text-xs font-bold text-slate-600">كافة الحسابات</span>
            <Building className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-lg font-mono font-black text-slate-900">
            {bankAccounts.length} حسابات معتمدة
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            إجمالي رصيد: {bankAccounts.reduce((s, a) => s + a.currentBalance, 0).toFixed(3)} د.ك
          </div>
        </div>

        {bankAccounts.map((acc) => {
          const isSelected = selectedAccountId === acc.id;
          const isCBK = acc.bankCode === 'CBK';
          return (
            <div
              key={acc.id}
              onClick={() => onSelectAccount(acc.id)}
              className={`cursor-pointer p-4 rounded-2xl border transition-all ${
                isSelected
                  ? 'bg-amber-50/80 border-amber-500 shadow-md ring-2 ring-amber-500/20'
                  : 'bg-white border-slate-200 hover:border-slate-300'
              }`}
            >
              <div className="flex justify-between items-center mb-1">
                <span className="text-xs font-bold text-slate-700 truncate">{acc.bankName}</span>
                {isCBK && (
                  <span className="bg-amber-400 text-slate-950 font-mono text-[9px] font-black px-1.5 py-0.5 rounded">
                    CBK
                  </span>
                )}
              </div>
              <div className="text-base font-black text-slate-900 truncate">
                {acc.accountName}
              </div>
              <div className="flex justify-between items-center text-[11px] text-slate-500 mt-1.5 font-mono">
                <span>رقم: {acc.accountNumber}</span>
                <span className="font-bold text-emerald-700">{acc.currentBalance.toFixed(3)} د.ك</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* 4 Main Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Total Issued */}
        <div 
          onClick={() => onNavigateToLedger('all')}
          className="cursor-pointer bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:border-slate-300 transition"
        >
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs font-bold text-slate-500">إجمالي الشيكات المصدرة</span>
            <div className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center text-slate-700">
              <Receipt className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-mono font-black text-slate-900">
            {totalIssuedAmount.toFixed(3)} <span className="text-xs text-slate-500">د.ك</span>
          </div>
          <div className="flex items-center justify-between text-xs text-slate-500 mt-2 pt-2 border-t border-slate-100">
            <span>عدد الشيكات: <strong className="text-slate-800 font-mono font-bold">{totalIssuedCount}</strong></span>
            <span className="text-blue-600 font-bold flex items-center gap-0.5">
              عرض السجل <ArrowUpRight className="w-3 h-3" />
            </span>
          </div>
        </div>

        {/* Cashed Cheques */}
        <div 
          onClick={() => onNavigateToReports('cashed')}
          className="cursor-pointer bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:border-slate-300 transition"
        >
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs font-bold text-emerald-700">الشيكات المنصرفة من البنك</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-mono font-black text-emerald-900">
            {cashedAmount.toFixed(3)} <span className="text-xs text-emerald-600">د.ك</span>
          </div>
          <div className="flex items-center justify-between text-xs text-slate-500 mt-2 pt-2 border-t border-slate-100">
            <span>تم صرفها: <strong className="text-emerald-800 font-mono font-bold">{cashedCheques.length} شيك</strong></span>
            <span className="text-emerald-700 font-bold flex items-center gap-0.5">
              كشف المنصرف <ArrowUpRight className="w-3 h-3" />
            </span>
          </div>
        </div>

        {/* Uncashed / Pending Cheques */}
        <div 
          onClick={() => onNavigateToReports('uncashed')}
          className="cursor-pointer bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:border-slate-300 transition"
        >
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs font-bold text-blue-700">الشيكات التي لم تصرف (المعلقة)</span>
            <div className="w-8 h-8 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-mono font-black text-blue-950">
            {pendingAmount.toFixed(3)} <span className="text-xs text-blue-600">د.ك</span>
          </div>
          <div className="flex items-center justify-between text-xs text-slate-500 mt-2 pt-2 border-t border-slate-100">
            <span>قيد التداول: <strong className="text-blue-800 font-mono font-bold">{pendingCheques.length} شيك</strong></span>
            <span className="text-blue-700 font-bold flex items-center gap-0.5">
              تقرير المعلق <ArrowUpRight className="w-3 h-3" />
            </span>
          </div>
        </div>

        {/* Cancelled / Void Cheques */}
        <div 
          onClick={() => onNavigateToLedger('cancelled')}
          className="cursor-pointer bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:border-slate-300 transition"
        >
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs font-bold text-rose-700">الشيكات الملغاة والتالفة</span>
            <div className="w-8 h-8 rounded-xl bg-rose-50 flex items-center justify-center text-rose-600">
              <ShieldAlert className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-mono font-black text-rose-900">
            {cancelledAmount.toFixed(3)} <span className="text-xs text-rose-600">د.ك</span>
          </div>
          <div className="flex items-center justify-between text-xs text-slate-500 mt-2 pt-2 border-t border-slate-100">
            <span>عدد الملغي: <strong className="text-rose-800 font-mono font-bold">{cancelledCheques.length} شيك</strong></span>
            <span className="text-rose-700 font-bold flex items-center gap-0.5">
              كشف الملغي <ArrowUpRight className="w-3 h-3" />
            </span>
          </div>
        </div>

      </div>

      {/* Middle Row: Active Cheque Book Status Card & Account Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left: Cheque Book Status (من رقم كذا إلى رقم كذا) */}
        <div className="lg:col-span-6 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex justify-between items-center border-b border-slate-100 pb-3">
            <div>
              <h3 className="font-black text-slate-900 text-sm">
                حالة دفتر الشيكات النشط وتتبع التسلسل
              </h3>
              <p className="text-xs text-slate-500">
                {activeAccount.bankName} - {activeBook?.bookName || 'لا يوجد دفتر نشط'}
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigateToReports('book_audit')}
              className="text-xs font-bold text-blue-600 hover:text-blue-700 bg-blue-50 px-2.5 py-1 rounded-lg transition"
            >
              تدقيق أوراق الدفتر
            </button>
          </div>

          {activeBook ? (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-2 bg-slate-50 p-3 rounded-xl border border-slate-200 text-center font-mono">
                <div>
                  <span className="text-[10px] text-slate-500 block">من رقم شيك:</span>
                  <strong className="text-slate-900 font-black text-sm">{activeBook.serialFrom}</strong>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 block">إلى رقم شيك:</span>
                  <strong className="text-slate-900 font-black text-sm">{activeBook.serialTo}</strong>
                </div>
                <div>
                  <span className="text-[10px] text-amber-700 block font-bold">الشيك التالي:</span>
                  <strong className="text-amber-800 font-black text-sm bg-amber-100 px-1.5 py-0.5 rounded">
                    {activeBook.currentSerial}
                  </strong>
                </div>
              </div>

              {/* Progress Bar */}
              <div>
                <div className="flex justify-between items-center text-xs mb-1.5">
                  <span className="font-bold text-slate-700">
                    نسبة استخدام الدفتر ({usedLeaves} من {activeBook.totalLeaves} ورقة)
                  </span>
                  <span className="font-mono font-bold text-slate-600">
                    متبقي {remainingLeaves} ورقة ({100 - usagePercentage}%)
                  </span>
                </div>
                <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                  <div
                    style={{ width: `${Math.min(100, usagePercentage)}%` }}
                    className={`h-full rounded-full transition-all ${
                      usagePercentage > 80 ? 'bg-rose-500' : usagePercentage > 50 ? 'bg-amber-500' : 'bg-blue-600'
                    }`}
                  />
                </div>
              </div>

              <div className="flex justify-between items-center text-[11px] text-slate-500 bg-amber-50/70 p-2.5 rounded-xl border border-amber-200">
                <span>تاريخ استلام الدفتر: <strong className="text-slate-800 font-mono">{activeBook.receivedDate}</strong></span>
                <span className="font-bold text-amber-900">جاهز ومطابق لقوالب البنك التجاري الكويتي</span>
              </div>
            </div>
          ) : (
            <div className="p-4 bg-amber-50 text-amber-800 rounded-xl text-xs">
              لم يتم تعيين دفتر شيكات نشط لهذا الحساب. يمكنك إضافة دفتر جديد من شاشة إعدادات الدفاتر.
            </div>
          )}
        </div>

        {/* Right: Bank Account Details Card */}
        <div className="lg:col-span-6 bg-gradient-to-br from-slate-900 to-slate-800 text-white p-6 rounded-2xl shadow-sm space-y-4">
          <div className="flex justify-between items-start border-b border-slate-700/60 pb-3">
            <div>
              <div className="text-[11px] text-amber-400 font-bold uppercase tracking-wider">
                بيانات الحساب البنكي النشط
              </div>
              <h3 className="text-lg font-black mt-0.5">{activeAccount.bankName}</h3>
              <p className="text-xs text-slate-300">{activeAccount.accountName}</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-amber-400/20 border border-amber-400/40 flex items-center justify-center text-amber-400 font-black text-sm">
              {activeAccount.bankCode}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <span className="text-slate-400 block text-[10px]">رقم الحساب:</span>
              <span className="font-mono font-bold text-white text-sm">{activeAccount.accountNumber}</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px]">الرصيد الدفتري الحالي:</span>
              <span className="font-mono font-black text-emerald-400 text-base">
                {activeAccount.currentBalance.toFixed(3)} د.ك
              </span>
            </div>
            <div className="col-span-2">
              <span className="text-slate-400 block text-[10px]">الآيبان الدولي (IBAN):</span>
              <span className="font-mono text-xs text-slate-200 tracking-wider select-all">
                {activeAccount.iban}
              </span>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-700/60 flex justify-between items-center text-[11px] text-slate-300">
            <span>فرع البنك: {activeAccount.branchName}</span>
            <span className="text-amber-300 font-bold">العملة: دينار كويتي (3 خانات)</span>
          </div>
        </div>

      </div>

      {/* Recent Issued Cheques Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
        <div className="flex justify-between items-center border-b border-slate-100 pb-3">
          <div>
            <h3 className="font-black text-slate-900 text-sm">
              أحدث الشيكات المحررة في النظام
            </h3>
            <p className="text-xs text-slate-500">
              عرض لآخر العمليات الصادرة مع إمكانية المعاينة والطباعة الفورية للشيك
            </p>
          </div>
          <button
            type="button"
            onClick={() => onNavigateToLedger('all')}
            className="text-xs font-bold text-blue-600 hover:text-blue-700 bg-blue-50 px-3 py-1.5 rounded-xl transition flex items-center gap-1"
          >
            <span>عرض السجل الكامل</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>

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
                <th className="p-3 text-center">إجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {recentCheques.map((c) => {
                const acc = bankAccounts.find((a) => a.id === c.bankAccountId);
                return (
                  <tr key={c.id} className="hover:bg-slate-50/80 transition">
                    <td className="p-3 font-mono font-black text-slate-900 bg-slate-50/50">
                      #{c.chequeNumberStr}
                    </td>
                    <td className="p-3 font-bold text-slate-900">{c.beneficiaryName}</td>
                    <td className="p-3 text-slate-600 text-[11px]">
                      {acc?.bankName || 'البنك'}
                    </td>
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
                          معلق (لم يصرف)
                        </span>
                      )}
                      {c.status === 'cancelled' && (
                        <span className="bg-rose-100 text-rose-800 font-bold px-2 py-0.5 rounded-full text-[10px]">
                          ملغى
                        </span>
                      )}
                    </td>
                    <td className="p-3 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => onPrintCheque(c)}
                          className="flex items-center gap-1 px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-lg text-[11px] transition"
                          title="معاينة وطباعة الشيك"
                        >
                          <Printer className="w-3.5 h-3.5 text-blue-600" />
                          <span>شيك</span>
                        </button>

                        {onPrintReceiptOrEnvelope && (
                          <button
                            type="button"
                            onClick={() => onPrintReceiptOrEnvelope(c)}
                            className="flex items-center gap-1 px-2 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 font-bold rounded-lg text-[11px] transition"
                            title="طباعة سند الصرف / إيصال الاستلام والمظروف"
                          >
                            <FileText className="w-3.5 h-3.5 text-amber-600" />
                            <span>سند/ظرف</span>
                          </button>
                        )}

                        {c.status === 'issued' && (
                          <button
                            type="button"
                            onClick={() => onStatusChange(c.id, 'cashed')}
                            className="px-2 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold rounded-lg text-[10px] transition"
                            title="تسجيل الصرف من البنك"
                          >
                            صرف
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
