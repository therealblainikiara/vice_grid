# VICE GRID — Design Bible

An original arcade successor to late-80s narcotics-enforcement action games,
rebuilt with 2030 presentation. Satirical, stylised, exaggerated. It does not
glorify real drug use and targets no real community — the drug at the story's
core, "GLOW", is a fictional luminescent neuro-stimulant sold by a wellness
conglomerate.

## Tone

Cobalt City, 2030. Privatised policing has failed; the two-person civic task
force VICE GRID is the city's last public law-enforcement unit, funded by a
crowdfunding campaign and a vending-machine sponsorship. Everything is neon,
everything is for sale, and the adverts are lying.

## Agents

| | RHINO — Marta Okafor | VIPER — Dez Calloway |
|---|---|---|
| Armour | 150 HP, damage-resist 25% | 100 HP |
| Move speed | 170 px/s | 235 px/s |
| Weapon sway | minimal | normal |
| Dodge | short shove (staggers enemies) | long roll, more i-frames |
| Arrests | standard cuff speed | 40% faster cuffs, +intimidation |
| Special | can shove heavy props, breaches doors | faster vehicles, silent takedowns |

Both can finish the campaign solo. Co-op combines crowd control + arrest speed.

## Core loop

Briefing → urban combat zone → investigate/pursue → fight (ranged/melee) →
arrest / incapacitate / lethal decision → secure evidence → optional objectives →
escalation or boss → grade (S–D) → upgrade → next mission.

## Arrest system

Enemy morale = f(health, allies down, player aiming at them, distance,
intimidation stat, personality). Low morale → SURRENDER (hands up, drops
weapon). Personalities: `timid` (real surrender), `sly` (fake surrender,
resumes fire), `hard` (fights to low HP), `coward` (flees). Surrendered enemies
are cuffed by holding INTERACT nearby; cuffed suspects yield score,
intel (reveals evidence), and campaign resources. Lethal force is always
available but drags the mission grade and shifts dialogue/endings.

## Campaign — 4 acts, 16 mains, 8 ops, 6+ bosses, 3+ endings

- ACT 1 STREET LEVEL: M01 Store Siege (Boss: CHROME DOG) · M02 Club Neon Raid (Boss: MIDNIGHT) · M03 Highway Glow Run (Boss: TREAD) · M04 Warehouse Intercept (Boss: BIG STACKS)
- ACT 2 THE NETWORK: M05 Port of Cobalt · M06 Tower Block Evac · M07 Convoy Takedown · M08 The Glow Kitchen (Boss: THE CHEMIST)
- ACT 3 THE CITY FIGHTS BACK: M09 Precinct Siege · M10 Evidence Run · M11 Blackout · M12 Signal Tower (Bosses: CAPTAIN GRAFT, STATIC CHOIR)
- ACT 4 THE SOURCE: M13 The Rig · M14 Halcyon HQ · M15 City on Fire · M16 The Penthouse Grid (Bosses: DR. HALO, MOTHER STATIC)
- OPS O1–O8: optional operations unlocked per act (score attack, escort, sweep, defence variants).

### Endings
1. JUSTICE — high arrests, evidence ≥ 80%, Mother Static arrested.
2. COMPROMISED VICTORY — city saved, corruption survives.
3. NEW MANAGEMENT — excessive force / low evidence; the Grid becomes what it fought.
4. SECRET: FULL DISCLOSURE — 100% evidence recovered.

## Grading

S/A/B/C/D from: time vs par, arrest ratio, civilian safety, evidence %,
accuracy, revives used, property damage, optional objectives.

## Upgrades (respec free between missions)

Weapons · Armour · Mobility · Enforcement tools (cuff speed, taser capacity,
intimidation) · Intelligence (evidence radar, morale visibility).

## Visual direction

Neon-vector canvas art: strong silhouettes, faction colour coding (Glowline =
toxic green, Civic Shield = corrupt amber, civilians = soft white, agents =
cyan/magenta), satirical billboard text, adjustable effects intensity,
optional retro scanline filter.

## Audio direction

Procedural WebAudio: industrial percussion + synthwave bass in combat,
dark ambient pads in investigation, adaptive intensity by threat level.
