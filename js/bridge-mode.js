/**
 * Skiff Run — bridge mode detection (pure, ATDD).
 *
 * Bridge mode means "an MCP bridge is serving this page", so state changes go
 * over the wire to /skiff/api/act instead of being applied locally.
 *
 * The /skiff path rule is only valid on a LOCAL host. On GitHub Pages the path
 * is /skiff-run/, which startsWith("/skiff") and used to flip bridge mode on
 * for a public host with no bridge behind it. Every god-mode button then took
 * the bridgeAct() path, POSTed to a 404, threw in r.json(), and never applied
 * the local grant. Host-aware so a public /skiff* path is just a page.
 */
(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
  } else {
    root.SkiffBridgeMode = factory();
  }
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const BRIDGE_PORT = "8787";

  function isLocalHost(hostname) {
    const h = String(hostname || "").toLowerCase().replace(/^\[|\]$/g, "");
    if (!h) return false;
    if (h === "localhost" || h === "::1" || h === "0:0:0:0:0:0:0:1") return true;
    if (h.endsWith(".localhost") || h.endsWith(".local") || h.endsWith(".ts.net")) return true;
    const v4 = h.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
    if (!v4) return false;
    const a = v4[1] | 0;
    const b = v4[2] | 0;
    if (a === 127) return true;
    if (a === 10) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
    if (a === 100 && b >= 64 && b <= 127) return true;
    return false;
  }

  function hasBridgeFlag(search) {
    return /(?:\?|&)bridge=1(?:&|$)/.test(String(search || ""));
  }

  function isBridgeMode(opts) {
    const o = opts || {};
    if (hasBridgeFlag(o.search)) return true;
    if (String(o.port || "") === BRIDGE_PORT) return true;
    const path = String(o.pathname || "");
    return path.startsWith("/skiff") && isLocalHost(o.hostname);
  }

  return { BRIDGE_PORT, isLocalHost, hasBridgeFlag, isBridgeMode };
});
