import chai from "chai";
const assert = chai.assert;

import buildPedersenHash from "../src/pedersenhash.js";

function buff2hex(buff) {
    function i2hex(i) {
      return ('0' + i.toString(16)).slice(-2);
    }
    return Array.from(buff).map(i2hex).join('');
}

describe("Pedersen Hash test", function () {
    let pedersen;

    before(async () => {
        pedersen = await buildPedersenHash();
    });
    after(async () => {
        globalThis.curve_bn128.terminate();
    });

    it("Should check multihash reference 2", async () => {
        const msg = (new TextEncoder()).encode("Hello");

        const res2 = pedersen.hash(msg);
        // console.log(buff2hex(res2));
        assert.equal(buff2hex(res2),  "0e90d7d613ab8b5ea7f4f8bc537db6bb0fa2e5e97bbac1c1f609ef9e6a35fd8b");
    });
});
