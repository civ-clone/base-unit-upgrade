import { Engine } from '@civ-clone/core-engine/Engine';
import { UnitImprovementRegistry } from '@civ-clone/core-unit-improvement/UnitImprovementRegistry';
import Unit from '@civ-clone/core-unit/Unit';
import UnitImprovement from '@civ-clone/core-unit-improvement/UnitImprovement';
import Upgraded from './Rules/Upgraded';
/** An effect: takes the unit's unit improvements of any of `Improvements` away. */
export declare const loseImprovements: (
  Improvements: readonly (typeof UnitImprovement)[],
  unitImprovementRegistry: UnitImprovementRegistry
) => (unit: Unit) => void;
/** An effect: emits `unit:upgraded` with the unit, its old type and its new type. */
export declare const emitUpgraded: (
  engine: Engine
) => (unit: Unit, from: typeof Unit) => void;
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
export declare const upgradedRules: (
  prefix: string,
  { loses, engine, unitImprovementRegistry }?: UpgradedRulesOptions
) => Upgraded[];
export default upgradedRules;
