import { ForceNode } from "./Layout";
import { Vec2 } from "./Vec2";
import { Projector } from "./Projector";

export interface NodeViewModel extends Vec2 {
  focus: boolean;
}
export function createNodeViewModel(): NodeViewModel {
  return { x: 0, y: 0, focus: false };
}
export function updateNodeViewModel(
  vm: NodeViewModel,
  node: ForceNode,
  projector: Projector,
  focus: string
) {
  const vec = projector(node);
  vm.x = vec.x;
  vm.y = vec.y;
  vm.focus = node.id === focus;
}
