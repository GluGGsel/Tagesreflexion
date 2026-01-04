import { INSTANCE as BASE } from "./instance";

// Optional local override (not tracked by upstream). If missing, use BASE.
let LOCAL: typeof BASE | null = null;

try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  // @ts-ignore
  LOCAL = require("./instance.local").INSTANCE ?? null;
} catch {
  LOCAL = null;
}

export const INSTANCE = (LOCAL ?? BASE) as typeof BASE;
