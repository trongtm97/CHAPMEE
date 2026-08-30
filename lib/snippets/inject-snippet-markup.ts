import {
  looksLikeSnippetHtml,
  parseSnippetMarkup,
  type ParsedSnippetHeadElement,
  type ParsedSnippetScript
} from "@/lib/snippets/parse-snippet-markup";

const SNIPPET_ATTR = "data-chapmee-snippet";

function injectRawScript(code: string, key: string, target: "head" | "body") {
  const el = document.createElement("script");
  el.setAttribute(SNIPPET_ATTR, key);
  el.text = code;
  const parent = target === "head" ? document.head : document.body;
  parent.appendChild(el);
  return () => {
    el.remove();
  };
}

function injectHeadElement(spec: ParsedSnippetHeadElement, key: string) {
  const el = document.createElement(spec.tag);
  el.setAttribute(SNIPPET_ATTR, key);
  for (const [name, value] of Object.entries(spec.attrs)) {
    el.setAttribute(name, value);
  }
  document.head.appendChild(el);
  return () => {
    el.remove();
  };
}

function injectScriptSpec(spec: ParsedSnippetScript, key: string, target: "head" | "body") {
  const el = document.createElement("script");
  el.setAttribute(SNIPPET_ATTR, key);
  if (spec.src) {
    el.src = spec.src;
  }
  if (spec.async) {
    el.async = true;
  }
  if (spec.defer) {
    el.defer = true;
  }
  if (spec.type) {
    el.type = spec.type;
  }
  if (spec.crossOrigin) {
    el.crossOrigin = spec.crossOrigin;
  }
  if (spec.text) {
    el.text = spec.text;
  }
  const parent = target === "head" ? document.head : document.body;
  parent.appendChild(el);
  return () => {
    el.remove();
  };
}

/** Parse HTML paste (script/meta/link) hoặc JS thuần; meta/link luôn vào document.head. */
export function injectSnippetMarkup(
  code: string,
  key: string,
  target: "head" | "body"
): () => void {
  const trimmed = code.trim();
  if (!trimmed) {
    return () => {};
  }

  if (!looksLikeSnippetHtml(trimmed)) {
    return injectRawScript(trimmed, key, target);
  }

  const parsed = parseSnippetMarkup(trimmed);
  if (parsed.scripts.length === 0 && parsed.headElements.length === 0) {
    return injectRawScript(trimmed, key, target);
  }

  const cleanups: Array<() => void> = [];
  for (const headEl of parsed.headElements) {
    cleanups.push(injectHeadElement(headEl, key));
  }
  for (const script of parsed.scripts) {
    cleanups.push(injectScriptSpec(script, key, target));
  }

  return () => {
    for (const fn of cleanups) {
      fn();
    }
  };
}

export function injectSnippetHeadElements(code: string, key: string): () => void {
  const parsed = parseSnippetMarkup(code);
  if (parsed.headElements.length === 0) {
    return () => {};
  }

  const cleanups = parsed.headElements.map((headEl) => injectHeadElement(headEl, key));
  return () => {
    for (const fn of cleanups) {
      fn();
    }
  };
}

export function removeInjectedSnippetNodes() {
  document
    .querySelectorAll(`script[${SNIPPET_ATTR}], meta[${SNIPPET_ATTR}], link[${SNIPPET_ATTR}]`)
    .forEach((node) => node.remove());
}
