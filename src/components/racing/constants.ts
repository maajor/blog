export const TRACK_WIDTH = 22;
export const DEFAULT_RUNOFF = 18;
export const WALL_HEIGHT = 1.8;
export const WHEELBASE = 3.2;
export const CAR_LENGTH = 4.5;
export const CAR_WIDTH = 2.2;
export const MAX_SPEED = 85;
export const ACCELERATION = 38;
export const BRAKE_FORCE = 65;
export const MAX_STEER = 0.7;
export const STEER_SPEED = 3.5;
export const TOTAL_LAPS = 3;

// Tight sections: wall close to track (no runoff) — [startT, endT]
export const TIGHT_SECTIONS: [number, number][] = [
  [0.0, 0.10],
  [0.14, 0.2],
  [0.45, 0.55],
  [0.70, 0.78],
  [0.90, 1.00],
];

export function isTightSection(t: number): boolean {
  for (const [s, e] of TIGHT_SECTIONS) {
    if (t >= s && t <= e) return true;
  }
  return false;
}

export function getWallDistance(t: number): number {
  return isTightSection(t)
    ? TRACK_WIDTH / 2
    : TRACK_WIDTH / 2 + DEFAULT_RUNOFF;
}

// Runoff penalty (off-track slowdown)
export const OFFTRACK_HALF_WIDTH = TRACK_WIDTH / 2; // beyond this = off track
export const OFFTRACK_DRAG = 0.993; // multiply velocity by this each physics step (~0.7% loss per step)
export const OFFTRACK_ENGINE_MULT = 0.6; // reduce engine force to 60% on runoff

// Vehicle physics (raycast vehicle)
export const VEHICLE_MASS = 300;
export const MAX_ENGINE_FORCE = 300;
export const MAX_STEER_VALUE = 0.4;
export const MAX_BRAKE_FORCE = 4;

// Wheel configuration
export const WHEEL_RADIUS = 0.35;
export const WHEEL_SUSPENSION_REST = 0.3;
export const WHEEL_SUSPENSION_STIFFNESS = 50;
export const WHEEL_MAX_SUSPENSION_TRAVEL = 0.2;
export const WHEEL_MAX_SUSPENSION_FORCE = 100000;
export const WHEEL_FRICTION_SLIP = 2;
export const WHEEL_DAMPING_RELAXATION = 2.3;
export const WHEEL_DAMPING_COMPRESSION = 4.4;
export const WHEEL_ROLL_INFLUENCE = 0.01;
export const WHEEL_SIDE_FRICTION = 2.3;
export const WHEEL_FORWARD_ACCEL = 2;
export const WHEEL_SIDE_ACCEL = 2.2;
export const WHEEL_CUSTOM_SLIDING_ROT_SPEED = -30;

// Rapier update priorities
export const RAPIER_UPDATE_PRIORITY = -50;
export const BEFORE_RAPIER_UPDATE = RAPIER_UPDATE_PRIORITY + 1;
export const AFTER_RAPIER_UPDATE = RAPIER_UPDATE_PRIORITY - 1;
