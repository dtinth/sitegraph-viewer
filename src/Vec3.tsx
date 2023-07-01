export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

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
export const addVec3 = (a: Vec3, b: Vec3) => {
  return { x: a.x + b.x, y: a.y + b.y, z: a.z + b.z };
};
export const timesVec3 = (a: Vec3, n: number) => {
  return { x: a.x * n, y: a.y * n, z: a.z * n };
};
