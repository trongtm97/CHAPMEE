import { SnippetRuntimeInjector } from "@/components/snippets/SnippetRuntimeInjector";
import { loadActiveRuntimeSnippets } from "@/lib/snippets/snippet-service";
import { isSnippetRenderingEnabled } from "@/lib/snippets/settings";
import { getSnippetUserRuntimeContext } from "@/lib/snippets/user-context";

export async function CodeSnippetRoot() {
  let enabled = false;
  let snippets: Awaited<ReturnType<typeof loadActiveRuntimeSnippets>> = [];
  let userContext = {
    isLoggedIn: false,
    isReader: false,
    isCreator: false,
    isAdmin: false
  };

  try {
    [enabled, snippets, userContext] = await Promise.all([
      isSnippetRenderingEnabled(),
      loadActiveRuntimeSnippets(),
      getSnippetUserRuntimeContext()
    ]);
  } catch {
    enabled = false;
  }

  return (
    <SnippetRuntimeInjector
      disabled={!enabled}
      snippets={snippets}
      userContext={userContext}
    />
  );
}
