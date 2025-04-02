import chai from "chai";
import {createCode, generateABI} from "../src/poseidon_gencontract.js";
import { buildPoseidon } from "../src/poseidon_wasm.js";
import pkg from 'hardhat';
const { ethers } = pkg;

const assert = chai.assert;
const log = (msg) => { if (process.env.MOCHA_VERBOSE) console.log(msg); };

describe("Poseidon Smart contract test", function () {
    let testrpc;
    let web3;
    let poseidon1;
    let poseidon2;
    let poseidon3;
    let poseidon4;
    let poseidon5;
    let poseidon6;
    let poseidon;
    let account;
    this.timeout(100000);

    before(async () => {
        [account] = await ethers.getSigners();
        poseidon = await buildPoseidon();
    });

    it("Should deploy the contract", async () => {
        const C1Code = createCode(1);
        const C1 = new ethers.ContractFactory(
            generateABI(1),
            C1Code,
            account
        );
        const C2Code = createCode(2);
        const C2 = new ethers.ContractFactory(
            generateABI(2),
            C2Code,
            account
        );
        const C3Code = createCode(3);
        const C3 = new ethers.ContractFactory(
            generateABI(3),
            C3Code,
            account
        );
        const C4Code = createCode(4);
        const C4 = new ethers.ContractFactory(
            generateABI(4),
            C4Code,
            account
        );
        const C5Code = createCode(5);
        const C5 = new ethers.ContractFactory(
            generateABI(5),
            C5Code,
            account
        );
        const C6Code = createCode(6);
        const C6 = new ethers.ContractFactory(
            generateABI(6),
            C6Code,
            account
        );

        poseidon1 = await C1.deploy();
        poseidon2 = await C2.deploy();
        poseidon3 = await C3.deploy();
        poseidon4 = await C4.deploy();
        poseidon5 = await C5.deploy();
        poseidon6 = await C6.deploy();

        // Check the code hashes match the expected values
        const C1CodeHash = ethers.keccak256(C1Code);
        const C2CodeHash = ethers.keccak256(C2Code);
        const C3CodeHash = ethers.keccak256(C3Code);
        const C4CodeHash = ethers.keccak256(C4Code);
        const C5CodeHash = ethers.keccak256(C5Code);
        const C6CodeHash = ethers.keccak256(C6Code);
        assert.equal(
            C1CodeHash,
            "0x6086de4ac21c89a98c65d2c8aa22a52018839944302ee65a57d17e6cd05962e3"
        );
        assert.equal(
            C2CodeHash,
            "0x227d73043a7f0d27c6748154ca6eadfc134d3f775ba1500daf07a1e0c342eabc"
        );
        assert.equal(
            C3CodeHash,
            "0x2e1debce261e8d21c6cd2ca10e56f03cc44c3ac0c68e86cfa38359de894fa78e"
        );
        assert.equal(
            C4CodeHash,
            "0x5fc978a5e74c6c2f2585067c7280478d2d4d289e76ea6b721d3a6ffd17b95a0a"
        );
        assert.equal(
            C5CodeHash,
            "0x429fad904244ef14d1018e233617173776442eeae30d3c35fba1d880689d2ade"
        );
        assert.equal(
            C6CodeHash,
            "0x3e7a2a5573a6f467ddbbb010ea85cae64a5ce785a3f6732f8b0216be83b85bde"
        );
    });

    it("Should calculate the poseidon correctly t=2", async () => {
        const res = await poseidon1["poseidon(uint256[1])"]([1]);
        const res2 = poseidon([1]);
        assert.equal(res.toString(), poseidon.F.toString(res2));
    });

    it("Should calculate the poseidon correctly t=3", async () => {
        const res = await poseidon2["poseidon(uint256[2])"]([1, 2]);
        const res2 = poseidon([1, 2]);
        assert.equal(res.toString(), poseidon.F.toString(res2));
    });

    it("Should calculate the poseidon correctly t=4", async () => {
        const res = await poseidon3["poseidon(uint256[3])"]([1, 2, 0]);
        const res2 = poseidon([1, 2, 0]);
        assert.equal(res.toString(), poseidon.F.toString(res2));
    });

    it("Should calculate the poseidon correctly t=5", async () => {
        const res = await poseidon4["poseidon(uint256[4])"]([1, 2, 0, 0]);
        const res2 = poseidon([1, 2, 0, 0]);
        assert.equal(res.toString(), poseidon.F.toString(res2));
    });

    it("Should calculate the poseidon correctly t=6", async () => {
        const res = await poseidon5["poseidon(uint256[5])"]([1, 2, 0, 0, 0]);
        const res2 = poseidon([1, 2, 0, 0, 0]);
        assert.equal(res.toString(), poseidon.F.toString(res2));
    });

    it("Should calculate the poseidon correctly t=7", async () => {
        const res = await poseidon6["poseidon(uint256[6])"]([1, 2, 0, 0, 0, 0]);
        const res2 = poseidon([1, 2, 0, 0, 0, 0]);
        assert.equal(res.toString(), poseidon.F.toString(res2));
    });

});

