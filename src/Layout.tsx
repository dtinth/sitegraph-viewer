import { Sitegraph } from "./Sitegraph";
import { atom } from "nanostores";

import {
  forceSimulation,
  forceManyBody,
  forceLink,
  forceCenter,
} from "d3-force-3d";
import { Vec3 } from "./Vec3";

export interface Layout {
  nodes: ForceNode[];
  links: ForceLink[];
  nodeMap: Map<string, ForceNode>;
}

export interface ForceNode extends Vec3 {
  id: string;
  displayPos: Vec3;
}

export interface ForceLink {
  source: ForceNode;
  target: ForceNode;
  index: number;
}

export function createLayouter(sitegraph: Sitegraph) {
  const nodes = Object.entries(sitegraph.nodes)
    // .filter(([id]) => id === "HomePage" || id === "Firebase")
    .map(([id, node]) => {
      return { id, displayPos: { x: 0, y: 0, z: 0 } } as ForceNode;
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

  const startTime = performance.now();
  const simulation = forceSimulation(nodes, 3)
    .force("charge", forceManyBody().distanceMax(100))
    .force("link", forceLink(links))
    .force("center", forceCenter());
  simulation.stop();
  simulation.tick(1);
  for (const node of nodes) {
    node.displayPos = {
      x: node.x,
      y: node.y,
      z: node.z,
    };
  }
  const endTime = performance.now();
  console.log(`layout took ${endTime - startTime}ms`);

  const createLayout = () => ({ nodes, links, nodeMap });
  const $layout = atom(createLayout());
  simulation.on("tick", () => {
    $layout.set(createLayout());
  });
  let ticksLeft = 300;
  const update = () => {
    if (ticksLeft <= 0) return;
    ticksLeft -= 1;
    simulation.tick(1);
    for (const node of nodes) {
      const dx = node.x - node.displayPos.x;
      const dy = node.y - node.displayPos.y;
      const dz = node.z - node.displayPos.z;
      node.displayPos.x += dx / 16;
      node.displayPos.y += dy / 16;
      node.displayPos.z += dz / 16;
    }
  };

  return { $layout, update };
}
