import {
  AdvanceType,
  UnitType,
  UpgradeOptions,
  weakerUnitsOfRole,
} from '../lib/upgradeTarget';
import {
  AttackRole,
  DefendRole,
  NavalSuperiorityRole,
  TransportRole,
} from '@civ-clone/base-unit-role/Roles';
import Advance from '@civ-clone/core-science/Advance';
import Player from '@civ-clone/core-player/Player';
import { RoleType } from '@civ-clone/base-unit-role/UnitRole';
import Unit from '@civ-clone/core-unit/Unit';

// A slice of Civilization II's unit table, numbers only: `RULES.TXT` `@UNITS` rows as civ-clone/civ2-unit's
//  `data/units.ts` holds them (obsoleted by, defence, hold, role, prerequisite). Each class is named for its row, each
//  advance for its `@CIVILIZE` index. Roles are numbered as base-unit-role's `roles`: 0 attack, 1 defend, 2 naval
//  superiority, 4 transport.

export class Advance8 extends Advance {}
export class Advance11 extends Advance {}
export class Advance17 extends Advance {}
export class Advance23 extends Advance {}
export class Advance29 extends Advance {}
export class Advance35 extends Advance {}
export class Advance36 extends Advance {}
export class Advance37 extends Advance {}
export class Advance45 extends Advance {}
export class Advance46 extends Advance {}
export class Advance57 extends Advance {}
export class Advance78 extends Advance {}

export class Row2 extends Unit {}
export class Row3 extends Unit {}
export class Row6 extends Unit {}
export class Row7 extends Unit {}
export class Row11 extends Unit {}
export class Row15 extends Unit {}
export class Row19 extends Unit {}
export class Row32 extends Unit {}
export class Row33 extends Unit {}
export class Row34 extends Unit {}
export class Row35 extends Unit {}
export class Row36 extends Unit {}
export class Row37 extends Unit {}
export class Row43 extends Unit {}

type Row = [
  obsoletedBy: AdvanceType | null,
  defence: number,
  hold: number,
  role: RoleType,
  prerequisite: AdvanceType | null
];

export const rows = new Map<UnitType, Row>([
  // @UNITS row 2: obsoleted by 29, defence 1, defend, no prerequisite.
  [Row2, [Advance29, 1, 0, DefendRole, null]],
  // Row 3: obsoleted by 29, defence 2, defend, needs 8.
  [Row3, [Advance29, 2, 0, DefendRole, Advance8]],
  // Row 6: obsoleted by 35, defence 2, defend, needs 29.
  [Row6, [Advance35, 2, 0, DefendRole, Advance29]],
  // Row 7: obsoleted by 17, defence 3, defend, needs 35.
  [Row7, [Advance17, 3, 0, DefendRole, Advance35]],
  // Row 11: never obsolete, defence 4, defend, needs 17.
  [Row11, [null, 4, 0, DefendRole, Advance17]],
  // Row 15: obsoleted by 11, defence 1, attack, needs 36.
  [Row15, [Advance11, 1, 0, AttackRole, Advance36]],
  // Row 19: never obsolete, defence 2, attack, needs 11.
  [Row19, [null, 2, 0, AttackRole, Advance11]],
  // Row 32: obsoleted by 57, defence 1, hold 2, transport, needs 46.
  [Row32, [Advance57, 1, 2, TransportRole, Advance46]],
  // Row 33: obsoleted by 45, defence 1, hold 3, transport, needs 57.
  [Row33, [Advance45, 1, 3, TransportRole, Advance57]],
  // Row 34: obsoleted by 37, defence 2, hold 4, transport, needs 45.
  [Row34, [Advance37, 2, 4, TransportRole, Advance45]],
  // Row 35: obsoleted by 23, defence 2, hold 2, naval superiority, needs 45.
  [Row35, [Advance23, 2, 2, NavalSuperiorityRole, Advance45]],
  // Row 36: obsoleted by 23, defence 4, hold 0, naval superiority, needs 78.
  [Row36, [Advance23, 4, 0, NavalSuperiorityRole, Advance78]],
  // Row 37: never obsolete, defence 4, hold 0, naval superiority, needs 23.
  [Row37, [null, 4, 0, NavalSuperiorityRole, Advance23]],
  // Row 43: never obsolete, defence 3, hold 8, transport, needs 37.
  [Row43, [null, 3, 8, TransportRole, Advance37]],
]);

const row = (Type: UnitType): Row => {
  const found = rows.get(Type);

  if (!found) {
    throw new TypeError(`No row for ${Type.name}.`);
  }

  return found;
};

export const known = new Map<Player, Set<AdvanceType>>();

export const hasAdvance = (player: Player, Advance: AdvanceType): boolean =>
  known.get(player)?.has(Advance) ?? false;

export const table = {
  // In row order.
  types: [...rows.keys()],
  obsoletedBy: (Type: UnitType) => row(Type)[0],
  hold: (Type: UnitType) => row(Type)[2],
  role: (Type: UnitType) => row(Type)[3],
  prerequisite: (Type: UnitType) => row(Type)[4],
};

/** Civilization II's options: defensive units with defence below row 7's (3) upgrade with advance 35. */
export const options: UpgradeOptions = {
  ...table,
  hasAdvance,
  upgradeAdvances: [
    weakerUnitsOfRole({
      role: DefendRole,
      defence: (Type: UnitType) => row(Type)[1],
      below: 3,
      Advance: Advance35,
      hasAdvance,
      roleOf: table.role,
    }),
  ],
};
