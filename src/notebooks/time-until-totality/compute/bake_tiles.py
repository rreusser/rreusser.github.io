"""
Bake eclipse bands into EPSG:3857 WebP tiles for a Mapbox raster-color layer.

Rasterize the umbra-band quads into a Web Mercator scalar field (days since the
earliest eclipse, earliest wins per pixel = each pixel's soonest future
totality), then encode a normalized log(years-until) value into 24 bits of RGB
and write lossless WebP tiles (max compression). The map decodes these on the
GPU with raster-color / raster-color-mix / raster-color-range and colors them
with a reversed viridis ramp; the exact same tiles are decoded byte-for-byte in
JavaScript for the click-to-read date. Pyramid z0..ZMAX, earliest wins under the
min-reduction at every zoom.

Encoding (per pixel that has an eclipse within the span):
    n   = clip((log(max(years, y0)) - LO) / (HI - LO), 0, 1)   in [0, 1]
    m   = round(n * (2**24 - 1))                                24-bit integer
    R,G,B = m>>16, (m>>8)&255, m&255      alpha = 255 (0 where no eclipse)
with LO = log(y0), HI = log(yearsMaxEff). Decode:
    m     = R*65536 + G*256 + B
    logyr = LO + (m / (2**24 - 1)) * (HI - LO)
    years = exp(logyr);   date = epoch + years * 365.25 days
The GPU reconstructs logyr via raster-color-mix = (HI-LO)/(2**24-1) * [255*65536,
255*256, 255] with offset LO, and raster-color-range = [LO, HI].
"""
import json
import os
import shutil
import warnings
from datetime import date
import numpy as np
from PIL import Image, ImageDraw
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(HERE, 'eclipse_bands.geojson')
OUT = os.path.normpath(os.path.join(HERE, '..', 'tiles'))
ZMAX = 6                       # world = 256*2^6 = 16384 px (~2.4 km/px)
TILE = 256
MERC_LAT = 85.05112878
Y0 = 0.05                      # years, floor of the log scale
MAXV = 2 ** 24 - 1
VIRIDIS_R = plt.get_cmap('viridis_r')   # soon = bright, far = dark
W = TILE * 2 ** ZMAX
EPOCH = None


def days_since_epoch(datestr):
    y, m, d = map(int, datestr.split('-'))
    return (date(y, m, d) - EPOCH).days


def lonlat_to_px(lon, lat):
    x = (np.asarray(lon) + 180.0) / 360.0 * W
    s = np.sin(np.radians(np.clip(lat, -MERC_LAT, MERC_LAT)))
    y = (0.5 - np.log((1 + s) / (1 - s)) / (4 * np.pi)) * W
    return x, y


def ring_to_px(ring):
    """Ring of [lon, lat] -> pixel points, longitudes unwrapped so a quad
    straddling the antimeridian stays one piece."""
    ulon = [ring[0][0]]
    for lon, _ in ring[1:]:
        prev = ulon[-1]
        while lon - prev > 180:
            lon -= 360
        while lon - prev < -180:
            lon += 360
        ulon.append(lon)
    pts = []
    for (_, lat), lon in zip(ring, ulon):
        x, y = lonlat_to_px(lon, lat)
        pts.append((float(x), float(y)))
    return pts


# --- rasterize the scalar field (days since epoch), earliest wins ---
fc = json.load(open(SRC))
EPOCH = date.fromisoformat(min(f['properties']['date'] for f in fc['features']))
feats = sorted(fc['features'], key=lambda f: f['properties']['date'], reverse=True)

scalar = Image.new('F', (W, W), float('nan'))
draw = ImageDraw.Draw(scalar)
for f in feats:
    val = float(days_since_epoch(f['properties']['date']))
    for poly in f['geometry']['coordinates']:
        pts = ring_to_px(poly[0])
        xs = [x for x, _ in pts]
        shifts = [0.0]
        if min(xs) < 0:
            shifts.append(W)
        if max(xs) > W:
            shifts.append(-W)
        for dx in shifts:
            draw.polygon([(x + dx, y) for x, y in pts], fill=val)

S = np.asarray(scalar)
have = ~np.isnan(S)
YEARS_MAX = float(np.nanmax(S)) / 365.25
YEARS_MAX_EFF = max(YEARS_MAX, Y0 * 4)
LO, HI = np.log(Y0), np.log(YEARS_MAX_EFF)
print(f"painted {have.sum():,} px  span {YEARS_MAX:.0f} yr  epoch {EPOCH}")


def norm_n(days):
    years = np.maximum(days / 365.25, Y0)
    return np.clip((np.log(years) - LO) / (HI - LO), 0, 1)


def reduce_min(arr, f):
    if f == 1:
        return arr
    with warnings.catch_warnings():
        warnings.simplefilter('ignore', RuntimeWarning)
        return np.nanmin(arr.reshape(arr.shape[0] // f, f, arr.shape[1] // f, f),
                         axis=(1, 3))


def encode(block):
    m = np.round(norm_n(np.nan_to_num(block)) * MAXV).astype(np.uint32)
    rgba = np.zeros(block.shape + (4,), np.uint8)
    rgba[..., 0] = (m >> 16) & 255
    rgba[..., 1] = (m >> 8) & 255
    rgba[..., 2] = m & 255
    rgba[..., 3] = np.where(np.isnan(block), 0, 255)
    return rgba


if os.path.isdir(OUT):
    shutil.rmtree(OUT)

total = 0
for z in range(ZMAX + 1):
    Sz = reduce_min(S, 2 ** (ZMAX - z))
    nt = 2 ** z
    for ty in range(nt):
        for tx in range(nt):
            blk = Sz[ty * TILE:(ty + 1) * TILE, tx * TILE:(tx + 1) * TILE]
            if not np.any(~np.isnan(blk)):
                continue
            d = f"{OUT}/{z}/{tx}"
            os.makedirs(d, exist_ok=True)
            Image.fromarray(encode(blk), 'RGBA').save(
                f"{d}/{ty}.webp", lossless=True, quality=100, method=6, exact=True)
            total += 1
    print(f"z{z}: cumulative {total} tiles")

json.dump({'zmax': ZMAX, 'tileSize': TILE, 'epoch': EPOCH.isoformat(),
           'y0': Y0, 'yearsMax': round(YEARS_MAX, 2),
           'yearsMaxEff': round(YEARS_MAX_EFF, 2),
           'encoding': 'm=R*65536+G*256+B; n=m/16777215; '
                       'years=exp(log(y0)+n*(log(yearsMaxEff)-log(y0)))'},
          open(os.path.join(OUT, 'manifest.json'), 'w'), indent=2)
print(f"{total} tiles -> {OUT}")

# --- preview.png (downsampled for memory), reversed viridis ---
PW = 2048
Sp = reduce_min(S, W // PW)
fig, ax = plt.subplots(figsize=(14, 9))
disp = VIRIDIS_R(norm_n(np.nan_to_num(Sp)))
disp[..., 3] = ~np.isnan(Sp)
ax.imshow(disp, origin='upper', zorder=2)
scale = PW / W
for feat in json.load(open(os.path.join(HERE, 'coastline.geojson')))['features']:
    geom = feat['geometry']
    lines = geom['coordinates'] if geom['type'] == 'MultiLineString' else [geom['coordinates']]
    for line in lines:
        arr = np.array(line)
        px, py = lonlat_to_px(arr[:, 0], arr[:, 1])
        ax.plot(px * scale, py * scale, color='#000', lw=0.4, alpha=0.4, zorder=1)
ax.set_xlim(0, PW)
ax.set_ylim(PW, 0)
ax.set_title('Years until next total eclipse (log color, soon = bright)')
fig.savefig(os.path.join(HERE, 'preview.png'), dpi=90, bbox_inches='tight')
print("wrote preview.png")
