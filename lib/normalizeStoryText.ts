/**
 * Chuẩn hoá định dạng văn bản truyện.
 *
 * KHÔNG thay đổi nội dung/câu chữ — chỉ sửa khoảng trắng, xuống dòng,
 * và khoảng cách dấu câu để văn bản sạch hơn khi hiển thị.
 *
 * An toàn với: số thập phân (3.14), URL, email, dấu ngoặc kép, hội thoại.
 */

export function normalizeStoryText(input: string): string {
  if (!input) return input;

  let text = input;

  // ── 1. Thống nhất xuống dòng ──────────────────────────────────
  //   \r\n → \n,   \r → \n
  text = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");

  // ── 2. Trim toàn bộ văn bản ───────────────────────────────────
  text = text.trim();

  // ── 3. Trim từng dòng ─────────────────────────────────────────
  //   Xoá khoảng trắng đầu/cuối mỗi dòng, giữ nguyên cấu trúc dòng
  text = text
    .split("\n")
    .map((line) => line.trim())
    .join("\n");

  // ── 4. Tab → 1 khoảng trắng ──────────────────────────────────
  text = text.replace(/\t/g, " ");

  // ── 5. Nhiều khoảng trắng liên tiếp → 1 ──────────────────────
  text = text.replace(/ {2,}/g, " ");

  // ── 6. Giới hạn tối đa 2 xuống dòng liên tiếp ────────────────
  //   \n\n\n → \n\n,  \n\n\n\n\n → \n\n
  text = text.replace(/\n{3,}/g, "\n\n");

  // ── 7. Xoá khoảng trắng THỪA trước dấu câu ──────────────────
  //   "xin chào , anh" → "xin chào, anh"
  //   Giữ nguyên nếu đó là bullet/danh sách (dấu • hoặc - ở đầu dòng)
  text = text.replace(/([^\n])\s+([.,!?;:\u2026])/g, "$1$2");

  // ── 8. Thêm 1 khoảng trắng SAU dấu câu nếu thiếu ────────────
  //   "Xin chào,anh" → "Xin chào, anh"
  //   "Anh đi đâu?Tôi hỏi" → "Anh đi đâu? Tôi hỏi"
  //   KHÔNG thêm sau dấu chấm cuối câu nếu tiếp bằng xuống dòng
  //   KHÔNG thêm sau dấu chấm trong số thập phân (3.14) — regex chỉ match [A-Za-zÀ-ỹ0-9]
  text = text.replace(
    /([.,!?;:])([A-Za-zÀ-ỹ0-9])/g,
    (match, punct, nextChar) => {
      // Nếu punct là "." và trước đó là chữ số → có thể là số thập phân, bỏ qua
      if (punct === ".") {
        const beforeDot = text.slice(0, text.indexOf(match));
        if (/\d$/.test(beforeDot) && /^\d/.test(nextChar)) {
          return match;
        }
      }
      return `${punct} ${nextChar}`;
    }
  );

  // ── 9. Dọn khoảng trắng thừa cuối dòng (sau khi thêm space) ─
  text = text
    .split("\n")
    .map((line) => line.trimEnd())
    .join("\n");

  // ── 10. Trim lần cuối ─────────────────────────────────────────
  text = text.trim();

  return text;
}
