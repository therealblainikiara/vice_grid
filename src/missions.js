// missions.js — campaign structure and mission definitions.
// Map legend: # wall, . floor, , sidewalk, c crate (destructible cover),
// s shelf (destructible), P player spawn, E enemy, H heavy enemy, B boss,
// C civilian, V evidence, w weapon pickup, m medkit, ~ road, D door (open).

export const AGENTS = {
  rhino: {
    key: 'rhino', name: 'RHINO', fullName: 'Marta "Rhino" Okafor',
    maxHp: 150, armor: 0.25, speed: 170, stability: 0.8, cuffSpeed: 1.0,
    intimidation: 0.6, dodgeTime: 0.28, dodgeSpeed: 420, dodgeStagger: true,
    color: '#31d3ff',
    blurb: 'Heavy armour. Rock-steady aim. Shoves crowds and heavy props.',
  },
  viper: {
    key: 'viper', name: 'VIPER', fullName: 'Dez "Viper" Calloway',
    maxHp: 100, armor: 0, speed: 235, stability: 0.25, cuffSpeed: 1.4,
    intimidation: 1.0, dodgeTime: 0.42, dodgeSpeed: 520, dodgeStagger: false,
    color: '#ff4fd8',
    blurb: 'Fast. Evasive. Cuffs suspects 40% faster and reads the street.',
  },
};

export const ENEMY_TYPES = {
  lookout:  { hp: 40,  speed: 150, weapon: 'pistol',  personality: 'coward', color: '#9dff57', score: 'gunman' },
  soldier:  { hp: 60,  speed: 140, weapon: 'pistol',  personality: 'timid',  color: '#6dff3a', score: 'gunman' },
  dealer:   { hp: 55,  speed: 150, weapon: 'smg',     personality: 'sly',    color: '#4be82f', score: 'gunman' },
  bruiser:  { hp: 110, speed: 115, weapon: 'shotgun', personality: 'hard',   color: '#2fbf2f', score: 'gunman', armor: 0.15 },
  bouncer:  { hp: 95,  speed: 185, weapon: 'baton',   personality: 'hard',   color: '#3fe8a0', score: 'gunman', armor: 0.1 },
  vipguard: { hp: 70,  speed: 150, weapon: 'smg',     personality: 'sly',    color: '#57ffce', score: 'gunman' },
  // Bosses
  chromedog:{ hp: 420, speed: 130, weapon: 'shotgun', personality: 'hard',   color: '#c8ff2f', score: 'boss', armor: 0.3, boss: true },
  midnight: { hp: 300, speed: 165, weapon: 'smg',     personality: 'sly',    color: '#b06cff', score: 'boss', armor: 0.2, boss: true },
  tread:    { hp: 380, speed: 145, weapon: 'shotgun', personality: 'hard',   color: '#ffb04f', score: 'boss', armor: 0.25, boss: true },
  stacks:   { hp: 520, speed: 120, weapon: 'stormcaster', personality: 'hard', color: '#ffd94f', score: 'boss', armor: 0.35, boss: true },
};

// Full campaign skeleton. `implemented` gates mission select during development;
// the release build requires every entry to be true (validated by tools/validate.js).
export const CAMPAIGN = [
  { id: 'm01', act: 1, n: 1, title: 'Store Siege', type: 'main', implemented: true },
  { id: 'm02', act: 1, n: 2, title: 'Club Neon Raid', type: 'main', implemented: true },
  { id: 'm03', act: 1, n: 3, title: 'Highway Glow Run', type: 'main', implemented: true },
  { id: 'm04', act: 1, n: 4, title: 'Warehouse Intercept', type: 'main', implemented: true },
  { id: 'op1', act: 1, n: 0, title: 'OP: Corner Sweep', type: 'op', implemented: false },
  { id: 'op2', act: 1, n: 0, title: 'OP: Glow Courier', type: 'op', implemented: false },
  { id: 'm05', act: 2, n: 5, title: 'Port of Cobalt', type: 'main', implemented: false },
  { id: 'm06', act: 2, n: 6, title: 'Tower Block Evac', type: 'main', implemented: false },
  { id: 'm07', act: 2, n: 7, title: 'Convoy Takedown', type: 'main', implemented: false },
  { id: 'm08', act: 2, n: 8, title: 'The Glow Kitchen', type: 'main', implemented: false },
  { id: 'op3', act: 2, n: 0, title: 'OP: Dockside Score Attack', type: 'op', implemented: false },
  { id: 'op4', act: 2, n: 0, title: 'OP: Witness Escort', type: 'op', implemented: false },
  { id: 'm09', act: 3, n: 9, title: 'Precinct Siege', type: 'main', implemented: false },
  { id: 'm10', act: 3, n: 10, title: 'Evidence Run', type: 'main', implemented: false },
  { id: 'm11', act: 3, n: 11, title: 'Blackout', type: 'main', implemented: false },
  { id: 'm12', act: 3, n: 12, title: 'Signal Tower', type: 'main', implemented: false },
  { id: 'op5', act: 3, n: 0, title: 'OP: Rooftop Sweep', type: 'op', implemented: false },
  { id: 'op6', act: 3, n: 0, title: 'OP: Riot Line', type: 'op', implemented: false },
  { id: 'm13', act: 4, n: 13, title: 'The Rig', type: 'main', implemented: false },
  { id: 'm14', act: 4, n: 14, title: 'Halcyon HQ', type: 'main', implemented: false },
  { id: 'm15', act: 4, n: 15, title: 'City on Fire', type: 'main', implemented: false },
  { id: 'm16', act: 4, n: 16, title: 'The Penthouse Grid', type: 'main', implemented: false },
  { id: 'op7', act: 4, n: 0, title: 'OP: Halcyon Records', type: 'op', implemented: false },
  { id: 'op8', act: 4, n: 0, title: 'OP: Final Score Attack', type: 'op', implemented: false },
];

export const MISSIONS = {
  m01: {
    id: 'm01',
    title: 'M01 — STORE SIEGE',
    parSec: 420,
    briefing: {
      speaker: 'DISPATCH',
      lines: [
        'Glowline crew hit the QuickCell on 9th and Marrow. Hostiles inside, civilians pinned in the aisles.',
        'This is a snatch-and-burn: they want the register chips AND the security ledger. That ledger is evidence — recover it.',
        'Take suspects alive where you can, Grid. Every cuff is a name, and names climb ladders.',
        'Watch for their cleanup man. Big unit. Calls himself CHROME DOG.',
      ],
    },
    debriefWin: {
      speaker: 'DISPATCH',
      lines: [
        'QuickCell secure. Civilians are shaken but breathing — mostly thanks to you.',
        'The ledger names a middleman at Club Neon. That is your next stop.',
      ],
    },
    debriefLose: { speaker: 'DISPATCH', lines: ['Grid, we lost the scene. Reset and go again — those people need you.'] },
    objectives: [
      { id: 'clear', label: 'Neutralize the Glowline crew', primary: true, type: 'neutralize', count: 8, tag: 'gunman' },
      { id: 'boss', label: 'Stop CHROME DOG', primary: true, type: 'boss' },
      { id: 'cuffs', label: 'Optional: Arrest 3 suspects', primary: false, type: 'arrest', count: 3 },
      { id: 'civs', label: 'Optional: No civilian casualties', primary: false, type: 'protect', count: 0 },
      { id: 'ledger', label: 'Optional: Recover the ledger + register chips', primary: false, type: 'evidence', count: 2 },
    ],
    escalation: {
      at: 4, // after 4 gunmen neutralized
      banner: 'GLOWLINE REINFORCEMENTS INBOUND',
      spawns: [
        { type: 'dealer', x: 2, y: 2 }, { type: 'soldier', x: 3, y: 2 },
        { type: 'bruiser', x: 26, y: 2 }, { type: 'dealer', x: 25, y: 2 },
      ],
    },
    boss: {
      type: 'chromedog', x: 24, y: 4, name: 'CHROME DOG',
      intro: 'CHROME DOG: "You broke my crew\'s teeth. Let\'s see yours."',
      // Phase 2 at 50% hp: faster, calls two guards, throws pressure.
      phase2At: 0.5, phase2Banner: 'CHROME DOG IS OFF THE LEASH',
      phase2Spawns: [{ type: 'soldier', x: 22, y: 3 }, { type: 'dealer', x: 26, y: 6 }],
      // Below 15% hp with no allies left he can surrender -> arrest outcome.
      surrenderAt: 0.15,
    },
    map: [
      '############################',
      '#..w.....,,......V.....m...#',
      '#..c..E..,,..s.s.s.s...E...#',
      '#.....C..,,..s.E.s.s...c...#',
      '#..E.....,,....C...........#',
      '#,,,,,,,,,,..s.s.s.s...E...#',
      '#,,,,,,,,,,..s.C.s.s.......#',
      '#....c...,,................#',
      '#..C.....,,....E......c....#',
      '#~~~~~~~~~~~~~~~~~~~~~~~~~~#',
      '#~~~~~~~~~~~~~~~~~~~~~~~~~~#',
      '#....c......,,.......c.....#',
      '#...E.......,,...C.....E...#',
      '#..V........,,.............#',
      '#.....C.....,,....w........#',
      '#..P........,,.........p...#',
      '############################',
    ],
  },
};

MISSIONS.m02 = {
  id: 'm02',
  title: 'M02 — CLUB NEON RAID',
  parSec: 480,
  briefing: {
    speaker: 'DISPATCH',
    lines: [
      'The QuickCell ledger points at Club Neon — Glowline launders GLOW money through the bar and sells product out of the VIP rooms.',
      'The middleman runs the place from the back office. Calls himself MIDNIGHT. Smooth type. Do not trust his hands when they go up.',
      'The club is packed with civilians on the dance floor. Watch your lanes and your muzzle.',
      'Two evidence targets: the blackmail drive in the office, and the counting-room cash in VIP. Bring me both and Act One cracks open.',
    ],
  },
  debriefWin: {
    speaker: 'DISPATCH',
    lines: [
      'Club Neon is dark and the music is finally off. The crowd walked out on their own feet.',
      'MIDNIGHT\'s books point upstream — a shipment coming in hot on the expressway. Get some sleep in the car.',
    ],
  },
  debriefLose: { speaker: 'DISPATCH', lines: ['The club swallowed you. Reset, breathe, and hit it again — quieter this time.'] },
  objectives: [
    { id: 'clear', label: 'Neutralize the club crew', primary: true, type: 'neutralize', count: 9, tag: 'gunman' },
    { id: 'boss', label: 'Take down MIDNIGHT', primary: true, type: 'boss' },
    { id: 'cuffs', label: 'Optional: Arrest 4 suspects', primary: false, type: 'arrest', count: 4 },
    { id: 'civs', label: 'Optional: Keep the crowd safe (1 strike allowed)', primary: false, type: 'protect', count: 1 },
    { id: 'ledger', label: 'Optional: Seize the drive + the counting-room cash', primary: false, type: 'evidence', count: 2 },
  ],
  escalation: {
    at: 5,
    banner: 'BOUNCERS OFF THE CHAIN',
    spawns: [
      { type: 'bouncer', x: 5, y: 14 }, { type: 'bouncer', x: 6, y: 14 },
      { type: 'bouncer', x: 24, y: 14 }, { type: 'bouncer', x: 23, y: 14 },
    ],
  },
  boss: {
    type: 'midnight', x: 15, y: 2, name: 'MIDNIGHT',
    intro: 'MIDNIGHT: "Badges in my club. Somebody queue the last song."',
    phase2At: 0.5, phase2Banner: 'MIDNIGHT CALLS THE FLOOR',
    phase2Spawns: [{ type: 'bouncer', x: 5, y: 13 }, { type: 'vipguard', x: 24, y: 13 }],
    surrenderAt: 0.2,
  },
  map: [
    '##############################',
    '#..E......#....V.....#....E..#',
    '#.c....m..#..........#..w....#',
    '#.....E...#....E.....#..E....#',
    '####.######...###.####....####',
    '#..s.s.s..................C..#',
    '#..C......ddddddddd..........#',
    '#.E.......ddddddddd......E...#',
    '#..s.s.s..ddCddCddd..........#',
    '#.........ddddddddd....####.##',
    '#..C.E....ddddddddd....#.V...#',
    '#..s.s.s..................E..#',
    '#.........C.....C....p.#.....#',
    '#####.##################.#####',
    '#,,,,,,,,,,,,,,,,,,,,,,,,,,,,#',
    '#,,P,,,,,,,,,,,,,,,,,,,,,C,,,#',
    '#~~~~~~~~~~~~~~~~~~~~~~~~~~~~#',
    '##############################',
  ],
};

// m03: an expressway built programmatically — 128 tiles of eastbound pursuit.
const HW_COLS = 128;
function hwRow(fill, decorate = null) {
  let s = '';
  for (let x = 0; x < HW_COLS; x++) {
    if (x === 0 || x === HW_COLS - 1) { s += '#'; continue; }
    s += decorate?.(x) ?? fill;
  }
  return s;
}

MISSIONS.m03 = {
  id: 'm03',
  title: 'M03 — HIGHWAY GLOW RUN',
  parSec: 300,
  playerVehicle: { type: 'patrol', x: 4, y: 12 },
  vehicles: [
    { type: 'gangcar', x: 22, y: 9,  tag: 'escort', ai: 'escort', cruise: 250 },
    { type: 'gangcar', x: 26, y: 11, tag: 'escort', ai: 'escort', cruise: 250 },
    { type: 'gangcar', x: 30, y: 10, tag: 'escort', ai: 'escort', cruise: 250 },
    { type: 'truck',   x: 34, y: 10, tag: 'truck',  ai: 'convoy', cruise: 175 },
  ],
  traffic: { rows: [3, 5, 9, 11], eastRows: [9, 11], rate: 2.2, max: 7 },
  civilianBaseline: 10,
  briefing: {
    speaker: 'DISPATCH',
    lines: [
      'MIDNIGHT\'s books flagged tonight\'s shipment: a hauler full of raw GLOW heading for the city limits on the Cobalt Expressway.',
      'You have the interceptor. Escort runners will try to box you out — shoot their engines or run them off the road.',
      'Stop that truck before the limits, Grid. If it crosses, the network scatters and Act One goes cold.',
      'The wheelman is a Glowline legend called TREAD. When the hauler stops, he will not come out friendly.',
    ],
  },
  debriefWin: {
    speaker: 'DISPATCH',
    lines: [
      'Shipment secured on the shoulder. Traffic units are picking up the runners you left cuffed on the asphalt.',
      'That hauler was heading for a warehouse on the pier. One more door and Act One is closed.',
    ],
  },
  debriefLose: { speaker: 'DISPATCH', lines: ['The expressway ate the pursuit. Rewind it and drive cleaner.'] },
  objectives: [
    { id: 'clear', label: 'Disable the escort runners', primary: true, type: 'neutralize', count: 3, tag: 'escort' },
    { id: 'boss', label: 'Stop the hauler and take down TREAD', primary: true, type: 'boss' },
    { id: 'cuffs', label: 'Optional: Arrest 2 suspects', primary: false, type: 'arrest', count: 2 },
    { id: 'civs', label: 'Optional: Keep commuters out of it (1 strike allowed)', primary: false, type: 'protect', count: 1 },
    { id: 'gate', label: 'Optional: Catch the convoy before the interchange', primary: false, type: 'reach', tag: 'gate' },
  ],
  escalation: {
    at: 2,
    banner: 'GLOWLINE OUTRIDERS INBOUND',
    spawns: [],
    vehicles: [
      { type: 'gangbike', x: 8, y: 9,  tag: 'outrider', ai: 'escort', cruise: 320 },
      { type: 'gangbike', x: 8, y: 11, tag: 'outrider', ai: 'escort', cruise: 320 },
    ],
  },
  boss: {
    type: 'tread', x: 96, y: 10, trigger: 'truck', name: 'TREAD',
    intro: 'TREAD: "You scratched my hauler. I\'m going to fold your little car in half."',
    phase2At: 0.5, phase2Banner: 'TREAD TEARS OFF THE DOOR PANEL',
    phase2Spawns: [],
    surrenderAt: 0.25,
  },
  map: [
    hwRow('#'),
    hwRow(','),
    hwRow(','),
    hwRow('~'),                                   // westbound lanes 3-6
    hwRow('~'),
    hwRow('~'),
    hwRow('~'),
    hwRow('=', (x) => (x % 14 === 0 ? '~' : '=')), // median with gaps
    hwRow('~'),                                   // eastbound lanes 8-12
    hwRow('~'),
    hwRow('~', (x) => (x === 100 ? 'X' : '~')),   // interchange gate
    hwRow('~'),
    hwRow('~', (x) => (x === 4 ? 'P' : '~')),
    hwRow(','),
    hwRow(',', (x) => (x % 23 === 0 ? 'c' : ',')),
    hwRow('#'),
  ],
};

MISSIONS.m04 = {
  id: 'm04',
  title: 'M04 — WAREHOUSE INTERCEPT',
  parSec: 540,
  briefing: {
    speaker: 'DISPATCH',
    lines: [
      'TREAD\'s hauler was bound for Pier 9 — a bonded warehouse Glowline runs as their Act One counting house.',
      'Everything they salvaged this week is inside: product, cash, and the shipping ledger that maps the whole network upstream.',
      'The floor chief calls himself BIG STACKS. He inherited an experimental Halcyon riot gun. Do not stand in front of it.',
      'Dock workers are still on shift. Clear the floor, keep them breathing, and close out Act One properly: with names on warrants.',
    ],
  },
  debriefWin: {
    speaker: 'DISPATCH',
    lines: [
      'Pier 9 is ours. The shipping ledger names the Port of Cobalt intake crew — that is Act Two, Grid.',
      'Whatever Halcyon is doing selling riot guns to dealers, we now have one in an evidence bag.',
    ],
  },
  debriefLose: { speaker: 'DISPATCH', lines: ['The counting house held. Regroup and take the pier back.'] },
  objectives: [
    { id: 'clear', label: 'Neutralize the warehouse crew', primary: true, type: 'neutralize', count: 10, tag: 'gunman' },
    { id: 'boss', label: 'Take down BIG STACKS', primary: true, type: 'boss' },
    { id: 'cuffs', label: 'Optional: Arrest 4 suspects', primary: false, type: 'arrest', count: 4 },
    { id: 'civs', label: 'Optional: No dock workers harmed', primary: false, type: 'protect', count: 0 },
    { id: 'ledger', label: 'Optional: Seize the ledger + the cash pallet', primary: false, type: 'evidence', count: 2 },
  ],
  escalation: {
    at: 5,
    banner: 'GLOWLINE VAN CRASHES THE DOCK',
    spawns: [
      { type: 'bruiser', x: 3, y: 16 }, { type: 'dealer', x: 4, y: 16 },
      { type: 'soldier', x: 30, y: 16 }, { type: 'dealer', x: 29, y: 16 },
    ],
  },
  boss: {
    type: 'stacks', x: 17, y: 3, name: 'BIG STACKS',
    intro: 'BIG STACKS: "You know how much inventory you just cost me? I\'m taking it out of your hide."',
    phase2At: 0.5, phase2Banner: 'BIG STACKS BURIES THE AISLES',
    phase2Spawns: [{ type: 'bruiser', x: 14, y: 5 }, { type: 'bruiser', x: 20, y: 5 }],
    surrenderAt: 0.12,
  },
  map: [
    '##################################',
    '#..V......#............#....m....#',
    '#..c.c....#..E......E..#..c.c.E..#',
    '#.....E...#............#.........#',
    '#####.##########..##########.####'.padEnd(34, '#'),
    '#........................E.......#',
    '#..c.c.c.c..E...c.c.c.c......C...#',
    '#................................#',
    '#..c.c.c.c....E.c.c.c.c...E...S..#',
    '#.....E..........................#',
    '#..c.c.c.c......c.c.c.c..E.......#',
    '#...C............................#',
    '#..c.c.c.c..E...c.c.c.c......V...#',
    '#............C...................#',
    '####.#####################.######'.padEnd(34, '#'),
    '#' + ','.repeat(32) + '#',
    '#,,P,,,,,,,,C,,,,,,,,,,,,,,,w,,,,#',
    '#' + '~'.repeat(32) + '#',
    '##################################',
  ],
};

// Ops and later missions reuse this framework; each definition slots into
// MISSIONS as it is built (tracked in DEVELOPMENT_STATE.md).
