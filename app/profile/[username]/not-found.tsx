import { EmptyState } from "@/components/ui";

export default function PublicProfileNotFound() {
  return (
    <div className="py-16">
      <EmptyState
        description="Kiểm tra lại tên người dùng hoặc quay về trang chủ."
        title="Không tìm thấy người dùng."
      />
    </div>
  );
}
