import React, { useState } from 'react';
import { 
  X, 
  Printer, 
  Mail, 
  FileText, 
  CheckCircle2, 
  Building2, 
  User, 
  CreditCard,
  Calendar,
  ShieldCheck,
  Sparkles
} from 'lucide-react';
import { IssuedCheque, BankAccount, Beneficiary, CompanySettings } from '../../types';

interface ChequeReceiptAndEnvelopeModalProps {
  isOpen?: boolean;
  onClose: () => void;
  cheque: IssuedCheque;
  bankAccount?: BankAccount;
  beneficiary?: Beneficiary;
  settings?: CompanySettings;
  companyName?: string;
}

export function ChequeReceiptAndEnvelopeModal({
  isOpen = true,
  onClose,
  cheque,
  bankAccount,
  beneficiary,
  settings,
  companyName: propCompanyName,
}: ChequeReceiptAndEnvelopeModalProps) {
  const [activeMode, setActiveMode] = useState<'receipt' | 'envelope'>('receipt');

  if (!isOpen) return null;

  const companyName = propCompanyName || settings?.companyName || 'شركة أعمالي للخدمات اللوجستية والتجارية';
  const receiptNo = `VOUCHER-${cheque.chequeNumberStr}`;
  const todayDate = new Date().toISOString().split('T')[0];

  const handlePrint = () => {
    try {
      let iframe = document.getElementById('receipt-print-iframe') as HTMLIFrameElement;
      if (!iframe) {
        iframe = document.createElement('iframe');
        iframe.id = 'receipt-print-iframe';
        iframe.style.position = 'fixed';
        iframe.style.right = '0';
        iframe.style.bottom = '0';
        iframe.style.width = '0';
        iframe.style.height = '0';
        iframe.style.border = 'none';
        iframe.style.zIndex = '-9999';
        document.body.appendChild(iframe);
      }

      const doc = iframe.contentWindow?.document;
      const targetEl = document.getElementById('cheque-document-print-target');
      if (!doc || !targetEl) {
        window.print();
        return;
      }

      doc.open();
      doc.write(`
        <!DOCTYPE html>
        <html dir="rtl">
        <head>
          <meta charset="utf-8" />
          <title>${activeMode === 'receipt' ? 'سند صرف شيك' : 'مظروف تسليم شيك'} #${cheque.chequeNumberStr}</title>
          <style>
            @page {
              size: A4 portrait;
              margin: 10mm;
            }
            * { box-sizing: border-box; margin: 0; padding: 0; }
            body {
              font-family: 'Cairo', 'Segoe UI', Tahoma, sans-serif;
              direction: rtl;
              margin: 0;
              padding: 10mm;
              background: #fff;
              color: #0f172a;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            .border-b-2 { border-bottom: 2px solid #0f172a; }
            .border-b { border-bottom: 1px solid #cbd5e1; }
            .border-t-2 { border-top: 2px solid #0f172a; }
            .border-t { border-top: 1px solid #cbd5e1; }
            .border { border: 1px solid #cbd5e1; }
            .rounded-xl { border-radius: 12px; }
            .rounded { border-radius: 4px; }
            .p-8 { padding: 24px; }
            .p-4 { padding: 16px; }
            .py-2 { padding-top: 8px; padding-bottom: 8px; }
            .px-4 { padding-left: 16px; padding-right: 16px; }
            .flex { display: flex; }
            .justify-between { justify-content: space-between; }
            .items-center { align-items: center; }
            .items-start { align-items: flex-start; }
            .items-end { align-items: flex-end; }
            .grid { display: grid; }
            .grid-cols-2 { grid-template-columns: repeat(2, minmax(0, 1fr)); }
            .gap-4 { gap: 16px; }
            .space-y-6 > * + * { margin-top: 24px; }
            .space-y-4 > * + * { margin-top: 16px; }
            .space-y-2 > * + * { margin-top: 8px; }
            .text-center { text-align: center; }
            .text-right { text-align: right; }
            .text-left { text-align: left; }
            .font-mono { font-family: monospace; }
            .font-bold { font-weight: 700; }
            .font-black { font-weight: 900; }
            .text-xl { font-size: 20px; }
            .text-lg { font-size: 18px; }
            .text-sm { font-size: 14px; }
            .text-xs { font-size: 12px; }
            .text-slate-900 { color: #0f172a; }
            .text-slate-700 { color: #334155; }
            .text-slate-500 { color: #64748b; }
            .bg-slate-900 { background-color: #0f172a; color: #fff; }
            .bg-slate-100 { background-color: #f1f5f9; }
            .bg-amber-50 { background-color: #fffbeb; }
            .border-amber-200 { border-color: #fde68a; }
            .text-amber-900 { color: #78350f; }
          </style>
        </head>
        <body>
          ${targetEl.outerHTML}
        </body>
        </html>
      `);
      doc.close();

      setTimeout(() => {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
      }, 250);
    } catch {
      window.print();
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/80 backdrop-blur-xs flex items-center justify-center p-4">
      
      {/* Container */}
      <div className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Modal Top Bar (Hidden on print) */}
        <div className="bg-slate-900 text-white p-4 flex items-center justify-between print:hidden border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
              {activeMode === 'receipt' ? <FileText className="w-5 h-5" /> : <Mail className="w-5 h-5" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black text-white">
                  {activeMode === 'receipt' ? 'طباعة سند صرف وإيصال استلام الشيك' : 'طباعة مظروف الشيك للمستفيد'}
                </h3>
                <span className="font-mono bg-amber-400 text-slate-950 text-xs px-2 py-0.5 rounded font-black">
                  شيك #{cheque.chequeNumberStr}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                المستفيد: <strong className="text-white">{cheque.beneficiaryName}</strong> | المبلغ: <strong className="text-emerald-400 font-mono">{cheque.amount.toFixed(3)} د.ك</strong>
              </p>
            </div>
          </div>

          {/* Mode Tabs and Actions */}
          <div className="flex items-center gap-2">
            <div className="bg-slate-800 p-1 rounded-xl flex items-center text-xs font-bold">
              <button
                type="button"
                onClick={() => setActiveMode('receipt')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition ${
                  activeMode === 'receipt'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                <span>سند الصرف والإيصال</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveMode('envelope')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition ${
                  activeMode === 'envelope'
                    ? 'bg-amber-600 text-white shadow-sm'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                <Mail className="w-3.5 h-3.5" />
                <span>مظروف الشيك (Envelope)</span>
              </button>
            </div>

            <button
              type="button"
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs rounded-xl shadow transition"
            >
              <Printer className="w-4 h-4" />
              <span>طباعة المستند</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="p-6 overflow-y-auto bg-slate-100 flex-1">
          
          {/* Print Styles for Receipts and Envelopes */}
          <style>{`
            @media print {
              body * {
                visibility: hidden !important;
              }
              #cheque-document-print-target, #cheque-document-print-target * {
                visibility: visible !important;
              }
              #cheque-document-print-target {
                position: absolute !important;
                left: 0 !important;
                top: 0 !important;
                width: 100% !important;
                margin: 0 !important;
                padding: 10mm !important;
                background: white !important;
              }
            }
          `}</style>

          <div id="cheque-document-print-target" className="mx-auto bg-white rounded-xl shadow-md border border-slate-300 p-8">
            
            {activeMode === 'receipt' ? (
              /* Receipt & Payment Voucher Design */
              <div className="space-y-6 text-slate-900 text-right">
                
                {/* Header */}
                <div className="flex justify-between items-start border-b-2 border-slate-900 pb-4">
                  <div>
                    <h2 className="text-xl font-black text-slate-900 tracking-tight">
                      {companyName}
                    </h2>
                    <p className="text-xs text-slate-600 mt-0.5">
                      الإدارة المالية والمحاسبية &bull; قسم الشيكات والمدفوعات
                    </p>
                    <p className="text-[11px] text-slate-500 font-mono mt-0.5">
                      دولة الكويت &bull; سجل تجاري رقم: 492019
                    </p>
                  </div>

                  <div className="text-left">
                    <div className="inline-block bg-slate-900 text-white text-xs font-black px-3 py-1 rounded">
                      سند صرف شيك مصرفي
                    </div>
                    <div className="text-xs font-mono font-bold text-slate-700 mt-1">
                      رقم السند: <strong className="text-slate-950">{receiptNo}</strong>
                    </div>
                    <div className="text-xs font-mono text-slate-500">
                      التاريخ: {todayDate}
                    </div>
                  </div>
                </div>

                {/* Amount Banner */}
                <div className="bg-slate-50 border-2 border-slate-300 p-3.5 rounded-xl flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-600">المبلغ المدفوع بالشيك:</span>
                  <div className="text-xl font-black font-mono text-slate-900 bg-white px-4 py-1.5 rounded-lg border border-slate-300">
                    {cheque.amount.toFixed(3)} <span className="text-xs font-normal">دينار كويتي (KWD)</span>
                  </div>
                </div>

                {/* Statement Body */}
                <div className="space-y-3 text-xs leading-relaxed border border-slate-200 rounded-xl p-4 bg-slate-50/40">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pb-3 border-b border-slate-200">
                    <div>
                      <span className="text-slate-500 font-bold block mb-0.5">ادفعوا لأمر السيد / السادة:</span>
                      <strong className="text-sm font-black text-slate-900">{cheque.beneficiaryName}</strong>
                    </div>
                    <div>
                      <span className="text-slate-500 font-bold block mb-0.5">الرقم المدني / السجل التجاري:</span>
                      <strong className="font-mono text-slate-800">{beneficiary?.civilIdOrCR || 'مُسجل في العقد'}</strong>
                    </div>
                  </div>

                  <div className="pb-3 border-b border-slate-200">
                    <span className="text-slate-500 font-bold block mb-0.5">المبلغ بالحروف والكلمات (تفقيط كويتي):</span>
                    <strong className="text-sm font-bold text-blue-900 bg-blue-50/80 p-2 rounded-lg block border border-blue-200/80">
                      فقط {cheque.amountInWordsAr} لا غير.
                    </strong>
                    {cheque.amountInWordsEn && (
                      <span className="text-[11px] font-sans text-slate-600 block mt-1">
                        Only {cheque.amountInWordsEn}
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pb-3 border-b border-slate-200 font-mono text-[11px]">
                    <div>
                      <span className="text-slate-500 font-bold block mb-0.5 font-sans">رقم الشيك:</span>
                      <strong className="text-amber-800 font-black text-xs">#{cheque.chequeNumberStr}#</strong>
                    </div>
                    <div>
                      <span className="text-slate-500 font-bold block mb-0.5 font-sans">البنك والحساب المسحوب عليه:</span>
                      <strong className="text-slate-800">{bankAccount?.bankName || 'البنك التجاري الكويتي'}</strong>
                    </div>
                    <div>
                      <span className="text-slate-500 font-bold block mb-0.5 font-sans">تاريخ استحقاق الشيك:</span>
                      <strong className="text-slate-900 font-black">{cheque.dueDate}</strong>
                    </div>
                  </div>

                  <div>
                    <span className="text-slate-500 font-bold block mb-0.5">البيان / سبب الصرف والغرض:</span>
                    <p className="text-slate-800 font-bold bg-white p-2.5 rounded-lg border border-slate-200">
                      {cheque.purpose || 'مستحقات مالية ومطالبة توريد معتمدة وفقاً للأصول المحاسبية'}
                    </p>
                  </div>
                </div>

                {/* Receiver Declaration & Signatures */}
                <div className="border border-slate-300 rounded-xl p-4 bg-white">
                  <div className="text-[11px] text-slate-600 font-bold mb-4">
                    إقرار استلام: أقر أنا الموقع أدناه باستلام أصل الشيك المذكور بياناته أعلاه خالياً من أي مانع صرف.
                  </div>

                  <div className="grid grid-cols-3 gap-4 text-center text-xs">
                    <div className="border-t border-slate-300 pt-3">
                      <span className="font-bold text-slate-700 block">إعداد المحاسب</span>
                      <span className="text-[10px] text-slate-400 block mt-1">{cheque.createdBy || 'المحاسب المسؤول'}</span>
                      <div className="h-10 mt-2 flex items-center justify-center text-slate-300 text-[10px] italic">
                        [التوقيع والختم]
                      </div>
                    </div>

                    <div className="border-t border-slate-300 pt-3">
                      <span className="font-bold text-slate-700 block">اعتماد الإدارة المالية</span>
                      <span className="text-[10px] text-slate-400 block mt-1">المدير المالي</span>
                      <div className="h-10 mt-2 flex items-center justify-center text-slate-300 text-[10px] italic">
                        [اعتماد الصرف]
                      </div>
                    </div>

                    <div className="border-t border-slate-300 pt-3 bg-amber-50/40 rounded-b-xl">
                      <span className="font-bold text-slate-900 block">توقيع المستلم باليد</span>
                      <span className="text-[10px] text-slate-500 block mt-1">الاسم: .......................................</span>
                      <div className="text-[10px] text-slate-500 mt-1 font-mono">الرقم المدني: ........................</div>
                      <div className="h-8 mt-1 flex items-center justify-center text-slate-400 text-[10px] italic">
                        التوقيع: ...........................
                      </div>
                    </div>
                  </div>
                </div>

                <div className="text-[10px] text-slate-400 flex justify-between items-center pt-2">
                  <span>تم إصدار هذا السند إلكترونياً عبر منظومة إدارة الشيكات &bull; شركة A33maly</span>
                  <span className="font-mono">تاريخ الطباعة: {new Date().toLocaleString('ar-KW')}</span>
                </div>

              </div>
            ) : (
              /* Cheque Envelope Design (Standard DL Envelope 220mm x 110mm) */
              <div 
                className="mx-auto border-2 border-dashed border-slate-400 p-8 rounded-2xl bg-slate-50/60 text-slate-900 text-right space-y-6 relative overflow-hidden"
                style={{ minHeight: '320px', maxWidth: '680px' }}
              >
                {/* Sender top right */}
                <div className="flex justify-between items-start border-b border-slate-200 pb-3">
                  <div>
                    <span className="text-[10px] text-slate-500 font-bold block">الراسل (Sender):</span>
                    <h4 className="text-sm font-black text-slate-900">{companyName}</h4>
                    <p className="text-[11px] text-slate-500">
                      دولة الكويت &bull; إدارة الشؤون المالية والخزينة
                    </p>
                  </div>

                  <div className="text-left">
                    <span className="inline-block bg-rose-100 text-rose-800 text-[10px] font-black px-2.5 py-0.5 rounded border border-rose-300 uppercase tracking-widest font-mono">
                      خاص وسري جداً &bull; CONFIDENTIAL
                    </span>
                    <div className="text-[10px] text-slate-400 mt-1 font-mono">
                      بيد المستلم شخصياً
                    </div>
                  </div>
                </div>

                {/* Recipient in Center */}
                <div className="bg-white border-2 border-slate-300 p-6 rounded-2xl shadow-xs space-y-2 my-6">
                  <span className="text-xs text-slate-500 font-bold block">إلى السادة المحترمين:</span>
                  <div className="text-xl font-black text-slate-950">
                    {cheque.beneficiaryName}
                  </div>
                  <div className="flex flex-wrap items-center gap-4 text-xs text-slate-600 pt-2 border-t border-slate-100">
                    {beneficiary?.phoneNumber && (
                      <div>
                        هاتف: <strong className="font-mono text-slate-900">{beneficiary.phoneNumber}</strong>
                      </div>
                    )}
                    {beneficiary?.civilIdOrCR && (
                      <div>
                        الرقم المدني / السجل: <strong className="font-mono text-slate-900">{beneficiary.civilIdOrCR}</strong>
                      </div>
                    )}
                    <div>
                      العنوان: <strong className="text-slate-800">{beneficiary?.notes || 'دولة الكويت'}</strong>
                    </div>
                  </div>
                </div>

                {/* Bottom Footer on Envelope */}
                <div className="flex justify-between items-center pt-3 border-t border-slate-200 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="bg-amber-100 text-amber-900 font-mono text-[11px] font-black px-2 py-0.5 rounded border border-amber-300">
                      شيك مصرفي رقم: #{cheque.chequeNumberStr}#
                    </span>
                    <span className="font-mono text-slate-500 text-[11px]">
                      المبلغ: {cheque.amount.toFixed(3)} د.ك
                    </span>
                  </div>

                  <div className="text-[10px] text-slate-400 font-sans">
                    يُرجى عدم فتح المظروف إلا بواسطة المعني أو المفوض بالتوقيع
                  </div>
                </div>

              </div>
            )}

          </div>

        </div>

        {/* Modal Footer Controls */}
        <div className="bg-white p-3 px-6 border-t border-slate-200 flex justify-between items-center print:hidden">
          <div className="text-xs text-slate-500">
            {activeMode === 'receipt' 
              ? 'جاهز للطباعة على ورق قياسي (A4 أو نصف ورقة A5) ليتم توقيعه وحفظه في الأرشيف المالي'
              : 'جاهز للطباعة على مظروف قياسي (DL Envelope 220×110mm) لتسليم الشيك للمستفيد بأمان'}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition"
            >
              إغلاق النافذة
            </button>
            <button
              type="button"
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white font-black rounded-xl text-xs shadow-md transition"
            >
              <Printer className="w-4 h-4" />
              <span>طباعة فورية</span>
            </button>
          </div>
        </div>

      </div>

    </div>
  );
}
