export const randomRange = (min: number, max: number) => Math.random() * (max - min) + min;

export const randomInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;

export const degToRad = (deg: number) => (deg * Math.PI) / 180;

// Easing functions
// t: current time, b: start value, c: change in value, d: duration

export const easeOutQuad = (t: number, b: number, c: number, d: number) => {
  t /= d;
  return -c * t * (t - 2) + b;
};

export const easeOutBack = (t: number, b: number, c: number, d: number, s = 1.70158) => {
  t = t / d - 1;
  return c * (t * t * ((s + 1) * t + s) + 1) + b;
};

export const linear = (t: number, b: number, c: number, d: number) => {
  return c * t / d + b;
};

export const clamp = (val: number, min: number, max: number) => Math.min(Math.max(val, min), max);