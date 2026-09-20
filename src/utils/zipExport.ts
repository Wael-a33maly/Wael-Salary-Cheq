import JSZip from 'jszip';
import { PROJECT_FILES } from '../projectFiles';

export async function downloadProjectZip(): Promise<void> {
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
