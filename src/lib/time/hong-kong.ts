export const HONG_KONG_TIME_ZONE = "Asia/Hong_Kong";

const HONG_KONG_OFFSET_HOURS = 8;
const HONG_KONG_OFFSET_MS = HONG_KONG_OFFSET_HOURS * 60 * 60 * 1000;
const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1000;

export type HongKongDateParts = {
  year: number;
  month: number;
  day: number;
  dayOfWeek: number;
  dateKey: string;
};

export type HongKongBounds = {
  start: Date;
  end: Date;
};

function asDate(input: Date | string | number) {
  return input instanceof Date ? new Date(input.getTime()) : new Date(input);
}

function shiftUtcDateToHongKong(date: Date) {
  return new Date(date.getTime() + HONG_KONG_OFFSET_MS);
}

function createUtcDateFromHongKongParts(
  year: number,
  month: number,
  day: number,
  hour = 0,
  minute = 0,
  second = 0,
  millisecond = 0,
) {
  return new Date(
    Date.UTC(
      year,
      month - 1,
      day,
      hour - HONG_KONG_OFFSET_HOURS,
      minute,
      second,
      millisecond,
    ),
  );
}

function getDateKey(year: number, month: number, day: number) {
  const paddedMonth = `${month}`.padStart(2, "0");
  const paddedDay = `${day}`.padStart(2, "0");

  return `${year}-${paddedMonth}-${paddedDay}`;
}

function getDayEnd(start: Date) {
  return new Date(start.getTime() + MILLISECONDS_PER_DAY - 1);
}

export function toHongKongDateParts(input: Date | string | number): HongKongDateParts {
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

export function getHongKongDayBounds(input: Date | string | number): HongKongBounds {
  const { year, month, day } = toHongKongDateParts(input);
  const start = createUtcDateFromHongKongParts(year, month, day);

  return {
    start,
    end: getDayEnd(start),
  };
}

export function getHongKongWeekBounds(input: Date | string | number): HongKongBounds {
  const dayBounds = getHongKongDayBounds(input);
  const { dayOfWeek } = toHongKongDateParts(input);
  const daysFromMonday = (dayOfWeek + 6) % 7;
  const start = new Date(dayBounds.start.getTime() - daysFromMonday * MILLISECONDS_PER_DAY);

  return {
    start,
    end: new Date(start.getTime() + 7 * MILLISECONDS_PER_DAY - 1),
  };
}

export function getHongKongMonthBounds(input: Date | string | number): HongKongBounds {
  const { year, month } = toHongKongDateParts(input);
  const start = createUtcDateFromHongKongParts(year, month, 1);
  const nextMonthStart =
    month === 12
      ? createUtcDateFromHongKongParts(year + 1, 1, 1)
      : createUtcDateFromHongKongParts(year, month + 1, 1);

  return {
    start,
    end: new Date(nextMonthStart.getTime() - 1),
  };
}

export function formatHongKongDateKey(input: Date | string | number) {
  return toHongKongDateParts(input).dateKey;
}

