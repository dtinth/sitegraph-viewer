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
  node: ForceNode,
  label: string
): NodeView {
  const group = new PIXI.Container();
  const circle = new PIXI.Graphics(circleTemplate.geometry);
  const text = new PIXI.Text(label, {
    fontFamily: "sans-serif",
    fontSize: 12,
    fill: 0xffffff,
    wordWrap: true,
    wordWrapWidth: 200,
  });
  text.x = 5;
  text.y = 2;
  const nodeView: NodeView = { group, circle, text };
  group.addChild(circle);
  group.addChild(text);
  return nodeView;
}
export function updateNodeView(nodeView: NodeView, vm: NodeViewModel) {
  const { group, circle, text } = nodeView;
  group.x = vm.x;
  group.y = vm.y;
  circle.scale.x = vm.scale;
  circle.scale.y = vm.scale;
  circle.tint = vm.tint;
  text.tint = vm.tint;
  group.zIndex = vm.zIndex;
  text.visible = vm.showText;
}
export function destroyNodeView(nodeView: NodeView) {
  nodeView.group.destroy();
}
