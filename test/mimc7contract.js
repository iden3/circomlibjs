import chai from "chai";
import {createCode, abi} from "../src/mimc7_gencontract.js";
import { ethers } from "ethers";
import ganache from "ganache-cli";

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
        const provider = new ethers.providers.Web3Provider(ganache.provider());

        account = provider.getSigner(0);
        mimcJS = await buildMimc7();
    });
    after(async () => {
        globalThis.curve_bn128.terminate();
    });

    it("Should deploy the contract", async () => {


        const C = new ethers.ContractFactory(
            abi,
            createCode(SEED, 91),
            account
          );

        mimc = await C.deploy();
    });

    it("Shold calculate the mimc correctly", async () => {

        const res = await mimc["MiMCpe7"](1,2);

        // console.log("Cir: " + bigInt(res.toString(16)).toString(16));

        const res2 = mimcJS.hash(1,2);
        // console.log("Ref: " + bigInt(res2).toString(16));

        assert.equal(res.toString(), mimcJS.F.toString(res2));

    });

});

