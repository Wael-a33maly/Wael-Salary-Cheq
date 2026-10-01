/**
 * أداة ضغط ومعالجة صور الشيكات
 * تقوم بتحجيم الصور الكبيرة المرفوعة تلقائياً (من الكاميرات والماسحات الضوئية) 
 * إلى دقة عالية مناسبة لمقاس الشيك 9×18 سم مع ضغط JPEG خفيف
 * لضمان عدم تجاوز سعة التخزين في المتصفح وسرعة المعاينة والطباعة
 */

export function compressChequeImage(file: File, maxWidth = 1800, quality = 0.88): Promise<{ dataUrl: string; width: number; height: number; originalName: string }> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) {
      reject(new Error('الملف المختار ليس صورة صالحة'));
      return;
    }

    const reader = new FileReader();
    reader.onerror = () => reject(new Error('فشلت قراءة ملف الصورة'));
    reader.onload = (event) => {
      const img = new Image();
      img.onerror = () => reject(new Error('تعذر تحميل الصورة'));
      img.onload = () => {
        let width = img.naturalWidth || img.width;
        let height = img.naturalHeight || img.height;

        // إذا كانت الصورة أكبر من الحد الأقصى، نقوم بتحجيمها مع الحفاظ على النسبة
        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          // في حال تعذر الحصول على الـ context نستخدم الرابط الأصلي
          resolve({
            dataUrl: event.target?.result as string,
            width: img.naturalWidth || img.width,
            height: img.naturalHeight || img.height,
            originalName: file.name,
          });
          return;
        }

        // رسم الصورة وتصديرها بصيغة JPEG محسنة
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);

        const dataUrl = canvas.toDataURL('image/jpeg', quality);
        resolve({
          dataUrl,
          width,
          height,
          originalName: file.name,
        });
      };

      img.src = event.target?.result as string;
    };

    reader.readAsDataURL(file);
  });
}
