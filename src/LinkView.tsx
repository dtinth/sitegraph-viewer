import * as PIXI from "pixi.js";
import { ForceLink } from "./Layout";
import { Projector } from "./Projector";

export interface LinkView {
  group: PIXI.Container;
  rectangle: PIXI.Graphics;
}
export function createLinkView(
  rectangleTemplate: PIXI.GraphicsGeometry
): LinkView {
  const group = new PIXI.Container();
  const rectangle = new PIXI.Graphics(rectangleTemplate);
  rectangle.tint = 0x8b8685;
  const linkView: LinkView = { group, rectangle };
  group.addChild(rectangle);
  return linkView;
}
export function updateLinkView(
  linkView: LinkView,
  link: ForceLink,
  projector: Projector
) {
  const { group } = linkView;
  const source = link.source;
  const target = link.target;
  if (!source || !target) return;
  const projectedSource = projector(source);
  const projectedTarget = projector(target);
  const dx = projectedTarget.x - projectedSource.x;
  const dy = projectedTarget.y - projectedSource.y;
  const angle = Math.atan2(dy, dx);
  const length = Math.sqrt(dx * dx + dy * dy);
  group.x = projectedSource.x + dx / 2;
  group.y = projectedSource.y + dy / 2;
  group.rotation = angle;
  group.scale.x = length;
}
export function destroyLinkView(linkView: LinkView) {
  linkView.group.destroy();
}
