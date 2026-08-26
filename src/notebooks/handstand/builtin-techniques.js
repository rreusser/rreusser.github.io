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
// sixty degrees of straight-leg hip flexion and a 1.45 Nm/kg shoulder", and
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
      [1.2838146741736618, 1.8304989305558, 1.814641142613637, 1.3471901543570053, 1.364197091121733, 1.3989230041384784],
      [1.673818155180619, 1.5516464161925814, 1.1062556575334788, 0.27980642925350896, 0.2285544018634484, 0.16020150651682363],
      [0.025782160608555867, 0.05186876826871021, 0.2605680517959133, 0.27236133770163773, -0.29405986236342924, 0.09862350977280676],
      [2.0129478824110465, 0.5615461636746065, -0.3396973857298267, -0.28232717257524964, 0.11835541808952908, 0],
      [-0.11385627696244827, -0.49635300699261176, -1.8816358946867624, -1.8842733906604265, -1.6123596788749488, -0.059137881654876656],
      [2.0483844196454926, 1.8795819573329542, 1.3142527412246354, 2.0397832959963127, 1.5296275737555867, 0],
      [-1.0127129265916974, -0.33456145850936336, -0.28443922034333763, -1.727628016833369, -1.8983291581972535, -0.04644952462844265],
      [-0.2741945248728923, -0.028669078837305694, 0.13866583097945553, 0.4053023550702672, 0.4848049072585471, 0]
    ],
    T: 1.47,
    knotFracs: [0, 0.05248315862785512, 0.19226263297056664, 0.38045974864317544, 0.5903995278143319, 1],
    held: [
      false,
      false,
      false,
      false,
      false,
      true
    ],
    timeHeld: [
      true,
      false,
      false,
      false,
      false,
      true
    ],
    startHeld: false,
    symmetric: false,
    q0: [0, 0.0525, 0, 1.5026787617310016, 1.3852508527694374, 0.2928550126097382, 0.8804370944047674, -0.14095050421262972, 1.6513327771498956, -1.1292252169565378, -0.06635298292499722],
    target: [0, 0.0525, 0, 1.3989230041384784, 0.16020150651682363, 0.09862350977280676, 0, -0.059137881654876656, 0, -0.04644952462844265, 0],
    rom: {
      wristExtMaxDeg: 110,
      wristExtMinDeg: 70,
      shoulderFlexMaxDeg: 170,
      shoulderHyperDeg: 5,
      shoulderCloseMaxDeg: 110,
      hipFlexStraightKneeMaxDeg: 60,
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
        t0Vol: 1.45,
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
      [1.127747325139002, 1.2422959416318682, 1.449675494853664, 1.4800072212845683, 1.5695884813674188, 1.3989230041384784],
      [1.634637297660959, 1.7495781918496078, 0.9960285695508859, 0.2456535798054127, 0.20653675626898557, 0.16020150651682363],
      [0.16822919047952625, 0.26272600833044213, 0.5163986050005208, 0.5841260555205027, 0.022306154791070565, 0.09862350977280676],
      [1.7937836275413228, 1.2628129334653002, -0.18753221915596247, -0.3048814030505063, -0.18570235983952138, 0],
      [-1.2389802229013065, -1.26016262955709, -1.9083613817776905, -2.182802050349523, -1.3676280464607191, -0.059137881654876656],
      [1.862602694532878, 1.9612320327513388, 1.9632546508654334, 2.303192132120988, 2.1407791496468804, 0],
      [-1.3799114257176388, -0.7671512853203538, 0.05015210750872717, -0.15325350192514514, -1.705813668082773, -0.04644952462844265],
      [0.1773806223454773, 0.2911319936737806, 0.37181804885156267, 0.5154563910333799, 0.47548818940997817, 0]
    ],
    T: 1.47,
    knotFracs: [0, 0.024859675407992218, 0.2053615579198785, 0.33382165477559234, 0.604928797592837, 1],
    held: [
      false,
      false,
      false,
      false,
      false,
      true
    ],
    timeHeld: [
      true,
      false,
      false,
      false,
      false,
      true
    ],
    startHeld: false,
    symmetric: false,
    q0: [0, 0.0525, 0, 1.2737032962648238, 1.1772847924697991, 0.6108652381980153, 0.9380631869195871, -1.1568358980425424, 2.163508560612185, -1.0556410892711987, 0.3547535113346659],
    target: [0, 0.0525, 0, 1.3989230041384784, 0.16020150651682363, 0.09862350977280676, 0, -0.059137881654876656, 0, -0.04644952462844265, 0],
    rom: {
      wristExtMaxDeg: 135,
      wristExtMinDeg: 70,
      shoulderFlexMaxDeg: 175,
      shoulderHyperDeg: 5,
      shoulderCloseMaxDeg: 110,
      hipFlexStraightKneeMaxDeg: 130,
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
      [0.8450482441414535, 0.8538601963461386, 0.1975154336648247, 0.1648299621506455],
      [0.5239210123638691, 0.6933374155461154, 0.35396127388864773, 0.04984048845541578],
      [1.7873421641120877, 2.029358370071827, 1.6383843125866142, 0.04292938687180459],
      [-0.15003543550313753, -0.4608119326343978, -0.17740231634187073, 0],
      [1.7873421641120877, 2.029358370071827, 1.6383843125866142, 0.04292938687180459],
      [-0.15003543550313753, -0.4608119326343978, -0.17740231634187073, 0],
      [0.18127463887491618, 0.4584082105999092, 0.16953387028650235, 0]
    ],
    T: 2.341010975151928,
    knotFracs: [0, 0.06990143792502869, 0.6024461952236443, 1],
    held: [
      false,
      false,
      false,
      true
    ],
    timeHeld: [
      true,
      false,
      true,
      true
    ],
    startHeld: false,
    symmetric: true,
    q0: [0, 0.0525, 0, 1.1402640629291003, 0.9278877392960457, 0.6284082661454127, 1.8907711381789962, -0.25659776011197816, 1.8907711381789962, -0.25659776011197816, -0.05557521389227797],
    target: [0, 0.0525, 0, 1.418864422366212, 0.1648299621506455, 0.04984048845541578, 0.04292938687180459, 0, 0.04292938687180459, 0, 0],
    rom: {
      wristExtMaxDeg: 115,
      wristExtMinDeg: 70,
      shoulderFlexMaxDeg: 170,
      shoulderHyperDeg: 5,
      shoulderCloseMaxDeg: 110,
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
    // "tuckup", not "tuck": `tuck` is the name of a SCENARIO -- a start
    // position, sitting in a tuck on the floor -- and this starts from a pike
    // stand like the press does. What is tucked is the way up, not the start.
    key: "tuckup",
    label: "Tuck up",
    format: "handstand-technique",
    version: 2,
    scenario: "pike",
    knots: [
      [1.39903397248331, 1.7894307647742955, 1.7529077845124703, 1.2370026040590478, 1.2387942408651642, 1.418864422366212],
      [1.4765675991598444, 1.3989892990897532, 0.26647410076383105, 0.2629521980437431, 0.1871750876617353, 0.1648299621506455],
      [-0.2710797626444056, 0.28670886128822914, 0.4215947730981865, 0.4363323129985824, -0.2825960299264073, 0.04984048845541578],
      [2.247087455366528, 1.9235098604955696, 1.6386693877301717, 2.4425609193288387, 2.152747604744334, 0.04292938687180459],
      [-2.4171517867356007, -1.4803451593715988, -0.15302060099452447, -2.06931673859885, -2.290839487439213, 0],
      [2.247087455366528, 1.9235098604955696, 1.6386693877301717, 2.4425609193288387, 2.152747604744334, 0.04292938687180459],
      [-2.4171517867356007, -1.4803451593715988, -0.15302060099452447, -2.06931673859885, -2.290839487439213, 0],
      [0.1211944489022735, 0.26127721679115934, 0.25479849987598285, 0.47334036738230006, 0.12867134301314948, 0]
    ],
    T: 1.7145876302225518,
    knotFracs: [0, 0.21040296567107086, 0.23928551891484384, 0.4373313761433488, 0.6910640822292049, 1],
    held: [
      false,
      false,
      false,
      false,
      false,
      true
    ],
    timeHeld: [
      true,
      true,
      false,
      false,
      false,
      true
    ],
    startHeld: false,
    symmetric: true,
    q0: [0, 0.0525, 0, 1.9177179582791375, 1.4912898891343516, 0.3910127980252416, 2.22861294068127, -2.3000939119698547, 2.22861294068127, -2.3000939119698547, 0.0444874879242306],
    target: [0, 0.0525, 0, 1.418864422366212, 0.1648299621506455, 0.04984048845541578, 0.04292938687180459, 0, 0.04292938687180459, 0, 0],
    rom: {
      wristExtMaxDeg: 110,
      wristExtMinDeg: 70,
      shoulderFlexMaxDeg: 170,
      shoulderHyperDeg: 5,
      shoulderCloseMaxDeg: 110,
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
        t0Vol: 1.1,
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
];
