"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Check } from "lucide-react";
import {
  FACEBOOK_ICON_CATALOG,
  FACEBOOK_ICON_CATALOG_COUNT
} from "@/lib/utilities/facebook-icon-catalog";
import { IconGlyph } from "@/components/utilities/IconGlyph";
import { COPY_FEEDBACK_MS, copyToClipboard } from "@/lib/utilities/copy-to-clipboard";
import { emojiForClipboard } from "@/lib/utilities/emoji-twemoji";
import styles from "./icon-picker.module.css";

const GLYPH_SIZE = 28;
const GLYPH_SIZE_FOOTER_MULTI = 20;
const GLYPH_SIZE_FOOTER_SINGLE = 22;
const STORAGE_KEY = "chapmee-icon-picker-memory";

type IconPickerMemory = {
  last: string;
  multi: string[];
};

async function copyText(text: string) {
  const value = text;
  if (!value) return false;
  return copyToClipboard(value);
}

function readMemory(): IconPickerMemory {
  if (typeof window === "undefined") return { last: "", multi: [] };
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { last: "", multi: [] };
    const parsed = JSON.parse(raw) as Partial<IconPickerMemory>;
    return {
      last: typeof parsed.last === "string" ? parsed.last : "",
      multi: Array.isArray(parsed.multi)
        ? parsed.multi.filter((item): item is string => typeof item === "string")
        : []
    };
  } catch {
    return { last: "", multi: [] };
  }
}

function writeMemory(memory: IconPickerMemory) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(memory));
  } catch {
    // ignore quota / private mode
  }
}

const SIDEBAR_PREVIEW: Record<string, string> = {
  smileys: "🙂",
  gestures: "👍",
  hearts: "❤️",
  food: "🍕",
  animals: "🐶",
  nature: "🌸",
  travel: "🚗",
  objects: "📱",
  symbols: "✅",
  flags: "🇻🇳"
};

function IconButton({
  emoji,
  selected,
  onSelect
}: {
  emoji: string;
  selected: boolean;
  onSelect: (emoji: string) => void;
}) {
  return (
    <button
      aria-label={`Chọn ${emoji}`}
      className={`${styles.iconCell} ${selected ? styles.iconCellActive : ""}`}
      onClick={() => onSelect(emoji)}
      type="button"
    >
      <IconGlyph emoji={emoji} size={GLYPH_SIZE} />
    </button>
  );
}

function CopyRow({
  badge,
  children,
  copied,
  disabledCopy,
  onClear,
  onCopy
}: {
  badge: string;
  children: ReactNode;
  copied: boolean;
  disabledCopy: boolean;
  onClear: () => void;
  onCopy: () => void;
}) {
  return (
    <div className={styles.copyRow}>
      <span className={styles.copyRowBadge}>{badge}</span>
      <div className={styles.copyRowPreview}>{children}</div>
      <button
        className={`${styles.footerBtn} ${styles.footerBtnCancel}`}
        onClick={onClear}
        type="button"
      >
        Hủy
      </button>
      <button
        className={`${styles.footerBtn} ${styles.footerBtnPrimary} ${copied ? styles.footerBtnCopied : ""}`}
        disabled={disabledCopy || copied}
        onClick={onCopy}
        type="button"
      >
        {copied ? (
          <span className={styles.footerBtnCopiedContent}>
            <Check aria-hidden size={12} strokeWidth={2.5} />
            Đã sao chép
          </span>
        ) : (
          "Sao chép"
        )}
      </button>
    </div>
  );
}

export function IconPicker() {
  const mainRef = useRef<HTMLDivElement>(null);
  const [activeCategoryId, setActiveCategoryId] = useState(FACEBOOK_ICON_CATALOG[0]?.id ?? "");
  const [lastEmoji, setLastEmoji] = useState("");
  const [multiEmojis, setMultiEmojis] = useState<string[]>([]);
  const [copiedMulti, setCopiedMulti] = useState(false);
  const [copiedSingle, setCopiedSingle] = useState(false);
  const [query, setQuery] = useState("");
  const [hydrated, setHydrated] = useState(false);

  const normalizedQuery = query.trim().toLowerCase();
  const isSearchMode = normalizedQuery.length > 0;

  const multiText = useMemo(
    () => multiEmojis.map((emoji) => emojiForClipboard(emoji)).join(""),
    [multiEmojis]
  );

  const singleText = useMemo(
    () => (lastEmoji ? emojiForClipboard(lastEmoji) : ""),
    [lastEmoji]
  );

  useEffect(() => {
    const memory = readMemory();
    setLastEmoji(memory.last);
    setMultiEmojis(memory.multi);
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    writeMemory({ last: lastEmoji, multi: multiEmojis });
  }, [hydrated, lastEmoji, multiEmojis]);

  const searchResults = useMemo(() => {
    if (!isSearchMode) return [];
    return FACEBOOK_ICON_CATALOG.flatMap((category) => category.emojis).filter((emoji) =>
      emoji.toLowerCase().includes(normalizedQuery)
    );
  }, [isSearchMode, normalizedQuery]);

  const scrollToCategory = useCallback((categoryId: string) => {
    const node = document.getElementById(`icon-category-${categoryId}`);
    const container = mainRef.current;
    if (!node || !container) return;

    setActiveCategoryId(categoryId);
    container.scrollTo({
      top: node.offsetTop - 6,
      behavior: "smooth"
    });
  }, []);

  const handleSelect = useCallback(async (emoji: string) => {
    setLastEmoji(emoji);
    setMultiEmojis((current) => [...current, emoji]);
    setCopiedMulti(false);
    const ok = await copyText(emojiForClipboard(emoji));
    if (ok) {
      setCopiedSingle(true);
      window.setTimeout(() => setCopiedSingle(false), COPY_FEEDBACK_MS);
    } else {
      setCopiedSingle(false);
    }
  }, []);

  const copyMulti = useCallback(async () => {
    if (!multiText) return;
    const ok = await copyText(multiText);
    if (ok) {
      setCopiedMulti(true);
      window.setTimeout(() => setCopiedMulti(false), COPY_FEEDBACK_MS);
    } else {
      setCopiedMulti(false);
    }
  }, [multiText]);

  const copySingle = useCallback(async () => {
    if (!singleText) return;
    const ok = await copyText(singleText);
    if (ok) {
      setCopiedSingle(true);
      window.setTimeout(() => setCopiedSingle(false), COPY_FEEDBACK_MS);
    } else {
      setCopiedSingle(false);
    }
  }, [singleText]);

  const clearMulti = useCallback(() => {
    setMultiEmojis([]);
    setCopiedMulti(false);
  }, []);

  const clearSingle = useCallback(() => {
    setLastEmoji("");
    setCopiedSingle(false);
  }, []);

  useEffect(() => {
    if (isSearchMode) return;

    const container = mainRef.current;
    if (!container) return;

    const sections = FACEBOOK_ICON_CATALOG.map((category) =>
      document.getElementById(`icon-category-${category.id}`)
    ).filter(Boolean) as HTMLElement[];

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (!visible) return;
        const id = visible.target.getAttribute("data-category-id");
        if (id) setActiveCategoryId(id);
      },
      {
        root: container,
        rootMargin: "-12% 0px -58% 0px",
        threshold: [0, 0.12, 0.3, 0.55]
      }
    );

    for (const section of sections) observer.observe(section);
    return () => observer.disconnect();
  }, [isSearchMode]);

  return (
    <div className={styles.root}>
      <header className={styles.header}>
        <h1 className={styles.title}>Icon Facebook</h1>
        <span className={styles.subtitle}>
          {FACEBOOK_ICON_CATALOG_COUNT.toLocaleString("vi-VN")} icon
        </span>
      </header>

      <div className={styles.body}>
        <nav aria-label="Danh mục icon" className={styles.sidebar}>
          <button
            aria-label="Tìm icon"
            className={`${styles.sidebarItem} ${styles.sidebarSearch} ${isSearchMode ? styles.sidebarItemActive : ""}`}
            onClick={() => {
              mainRef.current?.scrollTo({ top: 0, behavior: "smooth" });
              document.getElementById("icon-search-input")?.focus();
            }}
            type="button"
          >
            🔍
          </button>
          {FACEBOOK_ICON_CATALOG.map((category) => (
            <button
              aria-label={category.label}
              className={`${styles.sidebarItem} ${
                !isSearchMode && activeCategoryId === category.id ? styles.sidebarItemActive : ""
              }`}
              key={category.id}
              onClick={() => scrollToCategory(category.id)}
              type="button"
            >
              <span className={styles.sidebarEmoji}>
                <IconGlyph
                  emoji={SIDEBAR_PREVIEW[category.id] ?? category.emojis[0] ?? "❓"}
                  size={22}
                />
              </span>
            </button>
          ))}
        </nav>

        <div className={styles.main}>
          <div className={styles.searchBar}>
            <input
              className={styles.searchInput}
              id="icon-search-input"
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Tìm icon Facebook..."
              type="search"
              value={query}
            />
          </div>

          <div className={styles.mobileCategorySelect}>
            <label className="sr-only" htmlFor="icon-category-select">
              Chọn danh mục icon
            </label>
            <select
              className={styles.mobileCategorySelectInput}
              disabled={isSearchMode}
              id="icon-category-select"
              onChange={(event) => scrollToCategory(event.target.value)}
              value={activeCategoryId}
            >
              {FACEBOOK_ICON_CATALOG.map((category) => (
                <option key={`mobile-${category.id}`} value={category.id}>
                  {category.label.split(",")[0]}
                </option>
              ))}
            </select>
          </div>

          <div className={styles.mainScroll} ref={mainRef}>
            {isSearchMode ? (
              <section className={`${styles.category} ${styles.searchResults}`}>
                <span className={styles.categoryTitle}>
                  Kết quả ({searchResults.length})
                </span>
                {searchResults.length > 0 ? (
                  <div className={styles.iconGrid}>
                    {searchResults.map((emoji, index) => (
                      <IconButton
                        emoji={emoji}
                        key={`search-${emoji}-${index}`}
                        onSelect={handleSelect}
                        selected={lastEmoji === emoji}
                      />
                    ))}
                  </div>
                ) : (
                  <p className={styles.emptySearch}>Không tìm thấy icon phù hợp.</p>
                )}
              </section>
            ) : (
              FACEBOOK_ICON_CATALOG.map((category) => (
                <section
                  className={styles.category}
                  data-category-id={category.id}
                  id={`icon-category-${category.id}`}
                  key={category.id}
                >
                  <span className={styles.categoryTitle}>{category.label}</span>
                  <div className={styles.iconGrid}>
                    {category.emojis.map((emoji, index) => (
                      <IconButton
                        emoji={emoji}
                        key={`${category.id}-${emoji}-${index}`}
                        onSelect={handleSelect}
                        selected={lastEmoji === emoji}
                      />
                    ))}
                  </div>
                </section>
              ))
            )}
          </div>
        </div>
      </div>

      <footer className={styles.footer}>
        <CopyRow
          badge="1"
          copied={copiedSingle}
          disabledCopy={!singleText}
          onClear={clearSingle}
          onCopy={() => void copySingle()}
        >
          {lastEmoji ? (
            <IconGlyph emoji={lastEmoji} size={GLYPH_SIZE_FOOTER_SINGLE} />
          ) : (
            <span className={styles.copyPlaceholder}>—</span>
          )}
        </CopyRow>

        <CopyRow
          badge="N"
          copied={copiedMulti}
          disabledCopy={!multiText}
          onClear={clearMulti}
          onCopy={() => void copyMulti()}
        >
          {multiEmojis.length > 0 ? (
            <div className={styles.multiStrip}>
              {multiEmojis.map((emoji, index) => (
                <span className={styles.multiStripItem} key={`${emoji}-${index}`}>
                  <IconGlyph emoji={emoji} size={GLYPH_SIZE_FOOTER_MULTI} />
                </span>
              ))}
            </div>
          ) : (
            <span className={styles.copyPlaceholder}>—</span>
          )}
        </CopyRow>
      </footer>
    </div>
  );
}
