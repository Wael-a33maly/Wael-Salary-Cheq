// Unified Cheque Coordinates and Proportions Utility
// Ensures 100% identical coordinate mapping across:
// 1. ChequeCalibrationTab (Interactive calibration workbench)
// 2. CbkChequePrint (Direct print modal & printer iframe generation)
// 3. IssueChequeForm (Live issue preview)

import { ChequePrintSettings, ChequeSizeTemplate } from '../types';

export interface FieldCoord {
  left: number;
  top: number;
  width: number;
  height: number;
  fontSize: number;
  align: 'right' | 'center' | 'left';
}

export interface ChequeCoordsMap {
  date: FieldCoord;
  payee: FieldCoord;
  words: FieldCoord;
  amount: FieldCoord;
}

// Canonical physical base coordinates on official 180mm x 90mm CBK cheque
export const CBK_CHEQUE_BASE_COORDS = {
  date: { left: 134, top: 12, width: 36, height: 8.5, fontSize: 12, align: 'center' as const },
  payee: { left: 16, top: 29, width: 120, height: 8.5, fontSize: 13, align: 'right' as const },
  words: { left: 54, top: 41, width: 84, height: 9.5, fontSize: 11, align: 'right' as const },
  amount: { left: 10, top: 38, width: 42, height: 12.5, fontSize: 14, align: 'center' as const },
};

/**
 * Computes base anchor coordinates for any physical cheque size (in mm).
 * Uses proportional and anchor logic:
 * - Date: anchored to top-right corner (~10mm from right edge, ~12mm from top)
 * - Payee: starts on right after "ادفعوا لأمر" (44mm from right edge), ends ~16mm from left edge
 * - Words (Tafqeet): starts after "مبلغ وقدره" (42mm from right), ends ~54mm from left edge
 * - Amount: anchored to the left amount box ("د.ك") at 10mm from left edge
 */
export function getChequeBaseCoords(widthMm: number, heightMm: number): ChequeCoordsMap {
  const safeW = widthMm > 0 ? widthMm : 180;
  const safeH = heightMm > 0 ? heightMm : 90;

  // Date
  const dateW = 36;
  const dateH = 8.5;
  const dateL = Math.max(0, Math.round(safeW - 10 - dateW)); // 180 - 46 = 134mm
  const dateT = Math.round(safeH * (12 / 90) * 10) / 10; // 12mm on 90mm

  // Payee (اسم المستفيد):
  // Physical anchor: The printed prompt "ادفعوا لأمر" is on the right side (~44mm from right margin on 180mm).
  // The line extends leftward towards 16mm from left margin.
  const payeeRightMargin = safeW >= 200 ? 44 + Math.round((safeW - 180) * 0.05) : safeW <= 160 ? 38 : 44;
  const payeeL = safeW <= 160 ? 12 : 16;
  const payeeW = Math.max(40, Math.round((safeW - payeeL - payeeRightMargin) * 10) / 10);
  const payeeT = Math.round(safeH * (29 / 90) * 10) / 10; // 29mm on 90mm
  const payeeH = 8.5;

  // Words (مبلغ وقدره / التفقيط):
  const wordsL = safeW <= 160 ? 46 : 54;
  const wordsT = Math.round(safeH * (41 / 90) * 10) / 10; // 41mm on 90mm
  const wordsW = Math.max(50, Math.round((safeW - wordsL - 42) * 10) / 10);
  const wordsH = 9.5;

  // Amount in Digits (المبلغ بالأرقام):
  const amountL = safeW <= 160 ? 8 : 10;
  const amountT = Math.round(safeH * (38 / 90) * 10) / 10; // 38mm on 90mm
  const amountW = safeW <= 160 ? 38 : 42;
  const amountH = 12.5;

  return {
    date: { left: dateL, top: dateT, width: dateW, height: dateH, fontSize: 12, align: 'center' },
    payee: { left: payeeL, top: payeeT, width: payeeW, height: payeeH, fontSize: 13, align: 'right' },
    words: { left: wordsL, top: wordsT, width: wordsW, height: wordsH, fontSize: 11, align: 'right' },
    amount: { left: amountL, top: amountT, width: amountW, height: amountH, fontSize: 14, align: 'center' },
  };
}

/**
 * Computes exact millimeter coordinates, dimensions, font sizes and alignments
 * taking into account user calibration offsets, general offsets, size overrides,
 * and optional template specific coordinate anchors.
 */
export function computeChequeFieldPositions(
  printSettings: ChequePrintSettings,
  widthMm: number,
  heightMm: number,
  template?: ChequeSizeTemplate
): ChequeCoordsMap {
  const base = getChequeBaseCoords(widthMm, heightMm);
  const generalOffsetX = printSettings.offsetX || 0;
  const generalOffsetY = printSettings.offsetY || 0;

  // Base anchors with template overrides if configured
  const effectiveBaseDateL = template?.dateLeftMm ?? base.date.left;
  const effectiveBaseDateT = template?.dateTopMm ?? base.date.top;
  const effectiveBaseDateW = template?.dateWidthMm ?? base.date.width;
  const effectiveBaseDateH = template?.dateHeightMm ?? base.date.height;
  const effectiveBaseDateFont = template?.dateFontSize ?? base.date.fontSize;

  const effectiveBasePayeeL = template?.payeeLeftMm ?? base.payee.left;
  const effectiveBasePayeeT = template?.payeeTopMm ?? base.payee.top;
  const effectiveBasePayeeW = template?.payeeWidthMm ?? base.payee.width;
  const effectiveBasePayeeH = template?.payeeHeightMm ?? base.payee.height;
  const effectiveBasePayeeFont = template?.payeeFontSize ?? base.payee.fontSize;

  const effectiveBaseWordsL = template?.wordsLeftMm ?? base.words.left;
  const effectiveBaseWordsT = template?.wordsTopMm ?? base.words.top;
  const effectiveBaseWordsW = template?.wordsWidthMm ?? base.words.width;
  const effectiveBaseWordsH = template?.wordsHeightMm ?? base.words.height;
  const effectiveBaseWordsFont = template?.wordsFontSize ?? base.words.fontSize;

  const effectiveBaseAmountL = template?.amountLeftMm ?? base.amount.left;
  const effectiveBaseAmountT = template?.amountTopMm ?? base.amount.top;
  const effectiveBaseAmountW = template?.amountWidthMm ?? base.amount.width;
  const effectiveBaseAmountH = template?.amountHeightMm ?? base.amount.height;
  const effectiveBaseAmountFont = template?.amountFontSize ?? base.amount.fontSize;

  // Date
  const dateLeft = Math.round((effectiveBaseDateL + generalOffsetX + (printSettings.dateOffsetX || 0)) * 10) / 10;
  const dateTop = Math.round((effectiveBaseDateT + generalOffsetY + (printSettings.dateOffsetY || 0)) * 10) / 10;
  const dateWidth = Math.round((printSettings.dateWidth ?? effectiveBaseDateW) * 10) / 10;
  const dateHeight = Math.round((printSettings.dateHeight ?? effectiveBaseDateH) * 10) / 10;
  const dateFontSize = printSettings.dateFontSize ?? effectiveBaseDateFont;
  const dateAlign = printSettings.dateAlign || 'center';

  // Payee
  const payeeLeft = Math.round((effectiveBasePayeeL + generalOffsetX + (printSettings.payeeOffsetX || 0)) * 10) / 10;
  const payeeTop = Math.round((effectiveBasePayeeT + generalOffsetY + (printSettings.payeeOffsetY || 0)) * 10) / 10;
  // If width is not 180mm and payeeWidth was the legacy default 120, adapt to effectiveBasePayeeW
  let resolvedPayeeWidth = effectiveBasePayeeW;
  if (printSettings.payeeWidth !== undefined && printSettings.payeeWidth !== null) {
    if (Math.abs(widthMm - 180) <= 2 || printSettings.payeeWidth !== 120) {
      resolvedPayeeWidth = printSettings.payeeWidth;
    }
  }
  const payeeWidth = Math.round(resolvedPayeeWidth * 10) / 10;
  const payeeHeight = Math.round((printSettings.payeeHeight ?? effectiveBasePayeeH) * 10) / 10;
  const payeeFontSize = printSettings.payeeFontSize ?? effectiveBasePayeeFont;
  const payeeAlign = printSettings.payeeAlign || 'right';

  // Words
  const wordsLeft = Math.round((effectiveBaseWordsL + generalOffsetX + (printSettings.wordsOffsetX || 0)) * 10) / 10;
  const wordsTop = Math.round((effectiveBaseWordsT + generalOffsetY + (printSettings.wordsOffsetY || 0)) * 10) / 10;
  let resolvedWordsWidth = effectiveBaseWordsW;
  if (printSettings.wordsWidth !== undefined && printSettings.wordsWidth !== null) {
    if (Math.abs(widthMm - 180) <= 2 || printSettings.wordsWidth !== 84) {
      resolvedWordsWidth = printSettings.wordsWidth;
    }
  }
  const wordsWidth = Math.round(resolvedWordsWidth * 10) / 10;
  const wordsHeight = Math.round((printSettings.wordsHeight ?? effectiveBaseWordsH) * 10) / 10;
  const wordsFontSize = printSettings.wordsFontSize ?? effectiveBaseWordsFont;
  const wordsAlign = printSettings.wordsAlign || 'right';

  // Amount
  const amountLeft = Math.round((effectiveBaseAmountL + generalOffsetX + (printSettings.amountOffsetX || 0)) * 10) / 10;
  const amountTop = Math.round((effectiveBaseAmountT + generalOffsetY + (printSettings.amountOffsetY || 0)) * 10) / 10;
  const amountWidth = Math.round((printSettings.amountWidth ?? effectiveBaseAmountW) * 10) / 10;
  const amountHeight = Math.round((printSettings.amountHeight ?? effectiveBaseAmountH) * 10) / 10;
  const amountFontSize = printSettings.amountFontSize ?? effectiveBaseAmountFont;
  const amountAlign = printSettings.amountAlign || 'center';

  return {
    date: { left: dateLeft, top: dateTop, width: dateWidth, height: dateHeight, fontSize: dateFontSize, align: dateAlign },
    payee: { left: payeeLeft, top: payeeTop, width: payeeWidth, height: payeeHeight, fontSize: payeeFontSize, align: payeeAlign },
    words: { left: wordsLeft, top: wordsTop, width: wordsWidth, height: wordsHeight, fontSize: wordsFontSize, align: wordsAlign },
    amount: { left: amountLeft, top: amountTop, width: amountWidth, height: amountHeight, fontSize: amountFontSize, align: amountAlign },
  };
}
