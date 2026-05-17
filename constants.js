export const canvas = document.getElementById("canvas");
export const ctx = canvas.getContext("2d");
export const W = canvas.width;
export const H = canvas.height;

export const ROAD_WIDTH = 160;
export const LANE_WIDTH = ROAD_WIDTH / 5;
export const INTERSECTION_CENTER = { x: W / 2, y: H / 2 };
export const STOP_LINE_DIST = 200;
export const CAR_LENGTH = 40;
export const CAR_WIDTH = 20;
export const CAR_COLORS = [
  "#e74c3c",
  "#3498db",
  "#2ecc71",
  "#f39c12",
  "#9b59b6",
];
export const PEDESTRIAN_SPEED = 2;
export const CROSSWALK_WIDTH = 30;
export const MAX_CARS = 10;
export const COLLISION_DIST = 50;
export const LANE_CHANGE_DIST = 100;

export const DIR_VECTORS = [
  { x: 0, y: -1 },
  { x: 1, y: 0 },
  { x: 0, y: 1 },
  { x: -1, y: 0 },
];

export function dist(a, b) {
  return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
}

export function lerp(a, b, t) {
  return a + (b - a) * t;
}

export function clamp(val, min, max) {
  return Math.max(min, Math.min(max, val));
}

export function randomChoice(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function rectsOverlap(r1, r2) {
  return (
    r1.x < r2.x + r2.w &&
    r1.x + r1.w > r2.x &&
    r1.y < r2.y + r2.h &&
    r1.y + r1.h > r2.y
  );
}
