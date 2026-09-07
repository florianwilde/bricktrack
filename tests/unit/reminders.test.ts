import { describe, expect, it } from 'vitest';
import {
  daysUntil,
  reminderSubject,
  reminderText,
  shouldRemind,
  type RemindableWishlist,
} from '@/lib/reminders';

const now = new Date('2026-12-10T09:00:00');
const on = (iso: string) => new Date(`${iso}T00:00:00`);

function list(overrides: Partial<RemindableWishlist> = {}): RemindableWishlist {
  return {
    id: 'w-1',
    title: 'Weihnachten 2026',
    eventDate: on('2026-12-24'),
    openItemCount: 3,
    lastReminderAt: null,
    ...overrides,
  };
}

describe('Tage bis zum Termin', () => {
  it('zaehlt ganze Tage, unabhaengig von der Uhrzeit', () => {
    expect(daysUntil(on('2026-12-24'), now)).toBe(14);
    expect(daysUntil(on('2026-12-10'), now)).toBe(0);
    expect(daysUntil(on('2026-12-09'), now)).toBe(-1);
  });
});

describe('Wann erinnert wird', () => {
  it('erinnert, wenn der Termin im Fenster liegt und etwas offen ist', () => {
    const decision = shouldRemind(list(), { now, daysBefore: 14 });

    expect(decision).toEqual({ remind: true, daysLeft: 14 });
  });

  it('schweigt, solange der Termin weit weg ist', () => {
    const decision = shouldRemind(list({ eventDate: on('2027-06-01') }), {
      now,
      daysBefore: 14,
    });

    expect(decision).toEqual({ remind: false, reason: 'too-early' });
  });

  it('erinnert am Tag selbst noch', () => {
    const decision = shouldRemind(list({ eventDate: on('2026-12-10') }), {
      now,
      daysBefore: 14,
    });

    expect(decision).toEqual({ remind: true, daysLeft: 0 });
  });

  it('schweigt, wenn der Termin vorbei ist', () => {
    const decision = shouldRemind(list({ eventDate: on('2026-12-01') }), {
      now,
      daysBefore: 14,
    });

    expect(decision).toEqual({ remind: false, reason: 'past' });
  });

  it('schweigt ohne Termin', () => {
    const decision = shouldRemind(list({ eventDate: null }), { now, daysBefore: 14 });

    expect(decision).toEqual({ remind: false, reason: 'no-date' });
  });

  it('schweigt, wenn alles reserviert ist', () => {
    const decision = shouldRemind(list({ openItemCount: 0 }), { now, daysBefore: 14 });

    expect(decision).toEqual({ remind: false, reason: 'nothing-open' });
  });

  it('wiederholt sich nicht innerhalb einer Woche', () => {
    const decision = shouldRemind(list({ lastReminderAt: on('2026-12-08') }), {
      now,
      daysBefore: 14,
    });

    expect(decision).toEqual({ remind: false, reason: 'already-sent' });
  });

  it('erinnert wieder, wenn die Sperrfrist vorbei ist', () => {
    const decision = shouldRemind(list({ lastReminderAt: on('2026-12-01') }), {
      now,
      daysBefore: 14,
    });

    expect(decision).toMatchObject({ remind: true });
  });
});

describe('Betreff und Text', () => {
  it('formuliert die Naehe im Betreff', () => {
    expect(reminderSubject(list(), 0)).toBe('Heute: Weihnachten 2026');
    expect(reminderSubject(list(), 1)).toBe('Morgen: Weihnachten 2026');
    expect(reminderSubject(list(), 5)).toBe('In 5 Tagen: Weihnachten 2026');
  });

  it('nennt Termin, offene Wuensche und beide Links', () => {
    const text = reminderText({
      title: 'Weihnachten 2026',
      daysLeft: 3,
      openItemCount: 2,
      shareUrl: 'https://bricktrack.example.de/w/abc',
      appUrl: 'https://bricktrack.example.de/wunschlisten/w-1',
    });

    expect(text).toContain('ist in 3 Tagen');
    expect(text).toContain('stehen noch 2 Wünsche offen');
    expect(text).toContain('https://bricktrack.example.de/w/abc');
    expect(text).toContain('https://bricktrack.example.de/wunschlisten/w-1');
  });

  it('bleibt im Singular, wenn nur ein Wunsch offen ist', () => {
    const text = reminderText({
      title: 'Geburtstag',
      daysLeft: 1,
      openItemCount: 1,
      shareUrl: 'x',
      appUrl: 'y',
    });

    expect(text).toContain('ist morgen');
    expect(text).toContain('steht noch 1 Wunsch offen');
  });
});
