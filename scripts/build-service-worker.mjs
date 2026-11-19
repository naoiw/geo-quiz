import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { buildServiceWorker } from "./pwa-worker.mjs";

const repositoryRoot = dirname(dirname(fileURLToPath(import.meta.url)));
buildServiceWorker(join(repositoryRoot, "dist"));
