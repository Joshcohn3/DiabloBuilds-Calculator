import { SorcererCharacter } from '../player_character'

export const DefaultTestSorcerer: SorcererCharacter = {
  level: 10,
  class: 'Sorcerer',
  enchantments: [undefined, undefined],
  helmet: {
    modifiers: [
      ['armor', 25],
      ['core-skill-damage', 0.05],
      ['maximum-life', 20],
      ['attack-speed', 0.015],
      ['cold-resistance', 0.15],
    ],
  },
  ring1: {
    modifiers: [
      ['cold-resistance', 0.15],
      ['critical-strike-chance', 0.05],
    ],
    aspect: ['aspect-of-efficiency', [0.2]],
  },
  mainHand: {
    weaponType: 'sword',
    attackSpeed: 1.1,
    weaponDamage: 150,
    modifiers: [
      ['vulnerable-damage', 0.05],
      ['damage-to-close-enemies', 0.12],
      ['basic-skill-damage', 0.15],
      ['cold-resistance', 0.15],
      [
        'lucky-hit:-up-to-a-chance-to-execute-injured-non-elites',
        0.2,
      ],
    ],
  },
  offHand: {
    weaponType: 'focus',
    attackSpeed: 1.2,
    weaponDamage: 150,
    modifiers: [['overpower-damage', 0.1]],
  },
  talents: {
    'frost-bolt': 5, //Throw a bolt of frost at an enemy, dealing {35/38.5/42/45.5/49/52.5/56/59.5/63/66.5}% damage and Chilling them for 15%.
    'enhanced-frost-bolt': 1, //`Frost Bolt has a 15% chance to explode on Chilled enemies, hitting surrounding enemies. Chance increased to 100% against Frozen enemies.
    'flickering-frost-bolt': 1, //Frost Bolt makes Frozen enemies Vulnerable for 3 seconds.
    'glinting-frost-bolt': 1, //Frost Bolt generates 4 Mana when hitting Chilled or Frozen enemies
    spark: 5, //Launch a bolt of lightning that shocks an enemy 4 times, dealing {8/8.8/9.6/10.4/11.2/12/12.8/13.6/14.4/15.2}% damage each hit.
    'enhanced-spark': 1, //Each time Spark hits its primary target, it has a 20% chance to hit up to 3 additional enemies, dealing {5.6/6.2/6.7/7.3/7.8/8.4/9/9.5/10.1/10.6}% damage. If there are no other enemies to hit, Spark instead deals x20% increased damage to its primary target.
    'flickering-spark': 1, //Each time Spark hits an enemy it has a 3% chance to form a Crackling Energy.
    'glinting-spark': 1, //Spark grants +2% increased Critical Strike Chance per cast for 3 seconds, up to +10%.
    'arc-lash': 5, //Unleash arcing lightning that deals {42/46.2/50.4/54.6/58.8/63/67.2/71.4/75.6/79.8}% damage to enemies in front of you. Every 10 times Arc Lash swipes, it Stuns all enemies hit for 2 seconds.
    'enhanced-arc-lash': 1, //If Arc Lash's initial swipe Critically Strikes, it swipes an additional time.
    'glinting-arc-lash': 1, //Hitting a Stunned enemy with Arc Lash reduces your Cooldowns by 0.25 seconds.
    'flickering-arc-lash': 1, //`Gain +6% Movement Speed for 5 seconds per enemy hit with Arc Lash, up to +18%.
    'fire-bolt': 5, //Hurl a flaming bolt, dealing {10/11/12/13/14/15/16/17/18/19}% damage and Burning for {40/44/48/52/56/60/64/68/72/76}% damage over 8 seconds.
    'enhanced-fire-bolt': 1, //Fire Bolt pierces through Burning enemies.
    'glinting-fire-bolt': 1, //`Critical Strikes with Fire Bolt increase the Burning damage you deal to the enemy by x20% for 4 seconds.
    'flickering-fire-bolt': 1, //Fire Bolt generates 2 Mana when hitting a Burning enemy
    'charged-bolts': 5, //Release 5 bolts of lightning that course along the ground in an erratic pattern, dealing {17.5/19.2/21/22.7/24.5/26.2/28/29.8/31.5/33.2}% damage each.
    'enhanced-charged-bolts': 1, //Hitting an enemy at least 3 times with same cast of Charged Bolts releases a lightning nova, dealing 15% damage to enemies around them.
    'greater-charged-bolts': 1, //Charged Bolts deals x25% increased damage to Stunned enemies.
    'destructive-charged-bolts': 1, //Hitting an enemy with Charged Bolts reduces their damage dealt by 20% for 3 seconds.
    'frozen-orb': 5, //Unleash an orb that Chills for 34% and expels piercing shards, dealing a total of {31.7/34.9/38/41.2/44.4/47.5/50.7/53.9/57/60.2}% damage. Upon expiration, Frozen Orb explodes, dealing {29.2/32.2/35.1/38/41/43.9/46.8/49.7/52.6/55.6}% damage and Chilling enemies for 8.7%.
    'enhanced-frozen-orb': 1, //When cast above 50 Mana, Frozen Orb's explosion damage is increased by x30%.
    'destructive-frozen-orb': 1, //Frozen Orb's explosion restores 5 Mana when hitting a Frozen enemy.
    'greater-frozen-orb': 1, //Frozen Orb's explosion has a 25% chance to make all enemies hit Vulnerable for 2 seconds. Frozen Orb always makes Frozen enemies Vulnerable.
    incinerate: 5, //Channel a beam of fire, Burning enemies for {9.1/10/10.925/11.825/12.75/13.65/14.55/15.475/16.375/17.3}% damage per second. Damage per second increases over 4 seconds, up to {49.1/54/59/63.9/68.9/73.7/78.6/83.6/88.4/93.4}%.
    'enhanced-incinerate': 1, //While channeling Incinerate, you Burn enemies around you for 15% of the damage per second
    'destructive-incinerate': 1, //Enemies deal 20% less damage while Burning from Incinerate.
    'greater-incinerate': 1, //Every 4 seconds an enemy has been hit by Incinerate, they are Immobilized for 1 seconds.
    fireball: 5, //Hurl an exploding ball of fire, dealing {60/66/72/78/84/90/96/102/108/114}% damage to surrounding enemies.
    'enhanced-fireball': 1, //Fireball's radius is increased based on distance traveled, up to 50%.
    'greater-fireball': 1, //Fireball deals 10% of the Burning damage you've applied to enemies as additional direct damage.
    'destructive-fireball': 1, //Fireball's explosion's Critical Strike Damage is increased by +10%. Each enemy it hits increases this bonus by +5%, up to +25% total.
    'chain-lightning': 5, //Unleash a stream of lightning that deals {42/46.2/50.4/54.6/58.8/63/67.2/71.4/75.6/79.8}% damage and chains between Nearby enemies and you up to 6 times, prioritizing enemies.
    'enhanced-chain-lightning': 1, //Chain Lightning gains a +3% increased Critical Strike Chance per bounce.
    'greater-chain-lightning': 1, //`If Chain Lightning bounces off of you, its next hit deals x25% increased damage
    'destructive-chain-lightning': 1, //`When Chain Lightning Critically Strikes, it has a 25% chance to form a Crackling Energy.
    'ice-shards': 5, //Launch 5 shards that deal {25/27.5/30/32.5/35/37.5/40/42.5/45/47.5}% damage each. Deals x25% increased damage to Frozen enemies.
    'enhanced-ice-shards': 1, //Ice Shards have a 15% chance to ricochet to another enemy. Ice Shards always ricochet off of Frozen enemies.
    'greater-ice-shards': 1, //While you have a Barrier active, casts of Ice Shards treat enemies as if they were Frozen.
    'destructive-ice-shards': 1, //Hitting an enemy with 5 Ice Shards in a single cast makes them Vulnerable for 2 seconds.
    devastation: 3, //Your Maximum Mana is increased by {3/6/9/12/15/18/21/24/27/30}.
    'elemental-dominance': 3, //Your Core Skills deal x{4/8/12/16/20/24/28/32/36/40}% increased damage when cast above 50 Mana.
    'potent-warding': 3, //After casting a Non-Basic Skill, you gain {2/4/6/8/10/12/14/16/18/20}% Resistance to all elements and {1/2/3/4/5/6/7/8/9/10}% additional Resistance to that Skill's element for 3 seconds.
    'flame-shield': 5, //Engulf yourself in flames for {2/2.2/2.4/2.6/2.8/3/3.2/3.4/3.6/3.8} seconds, Burning surrounding enemies for {23.4/25.7/28.1/30.4/32.8/35.1/37.4/39.8/42.1/44.5}% damage per second.
    'enhanced-flame-shield': 1, //Flame Shield grants +25% Movement Speed while active.
    'mystical-flame-shield': 1, //You gain 25% Mana Cost Reduction while Flame Shield is active.
    'shimmering-flame-shield': 1, //Flame Shield Heals you for 50% of your missing Life.
    'frost-nova': 5, //Unleash a torrent of frost, Freezing enemies around you for 2 seconds.
    'enhanced-frost-nova': 1, //Killing enemies Frozen by Frost Nova reduces its Cooldown by 2 seconds, up to 6 seconds per cast.
    'mystical-frost-nova': 1, //Frost Nova makes enemies Vulnerable for 4 seconds, increased to 8 seconds against Bosses
    'shimmering-frost-nova': 1, //Frost Nova generates 4 Mana per enemy hit
    'ice-armor': 5, //A Barrier of ice forms around you for 6 seconds, absorbing {#}% of your Base Life in damage. While Ice Armor is active, 10% of your damage dealt is added to its Barrier
    'enhanced-ice-armor': 1, //While Ice Armor is active, your Mana Regeneration is increased by x25%
    'shimmering-ice-armor': 1, //Enemies that hit you while Ice Armor is active have a 15% chance to become Frozen for 3 seconds
    'mystical-ice-armor': 1, //Damage against Vulnerable enemies contributes 100% more to Ice Armor's Barrier.
    teleport: 5, //Transform into lightning, becoming Unstoppable and surging to the target location, dealing {25/27.5/30/32.5/35/37.5/40/42.5/45/47.5}% damage around you upon arrival
    'enhanced-teleport': 1, //Teleport's Cooldown is decreased by 0.5 seconds per enemy hit, up to 3 seconds
    'mystical-teleport': 1, //For 4 seconds after Teleporting, Crackling Energy hits 2 additional enemies.
    'shimmering-teleport': 1, //After Teleporting, you gain 30% Damage Reduction for 5 seconds
    'elemental-attunement': 3, //Lucky Hit: Critical Strikes have a {5/10/15/20/25/30/35/40/45/50}% chance to reset the Cooldown of one of your Defensive Skills. Can only happen once every 10 seconds.
    'glass-cannon': 3, //You deal x{6/12/18/24/30/36/42/48/54/60}% increased damage, but take x{3/6/9/12/15/18/21/24/27/30}% more damage.
    hydra: 5, //Summon a 3-headed hydra for 12 seconds. Each head spits fire at enemies, dealing {30/33/36/39/42/45/48/51/54/57}% damage
    'enhanced-hydra': 1, //While Healthy, your casts of Hydra gain 1 additional head.
    'invoked-hydra': 1, //After you Critically Strike, your Hydras gain +30% Critical Strike Chance for 3 seconds.
    'summoned-hydra': 1, //Hydra also Burns enemies for an additional 12% of its Base damage dealt over 6 seconds.
    'ice-blades': 5, //Conjure a pair of ice blades for 6 seconds that rapidly slash enemies for {30.7/33.7/36.8/39.9/42.9/46/49.1/52.1/55.2/58.3}% damage and have a 30% chance to make them Vulnerable for 2 seconds.
    'enhanced-ice-blades': 1, //Ice Blades's Cooldown is reduced by 1 second each time it hits a Vulnerable enemy.
    'summoned-ice-blades': 1, //50% of Enhanced Ice Blades's Cooldown reduction is applied to your other Skills.
    'invoked-ice-blades': 1, //Your Ice Blades gain +10% increased Attack Speed per active Ice Blades.
    'lightning-spear': 5, //Conjure a spear of lightning that seeks out enemies for 6 seconds, dealing {15/16.5/18/19.5/21/22.5/24/25.5/27/28.5}% damage per hit.
    'enhanced-lightning-spear': 1, //After Critically Striking, Lightning Spear gains a +5% increased stacking Critical Strike Chance for its duration.
    'summoned-lightning-spear': 1, //Collecting Crackling Energy increases the damage of your next Lightning Spear cast by x20%, up to x100%.
    'invoked-lightning-spear': 1, //Lightning Spear Stuns enemies for 2 seconds when Critically Striking.
    'conjuration-mastery': 3, //You deal x{1/2/3/4/5/6/7/8/9/10}% increased damage for each active Conjuration.
    'precision-magic': 3, //Your Lucky Hit Chance is increased by +{5/10/15/20/25/30/35/40/45/50}%.
    'align-the-elements': 3, //You gain {5/10/15/20/25/30/35/40/45/50}% Damage Reduction against Elites for each second you haven't taken damage from one, up to 50%.
    'mana-shield': 3, //Every time you spend 100 Mana, you gain {5/10/15/20/25/30/35/40/45/50}% Damage Reduction for 5 seconds.
    protection: 3, //Using a Cooldown grants {10/20/30/40/50/60/70/80/90/100}% of your Maximum Life as a Barrier for 5 seconds.
    meteor: 5, //Summon a meteor that strikes the target location, dealing {50/55/60/65/70/75/80/85/90/95}% damage and Burning the ground for {35/38.5/42/45.5/49/52.5/56/59.5/63/66.5}% damage over 3 seconds.
    'enhanced-meteor': 1, //If a cast of Meteor hits 3 or more enemies, there is a 30% chance an additional Meteor falls on the same location.
    'mages-meteor': 1, //Meteor falls 30% faster.
    'wizards-meteor': 1, //Meteor's impact Immobilizes enemies for 2 seconds.
    blizzard: 5, //Summon a frigid blizzard that deals {#}% damage and continually Chills enemies for 18% over 8 seconds
    'enhanced-blizzard': 1, //Blizzard deals x25% increased damage to Frozen enemies.
    'mages-blizzard': 1, //When cast above 50 Mana, Blizzard's duration is increased by 4 seconds.
    'wizards-blizzard': 1, //While you have an active Blizzard, your Core Skills cost 10% less Mana.
    'ball-lightning': 5, //Discharge a ball of lightning that slowly moves forward, continually zapping enemies for {18/19.8/21.6/23.4/25.2/27/28.8/30.6/32.4/34.2}% damage
    'enhanced-ball-lightning': 1, //Ball Lightning's damage rate is increased by 200% of your Attack Speed Bonus
    'wizards-ball-lightning': 1, //If an enemy is hit at least 4 times by a cast of Ball Lightning, a Crackling Energy is formed. Can only happen once per cast.
    'mages-ball-lightning': 1, //After hitting Close enemies 50 times with Ball Lightning, your next cast of it Stuns enemies hit for 1 seconds.
    'inner-flames': 3, //Your Pyromancy Skills deal x{3/6/9/12/15/18/21/24/27/30}% increased damage while you are Healthy.
    'crippling-flames': 3, //Lucky Hit: Your Pyromancy Skills have a {5/10/15/20/25/30/35/40/45/50}% chance to Immobilize enemies for 2 seconds. This chance is doubled while you are Healthy.
    'devouring-blaze': 3, //You deal x{10/20/30/40/50/60/70/80/90/100}% increased Critical Strike Damage against Burning enemies. If they are also Immobilized, this bonus is increased to x{25/50/75/100/125/150/175/200/225/250}%.
    'static-discharge': 3, //Lucky Hit: Critical Strikes with Shock Skills have up to a {5/10/15/20/25/30/35/40/45/50}% chance to form a Crackling Energy.
    'invigorating-conduit': 3, //Upon absorbing Crackling Energy, you gain {4/8/12/16/20/24/28/32/36/40} Mana.
    'shocking-impact': 3, //Every time you Stun an enemy, you deal {15/30/45/60/75/90/105/120/135/150}% Lightning damage to them.
    'icy-veil': 3, //Your Barriers have a +{5/10/15/20/25/30/35/40/45/50}% increased duration.
    'snap-freeze': 3, //Lucky Hit: Frost Skills have a {3/6/9/12/15/18/21/24/27/30}% chance to instantly Freeze.
    'cold-front': 3, //While you have a Barrier active, you apply x{8/16/24/32/40/48/56/64/72/80}% more Chill.
    firewall: 5, //Create a wall of flames that Burns enemies for {160/176/192/208/224/240/256/272/288/304}% damage over 8 seconds.
    'enhanced-firewall': 1, //Enemies take x25% increased Burning damage from you while standing in Firewall.
    'wizards-firewall': 1, //You gain x5% increased Mana Regeneration per active Firewall, up to x25%.
    'mages-firewall': 1, //Enemies continue Burning for 3 seconds after leaving Firewall.
    inferno: 5, //Summon a fiery serpent that continually constricts the target area, Burning enemies for 295% damage over 8 seconds.
    'prime-inferno': 1, //Inferno repeatedly Pulls enemies to its center.
    'supreme-inferno': 1, //While Inferno is active, your Pyromancy Skills cost no Mana.
    'unstable-currents': 5, //Lightning surges within you for 10 seconds. Whenever you cast a Shock Skill, a random Core, Conjuration, or Mastery Shock Skill is also cast.
    'prime-unstable-currents': 1, //Unstable Currents increases your Attack Speed by +25% while active
    'supreme-unstable-currents': 1, //While Unstable Currents is active, Crackling Energy continually pulses and consumes no charges.
    'deep-freeze': 5, //Encase yourself in ice, becoming Immune for 4 seconds, continually dealing 12.5% damage, and Chilling enemies for 20%. When Deep Freeze expires, it deals an additional 100% damage.
    'prime-deep-freeze': 1, //When Deep Freeze ends, gain 10% of your Base Life as a Barrier for 6 seconds for each enemy you Froze while it was active.
    'supreme-deep-freeze': 1, //When Deep Freeze ends, your Non-Ultimate Cooldowns are reduced by 50%.
    permafrost: 3, //Frost Skills deal x{5/10/15/20/25/30/35/40/45/50}% increased damage to Elites.
    hoarfrost: 3, //You deal x{3/6/9/12/15/18/21/24/27/30}% increased damage to Chilled enemies, and x{6/12/18/24/30/36/42/48/54/60}% increased damage to Frozen enemies.
    'frigid-breeze': 3, //Lucky Hit: Cold Damage against Vulnerable enemies has a 20% chance to generate {5/10/15/20/25/30/35/40/45/50} Mana.
    'icy-touch': 3, //You deal x{4/8/12/16/20/24/28/32/36/40}% increased Cold Damage to Vulnerable enemies.
    'coursing-currents': 3, //Hitting enemies with Shock Skills increases your Critical Strike Chance by +{1/2/3/4/5/6/7/8/9/10}%. Resets upon getting a Critical Strike.
    electrocution: 3, //Enemies deal {5/10/15/20/25/30/35/40/45/50}% less damage for 5 seconds after being Critically Struck by your Shock Skills.
    convulsions: 3, //Lucky Hit: Shock Skills have a {3/6/9/12/15/18/21/24/27/30}% chance to Stun enemies for 3 seconds.
    conduction: 3, //Critical Strikes with Shock Skills increase your Movement Speed by +{3/6/9/12/15/18/21/24/27/30}%
    'fiery-surge': 3, //Killing a Burning enemy increases your Mana Regeneration by +{10/20/30/40/50/60/70/80/90/100}% for 3 seconds.
    'endless-pyre': 3, //You deal increased Burning damage to enemies for each second they remain Burning, up to x{5/10/15/20/25/30/35/40/45/50}% after 5 seconds.
    warmth: 3, //Every 1 second, you Heal for {0.3/0.6/0.9/1.2/1.5/1.8/2.1/2.4/2.7/3}% of your Maximum Life for each Nearby Burning enemy. Healing increased to {0.6/1.2/1.8/2.4/3/3.6/4.2/4.8/5.4/6}% from Bosses.
    soulfire: 3, //After standing still for 1.5 seconds, your Pyromancy Skills cost {5/10/15/20/25/30/35/40/45/50}% less Mana.
    shatter: 1, //After Freeze expires, enemies explode for 25% of the damage you dealt to them while Frozen.
    avalanche: 1, //Lucky Hit: Your Frost Skills have up to a 10% chance to make your next cast of Ice Shards, Frozen Orb, or Blizzard consume no Mana and deal x40% increased damage. Chance is doubled against Vulnerable enemies.
    combustion: 1, //Your Burning effects deal x{2/4/6/8/10/12/14/16/18/20}% increased damage per unique source of Burning you have applied to the enemy. If the enemy is Burning from 3 or more sources, this bonus is doubled.
    'esus-ferocity': 1, //Your Fire Critical Strike Damage is increased by x25% against enemies above 50% Life. Your Fire Critical Strike Chance is increased by +5% against enemies below 50% Life.Killing an enemy with a Critical Strike grants both bonuses against all enemies for 3 seconds.
    'overflowing-energy': 1, //Crackling Energy hits 1 additional enemy. Each time Crackling Energy hits an enemy, your Shock Skill Cooldowns are reduced by 0.1 seconds, increased to 0.25 seconds against Elites.
    'vyrs-mastery': 1, //Close enemies take x10% increased damage from your Shock Skills and deal 20% less damage to you. Critical Strikes increase these bonuses by 25% for 3 seconds.
  },
  toggles: {
    'enemy-spread-yards': 10,
    'number-of-enemies': 10,
    'percent-life': 0.5,
    'percent-barrier': 0.5,
    'world-tier': 2,
    'enemy-boss': false,
    'enemy-dazed': false,
    'enemy-elite': false,
    'enemy-stunned': false,
    'enemy-vulnerable': false,
    'enemy-chilled': false,
    'enemy-distant': false,
    'enemy-immobilized': false,
    'enemy-affected-by-shadow': false,
    'enemy-bleeding': false,
    'enemy-frozen': false,
    'enemy-burning': true,
    'enemy-knocked-down': false,
    'enemy-poisoned': false,
    'enemy-slowed': false,
  },

  paragons: { powers: [] },
  abilities: ['spark', 'deep-freeze', 'incinerate'],
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
