import { BinaryBitmap, HybridBinarizer, QRCodeReader, RGBLuminanceSource } from '@zxing/library';
import sharp from 'sharp';
import { describe, expect, it } from 'vitest';
import {
  locationContentsPath,
  locationPath,
  locationWithDescendants,
  parseLocationLabel,
} from '@/lib/locations';
import { qrSvg } from '@/lib/qr';

const LOCATIONS = [
  { id: 'keller', name: 'Keller', parentLocationId: null },
  { id: 'regal', name: 'Regal', parentLocationId: 'keller' },
  { id: 'kiste3', name: 'Kiste 3', parentLocationId: 'regal' },
  { id: 'kiste4', name: 'Kiste 4', parentLocationId: 'regal' },
  { id: 'zimmer', name: 'Kinderzimmer', parentLocationId: null },
];

describe('Standorte', () => {
  it('nennt den Weg von außen nach innen', () => {
    expect(locationPath('kiste3', LOCATIONS)).toEqual(['Keller', 'Regal', 'Kiste 3']);
    expect(locationPath('zimmer', LOCATIONS)).toEqual(['Kinderzimmer']);
    expect(locationPath('gibt-es-nicht', LOCATIONS)).toEqual([]);
  });

  it('nimmt alles mit, was darin liegt', () => {
    expect(locationWithDescendants('keller', LOCATIONS).sort()).toEqual(['keller', 'kiste3', 'kiste4', 'regal']);
    expect(locationWithDescendants('kiste3', LOCATIONS)).toEqual(['kiste3']);
  });

  it('hängt sich an einer Schleife nicht auf', () => {
    const loop = [
      { id: 'a', name: 'A', parentLocationId: 'b' },
      { id: 'b', name: 'B', parentLocationId: 'a' },
    ];
    expect(locationPath('a', loop)).toEqual(['B', 'A']);
    expect(locationWithDescendants('a', loop).sort()).toEqual(['a', 'b']);
  });

  it('erkennt nur Etiketten dieser Instanz', () => {
    const origin = 'https://bricktrack.example.de';
    const label = `${origin}${locationContentsPath('kiste3')}`;
    expect(parseLocationLabel(label, origin)).toBe('/sammlung?standort=kiste3&sammler=alle');
    expect(parseLocationLabel(label, 'https://andere.example.de')).toBeNull();
    expect(parseLocationLabel(`${origin}/katalog?standort=kiste3`, origin)).toBeNull();
    expect(parseLocationLabel(`${origin}/sammlung`, origin)).toBeNull();
    expect(parseLocationLabel('4006381333931', origin)).toBeNull();
  });
});

describe('QR-Etikett', () => {
  it('lässt sich wieder lesen', async () => {
    const text = `https://bricktrack.example.de${locationContentsPath('3f2a9c1e-0b7d-4e55-9a61-2c8f0d4b7e19')}`;
    const svg = qrSvg(text);
    expect(svg.startsWith('<svg')).toBe(true);

    const { data, info } = await sharp(Buffer.from(svg))
      .resize(400, 400, { kernel: 'nearest' })
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
    const luminance = new Uint8ClampedArray(info.width * info.height);
    for (let i = 0; i < luminance.length; i += 1) luminance[i] = data[i * 4] ?? 0;
    const source = new RGBLuminanceSource(luminance, info.width, info.height);
    const result = new QRCodeReader().decode(new BinaryBitmap(new HybridBinarizer(source)));
    expect(result.getText()).toBe(text);
  });
});
