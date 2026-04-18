export type CurrencyCode = "EUR" | "USD";

export interface Money {
  amount: number;
  currency: CurrencyCode;
}

export interface TimeSeriesPoint {
  label: string;
  value: number;
}
