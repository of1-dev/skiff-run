/**
 * ATDD — bridge mode detection (host-aware).
 * Run: node --test test/acceptance/bridge-mode.test.js
 *
 * Regression (verified live 2026-09-30): on GitHub Pages the pathname is
 * /skiff-run/, which startsWith("/skiff"), so bridgeOn was wrongly true. Every
 * god-mode button took the ctx.bridgeAct() path, which POSTs to /skiff/api/act,
 * gets a 404 HTML page off GitHub Pages, throws in r.json(), and never applies
 * the local grant. Silent no-op for the Captain.
 */
"use strict";

const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const { isBridgeMode } = require("../../js/bridge-mode.js");

describe("ATDD: bridge mode detection", () => {
  it("is off by default on any host", () => {
    assert.equal(isBridgeMode({ search: "", hostname: "of1-dev.github.io", port: "", pathname: "/" }), false);
    assert.equal(isBridgeMode({}), false);
    assert.equal(isBridgeMode(), false);
  });

  it("regression: GitHub Pages /skiff-run/ is NOT bridge mode", () => {
    assert.equal(isBridgeMode({ search: "", hostname: "of1-dev.github.io", port: "", pathname: "/skiff-run/" }), false);
    assert.equal(isBridgeMode({ search: "?god=1", hostname: "of1-dev.github.io", port: "", pathname: "/skiff-run/" }), false);
    assert.equal(isBridgeMode({ search: "?god=1", hostname: "of1-dev.github.io", port: "", pathname: "/skiff-run" }), false);
  });

  it("?bridge=1 turns it on anywhere, local or public", () => {
    assert.equal(isBridgeMode({ search: "?bridge=1", hostname: "localhost", port: "8080", pathname: "/" }), true);
    assert.equal(isBridgeMode({ search: "?bridge=1", hostname: "of1-dev.github.io", port: "", pathname: "/skiff-run/" }), true);
    assert.equal(isBridgeMode({ search: "?god=1&bridge=1&x=2", hostname: "of1-dev.github.io", port: "", pathname: "/skiff-run/" }), true);
    assert.equal(isBridgeMode({ search: "?x=1&bridge=1", hostname: "of1.dev", port: "", pathname: "/" }), true);
  });

  it("?bridge=0 or ?bridge=yes do not turn it on", () => {
    assert.equal(isBridgeMode({ search: "?bridge=0", hostname: "of1-dev.github.io", port: "", pathname: "/skiff-run/" }), false);
    assert.equal(isBridgeMode({ search: "?bridge=yes", hostname: "of1-dev.github.io", port: "", pathname: "/skiff-run/" }), false);
  });

  it("port 8787 is the local bridge port, whatever the path", () => {
    assert.equal(isBridgeMode({ search: "", hostname: "localhost", port: "8787", pathname: "/" }), true);
    assert.equal(isBridgeMode({ search: "", hostname: "192.168.1.20", port: "8787", pathname: "/whatever" }), true);
    assert.equal(isBridgeMode({ search: "", hostname: "of1-dev.github.io", port: "8787", pathname: "/skiff-run/" }), true);
  });

  it("/skiff path is bridge mode on local hosts", () => {
    const local = [
      "localhost",
      "game.localhost",
      "127.0.0.1",
      "::1",
      "10.0.0.5",
      "172.16.3.4",
      "172.31.255.254",
      "192.168.4.20",
      "100.83.8.84",
      "nuc.local",
      "yggi.ts.net",
    ];
    local.forEach((hostname) => {
      assert.equal(isBridgeMode({ search: "", hostname, port: "8080", pathname: "/skiff/" }), true, `${hostname} should be bridge mode`);
    });
  });

  it("/skiff path is NOT bridge mode on public hosts", () => {
    const publicHosts = [
      "of1-dev.github.io",
      "of1.dev",
      "www.of1.dev",
      "skiff.example.com",
      "192.169.1.5",
      "172.32.0.1",
      "11.0.0.1",
      "101.0.0.1",
      "notlocalhost.com",
    ];
    publicHosts.forEach((hostname) => {
      assert.equal(isBridgeMode({ search: "", hostname, port: "8080", pathname: "/skiff/" }), false, `${hostname} must not be bridge mode`);
    });
  });

  it("public host with a /skiff path and no bridge flag stays local", () => {
    assert.equal(isBridgeMode({ search: "", hostname: "of1-dev.github.io", port: "", pathname: "/skiff" }), false);
  });
});
