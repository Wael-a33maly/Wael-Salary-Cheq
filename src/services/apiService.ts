/**
 * خدمة الربط التلقائي بقاعدة بيانات MySQL على استضافة Hostinger
 * تضمن مزامنة الشيكات، المعايرة، المطابقة البنكية، والرواتب مباشرة مع قاعدة البيانات المركزية
 */

import { 
  BankAccount, 
  ChequeBook, 
  Beneficiary, 
  IssuedCheque, 
  ChequePrintSettings,
} from '../types';
import { 
  BankReconciliationSession, 
  BankReconciliationSettings,
  BankStatementTransaction,
  AccountingTransaction,
  ReconciliationDifference,
  ReconciliationJournalEntry
} from '../types/reconciliationTypes';

// مسار الـ API النسبي (يعمل تلقائياً عند رفع التطبيق داخل public_html أو دومين فرعي)
const API_BASE_URL = '/api/index.php';

export interface DatabaseBootstrapData {
  bankAccounts?: BankAccount[];
  chequeBooks?: ChequeBook[];
  beneficiaries?: Beneficiary[];
  issuedCheques?: IssuedCheque[];
  printSettings?: ChequePrintSettings;
  reconciliationSettings?: BankReconciliationSettings;
  reconciliationSessions?: BankReconciliationSession[];
  branches?: any[];
  departments?: any[];
  employees?: any[];
  companySettings?: any;
}

export interface ApiStatus {
  isConnected: boolean;
  isInstalled: boolean;
  message: string;
  lastSync?: string;
}

class DatabaseService {
  private isAvailable: boolean | null = null;
  private lastSyncTime: string | null = null;

  /**
   * فحص الاتصال بالخادم وقاعدة بيانات MySQL
   */
  async checkConnection(): Promise<ApiStatus> {
    try {
      const response = await fetch(`${API_BASE_URL}?action=ping`, {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
      });

      if (!response.ok) {
        if (response.status === 503) {
          this.isAvailable = false;
          return {
            isConnected: false,
            isInstalled: false,
            message: 'معالج التنصيب لم يتم تشغيله بعد. افتح /install/ في المتصفح لربط قاعدة البيانات.'
          };
        }
        this.isAvailable = false;
        return {
          isConnected: false,
          isInstalled: false,
          message: `تعذر الاتصال بـ API قاعدة البيانات (رمز الخطأ: ${response.status})`
        };
      }

      const data = await response.json();
      if (data.success && data.database === 'connected') {
        this.isAvailable = true;
        this.lastSyncTime = new Date().toLocaleTimeString('ar-KW');
        return {
          isConnected: true,
          isInstalled: true,
          message: 'متصل بقاعدة بيانات MySQL المركزية على الدومين',
          lastSync: this.lastSyncTime,
        };
      }

      this.isAvailable = false;
      return {
        isConnected: false,
        isInstalled: false,
        message: data.message || 'قاعدة البيانات غير متصلة'
      };
    } catch {
      // وضع العمل المحلي (أثناء التطوير أو قبل الرفع لهوستنجر)
      this.isAvailable = false;
      return {
        isConnected: false,
        isInstalled: false,
        message: 'يعمل في وضع التخزين المحلي (سيتم التوصيل التلقائي بـ MySQL بمجرد الرفع على الدومين)'
      };
    }
  }

  /**
   * جلب كافة بيانات النظام من قاعدة بيانات MySQL المركزية دفعة واحدة
   */
  async fetchBootstrapData(): Promise<DatabaseBootstrapData | null> {
    try {
      const res = await fetch(`${API_BASE_URL}?action=bootstrap`, {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
      });

      if (!res.ok) return null;
      const json = await res.json();
      if (json.success && json.data) {
        this.isAvailable = true;
        this.lastSyncTime = new Date().toLocaleTimeString('ar-KW');
        return json.data;
      }
      return null;
    } catch (err) {
      console.warn('API Bootstrap not available:', err);
      return null;
    }
  }

  /**
   * حفظ أو تحديث شيك صادر في قاعدة بيانات MySQL
   */
  async saveChequeToDb(cheque: IssuedCheque): Promise<boolean> {
    try {
      const res = await fetch(`${API_BASE_URL}?action=save_cheque`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify(cheque),
      });

      if (!res.ok) return false;
      const json = await res.json();
      return !!json.success;
    } catch (err) {
      console.warn('Error saving cheque to DB:', err);
      return false;
    }
  }

  /**
   * تحديث حالة الشيك في قاعدة بيانات MySQL (صرف / إلغاء)
   */
  async updateChequeStatusInDb(id: string, status: 'issued' | 'cashed' | 'cancelled', date?: string, reason?: string): Promise<boolean> {
    try {
      const res = await fetch(`${API_BASE_URL}?action=update_cheque_status`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({ id, status, date, reason }),
      });

      if (!res.ok) return false;
      const json = await res.json();
      return !!json.success;
    } catch (err) {
      console.warn('Error updating cheque status in DB:', err);
      return false;
    }
  }

  /**
   * حفظ الحسابات البنكية والقوالب بالسنتيمتر في قاعدة بيانات MySQL
   */
  async saveBankAccountsToDb(accounts: BankAccount[]): Promise<boolean> {
    try {
      const res = await fetch(`${API_BASE_URL}?action=save_bank_accounts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({ accounts }),
      });

      if (!res.ok) return false;
      const json = await res.json();
      return !!json.success;
    } catch (err) {
      console.warn('Error saving bank accounts to DB:', err);
      return false;
    }
  }

  /**
   * حفظ دفاتر الشيكات في قاعدة بيانات MySQL
   */
  async saveChequeBooksToDb(books: ChequeBook[]): Promise<boolean> {
    try {
      const res = await fetch(`${API_BASE_URL}?action=save_cheque_books`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({ books }),
      });

      if (!res.ok) return false;
      const json = await res.json();
      return !!json.success;
    } catch (err) {
      console.warn('Error saving cheque books to DB:', err);
      return false;
    }
  }

  /**
   * حفظ المستفيدين في قاعدة بيانات MySQL
   */
  async saveBeneficiariesToDb(beneficiaries: Beneficiary[]): Promise<boolean> {
    try {
      const res = await fetch(`${API_BASE_URL}?action=save_beneficiaries`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({ beneficiaries }),
      });

      if (!res.ok) return false;
      const json = await res.json();
      return !!json.success;
    } catch (err) {
      console.warn('Error saving beneficiaries to DB:', err);
      return false;
    }
  }

  /**
   * حفظ إعدادات معايرة طباعة الشيكات وأبعاد الحقول في MySQL
   */
  async savePrintSettingsToDb(settings: ChequePrintSettings): Promise<boolean> {
    try {
      const res = await fetch(`${API_BASE_URL}?action=save_print_settings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify(settings),
      });

      if (!res.ok) return false;
      const json = await res.json();
      return !!json.success;
    } catch (err) {
      console.warn('Error saving print settings to DB:', err);
      return false;
    }
  }

  /**
   * حفظ جلسة مطابقة البنك والحركات والفروقات في MySQL
   */
  async saveReconciliationSessionToDb(
    session: BankReconciliationSession,
    bankTransactions: BankStatementTransaction[] = [],
    ledgerTransactions: AccountingTransaction[] = [],
    differences: ReconciliationDifference[] = [],
    journalEntries: ReconciliationJournalEntry[] = []
  ): Promise<boolean> {
    try {
      const res = await fetch(`${API_BASE_URL}?action=save_reconciliation_session`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({
          session,
          bankTransactions,
          ledgerTransactions,
          differences,
          journalEntries
        }),
      });

      if (!res.ok) return false;
      const json = await res.json();
      return !!json.success;
    } catch (err) {
      console.warn('Error saving reconciliation session to DB:', err);
      return false;
    }
  }

  /**
   * جلب حركات جلسة مطابقة محددة من MySQL
   */
  async fetchSessionDetailsFromDb(sessionId: string): Promise<{
    bankTransactions: BankStatementTransaction[];
    ledgerTransactions: AccountingTransaction[];
    differences: ReconciliationDifference[];
  } | null> {
    try {
      const res = await fetch(`${API_BASE_URL}?action=get_session_details&session_id=${encodeURIComponent(sessionId)}`, {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
      });

      if (!res.ok) return null;
      const json = await res.json();
      if (json.success && json.data) {
        return json.data;
      }
      return null;
    } catch (err) {
      console.warn('Error fetching session details from DB:', err);
      return null;
    }
  }
}

export const dbService = new DatabaseService();
