(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.SkiffShips = factory();
  }
}(typeof globalThis !== 'undefined' ? globalThis : this, function () {

  const SHIPS = [
      // Soft-fail escape (Flea homage). Free Take; scrap pads + full yards.
      { id: "mite", name: "Mite", cargo: 10, fuelMax: 10, range: 20, weapons: false, crewMax: 1, hullMax: 20, ammoMax: 0, price: 0 },
      // Fresh game still starts in Skiff-7, not Mite.
      { id: "skiff-7", name: "Skiff-7", cargo: 20, fuelMax: 14, range: 28, weapons: false, crewMax: 1, hullMax: 40, ammoMax: 0, price: 0 },
      { id: "glass-dart", name: "Glass Dart", cargo: 12, fuelMax: 16, range: 42, weapons: false, crewMax: 1, hullMax: 30, ammoMax: 0, price: 4500 },
      { id: "tide-runner", name: "Tide Runner", cargo: 24, fuelMax: 16, range: 34, weapons: false, crewMax: 2, hullMax: 60, ammoMax: 0, price: 7000 },
      { id: "knot-hauler", name: "Knot Hauler", cargo: 32, fuelMax: 17, range: 30, weapons: false, crewMax: 3, hullMax: 80, ammoMax: 0, price: 8000 },
      { id: "hold-barge", name: "Hold Barge", cargo: 40, fuelMax: 18, range: 32, weapons: false, crewMax: 3, hullMax: 120, ammoMax: 0, price: 9000 },
      { id: "ember-cutter", name: "Ember Cutter", cargo: 16, fuelMax: 16, range: 38, weapons: true, crewMax: 2, hullMax: 60, ammoMax: 20, price: 12000 },
      { id: "ash-lance", name: "Ash Lance", cargo: 14, fuelMax: 18, range: 40, weapons: true, crewMax: 2, hullMax: 50, ammoMax: 30, price: 15000 },
      { id: "quiet-ark", name: "Quiet Ark", cargo: 50, fuelMax: 22, range: 36, weapons: false, crewMax: 4, hullMax: 150, ammoMax: 0, price: 22000 },
      { id: "wasp-prime", name: "Wasp Prime", cargo: 18, fuelMax: 20, range: 44, weapons: true, crewMax: 3, hullMax: 100, ammoMax: 40, price: 28000 },
      { id: "unbowed", name: "Unbowed", cargo: 12, fuelMax: 16, range: 36, weapons: true, crewMax: 3, hullMax: 80, ammoMax: 50, price: 0, gated: true },
    ];

  return SHIPS;
}));
