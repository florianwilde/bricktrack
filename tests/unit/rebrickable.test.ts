import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// The module reads the key through src/env, which validates on import - so
// the variable has to be in place before the dynamic import below.
process.env.REBRICKABLE_API_KEY = 'test-key';

const {
  fetchImageBytes,
  fetchMinifigCount,
  fetchSet,
  fetchTheme,
  isRebrickableEnabled,
  RebrickableError,
} = await import('@/lib/rebrickable');

type FetchArgs = Parameters<typeof fetch>;

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

const originalFetch = globalThis.fetch;

beforeEach(() => {
  vi.restoreAllMocks();
});

afterEach(() => {
  globalThis.fetch = originalFetch;
});

function stubFetch(handler: (url: string, init?: FetchArgs[1]) => Response | Promise<Response>) {
  const spy = vi.fn(async (input: FetchArgs[0], init?: FetchArgs[1]) =>
    handler(String(input), init),
  );
  globalThis.fetch = spy as unknown as typeof fetch;
  return spy;
}

const SET_RESPONSE = {
  set_num: '60398-1',
  name: 'Familienhaus und Elektroauto',
  year: 2023,
  theme_id: 52,
  num_parts: 462,
  set_img_url: 'https://cdn.rebrickable.com/media/sets/60398-1.jpg',
  set_url: 'https://rebrickable.com/sets/60398-1/',
};

describe('Verfuegbarkeit', () => {
  it('ist mit gesetztem API-Key aktiv', () => {
    expect(isRebrickableEnabled()).toBe(true);
  });
});

describe('Set abrufen', () => {
  it('uebersetzt die Antwort in unser Format', async () => {
    stubFetch(() => jsonResponse(SET_RESPONSE));

    const result = await fetchSet('60398');

    expect(result).toEqual({
      setNumber: '60398',
      name: 'Familienhaus und Elektroauto',
      year: 2023,
      pieceCount: 462,
      themeId: 52,
      imageUrl: 'https://cdn.rebrickable.com/media/sets/60398-1.jpg',
      externalUrl: 'https://rebrickable.com/sets/60398-1/',
    });
  });

  it('fragt die Nummer mit Variante ab und schickt den Key im Header', async () => {
    const spy = stubFetch(() => jsonResponse(SET_RESPONSE));

    await fetchSet('60398');

    const [url, init] = spy.mock.calls[0]!;
    expect(String(url)).toContain('/sets/60398-1/');
    // Der Key gehoert in den Header, nicht in die URL - sonst steht er in
    // jedem Proxy-Log.
    expect(String(url)).not.toContain('test-key');
    expect((init?.headers as Record<string, string>).Authorization).toBe('key test-key');
  });

  it('liefert null, wenn Rebrickable die Nummer nicht kennt', async () => {
    stubFetch(() => new Response('', { status: 404 }));

    await expect(fetchSet('99999')).resolves.toBeNull();
  });

  it('meldet einen abgelehnten API-Key verstaendlich', async () => {
    stubFetch(() => new Response('', { status: 401 }));

    await expect(fetchSet('60398')).rejects.toBeInstanceOf(RebrickableError);
    await expect(fetchSet('60398')).rejects.toThrow(/API-Key/);
  });

  it('meldet eine Drosselung als eigenen Fall', async () => {
    stubFetch(() => new Response('', { status: 429 }));

    await expect(fetchSet('60398')).rejects.toThrow(/drosselt/);
  });

  it('macht aus einem Netzwerkfehler keine Ausnahme mit Innenleben', async () => {
    stubFetch(() => {
      throw new Error('ECONNREFUSED');
    });

    await expect(fetchSet('60398')).rejects.toThrow(/nicht erreichbar/);
  });

  it('kommt mit fehlenden Feldern klar', async () => {
    stubFetch(() =>
      jsonResponse({ set_num: '1234-1', name: 'Ohne alles', year: null, theme_id: null }),
    );

    const result = await fetchSet('1234');

    expect(result).toMatchObject({
      setNumber: '1234',
      pieceCount: null,
      themeId: null,
      imageUrl: null,
    });
  });
});

describe('Thema abrufen', () => {
  it('liefert Name und Oberthema', async () => {
    stubFetch(() => jsonResponse({ id: 52, name: 'City', parent_id: 50 }));

    await expect(fetchTheme(52)).resolves.toEqual({ id: 52, name: 'City', parentId: 50 });
  });

  it('behandelt ein Thema ohne Oberthema', async () => {
    stubFetch(() => jsonResponse({ id: 1, name: 'Technic', parent_id: null }));

    await expect(fetchTheme(1)).resolves.toEqual({ id: 1, name: 'Technic', parentId: null });
  });
});

describe('Minifiguren zaehlen', () => {
  it('summiert die Mengen', async () => {
    stubFetch(() => jsonResponse({ results: [{ quantity: 2 }, { quantity: 3 }] }));

    await expect(fetchMinifigCount('60398')).resolves.toBe(5);
  });

  it('laesst den Import nicht scheitern, wenn die Liste fehlt', async () => {
    stubFetch(() => new Response('', { status: 500 }));

    // null statt Ausnahme: ein Set ohne Minifiguren-Angabe ist kein Fehler.
    await expect(fetchMinifigCount('60398')).resolves.toBeNull();
  });
});

describe('Bild laden', () => {
  it('gibt die Bytes zurueck', async () => {
    stubFetch(() => new Response(new Uint8Array([1, 2, 3])));

    const bytes = await fetchImageBytes('https://example.test/bild.jpg');

    expect(bytes?.byteLength).toBe(3);
  });

  it('gibt null zurueck, statt den Import scheitern zu lassen', async () => {
    stubFetch(() => new Response('', { status: 404 }));
    await expect(fetchImageBytes('https://example.test/weg.jpg')).resolves.toBeNull();

    stubFetch(() => {
      throw new Error('timeout');
    });
    await expect(fetchImageBytes('https://example.test/lahm.jpg')).resolves.toBeNull();
  });
});
