import {
  BankStatementTransaction,
  AccountingTransaction,
  ReconciliationMatch,
  ReconciliationDifference,
  BankReconciliationSettings,
  ReconciliationSummary,
  MonthlyDifferencesBreakdown,
  KnetTerminalMonthlySummary
} from '../types/reconciliationTypes';

/**
 * Standardize strings for fuzzy comparison
 */
export function cleanStr(s?: string): string {
  if (!s) return '';
  return s
    .toLowerCase()
    .replace(/[^\w\u0621-\u064A]/g, '')
    .trim();
}

/**
 * Calculate absolute difference in days between two ISO date strings (YYYY-MM-DD)
 */
export function getDaysDiff(d1: string, d2: string): number {
  try {
    const t1 = new Date(d1).getTime();
    const t2 = new Date(d2).getTime();
    return Math.abs(Math.round((t1 - t2) / (1000 * 60 * 60 * 24)));
  } catch {
    return 999;
  }
}

/**
 * Extract Cheque Number from reference or description
 * Handles:
 * - "شيك مقاصة وارد رقم 1", "صرف شيك رقم 13- لاجوس", "شيك رقم 10042", "CHK-1049", "CHQ 50021"
 * - Raw digits in reference (1 to 8 digits)
 */
export function extractChequeNumber(ref?: string, desc?: string): string | undefined {
  const refStr = String(ref || '').trim();
  const descStr = String(desc || '').trim();
  const combined = `${refStr} ${descStr}`;

  // 1. Explicit cheque keywords followed by words like (مقاصة / وارد / صادر / صرف / رقم / no / #) then 1 to 8 digits
  const chqPattern = /(?:شيك|ش|cheque|chq|chk)(?:\s+(?:مقاصة|وارد|صادر|صرف|مرتد|تحت\s*التحصيل))*\s*(?:رقم|no|#|\/)?\s*[:#\s-]*(\d{1,8})/i;
  const keywordMatch = combined.match(chqPattern);
  if (keywordMatch) return keywordMatch[1].trim();

  // 2. Arabic "صرف شيك" or "شيك رقم" with possible words in between
  const arabicChkMatch = combined.match(/شيك(?:\s+[\u0621-\u064A]+){0,3}\s*(?:رقم|no|#)?\s*[:#\s-]*(\d{1,8})/i);
  if (arabicChkMatch) return arabicChkMatch[1].trim();

  // 3. Reference is primarily digits (e.g. "100452" or "1")
  const refClean = refStr.replace(/^(?:chk|chq|cheque|شيك|ش)[-\s:#]*/i, '').trim();
  if (/^\d{1,8}$/.test(refClean)) {
    return refClean;
  }

  // 4. Serial cheque number embedded in description (4 to 8 digits)
  const serialMatch = combined.match(/\b(\d{4,8})\b/);
  if (serialMatch) return serialMatch[1].trim();

  return undefined;
}

/**
 * Extract K-Net Terminal ID (TID) from reference or description
 * Handles:
 * - "تحويل من جهاز نقاط البيع رقم 55012571"
 * - "MON FEES FOR TERM :55012571"
 * - "Terminal setup/No :ZCC03497"
 * - "خصم ايجار الكي نت رقم 55012571"
 * - "TID: 10482910"
 */
export function extractKnetTerminalId(ref?: string, desc?: string): string | undefined {
  const refStr = String(ref || '').trim();
  const descStr = String(desc || '').trim();
  const combined = `${refStr} ${descStr}`;

  // 1. Arabic: جهاز نقاط البيع رقم 55012571 or الكي نت رقم 55012571 or نقاط البيع رقم 55012571
  const posArabicMatch = combined.match(/(?:جهاز\s*نقاط\s*البيع|نقاط\s*البيع|جهاز|الكي\s*نت|كينت|شبكة)\s*(?:رقم|no|id|setup\/no)?\s*[:#\s-]*([A-Za-z0-9]{4,12})/i);
  if (posArabicMatch) {
    const val = posArabicMatch[1].trim();
    if (!/^(fees?|rent|sales?|pos|dep|settl|خيطان|ادارة|فرع|حساب)$/i.test(val)) return val;
  }

  // 2. English: "MON FEES FOR TERM :55012571" or "Terminal setup/No :ZCC03497" or "TID: 55012571"
  const termMatch = combined.match(/(?:term|terminal|tid)\s*(?:setup\/no|setup|no|id)?\s*[:#\s-]*([A-Za-z0-9]{4,12})/i);
  if (termMatch) {
    const val = termMatch[1].trim();
    if (!/^(fees?|rent|sales?|pos|dep|settl)$/i.test(val)) return val;
  }

  // 3. If text indicates K-Net / POS and has standalone 6 to 10 digit number
  if (isKnetTransaction(refStr, descStr)) {
    const numMatch = combined.match(/\b([0-9]{6,10})\b/);
    if (numMatch) return numMatch[1].trim();
  }

  return undefined;
}

/**
 * Detect if transaction is a K-Net transaction
 */
export function isKnetTransaction(ref?: string, desc?: string): boolean {
  const text = `${ref || ''} ${desc || ''}`.toLowerCase();
  return (
    text.includes('knet') ||
    text.includes('k-net') ||
    text.includes('k.net') ||
    text.includes('كي نت') ||
    text.includes('كينت') ||
    text.includes('pos') ||
    text.includes('نقاط بيع') ||
    text.includes('شبكة') ||
    text.includes('settl') ||
    text.includes('pom') ||
    text.includes('تسوية') ||
    text.includes('مبيعات شبكة') ||
    text.includes('جهاز نقاط البيع') ||
    text.includes('ترحيل مبيعات')
  );
}

/**
 * Check if a bank transaction is a K-Net monthly terminal rental fee (15 KD per terminal)
 * In Kuwait banks, this is typically 15.000 KD per device charged in the first 10 days of the month.
 * Examples from bank statements: "MON FEES FOR TERM :55012571" (OPR: MRR, Amount: -15.000)
 */
export function isKnetRentalFee(b: BankStatementTransaction): { isRental: boolean; terminalId?: string } {
  if (b.debit <= 0 && b.netAmount >= 0) return { isRental: false };
  const amt = Math.abs(b.netAmount);
  const text = `${b.referenceNumber || ''} ${b.description || ''}`.toLowerCase();

  // Multiples of 15.000 KD (15 KD for 1 terminal, 30 for 2 terminals, 45 for 3 terminals, etc.)
  const isMultipleOf15 = Math.abs(amt % 15) < 0.005 && amt >= 14.99;
  const hasRentalKeywords =
    text.includes('rent') ||
    text.includes('إيجار') ||
    text.includes('ايجار') ||
    text.includes('رسوم جهاز') ||
    text.includes('term fee') ||
    text.includes('pos fee') ||
    text.includes('mon fee') ||
    text.includes('fees for term') ||
    text.includes('mrr') ||
    text.includes('رسوم أجهزة') ||
    text.includes('إيجار كي نت') ||
    text.includes('ايجار كي نت') ||
    (isMultipleOf15 && (text.includes('term') || text.includes('knet') || text.includes('pos') || text.includes('جهاز')));

  // Typically charged in first 10 days of the month
  let isStartOfMonth = false;
  try {
    const day = parseInt(b.transactionDate.split('-')[2], 10);
    isStartOfMonth = day <= 10;
  } catch {}

  const tid = b.terminalId || extractKnetTerminalId(b.referenceNumber, b.description);

  if ((isMultipleOf15 && (hasRentalKeywords || isStartOfMonth)) || (hasRentalKeywords && isKnetTransaction(b.referenceNumber, b.description))) {
    return { isRental: true, terminalId: tid };
  }

  return { isRental: false };
}

/**
 * Execute Smart Multi-Phase Reconciliation Engine with K-Net commission extraction,
 * cheque tracking, monthly terminal rent recognition, and itemized differences.
 */
export function executeReconciliationEngine(
  bankTxList: BankStatementTransaction[],
  accTxList: AccountingTransaction[],
  settings: BankReconciliationSettings,
  sessionId: string,
  matchedBy: string
): {
  updatedBankTx: BankStatementTransaction[];
  updatedAccTx: AccountingTransaction[];
  matches: ReconciliationMatch[];
  differences: ReconciliationDifference[];
} {
  const matches: ReconciliationMatch[] = [];
  const differences: ReconciliationDifference[] = [];

  // 1. Dynamic Branch-to-Terminal Correlation Learning
  // Scans all bank and accounting transactions to associate branch names / cashiers with specific terminal IDs.
  // E.g. "خصم ايجار الكي نت رقم 55012571 عن شهر اغسطس 2026 - فرع خيطان" correlates "خيطان" -> "55012571"
  const branchToTerminalMap = new Map<string, string>();
  const commonBranches = [
    'خيطان', 'السالمية', 'حولي', 'الفروانية', 'الجهراء', 'الري', 'الاحمدي', 
    'العاصمة', 'الشرق', 'الشويخ', 'العارضية', 'كاشير 1', 'كاشير 2', 'كاشير 3',
    'فرع 1', 'فرع 2', 'فرع 3', 'فرع 4', 'فرع رئيسي', 'المعرض'
  ];

  [...bankTxList, ...accTxList].forEach((tx) => {
    const text = `${tx.referenceNumber || ''} ${tx.description || ''} ${(tx as any).counterAccountName || ''}`;
    const tid = (tx as any).terminalId || extractKnetTerminalId(tx.referenceNumber, tx.description);
    if (tid) {
      commonBranches.forEach((branch) => {
        if (text.includes(branch) && !branchToTerminalMap.has(branch)) {
          branchToTerminalMap.set(branch, tid);
        }
      });
      const customBranchMatch = text.match(/فرع\s+([\u0621-\u064A]{3,15})/);
      if (customBranchMatch && !branchToTerminalMap.has(customBranchMatch[1].trim())) {
        branchToTerminalMap.set(customBranchMatch[1].trim(), tid);
      }
    }
  });

  // Deep clone to avoid mutating input directly
  const bankPool: BankStatementTransaction[] = bankTxList.map((tx) => {
    const b = { ...tx };
    // Auto extract metadata if missing
    if (!b.chequeNumber) b.chequeNumber = extractChequeNumber(b.referenceNumber, b.description);
    if (!b.terminalId) b.terminalId = extractKnetTerminalId(b.referenceNumber, b.description);
    return b;
  });

  const accPool: AccountingTransaction[] = accTxList.map((tx) => {
    const a = { ...tx };
    if (!a.chequeNumber) a.chequeNumber = extractChequeNumber(a.referenceNumber, a.description);
    if (!a.terminalId) {
      a.terminalId = extractKnetTerminalId(a.referenceNumber, a.description);
      // Auto correlate branch keywords to known terminal ID
      if (!a.terminalId) {
        const fullText = `${a.referenceNumber || ''} ${a.description || ''} ${a.counterAccountName || ''}`;
        for (const [branch, tid] of branchToTerminalMap.entries()) {
          if (fullText.includes(branch)) {
            a.terminalId = tid;
            break;
          }
        }
      }
    }
    return a;
  });

  const matchedBankIds = new Set<string>();
  const matchedAccIds = new Set<string>();

  // Reset statuses for active matching
  bankPool.forEach((b) => {
    if (!b.isExcluded) {
      b.matchStatus = 'unmatched';
      b.matchedAccountingId = undefined;
      b.matchedLevel = undefined;
    }
  });

  accPool.forEach((a) => {
    a.matchStatus = 'unmatched';
    a.matchedBankId = undefined;
  });

  // =========================================================================
  // PHASE 1: مطابقة الشيكات برقم الشيك (Smart Cheque Matching)
  // =========================================================================
  for (const b of bankPool) {
    if (b.isExcluded || matchedBankIds.has(b.id)) continue;
    if (!b.chequeNumber) continue;

    const bAmt = Math.abs(b.netAmount);
    // Bank check clearing is a withdrawal (debit)
    if (b.debit <= 0 && b.credit > 0) continue; // Ignore deposits that accidentally have check numbers

    for (const a of accPool) {
      if (matchedAccIds.has(a.id)) continue;
      if (!a.chequeNumber) continue;
      // In accounting, check is a credit (payment from bank)
      if (a.credit <= 0 && a.netAmount >= 0) continue;

      // Normalize cheque numbers e.g. "00100021" matches "100021" or "CHK-100021"
      const bChkDigits = b.chequeNumber.replace(/\D/g, '').replace(/^0+/, '');
      const aChkDigits = a.chequeNumber.replace(/\D/g, '').replace(/^0+/, '');
      const isChqMatch =
        (bChkDigits && aChkDigits && bChkDigits === aChkDigits) ||
        cleanStr(b.chequeNumber) === cleanStr(a.chequeNumber);

      if (isChqMatch) {
        matchedBankIds.add(b.id);
        matchedAccIds.add(a.id);

        const aAmt = Math.abs(a.netAmount);
        const diffAmt = Math.round(Math.abs(bAmt - aAmt) * 1000) / 1000;
        const daysDiff = getDaysDiff(b.transactionDate, a.entryDate);

        if (diffAmt < 0.001) {
          // Exact Cheque Match (Level 1)
          b.matchStatus = 'matched';
          b.matchedAccountingId = a.id;
          b.matchedLevel = 1;

          a.matchStatus = 'matched';
          a.matchedBankId = b.id;

          matches.push({
            id: `match-chk-${Date.now()}-${matches.length}`,
            sessionId,
            bankTxId: b.id,
            accountingTxId: a.id,
            matchLevel: 1,
            confidenceScore: 100,
            amountDifference: 0,
            dateDifferenceDays: daysDiff,
            matchedBy,
            matchedAt: new Date().toISOString().replace('T', ' ').substring(0, 19),
            notes: `تطابق تام لصرف شيك بنكي رقم #${b.chequeNumber} بقيمة ${bAmt.toFixed(3)} د.ك`,
          });
        } else {
          // Cheque with Amount Difference (Level 3)
          b.matchStatus = 'partial_match';
          b.matchedAccountingId = a.id;
          b.matchedLevel = 3;

          a.matchStatus = 'partial_match';
          a.matchedBankId = b.id;

          matches.push({
            id: `match-chk-diff-${Date.now()}-${matches.length}`,
            sessionId,
            bankTxId: b.id,
            accountingTxId: a.id,
            matchLevel: 3,
            confidenceScore: 92,
            amountDifference: diffAmt,
            dateDifferenceDays: daysDiff,
            matchedBy,
            matchedAt: new Date().toISOString().replace('T', ' ').substring(0, 19),
            notes: `تطابق رقم الشيك #${b.chequeNumber} مع وجود فرق صرف بمقدار ${diffAmt.toFixed(3)} د.ك`,
          });

          differences.push({
            id: `diff-chk-${Date.now()}-${differences.length}`,
            sessionId,
            bankTxId: b.id,
            accountingTxId: a.id,
            differenceType: 'cheque_diff',
            categoryGroup: 'cheques',
            chequeNumber: b.chequeNumber,
            monthKey: b.transactionDate.substring(0, 7),
            transactionDate: b.transactionDate,
            referenceNumber: b.referenceNumber || `CHK-${b.chequeNumber}`,
            description: `شيك رقم #${b.chequeNumber} - فرق صرف بين البنك والدفاتر`,
            bankAmount: bAmt,
            accountingAmount: aAmt,
            differenceValue: diffAmt,
            cause: `فرق في قيمة صرف الشيك رقم #${b.chequeNumber}؛ مبلغ الدفاتر (${aAmt.toFixed(3)} د.ك) ومبلغ صرف البنك (${bAmt.toFixed(3)} د.ك)`,
            requiredAction: 'مراجعة صورة الشيك المحصلة وإجراء قيد تسوية بالفرق',
            responsiblePerson: 'أمين الخزينة ومسؤول الشيكات',
            processingStatus: 'pending',
            createdAt: new Date().toISOString().replace('T', ' ').substring(0, 19),
          });
        }
        break;
      }
    }
  }

  // =========================================================================
  // PHASE 2: مطابقة تسويات مبيعات الكي نت الذكية واستخراج العمولات والفروقات
  // =========================================================================
  for (const b of bankPool) {
    if (b.isExcluded || matchedBankIds.has(b.id)) continue;
    // KNET daily settlements are bank deposits (Credit)
    if (b.credit <= 0 && b.netAmount <= 0) continue;

    const bIsKnet = isKnetTransaction(b.referenceNumber, b.description) || !!b.terminalId;
    if (!bIsKnet) continue;

    const bAmt = Math.abs(b.netAmount);
    const bTid = b.terminalId || extractKnetTerminalId(b.referenceNumber, b.description);

    let bestA: AccountingTransaction | null = null;
    let bestScore = -9999;
    let bestDiffVal = 0;
    let bestCommission = 0;
    let bestDaysDiff = 0;
    let bestTid = '';

    for (const a of accPool) {
      if (matchedAccIds.has(a.id)) continue;
      // In accounting, daily POS sales deposit is a Debit (incoming bank receipt)
      if (a.debit <= 0 && a.netAmount <= 0) continue;

      const aIsKnet = isKnetTransaction(a.referenceNumber, a.description) || !!a.terminalId;
      if (!aIsKnet) continue;

      const aAmt = Math.abs(a.netAmount);
      const aTid = a.terminalId || extractKnetTerminalId(a.referenceNumber, a.description);
      const daysDiff = getDaysDiff(b.transactionDate, a.entryDate);
      if (daysDiff > 4) continue;

      // Critical Multi-Device Rule: If both bank and accounting have distinct terminal IDs, they MUST NOT match if IDs differ!
      if (bTid && aTid && cleanStr(bTid) !== cleanStr(aTid)) {
        continue;
      }

      // Condition 1: Same Terminal ID and Date within 4 days
      const tidMatch = bTid && aTid && cleanStr(bTid) === cleanStr(aTid);
      
      // Condition 2: Commission check: Bank deposit is usually <= Accounting sales by the K-Net commission
      const commissionAmount = Math.round((aAmt - bAmt) * 1000) / 1000;
      const isRealisticCommission = (commissionAmount >= 0 && commissionAmount <= (aAmt * 0.05 + 3.000)) || Math.abs(bAmt - aAmt) < 0.005;
      const isExactAmount = Math.abs(bAmt - aAmt) < 0.001;

      // Smart match condition:
      const canMatch = 
        (tidMatch && (daysDiff <= 4 || isRealisticCommission)) ||
        ((bTid || aTid) && daysDiff <= 3 && (isExactAmount || isRealisticCommission)) ||
        (!bTid && !aTid && daysDiff <= 3 && (isExactAmount || isRealisticCommission));

      if (!canMatch) continue;

      let score = 50;
      if (isExactAmount) score += 60;
      if (tidMatch) score += 40; // Massive confidence when specific device TID matches
      if (daysDiff === 1) score += 25; // Next day settlement (standard in Kuwait)
      else if (daysDiff === 0) score += 20;
      else score -= daysDiff * 5;

      if (commissionAmount > 0 && aAmt > 0) {
        const rate = (commissionAmount / aAmt) * 100;
        if (rate >= 0.1 && rate <= 1.2) score += 25;
      }

      if (score > bestScore) {
        bestScore = score;
        bestA = a;
        bestCommission = commissionAmount;
        bestDiffVal = Math.abs(commissionAmount);
        bestDaysDiff = daysDiff;
        bestTid = bTid || aTid || 'جهاز نقاط البيع';
      }
    }

    if (bestA) {
      const a = bestA;
      const daysDiff = bestDaysDiff;
      const commissionAmount = bestCommission;
      const tidUsed = bestTid;
      const diffVal = bestDiffVal;

      matchedBankIds.add(b.id);
      matchedAccIds.add(a.id);

      b.terminalId = tidUsed;
      a.terminalId = tidUsed;

      if (diffVal < 0.001) {
          // Exact KNET Match without commission (or net gross logged)
          b.matchStatus = 'matched';
          b.matchedAccountingId = a.id;
          b.matchedLevel = 1;

          a.matchStatus = 'matched';
          a.matchedBankId = b.id;

          matches.push({
            id: `match-knet-exact-${Date.now()}-${matches.length}`,
            sessionId,
            bankTxId: b.id,
            accountingTxId: a.id,
            matchLevel: 1,
            confidenceScore: 98,
            amountDifference: 0,
            dateDifferenceDays: daysDiff,
            matchedBy,
            matchedAt: new Date().toISOString().replace('T', ' ').substring(0, 19),
            notes: `تطابق تام لإيداع تسوية كي نت لجهاز رقم (${tidUsed})`,
          });
        } else {
          // Smart KNET Match with Commission Deduction
          b.matchStatus = 'partial_match';
          b.matchedAccountingId = a.id;
          b.matchedLevel = 3;

          a.matchStatus = 'partial_match';
          a.matchedBankId = b.id;

          const commRate = aAmt > 0 ? Math.round(((diffVal / aAmt) * 100) * 100) / 100 : 0;

          matches.push({
            id: `match-knet-comm-${Date.now()}-${matches.length}`,
            sessionId,
            bankTxId: b.id,
            accountingTxId: a.id,
            matchLevel: 3,
            confidenceScore: 95,
            amountDifference: diffVal,
            dateDifferenceDays: daysDiff,
            matchedBy,
            matchedAt: new Date().toISOString().replace('T', ' ').substring(0, 19),
            notes: `مطابقة ذكية لتسوية كي نت لجهاز (${tidUsed}) مع استخراج عمولة بنكية مخصومة قدرها ${diffVal.toFixed(3)} د.ك (${commRate}%)`,
          });

          differences.push({
            id: `diff-knet-${Date.now()}-${differences.length}`,
            sessionId,
            bankTxId: b.id,
            accountingTxId: a.id,
            differenceType: 'knet_commission',
            categoryGroup: 'knet_commission',
            terminalId: tidUsed,
            monthKey: b.transactionDate.substring(0, 7),
            transactionDate: b.transactionDate,
            referenceNumber: b.referenceNumber || `KNET-TID-${tidUsed}`,
            description: `عمولة تسوية كي نت K-NET مخصومة لجهاز رقم (${tidUsed})`,
            bankAmount: bAmt,
            accountingAmount: aAmt,
            differenceValue: diffVal,
            commissionRate: commRate,
            cause: `عمولة شبكة كي نت ونقاط البيع مخصومة تلقائياً من إيداع مبيعات ${a.entryDate} لجهاز رقم (${tidUsed}) بمعدل تقريبي ${commRate}%`,
            requiredAction: `إثبات قيد مصروف عمولة كي نت (${diffVal.toFixed(3)} د.ك) لجهاز ${tidUsed}`,
            responsiblePerson: 'محاسب نقاط البيع والخزينة',
            processingStatus: 'pending',
            createdAt: new Date().toISOString().replace('T', ' ').substring(0, 19),
          });
        }
      }
    }

  // =========================================================================
  // PHASE 3: التعرف الذكي على مصروف إيجار أجهزة الكي نت (15 دينار شهرياً لكل جهاز)
  // =========================================================================
  for (const b of bankPool) {
    if (b.isExcluded || matchedBankIds.has(b.id)) continue;

    const rentalCheck = isKnetRentalFee(b);
    if (rentalCheck.isRental) {
      matchedBankIds.add(b.id);
      b.matchStatus = 'bank_fee';
      b.matchedLevel = 3;

      const tid = rentalCheck.terminalId || b.terminalId || 'جهاز كي نت';
      const bAmt = Math.abs(b.netAmount);

      differences.push({
        id: `diff-rent-${Date.now()}-${differences.length}`,
        sessionId,
        bankTxId: b.id,
        differenceType: 'knet_rental_fee',
        categoryGroup: 'knet_rent',
        terminalId: tid,
        monthKey: b.transactionDate.substring(0, 7),
        transactionDate: b.transactionDate,
        referenceNumber: b.referenceNumber || `RENT-KNET-${tid}`,
        description: `مصروف إيجار جهاز كي نت شهرياً (15 د.ك) - جهاز رقم (${tid})`,
        bankAmount: bAmt,
        accountingAmount: 0,
        differenceValue: bAmt,
        cause: `رسوم إيجار جهاز نقاط البيع KNET الشهرية المقررة (15.000 د.ك) المخصومة أول الشهر لجهاز رقم (${tid})`,
        requiredAction: 'إنشاء قيد مصروف إيجار أجهزة نقاط البيع وحساب المصروفات البنكية',
        responsiblePerson: 'المحاسب العام',
        processingStatus: 'pending',
        createdAt: new Date().toISOString().replace('T', ' ').substring(0, 19),
      });
    }
  }

  // =========================================================================
  // PHASE 4: LEVEL 1: التطابق التام للمرجع والمبلغ والتاريخ لباقي العمليات
  // =========================================================================
  for (const b of bankPool) {
    if (b.isExcluded || matchedBankIds.has(b.id)) continue;

    const bAmt = Math.abs(b.netAmount);
    const bIsCredit = b.credit > 0;

    for (const a of accPool) {
      if (matchedAccIds.has(a.id)) continue;

      const aAmt = Math.abs(a.netAmount);
      const aIsDebit = a.debit > 0;
      if (bIsCredit !== aIsDebit) continue;

      const exactAmount = Math.abs(bAmt - aAmt) < 0.001;
      const refMatches =
        (b.referenceNumber && a.referenceNumber && cleanStr(b.referenceNumber) === cleanStr(a.referenceNumber)) ||
        (b.transferNumber && a.transferNumber && cleanStr(b.transferNumber) === cleanStr(a.transferNumber));

      const daysDiff = getDaysDiff(b.transactionDate, a.entryDate);

      if (exactAmount && refMatches && daysDiff <= 1) {
        matchedBankIds.add(b.id);
        matchedAccIds.add(a.id);

        b.matchStatus = 'matched';
        b.matchedAccountingId = a.id;
        b.matchedLevel = 1;

        a.matchStatus = 'matched';
        a.matchedBankId = b.id;

        matches.push({
          id: `match-l1-${Date.now()}-${matches.length}`,
          sessionId,
          bankTxId: b.id,
          accountingTxId: a.id,
          matchLevel: 1,
          confidenceScore: 100,
          amountDifference: 0,
          dateDifferenceDays: daysDiff,
          matchedBy,
          matchedAt: new Date().toISOString().replace('T', ' ').substring(0, 19),
          notes: 'تطابق تام للمرجع والمبلغ والتاريخ (المستوى الأول)',
        });
        break;
      }
    }
  }

  // =========================================================================
  // PHASE 5: LEVEL 2: تطابق المبلغ + مقارنة الوصف/المستفيد + فارق زمني مسموح
  // =========================================================================
  for (const b of bankPool) {
    if (b.isExcluded || matchedBankIds.has(b.id)) continue;

    const bAmt = Math.abs(b.netAmount);
    const bIsCredit = b.credit > 0;

    for (const a of accPool) {
      if (matchedAccIds.has(a.id)) continue;

      const aAmt = Math.abs(a.netAmount);
      const aIsDebit = a.debit > 0;
      if (bIsCredit !== aIsDebit) continue;

      const exactAmount = Math.abs(bAmt - aAmt) < 0.001;
      const daysDiff = getDaysDiff(b.transactionDate, a.entryDate);

      if (exactAmount && daysDiff <= settings.allowedDateToleranceDays) {
        const bText = cleanStr((b.description || '') + (b.partyName || ''));
        const aText = cleanStr((a.description || '') + (a.partyName || '') + (a.counterAccountName || ''));

        let overlap = false;
        if (bText && aText) {
          const bTokens = bText.match(/.{1,4}/g) || [];
          overlap = bTokens.some((tok) => tok.length >= 3 && aText.includes(tok));
        }

        if (overlap || daysDiff <= 1) {
          matchedBankIds.add(b.id);
          matchedAccIds.add(a.id);

          b.matchStatus = 'matched';
          b.matchedAccountingId = a.id;
          b.matchedLevel = 2;

          a.matchStatus = 'matched';
          a.matchedBankId = b.id;

          matches.push({
            id: `match-l2-${Date.now()}-${matches.length}`,
            sessionId,
            bankTxId: b.id,
            accountingTxId: a.id,
            matchLevel: 2,
            confidenceScore: 92,
            amountDifference: 0,
            dateDifferenceDays: daysDiff,
            matchedBy,
            matchedAt: new Date().toISOString().replace('T', ' ').substring(0, 19),
            notes: `تطابق بالمبلغ وتقارب بالبيان وفارق زمني ${daysDiff} يوم (المستوى الثاني)`,
          });
          break;
        }
      }
    }
  }

  // =========================================================================
  // PHASE 6: LEVEL 3: تقارب العمليات واستخراج الفروقات التلقائية
  // =========================================================================
  for (const b of bankPool) {
    if (b.isExcluded || matchedBankIds.has(b.id)) continue;

    const bAmt = Math.abs(b.netAmount);
    const bIsCredit = b.credit > 0;

    for (const a of accPool) {
      if (matchedAccIds.has(a.id)) continue;

      const aAmt = Math.abs(a.netAmount);
      const aIsDebit = a.debit > 0;
      if (bIsCredit !== aIsDebit) continue;

      const diffAmt = Math.round(Math.abs(bAmt - aAmt) * 1000) / 1000;
      const daysDiff = getDaysDiff(b.transactionDate, a.entryDate);

      const refMatches =
        (b.referenceNumber && a.referenceNumber && cleanStr(b.referenceNumber) === cleanStr(a.referenceNumber)) ||
        (b.transferNumber && a.transferNumber && cleanStr(b.transferNumber) === cleanStr(a.transferNumber));

      let descSimilar = false;
      if (settings.enableFuzzyMatching && daysDiff <= settings.allowedDateToleranceDays) {
        const bText = cleanStr((b.description || '') + (b.partyName || ''));
        const aText = cleanStr((a.description || '') + (a.partyName || '') + (a.counterAccountName || ''));
        if (bText && aText) {
          const bTokens = bText.match(/.{1,4}/g) || [];
          descSimilar = bTokens.some((tok) => tok.length >= 3 && aText.includes(tok));
        }
      }

      if (diffAmt > 0 && (refMatches || descSimilar)) {
        matchedBankIds.add(b.id);
        matchedAccIds.add(a.id);

        b.matchStatus = 'partial_match';
        b.matchedAccountingId = a.id;
        b.matchedLevel = 3;

        a.matchStatus = 'partial_match';
        a.matchedBankId = b.id;

        const isDeposit = b.credit > 0;

        matches.push({
          id: `match-l3-${Date.now()}-${matches.length}`,
          sessionId,
          bankTxId: b.id,
          accountingTxId: a.id,
          matchLevel: 3,
          confidenceScore: 85,
          amountDifference: diffAmt,
          dateDifferenceDays: daysDiff,
          matchedBy,
          matchedAt: new Date().toISOString().replace('T', ' ').substring(0, 19),
          notes: `تقارب بالمرجع والبيان مع استخراج فرق بمقدار ${diffAmt.toFixed(3)} د.ك`,
        });

        differences.push({
          id: `diff-${Date.now()}-${differences.length}`,
          sessionId,
          bankTxId: b.id,
          accountingTxId: a.id,
          differenceType: isDeposit ? 'deposit_diff' : 'amount_mismatch',
          categoryGroup: isDeposit ? 'deposits' : 'other',
          monthKey: b.transactionDate.substring(0, 7),
          transactionDate: b.transactionDate,
          referenceNumber: b.referenceNumber || a.referenceNumber,
          description: b.description || a.description,
          bankAmount: bAmt,
          accountingAmount: aAmt,
          differenceValue: diffAmt,
          cause: isDeposit
            ? `فرق إيداع نقدي أو تحويل وارد بين كشف البنك (${bAmt.toFixed(3)} د.ك) والدفاتر (${aAmt.toFixed(3)} د.ك)`
            : `فرق مالي مستخرج تلقائياً بين كشف البنك والدفاتر`,
          requiredAction: 'مراجعة أصل السند وإجراء قيد تسوية',
          responsiblePerson: 'المحاسب المسؤول',
          processingStatus: 'pending',
          createdAt: new Date().toISOString().replace('T', ' ').substring(0, 19),
        });
        break;
      }
    }
  }

  // =========================================================================
  // PHASE 7: تصنيف الحركات المتبقية في كشف البنك (Unmatched Bank Items)
  // =========================================================================
  for (const b of bankPool) {
    if (b.isExcluded || matchedBankIds.has(b.id)) continue;

    const descLower = (b.description || '').toLowerCase();
    const isFee =
      descLower.includes('fee') ||
      descLower.includes('charge') ||
      descLower.includes('عمولة') ||
      descLower.includes('رسوم') ||
      descLower.includes('مصروف');

    const bAmt = Math.abs(b.netAmount);

    if (isFee) {
      b.matchStatus = 'bank_fee';
      differences.push({
        id: `diff-fee-${Date.now()}-${differences.length}`,
        sessionId,
        bankTxId: b.id,
        differenceType: 'bank_fee',
        categoryGroup: 'bank_fees',
        monthKey: b.transactionDate.substring(0, 7),
        transactionDate: b.transactionDate,
        referenceNumber: b.referenceNumber,
        description: b.description,
        bankAmount: bAmt,
        accountingAmount: 0,
        differenceValue: bAmt,
        cause: 'رسوم أو عمولة بنكية مباشرة من كشف الحساب لم تسجل بالدفاتر',
        requiredAction: 'إنشاء قيد مصروف عمولات ومصاريف بنكية',
        responsiblePerson: 'المحاسب المسؤول',
        processingStatus: 'pending',
        createdAt: new Date().toISOString().replace('T', ' ').substring(0, 19),
      });
    } else {
      b.matchStatus = 'bank_only';
      differences.push({
        id: `diff-bo-${Date.now()}-${differences.length}`,
        sessionId,
        bankTxId: b.id,
        differenceType: 'missing_in_accounting',
        categoryGroup: 'other',
        monthKey: b.transactionDate.substring(0, 7),
        transactionDate: b.transactionDate,
        referenceNumber: b.referenceNumber,
        description: b.description,
        bankAmount: bAmt,
        accountingAmount: 0,
        differenceValue: bAmt,
        cause: 'حركة موجودة في كشف البنك وغير مسجلة في نظام المحاسبة الدفتري',
        requiredAction: 'إنشاء قيد محاسبي أو التحقق من المستندات المصرفية',
        responsiblePerson: 'المحاسب العام',
        processingStatus: 'pending',
        createdAt: new Date().toISOString().replace('T', ' ').substring(0, 19),
      });
    }
  }

  // =========================================================================
  // PHASE 8: تصنيف الحركات المتبقية في الدفاتر المحاسبية (Unmatched Accounting Items)
  // =========================================================================
  for (const a of accPool) {
    if (matchedAccIds.has(a.id)) continue;

    const aAmt = Math.abs(a.netAmount);

    // If cheque was issued but not cleared yet (unpresented cheque)
    if (a.chequeNumber || a.sourceModule === 'cheques' || a.credit > 0) {
      a.matchStatus = 'pending';
      differences.push({
        id: `diff-unpres-${Date.now()}-${differences.length}`,
        sessionId,
        accountingTxId: a.id,
        differenceType: 'unpresented_cheque',
        categoryGroup: 'cheques',
        chequeNumber: a.chequeNumber,
        monthKey: a.entryDate.substring(0, 7),
        transactionDate: a.entryDate,
        referenceNumber: a.referenceNumber || (a.chequeNumber ? `CHK-${a.chequeNumber}` : a.journalEntryNumber),
        description: a.chequeNumber
          ? `شيك صادر رقم #${a.chequeNumber} - معلق لم يقدم للصرف بعد`
          : `سند صرف ${a.description} - لم يظهر في كشف البنك`,
        bankAmount: 0,
        accountingAmount: aAmt,
        differenceValue: aAmt,
        cause: a.chequeNumber
          ? `شيك صادر بالدفاتر رقم #${a.chequeNumber} لصالح (${a.partyName || a.counterAccountName}) ولم يتقدم المستفيد لصرفه من البنك بعد`
          : 'حركة صرف مسجلة بالدفاتر ولم تخصم من البنك بعد',
        requiredAction: 'متابعة الصرف مع المستفيد وإبقاؤها كشيكات معلقة بمذكرة التسوية',
        responsiblePerson: 'قسم الخزينة والشيكات',
        processingStatus: 'in_progress',
        createdAt: new Date().toISOString().replace('T', ' ').substring(0, 19),
      });
    } else if (a.debit > 0) {
      // Uncredited deposit (in transit)
      a.matchStatus = 'pending';
      differences.push({
        id: `diff-undep-${Date.now()}-${differences.length}`,
        sessionId,
        accountingTxId: a.id,
        differenceType: 'uncredited_deposit',
        categoryGroup: 'deposits',
        terminalId: a.terminalId,
        monthKey: a.entryDate.substring(0, 7),
        transactionDate: a.entryDate,
        referenceNumber: a.referenceNumber || a.journalEntryNumber,
        description: `إيداع نقدي أو تحويل بالدفاتر بالطريق: ${a.description}`,
        bankAmount: 0,
        accountingAmount: aAmt,
        differenceValue: aAmt,
        cause: 'إيداع نقدي أو تحويل أو مبيعات مثبتة بالدفاتر لم تظهر في كشف البنك حتى تاريخ الإقفال (إيداع بالطريق)',
        requiredAction: 'مراجعة قسيمة الإيداع المصرفية وتاريخ إضافة الرصيد بالبنك',
        responsiblePerson: 'أمين الصندوق والمتحصلات',
        processingStatus: 'in_progress',
        createdAt: new Date().toISOString().replace('T', ' ').substring(0, 19),
      });
    } else {
      a.matchStatus = 'accounting_only';
      differences.push({
        id: `diff-ao-${Date.now()}-${differences.length}`,
        sessionId,
        accountingTxId: a.id,
        differenceType: 'missing_in_bank',
        categoryGroup: 'other',
        monthKey: a.entryDate.substring(0, 7),
        transactionDate: a.entryDate,
        referenceNumber: a.referenceNumber || a.journalEntryNumber,
        description: a.description,
        bankAmount: 0,
        accountingAmount: aAmt,
        differenceValue: aAmt,
        cause: 'حركة مسجلة بالمحاسبة ولم تظهر في كشف البنك',
        requiredAction: 'مراجعة أصل العملية والمستند المؤيد',
        responsiblePerson: 'المحاسب المسؤول',
        processingStatus: 'pending',
        createdAt: new Date().toISOString().replace('T', ' ').substring(0, 19),
      });
    }
  }

  return {
    updatedBankTx: bankPool,
    updatedAccTx: accPool,
    matches,
    differences,
  };
}

/**
 * Build itemized monthly and per-terminal summary breakdown of differences
 */
export function buildMonthlyDifferencesBreakdown(
  differences: ReconciliationDifference[]
): MonthlyDifferencesBreakdown[] {
  const mapByMonth = new Map<string, ReconciliationDifference[]>();

  differences.forEach((d) => {
    const month = d.monthKey || (d.transactionDate ? d.transactionDate.substring(0, 7) : 'غير محدد');
    if (!mapByMonth.has(month)) mapByMonth.set(month, []);
    mapByMonth.get(month)!.push(d);
  });

  const sortedMonths = Array.from(mapByMonth.keys()).sort().reverse();
  const breakdowns: MonthlyDifferencesBreakdown[] = [];

  for (const month of sortedMonths) {
    const diffs = mapByMonth.get(month)!;

    const knetDiffs = diffs.filter((d) => d.differenceType === 'knet_commission');
    const rentDiffs = diffs.filter((d) => d.differenceType === 'knet_rental_fee');
    const chqDiffs = diffs.filter((d) => d.differenceType === 'cheque_diff');
    const unpresDiffs = diffs.filter((d) => d.differenceType === 'unpresented_cheque');
    const depDiffs = diffs.filter((d) => d.differenceType === 'deposit_diff' || d.differenceType === 'uncredited_deposit');
    const feeDiffs = diffs.filter((d) => d.differenceType === 'bank_fee');
    const otherDiffs = diffs.filter(
      (d) =>
        ![
          'knet_commission',
          'knet_rental_fee',
          'cheque_diff',
          'unpresented_cheque',
          'deposit_diff',
          'uncredited_deposit',
          'bank_fee',
        ].includes(d.differenceType)
    );

    // K-Net Terminal Summaries
    const terminalMap = new Map<
      string,
      {
        sales: number;
        settlement: number;
        commission: number;
        rental: number;
        count: number;
      }
    >();

    knetDiffs.forEach((kd) => {
      const tid = kd.terminalId || 'جهاز عام';
      if (!terminalMap.has(tid)) {
        terminalMap.set(tid, { sales: 0, settlement: 0, commission: 0, rental: 0, count: 0 });
      }
      const st = terminalMap.get(tid)!;
      st.sales += kd.accountingAmount || 0;
      st.settlement += kd.bankAmount || 0;
      st.commission += kd.differenceValue || 0;
      st.count += 1;
    });

    rentDiffs.forEach((rd) => {
      const tid = rd.terminalId || 'جهاز عام';
      if (!terminalMap.has(tid)) {
        terminalMap.set(tid, { sales: 0, settlement: 0, commission: 0, rental: 0, count: 0 });
      }
      const st = terminalMap.get(tid)!;
      st.rental += rd.differenceValue || 0;
    });

    const terminalSummaries: KnetTerminalMonthlySummary[] = Array.from(terminalMap.entries()).map(([tid, st]) => ({
      terminalId: tid,
      month,
      totalSalesLedger: Math.round(st.sales * 1000) / 1000,
      totalSettlementBank: Math.round(st.settlement * 1000) / 1000,
      totalCommissionDeducted: Math.round(st.commission * 1000) / 1000,
      rentalFee: Math.round(st.rental * 1000) / 1000,
      totalDeductions: Math.round((st.commission + st.rental) * 1000) / 1000,
      transactionCount: st.count,
      averageCommissionRate: st.sales > 0 ? Math.round(((st.commission / st.sales) * 100) * 100) / 100 : 0,
    }));

    const knetCommissionsTotal = Math.round(knetDiffs.reduce((sum, d) => sum + d.differenceValue, 0) * 1000) / 1000;
    const knetRentalTotal = Math.round(rentDiffs.reduce((sum, d) => sum + d.differenceValue, 0) * 1000) / 1000;
    const chequeDifferencesTotal = Math.round(chqDiffs.reduce((sum, d) => sum + d.differenceValue, 0) * 1000) / 1000;
    const unpresentedChequesTotal = Math.round(unpresDiffs.reduce((sum, d) => sum + d.differenceValue, 0) * 1000) / 1000;
    const depositDifferencesTotal = Math.round(depDiffs.reduce((sum, d) => sum + d.differenceValue, 0) * 1000) / 1000;
    const bankFeesTotal = Math.round(feeDiffs.reduce((sum, d) => sum + d.differenceValue, 0) * 1000) / 1000;
    const otherDifferencesTotal = Math.round(otherDiffs.reduce((sum, d) => sum + d.differenceValue, 0) * 1000) / 1000;

    const grandTotal = Math.round((
      knetCommissionsTotal +
      knetRentalTotal +
      chequeDifferencesTotal +
      unpresentedChequesTotal +
      depositDifferencesTotal +
      bankFeesTotal +
      otherDifferencesTotal
    ) * 1000) / 1000;

    breakdowns.push({
      month,
      knetCommissionsTotal,
      knetCommissionsCount: knetDiffs.length,
      knetRentalTotal,
      knetRentalCount: rentDiffs.length,
      chequeDifferencesTotal,
      chequeDifferencesCount: chqDiffs.length,
      unpresentedChequesTotal,
      unpresentedChequesCount: unpresDiffs.length,
      depositDifferencesTotal,
      depositDifferencesCount: depDiffs.length,
      bankFeesTotal,
      bankFeesCount: feeDiffs.length,
      otherDifferencesTotal,
      otherDifferencesCount: otherDiffs.length,
      grandTotal,
      terminalSummaries,
    });
  }

  return breakdowns;
}

/**
 * Calculate full mathematical Bank Reconciliation summary
 */
export function calculateReconciliationSummary(
  bankClosingBalance: number,
  accountingClosingBalance: number,
  bankTxList: BankStatementTransaction[],
  accTxList: AccountingTransaction[],
  differences: ReconciliationDifference[]
): ReconciliationSummary {
  const matchedBank = bankTxList.filter((b) => b.matchStatus === 'matched' || b.matchStatus === 'partial_match');
  const unmatchedBank = bankTxList.filter(
    (b) => !b.isExcluded && b.matchStatus !== 'matched' && b.matchStatus !== 'partial_match'
  );

  const matchedAcc = accTxList.filter((a) => a.matchStatus === 'matched' || a.matchStatus === 'partial_match');
  const unmatchedAcc = accTxList.filter((a) => a.matchStatus !== 'matched' && a.matchStatus !== 'partial_match');

  // Sum unpresented cheques (credit in accounting, not yet in bank)
  const unpresentedCheques = accTxList
    .filter((a) => (a.credit > 0 || !!a.chequeNumber) && a.matchStatus !== 'matched')
    .reduce((sum, a) => sum + (a.credit || Math.abs(a.netAmount)), 0);

  // Sum uncredited deposits (debit in accounting, not yet in bank)
  const uncreditedDeposits = accTxList
    .filter((a) => a.debit > 0 && a.matchStatus !== 'matched')
    .reduce((sum, a) => sum + a.debit, 0);

  // Bank fees and KNET rental fees not recorded in accounting
  const totalBankFees = bankTxList
    .filter((b) => b.matchStatus === 'bank_fee')
    .reduce((sum, b) => sum + (b.debit || Math.abs(b.netAmount)), 0);

  // Small differences & KNET commissions closed as fees
  const totalSmallDifferences = differences
    .filter((d) => d.processingStatus === 'closed_as_fee' || d.processingStatus === 'resolved')
    .reduce((sum, d) => sum + d.differenceValue, 0);

  // Bank Adjusted Balance formula:
  // Bank Balance + Uncredited Deposits - Unpresented Cheques
  const adjustedBank = bankClosingBalance + uncreditedDeposits - unpresentedCheques;

  // Accounting Adjusted Balance formula:
  // Accounting Balance - Unrecorded Bank Fees
  const adjustedAccounting = accountingClosingBalance - totalBankFees;

  const netDiff = Math.round((adjustedBank - adjustedAccounting) * 1000) / 1000;
  const isBalanced = Math.abs(netDiff) < 0.005;

  return {
    bankClosingBalance,
    accountingClosingBalance,
    totalMatchedCount: matchedBank.length,
    totalMatchedAmount: matchedBank.reduce((sum, b) => sum + Math.abs(b.netAmount), 0),
    totalUnmatchedBankCount: unmatchedBank.length,
    totalUnmatchedBankAmount: unmatchedBank.reduce((sum, b) => sum + Math.abs(b.netAmount), 0),
    totalUnmatchedAccountingCount: unmatchedAcc.length,
    totalUnmatchedAccountingAmount: unmatchedAcc.reduce((sum, a) => sum + Math.abs(a.netAmount), 0),
    unpresentedChequesTotal: unpresentedCheques,
    uncreditedDepositsTotal: uncreditedDeposits,
    totalBankFees,
    totalSmallDifferences,
    adjustedBankBalance: adjustedBank,
    adjustedAccountingBalance: adjustedAccounting,
    netDifference: netDiff,
    isBalanced,
  };
}
