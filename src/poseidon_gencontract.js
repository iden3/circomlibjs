// Copyright (c) 2018 Jordi Baylina
// License: LGPL-3.0+
//

import Contract from "./evmasm.js";
import { utils } from "ffjavascript";
const { unstringifyBigInts } = utils;
import { ethers } from "ethers";

import poseidonConstants from "./poseidon_constants.js";


// ONLY for Poseidon3 per starkwares implementation/configs https://github.com/starkware-industries/poseidon
const { C: K, M } = unstringifyBigInts(poseidonConstants);

const N_ROUNDS_F = 8;
const N_ROUNDS_P = [56, 83, 56, 60, 60, 63, 64, 63];

function toHex256(a) {
    let S = a.toString(16);
    while (S.length < 64) S = "0" + S;
    return "0x" + S;
}

export function createCode(nInputs) {

    if ((nInputs != 2)) throw new Error("Invalid number of inputs. Must be 2");
    const t = nInputs + 1;
    const nRoundsF = N_ROUNDS_F;
    const nRoundsP = N_ROUNDS_P[t - 2];

    const C = new Contract();

    function saveM() {
        for (let i = 0; i < t; i++) {
            for (let j = 0; j < t; j++) {
                C.push(toHex256(M[t - 2][i][j]));
                C.push((1 + i * t + j) * 32);
                C.mstore();
            }
        }
    }

    function ark(r) {   // st, q
        for (let i = 0; i < t; i++) {
            C.dup(t); // q, st, q
            C.push(toHex256(K[t - 2][r * t + i]));  // K, q, st, q
            C.dup(2 + i); // st[i], K, q, st, q
            C.addmod(); // newSt[i], st, q
            C.swap(1 + i); // xx, st, q
            C.pop();
        }
    }

    function sigma(p) {
        // st, q
        C.dup(t);   // q, st, q
        C.dup(1 + p); // st[p] , q , st, q
        C.dup(1);   // q, st[p] , q , st, q
        C.dup(1);   // st[p] , q, st[p] , q , st, q
        C.dup(0);   // st[p] , st[p] , q,    st[p] , q , st, q
        C.mulmod(); // st2[p], st[p] , q , st, q
        C.mulmod(); // st3[p], st, q
        C.swap(1 + p);
        C.pop();      // newst, q
    }

    function mix() {
        C.label("mix");
        for (let i = 0; i < t; i++) {
            for (let j = 0; j < t; j++) {
                if (j == 0) {
                    C.dup(i + t);      // q, newSt, oldSt, q
                    C.push((1 + i * t + j) * 32);
                    C.mload();      // M, q, newSt, oldSt, q
                    C.dup(2 + i + j);    // oldSt[j], M, q, newSt, oldSt, q
                    C.mulmod();      // acc, newSt, oldSt, q
                } else {
                    C.dup(1 + i + t);    // q, acc, newSt, oldSt, q
                    C.push((1 + i * t + j) * 32);
                    C.mload();      // M, q, acc, newSt, oldSt, q
                    C.dup(3 + i + j);    // oldSt[j], M, q, acc, newSt, oldSt, q
                    C.mulmod();      // aux, acc, newSt, oldSt, q
                    C.dup(2 + i + t);    // q, aux, acc, newSt, oldSt, q
                    C.swap(2);       // acc, aux, q, newSt, oldSt, q
                    C.addmod();      // acc, newSt, oldSt, q
                }
            }
        }
        for (let i = 0; i < t; i++) {
            C.swap((t - i) + (t - i - 1));
            C.pop();
        }
        C.push(0);
        C.mload();
        C.jmp();
    }


    // Check selector
    C.push("0x0100000000000000000000000000000000000000000000000000000000");
    C.push(0);
    C.calldataload();
    C.div();
    C.dup(0);
    C.push(ethers.utils.keccak256(ethers.utils.toUtf8Bytes(`poseidon(uint256[${nInputs}])`)).slice(0, 10)); // poseidon(uint256[n])
    C.eq();
    C.swap(1);
    C.push(ethers.utils.keccak256(ethers.utils.toUtf8Bytes(`poseidon(bytes32[${nInputs}])`)).slice(0, 10)); // poseidon(bytes32[n])
    C.eq();
    C.or();
    C.jmpi("start");
    C.invalid();

    C.label("start");

    saveM();

    C.push("0x0800000000000011000000000000000000000000000000000000000000000001");  // q

    // Load t values from the call data.
    // The function has a single array param param
    // [Selector (4)] [item1 (32)] [item2 (32)] ....
    // Stack positions 0-nInputs.
    C.push(2); // per starkwares implementation ->    https://github.com/starkware-libs/cairo-lang/blob/12ca9e91bbdc8a423c63280949c7e34382792067/src/starkware/cairo/common/poseidon_hash.py#L31
    for (let i = 0; i < nInputs; i++) {
        C.push(0x04 + (0x20 * (nInputs - i - 1)));
        C.calldataload();
    }


    for (let i = 0; i < nRoundsF + nRoundsP; i++) {
        ark(i);
        if ((i < nRoundsF / 2) || (i >= nRoundsP + nRoundsF / 2)) {
            for (let j = 0; j < t; j++) {
                sigma(j);
            }
        } else {
            sigma(2);
        }
        const strLabel = "aferMix" + i;
        C._pushLabel(strLabel);
        C.push(0);
        C.mstore();
        C.jmp("mix");
        C.label(strLabel);
    }

    C.push("0x00");
    C.mstore();     // Save it to pos 0;
    C.push("0x20");
    C.push("0x00");
    C.return();

    mix();

    return C.createTxData();
}

export function generateABI(nInputs) {
    return [
        {
            "constant": true,
            "inputs": [
                {
                    "internalType": `bytes32[${nInputs}]`,
                    "name": "input",
                    "type": `bytes32[${nInputs}]`
                }
            ],
            "name": "poseidon",
            "outputs": [
                {
                    "internalType": "bytes32",
                    "name": "",
                    "type": "bytes32"
                }
            ],
            "payable": false,
            "stateMutability": "pure",
            "type": "function"
        },
        {
            "constant": true,
            "inputs": [
                {
                    "internalType": `uint256[${nInputs}]`,
                    "name": "input",
                    "type": `uint256[${nInputs}]`
                }
            ],
            "name": "poseidon",
            "outputs": [
                {
                    "internalType": "uint256",
                    "name": "",
                    "type": "uint256"
                }
            ],
            "payable": false,
            "stateMutability": "pure",
            "type": "function"
        }
    ];
}



