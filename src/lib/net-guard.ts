import { BlockList, isIP } from 'node:net';

/**
 * Which addresses the server may fetch on a user's behalf.
 *
 * The link import downloads pages and pictures from URLs people paste. Without
 * a guard, a link to http://192.168.1.1/ would make the server talk to the
 * router - or to any other device in the home network. Only public unicast
 * addresses pass. Pure, so it is unit tested.
 */

const blocked = new BlockList();

for (const [network, prefix] of [
  ['0.0.0.0', 8], // "this" network
  ['10.0.0.0', 8], // private
  ['100.64.0.0', 10], // carrier-grade NAT
  ['127.0.0.0', 8], // loopback
  ['169.254.0.0', 16], // link-local, cloud metadata
  ['172.16.0.0', 12], // private
  ['192.0.0.0', 24], // IETF protocol assignments
  ['192.0.2.0', 24], // documentation
  ['192.168.0.0', 16], // private
  ['198.18.0.0', 15], // benchmarking
  ['198.51.100.0', 24], // documentation
  ['203.0.113.0', 24], // documentation
  ['224.0.0.0', 4], // multicast
  ['240.0.0.0', 4], // reserved, broadcast
] as const) {
  blocked.addSubnet(network, prefix, 'ipv4');
}

for (const [network, prefix] of [
  ['::', 128], // unspecified
  ['::1', 128], // loopback
  ['64:ff9b::', 96], // NAT64 - would reach IPv4 space behind it
  ['100::', 64], // discard
  ['2001:db8::', 32], // documentation
  ['fc00::', 7], // unique local
  ['fe80::', 10], // link-local
  ['ff00::', 8], // multicast
] as const) {
  blocked.addSubnet(network, prefix, 'ipv6');
}

export function isPublicAddress(address: string): boolean {
  const version = isIP(address);
  if (version === 0) return false;

  if (version === 6) {
    // An IPv4 address in IPv6 clothing is judged as what it really is.
    const mapped = /^::ffff:(\d+\.\d+\.\d+\.\d+)$/i.exec(address);
    if (mapped) return isPublicAddress(mapped[1]!);
    return !blocked.check(address, 'ipv6');
  }

  return !blocked.check(address, 'ipv4');
}

/** Only plain web URLs on the standard ports; no credentials in the URL. */
export function isAllowedWebUrl(url: URL): boolean {
  if (url.protocol !== 'https:' && url.protocol !== 'http:') return false;
  if (url.username || url.password) return false;
  if (url.port && url.port !== '80' && url.port !== '443') return false;
  return true;
}
