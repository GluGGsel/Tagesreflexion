export function normalizeText(s: string): string {
  return (s ?? "").replace(/\r\n/g, "\n").trim();
}

export function validateRequired4(fields: {
  general_1: string;
  general_2: string;
  partner_specific: string;
  children_gratitude: string;
}): boolean {
  return (
    normalizeText(fields.general_1).length > 0 &&
    normalizeText(fields.general_2).length > 0 &&
    normalizeText(fields.partner_specific).length > 0 &&
    normalizeText(fields.children_gratitude).length > 0
  );
}
