import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { expect, test, type Page } from '@playwright/test';

/**
 * Captures the screenshots used by docs/ANLEITUNG.md.
 *
 * Reproducible on purpose: whenever the UI changes, `pnpm screenshots`
 * refreshes every picture in the manual from the same seeded data.
 */
const SHOT_DIR = path.resolve(process.cwd(), 'docs/bilder');

function shotPath(name: string) {
  fs.mkdirSync(SHOT_DIR, { recursive: true });
  return path.join(SHOT_DIR, `${name}.png`);
}

async function shoot(page: Page, name: string) {
  // Let fonts and images settle so the picture is not half-rendered.
  await page.waitForLoadState('networkidle');
  await page.screenshot({ path: shotPath(name), fullPage: true });
}

/** Small wrapper so every navigation waits the same way. */
async function visit(page: Page, url: string) {
  await page.goto(url, { waitUntil: 'domcontentloaded' });
}

test('Screenshots fuer die Anleitung', async ({ page, browser }) => {
  // --- 1. registration ------------------------------------------------------
  await visit(page, '/registrieren');
  await expect(page.getByText('Erstes Konto anlegen')).toBeVisible();
  await shoot(page, '01-registrierung');

  await page.getByLabel('Name').fill('Florian');
  await page.getByLabel('E-Mail').fill('papa@bricktrack.local');
  await page.getByLabel('Passwort').fill('anleitung-passwort');
  await page.getByRole('button', { name: 'Konto anlegen' }).click();
  await expect(page.getByRole('heading', { name: 'Hallo Florian' })).toBeVisible();

  // Example data needs the user to exist first (the wishlist has an owner).
  execFileSync('node', ['node_modules/tsx/dist/cli.mjs', 'scripts/seed.ts'], {
    stdio: 'inherit',
    env: { ...process.env, DATA_DIR: './data-shots' },
  });

  // --- 2. dashboard ---------------------------------------------------------
  await visit(page, '/');
  await shoot(page, '02-start');

  // --- 3. master data -------------------------------------------------------
  await visit(page, '/verwaltung/hersteller');
  await expect(page.getByText('Lego', { exact: true })).toBeVisible();
  await shoot(page, '03-verwaltung-hersteller');

  // --- 4. catalog -----------------------------------------------------------
  await visit(page, '/katalog');
  await expect(page.getByText('Familienhaus und Elektroauto').first()).toBeVisible();
  await shoot(page, '04-katalog');

  // --- 5. missing sets, selection mode --------------------------------------
  await visit(page, '/katalog?besitz=fehlt');
  await expect(page.getByRole('heading', { name: 'Fehlende Sets' })).toBeVisible();
  await shoot(page, '05-fehlende-sets');

  await page.getByRole('button', { name: 'Auswählen' }).click();
  await expect(page.getByText('Tippe die Sets an')).toBeVisible();
  const cards = page.locator('button[aria-pressed]');
  await cards.nth(0).click();
  await cards.nth(1).click();
  await expect(page.getByText('2 ausgewählt')).toBeVisible();
  await shoot(page, '06-mehrfachauswahl');

  await page.getByRole('button', { name: 'Zur Wunschliste hinzufügen' }).click();
  await expect(page.getByText('Sets auf die Wunschliste')).toBeVisible();
  await page.screenshot({ path: shotPath('07-wunschliste-dialog') });
  await page.getByRole('button', { name: 'Abbrechen' }).click();

  // --- 6. set detail --------------------------------------------------------
  await visit(page, '/katalog?q=60398');
  await page.getByText('Familienhaus und Elektroauto').first().click();
  await expect(page.getByRole('heading', { name: 'Familienhaus und Elektroauto' })).toBeVisible();
  await shoot(page, '08-set-detail');

  // --- 7. collection --------------------------------------------------------
  await visit(page, '/sammlung');
  await expect(page.getByText('Wert nach UVP').first()).toBeVisible();
  await shoot(page, '09-sammlung');

  // --- 8. wishlist ----------------------------------------------------------
  await visit(page, '/wunschlisten');
  await expect(page.getByText('Weihnachten 2026').first()).toBeVisible();
  await shoot(page, '10-wunschlisten');

  const listHref = await page
    .getByRole('link', { name: /Weihnachten 2026/ })
    .getAttribute('href');
  await visit(page, listHref!);
  await expect(page.getByRole('heading', { name: 'Weihnachten 2026' })).toBeVisible();
  await shoot(page, '11-wunschliste-bearbeiten');

  const shareUrl = await page.getByLabel('Link zum Teilen').inputValue();

  // --- 9. public view, as a visitor without an account ----------------------
  const visitorContext = await browser.newContext({ locale: 'de-DE' });
  const visitor = await visitorContext.newPage();
  await visitor.setViewportSize({ width: 412, height: 915 });
  await visit(visitor, shareUrl);
  await expect(visitor.getByRole('heading', { name: 'Weihnachten 2026' })).toBeVisible();
  await shoot(visitor, '12-oeffentliche-wunschliste');

  await visitor.getByRole('button', { name: 'Das schenke ich' }).first().click();
  await visitor.getByLabel('Dein Name').fill('Tante Anne');
  await visitor.screenshot({ path: shotPath('13-reservieren') });
  await visitor.getByRole('button', { name: 'Reservieren' }).click();
  await expect(visitor.getByText('Reservierung gespeichert')).toBeVisible();
  await visitor.getByRole('button', { name: 'Alles klar' }).click();
  await shoot(visitor, '14-reserviert');
  await visitorContext.close();

  // --- 10. the owner sees the reservation -----------------------------------
  await page.reload();
  await shoot(page, '15-wunschliste-reserviert');

  // --- 11. account and passkeys --------------------------------------------
  await visit(page, '/konto');
  await expect(page.getByText('Passkeys', { exact: true })).toBeVisible();
  await shoot(page, '16-konto-passkeys');

  // --- 12. Lego import ------------------------------------------------------
  // The screenshot container runs with a placeholder API key so the manual
  // shows the form, not the "not configured" hint. Nothing is submitted.
  await visit(page, '/katalog/neu');
  await expect(page.getByText('Lego-Import')).toBeVisible();
  await shoot(page, '17-lego-import');

  // --- 13. missing parts ----------------------------------------------------
  await visit(page, '/katalog?q=60398');
  await page.getByText('Familienhaus und Elektroauto').first().click();
  await expect(page.getByRole('heading', { name: 'Familienhaus und Elektroauto' })).toBeVisible();
  await page.getByRole('button', { name: 'Fehlteile' }).first().click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.getByLabel('Teilenummer').fill('3001');
  await page.getByLabel('Farbe').fill('Rot');
  await page.getByRole('button', { name: 'Hinzufügen' }).click();
  await expect(page.getByText('3001')).toBeVisible();
  await page.screenshot({ path: shotPath('18-fehlteile') });
  await page.getByRole('button', { name: 'Fertig' }).click();

  // --- 14. invitations ------------------------------------------------------
  await visit(page, '/verwaltung/einladungen');
  await expect(page.getByRole('button', { name: 'Einladung erstellen' })).toBeVisible();
  await page.getByRole('button', { name: 'Einladung erstellen' }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.screenshot({ path: shotPath('19-einladungen') });
  await page.getByRole('button', { name: 'Abbrechen' }).click();

  // --- 15. export and import ------------------------------------------------
  await visit(page, '/verwaltung/daten');
  await expect(page.getByText('Alles als ZIP')).toBeVisible();
  await shoot(page, '20-daten');
});
