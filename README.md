# base-unit-upgrade

Upgrading units to a newer type with the same role, all at once: which type a unit becomes, the helper that upgrades
every eligible unit of a player's, and the `Upgraded` rules that say what an upgrade takes away and tell the client.

A library: no `main` and no `index`, so installing it registers nothing and changes no game. A rule set imports what it
needs from `lib/`.

## Which type a unit becomes

`upgradeTarget(unit, options)` answers a type or `null`, following OpenCiv2's `civ_leonardo_upgrade`
(`src/auto/civ.cpp`):

1. **The upgrading advance** is the advance that makes the unit's type obsolete (`obsoletedBy`), unless one of
   `upgradeAdvances` replaces it for this unit. The first that answers anything but `undefined` wins.
2. The unit's player must have that advance (`hasAdvance`).
3. **A target** is a type in `types` whose `prerequisite` is that advance, whose `role` is the unit's type's role, and
   whose `hold` is at least the unit's type's hold. So a ship that carries two never becomes one that carries none.
4. **Of several targets, the last** in `types` wins: the original loops over its whole table with no `break`.

Every answer is about a type, never a unit, and comes from the rule set's own unit table, so give `types` in the
table's order. A type with no role (`null`) never upgrades.

**The unit's own type is a candidate** like any other, as in the original. That can only happen when an
`upgradeAdvances` entry gives a type its own prerequisite. The unit then "upgrades" to its own type: nothing about it
changes, but `upgradeUnits` counts it and runs the `Upgraded` rules, so it loses its veteran status and `unit:upgraded`
is emitted with the same type twice, as the original clears the flag and tells the player each time.

**One step at a time.** A unit becomes its target even when the target is itself obsolete, and goes on at the next
call, as in the original.

`rolesIn(ruleRegistry)` reads the roles from a game's `UnitRoles` rules (`@civ-clone/base-unit-role`).

### Weaker units of a role

`weakerUnitsOfRole({ role, defence, below, Advance, hasAdvance, roleOf })` is an `upgradeAdvances` entry: units of
`role` whose type's defence (from the table, not the unit's yield) is below `below` upgrade with `Advance` once their
player has it, whatever makes their type obsolete. Civilization II gives defensive units weaker than its defence-3
gunpowder unit that gunpowder unit's advance, so the oldest defenders skip their intermediate type.

## Upgrading

`upgradeUnits(player, options)` upgrades every unit of `player`'s that has a target, one step each, in the order
`unitRegistry` holds them, and returns `[unit, from, to]` for each. For each unit it calls `changeType`, then runs the
`Upgraded` rules with `(unit, from)`.

When to call it is up to the rule set. The original calls it for the holder of its upgrading wonder after each advance
the holder discovers, when the wonder is completed, and for the new owner when the wonder's city is captured.

### The same unit, a new type

`changeType(unit, Type)` makes the unit an instance of `Type` **in place**, as the original rewrites the unit's type and
nothing else. The unit stays the same object, as a transferred unit does (`Unit#transfer`), so everything about it and
everything that points at it stays valid:

- its id, square, owner and home city;
- its damage, in hit points lost (the original keeps it as it is);
- its orders and busy state, so a fortified unit stays fortified;
- its unit improvements, its cargo, its pending effects.

Its class is read from the object whenever it's saved, so a save follows. **A client doesn't learn of the change by
itself:** nothing re-sends the unit, so a client must handle `unit:upgraded` (the unit and its square).

**Transports:** no constructor runs, so neither do the new type's field initialisers. The only ones a unit type has today
are core-unit-transport's `Transport(Base)` mixin's two registries. A unit that becomes a transport gets
`transportRegistry` and `transportRuleRegistry` (options of `changeType` and `upgradeUnits`; default the same instances
the mixin's fields default to). After a load a game injects its own, so a rule set passes the game's registries. A
unit that stops being a transport loses the two fields, which would otherwise be saved.

**Moves:** the original keeps the moves *spent* this turn, so the unit has its new type's movement less what it had
already spent, and never less than 0.

Creating a new unit instead would run the `Created` rules (full moves, veteran from a barracks, `unit:created`) and the
`Destroyed` rules (a loss counted, cargo lost at sea), and leave transport manifests, unit improvements and pending
effects pointing at the old unit.

## The `Upgraded` rules

`Upgraded` (`lib/Rules/Upgraded`) runs with `(unit, from)` once the unit is its new type. `upgradedRules(prefix,
options)` builds them, in this order:

1. `<prefix>/lose-improvements` takes away the unit improvements of `loses`. The original clears the veteran flag and
   nothing else, so Civilization II passes its veteran improvement. Left out when `loses` is empty.
2. `<prefix>/emit` emits `unit:upgraded` with `(unit, from, to)`, one event per unit, for a client's notice. The
   original tells a human player once per old type in each run; a client can group the events the same way.

```ts
import { rolesIn, weakerUnitsOfRole } from '@civ-clone/base-unit-upgrade/lib/upgradeTarget';
import upgradeUnits from '@civ-clone/base-unit-upgrade/lib/upgradeUnits';
import upgradedRules from '@civ-clone/base-unit-upgrade/lib/upgradedRules';

ruleRegistry.register(...upgradedRules('civ2-wonder:unit/upgraded', { loses: [Veteran] }));

upgradeUnits(player, {
  types,
  prerequisite,
  obsoletedBy,
  hold,
  role: rolesIn(ruleRegistry),
  hasAdvance,
  upgradeAdvances: [weakerUnitsOfRole({ role: DefendRole, defence, below: 3, Advance: GunpowderAdvance, hasAdvance, roleOf: rolesIn(ruleRegistry) })],
});
```

## Tests

`tests/upgradeTarget.test.ts` checks the choice against Civilization II's unit table (`RULES.TXT` `@UNITS` rows, as
civ2-unit holds them), `tests/upgradeUnits.test.ts` what an upgrade keeps and loses, and `tests/save.test.ts` that an
upgraded unit saves and loads as its new type.
