import chai from "chai";
const assert = chai.assert;

import buildPoseidon from "../src/poseidon.js";
import buildPoseidonSlow from "../src/poseidon_slow.js";

describe("Poseidon test", function () {
    let poseidon;
    let poseidonSlow;

    before(async () => {
        poseidon = await buildPoseidon();
        poseidonSlow = await buildPoseidonSlow();
    });
    before(async () => {
        globalThis.curve_bn128.terminate();
    });

    it("Should check constrain reference implementation poseidonperm_x5_254_3", async () => {
        const res2 = poseidon([1,2]);
        assert(poseidon.F.eq(poseidon.F.e("0x115cc0f5e7d690413df64c6b9662e9cf2a3617f2743245519e19607a4417189a"), res2));

        const res3 = poseidonSlow([1, 2]);
        assert(poseidonSlow.F.eq(poseidonSlow.F.e("0x115cc0f5e7d690413df64c6b9662e9cf2a3617f2743245519e19607a4417189a"), res3));
    });
    it("Should check constrain reference implementation poseidonperm_x5_254_5", async () => {
        const res2 = poseidon([1,2,3,4]);
        assert(poseidon.F.eq(poseidon.F.e("0x299c867db6c1fdd79dcefa40e4510b9837e60ebb1ce0663dbaa525df65250465"), res2));

        const res3 = poseidonSlow([1,2,3,4]);
        assert(poseidonSlow.F.eq(poseidonSlow.F.e("0x299c867db6c1fdd79dcefa40e4510b9837e60ebb1ce0663dbaa525df65250465"), res3));
    });
});
