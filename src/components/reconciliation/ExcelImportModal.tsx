import React, { useState } from 'react';
import * as XLSX from 'xlsx';
import {
  Upload,
  FileSpreadsheet,
  AlertCircle,
  CheckCircle2,
  Trash2,
  ArrowRight,
  Info,
  Building2,
  BookOpen
} from 'lucide-react';
import { BankStatementTransaction, AccountingTransaction } from '../../types/reconciliationTypes';
import { extractChequeNumber, extractKnetTerminalId } from '../../utils/reconciliationEngine';

interface ExcelImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  importTarget?: 'bank' | 'app';
  onImportBankSuccess?: (importedRows: BankStatementTransaction[]) => void;
  onImportAppSuccess?: (importedRows: AccountingTransaction[]) => void;
  currency: string;
}

interface BankColumnMapping {
  transactionDate: string;
  referenceNumber: string;
  description: string;
  debit: string;
  credit: string;
  netAmount: string;
  balanceAfter: string;
  partyName: string;
  chequeNumber: string;
  transferNumber: string;
}

interface AppColumnMapping {
  entryDate: string;
  referenceNumber: string;
  journalEntryNumber: string;
  description: string;
  counterAccountName: string;
  debit: string;
  credit: string;
  netAmount: string;
  chequeNumber: string;
  transferNumber: string;
  partyName: string;
}

// Helper to parse signed numbers with currency symbols, parentheses e.g. "(15.000)" or "-15.000" or "+500.000"
function parseSignedAmount(val: any): number {
  if (val === undefined || val === null || val === '') return 0;
  if (typeof val === 'number') return val;
  let str = String(val).trim();
  let isNegative = false;
  if (str.startsWith('(') && str.endsWith(')')) {
    isNegative = true;
    str = str.slice(1, -1);
  } else if (str.startsWith('-') || str.endsWith('-')) {
    isNegative = true;
    str = str.replace(/-/g, '');
  } else if (str.startsWith('+')) {
    str = str.replace(/\+/g, '');
  }
  // Check for DR/CR indicator in Arabic or English
  if (/dr\b|مدين/i.test(str)) {
    isNegative = true;
  }
  str = str.replace(/[^\d.]/g, '');
  const num = parseFloat(str) || 0;
  return isNegative ? -num : num;
}

export function ExcelImportModal({
  isOpen,
  onClose,
  importTarget = 'bank',
  onImportBankSuccess,
  onImportAppSuccess,
  currency,
}: ExcelImportModalProps) {
  const [activeTarget, setActiveTarget] = useState<'bank' | 'app'>(importTarget);
  const [file, setFile] = useState<File | null>(null);
  const [rawHeaders, setRawHeaders] = useState<string[]>([]);
  const [rawRows, setRawRows] = useState<any[]>([]);

  const [bankMapping, setBankMapping] = useState<BankColumnMapping>({
    transactionDate: '',
    referenceNumber: '',
    description: '',
    debit: '',
    credit: '',
    netAmount: '',
    balanceAfter: '',
    partyName: '',
    chequeNumber: '',
    transferNumber: '',
  });

  const [appMapping, setAppMapping] = useState<AppColumnMapping>({
    entryDate: '',
    referenceNumber: '',
    journalEntryNumber: '',
    description: '',
    counterAccountName: '',
    debit: '',
    credit: '',
    netAmount: '',
    chequeNumber: '',
    transferNumber: '',
    partyName: '',
  });

  const [step, setStep] = useState<'upload' | 'mapping' | 'preview'>('upload');
  const [parsedBankTx, setParsedBankTx] = useState<BankStatementTransaction[]>([]);
  const [parsedAppTx, setParsedAppTx] = useState<AccountingTransaction[]>([]);
  const [validationErrors, setValidationErrors] = useState<{ row: number; error: string }[]>([]);

  if (!isOpen) return null;

  // Handle file selection
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;

    setFile(selected);
    try {
      const data = await selected.arrayBuffer();
      const workbook = XLSX.read(data, { cellDates: true });
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];

      const json: any[] = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });
      if (!json || json.length < 2) {
        alert('الملف فارغ أو لا يحتوي على صفوف بيانات كافية');
        return;
      }

      // Find header row (first non-empty row)
      const headerRowIdx = json.findIndex((r: any[]) => r.some((c) => c !== ''));
      if (headerRowIdx === -1) {
        alert('تعذر قراءة عناوين الأعمدة من الملف');
        return;
      }

      const headers: string[] = (json[headerRowIdx] as any[]).map((h) => String(h || '').trim());
      const dataRows = json.slice(headerRowIdx + 1).filter((r: any[]) => r.some((c) => c !== ''));

      setRawHeaders(headers);
      setRawRows(dataRows);

      if (activeTarget === 'bank') {
        // Auto-detect Bank columns
        const bMap: BankColumnMapping = {
          transactionDate: '',
          referenceNumber: '',
          description: '',
          debit: '',
          credit: '',
          netAmount: '',
          balanceAfter: '',
          partyName: '',
          chequeNumber: '',
          transferNumber: '',
        };

        headers.forEach((h) => {
          const lower = h.toLowerCase().trim();
          if (lower.includes('date') || lower.includes('تاريخ') || lower.includes('التاريخ') || lower.includes('posting') || lower.includes('value date')) {
            bMap.transactionDate = h;
          } else if (
            lower.includes('ref') ||
            lower.includes('مرجع') ||
            lower.includes('المرجع') ||
            lower.includes('رقم العملية') ||
            lower.includes('رقم المرجع') ||
            lower.includes('رقم الحركة') ||
            lower.includes('سند') ||
            lower.includes('doc')
          ) {
            bMap.referenceNumber = h;
          } else if (
            lower.includes('desc') ||
            lower.includes('بيان') ||
            lower.includes('البيان') ||
            lower.includes('وصف') ||
            lower.includes('تفاصيل') ||
            lower.includes('شرح') ||
            lower.includes('particulars') ||
            lower.includes('narrative')
          ) {
            bMap.description = h;
          } else if (lower.includes('debit') || lower.includes('مدين') || lower.includes('سحب') || lower.includes('صرف') || lower.includes('خصم')) {
            bMap.debit = h;
          } else if (lower.includes('credit') || lower.includes('دائن') || lower.includes('إيداع') || lower.includes('مقبوضات')) {
            bMap.credit = h;
          } else if (
            lower.includes('amount') ||
            lower.includes('المبلغ') ||
            lower.includes('مبلغ') ||
            lower.includes('القيمة') ||
            lower.includes('قيمة') ||
            lower.includes('قيمة الحركة') ||
            lower.includes('صافي') ||
            lower.includes('net') ||
            lower.includes('حركة')
          ) {
            bMap.netAmount = h;
          } else if (lower.includes('balance') || lower.includes('رصيد') || lower.includes('الرصيد')) {
            bMap.balanceAfter = h;
          } else if (lower.includes('party') || lower.includes('مستفيد') || lower.includes('الطرف') || lower.includes('المودع') || lower.includes('مودع')) {
            bMap.partyName = h;
          } else if (lower.includes('cheque') || lower.includes('شيك') || lower.includes('chk') || lower.includes('chq')) {
            bMap.chequeNumber = h;
          } else if (lower.includes('transfer') || lower.includes('تحويل') || lower.includes('trf') || lower.includes('trsh_number') || lower.includes('ibnk_trs')) {
            bMap.transferNumber = h;
          }
        });

        // Smart Single Amount Column fallback:
        if ((!bMap.debit || !bMap.credit) && !bMap.netAmount) {
          const singleAmountCandidate = headers.find((h) => /مبلغ|قيمة|amount|net|حركة|رصيد الحركة/i.test(h));
          if (singleAmountCandidate) bMap.netAmount = singleAmountCandidate;
        }

        // If only debit was mapped to a column named "المبلغ", shift to netAmount
        if (bMap.debit && !bMap.credit && !bMap.netAmount && /مبلغ|amount|قيمة/i.test(bMap.debit)) {
          bMap.netAmount = bMap.debit;
          bMap.debit = '';
        }

        // If description is missing but reference exists (like in Kuwait bank statements where "مرجع" contains the narration)
        if (!bMap.description && bMap.referenceNumber) {
          bMap.description = bMap.referenceNumber;
        }

        // Auto map TRSH_NUMBER or sequence number if present
        const trshCandidate = headers.find((h) => /trsh_number|trs_seq|seq_num|ibnk_trs/i.test(h));
        if (trshCandidate && !bMap.transferNumber) {
          bMap.transferNumber = trshCandidate;
        }

        setBankMapping(bMap);
      } else {
        // Auto-detect App/Accounting columns
        const aMap: AppColumnMapping = {
          entryDate: '',
          referenceNumber: '',
          journalEntryNumber: '',
          description: '',
          counterAccountName: '',
          debit: '',
          credit: '',
          netAmount: '',
          chequeNumber: '',
          transferNumber: '',
          partyName: '',
        };

        headers.forEach((h) => {
          const lower = h.toLowerCase().trim();
          if (lower.includes('تاريخ') || lower.includes('date')) {
            aMap.entryDate = h;
          } else if (lower.includes('سند') || lower.includes('مرجع') || lower.includes('ref')) {
            aMap.referenceNumber = h;
          } else if (lower.includes('قيد') || lower.includes('journal') || lower.includes('jv')) {
            aMap.journalEntryNumber = h;
          } else if (lower.includes('بيان') || lower.includes('وصف') || lower.includes('desc') || lower.includes('شرح')) {
            aMap.description = h;
          } else if (lower.includes('حساب') || lower.includes('طرف') || lower.includes('عميل') || lower.includes('مورد')) {
            aMap.counterAccountName = h;
          } else if (lower.includes('مدين') || lower.includes('إيداع') || lower.includes('قبض') || lower.includes('debit')) {
            aMap.debit = h;
          } else if (lower.includes('دائن') || lower.includes('صرف') || lower.includes('سحب') || lower.includes('credit')) {
            aMap.credit = h;
          } else if (lower.includes('شيك') || lower.includes('cheque') || lower.includes('chk')) {
            aMap.chequeNumber = h;
          } else if (lower.includes('تحويل') || lower.includes('transfer') || lower.includes('trf')) {
            aMap.transferNumber = h;
          } else if (lower.includes('مستفيد') || lower.includes('الطرف')) {
            aMap.partyName = h;
          }
        });

        // If reference is not mapped, use journalEntryNumber as reference fallback
        if (!aMap.referenceNumber && aMap.journalEntryNumber) {
          aMap.referenceNumber = aMap.journalEntryNumber;
        }

        setAppMapping(aMap);
      }

      setStep('mapping');
    } catch (err) {
      alert('حدث خطأ أثناء قراءة الملف. يرجى التأكد من صحة تنسيق Excel أو CSV.');
    }
  };

  // Convert raw rows and validate for preview
  const handleProceedToPreview = () => {
    const errors: { row: number; error: string }[] = [];
    const getIdx = (colName: string) => rawHeaders.indexOf(colName);

    if (activeTarget === 'bank') {
      if (!bankMapping.transactionDate || !bankMapping.description) {
        alert('يرجى ربط عمود تاريخ العملية وعمود البيان على الأقل للمتابعة');
        return;
      }

      const dateIdx = getIdx(bankMapping.transactionDate);
      const refIdx = getIdx(bankMapping.referenceNumber);
      const descIdx = getIdx(bankMapping.description);
      const debitIdx = getIdx(bankMapping.debit);
      const creditIdx = getIdx(bankMapping.credit);
      const netIdx = getIdx(bankMapping.netAmount);
      const balIdx = getIdx(bankMapping.balanceAfter);
      const partyIdx = getIdx(bankMapping.partyName);
      const chkIdx = getIdx(bankMapping.chequeNumber);
      const trfIdx = getIdx(bankMapping.transferNumber);

      const seenRefs = new Set<string>();
      const transactions: BankStatementTransaction[] = [];

      rawRows.forEach((row, index) => {
        const rowNum = index + 2;
        let dateVal = row[dateIdx];
        let formattedDate = '';
        if (dateVal instanceof Date) {
          formattedDate = dateVal.toISOString().substring(0, 10);
        } else {
          formattedDate = String(dateVal || '').trim();
          if (formattedDate.includes('/')) {
            const parts = formattedDate.split('/');
            if (parts.length === 3) {
              formattedDate = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
            }
          }
        }

        if (!formattedDate || isNaN(Date.parse(formattedDate))) {
          errors.push({ row: rowNum, error: `تاريخ غير صحيح (${dateVal || 'فارغ'})` });
        }

        const refVal = refIdx >= 0 ? String(row[refIdx] || '').trim() : `BANK-REF-${rowNum}`;
        const descVal = descIdx >= 0 ? String(row[descIdx] || '').trim() : (refIdx >= 0 && refVal ? refVal : 'عملية بنكية');

        let debitVal = debitIdx >= 0 ? parseSignedAmount(row[debitIdx]) : 0;
        let creditVal = creditIdx >= 0 ? parseSignedAmount(row[creditIdx]) : 0;

        // If netAmount (single +/- column) is mapped
        if (netIdx >= 0) {
          const netParsed = parseSignedAmount(row[netIdx]);
          if (netParsed < 0) {
            debitVal = Math.abs(netParsed);
            creditVal = 0;
          } else if (netParsed > 0) {
            creditVal = netParsed;
            debitVal = 0;
          }
        } else {
          // If debit column actually contained negative numbers e.g. -15.000 or (15.000)
          if (debitVal < 0) {
            creditVal = Math.abs(debitVal);
            debitVal = 0;
          }
          if (creditVal < 0) {
            debitVal = Math.abs(creditVal);
            creditVal = 0;
          }
        }

        if (debitVal === 0 && creditVal === 0) {
          errors.push({ row: rowNum, error: 'العملية بدون قيمة مالية (مدين ودائن صفر)' });
        }

        const netAmount = creditVal - debitVal;
        const balVal = balIdx >= 0 ? parseSignedAmount(row[balIdx]) : 0;

        // Note: In bank statements, multiple rows frequently share the same reference (e.g. daily KNet settlement or cash deposit batches).
        // This is normal and allowed in bank statements.
        if (refVal) {
          seenRefs.add(refVal);
        }

        // Smart Extraction: Extract Cheque Number from reference, description, or cheque column
        let chkVal = chkIdx >= 0 ? String(row[chkIdx] || '').trim() : '';
        if (!chkVal) {
          chkVal = extractChequeNumber(refVal, descVal) || '';
        }

        // Smart Extraction: Extract KNET Terminal ID (TID) from reference or description
        let tidVal = extractKnetTerminalId(refVal, descVal) || '';

        // Smart Extraction: Extract Depositor / Party Name if mentioned in reference
        let partyVal = partyIdx >= 0 ? String(row[partyIdx] || '').trim() : undefined;
        if (!partyVal) {
          const depMatch = `${refVal} ${descVal}`.match(/(?:المودع|مودع|بواسطة|من|لأمر|لصالح)\s*[:\s]\s*([^\d,;\n]+)/i);
          if (depMatch) partyVal = depMatch[1].trim();
        }

        transactions.push({
          id: `imported-bank-${Date.now()}-${index}`,
          importId: `imp-b-${Date.now()}`,
          rowNumber: rowNum,
          transactionDate: formattedDate,
          referenceNumber: refVal,
          description: descVal,
          debit: Math.abs(debitVal),
          credit: Math.abs(creditVal),
          netAmount,
          balanceAfter: balVal,
          partyName: partyVal,
          chequeNumber: chkVal || undefined,
          transferNumber: trfIdx >= 0 ? String(row[trfIdx] || '').trim() : undefined,
          terminalId: tidVal || undefined,
          matchStatus: 'unmatched',
          hasError: errors.some((e) => e.row === rowNum),
        });
      });

      setValidationErrors(errors);
      setParsedBankTx(transactions);
      setStep('preview');
    } else {
      // Application / Accounting Preview
      if (!appMapping.entryDate || !appMapping.description) {
        alert('يرجى ربط عمود تاريخ القيد وعمود البيان على الأقل للمتابعة');
        return;
      }

      const dateIdx = getIdx(appMapping.entryDate);
      const refIdx = getIdx(appMapping.referenceNumber);
      const jvIdx = getIdx(appMapping.journalEntryNumber);
      const descIdx = getIdx(appMapping.description);
      const counterIdx = getIdx(appMapping.counterAccountName);
      const debitIdx = getIdx(appMapping.debit);
      const creditIdx = getIdx(appMapping.credit);
      const netIdx = getIdx(appMapping.netAmount);
      const chkIdx = getIdx(appMapping.chequeNumber);
      const trfIdx = getIdx(appMapping.transferNumber);
      const partyIdx = getIdx(appMapping.partyName);

      const accTransactions: AccountingTransaction[] = [];

      rawRows.forEach((row, index) => {
        const rowNum = index + 2;
        let dateVal = row[dateIdx];
        let formattedDate = '';
        if (dateVal instanceof Date) {
          formattedDate = dateVal.toISOString().substring(0, 10);
        } else {
          formattedDate = String(dateVal || '').trim();
          if (formattedDate.includes('/')) {
            const parts = formattedDate.split('/');
            if (parts.length === 3) {
              formattedDate = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
            }
          }
        }

        if (!formattedDate || isNaN(Date.parse(formattedDate))) {
          errors.push({ row: rowNum, error: `تاريخ غير صحيح (${dateVal || 'فارغ'})` });
        }

        const jvVal = jvIdx >= 0 ? String(row[jvIdx] || '').trim() : `JV-${rowNum}`;
        const refVal = refIdx >= 0 ? String(row[refIdx] || '').trim() : (jvIdx >= 0 && jvVal ? jvVal : `APP-REF-${rowNum}`);
        const descVal = descIdx >= 0 ? String(row[descIdx] || '').trim() : 'حركة دفترية بالتطبيق';
        const counterVal = counterIdx >= 0 ? String(row[counterIdx] || '').trim() : 'حساب عام';

        let debitVal = debitIdx >= 0 ? parseSignedAmount(row[debitIdx]) : 0;
        let creditVal = creditIdx >= 0 ? parseSignedAmount(row[creditIdx]) : 0;

        if (netIdx >= 0) {
          const netParsed = parseSignedAmount(row[netIdx]);
          if (netParsed > 0) {
            debitVal = netParsed;
            creditVal = 0;
          } else if (netParsed < 0) {
            creditVal = Math.abs(netParsed);
            debitVal = 0;
          }
        } else {
          if (debitVal < 0) {
            creditVal = Math.abs(debitVal);
            debitVal = 0;
          }
          if (creditVal < 0) {
            debitVal = Math.abs(creditVal);
            creditVal = 0;
          }
        }

        if (debitVal === 0 && creditVal === 0) {
          errors.push({ row: rowNum, error: 'العملية بدون قيمة مالية (مدين ودائن صفر)' });
        }

        const netAmount = debitVal - creditVal;

        // Smart Extraction for Accounting: Extract Cheque Number if not explicitly mapped
        let accChkVal = chkIdx >= 0 ? String(row[chkIdx] || '').trim() : '';
        if (!accChkVal) {
          accChkVal = extractChequeNumber(refVal, `${descVal} ${counterVal}`) || '';
        }

        // Smart Extraction for Accounting: Extract KNET Terminal ID (TID) from reference or description
        let accTidVal = extractKnetTerminalId(refVal, `${descVal} ${counterVal}`) || '';

        accTransactions.push({
          id: `imported-app-${Date.now()}-${index}`,
          journalEntryNumber: jvVal,
          entryDate: formattedDate,
          referenceNumber: refVal,
          description: descVal,
          counterAccountName: counterVal,
          counterAccountCode: '1010',
          debit: Math.abs(debitVal),
          credit: Math.abs(creditVal),
          netAmount,
          chequeNumber: accChkVal || undefined,
          transferNumber: trfIdx >= 0 ? String(row[trfIdx] || '').trim() : undefined,
          terminalId: accTidVal || undefined,
          partyName: partyIdx >= 0 ? String(row[partyIdx] || '').trim() : counterVal,
          createdBy: 'استيراد إكسيل التطبيق',
          status: 'posted',
          sourceModule: 'general_ledger',
          matchStatus: 'unmatched',
        });
      });

      setValidationErrors(errors);
      setParsedAppTx(accTransactions);
      setStep('preview');
    }
  };

  // Final Confirmation
  const handleConfirmImport = () => {
    if (activeTarget === 'bank') {
      const validRows = parsedBankTx.filter((t) => !t.isExcluded);
      if (validRows.length === 0) {
        alert('لا توجد حركات بنكية صالحة للاستيراد');
        return;
      }
      if (onImportBankSuccess) {
        onImportBankSuccess(validRows);
      }
      onClose();
    } else {
      const validRows = parsedAppTx;
      if (validRows.length === 0) {
        alert('لا توجد حركات دفاتر تطبيق صالحة للاستيراد');
        return;
      }
      if (onImportAppSuccess) {
        onImportAppSuccess(validRows);
      }
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header with Mode Switcher */}
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${activeTarget === 'bank' ? 'bg-emerald-600' : 'bg-blue-600'}`}>
              <FileSpreadsheet className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-black text-sm">
                  {activeTarget === 'bank' ? 'استيراد كشف حساب البنك من Excel / CSV' : 'استيراد دفاتر وحركات التطبيق من Excel / CSV'}
                </h3>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${activeTarget === 'bank' ? 'bg-emerald-500/30 text-emerald-300' : 'bg-blue-500/30 text-blue-300'}`}>
                  {activeTarget === 'bank' ? 'ملف البنك' : 'ملف التطبيق'}
                </span>
              </div>
              <p className="text-slate-400 text-xs">مطابقة وتدقيق الأعمدة بشكل مستقل لبدء عمليات المقارنة المباشرة</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Target Toggle */}
            <div className="bg-slate-800 p-1 rounded-xl flex items-center gap-1 border border-slate-700">
              <button
                type="button"
                onClick={() => {
                  setActiveTarget('bank');
                  setStep('upload');
                  setFile(null);
                }}
                className={`px-3 py-1 text-xs font-bold rounded-lg transition flex items-center gap-1.5 ${
                  activeTarget === 'bank' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-400 hover:text-white'
                }`}
              >
                <Building2 className="w-3.5 h-3.5" />
                <span>كشف البنك</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveTarget('app');
                  setStep('upload');
                  setFile(null);
                }}
                className={`px-3 py-1 text-xs font-bold rounded-lg transition flex items-center gap-1.5 ${
                  activeTarget === 'app' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-400 hover:text-white'
                }`}
              >
                <BookOpen className="w-3.5 h-3.5" />
                <span>دفاتر التطبيق</span>
              </button>
            </div>

            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white text-lg font-bold p-1 rounded-lg hover:bg-slate-800"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Stepper Header */}
        <div className="bg-slate-50 border-b border-slate-200 px-6 py-3 flex items-center justify-between text-xs font-bold">
          <div className={`flex items-center gap-2 ${step === 'upload' ? 'text-blue-600' : 'text-slate-500'}`}>
            <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold">1</span>
            <span>اختيار ورفع ملف {activeTarget === 'bank' ? 'البنك' : 'التطبيق'}</span>
          </div>
          <ArrowRight className="w-4 h-4 text-slate-300" />
          <div className={`flex items-center gap-2 ${step === 'mapping' ? 'text-blue-600' : 'text-slate-500'}`}>
            <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold">2</span>
            <span>ربط وتعيين الأعمدة (Mapping)</span>
          </div>
          <ArrowRight className="w-4 h-4 text-slate-300" />
          <div className={`flex items-center gap-2 ${step === 'preview' ? 'text-blue-600' : 'text-slate-500'}`}>
            <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold">3</span>
            <span>التدقيق والمعاينة والاعتماد</span>
          </div>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto flex-1">
          {step === 'upload' && (
            <div className="flex flex-col items-center justify-center border-2 border-dashed border-slate-300 rounded-2xl p-10 text-center hover:border-blue-500 transition-colors bg-slate-50/50">
              <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-4 ${activeTarget === 'bank' ? 'bg-emerald-100 text-emerald-600' : 'bg-blue-100 text-blue-600'}`}>
                <Upload className="w-8 h-8 animate-bounce" />
              </div>
              <h4 className="text-base font-bold text-slate-800 mb-1">
                اسحب وأفلت ملف {activeTarget === 'bank' ? 'كشف حساب البنك' : 'دفاتر وحركات التطبيق'} هنا
              </h4>
              <p className="text-xs text-slate-500 mb-5 max-w-md">
                يدعم صيغ Excel (.xlsx, .xls) وصيغة (.csv). سيقوم النظام بقراءة الأعمدة واكتشاف المبالغ والتواريخ تلقائياً.
              </p>
              
              <label className={`cursor-pointer text-white font-bold text-xs px-6 py-3 rounded-xl shadow-md transition flex items-center gap-2 ${activeTarget === 'bank' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-blue-600 hover:bg-blue-700'}`}>
                <span>تصفح واختيار الملف من جهازك</span>
                <input
                  type="file"
                  accept=".xlsx, .xls, .csv"
                  className="hidden"
                  onChange={handleFileChange}
                />
              </label>
            </div>
          )}

          {step === 'mapping' && (
            <div className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 flex items-center gap-2 text-xs text-blue-800 font-medium">
                <Info className="w-4 h-4 flex-shrink-0 text-blue-600" />
                <span>
                  تم فحص أعمدة ملف {activeTarget === 'bank' ? 'البنك' : 'التطبيق'} بنجاح. يرجى تأكيد مطابقة الحقول الأساسية أدناه.
                </span>
              </div>

              {activeTarget === 'bank' ? (
                /* Bank Mapping Fields */
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      تاريخ العملية (Transaction Date) <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={bankMapping.transactionDate}
                      onChange={(e) => setBankMapping({ ...bankMapping, transactionDate: e.target.value })}
                      className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs font-medium focus:ring-2 focus:ring-emerald-500"
                    >
                      <option value="">-- اختر العمود --</option>
                      {rawHeaders.map((h) => (
                        <option key={h} value={h}>{h}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      البيان / الوصف (Description) <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={bankMapping.description}
                      onChange={(e) => setBankMapping({ ...bankMapping, description: e.target.value })}
                      className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs font-medium focus:ring-2 focus:ring-emerald-500"
                    >
                      <option value="">-- اختر العمود --</option>
                      {rawHeaders.map((h) => (
                        <option key={h} value={h}>{h}</option>
                      ))}
                    </select>
                  </div>

                  {/* Single Amount Column (Kuwati banks +/- amount column) */}
                  <div className="col-span-1 md:col-span-2 bg-emerald-50/80 border border-emerald-300 rounded-xl p-3 shadow-2xs">
                    <label className="block text-xs font-black text-emerald-950 mb-1 flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <span>عمود المبلغ المشترك (+ إيداع / - سحب)</span>
                        <span className="text-[10px] bg-emerald-200 text-emerald-900 px-2 py-0.5 rounded-full font-bold">
                          نمط البنوك الكويتية (CBK / NBK / KFH)
                        </span>
                      </span>
                      {bankMapping.netAmount && (
                        <span className="text-[11px] text-emerald-700 font-bold">
                          ✓ العمود المحدد: ({bankMapping.netAmount})
                        </span>
                      )}
                    </label>
                    <p className="text-[11px] text-emerald-800 mb-2 leading-relaxed font-sans">
                      اختر هذا العمود إذا كان كشف حساب البنك يعرض المدين والدائن في عامود واحد؛ حيث الإيداعات والتحويلات الواردة موجبة (+) والخصومات والشيكات ومصروفات كي نت سالبة (-).
                    </p>
                    <select
                      value={bankMapping.netAmount}
                      onChange={(e) => setBankMapping({ ...bankMapping, netAmount: e.target.value })}
                      className="w-full bg-white border border-emerald-300 rounded-lg p-2 text-xs font-medium focus:ring-2 focus:ring-emerald-500"
                    >
                      <option value="">-- غير محدد (إذا كان لديك عمودان منفصلان للمدين والدائن) --</option>
                      {rawHeaders.map((h) => (
                        <option key={h} value={h}>{h}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      المبلغ المدين / سحب (Debit) - إذا وجد عمود منفصل
                    </label>
                    <select
                      value={bankMapping.debit}
                      onChange={(e) => setBankMapping({ ...bankMapping, debit: e.target.value })}
                      className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs font-medium focus:ring-2 focus:ring-emerald-500"
                    >
                      <option value="">-- غير محدد --</option>
                      {rawHeaders.map((h) => (
                        <option key={h} value={h}>{h}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      المبلغ الدائن / إيداع (Credit) - إذا وجد عمود منفصل
                    </label>
                    <select
                      value={bankMapping.credit}
                      onChange={(e) => setBankMapping({ ...bankMapping, credit: e.target.value })}
                      className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs font-medium focus:ring-2 focus:ring-emerald-500"
                    >
                      <option value="">-- غير محدد --</option>
                      {rawHeaders.map((h) => (
                        <option key={h} value={h}>{h}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      رقم المرجع أو الحركة (Reference No)
                    </label>
                    <select
                      value={bankMapping.referenceNumber}
                      onChange={(e) => setBankMapping({ ...bankMapping, referenceNumber: e.target.value })}
                      className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs font-medium focus:ring-2 focus:ring-emerald-500"
                    >
                      <option value="">-- غير محدد (سيتم توليده تلقائياً) --</option>
                      {rawHeaders.map((h) => (
                        <option key={h} value={h}>{h}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      الرصيد بعد الحركة (Balance After)
                    </label>
                    <select
                      value={bankMapping.balanceAfter}
                      onChange={(e) => setBankMapping({ ...bankMapping, balanceAfter: e.target.value })}
                      className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs font-medium focus:ring-2 focus:ring-emerald-500"
                    >
                      <option value="">-- غير محدد --</option>
                      {rawHeaders.map((h) => (
                        <option key={h} value={h}>{h}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      رقم الشيك (Cheque No)
                    </label>
                    <select
                      value={bankMapping.chequeNumber}
                      onChange={(e) => setBankMapping({ ...bankMapping, chequeNumber: e.target.value })}
                      className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs font-medium focus:ring-2 focus:ring-emerald-500"
                    >
                      <option value="">-- غير محدد --</option>
                      {rawHeaders.map((h) => (
                        <option key={h} value={h}>{h}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      رقم التحويل (Transfer No)
                    </label>
                    <select
                      value={bankMapping.transferNumber}
                      onChange={(e) => setBankMapping({ ...bankMapping, transferNumber: e.target.value })}
                      className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs font-medium focus:ring-2 focus:ring-emerald-500"
                    >
                      <option value="">-- غير محدد --</option>
                      {rawHeaders.map((h) => (
                        <option key={h} value={h}>{h}</option>
                      ))}
                    </select>
                  </div>
                </div>
              ) : (
                /* App/Accounting Mapping Fields */
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      تاريخ القيد / الحركة (Entry Date) <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={appMapping.entryDate}
                      onChange={(e) => setAppMapping({ ...appMapping, entryDate: e.target.value })}
                      className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs font-medium focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">-- اختر العمود --</option>
                      {rawHeaders.map((h) => (
                        <option key={h} value={h}>{h}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      البيان / الوصف (Description) <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={appMapping.description}
                      onChange={(e) => setAppMapping({ ...appMapping, description: e.target.value })}
                      className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs font-medium focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">-- اختر العمود --</option>
                      {rawHeaders.map((h) => (
                        <option key={h} value={h}>{h}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      مدين / إيداع بالبنك (Debit / Received)
                    </label>
                    <select
                      value={appMapping.debit}
                      onChange={(e) => setAppMapping({ ...appMapping, debit: e.target.value })}
                      className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs font-medium focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">-- غير محدد --</option>
                      {rawHeaders.map((h) => (
                        <option key={h} value={h}>{h}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      دائن / صرف من البنك (Credit / Paid)
                    </label>
                    <select
                      value={appMapping.credit}
                      onChange={(e) => setAppMapping({ ...appMapping, credit: e.target.value })}
                      className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs font-medium focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">-- غير محدد --</option>
                      {rawHeaders.map((h) => (
                        <option key={h} value={h}>{h}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      رقم المرجع أو السند (Reference No)
                    </label>
                    <select
                      value={appMapping.referenceNumber}
                      onChange={(e) => setAppMapping({ ...appMapping, referenceNumber: e.target.value })}
                      className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs font-medium focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">-- غير محدد --</option>
                      {rawHeaders.map((h) => (
                        <option key={h} value={h}>{h}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      رقم القيد اليومي (Journal Entry No)
                    </label>
                    <select
                      value={appMapping.journalEntryNumber}
                      onChange={(e) => setAppMapping({ ...appMapping, journalEntryNumber: e.target.value })}
                      className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs font-medium focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">-- غير محدد --</option>
                      {rawHeaders.map((h) => (
                        <option key={h} value={h}>{h}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      الحساب المقابل أو المستفيد (Party / Counter Account)
                    </label>
                    <select
                      value={appMapping.counterAccountName}
                      onChange={(e) => setAppMapping({ ...appMapping, counterAccountName: e.target.value })}
                      className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs font-medium focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">-- غير محدد --</option>
                      {rawHeaders.map((h) => (
                        <option key={h} value={h}>{h}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      رقم الشيك أو التحويل
                    </label>
                    <select
                      value={appMapping.chequeNumber}
                      onChange={(e) => setAppMapping({ ...appMapping, chequeNumber: e.target.value })}
                      className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs font-medium focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">-- غير محدد --</option>
                      {rawHeaders.map((h) => (
                        <option key={h} value={h}>{h}</option>
                      ))}
                    </select>
                  </div>
                </div>
              )}
            </div>
          )}

          {step === 'preview' && (
            <div className="space-y-4">
              {validationErrors.length > 0 ? (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-start gap-2.5">
                  <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div className="text-xs">
                    <span className="font-bold text-amber-900 block mb-1">
                      تم العثور على {validationErrors.length} ملاحظات في الملف:
                    </span>
                    <ul className="list-disc list-inside text-amber-800 space-y-0.5 max-h-24 overflow-y-auto">
                      {validationErrors.slice(0, 5).map((err, i) => (
                        <li key={i}>صف {err.row}: {err.error}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              ) : (
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 flex items-center gap-2 text-xs text-emerald-800 font-bold">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  <span>تم فحص وتدقيق كافة الحركات بنجاح. البيانات جاهزة للاعتماد والبدء في المقارنة.</span>
                </div>
              )}

              {/* Table Preview */}
              <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs">
                <div className="overflow-x-auto max-h-72">
                  <table className="w-full text-right text-xs">
                    <thead className="bg-slate-100 text-slate-700 font-bold sticky top-0 border-b border-slate-200">
                      <tr>
                        <th className="p-2.5">#</th>
                        <th className="p-2.5">التاريخ</th>
                        <th className="p-2.5">المرجع</th>
                        <th className="p-2.5">البيان</th>
                        <th className="p-2.5 text-center">{activeTarget === 'bank' ? 'مدين (سحب)' : 'مدين (إيداع)'}</th>
                        <th className="p-2.5 text-center">{activeTarget === 'bank' ? 'دائن (إيداع)' : 'دائن (صرف)'}</th>
                        <th className="p-2.5 text-center">{activeTarget === 'bank' ? 'الرصيد' : 'الحساب المقابل'}</th>
                        <th className="p-2.5 text-center">إجراء</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-mono">
                      {activeTarget === 'bank' ? (
                        parsedBankTx.map((tx) => (
                          <tr key={tx.id} className="hover:bg-slate-50 transition-colors">
                            <td className="p-2.5 text-slate-500 font-sans">{tx.rowNumber}</td>
                            <td className="p-2.5 font-sans font-bold text-slate-800">{tx.transactionDate}</td>
                            <td className="p-2.5 text-emerald-700 font-semibold">{tx.referenceNumber}</td>
                            <td className="p-2.5 font-sans text-slate-700 max-w-xs truncate">{tx.description}</td>
                            <td className="p-2.5 text-center text-red-600 font-bold">{tx.debit > 0 ? tx.debit.toFixed(3) : '-'}</td>
                            <td className="p-2.5 text-center text-emerald-600 font-bold">{tx.credit > 0 ? tx.credit.toFixed(3) : '-'}</td>
                            <td className="p-2.5 text-center text-slate-800">{tx.balanceAfter > 0 ? tx.balanceAfter.toFixed(3) : '-'}</td>
                            <td className="p-2.5 text-center">
                              <button
                                onClick={() => setParsedBankTx((prev) => prev.filter((t) => t.id !== tx.id))}
                                className="text-slate-400 hover:text-red-500 p-1 rounded-md transition"
                                title="استبعاد"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        ))
                      ) : (
                        parsedAppTx.map((tx, idx) => (
                          <tr key={tx.id} className="hover:bg-slate-50 transition-colors">
                            <td className="p-2.5 text-slate-500 font-sans">{idx + 1}</td>
                            <td className="p-2.5 font-sans font-bold text-slate-800">{tx.entryDate}</td>
                            <td className="p-2.5 text-blue-700 font-semibold">{tx.referenceNumber || tx.journalEntryNumber}</td>
                            <td className="p-2.5 font-sans text-slate-700 max-w-xs truncate">{tx.description}</td>
                            <td className="p-2.5 text-center text-emerald-600 font-bold">{tx.debit > 0 ? tx.debit.toFixed(3) : '-'}</td>
                            <td className="p-2.5 text-center text-red-600 font-bold">{tx.credit > 0 ? tx.credit.toFixed(3) : '-'}</td>
                            <td className="p-2.5 font-sans text-center text-slate-800 truncate max-w-[120px]">{tx.counterAccountName}</td>
                            <td className="p-2.5 text-center">
                              <button
                                onClick={() => setParsedAppTx((prev) => prev.filter((t) => t.id !== tx.id))}
                                className="text-slate-400 hover:text-red-500 p-1 rounded-md transition"
                                title="استبعاد"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-slate-50 border-t border-slate-200 px-6 py-4 flex items-center justify-between">
          {step === 'mapping' && (
            <button
              onClick={() => setStep('upload')}
              className="text-xs font-bold text-slate-600 hover:text-slate-800 px-4 py-2 rounded-xl"
            >
              الرجوع لاختيار ملف آخر
            </button>
          )}

          {step === 'preview' && (
            <button
              onClick={() => setStep('mapping')}
              className="text-xs font-bold text-slate-600 hover:text-slate-800 px-4 py-2 rounded-xl"
            >
              تعديل ربط الأعمدة
            </button>
          )}

          {step === 'upload' && <div />}

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="text-xs font-bold text-slate-600 hover:bg-slate-200 px-4 py-2.5 rounded-xl transition"
            >
              إلغاء
            </button>

            {step === 'mapping' && (
              <button
                onClick={handleProceedToPreview}
                className="text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl shadow-sm transition"
              >
                المعاينة والتحقق من البيانات
              </button>
            )}

            {step === 'preview' && (
              <button
                onClick={handleConfirmImport}
                className={`text-xs font-bold text-white px-5 py-2.5 rounded-xl shadow-md transition flex items-center gap-1.5 ${
                  activeTarget === 'bank' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-blue-600 hover:bg-blue-700'
                }`}
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>
                  {activeTarget === 'bank'
                    ? `اعتماد كشف البنك (${parsedBankTx.length} حركة)`
                    : `اعتماد دفاتر التطبيق (${parsedAppTx.length} حركة)`}
                </span>
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
