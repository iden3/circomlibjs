import chai from "chai";
import {createCode, abi} from "../src/mimcsponge_gencontract.js";
import { ethers } from "ethers";
import ganache from "ganache";

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

    it("Should deploy the contract", async () => {

        const code = createCode(SEED, 220);
        const C = new ethers.ContractFactory(
            abi,
            code,
            account
          );

        mimc = await C.deploy();

        const codeHash = ethers.utils.keccak256(code);
        assert.equal(
            codeHash,
            "0x08d93c30978b3338cd0c82d76edbda569d4dc71a56de48598bb8ba763669fe30"
        );
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

