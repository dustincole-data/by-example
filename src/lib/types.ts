/** A labeled 2D example. `intruder` is a Beat-3 annotation, not a model property. */
export interface Point {
  x: [number, number];
  y: 0 | 1;
  intruder?: boolean;
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

/** One epoch of the recorded run: the weights plus the model's real metrics. */
export interface Snapshot {
  w: Net;
  acc: number;
  loss: number;
  conf: number;
}

export type Brush = 0 | 1;
