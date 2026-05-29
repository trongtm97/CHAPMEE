/**
 * Danh sách pattern rule-based cho lọc tin nhắn (tiếng Việt + một số tiếng Anh phổ biến).
 * Không hiển thị ra UI — chỉ dùng server-side.
 */

export const PROFANITY_PATTERNS = [
  /\bđ[ịi]t\b/i,
  /\bđụ\b/i,
  /\bđéo\b/i,
  /\bđĩ\b/i,
  /\blồn\b/i,
  /\bcặc\b/i,
  /\bthằng\s*chó\b/i,
  /\bcon\s*đĩ\b/i,
  /\bđồ\s*chó\b/i,
  /\bvcl\b/i,
  /\bvl\b/i,
  /\bclgt\b/i,
  /\bfuck\b/i,
  /\bshit\b/i,
  /\bbitch\b/i
];

export const HARASSMENT_PATTERNS = [
  /\bđồ\s*ngu\b/i,
  /\bđồ\s*khốn\b/i,
  /\bđồ\s*rác\b/i,
  /\bthằng\s*ngu\b/i,
  /\bcon\s*điên\b/i,
  /\bđồ\s*óc\s*chó\b/i,
  /\bchết\s*đi\b/i,
  /\bgiết\s*mày\b/i,
  /\bđồ\s*thối\b/i,
  /\bthằng\s*khốn\b/i,
  /\bcon\s*khốn\b/i,
  /\bxúc\s*phạm\b/i,
  /\bđồ\s*đĩ\b/i
];

export const SEXUAL_HARASSMENT_PATTERNS = [
  /\bgửi\s*ảnh\s*nóng\b/i,
  /\bgửi\s*clip\s*nóng\b/i,
  /\bchat\s*sex\b/i,
  /\bsex\s*chat\b/i,
  /\bgạ\s*đụ\b/i,
  /\blàm\s*tình\b/i,
  /\bshow\s*hàng\b/i,
  /\bảnh\s*nóng\b/i,
  /\bgửi\s*ảnh\s*nhạy\b/i,
  /\bđòi\s*ảnh\b/i,
  /\bgạ\s*tình\b/i,
  /\blàm\s*tình\s*không\b/i
];

export const SCAM_PATTERNS = [
  /\bchuyển\s*khoản\b/i,
  /\bchuyển\s*tiền\b/i,
  /\bchuyển\s*tiền\s*riêng\b/i,
  /\bmua\s*coin\s*ngoài\b/i,
  /\bcoin\s*ngoài\s*app\b/i,
  /\bnạp\s*coin\s*hộ\b/i,
  /\badmin\s*hỗ\s*trợ\s*riêng\b/i,
  /\badmin\s*fake\b/i,
  /\bgiả\s*mạo\s*admin\b/i,
  /\blừa\s*đảo\b/i,
  /\bscam\b/i,
  /\bmomo\s*riêng\b/i,
  /\bngân\s*hàng\s*riêng\b/i,
  /\bthanh\s*toán\s*ngoài\b/i,
  /\bgiao\s*dịch\s*ngoài\b/i,
  /\bgửi\s*mã\s*otp\b/i,
  /\botp\b/i,
  /\bgửi\s*mật\s*khẩu\b/i,
  /\bđầu\s*tư\s*lãi\s*cao\b/i,
  /\bnhận\s*thưởng\s*cần\s*phí\b/i,
  /\bphí\s*nhận\s*thưởng\b/i,
  /\bhoàn\s*tiền\s*ảo\b/i
];

export const EXTERNAL_CONTACT_PATTERNS = [
  /\binbox\s*zalo\b/i,
  /\bqua\s*zalo\b/i,
  /\bqua\s*telegram\b/i,
  /\btelegram\b/i,
  /\bt\.me\b/i,
  /\bfacebook\s*group\b/i,
  /\bfb\s*group\b/i,
  /\badd\s*zalo\b/i,
  /\bsố\s*zalo\b/i,
  /\bliên\s*hệ\s*zalo\b/i,
  /\bnhắn\s*zalo\b/i,
  /\bwhatsapp\b/i,
  /\binbox\s*facebook\b/i,
  /\bgọi\s*số\s*này\b/i,
  /\bnhắn\s*số\s*điện\s*thoại\b/i,
  /\bliên\s*hệ\s*ngoài\s*app\b/i,
  /\b0\d{8,10}\b/,
  /\b\+84\d{8,10}\b/
];

export const SPAM_PATTERNS = [
  /\bmua\s*bán\s*ngoài\s*app\b/i,
  /\bquảng\s*cáo\b/i,
  /\bclick\s*link\b/i,
  /\bkiếm\s*tiền\s*nhanh\b/i
];

export const LINK_PATTERNS = [
  /\bhttps?:\/\//i,
  /\bwww\./i,
  /\bt\.me\b/i,
  /\btelegram\.me\b/i,
  /\btelegram\b/i,
  /\bzalo\.me\b/i,
  /\bzalo\b/i,
  /\bbit\.ly\b/i,
  /\btinyurl\b/i,
  /\bgoo\.gl\b/i,
  /\bfb\.com\b/i,
  /\bfacebook\.com\b/i,
  /\blinktr\.ee\b/i,
  /\bshorturl\b/i
];

export const RISKY_LINK_DOMAINS = [
  "t.me",
  "telegram.me",
  "zalo.me",
  "bit.ly",
  "tinyurl.com",
  "goo.gl",
  "fb.com",
  "facebook.com",
  "linktr.ee"
];

export const SELF_HARM_PATTERNS = [
  /\btự\s*tử\b/i,
  /\btự\s*sát\b/i,
  /\bgiết\s*chết\b/i,
  /\bmuốn\s*chết\b/i
];

export type KeywordRuleGroup = {
  id: string;
  patterns: RegExp[];
  severity: "warning" | "blocked" | "review";
};

export const KEYWORD_RULE_GROUPS: KeywordRuleGroup[] = [
  { id: "profanity", patterns: PROFANITY_PATTERNS, severity: "blocked" },
  { id: "harassment", patterns: HARASSMENT_PATTERNS, severity: "warning" },
  {
    id: "sexual_harassment",
    patterns: SEXUAL_HARASSMENT_PATTERNS,
    severity: "blocked"
  },
  { id: "scam", patterns: SCAM_PATTERNS, severity: "blocked" },
  {
    id: "external_contact",
    patterns: EXTERNAL_CONTACT_PATTERNS,
    severity: "warning"
  },
  { id: "spam", patterns: SPAM_PATTERNS, severity: "warning" },
  {
    id: "self_harm_or_violence",
    patterns: SELF_HARM_PATTERNS,
    severity: "review"
  }
];
