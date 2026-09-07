import { z } from 'zod';
import { parseEuroInput } from './money';

/**
 * Server-side validation for every form in the app.
 *
 * All input arrives as FormData, i.e. as strings, so the schemas do the
 * coercion as well: empty fields become null, prices become cents, dates
 * become Date objects.
 */

/** Empty text fields must not be stored as empty strings. */
export const optionalText = (max = 500) =>
  z
    .string()
    .trim()
    .max(max, `Höchstens ${max} Zeichen.`)
    .nullish()
    .transform((value) => (value && value.length > 0 ? value : null));

export const optionalUrl = z
  .string()
  .trim()
  .nullish()
  .transform((value) => (value && value.length > 0 ? value : null))
  .refine(
    (value) => value === null || /^https?:\/\/\S+$/i.test(value),
    'Bitte eine vollständige Adresse mit http:// oder https:// angeben.',
  );

/** A select that may be left on "keine Auswahl". */
export const optionalId = z
  .string()
  .trim()
  .nullish()
  .transform((value) => (value && value.length > 0 && value !== 'none' ? value : null));

export const optionalInt = (min: number, max: number) =>
  z
    .string()
    .trim()
    .nullish()
    .transform((value) => (value && value.length > 0 ? Number(value) : null))
    .refine(
      (value) => value === null || (Number.isInteger(value) && value >= min && value <= max),
      `Bitte eine ganze Zahl zwischen ${min} und ${max} angeben.`,
    );

/** Money arrives as "12,99" or "12.99" and is stored as cents. */
export const optionalPriceCents = z
  .string()
  .nullish()
  .transform((value) => parseEuroInput(value ?? null))
  .refine((value) => value === null || value <= 100_000_00, 'Der Betrag ist unrealistisch hoch.');

export const optionalDate = z
  .string()
  .trim()
  .nullish()
  .transform((value) => (value && value.length > 0 ? new Date(`${value}T12:00:00`) : null))
  .refine(
    (value) => value === null || !Number.isNaN(value.getTime()),
    'Bitte ein gültiges Datum angeben.',
  );

export const checkbox = z
  .union([z.literal('on'), z.literal('true'), z.literal('false'), z.literal('')])
  .nullish()
  .transform((value) => value === 'on' || value === 'true');

// ---------------------------------------------------------------------------
// Master data
// ---------------------------------------------------------------------------

export const manufacturerSchema = z.object({
  name: z.string().trim().min(1, 'Bitte einen Namen angeben.').max(80),
  website: optionalUrl,
});

export const themeSchema = z.object({
  manufacturerId: z.string().trim().min(1, 'Bitte einen Hersteller wählen.'),
  name: z.string().trim().min(1, 'Bitte einen Namen angeben.').max(80),
  parentThemeId: optionalId,
});

export const locationSchema = z.object({
  name: z.string().trim().min(1, 'Bitte einen Namen angeben.').max(80),
  parentLocationId: optionalId,
});

// ---------------------------------------------------------------------------
// Catalog
// ---------------------------------------------------------------------------

const currentYear = new Date().getFullYear();

export const setSchema = z.object({
  manufacturerId: z.string().trim().min(1, 'Bitte einen Hersteller wählen.'),
  themeId: optionalId,
  setNumber: z.string().trim().min(1, 'Bitte die Setnummer angeben.').max(40),
  name: z.string().trim().min(1, 'Bitte einen Namen angeben.').max(160),
  year: optionalInt(1930, currentYear + 5),
  pieceCount: optionalInt(0, 100_000),
  minifigCount: optionalInt(0, 500),
  ean: optionalText(20),
  ageRange: optionalText(20),
  imageUrl: optionalUrl,
  retailPriceCents: optionalPriceCents,
  notes: optionalText(2000),
});

// ---------------------------------------------------------------------------
// Collection
// ---------------------------------------------------------------------------

export const collectionStatusEnum = z.enum([
  'owned',
  'built',
  'disassembled',
  'lent_out',
  'sold',
]);

export const completenessEnum = z.enum(['complete', 'missing_parts', 'unknown']);

export const conditionEnum = z.enum(['new_sealed', 'like_new', 'good', 'used', 'damaged']);

export const collectionItemSchema = z.object({
  setId: z.string().trim().min(1),
  status: collectionStatusEnum.default('owned'),
  completeness: completenessEnum.default('unknown'),
  condition: z
    .string()
    .trim()
    .nullish()
    .transform((value) => (value && value.length > 0 && value !== 'none' ? value : null))
    .refine(
      (value) => value === null || conditionEnum.safeParse(value).success,
      'Unbekannter Zustand.',
    ),
  locationId: optionalId,
  acquiredAt: optionalDate,
  acquiredPriceCents: optionalPriceCents,
  acquiredFrom: optionalText(120),
  giftedBy: optionalText(120),
  lentOutTo: optionalText(120),
  notes: optionalText(2000),
});

/**
 * A missing part needs at least something identifying: a part number or a
 * note. An entry with neither says nothing and would only clutter the list.
 */
export const missingPartSchema = z
  .object({
    partNumber: optionalText(40),
    colorName: optionalText(40),
    quantity: z.coerce.number().int().min(1).max(999).default(1),
    notes: optionalText(300),
  })
  .refine(
    (value) => value.partNumber !== null || value.notes !== null,
    'Bitte gib mindestens die Teilenummer oder eine Notiz an.',
  );

// ---------------------------------------------------------------------------
// Wishlists
// ---------------------------------------------------------------------------

export const occasionEnum = z.enum(['christmas', 'birthday', 'easter', 'other']);

export const wishlistSchema = z.object({
  title: z.string().trim().min(1, 'Bitte einen Titel angeben.').max(80),
  occasion: occasionEnum.default('other'),
  eventDate: optionalDate,
  note: optionalText(1000),
  isPublic: checkbox,
  surpriseMode: checkbox,
});

export const wishlistItemSchema = z.object({
  priority: z.coerce.number().int().min(1).max(3).default(2),
  note: optionalText(500),
});

/** Bulk add from the "fehlende Sets" selection. */
export const addSetsToWishlistSchema = z.object({
  wishlistId: z.string().trim().min(1, 'Bitte eine Wunschliste wählen.'),
  setIds: z.array(z.string().trim().min(1)).min(1, 'Bitte mindestens ein Set auswählen.'),
  priority: z.coerce.number().int().min(1).max(3).default(2),
});

export const reservationSchema = z.object({
  itemId: z.string().trim().min(1),
  name: z
    .string()
    .trim()
    .min(2, 'Bitte trag deinen Namen ein, damit klar ist, wer das Geschenk übernimmt.')
    .max(60),
});

export type ManufacturerInput = z.infer<typeof manufacturerSchema>;
export type ThemeInput = z.infer<typeof themeSchema>;
export type LocationInput = z.infer<typeof locationSchema>;
export type SetInput = z.infer<typeof setSchema>;
export type CollectionItemInput = z.infer<typeof collectionItemSchema>;
export type WishlistInput = z.infer<typeof wishlistSchema>;
