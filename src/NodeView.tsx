import * as PIXI from "pixi.js";
import { ForceNode } from "./Layout";
import { NodeViewModel } from "./NodeViewModel";

export interface NodeView {
  group: PIXI.Container;
  circle: PIXI.Graphics;
  text: PIXI.Text;
}
export function createNodeView(
  circleTemplate: PIXI.Graphics,
  node: ForceNode
): NodeView {
  const group = new PIXI.Container();
  const circle = new PIXI.Graphics(circleTemplate.geometry);
  const text = new PIXI.Text(node.id, {
    fontFamily: "sans-serif",
    fontSize: 10,
    fill: 16777215,
  });
  const nodeView: NodeView = { group, circle, text };
  group.addChild(circle);
  group.addChild(text);
  return nodeView;
}
export function updateNodeView(nodeView: NodeView, vm: NodeViewModel) {
  const { group, circle, text } = nodeView;
  group.x = vm.x;
  group.y = vm.y;
  const tint = vm.focus ? 0xd7fc70 : 0xffffff;
  circle.tint = tint;
  text.tint = tint;
  group.zIndex = vm.focus ? 3 : 0;
}
export function destroyNodeView(nodeView: NodeView) {
  nodeView.group.destroy();
}
