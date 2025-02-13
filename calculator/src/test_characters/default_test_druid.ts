import { DruidCharacter } from '../player_character'

export const DefaultTestDruid: DruidCharacter = {
  level: 10,
  class: 'Druid',
  helmet: {
    modifiers: [
      ['armor', 25],
      ['core-skill-damage', 0.05],
      ['maximum-life', 20],
      ['attack-speed', 0.015],
    ],
    aspect: ['aspect-of-natures-savagery', []],
  },
  gloves: {
    modifiers: [
      ['armor', 25],
      ['core-skill-damage', 0.05],
    ],
    aspect: ['vigorous-aspect', [0.1]],
  },
  ring1: {
    modifiers: [
      ['cold-resistance', 0.15],
      ['critical-strike-chance', 0.05],
    ],
    aspect: ['stormshifters-aspect', []],
  },
  ring2: {
    modifiers: [
      ['cold-resistance', 0.15],
      ['critical-strike-chance', 0.05],
    ],
    aspect: ['aspect-of-the-rampaging-werebeast', [5]],
  },
  mainHand: {
    weaponType: 'sword',
    attackSpeed: 1.4,
    weaponDamage: 150,
    modifiers: [
      ['vulnerable-damage', 0.05],
      ['damage-to-close-enemies', 0.12],
      ['basic-skill-damage', 0.15],
      ['overpower-damage-with-werebear-skills', 0.4],
    ],
    aspect: ['aspect-of-the-wildrage', []],
  },
  offHand: {
    weaponType: 'axe',
    attackSpeed: 1.3,
    weaponDamage: 150,
    modifiers: [['overpower-damage', 0.1]],
  },
  talents: {
    claw: 5,
    'enhanced-claw': 1,
    'fierce-claw': 1,
    'wild-claw': 1,
    'earth-spike': 5,
    'enhanced-earth-spike': 1,
    'fierce-earth-spike': 1,
    'wild-earth-spike': 1,
    maul: 5,
    'enhanced-maul': 1,
    'fierce-maul': 1,
    'wild-maul': 1,
    'storm-strike': 5,
    'enhanced-storm-strike': 1,
    'fierce-storm-strike': 1,
    'wild-storm-strike': 1,
    'wind-shear': 5,
    'enhanced-wind-shear': 1,
    'fierce-wind-shear': 1,
    'wild-wind-shear': 1,
    landslide: 5,
    'enhanced-landslide': 1,
    'raging-landslide': 1,
    'primal-landslide': 1, // When you Immobilize or Stun an enemy, you gain a Terramote. Each enemy hit by Landslide consumes a Terramote causing a guaranteed Critical Strike with 40% Critical Strike Damage. Bosses always have up to a 10% chance to grant a Terramote when hit. // TODO
    'lightning-storm': 5, // Conjure a growing lightning storm that deals {'25%': '28%': '30%': '32%': '35%'} damage per strike and increases the number of strikes the longer it is channeled up to a maximum of 5.
    'enhanced-lightning-storm': 1, // The size of your Lightning Storm is preserved for 4 seconds after channeling. // IGNORE
    'raging-lightning-storm': 1, // Lightning Storm gains 1 additional lightning strike. // DONE
    'primal-lightning-storm': 1, // Lightning Storm has a 8% chance to Immobilize enemies hit for 3 seconds. // IGNORE
    pulverize: 5, // Shapeshift into a Werebear and slam the ground, dealing {'50%': '55%': '60%': '65%': '70%'} damage to surrounding enemies.
    'enhanced-pulverize': 1, // Your next Pulverize will Overpower every 10 seconds while you remain Healthy. // TODO
    'raging-pulverize': 1, // Enemies are Stunned for 2 seconds when they are Overpowered with Pulverize. // IGNORE
    'primal-pulverize': 1, // Enemies hit with Pulverize deal 20% reduced damage for 4 seconds. // TODO
    shred: 5, // Shapeshift into a Werewolf and perform a trio of combo attacks:
    'enhanced-shred': 1, // Shred gains 30% Attack Speed and Heals for 2% of your Maximum Life if an enemy is struck. // DONE
    'raging-shred': 1, // Shred's third combo attack is larger and applies an additional 51% Poisoning damage over 5 seconds. // DONE
    'primal-shred': 1, // Shred's second and third attacks also perform a dash. In addition, Shred's Critical Strike Damage is increased by 20%. // DONE
    tornado: 5, // Conjure a swirling tornado that deals {'35%': '39%': '42%': '46%': '49%'} damage.
    'enhanced-tornado': 1, // Each time you cast Tornado, you have a 20% chance to spawn an additional Tornado. // DONE
    'raging-tornado': 1, // Enemies hit with Tornado have a 10% chance to become Vulnerable for 3 seconds. // IGNORE
    'primal-tornado': 1, // Enemies damaged by Tornado are Slowed by 8% for 3 seconds, stacking up to 40%. // IGNORE
    'blood-howl': 5, // Shapeshift into a Werewolf and howl furiously, Healing you for {'20%': '21.8%': '23.5%': '25.2%': '26.8%'} of your Maximum Life.
    'enhanced-blood-howl': 1, // Kills reduce the Cooldown of Blood Howl by 1 second. // TODO
    'preserving-blood-howl': 1, // Blood Howl also increases your Attack Speed by 15% for 4 seconds. // TODO
    'cyclone-armor': 5, // <b>Passive</b>: Powerful winds surround you, granting {'20%': '21.8%': '23.5%': '25.2%': '26.8%'} Non-Physical DamageReduction.
    'enhanced-cyclone-armor': 1, // Enemies who are Knocked Back by Cyclone Armor are also Slowed by 70% for 1.5 seconds. // IGNORE
    'innate-cyclone-armor': 1, // Enemies Knocked Back by Cyclone Armor become Vulnerable for 3 seconds. // IGNORE
    'preserving-cyclone-armor': 1, // Every 10 seconds, Cyclone Armor intensifies, causing incoming damage to grant you 30% Damage Reduction for 2 seconds. // DONE
    'debilitating-roar': 5, // Shapeshift into a Werebear and bellow a mighty roar, reducing Nearby enemies' damage dealt by 50% for 4 seconds. // TODO
    'enhanced-debilitating-roar': 1, // Debilitating Roar also Fortifies you for 22% Base Life. // IGNORE
    'innate-debilitating-roar': 1, // Debilitating Roar also Slows enemies by 40% for its duration. // IGNORE
    'preserving-debilitating-roar': 1, // Debilitating Roar also Heals you for 4% of your Maximum Life (2) each second for its duration. // IGNORE
    'earthen-bulwark': 5, // Rock's surround you for 3 seconds, granting a Barrier that absorbs {'45%': '50%': '54%': '58%': '63%'} of your Base Life in damage. // TODO
    'enhanced-earthen-bulwark': 1, // Earthen Bulwark makes you Unstoppable while active. // IGNORE
    'innate-earthen-bulwark': 1, // Rock shrapnel flies outward when Earthen Bulwark is destroyed or expires, dealing X damage to surrounding enemies. This damage is increased by Barrier bonuses. // TODO
    'preserving-earthen-bulwark': 1, // Casting Earthen Bulwark grants 18% Base Life as Fortify. // IGNORE
    ravens: 5, // <b>Passive</b>: 1 Raven flies above you and periodically attacks your enemies for {'13%': '13%': '13%': '13%': '13%'} damage every 5 seconds.
    'enhanced-ravens': 1, // You have 5% increased Critical Strike Chance for 6 seconds against Enemies hit by Ravens. // DONE
    'ferocious-ravens': 1, // Enemies inside the swarm of Ravens when it is activated become Vulnerable for 3 seconds. // IGNORE
    'brutal-ravens': 1, // 2 additional Ravens periodically attack enemies. // TODO
    'poison-creeper': 5, // <b>Passive</b>: A poison creeper periodically emerges from the ground every 7 seconds and applies {'36%': '40%': '43%': '47%': '50%'} Poisoning damage over 6 seconds to an enemy in the area. // TODO
    'enhanced-poison-creeper': 1, // poison Creeper's Immobilize duration is increased by 1 second. // IGNORE
    'ferocious-poison-creeper': 1, // poison Creeper's active Poisoning duration is increased by 3 seconds. // TODO
    'brutal-poison-creeper': 1, // Your Critical Strike Chance is increased by 20% against enemies strangled by poison Creeper. // IGNORE
    wolves: 5, // <b>Passive</b>: Summon 2 wolf companions that bite enemies for {'8%': '9%': '9%': '10%': '11%'} damage. // TODO
    'enhanced-wolves': 1, // Wolves deal 20% increased damage to Immobilized, Stunned, Slowed, or Poisoned enemies. // TODO
    'ferocious-wolves': 1, // Lucky Hit: Your Wolves' attacks have up to a 10% chance to Fortify you for 5% Base Life. // IGNORE
    'brutal-wolves': 1, // When you Critically Strike, your Wolves gain 20% Attack Speed for 3 seconds. // TODO
    boulder: 5, // Unearth a large rolling boulder that Knocks Back and crushes enemies, dealing {'33%': '36%': '40%': '43%': '46%'} damage with each hit.
    'enhanced-boulder': 1, // When Boulder reaches the end of its path, enemies hit are Slowed by 30% for 3 seconds. If Boulder Overpowered, enemies are Stunned for 4 seconds instead. // IGNORE
    'natural-boulder': 1, // While you have any Fortify, Boulder has 20% increased Critical Strike Chance. // DONE
    'savage-boulder': 1, // Boulder's Critical Strike Chance is increased by 3% each time it deals damage. // DONE
    hurricane: 5, // Form a hurricane around you that deals {'97%': '107%': '117%': '127%': '136%'} damage to surrounding enemies over 8 seconds.
    'enhanced-hurricane': 1, // Enemies who are damaged by Hurricane are Slowed by 25% for 2 seconds. // IGNORE
    'natural-hurricane': 1, // Hurricane has a 15% chance to make enemies Vulnerable for 3 seconds. // IGNORE
    'savage-hurricane': 1, // Enemies affected by Hurricane deal 20% less damage. // IGNORE
    rabies: 5, // Shapeshift into a Werewolf and perform an infectious bite on the target dealing {'28%': '31%': '34%': '36%': '39%'} damage, and applying an additional {value2} Poisoning damage over 6 seconds. // TODO
    'enhanced-rabies': 1, // Rabies' Poisoning damage also increases over the lifetime of the disease, dealing 30% bonus damage at max duration. // TODO
    'natural-rabies': 1, // Rabies spreads 100% faster. // IGNORE
    'savage-rabies': 1, // Rabies deals its total Poisoning damage in 4 seconds instead of 6. // IGNORE
    trample: 5, // Shapeshift into a Werebear, become Unstoppable, and charge forward, dealing {'25%': '28%': '30%': '32%': '35%'} damage and Knocking Back enemies. // TODO
    'enhanced-trample': 1, // Trample deals 30% bonus damage. This bonus is reduced by 15% for each enemy hit after the first. // TODO
    'natural-trample': 1, // Casting Trample grants 20% Base Life as Fortify. // IGNORE
    'savage-trample': 1, // Casting Trample grants 20 Spirit. // DONE
    cataclysm: 1, // A massive storm follows you for 8 seconds. Tornadoes Knock Back enemies, and lightning strikes wildly dealing 52% damage. // TODO
    'prime-cataclysm': 1, // Cataclysm's duration is increased by 2 seconds. // TODO
    'supreme-cataclysm': 1, // Lightning strikes from Cataclysm make enemies Vulnerable for 2 seconds. // IGNORE
    'grizzly-rage': 1, // Shapeshift into a Dire Werebear for 10 seconds gaining 20% bonus damage and 20% Damage Reduction. Damage bonus is increased by 3% each second while in this form. // TODO
    'prime-grizzly-rage': 1, // You are Unstoppable while Grizzly Rage is active. // IGNORE
    'supreme-grizzly-rage': 1, // Gain 8% Base Life as Fortify per second while Grizzly Rage is active. // IGNORE
    lacerate: 1, // Shapeshift into a Werewolf, become Immune and quickly dash 10 times between enemies in the area dealing up to 400% damage. // TODO
    'prime-lacerate': 1, // Each time Lacerate deals a Critical Strike, Heal for 3% Maximum Life. // IGNORE
    'supreme-lacerate': 1, // Lacerate's initial strike is guaranteed to Critically Strike and deals 150% increased damage. // TODO
    petrify: 1, // Encase all Nearby enemies in stone, Stunning them for 3 seconds. You deal 25% increased Critical Strike Damage to enemies affected by Petrify. // TODO
    'prime-petrify': 1, // Petrify's effect durations are increased by 1 second. // TODO
    'supreme-petrify': 1, // Killing an enemy affected by Petrify grants 25 Spirit. // IGNORE
    abundance: 3, // Basic Skills generate {'10%': '20%': '30%'} more Spirit. // DONE
    'ancestral-fortitude': 3, // Increase your Non-Physical Resistances by {'5%': '10%': '15%'} . // DONE
    'bad-omen': 3, // Lucky Hit: Up to a {'10%': '20%': '30%'} chance when dealing damage to a Vulnerable, Immobilized or Stunned enemy that a lightning strike also hits dealing 55% damage. // DONE
    'bestial-rampage': 1, // After being a Werewolf for 2.5 seconds, gain 20% Attack Speed for 15 seconds. // TODO
    'call-of-the-wild': 3, // Your companions deal {'10%': '20%': '30%'} bonus damage. // TODO
    'charged-atmosphere': 3, // Every {18, 15, 12} seconds, a lightning strike hits a Nearby enemy dealing 45% damage. // DONE
    'circle-of-life': 3, // Nature Magic Skills that consume Spirit Heal you for {'1%': '2%': '3%'} of your Maximum Life. // IGNORE
    clarity: 3, // Gain {2, 4, 6} Spirit when transforming into Human form. // TODO
    'crushing-earth': 3, // Earth Skills deal {'5%': '10%': '15%'} increased damage to Slowed, Stunned, Immobilized or Knocked Back enemies. // DONE
    'defensive-posture': 3, // Increases the amount of Fortify you gain from all sources by {'5%': '10%': '15%'} . // IGNORE
    defiance: 3, // Nature Magic Skills deal {'4%': '8%': '12%'} increased damage to Elites. // DONE
    'digitigrade-gait': 3, // You gain {'3%': '6%': '9%'} Movement Speed while in Werewolf form. // IGNORE
    'earthen-might': 1, // Lucky Hit: Damaging enemies with Earth Skills has up to a 5% chance to: // TODO
    'electric-shock': 3, // Lucky Hit: Dealing Lightning damage to enemies has a {'5%': '10%': '15%'} chance to Immobilize them for 3 seconds. // IGNORE
    'elemental-exposure': 3, // Lucky Hit: Your Storm Skills have up to a 20% chance to make enemies Vulnerable for {1, 2, 3} seconds. // IGNORE
    'endless-tempest': 3, // Increase the duration of Hurricane and Cataclysm by {'5%': '10%': '15%'} . // TODO
    envenom: 3, // Poisoned enemies take {'10%': '20%': '30%'} additional Critical Strike Damage. // DONE
    'heart-of-the-wild': 3, // Maximum Spirit is increased by {3, 6, 9} . // DONE
    'heightened-senses': 3, // Upon shapeshifting into a Werewolf or Werebear, gain {'4%': '8%': '12%'} Damage Reduction against Elites for 5 seconds. // TODO
    'iron-fur': 3,
    'lupine-ferocity': 1,
    mending: 3,
    'natural-disaster': 3,
    'natural-fortitude': 3,
    'natures-fury': 1,
    'natures-reach': 3,
    'natures-resolve': 3,
    neurotoxin: 3,
    'perfect-storm': 1,
    'predatory-instinct': 3,
    provocation: 3,
    quickshift: 3,
    resonance: 3,
    safeguard: 3,
    'stone-guard': 3,
    'thick-hide': 3,
    'toxic-claws': 3,
    unrestrained: 3,
    'ursine-strength': 1,
    vigilance: 3,
    'wild-impulses': 3,
  },
  toggles: {
    'enemy-spread-yards': 15,
    'number-of-enemies': 5,
    'altars-of-lilith-gathered': 160,
    'percent-life': 1,
    'enemy-distant': true,
  },
  paragons: {
    powers: [
      'spirit',
      'ancestral-guidance',
      'fang-and-claw',
      'human',
      'inner-beast',
      //'survival-instincts'
    ],
  },
  spiritBoon: {
    deer: ['gift-of-the-stag'],
    eagle: [
      'scythe-talons',
      'avian-wrath',
      'swooping-attacks',
      'iron-feather',
    ],
    snake: ['calm-before-the-storm'],
    wolf: ['packleader'],
  },
  abilities: ['storm-strike', 'wolves', 'pulverize'],
  vampiricPowers: [
    'accursed-touch',
    'anticipation',
    'bathe-in-blood',
    'blood-boil',
    'call-familiar',
    'covens-fangs',
    'domination',
    'feed-the-coven',
    'flowing-veins',
    'hectic',
    'hemomancy',
    'infection',
    'jagged-spikes',
    'metamorphosis',
    'moonrise',
    'prey-on-the-weak',
    'rampart',
    'ravenous',
    'resilience',
    'sanguine-brace',
    'terror',
    'undying',
  ],
}
