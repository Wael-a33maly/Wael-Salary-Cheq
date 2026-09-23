import * as XLSX from 'xlsx';
import {
  BankStatementTransaction,
  BankReconciliationSession,
  AccountingTransaction,
  ReconciliationDifference,
  ReconciliationSummary
} from '../types/reconciliationTypes';

/**
 * Export Reconciliation Report to Excel (.xlsx) with multiple formatted sheets
 */
export function exportReconciliationToExcel(
  session: BankReconciliationSession,
  summary: ReconciliationSummary,
  bankTxList: BankStatementTransaction[],
  accTxList: AccountingTransaction[],
  differences: ReconciliationDifference[]
) {
  const wb = XLSX.utils.book_new();

  // Sheet 1: ملخص مذكرة التسوية البنكية (Reconciliation Summary)
  const summaryData = [
    ['شركة / المؤسسة', 'شركة الأعمال الحديثة للتجارة والمقاولات'],
    ['تقرير مذكرة التسوية البنكية المصرفية', 'Bank Reconciliation Statement'],
    ['اسم البنك', session.bankAccountName],
    ['رقم الحساب', session.bankAccountNumber],
    ['الفترة المالية', `من ${session.periodStart} إلى ${session.periodEnd}`],
    ['العملة', session.currency],
    ['حالة التسوية', summary.isBalanced ? 'متوازنة بالكامل (Balanced)' : 'غير متوازنة (Unbalanced)'],
    ['رقم اعتماد التسوية', session.reconciliationToken || 'قيد المراجعة'],
    ['تاريخ التصدير', new Date().toLocaleDateString('ar-KW')],
    [],
    ['البند', 'المبلغ بالدينار الكويتي (د.ك)'],
    ['الرصيد الختامي حسب كشف حساب البنك', summary.bankClosingBalance],
    ['+ الإيداعات والتحويلات النقدية بالطريق (قيد التنفيذ)', summary.uncreditedDepositsTotal],
    ['- الشيكات المسحوبة ولم تقدم للصرف بعد', -summary.unpresentedChequesTotal],
    ['= الرصيد المعدل للبنك (Adjusted Bank Balance)', summary.adjustedBankBalance],
    [],
    ['الرصيد الختامي حسب الدفاتر المحاسبية (الأستاذ العام)', summary.accountingClosingBalance],
    ['- إجمالي العمولات والرسوم البنكية غير المسجلة', -summary.totalBankFees],
    ['+ أو - الفروقات والتسويات المعتمدة', summary.totalSmallDifferences],
    ['= الرصيد المعدل للدفاتر المحاسبية (Adjusted Ledger Balance)', summary.adjustedAccountingBalance],
    [],
    ['صافي الفرق النهائي (Net Discrepancy)', summary.netDifference],
    ['النتيجة', summary.isBalanced ? 'مطابق تماماً 0.000 د.ك' : `يوجد فرق قدره ${summary.netDifference.toFixed(3)} د.ك`],
  ];

  const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
  XLSX.utils.book_append_sheet(wb, wsSummary, 'مذكرة التسوية البنكية');

  // Sheet 2: الحركات المتطابقة (Matched Transactions)
  const matchedRows = bankTxList
    .filter((b) => b.matchStatus === 'matched' || b.matchStatus === 'partial_match')
    .map((b) => {
      const matchedAcc = accTxList.find((a) => a.id === b.matchedAccountingId);
      return {
        'تاريخ البنك': b.transactionDate,
        'مرجع البنك': b.referenceNumber,
        'بيان البنك': b.description,
        'مبلغ البنك': Math.abs(b.netAmount),
        'رقم القيد المحاسبي': matchedAcc?.journalEntryNumber || '-',
        'تاريخ المحاسبة': matchedAcc?.entryDate || '-',
        'مبلغ المحاسبة': matchedAcc ? Math.abs(matchedAcc.netAmount) : 0,
        'المستوى': b.matchedLevel === 1 ? 'مستوى 1 (تام)' : b.matchedLevel === 2 ? 'مستوى 2 (بيان ومبلغ)' : 'مستوى 3 (فارق بسيط)',
        'الحالة': 'متطابق',
      };
    });
  const wsMatched = XLSX.utils.json_to_sheet(matchedRows);
  XLSX.utils.book_append_sheet(wb, wsMatched, 'الحركات المتطابقة');

  // Sheet 3: الفروقات والحركات غير المتطابقة (Differences & Exceptions)
  const diffRows = differences.map((d) => ({
    'التاريخ': d.transactionDate,
    'المرجع': d.referenceNumber,
    'نوع الفرق': d.differenceType,
    'البيان': d.description,
    'مبلغ البنك': d.bankAmount,
    'مبلغ المحاسبة': d.accountingAmount,
    'قيمة الفرق': d.differenceValue,
    'السبب التقديري': d.cause,
    'الإجراء المطلوب': d.requiredAction,
    'المسؤول': d.responsiblePerson,
    'حالة المعالجة': d.processingStatus,
  }));
  const wsDiff = XLSX.utils.json_to_sheet(diffRows);
  XLSX.utils.book_append_sheet(wb, wsDiff, 'تقرير الفروقات والتسويات');

  // Save workbook
  const fileName = `Bank_Reconciliation_${session.bankAccountId}_${session.periodEnd}.xlsx`;
  XLSX.writeFile(wb, fileName);
}

/**
 * Generate and download a sample Bank Statement Excel template
 */
export function downloadSampleBankExcel() {
  const wb = XLSX.utils.book_new();
  const sampleBankData = [
    {
      'تاريخ الحركة': '2026-09-02',
      'رقم المرجع': 'TRX-882190',
      'البيان': 'إيداع نقدي عبر الفرع الرئيسي',
      'مدين (سحب)': 0,
      'دائن (إيداع)': 5200.000,
      'الرصيد بعد الحركة': 53700.000,
      'رقم الشيك': '',
      'رقم التحويل': 'DEP-901',
      'اسم الطرف': 'إيرادات مبيعات نقدية',
    },
    {
      'تاريخ الحركة': '2026-09-05',
      'رقم المرجع': 'CHQ-770142',
      'البيان': 'صرف شيك مقاصة - شركة الخليج للتجهيزات',
      'مدين (سحب)': 1450.000,
      'دائن (إيداع)': 0,
      'الرصيد بعد الحركة': 52250.000,
      'رقم الشيك': '770142',
      'رقم التحويل': '',
      'اسم الطرف': 'شركة الخليج للتجهيزات الطبية',
    },
    {
      'تاريخ الحركة': '2026-09-12',
      'رقم المرجع': 'TRF-902314',
      'البيان': 'تحويل بنكي وارد - سداد عميل مشاريع الأحمدي',
      'مدين (سحب)': 0,
      'دائن (إيداع)': 3800.000,
      'الرصيد بعد الحركة': 56050.000,
      'رقم الشيك': '',
      'رقم التحويل': 'TRF-902314',
      'اسم الطرف': 'مؤسسة مشاريع الأحمدي',
    },
    {
      'تاريخ الحركة': '2026-09-15',
      'رقم المرجع': 'POS-554109',
      'البيان': 'تسوية شبكة كي نت KNET نقطة بيع',
      'مدين (سحب)': 0,
      'دائن (إيداع)': 948.500,
      'الرصيد بعد الحركة': 56998.500,
      'رقم الشيك': '',
      'رقم التحويل': '',
      'اسم الطرف': 'شبكة المدفوعات KNET',
    },
    {
      'تاريخ الحركة': '2026-09-20',
      'رقم المرجع': 'FEE-202609',
      'البيان': 'رسوم تحويلات إلكترونية ومصاريف مصرفية',
      'مدين (سحب)': 15.000,
      'دائن (إيداع)': 0,
      'الرصيد بعد الحركة': 56983.500,
      'رقم الشيك': '',
      'رقم التحويل': '',
      'اسم الطرف': 'رسوم وعمولات البنك',
    },
  ];

  const ws = XLSX.utils.json_to_sheet(sampleBankData);
  XLSX.utils.book_append_sheet(wb, ws, 'كشف حساب البنك');
  XLSX.writeFile(wb, 'نموذج_كشف_حساب_البنك.xlsx');
}

/**
 * Generate and download a sample App/Accounting Ledger Excel template
 */
export function downloadSampleAppExcel() {
  const wb = XLSX.utils.book_new();
  const sampleAppData = [
    {
      'تاريخ القيد': '2026-09-02',
      'رقم المرجع': 'TRX-882190',
      'رقم القيد': 'JV-2026-0901',
      'البيان': 'إيداع إيرادات مبيعات نقدية بالبنك',
      'الحساب المقابل': 'حساب المبيعات النقدية',
      'مدين (إيداع بالبنك)': 5200.000,
      'دائن (صرف من البنك)': 0,
      'رقم الشيك': '',
      'رقم التحويل': 'DEP-901',
      'المستفيد أو الطرف': 'إيرادات المبيعات',
    },
    {
      'تاريخ القيد': '2026-09-04',
      'رقم المرجع': 'CHQ-770142',
      'رقم القيد': 'JV-2026-0902',
      'البيان': 'سداد دفعة للمورد شركة الخليج للتجهيزات بشيك',
      'الحساب المقابل': 'ذمم دائنة - شركة الخليج للتجهيزات',
      'مدين (إيداع بالبنك)': 0,
      'دائن (صرف من البنك)': 1450.000,
      'رقم الشيك': '770142',
      'رقم التحويل': '',
      'المستفيد أو الطرف': 'شركة الخليج للتجهيزات الطبية',
    },
    {
      'تاريخ القيد': '2026-09-12',
      'رقم المرجع': 'TRF-902314',
      'رقم القيد': 'JV-2026-0904',
      'البيان': 'تحويل بنكي وارد من العميل مشاريع الأحمدي',
      'الحساب المقابل': 'ذمم مدينة - مشاريع الأحمدي',
      'مدين (إيداع بالبنك)': 3800.000,
      'دائن (صرف من البنك)': 0,
      'رقم الشيك': '',
      'رقم التحويل': 'TRF-902314',
      'المستفيد أو الطرف': 'مؤسسة مشاريع الأحمدي',
    },
    {
      'تاريخ القيد': '2026-09-15',
      'رقم المرجع': 'POS-554109',
      'رقم القيد': 'JV-2026-0906',
      'البيان': 'إيراد مبيعات نقاط بيع KNET قبل اقتطاع العمولة',
      'الحساب المقابل': 'إيرادات نقاط البيع',
      'مدين (إيداع بالبنك)': 950.000,
      'دائن (صرف من البنك)': 0,
      'رقم الشيك': '',
      'رقم التحويل': '',
      'المستفيد أو الطرف': 'مبيعات المعرض',
    },
    {
      'تاريخ القيد': '2026-09-24',
      'رقم المرجع': 'CHQ-770146',
      'رقم القيد': 'JV-2026-0908',
      'البيان': 'شيك مسحوب لصالح مؤسسة الوفاق للأدوات المكتبية (معلق)',
      'الحساب المقابل': 'موردون - مؤسسة الوفاق',
      'مدين (إيداع بالبنك)': 0,
      'دائن (صرف من البنك)': 420.000,
      'رقم الشيك': '770146',
      'رقم التحويل': '',
      'المستفيد أو الطرف': 'مؤسسة الوفاق',
    },
  ];

  const ws = XLSX.utils.json_to_sheet(sampleAppData);
  XLSX.utils.book_append_sheet(wb, ws, 'حركات التطبيق واليومية');
  XLSX.writeFile(wb, 'نموذج_دفاتر_حركات_التطبيق.xlsx');
}

/**
 * Print / Save PDF View trigger with dedicated styling
 */
export function triggerPrintReconciliationReport() {
  window.print();
}
