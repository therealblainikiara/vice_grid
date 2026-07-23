// furnish.js — semantic room dressing (Art Uplift Phase 3). Pure; no DOM/THREE.
//
// A mission declares rooms: furnish: [{ rect: [tx,ty,tw,th], role }] and this
// module expands them into deterministic furniture placements. BOTH sides
// consume the same expansion so sim and visuals can never drift:
//   world.js    -> solid collision circles (indestructible scenery props)
//   render3d.js -> FURNITURE kit visuals + per-room floor zones
//
// Placements are pixels: { kind, x, y, ry, solid, r, opts }. Zones are tiles:
// { tx, ty, tw, th, floor }. Any placement whose centre tile is occupied on
// the map (walls, pickups, spawns, markers) is dropped, so objective tiles,
// enemy spawns and the boss always keep their footing.

const T = 48;
const px = (t) => t * T;

// collision radius per kind; kinds absent here place as pure decoration
const SOLID_R = {
  officeDesk: 16, cubicle: 20, executiveDesk: 18, sofa: 16, coffeeTable: 10,
  bookshelf: 12, storageShelf: 13, filingCabinet: 9, printerCopier: 11,
  fridge: 10, vendingMachine: 11, breakTable: 10, plant: 6, kitchenRun: 13,
  conferenceSet: 16, coatRack: 5,
};

export function expandFurnish(mission) {
  const out = { placements: [], zones: [] };
  if (!mission.furnish) return out;
  // occupied tiles: anything the map marks (walls, props, pickups, spawns...)
  const busy = new Set();
  (mission.map ?? []).forEach((row, ty) => {
    for (let tx = 0; tx < row.length; tx++) if (row[tx] !== '.' && row[tx] !== ',') busy.add(tx + ',' + ty);
  });
  const add = (kind, tx, ty, ry = 0, opts = undefined) => {
    const key = Math.floor(tx) + ',' + Math.floor(ty);
    if (busy.has(key)) return;
    busy.add(key);
    const r = SOLID_R[kind];
    out.placements.push({ kind, x: px(tx), y: px(ty), ry, solid: r != null, r: r ?? 0, opts });
  };

  for (const room of mission.furnish) {
    const [tx, ty, tw, th] = room.rect;
    const cx = tx + tw / 2, cy = ty + th / 2;
    switch (room.role) {
      case 'cubicles':
        for (let gy = ty + 1, row = 0; gy < ty + th - 0.5; gy += 3, row++) {
          for (let gx = tx + 1, col = 0; gx < tx + tw - 0.5; gx += 4, col++) {
            add('cubicle', gx + 0.5, gy + 0.5, 0, { flip: (row + col) % 2 === 0, off: (row * 3 + col) % 4 === 0 });
          }
        }
        break;
      case 'office':
        add('officeDesk', cx, ty + 1.1, 0);
        add('bookshelf', tx + 0.55, ty + th - 0.75, Math.PI / 2);
        add('plant', tx + tw - 0.6, ty + th - 0.6);
        break;
      case 'executive':
        add('executiveDesk', cx, cy - 0.2, 0);
        add('bookshelf', tx + 0.55, ty + 0.6, Math.PI / 2);
        add('coatRack', tx + tw - 0.6, ty + 0.6);
        add('plant', tx + tw - 0.6, ty + th - 0.6);
        out.zones.push({ tx, ty, tw, th, floor: 'wood' });
        break;
      case 'conference':
        add('conferenceSet', cx, cy, 0);
        add('plant', tx + 0.6, ty + 0.6);
        add('plant', tx + tw - 0.6, ty + th - 0.6);
        break;
      case 'kitchen':
        add('kitchenRun', tx + 1.6, ty + 0.5, 0);
        add('fridge', tx + 3.4, ty + 0.5, 0);
        add('vendingMachine', tx + tw - 1.3, ty + 0.5, 0);
        if (th >= 3) {
          add('breakTable', cx - 0.8, cy + 0.5);
          add('cafeChair', cx - 1.5, cy + 0.5, Math.PI / 2);
          add('cafeChair', cx - 0.1, cy + 0.5, -Math.PI / 2);
          add('breakTable', cx + 1.4, cy + 0.5);
        }
        out.zones.push({ tx, ty, tw, th, floor: 'checker' });
        break;
      case 'storage':
        for (let i = 0; i < Math.floor((tw - 1) / 2); i++) add('storageShelf', tx + 1 + i * 2, ty + 0.55, 0);
        if (th > 3) for (let i = 0; i < Math.floor((tw - 1) / 2); i++) add('storageShelf', tx + 1 + i * 2, ty + th - 0.55, Math.PI);
        out.zones.push({ tx, ty, tw, th, floor: 'concrete' });
        break;
      case 'copier':
        add('printerCopier', tx + 0.6, ty + 0.6, Math.PI / 2);
        add('filingCabinet', tx + 0.55, ty + 1.5, Math.PI / 2);
        add('filingCabinet', tx + 0.55, ty + 2.3, Math.PI / 2);
        break;
      case 'lounge':
        add('sofa', cx - 0.5, cy - 0.55, 0);
        add('coffeeTable', cx - 0.5, cy + 0.45);
        add('plant', tx + 0.55, cy);
        add('waterCooler', tx + tw - 0.55, cy);
        break;
      case 'records':
        for (let i = 0; i < Math.min(4, tw - 1); i++) add('filingCabinet', tx + 0.8 + i * 0.9, ty + 0.55, 0);
        break;
    }
  }
  return out;
}
