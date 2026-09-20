import React, { useRef, useState } from 'react';
import { Printer, Eye, Sliders, CheckCircle2, ShieldAlert, FileText, ArrowRight, X } from 'lucide-react';
import { IssuedCheque, BankAccount, ChequeBook, ChequePrintSettings } from '../../types';

interface CbkChequePrintProps {
  cheque: IssuedCheque;
  bankAccount: BankAccount;
  chequeBook?: ChequeBook;
  printSettings: ChequePrintSettings;
  onUpdatePrintSettings?: (settings: ChequePrintSettings) => void;
  onClose?: () => void;
  onStatusChange?: (newStatus: 'issued' | 'cashed' | 'cancelled') => void;
}

export function CbkChequePrint({
  cheque,
  bankAccount,
  chequeBook,
  printSettings,
  onUpdatePrintSettings,
  onClose,
  onStatusChange,
}: CbkChequePrintProps) {
  const [printMode, setPrintMode] = useState<'voucher' | 'physical_cheque'>(
    printSettings.showBackgroundOnPrint ? 'voucher' : 'physical_cheque'
  );
  const [calibration, setCalibration] = useState<ChequePrintSettings>({ ...printSettings });
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const printAreaRef = useRef<HTMLDivElement>(null);

  // تنسيق التاريخ إلى مصفوفة أرقام لخانة التاريخ [D, D, M, M, Y, Y, Y, Y]
  const dateObj = new Date(cheque.dueDate || cheque.issueDate);
  const dayStr = String(dateObj.getDate()).padStart(2, '0');
  const monthStr = String(dateObj.getMonth() + 1).padStart(2, '0');
  const yearStr = String(dateObj.getFullYear());

  const handlePrint = () => {
    window.print();
  };

  const handleSaveCalibration = () => {
    if (onUpdatePrintSettings) {
      onUpdatePrintSettings(calibration);
    }
    setShowSettingsModal(false);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white w-full max-w-5xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-6">
        
        {/* Header Bar - Hidden in Print */}
        <div className="bg-slate-900 text-white p-4 flex flex-wrap items-center justify-between gap-3 print:hidden">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 font-bold">
              CBK
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black">
                  معاينة وطباعة شيك البنك التجاري الكويتي (CBK)
                </h3>
                <span className="bg-amber-400 text-slate-950 text-[10px] font-black px-2 py-0.5 rounded-full font-mono">
                  #{cheque.chequeNumberStr}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                {bankAccount.accountName} - الحساب: {bankAccount.accountNumber}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Print Mode Selector */}
            <div className="bg-slate-800 p-1 rounded-xl flex items-center text-xs font-bold">
              <button
                type="button"
                onClick={() => setPrintMode('voucher')}
                className={`px-3 py-1.5 rounded-lg transition ${
                  printMode === 'voucher'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                شيك وسند كامل (للأرشيف)
              </button>
              <button
                type="button"
                onClick={() => setPrintMode('physical_cheque')}
                className={`px-3 py-1.5 rounded-lg transition ${
                  printMode === 'physical_cheque'
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                طباعة على ورقة الشيك الفعلي
              </button>
            </div>

            {/* Calibration Button */}
            <button
              type="button"
              onClick={() => setShowSettingsModal(true)}
              className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl transition"
              title="معايرة إزاحة الطباعة (X / Y Offset)"
            >
              <Sliders className="w-4 h-4" />
            </button>

            {/* Print Trigger */}
            <button
              type="button"
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs shadow-md transition"
            >
              <Printer className="w-4 h-4" />
              <span>طباعة الآن (Ctrl+P)</span>
            </button>

            {/* Close */}
            {onClose && (
              <button
                type="button"
                onClick={onClose}
                className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>

        {/* Action / Status Notice - Hidden in Print */}
        <div className="bg-slate-50 border-b border-slate-200 px-6 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs print:hidden">
          <div className="flex items-center gap-3">
            <span className="text-slate-600 font-bold">حالة الشيك:</span>
            {cheque.status === 'cashed' && (
              <span className="bg-emerald-100 text-emerald-800 font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>منصرف من البنك بتاريخ ({cheque.cashedDate || 'تم الخصم'})</span>
              </span>
            )}
            {cheque.status === 'issued' && (
              <span className="bg-blue-100 text-blue-800 font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1">
                <FileText className="w-3.5 h-3.5 text-blue-600" />
                <span>صادر (معلق / لم يصرف بعد)</span>
              </span>
            )}
            {cheque.status === 'cancelled' && (
              <span className="bg-rose-100 text-rose-800 font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1">
                <ShieldAlert className="w-3.5 h-3.5 text-rose-600" />
                <span>ملغى ({cheque.cancelReason || 'شيك تالف'})</span>
              </span>
            )}
          </div>

          {onStatusChange && (
            <div className="flex items-center gap-2">
              <span className="text-slate-500 text-[11px]">تحديث الحالة:</span>
              {cheque.status !== 'cashed' && (
                <button
                  type="button"
                  onClick={() => onStatusChange('cashed')}
                  className="px-2.5 py-1 bg-white border border-emerald-300 text-emerald-700 hover:bg-emerald-50 rounded-lg font-bold text-[11px] transition"
                >
                  تسجيل كمنصرف
                </button>
              )}
              {cheque.status !== 'issued' && (
                <button
                  type="button"
                  onClick={() => onStatusChange('issued')}
                  className="px-2.5 py-1 bg-white border border-blue-300 text-blue-700 hover:bg-blue-50 rounded-lg font-bold text-[11px] transition"
                >
                  تعيين كـ صادر (معلق)
                </button>
              )}
              {cheque.status !== 'cancelled' && (
                <button
                  type="button"
                  onClick={() => onStatusChange('cancelled')}
                  className="px-2.5 py-1 bg-white border border-rose-300 text-rose-700 hover:bg-rose-50 rounded-lg font-bold text-[11px] transition"
                >
                  إلغاء الشيك
                </button>
              )}
            </div>
          )}
        </div>

        {/* Printable Area */}
        <div 
          ref={printAreaRef}
          className="p-6 md:p-8 bg-slate-100 min-h-[480px] flex flex-col items-center justify-center overflow-x-auto print:p-0 print:bg-white print:m-0"
        >
          
          {/* Top Voucher Stub - Only shown in voucher mode */}
          {printMode === 'voucher' && (
            <div className="w-[820px] bg-white border-2 border-dashed border-slate-300 rounded-t-xl p-4 mb-4 text-xs space-y-3 print:border-slate-400 print:mb-2">
              <div className="flex justify-between items-center border-b border-slate-200 pb-2">
                <div>
                  <h4 className="font-black text-slate-800 text-sm">
                    سند صرف شيك بنكي (نسخة الأرشيف والتوثيق المالي)
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    البنك المسحوب عليه: {bankAccount.bankName} - رقم الحساب: {bankAccount.accountNumber}
                  </p>
                </div>
                <div className="text-left font-mono">
                  <div className="font-black text-slate-900 text-sm">رقم الشيك: {cheque.chequeNumberStr}</div>
                  <div className="text-[11px] text-slate-500">تاريخ التحرير: {cheque.issueDate}</div>
                </div>
              </div>

              <div className="grid grid-cols-4 gap-3 bg-slate-50 p-2.5 rounded-lg border border-slate-200 text-[11px]">
                <div>
                  <span className="text-slate-500 block">المستفيد:</span>
                  <strong className="text-slate-900 font-bold">{cheque.beneficiaryName}</strong>
                </div>
                <div>
                  <span className="text-slate-500 block">المبلغ بالدينار:</span>
                  <strong className="text-blue-900 font-mono font-black text-xs">
                    {cheque.amount.toFixed(3)} د.ك
                  </strong>
                </div>
                <div>
                  <span className="text-slate-500 block">تاريخ الاستحقاق:</span>
                  <span className="font-mono font-bold text-slate-800">{cheque.dueDate}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">تسطير الشيك:</span>
                  <span className="font-bold text-slate-800">
                    {cheque.isCrossed ? 'نعم (للمستفيد الأول فقط)' : 'عادي بدون تسطير'}
                  </span>
                </div>
                <div className="col-span-4">
                  <span className="text-slate-500 inline-block ml-2">البيان والغرض:</span>
                  <span className="text-slate-800 font-medium">{cheque.purpose || 'لا يوجد بيان مسجل'}</span>
                </div>
              </div>

              <div className="flex justify-between items-end pt-2 text-[10px] text-slate-500 font-mono">
                <div>المحاسب المسؤول: {cheque.createdBy}</div>
                <div>توقيع المدقق / الاعتماد: .............................</div>
                <div>توقيع مستلم الشيك: .............................</div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* THE CHEQUE LEAFLET (CBK - COMMERCIAL BANK OF KUWAIT STYLE)               */}
          {/* Width ~ 820px (matches ~ 205mm) | Height ~ 340px (matches ~ 85mm)        */}
          {/* ========================================================================= */}
          <div
            style={{
              transform: `translate(${calibration.offsetX}mm, ${calibration.offsetY}mm)`,
            }}
            className={`w-[820px] h-[340px] relative transition-transform select-none print:shadow-none print:border-none ${
              printMode === 'voucher'
                ? 'bg-gradient-to-br from-amber-50/60 via-white to-amber-50/40 border-2 border-amber-800/60 rounded-xl shadow-xl overflow-hidden p-6'
                : 'bg-transparent border border-dashed border-slate-300 rounded-lg p-6 print:border-none'
            }`}
          >
            {/* Background Bank Artwork - ONLY shown in voucher mode */}
            {printMode === 'voucher' && (
              <>
                {/* Security Guilloche Pattern Simulation */}
                <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[radial-gradient(#92400e_1px,transparent_1px)] [background-size:12px_12px]" />

                {/* CBK Header Branding */}
                <div className="flex justify-between items-start border-b border-amber-900/30 pb-3">
                  <div className="flex items-center gap-3">
                    {/* CBK Star Emblem */}
                    <div className="w-12 h-12 rounded-full border-2 border-amber-800 flex items-center justify-center bg-amber-700 text-white font-serif font-black text-xl shadow-xs">
                      ★
                    </div>
                    <div>
                      <h2 className="text-lg font-black tracking-tight text-amber-950 font-serif">
                        البنك التجاري الكويتي
                      </h2>
                      <div className="text-[11px] font-bold tracking-wider text-amber-900 uppercase font-sans">
                        Commercial Bank of Kuwait
                      </div>
                      <div className="text-[10px] text-amber-800/80 font-mono mt-0.5">
                        {bankAccount.branchName}
                      </div>
                    </div>
                  </div>

                  {/* Top Right: Cheque Serial & Date Box */}
                  <div className="text-left space-y-2">
                    <div className="flex items-center justify-end gap-2">
                      <span className="text-[11px] font-bold text-amber-900">رقم الشيك / Cheque No:</span>
                      <span className="font-mono font-black text-base text-slate-900 tracking-widest bg-amber-100/60 px-2 py-0.5 rounded border border-amber-300">
                        {cheque.chequeNumberStr}
                      </span>
                    </div>

                    {/* Date Boxes */}
                    <div className="flex items-center justify-end gap-1.5 text-xs font-mono">
                      <span className="text-[10px] text-amber-900 font-bold ml-1">التاريخ / Date:</span>
                      <div className="flex items-center gap-0.5">
                        <div className="w-6 h-7 bg-white border border-amber-900/50 flex items-center justify-center font-bold text-slate-900 text-sm shadow-2xs">
                          {dayStr[0]}
                        </div>
                        <div className="w-6 h-7 bg-white border border-amber-900/50 flex items-center justify-center font-bold text-slate-900 text-sm shadow-2xs">
                          {dayStr[1]}
                        </div>
                      </div>
                      <span className="text-amber-900 font-bold">/</span>
                      <div className="flex items-center gap-0.5">
                        <div className="w-6 h-7 bg-white border border-amber-900/50 flex items-center justify-center font-bold text-slate-900 text-sm shadow-2xs">
                          {monthStr[0]}
                        </div>
                        <div className="w-6 h-7 bg-white border border-amber-900/50 flex items-center justify-center font-bold text-slate-900 text-sm shadow-2xs">
                          {monthStr[1]}
                        </div>
                      </div>
                      <span className="text-amber-900 font-bold">/</span>
                      <div className="flex items-center gap-0.5">
                        <div className="w-6 h-7 bg-white border border-amber-900/50 flex items-center justify-center font-bold text-slate-900 text-sm shadow-2xs">
                          {yearStr[0]}
                        </div>
                        <div className="w-6 h-7 bg-white border border-amber-900/50 flex items-center justify-center font-bold text-slate-900 text-sm shadow-2xs">
                          {yearStr[1]}
                        </div>
                        <div className="w-6 h-7 bg-white border border-amber-900/50 flex items-center justify-center font-bold text-slate-900 text-sm shadow-2xs">
                          {yearStr[2]}
                        </div>
                        <div className="w-6 h-7 bg-white border border-amber-900/50 flex items-center justify-center font-bold text-slate-900 text-sm shadow-2xs">
                          {yearStr[3]}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Account & IBAN Subtitle */}
                <div className="flex justify-between items-center text-[10px] text-amber-900/80 font-mono py-1 px-1">
                  <div>
                    <span>رقم الحساب: </span>
                    <strong className="text-slate-900 font-bold">{bankAccount.accountNumber}</strong>
                  </div>
                  <div>
                    <span>IBAN: </span>
                    <strong className="text-slate-900 font-bold">{bankAccount.iban}</strong>
                  </div>
                </div>
              </>
            )}

            {/* Parallel Crossing Lines (Top Left) */}
            {cheque.isCrossed && (
              <div
                className={`absolute top-4 left-6 z-20 border-l-2 border-r-2 border-slate-800 h-16 w-32 -rotate-12 flex flex-col justify-center items-center text-[9px] font-black uppercase tracking-wider ${
                  printMode === 'voucher' ? 'text-slate-900' : 'text-black'
                }`}
              >
                <div className="bg-white/80 px-1 whitespace-nowrap">A/C PAYEE ONLY</div>
                <div className="bg-white/80 px-1 whitespace-nowrap text-[8px] font-sans">
                  للمستفيد الأول فقط
                </div>
              </div>
            )}

            {/* Physical Cheque Exact Date Positioning (When background is hidden) */}
            {printMode === 'physical_cheque' && (
              <div className="absolute top-6 left-12 text-sm font-mono font-black text-black tracking-widest">
                {dayStr} / {monthStr} / {yearStr}
              </div>
            )}

            {/* Main Cheque Body: Pay To, Words of Sum, Amount Box */}
            <div className="mt-4 space-y-4">
              
              {/* Payee Row */}
              <div className="flex items-center gap-2">
                <span className={`text-xs font-bold whitespace-nowrap ${printMode === 'voucher' ? 'text-amber-950' : 'invisible'}`}>
                  ادفعوا لأمر / Pay to the order of:
                </span>
                <div className="flex-1 relative border-b-2 border-slate-700/60 pb-1">
                  <span className="text-sm font-black text-slate-950 px-2 font-serif">
                    {cheque.beneficiaryName}
                  </span>
                  
                  {/* Bearer Crossing Indicator */}
                  {cheque.bearerCrossed && (
                    <div className="absolute left-0 top-1 text-[11px] text-slate-800 font-bold line-through decoration-2 decoration-rose-600">
                      أو لحامله / or Bearer
                    </div>
                  )}
                </div>
              </div>

              {/* Amount in Arabic Words (Tafqeet) */}
              <div className="flex items-start gap-2">
                <span className={`text-xs font-bold whitespace-nowrap pt-1 ${printMode === 'voucher' ? 'text-amber-950' : 'invisible'}`}>
                  مبلغ وقدره / The sum of:
                </span>
                <div className="flex-1 border-b-2 border-slate-700/60 pb-1">
                  <span className="text-xs font-black text-slate-900 leading-relaxed font-serif px-2">
                    {cheque.amountInWordsAr}
                  </span>
                </div>

                {/* Amount Digits Box (Kuwaiti Dinar & Fils) */}
                <div className={`mr-2 min-w-[170px] h-12 flex items-center justify-between px-3 border-2 rounded-lg ${
                  printMode === 'voucher' 
                    ? 'bg-amber-100/50 border-amber-900/60' 
                    : 'border-slate-800 bg-white'
                }`}>
                  <span className="text-[11px] font-black text-amber-950">د.ك KWD</span>
                  <span className="text-base font-mono font-black text-slate-950 tracking-wider">
                    #{cheque.amount.toFixed(3)}#
                  </span>
                </div>
              </div>

              {/* Lower Section: Authorized Signature and MICR Line */}
              <div className="flex justify-between items-end pt-2">
                
                {/* Purpose / Memo */}
                <div className="text-[11px] text-slate-600 max-w-sm">
                  {cheque.purpose && (
                    <div className="flex items-center gap-1">
                      <span className={`${printMode === 'voucher' ? 'text-amber-900 font-bold' : 'invisible'}`}>البيان:</span>
                      <span className="text-slate-800 font-medium truncate">{cheque.purpose}</span>
                    </div>
                  )}
                </div>

                {/* Signatory Box */}
                <div className="text-center w-56">
                  <div className="h-10 border-b-2 border-slate-700/80 mb-1 flex items-center justify-center">
                    {printMode === 'voucher' && (
                      <span className="text-[10px] text-slate-400 italic">التوقيع المعتمد</span>
                    )}
                  </div>
                  <div className={`text-[10px] font-bold ${printMode === 'voucher' ? 'text-amber-950' : 'invisible'}`}>
                    التوقيع المعتمد / Authorized Signature
                  </div>
                </div>
              </div>

              {/* Bottom MICR Machine Readable Line (CBK Standard) */}
              {printMode === 'voucher' && (
                <div className="pt-2 border-t border-amber-900/20 flex justify-center items-center font-mono text-sm tracking-[0.25em] text-slate-900 font-bold select-all">
                  <span>⑈ {cheque.chequeNumberStr} ⑈ 019 ⑈ {bankAccount.accountNumber} ⑈ 01</span>
                </div>
              )}

            </div>
          </div>
          
          {/* Helper Tips for Physical Cheque Mode */}
          {printMode === 'physical_cheque' && (
            <div className="mt-4 bg-amber-50 border border-amber-200 p-3 rounded-xl max-w-2xl text-xs text-amber-900 print:hidden space-y-1">
              <div className="font-bold flex items-center gap-1.5">
                <Sliders className="w-4 h-4 text-amber-600" />
                <span>وضع الطباعة على ورقة الشيك البنكي الفعلي:</span>
              </div>
              <p className="text-[11px] text-amber-800">
                في هذا الوضع، تم إخفاء زخرفة وخلفية البنك لتتمكن من وضع ورقة الشيك الأصلية الصادرة من البنك التجاري الكويتي داخل درج الطابعة، وسيتم طباعة التاريخ، المستفيد، التفقيط، والمبلغ في أماكنها المخصصة بدقة. يمكنك ضبط الإزاحة بالملليمتر عبر زر المعايرة بالأعلى.
              </p>
            </div>
          )}

        </div>

      </div>

      {/* Calibration Modal */}
      {showSettingsModal && (
        <div className="fixed inset-0 z-60 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl border border-slate-200 space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h4 className="font-black text-slate-900 text-sm flex items-center gap-2">
                <Sliders className="w-4 h-4 text-blue-600" />
                <span>معايرة إزاحة طباعة الشيكات (Calibration)</span>
              </h4>
              <button 
                onClick={() => setShowSettingsModal(false)}
                className="text-slate-400 hover:text-slate-600 text-lg"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-500">
              قم بضبط موضع الطباعة بالملليمتر لتتوافق تماماً مع فراغات ورقة شيك البنك التجاري الكويتي بحسب درج طابعتك:
            </p>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-700 font-bold mb-1">
                  الإزاحة الأفقية X (ملليمتر - موجب لليمين / سالب لليسار):
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    step="1"
                    min="-50"
                    max="50"
                    value={calibration.offsetX}
                    onChange={(e) => setCalibration({ ...calibration, offsetX: parseFloat(e.target.value) || 0 })}
                    className="w-full p-2 border border-slate-300 rounded-lg font-mono font-bold"
                  />
                  <span className="font-mono text-slate-500 font-bold">mm</span>
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">
                  الإزاحة الرأسية Y (ملليمتر - موجب للأسفل / سالب للأعلى):
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    step="1"
                    min="-50"
                    max="50"
                    value={calibration.offsetY}
                    onChange={(e) => setCalibration({ ...calibration, offsetY: parseFloat(e.target.value) || 0 })}
                    className="w-full p-2 border border-slate-300 rounded-lg font-mono font-bold"
                  />
                  <span className="font-mono text-slate-500 font-bold">mm</span>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100 space-y-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={calibration.defaultCrossing}
                    onChange={(e) => setCalibration({ ...calibration, defaultCrossing: e.target.checked })}
                    className="rounded text-blue-600"
                  />
                  <span className="text-slate-700 font-bold text-xs">تسطير الشيكات افتراضياً (للمستفيد الأول فقط)</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={calibration.defaultBearerCrossing}
                    onChange={(e) => setCalibration({ ...calibration, defaultBearerCrossing: e.target.checked })}
                    className="rounded text-blue-600"
                  />
                  <span className="text-slate-700 font-bold text-xs">شطب عبارة "أو لحامله" افتراضياً</span>
                </label>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowSettingsModal(false)}
                className="px-4 py-2 border border-slate-300 text-slate-700 font-bold rounded-xl text-xs hover:bg-slate-50 transition"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={handleSaveCalibration}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-xs transition shadow-md"
              >
                حفظ الإعدادات
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
