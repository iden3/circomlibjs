import chai from "chai";
import {createCode, abi} from "../src/mimcsponge_gencontract.js";
import { ethers } from "ethers";
import ganache from "ganache-cli";

import buildMimcSponge from "../src/mimcsponge.js";


const assert = chai.assert;
const log = (msg) => { if (process.env.MOCHA_VERBOSE) console.log(msg); };

const SEED = "mimcsponge";

describe("MiMC Sponge Smart contract test", () => {
    let mimc;
    let mimcJS;
    let account;

    before(async () => {
        const provider = new ethers.providers.Web3Provider(ganache.provider());

        account = provider.getSigner(0);
        mimcJS = await buildMimcSponge();
    });
    after(async () => {
        globalThis.curve_bn128.terminate();
    });

    it("Should deploy the contract", async () => {


        const C = new ethers.ContractFactory(
            abi,
            createCode(SEED, 220),
            account
          );

        mimc = await C.deploy();
    });

    it("Shold calculate the mimc correctly", async () => {

        const res = await mimc["MiMCSponge"](1,2, 3);

        // console.log("Cir: " + bigInt(res.toString(16)).toString(16));

        const res2 = mimcJS.hash(1,2, 3);
        // console.log("Ref: " + bigInt(res2).toString(16));

        assert.equal(res.xL.toString(), mimcJS.F.toString(res2.xL));
        assert.equal(res.xR.toString(), mimcJS.F.toString(res2.xR));

    });
});

