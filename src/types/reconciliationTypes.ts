// Bank Reconciliation Types & Database Schema
export type MatchStatus =
  | 'matched'
  | 'unmatched'
  | 'partial_match'
  | 'needs_review'
  | 'bank_only'
  | 'accounting_only'
  | 'amount_difference'
  | 'date_difference'
  | 'duplicate'
  | 'bank_fee'
  | 'pending'
  | 'excluded';

export type BankFeeType =
  | 'knet_fee'
  | 'bank_transfer_fee'
  | 'pos_fee'
  | 'atm_fee'
  | 'account_service_fee'
  | 'rounding_diff'
  | 'other_bank_expense';

export type DifferenceSeverity = 'minor' | 'major' | 'critical';

export interface BankReconciliationSettings {
  autoExtractDifferences: boolean; // استخراج تلقائي لكافة الفروقات دون وضع حد يدوي
  smallDifferenceLimit?: number; // قيمة مرجعية استرشادية
  bankFeeExpenseAccountId: string; // e.g. "5020-01"
  bankFeeExpenseAccountName: string; // e.g. "مصروف عمولات ومصاريف بنكية"
  allowedDateToleranceDays: number; // e.g. 3 days
  allowBatchMatching: boolean;
  autoDetectDebitCredit: boolean;
  enableFuzzyMatching: boolean;
  maskBankAccountsInReports: boolean;
  customBankName?: string;
  customAccountNumber?: string;
}

export interface BankStatementTransaction {
  id: string; // Unique transaction UUID
  importId: string;
  rowNumber: number;
  transactionDate: string; // YYYY-MM-DD
  referenceNumber: string; // رقم المرجع / رقم العملية
  description: string; // بيان الحركة البنكية
  debit: number; // مدين (سحب/مصروفات)
  credit: number; // دائن (إيداع/تحويل وارد)
  netAmount: number; // credit - debit
  balanceAfter: number; // الرصيد بعد الحركة
  partyName?: string; // اسم الطرف أو المستفيد
  chequeNumber?: string; // رقم الشيك
  transferNumber?: string; // رقم التحويل
  matchStatus: MatchStatus;
  matchedAccountingId?: string;
  matchedLevel?: 1 | 2 | 3 | 'manual';
  isExcluded?: boolean;
  exclusionReason?: string;
  hasError?: boolean;
  validationError?: string;
}

export interface AccountingTransaction {
  id: string;
  journalEntryNumber: string; // رقم القيد
  entryDate: string; // تاريخ القيد
  referenceNumber: string; // رقم المرجع
  description: string; // بيان الحركة
  counterAccountName: string; // الحساب المقابل (مثل: المورد، الموظف، المبيعات)
  counterAccountCode: string;
  debit: number; // مدين (إيداع بالبنك)
  credit: number; // دائن (صرف من البنك/شيك)
  netAmount: number; // debit - credit
  chequeNumber?: string;
  transferNumber?: string;
  partyName?: string;
  createdBy: string;
  status: 'posted' | 'draft' | 'reversed';
  hasAttachment?: boolean;
  sourceModule: 'payroll' | 'cheques' | 'general_ledger' | 'manual';
  matchStatus: MatchStatus;
  matchedBankId?: string;
}

export interface ReconciliationMatch {
  id: string;
  sessionId: string;
  bankTxId: string;
  accountingTxId: string;
  matchLevel: 1 | 2 | 3 | 'manual';
  confidenceScore: number; // 0 to 100%
  amountDifference: number;
  dateDifferenceDays: number;
  matchedBy: string;
  matchedAt: string;
  notes?: string;
}

export interface ReconciliationDifference {
  id: string;
  sessionId: string;
  bankTxId?: string;
  accountingTxId?: string;
  differenceType: 
    | 'amount_mismatch'
    | 'date_mismatch'
    | 'missing_in_accounting'
    | 'missing_in_bank'
    | 'bank_fee'
    | 'uncredited_deposit'
    | 'unpresented_cheque'
    | 'duplicate_entry';
  transactionDate: string;
  referenceNumber: string;
  description: string;
  bankAmount: number;
  accountingAmount: number;
  differenceValue: number;
  cause: string;
  requiredAction: string;
  responsiblePerson: string;
  processingStatus: 'pending' | 'in_progress' | 'resolved' | 'closed_as_fee';
  notes?: string;
  attachmentName?: string;
  createdAt: string;
}

export interface ReconciliationJournalEntry {
  id: string;
  sessionId: string;
  entryNumber: string;
  entryDate: string;
  bankAccountId: string;
  counterAccountId: string;
  counterAccountName: string;
  amount: number;
  entryType: 'bank_fee' | 'adjustment' | 'direct_deposit' | 'direct_withdrawal';
  feeType?: BankFeeType;
  referenceNumber: string;
  description: string;
  taxAmount?: number;
  createdBy: string;
  createdAt: string;
  sourceTxId: string;
  status?: 'draft' | 'posted';
}

export interface BankReconciliationSession {
  id: string;
  bankAccountId: string;
  bankAccountName: string;
  bankAccountNumber: string;
  periodStart: string; // YYYY-MM-DD
  periodEnd: string; // YYYY-MM-DD
  currency: string;
  openingBalanceBank: number;
  closingBalanceBank: number;
  openingBalanceAccounting: number;
  closingBalanceAccounting: number;
  status: 'draft' | 'in_progress' | 'reconciled' | 'closed';
  isMonthClosed: boolean;
  closedAt?: string;
  closedBy?: string;
  reconciliationToken?: string; // Unique hash/token for closed month
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ReconciliationAuditLog {
  id: string;
  sessionId: string;
  action: 
    | 'SESSION_CREATED'
    | 'FILE_IMPORTED'
    | 'MATCH_APPLIED'
    | 'MATCH_UNLINKED'
    | 'FEE_POSTED'
    | 'JOURNAL_ENTRY_CREATED'
    | 'MONTH_CLOSED'
    | 'MONTH_REOPENED'
    | 'SETTINGS_UPDATED';
  user: string;
  details: string;
  timestamp: string;
}

export interface ReconciliationSummary {
  bankClosingBalance: number;
  accountingClosingBalance: number;
  totalMatchedCount: number;
  totalMatchedAmount: number;
  totalUnmatchedBankCount: number;
  totalUnmatchedBankAmount: number;
  totalUnmatchedAccountingCount: number;
  totalUnmatchedAccountingAmount: number;
  unpresentedChequesTotal: number; // شيكات لم تصرف
  uncreditedDepositsTotal: number; // إيداعات بالطريق
  totalBankFees: number;
  totalSmallDifferences: number;
  adjustedBankBalance: number; // الرصيد المعدل للبنك
  adjustedAccountingBalance: number; // الرصيد المعدل للمحاسبة
  netDifference: number; // الفرق النهائي (يجب أن يكون 0.000 للتطابق التام)
  isBalanced: boolean;
}

export interface UserReconciliationPermissions {
  canView: boolean;
  canImport: boolean;
  canEditTransactions: boolean;
  canCreateJournalEntries: boolean;
  canApproveFees: boolean;
  canCloseMonth: boolean;
  canReopenMonth: boolean;
  canDeleteSession: boolean;
  canExportReports: boolean;
  canManageSettings: boolean;
}
