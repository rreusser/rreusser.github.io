// Browser-specific tile fetching using Image and Canvas APIs
import {
  TERRAIN_ENDPOINT,
  SATELLITE_ENDPOINT,
  createFetcherTemplate,
  decodeTerrainData as decodeTerrainDataCore
} from './fetch-tile.js';

// Browser-specific image loader
function loadBrowserImage(url: string, ImageConstructor: new () => HTMLImageElement): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new ImageConstructor();
    img.crossOrigin = "Anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Failed to load image"));
    img.src = url;
  });
}

// Create browser-specific fetchers
function createFetcher(endpoint: string) {
  return createFetcherTemplate(endpoint, Image, loadBrowserImage as any);
}

const getTerrainTile = createFetcher(TERRAIN_ENDPOINT);
const getSatelliteTile = createFetcher(SATELLITE_ENDPOINT);

function readImageData(img: HTMLImageElement): Uint8ClampedArray {
  const canvas = document.createElement("canvas");
  canvas.width = img.width;
  canvas.height = img.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Failed to get 2D context");
  }
  ctx.drawImage(img, 0, 0);
  return ctx.getImageData(0, 0, img.width, img.height).data;
}

// Re-export core decode function
const decodeTerrainData = decodeTerrainDataCore;

export { 
  getTerrainTile,
  getSatelliteTile,
  readImageData,
  decodeTerrainData
};
