const DAY_MS = 24 * 60 * 60 * 1000;
const ISO_DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

export const MAX_ANALYTICS_RANGE_DAYS = 730;

export type AnalyticsRangePresetKey = "30d" | "90d" | "6m" | "12m";

export interface AnalyticsRangePreset {
  key: AnalyticsRangePresetKey;
  label: string;
  from: string;
  to: string;
}

export interface ClampedAnalyticsRange {
  requestedFrom: string;
  requestedTo: string;
  from: string;
  to: string;
  clamped: boolean;
}

const parseIsoDate = (value: string) => {
  if (!ISO_DATE_REGEX.test(value)) {
    return null;
  }

  const [yearRaw, monthRaw, dayRaw] = value.split("-");
  const year = Number(yearRaw);
  const month = Number(monthRaw);
  const day = Number(dayRaw);
  const parsed = new Date(Date.UTC(year, month - 1, day));

  if (
    Number.isNaN(parsed.getTime()) ||
    parsed.getUTCFullYear() !== year ||
    parsed.getUTCMonth() !== month - 1 ||
    parsed.getUTCDate() !== day
  ) {
    return null;
  }

  return parsed;
};

const shiftUtcDays = (date: Date, days: number) => {
  return new Date(date.getTime() + days * DAY_MS);
};

const shiftUtcMonths = (date: Date, months: number) => {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + months, date.getUTCDate()));
};

export const toIsoDate = (date: Date) => {
  return date.toISOString().slice(0, 10);
};

export const isIsoDate = (value: string | undefined): value is string => {
  return typeof value === "string" && parseIsoDate(value) !== null;
};

export const buildAnalyticsRangePresets = (baseToValue: string): AnalyticsRangePreset[] => {
  const baseTo = parseIsoDate(baseToValue) ?? new Date();
  const normalizedTo = new Date(
    Date.UTC(baseTo.getUTCFullYear(), baseTo.getUTCMonth(), baseTo.getUTCDate())
  );
  const to = toIsoDate(normalizedTo);

  return [
    {
      key: "30d",
      label: "30d",
      from: toIsoDate(shiftUtcDays(normalizedTo, -29)),
      to,
    },
    {
      key: "90d",
      label: "90d",
      from: toIsoDate(shiftUtcDays(normalizedTo, -89)),
      to,
    },
    {
      key: "6m",
      label: "6m",
      from: toIsoDate(shiftUtcMonths(normalizedTo, -6)),
      to,
    },
    {
      key: "12m",
      label: "12m",
      from: toIsoDate(shiftUtcMonths(normalizedTo, -12)),
      to,
    },
  ];
};

export const clampAnalyticsRange = (input: { from: string; to: string }): ClampedAnalyticsRange => {
  const requestedFrom = input.from;
  const requestedTo = input.to;
  const fromDate = parseIsoDate(input.from);
  const toDate = parseIsoDate(input.to);

  if (!fromDate || !toDate) {
    return {
      requestedFrom,
      requestedTo,
      from: input.from,
      to: input.to,
      clamped: false,
    };
  }

  const days = Math.floor((toDate.getTime() - fromDate.getTime()) / DAY_MS);

  if (days <= MAX_ANALYTICS_RANGE_DAYS) {
    return {
      requestedFrom,
      requestedTo,
      from: input.from,
      to: input.to,
      clamped: false,
    };
  }

  const clampedFrom = shiftUtcDays(toDate, -MAX_ANALYTICS_RANGE_DAYS);

  return {
    requestedFrom,
    requestedTo,
    from: toIsoDate(clampedFrom),
    to: input.to,
    clamped: true,
  };
};
