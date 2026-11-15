import Rule from '@civ-clone/core-rule/Rule';
import Unit from '@civ-clone/core-unit/Unit';

/**
 * A unit has just become another type: `(unit, from)`, where `from` is its old type and `unit` is already the new one.
 *  The same unit, so its id, its square, its home and anything that refers to it stay valid.
 */
export class Upgraded extends Rule<[Unit, typeof Unit], void> {}

export default Upgraded;
