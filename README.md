# sitegraph-viewer

A web application for visualizing the “sitegraph” of a website.

An example can be seen on my notes website: <https://notes.dt.in.th/HomePage>

## What is a sitegraph?

A sitegraph is a graph of the pages of a website and the links between them. It is a directed graph, where the nodes are pages and the edges are links. The sitegraph is a useful tool for understanding the structure of a website.

## How does it work?

The website is expected to publish a `sitegraph.json` file. The schema for this file is in [`src/Sitegraph.tsx`](src/Sitegraph.tsx).

## Query params

To use this app with your own sitegraph, first make sure your sitegraph URL is CORS-enabled. Then, configure the app with these query params:

<table width="100%">
<thead><tr><th>Param</th><th>Description</th></tr></thead>
<tbody>
<tr><td><code>sitegraph</code></td><td>

Specify the URL of the sitegraph JSON file.

**Default:** (<https://notes.dt.in.th>’s sitegraph file)

</td></tr>
<tr><td><code>focus</code></td><td>

Specify the page ID to initially focus on.

**Default:** `HomePage`

</td></tr>
<tr><td><code>root</code></td><td>

Specify the page ID to use as the root of the graph. When a `root` is specified, the _best path_ from the `root` page to the currently-focused page will be highlighted.

The _best path_ is the path from A to B with minimum total cost. The cost of a path is the sum of the costs of its edges. The cost of an edge is the number of links on the source page. This heuristic makes the general pages (such as “Recent writing” or “All notes”) less favored than pages with better focus.

**Default:** `HomePage`

</td></tr>
<tr><td><code>click</code></td><td>

Specify what happens when a focused node is clicked.

| Value                | Description                                                                                                                    |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `alert`              | Display an alert with the page ID. For debugging.                                                                              |
| `parent.postMessage` | Send a message to the parent frame. The message will be a JSON object with this structure: `{ sitegraphNodeClicked: { id } }`. |
| `*://*`              | Navigate to the page ID with the specified value as the base URL.                                                              |

**Default:** `alert`

</td></tr>
</tbody></table>
