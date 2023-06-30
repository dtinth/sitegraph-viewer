import { Sitegraph } from "./Sitegraph";
import * as PIXI from "pixi.js";
import { atom, computed } from "nanostores";
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

  const update = () => {
    const perspective = $perspective.get();
    const tx = hover.rotateX + drag.rotateX;
    const ty = hover.rotateY + drag.rotateY;
    const dx = tx - perspective.rotateX;
    const dy = ty - perspective.rotateY;
    if (Math.abs(dx) > 0.0001 || Math.abs(dy) > 0.0001) {
      $perspective.set({
        rotateX: perspective.rotateX + dx / 10,
        rotateY: perspective.rotateY + dy / 10,
      });
    }
  };
  return { $perspective, update };
}

function createSitegraphViewer(sitegraph: Sitegraph) {
  let stopped = false;
  let app = new PIXI.Application<HTMLCanvasElement>({
    resizeTo: window,
    autoDensity: true,
    antialias: true,
    resolution: window.devicePixelRatio,
    sharedTicker: false,
    autoStart: false,
  });
  document.body.appendChild(app.view);
  app.view.style.position = "fixed";
  app.view.style.top = "0";
  app.view.style.left = "0";

  const camera = setupCamera(app);

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

  const $width = atom(window.innerWidth);
  const $height = atom(window.innerHeight);

  const $update = computed(
    [$width, $height, layouter.$layout, camera.$perspective, $focus],
    (width, height, layout, perspective, focus) => {
      let ran = false;
      return (markDirty: () => void) => {
        if (ran) return;
        ran = true;

        app.stage.x = width / 2;
        app.stage.y = height / 2;

        const projector: Projector = (vec) => {
          const focusTarget: Vec3 = layout.nodeMap.get(focus) || {
            x: 0,
            y: 0,
            z: 0,
          };
          const projected = project(vec, perspective, focusTarget);
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

        markDirty();
      };
    }
  );

  const update = () => {
    let dirty = false;
    const markDirty = () => (dirty = true);
    camera.update();
    $width.set(window.innerWidth);
    $height.set(window.innerHeight);
    $update.get()(markDirty);
    if (dirty) app.render();
  };

  const frame = () => {
    if (stopped) return;
    requestAnimationFrame(frame);
    update();
  };

  frame();

  return () => {
    stopped = true;
    app.view.remove();
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
