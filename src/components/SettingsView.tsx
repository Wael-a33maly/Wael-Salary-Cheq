import { useState } from 'react';
import { 
  Settings, 
  History, 
  Download, 
  Save, 
  CheckCircle2, 
  BookOpen, 
  Server, 
  ShieldCheck, 
  Filter 
} from 'lucide-react';
import { CompanySettings, AuditRecord } from '../types';
import { downloadProjectZip } from '../utils/zipExport';

interface SettingsViewProps {
  settings: CompanySettings;
  auditLogs: AuditRecord[];
  onUpdateSettings: (newSettings: CompanySettings) => void;
  onOpenGuide: () => void;
}

export function SettingsView({
  settings,
  auditLogs,
  onUpdateSettings,
  onOpenGuide,
}: SettingsViewProps) {
  const [form, setForm] = useState<CompanySettings>({ ...settings });
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [filterAction, setFilterAction] = useState<string>('all');
  const [downloading, setDownloading] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateSettings(form);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  const handleDownload = async () => {
    setDownloading(true);
    try {
      await downloadProjectZip();
    } finally {
      setTimeout(() => setDownloading(false), 800);
    }
  };

  const filteredLogs = auditLogs.filter(
    (log) => filterAction === 'all' || log.action === filterAction
  );

  return (
    <div className="max-w-7xl mx-auto py-6 space-y-6">
      
      {/* Title Bar */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-slate-900">إعدادات النظام وسجل التدقيق</h2>
          <p className="text-xs text-slate-500 mt-1">
            إعدادات الشركة، معاملات الاحتساب المالي، وسجل تتبع كافة العمليات والتعديلات
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onOpenGuide}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-xl text-xs border border-slate-200 transition"
          >
            <BookOpen className="w-4 h-4 text-blue-600" />
            <span>دليل الرفع على Hostinger</span>
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

      {savedSuccess && (
        <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-xl text-emerald-800 text-xs flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span className="font-bold">تم حفظ وتحديث إعدادات الشركة بنجاح!</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left: Settings Form */}
        <div className="lg:col-span-5 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <h3 className="font-bold text-slate-900 text-sm pb-2 border-b border-slate-100 flex items-center gap-2">
            <Settings className="w-4 h-4 text-blue-600" />
            <span>إعدادات النظام العامة</span>
          </h3>

          <form onSubmit={handleSave} className="space-y-3.5 text-xs">
            <div>
              <label className="block text-slate-700 font-bold mb-1">اسم المنشأة / الشركة:</label>
              <input
                type="text"
                required
                value={form.companyName}
                onChange={(e) => setForm({ ...form, companyName: e.target.value })}
                className="w-full p-2.5 border border-slate-300 rounded-lg text-xs"
              />
            </div>

            <div>
              <label className="block text-slate-700 font-bold mb-1">معامل ساعات العمل الإضافي:</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  step="0.05"
                  min="1"
                  max="3"
                  required
                  value={form.overtimeRate}
                  onChange={(e) => setForm({ ...form, overtimeRate: parseFloat(e.target.value) || 1.25 })}
                  className="w-full p-2.5 border border-slate-300 rounded-lg text-xs font-mono font-bold"
                />
                <span className="text-slate-500 font-bold text-xs whitespace-nowrap">x الأجر الأساسي</span>
              </div>
              <p className="text-[11px] text-slate-400 mt-1">افتراضياً 1.25 بموجب قانون العمل الكويتي</p>
            </div>

            <div>
              <label className="block text-slate-700 font-bold mb-1">فترة التنبيه المسبق لانتهاء الإقامة:</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  step="5"
                  min="10"
                  max="180"
                  required
                  value={form.residenceAlertDays}
                  onChange={(e) => setForm({ ...form, residenceAlertDays: parseInt(e.target.value) || 60 })}
                  className="w-full p-2.5 border border-slate-300 rounded-lg text-xs font-mono font-bold"
                />
                <span className="text-slate-500 font-bold text-xs whitespace-nowrap">يوماً مسبقاً</span>
              </div>
              <p className="text-[11px] text-slate-400 mt-1">تظهر التنبيهات في لوحة التحكم عند الوصول لهذه المهلة</p>
            </div>

            <div>
              <label className="block text-slate-700 font-bold mb-1">شعار الشركة (اللوجو لقسائم وإيصالات الصرف):</label>
              <div className="space-y-2">
                <input
                  type="text"
                  placeholder="رابط الشعار URL (اختياري) أو اتركه فارغاً لاستخدام الرمز التعبيري"
                  value={form.logoUrl || ''}
                  onChange={(e) => setForm({ ...form, logoUrl: e.target.value })}
                  className="w-full p-2.5 border border-slate-300 rounded-lg text-xs font-mono"
                />
                <div className="flex items-center gap-2">
                  <label className="flex-1 cursor-pointer bg-slate-50 hover:bg-slate-100 border border-dashed border-slate-300 rounded-lg p-2 text-center text-[11px] text-slate-600 font-bold">
                    <span>رفع صورة شعار محلي من الجهاز</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onload = () => {
                            setForm((prev) => ({ ...prev, logoUrl: reader.result as string }));
                          };
                          reader.readAsDataURL(file);
                        }
                      }}
                    />
                  </label>
                  {form.logoUrl && (
                    <div className="w-10 h-10 border border-slate-200 rounded-lg overflow-hidden flex items-center justify-center bg-white p-1">
                      <img src={form.logoUrl} alt="Logo" className="max-w-full max-h-full object-contain" />
                    </div>
                  )}
                </div>
              </div>
              <p className="text-[11px] text-slate-400 mt-1">يظهر اللوجو مباشرة في ترويسة كل إيصال من الـ 5 إيصالات في ورقة A4</p>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl space-y-2 border border-slate-200">
              <div className="flex justify-between items-center text-[11px]">
                <span className="text-slate-600">العملة الرسمية للنظام:</span>
                <strong className="text-blue-800 font-mono font-bold">الدينار الكويتي (3 خانات KWD)</strong>
              </div>
              <div className="flex justify-between items-center text-[11px]">
                <span className="text-slate-600">قاعدة التقريب النقدي:</span>
                <strong className="text-emerald-800 font-mono font-bold">Floor to 0.050 د.ك (للأسفل)</strong>
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                className="w-full flex items-center justify-center gap-2 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-xs shadow-md transition"
              >
                <Save className="w-4 h-4" />
                <span>حفظ التعديلات</span>
              </button>
            </div>
          </form>
        </div>

        {/* Right: Audit Trail */}
        <div className="lg:col-span-7 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
              <History className="w-4 h-4 text-purple-600" />
              <span>سجل التدقيق وتتبع العمليات (Audit Trail)</span>
            </h3>

            <select
              value={filterAction}
              onChange={(e) => setFilterAction(e.target.value)}
              className="px-2 py-1 text-xs border border-slate-300 rounded bg-white font-bold"
            >
              <option value="all">كافة العمليات</option>
              <option value="PAYROLL_CALCULATE">مسير الرواتب</option>
              <option value="BRANCH_CREATE">الفروع</option>
              <option value="SYSTEM_INSTALL">التنصيب</option>
            </select>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-100 font-bold text-slate-700">
                <tr>
                  <th className="p-2.5">الوقت والتاريخ</th>
                  <th className="p-2.5">المستخدم</th>
                  <th className="p-2.5">العملية والجدول</th>
                  <th className="p-2.5">البيان والتفاصيل</th>
                  <th className="p-2.5 text-center">IP</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50 transition">
                    <td className="p-2.5 font-mono text-slate-500 text-[11px] whitespace-nowrap">
                      {log.createdAt}
                    </td>
                    <td className="p-2.5 font-bold text-slate-800">{log.username}</td>
                    <td className="p-2.5 font-mono text-blue-700">
                      <span className="bg-blue-50 px-2 py-0.5 rounded text-[10px]">
                        {log.action}
                      </span>
                    </td>
                    <td className="p-2.5 text-slate-700">{log.details}</td>
                    <td className="p-2.5 text-center font-mono text-slate-400 text-[10px]">
                      {log.ipAddress}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </div>

    </div>
  );
}
