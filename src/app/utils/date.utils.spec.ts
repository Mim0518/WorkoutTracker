import { describe, it, expect } from 'vitest';
import {
    toInputDateString,
    toISODateKey,
    getWeekKey,
    parseInputDate
} from './date.utils';

describe('Date Utils', () => {
    describe('toInputDateString', () => {
        it('should format date as YYYY-MM-DD', () => {
            const date = new Date('2026-02-07T12:00:00Z');
            expect(toInputDateString(date)).toBe('2026-02-07');
        });

        it('should pad single digit months and days', () => {
            const date = new Date('2026-01-05T00:00:00Z');
            expect(toInputDateString(date)).toBe('2026-01-05');
        });
    });

    describe('toISODateKey', () => {
        it('should return date portion of ISO string', () => {
            const date = new Date('2026-12-25T18:30:00Z');
            expect(toISODateKey(date)).toBe('2026-12-25');
        });
    });

    describe('getWeekKey', () => {
        it('should return week key in YYYY-Www format', () => {
            const date = new Date('2026-02-07');
            const key = getWeekKey(date);
            expect(key).toMatch(/^\d{4}-W\d+$/);
        });

        it('should return consistent keys for the same date', () => {
            const date = new Date('2026-02-07');
            expect(getWeekKey(date)).toBe(getWeekKey(date));
        });
    });

    describe('parseInputDate', () => {
        it('should parse YYYY-MM-DD string to local Date', () => {
            const result = parseInputDate('2026-02-07');
            expect(result.getFullYear()).toBe(2026);
            expect(result.getMonth()).toBe(1); // 0-indexed
            expect(result.getDate()).toBe(7);
        });
    });
});
