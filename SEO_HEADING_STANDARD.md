# SEO Heading Standard

## Heading Principles

- Each indexable page should have exactly one primary `h1`.
- `h1` must describe the main topic of the page, not a visual style.
- Reusable components must not hard-code `h1` unless they are guaranteed to be the page’s main heading.
- Cards, sheets, sidebars, footers, and repeated feed items should generally use `h2`-`h4` or non-heading tags depending on context.
- Never skip heading levels just because a font size looks right.
- Semantic structure must stay independent from styling.

## Route-Level Expected `h1`

| Route | Expected `h1` |
| --- | --- |
| `/` | `Reels ChapMee` (can be visually hidden if the UI is a full-screen feed) |
| `/reels` | `Reels ChapMee` (same page-level heading policy as `/`) |
| `/discover` | `Khám phá truyện` |
| `/community` | `Cộng đồng` |
| `/stories/[slug]` | Story title |
| `/stories/[slug]/episodes/[episodeNumber]` | Chapter title or `Chapter title - Story title` |
| `/@username` | `Display Name (@username)` |
| `/about` | `Giới thiệu ChapMee` |
| `/contact` | `Liên hệ ChapMee` |
| `/community-guidelines` | `Quy định cộng đồng` |
| `/privacy` | `Chính sách quyền riêng tư` |
| `/terms` | `Điều khoản sử dụng` |
| `/content-policy` | `Chính sách nội dung` |

## Component Rules

### Good

```tsx
<PageHeading>Giới thiệu ChapMee</PageHeading>
<SectionHeader as="h3" title="Lịch sử gần đây" />
```

### Bad

```tsx
<h1 className="text-xl">Card title</h1>
<h3 className="text-3xl">Main page title</h3>
```

### Reusable Component Rule

- `PageHeading` is for the page’s main title.
- `SectionHeading` is for subsections.
- `VisuallyHiddenHeading` is acceptable for accessibility-first pages such as full-screen feeds.
- `SectionHeader` may be used for repeated sections, but it must accept a semantic level and not force a single tag.

## Reels / Feed Handling

- The feed can render many items in the DOM.
- Do not render each reel title as `h1`.
- Use one page-level `h1` for the feed.
- Use `h2` or `h3` for item titles, depending on nesting depth.
- If the UI already has an intentional visual title elsewhere, a visually hidden `h1` is acceptable for accessibility as long as it does not create spammy duplicate headings.

## Modal / Dialog Rules

- Modal titles should usually be `h2` or `h3`, not `h1`.
- The dialog container should expose an accessible label via `aria-labelledby` or a heading id.
- A modal must never steal the page’s primary `h1`.

## Footer Rules

- Footer section labels should not become global heading noise on every page.
- Prefer plain text or `h2`/`h3` only when the footer section is truly meaningful.
- Do not let reusable footer components emit `h1`.

## Accessibility Notes

- Headings must follow a logical order for screen readers.
- Landmarks matter: `header`, `nav`, `main`, `footer`.
- Buttons are for actions; links are for navigation.
- Decorative text that looks like a heading should stay semantic only if it represents a section.

## Examples

### Correct

```tsx
<header>
  <PageHeading>Khám phá truyện</PageHeading>
</header>

<section>
  <SectionHeading as="h2">Mới cập nhật</SectionHeading>
</section>
```

### Incorrect

```tsx
<div className="text-3xl font-black">Khám phá truyện</div>
<h1 className="text-sm">Mới cập nhật</h1>
```

## Future Coding Agent Checklist

- [ ] Is there exactly one `h1` for the page?
- [ ] Is the `h1` the main topic, not a card label?
- [ ] Are repeated cards using `h2`/`h3` instead of `h1`?
- [ ] Are heading levels sequential?
- [ ] Does the component allow semantic level to differ from visual size?
- [ ] Are modals/dialogs labeled properly without hijacking page semantics?
- [ ] Are footer headings kept quiet?
- [ ] Are feed/list pages still accessible if visually minimal?

## Current Implementation Notes

- `components/seo/PageHeading.tsx`
- `components/seo/SectionHeading.tsx`
- `components/seo/VisuallyHiddenHeading.tsx`
- `components/ui/SectionHeader.tsx`

These helpers exist to keep semantics consistent without forcing UI redesigns.
