/**
 * Example data so a fresh instance is not an empty page.
 *
 * Safe to run more than once: everything is matched by its natural key
 * (manufacturer slug, set number) and only inserted when missing.
 *
 * Run with `pnpm db:seed` after `pnpm db:migrate`.
 */
import path from 'node:path';
import Database from 'better-sqlite3';
import { config as loadEnv } from 'dotenv';
import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import * as schema from '../src/db/schema';

loadEnv({ path: '.env', quiet: true });

const dataDir = path.resolve(process.env.DATA_DIR ?? './data');
const sqlite = new Database(path.join(dataDir, 'db', 'bricktrack.db'));
sqlite.pragma('foreign_keys = ON');
const db = drizzle(sqlite, { schema });

const now = new Date();
const id = () => crypto.randomUUID();

type SeedSet = {
  manufacturer: string;
  theme: string;
  setNumber: string;
  name: string;
  year: number;
  pieceCount: number;
  minifigCount: number | null;
  retailPriceCents: number;
  ageRange: string;
  /** Copies owned - 0 means the set is only in the catalog. */
  owned?: {
    status: 'owned' | 'built' | 'disassembled' | 'lent_out' | 'sold';
    completeness: 'complete' | 'missing_parts' | 'unknown';
    location: string;
    giftedBy?: string;
  };
};

const MANUFACTURERS = [
  { name: 'Lego', slug: 'lego', website: 'https://www.lego.com/de-de' },
  { name: 'Playmobil', slug: 'playmobil', website: 'https://www.playmobil.de' },
  { name: 'Cobi', slug: 'cobi', website: 'https://cobi.de' },
];

const THEMES: Array<{ manufacturer: string; name: string }> = [
  { manufacturer: 'Lego', name: 'City' },
  { manufacturer: 'Lego', name: 'Technic' },
  { manufacturer: 'Lego', name: 'Ninjago' },
  { manufacturer: 'Playmobil', name: 'Novelmore' },
  { manufacturer: 'Playmobil', name: 'City Action' },
  { manufacturer: 'Cobi', name: 'Historical Collection' },
];

const LOCATIONS = ['Regal Kinderzimmer', 'Kiste Keller 3', 'Vitrine Wohnzimmer'];

const SETS: SeedSet[] = [
  {
    manufacturer: 'Lego',
    theme: 'City',
    setNumber: '60398',
    name: 'Familienhaus und Elektroauto',
    year: 2023,
    pieceCount: 462,
    minifigCount: 4,
    retailPriceCents: 4999,
    ageRange: '6-12',
    owned: { status: 'built', completeness: 'complete', location: 'Regal Kinderzimmer' },
  },
  {
    manufacturer: 'Lego',
    theme: 'City',
    setNumber: '60321',
    name: 'Feuerwehreinsatz',
    year: 2022,
    pieceCount: 766,
    minifigCount: 6,
    retailPriceCents: 7999,
    ageRange: '6-12',
    owned: {
      status: 'owned',
      completeness: 'missing_parts',
      location: 'Kiste Keller 3',
      giftedBy: 'Oma Helga',
    },
  },
  {
    manufacturer: 'Lego',
    theme: 'Technic',
    setNumber: '42147',
    name: 'Kipplaster',
    year: 2022,
    pieceCount: 177,
    minifigCount: null,
    retailPriceCents: 999,
    ageRange: '7-14',
    owned: { status: 'disassembled', completeness: 'unknown', location: 'Kiste Keller 3' },
  },
  {
    manufacturer: 'Lego',
    theme: 'Technic',
    setNumber: '42172',
    name: 'McLaren P1',
    year: 2024,
    pieceCount: 3893,
    minifigCount: null,
    retailPriceCents: 44999,
    ageRange: '18+',
  },
  {
    manufacturer: 'Lego',
    theme: 'Ninjago',
    setNumber: '71427',
    name: 'Lloyds Elementardrachen',
    year: 2023,
    pieceCount: 685,
    minifigCount: 4,
    retailPriceCents: 5999,
    ageRange: '8-14',
  },
  {
    manufacturer: 'Lego',
    theme: 'Ninjago',
    setNumber: '71799',
    name: 'Ninjago City Märkte',
    year: 2023,
    pieceCount: 6163,
    minifigCount: 21,
    retailPriceCents: 39999,
    ageRange: '18+',
  },
  {
    manufacturer: 'Playmobil',
    theme: 'Novelmore',
    setNumber: '70392',
    name: 'Novelmore Festung',
    year: 2020,
    pieceCount: 293,
    minifigCount: 5,
    retailPriceCents: 12999,
    ageRange: '4-10',
    owned: { status: 'built', completeness: 'complete', location: 'Regal Kinderzimmer' },
  },
  {
    manufacturer: 'Playmobil',
    theme: 'City Action',
    setNumber: '70936',
    name: 'Feuerwehr-Fahrzeug Ultimate Rescue Truck',
    year: 2021,
    pieceCount: 178,
    minifigCount: 2,
    retailPriceCents: 8999,
    ageRange: '5-10',
  },
  {
    manufacturer: 'Cobi',
    theme: 'Historical Collection',
    setNumber: '2-30500',
    name: 'Ford Mustang GT',
    year: 2022,
    pieceCount: 250,
    minifigCount: null,
    retailPriceCents: 2999,
    ageRange: '8+',
  },
  {
    manufacturer: 'Cobi',
    theme: 'Historical Collection',
    setNumber: '2-30501',
    name: 'Feuerwehrauto Magirus',
    year: 2023,
    pieceCount: 400,
    minifigCount: 1,
    retailPriceCents: 3999,
    ageRange: '8+',
  },
];

function seedManufacturers() {
  const byName = new Map<string, string>();

  for (const entry of MANUFACTURERS) {
    const existing = db
      .select({ id: schema.manufacturer.id })
      .from(schema.manufacturer)
      .where(eq(schema.manufacturer.slug, entry.slug))
      .get();

    if (existing) {
      byName.set(entry.name, existing.id);
      continue;
    }

    const newId = id();
    db.insert(schema.manufacturer)
      .values({ id: newId, ...entry, createdAt: now, updatedAt: now })
      .run();
    byName.set(entry.name, newId);
  }

  return byName;
}

function seedThemes(manufacturers: Map<string, string>) {
  const byKey = new Map<string, string>();

  for (const entry of THEMES) {
    const manufacturerId = manufacturers.get(entry.manufacturer);
    if (!manufacturerId) continue;

    const existing = db
      .select({ id: schema.theme.id, name: schema.theme.name })
      .from(schema.theme)
      .where(eq(schema.theme.manufacturerId, manufacturerId))
      .all()
      .find((row) => row.name === entry.name);

    if (existing) {
      byKey.set(`${entry.manufacturer}/${entry.name}`, existing.id);
      continue;
    }

    const newId = id();
    db.insert(schema.theme)
      .values({
        id: newId,
        manufacturerId,
        name: entry.name,
        createdAt: now,
        updatedAt: now,
      })
      .run();
    byKey.set(`${entry.manufacturer}/${entry.name}`, newId);
  }

  return byKey;
}

function seedLocations() {
  const byName = new Map<string, string>();

  for (const name of LOCATIONS) {
    const existing = db
      .select({ id: schema.location.id })
      .from(schema.location)
      .where(eq(schema.location.name, name))
      .get();

    if (existing) {
      byName.set(name, existing.id);
      continue;
    }

    const newId = id();
    db.insert(schema.location)
      .values({ id: newId, name, createdAt: now, updatedAt: now })
      .run();
    byName.set(name, newId);
  }

  return byName;
}

function seedSets(
  manufacturers: Map<string, string>,
  themes: Map<string, string>,
  locations: Map<string, string>,
) {
  const setIds = new Map<string, string>();

  for (const entry of SETS) {
    const manufacturerId = manufacturers.get(entry.manufacturer);
    if (!manufacturerId) continue;

    const existing = db
      .select({ id: schema.set.id, setNumber: schema.set.setNumber })
      .from(schema.set)
      .where(eq(schema.set.manufacturerId, manufacturerId))
      .all()
      .find((row) => row.setNumber === entry.setNumber);

    if (existing) {
      setIds.set(entry.setNumber, existing.id);
      continue;
    }

    const newId = id();
    db.insert(schema.set)
      .values({
        id: newId,
        manufacturerId,
        themeId: themes.get(`${entry.manufacturer}/${entry.theme}`) ?? null,
        setNumber: entry.setNumber,
        name: entry.name,
        year: entry.year,
        pieceCount: entry.pieceCount,
        minifigCount: entry.minifigCount,
        ageRange: entry.ageRange,
        retailPriceCents: entry.retailPriceCents,
        createdAt: now,
        updatedAt: now,
      })
      .run();
    setIds.set(entry.setNumber, newId);

    if (entry.owned) {
      db.insert(schema.collectionItem)
        .values({
          id: id(),
          setId: newId,
          status: entry.owned.status,
          completeness: entry.owned.completeness,
          condition: 'good',
          locationId: locations.get(entry.owned.location) ?? null,
          acquiredAt: new Date(entry.year, 11, 24),
          acquiredPriceCents: entry.retailPriceCents,
          giftedBy: entry.owned.giftedBy ?? null,
          createdAt: now,
          updatedAt: now,
        })
        .run();
    }
  }

  return setIds;
}

function seedWishlist(setIds: Map<string, string>) {
  const owner = db.select({ id: schema.user.id }).from(schema.user).get();
  if (!owner) {
    console.log('[seed] Kein Nutzer vorhanden - die Beispiel-Wunschliste wird uebersprungen.');
    console.log('[seed] Registriere dich zuerst in der App und starte den Seed danach erneut.');
    return;
  }

  const existing = db
    .select({ id: schema.wishlist.id })
    .from(schema.wishlist)
    .all()
    .find((row) => row.id.length > 0);
  if (existing) {
    console.log('[seed] Es gibt bereits eine Wunschliste - unveraendert gelassen.');
    return;
  }

  const wishlistId = id();
  db.insert(schema.wishlist)
    .values({
      id: wishlistId,
      ownerUserId: owner.id,
      title: 'Weihnachten 2026',
      occasion: 'christmas',
      eventDate: new Date(2026, 11, 24),
      shareToken: Buffer.from(crypto.getRandomValues(new Uint8Array(32))).toString('base64url'),
      isPublic: true,
      surpriseMode: false,
      note: 'Bitte keine Doppelungen - was reserviert ist, steht schon fest.',
      createdAt: now,
      updatedAt: now,
    })
    .run();

  const wanted = ['71427', '42172', '70936'];
  wanted.forEach((setNumber, index) => {
    const setId = setIds.get(setNumber);
    if (!setId) return;

    db.insert(schema.wishlistItem)
      .values({
        id: id(),
        wishlistId,
        setId,
        priority: index === 0 ? 1 : 2,
        sortOrder: index,
        createdAt: now,
      })
      .onConflictDoNothing()
      .run();
  });
}

console.log('[seed] Beispieldaten werden eingespielt …');

const manufacturers = seedManufacturers();
const themes = seedThemes(manufacturers);
const locations = seedLocations();
const setIds = seedSets(manufacturers, themes, locations);
seedWishlist(setIds);

console.log(
  `[seed] Fertig: ${manufacturers.size} Hersteller, ${themes.size} Themen, ${setIds.size} Sets.`,
);
sqlite.close();
