import { SkiffGame } from "./engine.mjs";

const g = new SkiffGame();
console.log("start", g.snapshot().system.name, g.snapshot().credits);
const chart = g.chart("local");
console.log("local nodes", chart.nodes.map((n) => n.id).join(","));
const buy = g.buy("ore", 5);
console.log("buy", buy.ok, buy.credits, buy.cargo?.ore);
const jumpTarget = chart.nodes.find((n) => !n.here && n.reach);
if (!jumpTarget) throw new Error("no jump target");
g.refuel();
let j = g.jump(jumpTarget.id);
console.log("jump", jumpTarget.id, j.log, j.pendingEncounter?.kind || "clear");
if (j.pendingEncounter) {
  j = g.resolveEncounter("b");
  console.log("resolved", j.log);
}
// stress ash if in range else keep jumping
for (let i = 0; i < 8; i++) {
  const c = g.chart("sector");
  const ash = c.nodes.find((n) => n.id === "ash" && n.reach && !n.here);
  const any = c.nodes.find((n) => n.reach && !n.here);
  const t = ash || any;
  if (!t) break;
  if (g.state.fuel < 3) g.refuel();
  j = g.jump(t.id);
  if (j.pendingEncounter) g.resolveEncounter(j.pendingEncounter.kind === "corsair" ? "b" : "a");
}
console.log("end", g.snapshot().system.name, g.snapshot().netWorth, g.snapshot().log);
console.log("SMOKE_OK");
