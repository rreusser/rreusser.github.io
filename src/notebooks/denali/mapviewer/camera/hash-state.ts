import { lonToMercatorX, latToMercatorY } from '../tiles/tile-math.js';
import type { CameraState } from '../core/types.ts';

function mercatorXToLon(x: number): number {
  return x * 360 - 180;
}

function mercatorYToLat(y: number): number {
  return Math.atan(Math.sinh(Math.PI * (1 - 2 * y))) * 180 / Math.PI;
}

function phiToBearing(phi: number): number {
  const deg = Math.atan2(-Math.cos(phi), Math.sin(phi)) * 180 / Math.PI;
  return ((deg % 360) + 360) % 360;
}

function bearingToPhi(bearing: number): number {
  const rad = bearing * Math.PI / 180;
  return Math.atan2(Math.cos(rad), -Math.sin(rad));
}

export function cameraStateToHash(state: CameraState): string {
  const { center, distance, phi, theta } = state;
  const lon = mercatorXToLon(center[0]);
  const lat = mercatorYToLat(center[2]);
  const bearing = phiToBearing(phi);
  const pitch = theta * 180 / Math.PI;

  return `#${lon.toFixed(5)}/${lat.toFixed(5)}/${bearing.toFixed(1)}/${pitch.toFixed(1)}/${distance.toPrecision(6)}/${center[1].toPrecision(6)}`;
}

export function hashToCameraState(hash: string): CameraState | null {
  if (!hash || hash.length < 2) return null;
  const parts = hash.slice(1).split('/').map(Number);
  if (parts.length < 5 || parts.some(isNaN)) return null;

  const [lon, lat, bearing, pitch, distance, elevation] = parts;
  if (!isFinite(lon) || !isFinite(lat) || !isFinite(bearing) || !isFinite(pitch) || !isFinite(distance) || distance <= 0) return null;

  return {
    center: [
      lonToMercatorX(lon),
      isFinite(elevation) ? elevation : 0,
      latToMercatorY(lat),
    ],
    distance,
    phi: bearingToPhi(bearing),
    theta: pitch * Math.PI / 180,
  };
}
