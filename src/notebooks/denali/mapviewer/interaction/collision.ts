export interface CollisionItem {
  layerIndex: number;
  featureIndex: number;
  screenX: number;
  screenY: number;
  halfW: number;
  halfH: number;
  depth: number;
  visible?: boolean;
}

interface PlacedBox {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}

export function runCollision(
  items: CollisionItem[],
  buffer: number = 0,
  screenW: number = Infinity,
  screenH: number = Infinity
): { items: CollisionItem[]; hiddenByLayer: Map<number, Set<number>> } {
  // Sort front-to-back (reversed-z: larger depth = closer)
  items.sort((a, b) => b.depth - a.depth);

  const placed: PlacedBox[] = [];
  const hiddenByLayer = new Map<number, Set<number>>();

  for (const item of items) {
    // Expand test bounds by buffer so boxes maintain minimum spacing
    const minX = item.screenX - item.halfW - buffer;
    const maxX = item.screenX + item.halfW + buffer;
    const minY = item.screenY - item.halfH - buffer;
    const maxY = item.screenY + item.halfH + buffer;

    // Reject items whose buffered bbox extends past screen edges
    let collides = minX < 0 || maxX > screenW || minY < 0 || maxY > screenH;

    if (!collides) {
      for (let i = 0; i < placed.length; i++) {
        const p = placed[i];
        if (minX < p.maxX && maxX > p.minX && minY < p.maxY && maxY > p.minY) {
          collides = true;
          break;
        }
      }
    }

    if (collides) {
      item.visible = false;
      let set = hiddenByLayer.get(item.layerIndex);
      if (!set) {
        set = new Set();
        hiddenByLayer.set(item.layerIndex, set);
      }
      set.add(item.featureIndex);
    } else {
      item.visible = true;
      // Store original (non-expanded) bounds so each pair maintains exactly `buffer` gap
      placed.push({
        minX: item.screenX - item.halfW,
        maxX: item.screenX + item.halfW,
        minY: item.screenY - item.halfH,
        maxY: item.screenY + item.halfH,
      });
    }
  }

  return { items, hiddenByLayer };
}
