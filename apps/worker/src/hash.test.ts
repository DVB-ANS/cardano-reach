import assert from "node:assert/strict";
import { test } from "node:test";
import { standardInputHash, standardResultHash, taskHash } from "./hash.ts";

test("hash de Task : octets UTF-8 bruts, sans échappement ni nonce", () => {
  assert.equal(taskHash("abc"), "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad");
  assert.notEqual(taskHash("a\nb"), taskHash("a\\nb"));
});

test("hash standard MIP-004 : JSON canonique préfixé par le nonce (valeurs de la référence Masumi)", () => {
  assert.equal(standardInputHash({ prompt: "Cardano payments" }, "aabbccddeeff0011"), "25f3afe66b39b0582711c9faf53930c7b6a6feffd10294750ec77be47fd63080");
  assert.equal(standardResultHash("Line 1\nLine 2", "aabbccddeeff0011"), "6fa3bfa69364318f78619b87652c725d705c90f18f8bdcb5d7041c17b73ea57a");
});
