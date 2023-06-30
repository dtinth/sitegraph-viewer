import { Orbit } from "./Orbit";
import { Vec3 } from "./Vec3";

const rotateX = (vec: Vec3, angle: number) => {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  const y = vec.y * cos - vec.z * sin;
  const z = vec.y * sin + vec.z * cos;
  return { ...vec, y, z };
};
const rotateY = (vec: Vec3, angle: number) => {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  const x = vec.x * cos - vec.z * sin;
  const z = vec.x * sin + vec.z * cos;
  return { ...vec, x, z };
};
export const project = (vec: Vec3, perspective: Orbit, anchor: Vec3) => {
  vec = {
    x: vec.x - anchor.x,
    y: vec.y - anchor.y,
    z: vec.z - anchor.z,
  };
  vec = rotateY(vec, perspective.rotateY);
  vec = rotateX(vec, perspective.rotateX);
  const scale = 4;
  vec.x *= scale;
  vec.y *= scale;
  vec.z *= scale;
  return vec;
};
