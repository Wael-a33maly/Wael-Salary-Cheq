import React, { useState } from 'react';
import {
  FileText,
  CheckCircle2,
  DollarSign,
  Percent,
  CreditCard,
  Building,
  HelpCircle,
  AlertTriangle
} from 'lucide-react';
import {
  BankFeeType,
  ReconciliationJournalEntry,
  BankStatementTransaction,
  ReconciliationDifference
} from '../../types/reconciliationTypes';

interface JournalEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
  bankTx?: BankStatementTransaction | null;
  difference?: ReconciliationDifference | null;
  bankAccountName: string;
  defaultFeeAccount: string;
  onSaveEntry: (entry: ReconciliationJournalEntry) => void;
}

export const BANK_FEE_TYPES: { type: BankFeeType; label: string; desc: string }[] = [
  { type: 'knet_fee', label: 'عمولة K-NET', desc: 'رسوم تسوية مدفوعات شبكة كي نت' },
  { type: 'bank_transfer_fee', label: 'عمولة تحويل بنكي', desc: 'رسوم حوالات سويفت ومقاصة محلية' },
  { type: 'pos_fee', label: 'رسوم نقاط البيع (POS)', desc: 'خصومات أجهزة الدفع بالمحلات' },
  { type: 'atm_fee', label: 'رسوم سحب نقدي', desc: 'عمولات الصراف الآلي وشبكة خليجية' },
  { type: 'account_service_fee', label: 'رسوم خدمة بنكية شهرية', desc: 'رسوم الخدمات المصرفية أونلاين' },
  { type: 'rounding_diff', label: 'فرق تقريب حسابي', desc: 'فروقات الفلس البسيطة' },
  { type: 'other_bank_expense', label: 'مصروف بنكي آخر', desc: 'مصاريف ودمغات بنكية متنوعة' },
];

export function JournalEntryModal({
  isOpen,
  onClose,
  bankTx,
  difference,
  bankAccountName,
  defaultFeeAccount,
  onSaveEntry,
}: JournalEntryModalProps) {
  if (!isOpen) return null;

  const initialAmount = bankTx ? Math.abs(bankTx.netAmount) : difference ? difference.differenceValue : 0;
  const initialDate = bankTx?.transactionDate || difference?.transactionDate || new Date().toISOString().substring(0, 10);
  const initialRef = bankTx?.referenceNumber || difference?.referenceNumber || 'JV-REC';

  const [entryType, setEntryType] = useState<'bank_fee' | 'adjustment' | 'direct_deposit' | 'direct_withdrawal'>('bank_fee');
  const [feeType, setFeeType] = useState<BankFeeType>('knet_fee');
  const [counterAccountId, setCounterAccountId] = useState('5020-01');
  const [counterAccountName, setCounterAccountName] = useState('مصروف عمولات ومصاريف بنكية');
  const [amount, setAmount] = useState<number>(initialAmount);
  const [entryDate, setEntryDate] = useState<string>(initialDate);
  const [referenceNumber, setReferenceNumber] = useState<string>(initialRef);
  const [description, setDescription] = useState<string>(
    bankTx
      ? `عمولة بنكية / قيد تسوية حسب كشف البنك للعملية ${bankTx.referenceNumber}`
      : `قيد تسوية فرق مطابقة البنك بتاريخ ${initialDate}`
  );
  const [taxAmount, setTaxAmount] = useState<number>(0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (amount <= 0) {
      alert('يجب إدخال مبلغ صحيح للقيد');
      return;
    }

    const newEntry: ReconciliationJournalEntry = {
      id: `jv-${Date.now()}`,
      sessionId: 'current-session',
      entryNumber: `JV-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
      entryDate,
      bankAccountId: 'bank-acc-active',
      counterAccountId,
      counterAccountName,
      amount,
      entryType,
      feeType: entryType === 'bank_fee' ? feeType : undefined,
      referenceNumber,
      description,
      taxAmount: taxAmount > 0 ? taxAmount : undefined,
      createdBy: 'المسؤول المالي',
      createdAt: new Date().toISOString().replace('T', ' ').substring(0, 19),
      sourceTxId: bankTx?.id || difference?.id || '',
    };

    onSaveEntry(newEntry);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden flex flex-col">
        
        {/* Header */}
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center">
              <FileText className="w-4 h-4 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-sm">إنشاء قيد محاسبي / إقفال عمولة بنكية</h3>
              <p className="text-slate-400 text-xs">ترحيل القيد وربطه مباشرة بحركة التسوية المصرفية</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white font-bold p-1">
            ✕
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          
          {/* Quick Tabs: Fee vs General Entry */}
          <div className="flex rounded-xl bg-slate-100 p-1">
            <button
              type="button"
              onClick={() => {
                setEntryType('bank_fee');
                setCounterAccountName('مصروف عمولات ومصاريف بنكية');
                setCounterAccountId('5020-01');
              }}
              className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition ${
                entryType === 'bank_fee'
                  ? 'bg-white text-emerald-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              إقفال كعمولة بنكية (Bank Fee)
            </button>
            <button
              type="button"
              onClick={() => {
                setEntryType('adjustment');
                setCounterAccountName('أرباح وخسائر تسوية أرصدة بنكية');
                setCounterAccountId('5090-09');
              }}
              className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition ${
                entryType === 'adjustment'
                  ? 'bg-white text-blue-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              قيد تسوية / حركة مباشرة
            </button>
          </div>

          {/* If bank fee, select fee type */}
          {entryType === 'bank_fee' && (
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                نوع العمولة المصرفية:
              </label>
              <select
                value={feeType}
                onChange={(e) => setFeeType(e.target.value as BankFeeType)}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-xs font-semibold focus:ring-2 focus:ring-emerald-500"
              >
                {BANK_FEE_TYPES.map((f) => (
                  <option key={f.type} value={f.type}>
                    {f.label} ({f.desc})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Account Details */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">
                الحساب البنكي (المتأثر):
              </label>
              <input
                type="text"
                disabled
                value={bankAccountName}
                className="w-full bg-slate-100 border border-slate-300 rounded-lg p-2 text-xs text-slate-600 font-bold"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">
                حساب الطرف المقابل:
              </label>
              <input
                type="text"
                value={counterAccountName}
                onChange={(e) => setCounterAccountName(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs font-bold text-slate-800 focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          {/* Amount & Date */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">
                المبلغ (د.ك):
              </label>
              <input
                type="number"
                step="0.001"
                min="0.001"
                value={amount}
                onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
                className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs font-mono font-black text-emerald-800 focus:ring-2 focus:ring-emerald-500 text-left"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">
                تاريخ القيد:
              </label>
              <input
                type="date"
                value={entryDate}
                onChange={(e) => setEntryDate(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs font-mono text-slate-800 focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          {/* Reference & Description */}
          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1">
              رقم المرجع / المستند:
            </label>
            <input
              type="text"
              value={referenceNumber}
              onChange={(e) => setReferenceNumber(e.target.value)}
              className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs font-mono text-slate-800 focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1">
              شرح وبيان القيد:
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs text-slate-800 focus:ring-2 focus:ring-emerald-500 resize-none font-sans"
            />
          </div>

          {/* Audit disclaimer */}
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-2.5 flex items-center gap-2 text-[11px] text-amber-900">
            <AlertTriangle className="w-4 h-4 flex-shrink-0 text-amber-600" />
            <span>سيتم تسجيل القيد في سجل تدقيق المطابقة المستقل وتحديث حالة الحركة فورياً.</span>
          </div>

          {/* Submit Buttons */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition"
            >
              إلغاء
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-md transition flex items-center gap-1.5"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>تأكيد وإنشاء القيد</span>
            </button>
          </div>

        </form>

      </div>
    </div>
  );
}
