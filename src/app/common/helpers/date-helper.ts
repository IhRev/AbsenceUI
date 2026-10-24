export class DateHelper {
  static getCurrentYear(): number {
    return new Date().getFullYear();
  }

  static getStartOfTheCurrentYear(): Date {
    return DateHelper.getStartOfTheYear(DateHelper.getCurrentYear());
  }

  static getEndOfTheCurrentYear(): Date {
    return DateHelper.getEndOfTheYear(DateHelper.getCurrentYear());
  }

  static getStartOfTheYear(year: number): Date {
    return new Date(year, 0, 1);
  }

  static getEndOfTheYear(year: number): Date {
    return new Date(year, 11, 31);
  }

  static getDateOnlyString(date: Date): string {
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  static startOfLocalDay(date: Date): Date {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate());
  }

  static toOffsetString(date: Date): string {
    const pad = (value: number) => value.toString().padStart(2, '0');
    const offsetMinutes = -date.getTimezoneOffset();
    const sign = offsetMinutes >= 0 ? '+' : '-';
    const absolute = Math.abs(offsetMinutes);
    return (
      `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
      `T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}` +
      `${sign}${pad(Math.floor(absolute / 60))}:${pad(absolute % 60)}`
    );
  }

  // Absence overlap is half-open, so the caller's last day is sent as the next midnight.
  static absenceQueryRange(startDate: Date, endDate: Date): { start: string; end: string } {
    const start = DateHelper.startOfLocalDay(startDate);
    const end = DateHelper.startOfLocalDay(endDate);
    end.setDate(end.getDate() + 1);
    return {
      start: DateHelper.toOffsetString(start),
      end: DateHelper.toOffsetString(end),
    };
  }

  // Holiday overlap is closed, so the end is the last second of the selected day.
  static holidayQueryRange(startDate: Date, endDate: Date): { start: string; end: string } {
    const start = DateHelper.startOfLocalDay(startDate);
    const end = DateHelper.startOfLocalDay(endDate);
    end.setHours(23, 59, 59, 0);
    return {
      start: DateHelper.toOffsetString(start),
      end: DateHelper.toOffsetString(end),
    };
  }
}
