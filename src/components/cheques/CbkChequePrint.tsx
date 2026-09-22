import React, { useState, useRef } from 'react';
import { 
  Printer, 
  X, 
  Languages, 
  FileText, 
  Check,
  Building2,
  Sliders,
  CheckCircle2
} from 'lucide-react';
import { IssuedCheque, BankAccount, ChequeBook, ChequePrintSettings } from '../../types';
import { tafqeetKwd, tafqeetKwdEn } from '../../utils/tafqeetKwd';
import { ChequeReceiptAndEnvelopeModal } from './ChequeReceiptAndEnvelopeModal';

interface CbkChequePrintProps {
  cheque: IssuedCheque;
  bankAccount: BankAccount;
  chequeBook?: ChequeBook;
  printSettings: ChequePrintSettings;
  companyName?: string;
  onUpdatePrintSettings?: (settings: ChequePrintSettings) => void;
  onClose?: () => void;
  onStatusChange?: (newStatus: 'issued' | 'cashed' | 'cancelled') => void;
  onNavigateToCalibration?: () => void;
}

// Base coordinates on an official CBK 180mm x 90mm cheque (Width 18cm, Height 9cm)
// Derived directly from the physical CBK cheque layout
const BASE_COORDS = {
  date: { left: 134, top: 12, width: 36, height: 8.5 },
  payee: { left: 16, top: 29, width: 120, height: 8.5 },
  words: { left: 54, top: 41, width: 84, height: 9.5 },
  amount: { left: 10, top: 38, width: 42, height: 12.5 },
};

export function CbkChequePrint({
  cheque,
  bankAccount,
  printSettings,
  companyName,
  onClose,
  onNavigateToCalibration,
}: CbkChequePrintProps) {
  // Tafqeet Language: default to Arabic or English based on beneficiary / cheque setting
  const [printLanguage, setPrintLanguage] = useState<'ar' | 'en'>(
    cheque.tafqeetLang || (/^[A-Za-z]/.test(cheque.beneficiaryName) ? 'en' : 'ar')
  );

  // Printer default name
  const defaultPrinter = printSettings.defaultPrinterName || 'HP LaserJet Pro M404n (درج الشيكات المخصص)';

  // Receipt & Envelope Modal State
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);

  // Formatted Date (DD / MM / YYYY)
  const formattedDate = (() => {
    try {
      const parts = cheque.dueDate.split('-');
      if (parts.length === 3) {
        return `${parts[2]} / ${parts[1]} / ${parts[0]}`;
      }
    } catch {
      // fallback
    }
    return cheque.dueDate;
  })();

  // Tafqeet text
  const tafqeetArabic = tafqeetKwd(cheque.amount);
  const tafqeetEnglish = tafqeetKwdEn(cheque.amount);
  const activeTafqeet = printLanguage === 'ar' ? tafqeetArabic : tafqeetEnglish;

  // Direct print trigger
  const handlePrint = () => {
    document.body.classList.add('printing-cheque-mode');
    setIsPrinting(true);
    setTimeout(() => {
      window.print();
      setIsPrinting(false);
      setTimeout(() => {
        document.body.classList.remove('printing-cheque-mode');
      }, 500);
    }, 250);
  };

  // Field Coordinates & Dimensions on 180mm x 90mm physical cheque based on saved calibration
  const dateLeft = BASE_COORDS.date.left + (printSettings.offsetX || 0) + (printSettings.dateOffsetX || 0);
  const dateTop = BASE_COORDS.date.top + (printSettings.offsetY || 0) + (printSettings.dateOffsetY || 0);
  const dateWidth = printSettings.dateWidth || BASE_COORDS.date.width;
  const dateHeight = printSettings.dateHeight || BASE_COORDS.date.height;
  const dateFontSize = printSettings.dateFontSize || 12;

  const payeeLeft = BASE_COORDS.payee.left + (printSettings.offsetX || 0) + (printSettings.payeeOffsetX || 0);
  const payeeTop = BASE_COORDS.payee.top + (printSettings.offsetY || 0) + (printSettings.payeeOffsetY || 0);
  const payeeWidth = printSettings.payeeWidth || BASE_COORDS.payee.width;
  const payeeHeight = printSettings.payeeHeight || BASE_COORDS.payee.height;
  const payeeFontSize = printSettings.payeeFontSize || 13;

  const wordsLeft = BASE_COORDS.words.left + (printSettings.offsetX || 0) + (printSettings.wordsOffsetX || 0);
  const wordsTop = BASE_COORDS.words.top + (printSettings.offsetY || 0) + (printSettings.wordsOffsetY || 0);
  const wordsWidth = printSettings.wordsWidth || BASE_COORDS.words.width;
  const wordsHeight = printSettings.wordsHeight || BASE_COORDS.words.height;
  const wordsFontSize = printSettings.wordsFontSize || 11;

  const amountLeft = BASE_COORDS.amount.left + (printSettings.offsetX || 0) + (printSettings.amountOffsetX || 0);
  const amountTop = BASE_COORDS.amount.top + (printSettings.offsetY || 0) + (printSettings.amountOffsetY || 0);
  const amountWidth = printSettings.amountWidth || BASE_COORDS.amount.width;
  const amountHeight = printSettings.amountHeight || BASE_COORDS.amount.height;
  const amountFontSize = printSettings.amountFontSize || 13.5;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto print:p-0 print:bg-white print:static">
      
      {/* CSS الخاص بالطباعة الدقيقة على الشيك المعتمد مقاس 18 سم × 9 سم (180mm × 90mm) */}
      <style>{`
        @media print {
          @page {
            size: 180mm 90mm;
            margin: 0mm;
          }
          html, body {
            margin: 0 !important;
            padding: 0 !important;
            width: 180mm !important;
            height: 90mm !important;
            background: #fff !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          body * {
            visibility: hidden !important;
          }
          #cbk-print-wrapper, #cbk-print-wrapper * {
            visibility: visible !important;
          }
          #cbk-print-wrapper {
            position: fixed !important;
            left: 0 !important;
            top: 0 !important;
            width: 180mm !important;
            height: 90mm !important;
            margin: 0 !important;
            padding: 0 !important;
            border: none !important;
            box-shadow: none !important;
            background: transparent !important;
            background-image: none !important;
            overflow: hidden !important;
          }
          .screen-only-guide {
            display: none !important;
            opacity: 0 !important;
          }
        }
      `}</style>

      <div className="bg-white w-full max-w-5xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-4 print:my-0 print:border-none print:shadow-none print:w-auto">
        
        {/* الشريط العلوي للتحكم المباشر بالطباعة */}
        <div className="bg-slate-900 text-white p-4 flex flex-wrap items-center justify-between gap-3 print:hidden">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 font-bold">
              CBK
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm sm:text-base font-black">
                  معاينة وطباعة شيك البنك التجاري الكويتي
                </h3>
                <span className="bg-amber-500 text-slate-950 text-[10px] font-black px-2 py-0.5 rounded-full font-mono">
                  #{cheque.chequeNumberStr}
                </span>
                <span className="bg-emerald-500/20 text-emerald-300 text-[10px] px-2 py-0.5 rounded border border-emerald-500/40 font-mono font-bold">
                  أبعاد معتمدة: 180mm × 90mm (18cm × 9cm)
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                {bankAccount.accountName} - الحساب: <span className="font-mono text-slate-300">{bankAccount.accountNumber}</span>
              </p>
            </div>
          </div>

          {/* أزرار الإجراءات الفورية */}
          <div className="flex flex-wrap items-center gap-2">
            
            {/* اختيار لغة التفقيط */}
            <div className="bg-slate-800 p-1 rounded-xl flex items-center text-xs font-bold border border-slate-700">
              <span className="px-2 text-slate-400 flex items-center gap-1 text-[11px]">
                <Languages className="w-3.5 h-3.5 text-amber-400" />
                <span>التفقيط:</span>
              </span>
              <button
                type="button"
                onClick={() => setPrintLanguage('ar')}
                className={`px-2.5 py-1 rounded-lg transition text-xs ${
                  printLanguage === 'ar'
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                عربي
              </button>
              <button
                type="button"
                onClick={() => setPrintLanguage('en')}
                className={`px-2.5 py-1 rounded-lg transition text-xs ${
                  printLanguage === 'en'
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                English
              </button>
            </div>

            {/* زر سند الصرف والمظروف */}
            <button
              type="button"
              onClick={() => setIsReceiptModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl border border-slate-700 transition"
              title="طباعة سند صرف وإيصال استلام الشيك أو مظروف التسليم"
            >
              <FileText className="w-3.5 h-3.5 text-amber-400" />
              <span>سند الصرف والمظروف</span>
            </button>

            {/* زر الطباعة الفورية المباشر */}
            <button
              type="button"
              onClick={handlePrint}
              className="flex items-center gap-2 px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-black rounded-xl text-xs shadow-md transition transform active:scale-95"
            >
              <Printer className="w-4 h-4" />
              <span>طباعة الشيك فورياً</span>
            </button>

            {/* زر الإغلاق */}
            {onClose && (
              <button
                type="button"
                onClick={onClose}
                className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition"
                title="إغلاق"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>

        {/* ملخص الشيك السريع */}
        <div className="bg-slate-100 border-b border-slate-200 px-5 py-2.5 flex flex-wrap items-center justify-between text-xs text-slate-700 gap-2 print:hidden">
          <div className="flex items-center gap-4 flex-wrap">
            <div>
              <span className="text-slate-500">المستفيد: </span>
              <strong className="text-slate-900 font-bold">{cheque.beneficiaryName}</strong>
            </div>
            <div>
              <span className="text-slate-500">تاريخ الاستحقاق: </span>
              <strong className="text-slate-900 font-mono font-bold">{formattedDate}</strong>
            </div>
            <div>
              <span className="text-slate-500">المبلغ: </span>
              <strong className="text-emerald-800 font-mono font-black text-sm">
                {cheque.amount.toFixed(3)} د.ك
              </strong>
            </div>
          </div>

          <div className="flex items-center gap-1 text-[11px] text-slate-500">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            <span>تلقيم مباشر للطابعة بأبعاد 180 مم × 90 مم</span>
          </div>
        </div>

        {/* حاوية الشيك بدقة 180mm × 90mm */}
        <div className="p-4 sm:p-8 bg-slate-200 flex flex-col items-center justify-center overflow-x-auto print:p-0 print:bg-transparent print:m-0">
          
          <div 
            id="cbk-print-wrapper"
            style={{
              width: '180mm',
              height: '90mm',
              maxWidth: '100%',
              aspectRatio: '180 / 90',
            }}
            className="relative select-none box-border shadow-xl rounded-sm border border-slate-300 print:shadow-none print:border-none print:rounded-none overflow-hidden bg-white cheque-print-exact"
          >

            {/* 1. خلفية الشيك البنكي الحقيقية (للشاشة فقط ومخفية في الطباعة على شيك فعلي) */}
            <div className="absolute inset-0 pointer-events-none select-none screen-only-guide print:hidden z-0">
              <img
                src="/cbk_cheque_bg.jpg"
                alt="خلفية الشيك البنكي CBK"
                className="w-full h-full object-fill opacity-90"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = '/cbk_cheque_template.jpg';
                }}
              />
            </div>

            {/* ===================================================================== */}
            {/* الحقول الأربعة المطبوعة على الشيك (المحسوبة وفق أبعاد 180mm × 90mm):     */}
            {/* 1. التاريخ                                                           */}
            {/* 2. اسم المستفيد                                                       */}
            {/* 3. التفقيط                                                           */}
            {/* 4. المبلغ رقماً محصوراً بـ #                                         */}
            {/* ===================================================================== */}

            {/* 1. التاريخ */}
            <div 
              style={{
                position: 'absolute',
                left: `${dateLeft}mm`,
                top: `${dateTop}mm`,
                width: `${dateWidth}mm`,
                height: `${dateHeight}mm`,
                fontSize: `${dateFontSize}px`,
              }}
              className="flex items-center justify-center font-mono font-black text-slate-950 tracking-wider z-10"
            >
              <span className="select-all print:text-black font-mono font-black">
                {formattedDate}
              </span>
            </div>

            {/* 2. اسم المستفيد (يبدأ من جهة اليمين عند ادفعوا لأمر) */}
            <div 
              style={{
                position: 'absolute',
                left: `${payeeLeft}mm`,
                top: `${payeeTop}mm`,
                width: `${payeeWidth}mm`,
                height: `${payeeHeight}mm`,
                fontSize: `${payeeFontSize}px`,
              }}
              className="flex items-center justify-end text-right font-serif font-black text-slate-950 px-1 truncate z-10"
              dir="rtl"
            >
              <span className="truncate block w-full select-all print:text-black font-serif font-black text-right">
                {cheque.beneficiaryName}
              </span>
            </div>

            {/* 3. التفقيط (يبدأ من جهة اليمين عند مبلغ وقدره) */}
            <div 
              style={{
                position: 'absolute',
                left: `${wordsLeft}mm`,
                top: `${wordsTop}mm`,
                width: `${wordsWidth}mm`,
                height: `${wordsHeight}mm`,
                fontSize: `${wordsFontSize}px`,
              }}
              className="flex items-center justify-end text-right font-sans font-bold text-slate-950 leading-tight px-1 z-10 overflow-hidden"
              dir="rtl"
            >
              <span className="block leading-snug select-all print:text-black font-sans font-bold text-right">
                {activeTafqeet}
              </span>
            </div>

            {/* 4. المبلغ بالأرقام (# 0.000 #) داخل مربع د.ك على جهة اليسار */}
            <div 
              style={{
                position: 'absolute',
                left: `${amountLeft}mm`,
                top: `${amountTop}mm`,
                width: `${amountWidth}mm`,
                height: `${amountHeight}mm`,
                fontSize: `${amountFontSize}px`,
              }}
              className="flex items-center justify-center font-mono font-black text-slate-950 tracking-wider z-10"
            >
              <span className="select-all print:text-black font-mono font-black">
                #{cheque.amount.toFixed(3)}#
              </span>
            </div>

          </div>

          {/* تنبيه وشريط التوجيه لمعايرة الشيك */}
          <div className="mt-4 bg-white border border-slate-300 p-3 rounded-xl max-w-2xl w-full text-xs text-slate-700 print:hidden flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 shadow-xs">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
              <span>
                تتم الطباعة المباشرة بالأبعاد المعتمدة <strong>180mm × 90mm</strong> وفق المعايرة المحفوظة.
              </span>
            </div>
            {onNavigateToCalibration && (
              <button
                type="button"
                onClick={() => {
                  if (onClose) onClose();
                  onNavigateToCalibration();
                }}
                className="text-amber-700 hover:text-amber-900 font-bold flex items-center gap-1 text-[11px] underline flex-shrink-0"
              >
                <Sliders className="w-3.5 h-3.5" />
                <span>تعديل المعايرة والمقاسات</span>
              </button>
            )}
          </div>

        </div>

      </div>

      {/* نافذة طباعة سند الصرف والإيصال والمظروف */}
      <ChequeReceiptAndEnvelopeModal
        isOpen={isReceiptModalOpen}
        onClose={() => setIsReceiptModalOpen(false)}
        cheque={cheque}
        bankAccount={bankAccount}
        settings={{ companyName: companyName || 'شركة أعمالي للخدمات اللوجستية والتجارية' } as any}
      />

    </div>
  );
}
