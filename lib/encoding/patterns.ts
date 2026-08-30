/** Mojibake signatures (UTF-8 misread as Latin-1). Unicode escapes only — no literal mojibake in source. */
export const MOJIBAKE_PATTERNS = [
  /\u00C3./,
  /\u00C4[\u2018\u2019']/,
  /\u00E1\u00BA/,
  /\u00E1\u00BB/,
  /Truy\u00E1\u00BB\u0087n/,
  /Kh\u00C3\u00A1m/,
  /S\u00C3\u00A1ng/,
  /C\u00C3\u00B3/,
  /Kh\u00C3\u00B4ng/,
  /\u00E2\u20AC[\u0153\u009D]/,
  /\u00E2\u0153/
] as const;

/** Known ?-loss corruption tokens from audit (not URL `?foo=` or TS ternary). */
export const VIETNAMESE_QMARK_CORRUPTION_PATTERNS = [
  /quy\?n/,
  /truy\?n/,
  /truy c\?p/,
  /thi\?u/,
  /\?nh bìa/,
  /\?nh /,
  /d\?c gi/,
  /B\?n /,
  /B\? sung/,
  /Ch\?n /,
  /nh\?p/,
  /ngu\?i/,
  /Không t\?i/,
  /t\?i du/,
  /c\?n /,
  /duy\?t/,
  /thu\?ng/,
  /Ki\?m/,
  /ti\?n/,
  /Ho\?t/,
  /T\?m /,
  /H\?n /,
  /ch\? /,
  /n\?i /,
  /b\?t/,
  /M\?t /,
  /G\?i /,
  /Vi\?t/,
  /Ph\?n/,
  /L\?ch/,
  /C\?p /,
  /Qu\?n/,
  /S\?a /,
  /T\?o /,
  /Ðã/,
  /Ðang/
] as const;

export const REPLACEMENT_CHAR = "\uFFFD";
