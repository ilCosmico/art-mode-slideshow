const test = require('node:test');
const assert = require('node:assert/strict');
const { getImageDimensions, getShapeBand } = require('./imageDimensions');

function jpegWithDimensions(width, height) {
  const buffer = Buffer.alloc(16);
  buffer.set([0xff, 0xd8, 0xff, 0xc0, 0x00, 0x11, 0x08], 0);
  buffer.writeUInt16BE(height, 7);
  buffer.writeUInt16BE(width, 9);
  return buffer;
}

function crc32(buf) {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc ^= buf[i];
    for (let k = 0; k < 8; k++) crc = crc & 1 ? (0xedb88320 ^ (crc >>> 1)) : (crc >>> 1);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function pngWithDimensions(width, height) {
  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  const type = Buffer.from('IHDR');
  const length = Buffer.alloc(4);
  length.writeUInt32BE(ihdrData.length);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([type, ihdrData])));
  return Buffer.concat([signature, length, type, ihdrData, crc]);
}

test('reads width/height from a JPEG SOF0 marker', () => {
  assert.deepEqual(getImageDimensions(jpegWithDimensions(200, 100)), { width: 200, height: 100 });
});

test('reads width/height from a PNG IHDR chunk', () => {
  assert.deepEqual(getImageDimensions(pngWithDimensions(50, 200)), { width: 50, height: 200 });
});

test('rejects unrecognized or truncated input instead of guessing', () => {
  assert.throws(() => getImageDimensions(Buffer.from('not an image')));
  assert.throws(() => getImageDimensions(Buffer.alloc(0)));
});

test('getShapeBand covers the whole ratio spectrum with no gaps', () => {
  assert.equal(getShapeBand(0.5), 'vertical');
  assert.equal(getShapeBand(0.999999), 'vertical');
  assert.equal(getShapeBand(1.0), 'square');
  assert.equal(getShapeBand(1.29), 'square');
  assert.equal(getShapeBand(1.3), 'rectangular');
  assert.equal(getShapeBand(1.59), 'rectangular');
  assert.equal(getShapeBand(1.6), 'panoramic');
  assert.equal(getShapeBand(3.5), 'panoramic');
});
