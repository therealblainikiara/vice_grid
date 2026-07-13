// objectives.js — mission objective progression. Pure; no DOM.
//
// Objective defs (from missions.js):
//   { id, label, primary: true|false, type, count?, tag? }
// Types: 'neutralize' (arrest OR kill OR down tagged enemies),
//        'arrest' (cuffs only), 'evidence', 'protect' (fail if hurt > count),
//        'boss', 'reach' (touch a zone), 'survive' (escalation timer).

export function createObjectives(defs) {
  return defs.map((d) => ({ ...d, progress: 0, done: false, failed: false }));
}

// Events: {type:'neutralized'|'arrested'|'evidence'|'civilianHurt'|'bossDown'|
//          'reached'|'survived', tag?}
export function applyEvent(objectives, ev) {
  for (const o of objectives) {
    if (o.done || o.failed) continue;
    switch (o.type) {
      case 'neutralize':
        if ((ev.type === 'neutralized' || ev.type === 'arrested') && matchTag(o, ev)) bump(o);
        break;
      case 'arrest':
        if (ev.type === 'arrested' && matchTag(o, ev)) bump(o);
        break;
      case 'evidence':
        if (ev.type === 'evidence') bump(o);
        break;
      case 'protect':
        if (ev.type === 'civilianHurt') {
          o.progress += 1;
          if (o.progress > (o.count ?? 0)) o.failed = true;
        }
        break;
      case 'boss':
        if (ev.type === 'bossDown') o.done = true;
        break;
      case 'reach':
        if (ev.type === 'reached' && matchTag(o, ev)) o.done = true;
        break;
      case 'survive':
        if (ev.type === 'survived') o.done = true;
        break;
    }
  }
  return objectives;
}

function matchTag(o, ev) { return !o.tag || o.tag === ev.tag; }
function bump(o) {
  o.progress += 1;
  if (o.progress >= (o.count ?? 1)) o.done = true;
}

export function primaryComplete(objectives) {
  return objectives.filter((o) => o.primary).every((o) => o.done);
}

export function primaryFailed(objectives) {
  return objectives.some((o) => o.primary && o.failed);
}

export function summary(objectives) {
  return objectives.map((o) => ({
    id: o.id, label: o.label, primary: o.primary,
    done: o.done, failed: o.failed,
    progress: o.progress, count: o.count ?? (o.type === 'protect' ? o.count : 1),
  }));
}
