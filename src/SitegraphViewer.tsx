import { Sitegraph } from "./Sitegraph";
import * as PIXI from "pixi.js";
import { atom, computed } from "nanostores";
import { useEffect } from "preact/hooks";
import { ForceLink, ForceNode, createLayouter } from "./Layout";
import { Orbit } from "./Orbit";
import { Trackball, project, rotateX, rotateY } from "./project";
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
import { createPath, createPathFinder } from "./createPathFinder";
import { searchParams } from "./searchParams";

const $focus = atom(searchParams.get("focus") || "HomePage");

Object.assign(window, { $focus });

function setupCamera(app: PIXI.Application) {
  let hover: Orbit = { rotateX: 0, rotateY: 0 };
  const $trackball = atom<Trackball>({
    x: { x: 1, y: 0, z: 0 },
    y: { x: 0, y: 1, z: 0 },
    z: { x: 0, y: 0, z: 1 },
  });
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
    const trackball = $trackball.get();
    $trackball.set({
      x: rotateX(rotateY(trackball.x, dx / 128), dy / 128),
      y: rotateX(rotateY(trackball.y, dx / 128), dy / 128),
      z: rotateX(rotateY(trackball.z, dx / 128), dy / 128),
    });
    dragging.lastX = e.global.x;
    dragging.lastY = e.global.y;
  });
  app.stage.on("pointerup", () => {
    dragging = null;
  });

  const update = () => {
    const perspective = $perspective.get();
    const tx = hover.rotateX;
    const ty = hover.rotateY;
    const dx = tx - perspective.rotateX;
    const dy = ty - perspective.rotateY;
    if (Math.abs(dx) > 0.0001 || Math.abs(dy) > 0.0001) {
      $perspective.set({
        rotateX: perspective.rotateX + dx / 10,
        rotateY: perspective.rotateY + dy / 10,
      });
    }
  };
  return { $perspective, $trackball, update };
}

function createSitegraphViewer(sitegraph: Sitegraph) {
  const fromHome = createPathFinder(
    sitegraph,
    searchParams.get("root") || "HomePage"
  );

  const $hoverNodeId = atom<string | undefined>($focus.get());
  const $pathFinderFromFocus = computed($focus, (focus) =>
    createPathFinder(sitegraph, focus)
  );
  const $pathFromFocusToHover = computed(
    [$hoverNodeId, $pathFinderFromFocus],
    (hoverNodeId, pathFinderFromFocus) =>
      createPath(hoverNodeId ? pathFinderFromFocus.getPathTo(hoverNodeId) : [])
  );
  const $forwardLinks = computed([$focus], (focus) => {
    return new Set((sitegraph.nodes[focus]?.links || []).map((x) => x.link));
  });
  const $backLinks = computed([$focus], (focus) => {
    return new Set(
      Object.entries(sitegraph.nodes).flatMap(([id, node]) => {
        if (node.links?.some((x) => x.link === focus)) return [id];
        return [];
      })
    );
  });

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
    const sitegraphNode = sitegraph.nodes[node.id];
    const nodeViewModel = createNodeViewModel();
    const label = sitegraphNode.title || node.id;
    const nodeView = createNodeView(circleTemplate, node, label);
    nodeViews.set(node, nodeView);
    nodeViewModels.set(node, nodeViewModel);
    nodeGroup.addChild(nodeView.group);
  }

  const $width = atom(window.innerWidth);
  const $height = atom(window.innerHeight);

  const focuser = (() => {
    const $focusTarget = computed(
      [$focus, layouter.$layout],
      (focus, layout) =>
        layout.nodeMap.get(focus) || {
          x: 0,
          y: 0,
          z: 0,
        }
    );
    const $anchor = atom($focusTarget.get());
    const follows = [
      $focusTarget.get(),
      $focusTarget.get(),
      $focusTarget.get(),
      $focusTarget.get(),
      $focusTarget.get(),
      $focusTarget.get(),
      $focusTarget.get(),
    ];
    const update = () => {
      const focusTarget = $focusTarget.get();
      const anchor = $anchor.get();
      follows[0] = focusTarget;
      for (let i = 1; i < follows.length; i++) {
        const dx = follows[i - 1].x - follows[i].x;
        const dy = follows[i - 1].y - follows[i].y;
        const dz = follows[i - 1].z - follows[i].z;
        follows[i] = {
          x: follows[i].x + dx / 3,
          y: follows[i].y + dy / 3,
          z: follows[i].z + dz / 3,
        };
      }
      const last = follows[follows.length - 1];
      const dx = last.x - anchor.x;
      const dy = last.y - anchor.y;
      const dz = last.z - anchor.z;
      if (
        Math.abs(dx) > 0.0001 ||
        Math.abs(dy) > 0.0001 ||
        Math.abs(dz) > 0.0001
      ) {
        $anchor.set({
          x: anchor.x + dx,
          y: anchor.y + dy,
          z: anchor.z + dz,
        });
      }
    };
    return { $anchor, update };
  })();

  const $pathFromHomeToFocus = computed([$focus], (focus) =>
    createPath(fromHome.getPathTo(focus))
  );

  app.stage.on("globalmousemove", (e) => {
    updateHover(e);
  });
  let clickGesture:
    | { id: string; pointerId: number; x: number; y: number }
    | undefined;
  app.stage.on("pointerdown", (e) => {
    updateHover(e);
    const hoverId = $hoverNodeId.get();
    if (!clickGesture && hoverId) {
      clickGesture = {
        id: hoverId,
        pointerId: e.pointerId,
        x: e.global.x,
        y: e.global.y,
      };
    }
  });
  app.stage.on("pointerup", (e) => {
    if (
      clickGesture &&
      clickGesture.pointerId === e.pointerId &&
      Math.hypot(e.global.x - clickGesture.x, e.global.y - clickGesture.y) < 10
    ) {
      const clickAction = searchParams.get("click");
      if ($focus.get() === clickGesture.id) {
        if (clickAction === "parent.postMessage") {
          window.parent.postMessage(
            { sitegraphNodeClicked: { id: clickGesture.id } },
            "*"
          );
        } else if (clickAction?.includes("://")) {
          const url = new URL(clickGesture.id, clickAction);
          window.open(url, "_blank");
        } else {
          console.log("click", clickGesture.id);
          alert(`click ${clickGesture.id}`);
        }
      } else {
        $focus.set(clickGesture.id);
      }
    }
    clickGesture = undefined;
  });

  // $hoverNodeId.subscribe((x) => console.log("hoverNodeId", x));

  const $update = computed(
    [
      $width,
      $height,
      layouter.$layout,
      camera.$perspective,
      camera.$trackball,
      $focus,
      focuser.$anchor,
      $pathFromHomeToFocus,
      $pathFromFocusToHover,
      $hoverNodeId,
      $forwardLinks,
      $backLinks,
    ],
    (
      width,
      height,
      layout,
      perspective,
      trackball,
      focus,
      anchor,
      pathFromHomeToFocus,
      pathFromFocusToHover,
      hoverNodeId,
      forwardLinks,
      backLinks
    ) => {
      let ran = false;
      return (markDirty: () => void) => {
        if (ran) return;
        ran = true;

        app.stage.x = width / 2;
        app.stage.y = height / 2;

        const projector: Projector = (vec) => {
          const projected = project(vec, perspective, trackball, anchor);
          return projected;
        };

        for (const node of layout.nodes) {
          const nodeViewModel = nodeViewModels.get(node);
          if (!nodeViewModel) continue;
          updateNodeViewModel(
            nodeViewModel,
            node,
            projector,
            focus,
            hoverNodeId,
            pathFromHomeToFocus,
            pathFromFocusToHover,
            forwardLinks,
            backLinks
          );
        }

        for (const link of layout.links) {
          const linkView = linkViews.get(link);
          if (!linkView) continue;
          updateLinkView(
            linkView,
            link,
            projector,
            pathFromHomeToFocus,
            pathFromFocusToHover,
            focus,
            forwardLinks,
            backLinks
          );
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
    layouter.update();
    camera.update();
    focuser.update();
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

  function updateHover(e: PIXI.FederatedPointerEvent) {
    let closest: { id: string; distance: number } | undefined;
    for (const [node, vm] of nodeViewModels) {
      const distance = Math.hypot(
        e.global.x - $width.get() / 2 - vm.x,
        e.global.y - $height.get() / 2 - vm.y
      );
      if (distance < 32 && (!closest || distance < closest.distance)) {
        closest = { id: node.id, distance };
      }
    }
    if (closest !== undefined) {
      $hoverNodeId.set(closest.id);
    } else {
      $hoverNodeId.set(undefined);
    }
  }
}
export function SitegraphViewer({ sitegraph }: { sitegraph: Sitegraph }) {
  useEffect(() => {
    return createSitegraphViewer(sitegraph);
  }, [sitegraph]);

  return <></>;
}
