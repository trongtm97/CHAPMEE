import Link from "next/link";
import { Card } from "@/components/ui";

type StudioQuickActionsProps = {
  basePath?: string;
};

const actions = [
  {
    description: "Bắt đầu một truyện mới từ bản nháp.",
    path: "stories/new",
    label: "Tạo truyện mới"
  },
  {
    description: "Mở luồng viết chap cho truyện đang có.",
    path: "stories",
    label: "Viết chap mới"
  },
  {
    description: "Rà soát truyện, chap và trạng thái hiện tại.",
    path: "stories",
    label: "Xem truyện của tôi"
  },
  {
    description: "Theo dõi tín hiệu đọc và phản hồi.",
    path: "analytics",
    label: "Xem analytics"
  }
] as const;

export function StudioQuickActions({
  basePath = "/studio"
}: StudioQuickActionsProps) {
  return (
    <div className="grid gap-3 lg:grid-cols-2 2xl:grid-cols-4">
      {actions.map((action) => (
        <Link href={`${basePath}/${action.path}`} key={action.label}>
          <Card className="h-full transition hover:border-sky-300/40 hover:bg-white/[0.04]">
            <p className="text-base font-semibold text-white">{action.label}</p>
            <p className="mt-1 text-sm leading-6 text-zinc-400">
              {action.description}
            </p>
          </Card>
        </Link>
      ))}
    </div>
  );
}
