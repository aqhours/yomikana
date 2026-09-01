export type ReactiveBandTracker = {
  baseline: number;
  envelope: number;
  response: number;
  initialized: boolean;
};

export const createReactiveBandTracker = (): ReactiveBandTracker => ({
  baseline: 0,
  envelope: 0,
  response: 0,
  initialized: false,
});

const clamp = (value: number) => Math.max(0, Math.min(1, value));

export const mapReactiveLevels = (bass: number, mid: number, high: number) => ({
  coverScale: 1 + clamp(bass) * .08,
  coverOpacity: clamp(mid) * .18 + clamp(high) * .04,
  glowScale: .88 + clamp(bass) * .24,
  glowOpacity: clamp(bass) * .25 + clamp(mid) * .1,
});

/**
 * Converts mastered audio energy into motion by comparing the current envelope
 * with a slow local baseline. Absolute loudness stays calm; musical rises pulse.
 */
export const updateReactiveBand = (tracker: ReactiveBandTracker, rawEnergy: number) => {
  const energy = clamp(rawEnergy);
  if (!tracker.initialized) {
    tracker.baseline = energy;
    tracker.envelope = energy;
    tracker.initialized = true;
  }

  const envelopeRate = energy > tracker.envelope ? .18 : .11;
  tracker.envelope += (energy - tracker.envelope) * envelopeRate;
  tracker.baseline += (tracker.envelope - tracker.baseline) * .012;

  const relativeRise = Math.max(0, tracker.envelope - tracker.baseline)
    / Math.max(.012, tracker.baseline * .08);
  const target = clamp(.015 + relativeRise * .985);
  const responseRate = target > tracker.response ? .1 : .026;
  tracker.response += (target - tracker.response) * responseRate;
  return tracker.response;
};
