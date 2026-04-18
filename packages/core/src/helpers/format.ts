export const formatPercentage = (value: number, decimals = 2) => {
  return `${value.toFixed(decimals)}%`;
};

export const clamp = (value: number, min: number, max: number) => {
  return Math.min(Math.max(value, min), max);
};
