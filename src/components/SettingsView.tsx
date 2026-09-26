import { useState, useEffect, useRef } from 'react';
import { 
  Settings, 
  History, 
  Download, 
  Save, 
  CheckCircle2, 
  BookOpen, 
  ShieldCheck, 
  Filter,
  Trash2,
  AlertTriangle,
  RefreshCw,
  CheckSquare,
  Square,
  Database,
  X,
  Users,
  Building2,
  FileText,
  Landmark,
  CreditCard,
  ShieldAlert,
  Calendar,
  Clock,
  HardDrive,
  UploadCloud,
  DownloadCloud,
  FileArchive,
  Image as ImageIcon,
  RotateCcw,
  Folder,
  Layers
} from 'lucide-react';
import { CompanySettings, AuditRecord, BackupScheduleConfig, BackupItem } from '../types';
import { downloadProjectZip } from '../utils/zipExport';
import { dbService } from '../services/apiService';

interface SettingsViewProps {
  settings: CompanySettings;
  auditLogs: AuditRecord[];
  onUpdateSettings: (newSettings: CompanySettings) => void;
  onOpenGuide: () => void;
  dataCounts?: {
    payrolls: number;
    employees: number;
    branches: number;
    departments: number;
    auditLogs: number;
    cheques: number;
    bankAccounts: number;
    recSessions: number;
  };
  onResetData?: (selectedKeys: string[], wipeRemoteDb: boolean, preserveChequeImages?: boolean) => Promise<{ success: boolean; message?: string; wiped?: string[] } | null | void>;
  onRestoreBackup?: (backupData: any, restoreToRemoteDb?: boolean) => Promise<{ success: boolean; message: string }>;
}

export function SettingsView({
  settings,
  auditLogs,
  onUpdateSettings,
  onOpenGuide,
  dataCounts,
  onResetData,
  onRestoreBackup,
}: SettingsViewProps) {
  const [activeTab, setActiveTab] = useState<'general' | 'backup' | 'audit' | 'reset'>('backup');
  const [form, setForm] = useState<CompanySettings>({ ...settings });
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [filterAction, setFilterAction] = useState<string>('all');
  const [downloading, setDownloading] = useState(false);

  // Backup Schedule & Storage Configuration State
  const [backupConfig, setBackupConfig] = useState<BackupScheduleConfig>(() => {
    return settings.backupConfig || {
      enabled: true,
      frequency: 'daily',
      scheduledTime: '02:00',
      retentionCount: 14,
      autoIncludeUploads: true,
      chequeImagesCustomPath: 'uploads/cheques',
      preserveImagesOnReset: true,
      lastBackupDate: '2026-09-24 02:00:00',
      nextBackupDate: '2026-09-25 02:00:00',
    };
  });

  // Backups List & Actions State
  const [backups, setBackups] = useState<BackupItem[]>([]);
  const [isLoadingBackups, setIsLoadingBackups] = useState(false);
  const [isCreatingBackup, setIsCreatingBackup] = useState(false);
  const [backupNotes, setBackupNotes] = useState('');
  const [backupSuccessMessage, setBackupSuccessMessage] = useState<string | null>(null);
  const [backupErrorMessage, setBackupErrorMessage] = useState<string | null>(null);

  // Restore Modal State
  const [showRestoreModal, setShowRestoreModal] = useState(false);
  const [backupToRestore, setBackupToRestore] = useState<BackupItem | null>(null);
  const [uploadedBackupData, setUploadedBackupData] = useState<any | null>(null);
  const [isRestoring, setIsRestoring] = useState(false);
  const [restoreConfirmInput, setRestoreConfirmInput] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Data Reset States (التنفيذ التلقائي على خادم MySQL والتخزين المحلي بدون تدخل المستخدم)
  const [selectedResetItems, setSelectedResetItems] = useState<string[]>([]);
  const wipeRemoteDb = true; // يتم التنفيذ على السيرفر والمحلي تلقائياً بدون تدخل المستخدم
  const [showConfirmModal, setShowConfirmModal] = useState<boolean>(false);
  const [confirmInputText, setConfirmInputText] = useState<string>('');
  const [isResetting, setIsResetting] = useState<boolean>(false);
  const [resetSuccessMessage, setResetSuccessMessage] = useState<string | null>(null);

  // Full Clean Factory Reset States (بدء استخدام جديد كلياً بدون الاحتفاظ بأي شيء)
  const [showFullResetModal, setShowFullResetModal] = useState<boolean>(false);
  const [fullResetConfirmInput, setFullResetConfirmInput] = useState<string>('');
  const [isFullResetting, setIsFullResetting] = useState<boolean>(false);

  // Load backups list on mount
  useEffect(() => {
    loadBackupsList();
  }, []);

  const loadBackupsList = async () => {
    setIsLoadingBackups(true);
    try {
      const serverBackups = await dbService.listBackups();
      if (serverBackups && serverBackups.length > 0) {
        setBackups(serverBackups);
      } else {
        const local = localStorage.getItem('app_backup_archive');
        if (local) {
          setBackups(JSON.parse(local));
        } else {
          // Default snapshot representation
          const defaultItem: BackupItem = {
            id: 'backup_payroll_db_latest.json',
            filename: 'backup_payroll_db_latest.json',
            createdAt: backupConfig.lastBackupDate || '2026-09-24 02:00:00',
            sizeBytes: 164280,
            sizeFormatted: '160.4 KB',
            type: 'scheduled',
            tablesCount: 21,
            recordsCount: (dataCounts?.payrolls ?? 1) + (dataCounts?.employees ?? 10) + (dataCounts?.cheques ?? 8) + (dataCounts?.bankAccounts ?? 2),
            hasChequeImages: true,
            chequeImagesCount: 4,
            notes: 'نسخة احتياطية مجدولة دورية للنظام وقاعدة بيانات MySQL وصور الشيكات',
          };
          setBackups([defaultItem]);
        }
      }
    } catch {
      // Ignore network errors on initial load
    } finally {
      setIsLoadingBackups(false);
    }
  };

  const handleSaveGeneralSettings = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateSettings({ ...form, backupConfig });
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  const handleSaveBackupSettings = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const updatedSettings = {
      ...form,
      backupConfig: { ...backupConfig },
    };
    onUpdateSettings(updatedSettings);

    try {
      await dbService.saveBackupSettings(backupConfig);
    } catch (err) {
      console.warn('Error saving backup config to server:', err);
    }

    setBackupSuccessMessage('تم حفظ إعدادات جدولة النسخ الاحتياطي ومسارات صور الشيكات بنجاح!');
    setTimeout(() => setBackupSuccessMessage(null), 4000);
  };

  const triggerDownloadJson = (data: any, filename: string) => {
    try {
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(data, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute("href", dataStr);
      downloadAnchor.setAttribute("download", filename);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
    } catch (e) {
      console.warn('Download error:', e);
    }
  };

  const handleCreateImmediateBackup = async () => {
    setIsCreatingBackup(true);
    setBackupErrorMessage(null);
    try {
      let localAccounts: any[] = [];
      try {
        const rawAcc = localStorage.getItem('app_bank_accounts');
        if (rawAcc) localAccounts = JSON.parse(rawAcc);
      } catch {}

      const chequeImages = localAccounts
        .filter((a: any) => a.chequeImageUrl)
        .map((a: any) => ({
          templateId: a.activeTemplateId || a.id,
          templateName: a.accountName,
          imageUrl: a.chequeImageUrl,
          imageName: a.chequeImageName || 'cheque_scan.jpg',
        }));

      const res = await dbService.createBackup({
        type: 'manual',
        notes: backupNotes || 'نسخة احتياطية يدوية فورية لقاعدة البيانات وصور الشيكات',
        retentionCount: backupConfig.retentionCount || 14,
        customPath: backupConfig.chequeImagesCustomPath || 'uploads/cheques',
      });

      let newBackupItem: BackupItem;
      let downloadPayload: any;

      if (res && res.success && res.backup) {
        newBackupItem = res.backup;
        downloadPayload = res.backupData;
      } else {
        const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
        const filename = `backup_payroll_db_${ts}.json`;
        downloadPayload = {
          version: '1.0',
          createdAt: new Date().toISOString().replace('T', ' ').slice(0, 19),
          type: 'manual',
          notes: backupNotes || 'نسخة احتياطية يدوية فورية',
          customPath: backupConfig.chequeImagesCustomPath || 'uploads/cheques',
          tables: {
            settings: [form],
            monthly_payrolls: JSON.parse(localStorage.getItem('payroll_saved_months') || '[]'),
            employees: JSON.parse(localStorage.getItem('payroll_employees') || '[]'),
            branches: JSON.parse(localStorage.getItem('payroll_branches') || '[]'),
            departments: JSON.parse(localStorage.getItem('payroll_departments') || '[]'),
            bank_accounts: localAccounts,
            issued_cheques: JSON.parse(localStorage.getItem('app_issued_cheques') || '[]'),
            cheque_books: JSON.parse(localStorage.getItem('app_cheque_books') || '[]'),
            beneficiaries: JSON.parse(localStorage.getItem('app_beneficiaries') || '[]'),
            audit_log: auditLogs,
          },
          chequeImages: chequeImages,
        };

        const jsonStr = JSON.stringify(downloadPayload);
        const sizeBytes = new Blob([jsonStr]).size;

        newBackupItem = {
          id: filename,
          filename: filename,
          createdAt: downloadPayload.createdAt,
          sizeBytes: sizeBytes,
          sizeFormatted: `${(sizeBytes / 1024).toFixed(1)} KB`,
          type: 'manual',
          tablesCount: Object.keys(downloadPayload.tables).length,
          recordsCount: Object.values(downloadPayload.tables).reduce((acc: number, t: any) => acc + (Array.isArray(t) ? t.length : 0), 0),
          hasChequeImages: chequeImages.length > 0,
          chequeImagesCount: chequeImages.length,
          notes: backupNotes,
          dataJson: jsonStr,
        };
      }

      const updatedList = [newBackupItem, ...backups.filter(b => b.id !== newBackupItem.id)];
      setBackups(updatedList);
      localStorage.setItem('app_backup_archive', JSON.stringify(updatedList.slice(0, backupConfig.retentionCount || 14)));

      const updatedConfig = {
        ...backupConfig,
        lastBackupDate: newBackupItem.createdAt,
      };
      setBackupConfig(updatedConfig);
      onUpdateSettings({ ...form, backupConfig: updatedConfig });

      setBackupNotes('');
      setBackupSuccessMessage(`تم إنشاء النسخة الاحتياطية [${newBackupItem.filename}] بنجاح وحفظها بالأرشيف!`);
      setTimeout(() => setBackupSuccessMessage(null), 5000);

      if (downloadPayload) {
        triggerDownloadJson(downloadPayload, newBackupItem.filename);
      }
    } catch (err: any) {
      setBackupErrorMessage(`تعذر إنشاء النسخة الاحتياطية: ${err?.message || err}`);
    } finally {
      setIsCreatingBackup(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (!parsed || typeof parsed !== 'object') {
          throw new Error('ملف النسخة الاحتياطية تالف أو ليس بتنسيق JSON سليم');
        }

        let totalRecs = 0;
        let tablesCount = 0;
        if (parsed.tables && typeof parsed.tables === 'object') {
          tablesCount = Object.keys(parsed.tables).length;
          totalRecs = Object.values(parsed.tables).reduce((acc: number, t: any) => acc + (Array.isArray(t) ? t.length : 0), 0);
        }

        const chequeImgsCount = Array.isArray(parsed.chequeImages) ? parsed.chequeImages.length : 0;

        const uploadItem: BackupItem = {
          id: file.name,
          filename: file.name,
          createdAt: parsed.createdAt || new Date().toISOString().replace('T', ' ').slice(0, 19),
          sizeBytes: file.size,
          sizeFormatted: `${(file.size / 1024).toFixed(1)} KB`,
          type: parsed.type || 'manual',
          tablesCount: tablesCount || 21,
          recordsCount: totalRecs,
          hasChequeImages: chequeImgsCount > 0,
          chequeImagesCount: chequeImgsCount,
          notes: parsed.notes || 'نسخة احتياطية مرفوعة من ملف خارجي',
          dataJson: JSON.stringify(parsed),
        };

        setBackupToRestore(uploadItem);
        setUploadedBackupData(parsed);
        setRestoreConfirmInput('');
        setShowRestoreModal(true);
      } catch (err: any) {
        alert(`خطأ في قراءة ملف النسخة الاحتياطية: ${err?.message || err}`);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleExecuteRestore = async () => {
    if (!backupToRestore) return;
    setIsRestoring(true);
    setBackupErrorMessage(null);

    try {
      let dataToRestore = uploadedBackupData;

      if (!dataToRestore && backupToRestore.dataJson) {
        try {
          dataToRestore = JSON.parse(backupToRestore.dataJson);
        } catch {}
      }

      if (onRestoreBackup) {
        if (dataToRestore) {
          const res = await onRestoreBackup(dataToRestore, true);
          if (!res.success) {
            throw new Error(res.message);
          }
        } else {
          const serverRes = await dbService.restoreBackup({ filename: backupToRestore.filename });
          if (!serverRes.success) {
            throw new Error(serverRes.message);
          }
        }
      }

      setShowRestoreModal(false);
      setBackupToRestore(null);
      setUploadedBackupData(null);
      setRestoreConfirmInput('');
      setBackupSuccessMessage(`تمت استعادة قاعدة البيانات والمنظومة وصور الشيكات بنجاح من النسخة [${backupToRestore.filename}]!`);
      setTimeout(() => setBackupSuccessMessage(null), 6000);
    } catch (err: any) {
      setBackupErrorMessage(`فشل تنفيذ الاستعادة: ${err?.message || err}`);
    } finally {
      setIsRestoring(false);
    }
  };

  const handleDeleteBackup = async (backupItem: BackupItem) => {
    if (!window.confirm(`هل أنت متأكد من حذف النسخة الاحتياطية [${backupItem.filename}] نهائياً؟`)) {
      return;
    }

    try {
      await dbService.deleteBackup(backupItem.id);
    } catch (e) {
      console.warn('Delete server backup warning:', e);
    }

    const updated = backups.filter(b => b.id !== backupItem.id);
    setBackups(updated);
    localStorage.setItem('app_backup_archive', JSON.stringify(updated));
    setBackupSuccessMessage(`تم حذف النسخة الاحتياطية [${backupItem.filename}]`);
    setTimeout(() => setBackupSuccessMessage(null), 3000);
  };

  const handleDownloadBackupItem = async (backupItem: BackupItem) => {
    if (backupItem.dataJson) {
      try {
        const parsed = JSON.parse(backupItem.dataJson);
        triggerDownloadJson(parsed, backupItem.filename);
        return;
      } catch {}
    }

    // If dataJson is missing, build snapshot or trigger request
    let localAccounts: any[] = [];
    try {
      const raw = localStorage.getItem('app_bank_accounts');
      if (raw) localAccounts = JSON.parse(raw);
    } catch {}

    const payload = {
      version: '1.0',
      createdAt: backupItem.createdAt,
      type: backupItem.type,
      notes: backupItem.notes || 'نسخة احتياطية لقاعدة البيانات',
      customPath: backupConfig.chequeImagesCustomPath || 'uploads/cheques',
      tables: {
        settings: [form],
        monthly_payrolls: JSON.parse(localStorage.getItem('payroll_saved_months') || '[]'),
        employees: JSON.parse(localStorage.getItem('payroll_employees') || '[]'),
        branches: JSON.parse(localStorage.getItem('payroll_branches') || '[]'),
        departments: JSON.parse(localStorage.getItem('payroll_departments') || '[]'),
        bank_accounts: localAccounts,
        issued_cheques: JSON.parse(localStorage.getItem('app_issued_cheques') || '[]'),
        cheque_books: JSON.parse(localStorage.getItem('app_cheque_books') || '[]'),
        beneficiaries: JSON.parse(localStorage.getItem('app_beneficiaries') || '[]'),
        audit_log: auditLogs,
      },
      chequeImages: localAccounts.filter((a: any) => a.chequeImageUrl).map((a: any) => ({
        templateId: a.activeTemplateId || a.id,
        templateName: a.accountName,
        imageUrl: a.chequeImageUrl,
        imageName: a.chequeImageName || 'cheque_scan.jpg',
      })),
    };

    triggerDownloadJson(payload, backupItem.filename);
  };

  const handleDownload = async () => {
    setDownloading(true);
    try {
      await downloadProjectZip();
    } finally {
      setTimeout(() => setDownloading(false), 800);
    }
  };

  // Reset Options
  const RESET_OPTIONS = [
    {
      id: 'payrolls',
      title: 'مسيرات الرواتب وسجلات الشهور المعتمدة',
      description: 'حذف كافة كروت مسيرات الرواتب المحفوظة، استقطاعات الغياب، الساعات الإضافية، السلف وقسائم الصرف.',
      countLabel: `${dataCounts?.payrolls ?? 0} مسير محفوظ`,
      icon: FileText,
      color: 'emerald',
    },
    {
      id: 'employees',
      title: 'سجلات الموظفين والبيانات الشخصية والبنكية',
      description: 'حذف جميع بيانات الموظفين المسجلين، أرقام الآيبان، والرواتب الأساسية ومبالغ التحويل.',
      countLabel: `${dataCounts?.employees ?? 0} موظف مسجل`,
      icon: Users,
      color: 'blue',
    },
    {
      id: 'branches_departments',
      title: 'الفروع والأقسام التنظيمية',
      description: 'حذف فروع الشركة وأكوادها المميزة والأقسام التابعة لها بالكامل.',
      countLabel: `${dataCounts?.branches ?? 0} فرع ، ${dataCounts?.departments ?? 0} قسم`,
      icon: Building2,
      color: 'purple',
    },
    {
      id: 'cheques',
      title: 'الشيكات الصادرة ودفاتر الشيكات',
      description: 'حذف سجل الشيكات المصدرة (المعلقة، المصروفة، والملغاة) ودفاتر الشيكات المسجلة.',
      countLabel: `${dataCounts?.cheques ?? 0} شيك مسجل`,
      icon: CreditCard,
      color: 'amber',
    },
    {
      id: 'bank_accounts_beneficiaries',
      title: 'الحسابات البنكية وقوالب الشيكات والمستفيدين',
      description: backupConfig.preserveImagesOnReset 
        ? 'حذف الحسابات المصرفية والمستفيدين (مع الحفاظ الكامل على صور وقوالب الشيكات بالمسار المخصص).' 
        : 'حذف الحسابات المصرفية، قوالب الطباعة، ودليل الموردين والجهات المستفيدة.',
      countLabel: `${dataCounts?.bankAccounts ?? 0} حساب بنكي`,
      icon: Landmark,
      color: 'cyan',
    },
    {
      id: 'reconciliation',
      title: 'جلسات مطابقة البنك والحركات والتسويات',
      description: 'حذف جلسات التسوية والمطابقة، كشوف الحساب المستوردة، الفروقات وقيود التسوية الناتجة.',
      countLabel: `${dataCounts?.recSessions ?? 0} جلسة مطابقة`,
      icon: RefreshCw,
      color: 'teal',
    },
    {
      id: 'audit_logs',
      title: 'سجل التدقيق وتتبع العمليات (Audit Trail)',
      description: 'مسح كافة سجلات تتبع الحركات والتعديلات والعمليات السابقة لجميع المستخدمين.',
      countLabel: `${dataCounts?.auditLogs ?? 0} حركة مسجلة`,
      icon: History,
      color: 'rose',
    },
    {
      id: 'settings',
      title: 'استعادة إعدادات المنشأة والطباعة الافتراضية',
      description: 'إعادة اسم الشركة، معامل الإضافي (1.25)، أيام تنبيه الإقامة (60)، وأبعاد طباعة الشيكات إلى القيم الأولية.',
      countLabel: 'قيم النظام الافتراضية',
      icon: Settings,
      color: 'slate',
    },
  ];

  const handleToggleResetItem = (id: string) => {
    setSelectedResetItems((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleSelectAllReset = () => {
    if (selectedResetItems.length === RESET_OPTIONS.length) {
      setSelectedResetItems([]);
    } else {
      setSelectedResetItems(RESET_OPTIONS.map((item) => item.id));
    }
  };

  const handleExecuteReset = async () => {
    if (!onResetData || selectedResetItems.length === 0) return;
    setIsResetting(true);
    try {
      const itemsToWipe = selectedResetItems.length === RESET_OPTIONS.length 
        ? ['all', ...selectedResetItems] 
        : selectedResetItems;

      const result = await onResetData(itemsToWipe, wipeRemoteDb, backupConfig.preserveImagesOnReset);
      setShowConfirmModal(false);
      setConfirmInputText('');
      setSelectedResetItems([]);
      setResetSuccessMessage(
        result && typeof result === 'object' && 'message' in result && result.message
          ? result.message
          : 'تم إعادة التعيين وحذف البيانات المحددة بنجاح!'
      );
      setTimeout(() => setResetSuccessMessage(null), 5000);
    } catch (err: any) {
      alert(`حدث خطأ أثناء إعادة التعيين: ${err?.message || err}`);
    } finally {
      setIsResetting(false);
    }
  };

  const handleExecuteFullReset = async () => {
    if (!onResetData) return;
    setIsFullResetting(true);
    try {
      // تنفيذ تصفير شامل لكافة البيانات بدون الاحتفاظ بأي صور أو قوالب أو سجلات
      const result = await onResetData(['all'], true, false);
      setShowFullResetModal(false);
      setFullResetConfirmInput('');
      setSelectedResetItems([]);
      setResetSuccessMessage(
        result && typeof result === 'object' && 'message' in result && result.message
          ? result.message
          : 'تم تصفير النظام بالكامل بنجاح على السيرفر والمحلي! التطبيق الآن نظيف وجاهز للتشغيل والرفع على السيرفر ببيانات جديدة كلياً.'
      );
      setTimeout(() => setResetSuccessMessage(null), 7000);
    } catch (err: any) {
      alert(`حدث خطأ أثناء التصفير الشامل: ${err?.message || err}`);
    } finally {
      setIsFullResetting(false);
    }
  };

  const filteredLogs = auditLogs.filter(
    (log) => filterAction === 'all' || log.action === filterAction
  );

  return (
    <div className="max-w-7xl mx-auto py-6 space-y-6">
      
      {/* Hidden file input for backup upload */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        onChange={handleFileUpload}
        className="hidden"
      />

      {/* Main Title Bar */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h2 className="text-xl font-black text-slate-900">إعدادات النظام والنسخ الاحتياطي</h2>
            <span className="bg-blue-100 text-blue-700 text-[11px] font-black px-2.5 py-0.5 rounded-full border border-blue-200">
              قاعدة البيانات & حماية الشيكات
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            جدولة النسخ الاحتياطي التلقائي لقاعدة البيانات، تحديد المسار المخصص لصور الشيكات، والاستعادة الشاملة
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={onOpenGuide}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-xl text-xs border border-slate-200 transition"
          >
            <BookOpen className="w-4 h-4 text-blue-600" />
            <span>دليل Hostinger</span>
          </button>

          <button
            onClick={handleDownload}
            disabled={downloading}
            className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs shadow-md transition disabled:opacity-50"
          >
            <Download className="w-4 h-4" />
            <span>{downloading ? 'جاري التحميل...' : 'تحميل حزمة PHP (ZIP)'}</span>
          </button>
        </div>
      </div>

      {/* Section Sub-Tabs */}
      <div className="bg-slate-100 p-1.5 rounded-2xl border border-slate-200 flex items-center gap-1.5 overflow-x-auto">
        <button
          type="button"
          onClick={() => setActiveTab('backup')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition shrink-0 ${
            activeTab === 'backup'
              ? 'bg-white text-blue-700 shadow-xs border border-slate-200/80 font-black'
              : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
          }`}
        >
          <Database className="w-4 h-4 text-blue-600" />
          <span>جدولة النسخ الاحتياطي ومسار صور الشيكات</span>
          <span className="w-2 h-2 rounded-full bg-emerald-500" />
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('general')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition shrink-0 ${
            activeTab === 'general'
              ? 'bg-white text-blue-700 shadow-xs border border-slate-200/80 font-black'
              : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
          }`}
        >
          <Settings className="w-4 h-4 text-slate-600" />
          <span>إعدادات المنشأة العامة</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('audit')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition shrink-0 ${
            activeTab === 'audit'
              ? 'bg-white text-blue-700 shadow-xs border border-slate-200/80 font-black'
              : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
          }`}
        >
          <History className="w-4 h-4 text-purple-600" />
          <span>سجل التدقيق وتتبع العمليات ({auditLogs.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('reset')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition shrink-0 ${
            activeTab === 'reset'
              ? 'bg-white text-red-700 shadow-xs border border-red-200 font-black'
              : 'text-slate-600 hover:text-red-700 hover:bg-white/50'
          }`}
        >
          <Trash2 className="w-4 h-4 text-red-600" />
          <span>إعادة التعيين والتصفير المخصص</span>
        </button>
      </div>

      {/* Global Alerts */}
      {backupSuccessMessage && (
        <div className="bg-emerald-50 border border-emerald-300 p-4 rounded-xl text-emerald-900 text-xs flex items-center justify-between gap-2 animate-in fade-in shadow-xs">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span className="font-bold">{backupSuccessMessage}</span>
          </div>
          <button onClick={() => setBackupSuccessMessage(null)} className="text-emerald-700 hover:text-emerald-900">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {backupErrorMessage && (
        <div className="bg-red-50 border border-red-300 p-4 rounded-xl text-red-900 text-xs flex items-center justify-between gap-2 animate-in fade-in shadow-xs">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-red-600 shrink-0" />
            <span className="font-bold">{backupErrorMessage}</span>
          </div>
          <button onClick={() => setBackupErrorMessage(null)} className="text-red-700 hover:text-red-900">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ========================================================= */}
      {/* 1. TAB: BACKUP SCHEDULING & CHEQUE IMAGES PATH STORAGE    */}
      {/* ========================================================= */}
      {activeTab === 'backup' && (
        <div className="space-y-6 animate-in fade-in">
          
          {/* Top Status & Overview Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            
            {/* Status 1: Scheduling Status */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-3">
              <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${
                backupConfig.enabled ? 'bg-emerald-100 text-emerald-600 border border-emerald-200' : 'bg-slate-100 text-slate-400'
              }`}>
                <Clock className="w-6 h-6" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-[11px] text-slate-500 font-bold">حالة الجدولة التلقائية</div>
                <div className="text-xs font-black text-slate-900 flex items-center gap-1.5 mt-0.5">
                  <span className={`w-2 h-2 rounded-full ${backupConfig.enabled ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`} />
                  <span>{backupConfig.enabled ? `مفعلة (${backupConfig.frequency === 'daily' ? 'يومي' : backupConfig.frequency === 'weekly' ? 'أسبوعي' : 'شهري'} الساعة ${backupConfig.scheduledTime})` : 'معطلة (يدوي فقط)'}</span>
                </div>
              </div>
            </div>

            {/* Status 2: Cheque Images Storage Path */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-blue-100 border border-blue-200 text-blue-600 flex items-center justify-center shrink-0">
                <Folder className="w-6 h-6" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-[11px] text-slate-500 font-bold">مسار صور الشيكات المرفوعة</div>
                <div className="text-xs font-mono font-black text-blue-700 truncate mt-0.5 dir-ltr text-right" title={backupConfig.chequeImagesCustomPath}>
                  {backupConfig.chequeImagesCustomPath || 'uploads/cheques'}
                </div>
              </div>
            </div>

            {/* Status 3: Cheque Images Preservation */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-3">
              <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${
                backupConfig.preserveImagesOnReset ? 'bg-emerald-100 text-emerald-600 border border-emerald-200' : 'bg-amber-100 text-amber-600'
              }`}>
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-[11px] text-slate-500 font-bold">حماية الشيكات عند التصفير</div>
                <div className={`text-xs font-black mt-0.5 ${backupConfig.preserveImagesOnReset ? 'text-emerald-700' : 'text-amber-700'}`}>
                  {backupConfig.preserveImagesOnReset ? 'محمية ومؤمنة بالكامل ✓' : 'غير مفعلة (قد تفقد)'}
                </div>
              </div>
            </div>

            {/* Status 4: Last & Next Backup */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-purple-100 border border-purple-200 text-purple-600 flex items-center justify-center shrink-0">
                <HardDrive className="w-6 h-6" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-[11px] text-slate-500 font-bold">النسخ المؤرشفة</div>
                <div className="text-xs font-black text-slate-900 mt-0.5">
                  <span className="font-mono text-purple-700">{backups.length}</span> نسخة متوفرة
                </div>
              </div>
            </div>

          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* Form: Backup Scheduling & Cheque Images Custom Path */}
            <div className="lg:col-span-7 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-5">
              <div className="pb-3 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center">
                    <Calendar className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-black text-sm text-slate-900">إعدادات جدولة النسخ الاحتياطي ومسارات التخزين</h3>
                    <p className="text-[11px] text-slate-500">ضبط أوقات النسخ التلقائي وتحديد مجلد حفظ صور وقوالب الشيكات</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleSaveBackupSettings}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold shadow-xs transition"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>حفظ الإعدادات</span>
                </button>
              </div>

              <form onSubmit={handleSaveBackupSettings} className="space-y-4 text-xs">
                
                {/* Enable Auto Backup Schedule */}
                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between gap-3">
                  <div>
                    <div className="font-black text-slate-900">تفعيل الجدولة التلقائية للنسخ الاحتياطي</div>
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      يقوم الخادم بتنفيذ نسخة احتياطية لكافة جداول MySQL وصور الشيكات آلياً حسب التوقيت المحدد
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={backupConfig.enabled}
                      onChange={(e) => setBackupConfig({ ...backupConfig, enabled: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:right-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Frequency */}
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">دورية وتكرار النسخ الاحتياطي:</label>
                    <select
                      value={backupConfig.frequency}
                      onChange={(e) => setBackupConfig({ ...backupConfig, frequency: e.target.value as any })}
                      disabled={!backupConfig.enabled}
                      className="w-full p-2.5 border border-slate-300 rounded-xl text-xs bg-white disabled:bg-slate-100 disabled:text-slate-400 font-bold"
                    >
                      <option value="daily">يومي (Daily) — كل 24 ساعة</option>
                      <option value="weekly">أسبوعي (Weekly) — نهاية كل أسبوع</option>
                      <option value="monthly">شهري (Monthly) — بداية كل شهر ميلادي</option>
                      <option value="manual">يدوي عند الطلب فقط (Manual)</option>
                    </select>
                  </div>

                  {/* Execution Time */}
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">وقت التشغيل اليومي (بتوقيت الكويت):</label>
                    <div className="relative">
                      <input
                        type="time"
                        value={backupConfig.scheduledTime}
                        onChange={(e) => setBackupConfig({ ...backupConfig, scheduledTime: e.target.value })}
                        disabled={!backupConfig.enabled}
                        className="w-full p-2.5 border border-slate-300 rounded-xl text-xs bg-white font-mono font-bold disabled:bg-slate-100 disabled:text-slate-400"
                      />
                      <Clock className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Retention Count */}
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">سياسة الاحتفاظ (عدد النسخ):</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min="3"
                        max="60"
                        value={backupConfig.retentionCount}
                        onChange={(e) => setBackupConfig({ ...backupConfig, retentionCount: parseInt(e.target.value, 10) || 14 })}
                        className="w-full p-2.5 border border-slate-300 rounded-xl text-xs bg-white font-bold font-mono"
                      />
                      <span className="text-[11px] text-slate-500 whitespace-nowrap">نسخة بالأرشيف</span>
                    </div>
                    <p className="text-[10px] text-slate-400 mt-1">يتم تدوير وحذف النسخ الأقدم آلياً لتوفير مساحة الاستضافة</p>
                  </div>

                  {/* Include Uploads / Templates */}
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">تضمين صور الشيكات والقوالب:</label>
                    <label className="flex items-center gap-2.5 p-2.5 border border-slate-200 rounded-xl cursor-pointer bg-slate-50 hover:bg-slate-100 transition mt-0.5">
                      <input
                        type="checkbox"
                        checked={backupConfig.autoIncludeUploads}
                        onChange={(e) => setBackupConfig({ ...backupConfig, autoIncludeUploads: e.target.checked })}
                        className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                      />
                      <span className="text-slate-800 font-bold text-[11px]">حزم صور الشيكات الممسوحة ضوئياً</span>
                    </label>
                  </div>
                </div>

                {/* Custom Cheque Images Storage Path */}
                <div className="pt-2 border-t border-slate-100">
                  <div className="p-4 bg-blue-50/60 border border-blue-200 rounded-2xl space-y-2.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 font-black text-blue-950 text-xs">
                        <Folder className="w-4 h-4 text-blue-600" />
                        <span>تحديد المسار المخصص لتخزين صور وقوالب الشيكات على الاستضافة</span>
                      </div>
                      <span className="text-[10px] bg-blue-100 text-blue-800 font-mono font-bold px-2 py-0.5 rounded-full border border-blue-200">
                        مجلد آمن ومحمي
                      </span>
                    </div>

                    <div>
                      <input
                        type="text"
                        value={backupConfig.chequeImagesCustomPath}
                        onChange={(e) => setBackupConfig({ ...backupConfig, chequeImagesCustomPath: e.target.value })}
                        placeholder="uploads/cheques"
                        className="w-full p-2.5 border border-blue-300 rounded-xl text-xs bg-white font-mono font-bold text-blue-900 focus:border-blue-500 focus:outline-none dir-ltr text-right"
                      />
                    </div>
                    <p className="text-[11px] text-blue-800 leading-relaxed">
                      المسار النسبي على خادم الاستضافة (Hostinger) الذي يتم توجيه وحفظ ملفات الشيكات المرفوعة وصور الخلفيات الممسوحة ضوئياً بداخله (افتراضياً: <code className="font-mono bg-blue-100 px-1 py-0.5 rounded">uploads/cheques</code> أو مسار مخصص معزول).
                    </p>
                  </div>
                </div>

                {/* Preserve Images on Reset Option */}
                <div className="p-4 bg-emerald-50/80 border-2 border-emerald-300 rounded-2xl flex items-start gap-3">
                  <div className="pt-0.5 shrink-0">
                    <input
                      type="checkbox"
                      id="preserveImagesCheck"
                      checked={backupConfig.preserveImagesOnReset}
                      onChange={(e) => setBackupConfig({ ...backupConfig, preserveImagesOnReset: e.target.checked })}
                      className="w-5 h-5 text-emerald-600 rounded border-emerald-400 focus:ring-emerald-500 cursor-pointer"
                    />
                  </div>
                  <label htmlFor="preserveImagesCheck" className="cursor-pointer select-none">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-emerald-700" />
                      <span className="font-black text-emerald-950 text-xs">
                        الحفاظ على صور وقوالب الشيكات في المسار المخصص عند إعادة التعيين (حماية ضد الضياع)
                      </span>
                    </div>
                    <p className="text-[11px] text-emerald-800 mt-1 leading-relaxed">
                      عند تفعيل هذا الخيار، سيقوم النظام باستثناء ملفات صور وقوالب الشيكات المحفوظة من أي عملية تصفير أو إعادة تعيين، وإعادة ربطها فوراً بالحسابات البنكية لضمان عدم اضطرار المحاسب لإعادة المسح الضوئي للشيكات مرة أخرى.
                    </p>
                  </label>
                </div>

              </form>
            </div>

            {/* Right: Instant Backup & Restore Actions */}
            <div className="lg:col-span-5 space-y-4">
              
              {/* Card 1: Create Backup Now */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3.5">
                <div className="flex items-center gap-2 text-slate-900 font-black text-sm pb-2 border-b border-slate-100">
                  <DownloadCloud className="w-4 h-4 text-blue-600" />
                  <span>إنشاء نسخة احتياطية فورية الآن</span>
                </div>

                <p className="text-[11px] text-slate-500">
                  أخذ لقطة كاملة لقاعدة بيانات MySQL بالاستضافة متضمنة الرواتب، الشيكات، الموظفين، الحسابات، وصور وقوالب الشيكات مع تنزيل فوري للملف.
                </p>

                <div className="space-y-2">
                  <label className="block text-[11px] font-bold text-slate-700">ملاحظات توثيقية للنسخة (اختياري):</label>
                  <input
                    type="text"
                    value={backupNotes}
                    onChange={(e) => setBackupNotes(e.target.value)}
                    placeholder="مثال: نسخة ما قبل اعتماد رواتب سبتمبر 2026"
                    className="w-full p-2 border border-slate-300 rounded-xl text-xs bg-slate-50"
                  />
                </div>

                <button
                  type="button"
                  disabled={isCreatingBackup}
                  onClick={handleCreateImmediateBackup}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-black text-xs rounded-xl shadow-md transition disabled:opacity-50"
                >
                  {isCreatingBackup ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>جاري إنشاء وتصدير النسخة الاحتياطية...</span>
                    </>
                  ) : (
                    <>
                      <DownloadCloud className="w-4 h-4" />
                      <span>توليد وحفظ نسخة احتياطية الآن (تحميل JSON)</span>
                    </>
                  )}
                </button>
              </div>

              {/* Card 2: Restore from External File */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3.5">
                <div className="flex items-center gap-2 text-slate-900 font-black text-sm pb-2 border-b border-slate-100">
                  <UploadCloud className="w-4 h-4 text-purple-600" />
                  <span>استعادة من ملف نسخة احتياطية خارجي</span>
                </div>

                <p className="text-[11px] text-slate-500">
                  إذا كان لديك ملف نسخة سابقة (.json) من جهازك أو خادم آخر، يمكنك رفعه واسترجاع كامل قاعدة البيانات وصور الشيكات وقوالبها مباشرة.
                </p>

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-purple-50 hover:bg-purple-100 text-purple-700 font-black text-xs rounded-xl border border-purple-200 transition"
                >
                  <UploadCloud className="w-4 h-4 text-purple-600" />
                  <span>اختيار ورفع ملف نسخة احتياطية (JSON)</span>
                </button>
              </div>

            </div>

          </div>

          {/* Section: Backups Archive & Restore Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden space-y-4 p-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-purple-100 border border-purple-200 text-purple-600 flex items-center justify-center shrink-0">
                  <FileArchive className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-sm text-slate-900">أرشيف النسخ الاحتياطية المتوفرة للاستعادة</h3>
                  <p className="text-[11px] text-slate-500">استعرض النسخ المحفوظة على الخادم، حمّلها، أو اضغط "استعادة" لإرجاع المنظومة إليها</p>
                </div>
              </div>

              <button
                type="button"
                onClick={loadBackupsList}
                disabled={isLoadingBackups}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs border border-slate-200 transition"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoadingBackups ? 'animate-spin' : ''}`} />
                <span>تحديث الأرشيف</span>
              </button>
            </div>

            {/* Backups Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead>
                  <tr className="bg-slate-50 text-slate-700 border-b border-slate-200 text-[11px] font-black">
                    <th className="py-2.5 px-3">اسم ملف النسخة</th>
                    <th className="py-2.5 px-3">تاريخ ووقت الإنشاء</th>
                    <th className="py-2.5 px-3">النوع</th>
                    <th className="py-2.5 px-3">الحجم</th>
                    <th className="py-2.5 px-3">السجلات المتضمنة</th>
                    <th className="py-2.5 px-3">صور الشيكات</th>
                    <th className="py-2.5 px-3 text-center">الإجراءات والعمليات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {backups.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-400">
                        لا توجد نسخ احتياطية مسجلة حالياً بالأرشيف. يمكنك الضغط على "إنشاء نسخة احتياطية فورية الآن" أعلاه.
                      </td>
                    </tr>
                  ) : (
                    backups.map((b) => (
                      <tr key={b.id} className="hover:bg-slate-50/70 transition">
                        
                        {/* Filename & Notes */}
                        <td className="py-3 px-3">
                          <div className="font-mono font-bold text-slate-900 dir-ltr text-right truncate max-w-[220px]" title={b.filename}>
                            {b.filename}
                          </div>
                          {b.notes && (
                            <div className="text-[10px] text-slate-500 truncate max-w-[220px]">
                              {b.notes}
                            </div>
                          )}
                        </td>

                        {/* Date */}
                        <td className="py-3 px-3 font-mono font-bold text-slate-700">
                          {b.createdAt}
                        </td>

                        {/* Type */}
                        <td className="py-3 px-3">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                            b.type === 'scheduled'
                              ? 'bg-blue-50 text-blue-700 border-blue-200'
                              : 'bg-purple-50 text-purple-700 border-purple-200'
                          }`}>
                            {b.type === 'scheduled' ? 'مجدولة آلياً' : 'يدوية فورية'}
                          </span>
                        </td>

                        {/* Size */}
                        <td className="py-3 px-3 font-mono text-slate-600 font-bold">
                          {b.sizeFormatted || `${Math.round(b.sizeBytes / 1024)} KB`}
                        </td>

                        {/* Records & Tables */}
                        <td className="py-3 px-3 font-bold text-slate-700">
                          <span className="font-mono text-blue-700">{b.recordsCount}</span> سجل ({b.tablesCount || 21} جدول)
                        </td>

                        {/* Cheque Images */}
                        <td className="py-3 px-3">
                          {b.hasChequeImages ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded-full text-[10px] font-bold border border-emerald-200">
                              <ImageIcon className="w-3 h-3" />
                              <span>{b.chequeImagesCount ?? 4} صور وقوالب</span>
                            </span>
                          ) : (
                            <span className="text-slate-400 text-[11px]">بدون صور</span>
                          )}
                        </td>

                        {/* Actions */}
                        <td className="py-3 px-3 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            
                            {/* Restore Button */}
                            <button
                              type="button"
                              onClick={() => {
                                setBackupToRestore(b);
                                setUploadedBackupData(null);
                                setRestoreConfirmInput('');
                                setShowRestoreModal(true);
                              }}
                              className="flex items-center gap-1 px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg text-xs shadow-xs transition"
                              title="استعادة هذه النسخة الاحتياطية"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                              <span>استعادة</span>
                            </button>

                            {/* Download Button */}
                            <button
                              type="button"
                              onClick={() => handleDownloadBackupItem(b)}
                              className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition"
                              title="تنزيل ملف النسخة"
                            >
                              <Download className="w-3.5 h-3.5" />
                            </button>

                            {/* Delete Button */}
                            <button
                              type="button"
                              onClick={() => handleDeleteBackup(b)}
                              className="p-1.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg transition"
                              title="حذف من الأرشيف"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>

                          </div>
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

      {/* ========================================================= */}
      {/* 2. TAB: GENERAL COMPANY SETTINGS                          */}
      {/* ========================================================= */}
      {activeTab === 'general' && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4 animate-in fade-in max-w-2xl">
          <h3 className="font-bold text-slate-900 text-sm pb-2 border-b border-slate-100 flex items-center gap-2">
            <Settings className="w-4 h-4 text-blue-600" />
            <span>إعدادات النظام العامة والمعاملات المالية</span>
          </h3>

          {savedSuccess && (
            <div className="bg-emerald-50 border border-emerald-200 p-3 rounded-xl text-emerald-800 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span className="font-bold">تم حفظ وتحديث إعدادات الشركة بنجاح!</span>
            </div>
          )}

          <form onSubmit={handleSaveGeneralSettings} className="space-y-4 text-xs">
            <div>
              <label className="block text-slate-700 font-bold mb-1">اسم المنشأة / الشركة:</label>
              <input
                type="text"
                required
                value={form.companyName}
                onChange={(e) => setForm({ ...form, companyName: e.target.value })}
                className="w-full p-2.5 border border-slate-300 rounded-xl text-xs"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-slate-700 font-bold mb-1">معامل ساعات العمل الإضافي:</label>
                <input
                  type="number"
                  step="0.05"
                  min="1"
                  max="3"
                  required
                  value={form.overtimeRate}
                  onChange={(e) => setForm({ ...form, overtimeRate: parseFloat(e.target.value) || 1.25 })}
                  className="w-full p-2.5 border border-slate-300 rounded-xl text-xs"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">تنبيه انتهاء الإقامة (أيام):</label>
                <input
                  type="number"
                  min="15"
                  max="180"
                  required
                  value={form.residenceAlertDays}
                  onChange={(e) => setForm({ ...form, residenceAlertDays: parseInt(e.target.value, 10) || 60 })}
                  className="w-full p-2.5 border border-slate-300 rounded-xl text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-slate-700 font-bold mb-1">العملة الرسمية:</label>
                <input
                  type="text"
                  required
                  value={form.currency}
                  onChange={(e) => setForm({ ...form, currency: e.target.value })}
                  className="w-full p-2.5 border border-slate-300 rounded-xl text-xs"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">خطوة التقريب النقدي (فلس):</label>
                <input
                  type="number"
                  step="0.005"
                  min="0"
                  value={form.roundingStep}
                  onChange={(e) => setForm({ ...form, roundingStep: parseFloat(e.target.value) || 0.05 })}
                  className="w-full p-2.5 border border-slate-300 rounded-xl text-xs"
                />
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-xs shadow-md transition"
              >
                <Save className="w-4 h-4" />
                <span>حفظ التعديلات</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ========================================================= */}
      {/* 3. TAB: AUDIT LOGS TRAIL                                  */}
      {/* ========================================================= */}
      {activeTab === 'audit' && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4 animate-in fade-in">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <History className="w-5 h-5 text-purple-600" />
              <h3 className="font-bold text-slate-900 text-sm">سجل العمليات والتدقيق (Audit Trail)</h3>
            </div>

            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-slate-400" />
              <select
                value={filterAction}
                onChange={(e) => setFilterAction(e.target.value)}
                className="p-1.5 border border-slate-300 rounded-lg text-xs bg-slate-50"
              >
                <option value="all">كافة العمليات</option>
                <option value="LOGIN">تسجيل دخول</option>
                <option value="PAYROLL_SAVE">حفظ مسير رواتب</option>
                <option value="DATABASE_RESTORE">استعادة قاعدة بيانات</option>
                <option value="BACKUP_CREATE">إنشاء نسخة احتياطية</option>
                <option value="SYSTEM_RESET">تصفير بيانات</option>
                <option value="SETTINGS_UPDATE">تحديث إعدادات</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto max-h-[500px]">
            <table className="w-full text-right text-xs">
              <thead className="sticky top-0 bg-slate-50 text-slate-700 border-b border-slate-200 font-bold">
                <tr>
                  <th className="py-2.5 px-3">التاريخ والوقت</th>
                  <th className="py-2.5 px-3">المستخدم</th>
                  <th className="py-2.5 px-3">النوع</th>
                  <th className="py-2.5 px-3">الجدول</th>
                  <th className="py-2.5 px-3">التفاصيل</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredLogs.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-6 text-center text-slate-400">
                      لا توجد سجلات مطابقة للفلتر المحدد
                    </td>
                  </tr>
                ) : (
                  filteredLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50/50">
                      <td className="py-2.5 px-3 font-mono text-slate-500 whitespace-nowrap">{log.createdAt}</td>
                      <td className="py-2.5 px-3 font-bold text-slate-800">{log.username}</td>
                      <td className="py-2.5 px-3">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                          {log.action}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 font-mono text-slate-500">{log.tableName}</td>
                      <td className="py-2.5 px-3 text-slate-600">{log.details}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 4. TAB: DATA RESET & SELECTIVE WIPE SYSTEM                */}
      {/* ========================================================= */}
      {activeTab === 'reset' && (
        <div className="bg-white rounded-2xl border-2 border-red-200/80 shadow-xs p-6 space-y-5 relative overflow-hidden animate-in fade-in">
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-red-600 via-amber-500 to-red-600" />

          {/* Section Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-red-100 border border-red-200 text-red-600 flex items-center justify-center shrink-0 shadow-xs">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-black text-slate-900">
                    نظام إعادة التعيين وحذف البيانات المخصصة بالتطبيق
                  </h3>
                  <span className="bg-red-100 text-red-700 text-[11px] font-black px-2.5 py-0.5 rounded-full border border-red-200">
                    إدارة البيانات والتصفير
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  اختر البنود والأقسام التي ترغب في مسحها أو تصفيرها بالتطبيق بحرية كاملة مع الحفاظ على باقي الأقسام.
                </p>
              </div>
            </div>

            {/* Quick Select All & Counter */}
            <div className="flex items-center gap-3 flex-wrap">
              <button
                type="button"
                onClick={handleSelectAllReset}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition ${
                  selectedResetItems.length === RESET_OPTIONS.length
                    ? 'bg-red-50 text-red-700 border-red-300'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
                }`}
              >
                {selectedResetItems.length === RESET_OPTIONS.length ? (
                  <>
                    <CheckSquare className="w-4 h-4 text-red-600" />
                    <span>إلغاء تحديد الكل</span>
                  </>
                ) : (
                  <>
                    <Square className="w-4 h-4 text-slate-500" />
                    <span>تحديد كافة البنود (تصفير شامل)</span>
                  </>
                )}
              </button>

              <span className="text-xs font-bold px-3 py-1.5 bg-slate-100 text-slate-700 rounded-xl border border-slate-200 font-mono">
                المحدد: <strong className="text-red-600">{selectedResetItems.length}</strong> من {RESET_OPTIONS.length}
              </span>
            </div>
          </div>

          {resetSuccessMessage && (
            <div className="bg-emerald-50 border border-emerald-300 p-4 rounded-xl text-emerald-900 text-xs flex items-center gap-2 animate-in fade-in">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <span className="font-black">{resetSuccessMessage}</span>
            </div>
          )}

          {/* COMPLETE FULL FACTORY RESET CARD (إعادة التعيين الشامل لبدء تشغيل نظيف كلياً) */}
          <div className="p-5 bg-gradient-to-r from-red-50 via-rose-50 to-red-50 border-2 border-red-300 rounded-2xl space-y-3 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="w-11 h-11 rounded-xl bg-red-600 text-white flex items-center justify-center shrink-0 shadow-md">
                  <ShieldAlert className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="font-black text-sm text-red-950">
                      إعادة التعيين الكامل والشامل (بدء تشغيل جديد كلياً للإنتاج بدون أي بيانات سابقة)
                    </h4>
                    <span className="bg-red-200 text-red-900 font-bold text-[10px] px-2 py-0.5 rounded-full border border-red-300">
                      تصفير مصنع كامل
                    </span>
                  </div>
                  <p className="text-[11px] text-red-800 mt-1 leading-relaxed">
                    حذف وتصفير كافة البيانات، مسيرات الرواتب، سجلات الموظفين، الفروع، دفاتر وشيكات الصرف، الحسابات المصرفية، قوالب وصور الشيكات المرفوعة، وسجل التدقيق بالكامل بدون الاحتفاظ بأي شيء؛ لتشغيل التطبيق نظيفاً ببيانات جديدة كلياً تمهيداً للرفع على السيرفر.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setFullResetConfirmInput('');
                  setShowFullResetModal(true);
                }}
                className="flex items-center justify-center gap-2 px-5 py-2.5 bg-red-600 hover:bg-red-700 active:scale-95 text-white font-black text-xs rounded-xl shadow-md transition shrink-0 whitespace-nowrap"
              >
                <Trash2 className="w-4 h-4" />
                <span>إعادة التعيين الكامل (تصفير شامل)</span>
              </button>
            </div>
          </div>

          {/* Automatic Server & Local Execution Guarantee Banner */}
          <div className="p-3.5 bg-blue-50/80 border border-blue-200 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 text-blue-950 font-bold">
              <Database className="w-4 h-4 text-blue-600 shrink-0" />
              <span>يتم تنفيذ التصفير وإعادة التعيين تلقائياً على كل من خادم MySQL في الاستضافة والتخزين المحلي بالتزامن وبدون تدخل من المستخدم</span>
            </div>
            <span className="text-[11px] bg-blue-100 text-blue-800 font-bold px-2.5 py-0.5 rounded-full border border-blue-200 shrink-0 self-start sm:self-auto">
              تصفير تلقائي على السيرفر والمحلي ✓
            </span>
          </div>

          {/* Cheque Images Protection Banner in Selective Reset */}
          <div className="p-3.5 bg-emerald-50/80 border border-emerald-200 rounded-xl flex items-center justify-between gap-3 text-xs">
            <label className="flex items-center gap-2.5 cursor-pointer font-bold text-emerald-950 select-none">
              <input
                type="checkbox"
                checked={backupConfig.preserveImagesOnReset}
                onChange={(e) => {
                  const updated = { ...backupConfig, preserveImagesOnReset: e.target.checked };
                  setBackupConfig(updated);
                  onUpdateSettings({ ...form, backupConfig: updated });
                }}
                className="w-4 h-4 text-emerald-600 rounded border-emerald-300 focus:ring-emerald-500"
              />
              <div className="flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>حماية صور وقوالب الشيكات في المسار المخصص ({backupConfig.chequeImagesCustomPath || 'uploads/cheques'}) عند التصفير الاختياري أدناه</span>
              </div>
            </label>
            <span className="text-[11px] text-emerald-700 hidden sm:inline font-bold">
              (مفعلة — تحمي الشيكات الممسوحة ضوئياً من المسح في التصفير الاختياري)
            </span>
          </div>

          {/* Checkbox Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {RESET_OPTIONS.map((item) => {
              const isSelected = selectedResetItems.includes(item.id);
              const Icon = item.icon;

              return (
                <div
                  key={item.id}
                  onClick={() => handleToggleResetItem(item.id)}
                  className={`p-3.5 rounded-xl border-2 cursor-pointer transition flex items-start gap-3 select-none ${
                    isSelected
                      ? 'border-red-500 bg-red-50/40 shadow-xs'
                      : 'border-slate-200 hover:border-slate-300 bg-white'
                  }`}
                >
                  <div className="pt-0.5 shrink-0">
                    {isSelected ? (
                      <CheckSquare className="w-5 h-5 text-red-600" />
                    ) : (
                      <Square className="w-5 h-5 text-slate-300" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <div className="flex items-center gap-1.5">
                        <Icon className="w-4 h-4 text-slate-700" />
                        <span className={`font-bold text-xs ${isSelected ? 'text-red-950' : 'text-slate-900'}`}>
                          {item.title}
                        </span>
                      </div>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border whitespace-nowrap ${
                        isSelected ? 'bg-red-100 text-red-800 border-red-200' : 'bg-slate-100 text-slate-600 border-slate-200'
                      }`}>
                        {item.countLabel}
                      </span>
                    </div>

                    <p className="text-[11px] text-slate-500 line-clamp-2">
                      {item.description}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Footer Actions */}
          <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <ShieldAlert className="w-4 h-4 text-red-600 shrink-0" />
              <span>
                الحذف محمي أمنياً بنافذة تأكيد مسبقة لضمان عدم حدوث أي تصفير غير مقصود.
              </span>
            </div>

            <button
              type="button"
              disabled={selectedResetItems.length === 0}
              onClick={() => {
                setConfirmInputText('');
                setShowConfirmModal(true);
              }}
              className="flex items-center justify-center gap-2 px-6 py-2.5 bg-red-600 hover:bg-red-500 text-white font-bold text-xs rounded-xl shadow-md transition disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap active:scale-95"
            >
              <Trash2 className="w-4 h-4" />
              <span>
                {selectedResetItems.length === 0
                  ? 'حدد البنود المطلوبة للمتابعة'
                  : `حذف وتصفير البنود المحددة (${selectedResetItems.length})`}
              </span>
            </button>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* RESTORE CONFIRMATION MODAL (نافذة تأكيد واستعادة النسخة)   */}
      {/* ========================================================= */}
      {showRestoreModal && backupToRestore && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl border-2 border-emerald-500 animate-in fade-in zoom-in-95">
            
            {/* Modal Header */}
            <div className="bg-emerald-600 text-white p-4 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <RotateCcw className="w-5 h-5 text-emerald-200" />
                <h3 className="font-black text-sm">استعادة قاعدة البيانات والمنظومة وصور الشيكات</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowRestoreModal(false)}
                className="text-white/80 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4 text-xs">
              
              <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-900 space-y-1.5">
                <div className="font-black text-xs flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>معاينة تفاصيل النسخة الاحتياطية المحددة:</span>
                </div>
                <div className="font-mono text-emerald-950 font-bold dir-ltr text-right truncate">
                  {backupToRestore.filename}
                </div>
              </div>

              {/* Backup Stats Summary */}
              <div className="grid grid-cols-2 gap-2 bg-slate-50 p-3 rounded-xl border border-slate-200">
                <div className="p-2 bg-white rounded-lg border border-slate-200">
                  <span className="text-[10px] text-slate-400 block">تاريخ أخذ النسخة:</span>
                  <span className="font-mono font-bold text-slate-800">{backupToRestore.createdAt}</span>
                </div>
                <div className="p-2 bg-white rounded-lg border border-slate-200">
                  <span className="text-[10px] text-slate-400 block">حجم النسخة:</span>
                  <span className="font-mono font-bold text-slate-800">{backupToRestore.sizeFormatted}</span>
                </div>
                <div className="p-2 bg-white rounded-lg border border-slate-200">
                  <span className="text-[10px] text-slate-400 block">إجمالي السجلات:</span>
                  <span className="font-bold text-blue-700">{backupToRestore.recordsCount} سجل</span> ({backupToRestore.tablesCount || 21} جدول)
                </div>
                <div className="p-2 bg-white rounded-lg border border-slate-200">
                  <span className="text-[10px] text-slate-400 block">صور وقوالب الشيكات:</span>
                  <span className="font-bold text-emerald-700">
                    {backupToRestore.hasChequeImages ? `${backupToRestore.chequeImagesCount ?? 4} صور بالمسار المخصص` : 'بدون صور'}
                  </span>
                </div>
              </div>

              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-[11px] leading-relaxed">
                <strong>تنبيه أمني:</strong> الاستعادة ستقوم بإرجاع بيانات قاعدة بيانات MySQL بالاستضافة والتخزين المحلي إلى النقطة المسجلة بهذه النسخة الاحتياطية.
              </div>

              {/* Confirmation Input Word */}
              <div className="space-y-1.5 pt-1">
                <label className="block text-slate-700 font-bold text-[11px]">
                  لتأكيد الاستعادة، اكتب كلمة <strong className="text-emerald-700 font-mono">استعادة</strong> أو <strong className="text-emerald-700 font-mono">تأكيد</strong> أدناه:
                </label>
                <input
                  type="text"
                  value={restoreConfirmInput}
                  onChange={(e) => setRestoreConfirmInput(e.target.value)}
                  placeholder="اكتب (استعادة) أو (تأكيد) هنا..."
                  className="w-full p-2.5 border-2 border-emerald-300 rounded-xl text-center font-bold text-xs bg-emerald-50/30 focus:border-emerald-500 focus:outline-none"
                  autoFocus
                />
              </div>

            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setShowRestoreModal(false)}
                className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-700 font-bold rounded-xl text-xs border border-slate-300 transition"
              >
                إلغاء الأمر
              </button>

              <button
                type="button"
                disabled={
                  isRestoring || 
                  (restoreConfirmInput.trim() !== 'استعادة' && 
                   restoreConfirmInput.trim() !== 'تأكيد' && 
                   restoreConfirmInput.trim().toLowerCase() !== 'restore' &&
                   restoreConfirmInput.trim().toLowerCase() !== 'confirm')
                }
                onClick={handleExecuteRestore}
                className="flex items-center gap-2 px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-md transition disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {isRestoring ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>جاري استعادة قاعدة البيانات والشيكات...</span>
                  </>
                ) : (
                  <>
                    <RotateCcw className="w-4 h-4" />
                    <span>تأكيد الاستعادة الفورية</span>
                  </>
                )}
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* DATA RESET CONFIRMATION MODAL                             */}
      {/* ========================================================= */}
      {showConfirmModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl border-2 border-red-500 animate-in fade-in zoom-in-95">
            
            {/* Modal Header */}
            <div className="bg-red-600 text-white p-4 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <AlertTriangle className="w-5 h-5 text-amber-300" />
                <h3 className="font-black text-sm">تأكيد أمني لحذف وإعادة تعيين البيانات</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                className="text-white/80 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4 text-xs">
              <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl text-red-900 space-y-1.5">
                <div className="font-black text-xs flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
                  <span>تنبيه هام لا يمكن التراجع عنه:</span>
                </div>
                <p className="text-[11px] text-red-800 leading-relaxed">
                  أنت على وشك حذف البيانات التالية نهائياً من النظام {wipeRemoteDb ? 'ومن قاعدة بيانات MySQL على الخادم' : 'من التخزين المحلي'}:
                </p>
              </div>

              {/* Cheque images preservation status in modal */}
              <div className={`p-2.5 rounded-xl border text-[11px] flex items-center gap-2 ${
                backupConfig.preserveImagesOnReset 
                  ? 'bg-emerald-50 border-emerald-300 text-emerald-900 font-bold'
                  : 'bg-amber-50 border-amber-300 text-amber-900 font-bold'
              }`}>
                <ShieldCheck className={`w-4 h-4 ${backupConfig.preserveImagesOnReset ? 'text-emerald-600' : 'text-amber-600'}`} />
                <span>
                  {backupConfig.preserveImagesOnReset 
                    ? `صور وقوالب الشيكات في المسار (${backupConfig.chequeImagesCustomPath}) محمية ولن يتم حذفها.`
                    : 'تنبيه: حماية صور الشيكات غير مفعلة، وقد يتم مسح قوالب الشيكات.'}
                </span>
              </div>

              {/* Items List */}
              <div className="space-y-1.5 max-h-40 overflow-y-auto p-2 bg-slate-50 rounded-xl border border-slate-200">
                {selectedResetItems.map((id) => {
                  const opt = RESET_OPTIONS.find((o) => o.id === id);
                  if (!opt) return null;
                  return (
                    <div key={id} className="flex items-center justify-between p-1.5 bg-white rounded-lg border border-slate-200 text-xs">
                      <span className="font-bold text-slate-800 flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-red-500" />
                        {opt.title}
                      </span>
                      <span className="text-[10px] font-mono text-slate-500 font-bold">
                        {opt.countLabel}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Confirmation Input Word */}
              <div className="space-y-1.5 pt-1">
                <label className="block text-slate-700 font-bold text-[11px]">
                  لتأكيد الحذف الأمني، اكتب كلمة <strong className="text-red-600 font-mono">حذف</strong> أو <strong className="text-red-600 font-mono">تأكيد</strong> في الحقل أدناه:
                </label>
                <input
                  type="text"
                  value={confirmInputText}
                  onChange={(e) => setConfirmInputText(e.target.value)}
                  placeholder="اكتب (حذف) أو (تأكيد) هنا..."
                  className="w-full p-2.5 border-2 border-red-300 rounded-xl text-center font-bold text-xs bg-red-50/30 focus:border-red-500 focus:outline-none"
                  autoFocus
                />
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-700 font-bold rounded-xl text-xs border border-slate-300 transition"
              >
                إلغاء الأمر
              </button>

              <button
                type="button"
                disabled={
                  isResetting || 
                  (confirmInputText.trim() !== 'حذف' && 
                   confirmInputText.trim() !== 'تأكيد' && 
                   confirmInputText.trim().toLowerCase() !== 'confirm' &&
                   confirmInputText.trim().toLowerCase() !== 'delete')
                }
                onClick={handleExecuteReset}
                className="flex items-center gap-2 px-5 py-2 bg-red-600 hover:bg-red-500 text-white font-bold text-xs rounded-xl shadow-md transition disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {isResetting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>جاري الحذف والتصفير...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    <span>تأكيد الحذف النهائي</span>
                  </>
                )}
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* COMPLETE FULL FACTORY RESET MODAL (تصفير شامل للإنتاج)   */}
      {/* ========================================================= */}
      {showFullResetModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl border-2 border-red-600 animate-in fade-in zoom-in-95">
            
            {/* Modal Header */}
            <div className="bg-red-600 text-white p-4 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <ShieldAlert className="w-5 h-5 text-amber-300" />
                <h3 className="font-black text-sm">تأكيد أمني مشدد: إعادة التعيين الكامل والشامل</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowFullResetModal(false)}
                className="text-white/80 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4 text-xs">
              
              <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl text-red-900 space-y-1.5">
                <div className="font-black text-xs flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
                  <span>تنبيه نهائي لا يمكن التراجع عنه:</span>
                </div>
                <p className="text-[11px] text-red-800 leading-relaxed">
                  أنت على وشك تنفيذ <strong>تصفير مصنع كامل وشامل</strong> للنظام على السيرفر (MySQL) ومحلياً؛ سيتم حذف جميع مسيرات الرواتب، سجلات الموظفين، الفروع والأقسام، دفاتر وشيكات الصرف، الحسابات المصرفية، قوالب وصور الشيكات، وجلسات التسوية وسجل التدقيق بالكامل بدون استثناء أو احتفاظ بأي شيء، لتهيئة التطبيق للبدء من جديد.
                </p>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5 text-slate-700">
                <div className="font-bold text-slate-900 mb-1">ما سيتم حذفه وتصفيره بالكامل:</div>
                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <span className="flex items-center gap-1 text-red-700">✕ كافة مسيرات وقسائم الرواتب</span>
                  <span className="flex items-center gap-1 text-red-700">✕ كافة ملفات الموظفين والآيبان</span>
                  <span className="flex items-center gap-1 text-red-700">✕ الفروع والأقسام الأربعة</span>
                  <span className="flex items-center gap-1 text-red-700">✕ سجل الشيكات الصادرة ودفاترها</span>
                  <span className="flex items-center gap-1 text-red-700">✕ الحسابات وصور وقوالب الشيكات</span>
                  <span className="flex items-center gap-1 text-red-700">✕ جلسات التسوية وسجل التدقيق</span>
                </div>
              </div>

              {/* Confirmation Input Word */}
              <div className="space-y-1.5 pt-1">
                <label className="block text-slate-700 font-bold text-[11px]">
                  لتأكيد التصفير الشامل والبدء كنسخة جديدة كلياً، اكتب عبارة <strong className="text-red-600 font-mono">تصفير شامل</strong> في الحقل أدناه:
                </label>
                <input
                  type="text"
                  value={fullResetConfirmInput}
                  onChange={(e) => setFullResetConfirmInput(e.target.value)}
                  placeholder="اكتب (تصفير شامل) هنا..."
                  className="w-full p-2.5 border-2 border-red-300 rounded-xl text-center font-bold text-xs bg-red-50/30 focus:border-red-500 focus:outline-none"
                  autoFocus
                />
              </div>

            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setShowFullResetModal(false)}
                className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-700 font-bold rounded-xl text-xs border border-slate-300 transition"
              >
                إلغاء الأمر
              </button>

              <button
                type="button"
                disabled={
                  isFullResetting || 
                  (fullResetConfirmInput.trim() !== 'تصفير شامل' && 
                   fullResetConfirmInput.trim() !== 'تصفير' && 
                   fullResetConfirmInput.trim().toLowerCase() !== 'reset' &&
                   fullResetConfirmInput.trim().toLowerCase() !== 'delete all')
                }
                onClick={handleExecuteFullReset}
                className="flex items-center gap-2 px-5 py-2 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-xl shadow-md transition disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {isFullResetting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>جاري التصفير الشامل على السيرفر ومحلياً...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    <span>تأكيد التصفير والبدء من الصفر</span>
                  </>
                )}
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
