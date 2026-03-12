import json
import os
from pathlib import Path

CACHE_FILE = Path('query_cache.json')

def load_cache():
    if CACHE_FILE.exists():
        return json.loads(CACHE_FILE.read_text())
    return {}

def save_cache(cache):
    CACHE_FILE.write_text(json.dumps(cache, indent=2))

def query_count(obj_class, z_min, z_max):
    """Query SDSS for object count, with caching."""
    cache = load_cache()
    key = f"{obj_class}_{z_min}_{z_max}"

    if key in cache:
        print(f"[cached] {obj_class} z={z_min}-{z_max}: {cache[key]:,}")
        return cache[key]

    from astroquery.sdss import SDSS
    query = f"""
    SELECT COUNT(*) as cnt
    FROM SpecObj
    WHERE class = '{obj_class}'
      AND z BETWEEN {z_min} AND {z_max}
      AND zWarning = 0
    """
    result = SDSS.query_sql(query)
    count = int(result['cnt'][0])

    cache[key] = count
    save_cache(cache)

    print(f"{obj_class} z={z_min}-{z_max}: {count:,}")
    return count

# Check galaxy counts beyond our current z=0.8 cutoff
print("Galaxies beyond z=0.8:")
for z_min, z_max in [(0.8, 1.0), (1.0, 1.2), (1.2, 1.5), (1.5, 2.0), (2.0, 3.0)]:
    query_count('GALAXY', z_min, z_max)

# Check what we have vs what exists for our current bins
print("\nVerify current galaxy bins:")
for z_min, z_max in [(0.02, 0.08), (0.08, 0.12), (0.12, 0.16), (0.16, 0.20),
                      (0.20, 0.25), (0.25, 0.30), (0.30, 0.40), (0.40, 0.50),
                      (0.50, 0.60), (0.60, 0.70), (0.70, 0.80)]:
    query_count('GALAXY', z_min, z_max)
