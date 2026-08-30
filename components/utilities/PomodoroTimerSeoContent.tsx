import Link from "next/link";

export function PomodoroTimerSeoContent() {
  return (
    <section
      aria-labelledby="pomodoro-timer-seo"
      className="mt-6 space-y-4 border-t border-white/10 pt-6 text-sm leading-relaxed text-zinc-400"
    >
      <h2 className="text-base font-bold text-zinc-100" id="pomodoro-timer-seo">
        Pomodoro Timer trên ChapMee
      </h2>
      <p>
        ChapMee cung cấp công cụ <strong className="font-semibold text-zinc-200">Pomodoro Timer</strong> miễn phí,
        chạy hoàn toàn trên trình duyệt — không gửi dữ liệu lên server. Bạn có thể tập trung làm việc theo chu kỳ
        Pomodoro cổ điển (25 phút tập trung, 5 phút nghỉ ngắn, 15 phút nghỉ dài) hoặc tùy chỉnh thời gian theo thói
        quen của mình.
      </p>
      <p>
        Công cụ phù hợp cho người làm việc văn phòng, học sinh sinh viên, lập trình viên, người viết content và bất
        kỳ ai cần quản lý thời gian tập trung hiệu quả hơn.
      </p>
      <h3 className="text-sm font-bold text-zinc-200">Cách dùng nhanh</h3>
      <ol className="list-decimal space-y-1.5 pl-5">
        <li>Chọn chế độ Tập trung, Nghỉ ngắn hoặc Nghỉ dài.</li>
        <li>Bấm &ldquo;Bắt đầu&rdquo; để bắt đầu đếm ngược.</li>
        <li>Sau mỗi phiên tập trung, nghỉ ngắn; sau 4 phiên thì nghỉ dài.</li>
        <li>Tùy chỉnh thời gian hoặc chọn preset nhanh phù hợp với bạn.</li>
      </ol>
      <p>
        Tiện ích nằm trong mục{" "}
        <Link className="font-semibold text-cyan-200 hover:text-cyan-100" href="/tien-ich">
          Tiện ích ChapMee
        </Link>
        . Bạn cũng có thể vào từ{" "}
        <Link className="font-semibold text-cyan-200 hover:text-cyan-100" href="/discover">
          Khám phá
        </Link>
        .
      </p>
    </section>
  );
}
