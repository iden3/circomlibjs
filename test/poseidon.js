import chai from "chai";
const assert = chai.assert;

import buildPoseidonOpt from "../src/poseidon_opt.js";
import {buildPoseidon as buildPoseidonWasm } from "../src/poseidon_wasm.js";
import buildPoseidonReference from "../src/poseidon_reference.js";

describe("Poseidon test", function () {
    let poseidonOpt;
    let poseidonReference;
    let poseidonWasm;
    this.timeout(10000000);

    before(async () => {
        poseidonOpt = await buildPoseidonOpt();
        poseidonReference = await buildPoseidonReference();
        poseidonWasm = await buildPoseidonWasm();
    });

    it("Should check constrain reference implementation poseidonperm_x5_254_3", async () => {
        const res1 = poseidonReference([1, 2]);
        assert(poseidonReference.F.eq(poseidonReference.F.e("0x115cc0f5e7d690413df64c6b9662e9cf2a3617f2743245519e19607a4417189a"), res1));

        const res2 = poseidonOpt([1,2]);
        assert(poseidonOpt.F.eq(poseidonOpt.F.e("0x115cc0f5e7d690413df64c6b9662e9cf2a3617f2743245519e19607a4417189a"), res2));

        const res3 = poseidonWasm([1,2]);
        assert(poseidonWasm.F.eq(poseidonWasm.F.e("0x115cc0f5e7d690413df64c6b9662e9cf2a3617f2743245519e19607a4417189a"), res3));
    });
    it("Should check constrain reference implementation poseidonperm_x5_254_5", async () => {
        const res1 = poseidonReference([1,2,3,4]);
        assert(poseidonReference.F.eq(poseidonReference.F.e("0x299c867db6c1fdd79dcefa40e4510b9837e60ebb1ce0663dbaa525df65250465"), res1));

        const res2 = poseidonOpt([1,2,3,4]);
        assert(poseidonOpt.F.eq(poseidonOpt.F.e("0x299c867db6c1fdd79dcefa40e4510b9837e60ebb1ce0663dbaa525df65250465"), res2));

        const res3 = poseidonWasm([1,2,3,4]);
        assert(poseidonWasm.F.eq(poseidonWasm.F.e("0x299c867db6c1fdd79dcefa40e4510b9837e60ebb1ce0663dbaa525df65250465"), res3));
    });
    it("Should check state and nOuts", async () => {
        const F = poseidonWasm.F;
        const inp = [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16];
        const st = 0;
        const nOut = 17;
        const res1 = poseidonReference(inp, st, nOut);
        const res2 = poseidonOpt(inp, st, nOut);
        const res3 = poseidonWasm(inp, st, nOut);
        for (let i=0; i<nOut; i++) {
            assert(F.eq(res1[i], res2[i]));
            assert(F.eq(res2[i], res3[i]));
        }
    });
    it("Should check poseidon with 16 inputs", async () => {
        const testvectors = [
            {
                inputs: [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16],
                expected: "9989051620750914585850546081941653841776809718687451684622678807385399211877"
            },
            {
                inputs: [1,2,3,4,5,6,7,8,9,0,0,0,0,0,0,0],
                expected: "11882816200654282475720830292386643970958445617880627439994635298904836126497"
            },
        ];

        for (let i=0; i<testvectors.length; i++) {
            const res1 = poseidonReference(testvectors[i].inputs);
            assert(poseidonReference.F.eq(poseidonReference.F.e(testvectors[i].expected), res1));

            const res2 = poseidonOpt(testvectors[i].inputs);
            assert(poseidonOpt.F.eq(poseidonOpt.F.e(testvectors[i].expected), res2));

            const res3 = poseidonWasm(testvectors[i].inputs);
            assert(poseidonWasm.F.eq(poseidonWasm.F.e(testvectors[i].expected), res3));
        }
    });

    it("Should check poseidon with init state", async () => {

        const testvectors = [
            {
                inputs: [1,2,3,4,5,6],
                initState: 0,
                expected: "20400040500897583745843009878988256314335038853985262692600694741116813247201"
            },
            {
                inputs: [1,2,3,4],
                initState: 7,
                expected: "1569211601569591254857354699102545060324851338714426496554851741114291465006"
            },
            {
                inputs: [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16],
                initState: 17,
                expected: "7865037705064445207187340054656830232157001572238023180016026650118519857086"
            },
        ];

        for (let i=0; i<testvectors.length; i++) {
            const res1 = poseidonReference(testvectors[i].inputs, testvectors[i].initState);
            assert(poseidonReference.F.eq(poseidonReference.F.e(testvectors[i].expected), res1));

            const res2 = poseidonOpt(testvectors[i].inputs, testvectors[i].initState);
            assert(poseidonOpt.F.eq(poseidonOpt.F.e(testvectors[i].expected), res2));

            const res3 = poseidonWasm(testvectors[i].inputs, testvectors[i].initState);
            assert(poseidonWasm.F.eq(poseidonWasm.F.e(testvectors[i].expected), res3));
        }
    });
    it("Should check poseidon with init state2", async () => {

        const transactionHash = poseidonOpt([1,2,3,4]);
        console.log("expected: 0x299c867db6c1fdd79dcefa40e4510b9837e60ebb1ce0663dbaa525df65250465");
        console.log(transactionHash);
        // uncommenting the following line will cause transactionHash to be change
        //console.log("toString: ", poseidonOpt.F.toString(transactionHash, 16));

        //console.log(poseidonOpt.F);
        //console.log("toString: ", poseidonOpt.F.toString(transactionHash, 16));
        //console.log(transactionHash);
        await poseidonOpt.F.toRprLE(transactionHash);
        await poseidonOpt.F.toRprLE(transactionHash);
        await poseidonOpt.F.toRprLE(transactionHash);
        await poseidonOpt.F.toRprLE(transactionHash);
        console.log(transactionHash);
        console.log(poseidonOpt.F.toString(transactionHash, 16));
        console.log(poseidonOpt.F.toString(transactionHash, 16));

    });
});
