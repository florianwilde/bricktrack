import { expect, test } from '@playwright/test';

/**
 * The one path that has to work: register, put a set into the catalog, and
 * share it on a wishlist that a visitor can reserve from without an account.
 */
test('Registrieren, Set anlegen, Wunschliste teilen und reservieren', async ({ page, browser }) => {
  // --- first run: the very first visitor registers and becomes admin --------
  await page.goto('/');
  await expect(page).toHaveURL(/\/registrieren/);
  // Card titles are plain elements, not headings - hence getByText here.
  await expect(page.getByText('Erstes Konto anlegen')).toBeVisible();

  await page.getByLabel('Name').fill('Florian');
  await page.getByLabel('E-Mail').fill('test@bricktrack.local');
  await page.getByLabel('Passwort').fill('smoketest-passwort');
  await page.getByRole('button', { name: 'Konto anlegen' }).click();

  await expect(page.getByRole('heading', { name: 'Hallo Florian' })).toBeVisible();

  // --- master data: a set needs a manufacturer -----------------------------
  await page.goto('/verwaltung/hersteller');
  await page.getByRole('button', { name: 'Hersteller anlegen' }).click();
  await page.getByLabel('Name').fill('Lego');
  await page.getByRole('button', { name: 'Speichern' }).click();
  await expect(page.getByText('Lego')).toBeVisible();

  // --- catalog: create a set ------------------------------------------------
  await page.goto('/katalog/neu');
  await page.getByLabel('Setnummer').fill('60398');
  await page.getByRole('textbox', { name: 'Name', exact: true }).fill('Familienhaus und Elektroauto');
  await page.getByLabel('Jahr').fill('2023');
  await page.getByLabel('UVP').fill('49,99');
  await page.getByRole('button', { name: 'Set anlegen' }).click();

  await expect(page.getByRole('heading', { name: 'Familienhaus und Elektroauto' })).toBeVisible();
  await expect(page.getByText('Fehlt noch')).toBeVisible();

  // --- wishlist: put the set on a fresh list --------------------------------
  await page.getByRole('button', { name: 'Auf Wunschliste' }).click();
  await page.getByRole('combobox', { name: 'Wunschliste' }).selectOption('__neu__');
  await page.getByLabel('Titel der neuen Liste').fill('Weihnachten 2026');
  await page.getByRole('button', { name: 'Hinzufügen' }).click();

  // Wait for the confirmation, not for the button label that is on screen anyway.
  await expect(page.getByText('Auf die Wunschliste gesetzt.')).toBeVisible();

  // --- sharing: grab the public link ---------------------------------------
  await page.goto('/wunschlisten');
  // Navigate by href: a toast can still be on screen and would swallow the click.
  const listHref = await page
    .getByRole('link', { name: /Weihnachten 2026/ })
    .getAttribute('href');
  expect(listHref).toMatch(/^\/wunschlisten\//);
  await page.goto(listHref!);
  await expect(page.getByRole('heading', { name: 'Weihnachten 2026' })).toBeVisible();

  const shareUrl = await page.getByLabel('Link zum Teilen').inputValue();
  expect(shareUrl).toContain('/w/');

  // --- the visitor: no account, no session ---------------------------------
  const visitorContext = await browser.newContext();
  const visitor = await visitorContext.newPage();
  await visitor.goto(shareUrl);

  await expect(visitor.getByRole('heading', { name: 'Weihnachten 2026' })).toBeVisible();
  await expect(visitor.getByText('Familienhaus und Elektroauto')).toBeVisible();

  await visitor.getByRole('button', { name: 'Das schenke ich' }).click();
  await visitor.getByLabel('Dein Name').fill('Tante Anne');
  await visitor.getByRole('button', { name: 'Reservieren' }).click();

  await expect(visitor.getByText('Reservierung gespeichert')).toBeVisible();
  await visitor.getByRole('button', { name: 'Alles klar' }).click();
  await expect(visitor.getByText('Das schenkst du')).toBeVisible();

  // --- back on the owner side: the reservation shows up ---------------------
  await page.reload();
  await expect(page.getByText('Reserviert von Tante Anne')).toBeVisible();

  await visitorContext.close();
});

test('Einladung: zweiter Elternteil bekommt ein eigenes Konto', async ({ page, browser }) => {
  // The admin from the first test is still the only account, so log in.
  await page.goto('/anmelden');
  await page.getByLabel('E-Mail').fill('test@bricktrack.local');
  await page.getByLabel('Passwort').fill('smoketest-passwort');
  await page.getByRole('button', { name: 'Anmelden', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Hallo Florian' })).toBeVisible();

  // --- the admin issues an invitation --------------------------------------
  await page.goto('/verwaltung/einladungen');
  await page.getByRole('button', { name: 'Einladung erstellen' }).click();
  await page.getByRole('button', { name: 'Erstellen' }).click();

  const inviteUrl = await page
    .getByRole('textbox', { name: 'Einladungslink' })
    .inputValue();
  expect(inviteUrl).toContain('/einladung/');
  await page.getByRole('button', { name: 'Fertig' }).click();
  await expect(page.getByText('Offen').first()).toBeVisible();

  // --- the invited person registers ----------------------------------------
  const guestContext = await browser.newContext();
  const guest = await guestContext.newPage();
  await guest.goto(inviteUrl);
  await expect(guest.getByRole('button', { name: 'Konto anlegen' })).toBeVisible();

  await guest.getByLabel('Name').fill('Mama');
  await guest.getByLabel('E-Mail').fill('mama@bricktrack.local');
  await guest.getByLabel('Passwort').fill('zweites-passwort');
  await guest.getByRole('button', { name: 'Konto anlegen' }).click();

  await expect(guest.getByRole('heading', { name: 'Hallo Mama' })).toBeVisible();

  // A member is not an admin: no invitation management for them.
  await guest.goto('/verwaltung/einladungen');
  await expect(guest).toHaveURL(/\/$|\/anmelden/);

  // --- the link is single use ----------------------------------------------
  const secondTry = await browser.newContext();
  const secondPage = await secondTry.newPage();
  await secondPage.goto(inviteUrl);
  await expect(secondPage.getByText('Einladung ungültig')).toBeVisible();

  await guestContext.close();
  await secondTry.close();
});

test('Ohne Anmeldung fuehrt jeder geschuetzte Pfad zur Anmeldung', async ({ page }) => {
  await page.goto('/sammlung');
  await expect(page).toHaveURL(/\/anmelden|\/registrieren/);
});

test('Ein unbekannter Share-Token liefert 404', async ({ page }) => {
  const response = await page.goto('/w/dieser-token-existiert-nicht');
  expect(response?.status()).toBe(404);
});
