import { NecromancerCharacter } from '../player_character'

export const DefaultTestNecromancer: NecromancerCharacter = {
  level: 10,
  class: 'Necromancer',
  helmet: {
    modifiers: [
      ['armor', 25],
      ['core-skill-damage', 0.05],
      ['maximum-life', 20],
      ['attack-speed', 0.015],
    ],
  },
  ring1: {
    modifiers: [
      ['cold-resistance', 0.15],
      ['critical-strike-chance', 0.05],
    ],
  },
  mainHand: {
    weaponType: 'sword',
    attackSpeed: 1.4,
    weaponDamage: 150,
    modifiers: [
      ['vulnerable-damage', 0.05],
      ['damage-to-close-enemies', 0.12],
      ['basic-skill-damage', 0.15],
    ],
  },
  offHand: {
    weaponType: 'axe',
    attackSpeed: 1.3,
    weaponDamage: 150,
    modifiers: [['overpower-damage', 0.1]],
  },
  talents: {
    'bone-splinters': 5, // Fire 3 bone splinters, dealing {'22%': '25%': '27%': '29%': '31%':} damage each. Each subsequent time an enemy is hit by the same cast of Bone Splinters, you gain 1 Essence.
    'enhanced-bone-splinters': 1, // Bone Splinters has a 30% chance to fire 2 additional projectiles if cast while you have 50 or more Essence. -- Done
    'acolytes-bone-splinters': 1, // Bone Splinters has a 20% chance per hit to make enemies Vulnerable for 2 seconds.
    'initiates-bone-splinters': 1, // Hitting the same enemy at least 3 times with the same cast of Bone Splinters grants 8% Critical Strike Chance for 4 seconds.
    decompose: 5, // Tear the flesh from an enemy, dealing {'30%': '33%': '36%': '39%': '42%':} damage per second and forming a usable Corpse with the flesh every 2.5 seconds.
    'enhanced-decompose': 1, // If an enemy dies while being Decomposed, you gain 10 Essence.
    'acolytes-decompose': 1, // You and your Minions deal 10% increased damage to enemies who are being Decomposed.
    'initiates-decompose': 1, // Decompose Slows enemies by 30%.
    hemorrhage: 5, // Burst an enemy's blood, dealing {'25%': '28%': '30%': '32%': '35%':} damage. Hemorrhage has a 20% chance to form a Blood Orb.
    'enhanced-hemorrhage': 1, // After picking up a Blood Orb, your next Hemorrhage also deals damage to enemies around your target and grants 2 additional Essence per enemy hit.
    'acolytes-hemorrhage': 1, // Hemorrhage gains an additional 20% Attack Speed while Healthy.
    'initiates-hemorrhage': 1, // Hemorrhage grants 1.6% Base Life as Fortify each time it hits an enemy, and has a 1.5% chance per enemy hit to Fortify you for 100% Base Life.
    reap: 5, // Sweep an ethereal scythe in front of you, dealing {'12%': '13%': '14%': '16%': '17%':} damage. Hitting an enemy with Reap increases your Damage Reduction by 15% for 2 seconds.
    'enhanced-reap': 1, // If an enemy hit by Reap dies within 2 seconds, you gain 30% Attack Speed for 3 seconds.
    'acolytes-reap': 1, // Reap forms a Corpse under the first enemy hit. Can only occur every 5 seconds.
    'initiates-reap': 1, // Reap instantly kills targets below 5% Life.
    blight: 5, // Unleash concentrated blight that deals {'30%': '33%': '36%': '39%': '42%':} damage and leaves behind a defiled area, dealing {value2} damage over 6 seconds.
    'enhanced-blight': 1, // Blight Slows enemies by 25%.
    'supernatural-blight': 1, // You and your Minions deal 15% increased damage to enemies within Blight.
    'paranormal-blight': 1, // Blight has a 30% chance to Immobilize enemies for 1.5 seconds on impact.
    'blood-lance': 5, // Throw a blood lance that lingers in an enemy for 3 seconds, dealing {'45%': '50%': '54%': '58%': '63%':} damage to the enemy and all other lanced enemies.
    'enhanced-blood-lance': 1, // Blood Lance pierces through enemies who are currently lanced, dealing 15% reduced damage to subsequent enemies after the first.
    'supernatural-blood-lance': 1, // After casting Blood Lance 8 times, your next cast of Blood Lance is guaranteed to Overpower and spawns a Blood Orb under the first enemy hit.
    'paranormal-blood-lance': 1, // While at least 2 enemies or a Boss are affected by Blood Lance, you gain 15% Attack Speed and Blood Lance's Essence cost is reduced by 2.
    'blood-surge': 5, // Draw blood from enemies, dealing {'20%': '22%': '24%': '26%': '28%':} damage, and expel a blood nova, dealing {value2} damage. Blood Surge's nova damage is increased by 10% per enemy drained, up to 50%.
    'enhanced-blood-surge': 1, // Blood Surge Heals you for 2.5% of your Maximum Life when drawing blood from enemies. If 4 or more enemies are drawn from, then Heal for an additional 2.5% of your Maximum Life.
    'supernatural-blood-surge': 1, // Each time an enemy is hit by Blood Surge's nova, you are Fortified for 1% Base Life. While you have Fortify for over 50% of your Maximum Life, Blood Surge deals 20% increased damage.
    'paranormal-blood-surge': 1, // If an enemy is damaged by Blood Surge's nova while you are Healthy, gain 1 stack of Overwhelming Blood. When you have 5 stacks of Overwhelming Blood, your next Blood Surge Overpowers.
    'bone-spear': 5, // Conjure a bone spear from the ground, dealing {'85%': '94%': '102%': '111%': '119%':} damage and piercing through enemies.
    'enhanced-bone-spear': 1, // Bone Spear breaks into 3 shards when it is destroyed, dealing 10% damage each.
    'supernatural-bone-spear': 1, // Bone Spear makes the first enemy hit Vulnerable for 3 seconds.
    'paranormal-bone-spear': 1, // Bone Spear has a 5% increased Critical Strike Chance. If Bone Spear's primary projectile Critically Strikes, it fires 2 additional bone shards upon being destroyed.
    sever: 5, // A specter of you charges forward and attacks with its scythe for {'63%': '69%': '76%': '82%': '88%':} damage then returns to you and attacks again for {value2} damage.
    'enhanced-sever': 1, // Sever damages enemies along its path for 25% of its initial damage.
    'supernatural-sever': 1, // Sever deals 2% increased damage for each Minion you have upon cast.
    'paranormal-sever': 1, // Every 4th cast of Sever makes enemies Vulnerable for 2 seconds.
    'blood-mist': 5, // Disperse into a bloody mist, becoming Immune for 3 seconds. Your Movement Speed is reduced by 20% and you periodically deal 2% damage to enemies and Healing for {value2} of your Maximum Life.
    'enhanced-blood-mist': 1, // Casting a Skill that Overpowers reduces the cooldown of Blood Mist by 2 seconds.
    'ghastly-blood-mist': 1, // Blood Mist leaves behind a Corpse every 1 second.
    'dreadful-blood-mist': 1, // Blood Mist Fortifies you for 0.5% Base Life each time it hits an enemy.
    'bone-prison': 5, // Unearth a prison of bone with X, Life that surrounds the target area for 6 seconds.
    'enhanced-bone-prison': 1, // If an enemy is trapped by Bone Prison, gain 15 Essence, plus an additional 5 per enemy trapped.
    'ghastly-bone-prison': 1, // Enemies inside of Bone Prison are Vulnerable.
    'dreadful-bone-prison': 1, // Fortify for 5% Base Life for each enemy trapped by Bone Prison.
    'bone-spirit': 5, // Consume all of your Essence to conjure a spirit of bone that seeks enemies. Upon reaching an enemy, the spirit explodes, dealing {'80%': '88%': '96%': '104%': '112%':} damage to the target and all surrounding enemies. Damage is increased by 3% for each point of Essence spent casting Bone Spirit.
    'enhanced-bone-spirit': 1, // If Bone Spirit Critically Strikes, its Cooldown is reduced by 6 seconds. This effect can only happen once per cast.
    'ghastly-bone-spirit': 1, // Bone Spirit has an additional 10% Critical Strike Chance.
    'dreadful-bone-spirit': 1, // After Bone Spirit hits an enemy, you generate 30 Essence over the next 4 seconds.
    decrepify: 5, // Curse the target area. Enemies afflicted by Decrepify are Slowed by {'40.0%': '43.0%': '45.8%': '48.5%': '51.1%':} and deal {value2} less damage for 10 seconds.
    'enhanced-decrepify': 1, // Lucky Hit: Enemies hit while afflicted with Decrepify have up to a 10% chance to Stun them for 2 seconds.
    'abhorrent-decrepify': 1, // Lucky Hit: Enemies hit while afflicted with Decrepify have up to a 15% chance to reduce your active Cooldowns by 1 second.
    'horrid-decrepify': 1, // When you or your Minions hit an enemy afflicted with Decrepify below 10% Life, they are instantly killed. Does not work on Bosses.
    'iron-maiden': 5, // Curse the target area. Enemies afflicted by Iron Maiden take {'10%': '11%': '12%': '13%': '14%':} damage each time they deal direct damage. Lasts 10 seconds.
    'enhanced-iron-maiden': 1, // Iron Maiden no longer costs Essence. Instead, gain 5 Essence for each enemy Cursed. Does not work with enemies who are already Cursed with Iron Maiden.
    'abhorrent-iron-maiden': 1, // Heal for 5% of your Maximum Life when an enemy dies while afflicted with Iron Maiden.
    'horrid-iron-maiden': 1, // When at least 3 enemies are afflicted by Iron Maiden, its damage is increased by 15%.
    'corpse-explosion': 5, // Detonate a Corpse, dealing {'75%': '83%': '90%': '97%': '105%':} damage to surrounding enemies.
    'enhanced-corpse-explosion': 1, // Corpse Explosion's radius is increased by 15%.
    'blighted-corpse-explosion': 1, // Corpse Explosion becomes a Darkness Skill and, instead of exploding, releases a vile miasma dealing 110% Shadow Damage over 6 seconds.
    'plagued-corpse-explosion': 1, // Corpse Explosion deals 10% increased damage to enemies that are Slowed, Stunned or Vulnerable. These damage bonuses can stack.
    'corpse-tendrils': 5, // Veins burst out of a Corpse, Pulling in enemies, Stunning them for 3 seconds, and dealing {value2} damage to them. Does not consume the Corpse.
    'enhanced-corpse-tendrils': 1, // Enemies who are in range of Corpse Tendrils are Slowed by 50% before being Pulled.
    'blighted-corpse-tendrils': 1, // Corpse Tendrils has a 20% chance when damaging enemies to drop a Blood Orb.
    'plagued-corpse-tendrils': 1, // Enemies damaged by Corpse Tendrils are made Vulnerable for 3 seconds.
    'army-of-the-dead': 1, // Call forth the deep buried dead. Volatile Skeletons emerge over the next 7 seconds that explode when around enemies, dealing 30% damage.
    'prime-army-of-the-dead': 1, // When Army of the Dead‘s Volatile Skeletons explode, they have a 15% chance to leave behind a Corpse.
    'supreme-army-of-the-dead': 1, // Army of the Dead also raises your Skeletal Warriors and Skeletal Mages.
    'blood-wave': 1, // Conjure a tidal wave of blood that deals 90% damage and Knocks Back enemies.
    'prime-blood-wave': 1, // Blood Wave Slows enemies by 50% for 4 seconds.
    'supreme-blood-wave': 1, // Blood Wave leaves behind 3 Blood Orbs as it travels.
    'bone-storm': 1, // A swirling storm of bones appears around you and your Golem, dealing 180% to surrounding enemies over 10 seconds.
    'prime-bone-storm': 1, // Your Damage Reduction is increased by 15% while Bone Storm is active.
    'supreme-bone-storm': 1, // Your Critical Strike Chance is increased by 20% while Bone Storm is active.
    'amplify-damage': 3, // You deal {'3%': '6%': '9%':} increased damage to Cursed enemies.
    'bonded-in-essence': 3, // Every 5 seconds, your Skeletal Priest's Healing will Heal your skeletons for {'20%': '40%': '60%':} of their Maximum Life.
    'coalesced-blood': 3, // While Healthy your Blood Skills deal {'6%': '12%': '18%':} increased damage.
    'compound-fracture': 3, // After Critically Striking 10 times with Bone Skills, your Bone Skills deal {'5%': '10%': '15%':} increased damage for 5 seconds.
    'crippling-darkness': 3, // Lucky Hit: Darkness Skills have up to a 15% chance to Stun for {1, 2, 3,} seconds.
    'deaths-defense': 3, // Your Minions cannot lose more than {'75%': '50%': '25%':} of their Maximum Life from a single damage instance.
    'deaths-embrace': 3, // Close enemies take {'2%': '4%': '6%':} more damage from you and deal {value2} less damage to you.
    'deaths-reach': 3, // You deal {'4%': '8%': '12%':} increased damage to Distant enemies.
    'drain-vitality': 3, // Lucky Hit: Hitting enemies with Blood Skills has up to a 25% chance to Fortify you for {'2%': '5%': '8%':} Base Life.
    evulsion: 3, // Your Bone Skills deal {'6%': '12%': '18%':} increased Critical Strike Damage to Vulnerable enemies.
    'fueled-by-death': 3, // You deal {'4%': '8%': '12%':} increased damage for 4 seconds after consuming a Corpse.
    gloom: 3, // When you damage enemies with Darkness Skills, they take {'2%': '4%': '6%':} increased Shadow Damage from you and your Minions for 2 seconds, stacking up to 3 times.
    'golem-mastery': 3, // Increase the damage and Life of your Golem by {'15%': '30%': '45%':} .
    'grim-harvest': 3, // Consuming a Corpse generates {3, 6, 9,} Essence.
    'gruesome-mending': 3, // While below 50% Life, you receive {'10%': '20%': '30%':} more Healing from all sources.
    'hellbent-commander': 3, // Your Minions deal {'10%': '20%': '30%':} increased damage while you are Close to them.
    'hewed-flesh': 3, // Lucky Hit: Your damage has up to a {'4%': '8%': '12%':} chance to create a Corpse at the target‘s location.
    'imperfectly-balanced': 3, // Your Core Skills cost {'5%': '10%': '15%':} more Essence, but deal {value2} increased damage.
    'inspiring-leader': 3, // After you have been Healthy for at least 4 seconds, you and your Minions gain {'4%': '8%': '12%':} Attack Speed.
    'kalans-edict': 1, // After you have not taken damage in the last 3 seconds, your Minions gain 15% Attack Speed. While you have at least 7 Minions, this bonus is doubled.
    'memento-mori': 3, // Sacrificing both Skeletal Warriors and Skeletal Mages increases their Sacrifice bonuses by {'20%': '40%': '60%':} .
    'necrotic-carapace': 1, // When a Corpse is formed from your Skills or your Minions, Fortify for 2% Base Life.
    'ossified-essence': 1, // Your Bone Skills deal 1% increased damage for each point of Essence you have above 50 upon cast.
    'rapid-ossification': 3, // Every 100 Essence you spend reduces the cooldowns of your Bone Skills by {0.5, 1, 1.5,} seconds.
    'rathmas-vigor': 1, // Increase your Maximum Life by 10%. After being Healthy for 15 seconds, your next Blood Skill Overpowers.
    'reapers-pursuit': 3, // Damaging enemies with Darkness Skills increases your Movement Speed by {'5%': '10%': '15%':} for 3 seconds.
    serration: 3, // Your Bone Skills have a {'0.5%': '1.0%': '1.5%':} increased Critical Strike Chance for each 10 Essence you have upon cast.
    shadowblight: 1, // Shadow Damage infects enemies with Shadowblight for 2 seconds. You and your minions deal 10% bonus damage to enemies with Shadowblight.
    'skeletal-mage-mastery': 3, // Increase the damage and Life of your Skeletal Mages by {'15%': '30%': '45%':} .
    'skeletal-warrior-mastery': 3, // Increase the damage and Life of your Skeletal Warriors by {'15%': '30%': '45%':} .
    'spiked-armor': 1, // Gain X, Thorns.
    'stand-alone': 3, // Increases Damage Reduction by {'6%': '12%': '18%':} , reduced by 2% for each active Minion.
    terror: 3, // Darkness Skills deal {'3%': '6%': '9%':} bonus damage to enemies who are Slowed, and {value2} bonus damage to enemies who are Stunned or Immobilized. These bonuses stack and apply to Shadow Damage dealt by your Minions.
    'tides-of-blood': 3, // Your Blood Skills deal {'5%': '10%': '15%':} increased Overpower damage. This bonus is doubled while you are Healthy.
    transfusion: 3, // Blood Orbs also Heal your Minions for {'15%': '30%': '45%'} of the amount.
  },
  toggles: {
    'enemy-spread-yards': 10,
    'number-of-enemies': 2,
    'percent-life': 100,
  },
  paragons: {},
  bookOfTheDead: {
    skeletalWarriors: ['reapers', 2],
    skeletalMages: ['shadow', 1],
    golem: ['bone', 3],
  },
  abilities: [
    'decompose',
    'bone-spear',
    'bone-storm',
    'raise-skeleton',
    'golem',
    'reap',
  ],
}
