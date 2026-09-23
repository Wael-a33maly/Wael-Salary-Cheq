import {
  BankStatementTransaction,
  AccountingTransaction,
  ReconciliationMatch,
  ReconciliationDifference,
  BankReconciliationSettings,
  ReconciliationSummary
} from '../types/reconciliationTypes';

/**
 * Standardize strings for fuzzy comparison
 */
function cleanStr(s?: string): string {
  if (!s) return '';
  return s
    .toLowerCase()
    .replace(/[^\w\u0621-\u064A]/g, '') // remove symbols & whitespace
    .trim();
}

/**
 * Calculate absolute difference in days between two ISO date strings (YYYY-MM-DD)
 */
function getDaysDiff(d1: string, d2: string): number {
  try {
    const t1 = new Date(d1).getTime();
    const t2 = new Date(d2).getTime();
    return Math.abs(Math.round((t1 - t2) / (1000 * 60 * 60 * 24)));
  } catch {
    return 999;
  }
}

/**
 * Run the 3-level matching engine
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

  // Deep clone to avoid mutating input directly
  const bankPool: BankStatementTransaction[] = bankTxList.map((tx) => ({ ...tx }));
  const accPool: AccountingTransaction[] = accTxList.map((tx) => ({ ...tx }));

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

  // ==========================================
  // LEVEL 1: التطابق التام (Exact Reference + Exact Amount + Date within 1 day)
  // ==========================================
  for (const b of bankPool) {
    if (b.isExcluded || matchedBankIds.has(b.id)) continue;

    // Check if duplicate in bank
    const sameRef = bankPool.filter(
      (x) => !x.isExcluded && x.referenceNumber && cleanStr(x.referenceNumber) === cleanStr(b.referenceNumber)
    );
    if (sameRef.length > 1) {
      b.matchStatus = 'duplicate';
      continue;
    }

    const bAmt = Math.abs(b.netAmount);
    const bIsCredit = b.credit > 0;

    for (const a of accPool) {
      if (matchedAccIds.has(a.id)) continue;

      const aAmt = Math.abs(a.netAmount);
      const aIsDebit = a.debit > 0; // In accounting, bank debit is incoming money

      // Same direction
      if (bIsCredit !== aIsDebit) continue;

      const exactAmount = Math.abs(bAmt - aAmt) < 0.001;
      const refMatches =
        cleanStr(b.referenceNumber) === cleanStr(a.referenceNumber) ||
        (b.chequeNumber && a.chequeNumber && cleanStr(b.chequeNumber) === cleanStr(a.chequeNumber)) ||
        (b.transferNumber && a.transferNumber && cleanStr(b.transferNumber) === cleanStr(a.transferNumber));

      const daysDiff = getDaysDiff(b.transactionDate, a.entryDate);

      if (exactAmount && refMatches && daysDiff <= 1) {
        // Matched Level 1
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

  // ==========================================
  // LEVEL 2: تطابق المبلغ + مقارنة الوصف/المستفيد + فارق زمني مسموح
  // ==========================================
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
        // Compare text keywords in description or party name
        const bText = cleanStr((b.description || '') + (b.partyName || ''));
        const aText = cleanStr((a.description || '') + (a.partyName || '') + (a.counterAccountName || ''));

        // Check if there is meaningful text overlap
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

  // ==========================================
  // LEVEL 3: المطابقة الذكية واستخراج كافة الفروقات تلقائياً (بدون قيود أو حد يدوي)
  // ==========================================
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

      // Check if reference or cheque or transfer matches
      const refMatches =
        cleanStr(b.referenceNumber) === cleanStr(a.referenceNumber) ||
        (b.chequeNumber && a.chequeNumber && cleanStr(b.chequeNumber) === cleanStr(a.chequeNumber)) ||
        (b.transferNumber && a.transferNumber && cleanStr(b.transferNumber) === cleanStr(a.transferNumber));

      // Check text similarity if enabled
      let descSimilar = false;
      if (settings.enableFuzzyMatching && daysDiff <= settings.allowedDateToleranceDays) {
        const bText = cleanStr((b.description || '') + (b.partyName || ''));
        const aText = cleanStr((a.description || '') + (a.partyName || '') + (a.counterAccountName || ''));
        if (bText && aText) {
          const bTokens = bText.match(/.{1,4}/g) || [];
          descSimilar = bTokens.some((tok) => tok.length >= 3 && aText.includes(tok));
        }
      }

      // Automatically extract difference without any threshold limit!
      if (diffAmt > 0 && (refMatches || descSimilar)) {
        matchedBankIds.add(b.id);
        matchedAccIds.add(a.id);

        b.matchStatus = 'partial_match';
        b.matchedAccountingId = a.id;
        b.matchedLevel = 3;

        a.matchStatus = 'partial_match';
        a.matchedBankId = b.id;

        const isMicroDiff = diffAmt <= 2.0;
        const confidence = refMatches ? (isMicroDiff ? 90 : 80) : 70;

        matches.push({
          id: `match-l3-${Date.now()}-${matches.length}`,
          sessionId,
          bankTxId: b.id,
          accountingTxId: a.id,
          matchLevel: 3,
          confidenceScore: confidence,
          amountDifference: diffAmt,
          dateDifferenceDays: daysDiff,
          matchedBy,
          matchedAt: new Date().toISOString().replace('T', ' ').substring(0, 19),
          notes: refMatches
            ? `تطابق المرجع مع استخراج فرق مالي تلقائياً بمقدار ${diffAmt.toFixed(3)} د.ك (المستوى الثالث)`
            : `تقارب الوصف والبيان مع استخراج فرق مالي تلقائياً بمقدار ${diffAmt.toFixed(3)} د.ك (المستوى الثالث)`,
        });

        // Record a difference item automatically
        differences.push({
          id: `diff-${Date.now()}-${differences.length}`,
          sessionId,
          bankTxId: b.id,
          accountingTxId: a.id,
          differenceType: 'amount_mismatch',
          transactionDate: b.transactionDate,
          referenceNumber: b.referenceNumber || a.referenceNumber,
          description: b.description || a.description,
          bankAmount: bAmt,
          accountingAmount: aAmt,
          differenceValue: diffAmt,
          cause: isMicroDiff
            ? 'فرق مالي بسيط مستخرج تلقائياً (عمولة KNET / رسوم بنكية / فرق تقريب)'
            : 'فرق مالي مستخرج تلقائياً بين كشف البنك ودفاتر التطبيق',
          requiredAction: isMicroDiff ? 'إقفال سريع كعمولة بنكية' : 'مراجعة الفرق وإنشاء قيد تسوية',
          responsiblePerson: 'المحاسب المسؤول',
          processingStatus: 'pending',
          createdAt: new Date().toISOString().replace('T', ' ').substring(0, 19),
        });
        break;
      }
    }
  }

  // ==========================================
  // CLASSIFY UNMATCHED ITEMS & BUILD DIFFERENCES
  // ==========================================
  // Remaining Bank Items
  for (const b of bankPool) {
    if (b.isExcluded || matchedBankIds.has(b.id)) continue;

    // Is it a service fee or interest?
    const descLower = (b.description || '').toLowerCase();
    const isFee =
      descLower.includes('fee') ||
      descLower.includes('charge') ||
      descLower.includes('عمولة') ||
      descLower.includes('رسوم') ||
      descLower.includes('knet');

    if (isFee) {
      b.matchStatus = 'bank_fee';
      differences.push({
        id: `diff-fee-${Date.now()}-${differences.length}`,
        sessionId,
        bankTxId: b.id,
        differenceType: 'bank_fee',
        transactionDate: b.transactionDate,
        referenceNumber: b.referenceNumber,
        description: b.description,
        bankAmount: Math.abs(b.netAmount),
        accountingAmount: 0,
        differenceValue: Math.abs(b.netAmount),
        cause: 'رسوم أو عمولة بنكية مباشرة من كشف الحساب لم تسجل بالدفاتر',
        requiredAction: 'إنشاء قيد مصروف عمولات بنكية',
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
        transactionDate: b.transactionDate,
        referenceNumber: b.referenceNumber,
        description: b.description,
        bankAmount: Math.abs(b.netAmount),
        accountingAmount: 0,
        differenceValue: Math.abs(b.netAmount),
        cause: 'حركة موجودة في كشف البنك وغير مسجلة في نظام المحاسبة',
        requiredAction: 'إنشاء قيد محاسبي أو التحقق من المستندات',
        responsiblePerson: 'المحاسب العام',
        processingStatus: 'pending',
        createdAt: new Date().toISOString().replace('T', ' ').substring(0, 19),
      });
    }
  }

  // Remaining Accounting Items
  for (const a of accPool) {
    if (matchedAccIds.has(a.id)) continue;

    // Check if cheque unpresented
    if (a.chequeNumber || a.sourceModule === 'cheques') {
      a.matchStatus = 'pending';
      differences.push({
        id: `diff-chk-${Date.now()}-${differences.length}`,
        sessionId,
        accountingTxId: a.id,
        differenceType: 'unpresented_cheque',
        transactionDate: a.entryDate,
        referenceNumber: a.referenceNumber,
        description: a.description,
        bankAmount: 0,
        accountingAmount: Math.abs(a.netAmount),
        differenceValue: Math.abs(a.netAmount),
        cause: 'شيك صادر مسجل بالدفاتر ولم يتقدم المستفيد لصرفه من البنك بعد',
        requiredAction: 'متابعة الصرف مع المستفيد أو الانتظار كحركة معلقة',
        responsiblePerson: 'قسم الخزينة والشيكات',
        processingStatus: 'in_progress',
        createdAt: new Date().toISOString().replace('T', ' ').substring(0, 19),
      });
    } else if (a.debit > 0) {
      a.matchStatus = 'pending';
      differences.push({
        id: `diff-dep-${Date.now()}-${differences.length}`,
        sessionId,
        accountingTxId: a.id,
        differenceType: 'uncredited_deposit',
        transactionDate: a.entryDate,
        referenceNumber: a.referenceNumber,
        description: a.description,
        bankAmount: 0,
        accountingAmount: Math.abs(a.netAmount),
        differenceValue: Math.abs(a.netAmount),
        cause: 'إيداع نقدي أو تحويل قيد التنفيذ لم يظهر في كشف البنك',
        requiredAction: 'مراجعة قسيمة الإيداع والبنك',
        responsiblePerson: 'أمين الصندوق',
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
        transactionDate: a.entryDate,
        referenceNumber: a.referenceNumber,
        description: a.description,
        bankAmount: 0,
        accountingAmount: Math.abs(a.netAmount),
        differenceValue: Math.abs(a.netAmount),
        cause: 'حركة مسجلة بالمحاسبة ولم تظهر في كشف البنك',
        requiredAction: 'مراجعة أصل العملية والتاريخ',
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
    .filter((a) => a.credit > 0 && a.matchStatus !== 'matched')
    .reduce((sum, a) => sum + a.credit, 0);

  // Sum uncredited deposits (debit in accounting, not yet in bank)
  const uncreditedDeposits = accTxList
    .filter((a) => a.debit > 0 && a.matchStatus !== 'matched')
    .reduce((sum, a) => sum + a.debit, 0);

  // Bank fees not recorded in accounting
  const totalBankFees = bankTxList
    .filter((b) => b.matchStatus === 'bank_fee')
    .reduce((sum, b) => sum + b.debit, 0);

  // Small differences
  const totalSmallDifferences = differences
    .filter((d) => d.processingStatus === 'closed_as_fee')
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
