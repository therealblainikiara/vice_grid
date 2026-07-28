// missions.js — campaign structure and mission definitions.
// Map legend: # wall, . floor, , sidewalk, c crate (destructible cover),
// s shelf (destructible), P player spawn, E enemy, H heavy enemy, B boss,
// C civilian, V evidence, w weapon pickup, m medkit, ~ road, D door (open).

import { materializeLayout } from './layout.js';

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
  // Civic Shield — the corrupt private force. Amber colour-coding.
  cs_trooper:  { hp: 65,  speed: 150, weapon: 'pistol',  personality: 'timid', color: '#ffb830', score: 'gunman' },
  cs_tactical: { hp: 80,  speed: 160, weapon: 'smg',     personality: 'hard',  color: '#ffa53d', score: 'gunman', armor: 0.1 },
  cs_shield:   { hp: 120, speed: 110, weapon: 'pistol',  personality: 'hard',  color: '#ffc95e', score: 'gunman', armor: 0.1, shield: true },
  graft:    { hp: 480, speed: 115, weapon: 'shotgun', personality: 'hard',   color: '#ffd080', score: 'boss', armor: 0.3, boss: true, shield: true },
  wrecker:  { hp: 400, speed: 150, weapon: 'shotgun', personality: 'hard',   color: '#ff8f4d', score: 'boss', armor: 0.3, boss: true },
};

// Full campaign skeleton. `implemented` gates mission select during development;
// the release build requires every entry to be true (validated by tools/validate.js).
export const CAMPAIGN = [
  { id: 'm01', act: 1, n: 1, title: 'Store Siege', type: 'main', environment: 'street', implemented: true },
  { id: 'm02', act: 1, n: 2, title: 'Club Neon Raid', type: 'main', environment: 'club', implemented: true },
  { id: 'm03', act: 1, n: 3, title: 'Highway Glow Run', type: 'main', environment: 'street', implemented: true },
  { id: 'm04', act: 1, n: 4, title: 'Warehouse Intercept', type: 'main', environment: 'warehouse', implemented: true },
  { id: 'op1', act: 1, n: 0, title: 'OP: Corner Sweep', type: 'op', environment: 'street', implemented: true },
  { id: 'op2', act: 1, n: 0, title: 'OP: Glow Courier', type: 'op', environment: 'street', implemented: true },
  { id: 'm05', act: 2, n: 5, title: 'Port of Cobalt', type: 'main', environment: 'port', implemented: true },
  { id: 'm06', act: 2, n: 6, title: 'Tower Block Evac', type: 'main', environment: 'street', implemented: true },
  { id: 'm07', act: 2, n: 7, title: 'Convoy Takedown', type: 'main', environment: 'street', implemented: true },
  { id: 'm08', act: 2, n: 8, title: 'The Glow Kitchen', type: 'main', environment: 'lab', implemented: true },
  { id: 'op3', act: 2, n: 0, title: 'OP: Dockside Score Attack', type: 'op', environment: 'port', implemented: true },
  { id: 'op4', act: 2, n: 0, title: 'OP: Witness Escort', type: 'op', environment: 'street', implemented: true },
  { id: 'm09', act: 3, n: 9, title: 'Precinct Siege', type: 'main', environment: 'precinct', implemented: true },
  { id: 'm10', act: 3, n: 10, title: 'Evidence Run', type: 'main', environment: 'street', implemented: true },
  { id: 'm11', act: 3, n: 11, title: 'Blackout', type: 'main', environment: 'industrial', implemented: true },
  { id: 'm12', act: 3, n: 12, title: 'Signal Tower', type: 'main', environment: 'industrial', implemented: true },
  { id: 'op5', act: 3, n: 0, title: 'OP: Rooftop Sweep', type: 'op', environment: 'street', implemented: true },
  { id: 'op6', act: 3, n: 0, title: 'OP: Riot Line', type: 'op', environment: 'street', implemented: true },
  { id: 'm13', act: 4, n: 13, title: 'The Rig', type: 'main', environment: 'industrial', implemented: true },
  { id: 'm14', act: 4, n: 14, title: 'Halcyon HQ', type: 'main', environment: 'office', implemented: true },
  { id: 'm15', act: 4, n: 15, title: 'City on Fire', type: 'main', environment: 'street', implemented: true },
  { id: 'm16', act: 4, n: 16, title: 'The Penthouse Grid', type: 'main', environment: 'penthouse', implemented: true },
  { id: 'op7', act: 4, n: 0, title: 'OP: Halcyon Records', type: 'op', environment: 'office', implemented: true },
  { id: 'op8', act: 4, n: 0, title: 'OP: Final Score Attack', type: 'op', environment: 'street', implemented: true },
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
  // PURSUIT: the hauler is running for the interchange. You start behind it and
  // must run it down before it escapes east; escorts pace ahead to block you.
  convoyGoal: 'pursue',
  playerVehicle: { type: 'patrol', x: 4, y: 12 },
  vehicles: [
    { type: 'gangcar', x: 22, y: 9,  tag: 'escort', ai: 'escort', cruise: 250 },
    { type: 'gangcar', x: 26, y: 11, tag: 'escort', ai: 'escort', cruise: 250 },
    { type: 'gangcar', x: 30, y: 10, tag: 'escort', ai: 'escort', cruise: 250 },
    { type: 'truck',   x: 34, y: 10, tag: 'truck',  ai: 'convoy', cruise: 215 },
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
    { id: 'clear', label: 'Run down the escort runners', primary: true, type: 'neutralize', count: 3, tag: 'escort' },
    { id: 'boss', label: 'Force the hauler to stop — take down TREAD', primary: true, type: 'boss' },
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
  // INTERDICTION: an armoured convoy charges your roadblock from the east. Dig
  // in at the western chokepoint, lay the strips, peel the screen, and stop the
  // hauler before it breaks through to the west limits.
  convoyGoal: 'interdict',
  playerVehicle: { type: 'patrol', x: 16, y: 10 },
  vehicles: [
    { type: 'gangcar',  x: 50, y: 8,  tag: 'escort', ai: 'escort', cruise: 265 },
    { type: 'gangcar',  x: 54, y: 11, tag: 'escort', ai: 'escort', cruise: 265 },
    { type: 'gangbike', x: 58, y: 9,  tag: 'escort', ai: 'escort', cruise: 330 },
    { type: 'gangbike', x: 58, y: 12, tag: 'escort', ai: 'escort', cruise: 330 },
    { type: 'armoured', x: 64, y: 10, tag: 'truck',  ai: 'convoy', cruise: 165 },
  ],
  traffic: { rows: [3, 5], eastRows: [], rate: 3.0, max: 4 },
  briefing: {
    speaker: 'DISPATCH',
    lines: [
      'The tower block gave up a schedule: Glowline moves the week\'s cut down Vermillion Boulevard tonight, and they have stopped pretending to be a street gang.',
      'That is an armoured transport — Halcyon surplus, sold to dealers with the serial numbers still on it. Your pistol will not open it. Your bumper might.',
      'You will not catch that thing in a straight race, so we do not race — we block. Set up at the west chokepoint and lay the strips.',
      'Peel the runners and bikes off it as they charge, then cripple the transport before it breaks your line.',
      'The commander rides in the cab. They call him LOCKJAW, and he has never once let go of anything.',
    ],
  },
  debriefWin: {
    speaker: 'DISPATCH',
    lines: [
      'The line held. Transport stopped cold, cut seized, LOCKJAW off the board. That armour was invoiced to a Halcyon Wellness subsidiary, Grid.',
      'The invoice lists a delivery address: an industrial kitchen under the old cannery. That is where they cook it.',
    ],
  },
  debriefLose: { speaker: 'DISPATCH', lines: ['The transport broke the line and the cut is gone. Set up tighter and run it back.'] },
  objectives: [
    { id: 'clear', label: 'Break the convoy screen as it charges', primary: true, type: 'neutralize', count: 4, tag: 'escort' },
    { id: 'boss', label: 'Cripple the transport — take down LOCKJAW', primary: true, type: 'boss' },
    { id: 'cuffs', label: 'Optional: Arrest 2 suspects', primary: false, type: 'arrest', count: 2 },
    { id: 'civs', label: 'Optional: Keep the boulevard clear of casualties', primary: false, type: 'protect', count: 1 },
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
    type: 'lockjaw', x: 20, y: 10, trigger: 'truck', name: 'LOCKJAW',
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
    set(16, 10, 'P');                                     // player digs in west
    for (let y = 7; y <= 12; y++) { set(26, y, '^'); set(27, y, '^'); } // roadblock strips
    for (let x = 40; x < 130; x += 27) { set(x, 1, 'c'); set(x + 3, 14, 'c'); }
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

MISSIONS.m09 = {
  id: 'm09',
  title: 'M09 — PRECINCT SIEGE',
  parSec: 540,
  enemyPool: ['cs_trooper', 'cs_trooper', 'cs_tactical', 'cs_tactical', 'cs_shield'],
  briefing: {
    speaker: 'DISPATCH',
    lines: [
      'Act Three, Grid, and the gloves are off. The Halcyon contract you seized names Civic Shield procurement — and tonight Civic Shield is answering.',
      'They are raiding the mothballed 9th Precinct. Our precinct. Everything we have built since the QuickCell — every cuffed name, every ledger — is in that evidence store.',
      'These are not street dealers. Trained units, riot shields. A shield takes everything you throw at its front — flank it, get behind it, or introduce it to RHINO\'s shoulder.',
      'Their ground commander is CAPTAIN GRAFT. Twenty-two years of service and a second salary. He carries a shield too. Take him ALIVE if you can — a captain\'s testimony breaks this city open.',
    ],
  },
  debriefWin: {
    speaker: 'DISPATCH',
    lines: [
      'The 9th holds. The evidence store holds. And half of Civic Shield\'s night shift is cuffed in their own riot vans.',
      'Internal-affairs files from the records room name the officers on Halcyon\'s books. We move the evidence downtown tomorrow — and Grid, they know we have to.',
    ],
  },
  debriefLose: { speaker: 'DISPATCH', lines: ['They torched the store. Months of names, gone. Take the precinct back.'] },
  // DEFENSE: you do not advance and clear — you hold. Civic Shield breach the
  // lobby in escalating waves; the next only comes once you have put the last
  // one down. Survive them all and GRAFT walks in for the final stand.
  objectives: [
    { id: 'hold', label: 'Hold the precinct — repel every wave', primary: true, type: 'survive' },
    { id: 'boss', label: 'Take down CAPTAIN GRAFT', primary: true, type: 'boss' },
    { id: 'cuffs', label: 'Optional: Arrest 4 raiders', primary: false, type: 'arrest', count: 4 },
    { id: 'civs', label: 'Optional: Keep the clerks safe (1 strike allowed)', primary: false, type: 'protect', count: 1 },
    { id: 'ledger', label: 'Optional: Secure the internal-affairs files', primary: false, type: 'evidence', count: 2 },
  ],
  waves: [
    { delay: 2, banner: 'WAVE 1 — CIVIC SHIELD BREACH THE LOBBY', spawns: [
      { type: 'cs_trooper', x: 14, y: 20 }, { type: 'cs_trooper', x: 17, y: 20 }, { type: 'cs_tactical', x: 20, y: 20 },
    ] },
    { delay: 4, banner: 'WAVE 2 — SHIELDS UP', spawns: [
      { type: 'cs_shield', x: 15, y: 20 }, { type: 'cs_tactical', x: 17, y: 20 }, { type: 'cs_shield', x: 19, y: 20 }, { type: 'cs_trooper', x: 16, y: 19 },
    ] },
    { delay: 4, banner: 'WAVE 3 — THEY COMMIT EVERYTHING', spawns: [
      { type: 'cs_shield', x: 14, y: 20 }, { type: 'cs_tactical', x: 16, y: 20 }, { type: 'cs_tactical', x: 18, y: 20 }, { type: 'cs_shield', x: 20, y: 20 }, { type: 'cs_trooper', x: 17, y: 19 },
    ] },
  ],
  boss: {
    type: 'graft', x: 17, y: 18, trigger: 'waves', name: 'CAPTAIN GRAFT',
    intro: 'CAPTAIN GRAFT: "Twenty-two years I kept this city quiet. You two are just noise."',
    phase2At: 0.5, phase2Banner: 'GRAFT CALLS HIS PERSONAL DETAIL',
    phase2Spawns: [{ type: 'cs_shield', x: 14, y: 18 }, { type: 'cs_tactical', x: 20, y: 18 }],
    surrenderAt: 0.15,
  },
  // A real precinct floor, not a box: you enter through reception, hold the
  // bullpen of desk cubicles, and the secure wing (records / evidence / holding)
  // is up top. Believable architecture — reception counter, lift bank, private
  // offices, corridors — so it reads as a building, not an arena.
  map: buildMap(34, 22, ({ set, rect, rowFill }) => {
    // ---- SECURE WING (y1-6): records (W) | central booking + cells | evidence (E)
    rowFill(7, '#'); rect(9, 7, 2, 1, '.'); rect(23, 7, 2, 1, '.');  // wing wall + 2 doors
    rect(10, 1, 1, 6, '#'); rect(23, 1, 1, 6, '#');                  // split into three rooms
    set(3, 2, 'V'); rect(2, 4, 3, 1, 's');                           // records: IA files + shelving
    set(30, 2, 'V'); rect(28, 4, 3, 1, 's');                         // evidence store
    rect(15, 2, 1, 4, '#'); rect(18, 2, 1, 4, '#');                  // two holding cells (central)
    set(14, 4, 'C'); set(19, 4, 'C');                                // detainees / witnesses
    set(16, 2, 'm');
    // ---- PRIVATE OFFICES down the east wall (y9-16): three glass-front offices
    rect(27, 9, 1, 8, '#');                                          // office corridor wall
    rect(27, 11, 1, 1, '.'); rect(27, 14, 1, 1, '.');                // two office doorways
    rect(30, 12, 1, 1, '#'); rect(30, 15, 1, 1, '#');                // office back partitions
    set(30, 10, 'c'); set(30, 13, 'c'); set(30, 16, 'c');            // office desks
    set(29, 10, 's'); set(29, 13, 's');                              // office shelving
    // ---- BULLPEN (y9-16): cubicle farm placed via the furnish system below,
    // so it merges into the static batch (perf) instead of unmerged map props
    set(6, 11, 'C'); set(16, 11, 'C'); set(11, 15, 'C');             // clerks sheltering
    set(5, 3, 'E'); set(28, 3, 'E'); set(12, 10, 'E'); set(20, 14, 'E'); // a few raiders already inside
    // ---- RECEPTION LOBBY (y18-20): counter, lift bank, and the breached entrance
    rowFill(17, '#'); rect(15, 17, 5, 1, '.');                       // lobby wall + shattered doors
    rect(13, 18, 8, 1, 's'); rect(16, 18, 2, 1, '.');               // reception counter with a staff gap
    rect(1, 18, 1, 3, '#'); rect(3, 18, 1, 3, '#'); rect(5, 18, 1, 3, '#'); rect(7, 18, 1, 3, '#'); // lift shafts
    set(2, 18, '='); set(4, 18, '='); set(6, 18, '=');              // lift doors (metal)
    rowFill(20, ',');                                                // entrance mat / street
    set(10, 19, 'P'); set(29, 19, 'w');                             // player start + weapon locker
  }),
  furnish: [
    { rect: [2, 9, 24, 8], role: 'cubicles' },   // bullpen (merged static batch)
  ],
};

MISSIONS.m10 = {
  id: 'm10',
  title: 'M10 — EVIDENCE RUN',
  parSec: 330,
  convoyGoal: 'protect',
  playerVehicle: { type: 'patrol', x: 9, y: 10 },
  vehicles: [
    { type: 'truck',   x: 5,  y: 10, tag: 'truck',  ai: 'convoy', cruise: 160 },
    { type: 'gangcar', x: 30, y: 8,  tag: 'raider', ai: 'escort', cruise: 280 },
    { type: 'gangcar', x: 34, y: 11, tag: 'raider', ai: 'escort', cruise: 280 },
    { type: 'gangbike', x: 38, y: 9, tag: 'raider', ai: 'escort', cruise: 340 },
    { type: 'gangbike', x: 38, y: 12, tag: 'raider', ai: 'escort', cruise: 340 },
  ],
  traffic: { rows: [3, 5], eastRows: [], rate: 3.2, max: 3 },
  briefing: {
    speaker: 'DISPATCH',
    lines: [
      'Everything the 9th holds goes downtown tonight in one armoured van, and every crook in Cobalt knows the route.',
      'You are the escort. Glowline raiders will hit the van, not you — keep their runners off it, body-block for it, be the wall.',
      'The van driver is a records clerk named Petra doing the bravest thing of her life. She does not stop for anything. Do not let anything make her.',
      'Word is the syndicate hired THE WRECKER — the ram-car king of the east docks. If his rig shows up, stop it before it reaches Petra.',
    ],
  },
  debriefWin: {
    speaker: 'DISPATCH',
    lines: [
      'Van is in the underground dock and Petra is asking if she qualifies for a badge. Honestly, Grid, she might.',
      'With the evidence secured downtown, the prosecutor can move. Which means the city\'s dirty half must move first — watch the lights tonight.',
    ],
  },
  debriefLose: { speaker: 'DISPATCH', lines: ['The van is burning on the boulevard. Everything we had was in it. Run it back — Petra deserves better.'] },
  objectives: [
    { id: 'van', label: 'Deliver the evidence van intact', primary: true, type: 'reach', tag: 'delivered' },
    { id: 'boss', label: 'Stop THE WRECKER', primary: true, type: 'boss' },
    { id: 'clear', label: 'Optional: Disable the raider screen', primary: false, type: 'neutralize', count: 4, tag: 'raider' },
    { id: 'cuffs', label: 'Optional: Arrest 2 suspects', primary: false, type: 'arrest', count: 2 },
    { id: 'civs', label: 'Optional: Keep commuters clear (1 strike allowed)', primary: false, type: 'protect', count: 1 },
  ],
  escalation: {
    at: 2,           // aggressive escorts meet him early…
    atVanFrac: 0.3,  // …but the ambush point catches everyone else
    banner: 'THE WRECKER JOINS THE HUNT',
    spawns: [],
    vehicles: [
      { type: 'armoured', x: 8, y: 10, tag: 'wrecker', ai: 'escort', cruise: 300 },
    ],
  },
  boss: {
    type: 'wrecker', x: 100, y: 10, trigger: 'wrecker', name: 'THE WRECKER',
    intro: 'THE WRECKER: "Nine hundred wrecks and never a scratch on me. Climb out and make it nine-oh-one."',
    phase2At: 0.5, phase2Banner: 'THE WRECKER TEARS OFF HIS DOOR AS A SHIELD',
    phase2Spawns: [],
    surrenderAt: 0.2,
  },
  map: buildMap(132, 16, ({ set, rect, rowFill }) => {
    rowFill(1, ','); rowFill(2, ',');
    rowFill(3, '~'); rowFill(4, '~'); rowFill(5, '~');
    rowFill(6, '=');
    for (let x = 10; x < 130; x += 18) set(x, 6, '~');
    rowFill(7, '~'); rowFill(8, '~'); rowFill(9, '~');
    rowFill(10, '~'); rowFill(11, '~'); rowFill(12, '~');
    rowFill(13, ','); rowFill(14, ',');
    set(9, 12, 'P');
    for (let x = 16; x < 130; x += 31) { set(x, 1, 'c'); set(x + 4, 14, 'c'); }
  }),
};

// Ops and later missions reuse this framework; each definition slots into
// MISSIONS as it is built (tracked in DEVELOPMENT_STATE.md).

MISSIONS.op1 = {
  id: 'op1',
  title: 'OP1 — CORNER SWEEP',
  parSec: 180,
  briefing: {
    speaker: 'DISPATCH',
    lines: [
      'Quick op, Grid. Glowline runners are moving product through the alleys behind Marrow.',
      'Sweep the block, cuff anyone moving weight, and be out before the shift changes.',
    ],
  },
  debriefWin: { speaker: 'DISPATCH', lines: ['Alleys clear. Another notch on the board.'] },
  debriefLose: { speaker: 'DISPATCH', lines: ['They slipped the net. Reset and hit it again.'] },
  objectives: [
    { id: 'clear', label: 'Neutralize alley runners', primary: true, type: 'neutralize', count: 4, tag: 'gunman' },
    { id: 'cuffs', label: 'Optional: Arrest 2 suspects', primary: false, type: 'arrest', count: 2 },
  ],
  escalation: null,
  map: buildMap(24, 16, ({ set, rect, rowFill }) => {
    rowFill(1, ','); rowFill(14, ',');
    for (let y = 2; y < 14; y++) { set(1, y, ','); set(22, y, ','); }
    for (const [x, y] of [[4, 3], [18, 3], [4, 11], [18, 11]]) set(x, y, 'E');
    set(6, 5, 'C'); set(20, 5, 'C');
    set(3, 7, 'V'); set(20, 12, 'w');
    set(2, 7, 'P');
  }),
};

MISSIONS.op2 = {
  id: 'op2',
  title: 'OP2 — GLOW COURIER',
  parSec: 210,
  playerVehicle: { type: 'patrol', x: 4, y: 10 },
  vehicles: [
    { type: 'gangbike', x: 28, y: 8, tag: 'courier', ai: 'escort', cruise: 380 },
    { type: 'gangbike', x: 32, y: 11, tag: 'outrider', ai: 'escort', cruise: 360 },
    { type: 'gangbike', x: 32, y: 13, tag: 'outrider', ai: 'escort', cruise: 360 },
  ],
  traffic: { rows: [3, 5, 9, 11], eastRows: [9, 11], rate: 2.5, max: 5 },
  briefing: {
    speaker: 'DISPATCH',
    lines: [
      'A solo courier is burning east on the expressway with a crate of pure GLOW.',
      'Two outriders screen him. Disable the bikes, run the courier off the road, and seize the crate.',
      'Civilian traffic is light tonight. Keep it that way.',
    ],
  },
  debriefWin: { speaker: 'DISPATCH', lines: ['Courier stopped. Crate secured. That\'s a clean pull.'] },
  debriefLose: { speaker: 'DISPATCH', lines: ['The courier made the interchange. Product is gone. Run it back.'] },
  objectives: [
    { id: 'clear', label: 'Disable the outriders', primary: true, type: 'neutralize', count: 2, tag: 'outrider' },
    { id: 'courier', label: 'Stop the courier and seize the crate', primary: true, type: 'boss' },
    { id: 'civs', label: 'Optional: No commuter casualties', primary: false, type: 'protect', count: 1 },
  ],
  boss: {
    type: 'chemist', x: 90, y: 10, trigger: 'courier', name: 'THE COURIER',
    intro: 'COURIER: "You\'ll never catch me — I\'m already gone!"',
    phase2At: 0.5, phase2Banner: 'COURIER DUMPS THE CRATE AND RUNS',
    phase2Spawns: [],
    surrenderAt: 0.3,
  },
  map: buildMap(120, 16, ({ set, rect, rowFill }) => {
    rowFill(1, ','); rowFill(2, ',');
    rowFill(3, '~'); rowFill(4, '~'); rowFill(5, '~');
    rowFill(6, '=');
    rowFill(7, '~'); rowFill(8, '~'); rowFill(9, '~');
    rowFill(10, '~'); rowFill(11, '~'); rowFill(12, '~');
    rowFill(13, ','); rowFill(14, ',');
    for (let x = 8; x < 118; x += 16) set(x, 6, '~');
    set(4, 10, 'P');
    set(100, 10, 'X');
  }),
};

MISSIONS.op3 = {
  id: 'op3',
  title: 'OP3 — DOCKSIDE SCORE ATTACK',
  parSec: 300,
  signage: 'industrial',
  briefing: {
    speaker: 'DISPATCH',
    lines: [
      'Pier 9 is quiet tonight — on paper. Off the books, Glowline is moving crates through the container yard.',
      'Score attack rules: maximize neutralizations and evidence in the time limit. No primary fail state, but the clock is the boss.',
      'Watch for the crane operator — he drops containers on intruders.',
    ],
  },
  debriefWin: { speaker: 'DISPATCH', lines: ['Yard swept. The scoreboard likes you.'] },
  debriefLose: { speaker: 'DISPATCH', lines: ['Time expired. Whatever you got, bag it and report.'] },
  objectives: [
    { id: 'clear', label: 'Neutralize dock crew', primary: true, type: 'neutralize', count: 12, tag: 'gunman' },
    { id: 'ledger', label: 'Seize shipping manifests', primary: false, type: 'evidence', count: 3 },
    { id: 'cuffs', label: 'Arrest 5 suspects', primary: false, type: 'arrest', count: 5 },
    { id: 'civs', label: 'No dock worker casualties', primary: false, type: 'protect', count: 0 },
  ],
  escalation: {
    at: 6,
    banner: 'SECOND SHIFT CLOCKS IN',
    spawns: [
      { type: 'bruiser', x: 2, y: 16 }, { type: 'dealer', x: 3, y: 16 },
      { type: 'soldier', x: 38, y: 16 }, { type: 'dealer', x: 39, y: 16 },
    ],
  },
  map: buildMap(42, 20, ({ set, rect, rowFill }) => {
    rowFill(16, ','); rowFill(17, '~'); rowFill(18, '~');
    for (const [cx, cy] of [[4, 3], [12, 3], [20, 3], [28, 3], [5, 7], [13, 7], [21, 7], [29, 7], [4, 11], [12, 11], [20, 11], [28, 11]]) rect(cx, cy, 4, 2, '#');
    for (const [x, y] of [[8, 4], [17, 4], [25, 4], [33, 4], [9, 8], [18, 8], [26, 8], [8, 12], [17, 12], [25, 12], [33, 9], [5, 5]]) set(x, y, 'E');
    for (const [x, y] of [[6, 14], [18, 14], [30, 14], [11, 5]]) set(x, y, 'C');
    set(2, 12, 'V'); set(34, 4, 'V'); set(36, 8, 'V');
    set(10, 16, 'w'); set(26, 16, 'p'); set(36, 12, 'm');
    set(3, 16, 'P');
  }),
};

MISSIONS.op4 = {
  id: 'op4',
  title: 'OP4 — WITNESS ESCORT',
  parSec: 360,
  briefing: {
    speaker: 'DISPATCH',
    lines: [
      'A mid-level Glowline bookkeeper wants out. She\'s holed up in a tenement on 14th.',
      'Extract her to the safe house at the north edge of the map. Civic Shield patrol cars are circling — they want her silenced.',
      'She won\'t move fast. You are her shield.',
    ],
  },
  debriefWin: { speaker: 'DISPATCH', lines: ['Witness is in protective custody. Her books open three new investigations.'] },
  debriefLose: { speaker: 'DISPATCH', lines: ['She didn\'t make it. Neither did the case.'] },
  objectives: [
    { id: 'escort', label: 'Escort the witness to the safe house', primary: true, type: 'reach', tag: 'safehouse' },
    { id: 'clear', label: 'Neutralize pursuit', primary: true, type: 'neutralize', count: 6, tag: 'gunman' },
    { id: 'cuffs', label: 'Optional: Arrest 3 pursuers', primary: false, type: 'arrest', count: 3 },
    { id: 'civs', label: 'Optional: Witness takes zero damage', primary: false, type: 'protect', count: 0 },
  ],
  escalation: {
    at: 3,
    banner: 'CIVIC SHIELD QRF DEPLOYING',
    spawns: [
      { type: 'cs_shield', x: 15, y: 19 }, { type: 'cs_tactical', x: 17, y: 19 },
      { type: 'cs_shield', x: 19, y: 19 }, { type: 'cs_trooper', x: 16, y: 20 },
    ],
  },
  map: buildMap(34, 22, ({ set, rect, rowFill }) => {
    rowFill(6, '#');
    rect(8, 6, 3, 1, '.'); rect(24, 6, 3, 1, '.');
    rect(11, 1, 1, 5, '#'); rect(22, 1, 1, 5, '#');
    set(3, 2, 'V'); set(30, 2, 'V');
    rect(2, 3, 2, 2, 's'); rect(30, 3, 2, 2, 's');
    set(6, 3, 'E'); set(27, 3, 'E');
    for (const [cx, cy] of [[6, 9], [12, 9], [20, 9], [26, 9], [9, 13], [16, 13], [23, 13]]) { set(cx, cy, 'c'); set(cx + 2, cy, 'c'); }
    set(4, 11, 'C'); set(29, 11, 'C'); set(13, 15, 'C'); set(21, 15, 'C');
    set(8, 10, 'E'); set(18, 10, 'E'); set(28, 10, 'E');
    set(6, 14, 'E'); set(15, 14, 'E'); set(25, 14, 'E');
    set(11, 16, 'E'); set(23, 16, 'E');
    rowFill(17, '#');
    rect(14, 17, 7, 1, '.');
    rowFill(20, ',');
    set(4, 19, 'P'); set(30, 19, 'w');
    set(17, 2, 'X');
    set(17, 18, 'C');
  }),
};

MISSIONS.m11 = {
  id: 'm11',
  title: 'M11 — BLACKOUT',
  parSec: 480,
  blackout: true,
  briefing: {
    speaker: 'DISPATCH',
    lines: [
      'City grid just went dark. Halcyon hit the substation on 4th and Main — this was planned.',
      'Glowline crews are moving product under cover of the blackout. Your NVGs work; theirs don\'t.',
      'The substation control room has the switch to kill their night vision advantage. Reach it.',
      'Boss on site: a Glowline enforcer called MIDNIGHT\'s lieutenant. Calls himself SHIVER. Wait — different SHIVER. This one\'s VOID.',
    ],
  },
  debriefWin: {
    speaker: 'DISPATCH',
    lines: [
      'Lights coming back up. Glowline\'s night move is shattered.',
      'VOID\'s comms unit has coordinates for a signal tower — they\'re coordinating the city-wide push from there.',
    ],
  },
  debriefLose: { speaker: 'DISPATCH', lines: ['The dark swallowed you. Grid goes back up — they\'ll be gone.'] },
  objectives: [
    { id: 'clear', label: 'Neutralize blackout crew', primary: true, type: 'neutralize', count: 8, tag: 'gunman' },
    { id: 'power', label: 'Reach the substation control room', primary: true, type: 'reach', tag: 'control' },
    { id: 'boss', label: 'Take down VOID', primary: true, type: 'boss' },
    { id: 'cuffs', label: 'Optional: Arrest 3 suspects', primary: false, type: 'arrest', count: 3 },
    { id: 'civs', label: 'Optional: No civilians lost in the dark', primary: false, type: 'protect', count: 0 },
  ],
  escalation: {
    at: 4,
    banner: 'GLOWLINE NIGHT OPS FLOOD THE SECTOR',
    spawns: [
      { type: 'dealer', x: 2, y: 2 }, { type: 'soldier', x: 3, y: 2 },
      { type: 'bruiser', x: 30, y: 2 }, { type: 'dealer', x: 29, y: 2 },
    ],
  },
  boss: {
    type: 'shiver', x: 16, y: 2, name: 'VOID',
    intro: 'VOID: "You can\'t arrest what you can\'t see."',
    phase2At: 0.5, phase2Banner: 'VOID KILLS THE EMERGENCY LIGHTS',
    phase2Spawns: [{ type: 'vipguard', x: 12, y: 4 }, { type: 'vipguard', x: 20, y: 4 }],
    surrenderAt: 0.15,
  },
  map: buildMap(34, 18, ({ set, rect, rowFill }) => {
    rowFill(5, '#');
    rect(14, 5, 6, 1, '.'); // control room door
    rect(11, 1, 1, 4, '#'); rect(22, 1, 1, 4, '#');
    set(3, 2, 'V'); set(30, 2, 'V'); // intel
    rect(2, 2, 2, 2, 's'); rect(30, 2, 2, 2, 's');
    set(6, 2, 'E'); set(27, 2, 'E');
    // substation floor
    for (let x = 4; x <= 29; x += 3) for (let y = 7; y <= 10; y += 2) set(x, y, 'c');
    set(8, 8, 'E'); set(15, 8, 'E'); set(22, 8, 'E');
    set(14, 10, 'E'); set(18, 10, 'E');
    set(5, 7, 'E'); set(25, 7, 'E'); // +2 more enemies
    // civilians hiding
    set(5, 13, 'C'); set(28, 13, 'C'); set(12, 15, 'C'); set(21, 15, 'C');
    rowFill(12, '#');
    rect(15, 12, 4, 1, '.');
    rowFill(13, ','); rowFill(14, ',');
    set(16, 14, 'P'); set(17, 14, 'm');
    set(16, 6, 'X'); // control room
  }),
};

MISSIONS.m12 = {
  id: 'm12',
  title: 'M12 — SIGNAL TOWER',
  parSec: 540,
  briefing: {
    speaker: 'DISPATCH',
    lines: [
      'VOID\'s comms unit points here: the Halcyon Signal Tower on the ridge.',
      'This is the nerve center — every Glowline op in the city pings through this relay.',
      'The tower is defended by Civic Shield tactical teams. They\'ve gone full mercenary.',
      'Top of the tower: a Halcyon director. She calls herself CHEMIST\'s handler. Take the tower, break the network.',
    ],
  },
  debriefWin: {
    speaker: 'DISPATCH',
    lines: [
      'Tower secured. The relay logs show every Glowline shipment, every payoff, every Halcyon invoice.',
      'The director\'s drive names the money men downtown. Act Four starts now.',
    ],
  },
  debriefLose: { speaker: 'DISPATCH', lines: ['Tower holds. The network adapts. We go again.'] },
  objectives: [
    { id: 'clear', label: 'Neutralize tower defense', primary: true, type: 'neutralize', count: 10, tag: 'gunman' },
    { id: 'boss', label: 'Take down DIRECTOR VANCE', primary: true, type: 'boss' },
    { id: 'server', label: 'Optional: Access the server core', primary: false, type: 'reach', tag: 'server' },
    { id: 'cuffs', label: 'Optional: Arrest 4 defenders', primary: false, type: 'arrest', count: 4 },
    { id: 'ledger', label: 'Optional: Seize the relay logs + payoff ledger', primary: false, type: 'evidence', count: 2 },
  ],
  escalation: {
    at: 5,
    banner: 'HELO INSERTION — SHIELD REINFORCEMENTS',
    spawns: [
      { type: 'cs_tactical', x: 2, y: 2 }, { type: 'cs_shield', x: 3, y: 2 },
      { type: 'cs_tactical', x: 30, y: 2 }, { type: 'cs_shield', x: 29, y: 2 },
    ],
  },
  boss: {
    type: 'chemist', x: 16, y: 2, name: 'DIRECTOR VANCE',
    intro: 'DIRECTOR VANCE: "You\'re disrupting a very valuable portfolio, officers."',
    phase2At: 0.5, phase2Banner: 'VANCE ACTIVATES THE TOWER\'S DEFENSE GRID',
    phase2Spawns: [{ type: 'cs_shield', x: 12, y: 4 }, { type: 'cs_tactical', x: 20, y: 4 }],
    surrenderAt: 0.2,
  },
  map: buildMap(34, 18, ({ set, rect, rowFill }) => {
    // Tower base
    rowFill(5, '#');
    rect(14, 5, 6, 1, '.');
    rect(11, 1, 1, 4, '#'); rect(22, 1, 1, 4, '#');
    set(3, 2, 'V'); set(30, 2, 'V');
    rect(2, 2, 2, 2, 's'); rect(30, 2, 2, 2, 's');
    set(6, 2, 'E'); set(27, 2, 'E');
    // Tower ascent - catwalks
    for (let y = 7; y <= 11; y += 2) rowFill(y, '.');
    for (let x = 5; x <= 28; x += 4) for (let y = 7; y <= 11; y += 2) set(x, y, 'c');
    // Defenders on catwalks
    set(9, 7, 'E'); set(17, 7, 'E'); set(25, 7, 'E');
    set(7, 9, 'E'); set(15, 9, 'E'); set(23, 9, 'E');
    set(11, 11, 'E'); set(19, 11, 'E');
    set(5, 7, 'E'); set(21, 9, 'E'); // +2 more enemies = 10 total
    // Server core
    rect(14, 11, 6, 1, '#');
    set(16, 11, '.'); set(17, 11, 'X');
    // Top platform - boss
    rowFill(14, '#');
    rect(14, 14, 6, 1, '.');
    rowFill(15, ','); rowFill(16, ',');
    set(2, 15, 'P'); set(30, 15, 'm');
    set(5, 15, 'V'); set(28, 15, 'V'); // evidence pickups
  }),
};

MISSIONS.op5 = {
  id: 'op5',
  title: 'OP5 — ROOFTOP SWEEP',
  parSec: 240,
  briefing: {
    speaker: 'DISPATCH',
    lines: [
      'Glowline snipers took positions on the rooftops overlooking the precinct.',
      'Clear them before the shift change. Fast, quiet, no civilians on the roofs.',
    ],
  },
  debriefWin: { speaker: 'DISPATCH', lines: ['Rooftops clear. Precinct sightlines secured.'] },
  debriefLose: { speaker: 'DISPATCH', lines: ['Snipers displaced. They\'ll be back.'] },
  objectives: [
    { id: 'clear', label: 'Neutralize rooftop snipers', primary: true, type: 'neutralize', count: 6, tag: 'gunman' },
    { id: 'cuffs', label: 'Optional: Arrest 2', primary: false, type: 'arrest', count: 2 },
  ],
  escalation: null,
  map: buildMap(30, 14, ({ set, rect, rowFill }) => {
    rowFill(1, '#'); rowFill(2, '.');
    for (let x = 3; x < 27; x += 4) rect(x, 2, 1, 3, '#');
    set(4, 3, 'E'); set(12, 3, 'E'); set(20, 3, 'E');
    set(8, 4, 'E'); set(16, 4, 'E'); set(24, 4, 'E');
    rowFill(6, '#');
    rowFill(7, ','); rowFill(8, ','); rowFill(9, ',');
    rowFill(10, '.'); rowFill(11, '.'); rowFill(12, '.');
    set(2, 9, 'P'); set(28, 9, 'w');
  }),
};

MISSIONS.op6 = {
  id: 'op6',
  title: 'OP6 — RIOT LINE',
  parSec: 300,
  enemyPool: ['cs_trooper', 'cs_tactical', 'cs_shield'],
  briefing: {
    speaker: 'DISPATCH',
    lines: [
      'Civic Shield is running a "public order" line downtown. It\'s a shield wall for Glowline extraction.',
      'Break the line, arrest the commanders, and the extraction collapses.',
      'Civilians are caught between. Minimize casualties.',
    ],
  },
  debriefWin: { speaker: 'DISPATCH', lines: ['Line broken. Extraction failed. The press is already calling it a police victory.'] },
  debriefLose: { speaker: 'DISPATCH', lines: ['The line held. Civilians caught in the middle. Regroup.'] },
  objectives: [
    { id: 'clear', label: 'Break the shield wall', primary: true, type: 'neutralize', count: 8, tag: 'gunman' },
    { id: 'boss', label: 'Take down the line commander', primary: true, type: 'boss' },
    { id: 'cuffs', label: 'Optional: Arrest 4 shield officers', primary: false, type: 'arrest', count: 4 },
    { id: 'civs', label: 'Optional: Zero civilian casualties', primary: false, type: 'protect', count: 0 },
  ],
  escalation: {
    at: 4,
    banner: 'SECOND RANK DEPLOYS',
    spawns: [
      { type: 'cs_shield', x: 14, y: 18 }, { type: 'cs_tactical', x: 17, y: 18 },
      { type: 'cs_shield', x: 20, y: 18 }, { type: 'cs_trooper', x: 16, y: 19 },
    ],
  },
  boss: {
    type: 'wrecker', x: 17, y: 2, name: 'COMMANDER HESTER',
    intro: 'COMMANDER HESTER: "This is a lawful assembly. Disperse or be dispersed."',
    phase2At: 0.5, phase2Banner: 'HESTER CALLS FOR PRECISION FIRE',
    phase2Spawns: [{ type: 'cs_tactical', x: 12, y: 5 }, { type: 'cs_tactical', x: 22, y: 5 }],
    surrenderAt: 0.25,
  },
  map: buildMap(36, 22, ({ set, rect, rowFill }) => {
    rowFill(4, '#');
    rect(15, 4, 6, 1, '.');
    rowFill(7, '.'); rowFill(10, '.'); rowFill(13, '.');
    for (let x = 4; x < 32; x += 5) { set(x, 7, 'c'); set(x, 10, 'c'); set(x, 13, 'c'); }
    set(8, 7, 'E'); set(16, 7, 'E'); set(24, 7, 'E');
    set(6, 10, 'E'); set(14, 10, 'E'); set(22, 10, 'E'); set(30, 10, 'E');
    set(10, 13, 'E'); set(18, 13, 'E'); set(26, 13, 'E');
    set(4, 8, 'C'); set(14, 8, 'C'); set(24, 8, 'C');
    set(6, 11, 'C'); set(16, 11, 'C'); set(26, 11, 'C');
    rowFill(16, '#');
    rect(14, 16, 8, 1, '.');
    rowFill(19, ',');
    set(3, 17, 'P'); set(32, 17, 'm');
    set(17, 3, 'X');
  }),
};

MISSIONS.m13 = {
  id: 'm13',
  title: 'M13 — THE RIG',
  parSec: 540,
  signage: 'industrial',
  briefing: {
    speaker: 'DISPATCH',
    lines: [
      'The relay logs from the Signal Tower point offshore — Halcyon\'s "wellness" platform, The Rig.',
      'It sits in international waters, but the product pipeline runs through it. We have a warrant. Barely.',
      'The platform is a fortress. Helipad, submarine pen, and a director who thinks diplomatic immunity applies to drug trafficking.',
      'Her name is GRAFT. No — different GRAFT. This one calls herself THE CHEMIST\'s successor. She goes by WRACK.',
    ],
  },
  debriefWin: {
    speaker: 'DISPATCH',
    lines: [
      'The Rig is listing. WRACK is neutralized. The submarine pen had a manifest — every Halcyon shell company, every dirty account.',
      'The money leads to Halcyon HQ downtown. The penthouse. This ends tonight.',
    ],
  },
  debriefLose: { speaker: 'DISPATCH', lines: ['The Rig sails on. The paper trail burns. We lost the thread.'] },
  objectives: [
    { id: 'clear', label: 'Neutralize platform security', primary: true, type: 'neutralize', count: 10, tag: 'gunman' },
    { id: 'boss', label: 'Take down WRACK', primary: true, type: 'boss' },
    { id: 'pen', label: 'Optional: Reach the submarine pen', primary: false, type: 'reach', tag: 'pen' },
    { id: 'cuffs', label: 'Optional: Arrest 4 security', primary: false, type: 'arrest', count: 4 },
    { id: 'ledger', label: 'Optional: Seize the manifest + the crypto keys', primary: false, type: 'evidence', count: 2 },
  ],
  escalation: {
    at: 5,
    banner: 'HELO QRF FROM THE MAINLAND',
    spawns: [
      { type: 'cs_tactical', x: 2, y: 16 }, { type: 'cs_shield', x: 3, y: 16 },
      { type: 'cs_tactical', x: 38, y: 16 }, { type: 'cs_shield', x: 39, y: 16 },
    ],
  },
  boss: {
    type: 'wrecker', x: 21, y: 3, name: 'WRACK',
    intro: 'WRACK: "You have jurisdiction over nothing. This platform is a sovereign asset."',
    phase2At: 0.5, phase2Banner: 'WRACK DETACHES THE HELIPAD',
    phase2Spawns: [{ type: 'cs_shield', x: 14, y: 6 }, { type: 'cs_tactical', x: 28, y: 6 }],
    surrenderAt: 0.15,
  },
  map: buildMap(42, 20, ({ set, rect, rowFill }) => {
    rowFill(4, '#');
    rect(18, 4, 6, 1, '.');
    for (let y = 6; y <= 14; y += 2) rowFill(y, '.');
    for (let x = 5; x <= 36; x += 4) for (let y = 6; y <= 14; y += 2) set(x, y, 'c');
    set(8, 6, 'E'); set(16, 6, 'E'); set(24, 6, 'E'); set(32, 6, 'E');
    set(10, 8, 'E'); set(18, 8, 'E'); set(26, 8, 'E'); set(34, 8, 'E');
    set(12, 10, 'E'); set(20, 10, 'E'); set(28, 10, 'E');
    set(14, 12, 'E'); set(22, 12, 'E');
    set(18, 14, 'E');
    rect(18, 14, 6, 1, '#');
    rect(19, 15, 4, 1, 'X');
    rowFill(17, ','); rowFill(18, ',');
    set(3, 17, 'P'); set(38, 17, 'm');
    set(5, 17, 'V'); set(35, 17, 'V'); // evidence pickups
  }),
};

MISSIONS.m14 = materializeLayout({
  id: 'm14',
  title: 'M14 — HALCYON HQ',
  parSec: 600,
  // Layout archetype: you breach through the south reception/lift lobby, push up
  // the open-plan floor, and corner THE ARCHITECT in the executive suite — a real
  // approach instead of a sealed box you start in the corner of.
  layout: { archetype: 'office', size: [34, 20], entrance: 'reception-s', seed: 14 },
  // 12 security for the clear objective, spread across the flow (reception ->
  // open-plan -> exec). 2 evidence, medkit at reception, server-grid gate mid-floor.
  enemies: [
    { zone: 'reception', count: 2 },
    { zone: 'openPlan', count: 7 },
    { zone: 'exec', count: 3 },
  ],
  evidenceZoned: [{ zone: 'exec', count: 1 }, { zone: 'openPlan', count: 1 }],
  pickupsZoned: [{ zone: 'reception', ch: 'm' }],
  gatesZoned: [{ zone: 'openPlan' }],
  briefing: {
    speaker: 'DISPATCH',
    lines: [
      'The Rig\'s manifest leads here: Halcyon Wellness headquarters. Glass tower, private security, and a penthouse boardroom where the city\'s fate is auctioned.',
      'Civic Shield has the lobby locked down. We\'re going in the service entrance — elevator shaft, maintenance floors, then up.',
      'The board is in session. Every name on that Rig manifest is in that room. Arrest them all.',
      'The CEO calls himself THE ARCHITECT. He built this city\'s sickness. Tonight we demolish it.',
    ],
  },
  debriefWin: {
    speaker: 'DISPATCH',
    lines: [
      'Halcyon HQ is ours. The board operation is broken. The Architect\'s records will bury every politician on the payroll.',
      'One last loose end: the penthouse server grid. It\'s still broadcasting. Shut it down and the city breathes again.',
    ],
  },
  debriefLose: { speaker: 'DISPATCH', lines: ['The tower holds. The money wins tonight. We come back at dawn.'] },
  objectives: [
    { id: 'clear', label: 'Neutralize Halcyon security', primary: true, type: 'neutralize', count: 12, tag: 'gunman' },
    { id: 'boss', label: 'Take down THE ARCHITECT', primary: true, type: 'boss' },
    { id: 'server', label: 'Reach the penthouse server grid', primary: true, type: 'reach' },
    { id: 'cuffs', label: 'Optional: Arrest 6 executives', primary: false, type: 'arrest', count: 6 },
    { id: 'ledger', label: 'Optional: Seize the master ledger + encryption keys', primary: false, type: 'evidence', count: 2 },
  ],
  escalation: {
    at: 6,
    banner: 'PENTHOUSE BLAST DOORS SEAL — INTERNAL DEFENSES ONLINE',
    spawns: [
      { type: 'cs_tactical', zone: 'reception' }, { type: 'cs_shield', zone: 'reception' },
      { type: 'cs_tactical', zone: 'openPlan' }, { type: 'cs_shield', zone: 'openPlan' },
    ],
  },
  boss: {
    type: 'graft', zone: 'exec', name: 'THE ARCHITECT',
    intro: 'THE ARCHITECT: "You\'re not police. You\'re a symptom. I\'ll prescribe the cure."',
    phase2At: 0.5, phase2Banner: 'THE ARCHITECT ACTIVATES THE BUILDING AI',
    phase2Spawns: [{ type: 'cs_shield', zone: 'exec' }, { type: 'cs_tactical', zone: 'openPlan' }],
    surrenderAt: 0.1,
  },
});

MISSIONS.m15 = {
  id: 'm15',
  title: 'M15 — CITY ON FIRE',
  parSec: 360,
  playerVehicle: { type: 'patrol', x: 4, y: 10 },
  vehicles: [
    { type: 'armoured', x: 28, y: 8, tag: 'truck', ai: 'convoy', cruise: 180 },
    { type: 'gangcar', x: 32, y: 7, tag: 'escort', ai: 'escort', cruise: 280 },
    { type: 'gangcar', x: 32, y: 12, tag: 'escort', ai: 'escort', cruise: 280 },
    { type: 'gangbike', x: 36, y: 9, tag: 'outrider', ai: 'escort', cruise: 350 },
    { type: 'gangbike', x: 36, y: 13, tag: 'outrider', ai: 'escort', cruise: 350 },
  ],
  traffic: { rows: [3, 5, 9, 11], eastRows: [9, 11], rate: 3.0, max: 6 },
  briefing: {
    speaker: 'DISPATCH',
    lines: [
      'The raid on the Architect triggered a dead-man switch. Halcyon is burning the city\'s data centers — and the evidence inside them.',
      'A convoy of armoured trucks is racing for the highway, loaded with server racks. If they reach the interchange, the data scatters to a thousand shell companies.',
      'You have the interceptor. The city is burning — riots, fires, Civic Shield deserting posts. Drive through it.',
      'At the river crossing you have a choice: the BRIDGE (fast, exposed, heavy resistance) or the TUNNEL (slow, tight, spike strips). Choose your line.',
      'The convoy commander is a mercenary called THE WRECKER. He\'s been waiting for this payday.',
    ],
  },
  debriefWin: {
    speaker: 'DISPATCH',
    lines: [
      'Convoy stopped. Server racks secured. The Architect\'s dead-man switch just became our evidence locker.',
      'The city is still burning, but the fire has a perimeter now. One last op: the penthouse grid.',
    ],
  },
  debriefLose: { speaker: 'DISPATCH', lines: ['The convoy crossed the river. The data is gone. The city burns for nothing.'] },
  objectives: [
    { id: 'clear', label: 'Disable the convoy screen', primary: true, type: 'neutralize', count: 4, tag: 'escort' },
    { id: 'boss', label: 'Stop the convoy and take down THE WRECKER', primary: true, type: 'boss' },
    { id: 'route', label: 'Choose your line: Bridge or Tunnel', primary: true, type: 'reach', tag: 'route' },
    { id: 'cuffs', label: 'Optional: Arrest 2 mercenaries', primary: false, type: 'arrest', count: 2 },
    { id: 'civs', label: 'Optional: Minimize collateral damage', primary: false, type: 'protect', count: 2 },
  ],
  escalation: {
    at: 2,
    atVanFrac: 0.4,
    banner: 'THE WRECKER COMMITS HIS RESERVES',
    spawns: [],
    vehicles: [
      { type: 'armoured', x: 8, y: 10, tag: 'wrecker', ai: 'escort', cruise: 300 },
    ],
  },
  boss: {
    type: 'wrecker', x: 100, y: 10, trigger: 'wrecker', name: 'THE WARDEN',
    intro: 'THE WARDEN: "This evidence leaves the city over my wreckage. I can arrange that."',
    phase2At: 0.5, phase2Banner: 'THE WARDEN TURNS THE CONVOY INTO A RAM',
    phase2Spawns: [],
    surrenderAt: 0.2,
  },
  map: buildMap(140, 16, ({ set, rect, rowFill }) => {
    rowFill(1, ','); rowFill(2, ',');
    rowFill(3, '~'); rowFill(4, '~'); rowFill(5, '~');
    rowFill(6, '=');
    for (let x = 10; x < 138; x += 18) set(x, 6, '~');
    rowFill(7, '~'); rowFill(8, '~'); rowFill(9, '~');
    rowFill(10, '~'); rowFill(11, '~'); rowFill(12, '~');
    rowFill(13, ','); rowFill(14, ',');
    // Bridge path (top lanes) - exposed, enemies
    for (let x = 30; x < 80; x += 4) { set(x, 3, '^'); set(x, 4, '^'); }
    set(50, 3, 'E'); set(55, 3, 'E'); set(60, 3, 'E'); set(65, 3, 'E');
    // Tunnel path (bottom lanes) - tight, spike strips
    for (let x = 30; x < 80; x += 6) { set(x, 11, '^'); set(x, 12, '^'); }
    set(50, 12, 'E'); set(60, 12, 'E');
    set(4, 10, 'P');
    set(110, 10, 'X'); // route choice gate
    set(125, 10, 'X'); // end gate
    for (let x = 16; x < 138; x += 31) { set(x, 1, 'c'); set(x + 4, 14, 'c'); }
  }),
};

MISSIONS.m16 = {
  id: 'm16',
  title: 'M16 — THE PENTHOUSE GRID',
  parSec: 600,
  briefing: {
    speaker: 'DISPATCH',
    lines: [
      'The server racks from the convoy point here: the Penthouse Grid. A fortress atop the Halcyon tower, air-gapped, hardened, and broadcasting the city\'s secrets to the highest bidder.',
      'The Architect gave up the access codes under pressure. We have a window — minutes before the encryption rotates.',
      'Halcyon director Warren is inside with Civic Shield\'s remaining inner circle. He\'s using the city\'s elite as human shields.',
      'End this. Shut down the Grid. Arrest everyone. The city watches.',
    ],
  },
  debriefWin: {
    speaker: 'DISPATCH',
    lines: [
      'The Grid is dark. The broadcast is cut. The Architect\'s empire is in evidence bags.',
      'WARREN is neutralized. The Civic Shield charter is revoked. Halcyon Wellness is seized.',
      'Vice Grid, you didn\'t just win a case. You broke the machine.',
      'The city exhales. Good work, officers. Good work.',
    ],
  },
  debriefLose: { speaker: 'DISPATCH', lines: ['The Grid holds. The machine keeps grinding. We regroup at dawn.'] },
  objectives: [
    { id: 'clear', label: 'Neutralize the inner circle', primary: true, type: 'neutralize', count: 10, tag: 'gunman' },
    { id: 'boss', label: 'Take down WARREN', primary: true, type: 'boss' },
    { id: 'grid', label: 'Shut down the Penthouse Grid', primary: true, type: 'reach', tag: 'grid' },
    { id: 'cuffs', label: 'Optional: Arrest 5 executives', primary: false, type: 'arrest', count: 5 },
    { id: 'ledger', label: 'Optional: Seize the final ledger + encryption keys', primary: false, type: 'evidence', count: 2 },
  ],
  escalation: {
    at: 5,
    banner: 'WARREN\'S PERSONAL DETAIL DEPLOYS',
    spawns: [
      { type: 'cs_shield', x: 2, y: 2 }, { type: 'cs_tactical', x: 3, y: 2 },
      { type: 'cs_shield', x: 30, y: 2 }, { type: 'cs_tactical', x: 31, y: 2 },
    ],
  },
  boss: {
    type: 'graft', x: 16, y: 2, name: 'WARREN',
    intro: 'WARREN: "This city runs on contracts, officers. You are an accounting error."',
    phase2At: 0.5, phase2Banner: 'WARREN UNLOCKS THE VAULT — HEAVY ARMOR DEPLOYS',
    phase2Spawns: [{ type: 'cs_shield', x: 10, y: 5 }, { type: 'cs_shield', x: 22, y: 5 }],
    surrenderAt: 0.1,
  },
  map: buildMap(34, 20, ({ set, rect, rowFill }) => {
    rowFill(4, '#');
    rect(14, 4, 6, 1, '.');
    for (let y = 5; y <= 13; y += 2) {
      rowFill(y, '.');
      for (let x = 4; x <= 29; x += 5) set(x, y, 'c');
    }
    set(6, 5, 'E'); set(14, 5, 'E'); set(22, 5, 'E'); set(30, 5, 'E');
    set(8, 7, 'E'); set(16, 7, 'E'); set(24, 7, 'E');
    set(10, 9, 'E'); set(18, 9, 'E'); set(26, 9, 'E');
    set(12, 11, 'E'); set(20, 11, 'E');
    set(14, 13, 'E'); set(18, 13, 'E');
    rowFill(15, '#');
    rect(14, 15, 6, 1, '.');
    rowFill(16, '.');
    set(16, 16, 'X');
    rowFill(17, ','); rowFill(18, ',');
    set(2, 17, 'P'); set(30, 17, 'm');
    set(3, 5, 'V'); set(30, 5, 'V');
    set(5, 18, 'w'); set(28, 18, 'p');
  }),
  // the boardroom floor of a wellness empire: lounge seating, a private suite
  furnish: [
    { rect: [1, 6, 11, 4], role: 'lounge' },
    { rect: [22, 6, 11, 4], role: 'executive' },
    { rect: [1, 11, 11, 4], role: 'lounge' },
    { rect: [22, 11, 11, 4], role: 'conference' },
  ],
};

MISSIONS.op7 = {
  id: 'op7',
  title: 'OP7 — HALCYON RECORDS',
  parSec: 300,
  briefing: {
    speaker: 'DISPATCH',
    lines: [
      'Post-op cleanup. Halcyon\'s physical archives are in a sub-basement vault.',
      'Grab everything. Financials, R&D, the "wellness" trial data. Score attack — maximize evidence in the time limit.',
    ],
  },
  debriefWin: { speaker: 'DISPATCH', lines: ['Archives secured. The paper trail is complete.'] },
  debriefLose: { speaker: 'DISPATCH', lines: ['Time up. Whatever\'s left burns.'] },
  objectives: [
    { id: 'clear', label: 'Neutralize vault security', primary: true, type: 'neutralize', count: 8, tag: 'gunman' },
    { id: 'ledger', label: 'Seize archive boxes', primary: true, type: 'evidence', count: 5 },
    { id: 'cuffs', label: 'Optional: Arrest 3', primary: false, type: 'arrest', count: 3 },
  ],
  escalation: null,
  map: buildMap(30, 16, ({ set, rect, rowFill }) => {
    rowFill(3, '#');
    rect(12, 3, 6, 1, '.');
    for (let y = 5; y <= 11; y += 2) {
      rowFill(y, '.');
      for (let x = 4; x <= 25; x += 4) set(x, y, 's');
    }
    set(6, 5, 'E'); set(14, 5, 'E'); set(22, 5, 'E');
    set(8, 7, 'E'); set(16, 7, 'E'); set(24, 7, 'E');
    set(10, 9, 'E'); set(18, 9, 'E');
    set(12, 11, 'E');
    set(3, 5, 'V'); set(26, 5, 'V'); set(5, 7, 'V'); set(24, 7, 'V'); set(14, 9, 'V');
    rowFill(13, '#');
    rect(12, 13, 6, 1, '.');
    rowFill(14, ','); rowFill(15, ',');
    set(2, 14, 'P'); set(27, 14, 'm');
  }),
};

MISSIONS.op8 = {
  id: 'op8',
  title: 'OP8 — FINAL SCORE ATTACK',
  parSec: 420,
  briefing: {
    speaker: 'DISPATCH',
    lines: [
      'Campaign over. This is the victory lap — or the victory grind.',
      'Every remaining Glowline stash house, every Civic Shield safehouse, every Halcyon drop point. One map. No par time. Just the scoreboard.',
      'Go until you drop. The city is yours.',
    ],
  },
  debriefWin: { speaker: 'DISPATCH', lines: ['Top of the board. The city is clean. For now.'] },
  debriefLose: { speaker: 'DISPATCH', lines: ['Run it back. The board resets.'] },
  objectives: [
    { id: 'clear', label: 'Neutralize all hostiles', primary: true, type: 'neutralize', count: 20, tag: 'gunman' },
    { id: 'ledger', label: 'Seize all evidence', primary: true, type: 'evidence', count: 8 },
    { id: 'cuffs', label: 'Arrest everyone', primary: false, type: 'arrest', count: 10 },
    { id: 'civs', label: 'Zero civilian casualties', primary: false, type: 'protect', count: 0 },
  ],
  escalation: {
    at: 10,
    banner: 'ENDLESS WAVE',
    spawns: [
      { type: 'cs_tactical', x: 2, y: 2 }, { type: 'cs_shield', x: 3, y: 2 },
      { type: 'bruiser', x: 30, y: 2 }, { type: 'dealer', x: 31, y: 2 },
    ],
  },
  map: buildMap(34, 20, ({ set, rect, rowFill }) => {
    for (let y = 3; y <= 15; y += 2) {
      rowFill(y, '.');
      for (let x = 4; x <= 29; x += 4) set(x, y, y % 4 === 1 ? 'c' : 's');
    }
    for (let y = 3; y <= 15; y += 3) {
      set(6, y, 'E'); set(14, y, 'E'); set(22, y, 'E'); set(30, y, 'E');
    }
    set(10, 6, 'E'); // +1 extra enemy for validation
    set(3, 3, 'V'); set(30, 3, 'V');
    set(5, 7, 'V'); set(28, 7, 'V');
    set(10, 11, 'V'); set(23, 11, 'V');
    set(16, 15, 'V');
    set(14, 7, 'V'); // +1 extra evidence for validation (8 total)
    rowFill(17, '#');
    rect(14, 17, 6, 1, '.');
    rowFill(18, ','); 
    set(2, 18, 'P'); set(31, 18, 'm');
  }),
};

// Campaign metadata is the source of truth for where a mission takes place.
// Copy it onto the runtime definition once, keeping renderers data-driven.
for (const entry of CAMPAIGN) {
  if (MISSIONS[entry.id]) MISSIONS[entry.id].environment = entry.environment;
}
