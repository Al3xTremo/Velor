const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const isUuid = (value: string) => UUID_RE.test(value);

export const sanitizeSearchText = (value: string) => {
  return value
    .replace(/[\u0000-\u001F\u007F]/g, " ")
    .replace(/[(),]/g, " ")
    .replace(/[%_]/g, " ")
    .trim()
    .slice(0, 120);
};
