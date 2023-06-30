import { z } from "zod";

export const Sitegraph = z.object({
  nodes: z.record(
    z.object({
      title: z.string().optional(),
      links: z.array(
        z.object({
          link: z.string(),
          displayText: z.string().optional(),
        })
      ),
    })
  ),
});

export type Sitegraph = z.infer<typeof Sitegraph>;
export type SitegraphNode = Sitegraph["nodes"][string];
export type SitegraphLink = SitegraphNode["links"][number];
