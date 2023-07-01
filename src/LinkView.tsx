import * as PIXI from "pixi.js";
import { ForceLink } from "./Layout";
import { Projector } from "./Projector";
import { Path } from "./createPathFinder";

export interface LinkView {
  group: PIXI.Container;
  rectangle: PIXI.Graphics;
}
export function createLinkView(
  rectangleTemplate: PIXI.GraphicsGeometry
): LinkView {
  const group = new PIXI.Container();
  const rectangle = new PIXI.Graphics(rectangleTemplate);
  const linkView: LinkView = { group, rectangle };
  group.addChild(rectangle);
  return linkView;
}
export function updateLinkView(
  linkView: LinkView,
  link: ForceLink,
  projector: Projector,
  pathFromHome: Path,
  pathFromFocusToHover: Path,
  focus: string,
  forwardLinks: Set<string>,
  backLinks: Set<string>
) {
  const source = link.source;
  const target = link.target;
  if (!source || !target) return;
  const { group, rectangle } = linkView;
  const projectedSource = projector(source.displayPos);
  const projectedTarget = projector(target.displayPos);
  const dx = projectedTarget.x - projectedSource.x;
  const dy = projectedTarget.y - projectedSource.y;
  const angle = Math.atan2(dy, dx);
  const length = Math.sqrt(dx * dx + dy * dy);
  group.x = projectedSource.x + dx / 2;
  group.y = projectedSource.y + dy / 2;
  group.rotation = angle;
  group.scale.x = length;

  let color: number = 0x8b8685;
  let zIndex: number = 0;
  let scaleY: number = 1;
  if (pathFromFocusToHover.hasLink(source.id, target.id)) {
    color = 0xd7fc70;
    zIndex = 4;
    scaleY = 3;
  } else if (pathFromHome.hasLink(source.id, target.id)) {
    color = 0xbbeeff;
    zIndex = 3;
    scaleY = 2;
  } else if (source.id === focus && forwardLinks.has(target.id)) {
    color = 0xffff99;
    zIndex = 2;
    scaleY = 2;
  } else if (target.id === focus && backLinks.has(source.id)) {
    color = 0xffffff;
    zIndex = 1;
    scaleY = 2;
  }
  rectangle.tint = color;
  rectangle.scale.y = scaleY;
  group.zIndex = zIndex;
}
export function destroyLinkView(linkView: LinkView) {
  linkView.group.destroy();
}
