export const HONG_KONG_TIME_ZONE = "Asia/Hong_Kong";
const HONG_KONG_OFFSET_HOURS = 8;
const HONG_KONG_OFFSET_MS = HONG_KONG_OFFSET_HOURS * 60 * 60 * 1000;
const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1000;
function asDate(input) {
    return input instanceof Date ? new Date(input.getTime()) : new Date(input);
}
function shiftUtcDateToHongKong(date) {
    return new Date(date.getTime() + HONG_KONG_OFFSET_MS);
}
function createUtcDateFromHongKongParts(year, month, day, hour = 0, minute = 0, second = 0, millisecond = 0) {
    return new Date(Date.UTC(year, month - 1, day, hour - HONG_KONG_OFFSET_HOURS, minute, second, millisecond));
}
function getDateKey(year, month, day) {
    const paddedMonth = `${month}`.padStart(2, "0");
    const paddedDay = `${day}`.padStart(2, "0");
    return `${year}-${paddedMonth}-${paddedDay}`;
}
function getDayEnd(start) {
    return new Date(start.getTime() + MILLISECONDS_PER_DAY - 1);
}
export function toHongKongDateParts(input) {
    const shiftedDate = shiftUtcDateToHongKong(asDate(input));
    const year = shiftedDate.getUTCFullYear();
    const month = shiftedDate.getUTCMonth() + 1;
    const day = shiftedDate.getUTCDate();
    return {
        year,
        month,
        day,
        dayOfWeek: shiftedDate.getUTCDay(),
        dateKey: getDateKey(year, month, day),
    };
}
export function getHongKongDayBounds(input) {
    const { year, month, day } = toHongKongDateParts(input);
    const start = createUtcDateFromHongKongParts(year, month, day);
    return {
        start,
        end: getDayEnd(start),
    };
}
export function getHongKongWeekBounds(input) {
    const dayBounds = getHongKongDayBounds(input);
    const { dayOfWeek } = toHongKongDateParts(input);
    const daysFromMonday = (dayOfWeek + 6) % 7;
    const start = new Date(dayBounds.start.getTime() - daysFromMonday * MILLISECONDS_PER_DAY);
    return {
        start,
        end: new Date(start.getTime() + 7 * MILLISECONDS_PER_DAY - 1),
    };
}
export function getHongKongMonthBounds(input) {
    const { year, month } = toHongKongDateParts(input);
    const start = createUtcDateFromHongKongParts(year, month, 1);
    const nextMonthStart = month === 12
        ? createUtcDateFromHongKongParts(year + 1, 1, 1)
        : createUtcDateFromHongKongParts(year, month + 1, 1);
    return {
        start,
        end: new Date(nextMonthStart.getTime() - 1),
    };
}
export function formatHongKongDateKey(input) {
    return toHongKongDateParts(input).dateKey;
}
