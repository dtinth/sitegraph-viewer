import "./app.css";

import { useStore } from "@nanostores/preact";
import { $sitegraph } from "./$sitegraph";
import { SitegraphViewer } from "./SitegraphViewer";

export function App() {
  const sitegraph = useStore($sitegraph);
  if (!sitegraph)
    return (
      <div id="loading">
        <span>Loading sitegraph…</span>
      </div>
    );
  return <SitegraphViewer sitegraph={sitegraph} />;
}
