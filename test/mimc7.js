import chai from "chai";
const assert = chai.assert;

import buildMimc7 from "../src/mimc7.js";

describe("Mimc7 test", function () {
    let mimc7;
    this.timeout(1000000);

    before(async () => {
        mimc7 = await buildMimc7();
    });

    it("Should check multihash reference 2", async () => {
        const res2 = mimc7.multiHash([1,2]);
        assert(mimc7.F.eq(mimc7.F.e("0xb91ebbd35d7448ecc13e75a7ceb1ce5bbe428090acfae0da2c3867a874ce6ea"), res2));
    });
    it("Should check multihash reference 4", async () => {
        const res2 = mimc7.multiHash([1,2,3,4]);
        assert(mimc7.F.eq(mimc7.F.e("0x19ce9298d9e8ada63b2fb30c938d25cc9116aca2795f8b90fd9530687b4ad075"), res2));
    });
});
