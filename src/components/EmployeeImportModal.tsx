import React, { useState, useRef } from 'react';
import { 
  FileSpreadsheet, 
  Upload, 
  X, 
  CheckCircle2, 
  AlertTriangle, 
  Download, 
  Users, 
  Check, 
  AlertCircle, 
  ArrowLeft,
  Building2,
  CreditCard,
  Calendar,
  Layers
} from 'lucide-react';
import { Branch, Department, Employee } from '../types';
import { 
  exportEmployeeImportTemplate, 
  parseEmployeesFromExcel, 
  ParsedEmployeeRow 
} from '../utils/employeeExcel';

interface EmployeeImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  branches: Branch[];
  departments: Department[];
  existingEmployees: Employee[];
  onImportSuccess: (importedEmployees: Partial<Employee>[], updateExisting: boolean) => void;
}

export function EmployeeImportModal({
  isOpen,
  onClose,
  branches,
  departments,
  existingEmployees,
  onImportSuccess,
}: EmployeeImportModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [parsedRows, setParsedRows] = useState<ParsedEmployeeRow[]>([]);
  const [selectedIndices, setSelectedIndices] = useState<Set<number>>(new Set());
  const [filterMode, setFilterMode] = useState<'all' | 'valid' | 'issues'>('all');
  const [updateExistingIfCivilIdMatches, setUpdateExistingIfCivilIdMatches] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleDownloadTemplate = (emptyOnly: boolean = false) => {
    try {
      exportEmployeeImportTemplate(branches, departments, emptyOnly);
    } catch (err: any) {
      alert(`حدث خطأ أثناء تصدير القالب: ${err?.message || err}`);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;
    processFile(selectedFile);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    const droppedFile = e.dataTransfer.files?.[0];
    if (droppedFile) {
      processFile(droppedFile);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const processFile = (f: File) => {
    setFile(f);
    setErrorMessage(null);
    setIsProcessing(true);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const buffer = evt.target?.result as ArrayBuffer;
        const rows = parseEmployeesFromExcel(buffer, branches, departments, existingEmployees);
        if (rows.length === 0) {
          setErrorMessage('لم يتم العثور على أي صفوف أو بيانات صالحة للموظفين داخل الملف. يرجى التأكد من استخدام القالب القياسي.');
          setParsedRows([]);
          setSelectedIndices(new Set());
        } else {
          setParsedRows(rows);
          // By default, select all valid rows
          const validSet = new Set<number>(
            rows.filter((r) => r.isValid).map((r) => r.index)
          );
          setSelectedIndices(validSet);
        }
      } catch (err: any) {
        console.error('Error parsing excel:', err);
        setErrorMessage(`تعذر قراءة ملف الإكسيل: ${err?.message || 'تنسيق غير مدعوم'}`);
        setParsedRows([]);
        setSelectedIndices(new Set());
      } finally {
        setIsProcessing(false);
      }
    };

    reader.onerror = () => {
      setErrorMessage('حدث خطأ أثناء قراءة الملف من جهازك.');
      setIsProcessing(false);
    };

    reader.readAsArrayBuffer(f);
  };

  const toggleSelectRow = (index: number) => {
    setSelectedIndices((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };

  const toggleSelectAll = () => {
    const visibleRows = filteredRows;
    const allVisibleSelected = visibleRows.every((r) => selectedIndices.has(r.index));
    if (allVisibleSelected) {
      setSelectedIndices((prev) => {
        const next = new Set(prev);
        visibleRows.forEach((r) => next.delete(r.index));
        return next;
      });
    } else {
      setSelectedIndices((prev) => {
        const next = new Set(prev);
        visibleRows.filter((r) => r.isValid).forEach((r) => next.add(r.index));
        return next;
      });
    }
  };

  const handleResetFile = () => {
    setFile(null);
    setParsedRows([]);
    setSelectedIndices(new Set());
    setErrorMessage(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const filteredRows = parsedRows.filter((row) => {
    if (filterMode === 'valid') {
      return row.isValid && row.warnings.length === 0;
    }
    if (filterMode === 'issues') {
      return !row.isValid || row.warnings.length > 0;
    }
    return true;
  });

  const selectedRows = parsedRows.filter((r) => selectedIndices.has(r.index) && r.isValid);
  const totalSalaries = selectedRows.reduce((sum, r) => sum + (r.basicSalary || 0), 0);
  const distinctBranchesCount = new Set(selectedRows.map((r) => r.branchId)).size;

  const handleConfirmImport = () => {
    if (selectedRows.length === 0) {
      alert('يرجى تحديد موظف واحد على الأقل للاستيراد.');
      return;
    }

    const payload: Partial<Employee>[] = selectedRows.map((r) => ({
      civilId: r.civilId,
      fullName: r.fullName,
      branchId: r.branchId,
      departmentId: r.departmentId,
      basicSalary: r.basicSalary,
      dailyHours: r.dailyHours,
      bankName: r.bankName,
      iban: r.iban,
      bankTransferAmount: r.bankTransferAmount,
      residenceExpiryDate: r.residenceExpiryDate,
      status: r.status,
    }));

    onImportSuccess(payload, updateExistingIfCivilIdMatches);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-5xl overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Header */}
        <div className="bg-slate-900 text-white p-4 sm:p-5 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center shadow-xs">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-white flex items-center gap-2">
                <span>استيراد بيانات الموظفين عبر ملف Excel</span>
                <span className="text-[11px] font-bold bg-emerald-950 text-emerald-300 px-2 py-0.5 rounded-full border border-emerald-800">
                  .xlsx / .xls
                </span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                تعبئة موظفي المنشأة دفعة واحدة بالرواتب، الأرقام المدنية، وصلاحيات الإقامة
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => handleDownloadTemplate(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition shadow-xs"
              title="تنزيل نموذج إكسيل فارغ جاهز للتعبئة مباشرة"
            >
              <Download className="w-3.5 h-3.5" />
              <span>تنزيل قالب فارغ</span>
            </button>

            <button
              type="button"
              onClick={() => handleDownloadTemplate(false)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-emerald-400 border border-emerald-600/40 text-xs font-bold transition shadow-xs"
              title="تنزيل قالب إكسيل معبأ بأمثلة توضيحية ودليل الفروع والبنوك"
            >
              <Download className="w-3.5 h-3.5" />
              <span>قالب مع أمثلة</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition"
              title="إغلاق"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4 flex-1">
          
          {/* File Upload Dropzone (When no file is selected yet) */}
          {!file && (
            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-slate-300 hover:border-emerald-500 bg-slate-50 hover:bg-emerald-50/40 rounded-2xl p-8 sm:p-12 text-center cursor-pointer transition flex flex-col items-center justify-center group"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx, .xls, .csv"
                onChange={handleFileChange}
                className="hidden"
              />

              <div className="w-16 h-16 rounded-2xl bg-white shadow-md border border-slate-200 text-emerald-600 group-hover:scale-110 flex items-center justify-center mb-3 transition">
                <Upload className="w-8 h-8" />
              </div>

              <h4 className="text-sm font-black text-slate-800 mb-1">
                اسحب ملف الإكسيل هنا أو <span className="text-emerald-600 underline">اضغط للاختيار من جهازك</span>
              </h4>
              <p className="text-xs text-slate-500 max-w-md">
                يدعم الملفات بصيغة Excel (.xlsx, .xls) أو CSV. يتم التعرف التلقائي على الأعمدة باللغة العربية أو الإنجليزية.
              </p>

              <div className="mt-4 flex flex-wrap items-center justify-center gap-2 text-[11px] text-slate-600">
                <span className="bg-white px-2.5 py-1 rounded-lg border border-slate-200 font-bold">
                  ✓ الرقم المدني (12 رقماً)
                </span>
                <span className="bg-white px-2.5 py-1 rounded-lg border border-slate-200 font-bold">
                  ✓ اسم الموظف بالكامل
                </span>
                <span className="bg-white px-2.5 py-1 rounded-lg border border-slate-200 font-bold">
                  ✓ الراتب والتحويل البنكي
                </span>
                <span className="bg-white px-2.5 py-1 rounded-lg border border-slate-200 font-bold">
                  ✓ انتهاء الإقامة (YYYY-MM-DD)
                </span>
              </div>
            </div>
          )}

          {/* Loading Indicator */}
          {isProcessing && (
            <div className="p-8 text-center bg-slate-50 rounded-2xl border border-slate-200 flex flex-col items-center justify-center gap-3">
              <div className="w-8 h-8 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin" />
              <span className="text-xs font-bold text-slate-700">جاري قراءة وتحليل بيانات ملف الإكسيل وفحص الأرقام المدنية...</span>
            </div>
          )}

          {/* Error Message */}
          {errorMessage && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 font-bold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* File Selected & Preview Available */}
          {file && parsedRows.length > 0 && (
            <div className="space-y-4">
              
              {/* Top Meta Bar */}
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-emerald-100 text-emerald-800 rounded-lg">
                    <FileSpreadsheet className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="font-bold text-slate-800 block">{file.name}</span>
                    <span className="text-[11px] text-slate-500">
                      تم استخراج {parsedRows.length} صفوف &bull; {(file.size / 1024).toFixed(1)} كيلوبايت
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleResetFile}
                    className="px-2.5 py-1 text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-100 rounded-lg border border-slate-300 font-bold transition text-[11px]"
                  >
                    تغيير الملف
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDownloadTemplate(false)}
                    className="px-2.5 py-1 text-emerald-700 hover:text-emerald-900 bg-emerald-50 hover:bg-emerald-100 rounded-lg border border-emerald-200 font-bold transition text-[11px] flex items-center gap-1"
                  >
                    <Download className="w-3 h-3" />
                    <span>تنزيل القالب</span>
                  </button>
                </div>
              </div>

              {/* Filter Tabs & Summary Counters */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl text-xs">
                  <button
                    type="button"
                    onClick={() => setFilterMode('all')}
                    className={`px-3 py-1 rounded-lg font-bold transition ${
                      filterMode === 'all'
                        ? 'bg-white text-slate-900 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    كافة الصفوف ({parsedRows.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setFilterMode('valid')}
                    className={`px-3 py-1 rounded-lg font-bold transition ${
                      filterMode === 'valid'
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'text-emerald-700 hover:text-emerald-900'
                    }`}
                  >
                    سليم وجاهز ({parsedRows.filter((r) => r.isValid && r.warnings.length === 0).length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setFilterMode('issues')}
                    className={`px-3 py-1 rounded-lg font-bold transition ${
                      filterMode === 'issues'
                        ? 'bg-amber-600 text-white shadow-xs'
                        : 'text-amber-700 hover:text-amber-900'
                    }`}
                  >
                    ملاحظات وتنبيهات ({parsedRows.filter((r) => !r.isValid || r.warnings.length > 0).length})
                  </button>
                </div>

                <div className="flex items-center gap-2 text-xs">
                  <button
                    type="button"
                    onClick={toggleSelectAll}
                    className="text-blue-600 hover:underline font-bold text-xs"
                  >
                    {filteredRows.every((r) => selectedIndices.has(r.index)) ? 'إلغاء تحديد المعروض' : 'تحديد كافة المعروض'}
                  </button>
                  <span className="text-slate-300">|</span>
                  <span className="font-bold text-slate-700">
                    المحدد: <strong className="text-emerald-700 font-mono">{selectedRows.length}</strong> من أصل {parsedRows.length}
                  </span>
                </div>
              </div>

              {/* Table of Parsed Employees */}
              <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
                <div className="overflow-x-auto max-h-[42vh]">
                  <table className="w-full text-right text-xs">
                    <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200 sticky top-0 z-10">
                      <tr>
                        <th className="p-2.5 w-10 text-center">
                          <input
                            type="checkbox"
                            checked={filteredRows.length > 0 && filteredRows.every((r) => selectedIndices.has(r.index))}
                            onChange={toggleSelectAll}
                            className="w-4 h-4 text-emerald-600 rounded"
                          />
                        </th>
                        <th className="p-2.5 w-10 text-center">#</th>
                        <th className="p-2.5">الموظف</th>
                        <th className="p-2.5">الرقم المدني</th>
                        <th className="p-2.5">الفرع والقسم</th>
                        <th className="p-2.5 text-left">الراتب الأساسي</th>
                        <th className="p-2.5 text-center">ساعات</th>
                        <th className="p-2.5">البنك وطريقة الصرف</th>
                        <th className="p-2.5">انتهاء الإقامة</th>
                        <th className="p-2.5 text-center">فحص السجل</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredRows.length === 0 ? (
                        <tr>
                          <td colSpan={10} className="p-8 text-center text-slate-400">
                            لا توجد صفوف تطابق عامل التصفية المحدد.
                          </td>
                        </tr>
                      ) : (
                        filteredRows.map((row) => {
                          const isSelected = selectedIndices.has(row.index);
                          return (
                            <tr
                              key={row.index}
                              className={`transition ${
                                !row.isValid
                                  ? 'bg-rose-50/60 text-slate-500'
                                  : isSelected
                                  ? 'bg-emerald-50/40 hover:bg-emerald-50/70'
                                  : 'hover:bg-slate-50'
                              }`}
                            >
                              <td className="p-2.5 text-center">
                                <input
                                  type="checkbox"
                                  disabled={!row.isValid}
                                  checked={isSelected}
                                  onChange={() => toggleSelectRow(row.index)}
                                  className="w-4 h-4 text-emerald-600 rounded disabled:opacity-30 cursor-pointer"
                                />
                              </td>
                              <td className="p-2.5 text-center font-mono text-slate-400">
                                {row.index}
                              </td>
                              <td className="p-2.5 font-bold text-slate-900">
                                {row.fullName || (
                                  <span className="text-rose-600 font-normal">اسم مفقود</span>
                                )}
                              </td>
                              <td className="p-2.5 font-mono">
                                <span className={row.civilId.length === 12 ? 'text-slate-800' : 'text-amber-700 font-bold'}>
                                  {row.civilId}
                                </span>
                              </td>
                              <td className="p-2.5 text-slate-700">
                                <div>{row.branchName}</div>
                                <div className="text-[10px] text-slate-400">{row.departmentName}</div>
                              </td>
                              <td className="p-2.5 text-left font-mono font-bold text-slate-900">
                                {row.basicSalary.toFixed(3)} د.ك
                              </td>
                              <td className="p-2.5 text-center font-mono">
                                {row.dailyHours}س
                              </td>
                              <td className="p-2.5 text-slate-700 text-[11px]">
                                <div className="truncate max-w-[130px]" title={row.bankName}>
                                  {row.bankName}
                                </div>
                                {row.bankTransferAmount > 0 ? (
                                  <span className="text-[10px] text-emerald-700 font-bold">
                                    تحويل {row.bankTransferAmount.toFixed(3)} د.ك
                                  </span>
                                ) : (
                                  <span className="text-[10px] text-slate-400">نقداً كامل</span>
                                )}
                              </td>
                              <td className="p-2.5 font-mono text-[11px] text-slate-700">
                                {row.residenceExpiryDate}
                              </td>
                              <td className="p-2.5 text-center">
                                {!row.isValid ? (
                                  <span
                                    className="inline-flex items-center gap-1 bg-rose-100 text-rose-800 px-2 py-0.5 rounded text-[10px] font-bold"
                                    title={row.errors.join(' | ')}
                                  >
                                    <AlertCircle className="w-3 h-3 text-rose-600" />
                                    <span>خطأ</span>
                                  </span>
                                ) : row.warnings.length > 0 ? (
                                  <span
                                    className="inline-flex items-center gap-1 bg-amber-100 text-amber-900 px-2 py-0.5 rounded text-[10px] font-bold cursor-help"
                                    title={row.warnings.join(' | ')}
                                  >
                                    <AlertTriangle className="w-3 h-3 text-amber-600" />
                                    <span>تنبيه ({row.warnings.length})</span>
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded text-[10px] font-bold">
                                    <Check className="w-3 h-3 text-emerald-600" />
                                    <span>سليم</span>
                                  </span>
                                )}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Import Options & Summary Stats Card */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                
                {/* Option: Update if Civil ID already exists */}
                <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-800">
                  <input
                    type="checkbox"
                    checked={updateExistingIfCivilIdMatches}
                    onChange={(e) => setUpdateExistingIfCivilIdMatches(e.target.checked)}
                    className="w-4 h-4 text-emerald-600 rounded"
                  />
                  <span>تحديث بيانات الموظف إذا كان الرقم المدني مسجلاً مسبقاً في النظام</span>
                </label>

                {/* Totals Summary */}
                <div className="flex flex-wrap items-center gap-3 text-xs">
                  <div className="bg-white px-3 py-1.5 rounded-lg border border-slate-200">
                    <span className="text-slate-500 font-normal">الموظفون المعتمدون: </span>
                    <strong className="text-emerald-700 font-mono text-sm">{selectedRows.length}</strong>
                  </div>

                  <div className="bg-white px-3 py-1.5 rounded-lg border border-slate-200">
                    <span className="text-slate-500 font-normal">إجمالي الرواتب: </span>
                    <strong className="text-slate-900 font-mono text-sm">{totalSalaries.toFixed(3)} د.ك</strong>
                  </div>

                  <div className="bg-white px-3 py-1.5 rounded-lg border border-slate-200">
                    <span className="text-slate-500 font-normal">الفروع: </span>
                    <strong className="text-slate-800 font-mono">{distinctBranchesCount}</strong>
                  </div>
                </div>

              </div>

            </div>
          )}

        </div>

        {/* Footer Actions */}
        <div className="bg-slate-50 p-4 border-t border-slate-200 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-slate-600 hover:text-slate-900 font-bold text-xs rounded-xl transition"
          >
            إلغاء
          </button>

          <div className="flex items-center gap-2">
            {file && (
              <button
                type="button"
                onClick={handleResetFile}
                className="px-3.5 py-2 text-slate-700 bg-white hover:bg-slate-100 font-bold text-xs rounded-xl border border-slate-300 transition"
              >
                اختيار ملف آخر
              </button>
            )}

            <button
              type="button"
              disabled={selectedRows.length === 0}
              onClick={handleConfirmImport}
              className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-bold text-xs px-5 py-2.5 rounded-xl shadow-md transition active:scale-95"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>تأكيد استيراد ({selectedRows.length}) موظفاً</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
