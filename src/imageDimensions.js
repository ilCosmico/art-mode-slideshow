const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const MAX_JPEG_MARKERS = 500;

function readPngDimensions(buffer) {
  if (buffer.length < 24 || !buffer.subarray(0, 8).equals(PNG_SIGNATURE)) return null;
  // IHDR is always the first chunk, right after the 8-byte signature.
  return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
}

function readJpegDimensions(buffer) {
  if (buffer.length < 4 || buffer[0] !== 0xff || buffer[1] !== 0xd8) return null;

  let offset = 2;
  for (let i = 0; i < MAX_JPEG_MARKERS && offset < buffer.length; i++) {
    if (buffer[offset] !== 0xff) {
      offset += 1; // resync on unexpected byte
      continue;
    }
    let markerOffset = offset + 1;
    while (markerOffset < buffer.length && buffer[markerOffset] === 0xff) markerOffset += 1; // skip fill bytes
    if (markerOffset >= buffer.length) break;

    const marker = buffer[markerOffset];
    offset = markerOffset + 1;

    const isStandalone = marker === 0x01 || (marker >= 0xd0 && marker <= 0xd9);
    if (isStandalone) continue;

    if (offset + 2 > buffer.length) break;
    const segmentLength = buffer.readUInt16BE(offset);
    if (segmentLength < 2) break;

    // SOF0-SOF15 carry the frame dimensions, except the DHT/JPG/DAC markers
    // that share the same numeric range but aren't frame headers.
    const isSofMarker = marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc;
    if (isSofMarker) {
      const payloadStart = offset + 2;
      if (payloadStart + 5 > buffer.length) break;
      return { height: buffer.readUInt16BE(payloadStart + 1), width: buffer.readUInt16BE(payloadStart + 3) };
    }

    if (marker === 0xda) break; // start of scan: compressed data, no SOF found before it
    offset += segmentLength;
  }
  return null;
}

function getImageDimensions(buffer) {
  const dims = buffer[0] === 0x89 ? readPngDimensions(buffer) : readJpegDimensions(buffer);
  if (!dims) throw new Error('unrecognized or unreadable image format');
  return dims;
}

// Mutually exclusive, cover the entire range of possible ratios.
function getShapeBand(ratio) {
  if (ratio < 1.0) return 'vertical';
  if (ratio < 1.3) return 'square';
  if (ratio < 1.6) return 'rectangular';
  return 'panoramic';
}

module.exports = { getImageDimensions, getShapeBand };
