/**
 * Skiff Run — Pure logic functions (pure, unit-testable, ATDD).
 * Exposes pure importable functions for:
 * - Trade price calculation
 * - Jump distance / fuel cost
 * - Encounter outcome resolution
 */
(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    const market = require("./market.js");
    const fuel = require("./fuel.js");
    const combat = require("./core/combat.js");
    module.exports = factory(market, fuel, combat);
  } else {
    root.SkiffPureLogic = factory(root.SkiffMarket, root.SkiffFuel, root.SkiffCombat);
  }
})(typeof globalThis !== "undefined" ? globalThis : this, function (SkiffMarket, SkiffFuel, SkiffCombat) {
  "use strict";

  function calculateTradePrice(system, good) {
    if (!system || !good) return 8;
    return SkiffMarket.priceFor(system, good);
  }

  function calculateDistance(a, b) {
    return SkiffFuel.dist(a, b);
  }

  function calculateFuelCost(from, to) {
    return SkiffFuel.fuelCost(from, to);
  }

  function resolveEncounterOutcome(params) {
    return SkiffCombat.resolveEncounter(params);
  }

  return {
    calculateTradePrice: calculateTradePrice,
    priceFor: calculateTradePrice,
    calculateDistance: calculateDistance,
    dist: calculateDistance,
    calculateFuelCost: calculateFuelCost,
    fuelCost: calculateFuelCost,
    resolveEncounterOutcome: resolveEncounterOutcome,
    resolveEncounter: resolveEncounterOutcome,
  };
});
