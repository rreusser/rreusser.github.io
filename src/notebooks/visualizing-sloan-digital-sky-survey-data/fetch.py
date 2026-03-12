from astroquery.sdss import SDSS
import astropy.units as u
from astropy.cosmology import Planck18 as cosmo
import numpy as np
import json
import gzip
import os

# Query SDSS in redshift bins to avoid the 500k row limit
# Galaxies extend to z~1.2, QSOs much further
GALAXY_BINS = [
    (0.02, 0.08),
    (0.08, 0.12),
    (0.12, 0.16),
    (0.16, 0.20),
    (0.20, 0.25),
    (0.25, 0.30),
    (0.30, 0.40),
    (0.40, 0.50),
    (0.50, 0.60),
    (0.60, 0.70),
    (0.70, 0.75),  # Split to avoid timeout
    (0.75, 0.80),
    (0.80, 0.85),
    (0.85, 0.90),
    (0.90, 0.95),
    (0.95, 1.00),
    (1.00, 1.10),
    (1.10, 1.20),
]

# QSOs extend to much higher redshifts
QSO_BINS = [
    (0.02, 0.50),
    (0.50, 1.00),
    (1.00, 1.50),
    (1.50, 2.00),
    (2.00, 2.50),
    (2.50, 3.00),
    (3.00, 4.00),
    (4.00, 5.00),
    (5.00, 7.00),
]

all_chunks = []
chunk_metadata = []
total_compressed = 0
total_raw = 0

# Track global min/max for bounds
# Separate z ranges for galaxies and QSOs for normalization
galaxy_z_min = float('inf')
galaxy_z_max = float('-inf')
qso_z_min = float('inf')
qso_z_max = float('-inf')
global_bounds = {
    'x_min': float('inf'), 'x_max': float('-inf'),
    'y_min': float('inf'), 'y_max': float('-inf'),
    'z_min': float('inf'), 'z_max': float('-inf'),
}

print("Querying SDSS galaxies...")

for i, (z_min, z_max) in enumerate(GALAXY_BINS):
    # Join with PhotoObjAll to get g-r color
    query = f"""
    SELECT
        s.ra, s.dec, s.z,
        p.modelMag_g - p.modelMag_r AS gr_color
    FROM SpecObj s
    JOIN PhotoObjAll p ON s.bestObjID = p.objID
    WHERE
        s.class = 'GALAXY'
        AND s.z BETWEEN {z_min} AND {z_max}
        AND s.zWarning = 0
        AND p.modelMag_g > 0 AND p.modelMag_g < 30
        AND p.modelMag_r > 0 AND p.modelMag_r < 30
    """

    print(f"  Galaxy bin {i}: z = {z_min:.2f} - {z_max:.2f}...", end=" ", flush=True)

    try:
        data = SDSS.query_sql(query)
        if data is None or len(data) == 0:
            print("no data")
            continue
        print(f"{len(data):,} galaxies")
    except Exception as e:
        print(f"error: {e}")
        continue

    redshift = np.array(data['z'])
    gr_color = np.array(data['gr_color'])
    distance = cosmo.comoving_distance(redshift).to(u.Mpc).value

    ra = np.deg2rad(data['ra'])
    dec = np.deg2rad(data['dec'])

    x = distance * np.cos(dec) * np.cos(ra)
    y = distance * np.cos(dec) * np.sin(ra)
    z_coord = distance * np.sin(dec)

    # Update bounds
    galaxy_z_min = min(galaxy_z_min, redshift.min())
    galaxy_z_max = max(galaxy_z_max, redshift.max())
    global_bounds['x_min'] = min(global_bounds['x_min'], x.min())
    global_bounds['x_max'] = max(global_bounds['x_max'], x.max())
    global_bounds['y_min'] = min(global_bounds['y_min'], y.min())
    global_bounds['y_max'] = max(global_bounds['y_max'], y.max())
    global_bounds['z_min'] = min(global_bounds['z_min'], z_coord.min())
    global_bounds['z_max'] = max(global_bounds['z_max'], z_coord.max())

    all_chunks.append({
        'x': x, 'y': y, 'z_coord': z_coord, 'redshift': redshift,
        'gr_color': gr_color, 'obj_class': 'GALAXY',
        'z_range': (z_min, z_max)
    })

print(f"\nQuerying SDSS quasars...")

for i, (z_min, z_max) in enumerate(QSO_BINS):
    query = f"""
    SELECT
        s.ra, s.dec, s.z,
        p.modelMag_g - p.modelMag_r AS gr_color
    FROM SpecObj s
    JOIN PhotoObjAll p ON s.bestObjID = p.objID
    WHERE
        s.class = 'QSO'
        AND s.z BETWEEN {z_min} AND {z_max}
        AND s.zWarning = 0
        AND p.modelMag_g > 0 AND p.modelMag_g < 30
        AND p.modelMag_r > 0 AND p.modelMag_r < 30
    """

    print(f"  QSO bin {i}: z = {z_min:.2f} - {z_max:.2f}...", end=" ", flush=True)

    try:
        data = SDSS.query_sql(query)
        if data is None or len(data) == 0:
            print("no data")
            continue
        print(f"{len(data):,} QSOs")
    except Exception as e:
        print(f"error: {e}")
        continue

    redshift = np.array(data['z'])
    gr_color = np.array(data['gr_color'])
    distance = cosmo.comoving_distance(redshift).to(u.Mpc).value

    ra = np.deg2rad(data['ra'])
    dec = np.deg2rad(data['dec'])

    x = distance * np.cos(dec) * np.cos(ra)
    y = distance * np.cos(dec) * np.sin(ra)
    z_coord = distance * np.sin(dec)

    # Update bounds
    qso_z_min = min(qso_z_min, redshift.min())
    qso_z_max = max(qso_z_max, redshift.max())
    global_bounds['x_min'] = min(global_bounds['x_min'], x.min())
    global_bounds['x_max'] = max(global_bounds['x_max'], x.max())
    global_bounds['y_min'] = min(global_bounds['y_min'], y.min())
    global_bounds['y_max'] = max(global_bounds['y_max'], y.max())
    global_bounds['z_min'] = min(global_bounds['z_min'], z_coord.min())
    global_bounds['z_max'] = max(global_bounds['z_max'], z_coord.max())

    all_chunks.append({
        'x': x, 'y': y, 'z_coord': z_coord, 'redshift': redshift,
        'gr_color': gr_color, 'obj_class': 'QSO',
        'z_range': (z_min, z_max)
    })

galaxy_count = sum(len(c['redshift']) for c in all_chunks if c['obj_class'] == 'GALAXY')
qso_count = sum(len(c['redshift']) for c in all_chunks if c['obj_class'] == 'QSO')

print(f"\nTotal: {galaxy_count:,} galaxies + {qso_count:,} QSOs = {galaxy_count + qso_count:,} objects")
print(f"Galaxy redshift range: {galaxy_z_min:.4f} - {galaxy_z_max:.4f}")
print(f"QSO redshift range: {qso_z_min:.4f} - {qso_z_max:.4f}")

# Compute color parameter:
# - Galaxies: [0, 0.5) based on redshift (white → red)
# - QSOs: [0.5, 1.0] based on redshift (blue → red)
print("\nSaving chunks...")

for i, chunk_data in enumerate(all_chunks):
    x = chunk_data['x']
    y = chunk_data['y']
    z_coord = chunk_data['z_coord']
    redshift = chunk_data['redshift']
    obj_class = chunk_data['obj_class']

    if obj_class == 'GALAXY':
        # Normalize galaxy redshift to [0, 0.5)
        z_norm = (redshift - galaxy_z_min) / (galaxy_z_max - galaxy_z_min)
        color_param = z_norm * 0.499  # Stay just under 0.5
    else:
        # Normalize QSO redshift to [0.5, 1.0]
        z_norm = (redshift - qso_z_min) / (qso_z_max - qso_z_min)
        color_param = 0.5 + z_norm * 0.5

    # Pack as float16x4: x, y, z, color_param
    points = np.column_stack((x, y, z_coord, color_param)).astype(np.float16)

    # Shuffle within chunk for better visual distribution during progressive loading
    np.random.seed(42 + i)
    np.random.shuffle(points)

    filename = f"objects_{i:02d}.bin.gz"
    raw_size = points.nbytes

    with gzip.open(filename, "wb", compresslevel=9) as f:
        f.write(points.tobytes())

    compressed_size = os.path.getsize(filename)
    total_compressed += compressed_size
    total_raw += raw_size

    z_min, z_max = chunk_data['z_range']
    chunk_metadata.append({
        "file": filename,
        "count": len(points),
        "byteLength": raw_size,
        "compressedSize": compressed_size,
        "redshiftRange": [z_min, z_max],
        "objectClass": obj_class
    })

    ratio = (1 - compressed_size / raw_size) * 100
    label = "galaxies" if obj_class == 'GALAXY' else "QSOs"
    print(f"  {filename}: {obj_class} z={z_min:.2f}-{z_max:.2f}, {len(points):,} {label}, {compressed_size / 1024 / 1024:.2f} MB ({ratio:.0f}% smaller)")

# Save metadata
metadata = {
    "totalCount": sum(c['count'] for c in chunk_metadata),
    "galaxyCount": galaxy_count,
    "qsoCount": qso_count,
    "format": "float16x4",
    "bytesPerVertex": 8,
    "layout": ["x", "y", "z", "color_param"],
    "colorParamDescription": "0-0.5: galaxies (white→red by z), 0.5-1.0: QSOs (blue→red by z)",
    "units": "Mpc",
    "galaxyRedshiftRange": [float(galaxy_z_min), float(galaxy_z_max)],
    "qsoRedshiftRange": [float(qso_z_min), float(qso_z_max)],
    "bounds": {
        "min": [float(global_bounds['x_min']), float(global_bounds['y_min']), float(global_bounds['z_min'])],
        "max": [float(global_bounds['x_max']), float(global_bounds['y_max']), float(global_bounds['z_max'])],
    },
    "chunks": chunk_metadata
}

with open("objects.json", "w") as f:
    json.dump(metadata, f, indent=2)

print(f"\nTotal: {metadata['totalCount']:,} objects ({galaxy_count:,} galaxies + {qso_count:,} QSOs)")
print(f"Total size: {total_compressed / 1024 / 1024:.2f} MB compressed, {total_raw / 1024 / 1024:.2f} MB raw")
print("Saved objects.json")
