declare module '@holiday-jp/holiday_jp' {
  export interface Holiday {
    date: Date;
    name: string;
    enName?: string;
    week?: string;
  }

  export function isHoliday(date: Date): boolean;
  export function between(start: Date, end: Date): Holiday[];
  export const holidays: { [key: string]: Holiday };
}
