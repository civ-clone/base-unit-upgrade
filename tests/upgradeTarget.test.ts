import {
  Advance11,
  Advance17,
  Advance23,
  Advance29,
  Advance35,
  Advance37,
  Advance45,
  Advance57,
  Row11,
  Row15,
  Row19,
  Row2,
  Row3,
  Row32,
  Row33,
  Row34,
  Row35,
  Row36,
  Row37,
  Row43,
  Row6,
  Row7,
  known,
  options,
  table,
} from './table';
import {
  AdvanceType,
  UnitType,
  rolesIn,
  upgradeAdvance,
  upgradeTarget,
} from '../lib/upgradeTarget';
import { AttackRole, DefendRole } from '@civ-clone/base-unit-role/Roles';
import Advance from '@civ-clone/core-science/Advance';
import Player from '@civ-clone/core-player/Player';
import RuleRegistry from '@civ-clone/core-rule/RuleRegistry';
import Tile from '@civ-clone/core-world/Tile';
import Unit from '@civ-clone/core-unit/Unit';
import { expect } from 'chai';
import { unitRole } from '@civ-clone/base-unit-role/Rules/UnitRoles';

// OpenCiv2 (github.com/richardpenman/civ2), `civ_leonardo_upgrade` (`src/auto/civ.cpp`), against Civilization II's
//  unit table (`tests/table.ts`). Each expected target was worked out over all 51 rows, not only this slice.

const ruleRegistry = new RuleRegistry(),
  unitOf = (Type: UnitType, ...advances: AdvanceType[]): Unit => {
    const player = new Player(ruleRegistry);

    known.set(player, new Set(advances));

    return new Type(null, player, null as unknown as Tile, ruleRegistry);
  };

describe('upgradeTarget', (): void => {
  it('should give the type whose prerequisite is the obsoleting advance, with the same role', (): void => {
    // Row 3 is obsoleted by 29; row 6 needs 29 and defends too.
    expect(upgradeTarget(unitOf(Row3, Advance29), options)).to.equal(Row6);
    // Row 7 → 11 with 17, row 15 → 19 with 11 (attackers).
    expect(upgradeTarget(unitOf(Row7, Advance17), options)).to.equal(Row11);
    expect(upgradeTarget(unitOf(Row15, Advance11), options)).to.equal(Row19);
    // Transports: 32 → 33 with 57, 33 → 34 with 45, 34 → 43 with 37.
    expect(upgradeTarget(unitOf(Row32, Advance57), options)).to.equal(Row33);
    expect(upgradeTarget(unitOf(Row34, Advance37), options)).to.equal(Row43);
  });

  it('should give nothing until the player has the advance', (): void => {
    expect(upgradeTarget(unitOf(Row3), options)).to.equal(null);
    expect(upgradeTarget(unitOf(Row7, Advance35), options)).to.equal(null);
  });

  it('should give nothing for a type nothing makes obsolete', (): void => {
    expect(
      upgradeTarget(unitOf(Row11, Advance17, Advance35), options)
    ).to.equal(null);
  });

  it('should only give a type of the same role', (): void => {
    // Advance 45 is the prerequisite of rows 34 (transport) and 35 (naval superiority): row 33, a transport, gets 34,
    //  although 35 comes later in the table.
    expect(upgradeTarget(unitOf(Row33, Advance45), options)).to.equal(Row34);
  });

  it('should only give a type with at least the same hold', (): void => {
    // Row 35 (hold 2) and row 36 (hold 0) are both obsoleted by 23, whose only unit is row 37 (hold 0): 36 upgrades,
    //  35 never does.
    expect(upgradeTarget(unitOf(Row36, Advance23), options)).to.equal(Row37);
    expect(upgradeTarget(unitOf(Row35, Advance23), options)).to.equal(null);
  });

  it('should take weaker defensive units straight to the advance that replaces them', (): void => {
    // Defence below row 7's 3, defending, and 35 known: 35 replaces the obsoleting advance (29).
    expect(upgradeTarget(unitOf(Row2, Advance29), options)).to.equal(Row6);
    expect(upgradeTarget(unitOf(Row2, Advance29, Advance35), options)).to.equal(
      Row7
    );
    // It replaces it: with 35 but not 29, row 2 still goes to row 7.
    expect(upgradeTarget(unitOf(Row2, Advance35), options)).to.equal(Row7);
    expect(upgradeAdvance(unitOf(Row2, Advance35), options)).to.equal(
      Advance35
    );
    expect(upgradeAdvance(unitOf(Row2), options)).to.equal(Advance29);
  });

  it('should not take weaker units of another role there', (): void => {
    // Row 15 attacks with defence 1: it waits for 11.
    expect(upgradeAdvance(unitOf(Row15, Advance35), options)).to.equal(
      Advance11
    );
    expect(upgradeTarget(unitOf(Row15, Advance35), options)).to.equal(null);
  });

  it('should go one step at a time', (): void => {
    // Row 3 with 29, 35 and 17 known: 35 (it defends with 2), so row 7, not row 11.
    expect(
      upgradeTarget(unitOf(Row3, Advance29, Advance35, Advance17), options)
    ).to.equal(Row7);
  });

  it('should give the last of several targets in the table', (): void => {
    class Old extends Unit {}
    class First extends Unit {}
    class Second extends Unit {}
    class Later extends Advance {}

    const roles = new Map<UnitType, typeof DefendRole>([
        [Old, DefendRole],
        [First, DefendRole],
        [Second, DefendRole],
      ]),
      inOrder = (types: UnitType[]) => ({
        types,
        obsoletedBy: (Type: UnitType) => (Type === Old ? Later : null),
        prerequisite: (Type: UnitType) => (Type === Old ? null : Later),
        hold: () => 0,
        role: (Type: UnitType) => roles.get(Type) ?? null,
        hasAdvance: () => true,
      });

    expect(upgradeTarget(unitOf(Old), inOrder([Old, First, Second]))).to.equal(
      Second
    );
    expect(upgradeTarget(unitOf(Old), inOrder([Second, First, Old]))).to.equal(
      First
    );
  });

  it('should never give a unit its own type, or a type with no role', (): void => {
    class Odd extends Unit {}
    class Same extends Advance {}

    const base = {
      types: [Odd],
      obsoletedBy: () => Same,
      prerequisite: () => Same,
      hold: () => 0,
      hasAdvance: () => true,
    };

    expect(
      upgradeTarget(unitOf(Odd), { ...base, role: () => DefendRole })
    ).to.equal(null);
    expect(upgradeTarget(unitOf(Odd), { ...base, role: () => null })).to.equal(
      null
    );
  });

  it('should read roles from the `UnitRoles` rules', (): void => {
    const registry = new RuleRegistry();

    registry.register(
      unitRole('test:unit/role', Row2, DefendRole),
      unitRole('test:unit/role', Row15, AttackRole)
    );

    expect(rolesIn(registry)(Row2)).to.equal(DefendRole);
    expect(rolesIn(registry)(Row15)).to.equal(AttackRole);
    expect(rolesIn(registry)(Row7)).to.equal(null);
    expect(table.role(Row7)).to.equal(DefendRole);
  });
});
