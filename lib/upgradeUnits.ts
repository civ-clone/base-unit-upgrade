import {
  RuleRegistry,
  instance as ruleRegistryInstance,
} from '@civ-clone/core-rule/RuleRegistry';
import {
  UnitRegistry,
  instance as unitRegistryInstance,
} from '@civ-clone/core-unit/UnitRegistry';
import { UnitType, UpgradeOptions, upgradeTarget } from './upgradeTarget';
import Player from '@civ-clone/core-player/Player';
import Unit from '@civ-clone/core-unit/Unit';
import Upgraded from './Rules/Upgraded';
import keysChanged from '@civ-clone/core-registry/keysChanged';

/**
 * Makes `unit` a `Type`, in place, as the original rewrites a unit's type byte and nothing else (OpenCiv2
 *  `civ_leonardo_upgrade`: `units[unit].type = unit_type3`). It stays the same object, as a transferred unit does
 *  (`Unit#transfer`), so its id, square, home city, damage, orders, busy state, unit improvements, cargo and pending
 *  effects all stay with it, and so does everything that refers to it. Its saved class and the class sent to clients
 *  are read from it each time, so both follow.
 *
 * The original keeps the moves *spent* this turn, not the moves left, so the unit has its new type's movement less
 *  what it has already spent (never less than 0). Damage is kept as it is, in hit points lost.
 *
 * Nothing else changes here: what an upgrade takes away (veteran status, in the original) is up to the `Upgraded`
 *  rules (`upgradedRules`).
 */
export const changeType = (unit: Unit, Type: UnitType): void => {
  const spent = unit.movement().value() - unit.moves().value();

  Object.setPrototypeOf(unit, Type.prototype);

  unit.moves().set(Math.max(0, unit.movement().value() - spent));

  // The registries file units by owner, square and home, none of which changed, but anything else watching the unit
  //  (a client's view of it) learns it changed.
  keysChanged(unit);
};

export interface UpgradeUnitsOptions extends UpgradeOptions {
  ruleRegistry?: RuleRegistry;
  unitRegistry?: UnitRegistry;
}

export type Upgrade = [unit: Unit, from: UnitType, to: UnitType];

/**
 * Upgrades every unit of `player`'s that has a target (`upgradeTarget`), one step each, all at once, in the order
 *  `unitRegistry` holds them (OpenCiv2 `civ_leonardo_upgrade` walks the whole unit table). Each unit becomes its new
 *  type (`changeType`), then the `Upgraded` rules run for it. Returns what was upgraded, in order.
 *
 * When to call it is the rule set's business: the original calls it for the holder of a wonder after each advance it
 *  discovers, when the wonder is completed, and for the new owner when the wonder's city is captured.
 */
export const upgradeUnits = (
  player: Player,
  {
    ruleRegistry = ruleRegistryInstance,
    unitRegistry = unitRegistryInstance,
    ...options
  }: UpgradeUnitsOptions
): Upgrade[] =>
  unitRegistry
    .getByPlayer(player)
    // A copy: a rule may change the registry.
    .slice()
    .flatMap((unit: Unit): Upgrade[] => {
      const Target = upgradeTarget(unit, options);

      if (Target === null) {
        return [];
      }

      const From = unit.sourceClass<UnitType>();

      changeType(unit, Target);

      ruleRegistry.process(Upgraded, unit, From);

      return [[unit, From, Target]];
    });

export default upgradeUnits;
