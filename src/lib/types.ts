/** A labeled example. `y` 0 = ripe (teal disc), 1 = not ripe (orange diamond). */
export interface Point {
  x: [number, number];
  y: 0 | 1;
}

/**
 * The whole model. Four plain arrays — which are also exactly what the
 * mechanism-net panel draws (edge = weight sign/magnitude, node = activation).
 */
export interface Net {
  W1: [number, number][];
  b1: number[];
  W2: number[];
  b2: number;
}
