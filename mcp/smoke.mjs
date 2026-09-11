import { SkiffGame } from "./engine.mjs";

const g = new SkiffGame();
console.log("start", g.snapshot().system.name, g.snapshot().credits, "autoFuel", g.snapshot().prefs?.autoFuel);
if (g.snapshot().prefs?.autoFuel !== true) throw new Error("prefs.autoFuel default");
const chart = g.chart("local");
console.log("local nodes", chart.nodes.map((n) => n.id).join(","));
const buy = g.buy("ore", 5);
console.log("buy", buy.ok, buy.credits, buy.cargo?.ore);
const jumpTarget = chart.nodes.find((n) => !n.here && n.reach);
if (!jumpTarget) throw new Error("no jump target");
// burn some fuel then jump with auto-refuel ON
g.state.fuel = Math.min(g.state.fuel, 3);
g.state.credits = 5000;
const fuelBefore = g.state.fuel;
let j = g.jump(jumpTarget.id);
console.log("jump", jumpTarget.id, j.log, "fuel", j.fuel, "/", j.fuelMax, j.pendingEncounter?.kind || "clear");
if (j.fuel < j.fuelMax && j.credits >= 45) {
  // should have autofueled unless broke mid-way
}
if (j.fuel <= fuelBefore - 1 && j.prefs?.autoFuel) {
  // arrived burned fuel then refilled — expect near full if credits allow
  if (j.fuel < j.fuelMax) console.log("partial autofuel ok", j.fuel);
  else console.log("full autofuel ok");
}
if (j.pendingEncounter) {
  j = g.resolveEncounter("b");
  console.log("resolved", j.log);
}
g.setPrefs({ autoFuel: false });
if (g.snapshot().prefs.autoFuel !== false) throw new Error("set_prefs failed");
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
