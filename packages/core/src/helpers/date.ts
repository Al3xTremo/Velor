const monthFormatter = new Intl.DateTimeFormat("en-US", {
  year: "numeric",
  month: "short",
});

export const toMonthKey = (isoDate: string) => {
  const date = new Date(isoDate);
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
};

export const toMonthLabel = (monthKey: string) => {
  const [yearRaw, monthRaw] = monthKey.split("-");
  const year = Number(yearRaw);
  const month = Number(monthRaw);

  if (!Number.isFinite(year) || !Number.isFinite(month) || month < 1 || month > 12) {
    return monthKey;
  }

  return monthFormatter.format(new Date(Date.UTC(year, month - 1, 1)));
};

export const compareMonthKeys = (a: string, b: string) => {
  return a.localeCompare(b);
};
