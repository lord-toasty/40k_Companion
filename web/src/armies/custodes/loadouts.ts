import type { GearChoice, GearSlot } from '../../schema/army'

/**
 * Wargear rules per unit, written from each datasheet's "Wargear Options" text. The first choice in a slot
 * is the default (what the Unit Composition line says). Weapon/ability names must match the datasheet exactly.
 * Units not listed here have no options.
 */
const c = (id: string, label: string, ...gear: (string | [string, number])[]): GearChoice => ({
  id,
  label,
  gear: gear.map((g) => (typeof g === 'string' ? { name: g } : { name: g[0], perModel: g[1] })),
})
const swap = (id: string, label: string, ...choices: GearChoice[]): GearSlot => ({ id, label, choices })
const vexilla = (): GearSlot => ({
  id: 'vexilla',
  label: 'Vexilla (1 model)',
  choices: [c('none', 'No Vexilla'), c('vexilla', 'Vexilla', 'Vexilla')],
  limit: { vexilla: 1 },
})
const axeOrSpear = (): GearSlot =>
  swap('melee', 'Spear or axe', c('spear', 'Guardian Spear', 'Guardian Spear'), c('axe', 'Castellan Axe', 'Castellan Axe'))

export const custodesSlots: Record<string, GearSlot[]> = {
  // The Pyrithite Spear and Paragon Blade keep the Praesidium Shield (+25 pts); the Axe and Guardian Spear drop it.
  'shield-captain': [
    swap(
      'loadout',
      'Weapon & shield',
      { ...c('spear-shield', 'Pyrithite Spear + Praesidium Shield', 'Pyrithite Spear', 'Praesidium Shield'), points: 25 },
      { ...c('blade-shield', 'Eternity-pattern Paragon Blade + Praesidium Shield', 'Eternity-pattern Paragon Blade', 'Praesidium Shield'), points: 25 },
      c('axe', 'Castellan Axe', 'Castellan Axe'),
      c('guardian', 'Guardian Spear', 'Guardian Spear'),
    ),
  ],
  'shield-captain-in-allarus-terminator-armour': [axeOrSpear()],
  'shield-captain-on-dawneagle-jetbike': [
    swap('gun', 'Heavy gun', c('salvo', 'Salvo Launcher', 'Salvo Launcher'), c('bolter', 'Hurricane Bolter', 'Hurricane Bolter')),
  ],
  'sentinel-guard-sodality': [vexilla()],
  'custodian-guard-sodality': [vexilla()],
  'custodian-wardens': [axeOrSpear(), vexilla()],
  'allarus-custodians': [axeOrSpear(), vexilla()],
  'aquilon-terminators-with-solarite-power-talons': [
    swap('gun', 'Ranged weapon', c('storm-bolter', 'Lastrum Storm Bolter', 'Lastrum Storm Bolter'), c('firepike', 'Infernus Firepike', 'Infernus Firepike')),
  ],
  'telemon-heavy-dreadnought': [
    swap(
      'loadout',
      'Fists & projectors',
      c('standard', 'Dual Caestus Fists + 2 Twin Neutronium Cascade Projectors', 'Dual Caestus Fists', ['Twin Neutronium Cascade Projectors', 2]),
      c('desolator', 'Caestus Fist + Twin NCP + Adrathic Desolator', 'Caestus Fist', 'Twin Neutronium Cascade Projectors', 'Adrathic Desolator'),
      c('storm-cannon', 'Caestus Fist + Twin NCP + Arachnus Storm Cannon', 'Caestus Fist', 'Twin Neutronium Cascade Projectors', 'Arachnus Storm Cannon'),
      c('culverin', 'Caestus Fist + Twin NCP + Iliastus Accelerator Culverin', 'Caestus Fist', 'Twin Neutronium Cascade Projectors', 'Iliastus Accelerator Culverin'),
    ),
  ],
  'contemptor-achillus-dreadnought': [
    swap(
      'guns',
      'Pair of guns',
      c('bolters', '2 Lastrum Storm Bolters', ['Lastrum Storm Bolter', 2]),
      c('combi', '2 Adrathic Combi-destructors', ['Adrathic Combi-destructor', 2]),
      c('incinerators', '2 Twin Infernus Incinerators', ['Twin Infernus Incinerator', 2]),
    ),
  ],
  'vertus-praetors': [
    swap('gun', 'Heavy gun', c('salvo', 'Salvo Launcher', 'Salvo Launcher'), c('bolter', 'Hurricane Bolter', 'Hurricane Bolter')),
  ],
  'gyrfalcon-jetbike-sodality': [
    swap(
      'gun',
      'Ranged weapon',
      c('bolt-cannon', 'Lastrum Bolt Cannon', 'Lastrum Bolt Cannon'),
      c('devastator', 'Adrathic Devastator', 'Adrathic Devastator'),
      c('volley', 'Arachnus Volley Cannon', 'Arachnus Volley Cannon'),
      c('las-pulser', 'Twin Corvae Las-pulser', 'Twin Corvae Las-pulser'),
    ),
  ],
  'pallas-grav-attack': [
    swap('gun', 'Main gun', c('blaze', 'Twin Arachnus Blaze Cannon', 'Twin Arachnus Blaze Cannon'), c('fusil', 'Twin Iliastus Accelerator Fusil', 'Twin Iliastus Accelerator Fusil')),
  ],
  'coronus-grav-carrier': [
    swap('gun', 'Secondary gun', c('lastrum', 'Twin Lastrum Bolt Cannon', 'Twin Lastrum Bolt Cannon'), c('ncp', 'Twin Neutronium Cascade Projectors', 'Twin Neutronium Cascade Projectors')),
  ],
  'caladius-grav-tank': [
    swap('gun', 'Secondary gun', c('lastrum', 'Twin Lastrum Bolt Cannon', 'Twin Lastrum Bolt Cannon'), c('ncp', 'Twin Neutronium Cascade Projectors', 'Twin Neutronium Cascade Projectors')),
  ],
  'caladius-annihilator-grav-tank': [
    swap('gun', 'Secondary gun', c('lastrum', 'Twin Lastrum Bolt Cannon', 'Twin Lastrum Bolt Cannon'), c('ncp', 'Twin Neutronium Cascade Projectors', 'Twin Neutronium Cascade Projectors')),
  ],
  'knight-centura': [
    swap(
      'weapon',
      'Weapon',
      c('greatblade', 'Executioner Greatblade', 'Executioner Greatblade'),
      c('boltgun', 'Master-crafted Boltgun + Gun Stock', 'Master-crafted Boltgun', 'Gun Stock'),
      c('flamer', 'Master-crafted Flamer + Gun Stock', 'Master-crafted Flamer', 'Gun Stock'),
    ),
  ],
  'anathema-psykana-rhino': [
    swap('missile', 'Hunter-killer Missile', c('none', 'No Hunter-killer Missile'), c('hkm', 'Hunter-killer Missile', 'Hunter-killer Missile')),
  ],
}
