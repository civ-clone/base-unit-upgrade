import Advance from '@civ-clone/core-science/Advance';
import Player from '@civ-clone/core-player/Player';
import { RoleType } from '@civ-clone/base-unit-role/UnitRole';
import RuleRegistry from '@civ-clone/core-rule/RuleRegistry';
import { roleOf } from '@civ-clone/base-unit-role/roleOf';
import Unit from '@civ-clone/core-unit/Unit';

export type UnitType = typeof Unit;
export type AdvanceType = typeof Advance;

/**
 * What a rule set knows about its unit types, as its unit table holds it. Every function answers for a type, never for
 *  a unit, so the answer can't depend on game state.
 */
export interface UpgradeTable {
  /**
   * The types a unit may become, in the rule set's table order. When several fit, the **last** wins: the original
   *  loops over the whole table with no `break` (OpenCiv2 `civ_leonardo_upgrade`).
   */
  types: readonly UnitType[];
  /** The advance a type needs, or `null` for none. */
  prerequisite: (Type: UnitType) => AdvanceType | null;
  /** The advance that makes a type obsolete, or `null` for none. */
  obsoletedBy: (Type: UnitType) => AdvanceType | null;
  /** How many units a type carries: a target must carry at least as many as the unit it replaces. */
  hold: (Type: UnitType) => number;
  /** A type's role. A type with no role (`null`) never upgrades and is never a target. */
  role: (Type: UnitType) => RoleType | null;
}

/**
 * The advance that replaces a unit's obsoleting advance for this unit, or `undefined` to keep it. See
 *  `weakerUnitsOfRole`.
 */
export type UpgradeAdvance = (
  unit: Unit,
  player: Player
) => AdvanceType | null | undefined;

export interface UpgradeOptions extends UpgradeTable {
  /** Whether `player` has `Advance`. */
  hasAdvance: (player: Player, Advance: AdvanceType) => boolean;
  /** Tried in order before the obsoleting advance; the first that doesn't answer `undefined` wins. */
  upgradeAdvances?: readonly UpgradeAdvance[];
}

/**
 * The advance that upgrades `unit`: the first answer of `upgradeAdvances`, otherwise the advance that makes its type
 *  obsolete. `null` if there is none.
 */
export const upgradeAdvance = (
  unit: Unit,
  { obsoletedBy, upgradeAdvances = [] }: UpgradeOptions
): AdvanceType | null => {
  const player = unit.player();

  for (const candidate of upgradeAdvances) {
    const answer = candidate(unit, player);

    if (answer !== undefined) {
      return answer;
    }
  }

  return obsoletedBy(unit.sourceClass<UnitType>());
};

/**
 * The type `unit` upgrades to, or `null`. OpenCiv2 `civ_leonardo_upgrade` (`src/auto/civ.cpp`):
 *
 * 1. the upgrading advance is the type's obsoleting advance, unless an `upgradeAdvances` entry replaces it;
 * 2. the unit's player must have that advance;
 * 3. a target is a type whose prerequisite is that advance, with the same role and a hold at least as large;
 * 4. of several targets, the last in `types` wins.
 *
 * One step only: a target that is itself obsolete upgrades on a later call. The unit's own type is never its target
 *  (the original would only strip its veteran status).
 */
export const upgradeTarget = (
  unit: Unit,
  options: UpgradeOptions
): UnitType | null => {
  const Advance = upgradeAdvance(unit, options);

  if (Advance === null || !options.hasAdvance(unit.player(), Advance)) {
    return null;
  }

  const Type = unit.sourceClass<UnitType>(),
    role = options.role(Type);

  if (role === null) {
    return null;
  }

  const hold = options.hold(Type);

  let target: UnitType | null = null;

  options.types.forEach((Candidate: UnitType): void => {
    if (
      Candidate !== Type &&
      options.prerequisite(Candidate) === Advance &&
      options.role(Candidate) === role &&
      hold <= options.hold(Candidate)
    ) {
      target = Candidate;
    }
  });

  return target;
};

export interface WeakerUnitsOfRoleOptions {
  /** The role whose weaker types upgrade early. */
  role: RoleType;
  /** A type's defence, from the rule set's table (not the unit's yield, which veterans and terrain change). */
  defence: (Type: UnitType) => number;
  /** Types whose defence is below this upgrade… */
  below: number;
  /** …once their player has this advance, which then replaces their obsoleting advance. */
  Advance: AdvanceType;
  hasAdvance: (player: Player, Advance: AdvanceType) => boolean;
  /** A type's role: `UpgradeTable['role']`. */
  roleOf: (Type: UnitType) => RoleType | null;
}

/**
 * An `UpgradeAdvance`: units of `role` whose type's defence is below `below` upgrade with `Advance` once their player
 *  has it, whatever makes their type obsolete, so the oldest of them skip a step. Civilization II passes its defend
 *  role, defence 3 and advance 35 (OpenCiv2 `civ_leonardo_upgrade`, `src/auto/civ.cpp`).
 */
export const weakerUnitsOfRole =
  ({
    role,
    defence,
    below,
    Advance,
    hasAdvance,
    roleOf,
  }: WeakerUnitsOfRoleOptions): UpgradeAdvance =>
  (unit: Unit, player: Player): AdvanceType | undefined => {
    const Type = unit.sourceClass<UnitType>();

    return roleOf(Type) === role &&
      defence(Type) < below &&
      hasAdvance(player, Advance)
      ? Advance
      : undefined;
  };

/** `UpgradeTable['role']` from the `UnitRoles` rules in a game's `ruleRegistry` (`@civ-clone/base-unit-role`). */
export const rolesIn =
  (ruleRegistry: RuleRegistry) =>
  (Type: UnitType): RoleType | null =>
    roleOf(Type, ruleRegistry);
