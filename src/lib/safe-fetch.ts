import 'server-only';
import { lookup as dnsLookup, type LookupAddress } from 'node:dns';
import http from 'node:http';
import https from 'node:https';
import { isIP, type LookupFunction } from 'node:net';
import { Readable } from 'node:stream';
import zlib from 'node:zlib';
import { isAllowedWebUrl, isPublicAddress } from './net-guard';

/**
 * Fetches a URL a user pasted - and nothing else.
 *
 * - Every hostname is resolved first and refused if any of its addresses is
 *   not public (see net-guard.ts). The check happens inside the socket's DNS
 *   lookup, so a second resolution cannot swap in a private address.
 * - Redirects are followed by hand, and every hop passes the same checks.
 * - Size and time are capped, compressed bodies included.
 */

export class SafeFetchError extends Error {}

export type SafeResponse = {
  status: number;
  url: string;
  contentType: string;
  body: Buffer;
};

type Options = {
  maxBytes?: number;
  timeoutMs?: number;
  accept?: string;
};

const MAX_REDIRECTS = 4;

// A regular browser identity: some shops answer anything else with an error
// page. It is one request per paste, the same a browser preview would make.
const USER_AGENT =
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0 Safari/537.36';

const guardedLookup = ((
  hostname: string,
  options: { all?: boolean; family?: number },
  callback: (error: Error | null, address: string | LookupAddress[], family?: number) => void,
) => {
  dnsLookup(hostname, { family: options.family ?? 0, all: true }, (error, addresses) => {
    if (error) return callback(error, '', 4);
    if (addresses.length === 0 || addresses.some((entry) => !isPublicAddress(entry.address))) {
      return callback(new SafeFetchError(`${hostname} zeigt auf eine interne Adresse.`), '', 4);
    }
    if (options.all) return callback(null, addresses);
    callback(null, addresses[0]!.address, addresses[0]!.family);
  });
}) as unknown as LookupFunction;

function checkUrl(url: URL) {
  if (!isAllowedWebUrl(url)) throw new SafeFetchError('Nur normale http- und https-Links.');

  // Literal IPs never reach the DNS lookup, so they are checked here.
  const host = url.hostname.replace(/^\[|\]$/g, '');
  if (isIP(host) && !isPublicAddress(host)) {
    throw new SafeFetchError('Interne Adressen werden nicht abgerufen.');
  }
}

function decode(response: http.IncomingMessage): Readable {
  switch ((response.headers['content-encoding'] ?? '').toLowerCase()) {
    case 'gzip':
    case 'x-gzip':
      return response.pipe(zlib.createGunzip());
    case 'deflate':
      return response.pipe(zlib.createInflate());
    case 'br':
      return response.pipe(zlib.createBrotliDecompress());
    default:
      return response;
  }
}

function requestOnce(url: URL, options: Required<Options>, signal: AbortSignal) {
  return new Promise<{ status: number; location: string | null; contentType: string; body: Buffer }>(
    (resolve, reject) => {
      const client = url.protocol === 'https:' ? https : http;
      const request = client.get(
        url,
        {
          lookup: guardedLookup,
          signal,
          headers: {
            'user-agent': USER_AGENT,
            accept: options.accept,
            'accept-language': 'de-DE,de;q=0.9,en;q=0.6',
            'accept-encoding': 'gzip, deflate, br',
          },
        },
        (response) => {
          const status = response.statusCode ?? 0;
          const location = response.headers.location ?? null;
          const contentType = response.headers['content-type'] ?? '';

          if (status >= 300 && status < 400 && location) {
            response.resume();
            resolve({ status, location, contentType, body: Buffer.alloc(0) });
            return;
          }

          const chunks: Buffer[] = [];
          let size = 0;
          const stream = decode(response);
          stream.on('data', (chunk: Buffer) => {
            size += chunk.byteLength;
            if (size > options.maxBytes) {
              request.destroy();
              stream.destroy();
              reject(new SafeFetchError('Die Seite ist zu groß.'));
              return;
            }
            chunks.push(chunk);
          });
          stream.on('end', () =>
            resolve({ status, location: null, contentType, body: Buffer.concat(chunks) }),
          );
          stream.on('error', reject);
        },
      );
      request.on('error', reject);
    },
  );
}

export async function safeFetch(rawUrl: string | URL, options: Options = {}): Promise<SafeResponse> {
  const settings: Required<Options> = {
    maxBytes: options.maxBytes ?? 3 * 1024 * 1024,
    timeoutMs: options.timeoutMs ?? 10_000,
    accept: options.accept ?? 'text/html,application/xhtml+xml;q=0.9,*/*;q=0.5',
  };
  const signal = AbortSignal.timeout(settings.timeoutMs);

  let url = new URL(rawUrl);
  for (let hop = 0; hop <= MAX_REDIRECTS; hop += 1) {
    checkUrl(url);

    let result;
    try {
      result = await requestOnce(url, settings, signal);
    } catch (error) {
      if (error instanceof SafeFetchError) throw error;
      if (signal.aborted) throw new SafeFetchError('Die Seite hat zu lange gebraucht.');
      throw new SafeFetchError('Die Seite war nicht erreichbar.');
    }

    if (result.location) {
      url = new URL(result.location, url);
      continue;
    }

    return {
      status: result.status,
      url: url.toString(),
      contentType: result.contentType,
      body: result.body,
    };
  }

  throw new SafeFetchError('Zu viele Weiterleitungen.');
}
