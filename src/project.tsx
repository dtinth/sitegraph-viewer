import { Orbit } from "./Orbit";
import { Vec3, addVec3, rotateX, rotateY, timesVec3 } from "./Vec3";

export interface Trackball {
  x: Vec3;
  y: Vec3;
  z: Vec3;
}
export const project = (
  vec: Vec3,
  orbit: Orbit,
  trackball: Trackball,
  anchor: Vec3
) => {
  // Put the focus point (anchor) the center of the screen
  vec = {
    x: vec.x - anchor.x,
    y: vec.y - anchor.y,
    z: vec.z - anchor.z,
  };

  // Apply trackball rotation
  vec = addVec3(
    addVec3(timesVec3(trackball.x, vec.x), timesVec3(trackball.y, vec.y)),
    timesVec3(trackball.z, vec.z)
  );

  // Apply orbit rotation
  vec = rotateY(vec, orbit.rotateY);
  vec = rotateX(vec, orbit.rotateX);

  // Apply scale
  const scale = Math.PI;
  vec.x *= scale;
  vec.y *= scale;
  vec.z *= scale;

  // Apply perspective projection
  const viewDistance = 8192;
  const factor = viewDistance / (viewDistance + vec.z);
  vec.x *= factor;
  vec.y *= factor;

  return vec;
};
