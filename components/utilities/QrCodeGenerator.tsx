"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import { UtilityActionBar, UtilityActionSecondaryButton } from "@/components/utilities/UtilityActionBar";
import { copyToClipboard } from "@/lib/utilities/copy-to-clipboard";
import {
  buildQRContent,
  DEFAULT_QR_STYLE,
  downloadBlob,
  EMPTY_QR_FORM_DATA,
  ERROR_CORRECTION_OPTIONS,
  getColorContrastWarning,
  QR_SIZE_OPTIONS,
  QR_TYPE_LABELS,
  type ErrorCorrectionLevel,
  type QRFormData,
  type QRStyleOptions,
  type QRType
} from "@/lib/utilities/qr-code-generator";

const QR_TYPES = Object.keys(QR_TYPE_LABELS) as QRType[];
const PNG_FILENAME = "ma-qr-code.png";
const SVG_FILENAME = "ma-qr-code.svg";
const PREVIEW_PADDING = 24;

const INPUT_CLASS =
  "w-full rounded-2xl border border-white/15 bg-zinc-900/90 px-4 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-500 focus:border-cyan-300/40 focus:outline-none focus:ring-2 focus:ring-cyan-300/20";

const TEXTAREA_CLASS =
  "min-h-[100px] w-full resize-y rounded-2xl border border-white/15 bg-zinc-900/90 px-4 py-3 text-sm text-zinc-100 placeholder:text-zinc-500 focus:border-cyan-300/40 focus:outline-none focus:ring-2 focus:ring-cyan-300/20";

async function renderQRToCanvas(
  canvas: HTMLCanvasElement,
  content: string,
  style: QRStyleOptions,
  logoDataUrl: string | null,
  outputSize?: number
): Promise<void> {
  const displaySize = outputSize ?? Math.min(style.size, 320);
  const padding = outputSize ? Math.round(displaySize * 0.05) : PREVIEW_PADDING;
  const qrSize = displaySize - padding * 2;

  canvas.width = displaySize;
  canvas.height = displaySize;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const tempCanvas = document.createElement("canvas");
  await QRCode.toCanvas(tempCanvas, content, {
    width: qrSize,
    margin: 2,
    color: {
      dark: style.foregroundColor,
      light: style.backgroundColor
    },
    errorCorrectionLevel: style.errorCorrectionLevel
  });

  ctx.fillStyle = style.backgroundColor;
  ctx.fillRect(0, 0, displaySize, displaySize);
  ctx.drawImage(tempCanvas, padding, padding);

  if (logoDataUrl) {
    const logoSize = Math.round(qrSize * 0.18);
    const logoX = padding + (qrSize - logoSize) / 2;
    const logoY = padding + (qrSize - logoSize) / 2;

    const logo = new Image();
    await new Promise<void>((resolve, reject) => {
      logo.onload = () => resolve();
      logo.onerror = () => reject(new Error("Logo load failed"));
      logo.src = logoDataUrl;
    });

    ctx.fillStyle = style.backgroundColor;
    ctx.fillRect(logoX - 4, logoY - 4, logoSize + 8, logoSize + 8);
    ctx.drawImage(logo, logoX, logoY, logoSize, logoSize);
  }
}

async function generateQRDataUrl(
  content: string,
  style: QRStyleOptions,
  logoDataUrl: string | null
): Promise<string> {
  const canvas = document.createElement("canvas");
  await renderQRToCanvas(canvas, content, style, logoDataUrl, style.size);
  return canvas.toDataURL("image/png");
}

async function generateQRSvg(content: string, style: QRStyleOptions): Promise<string> {
  return QRCode.toString(content, {
    type: "svg",
    width: style.size,
    margin: 2,
    color: {
      dark: style.foregroundColor,
      light: style.backgroundColor
    },
    errorCorrectionLevel: style.errorCorrectionLevel
  });
}

export function QrCodeGenerator() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const firstFieldRef = useRef<HTMLInputElement | HTMLTextAreaElement | null>(null);

  const [qrType, setQrType] = useState<QRType>("url");
  const [formData, setFormData] = useState<QRFormData>(EMPTY_QR_FORM_DATA);
  const [style, setStyle] = useState<QRStyleOptions>(DEFAULT_QR_STYLE);
  const [logoDataUrl, setLogoDataUrl] = useState<string | null>(null);

  const [qrContent, setQrContent] = useState<string | null>(null);
  const [hasGenerated, setHasGenerated] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  const updateField = useCallback(<K extends keyof QRFormData>(key: K, value: QRFormData[K]) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  }, []);

  const clearMessages = () => {
    setError(null);
    setWarning(null);
    setSuccess(null);
    setActionMessage(null);
  };

  const handleGenerate = useCallback(async () => {
    clearMessages();

    const colorWarning = getColorContrastWarning(style.foregroundColor, style.backgroundColor);
    const buildResult = buildQRContent(qrType, formData);

    if (buildResult.error) {
      setError(buildResult.error);
      setQrContent(null);
      setHasGenerated(false);
      return;
    }

    const warnings = [buildResult.warning, colorWarning].filter(Boolean).join(" ");
    if (warnings) setWarning(warnings);

    setQrContent(buildResult.content);
    setHasGenerated(true);
    setSuccess("Đã tạo mã QR thành công!");

    const canvas = canvasRef.current;
    if (canvas) {
      try {
        await renderQRToCanvas(canvas, buildResult.content, style, logoDataUrl);
      } catch {
        setError("Không thể tạo mã QR. Vui lòng thử lại.");
      }
    }
  }, [formData, logoDataUrl, qrType, style]);

  const handleDownloadPng = async () => {
    setActionMessage(null);
    if (!qrContent) {
      setActionMessage("Vui lòng tạo mã QR trước khi tải xuống.");
      return;
    }

    try {
      const dataUrl = await generateQRDataUrl(qrContent, style, logoDataUrl);
      const response = await fetch(dataUrl);
      const blob = await response.blob();
      downloadBlob(blob, PNG_FILENAME);
    } catch {
      setActionMessage("Không thể tải PNG. Vui lòng thử lại.");
    }
  };

  const handleDownloadSvg = async () => {
    setActionMessage(null);
    if (!qrContent) {
      setActionMessage("Vui lòng tạo mã QR trước khi tải xuống.");
      return;
    }

    if (logoDataUrl) {
      setActionMessage("Tải SVG chưa hỗ trợ khi có logo. Hãy tải PNG hoặc xóa logo.");
      return;
    }

    try {
      const svg = await generateQRSvg(qrContent, style);
      const blob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
      downloadBlob(blob, SVG_FILENAME);
    } catch {
      setActionMessage("Không thể tải SVG. Vui lòng thử lại.");
    }
  };

  const handleCopyContent = async () => {
    setActionMessage(null);
    if (!qrContent) {
      setActionMessage("Chưa có nội dung QR để sao chép.");
      return;
    }

    const ok = await copyToClipboard(qrContent);
    setActionMessage(ok ? "Đã sao chép nội dung QR!" : "Không thể sao chép. Hãy thử chọn thủ công.");
  };

  const handleClear = () => {
    setFormData(EMPTY_QR_FORM_DATA);
    setQrContent(null);
    setHasGenerated(false);
    setLogoDataUrl(null);
    clearMessages();

    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext("2d");
      ctx?.clearRect(0, 0, canvas.width, canvas.height);
    }

    window.setTimeout(() => firstFieldRef.current?.focus(), 0);
  };

  const handleTypeChange = (type: QRType) => {
    setQrType(type);
    setQrContent(null);
    setHasGenerated(false);
    clearMessages();
  };

  const handleLogoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setActionMessage("Vui lòng chọn file ảnh hợp lệ.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setLogoDataUrl(reader.result as string);
      setStyle((prev) => ({ ...prev, errorCorrectionLevel: "H" }));
    };
    reader.readAsDataURL(file);
    event.target.value = "";
  };

  const applyWebsiteExample = () => {
    handleTypeChange("url");
    setFormData({ ...EMPTY_QR_FORM_DATA, url: "https://example.com" });
  };

  const applyTextExample = () => {
    handleTypeChange("text");
    setFormData({ ...EMPTY_QR_FORM_DATA, text: "Xin chào Việt Nam" });
  };

  const applyWifiExample = () => {
    handleTypeChange("wifi");
    setFormData({
      ...EMPTY_QR_FORM_DATA,
      wifiSsid: "MyHomeWiFi",
      wifiPassword: "12345678",
      wifiEncryption: "WPA",
      wifiHidden: false
    });
  };

  const applyVcardExample = () => {
    handleTypeChange("vcard");
    setFormData({
      ...EMPTY_QR_FORM_DATA,
      vcardFullName: "Nguyễn Văn A",
      vcardPhone: "0901234567",
      vcardEmail: "contact@example.com",
      vcardWebsite: "https://example.com"
    });
  };

  useEffect(() => {
    if (hasGenerated && qrContent && canvasRef.current) {
      renderQRToCanvas(canvasRef.current, qrContent, style, logoDataUrl).catch(() => {
        /* preview refresh best-effort */
      });
    }
  }, [hasGenerated, logoDataUrl, qrContent, style]);

  const renderFormFields = () => {
    switch (qrType) {
      case "url":
        return (
          <div className="space-y-2">
            <label className="text-sm font-medium text-zinc-300" htmlFor="qr-url">
              Liên kết website
            </label>
            <input
              className={INPUT_CLASS}
              id="qr-url"
              onChange={(e) => updateField("url", e.target.value)}
              placeholder="https://example.com hoặc example.com"
              ref={firstFieldRef as React.RefObject<HTMLInputElement>}
              type="url"
              value={formData.url}
            />
          </div>
        );

      case "text":
        return (
          <div className="space-y-2">
            <label className="text-sm font-medium text-zinc-300" htmlFor="qr-text">
              Văn bản
            </label>
            <textarea
              className={TEXTAREA_CLASS}
              id="qr-text"
              onChange={(e) => updateField("text", e.target.value)}
              placeholder="Nhập văn bản, hỗ trợ tiếng Việt, emoji và nhiều dòng..."
              ref={firstFieldRef as React.RefObject<HTMLTextAreaElement>}
              value={formData.text}
            />
          </div>
        );

      case "phone":
        return (
          <div className="space-y-2">
            <label className="text-sm font-medium text-zinc-300" htmlFor="qr-phone">
              Số điện thoại
            </label>
            <input
              className={INPUT_CLASS}
              id="qr-phone"
              onChange={(e) => updateField("phone", e.target.value)}
              placeholder="0901234567 hoặc +84901234567"
              ref={firstFieldRef as React.RefObject<HTMLInputElement>}
              type="tel"
              value={formData.phone}
            />
          </div>
        );

      case "email":
        return (
          <div className="space-y-3">
            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-300" htmlFor="qr-email">
                Email người nhận <span className="text-amber-300">*</span>
              </label>
              <input
                className={INPUT_CLASS}
                id="qr-email"
                onChange={(e) => updateField("email", e.target.value)}
                placeholder="contact@example.com"
                ref={firstFieldRef as React.RefObject<HTMLInputElement>}
                type="email"
                value={formData.email}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-300" htmlFor="qr-email-subject">
                Tiêu đề email
              </label>
              <input
                className={INPUT_CLASS}
                id="qr-email-subject"
                onChange={(e) => updateField("emailSubject", e.target.value)}
                placeholder="Tiêu đề (tùy chọn)"
                type="text"
                value={formData.emailSubject}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-300" htmlFor="qr-email-body">
                Nội dung email
              </label>
              <textarea
                className={TEXTAREA_CLASS}
                id="qr-email-body"
                onChange={(e) => updateField("emailBody", e.target.value)}
                placeholder="Nội dung (tùy chọn)"
                value={formData.emailBody}
              />
            </div>
          </div>
        );

      case "sms":
        return (
          <div className="space-y-3">
            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-300" htmlFor="qr-sms-phone">
                Số điện thoại <span className="text-amber-300">*</span>
              </label>
              <input
                className={INPUT_CLASS}
                id="qr-sms-phone"
                onChange={(e) => updateField("smsPhone", e.target.value)}
                placeholder="0901234567"
                ref={firstFieldRef as React.RefObject<HTMLInputElement>}
                type="tel"
                value={formData.smsPhone}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-300" htmlFor="qr-sms-body">
                Nội dung tin nhắn
              </label>
              <textarea
                className={TEXTAREA_CLASS}
                id="qr-sms-body"
                onChange={(e) => updateField("smsBody", e.target.value)}
                placeholder="Nội dung tin nhắn (tùy chọn)"
                value={formData.smsBody}
              />
            </div>
          </div>
        );

      case "wifi":
        return (
          <div className="space-y-3">
            <p className="text-xs text-amber-300/90">
              Chỉ tạo QR WiFi cho mạng bạn muốn chia sẻ. Không nhập mật khẩu quan trọng nếu thiết bị
              không an toàn.
            </p>
            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-300" htmlFor="qr-wifi-ssid">
                Tên WiFi <span className="text-amber-300">*</span>
              </label>
              <input
                className={INPUT_CLASS}
                id="qr-wifi-ssid"
                onChange={(e) => updateField("wifiSsid", e.target.value)}
                placeholder="MyHomeWiFi"
                ref={firstFieldRef as React.RefObject<HTMLInputElement>}
                type="text"
                value={formData.wifiSsid}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-300" htmlFor="qr-wifi-password">
                Mật khẩu WiFi
              </label>
              <input
                className={INPUT_CLASS}
                id="qr-wifi-password"
                onChange={(e) => updateField("wifiPassword", e.target.value)}
                placeholder="Mật khẩu (bắt buộc nếu có bảo mật)"
                type="text"
                value={formData.wifiPassword}
              />
            </div>
            <div className="space-y-2">
              <span className="text-sm font-medium text-zinc-300">Loại bảo mật</span>
              <div className="flex flex-wrap gap-2">
                {(
                  [
                    { value: "WPA", label: "WPA/WPA2" },
                    { value: "WEP", label: "WEP" },
                    { value: "nopass", label: "Không mật khẩu" }
                  ] as const
                ).map((option) => (
                  <label
                    className={`cursor-pointer rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                      formData.wifiEncryption === option.value
                        ? "border-cyan-300/40 bg-cyan-300/10 text-cyan-100"
                        : "border-white/10 bg-zinc-900/60 text-zinc-300 hover:border-white/20"
                    }`}
                    key={option.value}
                  >
                    <input
                      checked={formData.wifiEncryption === option.value}
                      className="sr-only"
                      name="wifi-encryption"
                      onChange={() => updateField("wifiEncryption", option.value)}
                      type="radio"
                      value={option.value}
                    />
                    {option.label}
                  </label>
                ))}
              </div>
            </div>
            <label className="flex cursor-pointer items-center gap-2 text-sm text-zinc-300">
              <input
                checked={formData.wifiHidden}
                className="size-4 rounded border-white/20 bg-zinc-900 text-cyan-400 focus:ring-cyan-300/30"
                onChange={(e) => updateField("wifiHidden", e.target.checked)}
                type="checkbox"
              />
              Ẩn mạng
            </label>
          </div>
        );

      case "vcard":
        return (
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <label className="text-sm font-medium text-zinc-300" htmlFor="qr-vcard-name">
                Họ tên <span className="text-amber-300">*</span>
              </label>
              <input
                className={INPUT_CLASS}
                id="qr-vcard-name"
                onChange={(e) => updateField("vcardFullName", e.target.value)}
                placeholder="Nguyễn Văn A"
                ref={firstFieldRef as React.RefObject<HTMLInputElement>}
                type="text"
                value={formData.vcardFullName}
              />
            </div>
            {(
              [
                ["vcardPhone", "qr-vcard-phone", "Số điện thoại", "0901234567"],
                ["vcardEmail", "qr-vcard-email", "Email", "contact@example.com"],
                ["vcardCompany", "qr-vcard-company", "Công ty", "Công ty ABC"],
                ["vcardTitle", "qr-vcard-title", "Chức vụ", "Nhân viên kinh doanh"],
                ["vcardWebsite", "qr-vcard-website", "Website", "https://example.com"],
                ["vcardAddress", "qr-vcard-address", "Địa chỉ", "123 Đường ABC, TP.HCM"],
                ["vcardNote", "qr-vcard-note", "Ghi chú", "Ghi chú thêm"]
              ] as const
            ).map(([key, id, label, placeholder]) => (
              <div className="space-y-2" key={key}>
                <label className="text-sm font-medium text-zinc-300" htmlFor={id}>
                  {label}
                </label>
                <input
                  className={INPUT_CLASS}
                  id={id}
                  onChange={(e) => updateField(key, e.target.value)}
                  placeholder={placeholder}
                  type="text"
                  value={formData[key]}
                />
              </div>
            ))}
          </div>
        );

      case "custom":
        return (
          <div className="space-y-2">
            <label className="text-sm font-medium text-zinc-300" htmlFor="qr-custom">
              Nội dung tùy chỉnh
            </label>
            <textarea
              className={TEXTAREA_CLASS}
              id="qr-custom"
              onChange={(e) => updateField("custom", e.target.value)}
              placeholder="Nhập nội dung bất kỳ..."
              ref={firstFieldRef as React.RefObject<HTMLTextAreaElement>}
              value={formData.custom}
            />
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="space-y-5">
      <header className="space-y-2">
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-cyan-200/90">Tiện ích</p>
        <h1 className="text-xl font-bold text-zinc-50 sm:text-2xl">Tạo Mã QR Code</h1>
        <p className="max-w-2xl text-sm leading-relaxed text-zinc-400">
          Tạo mã QR Code miễn phí cho liên kết, văn bản, số điện thoại, email, WiFi, danh thiếp và
          nhiều nội dung khác. Có thể tải xuống PNG hoặc SVG.
        </p>
      </header>

      <fieldset className="space-y-3 rounded-2xl border border-white/10 bg-zinc-950/50 p-4">
        <legend className="px-1 text-xs font-semibold uppercase tracking-wide text-zinc-300">
          Chọn loại QR
        </legend>
        <div className="flex flex-wrap gap-2">
          {QR_TYPES.map((type) => (
            <label
              className={`cursor-pointer rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                qrType === type
                  ? "border-cyan-300/40 bg-cyan-300/10 text-cyan-100"
                  : "border-white/10 bg-zinc-900/60 text-zinc-300 hover:border-white/20"
              }`}
              key={type}
            >
              <input
                checked={qrType === type}
                className="sr-only"
                name="qr-type"
                onChange={() => handleTypeChange(type)}
                type="radio"
                value={type}
              />
              {QR_TYPE_LABELS[type]}
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset className="space-y-3 rounded-2xl border border-white/10 bg-zinc-950/50 p-4">
        <legend className="px-1 text-xs font-semibold uppercase tracking-wide text-zinc-300">
          Nhập thông tin
        </legend>
        {renderFormFields()}
      </fieldset>

      <fieldset className="space-y-3 rounded-2xl border border-white/10 bg-zinc-950/50 p-4">
        <legend className="px-1 text-xs font-semibold uppercase tracking-wide text-zinc-300">
          Tùy chỉnh giao diện QR
        </legend>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-zinc-300" htmlFor="qr-size">
              Kích thước
            </label>
            <select
              className={INPUT_CLASS}
              id="qr-size"
              onChange={(e) => setStyle((prev) => ({ ...prev, size: Number(e.target.value) }))}
              value={style.size}
            >
              {QR_SIZE_OPTIONS.map((size) => (
                <option key={size} value={size}>
                  {size} × {size}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-zinc-300" htmlFor="qr-fg-color">
              Màu QR
            </label>
            <div className="flex items-center gap-2">
              <input
                className="size-10 cursor-pointer rounded-lg border border-white/15 bg-transparent"
                id="qr-fg-color"
                onChange={(e) => setStyle((prev) => ({ ...prev, foregroundColor: e.target.value }))}
                type="color"
                value={style.foregroundColor}
              />
              <span className="font-mono text-xs text-zinc-400">{style.foregroundColor}</span>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-zinc-300" htmlFor="qr-bg-color">
              Màu nền
            </label>
            <div className="flex items-center gap-2">
              <input
                className="size-10 cursor-pointer rounded-lg border border-white/15 bg-transparent"
                id="qr-bg-color"
                onChange={(e) => setStyle((prev) => ({ ...prev, backgroundColor: e.target.value }))}
                type="color"
                value={style.backgroundColor}
              />
              <span className="font-mono text-xs text-zinc-400">{style.backgroundColor}</span>
            </div>
          </div>

          <div className="space-y-2">
            <span className="text-sm font-medium text-zinc-300">Mức sửa lỗi</span>
            <div className="flex flex-wrap gap-1.5">
              {ERROR_CORRECTION_OPTIONS.map((option) => (
                <label
                  className={`cursor-pointer rounded-full border px-2.5 py-1 text-xs font-medium transition ${
                    style.errorCorrectionLevel === option.value
                      ? "border-cyan-300/40 bg-cyan-300/10 text-cyan-100"
                      : "border-white/10 bg-zinc-900/60 text-zinc-300 hover:border-white/20"
                  }`}
                  key={option.value}
                >
                  <input
                    checked={style.errorCorrectionLevel === option.value}
                    className="sr-only"
                    name="error-correction"
                    onChange={() =>
                      setStyle((prev) => ({
                        ...prev,
                        errorCorrectionLevel: option.value as ErrorCorrectionLevel
                      }))
                    }
                    type="radio"
                    value={option.value}
                  />
                  {option.label}
                </label>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-2 border-t border-white/10 pt-3">
          <span className="text-sm font-medium text-zinc-300">Logo ở giữa QR (tùy chọn)</span>
          <div className="flex flex-wrap items-center gap-2">
            <label className="cursor-pointer rounded-xl border border-white/10 bg-zinc-900/80 px-4 py-2 text-sm font-semibold text-zinc-100 transition hover:border-white/20">
              Upload logo
              <input accept="image/*" className="sr-only" onChange={handleLogoUpload} type="file" />
            </label>
            {logoDataUrl ? (
              <>
                <img
                  alt="Logo preview"
                  className="size-10 rounded-lg border border-white/10 object-contain"
                  src={logoDataUrl}
                />
                <button
                  className="rounded-xl border border-white/10 bg-zinc-900/80 px-3 py-2 text-xs font-semibold text-zinc-300 transition hover:border-white/20"
                  onClick={() => setLogoDataUrl(null)}
                  type="button"
                >
                  Xóa logo
                </button>
              </>
            ) : null}
          </div>
          {logoDataUrl ? (
            <p className="text-xs text-zinc-500">
              Logo chiếm khoảng 18% mã QR. Mức sửa lỗi tự động đặt ở &quot;Rất cao&quot;.
            </p>
          ) : null}
        </div>
      </fieldset>

      <UtilityActionBar primary={{ label: "Tạo mã QR", onClick: handleGenerate }}>
        <UtilityActionSecondaryButton disabled={!hasGenerated} label="Tải PNG" onClick={handleDownloadPng} />
        <UtilityActionSecondaryButton disabled={!hasGenerated} label="Tải SVG" onClick={handleDownloadSvg} />
        <UtilityActionSecondaryButton label="Sao chép" onClick={handleCopyContent} />
        <UtilityActionSecondaryButton label="Xóa" onClick={handleClear} />
      </UtilityActionBar>

      {error ? (
        <p aria-live="polite" className="text-sm font-medium text-amber-300" role="alert">
          {error}
        </p>
      ) : null}
      {warning ? (
        <p aria-live="polite" className="text-sm font-medium text-amber-300/90" role="status">
          {warning}
        </p>
      ) : null}
      {success && hasGenerated ? (
        <p aria-live="polite" className="text-sm font-medium text-cyan-200" role="status">
          {success} Hãy quét thử mã QR trước khi in hoặc chia sẻ.
        </p>
      ) : null}
      {actionMessage ? (
        <p aria-live="polite" className="text-sm font-medium text-zinc-300" role="status">
          {actionMessage}
        </p>
      ) : null}

      <div className="grid gap-5 lg:grid-cols-2">
        <fieldset className="flex flex-col items-center justify-center rounded-2xl border border-white/10 bg-zinc-950/50 p-6">
          <legend className="sr-only">Xem trước mã QR</legend>
          {hasGenerated ? (
            <canvas
              className="rounded-xl"
              ref={canvasRef}
              style={{ backgroundColor: style.backgroundColor }}
            />
          ) : (
            <p className="text-center text-sm text-zinc-500">
              Mã QR sẽ hiển thị tại đây sau khi bạn nhập nội dung và bấm &quot;Tạo mã QR&quot;.
            </p>
          )}
        </fieldset>

        <div className="space-y-2 rounded-2xl border border-white/10 bg-zinc-950/50 p-4">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-zinc-300">
            Nội dung mã QR đang chứa
          </h2>
          <pre className="max-h-[280px] overflow-auto whitespace-pre-wrap break-all rounded-xl border border-white/10 bg-zinc-900/80 p-3 font-mono text-xs text-zinc-300">
            {qrContent ?? "—"}
          </pre>
        </div>
      </div>

      <section aria-labelledby="qr-examples" className="space-y-3">
        <h2 className="text-sm font-bold text-zinc-200" id="qr-examples">
          Ví dụ nhanh
        </h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <article className="rounded-2xl border border-white/10 bg-zinc-950/50 p-4 text-sm">
            <p className="text-zinc-200">https://example.com</p>
            <button
              className="mt-3 rounded-lg border border-cyan-300/30 bg-cyan-300/10 px-3 py-1.5 text-xs font-semibold text-cyan-100 transition hover:bg-cyan-300/20"
              onClick={applyWebsiteExample}
              type="button"
            >
              Dùng ví dụ website
            </button>
          </article>
          <article className="rounded-2xl border border-white/10 bg-zinc-950/50 p-4 text-sm">
            <p className="text-zinc-200">Xin chào Việt Nam</p>
            <button
              className="mt-3 rounded-lg border border-cyan-300/30 bg-cyan-300/10 px-3 py-1.5 text-xs font-semibold text-cyan-100 transition hover:bg-cyan-300/20"
              onClick={applyTextExample}
              type="button"
            >
              Dùng ví dụ văn bản
            </button>
          </article>
          <article className="rounded-2xl border border-white/10 bg-zinc-950/50 p-4 text-sm">
            <p className="text-zinc-200">
              Tên WiFi: MyHomeWiFi
              <br />
              Mật khẩu: 12345678
              <br />
              Bảo mật: WPA
            </p>
            <button
              className="mt-3 rounded-lg border border-cyan-300/30 bg-cyan-300/10 px-3 py-1.5 text-xs font-semibold text-cyan-100 transition hover:bg-cyan-300/20"
              onClick={applyWifiExample}
              type="button"
            >
              Dùng ví dụ WiFi
            </button>
          </article>
          <article className="rounded-2xl border border-white/10 bg-zinc-950/50 p-4 text-sm">
            <p className="text-zinc-200">
              Họ tên: Nguyễn Văn A
              <br />
              Số điện thoại: 0901234567
              <br />
              Email: contact@example.com
              <br />
              Website: https://example.com
            </p>
            <button
              className="mt-3 rounded-lg border border-cyan-300/30 bg-cyan-300/10 px-3 py-1.5 text-xs font-semibold text-cyan-100 transition hover:bg-cyan-300/20"
              onClick={applyVcardExample}
              type="button"
            >
              Dùng ví dụ danh thiếp
            </button>
          </article>
        </div>
      </section>

      <section
        aria-labelledby="qr-guide"
        className="rounded-2xl border border-white/10 bg-zinc-950/50 p-4 text-sm leading-relaxed text-zinc-400"
      >
        <h2 className="text-sm font-bold text-zinc-200" id="qr-guide">
          Cách tạo mã QR Code
        </h2>
        <ol className="mt-3 list-decimal space-y-1.5 pl-5">
          <li>
            Chọn loại mã QR bạn muốn tạo, ví dụ: liên kết website, văn bản, WiFi hoặc danh thiếp.
          </li>
          <li>Nhập thông tin cần mã hóa vào biểu mẫu.</li>
          <li>Tùy chỉnh kích thước, màu sắc hoặc mức sửa lỗi nếu cần.</li>
          <li>Bấm &quot;Tạo mã QR&quot; để xem trước.</li>
          <li>Bấm &quot;Tải PNG&quot; hoặc &quot;Tải SVG&quot; để lưu mã QR về máy.</li>
        </ol>
        <p className="mt-3 text-xs text-zinc-500">
          Lưu ý: Hãy kiểm tra mã QR bằng điện thoại trước khi in ấn hoặc sử dụng trong tài liệu quan
          trọng. Mọi xử lý diễn ra trên trình duyệt — không gửi dữ liệu lên server.
        </p>
      </section>
    </div>
  );
}
