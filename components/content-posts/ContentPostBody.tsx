import { renderContentPostToSafeHtml } from "@/lib/content-posts/content-post-html";

type ContentPostBodyProps = {
  content: string;
  className?: string;
};

const defaultClassName =
  "content-post-body space-y-4 [&_a]:text-cyan-600 [&_a]:underline hover:[&_a]:text-cyan-500 [&_blockquote]:border-l-4 [&_blockquote]:border-muted-foreground/30 [&_blockquote]:pl-4 [&_blockquote]:italic [&_h2]:text-2xl [&_h2]:font-semibold [&_h3]:text-xl [&_h3]:font-semibold [&_h4]:text-lg [&_h4]:font-semibold [&_img]:my-4 [&_img]:max-w-full [&_img]:rounded-xl [&_ol]:list-decimal [&_ol]:pl-5 [&_table]:w-full [&_table]:border-collapse [&_td]:border [&_td]:border-border [&_td]:px-3 [&_td]:py-2 [&_th]:border [&_th]:border-border [&_th]:bg-muted/40 [&_th]:px-3 [&_th]:py-2 [&_ul]:list-disc [&_ul]:pl-5";

export function ContentPostBody({ content, className }: ContentPostBodyProps) {
  if (!content.trim()) {
    return null;
  }

  const html = renderContentPostToSafeHtml(content);

  return (
    <div
      className={className ?? defaultClassName}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
