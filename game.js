(() => {
  "use strict";
  const VERSION = "0.9.14";
  const SAVE_KEY = "skiff-run-v1";
  const THEME_KEY = "skiff-run-theme";
  const bridgeOn = (() => {
    try { return new URLSearchParams(location.search).get("bridge") === "1"; }
    catch (_) { return false; }
  })();
  const THEMES = ["cobalt", "coffee", "lcars"];
  const RETIRE_NET = (globalThis.SkiffMarket && globalThis.SkiffMarket.RETIRE_NET) || 35000;
  const FUEL_PRICE = (globalThis.SkiffFuel && globalThis.SkiffFuel.FUEL_PRICE) || 45;
  const CREW_HIRE = 800;
  const CREW_FIRE_REFUND = 200;
  // DOCK_WORK_PAY from js/yard-economy.js (SkiffYardEconomy)

  const GOODS = [
    { id: "ore", name: "Basalt Ore", base: 40 },
    { id: "grain", name: "Dry Grain", base: 28 },
    { id: "optics", name: "Lens Optics", base: 95 },
    { id: "meds", name: "Field Meds", base: 110 },
    { id: "spice", name: "Rack Spice", base: 70 },
    { id: "scrap", name: "Hull Scrap", base: 22 },
  ];

  // x/y are map coords (0–100). Links kept for lore; jump range is distance + hull.range.
  // Named roster is fixed; x/y are filled per New-game chart seed.
  // tech 0–7, size 0–4, police/pirate 0–7 (Absent…Swarms). Original gov labels.
  const ACTIVITY = ["Absent", "Minimal", "Few", "Some", "Moderate", "Many", "Abundant", "Swarms"];
  const TECH_NAME = ["Pre-ag", "Ag", "Low", "Craft", "Early-ind", "Industrial", "Post-ind", "Hi-tech"];
  const SIZE_NAME = ["Tiny", "Small", "Medium", "Large", "Huge"];

  const SYSTEM_DEFS = [
    { id: "ember", name: "Ember Reach", mods: { ore: 0.7, optics: 1.3, meds: 1.1 }, yard: true,
      tech: 5, size: 3, gov: "Compact Hub", police: 4, pirate: 2 },
    { id: "glass", name: "Glass Orchard", mods: { grain: 0.65, spice: 1.25, scrap: 1.1 },
      tech: 3, size: 2, gov: "Orchard Freehold", police: 2, pirate: 3 },
    { id: "tide", name: "Tide Spur", mods: { meds: 0.75, ore: 1.2, optics: 1.15 },
      tech: 4, size: 2, gov: "Spur League", police: 3, pirate: 4 },
    { id: "ash", name: "Ash Meridian", mods: { scrap: 0.6, spice: 0.9, grain: 1.2 }, yard: true,
      tech: 4, size: 2, gov: "Fringe Compact", police: 1, pirate: 6 },
    { id: "knot", name: "Knot Harbor", mods: { optics: 0.8, meds: 1.3, ore: 1.1 }, yard: true,
      tech: 6, size: 3, gov: "Harbor Syndicate", police: 5, pirate: 2 },
    { id: "quiet", name: "Quiet Moon", mods: { grain: 1.1, spice: 1.1, scrap: 1.15 }, retire: true,
      tech: 2, size: 1, gov: "Quiet Protectorate", police: 3, pirate: 1 },
    { id: "cinder", name: "Cinder Well", mods: { ore: 0.74, scrap: 1.24, optics: 1.19 }, yard: true,
      tech: 4, size: 2, gov: "Well Compact", police: 3, pirate: 4 },
    { id: "ledger", name: "Drift Ledger", mods: { optics: 0.72, meds: 1.22, scrap: 1.17 },
      tech: 5, size: 2, gov: "Ledger Freehold", police: 4, pirate: 2 },
    { id: "spindle", name: "Rust Spindle", mods: { scrap: 0.61, grain: 1.26, meds: 1.06 },
      tech: 3, size: 2, gov: "Spindle League", police: 2, pirate: 5 },
    { id: "cobaltfen", name: "Cobalt Fen", mods: { meds: 0.72, optics: 1.17, scrap: 1.17 },
      tech: 5, size: 3, gov: "Fen Protectorate", police: 5, pirate: 1 },
    { id: "foldmargin", name: "Fold Margin", mods: { spice: 0.69, scrap: 1.3399999999999999, grain: 1.1400000000000001 },
      tech: 4, size: 2, gov: "Margin Compact", police: 2, pirate: 4 },
    { id: "palekiln", name: "Pale Kiln", mods: { ore: 0.6799999999999999, spice: 1.23, grain: 1.1300000000000001 },
      tech: 3, size: 2, gov: "Kiln Freehold", police: 2, pirate: 3 },
    { id: "ironquay", name: "Iron Quay", mods: { scrap: 0.63, meds: 1.23, ore: 1.08 }, yard: true,
      tech: 5, size: 3, gov: "Quay Syndicate", police: 4, pirate: 3 },
    { id: "softvault", name: "Soft Vault", mods: { meds: 0.7, ore: 1.15, optics: 1.1500000000000001 },
      tech: 6, size: 2, gov: "Vault Compact", police: 6, pirate: 1 },
    { id: "brinegate", name: "Brine Gate", mods: { grain: 0.6, ore: 1.2, meds: 1.05 },
      tech: 2, size: 2, gov: "Gate League", police: 3, pirate: 3 },
    { id: "sootladder", name: "Soot Ladder", mods: { scrap: 0.6799999999999999, meds: 1.2799999999999998, ore: 1.1300000000000001 },
      tech: 3, size: 1, gov: "Ladder Compact", police: 1, pirate: 5 },
    { id: "coppervein", name: "Copper Vein", mods: { ore: 0.63, spice: 1.18, grain: 1.08 },
      tech: 4, size: 2, gov: "Vein Freehold", police: 3, pirate: 3 },
    { id: "nightquill", name: "Night Quill", mods: { optics: 0.69, scrap: 1.24, grain: 1.1400000000000001 },
      tech: 5, size: 1, gov: "Quill Protectorate", police: 4, pirate: 2 },
    { id: "ambersluice", name: "Amber Sluice", mods: { spice: 0.69, scrap: 1.19, grain: 1.1400000000000001 },
      tech: 3, size: 2, gov: "Sluice League", police: 2, pirate: 4 },
    { id: "gritanchor", name: "Grit Anchor", mods: { scrap: 0.6799999999999999, meds: 1.2799999999999998, ore: 1.1300000000000001 },
      tech: 2, size: 2, gov: "Anchor Compact", police: 2, pirate: 5 },
    { id: "loomreach", name: "Loom Reach", mods: { optics: 0.69, scrap: 1.29, grain: 1.1400000000000001 }, yard: true,
      tech: 6, size: 3, gov: "Loom Syndicate", police: 5, pirate: 2 },
    { id: "voidpeddle", name: "Void Peddle", mods: { spice: 0.6599999999999999, grain: 1.3099999999999998, meds: 1.11 },
      tech: 4, size: 1, gov: "Peddle Freehold", police: 1, pirate: 6 },
    { id: "sparforge", name: "Spar Forge", mods: { ore: 0.69, scrap: 1.24, optics: 1.1400000000000001 },
      tech: 5, size: 2, gov: "Forge Compact", police: 3, pirate: 3 },
    { id: "claybeacon", name: "Clay Beacon", mods: { grain: 0.6599999999999999, optics: 1.16, spice: 1.11 },
      tech: 2, size: 2, gov: "Beacon League", police: 3, pirate: 2 },
    { id: "mistharbor", name: "Mist Harbor", mods: { meds: 0.63, spice: 1.18, ore: 1.08 },
      tech: 4, size: 3, gov: "Mist Syndicate", police: 4, pirate: 3 },
    { id: "rimequay", name: "Rime Quay", mods: { scrap: 0.6699999999999999, optics: 1.3199999999999998, spice: 1.12 },
      tech: 3, size: 2, gov: "Rime Compact", police: 2, pirate: 4 },
    { id: "flintcross", name: "Flint Cross", mods: { ore: 0.6, grain: 1.2999999999999998, meds: 1.05 },
      tech: 3, size: 2, gov: "Cross Freehold", police: 2, pirate: 4 },
    { id: "emberfall", name: "Emberfall", mods: { spice: 0.6799999999999999, meds: 1.3299999999999998, ore: 1.1300000000000001 },
      tech: 4, size: 2, gov: "Fall League", police: 3, pirate: 3 },
    { id: "saltmeridian", name: "Salt Meridian", mods: { grain: 0.62, meds: 1.3199999999999998, scrap: 1.07 },
      tech: 3, size: 2, gov: "Salt Compact", police: 3, pirate: 3 },
    { id: "oxbow", name: "Oxbow Dock", mods: { scrap: 0.64, spice: 1.3399999999999999, grain: 1.09 },
      tech: 2, size: 2, gov: "Oxbow Freehold", police: 2, pirate: 3 },
    { id: "wisphollow", name: "Wisp Hollow", mods: { meds: 0.62, optics: 1.27, scrap: 1.07 },
      tech: 1, size: 1, gov: "Hollow Protectorate", police: 1, pirate: 2 },
    { id: "brassladder", name: "Brass Ladder", mods: { optics: 0.64, scrap: 1.3399999999999999, grain: 1.09 }, yard: true,
      tech: 6, size: 2, gov: "Brass Syndicate", police: 5, pirate: 2 },
    { id: "duskorchard", name: "Dusk Orchard", mods: { grain: 0.6799999999999999, spice: 1.3299999999999998, ore: 1.1300000000000001 },
      tech: 3, size: 2, gov: "Dusk Freehold", police: 2, pirate: 3 },
    { id: "coilharbor", name: "Coil Harbor", mods: { ore: 0.71, optics: 1.16, spice: 1.1600000000000001 },
      tech: 5, size: 3, gov: "Coil Compact", police: 4, pirate: 3 },
    { id: "redledger", name: "Red Ledger", mods: { spice: 0.72, optics: 1.17, scrap: 1.17 },
      tech: 4, size: 2, gov: "Red League", police: 2, pirate: 5 },
    { id: "palespur", name: "Pale Spur", mods: { meds: 0.6599999999999999, grain: 1.3099999999999998, spice: 1.11 },
      tech: 4, size: 1, gov: "Pale League", police: 3, pirate: 3 },
    { id: "tinreach", name: "Tin Reach", mods: { scrap: 0.6599999999999999, grain: 1.21, meds: 1.11 },
      tech: 3, size: 2, gov: "Tin Compact", police: 3, pirate: 3 },
    { id: "mosskiln", name: "Moss Kiln", mods: { grain: 0.7, ore: 1.15, meds: 1.1500000000000001 },
      tech: 2, size: 2, gov: "Moss Freehold", police: 2, pirate: 2 },
    { id: "shardquay", name: "Shard Quay", mods: { optics: 0.63, spice: 1.3299999999999998, ore: 1.08 },
      tech: 5, size: 2, gov: "Shard Syndicate", police: 4, pirate: 3 },
    { id: "windfold", name: "Windfold", mods: { spice: 0.6, ore: 1.2999999999999998, optics: 1.05 },
      tech: 3, size: 1, gov: "Fold Compact", police: 1, pirate: 5 },
    { id: "cruciblefen", name: "Crucible Fen", mods: { ore: 0.74, scrap: 1.29, optics: 1.19 },
      tech: 5, size: 2, gov: "Crucible League", police: 3, pirate: 4 },
    { id: "lumendrift", name: "Lumen Drift", mods: { optics: 0.62, meds: 1.17, scrap: 1.07 }, yard: true,
      tech: 7, size: 3, gov: "Lumen Syndicate", police: 6, pirate: 1 },
    { id: "ashenquill", name: "Ashen Quill", mods: { meds: 0.73, spice: 1.3299999999999998, ore: 1.1800000000000002 },
      tech: 4, size: 1, gov: "Ashen Protectorate", police: 3, pirate: 3 },
    { id: "thornharbor", name: "Thorn Harbor", mods: { scrap: 0.6799999999999999, meds: 1.2799999999999998, ore: 1.1300000000000001 },
      tech: 3, size: 2, gov: "Thorn Compact", police: 2, pirate: 5 },
    { id: "silkbasalt", name: "Silk Basalt", mods: { ore: 0.61, optics: 1.21, spice: 1.06 },
      tech: 4, size: 2, gov: "Basalt Freehold", police: 3, pirate: 2 },
    { id: "frostspindle", name: "Frost Spindle", mods: { optics: 0.64, scrap: 1.24, grain: 1.09 },
      tech: 5, size: 2, gov: "Frost League", police: 4, pirate: 2 },
    { id: "torchmargin", name: "Torch Margin", mods: { spice: 0.72, optics: 1.17, scrap: 1.17 },
      tech: 3, size: 2, gov: "Torch Compact", police: 2, pirate: 4 },
    { id: "nettlegate", name: "Nettle Gate", mods: { grain: 0.64, scrap: 1.24, optics: 1.09 },
      tech: 2, size: 2, gov: "Nettle League", police: 3, pirate: 3 },
    { id: "obsidianfen", name: "Obsidian Fen", mods: { ore: 0.74, scrap: 1.29, optics: 1.19 },
      tech: 4, size: 2, gov: "Obsidian Compact", police: 2, pirate: 5 },
    { id: "coralledger", name: "Coral Ledger", mods: { meds: 0.61, grain: 1.3099999999999998, spice: 1.06 },
      tech: 5, size: 2, gov: "Coral Freehold", police: 4, pirate: 2 },
    { id: "skiffmere", name: "Skiffmere", mods: { scrap: 0.71, grain: 1.3099999999999998, meds: 1.1600000000000001 },
      tech: 3, size: 2, gov: "Mere Compact", police: 3, pirate: 3 },
    { id: "quillbone", name: "Quillbone", mods: { optics: 0.71, grain: 1.26, spice: 1.1600000000000001 },
      tech: 4, size: 1, gov: "Bone Protectorate", police: 3, pirate: 4 },
    { id: "marrowdock", name: "Marrow Dock", mods: { scrap: 0.61, grain: 1.16, meds: 1.06 },
      tech: 2, size: 2, gov: "Marrow League", police: 2, pirate: 4 },
    { id: "vellumreach", name: "Vellum Reach", mods: { meds: 0.6599999999999999, grain: 1.3099999999999998, spice: 1.11 },
      tech: 6, size: 2, gov: "Vellum Syndicate", police: 5, pirate: 1 },
    { id: "pitchorchard", name: "Pitch Orchard", mods: { grain: 0.6, ore: 1.2999999999999998, meds: 1.05 },
      tech: 3, size: 2, gov: "Pitch Freehold", police: 2, pirate: 3 },
    { id: "crowbarquay", name: "Crowbar Quay", mods: { ore: 0.6, grain: 1.15, meds: 1.05 },
      tech: 3, size: 2, gov: "Crowbar Compact", police: 1, pirate: 6 },
    { id: "lanternspur", name: "Lantern Spur", mods: { spice: 0.74, scrap: 1.29, grain: 1.19 },
      tech: 4, size: 2, gov: "Lantern League", police: 3, pirate: 3 },
    { id: "softiron", name: "Soft Iron", mods: { ore: 0.74, scrap: 1.19, optics: 1.19 },
      tech: 5, size: 3, gov: "Iron Compact", police: 4, pirate: 2 },
    { id: "dustcompact", name: "Dust Compact", mods: { scrap: 0.6599999999999999, grain: 1.26, meds: 1.11 },
      tech: 2, size: 2, gov: "Dust Freehold", police: 2, pirate: 4 },
    { id: "coalridge", name: "Ridge of Coals", mods: { ore: 0.6799999999999999, spice: 1.3299999999999998, grain: 1.1300000000000001 },
      tech: 3, size: 2, gov: "Ridge League", police: 2, pirate: 4 },
    { id: "mirrorbasin", name: "Mirror Basin", mods: { optics: 0.6699999999999999, meds: 1.27, scrap: 1.12 },
      tech: 6, size: 2, gov: "Basin Syndicate", police: 5, pirate: 2 },
    { id: "hearthknot", name: "Hearth Knot", mods: { meds: 0.6, ore: 1.15, optics: 1.05 }, yard: true,
      tech: 5, size: 3, gov: "Hearth Compact", police: 4, pirate: 2 },
    { id: "farember", name: "Far Ember", mods: { spice: 0.71, grain: 1.3099999999999998, meds: 1.1600000000000001 },
      tech: 4, size: 1, gov: "Far Compact", police: 2, pirate: 5 },
    { id: "gutterwake", name: "Gutter Wake", mods: { scrap: 0.71, grain: 1.26, meds: 1.1600000000000001 },
      tech: 2, size: 1, gov: "Wake Freehold", police: 1, pirate: 6 }
  ];
  let SYSTEMS = SYSTEM_DEFS.map((s) => Object.assign({ x: 50, y: 50 }, s));

  const SHIPS = [
    // Soft-fail escape (Flea homage). Free Take; scrap pads + full yards.
    { id: "mite", name: "Mite", cargo: 10, fuelMax: 10, range: 20, weapons: false, crewMax: 1, price: 0 },
    // Fresh game still starts in Skiff-7, not Mite.
    { id: "skiff-7", name: "Skiff-7", cargo: 20, fuelMax: 14, range: 28, weapons: false, crewMax: 1, price: 0 },
    { id: "glass-dart", name: "Glass Dart", cargo: 12, fuelMax: 16, range: 42, weapons: false, crewMax: 1, price: 4500 },
    { id: "tide-runner", name: "Tide Runner", cargo: 24, fuelMax: 16, range: 34, weapons: false, crewMax: 2, price: 7000 },
    { id: "knot-hauler", name: "Knot Hauler", cargo: 32, fuelMax: 17, range: 30, weapons: false, crewMax: 3, price: 8000 },
    { id: "hold-barge", name: "Hold Barge", cargo: 40, fuelMax: 18, range: 32, weapons: false, crewMax: 3, price: 9000 },
    { id: "ember-cutter", name: "Ember Cutter", cargo: 16, fuelMax: 16, range: 38, weapons: true, crewMax: 2, price: 12000 },
    { id: "ash-lance", name: "Ash Lance", cargo: 14, fuelMax: 18, range: 40, weapons: true, crewMax: 2, price: 15000 },
    { id: "quiet-ark", name: "Quiet Ark", cargo: 50, fuelMax: 22, range: 36, weapons: false, crewMax: 4, price: 22000 },
    { id: "wasp-prime", name: "Wasp Prime", cargo: 18, fuelMax: 20, range: 44, weapons: true, crewMax: 3, price: 28000 },
    // Unbowed: HULL_SVG only — unlock later, never open yard stock.
  ];

  function sys(id) { return SYSTEMS.find((s) => s.id === id); }
  function ship(id) { return SHIPS.find((s) => s.id === id); }
  function hull() { return ship(state.shipId) || SHIPS[0]; }

  // Shared hull art — original silhouettes; inline so themes tint via currentColor.
  const HULL_SVG = {"ash-lance": "<svg class=\"hull-svg\" xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 160 80\" fill=\"none\" aria-hidden=\"true\">\n  <!-- pirate hunter -->\n  <defs>\n    <linearGradient id=\"metal-ash-lance\" x1=\"0\" y1=\"0\" x2=\"0\" y2=\"1\">\n      <stop offset=\"0%\" stop-color=\"#E8EEF6\"/>\n      <stop offset=\"45%\" stop-color=\"#9AA8BC\"/>\n      <stop offset=\"100%\" stop-color=\"#4A5568\"/>\n    </linearGradient>\n    <linearGradient id=\"shade-ash-lance\" x1=\"0\" y1=\"0\" x2=\"1\" y2=\"0\">\n      <stop offset=\"0%\" stop-color=\"#2A3340\" stop-opacity=\".55\"/>\n      <stop offset=\"55%\" stop-color=\"#2A3340\" stop-opacity=\"0\"/>\n    </linearGradient>\n    <linearGradient id=\"glow-ash-lance\" x1=\"0\" y1=\"0\" x2=\"1\" y2=\"0\">\n      <stop offset=\"0%\" stop-color=\"#FFB24A\" stop-opacity=\".95\"/>\n      <stop offset=\"100%\" stop-color=\"#FF6A2A\" stop-opacity=\".15\"/>\n    </linearGradient>\n    <radialGradient id=\"canopy-ash-lance\" cx=\"50%\" cy=\"40%\" r=\"65%\">\n      <stop offset=\"0%\" stop-color=\"#B8F0FF\"/>\n      <stop offset=\"55%\" stop-color=\"#3AA0C8\"/>\n      <stop offset=\"100%\" stop-color=\"#0B3A4A\"/>\n    </radialGradient>\n  </defs>\n  <ellipse cx=\"90\" cy=\"64\" rx=\"52\" ry=\"3.5\" fill=\"#000\" opacity=\".28\"/>\n  <g id=\"hull\">\n    <path fill=\"url(#metal-ash-lance)\" d=\"M14 36 L14 48 L36 56 L104 50 L158 40 L104 30 L36 24 Z\"/>\n    <path fill=\"url(#shade-ash-lance)\" d=\"M14 36 L14 48 L36 56 L104 50 L158 40 L104 30 L36 24 Z\"/>\n    <path fill=\"#6B7788\" d=\"M48 26 L80 14 L84 28 Z\"/>\n    <path fill=\"#6B7788\" d=\"M48 54 L80 66 L84 52 Z\"/>\n    <path stroke=\"#EEF3FA\" stroke-width=\".8\" opacity=\".5\" d=\"M40 34 L130 38 M40 46 L130 42\"/>\n  </g>\n  <g id=\"canopy\">\n    <circle cx=\"100\" cy=\"40\" r=\"3\" fill=\"#E8FBFF\" opacity=\".85\"/>\n    <rect x=\"90\" y=\"33\" width=\"22\" height=\"13\" rx=\"2\" fill=\"url(#canopy-ash-lance)\"/>\n  </g>\n  <g id=\"thruster\">\n    <rect x=\"2\" y=\"37\" width=\"14\" height=\"10\" rx=\"2\" fill=\"#2A3340\"/>\n    <ellipse cx=\"1\" cy=\"42\" rx=\"7\" ry=\"4.5\" fill=\"url(#glow-ash-lance)\"/>\n  </g>\n  <g id=\"hit-flash\" opacity=\"0\"><rect width=\"160\" height=\"80\" fill=\"#fff\"/></g>\n</svg>\n", "ember-cutter": "<svg class=\"hull-svg\" xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 160 80\" fill=\"none\" aria-hidden=\"true\">\n  <!-- armed cutter -->\n  <defs>\n    <linearGradient id=\"metal-ember-cutter\" x1=\"0\" y1=\"0\" x2=\"0\" y2=\"1\">\n      <stop offset=\"0%\" stop-color=\"#E8EEF6\"/>\n      <stop offset=\"45%\" stop-color=\"#9AA8BC\"/>\n      <stop offset=\"100%\" stop-color=\"#4A5568\"/>\n    </linearGradient>\n    <linearGradient id=\"shade-ember-cutter\" x1=\"0\" y1=\"0\" x2=\"1\" y2=\"0\">\n      <stop offset=\"0%\" stop-color=\"#2A3340\" stop-opacity=\".55\"/>\n      <stop offset=\"55%\" stop-color=\"#2A3340\" stop-opacity=\"0\"/>\n    </linearGradient>\n    <linearGradient id=\"glow-ember-cutter\" x1=\"0\" y1=\"0\" x2=\"1\" y2=\"0\">\n      <stop offset=\"0%\" stop-color=\"#FFB24A\" stop-opacity=\".95\"/>\n      <stop offset=\"100%\" stop-color=\"#FF6A2A\" stop-opacity=\".15\"/>\n    </linearGradient>\n    <radialGradient id=\"canopy-ember-cutter\" cx=\"50%\" cy=\"40%\" r=\"65%\">\n      <stop offset=\"0%\" stop-color=\"#B8F0FF\"/>\n      <stop offset=\"55%\" stop-color=\"#3AA0C8\"/>\n      <stop offset=\"100%\" stop-color=\"#0B3A4A\"/>\n    </radialGradient>\n  </defs>\n  <ellipse cx=\"88\" cy=\"64\" rx=\"50\" ry=\"3.5\" fill=\"#000\" opacity=\".28\"/>\n  <g id=\"hull\">\n    <path fill=\"url(#metal-ember-cutter)\" d=\"M16 38 L16 46 L40 54 L112 48 L154 40 L112 32 L40 26 Z\"/>\n    <path fill=\"url(#shade-ember-cutter)\" d=\"M16 38 L16 46 L40 54 L112 48 L154 40 L112 32 L40 26 Z\"/>\n    <path fill=\"#7A8798\" d=\"M70 16 L94 12 L96 20 L74 24 Z\"/>\n    <path fill=\"#7A8798\" d=\"M70 64 L94 68 L96 60 L74 56 Z\"/>\n    <path stroke=\"#EEF3FA\" stroke-width=\".8\" opacity=\".55\" d=\"M48 34 L120 38 M48 46 L120 42\"/>\n  </g>\n  <g id=\"canopy\">\n    <rect x=\"100\" y=\"33\" width=\"18\" height=\"13\" rx=\"2\" fill=\"url(#canopy-ember-cutter)\"/>\n    <rect x=\"102\" y=\"35\" width=\"5\" height=\"4\" rx=\".4\" fill=\"#E8FBFF\" opacity=\".55\"/>\n  </g>\n  <g id=\"thruster\">\n    <rect x=\"4\" y=\"35\" width=\"14\" height=\"14\" rx=\"2\" fill=\"#2A3340\"/>\n    <ellipse cx=\"3\" cy=\"42\" rx=\"7\" ry=\"5\" fill=\"url(#glow-ember-cutter)\"/>\n  </g>\n  <g id=\"hit-flash\" opacity=\"0\"><rect width=\"160\" height=\"80\" fill=\"#fff\"/></g>\n</svg>\n", "glass-dart": "<svg class=\"hull-svg\" xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 160 80\" fill=\"none\" aria-hidden=\"true\">\n  <!-- fast needle courier -->\n  <defs>\n    <linearGradient id=\"metal-glass-dart\" x1=\"0\" y1=\"0\" x2=\"0\" y2=\"1\">\n      <stop offset=\"0%\" stop-color=\"#E8EEF6\"/>\n      <stop offset=\"45%\" stop-color=\"#9AA8BC\"/>\n      <stop offset=\"100%\" stop-color=\"#4A5568\"/>\n    </linearGradient>\n    <linearGradient id=\"shade-glass-dart\" x1=\"0\" y1=\"0\" x2=\"1\" y2=\"0\">\n      <stop offset=\"0%\" stop-color=\"#2A3340\" stop-opacity=\".55\"/>\n      <stop offset=\"55%\" stop-color=\"#2A3340\" stop-opacity=\"0\"/>\n    </linearGradient>\n    <linearGradient id=\"glow-glass-dart\" x1=\"0\" y1=\"0\" x2=\"1\" y2=\"0\">\n      <stop offset=\"0%\" stop-color=\"#FFB24A\" stop-opacity=\".95\"/>\n      <stop offset=\"100%\" stop-color=\"#FF6A2A\" stop-opacity=\".15\"/>\n    </linearGradient>\n    <radialGradient id=\"canopy-glass-dart\" cx=\"50%\" cy=\"40%\" r=\"65%\">\n      <stop offset=\"0%\" stop-color=\"#B8F0FF\"/>\n      <stop offset=\"55%\" stop-color=\"#3AA0C8\"/>\n      <stop offset=\"100%\" stop-color=\"#0B3A4A\"/>\n    </radialGradient>\n  </defs>\n  <ellipse cx=\"90\" cy=\"62\" rx=\"50\" ry=\"3.2\" fill=\"#000\" opacity=\".25\"/>\n  <g id=\"hull\">\n    <path fill=\"url(#metal-glass-dart)\" d=\"M12 38 L40 32 L132 36 L156 40 L132 44 L40 48 L12 42 Z\"/>\n    <path fill=\"url(#shade-glass-dart)\" d=\"M12 38 L40 32 L132 36 L156 40 L132 44 L40 48 L12 42 Z\"/>\n    <path stroke=\"#E8EEF6\" stroke-width=\".8\" opacity=\".65\" d=\"M48 36 L120 38 M48 44 L120 42\"/>\n    <path stroke=\"#7EC8E8\" stroke-width=\"1.2\" opacity=\".45\" d=\"M60 30 L74 22 M60 50 L74 58\"/>\n  </g>\n  <g id=\"canopy\">\n    <ellipse cx=\"112\" cy=\"40\" rx=\"11\" ry=\"5.5\" fill=\"url(#canopy-glass-dart)\"/>\n    <ellipse cx=\"108\" cy=\"39\" rx=\"3\" ry=\"1.6\" fill=\"#E8FBFF\" opacity=\".65\"/>\n  </g>\n  <g id=\"thruster\">\n    <rect x=\"2\" y=\"37\" width=\"12\" height=\"8\" rx=\"1.5\" fill=\"#2A3340\"/>\n    <ellipse cx=\"1\" cy=\"41\" rx=\"6\" ry=\"3.5\" fill=\"url(#glow-glass-dart)\"/>\n  </g>\n  <g id=\"hit-flash\" opacity=\"0\"><rect width=\"160\" height=\"80\" fill=\"#fff\"/></g>\n</svg>\n", "hold-barge": "<svg class=\"hull-svg\" xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 160 80\" fill=\"none\" aria-hidden=\"true\">\n  <!-- fat cargo hauler -->\n  <defs>\n    <linearGradient id=\"metal-hold-barge\" x1=\"0\" y1=\"0\" x2=\"0\" y2=\"1\">\n      <stop offset=\"0%\" stop-color=\"#E8EEF6\"/>\n      <stop offset=\"45%\" stop-color=\"#9AA8BC\"/>\n      <stop offset=\"100%\" stop-color=\"#4A5568\"/>\n    </linearGradient>\n    <linearGradient id=\"shade-hold-barge\" x1=\"0\" y1=\"0\" x2=\"1\" y2=\"0\">\n      <stop offset=\"0%\" stop-color=\"#2A3340\" stop-opacity=\".55\"/>\n      <stop offset=\"55%\" stop-color=\"#2A3340\" stop-opacity=\"0\"/>\n    </linearGradient>\n    <linearGradient id=\"glow-hold-barge\" x1=\"0\" y1=\"0\" x2=\"1\" y2=\"0\">\n      <stop offset=\"0%\" stop-color=\"#FFB24A\" stop-opacity=\".95\"/>\n      <stop offset=\"100%\" stop-color=\"#FF6A2A\" stop-opacity=\".15\"/>\n    </linearGradient>\n    <radialGradient id=\"canopy-hold-barge\" cx=\"50%\" cy=\"40%\" r=\"65%\">\n      <stop offset=\"0%\" stop-color=\"#B8F0FF\"/>\n      <stop offset=\"55%\" stop-color=\"#3AA0C8\"/>\n      <stop offset=\"100%\" stop-color=\"#0B3A4A\"/>\n    </radialGradient>\n  </defs>\n  <ellipse cx=\"86\" cy=\"66\" rx=\"54\" ry=\"3.8\" fill=\"#000\" opacity=\".3\"/>\n  <g id=\"hull\">\n    <rect x=\"34\" y=\"30\" width=\"96\" height=\"30\" rx=\"3\" fill=\"url(#metal-hold-barge)\"/>\n    <rect x=\"34\" y=\"30\" width=\"96\" height=\"30\" rx=\"3\" fill=\"url(#shade-hold-barge)\"/>\n    <rect x=\"42\" y=\"14\" width=\"36\" height=\"18\" rx=\"2\" fill=\"url(#metal-hold-barge)\"/>\n    <rect x=\"84\" y=\"14\" width=\"36\" height=\"18\" rx=\"2\" fill=\"url(#metal-hold-barge)\"/>\n    <rect x=\"16\" y=\"32\" width=\"20\" height=\"26\" rx=\"2\" fill=\"#5A687A\"/>\n    <path stroke=\"#EEF3FA\" stroke-width=\".85\" opacity=\".55\" d=\"M50 30 L50 60 M70 30 L70 60 M90 30 L90 60 M110 30 L110 60 M42 22 L74 22 M84 22 L116 22\"/>\n  </g>\n  <g id=\"canopy\">\n    <rect x=\"48\" y=\"18\" width=\"24\" height=\"8\" rx=\"1\" fill=\"url(#canopy-hold-barge)\"/>\n  </g>\n  <g id=\"thruster\">\n    <rect x=\"4\" y=\"34\" width=\"12\" height=\"10\" rx=\"1.5\" fill=\"#2A3340\"/>\n    <rect x=\"4\" y=\"46\" width=\"12\" height=\"10\" rx=\"1.5\" fill=\"#2A3340\" opacity=\".9\"/>\n    <ellipse cx=\"3\" cy=\"39\" rx=\"5\" ry=\"3.5\" fill=\"url(#glow-hold-barge)\"/>\n    <ellipse cx=\"3\" cy=\"51\" rx=\"5\" ry=\"3.5\" fill=\"url(#glow-hold-barge)\"/>\n  </g>\n  <g id=\"hit-flash\" opacity=\"0\"><rect width=\"160\" height=\"80\" fill=\"#fff\"/></g>\n</svg>\n", "knot-hauler": "<svg class=\"hull-svg\" xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 160 80\" fill=\"none\" aria-hidden=\"true\">\n  <!-- mid cargo box -->\n  <defs>\n    <linearGradient id=\"metal-knot-hauler\" x1=\"0\" y1=\"0\" x2=\"0\" y2=\"1\">\n      <stop offset=\"0%\" stop-color=\"#E8EEF6\"/>\n      <stop offset=\"45%\" stop-color=\"#9AA8BC\"/>\n      <stop offset=\"100%\" stop-color=\"#4A5568\"/>\n    </linearGradient>\n    <linearGradient id=\"shade-knot-hauler\" x1=\"0\" y1=\"0\" x2=\"1\" y2=\"0\">\n      <stop offset=\"0%\" stop-color=\"#2A3340\" stop-opacity=\".55\"/>\n      <stop offset=\"55%\" stop-color=\"#2A3340\" stop-opacity=\"0\"/>\n    </linearGradient>\n    <linearGradient id=\"glow-knot-hauler\" x1=\"0\" y1=\"0\" x2=\"1\" y2=\"0\">\n      <stop offset=\"0%\" stop-color=\"#FFB24A\" stop-opacity=\".95\"/>\n      <stop offset=\"100%\" stop-color=\"#FF6A2A\" stop-opacity=\".15\"/>\n    </linearGradient>\n    <radialGradient id=\"canopy-knot-hauler\" cx=\"50%\" cy=\"40%\" r=\"65%\">\n      <stop offset=\"0%\" stop-color=\"#B8F0FF\"/>\n      <stop offset=\"55%\" stop-color=\"#3AA0C8\"/>\n      <stop offset=\"100%\" stop-color=\"#0B3A4A\"/>\n    </radialGradient>\n  </defs>\n  <ellipse cx=\"86\" cy=\"66\" rx=\"50\" ry=\"3.5\" fill=\"#000\" opacity=\".28\"/>\n  <g id=\"hull\">\n    <rect x=\"24\" y=\"30\" width=\"104\" height=\"28\" rx=\"3\" fill=\"url(#metal-knot-hauler)\"/>\n    <rect x=\"24\" y=\"30\" width=\"104\" height=\"28\" rx=\"3\" fill=\"url(#shade-knot-hauler)\"/>\n    <rect x=\"40\" y=\"14\" width=\"52\" height=\"18\" rx=\"2\" fill=\"url(#metal-knot-hauler)\"/>\n    <rect x=\"40\" y=\"14\" width=\"52\" height=\"18\" rx=\"2\" fill=\"#5A687A\" opacity=\".25\"/>\n    <path stroke=\"#EEF3FA\" stroke-width=\".8\" opacity=\".55\" d=\"M40 38 L120 38 M56 30 L56 58 M88 30 L88 58 M40 20 L88 20\"/>\n    <circle cx=\"38\" cy=\"60\" r=\"5\" fill=\"#4A5568\"/>\n    <circle cx=\"112\" cy=\"60\" r=\"5\" fill=\"#4A5568\"/>\n    <circle cx=\"38\" cy=\"60\" r=\"2\" fill=\"#2A3340\"/>\n    <circle cx=\"112\" cy=\"60\" r=\"2\" fill=\"#2A3340\"/>\n  </g>\n  <g id=\"canopy\">\n    <rect x=\"48\" y=\"18\" width=\"22\" height=\"9\" rx=\"1.5\" fill=\"url(#canopy-knot-hauler)\"/>\n    <rect x=\"50\" y=\"19.5\" width=\"6\" height=\"3\" rx=\"0.4\" fill=\"#E8FBFF\" opacity=\".5\"/>\n  </g>\n  <g id=\"thruster\">\n    <rect x=\"8\" y=\"34\" width=\"16\" height=\"18\" rx=\"2\" fill=\"#2A3340\"/>\n    <path fill=\"#5A687A\" opacity=\".7\" d=\"M126 32 L150 30 L150 54 L126 56 Z\"/>\n    <ellipse cx=\"7\" cy=\"43\" rx=\"6\" ry=\"5\" fill=\"url(#glow-knot-hauler)\"/>\n  </g>\n  <g id=\"hit-flash\" opacity=\"0\"><rect width=\"160\" height=\"80\" fill=\"#fff\"/></g>\n</svg>\n", "mite": "<svg class=\"hull-svg\" xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 160 80\" fill=\"none\" aria-hidden=\"true\">\n  <!-- tiny short-hopper -->\n  <defs>\n    <linearGradient id=\"metal-mite\" x1=\"0\" y1=\"0\" x2=\"0\" y2=\"1\">\n      <stop offset=\"0%\" stop-color=\"#E8EEF6\"/>\n      <stop offset=\"45%\" stop-color=\"#9AA8BC\"/>\n      <stop offset=\"100%\" stop-color=\"#4A5568\"/>\n    </linearGradient>\n    <linearGradient id=\"shade-mite\" x1=\"0\" y1=\"0\" x2=\"1\" y2=\"0\">\n      <stop offset=\"0%\" stop-color=\"#2A3340\" stop-opacity=\".55\"/>\n      <stop offset=\"55%\" stop-color=\"#2A3340\" stop-opacity=\"0\"/>\n    </linearGradient>\n    <linearGradient id=\"glow-mite\" x1=\"0\" y1=\"0\" x2=\"1\" y2=\"0\">\n      <stop offset=\"0%\" stop-color=\"#FFB24A\" stop-opacity=\".95\"/>\n      <stop offset=\"100%\" stop-color=\"#FF6A2A\" stop-opacity=\".15\"/>\n    </linearGradient>\n    <radialGradient id=\"canopy-mite\" cx=\"50%\" cy=\"40%\" r=\"65%\">\n      <stop offset=\"0%\" stop-color=\"#B8F0FF\"/>\n      <stop offset=\"55%\" stop-color=\"#3AA0C8\"/>\n      <stop offset=\"100%\" stop-color=\"#0B3A4A\"/>\n    </radialGradient>\n  </defs>\n  <ellipse cx=\"80\" cy=\"62\" rx=\"28\" ry=\"3.5\" fill=\"#000\" opacity=\".28\"/>\n  <g id=\"hull\">\n    <path fill=\"url(#metal-mite)\" d=\"M62 36 L104 31 L118 40 L104 49 L62 44 Z\"/>\n    <path fill=\"url(#shade-mite)\" d=\"M62 36 L104 31 L118 40 L104 49 L62 44 Z\"/>\n    <path stroke=\"#D7E0EC\" stroke-width=\".8\" opacity=\".7\" d=\"M72 38 L98 35 M72 42 L98 45\"/>\n    <path fill=\"#6B7788\" opacity=\".55\" d=\"M70 38 L86 40 L70 42 Z\"/>\n  </g>\n  <g id=\"canopy\">\n    <circle cx=\"72\" cy=\"40\" r=\"6.5\" fill=\"url(#canopy-mite)\"/>\n    <circle cx=\"70\" cy=\"38.5\" r=\"2\" fill=\"#E8FBFF\" opacity=\".7\"/>\n  </g>\n  <g id=\"thruster\">\n    <rect x=\"50\" y=\"36.5\" width=\"12\" height=\"7\" rx=\"1.5\" fill=\"#3A4452\"/>\n    <ellipse cx=\"49\" cy=\"40\" rx=\"5\" ry=\"3.2\" fill=\"url(#glow-mite)\"/>\n  </g>\n  <g id=\"hit-flash\" opacity=\"0\"><rect width=\"160\" height=\"80\" fill=\"#fff\"/></g>\n</svg>\n", "quiet-ark": "<svg class=\"hull-svg\" xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 160 80\" fill=\"none\" aria-hidden=\"true\">\n  <!-- late tank / ferry -->\n  <defs>\n    <linearGradient id=\"metal-quiet-ark\" x1=\"0\" y1=\"0\" x2=\"0\" y2=\"1\">\n      <stop offset=\"0%\" stop-color=\"#E8EEF6\"/>\n      <stop offset=\"45%\" stop-color=\"#9AA8BC\"/>\n      <stop offset=\"100%\" stop-color=\"#4A5568\"/>\n    </linearGradient>\n    <linearGradient id=\"shade-quiet-ark\" x1=\"0\" y1=\"0\" x2=\"1\" y2=\"0\">\n      <stop offset=\"0%\" stop-color=\"#2A3340\" stop-opacity=\".55\"/>\n      <stop offset=\"55%\" stop-color=\"#2A3340\" stop-opacity=\"0\"/>\n    </linearGradient>\n    <linearGradient id=\"glow-quiet-ark\" x1=\"0\" y1=\"0\" x2=\"1\" y2=\"0\">\n      <stop offset=\"0%\" stop-color=\"#FFB24A\" stop-opacity=\".95\"/>\n      <stop offset=\"100%\" stop-color=\"#FF6A2A\" stop-opacity=\".15\"/>\n    </linearGradient>\n    <radialGradient id=\"canopy-quiet-ark\" cx=\"50%\" cy=\"40%\" r=\"65%\">\n      <stop offset=\"0%\" stop-color=\"#B8F0FF\"/>\n      <stop offset=\"55%\" stop-color=\"#3AA0C8\"/>\n      <stop offset=\"100%\" stop-color=\"#0B3A4A\"/>\n    </radialGradient>\n  </defs>\n  <ellipse cx=\"88\" cy=\"68\" rx=\"58\" ry=\"4\" fill=\"#000\" opacity=\".3\"/>\n  <g id=\"hull\">\n    <path fill=\"url(#metal-quiet-ark)\" d=\"M20 28 C20 18, 36 12, 54 12 L122 12 C144 12, 154 26, 154 40 C154 54, 144 66, 122 66 L54 66 C36 66, 20 60, 20 50 Z\"/>\n    <path fill=\"url(#shade-quiet-ark)\" d=\"M20 28 C20 18, 36 12, 54 12 L122 12 C144 12, 154 26, 154 40 C154 54, 144 66, 122 66 L54 66 C36 66, 20 60, 20 50 Z\"/>\n    <rect x=\"50\" y=\"24\" width=\"74\" height=\"16\" rx=\"5\" fill=\"#5A687A\" opacity=\".4\"/>\n    <path stroke=\"#EEF3FA\" stroke-width=\".8\" opacity=\".45\" d=\"M54 20 L120 20 M54 48 L120 48 M70 14 L70 64 M100 14 L100 64\"/>\n  </g>\n  <g id=\"canopy\">\n    <circle cx=\"34\" cy=\"40\" r=\"7\" fill=\"url(#canopy-quiet-ark)\"/>\n    <circle cx=\"32\" cy=\"38\" r=\"2.2\" fill=\"#E8FBFF\" opacity=\".65\"/>\n    <rect x=\"72\" y=\"28\" width=\"28\" height=\"7\" rx=\"1.5\" fill=\"url(#canopy-quiet-ark)\" opacity=\".85\"/>\n  </g>\n  <g id=\"thruster\">\n    <rect x=\"4\" y=\"30\" width=\"20\" height=\"24\" rx=\"4\" fill=\"#2A3340\"/>\n    <ellipse cx=\"3\" cy=\"42\" rx=\"8\" ry=\"7\" fill=\"url(#glow-quiet-ark)\"/>\n  </g>\n  <g id=\"hit-flash\" opacity=\"0\"><rect width=\"160\" height=\"80\" fill=\"#fff\"/></g>\n</svg>\n", "skiff-7": "<svg class=\"hull-svg\" xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 160 80\" fill=\"none\" aria-hidden=\"true\">\n  <!-- starter light freighter -->\n  <defs>\n    <linearGradient id=\"metal-skiff-7\" x1=\"0\" y1=\"0\" x2=\"0\" y2=\"1\">\n      <stop offset=\"0%\" stop-color=\"#E8EEF6\"/>\n      <stop offset=\"45%\" stop-color=\"#9AA8BC\"/>\n      <stop offset=\"100%\" stop-color=\"#4A5568\"/>\n    </linearGradient>\n    <linearGradient id=\"shade-skiff-7\" x1=\"0\" y1=\"0\" x2=\"1\" y2=\"0\">\n      <stop offset=\"0%\" stop-color=\"#2A3340\" stop-opacity=\".55\"/>\n      <stop offset=\"55%\" stop-color=\"#2A3340\" stop-opacity=\"0\"/>\n    </linearGradient>\n    <linearGradient id=\"glow-skiff-7\" x1=\"0\" y1=\"0\" x2=\"1\" y2=\"0\">\n      <stop offset=\"0%\" stop-color=\"#FFB24A\" stop-opacity=\".95\"/>\n      <stop offset=\"100%\" stop-color=\"#FF6A2A\" stop-opacity=\".15\"/>\n    </linearGradient>\n    <radialGradient id=\"canopy-skiff-7\" cx=\"50%\" cy=\"40%\" r=\"65%\">\n      <stop offset=\"0%\" stop-color=\"#B8F0FF\"/>\n      <stop offset=\"55%\" stop-color=\"#3AA0C8\"/>\n      <stop offset=\"100%\" stop-color=\"#0B3A4A\"/>\n    </radialGradient>\n  </defs>\n  <ellipse cx=\"88\" cy=\"64\" rx=\"48\" ry=\"4\" fill=\"#000\" opacity=\".28\"/>\n  <g id=\"hull\">\n    <path fill=\"url(#metal-skiff-7)\" d=\"M28 34 L108 26 L146 40 L108 54 L28 48 Z\"/>\n    <path fill=\"url(#shade-skiff-7)\" d=\"M28 34 L108 26 L146 40 L108 54 L28 48 Z\"/>\n    <path stroke=\"#EEF3FA\" stroke-width=\".9\" opacity=\".55\" d=\"M48 36 L100 30 M48 46 L100 50 M70 32 L70 48\"/>\n    <path fill=\"#5C6A7C\" d=\"M52 46 L78 44 L78 56 L54 54 Z\"/>\n    <path stroke=\"#C5D0DE\" stroke-width=\".7\" d=\"M56 48 L74 46.5\"/>\n  </g>\n  <g id=\"canopy\">\n    <rect x=\"96\" y=\"33\" width=\"16\" height=\"13\" rx=\"2\" fill=\"url(#canopy-skiff-7)\"/>\n    <rect x=\"98\" y=\"35\" width=\"5\" height=\"4\" rx=\"0.5\" fill=\"#DFF7FF\" opacity=\".55\"/>\n  </g>\n  <g id=\"thruster\">\n    <path fill=\"#3A4452\" d=\"M18 34 L18 50 L30 54 L30 30 Z\"/>\n    <rect x=\"6\" y=\"36\" width=\"14\" height=\"12\" rx=\"2\" fill=\"#2A3340\"/>\n    <ellipse cx=\"5\" cy=\"42\" rx=\"7\" ry=\"5\" fill=\"url(#glow-skiff-7)\"/>\n  </g>\n  <g id=\"hit-flash\" opacity=\"0\"><rect width=\"160\" height=\"80\" fill=\"#fff\"/></g>\n</svg>\n", "tide-runner": "<svg class=\"hull-svg\" xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 160 80\" fill=\"none\" aria-hidden=\"true\">\n  <!-- multi-role freighter -->\n  <defs>\n    <linearGradient id=\"metal-tide-runner\" x1=\"0\" y1=\"0\" x2=\"0\" y2=\"1\">\n      <stop offset=\"0%\" stop-color=\"#E8EEF6\"/>\n      <stop offset=\"45%\" stop-color=\"#9AA8BC\"/>\n      <stop offset=\"100%\" stop-color=\"#4A5568\"/>\n    </linearGradient>\n    <linearGradient id=\"shade-tide-runner\" x1=\"0\" y1=\"0\" x2=\"1\" y2=\"0\">\n      <stop offset=\"0%\" stop-color=\"#2A3340\" stop-opacity=\".55\"/>\n      <stop offset=\"55%\" stop-color=\"#2A3340\" stop-opacity=\"0\"/>\n    </linearGradient>\n    <linearGradient id=\"glow-tide-runner\" x1=\"0\" y1=\"0\" x2=\"1\" y2=\"0\">\n      <stop offset=\"0%\" stop-color=\"#FFB24A\" stop-opacity=\".95\"/>\n      <stop offset=\"100%\" stop-color=\"#FF6A2A\" stop-opacity=\".15\"/>\n    </linearGradient>\n    <radialGradient id=\"canopy-tide-runner\" cx=\"50%\" cy=\"40%\" r=\"65%\">\n      <stop offset=\"0%\" stop-color=\"#B8F0FF\"/>\n      <stop offset=\"55%\" stop-color=\"#3AA0C8\"/>\n      <stop offset=\"100%\" stop-color=\"#0B3A4A\"/>\n    </radialGradient>\n  </defs>\n  <ellipse cx=\"84\" cy=\"64\" rx=\"52\" ry=\"4\" fill=\"#000\" opacity=\".28\"/>\n  <g id=\"hull\">\n    <path fill=\"url(#metal-tide-runner)\" d=\"M16 42 C26 26, 52 18, 80 20 C112 22, 138 28, 150 40 C138 52, 112 58, 80 60 C52 62, 26 54, 16 38 Z\"/>\n    <path fill=\"url(#shade-tide-runner)\" d=\"M16 42 C26 26, 52 18, 80 20 C112 22, 138 28, 150 40 C138 52, 112 58, 80 60 C52 62, 26 54, 16 38 Z\"/>\n    <ellipse cx=\"72\" cy=\"40\" rx=\"24\" ry=\"13\" fill=\"#5A687A\" opacity=\".35\"/>\n    <path stroke=\"#EEF3FA\" stroke-width=\".8\" opacity=\".5\" d=\"M40 28 L110 32 M40 52 L110 48 M70 24 L70 56\"/>\n    <rect x=\"48\" y=\"22\" width=\"22\" height=\"8\" rx=\"1.5\" fill=\"#6B7788\" opacity=\".7\"/>\n  </g>\n  <g id=\"canopy\">\n    <ellipse cx=\"122\" cy=\"40\" rx=\"8\" ry=\"4.5\" fill=\"url(#canopy-tide-runner)\"/>\n    <ellipse cx=\"119\" cy=\"39\" rx=\"2.5\" ry=\"1.4\" fill=\"#E8FBFF\" opacity=\".6\"/>\n  </g>\n  <g id=\"thruster\">\n    <rect x=\"4\" y=\"34\" width=\"14\" height=\"14\" rx=\"3\" fill=\"#2A3340\"/>\n    <ellipse cx=\"3\" cy=\"41\" rx=\"7\" ry=\"5\" fill=\"url(#glow-tide-runner)\"/>\n  </g>\n  <g id=\"hit-flash\" opacity=\"0\"><rect width=\"160\" height=\"80\" fill=\"#fff\"/></g>\n</svg>\n", "unbowed": "<svg class=\"hull-svg\" xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 160 80\" fill=\"none\" aria-hidden=\"true\">\n  <!-- gated compact war -->\n  <defs>\n    <linearGradient id=\"metal-unbowed\" x1=\"0\" y1=\"0\" x2=\"0\" y2=\"1\">\n      <stop offset=\"0%\" stop-color=\"#E8EEF6\"/>\n      <stop offset=\"45%\" stop-color=\"#9AA8BC\"/>\n      <stop offset=\"100%\" stop-color=\"#4A5568\"/>\n    </linearGradient>\n    <linearGradient id=\"shade-unbowed\" x1=\"0\" y1=\"0\" x2=\"1\" y2=\"0\">\n      <stop offset=\"0%\" stop-color=\"#2A3340\" stop-opacity=\".55\"/>\n      <stop offset=\"55%\" stop-color=\"#2A3340\" stop-opacity=\"0\"/>\n    </linearGradient>\n    <linearGradient id=\"glow-unbowed\" x1=\"0\" y1=\"0\" x2=\"1\" y2=\"0\">\n      <stop offset=\"0%\" stop-color=\"#FFB24A\" stop-opacity=\".95\"/>\n      <stop offset=\"100%\" stop-color=\"#FF6A2A\" stop-opacity=\".15\"/>\n    </linearGradient>\n    <radialGradient id=\"canopy-unbowed\" cx=\"50%\" cy=\"40%\" r=\"65%\">\n      <stop offset=\"0%\" stop-color=\"#B8F0FF\"/>\n      <stop offset=\"55%\" stop-color=\"#3AA0C8\"/>\n      <stop offset=\"100%\" stop-color=\"#0B3A4A\"/>\n    </radialGradient>\n  </defs>\n  <ellipse cx=\"92\" cy=\"62\" rx=\"40\" ry=\"3.2\" fill=\"#000\" opacity=\".26\"/>\n  <g id=\"hull\">\n    <path fill=\"url(#metal-unbowed)\" d=\"M46 34 L46 46 L72 54 L122 46 L140 40 L122 34 L72 26 Z\"/>\n    <path fill=\"url(#shade-unbowed)\" d=\"M46 34 L46 46 L72 54 L122 46 L140 40 L122 34 L72 26 Z\"/>\n    <path fill=\"#5A687A\" opacity=\".55\" d=\"M78 36 L104 40 L78 44 Z\"/>\n    <rect x=\"86\" y=\"42\" width=\"16\" height=\"6\" rx=\"1\" fill=\"#3A4452\" opacity=\".55\"/>\n    <path stroke=\"#EEF3FA\" stroke-width=\".7\" opacity=\".5\" d=\"M60 36 L118 38 M60 44 L118 42\"/>\n  </g>\n  <g id=\"canopy\">\n    <rect x=\"108\" y=\"35\" width=\"14\" height=\"9\" rx=\"1.2\" fill=\"url(#canopy-unbowed)\"/>\n    <rect x=\"110\" y=\"36.5\" width=\"4\" height=\"3\" rx=\".3\" fill=\"#E8FBFF\" opacity=\".55\"/>\n  </g>\n  <g id=\"thruster\">\n    <rect x=\"34\" y=\"35\" width=\"14\" height=\"10\" rx=\"1.5\" fill=\"#2A3340\"/>\n    <rect x=\"58\" y=\"29\" width=\"24\" height=\"6\" rx=\"1\" fill=\"#6B7788\" opacity=\".65\"/>\n    <rect x=\"58\" y=\"45\" width=\"24\" height=\"6\" rx=\"1\" fill=\"#6B7788\" opacity=\".65\"/>\n    <ellipse cx=\"33\" cy=\"40\" rx=\"6\" ry=\"4\" fill=\"url(#glow-unbowed)\"/>\n  </g>\n  <g id=\"hit-flash\" opacity=\"0\"><rect width=\"160\" height=\"80\" fill=\"#fff\"/></g>\n</svg>\n", "wasp-prime": "<svg class=\"hull-svg\" xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 160 80\" fill=\"none\" aria-hidden=\"true\">\n  <!-- endgame war hull -->\n  <defs>\n    <linearGradient id=\"metal-wasp-prime\" x1=\"0\" y1=\"0\" x2=\"0\" y2=\"1\">\n      <stop offset=\"0%\" stop-color=\"#E8EEF6\"/>\n      <stop offset=\"45%\" stop-color=\"#9AA8BC\"/>\n      <stop offset=\"100%\" stop-color=\"#4A5568\"/>\n    </linearGradient>\n    <linearGradient id=\"shade-wasp-prime\" x1=\"0\" y1=\"0\" x2=\"1\" y2=\"0\">\n      <stop offset=\"0%\" stop-color=\"#2A3340\" stop-opacity=\".55\"/>\n      <stop offset=\"55%\" stop-color=\"#2A3340\" stop-opacity=\"0\"/>\n    </linearGradient>\n    <linearGradient id=\"glow-wasp-prime\" x1=\"0\" y1=\"0\" x2=\"1\" y2=\"0\">\n      <stop offset=\"0%\" stop-color=\"#FFB24A\" stop-opacity=\".95\"/>\n      <stop offset=\"100%\" stop-color=\"#FF6A2A\" stop-opacity=\".15\"/>\n    </linearGradient>\n    <radialGradient id=\"canopy-wasp-prime\" cx=\"50%\" cy=\"40%\" r=\"65%\">\n      <stop offset=\"0%\" stop-color=\"#B8F0FF\"/>\n      <stop offset=\"55%\" stop-color=\"#3AA0C8\"/>\n      <stop offset=\"100%\" stop-color=\"#0B3A4A\"/>\n    </radialGradient>\n  </defs>\n  <ellipse cx=\"90\" cy=\"66\" rx=\"56\" ry=\"4\" fill=\"#000\" opacity=\".32\"/>\n  <g id=\"hull\">\n    <path fill=\"url(#metal-wasp-prime)\" d=\"M10 34 L10 50 L30 60 L98 54 L158 40 L98 26 L30 20 Z\"/>\n    <path fill=\"url(#shade-wasp-prime)\" d=\"M10 34 L10 50 L30 60 L98 54 L158 40 L98 26 L30 20 Z\"/>\n    <path fill=\"#7A8798\" d=\"M38 20 L68 6 L74 24 Z\"/>\n    <path fill=\"#7A8798\" d=\"M38 60 L68 74 L74 56 Z\"/>\n    <path fill=\"#8A96A8\" d=\"M68 16 L100 4 L104 22 L76 28 Z\"/>\n    <path fill=\"#8A96A8\" d=\"M68 64 L100 76 L104 58 L76 52 Z\"/>\n    <path stroke=\"#EEF3FA\" stroke-width=\".9\" opacity=\".5\" d=\"M36 32 L130 36 M36 48 L130 44\"/>\n  </g>\n  <g id=\"canopy\">\n    <rect x=\"104\" y=\"30\" width=\"24\" height=\"18\" rx=\"2.5\" fill=\"url(#canopy-wasp-prime)\"/>\n    <circle cx=\"114\" cy=\"39\" r=\"4\" fill=\"#E8FBFF\" opacity=\".55\"/>\n    <rect x=\"108\" y=\"33\" width=\"6\" height=\"4\" rx=\".4\" fill=\"#B8F0FF\" opacity=\".45\"/>\n  </g>\n  <g id=\"thruster\">\n    <rect x=\"0\" y=\"34\" width=\"14\" height=\"16\" rx=\"2\" fill=\"#2A3340\"/>\n    <ellipse cx=\"-1\" cy=\"42\" rx=\"8\" ry=\"6\" fill=\"url(#glow-wasp-prime)\"/>\n  </g>\n  <g id=\"hit-flash\" opacity=\"0\"><rect width=\"160\" height=\"80\" fill=\"#fff\"/></g>\n</svg>\n"};

  function makeHullArt(id, cls) {
    const wrap = document.createElement("div");
    wrap.className = cls || "hull-art";
    wrap.setAttribute("aria-hidden", "true");
    let html = HULL_SVG[id] || HULL_SVG["skiff-7"] || "";
    const suffix = "-" + String(id || "hull") + "-" + Math.random().toString(36).slice(2, 7);
    const ids = [];
    html.replace(/\bid="([^"]+)"/g, function (_, x) { ids.push(x); return _; });
    ids.forEach(function (raw) {
      const next = raw + suffix;
      html = html.split('id="' + raw + '"').join('id="' + next + '"');
      html = html.split('url(#' + raw + ')').join('url(#' + next + ')');
    });
    wrap.innerHTML = html;
    return wrap;
  }


  // Yard economy — pure logic in js/yard-economy.js (ATDD). Thin adapters only.
  const YE = globalThis.SkiffYardEconomy;
  if (!YE) throw new Error("SkiffYardEconomy missing — load js/yard-economy.js before game.js");
  const GOD = (typeof SkiffDebugGod !== "undefined") ? SkiffDebugGod : null;
  if (!GOD) throw new Error("SkiffDebugGod missing — load js/debug-god.js before game.js");
  function godEnabled() {
    return GOD.isGodEnabled({
      search: typeof location !== "undefined" ? location.search : "",
      prefs: (state && state.prefs) || {},
    });
  }
  const WP = (typeof SkiffWaypoints !== "undefined") ? SkiffWaypoints : null;
  if (!WP) throw new Error("SkiffWaypoints missing — load js/waypoints.js before game.js");
  const SK = (typeof SkiffSkills !== "undefined") ? SkiffSkills : null;
  if (!SK) throw new Error("SkiffSkills missing — load js/skills.js before game.js");
  const TF = (typeof SkiffTradeFog !== "undefined") ? SkiffTradeFog : null;
  if (!TF) throw new Error("SkiffTradeFog missing — load js/trade-fog.js before game.js");

  const DOCK_WORK_PAY = YE.DOCK_WORK_PAY;
  function hullStock(s) { return YE.hullStock(s); }
  function yardOffered() {
    const stock = GOD.effectiveStock(!!state.godYard, hullStock(sys(state.system)));
    return YE.yardOffered(stock, SHIPS);
  }
  function dumpToFit(maxCargo) {
    const ids = GOODS.map((g) => g.id);
    const r = YE.dumpToFit(state.cargo, ids, maxCargo);
    state.cargo = r.cargo;
    return r.dumped;
  }

  const SF = globalThis.SkiffFuel;
  const SM = globalThis.SkiffMarket;
  const SE = globalThis.SkiffEncounter;
  if (!SF || !SM || !SE) throw new Error("Skiff fuel/market/encounter modules missing — load js/*.js before game.js");
  const SP = globalThis.SkiffDockPress;
  if (!SP) throw new Error("SkiffDockPress missing — load js/dock-press.js before game.js");

  function mulberry32(a) {
    return function () {
      a |= 0; a = a + 0x6D2B79F5 | 0;
      let t = Math.imul(a ^ a >>> 15, 1 | a);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }

  function applyChart(chart) {
    if (!chart || !chart.pos) return;
    SYSTEMS = SYSTEM_DEFS.map((s) => {
      const p = chart.pos[s.id] || { x: 50, y: 50 };
      return Object.assign({}, s, { x: p.x, y: p.y });
    });
  }

  // Same names every run; positions reshuffle. Keep the graph skiff-reachable.
  function buildChart(seed) {
    seed = (seed >>> 0) || (Math.floor(Math.random() * 0xffffffff) || 1);
    const rand = mulberry32(seed);
    const minD = 7;
    const pad = 6;
    const pos = {};

    function placeOne(id, prefer) {
      for (let attempt = 0; attempt < 120; attempt++) {
        let x, y;
        if (prefer && attempt < 20) {
          x = prefer.x + (rand() - 0.5) * 24;
          y = prefer.y + (rand() - 0.5) * 24;
        } else if (attempt < 40) {
          // bias into quadrants in roster order
          const qi = SYSTEM_DEFS.findIndex((s) => s.id === id) % 4;
          const qx = qi % 2 === 0 ? pad + 8 : 55;
          const qy = qi < 2 ? pad + 8 : 55;
          x = qx + rand() * 32;
          y = qy + rand() * 32;
        } else {
          x = pad + rand() * (100 - pad * 2);
          y = pad + rand() * (100 - pad * 2);
        }
        x = Math.max(pad, Math.min(100 - pad, x));
        y = Math.max(pad, Math.min(100 - pad, y));
        let ok = true;
        for (const other of Object.values(pos)) {
          const dx = other.x - x;
          const dy = other.y - y;
          if (Math.sqrt(dx * dx + dy * dy) < minD) { ok = false; break; }
        }
        if (ok) {
          pos[id] = { x: Math.round(x * 10) / 10, y: Math.round(y * 10) / 10 };
          return;
        }
      }
      pos[id] = { x: pad + rand() * (100 - pad * 2), y: pad + rand() * (100 - pad * 2) };
    }

    // Ember near-ish center-left so early jumps exist; others fill out.
    placeOne("ember", { x: 28, y: 55 });
    SYSTEM_DEFS.forEach((s) => {
      if (s.id === "ember") return;
      placeOne(s.id, null);
    });

    // Connectivity repair: if any system is unreachable from ember within max ship range hops, nudge.
    applyChart({ seed, pos });
    const maxRange = Math.max.apply(null, SHIPS.map((s) => s.range));
    function connected() {
      const seen = new Set(["ember"]);
      const q = ["ember"];
      while (q.length) {
        const cur = q.pop();
        SYSTEMS.forEach((s) => {
          if (seen.has(s.id)) return;
          if (dist(sys(cur), s) <= maxRange + 0.01) {
            seen.add(s.id);
            q.push(s.id);
          }
        });
      }
      return seen.size === SYSTEMS.length;
    }
    let guard = 0;
    while (!connected() && guard++ < 120) {
      // pull a random non-ember system closer to a random visited neighbor
      const orphan = SYSTEMS.find((s) => {
        const seen = new Set(["ember"]);
        const q = ["ember"];
        while (q.length) {
          const cur = q.pop();
          SYSTEMS.forEach((o) => {
            if (seen.has(o.id)) return;
            if (dist(sys(cur), o) <= maxRange + 0.01) {
              seen.add(o.id);
              q.push(o.id);
            }
          });
        }
        return !seen.has(s.id);
      });
      if (!orphan) break;
      const anchor = SYSTEMS[Math.floor(rand() * SYSTEMS.length)];
      const ang = rand() * Math.PI * 2;
      const rad = maxRange * (0.55 + rand() * 0.35);
      orphan.x = Math.max(pad, Math.min(100 - pad, anchor.x + Math.cos(ang) * rad));
      orphan.y = Math.max(pad, Math.min(100 - pad, anchor.y + Math.sin(ang) * rad));
      pos[orphan.id] = { x: Math.round(orphan.x * 10) / 10, y: Math.round(orphan.y * 10) / 10 };
      applyChart({ seed, pos });
    }

    return { seed, pos };
  }

  function hash32(str) { return SM.hash32(str); }

  // Stable prices so remote peek matches arrival.
  function priceFor(system, good) { return SM.priceFor(system, good); }

  function activityLabel(n) {
    const i = Math.max(0, Math.min(ACTIVITY.length - 1, n | 0));
    return ACTIVITY[i];
  }

  function isVisited(id) {
    return !!(state.visited && state.visited[id]);
  }

  function markVisited(id) {
    if (!state.visited) state.visited = {};
    state.visited[id] = true;
  }

  // Semantic chart colors (readable across themes).
  function riskFill(pirate) {
    const p = pirate | 0;
    if (p <= 1) return "#2FA4A0";
    if (p <= 3) return "#C4A35A";
    if (p <= 5) return "#D97757";
    return "#C44C4C";
  }

  function bestLaneEdge(herePrices, therePrices) { return SM.bestLaneEdge(herePrices, therePrices, GOODS); }

  // Expected credit delta if you sell current hold at target vs here.
  function cargoMarginAt(toId) {
    const here = state.prices;
    const there = peekPrices(toId);
    let total = 0;
    let units = 0;
    GOODS.forEach((g) => {
      const n = state.cargo[g.id] || 0;
      if (n < 1) return;
      total += n * ((there[g.id] || 0) - (here[g.id] || 0));
      units += n;
    });
    return { total, units };
  }

  function dist(a, b) { return SF.dist(a, b); }

  // World units per fuel point — fuelCost = ceil(distance / FUEL_DIST).
  const FUEL_DIST = SF.FUEL_DIST;

  function fuelCost(fromId, toId) {
    return SF.fuelCost(sys(fromId), sys(toId));
  }

  function inRange(fromId, toId) {
    return SF.inRange(sys(fromId), sys(toId), hull().range);
  }

  /** Max world distance you can jump with current fuel, capped by hull.range (Palm ST–style chart circle). */
  function fuelReachDistance() {
    return SF.fuelReachDistance(state.fuel, hull().range);
  }

  /** Hull range AND enough fuel for fuelCost — chart “in reach” / Local visibility. */
  function canJumpTo(fromId, toId) {
    return SF.canJumpTo({ from: sys(fromId), to: sys(toId), hullRange: hull().range, fuel: state.fuel });
  }

  function reachableFrom(fromId) {
    return SYSTEMS.filter((s) => s.id !== fromId && inRange(fromId, s.id));
  }

  function fresh() {
    const chart = buildChart();
    applyChart(chart);
    return {
      v: VERSION,
      system: "ember",
      credits: 3200,
      fuel: (ship("skiff-7") || SHIPS.find((s) => s.id === "skiff-7") || SHIPS[0]).fuelMax,
      cargo: Object.fromEntries(GOODS.map((g) => [g.id, 0])),
      prices: {},
      shipId: "skiff-7",
      crew: 0,
      epoch: 1,
      chart,
      visited: { ember: true },
      pilot: "human",
      prefs: { autoFuel: true, godMode: false },
      dockWorkAt: null,
      pressBoughtAt: null,
      lastPress: null,
      godYard: false,
      waypoints: [],
      skills: SK.normalize(null),
      log: "Skiff-7 cleared Ember Reach. New chart this run — same systems, new lanes.",
    };
  }

  function cargoUsed(st) { return SM.cargoUsed(st.cargo); }
  function inventoryValue(st) { return SM.inventoryValue(st, GOODS); }
  function shipValue(st) { return SM.shipValue(st.shipId, SHIPS); }
  function netWorth(st) { return SM.netWorth(st, GOODS, SHIPS); }

  function rollMarket(st) {
    const s = sys(st.system);
    st.prices = {};
    GOODS.forEach((g) => { st.prices[g.id] = priceFor(s, g); });
  }

  function peekPrices(systemId) {
    const s = sys(systemId);
    const out = {};
    GOODS.forEach((g) => { out[g.id] = priceFor(s, g); });
    return out;
  }

  function bestDealHint(herePrices, therePrices) { return SM.bestDealHint(herePrices, therePrices, GOODS); }

  function load() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return null;
      const st = JSON.parse(raw);
      if (!st || !st.v) return null;
      st.v = VERSION;
      if (!st.shipId) st.shipId = "skiff-7";
      if (st.crew == null) st.crew = 0;
      if (!st.epoch) st.epoch = 1;
      if (!st.visited) {
        st.visited = {};
        if (st.system) st.visited[st.system] = true;
        else st.visited.ember = true;
      }
      if (st.dockWorkAt === undefined) st.dockWorkAt = null;
      if (st.pressBoughtAt === undefined) st.pressBoughtAt = null;
      if (st.lastPress === undefined) st.lastPress = null;
      if (st.godYard === undefined) st.godYard = false;
      st.waypoints = WP.normalize(st.waypoints);
      st.skills = SK.normalize(st.skills);
      if (st.pilot !== "human" && st.pilot !== "agent") st.pilot = "human";
      st.prefs = st.prefs || { autoFuel: true };
      if (st.prefs.autoFuel == null) st.prefs.autoFuel = true;
      if (st.prefs.godMode == null) st.prefs.godMode = false;
      const h = ship(st.shipId) || SHIPS[0];
      st.shipId = h.id;
      st.crew = Math.min(st.crew, h.crewMax);
      if (st.fuel > h.fuelMax) st.fuel = h.fuelMax;
      // Drop cargo overflow if downgrading somehow
      let used = cargoUsed(st);
      if (used > h.cargo) {
        for (const g of GOODS) {
          while (st.cargo[g.id] > 0 && used > h.cargo) {
            st.cargo[g.id] -= 1;
            used -= 1;
          }
        }
      }
      if (!st.chart || !st.chart.pos) st.chart = buildChart(hash32("legacy:" + (st.system || "ember")));
      // Roster grew (e.g. 0.8 → 0.9 galaxy): keep seed, reshuffle full named set.
      const posKeys = Object.keys(st.chart.pos || {});
      if (posKeys.length < SYSTEM_DEFS.length) {
        st.chart = buildChart(st.chart.seed || hash32("expand:" + (st.system || "ember")));
        st.log = (st.log ? st.log + " " : "") + "Chart expanded — full galaxy remapped from seed.";
      }
      applyChart(st.chart);
      if (!sys(st.system)) st.system = "ember";
      return st;
    } catch (_) { return null; }
  }

  function save(st) {
    if (bridgeOn) return; // shared seat owns persistence via /api/act
    localStorage.setItem(SAVE_KEY, JSON.stringify(st));
  }

  let state = load() || fresh();
  state.prefs = state.prefs || { autoFuel: true };
  if (state.prefs.autoFuel == null) state.prefs.autoFuel = true;
  if (!state.prices || !Object.keys(state.prices).length) rollMarket(state);

  const el = (id) => document.getElementById(id);
  const log = (msg) => { state.log = msg; el("log").textContent = msg; };

  function cssVar(name, fallback) {
    const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    return v || fallback;
  }

  function themeColors() {
    return {
      bg: cssVar("--map-bg", "#04070F"),
      here: cssVar("--map-here", "#2F6FED"),
      sel: cssVar("--map-sel", "#D6E4F5"),
      reach: cssVar("--map-reach", "#9BB4D4"),
      far: cssVar("--map-far", "#33445C"),
      label: cssVar("--map-label", "#D6E4F5"),
      mute: cssVar("--map-mute", "#5A7394"),
      grid: cssVar("--map-grid", "rgba(30,58,95,0.65)"),
      ring: cssVar("--map-ring", "rgba(47,111,237,0.55)"),
      link: cssVar("--map-link", "rgba(47,164,160,0.55)"),
      linkDim: cssVar("--map-link-dim", "rgba(30,58,95,0.4)"),
    };
  }

  function currentTheme() {
    const t = document.documentElement.getAttribute("data-theme") || "cobalt";
    return THEMES.includes(t) ? t : "cobalt";
  }

  function applyTheme(name, persist) {
    const t = THEMES.includes(name) ? name : "cobalt";
    document.documentElement.setAttribute("data-theme", t);
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", cssVar("--wall", "#060A14"));
    document.querySelectorAll("[data-theme-pick]").forEach((b) => {
      b.classList.toggle("active", b.dataset.themePick === t);
    });
    const hint = el("theme-hint");
    if (hint) {
      hint.textContent = t === "cobalt"
        ? "Cobalt — dark navy hull console."
        : t === "coffee"
          ? "Coffee — the earlier stone and clay look."
          : "LCARS — orange console homage (fan aesthetic pack).";
    }
    if (persist !== false) {
      try { localStorage.setItem(THEME_KEY, t); } catch (e) {}
    }
    if (typeof ui !== "undefined" && ui && ui.tab === "chart") {
      sizeMap();
      drawMap();
    }
  }

  function loadTheme() {
    let t = "cobalt";
    try { t = localStorage.getItem(THEME_KEY) || "cobalt"; } catch (e) {}
    applyTheme(t, false);
  }

  function currentPilot() {
    return state.pilot === "agent" ? "agent" : "human";
  }

  function applyPilot(who, announce) {
    const p = who === "agent" ? "agent" : "human";
    state.pilot = p;
    const shell = el("app");
    if (shell) shell.classList.toggle("is-agent-pilot", p === "agent");
    const banner = el("pilot-banner");
    if (banner) banner.hidden = p !== "agent";
    const btxt = el("pilot-banner-text");
    if (btxt) btxt.textContent = "Agent has the stick — watching until you take over.";
    document.querySelectorAll("[data-pilot-pick]").forEach((b) => {
      b.classList.toggle("active", b.dataset.pilotPick === p);
    });
    const hint = el("pilot-hint");
    if (hint) {
      hint.textContent = p === "agent"
        ? "Agent seat armed. MCP can fly this save when connected; Take stick anytime."
        : "You have the stick. Hand to Agent when you want the LLM to fly.";
    }
    if (announce) {
      log(p === "agent" ? "Agent has the stick." : "Captain took the stick.");
    }
    save(state);
  }



  const qtyMap = Object.fromEntries(GOODS.map((g) => [g.id, 1]));
  function qtyFor(id) { return qtyMap[id] || 1; }
  function setQty(id, n) {
    qtyMap[id] = Math.max(1, Math.min(hull().cargo, n | 0));
    render();
  }

  // Sector = regional window around current dock; Full = entire roster.
  const SECTOR_RADIUS = TF.SECTOR_RADIUS;

  function inSector(fromId, toId) {
    return dist(sys(fromId), sys(toId)) <= SECTOR_RADIUS + 0.01;
  }
  function canSeeTrade(toId) {
    return TF.canSeeTradeIntel({ dist: dist(sys(state.system), sys(toId)), sectorRadius: SECTOR_RADIUS });
  }

  function chartVisible(s, hereId, mode) {
    if (s.id === hereId) return true;
    if (mode === "local") return canJumpTo(hereId, s.id);
    if (mode === "sector") return inSector(hereId, s.id);
    return true; // full / galaxy
  }

  /** Nice grid step so ~4–8 lines span the view. */
  function chartGridStep(viewSpan) {
    const target = viewSpan / 6;
    const mag = Math.pow(10, Math.floor(Math.log10(Math.max(target, 1e-6))));
    const norm = target / mag;
    let nice;
    if (norm <= 1.5) nice = 1;
    else if (norm <= 3.5) nice = 2;
    else if (norm <= 7.5) nice = 5;
    else nice = 10;
    return nice * mag;
  }

  /**
   * Shared chart camera for drawMap + pickSystemAt.
   * Full = whole 0–100 world; Local/Sector fit visible neighborhood (uniform scale).
   */
  function chartCamera(mode, here, w, h) {
    const PAD = 0.12;
    let minX, minY, maxX, maxY;

    if (mode === "full") {
      minX = -2; minY = -2; maxX = 102; maxY = 102;
    } else {
      const pts = [{ x: here.x, y: here.y }];
      if (mode === "local") {
        const r = Math.max(fuelReachDistance(), 1);
        SYSTEMS.forEach((s) => {
          if (s.id === here.id || canJumpTo(here.id, s.id)) pts.push(s);
        });
        pts.push({ x: here.x - r, y: here.y }, { x: here.x + r, y: here.y });
        pts.push({ x: here.x, y: here.y - r }, { x: here.x, y: here.y + r });
      } else {
        // sector
        SYSTEMS.forEach((s) => {
          if (chartVisible(s, here.id, "sector")) pts.push(s);
        });
      }

      minX = Math.min(...pts.map((p) => p.x));
      minY = Math.min(...pts.map((p) => p.y));
      maxX = Math.max(...pts.map((p) => p.x));
      maxY = Math.max(...pts.map((p) => p.y));

      let spanX = Math.max(1e-6, maxX - minX);
      let spanY = Math.max(1e-6, maxY - minY);
      const minSpan = mode === "local"
        ? Math.max(Math.max(fuelReachDistance(), 8) * 2.2, 18)
        : Math.max(SECTOR_RADIUS * 0.55, 28);
      if (spanX < minSpan) {
        const mid = (minX + maxX) / 2;
        minX = mid - minSpan / 2;
        maxX = mid + minSpan / 2;
        spanX = minSpan;
      }
      if (spanY < minSpan) {
        const mid = (minY + maxY) / 2;
        minY = mid - minSpan / 2;
        maxY = mid + minSpan / 2;
        spanY = minSpan;
      }
      const padX = spanX * PAD;
      const padY = spanY * PAD;
      minX -= padX; maxX += padX;
      minY -= padY; maxY += padY;
    }

    let spanX = Math.max(1e-6, maxX - minX);
    let spanY = Math.max(1e-6, maxY - minY);
    // Uniform scale; letterbox unused edges
    const scale = Math.min(w / spanX, h / spanY);
    const ox = (w - spanX * scale) / 2 - minX * scale;
    const oy = (h - spanY * scale) / 2 - minY * scale;
    const viewSpan = Math.max(spanX, spanY);

    function toScreen(wx, wy) {
      return { x: wx * scale + ox, y: wy * scale + oy };
    }
    function toWorld(sx, sy) {
      return { x: (sx - ox) / scale, y: (sy - oy) / scale };
    }

    return { minX, minY, maxX, maxY, spanX, spanY, scale, ox, oy, viewSpan, toScreen, toWorld };
  }

  const ui = {
    tab: "dock",
    chartMode: "local", // local | sector | full
    targetId: null,
  };

  function showTab(name) {
    ui.tab = name;
    document.querySelectorAll(".panel").forEach((p) => {
      const on = p.dataset.tab === name;
      p.hidden = !on;
      p.classList.toggle("active", on);
    });
    document.querySelectorAll(".tabbar .tab").forEach((b) => {
      b.classList.toggle("active", b.dataset.tab === name);
    });
    if (name === "chart") {
      requestAnimationFrame(() => { sizeMap(); drawMap(); });
    }
  }

  function setChartMode(mode) {
    if (mode !== "local" && mode !== "sector" && mode !== "full") mode = "local";
    ui.chartMode = mode;
    el("mode-local").classList.toggle("active", mode === "local");
    el("mode-sector").classList.toggle("active", mode === "sector");
    const fullBtn = el("mode-full");
    if (fullBtn) fullBtn.classList.toggle("active", mode === "full");
    el("chart-hint").textContent = mode === "local"
      ? "Local: systems inside your fuel reach circle (like Palm ST). Tap to target, then Jump."
      : mode === "sector"
        ? "Sector: regional window (~" + SECTOR_RADIUS + " units). Dim = beyond current fuel reach."
        : "Full: entire Ember galaxy (" + SYSTEMS.length + " systems). Dim = beyond current fuel reach.";
    if (mode === "local" && ui.targetId && !canJumpTo(state.system, ui.targetId) && ui.targetId !== state.system) {
      ui.targetId = null;
    }
    drawMap();
    renderTarget();
  }

  function sizeMap() {
    const canvas = el("map");
    const wrap = canvas && canvas.parentElement;
    if (!canvas || !wrap) return;
    const rect = wrap.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = Math.max(200, Math.floor(rect.width));
    const h = Math.max(200, Math.floor(rect.height));
    canvas.width = Math.floor(w * dpr);
    canvas.height = Math.floor(h * dpr);
    canvas.style.width = w + "px";
    canvas.style.height = h + "px";
    const ctx = canvas.getContext("2d");
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function drawMap() {
    const canvas = el("map");
    if (!canvas) return;
    if (!canvas.width) sizeMap();
    const ctx = canvas.getContext("2d");
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = canvas.width / dpr;
    const h = canvas.height / dpr;
    ctx.save();
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const tc = themeColors();
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = tc.bg;
    ctx.fillRect(0, 0, w, h);

    const here = sys(state.system);
    const reachR = fuelReachDistance();
    const mode = ui.chartMode;
    const full = mode === "full";
    const cam = chartCamera(mode, here, w, h);
    const herePt = cam.toScreen(here.x, here.y);

    // World-aligned soft grid — step scales with zoom (~4–8 lines across view)
    const step = chartGridStep(cam.viewSpan);
    ctx.strokeStyle = tc.grid;
    ctx.lineWidth = 1;
    const g0x = Math.floor(cam.minX / step) * step;
    const g0y = Math.floor(cam.minY / step) * step;
    for (let gx = g0x; gx <= cam.maxX + 1e-9; gx += step) {
      const p = cam.toScreen(gx, 0);
      ctx.beginPath(); ctx.moveTo(p.x, 0); ctx.lineTo(p.x, h); ctx.stroke();
    }
    for (let gy = g0y; gy <= cam.maxY + 1e-9; gy += step) {
      const p = cam.toScreen(0, gy);
      ctx.beginPath(); ctx.moveTo(0, p.y); ctx.lineTo(w, p.y); ctx.stroke();
    }

    // Fuel-reach ring (Palm ST Short Range Chart style), via camera scale
    if (reachR > 0) {
      ctx.beginPath();
      ctx.arc(herePt.x, herePt.y, reachR * cam.scale, 0, Math.PI * 2);
      ctx.strokeStyle = tc.ring;
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }

    // Links only to jumps you can afford now (keeps Full readable).
    SYSTEMS.forEach((s) => {
      if (s.id === here.id) return;
      if (!chartVisible(s, here.id, mode)) return;
      if (!canJumpTo(here.id, s.id)) return;
      const p = cam.toScreen(s.x, s.y);
      ctx.beginPath();
      ctx.moveTo(herePt.x, herePt.y);
      ctx.lineTo(p.x, p.y);
      ctx.strokeStyle = tc.link;
      ctx.stroke();
    });

    SYSTEMS.forEach((s) => {
      if (!chartVisible(s, here.id, mode)) return;
      const reach = s.id === here.id || canJumpTo(here.id, s.id);
      const p = cam.toScreen(s.x, s.y);
      const px = p.x;
      const py = p.y;
      const selected = ui.targetId === s.id;
      const visited = isVisited(s.id) || s.id === here.id;
      const r = s.id === here.id ? 7 : selected ? 6 : full ? 3.5 : 4.5;
      const fill = s.id === here.id ? tc.here : riskFill(s.pirate);
      ctx.globalAlpha = reach || s.id === here.id ? 1 : 0.45;
      ctx.beginPath();
      ctx.arc(px, py, r, 0, Math.PI * 2);
      if (visited) {
        ctx.fillStyle = fill;
        ctx.fill();
      } else {
        ctx.fillStyle = tc.bg;
        ctx.fill();
        ctx.strokeStyle = fill;
        ctx.lineWidth = 2;
        ctx.stroke();
      }
      // Reward ring: expected lane edge from current dock buys
      if (s.id !== here.id && reach && canSeeTrade(s.id)) {
        const edge = bestLaneEdge(state.prices, peekPrices(s.id));
        if (edge && edge.edge >= 4) {
          const ring = Math.min(10, 4 + edge.edge / 4);
          ctx.beginPath();
          ctx.arc(px, py, r + 3, 0, Math.PI * 2);
          ctx.strokeStyle = edge.edge >= 12 ? "rgba(47,164,160,0.9)" : "rgba(47,164,160,0.45)";
          ctx.lineWidth = edge.edge >= 12 ? 2.5 : 1.5;
          ctx.stroke();
          void ring;
        }
      }
      if (selected) {
        ctx.beginPath();
        ctx.arc(px, py, r + 5, 0, Math.PI * 2);
        ctx.strokeStyle = tc.here;
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }
      const wpIdx = WP.indexOf(state.waypoints, s.id);
      if (wpIdx >= 0) {
        ctx.beginPath();
        ctx.arc(px, py - r - 6, 5.5, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(232,160,106,0.95)";
        ctx.fill();
        ctx.fillStyle = "#1a120c";
        ctx.font = "700 9px ui-sans-serif, system-ui, sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(String(wpIdx + 1), px, py - r - 3);
        ctx.textAlign = "start";
      }
      const showLabel = !full || reach || selected || s.yard || s.retire || visited;
      if (showLabel) {
        ctx.fillStyle = visited ? tc.label : tc.mute;
        ctx.font = (full && !reach && !selected ? "500 9px" : "600 12px") +
          " ui-sans-serif, system-ui, sans-serif";
        const label = (full && !reach && !selected && s.name.length > 10)
          ? s.name.slice(0, 9) + "…"
          : s.name;
        ctx.fillText(label, px + 8, py + 3);
      }
      if (reach && s.id !== here.id && !full) {
        const cost = fuelCost(here.id, s.id);
        ctx.fillStyle = tc.mute;
        ctx.font = "11px ui-sans-serif, system-ui, sans-serif";
        ctx.fillText(cost + "f · P" + activityLabel(s.pirate).slice(0, 3), px + 9, py + 16);
      }
      ctx.globalAlpha = 1;
    });
    ctx.restore();
  }

  function pickSystemAt(clientX, clientY) {
    const canvas = el("map");
    const rect = canvas.getBoundingClientRect();
    const sx = clientX - rect.left;
    const sy = clientY - rect.top;
    const w = rect.width;
    const h = rect.height;
    const here = sys(state.system);
    const cam = chartCamera(ui.chartMode, here, w, h);
    const world = cam.toWorld(sx, sy);
    let best = null;
    // Hit radius in world units from ~screen pixels (tighter on Full)
    const hitPx = ui.chartMode === "full" ? 8 : 14;
    let bestD = hitPx / cam.scale;
    SYSTEMS.forEach((s) => {
      if (!chartVisible(s, state.system, ui.chartMode)) return;
      const d = Math.hypot(s.x - world.x, s.y - world.y);
      if (d < bestD) { bestD = d; best = s; }
    });
    return best;
  }

  function renderTarget() {
    const title = el("target-title");
    const meta = el("target-meta");
    const peekEl = el("target-peek");
    const dossier = el("target-dossier");
    const marginEl = el("target-margin");
    const warp = el("btn-warp");
    const id = ui.targetId;
    const clearExtra = () => {
      if (dossier) { dossier.hidden = true; dossier.textContent = ""; }
      if (marginEl) { marginEl.hidden = true; marginEl.textContent = ""; marginEl.className = "margin-line"; }
    };
    if (!id || id === state.system) {
      const here = sys(state.system);
      title.textContent = here.name + " (here)";
      meta.textContent = "Pick another system to jump.";
      if (dossier) {
        dossier.hidden = false;
        dossier.textContent =
          SIZE_NAME[here.size|0] + " · " + TECH_NAME[here.tech|0] + " · " + (here.gov || "—") +
          "\nPolice " + activityLabel(here.police) + " · Pirates " + activityLabel(here.pirate);
      }
      if (marginEl) marginEl.hidden = true;
      peekEl.textContent = "";
      warp.disabled = true;
      warp.textContent = "Jump";
      return;
    }
    const t = sys(id);
    const hullOk = inRange(state.system, id);
    const cost = fuelCost(state.system, id);
    const fuelOk = state.fuel >= cost;
    const reach = hullOk && fuelOk;
    const tradeOk = canSeeTrade(id);
    const peek = tradeOk ? peekPrices(id) : null;
    const hint = tradeOk ? bestDealHint(state.prices, peek) : "trade fogged (out of sector)";
    const visited = isVisited(id);
    title.textContent = t.name + (visited ? "" : " · unvisited");
    meta.textContent = reach
      ? (cost + " fuel · " + hint + (t.yard ? " · yard" : "") + (t.retire ? " · retire dock" : ""))
      : (!hullOk
        ? ("Out of range (" + Math.ceil(dist(sys(state.system), t)) + " units · hull " + hull().range + ")")
        : ("Need " + cost + " fuel (have " + state.fuel + ")"));
    if (dossier) {
      dossier.hidden = false;
      dossier.textContent =
        SIZE_NAME[t.size|0] + " · " + TECH_NAME[t.tech|0] + " · " + (t.gov || "—") +
        "\nPolice " + activityLabel(t.police) + " · Pirates " + activityLabel(t.pirate) +
        (visited ? "" : "\n(Resources still fogged — first dock reveals more later.)") +
        (tradeOk ? "" : "\nTrade prices unknown outside your sector — buy Dock Press or fly closer.");
    }
    if (marginEl) {
      if (!tradeOk) {
        marginEl.hidden = false;
        marginEl.textContent = "Trade fog — out of sector. No price peeks.";
        marginEl.className = "margin-line";
      } else {
        const hold = cargoMarginAt(id);
        const lane = bestLaneEdge(state.prices, peek);
        marginEl.hidden = false;
        if (hold.units > 0) {
          const sign = hold.total >= 0 ? "+" : "";
          marginEl.textContent = "Hold vs here: " + sign + "₩" + hold.total.toLocaleString() + " if sold there";
          marginEl.className = "margin-line " + (hold.total > 0 ? "good" : hold.total < 0 ? "bad" : "");
        } else if (lane) {
          const sign = lane.edge >= 0 ? "+" : "";
          marginEl.textContent = "Lane stub: buy " + lane.name + " here → " + sign + lane.edge + "₩/u there";
          marginEl.className = "margin-line " + (lane.edge >= 4 ? "good" : lane.edge < 0 ? "bad" : "");
        } else {
          marginEl.textContent = "Lane stub: flat";
          marginEl.className = "margin-line";
        }
      }
    }
    peekEl.textContent = tradeOk
      ? GOODS.map((g) => g.name.split(" ").pop() + " ₩" + peek[g.id]).join(" · ")
      : "Prices fogged — leave sector to scout, or read the Press.";
    warp.disabled = !reach;
    warp.textContent = reach ? ("Jump −" + cost + " fuel") : (!hullOk ? "Out of range" : "Need fuel");
  }

  function renderShipPanel() {
    const h = hull();
    el("ship-name").textContent = h.name + (h.weapons ? " · armed" : " · unarmed");
    el("ship-meta").textContent =
      "hold " + h.cargo + " · tanks " + h.fuelMax + " · range " + h.range +
      " · crew " + state.crew + "/" + h.crewMax;
    const ownedArt = el("ship-art");
    if (ownedArt) {
      ownedArt.innerHTML = "";
      ownedArt.appendChild(makeHullArt(h.id, "hull-art hull-art--owned"));
    }
    const yard = el("yard");
    yard.innerHTML = "";
    const stock = hullStock(sys(state.system));
    const offered = yardOffered();
    if (stock === "none") {
      yard.innerHTML = "<p class=\"hint\">Dry dock — no usable hull stock (dead-tech or too hot). Market and dock work still run. Chart toward a Mite scrap or a real yard.</p>";
    } else if (stock === "mite") {
      const note = document.createElement("p");
      note.className = "hint";
      note.textContent = "Scrap pad — Mite escape hull only. Full yards carry the rest of the commons.";
      yard.appendChild(note);
    } else {
      const note = document.createElement("p");
      note.className = "hint";
      note.textContent = "Full yard — commons on the list. Unbowed stays gated (not for sale).";
      yard.appendChild(note);
    }
    offered.forEach((s) => {
      if (s.id === state.shipId) return;
      const row = document.createElement("div");
      row.className = "yard-row";
      const ownedTrade = Math.floor((hull().price || 0) * 0.55);
      const delta = YE.tradeDelta(hull().price || 0, s.price);
      const due = YE.tradeDue(delta);
      const surplus = YE.tradeSurplus(delta);
      const info = document.createElement("div");
      info.className = "yard-info";
      info.appendChild(makeHullArt(s.id, "hull-art hull-art--thumb"));
      const text = document.createElement("div");
      const listPrice = s.price === 0
        ? "List free (escape / starter)"
        : ("List ₩" + s.price.toLocaleString());
      let tradeHint;
      if (s.price === 0 && surplus > 0) tradeHint = "Take + scrap payout ₩" + surplus.toLocaleString();
      else if (s.price === 0) tradeHint = "Take this hull";
      else if (surplus > 0) tradeHint = "Trade down — pocket ₩" + surplus.toLocaleString();
      else if (ownedTrade > 0) tradeHint = "You pay ₩" + due.toLocaleString() + " after ₩" + ownedTrade.toLocaleString() + " trade-in";
      else tradeHint = "You pay ₩" + due.toLocaleString() + " (no trade-in on current hull)";
      const cargoBlock = cargoUsed(state) > s.cargo;
      const escapeDump = s.id === "mite" && cargoBlock;
      text.innerHTML =
        "<strong>" + s.name + "</strong><div class=\"have\">" +
        "hold " + s.cargo + " · fuel " + s.fuelMax + " · range " + s.range +
        (s.weapons ? " · weapons" : " · no guns") +
        " · crew max " + s.crewMax +
        "</div><div class=\"have\">" + listPrice + "</div>" +
        "<div class=\"hint\">" + tradeHint +
        (escapeDump ? " · taking Mite jettisons overflow cargo" : "") +
        "</div>";
      info.appendChild(text);
      row.appendChild(info);
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "chip";
      btn.textContent = s.price === 0 ? "Take" : "Buy";
      btn.disabled = state.credits < due || (cargoBlock && !escapeDump);
      btn.onclick = () => doBuyShip(s.id);
      row.appendChild(btn);
      yard.appendChild(row);
    });

    const workRow = document.createElement("div");
    workRow.className = "yard-row";
    const workInfo = document.createElement("div");
    workInfo.className = "yard-info";
    const worked = state.dockWorkAt === state.system;
    workInfo.innerHTML = "<div><strong>Dock work</strong><div class=\"hint\">" +
      (worked
        ? "Already worked this stay — jump to reset."
        : ("Shift pays ₩" + DOCK_WORK_PAY + ". Once per dock stay.")) +
      "</div></div>";
    workRow.appendChild(workInfo);
    const workBtn = document.createElement("button");
    workBtn.type = "button";
    workBtn.className = "chip ghost";
    workBtn.textContent = worked ? "Done" : ("Work (+₩" + DOCK_WORK_PAY + ")");
    workBtn.disabled = worked;
    workBtn.onclick = doDockWork;
    workRow.appendChild(workBtn);
    yard.appendChild(workRow);

    const crewBox = el("crew-actions");
    crewBox.innerHTML = "";
    const hire = document.createElement("button");
    hire.type = "button";
    hire.className = "chip";
    hire.textContent = "Hire crew (₩" + CREW_HIRE + ")";
    hire.disabled = state.crew >= h.crewMax || state.credits < CREW_HIRE;
    hire.onclick = doHireCrew;
    const fire = document.createElement("button");
    fire.type = "button";
    fire.className = "chip ghost";
    fire.textContent = "Dismiss";
    fire.disabled = state.crew < 1;
    fire.onclick = doFireCrew;
    crewBox.appendChild(hire);
    crewBox.appendChild(fire);
  }

  function render() {
    const s = sys(state.system);
    const h = hull();
    el("sys-name").textContent = s.name;
    el("credits").textContent = "₩" + state.credits.toLocaleString();
    el("fuel").textContent = state.fuel + " / " + h.fuelMax;
    el("cargo").textContent = cargoUsed(state) + " / " + h.cargo;
    el("net").textContent = "₩" + netWorth(state).toLocaleString();
    el("log").textContent = state.log;
    el("ver").textContent = VERSION;
    // keep pilot chrome in sync without re-logging
    const shell = el("app");
    if (shell) shell.classList.toggle("is-agent-pilot", currentPilot() === "agent");
    const banner = el("pilot-banner");
    if (banner) banner.hidden = currentPilot() !== "agent";
    document.querySelectorAll("[data-pilot-pick]").forEach((b) => {
      b.classList.toggle("active", b.dataset.pilotPick === currentPilot());
    });

    const market = el("market");
    market.innerHTML = "";
    const avgCache = Object.fromEntries(
      GOODS.map((g) => [g.id, SM.galaxyAveragePrice(SYSTEMS, g)])
    );
    GOODS.forEach((g) => {
      const p = state.prices[g.id];
      const have = state.cargo[g.id] || 0;
      const qty = qtyFor(g.id);
      const avg = avgCache[g.id];
      const cue = SM.marketCue(p, avg, have);
      const vs = SM.formatVsAvg(p, avg);
      const row = document.createElement("div");
      row.className = "row cue-" + cue.tone;
      const info = document.createElement("div");
      info.className = "good";
      info.innerHTML =
        "<strong>" + g.name + "</strong>" +
        "<div class=\"have\">have " + have + " · ₩" + p + " · " + vs + "</div>" +
        "<div class=\"cue-label cue-label--" + cue.tone + "\">" + cue.label + "</div>";
      const steppers = document.createElement("div");
      steppers.className = "qty";
      const minus = document.createElement("button");
      minus.type = "button";
      minus.className = "chip ghost qty-btn";
      minus.textContent = "−";
      minus.onclick = () => setQty(g.id, qty - 1);
      const qlab = document.createElement("span");
      qlab.className = "qty-val";
      qlab.textContent = String(qty);
      const plus = document.createElement("button");
      plus.type = "button";
      plus.className = "chip ghost qty-btn";
      plus.textContent = "+";
      plus.onclick = () => setQty(g.id, qty + 1);
      steppers.appendChild(minus);
      steppers.appendChild(qlab);
      steppers.appendChild(plus);
      const buy = document.createElement("button");
      buy.className = "chip";
      buy.textContent = "Buy";
      buy.onclick = () => doBuy(g.id, qty);
      const sell = document.createElement("button");
      sell.className = "chip ghost";
      sell.textContent = "Sell";
      sell.onclick = () => doSell(g.id, qty);
      row.appendChild(info);
      row.appendChild(steppers);
      row.appendChild(buy);
      row.appendChild(sell);
      market.appendChild(row);
    });

    const dock = el("dock-blurb");
    if (dock) {
      dock.textContent = "Docked at " + s.name + ". " +
        reachableFrom(state.system).length + " systems in jump range.";
    }
    const pressBox = el("press-box");
    if (pressBox) {
      pressBox.innerHTML = "";
      const bought = state.pressBoughtAt === state.system;
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "btn ghost";
      btn.textContent = bought ? "Press bought" : ("Buy Dock Press (₩" + SP.PRESS_PRICE + ")");
      btn.disabled = bought || state.credits < SP.PRESS_PRICE;
      btn.onclick = doBuyPress;
      pressBox.appendChild(btn);
      const edition = state.lastPress;
      if (edition && bought) {
        const paper = document.createElement("div");
        paper.className = "press-edition";
        paper.innerHTML = "<strong>" + edition.masthead + "</strong>";
        const ul = document.createElement("ul");
        const norm = SP.normalizeEdition(edition);
        (norm.tips || []).forEach((t) => {
          const li = document.createElement("li");
          if (t.action && t.action.type) {
            const a = document.createElement("button");
            a.type = "button";
            a.className = "press-link";
            a.textContent = t.text;
            a.onclick = () => followPressTip(t.action);
            li.appendChild(a);
          } else {
            li.textContent = t.text;
          }
          ul.appendChild(li);
        });
        paper.appendChild(ul);
        pressBox.appendChild(paper);
      } else if (!bought) {
        const hint = document.createElement("p");
        hint.className = "hint";
        hint.textContent = "Local sheet — goods tips, lane heat, and the odd job lead. Once per stay.";
        pressBox.appendChild(hint);
      }
    }
    if (ui.targetId && ui.chartMode === "local" && ui.targetId !== state.system && !canJumpTo(state.system, ui.targetId)) {
      ui.targetId = null;
    }
    renderShipPanel();
    renderWaypointChrome();
    renderSkillsBox();
    if (typeof syncGodUi === "function") syncGodUi();
    if (ui.tab === "chart") sizeMap();
    drawMap();
    renderTarget();

    const canRetire = s.retire && netWorth(state) >= RETIRE_NET;
    el("btn-retire").disabled = !canRetire;
    const sellAll = el("btn-sell-all");
    if (sellAll) sellAll.disabled = cargoUsed(state) < 1;
    save(state);
  }

  function doBuy(id, qty) {
    if (bridgeOn) {
      if (currentPilot() === "agent") return log("Agent has the stick.");
      return void bridgeAct({ op: "buy", good: id, qty: Math.max(1, qty | 0) });
    }
    const r = SM.applyBuy({
      cargo: state.cargo, credits: state.credits, prices: state.prices,
      goods: GOODS, holdMax: hull().cargo, id: id, qty: qty,
    });
    if (!r.ok) return log(r.reason === "hold_full" ? "Hold full." : "Not enough credits.");
    state.credits = r.credits;
    state.cargo = r.cargo;
    const p = state.prices[id];
    log("Bought " + r.n + " " + GOODS.find((g) => g.id === id).name + " for ₩" + (p * r.n) + ".");
    tickSkill("trader", true);
    render();
  }

  function doSell(id, qty) {
    if (bridgeOn) {
      if (currentPilot() === "agent") return log("Agent has the stick.");
      return void bridgeAct({ op: "sell", good: id, qty: Math.max(1, qty | 0) });
    }
    const r = SM.applySell({
      cargo: state.cargo, credits: state.credits, prices: state.prices,
      goods: GOODS, id: id, qty: qty,
    });
    if (!r.ok) return log("Nothing to sell.");
    state.credits = r.credits;
    state.cargo = r.cargo;
    const p = state.prices[id];
    log("Sold " + r.n + " " + GOODS.find((g) => g.id === id).name + " for ₩" + (p * r.n) + ".");
    tickSkill("trader", true);
    render();
  }

  function doSellAll() {
    if (bridgeOn) {
      if (currentPilot() === "agent") return log("Agent has the stick.");
      return void bridgeAct({ op: "sell_all" });
    }
    const r = SM.applySellAll({
      cargo: state.cargo, credits: state.credits, prices: state.prices, goods: GOODS,
    });
    if (!r.ok) return log("Hold empty.");
    state.credits = r.credits;
    state.cargo = r.cargo;
    log("Sold all (" + r.units + " units) for ₩" + r.total.toLocaleString() + ".");
    render();
  }

  function applyRefuelInternal(prefix) {
    const r = SF.applyRefuel({ fuel: state.fuel, fuelMax: hull().fuelMax, credits: state.credits });
    if (!r.ok) {
      if (!prefix && r.reason === "credits") log("Can't afford fuel.");
      return false;
    }
    state.fuel = r.fuel;
    state.credits = r.credits;
    if (r.partial) {
      log((prefix || "Partial refuel") + " +" + r.bought + " for ₩" + (r.bought * FUEL_PRICE) + ".");
    } else if (prefix) {
      log(prefix + " full for ₩" + (r.bought * FUEL_PRICE) + ".");
    } else {
      log("Refueled for ₩" + (r.bought * FUEL_PRICE) + ".");
    }
    return true;
  }

  function maybeAutoRefuel() {
    state.prefs = state.prefs || { autoFuel: true };
    if (!state.prefs.autoFuel) return;
    applyRefuelInternal("Auto-refuel");
  }

  function doTravel(toId) {
    if (bridgeOn) {
      if (currentPilot() === "agent") return log("Agent has the stick.");
      return void bridgeAct({ op: "jump", system: toId });
    }
    if (!inRange(state.system, toId)) return log("Out of jump range.");
    const cost = fuelCost(state.system, toId);
    if (state.fuel < cost) return log("Need " + cost + " fuel.");
    state.fuel -= cost;
    state.system = toId;
    markVisited(toId);
    state.dockWorkAt = null;
    state.pressBoughtAt = null;
    ui.targetId = null;
    rollMarket(state);
    log("Arrived " + sys(toId).name + " (−" + cost + " fuel).");
    maybeAutoRefuel();
    render();
    tickSkill("pilot", true);
    maybeEncounter(toId);
  }
  function doRefuel() {
    if (bridgeOn) {
      if (currentPilot() === "agent") return log("Agent has the stick.");
      return void bridgeAct({ op: "refuel" });
    }
    const need = hull().fuelMax - state.fuel;
    if (need <= 0) return log("Tanks full.");
    if (!applyRefuelInternal(null)) return;
    // rewrite last log for manual (non-auto) wording when full/partial already logged
    tickSkill("engineer", true);
    render();
  }

  function doBuyShip(id) {
    if (bridgeOn) {
      if (currentPilot() === "agent") return log("Agent has the stick.");
      return void bridgeAct({ op: "buy_ship", ship: id });
    }
    const next = ship(id);
    if (!next) return;
    const stock = hullStock(sys(state.system));
    if (!yardOffered().some((s) => s.id === id)) {
      return log(stock === "none" ? "Dry dock — no hull stock here." : "That hull isn't on this pad.");
    }
    if (cargoUsed(state) > next.cargo) {
      if (next.id === "mite") {
        const n = dumpToFit(next.cargo);
        if (cargoUsed(state) > next.cargo) return log("Can't lighten enough for a Mite.");
        log("Jettisoned " + n + " cargo to squeeze into a Mite.");
      } else {
        return log("Dump cargo before taking a smaller hold.");
      }
    }
    const delta = YE.tradeDelta(hull().price || 0, next.price);
    const due = YE.tradeDue(delta);
    const surplus = YE.tradeSurplus(delta);
    if (state.credits < due) return log("Need ₩" + due.toLocaleString() + " after trade-in.");
    state.credits -= due;
    state.credits += surplus;
    state.shipId = next.id;
    state.crew = Math.min(state.crew, next.crewMax);
    if (state.fuel > next.fuelMax) state.fuel = next.fuelMax;
    let pay = "Paid ₩" + due.toLocaleString();
    if (surplus > 0) pay = "Scrap payout ₩" + surplus.toLocaleString();
    else if (due === 0) pay = "No cash due";
    log("Signed for " + next.name + (next.weapons ? " (armed)" : "") + ". " + pay + ".");
    render();
  }

  function doDockWork() {
    if (bridgeOn) {
      if (currentPilot() === "agent") return log("Agent has the stick.");
      return void bridgeAct({ op: "dock_work" });
    }
    const shift = YE.afterDockWork(state.dockWorkAt, state.system, state.credits);
    if (!shift.ok) return log("Already worked this stay.");
    state.dockWorkAt = shift.dockWorkAt;
    state.credits = shift.credits;
    log("Dock shift done. +₩" + shift.pay + " — limp stake toward a Mite or yard.");
    render();
  }

  function doHireCrew() {
    if (bridgeOn) {
      if (currentPilot() === "agent") return log("Agent has the stick.");
      return void bridgeAct({ op: "hire_crew" });
    }
    const h = hull();
    if (state.crew >= h.crewMax) return log("No bunks left.");
    if (state.credits < CREW_HIRE) return log("Can't afford crew.");
    state.credits -= CREW_HIRE;
    state.crew += 1;
    log("Hired hand. Crew " + state.crew + "/" + h.crewMax + ".");
    render();
  }

  function doFireCrew() {
    if (bridgeOn) {
      if (currentPilot() === "agent") return log("Agent has the stick.");
      return void bridgeAct({ op: "fire_crew" });
    }
    if (state.crew < 1) return log("No crew to dismiss.");
    state.crew -= 1;
    state.credits += CREW_FIRE_REFUND;
    log("Dismissed a hand. +₩" + CREW_FIRE_REFUND + ".");
    render();
  }

  // Thin encounters: chance scales with destination police/pirate; small hulls quieter.

  function doBuyPress() {
    if (bridgeOn) {
      if (currentPilot() === "agent") return log("Agent has the stick.");
      return void bridgeAct({ op: "buy_press" });
    }
    const buy = SP.buyPress({
      credits: state.credits,
      pressBoughtAt: state.pressBoughtAt,
      systemId: state.system,
    });
    if (!buy.ok) {
      return log(buy.reason === "already"
        ? "Already bought today's Press at this dock."
        : "Need ₩" + SP.PRESS_PRICE + " for the Dock Press.");
    }
    state.credits = buy.credits;
    state.pressBoughtAt = buy.pressBoughtAt;
    const edition = SP.rollEdition({
      hereId: state.system,
      systems: SYSTEMS,
      goods: GOODS,
      priceFor: priceFor,
    });
    state.lastPress = edition;
    log("Dock Press ₩" + buy.paid + " — " + edition.masthead);
    render();
  }

  function maybeEncounter(toId) {
    const dest = sys(toId) || sys(state.system);
    const kind = SE.pickEncounter(SE.encounterOdds(dest, hull()), Math.random);
    if (kind !== "none") openEncounter(kind, dest);
  }

  const dlg = el("encounter");
  let encKind = null;
  let encDest = null;

  function openEncounter(kind, dest) {
    encKind = kind;
    encDest = dest || sys(state.system);
    const armed = hull().weapons && state.crew > 0;
    const pir = activityLabel(encDest.pirate);
    const pol = activityLabel(encDest.police);
    if (kind === "warden") {
      el("enc-title").textContent = "Ledger Wardens";
      el("enc-body").textContent =
        "Patrol lock inbound (" + encDest.name + " · police " + pol + "). Inspection fine ₩400 — or bluff.";
      el("enc-a").textContent = "Pay fine";
      el("enc-b").textContent = "Bluff";
    } else if (kind === "trader") {
      el("enc-title").textContent = "Lane trader";
      el("enc-body").textContent =
        "A free hauler pings you near " + encDest.name + ". Hail for a quick deal, or wave them off.";
      el("enc-a").textContent = "Hail";
      el("enc-b").textContent = "Wave off";
    } else {
      el("enc-title").textContent = "Ash Corsairs";
      if (armed) {
        el("enc-body").textContent =
          "Raiders on the lane to " + encDest.name + " (pirates " + pir + "). Fight or burn fuel fleeing.";
        el("enc-a").textContent = "Fight";
        el("enc-b").textContent = "Flee (−fuel)";
      } else {
        el("enc-body").textContent =
          "Raiders on the lane to " + encDest.name + " (pirates " + pir + "). Dump cargo or flee.";
        el("enc-a").textContent = "Dump cargo";
        el("enc-b").textContent = "Flee (−fuel)";
      }
    }
    dlg.showModal();
  }

  function resolveEncounter(choice) {
    dlg.close();
    const armed = hull().weapons && state.crew > 0;
    if (encKind === "warden") {
      if (choice === "a") {
        const fine = Math.min(state.credits, 400);
        state.credits -= fine;
        log("Paid Wardens ₩" + fine + ".");
      } else if (Math.random() < 0.55) {
        tickSkill("fighter", true);
        log("Bluff held. Wardens wave you on.");
      } else {
        const fine = Math.min(state.credits, 700);
        state.credits -= fine;
        log("Bluff failed. Fine ₩" + fine + ".");
      }
    } else if (encKind === "trader") {
      if (choice === "b") {
        log("Waved the trader off.");
      } else {
        const held = GOODS.map((g) => g.id).filter((id) => (state.cargo[id] || 0) > 0);
        if (held.length && Math.random() < 0.55) {
          const id = held[Math.floor(Math.random() * held.length)];
          const p = Math.round((state.prices[id] || GOODS.find((g) => g.id === id).base) * 1.12);
          state.cargo[id] -= 1;
          state.credits += p;
          tickSkill("trader", true);
          log("Trader bought 1 " + GOODS.find((g) => g.id === id).name + " for ₩" + p + ".");
        } else {
          const g = GOODS[Math.floor(Math.random() * GOODS.length)];
          const room = hull().cargo - cargoUsed(state);
          const p = Math.round((state.prices[g.id] || g.base) * 0.88);
          if (room >= 1 && state.credits >= p) {
            state.credits -= p;
            state.cargo[g.id] = (state.cargo[g.id] || 0) + 1;
            log("Bought 1 " + g.name + " off a trader for ₩" + p + ".");
          } else {
            log("Trader had nothing you could take. Fair skies.");
          }
        }
      }
    } else if (armed && choice === "a") {
      const pir = (encDest && encDest.pirate) || 3;
      const odds = 0.55 + state.crew * 0.06 - pir * 0.03;
      if (Math.random() < odds) {
        const prize = 350 + state.crew * 150 + pir * 40;
        state.credits += prize;
        tickSkill("fighter", false);
        log("Corsairs broke off. Salvage ₩" + prize + ".");
      } else {
        const loss = 400 + pir * 50;
        state.credits = Math.max(0, state.credits - loss);
        tickSkill("fighter", true);
        log("Fight went bad. −₩" + loss + " repairs.");
      }
    } else if (choice === "a") {
      let dumped = 0;
      const ids = GOODS.map((g) => g.id);
      const take = Math.min(3, 1 + Math.floor(((encDest && encDest.pirate) || 3) / 3));
      while (dumped < take) {
        const held = ids.filter((id) => state.cargo[id] > 0);
        if (!held.length) break;
        const id = held[Math.floor(Math.random() * held.length)];
        state.cargo[id] -= 1;
        dumped += 1;
      }
      log(dumped ? ("Corsairs took " + dumped + " cargo.") : "Hold empty — they laugh and leave.");
    } else {
      const burn = Math.min(state.fuel, 1 + (Math.random() < 0.35 ? 1 : 0));
      if (state.fuel >= 1) {
        state.fuel -= burn;
        log("Fled. −" + burn + " fuel.");
      } else {
        state.credits = Math.max(0, state.credits - 250);
        log("No fuel to flee. They shake you down ₩250.");
      }
    }
    encKind = null;
    encDest = null;
    render();
  }

  el("enc-a").onclick = () => resolveEncounter("a");
  el("enc-b").onclick = () => resolveEncounter("b");
  el("btn-refuel").onclick = doRefuel;
  el("btn-sell-all").onclick = doSellAll;
  el("btn-warp").onclick = () => {
    if (!ui.targetId || ui.targetId === state.system) return;
    doTravel(ui.targetId);
  };
  el("btn-retire").onclick = () => {
    if (!(sys(state.system).retire && netWorth(state) >= RETIRE_NET)) return;
    log("Retired on Quiet Moon. Net ₩" + netWorth(state).toLocaleString() + ". Victory.");
    alert("You retire on Quiet Moon. Game clear — New starts a fresh captain.");
  };
  el("btn-reset").onclick = () => {
    if (!confirm("Wipe save and start fresh?")) return;
    state = fresh();
    ui.targetId = null;
    rollMarket(state);
    applyPilot("human", false);
    showTab("dock");
    render();
  };

  document.querySelectorAll(".tabbar .tab").forEach((b) => {
    b.onclick = () => showTab(b.dataset.tab);
  });
  document.querySelectorAll("[data-goto]").forEach((b) => {
    b.onclick = () => showTab(b.dataset.goto);
  });
  el("mode-local").onclick = () => setChartMode("local");
  el("mode-sector").onclick = () => setChartMode("sector");
  if (el("mode-full")) el("mode-full").onclick = () => setChartMode("full");

  el("map").addEventListener("pointerdown", (e) => {
    const s = pickSystemAt(e.clientX, e.clientY);
    if (!s) return;
    if (s.id === state.system) {
      ui.targetId = null;
    } else {
      ui.targetId = s.id;
      if ((ui.chartMode === "sector" || ui.chartMode === "full") && !inRange(state.system, s.id)) {
        // allow select out of range to show distance; Jump stays disabled
      }
    }
    drawMap();
    renderTarget();
  });

  window.addEventListener("resize", () => {
    if (ui.tab !== "chart") return;
    sizeMap();
    drawMap();
  });

  document.querySelectorAll("[data-theme-pick]").forEach((b) => {
    b.onclick = () => applyTheme(b.dataset.themePick, true);
  });
  document.querySelectorAll("[data-pilot-pick]").forEach((b) => {
    b.onclick = () => applyPilot(b.dataset.pilotPick, true);
  });
  const takeStick = el("btn-take-stick");
  if (takeStick) takeStick.onclick = () => applyPilot("human", true);
  loadTheme();
  applyPilot(state.pilot || "human", false);

  function syncPrefsUi() {
    const box = el("pref-autofuel");
    if (!box) return;
    state.prefs = state.prefs || { autoFuel: true };
    box.checked = !!state.prefs.autoFuel;
  }

  function applyBridgePayload(data) {
    if (!data || !data.state) return;
    state = data.state;
    state.prefs = state.prefs || { autoFuel: true };
    if (state.prefs.autoFuel == null) state.prefs.autoFuel = true;
    if (state.chart) applyChart(state.chart);
    if (!state.prices || !Object.keys(state.prices).length) rollMarket(state);
    applyPilot(state.pilot || "human", false);
    syncPrefsUi();
    ui.targetId = null;
    render();
    // Surface pending encounter from shared seat (once)
    if (data.pendingEncounter && currentPilot() === "human" && !encKind) {
      const pe = data.pendingEncounter;
      const dest = sys(pe.systemId) || sys(state.system);
      if (pe.kind && dest) openEncounter(pe.kind, dest);
    } else if (!data.pendingEncounter && encKind && dlg && dlg.open) {
      /* keep local dialog until resolved via act */
    }
  }

  async function bridgeAct(body) {
    try {
      const r = await fetch("/api/act", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body || {}),
      });
      const data = await r.json();
      applyBridgePayload(data);
      if (data.result && data.result.ok === false && data.result.error) {
        log(String(data.result.error) + (data.result.hint ? (" — " + data.result.hint) : ""));
      }
      return data;
    } catch (e) {
      log("Bridge act failed: " + e);
      return null;
    }
  }

  async function bridgePoll() {
    try {
      const r = await fetch("/api/state", { cache: "no-store" });
      const data = await r.json();
      applyBridgePayload(data);
    } catch (e) {
      /* bridge down — keep last frame */
    }
  }

  const prefBox = el("pref-autofuel");
  if (prefBox) {
    syncPrefsUi();
    prefBox.onchange = () => {
      state.prefs = state.prefs || { autoFuel: true };
      state.prefs.autoFuel = !!prefBox.checked;
      if (bridgeOn) {
        bridgeAct({ op: "set_prefs", autoFuel: state.prefs.autoFuel });
      } else {
        log(state.prefs.autoFuel ? "Auto-refuel on arrive: ON." : "Auto-refuel on arrive: OFF.");
        save(state);
        render();
      }
    };
  }

  // Bridge mode: Take stick / pilot picks go through /api/act
  if (bridgeOn) {
    document.querySelectorAll("[data-pilot-pick]").forEach((b) => {
      b.onclick = () => {
        const who = b.dataset.pilotPick;
        if (who === "human") bridgeAct({ op: "take_stick" });
        else bridgeAct({ op: "claim" });
      };
    });
    const takeStickBtn = el("btn-take-stick");
    if (takeStickBtn) takeStickBtn.onclick = () => bridgeAct({ op: "take_stick" });
    // Wrap common market/yard actions when human has stick
    const wrapHuman = (fn, bodyFn) => function () {
      if (currentPilot() === "agent") return log("Agent has the stick.");
      return void bridgeAct(bodyFn.apply(null, arguments));
    };
    el("btn-sell-all").onclick = wrapHuman(null, () => ({ op: "sell_all" }));
    el("btn-retire").onclick = wrapHuman(null, () => ({ op: "retire" }));
    el("btn-reset").onclick = () => {
      if (!confirm("Wipe save and start fresh on the shared seat?")) return;
      bridgeAct({ op: "new_game" });
    };
    // Encounter choices via bridge
    el("enc-a").onclick = () => bridgeAct({ op: "encounter", choice: "a" });
    el("enc-b").onclick = () => bridgeAct({ op: "encounter", choice: "b" });
    document.body.classList.add("bridge-mode");
    bridgePoll();
    setInterval(bridgePoll, 500);
  }


  function syncGodUi() {
    const on = godEnabled();
    const godPanel = el("god-panel");
    if (godPanel) godPanel.hidden = !on;
    const box = el("pref-godmode");
    if (box) {
      state.prefs = state.prefs || {};
      if (GOD.isDebugOn(typeof location !== "undefined" ? location.search : "")) {
        box.checked = true;
      } else {
        box.checked = !!state.prefs.godMode;
      }
    }
  }

  const godPref = el("pref-godmode");
  if (godPref) {
    godPref.onchange = () => {
      state.prefs = state.prefs || {};
      state.prefs.godMode = !!godPref.checked;
      log(state.prefs.godMode ? "God mode ON — tools unlocked." : "God mode OFF.");
      save(state);
      syncGodUi();
      render();
    };
  }

  const wireGod = (id, fn) => {
    const b = el(id);
    if (b) b.onclick = () => {
      if (!godEnabled()) return log("Enable God mode on Captain first.");
      fn();
    };
  };
  wireGod("god-credits", () => {
    state = GOD.grantCredits(state, GOD.GRANT_DEFAULT);
    log("God: +₩" + GOD.GRANT_DEFAULT.toLocaleString() + ".");
    save(state); render();
  });
  wireGod("god-fuel", () => {
    state = GOD.fillFuel(state, hull().fuelMax);
    log("God: tanks topped.");
    save(state); render();
  });
  wireGod("god-yard", () => {
    state = GOD.unlockYard(state);
    log("God: full yard unlocked at every dock.");
    save(state); render();
  });
  wireGod("god-wasp", () => {
    const r = GOD.setHull(state, "wasp-prime", SHIPS, GOODS.map((x) => x.id));
    if (!r.ok) return log("God: cannot set Wasp Prime (" + r.reason + ").");
    state = r.state;
    log("God: hull set to Wasp Prime" + (r.jettison ? (" — jettisoned " + r.jettison + " cargo.") : "."));
    save(state); render();
  });

  const pinBtn = el("btn-waypoint");
  if (pinBtn) pinBtn.onclick = () => {
    const id = ui.targetId;
    if (!id || id === state.system) return;
    const r = WP.toggle(state.waypoints, id);
    state.waypoints = r.list;
    if (r.full) log("Waypoint list full (" + WP.MAX_WAYPOINTS + "). Unpin one first.");
    else if (r.added) log("Pinned " + (sys(id) || {}).name + " (#" + r.list.length + ").");
    else if (r.removed) log("Unpinned " + (sys(id) || {}).name + ".");
    save(state); render();
  };
  const wpClear = el("btn-wp-clear");
  if (wpClear) wpClear.onclick = () => {
    state.waypoints = WP.clear(state.waypoints);
    log("Waypoints cleared.");
    save(state); render();
  };

  syncGodUi();

  showTab("dock");
  render();
  syncPrefsUi();
})();
