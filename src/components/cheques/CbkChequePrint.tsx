import React, { useState } from 'react';
import { 
  Printer, 
  X, 
  Languages, 
  FileText, 
  Check,
  Building2,
  Sliders,
  CheckCircle2,
  Layers,
  Ruler,
  Eye,
  EyeOff,
  Image as ImageIcon,
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight
} from 'lucide-react';
import { IssuedCheque, BankAccount, ChequeBook, ChequePrintSettings, ChequeSizeTemplate } from '../../types';
import { tafqeetKwd, tafqeetKwdEn, formatChequeAmount } from '../../utils/tafqeetKwd';
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

export function CbkChequePrint({
  cheque,
  bankAccount,
  printSettings,
  companyName,
  onClose,
  onNavigateToCalibration,
}: CbkChequePrintProps) {
  // Available templates for this bank account
  const templates: ChequeSizeTemplate[] = bankAccount.chequeTemplates && bankAccount.chequeTemplates.length > 0
    ? bankAccount.chequeTemplates
    : [
        {
          id: 'tpl-default',
          name: `${bankAccount.bankName} (${bankAccount.chequeWidthCm || 21.0} × ${bankAccount.chequeHeightCm || 8.5} سم)`,
          widthCm: bankAccount.chequeWidthCm || 21.0,
          heightCm: bankAccount.chequeHeightCm || 8.5,
          chequeImageUrl: bankAccount.chequeImageUrl,
          chequeImageName: bankAccount.chequeImageName,
          isDefault: true,
        }
      ];

  // Active selected template (defaults to matching cheque's templateId, or account default, or first template)
  const initialTemplateId = cheque.templateId || bankAccount.activeTemplateId || templates[0]?.id;
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>(initialTemplateId);
  
  const activeTemplate = templates.find((t) => t.id === selectedTemplateId) || templates[0];

  // Dynamic Dimensions in cm and mm
  const widthCm = activeTemplate.widthCm || bankAccount.chequeWidthCm || 21.0;
  const heightCm = activeTemplate.heightCm || bankAccount.chequeHeightCm || 8.5;
  const widthMm = Math.round(widthCm * 10);
  const heightMm = Math.round(heightCm * 10);

  // Background stamp image for this cheque template
  const stampImageUrl = activeTemplate.chequeImageUrl || bankAccount.chequeImageUrl || printSettings.customChequeImageUrl;

  // Print Mode: Print text only onto physical cheque paper OR print with full background stamp
  const [printWithBackground, setPrintWithBackground] = useState<boolean>(false);
  const [showScreenBackground, setShowScreenBackground] = useState<boolean>(true);

  // Crossing Lines ("A/C PAYEE ONLY") & Bearer crossing
  const [isCrossed, setIsCrossed] = useState<boolean>(cheque.isCrossed ?? true);
  const [isBearerCrossed, setIsBearerCrossed] = useState<boolean>(cheque.bearerCrossed ?? true);

  // Quick fine offset adjustments (mm)
  const [fineOffsetX, setFineOffsetX] = useState<number>(printSettings.offsetX || 0);
  const [fineOffsetY, setFineOffsetY] = useState<number>(printSettings.offsetY || 0);

  // Tafqeet Language: default to Arabic or English
  const [printLanguage, setPrintLanguage] = useState<'ar' | 'en'>(
    cheque.tafqeetLang || (/^[A-Za-z]/.test(cheque.beneficiaryName) ? 'en' : 'ar')
  );

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

  // Dynamic field positioning relative to physical cheque dimensions (in mm)
  // Date (Top-Right in Arabic cheques, ~75% width or 10-15mm from right)
  const baseDateLeft = Math.round(widthMm * 0.74);
  const baseDateTop = Math.round(heightMm * 0.13);
  const dateLeft = baseDateLeft + fineOffsetX + (printSettings.dateOffsetX || 0);
  const dateTop = baseDateTop + fineOffsetY + (printSettings.dateOffsetY || 0);
  const dateWidth = printSettings.dateWidth || 38;
  const dateHeight = printSettings.dateHeight || 8.5;
  const dateFontSize = printSettings.dateFontSize || 12;

  // Payee ("ادفعوا لأمر") (Right aligned, ~32% from top, spans across middle)
  const basePayeeLeft = Math.round(widthMm * 0.09);
  const basePayeeTop = Math.round(heightMm * 0.32);
  const payeeLeft = basePayeeLeft + fineOffsetX + (printSettings.payeeOffsetX || 0);
  const payeeTop = basePayeeTop + fineOffsetY + (printSettings.payeeOffsetY || 0);
  const payeeWidth = printSettings.payeeWidth || Math.round(widthMm * 0.72);
  const payeeHeight = printSettings.payeeHeight || 9;
  const payeeFontSize = printSettings.payeeFontSize || 13;

  // Words ("مبلغ وقدره") (Spans middle-left to right, ~45% from top)
  const baseWordsLeft = Math.round(widthMm * 0.28);
  const baseWordsTop = Math.round(heightMm * 0.46);
  const wordsLeft = baseWordsLeft + fineOffsetX + (printSettings.wordsOffsetX || 0);
  const wordsTop = baseWordsTop + fineOffsetY + (printSettings.wordsOffsetY || 0);
  const wordsWidth = printSettings.wordsWidth || Math.round(widthMm * 0.52);
  const wordsHeight = printSettings.wordsHeight || 11;
  const wordsFontSize = printSettings.wordsFontSize || 11;

  // Amount in Digits ("د.ك # 0.000 #") (Left box, ~42% from top)
  const baseAmountLeft = Math.round(widthMm * 0.05);
  const baseAmountTop = Math.round(heightMm * 0.42);
  const amountLeft = baseAmountLeft + fineOffsetX + (printSettings.amountOffsetX || 0);
  const amountTop = baseAmountTop + fineOffsetY + (printSettings.amountOffsetY || 0);
  const amountWidth = printSettings.amountWidth || Math.round(widthMm * 0.22);
  const amountHeight = printSettings.amountHeight || 13;
  const amountFontSize = printSettings.amountFontSize || 13.5;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/85 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto print:p-0 print:bg-white print:static">
      
      {/* CSS الخاص بالطباعة الديناميكية الدقيقة حسب أبعاد الشيك المحددة بالسنتيمتر/الملليمتر */}
      <style>{`
        @media print {
          @page {
            size: ${widthMm}mm ${heightMm}mm;
            margin: 0mm !important;
          }
          html, body {
            margin: 0 !important;
            padding: 0 !important;
            width: ${widthMm}mm !important;
            height: ${heightMm}mm !important;
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
            width: ${widthMm}mm !important;
            height: ${heightMm}mm !important;
            margin: 0 !important;
            padding: 0 !important;
            border: none !important;
            box-shadow: none !important;
            background: ${printWithBackground ? '#fff' : 'transparent'} !important;
            overflow: hidden !important;
          }
          .screen-only-guide {
            display: ${printWithBackground ? 'block' : 'none'} !important;
            visibility: ${printWithBackground ? 'visible' : 'hidden'} !important;
          }
        }
      `}</style>

      <div className="bg-white w-full max-w-5xl rounded-3xl shadow-2xl border border-slate-200 overflow-hidden my-4 print:my-0 print:border-none print:shadow-none print:w-auto">
        
        {/* Top Control Bar */}
        <div className="bg-slate-900 text-white p-4 flex flex-wrap items-center justify-between gap-3 print:hidden">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 font-bold">
              <Landmark className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm sm:text-base font-black">
                  معاينة وطباعة شيك {bankAccount.bankName}
                </h3>
                <span className="bg-amber-500 text-slate-950 text-[10px] font-black px-2 py-0.5 rounded-full font-mono">
                  #{cheque.chequeNumberStr}
                </span>
                <span className="bg-emerald-500/20 text-emerald-300 text-[10px] px-2.5 py-0.5 rounded-full border border-emerald-500/40 font-mono font-bold flex items-center gap-1">
                  <Ruler className="w-3 h-3" />
                  <span>{widthCm} × {heightCm} سم ({widthMm} × {heightMm} مم)</span>
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5 font-mono">
                {bankAccount.accountName} - الحساب: {bankAccount.accountNumber}
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            
            {/* Multiple Template / Cheque Size Selector if more than 1 available */}
            {templates.length > 1 && (
              <div className="bg-slate-800 p-1 rounded-xl flex items-center text-xs font-bold border border-slate-700">
                <span className="px-2 text-slate-400 flex items-center gap-1 text-[11px]">
                  <Layers className="w-3.5 h-3.5 text-purple-400" />
                  <span>المقاس:</span>
                </span>
                <select
                  value={selectedTemplateId}
                  onChange={(e) => setSelectedTemplateId(e.target.value)}
                  className="bg-slate-900 text-white text-xs font-bold p-1 rounded-lg border border-slate-600 focus:outline-none"
                >
                  {templates.map((tpl) => (
                    <option key={tpl.id} value={tpl.id}>
                      {tpl.name} ({tpl.widthCm}×{tpl.heightCm} سم)
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Tafqeet Language */}
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

            {/* Receipt & Envelope Voucher Button */}
            <button
              type="button"
              onClick={() => setIsReceiptModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl border border-slate-700 transition"
              title="طباعة سند صرف وإيصال استلام الشيك أو مظروف التسليم"
            >
              <FileText className="w-3.5 h-3.5 text-amber-400" />
              <span>سند الصرف والمظروف</span>
            </button>

            {/* Direct Print Button */}
            <button
              type="button"
              onClick={handlePrint}
              className="flex items-center gap-2 px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-black rounded-xl text-xs shadow-md transition transform active:scale-95"
            >
              <Printer className="w-4 h-4" />
              <span>طباعة الشيك فورياً</span>
            </button>

            {/* Close Button */}
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

        {/* Quick Cheque Summary & Mode Options */}
        <div className="bg-slate-100 border-b border-slate-200 px-5 py-2.5 flex flex-wrap items-center justify-between text-xs text-slate-700 gap-3 print:hidden">
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
                {formatChequeAmount(cheque.amount)} د.ك
              </strong>
            </div>
          </div>

          {/* Print Modes & Visual Helpers */}
          <div className="flex items-center gap-3 flex-wrap">
            
            {/* Toggle Background on Print */}
            <label className="flex items-center gap-1.5 cursor-pointer font-bold text-slate-700 text-[11px] bg-white px-2.5 py-1 rounded-lg border border-slate-300">
              <input
                type="checkbox"
                checked={printWithBackground}
                onChange={(e) => setPrintWithBackground(e.target.checked)}
                className="w-3.5 h-3.5 text-blue-600 rounded"
              />
              <span>طباعة الشيك بالكامل مع الستامب</span>
            </label>

            {/* Toggle Screen Background */}
            <button
              type="button"
              onClick={() => setShowScreenBackground(!showScreenBackground)}
              className="flex items-center gap-1 text-[11px] font-bold text-slate-600 hover:text-slate-900 bg-white px-2.5 py-1 rounded-lg border border-slate-300 transition"
              title="إظهار أو إخفاء صورة الستامب في المعاينة"
            >
              {showScreenBackground ? <Eye className="w-3.5 h-3.5 text-blue-600" /> : <EyeOff className="w-3.5 h-3.5 text-slate-400" />}
              <span>{showScreenBackground ? 'إخفاء ستامب المعاينة' : 'إظهار ستامب المعاينة'}</span>
            </button>

            {/* Crossing Lines Toggle */}
            <label className="flex items-center gap-1.5 cursor-pointer font-bold text-slate-700 text-[11px] bg-white px-2.5 py-1 rounded-lg border border-slate-300">
              <input
                type="checkbox"
                checked={isCrossed}
                onChange={(e) => setIsCrossed(e.target.checked)}
                className="w-3.5 h-3.5 text-amber-600 rounded"
              />
              <span>تسطير (للمستفيد الأول فقط)</span>
            </label>
          </div>
        </div>

        {/* Cheque Container Scaled to User cm Dimensions */}
        <div className="p-4 sm:p-8 bg-slate-200 flex flex-col items-center justify-center overflow-x-auto print:p-0 print:bg-transparent print:m-0">
          
          <div 
            id="cbk-print-wrapper"
            style={{
              width: `${widthMm}mm`,
              height: `${heightMm}mm`,
              maxWidth: '100%',
              aspectRatio: `${widthMm} / ${heightMm}`,
            }}
            className="relative select-none box-border shadow-xl rounded-sm border border-slate-300 print:shadow-none print:border-none print:rounded-none overflow-hidden bg-white cheque-print-exact"
          >

            {/* 1. Scanned Stamp Background Image (Hidden when printing text-only on physical cheque) */}
            {stampImageUrl && showScreenBackground && (
              <div className="absolute inset-0 pointer-events-none select-none screen-only-guide z-0">
                <img
                  src={stampImageUrl}
                  alt={`ستامب شيك ${bankAccount.bankName}`}
                  className="w-full h-full object-fill opacity-90"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
              </div>
            )}

            {/* Background Placeholder if no image is uploaded and user is previewing */}
            {!stampImageUrl && showScreenBackground && (
              <div className="absolute inset-0 pointer-events-none select-none screen-only-guide z-0 border-2 border-dashed border-slate-300 bg-amber-50/20 flex flex-col items-center justify-center text-slate-400 p-4">
                <span className="text-xs font-bold font-mono">
                  ستامب شيك {bankAccount.bankName} - المقاس: {widthCm} × {heightCm} سم
                </span>
                <span className="text-[10px] text-slate-400 mt-1">
                  (يمكنك رفع صورة الشيك من شاشة الحسابات البنكية لضبط المعاينة بدقة)
                </span>
              </div>
            )}

            {/* 2. Crossing Lines ("A/C PAYEE ONLY") */}
            {isCrossed && (
              <div 
                style={{
                  position: 'absolute',
                  left: '12mm',
                  top: '6mm',
                  width: '42mm',
                  height: '16mm',
                }}
                className="z-10 pointer-events-none"
              >
                <div className="w-full border-t-2 border-slate-900 transform -rotate-12 translate-y-1" />
                <div className="text-[9px] font-black tracking-widest text-slate-900 text-center transform -rotate-12 py-0.5 uppercase">
                  A/C PAYEE ONLY
                </div>
                <div className="w-full border-t-2 border-slate-900 transform -rotate-12 -translate-y-1" />
              </div>
            )}

            {/* 3. Date */}
            <div 
              style={{
                position: 'absolute',
                left: `${dateLeft}mm`,
                top: `${dateTop}mm`,
                width: `${dateWidth}mm`,
                height: `${dateHeight}mm`,
                fontSize: `${dateFontSize}px`,
              }}
              className="flex items-center justify-center font-mono font-black text-slate-950 tracking-wider z-10 overflow-hidden"
            >
              <span className="select-all print:text-black font-mono font-black truncate max-w-full text-center">
                {formattedDate}
              </span>
            </div>

            {/* 4. Payee Name */}
            <div 
              style={{
                position: 'absolute',
                left: `${payeeLeft}mm`,
                top: `${payeeTop}mm`,
                width: `${payeeWidth}mm`,
                height: `${payeeHeight}mm`,
                fontSize: `${payeeFontSize}px`,
              }}
              className="flex items-center justify-end text-right font-serif font-black text-slate-950 px-1 z-10 overflow-hidden"
              dir="rtl"
            >
              <span className="truncate block w-full select-all print:text-black font-serif font-black text-right">
                {cheque.beneficiaryName}
              </span>
            </div>

            {/* 5. Amount in Words (Tafqeet) */}
            <div 
              style={{
                position: 'absolute',
                left: `${wordsLeft}mm`,
                top: `${wordsTop}mm`,
                width: `${wordsWidth}mm`,
                height: `${wordsHeight}mm`,
                fontSize: `${wordsFontSize}px`,
              }}
              className="flex items-center justify-end text-right font-sans font-bold text-slate-950 px-1 z-10 overflow-hidden"
              dir="rtl"
            >
              <span 
                className="line-clamp-2 break-words block w-full leading-tight select-all print:text-black font-sans font-bold text-right max-h-full overflow-hidden"
                style={{ lineHeight: 1.25 }}
              >
                {activeTafqeet}
              </span>
            </div>

            {/* 6. Amount in Digits */}
            <div 
              style={{
                position: 'absolute',
                left: `${amountLeft}mm`,
                top: `${amountTop}mm`,
                width: `${amountWidth}mm`,
                height: `${amountHeight}mm`,
                fontSize: `${amountFontSize}px`,
              }}
              className="flex items-center justify-center font-mono font-black text-slate-950 tracking-wider z-10 overflow-hidden"
            >
              <span className="select-all print:text-black font-mono font-black truncate max-w-full text-center">
                {formatChequeAmount(cheque.amount)}
              </span>
            </div>

          </div>

          {/* Calibration Navigation & Fine Tuning Bar */}
          <div className="mt-4 bg-white border border-slate-300 p-3.5 rounded-2xl max-w-3xl w-full text-xs text-slate-700 print:hidden flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>
                تتم الطباعة المباشرة بأبعاد الشيك المعتمدة: <strong className="font-mono">{widthCm} سم × {heightCm} سم</strong> ({widthMm} × {heightMm} مم).
              </span>
            </div>

            {/* Quick Offset Nudges */}
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-slate-500 font-bold">محاذاة فورية:</span>
              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
                <button
                  type="button"
                  onClick={() => setFineOffsetY((prev) => prev - 1)}
                  className="p-1 hover:bg-white rounded transition text-slate-700"
                  title="تحريك لأعلى 1 مم"
                >
                  <ArrowUp className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setFineOffsetY((prev) => prev + 1)}
                  className="p-1 hover:bg-white rounded transition text-slate-700"
                  title="تحريك لأسفل 1 مم"
                >
                  <ArrowDown className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setFineOffsetX((prev) => prev - 1)}
                  className="p-1 hover:bg-white rounded transition text-slate-700"
                  title="تحريك لليسار 1 مم"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setFineOffsetX((prev) => prev + 1)}
                  className="p-1 hover:bg-white rounded transition text-slate-700"
                  title="تحريك لليمين 1 مم"
                >
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {onNavigateToCalibration && (
                <button
                  type="button"
                  onClick={() => {
                    if (onClose) onClose();
                    onNavigateToCalibration();
                  }}
                  className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-xl text-xs transition flex items-center gap-1"
                >
                  <Sliders className="w-3.5 h-3.5" />
                  <span>معايرة متقدمة</span>
                </button>
              )}
            </div>
          </div>

        </div>

      </div>

      {/* Cheque Receipt and Envelope Voucher Modal */}
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
