import {
  format,
  parse,
  parseISO,
  isValid,
  addDays,
  addWeeks,
  addMonths,
  addYears,
  subDays,
  subWeeks,
  subMonths,
  subYears,
  startOfDay,
  endOfDay,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  startOfYear,
  endOfYear,
  differenceInDays,
  differenceInHours,
  differenceInMinutes,
  differenceInSeconds,
  isBefore,
  isAfter,
  isEqual,
  isFuture,
  isPast,
  isToday,
  isYesterday,
  isTomorrow,
  isWeekend,
  getUnixTime,
  fromUnixTime,
} from 'date-fns';
import { toZonedTime, format as formatTz } from 'date-fns-tz';

/**
 * Date utility class for date/time manipulation
 * Provides comprehensive date operations using date-fns
 */
export class DateUtil {
  /**
   * Default date format
   */
  private static readonly DEFAULT_FORMAT = 'yyyy-MM-dd';
  private static readonly DEFAULT_DATETIME_FORMAT = 'yyyy-MM-dd HH:mm:ss';

  /**
   * Formats a date using a specified format
   * @param date Date to format
   * @param formatStr Format string (default: yyyy-MM-dd)
   * @returns Formatted date string
   */
  static format(date: Date | number, formatStr: string = this.DEFAULT_FORMAT): string {
    return format(date, formatStr);
  }

  /**
   * Formats a date with timezone
   * @param date Date to format
   * @param timezone Timezone (e.g., 'America/New_York')
   * @param formatStr Format string
   * @returns Formatted date string in timezone
   */
  static formatWithTimezone(
    date: Date | number,
    timezone: string,
    formatStr: string = this.DEFAULT_DATETIME_FORMAT,
  ): string {
    const zonedDate = toZonedTime(date, timezone);
    return formatTz(zonedDate, formatStr, { timeZone: timezone });
  }

  /**
   * Parses a date string
   * @param dateString Date string to parse
   * @param formatStr Format string
   * @param referenceDate Reference date for parsing (default: now)
   * @returns Parsed date
   */
  static parse(
    dateString: string,
    formatStr: string,
    referenceDate: Date = new Date(),
  ): Date {
    return parse(dateString, formatStr, referenceDate);
  }

  /**
   * Parses an ISO 8601 date string
   * @param dateString ISO date string
   * @returns Parsed date
   */
  static parseISO(dateString: string): Date {
    return parseISO(dateString);
  }

  /**
   * Checks if a date is valid
   * @param date Date to check
   * @returns true if valid
   */
  static isValid(date: Date): boolean {
    return isValid(date);
  }

  /**
   * Gets current timestamp
   * @returns Current timestamp in milliseconds
   */
  static now(): number {
    return Date.now();
  }

  /**
   * Gets current date
   * @returns Current date
   */
  static today(): Date {
    return new Date();
  }

  /**
   * Adds days to a date
   * @param date Date to add to
   * @param days Number of days to add
   * @returns New date
   */
  static addDays(date: Date | number, days: number): Date {
    return addDays(date, days);
  }

  /**
   * Adds weeks to a date
   * @param date Date to add to
   * @param weeks Number of weeks to add
   * @returns New date
   */
  static addWeeks(date: Date | number, weeks: number): Date {
    return addWeeks(date, weeks);
  }

  /**
   * Adds months to a date
   * @param date Date to add to
   * @param months Number of months to add
   * @returns New date
   */
  static addMonths(date: Date | number, months: number): Date {
    return addMonths(date, months);
  }

  /**
   * Adds years to a date
   * @param date Date to add to
   * @param years Number of years to add
   * @returns New date
   */
  static addYears(date: Date | number, years: number): Date {
    return addYears(date, years);
  }

  /**
   * Subtracts days from a date
   * @param date Date to subtract from
   * @param days Number of days to subtract
   * @returns New date
   */
  static subDays(date: Date | number, days: number): Date {
    return subDays(date, days);
  }

  /**
   * Subtracts weeks from a date
   * @param date Date to subtract from
   * @param weeks Number of weeks to subtract
   * @returns New date
   */
  static subWeeks(date: Date | number, weeks: number): Date {
    return subWeeks(date, weeks);
  }

  /**
   * Subtracts months from a date
   * @param date Date to subtract from
   * @param months Number of months to subtract
   * @returns New date
   */
  static subMonths(date: Date | number, months: number): Date {
    return subMonths(date, months);
  }

  /**
   * Subtracts years from a date
   * @param date Date to subtract from
   * @param years Number of years to subtract
   * @returns New date
   */
  static subYears(date: Date | number, years: number): Date {
    return subYears(date, years);
  }

  /**
   * Gets the start of day (00:00:00)
   * @param date Date to process
   * @returns Start of day
   */
  static startOfDay(date: Date | number): Date {
    return startOfDay(date);
  }

  /**
   * Gets the end of day (23:59:59.999)
   * @param date Date to process
   * @returns End of day
   */
  static endOfDay(date: Date | number): Date {
    return endOfDay(date);
  }

  /**
   * Gets the start of week
   * @param date Date to process
   * @returns Start of week
   */
  static startOfWeek(date: Date | number): Date {
    return startOfWeek(date);
  }

  /**
   * Gets the end of week
   * @param date Date to process
   * @returns End of week
   */
  static endOfWeek(date: Date | number): Date {
    return endOfWeek(date);
  }

  /**
   * Gets the start of month
   * @param date Date to process
   * @returns Start of month
   */
  static startOfMonth(date: Date | number): Date {
    return startOfMonth(date);
  }

  /**
   * Gets the end of month
   * @param date Date to process
   * @returns End of month
   */
  static endOfMonth(date: Date | number): Date {
    return endOfMonth(date);
  }

  /**
   * Gets the start of year
   * @param date Date to process
   * @returns Start of year
   */
  static startOfYear(date: Date | number): Date {
    return startOfYear(date);
  }

  /**
   * Gets the end of year
   * @param date Date to process
   * @returns End of year
   */
  static endOfYear(date: Date | number): Date {
    return endOfYear(date);
  }

  /**
   * Calculates difference in days
   * @param dateLeft Later date
   * @param dateRight Earlier date
   * @returns Difference in days
   */
  static diffInDays(dateLeft: Date | number, dateRight: Date | number): number {
    return differenceInDays(dateLeft, dateRight);
  }

  /**
   * Calculates difference in hours
   * @param dateLeft Later date
   * @param dateRight Earlier date
   * @returns Difference in hours
   */
  static diffInHours(dateLeft: Date | number, dateRight: Date | number): number {
    return differenceInHours(dateLeft, dateRight);
  }

  /**
   * Calculates difference in minutes
   * @param dateLeft Later date
   * @param dateRight Earlier date
   * @returns Difference in minutes
   */
  static diffInMinutes(dateLeft: Date | number, dateRight: Date | number): number {
    return differenceInMinutes(dateLeft, dateRight);
  }

  /**
   * Calculates difference in seconds
   * @param dateLeft Later date
   * @param dateRight Earlier date
   * @returns Difference in seconds
   */
  static diffInSeconds(dateLeft: Date | number, dateRight: Date | number): number {
    return differenceInSeconds(dateLeft, dateRight);
  }

  /**
   * Checks if a date is before another
   * @param date Date to check
   * @param dateToCompare Date to compare with
   * @returns true if before
   */
  static isBefore(date: Date | number, dateToCompare: Date | number): boolean {
    return isBefore(date, dateToCompare);
  }

  /**
   * Checks if a date is after another
   * @param date Date to check
   * @param dateToCompare Date to compare with
   * @returns true if after
   */
  static isAfter(date: Date | number, dateToCompare: Date | number): boolean {
    return isAfter(date, dateToCompare);
  }

  /**
   * Checks if two dates are equal
   * @param dateLeft First date
   * @param dateRight Second date
   * @returns true if equal
   */
  static isEqual(dateLeft: Date | number, dateRight: Date | number): boolean {
    return isEqual(dateLeft, dateRight);
  }

  /**
   * Checks if a date is in the future
   * @param date Date to check
   * @returns true if in future
   */
  static isFuture(date: Date | number): boolean {
    return isFuture(date);
  }

  /**
   * Checks if a date is in the past
   * @param date Date to check
   * @returns true if in past
   */
  static isPast(date: Date | number): boolean {
    return isPast(date);
  }

  /**
   * Checks if a date is today
   * @param date Date to check
   * @returns true if today
   */
  static isToday(date: Date | number): boolean {
    return isToday(date);
  }

  /**
   * Checks if a date is yesterday
   * @param date Date to check
   * @returns true if yesterday
   */
  static isYesterday(date: Date | number): boolean {
    return isYesterday(date);
  }

  /**
   * Checks if a date is tomorrow
   * @param date Date to check
   * @returns true if tomorrow
   */
  static isTomorrow(date: Date | number): boolean {
    return isTomorrow(date);
  }

  /**
   * Checks if a date is a weekend
   * @param date Date to check
   * @returns true if weekend
   */
  static isWeekend(date: Date | number): boolean {
    return isWeekend(date);
  }

  /**
   * Checks if a date has expired
   * @param expiryDate Expiry date
   * @returns true if expired
   */
  static isExpired(expiryDate: Date | number): boolean {
    return isPast(expiryDate);
  }

  /**
   * Converts date to Unix timestamp (seconds)
   * @param date Date to convert
   * @returns Unix timestamp
   */
  static toUnixTimestamp(date: Date | number): number {
    return getUnixTime(date);
  }

  /**
   * Converts Unix timestamp to date
   * @param timestamp Unix timestamp (seconds)
   * @returns Date
   */
  static fromUnixTimestamp(timestamp: number): Date {
    return fromUnixTime(timestamp);
  }

  /**
   * Converts date to ISO 8601 string
   * @param date Date to convert
   * @returns ISO 8601 string
   */
  static toISOString(date: Date): string {
    return date.toISOString();
  }

  /**
   * Gets age from birth date
   * @param birthDate Birth date
   * @returns Age in years
   */
  static getAge(birthDate: Date | number): number {
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();

    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }

    return age;
  }

  /**
   * Gets relative time string (e.g., "2 hours ago")
   * @param date Date to convert
   * @returns Relative time string
   */
  static timeAgo(date: Date | number): string {
    const now = Date.now();
    const diff = now - new Date(date).getTime();
    const seconds = Math.floor(diff / 1000);

    if (seconds < 60) return 'just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)} minutes ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`;
    if (seconds < 2592000) return `${Math.floor(seconds / 86400)} days ago`;
    if (seconds < 31536000) return `${Math.floor(seconds / 2592000)} months ago`;
    return `${Math.floor(seconds / 31536000)} years ago`;
  }

  /**
   * Gets formatted date range
   * @param startDate Start date
   * @param endDate End date
   * @param formatStr Format string
   * @returns Formatted date range
   */
  static formatRange(
    startDate: Date | number,
    endDate: Date | number,
    formatStr: string = this.DEFAULT_FORMAT,
  ): string {
    return `${this.format(startDate, formatStr)} - ${this.format(endDate, formatStr)}`;
  }

  /**
   * Checks if date is within range
   * @param date Date to check
   * @param startDate Range start
   * @param endDate Range end
   * @returns true if within range
   */
  static isWithinRange(
    date: Date | number,
    startDate: Date | number,
    endDate: Date | number,
  ): boolean {
    return !isBefore(date, startDate) && !isAfter(date, endDate);
  }
}
