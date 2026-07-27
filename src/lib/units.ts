/**
 * Display units — spec §2.2. Both are quantities the fruit trade actually grades peaches
 * on: °Brix from a refractometer (8 watery, 16 candy) and pounds-force from a penetrometer
 * (14 rock, 2 eat-it-over-the-sink).
 *
 * NOTHING here ever reaches the model (spec §2.3). `forward()` consumes domain coordinates
 * and only domain coordinates; these are a transform at the tick and readout layer only.
 */
const KX = 4 / 1.15;
const KY = 6 / 1.15;

export const BRIX = { min: 8, max: 16, ticks: [8, 10, 12, 14, 16] } as const;
export const LBF = { min: 2, max: 14, ticks: [14, 11, 8, 5, 2] } as const;

export const toBrix = (x: number): number => 12 + KX * x;
export const fromBrix = (b: number): number => (b - 12) / KX;

/** Descending: +y is softer, and softer means LESS force to bruise it. */
export const toLbf = (y: number): number => 8 - KY * y;
export const fromLbf = (l: number): number => (8 - l) / KY;
