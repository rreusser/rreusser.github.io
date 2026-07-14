"""
Derive click-query assets from eclipse_bands.geojson:

  ../outlines/{id}.json   one Feature per eclipse, geometry = MultiLineString of
                          the band boundary (drawn as lines on click). Lines have
                          no inside/outside, so pole-wrapping and dateline-
                          crossing bands draw correctly with no polygon ambiguity.
  eclipse-query.geojson   every umbra quad as its own tiny Polygon, tagged with
                          its eclipse id, with antimeridian-straddling quads
                          dropped. tippecanoe turns this into z6 tiles; a click
                          fetches one tile and tests point-in-quad to collect the
                          ids of every eclipse whose band covers the point. Quads
                          are tiny, so there is no globe-spanning / pole ambiguity.

Usage:  python make_outlines.py   (then run tippecanoe on eclipse-query.geojson)
"""
import json
import os
import shutil
from shapely.geometry import Polygon, box, mapping
from shapely.ops import unary_union
import shapely.affinity as aff

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(HERE, 'eclipse_bands.geojson')
QUERY = os.path.join(HERE, 'eclipse-query.geojson')                  # tippecanoe input
OUTLINE_DIR = os.path.normpath(os.path.join(HERE, '..', 'outlines'))  # per-id, drawn on click
STEP = 3         # decimate edge samples for the drawn outline (60 s -> 180 s)
ND = 3           # coordinate rounding, decimals (~110 m)


def edges_from_quads(quads):
    L = [q[0][0] for q in quads] + [quads[-1][0][3]]
    R = [q[0][1] for q in quads] + [quads[-1][0][2]]
    return L, R


def rnd(p):
    return [round(p[0], ND), round(p[1], ND)]


def split_line(ring):
    """Break a polyline at the antimeridian, extending each piece to +/-180 with
    an interpolated vertex so the halves meet (no gap) under world-copy wrapping."""
    lines, cur = [], [ring[0]]
    for p in ring[1:]:
        a = cur[-1]
        if abs(p[0] - a[0]) > 180:
            if a[0] > 0:                     # a near +180, p near -180
                edge_a, edge_b, bx = 180.0, -180.0, p[0] + 360
            else:                            # a near -180, p near +180
                edge_a, edge_b, bx = -180.0, 180.0, p[0] - 360
            latc = round(a[1] + (edge_a - a[0]) / (bx - a[0]) * (p[1] - a[1]), ND)
            cur.append([edge_a, latc])
            if len(cur) > 1:
                lines.append(cur)
            cur = [[edge_b, latc], p]
        else:
            cur.append(p)
    if len(cur) > 1:
        lines.append(cur)
    return lines


def outline_multiline(L, R):
    """Band boundary (both edges + end caps) as dateline-split line segments."""
    idx = list(range(0, len(L), STEP))
    if idx[-1] != len(L) - 1:
        idx.append(len(L) - 1)
    ring = [rnd(L[i]) for i in idx] + [rnd(R[i]) for i in reversed(idx)]
    ring.append(ring[0])
    return split_line(ring)


if os.path.isdir(OUTLINE_DIR):
    shutil.rmtree(OUTLINE_DIR)
os.makedirs(OUTLINE_DIR)

def round_coords(x):
    return round(x, ND) if isinstance(x, (int, float)) else [round_coords(v) for v in x]


def quad_pieces(ring):
    """A quad as shapely polygon(s). A dateline-straddling quad is split at
    +/-180 into East and West pieces (each reaching the edge) so a union of the
    quads has no gap at the dateline."""
    lons = [c[0] for c in ring]
    if max(lons) - min(lons) <= 180:
        return [Polygon(ring)]
    u = [list(ring[0])]                       # unwrap to a continuous ring
    for c in ring[1:]:
        lon = c[0]
        while lon - u[-1][0] > 180:
            lon -= 360
        while lon - u[-1][0] < -180:
            lon += 360
        u.append([lon, c[1]])
    poly = Polygon(u).buffer(0)
    cross = 180.0 if u[0][0] > 0 else -180.0
    xs = [p[0] for p in u]
    parts = [(poly.intersection(box(min(xs) - 1, -90, cross, 90)),
              360.0 if cross == -180 else 0.0),
             (poly.intersection(box(cross, -90, max(xs) + 1, 90)),
              -360.0 if cross == 180 else 0.0)]
    return [aff.translate(p, xoff=s) if s else p for p, s in parts if not p.is_empty]


def to_polygons(geom):
    if geom.geom_type == 'Polygon':
        return [geom]
    if geom.geom_type == 'MultiPolygon':
        return list(geom.geoms)
    return [g for g in getattr(geom, 'geoms', []) if g.geom_type == 'Polygon']


bands = json.load(open(SRC))
query_features = []
eid = 0
for ft in bands['features']:
    quads = ft['geometry']['coordinates']
    L, R = edges_from_quads(quads)
    lines = outline_multiline(L, R)
    if not lines:
        continue
    props = {'id': eid, 'date': ft['properties']['date'], 'jd': ft['properties']['jd']}

    # split quads at the dateline; the pieces feed both the query tiles and the
    # fill, so both reach the dateline (clickable + gapless across the wrap)
    pieces = [p for q in quads for p in quad_pieces(q[0])]
    for p in pieces:
        for poly in to_polygons(p):
            geom = mapping(poly)
            geom['coordinates'] = round_coords(geom['coordinates'])
            query_features.append({'type': 'Feature', 'properties': {'id': eid}, 'geometry': geom})
    fill = unary_union([p.buffer(0) for p in pieces])
    fill_geom = mapping(fill)
    fill_geom['coordinates'] = round_coords(fill_geom['coordinates'])

    # per-id file: MultiLineString outline (crisp lines) + fill polygon (subtle emphasis)
    json.dump({'type': 'FeatureCollection', 'features': [
        {'type': 'Feature', 'properties': {**props, 'kind': 'outline'},
         'geometry': {'type': 'MultiLineString', 'coordinates': lines}},
        {'type': 'Feature', 'properties': {**props, 'kind': 'fill'}, 'geometry': fill_geom},
    ]}, open(os.path.join(OUTLINE_DIR, f'{eid}.json'), 'w'), separators=(',', ':'))
    eid += 1

json.dump({'type': 'FeatureCollection', 'features': query_features},
          open(QUERY, 'w'), separators=(',', ':'))
print(f"{eid} eclipses: outlines -> {OUTLINE_DIR}/")
print(f"{len(query_features)} query quads -> {QUERY} ({os.path.getsize(QUERY) / 1e6:.1f} MB)")
