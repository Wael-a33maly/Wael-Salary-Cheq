import React, { useState, useRef, useEffect } from 'react';
import { 
  Printer, 
  Sliders, 
  X, 
  Languages, 
  Ruler, 
  RotateCcw,
  Save,
  ArrowUp,
  ArrowDown,
  ArrowRight,
  ArrowLeft,
  Eye,
  Crosshair,
  Check,
  CheckSquare,
  Square,
  FileText,
  Mail,
  Settings2,
  Building2,
  Layers,
  Sparkles,
  Move,
  GripVertical
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
}

type AdjustableField = 'date' | 'payee' | 'words' | 'amount' | 'global';
type TemplateMode = 'vector_template' | 'scanned_image' | 'blank';

export function CbkChequePrint({
  cheque,
  bankAccount,
  printSettings,
  companyName,
  onUpdatePrintSettings,
  onClose,
}: CbkChequePrintProps) {
  // لغة التفقيط: مأخوذة من الشيك المصدر، أو عربي افتراضياً
  const [printLanguage, setPrintLanguage] = useState<'ar' | 'en'>(
    cheque.tafqeetLang || (/^[A-Za-z]/.test(cheque.beneficiaryName) ? 'en' : 'ar')
  );

  // نمط العرض: التصميم المتجهي الأصلي (Vector)، أو صورة الشيك الفعلية (Photo)، أو بدون خلفية
  const [templateMode, setTemplateMode] = useState<TemplateMode>(
    (printSettings.templateMode as TemplateMode) || 'vector_template'
  );
  const [imageOpacity, setImageOpacity] = useState<number>(100);

  // خاصية التسطير للشيك (Account Payee Only)
  const [isCrossed, setIsCrossed] = useState<boolean>(
    cheque.isCrossed ?? printSettings.defaultCrossing ?? true
  );
  const [printCrossingOnPhysical, setPrintCrossingOnPhysical] = useState<boolean>(false);

  // شطب أو لحامله
  const [isBearerCrossed, setIsBearerCrossed] = useState<boolean>(
    cheque.bearerCrossed ?? printSettings.defaultBearerCrossing ?? true
  );

  // طابعة الشيكات الافتراضية
  const [defaultPrinter, setDefaultPrinter] = useState<string>(
    printSettings.defaultPrinterName || 'HP LaserJet Pro M404n (درج الشيكات البنكية)'
  );
  const [isPrinterModalOpen, setIsPrinterModalOpen] = useState(false);
  const [customPrinterInput, setCustomPrinterInput] = useState(defaultPrinter);
  const [printAlertMsg, setPrintAlertMsg] = useState<string | null>(null);

  // نوافذ طباعة السند والمظروف
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);

  // إظهار لوحة القياسات الدقيقة
  const [showRulerGuide, setShowRulerGuide] = useState(false);

  // حالة المعايرة الحالية لجميع الحقول المنفردة
  const [calibration, setCalibration] = useState<ChequePrintSettings>({
    offsetX: printSettings.offsetX || 0,
    offsetY: printSettings.offsetY || 0,
    showBackgroundOnPrint: false,
    defaultCrossing: printSettings.defaultCrossing ?? true,
    defaultBearerCrossing: printSettings.defaultBearerCrossing ?? true,
    defaultPrinterName: printSettings.defaultPrinterName || defaultPrinter,
    templateMode: templateMode,
    dateOffsetX: printSettings.dateOffsetX || 0,
    dateOffsetY: printSettings.dateOffsetY || 0,
    payeeOffsetX: printSettings.payeeOffsetX || 0,
    payeeOffsetY: printSettings.payeeOffsetY || 0,
    wordsOffsetX: printSettings.wordsOffsetX || 0,
    wordsOffsetY: printSettings.wordsOffsetY || 0,
    amountOffsetX: printSettings.amountOffsetX || 0,
    amountOffsetY: printSettings.amountOffsetY || 0,
  });

  // الحقل المحدد حالياً للمعايرة بواسطة أزرار الأسهم
  const [activeField, setActiveField] = useState<AdjustableField>('date');
  const [stepMm, setStepMm] = useState<number>(0.5);
  const [savedSuccess, setSavedSuccess] = useState(false);

  // تنسيق التاريخ DD/MM/YYYY
  const dateObj = new Date(cheque.dueDate || cheque.issueDate);
  const dayStr = String(dateObj.getDate()).padStart(2, '0');
  const monthStr = String(dateObj.getMonth() + 1).padStart(2, '0');
  const yearStr = String(dateObj.getFullYear());
  const formattedDate = `${dayStr}/${monthStr}/${yearStr}`;

  // حساب التفقيط باللغتين دينار كويتي وفلس
  const tafqeetAr = cheque.amountInWordsAr || tafqeetKwd(cheque.amount);
  const tafqeetEn = cheque.amountInWordsEn || tafqeetKwdEn(cheque.amount);
  const activeTafqeet = printLanguage === 'en' ? tafqeetEn : tafqeetAr;

  // تحريك الحقل النشط بأزرار الأسهم
  const nudgeField = (dx: number, dy: number) => {
    setCalibration((prev) => {
      switch (activeField) {
        case 'global':
          return {
            ...prev,
            offsetX: Number(((prev.offsetX || 0) + dx).toFixed(2)),
            offsetY: Number(((prev.offsetY || 0) + dy).toFixed(2)),
          };
        case 'date':
          return {
            ...prev,
            dateOffsetX: Number(((prev.dateOffsetX || 0) + dx).toFixed(2)),
            dateOffsetY: Number(((prev.dateOffsetY || 0) + dy).toFixed(2)),
          };
        case 'payee':
          return {
            ...prev,
            payeeOffsetX: Number(((prev.payeeOffsetX || 0) + dx).toFixed(2)),
            payeeOffsetY: Number(((prev.payeeOffsetY || 0) + dy).toFixed(2)),
          };
        case 'words':
          return {
            ...prev,
            wordsOffsetX: Number(((prev.wordsOffsetX || 0) + dx).toFixed(2)),
            wordsOffsetY: Number(((prev.wordsOffsetY || 0) + dy).toFixed(2)),
          };
        case 'amount':
          return {
            ...prev,
            amountOffsetX: Number(((prev.amountOffsetX || 0) + dx).toFixed(2)),
            amountOffsetY: Number(((prev.amountOffsetY || 0) + dy).toFixed(2)),
          };
        default:
          return prev;
      }
    });
  };

  // حفظ المعايرة
  const handleSaveCalibration = () => {
    const updated = {
      ...calibration,
      defaultPrinterName: defaultPrinter,
      defaultCrossing: isCrossed,
      defaultBearerCrossing: isBearerCrossed,
      templateMode: templateMode,
    };
    if (onUpdatePrintSettings) {
      onUpdatePrintSettings(updated);
    }
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  // استعادة الوضع الافتراضي
  const handleResetCalibration = () => {
    const resetSettings: ChequePrintSettings = {
      offsetX: 0,
      offsetY: 0,
      showBackgroundOnPrint: false,
      defaultCrossing: true,
      defaultBearerCrossing: true,
      defaultPrinterName: defaultPrinter,
      templateMode: 'vector_template',
      dateOffsetX: 0,
      dateOffsetY: 0,
      payeeOffsetX: 0,
      payeeOffsetY: 0,
      wordsOffsetX: 0,
      wordsOffsetY: 0,
      amountOffsetX: 0,
      amountOffsetY: 0,
    };
    setCalibration(resetSettings);
    if (onUpdatePrintSettings) {
      onUpdatePrintSettings(resetSettings);
    }
  };

  // تنفيذ أمر الطباعة المباشر
  const handlePrint = () => {
    setPrintAlertMsg(`جاري توجيه أمر الطباعة إلى طابعة الشيكات المعتمدة: "${defaultPrinter}"...`);
    setTimeout(() => {
      window.print();
      setTimeout(() => setPrintAlertMsg(null), 3000);
    }, 400);
  };

  // حفظ الطابعة الافتراضية
  const handleSavePrinter = () => {
    if (customPrinterInput.trim()) {
      setDefaultPrinter(customPrinterInput.trim());
      const updated = {
        ...calibration,
        defaultPrinterName: customPrinterInput.trim(),
      };
      if (onUpdatePrintSettings) {
        onUpdatePrintSettings(updated);
      }
      setIsPrinterModalOpen(false);
    }
  };

  // إحداثيات الحقول الأساسية على الشيك الفعلي 178mm × 82mm
  const dateLeft = 127 + (calibration.offsetX || 0) + (calibration.dateOffsetX || 0);
  const dateTop = 26 + (calibration.offsetY || 0) + (calibration.dateOffsetY || 0);

  const payeeLeft = 34 + (calibration.offsetX || 0) + (calibration.payeeOffsetX || 0);
  const payeeTop = 34.5 + (calibration.offsetY || 0) + (calibration.payeeOffsetY || 0);

  const wordsLeft = 34 + (calibration.offsetX || 0) + (calibration.wordsOffsetX || 0);
  const wordsTop = 45 + (calibration.offsetY || 0) + (calibration.wordsOffsetY || 0);

  const amountLeft = 125 + (calibration.offsetX || 0) + (calibration.amountOffsetX || 0);
  const amountTop = 44.5 + (calibration.offsetY || 0) + (calibration.amountOffsetY || 0);

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto print:p-0 print:bg-white print:static">
      
      {/* CSS الخاص بالطباعة على الشيك الورقي الفعلي الملقم للطابعة (178mm × 82mm) */}
      <style>{`
        @media print {
          @page {
            size: 178mm 82mm;
            margin: 0mm;
          }
          html, body {
            margin: 0 !important;
            padding: 0 !important;
            width: 178mm !important;
            height: 82mm !important;
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
            width: 178mm !important;
            height: 82mm !important;
            margin: 0 !important;
            padding: 0 !important;
            border: none !important;
            box-shadow: none !important;
            background: transparent !important;
            background-image: none !important;
            overflow: hidden !important;
          }
          .screen-only-guide, .screen-highlight-box {
            display: none !important;
            opacity: 0 !important;
          }
          ${!printCrossingOnPhysical ? '.physical-crossing-line { display: none !important; }' : ''}
        }
      `}</style>

      <div className="bg-white w-full max-w-6xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-4 print:my-0 print:border-none print:shadow-none print:w-auto">
        
        {/* ========================================================================= */}
        {/* شريط التحكم العلوي                                                         */}
        {/* ========================================================================= */}
        <div className="bg-slate-900 text-white p-3.5 sm:p-4 flex flex-wrap items-center justify-between gap-3 print:hidden">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 font-bold">
              CBK
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm sm:text-base font-black">
                  طباعة شيك البنك التجاري الكويتي
                </h3>
                <span className="bg-emerald-500 text-slate-950 text-[10px] font-black px-2 py-0.5 rounded-full font-mono">
                  #{cheque.chequeNumberStr}
                </span>
                <span className="bg-slate-800 text-emerald-300 text-[10px] px-2.5 py-0.5 rounded border border-emerald-500/40 font-mono font-bold">
                  تلقيم مباشر للطابعة (178mm × 82mm)
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                {bankAccount.accountName} - الحساب: {bankAccount.accountNumber}
              </p>
            </div>
          </div>

          {/* أزرار التحكم السريعة */}
          <div className="flex flex-wrap items-center gap-2">
            
            {/* زر طباعة الإيصال والمظروف */}
            <button
              type="button"
              onClick={() => setIsReceiptModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold rounded-xl shadow-xs transition"
              title="طباعة سند صرف وإيصال استلام الشيك أو مظروف التسليم"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>سند الصرف والمظروف</span>
            </button>

            {/* اختيار لغة التفقيط */}
            <div className="bg-slate-800 p-1 rounded-xl flex items-center text-xs font-bold border border-slate-700">
              <span className="px-2 text-slate-400 flex items-center gap-1 text-[11px]">
                <Languages className="w-3.5 h-3.5 text-emerald-400" />
                <span>التفقيط:</span>
              </span>
              <button
                type="button"
                onClick={() => setPrintLanguage('ar')}
                className={`px-2.5 py-1 rounded-lg transition text-xs ${
                  printLanguage === 'ar'
                    ? 'bg-emerald-600 text-white shadow-xs'
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
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                English
              </button>
            </div>

            {/* زر الطباعة الفورية */}
            <button
              type="button"
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-black rounded-xl text-xs shadow-md transition"
            >
              <Printer className="w-4 h-4" />
              <span>طباعة الشيك الفعلي</span>
            </button>

            {/* إغلاق */}
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

        {/* شريط الإشعارات عن الطابعة المعتمدة */}
        {printAlertMsg && (
          <div className="bg-emerald-600 text-white px-4 py-2 text-xs font-bold flex items-center justify-between transition-all animate-fade-in print:hidden">
            <span>{printAlertMsg}</span>
            <button onClick={() => setPrintAlertMsg(null)} className="text-white hover:opacity-80">✕</button>
          </div>
        )}

        {/* ========================================================================= */}
        {/* شريط الخيارات: نمط الخلفية (المتجهي / الصورة / بدون) + التسطير + الطابعة     */}
        {/* ========================================================================= */}
        <div className="bg-slate-800 border-b border-slate-700 px-4 py-2.5 text-xs text-white flex flex-wrap items-center justify-between gap-3 print:hidden">
          
          {/* اختيار نمط المعاينة (الرسم المتجهي الأصلي، أو صورة الشيك الفعلية، أو بدون خلفية) */}
          <div className="flex items-center gap-2">
            <span className="text-slate-400 font-bold flex items-center gap-1">
              <Layers className="w-3.5 h-3.5 text-amber-400" />
              <span>خلفية المعاينة:</span>
            </span>
            <div className="bg-slate-900 p-0.5 rounded-lg flex items-center border border-slate-700 font-bold text-[11px]">
              <button
                type="button"
                onClick={() => setTemplateMode('vector_template')}
                className={`px-2.5 py-1 rounded-md transition ${
                  templateMode === 'vector_template'
                    ? 'bg-amber-500 text-slate-950 font-black shadow-xs'
                    : 'text-slate-300 hover:text-white'
                }`}
                title="عرض تصميم الشيك الرقمي المتجهي السابق"
              >
                الشيك المتجهي (Vector)
              </button>

              <button
                type="button"
                onClick={() => setTemplateMode('scanned_image')}
                className={`px-2.5 py-1 rounded-md transition ${
                  templateMode === 'scanned_image'
                    ? 'bg-emerald-600 text-white font-black shadow-xs'
                    : 'text-slate-300 hover:text-white'
                }`}
                title="عرض صورة الشيك الحقيقية الممسوحة ضوئياً"
              >
                صورة الشيك الفعلية (Photo)
              </button>

              <button
                type="button"
                onClick={() => setTemplateMode('blank')}
                className={`px-2.5 py-1 rounded-md transition ${
                  templateMode === 'blank'
                    ? 'bg-slate-700 text-white font-black shadow-xs'
                    : 'text-slate-300 hover:text-white'
                }`}
                title="بدون خلفية (حقول الطباعة فقط على ورقة فارغة)"
              >
                بدون خلفية
              </button>
            </div>
          </div>

          {/* خاصية التسطير للشيك (A/C PAYEE ONLY) وخاصية شطب أو لحامله */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setIsCrossed(!isCrossed)}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold transition border ${
                isCrossed
                  ? 'bg-blue-600/30 text-blue-300 border-blue-500'
                  : 'bg-slate-900 text-slate-400 border-slate-700 hover:text-white'
              }`}
              title="تفعيل أو إلغاء تسطير الشيك"
            >
              {isCrossed ? <CheckSquare className="w-3.5 h-3.5 text-blue-400" /> : <Square className="w-3.5 h-3.5" />}
              <span>تسطير الشيك (A/C Payee Only)</span>
            </button>

            {isCrossed && (
              <label className="flex items-center gap-1.5 text-[11px] text-slate-300 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={printCrossingOnPhysical}
                  onChange={(e) => setPrintCrossingOnPhysical(e.target.checked)}
                  className="rounded border-slate-700 text-blue-600 focus:ring-0"
                />
                <span>طباعة خطي التسطير على الشيك</span>
              </label>
            )}

            <button
              type="button"
              onClick={() => setIsBearerCrossed(!isBearerCrossed)}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold transition border ${
                isBearerCrossed
                  ? 'bg-amber-600/30 text-amber-300 border-amber-500'
                  : 'bg-slate-900 text-slate-400 border-slate-700 hover:text-white'
              }`}
              title="شطب عبارة أو لحامله"
            >
              {isBearerCrossed ? <CheckSquare className="w-3.5 h-3.5 text-amber-400" /> : <Square className="w-3.5 h-3.5" />}
              <span>شطب (أو لحامله)</span>
            </button>
          </div>

          {/* الطابعة المعتمدة للشيكات + زر التغيير */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 text-[11px] bg-slate-900/90 px-3 py-1 rounded-lg border border-slate-700">
              <Printer className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-slate-400">طابعة الشيكات:</span>
              <strong className="text-emerald-300 font-mono truncate max-w-[140px] sm:max-w-[200px]" title={defaultPrinter}>
                {defaultPrinter}
              </strong>
            </div>
            <button
              type="button"
              onClick={() => setIsPrinterModalOpen(true)}
              className="px-2.5 py-1 bg-slate-700 hover:bg-slate-600 text-white font-bold rounded-lg text-xs transition"
            >
              تغيير الطابعة
            </button>
          </div>

        </div>

        {/* ========================================================================= */}
        {/* لوحة الضبط والمعايرة المنفردة لكل حقل (أعلى/أسفل/يمين/يسار)                   */}
        {/* ========================================================================= */}
        <div className="bg-slate-50 border-b border-slate-200 p-3.5 print:hidden">
          <div className="flex flex-wrap items-center justify-between gap-3">
            
            {/* اختيار الحقل المراد تحريكه */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold text-slate-700 flex items-center gap-1">
                <Crosshair className="w-4 h-4 text-emerald-600" />
                <span>ضبط موضع الحقل:</span>
              </span>

              <div className="inline-flex bg-white rounded-xl p-1 border border-slate-300 shadow-2xs">
                <button
                  type="button"
                  onClick={() => setActiveField('date')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1 ${
                    activeField === 'date'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <span>1. التاريخ</span>
                  <span className="font-mono text-[10px] opacity-75">
                    ({(calibration.dateOffsetX || 0) > 0 ? `+${calibration.dateOffsetX}` : calibration.dateOffsetX || 0}, {(calibration.dateOffsetY || 0) > 0 ? `+${calibration.dateOffsetY}` : calibration.dateOffsetY || 0})
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveField('payee')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1 ${
                    activeField === 'payee'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <span>2. المستفيد</span>
                  <span className="font-mono text-[10px] opacity-75">
                    ({(calibration.payeeOffsetX || 0) > 0 ? `+${calibration.payeeOffsetX}` : calibration.payeeOffsetX || 0}, {(calibration.payeeOffsetY || 0) > 0 ? `+${calibration.payeeOffsetY}` : calibration.payeeOffsetY || 0})
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveField('words')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1 ${
                    activeField === 'words'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <span>3. التفقيط</span>
                  <span className="font-mono text-[10px] opacity-75">
                    ({(calibration.wordsOffsetX || 0) > 0 ? `+${calibration.wordsOffsetX}` : calibration.wordsOffsetX || 0}, {(calibration.wordsOffsetY || 0) > 0 ? `+${calibration.wordsOffsetY}` : calibration.wordsOffsetY || 0})
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveField('amount')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1 ${
                    activeField === 'amount'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <span>4. المبلغ بالأرقام</span>
                  <span className="font-mono text-[10px] opacity-75">
                    ({(calibration.amountOffsetX || 0) > 0 ? `+${calibration.amountOffsetX}` : calibration.amountOffsetX || 0}, {(calibration.amountOffsetY || 0) > 0 ? `+${calibration.amountOffsetY}` : calibration.amountOffsetY || 0})
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveField('global')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1 ${
                    activeField === 'global'
                      ? 'bg-slate-800 text-white shadow-xs'
                      : 'text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <span>كافة الشيك معاً</span>
                  <span className="font-mono text-[10px] opacity-75">
                    ({calibration.offsetX || 0}, {calibration.offsetY || 0})
                  </span>
                </button>
              </div>
            </div>

            {/* أزرار التحريك الدقيق (أعلى / أسفل / يمين / يسار) */}
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 text-[11px] font-bold text-slate-600 ml-2">
                <span>الخطوة:</span>
                <button
                  type="button"
                  onClick={() => setStepMm(0.5)}
                  className={`px-1.5 py-0.5 rounded text-[10px] ${
                    stepMm === 0.5 ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-700'
                  }`}
                >
                  0.5مم
                </button>
                <button
                  type="button"
                  onClick={() => setStepMm(1)}
                  className={`px-1.5 py-0.5 rounded text-[10px] ${
                    stepMm === 1 ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-700'
                  }`}
                >
                  1مم
                </button>
              </div>

              {/* أزرار الأسهم */}
              <div className="inline-flex items-center bg-white border border-slate-300 rounded-xl p-1 shadow-2xs">
                <button
                  type="button"
                  onClick={() => nudgeField(stepMm, 0)}
                  className="p-1.5 hover:bg-slate-100 text-slate-700 rounded-lg transition"
                  title="تحريك لليمين"
                >
                  <ArrowRight className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => nudgeField(-stepMm, 0)}
                  className="p-1.5 hover:bg-slate-100 text-slate-700 rounded-lg transition"
                  title="تحريك لليسار"
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => nudgeField(0, -stepMm)}
                  className="p-1.5 hover:bg-slate-100 text-slate-700 rounded-lg transition"
                  title="تحريك لأعلى"
                >
                  <ArrowUp className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => nudgeField(0, stepMm)}
                  className="p-1.5 hover:bg-slate-100 text-slate-700 rounded-lg transition"
                  title="تحريك لأسفل"
                >
                  <ArrowDown className="w-4 h-4" />
                </button>
              </div>

              {/* أزرار الحفظ وإعادة الضبط */}
              <button
                type="button"
                onClick={handleSaveCalibration}
                className="flex items-center gap-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow-xs transition"
              >
                {savedSuccess ? <Check className="w-3.5 h-3.5" /> : <Save className="w-3.5 h-3.5" />}
                <span>{savedSuccess ? 'تم الحفظ!' : 'حفظ الإعدادات'}</span>
              </button>

              <button
                type="button"
                onClick={handleResetCalibration}
                className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-200 rounded-xl transition"
                title="استعادة الوضع الافتراضي"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>

          </div>
        </div>

        {/* ========================================================================= */}
        {/* منطقة معاينة وطباعة الشيك الفعلي (178mm × 82mm)                             */}
        {/* ========================================================================= */}
        <div className="p-4 sm:p-8 bg-slate-100 flex flex-col items-center justify-center overflow-x-auto print:p-0 print:bg-transparent print:m-0">
          
          {/* حاوية الشيك بدقة 178mm × 82mm */}
          <div 
            id="cbk-print-wrapper"
            style={{
              width: '178mm',
              height: '82mm',
              backgroundImage: templateMode === 'scanned_image' ? `url('/cbk_cheque_template.jpg')` : 'none',
              backgroundSize: '100% 100%',
              backgroundPosition: 'center',
              backgroundRepeat: 'no-repeat',
            }}
            className="relative select-none box-border shadow-2xl rounded-xl border border-slate-300 print:shadow-none print:border-none print:rounded-none overflow-hidden bg-white"
          >

            {/* 1. تصميم الشيك المتجهي الأصلي (Vector SVG) عند تفعيل خيار الشيك المتجهي */}
            {templateMode === 'vector_template' && (
              <div className="absolute inset-0 pointer-events-none select-none screen-only-guide">
                {/* خلفية حماية أمنية وزخارف بنكية دقيقة */}
                <svg className="w-full h-full absolute inset-0" xmlns="http://www.w3.org/2000/svg">
                  <defs>
                    <linearGradient id="cbkBgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#f4faf5" />
                      <stop offset="50%" stopColor="#ebf6ed" />
                      <stop offset="100%" stopColor="#f0f7f2" />
                    </linearGradient>
                    <pattern id="cbkGuilloche" width="40" height="40" patternUnits="userSpaceOnUse">
                      <path d="M0 20 Q 10 5, 20 20 T 40 20 M0 20 Q 10 35, 20 20 T 40 20" fill="none" stroke="#2d7a48" strokeWidth="0.35" opacity="0.12" />
                      <circle cx="20" cy="20" r="12" fill="none" stroke="#2d7a48" strokeWidth="0.25" opacity="0.08" />
                    </pattern>
                  </defs>

                  <rect width="100%" height="100%" fill="url(#cbkBgGrad)" />
                  <rect width="100%" height="100%" fill="url(#cbkGuilloche)" />
                  
                  {/* إطار الشيك الأمني الداخلي */}
                  <rect x="8" y="8" width="calc(100% - 16px)" height="calc(100% - 16px)" rx="4" fill="none" stroke="#2d7a48" strokeWidth="1.2" opacity="0.45" />
                  <rect x="11" y="11" width="calc(100% - 22px)" height="calc(100% - 22px)" rx="3" fill="none" stroke="#2d7a48" strokeWidth="0.5" strokeDasharray="3,2" opacity="0.3" />
                </svg>

                {/* ترويسة البنك التجاري الكويتي وشعاره الرسمي */}
                <div className="absolute top-3.5 left-4 right-4 flex justify-between items-start">
                  
                  {/* شعار واسم البنك التجاري الكويتي */}
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-emerald-700 text-white flex items-center justify-center font-black text-sm shadow-xs border border-emerald-800">
                      CBK
                    </div>
                    <div>
                      <div className="text-[13px] font-black text-emerald-950 font-serif leading-none">
                        البنك التجاري الكويتي
                      </div>
                      <div className="text-[9px] font-sans font-bold text-emerald-900 tracking-wider uppercase mt-0.5">
                        Commercial Bank of Kuwait
                      </div>
                      <div className="text-[7.5px] text-slate-500 font-mono mt-0.5">
                        {bankAccount.branchName || 'الفرع الرئيسي - العاصمة'}
                      </div>
                    </div>
                  </div>

                  {/* خانة التاريخ */}
                  <div className="border border-emerald-900/40 rounded bg-white/70 px-2 py-1 text-right">
                    <span className="text-[8px] font-bold text-emerald-950 block">التاريخ / Date:</span>
                    <div className="w-28 h-5 border-b border-dashed border-emerald-800 mt-0.5 flex items-center justify-end px-1 text-[10px] text-slate-400 font-mono">
                      DD / MM / YYYY
                    </div>
                  </div>
                </div>

                {/* سطر ادفعوا لأمر */}
                <div className="absolute left-8 right-8 top-[33mm] flex items-center gap-2">
                  <span className="text-[10.5px] font-black text-emerald-950 whitespace-nowrap">
                    ادفعوا لأمر / Pay to the order of:
                  </span>
                  <div className="flex-1 border-b border-dotted border-emerald-900/60 h-4" />
                  <span className="text-[9px] font-bold text-emerald-900 whitespace-nowrap">
                    أو لحامله / or Bearer
                  </span>
                </div>

                {/* سطر دينار كويتي والتفقيط */}
                <div className="absolute left-8 right-8 top-[44mm] flex items-center gap-2">
                  <span className="text-[10px] font-black text-emerald-950 whitespace-nowrap">
                    مبلغ وقدره / The Sum of:
                  </span>
                  <div className="flex-1 border-b border-dotted border-emerald-900/60 h-4" />
                </div>

                {/* مربع المبلغ KD الأخضر المميز */}
                <div 
                  style={{
                    left: '124mm',
                    top: '43mm',
                    width: '45mm',
                    height: '12mm',
                  }}
                  className="absolute bg-emerald-50 border-2 border-emerald-700 rounded-lg flex items-center justify-between px-2.5 shadow-2xs"
                >
                  <span className="text-[10px] font-black text-emerald-900 font-serif">د.ك KD</span>
                  <div className="w-28 h-6 border-b border-dashed border-emerald-600/60" />
                </div>

                {/* توقيع المفوض بالصرف */}
                <div className="absolute right-8 bottom-[15mm] text-center">
                  <div className="w-40 border-b border-slate-700 h-6" />
                  <span className="text-[8px] font-bold text-slate-700 block mt-0.5">
                    توقيع المفوض بالصرف / Authorized Signature
                  </span>
                </div>

                {/* شريط MICR السفلي الأمني */}
                <div className="absolute bottom-2 left-6 right-6 h-6 bg-white/80 border-t border-slate-300 rounded flex items-center justify-around font-mono text-[9.5px] text-slate-800 tracking-widest px-4">
                  <span>⑈00{cheque.chequeNumberStr}⑈</span>
                  <span>018000⑆</span>
                  <span>{bankAccount.accountNumber}⑈</span>
                  <span>01</span>
                </div>
              </div>
            )}

            {/* 2. طبقة العتامة إذا أراد المستخدم خفض عتامة صورة المعاينة */}
            {templateMode === 'scanned_image' && imageOpacity < 100 && (
              <div 
                className="absolute inset-0 bg-white pointer-events-none screen-only-guide"
                style={{ opacity: 1 - imageOpacity / 100 }}
              />
            )}

            {/* 3. إطار توضيحي إذا تم اختيار بدون خلفية */}
            {templateMode === 'blank' && (
              <div className="absolute inset-0 pointer-events-none p-3 flex flex-col justify-between border-2 border-emerald-700/30 rounded-xl bg-emerald-50/15 screen-only-guide">
                <div className="flex justify-between items-start text-[8.5px] text-emerald-800/60 font-mono">
                  <span>ورقة الشيك الملقمة للطابعة (178mm × 82mm)</span>
                  <span>البنك التجاري الكويتي (CBK)</span>
                </div>
                <div className="text-center text-[9px] text-slate-400 font-mono">
                  [ معاينة الحقول الأربعة المطبوعة فقط على ورقة الشيك الرسمية ]
                </div>
              </div>
            )}

            {/* ===================================================================== */}
            {/* خاصية تسطير الشيك (A/C PAYEE ONLY) - خطان متوازيان ومائلان             */}
            {/* ===================================================================== */}
            {isCrossed && (
              <div 
                style={{
                  position: 'absolute',
                  left: '12mm',
                  top: '6mm',
                  width: '46mm',
                  height: '24mm',
                  pointerEvents: 'none',
                }}
                className={`flex flex-col items-center justify-center transform -rotate-12 select-none z-20 ${
                  printCrossingOnPhysical ? 'physical-crossing-line' : 'screen-only-guide'
                }`}
              >
                <div className="w-full h-[1.5px] bg-slate-950 print:bg-black" />
                <div className="py-0.5 text-[8.5px] font-black text-slate-950 print:text-black tracking-wider uppercase font-mono whitespace-nowrap text-center">
                  // A/C PAYEE ONLY //
                </div>
                <div className="text-[7.5px] font-bold text-slate-900 print:text-black whitespace-nowrap text-center -mt-0.5">
                  لا يصرف إلا لحساب المستفيد الأول
                </div>
                <div className="w-full h-[1.5px] bg-slate-950 print:bg-black" />
              </div>
            )}

            {/* ===================================================================== */}
            {/* الحقول الأربعة المطبوعة على الشيك:                                    */}
            {/* 1. التاريخ                                                           */}
            {/* 2. اسم المستفيد                                                       */}
            {/* 3. التفقيط (عربي أو إنجليزي)                                         */}
            {/* 4. المبلغ بالأرقام محصوراً بـ # في البداية والنهاية                     */}
            {/* ===================================================================== */}

            {/* 1. حقل التاريخ (Date) */}
            <div 
              style={{
                left: `${dateLeft}mm`,
                top: `${dateTop}mm`,
                width: '30mm',
                height: '6.5mm',
              }}
              onClick={() => setActiveField('date')}
              className={`absolute flex items-center justify-center font-mono font-black text-slate-950 text-[12px] tracking-wider cursor-pointer transition-all z-10 ${
                activeField === 'date' 
                  ? 'ring-2 ring-emerald-500 rounded bg-emerald-50/70 screen-highlight-box shadow-xs' 
                  : ''
              }`}
            >
              <span className="select-all print:text-black font-mono font-black">
                {formattedDate}
              </span>
            </div>

            {/* 2. حقل المستفيد (Pay to the order of / إدفعوا لأمر) */}
            <div 
              style={{
                left: `${payeeLeft}mm`,
                top: `${payeeTop}mm`,
                width: '116mm',
                height: '7mm',
              }}
              onClick={() => setActiveField('payee')}
              className={`absolute flex items-center font-serif font-black text-slate-950 text-[13px] px-1 truncate cursor-pointer transition-all z-10 ${
                activeField === 'payee' 
                  ? 'ring-2 ring-emerald-500 rounded bg-emerald-50/70 screen-highlight-box shadow-xs' 
                  : ''
              }`}
            >
              <span className="truncate block w-full select-all print:text-black font-serif font-black">
                {cheque.beneficiaryName}
              </span>

              {/* شطب عبارة "أو لحامله" إذا كانت محددة */}
              {isBearerCrossed && (
                <span className="absolute right-1 top-0 text-[8px] font-sans font-bold text-slate-900 line-through decoration-slate-900 decoration-2 whitespace-nowrap pointer-events-none">
                  {printLanguage === 'en' ? 'or Bearer' : 'أو لحامله'}
                </span>
              )}
            </div>

            {/* 3. حقل التفقيط (Amount in Words / دينار كويتي) */}
            <div 
              style={{
                left: `${wordsLeft}mm`,
                top: `${wordsTop}mm`,
                width: '82mm',
                minHeight: '6mm',
              }}
              onClick={() => setActiveField('words')}
              className={`absolute flex items-center font-sans font-bold text-slate-950 text-[11px] leading-tight px-1 cursor-pointer transition-all z-10 ${
                activeField === 'words' 
                  ? 'ring-2 ring-emerald-500 rounded bg-emerald-50/70 screen-highlight-box shadow-xs' 
                  : ''
              }`}
            >
              <span className="block leading-snug select-all print:text-black font-sans font-bold">
                {activeTafqeet}
              </span>
            </div>

            {/* 4. حقل المبلغ بالأرقام (محصور بين # و #) */}
            <div 
              style={{
                left: `${amountLeft}mm`,
                top: `${amountTop}mm`,
                width: '42mm',
                height: '10mm',
              }}
              onClick={() => setActiveField('amount')}
              className={`absolute flex items-center justify-center font-mono font-black text-slate-950 text-[13.5px] tracking-wider cursor-pointer transition-all z-10 ${
                activeField === 'amount' 
                  ? 'ring-2 ring-emerald-500 rounded bg-emerald-50/70 screen-highlight-box shadow-xs' 
                  : ''
              }`}
            >
              <span className="select-all print:text-black font-mono font-black">
                #{cheque.amount.toFixed(3)}#
              </span>
            </div>

          </div>

          {/* تنبيه وإرشادات تلقيم الطابعة */}
          <div className="mt-4 bg-emerald-50 border border-emerald-200 p-3 rounded-xl max-w-2xl text-xs text-emerald-950 print:hidden space-y-1 shadow-2xs">
            <div className="font-bold flex items-center justify-between text-emerald-900">
              <div className="flex items-center gap-1.5">
                <Printer className="w-4 h-4 text-emerald-600" />
                <span>جاهز للطباعة على ورقة الشيك البنكي الرسمي:</span>
              </div>
              <span className="font-mono text-[10px] text-emerald-700 bg-white px-2 py-0.5 rounded border border-emerald-200">
                طابعة: {defaultPrinter}
              </span>
            </div>
            <p className="text-[11px] text-emerald-800 leading-relaxed">
              قم بتلقيم ورقة الشيك الفعلي في درج الطابعة المعتمدة بمقاس (178mm × 82mm). سيتم طباعة الحقول الأربعة المطلوبة بدقة (التاريخ، المستفيد، التفقيط، والمبلغ بالأرقام محصوراً برمز ## في البداية والنهاية).
            </p>
          </div>

        </div>

      </div>

      {/* ========================================================================= */}
      {/* نافذة تعيين وتغيير طابعة الشيكات الافتراضية                                  */}
      {/* ========================================================================= */}
      {isPrinterModalOpen && (
        <div className="fixed inset-0 z-60 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl border border-slate-200 space-y-4 text-right">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
                  <Printer className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900">تعيين طابعة الشيكات الافتراضية</h3>
                  <p className="text-[11px] text-slate-400">حدد الطابعة المعتمدة لطباعة أوراق الشيكات البنكية</p>
                </div>
              </div>
              <button onClick={() => setIsPrinterModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Quick Presets */}
            <div className="space-y-1.5 text-xs">
              <span className="text-slate-500 font-bold block text-[11px]">طابعات الشيكات المقترحة:</span>
              {[
                'HP LaserJet Pro M404n (درج الشيكات المخصص)',
                'Epson PLQ-30 Passbook & Cheque Printer',
                'Canon imageCLASS LBP226dw (درج التغذية اليدوي)',
                'Brother HL-L5100DN (Manual Feed Slot)',
                'Lexmark MS431dn (Cheque Tray 2)'
              ].map((pName) => (
                <button
                  key={pName}
                  type="button"
                  onClick={() => setCustomPrinterInput(pName)}
                  className={`w-full text-right p-2.5 rounded-xl border text-xs transition flex items-center justify-between ${
                    customPrinterInput === pName
                      ? 'bg-emerald-50 border-emerald-400 text-emerald-900 font-bold'
                      : 'bg-slate-50 border-slate-200 hover:bg-slate-100 text-slate-700'
                  }`}
                >
                  <span className="font-mono text-[11px]">{pName}</span>
                  {customPrinterInput === pName && <Check className="w-4 h-4 text-emerald-600" />}
                </button>
              ))}
            </div>

            {/* Custom Input */}
            <div className="space-y-1 text-xs">
              <label className="text-slate-600 font-bold text-[11px] block">اسم طابعة مخصصة في نظامك:</label>
              <input
                type="text"
                value={customPrinterInput}
                onChange={(e) => setCustomPrinterInput(e.target.value)}
                placeholder="أدخل اسم الطابعة المثبتة على جهازك..."
                className="w-full p-2.5 border border-slate-300 rounded-xl text-xs font-mono font-bold"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsPrinterModalOpen(false)}
                className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl text-xs font-bold hover:bg-slate-200 transition"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={handleSavePrinter}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow transition"
              >
                حفظ كطابعة افتراضية
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* نافذة طباعة سند الصرف والإيصال ومظروف الشيك                                  */}
      {/* ========================================================================= */}
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
