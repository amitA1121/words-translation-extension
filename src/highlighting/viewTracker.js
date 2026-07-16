// Tracks how many times each saved word has actually been visible on
// screen (not just "present somewhere on the page"), using
// IntersectionObserver — the browser-native way to know an element is
// really in the viewport, without a scroll-listener + getBoundingClientRect
// poll loop. Views are batched and flushed periodically to avoid a storage
// write per word per scroll frame.

import * as backgroundApi from '../shared/backgroundApi.js';

const FLUSH_INTERVAL_MS = 4000;
const VIEW_DEBOUNCE_MS = 1500; // how long a word must stay visible before it counts
const DEBOUNCE_CHECK_MS = 500;

let observer = null;
let pendingCounts = new Map(); // word key -> confirmed views this batch
let visibleSince = new Map(); // element -> timestamp it became visible

function flushPendingCounts() {
  if (pendingCounts.size === 0) return;
  const viewCounts = Object.fromEntries(pendingCounts);
  pendingCounts = new Map();
  backgroundApi.recordWordViews(viewCounts);
}

function checkDebouncedVisibility() {
  const now = Date.now();
  for (const [el, since] of visibleSince) {
    if (now - since >= VIEW_DEBOUNCE_MS) {
      const key = (el.dataset.whWord || el.textContent || '').toLowerCase();
      if (key) {
        pendingCounts.set(key, (pendingCounts.get(key) || 0) + 1);
      }
      visibleSince.delete(el);
    }
  }
}

function getObserver() {
  if (observer) return observer;
  observer = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (entry.isIntersecting) {
        if (!visibleSince.has(entry.target)) {
          visibleSince.set(entry.target, Date.now());
        }
      } else {
        visibleSince.delete(entry.target);
      }
    }
  }, { threshold: 0.5 });
  return observer;
}

let debounceCheckTimer = null;
let flushTimer = null;

export function startViewTracking() {
  if (!flushTimer) {
    flushTimer = setInterval(flushPendingCounts, FLUSH_INTERVAL_MS);
  }
  if (!debounceCheckTimer) {
    debounceCheckTimer = setInterval(checkDebouncedVisibility, DEBOUNCE_CHECK_MS);
  }
}

export function observeHighlightedElement(el) {
  getObserver().observe(el);
}

export function unobserveHighlightedElement(el) {
  if (observer) observer.unobserve(el);
  visibleSince.delete(el);
}
