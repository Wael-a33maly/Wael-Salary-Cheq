import React, { useState } from 'react';
import { 
  Printer, 
  X, 
  Languages, 
  FileText, 
  Check,
  Building2,
  Landmark,
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
  ArrowRight,
  AlignLeft,
  AlignCenter,
  AlignRight
} from 'lucide-react';
import { IssuedCheque, BankAccount, ChequeBook, ChequePrintSettings, ChequeSizeTemplate } from '../../types';
import { tafqeetKwd, tafqeetKwdEn, formatChequeAmount } from '../../utils/tafqeetKwd';
import { ChequeReceiptAndEnvelopeModal } from './ChequeReceiptAndEnvelopeModal';
import { computeChequeFieldPositions } from '../../utils/chequeCoords';

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
  onUpdatePrintSettings,
  onClose,
  onNavigateToCalibration,
}: CbkChequePrintProps) {
  // Fallback safe bank account to prevent crashes if accounts were reset
  const fallbackBankAccount: BankAccount = {
    id: cheque?.bankAccountId || 'acc-cbk-main',
    accountName: 'الحساب المصرفي الرئيسي',
    bankName: 'البنك التجاري الكويتي (CBK)',
    bankCode: 'CBK',
    accountNumber: '1020491823',
    iban: 'KW18CBKU000000001020491823',
    branchName: 'الفرع الرئيسي',
    currency: 'د.ك',
    currentBalance: 0,
    isDefault: true,
    chequeTemplate: 'CBK',
    chequeWidthCm: 18.0,
    chequeHeightCm: 9.0,
    status: 'active',
    createdAt: new Date().toISOString(),
  };

  const activeAccount = bankAccount || fallbackBankAccount;

  // Available templates for this bank account
  const templates: ChequeSizeTemplate[] = activeAccount.chequeTemplates && activeAccount.chequeTemplates.length > 0
    ? activeAccount.chequeTemplates
    : [
        {
          id: 'tpl-default',
          name: `${activeAccount.bankName} (${activeAccount.chequeWidthCm || 18.0} × ${activeAccount.chequeHeightCm || 9.0} سم)`,
          widthCm: activeAccount.chequeWidthCm || 18.0,
          heightCm: activeAccount.chequeHeightCm || 9.0,
          chequeImageUrl: activeAccount.chequeImageUrl,
          chequeImageName: activeAccount.chequeImageName,
          isDefault: true,
        }
      ];

  // Active selected template (defaults to matching cheque's templateId, or account default, or first template)
  const initialTemplateId = cheque?.templateId || activeAccount.activeTemplateId || templates[0]?.id;
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>(initialTemplateId);
  
  const activeTemplate = templates.find((t) => t.id === selectedTemplateId) || templates[0];

  // Dynamic Dimensions in cm and mm
  const widthCm = activeTemplate?.widthCm || activeAccount.chequeWidthCm || 18.0;
  const heightCm = activeTemplate?.heightCm || activeAccount.chequeHeightCm || 9.0;
  const widthMm = Math.round(widthCm * 10);
  const heightMm = Math.round(heightCm * 10);

  // Background stamp image for this cheque template
  const [imgLoadError, setImgLoadError] = useState<boolean>(false);
  const stampImageUrl = printSettings.customChequeImageUrl || activeTemplate?.chequeImageUrl || activeAccount.chequeImageUrl || '/cbk_cheque_bg.jpg';

  // Print Mode: Print text only onto physical cheque paper OR print with full background stamp
  const [printWithBackground, setPrintWithBackground] = useState<boolean>(false);
  const [showScreenBackground, setShowScreenBackground] = useState<boolean>(true);

  // Crossing Lines ("A/C PAYEE ONLY") & Bearer crossing
  const [isCrossed, setIsCrossed] = useState<boolean>(cheque.isCrossed ?? true);
  const [isBearerCrossed, setIsBearerCrossed] = useState<boolean>(cheque.bearerCrossed ?? true);

  // Quick fine offset adjustments (mm)
  const [fineOffsetX, setFineOffsetX] = useState<number>(printSettings.offsetX || 0);
  const [fineOffsetY, setFineOffsetY] = useState<number>(printSettings.offsetY || 0);

  // اتجاه تلقيم الشيك في الطابعة (أفقي بالعرض أو رأسي بالطول من جهة الـ 9 سم)
  const [feedOrientation, setFeedOrientation] = useState<'landscape' | 'portrait_90' | 'portrait_270'>(
    printSettings.feedOrientation || 'portrait_90'
  );
  // نوع الورق ومحاذاة الشيك في الدرج (A4 مع توسيط لـ HP Laser 107w ومثيلاتها)
  const [paperType, setPaperType] = useState<'a4_feed' | 'custom_cheque_size'>(
    printSettings.paperType || 'a4_feed'
  );
  const [feedAlignment, setFeedAlignment] = useState<'center' | 'right' | 'left'>(
    printSettings.feedAlignment || 'center'
  );
  const [trayOffsetX, setTrayOffsetX] = useState<number>(printSettings.trayOffsetX || 0);
  const [trayOffsetY, setTrayOffsetY] = useState<number>(printSettings.trayOffsetY || 0);
  const [rotatePreviewOnScreen, setRotatePreviewOnScreen] = useState<boolean>(false);

  // Field text alignments
  const [payeeAlign, setPayeeAlign] = useState<'right' | 'center' | 'left'>(
    printSettings.payeeAlign || 'right'
  );
  const [dateAlign, setDateAlign] = useState<'right' | 'center' | 'left'>(
    printSettings.dateAlign || 'center'
  );
  const [wordsAlign, setWordsAlign] = useState<'right' | 'center' | 'left'>(
    printSettings.wordsAlign || 'right'
  );
  const [amountAlign, setAmountAlign] = useState<'right' | 'center' | 'left'>(
    printSettings.amountAlign || 'center'
  );
  const [payeeOffsetX, setPayeeOffsetX] = useState<number>(printSettings.payeeOffsetX || 0);
  const [payeeOffsetY, setPayeeOffsetY] = useState<number>(printSettings.payeeOffsetY || 0);
  const [payeeWidthOverride, setPayeeWidthOverride] = useState<number | undefined>(printSettings.payeeWidth);
  const [payeeFontSizeOverride, setPayeeFontSizeOverride] = useState<number | undefined>(printSettings.payeeFontSize);

  // Quick persistent settings updater
  const saveQuickSettings = (updates: Partial<ChequePrintSettings>) => {
    const updated: ChequePrintSettings = {
      ...printSettings,
      offsetX: fineOffsetX,
      offsetY: fineOffsetY,
      feedOrientation,
      paperType,
      feedAlignment,
      trayOffsetX,
      trayOffsetY,
      payeeAlign,
      dateAlign,
      wordsAlign,
      amountAlign,
      payeeOffsetX,
      payeeOffsetY,
      payeeWidth: payeeWidthOverride,
      payeeFontSize: payeeFontSizeOverride,
      ...updates,
    };
    try {
      localStorage.setItem('app_cheque_print_settings', JSON.stringify(updated));
    } catch (e) {
      console.error(e);
    }
    if (onUpdatePrintSettings) {
      onUpdatePrintSettings(updated);
    }
  };

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

  // Exact unified millimeter coordinates, dimensions and font sizes computed dynamically
  const activePrintSettings: ChequePrintSettings = {
    ...printSettings,
    offsetX: fineOffsetX,
    offsetY: fineOffsetY,
    dateAlign,
    payeeAlign,
    wordsAlign,
    amountAlign,
    payeeOffsetX,
    payeeOffsetY,
    payeeWidth: payeeWidthOverride,
    payeeFontSize: payeeFontSizeOverride,
  };
  const coordsMap = computeChequeFieldPositions(activePrintSettings, widthMm, heightMm, activeTemplate);
  const { date: dateField, payee: payeeField, words: wordsField, amount: amountField } = coordsMap;

  const dateLeft = dateField.left;
  const dateTop = dateField.top;
  const dateWidth = dateField.width;
  const dateHeight = dateField.height;
  const dateFontSize = dateField.fontSize;

  const payeeLeft = payeeField.left;
  const payeeTop = payeeField.top;
  const payeeWidth = payeeField.width;
  const payeeHeight = payeeField.height;
  const payeeFontSize = payeeField.fontSize;

  const wordsLeft = wordsField.left;
  const wordsTop = wordsField.top;
  const wordsWidth = wordsField.width;
  const wordsHeight = wordsField.height;
  const wordsFontSize = wordsField.fontSize;

  const amountLeft = amountField.left;
  const amountTop = amountField.top;
  const amountWidth = amountField.width;
  const amountHeight = amountField.height;
  const amountFontSize = amountField.fontSize;

  // Direct bulletproof print trigger via iframe with standard print fallback
  const handlePrint = () => {
    setIsPrinting(true);
    try {
      let iframe = document.getElementById('cheque-print-iframe') as HTMLIFrameElement;
      if (!iframe) {
        iframe = document.createElement('iframe');
        iframe.id = 'cheque-print-iframe';
        iframe.style.position = 'fixed';
        iframe.style.top = '-10000px';
        iframe.style.left = '-10000px';
        iframe.style.width = '300mm';
        iframe.style.height = '300mm';
        iframe.style.border = 'none';
        iframe.style.opacity = '0';
        iframe.style.pointerEvents = 'none';
        iframe.style.zIndex = '-9999';
        document.body.appendChild(iframe);
      } else {
        iframe.style.top = '-10000px';
        iframe.style.left = '-10000px';
        iframe.style.width = '300mm';
        iframe.style.height = '300mm';
      }

      const doc = iframe.contentWindow?.document;
      if (!doc) {
        throw new Error('Iframe document unavailable');
      }

      const backgroundLayerHtml = printWithBackground ? (
        !imgLoadError && stampImageUrl
          ? `<img src="${stampImageUrl}" style="position: absolute; left: 0; top: 0; width: 100%; height: 100%; object-fit: fill; z-index: 0;" />`
          : `
            <div style="position: absolute; left: 0; top: 0; width: 100%; height: 100%; z-index: 0; background: #fafaf5; border: 2px solid #0f4c3a; padding: 4mm; box-sizing: border-box;">
              <div style="display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 1.5px solid #0f4c3a; padding-bottom: 2mm;">
                <div style="text-align: right;">
                  <div style="font-weight: 900; font-size: 13px; color: #0f4c3a;">${activeAccount.bankName}</div>
                  <div style="font-size: 9px; color: #555; font-family: monospace;">حساب: ${activeAccount.accountNumber}</div>
                </div>
                <div style="text-align: center;">
                  <div style="font-weight: bold; font-size: 11px; color: #222;">دولة الكويت &bull; STATE OF KUWAIT</div>
                  <div style="font-size: 9px; color: #777;">شيك مصرفي معتمد</div>
                </div>
                <div style="text-align: left;">
                  <div style="font-weight: 900; font-size: 12px; font-family: monospace; color: #000;"># ${cheque.chequeNumberStr}</div>
                </div>
              </div>
              <div style="position: absolute; bottom: 2mm; left: 6mm; font-family: monospace; font-size: 10px; font-weight: bold; letter-spacing: 2px; color: #222;">
                ⑈ ${cheque.chequeNumberStr} ⑈ 020 ⑈ ${activeAccount.accountNumber} ⑈ 25
              </div>
            </div>
          `
      ) : '';

      const crossingLayerHtml = isCrossed ? `
        <div style="position: absolute; left: 12mm; top: 6mm; width: 42mm; height: 16mm; z-index: 10;">
          <div style="border-top: 2px solid #000; transform: rotate(-12deg); margin-bottom: 2px;"></div>
          <div style="font-size: 8.5px; font-weight: 900; text-align: center; letter-spacing: 2px; transform: rotate(-12deg); color: #000; font-family: sans-serif;">A/C PAYEE ONLY</div>
          <div style="border-top: 2px solid #000; transform: rotate(-12deg); margin-top: 2px;"></div>
        </div>
      ` : '';

      const isPortrait = feedOrientation === 'portrait_90' || feedOrientation === 'portrait_270';
      const isA4Feed = paperType === 'a4_feed';
      const a4WidthMm = 210;
      const feedWidthMm = isPortrait ? heightMm : widthMm; // 90mm for portrait, 180mm for landscape

      let baseTrayX = 0;
      if (isA4Feed) {
        if (feedAlignment === 'center') {
          baseTrayX = Math.round((a4WidthMm - feedWidthMm) / 2); // 60mm for HP Laser 107w in 9cm portrait!
        } else if (feedAlignment === 'right') {
          baseTrayX = Math.round(a4WidthMm - feedWidthMm); // 120mm
        } else {
          baseTrayX = 0; // left
        }
      }

      const finalTrayX = baseTrayX + (fineOffsetX || 0) + (trayOffsetX || 0);
      const finalTrayY = (fineOffsetY || 0) + (trayOffsetY || 0);

      const pageSizeCss = isA4Feed 
        ? '210mm 297mm portrait' 
        : (isPortrait ? `${heightMm}mm ${widthMm}mm portrait` : `${widthMm}mm ${heightMm}mm landscape`);
      
      const bodyWidthCss = isA4Feed ? '210mm' : (isPortrait ? `${heightMm}mm` : `${widthMm}mm`);
      const bodyHeightCss = isA4Feed ? '297mm' : (isPortrait ? `${widthMm}mm` : `${heightMm}mm`);

      const transformCss = feedOrientation === 'portrait_90'
        ? `transform-origin: 0 0; transform: translate(${finalTrayX}mm, ${finalTrayY + widthMm}mm) rotate(-90deg);`
        : feedOrientation === 'portrait_270'
        ? `transform-origin: 0 0; transform: translate(${finalTrayX + heightMm}mm, ${finalTrayY}mm) rotate(90deg);`
        : `transform-origin: 0 0; transform: translate(${finalTrayX}mm, ${finalTrayY}mm);`;

      doc.open();
      doc.write(`
        <!DOCTYPE html>
        <html dir="ltr">
        <head>
          <meta charset="utf-8" />
          <title>طباعة شيك #${cheque.chequeNumberStr}</title>
          <style>
            @page {
              size: ${pageSizeCss};
              margin: 0mm !important;
            }
            * {
              box-sizing: border-box;
              margin: 0;
              padding: 0;
            }
            html, body {
              width: ${bodyWidthCss};
              height: ${bodyHeightCss};
              margin: 0 !important;
              padding: 0 !important;
              background: ${printWithBackground ? '#fff' : 'transparent'};
              position: relative;
              font-family: 'Cairo', 'Segoe UI', Tahoma, sans-serif;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            .cheque-print-surface {
              position: absolute;
              left: 0;
              top: 0;
              width: ${widthMm}mm;
              height: ${heightMm}mm;
              ${transformCss}
            }
            .date-field {
              position: absolute;
              left: ${dateLeft}mm;
              top: ${dateTop}mm;
              width: ${dateWidth}mm;
              height: ${dateHeight}mm;
              line-height: ${dateHeight}mm;
              font-size: ${dateFontSize}px;
              font-family: monospace, 'Courier New', sans-serif;
              font-weight: 900;
              color: #000;
              text-align: ${dateAlign};
              white-space: nowrap;
              overflow: hidden;
              box-sizing: border-box;
              padding: 0 1mm;
              z-index: 10;
            }
            .payee-field {
              position: absolute;
              left: ${payeeLeft}mm;
              top: ${payeeTop}mm;
              width: ${payeeWidth}mm;
              height: ${payeeHeight}mm;
              line-height: ${payeeHeight}mm;
              font-size: ${payeeFontSize}px;
              font-family: serif, 'Cairo', 'Segoe UI', Tahoma, sans-serif;
              font-weight: 900;
              color: #000;
              text-align: ${payeeAlign};
              direction: rtl;
              white-space: nowrap;
              overflow: hidden;
              box-sizing: border-box;
              padding: 0 1mm;
              z-index: 10;
            }
            .words-field {
              position: absolute;
              left: ${wordsLeft}mm;
              top: ${wordsTop}mm;
              width: ${wordsWidth}mm;
              height: ${wordsHeight}mm;
              font-size: ${wordsFontSize}px;
              font-family: 'Cairo', 'Segoe UI', Tahoma, sans-serif;
              font-weight: bold;
              color: #000;
              text-align: ${wordsAlign};
              direction: rtl;
              line-height: 1.25;
              overflow: hidden;
              box-sizing: border-box;
              padding: 0 1mm;
              z-index: 10;
            }
            .amount-field {
              position: absolute;
              left: ${amountLeft}mm;
              top: ${amountTop}mm;
              width: ${amountWidth}mm;
              height: ${amountHeight}mm;
              line-height: ${amountHeight}mm;
              font-size: ${amountFontSize}px;
              font-family: monospace, 'Courier New', sans-serif;
              font-weight: 900;
              color: #000;
              text-align: ${amountAlign};
              white-space: nowrap;
              overflow: hidden;
              box-sizing: border-box;
              padding: 0 1mm;
              letter-spacing: 1px;
              z-index: 10;
            }
          </style>
        </head>
        <body>
          <div class="cheque-print-surface">
            ${backgroundLayerHtml}
            ${crossingLayerHtml}
            <div class="date-field">${formattedDate}</div>
            <div class="payee-field">${cheque.beneficiaryName}</div>
            <div class="words-field">${activeTafqeet}</div>
            <div class="amount-field">${formatChequeAmount(cheque.amount)}</div>
          </div>
        </body>
        </html>
      `);
      doc.close();

      setTimeout(() => {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
        setIsPrinting(false);
      }, 250);
    } catch (err) {
      console.warn('Iframe print error, falling back to window.print:', err);
      document.body.classList.add('printing-cheque-mode');
      setTimeout(() => {
        window.print();
        setTimeout(() => {
          document.body.classList.remove('printing-cheque-mode');
          setIsPrinting(false);
        }, 500);
      }, 200);
    }
  };

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
                  معاينة وطباعة شيك {activeAccount.bankName}
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
                {activeAccount.accountName} - الحساب: {activeAccount.accountNumber}
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
            
            {/* Feed Orientation Selector */}
            <div className="flex items-center gap-1 bg-white p-1 rounded-lg border border-slate-300 text-[11px] font-bold">
              <span className="text-slate-500 px-1">تلقيم الشيك:</span>
              <button
                type="button"
                onClick={() => setFeedOrientation('landscape')}
                className={`px-2 py-0.5 rounded transition ${
                  feedOrientation === 'landscape'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-700 hover:bg-slate-100'
                }`}
                title="تلقيم أفقي بالعرض (18 سم أولاً)"
              >
                ↔️ أفقي (18 سم)
              </button>
              <button
                type="button"
                onClick={() => setFeedOrientation('portrait_90')}
                className={`px-2 py-0.5 rounded transition ${
                  feedOrientation === 'portrait_90'
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'text-slate-700 hover:bg-slate-100'
                }`}
                title="تلقيم رأسي بالطول من جهة الـ 9 سم (اتجاه التاريخ والمبلغ أولاً)"
              >
                ↕️ رأسي (9 سم - جهة التاريخ والمبلغ)
              </button>
              <button
                type="button"
                onClick={() => setFeedOrientation('portrait_270')}
                className={`px-2 py-0.5 rounded transition ${
                  feedOrientation === 'portrait_270'
                    ? 'bg-slate-800 text-white shadow-xs'
                    : 'text-slate-700 hover:bg-slate-100'
                }`}
                title="تلقيم رأسي بالاتجاه المعاكس (270 درجة)"
              >
                🔄 رأسي (270°)
              </button>
            </div>

            {/* Tray Alignment (HP Laser 107w / Desktop Lasers vs Custom Cheque Size) */}
            <div className="flex items-center gap-1 bg-white p-1 rounded-lg border border-slate-300 text-[11px] font-bold">
              <span className="text-slate-500 px-1">درج الطابعة:</span>
              <button
                type="button"
                onClick={() => {
                  setPaperType('a4_feed');
                  setFeedAlignment('center');
                }}
                className={`px-2 py-0.5 rounded transition flex items-center gap-1 ${
                  paperType === 'a4_feed' && feedAlignment === 'center'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-700 hover:bg-slate-100'
                }`}
                title="منتصف درج A4 (الوضع المعتمد لطابعات HP Laser 107w وموجّهات الليزر)"
              >
                🎯 منتصف الدرج (HP 107w)
              </button>
              <button
                type="button"
                onClick={() => {
                  setPaperType('a4_feed');
                  setFeedAlignment('left');
                }}
                className={`px-2 py-0.5 rounded transition ${
                  paperType === 'a4_feed' && feedAlignment === 'left'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-700 hover:bg-slate-100'
                }`}
                title="يسار الدرج (0 مم)"
              >
                ⬅️ يسار
              </button>
              <button
                type="button"
                onClick={() => {
                  setPaperType('custom_cheque_size');
                }}
                className={`px-2 py-0.5 rounded transition ${
                  paperType === 'custom_cheque_size'
                    ? 'bg-purple-600 text-white shadow-xs'
                    : 'text-slate-700 hover:bg-slate-100'
                }`}
                title="مقاس الشيك فقط بدون A4 (طابعات الشيكات المتخصصة)"
              >
                🖨️ شيك فقط
              </button>
            </div>

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

        {/* Feed Direction Notification & On-screen rotation toggle */}
        <div className="bg-amber-50 border-b border-amber-200 px-5 py-2.5 flex flex-wrap items-center justify-between text-xs text-amber-950 font-bold gap-3">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-lg">🎯</span>
            <div>
              <span>
                {paperType === 'a4_feed' && feedAlignment === 'center'
                  ? 'طابعة HP Laser 107w (موجّهات منتصف الدرج): تم تفعيل الإزاحة التلقائية إلى منتصف ورقة A4 (60 مم للرأسي / 15 مم للأفقي).'
                  : paperType === 'a4_feed' && feedAlignment === 'left'
                  ? 'طابعة موجّهة لليسار: تتم الطباعة بمحاذاة الحافة اليسرى لدرج A4.'
                  : 'طابعة شيكات مخصصة: تتم الطباعة بمقاس الشيك المباشر بدون إطار A4.'}
              </span>
              <span className="text-[11px] block text-amber-800 font-normal">
                {feedOrientation === 'portrait_90'
                  ? 'اتجاه التلقيم: رأسي من جهة الـ 9 سم (باتجاه التاريخ والمبلغ أولاً).'
                  : feedOrientation === 'portrait_270'
                  ? 'اتجاه التلقيم: رأسي من جهة الـ 9 سم (تدوير عكسي 270°).'
                  : 'اتجاه التلقيم: أفقي بالعرض (18 سم).'}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* Fine Tray Adjust */}
            <div className="flex items-center gap-1 bg-white px-2 py-1 rounded-lg border border-amber-300 text-[11px]">
              <span className="text-slate-600 font-bold">تعديل الدرج:</span>
              <button
                type="button"
                onClick={() => setTrayOffsetX((prev) => prev - 1)}
                className="w-5 h-5 flex items-center justify-center bg-slate-100 hover:bg-amber-200 rounded font-bold"
                title="إزاحة 1 مم يساراً"
              >
                -
              </button>
              <span className="font-mono font-bold px-1">{trayOffsetX > 0 ? `+${trayOffsetX}` : trayOffsetX}مم</span>
              <button
                type="button"
                onClick={() => setTrayOffsetX((prev) => prev + 1)}
                className="w-5 h-5 flex items-center justify-center bg-slate-100 hover:bg-amber-200 rounded font-bold"
                title="إزاحة 1 مم يميناً"
              >
                +
              </button>
            </div>

            <button
              type="button"
              onClick={() => setRotatePreviewOnScreen(!rotatePreviewOnScreen)}
              className="text-[11px] px-3 py-1.5 rounded-lg bg-white border border-amber-400 text-amber-950 hover:bg-amber-100 transition shadow-xs flex items-center gap-1.5 font-bold"
            >
              <span>{rotatePreviewOnScreen ? '🔄 عرض المعاينة أفقياً' : '🔄 تدوير المعاينة رأسياً (شكل الدرج)'}</span>
            </button>
          </div>
        </div>

        {/* Quick Align & Payee Field Adjustment Toolbar (تحكم فوري بالمحاذاة Align وضبط موضع اسم المستفيد بدقة) */}
        <div className="bg-white border-b border-slate-200 px-4 py-2.5 flex flex-wrap items-center justify-between text-xs gap-3 print:hidden shadow-xs">
          
          {/* Section 1: Text Alignment Controls for all 4 Fields */}
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <span className="font-bold text-slate-800 flex items-center gap-1 text-[11px]">
              <AlignLeft className="w-3.5 h-3.5 text-amber-600" />
              <span>محاذاة النصوص (Align):</span>
            </span>

            {/* Payee Align */}
            <div className="flex items-center gap-1 bg-emerald-50/90 px-2 py-1 rounded-lg border border-emerald-200 text-[11px]">
              <span className="font-bold text-emerald-950">المستفيد:</span>
              <button
                type="button"
                onClick={() => {
                  setPayeeAlign('right');
                  saveQuickSettings({ payeeAlign: 'right' });
                }}
                className={`px-1.5 py-0.5 rounded font-bold transition ${
                  payeeAlign === 'right' ? 'bg-emerald-600 text-white shadow-xs' : 'text-emerald-800 hover:bg-emerald-100'
                }`}
                title="محاذاة لليمين (الافتراضي للغة العربية)"
              >
                يمين
              </button>
              <button
                type="button"
                onClick={() => {
                  setPayeeAlign('center');
                  saveQuickSettings({ payeeAlign: 'center' });
                }}
                className={`px-1.5 py-0.5 rounded font-bold transition ${
                  payeeAlign === 'center' ? 'bg-emerald-600 text-white shadow-xs' : 'text-emerald-800 hover:bg-emerald-100'
                }`}
                title="محاذاة للوسط"
              >
                وسط
              </button>
              <button
                type="button"
                onClick={() => {
                  setPayeeAlign('left');
                  saveQuickSettings({ payeeAlign: 'left' });
                }}
                className={`px-1.5 py-0.5 rounded font-bold transition ${
                  payeeAlign === 'left' ? 'bg-emerald-600 text-white shadow-xs' : 'text-emerald-800 hover:bg-emerald-100'
                }`}
                title="محاذاة لليسار"
              >
                يسار
              </button>
            </div>

            {/* Words Align */}
            <div className="flex items-center gap-1 bg-purple-50/90 px-2 py-1 rounded-lg border border-purple-200 text-[11px]">
              <span className="font-bold text-purple-950">التفقيط:</span>
              <button
                type="button"
                onClick={() => {
                  setWordsAlign('right');
                  saveQuickSettings({ wordsAlign: 'right' });
                }}
                className={`px-1.5 py-0.5 rounded font-bold transition ${
                  wordsAlign === 'right' ? 'bg-purple-600 text-white shadow-xs' : 'text-purple-800 hover:bg-purple-100'
                }`}
                title="محاذاة لليمين"
              >
                يمين
              </button>
              <button
                type="button"
                onClick={() => {
                  setWordsAlign('center');
                  saveQuickSettings({ wordsAlign: 'center' });
                }}
                className={`px-1.5 py-0.5 rounded font-bold transition ${
                  wordsAlign === 'center' ? 'bg-purple-600 text-white shadow-xs' : 'text-purple-800 hover:bg-purple-100'
                }`}
                title="محاذاة للوسط"
              >
                وسط
              </button>
              <button
                type="button"
                onClick={() => {
                  setWordsAlign('left');
                  saveQuickSettings({ wordsAlign: 'left' });
                }}
                className={`px-1.5 py-0.5 rounded font-bold transition ${
                  wordsAlign === 'left' ? 'bg-purple-600 text-white shadow-xs' : 'text-purple-800 hover:bg-purple-100'
                }`}
                title="محاذاة لليسار"
              >
                يسار
              </button>
            </div>

            {/* Date Align */}
            <div className="flex items-center gap-1 bg-blue-50/90 px-2 py-1 rounded-lg border border-blue-200 text-[11px]">
              <span className="font-bold text-blue-950">التاريخ:</span>
              <button
                type="button"
                onClick={() => {
                  setDateAlign('center');
                  saveQuickSettings({ dateAlign: 'center' });
                }}
                className={`px-1.5 py-0.5 rounded font-bold transition ${
                  dateAlign === 'center' ? 'bg-blue-600 text-white shadow-xs' : 'text-blue-800 hover:bg-blue-100'
                }`}
                title="محاذاة للوسط"
              >
                وسط
              </button>
              <button
                type="button"
                onClick={() => {
                  setDateAlign('right');
                  saveQuickSettings({ dateAlign: 'right' });
                }}
                className={`px-1.5 py-0.5 rounded font-bold transition ${
                  dateAlign === 'right' ? 'bg-blue-600 text-white shadow-xs' : 'text-blue-800 hover:bg-blue-100'
                }`}
                title="محاذاة لليمين"
              >
                يمين
              </button>
              <button
                type="button"
                onClick={() => {
                  setDateAlign('left');
                  saveQuickSettings({ dateAlign: 'left' });
                }}
                className={`px-1.5 py-0.5 rounded font-bold transition ${
                  dateAlign === 'left' ? 'bg-blue-600 text-white shadow-xs' : 'text-blue-800 hover:bg-blue-100'
                }`}
                title="محاذاة لليسار"
              >
                يسار
              </button>
            </div>

            {/* Amount Align */}
            <div className="flex items-center gap-1 bg-amber-50/90 px-2 py-1 rounded-lg border border-amber-200 text-[11px]">
              <span className="font-bold text-amber-950">المبلغ:</span>
              <button
                type="button"
                onClick={() => {
                  setAmountAlign('center');
                  saveQuickSettings({ amountAlign: 'center' });
                }}
                className={`px-1.5 py-0.5 rounded font-bold transition ${
                  amountAlign === 'center' ? 'bg-amber-600 text-white shadow-xs' : 'text-amber-800 hover:bg-amber-100'
                }`}
                title="محاذاة للوسط"
              >
                وسط
              </button>
              <button
                type="button"
                onClick={() => {
                  setAmountAlign('right');
                  saveQuickSettings({ amountAlign: 'right' });
                }}
                className={`px-1.5 py-0.5 rounded font-bold transition ${
                  amountAlign === 'right' ? 'bg-amber-600 text-white shadow-xs' : 'text-amber-800 hover:bg-amber-100'
                }`}
                title="محاذاة لليمين"
              >
                يمين
              </button>
              <button
                type="button"
                onClick={() => {
                  setAmountAlign('left');
                  saveQuickSettings({ amountAlign: 'left' });
                }}
                className={`px-1.5 py-0.5 rounded font-bold transition ${
                  amountAlign === 'left' ? 'bg-amber-600 text-white shadow-xs' : 'text-amber-800 hover:bg-amber-100'
                }`}
                title="محاذاة لليسار"
              >
                يسار
              </button>
            </div>
          </div>

          {/* Section 2: Precise Tuning for Payee Name (ضبط إزاحة وعرض اسم المستفيد بدقة) */}
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
            <span className="text-[11px] font-bold text-emerald-800">موضع الاسم:</span>
            
            {/* Payee X Nudge */}
            <div className="flex items-center gap-0.5 bg-slate-100 px-1.5 py-0.5 rounded-lg border border-slate-300 text-[11px]">
              <span className="text-slate-500 font-bold px-0.5">أفقي:</span>
              <button
                type="button"
                onClick={() => {
                  const val = Math.round((payeeOffsetX - 1) * 10) / 10;
                  setPayeeOffsetX(val);
                  saveQuickSettings({ payeeOffsetX: val });
                }}
                className="w-5 h-5 flex items-center justify-center bg-white hover:bg-emerald-100 rounded text-slate-700 font-bold"
                title="تحريك اسم المستفيد 1 مم يساراً"
              >
                ⬅️
              </button>
              <span className="font-mono font-bold px-1 text-[10px]">
                {payeeOffsetX > 0 ? `+${payeeOffsetX}` : payeeOffsetX} مم
              </span>
              <button
                type="button"
                onClick={() => {
                  const val = Math.round((payeeOffsetX + 1) * 10) / 10;
                  setPayeeOffsetX(val);
                  saveQuickSettings({ payeeOffsetX: val });
                }}
                className="w-5 h-5 flex items-center justify-center bg-white hover:bg-emerald-100 rounded text-slate-700 font-bold"
                title="تحريك اسم المستفيد 1 مم يميناً"
              >
                ➡️
              </button>
            </div>

            {/* Payee Y Nudge */}
            <div className="flex items-center gap-0.5 bg-slate-100 px-1.5 py-0.5 rounded-lg border border-slate-300 text-[11px]">
              <span className="text-slate-500 font-bold px-0.5">رأسي:</span>
              <button
                type="button"
                onClick={() => {
                  const val = Math.round((payeeOffsetY - 1) * 10) / 10;
                  setPayeeOffsetY(val);
                  saveQuickSettings({ payeeOffsetY: val });
                }}
                className="w-5 h-5 flex items-center justify-center bg-white hover:bg-emerald-100 rounded text-slate-700 font-bold"
                title="تحريك اسم المستفيد 1 مم لأعلى"
              >
                ⬆️
              </button>
              <span className="font-mono font-bold px-1 text-[10px]">
                {payeeOffsetY > 0 ? `+${payeeOffsetY}` : payeeOffsetY} مم
              </span>
              <button
                type="button"
                onClick={() => {
                  const val = Math.round((payeeOffsetY + 1) * 10) / 10;
                  setPayeeOffsetY(val);
                  saveQuickSettings({ payeeOffsetY: val });
                }}
                className="w-5 h-5 flex items-center justify-center bg-white hover:bg-emerald-100 rounded text-slate-700 font-bold"
                title="تحريك اسم المستفيد 1 مم لأسفل"
              >
                ⬇️
              </button>
            </div>

            {/* Payee Width Adjust */}
            <div className="flex items-center gap-0.5 bg-slate-100 px-1.5 py-0.5 rounded-lg border border-slate-300 text-[11px]">
              <span className="text-slate-500 font-bold px-0.5">عرض:</span>
              <button
                type="button"
                onClick={() => {
                  const currentW = payeeWidth;
                  const newW = Math.max(30, currentW - 2);
                  setPayeeWidthOverride(newW);
                  saveQuickSettings({ payeeWidth: newW });
                }}
                className="w-5 h-5 flex items-center justify-center bg-white hover:bg-emerald-100 rounded text-slate-700 font-bold text-xs"
                title="تقليص عرض حقل الاسم 2 مم"
              >
                -
              </button>
              <span className="font-mono font-bold px-1 text-[10px]">{payeeWidth} مم</span>
              <button
                type="button"
                onClick={() => {
                  const currentW = payeeWidth;
                  const newW = currentW + 2;
                  setPayeeWidthOverride(newW);
                  saveQuickSettings({ payeeWidth: newW });
                }}
                className="w-5 h-5 flex items-center justify-center bg-white hover:bg-emerald-100 rounded text-slate-700 font-bold text-xs"
                title="توسيع عرض حقل الاسم 2 مم"
              >
                +
              </button>
            </div>

            {/* Payee Font Size Adjust */}
            <div className="flex items-center gap-0.5 bg-slate-100 px-1.5 py-0.5 rounded-lg border border-slate-300 text-[11px]">
              <span className="text-slate-500 font-bold px-0.5">خط:</span>
              <button
                type="button"
                onClick={() => {
                  const currentF = payeeFontSize;
                  const newF = Math.max(9, currentF - 1);
                  setPayeeFontSizeOverride(newF);
                  saveQuickSettings({ payeeFontSize: newF });
                }}
                className="w-5 h-5 flex items-center justify-center bg-white hover:bg-emerald-100 rounded text-slate-700 font-bold text-xs"
                title="تصغير خط الاسم"
              >
                -A
              </button>
              <span className="font-mono font-bold px-1 text-[10px]">{payeeFontSize}px</span>
              <button
                type="button"
                onClick={() => {
                  const currentF = payeeFontSize;
                  const newF = Math.min(22, currentF + 1);
                  setPayeeFontSizeOverride(newF);
                  saveQuickSettings({ payeeFontSize: newF });
                }}
                className="w-5 h-5 flex items-center justify-center bg-white hover:bg-emerald-100 rounded text-slate-700 font-bold text-xs"
                title="تكبير خط الاسم"
              >
                +A
              </button>
            </div>

            {/* Reset Payee to Default */}
            {(payeeOffsetX !== 0 || payeeOffsetY !== 0 || payeeWidthOverride !== undefined || payeeFontSizeOverride !== undefined) && (
              <button
                type="button"
                onClick={() => {
                  setPayeeOffsetX(0);
                  setPayeeOffsetY(0);
                  setPayeeWidthOverride(undefined);
                  setPayeeFontSizeOverride(undefined);
                  saveQuickSettings({
                    payeeOffsetX: 0,
                    payeeOffsetY: 0,
                    payeeWidth: undefined,
                    payeeFontSize: undefined,
                  });
                }}
                className="text-[10px] font-bold text-amber-700 hover:text-amber-900 bg-amber-50 hover:bg-amber-100 px-2 py-0.5 rounded border border-amber-300 transition"
                title="إعادة ضبط موضع اسم المستفيد للوضع التلقائي للمقاس الحالي"
              >
                تلقائي
              </button>
            )}
          </div>

        </div>

        {/* Cheque Container Scaled to User cm Dimensions */}
        <div className="p-4 sm:p-8 bg-slate-200 flex flex-col items-center justify-center overflow-x-auto print:p-0 print:bg-transparent print:m-0">
          
          <div
            style={
              rotatePreviewOnScreen && (feedOrientation === 'portrait_90' || feedOrientation === 'portrait_270')
                ? {
                    width: `${heightMm}mm`,
                    height: `${widthMm}mm`,
                    position: 'relative',
                    overflow: 'hidden',
                  }
                : {
                    width: `${widthMm}mm`,
                    height: `${heightMm}mm`,
                    maxWidth: '100%',
                    aspectRatio: `${widthMm} / ${heightMm}`,
                    position: 'relative',
                  }
            }
            className="select-none box-border shadow-xl rounded-sm border border-slate-300 print:shadow-none print:border-none print:rounded-none overflow-hidden bg-white cheque-print-exact"
          >
            <div 
              id="cbk-print-wrapper"
              style={{
                width: `${widthMm}mm`,
                height: `${heightMm}mm`,
                position: 'absolute',
                left: 0,
                top: 0,
                transformOrigin: '0 0',
                transform: rotatePreviewOnScreen && feedOrientation === 'portrait_90'
                  ? `translate(0, ${widthMm}mm) rotate(-90deg)`
                  : rotatePreviewOnScreen && feedOrientation === 'portrait_270'
                  ? `translate(${heightMm}mm, 0) rotate(90deg)`
                  : 'none',
              }}
              className="relative w-full h-full select-none box-border overflow-hidden bg-white"
            >

            {/* 1. Scanned Stamp Background Image or Stylized Kuwait Bank Cheque Template */}
            {showScreenBackground && (
              <div className="absolute inset-0 pointer-events-none select-none screen-only-guide z-0">
                {!imgLoadError && stampImageUrl ? (
                  <img
                    src={stampImageUrl}
                    alt={`ستامب شيك ${activeAccount.bankName}`}
                    className="w-full h-full object-fill opacity-95"
                    onError={() => setImgLoadError(true)}
                  />
                ) : (
                  /* Stylized Kuwait Commercial Bank Template (CBK / Standard Kuwait Cheque) */
                  <div className="w-full h-full bg-[#fdfdf9] border-2 border-emerald-900/60 p-3 sm:p-4 flex flex-col justify-between relative overflow-hidden text-slate-900">
                    {/* Background guilloche watermark effect */}
                    <div className="absolute inset-0 opacity-[0.03] pointer-events-none flex items-center justify-center">
                      <span className="text-6xl font-black font-serif tracking-widest text-slate-900 uppercase">STATE OF KUWAIT</span>
                    </div>

                    {/* Cheque Header */}
                    <div className="flex justify-between items-start border-b border-emerald-900/40 pb-2 z-0">
                      <div className="text-right">
                        <div className="flex items-center gap-1.5 text-emerald-950 font-black text-sm">
                          <Landmark className="w-4 h-4 text-emerald-800" />
                          <span>{activeAccount.bankName}</span>
                        </div>
                        <div className="text-[10px] text-slate-600 font-mono font-bold mt-0.5">
                          رقم الحساب: {activeAccount.accountNumber}
                        </div>
                      </div>

                      <div className="text-center">
                        <div className="text-xs font-black text-slate-800 tracking-wider">دولة الكويت &bull; STATE OF KUWAIT</div>
                        <div className="text-[10px] text-emerald-900 font-bold">شيك تجاري معتمد &bull; COMMERCIAL CHEQUE</div>
                      </div>

                      <div className="text-left">
                        <div className="font-mono font-black text-xs text-slate-950 bg-amber-100 px-2 py-0.5 rounded border border-amber-300 inline-block">
                          # {cheque.chequeNumberStr}
                        </div>
                        <div className="text-[9px] text-slate-500 font-mono mt-0.5">
                          {widthCm} × {heightCm} سم
                        </div>
                      </div>
                    </div>

                    {/* Pre-printed Guidelines */}
                    <div className="space-y-3 my-auto text-xs z-0 text-slate-600">
                      <div className="flex items-center justify-between text-[11px] font-bold">
                        <div className="w-32 border-b border-dashed border-slate-400" />
                        <span className="text-slate-500 font-serif">التاريخ / DATE:</span>
                      </div>
                      <div className="flex items-center justify-between text-[11px] font-bold">
                        <div className="flex-1 border-b border-slate-300 ml-4" />
                        <span className="text-slate-700 font-serif font-black">ادفعوا لأمر / PAY TO THE ORDER OF:</span>
                      </div>
                      <div className="flex items-center justify-between text-[11px] font-bold">
                        <div className="flex-1 border-b border-slate-300 ml-4" />
                        <span className="text-slate-700 font-serif font-black">مبلغ وقدره / THE SUM OF:</span>
                      </div>
                    </div>

                    {/* Cheque Bottom Row: Amount Box, Signatures & Magnetic MICR band */}
                    <div className="border-t border-emerald-900/30 pt-2 flex justify-between items-end z-0">
                      <div className="text-right">
                        <div className="text-[10px] text-slate-500 font-serif">توقيع المفوض / AUTHORISED SIGNATURE</div>
                        <div className="w-36 border-b-2 border-slate-700 mt-3" />
                      </div>

                      <div className="text-center font-mono font-black text-[11px] tracking-widest text-slate-800 bg-slate-100 px-3 py-1 rounded border border-slate-300">
                        ⑈ {cheque.chequeNumberStr} ⑈ 020 ⑈ {activeAccount.accountNumber} ⑈ 25
                      </div>

                      <div className="text-left font-serif text-[10px] text-slate-500">
                        <span>دينار كويتي</span>
                        <div className="font-mono font-bold text-xs text-slate-800">KUWAITI DINARS</div>
                      </div>
                    </div>

                  </div>
                )}
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
                justifyContent: dateAlign === 'right' ? 'flex-end' : dateAlign === 'left' ? 'flex-start' : 'center',
              }}
              className="flex items-center font-mono font-black text-slate-950 tracking-wider z-10 overflow-hidden"
            >
              <span 
                style={{ textAlign: dateAlign }}
                className={`select-all print:text-black font-mono font-black truncate max-w-full w-full ${
                  dateAlign === 'right' ? 'text-right' : dateAlign === 'left' ? 'text-left' : 'text-center'
                }`}
              >
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
                justifyContent: payeeAlign === 'right' ? 'flex-start' : payeeAlign === 'left' ? 'flex-end' : 'center',
              }}
              className="flex items-center px-1 z-10 overflow-hidden"
              dir="rtl"
            >
              <span 
                style={{ fontSize: `${payeeFontSize}px`, textAlign: payeeAlign }}
                className={`truncate block w-full select-all print:text-black font-serif font-black ${
                  payeeAlign === 'right' ? 'text-right' : payeeAlign === 'left' ? 'text-left' : 'text-center'
                }`}
              >
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
                justifyContent: wordsAlign === 'right' ? 'flex-start' : wordsAlign === 'left' ? 'flex-end' : 'center',
              }}
              className="flex items-center px-1 z-10 overflow-hidden"
              dir="rtl"
            >
              <span 
                className={`line-clamp-2 break-words block w-full leading-tight select-all print:text-black font-sans font-bold max-h-full overflow-hidden ${
                  wordsAlign === 'right' ? 'text-right' : wordsAlign === 'left' ? 'text-left' : 'text-center'
                }`}
                style={{ lineHeight: 1.25, textAlign: wordsAlign }}
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
                justifyContent: amountAlign === 'right' ? 'flex-end' : amountAlign === 'left' ? 'flex-start' : 'center',
              }}
              className="flex items-center font-mono font-black text-slate-950 tracking-wider z-10 overflow-hidden"
            >
              <span 
                style={{ textAlign: amountAlign }}
                className={`select-all print:text-black font-mono font-black truncate max-w-full w-full ${
                  amountAlign === 'right' ? 'text-right' : amountAlign === 'left' ? 'text-left' : 'text-center'
                }`}
              >
                {formatChequeAmount(cheque.amount)}
              </span>
            </div>

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
        bankAccount={activeAccount}
        settings={{ companyName: companyName || 'شركة أعمالي للخدمات اللوجستية والتجارية' } as any}
      />

    </div>
  );
}
