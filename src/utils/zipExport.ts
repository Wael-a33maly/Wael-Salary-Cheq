import JSZip from 'jszip';
import { PROJECT_FILES } from '../projectFiles';

export async function downloadProjectZip(): Promise<void> {
  // نقوم بتنزيل حزمة الإنتاج كـ Blob مباشر لمنع أي تلف أثناء التنزيل داخل بيئة المتصفح أو الـ iFrame
  const directZipUrl = `/payroll_system_kwd_production.zip?t=${Date.now()}`;
  
  try {
    const resp = await fetch(directZipUrl);
    if (resp.ok) {
      const blob = await resp.blob();
      // إنشاء كائن Blob صريح بنوع application/zip القياسي
      const zipBlob = new Blob([blob], { type: 'application/zip' });
      const url = URL.createObjectURL(zipBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'payroll_system_kwd_production.zip';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 5000);
      return;
    }
  } catch (err) {
    console.warn('Direct zip fetch fallback to JSZip generator:', err);
  }

  // Fallback عبر JSZip
  const zip = new JSZip();
  const folder = zip.folder('public_html');

  for (const file of PROJECT_FILES) {
    folder?.file(file.path, file.content);
  }

  const content = await zip.generateAsync({ type: 'blob' });
  const url = URL.createObjectURL(content);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'payroll_system_kwd_production.zip';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// للتوافق مع التسمية السابقة
export const downloadPhase1Zip = downloadProjectZip;
