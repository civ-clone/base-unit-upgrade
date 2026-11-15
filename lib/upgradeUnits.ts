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
import {
  TransportRegistry,
  instance as transportRegistryInstance,
} from '@civ-clone/core-unit-transport/TransportRegistry';
import { isTransport } from '@civ-clone/core-unit-transport/Transport';

/** The registries a unit of a `Transport(Base)` type (core-unit-transport) holds. */
export interface TransportRegistries {
  /** Default: core-unit-transport's `TransportRegistry` instance, as the mixin's own field defaults to. */
  transportRegistry?: TransportRegistry;
  /** Default: core-rule's `RuleRegistry` instance, as the mixin's own field defaults to. */
  transportRuleRegistry?: RuleRegistry;
}

// The mixin's two collaborators, which its field initialisers set when a unit is constructed.
const transportFields = ['_transportRegistry', '_transportRuleRegistry'];

/**
 * Makes `unit` a `Type`, in place, as the original rewrites a unit's type byte and nothing else (OpenCiv2
 *  `civ_leonardo_upgrade`: `units[unit].type = unit_type3`). It stays the same object, as a transferred unit does
 *  (`Unit#transfer`), so its id, square, home city, damage, orders, busy state, unit improvements, cargo and pending
 *  effects all stay with it, and so does everything that refers to it. Its saved class is read from it each time, so a
 *  save follows. A client doesn't learn of the change by itself: it must handle `unit:upgraded` (`upgradedRules`).
 *
 * The original keeps the moves *spent* this turn, not the moves left, so the unit has its new type's movement less
 *  what it has already spent (never less than 0). Damage is kept as it is, in hit points lost.
 *
 * No constructor runs, so no field initialiser of `Type`'s does either. The one kind a unit type has today is
 *  core-unit-transport's `Transport(Base)` mixin: a unit that becomes a transport gets the registries the mixin's
 *  fields would have had (`registries`, or the same defaults), and one that stops being a transport loses them, as they
 *  would otherwise be saved (they're transient only on a transport class).
 *
 * Nothing else changes here: what an upgrade takes away (veteran status, in the original) is up to the `Upgraded`
 *  rules (`upgradedRules`).
 */
export const changeType = (
  unit: Unit,
  Type: UnitType,
  {
    transportRegistry = transportRegistryInstance,
    transportRuleRegistry = ruleRegistryInstance,
  }: TransportRegistries = {}
): void => {
  const spent = unit.movement().value() - unit.moves().value();

  Object.setPrototypeOf(unit, Type.prototype);

  const fields = unit as unknown as Record<string, unknown>;

  if (isTransport(unit)) {
    if (!('_transportRegistry' in fields)) {
      fields._transportRegistry = transportRegistry;
    }

    if (!('_transportRuleRegistry' in fields)) {
      fields._transportRuleRegistry = transportRuleRegistry;
    }
  } else {
    transportFields.forEach((field: string): void => {
      delete fields[field];
    });
  }

  unit.moves().set(Math.max(0, unit.movement().value() - spent));
};

export interface UpgradeUnitsOptions
  extends UpgradeOptions,
    TransportRegistries {
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
    transportRegistry,
    transportRuleRegistry,
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

      changeType(unit, Target, { transportRegistry, transportRuleRegistry });

      ruleRegistry.process(Upgraded, unit, From);

      return [[unit, From, Target]];
    });

export default upgradeUnits;
