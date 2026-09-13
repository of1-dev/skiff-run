/**
 * Skiff Run — fuel / jump / refuel (pure, ATDD).
 */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.SkiffFuel = factory();
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const FUEL_DIST = 14;
  const FUEL_PRICE = 45;

  function dist(a, b) {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  function fuelCost(from, to) {
    return Math.max(1, Math.ceil(dist(from, to) / FUEL_DIST));
  }

  function inRange(from, to, hullRange) {
    return dist(from, to) <= hullRange + 0.01;
  }

  function fuelReachDistance(fuel, hullRange) {
    const f = Math.max(0, fuel | 0);
    return Math.min(hullRange, f * FUEL_DIST);
  }

  function canJumpTo(opts) {
    const { from, to, hullRange, fuel } = opts;
    if (!from || !to || from === to || from.id === to.id) return false;
    if (!inRange(from, to, hullRange)) return false;
    return fuel >= fuelCost(from, to);
  }

  function applyRefuel(opts) {
    const { fuel, fuelMax, credits } = opts;
    const price = opts.price == null ? FUEL_PRICE : opts.price;
    const need = fuelMax - fuel;
    if (need <= 0) return { ok: false, reason: "full", fuel, credits };
    const cost = need * price;
    if (credits < cost) {
      const can = Math.floor(credits / price);
      if (can <= 0) return { ok: false, reason: "credits", fuel, credits };
      return {
        ok: true,
        partial: true,
        fuel: fuel + can,
        credits: credits - can * price,
        bought: can,
      };
    }
    return {
      ok: true,
      partial: false,
      fuel: fuelMax,
      credits: credits - cost,
      bought: need,
    };
  }

  return {
    FUEL_DIST,
    FUEL_PRICE,
    dist,
    fuelCost,
    inRange,
    fuelReachDistance,
    canJumpTo,
    applyRefuel,
  };
});
