import { PresentationFallbackNotice } from "@/components/presentation/PresentationFallbackNotice";
import { StandardProseRenderer } from "@/components/composer/renderers/StandardProseRenderer";

type ComposerUnsupportedPlaceholderProps = {
  message: string;
  fallbackContent?: string;
};

export function ComposerUnsupportedPlaceholder({
  fallbackContent = "",
  message
}: ComposerUnsupportedPlaceholderProps) {
  return (
    <>
      <PresentationFallbackNotice message={message} />
      {fallbackContent.trim() ? (
        <StandardProseRenderer content={fallbackContent} />
      ) : (
        <p className="text-sm text-zinc-500">Chưa có nội dung để hiển thị.</p>
      )}
    </>
  );
}
