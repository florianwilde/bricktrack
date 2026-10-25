import {
  Bell,
  Building2,
  Database,
  Mail,
  MapPin,
  Palette,
  Tag,
  UserRound,
  Users,
  type LucideIcon,
} from 'lucide-react';

/**
 * Everything that is not part of the daily routine lives behind "Mehr":
 * the account, the design, family settings and master data. One list feeds
 * the "Mehr" page and the title bar of each of those pages.
 */

export type MoreGroup = 'ich' | 'familie' | 'katalog' | 'daten';

export type MoreItem = {
  href: string;
  label: string;
  description: string;
  group: MoreGroup;
  icon: LucideIcon;
  adminOnly: boolean;
};

export const MORE_GROUPS: Array<{ id: MoreGroup; label: string }> = [
  { id: 'ich', label: 'Ich' },
  { id: 'familie', label: 'Familie' },
  { id: 'katalog', label: 'Katalog pflegen' },
  { id: 'daten', label: 'Daten' },
];

export const MORE_ITEMS: MoreItem[] = [
  {
    href: '/konto',
    label: 'Konto & Passkeys',
    description: 'Profil, Anmeldung per Passkey.',
    group: 'ich',
    icon: UserRound,
    adminOnly: false,
  },
  {
    href: '/konto#design',
    label: 'Design',
    description: 'Wie Bricktrack auf diesem Gerät aussieht.',
    group: 'ich',
    icon: Palette,
    adminOnly: false,
  },
  {
    href: '/verwaltung/sammler',
    label: 'Sammler',
    description: 'Wer sammelt – jedes Kind mit eigener Sammlung und eigenen Wunschlisten.',
    group: 'familie',
    icon: Users,
    adminOnly: false,
  },
  {
    href: '/verwaltung/einladungen',
    label: 'Einladungen',
    description: 'Weitere Konten für die Familie.',
    group: 'familie',
    icon: Mail,
    adminOnly: true,
  },
  {
    href: '/verwaltung/erinnerungen',
    label: 'Erinnerungen',
    description: 'E-Mail, wenn ein Wunschlisten-Termin näher rückt.',
    group: 'familie',
    icon: Bell,
    adminOnly: true,
  },
  {
    href: '/verwaltung/hersteller',
    label: 'Hersteller',
    description: 'Die Marken, deren Sets im Katalog stehen.',
    group: 'katalog',
    icon: Building2,
    adminOnly: false,
  },
  {
    href: '/verwaltung/themen',
    label: 'Themen',
    description: 'Serien je Hersteller, auch verschachtelt.',
    group: 'katalog',
    icon: Tag,
    adminOnly: false,
  },
  {
    href: '/verwaltung/standorte',
    label: 'Standorte',
    description: 'Wo die Sets aufbewahrt werden.',
    group: 'katalog',
    icon: MapPin,
    adminOnly: false,
  },
  {
    href: '/verwaltung/daten',
    label: 'Export & Import',
    description: 'Bestand sichern, umziehen oder als Tabelle auswerten.',
    group: 'daten',
    icon: Database,
    adminOnly: true,
  },
];

export function moreItemsFor(role: string): MoreItem[] {
  return MORE_ITEMS.filter((item) => !item.adminOnly || role === 'admin');
}
