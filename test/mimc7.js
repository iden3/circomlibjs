import chai from "chai";
const assert = chai.assert;

import buildMimc7 from "../src/mimc7.js";

describe("Mimc7 test", function () {
    let mimc7;

    before(async () => {
        mimc7 = await buildMimc7();
    });
    after(async () => {
        globalThis.curve_bn128.terminate();
    });

    it("Should check multihash reference 2", async () => {
        const res2 = mimc7.multiHash([1,2]);
        assert(mimc7.F.eq(mimc7.F.e("0x1457424af251109768c8161500816fca43bdf0f9cf10c5094008a6774baacd55"), res2));
    });
    it("Should check multihash reference 4", async () => {
        const res2 = mimc7.multiHash([1,2,3,4]);
        assert(mimc7.F.eq(mimc7.F.e("0x2c84563396117b022ab9226199f698eaeab81e03c6185d81d413f3423e8c8964"), res2));
    });
});
