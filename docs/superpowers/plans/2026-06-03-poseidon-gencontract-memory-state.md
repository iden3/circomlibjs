# Poseidon Contract Generator — Memory-Based State Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rewrite `src/poseidon_gencontract.js` so that `createCode(nInputs)` works for `nInputs` 1–16 by managing Poseidon state in EVM memory instead of the stack, eliminating the DUP16 bottleneck in `mix()`.

**Architecture:** Move all state reads/writes through MLOAD/MSTORE. The EVM stack holds only `q` (the field prime) throughout computation; no DUP index exceeds 4. Memory layout: state at offset 0, return address at `t×32`, MDS matrix at `(t+1)×32`, new-state temp buffer at `(t+1+t²)×32`. The existing constants in `poseidon_constants.js` already cover t=2..17 — no new constants need to be generated.

**Tech Stack:** Node.js ESM, `src/evmasm.js` (raw EVM bytecode assembler), `ffjavascript`, `@noble/hashes`, Hardhat (tests), Mocha/Chai

---

## Key constants (derive once, use everywhere)

```js
const N_ROUNDS_F = 8;
const N_ROUNDS_P = [56, 57, 56, 60, 60, 63, 64, 63, 60, 66, 60, 65, 70, 60, 64, 68];
// index i → t = i+2 → nInputs = i+1
// Verified: N_ROUNDS_P[i] === C[i].length / (i+2) - 8  for all i
```

Memory offset helpers (all computed from `t = nInputs + 1`):
```js
const stateOffset    = 0;               // state[0..t-1], each 32 bytes
const retAddrOffset  = t * 32;          // return address slot
const matrixOffset   = (t + 1) * 32;   // M[i][j] at matrixOffset + (i*t+j)*32
const newStateOffset = (t + 1 + t*t) * 32;  // temp buffer for mix output
```

---

## File Map

| File | Change |
|---|---|
| `src/poseidon_gencontract.js` | Full rewrite of `createCode()` internals |
| `test/poseidoncontract.js` | Add deploy + correctness tests for nInputs 7–16 |

No other files change. `evmasm.js` and `poseidon_constants.js` are untouched.

---

## Task 1: Extend N_ROUNDS_P and input guard

**Files:**
- Modify: `src/poseidon_gencontract.js:15-25`

- [ ] **Step 1.1 — Write a failing test for createCode(7)**

In `test/poseidoncontract.js`, add a minimal smoke test inside the existing `describe` block. Add it right after the `before` block, before the existing `it` blocks:

```js
it("Should generate bytecode for nInputs 7-16 without throwing", async () => {
    for (let n = 7; n <= 16; n++) {
        assert.doesNotThrow(() => createCode(n), `createCode(${n}) threw`);
    }
});
```

- [ ] **Step 1.2 — Run the test to confirm it fails**

```bash
npm test 2>&1 | grep -A3 "nInputs 7-16"
```

Expected: `AssertionError: createCode(7) threw`

- [ ] **Step 1.3 — Update N_ROUNDS_P and the guard in `poseidon_gencontract.js`**

Replace lines 15-25:

```js
const N_ROUNDS_F = 8;
const N_ROUNDS_P = [56, 57, 56, 60, 60, 63, 64, 63, 60, 66, 60, 65, 70, 60, 64, 68];
```

And update the guard:

```js
if ((nInputs < 1) || (nInputs > 16)) throw new Error("Invalid number of inputs. Must be 1<=nInputs<=16");
```

- [ ] **Step 1.4 — Run the test**

```bash
npm test 2>&1 | grep -A3 "nInputs 7-16"
```

Expected: Still fails (createCode throws inside with Assertion failed from mix() — that's correct, the full rewrite is in Task 2).

---

## Task 2: Rewrite `saveM()` and initial state setup

**Files:**
- Modify: `src/poseidon_gencontract.js`

This task rewrites the two setup routines. The round loop and mix still use the old stack approach (tests will still fail after this task — that's fine).

- [ ] **Step 2.1 — Replace `saveM()` with memory-offset version**

Find and replace the `saveM` function (currently writes to `(1+i*t+j)*32`):

```js
function saveM() {
    for (let i = 0; i < t; i++) {
        for (let j = 0; j < t; j++) {
            C.push(toHex256(M[t-2][i][j]));
            C.push((matrixOffset + (i*t + j) * 32));
            C.mstore();
        }
    }
}
```

Where `matrixOffset` is defined at the top of `createCode()`:

```js
const stateOffset    = 0;
const retAddrOffset  = t * 32;
const matrixOffset   = (t + 1) * 32;
const newStateOffset = (t + 1 + t * t) * 32;
```

- [ ] **Step 2.2 — Replace calldata loading with memory stores**

Find the section that loads calldata onto the stack (currently after `saveM()` and the `q` push). Replace it:

```js
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
```

Remove the old loop and `C.push(0)` (the capacity push).

- [ ] **Step 2.3 — Run tests (expect continued failure — mix not yet rewritten)**

```bash
npm test 2>&1 | grep -E "passing|failing|Assertion"
```

Expected: some tests still fail or error — that's acceptable at this stage.

---

## Task 3: Rewrite `ark()`

**Files:**
- Modify: `src/poseidon_gencontract.js`

- [ ] **Step 3.1 — Replace `ark(r)` with memory-based version**

Find and replace the entire `ark` function:

```js
function ark(r) {
    for (let i = 0; i < t; i++) {
        C.dup(0);                                          // [q, q]
        C.push(stateOffset + i * 32);
        C.mload();                                         // [s[i], q, q]
        C.push(toHex256(K[t-2][r*t+i]));                 // [K, s[i], q, q]
        C.swap(1);                                         // [s[i], K, q, q]
        C.addmod();                                        // [(s[i]+K)%q, q]
        C.push(stateOffset + i * 32);
        C.mstore();                                        // [q]
    }
}
```

Stack invariant entering and leaving `ark`: `[q]`.

- [ ] **Step 3.2 — Run tests (expect continued failure — sigma/mix not yet rewritten)**

```bash
npm test 2>&1 | grep -E "passing|failing"
```

---

## Task 4: Rewrite `sigma()`

**Files:**
- Modify: `src/poseidon_gencontract.js`

- [ ] **Step 4.1 — Replace `sigma(p)` with memory-based version**

Find and replace the entire `sigma` function:

```js
function sigma(p) {
    const addr = stateOffset + p * 32;
    // Stack invariant: [q] in, [q] out
    C.push(addr);
    C.mload();                   // [st, q]
    C.dup(0);                    // [st, st, q]
    C.mulmod();                  // [st², q]   — a=st, b=st, N=q ✓
    C.dup(0);                    // [st², st², q]
    C.mulmod();                  // [st⁴, q]
    C.push(addr);
    C.mload();                   // [st, st⁴, q]
    C.swap(1);                   // [st⁴, st, q]
    C.mulmod();                  // [st⁵, q]
    C.push(addr);
    C.mstore();                  // [q]
}
```

Note: `C.mulmod()` pops (a, b, N) = (TOS, second, third) and pushes (a×b)%N.

- [ ] **Step 4.2 — Run tests (expect continued failure — mix not yet rewritten)**

```bash
npm test 2>&1 | grep -E "passing|failing"
```

---

## Task 5: Rewrite `mix()`

**Files:**
- Modify: `src/poseidon_gencontract.js`

This is the core fix. The new `mix()` reads/writes state from memory; max stack depth is 5.

- [ ] **Step 5.1 — Replace the entire `mix()` function**

Find and replace the entire `mix` function:

```js
function mix() {
    C.label("mix");
    // Stack invariant: [q] in, jumps to return address (stack: [q] at destination)

    // For each output row i: compute dot product sum_j M[i][j]*state[j] mod q
    for (let i = 0; i < t; i++) {
        C.push(0);                                               // acc=0; [0, q]
        for (let j = 0; j < t; j++) {
            // Stack: [acc, q]
            C.dup(1);                                            // [q, acc, q]
            C.push(stateOffset + j * 32);
            C.mload();                                           // [s[j], q, acc, q]
            C.push(matrixOffset + (i * t + j) * 32);
            C.mload();                                           // [M, s[j], q, acc, q]
            C.swap(1);                                           // [s[j], M, q, acc, q]
            C.mulmod();                                          // [prod, acc, q]
            C.addmod();                                          // [new_acc, q]
        }
        C.push(newStateOffset + i * 32);
        C.mstore();                                              // [q]
    }

    // Copy newState buffer → state
    for (let i = 0; i < t; i++) {
        C.push(newStateOffset + i * 32);
        C.mload();                                               // [v, q]
        C.push(stateOffset + i * 32);
        C.mstore();                                              // [q]
    }

    // Jump to saved return address
    C.push(retAddrOffset);
    C.mload();
    C.jmp();
}
```

- [ ] **Step 5.2 — Update the round loop to save return address at `retAddrOffset`**

Find the round loop (the `for (let i=0; i<nRoundsF+nRoundsP; i++)` block). The lines that save the return address currently write to slot 0. Update them to use `retAddrOffset`:

```js
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
```

- [ ] **Step 5.3 — Update the final return block**

`state[0]` is already at `memory[0]` (since `stateOffset = 0`). Replace the final block:

```js
// Return state[0] (already at memory[0])
C.push("0x20");
C.push("0x00");
C.return();
```

Remove the old `C.push("0x00"); C.mstore();` that was before the `return`.

- [ ] **Step 5.4 — Run tests**

```bash
npm test 2>&1 | grep -E "passing|failing|Error"
```

Expected: all 44 existing tests pass. If not, check the stack trace and re-verify the `addmod`/`mulmod` argument order in `mix()`.

- [ ] **Step 5.5 — Commit**

```bash
git add src/poseidon_gencontract.js
git commit -m "refactor: rewrite poseidon contract generator to use memory-based state

Replaces stack-juggling in ark/sigma/mix with MLOAD/MSTORE.
Stack now holds only q throughout; max DUP index is 1.
Extends supported nInputs from 1-6 to 1-16."
```

---

## Task 6: Verify bytecode smoke-test for nInputs 7–16

**Files:**
- Modify: `test/poseidoncontract.js`

- [ ] **Step 6.1 — Check the smoke test added in Task 1 now passes**

```bash
npm test 2>&1 | grep "nInputs 7-16"
```

Expected: `✔ Should generate bytecode for nInputs 7-16 without throwing`

- [ ] **Step 6.2 — Print bytecode sizes (informational)**

```bash
node --input-type=module <<'EOF'
import { createCode } from "./src/poseidon_gencontract.js";
for (let n = 1; n <= 16; n++) {
    const bytes = (createCode(n).length - 2) / 2;
    console.log(`createCode(${n}): ${bytes} bytes`);
}
EOF
```

Record the output — you'll need the bytecode hashes in Task 7.

---

## Task 7: Deploy and correctness tests for nInputs 7–16

**Files:**
- Modify: `test/poseidoncontract.js`

The existing test file deploys nInputs 1–6 and checks hash correctness against the JS Poseidon reference. Extend it for nInputs 7–16.

- [ ] **Step 7.1 — Add contract variables and deploy for nInputs 7–16**

At the top of the `describe` block, add variables alongside the existing ones:

```js
let poseidon7, poseidon8, poseidon9, poseidon10;
let poseidon11, poseidon12, poseidon13, poseidon14, poseidon15, poseidon16;
```

Add a new `it` block for deployment after the existing deploy test:

```js
it("Should deploy contracts for nInputs 7-16", async () => {
    const factories = {};
    for (let n = 7; n <= 16; n++) {
        const code = createCode(n);
        const factory = new ethers.ContractFactory(generateABI(n), code, account);
        factories[n] = factory;
    }
    poseidon7  = await factories[7].deploy();
    poseidon8  = await factories[8].deploy();
    poseidon9  = await factories[9].deploy();
    poseidon10 = await factories[10].deploy();
    poseidon11 = await factories[11].deploy();
    poseidon12 = await factories[12].deploy();
    poseidon13 = await factories[13].deploy();
    poseidon14 = await factories[14].deploy();
    poseidon15 = await factories[15].deploy();
    poseidon16 = await factories[16].deploy();
});
```

- [ ] **Step 7.2 — Add correctness tests for nInputs 7–16**

Add one `it` block per nInputs, each calling the contract and comparing against the JS reference:

```js
it("Should calculate poseidon correctly for nInputs=7 (t=8)", async () => {
    const inputs = [1, 2, 0, 0, 0, 0, 0];
    const res = await poseidon7[`poseidon(uint256[7])`](inputs);
    const res2 = poseidon(inputs);
    assert.equal(res.toString(), poseidon.F.toString(res2));
});

it("Should calculate poseidon correctly for nInputs=8 (t=9)", async () => {
    const inputs = [1, 2, 0, 0, 0, 0, 0, 0];
    const res = await poseidon8[`poseidon(uint256[8])`](inputs);
    const res2 = poseidon(inputs);
    assert.equal(res.toString(), poseidon.F.toString(res2));
});

it("Should calculate poseidon correctly for nInputs=9 (t=10)", async () => {
    const inputs = [1, 2, 0, 0, 0, 0, 0, 0, 0];
    const res = await poseidon9[`poseidon(uint256[9])`](inputs);
    const res2 = poseidon(inputs);
    assert.equal(res.toString(), poseidon.F.toString(res2));
});

it("Should calculate poseidon correctly for nInputs=10 (t=11)", async () => {
    const inputs = [1, 2, 0, 0, 0, 0, 0, 0, 0, 0];
    const res = await poseidon10[`poseidon(uint256[10])`](inputs);
    const res2 = poseidon(inputs);
    assert.equal(res.toString(), poseidon.F.toString(res2));
});

it("Should calculate poseidon correctly for nInputs=11 (t=12)", async () => {
    const inputs = [1, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0];
    const res = await poseidon11[`poseidon(uint256[11])`](inputs);
    const res2 = poseidon(inputs);
    assert.equal(res.toString(), poseidon.F.toString(res2));
});

it("Should calculate poseidon correctly for nInputs=12 (t=13)", async () => {
    const inputs = [1, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
    const res = await poseidon12[`poseidon(uint256[12])`](inputs);
    const res2 = poseidon(inputs);
    assert.equal(res.toString(), poseidon.F.toString(res2));
});

it("Should calculate poseidon correctly for nInputs=13 (t=14)", async () => {
    const inputs = [1, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
    const res = await poseidon13[`poseidon(uint256[13])`](inputs);
    const res2 = poseidon(inputs);
    assert.equal(res.toString(), poseidon.F.toString(res2));
});

it("Should calculate poseidon correctly for nInputs=14 (t=15)", async () => {
    const inputs = [1, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
    const res = await poseidon14[`poseidon(uint256[14])`](inputs);
    const res2 = poseidon(inputs);
    assert.equal(res.toString(), poseidon.F.toString(res2));
});

it("Should calculate poseidon correctly for nInputs=15 (t=16)", async () => {
    const inputs = [1, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
    const res = await poseidon15[`poseidon(uint256[15])`](inputs);
    const res2 = poseidon(inputs);
    assert.equal(res.toString(), poseidon.F.toString(res2));
});

it("Should calculate poseidon correctly for nInputs=16 (t=17)", async () => {
    const inputs = [1, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
    const res = await poseidon16[`poseidon(uint256[16])`](inputs);
    const res2 = poseidon(inputs);
    assert.equal(res.toString(), poseidon.F.toString(res2));
});
```

- [ ] **Step 7.3 — Run full test suite**

```bash
npm test 2>&1 | tail -30
```

Expected: all original 44 tests pass, plus the new deploy test and 10 correctness tests (54 total). If a correctness test fails, the hash output mismatch points to a bug in `ark`, `sigma`, or `mix` for the specific `t` — add a `console.log` of the intermediate state to narrow it down.

- [ ] **Step 7.4 — Commit**

```bash
git add test/poseidoncontract.js
git commit -m "test: add deploy and correctness tests for nInputs 7-16"
```

---

## Task 8: Verify old bytecode hashes are preserved (regression guard)

The existing test in `test/poseidoncontract.js` asserts specific `keccak256` hashes for `createCode(1..6)`. Because the internal bytecode changed, **these hashes will change**. Update the expected hash values.

- [ ] **Step 8.1 — Print the new hashes for nInputs 1–6**

```bash
node --input-type=module <<'EOF'
import { createCode } from "./src/poseidon_gencontract.js";
import { keccak_256 } from "@noble/hashes/sha3";
import { bytesToHex } from "@noble/hashes/utils";
import { hexToBytes } from "@noble/hashes/utils";
for (let n = 1; n <= 6; n++) {
    const code = createCode(n);
    const bytes = hexToBytes(code.slice(2));
    const hash = "0x" + bytesToHex(keccak_256(bytes));
    console.log(`n=${n}: "${hash}"`);
}
EOF
```

- [ ] **Step 8.2 — Update the hash assertions in `test/poseidoncontract.js`**

Replace each `assert.equal(C1CodeHash, "0x...")` through `assert.equal(C6CodeHash, "0x...")` with the values printed in Step 8.1.

- [ ] **Step 8.3 — Run full suite and confirm all pass**

```bash
npm test 2>&1 | tail -10
```

Expected: all tests pass (54+).

- [ ] **Step 8.4 — Final commit**

```bash
git add src/poseidon_gencontract.js test/poseidoncontract.js
git commit -m "fix: update bytecode hash assertions after memory-state rewrite"
```

---

## Debugging reference

If `mulmod` produces wrong results, verify argument order: EVM `MULMOD` pops TOS as `a`, second as `b`, third as `N`, returns `(a×b)%N`.

If `addmod` produces wrong results: EVM `ADDMOD` pops TOS as `a`, second as `b`, third as `N`, returns `(a+b)%N`.

Stack invariant to maintain at all times in the new code: **only `q` lives on the stack**. If any function leaves more than one item, the invariant is broken and subsequent addmod/mulmod will use wrong values.
