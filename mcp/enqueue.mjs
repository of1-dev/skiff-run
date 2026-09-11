import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
const dir = path.dirname(fileURLToPath(import.meta.url));
const body = JSON.parse(process.argv[2]);
fs.mkdirSync(path.join(dir, "session"), { recursive: true });
fs.writeFileSync(path.join(dir, "session", "inbox.json"), JSON.stringify(body));
console.log("enqueued", body.op || body);
