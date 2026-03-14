import {
  getHongKongDayBounds,
  getHongKongMonthBounds,
  getHongKongWeekBounds,
  toHongKongDateParts,
} from "./hong-kong";

type HongKongBoundaryExpectation = {
  label: string;
  input: string;
  expectedDateKey: string;
  expectedDayStart: string;
  expectedDayEnd: string;
  expectedWeekStart: string;
  expectedWeekEnd: string;
  expectedMonthStart: string;
  expectedMonthEnd: string;
};

const BOUNDARY_EXPECTATIONS: HongKongBoundaryExpectation[] = [
  {
    label: "utc timestamp just before HKT midnight stays in same local day",
    input: "2026-03-13T15:59:59.000Z",
    expectedDateKey: "2026-03-13",
    expectedDayStart: "2026-03-12T16:00:00.000Z",
    expectedDayEnd: "2026-03-13T15:59:59.999Z",
    expectedWeekStart: "2026-03-08T16:00:00.000Z",
    expectedWeekEnd: "2026-03-15T15:59:59.999Z",
    expectedMonthStart: "2026-02-28T16:00:00.000Z",
    expectedMonthEnd: "2026-03-31T15:59:59.999Z",
  },
  {
    label: "utc timestamp at HKT midnight rolls into next local day",
    input: "2026-03-13T16:00:00.000Z",
    expectedDateKey: "2026-03-14",
    expectedDayStart: "2026-03-13T16:00:00.000Z",
    expectedDayEnd: "2026-03-14T15:59:59.999Z",
    expectedWeekStart: "2026-03-08T16:00:00.000Z",
    expectedWeekEnd: "2026-03-15T15:59:59.999Z",
    expectedMonthStart: "2026-02-28T16:00:00.000Z",
    expectedMonthEnd: "2026-03-31T15:59:59.999Z",
  },
  {
    label: "month rollover uses HKT, not UTC month",
    input: "2026-03-31T16:30:00.000Z",
    expectedDateKey: "2026-04-01",
    expectedDayStart: "2026-03-31T16:00:00.000Z",
    expectedDayEnd: "2026-04-01T15:59:59.999Z",
    expectedWeekStart: "2026-03-29T16:00:00.000Z",
    expectedWeekEnd: "2026-04-05T15:59:59.999Z",
    expectedMonthStart: "2026-03-31T16:00:00.000Z",
    expectedMonthEnd: "2026-04-30T15:59:59.999Z",
  },
];

function assertEqual(label: string, actual: string, expected: string) {
  if (actual !== expected) {
    throw new Error(`${label}: expected ${expected}, received ${actual}`);
  }
}

export function verifyHongKongBoundaryExpectations() {
  return BOUNDARY_EXPECTATIONS.map((expectation) => {
    const input = new Date(expectation.input);
    const dateParts = toHongKongDateParts(input);
    const dayBounds = getHongKongDayBounds(input);
    const weekBounds = getHongKongWeekBounds(input);
    const monthBounds = getHongKongMonthBounds(input);

    assertEqual(
      `${expectation.label} date key`,
      dateParts.dateKey,
      expectation.expectedDateKey,
    );
    assertEqual(
      `${expectation.label} day start`,
      dayBounds.start.toISOString(),
      expectation.expectedDayStart,
    );
    assertEqual(
      `${expectation.label} day end`,
      dayBounds.end.toISOString(),
      expectation.expectedDayEnd,
    );
    assertEqual(
      `${expectation.label} week start`,
      weekBounds.start.toISOString(),
      expectation.expectedWeekStart,
    );
    assertEqual(
      `${expectation.label} week end`,
      weekBounds.end.toISOString(),
      expectation.expectedWeekEnd,
    );
    assertEqual(
      `${expectation.label} month start`,
      monthBounds.start.toISOString(),
      expectation.expectedMonthStart,
    );
    assertEqual(
      `${expectation.label} month end`,
      monthBounds.end.toISOString(),
      expectation.expectedMonthEnd,
    );

    return {
      label: expectation.label,
      dateKey: dateParts.dateKey,
      dayStart: dayBounds.start.toISOString(),
      weekStart: weekBounds.start.toISOString(),
      monthStart: monthBounds.start.toISOString(),
    };
  });
}

if (require.main === module) {
  console.log(JSON.stringify(verifyHongKongBoundaryExpectations(), null, 2));
}
