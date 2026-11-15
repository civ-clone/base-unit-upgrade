"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.upgradedRules = exports.emitUpgraded = exports.loseImprovements = void 0;
const Engine_1 = require("@civ-clone/core-engine/Engine");
const UnitImprovementRegistry_1 = require("@civ-clone/core-unit-improvement/UnitImprovementRegistry");
const Effect_1 = require("@civ-clone/core-rule/Effect");
const Upgraded_1 = require("./Rules/Upgraded");
/** An effect: takes the unit's unit improvements of any of `Improvements` away. */
const loseImprovements = (Improvements, unitImprovementRegistry) => (unit) => unitImprovementRegistry.unregister(...unitImprovementRegistry
    .getByUnit(unit)
    .filter((unitImprovement) => Improvements.some((Improvement) => unitImprovement instanceof Improvement)));
exports.loseImprovements = loseImprovements;
/** An effect: emits `unit:upgraded` with the unit, its old type and its new type. */
const emitUpgraded = (engine) => (unit, from) => {
    engine.emit('unit:upgraded', unit, from, unit.sourceClass());
};
exports.emitUpgraded = emitUpgraded;
/**
 * The `Upgraded` rules, in this order: lose `loses` (when there are any), then emit `unit:upgraded`, for a client's
 *  notice. Ids are `<prefix>/lose-improvements` and `<prefix>/emit`.
 */
const upgradedRules = (prefix, { loses = [], engine = Engine_1.instance, unitImprovementRegistry = UnitImprovementRegistry_1.instance, } = {}) => [
    ...(loses.length > 0
        ? [
            new Upgraded_1.default(`${prefix}/lose-improvements`, new Effect_1.default((0, exports.loseImprovements)(loses, unitImprovementRegistry))),
        ]
        : []),
    new Upgraded_1.default(`${prefix}/emit`, new Effect_1.default((0, exports.emitUpgraded)(engine))),
];
exports.upgradedRules = upgradedRules;
exports.default = exports.upgradedRules;
//# sourceMappingURL=upgradedRules.js.map