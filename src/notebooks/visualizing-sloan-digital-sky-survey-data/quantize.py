import gzip
import numpy as np
import os
import glob

# Number of least significant mantissa bits to zero out
# float16 has 10 mantissa bits, so we can zero 1-8 safely
BITS_TO_ZERO = 2

def quantize_float16(data, bits_to_zero):
    """Zero out least significant bits of float16 mantissa."""
    # Work with raw uint16 bits
    raw = data.view(np.uint16)
    # Create mask: keep sign (1) + exponent (5) + upper mantissa bits
    # Zero out the lower `bits_to_zero` bits
    mask = np.uint16((0xFFFF << bits_to_zero) & 0xFFFF)
    quantized = raw & mask
    return quantized.view(np.float16)

# Process all object files
files = sorted(glob.glob('objects_*.bin.gz'))
print(f"Processing {len(files)} files, zeroing {BITS_TO_ZERO} LSBs...")

total_original = 0
total_quantized = 0

for filepath in files:
    # Read and decompress
    with gzip.open(filepath, 'rb') as f:
        data = np.frombuffer(f.read(), dtype=np.float16)

    original_size = os.path.getsize(filepath)
    total_original += original_size

    # Quantize
    quantized = quantize_float16(data.copy(), BITS_TO_ZERO)

    # Recompress
    with gzip.open(filepath, 'wb', compresslevel=9) as f:
        f.write(quantized.tobytes())

    new_size = os.path.getsize(filepath)
    total_quantized += new_size

    reduction = (1 - new_size / original_size) * 100
    print(f"  {filepath}: {original_size/1024:.1f}KB -> {new_size/1024:.1f}KB ({reduction:+.1f}%)")

total_reduction = (1 - total_quantized / total_original) * 100
print(f"\nTotal: {total_original/1024/1024:.2f}MB -> {total_quantized/1024/1024:.2f}MB ({total_reduction:+.1f}%)")
