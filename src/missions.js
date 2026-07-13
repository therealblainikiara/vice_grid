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
  // Bosses
  chromedog:{ hp: 420, speed: 130, weapon: 'shotgun', personality: 'hard',   color: '#c8ff2f', score: 'boss', armor: 0.3, boss: true },
};

// Full campaign skeleton. `implemented` gates mission select during development;
// the release build requires every entry to be true (validated by tools/validate.js).
export const CAMPAIGN = [
  { id: 'm01', act: 1, n: 1, title: 'Store Siege', type: 'main', implemented: true },
  { id: 'm02', act: 1, n: 2, title: 'Club Neon Raid', type: 'main', implemented: false },
  { id: 'm03', act: 1, n: 3, title: 'Highway Glow Run', type: 'main', implemented: false },
  { id: 'm04', act: 1, n: 4, title: 'Warehouse Intercept', type: 'main', implemented: false },
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

// Ops and later missions reuse this framework; each definition slots into
// MISSIONS as it is built (tracked in DEVELOPMENT_STATE.md).
