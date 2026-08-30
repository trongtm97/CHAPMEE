export function getFilmRelationLabel(relationType: string | null | undefined): string {
  switch (relationType) {
    case "based_on_story":
      return "Dựa trên truyện";
    case "inspired_by_story":
      return "Lấy cảm hứng từ truyện";
    case "official_adaptation":
      return "Chuyển thể chính thức";
    case "fan_adaptation":
      return "Fan adaptation";
    case "trailer":
      return "Trailer";
    case "short_film":
      return "Phim ngắn";
    case "animation":
      return "Hoạt hình";
    case "cinematic_scene":
      return "Cảnh điện ảnh";
    default:
      return "Dựa trên truyện";
  }
}

export function getFilmStatusLabel(status: string | null | undefined): string {
  switch (status) {
    case "draft":
      return "Bản nháp";
    case "pending_review":
      return "Chờ duyệt";
    case "published":
      return "Đã xuất bản";
    case "hidden":
      return "Đã ẩn";
    case "rejected":
      return "Bị từ chối";
    case "copyright_disputed":
      return "Tranh chấp bản quyền";
    case "unavailable":
      return "Không khả dụng";
    default:
      return "Không xác định";
  }
}
