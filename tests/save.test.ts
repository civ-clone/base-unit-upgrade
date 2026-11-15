import { Game } from '@civ-clone/core-game/Game';
import Player from '@civ-clone/core-player/Player';
import Tile from '@civ-clone/core-world/Tile';
import Unit from '@civ-clone/core-unit/Unit';
import { changeType } from '../lib/upgradeUnits';
import { expect } from 'chai';
import { gameForLoad } from '@civ-clone/core-save-game/gameForLoad';
import { hydrate } from '@civ-clone/core-save-game/hydrate';
import { registerClasses } from '@civ-clone/core-save-game/registerClasses';
import { save } from '@civ-clone/core-save-game/save';

class Before extends Unit {}
class After extends Unit {}

describe('saving an upgraded unit', (): void => {
  it('should save and load it as its new type, with its id and damage', (): void => {
    const game = new Game(),
      player = new Player(game.rules),
      unit = new Before(null, player, null as unknown as Tile, game.rules),
      other = new Before(null, player, null as unknown as Tile, game.rules);

    game.engine.registerPlugins({ '@civ-clone/base-unit-upgrade': 'test' });
    registerClasses(game);
    game.classes.register(Before, After);
    game.units.register(unit, other);

    unit.setDamage(4);
    changeType(unit, After);

    const file = save(game, { name: 'test', createdAt: 0 }),
      loaded = gameForLoad({
        availableUnitImprovements: game.availableUnitImprovements,
        classes: game.classes,
        engine: game.engine,
        rules: game.rules,
      });

    hydrate(file, loaded);

    const [loadedUnit, loadedOther] = loaded.units.entries();

    expect(loadedUnit).to.be.instanceOf(After);
    expect(loadedUnit.id()).to.equal(unit.id());
    expect(loadedUnit.damage()).to.equal(4);
    expect(loadedOther).to.be.instanceOf(Before);
    expect(
      JSON.stringify(save(loaded, { name: 'test', createdAt: 0 }).entities)
    ).to.equal(JSON.stringify(file.entities));
  });
});
