import { describe, expect, it } from 'vitest';
import {
  canonicalBrand,
  cleanSetName,
  hintsFromHtml,
  hintsFromUrl,
  mergeHints,
  sourceLabel,
} from '@/lib/link-import';
import { isAllowedWebUrl, isPublicAddress } from '@/lib/net-guard';

describe('Hersteller erkennen', () => {
  it('kennt die gaengigen Schreibweisen', () => {
    expect(canonicalBrand('LEGO®')).toBe('Lego');
    expect(canonicalBrand('Blue Brixx')).toBe('BlueBrixx');
    expect(canonicalBrand('BlueBrixx Pro')).toBe('BlueBrixx');
    expect(canonicalBrand('Mega Construx')).toBe('Mega Bloks');
    expect(canonicalBrand('COBI')).toBe('Cobi');
  });

  it('raet nicht bei Unbekanntem', () => {
    expect(canonicalBrand('Ravensburger')).toBeUndefined();
    expect(canonicalBrand('')).toBeUndefined();
    expect(canonicalBrand('legoland')).toBe('Lego');
  });
});

describe('Daten aus dem Link', () => {
  it('liest Amazon-Links mit Produktnamen', () => {
    const url = new URL(
      'https://www.amazon.de/LEGO-60398-Familienhaus-Elektroauto-Spielzeug/dp/B0BYZJXGZQ/ref=sr_1_1?keywords=lego',
    );
    expect(sourceLabel(url)).toBe('Amazon');
    expect(hintsFromUrl(url)).toEqual({
      manufacturer: 'Lego',
      setNumber: '60398',
      name: 'Familienhaus Elektroauto',
    });
  });

  it('nimmt aus einem Amazon-Link ohne Namen nicht die ASIN', () => {
    const hints = hintsFromUrl(new URL('https://www.amazon.de/dp/B0BYZJXGZQ'));
    expect(hints.setNumber).toBeUndefined();
  });

  it('liest idealo und geizhals', () => {
    expect(
      hintsFromUrl(
        new URL(
          'https://www.idealo.de/preisvergleich/OffersOfProduct/202595377_-familienhaus-mit-elektroauto-60398-lego.html',
        ),
      ),
    ).toEqual({ manufacturer: 'Lego', setNumber: '60398', name: 'Familienhaus mit Elektroauto' });

    expect(
      hintsFromUrl(new URL('https://geizhals.de/bluebrixx-burg-blaustein-101400-a2101234.html')),
    ).toEqual({ manufacturer: 'BlueBrixx', setNumber: '101400', name: 'Burg Blaustein' });
  });

  it('erkennt Cobi-Nummern mit Bindestrich und Jahreszahlen nicht als Setnummer', () => {
    expect(hintsFromUrl(new URL('https://example.com/shop/cobi-2-30500-ford-mustang-gt')).setNumber).toBe(
      '2-30500',
    );
    expect(
      hintsFromUrl(new URL('https://example.com/p/playmobil-adventskalender-2024-71472')).setNumber,
    ).toBe('71472');
  });

  it('liest Marke und Nummer aus Merlins-Bricks-Adressen', () => {
    expect(hintsFromUrl(new URL('https://www.merlinsbricks.com/sets/bb-108782/'))).toEqual({
      manufacturer: 'BlueBrixx',
      setNumber: '108782',
    });
    expect(hintsFromUrl(new URL('https://www.merlinsbricks.com/sets/cobi-2400'))).toEqual({
      manufacturer: 'Cobi',
      setNumber: '2400',
    });
  });

  it('erkennt den Hersteller am Shop', () => {
    expect(hintsFromUrl(new URL('https://www.bluebrixx.com/de/star-trek/108123/raumstation')).manufacturer).toBe(
      'BlueBrixx',
    );
  });
});

describe('Daten aus der Seite', () => {
  const page = new URL('https://brickfact.com/de-de/sets/lego-city-familienhaus-60398');

  it('nimmt schema.org-Produktdaten', () => {
    const html = `<html><head>
      <script type="application/ld+json">{"@context":"https://schema.org","@graph":[
        {"@type":"WebSite","name":"Brickfact"},
        {"@type":"Product","name":"LEGO&#174; City Familienhaus mit Elektroauto 60398",
         "sku":"60398","mpn":"60398","gtin13":"5702017462363",
         "brand":{"@type":"Brand","name":"LEGO"},
         "image":["/img/60398.webp"],
         "description":"Ein Set mit 462 Teilen aus 2023."}]}
      </script></head></html>`;

    expect(hintsFromHtml(html, page)).toEqual({
      manufacturer: 'Lego',
      setNumber: '60398',
      name: 'LEGO® City Familienhaus mit Elektroauto 60398',
      ean: '5702017462363',
      imageUrl: 'https://brickfact.com/img/60398.webp',
      pieceCount: 462,
      year: 2023,
    });
  });

  it('faellt auf Open Graph zurueck und verwirft ungueltige EAN', () => {
    const html = `<meta property="og:title" content="Burg Blaustein &amp; Zubeh&ouml;r">
      <meta content="https://cdn.example.com/burg.jpg" property="og:image">
      <script type="application/ld+json">{"@type":"Product","gtin13":"1234567890123"}</script>`;

    const hints = hintsFromHtml(html, new URL('https://example.com/burg'));
    expect(hints.name).toBe('Burg Blaustein & Zubehör');
    expect(hints.imageUrl).toBe('https://cdn.example.com/burg.jpg');
    expect(hints.ean).toBeUndefined();
  });

  it('haelt Shop-Artikelnummern nicht fuer Setnummern', () => {
    const html = '<script type="application/ld+json">{"@type":"Product","sku":"B0BYZJXGZQ"}</script>';
    expect(hintsFromHtml(html, page).setNumber).toBeUndefined();
  });

  it('liest Amazon-Seiten ohne schema.org', () => {
    const html = `
      <span id="productTitle" class="a-size-large"> LEGO City Familienhaus mit Elektroauto, 60398 </span>
      <a id="bylineInfo" href="/stores/LEGO">Besuche den LEGO-Store</a>
      <script>var data = {"hiRes":"https://m.media-amazon.com/images/I/81abc.jpg","thumb":"x"};</script>
      <table><tr><th class="prodDetSectionEntry"> Modellnummer </th><td> &lrm;60398 </td></tr>
      <tr><th class="prodDetSectionEntry"> Anzahl der Teile </th><td> 462 </td></tr></table>`;

    expect(hintsFromHtml(html, new URL('https://www.amazon.de/dp/B0BYZJXGZQ'))).toEqual({
      manufacturer: 'Lego',
      setNumber: '60398',
      name: 'LEGO City Familienhaus mit Elektroauto, 60398',
      ean: undefined,
      imageUrl: 'https://m.media-amazon.com/images/I/81abc.jpg',
      pieceCount: 462,
    });
  });

  it('findet die Setnummer im Produktnamen', () => {
    const html = '<meta property="og:title" content="Cobi 2400 Ford GP ab € 12,90 (2026)">';
    const hints = hintsFromHtml(html, new URL('https://geizhals.de/x-a1.html'));
    expect(hints.setNumber).toBe('2400');
    expect(cleanSetName(hints.name!, 'Cobi', hints.setNumber)).toBe('Ford GP');
  });

  it('uebersteht kaputtes JSON', () => {
    const html = '<script type="application/ld+json">{ kaputt </script><meta property="og:title" content="X">';
    expect(hintsFromHtml(html, page).name).toBe('X');
  });
});

describe('Zusammenfuehren und Namen putzen', () => {
  it('nimmt pro Feld die erste Quelle mit Wert', () => {
    expect(
      mergeHints({ name: 'Seite', pieceCount: undefined }, { name: 'Link', pieceCount: 450 }, null),
    ).toEqual({ name: 'Seite', pieceCount: 450 });
  });

  it('entfernt Marke, Nummer und Seitennamen', () => {
    expect(cleanSetName('LEGO® City Familienhaus mit Elektroauto 60398', 'Lego', '60398')).toBe(
      'City Familienhaus mit Elektroauto',
    );
    expect(
      cleanSetName('BlueBrixx - Technisches Hilfswerk™ Bi-Directional Vehicle | Set 108782', 'BlueBrixx', '108782'),
    ).toBe('Technisches Hilfswerk Bi-Directional Vehicle');
    expect(cleanSetName('Cobi Ford GP • Set 2400 • SetDB • Merlins Bricks', 'Cobi', '2400')).toBe('Ford GP');
  });
});

describe('Nur oeffentliche Adressen', () => {
  it('sperrt Heimnetz, Loopback und Metadaten-Adressen', () => {
    for (const address of [
      '127.0.0.1',
      '10.0.0.5',
      '172.16.3.4',
      '192.168.178.1',
      '169.254.169.254',
      '100.64.0.1',
      '0.0.0.0',
      '::1',
      'fd00::1',
      'fe80::1',
      '::ffff:192.168.1.1',
    ]) {
      expect(isPublicAddress(address), address).toBe(false);
    }
  });

  it('laesst oeffentliche Adressen durch', () => {
    expect(isPublicAddress('93.184.216.34')).toBe(true);
    expect(isPublicAddress('2a00:1450:4001:80b::200e')).toBe(true);
    expect(isPublicAddress('::ffff:93.184.216.34')).toBe(true);
  });

  it('erlaubt nur normale Web-Links', () => {
    expect(isAllowedWebUrl(new URL('https://example.com/a'))).toBe(true);
    expect(isAllowedWebUrl(new URL('http://example.com:80/a'))).toBe(true);
    expect(isAllowedWebUrl(new URL('file:///etc/passwd'))).toBe(false);
    expect(isAllowedWebUrl(new URL('https://example.com:8443/'))).toBe(false);
    expect(isAllowedWebUrl(new URL('https://user:pw@example.com/'))).toBe(false);
  });
});
