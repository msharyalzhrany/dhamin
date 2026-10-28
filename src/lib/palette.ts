// اختيار لوحة الألوان (1/2/3) — تُحفظ في المتصفح ويمكن تجربتها بـ ?palette=2
import { useEffect, useState } from 'react';

export type PaletteId = '1' | '2' | '3';
const KEY = 'dhamin-palette';

export function getPalette(): PaletteId {
  try {
    const q = new URLSearchParams(window.location.search).get('palette');
    if (q === '1' || q === '2' || q === '3') { localStorage.setItem(KEY, q); return q; }
    const v = localStorage.getItem(KEY);
    if (v === '1' || v === '2' || v === '3') return v;
  } catch { /* بدون تخزين */ }
  return '1';
}
export function applyPalette(id: PaletteId) {
  document.documentElement.dataset.palette = id;
  try { localStorage.setItem(KEY, id); } catch { /* */ }
  window.dispatchEvent(new CustomEvent('palette-change', { detail: id }));
}
export function usePalette() {
  const [id, setId] = useState<PaletteId>(() => (document.documentElement.dataset.palette as PaletteId) || '1');
  useEffect(() => {
    const h = (e: Event) => setId((e as CustomEvent).detail);
    window.addEventListener('palette-change', h);
    return () => window.removeEventListener('palette-change', h);
  }, []);
  return id;
}
