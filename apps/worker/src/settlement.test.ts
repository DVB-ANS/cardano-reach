import assert from "node:assert/strict";
import { test } from "node:test";
import { sellerTokenNet } from "./settlement.ts";

test("la monnaie rendue au vendeur ne gonfle pas son reçu", () => {
  const amount = (quantity: string) => [{ unit: "token", quantity }];
  const utxos = {
    inputs: [{ address: "seller", amount: amount("100") }],
    outputs: [
      { address: "seller", amount: amount("101") },
      { address: "buyer", amount: amount("99") },
    ],
  };
  assert.equal(sellerTokenNet(utxos, "seller", "token"), 1n);
});
