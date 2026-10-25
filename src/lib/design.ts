/**
 * The selectable looks of the app.
 *
 * A design is nothing but a set of CSS tokens under `[data-design=...]` in
 * `src/app/designs.css`; this module only knows the names. The choice lives in
 * a cookie, so it is per device and also applies to pages without a session
 * (login, public wishlist).
 */

export const DESIGNS = ['klemmbaustein', 'warm', 'nacht', 'bonbon', 'bauklotz', 'schlicht'] as const;

export type Design = (typeof DESIGNS)[number];

export const DEFAULT_DESIGN: Design = 'klemmbaustein';

export const DESIGN_COOKIE = 'bricktrack-design';

export type DesignInfo = {
  label: string;
  description: string;
  /** Dark designs also set the `.dark` class so `dark:` variants apply. */
  dark: boolean;
  /** Browser chrome colour (address bar, PWA title bar). */
  themeColor: string;
  /** Four colours for the preview swatch on the account page. */
  swatch: [string, string, string, string];
};

export const DESIGN_INFO: Record<Design, DesignInfo> = {
  klemmbaustein: {
    label: 'Klemmbaustein',
    description: 'Noppen, Konturen und kräftige Steinfarben.',
    dark: false,
    themeColor: '#fff6e5',
    swatch: ['#fff6e5', '#d63a30', '#ffc93c', '#2f6bea'],
  },
  warm: {
    label: 'Warm',
    description: 'Ruhiger Sandton mit Ziegelrot.',
    dark: false,
    themeColor: '#f6f3ec',
    swatch: ['#f6f3ec', '#c8381f', '#fbe3a6', '#1d1b17'],
  },
  nacht: {
    label: 'Nachtblau',
    description: 'Dunkel mit gelbem Akzent, schont abends die Augen.',
    dark: true,
    themeColor: '#0e1422',
    swatch: ['#0e1422', '#ffc93c', '#182136', '#60a5fa'],
  },
  bonbon: {
    label: 'Bonbon',
    description: 'Weiches Lila mit Pastellfarben.',
    dark: false,
    themeColor: '#f4f0ff',
    swatch: ['#f4f0ff', '#6d4aff', '#d3f5e7', '#ffe1d1'],
  },
  bauklotz: {
    label: 'Bauklotz',
    description: 'Primärfarben und dicke schwarze Konturen.',
    dark: false,
    themeColor: '#ffd500',
    swatch: ['#fffbef', '#1e5eff', '#ffd500', '#e63b2e'],
  },
  schlicht: {
    label: 'Schlicht',
    description: 'Neutrales Grau, wie bis Version 0.3.',
    dark: false,
    themeColor: '#ffffff',
    swatch: ['#ffffff', '#171717', '#f5f5f5', '#a3a3a3'],
  },
};

export function isDesign(value: unknown): value is Design {
  return typeof value === 'string' && (DESIGNS as readonly string[]).includes(value);
}

/** Cookie value to design; anything unknown falls back to the default. */
export function resolveDesign(value: string | null | undefined): Design {
  return isDesign(value) ? value : DEFAULT_DESIGN;
}

/** Number of placeholder tones every design defines (`--tone-1` ...). */
export const TONE_COUNT = 5;

/** The manufacturers named in the brief get a fixed, recognisable tone. */
const KNOWN_TONES: Record<string, number> = {
  lego: 1,
  playmobil: 2,
  cobi: 3,
  bluebrixx: 4,
  megabloks: 5,
};

/**
 * Stable tone for a set without an image, derived from its manufacturer, so
 * all Lego placeholders share a colour and Playmobil gets another one.
 * Returns 1 ... TONE_COUNT.
 */
export function toneIndex(manufacturerName: string): number {
  const key = manufacturerName.toLowerCase().replace(/[^a-z0-9]/g, '');
  const known = KNOWN_TONES[key];
  if (known) return known;

  let hash = 0;
  for (const char of key) {
    hash = (hash * 31 + char.codePointAt(0)!) >>> 0;
  }
  return (hash % TONE_COUNT) + 1;
}
