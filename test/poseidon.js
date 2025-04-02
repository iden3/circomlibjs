import chai from "chai";
const assert = chai.assert;

import buildPoseidonOpt from "../src/poseidon_opt.js";
import {buildPoseidon as buildPoseidonWasm } from "../src/poseidon_wasm.js";
import buildPoseidonReference from "../src/poseidon_reference.js";

describe("Poseidon test", function () {
    let poseidonOpt;
    let poseidonReference;
    let poseidonWasm;
    this.timeout(10000000);

    before(async () => {
        poseidonOpt = await buildPoseidonOpt();
        poseidonReference = await buildPoseidonReference();
        poseidonWasm = await buildPoseidonWasm();
    });

    it("Should check constrain reference implementation poseidonperm_x5_254_3", async () => {
        const res1 = poseidonReference([1, 2]);
        assert(poseidonReference.F.eq(poseidonReference.F.e("0x115cc0f5e7d690413df64c6b9662e9cf2a3617f2743245519e19607a4417189a"), res1));

        const res2 = poseidonOpt([1,2]);
        assert(poseidonOpt.F.eq(poseidonOpt.F.e("0x115cc0f5e7d690413df64c6b9662e9cf2a3617f2743245519e19607a4417189a"), res2));

        const res3 = poseidonWasm([1,2]);
        assert(poseidonWasm.F.eq(poseidonWasm.F.e("0x115cc0f5e7d690413df64c6b9662e9cf2a3617f2743245519e19607a4417189a"), res3));
    });
    it("Should check constrain reference implementation poseidonperm_x5_254_5", async () => {
        const res1 = poseidonReference([1,2,3,4]);
        assert(poseidonReference.F.eq(poseidonReference.F.e("0x299c867db6c1fdd79dcefa40e4510b9837e60ebb1ce0663dbaa525df65250465"), res1));

        const res2 = poseidonOpt([1,2,3,4]);
        assert(poseidonOpt.F.eq(poseidonOpt.F.e("0x299c867db6c1fdd79dcefa40e4510b9837e60ebb1ce0663dbaa525df65250465"), res2));

        const res3 = poseidonWasm([1,2,3,4]);
        assert(poseidonWasm.F.eq(poseidonWasm.F.e("0x299c867db6c1fdd79dcefa40e4510b9837e60ebb1ce0663dbaa525df65250465"), res3));
    });
    it("Should check state and nOuts", async () => {
        const F = poseidonWasm.F;
        const inp = [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16];
        const st = 0;
        const nOut = 17;
        const res1 = poseidonReference(inp, st, nOut);
        const res2 = poseidonOpt(inp, st, nOut);
        const res3 = poseidonWasm(inp, st, nOut);
        for (let i=0; i<nOut; i++) {
            assert(F.eq(res1[i], res2[i]));
            assert(F.eq(res2[i], res3[i]));
        }
    });
    it("Should check poseidon with 16 inputs", async () => {
        const testvectors = [
            {
                inputs: [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16],
                expected: "9989051620750914585850546081941653841776809718687451684622678807385399211877"
            },
            {
                inputs: [1,2,3,4,5,6,7,8,9,0,0,0,0,0,0,0],
                expected: "11882816200654282475720830292386643970958445617880627439994635298904836126497"
            },
        ];

        for (let i=0; i<testvectors.length; i++) {
            const res1 = poseidonReference(testvectors[i].inputs);
            assert(poseidonReference.F.eq(poseidonReference.F.e(testvectors[i].expected), res1));

            const res2 = poseidonOpt(testvectors[i].inputs);
            assert(poseidonOpt.F.eq(poseidonOpt.F.e(testvectors[i].expected), res2));

            const res3 = poseidonWasm(testvectors[i].inputs);
            assert(poseidonWasm.F.eq(poseidonWasm.F.e(testvectors[i].expected), res3));
        }
    });

    it("Should check poseidon with init state", async () => {

        const testvectors = [
            {
                inputs: [1,2,3,4,5,6],
                initState: 0,
                expected: "20400040500897583745843009878988256314335038853985262692600694741116813247201"
            },
            {
                inputs: [1,2,3,4],
                initState: 7,
                expected: "1569211601569591254857354699102545060324851338714426496554851741114291465006"
            },
            {
                inputs: [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16],
                initState: 17,
                expected: "7865037705064445207187340054656830232157001572238023180016026650118519857086"
            },
        ];

        for (let i=0; i<testvectors.length; i++) {
            const res1 = poseidonReference(testvectors[i].inputs, testvectors[i].initState);
            assert(poseidonReference.F.eq(poseidonReference.F.e(testvectors[i].expected), res1));

            const res2 = poseidonOpt(testvectors[i].inputs, testvectors[i].initState);
            assert(poseidonOpt.F.eq(poseidonOpt.F.e(testvectors[i].expected), res2));

            const res3 = poseidonWasm(testvectors[i].inputs, testvectors[i].initState);
            assert(poseidonWasm.F.eq(poseidonWasm.F.e(testvectors[i].expected), res3));
        }
    });

    it("Should check poseidon with n outputs", async () => {

        const testvectors = [
            {
                inputs: [1],
                initState: 0,
                nOut: 1,
                expected: [
                    "18586133768512220936620570745912940619677854269274689475585506675881198879027"
                ]
            },
            {
                inputs: [1, 2],
                initState: 0,
                nOut: 2,
                expected: [
                    "7853200120776062878684798364095072458815029376092732009249414926327459813530",
                    "7142104613055408817911962100316808866448378443474503659992478482890339429929"
                ]
            },
            {
                inputs: [1, 2, 0, 0, 0],
                initState: 0,
                nOut: 3,
                expected: [
                    "1018317224307729531995786483840663576608797660851238720571059489595066344487",
                    "1268987460374965117190107941866588409937190018195924754936306024116268626868",
                    "8783366202813713093021184624438037804022412226788318946130389248546914776762"
                ]
            },
            {
                inputs: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16],
                initState: 0,
                nOut: 11,
                expected: [
                    "9989051620750914585850546081941653841776809718687451684622678807385399211877",
                    "8319791455060392555425392842391403897548969645190976863995973180967774875286",
                    "21636406227810893698117978732800647815305553312233448361627674958309476058692",
                    "5858261170370825589990804751061473291946977191299454947182890419569833191564",
                    "9379453522659079974536893534601645512603628658741037060370899250203068088821",
                    "473570682425071423656832074606161521036781375454126861176650950315985887926",
                    "6579803930273263668667567320853266118141819373699554146671374489258288008348",
                    "19782381913414087710766737863494215505205430771941455097533197858199467016164",
                    "16057750626779488870446366989248320873718232843994532204040561017822304578116",
                    "18984357576272539606133217260692170661113104846539835604742079547853774113837",
                    "6999414602732066348339779277600222355871064730107676749892229157577448591106"
                ]
            },
            {
                inputs: [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16],
                initState: 17,
                nOut: 16,
                expected: [
                    "7865037705064445207187340054656830232157001572238023180016026650118519857086",
                    "9292383997006336854008325030029058442489692927472584277596649832441082093099",
                    "21700625464938935909463291795162623951575229166945244593449711331894544619498",
                    "1749964961100464837642084889776091157070407086051097880220367435814831060919",
                    "14926884742736943105557530036865339747160219875259470496706517357951967126770",
                    "2039691552066237153485547245250552033884196017621501609319319339955236135906",
                    "15632370980418377873678240526508190824831030254352022226082241110936555130543",
                    "12415717486933552680955550946925876656737401305417786097937904386023163034597",
                    "19518791782429957526810500613963817986723905805167983704284231822835104039583",
                    "3946357499058599914103088366834769377007694643795968939540941315474973940815",
                    "5618081863604788554613937982328324792980580854673130938690864738082655170455",
                    "9119013501536010391475078939286676645280972023937320238963975266387024327421",
                    "8377736769906336164136520530350338558030826788688113957410934156526990238336",
                    "15295058061474937220002017533551270394267030149562824985607747654793981405060",
                    "3767094797637425204201844274463024412131937665868967358407323347727519975724",
                    "11046361685833871233801453306150294246339755171874771935347992312124050338976"
                ]
            },

        ];

        for (let i = 0; i < testvectors.length; i++) {
            const res1 = poseidonReference(testvectors[i].inputs, testvectors[i].initState, testvectors[i].nOut);
            if (testvectors[i].nOut === 1) {
                assert(poseidonReference.F.eq(poseidonReference.F.e(testvectors[i].expected[0]), res1));
            } else {
                for (let j = 0; j < testvectors[i].nOut; j++) {
                    assert(poseidonReference.F.eq(poseidonReference.F.e(testvectors[i].expected[j]), res1[j]));
                }
            }

            const res2 = poseidonOpt(testvectors[i].inputs, testvectors[i].initState, testvectors[i].nOut);
            if (testvectors[i].nOut === 1) {
                assert(poseidonOpt.F.eq(poseidonOpt.F.e(testvectors[i].expected[0]), res2));
            } else {
                for (let j = 0; j < testvectors[i].nOut; j++) {
                    assert(poseidonOpt.F.eq(poseidonOpt.F.e(testvectors[i].expected[j]), res2[j]));
                }
            }

            const res3 = poseidonWasm(testvectors[i].inputs, testvectors[i].initState, testvectors[i].nOut);
            if (testvectors[i].nOut === 1) {
                assert(poseidonWasm.F.eq(poseidonWasm.F.e(testvectors[i].expected[0]), res3));
            } else {
                for (let j = 0; j < testvectors[i].nOut; j++) {
                    assert(poseidonWasm.F.eq(poseidonWasm.F.e(testvectors[i].expected[j]), res3[j]));
                }
            }
        }
    });
});
