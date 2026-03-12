// Node.js tile fetching using sharp (bypasses JSDOM entirely)
import sharp from 'sharp';
import {
  TERRAIN_ENDPOINT,
  SATELLITE_ENDPOINT,
  SKU,
  MAPBOX_ACCESS_TOKEN,
  decodeTerrainData as decodeTerrainDataCore
} from './fetch-tile.js';
import type { TileCoords, TerrainTile } from './types.js';

/**
 * Fetch terrain tile using sharp for image processing
 */
export async function getTerrainTile({ x, y, z }: TileCoords): Promise<TerrainTile & { buffer: number }> {
  const url = TERRAIN_ENDPOINT
    .replace('$x', x.toString())
    .replace('$y', y.toString())
    .replace('$z', z.toString())
    .replace('$SKU', SKU)
    .replace('$ACCESS_TOKEN', MAPBOX_ACCESS_TOKEN);

  // Fetch image data
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch terrain tile: ${response.statusText}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  // Use sharp to decode image to RGBA
  const image = sharp(buffer);
  const metadata = await image.metadata();
  const { data, info } = await image
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  // Decode terrain data
  const elevations = decodeTerrainDataCore(data);

  const tileSize = Math.pow(2, Math.floor(Math.log2(info.width)));
  const tileBorder = (info.width - tileSize) / 2;

  return {
    data: elevations,
    width: info.width,
    height: info.height,
    tileSize,
    buffer: tileBorder
  };
}

export const decodeTerrainData = decodeTerrainDataCore;
