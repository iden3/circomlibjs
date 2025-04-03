import chai from "chai";
import {createCode, abi} from "../src/mimc7_gencontract.js";
import pkg from 'hardhat';
const { ethers } = pkg;

import buildMimc7 from "../src/mimc7.js";


const assert = chai.assert;
const log = (msg) => { if (process.env.MOCHA_VERBOSE) console.log(msg); };

const SEED = "mimc";

describe("MiMC Smart contract test", function () {
    let mimc;
    let mimcJS;
    let account;
    this.timeout(100000);

    before(async () => {
        [account] = await ethers.getSigners();
        mimcJS = await buildMimc7();
    });

    it("Should deploy the contract", async () => {

        const code = createCode(SEED, 91);
        const C = new ethers.ContractFactory(
            abi,
            code,
            account
          );

        mimc = await C.deploy();

        const codeHash = ethers.keccak256(code);
        assert.equal(
            codeHash,
            "0xd0b844e2fa96af5b59f8ec7c7a060936d7cfbe11ad3b2f1629333d164c2b3ab4"
        );

    });

    it("Should calculate the mimc correctly", async () => {

        const res = await mimc["MiMCpe7"](1,2);

        // console.log("Cir: " + bigInt(res.toString(16)).toString(16));

        const res2 = mimcJS.hash(1,2);
        // console.log("Ref: " + bigInt(res2).toString(16));

        assert.equal(res.toString(), mimcJS.F.toString(res2));

    });

});

