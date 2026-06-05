// Copyright (c) 2018 Jordi Baylina
// License: LGPL-3.0+
//

import Contract from "./evmasm.js";
import { utils } from "ffjavascript";
const { unstringifyBigInts } = utils;
import {keccak_256} from "@noble/hashes/sha3";
import {bytesToHex, hexToBytes} from '@noble/hashes/utils';
import poseidonConstants from "./poseidon_constants.js";

const { C:K, M } = unstringifyBigInts(poseidonConstants);

const N_ROUNDS_F = 8;
const N_ROUNDS_P = [56, 57, 56, 60, 60, 63, 64, 63, 60, 66, 60, 65, 70, 60, 64, 68];

function toHex256(a) {
    let S = a.toString(16);
    while (S.length < 64) S="0"+S;
    return "0x" + S;
}

export function createCode(nInputs) {

    if ((nInputs < 1) || (nInputs > 16)) throw new Error("Invalid number of inputs. Must be 1<=nInputs<=16");
    const t = nInputs + 1;
    const nRoundsF = N_ROUNDS_F;
    const nRoundsP = N_ROUNDS_P[t - 2];

    const stateOffset    = 0;
    const retAddrOffset  = t * 32;
    const matrixOffset   = (t + 1) * 32;
    const newStateOffset = (t + 1 + t * t) * 32;
    const arkParamSlot   = (t + 1 + t * t + t) * 32;
    const sigmaAddrSlot  = (t + 1 + t * t + t + 1) * 32;
    const kMemOffset     = (t + 1 + t * t + t + 2) * 32;

    const C = new Contract();
    let sigmaCallCount = 0;

    function ark(r) {
        const kBase = kMemOffset + r * t * 32;
        C.push(kBase);
        C.push(arkParamSlot);
        C.mstore();
        const strLabel = "afterArk" + r;
        C._pushLabel(strLabel);
        C.jmp("ark_sub");
        C.label(strLabel);
    }

    function sigma(p) {
        const addr = stateOffset + p * 32;
        C.push(addr);
        C.push(sigmaAddrSlot);
        C.mstore();
        const strLabel = "afterSigma" + (sigmaCallCount++);
        C._pushLabel(strLabel);
        C.jmp("sigma_sub");
        C.label(strLabel);
    }

    function mix() {
        C.label("mix");
        // Stack on entry: [q]; jumps to retAddrOffset after completing

        for (let i = 0; i < t; i++) {
            C.push(0);
            for (let j = 0; j < t; j++) {
                C.dup(1);
                C.push(stateOffset + j * 32);
                C.mload();
                C.push(matrixOffset + (i * t + j) * 32);
                C.mload();
                C.swap(1);
                C.mulmod();
                C.dup(2);
                C.swap(2);
                C.addmod();
            }
            C.push(newStateOffset + i * 32);
            C.mstore();
        }

        // MCOPY newState → state: push(length); push(src); push(dst); mcopy()
        C.push(t * 32);
        C.push(newStateOffset);
        C.push(stateOffset);
        C.mcopy();

        // Jump to return address
        C.push(retAddrOffset);
        C.mload();
        C.jmp();
    }

    function generateArkSubroutine() {
        C.label("ark_sub");
        // Stack on entry: [return_addr, q]
        // memory[arkParamSlot] = kBase for this round
        C.push(0); // i = 0

        C.label("ark_loop");
        // Stack: [i, return_addr, q]
        C.dup(0);
        C.push(t);
        C.gt();      // t > i → i < t
        C.iszero();  // i >= t?
        C.jmpi("ark_loop_end");

        // Compute stateAddr = i*32 (stateOffset = 0)
        C.dup(0);
        C.push(32);
        C.mul();           // [i*32, i, return_addr, q]

        // Load state[i]
        C.dup(0);
        C.mload();         // [s[i], i*32, i, return_addr, q]

        // Load K[i] = memory[kBase + i*32]
        C.push(arkParamSlot);
        C.mload();         // [kBase, s[i], i*32, i, return_addr, q]
        C.dup(2);          // [i*32, kBase, s[i], i*32, i, return_addr, q]
        C.add();           // [kBase+i*32, s[i], i*32, i, return_addr, q]
        C.mload();         // [K, s[i], i*32, i, return_addr, q]

        // addmod(s[i], K, q): stack is [K, s[i], i*32, i, return_addr, q], q at index 5
        C.dup(5);          // [q, K, s[i], i*32, i, return_addr, q]
        C.swap(2);         // [s[i], K, q, i*32, i, return_addr, q]
        C.addmod();        // [(s[i]+K)%q, i*32, i, return_addr, q]

        // Store result: mstore(addr=i*32, value=result)
        C.swap(1);         // [i*32, result, i, return_addr, q]
        C.mstore();        // [i, return_addr, q]

        // Increment and loop
        C.push(1);
        C.add();           // [i+1, return_addr, q]
        C.jmp("ark_loop");

        C.label("ark_loop_end");
        C.pop();           // [return_addr, q]
        C.jmp();           // → caller; stack: [q]
    }

    function generateSigmaSubroutine() {
        C.label("sigma_sub");
        // Stack on entry: [return_addr, q]
        // memory[sigmaAddrSlot] = addr = stateOffset + p*32

        C.push(sigmaAddrSlot);
        C.mload();            // [addr, return_addr, q]
        C.dup(0);
        C.mload();            // [st, addr, return_addr, q]

        // st² = (st * st) % q
        // Stack: [st, addr, return_addr, q], q at index 3
        C.dup(0);             // [st, st, addr, return_addr, q]
        C.dup(4);             // [q, st, st, addr, return_addr, q]
        C.swap(2);            // [st, st, q, addr, return_addr, q]
        C.mulmod();           // [st², addr, return_addr, q]

        // st⁴ = (st² * st²) % q
        // Stack: [st², addr, return_addr, q], q at index 3
        C.dup(0);             // [st², st², addr, return_addr, q]
        C.dup(4);             // [q, st², st², addr, return_addr, q]
        C.swap(2);            // [st², st², q, addr, return_addr, q]
        C.mulmod();           // [st⁴, addr, return_addr, q]

        // Reload st
        // Stack: [st⁴, addr, return_addr, q], addr at index 1
        C.dup(1);             // [addr, st⁴, addr, return_addr, q]
        C.mload();            // [st, st⁴, addr, return_addr, q]

        // st⁵ = (st⁴ * st) % q
        // Stack: [st, st⁴, addr, return_addr, q], q at index 4
        C.swap(1);            // [st⁴, st, addr, return_addr, q]
        C.dup(4);             // [q, st⁴, st, addr, return_addr, q]
        C.swap(2);            // [st, st⁴, q, addr, return_addr, q]
        C.mulmod();           // [st⁵, addr, return_addr, q]

        // Store st⁵
        // Stack: [st⁵, addr, return_addr, q], mstore: TOS=dst addr, second=value
        C.swap(1);            // [addr, st⁵, return_addr, q]
        C.mstore();           // [return_addr, q]
        C.jmp();              // → caller; stack: [q]
    }

    // Check selector
    C.push("0x0100000000000000000000000000000000000000000000000000000000");
    C.push(0);
    C.calldataload();
    C.div();
    C.dup(0);
    C.push("0x"+bytesToHex(keccak_256(`poseidon(uint256[${nInputs}])`).slice(0, 4))); // poseidon(uint256[n])
    C.eq();
    C.swap(1);
    C.push("0x"+bytesToHex(keccak_256(`poseidon(bytes32[${nInputs}])`).slice(0, 4))); // poseidon(bytes32[n])
    C.eq();
    C.or();
    C.jmpi("start");
    C.invalid();

    C.label("start");

    // CODECOPY M matrix to matrixOffset
    C.push(t * t * 32);
    C._pushLabel("M_data_pos");
    C.push(matrixOffset);
    C.codecopy();

    // CODECOPY K constants to kMemOffset
    C.push((nRoundsF + nRoundsP) * t * 32);
    C._pushLabel("K_data_pos");
    C.push(kMemOffset);
    C.codecopy();

    C.push("0x30644e72e131a029b85045b68181585d2833e84879b9709143e1f593f0000001"); // q

    // state[0] = 0 (capacity element)
    C.push(0);
    C.push(stateOffset);
    C.mstore();

    // state[1..nInputs] = calldata inputs
    for (let i = 0; i < nInputs; i++) {
        C.push(0x04 + i * 0x20);
        C.calldataload();
        C.push(stateOffset + (i + 1) * 32);
        C.mstore();
    }

    for (let i = 0; i < nRoundsF + nRoundsP; i++) {
        ark(i);
        if ((i < nRoundsF / 2) || (i >= nRoundsP + nRoundsF / 2)) {
            for (let j = 0; j < t; j++) sigma(j);
        } else {
            sigma(0);
        }
        const strLabel = "afterMix" + i;
        C._pushLabel(strLabel);
        C.push(retAddrOffset);
        C.mstore();
        C.jmp("mix");
        C.label(strLabel);
    }

    // Return state[0] (at memory[0] = stateOffset)
    C.push("0x20");
    C.push("0x00");
    C.return();

    // Subroutines
    mix();
    generateArkSubroutine();
    generateSigmaSubroutine();

    // Data section: M matrix then K constants as raw 32-byte big-endian values
    C.dataLabel("M_data_pos");
    for (let i = 0; i < t; i++) {
        for (let j = 0; j < t; j++) {
            C.pushRawBytes(hexToBytes(toHex256(M[t-2][i][j]).slice(2)));
        }
    }
    C.dataLabel("K_data_pos");
    for (let idx = 0; idx < (nRoundsF + nRoundsP) * t; idx++) {
        C.pushRawBytes(hexToBytes(toHex256(K[t-2][idx]).slice(2)));
    }

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



