import { Sitegraph, SitegraphNode } from "./Sitegraph";

function cost(from: SitegraphNode, _to: SitegraphNode) {
  return from.links.length * (from.title?.endsWith("(topic)") ? 0.1 : 1);
}

interface BestPath {
  cost: number;
  nodes: string[];
}

/**
 * A pathfinder can find the path from a node to any other node.
 */
export function createPathFinder(sitegraph: Sitegraph, startingNodeId: string) {
  const bestPathTo = new Map<string, BestPath>();
  const queue: string[] = [];
  queue.push(startingNodeId);
  bestPathTo.set(startingNodeId, { cost: 0, nodes: [startingNodeId] });
  while (queue.length > 0) {
    const nodeId = queue.shift()!;
    const node = sitegraph.nodes[nodeId];
    const pathToNode = bestPathTo.get(nodeId)!;
    for (const link of node.links) {
      const neighborId = link.link;
      const neighbor = sitegraph.nodes[neighborId];
      if (!neighbor) continue;
      const newCost = pathToNode.cost + cost(node, neighbor);
      const bestPathToNeighbor = bestPathTo.get(neighborId);
      if (bestPathToNeighbor && bestPathToNeighbor.cost <= newCost) {
        continue;
      }
      bestPathTo.set(neighborId, {
        cost: newCost,
        nodes: [...pathToNode.nodes, neighborId],
      });
      queue.push(neighborId);
    }
  }
  return {
    getPathTo: (toNodeId: string) => {
      const path = bestPathTo.get(toNodeId);
      if (!path) return [];
      return path.nodes;
    },
  };
}

export function createPath(ids: string[]): Path {
  const nodeSet = new Set(ids);
  const linkSet = new Set<string>();
  for (let i = 0; i < ids.length - 1; i++) {
    const from = ids[i];
    const to = ids[i + 1];
    linkSet.add(`${from} -> ${to}`);
  }
  return {
    hasNode: (id: string) => nodeSet.has(id),
    hasLink: (from: string, to: string) => linkSet.has(`${from} -> ${to}`),
  };
}
export interface Path {
  hasNode: (id: string) => boolean;
  hasLink: (from: string, to: string) => boolean;
}
