// The techniques the editor opens with, as they were searched.
//
// These are RECORDINGS, and that is a reversal. They used to be derived: a
// hand-authored reference per scenario, rebuilt at load on whatever body and
// anatomy the reader asked about, running on today's plant because it named
// none of its own. The argument for that was good and is worth keeping in
// view -- a recording pins the servo tuning too, so a controller fix cannot
// show through a technique that insists on the old one, and knots describing
// a body the model no longer has are not stale so much as answers to a
// different question.
//
// What changed is what the presets are FOR. A derived preset can only ever be
// "the kick-up, on your body". It cannot be "the kick-up for someone with
// seventy degrees of straight-leg hip flexion and a 1.2 Nm/kg shoulder", and
// that -- the same skill, solved twice for two different bodies -- is the
// thing worth opening the notebook to. The anatomy and the strength are not
// context these carry along; they are the subject. So each one carries its
// own body, its own range of motion, its own strength, its own plant and its
// own integration, and replays on exactly those.
//
// The staleness the old comment warns about is therefore real and is handled
// somewhere else: test/presets-arrive.mjs replays every one of these on the
// body it names and fails if it stops arriving. That gate is what makes a
// recording safe to ship, and it is the reason this file can be data again.
//
// A preset is a technique is a saved case -- one shape, the one
// technique-file.js reads and writes, whether it is recorded here, kept in
// the browser, or loaded from disk. These are literally what Save writes.
export const BUILTIN_TECHNIQUES = [
  {
    key: "lowflex",
    label: "Low flexibility kick-up",
    format: "handstand-technique",
    version: 2,
    scenario: "lunge",
    knots: [
      [1.2609268968990224, 1.5229079575798412, 1.6493335617809104, 1.827676896588587, 1.6018704147867304, 1.3989230041384784],
      [-0.06955630211889888, 0.011126834869235044, 0.022233088693585982, -0.6644371586962329, -0.6631251842905619, 0],
      [0.9771785756274104, 1.2241040232600917, 1.3735887717624053, 0.3781133660868626, 0.25706186971211975, 0.16020150651682363],
      [-0.2582249300648853, -0.1204826371720848, 0.09607560834614404, 0.28708947195965384, -0.27736539121504467, 0.09862350977280676],
      [2.291366459136814, 0.573283978881421, -0.3066123729576392, -0.3490658503988659, 0.4452224968259713, 0],
      [-0.024771080864762353, -0.4851450041219775, -1.5466307918976028, -1.9204565438676033, -1.4455647507517173, -0.059137881654876656],
      [1.6791055399974177, 1.729121104028456, 1.4671956920487077, 0.929691404681524, 0.45610722371793344, 0.27642872654303297],
      [1.9494284332925729, 1.8595507474073742, 1.764066660020705, 1.6781385402828914, 1.0537717590919797, 0],
      [-0.8588314048817921, -0.04106628332508017, -0.2468221239919048, -1.0208977029155735, -0.90780205056611, -0.04644952462844265],
      [0.027072948730257253, 0.005393481803148175, 1.0442616776830478, 1.7360084392941864, 1.060854201258845, 0.22882377977063761],
      [0.3349079679443591, 0.29162222032866264, 0.1454234779112795, 0.4043976438215449, 0.335156295612256, 0]
    ],
    T: 1.2670998564702334,
    knotFracs: [0, 0.07053089628405478, 0.19680474363037223, 0.39681772284881434, 0.6366885268518525, 1],
    held: [false, false, false, false, false, true],
    timeHeld: [true, false, false, false, false, true],
    startHeld: false,
    startGrounded: true,
    symmetric: false,
    q0: [0, 0.0525, 0, 1.4112133037539745, 0.015543513189443157, 1.6083307746196769, 0.2841557484966302, 0.6188731371593454, -0.1734828826923266, 1.8554789954930095, 1.8070838012662627, -1.631765824511443, 1.9164973201648483, 0.33457737239915086, 0, 0.8791589684357741],
    target: [0, 0.0525, 0, 1.3989230041384784, 0, 0.16020150651682363, 0.09862350977280676, 0, -0.059137881654876656, 0.27642872654303297, 0, -0.04644952462844265, 0.22882377977063761, 0, 0, 0],
    rom: {
      wristExtMaxDeg: 110,
      wristExtMinDeg: 70,
      shoulderFlexMaxDeg: 170,
      shoulderHyperDeg: 5,
      shoulderCloseMaxDeg: 110,
      elbowFlexMaxDeg: 145,
      elbowHyperDeg: 5,
      anklePointMaxDeg: 3,
      ankleDorsiMaxDeg: 110,
      toeLiftMaxDeg: 70,
      toePointMaxDeg: 35,
      hipFlexStraightKneeMaxDeg: 70,
      hamstringCouplingPerDeg: 0.6,
      hipFlexAbsMaxDeg: 140,
      hipExtMaxDeg: 20,
      kneeFlexMaxDeg: 145,
      kneeHyperextDeg: 3,
      spineFlexMaxDeg: 17,
      spineExtMaxDeg: 20,
      neckFlexMaxDeg: 30,
      neckExtMaxDeg: 45
    },
    strength: {
      shoulder: {
        t0Vol: 1.2,
        wmax: 18,
        wc: 7,
        amin: 0.7,
        w1: 0,
        m: 0.3
      }
    },
    body: {},
    config: {
      dampingRatio: 2,
      brakeMargin: 0.8,
      dampingSpeed: 0.5,
      romStopDeg: 5,
      inertiaHz: 200,
      romStopZeta: 0.7,
      loopOmegaTau: 2,
      tuckLoadFrac: 0.35,
      tuckKneeDeg: 90,
      kp: 800,
      kd: 60,
      kCom: 2000,
      dCom: 1500,
      activationTau: 0.05,
      mu: 1,
      contactZeta: 1,
      integrator: "si"
    },
    numerics: {
      dt: 0.0002,
      settleT: 2.5
    },
    search: {
      seed: 7,
      maxGen: 240
    },
    cost: null
  },
  {
    key: "highflex",
    label: "High flexibility kick-up",
    format: "handstand-technique",
    version: 2,
    scenario: "lunge",
    knots: [
      [1.8069388312232486, 1.49905935258617, 1.9189342798356435, 1.6643591707207106, 1.3989230041384784],
      [-0.08452652091579102, -0.19565871475812305, -0.431152620489084, -0.1463455774162555, 0],
      [1.3972495073614994, 1.634983195605673, 0.606469577249809, 0.2125803669981747, 0.16020150651682363],
      [0.08556672396126343, 0.33080284119996184, 0.610748419815184, -0.04758747207298313, 0.09862350977280676],
      [1.1542798176495668, 0.7963418829978898, -0.2951406926381378, 0.43480263067978003, 0],
      [-0.5193474160556188, -0.7412146610225162, -1.3515697741659844, -0.6068841626486197, -0.059137881654876656],
      [0.03406359331528171, 0.013687776744206476, 0.35867193872253017, 0.3937149590298253, 0.30462301510665424],
      [2.2158099534283306, 2.0617031437100914, 2.2084479870585105, 1.0900629639738713, 0],
      [-0.903924329931775, -0.39275112263770623, -0.18769866610401348, -0.689651447470146, -0.04644952462844265],
      [1.4353101880810581, 0.564742330384252, 0.09494397305585611, 0.28484763334133856, 0.2626980507511969],
      [0.43898746370737907, 0.4953274497734591, 0.3451535462974971, 0.29408818652406565, 0]
    ],
    T: 1.524365788305153,
    knotFracs: [0, 0.07631128609903647, 0.3311930600017733, 0.6967952577064286, 1],
    held: [false, false, false, false, true],
    timeHeld: [true, false, false, true, true],
    startHeld: false,
    startGrounded: true,
    symmetric: false,
    q0: [0, 0.0525, 0, 1.813189600662851, -0.8151313344926463, 1.4401879454289472, 0.41308779255913414, 0.9095087827947884, -0.5651350875620345, 0.3781082988378951, 2.0204116723669476, -0.7728477473763905, 1.9088164724816892, 0.5009864530408795, 0, 0],
    target: [0, 0.0525, 0, 1.3989230041384784, 0, 0.16020150651682363, 0.09862350977280676, 0, -0.059137881654876656, 0.30462301510665424, 0, -0.04644952462844265, 0.2626980507511969, 0, 0, 0],
    rom: {
      wristExtMaxDeg: 135,
      wristExtMinDeg: 70,
      shoulderFlexMaxDeg: 175,
      shoulderHyperDeg: 5,
      shoulderCloseMaxDeg: 110,
      elbowFlexMaxDeg: 145,
      elbowHyperDeg: 5,
      anklePointMaxDeg: 3,
      ankleDorsiMaxDeg: 110,
      toeLiftMaxDeg: 70,
      toePointMaxDeg: 35,
      hipFlexStraightKneeMaxDeg: 115,
      hamstringCouplingPerDeg: 0.6,
      hipFlexAbsMaxDeg: 140,
      hipExtMaxDeg: 20,
      kneeFlexMaxDeg: 145,
      kneeHyperextDeg: 3,
      spineFlexMaxDeg: 35,
      spineExtMaxDeg: 20,
      neckFlexMaxDeg: 30,
      neckExtMaxDeg: 45
    },
    strength: {
      shoulder: {
        t0Vol: 0.5,
        wmax: 18,
        wc: 7,
        amin: 0.7,
        w1: 0,
        m: 0.3
      }
    },
    body: {},
    config: {
      dampingRatio: 2,
      brakeMargin: 0.8,
      dampingSpeed: 0.5,
      romStopDeg: 5,
      inertiaHz: 200,
      romStopZeta: 0.7,
      loopOmegaTau: 2,
      tuckLoadFrac: 0.35,
      tuckKneeDeg: 90,
      kp: 800,
      kd: 60,
      kCom: 2000,
      dCom: 1500,
      activationTau: 0.05,
      mu: 1,
      contactZeta: 1,
      integrator: "si"
    },
    numerics: {
      dt: 0.0002,
      settleT: 2.5
    },
    search: {
      seed: 7,
      maxGen: 400
    },
    cost: null
  },
  {
    key: "press",
    label: "Press up",
    format: "handstand-technique",
    version: 2,
    scenario: "pike",
    knots: [
      [1.468944227890423, 1.1357641326480659, 1.251058189295032, 1.418864422366212],
      [0, 0, 0, 0],
      [0.8450482441414535, 0.8538601963461386, 0.1975154336648247, 0.1648299621506455],
      [0.5239210123638691, 0.6933374155461154, 0.35396127388864773, 0.04984048845541578],
      [1.7873421641120877, 2.029358370071827, 1.6383843125866142, 0.04292938687180459],
      [-0.15003543550313753, -0.4608119326343978, -0.17740231634187073, 0],
      [1.4733730175759354, 0.982248678383957, 0.4911243391919785, 0],
      [1.7873421641120877, 2.029358370071827, 1.6383843125866142, 0.04292938687180459],
      [-0.15003543550313753, -0.4608119326343978, -0.17740231634187073, 0],
      [1.4733730175759354, 0.982248678383957, 0.4911243391919785, 0],
      [0.18127463887491618, 0.4584082105999092, 0.16953387028650235, 0]
    ],
    T: 2.341010975151928,
    knotFracs: [0, 0.06990143792502869, 0.6024461952236443, 1],
    held: [false, false, false, true],
    timeHeld: [true, false, true, true],
    startHeld: false,
    startGrounded: true,
    symmetric: true,
    q0: [0, 0.053390234314330605, 0, 1.1402640629291003, 0, 0.9278877392960457, 0.6284082661454127, 1.8907711381789962, -0.25659776011197816, 1.4733730175759354, 1.8907711381789962, -0.25659776011197816, 1.4733730175759354, -0.05557521389227797],
    target: [0, 0.0525, 0, 1.418864422366212, 0, 0.1648299621506455, 0.04984048845541578, 0.04292938687180459, 0, 0, 0.04292938687180459, 0, 0, 0],
    rom: {
      wristExtMaxDeg: 115,
      wristExtMinDeg: 70,
      shoulderFlexMaxDeg: 170,
      shoulderHyperDeg: 5,
      shoulderCloseMaxDeg: 110,
      elbowFlexMaxDeg: 145,
      elbowHyperDeg: 5,
      anklePointMaxDeg: 3,
      ankleDorsiMaxDeg: 110,
      hipFlexStraightKneeMaxDeg: 100,
      hamstringCouplingPerDeg: 0.6,
      hipFlexAbsMaxDeg: 140,
      hipExtMaxDeg: 20,
      kneeFlexMaxDeg: 145,
      kneeHyperextDeg: 3,
      spineFlexMaxDeg: 40,
      spineExtMaxDeg: 20,
      neckFlexMaxDeg: 30,
      neckExtMaxDeg: 45
    },
    strength: {
      shoulder: {
        t0Vol: 1.9,
        wmax: 18,
        wc: 7,
        amin: 0.7,
        w1: 0,
        m: 0.3
      }
    },
    body: {},
    config: {
      dampingRatio: 2,
      brakeMargin: 0.8,
      dampingSpeed: 0.5,
      romStopDeg: 5,
      inertiaHz: 200,
      romStopZeta: 0.7,
      loopOmegaTau: 2,
      tuckLoadFrac: 0.35,
      tuckKneeDeg: 90,
      kp: 800,
      kd: 60,
      kCom: 2000,
      dCom: 1500,
      activationTau: 0.05,
      mu: 1,
      contactZeta: 1,
      integrator: "si"
    },
    numerics: {
      dt: 0.0002,
      settleT: 2.5
    },
    search: {
      seed: 7,
      maxGen: 120
    },
    cost: null
  },
  {
    key: "tuckup",
    label: "Tuck up",
    format: "handstand-technique",
    version: 2,
    scenario: "pike",
    knots: [
      [1.460548415274746, 1.5040514341894664, 1.5126576623797519, 1.283548073268681, 1.3402999794938284, 1.418864422366212],
      [-0.05905889923869914, 0.05817883606659994, -0.10319401904663757, -0.262939831243697, -0.23825693333648748, 0],
      [1.5952869889522876, 1.4192457113753947, 0.2552551262165389, 0.2804005818012183, 0.3224488962735525, 0.1648299621506455],
      [-0.3000491880869623, 0.25390653532569873, 0.39973191987716433, 0.3595175262422705, -0.3175105099310252, 0.04984048845541578],
      [2.0374336695757878, 1.7222562215895671, 1.742664612043608, 2.418363043069657, 1.8894224535465745, 0.04292938687180459],
      [-2.3837365848045304, -1.4272802515424716, -0.3371885103460448, -2.2502092023080595, -2.0718808310054633, 0],
      [0.31890187067891845, 0.05672610254038717, 0.5476749581680799, 0.5683896642928863, 0.3376692506399788, 0.32884650944091276],
      [2.0374336695757878, 1.7222562215895671, 1.742664612043608, 2.418363043069657, 1.8894224535465745, 0.04292938687180459],
      [-2.3837365848045304, -1.4272802515424716, -0.3371885103460448, -2.2502092023080595, -2.0718808310054633, 0],
      [0.31890187067891845, 0.05672610254038717, 0.5476749581680799, 0.5683896642928863, 0.3376692506399788, 0.32884650944091276],
      [-0.017628654310266844, 0.29841962589697135, 0.2835748685469713, 0.466913797867005, 0.1648285712563748, 0]
    ],
    T: 1.7145876302225518,
    knotFracs: [0, 0.1644454718669054, 0.19075198524751413, 0.47252434923435316, 0.692255788353447, 1],
    held: [false, false, false, false, false, true],
    timeHeld: [true, false, false, false, false, true],
    startHeld: false,
    startGrounded: true,
    symmetric: true,
    q0: [0, 0.0525, 0, 1.7607280421333733, -0.14341635675471004, 1.787003405308044, 0.18290382742209085, 2.0481691113361173, -2.2869189388874727, 1.9182265912021672, 2.0481691113361173, -2.2869189388874727, 1.9182265912021672, 0.031738780635301826, 0.9033897425417057, 0.8818109211636087],
    target: [0, 0.0525, 0, 1.418864422366212, 0, 0.1648299621506455, 0.04984048845541578, 0.04292938687180459, 0, 0.32884650944091276, 0.04292938687180459, 0, 0.32884650944091276, 0, 0, 0],
    rom: {
      wristExtMaxDeg: 110,
      wristExtMinDeg: 70,
      shoulderFlexMaxDeg: 170,
      shoulderHyperDeg: 5,
      shoulderCloseMaxDeg: 110,
      elbowFlexMaxDeg: 145,
      elbowHyperDeg: 5,
      anklePointMaxDeg: 3,
      ankleDorsiMaxDeg: 110,
      toeLiftMaxDeg: 70,
      toePointMaxDeg: 35,
      hipFlexStraightKneeMaxDeg: 75,
      hamstringCouplingPerDeg: 0.6,
      hipFlexAbsMaxDeg: 140,
      hipExtMaxDeg: 20,
      kneeFlexMaxDeg: 145,
      kneeHyperextDeg: 3,
      spineFlexMaxDeg: 25,
      spineExtMaxDeg: 20,
      neckFlexMaxDeg: 30,
      neckExtMaxDeg: 45
    },
    strength: {
      shoulder: {
        t0Vol: 1,
        wmax: 18,
        wc: 7,
        amin: 0.7,
        w1: 0,
        m: 0.3
      }
    },
    body: {},
    config: {
      dampingRatio: 2,
      brakeMargin: 0.8,
      dampingSpeed: 0.5,
      romStopDeg: 5,
      inertiaHz: 200,
      romStopZeta: 0.7,
      loopOmegaTau: 2,
      tuckLoadFrac: 0.35,
      tuckKneeDeg: 90,
      kp: 800,
      kd: 60,
      kCom: 2000,
      dCom: 1500,
      activationTau: 0.05,
      mu: 1,
      contactZeta: 1,
      integrator: "si"
    },
    numerics: {
      dt: 0.0002,
      settleT: 2.5
    },
    search: {
      seed: 7,
      maxGen: 400
    },
    cost: null
  },
  {
    key: "splits",
    label: "Kick-up to splits",
    format: "handstand-technique",
    version: 2,
    scenario: "lunge",
    knots: [
      [1.010534767188081, 1.2573222695121566, 1.3269238524619118, 1.6213537256354171, 1.5336646584708418, 1.3989230041384784],
      [0.04287483302361409, 0.028469217890266837, 0.012588276478344308, -0.14382111968455, -0.27927340661384037, 0.030117283799968364],
      [1.6204947388411561, 1.734009462128202, 1.1669873003702438, 0.1691733403493669, 0.08765965830591212, 0.16020150651682363],
      [0.1032989008746214, 0.17992565258612708, 0.006200243311345891, 0.37396347742356273, 0.051350601719188364, 0.002407357914921082],
      [2.003544226654079, 0.9726489498508386, 0.648900224151468, -0.26547938218226685, -0.3037977492570362, -0.8581893266422318],
      [-1.0034665375196443, -1.3483786827278452, -2.0238461280450752, -2.4731042737111815, -1.7714151315498299, -1.1473512923880071],
      [0.10777687251554183, 0.03445548853168098, -0.012261766345236791, 0.4115240137902554, 0.1562926992406087, 0],
      [2.1245281816482002, 2.178206990357388, 2.0550773679884813, 2.0087714841118074, 1.6373743094430648, 1.4208679557511377],
      [-1.3784782793500021, -0.7780279230802015, 0.006025251910137559, -0.22181894194123677, -0.3653632531963565, -0.37758125467606596],
      [1.7945914012709827, 1.3629477376451709, 0.8318012165782285, 0.8442297019532772, 0.289053057754754, 0],
      [0.3051064337295065, 0.371617374397929, 0.370980558373121, 0.21834771870885467, 0.2090219087722977, 0]
    ],
    T: 1.0408293789074867,
    knotFracs: [0, 0.09990129253225627, 0.14220722371494293, 0.40678455105681033, 0.7119929290502325, 1],
    held: [false, false, false, false, false, true],
    timeHeld: [true, false, false, false, false, true],
    startHeld: false,
    startGrounded: true,
    symmetric: false,
    q0: [0, 0.0525, 0, 1.2611001372106805, -0.11601983937696655, 1.3840598537604891, 0.5122812689512546, 1.333345605619621, -1.1093484790805608, 0.3396312373686867, 2.070289774156608, -1.213395189964354, 1.9198621771937625, 0.32143274233451535, 0, 0],
    target: [0, 0.0525, 0, 1.3989230041384784, 0.030117283799968364, 0.16020150651682363, 0.002407357914921082, -0.8581893266422318, -1.1473512923880071, 0, 1.4208679557511377, -0.37758125467606596, 0, 0, 0, 0],
    rom: {
      wristExtMaxDeg: 135,
      wristExtMinDeg: 70,
      shoulderFlexMaxDeg: 175,
      shoulderHyperDeg: 5,
      shoulderCloseMaxDeg: 110,
      elbowFlexMaxDeg: 145,
      elbowHyperDeg: 5,
      anklePointMaxDeg: 3,
      ankleDorsiMaxDeg: 110,
      toeLiftMaxDeg: 70,
      toePointMaxDeg: 35,
      hipFlexStraightKneeMaxDeg: 100,
      hamstringCouplingPerDeg: 0.6,
      hipFlexAbsMaxDeg: 140,
      hipExtMaxDeg: 20,
      kneeFlexMaxDeg: 145,
      kneeHyperextDeg: 3,
      spineFlexMaxDeg: 30,
      spineExtMaxDeg: 20,
      neckFlexMaxDeg: 30,
      neckExtMaxDeg: 45
    },
    strength: {
      shoulder: {
        t0Vol: 1,
        wmax: 18,
        wc: 7,
        amin: 0.7,
        w1: 0,
        m: 0.3
      }
    },
    body: {},
    config: {
      dampingRatio: 2,
      brakeMargin: 0.8,
      dampingSpeed: 0.5,
      romStopDeg: 5,
      inertiaHz: 200,
      romStopZeta: 0.7,
      loopOmegaTau: 2,
      tuckLoadFrac: 0.35,
      tuckKneeDeg: 90,
      kp: 800,
      kd: 60,
      kCom: 2000,
      dCom: 1500,
      activationTau: 0.05,
      mu: 1,
      contactZeta: 1,
      integrator: "si"
    },
    numerics: {
      dt: 0.0002,
      settleT: 2.5
    },
    search: {
      seed: 7,
      maxGen: 400
    },
    cost: null
  },
  {
    key: "pikepress",
    label: "Press to pike",
    format: "handstand-technique",
    version: 2,
    scenario: "pike",
    knots: [
      [1.3345432859949906, 1.130335446079145, 1.0998315712250684, 1.2875539279832249],
      [-0.0371445268360802, -0.05491803452630655, -0.12019452647492912, 0],
      [0.9279835000059786, 0.9747805416114363, 0.24749833159461976, 0.1648299621506455],
      [0.4497837245317098, 0.6329311829734482, 0.6132635463476086, 0.04984048845541578],
      [1.7708756291580035, 1.9427164765960105, 2.1813952943797528, 1.5023887076266493],
      [-0.1283587593142414, -0.6087298351391711, -0.743122760384354, 0],
      [1.4579583102113398, 1.5215462583430939, 1.2397085678771915, 0],
      [1.7708756291580035, 1.9427164765960105, 2.1813952943797528, 1.5023887076266493],
      [-0.1283587593142414, -0.6087298351391711, -0.743122760384354, 0],
      [1.4579583102113398, 1.5215462583430939, 1.2397085678771915, 0],
      [0.04817999291911424, 0.3436201983247054, 0.3826318162914267, 0]
    ],
    T: 1.5782411378121104,
    knotFracs: [0, 0.11253568367585155, 0.5375223666166764, 1],
    held: [false, false, false, true],
    timeHeld: [true, false, false, true],
    startHeld: false,
    startGrounded: true,
    symmetric: true,
    q0: [0, 0.0525, 0, 1.2057051250730306, -0.029180756418513934, 0.9678885205905529, 0.6049566027596538, 1.9371203427686627, -0.2314159427328062, 1.5438784664693583, 1.9371203427686627, -0.2314159427328062, 1.5438784664693583, -0.036188544706707584, 0, 0],
    target: [0, 0.0525, 0, 1.2875539279832249, 0, 0.1648299621506455, 0.04984048845541578, 1.5023887076266493, 0, 0, 1.5023887076266493, 0, 0, 0, 0, 0],
    rom: {
      wristExtMaxDeg: 120,
      wristExtMinDeg: 70,
      shoulderFlexMaxDeg: 170,
      shoulderHyperDeg: 5,
      shoulderCloseMaxDeg: 110,
      elbowFlexMaxDeg: 145,
      elbowHyperDeg: 5,
      anklePointMaxDeg: 3,
      ankleDorsiMaxDeg: 110,
      toeLiftMaxDeg: 70,
      toePointMaxDeg: 35,
      hipFlexStraightKneeMaxDeg: 100,
      hamstringCouplingPerDeg: 0.6,
      hipFlexAbsMaxDeg: 140,
      hipExtMaxDeg: 20,
      kneeFlexMaxDeg: 145,
      kneeHyperextDeg: 3,
      spineFlexMaxDeg: 40,
      spineExtMaxDeg: 20,
      neckFlexMaxDeg: 30,
      neckExtMaxDeg: 45
    },
    strength: {
      shoulder: {
        t0Vol: 1.85,
        wmax: 18,
        wc: 7,
        amin: 0.7,
        w1: 0,
        m: 0.3
      }
    },
    body: {},
    config: {
      dampingRatio: 2,
      brakeMargin: 0.8,
      dampingSpeed: 0.5,
      romStopDeg: 5,
      inertiaHz: 200,
      romStopZeta: 0.7,
      loopOmegaTau: 2,
      tuckLoadFrac: 0.35,
      tuckKneeDeg: 90,
      kp: 800,
      kd: 60,
      kCom: 2000,
      dCom: 1500,
      activationTau: 0.05,
      mu: 1,
      contactZeta: 1,
      integrator: "si"
    },
    numerics: {
      dt: 0.0002,
      settleT: 2.5
    },
    search: {
      seed: 7,
      maxGen: 120
    },
    cost: null
  },
];
