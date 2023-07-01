import { Vec3 } from "./Vec3";

/**
 * Create a function that returns a Vec3 that approaches the target Vec3.
 * @param initial - The initial position of the Vec3.
 * @param speed - The speed of the approach.
 * @param depth - The depth of the trail. Adding more depth will make the approach accelerate more smoothly.
 * @returns An object with the `update` function that takes the target Vec3 and returns the Vec3 that approaches the target.
 */
export function createApproacher(initial: Vec3, speed = 1 / 10, depth = 1) {
  const trail = [{ x: initial.x, y: initial.y, z: initial.z }];
  for (let i = 0; i < depth; i++) {
    trail.push({ x: initial.x, y: initial.y, z: initial.z });
  }
  return {
    /**
     * Update the position so that it approaches the target.
     * @param target - The target Vec3.
     */
    approach(target: Vec3) {
      trail[0].x = target.x;
      trail[0].y = target.y;
      trail[0].z = target.z;
      for (let i = 1; i < trail.length; i++) {
        trail[i].x += (trail[i - 1].x - trail[i].x) * speed;
        trail[i].y += (trail[i - 1].y - trail[i].y) * speed;
        trail[i].z += (trail[i - 1].z - trail[i].z) * speed;
      }
    },

    /**
     * The current position. This vector will be mutated by the `approach` function.
     * Do not mutate this vector directly or keep a reference to it.
     */
    position: trail[trail.length - 1],
  };
}
