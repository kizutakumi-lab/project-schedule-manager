import {
  parseISO,
  format,
  eachDayOfInterval,
  isWeekend,
  isValid,
  startOfWeek,
  endOfWeek,
  eachWeekOfInterval,
  addDays,
} from 'date-fns';
import { isBusinessDay, isHoliday, getHolidayName } from './business-days';

export interface CalendarDay {
  dateStr: string;        // '2025-04-01'
  year: number;
  month: number;          // 1 - 12
  day: number;            // 1 - 31
  dayOfWeek: number;      // 0 (Sun) - 6 (Sat)
  dayOfWeekStr: string;   // '日', '月', '火', ...
  isWeekend: boolean;
  isHoliday: boolean;
  holidayName: string | null;
  isBusinessDay: boolean;
  isToday: boolean;
  isMonthStart: boolean;
}

const DOW_LABELS = ['日', '月', '火', '水', '木', '金', '土'];

/**
 * 開始日〜終了日の日付カレンダー配列を生成
 */
export function generateCalendarDays(startDateStr: string, endDateStr: string): CalendarDay[] {
  const start = parseISO(startDateStr);
  const end = parseISO(endDateStr);

  if (!isValid(start) || !isValid(end) || start > end) {
    return [];
  }

  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const days = eachDayOfInterval({ start, end });

  return days.map(d => {
    const dateStr = format(d, 'yyyy-MM-dd');
    const dow = d.getDay();
    const holiday = isHoliday(d);
    const weekend = isWeekend(d);

    return {
      dateStr,
      year: d.getFullYear(),
      month: d.getMonth() + 1,
      day: d.getDate(),
      dayOfWeek: dow,
      dayOfWeekStr: DOW_LABELS[dow],
      isWeekend: weekend,
      isHoliday: holiday,
      holidayName: getHolidayName(d),
      isBusinessDay: !weekend && !holiday,
      isToday: dateStr === todayStr,
      isMonthStart: d.getDate() === 1,
    };
  });
}

/**
 * 月ごとのグループ情報を取得（カレンダーヘッダー描画用）
 */
export interface MonthGroup {
  year: number;
  month: number;
  label: string; // '2025年4月'
  daysCount: number;
}

export function groupCalendarByMonth(days: CalendarDay[]): MonthGroup[] {
  const groups: MonthGroup[] = [];
  let curGroup: MonthGroup | null = null;

  for (const day of days) {
    if (!curGroup || curGroup.year !== day.year || curGroup.month !== day.month) {
      curGroup = {
        year: day.year,
        month: day.month,
        label: `${day.year}年${day.month}月`,
        daysCount: 1,
      };
      groups.push(curGroup);
    } else {
      curGroup.daysCount++;
    }
  }

  return groups;
}

/**
 * 週単位のカレンダーデータ構造（A4横向き圧縮用）
 */
export interface CalendarWeek {
  weekIndex: number;
  startDateStr: string; // 月曜日 '2025-04-07'
  endDateStr: string;   // 日曜日 '2025-04-13'
  label: string;        // '4/7週'
  year: number;
  month: number;
}

/**
 * 開始日〜終了日の週単位配列を生成（月曜日始まり）
 */
export function generateCalendarWeeks(startDateStr: string, endDateStr: string): CalendarWeek[] {
  const start = parseISO(startDateStr);
  const end = parseISO(endDateStr);

  if (!isValid(start) || !isValid(end) || start > end) {
    return [];
  }

  const weekStarts = eachWeekOfInterval(
    { start, end },
    { weekStartsOn: 1 } // 月曜日始まり
  );

  return weekStarts.map((wStart, idx) => {
    const wEnd = addDays(wStart, 6);
    return {
      weekIndex: idx,
      startDateStr: format(wStart, 'yyyy-MM-dd'),
      endDateStr: format(wEnd, 'yyyy-MM-dd'),
      label: `${format(wStart, 'M/d')}週`,
      year: wStart.getFullYear(),
      month: wStart.getMonth() + 1,
    };
  });
}

/**
 * 週単位における月グループ（ヘッダー用）
 */
export function groupWeeksByMonth(weeks: CalendarWeek[]): MonthGroup[] {
  const groups: MonthGroup[] = [];
  let curGroup: MonthGroup | null = null;

  for (const week of weeks) {
    if (!curGroup || curGroup.year !== week.year || curGroup.month !== week.month) {
      curGroup = {
        year: week.year,
        month: week.month,
        label: `${week.year}年${week.month}月`,
        daysCount: 1, // ここでは週数をカウント
      };
      groups.push(curGroup);
    } else {
      curGroup.daysCount++;
    }
  }

  return groups;
}

/**
 * 週単位でのタスクバー位置（leftIndex, span）を算出
 */
export function getWeekBarPosition(
  taskStart: string,
  taskEnd: string,
  weeks: CalendarWeek[]
): { leftIndex: number; span: number; isVisible: boolean } {
  if (!taskStart || !taskEnd || weeks.length === 0) {
    return { leftIndex: -1, span: 0, isVisible: false };
  }

  const firstWeek = weeks[0];
  const lastWeek = weeks[weeks.length - 1];

  if (taskEnd < firstWeek.startDateStr || taskStart > lastWeek.endDateStr) {
    return { leftIndex: -1, span: 0, isVisible: false };
  }

  // 開始日が含まれる週（またはタスク開始より後の最初の週）
  let leftIndex = weeks.findIndex(w => taskStart <= w.endDateStr);
  if (leftIndex === -1) leftIndex = 0;

  // 終了日が含まれる週
  let rightIndex = weeks.findIndex(w => taskEnd <= w.endDateStr);
  if (rightIndex === -1) rightIndex = weeks.length - 1;

  const span = Math.max(1, rightIndex - leftIndex + 1);

  return { leftIndex, span, isVisible: true };
}

/**
 * タスクの開始日・終了日からカレンダー上での位置（startIndex, spanDays）を算出（日単位用）
 */
export function getBarPosition(
  taskStart: string,
  taskEnd: string,
  calendarStart: string,
  calendarEnd: string,
  totalDays: number
): { leftIndex: number; span: number; isVisible: boolean } {
  if (!taskStart || !taskEnd || taskStart > calendarEnd || taskEnd < calendarStart) {
    return { leftIndex: -1, span: 0, isVisible: false };
  }

  const startDiff = Math.floor(
    (parseISO(taskStart).getTime() - parseISO(calendarStart).getTime()) / (1000 * 60 * 60 * 24)
  );
  const endDiff = Math.floor(
    (parseISO(taskEnd).getTime() - parseISO(calendarStart).getTime()) / (1000 * 60 * 60 * 24)
  );

  const leftIndex = Math.max(0, startDiff);
  const rightIndex = Math.min(totalDays - 1, endDiff);
  const span = Math.max(1, rightIndex - leftIndex + 1);

  return { leftIndex, span, isVisible: true };
}

/**
 * Excel添付画像に基づく洗練されたタスクバーのカラーパレット判定
 */
export function getTaskColorTheme(taskName: string, itemType: string): {
  bg: string;
  border: string;
  text: string;
} {
  if (itemType === 'category') {
    return {
      bg: 'bg-slate-700',
      border: 'border-slate-800',
      text: 'text-white',
    };
  }
  if (itemType === 'group') {
    return {
      bg: 'bg-slate-400',
      border: 'border-slate-500',
      text: 'text-white',
    };
  }

  const name = taskName.toLowerCase();
  // 監修・確認（添付画像のピンク・赤系）
  if (name.includes('確認') || name.includes('監修') || name.includes('チェック') || name.includes('審査')) {
    return {
      bg: 'bg-rose-400 hover:bg-rose-500',
      border: 'border-rose-500',
      text: 'text-white font-medium',
    };
  }
  // コンテ（添付画像の黄色系）
  if (name.includes('コンテ') || name.includes('構成') || name.includes('演出')) {
    return {
      bg: 'bg-amber-300 hover:bg-amber-400',
      border: 'border-amber-400',
      text: 'text-amber-950 font-medium',
    };
  }
  // 仕上げ・音楽・清書（添付画像の薄緑系）
  if (name.includes('仕上') || name.includes('清書') || name.includes('楽曲') || name.includes('歌詞') || name.includes('納品')) {
    return {
      bg: 'bg-emerald-300 hover:bg-emerald-400',
      border: 'border-emerald-400',
      text: 'text-emerald-950 font-medium',
    };
  }
  // イベント・配信期間（添付画像のオレンジ・水色）
  if (name.includes('配信') || name.includes('公開') || name.includes('リリース')) {
    return {
      bg: 'bg-orange-400 hover:bg-orange-500',
      border: 'border-orange-500',
      text: 'text-white font-medium',
    };
  }
  if (name.includes('交渉') || name.includes('下見') || name.includes('報道') || name.includes('会場')) {
    return {
      bg: 'bg-sky-200 hover:bg-sky-300',
      border: 'border-sky-300',
      text: 'text-sky-950 font-medium',
    };
  }

  // デフォルト制作タスク（添付画像のライトブルー）
  return {
    bg: 'bg-blue-300 hover:bg-blue-400',
    border: 'border-blue-400',
    text: 'text-blue-950 font-medium',
  };
}
