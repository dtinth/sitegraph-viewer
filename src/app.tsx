import { Sitegraph, SitegraphNode } from "./Sitegraph";
import "./app.css";
import * as PIXI from "pixi.js";

import { atom } from "nanostores";
import { useStore } from "@nanostores/preact";
import { useEffect, useState } from "preact/hooks";
import { $sitegraph } from "./$sitegraph";
import { ForceLink, ForceNode, Layout, createLayouter } from "./Layout";

const $perspective = atom<Orbit>({ rotateX: 0, rotateY: 0 });
interface Orbit {
  rotateX: number;
  rotateY: number;
}
let target = { rotateX: 0, rotateY: 0 };
window.addEventListener("mousemove", (e) => {
  target = {
    rotateX: (e.clientY - window.innerHeight / 2) / 500,
    rotateY: (e.clientX - window.innerWidth / 2) / 500,
  };
});
requestAnimationFrame(function loop() {
  const perspective = $perspective.get();
  const dx = target.rotateX - perspective.rotateX;
  const dy = target.rotateY - perspective.rotateY;
  $perspective.set({
    rotateX: perspective.rotateX + dx / 10,
    rotateY: perspective.rotateY + dy / 10,
  });
  requestAnimationFrame(loop);
});

interface Vec3 {
  x: number;
  y: number;
  z: number;
}
const rotateX = (vec: Vec3, angle: number) => {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  const y = vec.y * cos - vec.z * sin;
  const z = vec.y * sin + vec.z * cos;
  return { ...vec, y, z };
};
const rotateY = (vec: Vec3, angle: number) => {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  const x = vec.x * cos - vec.z * sin;
  const z = vec.x * sin + vec.z * cos;
  return { ...vec, x, z };
};

const project = (vec: Vec3, perspective: Orbit, anchor: Vec3) => {
  vec = {
    x: vec.x - anchor.x,
    y: vec.y - anchor.y,
    z: vec.z - anchor.z,
  };
  vec = rotateY(vec, perspective.rotateY);
  vec = rotateX(vec, perspective.rotateX);
  const scale = 3;
  vec.x += anchor.x;
  vec.y += anchor.y;
  vec.z += anchor.z;
  vec.x *= scale;
  vec.y *= scale;
  vec.z *= scale;
  return vec;
};

export function App() {
  const sitegraph = useStore($sitegraph);
  if (!sitegraph) return <></>;
  return <SitegraphViewer sitegraph={sitegraph} />;
}

interface NodeView {
  group: PIXI.Container;
  circle: PIXI.Graphics;
  text: PIXI.Text;
}
function createNodeView(
  circleTemplate: PIXI.Graphics,
  node: ForceNode
): NodeView {
  const group = new PIXI.Container();
  const circle = new PIXI.Graphics(circleTemplate.geometry);
  const text = new PIXI.Text(node.id, {
    fontFamily: "sans-serif",
    fontSize: 10,
    fill: 0xffffff,
  });
  const nodeView: NodeView = { group, circle, text };
  group.addChild(circle);
  group.addChild(text);
  return nodeView;
}

type Vec2 = { x: number; y: number };
type Projector = (vec: Vec3) => Vec2;

function updateNodeView(nodeView: NodeView, vm: NodeViewModel) {
  const { group } = nodeView;
  group.x = vm.x;
  group.y = vm.y;
}
function destroyNodeView(nodeView: NodeView) {
  nodeView.group.destroy();
}

interface LinkView {
  group: PIXI.Container;
  rectangle: PIXI.Graphics;
}
function createLinkView(rectangleTemplate: PIXI.GraphicsGeometry): LinkView {
  const group = new PIXI.Container();
  const rectangle = new PIXI.Graphics(rectangleTemplate);
  const linkView: LinkView = { group, rectangle };
  group.addChild(rectangle);
  return linkView;
}
function updateLinkView(
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
function destroyLinkView(linkView: LinkView) {
  linkView.group.destroy();
}

interface NodeViewModel extends Vec2 {}
function createNodeViewModel(): NodeViewModel {
  return { x: 0, y: 0 };
}
function updateNodeViewModel(
  vm: NodeViewModel,
  node: ForceNode,
  projector: Projector
) {
  const vec = projector(node);
  vm.x = vec.x;
  vm.y = vec.y;
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

  const circleTemplate = new PIXI.Graphics();
  circleTemplate.beginFill(0xffffff);
  circleTemplate.drawCircle(0, 0, 3);
  circleTemplate.endFill();

  const rectangleTemplate = new PIXI.Graphics();
  rectangleTemplate.beginFill(0xffffff);
  rectangleTemplate.drawRect(-0.5, -0.5, 1, 1);
  rectangleTemplate.endFill();

  const layouter = createLayouter(sitegraph);
  const nodeViewModels = new Map<ForceNode, NodeViewModel>();
  const nodeViews = new Map<ForceNode, NodeView>();
  const linkViews = new Map<ForceLink, LinkView>();
  for (const link of layouter.$layout.get().links) {
    const linkView: LinkView = createLinkView(rectangleTemplate.geometry);
    linkViews.set(link, linkView);
    app.stage.addChild(linkView.group);
  }
  for (const node of layouter.$layout.get().nodes) {
    const nodeViewModel = createNodeViewModel();
    const nodeView = createNodeView(circleTemplate, node);
    nodeViews.set(node, nodeView);
    nodeViewModels.set(node, nodeViewModel);
    app.stage.addChild(nodeView.group);
  }

  const update = () => {
    app.stage.x = window.innerWidth / 2;
    app.stage.y = window.innerHeight / 2;

    const layout = layouter.$layout.get();
    const projector: Projector = (vec) => {
      const projected = project(
        vec,
        $perspective.get(),
        layout.nodeMap.get("HomePage") || { x: 0, y: 0, z: 0 }
      );
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
    circleTemplate.destroy();
    app.destroy();
  };
}
function SitegraphViewer({ sitegraph }: { sitegraph: Sitegraph }) {
  // const [layout, setLayout] = useState<Layout>({
  //   nodes: [],
  //   links: [],
  //   nodeMap: new Map(),
  // });
  // const perspective = useStore($perspective);

  useEffect(() => {
    return createSitegraphViewer(sitegraph);
  }, [sitegraph]);

  // const projector = (vec: Vec3) =>
  //   project(
  //     vec,
  //     perspective,
  //     layout.nodeMap.get("HomePage") || { x: 0, y: 0, z: 0 }
  //   );

  return <></>;
  // return (
  //   <svg width={1920} height={1080} viewBox={"-960 -540 1920 1080"}>
  //     <g stroke={"#8b8685"}>
  //       {layout.links.map((forceLink) => {
  //         const source = projector(forceLink.source);
  //         const target = projector(forceLink.target);
  //         return (
  //           <line
  //             key={`${forceLink.index}`}
  //             x1={source.x}
  //             y1={source.y}
  //             x2={target.x}
  //             y2={target.y}
  //           />
  //         );
  //       })}
  //     </g>
  //     {layout.nodes.map((forceNode) => {
  //       const id = forceNode.id;
  //       const node = sitegraph.nodes[id];
  //       const { x, y } = projector(forceNode);
  //       if (!node) return null;
  //       return <SitegraphNodeView key={id} id={id} node={node} x={x} y={y} />;
  //     })}
  //   </svg>
  // );
}

// interface SitegraphNodeView {
//   id: string;
//   node: SitegraphNode;
//   x: number;
//   y: number;
// }

// function SitegraphNodeView(props: SitegraphNodeView) {
//   const { id, x, y } = props;
//   return (
//     <g fill="#fff">
//       <circle cx={x} cy={y} r={3} />
//       {!id.startsWith("2") && (
//         <text x={x + 3} y={y + 10} font-size={10}>
//           {id}
//         </text>
//       )}
//     </g>
//   );
// }
