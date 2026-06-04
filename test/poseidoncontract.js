import chai from "chai";
import { createCode, generateABI } from "../src/poseidon_gencontract.js";
import { buildPoseidon } from "../src/poseidon_wasm.js";
import pkg from "hardhat";
import { hexToBytes } from "@noble/hashes/utils";
const { ethers } = pkg;

const assert = chai.assert;
const log = (msg) => {
  if (process.env.MOCHA_VERBOSE) console.log(msg);
};

describe("Poseidon Smart contract test", function () {
  let poseidon;
  let account;
  const poseidonContracts = [];

  this.timeout(100000);

  before(async () => {
    [account] = await ethers.getSigners();
    poseidon = await buildPoseidon();
  });

  it("Should generate bytecode for nInputs 1-16 without throwing", async () => {
    for (let n = 1; n <= 16; n++) {
      assert.doesNotThrow(() => createCode(n));
    }
  });

  it("Should deploy the contracts for nInputs 1-16", async () => {
    const expectedCodeHashes = [
      "0x227ebc4e7647b3151b124b8ee514e4047f7a5852e5184aa5ec40f2c57392dba9",
      "0xfcef48aa1315d9f282f8e0252da54609240688f298b491e887468850a73e1a14",
      "0x4399dcde3631b4c4ef208a00359d1ede462862d509d83d02cc7d2769841a34ec",
      "0x01ea98b6243e70026b251e7add38382590d28b8d8c3615f18d6abd6e0ea45dbf",
      "0x1f4b1c9a9e87396aced2a15e7705ef21791ac03ea8edfafd65dc622c2b3b472b",
      "0x74cbd6bac8f7ea8efdc07ee385545172f44256539c5e001865d23553c87a910d",
      "0x0de49eb46f053e9f6a347c226885b9b278c00c04b6c9ce8400c18f69b7dc2be2",
      "0xd9d2101535b81e8b0634eca81b144c28e2be0bc9f15358b13ca477afb2b78839",
      "0xf1849c11e642a16d51a911034856a51a7a49b3506b75a858d300391acb47be3a",
      "0x0edd639e88b44e4dc99b528b59f580a33a47f8b57c74c57b359efd251eadc651",
      "0x24e7b7ec8cccd766585bc73c0c155accab50d088f956e51e439299063e010489",
      "0xfeba314d9bc1e9162edc0aa608e1b08bcc56055ba9c52818f662984ede84c867",
      "0xa9fa21ce4bc1a75518b21663b837f93018deab9a25a2859f4f1df43bd9eb40ae",
      "0x8e8256f8805493cad03b1f06959c569fbfcc98543774ec2506e12fb20b9737ac",
      "0x1313ab11395e0a8523c2de26a739357dabb9c11999f96a904c044aed16764d07",
      "0x52033963f3026ad9bd929e7c252e1d0e480e03a9d5cc615838ea97cb519eee1a",
    ];

    for (let n = 1; n <= 16; n++) {
      const code = createCode(n);
      const factory = new ethers.ContractFactory(generateABI(n), code, account);
      // Deploy the contract and store the instance in poseidonContracts for later use
      poseidonContracts[n] = await factory.deploy();
      const codeHash = ethers.keccak256(code);
      // Check the code hash match the expected value
      assert.equal(
        codeHash,
        expectedCodeHashes[n - 1],
        `Code hash mismatch for nInputs=${n}`,
      );
    }
  });

  for (let n = 1; n <= 16; n++) {
    it(`Should calculate the poseidon correctly for nInputs=${n} (t=${n + 1})`, async () => {
      const inputs = Array(n)
        .fill(0)
        .map((_, i) => i + 1);
      const res = await poseidonContracts[n][`poseidon(uint256[${n}])`](inputs);
      const res2 = poseidon(inputs);
      assert.equal(res.toString(), poseidon.F.toString(res2));
    });
  }
});
