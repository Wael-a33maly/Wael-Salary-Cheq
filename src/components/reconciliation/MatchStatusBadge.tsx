import React from 'react';
import {
  CheckCircle2,
  AlertCircle,
  Clock,
  HelpCircle,
  FileMinus,
  Percent,
  MinusCircle,
  Copy
} from 'lucide-react';
import { MatchStatus } from '../../types/reconciliationTypes';

interface MatchStatusBadgeProps {
  status: MatchStatus;
  level?: 1 | 2 | 3 | 'manual';
  confidenceScore?: number;
}

export function MatchStatusBadge({ status, level, confidenceScore }: MatchStatusBadgeProps) {
  switch (status) {
    case 'matched':
      return (
        <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 border border-emerald-300 px-2 py-0.5 rounded-full text-[10px] font-bold">
          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
          <span>متطابق {level ? `(م ${level})` : ''}</span>
        </span>
      );

    case 'partial_match':
      return (
        <span className="inline-flex items-center gap-1 bg-teal-50 text-teal-700 border border-teal-300 px-2 py-0.5 rounded-full text-[10px] font-bold">
          <Percent className="w-3 h-3 text-teal-600" />
          <span>مطابقة جزئية</span>
        </span>
      );

    case 'needs_review':
      return (
        <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-700 border border-amber-300 px-2 py-0.5 rounded-full text-[10px] font-bold">
          <HelpCircle className="w-3 h-3 text-amber-600" />
          <span>تحتاج مراجعة</span>
        </span>
      );

    case 'bank_only':
      return (
        <span className="inline-flex items-center gap-1 bg-purple-50 text-purple-700 border border-purple-300 px-2 py-0.5 rounded-full text-[10px] font-bold">
          <AlertCircle className="w-3 h-3 text-purple-600" />
          <span>بالبنك فقط (غير مقيد)</span>
        </span>
      );

    case 'accounting_only':
      return (
        <span className="inline-flex items-center gap-1 bg-orange-50 text-orange-700 border border-orange-300 px-2 py-0.5 rounded-full text-[10px] font-bold">
          <AlertCircle className="w-3 h-3 text-orange-600" />
          <span>بالمحاسبة فقط</span>
        </span>
      );

    case 'amount_difference':
      return (
        <span className="inline-flex items-center gap-1 bg-red-50 text-red-700 border border-red-300 px-2 py-0.5 rounded-full text-[10px] font-bold">
          <AlertCircle className="w-3 h-3 text-red-600" />
          <span>فرق في المبلغ</span>
        </span>
      );

    case 'date_difference':
      return (
        <span className="inline-flex items-center gap-1 bg-blue-50 text-blue-700 border border-blue-300 px-2 py-0.5 rounded-full text-[10px] font-bold">
          <Clock className="w-3 h-3 text-blue-600" />
          <span>فرق في التاريخ</span>
        </span>
      );

    case 'bank_fee':
      return (
        <span className="inline-flex items-center gap-1 bg-indigo-50 text-indigo-700 border border-indigo-300 px-2 py-0.5 rounded-full text-[10px] font-bold">
          <Percent className="w-3 h-3 text-indigo-600" />
          <span>عمولة بنكية</span>
        </span>
      );

    case 'pending':
      return (
        <span className="inline-flex items-center gap-1 bg-sky-50 text-sky-700 border border-sky-300 px-2 py-0.5 rounded-full text-[10px] font-bold">
          <Clock className="w-3 h-3 text-sky-600" />
          <span>حركة معلقة / شيك لم يصرف</span>
        </span>
      );

    case 'duplicate':
      return (
        <span className="inline-flex items-center gap-1 bg-rose-50 text-rose-700 border border-rose-300 px-2 py-0.5 rounded-full text-[10px] font-bold">
          <Copy className="w-3 h-3 text-rose-600" />
          <span>حركة مكررة</span>
        </span>
      );

    case 'excluded':
      return (
        <span className="inline-flex items-center gap-1 bg-slate-100 text-slate-500 border border-slate-300 px-2 py-0.5 rounded-full text-[10px] font-bold">
          <MinusCircle className="w-3 h-3 text-slate-400" />
          <span>مستبعد</span>
        </span>
      );

    case 'unmatched':
    default:
      return (
        <span className="inline-flex items-center gap-1 bg-slate-100 text-slate-600 border border-slate-300 px-2 py-0.5 rounded-full text-[10px] font-bold">
          <span>غير متطابق</span>
        </span>
      );
  }
}
