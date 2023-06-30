import { Sitegraph } from "./Sitegraph";
import { atom } from "nanostores";

export const $sitegraph = atom<Sitegraph | undefined>();
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
