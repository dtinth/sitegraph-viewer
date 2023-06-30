import { Orbit } from "./Orbit";
import { Vec3 } from "./Vec3";

export const rotateX = (vec: Vec3, angle: number) => {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  const y = vec.y * cos - vec.z * sin;
  const z = vec.y * sin + vec.z * cos;
  return { ...vec, y, z };
};
export const rotateY = (vec: Vec3, angle: number) => {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  const x = vec.x * cos - vec.z * sin;
  const z = vec.x * sin + vec.z * cos;
  return { ...vec, x, z };
};
const add = (a: Vec3, b: Vec3) => {
  return { x: a.x + b.x, y: a.y + b.y, z: a.z + b.z };
};
const times = (a: Vec3, n: number) => {
  return { x: a.x * n, y: a.y * n, z: a.z * n };
};
export interface Trackball {
  x: Vec3;
  y: Vec3;
  z: Vec3;
}
export const project = (
  vec: Vec3,
  perspective: Orbit,
  trackball: Trackball,
  anchor: Vec3
) => {
  vec = {
    x: vec.x - anchor.x,
    y: vec.y - anchor.y,
    z: vec.z - anchor.z,
  };
  vec = add(
    add(times(trackball.x, vec.x), times(trackball.y, vec.y)),
    times(trackball.z, vec.z)
  );
  vec = rotateY(vec, perspective.rotateY);
  vec = rotateX(vec, perspective.rotateX);
  const scale = Math.PI;
  vec.x *= scale;
  vec.y *= scale;
  vec.z *= scale;

  // Perspective projection
  const viewDistance = 8192;
  const factor = viewDistance / (viewDistance + vec.z);
  vec.x *= factor;
  vec.y *= factor;

  return vec;
};
