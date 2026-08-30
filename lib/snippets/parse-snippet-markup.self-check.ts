import assert from "node:assert/strict";
import {
  inlineScriptSource,
  looksLikeSnippetHtml,
  parseSnippetMarkup
} from "@/lib/snippets/parse-snippet-markup";

const gtagPaste = `<!-- Google tag (gtag.js) -->
<script async src="https://www.googletagmanager.com/gtag/js?id=G-TEST"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'G-TEST');
</script>`;

assert.equal(looksLikeSnippetHtml(gtagPaste), true);
const gtag = parseSnippetMarkup(gtagPaste);
assert.equal(gtag.scripts.length, 2);
assert.equal(gtag.scripts[0]?.src, "https://www.googletagmanager.com/gtag/js?id=G-TEST");
assert.equal(gtag.scripts[0]?.async, true);
assert.match(gtag.scripts[1]?.text ?? "", /gtag\('config', 'G-TEST'\)/);

const metaPaste = `<head>
<meta name="google-site-verification" content="abc123" />
<link rel="preconnect" href="https://fonts.example.com" />
</head>`;

const meta = parseSnippetMarkup(metaPaste);
assert.equal(meta.headElements.length, 2);
assert.equal(meta.headElements[0]?.tag, "meta");
assert.equal(meta.headElements[0]?.attrs.name, "google-site-verification");
assert.equal(meta.headElements[0]?.attrs.content, "abc123");
assert.equal(meta.headElements[1]?.tag, "link");
assert.equal(meta.scripts.length, 0);

assert.equal(looksLikeSnippetHtml("console.log(1);"), false);
const raw = parseSnippetMarkup("console.log(1);");
assert.equal(raw.scripts.length, 1);
assert.equal(raw.scripts[0]?.text, "console.log(1);");

assert.match(inlineScriptSource(gtagPaste), /gtag\('config'/);

console.log("parse-snippet-markup.self-check: OK");
