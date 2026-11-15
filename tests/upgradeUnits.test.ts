import {
  Advance29,
  Advance35,
  Advance37,
  Row15,
  Row2,
  Row3,
  Row34,
  Row43,
  Row6,
  Row7,
  known,
  options,
} from './table';
import { Movement, Moves } from '@civ-clone/core-unit/Yields';
import upgradeUnits, { changeType } from '../lib/upgradeUnits';
import Criterion from '@civ-clone/core-rule/Criterion';
import Effect from '@civ-clone/core-rule/Effect';
import Engine from '@civ-clone/core-engine/Engine';
import Player from '@civ-clone/core-player/Player';
import RuleRegistry from '@civ-clone/core-rule/RuleRegistry';
import Tile from '@civ-clone/core-world/Tile';
import Unit from '@civ-clone/core-unit/Unit';
import UnitImprovement from '@civ-clone/core-unit-improvement/UnitImprovement';
import UnitImprovementRegistry from '@civ-clone/core-unit-improvement/UnitImprovementRegistry';
import UnitRegistry from '@civ-clone/core-unit/UnitRegistry';
import Upgraded from '../lib/Rules/Upgraded';
import { Yield as YieldRule } from '@civ-clone/core-unit/Rules/Yield';
import YieldValue from '@civ-clone/core-yield/Yield';
import { expect } from 'chai';
import {
  ITransportUnit,
  Transport,
} from '@civ-clone/core-unit-transport/Transport';
import TransportRegistry, {
  instance as transportRegistryInstance,
} from '@civ-clone/core-unit-transport/TransportRegistry';
import TransportManifest from '@civ-clone/core-unit-transport/TransportManifest';
import { DefendRole } from '@civ-clone/base-unit-role/Roles';
import upgradedRules from '../lib/upgradedRules';
import { weakerUnitsOfRole } from '../lib/upgradeTarget';

// OpenCiv2 `civ_leonardo_upgrade` (`src/auto/civ.cpp`): every unit of the civ's with a target becomes it at once
//  (`units[unit].type = unit_type3`), loses its veteran flag (`flags & ~UNITF_VETERAN`), and keeps everything else
//  (`struct Unit`: position, moves used, damage, orders, home city).

class Veteran extends UnitImprovement {}
class Fortified extends UnitImprovement {}

// Movement from the table (`@UNITS` column 3): rows 2, 3, 6, 7: 1; row 15: 2; row 34: 4; row 43: 5.
const movement = new Map<typeof Unit, number>([
  [Row2, 1],
  [Row3, 1],
  [Row6, 1],
  [Row7, 1],
  [Row15, 2],
  [Row34, 4],
  [Row43, 5],
]);

const setUp = () => {
  const ruleRegistry = new RuleRegistry(),
    unitRegistry = new UnitRegistry(),
    unitImprovementRegistry = new UnitImprovementRegistry(),
    engine = new Engine(),
    events: [Unit, typeof Unit, typeof Unit][] = [],
    tile = {} as Tile,
    player = new Player(ruleRegistry),
    unitOf = (Type: typeof Unit, owner: Player = player): Unit => {
      const unit = new Type(null, owner, tile, ruleRegistry);

      unitRegistry.register(unit);
      unit.moves().set(unit.movement());

      return unit;
    };

  ruleRegistry.register(
    new YieldRule(
      new Criterion(
        (unit: Unit, unitYield: YieldValue): boolean =>
          unitYield instanceof Movement
      ),
      new Effect((unit: Unit, unitYield: YieldValue): void =>
        unitYield.set(movement.get(unit.sourceClass<typeof Unit>()) ?? 1)
      )
    ),
    ...upgradedRules('test:unit/upgraded', {
      loses: [Veteran],
      engine,
      unitImprovementRegistry,
    })
  );

  engine.on('unit:upgraded', (unit, from, to) => events.push([unit, from, to]));

  return {
    engine,
    events,
    player,
    ruleRegistry,
    unitImprovementRegistry,
    unitOf,
    unitRegistry,
    upgrade: (who: Player = player) =>
      upgradeUnits(who, { ...options, ruleRegistry, unitRegistry }),
  };
};

describe('upgradeUnits', (): void => {
  it('should upgrade every eligible unit of the player at once, in order, and leave the rest', (): void => {
    const { events, player, unitOf, upgrade } = setUp(),
      rival = new Player(),
      first = unitOf(Row3),
      attacker = unitOf(Row15),
      second = unitOf(Row2),
      theirs = unitOf(Row3, rival);

    known.set(player, new Set([Advance29]));
    known.set(rival, new Set([Advance29]));

    const upgrades = upgrade();

    expect(upgrades.length).to.equal(2);
    expect(upgrades[0][0] === first).to.true;
    expect(upgrades[0].slice(1)).to.deep.equal([Row3, Row6]);
    expect(upgrades[1][0] === second).to.true;
    expect(upgrades[1].slice(1)).to.deep.equal([Row2, Row6]);
    expect(first).to.be.instanceOf(Row6);
    expect(second).to.be.instanceOf(Row6);
    expect(attacker).to.be.instanceOf(Row15);
    expect(theirs).to.be.instanceOf(Row3);
    // One event a unit, with the old and new types.
    expect(events.length).to.equal(2);
    expect(events[0][0] === first).to.true;
    expect(events[0].slice(1)).to.deep.equal([Row3, Row6]);
  });

  it('should go one step a call, as each advance calls it again', (): void => {
    const { player, unitOf, upgrade } = setUp(),
      unit = unitOf(Row3);

    known.set(player, new Set([Advance29]));
    upgrade();
    expect(unit).to.be.instanceOf(Row6);

    known.set(player, new Set([Advance29, Advance35]));
    upgrade();
    expect(unit).to.be.instanceOf(Row7);

    expect(upgrade()).to.deep.equal([]);
  });

  it('should keep the same unit: its id, owner, square, home, damage, busy state and registry entries', (): void => {
    const { player, unitOf, unitRegistry, upgrade } = setUp(),
      unit = unitOf(Row3),
      id = unit.id(),
      tile = unit.tile(),
      busy = {} as any;

    unit.setDamage(3);
    unit.setBusy(busy);
    known.set(player, new Set([Advance29]));

    upgrade();

    expect(unit.sourceClass() === Row6).to.true;
    expect(unit.id()).to.equal(id);
    expect(unit.player() === player).to.true;
    expect(unit.tile() === tile).to.true;
    expect(unit.city()).to.equal(null);
    expect(unit.damage()).to.equal(3);
    expect(unit.busy() === busy).to.true;
    expect(unitRegistry.getByPlayer(player).includes(unit)).to.true;
    expect(unitRegistry.getByTile(tile).includes(unit)).to.true;
    expect(unit.moves()).to.be.instanceOf(Moves);
  });

  it('should keep the moves spent, not the moves left', (): void => {
    const { player, unitOf, upgrade } = setUp(),
      fresh = unitOf(Row34),
      used = unitOf(Row34),
      spent = unitOf(Row34);

    // 4 moves: 1 spent, and all 4 spent.
    used.moves().set(3);
    spent.moves().set(0);
    known.set(player, new Set([Advance37]));

    upgrade();

    // Row 43 has 5.
    expect(fresh.moves().value()).to.equal(5);
    expect(used.moves().value()).to.equal(4);
    expect(spent.moves().value()).to.equal(1);
  });

  it('should never leave fewer than no moves', (): void => {
    const { unitOf } = setUp(),
      unit = unitOf(Row43);

    unit.moves().set(1);
    changeType(unit, Row7);

    expect(unit).to.be.instanceOf(Row7);
    expect(unit.moves().value()).to.equal(0);
  });

  it('should take away the `loses` improvements only', (): void => {
    const { player, unitImprovementRegistry, unitOf, upgrade } = setUp(),
      unit = unitOf(Row3),
      fortified = new Fortified(unit);

    unitImprovementRegistry.register(new Veteran(unit), fortified);
    known.set(player, new Set([Advance29]));

    upgrade();

    expect(unitImprovementRegistry.getByUnit(unit)).to.deep.equal([fortified]);
  });

  it('should run the `Upgraded` rules after the change, with the old type', (): void => {
    const { player, ruleRegistry, unitOf, upgrade } = setUp(),
      seen: [boolean, typeof Unit][] = [];

    ruleRegistry.register(
      new Upgraded(
        new Effect((unit: Unit, from: typeof Unit): void => {
          seen.push([unit instanceof Row6, from]);
        })
      )
    );

    unitOf(Row3);
    known.set(player, new Set([Advance29]));
    upgrade();

    expect(seen).to.deep.equal([[true, Row3]]);
  });

  it('should leave out the lose rule when nothing is lost', (): void => {
    expect(upgradedRules('test:x').map((rule) => rule.id())).to.deep.equal([
      'test:x/emit',
    ]);
    expect(
      upgradedRules('test:x', { loses: [Veteran] }).map((rule) => rule.id())
    ).to.deep.equal(['test:x/lose-improvements', 'test:x/emit']);
  });
  it('should count a unit that becomes its own type: it loses veteran status and is announced', (): void => {
    // OpenCiv2 `civ_leonardo_upgrade` has no check against the unit's own type: choosing it still clears the veteran
    //  flag and tells the player.
    const {
        events,
        player,
        ruleRegistry,
        unitImprovementRegistry,
        unitOf,
        unitRegistry,
      } = setUp(),
      unit = unitOf(Row2),
      fortified = new Fortified(unit),
      hasAdvance = () => true;

    unitImprovementRegistry.register(new Veteran(unit), fortified);

    const upgrades = upgradeUnits(player, {
      types: [Row2],
      obsoletedBy: () => null,
      prerequisite: () => Advance35,
      hold: () => 0,
      role: () => DefendRole,
      hasAdvance,
      upgradeAdvances: [
        weakerUnitsOfRole({
          role: DefendRole,
          defence: () => 1,
          below: 3,
          Advance: Advance35,
          hasAdvance,
          roleOf: () => DefendRole,
        }),
      ],
      ruleRegistry,
      unitRegistry,
    });

    expect(upgrades.length).to.equal(1);
    expect(upgrades[0].slice(1)).to.deep.equal([Row2, Row2]);
    expect(unit.sourceClass() === Row2).to.true;
    expect(unit.moves().value()).to.equal(1);
    expect(unitImprovementRegistry.getByUnit(unit)).to.deep.equal([fortified]);
    expect(events.length).to.equal(1);
    expect(events[0].slice(1)).to.deep.equal([Row2, Row2]);
  });

  it("should give a unit that becomes a transport the mixin's registries, and take them from one that stops", (): void => {
    class Boat extends Transport(Unit) {}

    const { unitOf, unitRegistry } = setUp(),
      transportRegistry = new TransportRegistry(),
      transportRuleRegistry = new RuleRegistry(),
      raft = unitOf(Row2),
      other = unitOf(Row2),
      cargo = unitOf(Row2);

    changeType(raft, Boat, { transportRegistry, transportRuleRegistry });

    const boat = raft as unknown as ITransportUnit;

    expect(boat._transportRegistry === transportRegistry).to.true;
    expect(boat._transportRuleRegistry === transportRuleRegistry).to.true;
    expect(boat.cargo()).to.deep.equal([]);
    expect(boat.hasCargo()).to.false;

    transportRegistry.register(
      new TransportManifest(boat, cargo, cargo.tile())
    );
    expect(boat.cargo().length).to.equal(1);
    expect(boat.cargo()[0] === cargo).to.true;

    // The defaults are the instances the mixin's own fields default to.
    changeType(other, Boat);
    expect(
      (other as unknown as ITransportUnit)._transportRegistry ===
        transportRegistryInstance
    ).to.true;

    // A unit that already is a transport keeps its own.
    changeType(raft, Boat);
    expect(boat._transportRegistry === transportRegistry).to.true;

    changeType(raft, Row7);
    expect('_transportRegistry' in raft).to.false;
    expect('_transportRuleRegistry' in raft).to.false;
    expect(unitRegistry.getByPlayer(raft.player()).includes(raft)).to.true;
  });
});
