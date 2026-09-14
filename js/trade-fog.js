/**
 * Skiff Run — trade fog of war. Pure ATDD.
 * Out-of-sector docks: no price peeks / lane margins / chart trade halos.
 * Dock Press paid tips can still name far markets (intentional).
 */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.SkiffTradeFog = factory();
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const SECTOR_RADIUS = 48;

  function inSector(dist, sectorRadius) {
    const r = sectorRadius == null ? SECTOR_RADIUS : sectorRadius;
    return (dist || 0) <= r + 0.01;
  }

  /** True when captain can see trade intel for target from here. */
  function canSeeTradeIntel(opts) {
    const dist = opts && opts.dist;
    const radius = opts && opts.sectorRadius;
    if (dist == null || Number.isNaN(dist)) return false;
    return inSector(dist, radius);
  }

  return { SECTOR_RADIUS, inSector, canSeeTradeIntel };
});
