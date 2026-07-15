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
  crane:    { hp: 380, speed: 110, weapon: 'rifle',   personality: 'hard',   color: '#6cd8ff', score: 'boss', armor: 0.25, boss: true },
  shiver:   { hp: 320, speed: 175, weapon: 'smg',     personality: 'sly',    color: '#a0f0ff', score: 'boss', armor: 0.15, boss: true },
  lockjaw:  { hp: 460, speed: 125, weapon: 'shotgun', personality: 'hard',   color: '#8fa4c0', score: 'boss', armor: 0.4,  boss: true },
  chemist:  { hp: 260, speed: 150, weapon: 'smg',     personality: 'sly',    color: '#b6ff4f', score: 'boss', armor: 0.05, boss: true },
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
  { id: 'm05', act: 2, n: 5, title: 'Port of Cobalt', type: 'main', implemented: true },
  { id: 'm06', act: 2, n: 6, title: 'Tower Block Evac', type: 'main', implemented: true },
  { id: 'm07', act: 2, n: 7, title: 'Convoy Takedown', type: 'main', implemented: true },
  { id: 'm08', act: 2, n: 8, title: 'The Glow Kitchen', type: 'main', implemented: true },
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
  signage: 'industrial',
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

// Grid builder: sealed borders by construction — no ragged-row bugs.
function buildMap(cols, rows, draw) {
  const g = Array.from({ length: rows }, (_, y) =>
    Array.from({ length: cols }, (_, x) => (x === 0 || y === 0 || x === cols - 1 || y === rows - 1 ? '#' : '.')));
  const set = (x, y, ch) => { if (y > 0 && y < rows - 1 && x > 0 && x < cols - 1) g[y][x] = ch; };
  const rect = (x0, y0, w, h, ch) => { for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) set(x, y, ch); };
  const rowFill = (y, ch) => rect(1, y, cols - 2, 1, ch);
  draw({ set, rect, rowFill });
  return g.map((r) => r.join(''));
}

MISSIONS.m05 = {
  id: 'm05',
  title: 'M05 — PORT OF COBALT',
  parSec: 540,
  signage: 'industrial',
  briefing: {
    speaker: 'DISPATCH',
    lines: [
      'Act Two, Grid. The Pier 9 ledger points at the Port of Cobalt intake yard — every crate of GLOW enters the city through these containers.',
      'The yard chief is a dead-eyed lifer they call CRANE. He works high ground with a marksman rifle. Move stack to stack and do not linger in the lanes.',
      'The shipping manifest in the yard office maps Act Two for us. Reach it, and take the yard.',
      'Dock crews are still working. Same rules as always: names on warrants beat names on headstones.',
    ],
  },
  debriefWin: {
    speaker: 'DISPATCH',
    lines: [
      'Intake yard secured, manifest in hand. The product routes to a tower block cutting house and a rolling convoy.',
      'CRANE\'s paperwork also mentions a "kitchen". Keep climbing, Grid.',
    ],
  },
  debriefLose: { speaker: 'DISPATCH', lines: ['The yard kept its secrets. Go back in — the manifest is everything.'] },
  objectives: [
    { id: 'clear', label: 'Neutralize the intake crew', primary: true, type: 'neutralize', count: 10, tag: 'gunman' },
    { id: 'boss', label: 'Take down CRANE', primary: true, type: 'boss' },
    { id: 'office', label: 'Optional: Reach the manifest office', primary: false, type: 'reach', tag: 'gate' },
    { id: 'cuffs', label: 'Optional: Arrest 4 suspects', primary: false, type: 'arrest', count: 4 },
    { id: 'ledger', label: 'Optional: Seize the manifest + the sample crate', primary: false, type: 'evidence', count: 2 },
  ],
  escalation: {
    at: 5,
    banner: 'GATE CREW FLOODS THE YARD',
    spawns: [
      { type: 'bruiser', x: 2, y: 17 }, { type: 'dealer', x: 3, y: 17 },
      { type: 'soldier', x: 38, y: 17 }, { type: 'dealer', x: 39, y: 17 },
    ],
  },
  boss: {
    type: 'crane', x: 21, y: 2, name: 'CRANE',
    intro: 'CRANE: "Wrong yard, badge. I never miss twice."',
    phase2At: 0.5, phase2Banner: 'CRANE DROPS THE CONTAINERS',
    phase2Spawns: [{ type: 'bruiser', x: 10, y: 9 }, { type: 'bruiser', x: 26, y: 9 }],
    surrenderAt: 0.18,
  },
  map: buildMap(42, 20, ({ set, rect, rowFill }) => {
    rowFill(16, ','); rowFill(17, '~'); rowFill(18, '~');
    // container stacks in staggered rows
    for (const [cx, cy] of [[4, 3], [12, 3], [20, 3], [28, 3], [5, 7], [13, 7], [21, 7], [29, 7], [4, 11], [12, 11], [20, 11], [28, 11]]) rect(cx, cy, 4, 2, '#');
    // manifest office
    rect(34, 1, 7, 4, '#');
    rect(35, 2, 5, 2, '.');
    set(34, 3, '.'); // office door
    set(37, 2, 'V');
    set(38, 3, 'X');
    // crew
    for (const [x, y] of [[8, 4], [17, 4], [25, 4], [33, 4], [9, 8], [18, 8], [26, 8], [8, 12], [17, 12], [25, 12], [33, 9]]) set(x, y, 'E');
    for (const [x, y] of [[6, 14], [18, 14], [30, 14], [11, 5]]) set(x, y, 'C');
    set(2, 12, 'V');
    set(10, 16, 'w'); set(26, 16, 'p'); set(36, 12, 'm');
    set(3, 16, 'P');
  }),
};

MISSIONS.m06 = {
  id: 'm06',
  title: 'M06 — TOWER BLOCK EVAC',
  parSec: 600,
  briefing: {
    speaker: 'DISPATCH',
    lines: [
      'Glowline turned a Southside tower block into a cutting house, and tonight they are clearing the witnesses — meaning the residents.',
      'Their floor boss SHIVER is holding the top floor. Work your way up, floor by floor, stairwell by stairwell.',
      'Residents are hiding in the corridors. This one is different, Grid: if the crowd bleeds, the mission is over. One mistake is all the city will forgive.',
      'Cutting-room paperwork is scattered through the flats. Bag what you can on the climb.',
    ],
  },
  debriefWin: {
    speaker: 'DISPATCH',
    lines: [
      'Tower secure, residents breathing. The cutting-room notes name an armoured convoy moving product tomorrow night.',
      'SHIVER\'s phone is full of texts from someone called THE CHEMIST. Act Two is getting warm.',
    ],
  },
  debriefLose: { speaker: 'DISPATCH', lines: ['We lost the tower. Those people needed better from us — again, and cleaner.'] },
  objectives: [
    { id: 'clear', label: 'Neutralize the cutting-house crew', primary: true, type: 'neutralize', count: 10, tag: 'gunman' },
    { id: 'boss', label: 'Take down SHIVER', primary: true, type: 'boss' },
    { id: 'civs', label: 'Keep the residents safe (2 strikes allowed)', primary: true, type: 'protect', count: 2 },
    { id: 'cuffs', label: 'Optional: Arrest 4 suspects', primary: false, type: 'arrest', count: 4 },
    { id: 'ledger', label: 'Optional: Recover the cutting-room papers', primary: false, type: 'evidence', count: 2 },
  ],
  escalation: {
    at: 5,
    banner: 'REINFORCEMENTS IN THE LOBBY',
    spawns: [
      { type: 'dealer', x: 26, y: 19 }, { type: 'soldier', x: 27, y: 19 },
      { type: 'bouncer', x: 25, y: 19 }, { type: 'dealer', x: 24, y: 19 },
    ],
  },
  boss: {
    type: 'shiver', x: 14, y: 2, name: 'SHIVER',
    intro: 'SHIVER: "You climbed all this way to fall back down?"',
    phase2At: 0.5, phase2Banner: 'SHIVER TORCHES THE CORRIDOR',
    phase2Spawns: [{ type: 'vipguard', x: 10, y: 5 }, { type: 'vipguard', x: 18, y: 5 }],
    surrenderAt: 0.22,
  },
  map: buildMap(30, 22, ({ set, rect, rowFill }) => {
    rowFill(7, '#'); rowFill(14, '#');           // floor slabs
    set(26, 7, '.'); set(27, 7, '.');            // east stairwell (2F -> 3F)
    set(2, 14, '.'); set(3, 14, '.');            // west stairwell (1F -> 2F)
    // apartment partition stubs per floor
    for (const y of [1, 8, 15]) for (const x of [6, 12, 18, 24]) rect(x, y, 1, 4, '#');
    // crew: 3 on floor 1 (bottom), 4 on floor 2, 3 on floor 3 (top)
    for (const [x, y] of [[9, 17], [15, 17], [21, 17]]) set(x, y, 'E');
    for (const [x, y] of [[4, 10], [10, 10], [16, 10], [22, 10]]) set(x, y, 'E');
    for (const [x, y] of [[8, 3], [20, 3], [26, 3]]) set(x, y, 'E');
    // residents
    for (const [x, y] of [[4, 18], [13, 18], [25, 16], [8, 12], [14, 12], [20, 12], [10, 5], [22, 5]]) set(x, y, 'C');
    set(4, 2, 'V'); set(16, 9, 'V');
    set(27, 17, 'p'); set(27, 9, 'm'); set(9, 9, 'w');
    set(2, 19, 'P');
  }),
};

MISSIONS.m07 = {
  id: 'm07',
  title: 'M07 — CONVOY TAKEDOWN',
  parSec: 330,
  playerVehicle: { type: 'patrol', x: 5, y: 10 },
  vehicles: [
    { type: 'gangcar',  x: 26, y: 8,  tag: 'escort', ai: 'escort', cruise: 265 },
    { type: 'gangcar',  x: 30, y: 11, tag: 'escort', ai: 'escort', cruise: 265 },
    { type: 'gangbike', x: 34, y: 9,  tag: 'escort', ai: 'escort', cruise: 330 },
    { type: 'gangbike', x: 34, y: 12, tag: 'escort', ai: 'escort', cruise: 330 },
    { type: 'armoured', x: 40, y: 10, tag: 'truck',  ai: 'convoy', cruise: 165 },
  ],
  traffic: { rows: [3, 5], eastRows: [], rate: 3.0, max: 4 },
  briefing: {
    speaker: 'DISPATCH',
    lines: [
      'The tower block gave up a schedule: Glowline moves the week\'s cut down Vermillion Boulevard tonight, and they have stopped pretending to be a street gang.',
      'That is an armoured transport — Halcyon surplus, sold to dealers with the serial numbers still on it. Your pistol will not open it. Your bumper might.',
      'Runners and bikes will screen it. Peel them off, then bully the transport to a stop.',
      'The commander rides in the cab. They call him LOCKJAW, and he has never once let go of anything.',
    ],
  },
  debriefWin: {
    speaker: 'DISPATCH',
    lines: [
      'Transport stopped, cut seized, LOCKJAW off the board. That armour was invoiced to a Halcyon Wellness subsidiary, Grid.',
      'The invoice lists a delivery address: an industrial kitchen under the old cannery. That is where they cook it.',
    ],
  },
  debriefLose: { speaker: 'DISPATCH', lines: ['The transport made the limits and the cut is gone. Run it back.'] },
  objectives: [
    { id: 'clear', label: 'Peel off the convoy screen', primary: true, type: 'neutralize', count: 4, tag: 'escort' },
    { id: 'boss', label: 'Stop the transport and take down LOCKJAW', primary: true, type: 'boss' },
    { id: 'cuffs', label: 'Optional: Arrest 2 suspects', primary: false, type: 'arrest', count: 2 },
    { id: 'civs', label: 'Optional: Keep the boulevard clear of casualties', primary: false, type: 'protect', count: 1 },
    { id: 'gate', label: 'Optional: Break the convoy before the river bridge', primary: false, type: 'reach', tag: 'gate' },
  ],
  escalation: {
    at: 2,
    banner: 'CHASE CARS JOINING FROM THE RAMPS',
    spawns: [],
    vehicles: [
      { type: 'gangcar', x: 8, y: 9,  tag: 'outrider', ai: 'escort', cruise: 300 },
      { type: 'gangcar', x: 8, y: 12, tag: 'outrider', ai: 'escort', cruise: 300 },
    ],
  },
  boss: {
    type: 'lockjaw', x: 100, y: 10, trigger: 'truck', name: 'LOCKJAW',
    intro: 'LOCKJAW: "Eleven years I never lost a load. You get to be the first thing I break instead."',
    phase2At: 0.5, phase2Banner: 'LOCKJAW DROPS THE PLATE ARMOUR',
    phase2Spawns: [],
    surrenderAt: 0.1,
  },
  map: buildMap(132, 16, ({ set, rect, rowFill }) => {
    rowFill(1, ','); rowFill(2, ',');
    rowFill(3, '~'); rowFill(4, '~'); rowFill(5, '~');   // westbound
    rowFill(6, '=');                                      // median
    rowFill(7, '~'); rowFill(8, '~'); rowFill(9, '~');    // eastbound
    rowFill(10, '~'); rowFill(11, '~'); rowFill(12, '~');
    rowFill(13, ','); rowFill(14, ',');
    for (let x = 8; x < 130; x += 16) set(x, 6, '~');     // median gaps
    set(5, 10, 'P');
    set(104, 10, 'X');                                    // river bridge gate
    for (let x = 12; x < 130; x += 27) { set(x, 1, 'c'); set(x + 3, 14, 'c'); }
  }),
};

MISSIONS.m08 = {
  id: 'm08',
  title: 'M08 — THE GLOW KITCHEN',
  parSec: 600,
  signage: 'industrial',
  briefing: {
    speaker: 'DISPATCH',
    lines: [
      'Under the old cannery, Grid. This is the kitchen — where Halcyon\'s "wellness compound" becomes the stuff killing kids on Marrow Street.',
      'The cook is a contractor with a doctorate and a non-disclosure agreement. THE CHEMIST. He is not a fighter, which makes him a liar instead — do not trust his hands.',
      'The room is full of pressurised GLOW vats. Shoot one and it goes, and it takes its neighbours with it. Blast doors work both ways.',
      'His formula notes and the Halcyon supply contract are both down there. Get them and Act Two is finished.',
    ],
  },
  debriefWin: {
    speaker: 'DISPATCH',
    lines: [
      'The kitchen is cold. Whatever you left of it, nobody is cooking there again.',
      'The supply contract is counter-signed by a Halcyon vice president — and by a Civic Shield procurement officer. The people who are supposed to stop this are billing for it.',
      'That is Act Three, Grid. The city stops being the backdrop and starts being the opponent.',
    ],
  },
  debriefLose: { speaker: 'DISPATCH', lines: ['The kitchen is still cooking. Go back down there.'] },
  objectives: [
    { id: 'clear', label: 'Neutralize the kitchen crew', primary: true, type: 'neutralize', count: 9, tag: 'gunman' },
    { id: 'boss', label: 'Take down THE CHEMIST', primary: true, type: 'boss' },
    { id: 'cuffs', label: 'Optional: Arrest 4 suspects', primary: false, type: 'arrest', count: 4 },
    { id: 'civs', label: 'Optional: No pressed workers harmed', primary: false, type: 'protect', count: 0 },
    { id: 'ledger', label: 'Optional: Seize the formula + the Halcyon contract', primary: false, type: 'evidence', count: 2 },
  ],
  escalation: {
    at: 5,
    banner: 'THE CHEMIST VENTS THE LINE',
    spawns: [
      { type: 'vipguard', x: 2, y: 12 }, { type: 'bruiser', x: 33, y: 12 },
      { type: 'dealer', x: 2, y: 18 }, { type: 'vipguard', x: 33, y: 18 },
    ],
  },
  boss: {
    type: 'chemist', x: 17, y: 3, name: 'THE CHEMIST',
    intro: 'THE CHEMIST: "I have a doctorate. I have indemnity. I have — oh, you are still walking toward me."',
    phase2At: 0.55, phase2Banner: 'THE CHEMIST OPENS THE VALVES',
    phase2Spawns: [{ type: 'vipguard', x: 12, y: 4 }, { type: 'vipguard', x: 22, y: 4 }],
    surrenderAt: 0.4, // folds early — but he is sly, so his hands lie
  },
  map: buildMap(36, 24, ({ set, rect, rowFill }) => {
    // clean room / office strip along the top, blast wall beneath it
    rowFill(5, '#');
    rect(15, 5, 5, 1, '.');                 // airlock into the cook floor
    set(3, 1, 'V'); set(32, 1, 'V');        // formula notes + Halcyon contract
    rect(2, 2, 2, 2, 's'); rect(31, 2, 2, 2, 's');
    set(9, 2, 'E'); set(26, 2, 'E');
    // the cook floor: banks of vats with aisles between them
    for (const vy of [8, 12, 16]) {
      for (let vx = 4; vx <= 31; vx += 3) set(vx, vy, 'v');
    }
    // catwalk cover between the banks
    for (const cy of [10, 14]) for (let cx = 6; cx <= 29; cx += 6) set(cx, cy, 'c');
    // crew on the floor
    set(6, 9, 'E'); set(14, 9, 'E'); set(24, 9, 'E'); set(30, 11, 'E');
    set(8, 13, 'E'); set(20, 13, 'E'); set(28, 15, 'E');
    // pressed workers stand in the mid-aisles: close enough that a careless
    // chain singes them, far enough that quadratic falloff lets them live
    set(11, 10, 'C'); set(22, 10, 'C'); set(17, 14, 'C'); set(8, 21, 'C');
    // loading dock at the bottom: player entry, kit, no vats
    rowFill(19, '#'); rect(16, 19, 4, 1, '.');
    rowFill(20, '.'); rowFill(21, '.'); rowFill(22, ',');
    set(3, 21, 'P'); set(30, 21, 'm'); set(27, 21, 'p');
  }),
};

// Ops and later missions reuse this framework; each definition slots into
// MISSIONS as it is built (tracked in DEVELOPMENT_STATE.md).
