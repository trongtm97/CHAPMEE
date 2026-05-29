export function buildStudioManagerHref(
  basePath: string,
  params: Record<string, string | undefined>
) {
  const search = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (value && value !== "all" && value !== "1") {
      search.set(key, value);
    }
  }

  const query = search.toString();
  return query ? `${basePath}?${query}` : basePath;
}
