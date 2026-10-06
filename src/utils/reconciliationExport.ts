import * as XLSX from 'xlsx';
import {
  BankStatementTransaction,
  BankReconciliationSession,
  AccountingTransaction,
  ReconciliationDifference,
  ReconciliationSummary
} from '../types/reconciliationTypes';
import { buildMonthlyDifferencesBreakdown } from './reconciliationEngine';

/**
 * Export Reconciliation Report to Excel (.xlsx) with multiple comprehensive and itemized sheets
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

  // Sheet 2: ملخص شهري لكل جهاز كي نت (K-Net Terminal Monthly Summary)
  const monthlyBreakdowns = buildMonthlyDifferencesBreakdown(differences);
  const terminalRows: any[] = [];
  monthlyBreakdowns.forEach((mb) => {
    mb.terminalSummaries.forEach((ts) => {
      terminalRows.push({
        'الشهر': ts.month,
        'رقم جهاز الكي نت (TID)': ts.terminalId,
        'إجمالي مبيعات الدفاتر (د.ك)': ts.totalSalesLedger,
        'إجمالي المحصل بالبنك (د.ك)': ts.totalSettlementBank,
        'عمولات كي نت المخصومة (د.ك)': ts.totalCommissionDeducted,
        'إيجار الجهاز الشهري 15 د.ك (د.ك)': ts.rentalFee,
        'إجمالي الاستقطاعات (د.ك)': ts.totalDeductions,
        'عدد الحركات': ts.transactionCount,
        'متوسط نسبة العمولة (%)': `${ts.averageCommissionRate}%`,
      });
    });
  });
  if (terminalRows.length > 0) {
    const wsTerm = XLSX.utils.json_to_sheet(terminalRows);
    XLSX.utils.book_append_sheet(wb, wsTerm, 'ملخص شهري أجهزة كي نت');
  }

  // Sheet 3: تفصيل عمولات وإيجار أجهزة الكي نت (KNET Itemized Deductions)
  const knetItems = differences
    .filter((d) => d.differenceType === 'knet_commission' || d.differenceType === 'knet_rental_fee')
    .map((d) => ({
      'الشهر': d.monthKey || d.transactionDate.substring(0, 7),
      'التاريخ': d.transactionDate,
      'رقم جهاز الكي نت (TID)': d.terminalId || 'جهاز عام',
      'النوع': d.differenceType === 'knet_commission' ? 'عمولة تسوية يومية' : 'إيجار شهري 15 د.ك',
      'المرجع': d.referenceNumber,
      'البيان': d.description,
      'مبلغ البنك': d.bankAmount,
      'مبلغ الدفاتر': d.accountingAmount,
      'قيمة الاستقطاع / الفرق': d.differenceValue,
      'نسبة العمولة': d.commissionRate ? `${d.commissionRate}%` : '-',
      'حالة المعالجة': d.processingStatus === 'closed_as_fee' ? 'مقفل كعمولة' : d.processingStatus === 'resolved' ? 'تمت التسوية' : 'معلق',
      'السبب التقديري': d.cause,
    }));
  if (knetItems.length > 0) {
    const wsKnet = XLSX.utils.json_to_sheet(knetItems);
    XLSX.utils.book_append_sheet(wb, wsKnet, 'فروقات وعمولات كي نت');
  }

  // Sheet 4: فروقات الشيكات والشيكات المعلقة (Cheque Discrepancies)
  const chqItems = differences
    .filter((d) => d.differenceType === 'cheque_diff' || d.differenceType === 'unpresented_cheque')
    .map((d) => ({
      'الشهر': d.monthKey || d.transactionDate.substring(0, 7),
      'التاريخ': d.transactionDate,
      'رقم الشيك': d.chequeNumber || 'غير محدد',
      'النوع': d.differenceType === 'cheque_diff' ? 'فرق صرف شيك' : 'شيك صادر لم يقدم للصرف',
      'المرجع': d.referenceNumber,
      'البيان': d.description,
      'مبلغ البنك': d.bankAmount,
      'مبلغ الدفاتر': d.accountingAmount,
      'قيمة الفرق': d.differenceValue,
      'حالة المعالجة': d.processingStatus,
      'السبب والإجراء': d.cause,
    }));
  if (chqItems.length > 0) {
    const wsChq = XLSX.utils.json_to_sheet(chqItems);
    XLSX.utils.book_append_sheet(wb, wsChq, 'فروقات الشيكات والمعلق');
  }

  // Sheet 5: فروقات الإيداعات والتحويلات (Deposit Discrepancies)
  const depItems = differences
    .filter((d) => d.differenceType === 'deposit_diff' || d.differenceType === 'uncredited_deposit')
    .map((d) => ({
      'الشهر': d.monthKey || d.transactionDate.substring(0, 7),
      'التاريخ': d.transactionDate,
      'النوع': d.differenceType === 'deposit_diff' ? 'فرق إيداع نقدي/تحويل' : 'إيداع بالطريق لم يظهر بالبنك',
      'المرجع': d.referenceNumber,
      'البيان': d.description,
      'مبلغ البنك': d.bankAmount,
      'مبلغ الدفاتر': d.accountingAmount,
      'قيمة الفرق': d.differenceValue,
      'حالة المعالجة': d.processingStatus,
      'السبب والإجراء': d.cause,
    }));
  if (depItems.length > 0) {
    const wsDep = XLSX.utils.json_to_sheet(depItems);
    XLSX.utils.book_append_sheet(wb, wsDep, 'فروقات الإيداعات والتحويلات');
  }

  // Sheet 6: الحركات المتطابقة (Matched Transactions)
  const matchedRows = bankTxList
    .filter((b) => b.matchStatus === 'matched' || b.matchStatus === 'partial_match')
    .map((b) => {
      const matchedAcc = accTxList.find((a) => a.id === b.matchedAccountingId);
      return {
        'تاريخ البنك': b.transactionDate,
        'مرجع البنك': b.referenceNumber,
        'رقم جهاز كي نت': b.terminalId || '-',
        'رقم الشيك': b.chequeNumber || '-',
        'بيان البنك': b.description,
        'مبلغ البنك': Math.abs(b.netAmount),
        'رقم القيد المحاسبي': matchedAcc?.journalEntryNumber || '-',
        'تاريخ المحاسبة': matchedAcc?.entryDate || '-',
        'مبلغ المحاسبة': matchedAcc ? Math.abs(matchedAcc.netAmount) : 0,
        'المستوى': b.matchedLevel === 1 ? 'مستوى 1 (تام)' : b.matchedLevel === 2 ? 'مستوى 2 (بيان ومبلغ)' : 'مستوى 3 (فارق بسيط / عمولة)',
        'الحالة': 'متطابق',
      };
    });
  const wsMatched = XLSX.utils.json_to_sheet(matchedRows);
  XLSX.utils.book_append_sheet(wb, wsMatched, 'الحركات المتطابقة');

  // Sheet 7: كافة الفروقات والتسويات (All Differences)
  const diffRows = differences.map((d) => ({
    'الشهر': d.monthKey || d.transactionDate.substring(0, 7),
    'التاريخ': d.transactionDate,
    'المرجع': d.referenceNumber,
    'رقم الشيك': d.chequeNumber || '-',
    'رقم جهاز كي نت': d.terminalId || '-',
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
  XLSX.utils.book_append_sheet(wb, wsDiff, 'تقرير كافة الفروقات');

  // Save workbook
  const fileName = `Bank_Reconciliation_${session.bankAccountId}_${session.periodEnd}.xlsx`;
  XLSX.writeFile(wb, fileName);
}

/**
 * Generate and download a sample Bank Statement Excel template mimicking real Kuwait banks
 * Features a single (+/-) amount column and check numbers / TIDs in the "مرجع" column
 */
export function downloadSampleBankExcel() {
  const wb = XLSX.utils.book_new();
  const sampleBankData = [
    {
      'تاريخ الحركة': '2026-09-01',
      'مرجع': 'RENT TID 10482910',
      'البيان': 'إيجار جهاز كي نت شهري (15 د.ك) - جهاز 10482910',
      'المبلغ (+إيداع / -سحب)': -15.000,
      'مدين (سحب)': 15.000,
      'دائن (إيداع)': 0,
      'الرصيد بعد الحركة': 48485.000,
      'رقم الشيك': '',
      'رقم جهاز الكي نت (TID)': '10482910',
      'اسم الطرف': 'رسوم أجهزة K-NET',
    },
    {
      'تاريخ الحركة': '2026-09-01',
      'مرجع': 'RENT TID 10482920',
      'البيان': 'إيجار جهاز كي نت شهري (15 د.ك) - جهاز 10482920',
      'المبلغ (+إيداع / -سحب)': -15.000,
      'مدين (سحب)': 15.000,
      'دائن (إيداع)': 0,
      'الرصيد بعد الحركة': 48470.000,
      'رقم الشيك': '',
      'رقم جهاز الكي نت (TID)': '10482920',
      'اسم الطرف': 'رسوم أجهزة K-NET',
    },
    {
      'تاريخ الحركة': '2026-09-02',
      'مرجع': 'TRF-90214',
      'البيان': 'تحويل بنكي - رواتب عمالة فرع السالمية',
      'المبلغ (+إيداع / -سحب)': -3250.000,
      'مدين (سحب)': 3250.000,
      'دائن (إيداع)': 0,
      'الرصيد بعد الحركة': 45220.000,
      'رقم الشيك': '',
      'رقم جهاز الكي نت (TID)': '',
      'اسم الطرف': 'رواتب فرع السالمية',
    },
    {
      'تاريخ الحركة': '2026-09-06',
      'مرجع': '100021',
      'البيان': 'صرف شيك مقاصة رقم 100021 - شركة المطاحن الأولى',
      'المبلغ (+إيداع / -سحب)': -1450.750,
      'مدين (سحب)': 1450.750,
      'دائن (إيداع)': 0,
      'الرصيد بعد الحركة': 43769.250,
      'رقم الشيك': '100021',
      'رقم جهاز الكي نت (TID)': '',
      'اسم الطرف': 'شركة المطاحن الأولى للتجارة',
    },
    {
      'تاريخ الحركة': '2026-09-08',
      'مرجع': 'DEP-8841',
      'البيان': 'إيداع نقدي عبر الفرع - مبيعات فرع الفروانية',
      'المبلغ (+إيداع / -سحب)': 5200.000,
      'مدين (سحب)': 0,
      'دائن (إيداع)': 5200.000,
      'الرصيد بعد الحركة': 48969.250,
      'رقم الشيك': '',
      'رقم جهاز الكي نت (TID)': '',
      'اسم الطرف': 'مبيعات فرع الفروانية',
    },
    {
      'تاريخ الحركة': '2026-09-13',
      'مرجع': '100022',
      'البيان': 'صرف شيك رقم 100022 - مؤسسة الأوقاف والاستثمار',
      'المبلغ (+إيداع / -سحب)': -2800.000,
      'مدين (سحب)': 2800.000,
      'دائن (إيداع)': 0,
      'الرصيد بعد الحركة': 46169.250,
      'رقم الشيك': '100022',
      'رقم جهاز الكي نت (TID)': '',
      'اسم الطرف': 'مؤسسة الأوقاف والاستثمار العقاري',
    },
    {
      'تاريخ الحركة': '2026-09-15',
      'مرجع': 'TID 10482910',
      'البيان': 'تسوية شبكة كي نت K-NET نقطة بيع جهاز 10482910 بعد خصم العمولة',
      'المبلغ (+إيداع / -سحب)': 512.200,
      'مدين (سحب)': 0,
      'دائن (إيداع)': 512.200,
      'الرصيد بعد الحركة': 46681.450,
      'رقم الشيك': '',
      'رقم جهاز الكي نت (TID)': '10482910',
      'اسم الطرف': 'شبكة المدفوعات KNET',
    },
    {
      'تاريخ الحركة': '2026-09-16',
      'مرجع': 'TID 10482920',
      'البيان': 'تسوية شبكة كي نت K-NET نقطة بيع جهاز 10482920 بعد خصم العمولة',
      'المبلغ (+إيداع / -سحب)': 837.250,
      'مدين (سحب)': 0,
      'دائن (إيداع)': 837.250,
      'الرصيد بعد الحركة': 47518.700,
      'رقم الشيك': '',
      'رقم جهاز الكي نت (TID)': '10482920',
      'اسم الطرف': 'شبكة المدفوعات KNET',
    },
    {
      'تاريخ الحركة': '2026-09-18',
      'مرجع': '100023',
      'البيان': 'صرف شيك مقاصة رقم 100023 - مكتبة العجيري',
      'المبلغ (+إيداع / -سحب)': -642.250,
      'مدين (سحب)': 642.250,
      'دائن (إيداع)': 0,
      'الرصيد بعد الحركة': 46876.450,
      'رقم الشيك': '100023',
      'رقم جهاز الكي نت (TID)': '',
      'اسم الطرف': 'مكتبة العجيري والمشاريع',
    },
    {
      'تاريخ الحركة': '2026-09-22',
      'مرجع': 'TRF-MOH-9910',
      'البيان': 'تحويل بنكي وارد - وزارة الصحة الكويتية',
      'المبلغ (+إيداع / -سحب)': 7850.000,
      'مدين (سحب)': 0,
      'دائن (إيداع)': 7850.000,
      'الرصيد بعد الحركة': 54726.450,
      'رقم الشيك': '',
      'رقم جهاز الكي نت (TID)': '',
      'اسم الطرف': 'وزارة الصحة الكويتية',
    },
    {
      'تاريخ الحركة': '2026-09-25',
      'مرجع': 'TID 10482910',
      'البيان': 'تسوية شبكة كي نت K-NET نقطة بيع جهاز 10482910 بعد خصم العمولة',
      'المبلغ (+إيداع / -سحب)': 423.550,
      'مدين (سحب)': 0,
      'دائن (إيداع)': 423.550,
      'الرصيد بعد الحركة': 55150.000,
      'رقم الشيك': '',
      'رقم جهاز الكي نت (TID)': '10482910',
      'اسم الطرف': 'شبكة المدفوعات KNET',
    },
    {
      'تاريخ الحركة': '2026-09-28',
      'مرجع': 'CHG-CBK-MONTHLY',
      'البيان': 'رسوم ومصاريف خدمات مصرفية إلكترونية شهرية',
      'المبلغ (+إيداع / -سحب)': -5.000,
      'مدين (سحب)': 5.000,
      'دائن (إيداع)': 0,
      'الرصيد بعد الحركة': 55145.000,
      'رقم الشيك': '',
      'رقم جهاز الكي نت (TID)': '',
      'اسم الطرف': 'البنك التجاري الكويتي',
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
