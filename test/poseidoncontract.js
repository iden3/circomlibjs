import chai from "chai";
import {createCode, generateABI} from "../src/poseidon_gencontract.js";
import { buildPoseidon } from "../src/poseidon_wasm.js";
import {Web3Provider} from "@ethersproject/providers";
import {ContractFactory} from "@ethersproject/contracts";
import ganache from "ganache";

const assert = chai.assert;
const log = (msg) => { if (process.env.MOCHA_VERBOSE) console.log(msg); };

describe("Poseidon Smart contract test", function () {
    let testrpc;
    let web3;
    let poseidon6;
    let poseidon3;
    let poseidon;
    let account;
    this.timeout(100000);

    before(async () => {
        const provider = new Web3Provider(ganache.provider());

        account = provider.getSigner(0);
        poseidon = await buildPoseidon();
    });

    it("Should deploy the contract", async () => {
        const C6 = new ContractFactory(
            generateABI(5),
            createCode(5),
            account
          );
        const C3 = new ContractFactory(
            generateABI(2),
            createCode(2),
            account
        );

        poseidon6 = await C6.deploy();
        poseidon3 = await C3.deploy();
    });

    it("Should calculate the poseidon correctly t=6", async () => {

        const res = await poseidon6["poseidon(uint256[5])"]([1,2, 0, 0, 0]);

        // console.log("Cir: " + bigInt(res.toString(16)).toString(16));

        const res2 = poseidon([1,2, 0, 0, 0]);
        // console.log("Ref: " + bigInt(res2).toString(16));

        assert.equal(res.toString(), poseidon.F.toString(res2));
    });
    it("Should calculate the poseidon correctly t=3", async () => {

        const res = await poseidon3["poseidon(uint256[2])"]([1,2]);

        // console.log("Cir: " + bigInt(res.toString(16)).toString(16));

        const res2 = poseidon([1,2]);
        // console.log("Ref: " + bigInt(res2).toString(16));

        assert.equal(res.toString(), poseidon.F.toString(res2));
    });

});

