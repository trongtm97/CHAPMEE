export const VERIFICATION_STORAGE_BUCKET = "creator-verification-documents" as const;

export const VERIFICATION_FILE_LIMITS = {
  maxBytesPerFile: 10 * 1024 * 1024,
  maxFilesPerRequest: 12,
  maxTotalBytesPerRequest: 40 * 1024 * 1024
} as const;

export const VERIFICATION_ALLOWED_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp", ".pdf"] as const;

export const VERIFICATION_IMAGE_ONLY_DOCUMENT_TYPES = [
  "identity_front",
  "identity_back",
  "identity_holding",
  "representative_identity_front",
  "representative_identity_back",
  "representative_identity_holding"
] as const;

export const VERIFICATION_IMAGE_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;

export const VERIFICATION_ALLOWED_MIME_TYPES = [
  ...VERIFICATION_IMAGE_MIME_TYPES,
  "application/pdf"
] as const;

export type VerificationDocumentDefinition = {
  id: string;
  label: string;
  description: string;
  required: boolean;
  /** Nhóm hiển thị trong UI, ví dụ identity */
  group?: string;
};

/** CCCD và giấy phép lái xe — mỗi loại giấy tờ cần bộ 3 ảnh (mặt trước, mặt sau, cầm giấy). */
export const IDENTITY_DOCUMENT_TYPES_NOTE =
  "Áp dụng cho Căn cước công dân (CCCD) hoặc Giấy phép lái xe. Mỗi giấy tờ gồm 3 ảnh: mặt trước, mặt sau, và ảnh bạn đang cầm giấy thấy rõ số.";

export const IDENTITY_DOCUMENT_SLOTS: VerificationDocumentDefinition[] = [
  {
    description: "Chụp rõ toàn bộ mặt trước CCCD hoặc giấy phép lái xe, không bị che, không lóa.",
    group: "identity",
    id: "identity_front",
    label: "Ảnh mặt trước giấy tờ",
    required: false
  },
  {
    description: "Chụp rõ toàn bộ mặt sau, thấy đủ thông tin và mã nếu có.",
    group: "identity",
    id: "identity_back",
    label: "Ảnh mặt sau giấy tờ",
    required: false
  },
  {
    description:
      "Ảnh bạn đang cầm giấy tờ cạnh mặt, thấy rõ số định danh trên giấy và khuôn mặt của bạn.",
    group: "identity",
    id: "identity_holding",
    label: "Ảnh cầm giấy tờ (thấy rõ số)",
    required: false
  }
];

export const STUDIO_VERIFICATION_TYPES = [
  "official_creator",
  "payout_individual",
  "organization_brand",
  "ip_owner",
  "appeal_reverification"
] as const;

export type StudioVerificationType = (typeof STUDIO_VERIFICATION_TYPES)[number];

export type StudioVerificationTypeConfig = {
  id: StudioVerificationType;
  label: string;
  description: string;
  purpose: string;
  documents: VerificationDocumentDefinition[];
};

export const STUDIO_VERIFICATION_TYPE_CONFIG: Record<
  StudioVerificationType,
  StudioVerificationTypeConfig
> = {
  official_creator: {
    description: "Xin tick xanh và tăng độ tin cậy hồ sơ tác giả trên ChapMee.",
    documents: [
      {
        description: "Ảnh chân dung hoặc ảnh đại diện rõ mặt/logo, upload trực tiếp từ thiết bị.",
        id: "portrait_photo",
        label: "Ảnh chân dung / đại diện rõ ràng",
        required: false
      },
      {
        description:
          "Ảnh bản thảo, ảnh màn hình trang quản lý tác phẩm trong Studio, hoặc file mô tả quá trình sáng tác.",
        id: "ownership_proof",
        label: "Chứng minh bạn là chủ thể hồ sơ/tác phẩm",
        required: false
      },
      {
        description: "File bổ sung nếu cần.",
        id: "extra_supporting",
        label: "Tài liệu bổ sung",
        required: false
      }
    ],
    id: "official_creator",
    label: "Tác giả chính thức",
    purpose: "Tick xanh và độ tin cậy hồ sơ tác giả"
  },
  payout_individual: {
    description: `Tăng độ tin cậy hồ sơ (không bắt buộc để kiếm tiền/rút tiền). Giấy tờ chỉ dùng để admin ChapMee xét duyệt, không hiển thị công khai. ${IDENTITY_DOCUMENT_TYPES_NOTE}`,
    documents: [
      ...IDENTITY_DOCUMENT_SLOTS,
      {
        description:
          "Ảnh xác nhận chủ tài khoản nhận tiền hoặc thông tin đối soát nội bộ nếu bạn đã thiết lập trong Studio.",
        id: "payout_confirmation",
        label: "Xác nhận tài khoản nhận tiền",
        required: false
      },
      {
        description: "File bổ sung nếu cần.",
        id: "extra_supporting",
        label: "Tài liệu bổ sung",
        required: false
      }
    ],
    id: "payout_individual",
    label: "Cá nhân nhận tiền",
    purpose: "Điều kiện rút tiền/kiếm tiền"
  },
  organization_brand: {
    description: "Xác thực tài khoản đại diện tổ chức, nhóm sáng tác, thương hiệu hoặc studio.",
    documents: [
      {
        description: "Giấy đăng ký kinh doanh hoặc tài liệu tổ chức (nếu có).",
        id: "organization_registration",
        label: "Tài liệu tổ chức",
        required: false
      },
      {
        description: "Giấy ủy quyền hoặc tài liệu chứng minh bạn có quyền đại diện.",
        id: "authorization_letter",
        label: "Giấy ủy quyền / quyền đại diện",
        required: false
      },
      {
        description: "Mặt trước CCCD hoặc giấy phép lái xe của người đại diện.",
        group: "representative_identity",
        id: "representative_identity_front",
        label: "Giấy tờ đại diện · mặt trước",
        required: false
      },
      {
        description: "Mặt sau CCCD hoặc giấy phép lái xe của người đại diện.",
        group: "representative_identity",
        id: "representative_identity_back",
        label: "Giấy tờ đại diện · mặt sau",
        required: false
      },
      {
        description: "Người đại diện cầm giấy tờ, thấy rõ số định danh và khuôn mặt.",
        group: "representative_identity",
        id: "representative_identity_holding",
        label: "Giấy tờ đại diện · ảnh cầm giấy (thấy rõ số)",
        required: false
      }
    ],
    id: "organization_brand",
    label: "Tổ chức / thương hiệu",
    purpose: "Tài khoản đại diện tổ chức"
  },
  ip_owner: {
    description: "Chứng minh quyền sở hữu hoặc quyền khai thác truyện/IP trên ChapMee.",
    documents: [
      {
        description: "Bản thảo, file sáng tác hoặc tài liệu chứng minh quá trình tạo nội dung.",
        id: "original_work",
        label: "Bản thảo / tài liệu sáng tác gốc",
        required: false
      },
      {
        description: "Hợp đồng chuyển nhượng hoặc ủy quyền nếu đăng thay người khác.",
        id: "transfer_contract",
        label: "Hợp đồng chuyển nhượng/ủy quyền",
        required: false
      },
      {
        description: "Giấy chứng nhận bản quyền nếu có.",
        id: "copyright_certificate",
        label: "Giấy chứng nhận bản quyền",
        required: false
      },
      {
        description: "Mô tả quyền sở hữu hoặc quyền khai thác (PDF hoặc ảnh).",
        id: "ownership_statement",
        label: "Mô tả quyền sở hữu",
        required: false
      }
    ],
    id: "ip_owner",
    label: "Chủ sở hữu bản quyền / IP",
    purpose: "Quyền sở hữu hoặc khai thác IP"
  },
  appeal_reverification: {
    description: "Gửi bổ sung khi bị từ chối, bị thu hồi hoặc cần khôi phục xác thực.",
    documents: [
      {
        description: "File bằng chứng bổ sung liên quan đến khiếu nại.",
        id: "appeal_evidence",
        label: "Bằng chứng bổ sung",
        required: false
      },
      {
        description: "Giải trình chi tiết tình huống (PDF hoặc ảnh).",
        id: "appeal_statement",
        label: "Giải trình chi tiết",
        required: false
      }
    ],
    id: "appeal_reverification",
    label: "Khiếu nại / khôi phục xác thực",
    purpose: "Kháng nghị hoặc khôi phục xác thực"
  }
};

export function getRequiredDocumentIds(_type: StudioVerificationType): string[] {
  return [];
}

export function isStudioVerificationType(value: string): value is StudioVerificationType {
  return STUDIO_VERIFICATION_TYPES.includes(value as StudioVerificationType);
}
