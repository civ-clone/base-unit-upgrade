import {
  Engine,
  instance as engineInstance,
} from '@civ-clone/core-engine/Engine';
import {
  UnitImprovementRegistry,
  instance as unitImprovementRegistryInstance,
} from '@civ-clone/core-unit-improvement/UnitImprovementRegistry';
import Effect from '@civ-clone/core-rule/Effect';
import Unit from '@civ-clone/core-unit/Unit';
import UnitImprovement from '@civ-clone/core-unit-improvement/UnitImprovement';
import Upgraded from './Rules/Upgraded';

/** An effect: takes the unit's unit improvements of any of `Improvements` away. */
export const loseImprovements =
  (
    Improvements: readonly (typeof UnitImprovement)[],
    unitImprovementRegistry: UnitImprovementRegistry
  ) =>
  (unit: Unit): void =>
    unitImprovementRegistry.unregister(
      ...unitImprovementRegistry
        .getByUnit(unit)
        .filter((unitImprovement: UnitImprovement): boolean =>
          Improvements.some(
            (Improvement: typeof UnitImprovement): boolean =>
              unitImprovement instanceof Improvement
          )
        )
    );

/** An effect: emits `unit:upgraded` with the unit, its old type and its new type. */
export const emitUpgraded =
  (engine: Engine) =>
  (unit: Unit, from: typeof Unit): void => {
    engine.emit('unit:upgraded', unit, from, unit.sourceClass());
  };

export interface UpgradedRulesOptions {
  /**
   * The unit improvements an upgraded unit loses. The original clears the veteran flag and nothing else (OpenCiv2
   *  `civ_leonardo_upgrade`: `flags & ~UNITF_VETERAN`), so a fortified unit stays fortified.
   */
  loses?: readonly (typeof UnitImprovement)[];
  engine?: Engine;
  unitImprovementRegistry?: UnitImprovementRegistry;
}

/**
 * The `Upgraded` rules, in this order: lose `loses` (when there are any), then emit `unit:upgraded`, for a client's
 *  notice. Ids are `<prefix>/lose-improvements` and `<prefix>/emit`.
 */
export const upgradedRules = (
  prefix: string,
  {
    loses = [],
    engine = engineInstance,
    unitImprovementRegistry = unitImprovementRegistryInstance,
  }: UpgradedRulesOptions = {}
): Upgraded[] => [
  ...(loses.length > 0
    ? [
        new Upgraded(
          `${prefix}/lose-improvements`,
          new Effect(loseImprovements(loses, unitImprovementRegistry))
        ),
      ]
    : []),
  new Upgraded(`${prefix}/emit`, new Effect(emitUpgraded(engine))),
];

export default upgradedRules;
