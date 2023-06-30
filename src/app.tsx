import { Sitegraph, SitegraphNode } from "./Sitegraph";
import "./app.css";

import { atom } from "nanostores";
import { useStore } from "@nanostores/preact";
import { useEffect, useState } from "preact/hooks";
import {
  forceSimulation,
  forceManyBody,
  forceLink,
  forceCenter,
} from "d3-force-3d";

const $sitegraph = atom<Sitegraph | undefined>();

interface Orbit {
  rotateX: number;
  rotateY: number;
}
const $perspective = atom<Orbit>({ rotateX: 0, rotateY: 0 });
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

fetch(
  "https://htrqhjrmmqrqaccchyne.supabase.co/storage/v1/object/public/notes-public/index.graph.json"
)
  .then((r) => {
    if (!r.ok) {
      throw new Error(`Failed to fetch sitegraph: ${r.status} ${r.statusText}`);
    }
    return r.json();
  })
  .then((data) => {
    $sitegraph.set(Sitegraph.parse(data));
  });

export function App() {
  const sitegraph = useStore($sitegraph);
  if (!sitegraph) return <></>;
  return <SitegraphViewer sitegraph={sitegraph} />;
}

function SitegraphViewer({ sitegraph }: { sitegraph: Sitegraph }) {
  interface ForceNode {
    id: string;
    x: number;
    y: number;
    z: number;
  }
  interface ForceLink {
    source: ForceNode;
    target: ForceNode;
    index: number;
  }
  interface Layout {
    nodes: ForceNode[];
    links: ForceLink[];
    nodeMap: Map<string, ForceNode>;
  }

  const [layout, setLayout] = useState<Layout>({
    nodes: [],
    links: [],
    nodeMap: new Map(),
  });
  const perspective = useStore($perspective);

  useEffect(() => {
    const nodes = Object.entries(sitegraph.nodes).map(([id]) => {
      return { id } as ForceNode;
    });
    const nodeMap = new Map(nodes.map((node) => [node.id, node]));
    const links = Object.entries(sitegraph.nodes).flatMap(
      ([sourceId, sourceNode]) => {
        return sourceNode.links.flatMap((link) => {
          const source = nodeMap.get(sourceId);
          const target = nodeMap.get(link.link);
          if (!source || !target) return [];
          return [{ source, target } as ForceLink];
        });
      }
    );
    const simulation = forceSimulation(nodes, 3)
      .force("charge", forceManyBody().distanceMax(100))
      .force("link", forceLink(links))
      .force("center", forceCenter());
    // simulation.on("tick", () => {
    //   setLayout({ nodes, links });
    // });
    simulation.stop();
    simulation.tick(100);
    setLayout({ nodes, links, nodeMap });
  }, [sitegraph]);

  const projector = (vec: Vec3) =>
    project(
      vec,
      perspective,
      layout.nodeMap.get("HomePage") || { x: 0, y: 0, z: 0 }
    );

  return (
    <svg width={1920} height={1080} viewBox={"-960 -540 1920 1080"}>
      <g stroke={"#8b8685"}>
        {layout.links.map((forceLink) => {
          const source = projector(forceLink.source);
          const target = projector(forceLink.target);
          return (
            <line
              key={`${forceLink.index}`}
              x1={source.x}
              y1={source.y}
              x2={target.x}
              y2={target.y}
            />
          );
        })}
      </g>
      {layout.nodes.map((forceNode) => {
        const id = forceNode.id;
        const node = sitegraph.nodes[id];
        const { x, y } = projector(forceNode);
        if (!node) return null;
        return <SitegraphNodeView key={id} id={id} node={node} x={x} y={y} />;
      })}
    </svg>
  );
}

interface SitegraphNodeView {
  id: string;
  node: SitegraphNode;
  x: number;
  y: number;
}

function SitegraphNodeView(props: SitegraphNodeView) {
  const { id, x, y } = props;
  return (
    <g fill="#fff">
      <circle cx={x} cy={y} r={3} />
      {!id.startsWith("2") && (
        <text x={x + 3} y={y + 10} font-size={10}>
          {id}
        </text>
      )}
    </g>
  );
}
