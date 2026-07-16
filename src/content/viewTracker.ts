// Tracks how many times each saved word has actually been visible on
// screen (not just "present somewhere on the page"), using
// IntersectionObserver — the browser-native way to know an element is
// really in the viewport, without a scroll-listener + getBoundingClientRect
// poll loop. Views are batched and flushed periodically to avoid a storage
// write per word per scroll frame.

import { backgroundApi } from '../lib/messaging';

const FLUSH_INTERVAL_MS = 4000;
const VIEW_DEBOUNCE_MS = 1500; // how long a word must stay visible before it counts
const DEBOUNCE_CHECK_MS = 500;

let observer: IntersectionObserver | null = null;
let pendingCounts = new Map<string, number>(); // word key -> confirmed views this batch
const visibleSince = new Map<HTMLElement, number>(); // element -> timestamp it became visible

function flushPendingCounts(): void {
  if (pendingCounts.size === 0) return;
  const viewCounts = Object.fromEntries(pendingCounts);
  pendingCounts = new Map();
  void backgroundApi.recordWordViews(viewCounts);
}

function checkDebouncedVisibility(): void {
  const now = Date.now();
  for (const [el, since] of visibleSince) {
    if (now - since >= VIEW_DEBOUNCE_MS) {
      const key = (el.dataset.whWord || el.textContent || '').toLowerCase();
      if (key) {
        pendingCounts.set(key, (pendingCounts.get(key) ?? 0) + 1);
      }
      visibleSince.delete(el);
    }
  }
}

function getObserver(): IntersectionObserver {
  if (observer) return observer;
  observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        const el = entry.target as HTMLElement;
        if (entry.isIntersecting) {
          if (!visibleSince.has(el)) {
            visibleSince.set(el, Date.now());
          }
        } else {
          visibleSince.delete(el);
        }
      }
    },
    { threshold: 0.5 }
  );
  return observer;
}

let debounceCheckTimer: ReturnType<typeof setInterval> | null = null;
let flushTimer: ReturnType<typeof setInterval> | null = null;

export function startViewTracking(): void {
  flushTimer ??= setInterval(flushPendingCounts, FLUSH_INTERVAL_MS);
  debounceCheckTimer ??= setInterval(checkDebouncedVisibility, DEBOUNCE_CHECK_MS);
}

export function observeHighlightedElement(el: Element): void {
  getObserver().observe(el);
}
