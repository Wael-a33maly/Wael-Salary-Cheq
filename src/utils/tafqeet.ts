/**
 * Tafqeet utility for Kuwaiti Dinars (KWD) and Fils
 * محول الأرقام إلى كلمات عربية مخصص للدينار الكويتي والفلس
 */

const ONES = ['', 'واحد', 'اثنان', 'ثلاثة', 'أربعة', 'خمسة', 'ستة', 'سبعة', 'ثمانية', 'تسعة'];
const ONES_FEMININE = ['', 'إحدى', 'اثنتان', 'ثلاث', 'أربع', 'خمس', 'ست', 'سبع', 'ثمان', 'تسع'];

const TEENS = [
  'عشرة',
  'أحد عشر',
  'اثنا عشر',
  'ثلاثة عشر',
  'أربعة عشر',
  'خمسة عشر',
  'ستة عشر',
  'سبعة عشر',
  'ثمانية عشر',
  'تسعة عشر',
];

const TENS = ['', 'عشرة', 'عشرون', 'ثلاثون', 'أربعون', 'خمسون', 'ستون', 'سبعون', 'ثمانون', 'تسعون'];

const HUNDREDS = [
  '',
  'مائة',
  'مائتان',
  'ثلاثمائة',
  'أربعمائة',
  'خمسمائة',
  'ستمائة',
  'سبعمائة',
  'ثمانمائة',
  'تسعمائة',
];

function convertThreeDigits(num: number): string {
  if (num === 0) return '';
  const h = Math.floor(num / 100);
  const remainder = num % 100;
  const parts: string[] = [];

  if (h > 0) {
    parts.push(HUNDREDS[h]);
  }

  if (remainder > 0) {
    if (remainder < 10) {
      parts.push(ONES[remainder]);
    } else if (remainder < 20) {
      parts.push(TEENS[remainder - 10]);
    } else {
      const u = remainder % 10;
      const t = Math.floor(remainder / 10);
      if (u > 0) {
        parts.push(`${ONES[u]} و${TENS[t]}`);
      } else {
        parts.push(TENS[t]);
      }
    }
  }

  return parts.join(' و');
}

export function convertNumberToWords(n: number): string {
  if (n === 0) return 'صفر';

  const thousands = Math.floor(n / 1000);
  const remainder = n % 1000;
  const parts: string[] = [];

  if (thousands > 0) {
    if (thousands === 1) {
      parts.push('ألف');
    } else if (thousands === 2) {
      parts.push('ألفان');
    } else if (thousands >= 3 && thousands <= 10) {
      parts.push(`${ONES[thousands]} آلاف`);
    } else {
      parts.push(`${convertThreeDigits(thousands)} ألف`);
    }
  }

  if (remainder > 0) {
    parts.push(convertThreeDigits(remainder));
  }

  return parts.join(' و');
}

/**
 * تحويل المبلغ بالدينار الكويتي إلى كلمات عربية فصحى مع الفلس
 * مثال: 300.000 -> فقط ثلاثمائة دينار كويتي لا غير
 * مثال: 250.050 -> فقط مائتان وخمسون ديناراً كويتياً وخمسون فلساً لا غير
 */
export function tafqeetKuwaiti(amount: number): string {
  if (isNaN(amount) || amount === 0) {
    return 'فقط صفر دينار كويتي لا غير';
  }

  const dinars = Math.floor(amount);
  // Get 3 decimal digits for Fils
  const fils = Math.round((amount - dinars) * 1000);

  let result = 'فقط ';

  if (dinars > 0) {
    const dinarsWord = convertNumberToWords(dinars);
    if (dinars === 1) {
      result += 'دينار كويتي واحد';
    } else if (dinars === 2) {
      result += 'ديناران كويتيان';
    } else if (dinars >= 3 && dinars <= 10) {
      result += `${dinarsWord} دنانير كويتية`;
    } else {
      result += `${dinarsWord} ديناراً كويتياً`;
    }
  }

  if (fils > 0) {
    const filsWord = convertNumberToWords(fils);
    if (dinars > 0) {
      result += ' و';
    }
    if (fils === 1) {
      result += 'فلس واحد';
    } else if (fils === 2) {
      result += 'فلسان';
    } else if (fils >= 3 && fils <= 10) {
      result += `${filsWord} فلوس`;
    } else {
      result += `${filsWord} فلساً`;
    }
  }

  result += ' لا غير';
  return result;
}
