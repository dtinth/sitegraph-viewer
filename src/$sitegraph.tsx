import { Sitegraph } from "./Sitegraph";
import { atom } from "nanostores";
import { searchParams } from "./searchParams";

export const $sitegraph = atom<Sitegraph | undefined>();
const source =
  searchParams.get("sitegraph") ||
  "https://htrqhjrmmqrqaccchyne.supabase.co/storage/v1/object/public/notes-public/index.graph.json";

if (source.includes("://")) {
  fetch(source)
    .then((r) => {
      if (!r.ok) {
        throw new Error(
          `Failed to fetch sitegraph: ${r.status} ${r.statusText}`
        );
      }
      return r.json();
    })
    .then((data) => {
      $sitegraph.set(Sitegraph.parse(data));
    });
} else if (source === "parent.postMessage") {
  const id = `sitegraphRequest-${Date.now()}-${Math.random()}`;
  window.addEventListener("message", (e) => {
    if (e.data?.sitegraph && e.data.id === id) {
      $sitegraph.set(Sitegraph.parse(e.data.sitegraph));
    }
  });
  window.parent.postMessage({ sitegraphRequest: { id } }, "*");
} else {
  console.error(
    'Sitegraph source must be a URL or "parent.postMessage" to receive the sitegraph data via postMessage.'
  );
}
