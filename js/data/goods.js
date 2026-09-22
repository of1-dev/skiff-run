(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.SkiffGoods = factory();
  }
}(typeof globalThis !== 'undefined' ? globalThis : this, function () {

  const GOODS = [
      { id: "ore", name: "Basalt Ore", base: 40 },
      { id: "grain", name: "Dry Grain", base: 28 },
      { id: "optics", name: "Lens Optics", base: 95 },
      { id: "meds", name: "Field Meds", base: 110 },
      { id: "spice", name: "Rack Spice", base: 70 },
      { id: "scrap", name: "Hull Scrap", base: 22 },
    ];

  return GOODS;
}));
