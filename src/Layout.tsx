import { Sitegraph } from "./Sitegraph";
import { atom } from "nanostores";

import {
  forceSimulation,
  forceManyBody,
  forceLink,
  forceCenter,
} from "d3-force-3d";

export interface Layout {
  nodes: ForceNode[];
  links: ForceLink[];
  nodeMap: Map<string, ForceNode>;
}

export interface ForceNode {
  id: string;
  x: number;
  y: number;
  z: number;
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
  simulation.stop();
  simulation.tick(100);

  const createLayout = () => ({ nodes, links, nodeMap });
  const $layout = atom(createLayout());
  simulation.on("tick", () => {
    $layout.set(createLayout());
  });

  return { $layout };
}
