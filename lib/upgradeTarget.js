"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.rolesIn = exports.weakerUnitsOfRole = exports.upgradeTarget = exports.upgradeAdvance = void 0;
const roleOf_1 = require("@civ-clone/base-unit-role/roleOf");
/**
 * The advance that upgrades `unit`: the first answer of `upgradeAdvances`, otherwise the advance that makes its type
 *  obsolete. `null` if there is none.
 */
const upgradeAdvance = (unit, { obsoletedBy, upgradeAdvances = [] }) => {
    const player = unit.player();
    for (const candidate of upgradeAdvances) {
        const answer = candidate(unit, player);
        if (answer !== undefined) {
            return answer;
        }
    }
    return obsoletedBy(unit.sourceClass());
};
exports.upgradeAdvance = upgradeAdvance;
/**
 * The type `unit` upgrades to, or `null`. OpenCiv2 `civ_leonardo_upgrade` (`src/auto/civ.cpp`):
 *
 * 1. the upgrading advance is the type's obsoleting advance, unless an `upgradeAdvances` entry replaces it;
 * 2. the unit's player must have that advance;
 * 3. a target is a type whose prerequisite is that advance, with the same role and a hold at least as large;
 * 4. of several targets, the last in `types` wins.
 *
 * One step only: a target that is itself obsolete upgrades on a later call. The unit's own type is a candidate like
 *  any other, as in the original: when it wins, the unit "upgrades" to its own type, which changes nothing but what
 *  the `Upgraded` rules do (the original still clears its veteran flag and tells the player).
 */
const upgradeTarget = (unit, options) => {
    const Advance = (0, exports.upgradeAdvance)(unit, options);
    if (Advance === null || !options.hasAdvance(unit.player(), Advance)) {
        return null;
    }
    const Type = unit.sourceClass(), role = options.role(Type);
    if (role === null) {
        return null;
    }
    const hold = options.hold(Type);
    let target = null;
    options.types.forEach((Candidate) => {
        if (options.prerequisite(Candidate) === Advance &&
            options.role(Candidate) === role &&
            hold <= options.hold(Candidate)) {
            target = Candidate;
        }
    });
    return target;
};
exports.upgradeTarget = upgradeTarget;
/**
 * An `UpgradeAdvance`: units of `role` whose type's defence is below `below` upgrade with `Advance` once their player
 *  has it, whatever makes their type obsolete, so the oldest of them skip a step. Civilization II passes its defend
 *  role, defence 3 and advance 35 (OpenCiv2 `civ_leonardo_upgrade`, `src/auto/civ.cpp`).
 */
const weakerUnitsOfRole = ({ role, defence, below, Advance, hasAdvance, roleOf, }) => (unit, player) => {
    const Type = unit.sourceClass();
    return roleOf(Type) === role &&
        defence(Type) < below &&
        hasAdvance(player, Advance)
        ? Advance
        : undefined;
};
exports.weakerUnitsOfRole = weakerUnitsOfRole;
/** `UpgradeTable['role']` from the `UnitRoles` rules in a game's `ruleRegistry` (`@civ-clone/base-unit-role`). */
const rolesIn = (ruleRegistry) => (Type) => (0, roleOf_1.roleOf)(Type, ruleRegistry);
exports.rolesIn = rolesIn;
//# sourceMappingURL=upgradeTarget.js.map