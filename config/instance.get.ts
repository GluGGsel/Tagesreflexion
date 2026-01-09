import { INSTANCE as BASE } from "./instance";

type Instance = typeof BASE;

let LOCAL: Partial<Instance> = {};

try {
  // IMPORTANT: This file is local-only and must be ignored by git (.gitignore).
  // Using require inside try/catch keeps it optional without breaking builds.
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  LOCAL = require("./instance.local").INSTANCE ?? {};
} catch {
  LOCAL = {};
}

// Merge base + local; labels are merged deeply.
export const INSTANCE: Instance = {
  ...BASE,
  ...LOCAL,
  labels: {
    ...BASE.labels,
    ...(LOCAL.labels ?? {}),
  },
} as const;
