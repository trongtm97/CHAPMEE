const DANGEROUS_PATTERNS = [
  /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
  /<iframe\b[^>]*>.*?<\/iframe>/gi,
  /javascript:/gi,
  /on\w+\s*=/gi,
  /<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi
];

/** Làm sạch plain text / markdown nhẹ trước khi lưu hoặc preview. */
export function sanitizePlainContent(value: string) {
  let output = value.replace(/\r\n/g, "\n");

  for (const pattern of DANGEROUS_PATTERNS) {
    output = output.replace(pattern, "");
  }

  return output;
}

/** Chuẩn bị HTML an toàn khi nâng cấp rich text sau này. */
export function sanitizeHtmlContent(html: string) {
  let output = html;

  for (const pattern of DANGEROUS_PATTERNS) {
    output = output.replace(pattern, "");
  }

  return output;
}
