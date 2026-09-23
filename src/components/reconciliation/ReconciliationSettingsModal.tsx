import React, { useState } from 'react';
import {
  Sliders,
  DollarSign,
  Calendar,
  Lock,
  ShieldCheck,
  CheckCircle2,
  Building2,
  Sparkles,
  Info
} from 'lucide-react';
import {
  BankReconciliationSettings,
  UserReconciliationPermissions
} from '../../types/reconciliationTypes';

interface ReconciliationSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: BankReconciliationSettings;
  permissions: UserReconciliationPermissions;
  onSaveSettings: (settings: BankReconciliationSettings) => void;
  onSavePermissions: (permissions: UserReconciliationPermissions) => void;
}

export function ReconciliationSettingsModal({
  isOpen,
  onClose,
  settings,
  permissions,
  onSaveSettings,
  onSavePermissions,
}: ReconciliationSettingsModalProps) {
  const [activeTab, setActiveTab] = useState<'profile' | 'matching' | 'permissions'>('profile');
  const [currentSettings, setCurrentSettings] = useState<BankReconciliationSettings>(settings);
  const [currentPerms, setCurrentPerms] = useState<UserReconciliationPermissions>(permissions);

  if (!isOpen) return null;

  const handleSave = () => {
    onSaveSettings(currentSettings);
    onSavePermissions(currentPerms);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-xl overflow-hidden flex flex-col">
        
        {/* Header */}
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center">
              <Sliders className="w-4 h-4 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-sm">إعدادات مطابقة البنك المستقلة</h3>
              <p className="text-slate-400 text-xs">إعدادات مستقلة تماماً لا ترتبط بأي تبويب آخر</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white font-bold p-1">
            ✕
          </button>
        </div>

        {/* Tab switch */}
        <div className="flex border-b border-slate-200 bg-slate-50 px-6 pt-3 gap-4">
          <button
            onClick={() => setActiveTab('profile')}
            className={`pb-2 text-xs font-bold border-b-2 transition ${
              activeTab === 'profile'
                ? 'border-emerald-600 text-emerald-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            بيانات الحساب المستقل
          </button>
          <button
            onClick={() => setActiveTab('matching')}
            className={`pb-2 text-xs font-bold border-b-2 transition ${
              activeTab === 'matching'
                ? 'border-emerald-600 text-emerald-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            محرك الفروقات والمطابقة
          </button>
          <button
            onClick={() => setActiveTab('permissions')}
            className={`pb-2 text-xs font-bold border-b-2 transition ${
              activeTab === 'permissions'
                ? 'border-emerald-600 text-emerald-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            الصلاحيات (RBAC)
          </button>
        </div>

        {/* Form Body */}
        <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
          {activeTab === 'profile' && (
            <div className="space-y-4">
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-xs text-emerald-900 flex items-start gap-2">
                <Building2 className="w-4 h-4 flex-shrink-0 text-emerald-600 mt-0.5" />
                <span>
                  هذا التبويب مستقل تماماً في إعداداته وبياناته، ويمكنك هنا تحديد الحساب البنكي ورقم الحساب المستهدف دون التأثير على الحساب النشط في بقية التبويبات.
                </span>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  اسم البنك أو الحساب البنكي:
                </label>
                <input
                  type="text"
                  value={currentSettings.customBankName || 'البنك التجاري الكويتي (CBK)'}
                  onChange={(e) =>
                    setCurrentSettings({
                      ...currentSettings,
                      customBankName: e.target.value,
                    })
                  }
                  className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-xs font-bold text-slate-800 focus:ring-2 focus:ring-emerald-500"
                  placeholder="مثال: بنك الكويت الوطني NBK - الحساب الرئيسي"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  رقم الحساب أو الآيبان (IBAN):
                </label>
                <input
                  type="text"
                  value={currentSettings.customAccountNumber || '0101-998234-01'}
                  onChange={(e) =>
                    setCurrentSettings({
                      ...currentSettings,
                      customAccountNumber: e.target.value,
                    })
                  }
                  className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-xs font-mono font-bold text-slate-800 focus:ring-2 focus:ring-emerald-500"
                  placeholder="مثال: KW82CBKU00000000000010199823401"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  حساب مصروف العمولات البنكية بالدفاتر:
                </label>
                <input
                  type="text"
                  value={currentSettings.bankFeeExpenseAccountName}
                  onChange={(e) =>
                    setCurrentSettings({
                      ...currentSettings,
                      bankFeeExpenseAccountName: e.target.value,
                    })
                  }
                  className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs font-bold text-slate-800 focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-700 pt-2 border-t border-slate-200">
                <input
                  type="checkbox"
                  checked={currentSettings.maskBankAccountsInReports}
                  onChange={(e) =>
                    setCurrentSettings({
                      ...currentSettings,
                      maskBankAccountsInReports: e.target.checked,
                    })
                  }
                  className="w-4 h-4 text-emerald-600 rounded"
                />
                <span>إخفاء أرقام الحسابات بالتقارير المصدرة وإظهار آخر 4 أرقام فقط (للسرية المصرفية)</span>
              </label>
            </div>
          )}

          {activeTab === 'matching' && (
            <div className="space-y-4">
              {/* Auto-extraction banner */}
              <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-300 rounded-xl p-3.5 text-xs text-emerald-950 flex items-start gap-2.5 shadow-xs">
                <Sparkles className="w-5 h-5 flex-shrink-0 text-emerald-600 mt-0.5" />
                <div>
                  <div className="font-black text-emerald-900 mb-1">
                    استخراج ذكي وتلقائي لكافة الفروقات (بدون حدود مسبقة)
                  </div>
                  <p className="text-emerald-800 leading-relaxed">
                    يقوم المحرك آلياً بحساب واستخراج أي فرق بين كشف البنك ودفاتر التطبيق، سواء كان فرق فلس صغير، عمولة كي نت KNET، أو فارق مالي مباشر، وتصنيفه تلقائياً في سجل الفروقات لتمكينك من إقفاله بنقرة زر واحدة دون الحاجة لتحديد سقف أو حد يدوي.
                  </p>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  فارق التاريخ المسموح به في المطابقة الذكية (بالأيام):
                </label>
                <input
                  type="number"
                  min="0"
                  max="15"
                  value={currentSettings.allowedDateToleranceDays}
                  onChange={(e) =>
                    setCurrentSettings({
                      ...currentSettings,
                      allowedDateToleranceDays: parseInt(e.target.value) || 0,
                    })
                  }
                  className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs font-mono font-bold text-slate-800 focus:ring-2 focus:ring-emerald-500"
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  يسمح بالمطابقة في حال كان الشيك أو التحويل قد أخذ 1 إلى 3 أيام عمل للمقاصة بين البنوك.
                </p>
              </div>

              <div className="pt-2 border-t border-slate-200 space-y-3">
                <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-700">
                  <input
                    type="checkbox"
                    checked={currentSettings.autoDetectDebitCredit}
                    onChange={(e) =>
                      setCurrentSettings({
                        ...currentSettings,
                        autoDetectDebitCredit: e.target.checked,
                      })
                    }
                    className="w-4 h-4 text-emerald-600 rounded"
                  />
                  <span>التعرف التلقائي الذكي على اتجاه الحركات (مدين ودائن) عند استيراد Excel</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-700">
                  <input
                    type="checkbox"
                    checked={currentSettings.enableFuzzyMatching}
                    onChange={(e) =>
                      setCurrentSettings({
                        ...currentSettings,
                        enableFuzzyMatching: e.target.checked,
                      })
                    }
                    className="w-4 h-4 text-emerald-600 rounded"
                  />
                  <span>تفعيل المطابقة التقريبية للبيان والوصف (Fuzzy Matching)</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-700">
                  <input
                    type="checkbox"
                    checked={currentSettings.allowBatchMatching}
                    onChange={(e) =>
                      setCurrentSettings({
                        ...currentSettings,
                        allowBatchMatching: e.target.checked,
                      })
                    }
                    className="w-4 h-4 text-emerald-600 rounded"
                  />
                  <span>السماح بالمطابقة المجمعة للعمليات المتشابهة</span>
                </label>
              </div>
            </div>
          )}

          {activeTab === 'permissions' && (
            <div className="space-y-3">
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-700">
                تحكم دقيق في الصلاحيات لمنع أي تعديل أو إغلاق غير مصرح به:
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                {[
                  { key: 'canView', label: 'عرض المطابقة وكشوف الحساب' },
                  { key: 'canImport', label: 'استيراد ملفات Excel للبنك والتطبيق' },
                  { key: 'canEditTransactions', label: 'تعديل واستبعاد الحركات المستوردة' },
                  { key: 'canCreateJournalEntries', label: 'إنشاء وترحيل القيود المحاسبية' },
                  { key: 'canApproveFees', label: 'اعتماد وإقفال الفروقات والعمولات' },
                  { key: 'canCloseMonth', label: 'إغلاق الشهر وتوليد رمز التسوية' },
                  { key: 'canReopenMonth', label: 'إعادة فتح شهر مغلق (صلاحية خاصة)' },
                  { key: 'canDeleteSession', label: 'حذف جلسات المطابقة' },
                  { key: 'canExportReports', label: 'تصدير التقارير (Excel / PDF)' },
                  { key: 'canManageSettings', label: 'تعديل الإعدادات المستقلة' },
                ].map((item) => (
                  <label
                    key={item.key}
                    className="flex items-center gap-2 p-2 rounded-lg hover:bg-slate-50 border border-slate-200 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={(currentPerms as any)[item.key]}
                      onChange={(e) =>
                        setCurrentPerms({
                          ...currentPerms,
                          [item.key]: e.target.checked,
                        })
                      }
                      className="w-4 h-4 text-emerald-600 rounded"
                    />
                    <span className="font-semibold text-slate-800">{item.label}</span>
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-slate-50 border-t border-slate-200 px-6 py-4 flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-200 rounded-xl transition"
          >
            إلغاء
          </button>
          <button
            onClick={handleSave}
            className="px-5 py-2 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-md transition flex items-center gap-1.5"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>حفظ التغييرات المستقلة</span>
          </button>
        </div>

      </div>
    </div>
  );
}
