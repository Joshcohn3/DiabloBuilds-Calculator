import { RogueCharacter } from '../player_character'

export const DefaultTestRogue: RogueCharacter = {
  level: 10,
  class: 'Rogue',
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
    weaponType: 'dagger',
    attackSpeed: 1.5,
    weaponDamage: 150,
    modifiers: [
      ['vulnerable-damage', 0.05],
      ['damage-to-close-enemies', 0.12],
      ['basic-skill-damage', 0.15],
    ],
  },
  offHand: {
    weaponType: 'dagger',
    attackSpeed: 1.5,
    weaponDamage: 150,
    modifiers: [['overpower-damage', 0.1]],
  },
  ranged: {
    weaponType: 'bow',
    attackSpeed: 1.5,
    weaponDamage: 150,
    modifiers: [],
  },
  talents: {
    'blade-shift': 5, // Quickly stab your victim for {'15%': '17%': '18%': '20%': '21%'} damage and shift, allowing you to move freely through enemies for 3 seconds.
    'enhanced-blade-shift': 1, // Damaging an enemy with Blade Shift grants 5% Movement Speed while Blade Shift is active, up to 20%.
    'fundamental-blade-shift': 1, // Moving through enemies while Blade Shift is active refreshes its duration. After moving through enemies 5 times, your next Blade Shift will Daze enemies for 2 seconds.
    'primary-blade-shift': 1, // While Blade Shift is active, you gain 15% to all Non-Physical Resistances and reduce the duration of incoming Control Imparing Effects by 20%.
    'forceful-arrow': 5, // Fire a powerful arrow at an enemy, dealing {'20%': '22%': '24%': '26%': '28%'} damage. Every 3rd cast makes the enemy Vulnerable for 2 seconds.
    'enhanced-forceful-arrow': 1, // Every 3rd cast of Forceful Arrow additionally has a 15% increased Critical Strike Chance.
    'fundamental-forceful-arrow': 1, // Forceful Arrow Knocks Back Non-Elite enemies if they are Close. If they collide with another enemy, both or Knocked Down for 1.5 seconds.
    'primary-forceful-arrow': 1, // Forceful Arrows pierces through Vulnerable enemies.
    heartseeker: 5, // Fire an arrow that seeks an enemy, dealing {'22%': '24%': '26%': '29%': '31%'} damage and increasing your Critical Strike Chance against them by 3% for 4 seconds, up to 15%.
    'enhanced-heartseeker': 1, // When Heartseeker Critically Strikes, gain 8% Attack Speed for 4 seconds. Double this amount if the enemy is Vulnerable.
    'fundamental-heartseeker': 1, // Heartseeker also increases the Critical Strike Damage the enemy takes from you by 5% for 4 seconds, up to 25%.
    'primary-heartseeker': 1, // Heartseeker ricochets to an additonal enemy, dealing 30% of the original damage.
    'invigorating-strike': 5, // Melee attack an enemy, dealing {'23%': '25%': '28%': '30%': '32%':} damage and increasing Energy Regeneration by 20% for 3 seconds.
    'enhanced-invigorating-strike': 1, // Damaging a Crowd Controlled or Injured enemy with Invigorating Strike increases its Energy Regeneration bonus to 30%.
    'fundamental-invigorating-strike': 1, // Hitting an enemy with Invigorating Strike while you are below 560% Energy makes them Vulnerable for 3 seconds.
    'primary-invigorating-strike': 1, // Invigorating Strike additionally grants 8% Lucky Hit Chance. Hitting a Crowd Controlled or Injured enemy increases this bonus to 16% Lucky Hit Chance.
    puncture: 5, // Throw blades a short distance, dealing {'21%': '23%': '25%': '27%': '29%':} damage. Every 3rd cast Slows enemies by 20% for 2 seconds. Critical Strikes will always Slow.
    'enhanced-puncture': 1, // Gain 2 Energy when Puncture damages a Crowd Controlled enemy.
    'fundamental-puncture': 1, // Punture now throws 3 blades in a spread, each dealing 35% of its Base damage. Hitting an enemy with at least 2 blades at once makes them Vulnerable for 2 seconds.
    'primary-puncture': 1, // Every 3rd cast of Puncture will also ricochet up to 2 times. Critical Strikes will always ricochet.
    barrage: 5, // Unleash a barrage of 5 arrows that expands outwards, each dealing {'21%': '23%': '25%': '27%': '29%':} damage. Each arrows has a 20% chance to ricochet off an enemy up to 1 time. Ricochets deal 40% of the arrow's Base damage.
    'enhanced-barrage': 1, // Barrage's ricochet chance is increased to 100% for arrows that damage a Vulnerable enemy or Critical Strike an enemy.
    'advanced-barrage': 1, // Whenever a single cast of Barrage ricochets at least 4 times, your next cast gains 20% increased Critical Strike Chance.
    'improved-barrage': 1, // Every 3rd cast of Barrage makes enemies Vulnerable for 2 seconds.
    flurry: 5, // Unleash a flurry of stabs and slashes, striking enemies in front of you 4 times and dealing {'60%': '66%': '72%': '78%': '84%':} damage to each.
    'enhanced-flurry': 1, // Each time Flurry damages a Crowd Controlled or Vulnerable enemy, you are Healed for 1% of your Maximum Life, up to 12% Maximum Life per cast.
    'advanced-flurry': 1, // Evading through an enemy will cause your next Flurry to Stun enemies for 2.5 seconds.
    'improved-flurry': 1, // If Flurry hits any Vulnerable enemy it will make all enemies hit by that cast Vulnerable for 3 seconds.
    'penetrating-shot': 5, // Fire an arrow that pierces through all enemies in a line, dealing {'70%': '77%': '84%': '91%': '98%':} damage.
    'enhanced-penetrating-shot': 1, // Penetrating Shot deals 20% increased damage per enemy it pierces.
    'advanced-penetrating-shot': 1, // When cast with full Energy, Penetrating Shot will Slow all enemies hit by 50% for 3 seconds. Elite enemies will also be Knocked Down for 1.5 seconds.
    'improved-penetrating-shot': 1, // If Penetrating Shot damages at least 3 enemies, your next Penetrating Shot has a 20% increased Critical Strike Chance.
    'rapid-fire': 5, // Rapidly fire 5 arrows, each dealing {'24%': '26%': '29%': '31%': '34%':} damage.
    'enhanced-rapid-fire': 1, // Each subsequent arrow from Rapid Fire has 5% increased Critical Strike Chance, up to 25% for the 5th arrow.
    'advanced-rapid-fire': 1, // Rapid Fire deals 30% increased Critical Strike Damage for 3 seconds after you Evade.
    'improved-rapid-fire': 1, // Gain 15 Energy per cast of Rapid Fire when it damages a Vulnerable enemy.
    'twisting-blades': 5, // Impale an enemy with your blades, dealing {'45%': '50%': '54%': '58%': '63%':} damage and making them take 8% increased damage from you while impaled. After 1.5 seconds, the blades return to you, piercing enemies for {value2} damage.
    'enhanced-twisting-blades': 1, // Twisting Blades deals 30% increased damage when returning.
    'advanced-twisting-blades': 1, // When your Twisting Blades return, your active Cooldowns are reduced by 1 second per enemy they passed through, up to 3 seconds.
    'improved-twisting-blades': 1, // Enemies are Dazed while impaled with Twisting Blade.
    concealment: 5, // Vanishes from sight, gaining an advanced form of Stealth for 4 seconds that will not be removed by taking damage.
    'enhanced-concealment': 1, // You gain 40 Energy when you enter Concealment.
    'countering-concealment': 1, // The Skill that breaks Concealment will always be a guaranteed Critical Strike.
    'subverting-concealment': 1, // The Skill that breaks Concealment makes enemies Vulnerable for 3 seconds.
    'dark-shroud': 5, // Surround yourself with up to 5 protective shadows. Gain {'8%': '8.8%': '9.6%': '10.4%': '11.2%':} Damage Reduction per active shadow. Each time you take direct damage, that damage is reduced and a shadow is consumed.
    'enhanced-dark-shroud': 1, // Dark Shroud's shadows have a 10% chance to not be consumed.
    'countering-dark-shroud': 1, // While you have at least 2 active shadows from Dark Shroud, gain 10% Critical Strike Chance.
    'subverting-dark-shroud': 1, // Each active shadow from Dark Shroud grants you 3% increased Movement Speed.
    'poison-trap': 5, // Place a trap that arms after 1.25 seconds. It activates when an enemy moves within range, applying {'344%': '379%': '413%': '447%': '482%':} Poisoning damage over 9 seconds to enemies in the area.
    'enhanced-poison-trap': 1, // Pọison Trap Knocks Down enemies for 1.5 seconds when it activates.
    'countering-poison-trap': 1, // Pọison Trap has a 20% chance to reset your Imbuement Skill Cooldowns when activated.
    'subverting-poison-trap': 1, // You deal 10% increased Poison Damage to enemies standing inside your Pọison Trap.
    'smoke-grenade': 5, // Throw a smoky concoction at enemies that Dazes them for {4, 4.4, 4.8, 5.2, 5.6,} seconds.
    'enhanced-smoke-grenade': 1, // Enemies affected by Smoke Grenade take 15% increased damage from you.
    'countering-smoke-grenade': 1, // Lucky Hit: Dealing direct damage to enemies affected by Smoke Grenade has up to a 25% chance to reduce its Cooldown by 1 second, or by 2 seconds instead if the enemy is Vulnerable.
    'subverting-smoke-grenade': 1, // If an enemy is Vulnerable, Slowed, or Chilled then Smoke Grenade will Daze them for 20% longer.
    caltrops: 5, // Leap backwards and throw caltrops on the ground, dealing {'30%': '33%': '36%': '39%': '42%':} damage and Slowing enemies by {value2} . Lasts 6 seconds.
    'enhanced-caltrops': 1, // Enemies take 3% increased damage from you each second they are in Caltrops.
    'methodical-caltrops': 1, // Caltrops now deal Cold damage and Chills enemies for 20% per second.
    'disciplined-caltrops': 1, // You have 5% Critical Strike Chance against enemies inside your Caltrops. Double this amount against Vulnerable enemies.
    dash: 5, // Dash forward and slash enemies for {value2} damage.
    'enhanced-dash': 1, // Enemies damaged by Dash take 20% increased Critical Strike Damage from you for 5 seconds.
    'methodical-dash': 1, // Dealing damage to Crowd Controlled enemies with Dash reduces its Charge Cooldown by 0.5 seconds, up to 3 seconds per cast.
    'disciplined-dash': 1, // Dash Slows enemies hit by 30% for 3 seconds. Any enemy already Slowed will be Dazed for 2 seconds instead.
    'shadow-step': 5, // Become Unstoppable and quickly move through the sahdows to stab your victim from behind for {'72%': '79%': '86%': '94%': '101%':} damage. Gain 50% increases Movement Speed for 2 seconds afterwards.
    'enhanced-shadow-step': 1, // Damaging an enemy with Shadow Step increases your Critical Strike Chance against them by 8% for 3 seconds.
    'methodical-shadow-step': 1, // Enemies damaged by Shadow Step are Stunned for 2 seconds.
    'disciplined-shadow-step': 1, // Shadow Step's Cooldown is reduced by 3 seconds when it damages an enemy you haven't hit with Shadow Step in the last 4 seconds.
    'cold-imbuement': 5, // Imbue your weapons with frigid energies. Your next 2 Imbueable Skills deal Cold damage and Chill enemies for {'25%': '28%': '30%': '33%': '35%':} per hit.
    'enhanced-cold-imbuement': 1, // Lucky Hit: Cold Imbued Skills have up to a 30% chance to make enemies Vulnerable for 3 seconds.
    'blended-cold-imbuement': 1, // Lucky Hit: Critical Strikes with Cold Imbued Skills have up to a 20% chance to instantly Freeze enemies for 3 seconds.
    'mixed-cold-imbuement': 1, // Cold Imbued Skills deal 20% damage to Crowd Controlled enemies. Double this bonus against Frozen enemies.
    'poison-imbuement': 5, // Imbue your weapons with lethal poison. Your next 2 Imbueable Skills deal Poison damage and apply {'70%': '77%': '84%': '91%': '98%':} of their Base damage as additional Poisoning damage over 5 seconds.
    'enhanced-poison-imbuement': 1, // Poison Imbuement's Poisoning Duration is increased by 1 second.
    'blended-poison-imbuement': 1, // Critical Strikes with Poison Imbued Skills deal 30% increased Poisioning damage.
    'mixed-poison-imbuement': 1, // Lucky Hit: Poison Imbued Skills have up to a 30% chance to apply double the amount of Poisoning damage over time.
    'shadow-imbuement': 5, // Imbue your weapons with festering shadows. Your next 2 Imbueable Skills deal Shadow damage and infect enemies for 6 seconds. Infected enemies explode on death, dealing {'40%': '44%': '48%': '52%': '56%':} damage to all surrounding enemies.
    'enhanced-shadow-imbuement': 1, // You have 25% increased Critical Strike Chance against Injured enemies infected by Shadow Imbuement.
    'blended-shadow-imbuement': 1, // Shadow Imbuement's primary explosion makes enemies Vulnerable for 2 seconds.
    'mixed-shadow-imbuement': 1, // Enemies damaged by Shadow Imbued Skills take 12% increased Non-Physical damage from you for 8 seconds.
    'death-trap': 1, // Place a trap that arms after 1.25 seconds. It activates when an enemy moves within range, dealing 250% damage to each enemy in the area.
    'prime-death-trap': 1, // Enemies are Pulled into Death Trap when it activates.
    'supreme-death-trap': 1, // If Death Trap kills an enemy, its Cooldown is reduced by 10 seconds.
    'rain-of-arrows': 1, // Arrows rain down over a large area 2 times, each wave dealing 100% damage.
    'prime-rain-of-arrows': 1, // lmbuement Skill effects applied by Rain of Arrows have 20% increased potency.
    'supreme-rain-of-arrows': 1, // Rain of Arrows' second wave Knocks Down enemies for 3 seconds.
    'shadow-clone': 1, // Your shadow mimicks your actions for 15 seconds.
    'prime-shadow-clone': 1, // You are Unstoppable for 5 seconds after casting Shadow Clone.
    'supreme-shadow-clone': 1, // Your Shadow Clone deals an additional 20% of your damage.
    'adrenaline-rush': 3, // While moving, you gain {'5%': '10%': '15%':} increased Energy Regeneration.
    aftermath: 3, // After using an Ultimate Skill, restore {25, 50, 75,} Energy.
    agile: 3, // Using a Cooldown increases your Dodge Chance by {'3%': '6%': '9%':} for 2 seconds.
    'alchemical-advantage': 3, // You gain {'1%': '2%': '3%':} increased Attack Speed for each enemy you've Poisoned, up to 15%.
    'alchemists-fortune': 3, // Non-Physical damage you deal has a {'5%': '10%': '15%':} increased Lucky Hit Chance.
    'chilling-weight': 3, // Chilled enemies have their Movement Speed further reduced by up to {'10%': '20%': '30%':} .
    'close-quarters-combat': 1, // Damaging a Close enemy with Marksman or Cutthroat Skills each grant a 10% Attack Speed bonus for 8 seconds.
    concussive: 3, // After Knocking Back or Knocking Down an enemy, you gain {'5%': '10%': '15%':} increased Critical Strike Chance against them for 3 seconds.
    'consuming-shadows': 3, // Each time you kill an enemy with Shadow Damage, you generate {10, 20, 30,} Energy.
    'deadly-venom': 3, // You deal {'3%': '6%': '9%':} increased Poisoning damage.
    'debilitating-toxins': 3, // Poisoned enemies deal {'5%': '10%': '15%':} less damage.
    exploit: 3, // You deal {'6%': '12%': '18%':} increased damage to Healthy and injured enemies.
    exposure: 1, // Lucky Hit: Dealing direct damage to an enemy affected by a Trap Skill has up to a 25% chance to:
    'frigid-finesse': 3, // You deal {'5%': '10%': '15%':} increased damage to Chilled enemies. This bonus increases to {value2} against Frozen enemies.
    haste: 3, // While at or above 50% maximum Energy, gain {'5%': '10%': '15%':} increased Movement Speed. While below 50% maximum Energy, gain {'5%': '10%': '15%':} increased Attack Speed.
    impetus: 3, // After moving 15 meters, your next attack deals {'7%': '14%': '21%':} increased damage.
    innervation: 3, // Lucky Hit: Up to a {'10%': '20%': '30%':} chance to gain 8 Energy.
    malice: 3, // You deal {'3%': '6%': '9%':} increased damage to Vulnerable enemies.
    'mending-obscurity': 3, // While Stealthed, you Heal for {'1%': '2%': '3%':} Maximum Life per second.
    momentum: 1, // Cutthroat Skills grant a stack of Momentum for 8 seconds if they either:
    precision: 1, // Critical Strikes with Marksman Skills grant you Precision. You gain 4% increased Critical Strike Damage per stack of Precision, up to a maximum of 20%.
    'precision-imbuement': 3, // Imbued Skills gains {'5%': '10%': '15%':} increased Critical Strike Chance.
    'rapid-gambits': 3, // Your Evade Cooldown is reduced by {0.5, 1, 1.5,} seconds when you Daze an enemy.
    'reactive-defense': 3, // Gain {'4.5%': '9%': '13.5%':} Damage Reduction while inflicted with Control Impairing Effects.
    rugged: 3, // Gain {'5%': '10%': '15%':} Damage Reduction against Damage Over Time effects.
    'second-wind': 3, // Every 100 Energy you spend grants you {'5%': '10%': '15%':} increased Lucky Hit Chance for 5 seconds.
    'shadow-crash': 3, // Lucky Hit: Shadow damage has up to a 10% chance to Stun for {0.5, 1, 1.5,} seconds.
    'siphoning-strikes': 3, // Heal for {'1%': '2%': '3%':} of your Maximum Life when you Critically Strike Close enemies.
    sturdy: 3, // You gain {'4%': '8%': '12%':} Close Damage Reduction.
    'stutter-step': 3, // Critically Striking an enemy grants {'5%': '10%': '15%':} Movement Speed for 4 seconds.
    'trap-mastery': 3, // When Poison Trap or Death Trap activates, you gain {'4%': '8%': '12%':} increased Critical Strike Chance against Vulnerable and Crowd Controlled enemies for 4 seconds.
    'trick-attacks': 3, // When you Critically Strike a Dazed enemy, they are Knocked Down for {0.5, 1, 1.5,} seconds.
    victimize: 1, // Lucky Hit: Dealing direct damage to a Vulnerable enemy has up to a 30% chance to cause an explosion, dealing 23% of the original damage to them and surrounding enemies.
    'weapon-mastery': 3, // Gain a bonus when attacking based on weapon type:
  },
  toggles: {
    'enemy-spread-yards': 10,
    'number-of-enemies': 3,
    'percent-life': 1,

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
    'enemy-burning': false,
    'enemy-knocked-down': false,
    'enemy-poisoned': false,
    'enemy-slowed': false,
  },
  specialization: 'combo-points',
  paragons: {},
  abilities: [
    'shadow-clone',
    'poison-imbuement',
    'rapid-fire',
    'death-trap',
    'forceful-arrow',
  ],
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
