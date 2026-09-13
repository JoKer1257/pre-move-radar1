import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export const fetchRadarScan = createServerFn({ method: "POST" })
  .validator(z.object({ force: z.boolean().optional() }))
  .handler(async ({ data }) => {
    const { runScan } = await import("./scan.server");
    return runScan(Boolean(data?.force));
  });

export const fetchSymbolDetail = createServerFn({ method: "POST" })
  .validator(z.object({ symbol: z.string().min(1).max(40) }))
  .handler(async ({ data }) => {
    const { getSymbolDetail } = await import("./scan.server");
    return getSymbolDetail(data.symbol);
  });

export const fetchRadarHistory = createServerFn({ method: "POST" }).handler(async () => {
  const { getHistory } = await import("./scan.server");
  return getHistory();
});

export const setRadarFeedback = createServerFn({ method: "POST" })
  .validator(
    z.object({
      id: z.number().int().positive(),
      feedback: z.enum(["hit", "miss", "void"]).nullable(),
    }),
  )
  .handler(async ({ data }) => {
    const { markFeedback } = await import("./scan.server");
    return markFeedback(data.id, data.feedback);
  });

export const fetchRadarSourceZip = createServerFn({ method: "POST" }).handler(async () => {
  const { readFileSync, existsSync } = await import("node:fs");
  const { join } = await import("node:path");
  const p = join(process.cwd(), "public", "pre-move-radar-src.zip");
  if (!existsSync(p)) throw new Error("source zip missing");
  return {
    filename: "pre-move-radar-src.zip",
    base64: readFileSync(p).toString("base64"),
  };
});

export const fetchRadarSourceFiles = createServerFn({ method: "POST" }).handler(async () => {
  const { readFileSync } = await import("node:fs");
  const { join } = await import("node:path");
  const files = [
    "package.json",
    "vite.config.ts",
    "tsconfig.json",
    "README.md",
    "src/lib/radar/engine.ts",
    "src/lib/radar/structure.ts",
    "src/lib/radar/venues.ts",
    "src/lib/radar/scan.server.ts",
    "src/lib/radar/persist.ts",
    "src/lib/radar/review.ts",
    "src/lib/radar/types.ts",
    "src/lib/radar/config.ts",
    "src/lib/radar/math.ts",
    "src/lib/radar/api.ts",
    "src/lib/radar/format.ts",
    "src/lib/radar/labels.ts",
    "src/components/radar/board.tsx",
    "src/components/radar/header.tsx",
    "src/components/radar/detail-sheet.tsx",
    "src/components/radar/history-panel.tsx",
    "migrations/0002_radar.sql",
    "migrations/0003_radar_review.sql",
  ];
  return files.map((path) => ({
    path,
    content: readFileSync(join(process.cwd(), path), "utf8"),
  }));
});
