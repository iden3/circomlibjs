import chai from "chai";
const assert = chai.assert;

import buildMimcSponge from "../src/mimcsponge.js";

describe("Mimc Sponge test", function () {
    let mimcSponge;

    before(async () => {
        mimcSponge = await buildMimcSponge();
    });
    after(async () => {
        globalThis.curve_bn128.terminate();
    });

    it("Should check multihash reference 2", async () => {
        const res2 = mimcSponge.multiHash([1,2]);
        // console.log(mimcSponge.F.toString(res2,16));
        assert(mimcSponge.F.eq(mimcSponge.F.e("0x2bcea035a1251603f1ceaf73cd4ae89427c47075bb8e3a944039ff1e3d6d2a6f"), res2));
    });
    it("Should check multihash reference 4", async () => {
        const res2 = mimcSponge.multiHash([1,2,3,4]);
        // console.log(mimcSponge.F.toString(res2,16));
        assert(mimcSponge.F.eq(mimcSponge.F.e("0x3e86bdc4eac70bd601473c53d8233b145fe8fd8bf6ef25f0b217a1da305665c"), res2));
    });
});
