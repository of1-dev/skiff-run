#!/usr/bin/env node
import http from "node:http";

const URL = process.argv.includes("--url") ? process.argv[process.argv.indexOf("--url") + 1] : "http://127.0.0.1:8787";
const INTERVAL = process.argv.includes("--interval") ? parseInt(process.argv[process.argv.indexOf("--interval") + 1], 10) : 1000;
const MAX_STEPS = process.argv.includes("--steps") ? parseInt(process.argv[process.argv.indexOf("--steps") + 1], 10) : Infinity;

async function fetchState() {
  return new Promise((resolve, reject) => {
    http.get(`${URL}/api/state`, (res) => {
      let data = "";
      res.on("data", chunk => data += chunk);
      res.on("end", () => resolve(JSON.parse(data)));
    }).on("error", reject);
  });
}

async function act(body) {
  body.actor = "agent";
  return new Promise((resolve, reject) => {
    const req = http.request(`${URL}/api/act`, {
      method: "POST",
      headers: { "Content-Type": "application/json" }
    }, (res) => {
      let data = "";
      res.on("data", chunk => data += chunk);
      res.on("end", () => resolve(JSON.parse(data)));
    });
    req.on("error", reject);
    req.write(JSON.stringify(body));
    req.end();
  });
}

function getDistance(pos1, pos2) {
  const dx = pos1.x - pos2.x;
  const dy = pos1.y - pos2.y;
  return Math.sqrt(dx * dx + dy * dy);
}

async function turn() {
  const { state, pendingEncounter, snapshot } = await fetchState();
  if (!state || !snapshot) {
    console.log("[AutoPilot] Invalid state received");
    return;
  }
  
  if (state.pilot !== "agent") {
    console.log(`[AutoPilot] Yielding: stick belongs to ${state.pilot}. Waiting...`);
    return;
  }

  // Handle encounters
  if (pendingEncounter) {
    const choice = snapshot.ship.weapons ? "a" : "b"; // fight if weapons, else flee
    console.log(`[AutoPilot] Encounter detected! Resolving with choice ${choice}`);
    await act({ op: "encounter", choice });
    return;
  }

  // Retire if possible
  if (snapshot.canRetire) {
    console.log("[AutoPilot] Can retire! Retiring...");
    await act({ op: "retire" });
    process.exit(0);
  }

  // Dock work & press
  if (state.dockWorkAt !== state.epoch) {
    console.log("[AutoPilot] Working the docks");
    await act({ op: "dock_work" });
    return;
  }
  if (state.pressBoughtAt !== state.epoch && snapshot.credits >= 50) {
    console.log("[AutoPilot] Buying press");
    await act({ op: "buy_press" });
    return;
  }

  // Refuel
  if (snapshot.fuel < snapshot.fuelMax && snapshot.credits >= 10) {
    console.log("[AutoPilot] Refueling");
    await act({ op: "refuel" });
    return;
  }

  // Sell expensive
  const holding = Object.keys(snapshot.cargo).filter(k => snapshot.cargo[k] > 0);
  if (holding.length > 0) {
    console.log(`[AutoPilot] Liquidating expensive cargo...`);
    const res = await act({ op: "sell_expensive" });
    if (res.result && res.result.ok && res.result.log && !res.result.log.includes("Nothing expensive")) {
      console.log("[AutoPilot] Sold expensive:", res.result.log);
      return;
    }
    // if full and nothing was explicitly expensive, sell all to free space
    if (snapshot.cargoUsed === snapshot.cargoMax) {
       console.log("[AutoPilot] Hold full, dumping all cargo to keep moving");
       await act({ op: "sell_all" });
       return;
    }
  }

  // Buy cheap
  if (snapshot.cargoUsed < snapshot.cargoMax && snapshot.credits > 100) {
    const res = await act({ op: "fill_cheap" });
    if (res.result && res.result.ok && res.result.log && !res.result.log.includes("Nothing cheap")) {
      console.log("[AutoPilot] Filling cheap cargo:", res.result.log);
      return;
    }
  }

  // Jump to a reachable system
  const currentPos = state.chart.pos[state.system];
  let bestTarget = null;
  let bestDist = Infinity;

  for (const [sys, pos] of Object.entries(state.chart.pos)) {
    if (sys === state.system) continue;
    const dist = getDistance(currentPos, pos);
    if (dist <= snapshot.ship.range) {
      // Prioritize unvisited systems
      if (!snapshot.visited[sys]) {
        bestTarget = sys;
        break;
      }
      if (dist < bestDist) {
        bestDist = dist;
        bestTarget = sys;
      }
    }
  }

  if (bestTarget) {
    console.log(`[AutoPilot] Jumping to ${bestTarget}`);
    await act({ op: "jump", system: bestTarget });
  } else {
    console.log(`[AutoPilot] No jump target found in range.`);
  }
}

let steps = 0;
async function loop() {
  try {
    await turn();
  } catch (e) {
    console.error("[AutoPilot] Error:", e.message);
  }
  steps++;
  if (steps < MAX_STEPS) {
    setTimeout(loop, INTERVAL);
  } else {
    console.log(`[AutoPilot] Max steps (${MAX_STEPS}) reached. Exiting.`);
  }
}

console.log(`[AutoPilot] Starting Skiff Run autonomous driver...`);
console.log(`[AutoPilot] Target: ${URL}`);
loop();
