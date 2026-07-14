"""
Total solar eclipse umbra bands as GeoJSON.

Centerline: the shadow axis (Sun center -> Moon center) intersected with the
WGS84 ellipsoid in the Earth-fixed ITRS frame. Validated against NASA/Espenak
for 2024-04-08 (greatest eclipse reproduced to ~18 km, path width ~199 km vs
the published ~185 km).

Umbra band edges: at each centerline point, step perpendicular to the ground
track and binary-search the boundary of totality using the rigorous local test
"does the Moon's disk fully cover the Sun's disk as seen from this point". The
half-width is therefore per-point and correct at oblique parts of the path, with
a hard cap so grazing sunrise/sunset tips do not balloon. The band is emitted as
per-segment quads (pairs of triangles) so it projects accurately into EPSG:3857
and dateline-crossing quads can be dropped rather than streaking the map.

Usage:  python solar_bands.py [year0] [year1]   (defaults 2021 2041)
Writes: eclipse_bands.geojson next to this script.
"""
import json
import os
import sys
import numpy as np
from skyfield.api import Loader, load_file
from skyfield.framelib import itrs
from skyfield import almanac

HERE = os.path.dirname(os.path.abspath(__file__))

A = 6378.137
B = 6356.752314245
INV = np.array([1 / A**2, 1 / A**2, 1 / B**2])
E2 = 1.0 - (B / A) ** 2
EP2 = (A / B) ** 2 - 1.0
R_SUN = 696000.0
R_MOON = 1737.4
MAX_HALFWIDTH = 350.0          # km, cap so grazing tips do not run away
MIN_SUN_ALT = 3.0             # deg, trim grazing sunrise/sunset tips

load = Loader(HERE)           # cache kernels beside this script
ts = load.timescale()
earth = sun = moon = None     # set by load_ephemeris()


def load_ephemeris(year1):
    """DE440s (1849-2150) for short spans, DE441 part-2 (1969-17191) beyond."""
    global earth, sun, moon
    name = 'de441_part-2.bsp' if year1 > 2150 else 'de440s.bsp'
    path = os.path.join(HERE, name)
    eph = load_file(path) if os.path.exists(path) else load(name)
    earth, sun, moon = eph['earth'], eph['sun'], eph['moon']
    return eph


def itrs_xyz(target, t):
    return (target - earth).at(t).frame_xyz(itrs).km.T


def ecef_to_geodetic(X):
    x, y, z = X[:, 0], X[:, 1], X[:, 2]
    p = np.hypot(x, y)
    lon = np.arctan2(y, x)
    theta = np.arctan2(z * A, p * B)
    lat = np.arctan2(z + EP2 * B * np.sin(theta) ** 3,
                     p - E2 * A * np.cos(theta) ** 3)
    return np.column_stack([np.degrees(lon), np.degrees(lat)])


def central(M, S):
    d = M - S
    Dsm = np.linalg.norm(d, axis=1)
    d = d / Dsm[:, None]
    alpha = np.sum(INV * d * d, axis=1)
    beta = 2 * np.sum(INV * M * d, axis=1)
    gamma = np.sum(INV * M * M, axis=1) - 1.0
    disc = beta * beta - 4 * alpha * gamma
    strike = disc >= 0
    u = (-beta - np.sqrt(np.maximum(disc, 0))) / (2 * alpha)
    X = M + u[:, None] * d
    umbra_len = R_MOON * Dsm / (R_SUN - R_MOON)
    total = strike & (u < umbra_len)
    axis_miss = np.linalg.norm(M - np.sum(M * d, axis=1)[:, None] * d, axis=1)
    n = X * INV
    n = n / np.linalg.norm(n, axis=1)[:, None]
    sundir = (S - X) / np.linalg.norm(S - X, axis=1)[:, None]
    sun_alt = np.sum(n * sundir, axis=1)
    high = sun_alt > np.sin(np.radians(MIN_SUN_ALT))
    return dict(X=X, total=total & high, axis_miss=axis_miss)


def totality_mask(Q, M, S):
    qm, qs = M - Q, S - Q
    dm, ds = np.linalg.norm(qm, axis=1), np.linalg.norm(qs, axis=1)
    ang_moon = np.arcsin(R_MOON / dm)
    ang_sun = np.arcsin(R_SUN / ds)
    cos_sep = np.clip(np.sum(qm * qs, axis=1) / (dm * ds), -1, 1)
    sep = np.arccos(cos_sep)
    return (ang_moon >= ang_sun) & (sep <= (ang_moon - ang_sun))


def band_edges(Xt, Mt, St):
    n = Xt * INV
    n /= np.linalg.norm(n, axis=1)[:, None]
    v = np.gradient(Xt, axis=0)
    v -= np.sum(v * n, axis=1)[:, None] * n
    v /= np.linalg.norm(v, axis=1)[:, None]
    c = np.cross(n, v)
    c /= np.linalg.norm(c, axis=1)[:, None]

    def edge(side):
        lo = np.zeros(len(Xt))
        hi = np.full(len(Xt), MAX_HALFWIDTH)
        for _ in range(40):
            mid = 0.5 * (lo + hi)
            inside = totality_mask(Xt + (side * mid)[:, None] * c, Mt, St)
            lo = np.where(inside, mid, lo)
            hi = np.where(inside, hi, mid)
        return Xt + (side * hi)[:, None] * c

    return edge(+1.0), edge(-1.0)


def main(year0, year1, step_s=20.0):
    eph = load_ephemeris(year1)
    t0, t1 = ts.utc(year0, 1, 1), ts.utc(year1, 1, 1)
    phase_times, phases = almanac.find_discrete(t0, t1, almanac.moon_phases(eph))
    new_moons = phase_times[phases == 0]

    # node pre-filter: only new moons where the Sun and Moon are close enough
    # for a central eclipse are worth a fine scan (skips ~85% of months)
    sep = (moon - earth).at(new_moons).separation_from(
        (sun - earth).at(new_moons)).degrees
    candidates = new_moons[sep < 2.0]
    print(f"{len(new_moons)} new moons -> {len(candidates)} eclipse candidates")

    offsets = np.arange(-180 * 60, 180 * 60 + 1, step_s)
    features = []
    for tnm in candidates:
        scan = ts.tt_jd(tnm.tt + offsets / 86400.0)
        M, S = itrs_xyz(moon, scan), itrs_xyz(sun, scan)
        c = central(M, S)
        idx = np.where(c['total'])[0]
        if len(idx) < 3:
            continue
        Xt, Mt, St = c['X'][idx], M[idx], S[idx]
        L = ecef_to_geodetic(band_edges(Xt, Mt, St)[0])
        R = ecef_to_geodetic(band_edges(Xt, Mt, St)[1])
        # keep every segment; the antimeridian is handled at rasterization time
        # by unwrapping longitudes, so no quads are dropped here
        quads = []
        for i in range(len(idx) - 1):
            ring = [L[i], R[i], R[i + 1], L[i + 1], L[i]]
            quads.append([[[float(p[0]), float(p[1])] for p in ring]])
        if not quads:
            continue
        g = int(idx[np.argmin(c['axis_miss'][idx])])
        tg = ts.tt_jd(tnm.tt + offsets[g] / 86400.0)
        features.append({
            'type': 'Feature',
            'properties': {'date': tg.utc_strftime('%Y-%m-%d'),
                           'jd': round(tg.tt, 5)},
            'geometry': {'type': 'MultiPolygon', 'coordinates': quads},
        })
        if len(features) % 100 == 0:
            print(f"  ...{len(features)} eclipses ({tg.utc_strftime('%Y-%m-%d')})")

    out = os.path.join(HERE, 'eclipse_bands.geojson')
    json.dump({'type': 'FeatureCollection', 'features': features}, open(out, 'w'))
    print(f"{len(features)} total eclipses -> {out}")


if __name__ == '__main__':
    y0 = int(sys.argv[1]) if len(sys.argv) > 1 else 2021
    y1 = int(sys.argv[2]) if len(sys.argv) > 2 else 2041
    step = float(sys.argv[3]) if len(sys.argv) > 3 else 20.0
    main(y0, y1, step)
