import { redirect } from "next/navigation";
import { readSearchParam } from "@/lib/media/media-tabs";

type AudioRedirectProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

/** Legacy /audio — canonical listing lives at /media?tab=audio */
export default async function AudioRedirectPage({ searchParams }: AudioRedirectProps) {
  const params = await searchParams;
  const next = new URLSearchParams();
  next.set("tab", "audio");

  const page = readSearchParam(params.page);
  const origin = readSearchParam(params.origin);
  const source = readSearchParam(params.source);
  const continuous = readSearchParam(params.continuous);
  const sort = readSearchParam(params.sort);

  if (page) next.set("page", page);
  if (origin) next.set("origin", origin);
  if (source) next.set("source", source);
  if (continuous) next.set("continuous", continuous);
  if (sort) next.set("sort", sort);

  redirect(`/media?${next.toString()}`);
}
