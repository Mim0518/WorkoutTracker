/**
 * Converts a Date to an input-friendly string (YYYY-MM-DD).
 * Useful for HTML date inputs.
 * @param date - The date to format.
 * @returns Date string in YYYY-MM-DD format.
 */
export function toInputDateString(date: Date): string {
    return date.toISOString().substring(0, 10);
}

/**
 * Converts a Date to an ISO date key (YYYY-MM-DD).
 * Useful for dictionary keys or grouping by date.
 * @param date - The date to format.
 * @returns Date string in YYYY-MM-DD format.
 */
export function toISODateKey(date: Date): string {
    return date.toISOString().split('T')[0];
}

/**
 * Gets the ISO week key (YYYY-Www) for a given date.
 * Useful for weekly grouping/streak calculations.
 * @param date - The date.
 * @returns Week key in YYYY-Www format.
 */
export function getWeekKey(date: Date): string {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
    return `${d.getUTCFullYear()}-W${weekNo}`;
}

/**
 * Parses a date string from an HTML date input (YYYY-MM-DD) into a Date object.
 * Creates the date in local timezone to avoid off-by-one errors.
 * @param dateString - The date string in YYYY-MM-DD format.
 * @returns A Date object in local timezone.
 */
export function parseInputDate(dateString: string): Date {
    const [year, month, day] = dateString.split('-').map(Number);
    return new Date(year, month - 1, day);
}
