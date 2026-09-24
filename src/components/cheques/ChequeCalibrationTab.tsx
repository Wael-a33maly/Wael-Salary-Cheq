import React, { useState, useRef, useEffect } from 'react';
import { 
  Sliders, 
  Save, 
  RotateCcw, 
  Move, 
  ArrowUp, 
  ArrowDown, 
  ArrowLeft, 
  ArrowRight, 
  Printer, 
  Check, 
  HelpCircle,
  Calendar,
  User,
  FileText,
  DollarSign,
  Maximize2,
  Grid,
  Type,
  Plus,
  Minus,
  Image as ImageIcon,
  Layers,
  Eye,
  X,
  CheckCircle2,
  FileCheck,
  Sparkles,
  Upload,
  Trash2
} from 'lucide-react';
import { ChequePrintSettings, BankAccount, ChequeSizeTemplate } from '../../types';
import { DEFAULT_PRINT_SETTINGS } from '../../mockCheques';
import { formatChequeAmount } from '../../utils/tafqeetKwd';

interface ChequeCalibrationTabProps {
  printSettings: ChequePrintSettings;
  onUpdatePrintSettings: (settings: ChequePrintSettings) => void;
  bankAccounts?: BankAccount[];
}

type SelectedField = 'all' | 'date' | 'payee' | 'words' | 'amount';
type DragMode = 
  | 'move' 
  | 'resize-t' 
  | 'resize-b' 
  | 'resize-l' 
  | 'resize-r' 
  | 'resize-tl' 
  | 'resize-tr' 
  | 'resize-bl' 
  | 'resize-br' 
  | null;

// Base coordinates on an official 180mm x 90mm cheque (Width 18cm, Height 9cm)
// Derived directly from the physical CBK cheque layout (Right-to-Left Arabic orientation)
export const CBK_CHEQUE_BASE_COORDS = {
  date: { left: 134, top: 12, width: 36, height: 8.5, fontSize: 12 },
  payee: { left: 16, top: 29, width: 120, height: 8.5, fontSize: 13 },
  words: { left: 54, top: 41, width: 84, height: 9.5, fontSize: 11 },
  amount: { left: 10, top: 38, width: 42, height: 12.5, fontSize: 14 },
};

export function ChequeCalibrationTab({
  printSettings,
  onUpdatePrintSettings,
  bankAccounts,
}: ChequeCalibrationTabProps) {
  const [selectedAccountId, setSelectedAccountId] = useState<string>(bankAccounts?.[0]?.id || '');
  const activeAccount = bankAccounts?.find((a) => a.id === selectedAccountId) || bankAccounts?.[0];
  const templates: ChequeSizeTemplate[] = activeAccount?.chequeTemplates && activeAccount.chequeTemplates.length > 0
    ? activeAccount.chequeTemplates
    : [
        {
          id: `tpl-${activeAccount?.id || 'std'}-std`,
          name: `المقاس المعتمد (${activeAccount?.chequeWidthCm || 18.0} × ${activeAccount?.chequeHeightCm || 9.0} سم)`,
          widthCm: activeAccount?.chequeWidthCm || 18.0,
          heightCm: activeAccount?.chequeHeightCm || 9.0,
          chequeImageUrl: activeAccount?.chequeImageUrl,
          chequeImageName: activeAccount?.chequeImageName,
          isDefault: true,
        }
      ];

  const [selectedTemplateId, setSelectedTemplateId] = useState<string>(
    activeAccount?.activeTemplateId || templates[0]?.id || ''
  );

  useEffect(() => {
    if (activeAccount) {
      const accTemplates = activeAccount.chequeTemplates && activeAccount.chequeTemplates.length > 0
        ? activeAccount.chequeTemplates
        : [
            {
              id: `tpl-${activeAccount.id}-std`,
              name: `المقاس المعتمد (${activeAccount.chequeWidthCm || 18.0} × ${activeAccount.chequeHeightCm || 9.0} سم)`,
              widthCm: activeAccount.chequeWidthCm || 18.0,
              heightCm: activeAccount.chequeHeightCm || 9.0,
              chequeImageUrl: activeAccount.chequeImageUrl,
              chequeImageName: activeAccount.chequeImageName,
              isDefault: true,
            }
          ];
      setSelectedTemplateId(activeAccount.activeTemplateId || accTemplates[0]?.id || '');
    }
  }, [selectedAccountId, activeAccount]);

  const activeTemplate = templates.find((t) => t.id === selectedTemplateId) || templates[0];
  const calibWidthCm = activeTemplate?.widthCm || activeAccount?.chequeWidthCm || 18.0;
  const calibHeightCm = activeTemplate?.heightCm || activeAccount?.chequeHeightCm || 9.0;
  const calibWidthMm = Math.round(calibWidthCm * 10);
  const calibHeightMm = Math.round(calibHeightCm * 10);
  const calibChequeImage = activeTemplate?.chequeImageUrl || activeAccount?.chequeImageUrl || printSettings.customChequeImageUrl || '/cbk_cheque_bg.jpg';

  const [calibration, setCalibration] = useState<ChequePrintSettings>(printSettings);
  const [selectedField, setSelectedField] = useState<SelectedField>('payee');
  const [stepSize, setStepSize] = useState<number>(0.5); // mm
  const [showRuler, setShowRuler] = useState<boolean>(true);
  const [showGrid, setShowGrid] = useState<boolean>(true); // default true for calibration visibility
  const [zoomLevel, setZoomLevel] = useState<number>(100); // 100% or 125%
  const [savedSuccess, setSavedSuccess] = useState(false);
  
  // Background display options: Real Scanned Cheque Image vs Vector
  const [bgViewMode, setBgViewMode] = useState<'scanned' | 'vector'>('scanned');
  const [bgOpacity, setBgOpacity] = useState<number>(100); // 100%, 85%, 65%

  // Test Print modal & settings
  const [isTestPrintModalOpen, setIsTestPrintModalOpen] = useState(false);
  const [testPrintMode, setTestPrintMode] = useState<'a4_alignment' | 'real_cheque_text_only' | 'with_bg'>('a4_alignment');
  const [testChequeData, setTestChequeData] = useState({
    date: '25/04/2026',
    payee: 'شركة البادية للمقاولات والتجارة العامة ذ.م.م',
    amount: 3500.0,
    words: 'فقط ثلاثة آلاف وخمسمائة دينار كويتي لا غير #',
  });

  // Sync if props change externally
  useEffect(() => {
    setCalibration(printSettings);
  }, [printSettings]);

  // Clean up printing class on window afterprint
  useEffect(() => {
    const handleAfterPrint = () => {
      document.body.classList.remove('printing-cheque-mode');
    };
    window.addEventListener('afterprint', handleAfterPrint);
    return () => window.removeEventListener('afterprint', handleAfterPrint);
  }, []);

  const handleTriggerPrint = () => {
    document.body.classList.add('printing-cheque-mode');
    setTimeout(() => {
      window.print();
      setTimeout(() => {
        document.body.classList.remove('printing-cheque-mode');
      }, 1000);
    }, 200);
  };

  // Dragging and Resizing state
  const [dragMode, setDragMode] = useState<DragMode>(null);
  const [draggingField, setDraggingField] = useState<SelectedField | null>(null);
  const dragStartRef = useRef<{
    startX: number;
    startY: number;
    initX: number;
    initY: number;
    initW: number;
    initH: number;
  }>({
    startX: 0,
    startY: 0,
    initX: 0,
    initY: 0,
    initW: 0,
    initH: 0,
  });

  const canvasRef = useRef<HTMLDivElement>(null);

  // Calculate actual coordinates (in mm)
  const dateLeft = Math.round((CBK_CHEQUE_BASE_COORDS.date.left + (calibration.offsetX || 0) + (calibration.dateOffsetX || 0)) * 10) / 10;
  const dateTop = Math.round((CBK_CHEQUE_BASE_COORDS.date.top + (calibration.offsetY || 0) + (calibration.dateOffsetY || 0)) * 10) / 10;
  const dateWidth = Math.round((calibration.dateWidth ?? CBK_CHEQUE_BASE_COORDS.date.width) * 10) / 10;
  const dateHeight = Math.round((calibration.dateHeight ?? CBK_CHEQUE_BASE_COORDS.date.height) * 10) / 10;
  const dateFontSize = calibration.dateFontSize ?? CBK_CHEQUE_BASE_COORDS.date.fontSize;

  const payeeLeft = Math.round((CBK_CHEQUE_BASE_COORDS.payee.left + (calibration.offsetX || 0) + (calibration.payeeOffsetX || 0)) * 10) / 10;
  const payeeTop = Math.round((CBK_CHEQUE_BASE_COORDS.payee.top + (calibration.offsetY || 0) + (calibration.payeeOffsetY || 0)) * 10) / 10;
  const payeeWidth = Math.round((calibration.payeeWidth ?? CBK_CHEQUE_BASE_COORDS.payee.width) * 10) / 10;
  const payeeHeight = Math.round((calibration.payeeHeight ?? CBK_CHEQUE_BASE_COORDS.payee.height) * 10) / 10;
  const payeeFontSize = calibration.payeeFontSize ?? CBK_CHEQUE_BASE_COORDS.payee.fontSize;

  const wordsLeft = Math.round((CBK_CHEQUE_BASE_COORDS.words.left + (calibration.offsetX || 0) + (calibration.wordsOffsetX || 0)) * 10) / 10;
  const wordsTop = Math.round((CBK_CHEQUE_BASE_COORDS.words.top + (calibration.offsetY || 0) + (calibration.wordsOffsetY || 0)) * 10) / 10;
  const wordsWidth = Math.round((calibration.wordsWidth ?? CBK_CHEQUE_BASE_COORDS.words.width) * 10) / 10;
  const wordsHeight = Math.round((calibration.wordsHeight ?? CBK_CHEQUE_BASE_COORDS.words.height) * 10) / 10;
  const wordsFontSize = calibration.wordsFontSize ?? CBK_CHEQUE_BASE_COORDS.words.fontSize;

  const amountLeft = Math.round((CBK_CHEQUE_BASE_COORDS.amount.left + (calibration.offsetX || 0) + (calibration.amountOffsetX || 0)) * 10) / 10;
  const amountTop = Math.round((CBK_CHEQUE_BASE_COORDS.amount.top + (calibration.offsetY || 0) + (calibration.amountOffsetY || 0)) * 10) / 10;
  const amountWidth = Math.round((calibration.amountWidth ?? CBK_CHEQUE_BASE_COORDS.amount.width) * 10) / 10;
  const amountHeight = Math.round((calibration.amountHeight ?? CBK_CHEQUE_BASE_COORDS.amount.height) * 10) / 10;
  const amountFontSize = calibration.amountFontSize ?? CBK_CHEQUE_BASE_COORDS.amount.fontSize;

  // Move handler using D-Pad
  const handleNudge = (dx: number, dy: number) => {
    setCalibration((prev) => {
      const next = { ...prev };
      if (selectedField === 'all') {
        next.offsetX = Math.round(((next.offsetX || 0) + dx) * 10) / 10;
        next.offsetY = Math.round(((next.offsetY || 0) + dy) * 10) / 10;
      } else if (selectedField === 'date') {
        next.dateOffsetX = Math.round(((next.dateOffsetX || 0) + dx) * 10) / 10;
        next.dateOffsetY = Math.round(((next.dateOffsetY || 0) + dy) * 10) / 10;
      } else if (selectedField === 'payee') {
        next.payeeOffsetX = Math.round(((next.payeeOffsetX || 0) + dx) * 10) / 10;
        next.payeeOffsetY = Math.round(((next.payeeOffsetY || 0) + dy) * 10) / 10;
      } else if (selectedField === 'words') {
        next.wordsOffsetX = Math.round(((next.wordsOffsetX || 0) + dx) * 10) / 10;
        next.wordsOffsetY = Math.round(((next.wordsOffsetY || 0) + dy) * 10) / 10;
      } else if (selectedField === 'amount') {
        next.amountOffsetX = Math.round(((next.amountOffsetX || 0) + dx) * 10) / 10;
        next.amountOffsetY = Math.round(((next.amountOffsetY || 0) + dy) * 10) / 10;
      }
      return next;
    });
  };

  // Dimension adjust handler (width / height)
  const handleAdjustDimension = (field: SelectedField, dWidth: number, dHeight: number) => {
    setCalibration((prev) => {
      const next = { ...prev };
      if (field === 'date') {
        const curW = next.dateWidth ?? CBK_CHEQUE_BASE_COORDS.date.width;
        const curH = next.dateHeight ?? CBK_CHEQUE_BASE_COORDS.date.height;
        next.dateWidth = Math.max(10, Math.round((curW + dWidth) * 10) / 10);
        next.dateHeight = Math.max(4, Math.round((curH + dHeight) * 10) / 10);
      } else if (field === 'payee') {
        const curW = next.payeeWidth ?? CBK_CHEQUE_BASE_COORDS.payee.width;
        const curH = next.payeeHeight ?? CBK_CHEQUE_BASE_COORDS.payee.height;
        next.payeeWidth = Math.max(20, Math.round((curW + dWidth) * 10) / 10);
        next.payeeHeight = Math.max(4, Math.round((curH + dHeight) * 10) / 10);
      } else if (field === 'words') {
        const curW = next.wordsWidth ?? CBK_CHEQUE_BASE_COORDS.words.width;
        const curH = next.wordsHeight ?? CBK_CHEQUE_BASE_COORDS.words.height;
        next.wordsWidth = Math.max(20, Math.round((curW + dWidth) * 10) / 10);
        next.wordsHeight = Math.max(5, Math.round((curH + dHeight) * 10) / 10);
      } else if (field === 'amount') {
        const curW = next.amountWidth ?? CBK_CHEQUE_BASE_COORDS.amount.width;
        const curH = next.amountHeight ?? CBK_CHEQUE_BASE_COORDS.amount.height;
        next.amountWidth = Math.max(15, Math.round((curW + dWidth) * 10) / 10);
        next.amountHeight = Math.max(5, Math.round((curH + dHeight) * 10) / 10);
      }
      return next;
    });
  };

  // Font size adjust handler
  const handleAdjustFontSize = (field: SelectedField, delta: number) => {
    setCalibration((prev) => {
      const next = { ...prev };
      if (field === 'date') {
        const cur = next.dateFontSize ?? CBK_CHEQUE_BASE_COORDS.date.fontSize;
        next.dateFontSize = Math.max(8, Math.min(22, cur + delta));
      } else if (field === 'payee') {
        const cur = next.payeeFontSize ?? CBK_CHEQUE_BASE_COORDS.payee.fontSize;
        next.payeeFontSize = Math.max(8, Math.min(22, cur + delta));
      } else if (field === 'words') {
        const cur = next.wordsFontSize ?? CBK_CHEQUE_BASE_COORDS.words.fontSize;
        next.wordsFontSize = Math.max(8, Math.min(20, cur + delta));
      } else if (field === 'amount') {
        const cur = next.amountFontSize ?? CBK_CHEQUE_BASE_COORDS.amount.fontSize;
        next.amountFontSize = Math.max(9, Math.min(26, cur + delta));
      }
      return next;
    });
  };

  // Start dragging a field or handle directly on the cheque canvas
  const handlePointerDown = (field: SelectedField, mode: DragMode, e: React.PointerEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setSelectedField(field);
    setDragMode(mode);
    setDraggingField(field);

    let initX = 0;
    let initY = 0;
    let initW = 0;
    let initH = 0;

    if (field === 'date') {
      initX = calibration.dateOffsetX || 0;
      initY = calibration.dateOffsetY || 0;
      initW = calibration.dateWidth ?? CBK_CHEQUE_BASE_COORDS.date.width;
      initH = calibration.dateHeight ?? CBK_CHEQUE_BASE_COORDS.date.height;
    } else if (field === 'payee') {
      initX = calibration.payeeOffsetX || 0;
      initY = calibration.payeeOffsetY || 0;
      initW = calibration.payeeWidth ?? CBK_CHEQUE_BASE_COORDS.payee.width;
      initH = calibration.payeeHeight ?? CBK_CHEQUE_BASE_COORDS.payee.height;
    } else if (field === 'words') {
      initX = calibration.wordsOffsetX || 0;
      initY = calibration.wordsOffsetY || 0;
      initW = calibration.wordsWidth ?? CBK_CHEQUE_BASE_COORDS.words.width;
      initH = calibration.wordsHeight ?? CBK_CHEQUE_BASE_COORDS.words.height;
    } else if (field === 'amount') {
      initX = calibration.amountOffsetX || 0;
      initY = calibration.amountOffsetY || 0;
      initW = calibration.amountWidth ?? CBK_CHEQUE_BASE_COORDS.amount.width;
      initH = calibration.amountHeight ?? CBK_CHEQUE_BASE_COORDS.amount.height;
    } else if (field === 'all') {
      initX = calibration.offsetX || 0;
      initY = calibration.offsetY || 0;
    }

    dragStartRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      initX,
      initY,
      initW,
      initH,
    };

    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!draggingField || !dragMode || !canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;

    // Direct conversion: 180mm width maps to container rect.width
    const deltaX_mm = ((e.clientX - dragStartRef.current.startX) / rect.width) * 180;
    const deltaY_mm = ((e.clientY - dragStartRef.current.startY) / rect.height) * 90;

    setCalibration((prev) => {
      const next = { ...prev };
      const { initX, initY, initW, initH } = dragStartRef.current;

      if (dragMode === 'move') {
        const newX = Math.round((initX + deltaX_mm) * 10) / 10;
        const newY = Math.round((initY + deltaY_mm) * 10) / 10;

        if (draggingField === 'date') {
          next.dateOffsetX = newX;
          next.dateOffsetY = newY;
        } else if (draggingField === 'payee') {
          next.payeeOffsetX = newX;
          next.payeeOffsetY = newY;
        } else if (draggingField === 'words') {
          next.wordsOffsetX = newX;
          next.wordsOffsetY = newY;
        } else if (draggingField === 'amount') {
          next.amountOffsetX = newX;
          next.amountOffsetY = newY;
        } else if (draggingField === 'all') {
          next.offsetX = newX;
          next.offsetY = newY;
        }
      } else {
        // Resizing from edges or corners
        let newW = initW;
        let newH = initH;
        let newX = initX;
        let newY = initY;

        // Width calculations
        if (dragMode === 'resize-r' || dragMode === 'resize-br' || dragMode === 'resize-tr') {
          newW = Math.max(10, Math.round((initW + deltaX_mm) * 10) / 10);
        } else if (dragMode === 'resize-l' || dragMode === 'resize-bl' || dragMode === 'resize-tl') {
          const calcW = Math.round((initW - deltaX_mm) * 10) / 10;
          if (calcW >= 10) {
            newW = calcW;
            newX = Math.round((initX + deltaX_mm) * 10) / 10;
          }
        }

        // Height calculations
        if (dragMode === 'resize-b' || dragMode === 'resize-br' || dragMode === 'resize-bl') {
          newH = Math.max(4, Math.round((initH + deltaY_mm) * 10) / 10);
        } else if (dragMode === 'resize-t' || dragMode === 'resize-tr' || dragMode === 'resize-tl') {
          const calcH = Math.round((initH - deltaY_mm) * 10) / 10;
          if (calcH >= 4) {
            newH = calcH;
            newY = Math.round((initY + deltaY_mm) * 10) / 10;
          }
        }

        // Apply to targeted field
        if (draggingField === 'date') {
          next.dateWidth = newW;
          next.dateHeight = newH;
          next.dateOffsetX = newX;
          next.dateOffsetY = newY;
        } else if (draggingField === 'payee') {
          next.payeeWidth = newW;
          next.payeeHeight = newH;
          next.payeeOffsetX = newX;
          next.payeeOffsetY = newY;
        } else if (draggingField === 'words') {
          next.wordsWidth = newW;
          next.wordsHeight = newH;
          next.wordsOffsetX = newX;
          next.wordsOffsetY = newY;
        } else if (draggingField === 'amount') {
          next.amountWidth = newW;
          next.amountHeight = newH;
          next.amountOffsetX = newX;
          next.amountOffsetY = newY;
        }
      }

      return next;
    });
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (draggingField) {
      setDraggingField(null);
      setDragMode(null);
      try {
        (e.target as HTMLElement).releasePointerCapture(e.pointerId);
      } catch {
        // Safe ignore
      }
    }
  };

  // Helper to render edge and corner resize handles for direct resizing from all sides
  const renderResizeHandles = (field: SelectedField, accentClass: string) => {
    if (selectedField !== field) return null;
    return (
      <>
        {/* 1. Top Edge Handle (اسحب الحافة العلوية) */}
        <div
          onPointerDown={(e) => handlePointerDown(field, 'resize-t', e)}
          className="absolute -top-1.5 left-2 right-2 h-3.5 cursor-ns-resize z-30 flex items-center justify-center group"
          title="اسحب الحافة العلوية لتغيير الارتفاع"
        >
          <div className={`w-8 h-1 rounded-full ${accentClass} opacity-80 group-hover:opacity-100 group-hover:h-1.5 transition-all shadow-xs`} />
        </div>

        {/* 2. Bottom Edge Handle (اسحب الحافة السفلية) */}
        <div
          onPointerDown={(e) => handlePointerDown(field, 'resize-b', e)}
          className="absolute -bottom-1.5 left-2 right-2 h-3.5 cursor-ns-resize z-30 flex items-center justify-center group"
          title="اسحب الحافة السفلية لتغيير الارتفاع"
        >
          <div className={`w-8 h-1 rounded-full ${accentClass} opacity-80 group-hover:opacity-100 group-hover:h-1.5 transition-all shadow-xs`} />
        </div>

        {/* 3. Left Edge Handle (اسحب الحافة اليسرى) */}
        <div
          onPointerDown={(e) => handlePointerDown(field, 'resize-l', e)}
          className="absolute top-2 bottom-2 -left-1.5 w-3.5 cursor-ew-resize z-30 flex items-center justify-center group"
          title="اسحب الحافة اليسرى لتغيير العرض"
        >
          <div className={`h-6 w-1 rounded-full ${accentClass} opacity-80 group-hover:opacity-100 group-hover:w-1.5 transition-all shadow-xs`} />
        </div>

        {/* 4. Right Edge Handle (اسحب الحافة اليمنى) */}
        <div
          onPointerDown={(e) => handlePointerDown(field, 'resize-r', e)}
          className="absolute top-2 bottom-2 -right-1.5 w-3.5 cursor-ew-resize z-30 flex items-center justify-center group"
          title="اسحب الحافة اليمنى لتغيير العرض"
        >
          <div className={`h-6 w-1 rounded-full ${accentClass} opacity-80 group-hover:opacity-100 group-hover:w-1.5 transition-all shadow-xs`} />
        </div>

        {/* 5. Top-Left Corner (الزاوية العلوية اليسرى) */}
        <div
          onPointerDown={(e) => handlePointerDown(field, 'resize-tl', e)}
          className={`absolute -top-1.5 -left-1.5 w-3.5 h-3.5 ${accentClass} border-2 border-white rounded-xs cursor-nwse-resize z-35 shadow-xs`}
          title="اسحب الزاوية لتعديل الأبعاد"
        />

        {/* 6. Top-Right Corner (الزاوية العلوية اليمنى) */}
        <div
          onPointerDown={(e) => handlePointerDown(field, 'resize-tr', e)}
          className={`absolute -top-1.5 -right-1.5 w-3.5 h-3.5 ${accentClass} border-2 border-white rounded-xs cursor-nesw-resize z-35 shadow-xs`}
          title="اسحب الزاوية لتعديل الأبعاد"
        />

        {/* 7. Bottom-Left Corner (الزاوية السفلية اليسرى) */}
        <div
          onPointerDown={(e) => handlePointerDown(field, 'resize-bl', e)}
          className={`absolute -bottom-1.5 -left-1.5 w-3.5 h-3.5 ${accentClass} border-2 border-white rounded-xs cursor-nesw-resize z-35 shadow-xs`}
          title="اسحب الزاوية لتعديل الأبعاد"
        />

        {/* 8. Bottom-Right Corner (الزاوية السفلية اليمنى) */}
        <div
          onPointerDown={(e) => handlePointerDown(field, 'resize-br', e)}
          className={`absolute -bottom-1.5 -right-1.5 w-3.5 h-3.5 ${accentClass} border-2 border-white rounded-xs cursor-nwse-resize z-35 shadow-xs`}
          title="اسحب الزاوية لتعديل الأبعاد"
        />
      </>
    );
  };

  // Save settings permanently
  const handleSave = () => {
    const finalSettings: ChequePrintSettings = {
      ...calibration,
      templateMode: 'vector_template',
      defaultCrossing: false,
      defaultBearerCrossing: false,
    };
    onUpdatePrintSettings(finalSettings);
    try {
      localStorage.setItem('app_cheque_print_settings', JSON.stringify(finalSettings));
    } catch (e) {
      console.error(e);
    }
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  // Reset to default coordinates
  const handleReset = () => {
    if (confirm('هل أنت متأكد من إعادة ضبط كافة أبعاد ومواقع حقول الشيك إلى القيم الافتراضية الأصلية؟')) {
      const resetSettings: ChequePrintSettings = {
        ...DEFAULT_PRINT_SETTINGS,
        templateMode: 'vector_template',
        defaultCrossing: false,
        defaultBearerCrossing: false,
        offsetX: 0,
        offsetY: 0,
        dateOffsetX: 0,
        dateOffsetY: 0,
        payeeOffsetX: 0,
        payeeOffsetY: 0,
        wordsOffsetX: 0,
        wordsOffsetY: 0,
        amountOffsetX: 0,
        amountOffsetY: 0,
        dateWidth: CBK_CHEQUE_BASE_COORDS.date.width,
        dateHeight: CBK_CHEQUE_BASE_COORDS.date.height,
        payeeWidth: CBK_CHEQUE_BASE_COORDS.payee.width,
        payeeHeight: CBK_CHEQUE_BASE_COORDS.payee.height,
        wordsWidth: CBK_CHEQUE_BASE_COORDS.words.width,
        wordsHeight: CBK_CHEQUE_BASE_COORDS.words.height,
        amountWidth: CBK_CHEQUE_BASE_COORDS.amount.width,
        amountHeight: CBK_CHEQUE_BASE_COORDS.amount.height,
        dateFontSize: CBK_CHEQUE_BASE_COORDS.date.fontSize,
        payeeFontSize: CBK_CHEQUE_BASE_COORDS.payee.fontSize,
        wordsFontSize: CBK_CHEQUE_BASE_COORDS.words.fontSize,
        amountFontSize: CBK_CHEQUE_BASE_COORDS.amount.fontSize,
      };
      setCalibration(resetSettings);
      onUpdatePrintSettings(resetSettings);
      try {
        localStorage.setItem('app_cheque_print_settings', JSON.stringify(resetSettings));
      } catch (e) {
        console.error(e);
      }
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    }
  };

  // Selected Field Inspector data
  const getFieldInfo = (field: SelectedField) => {
    switch (field) {
      case 'date':
        return {
          title: 'حقل التاريخ',
          x: dateLeft,
          y: dateTop,
          w: dateWidth,
          h: dateHeight,
          font: dateFontSize,
          offsetX: calibration.dateOffsetX || 0,
          offsetY: calibration.dateOffsetY || 0,
        };
      case 'payee':
        return {
          title: 'حقل اسم المستفيد',
          x: payeeLeft,
          y: payeeTop,
          w: payeeWidth,
          h: payeeHeight,
          font: payeeFontSize,
          offsetX: calibration.payeeOffsetX || 0,
          offsetY: calibration.payeeOffsetY || 0,
        };
      case 'words':
        return {
          title: 'حقل المبلغ كتابة (التفقيط)',
          x: wordsLeft,
          y: wordsTop,
          w: wordsWidth,
          h: wordsHeight,
          font: wordsFontSize,
          offsetX: calibration.wordsOffsetX || 0,
          offsetY: calibration.wordsOffsetY || 0,
        };
      case 'amount':
        return {
          title: 'حقل المبلغ بالأرقام',
          x: amountLeft,
          y: amountTop,
          w: amountWidth,
          h: amountHeight,
          font: amountFontSize,
          offsetX: calibration.amountOffsetX || 0,
          offsetY: calibration.amountOffsetY || 0,
        };
      case 'all':
      default:
        return {
          title: 'الشيك بالكامل (إزاحة عامة لكافة الحقول)',
          x: calibration.offsetX || 0,
          y: calibration.offsetY || 0,
          w: 180,
          h: 90,
          font: 0,
          offsetX: calibration.offsetX || 0,
          offsetY: calibration.offsetY || 0,
        };
    }
  };

  const currentFieldInfo = getFieldInfo(selectedField);

  // Percentage conversion helpers for dynamic canvas dimensions
  const toLeftPct = (mm: number) => (mm / calibWidthMm) * 100;
  const toTopPct = (mm: number) => (mm / calibHeightMm) * 100;
  const toWidthPct = (mm: number) => (mm / calibWidthMm) * 100;
  const toHeightPct = (mm: number) => (mm / calibHeightMm) * 100;

  return (
    <div className="space-y-6 pb-12">
      {/* Header Banner */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-amber-600 flex items-center justify-center text-white shadow-md flex-shrink-0">
            <Sliders className="w-6 h-6" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg font-black text-slate-900">
                معايرة مقاسات وأبعاد حقول الشيك ({calibWidthCm}cm × {calibHeightCm}cm)
              </h2>
              <span className="bg-emerald-100 text-emerald-800 text-[11px] font-black px-2.5 py-0.5 rounded-full border border-emerald-300">
                {calibWidthMm}mm × {calibHeightMm}mm دقة مليمترية
              </span>
              <span className="bg-amber-100 text-amber-900 text-[11px] font-bold px-2 py-0.5 rounded border border-amber-300">
                {activeAccount?.bankName || 'البنك التجاري CBK'}
              </span>
              {activeTemplate && (
                <span className="bg-blue-100 text-blue-900 text-[11px] font-bold px-2 py-0.5 rounded border border-blue-300">
                  {activeTemplate.name}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-600 mt-1 max-w-2xl leading-relaxed">
              يمكنك سحب وإفلات أي حقل لضبط موقعه، أو سحب مقابض الزوايا لتغيير أبعاد العرض والارتفاع بدقة مليمترية، أو استخدام لوحة التحكم الجانبية.
              بعد الحفظ، ستتم طباعة أي شيك مباشرة على الطابعة وفق هذه المقاسات بدون أي إعدادات.
            </p>

            {/* Bank and Template Quick Selectors if multiple exist */}
            {bankAccounts && bankAccounts.length > 0 && (
              <div className="flex flex-wrap items-center gap-3 mt-3 pt-3 border-t border-slate-100">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-slate-600">الحساب البنكي:</span>
                  <select
                    value={selectedAccountId}
                    onChange={(e) => setSelectedAccountId(e.target.value)}
                    className="text-xs font-bold bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1 text-slate-800"
                  >
                    {bankAccounts.map((acc) => (
                      <option key={acc.id} value={acc.id}>
                        {acc.bankName} - {acc.accountName}
                      </option>
                    ))}
                  </select>
                </div>

                {templates.length > 1 && (
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-slate-600">القالب / المقاس:</span>
                    <select
                      value={selectedTemplateId}
                      onChange={(e) => setSelectedTemplateId(e.target.value)}
                      className="text-xs font-bold bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1 text-slate-800"
                    >
                      {templates.map((tpl) => (
                        <option key={tpl.id} value={tpl.id}>
                          {tpl.name} ({tpl.widthCm}×{tpl.heightCm} سم)
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5 flex-shrink-0">
          <button
            type="button"
            onClick={handleReset}
            className="flex items-center gap-1.5 px-3.5 py-2 text-slate-700 bg-slate-100 hover:bg-slate-200 font-bold rounded-xl text-xs transition border border-slate-300"
            title="استعادة الإحداثيات والأبعاد الافتراضية"
          >
            <RotateCcw className="w-4 h-4 text-slate-500" />
            <span>استعادة الافتراضي</span>
          </button>

          <button
            type="button"
            onClick={() => setIsTestPrintModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 text-blue-700 bg-blue-50 hover:bg-blue-100 font-bold rounded-xl text-xs transition border border-blue-200 shadow-xs"
            title="تجربة الطباعة على ورقة بيضاء A4 أو ورقة بمقاس الشيك"
          >
            <Printer className="w-4 h-4 text-blue-600" />
            <span>طباعة تجريبية للمعايرة</span>
          </button>

          <button
            type="button"
            onClick={handleSave}
            className="flex items-center gap-2 px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-black rounded-xl text-xs shadow-md transition transform active:scale-95"
          >
            {savedSuccess ? (
              <>
                <Check className="w-4 h-4" />
                <span>تم الحفظ بنجاح!</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>حفظ إعدادات المعايرة</span>
              </>
            )}
          </button>
        </div>
      </div>

      {savedSuccess && (
        <div className="bg-emerald-50 border border-emerald-300 text-emerald-900 px-4 py-3 rounded-xl text-xs font-bold flex items-center justify-between animate-fade-in shadow-xs">
          <div className="flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <span>تم حفظ أبعاد ومواقع حقول الشيك بنجاح. أي شيك يُطبع من الآن فصاعداً سيعتمد هذه الإحداثيات تلقائياً وبشكل مباشر!</span>
          </div>
          <button onClick={() => setSavedSuccess(false)} className="text-emerald-700 hover:text-emerald-950 font-black">✕</button>
        </div>
      )}

      {/* Main Studio Grid: Cheque Canvas + Interactive Toolpad */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        
        {/* Cheque Vector Canvas Display (Col 8) */}
        <div className="xl:col-span-8 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          
          {/* Canvas Controls Toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                <Move className="w-4 h-4 text-amber-600" />
                <span>منطقة السحب والإفلات وتغيير المقاسات</span>
              </span>
              <span className="text-[11px] text-slate-500 font-mono">
                (180mm × 90mm)
              </span>
            </div>

            {/* View options: Background mode, Opacity, Ruler, Grid, Zoom */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Background Source Selector */}
              <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-[11px]">
                <button
                  type="button"
                  onClick={() => setBgViewMode('scanned')}
                  className={`px-2.5 py-1 rounded font-bold transition flex items-center gap-1.5 ${
                    bgViewMode === 'scanned'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'text-slate-700 hover:bg-slate-200'
                  }`}
                  title="صورة الشيك الفعلية (الأصلية أو المرفوعة 18cm × 9cm)"
                >
                  <ImageIcon className="w-3.5 h-3.5" />
                  <span>{calibration.customChequeImageUrl ? 'صورة الشيك المرفوعة' : 'صورة الشيك الأصلية (CBK)'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setBgViewMode('vector')}
                  className={`px-2.5 py-1 rounded font-bold transition flex items-center gap-1.5 ${
                    bgViewMode === 'vector'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'text-slate-700 hover:bg-slate-200'
                  }`}
                  title="قالب تخطيطي هندسي"
                >
                  <Layers className="w-3.5 h-3.5" />
                  <span>قالب هندسي</span>
                </button>
              </div>

              {/* Upload image button in calibration toolbar */}
              <div className="flex items-center gap-1">
                <input
                  type="file"
                  id="calibration-upload-cheque-input"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    const reader = new FileReader();
                    reader.onload = (event) => {
                      const dataUrl = event.target?.result as string;
                      if (dataUrl) {
                        const updated: ChequePrintSettings = {
                          ...calibration,
                          customChequeImageUrl: dataUrl,
                          customChequeImageName: file.name,
                        };
                        setCalibration(updated);
                        onUpdatePrintSettings(updated);
                        setBgViewMode('scanned');
                      }
                    };
                    reader.readAsDataURL(file);
                    if (e.target) e.target.value = '';
                  }}
                />
                <button
                  type="button"
                  onClick={() => document.getElementById('calibration-upload-cheque-input')?.click()}
                  className="px-2.5 py-1 rounded-lg text-xs font-bold border border-blue-300 bg-blue-50 text-blue-800 hover:bg-blue-100 transition flex items-center gap-1.5"
                  title="رفع صورة شيك مخصصة وضبطها تلقائياً لمقاس 9*18 سم"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>رفع صورة الشيك (9×18 سم)</span>
                </button>

                {calibration.customChequeImageUrl && (
                  <button
                    type="button"
                    onClick={() => {
                      const updated: ChequePrintSettings = {
                        ...calibration,
                        customChequeImageUrl: undefined,
                        customChequeImageName: undefined,
                      };
                      setCalibration(updated);
                      onUpdatePrintSettings(updated);
                    }}
                    className="p-1 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 border border-slate-200 transition"
                    title="استعادة صورة الشيك الأصلية الافتراضية"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Opacity Control for Background Image */}
              {bgViewMode === 'scanned' && (
                <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 px-2 py-0.5 rounded-lg text-[10px]">
                  <span className="text-slate-500 font-medium">الوضوح:</span>
                  {[100, 80, 55].map((op) => (
                    <button
                      key={op}
                      type="button"
                      onClick={() => setBgOpacity(op)}
                      className={`px-1.5 py-0.5 rounded font-mono font-bold transition ${
                        bgOpacity === op ? 'bg-blue-600 text-white shadow-2xs' : 'text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {op}%
                    </button>
                  ))}
                </div>
              )}

              {/* Ruler Toggle */}
              <button
                type="button"
                onClick={() => setShowRuler(!showRuler)}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition flex items-center gap-1.5 ${
                  showRuler
                    ? 'bg-amber-50 text-amber-800 border-amber-300'
                    : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                }`}
                title="إظهار / إخفاء المسطرة المليمترية"
              >
                <span>المسطرة</span>
              </button>

              {/* Grid Toggle */}
              <button
                type="button"
                onClick={() => setShowGrid(!showGrid)}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition flex items-center gap-1.5 ${
                  showGrid
                    ? 'bg-blue-50 text-blue-800 border-blue-400 ring-1 ring-blue-300 shadow-2xs'
                    : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                }`}
                title="إظهار / إخفاء شبكة المعايرة المليمترية (10mm × 10mm)"
              >
                <Grid className="w-3.5 h-3.5" />
                <span>الشبكة المليمترية</span>
              </button>

              {/* Zoom Controls */}
              <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-[11px]">
                <button
                  type="button"
                  onClick={() => setZoomLevel(100)}
                  className={`px-2 py-0.5 rounded font-bold transition ${
                    zoomLevel === 100 ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600'
                  }`}
                >
                  100%
                </button>
                <button
                  type="button"
                  onClick={() => setZoomLevel(125)}
                  className={`px-2 py-0.5 rounded font-bold transition ${
                    zoomLevel === 125 ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600'
                  }`}
                >
                  125%
                </button>
              </div>
            </div>
          </div>

          {/* Workbench Area with Millimeter Ruler & Scaled Cheque Canvas */}
          <div className="bg-slate-100 p-3 sm:p-5 rounded-xl overflow-x-auto flex flex-col items-center justify-center border border-slate-200 min-h-[380px]">
            
            <div 
              style={{
                width: zoomLevel === 125 ? '880px' : '100%',
                maxWidth: zoomLevel === 125 ? '880px' : '740px',
                transition: 'width 0.2s ease',
              }}
              className="relative select-none flex flex-col"
            >
              {/* TOP HORIZONTAL RULER (0 to 180 mm) */}
              {showRuler && (
                <div 
                  className={`h-6 bg-amber-50/90 border-t border-x border-amber-200 rounded-t flex items-end relative overflow-hidden font-mono text-[8px] text-amber-900 select-none ${
                    showRuler ? 'mr-5' : ''
                  }`}
                >
                  {Array.from({ length: 19 }).map((_, i) => {
                    const mm = i * 10;
                    return (
                      <React.Fragment key={mm}>
                        <div
                          className="absolute bottom-0 flex flex-col items-center"
                          style={{ left: `${(mm / 180) * 100}%`, transform: 'translateX(-50%)' }}
                        >
                          <span className="text-[8px] font-bold leading-none mb-0.5">{mm}</span>
                          <div className={`w-[1px] bg-amber-500 ${mm % 20 === 0 ? 'h-2.5' : 'h-1.5'}`} />
                        </div>
                        {i < 18 && (
                          <div
                            className="absolute bottom-0 w-[1px] h-1 bg-amber-300"
                            style={{ left: `${((mm + 5) / 180) * 100}%`, transform: 'translateX(-50%)' }}
                          />
                        )}
                      </React.Fragment>
                    );
                  })}
                </div>
              )}

              {/* CHEQUE WRAPPER (With optional Left Vertical Ruler) */}
              <div className="flex w-full">
                
                {/* CHEQUE MAIN CONTAINER (Aspect 180 / 90) */}
                <div
                  id="calibration-cheque-container"
                  ref={canvasRef}
                  onPointerMove={handlePointerMove}
                  onPointerUp={handlePointerUp}
                  className="relative select-none shadow-md bg-white border border-slate-300 flex-1 overflow-hidden"
                  style={{
                    aspectRatio: `${calibWidthMm} / ${calibHeightMm}`,
                    position: 'relative',
                    backgroundColor: '#ffffff',
                  }}
                >
                  {/* ========================================================================= */}
                  {/* 1. Cheque Background (Scanned Real Image vs Vector Arabic Template)       */}
                  {/* ========================================================================= */}
                  {bgViewMode === 'scanned' ? (
                    <div className="absolute inset-0 pointer-events-none select-none z-0">
                      <img
                        src={calibChequeImage}
                        alt={`خلفية شيك ${activeAccount?.bankName || 'CBK'}`}
                        className="w-full h-full object-fill pointer-events-none select-none"
                        style={{ opacity: bgOpacity / 100 }}
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = '/cbk_cheque_template.jpg';
                        }}
                      />
                    </div>
                  ) : (
                    /* Authentic Vector CBK Template with accurate RTL Arabic alignment */
                    <div className="absolute inset-0 pointer-events-none z-0">
                      <svg
                        className="w-full h-full"
                        viewBox="0 0 180 90"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        {/* Outer frame */}
                        <rect x="2" y="2" width="176" height="86" fill="#f8fafc" stroke="#0284c7" strokeWidth="0.6" rx="1.5" />
                        <rect x="3.5" y="3.5" width="173" height="83" fill="none" stroke="#bae6fd" strokeWidth="0.4" strokeDasharray="1.5, 1" />

                        {/* Top Bank Name & Logo */}
                        <g transform="translate(6, 6)">
                          <circle cx="5" cy="5" r="4.5" fill="#0284c7" opacity="0.15" />
                          <text x="12" y="5" fontFamily="sans-serif" fontSize="3.6" fontWeight="bold" fill="#0f172a">
                            البنك التجاري الكويتي
                          </text>
                          <text x="12" y="9" fontFamily="sans-serif" fontSize="2.6" fontWeight="600" fill="#0284c7">
                            Commercial Bank of Kuwait
                          </text>
                        </g>

                        {/* Top Right Date Box (at x=134, y=6.5) */}
                        <g transform="translate(134, 6.5)">
                          <text x="32" y="4" fontFamily="sans-serif" fontSize="2.8" fontWeight="bold" fill="#334155" textAnchor="end">
                            التاريخ / DATE:
                          </text>
                          <rect x="0" y="5.5" width="36" height="8.5" fill="#ffffff" stroke="#94a3b8" strokeWidth="0.5" rx="0.8" />
                          {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
                            <line key={i} x1={i * 4.5} y1="5.5" x2={i * 4.5} y2="14" stroke="#cbd5e1" strokeWidth="0.3" />
                          ))}
                        </g>

                        {/* Payee Row: Arabic label on RIGHT, line extending to left */}
                        <g transform="translate(16, 29)">
                          <text x="148" y="4" fontFamily="sans-serif" fontSize="3.2" fontWeight="bold" fill="#0f172a" textAnchor="end">
                            ادفعوا لأمر:
                          </text>
                          <text x="148" y="7.5" fontFamily="sans-serif" fontSize="2.2" fill="#64748b" textAnchor="end">
                            Pay to the order of:
                          </text>
                          <line x1="0" y1="7.5" x2="120" y2="7.5" stroke="#94a3b8" strokeWidth="0.4" strokeDasharray="1, 0.8" />
                        </g>

                        {/* Tafqeet / Words Row: Arabic label on RIGHT, line extending to left */}
                        <g transform="translate(16, 41)">
                          <text x="148" y="4" fontFamily="sans-serif" fontSize="3.2" fontWeight="bold" fill="#0f172a" textAnchor="end">
                            مبلغ وقدره:
                          </text>
                          <text x="148" y="7.5" fontFamily="sans-serif" fontSize="2.2" fill="#64748b" textAnchor="end">
                            The sum of:
                          </text>
                          <line x1="38" y1="7.5" x2="120" y2="7.5" stroke="#94a3b8" strokeWidth="0.4" strokeDasharray="1, 0.8" />
                        </g>

                        {/* Amount Box on LEFT (KD / د.ك) */}
                        <g transform="translate(10, 38)">
                          <rect x="0" y="0" width="42" height="12.5" fill="#f1f5f9" stroke="#0f172a" strokeWidth="0.6" rx="1.2" />
                          <text x="3" y="8" fontFamily="sans-serif" fontSize="3.4" fontWeight="bold" fill="#0f172a">
                            د.ك / K.D.
                          </text>
                          <line x1="16" y1="0" x2="16" y2="12.5" stroke="#94a3b8" strokeWidth="0.4" />
                        </g>

                        {/* Signature Section on LEFT */}
                        <g transform="translate(10, 68)">
                          <line x1="0" y1="0" x2="55" y2="0" stroke="#94a3b8" strokeWidth="0.4" />
                          <text x="10" y="4.5" fontFamily="sans-serif" fontSize="2.4" fill="#64748b">
                            توقيع معتمد / Authorized Signature
                          </text>
                        </g>

                        {/* Bottom MICR code line */}
                        <g transform="translate(14, 82)">
                          <text x="0" y="4" fontFamily="monospace" fontSize="3.8" letterSpacing="2.5" fill="#334155">
                            ⑈001048⑈ 01800200⑆ 1020491823⑈ 25
                          </text>
                        </g>
                      </svg>
                    </div>
                  )}

                  {/* ========================================================================= */}
                  {/* 2. Precision 10mm / 5mm Millimeter Grid Overlay                           */}
                  {/* ========================================================================= */}
                  {showGrid && (
                    <div 
                      className="absolute inset-0 pointer-events-none z-10 overflow-hidden"
                      style={{
                        backgroundImage: `
                          linear-gradient(to right, rgba(37, 99, 235, 0.42) 1px, transparent 1px),
                          linear-gradient(to bottom, rgba(37, 99, 235, 0.42) 1px, transparent 1px),
                          linear-gradient(to right, rgba(37, 99, 235, 0.18) 0.5px, transparent 0.5px),
                          linear-gradient(to bottom, rgba(37, 99, 235, 0.18) 0.5px, transparent 0.5px)
                        `,
                        backgroundSize: `
                          ${(10 / 180) * 100}% ${(10 / 90) * 100}%,
                          ${(10 / 180) * 100}% ${(10 / 90) * 100}%,
                          ${(5 / 180) * 100}% ${(5 / 90) * 100}%,
                          ${(5 / 180) * 100}% ${(5 / 90) * 100}%
                        `,
                      }}
                    >
                      <div className="absolute bottom-1 right-1 bg-blue-900/85 text-white text-[9px] font-mono px-2 py-0.5 rounded shadow z-10 flex items-center gap-1.5 backdrop-blur-xs">
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
                        <span>الشبكة مليمترية: كل مربع = 10mm × 10mm</span>
                      </div>
                    </div>
                  )}

                  {/* ========================================================================= */}
                  {/* 3. Interactive Field Layers with Percentage Coordinates & Resize Handles   */}
                  {/* ========================================================================= */}

                  {/* FIELD 1: التاريخ DATE (Top Right Box) */}
                  <div
                    onPointerDown={(e) => handlePointerDown('date', 'move', e)}
                    className={`absolute cursor-move transition-shadow z-20 flex items-center justify-center font-mono font-bold text-slate-900 border ${
                      selectedField === 'date'
                        ? 'border-blue-600 bg-blue-500/25 shadow-md ring-2 ring-blue-500 ring-offset-1'
                        : 'border-blue-400/80 bg-blue-50/70 hover:border-blue-600'
                    } rounded`}
                    style={{
                      left: `${toLeftPct(dateLeft)}%`,
                      top: `${toTopPct(dateTop)}%`,
                      width: `${toWidthPct(dateWidth)}%`,
                      height: `${toHeightPct(dateHeight)}%`,
                    }}
                    title="حقل التاريخ (اسحب من الحواف أو الزوايا لتغيير الحجم)"
                  >
                    {/* Floating Label Badge Outside Box */}
                    <span className="absolute -top-4 right-0 text-[8px] font-sans font-bold bg-blue-600 text-white px-1.5 py-0.2 rounded shadow-2xs pointer-events-none select-none z-30">
                      التاريخ
                    </span>

                    {/* Content strictly within field bounds */}
                    <div className="w-full h-full flex items-center justify-center font-mono font-black text-slate-950 overflow-hidden text-center truncate px-0.5 select-none">
                      <span 
                        style={{ fontSize: `${dateFontSize}px` }} 
                        className="tracking-widest font-black text-slate-950 truncate max-w-full"
                      >
                        25/04/2026
                      </span>
                    </div>

                    {/* Edge & Corner Resize Handles */}
                    {renderResizeHandles('date', 'bg-blue-600')}
                  </div>

                  {/* FIELD 2: المستفيد PAYEE (Starts near 'ادفعوا لأمر' from Right) */}
                  <div
                    onPointerDown={(e) => handlePointerDown('payee', 'move', e)}
                    className={`absolute cursor-move transition-shadow z-20 flex items-center font-bold text-slate-900 border ${
                      selectedField === 'payee'
                        ? 'border-emerald-600 bg-emerald-500/25 shadow-md ring-2 ring-emerald-500 ring-offset-1'
                        : 'border-emerald-400/80 bg-emerald-50/70 hover:border-emerald-600'
                    } rounded`}
                    style={{
                      left: `${toLeftPct(payeeLeft)}%`,
                      top: `${toTopPct(payeeTop)}%`,
                      width: `${toWidthPct(payeeWidth)}%`,
                      height: `${toHeightPct(payeeHeight)}%`,
                    }}
                    title="اسم المستفيد (اسحب من الحواف أو الزوايا لتغيير الحجم)"
                  >
                    {/* Floating Label Badge Outside Box */}
                    <span className="absolute -top-4 right-0 text-[8px] font-sans font-bold bg-emerald-600 text-white px-1.5 py-0.2 rounded shadow-2xs pointer-events-none select-none z-30">
                      اسم المستفيد
                    </span>

                    {/* Content strictly within field bounds */}
                    <div className="w-full h-full flex items-center font-serif font-black text-slate-950 text-right overflow-hidden px-1 select-none" dir="rtl">
                      <span 
                        style={{ fontSize: `${payeeFontSize}px` }}
                        className="truncate block w-full text-right font-black text-slate-950"
                      >
                        شركة البادية للمقاولات والتجارة العامة ذ.م.م
                      </span>
                    </div>

                    {/* Edge & Corner Resize Handles */}
                    {renderResizeHandles('payee', 'bg-emerald-600')}
                  </div>

                  {/* FIELD 3: التفقيط WORDS (سطران عند الزيادة ولا يتعدى حيز الحقل) */}
                  <div
                    onPointerDown={(e) => handlePointerDown('words', 'move', e)}
                    className={`absolute cursor-move transition-shadow z-20 flex items-center font-bold text-slate-900 border ${
                      selectedField === 'words'
                        ? 'border-purple-600 bg-purple-500/25 shadow-md ring-2 ring-purple-500 ring-offset-1'
                        : 'border-purple-400/80 bg-purple-50/70 hover:border-purple-600'
                    } rounded`}
                    style={{
                      left: `${toLeftPct(wordsLeft)}%`,
                      top: `${toTopPct(wordsTop)}%`,
                      width: `${toWidthPct(wordsWidth)}%`,
                      height: `${toHeightPct(wordsHeight)}%`,
                    }}
                    title="التفقيط (إذا زاد يتم وضعه على سطرين داخل حيز الحقل)"
                  >
                    {/* Floating Label Badge Outside Box */}
                    <span className="absolute -top-4 right-0 text-[8px] font-sans font-bold bg-purple-600 text-white px-1.5 py-0.2 rounded shadow-2xs pointer-events-none select-none z-30">
                      التفقيط (سطران عند الزيادة)
                    </span>

                    {/* Content strictly within field bounds on up to 2 lines */}
                    <div className="w-full h-full flex items-center text-right overflow-hidden px-1 select-none" dir="rtl">
                      <span 
                        style={{ fontSize: `${wordsFontSize}px`, lineHeight: 1.2 }}
                        className="line-clamp-2 break-words font-serif font-bold text-slate-950 text-right w-full max-h-full overflow-hidden"
                      >
                        فقط خمسة وعشرون ألف وثلاثمائة وسبعون دينار كويتي وخمسمائة فلس لا غير #
                      </span>
                    </div>

                    {/* Edge & Corner Resize Handles */}
                    {renderResizeHandles('words', 'bg-purple-600')}
                  </div>

                  {/* FIELD 4: المبلغ رقماً AMOUNT (Inside KD Box on Left) */}
                  <div
                    onPointerDown={(e) => handlePointerDown('amount', 'move', e)}
                    className={`absolute cursor-move transition-shadow z-20 flex items-center justify-center font-mono font-black text-slate-900 border ${
                      selectedField === 'amount'
                        ? 'border-amber-600 bg-amber-500/25 shadow-md ring-2 ring-amber-500 ring-offset-1'
                        : 'border-amber-400/80 bg-amber-50/70 hover:border-amber-600'
                    } rounded`}
                    style={{
                      left: `${toLeftPct(amountLeft)}%`,
                      top: `${toTopPct(amountTop)}%`,
                      width: `${toWidthPct(amountWidth)}%`,
                      height: `${toHeightPct(amountHeight)}%`,
                    }}
                    title="المبلغ بالأرقام محصوراً بين علامتي #"
                  >
                    {/* Floating Label Badge Outside Box */}
                    <span className="absolute -top-4 right-0 text-[8px] font-sans font-bold bg-amber-600 text-white px-1.5 py-0.2 rounded shadow-2xs pointer-events-none select-none z-30">
                      المبلغ (#...#)
                    </span>

                    {/* Content strictly within field bounds formatted between # */}
                    <div className="w-full h-full flex items-center justify-center font-mono font-black text-slate-950 overflow-hidden text-center px-1 select-none">
                      <span 
                        style={{ fontSize: `${amountFontSize}px` }}
                        className="font-mono font-black tracking-wider text-slate-950 truncate text-center w-full"
                      >
                        {formatChequeAmount(3500)}
                      </span>
                    </div>

                    {/* Edge & Corner Resize Handles */}
                    {renderResizeHandles('amount', 'bg-amber-600')}
                  </div>

                </div>

                {/* LEFT VERTICAL RULER (0 to 90 mm) */}
                {showRuler && (
                  <div className="w-5 bg-amber-50/90 border-y border-l border-amber-200 rounded-l relative overflow-hidden font-mono text-[7px] text-amber-900 select-none flex-shrink-0">
                    {Array.from({ length: 10 }).map((_, i) => {
                      const mm = i * 10;
                      return (
                        <div
                          key={mm}
                          className="absolute right-0 flex items-center"
                          style={{ top: `${(mm / 90) * 100}%`, transform: 'translateY(-50%)' }}
                        >
                          <span className="text-[7px] font-bold leading-none ml-0.5">{mm}</span>
                          <div className={`h-[1px] bg-amber-500 mr-0.5 ${mm % 20 === 0 ? 'w-2' : 'w-1.5'}`} />
                        </div>
                      );
                    })}
                  </div>
                )}

              </div>
            </div>

          </div>

          {/* Quick Field Legend */}
          <div className="flex flex-wrap items-center justify-between text-xs text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-200">
            <span className="font-bold text-slate-800">الحقول القابلة للمعايرة:</span>
            <div className="flex flex-wrap items-center gap-3 font-medium">
              <span className="inline-flex items-center gap-1.5 text-blue-800">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span> التاريخ (DATE)
              </span>
              <span className="inline-flex items-center gap-1.5 text-emerald-800">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span> المستفيد (PAYEE)
              </span>
              <span className="inline-flex items-center gap-1.5 text-purple-800">
                <span className="w-2.5 h-2.5 rounded-full bg-purple-500"></span> التفقيط (WORDS)
              </span>
              <span className="inline-flex items-center gap-1.5 text-amber-800">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span> المبلغ رقماً (AMOUNT)
              </span>
            </div>
          </div>

        </div>

        {/* Calibration Controls & Dimensions Panel (Col 4) */}
        <div className="xl:col-span-4 space-y-4">
          
          {/* Card 1: Select Field To Calibrate */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
            <h3 className="text-xs font-black text-slate-900 flex items-center gap-1.5 border-b border-slate-100 pb-2">
              <Sliders className="w-3.5 h-3.5 text-amber-600" />
              <span>اختيار الحقل المطلوب معايرته</span>
            </h3>

            <div className="grid grid-cols-2 gap-1.5">
              <button
                type="button"
                onClick={() => setSelectedField('all')}
                className={`px-2.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                  selectedField === 'all'
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-200'
                }`}
              >
                <Move className="w-3.5 h-3.5 text-amber-400" />
                <span>الشيك بالكامل (عام)</span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedField('date')}
                className={`px-2.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                  selectedField === 'date'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-blue-50 text-blue-800 hover:bg-blue-100 border border-blue-200'
                }`}
              >
                <Calendar className="w-3.5 h-3.5" />
                <span>التاريخ</span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedField('payee')}
                className={`px-2.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                  selectedField === 'payee'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200'
                }`}
              >
                <User className="w-3.5 h-3.5" />
                <span>المستفيد</span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedField('words')}
                className={`px-2.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                  selectedField === 'words'
                    ? 'bg-purple-600 text-white shadow-xs'
                    : 'bg-purple-50 text-purple-800 hover:bg-purple-100 border border-purple-200'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                <span>التفقيط</span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedField('amount')}
                className={`col-span-2 px-2.5 py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                  selectedField === 'amount'
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200'
                }`}
              >
                <DollarSign className="w-3.5 h-3.5" />
                <span>المبلغ بالأرقام (د.ك)</span>
              </button>
            </div>
          </div>

          {/* Card 2: Field Precise Dimensions & Position (ضبط أبعاد الحقل بدقة مليمترية) */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <h3 className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                <Maximize2 className="w-3.5 h-3.5 text-amber-600" />
                <span>ضبط أبعاد وموقع: {currentFieldInfo.title}</span>
              </h3>
            </div>

            {selectedField !== 'all' ? (
              <div className="space-y-3">
                {/* Dimensions (Width & Height) */}
                <div className="grid grid-cols-2 gap-2.5">
                  {/* Width */}
                  <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 space-y-1.5">
                    <span className="text-[11px] font-bold text-slate-700 block">العرض (Width)</span>
                    <div className="flex items-center justify-between">
                      <button
                        type="button"
                        onClick={() => handleAdjustDimension(selectedField, -1, 0)}
                        className="w-6 h-6 rounded bg-white hover:bg-slate-200 border border-slate-300 flex items-center justify-center font-bold text-slate-700 text-xs"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="font-mono font-black text-xs text-slate-900">
                        {currentFieldInfo.w} mm
                      </span>
                      <button
                        type="button"
                        onClick={() => handleAdjustDimension(selectedField, 1, 0)}
                        className="w-6 h-6 rounded bg-white hover:bg-slate-200 border border-slate-300 flex items-center justify-center font-bold text-slate-700 text-xs"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                  </div>

                  {/* Height */}
                  <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 space-y-1.5">
                    <span className="text-[11px] font-bold text-slate-700 block">الارتفاع (Height)</span>
                    <div className="flex items-center justify-between">
                      <button
                        type="button"
                        onClick={() => handleAdjustDimension(selectedField, 0, -1)}
                        className="w-6 h-6 rounded bg-white hover:bg-slate-200 border border-slate-300 flex items-center justify-center font-bold text-slate-700 text-xs"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="font-mono font-black text-xs text-slate-900">
                        {currentFieldInfo.h} mm
                      </span>
                      <button
                        type="button"
                        onClick={() => handleAdjustDimension(selectedField, 0, 1)}
                        className="w-6 h-6 rounded bg-white hover:bg-slate-200 border border-slate-300 flex items-center justify-center font-bold text-slate-700 text-xs"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Font Size */}
                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Type className="w-3.5 h-3.5 text-slate-600" />
                    <span className="text-[11px] font-bold text-slate-700">حجم الخط</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleAdjustFontSize(selectedField, -1)}
                      className="w-6 h-6 rounded bg-white hover:bg-slate-200 border border-slate-300 flex items-center justify-center font-bold text-slate-700 text-xs"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className="font-mono font-black text-xs text-slate-900 min-w-[36px] text-center">
                      {currentFieldInfo.font} pt
                    </span>
                    <button
                      type="button"
                      onClick={() => handleAdjustFontSize(selectedField, 1)}
                      className="w-6 h-6 rounded bg-white hover:bg-slate-200 border border-slate-300 flex items-center justify-center font-bold text-slate-700 text-xs"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>
                </div>

                {/* Live Real-World Position Info */}
                <div className="bg-amber-50/70 p-2.5 rounded-xl border border-amber-200 flex items-center justify-between text-xs font-mono">
                  <span className="font-sans font-bold text-amber-900 text-[11px]">الموقع الفعلي على الشيك:</span>
                  <div className="flex items-center gap-2 font-bold text-amber-950">
                    <span>X: {currentFieldInfo.x}mm</span>
                    <span>•</span>
                    <span>Y: {currentFieldInfo.y}mm</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs text-slate-600 leading-relaxed">
                يتم تطبيق الإزاحة العامة لنقل كافة حقول الشيك معاً بنفس المقدار في حال اختلاف موضع ورقة الشيك في درج الطابعة.
              </div>
            )}
          </div>

          {/* Card 3: Omnidirectional D-Pad with Step Control */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <h3 className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                <Move className="w-3.5 h-3.5 text-amber-600" />
                <span>أسهم التحريك الدقيقة (D-Pad)</span>
              </h3>
              
              {/* Step Size Selector */}
              <div className="flex items-center gap-1 text-[11px] bg-slate-100 p-0.5 rounded-lg">
                {[0.2, 0.5, 1, 2].map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setStepSize(s)}
                    className={`px-1.5 py-0.5 rounded font-mono font-bold text-[10px] transition ${
                      stepSize === s
                        ? 'bg-slate-800 text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {s}mm
                  </button>
                ))}
              </div>
            </div>

            {/* Physical D-Pad Layout */}
            <div className="flex flex-col items-center justify-center p-2">
              {/* Up */}
              <button
                type="button"
                onClick={() => handleNudge(0, -stepSize)}
                className="w-12 h-10 bg-slate-100 hover:bg-amber-500 hover:text-white text-slate-700 rounded-xl flex items-center justify-center transition shadow-xs active:scale-90 border border-slate-300"
                title="تحريك لأعلى"
              >
                <ArrowUp className="w-4 h-4" />
              </button>

              {/* Middle Row: Left, Center Reset, Right */}
              <div className="flex items-center gap-2 my-1.5">
                <button
                  type="button"
                  onClick={() => handleNudge(-stepSize, 0)}
                  className="w-12 h-10 bg-slate-100 hover:bg-amber-500 hover:text-white text-slate-700 rounded-xl flex items-center justify-center transition shadow-xs active:scale-90 border border-slate-300"
                  title="تحريك لليسار"
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>

                <div className="w-12 h-10 bg-slate-900 text-white rounded-xl flex flex-col items-center justify-center text-[10px] font-mono font-bold shadow-xs">
                  <span>{stepSize}</span>
                  <span className="text-[8px] text-slate-400">مم</span>
                </div>

                <button
                  type="button"
                  onClick={() => handleNudge(stepSize, 0)}
                  className="w-12 h-10 bg-slate-100 hover:bg-amber-500 hover:text-white text-slate-700 rounded-xl flex items-center justify-center transition shadow-xs active:scale-90 border border-slate-300"
                  title="تحريك لليمين"
                >
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>

              {/* Down */}
              <button
                type="button"
                onClick={() => handleNudge(0, stepSize)}
                className="w-12 h-10 bg-slate-100 hover:bg-amber-500 hover:text-white text-slate-700 rounded-xl flex items-center justify-center transition shadow-xs active:scale-90 border border-slate-300"
                title="تحريك لأسفل"
              >
                <ArrowDown className="w-4 h-4" />
              </button>
            </div>

            {/* Zero Out current field offset */}
            <div className="text-center pt-1">
              <button
                type="button"
                onClick={() => {
                  setCalibration((prev) => {
                    const next = { ...prev };
                    if (selectedField === 'all') { next.offsetX = 0; next.offsetY = 0; }
                    if (selectedField === 'date') { 
                      next.dateOffsetX = 0; 
                      next.dateOffsetY = 0; 
                      next.dateWidth = CBK_CHEQUE_BASE_COORDS.date.width;
                      next.dateHeight = CBK_CHEQUE_BASE_COORDS.date.height;
                      next.dateFontSize = CBK_CHEQUE_BASE_COORDS.date.fontSize;
                    }
                    if (selectedField === 'payee') { 
                      next.payeeOffsetX = 0; 
                      next.payeeOffsetY = 0; 
                      next.payeeWidth = CBK_CHEQUE_BASE_COORDS.payee.width;
                      next.payeeHeight = CBK_CHEQUE_BASE_COORDS.payee.height;
                      next.payeeFontSize = CBK_CHEQUE_BASE_COORDS.payee.fontSize;
                    }
                    if (selectedField === 'words') { 
                      next.wordsOffsetX = 0; 
                      next.wordsOffsetY = 0; 
                      next.wordsWidth = CBK_CHEQUE_BASE_COORDS.words.width;
                      next.wordsHeight = CBK_CHEQUE_BASE_COORDS.words.height;
                      next.wordsFontSize = CBK_CHEQUE_BASE_COORDS.words.fontSize;
                    }
                    if (selectedField === 'amount') { 
                      next.amountOffsetX = 0; 
                      next.amountOffsetY = 0; 
                      next.amountWidth = CBK_CHEQUE_BASE_COORDS.amount.width;
                      next.amountHeight = CBK_CHEQUE_BASE_COORDS.amount.height;
                      next.amountFontSize = CBK_CHEQUE_BASE_COORDS.amount.fontSize;
                    }
                    return next;
                  });
                }}
                className="text-[11px] text-slate-500 hover:text-red-600 font-bold underline transition"
              >
                استعادة الأبعاد الافتراضية لهذا الحقل فقط
              </button>
            </div>
          </div>

          {/* Card 4: Precision Assurance Guide */}
          <div className="bg-amber-50/70 p-4 rounded-2xl border border-amber-200 space-y-2 text-xs text-amber-900">
            <div className="flex items-center gap-1.5 font-bold text-amber-950">
              <HelpCircle className="w-4 h-4 text-amber-600" />
              <span>دليل موازنة الطابعة المليمترية</span>
            </div>
            <p className="text-[11px] leading-relaxed text-amber-900/90">
              جميع الإحداثيات والأبعاد المعروضة مطابقة تماماً للمسطرة المليمترية على الشيك الورقي الرسمي بمقاس 180×90 مم.
              عند الضغط على <strong>حفظ إعدادات المعايرة</strong>، تسري هذه الأبعاد على كافة عمليات الطباعة الفورية اللاحقة بدقة لا تتغير.
            </p>
          </div>

        </div>

      </div>

      {/* ========================================================================= */}
      {/* 4. Test Print Calibration Modal                                           */}
      {/* ========================================================================= */}
      {isTestPrintModalOpen && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs no-print"
          dir="rtl"
        >
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-blue-600 rounded-xl">
                  <Printer className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-base">طباعة تجريبية لمعايرة الشيك (180mm × 90mm)</h3>
                  <p className="text-xs text-slate-300">اختبر دقة محاذاة الحقول المليمترية قبل الطباعة على الشيكات البنكية الفعلية</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsTestPrintModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
              {/* Option: Print Mode */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700 block">
                  اختر نمط الطباعة التجريبية:
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <button
                    type="button"
                    onClick={() => setTestPrintMode('a4_alignment')}
                    className={`p-3 rounded-xl border text-right transition flex flex-col justify-between ${
                      testPrintMode === 'a4_alignment'
                        ? 'border-blue-600 bg-blue-50/70 ring-2 ring-blue-500/20'
                        : 'border-slate-200 hover:border-slate-300 bg-slate-50/50'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="font-bold text-xs text-slate-900">ورقة A4 مع الشبكة</span>
                      <Grid className={`w-4 h-4 ${testPrintMode === 'a4_alignment' ? 'text-blue-600' : 'text-slate-400'}`} />
                    </div>
                    <p className="text-[11px] text-slate-500 leading-snug">
                      إطار 180×90 مم + شبكة مليمترية لوضع الشيك فوقه ومطابقته بالمسطرة.
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setTestPrintMode('real_cheque_text_only')}
                    className={`p-3 rounded-xl border text-right transition flex flex-col justify-between ${
                      testPrintMode === 'real_cheque_text_only'
                        ? 'border-emerald-600 bg-emerald-50/70 ring-2 ring-emerald-500/20'
                        : 'border-slate-200 hover:border-slate-300 bg-slate-50/50'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="font-bold text-xs text-slate-900">شيك بنكي حقيقي</span>
                      <FileCheck className={`w-4 h-4 ${testPrintMode === 'real_cheque_text_only' ? 'text-emerald-600' : 'text-slate-400'}`} />
                    </div>
                    <p className="text-[11px] text-slate-500 leading-snug">
                      طباعة النصوص والأرقام فقط بدون خلفية أو إطار لتجربتها مباشرة على الشيك.
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setTestPrintMode('with_bg')}
                    className={`p-3 rounded-xl border text-right transition flex flex-col justify-between ${
                      testPrintMode === 'with_bg'
                        ? 'border-purple-600 bg-purple-50/70 ring-2 ring-purple-500/20'
                        : 'border-slate-200 hover:border-slate-300 bg-slate-50/50'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="font-bold text-xs text-slate-900">مع خلفية الشيك</span>
                      <ImageIcon className={`w-4 h-4 ${testPrintMode === 'with_bg' ? 'text-purple-600' : 'text-slate-400'}`} />
                    </div>
                    <p className="text-[11px] text-slate-500 leading-snug">
                      طباعة كاملة مع صورة الشيك البنكي للمراجعة البصرية المكتبية.
                    </p>
                  </button>
                </div>
              </div>

              {/* Sample Cheque Data Inputs */}
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-3">
                <span className="text-xs font-bold text-slate-700 block">بيانات نموذج الاختبار:</span>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-slate-500 text-[10px] block mb-1">اسم المستفيد:</span>
                    <input
                      type="text"
                      value={testChequeData.payee}
                      onChange={(e) => setTestChequeData({ ...testChequeData, payee: e.target.value })}
                      className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-800"
                    />
                  </div>
                  <div>
                    <span className="text-slate-500 text-[10px] block mb-1">المبلغ بالأرقام:</span>
                    <input
                      type="number"
                      step="0.001"
                      value={testChequeData.amount}
                      onChange={(e) => setTestChequeData({ ...testChequeData, amount: parseFloat(e.target.value) || 0 })}
                      className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-mono font-bold text-slate-800"
                    />
                  </div>
                </div>
                <div>
                  <span className="text-slate-500 text-[10px] block mb-1">المبلغ كتابة:</span>
                  <input
                    type="text"
                    value={testChequeData.words}
                    onChange={(e) => setTestChequeData({ ...testChequeData, words: e.target.value })}
                    className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-800"
                  />
                </div>
              </div>

              {/* Printer Instruction Banner */}
              <div className="bg-amber-50 p-3.5 rounded-xl border border-amber-200 flex items-start gap-2.5 text-amber-900 text-xs">
                <HelpCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <span className="font-bold block">تعليمات نافذة الطباعة لضمان دقة 100%:</span>
                  <ul className="list-disc list-inside text-[11px] text-amber-900/90 space-y-0.5">
                    <li>اضبط <strong>المقياس (Scale)</strong> على <strong>100%</strong> أو <strong>الحجم الفعلي (Actual Size)</strong>.</li>
                    <li>اضبط <strong>الهوامش (Margins)</strong> على <strong>بلا هوامش (None)</strong>.</li>
                    <li>تأكد من عدم تفعيل خيار <em>ملاءمة الصفحة (Fit to page)</em> لتجنب تمدد الأبعاد.</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setIsTestPrintModalOpen(false)}
                className="px-4 py-2 text-slate-700 bg-white hover:bg-slate-100 font-bold rounded-xl text-xs border border-slate-300 transition"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={handleTriggerPrint}
                className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-black rounded-xl text-xs shadow-md transition active:scale-95"
              >
                <Printer className="w-4 h-4" />
                <span>طباعة تجريبية الآن</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 5. Precise Printable Cheque Canvas (180mm x 90mm Isolated Container)       */}
      {/* ========================================================================= */}
      <div 
        className="cheque-print-exact hidden"
        style={{
          width: '180mm',
          height: '90mm',
          position: 'relative',
          overflow: 'hidden',
          backgroundColor: testPrintMode === 'with_bg' ? '#ffffff' : 'transparent',
          border: testPrintMode === 'a4_alignment' ? '1px dashed #3b82f6' : 'none',
          boxSizing: 'border-box',
          pageBreakInside: 'avoid',
        }}
      >
        {/* Background Image if requested */}
        {testPrintMode === 'with_bg' && (
          <img
            src={calibration.customChequeImageUrl || '/cbk_cheque_bg.jpg'}
            alt="خلفية الشيك"
            className="absolute inset-0 w-full h-full object-fill pointer-events-none"
            style={{ width: '180mm', height: '90mm' }}
            onError={(e) => {
              (e.target as HTMLImageElement).src = '/cbk_cheque_template.jpg';
            }}
          />
        )}

        {/* 10mm Alignment Grid if in A4 alignment mode */}
        {testPrintMode === 'a4_alignment' && (
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              backgroundImage: `
                linear-gradient(to right, rgba(59, 130, 246, 0.25) 1px, transparent 1px),
                linear-gradient(to bottom, rgba(59, 130, 246, 0.25) 1px, transparent 1px)
              `,
              backgroundSize: '10mm 10mm',
            }}
          >
            <div className="absolute top-1 left-2 text-[8px] font-mono text-blue-600 bg-white/80 px-1 rounded">
              مقاس الشيك: 180mm × 90mm | شبكة 10mm
            </div>
          </div>
        )}

        {/* FIELD 1: التاريخ DATE */}
        <div
          style={{
            position: 'absolute',
            left: `${dateLeft}mm`,
            top: `${dateTop}mm`,
            width: `${dateWidth}mm`,
            height: `${dateHeight}mm`,
            fontSize: `${dateFontSize}pt`,
            fontFamily: 'monospace',
            fontWeight: 'bold',
            color: '#000000',
            letterSpacing: '3px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxSizing: 'border-box',
            border: testPrintMode === 'a4_alignment' ? '0.5px solid rgba(59, 130, 246, 0.4)' : 'none',
          }}
        >
          {testChequeData.date}
        </div>

        {/* FIELD 2: المستفيد PAYEE */}
        <div
          dir="rtl"
          style={{
            position: 'absolute',
            left: `${payeeLeft}mm`,
            top: `${payeeTop}mm`,
            width: `${payeeWidth}mm`,
            height: `${payeeHeight}mm`,
            fontSize: `${payeeFontSize}pt`,
            fontFamily: 'sans-serif',
            fontWeight: 'bold',
            color: '#000000',
            textAlign: 'right',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            display: 'flex',
            alignItems: 'center',
            boxSizing: 'border-box',
            border: testPrintMode === 'a4_alignment' ? '0.5px solid rgba(16, 185, 129, 0.4)' : 'none',
          }}
        >
          {testChequeData.payee}
        </div>

        {/* FIELD 3: التفقيط WORDS */}
        <div
          dir="rtl"
          style={{
            position: 'absolute',
            left: `${wordsLeft}mm`,
            top: `${wordsTop}mm`,
            width: `${wordsWidth}mm`,
            height: `${wordsHeight}mm`,
            fontSize: `${wordsFontSize}pt`,
            fontFamily: 'sans-serif',
            fontWeight: '600',
            color: '#000000',
            textAlign: 'right',
            overflow: 'hidden',
            display: 'flex',
            alignItems: 'center',
            boxSizing: 'border-box',
            border: testPrintMode === 'a4_alignment' ? '0.5px solid rgba(147, 51, 234, 0.4)' : 'none',
          }}
        >
          <span
            style={{
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
              lineHeight: '1.25',
              width: '100%',
              wordBreak: 'break-word',
            }}
          >
            {testChequeData.words}
          </span>
        </div>

        {/* FIELD 4: المبلغ رقماً AMOUNT */}
        <div
          style={{
            position: 'absolute',
            left: `${amountLeft}mm`,
            top: `${amountTop}mm`,
            width: `${amountWidth}mm`,
            height: `${amountHeight}mm`,
            fontSize: `${amountFontSize}pt`,
            fontFamily: 'monospace',
            fontWeight: 'bold',
            color: '#000000',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            boxSizing: 'border-box',
            border: testPrintMode === 'a4_alignment' ? '0.5px solid rgba(217, 119, 6, 0.4)' : 'none',
          }}
        >
          {formatChequeAmount(testChequeData.amount)}
        </div>
      </div>
    </div>
  );
}
