import fs from "fs";
import path from "path";

const COVERS_FILE = path.resolve(process.cwd(), "data/covers.json");

let cache: Record<string, string> | null = null;

export function getCoversCache(): Record<string, string> {
  if (!cache) {
    try {
      cache = JSON.parse(fs.readFileSync(COVERS_FILE, "utf-8"));
    } catch {
      cache = {};
    }
  }
  return cache!;
}
