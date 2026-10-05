import holidayJp from '@holiday-jp/holiday_jp';
import { format, parseISO, addDays, isWeekend, isValid } from 'date-fns';

// 祝日キャッシュ（年単位）
const holidayCache = new Map<number, Set<string>>();

/**
 * 指定年の祝日文字列セット（YYYY-MM-DD）を取得
 */
export function getHolidaysForYear(year: number): Set<string> {
  if (holidayCache.has(year)) {
    return holidayCache.get(year)!;
  }

  const startDate = new Date(year, 0, 1);
  const endDate = new Date(year, 11, 31);
  const holidays = holidayJp.between(startDate, endDate);

  const set = new Set<string>();
  for (const h of holidays) {
    set.add(format(h.date, 'yyyy-MM-dd'));
  }

  holidayCache.set(year, set);
  return set;
}

/**
 * 祝日名を取得（祝日でない場合は null）
 */
export function getHolidayName(dateStrOrObj: string | Date): string | null {
  const date = typeof dateStrOrObj === 'string' ? parseISO(dateStrOrObj) : dateStrOrObj;
  if (!isValid(date)) return null;

  const dateStr = format(date, 'yyyy-MM-dd');
  const year = date.getFullYear();
  const holidays = holidayJp.between(new Date(year, 0, 1), new Date(year, 11, 31));
  const found = holidays.find(h => format(h.date, 'yyyy-MM-dd') === dateStr);
  return found ? found.name : null;
}

/**
 * 指定された日付が祝日かどうかを判定
 */
export function isHoliday(dateStrOrObj: string | Date): boolean {
  const date = typeof dateStrOrObj === 'string' ? parseISO(dateStrOrObj) : dateStrOrObj;
  if (!isValid(date)) return false;

  const dateStr = format(date, 'yyyy-MM-dd');
  const year = date.getFullYear();
  const holidays = getHolidaysForYear(year);
  return holidays.has(dateStr);
}

/**
 * 指定された日付が営業日（土日祝でない）かどうかを判定
 */
export function isBusinessDay(dateStrOrObj: string | Date): boolean {
  const date = typeof dateStrOrObj === 'string' ? parseISO(dateStrOrObj) : dateStrOrObj;
  if (!isValid(date)) return false;

  if (isWeekend(date)) return false;
  return !isHoliday(date);
}

/**
 * 指定日以降（当日含む）で直近の営業日を取得
 */
export function getNextOrCurrentBusinessDay(dateStr: string): string {
  let cur = parseISO(dateStr);
  if (!isValid(cur)) return dateStr;

  while (!isBusinessDay(cur)) {
    cur = addDays(cur, 1);
  }
  return format(cur, 'yyyy-MM-dd');
}

/**
 * 指定日の翌日以降で最初の営業日（翌営業日）を取得
 */
export function getNextBusinessDay(dateStr: string): string {
  let cur = parseISO(dateStr);
  if (!isValid(cur)) return dateStr;

  cur = addDays(cur, 1);
  while (!isBusinessDay(cur)) {
    cur = addDays(cur, 1);
  }
  return format(cur, 'yyyy-MM-dd');
}

/**
 * 開始日と営業日数から終了日を計算
 * 例: duration=1 の場合、開始日が営業日なら終了日=開始日
 * duration=2 の場合、開始日(1日目)の次の営業日が終了日(2日目)
 */
export function calculateEndDate(startDateStr: string, durationBusinessDays: number): string {
  if (durationBusinessDays <= 0) return startDateStr;

  let cur = parseISO(startDateStr);
  if (!isValid(cur)) return startDateStr;

  // 開始日が非営業日の場合は直近の営業日にシフト
  while (!isBusinessDay(cur)) {
    cur = addDays(cur, 1);
  }

  let remaining = durationBusinessDays - 1;
  while (remaining > 0) {
    cur = addDays(cur, 1);
    if (isBusinessDay(cur)) {
      remaining--;
    }
  }

  return format(cur, 'yyyy-MM-dd');
}

/**
 * 2つの日付間の営業日数を計算（開始日と終了日を両方含む）
 */
export function countBusinessDays(startDateStr: string, endDateStr: string): number {
  const start = parseISO(startDateStr);
  const end = parseISO(endDateStr);
  if (!isValid(start) || !isValid(end)) return 0;
  if (start > end) return 0;

  let count = 0;
  let cur = start;
  while (cur <= end) {
    if (isBusinessDay(cur)) {
      count++;
    }
    cur = addDays(cur, 1);
  }
  return count;
}

/**
 * 指定日から n 営業日後の営業日を取得（余白・バッファ日数計算用）
 */
export function addBusinessDays(startDateStr: string, businessDays: number): string {
  if (businessDays <= 0) return startDateStr;
  let cur = parseISO(startDateStr);
  if (!isValid(cur)) return startDateStr;

  let remaining = businessDays;
  while (remaining > 0) {
    cur = addDays(cur, 1);
    if (isBusinessDay(cur)) {
      remaining--;
    }
  }
  return format(cur, 'yyyy-MM-dd');
}
