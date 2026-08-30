export type LibraryImage = {
  id: string;
  source: "chapter" | "asset";
  url: string;
  objectKey: string;
  thumbUrl: string;
  thumbKey: string;
  width: number | null;
  height: number | null;
  alt: string;
  caption: string;
  createdAt: string;
};
