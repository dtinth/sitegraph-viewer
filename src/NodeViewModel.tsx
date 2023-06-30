import { ForceNode } from "./Layout";
import { Vec2 } from "./Vec2";
import { Projector } from "./Projector";

export interface NodeViewModel extends Vec2 {}
export function createNodeViewModel(): NodeViewModel {
  return { x: 0, y: 0 };
}
export function updateNodeViewModel(
  vm: NodeViewModel,
  node: ForceNode,
  projector: Projector
) {
  const vec = projector(node);
  vm.x = vec.x;
  vm.y = vec.y;
}
