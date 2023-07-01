import { ForceNode } from "./Layout";
import { Vec2 } from "./Vec2";
import { Projector } from "./Projector";
import { Path } from "./createPathFinder";

export interface NodeViewModel extends Vec2 {
  tint: number;
  zIndex: number;
  showText: boolean;
  scale: number;
}
export function createNodeViewModel(): NodeViewModel {
  return { x: 0, y: 0, tint: 0xffffff, zIndex: 0, showText: false, scale: 1 };
}
export function updateNodeViewModel(
  vm: NodeViewModel,
  node: ForceNode,
  projector: Projector,
  focus: string,
  hover: string | undefined,
  pathFromHome: Path,
  pathFromFocusToHover: Path,
  forwardLinks: Set<string>,
  backLinks: Set<string>
) {
  const vec = projector(node.displayPos);
  vm.x = vec.x;
  vm.y = vec.y;

  const focused = node.id === focus;
  const hovering = node.id === hover;
  if (focused || hovering || pathFromFocusToHover.hasNode(node.id)) {
    vm.tint = 0xd7fc70;
    vm.zIndex = 4;
    vm.showText = true;
  } else if (pathFromHome.hasNode(node.id)) {
    vm.tint = 0xbbeeff;
    vm.zIndex = 3;
    vm.showText = true;
  } else if (forwardLinks.has(node.id)) {
    vm.tint = 0xffff99;
    vm.zIndex = 2;
    vm.showText = true;
  } else if (backLinks.has(node.id)) {
    vm.tint = 0xffffff;
    vm.zIndex = 1;
    vm.showText = true;
  } else {
    vm.tint = 0x8b8685;
    vm.zIndex = 0;
    vm.showText = false;
  }

  vm.scale = focused ? 2 : 1;
}
