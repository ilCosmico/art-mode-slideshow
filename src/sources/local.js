const fs = require('fs/promises');
const path = require('path');
const { randomElement } = require('../random');

const IMAGE_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp']);

async function getRandomLocalArtwork(localImagesPath) {
  const files = await fs.readdir(localImagesPath);
  const images = files.filter((f) => IMAGE_EXTENSIONS.has(path.extname(f).toLowerCase()));
  if (images.length === 0) throw new Error(`no images found in ${localImagesPath}`);

  const filename = randomElement(images);
  return {
    url: `/local-images/${encodeURIComponent(filename)}`,
    title: path.parse(filename).name,
    artist: null,
    source: 'local',
    sourceUrl: null,
  };
}

module.exports = { getRandomLocalArtwork };
