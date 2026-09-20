import { useState } from 'react';
import { 
  X, 
  Server, 
  FolderUp, 
  Terminal, 
  ShieldCheck, 
  Key, 
  Download, 
  FileText,
  CheckCircle2,
  ExternalLink
} from 'lucide-react';
import { downloadProjectZip } from '../utils/zipExport';

interface HostingerGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function HostingerGuideModal({ isOpen, onClose }: HostingerGuideModalProps) {
  const [downloading, setDownloading] = useState(false);

  if (!isOpen) return null;

  const handleDownload = async () => {
    setDownloading(true);
    try {
      await downloadProjectZip();
    } finally {
      setTimeout(() => setDownloading(false), 800);
    }
  };

  const steps = [
    {
      num: 1,
      title: 'إنشاء قاعدة بيانات MySQL في لوحة Hostinger hPanel',
      desc: 'الدخول إلى Databases -> MySQL Databases وإنشاء قاعدة جديدة مع تدوين اسم القاعدة، المستخدم، وكلمة المرور.',
      icon: Server,
      details: [
        'خادم القاعدة الداخلي في Hostinger دائماً هو: localhost',
        'تأكد من منح المستخدم كافة الصلاحيات (ALL PRIVILEGES)',
        'الترميز الافتراضي utf8mb4_unicode_ci يدعم اللغة العربية تماماً',
      ],
    },
    {
      num: 2,
      title: 'رفع ملفات المشروع إلى مجلد الدومين الفرعي (Subdomain)',
      desc: 'عبر File Manager أو FTP، ارفع حزمة ZIP واستخرجها في مجلد public_html الخاص بك.',
      icon: FolderUp,
      details: [
        'المسار المستهدف: /public_html/subdomain/ (أو داخل public_html الرئيسي)',
        'انقر بالزر الأيمن على ملف ZIP واختر Extract داخل نفس المجلد',
        'الملفات المرفقة تشمل مجلد install و config و core و modules و reports بالإضافة لدليل README.md و HOSTINGER_GUIDE.md',
      ],
    },
    {
      num: 3,
      title: 'تشغيل معالج التنصيب التلقائي في المتصفح',
      desc: 'افتح الرابط المباشر لمعالج التثبيت في متصفحك.',
      icon: Terminal,
      details: [
        'الرابط: https://subdomain.yourdomain.com/install/',
        'أدخل بيانات MySQL (اسم القاعدة، اسم المستخدم، كلمة المرور)',
        'أدخل بيانات حساب المدير العام Super Admin (اسم الدخول وكلمة المرور)',
        'اضغط «بدء التنصيب التلقائي وإنشاء الجداول»',
      ],
    },
    {
      num: 4,
      title: 'القفل الأمني التلقائي (install.lock)',
      desc: 'بمجرد اكتمال الجداول بنجاح، يُقفل المعالج تلقائياً.',
      icon: ShieldCheck,
      details: [
        'يتم إنشاء ملف install/install.lock لمنع أي محاولة لإعادة التنصيب',
        'يتم إنشاء ملف config/db.php المشفر بروابط الاتصال الآمنة',
        'ملف .htaccess يمنع أي وصول خارجي لملفات الإعدادات ومجلد install',
      ],
    },
    {
      num: 5,
      title: 'تسجيل الدخول والبدء الفوري (login.php)',
      desc: 'التوجه إلى صفحة الدخول، تجربة اسم المستخدم وكلمة المرور المشفرة بـ bcrypt.',
      icon: Key,
      details: [
        'الرابط: https://subdomain.yourdomain.com/login.php',
        'الجلسات مؤمنة بـ CSRF و HttpOnly مع قفل آلي بعد 5 محاولات خاطئة',
      ],
    },
  ];

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden shadow-2xl border border-slate-200 flex flex-col animate-in fade-in zoom-in-95">
        
        {/* Header */}
        <div className="bg-slate-900 text-white p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-xl shadow-md">
              📖
            </div>
            <div>
              <h3 className="font-bold text-base">دليل الرفع والتنصيب على استضافة Hostinger</h3>
              <p className="text-xs text-slate-400">
                خطوات تثبيت وتشغيل نظام الرواتب الكويتي (PHP 8.2 + MySQL) خطوة بخطوة
              </p>
            </div>
          </div>

          <button onClick={onClose} className="text-slate-400 hover:text-white p-1 rounded-lg">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-6 text-xs text-slate-800">
          
          {/* ZIP Download Card */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-600 text-white flex items-center justify-center flex-shrink-0">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-sm text-blue-900">
                  حزمة المشروع الكاملة الجاهزة للرفع (ZIP)
                </h4>
                <p className="text-blue-700 text-[11px] mt-0.5">
                  تحتوي على كافة ملفات PHP الـ 32، والمخطط schema.sql، بالإضافة لملفي التوثيق الشاملين README.md و HOSTINGER_GUIDE.md.
                </p>
              </div>
            </div>

            <button
              onClick={handleDownload}
              disabled={downloading}
              className="flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-xs shadow-md transition active:scale-95 disabled:opacity-50 whitespace-nowrap self-start sm:self-auto"
            >
              <Download className="w-4 h-4" />
              <span>{downloading ? 'جاري التجهيز...' : 'تحميل حزمة الـ ZIP الآن'}</span>
            </button>
          </div>

          {/* Steps List */}
          <div className="space-y-4">
            <h4 className="font-bold text-sm text-slate-900">
              خطوات الإعداد على Hostinger Shared / Cloud Hosting:
            </h4>

            {steps.map((st) => {
              const Icon = st.icon;
              return (
                <div key={st.num} className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                  <div className="flex items-start gap-3">
                    <span className="w-7 h-7 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold text-xs flex-shrink-0">
                      {st.num}
                    </span>
                    <div>
                      <h5 className="font-bold text-xs text-slate-900">{st.title}</h5>
                      <p className="text-[11px] text-slate-600 mt-0.5">{st.desc}</p>
                    </div>
                  </div>

                  <ul className="pr-10 space-y-1 text-[11px] text-slate-600 list-disc list-inside">
                    {st.details.map((d, i) => (
                      <li key={i}>{d}</li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>

          {/* Hostinger Notes */}
          <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-900 space-y-1">
            <div className="font-bold flex items-center gap-1.5 text-xs">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>ملاحظة الأمان وتصاريح المجلدات في Hostinger:</span>
            </div>
            <p className="text-[11px] text-emerald-800 pr-5">
              تأكد من أن مجلد <code className="font-mono bg-emerald-100 px-1 py-0.5 rounded">config/</code> و <code className="font-mono bg-emerald-100 px-1 py-0.5 rounded">install/</code> يحملان تصريح الكتابة 755 ليتمكن السكربت من حفظ إعدادات قاعدة البيانات وإنشاء ملف القفل الأمني تلقائياً.
            </p>
          </div>

        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-between">
          <span className="text-[11px] text-slate-500 flex items-center">
            دليل التشغيل محفوظ أيضاً بصيغة Markdown داخل ملفات المشروع
          </span>
          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-xs"
          >
            إغلاق الدليل
          </button>
        </div>

      </div>
    </div>
  );
}
