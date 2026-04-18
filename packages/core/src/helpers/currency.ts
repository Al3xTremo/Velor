import type { CurrencyCode } from "../types/common";

export const roundToCurrency = (value: number) => {
  return Math.round((value + Number.EPSILON) * 100) / 100;
};

export const formatCurrency = (value: number, currency: CurrencyCode, locale = "en-US") => {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
  }).format(value);
};
