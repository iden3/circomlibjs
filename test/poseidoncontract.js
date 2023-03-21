import chai from "chai";
import { createCode, generateABI } from "../src/poseidon_gencontract.js";
import buildPoseidonReference from "../src/poseidon_reference.js";
import { ethers } from "ethers";
import ganache from "ganache";
import bigInt from "big-integer";
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
        const provider = new ethers.providers.Web3Provider(ganache.provider());

        account = provider.getSigner(0);
        poseidon = await buildPoseidonReference();
    });

    it("Should deploy the contract", async () => {
        // const C6 = new ethers.ContractFactory(
        //     generateABI(5),
        //     createCode(5),
        //     account
        // );
        const C3 = new ethers.ContractFactory(
            generateABI(2),
            createCode(2),
            account
        );

        // poseidon6 = await C6.deploy();
        poseidon3 = await C3.deploy();
    });

    it("Should calculate the poseidon correctly t=3", async () => {

        const res = await poseidon3["poseidon(uint256[2])"]([1, 2]);

        console.log("Cir: " + res);

        const res2 = poseidon([1, 2], 2); // 3rd param has to be 2 per starkwares implmentation
        console.log("Ref: " + res2);

        assert.equal(res.toString(), res2.toString());
    });

});

