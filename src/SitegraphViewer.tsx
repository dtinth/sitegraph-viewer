import { Sitegraph } from "./Sitegraph";
import * as PIXI from "pixi.js";
import { atom } from "nanostores";
import { useEffect } from "preact/hooks";
import { ForceLink, ForceNode, createLayouter } from "./Layout";
import { Orbit } from "./Orbit";
import { project } from "./project";
import { Projector } from "./Projector";
import {
  NodeView,
  createNodeView,
  updateNodeView,
  destroyNodeView,
} from "./NodeView";
import {
  LinkView,
  createLinkView,
  updateLinkView,
  destroyLinkView,
} from "./LinkView";
import {
  NodeViewModel,
  createNodeViewModel,
  updateNodeViewModel,
} from "./NodeViewModel";
import { Vec3 } from "./Vec3";

const $focus = atom("HomePage");

// window.addEventListener("mousemove", (e) => {
//   target = {
//     rotateX: (e.clientY - window.innerHeight / 2) / 1000,
//     rotateY: (e.clientX - window.innerWidth / 2) / 1000,
//   };
// });
// requestAnimationFrame(function loop() {
//   const perspective = $perspective.get();
//   const dx = target.rotateX - perspective.rotateX;
//   const dy = target.rotateY - perspective.rotateY;
//   $perspective.set({
//     rotateX: perspective.rotateX + dx / 10,
//     rotateY: perspective.rotateY + dy / 10,
//   });
//   requestAnimationFrame(loop);
// });

function setupCamera(app: PIXI.Application) {
  let hover: Orbit = { rotateX: 0, rotateY: 0 };
  let drag: Orbit = { rotateX: 0, rotateY: 0 };
  const $perspective = atom<Orbit>({ rotateX: 0, rotateY: 0 });
  app.stage.interactive = true;
  app.stage.interactiveChildren = false;
  app.stage.hitArea = { contains: () => true };

  app.stage.on("globalmousemove", (e) => {
    hover = {
      rotateX: (e.clientY - window.innerHeight / 2) / 1000,
      rotateY: (e.clientX - window.innerWidth / 2) / 1000,
    };
  });

  let dragging: { lastX: number; lastY: number; id: number } | null = null;
  app.stage.on("pointerdown", (e) => {
    dragging = { lastX: e.global.x, lastY: e.global.y, id: e.pointerId };
  });
  app.stage.on("globalpointermove", (e) => {
    if (!dragging || e.pointerId !== dragging.id) return;
    const { lastX, lastY } = dragging;
    const dx = e.global.x - lastX;
    const dy = e.global.y - lastY;
    drag.rotateX += dy / 100;
    drag.rotateY += dx / 100;
    dragging.lastX = e.global.x;
    dragging.lastY = e.global.y;
  });
  app.stage.on("pointerup", () => {
    dragging = null;
  });

  app.ticker.add(() => {
    const perspective = $perspective.get();
    const tx = hover.rotateX + drag.rotateX;
    const ty = hover.rotateY + drag.rotateY;
    const dx = tx - perspective.rotateX;
    const dy = ty - perspective.rotateY;
    $perspective.set({
      rotateX: perspective.rotateX + dx / 10,
      rotateY: perspective.rotateY + dy / 10,
    });
  });
  return { $perspective };
}

function createSitegraphViewer(sitegraph: Sitegraph) {
  let app = new PIXI.Application<HTMLCanvasElement>({
    resizeTo: window,
    autoDensity: true,
    antialias: true,
    resolution: window.devicePixelRatio,
  });
  document.body.appendChild(app.view);
  app.view.style.position = "fixed";
  app.view.style.top = "0";
  app.view.style.left = "0";

  const { $perspective } = setupCamera(app);

  const circleTemplate = new PIXI.Graphics();
  circleTemplate.beginFill(16777215);
  circleTemplate.drawCircle(0, 0, 3);
  circleTemplate.endFill();

  const rectangleTemplate = new PIXI.Graphics();
  rectangleTemplate.beginFill(16777215);
  rectangleTemplate.drawRect(-0.5, -0.5, 1, 1);
  rectangleTemplate.endFill();

  const layouter = createLayouter(sitegraph);

  const nodeViewModels = new Map<ForceNode, NodeViewModel>();
  const nodeViews = new Map<ForceNode, NodeView>();
  const linkViews = new Map<ForceLink, LinkView>();

  const linkGroup = new PIXI.Container();
  const nodeGroup = new PIXI.Container();
  linkGroup.sortableChildren = true;
  nodeGroup.sortableChildren = true;
  app.stage.addChild(linkGroup);
  app.stage.addChild(nodeGroup);

  for (const link of layouter.$layout.get().links) {
    const linkView: LinkView = createLinkView(rectangleTemplate.geometry);
    linkViews.set(link, linkView);
    linkGroup.addChild(linkView.group);
  }
  for (const node of layouter.$layout.get().nodes) {
    const nodeViewModel = createNodeViewModel();
    const nodeView = createNodeView(circleTemplate, node);
    nodeViews.set(node, nodeView);
    nodeViewModels.set(node, nodeViewModel);
    nodeGroup.addChild(nodeView.group);
  }

  const update = () => {
    app.stage.x = window.innerWidth / 2;
    app.stage.y = window.innerHeight / 2;

    const layout = layouter.$layout.get();
    const projector: Projector = (vec) => {
      const focusTarget: Vec3 = layout.nodeMap.get($focus.get()) || {
        x: 0,
        y: 0,
        z: 0,
      };
      const projected = project(vec, $perspective.get(), focusTarget);
      return projected;
    };

    for (const node of layout.nodes) {
      const nodeViewModel = nodeViewModels.get(node);
      if (!nodeViewModel) continue;
      updateNodeViewModel(nodeViewModel, node, projector);
    }

    for (const link of layout.links) {
      const linkView = linkViews.get(link);
      if (!linkView) continue;
      updateLinkView(linkView, link, projector);
    }

    for (const node of layout.nodes) {
      const nodeView = nodeViews.get(node);
      const nodeViewModel = nodeViewModels.get(node);
      if (!nodeView || !nodeViewModel) continue;
      updateNodeView(nodeView, nodeViewModel);
    }
  };
  update();
  app.ticker.add(update);

  return () => {
    app.view.remove();
    app.ticker.remove(update);
    for (const nodeView of nodeViews.values()) {
      destroyNodeView(nodeView);
    }
    for (const linkView of linkViews.values()) {
      destroyLinkView(linkView);
    }
    circleTemplate.destroy();
    app.destroy();
  };
}
export function SitegraphViewer({ sitegraph }: { sitegraph: Sitegraph }) {
  useEffect(() => {
    return createSitegraphViewer(sitegraph);
  }, [sitegraph]);

  return <></>;
}
