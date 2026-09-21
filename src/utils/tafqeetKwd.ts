/**
 * دالة تفقيط المبالغ باللغة العربية للدينار الكويتي والفلس
 * Kuwaiti Dinar Arabic Tafqeet Utility (KWD & Fils)
 * 1 KWD = 1000 Fils (3 decimal digits)
 */

const ONES = [
  '',
  'واحد',
  'اثنان',
  'ثلاثة',
  'أربعة',
  'خمسة',
  'ستة',
  'سبعة',
  'ثمانية',
  'تسعة',
];

const ONES_FEMININE = [
  '',
  'واحدة',
  'اثنتان',
  'ثلاث',
  'أربع',
  'خمس',
  'ست',
  'سبع',
  'ثمان',
  'تسع',
];

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

const TENS = [
  '',
  'عشرة',
  'عشرون',
  'ثلاثون',
  'أربعون',
  'خمسون',
  'ستون',
  'سبعون',
  'ثمانون',
  'تسعون',
];

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

function convertGroup(num: number): string {
  if (num === 0) return '';
  const h = Math.floor(num / 100);
  const rem = num % 100;
  const parts: string[] = [];

  if (h > 0) {
    parts.push(HUNDREDS[h]);
  }

  if (rem > 0) {
    if (rem < 10) {
      parts.push(ONES[rem]);
    } else if (rem >= 10 && rem < 20) {
      parts.push(TEENS[rem - 10]);
    } else {
      const u = rem % 10;
      const t = Math.floor(rem / 10);
      if (u > 0) {
        parts.push(`${ONES[u]} و${TENS[t]}`);
      } else {
        parts.push(TENS[t]);
      }
    }
  }

  return parts.join(' و');
}

/**
 * تحويل عدد صحيح إلى كلمات عربية (حتى الملايين)
 */
export function integerToArabicWords(num: number): string {
  if (num === 0) return 'صفر';
  if (num < 0) return `سالب ${integerToArabicWords(Math.abs(num))}`;

  const parts: string[] = [];

  const millions = Math.floor(num / 1000000);
  const thousands = Math.floor((num % 1000000) / 1000);
  const units = num % 1000;

  if (millions > 0) {
    if (millions === 1) {
      parts.push('مليون');
    } else if (millions === 2) {
      parts.push('مليونان');
    } else if (millions >= 3 && millions <= 10) {
      parts.push(`${convertGroup(millions)} ملايين`);
    } else {
      parts.push(`${convertGroup(millions)} مليوناً`);
    }
  }

  if (thousands > 0) {
    if (thousands === 1) {
      parts.push('ألف');
    } else if (thousands === 2) {
      parts.push('ألفان');
    } else if (thousands >= 3 && thousands <= 10) {
      parts.push(`${convertGroup(thousands)} آلاف`);
    } else {
      parts.push(`${convertGroup(thousands)} ألفاً`);
    }
  }

  if (units > 0) {
    parts.push(convertGroup(units));
  }

  return parts.join(' و');
}

/**
 * صيغة الجمع والتثنية للدينار الكويتي
 */
function getDinarText(dinars: number): string {
  if (dinars === 0) return '';
  if (dinars === 1) return 'دينار كويتي واحد';
  if (dinars === 2) return 'ديناران كويتيان';
  if (dinars >= 3 && dinars <= 10) {
    return `${integerToArabicWords(dinars)} دنانير كويتية`;
  }
  return `${integerToArabicWords(dinars)} ديناراً كويتياً`;
}

/**
 * صيغة الجمع والتثنية للفلس الكويتي
 */
function getFilsText(fils: number): string {
  if (fils === 0) return '';
  if (fils === 1) return 'فلس واحد';
  if (fils === 2) return 'فلسان';
  if (fils >= 3 && fils <= 10) {
    return `${integerToArabicWords(fils)} فلوس`;
  }
  return `${integerToArabicWords(fils)} فلساً`;
}

/**
 * تفقيط المبالغ بالدينار الكويتي والفلس للشيكات المصرفية
 * @param amount المبلغ بالأرقام (مثال: 1450.750)
 * @returns النص المفقط الرسمي (مثال: "فقط ألف وأربعمائة وخمسون ديناراً كويتياً وسبعمائة وخمسون فلساً لا غير")
 */
export function tafqeetKwd(amount: number): string {
  if (isNaN(amount) || amount <= 0) {
    return 'فقط صفر دينار كويتي لا غير';
  }

  // تجزئة الدنانير والفلوس بدقة
  const totalFils = Math.round(amount * 1000);
  const dinars = Math.floor(totalFils / 1000);
  const fils = totalFils % 1000;

  const dinarPart = getDinarText(dinars);
  const filsPart = getFilsText(fils);

  let result = '';

  if (dinarPart && filsPart) {
    result = `${dinarPart} و${filsPart}`;
  } else if (dinarPart) {
    result = dinarPart;
  } else if (filsPart) {
    result = filsPart;
  } else {
    result = 'صفر دينار كويتي';
  }

  return `فقط ${result} لا غير`;
}

const EN_ONES = [
  '',
  'One',
  'Two',
  'Three',
  'Four',
  'Five',
  'Six',
  'Seven',
  'Eight',
  'Nine',
  'Ten',
  'Eleven',
  'Twelve',
  'Thirteen',
  'Fourteen',
  'Fifteen',
  'Sixteen',
  'Seventeen',
  'Eighteen',
  'Nineteen',
];

const EN_TENS = [
  '',
  '',
  'Twenty',
  'Thirty',
  'Forty',
  'Fifty',
  'Sixty',
  'Seventy',
  'Eighty',
  'Ninety',
];

function integerToEnWords(num: number): string {
  if (num === 0) return 'Zero';
  if (num < 20) return EN_ONES[num];
  if (num < 100) {
    const rem = num % 10;
    return EN_TENS[Math.floor(num / 10)] + (rem !== 0 ? ' ' + EN_ONES[rem] : '');
  }
  if (num < 1000) {
    const rem = num % 100;
    return EN_ONES[Math.floor(num / 100)] + ' Hundred' + (rem !== 0 ? ' ' + integerToEnWords(rem) : '');
  }
  if (num < 1000000) {
    const rem = num % 1000;
    return integerToEnWords(Math.floor(num / 1000)) + ' Thousand' + (rem !== 0 ? ' ' + integerToEnWords(rem) : '');
  }
  if (num < 1000000000) {
    const rem = num % 1000000;
    return integerToEnWords(Math.floor(num / 1000000)) + ' Million' + (rem !== 0 ? ' ' + integerToEnWords(rem) : '');
  }
  return num.toString();
}

/**
 * تفقيط المبالغ باللغة الإنجليزية للشيكات المصرفية الكويتية
 * Example: 2500 -> "Kuwaiti Dinars Two Thousand Five Hundred Only"
 */
export function tafqeetKwdEn(amount: number): string {
  if (isNaN(amount) || amount <= 0) {
    return 'Kuwaiti Dinars Zero Only';
  }

  const totalFils = Math.round(amount * 1000);
  const dinars = Math.floor(totalFils / 1000);
  const fils = totalFils % 1000;

  let words = 'Kuwaiti Dinar' + (dinars !== 1 ? 's ' : ' ') + integerToEnWords(dinars);
  if (fils > 0) {
    words += ' and ' + integerToEnWords(fils) + ' Fils';
  }
  return words + ' Only';
}

