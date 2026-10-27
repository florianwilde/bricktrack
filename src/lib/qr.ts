import { EncodeHintType, QRCodeDecoderErrorCorrectionLevel, QRCodeEncoder } from '@zxing/library';

/**
 * A QR code as a self-contained SVG, drawn on the server.
 *
 * Uses the encoder of @zxing/library, which the scanner already ships, so a
 * label needs neither a further dependency nor any external service. One
 * path for all dark modules keeps the markup small and prints sharply at any
 * size. Error correction "M" survives a scuffed box corner.
 */
export function qrSvg(text: string, { quietZone = 4 }: { quietZone?: number } = {}): string {
  const hints = new Map([[EncodeHintType.CHARACTER_SET, 'UTF-8']]);
  const code = QRCodeEncoder.encode(text, QRCodeDecoderErrorCorrectionLevel.M, hints);
  const matrix = code.getMatrix();
  const size = matrix.getWidth();
  const total = size + quietZone * 2;

  let path = '';
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      if (matrix.get(x, y) === 1) path += `M${x + quietZone} ${y + quietZone}h1v1h-1z`;
    }
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${total} ${total}" shape-rendering="crispEdges"><rect width="${total}" height="${total}" fill="#fff"/><path d="${path}" fill="#000"/></svg>`;
}
