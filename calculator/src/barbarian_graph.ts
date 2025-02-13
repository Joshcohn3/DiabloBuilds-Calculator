/* eslint-disable @typescript-eslint/no-unused-vars */

import {
  BinomialDistribution,
  CooldownFromRanks,
  ProbabilityInCircle,
  ProbabilityInCone,
  ProbabilityIntersectingLineInCircle,
  WeightedResistanceAverage,
} from './calculation_helpers'
import {
  AspectNode,
  BaseStatsNode,
  DiabloNode,
  MalignantHeartNode,
  NodesMap,
  ParagonNode,
  SeneschalConstructNode,
  SkillNode,
  StatsNode,
  TagsNode,
  TalentNode,
  ToggleNode,
  TriggerNode,
  VampiricNode,
} from './computation_graph'
import { DamageReductionFromArmor } from './continuous_models'
import {
  aggregationVal,
  allSkillsVal,
  aspectVal,
  barbarianPresimVal,
  baseStatVal,
  currentSkillVal,
  expertiseVal,
  malignantHeartVal,
  paragonVal,
  seneschalConstructVal,
  skillVal,
  statVal,
  tagsVal,
  talentVal,
  toggleVal,
  triggerVal,
  vampiricPowerVal,
} from './graph_values'

/*
Here we build the computation graph for the Barbarian. We construct maps for each type of node which contain all nodes of that
type. For nodes types which have no dependencies, we have functions to manually modify and set the value for that node. For
node types which do depend on other nodes, we pass an `update_value_function` into the constructor which uses the value of
other nodes to compute the value of that node. The value need only be computed a single time once all the root nodes are fixed.
We start with the nodes which have no dependencies.
*/

// Applies all damage multipliers to a source of damage based on the tags of the damage. For skills we use the TagsNode
// which includes the "skill" tag implicitly. For damage over time we have to add in the "damage-over-time" tag before
// calling this function.
function BarbarianDamageMultiplier(
  tags: Set<string>,
  nodes_map: NodesMap,
) {
  const Pre_Sim_Node = barbarianPresimVal(nodes_map)
  const number_of_enemies = Number(
    toggleVal(nodes_map, 'number-of-enemies'),
  )
  let Generic_Damage_Bucket_Multiplier =
    1 + statVal(nodes_map, 'Generic_Damage_Bonus')

  if (tags.has('skill')) {
    Generic_Damage_Bucket_Multiplier += statVal(
      nodes_map,
      'Skill_Damage_Bonus',
    )
  }

  Generic_Damage_Bucket_Multiplier +=
    Number(tags.has('burn')) *
    aggregationVal(nodes_map, 'burning-damage')

  Generic_Damage_Bucket_Multiplier +=
    Number(tags.has('cold')) *
    aggregationVal(nodes_map, 'cold-damage')

  Generic_Damage_Bucket_Multiplier +=
    Number(tags.has('damage-over-time')) *
    aggregationVal(nodes_map, 'damage-over-time')

  Generic_Damage_Bucket_Multiplier +=
    Number(tags.has('fire')) *
    aggregationVal(nodes_map, 'fire-damage')

  Generic_Damage_Bucket_Multiplier +=
    Number(tags.has('fire')) *
    Number(tags.has('damage-over-time')) *
    aggregationVal(nodes_map, 'fire-damage')

  Generic_Damage_Bucket_Multiplier +=
    Number(tags.has('lightning')) *
    aggregationVal(nodes_map, 'lightning-damage')

  Generic_Damage_Bucket_Multiplier += tags.has('physical')
    ? aggregationVal(nodes_map, 'physical-damage')
    : aggregationVal(nodes_map, 'non-physical-damage')

  Generic_Damage_Bucket_Multiplier +=
    Number(tags.has('physical')) *
    Number(tags.has('damage-over-time')) *
    aggregationVal(nodes_map, 'physical-damage-over-time')

  Generic_Damage_Bucket_Multiplier +=
    Number(tags.has('poison')) *
    aggregationVal(nodes_map, 'poison-damage')

  Generic_Damage_Bucket_Multiplier +=
    Number(tags.has('shadow')) *
    aggregationVal(nodes_map, 'shadow-damage')

  Generic_Damage_Bucket_Multiplier +=
    Number(tags.has('shadow')) *
    Number(tags.has('damage-over-time')) *
    aggregationVal(nodes_map, 'shadow-damage-over-time')

  Generic_Damage_Bucket_Multiplier +=
    Number(tags.has('earthquake')) *
    aggregationVal(nodes_map, 'damage-with-earthquakes')

  Generic_Damage_Bucket_Multiplier +=
    Number(tags.has('dust-devil')) *
    aggregationVal(nodes_map, 'damage-with-dust-devils')

  Generic_Damage_Bucket_Multiplier +=
    aggregationVal(nodes_map, 'vulnerable-damage') *
    statVal(nodes_map, 'Enemy_Vulnerable')

  Generic_Damage_Bucket_Multiplier +=
    aggregationVal(
      nodes_map,
      'damage-with-skills-that-swap-to-new-weapons',
    ) *
    Math.min(1, Pre_Sim_Node['weapon_swap_rate']) *
    Number(tags.has('skill'))

  let Berserking_Bonus = 0
  if (statVal(nodes_map, 'Berserking_Uptime') > 0) {
    Berserking_Bonus += 0.25
    // Unconstrained (Talent): Increases Berserk's Maximum Duration by 5 Seconds and increase its damage bonus by +25%
    if (talentVal(nodes_map, 'unconstrained') == 1) {
      Berserking_Bonus += 0.25
    }

    // Supreme Wrath of Berserker: While Wrath of Berserker is active, every 50 Fury you spend increases Berserk's Damage Bonus by x25%
    //                             Maximum damage bonus is now x100% bonus damage.
    if (
      talentVal(nodes_map, 'supreme-wrath-of-the-berserker') == 1 &&
      allSkillsVal(nodes_map).has('wrath-of-the-berserker')
    ) {
      let Resource_Spending_Rate = 0
      for (const Skill in Pre_Sim_Node['skill_use_rate']) {
        if (
          Pre_Sim_Node['cross_skill_stat'][Skill]['resource_cost'] < 0
        ) {
          Resource_Spending_Rate +=
            -Pre_Sim_Node['skill_use_rate'][Skill] *
            Pre_Sim_Node['cross_skill_stat'][Skill]['resource_cost']
        }
      }

      //const Average_Wrath_Of_The_Berserker_Stacks = 0

      const Wrath_Of_The_Berserker_Uptime = Math.min(
        1,
        10 / statVal(nodes_map, 'Wrath_Of_The_Berserker_Cooldown'),
      )
      Berserking_Bonus +=
        10 *
        (Wrath_Of_The_Berserker_Uptime / 2) *
        0.25 *
        (Resource_Spending_Rate / 50)
    }
  }
  const Berserking_Multiplier =
    1 + Berserking_Bonus * statVal(nodes_map, 'Berserking_Uptime')

  // vulnerable-damage
  const Vulnerable_Damage_Bucket_Multiplier =
    1 + 0.2 * statVal(nodes_map, 'Enemy_Vulnerable')

  // Multiplier which should be applied to all sources of damage from the character which can crit, not just skills.
  let Crit_Chance = 0
  // Gushing Wounds (Talent): When causing an enemy to bleed, you have a chance equal to your Critical Strike Chance to increase the Bleed amount by 140% of your Critical Strike Damage Bonus
  //                          Overpowering a bleeding enemy creates an explosion that deals 85% bleeding damage over 5 seconds.
  if (
    (!tags.has('damage-over-time') ||
      (tags.has('bleed') &&
        talentVal(nodes_map, 'gushing-wounds') > 0)) &&
    !tags.has('overpower')
  ) {
    Crit_Chance += statVal(nodes_map, 'Generic_Critical_Chance')
    if (tags.has('skill')) {
      Crit_Chance += statVal(nodes_map, 'Skill_Critical_Chance')
    }
    if (tags.has('physical')) {
      Crit_Chance += aggregationVal(
        nodes_map,
        'critical-strike-chance-with-physical-damage',
      )
    }
    Crit_Chance *= statVal(
      nodes_map,
      'Generic_Critical_Chance_Multiplier',
    )
    if (tags.has('skill')) {
      Crit_Chance *= statVal(
        nodes_map,
        'Skill_Critical_Chance_Multiplier',
      )
    }
  }

  let Critical_Damage_Bonus = statVal(
    nodes_map,
    'Generic_Critical_Bonus',
  )

  // Gushing Wounds (Talent): When causing an enemy to bleed, you have a chance equal to your Critical Strike Chance to increase the Bleed amount by 140% of your Critical Strike Damage Bonus
  let Gushing_Wounds_Critical_Damage_Multiplier = 1
  if (
    tags.has('bleed') &&
    talentVal(nodes_map, 'gushing-wounds') > 0
  ) {
    Gushing_Wounds_Critical_Damage_Multiplier += 0.4
  }

  let Critical_Damage_Multiplier =
    statVal(nodes_map, 'Generic_Critical_Damage_Multiplier') *
    Gushing_Wounds_Critical_Damage_Multiplier

  if (tags.has('skill')) {
    Critical_Damage_Bonus += statVal(
      nodes_map,
      'Skill_Critical_Bonus',
    )
    Critical_Damage_Multiplier *= statVal(
      nodes_map,
      'Skill_Critical_Damage_Multiplier',
    )
  }

  // Multiplier which should be applied to all sources of damage from the character, not just skills.
  let Talent_Damage_Multiplier = statVal(
    nodes_map,
    'Generic_Talent_Damage_Multiplier',
  )

  if (tags.has('skill')) {
    Talent_Damage_Multiplier *= statVal(
      nodes_map,
      'Skill_Talent_Damage_Multiplier',
    )
  }

  if (tags.has('bleed')) {
    if (
      talentVal(nodes_map, 'battle-flay') > 0 &&
      'flay' in Pre_Sim_Node['skill_use_rate']
    ) {
      const Battle_Flay_Uptime = Math.min(
        Pre_Sim_Node['skill_use_rate']['flay'] * 3,
        1,
      )
      Talent_Damage_Multiplier *= 1 + 0.1 * Battle_Flay_Uptime
    }

    // Cut to the Bone (Talent up to 3 points): Your Bleeding effects deal x5% increased damage to Vulnerable enemies
    Talent_Damage_Multiplier *=
      1 +
      0.05 *
        talentVal(nodes_map, 'cut-to-the-bone') *
        statVal(nodes_map, 'Enemy_Vulnerable')
  }

  // Legendary Paragon'decimator', // Each time you make an enemy Vulnerable, your damage is increased by 10% for 5 seconds. Overpowering a Vulnerable enemy grants an additional 10% bonus for 5 seconds
  if (
    paragonVal(nodes_map, 'decimator') &&
    toggleVal(nodes_map, 'enemy-vulnerable')
  ) {
    let Overpower_Rate = 0
    for (const Skill in Pre_Sim_Node['skill_use_rate']) {
      Overpower_Rate +=
        Pre_Sim_Node['skill_use_rate'][Skill] *
        Pre_Sim_Node['cross_skill_stat'][Skill]['overpower_chance']
    }
    if (Overpower_Rate * 5 >= 1) {
      Talent_Damage_Multiplier *= 1.2
    } else {
      Talent_Damage_Multiplier *=
        1.1 + 0.1 * Math.min(1, Overpower_Rate * 5)
    }
  }

  // Legendary Paragon Hemorrhage: Your Bleeding damage is increased by 15%[x] of the total amount of your Damage to Vulnerable Enemies bonus.
  if (paragonVal(nodes_map, 'hemorrhage') && tags.has('bleed')) {
    Talent_Damage_Multiplier *=
      1 + 0.15 * aggregationVal(nodes_map, 'vulnerable-damage')
  }

  // Multiplier which should be applied to all sources of damage from the character, not just skills.
  let Aspect_Damage_Multiplier = statVal(
    nodes_map,
    'Generic_Aspect_Damage_Multiplier',
  )

  if (tags.has('skill')) {
    Aspect_Damage_Multiplier *= statVal(
      nodes_map,
      'Skill_Aspect_Damage_Multiplier',
    )
  }

  // (Unique) Fields of Crimson:
  // Enemies standing in the pool take x20% increased Bleeding damage.
  if (
    aspectVal(nodes_map, 'fields-of-crimson').length != 0 &&
    allSkillsVal(nodes_map).has('rupture')
  ) {
    let Rupture_Cooldown = skillVal(nodes_map, 'rupture')[
      'cooldown_seconds'
    ]
    if ('rupture' in Pre_Sim_Node['cross_skill_stat']) {
      Rupture_Cooldown =
        Pre_Sim_Node['cross_skill_stat']['rupture']['cooldown']
    }
    Aspect_Damage_Multiplier *=
      1 +
      0.2 *
        Math.min(6 / (Rupture_Cooldown + 1), 1) *
        Number(tags.has('bleed'))
  }

  // Aspect of Elements  Gain 20-30%[+] increased damage to a set of damage types for 7 seconds.
  // This effect alternates between 2 sets: [Fire, Lightning, and Physical] & [Cold, Poison, and Shadow]
  if (aspectVal(nodes_map, 'aspect-of-elements').length != 0) {
    if (
      tags.has('physical') ||
      tags.has('fire') ||
      tags.has('lightning') ||
      tags.has('cold') ||
      tags.has('poison') ||
      tags.has('shadow')
    ) {
      Aspect_Damage_Multiplier *=
        1 + 0.5 * aspectVal(nodes_map, 'aspect-of-elements')[0]
    }
  }

  // Vampiric Power flowing-veins
  // Casting a Mastery, Weapon Mastery, Macabre, Wrath, or Imbuement Skill calls a bat ally to attack nearby enemies, dealing 80% Physical damage with a 30% chance to Stun.	call-familiar
  // You deal 60% increased Damage Over Time to enemies that are moving or affected by a Vampiric Curse.
  if (
    vampiricPowerVal(nodes_map, 'flowing-veins') &&
    tags.has('damage-over-time')
  ) {
    Aspect_Damage_Multiplier *=
      1 + 0.6 * statVal(nodes_map, 'Vampiric_Curse_Uptime')
  }

  // covens-fangs
  // Your Conjuration, Companion, Minion, and Bat Familiar attacks deal 52% increased damage to Crowd Controlled enemies. Lucky Hit: Your Conjuration, Companion, Minion, and Bat Familiar have up to a 30% chance to inflict Vampiric Curse when hitting enemies.
  if (
    (vampiricPowerVal(nodes_map, 'covens-fangs') &&
      statVal(nodes_map, 'Enemy_Crowd_Controlled') &&
      (tags.has('minion') || tags.has('companion'))) ||
    tags.has('bat')
  ) {
    Aspect_Damage_Multiplier *= 1.52
  }

  let Attribute_Damage_Multiplier = 1
  if (tags.has('skill')) {
    Attribute_Damage_Multiplier = statVal(
      nodes_map,
      'Attribute_Damage_Multiplier',
    )
  }

  let Weapon_Expertise_Multiplier = 1
  if (tags.has('skill')) {
    Weapon_Expertise_Multiplier = statVal(
      nodes_map,
      'Weapon_Expertise_Multiplier',
    )
  }

  const Weapon_Type = statVal(nodes_map, 'Weapon_Type')
  // Two-Hand Sword Expertise: You deal 30% increased Bleeding damage for 5 seconds after killing an enemy.
  if (
    Weapon_Type == 1 &&
    aggregationVal(nodes_map, 'two-hand-slashing-weapon') == 0
  ) {
    Weapon_Expertise_Multiplier *=
      1 +
      0.3 *
        Number(tags.has('bleed')) *
        Math.min(1, statVal(nodes_map, 'Enemy_Kill_Rate') * 5)
  }

  // S2 Critical Damage Bucket Change
  Generic_Damage_Bucket_Multiplier +=
    Math.min(Crit_Chance, 1) * Critical_Damage_Bonus

  // S2 Overpower Damage Bucket Change
  const Overpower_Multiplier = statVal(
    nodes_map,
    'Overpower_Multiplier',
  )

  let Overpower_Chance = 0
  if (
    (!tags.has('damage-over-time') &&
      tags.has('skill') &&
      !tags.has('channeled')) ||
    tags.has('dust-devil')
  ) {
    Overpower_Chance = statVal(nodes_map, 'Overpower_Chance')
    Generic_Damage_Bucket_Multiplier +=
      Overpower_Chance * statVal(nodes_map, 'Overpower_Damage_Bonus')

    // Banished Lord's Talisman (Unique Generic Amulet): After you spend 300 of your Primary Resource, your next Core Skill is guaranteed to Overpower. Your Critical Strikes that Overpower deal 80-120% [x] increased damage.
    if (aspectVal(nodes_map, 'banished-lords-talisman').length != 0) {
      Critical_Damage_Multiplier *=
        1 +
        aspectVal(nodes_map, 'banished-lords-talisman')[0] *
          Overpower_Chance
    }
  }

  return (
    Generic_Damage_Bucket_Multiplier *
    Berserking_Multiplier *
    Vulnerable_Damage_Bucket_Multiplier *
    (1 -
      Math.min(Crit_Chance, 1) +
      Math.min(Crit_Chance, 1) * Critical_Damage_Multiplier) *
    (1 - Overpower_Chance + Overpower_Chance * Overpower_Multiplier) *
    Talent_Damage_Multiplier *
    Aspect_Damage_Multiplier *
    Attribute_Damage_Multiplier *
    Weapon_Expertise_Multiplier
  )
}

const BarbarianParagonNames: string[] = [
  // Glyph Bonuses
  'imbiber', // You gain +30% increased Potion Healing.
  'territorial', // You gain 10% Damage Reduction against Close enemies.
  'exploit', // When an enemy is damaged by you, they become Vulnerable for 3 seconds. This cannot happen more than once every 20 seconds per enemy.
  'ambidextrous', // You deal x8% increased damage while wielding One-Handed weapons.
  'might', // You deal x8% increased damage while wielding Two-Handed weapons.
  'cleaver', // While wielding an Axe, you deal x12% increased Critical Strike Damage.
  'seething', // While wielding a Sword, you gain 3 Fury when you kill an enemy.
  'crusher', // While wielding a Mace, you deal x30% increased Overpower damage.
  'executioner', // While wielding a Polearm, you deal x10% increased damage to Healthy or Injured enemies.
  'ire', // While Berserking, you take 10% reduced damage from Elites.
  'marshal', // After casting a Shout Skill, the active Cooldown of every non-Shout Skill is reduced by 4 seconds.
  'bloodfeeder', // You have 5% increased Critical Strike Chance against Bleeding enemies.
  'wrath', // Skills that Critically Strike generate 3 Fury.
  'weapon-master', // Hitting with a Weapon Mastery Skill reduces the active Cooldown of another random Weapon Mastery Skill by 2 seconds.
  'mortal-draw', // Swapping weapons has a 18% chance to cause the Skill's damage to Critically Strike.
  'revenge', // Thorns damage increases all damage an enemy takes from you by x1%, up to x8%, for 10 seconds.
  'undaunted', // You gain up to 10% Damage Reduction the more Fortify you have.
  'dominate', // After not Overpowering for 30 seconds, your next attack will Overpower.
  'disembowel', // Killing a Bleeding enemy has a 10% chance to reduce the Cooldowns of your Non-Ultimate active Cooldowns by 1 second.
  'brawl', // Brawling Skills deal x18% increased damage.
  'rumble', //You deal 10%[x] increased damage to Bosses and Crowd Controlled enemies for each active Earthquake.
  'twister', //You deal 13% [x] increased damage for 4 seconds after creating a Dust Devil.

  // Legendary Paragon
  'hemorrhage', // Your Bleeding damage is increased by 15% [x] of the total amount of your Damage to Vulnerable Enemies bonus.
  'blood-rage', // Killing a Bleeding enemy has 10% chance to grant Berserking for 5 seconds.  Your damage dealt is increased by 25% [x] of the total amount of your Damage while Berserking bonus.
  'carnage', // While Berserking, Critical Strikes increase your Attack Speed by +2%, up to +16%, for 6 seconds.
  'decimator', // Each time you make an enemy Vulnerable, your damage is increased by 10% for 5 seconds. Overpowering a Vulnerable enemy grants an additional 10% bonus for 5 seconds
  'bone-breaker', // Every 12 seconds, your next Skill is guaranteed to Overpower
  'flawless-technique', // Damaging enemies with One-Handed Weapons increases your Critical Strike chance by x1% for 4 seconds, up to x8%. This can only happen once per Skill cast, or twice per second while channeling Whirlwind.
  'warbinger', // For every 75 Fury you spend, gain 20% of your Maximum Life as Fortify.
  'weapons-master', // Swapping weapons grants you 4% of your Maximum Fury
]

export function CreateBarbarianParagonNodes(): Record<
  string,
  ParagonNode
> {
  const nodes: Record<string, ParagonNode> = {}
  for (const key of BarbarianParagonNames) {
    nodes[key] = new ParagonNode(key, 'boolean')
  }
  return nodes
}

/* --------------------------------------------------------------------------
                      MALIGNANT HEARTS
----------------------------------------------------------------------------*/
export function CreateBarbarianMalignantHeartNodes(): Record<
  string,
  MalignantHeartNode
> {
  return {
    // (All) creeping-death:	Your damage over time effects are increased by [32 - 42]% for each different Crowd Control effect on the target.
    // Unstoppable monsters and Staggered bosses instead take [114 - 134]% increased damage from your damage over time effects.
    'creeping-death': new MalignantHeartNode('creeping-death', 2),
    // (All) determination:	Resource draining effects are [50 - 60]% less effective. In addition, gain [3 - 8]% increased Resource Generation.
    determination: new MalignantHeartNode('determination', 2),
    // (All) prudent-heart:	You become Immune for [2- 4] seconds after you lose more than 20% Life in a single hit. This effect can only occur once every {100/90/80..} seconds.
    'prudent-heart': new MalignantHeartNode('prudent-heart', 2),
    // (All) retalation:	Deal [{minValue1} - {maxValue1}] Fire damage to surrounding enemies whenever a Crowd Control effect is removed from you.
    retaliation: new MalignantHeartNode('retaliation', 1),
    // (All) revenge:	[10 - 20%]% of incoming damage is instead suppressed. When you use a Defensive, Subterfuge or a Macabre skill, all suppressed damage is amplified
    // by 250% and explodes, dealing up to [1360 - 2040] Fire damage to Nearby enemies.
    revenge: new MalignantHeartNode('revenge', 2),
    // (All) tempting-fate:	You gain [40 - 60]% Critical Strike Damage but your Non-Critical Strikes deal [20-25]% less damage.
    'tempting-fate': new MalignantHeartNode('tempting-fate', 2),
    // (All) the-barber:	Critical Strikes and all subsequent damage within [2-4] seconds is absorbed by your target. Then, the absorbed damage erupts onto surrounding enemies.
    // Stored damage is increased by {10/11/12...}% per second.
    'the-barber': new MalignantHeartNode('the-barber', 1),
    // (All) the-calculated:	After spending [150-200] of your Primary Resource, your next attack Stuns enemies hit for {2/3/4...} seconds.
    'the-calculated': new MalignantHeartNode('the-calculated', 2),
    // (All) the-dark-dance:	Every 5 seconds while above 60% Life, Core Skills cost [flat value number] Life instead of your Primary Resource. Skills that consume Life deal [10 - 20]% increased damage.
    'the-dark-dance': new MalignantHeartNode('the-dark-dance', 2),
    // (All) the-lionheart:	You gain {10/11/12..}% Barrier Generation. You Heal [flat value number] Life per second while you have an active Barrier.
    'the-lionheart': new MalignantHeartNode('the-lionheart', 2),
    // (All) the-malignant-pact:	Cycle through a Malignant bonus every 20 kills: Vicious: Gain {20/21/22...}% Attack Speed.
    // Devious: Core and Basic Skills have a {15/16/17...}% chance to fully restore your Primary Resource. Brutal: Every {20/19/18..} seconds, gain a Barrier absorbing [flat value number] damage.
    'the-malignant-pact': new MalignantHeartNode(
      'the-malignant-pact',
      1,
    ),
    // (All) the-picana:	Critical Strikes electrically charge the enemy for [.75 - 2.5] seconds, causing lightning to arc between them and any other charged enemies dealing {flat value number} Lightning damage.
    'the-picana': new MalignantHeartNode('the-picana', 2),
    // (Barbarian) focused-rage: After spending [60-100] Fury within 2 seconds, your next Non-Basic Skill's Critical Strike Chance is increased by [22 - 32]%.
    'focused-rage': new MalignantHeartNode('focused-rage', 2),
    // (Barbarian) ignoring-pain:	Incoming damage has a [5 - 15]% chance of being ignored and instead Healing you for [flat value number].
    'ignoring-pain': new MalignantHeartNode('ignoring-pain', 2),
    // (Barbarian) punishing-speed:	Your Skills have a [22 - 32]% chance to Knock Down all enemies for 1.25 seconds when that Skill's Attack Speed is higher than [20-35]%.
    'punishing-speed': new MalignantHeartNode('punishing-speed', 2),
    // (Barbarian) resurgent-life: While below [40 - 60]% Life, you receive [52-62]% more Healing from all sources.
    'resurgent-life': new MalignantHeartNode('resurgent-life', 2),
  }
}
/* ------------------------------------------------------------------------------------------------------------------------------- */

const BarbarianTalentsToMaxValue: [string, number][] = [
  ['flay', 5],
  ['enhanced-flay', 1], // Flay has a 15% chance to make the enemy Vulnerable for 2 seconds. Double this chance when using a Two-Handed weapon.
  ['battle-flay', 1],
  ['combat-flay', 1],
  ['frenzy', 5],
  ['enhanced-frenzy', 1], // Enhanced Frenzy: While Frenzy is granting +60% bonus Attack Speed, it also generates 2 additional Fury.
  ['battle-frenzy', 1],
  ['combat-frenzy', 1],
  ['bash', 5],
  ['enhanced-bash', 1], // Damaging a Stunned enemy with Bash grants you 20% Base Life (X) as Fortify. Double this amount when using a Two- Handed weapon.
  ['battle-bash', 1],
  ['combat-bash', 1], // After Critically Striking 4 times with Bash using a Two-Handed weapon, your next Core or Weapon Mastery Skill will Overpower.
  ['lunging-strike', 5],
  ['enhanced-lunging-strike', 1],
  ['battle-lunging-strike', 1],
  ['combat-lunging-strike', 1],
  ['whirlwind', 5],
  ['enhanced-whirlwind', 1],
  ['violent-whirlwind', 1],
  ['furious-whirlwind', 1],
  ['hammer-of-the-ancients', 5],
  ['enhanced-hammer-of-the-ancients', 1],
  ['violent-hammer-of-the-ancients', 1],
  ['furious-hammer-of-the-ancients', 1],
  ['pressure-point', 3],
  ['endless-fury', 3], // (Talent) Endless Fury: Basic Skills generate x7% (max 3 points) more Fury when using Two-Handed Weapons
  ['upheaval', 5],
  ['enhanced-upheaval', 1],
  ['violent-upheaval', 1], // If Upheaval damages at least 2 enemies or a Boss, you gain Berserking for 2 seconds, increased to 3 seconds if it damages at least 4 enemies.
  ['furious-upheaval', 1], // Furious Upheaval Dealing direct damage to an enemy with a Skill that is not Upheaval causes your next cast of Upheaval to deal 12%[x] increased damage, stacking up to 6 times.
  ['double-swing', 5],
  ['enhanced-double-swing', 1],
  ['violent-double-swing', 1], // Violent Double Swing Hitting an enemy with both hits of Double Swing makes them Vulnerable for  2 seconds.
  ['furious-double-swing', 1],
  ['rend', 5],
  ['enhanced-rend', 1],
  ['violent-rend', 1],
  ['furious-rend', 1],
  ['ground-stomp', 5],
  ['enhanced-ground-stomp', 1],
  ['tactical-ground-stomp', 1], // Tactical Ground Stomp Ground Stomp generates  40 Fury.
  ['strategic-ground-stomp', 1],
  ['rallying-cry', 5],
  ['enhanced-rallying-cry', 1],
  ['tactical-rallying-cry', 1],
  ['strategic-rallying-cry', 1],
  ['iron-skin', 5],
  ['enhanced-iron-skin', 1], //  Iron Skin's Barrier absorbs 20% more of your Maximum Life.
  ['tactical-iron-skin', 1],
  ['strategic-iron-skin', 1], // Iron Skin also grants 15% Base Life as Fortify. Double this amount if cast while below 50% Life.
  ['challenging-shout', 5], // Taunt Nearby enemies and gain 40% Damage Reduction for 6 seconds.
  ['enhanced-challenging-shout', 1],
  ['tactical-challenging-shout', 1],
  ['strategic-challenging-shout', 1],
  ['imposing-presence', 3], // Imposing Presence (Talent): Gain x6% additional Maximum Life (up to 3 Points)
  ['martial-vigor', 3], // Martial Vigor: Damage Reduction against Elites is increased by 4% (up to 3 points)
  ['outburst', 3],
  ['tough-as-nails', 3], // Increase your Thorns by {3,6,9}% [+]. When enemies hit you, they take an additional 10% of your Thorns as Bleeding damage over 5 seconds.
  ['kick', 5], // Throw a powerful kick that deals X [18%] damage and Knocks Back enemies in front of you. Enemies who are Knocked Back into terrain take an additional X [70%] damage and are Stunned for 3 seconds
  ['enhanced-kick', 1],
  ['mighty-kick', 1], // Mighty Kick: Kicked enemies deal 54% damage to enemies they collide with while being Knocked Back. Enemies damaged this way are Knocked Down for 2 seconds.
  ['power-kick', 1], // If Kick damages an enemy, it consumes all of your Fury and deals an additional 20% damage per 10 fury spent. Kick no longer knocks back enemies.
  ['war-cry', 5],
  ['enhanced-war-cry', 1],
  ['mighty-war-cry', 1],
  ['power-war-cry', 1],
  ['charge', 5],
  ['enhanced-charge', 1], // Enemies knocked back into terrain by charge take 150% increased damage.
  ['mighty-charge', 1],
  ['power-charge', 1], // Reduce Charge's Cooldown by 3 seconds, charging a boss will instead reduce the cooldown by 6 seconds.
  ['leap', 5],
  ['enhanced-leap', 1],
  ['mighty-leap', 1], // Enemies damaged by Leap are Slowed by 70% for 5 seconds.
  ['power-leap', 1],
  ['swiftness', 3],
  ['quick-impulses', 3],
  ['booming-voice', 3], // Your Shout Skill effect durations are increased by 8%/16%/24%.
  ['raid-leader', 3],
  ['guttural-yell', 3], // Your Shout Skills cause enemies to deal 4%/8%/12% less damage for 5 seconds.
  ['aggressive-resistance', 3], // Gain 4%/8%/12% Damage Reduction while Berserking.
  ['battle-fervor', 3],
  ['prolific-fury', 3],
  ['death-blow', 5], // Attempt a killing strike, dealing 120% damage to enemies in front of you. If this kills an enemy, its Cooldown is reset.
  ['enhanced-death-blow', 1], // Death Blow deals  150%[x] increased damage to Bosses.
  ['warriors-death-blow', 1],
  ['fighters-death-blow', 1], // If Death Blow damages at least one enemy, gain 20 Fury
  ['rupture', 5],
  ['enhanced-rupture', 1], // Ripping your weapon out of enemies during Rupture causes an explosion that deals 70% Bleeding damage over 5 seconds.  This damage is increased by x10% for each 50 Strength you have.
  ['warriors-rupture', 1], // Warrior's Rupture Hitting enemies with Rupture increases your Attack Speed by 40%[+] for  5 seconds.
  ['fighters-rupture', 1], // Fighter's Rupture Hitting at least 1 enemy with Rupture Heals you for  18% of your Maximum Life  (298).
  ['steel-grasp', 5],
  ['enhanced-steel-grasp', 1], // Enhanced Steel Grasp Steel Grasp also makes enemies Vulnerable for  3.0 seconds.
  ['warriors-steel-grasp', 1], // Steel Grasp gains 1 additional charge
  ['fighters-steel-grasp', 1],
  ['pit-fighter', 3],
  ['no-mercy', 3],
  ['slaying-strike', 3],
  ['expose-vulnerability', 3],
  ['hamstring', 3],
  ['cut-to-the-bone', 3],
  ['thick-skin', 3],
  ['defensive-stance', 3],
  ['counteroffensive', 3],
  ['call-of-the-ancients', 1],
  ['prime-call-of-the-ancients', 1], // While Call of the Ancients is active, gain 20% bonus Attack Speed and 10% increased damage.
  ['supreme-call-of-the-ancients', 1], //Each of the Ancients gains additional power: Korlic: You gain 10 Fury each time Korlic damages an enemy with his Frenzy.
  // Talic: Enemies are Slowed by 50% for 1 second when damaged by his Whirlwind.
  // Madawc: 30% chance to Stun enemies for 3 seconds when using his Upheaval.
  ['iron-maelstrom', 1],
  ['prime-iron-maelstrom', 1], //  Iron Maelstrom gains 30% [+] increased Critical Strike Chance and deals 40% [x] increased Critical Strike damage.
  ['supreme-iron-maelstrom', 1],
  ['wrath-of-the-berserker', 1],
  ['prime-wrath-of-the-berserker', 1],
  ['supreme-wrath-of-the-berserker', 1], // While Wrath of the Berserker is active, every 50 Fury you spend increases Berserker's damage bonus by 25%. Maximum damage bonus is now x100% bonus damage.
  ['duelist', 3],
  ['tempered-fury', 3],
  ['furious-impulse', 3], // Each time you swap weapons, gain 2 Fury
  ['invigorating-fury', 3],
  ['heavy-handed', 3],
  ['brute-force', 3],
  ['wallop', 3],
  ['concussion', 3],
  ['unconstrained', 1],
  ['walking-arsenal', 1], // Dealing Damage with a Two-Handed Bludgeoning, Two-Handed Slashing, or Dual Wielded weapon grants x10% increased damage for 10 seconds.  While all three damage bonuses are active, you gain an additional x20% increased damage and attack speed.
  ['unbridled-rage', 1],
  ['gushing-wounds', 1],
]

// This creates a map from the talent name above to a talent node with its name. Used to look up
// nodes and add dependencies.
export function CreateBarbarianTalentNodes(): Record<
  string,
  TalentNode
> {
  const nodes: Record<string, TalentNode> = {}
  for (const [key, value] of BarbarianTalentsToMaxValue) {
    nodes[key] = new TalentNode(key, value)
  }
  return nodes
}

// Map used to identify which talents should be increased for talent modifiers.
export function CreateBarbarianTalentModifierMap(): Record<
  string,
  string[]
> {
  return {
    'ranks-of-challenging-shout': ['challenging-shout'],
    'ranks-of-death-blow': ['death-blow'],
    'ranks-of-double-swing': ['double-swing'],
    'ranks-of-frenzy': ['frenzy'],
    'ranks-of-flurry': ['flurry'],
    'ranks-of-ground-stomp': ['ground-stomp'],
    'ranks-of-hammer-of-the-ancients': ['hammer-of-the-ancients'],
    'ranks-of-iron-skin': ['iron-skin'],
    'ranks-of-charge': ['charge'],
    'ranks-of-kick': ['kick'],
    'ranks-of-leap': ['leap'],
    'ranks-of-rallying-cry': ['rallying-cry'],
    'ranks-of-rend': ['rend'],
    'ranks-of-rupture': ['rupture'],
    'ranks-of-steel-grasp': ['steel-grasp'],
    'ranks-of-upheaval': ['upheaval'],
    'ranks-of-war-cry': ['war-cry'],
    'ranks-of-whirlwind': ['whirlwind'],
    'ranks-of-the-counteroffensive-passive': ['counteroffensive'],
    'ranks-of-the-outburst-passive': ['outburst'],
    'ranks-of-the-wallop-passive': ['wallop'],
    'ranks-of-the-heavy-handed-passive': ['heavy-handed'],
    'ranks-of-the-slaying-strike-passive': ['slaying-strike'],
    'ranks-of-the-cut-to-the-bone-passive': ['cut-to-the-bone'],
    'ranks-of-the-tough-as-nails-passive': ['tough-as-nails'],
    'ranks-of-the-brute-force-passive': ['brute-force'],
    'ranks-of-the-no-mercy-passive': ['no-mercy'],
    'ranks-of-the-aggressive-resistance-passive': [
      'aggressive-resistance',
    ],
    'ranks-of-all-brawling-skills': [
      'kick',
      'war-cry',
      'charge',
      'leap',
    ],
    'ranks-of-all-weapon-mastery-skills': [
      'death-blow',
      'rupture',
      'steel-grasp',
    ],
    'ranks-of-all-defensive-skills': [
      'ground-stomp',
      'rallying-cry',
      'iron-skin',
      'challenging-shout',
    ],
    'ranks-of-all-core-skills': [
      'whirlwind',
      'hammer-of-the-ancients',
      'upheaval',
      'rend',
      'double-swing',
    ],
  }
}

export function CreateBarbarianAspectNodes(): Record<
  string,
  AspectNode
> {
  return {
    /*--------------------------------------------------
                       BARBARIAN ASPECTS
        --------------------------------------------------*/

    // Aspect of Ancestral Echoes: Lucky Hit: Damaging enemies with Leap, Upheaval, or Whirlwind has up to a {50/60}% chance to summon an Ancient to perform the same Skill. Can only happen once every 5.0 seconds.
    'aspect-of-ancestral-echoes': new AspectNode(
      'aspect-of-ancestral-echoes',
      1,
    ),

    // Aspect of Ancestral Force:  Hammer of the Ancients quakes outward and its damage is increased by 5-15%.
    'aspect-of-ancestral-force': new AspectNode(
      'aspect-of-ancestral-force',
      1,
    ), // ** COMPLETE **

    // Aspect of Anemia: Lucky Hit: Direct damage against Bleeding enemies has up to a {31/40}% chance to Stun them for 2.0 seconds.
    'aspect-of-anemia': new AspectNode('aspect-of-anemia', 1), // IGNORE

    // Aspect of Berserk Fury: You gain {3/6} Fury per second while Berserking.
    'aspect-of-berserk-fury': new AspectNode(
      'aspect-of-berserk-fury',
      1,
    ), // ** COMPLETE **

    // Aspect of Berserk Ripping: Whenever you deal direct damage while Berserking, inflict {20/30}% of the Base damage dealt as additional Bleeding damage over 5.0 seconds.
    'aspect-of-berserk-ripping': new AspectNode(
      'aspect-of-berserk-ripping',
      1,
    ), // ** COMPLETE **

    // Aspect of Bul-Kathos: Leap creates an Earthquake that deals {195/380} Physical damage over 4 seconds. While standing in Earthquakes, you gain {5/15}% increased Damage Reduction.
    'aspect-of-bul-kathos': new AspectNode('aspect-of-bul-kathos', 2), // ** COMPLETE **

    // Aspect of Burning Rage: While Berserking, you deal {40/70} Fire damage every second to surrounding enemies.
    'aspect-of-burning-rage': new AspectNode(
      'aspect-of-burning-rage',
      1,
    ), // ** COMPLETE **

    // Aspect of Echoing Fury: Your Shout Skills generate {6/10} Fury per second while active.
    'aspect-of-echoing-fury': new AspectNode(
      'aspect-of-echoing-fury',
      1,
    ), // ** COMPLETE **

    // Aspect of Encroaching Wrath: After spending 100.0 Fury, your next Weapon Mastery Skill within 5 seconds deals x{40/60}% increased damage.
    'aspect-of-encroaching-wrath': new AspectNode(
      'aspect-of-encroaching-wrath',
      1,
    ), // TO DO

    // Aspect of Giant Strides: Reduces the Cooldown of Leap by {3/5} seconds per enemy hit, up to a maximum of 9 seconds.
    'aspect-of-giant-strides': new AspectNode(
      'aspect-of-giant-strides',
      1,
    ), // ** COMPLETE **

    // Aspect of Grasping Whirlwind: Whirlwind periodically Pulls enemies to you.
    'aspect-of-grasping-whirlwind': new AspectNode(
      'aspect-of-grasping-whirlwind',
      0,
    ), // IGNORE

    // Aspect of Limitless Rage: Each point of Fury you generate while at Maximum Fury grants your next Core Skill x{2/4}% increased damage, up to x{60/120}%.
    'aspect-of-limitless-rage': new AspectNode(
      'aspect-of-limitless-rage',
      2,
    ), // IGNORE FOR NOW, BUT INCLUDE LATER

    // Aspect of Numbing Wrath: Each point of Fury generated while at Maximum Fury grants {1.5/3} Fortify.
    'aspect-of-numbing-wrath': new AspectNode(
      'aspect-of-numbing-wrath',
      1,
    ), // IGNORE

    // Aspect of Perpetual Stomping: Damaging an enemy with Kick or Ground Stomp resets Leap's Cooldown.
    'aspect-of-perpetual-stomping': new AspectNode(
      'aspect-of-perpetual-stomping',
      0,
    ), // IGNORE FOR NOW

    // Aspect of Tempering Blows: After swapping weapons 6.0 times, gain {55/100} Fortify.
    'aspect-of-tempering-blows': new AspectNode(
      'aspect-of-tempering-blows',
      1,
    ), // IGNORE

    // Aspect of the Dire Whirlwind: Whirlwind's Critical Strike Chance is increased by +{3/8}% for each second it is channeled, up to +{9/24}%.
    'aspect-of-the-dire-whirlwind': new AspectNode(
      'aspect-of-the-dire-whirlwind',
      2,
    ), // ** COMPLETE **

    // Aspect of the Iron Warrior: Iron Skin grants Unstoppable, and {18/28}% Damage Reduction.
    'aspect-of-the-iron-warrior': new AspectNode(
      'aspect-of-the-iron-warrior',
      1,
    ), // ** COMPLETE **

    // Aspect of the Relentless Armsmaster: Gain x{20/36}% increased Fury Generation while all damage bonuses from the Walking Arsenal Key Passive are active.
    'aspect-of-the-relentless-armsmaster': new AspectNode(
      'aspect-of-the-relentless-armsmaster',
      1,
    ), // ** COMPLETE **

    // Aspect of Unrelenting Fury: Killing an enemy with a Core Skill refunds {10/20}% of its base Fury cost. Can only happen once per Skill cast.
    'aspect-of-unrelenting-fury': new AspectNode(
      'aspect-of-unrelenting-fury',
      1,
    ), // IGNORE

    // Battle-Mad Aspect: Gain Berserking for {2/3.5} seconds after swapping weapons 10.0 times.
    'battle-mad-aspect': new AspectNode('battle-mad-aspect', 1), // IGNORE

    // Bear Clan Berserker's Aspect: Killing an enemy while Berserking has a 40.0% chance to grant {16/32}% increased Cooldown Reduction to your Brawling Skills for 2.0 seconds.
    'bear-clan-berserkers-aspect': new AspectNode(
      'bear-clan-berserkers-aspect',
      1,
    ), // IGNORE

    // Bold Chieftain's Aspect: Whenever you cast a Shout Skill, its Cooldown is reduced by {1.0-1.9} seconds per Nearby enemy, up to a maximum of 6.0 seconds.
    'bold-chieftains-aspect': new AspectNode(
      'bold-chieftains-aspect',
      1,
    ), // ** COMPLETE **

    // Brawler's Aspect: Enemies damaged by Kick or Charge will explode if they are killed within the next 2.0 seconds, dealing {500/650} damage to surrounding enemies.
    'brawlers-aspect': new AspectNode('brawlers-aspect', 1), // IGNORE

    // Death Wish Aspect: Gain {55/100} Thorns while Berserking.
    'death-wish-aspect': new AspectNode('death-wish-aspect', 1), // ** COMPLETE **

    // Devilish Aspect: After generating 100.0 Fury your next Core Skill creates a Dust Devil that deals {100/180} damage to enemies behind the target.
    'devilish-aspect': new AspectNode('devilish-aspect', 1), // ** COMPLETE **

    // Dust Devil's Aspect: Whirlwind leaves behind Dust Devils that deal {80/125} damage to surrounding enemies.
    'dust-devils-aspect': new AspectNode('dust-devils-aspect', 1), // ** COMPLETE **

    // Earthquake Aspect: Ground Stomp creates an Earthquake damaging enemies for {195/380} Physical damage over 4 seconds. While standing in Earthquakes, you deal x{5/15}% increased damage.
    'earthquake-aspect': new AspectNode('earthquake-aspect', 2), // ** COMPLETE **

    // Earthstriker's Aspect: After swapping weapons 8 times, your next non-basic attack will Overpower and deal [30-50]%[x] increased Overpower damage.
    'earthstrikers-aspect': new AspectNode('earthstrikers-aspect', 1), // ** COMPLETE ** BUT TAKE ANOTHER LOOK AT

    // Iron Blood Aspect: Gain {2/4}% Damage Reduction for each Nearby Bleeding enemy up to {10/20}% maximum.
    'iron-blood-aspect': new AspectNode('iron-blood-aspect', 2), // ** COMPLETE **

    // Luckbringer Aspect: Gain x{12/20}% increased Lucky Hit Chance while all damage bonuses from the Walking Arsenal Key Passive are active.
    'luckbringer-aspect': new AspectNode('luckbringer-aspect', 1), // ** COMPLETE **

    // (Unique) Overkill: Death Blow creates a shockwave, dealing {16/30}% of its Base damage to enemies. Enemies who die to this effect also reset Death Blow's Cooldown.
    overkill: new AspectNode('overkill', 1), // ** COMPLETE **

    // (Unique) Rage of Harrogath: Lucky Hit: Up to a {20/40}% chance to reduce the Cooldowns of your Non-Ultimate Skills by 1.5 seconds when you inflict Bleeding on Elites.
    'rage-of-harrogath': new AspectNode('rage-of-harrogath', 1),

    // (Unique) Ramaladni's Magnum Opus: Skills using this weapon deal x{.2-.4}% increased damage per point of Fury you have, but you lose 2.0 Fury every second.
    'ramaladnis-magnum-opus': new AspectNode(
      'ramaladnis-magnum-opus',
      1,
    ),

    // Relentless Berserker's Aspect: Lucky Hit: Damaging an enemy with a Core Skill has up to a {22/40}% chance to extend the duration of Berserking by 2 seconds. Double this duration if it was a Critical Strike.
    'relentless-berserkers-aspect': new AspectNode(
      'relentless-berserkers-aspect',
      1,
    ), // IGNORE

    // Skullbreaker's Aspect: Stunning a Bleeding enemy deals {22/40}% of their total Bleeding amount to them as Physical damage.
    'skullbreakers-aspect': new AspectNode('skullbreakers-aspect', 1), // MAYBE TO DO?

    // Slaking Aspect: Lucky Hit: You have up to a {40/60}% chance to gain 20.0 Fury when Rend deals direct damage to at least one Bleeding enemy.
    'slaking-aspect': new AspectNode('slaking-aspect', 1), // ** COMPLETE **

    // Steadfast Berserker's Aspect: Lucky Hit: Up to a 35% chance to gain {80/160} Fortify whenever you deal direct damage while Berserking.
    'steadfast-berserkers-aspect': new AspectNode(
      'steadfast-berserkers-aspect',
      1,
    ), // IGNORE

    // Veteran Brawler's Aspect: Each time a Core Skill deals direct damage to an enemy, your next Charge or Leap deals x{6/8}% increased damage, up to x{30/40}%.
    'veteran-brawlers-aspect': new AspectNode(
      'veteran-brawlers-aspect',
      2,
    ), // ** COMPLETE **

    // "Weapon Master's Aspect: Your Weapon Mastery Skills have an additional Charge. Lucky Hit: Damaging an enemy with a Weapon Mastery Skill has up to a {37/55}% chance to Stun them for 2 seconds."
    'weapon-masters-aspect': new AspectNode(
      'weapon-masters-aspect',
      1,
    ), // IGNORE

    // Windlasher Aspect: Casting Double Swing twice within 1.5 seconds creates a Dust Devil that deals {80/125} damage to enemies behind the target.
    'windlasher-aspect': new AspectNode('windlasher-aspect', 1), // ** COMPLETE **

    // Aspect of Ancestral Charge: Charge calls forth 4 Ancients who also Charge, dealing [75 - 125]% of normal damage.
    'ancestral-charge': new AspectNode('ancestral-charge', 1),

    // Wanton Rupture Aspect (Barbarian Offensive Aspect): Your Rupture does not remove the Bleeding damage from enemies. This can occur once every 30-40 seconds.
    'wanton-rupture-aspect': new AspectNode(
      'wanton-rupture-aspect',
      1,
    ),

    // Aspect of Sundered Ground: Every 25 seconds, Upheaval is guaranteed to Overpower and deals 10–20% increased damage. This timer is reduced by 4 seconds when Upheaval Overpowers a Boss or an Elite enemy.
    'aspect-of-sundered-ground': new AspectNode(
      'aspect-of-sundered-ground',
      1,
    ),

    /*--------------------------------------------------
                       GENERIC ASPECTS
        --------------------------------------------------*/

    // Accelerating Aspect: Critical Strikes with Core Skills increase your Attack Speed by +[15 - 25]% for 3.0 seconds.
    'accelerating-aspect': new AspectNode('accelerating-aspect', 1),

    // Starlight-aspect: Gain {10/20} of your Primary Resource for every 20.0% of your Life that you Heal.
    'starlight-aspect': new AspectNode('starlight-aspect', 1),

    // aspect-of-Might: basic Skills grant 25.0% damage Reduction for {2/6} seconds.
    'aspect-of-might': new AspectNode('aspect-of-might', 1),

    // aspect-of-the-Protector: Damaging an Elite enemy grants you a Barrier absorbing up to {375/750} damage for 10.0 seconds. This effect can only happen once every 30 seconds.
    'aspect-of-the-protector': new AspectNode(
      'aspect-of-the-protector',
      1,
    ),

    // aspect-of-Inner-Calm: Deal x{3/10}% increased damage for each second you stand still, up to x30.0%.
    'aspect-of-inner-calm': new AspectNode('aspect-of-inner-calm', 1),

    // Wind-Striker-aspect: Critical Strikes grant +{8/16}% Movement Speed for 1.0 second, up to 6 seconds.
    'wind-striker-aspect': new AspectNode('wind-striker-aspect', 1),

    // aspect-of-the-Umbral: Restore {1/4} of your Primary Resource when you Crowd Control an enemy.
    'aspect-of-the-umbral': new AspectNode('aspect-of-the-umbral', 1),

    // Conceited-aspect: Deal x{15-25}% increased damage while you have a Barrier active.
    'conceited-aspect': new AspectNode('conceited-aspect', 1),

    // Protecting-aspect: When hit while not Healthy, a magical bubble is summoned around you for {3/5} seconds. While standing in the bubble players are Immune. Can only occur once every 90.0 seconds.
    'protecting-aspect': new AspectNode('protecting-aspect', 1),

    // aspect-of-Disobedience: You gain x{0.25/0.5}% increased Armor for 4.0 seconds when you deal any form of damage, stacking up to x{15/66}%.
    'aspect-of-disobedience': new AspectNode(
      'aspect-of-disobedience',
      2,
    ),

    // FloatRandomRangeWithInterval(10, 40, 50)
    'aspect-of-pummeling': new AspectNode('aspect-of-pummeling', 1), // "Deal {c-random}x[Affix-Value-1|%|]{/if}{/c} increased damage to Stunned, knocked Down, and Frozen enemies.",

    // Rapid-aspect: basic Skills gain +{15-30}% Attack Speed.
    'rapid-aspect': new AspectNode('rapid-aspect', 1),

    // Edgemaster's-aspect: Skills deal up to x{10-20}% increased damage based on your available Primary Resource when cast, receiving the maximum benefit while you have full Primary Resource.
    'edgemasters-aspect': new AspectNode('edgemasters-aspect', 1),

    //aspect-of-the-Crowded-Sage: You Heal for {2.5/10} Life per second for each close enemy, up to 50 Life per second.
    'aspect-of-the-crowded-sage': new AspectNode(
      'aspect-of-the-crowded-sage',
      2,
    ),

    // aspect-of-the-Expectant: Attacking enemies with a basic Skill increases the damage of your next Core Skill cast by x{5/10}%, up to x30.0%.
    'aspect-of-the-expectant': new AspectNode(
      'aspect-of-the-expectant',
      1,
    ),

    // Ghostwalker-aspect: While Unstoppable and for 2.0 seconds after, you gain +{10/25}% increased Movement Speed and can move freely through enemies.
    'ghostwalker-aspect': new AspectNode('ghostwalker-aspect', 1),

    //aspect-of-Shared-Misery: Lucky Hit: When you hit a Crowd Controlled enemy, there is up to a {30/50}% chance for that Crowd Control effect to spread to another unaffected enemy.
    'aspect-of-shared-misery': new AspectNode(
      'aspect-of-shared-misery',
      1,
    ),

    // Eluding-aspect: Becoming Injured while Crowd Controlled grants you Unstoppable for 4.0 seconds. This effect has a {20/40} second Cooldown.
    'eluding-aspect': new AspectNode('eluding-aspect', 1),

    // Assimilation-aspect: You have +8.0% increased Dodge chance versus enemies affected by damage Over Time effects. When you Dodge you gain {5/10} of your Primary Resource.
    'assimilation-aspect': new AspectNode('assimilation-aspect', 1),

    // Needleflare-aspect: Thorns damage dealt has a {20/40}% chance to deal damage to all enemies around you.
    'needleflare-aspect': new AspectNode('needleflare-aspect', 1),

    // aspect-of-the-Deflecting-Barrier: While you have a Barrier active, there is a {7/13}% chance to ignore incoming direct damage from Distant enemies.
    'aspect-of-the-deflecting-barrier': new AspectNode(
      'aspect-of-the-deflecting-barrier',
      1,
    ),

    // aspect-of-Retribution: Distant enemies have a 8.0% chance to be Stunned for 2.0 seconds when they hit you. You deal x{10/20}% increased damage to Stunned enemies.
    'aspect-of-retribution': new AspectNode(
      'aspect-of-retribution',
      1,
    ),

    // smiting-aspect: You have x{10/20}% increased Critical Strike chance against Injured enemies. While you are Healthy, you gain x{20/40}% increased Crowd Control duration.
    'smiting-aspect': new AspectNode('smiting-aspect', 2),

    // Exploiter's Aspect: You have +20.0% increased Crowd Control Duration and deal x[20 - 40]% increased damage to Unstoppable enemies.
    'exploiters-aspect': new AspectNode('exploiters-aspect', 1),

    // Audacity Aspect: When there are at least 5 Close enemies, Stun them for [2 - 4] seconds. This can only occur once every 20 seconds.
    'audacity-aspect': new AspectNode('audacity-aspect', 1),

    // Craven Aspect: You gain [20 - 40]% increased Movement Speed when moving away from Slowed or Chilled enemies.
    'craven-aspect': new AspectNode('craven-aspect', 1),

    // Aspect of Slaughter You gain 20% Movement Speed. Lose this bonus for 2.5-5 seconds after taking damage.
    'aspect-of-slaughter': new AspectNode('aspect-of-slaughter', 1),

    // Aspect of Elements  Gain 20-30%[+] increased damage to a set of damage types for 7 seconds.
    // This effect alternates between 2 sets: [Fire, Lightning, and Physical] & [Cold, Poison, and Shadow]
    'aspect-of-elements': new AspectNode('aspect-of-elements', 1),

    // Shard of Dawn Aspect: After 30 seconds of Night's Grasp, gain Dawn's Haste, increasing your Attack Speed by [{value1}]%[+] and Movement Speed by 20% for 12 seconds.
    //                       While empowered by the Midwinter Ward, killing an enemy reduces Night's Grasp duration by 1 second.
    'shard-of-dawn-aspect': new AspectNode('shard-of-dawn-aspect', 1),

    // Aspect of Adaptability: When cast below 50% Maximum Resource, Basic Skills generate 3 of your Primary Resource, once per cast.
    //                         When cast at or above 50% Maximum Resource, Basic Skills deal 40–80% increased damage.
    'aspect-of-adaptability': new AspectNode(
      'aspect-of-adaptability',
      1,
    ),

    // Juggernaut's Aspect: Gain 0.75 –1.25 Armor, but your Evade has 100% increased Cooldown.
    'juggernauts-aspect': new AspectNode('juggernauts-aspect', 1),

    /*--------------------------------------------------
                     UNIQUES
    --------------------------------------------------*/

    // After gaining the final damage bonus from the Walking Arsenal Key Passive, you automatically cast Ground Stomp and gain [32 - 50] Fury. This cannot happen more than once every 30 seconds.
    '100,000-steps': new AspectNode('100,000-steps', 1),

    // Steel Grasp launches 2 additional chains. Enemies that have been pulled by Steel Grasp take x30-x50% bonus damage from you for 3 seconds.
    'ancients-oath': new AspectNode('ancients-oath', 1),

    // (Unique) Battle Trance: Increase Frenzy's maximum stacks by 2. While you have maximum Frenzy, your other Skills gain +{10/20}% increased Attack Speed.
    'battle-trance': new AspectNode('battle-trance', 1), // ** COMPLETE **

    // Lucky Hit: Up to a [[10 - 20]|%|] chance to trigger a poison nova that applies [Affix_Flat_Value_1] Poisoning damage over 5 seconds to enemies in the area.
    'andariels-visage': new AspectNode('andariels-visage', 2),

    // Lucky Hit: Up to a [0.7|%|] chance to deal 0.7*825 Shadow damage to surrounding enemies and reduce their damage done by 20% for 3 seconds.
    doombringer: new AspectNode('doombringer', 2),

    // While using this weapon, damaging at least one enemy with Rupture creates a blood pool that inflicts [300-1000] Bleeding damage over 6 seconds. Enemies standing in the pool take x20% increased Bleeding damage.
    'fields-of-crimson': new AspectNode('fields-of-crimson', 1), // ** COMPLETE ** NEEDS ANOTHER LOOK AT

    // Your attacks randomly deal [1|%|] to [[200 - 300]|%|] of their normal damage.
    'fists-of-fate': new AspectNode('fists-of-fate', 1),

    // Lucky Hit: Up to a [[15 - 25]|%|] chance to Freeze enemies for 2 seconds.
    frostburn: new AspectNode('frostburn', 1),

    // TODO: Separate physical and non-phsyical damage scaling
    // (Unique) Gohr's Devastating Grips: Whirlwind explodes after it ends, dealing {16/26}% of the total Base damage dealt to surrounding enemies as Fire damage.
    // Explosion damage is only increased by the first 100 hits of Whirlwind.
    'gohrs-devastating-grips': new AspectNode(
      'gohrs-devastating-grips',
      1,
    ), // ** COMPLETE **

    // Gain [[5 - 8]|1%|] Damage Reduction. In addition, gain +2 Ranks to all Skills.
    'harlequin-crest': new AspectNode('harlequin-crest', 1),

    // (Unique) Hellhammer: Upheaval ignites the ground Burning enemies for an additional {175/250} damage over 4 seconds.
    hellhammer: new AspectNode('hellhammer', 1), // ** COMPLETE **

    // melted-heart-of-selig Gain 60 maximum Resource. 75% of incoming damage drains 2 Resource for every 1% of Life you would have lost instead.
    'melted-heart-of-selig': new AspectNode(
      'melted-heart-of-selig',
      0,
    ),

    // If a Core Skill hits 4 or more enemies, [[20 - 40]|%|] of the Resource cost is refunded.
    'mothers-embrace': new AspectNode('mothers-embrace', 1),

    // You leave behind a trail of frost that Chills enemies. You deal [[7 - 10]|%x|] more damage to Chilled enemies.
    'penitent-greaves': new AspectNode('penitent-greaves', 1),

    // Gain 1000-15000 Thorns
    razorplate: new AspectNode('razorplate', 1),

    // Lucky Hit: Up to a 100% chance to lose all of your Resource.
    'ring-of-misfortune': new AspectNode('ring-of-misfortune', 0),

    // Spending resources reduces your resource costs and increases your damage by 10%[x] for 3 seconds, up to 40%.
    'ring-of-starless-skies': new AspectNode(
      'ring-of-starless-skies',
      0,
    ),

    // Effects that Heal you beyond 100% Life grant you a Barrier up to [[50 - 100]|%|] of your Maximum Life that lasts for 30 seconds.
    temerity: new AspectNode('temerity', 1),

    // Lucky Hit: When you Critically Strike an enemy you have up to a 100% chance to Fear and Slow them by [[40 - 75]|%|] for 4 seconds.
    'the-butchers-cleaver': new AspectNode('the-butchers-cleaver', 1),

    // Increases your Critical Strike Damage by [[60 - 100]|%x|]. The other properties on this weapon can roll higher than normal.
    'the-grandfather': new AspectNode('the-grandfather', 1),

    // Azurewrath: Lucky Hit: Your Core Skills have up to a 20% chance to Freeze enemies for 3 seconds and deal {value} Cold damage to them.
    azurewrath: new AspectNode('azurewrath', 1),

    // Tassets of the Dawning Sky (Generic Unique Pants): When you take damage from a Non-Physical damage type, you gain +6-10% Maximum Resistance to that damage type for 6 seconds. This effect can only apply to one damage type at a time.
    'tassets-of-the-dawning-sky': new AspectNode(
      'tassets-of-the-dawning-sky',
      1,
    ),

    // Tuskhelm of Joritz the Mighty (Barbarian Unique Helm): When you gain Berserking while already Berserk, you have a 40-60% chance to become more enraged granting 15% (multiplicative damage) [x] increased damage, 2 Fury per second, and 10% Cooldown Reduction.
    'tuskhelm-of-joritz-the-mighty': new AspectNode(
      'tuskhelm-of-joritz-the-mighty',
      1,
    ),

    // Godslayer Crown (Generic Unique Helm): When you Stun, Freeze, or Immobilize an Elite enemy, or damage a Boss, it pulls in nearby enemies. You deal 30-60% [x] increased damage to them for 3 seconds. This effect can only occur once every 12 seconds.
    'godslayer-crown': new AspectNode('godslayer-crown', 1),

    // Flickerstep (Generic Unique Boots): Each enemy you Evade through reduces your active Ultimate Cooldown by 2-4 seconds, up to 10 seconds.
    flickerstep: new AspectNode('flickerstep', 1),

    // Tibault's Will (Generic Unique Pants): You deal 20-40% [x] increased damage while Unstoppable and for 4 seconds after. When you become Unstoppable, gain 50 of your Primary Resource.
    'tibaults-will': new AspectNode('tibaults-will', 1),

    // X'Fal's Corroded Signet (Generic Unique Ring) Lucky Hit: Your damage over time effects have up to a 50% chance to erupt, dealing [5.0-6.0] damage of the same type to Nearby enemies.
    'xfals-corroded-signet': new AspectNode(
      'xfals-corroded-signet',
      1,
    ),

    // Soulbrand (Unique Generic Chest): Your Healing Potion no longer Heals instantly, instead it grants a Barrier for 200% of the healing for 4 seconds. While you have a Barrier, you gain 10-20% Damage Reduction.
    soulbrand: new AspectNode('soulbrand', 1),

    // Banished Lord's Talisman (Unique Generic Amulet): After you spend 300 of your Primary Resource, your next Core Skill is guaranteed to Overpower. Your Critical Strikes that Overpower deal 80-120% [x] increased damage.
    'banished-lords-talisman': new AspectNode(
      'banished-lords-talisman',
      1,
    ),

    // ring-of-red-furor: After spending 100 Fury within 3 seconds, your next cast of Hammer of the Ancients, Upheaval, or Death Blow is a guaranteed Critical Strike and deals 10-30%[x] bonus Critical Strike Damage.
    'ring-of-red-furor': new AspectNode('ring-of-red-furor', 1),

    // Paingorger's Gauntlets: Damaging enemies with a cast Non–Basic Skill marks them for 3 seconds. When a Basic Skill first hits a marked enemy, the Basic Skill's damage is echoed to all marked enemies, dealing 100–200%[x] increased damage.
    'paingorgers-gauntlets': new AspectNode(
      'paingorgers-gauntlets',
      1,
    ),

    // Ring of the Ravenous: Rend’s duration is increased by 2.0–4.0 seconds. Damaging enemies with Brawling Skills applies 2 stacks of Rend's Bleed. This effect can only occur once every 4 seconds per enemy.
    'ring-of-the-ravenous': new AspectNode('ring-of-the-ravenous', 1),
  }
}

export function CreateBarbarianToggleNodes(): Record<
  string,
  ToggleNode
> {
  return {
    /* -------------------------------
              ENEMY STATE TOGGLES
       -------------------------------*/
    'enemy-boss': new ToggleNode('enemy-boss', 'boolean'), // enemy is a Boss
    'enemy-elite': new ToggleNode('enemy-elite', 'boolean'), // enemy is Elite
    'enemy-chilled': new ToggleNode('enemy-chilled', 'boolean'),
    'enemy-immobilized': new ToggleNode(
      'enemy-immobilized',
      'boolean',
    ),
    'enemy-frozen': new ToggleNode('enemy-frozen', 'boolean'),
    'enemy-knocked-down': new ToggleNode(
      'enemy-knocked-down',
      'boolean',
    ),
    'enemy-slowed': new ToggleNode('enemy-slowed', 'boolean'),
    'enemy-dazed': new ToggleNode('enemy-dazed', 'boolean'),
    'enemy-stunned': new ToggleNode('enemy-stunned', 'boolean'),
    'enemy-vulnerable': new ToggleNode('enemy-vulnerable', 'boolean'), // enemy has debuff Vulnerable
    'enemy-distant': new ToggleNode('enemy-distant', 'boolean'), // enemy is far away
    'enemy-affected-by-shadow': new ToggleNode(
      'enemy-affected-by-shadow',
      'boolean',
    ),
    'enemy-bleeding': new ToggleNode('enemy-bleeding', 'boolean'),
    'enemy-burning': new ToggleNode('enemy-burning', 'boolean'),
    'enemy-poisoned': new ToggleNode('enemy-poisoned', 'boolean'),
    'enemy-trapped': new ToggleNode('enemy-trapped', 'boolean'),
    'enemy-feared': new ToggleNode('enemy-feared', 'boolean'),
    'number-of-enemies': new ToggleNode(
      'number-of-enemies',
      'number',
    ), // Should be between 1 - 10
    'enemy-spread-yards': new ToggleNode(
      'enemy-spread-yards',
      'number',
    ), // Should be between 10 - 50.
    'enemy-kill-rate': new ToggleNode('enemy-kill-rate', 'number'), // How many enemies are killed per second.  Should be between 0 - 5.

    /* -------------------------------
            PLAYER STATE TOGGLES
       -------------------------------*/
    'world-tier': new ToggleNode('world-tier', 'number'), // Storyline Act - Reduces player resistances
    'percent-life': new ToggleNode('percent-life', 'number'), // Set your current Hitpoints. Important for Overpower and Healthy/Injured Status
    'percent-fortify': new ToggleNode('percent-fortify', 'number'), // Set your current fortify.  When Fortify > Current healthy you become "Fortified" which makes the player receive 10% less damage.
    'percent-barrier': new ToggleNode('percent-barrier', 'number'), // Set your current Barrier.
    'player-stationary': new ToggleNode(
      'player-stationary',
      'boolean',
    ), // Player is Standing Still
    berserking: new ToggleNode('berserking', 'boolean'), // Player is Berserking
    'current-fury': new ToggleNode('current-fury', 'number'), // How much Fury do you currently have
    'altars-of-lilith-gathered': new ToggleNode(
      'altars-of-lilith-gathered',
      'number',
    ), // Which Act the player has gathered altars of lilith for

    // If default is set, the weapon type which will maximize damage will be used.
    'weapon-type': new ToggleNode('weapon-type', 'string', [
      'Default',
      'Dual_Wield',
      'Two_Hand_Slashing',
      'Two_Hand_Bludgeon',
    ]),

    'enemy-level-difference': new ToggleNode(
      'enemy-level-difference',
      'number',
    ),
  }
}

// Create BaseStatsNode.
export function CreateBarbarianBaseStatsNode(): BaseStatsNode {
  return new BaseStatsNode('Barbarian', 1)
}

function CopyTags(tags: Set<string>): Set<string> {
  const new_tags = new Set<string>()
  for (const tag of tags) {
    new_tags.add(tag)
  }
  return new_tags
}

export function CreateBarbarianTagsNode(
  nodes_map: NodesMap,
): TagsNode {
  return new TagsNode('BarbarianTags', () => {
    const skill_tags = currentSkillVal(nodes_map)['tags']
    // Deep Copy the skill tags.
    const total_tags = CopyTags(skill_tags)

    // These are the tags for a skill.
    total_tags.add('skill')

    return total_tags
  })
}

// (TODO) Figure out which tags we actually need.
export function CreateBarbarianSkillNodes(): Record<
  string,
  SkillNode
> {
  return {
    // Skill Node : (Skill Name, Category, Tags[], Flat Modifier, DoT Modifier, Cooldown, Resource Build/Spend, Lucky Hit)

    //  Skills
    flay: new SkillNode(
      'flay',
      'basic',
      ['basic', 'bleed', 'slashing', 'fury', 'damage', 'physical'],
      0.05,
      0.4,
      0,
      13,
      0.5,
    ),
    frenzy: new SkillNode(
      'frenzy',
      'basic',
      [
        'basic',
        'dual-wield',
        'attack-speed',
        'fury',
        'damage',
        'physical',
      ],
      0.22,
      0,
      0,
      4,
      0.3,
    ),
    'lunging-strike': new SkillNode(
      'lunging-strike',
      'basic',
      ['basic', 'damage', 'physical', 'fury', 'movement'],
      0.33,
      0,
      0,
      12,
      0.5,
    ),
    bash: new SkillNode(
      'bash',
      'basic',
      [
        'basic',
        'bludgeoning',
        'physical',
        'fury',
        'damage',
        'two-handed',
        'crowd-control',
      ],
      0.3,
      0,
      0,
      13,
      0.5,
    ),

    // core Skills
    whirlwind: new SkillNode(
      'whirlwind',
      'core',
      ['core', 'channeled', 'fury', 'physical', 'damage'],
      0.173,
      0,
      0,
      -11,
      0.2,
    ),
    upheaval: new SkillNode(
      'upheaval',
      'core',
      ['core', 'fury', 'physical', 'damage', 'two-handed'],
      0.77,
      0,
      0,
      -40,
      0.2,
    ),
    rend: new SkillNode(
      'rend',
      'core',
      ['core', 'bleed', 'damage', 'physical', 'fury', 'slashing'],
      0.12,
      0.96,
      0,
      -35,
      0.33,
    ),
    'hammer-of-the-ancients': new SkillNode(
      'hammer-of-the-ancients',
      'core',
      [
        'core',
        'bludgeoning',
        'fury',
        'physical',
        'damage',
        'two-handed',
      ],
      0.56,
      0,
      0,
      -35,
      0.4,
    ),
    'double-swing': new SkillNode(
      'double-swing',
      'core',
      ['core', 'dual-wield', 'damage', 'physical', 'fury'],
      1,
      0,
      0,
      -25,
      0.3,
    ),

    // weapon-mastery Skills
    'death-blow': new SkillNode(
      'death-blow',
      'weapon-mastery',
      ['weapon-mastery', 'damage', 'physical', 'cooldown'],
      1.2,
      0,
      15,
      0,
      0.5,
    ),
    rupture: new SkillNode(
      'rupture',
      'weapon-mastery',
      [
        'weapon-mastery',
        'bleed',
        'damage',
        'physical',
        'cooldown',
        'slashing',
      ],
      0.13,
      0,
      10,
      0,
      0.5,
    ),
    'steel-grasp': new SkillNode(
      'steel-grasp',
      'weapon-mastery',
      [
        'weapon-mastery',
        'crowd-control',
        'damage',
        'physical',
        'cooldown',
      ],
      0.23,
      0,
      11,
      0,
      0.25,
    ),

    // Brawling Skills
    kick: new SkillNode(
      'kick',
      'brawling',
      ['brawling', 'crowd-control', 'damage', 'physical', 'cooldown'],
      0.18,
      0,
      13,
      0,
      1.0,
    ),
    charge: new SkillNode(
      'charge',
      'brawling',
      [
        'brawling',
        'unstoppable',
        'crowd-control',
        'damage',
        'physical',
      ],
      2.5,
      0,
      17,
      0,
      0.33,
    ),
    leap: new SkillNode(
      'leap',
      'brawling',
      ['brawling', 'crowd-control', 'damage', 'physical', 'cooldown'],
      0.43,
      0,
      17,
      0,
      0.33,
    ),
    // "war-cry": new SkillNode("war-cry", "brawling", ["brawling", "shout", "fortify", "berserking"], 0, 0.0, 25, 0, 0),

    // Defensive Skills
    'ground-stomp': new SkillNode(
      'ground-stomp',
      'defensive',
      [
        'defensive',
        'crowd-control',
        'damage',
        'physical',
        'cooldown',
      ],
      0.095,
      0,
      16,
      0,
      0.33,
    ),
    //"challenging-shout": new SkillNode("challenging-shout", "defensive", ["defensive", "shout", "thorns", "damage-reduction"], 0, 0.0, 25, 0, 0),
    //"iron-skin": new SkillNode("iron-skin", "defensive", ["defensive", "barrier", "fortify", "heal", "heal"], 0, 0.0, 14, 0, 0),
    // "rallying-cry": new SkillNode("rallying-cry", "defensive", ["defensive", "shout", "fortify", "unstoppable", "movement-speed", "movement-speed"], 0.5, 0.0, 25, 0, 0),

    // Ultimate Skills
    'call-of-the-ancients': new SkillNode(
      'call-of-the-ancients',
      'ultimate',
      ['ultimate', 'damage', 'physical', 'cooldown'],
      // Putting all the damage into the Hits Multiplier.
      1.0,
      0,
      50,
      0,
      0.3,
    ),
    // Each hit is considered to do the average of the 3.
    'iron-maelstrom': new SkillNode(
      'iron-maelstrom',
      'ultimate',
      [
        'ultimate',
        'crowd-control',
        'bleed',
        'damage',
        'physical',
        'cooldown',
        'two-handed',
        'bludgeoning',
        'dual-wield',
        'slashing',
      ],
      (0.6 + 0.2 + 0.65) / 3,
      1.2 / 3,
      45,
      0,
      0.4,
    ),
    //"wrath-of-the-berserker": new SkillNode("wrath-of-the-berserker", "ultimate", ["ultimate", "berserking", "unstoppable", "movement-speed"], 0.0, 0.0, 60, 0, 0)
  }
}

/*
These are the nodes that are computed at run time. They all start with value = null and should
depend on each other and the above nodes. Dependencies are added in after all nodes are defined.
*/
/*   // Weapon Damage Node: This value is added to Weapon Damage, prior to all the +% Damage Modifiers
    "Weapon_Damage_Bonus", // "[{VALUE}|~|] Weapon Damage".
    "Main_Hand_Damage_Percent_Bonus", // "+[{VALUE} * 100|%|] Bonus to Main Hand Weapon Damage",
*/
export function CreateBarbarianStatsNodes(
  nodes_map: NodesMap,
): Record<string, StatsNode> {
  if (nodes_map['toggle'] == undefined) {
    throw 'nodes_map is not fully populated.'
  }
  return {
    /*--------------------------------------------------
                    OFFENSIVE STATS NODES
        --------------------------------------------------*/

    Weapon_Type: new StatsNode('Weapon_Type', () => {
      let dual_wield_dps = 0
      let two_hand_slashing_dps = 0
      let two_hand_bludgeon_dps = 0
      let max_dps = 0
      switch (toggleVal(nodes_map, 'weapon-type')) {
        case 'Dual_Wield':
          return 0
        case 'Two_Hand_Slashing':
          return 1
        case 'Two_Hand_Bludgeon':
          return 2
        default:
          dual_wield_dps =
            statVal(nodes_map, 'Raw_Dual_Wield_Damage') *
            statVal(nodes_map, 'Raw_Dual_Wield_Attack_Speed')
          two_hand_slashing_dps =
            aggregationVal(nodes_map, 'two-hand-slashing-damage') *
            aggregationVal(
              nodes_map,
              'two-hand-slashing-attack-speed',
            )
          two_hand_bludgeon_dps =
            aggregationVal(nodes_map, 'two-hand-bludgeon-damage') *
            aggregationVal(
              nodes_map,
              'two-hand-bludgeon-attack-speed',
            )

          max_dps = Math.max(
            dual_wield_dps,
            two_hand_slashing_dps,
            two_hand_bludgeon_dps,
          )

          // Frenzy & Double Swing: Requires Dual Wield
          if (
            currentSkillVal(nodes_map)['name'] == 'frenzy' ||
            currentSkillVal(nodes_map)['name'] == 'double-swing'
          ) {
            return 0
          }

          // Upheaval: Requires 2H Weapon
          if (currentSkillVal(nodes_map)['name'] == 'upheaval') {
            if (two_hand_slashing_dps > two_hand_bludgeon_dps) {
              return 1
            } else {
              return 2
            }
          }

          // Flay, Rend, Rupture: Requires Slashing Weapon
          if (
            currentSkillVal(nodes_map)['name'] == 'flay' ||
            currentSkillVal(nodes_map)['name'] == 'rend' ||
            currentSkillVal(nodes_map)['name'] == 'rupture'
          ) {
            if (
              aggregationVal(nodes_map, 'main-hand-weapon') == 0 ||
              aggregationVal(nodes_map, 'main-hand-weapon') == 1 ||
              aggregationVal(nodes_map, 'off-hand-weapon') == 0 ||
              aggregationVal(nodes_map, 'off-hand-weapon') == 1
            ) {
              if (two_hand_slashing_dps >= dual_wield_dps) {
                return 1
              } else {
                return 0
              }
            } else {
              return 1
            }
          }

          // Bash & Hammer of the Ancients: Requires Two Hand Bludgeon
          if (currentSkillVal(nodes_map)['name'] == 'bash') {
            if (
              aggregationVal(nodes_map, 'main-hand-weapon') == 2 ||
              aggregationVal(nodes_map, 'off-hand-weapon') == 2
            ) {
              if (two_hand_bludgeon_dps >= dual_wield_dps) {
                return 2
              } else {
                return 0
              }
            } else {
              return 2
            }
          }
          if (
            currentSkillVal(nodes_map)['name'] ==
            'hammer-of-the-ancients'
          ) {
            return 2
          }

          if (dual_wield_dps == max_dps) {
            return 0
          } else if (two_hand_slashing_dps == max_dps) {
            return 1
          } else {
            return 2
          }
      }
    }),

    Raw_Dual_Wield_Damage: new StatsNode(
      'Raw_Dual_Wield_Damage',
      () => {
        return (
          aggregationVal(nodes_map, 'one-hand-slashing-damage') +
          aggregationVal(nodes_map, 'one-hand-bludgeon-damage')
        )
      },
    ),

    Raw_Dual_Wield_Attack_Speed: new StatsNode(
      'Raw_Dual_Wield_Attack_Speed',
      () => {
        return (
          (aggregationVal(nodes_map, 'main-hand-attack-speed') +
            aggregationVal(nodes_map, 'off-hand-attack-speed')) /
          2
        )
      },
    ),

    Total_Weapon_Damage: new StatsNode('Total_Weapon_Damage', () => {
      const weapon_type = statVal(nodes_map, 'Weapon_Type')
      const dual_wield_damage =
        statVal(nodes_map, 'Raw_Dual_Wield_Damage') +
        aggregationVal(nodes_map, 'main-hand-weapon-damage')
      const two_hand_slashing_damage =
        aggregationVal(nodes_map, 'two-hand-slashing-damage') +
        aggregationVal(nodes_map, 'main-hand-weapon-damage')
      const two_hand_bludgeon_damage =
        aggregationVal(nodes_map, 'two-hand-bludgeon-damage') +
        aggregationVal(nodes_map, 'main-hand-weapon-damage')

      switch (weapon_type) {
        case 0:
          return dual_wield_damage
        case 1:
          return two_hand_slashing_damage
        default:
          return two_hand_bludgeon_damage
      }
    }),

    Raw_Attack_Speed: new StatsNode('Raw_Attack_Speed', () => {
      const weapon_type = statVal(nodes_map, 'Weapon_Type')
      const dual_wield_attack_speed = statVal(
        nodes_map,
        'Raw_Dual_Wield_Attack_Speed',
      )
      const two_hand_slashing_attack_speed = aggregationVal(
        nodes_map,
        'two-hand-slashing-attack-speed',
      )
      const two_hand_bludgeon_attack_speed = aggregationVal(
        nodes_map,
        'two-hand-bludgeon-attack-speed',
      )

      switch (weapon_type) {
        case 0:
          return dual_wield_attack_speed
        case 1:
          return two_hand_slashing_attack_speed
        default:
          return two_hand_bludgeon_attack_speed
      }
    }),

    // Includes generic damage bonus which do not depend on tags.
    Generic_Damage_Bonus: new StatsNode(
      'Generic_Damage_Bonus',
      () => {
        let Generic_Damage_Bonus = 0
        const Pre_Sim_Node = barbarianPresimVal(nodes_map)
        const number_of_enemies = Number(
          toggleVal(nodes_map, 'number-of-enemies'),
        )

        Generic_Damage_Bonus += aggregationVal(nodes_map, 'damage')

        Generic_Damage_Bonus +=
          Math.min(
            statVal(nodes_map, 'Enemy_Attacks_Per_Second') *
              4 *
              statVal(nodes_map, 'Total_Dodge_Chance'),
            1,
          ) *
          aggregationVal(
            nodes_map,
            'damage-for-4-seconds-after-dodging-an-attack',
          )

        Generic_Damage_Bonus +=
          Number(toggleVal(nodes_map, 'enemy-affected-by-shadow')) *
          aggregationVal(
            nodes_map,
            'damage-to-affected-by-shadow-damage-over-time-enemies',
          )

        Generic_Damage_Bonus +=
          Number(toggleVal(nodes_map, 'enemy-bleeding')) *
          aggregationVal(nodes_map, 'damage-to-bleeding-enemies')

        if (toggleVal(nodes_map, 'enemy-burning')) {
          Generic_Damage_Bonus += aggregationVal(
            nodes_map,
            'damage-to-burning-enemies',
          )
        } else if (
          aspectVal(nodes_map, 'hellhammer').length != 0 &&
          'upheaval' in Pre_Sim_Node['skill_use_rate']
        ) {
          const Burning_Uptime = Math.min(
            Pre_Sim_Node['skill_use_rate']['upheaval'] * 4,
            1,
          )
          Generic_Damage_Bonus +=
            aggregationVal(nodes_map, 'damage-to-burning-enemies') *
            Burning_Uptime
        }

        Generic_Damage_Bonus +=
          statVal(nodes_map, 'Enemy_Chilled') *
          aggregationVal(nodes_map, 'damage-to-chilled-enemies') *
          statVal(nodes_map, 'Enemy_Boss_CC_Adjustment')

        Generic_Damage_Bonus += toggleVal(nodes_map, 'enemy-distant')
          ? aggregationVal(nodes_map, 'damage-to-distant-enemies')
          : aggregationVal(nodes_map, 'damage-to-close-enemies')

        Generic_Damage_Bonus +=
          statVal(nodes_map, 'Enemy_Crowd_Controlled') *
          aggregationVal(
            nodes_map,
            'damage-to-crowd-controlled-enemies',
          ) *
          statVal(nodes_map, 'Enemy_Boss_CC_Adjustment')

        Generic_Damage_Bonus +=
          Number(toggleVal(nodes_map, 'enemy-dazed')) *
          aggregationVal(nodes_map, 'damage-to-daze-enemies') *
          statVal(nodes_map, 'Enemy_Boss_CC_Adjustment')

        Generic_Damage_Bonus +=
          (aggregationVal(nodes_map, 'damage-to-elites') *
            Number(toggleVal(nodes_map, 'enemy-elite'))) /
          number_of_enemies

        Generic_Damage_Bonus +=
          Number(toggleVal(nodes_map, 'enemy-frozen')) *
          aggregationVal(nodes_map, 'damage-to-freeze-enemies') *
          statVal(nodes_map, 'Enemy_Boss_CC_Adjustment')

        // Not doing the time to kill scaling since its more complicated and less significant in a shared bucket.
        Generic_Damage_Bonus +=
          0.2 * aggregationVal(nodes_map, 'damage-to-healthy-enemies')

        // Not doing the time to kill scaling since its more complicated and less significant in a shared bucket.
        Generic_Damage_Bonus +=
          0.35 *
          aggregationVal(nodes_map, 'damage-to-injured-enemies')

        Generic_Damage_Bonus +=
          Number(toggleVal(nodes_map, 'enemy-poisoned')) *
          aggregationVal(nodes_map, 'damage-to-poisoned-enemies')

        Generic_Damage_Bonus +=
          Number(toggleVal(nodes_map, 'enemy-stunned')) *
          aggregationVal(nodes_map, 'damage-to-stun-enemies')

        Generic_Damage_Bonus +=
          Number(toggleVal(nodes_map, 'enemy-trapped')) *
          aggregationVal(nodes_map, 'damage-to-trap-enemies')

        Generic_Damage_Bonus +=
          aggregationVal(nodes_map, 'damage-while-berserking') *
          statVal(nodes_map, 'Berserking_Uptime')

        Generic_Damage_Bonus +=
          Number(
            Number(toggleVal(nodes_map, 'percent-fortify')) >=
              Number(toggleVal(nodes_map, 'percent-life')),
          ) * aggregationVal(nodes_map, 'damage-while-fortified')

        Generic_Damage_Bonus +=
          Number(toggleVal(nodes_map, 'percent-life')) >= 0.8
            ? aggregationVal(nodes_map, 'damage-while-healthy')
            : 0

        return Generic_Damage_Bonus
      },
    ),

    Attribute_Damage_Multiplier: new StatsNode(
      'Attribute_Damage_Multiplier',
      () => {
        // Total_Strength
        const Attribute_Damage_Multiplier =
          1 + statVal(nodes_map, 'Total_Strength') * 0.001

        return Attribute_Damage_Multiplier
      },
    ),

    Skill_Damage_Bonus: new StatsNode('Skill_Damage_Bonus', () => {
      let Skill_Damage_Bonus = 0

      switch (currentSkillVal(nodes_map)['category']) {
        case 'basic':
          Skill_Damage_Bonus += aggregationVal(
            nodes_map,
            'basic-skill-damage',
          )
          break
        case 'core':
          Skill_Damage_Bonus += aggregationVal(
            nodes_map,
            'core-skill-damage',
          )
          break
        case 'brawling':
          Skill_Damage_Bonus += aggregationVal(
            nodes_map,
            'brawling-skill-damage',
          )
          break
        case 'weapon-mastery':
          Skill_Damage_Bonus += aggregationVal(
            nodes_map,
            'weapon-mastery-skill-damage',
          )
          break
        case 'ultimate':
          Skill_Damage_Bonus += aggregationVal(
            nodes_map,
            'ultimate-skill-damage',
          )
          break
        default:
          break
      }

      switch (statVal(nodes_map, 'Weapon_Type')) {
        case 0:
          Skill_Damage_Bonus += aggregationVal(
            nodes_map,
            'damage-with-dual-wielded-weapons',
          )

          Skill_Damage_Bonus += aggregationVal(
            nodes_map,
            'damage-with-onehanded',
          )

          switch (aggregationVal(nodes_map, 'main-hand-weapon')) {
            case 0:
              Skill_Damage_Bonus +=
                aggregationVal(nodes_map, 'damage-with-sword') / 2
              break

            case 1:
              Skill_Damage_Bonus +=
                aggregationVal(nodes_map, 'damage-with-axe') / 2
              break

            case 2:
              Skill_Damage_Bonus +=
                aggregationVal(nodes_map, 'damage-with-mace') / 2
              break
          }

          switch (aggregationVal(nodes_map, 'off-hand-weapon')) {
            case 0:
              Skill_Damage_Bonus +=
                aggregationVal(nodes_map, 'damage-with-sword') / 2
              break

            case 1:
              Skill_Damage_Bonus +=
                aggregationVal(nodes_map, 'damage-with-axe') / 2
              break

            case 2:
              Skill_Damage_Bonus +=
                aggregationVal(nodes_map, 'damage-with-mace') / 2
              break
          }
          break

        case 1:
          Skill_Damage_Bonus += aggregationVal(
            nodes_map,
            'damage-with-two-handed-slashing-weapons',
          )

          switch (aggregationVal(nodes_map, 'main-hand-weapon')) {
            case 0:
              Skill_Damage_Bonus +=
                aggregationVal(nodes_map, 'damage-with-sword') / 2
              break

            case 1:
              Skill_Damage_Bonus +=
                aggregationVal(nodes_map, 'damage-with-axe') / 2
              break

            case 2:
              Skill_Damage_Bonus +=
                aggregationVal(nodes_map, 'damage-with-polearm') / 2
              break
          }
          break

        case 2:
          Skill_Damage_Bonus += aggregationVal(
            nodes_map,
            'damage-with-two-handed-bludgeoning-weapons',
          )

          Skill_Damage_Bonus += aggregationVal(
            nodes_map,
            'damage-with-mace',
          )
          break
      }

      return Skill_Damage_Bonus
    }),

    Generic_Critical_Chance: new StatsNode(
      'Generic_Critical_Chance',
      () => {
        let Critical_Chance_Total = 0.05 // 5.0% Base Crit chance for All Classes
        const Pre_Sim_Node = barbarianPresimVal(nodes_map)

        Critical_Chance_Total +=
          statVal(nodes_map, 'Total_Dexterity') * 0.0002

        Critical_Chance_Total += aggregationVal(
          nodes_map,
          'critical-strike-chance',
        )

        // Not doing the time to kill scaling since its more complicated and less significant in a shared bucket.
        Critical_Chance_Total +=
          aggregationVal(
            nodes_map,
            'critical-strike-chance-against-injured-enemies',
          ) * 0.35

        // 'critical-strike-chance-against-close-enemies'
        Critical_Chance_Total +=
          aggregationVal(
            nodes_map,
            'critical-strike-chance-against-close-enemies',
          ) *
          Math.min(
            1,
            10 ** 2 / statVal(nodes_map, 'Enemy_Spread') ** 2,
          )

        // 1-H Axe Expertise: 5.0% increased Critical Strike Chance against injured enemies. Double this amount when using two Axes.
        if (
          statVal(nodes_map, 'Weapon_Type') == 0 &&
          expertiseVal(nodes_map) != 'axe'
        ) {
          if (aggregationVal(nodes_map, 'main-hand-weapon') == 1) {
            Critical_Chance_Total += 0.05 * 0.35
          }
          if (aggregationVal(nodes_map, 'off-hand-weapon') == 1) {
            Critical_Chance_Total += 0.05 * 0.35
          }
        } else if (expertiseVal(nodes_map) == 'axe') {
          Critical_Chance_Total += 0.1 * 0.35
        }

        // 2-H Axe Expertise: +10% increased Critical Strike Chance against Vulnerable enemies.
        if (
          statVal(nodes_map, 'Weapon_Type') == 1 &&
          aggregationVal(nodes_map, 'two-hand-slashing-weapon') == 1
        ) {
          Critical_Chance_Total +=
            0.1 * statVal(nodes_map, 'Enemy_Vulnerable')
        }

        // No Mercy (Talent up to 3 points) You have +3% increased Critical Chance against Immobilized, Stunned, or Slowed enemies
        if (
          toggleVal(nodes_map, 'enemy-stunned') ||
          toggleVal(nodes_map, 'enemy-slowed') ||
          toggleVal(nodes_map, 'enemy-immobilized')
        ) {
          Critical_Chance_Total +=
            0.03 *
            talentVal(nodes_map, 'no-mercy') *
            statVal(nodes_map, 'Enemy_Boss_CC_Adjustment')
        }

        // Bloodfeather: You have 5% increased Critical Strike Chance against Bleeding enemies.
        if (paragonVal(nodes_map, 'bloodfeeder')) {
          if (toggleVal(nodes_map, 'enemy-bleeding')) {
            Critical_Chance_Total += 0.05
          } else {
            Critical_Chance_Total += 0.05 * Pre_Sim_Node['dot_uptime']
          }
        }

        // Legendary Paragon 'flawless-technique': Damaging enemies with One-Handed Weapons increases your Critical Strike chance by x1% for 4 seconds, up to x8%.
        //                                         This can only happen once per Skill cast, or twice per second while channeling Whirlwind.
        if (paragonVal(nodes_map, 'flawless-technique')) {
          /* let Whirlwind_Rate = 0
          if ('whirlwind' in Pre_Sim_Node['skill_use_rate']) {
            Whirlwind_Rate += Pre_Sim_Node['skill_use_rate']['whirlwind']
          }*/
          Critical_Chance_Total +=
            Pre_Sim_Node['weapon_use_rate']['dual-wield'] * 4 >= 1
              ? 0.08
              : 0.01 *
                Pre_Sim_Node['weapon_use_rate']['dual-wield'] *
                2
        }

        // Vampiric Power sanguine-brace
        // When you kill an enemy, Fortify for 6% of your Base Life. While you have more Fortify than half of your Maximum Life, you gain 8% Critical Strike Chance.
        if (
          vampiricPowerVal(nodes_map, 'sanguine-brace') &&
          Number(toggleVal(nodes_map, 'percent-fortify')) > 0.5
        ) {
          Critical_Chance_Total += 0.08
        }

        return Math.min(Critical_Chance_Total, 1)
      },
    ),

    Generic_Critical_Chance_Multiplier: new StatsNode(
      'Generic_Critical_Chance_Multiplier',
      () => {
        let Generic_Critical_Chance_Multiplier = 1

        // "Smiting Aspect": You have [10-20]%[x] increased Critical Strike Chance against Injured enemies. While you are Healthy, you gain [20-40]%[x] increased Crowd Control Duration.
        if (aspectVal(nodes_map, 'smiting-aspect').length != 0) {
          Generic_Critical_Chance_Multiplier *=
            1 +
            (aspectVal(nodes_map, 'smiting-aspect')[0] * 0.35) /
              (1 + 0.65 * aspectVal(nodes_map, 'smiting-aspect')[0])
        }

        return Generic_Critical_Chance_Multiplier
      },
    ),

    Skill_Critical_Chance: new StatsNode(
      'Skill_Critical_Chance',
      () => {
        let Critical_Chance_Total = 0
        const Pre_Sim_Node = barbarianPresimVal(nodes_map)

        if (currentSkillVal(nodes_map)['tags'].has('bone')) {
          Critical_Chance_Total += aggregationVal(
            nodes_map,
            'critical-strike-chance-with-bone-skills',
          )
        }

        // Aspect of the Dire Whirlwind: Whirlwind's Critical Strike Chance is increased by +{3/8}% for each second it is channeled, up to +{9/24}%.
        if (
          aspectVal(nodes_map, 'aspect-of-the-dire-whirlwind')
            .length != 0 &&
          currentSkillVal(nodes_map)['name'] == 'whirlwind'
        ) {
          let accumulated_crit_bonus = 0
          for (
            let i = 1;
            i < statVal(nodes_map, 'Number_Of_Cast');
            i++
          ) {
            accumulated_crit_bonus += Math.min(
              i *
                aspectVal(
                  nodes_map,
                  'aspect-of-the-dire-whirlwind',
                )[0],
              aspectVal(nodes_map, 'aspect-of-the-dire-whirlwind')[1],
            )
          }
          if (statVal(nodes_map, 'Number_Of_Cast') > 0) {
            Critical_Chance_Total +=
              accumulated_crit_bonus /
              statVal(nodes_map, 'Number_Of_Cast')
          }
        }

        // Prime Iron Maelstrom: Iron Maelstrom gains +30% Critical Strike Chance and x40% Critical Strike Damage.
        if (
          currentSkillVal(nodes_map)['name'] == 'iron-maelstrom' &&
          talentVal(nodes_map, 'prime-iron-maelstrom')
        ) {
          Critical_Chance_Total += 0.3
        }

        // Glyph Mortal Draw: Swapping weapons has a 18% chance to cause the Skill's damage to Critically Strike.
        if (paragonVal(nodes_map, 'mortal-draw')) {
          const Weapon_Swap_Rate = Pre_Sim_Node['weapon_swap_rate']
          let Total_Skill_Use_Rate = 0
          for (const Skill in Pre_Sim_Node['skill_use_rate']) {
            Total_Skill_Use_Rate +=
              Pre_Sim_Node['skill_use_rate'][Skill]
          }
          if (Total_Skill_Use_Rate > 0) {
            Critical_Chance_Total +=
              0.18 *
              Math.min(1, Weapon_Swap_Rate / Total_Skill_Use_Rate)
          }
        }

        // (Barbarian) focused-rage: After spending [60-100] Fury within 2 seconds, your next Non-Basic Skill's Critical Strike Chance is increased by [22 - 32]%.
        // 1) Compute how many core skills to get the bonus.
        // 2) Compute how long to generate that much fury.
        // 3) Use that time to compute the bonus rate.
        // 4) Use current skill rate to compute the chance the bonus should be applied to each skill.
        if (
          malignantHeartVal(nodes_map, 'focused-rage').length > 0 &&
          currentSkillVal(nodes_map)['category'] != 'basic'
        ) {
          // Step 1: Number of core skills and remaining fury to generate.
          let Required_Core_Cast_Time = 1000000 // Placeholder
          let Required_Additional_Fury = 0
          for (const Skill in Pre_Sim_Node['cross_skill_stat']) {
            if (
              skillVal(nodes_map, Skill)['category'] == 'core' &&
              Pre_Sim_Node['cross_skill_stat'][Skill].resource_cost <
                0
            ) {
              const Required_Core_Casts =
                -malignantHeartVal(nodes_map, 'focused-rage')[0] /
                Pre_Sim_Node['cross_skill_stat'][Skill].resource_cost

              Required_Core_Cast_Time =
                Required_Core_Casts *
                Pre_Sim_Node['cross_skill_stat'][Skill].elapsed_time

              const Core_Delta_Resource =
                Pre_Sim_Node['cross_skill_stat'][Skill]
                  .resource_gain +
                Pre_Sim_Node['cross_skill_stat'][Skill].resource_cost

              Required_Additional_Fury = -Math.min(
                Core_Delta_Resource * Required_Core_Casts,
                0,
              )
              break
            }
          }

          // Step 2/3) Find the fury generation rate of skills
          // and how long it takes to generate the required fury.
          let Resource_Regen_Rate = 0
          for (const Skill in Pre_Sim_Node['cross_skill_stat']) {
            if (
              Pre_Sim_Node['cross_skill_stat'][Skill].resource_cost ==
                0 &&
              Skill in Pre_Sim_Node['skill_use_rate']
            ) {
              Resource_Regen_Rate +=
                Pre_Sim_Node['cross_skill_stat'][Skill]
                  .resource_gain *
                Pre_Sim_Node['skill_use_rate'][Skill]
            }
          }
          let Focused_Rage_Rate = 0
          if (Required_Additional_Fury == 0) {
            Focused_Rage_Rate = 1 / Required_Core_Cast_Time
          } else if (Resource_Regen_Rate == 0) {
            Focused_Rage_Rate = 0
          } else {
            Focused_Rage_Rate =
              1 /
              (Required_Additional_Fury / Resource_Regen_Rate +
                Required_Core_Cast_Time)
          }

          // Step 4) Compute the chance the bonus should be applied to each skill.
          let Non_Basic_Cast_Rate = 0
          for (const Skill in Pre_Sim_Node['skill_use_rate']) {
            if (skillVal(nodes_map, Skill)['category'] != 'basic') {
              Non_Basic_Cast_Rate +=
                Pre_Sim_Node['skill_use_rate'][Skill]
            }
          }
          if (Non_Basic_Cast_Rate != 0) {
            Critical_Chance_Total +=
              malignantHeartVal(nodes_map, 'focused-rage')[1] *
              Math.min(Focused_Rage_Rate / Non_Basic_Cast_Rate, 1)
          }
        }

        // ring-of-red-furor: After spending 100 Fury within 3 seconds, your next cast of Hammer of the Ancients, Upheaval, or Death Blow is a guaranteed Critical Strike and deals 10-30%[x] bonus Critical Strike Damage.
        if (
          aspectVal(nodes_map, 'ring-of-red-furor').length > 0 &&
          ('hammer-of-the-ancients' in
            Pre_Sim_Node['skill_use_rate'] ||
            'upheaval' in Pre_Sim_Node['skill_use_rate'] ||
            'death-blow' in Pre_Sim_Node['skill_use_rate']) &&
          (currentSkillVal(nodes_map)['name'] ==
            'hammer-of-the-ancients' ||
            currentSkillVal(nodes_map)['name'] == 'upheaval' ||
            currentSkillVal(nodes_map)['name'] == 'death-blow')
        ) {
          let Red_Furor_Proc_Rate = 0
          for (const Skill in Pre_Sim_Node['skill_use_rate']) {
            if (
              Pre_Sim_Node['cross_skill_stat'][Skill][
                'resource_cost'
              ] < 0
            ) {
              Red_Furor_Proc_Rate -=
                (Pre_Sim_Node['skill_use_rate'][Skill] *
                  Pre_Sim_Node['cross_skill_stat'][Skill][
                    'resource_cost'
                  ]) /
                100
            }
          }
          const Red_Furor_Spenders = new Set([
            'hammer-of-the-ancients',
            'upheaval',
            'death-blow',
          ])
          let Red_Furor_Spender_Rate = 0
          for (const Skill of Red_Furor_Spenders) {
            if (Skill in Pre_Sim_Node['skill_use_rate']) {
              Red_Furor_Spender_Rate +=
                Pre_Sim_Node['skill_use_rate'][Skill]
            }
          }
          if (Red_Furor_Spender_Rate > 0 && Red_Furor_Proc_Rate > 0) {
            Critical_Chance_Total +=
              (1 - Critical_Chance_Total) *
              Math.min(
                1,
                Red_Furor_Proc_Rate / Red_Furor_Spender_Rate,
              )
          }
        }

        return Math.min(Critical_Chance_Total, 1)
      },
    ),

    Skill_Critical_Chance_Multiplier: new StatsNode(
      'Skill_Critical_Chance_Multiplier',
      () => {
        let Critical_Chance_Multiplier = 1
        const Pre_Sim_Node = barbarianPresimVal(nodes_map)

        // ring-of-red-furor: After spending 100 Fury within 3 seconds, your next cast of Hammer of the Ancients, Upheaval, or Death Blow is a guaranteed Critical Strike and deals 10-30%[x] bonus Critical Strike Damage.
        if (
          aspectVal(nodes_map, 'ring-of-red-furor').length > 0 &&
          ('hammer-of-the-ancients' in
            Pre_Sim_Node['skill_use_rate'] ||
            'upheaval' in Pre_Sim_Node['skill_use_rate'] ||
            'death-blow' in Pre_Sim_Node['skill_use_rate']) &&
          (currentSkillVal(nodes_map)['name'] ==
            'hammer-of-the-ancients' ||
            currentSkillVal(nodes_map)['name'] == 'upheaval' ||
            currentSkillVal(nodes_map)['name'] == 'death-blow')
        ) {
          let Red_Furor_Proc_Rate = 0
          for (const Skill in Pre_Sim_Node['skill_use_rate']) {
            if (
              Pre_Sim_Node['cross_skill_stat'][Skill][
                'resource_cost'
              ] < 0
            ) {
              Red_Furor_Proc_Rate -=
                (Pre_Sim_Node['skill_use_rate'][Skill] *
                  Pre_Sim_Node['cross_skill_stat'][Skill][
                    'resource_cost'
                  ]) /
                100
            }
          }
          const Red_Furor_Spenders = new Set([
            'hammer-of-the-ancients',
            'upheaval',
            'death-blow',
          ])
          let Red_Furor_Spender_Rate = 0
          for (const Skill of Red_Furor_Spenders) {
            if (Skill in Pre_Sim_Node['skill_use_rate']) {
              Red_Furor_Spender_Rate +=
                Pre_Sim_Node['skill_use_rate'][Skill]
            }
          }
          if (Red_Furor_Spender_Rate > 0 && Red_Furor_Proc_Rate > 0) {
            Critical_Chance_Multiplier *=
              1 +
              aspectVal(nodes_map, 'ring-of-red-furor')[0] *
                Math.min(
                  1,
                  Red_Furor_Proc_Rate / Red_Furor_Spender_Rate,
                )
          }
        }

        return Critical_Chance_Multiplier
      },
    ),

    Critical_Chance: new StatsNode('Critical_Chance', () => {
      const Non_Crit_Skills = new Set([
        'rallying-cry',
        'iron-skin',
        'challenging-shout',
        'war-cry',
        'wrath-of-the-berserker',
      ])
      if (Non_Crit_Skills.has(currentSkillVal(nodes_map)['name'])) {
        return 0
      }
      let Critical_Chance =
        statVal(nodes_map, 'Generic_Critical_Chance') +
        statVal(nodes_map, 'Skill_Critical_Chance')

      if (tagsVal(nodes_map).has('physical')) {
        Critical_Chance += aggregationVal(
          nodes_map,
          'critical-strike-chance-with-physical-damage',
        )
      }

      Critical_Chance *=
        statVal(nodes_map, 'Generic_Critical_Chance_Multiplier') *
        statVal(nodes_map, 'Skill_Critical_Chance_Multiplier')

      return Math.min(Critical_Chance, 1)
    }),

    // These are the things which give +Critical Damage.
    Generic_Critical_Bonus: new StatsNode(
      'Generic_Critical_Bonus',
      () => {
        const Weapon_Type = statVal(nodes_map, 'Weapon_Type')

        let Critical_Bonus_Total = 0

        Critical_Bonus_Total += aggregationVal(
          nodes_map,
          'critical-strike-damage',
        )

        // critical-strike-damage-to-vulnerable-enemies
        Critical_Bonus_Total +=
          aggregationVal(
            nodes_map,
            'critical-strike-damage-to-vulnerable-enemies',
          ) * statVal(nodes_map, 'Enemy_Vulnerable')

        // critical-strike-damage-to-crowd-controlled-enemies
        Critical_Bonus_Total +=
          aggregationVal(
            nodes_map,
            'critical-strike-damage-to-crowd-controlled-enemies',
          ) * statVal(nodes_map, 'Enemy_Crowd_Controlled')

        //'critical-strike-damage-with-onehanded' (Barbarian)
        if (Weapon_Type == 0) {
          Critical_Bonus_Total += aggregationVal(
            nodes_map,
            'critical-strike-damage-with-onehanded',
          )
        }

        return Critical_Bonus_Total
      },
    ),

    Generic_Critical_Damage_Multiplier: new StatsNode(
      'Generic_Critical_Damage_Multiplier',
      () => {
        const Weapon_Type = statVal(nodes_map, 'Weapon_Type')
        let Critical_Multiplier_Total = 1.5

        // 2-H Mace Expertise: You deal x15% increased Critical Strike Damage to Stunned and Vulnerable enemies while Berserking.
        if (
          Weapon_Type == 2 &&
          statVal(nodes_map, 'Berserking_Uptime') > 0 &&
          (statVal(nodes_map, 'Enemy_Vulnerable') > 0 ||
            toggleVal(nodes_map, 'enemy-stunned'))
        ) {
          if (
            statVal(nodes_map, 'Enemy_Vulnerable') > 0 &&
            !toggleVal(nodes_map, 'enemy-stunned')
          ) {
            Critical_Multiplier_Total *=
              1 +
              0.15 *
                statVal(nodes_map, 'Enemy_Vulnerable') *
                statVal(nodes_map, 'Berserking_Uptime')
          } else if (toggleVal(nodes_map, 'enemy-stunned')) {
            Critical_Multiplier_Total *=
              1 + 0.15 * statVal(nodes_map, 'Berserking_Uptime')
          }
        }

        // Two Handed Weapons.
        if (Weapon_Type == 1 || Weapon_Type == 2) {
          // Heavy Handed (Talent up to 3 Points): While using Two-Handed weapons you deal x5% increased Crtiical Strike Damage
          Critical_Multiplier_Total *=
            1 + 0.05 * talentVal(nodes_map, 'heavy-handed')
        }

        // Increases your Critical Strike Damage by [[60 - 100]|%x|]. The other properties on this weapon can roll higher than normal.
        if (aspectVal(nodes_map, 'the-grandfather').length > 0) {
          Critical_Multiplier_Total *=
            1 + aspectVal(nodes_map, 'the-grandfather')[0]
        }

        return Critical_Multiplier_Total
      },
    ),

    Skill_Critical_Bonus: new StatsNode(
      'Skill_Critical_Bonus',
      () => {
        let Critical_Bonus_Total = 0

        // 'critical-strike-damage-with-core-skills'
        if (currentSkillVal(nodes_map)['tags'].has('core')) {
          Critical_Bonus_Total += aggregationVal(
            nodes_map,
            'critical-strike-damage-with-core-skills',
          )
        }

        return Critical_Bonus_Total
      },
    ),

    Skill_Critical_Damage_Multiplier: new StatsNode(
      'Skill_Critical_Damage_Multiplier',
      () => {
        const Weapon_Type = statVal(nodes_map, 'Weapon_Type')
        let Critical_Multiplier_Total = 1

        // Prime Iron Maelstrom: Iron Maelstrom gains +13% Critical Strike Chance and x40% Critical Strike Damage.
        if (
          currentSkillVal(nodes_map)['name'] == 'iron-maelstrom' &&
          talentVal(nodes_map, 'prime-iron-maelstrom')
        ) {
          Critical_Multiplier_Total *= 1.4
        }

        // Cleaver: While wielding an Axe, you deal x12% increased Critical Strike Damage.
        if (paragonVal(nodes_map, 'cleaver')) {
          let Cleaver_Bonus = 0
          if (Weapon_Type == 0) {
            if (aggregationVal(nodes_map, 'main-hand-weapon') == 1) {
              Cleaver_Bonus += 0.06
            }
            if (aggregationVal(nodes_map, 'off-hand-weapon') == 1) {
              Cleaver_Bonus += 0.06
            }
          } else if (
            Weapon_Type == 1 &&
            aggregationVal(nodes_map, 'two-hand-slashing-weapon') == 1
          ) {
            Cleaver_Bonus += 0.12
          }
          Critical_Multiplier_Total *= 1 + Cleaver_Bonus
        }

        return Critical_Multiplier_Total
      },
    ),

    Critical_Multiplier: new StatsNode('Critical_Multiplier', () => {
      const Non_Crit_Skills = new Set([
        'rallying-cry',
        'iron-skin',
        'challenging-shout',
        'war-cry',
        'wrath-of-the-berserker',
      ])
      if (Non_Crit_Skills.has(currentSkillVal(nodes_map)['name'])) {
        return 1
      }
      let Critical_Multiplier =
        1 +
        (statVal(nodes_map, 'Skill_Critical_Bonus') +
          statVal(nodes_map, 'Generic_Critical_Bonus'))

      if (tagsVal(nodes_map).has('lightning')) {
        Critical_Multiplier += aggregationVal(
          nodes_map,
          'lightning-critical-strike-damage',
        )
      }

      Critical_Multiplier *=
        statVal(nodes_map, 'Generic_Critical_Damage_Multiplier') *
        statVal(nodes_map, 'Skill_Critical_Damage_Multiplier')

      return Critical_Multiplier
    }),

    Non_Aspect_Attack_Speed_Bonus: new StatsNode(
      'Non_Aspect_Attack_Speed_Bonus',
      () => {
        const Pre_Sim_Node = barbarianPresimVal(nodes_map)
        let Attack_Speed_Bonus_Total = 0

        // attack-speed
        Attack_Speed_Bonus_Total += aggregationVal(
          nodes_map,
          'attack-speed',
        )

        // Walking Arsenal: Dealing Damage with a Two-Handed Bludgeoning, Two-Handed Slashing, or Dual Wielded weapon grants x10% increased damage for 10 seconds.  While all three damage bonuses are active, you gain an additional x20% increased damage and attack speed.
        if (talentVal(nodes_map, 'walking-arsenal') == 1) {
          Attack_Speed_Bonus_Total +=
            0.2 *
            Math.min(
              1,
              statVal(nodes_map, 'Walking_Arsenal_DualWield_Uptime') *
                statVal(
                  nodes_map,
                  'Walking_Arsenal_TwoHand_Slashing_Uptime',
                ) *
                statVal(
                  nodes_map,
                  'Walking_Arsenal_TwoHand_Bludgeon_Uptime',
                ),
            )
        }

        // Vampiric Power ravenous
        // Lucky Hit: Up to a 20% chance to increase your Attack Speed by 40% of your Total Movement Speed for 6 seconds.
        if (vampiricPowerVal(nodes_map, 'ravenous')) {
          let Lucky_Hit_Rate = 0
          for (const Other_Skill in Pre_Sim_Node['skill_use_rate']) {
            Lucky_Hit_Rate +=
              0.2 *
              Pre_Sim_Node['skill_use_rate'][Other_Skill] *
              Pre_Sim_Node['cross_skill_stat'][Other_Skill][
                'total_hits'
              ] *
              Pre_Sim_Node['cross_skill_stat'][Other_Skill][
                'lucky_hit_chance'
              ]
          }
          Attack_Speed_Bonus_Total +=
            0.4 *
            statVal(nodes_map, 'Total_Movement_Speed') *
            Math.min(1, Lucky_Hit_Rate * 6)
        }

        // Vampiric Power moonrise
        // Hitting an enemy with a Basic Skill grants you 4% Attack Speed for 10 seconds, stacking up to 5 times. Upon reaching maximum stacks, you enter a Vampiric Bloodrage, gaining 160% Basic Skill damage and 15% Movement Speed for 10 seconds.
        if (vampiricPowerVal(nodes_map, 'moonrise')) {
          let Basic_Skill_Rate = 0
          const Basic_Skills = new Set([
            'frenzy',
            'lunging-strike',
            'bash',
            'flay',
          ])
          for (const Skill in Pre_Sim_Node['skill_use_rate']) {
            if (Basic_Skills.has(Skill)) {
              Basic_Skill_Rate +=
                Pre_Sim_Node['skill_use_rate'][Skill]
            }
          }
          if (Basic_Skill_Rate * 10 >= 1) {
            const Time_To_Vampiric_Bloodrage = 5 / Basic_Skill_Rate
            const Vampiric_Bloodrage_Uptime =
              10 / (Time_To_Vampiric_Bloodrage + 10)
            Attack_Speed_Bonus_Total +=
              0.2 * Vampiric_Bloodrage_Uptime +
              0.1 * (1 - Vampiric_Bloodrage_Uptime)
          } else {
            Attack_Speed_Bonus_Total +=
              0.04 * Math.min(1, Basic_Skill_Rate * 10)
          }
        }

        return Math.min(1, Attack_Speed_Bonus_Total)
      },
    ),

    Aspect_Attack_Speed_Bonus: new StatsNode(
      'Aspect_Attack_Speed_Bonus',
      () => {
        const Pre_Sim_Node = barbarianPresimVal(nodes_map)
        let Attack_Speed_Bonus_Total = 0

        // basic-attack-speed
        if (tagsVal(nodes_map).has('basic')) {
          Attack_Speed_Bonus_Total += aggregationVal(
            nodes_map,
            'basic-attack-speed',
          )
        }

        // Rapid-aspect: basic Skills gain +{15-30}% Attack Speed.
        if (
          aspectVal(nodes_map, 'rapid-aspect').length > 0 &&
          tagsVal(nodes_map).has('basic')
        ) {
          Attack_Speed_Bonus_Total += aspectVal(
            nodes_map,
            'rapid-aspect',
          )[0]
        }

        // Frenzy: If Frenzy hits an enemy, its Attack Speed is increased by +20% for 3 seconds, up to +60%.
        const Frenzy_Stacks = statVal(nodes_map, 'Frenzy_Stacks')
        if (currentSkillVal(nodes_map)['name'] == 'frenzy') {
          Attack_Speed_Bonus_Total += 0.2 * Frenzy_Stacks
        } else if (talentVal(nodes_map, 'battle-frenzy') > 0) {
          Attack_Speed_Bonus_Total +=
            0.05 *
            Frenzy_Stacks *
            statVal(nodes_map, 'Berserking_Uptime')
        }
        // (Unique) Battle Trance: Increase Frenzy's maximum stacks by 2. While you have maximum Frenzy, your other Skills gain +{35/45}% increased Attack Speed.
        if (
          aspectVal(nodes_map, 'battle-trance').length != 0 &&
          currentSkillVal(nodes_map)['name'] != 'frenzy' &&
          Frenzy_Stacks == 5
        ) {
          Attack_Speed_Bonus_Total += aspectVal(
            nodes_map,
            'battle-trance',
          )[0]
        }

        // Generic Aspect, Accelerating Aspect: Critical Strikes with Core Skills increase your Attack Speed by +[15 - 25]% for 3.0 seconds.
        if (aspectVal(nodes_map, 'accelerating-aspect').length != 0) {
          let Core_Critical_Rate = 0
          const Core_Skills = new Set([
            'whirlwind',
            'upheaval',
            'rend',
            'double-swing',
            'hammer-of-the-ancients',
          ])
          for (const Other_Skill in Pre_Sim_Node['skill_use_rate']) {
            if (Core_Skills.has(Other_Skill)) {
              Core_Critical_Rate +=
                Pre_Sim_Node['skill_use_rate'][Other_Skill] *
                Pre_Sim_Node['cross_skill_stat'][Other_Skill][
                  'critical_chance'
                ] *
                Pre_Sim_Node['cross_skill_stat'][Other_Skill][
                  'total_hits'
                ]
            }
          }
          Attack_Speed_Bonus_Total +=
            aspectVal(nodes_map, 'accelerating-aspect')[0] *
            Math.min(1, Core_Critical_Rate * 3)
        }

        // 1-H Sword Expertise: Killing a Crowd Controlled enemy grants 15% increased Attack Speed for 3 seconds. The increase is doubled if using two Swords
        if (
          statVal(nodes_map, 'Weapon_Type') == 0 &&
          statVal(nodes_map, 'Enemy_Crowd_Controlled') == 1
        ) {
          if (aggregationVal(nodes_map, 'main-hand-weapon') == 0) {
            Attack_Speed_Bonus_Total +=
              0.15 *
              Math.min(1, statVal(nodes_map, 'Enemy_Kill_Rate') * 3)
          }
          if (aggregationVal(nodes_map, 'off-hand-weapon') == 0) {
            Attack_Speed_Bonus_Total +=
              0.15 *
              Math.min(1, statVal(nodes_map, 'Enemy_Kill_Rate') * 3)
          }
        }

        // Warrior's Rupture Hitting enemies with Rupture increases your Attack Speed by 30%[+] for 5 seconds.
        if (
          'rupture' in Pre_Sim_Node['skill_use_rate'] &&
          talentVal(nodes_map, 'warriors-rupture') == 1
        ) {
          Attack_Speed_Bonus_Total +=
            0.4 *
            Math.min(5 * Pre_Sim_Node['skill_use_rate']['rupture'], 1)
        }

        // Prime Call of the Ancients: While Call of the Ancients is active, gain +20% bonus Attack Speed and x10% Increased Damage
        if (
          talentVal(nodes_map, 'prime-call-of-the-ancients') == 1 &&
          'call-of-the-ancients' in Pre_Sim_Node['skill_use_rate']
        ) {
          Attack_Speed_Bonus_Total +=
            0.2 *
            Math.min(
              1,
              Pre_Sim_Node['skill_use_rate']['call-of-the-ancients'] *
                6,
            )
        }

        // Duelist (Talent up to 3 points): Attack Speed is increased by +3% while using One Handed Weapons
        if (statVal(nodes_map, 'Weapon_Type') == 0) {
          Attack_Speed_Bonus_Total +=
            0.03 * talentVal(nodes_map, 'duelist')
        }

        // The 1-H Axe Expertise: Lucky Hit: Critical Strikes have up to a 55% chance to grant +0.6% increased Attack Speed for 2 seconds. Double the Attack Speed bonus when using two Axes.
        if (
          statVal(nodes_map, 'Weapon_Type') == 0 &&
          (aggregationVal(nodes_map, 'main-hand-weapon') == 1 ||
            aggregationVal(nodes_map, 'off-hand-weapon') == 1)
        ) {
          let One_Hand_Expertise_Rate = 0
          for (const Other_Skill in Pre_Sim_Node['skill_use_rate']) {
            One_Hand_Expertise_Rate +=
              0.55 *
              Pre_Sim_Node['skill_use_rate'][Other_Skill] *
              Pre_Sim_Node['cross_skill_stat'][Other_Skill][
                'critical_chance'
              ]
            Pre_Sim_Node['cross_skill_stat'][Other_Skill][
              'total_hits'
            ] *
              statVal(nodes_map, 'Total_Lucky_Hit_Chance_Multiplier')
          }
          if (aggregationVal(nodes_map, 'main-hand-weapon') == 1) {
            Attack_Speed_Bonus_Total +=
              0.006 * One_Hand_Expertise_Rate * 2
          }
          if (aggregationVal(nodes_map, 'off-hand-weapon') == 1) {
            Attack_Speed_Bonus_Total +=
              0.06 * One_Hand_Expertise_Rate * 2
          }
        }

        // Carnage: While Berserking, Critical Strikes increase your Attack Speed by +2%, up to +16%, for 6 seconds.
        // TODO Underestimates because doesn't consider hits multiplier
        if (paragonVal(nodes_map, 'carnage')) {
          let Berserking_Crit_Rate = 0
          for (const skill in Pre_Sim_Node['skill_use_rate']) {
            Berserking_Crit_Rate +=
              Pre_Sim_Node['skill_use_rate'][skill] *
              Pre_Sim_Node['cross_skill_stat'][skill][
                'critical_chance'
              ] *
              Pre_Sim_Node['cross_skill_stat'][skill]['total_hits'] *
              statVal(nodes_map, 'Berserking_Uptime')
          }
          if (Berserking_Crit_Rate > 0) {
            // If you can refresh fast enough, then you get max stacks.
            Attack_Speed_Bonus_Total +=
              0.02 *
              (Berserking_Crit_Rate * 6 > 1
                ? 8
                : Berserking_Crit_Rate * 6)
          }
        }

        // Shard of Dawn Aspect: After 30 seconds of Night's Grasp, gain Dawn's Haste, increasing your Attack Speed by [25-35]%[+] and Movement Speed by 20% for 12 seconds.
        //                       While empowered by the Midwinter Ward, killing an enemy reduces Night's Grasp duration by 1 second.
        if (aspectVal(nodes_map, 'shard-of-dawn-aspect').length > 0) {
          const Shard_of_Dawn_Uptime =
            12 /
            Math.max(12, 30 - statVal(nodes_map, 'Enemy_Kill_Rate'))
          Attack_Speed_Bonus_Total +=
            aspectVal(nodes_map, 'shard-of-dawn-aspect')[0] *
            Shard_of_Dawn_Uptime
        }

        return Math.min(1, Attack_Speed_Bonus_Total)
      },
    ),

    // Attack Speed Stats Node http://www.vhpg.com/diablo-4-attack-speed/
    Attack_Speed_Bonus: new StatsNode('Attack_Speed_Bonus', () => {
      // Formula = Weapon Speed Bonus * (Average Weapon Speed * Total Attack Speed Bonus)
      return (
        statVal(nodes_map, 'Aspect_Attack_Speed_Bonus') +
        statVal(nodes_map, 'Non_Aspect_Attack_Speed_Bonus')
      )
    }),

    // Attack Speed Stats Node http://www.vhpg.com/diablo-4-attack-speed/
    Total_Attack_Speed: new StatsNode('Total_Attack_Speed', () => {
      const Raw_Weapon_Attack_Speed = statVal(
        nodes_map,
        'Raw_Attack_Speed',
      ) // Can also be nodes_map["stat"]["Raw_Attack_Speed"]) but Non-Barbarian use 1 Weapon
      const Attack_Speed_Total =
        1 + statVal(nodes_map, 'Attack_Speed_Bonus')

      return Raw_Weapon_Attack_Speed * Attack_Speed_Total
    }),

    Overpower_Chance: new StatsNode('Overpower_Chance', () => {
      const Pre_Sim_Node = barbarianPresimVal(nodes_map)
      if (currentSkillVal(nodes_map)['tags'].has('channeled')) {
        // Channeled Skills Cannot Overpower
        return 0
      }
      let Overpower_Chance = 0.03

      // Talent 'combat-bash': After Critically Striking 4 times with Bash using a Two-Handed weapon, your next Core or Weapon Mastery Skill will Overpower.
      if (
        talentVal(nodes_map, 'combat-bash') > 0 &&
        allSkillsVal(nodes_map).has('bash') &&
        (tagsVal(nodes_map).has('core') ||
          tagsVal(nodes_map).has('weapon-mastery'))
      ) {
        let Bash_Critical_Rate = 0
        let Core_Weapon_Mastery_Rate = 0
        const Core_And_Weapon_Mastery_Skills = new Set([
          'upheaval',
          'rend',
          'double-swing',
          'hammer-of-the-ancients',
          'death-blow',
          'steel-grasp',
          'rupture',
        ])
        if ('bash' in Pre_Sim_Node['skill_use_rate']) {
          Bash_Critical_Rate =
            Pre_Sim_Node['skill_use_rate']['bash'] *
            Pre_Sim_Node['cross_skill_stat']['bash'][
              'critical_chance'
            ]
        }
        for (const Other_Skill in Pre_Sim_Node['skill_use_rate']) {
          if (Core_And_Weapon_Mastery_Skills.has(Other_Skill)) {
            Core_Weapon_Mastery_Rate +=
              Pre_Sim_Node['skill_use_rate'][Other_Skill]
          }
        }
        Overpower_Chance +=
          (1 - Overpower_Chance) *
          Math.min(
            1,
            Bash_Critical_Rate /
              (4 * Core_Weapon_Mastery_Rate + 0.0001),
          )
      }

      // Dominate: After not Overpowering for 30 seconds, your next attack will Overpower.
      if (
        paragonVal(nodes_map, 'dominate') &&
        currentSkillVal(nodes_map)['name'] in
          Pre_Sim_Node['skill_use_rate']
      ) {
        let Total_Skill_Use_Rate = 0
        for (const skill in Pre_Sim_Node['skill_use_rate']) {
          // Channeled skills can't overpower.
          if (skill != 'whirlwind') {
            Total_Skill_Use_Rate +=
              Pre_Sim_Node['skill_use_rate'][skill]
          }
        }
        const N = 30 * Total_Skill_Use_Rate
        // Need the expected number of attacks until we get N failed
        // Overpowers in a row. This is the same as the Martigale problem of 'How many coin flips
        // on average until we get N Heads in a row?' The answer is (2^N - 1)/ 2, but we generalize
        // here.
        const p = 1 - Overpower_Chance
        const T = (1 / p ** N - 1) / (1 - p)
        const alpha =
          Pre_Sim_Node['skill_use_rate'][
            currentSkillVal(nodes_map)['name']
          ] / Total_Skill_Use_Rate
        // - alpha * T is the expected number of attacks of the current_skill until we get
        //     N failed Overpowers in a row.
        // - alpha is also the chance the bonus is applied to current_skill
        // - skill already has Overpower_Chance chance to overpower so we multiply the additional
        //     probability by (1 - Overpower_Chance) = p
        Overpower_Chance += (1 / (alpha * T + 1)) * p * alpha
      }

      // Legendary Paragon 'bone-breaker':  Every 12 seconds, your next Skill is guaranteed to Overpower
      if (
        paragonVal(nodes_map, 'bone-breaker') &&
        Overpower_Chance != 0
      ) {
        let Overpower_Skill_Rate = 0
        const Time_To_Guarantee_Overpower = 12
        for (const Skill in Pre_Sim_Node['skill_use_rate']) {
          if (
            Pre_Sim_Node['cross_skill_stat'][Skill][
              'overpower_chance'
            ] > 0
          ) {
            Overpower_Skill_Rate +=
              Pre_Sim_Node['skill_use_rate'][Skill]
          }
        }
        if (Overpower_Skill_Rate > 0) {
          const Probability_Overpower_Guaranteed = Math.min(
            1 / Overpower_Skill_Rate / Time_To_Guarantee_Overpower,
            1,
          )
          Overpower_Chance +=
            (1 - Overpower_Chance) * Probability_Overpower_Guaranteed
        }
      }

      // Earthstriker's Aspect: After swapping weapons 8 times, your next non-basic attack will Overpower and deal [30-50]%[x] increased Overpower damage.
      if (
        aspectVal(nodes_map, 'earthstrikers-aspect').length > 0 &&
        Pre_Sim_Node['weapon_swap_rate'] > 0 &&
        !tagsVal(nodes_map).has('basic')
      ) {
        const Earthstriker_Aspect_Rate =
          Pre_Sim_Node['weapon_swap_rate'] / 8
        const Basic_Skills = new Set([
          'frenzy',
          'lunging-strike',
          'bash',
          'flay',
        ])
        let Non_Basic_Skill_Rate = 0
        for (const Skill in Pre_Sim_Node['skill_use_rate']) {
          if (!Basic_Skills.has(Skill)) {
            Non_Basic_Skill_Rate +=
              Pre_Sim_Node['skill_use_rate'][Skill]
          }
        }
        Overpower_Chance +=
          (1 - Overpower_Chance) *
          Math.min(Earthstriker_Aspect_Rate, Non_Basic_Skill_Rate)
      }

      // Vampiric Power blood-boil
      // When your Core Skills Overpower an enemy, you spawn 3 Volatile Blood Drops. Collecting a Volatile Blood Drop causes it to explode, dealing 60% Physical damage around you.
      // Every 20 seconds, your next Skill is guaranteed to Overpower.
      if (
        vampiricPowerVal(nodes_map, 'blood-boil') &&
        Overpower_Chance != 0
      ) {
        let Overpower_Skill_Rate = 0
        const Time_To_Guarantee_Overpower = 20
        for (const Skill in Pre_Sim_Node['skill_use_rate']) {
          if (
            Pre_Sim_Node['cross_skill_stat'][Skill][
              'overpower_chance'
            ] > 0
          ) {
            Overpower_Skill_Rate +=
              Pre_Sim_Node['skill_use_rate'][Skill]
          }
        }
        if (Overpower_Skill_Rate > 0) {
          const Probability_Overpower_Guaranteed =
            1 / Overpower_Skill_Rate / Time_To_Guarantee_Overpower
          Overpower_Chance +=
            (1 - Overpower_Chance) * Probability_Overpower_Guaranteed
        }
      }
      // Banished Lord's Talisman (Unique Generic Amulet): After you spend 300 of your Primary Resource, your next Core Skill is guaranteed to Overpower. Your Critical Strikes that Overpower deal 80-120% [x] increased damage.
      if (
        aspectVal(nodes_map, 'banished-lords-talisman').length > 0 &&
        tagsVal(nodes_map).has('core') &&
        Overpower_Chance != 0
      ) {
        let Resource_Spending_Rate = 0
        let Overpower_Skill_Rate = 0
        for (const Skill in Pre_Sim_Node['skill_use_rate']) {
          if (
            Pre_Sim_Node['cross_skill_stat'][Skill]['resource_cost'] <
            0
          ) {
            Resource_Spending_Rate -=
              Pre_Sim_Node['skill_use_rate'][Skill] *
              Pre_Sim_Node['cross_skill_stat'][Skill]['resource_cost']
          }
          if (
            Pre_Sim_Node['cross_skill_stat'][Skill][
              'overpower_chance'
            ] > 0
          ) {
            Overpower_Skill_Rate +=
              Pre_Sim_Node['skill_use_rate'][Skill]
          }
        }
        if (Overpower_Skill_Rate > 0 && Resource_Spending_Rate > 0) {
          const Time_To_Guarantee_Overpower =
            300 / Resource_Spending_Rate
          const Probability_Overpower_Guaranteed =
            1 / Overpower_Skill_Rate / Time_To_Guarantee_Overpower
          Overpower_Chance +=
            (1 - Overpower_Chance) * Probability_Overpower_Guaranteed
        }
      }

      return Math.min(1, Overpower_Chance)
    }),

    Overpower_Damage_Bonus: new StatsNode(
      'Overpower_Damage_Bonus',
      () => {
        const Base_Life = baseStatVal(nodes_map)['BaseMaxLife']
        const Max_Life = statVal(nodes_map, 'Max_Life')

        // Total_Willpower (Applies to all classes)
        let Overpower_Damage_Bonus =
          0.0025 * statVal(nodes_map, 'Total_Willpower')

        // overpower-damage
        Overpower_Damage_Bonus += aggregationVal(
          nodes_map,
          'overpower-damage',
        )

        // overpower-damage-with-two-handed-bludgeoning-weapons
        if (statVal(nodes_map, 'Weapon_Type') == 2) {
          Overpower_Damage_Bonus += aggregationVal(
            nodes_map,
            'overpower-damage-with-two-handed-bludgeoning-weapons',
          )
        }

        // Overpower attacks gain +1% damage per 1% of your Base Life you have in Fortify.
        Overpower_Damage_Bonus +=
          1 *
          (Max_Life / Base_Life) *
          Number(toggleVal(nodes_map, 'percent-fortify'))

        // Overpower attacks gain +1% damage per 1% of your Base Life that you have in bonus life above your Base Life.
        Overpower_Damage_Bonus +=
          (1 * (Max_Life - Base_Life)) / Base_Life

        return Overpower_Damage_Bonus
      },
    ),

    Overpower_Multiplier: new StatsNode(
      'Overpower_Multiplier',
      () => {
        let Overpower_Multiplier_Total =
          1 + 0.5 * Number(toggleVal(nodes_map, 'percent-life'))

        const Pre_Sim_Node = barbarianPresimVal(nodes_map)

        // Brute Force (Talent up to 3 points): Your Overpowers deal x8% increased damage when using a Two-Handed weapon
        if (
          statVal(nodes_map, 'Weapon_Type') == 1 ||
          statVal(nodes_map, 'Weapon_Type') == 2
        ) {
          Overpower_Multiplier_Total *=
            1 + 0.08 * talentVal(nodes_map, 'brute-force')
        }

        // Glyph Crusher: While wielding a Mace, you deal x30% increased Overpower damage.
        if (paragonVal(nodes_map, 'crusher')) {
          let Crusher_Multiplier = 1
          if (statVal(nodes_map, 'Weapon_Type') == 0) {
            if (
              aggregationVal(nodes_map, 'main-hand-weapon') == 2 ||
              aggregationVal(nodes_map, 'off-hand-weapon') == 2
            ) {
              Crusher_Multiplier += 0.3
            }
          } else if (statVal(nodes_map, 'Weapon_Type') == 2) {
            Crusher_Multiplier += 0.3
          }
          Overpower_Multiplier_Total *= Crusher_Multiplier
        }

        // Earthstriker's Aspect: After swapping weapons 8 times, your next non-basic attack will Overpower and deal [30-50]%[x] increased Overpower damage.
        if (
          aspectVal(nodes_map, 'earthstrikers-aspect').length > 0 &&
          Pre_Sim_Node['weapon_swap_rate'] > 0 &&
          !tagsVal(nodes_map).has('basic')
        ) {
          const Earthstriker_Aspect_Rate =
            Pre_Sim_Node['weapon_swap_rate'] / 8
          const Basic_Skills = new Set([
            'frenzy',
            'lunging-strike',
            'bash',
            'flay',
          ])
          let Non_Basic_Skill_Rate = 0
          let Overpower_Rate = 0
          for (const Skill in Pre_Sim_Node['skill_use_rate']) {
            if (!Basic_Skills.has(Skill)) {
              Non_Basic_Skill_Rate +=
                Pre_Sim_Node['skill_use_rate'][Skill]
            }
            Overpower_Rate +=
              Pre_Sim_Node['skill_use_rate'][Skill] *
              Pre_Sim_Node['cross_skill_stat'][Skill][
                'overpower_chance'
              ]
          }

          Overpower_Multiplier_Total *=
            1 +
            aspectVal(nodes_map, 'earthstrikers-aspect')[0] *
              Math.min(
                1,
                Math.min(
                  Earthstriker_Aspect_Rate,
                  Non_Basic_Skill_Rate,
                ) / Overpower_Rate,
              )
        }

        return Overpower_Multiplier_Total
      },
    ),

    Weapon_Expertise_Multiplier: new StatsNode(
      'Weapon_Expertise_Multiplier',
      () => {
        // 1-Handed Mace Expertise: 10% increased damage to Stunned enemies. Doubles the effect when using two Maces.
        let One_Hand_Mace_Expertise_Damage_Multiplier = 1
        if (
          statVal(nodes_map, 'Weapon_Type') == 0 &&
          toggleVal(nodes_map, 'enemy-stunned') &&
          expertiseVal(nodes_map) != 'mace'
        ) {
          if (aggregationVal(nodes_map, 'main-hand-weapon') == 2) {
            One_Hand_Mace_Expertise_Damage_Multiplier +=
              0.1 * statVal(nodes_map, 'Enemy_Boss_CC_Adjustment')
          }
          if (aggregationVal(nodes_map, 'off-hand-weapon') == 2) {
            One_Hand_Mace_Expertise_Damage_Multiplier +=
              0.1 * statVal(nodes_map, 'Enemy_Boss_CC_Adjustment')
          }
        } else if (
          expertiseVal(nodes_map) == 'mace' &&
          toggleVal(nodes_map, 'enemy-stunned')
        ) {
          One_Hand_Mace_Expertise_Damage_Multiplier +=
            0.2 * statVal(nodes_map, 'Enemy_Boss_CC_Adjustment')
        }

        // 2-Handed Axe Expertise: 15.0% increased damage to Vulnerable enemies.
        let Two_Hand_Axe_Expertise_Damage_Multiplier = 1
        if (
          ((statVal(nodes_map, 'Weapon_Type') == 1 &&
            aggregationVal(nodes_map, 'two-hand-slashing-weapon') ==
              1) ||
            expertiseVal(nodes_map) == 'two-handed-axe') &&
          statVal(nodes_map, 'Enemy_Vulnerable') > 0
        ) {
          Two_Hand_Axe_Expertise_Damage_Multiplier +=
            0.15 * statVal(nodes_map, 'Enemy_Vulnerable')
        }

        // Polearm Expertise: You deal x10% increased damage while Healthy.
        let Polearm_Expertise_Damage_Multipler = 1
        if (
          statVal(nodes_map, 'Weapon_Type') == 1 &&
          aggregationVal(nodes_map, 'two-hand-slashing-weapon') ==
            2 &&
          Number(toggleVal(nodes_map, 'percent-life')) >= 0.8
        ) {
          Polearm_Expertise_Damage_Multipler += 0.1
        }

        return (
          One_Hand_Mace_Expertise_Damage_Multiplier *
          Two_Hand_Axe_Expertise_Damage_Multiplier *
          Polearm_Expertise_Damage_Multipler
        )
      },
    ),

    // Aspects can be multiplicative with Damage from any source.
    Generic_Aspect_Damage_Multiplier: new StatsNode(
      'Generic_Aspect_Damage_Multiplier',
      () => {
        let Aspect_Damage_Multiplier = 1
        const number_of_enemies = Number(
          toggleVal(nodes_map, 'number-of-enemies'),
        )
        const Pre_Sim_Node = barbarianPresimVal(nodes_map)
        // Earthquake Aspect: Ground Stomp creates an Earthquake damaging enemies for {195/380} Physical damage over 4 seconds.
        //                    While standing in Earthquakes, you deal x{5/15}% increased damage.
        if (
          aspectVal(nodes_map, 'earthquake-aspect').length != 0 &&
          allSkillsVal(nodes_map).has('ground-stomp')
        ) {
          // Needs to scale Ground Slam  CD
          const Ground_Stomp_Cooldown = skillVal(
            nodes_map,
            'ground-stomp',
          ).cooldown_seconds
          Aspect_Damage_Multiplier *=
            1 +
            aspectVal(nodes_map, 'earthquake-aspect')[1] *
              statVal(nodes_map, 'Earthquake_Uptime')
        }

        // Conceited-aspect: Deal x{15-25}% increased damage while you have a Barrier active.
        if (
          aspectVal(nodes_map, 'conceited-aspect').length != 0 &&
          Number(toggleVal(nodes_map, 'percent-barrier')) != 0
        ) {
          Aspect_Damage_Multiplier *=
            1 + aspectVal(nodes_map, 'conceited-aspect')[0]
        }

        // Aspect of Pummeling: "Deal {} increased damage to Stunned, knocked Down, and Frozen enemies.",
        if (
          aspectVal(nodes_map, 'aspect-of-pummeling').length != 0 &&
          (toggleVal(nodes_map, 'enemy-stunned') ||
            toggleVal(nodes_map, 'enemy-knocked-down') ||
            toggleVal(nodes_map, 'enemy-frozen'))
        ) {
          Aspect_Damage_Multiplier *=
            1 +
            aspectVal(nodes_map, 'aspect-of-pummeling')[0] *
              statVal(nodes_map, 'Enemy_Boss_CC_Adjustment')
        }

        // aspect-of-Retribution: Distant enemies have a 8.0% chance to be Stunned for 2.0 seconds when they hit you. You deal x{10/20}% increased damage to Stunned enemies.
        if (
          aspectVal(nodes_map, 'aspect-of-retribution').length != 0 &&
          toggleVal(nodes_map, 'enemy-stunned')
        ) {
          Aspect_Damage_Multiplier *=
            1 +
            aspectVal(nodes_map, 'aspect-of-retribution')[0] *
              statVal(nodes_map, 'Enemy_Boss_CC_Adjustment')
        }

        // aspect-of-Inner-Calm: Deal x{5/10}% increased damage for each second you stand still, up to x30.0%.
        if (
          aspectVal(nodes_map, 'aspect-of-inner-calm').length != 0
        ) {
          Aspect_Damage_Multiplier *= 1.3
        }

        // (Unique) Penitent-Greaves: You leave behind a trail of frost that chills enemies. You deal x{7/10}% more damage to chilled enemies.
        if (aspectVal(nodes_map, 'penitent-greaves').length != 0) {
          let Penitent_Greaves_Chill_Adjustment = 0
          if (statVal(nodes_map, 'Enemy_Chilled') == 1) {
            Penitent_Greaves_Chill_Adjustment = statVal(
              nodes_map,
              'Enemy_Boss_CC_Adjustment',
            )
          } else {
            Penitent_Greaves_Chill_Adjustment +=
              Math.min(
                1,
                15 ** 2 / statVal(nodes_map, 'Enemy_Spread') ** 2,
              ) * statVal(nodes_map, 'Enemy_Boss_CC_Adjustment')
          }

          Aspect_Damage_Multiplier *=
            1 +
            aspectVal(nodes_map, 'penitent-greaves')[0] *
              Penitent_Greaves_Chill_Adjustment
        }

        // Godslayer Crown (Generic Unique Helm): When you Stun, Freeze, or Immobilize an Elite enemy, or damage a Boss, it pulls in nearby enemies.
        // You deal 30-60% [x] increased damage to them for 3 seconds. This effect can only occur once every 12 seconds.
        if (
          aspectVal(nodes_map, 'godslayer-crown').length > 0 &&
          (toggleVal(nodes_map, 'enemy-stunned') ||
            toggleVal(nodes_map, 'enemy-frozen') ||
            toggleVal(nodes_map, 'enemy-immobilized') ||
            toggleVal(nodes_map, 'enemy-boss'))
        ) {
          Aspect_Damage_Multiplier *=
            1 +
            0.25 *
              aspectVal(nodes_map, 'godslayer-crown')[0] *
              statVal(nodes_map, 'Enemy_Boss_CC_Adjustment')
        }

        // Ancients Oath Unique: Steel Grasp launches 2 additional chains. Enemies that have been pulled by Steel Grasp take x30-x50% bonus damage from you for 3 seconds.
        if (
          aspectVal(nodes_map, 'ancients-oath').length > 0 &&
          allSkillsVal(nodes_map).has('steel-grasp') &&
          'steel-grasp' in Pre_Sim_Node['skill_use_rate']
        ) {
          const Steel_Grasp_Hits =
            1 +
            ProbabilityInCone(
              30,
              1 / 4,
              statVal(nodes_map, 'Enemy_Spread'),
            ) *
              (number_of_enemies - 1)
          const Steel_Grasp_Debuff_Uptime = Math.min(
            1,
            (3 *
              (1 / statVal(nodes_map, 'Steel_Grasp_Cooldown')) *
              Steel_Grasp_Hits) /
              number_of_enemies,
          )
          Aspect_Damage_Multiplier *=
            1 +
            aspectVal(nodes_map, 'ancients-oath')[0] *
              Steel_Grasp_Debuff_Uptime *
              statVal(nodes_map, 'Enemy_Boss_CC_Adjustment')
        }

        // Tuskhelm of Joritz the Mighty (Barbarian Unique Helm): When you gain Berserking while already Berserk, you have a 40-60% chance to become more enraged granting 15% (multiplicative damage) [x] increased damage, 2 Fury per second, and 10% Cooldown Reduction.
        if (
          aspectVal(nodes_map, 'tuskhelm-of-joritz-the-mighty')
            .length != 0 &&
          toggleVal(nodes_map, 'berserking')
        ) {
          Aspect_Damage_Multiplier *= 1.15
        }

        // Tibault's Will (Generic Unique Pants): You deal 20-40% [x] increased damage while Unstoppable and for 4 seconds after. When you become Unstoppable, gain 50 of your Primary Resource.
        if (aspectVal(nodes_map, 'tibaults-will').length != 0) {
          let Tibaults_Will_Uptime = 0

          if (allSkillsVal(nodes_map).has('wrath-of-the-berserker')) {
            Tibaults_Will_Uptime +=
              9 /
              statVal(nodes_map, 'Wrath_Of_The_Berserker_Cooldown')
          }

          // Vampiric Power metamorphosis
          // When you Evade you turn into a cloud of bats, becoming Unstoppable for 4 seconds. Enemies along your path take 160% Physical damage and are inflicted with Vampiric Curse.
          if (vampiricPowerVal(nodes_map, 'metamorphosis')) {
            Tibaults_Will_Uptime += 4 / 5
          }

          // Aspect of the Iron Warrior: Iron Skin grants Unstoppable, and {18/28}% Damage Reduction.
          if (
            allSkillsVal(nodes_map).has('iron-skin') &&
            aspectVal(nodes_map, 'aspect-of-the-iron-warrior')
              .length != 0
          ) {
            Tibaults_Will_Uptime +=
              9 / statVal(nodes_map, 'Iron_Skin_Cooldown')
          }

          // Eluding-aspect: Becoming Injured while Crowd Controlled grants you Unstoppable for 4.0 seconds. This effect has a {20/40} second Cooldown.
          if (
            aspectVal(nodes_map, 'eluding-aspect').length != 0 &&
            Number(toggleVal(nodes_map, 'percent-life')) <= 0.35
          ) {
            Tibaults_Will_Uptime += 8 / 20
          }

          Aspect_Damage_Multiplier *=
            1 +
            aspectVal(nodes_map, 'tibaults-will')[0] *
              Math.min(1, Tibaults_Will_Uptime)
        }

        // Vampiric Power domination
        // You deal 24% increased damage to enemies who are Stunned, Immobilized, Frozen, or Feared. If they're also Injured and not an Elite, they're instantly killed.
        if (vampiricPowerVal(nodes_map, 'domination')) {
          if (
            toggleVal(nodes_map, 'enemy-stunned') ||
            toggleVal(nodes_map, 'enemy-immobilized') ||
            toggleVal(nodes_map, 'enemy-frozen') ||
            toggleVal(nodes_map, 'enemy-feared')
          ) {
            Aspect_Damage_Multiplier *=
              1 +
              0.24 * statVal(nodes_map, 'Enemy_Boss_CC_Adjustment')
          }
        }

        // Vampiric Power prey-on-the-weak
        // You deal 16%[x] increased damage to Vulnerable enemies. Enemies are Vulnerable while affected by a Vampiric Curse from your other Vampiric Powers.
        if (
          vampiricPowerVal(nodes_map, 'prey-on-the-weak') &&
          toggleVal(nodes_map, 'enemy-vulnerable')
        ) {
          Aspect_Damage_Multiplier *= 1.16
        }

        return Aspect_Damage_Multiplier
      },
    ),

    // Aspects can be multiplicative with Damage from a skill.
    Skill_Aspect_Damage_Multiplier: new StatsNode(
      'Skill_Aspect_Damage_Multiplier',
      () => {
        const Pre_Sim_Node = barbarianPresimVal(nodes_map)
        let Aspect_Damage_Multiplier = 1

        if (aspectVal(nodes_map, 'fists-of-fate').length > 0) {
          Aspect_Damage_Multiplier *=
            aspectVal(nodes_map, 'fists-of-fate')[0] / 2
        }

        // Aspect of Ancestral Echoes: Lucky Hit: Damaging enemies with Leap, Upheaval, or Whirlwind has up to a {50/60}% chance to summon an Ancient to perform the same Skill. Can only happen once every 5.0 seconds.
        const Ancestral_Echo_Skills = new Set([
          'leap',
          'upheaval',
          'whirlwind',
        ])
        if (
          aspectVal(nodes_map, 'aspect-of-ancestral-echoes').length !=
            0 &&
          Ancestral_Echo_Skills.has(
            currentSkillVal(nodes_map)['name'],
          )
        ) {
          let Ancestral_Echo_Rate = 0
          for (const Skill in Pre_Sim_Node['skill_use_rate']) {
            if (Ancestral_Echo_Skills.has(Skill)) {
              Ancestral_Echo_Rate +=
                Pre_Sim_Node['skill_use_rate'][Skill] *
                Pre_Sim_Node['cross_skill_stat'][Skill][
                  'total_hits'
                ] *
                Pre_Sim_Node['cross_skill_stat'][Skill][
                  'lucky_hit_chance'
                ] *
                aspectVal(nodes_map, 'aspect-of-ancestral-echoes')[0]
            }
          }

          Aspect_Damage_Multiplier *=
            1 +
            statVal(nodes_map, 'Total_Lucky_Hit_Chance_Multiplier') *
              statVal(nodes_map, 'Total_Hits') *
              aspectVal(nodes_map, 'aspect-of-ancestral-echoes')[0]
          Math.min(1, 0.2 / Ancestral_Echo_Rate)
        }

        // Veteran Brawler's Aspect: Each time a Core Skill deals direct damage to an enemy, your next Charge or Leap deals x{6/8}% increased damage, up to x{30/40}%.
        if (
          aspectVal(nodes_map, 'veteran-brawlers-aspect').length >
            0 &&
          (currentSkillVal(nodes_map)['name'] == 'charge' ||
            currentSkillVal(nodes_map)['name'] == 'leap')
        ) {
          const Current_Skill_Name =
            currentSkillVal(nodes_map)['name']

          if (Current_Skill_Name in Pre_Sim_Node['skill_use_rate']) {
            let Core_Use_Rate = 0
            let Charge_Use_Rate = 0
            let Leap_Use_Rate = 0
            for (const skill_name in Pre_Sim_Node['skill_use_rate']) {
              const Skill_Node = skillVal(nodes_map, skill_name)
              if (Skill_Node['tags'].has('core')) {
                Core_Use_Rate +=
                  Pre_Sim_Node['skill_use_rate'][skill_name]
              }
              if (skill_name == 'charge') {
                Charge_Use_Rate +=
                  Pre_Sim_Node['skill_use_rate'][skill_name]
              }
              if (skill_name == 'leap') {
                Leap_Use_Rate +=
                  Pre_Sim_Node['skill_use_rate'][skill_name]
              }
            }

            let Veteran_Brawler_Stacks = 0
            // Tricky case, if we buff it too much we will end up using it on cooldown which makes the rate inaccurate.
            // Trying 10 to see if it gets used.
            if (Charge_Use_Rate + Leap_Use_Rate == 0) {
              Veteran_Brawler_Stacks = 10
            } else {
              Veteran_Brawler_Stacks = Math.min(
                Core_Use_Rate / (Charge_Use_Rate + Leap_Use_Rate),
                15,
              )
            }
            let Current_Skill_Benefit_Probability = 1
            if (
              'charge' in Pre_Sim_Node['skill_use_rate'] &&
              'leap' in Pre_Sim_Node['skill_use_rate']
            ) {
              if (Charge_Use_Rate + Leap_Use_Rate == 0) {
                Current_Skill_Benefit_Probability = 0.5
              } else if (Current_Skill_Name == 'charge') {
                Current_Skill_Benefit_Probability =
                  Charge_Use_Rate / (Charge_Use_Rate + Leap_Use_Rate)
              } else {
                Current_Skill_Benefit_Probability =
                  Leap_Use_Rate / (Charge_Use_Rate + Leap_Use_Rate)
              }
            }

            Aspect_Damage_Multiplier *=
              1 +
              Current_Skill_Benefit_Probability *
                Veteran_Brawler_Stacks *
                aspectVal(nodes_map, 'veteran-brawlers-aspect')[0]
          }
        }

        // (Unique) Ramaladni's Magnum Opus: Skills using this weapon deal x{.2-.4}% increased damage per point of Fury you have, but you lose 2.0 Fury every second.
        if (
          aspectVal(nodes_map, 'ramaladnis-magnum-opus').length > 0 &&
          statVal(nodes_map, 'Weapon_Type') == 0
        ) {
          let Resource_Spending_Rate = 0
          let Resource_Gain_Rate = 0
          for (const Skill in Pre_Sim_Node['skill_use_rate']) {
            Resource_Gain_Rate +=
              Pre_Sim_Node['skill_use_rate'][Skill] *
              Pre_Sim_Node['cross_skill_stat'][Skill]['resource_gain']
            if (
              Pre_Sim_Node['cross_skill_stat'][Skill][
                'resource_cost'
              ] < 0
            ) {
              Resource_Spending_Rate -=
                Pre_Sim_Node['skill_use_rate'][Skill] *
                Pre_Sim_Node['cross_skill_stat'][Skill][
                  'resource_cost'
                ]
            }
          }
          if (Resource_Spending_Rate != 0) {
            Aspect_Damage_Multiplier *=
              1 +
              (aspectVal(nodes_map, 'ramaladnis-magnum-opus')[0] *
                statVal(nodes_map, 'Max_Resource')) /
                2
          } else if (
            Resource_Spending_Rate == 0 &&
            Resource_Gain_Rate >= 2
          ) {
            Aspect_Damage_Multiplier *=
              1 +
              aspectVal(nodes_map, 'ramaladnis-magnum-opus')[0] *
                statVal(nodes_map, 'Max_Resource')
          }
        }

        // Aspect of the Expectant: Attacking enemies with a Basic Skill increases the damage of your next Core Skill cast by [5-10][x], up to [30]%[x].
        if (
          aspectVal(nodes_map, 'aspect-of-the-expectant').length !=
            0 &&
          currentSkillVal(nodes_map)['category'] == 'core'
        ) {
          let Basic_Skill_Rate = 0
          let Core_Skill_Rate = 0
          for (const Other_Skill in Pre_Sim_Node['skill_use_rate']) {
            if (
              skillVal(nodes_map, Other_Skill)['category'] == 'basic'
            ) {
              Basic_Skill_Rate +=
                Pre_Sim_Node['skill_use_rate'][Other_Skill]
            }
            if (
              skillVal(nodes_map, Other_Skill)['category'] == 'core'
            ) {
              Core_Skill_Rate +=
                Pre_Sim_Node['skill_use_rate'][Other_Skill]
            }
          }
          Aspect_Damage_Multiplier *=
            1 +
            Math.min(
              0.3,

              aspectVal(nodes_map, 'aspect-of-the-expectant')[0] *
                (Basic_Skill_Rate / (Core_Skill_Rate + 0.00001)),
            )
        }

        // aspect-of-ancestral-force: Hammer of the Ancients quakes outward and its damage is increased by 5-15%.
        if (
          aspectVal(nodes_map, 'aspect-of-ancestral-force').length !=
            0 &&
          currentSkillVal(nodes_map)['name'] ==
            'hammer-of-the-ancients'
        ) {
          Aspect_Damage_Multiplier *=
            1 + aspectVal(nodes_map, 'aspect-of-ancestral-force')[0]
        }

        // Aspect of Encroaching Wrath: After spending 100.0 Fury, your next Weapon Mastery Skill within 5 seconds deals x{40/60}% increased damage.
        if (
          aspectVal(nodes_map, 'aspect-of-encroaching-wrath').length >
            0 &&
          tagsVal(nodes_map).has('weapon-mastery') &&
          currentSkillVal(nodes_map)['name'] in
            Pre_Sim_Node['skill_use_rate']
        ) {
          let Fury_Spent_Per_Second = 0
          let Weapon_Mastery_Skill_Rate = 0
          for (const skill in Pre_Sim_Node['skill_use_rate']) {
            const Skill_Node = skillVal(nodes_map, skill)
            if (Skill_Node['tags'].has('weapon-mastery')) {
              Weapon_Mastery_Skill_Rate +=
                Pre_Sim_Node['skill_use_rate'][skill]
            }
            Fury_Spent_Per_Second +=
              -Math.min(
                Pre_Sim_Node['cross_skill_stat'][skill][
                  'resource_cost'
                ],
                0,
              ) * Pre_Sim_Node['skill_use_rate'][skill]
          }
          // Time per proc.
          const T = 100 / (Fury_Spent_Per_Second + 0.001)
          // Current skill attacks per proc.
          const N =
            T *
            Pre_Sim_Node['skill_use_rate'][
              currentSkillVal(nodes_map)['name']
            ]
          // Chance that this skill gets the buff.
          const alpha =
            Pre_Sim_Node['skill_use_rate'][
              currentSkillVal(nodes_map)['name']
            ] / Weapon_Mastery_Skill_Rate

          Aspect_Damage_Multiplier *=
            1 +
            (alpha / (N + 1)) *
              aspectVal(nodes_map, 'aspect-of-encroaching-wrath')[0]
        }

        // Edgemaster's-aspect: Skills deal up to x{10-20}% increased damage based on your available Primary Resource when cast, receiving the maximum benefit while you have full Primary Resource.
        if (aspectVal(nodes_map, 'edgemasters-aspect').length > 0) {
          Aspect_Damage_Multiplier *=
            1 + aspectVal(nodes_map, 'edgemasters-aspect')[0]
        }

        // Aspect of Limitless Rage: Each point of Fury you generate while at Maximum Fury grants your next Core Skill x{2/4}% increased damage, up to x{60/120}%.
        if (
          aspectVal(nodes_map, 'aspect-of-limitless-rage').length >
            0 &&
          tagsVal(nodes_map).has('core')
        ) {
          Aspect_Damage_Multiplier *=
            1 + aspectVal(nodes_map, 'aspect-of-limitless-rage')[1]
        }

        // Vampiric Power 'anticipation'
        // Your Ultimate Skills gain 20% Cooldown Reduction. Your Ultimate Skills gain 12%[x] increased damage for each nearby enemy affected by your Damage Over Time effects.
        if (
          tagsVal(nodes_map).has('ultimate') &&
          vampiricPowerVal(nodes_map, 'anticipation')
        ) {
          Aspect_Damage_Multiplier *=
            1 +
            0.12 *
              Pre_Sim_Node['dot_uptime'] *
              Math.min(
                1,
                10 ** 2 / statVal(nodes_map, 'Enemy_Spread') ** 2,
              )
        }

        // Vampiric Power bathe-in-blood
        // While Channeling a Skill, you form a pool of blood beneath you. While channeling a skill in a pool, your Channeled Skills deal 40% increased damage and you gain 30% Damage Reduction. A pool can only form once every 8 seconds.
        if (
          vampiricPowerVal(nodes_map, 'bathe-in-blood') &&
          currentSkillVal(nodes_map)['name'] == 'whirlwind' &&
          'whirlwind' in Pre_Sim_Node['skill_use_rate']
        ) {
          Aspect_Damage_Multiplier *= 1.4
        }

        // Vampiric Power moonrise
        // Hitting an enemy with a Basic Skill grants you 4% Attack Speed for 10 seconds, stacking up to 5 times. Upon reaching maximum stacks, you enter a Vampiric Bloodrage, gaining 160% Basic Skill damage and 15% Movement Speed for 10 seconds.
        if (
          vampiricPowerVal(nodes_map, 'moonrise') &&
          tagsVal(nodes_map).has('basic')
        ) {
          let Basic_Skill_Rate = 0
          const Basic_Skills = new Set([
            'frenzy',
            'lunging-strike',
            'bash',
            'flay',
          ])
          for (const Skill in Pre_Sim_Node['skill_use_rate']) {
            if (Basic_Skills.has(Skill)) {
              Basic_Skill_Rate +=
                Pre_Sim_Node['skill_use_rate'][Skill]
            }
          }
          if (Basic_Skill_Rate * 10 >= 1) {
            const Time_To_Vampiric_Bloodrage = 5 / Basic_Skill_Rate
            const Vampiric_Bloodrage_Uptime =
              10 / (Time_To_Vampiric_Bloodrage + 10)
            Aspect_Damage_Multiplier *=
              1 + 1.6 * Vampiric_Bloodrage_Uptime
          }
        }

        // Vampiric Power feed-the-coven
        // Lucky Hit: Conjuration, Companion, Minion and Bat Familiar attacks have up to a 60% chance to restore 10 Primary Resource to you and increase your Damage by 10% for 4 seconds.
        if (vampiricPowerVal(nodes_map, 'feed-the-coven')) {
          const Minion_Lucky_Hit_Chance = 0.3 // completely made up value taken from bat stun chance on another vampiric power
          Aspect_Damage_Multiplier *=
            1 +
            0.1 *
              Math.min(
                1,
                statVal(nodes_map, 'Vampiric_Bat_Rate') *
                  Minion_Lucky_Hit_Chance *
                  4,
              )
        }

        return Aspect_Damage_Multiplier
      },
    ),

    // Talents can be multiplicative with Damage
    Generic_Talent_Damage_Multiplier: new StatsNode(
      'Generic_Talent_Damage_Multiplier',
      () => {
        const Pre_Sim_Node = barbarianPresimVal(nodes_map)

        let Talent_Damage_Multiplier = 1

        const number_of_enemies = Number(
          toggleVal(nodes_map, 'number-of-enemies'),
        )
        const enemy_spread = Number(
          statVal(nodes_map, 'Enemy_Spread'),
        )

        // Tears of Blood Glyph
        Talent_Damage_Multiplier *=
          1 + aggregationVal(nodes_map, 'damage-')

        let War_Cry_Multiplier = 1
        if (allSkillsVal(nodes_map).has('war-cry')) {
          const Shout_Cooldown = statVal(nodes_map, 'Shout_Cooldown')
          const Shout_Duration_Mulipliter = statVal(
            nodes_map,
            'Shout_Duration_Multiplier',
          )
          War_Cry_Multiplier =
            1.15 +
            0.015 *
              (talentVal(nodes_map, 'war-cry') - 1) *
              Math.min(
                (6 * Shout_Duration_Mulipliter) / Shout_Cooldown,
                1,
              )

          // Power War Cry: If at least 6 enemies are Nearby when you cast War Cry, your damage bonus is increased by an additional 10%[+]
          if (talentVal(nodes_map, 'power-war-cry') > 0) {
            const p = Math.min(15 ** 2 / enemy_spread ** 2, 1)
            const number_of_needed_hits =
              5 + Number(toggleVal(nodes_map, 'enemy-distant'))
            // Same Talent Point Scaling as Normal Warcry but has a flat 10% Bonus
            War_Cry_Multiplier +=
              0.1 *
              (1 -
                BinomialDistribution(
                  number_of_enemies - 1,
                  p,
                  number_of_needed_hits - 1,
                )) *
              Math.min(6 / Shout_Cooldown, 1)
          }
          Talent_Damage_Multiplier *= War_Cry_Multiplier
        }

        // Pit Fighter (Talent up to 3 points): You deal x3% increased damage to Close Enemies and gain 2% Distant Damage Reduction
        if (!toggleVal(nodes_map, 'enemy-distant')) {
          Talent_Damage_Multiplier *=
            1 + 0.03 * talentVal(nodes_map, 'pit-fighter')
        }

        // Slaying Strike (Talent up to 3 points): You deal x7.5% increased damage against injured enemies
        Talent_Damage_Multiplier *=
          1 +
          (0.075 * talentVal(nodes_map, 'slaying-strike') * 0.35) /
            (1 +
              0.075 * talentVal(nodes_map, 'slaying-strike') * 0.65)

        // Counteroffensive (Talent up to 3 points): While you have Fortify for over 50% of your Maximum life, you deal x4% increased damage
        if (Number(toggleVal(nodes_map, 'percent-fortify')) >= 0.5) {
          Talent_Damage_Multiplier *=
            1 + 0.04 * talentVal(nodes_map, 'counteroffensive')
        }

        // Prime Call of the Ancients: While Call of the Ancients is active, gain +20% bonus Attack Speed and x10% Increased Damage
        if (
          talentVal(nodes_map, 'prime-call-of-the-ancients') == 1 &&
          'call-of-the-ancients' in Pre_Sim_Node['skill_use_rate']
        ) {
          Talent_Damage_Multiplier *=
            1 +
            0.1 *
              Math.min(
                1,
                Pre_Sim_Node['skill_use_rate'][
                  'call-of-the-ancients'
                ] * 6,
              )
        }

        // Walking Arsenal: Dealing Damage with a Two-Handed Bludgeoning, Two-Handed Slashing, or Dual Wielded weapon grants x10% increased damage for 10 seconds.  While all three damage bonuses are active, you gain an additional x20% increased damage and attack speed.
        if (talentVal(nodes_map, 'walking-arsenal') == 1) {
          Talent_Damage_Multiplier *=
            1 +
            0.2 *
              Math.min(
                1,
                statVal(
                  nodes_map,
                  'Walking_Arsenal_DualWield_Uptime',
                ) *
                  statVal(
                    nodes_map,
                    'Walking_Arsenal_TwoHand_Slashing_Uptime',
                  ) *
                  statVal(
                    nodes_map,
                    'Walking_Arsenal_TwoHand_Bludgeon_Uptime',
                  ),
              )
        }

        // Violent Hammer of the Ancients: After Overpowering with Hammer of the Ancients, you deal x30% more damage for 2 seconds.
        if (
          'hammer-of-the-ancients' in
            Pre_Sim_Node['skill_use_rate'] &&
          talentVal(nodes_map, 'violent-hammer-of-the-ancients') == 1
        ) {
          Talent_Damage_Multiplier *=
            1 +
            0.3 *
              Pre_Sim_Node['skill_use_rate'][
                'hammer-of-the-ancients'
              ] *
              Pre_Sim_Node['cross_skill_stat'][
                'hammer-of-the-ancients'
              ]['overpower_chance'] *
              2
        }
        // Glyph 'rumble', You deal 10%[x] increased damage to Bosses and Crowd Controlled enemies for each active Earthquake.
        if (
          paragonVal(nodes_map, 'rumble') &&
          statVal(nodes_map, 'Earthquake_Uptime') > 0 &&
          (toggleVal(nodes_map, 'enemy-boss') ||
            statVal(nodes_map, 'Enemy_Crowd_Controlled') > 0)
        ) {
          let Earthquake_Rate = 0

          // Aspect of Bul-Kathos: Leap creates an Earthquake that deals {195/380} Physical damage over 4 seconds. While standing in Earthquakes, you gain {5/15}% increased Damage Reduction.
          if (
            aspectVal(nodes_map, 'aspect-of-bul-kathos').length !=
              0 &&
            'leap' in Pre_Sim_Node['skill_use_rate']
          ) {
            Earthquake_Rate +=
              4 * Pre_Sim_Node['skill_use_rate']['leap']
          }

          // Earthquake Aspect: Ground Stomp creates an Earthquake damaging enemies for {195/380} Physical damage over 4 seconds. While standing in Earthquakes, you deal x{5/15}% increased damage.
          if (
            aspectVal(nodes_map, 'earthquake-aspect').length != 0 &&
            allSkillsVal(nodes_map).has('ground-stomp')
          ) {
            Earthquake_Rate +=
              4 * (1 / statVal(nodes_map, 'Ground_Stomp_Cooldown'))
          }

          if (
            statVal(nodes_map, 'Enemy_Crowd_Controlled') > 0 &&
            !toggleVal(nodes_map, 'enemy-boss')
          ) {
            Talent_Damage_Multiplier *=
              1 +
              0.1 *
                Earthquake_Rate *
                statVal(nodes_map, 'Enemy_Boss_CC_Adjustment')
          } else if (
            statVal(nodes_map, 'Enemy_Crowd_Controlled') > 0 &&
            toggleVal(nodes_map, 'enemy-boss')
          ) {
            Talent_Damage_Multiplier *= 1 + 0.1 * Earthquake_Rate
          } else if (
            statVal(nodes_map, 'Enemy_Crowd_Controlled') == 0 &&
            toggleVal(nodes_map, 'enemy-boss')
          ) {
            Talent_Damage_Multiplier *=
              1 + 0.1 * Earthquake_Rate * (1 / number_of_enemies)
          }
        }

        // Glyph 'twister', You deal 13% [x] increased damage for 4 seconds after creating a Dust Devil.
        if (paragonVal(nodes_map, 'twister')) {
          let Dust_Devil_Rate = 0
          let Core_Skill_Rate = 0
          const Core_Skills = new Set([
            'whirlwind',
            'upheaval',
            'rend',
            'double-swing',
            'hammer-of-the-ancients',
          ])
          // Windlasher Aspect: Casting Double Swing twice within 1.5 seconds creates a Dust Devil that deals {80/125} damage to enemies behind the target.
          if (
            aspectVal(nodes_map, 'windlasher-aspect').length != 0 &&
            'double-swing' in Pre_Sim_Node['skill_use_rate']
          ) {
            Dust_Devil_Rate +=
              0.5 * Pre_Sim_Node['skill_use_rate']['double-swing']
          }

          // Devilish Aspect: After generating 100.0 Fury your next Core Skill creates a Dust Devil that deals {100/180} damage to enemies behind the target.
          if (aspectVal(nodes_map, 'devilish-aspect').length != 0) {
            let Devilish_Aspect_Rate = 0

            for (const Skill in Pre_Sim_Node['skill_use_rate']) {
              if (
                Pre_Sim_Node['cross_skill_stat'][Skill][
                  'resource_cost'
                ] < 0
              ) {
                Devilish_Aspect_Rate -=
                  (Pre_Sim_Node['skill_use_rate'][Skill] *
                    Pre_Sim_Node['cross_skill_stat'][Skill][
                      'resource_cost'
                    ]) /
                  100
              }
              if (Core_Skills.has(Skill)) {
                Core_Skill_Rate +=
                  Pre_Sim_Node['skill_use_rate'][Skill]
              }
            }
            Dust_Devil_Rate += Math.min(
              Core_Skill_Rate,
              Devilish_Aspect_Rate,
            )
          }

          // Dust Devil's Aspect: Whirlwind leaves behind Dust Devils that deal {80/125} damage to surrounding enemies.
          if (
            aspectVal(nodes_map, 'dust-devils-aspect').length != 0 &&
            'whirlwind' in Pre_Sim_Node['skill_use_rate']
          ) {
            Dust_Devil_Rate +=
              0.5 * Pre_Sim_Node['skill_use_rate']['whirlwind']
          }

          Talent_Damage_Multiplier *=
            1 + 0.13 * Math.min(1, Dust_Devil_Rate * 4)
        }

        // Revenge Thorns damage increases all damage an enemy takes from you by x1%, up to x8%, for 10 seconds.
        if (
          paragonVal(nodes_map, 'revenge') &&
          statVal(nodes_map, 'Total_Thorns') > 0
        ) {
          Talent_Damage_Multiplier *= 1 + 0.08
        }

        // Legendary Paragon 'blood-rage',
        // Killing a Bleeding enemy has 10% chance to grant Berserking for 5 seconds.  Your damage dealt is increased by 25% [x] of the total amount of your Damage while Berserking bonus.
        if (paragonVal(nodes_map, 'blood-rage')) {
          Talent_Damage_Multiplier *=
            1 +
            0.25 *
              aggregationVal(nodes_map, 'damage-while-berserking')
        }

        return Talent_Damage_Multiplier
      },
    ),

    // Talents can be multiplicative with Damage that only apply to skills.
    Skill_Talent_Damage_Multiplier: new StatsNode(
      'Skill_Talent_Damage_Multiplier',
      () => {
        const number_of_enemies = Number(
          toggleVal(nodes_map, 'number-of-enemies'),
        )
        const Pre_Sim_Node = barbarianPresimVal(nodes_map)
        const enemy_spread = Number(
          statVal(nodes_map, 'Enemy_Spread'),
        )

        let talent_damage_multiplier = 1

        // Enhanced Lunging Strike: Lunging Strike deals x30% increased damage and Heals you for 2% maximum life when it damages a Healthy Enemy
        if (
          currentSkillVal(nodes_map)['name'] == 'lunging-strike' &&
          talentVal(nodes_map, 'enhanced-lunging-strike') == 1
        ) {
          talent_damage_multiplier *=
            1 + (0.3 * 0.2) / (1 + 0.8 * 0.3)
        }

        // Violent Whirlwind: After using Whirlwind for 2 seconds, Whirlwind deals x30% increased damage until it is cancelled.
        if (
          currentSkillVal(nodes_map)['name'] == 'whirlwind' &&
          talentVal(nodes_map, 'violent-whirlwind') == 1
        ) {
          const Number_Of_Cast = statVal(nodes_map, 'Number_Of_Cast')
          talent_damage_multiplier *=
            1 +
            (0.3 * Math.max(Number_Of_Cast - 2, 0)) / Number_Of_Cast
        }

        // Furious Hammer of the Ancients: Hammer of the Ancients deals x1% additional damage for each point of Fury you had when using it.
        if (
          currentSkillVal(nodes_map)['name'] ==
            'hammer-of-the-ancients' &&
          talentVal(nodes_map, 'furious-hammer-of-the-ancients') == 1
        ) {
          talent_damage_multiplier *=
            1 + 0.01 * statVal(nodes_map, 'Max_Resource')
        }

        // Furious Upheaval Dealing direct damage to an enemy with a Skill that is not Upheaval causes your next cast of Upheaval to deal 12%[x] increased damage, stacking up to 6 times.
        if (
          currentSkillVal(nodes_map)['name'] == 'upheaval' &&
          talentVal(nodes_map, 'furious-upheaval') == 1 &&
          'upheaval' in Pre_Sim_Node['skill_use_rate']
        ) {
          let other_skill_rate = 0
          for (const skill_name in Pre_Sim_Node['skill_use_rate']) {
            if (skill_name != 'upheaval') {
              other_skill_rate +=
                Pre_Sim_Node['skill_use_rate'][skill_name]
            }
          }
          const Furious_Upheaval_Stacks = Math.min(
            other_skill_rate /
              (Pre_Sim_Node['skill_use_rate']['upheaval'] + 0.001),
            6,
          )
          talent_damage_multiplier *=
            1 + 0.012 * Furious_Upheaval_Stacks
        }

        // Violent Rend: Rend deals x12% increased damage to vulnerable enemies
        if (
          currentSkillVal(nodes_map)['name'] == 'rend' &&
          toggleVal(nodes_map, 'enemy-vulnerable') &&
          talentVal(nodes_map, 'violent-rend') == 1
        ) {
          talent_damage_multiplier *= 1.12
        }

        // Wallop (Talent up to 3 Points): Your Skills using Bludgeoning Weapons deal x5% increased Damage if the enemy is Stunned or Vulnerable
        if (
          (statVal(nodes_map, 'Weapon_Type') == 2 ||
            (statVal(nodes_map, 'Weapon_Type') == 0 &&
              aggregationVal(nodes_map, 'main-hand-weapon') == 2)) &&
          (toggleVal(nodes_map, 'enemy-stunned') ||
            toggleVal(nodes_map, 'enemy-vulnerable'))
        ) {
          talent_damage_multiplier *=
            1 + 0.05 * talentVal(nodes_map, 'wallop')
        }

        //Unbridled Rage (Talent 1 point): Core Skills deal x135% increased damage, but cost x100 more Fury
        if (
          talentVal(nodes_map, 'unbridled-rage') == 1 &&
          currentSkillVal(nodes_map)['category'] == 'core'
        ) {
          talent_damage_multiplier *= 2.35
        }

        // Enhanced Charge: Enemies knocked back into terrain by charge take 150% increased damage.
        if (
          talentVal(nodes_map, 'enhanced-charge') == 1 &&
          currentSkillVal(nodes_map)['name'] == 'charge' &&
          !toggleVal(nodes_map, 'enemy-boss')
        ) {
          const Charge_Distance = 35
          if (Charge_Distance >= 1.5 * enemy_spread) {
            // Assume Wall Distance = 1.5 x Enemy Spread
            talent_damage_multiplier *= 2.5
          }
        }

        // Brawl: Brawling Skills deal x18% increased damage.
        if (
          paragonVal(nodes_map, 'brawl') &&
          currentSkillVal(nodes_map)['tags'].has('brawling')
        ) {
          talent_damage_multiplier *= 1.18
        }

        // Executioner: While wielding a Polearm, you deal x10% increased damage to Healthy or Injured enemies.
        if (
          statVal(nodes_map, 'Weapon_Type') == 1 &&
          aggregationVal(nodes_map, 'two-hand-slashing-weapon') ==
            2 &&
          paragonVal(nodes_map, 'executioner')
        ) {
          talent_damage_multiplier *=
            1 + (0.55 * 0.1) / (1 + 0.45 * 0.1)
        }

        // Ambidextrous: You deal x8% increased damage while wielding One-Handed weapons.
        talent_damage_multiplier *=
          1 +
          Number(
            statVal(nodes_map, 'Weapon_Type') == 0 &&
              paragonVal(nodes_map, 'ambidextrous'),
          ) *
            0.08

        // Might: You deal x8% increased damage while wielding Two-Handed weapons.
        talent_damage_multiplier *=
          1 +
          Number(
            statVal(nodes_map, 'Weapon_Type') != 0 &&
              paragonVal(nodes_map, 'might'),
          ) *
            0.08

        return talent_damage_multiplier
      },
    ),

    Hits_Multiplier: new StatsNode('Hits_Multiplier', () => {
      const number_of_enemies = Number(
        toggleVal(nodes_map, 'number-of-enemies'),
      )
      const enemy_spread = Number(statVal(nodes_map, 'Enemy_Spread'))
      let Hits_Multiplier = 1
      let p
      let p1
      let p2
      let p3

      switch (currentSkillVal(nodes_map)['name']) {
        case 'rend':
          Hits_Multiplier =
            1 +
            ProbabilityInCone(10, 1 / 3, enemy_spread) *
              (number_of_enemies - 1)
          break

        case 'double-swing':
          Hits_Multiplier =
            2 +
            ProbabilityInCone(10, 1 / 3, enemy_spread) *
              (number_of_enemies - 1)
          break

        case 'hammer-of-the-ancients':
          Hits_Multiplier =
            1 +
            ProbabilityInCircle(5, 5, enemy_spread) *
              (number_of_enemies - 1)

          // Aspect of Ancestral Force: Hammer of the Ancients quakes outward and its damage is increased by 5-15%.
          if (
            aspectVal(nodes_map, 'aspect-of-ancestral-force')
              .length != 0
          ) {
            Hits_Multiplier +=
              1 +
              ProbabilityInCircle(
                5,
                10,
                statVal(nodes_map, 'Enemy_Spread'),
              ) *
                (number_of_enemies - 1)
          }
          break

        case 'upheaval':
          Hits_Multiplier =
            1 +
            ProbabilityInCone(30, 1 / 8, enemy_spread) *
              (number_of_enemies - 1)
          break

        case 'whirlwind':
          Hits_Multiplier =
            1 +
            Math.min(10 ** 2 / enemy_spread ** 2, 1) *
              (number_of_enemies - 1)
          break

        case 'ground-stomp':
          Hits_Multiplier =
            1 +
            Math.min(15 ** 2 / enemy_spread ** 2, 1) *
              (number_of_enemies - 1)
          break

        case 'charge':
          Hits_Multiplier =
            1 +
            ProbabilityIntersectingLineInCircle(7, 30, enemy_spread) *
              (number_of_enemies - 1)

          // Aspect of Ancestral Charge: Charge calls forth 4 Ancients who also Charge, dealing [20-30]% of normal damage.
          // The 4 horses stand next to you and also charge forward.
          if (aspectVal(nodes_map, 'ancestral-charge').length != 0) {
            Hits_Multiplier +=
              aspectVal(nodes_map, 'ancestral-charge')[0] *
              // Not sure how well the geometric approximation holds up with this thick of a line so
              // capping at 1 to be safe.
              (Math.min(
                ProbabilityIntersectingLineInCircle(
                  35,
                  30,
                  enemy_spread,
                ),
                1,
              ) -
                ProbabilityIntersectingLineInCircle(
                  7,
                  30,
                  enemy_spread,
                )) *
              (number_of_enemies - 1)
          }
          break

        case 'leap':
          Hits_Multiplier =
            1 +
            Math.min(10 ** 2 / enemy_spread ** 2, 1) *
              (number_of_enemies - 1)
          break

        case 'rupture':
          Hits_Multiplier =
            1 +
            ProbabilityInCone(10, 1 / 3, enemy_spread) *
              (number_of_enemies - 1)
          break

        case 'death-blow':
          // Enhanced Death Blow: Death Blow deals 150%[x] increased damage to Bosses.
          Hits_Multiplier =
            1 +
            0.5 *
              talentVal(nodes_map, 'enhanced-death-blow') *
              Number(toggleVal(nodes_map, 'enemy-boss')) +
            ProbabilityInCone(10, 1 / 24, enemy_spread) *
              (number_of_enemies - 1)

          break

        case 'steel-grasp':
          Hits_Multiplier =
            1 +
            ProbabilityInCone(30, 1 / 8, enemy_spread) *
              (number_of_enemies - 1)

          // Ancients Oath Unique: Steel Grasp launches 2 additional chains. Enemies that have been pulled by Steel Grasp take x30-x50% bonus damage from you for 3 seconds.
          if (aspectVal(nodes_map, 'ancients-oath').length != 0) {
            Hits_Multiplier =
              1 +
              ProbabilityInCone(30, 1 / 4, enemy_spread) *
                (number_of_enemies - 1)
          }
          break

        case 'iron-maelstrom':
          // Average the areas of the 3 attacks.
          p1 = ProbabilityInCone(30, 1 / 8, enemy_spread)
          p2 = ProbabilityInCone(45, 1 / 2, enemy_spread)
          p3 = Math.min(30 ** 2 / enemy_spread ** 2, 1)
          Hits_Multiplier =
            1 + ((p1 + p2 + p3) / 3) * (number_of_enemies - 1)
          break

        case 'kick':
          Hits_Multiplier =
            1 +
            ProbabilityIntersectingLineInCircle(5, 10, enemy_spread) *
              (number_of_enemies - 1)

          // Power Kick: If Kick damages an enemy, it consumes all of your Fury and deals an additional 20% damage per 10 fury spent. Kick no longer knocks back enemies.
          if (talentVal(nodes_map, 'power-kick') > 0) {
            Hits_Multiplier *=
              1 +
              (0.2 / 0.18) *
                Math.floor(statVal(nodes_map, 'Max_Resource') / 20)
          } else {
            Hits_Multiplier *=
              // Assume walls are 1.5 x enemy spread away.
              1 + (0.7 / 0.18) * Number(enemy_spread < 30 / 1.5)
          }

          // Mighty Kick: Kicked enemies deal 54% damage to enemies they collide with while being Knocked Back. Enemies damaged this way are Knocked Down for 2 seconds.
          if (talentVal(nodes_map, 'mighty-kick') > 0) {
            // If enemies are in 10 yard circle behind the kick area.
            Hits_Multiplier +=
              (0.54 / 0.18) *
              ProbabilityInCircle(20, 10, enemy_spread) *
              (number_of_enemies - 1)
          }
          break

        case 'call-of-the-ancients': {
          // 12 Whirlwinds - 65%
          // 1 leap - 104%
          // 7 Frenzy - 39%
          // 3 upheaval -195%
          const Whirlwind_Hits_Multiplier =
            12 *
            0.65 *
            (1 +
              Math.min(10 ** 2 / enemy_spread ** 2, 1) *
                (number_of_enemies - 1))

          const Leap_Hits_Multiplier =
            1.04 *
            (1 +
              Math.min(10 ** 2 / enemy_spread ** 2, 1) *
                (number_of_enemies - 1))

          const Frenzy_Hits_Multiplier = 7 * 0.39

          const Upheaval_Hits_Multiplier =
            3 *
            1.95 *
            (1 +
              ProbabilityInCone(30, 1 / 8, enemy_spread) *
                (number_of_enemies - 1))

          Hits_Multiplier =
            Whirlwind_Hits_Multiplier +
            Leap_Hits_Multiplier +
            Frenzy_Hits_Multiplier +
            Upheaval_Hits_Multiplier
          break
        }
      }

      return Hits_Multiplier
    }),

    Total_Hits: new StatsNode('Total_Hits', () => {
      const number_of_enemies = Number(
        toggleVal(nodes_map, 'number-of-enemies'),
      )
      const enemy_spread = Number(statVal(nodes_map, 'Enemy_Spread'))

      let Total_Hits = 1
      let p
      let p1
      let p2
      let p3

      switch (currentSkillVal(nodes_map)['name']) {
        case 'rend':
          Total_Hits =
            1 +
            ProbabilityInCone(10, 1 / 3, enemy_spread) *
              (number_of_enemies - 1)
          break

        case 'double-swing':
          Total_Hits =
            2 +
            ProbabilityInCone(10, 1 / 3, enemy_spread) *
              (number_of_enemies - 1)
          break

        case 'hammer-of-the-ancients':
          Total_Hits =
            1 +
            ProbabilityInCircle(5, 5, enemy_spread) *
              (number_of_enemies - 1)
          // Aspect of Ancestral Force: Hammer of the Ancients quakes outwards, dealing {32/50}% of its damage to enemies.
          if (
            aspectVal(nodes_map, 'aspect-of-ancestral-force')
              .length != 0
          ) {
            Total_Hits +=
              1 +
              ProbabilityInCircle(
                5,
                10,
                statVal(nodes_map, 'Enemy_Spread'),
              ) *
                (number_of_enemies - 1)
          }
          break

        case 'upheaval':
          Total_Hits =
            1 +
            ProbabilityInCone(30, 1 / 8, enemy_spread) *
              (number_of_enemies - 1)
          break

        case 'whirlwind':
          // Channeled skills hit twice per second.
          Total_Hits =
            1 +
            Math.min(10 ** 2 / enemy_spread ** 2, 1) *
              (number_of_enemies - 1)
          break

        case 'ground-stomp':
          Total_Hits =
            1 +
            Math.min(15 ** 2 / enemy_spread ** 2, 1) *
              (number_of_enemies - 1)
          break
        case 'charge':
          p = ProbabilityIntersectingLineInCircle(7, 30, enemy_spread)
          Total_Hits = 1 + p * (number_of_enemies - 1)

          // Aspect of Ancestral Charge: Charge calls forth 4 Ancients who also Charge, dealing [75 - 125]% of normal damage.
          if (aspectVal(nodes_map, 'ancestral-charge').length != 0) {
            Total_Hits =
              1 +
              ProbabilityIntersectingLineInCircle(
                35,
                30,
                enemy_spread,
              ) *
                (number_of_enemies - 1)
          }
          break

        case 'leap':
          Total_Hits =
            1 +
            Math.min(10 ** 2 / enemy_spread ** 2, 1) *
              (number_of_enemies - 1)
          break

        case 'rupture':
          Total_Hits =
            1 +
            ProbabilityInCone(10, 1 / 3, enemy_spread) *
              (number_of_enemies - 1)
          break

        case 'death-blow':
          Total_Hits =
            1 +
            ProbabilityInCone(10, 1 / 24, enemy_spread) *
              (number_of_enemies - 1)
          break

        case 'steel-grasp':
          Total_Hits =
            1 +
            ProbabilityInCone(30, 1 / 8, enemy_spread) *
              (number_of_enemies - 1)

          // Ancients Oath Unique: Steel Grasp launches 2 additional chains. Enemies that have been pulled by Steel Grasp take x30-x50% bonus damage from you for 3 seconds.
          if (aspectVal(nodes_map, 'ancients-oath').length != 0) {
            Total_Hits =
              1 +
              ProbabilityInCone(30, 1 / 4, enemy_spread) *
                (number_of_enemies - 1)
          }
          break

        case 'iron-maelstrom':
          // Average the areas of the 3 attacks.
          p1 = ProbabilityInCone(30, 1 / 8, enemy_spread)
          p2 = ProbabilityInCone(45, 1 / 2, enemy_spread)
          p3 = Math.min(30 ** 2 / enemy_spread ** 2, 1)
          Total_Hits =
            1 + ((p1 + p2 + p3) / 3) * (number_of_enemies - 1)
          break

        case 'kick':
          Total_Hits =
            1 +
            ProbabilityIntersectingLineInCircle(5, 10, enemy_spread) *
              (number_of_enemies - 1)

          // Mighty Kick: Kicked enemies deal 54% damage to enemies they collide with while being Knocked Back. Enemies damaged this way are Knocked Down for 2 seconds.
          if (talentVal(nodes_map, 'mighty-kick') > 0) {
            Total_Hits += number_of_enemies - 1
          }
          break

        case 'call-of-the-ancients': {
          // 12 Whirlwinds - 65%
          // 1 leap - 104%
          // 7 Frenzy - 39%
          // 3 upheaval -195%
          const Whirlwind_Hits =
            12 *
            (1 +
              Math.min(10 ** 2 / enemy_spread ** 2, 1) *
                (number_of_enemies - 1))

          const Leap_Hits =
            1 +
            Math.min(10 ** 2 / enemy_spread ** 2, 1) *
              (number_of_enemies - 1)

          const Frenzy_Hits = 7

          const Upheaval_Hits =
            3 *
            (1 +
              ProbabilityInCone(30, 1 / 8, enemy_spread) *
                (number_of_enemies - 1))

          Total_Hits =
            Whirlwind_Hits + Leap_Hits + Frenzy_Hits + Upheaval_Hits
          break
        }
      }

      return Total_Hits
    }),

    Number_Enemies_Hit: new StatsNode('Number_Enemies_Hit', () => {
      const number_of_enemies = Number(
        toggleVal(nodes_map, 'number-of-enemies'),
      )
      const enemy_spread = Number(statVal(nodes_map, 'Enemy_Spread'))

      let Total_Hits = 1
      let p
      let p1
      let p2
      let p3

      switch (currentSkillVal(nodes_map)['name']) {
        case 'rend':
          Total_Hits =
            1 +
            ProbabilityInCone(10, 1 / 3, enemy_spread) *
              (number_of_enemies - 1)
          break

        case 'double-swing':
          Total_Hits =
            1 +
            ProbabilityInCone(10, 1 / 3, enemy_spread) *
              (number_of_enemies - 1)
          break

        case 'hammer-of-the-ancients':
          Total_Hits =
            1 +
            ProbabilityInCircle(5, 5, enemy_spread) *
              (number_of_enemies - 1)
          // Aspect of Ancestral Force: Hammer of the Ancients quakes outwards, dealing {32/50}% of its damage to enemies.
          if (
            aspectVal(nodes_map, 'aspect-of-ancestral-force')
              .length != 0
          ) {
            Total_Hits =
              1 +
              ProbabilityInCircle(5, 10, enemy_spread) *
                (number_of_enemies - 1)
          }
          break

        case 'upheaval':
          Total_Hits =
            1 +
            ProbabilityInCone(30, 1 / 8, enemy_spread) *
              (number_of_enemies - 1)
          break

        case 'whirlwind':
          // Channeled skills hit twice per second.
          Total_Hits =
            1 +
            Math.min(10 ** 2 / enemy_spread ** 2, 1) *
              (number_of_enemies - 1)
          break

        case 'ground-stomp':
          Total_Hits =
            1 +
            Math.min(15 ** 2 / enemy_spread ** 2, 1) *
              (number_of_enemies - 1)
          break
        case 'charge':
          p = ProbabilityIntersectingLineInCircle(7, 30, enemy_spread)
          Total_Hits = 1 + p * (number_of_enemies - 1)

          // Aspect of Ancestral Charge: Charge calls forth 4 Ancients who also Charge, dealing [75 - 125]% of normal damage.
          if (aspectVal(nodes_map, 'ancestral-charge').length != 0) {
            Total_Hits =
              1 +
              ProbabilityIntersectingLineInCircle(
                35,
                30,
                enemy_spread,
              ) *
                (number_of_enemies - 1)
          }
          break

        case 'leap':
          Total_Hits =
            1 +
            Math.min(10 ** 2 / enemy_spread ** 2, 1) *
              (number_of_enemies - 1)
          break

        case 'rupture':
          Total_Hits =
            1 +
            ProbabilityInCone(10, 1 / 3, enemy_spread) *
              (number_of_enemies - 1)
          break

        case 'death-blow':
          Total_Hits =
            1 +
            ProbabilityInCone(10, 1 / 24, enemy_spread) *
              (number_of_enemies - 1)
          break

        case 'steel-grasp':
          Total_Hits =
            1 +
            ProbabilityInCone(30, 1 / 8, enemy_spread) *
              (number_of_enemies - 1)
          break

        case 'iron-maelstrom':
          // Average the areas of the 3 attacks.
          p1 = ProbabilityInCone(30, 1 / 8, enemy_spread)
          p2 = ProbabilityInCone(45, 1 / 2, enemy_spread)
          p3 = Math.min(30 ** 2 / enemy_spread ** 2, 1)
          Total_Hits =
            1 + ((p1 + p2 + p3) / 3) * (number_of_enemies - 1)
          break

        case 'kick':
          Total_Hits =
            1 +
            ProbabilityIntersectingLineInCircle(5, 10, enemy_spread) *
              (number_of_enemies - 1)

          // Mighty Kick: Kicked enemies deal 54% damage to enemies they collide with while being Knocked Back. Enemies damaged this way are Knocked Down for 2 seconds.
          if (talentVal(nodes_map, 'mighty-kick') > 0) {
            Total_Hits += number_of_enemies - 1
          }
          break
      }

      return Total_Hits
    }),

    /*--------------------------------------------------
                    PLAYER STATS NODES
        --------------------------------------------------*/

    Max_Life: new StatsNode('Max_Life', () => {
      const Base_Life = baseStatVal(nodes_map)['BaseMaxLife']

      // maximum-life
      const Bonus_Life = aggregationVal(nodes_map, 'maximum-life')

      // %-maximum-life
      let Life_Multiplier =
        1 + aggregationVal(nodes_map, '%-maximum-life')

      // Imposing Presence (Talent): Gain x6% additional Maximum Life (up to 3 Points)
      Life_Multiplier *=
        1 + 0.06 * talentVal(nodes_map, 'imposing-presence')

      // Enhanced Challenging Shout: While Challenging Shout is active, gain x20% bonus maximum life
      if (
        allSkillsVal(nodes_map).has('challenging-shout') &&
        talentVal(nodes_map, 'enhanced-challenging-shout') > 0
      ) {
        const Shout_Cooldown = statVal(nodes_map, 'Shout_Cooldown')
        const Shout_Duration_Mulipliter = statVal(
          nodes_map,
          'Shout_Duration_Multiplier',
        )
        const Challenging_Shout_Bonus = 0.2
        Life_Multiplier *=
          1 +
          Challenging_Shout_Bonus *
            Math.min(
              (6 * Shout_Duration_Mulipliter) / Shout_Cooldown,
              1,
            )
      }

      return Math.floor(Base_Life * Life_Multiplier + Bonus_Life)
    }),

    Total_Thorns: new StatsNode('Total_Thorns', () => {
      const Pre_Sim_Node = barbarianPresimVal(nodes_map)
      let Total_Thorns = 0

      // thorns
      Total_Thorns += aggregationVal(nodes_map, 'thorns')

      // (Unique) Razorplate: Gain {1000/15000} Thorns
      if (aspectVal(nodes_map, 'razorplate').length > 0) {
        Total_Thorns += aspectVal(nodes_map, 'razorplate')[0]
      }

      // Death Wish Aspect: Gain {55/100} Thorns while Berserking.
      if (aspectVal(nodes_map, 'death-wish-aspect').length > 0) {
        Total_Thorns +=
          aspectVal(nodes_map, 'death-wish-aspect')[0] *
          statVal(nodes_map, 'Berserking_Uptime')
      }

      // Combat Flay: When Flay deals direct damage to an enemy, you gain 3% Damage Reduction and 50 Thorns for 3 seconds. This stacks up to 4 times.
      if (
        talentVal(nodes_map, 'combat-flay') > 0 &&
        'flay' in Pre_Sim_Node['skill_use_rate']
      ) {
        const Combat_Flay_Stacks =
          Pre_Sim_Node['skill_use_rate']['flay'] * 3 > 1
            ? 4
            : Pre_Sim_Node['skill_use_rate']['flay'] * 3
        Total_Thorns += 50 * Combat_Flay_Stacks
      }

      // (Talent) Outburst: Gain 4% Base Life in Thorns. Also gain 2% Base Life in Thorns for each 10% Base Life Bonus Maximum life you have.
      if (talentVal(nodes_map, 'outburst') > 0) {
        const Base_Life = baseStatVal(nodes_map)['BaseMaxLife']
        const Max_Life = statVal(nodes_map, 'Max_Life')
        Total_Thorns += Math.floor(
          0.04 * Base_Life +
            (0.02 * (Max_Life - Base_Life)) / (0.1 * Base_Life),
        )
      }

      // From testing, tough as nails doesn't buff strategic challenging shout.
      // (Talent) Tough as Nails: Increase your Thorns by +3% (up to 3 points). When enemies hit you, they take an additional 10% of your Thorns as Bleeding Damage over 5 seconds.
      Total_Thorns *=
        1 + 0.03 * talentVal(nodes_map, 'tough-as-nails')

      // Strategic Challenging Shout: While Challenging Shout is active, gain Thorns equal to 30% of your maximum life.
      if (
        allSkillsVal(nodes_map).has('challenging-shout') &&
        talentVal(nodes_map, 'strategic-challenging-shout') == 1
      ) {
        const Shout_Cooldown = statVal(nodes_map, 'Shout_Cooldown')
        const Shout_Duration_Mulipliter = statVal(
          nodes_map,
          'Shout_Duration_Multiplier',
        )
        Total_Thorns +=
          0.3 *
          statVal(nodes_map, 'Max_Life') *
          Math.min(
            (6 * Shout_Duration_Mulipliter) / Shout_Cooldown,
            1,
          )
      }

      return Total_Thorns
    }),

    Thorns_Dps: new StatsNode('Thorns_Dps', () => {
      const number_of_enemies = Number(
        toggleVal(nodes_map, 'number-of-enemies'),
      )
      const enemy_spread = Number(statVal(nodes_map, 'Enemy_Spread'))
      const Thorns = statVal(nodes_map, 'Total_Thorns')
      let Hits_Per_Thorns = 1
      // Needleflare-aspect: Thorns damage dealt has a {20/40}% chance to deal damage to all enemies around you.
      if (aspectVal(nodes_map, 'needleflare-aspect').length > 0) {
        const Needleflare_Chance = aspectVal(
          nodes_map,
          'needleflare-aspect',
        )[0]
        const Needleflare_Hits =
          Needleflare_Chance *
          Math.min(10 ** 2 / enemy_spread ** 2, 1) *
          (number_of_enemies - 1)
        Hits_Per_Thorns += Needleflare_Hits
      }

      return (
        Thorns *
        (1 - statVal(nodes_map, 'Total_Dodge_Chance')) *
        statVal(nodes_map, 'Enemy_Attacks_Per_Second') *
        Hits_Per_Thorns *
        BarbarianDamageMultiplier(
          new Set(['physical', 'thorns']),

          nodes_map,
        )
      )
    }),

    Passive_Dps: new StatsNode('Passive_Dps', () => {
      const Weapon_Damage = statVal(nodes_map, 'Total_Weapon_Damage')
      const Pre_Sim_Node = barbarianPresimVal(nodes_map)
      const number_of_enemies = Number(
        toggleVal(nodes_map, 'number-of-enemies'),
      )
      const enemy_spread = Number(statVal(nodes_map, 'Enemy_Spread'))
      let Passive_Dps = statVal(nodes_map, 'Thorns_Dps')

      // Vampiric Power Casting a Mastery, Weapon Mastery, Macabre, Wrath, or Imbuement Skill calls a bat ally to attack nearby enemies, dealing 80% Physical damage with a 30% chance to Stun.
      if (statVal(nodes_map, 'Vampiric_Bat_Rate') > 0) {
        Passive_Dps +=
          statVal(nodes_map, 'Vampiric_Bat_Rate') *
          Weapon_Damage *
          BarbarianDamageMultiplier(
            new Set(['physical', 'bat']),
            nodes_map,
          )
      }

      // Vampiric Power jagged-spikes
      // Thorns have a 10% chance to deal 300% increased damage and Chill enemies for 8%.
      if (vampiricPowerVal(nodes_map, 'jagged-spikes')) {
        Passive_Dps += 0.3 * statVal(nodes_map, 'Thorns_Dps')
      }

      // Aspect of Burning Rage: While Berserking, you deal {40/70} Fire damage every second to surrounding enemies.
      if (
        aspectVal(nodes_map, 'aspect-of-burning-rage').length != 0
      ) {
        Passive_Dps +=
          (Number(toggleVal(nodes_map, 'enemy-distant')) +
            Math.min(10 ** 2 / enemy_spread ** 2) *
              (number_of_enemies - 1)) *
          aspectVal(nodes_map, 'aspect-of-burning-rage')[0] *
          BarbarianDamageMultiplier(
            new Set(['damage-over-time', 'fire']),
            nodes_map,
          ) *
          statVal(nodes_map, 'Berserking_Uptime')
      }

      // Vampiric Curse: Killing an enemy affected by your Vampiric Curse stores their soul. Casting a Defensive, Macabre, or Agility Skill will unleash stored souls to attack nearby enemies. You can hold up to 8 souls.
      // Assuming 60% Physical Damage for now. Real Value Unknown
      if (statVal(nodes_map, 'Vampiric_Curse_Uptime') > 0) {
        let Vampiric_Curse_Damage_Modifier = 0.5

        let Defensive_Skill_Rate = 0
        for (const Skill of allSkillsVal(nodes_map)) {
          switch (Skill) {
            case 'ground-stomp':
              if ('ground-stomp' in Pre_Sim_Node['skill_use_rate']) {
                Defensive_Skill_Rate +=
                  Pre_Sim_Node['skill_use_rate'][Skill]
              }
              break
            case 'challenging-shout':
              Defensive_Skill_Rate +=
                1 / statVal(nodes_map, 'Shout_Cooldown')
              break
            case 'iron-skin':
              Defensive_Skill_Rate +=
                1 / statVal(nodes_map, 'Iron_Skin_Cooldown')
              break
            case 'rallying-cry':
              Defensive_Skill_Rate +=
                1 / statVal(nodes_map, 'Shout_Cooldown')
              break
            default:
              break
          }
        }

        // Vampiric Power accursed-touch
        // Accursed Souls deal 200% increased damage.
        if (vampiricPowerVal(nodes_map, 'accursed-touch')) {
          Vampiric_Curse_Damage_Modifier *= 3
        }

        Passive_Dps +=
          Vampiric_Curse_Damage_Modifier *
          Weapon_Damage *
          Math.min(
            Defensive_Skill_Rate,
            statVal(nodes_map, 'Enemy_Kill_Rate') *
              statVal(nodes_map, 'Vampiric_Curse_Uptime'),
          ) *
          BarbarianDamageMultiplier(new Set(['physical']), nodes_map)
      }

      // 100,000 steps: After gaining the final damage bonus from the Walking Arsenal Key Passive, you automatically cast Ground Stomp and gain [32 - 50] Fury. This cannot happen more than once every 15 seconds.
      //
      // Note: For simplicity, if the Walking Arsenal uptime > 0 then we assume this happens every 15 seconds.
      if (
        aspectVal(nodes_map, '100,000-steps').length != 0 &&
        statVal(nodes_map, 'Walking_Arsenal_Uptime') > 0
      ) {
        const Ground_Stomp_Node = skillVal(nodes_map, 'ground-stomp')
        Passive_Dps +=
          (Ground_Stomp_Node['modifiers']['flat'] *
            (1 +
              Math.min(15 ** 2 / enemy_spread ** 2, 1) *
                (number_of_enemies - 1)) *
            BarbarianDamageMultiplier(
              new Set(Ground_Stomp_Node['tags']),
              nodes_map,
            )) /
          15
      }

      // Vampiric Power hemomancy
      // Your attacks deal 80% of your Maximum Life as Physical damage to nearby enemies. This can only occur once every 4 seconds. You heal for 1% of your Maximum Life for each enemy damaged this way.
      if (vampiricPowerVal(nodes_map, 'hemomancy')) {
        let Attack_Rate = 0
        for (const Skill in Pre_Sim_Node['skill_use_rate']) {
          Attack_Rate += Pre_Sim_Node['skill_use_rate'][Skill]
        }
        const Max_Life_Percent_Damage =
          statVal(nodes_map, 'Max_Life') *
          Number(toggleVal(nodes_map, 'percent-life'))
        Passive_Dps +=
          Math.min(0.25, Attack_Rate) *
          Max_Life_Percent_Damage *
          BarbarianDamageMultiplier(
            new Set(['physical']),
            nodes_map,
          ) *
          (1 +
            Math.min(
              1,
              10 ** 2 / statVal(nodes_map, 'Enemy_Spread') ** 2,
            ) *
              (number_of_enemies - 1))
      }

      // Vampiric Power metamorphosis
      // When you Evade you turn into a cloud of bats, becoming Unstoppable for 4 seconds. Enemies along your path take 160% Physical damage and are inflicted with Vampiric Curse.
      if (vampiricPowerVal(nodes_map, 'metamorphosis')) {
        const Evade_Cooldown = 5
        Passive_Dps +=
          1.6 *
          (1 / Evade_Cooldown) *
          BarbarianDamageMultiplier(
            new Set(['physical']),
            nodes_map,
          ) *
          (1 +
            Math.min(
              1,
              15 ** 2 / statVal(nodes_map, 'Enemy_Spread') ** 2,
            ) *
              (number_of_enemies - 1))
      }

      return Passive_Dps
    }),

    // Fortified - returns boolean
    Player_Fortified: new StatsNode('Player_Fortified', () => {
      return Number(toggleVal(nodes_map, 'percent-fortify')) >=
        Number(toggleVal(nodes_map, 'percent-life'))
        ? 1
        : 0
    }),

    Player_Damage_Reduction: new StatsNode(
      'Player_Damage_Reduction',
      () => {
        const Pre_Sim_Node = barbarianPresimVal(nodes_map)
        const number_of_enemies = Number(
          toggleVal(nodes_map, 'number-of-enemies'),
        )
        // Barbarians Start with 10% Damage Reduction
        let Damage_Received_Total = 0.9

        // damage-reduction
        Damage_Received_Total *=
          1 - aggregationVal(nodes_map, 'damage-reduction')

        // damage-reduction-from-close-enemies
        Damage_Received_Total *=
          1 -
          aggregationVal(
            nodes_map,
            'damage-reduction-from-close-enemies',
          ) *
            Number(!toggleVal(nodes_map, 'enemy-distant'))

        // damage-reduction-from-distant-enemies
        Damage_Received_Total *=
          1 -
          aggregationVal(
            nodes_map,
            'damage-reduction-from-distant-enemies',
          ) *
            Number(toggleVal(nodes_map, 'enemy-distant'))

        // damage-reduction-while-injured
        Damage_Received_Total *=
          Number(toggleVal(nodes_map, 'percent-life')) <= 0.35
            ? 1 -
              aggregationVal(
                nodes_map,
                'damage-reduction-while-injured',
              )
            : 1

        // damage-reduction-from-elites'
        Damage_Received_Total *=
          1 -
          aggregationVal(nodes_map, 'damage-reduction-from-elites') *
            Number(toggleVal(nodes_map, 'enemy-elite'))

        // damage-reduction-from-enemies-affected-by-trap-skills (Rogue Only)

        // damage-reduction-from-poisoned-enemies
        Damage_Received_Total *=
          1 -
          aggregationVal(
            nodes_map,
            'damage-reduction-from-poisoned-enemies',
          ) *
            Number(toggleVal(nodes_map, 'enemy-poisoned'))

        // damage-reduction-from-slowed-enemies
        Damage_Received_Total *=
          1 -
          aggregationVal(
            nodes_map,
            'damage-reduction-from-slowed-enemies',
          ) *
            Number(toggleVal(nodes_map, 'enemy-slowed'))

        // damage-reduction-from-vulnerable-enemies
        Damage_Received_Total *=
          1 -
          aggregationVal(
            nodes_map,
            'damage-reduction-from-vulnerable-enemies',
          ) *
            statVal(nodes_map, 'Enemy_Vulnerable')

        // damage-reduction-while-healthy
        Damage_Received_Total *=
          Number(toggleVal(nodes_map, 'percent-life')) >= 0.8
            ? 1 -
              aggregationVal(
                nodes_map,
                'damage-reduction-while-healthy',
              )
            : 1

        // 'damage-reduction-from-affected-by-shadow-damage-over-time-enemies'
        Damage_Received_Total *=
          1 -
          aggregationVal(
            nodes_map,
            'damage-reduction-from-affected-by-shadow-damage-over-time-enemies',
          ) *
            Number(toggleVal(nodes_map, 'enemy-affected-by-shadow'))

        // 'damage-reduction-from-bleeding-enemies'
        Damage_Received_Total *=
          1 -
          aggregationVal(
            nodes_map,
            'damage-reduction-from-bleeding-enemies',
          ) *
            Number(toggleVal(nodes_map, 'enemy-bleeding'))

        // 'damage-reduction-from-burning-enemies'
        Damage_Received_Total *=
          1 -
          aggregationVal(
            nodes_map,
            'damage-reduction-from-burning-enemies',
          ) *
            Number(toggleVal(nodes_map, 'enemy-burning'))

        // 'damage-reduction-from-chilled-enemies'
        Damage_Received_Total *=
          1 -
          aggregationVal(
            nodes_map,
            'damage-reduction-from-chilled-enemies',
          ) *
            statVal(nodes_map, 'Enemy_Chilled')

        // Martial Vigor: Damage Reduction against Elites is increased by 4% (up to 3 points)
        if (toggleVal(nodes_map, 'enemy-elite')) {
          Damage_Received_Total *=
            1 - 0.04 * talentVal(nodes_map, 'martial-vigor')
        }

        // Fortified Damage Reduction
        const Fortified_Damage_Reduction =
          1 -
          0.9 *
            (1 -
              aggregationVal(
                nodes_map,
                'damage-reduction-while-fortified',
              )) *
            (1 - 0.02 * talentVal(nodes_map, 'defensive-stance'))
        // Defensive Stance (Talent up to 3 points): Increases the Damage Reduction gained while you are fortified by an additional 2%

        Damage_Received_Total *=
          1 -
          Fortified_Damage_Reduction *
            Number(toggleVal(nodes_map, 'percent-fortify'))

        // (TODO) Toggle for earthquake or factor in uptime?
        // Aspect of Bul-Kathos: Leap creates an Earthquake that deals {195/380} Physical damage over 4 seconds. While standing in Earthquakes, you gain {5/15}% increased Damage Reduction.
        if (
          currentSkillVal(nodes_map)['name'] == 'leap' &&
          aspectVal(nodes_map, 'aspect-of-bul-kathos').length != 0 &&
          'leap' in Pre_Sim_Node['skill_use_rate']
        ) {
          Damage_Received_Total *=
            1 -
            aspectVal(nodes_map, 'aspect-of-bul-kathos')[1] *
              statVal(nodes_map, 'Earthquake_Uptime')
        }

        // Aspect of the Iron Warrior: Iron Skin grants Unstoppable, and {18/28}% Damage Reduction.
        if (
          allSkillsVal(nodes_map).has('iron-skin') &&
          aspectVal(nodes_map, 'aspect-of-the-iron-warrior').length !=
            0
        ) {
          Damage_Received_Total *=
            1 -
            aspectVal(nodes_map, 'aspect-of-the-iron-warrior')[0] *
              Math.min(
                1,
                5 / statVal(nodes_map, 'Iron_Skin_Cooldown'),
              )
        }

        // Iron Blood Aspect: Gain {2/4}% Damage Reduction for each Nearby Bleeding enemy up to {10/20}% maximum.
        // Only getting benefit from 1 enemy since we just have general uptime.
        if (aspectVal(nodes_map, 'iron-blood-aspect').length != 0) {
          const Bleeding_Uptime = Math.max(
            Pre_Sim_Node['dot_uptime'],
            Number(toggleVal(nodes_map, 'enemy-bleeding')),
          )
          let Nearby_Enemies =
            1 +
            Math.min(
              1,
              10 ** 2 / statVal(nodes_map, 'Enemy_Spread') ** 2,
            ) *
              (number_of_enemies - 1)
          if (toggleVal(nodes_map, 'enemy-distant')) {
            Nearby_Enemies =
              Math.min(
                1,
                10 ** 2 / statVal(nodes_map, 'Enemy_Spread') ** 2,
              ) * number_of_enemies
          }
          Damage_Received_Total *=
            1 -
            Math.min(
              aspectVal(nodes_map, 'iron-blood-aspect')[1],
              aspectVal(nodes_map, 'iron-blood-aspect')[0] *
                Bleeding_Uptime *
                Nearby_Enemies,
            )
        }

        // aspect-of-Might: basic Skills grant 25.0% damage Reduction for {2/6} seconds.
        if (aspectVal(nodes_map, 'aspect-of-might').length != 0) {
          let Basic_Use_Rate = 0
          for (const Skill in Pre_Sim_Node['skill_use_rate']) {
            if (skillVal(nodes_map, Skill)['tags'].has('basic')) {
              Basic_Use_Rate += Pre_Sim_Node['skill_use_rate'][Skill]
            }
          }
          Damage_Received_Total *=
            1 -
            0.25 *
              Math.min(
                Basic_Use_Rate *
                  aspectVal(nodes_map, 'aspect-of-might')[0],
                1,
              )
        }

        // Challenging Shout: Taunt Nearby Enemies and gain 40% Damage Reduction for 6 Seconds
        let Challenging_Shout_Average_Bonus = 0
        if (allSkillsVal(nodes_map).has('challenging-shout')) {
          const Shout_Cooldown = statVal(nodes_map, 'Shout_Cooldown')
          const Challenging_Shout_Bonus =
            0.4 *
            (0.9 +
              0.05 * (talentVal(nodes_map, 'challenging-shout') - 1))
          Challenging_Shout_Average_Bonus =
            Challenging_Shout_Bonus * Math.min(6 / Shout_Cooldown, 1)

          Damage_Received_Total *= 1 - Challenging_Shout_Average_Bonus
        }

        // Guttural Yell (up to 3 points): Your Shout skills cause enemies to deal 4% less damage for 5 seconds
        if (
          allSkillsVal(nodes_map).has('challenging-shout') ||
          allSkillsVal(nodes_map).has('war-cry') ||
          allSkillsVal(nodes_map).has('rallying-cry')
        ) {
          const Shout_Cooldown = statVal(nodes_map, 'Shout_Cooldown')
          Damage_Received_Total *=
            1 -
            0.04 *
              talentVal(nodes_map, 'guttural-yell') *
              Math.min(5 / Shout_Cooldown, 1)
        }

        // Aggressive Resistance (up to 3 points): Gain 4% Damage Reduction While Berserking
        Damage_Received_Total *=
          1 -
          0.04 *
            talentVal(nodes_map, 'aggressive-resistance') *
            statVal(nodes_map, 'Berserking_Uptime')

        // Pit Fighter (Talent up to 3 points): You deal x3% increased damage to Close Enemies and gain 2% Distant Damage Reduction
        if (toggleVal(nodes_map, 'enemy-distant')) {
          Damage_Received_Total *=
            1 - 0.02 * talentVal(nodes_map, 'pit-fighter')
        }

        // Combat Flay: When Flay deals direct damage to an enemy, you gain 3% Damage Reduction and 50 Thorns for 3 seconds. This stacks up to 4 times.
        if (
          talentVal(nodes_map, 'combat-flay') > 0 &&
          'flay' in Pre_Sim_Node['skill_use_rate']
        ) {
          const Combat_Flay_Stacks =
            Pre_Sim_Node['skill_use_rate']['flay'] * 3 > 1
              ? 4
              : Pre_Sim_Node['skill_use_rate']['flay'] * 3
          Damage_Received_Total *= 1 - 0.03 * Combat_Flay_Stacks
        }

        // Combat Frenzy: You gain 8% Damage Reduction for each stack of Frenzy you currently have.
        const Frenzy_Stacks = statVal(nodes_map, 'Frenzy_Stacks')

        if (talentVal(nodes_map, 'combat-frenzy') > 0) {
          Damage_Received_Total *= 1 - 0.08 * Frenzy_Stacks
        }

        // Territorial: You gain 10% Damage Reduction against Close enemies.
        Damage_Received_Total *=
          1 -
          0.1 *
            Number(
              !toggleVal(nodes_map, 'enemy-distant') &&
                paragonVal(nodes_map, 'territorial'),
            )

        //Ire: While Berserking, you take 10% reduced damage from Elites.
        if (
          paragonVal(nodes_map, 'ire') &&
          toggleVal(nodes_map, 'enemy-elite')
        ) {
          Damage_Received_Total *=
            1 - 0.1 * statVal(nodes_map, 'Berserking_Uptime')
        }

        // Undaunted: You gain up to 10% Damage Reduction the more Fortify you have.
        Damage_Received_Total *=
          1 -
          0.1 *
            Number(toggleVal(nodes_map, 'percent-fortify')) *
            Number(paragonVal(nodes_map, 'undaunted'))

        // (Unique) Harlequin-Crest: "Gain {5/8}% damage Reduction .In addition, gain +2.0 Ranks to all Skills."
        if (aspectVal(nodes_map, 'harlequin-crest').length > 0) {
          Damage_Received_Total *=
            1 - aspectVal(nodes_map, 'harlequin-crest')[0]
        }

        // aspect-of-the-Deflecting-Barrier: While you have a Barrier active, there is a {7/13}% chance to ignore incoming direct damage from Distant enemies.
        if (
          aspectVal(nodes_map, 'aspect-of-the-deflecting-barrier')
            .length > 0 &&
          toggleVal(nodes_map, 'enemy-distant') &&
          Number(toggleVal(nodes_map, 'percent-barrier')) > 0
        ) {
          Damage_Received_Total *=
            1 -
            aspectVal(
              nodes_map,
              'aspect-of-the-deflecting-barrier',
            )[0]
        }

        // Doombringer: Lucky Hit: Up to a [0.7|%|] chance to deal 0.7*825 Shadow damage to surrounding enemies and reduce their damage done by 20% for 3 seconds.
        if (aspectVal(nodes_map, 'doombringer').length > 0) {
          let Doombringer_Rate = 0
          for (const skill in Pre_Sim_Node['skill_use_rate']) {
            Doombringer_Rate +=
              aspectVal(nodes_map, 'doombringer')[0] *
              Pre_Sim_Node['skill_use_rate'][skill] *
              Pre_Sim_Node['cross_skill_stat'][skill][
                'lucky_hit_chance'
              ] *
              Pre_Sim_Node['cross_skill_stat'][skill]['total_hits']
          }
          Damage_Received_Total *=
            1 - 0.2 * Math.min(Doombringer_Rate * 3, 1)
        }

        // Soulbrand (Unique Generic Chest): Your Healing Potion no longer Heals instantly, instead it grants a Barrier for 200% of the healing for 4 seconds. While you have a Barrier, you gain 10-20% Damage Reduction.
        if (
          aspectVal(nodes_map, 'soulbrand').length > 0 &&
          Number(toggleVal(nodes_map, 'percent-barrier')) > 0
        ) {
          Damage_Received_Total *=
            1 - aspectVal(nodes_map, 'soulbrand')[0]
        }

        // Vampiric Power resilience
        // You gain 1% Damage Reduction for each 2% Life you are missing.
        if (vampiricPowerVal(nodes_map, 'resilience')) {
          Damage_Received_Total *=
            1 -
            0.005 * (1 - Number(toggleVal(nodes_map, 'percent-life')))
        }

        // Vampiric Power bathe-in-blood
        // While Channeling a Skill, you form a pool of blood beneath you. While channeling a skill in a pool, your Channeled Skills deal 40% increased damage and you gain 30% Damage Reduction. A pool can only form once every 8 seconds.
        if (
          vampiricPowerVal(nodes_map, 'bathe-in-blood') &&
          'whirlwind' in Pre_Sim_Node['skill_use_rate']
        ) {
          Damage_Received_Total *= 0.7
        }

        return 1 - Damage_Received_Total
      },
    ),

    Player_Damage_Reduction_Over_Time: new StatsNode(
      'Player_Damage_Reduction_Over_Time',
      () => {
        let Damage_Received_Over_Time =
          1 - statVal(nodes_map, 'Player_Damage_Reduction')

        // damage-taken-over-time-reduction
        Damage_Received_Over_Time *=
          1 -
          aggregationVal(
            nodes_map,
            'damage-taken-over-time-reduction',
          )

        return 1 - Damage_Received_Over_Time
      },
    ),

    Total_Dodge_Chance: new StatsNode('Total_Dodge_Chance', () => {
      const Pre_Sim_Node = barbarianPresimVal(nodes_map)
      let Total_Dodge_Chance =
        aggregationVal(nodes_map, 'dodge-chance') +
        statVal(nodes_map, 'Total_Dexterity') * 0.0001

      Total_Dodge_Chance += toggleVal(nodes_map, 'enemy-distant')
        ? aggregationVal(
            nodes_map,
            'dodge-chance-against-distant-enemies',
          )
        : aggregationVal(
            nodes_map,
            'dodge-chance-against-close-enemies',
          )

      // Assimilation-aspect: You have +8.0% increased Dodge chance versus enemies affected by damage Over Time effects. When you Dodge you gain {5/10} of your Primary Resource.
      if (aspectVal(nodes_map, 'assimilation-aspect').length > 0) {
        Total_Dodge_Chance +=
          0.08 * Math.min(Pre_Sim_Node['dot_uptime'], 1)
      }

      return Total_Dodge_Chance
    }),

    Total_Strength: new StatsNode('Total_Strength', () => {
      let Strength = baseStatVal(nodes_map)['Strength']

      // Altar of Lilith
      const Strength_Altars = [
        0, 0, 0, 0, 0, 2, 4, 4, 4, 6, 6, 6, 6, 8, 8, 8, 10, 10, 10,
        10, 12, 12, 12, 14, 14, 16, 16, 16, 16, 16, 16, 16, 18, 18,
        18, 18, 18, 18, 18, 20, 20, 20, 20, 20, 20, 22, 22, 22, 24,
        24, 24, 24, 24, 24, 24, 26, 26, 26, 26, 26, 26, 26, 26, 28,
        28, 28, 30, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32,
        32, 34, 34, 34, 34, 34, 36, 36, 36, 38, 38, 38, 40, 42, 42,
        42, 42, 42, 42, 42, 42, 42, 44, 44, 44, 44, 46, 46, 46, 48,
        48, 48, 48, 48, 48, 48, 50, 50, 52, 54, 54, 54, 54, 54, 56,
        56, 56, 56, 56, 58, 60, 60, 60, 60, 60, 60, 60, 60, 60, 60,
        60, 60, 60, 60, 60, 60, 62, 62, 62, 64, 66, 68, 68, 68, 68,
        68, 68, 68, 68, 68, 68, 68,
      ]
      Strength +=
        Strength_Altars[
          Number(toggleVal(nodes_map, 'altars-of-lilith-gathered'))
        ]

      // strength
      Strength += aggregationVal(nodes_map, 'strength')

      // all stats
      Strength += aggregationVal(nodes_map, 'all-stats')

      // %-strength
      Strength *= 1 + aggregationVal(nodes_map, '%-strength')

      return Math.round(Strength)
    }),

    Total_Intelligence: new StatsNode('Total_Intelligence', () => {
      let Intelligence = baseStatVal(nodes_map)['Intelligence']

      // Altar of Lilith
      const Intelligence_Altars = [
        0, 0, 0, 2, 2, 2, 2, 2, 4, 4, 4, 4, 4, 4, 4, 6, 6, 6, 6, 6, 6,
        6, 6, 6, 6, 6, 6, 8, 10, 12, 12, 12, 12, 12, 12, 12, 14, 14,
        16, 16, 18, 20, 20, 20, 20, 20, 20, 22, 22, 24, 24, 24, 26,
        26, 28, 28, 28, 28, 28, 28, 30, 30, 30, 30, 30, 30, 30, 30,
        30, 30, 30, 30, 30, 30, 32, 32, 34, 36, 36, 36, 36, 36, 36,
        36, 36, 36, 38, 40, 40, 40, 40, 40, 40, 40, 40, 40, 40, 40,
        42, 42, 44, 44, 46, 46, 46, 46, 46, 48, 48, 48, 48, 50, 50,
        50, 52, 52, 52, 52, 52, 54, 54, 54, 54, 54, 54, 54, 54, 54,
        54, 54, 56, 56, 58, 58, 60, 62, 62, 62, 64, 64, 64, 64, 64,
        64, 64, 64, 64, 64, 64, 64, 64, 66, 68, 68, 68, 68, 68, 68,
        68, 68, 68,
      ]
      Intelligence +=
        Intelligence_Altars[
          Number(toggleVal(nodes_map, 'altars-of-lilith-gathered'))
        ]

      // intelligence
      Intelligence += aggregationVal(nodes_map, 'intelligence')

      // all stats
      Intelligence += aggregationVal(nodes_map, 'all-stats')

      // %-intelligence
      Intelligence *= 1 + aggregationVal(nodes_map, '%-intelligence')

      return Math.round(Intelligence)
    }),

    Total_Dexterity: new StatsNode('Total_Dexterity', () => {
      let Dexterity = baseStatVal(nodes_map)['Dexterity']

      // Altar of Lilith
      const Dexterity_Altars = [
        0, 2, 2, 2, 4, 4, 4, 4, 4, 4, 6, 6, 8, 8, 8, 8, 8, 8, 8, 8, 8,
        8, 8, 8, 8, 8, 8, 8, 8, 8, 10, 10, 10, 10, 12, 14, 14, 14, 14,
        14, 14, 14, 16, 16, 16, 16, 18, 18, 18, 18, 18, 20, 20, 22,
        22, 22, 24, 26, 26, 26, 26, 26, 26, 26, 26, 26, 26, 26, 28,
        28, 28, 30, 32, 32, 32, 32, 32, 32, 34, 34, 34, 36, 36, 36,
        36, 36, 36, 36, 36, 38, 40, 40, 40, 42, 42, 42, 44, 44, 44,
        44, 44, 44, 44, 44, 46, 46, 46, 46, 46, 46, 46, 46, 48, 48,
        48, 48, 48, 48, 48, 48, 48, 50, 50, 50, 52, 54, 54, 54, 54,
        54, 54, 54, 54, 54, 54, 54, 56, 58, 58, 58, 58, 58, 58, 60,
        60, 60, 62, 64, 64, 64, 64, 64, 64, 64, 64, 64, 66, 66, 66,
        68, 68,
      ]
      Dexterity +=
        Dexterity_Altars[
          Number(toggleVal(nodes_map, 'altars-of-lilith-gathered'))
        ]

      // dexterity
      Dexterity += aggregationVal(nodes_map, 'dexterity')

      // all stats
      Dexterity += aggregationVal(nodes_map, 'all-stats')

      // %-dexterity
      Dexterity *= 1 + aggregationVal(nodes_map, '%-dexterity')

      return Math.round(Dexterity)
    }),

    Total_Willpower: new StatsNode('Total_Willpower', () => {
      let Willpower = baseStatVal(nodes_map)['Willpower']

      // Altar of Lilith
      const Willpower_Altars = [
        0, 0, 2, 2, 2, 2, 2, 2, 2, 2, 2, 4, 4, 4, 4, 4, 4, 4, 6, 8, 8,
        10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 12, 12, 12,
        12, 14, 14, 14, 14, 14, 14, 16, 18, 18, 18, 18, 18, 18, 20,
        20, 20, 20, 20, 20, 20, 20, 22, 22, 22, 22, 24, 24, 26, 28,
        28, 28, 28, 30, 30, 30, 30, 32, 32, 34, 34, 34, 34, 34, 34,
        34, 36, 38, 38, 38, 38, 38, 38, 38, 38, 38, 38, 38, 38, 38,
        38, 38, 38, 40, 40, 40, 40, 42, 42, 42, 42, 42, 42, 42, 42,
        42, 42, 42, 42, 42, 44, 44, 44, 44, 46, 46, 48, 48, 48, 48,
        50, 50, 50, 50, 50, 50, 50, 50, 50, 50, 50, 50, 50, 52, 54,
        56, 58, 58, 60, 60, 60, 60, 60, 60, 60, 60, 60, 60, 60, 62,
        62, 64, 66, 66, 68,
      ]
      Willpower +=
        Willpower_Altars[
          Number(toggleVal(nodes_map, 'altars-of-lilith-gathered'))
        ]

      // Willpower
      Willpower += aggregationVal(nodes_map, 'willpower')

      // all stats
      Willpower += aggregationVal(nodes_map, 'all-stats')

      // %-Willpower
      Willpower *= 1 + aggregationVal(nodes_map, '%-willpower')

      return Math.round(Willpower)
    }),

    Total_Armor: new StatsNode('Total_Armor', () => {
      let Armor = statVal(nodes_map, 'Total_Strength')
      const Pre_Sim_Node = barbarianPresimVal(nodes_map)

      // armor
      Armor += aggregationVal(nodes_map, 'armor')

      // total-armor
      Armor *= 1 + aggregationVal(nodes_map, 'total-armor')

      // Aspect of Disobedience: You gain [0.25-0.50]%[x] increased Armor for 4 seconds when you deal any form of damage, stacking up to [15.00-66.00]%[x]/*
      if (
        aspectVal(nodes_map, 'aspect-of-disobedience').length != 0
      ) {
        let Aspect_Of_Disobedience_Rate = 0
        for (const Other_Skill in Pre_Sim_Node['skill_use_rate']) {
          Aspect_Of_Disobedience_Rate +=
            Pre_Sim_Node['skill_use_rate'][Other_Skill] *
            Pre_Sim_Node['cross_skill_stat'][Other_Skill][
              'total_hits'
            ]
        }
        Armor *=
          1 +
          aspectVal(nodes_map, 'aspect-of-disobedience')[0] *
            Math.min(132, Aspect_Of_Disobedience_Rate * 4)
      }

      return Math.floor(Armor)
    }),

    Resistance_Cold: new StatsNode('Resistance_Cold', () => {
      // S2 Change: Resistances have a cap at 70% and can be expanded to up to 85%
      let Cold_Resistance_Cap = 0.7

      const mod_resist =
        aggregationVal(nodes_map, 'cold-resistance') +
        aggregationVal(nodes_map, 'resistance-to-all-elements')

      const int_resist =
        statVal(nodes_map, 'Total_Intelligence') * 0.00025

      let World_Tier_Penalty = 0
      if (toggleVal(nodes_map, 'world-tier') == 3) {
        World_Tier_Penalty = 0.25
      }
      if (
        toggleVal(nodes_map, 'world-tier') == 4 ||
        toggleVal(nodes_map, 'world-tier') == 5
      ) {
        World_Tier_Penalty = 0.5
      }

      // Tassets of the Dawning Sky (Generic Unique Pants): When you take damage from a Non-Physical damage type, you gain +6-10% Maximum Resistance to that damage type for 6 seconds. This effect can only apply to one damage type at a time.
      if (
        aspectVal(nodes_map, 'tassets-of-the-dawning-sky').length > 0
      ) {
        const Tassets_Of_The_Dawning_Sky_Uptime = Math.min(
          1,
          6 / (6 + statVal(nodes_map, 'Enemy_Attacks_Per_Second')),
        )
        Cold_Resistance_Cap +=
          aspectVal(nodes_map, 'tassets-of-the-dawning-sky')[0] *
          Tassets_Of_The_Dawning_Sky_Uptime
      }

      return Math.min(
        Math.min(Cold_Resistance_Cap, 0.85),
        mod_resist + int_resist - World_Tier_Penalty,
      )
    }),

    Resistance_Fire: new StatsNode('Resistance_Fire', () => {
      // S2 Change: Resistances have a cap at 70% and can be expanded to up to 85%
      let Fire_Resistance_Cap = 0.7

      const mod_resist =
        aggregationVal(nodes_map, 'fire-resistance') +
        aggregationVal(nodes_map, 'resistance-to-all-elements')

      const int_resist =
        statVal(nodes_map, 'Total_Intelligence') * 0.00025

      let World_Tier_Penalty = 0
      if (toggleVal(nodes_map, 'world-tier') == 3) {
        World_Tier_Penalty = 0.25
      }
      if (
        toggleVal(nodes_map, 'world-tier') == 4 ||
        toggleVal(nodes_map, 'world-tier') == 5
      ) {
        World_Tier_Penalty = 0.5
      }

      // Tassets of the Dawning Sky (Generic Unique Pants): When you take damage from a Non-Physical damage type, you gain +6-10% Maximum Resistance to that damage type for 6 seconds. This effect can only apply to one damage type at a time.
      if (
        aspectVal(nodes_map, 'tassets-of-the-dawning-sky').length > 0
      ) {
        const Tassets_Of_The_Dawning_Sky_Uptime = Math.min(
          1,
          6 / (6 + statVal(nodes_map, 'Enemy_Attacks_Per_Second')),
        )
        Fire_Resistance_Cap +=
          aspectVal(nodes_map, 'tassets-of-the-dawning-sky')[0] *
          Tassets_Of_The_Dawning_Sky_Uptime
      }

      return Math.min(
        Math.min(Fire_Resistance_Cap, 0.85),
        mod_resist + int_resist - World_Tier_Penalty,
      )
    }),

    Resistance_Lightning: new StatsNode(
      'Resistance_Lightning',
      () => {
        // S2 Change: Resistances have a cap at 70% and can be expanded to up to 85%
        let Lightning_Resistance_Cap = 0.7

        const mod_resist =
          aggregationVal(nodes_map, 'lightning-resistance') +
          aggregationVal(nodes_map, 'resistance-to-all-elements')

        const int_resist =
          statVal(nodes_map, 'Total_Intelligence') * 0.00025

        let World_Tier_Penalty = 0
        if (toggleVal(nodes_map, 'world-tier') == 3) {
          World_Tier_Penalty = 0.25
        }
        if (
          toggleVal(nodes_map, 'world-tier') == 4 ||
          toggleVal(nodes_map, 'world-tier') == 5
        ) {
          World_Tier_Penalty = 0.5
        }

        // Tassets of the Dawning Sky (Generic Unique Pants): When you take damage from a Non-Physical damage type, you gain +6-10% Maximum Resistance to that damage type for 6 seconds. This effect can only apply to one damage type at a time.
        if (
          aspectVal(nodes_map, 'tassets-of-the-dawning-sky').length >
          0
        ) {
          const Tassets_Of_The_Dawning_Sky_Uptime = Math.min(
            1,
            6 / (6 + statVal(nodes_map, 'Enemy_Attacks_Per_Second')),
          )
          Lightning_Resistance_Cap +=
            aspectVal(nodes_map, 'tassets-of-the-dawning-sky')[0] *
            Tassets_Of_The_Dawning_Sky_Uptime
        }

        return Math.min(
          Math.min(Lightning_Resistance_Cap, 0.85),
          mod_resist + int_resist - World_Tier_Penalty,
        )
      },
    ),

    Resistance_Poison: new StatsNode('Resistance_Poison', () => {
      // S2 Change: Resistances have a cap at 70% and can be expanded to up to 85%
      let Poison_Resistance_Cap = 0.7

      const mod_resist =
        aggregationVal(nodes_map, 'poison-resistance') +
        aggregationVal(nodes_map, 'resistance-to-all-elements')

      const int_resist =
        statVal(nodes_map, 'Total_Intelligence') * 0.00025

      let World_Tier_Penalty = 0
      if (toggleVal(nodes_map, 'world-tier') == 3) {
        World_Tier_Penalty = 0.25
      }
      if (
        toggleVal(nodes_map, 'world-tier') == 4 ||
        toggleVal(nodes_map, 'world-tier') == 5
      ) {
        World_Tier_Penalty = 0.5
      }

      // Tassets of the Dawning Sky (Generic Unique Pants): When you take damage from a Non-Physical damage type, you gain +6-10% Maximum Resistance to that damage type for 6 seconds. This effect can only apply to one damage type at a time.
      if (
        aspectVal(nodes_map, 'tassets-of-the-dawning-sky').length > 0
      ) {
        const Tassets_Of_The_Dawning_Sky_Uptime = Math.min(
          1,
          6 / (6 + statVal(nodes_map, 'Enemy_Attacks_Per_Second')),
        )
        Poison_Resistance_Cap +=
          aspectVal(nodes_map, 'tassets-of-the-dawning-sky')[0] *
          Tassets_Of_The_Dawning_Sky_Uptime
      }

      return Math.min(
        Math.min(Poison_Resistance_Cap, 0.85),
        mod_resist + int_resist - World_Tier_Penalty,
      )
    }),

    Resistance_Shadow: new StatsNode('Resistance_Shadow', () => {
      // S2 Change: Resistances have a cap at 70% and can be expanded to up to 85%
      let Shadow_Resistance_Cap = 0.7

      const mod_resist =
        aggregationVal(nodes_map, 'shadow-resistance') +
        aggregationVal(nodes_map, 'resistance-to-all-elements')

      const int_resist =
        statVal(nodes_map, 'Total_Intelligence') * 0.00025

      let World_Tier_Penalty = 0
      if (toggleVal(nodes_map, 'world-tier') == 3) {
        World_Tier_Penalty = 0.25
      }
      if (
        toggleVal(nodes_map, 'world-tier') == 4 ||
        toggleVal(nodes_map, 'world-tier') == 5
      ) {
        World_Tier_Penalty = 0.5
      }

      // Tassets of the Dawning Sky (Generic Unique Pants): When you take damage from a Non-Physical damage type, you gain +6-10% Maximum Resistance to that damage type for 6 seconds. This effect can only apply to one damage type at a time.
      if (
        aspectVal(nodes_map, 'tassets-of-the-dawning-sky').length > 0
      ) {
        const Tassets_Of_The_Dawning_Sky_Uptime = Math.min(
          1,
          6 / (6 + statVal(nodes_map, 'Enemy_Attacks_Per_Second')),
        )
        Shadow_Resistance_Cap +=
          aspectVal(nodes_map, 'tassets-of-the-dawning-sky')[0] *
          Tassets_Of_The_Dawning_Sky_Uptime
      }

      return Math.min(
        Math.min(Shadow_Resistance_Cap, 0.85),
        mod_resist + int_resist - World_Tier_Penalty,
      )
    }),

    Bonus_Healing_Received: new StatsNode(
      'Bonus_Healing_Received',
      () => {
        let Increased_Healing_Received = 0

        Increased_Healing_Received += aggregationVal(
          nodes_map,
          'healing-received',
        )

        return Increased_Healing_Received
      },
    ),

    Life_On_Hit: new StatsNode('Life_On_Hit', () => {
      const Life_On_Hit = 0

      // life-steal

      // life-on-kill

      // up-to-a-5%-chance-to-heal-life

      return Life_On_Hit
    }),

    Life_Regeneration: new StatsNode('Life_Regeneration', () => {
      const Life_Regeneration_Total = 0

      // healing-over-time
      return Life_Regeneration_Total
    }),

    Control_Impaired_Duration_Reduction: new StatsNode(
      'Control_Impaired_Duration_Reduction',
      () => {
        let Control_Impaired_Duration_Reduction = 1

        // 'control-impaired-duration-reduction'
        Control_Impaired_Duration_Reduction *=
          1 -
          aggregationVal(
            nodes_map,
            'control-impaired-duration-reduction',
          )

        return Control_Impaired_Duration_Reduction
      },
    ),

    Potion_Charges: new StatsNode('Potion_Charges', () => {
      let Potion_Charges_Number = 9

      // 'potion-charges'
      Potion_Charges_Number += aggregationVal(
        nodes_map,
        'potion-charges',
      )

      return Potion_Charges_Number
    }),
    /*--------------------------------------------------
                    MICELLANEOUS NODES
        --------------------------------------------------*/

    Enemy_Crowd_Controlled: new StatsNode(
      'Enemy_Crowd_Controlled',
      () => {
        if (!toggleVal(nodes_map, 'enemy-boss')) {
          return (
            1 -
            (1 - Number(toggleVal(nodes_map, 'enemy-slowed'))) *
              (1 - Number(toggleVal(nodes_map, 'enemy-dazed'))) *
              (1 - Number(toggleVal(nodes_map, 'enemy-stunned'))) *
              (1 - Number(toggleVal(nodes_map, 'enemy-frozen'))) *
              (1 - Number(toggleVal(nodes_map, 'enemy-chilled'))) *
              (1 -
                Number(toggleVal(nodes_map, 'enemy-knocked-down'))) *
              (1 - Number(toggleVal(nodes_map, 'enemy-immobilized')))
          )
        } else {
          return 0
        }
      },
    ),

    Enemy_Chilled: new StatsNode('Enemy_Chilled', () => {
      return (
        1 -
        (1 - Number(toggleVal(nodes_map, 'enemy-frozen'))) *
          (1 - Number(toggleVal(nodes_map, 'enemy-chilled')))
      )
    }),

    Enemy_Immobilized: new StatsNode('Enemy_Immobilized', () => {
      return (
        1 -
        (1 - Number(toggleVal(nodes_map, 'enemy-stunned'))) *
          (1 - Number(toggleVal(nodes_map, 'enemy-frozen'))) *
          (1 - Number(toggleVal(nodes_map, 'enemy-immobilized')))
      )
    }),

    Enemy_Vulnerable: new StatsNode('Enemy_Vulnerable', () => {
      let Vulnerable_Uptime = 0
      if (toggleVal(nodes_map, 'enemy-vulnerable')) {
        return 1
      }

      if (vampiricPowerVal(nodes_map, 'prey-on-the-weak')) {
        Vulnerable_Uptime += statVal(
          nodes_map,
          'Vampiric_Curse_Uptime',
        )
      }

      return Math.min(1, Vulnerable_Uptime)
    }),

    Max_Resource: new StatsNode('Max_Resource', () => {
      // Created This node for Resource Generation based on % Maximum Resource
      let Max_Resource = 100

      // maximum-fury (Barbarian)
      Max_Resource +=
        aggregationVal(nodes_map, 'maximum-fury') +
        aggregationVal(nodes_map, 'maximum-resource')

      Max_Resource += 3 * talentVal(nodes_map, 'tempered-fury')

      // melted-heart-of-selig Gain 60 maximum Resource. 75% of incoming damage drains 2 Resource for every 1% of Life you would have lost instead.
      if (aspectVal(nodes_map, 'melted-heart-of-selig').length > 0) {
        Max_Resource += 60
      }

      return Max_Resource
    }),

    Resource_Gain_Per_Cast: new StatsNode(
      'Resource_Gain_Per_Cast',
      () => {
        const number_of_enemies = Number(
          toggleVal(nodes_map, 'number-of-enemies'),
        )
        const enemy_spread = Number(
          statVal(nodes_map, 'Enemy_Spread'),
        )
        const Pre_Sim_Node = barbarianPresimVal(nodes_map)
        let Resource_Gain_Per_Cast = Math.max(
          currentSkillVal(nodes_map)['base_resources_generated'],
          0,
        )

        // Enhanced Frenzy: If Frenzy has at least 3 stacks, it generates 3 additional fury.
        const Frenzy_Stacks = statVal(nodes_map, 'Frenzy_Stacks')
        if (
          talentVal(nodes_map, 'enhanced-frenzy') > 0 &&
          currentSkillVal(nodes_map)['name'] == 'frenzy' &&
          Frenzy_Stacks >= 3
        ) {
          Resource_Gain_Per_Cast += 3
        }

        // Tactical Ground Stomp Ground Stomp generates  40 Fury.
        if (
          currentSkillVal(nodes_map)['name'] == 'ground-stomp' &&
          talentVal(nodes_map, 'tactical-ground-stomp') > 0
        ) {
          Resource_Gain_Per_Cast += 40
        }

        // Power Leap: If Leap damages at least one enemy, gain 40 Fury
        if (
          currentSkillVal(nodes_map)['name'] == 'leap' &&
          talentVal(nodes_map, 'power-leap') > 0
        ) {
          Resource_Gain_Per_Cast += 40
        }

        // Slaking Aspect: Lucky Hit: You have up to a {40/60}% chance to gain 20.0 Fury when Rend deals direct damage to at least one Bleeding enemy.
        if (
          aspectVal(nodes_map, 'slaking-aspect').length != 0 &&
          currentSkillVal(nodes_map)['name'] == 'rend' &&
          toggleVal(nodes_map, 'enemy-bleeding')
        ) {
          Resource_Gain_Per_Cast +=
            20 *
            (aspectVal(nodes_map, 'slaking-aspect')[0] *
              statVal(nodes_map, 'Total_Lucky_Hit_Chance_Multiplier'))
        }

        // Fighters Death Blow: If Death Blow damages at least one enemy, gain 20 Fury
        if (
          currentSkillVal(nodes_map)['name'] == 'death-blow' &&
          talentVal(nodes_map, 'fighters-death-blow')
        ) {
          Resource_Gain_Per_Cast += 20
        }

        // Talent ['supreme-call-of-the-ancients', 1],//Each of the Ancients gains additional power:
        // Korlic: You gain 10 Fury each time Korlic damages an enemy with his Frenzy.
        // Talic: Enemies are Slowed by 50% for 1 second when damaged by his Whirlwind.
        // Madawc: 30% chance to Stun enemies for 3 seconds when using his Upheaval.
        if (
          talentVal(nodes_map, 'supreme-call-of-the-ancients') > 0 &&
          currentSkillVal(nodes_map)['name'] == 'call-of-the-ancients'
        ) {
          // 7 Frenzy - 39%
          Resource_Gain_Per_Cast += 70
        }

        // Aspect of Unrelenting Fury: Killing an enemy with a Core Skill refunds {10/20}% of its base Fury cost. Can only happen once per Skill cast.
        if (
          aspectVal(nodes_map, 'aspect-of-unrelenting-fury').length >
            0 &&
          currentSkillVal(nodes_map).category == 'core'
        ) {
          Resource_Gain_Per_Cast +=
            -currentSkillVal(nodes_map).base_resources_generated *
            aspectVal(nodes_map, 'aspect-of-unrelenting-fury')[0] *
            Math.min(1, statVal(nodes_map, 'Enemies_Killed'))
        }

        Resource_Gain_Per_Cast +=
          statVal(nodes_map, 'Resource_Gain_Per_Hit') *
          statVal(nodes_map, 'Total_Hits')

        Resource_Gain_Per_Cast *= statVal(
          nodes_map,
          'Total_Resource_Generation_Multiplier',
        )

        // Rallying Cry: Increases Movement speed by +30% and Resource Generation by x40% for 6 seconds
        if (allSkillsVal(nodes_map).has('rallying-cry')) {
          const Shout_Cooldown = statVal(nodes_map, 'Shout_Cooldown')
          const Shout_Duration_Mulipliter = statVal(
            nodes_map,
            'Shout_Duration_Multiplier',
          )
          // Tactical Rallying Cry: Rallying Cry Generates 20 Fury and grants you an additional x20% Resource Generation
          let Rallying_Cry_Bonus = 0
          if (talentVal(nodes_map, 'tactical-rallying-cry') == 1) {
            Rallying_Cry_Bonus += 20
          }
          Resource_Gain_Per_Cast +=
            Rallying_Cry_Bonus *
            Math.min(
              (6 * Shout_Duration_Mulipliter) / Shout_Cooldown,
              1,
            )
        }

        // Mothers Embrace: If a Core Skill hits 4 or more enemies, [[20 - 40]|%|] of the Resource cost is refunded.
        if (aspectVal(nodes_map, 'mothers-embrace').length > 0) {
          // p is the probability of extra hits.
          let p = 0
          switch (currentSkillVal(nodes_map)['name']) {
            case 'rend':
              p = ProbabilityInCone(10, 1 / 3, enemy_spread)
              break

            case 'double-swing':
              p = ProbabilityInCone(10, 1 / 3, enemy_spread)
              break

            case 'hammer-of-the-ancients':
              p = Math.min(15 ** 2 / enemy_spread ** 2, 1)
              break

            case 'upheaval':
              p = ProbabilityInCone(30, 1 / 8, enemy_spread)
              break

            case 'whirlwind':
              // Channeled skills hit twice per second.
              p = Math.min(10 ** 2 / enemy_spread ** 2, 1)
              break
          }
          Resource_Gain_Per_Cast +=
            -statVal(nodes_map, 'Resource_Cost_Per_Cast') *
            aspectVal(nodes_map, 'mothers-embrace')[0] *
            (1 - BinomialDistribution(number_of_enemies - 1, p, 3))
        }

        // Malignant Heart (All) the-malignant-pact:	Cycle through a Malignant bonus every 20 kills: Vicious: Gain {20/21/22...}% Attack Speed.
        //                                            Devious: Core and Basic Skills have a {15/16/17...}% chance to fully restore your Primary Resource.
        //                                            Brutal: Every {20/19/18..} seconds, gain a Barrier absorbing [flat value number] damage.
        if (
          malignantHeartVal(nodes_map, 'the-malignant-pact').length !=
          0
        ) {
          if (
            tagsVal(nodes_map).has('core') ||
            tagsVal(nodes_map).has('basic')
          ) {
            Resource_Gain_Per_Cast +=
              0.15 * statVal(nodes_map, 'Max_Resource') * (1 / 3)
          }
        }
        // Enhanced Double Swing: If Double Swing damages a Stunned or Knocked Down enemy, gain 25 Fury
        if (
          currentSkillVal(nodes_map)['name'] == 'double-swing' &&
          talentVal(nodes_map, 'enhanced-double-swing') > 0 &&
          (toggleVal(nodes_map, 'enemy-stunned') ||
            toggleVal(nodes_map, 'enemy-knocked-down'))
        ) {
          Resource_Gain_Per_Cast +=
            25 * statVal(nodes_map, 'Enemy_Boss_CC_Adjustment')
        }

        return Resource_Gain_Per_Cast
      },
    ),

    // Value is non-positive.
    Resource_Cost_Per_Cast: new StatsNode(
      'Resource_Cost_Per_Cast',
      () => {
        let Resource_Cost_Per_Cast = Math.min(
          currentSkillVal(nodes_map)['base_resources_generated'],
          0,
        )
        const Pre_Sim_Node = barbarianPresimVal(nodes_map)

        // Unbridled Rage (Talent 1 point): Core Skills deal x135% increased damage, but cost x100 more Fury
        if (
          talentVal(nodes_map, 'unbridled-rage') == 1 &&
          currentSkillVal(nodes_map)['category'] == 'core'
        ) {
          Resource_Cost_Per_Cast *= 2
        }

        // fury-cost-reduction
        Resource_Cost_Per_Cast *=
          1 - aggregationVal(nodes_map, 'fury-cost-reduction')

        return Resource_Cost_Per_Cast
      },
    ),

    Resource_Gain: new StatsNode('Resource_Gain', () => {
      const gain_per_cast = statVal(
        nodes_map,
        'Resource_Gain_Per_Cast',
      )
      const Number_Of_Cast = statVal(nodes_map, 'Number_Of_Cast')

      return gain_per_cast * Number_Of_Cast
    }),

    Resource_Cost: new StatsNode('Resource_Cost', () => {
      let cost_per_cast = statVal(nodes_map, 'Resource_Cost_Per_Cast')
      const Number_Of_Cast = statVal(nodes_map, 'Number_Of_Cast')

      if (
        currentSkillVal(nodes_map)['name'] == 'kick' &&
        talentVal(nodes_map, 'power-kick') > 0
      ) {
        cost_per_cast = Math.floor(
          statVal(nodes_map, 'Max_Resource') / 2,
        )
      }

      return cost_per_cast * Number_Of_Cast
    }),

    Delta_Resources_Per_Cast: new StatsNode(
      'Delta_Resources_Per_Cast',
      () => {
        const fury_gain = statVal(nodes_map, 'Resource_Gain_Per_Cast')
        const fury_cost = statVal(nodes_map, 'Resource_Cost_Per_Cast')

        return fury_gain + fury_cost
      },
    ),

    Delta_Resources: new StatsNode('Delta_Resources', () => {
      const delta_resources_per_cast = statVal(
        nodes_map,
        'Delta_Resources_Per_Cast',
      )

      const passive_resource_gain =
        statVal(nodes_map, 'Cast_Time') *
        statVal(nodes_map, 'Resource_Regeneration_Per_Second') *
        statVal(nodes_map, 'Total_Resource_Generation_Multiplier')

      const Number_Of_Cast = statVal(nodes_map, 'Number_Of_Cast')

      let Limitless_Rage_Cost = 0
      // Aspect of Limitless Rage: Each point of Fury you generate while at Maximum Fury grants your next Core Skill x{2/4}% increased damage, up to x{60/120}%.
      if (
        aspectVal(nodes_map, 'aspect-of-limitless-rage').length > 0 &&
        tagsVal(nodes_map).has('core')
      ) {
        Limitless_Rage_Cost = 30
      }

      return (
        (delta_resources_per_cast + passive_resource_gain) *
          Number_Of_Cast -
        Limitless_Rage_Cost
      )
    }),

    Total_Resource_Generation_Multiplier: new StatsNode(
      'Total_Resource_Generation_Multiplier',
      () => {
        const Pre_Sim_Node = barbarianPresimVal(nodes_map)
        const number_of_enemies = Number(
          toggleVal(nodes_map, 'number-of-enemies'),
        )
        const enemy_spread = Number(
          statVal(nodes_map, 'Enemy_Spread'),
        )

        let Resource_Gen_Multiplier_Total = 1

        // Total_Willpower
        Resource_Gen_Multiplier_Total +=
          0.001 * statVal(nodes_map, 'Total_Willpower')

        // resource-generation
        Resource_Gen_Multiplier_Total += aggregationVal(
          nodes_map,
          'resource-generation',
        )

        // Aspect of the Relentless Armsmaster: Gain x{20/36}% increased Fury Generation while all damage bonuses from the Walking Arsenal Key Passive are active.
        if (
          talentVal(nodes_map, 'walking-arsenal') != 0 &&
          aspectVal(nodes_map, 'aspect-of-the-relentless-armsmaster')
            .length != 0
        ) {
          Resource_Gen_Multiplier_Total +=
            aspectVal(
              nodes_map,
              'aspect-of-the-relentless-armsmaster',
            )[0] * statVal(nodes_map, 'Walking_Arsenal_Uptime')
        }

        // Prolific Fury (up to 3 Points): While Berserking, fury generation is increased by 6%
        Resource_Gen_Multiplier_Total +=
          0.06 *
          talentVal(nodes_map, 'prolific-fury') *
          statVal(nodes_map, 'Berserking_Uptime')

        // Rallying Cry: Increases Movement speed by +30% and Resource Generation by x40% for 6 seconds
        if (allSkillsVal(nodes_map).has('rallying-cry')) {
          const Shout_Cooldown = statVal(nodes_map, 'Shout_Cooldown')
          const Shout_Duration_Mulipliter = statVal(
            nodes_map,
            'Shout_Duration_Multiplier',
          )
          // Tactical Rallying Cry: Rallying Cry Generates 20 Fury and grants you an additional x40% Resource Generation
          let Rallying_Cry_Bonus =
            0.4 *
            (0.9 + 0.1 * (talentVal(nodes_map, 'rallying-cry') - 1))
          if (talentVal(nodes_map, 'tactical-rallying-cry') == 1) {
            Rallying_Cry_Bonus += 0.2
          }
          Resource_Gen_Multiplier_Total +=
            Rallying_Cry_Bonus *
            Math.min(
              (6 * Shout_Duration_Mulipliter) / Shout_Cooldown,
              1,
            )
        }

        // Prime Wrath of the Berserker: While active gain x30% Fury Generation.
        if (
          allSkillsVal(nodes_map).has('wrath-of-the-berserker') &&
          talentVal(nodes_map, 'prime-wrath-of-the-berserker') == 1
        ) {
          Resource_Gen_Multiplier_Total *=
            1 +
            0.3 *
              Math.min(
                10 /
                  statVal(
                    nodes_map,
                    'Wrath_Of_The_Berserker_Cooldown',
                  ),
                1,
              )
        }

        // Enhanced Hammer of the Ancients: Gain 3% more fury for 5 secs for each enemy hit by Hammer of the Ancients. Stacks up to 10 times.
        const Hota_Total_Hits =
          1 +
          Math.min(15 ** 2 / enemy_spread ** 2, 1) *
            (number_of_enemies - 1)
        if (
          'hammer-of-the-ancients' in
            Pre_Sim_Node['skill_use_rate'] &&
          talentVal(nodes_map, 'enhanced-hammer-of-the-ancients') > 0
        ) {
          const Enhanced_Hammer_Stacks =
            5 *
              Pre_Sim_Node['skill_use_rate'][
                'hammer-of-the-ancients'
              ] *
              Hota_Total_Hits >
            1
              ? 10
              : 5 *
                Pre_Sim_Node['skill_use_rate'][
                  'hammer-of-the-ancients'
                ] *
                Hota_Total_Hits
          Resource_Gen_Multiplier_Total *=
            1 + 0.03 * Enhanced_Hammer_Stacks
        }

        // (Talent) Endless Fury: Basic Skills generate x7% (max 3 points) more Fury when using Two-Handed Weapons
        if (
          currentSkillVal(nodes_map)['category'] == 'basic' &&
          talentVal(nodes_map, 'endless-fury') > 0 &&
          (statVal(nodes_map, 'Weapon_Type') == 1 ||
            statVal(nodes_map, 'Weapon_Type') == 2)
        ) {
          Resource_Gen_Multiplier_Total *=
            1 + 0.07 * talentVal(nodes_map, 'endless-fury')
        }

        // Malignant Heart (All) determination:	Resource draining effects are [50 - 60]% less effective. In addition, gain [3 - 8]% increased Resource Generation.
        if (
          malignantHeartVal(nodes_map, 'determination').length != 0
        ) {
          Resource_Gen_Multiplier_Total *=
            1 + malignantHeartVal(nodes_map, 'determination')[1]
        }

        return Resource_Gen_Multiplier_Total
      },
    ),

    Resource_Gain_Per_Hit: new StatsNode(
      'Resource_Gain_Per_Hit',
      () => {
        const Lucky_Hit_Chance_Multiplier = statVal(
          nodes_map,
          'Total_Lucky_Hit_Chance_Multiplier',
        )
        let Fury_Gain_Per_Hit = 0

        // 1-H Sword Expertise: Lucky Hit: Up to a 10% chance to gain 5 Fury when hitting a Crowd Controlled enemy. Double this chance when using two Swords.
        if (
          (statVal(nodes_map, 'Weapon_Type') == 0 &&
            statVal(nodes_map, 'Enemy_Crowd_Controlled') == 1) ||
          (expertiseVal(nodes_map) == 'sword' &&
            statVal(nodes_map, 'Enemy_Crowd_Controlled') == 1)
        ) {
          if (expertiseVal(nodes_map) == 'sword') {
            Fury_Gain_Per_Hit += 5 * 0.2 * Lucky_Hit_Chance_Multiplier
          } else {
            if (aggregationVal(nodes_map, 'main-hand-weapon') == 0) {
              Fury_Gain_Per_Hit +=
                5 * (0.1 * Lucky_Hit_Chance_Multiplier)
            }
            if (aggregationVal(nodes_map, 'off-hand-weapon') == 0) {
              Fury_Gain_Per_Hit +=
                5 * (0.1 * Lucky_Hit_Chance_Multiplier)
            }
          }
        }

        //2H Mace Expertise: Lucky Hit: Up to a 10% chance to gain 2 Fury when hitting an enemy. The Fury gain is doubled while Berserking.
        if (statVal(nodes_map, 'Weapon_Type') == 2) {
          Fury_Gain_Per_Hit +=
            2 *
            (1 + statVal(nodes_map, 'Berserking_Uptime')) *
            (0.1 * Lucky_Hit_Chance_Multiplier)
        }

        // Battle Bash: Damaging a Stunned enemy with Bash generates an additional 3 Fury, or 4 fury if using a Two-Hand Weapon
        if (
          currentSkillVal(nodes_map)['name'] == 'bash' &&
          talentVal(nodes_map, 'battle-bash') > 0 &&
          toggleVal(nodes_map, 'enemy-stunned') == 1
        ) {
          Fury_Gain_Per_Hit +=
            3 * statVal(nodes_map, 'Enemy_Boss_CC_Adjustment')
          if (statVal(nodes_map, 'Weapon_Type') == 2) {
            Fury_Gain_Per_Hit +=
              1 * statVal(nodes_map, 'Enemy_Boss_CC_Adjustment')
          }
        }

        // Enhanced Whirlwind: Gain 1 Fury each time whirlwind deals direct damage to an enemy, or 3 fury against elite enemies
        if (
          currentSkillVal(nodes_map)['name'] == 'whirlwind' &&
          talentVal(nodes_map, 'enhanced-whirlwind') > 0
        ) {
          Fury_Gain_Per_Hit =
            1 +
            (2 * Number(toggleVal(nodes_map, 'enemy-elite'))) /
              (statVal(nodes_map, 'Total_Hits') + 0.0001)
        }

        // Furious Rend: Direct damage with Rend grants 4 Fury per enemy hit, up to a maximum 20 Fury
        if (
          currentSkillVal(nodes_map)['name'] == 'rend' &&
          talentVal(nodes_map, 'furious-rend') > 0
        ) {
          Fury_Gain_Per_Hit +=
            4 * Math.min(5, statVal(nodes_map, 'Total_Hits'))
        }

        // 'lucky-hit:-up-to-a-5%-chance-to-restore-primary-resource'
        Fury_Gain_Per_Hit +=
          0.05 *
          statVal(nodes_map, 'Total_Lucky_Hit_Chance_Multiplier') *
          aggregationVal(
            nodes_map,
            'lucky-hit:-up-to-a-5%-chance-to-restore-primary-resource',
          ) *
          statVal(nodes_map, 'Max_Resource')

        // Glyph Wrath: Skills that Critically Strike generate 3 Fury.
        if (paragonVal(nodes_map, 'wrath')) {
          if (
            !(
              currentSkillVal(nodes_map)['name'] == 'whirlwind' &&
              aspectVal(nodes_map, 'aspect-of-the-dire-whirlwind')
                .length > 0
            )
          ) {
            Fury_Gain_Per_Hit +=
              3 * statVal(nodes_map, 'Critical_Chance')
          }
        }

        return Fury_Gain_Per_Hit
      },
    ),

    Resource_Regeneration_Per_Second: new StatsNode(
      'Resource_Regeneration_Per_Second',
      () => {
        let Resource_Regeneration_Per_Second = 0
        let Draining_Per_Second = 0
        const Pre_Sim_Node = barbarianPresimVal(nodes_map)
        const number_of_enemies = Number(
          toggleVal(nodes_map, 'number-of-enemies'),
        )

        // Passive gain from taking damage. We say that you get 1 rage per normal hit and 5 rage per elite hit.
        Resource_Regeneration_Per_Second +=
          (number_of_enemies +
            4 *
              Number(
                toggleVal(nodes_map, 'enemy-elite') ||
                  toggleVal(nodes_map, 'enemy-boss'),
              )) *
          statVal(nodes_map, 'Enemy_Attacks_Per_Second')

        // https://www.youtube.com/watch?v=mUzzYVYx1qk&ab_channel=PatinatorTV
        // Echoing Fury Stacks per shout
        // Aspect of Echoing Fury: Your Shout Skills generate {6/10} Fury per second while active.
        if (
          aspectVal(nodes_map, 'aspect-of-echoing-fury').length != 0
        ) {
          const Number_Of_Shouts =
            Number(allSkillsVal(nodes_map).has('rallying-cry')) +
            Number(allSkillsVal(nodes_map).has('war-cry')) +
            Number(allSkillsVal(nodes_map).has('challenging-shout'))
          const Shout_Cooldown = statVal(nodes_map, 'Shout_Cooldown')
          const Shout_Duration_Mulipliter = statVal(
            nodes_map,
            'Shout_Duration_Multiplier',
          )
          const Shout_Uptime = Math.min(
            1,
            (6 * Shout_Duration_Mulipliter) / Shout_Cooldown,
          )
          Resource_Regeneration_Per_Second +=
            aspectVal(nodes_map, 'aspect-of-echoing-fury')[0] *
            Shout_Uptime *
            Number_Of_Shouts
        }

        // Aspect of Berserk Fury: You gain {3/6} Fury per second while Berserking.
        if (
          aspectVal(nodes_map, 'aspect-of-berserk-fury').length != 0
        ) {
          Resource_Regeneration_Per_Second +=
            aspectVal(nodes_map, 'aspect-of-berserk-fury')[0] *
            statVal(nodes_map, 'Berserking_Uptime')
        }

        // Aspect of Assimilation: You have 8% increased Dodge Chance versus enemies affected by Damage Over Time effects. When you Dodge, you gain [5 - 10] of your Primary Resource.
        if (aspectVal(nodes_map, 'assimilation-aspect').length != 0) {
          const Enemy_Attacks_Per_Second = statVal(
            nodes_map,
            'Enemy_Attacks_Per_Second',
          )
          Resource_Regeneration_Per_Second +=
            Enemy_Attacks_Per_Second *
            aspectVal(nodes_map, 'assimilation-aspect')[0] *
            statVal(nodes_map, 'Total_Dodge_Chance')
        }

        // Tuskhelm of Joritz the Mighty (Barbarian Unique Helm): When you gain Berserking while already Berserk, you have a 40-60% chance to become more enraged granting 15% (multiplicative damage) [x] increased damage, 2 Fury per second, and 10% Cooldown Reduction.
        if (
          aspectVal(nodes_map, 'tuskhelm-of-joritz-the-mighty')
            .length != 0 &&
          toggleVal(nodes_map, 'berserking')
        ) {
          Resource_Regeneration_Per_Second += 2
        }

        // Tactical Challenging Shout: While Challenging Shout is active, you gain 3 fury every time you take damage.
        if (
          talentVal(nodes_map, 'tactical-challenging-shout') > 0 &&
          allSkillsVal(nodes_map).has('challenging-shout')
        ) {
          const Uptime = Math.min(
            (6 * statVal(nodes_map, 'Shout_Duration_Multiplier')) /
              statVal(nodes_map, 'Shout_Cooldown'),
            1,
          )
          Resource_Regeneration_Per_Second +=
            3 *
            Uptime *
            statVal(nodes_map, 'Enemy_Attacks_Per_Second')
        }

        // Talent: ['furious-impulse', 3] Each time you swap weapons, gain 2 Fury
        if (talentVal(nodes_map, 'furious-impulse') > 0) {
          Resource_Regeneration_Per_Second +=
            2 *
            talentVal(nodes_map, 'furious-impulse') *
            Pre_Sim_Node['weapon_swap_rate']
        }

        // Legendary Paragon: 'weapons-master', Swapping weapons grants you 4% of your Maximum Fury.
        if (paragonVal(nodes_map, 'weapons-master')) {
          Resource_Regeneration_Per_Second +=
            statVal(nodes_map, 'Max_Resource') *
            0.04 *
            Pre_Sim_Node['weapon_swap_rate']
        }

        //  Works with both 1h and 2h swords https://www.reddit.com/r/diablo4/comments/1463kbg/does_seething_work_with_two_hand_swords_one_hand/
        // Legendary Paragon 'seething' While wielding a Sword, you gain 3 Fury when you kill an enemy.
        if (paragonVal(nodes_map, 'seething')) {
          if (
            statVal(nodes_map, 'Weapon_Type') == 0 &&
            (aggregationVal(nodes_map, 'main-hand-weapon') == 0 ||
              aggregationVal(nodes_map, 'off-hand-weapon') == 0)
          ) {
            Resource_Regeneration_Per_Second +=
              3 * statVal(nodes_map, 'Enemy_Kill_Rate')
          } else if (
            statVal(nodes_map, 'Weapon_Type') == 1 &&
            aggregationVal(nodes_map, 'two-hand-slashing-weapon') == 0
          ) {
            Resource_Regeneration_Per_Second +=
              3 * statVal(nodes_map, 'Enemy_Kill_Rate')
          }
        }

        // Glyph Wrath: Skills that Critically Strike generate 3 Fury.
        if (paragonVal(nodes_map, 'wrath')) {
          if (
            currentSkillVal(nodes_map)['name'] == 'whirlwind' &&
            aspectVal(nodes_map, 'aspect-of-the-dire-whirlwind')
              .length > 0 &&
            'whirlwind' in Pre_Sim_Node['skill_use_rate']
          ) {
            Resource_Regeneration_Per_Second +=
              3 *
              Pre_Sim_Node['skill_use_rate']['whirlwind'] *
              Pre_Sim_Node['cross_skill_stat']['whirlwind'][
                'critical_chance'
              ] *
              statVal(nodes_map, 'Cast_Time')
          }
        }

        // 100,000 steps: After gaining the final damage bonus from the Walking Arsenal Key Passive, you automatically cast Ground Stomp and gain [32 - 50] Fury. This cannot happen more than once every 30 seconds.
        //
        // Note: For simplicity, if the Walking Arsenal uptime > 0 then we assume this happens every 15 seconds.
        if (
          aspectVal(nodes_map, '100,000-steps').length != 0 &&
          statVal(nodes_map, 'Walking_Arsenal_Uptime') > 0
        ) {
          Resource_Regeneration_Per_Second +=
            aspectVal(nodes_map, '100,000-steps')[0] / 15
        }

        // melted-heart-of-selig Gain 60 maximum Resource. 75% of incoming damage drains 2 Resource for every 1% of Life you would have lost instead. S3 Changed
        // if (
        //   aspectVal(nodes_map, 'melted-heart-of-selig').length != 0
        // ) {
        //   Draining_Per_Second +=
        //     aspectVal(nodes_map, 'melted-heart-of-selig')[0] *
        //     statVal(nodes_map, 'Enemy_Attacks_Per_Second')
        // }

        // (Unique) Ramaladni's Magnum Opus: Skills using this weapon deal x{.2-.4}% increased damage per point of Fury you have, but you lose 2.0 Fury every second.
        if (
          aspectVal(nodes_map, 'ramaladnis-magnum-opus').length != 0
        ) {
          Draining_Per_Second += 2
        }

        // Tibault's Will (Generic Unique Pants): You deal 20-40% [x] increased damage while Unstoppable and for 4 seconds after. When you become Unstoppable, gain 50 of your Primary Resource.
        if (aspectVal(nodes_map, 'tibaults-will').length != 0) {
          let Tibaults_Proc_Rate = 0

          if (allSkillsVal(nodes_map).has('wrath-of-the-berserker')) {
            Tibaults_Proc_Rate +=
              1 /
              statVal(nodes_map, 'Wrath_Of_The_Berserker_Cooldown')
          }

          // Vampiric Power metamorphosis
          // When you Evade you turn into a cloud of bats, becoming Unstoppable for 4 seconds. Enemies along your path take 160% Physical damage and are inflicted with Vampiric Curse.
          if (vampiricPowerVal(nodes_map, 'metamorphosis')) {
            Tibaults_Proc_Rate += 1 / 5
          }

          // Aspect of the Iron Warrior: Iron Skin grants Unstoppable, and {18/28}% Damage Reduction.
          if (
            allSkillsVal(nodes_map).has('iron-skin') &&
            aspectVal(nodes_map, 'aspect-of-the-iron-warrior')
              .length != 0
          ) {
            Tibaults_Proc_Rate +=
              1 / statVal(nodes_map, 'Iron_Skin_Cooldown')
          }

          // Eluding-aspect: Becoming Injured while Crowd Controlled grants you Unstoppable for 4.0 seconds. This effect has a {20/40} second Cooldown.
          if (
            aspectVal(nodes_map, 'eluding-aspect').length != 0 &&
            Number(toggleVal(nodes_map, 'percent-life')) <= 0.35
          ) {
            Tibaults_Proc_Rate +=
              1 / aspectVal(nodes_map, 'eluding-aspect')[0]
          }

          Resource_Regeneration_Per_Second += 50 * Tibaults_Proc_Rate
        }

        // Vampiric Power feed-the-coven
        // Lucky Hit: Conjuration, Companion, Minion and Bat Familiar attacks have up to a 60% chance to restore 10 Primary Resource to you and increase your Damage by 10% for 4 seconds.
        if (vampiricPowerVal(nodes_map, 'feed-the-coven')) {
          const Minion_Lucky_Hit_Chance = 0.3 // completely made up value taken from bat stun chance on another vampiric power
          Resource_Regeneration_Per_Second +=
            10 *
            statVal(nodes_map, 'Vampiric_Bat_Rate') *
            Minion_Lucky_Hit_Chance
        }

        return Resource_Regeneration_Per_Second - Draining_Per_Second
      },
    ),

    Resource_On_Kill: new StatsNode('Resource_On_Kill', () => {
      let Resource_On_Kill_Total = 0

      // fury-on-kill (Barbarian)
      Resource_On_Kill_Total += aggregationVal(
        nodes_map,
        'fury-on-kill',
      )

      return Resource_On_Kill_Total
    }),

    Total_Lucky_Hit_Chance_Multiplier: new StatsNode(
      'Total_Lucky_Hit_Chance_Multiplier',
      () => {
        let Lucky_Hit_Chance_Bonus_Total = 0
        const Pre_Sim_Node = barbarianPresimVal(nodes_map)

        // lucky-hit-chance
        Lucky_Hit_Chance_Bonus_Total += aggregationVal(
          nodes_map,
          'lucky-hit-chance',
        )

        // lucky-hit-chance-while-you-have-a-barrier
        if (Number(toggleVal(nodes_map, 'percent-barrier')) > 0) {
          Lucky_Hit_Chance_Bonus_Total += aggregationVal(
            nodes_map,
            'lucky-hit-chance-while-you-have-a-barrier',
          )
        }

        // lucky-hit-chance-with-fire-damage
        if (currentSkillVal(nodes_map)['tags'].has('fire')) {
          Lucky_Hit_Chance_Bonus_Total += aggregationVal(
            nodes_map,
            'lucky-hit-chance-with-fire-damage',
          )
        }

        // Luckbringer Aspect: Gain x{12/20}% increased Lucky Hit Chance while all damage bonuses from the Walking Arsenal Key Passive are active.
        if (aspectVal(nodes_map, 'luckbringer-aspect').length != 0) {
          const Walking_Arsenal_Uptime = statVal(
            nodes_map,
            'Walking_Arsenal_Uptime',
          )
          Lucky_Hit_Chance_Bonus_Total *=
            1 +
            aspectVal(nodes_map, 'luckbringer-aspect')[0] *
              Walking_Arsenal_Uptime
        }

        // Polearm Expertise: x10% increased Lucky Hit Chance.
        if (
          (statVal(nodes_map, 'Weapon_Type') == 1 &&
            aggregationVal(nodes_map, 'two-hand-slashing-weapon') ==
              2) ||
          expertiseVal(nodes_map) == 'polearm'
        ) {
          Lucky_Hit_Chance_Bonus_Total *= 1.1
        }

        return Math.min(
          (1 + Lucky_Hit_Chance_Bonus_Total) *
            currentSkillVal(nodes_map)['lucky_hit_chance'],
          1,
        )
      },
    ),

    Total_Lucky_Hit_Execute: new StatsNode(
      'Total_Lucky_Hit_Execute',
      () => {
        const Lucky_Hit_Multiplier = statVal(
          nodes_map,
          'Total_Lucky_Hit_Chance_Multiplier',
        )

        // lucky-hit:-up-to-a-chance-to-execute-injured-non-elites
        const Lucky_Hit_Execute_Chance = aggregationVal(
          nodes_map,
          'lucky-hit:-up-to-a-chance-to-execute-injured-non-elites',
        )

        return Math.min(
          1,
          currentSkillVal(nodes_map)['lucky_hit_chance'] *
            Lucky_Hit_Execute_Chance *
            Lucky_Hit_Multiplier,
        )
      },
    ),
    Cooldown: new StatsNode('Cooldown', () => {
      const number_of_enemies = Number(
        toggleVal(nodes_map, 'number-of-enemies'),
      )
      const enemy_spread = Number(statVal(nodes_map, 'Enemy_Spread'))
      const Pre_Sim_Node = barbarianPresimVal(nodes_map)

      const current_skill = currentSkillVal(nodes_map)['name']
      let Cooldown_Total = CooldownFromRanks(
        talentVal(nodes_map, current_skill),
        current_skill,
        currentSkillVal(nodes_map)['cooldown_seconds'],
      )

      // cooldown-reduction
      Cooldown_Total *=
        1 - aggregationVal(nodes_map, 'cooldown-reduction')

      // 'rupture-cooldown-reduction'
      if (currentSkillVal(nodes_map)['name'] == 'rupture') {
        Cooldown_Total *=
          1 - aggregationVal(nodes_map, 'rupture-cooldown-reduction')
      }

      // Tuskhelm of Joritz the Mighty (Barbarian Unique Helm): When you gain Berserking while already Berserk, you have a 40-60% chance to become more enraged granting 15% (multiplicative damage) [x] increased damage, 2 Fury per second, and 10% Cooldown Reduction.
      if (
        aspectVal(nodes_map, 'tuskhelm-of-joritz-the-mighty')
          .length != 0 &&
        toggleVal(nodes_map, 'berserking')
      ) {
        Cooldown_Total *= 0.9
      }

      // Vampiric Power 'anticipation'
      // Your Ultimate Skills gain 20% Cooldown Reduction. Your Ultimate Skills gain 12% increased damage for each nearby enemy affected by your Damage Over Time effects.
      if (
        tagsVal(nodes_map).has('ultimate') &&
        vampiricPowerVal(nodes_map, 'anticipation')
      ) {
        Cooldown_Total *= 0.8
      }

      // Bear Clan Berserker's Aspect: Killing an enemy while Berserking has a 40.0% chance to grant {16/32}% increased Cooldown Reduction to your Brawling Skills for 2.0 seconds.
      if (
        aspectVal(nodes_map, 'bear-clan-berserkers-aspect').length !=
          0 &&
        tagsVal(nodes_map).has('brawling')
      ) {
        Cooldown_Total *=
          1 -
          Math.min(
            1,
            statVal(nodes_map, 'Enemy_Kill_Rate') *
              0.8 *
              statVal(nodes_map, 'Berserking_Uptime'),
          ) *
            aspectVal(nodes_map, 'bear-clan-berserkers-aspect')[0]
      }

      // Aspect of Giant Strides: Reduces the Cooldown of Leap by {3/5} seconds per enemy hit, up to a maximum of 9 seconds.
      if (
        aspectVal(nodes_map, 'aspect-of-giant-strides').length != 0 &&
        currentSkillVal(nodes_map)['name'] == 'leap'
      ) {
        Cooldown_Total -= Math.min(
          aspectVal(nodes_map, 'aspect-of-giant-strides')[0] *
            statVal(nodes_map, 'Total_Hits'),
          9,
        )
      }

      // Power Charge Reduce Charge's Cooldown by 3 seconds, charging a boss will instead reduce the cooldown by 6 seconds.
      if (
        talentVal(nodes_map, 'power-charge') == 1 &&
        currentSkillVal(nodes_map)['name'] == 'charge'
      ) {
        Cooldown_Total -= 3
        if (toggleVal(nodes_map, 'enemy-boss')) {
          Cooldown_Total -= 3
        }
      }

      // Strategic Ground Stomp: Ultimate move cooldown reduced by 1 second for every enemy hit by Ground Stomp.
      if (
        allSkillsVal(nodes_map).has('ground-stomp') &&
        talentVal(nodes_map, 'strategic-ground-stomp') > 0 &&
        tagsVal(nodes_map).has('ultimate')
      ) {
        const Ground_Stomp_Hits =
          1 +
          Math.min(
            1,
            10 ** 2 / statVal(nodes_map, 'Enemy_Spread') ** 2,
          ) *
            (number_of_enemies - 1)
        const Stategic_Ground_Stomp_Rate =
          (1 / statVal(nodes_map, 'Ground_Stomp_Cooldown')) *
          Ground_Stomp_Hits
        const alpha =
          Cooldown_Total / (1 / Stategic_Ground_Stomp_Rate + 1)

        Cooldown_Total -= alpha
      }

      // Supreme Iron Maelstrom: Dealing direct damage to an enemy after swapping weapons reduces Iron Maelstrom's Cooldown by 1 second.
      if (
        talentVal(nodes_map, 'supreme-iron-maelstrom') > 0 &&
        currentSkillVal(nodes_map)['name'] == 'iron-maelstrom'
      ) {
        const alpha =
          Cooldown_Total /
          (1 / (Pre_Sim_Node['weapon_swap_rate'] + 0.0001) + 1)
        Cooldown_Total -= alpha * 1
      }

      // Weapon Master: Hitting with a Weapon Mastery Skill reduces the active Cooldown of another random Weapon Mastery Skill by 2 seconds.
      if (paragonVal(nodes_map, 'weapon-master')) {
        const Weapon_Mastery_Skills = new Set([
          'rupture',
          'death-blow',
          'steel-grasp',
        ])
        const Skill_Name = currentSkillVal(nodes_map)['name']
        if (
          Skill_Name in Weapon_Mastery_Skills &&
          Skill_Name in Pre_Sim_Node['skill_use_rate']
        ) {
          let Other_Mastery_Skill_Count = 0
          let Other_Weapon_Mastery_Skill_Use_Rate = 0
          for (const Other_Skill in Pre_Sim_Node['skill_use_rate']) {
            if (
              Other_Skill != Skill_Name &&
              Weapon_Mastery_Skills.has(Other_Skill)
            ) {
              Other_Mastery_Skill_Count += 1
              Other_Weapon_Mastery_Skill_Use_Rate +=
                Pre_Sim_Node['skill_use_rate'][Other_Skill]
            }
          }
          const Other_Mastery_Skill_Seconds =
            1 / Other_Weapon_Mastery_Skill_Use_Rate
          Cooldown_Total *=
            Other_Mastery_Skill_Seconds /
            (Other_Mastery_Skill_Seconds +
              2 / Other_Mastery_Skill_Count)
        }
      }

      // (Unique) Rage of Harrogath: Lucky Hit: Up to a {20/40}% chance to reduce the Cooldowns of your Non-Ultimate Skills by 1.5 seconds when you inflict Bleeding on Elites.
      if (
        aspectVal(nodes_map, 'rage-of-harrogath').length != 0 &&
        !currentSkillVal(nodes_map)['tags'].has('ultimate') &&
        toggleVal(nodes_map, 'enemy-elite')
      ) {
        const Bleeding_Skills = new Set(['flay', 'rend'])
        if (talentVal(nodes_map, 'battle-lunging-strike') > 0) {
          Bleeding_Skills.add('lunging-strike')
        }
        if (talentVal(nodes_map, 'enhanced-rupture') > 0) {
          Bleeding_Skills.add('rupture')
        }
        if (talentVal(nodes_map, 'furious-whirlwind') > 0) {
          Bleeding_Skills.add('whirlwind')
        }
        let Rage_Of_Harrogath_Proc_Rate = 0
        for (const Other_Skill in Pre_Sim_Node['skill_use_rate']) {
          if (Bleeding_Skills.has(Other_Skill)) {
            Rage_Of_Harrogath_Proc_Rate +=
              aspectVal(nodes_map, 'rage-of-harrogath')[0] *
              Pre_Sim_Node['skill_use_rate'][Other_Skill] *
              Pre_Sim_Node['cross_skill_stat'][Other_Skill][
                'lucky_hit_chance'
              ]
          }
        }
        const alpha =
          Cooldown_Total / (1 / Rage_Of_Harrogath_Proc_Rate + 1.5)
        Cooldown_Total -= alpha * 1.5
      }

      // Legendary Paragon 'disembowel' Killing a Bleeding enemy has a 10% chance to reduce the Cooldowns of your Non-Ultimate active Cooldowns by 1 second.
      if (
        paragonVal(nodes_map, 'disembowel') &&
        toggleVal(nodes_map, 'enemy-bleeding')
      ) {
        const alpha =
          Cooldown_Total /
          (1 / (0.1 * statVal(nodes_map, 'Enemy_Kill_Rate')) + 1)
        Cooldown_Total -= alpha
      }

      // Death Blow: Attempt a killing strike, dealing 120% damage to enemies in front of you. If this kills an enemy, its Cooldown is reset.
      if (currentSkillVal(nodes_map)['name'] == 'death-blow') {
        const alpha =
          Cooldown_Total /
          (1 /
            (Math.max(1, statVal(nodes_map, 'Enemies_Killed')) +
              0.000001) +
            Cooldown_Total)
        Cooldown_Total -= alpha * Cooldown_Total
      }

      // Aspect of Perpetual Stomping: Damaging an enemy with Kick or Ground Stomp resets Leap's Cooldown.
      if (
        aspectVal(nodes_map, 'aspect-of-perpetual-stomping').length !=
          0 &&
        currentSkillVal(nodes_map)['name'] == 'leap'
      ) {
        let Proc_Rate = 0
        for (const skill in Pre_Sim_Node['skill_use_rate']) {
          if (['kick', 'ground-stomp'].includes(skill)) {
            Proc_Rate += Pre_Sim_Node['skill_use_rate'][skill]
          }
        }
        if (Proc_Rate > 0) {
          Cooldown_Total =
            (1 / Proc_Rate) *
            (1 - Math.exp(-Proc_Rate * Cooldown_Total))
        }
      }

      // Flickerstep (Generic Unique Boots): Each enemy you Evade through reduces your active Ultimate Cooldown by 2-4 seconds, up to 10 seconds.
      if (
        aspectVal(nodes_map, 'flickerstep').length != 0 &&
        tagsVal(nodes_map).has('ultimate')
      ) {
        const Evade_Rate = 1 / 5
        const alpha =
          Cooldown_Total /
          (1 / Evade_Rate + aspectVal(nodes_map, 'flickerstep')[0])
        Cooldown_Total -=
          alpha * aspectVal(nodes_map, 'flickerstep')[0]
      }

      // Vampiric Power hectic
      // For every 5 Basic Skills you cast, one of your active Cooldowns is reduced by 2 seconds.
      if (
        vampiricPowerVal(nodes_map, 'hectic') &&
        statVal(nodes_map, 'Number_Of_Cooldowns') > 0
      ) {
        let Proc_Rate = 0
        const Basic_Skills = new Set([
          'frenzy',
          'lunging-strike',
          'bash',
          'flay',
        ])
        for (const Skill in Pre_Sim_Node['skill_use_rate']) {
          if (Basic_Skills.has(Skill)) {
            Proc_Rate +=
              Pre_Sim_Node['skill_use_rate'][Skill] /
              (5 * statVal(nodes_map, 'Number_Of_Cooldowns'))
          }
        }
        const alpha = Cooldown_Total / (1 / Proc_Rate + 2)
        Cooldown_Total -= alpha * 2
      }

      // After casting a Shout Skill, the active Cooldown of every non-Shout Skill is reduced by 4 seconds.
      if (paragonVal(nodes_map, 'marshal')) {
        const Number_Of_Shouts =
          Number(allSkillsVal(nodes_map).has('rallying-cry')) +
          Number(allSkillsVal(nodes_map).has('war-cry')) +
          Number(allSkillsVal(nodes_map).has('challenging-shout'))
        const Shout_Cooldown = statVal(nodes_map, 'Shout_Cooldown')
        const Shout_Rate = Number_Of_Shouts / Shout_Cooldown

        const alpha = Cooldown_Total / (1 / Shout_Rate + 4)
        Cooldown_Total -= alpha * 4
      }

      return Math.max(0, Cooldown_Total)
    }),

    Shout_Cooldown: new StatsNode('Shout_Cooldown', () => {
      const Pre_Sim_Node = barbarianPresimVal(nodes_map)
      const number_of_enemies = Number(
        toggleVal(nodes_map, 'number-of-enemies'),
      )
      const enemy_spread = Number(statVal(nodes_map, 'Enemy_Spread'))
      let Shout_Cooldown = 25

      Shout_Cooldown *=
        1 - aggregationVal(nodes_map, 'cooldown-reduction')

      // Bold Chieftain's Aspect: Whenever you cast a Shout Skill, its Cooldown is reduced by {1.0-1.9} seconds per Nearby enemy, up to a maximum of 6.0 seconds.
      if (
        aspectVal(nodes_map, 'bold-chieftains-aspect').length != 0
      ) {
        // Assumes nearby means within 15 yards.
        const nearby_enemies =
          Number(!toggleVal(nodes_map, 'enemy-distant')) +
          (number_of_enemies - 1) *
            Math.min(15 ** 2 / enemy_spread ** 2, 1)
        Shout_Cooldown -= Math.min(
          aspectVal(nodes_map, 'bold-chieftains-aspect')[0] *
            nearby_enemies,
          6,
        )
      }

      const Shout_Count =
        Number(allSkillsVal(nodes_map).has('war-cry')) +
        Number(allSkillsVal(nodes_map).has('challenging-shout')) +
        Number(allSkillsVal(nodes_map).has('rallying-cry'))

      // Legendary Paragon 'disembowel' Killing a Bleeding enemy has a 10% chance to reduce the Cooldowns of your Non-Ultimate active Cooldowns by 1 second.
      if (
        paragonVal(nodes_map, 'disembowel') &&
        toggleVal(nodes_map, 'enemy-bleeding')
      ) {
        const alpha =
          Shout_Cooldown /
          (1 / (0.1 * statVal(nodes_map, 'Enemy_Kill_Rate')) + 1)
        Shout_Cooldown -= alpha
      }

      // Vampiric Power hectic
      // For every 5 Basic Skills you cast, one of your active Cooldowns is reduced by 2 seconds.
      if (
        vampiricPowerVal(nodes_map, 'hectic') &&
        statVal(nodes_map, 'Number_Of_Cooldowns') > 0
      ) {
        let Proc_Rate = 0
        const Basic_Skills = new Set([
          'frenzy',
          'lunging-strike',
          'bash',
          'flay',
        ])
        for (const Skill in Pre_Sim_Node['skill_use_rate']) {
          if (Basic_Skills.has(Skill)) {
            Proc_Rate +=
              Pre_Sim_Node['skill_use_rate'][Skill] /
              (5 * statVal(nodes_map, 'Number_Of_Cooldowns'))
          }
        }
        const alpha = Shout_Cooldown / (1 / Proc_Rate + 2)
        Shout_Cooldown -= alpha * 2
      }

      return Math.max(Shout_Cooldown, 1)
    }),

    Shout_Duration_Multiplier: new StatsNode(
      'Shout_Duration_Multiplier',
      () => {
        let Shout_Duration_Mulipliter = 1

        // Booming Voice: Your Shout Skill effect durations are increased by 8%/16%/24%.
        Shout_Duration_Mulipliter *=
          1 + 0.08 * talentVal(nodes_map, 'booming-voice')

        return Shout_Duration_Mulipliter
      },
    ),

    Wrath_Of_The_Berserker_Cooldown: new StatsNode(
      'Wrath_Of_The_Berserker_Cooldown',
      () => {
        const number_of_enemies = Number(
          toggleVal(nodes_map, 'number-of-enemies'),
        )
        const enemy_spread = Number(
          statVal(nodes_map, 'Enemy_Spread'),
        )
        const Pre_Sim_Node = barbarianPresimVal(nodes_map)

        let Wrath_Of_The_Berserker_Cooldown = 60

        // 'cooldown-reduction'
        Wrath_Of_The_Berserker_Cooldown *=
          1 - aggregationVal(nodes_map, 'cooldown-reduction')

        // Strategic Ground Stomp: Ultimate move cooldown reduced by 1 second for every enemy hit by Ground Stomp.
        if (
          allSkillsVal(nodes_map).has('ground-stomp') &&
          talentVal(nodes_map, 'strategic-ground-stomp') > 0
        ) {
          const Ground_Stomp_Hits =
            1 +
            Math.min(
              1,
              10 ** 2 / statVal(nodes_map, 'Enemy_Spread') ** 2,
            ) *
              (number_of_enemies - 1)
          const Stategic_Ground_Stomp_Rate =
            (1 / statVal(nodes_map, 'Ground_Stomp_Cooldown')) *
            Ground_Stomp_Hits
          const alpha =
            Wrath_Of_The_Berserker_Cooldown /
            (1 / Stategic_Ground_Stomp_Rate + 1)

          Wrath_Of_The_Berserker_Cooldown -= alpha
        }

        // Legendary Paragon 'disembowel' Killing a Bleeding enemy has a 10% chance to reduce the Cooldowns of your Non-Ultimate active Cooldowns by 1 second.
        if (
          paragonVal(nodes_map, 'disembowel') &&
          toggleVal(nodes_map, 'enemy-bleeding')
        ) {
          const alpha =
            Wrath_Of_The_Berserker_Cooldown /
            (1 / (0.1 * statVal(nodes_map, 'Enemy_Kill_Rate')) + 1)
          Wrath_Of_The_Berserker_Cooldown -= alpha
        }

        // Flickerstep (Generic Unique Boots): Each enemy you Evade through reduces your active Ultimate Cooldown by 2-4 seconds, up to 10 seconds.
        if (aspectVal(nodes_map, 'flickerstep').length != 0) {
          const Evade_Rate = 1 / 5
          const alpha =
            Wrath_Of_The_Berserker_Cooldown /
            (1 / Evade_Rate + aspectVal(nodes_map, 'flickerstep')[0])
          Wrath_Of_The_Berserker_Cooldown -=
            alpha * aspectVal(nodes_map, 'flickerstep')[0]
        }

        // Vampiric Power hectic
        // For every 5 Basic Skills you cast, one of your active Cooldowns is reduced by 2 seconds.
        if (
          vampiricPowerVal(nodes_map, 'hectic') &&
          statVal(nodes_map, 'Number_Of_Cooldowns') > 0
        ) {
          let Proc_Rate = 0
          const Basic_Skills = new Set([
            'frenzy',
            'lunging-strike',
            'bash',
            'flay',
          ])
          for (const Skill in Pre_Sim_Node['skill_use_rate']) {
            if (Basic_Skills.has(Skill)) {
              Proc_Rate +=
                Pre_Sim_Node['skill_use_rate'][Skill] /
                (5 * statVal(nodes_map, 'Number_Of_Cooldowns'))
            }
          }
          const alpha =
            Wrath_Of_The_Berserker_Cooldown / (1 / Proc_Rate + 2)
          Wrath_Of_The_Berserker_Cooldown -= alpha * 2
        }

        // After casting a Shout Skill, the active Cooldown of every non-Shout Skill is reduced by 4 seconds.
        if (paragonVal(nodes_map, 'marshal')) {
          const Number_Of_Shouts =
            Number(allSkillsVal(nodes_map).has('rallying-cry')) +
            Number(allSkillsVal(nodes_map).has('war-cry')) +
            Number(allSkillsVal(nodes_map).has('challenging-shout'))
          const Shout_Cooldown = statVal(nodes_map, 'Shout_Cooldown')
          const Shout_Rate = Number_Of_Shouts / Shout_Cooldown

          const alpha =
            Wrath_Of_The_Berserker_Cooldown / (1 / Shout_Rate + 4)
          Wrath_Of_The_Berserker_Cooldown -= alpha * 4
        }

        return Math.max(Wrath_Of_The_Berserker_Cooldown, 1)
      },
    ),

    Iron_Skin_Cooldown: new StatsNode('Iron_Skin_Cooldown', () => {
      let Iron_Skin_Cooldown = 14
      const Pre_Sim_Node = barbarianPresimVal(nodes_map)
      Iron_Skin_Cooldown *=
        1 - aggregationVal(nodes_map, 'cooldown-reduction')

      // Legendary Paragon 'disembowel' Killing a Bleeding enemy has a 10% chance to reduce the Cooldowns of your Non-Ultimate active Cooldowns by 1 second.
      if (
        paragonVal(nodes_map, 'disembowel') &&
        toggleVal(nodes_map, 'enemy-bleeding')
      ) {
        const alpha =
          Iron_Skin_Cooldown /
          (1 / (0.1 * statVal(nodes_map, 'Enemy_Kill_Rate')) + 1)
        Iron_Skin_Cooldown -= alpha
      }

      // Vampiric Power hectic
      // For every 5 Basic Skills you cast, one of your active Cooldowns is reduced by 2 seconds.
      if (
        vampiricPowerVal(nodes_map, 'hectic') &&
        statVal(nodes_map, 'Number_Of_Cooldowns') > 0
      ) {
        let Proc_Rate = 0
        const Basic_Skills = new Set([
          'frenzy',
          'lunging-strike',
          'bash',
          'flay',
        ])
        for (const Skill in Pre_Sim_Node['skill_use_rate']) {
          if (Basic_Skills.has(Skill)) {
            Proc_Rate +=
              Pre_Sim_Node['skill_use_rate'][Skill] /
              (5 * statVal(nodes_map, 'Number_Of_Cooldowns'))
          }
        }
        const alpha = Iron_Skin_Cooldown / (1 / Proc_Rate + 2)
        Iron_Skin_Cooldown -= alpha * 2
      }

      // After casting a Shout Skill, the active Cooldown of every non-Shout Skill is reduced by 4 seconds.
      if (paragonVal(nodes_map, 'marshal')) {
        const Number_Of_Shouts =
          Number(allSkillsVal(nodes_map).has('rallying-cry')) +
          Number(allSkillsVal(nodes_map).has('war-cry')) +
          Number(allSkillsVal(nodes_map).has('challenging-shout'))
        const Shout_Cooldown = statVal(nodes_map, 'Shout_Cooldown')
        const Shout_Rate = Number_Of_Shouts / Shout_Cooldown

        const alpha = Iron_Skin_Cooldown / (1 / Shout_Rate + 4)
        Iron_Skin_Cooldown -= alpha * 4
      }

      return Math.max(Iron_Skin_Cooldown, 1)
    }),

    Steel_Grasp_Cooldown: new StatsNode(
      'Steel_Grasp_Cooldown',
      () => {
        let Cooldown = CooldownFromRanks(
          talentVal(nodes_map, 'steel-grasp'),
          'steel-grasp',
          skillVal(nodes_map, 'steel-grasp')['cooldown_seconds'],
        )
        const Pre_Sim_Node = barbarianPresimVal(nodes_map)

        Cooldown *=
          1 - aggregationVal(nodes_map, 'cooldown-reduction')

        // Tuskhelm of Joritz the Mighty (Barbarian Unique Helm): When you gain Berserking while already Berserk, you have a 40-60% chance to become more enraged granting 15% (multiplicative damage) [x] increased damage, 2 Fury per second, and 10% Cooldown Reduction.
        if (
          aspectVal(nodes_map, 'tuskhelm-of-joritz-the-mighty')
            .length != 0 &&
          toggleVal(nodes_map, 'berserking')
        ) {
          Cooldown *= 0.9
        }

        // Weapon Master: Hitting with a Weapon Mastery Skill reduces the active Cooldown of another random Weapon Mastery Skill by 2 seconds.
        if (paragonVal(nodes_map, 'weapon-master')) {
          const Weapon_Mastery_Skills = new Set([
            'rupture',
            'death-blow',
            'steel-grasp',
          ])
          const Skill_Name = currentSkillVal(nodes_map)['name']
          if (
            Skill_Name in Weapon_Mastery_Skills &&
            Skill_Name in Pre_Sim_Node['skill_use_rate']
          ) {
            let Other_Mastery_Skill_Count = 0
            let Other_Weapon_Mastery_Skill_Use_Rate = 0
            for (const Other_Skill in Pre_Sim_Node[
              'skill_use_rate'
            ]) {
              if (
                Other_Skill != Skill_Name &&
                Weapon_Mastery_Skills.has(Other_Skill)
              ) {
                Other_Mastery_Skill_Count += 1
                Other_Weapon_Mastery_Skill_Use_Rate +=
                  Pre_Sim_Node['skill_use_rate'][Other_Skill]
              }
            }
            const Other_Mastery_Skill_Seconds =
              1 / Other_Weapon_Mastery_Skill_Use_Rate
            Cooldown *=
              Other_Mastery_Skill_Seconds /
              (Other_Mastery_Skill_Seconds +
                2 / Other_Mastery_Skill_Count)
          }
        }

        // (Unique) Rage of Harrogath: Lucky Hit: Up to a {20/40}% chance to reduce the Cooldowns of your Non-Ultimate Skills by 1.5 seconds when you inflict Bleeding on Elites.
        if (
          aspectVal(nodes_map, 'rage-of-harrogath').length != 0 &&
          !currentSkillVal(nodes_map)['tags'].has('ultimate') &&
          toggleVal(nodes_map, 'enemy-elite')
        ) {
          const Bleeding_Skills = new Set(['flay', 'rend'])
          if (talentVal(nodes_map, 'battle-lunging-strike') > 0) {
            Bleeding_Skills.add('lunging-strike')
          }
          if (talentVal(nodes_map, 'enhanced-rupture') > 0) {
            Bleeding_Skills.add('rupture')
          }
          if (talentVal(nodes_map, 'furious-whirlwind') > 0) {
            Bleeding_Skills.add('whirlwind')
          }
          let Rage_Of_Harrogath_Proc_Rate = 0
          for (const Other_Skill in Pre_Sim_Node['skill_use_rate']) {
            if (Bleeding_Skills.has(Other_Skill)) {
              Rage_Of_Harrogath_Proc_Rate +=
                aspectVal(nodes_map, 'rage-of-harrogath')[0] *
                Pre_Sim_Node['skill_use_rate'][Other_Skill] *
                Pre_Sim_Node['cross_skill_stat'][Other_Skill][
                  'lucky_hit_chance'
                ]
            }
          }
          const alpha =
            Cooldown / (1 / Rage_Of_Harrogath_Proc_Rate + 1.5)
          Cooldown -= alpha * 1.5
        }

        // Legendary Paragon 'disembowel' Killing a Bleeding enemy has a 10% chance to reduce the Cooldowns of your Non-Ultimate active Cooldowns by 1 second.
        if (
          paragonVal(nodes_map, 'disembowel') &&
          toggleVal(nodes_map, 'enemy-bleeding')
        ) {
          const alpha =
            Cooldown /
            (1 / (0.1 * statVal(nodes_map, 'Enemy_Kill_Rate')) + 1)
          Cooldown -= alpha
        }

        // Vampiric Power hectic
        // For every 5 Basic Skills you cast, one of your active Cooldowns is reduced by 2 seconds.
        if (
          vampiricPowerVal(nodes_map, 'hectic') &&
          statVal(nodes_map, 'Number_Of_Cooldowns') > 0
        ) {
          let Proc_Rate = 0
          const Basic_Skills = new Set([
            'frenzy',
            'lunging-strike',
            'bash',
            'flay',
          ])
          for (const Skill in Pre_Sim_Node['skill_use_rate']) {
            if (Basic_Skills.has(Skill)) {
              Proc_Rate +=
                Pre_Sim_Node['skill_use_rate'][Skill] /
                (5 * statVal(nodes_map, 'Number_Of_Cooldowns'))
            }
          }
          const alpha = Cooldown / (1 / Proc_Rate + 2)
          Cooldown -= alpha * 2
        }

        // After casting a Shout Skill, the active Cooldown of every non-Shout Skill is reduced by 4 seconds.
        if (paragonVal(nodes_map, 'marshal')) {
          const Number_Of_Shouts =
            Number(allSkillsVal(nodes_map).has('rallying-cry')) +
            Number(allSkillsVal(nodes_map).has('war-cry')) +
            Number(allSkillsVal(nodes_map).has('challenging-shout'))
          const Shout_Cooldown = statVal(nodes_map, 'Shout_Cooldown')
          const Shout_Rate = Number_Of_Shouts / Shout_Cooldown

          const alpha = Cooldown / (1 / Shout_Rate + 4)
          Cooldown -= alpha * 4
        }

        return Math.max(1, Cooldown)
      },
    ),

    Ground_Stomp_Cooldown: new StatsNode(
      'Ground_Stomp_Cooldown',
      () => {
        let Cooldown = CooldownFromRanks(
          talentVal(nodes_map, 'ground-stomp'),
          'ground-stomp',
          skillVal(nodes_map, 'ground-stomp')['cooldown_seconds'],
        )
        const Pre_Sim_Node = barbarianPresimVal(nodes_map)

        Cooldown *=
          1 - aggregationVal(nodes_map, 'cooldown-reduction')

        // Tuskhelm of Joritz the Mighty (Barbarian Unique Helm): When you gain Berserking while already Berserk, you have a 40-60% chance to become more enraged granting 15% (multiplicative damage) [x] increased damage, 2 Fury per second, and 10% Cooldown Reduction.
        if (
          aspectVal(nodes_map, 'tuskhelm-of-joritz-the-mighty')
            .length != 0 &&
          toggleVal(nodes_map, 'berserking')
        ) {
          Cooldown *= 0.9
        }

        // (Unique) Rage of Harrogath: Lucky Hit: Up to a {20/40}% chance to reduce the Cooldowns of your Non-Ultimate Skills by 1.5 seconds when you inflict Bleeding on Elites.
        if (
          aspectVal(nodes_map, 'rage-of-harrogath').length != 0 &&
          !currentSkillVal(nodes_map)['tags'].has('ultimate') &&
          toggleVal(nodes_map, 'enemy-elite')
        ) {
          const Bleeding_Skills = new Set(['flay', 'rend'])
          if (talentVal(nodes_map, 'battle-lunging-strike') > 0) {
            Bleeding_Skills.add('lunging-strike')
          }
          if (talentVal(nodes_map, 'enhanced-rupture') > 0) {
            Bleeding_Skills.add('rupture')
          }
          if (talentVal(nodes_map, 'furious-whirlwind') > 0) {
            Bleeding_Skills.add('whirlwind')
          }
          let Rage_Of_Harrogath_Proc_Rate = 0
          for (const Other_Skill in Pre_Sim_Node['skill_use_rate']) {
            if (Bleeding_Skills.has(Other_Skill)) {
              Rage_Of_Harrogath_Proc_Rate +=
                aspectVal(nodes_map, 'rage-of-harrogath')[0] *
                Pre_Sim_Node['skill_use_rate'][Other_Skill] *
                Pre_Sim_Node['cross_skill_stat'][Other_Skill][
                  'lucky_hit_chance'
                ]
            }
          }
          const alpha =
            Cooldown / (1 / Rage_Of_Harrogath_Proc_Rate + 1.5)
          Cooldown -= alpha * 1.5
        }

        // Legendary Paragon 'disembowel' Killing a Bleeding enemy has a 10% chance to reduce the Cooldowns of your Non-Ultimate active Cooldowns by 1 second.
        if (
          paragonVal(nodes_map, 'disembowel') &&
          toggleVal(nodes_map, 'enemy-bleeding')
        ) {
          const alpha =
            Cooldown /
            (1 / (0.1 * statVal(nodes_map, 'Enemy_Kill_Rate')) + 1)
          Cooldown -= alpha
        }

        // Vampiric Power hectic
        // For every 5 Basic Skills you cast, one of your active Cooldowns is reduced by 2 seconds.
        if (
          vampiricPowerVal(nodes_map, 'hectic') &&
          statVal(nodes_map, 'Number_Of_Cooldowns') > 0
        ) {
          let Proc_Rate = 0
          const Basic_Skills = new Set([
            'frenzy',
            'lunging-strike',
            'bash',
            'flay',
          ])
          for (const Skill in Pre_Sim_Node['skill_use_rate']) {
            if (Basic_Skills.has(Skill)) {
              Proc_Rate +=
                Pre_Sim_Node['skill_use_rate'][Skill] /
                (5 * statVal(nodes_map, 'Number_Of_Cooldowns'))
            }
          }
          const alpha = Cooldown / (1 / Proc_Rate + 2)
          Cooldown -= alpha * 2
        }

        // After casting a Shout Skill, the active Cooldown of every non-Shout Skill is reduced by 4 seconds.
        if (paragonVal(nodes_map, 'marshal')) {
          const Number_Of_Shouts =
            Number(allSkillsVal(nodes_map).has('rallying-cry')) +
            Number(allSkillsVal(nodes_map).has('war-cry')) +
            Number(allSkillsVal(nodes_map).has('challenging-shout'))
          const Shout_Cooldown = statVal(nodes_map, 'Shout_Cooldown')
          const Shout_Rate = Number_Of_Shouts / Shout_Cooldown

          const alpha = Cooldown / (1 / Shout_Rate + 4)
          Cooldown -= alpha * 4
        }

        return Math.max(1, Cooldown)
      },
    ),

    // Keystone Talent Walking Arsenal: Dealing direct damage with a Two-Handed Bludgeoning, Two-Handed Slashing, or Dual Wielded weapons grants 10% [x] increased damage for 8 seconds.
    //                                  While all three damage bonuses are active, you gain an additional 15% [x] increased damage.
    Walking_Arsenal_Uptime: new StatsNode(
      'Walking_Arsenal_Uptime',
      () => {
        return (
          statVal(nodes_map, 'Walking_Arsenal_DualWield_Uptime') *
          statVal(
            nodes_map,
            'Walking_Arsenal_TwoHand_Slashing_Uptime',
          ) *
          statVal(
            nodes_map,
            'Walking_Arsenal_TwoHand_Bludgeon_Uptime',
          )
        )
      },
    ),

    Walking_Arsenal_DualWield_Uptime: new StatsNode(
      'Walking_Arsenal_DualWield_Uptime',
      () => {
        const Pre_Sim_Node = barbarianPresimVal(nodes_map)
        if (talentVal(nodes_map, 'walking-arsenal') > 0) {
          return Math.min(
            1,
            Pre_Sim_Node['weapon_use_rate']['dual-wield'] * 10,
          )
        } else {
          return 0
        }
      },
    ),

    Walking_Arsenal_TwoHand_Slashing_Uptime: new StatsNode(
      'Walking_Arsenal_TwoHand_Slashing_Uptime',
      () => {
        const Pre_Sim_Node = barbarianPresimVal(nodes_map)
        if (talentVal(nodes_map, 'walking-arsenal') > 0) {
          return Math.min(
            1,
            Pre_Sim_Node['weapon_use_rate']['two-handed-slashing'] *
              10,
          )
        } else {
          return 0
        }
      },
    ),

    Walking_Arsenal_TwoHand_Bludgeon_Uptime: new StatsNode(
      'Walking_Arsenal_TwoHand_Bludgeon_Uptime',
      () => {
        const Pre_Sim_Node = barbarianPresimVal(nodes_map)
        if (talentVal(nodes_map, 'walking-arsenal') > 0) {
          return Math.min(
            1,
            Pre_Sim_Node['weapon_use_rate'][
              'two-handed-bludgeoning'
            ] * 10,
          )
        } else {
          return 0
        }
      },
    ),

    Total_Movement_Speed: new StatsNode(
      'Total_Movement_Speed',
      () => {
        let Total_Movement_Speed =
          1 + aggregationVal(nodes_map, 'movement-speed')

        // 'movement-speed-for-seconds-after-killing-an-elite'

        const Pre_Sim_Node = barbarianPresimVal(nodes_map)

        // Berserking: Increases your damage by 25% and your movement speed by 30%.
        Total_Movement_Speed +=
          0.3 * statVal(nodes_map, 'Berserking_Uptime')

        // wind-striker-aspect: Critical Strikes grant +{8/16}% Movement Speed for 1.0 second, up to 6 seconds.
        if (aspectVal(nodes_map, 'wind-striker-aspect').length != 0) {
          let Crit_Rate = 0
          for (const skill in Pre_Sim_Node['skill_use_rate']) {
            Crit_Rate +=
              Pre_Sim_Node['skill_use_rate'][skill] *
              Pre_Sim_Node['cross_skill_stat'][skill][
                'critical_chance'
              ] *
              Pre_Sim_Node['cross_skill_stat'][skill]['total_hits']
          }

          Total_Movement_Speed +=
            Math.min(Crit_Rate, 1) *
            aspectVal(nodes_map, 'wind-striker-aspect')[0]
        }

        // Rallying Cry: Increases Movement speed by +30% and Resource Generation by x40% for 6 seconds
        let Rallying_Cry_Average_Bonus = 0
        if (allSkillsVal(nodes_map).has('rallying-cry')) {
          const Shout_Cooldown = statVal(nodes_map, 'Shout_Cooldown')
          const Shout_Duration_Mulipliter = statVal(
            nodes_map,
            'Shout_Duration_Multiplier',
          )
          Rallying_Cry_Average_Bonus =
            0.3 *
            Math.min(
              (6 * Shout_Duration_Mulipliter) / Shout_Cooldown,
              1,
            )
        }
        Total_Movement_Speed += Rallying_Cry_Average_Bonus

        Total_Movement_Speed +=
          0.04 * talentVal(nodes_map, 'swiftness')

        // Prime Wrath of the Berserker: While active gain +20% movement speed.
        if (
          allSkillsVal(nodes_map).has('wrath-of-the-berserker') &&
          talentVal(nodes_map, 'prime-wrath-of-the-berserker') == 1
        ) {
          Total_Movement_Speed +=
            0.2 *
            Math.min(
              10 /
                statVal(nodes_map, 'Wrath_Of_The_Berserker_Cooldown'),
              1,
            )
        }

        // Craven Aspect: You gain [20 - 40]% increased Movement Speed when moving away from Slowed or Chilled enemies.
        if (
          aspectVal(nodes_map, 'craven-aspect').length > 0 &&
          (toggleVal(nodes_map, 'enemy-slowed') ||
            statVal(nodes_map, 'Enemy_Chilled') == 1)
        ) {
          Total_Movement_Speed += aspectVal(
            nodes_map,
            'craven-aspect',
          )[0]
        }

        // Vampiric Power moonrise
        // Hitting an enemy with a Basic Skill grants you 4% Attack Speed for 10 seconds, stacking up to 5 times. Upon reaching maximum stacks, you enter a Vampiric Bloodrage, gaining 160% Basic Skill damage and 15% Movement Speed for 10 seconds.
        if (vampiricPowerVal(nodes_map, 'moonrise')) {
          let Basic_Skill_Rate = 0
          const Basic_Skills = new Set([
            'frenzy',
            'lunging-strike',
            'bash',
            'flay',
          ])
          for (const Skill in Pre_Sim_Node['skill_use_rate']) {
            if (Basic_Skills.has(Skill)) {
              Basic_Skill_Rate +=
                Pre_Sim_Node['skill_use_rate'][Skill]
            }
          }
          if (Basic_Skill_Rate * 10 >= 1) {
            const Time_To_Vampiric_Bloodrage = 5 / Basic_Skill_Rate
            const Vampiric_Bloodrage_Uptime =
              10 / (Time_To_Vampiric_Bloodrage + 10)
            Total_Movement_Speed *=
              1 + 0.15 * Vampiric_Bloodrage_Uptime
          }
        }

        return Math.min(Total_Movement_Speed, 2)
      },
    ),

    Number_Of_Cast: new StatsNode('Number_Of_Cast', () => {
      let Number_Of_Cast = 1
      const Pre_Sim_Node = barbarianPresimVal(nodes_map)
      // When a player has violent Whirlwind, they will want to channel the skill as long as possible.
      if (
        currentSkillVal(nodes_map)['name'] == 'whirlwind' &&
        talentVal(nodes_map, 'violent-whirlwind') > 0
      ) {
        const max_fury = statVal(nodes_map, 'Max_Resource')
        const cost_per_cast = -statVal(
          nodes_map,
          'Delta_Resources_Per_Cast',
        )

        if (cost_per_cast <= 0) {
          Number_Of_Cast = 100
        } else {
          Number_Of_Cast = Math.floor(max_fury / cost_per_cast)
        }
      }

      if (currentSkillVal(nodes_map)['name'] == 'iron-maelstrom') {
        Number_Of_Cast = 3
      }

      return Number_Of_Cast
    }),

    Cast_Time: new StatsNode('Cast_Time', () => {
      const Total_Attack_Speed = statVal(
        nodes_map,
        'Total_Attack_Speed',
      )

      let base_cast_time = 1
      switch (currentSkillVal(nodes_map)['name']) {
        case 'lunging-strike':
          base_cast_time = 0.66
          break

        case 'flay':
          base_cast_time = 0.66
          break

        case 'bash':
          base_cast_time = 0.655
          break

        case 'frenzy':
          base_cast_time = 0.66
          break

        case 'upheaval':
          base_cast_time = 1.04
          break

        case 'double-swing':
          base_cast_time = 0.7
          break

        // Base speed are 5x per second.
        case 'whirlwind':
          base_cast_time = 0.2
          break

        case 'rend':
          base_cast_time = 0.685
          break

        case 'hammer-of-the-ancients':
          base_cast_time = 0.75
          break

        case 'kick':
          base_cast_time = 0.72
          break

        case 'leap':
          base_cast_time = 0.81
          break

        case 'charge':
          base_cast_time = 0.77
          break

        case 'death-blow':
          base_cast_time = 0.8
          break

        case 'rupture':
          base_cast_time = 1.3
          break

        case 'steel-grasp':
          base_cast_time = 1.14
          break

        case 'call-of-the-ancients':
          base_cast_time = 0.77
          break

        case 'iron-maelstrom':
          base_cast_time = 0.84
          break

        case 'ground-stomp':
          base_cast_time = 0.5
          break
      }

      return Total_Attack_Speed == 0
        ? 0
        : base_cast_time / Total_Attack_Speed
    }),

    Elapsed_Time: new StatsNode('Elapsed_Time', () => {
      const Total_Attack_Speed = statVal(
        nodes_map,
        'Total_Attack_Speed',
      )
      return Total_Attack_Speed == 0
        ? 0
        : statVal(nodes_map, 'Number_Of_Cast') *
            statVal(nodes_map, 'Cast_Time')
    }),

    Armor_Damage_Reduction: new StatsNode(
      'Armor_Damage_Reduction',
      () => {
        const Armor = statVal(nodes_map, 'Total_Armor')
        const Enemy_Level =
          Number(toggleVal(nodes_map, 'enemy-level-difference')) +
          baseStatVal(nodes_map)['Level']

        return DamageReductionFromArmor(Enemy_Level, Armor)
      },
    ),

    Physical_Damage_Reduction: new StatsNode(
      'Physical_Damage_Reduction',
      () => {
        const Armor_Damage_Reduction = statVal(
          nodes_map,
          'Armor_Damage_Reduction',
        )
        const Player_Damage_Reduction = statVal(
          nodes_map,
          'Player_Damage_Reduction',
        )

        return (
          1 -
          (1 - Armor_Damage_Reduction) * (1 - Player_Damage_Reduction)
        )
      },
    ),

    Cold_Damage_Reduction: new StatsNode(
      'Cold_Damage_Reduction',
      () => {
        const Player_Damage_Reduction = statVal(
          nodes_map,
          'Player_Damage_Reduction',
        )
        const Cold_Resistance = statVal(nodes_map, 'Resistance_Cold')
        return (
          1 - (1 - Cold_Resistance) * (1 - Player_Damage_Reduction)
        )
      },
    ),

    Fire_Damage_Reduction: new StatsNode(
      'Fire_Damage_Reduction',
      () => {
        const Player_Damage_Reduction = statVal(
          nodes_map,
          'Player_Damage_Reduction',
        )
        const Fire_Resistance = statVal(nodes_map, 'Resistance_Fire')
        return (
          1 - (1 - Fire_Resistance) * (1 - Player_Damage_Reduction)
        )
      },
    ),

    Lightning_Damage_Reduction: new StatsNode(
      'Lightning_Damage_Reduction',
      () => {
        const Player_Damage_Reduction = statVal(
          nodes_map,
          'Player_Damage_Reduction',
        )
        const Lightning_Resistance = statVal(
          nodes_map,
          'Resistance_Lightning',
        )
        return (
          1 -
          (1 - Lightning_Resistance) * (1 - Player_Damage_Reduction)
        )
      },
    ),

    Poison_Damage_Reduction: new StatsNode(
      'Poison_Damage_Reduction',
      () => {
        const Player_Damage_Reduction = statVal(
          nodes_map,
          'Player_Damage_Reduction',
        )
        const Poison_Resistance = statVal(
          nodes_map,
          'Resistance_Poison',
        )
        return (
          1 - (1 - Poison_Resistance) * (1 - Player_Damage_Reduction)
        )
      },
    ),

    Shadow_Damage_Reduction: new StatsNode(
      'Shadow_Damage_Reduction',
      () => {
        const Player_Damage_Reduction = statVal(
          nodes_map,
          'Player_Damage_Reduction',
        )
        const Shadow_Resistance = statVal(
          nodes_map,
          'Resistance_Shadow',
        )
        return (
          1 - (1 - Shadow_Resistance) * (1 - Player_Damage_Reduction)
        )
      },
    ),

    Effective_Life: new StatsNode('Effective_Life', () => {
      const Physical_Damage_Reduction = statVal(
        nodes_map,
        'Physical_Damage_Reduction',
      )
      const Cold_Damage_Reduction = statVal(
        nodes_map,
        'Cold_Damage_Reduction',
      )
      const Fire_Damage_Reduction = statVal(
        nodes_map,
        'Fire_Damage_Reduction',
      )
      const Lightning_Damage_Reduction = statVal(
        nodes_map,
        'Lightning_Damage_Reduction',
      )
      const Poison_Damage_Reduction = statVal(
        nodes_map,
        'Poison_Damage_Reduction',
      )
      const Shadow_Damage_Reduction = statVal(
        nodes_map,
        'Shadow_Damage_Reduction',
      )

      const Dodge_Chance = statVal(nodes_map, 'Total_Dodge_Chance')
      const Current_Life =
        statVal(nodes_map, 'Max_Life') *
        Number(toggleVal(nodes_map, 'percent-life'))
      const Current_Barrier =
        statVal(nodes_map, 'Max_Life') *
        Number(toggleVal(nodes_map, 'percent-barrier'))

      // We use th L^(1/2) pseudo-norm since it is weighted toward the lowest mitigation which emphasizes the weakest element.
      const Effective_Damage_Reduction = WeightedResistanceAverage([
        Physical_Damage_Reduction,
        Cold_Damage_Reduction,
        Fire_Damage_Reduction,
        Lightning_Damage_Reduction,
        Poison_Damage_Reduction,
        Shadow_Damage_Reduction,
      ])

      // (Barbarian) ignoring-pain:	Incoming damage has a [5 - 15]% chance of being ignored and instead Healing you for [flat value number].
      let Ignoring_Pain = 1
      if (malignantHeartVal(nodes_map, 'ignoring-pain').length > 0) {
        Ignoring_Pain =
          1 - malignantHeartVal(nodes_map, 'ignoring-pain')[0]
      }

      return (
        (Current_Life + Current_Barrier) /
        (1 - Effective_Damage_Reduction) /
        (1 - Dodge_Chance) /
        Ignoring_Pain
      )
    }),

    Max_Dot_Duration: new StatsNode('Max_Dot_Duration', () => {
      let Dot_Duration = 0
      const Weapon_Type = statVal(nodes_map, 'Weapon_Type')

      switch (currentSkillVal(nodes_map)['name']) {
        case 'flay':
          Dot_Duration = 5
          break
        case 'whirlwind':
          if (talentVal(nodes_map, 'furious-whirlwind') > 0) {
            if (Weapon_Type == 1) {
              Dot_Duration = 5
            } else if (Weapon_Type == 0) {
              if (
                [0, 1].includes(
                  aggregationVal(nodes_map, 'main-hand-weapon'),
                )
              ) {
                Dot_Duration = 5
              }
              if (
                [0, 1].includes(
                  aggregationVal(nodes_map, 'off-hand-weapon'),
                )
              ) {
                Dot_Duration = 5
              }
            }
          }
          break
        case 'rend':
          Dot_Duration = 5
          break
        case 'rupture':
          // Should be used to REMOVE dots.
          Dot_Duration = -100
          // Enhanced Rupture: Ripping your weapon out of enemies during Rupture causes an explosion that deals 70% Bleeding damage over 5 seconds.
          //This damage is increased by x10% for each 50 Strength you have.
          if (talentVal(nodes_map, 'enhanced-rupture') > 0) {
            Dot_Duration = 5
          }
          break
        case 'lunging-strike':
          if (talentVal(nodes_map, 'battle-lunging-strike') > 0) {
            Dot_Duration = 5
          }
          break
      }

      // Two-Hand Sword Expertise: 20% of direct damage you deal is inflicted as Bleeding damage over 5 seconds.
      if (
        expertiseVal(nodes_map) == 'two-handed-sword' &&
        currentSkillVal(nodes_map)['modifiers']['flat'] > 0
      ) {
        Dot_Duration = 5
      }

      // Should always be up.
      if (talentVal(nodes_map, 'tough-as-nails') > 0) {
        Dot_Duration = 100
      }

      return Dot_Duration
    }),

    Frenzy_Stacks: new StatsNode('Frenzy_Stacks', () => {
      const Pre_Sim_Node = barbarianPresimVal(nodes_map)
      // Frenzy: If Frenzy hits an enemy, its Attack Speed is increased by +20% for 3 seconds, up to +60%.
      if (!('frenzy' in Pre_Sim_Node['skill_use_rate'])) {
        return 0
      }
      let Frenzy_Stacks =
        Pre_Sim_Node['skill_use_rate']['frenzy'] * 3 > 1
          ? 3
          : Pre_Sim_Node['skill_use_rate']['frenzy'] * 3
      // (Unique) Battle Trance: Increase Frenzy's maximum stacks by 2. While you have maximum Frenzy, your other Skills gain +{35/45}% increased Attack Speed.
      if (aspectVal(nodes_map, 'battle-trance').length > 0) {
        Frenzy_Stacks =
          Pre_Sim_Node['skill_use_rate']['frenzy'] * 3 > 1
            ? 5
            : Pre_Sim_Node['skill_use_rate']['frenzy'] * 3
      }

      return Frenzy_Stacks
    }),

    Enemy_Attacks_Per_Second: new StatsNode(
      'Enemy_Attacks_Per_Second',
      () => {
        return (
          (1 +
            (Number(toggleVal(nodes_map, 'number-of-enemies')) - 1) /
              2) *
          0.63
        )
      },
    ),

    Enemies_Killed: new StatsNode('Enemies_Killed', () => {
      const number_of_enemies = Number(
        toggleVal(nodes_map, 'number-of-enemies'),
      )
      let Enemy_Kills = 0
      if (tagsVal(nodes_map).has('basic')) {
        Enemy_Kills =
          0.125 *
          Math.min(
            statVal(nodes_map, 'Total_Hits'),
            number_of_enemies - 1,
          )
      } else {
        Enemy_Kills =
          0.25 *
          Math.min(
            statVal(nodes_map, 'Total_Hits'),
            number_of_enemies - 1,
          )
      }

      return Enemy_Kills
    }),

    Enemy_Kill_Rate: new StatsNode('Enemy_Kill_Rate', () => {
      const Pre_Sim_Node = barbarianPresimVal(nodes_map)
      let Kill_Rate = 0
      for (const Skill in Pre_Sim_Node['skill_use_rate']) {
        Kill_Rate +=
          Pre_Sim_Node['skill_use_rate'][Skill] *
          Pre_Sim_Node['cross_skill_stat'][Skill]['enemy_kills']
      }

      return Kill_Rate
    }),

    Berserking_Uptime: new StatsNode('Berserking_Uptime', () => {
      const Pre_Sim_Node = barbarianPresimVal(nodes_map)
      let Downtime = 1

      if (toggleVal(nodes_map, 'berserking')) {
        return 1
      }

      // Legendary Paragon 'blood-rage',
      // Killing a Bleeding enemy has 10% chance to grant Berserking for 5 seconds.  Your damage dealt is increased by 25% [x] of the total amount of your Damage while Berserking bonus.
      if (paragonVal(nodes_map, 'blood-rage')) {
        Downtime -=
          5 *
          statVal(nodes_map, 'Enemy_Kill_Rate') *
          0.1 *
          Math.max(
            Number(toggleVal(nodes_map, 'enemy-bleeding')),
            Pre_Sim_Node['dot_uptime'],
          )
      }

      // Wrath of the Berserker: Gain Berserking and Unstoppable for 5 seconds. For the next 10 seconds, dealing direct damage with Basic Skills grants Berserking for 5 seconds.
      // Note Uptimes are multiplicative due to independence assumption.
      if (allSkillsVal(nodes_map).has('wrath-of-the-berserker')) {
        let Basic_Skill_Rate = 0
        for (const Skill in Pre_Sim_Node['skill_use_rate']) {
          if (skillVal(nodes_map, Skill)['category'] == 'basic') {
            Basic_Skill_Rate += Pre_Sim_Node['skill_use_rate'][Skill]
          }
        }
        if (Basic_Skill_Rate > 0) {
          // Shortcut, if you ever use basic skills we just assume max uptime.
          Downtime *=
            1 -
            (15 /
              statVal(nodes_map, 'Wrath_Of_The_Berserker_Cooldown') +
              0.0001)
        } else {
          Downtime *=
            1 -
            (5 /
              statVal(nodes_map, 'Wrath_Of_The_Berserker_Cooldown') +
              0.0001)
        }
      }

      return 1 - Math.max(0, Downtime)
    }),

    Enemy_Spread: new StatsNode('Enemy_Spread', () => {
      let enemy_spread = Number(
        toggleVal(nodes_map, 'enemy-spread-yards'),
      )
      const Pre_Sim_Node = barbarianPresimVal(nodes_map)
      const number_of_enemies = Number(
        toggleVal(nodes_map, 'number-of-enemies'),
      )
      // Aspect of Grasping Whirlwind: Whirlwind periodically Pulls enemies to you.
      if (
        aspectVal(nodes_map, 'aspect-of-grasping-whirlwind').length >
          0 &&
        'whirlwind' in Pre_Sim_Node['skill_use_rate'] &&
        Pre_Sim_Node['skill_use_rate']['whirlwind'] > 0
      ) {
        enemy_spread -= 5
      }

      // Godslayer Crown (Generic Unique Helm): When you Stun, Freeze, or Immobilize an Elite enemy, or damage a Boss, it pulls in nearby enemies.
      // You deal 30-60% [x] increased damage to them for 3 seconds. This effect can only occur once every 12 seconds.
      if (
        aspectVal(nodes_map, 'godslayer-crown').length > 0 &&
        (toggleVal(nodes_map, 'enemy-stunned') ||
          toggleVal(nodes_map, 'enemy-frozen') ||
          toggleVal(nodes_map, 'enemy-immobilized') ||
          toggleVal(nodes_map, 'enemy-boss'))
      ) {
        enemy_spread -= 10 * (3 / 12)
      }

      // Steel Grasp
      if (allSkillsVal(nodes_map).has('steel-grasp')) {
        let Steel_Grasp_Hits =
          1 +
          ProbabilityInCone(30, 1 / 8, enemy_spread) *
            (number_of_enemies - 1)
        if (aspectVal(nodes_map, 'ancients-oath').length > 0) {
          Steel_Grasp_Hits =
            1 +
            ProbabilityInCone(30, 1 / 4, enemy_spread) *
              (number_of_enemies - 1)
        }
        if (enemy_spread > 5) {
          enemy_spread -=
            (enemy_spread - 5) *
            (Steel_Grasp_Hits / number_of_enemies) *
            Math.min(
              1,
              3 / statVal(nodes_map, 'Steel_Grasp_Cooldown'),
            )
        }
      }

      return Math.max(enemy_spread, 5)
    }),

    Enemy_Boss_CC_Adjustment: new StatsNode(
      'Enemy_Boss_CC_Adjustment',
      () => {
        const number_of_enemies = Number(
          toggleVal(nodes_map, 'number-of-enemies'),
        )
        return (
          (number_of_enemies -
            Number(toggleVal(nodes_map, 'enemy-boss'))) /
          number_of_enemies
        )
      },
    ),

    Earthquake_Uptime: new StatsNode('Earthquake_Uptime', () => {
      const Pre_Sim_Node = barbarianPresimVal(nodes_map)
      let Earthquake_Rate = 0
      if (
        aspectVal(nodes_map, 'aspect-of-bul-kathos').length > 0 &&
        'leap' in Pre_Sim_Node['skill_use_rate']
      ) {
        Earthquake_Rate += Pre_Sim_Node['skill_use_rate']['leap'] * 4
      }
      if (
        aspectVal(nodes_map, 'earthquake-aspect').length > 0 &&
        allSkillsVal(nodes_map).has('ground-stomp')
      ) {
        Earthquake_Rate +=
          (1 / statVal(nodes_map, 'Ground_Stomp_Cooldown')) * 4
      }

      return Math.min(1, Earthquake_Rate)
    }),

    Number_Of_Cooldowns: new StatsNode('Number_Of_Cooldowns', () => {
      let Number_Of_Cooldowns = 0
      const Core_Skills = new Set([
        'whirlwind',
        'upheaval',
        'rend',
        'double-swing',
        'hammer-of-the-ancients',
      ])
      const Basic_Skills = new Set([
        'frenzy',
        'lunging-strike',
        'bash',
        'flay',
      ])

      for (const Skill of allSkillsVal(nodes_map)) {
        if (!Basic_Skills.has(Skill) && !Core_Skills.has(Skill)) {
          Number_Of_Cooldowns += 1
        }
      }

      return Number_Of_Cooldowns
    }),

    Vampiric_Curse_Uptime: new StatsNode(
      'Vampiric_Curse_Uptime',
      () => {
        let Vampiric_Curse_Rate = 0
        const Pre_Sim_Node = barbarianPresimVal(nodes_map)
        const number_of_enemies = Number(
          toggleVal(nodes_map, 'number-of-enemies'),
        )
        // Enemy_Kill_Rate

        // Vampiric Power accursed-touch
        // Lucky Hit: Up to a 44% chance to inflict Vampiric Curse on enemies. Enemies with the Vampiric Curse have a 15% chance to spread it to other surrounding enemies. Accursed Souls deal 200% increased damage.
        if (vampiricPowerVal(nodes_map, 'accursed-touch')) {
          let Enemy_Distance = 10
          if (toggleVal(nodes_map, 'enemy-distant')) {
            Enemy_Distance = Math.min(
              25,
              statVal(nodes_map, 'Enemy_Spread'),
            )
          }
          for (const Skill in Pre_Sim_Node['skill_use_rate']) {
            Vampiric_Curse_Rate +=
              0.44 *
              Pre_Sim_Node['skill_use_rate'][Skill] *
              Pre_Sim_Node['cross_skill_stat'][Skill][
                'lucky_hit_chance'
              ] *
              Pre_Sim_Node['cross_skill_stat'][Skill]['total_hits'] *
              1.15 *
              (1 +
                ProbabilityInCircle(
                  10,
                  Enemy_Distance,
                  statVal(nodes_map, 'Enemy_Spread'),
                ))
          }
        }

        // Vampiric Power metamorphosis
        // When you Evade you turn into a cloud of bats, becoming Unstoppable for 4 seconds. Enemies along your path take 160% Physical damage and are inflicted with Vampiric Curse.
        if (vampiricPowerVal(nodes_map, 'metamorphosis')) {
          Vampiric_Curse_Rate += Math.min(
            1,
            15 ** 2 / statVal(nodes_map, 'Enemy_Spread') ** 2,
          )
        }

        // Vampiric Power covens-fangs
        // Your Conjuration, Companion, Minion, and Bat Familiar attacks deal 52% increased damage to Crowd Controlled enemies. Lucky Hit: Your Conjuration, Companion, Minion, and Bat Familiar have up to a 30% chance to inflict Vampiric Curse when hitting enemies.
        if (vampiricPowerVal(nodes_map, 'covens-fangs')) {
          Vampiric_Curse_Rate +=
            0.3 * statVal(nodes_map, 'Vampiric_Bat_Rate')
        }

        return Math.min(1, Vampiric_Curse_Rate / number_of_enemies)
      },
    ),

    Vampiric_Bat_Rate: new StatsNode('Vampiric_Bat_Rate', () => {
      let Vampiric_Bat_Rate = 0
      //const Weapon_Damage = statVal(nodes_map, 'Total_Weapon_Damage')

      const Pre_Sim_Node = barbarianPresimVal(nodes_map)

      // Vampiric Power flowing-veins
      // Casting a Mastery, Weapon Mastery, Macabre, Wrath, or Imbuement Skill calls a bat ally to attack nearby enemies, dealing 80% Physical damage with a 30% chance to Stun.	call-familiar
      // You deal 60% increased Damage Over Time to enemies that are moving or affected by a Vampiric Curse.
      if (vampiricPowerVal(nodes_map, 'flowing-veins')) {
        const Weapon_Mastery_Skills = new Set([
          'death-blow',
          'steel-grasp',
          'rupture',
        ])
        const Defensive_Skills = new Set([
          'ground-stomp',
          'challenging-shout',
          'iron-skin',
          'rallying-cry',
        ])
        for (const Skill of allSkillsVal(nodes_map)) {
          if (
            Weapon_Mastery_Skills.has(Skill) &&
            Skill in Pre_Sim_Node['skill_use_rate']
          ) {
            Vampiric_Bat_Rate += Pre_Sim_Node['skill_use_rate'][Skill]
          } else if (Defensive_Skills.has(Skill)) {
            switch (Skill) {
              case 'ground-stomp':
                if (
                  'ground-stomp' in Pre_Sim_Node['skill_use_rate']
                ) {
                  Vampiric_Bat_Rate +=
                    Pre_Sim_Node['skill_use_rate'][Skill]
                }
                break
              case 'challenging-shout':
                Vampiric_Bat_Rate +=
                  1 / statVal(nodes_map, 'Shout_Cooldown')
                break
              case 'iron-skin':
                Vampiric_Bat_Rate +=
                  1 / statVal(nodes_map, 'Iron_Skin_Cooldown')
                break
              case 'rallying-cry':
                Vampiric_Bat_Rate +=
                  1 / statVal(nodes_map, 'Shout_Cooldown')
                break
              default:
                break
            }
          }
        }
      }

      return Vampiric_Bat_Rate
    }),
  }
}

// For Barbarians, triggers report damage with all 3 weapon types and core/basic skills. Triggers do not account for
// skill modifiers, instead they are applied afterwards with the skill.
export function CreateBarbarianTriggerNodes(
  nodes_map: NodesMap,
): Record<string, TriggerNode> {
  return {
    Skill_Dot_Damage: new TriggerNode('Skill_Dot_Damage', () => {
      // Primary Components
      const Weapon_Damage = statVal(nodes_map, 'Total_Weapon_Damage')
      const Skill_Name = currentSkillVal(nodes_map)['name']
      let Skill_DoT_Modifier =
        currentSkillVal(nodes_map)['modifiers']['dot'] *
        (1 + 0.1 * (talentVal(nodes_map, Skill_Name) - 1))
      const Weapon_Type = statVal(nodes_map, 'Weapon_Type')
      const Hits_Multiplier = statVal(nodes_map, 'Hits_Multiplier')

      // Ultimates Cannot Gain +Ranks
      if (tagsVal(nodes_map).has('ultimate')) {
        Skill_DoT_Modifier =
          currentSkillVal(nodes_map)['modifiers']['dot']
      }

      // Secondary Components

      // Battle Lunging Strike: Lunging Strike also inflicts 20% Bleeding Damage over 5 seconds
      if (
        talentVal(nodes_map, 'battle-lunging-strike') > 0 &&
        currentSkillVal(nodes_map)['name'] == 'lunging-strike'
      ) {
        Skill_DoT_Modifier += 0.2
      }

      const Tags_Node = CopyTags(tagsVal(nodes_map))
      Tags_Node.add('bleed')
      Tags_Node.add('damage-over-time')
      const Damage_Multiplier = BarbarianDamageMultiplier(
        Tags_Node,
        nodes_map,
      )

      return (
        Skill_DoT_Modifier *
        Weapon_Damage *
        Damage_Multiplier *
        Hits_Multiplier
      )
    }),

    Flat_Damage: new TriggerNode('Flat_Damage', () => {
      const Weapon_Damage = statVal(nodes_map, 'Total_Weapon_Damage')
      const Skill_Name = currentSkillVal(nodes_map)['name']
      let Skill_Flat_Modifier =
        currentSkillVal(nodes_map)['modifiers']['flat'] *
        (1 + 0.1 * (talentVal(nodes_map, Skill_Name) - 1))

      // Kick & Rupture Do not scale damage modifier with ranks
      if (
        currentSkillVal(nodes_map)['name'] == 'rupture' ||
        currentSkillVal(nodes_map)['name'] == 'kick' ||
        tagsVal(nodes_map).has('ultimate')
      ) {
        Skill_Flat_Modifier =
          currentSkillVal(nodes_map)['modifiers']['flat']
      }

      const Hits_Multiplier = statVal(nodes_map, 'Hits_Multiplier')
      const Pre_Sim_Node = barbarianPresimVal(nodes_map)

      const Tags_Node = CopyTags(tagsVal(nodes_map))
      Tags_Node.delete('bleed')
      Tags_Node.delete('damage-over-time')
      const Damage_Multiplier = BarbarianDamageMultiplier(
        Tags_Node,
        nodes_map,
      )

      const Flat_Damage_Total =
        Weapon_Damage *
        Damage_Multiplier *
        Hits_Multiplier *
        Skill_Flat_Modifier

      return Flat_Damage_Total
    }),

    Non_Skill_Dot_Damage: new TriggerNode(
      'Non_Skill_Dot_Damage',
      () => {
        const number_of_enemies = Number(
          toggleVal(nodes_map, 'number-of-enemies'),
        )
        const enemy_spread = Number(
          statVal(nodes_map, 'Enemy_Spread'),
        )
        const Pre_Sim_Node = barbarianPresimVal(nodes_map)
        const Total_Attack_Speed = statVal(
          nodes_map,
          'Total_Attack_Speed',
        )
        const Weapon_Damage = statVal(
          nodes_map,
          'Total_Weapon_Damage',
        )
        const Base_Damage =
          Weapon_Damage *
          currentSkillVal(nodes_map)['modifiers']['flat'] *
          (1 +
            0.1 *
              (talentVal(
                nodes_map,
                currentSkillVal(nodes_map)['name'],
              ) -
                1))
        const Weapon_Type = statVal(nodes_map, 'Weapon_Type')

        let Non_Skill_Damage_Total = 0

        // Two-Hand Sword Expertise: 20% of direct damage you deal is inflicted as Bleeding damage over 5 seconds.
        if (
          expertiseVal(nodes_map) == 'two-handed-sword' ||
          (Weapon_Type == 1 &&
            aggregationVal(nodes_map, 'two-hand-slashing-weapon') ==
              0)
        ) {
          Non_Skill_Damage_Total +=
            0.2 * triggerVal(nodes_map, 'Flat_Damage')
          // * BarbarianDamageMultiplier(
          //   new Set(['physical', 'damage-over-time', 'bleed']),
          //   nodes_map,
          // )
        }

        // Talent ['tough-as-nails', 3] Increase your Thorns by {3,6,9}% [+]. When enemies hit you, they take an additional 10% of your Thorns as Bleeding damage over 5 seconds.
        if (talentVal(nodes_map, 'tough-as-nails') > 0) {
          Non_Skill_Damage_Total +=
            0.1 *
            BarbarianDamageMultiplier(
              new Set(['physical', 'damage-over-time', 'bleed']),
              nodes_map,
            ) *
            statVal(nodes_map, 'Total_Thorns') *
            statVal(nodes_map, 'Enemy_Attacks_Per_Second')
        }

        // Furious Whirlwind: While using a Slashing Weapon, Whirlwind also inflicts 40% of its Base Damage as Bleeding Damage over 5 Seconds
        if (
          talentVal(nodes_map, 'furious-whirlwind') > 0 &&
          currentSkillVal(nodes_map)['name'] == 'whirlwind'
        ) {
          if (Weapon_Type == 1) {
            Non_Skill_Damage_Total +=
              Base_Damage *
              0.4 *
              BarbarianDamageMultiplier(
                new Set(['physical', 'damage-over-time', 'bleed']),
                nodes_map,
              ) *
              statVal(nodes_map, 'Total_Hits')
          } else if (Weapon_Type == 0) {
            if (
              [0, 1].includes(
                aggregationVal(nodes_map, 'main-hand-weapon'),
              )
            ) {
              Non_Skill_Damage_Total +=
                Base_Damage *
                0.4 *
                BarbarianDamageMultiplier(
                  new Set(['physical', 'damage-over-time', 'bleed']),
                  nodes_map,
                ) *
                statVal(nodes_map, 'Total_Hits')
            } else if (
              [0, 1].includes(
                aggregationVal(nodes_map, 'off-hand-weapon'),
              )
            ) {
              Non_Skill_Damage_Total +=
                Base_Damage *
                0.4 *
                BarbarianDamageMultiplier(
                  new Set(['physical', 'damage-over-time', 'bleed']),
                  nodes_map,
                ) *
                statVal(nodes_map, 'Total_Hits')
            }
          }
        }

        // Aspect of Bul-Kathos: Leap creates an Earthquake that deals {195/380} Physical damage over 4 seconds. While standing in Earthquakes, you gain {5/15}% increased Damage Reduction.
        if (
          currentSkillVal(nodes_map)['name'] == 'leap' &&
          aspectVal(nodes_map, 'aspect-of-bul-kathos').length != 0
        ) {
          Non_Skill_Damage_Total +=
            aspectVal(nodes_map, 'aspect-of-bul-kathos')[0] *
            (1 + Math.min(10 ** 2 / enemy_spread ** 2, 1)) *
            BarbarianDamageMultiplier(
              new Set(['physical', 'damage-over-time', 'earthquake']),
              nodes_map,
            )
        }

        // Earthquake Aspect: Ground Stomp creates an Earthquake damaging enemies for {195/380} Physical damage over 4 seconds.
        //                    While standing in Earthquakes, you deal x{5/15}% increased damage.
        if (
          currentSkillVal(nodes_map)['name'] == 'ground-stomp' &&
          aspectVal(nodes_map, 'earthquake-aspect').length != 0
        ) {
          Non_Skill_Damage_Total +=
            aspectVal(nodes_map, 'earthquake-aspect')[0] *
            (1 + Math.min(10 ** 2 / enemy_spread ** 2, 1)) *
            BarbarianDamageMultiplier(
              new Set(['physical', 'damage-over-time', 'earthquake']),
              nodes_map,
            )
        }

        // (Unique) Hellhammer: Upheaval ignites the ground Burning enemies for an additional {175/250} damage over 4 seconds.
        if (
          aspectVal(nodes_map, 'hellhammer').length != 0 &&
          currentSkillVal(nodes_map)['name'] == 'upheaval'
        ) {
          Non_Skill_Damage_Total +=
            aspectVal(nodes_map, 'hellhammer')[0] *
            (1 + Math.min(10 ** 2 / enemy_spread ** 2, 1)) *
            BarbarianDamageMultiplier(
              new Set(['burn', 'damage-over-time', 'fire']),

              nodes_map,
            )
        }

        // (Unique) Fields of Crimson: While using this weapon, damaging at least one enemy with Rupture creates a blood pool that inflicts {300-1000} Bleeding damage over 6.0 seconds.
        if (
          aspectVal(nodes_map, 'fields-of-crimson').length != 0 &&
          currentSkillVal(nodes_map)['name'] == 'rupture'
        ) {
          Non_Skill_Damage_Total +=
            aspectVal(nodes_map, 'fields-of-crimson')[0] *
            (1 + Math.min(10 ** 2 / enemy_spread ** 2, 1)) *
            BarbarianDamageMultiplier(
              new Set(['damage-over-time', 'bleed', 'physical']),
              nodes_map,
            )
        }

        // Andariels Visage: Lucky Hit: Up to a [[10 - 20]|%|] chance to trigger a poison nova that applies [Affix_Flat_Value_1] Poisoning damage over 5 seconds to enemies in the area.
        if (aspectVal(nodes_map, 'andariels-visage').length > 0) {
          const Average_Procs =
            statVal(nodes_map, 'Total_Lucky_Hit_Chance_Multiplier') *
            aspectVal(nodes_map, 'andariels-visage')[0] *
            statVal(nodes_map, 'Total_Hits')
          const Average_Hits =
            1 +
            Math.min(10 ** 2 / enemy_spread ** 2, 1) *
              (number_of_enemies - 1)

          Non_Skill_Damage_Total +=
            Average_Procs *
            Average_Hits *
            aspectVal(nodes_map, 'andariels-visage')[1] *
            BarbarianDamageMultiplier(
              new Set(['poison', 'damage-over-time']),
              nodes_map,
            )
        }

        // Enhanced Rupture: Ripping your weapon out of an enemy during rupture causes and explosion that does 70% bleeding damage over 5 seconds.
        //                   This damage is increased by x10% for each 50 Strength you have.
        if (
          talentVal(nodes_map, 'enhanced-rupture') > 0 &&
          currentSkillVal(nodes_map)['name'] == 'rupture'
        ) {
          const Strength_Multiplier =
            1 + (0.01 * statVal(nodes_map, 'Total_Strength')) / 50

          Non_Skill_Damage_Total +=
            0.7 *
            Weapon_Damage *
            Strength_Multiplier *
            BarbarianDamageMultiplier(
              new Set(['bleed', 'damage-over-time', 'physical']),
              nodes_map,
            ) *
            (1 +
              Math.min(
                10 ** 2 / statVal(nodes_map, 'Enemy_Spread') ** 2,
                1,
              ) *
                (number_of_enemies - 1))
        }

        // Gushing Wounds (Talent): When causing an enemy to bleed, you have a chance equal to your Critical Strike Chance to increase the Bleed amount by 140% of your Critical Strike Damage Bonus
        //                          Overpowering a bleeding enemy creates an explosion that deals 85% bleeding damage over 5 seconds.
        if (talentVal(nodes_map, 'gushing-wounds') > 0) {
          const Overpower_Chance = statVal(
            nodes_map,
            'Overpower_Chance',
          )
          const Hits =
            1 +
            Math.min(15 ** 2 / enemy_spread ** 2, 1) *
              (number_of_enemies - 1)

          Non_Skill_Damage_Total +=
            Weapon_Damage *
            0.85 *
            Hits *
            Overpower_Chance *
            Pre_Sim_Node['dot_uptime'] *
            BarbarianDamageMultiplier(
              new Set(['bleed', 'damage-over-time', 'physical']),
              nodes_map,
            )
        }

        // Aspect of Berserk Ripping: Whenever you deal direct damage while Berserking, inflict {20/30}% of the Base damage dealt as additional Bleeding damage over 5.0 seconds.
        if (
          aspectVal(nodes_map, 'aspect-of-berserk-ripping').length !=
          0
        ) {
          Non_Skill_Damage_Total +=
            aspectVal(nodes_map, 'aspect-of-berserk-ripping')[0] *
            Base_Damage *
            statVal(nodes_map, 'Berserking_Uptime') *
            BarbarianDamageMultiplier(
              new Set(['bleed', 'damage-over-time', 'physical']),
              nodes_map,
            ) *
            statVal(nodes_map, 'Total_Hits')
        }

        return Non_Skill_Damage_Total
      },
    ),

    Non_Skill_Flat_Damage: new TriggerNode(
      'Non_Skill_Flat_Damage',
      () => {
        const number_of_enemies = Number(
          toggleVal(nodes_map, 'number-of-enemies'),
        )
        const enemy_spread = Number(
          statVal(nodes_map, 'Enemy_Spread'),
        )
        const Pre_Sim_Node = barbarianPresimVal(nodes_map)
        const Weapon_Damage = statVal(
          nodes_map,
          'Total_Weapon_Damage',
        )
        const Base_Damage =
          Weapon_Damage *
          currentSkillVal(nodes_map)['modifiers']['flat'] *
          (1 +
            0.1 *
              (talentVal(
                nodes_map,
                currentSkillVal(nodes_map)['name'],
              ) -
                1))

        let Non_Skill_Damage_Total = 0
        const Dust_Devil_Hits =
          1 +
          ProbabilityIntersectingLineInCircle(
            7,
            50,
            statVal(nodes_map, 'Enemy_Spread'),
          ) *
            (number_of_enemies - 1)

        // Windlasher Aspect: Casting Double Swing twice within 1.5 seconds creates a Dust Devil that deals {80/125} damage to enemies behind the target.
        if (
          aspectVal(nodes_map, 'windlasher-aspect').length != 0 &&
          currentSkillVal(nodes_map)['name'] == 'double-swing'
        ) {
          Non_Skill_Damage_Total +=
            0.5 *
            Dust_Devil_Hits *
            aspectVal(nodes_map, 'windlasher-aspect')[0] *
            BarbarianDamageMultiplier(
              new Set(['physical', 'dust-devil']),
              nodes_map,
            )
        }

        // Devilish Aspect: After generating 100.0 Fury your next Core Skill creates a Dust Devil that deals {100/180} damage to enemies behind the target.
        if (
          aspectVal(nodes_map, 'devilish-aspect').length != 0 &&
          tagsVal(nodes_map).has('core')
        ) {
          const Core_Skills = new Set([
            'whirlwind',
            'upheaval',
            'rend',
            'double-swing',
            'hammer-of-the-ancients',
          ])
          let Devilish_Aspect_Proc_Rate = 0
          let Core_Skill_Rate = 0
          for (const skill in Pre_Sim_Node['skill_use_rate']) {
            if (Core_Skills.has(skill)) {
              Core_Skill_Rate += Pre_Sim_Node['skill_use_rate'][skill]
            }
            if (
              Pre_Sim_Node['cross_skill_stat'][skill][
                'resource_cost'
              ] < 0
            ) {
              Devilish_Aspect_Proc_Rate -=
                (Pre_Sim_Node['cross_skill_stat'][skill][
                  'resource_cost'
                ] *
                  Pre_Sim_Node['skill_use_rate'][skill]) /
                100
            }
          }

          const Devilish_Aspect_Proportion = Math.min(
            1,
            Devilish_Aspect_Proc_Rate / (Core_Skill_Rate + 0.000001),
          )
          Non_Skill_Damage_Total +=
            Devilish_Aspect_Proportion *
            Dust_Devil_Hits *
            aspectVal(nodes_map, 'devilish-aspect')[0] *
            BarbarianDamageMultiplier(
              new Set(['physical', 'dust-devil']),
              nodes_map,
            )
        }

        // Dust Devil's Aspect: Whirlwind leaves behind Dust Devils that deal {80/125} damage to surrounding enemies.
        if (
          aspectVal(nodes_map, 'dust-devils-aspect').length != 0 &&
          currentSkillVal(nodes_map)['name'] == 'whirlwind'
        ) {
          Non_Skill_Damage_Total +=
            Dust_Devil_Hits *
            aspectVal(nodes_map, 'dust-devils-aspect')[0] *
            BarbarianDamageMultiplier(
              new Set(['physical', 'dust-devil']),
              nodes_map,
            )
        }

        // (Unique) Gohr's Devastating Grips: Whirlwind explodes after it ends, dealing {16/26}% of the total Base damage dealt to surrounding enemies as Fire damage.
        if (
          aspectVal(nodes_map, 'gohrs-devastating-grips').length !=
            0 &&
          currentSkillVal(nodes_map)['name'] == 'whirlwind'
        ) {
          Non_Skill_Damage_Total +=
            Base_Damage *
            aspectVal(nodes_map, 'gohrs-devastating-grips')[0] *
            BarbarianDamageMultiplier(new Set(['fire']), nodes_map) *
            (1 +
              Math.min(
                10 ** 2 / statVal(nodes_map, 'Enemy_Spread') ** 2,
                1,
              ) *
                (number_of_enemies - 1))
        }

        // (Unique) Overkill: Death Blow creates a shockwave, dealing {16/30}% of its Base damage to enemies. Enemies who die to this effect also reset Death Blow's Cooldown.
        if (
          aspectVal(nodes_map, 'overkill').length != 0 &&
          currentSkillVal(nodes_map)['name'] == 'death-blow'
        ) {
          Non_Skill_Damage_Total +=
            Base_Damage *
            aspectVal(nodes_map, 'overkill')[0] *
            BarbarianDamageMultiplier(
              new Set(['physical']),
              nodes_map,
            ) *
            (1 +
              Math.min(
                10 ** 2 / statVal(nodes_map, 'Enemy_Spread') ** 2,
                1,
              ) *
                (number_of_enemies - 1))
        }

        // Doombringer: Lucky Hit: Up to a [0.7|%|] chance to deal 0.7*825 Shadow damage to surrounding enemies and reduce their damage done by 20% for 3 seconds.
        if (aspectVal(nodes_map, 'doombringer').length > 0) {
          const Hits =
            1 +
            Math.min(
              10 ** 2 / statVal(nodes_map, 'Enemy_Spread') ** 2,
              1,
            ) *
              (number_of_enemies - 1)

          Non_Skill_Damage_Total +=
            aspectVal(nodes_map, 'doombringer')[0] *
            aspectVal(nodes_map, 'doombringer')[1] *
            statVal(nodes_map, 'Total_Lucky_Hit_Chance_Multiplier') *
            Hits *
            BarbarianDamageMultiplier(new Set(['shadow']), nodes_map)
        }

        // Azurewrath: Lucky Hit: Your Core Skills have up to a 20% chance to Freeze enemies for 3 seconds and deal {value} Cold damage to them.
        if (
          aspectVal(nodes_map, 'azurewrath').length > 0 &&
          tagsVal(nodes_map).has('core')
        ) {
          Non_Skill_Damage_Total +=
            0.2 *
            aspectVal(nodes_map, 'azurewrath')[0] *
            statVal(nodes_map, 'Total_Lucky_Hit_Chance_Multiplier') *
            statVal(nodes_map, 'Total_Hits') *
            BarbarianDamageMultiplier(new Set(['cold']), nodes_map)
        }

        // Brawler's Aspect: Enemies damaged by Kick or Charge will explode if they are killed within the next 2.0 seconds, dealing {500/650} damage to surrounding enemies.
        if (aspectVal(nodes_map, 'brawlers-aspect').length != 0) {
          let Brawlers_Rate = 0
          for (const Skill in Pre_Sim_Node['skill_use_rate']) {
            if (['kick', 'charge'].includes(Skill)) {
              Brawlers_Rate += Pre_Sim_Node['skill_use_rate'][Skill]
            }
          }
          Non_Skill_Damage_Total +=
            Math.min(2 * Brawlers_Rate, 1) *
            Math.min(1, statVal(nodes_map, 'Enemies_Killed')) *
            aspectVal(nodes_map, 'brawlers-aspect')[0] *
            (number_of_enemies - 1) *
            Math.min(10 ** 2 / enemy_spread ** 2, 1) *
            BarbarianDamageMultiplier(
              new Set(['physical']),
              nodes_map,
            )
        }

        // X'Fal's Corroded Signet (Generic Unique Ring)
        //Lucky Hit: Your damage over time effects have up to a 50% chance to erupt, dealing [5.0-6.0] damage of the same type to Nearby enemies.
        if (
          aspectVal(nodes_map, 'xfals-corroded-signet').length > 0 &&
          tagsVal(nodes_map).has('damage-over-time')
        ) {
          let Dot_Tag: string[] = []
          for (const Tag of tagsVal(nodes_map)) {
            switch (Tag) {
              case 'physical':
                Dot_Tag = ['physical']
                break
              case 'fire':
                Dot_Tag = ['fire']
                break
              case 'cold':
                Dot_Tag = ['cold']
                break
              case 'lightning':
                Dot_Tag = ['lightning']
                break
              case 'shadow':
                Dot_Tag = ['shadow']
                break
              case 'poison':
                Dot_Tag = ['poison']
                break
              default:
                break
            }
          }
          if (Dot_Tag.length > 0) {
            let AOE_Hits =
              1 +
              Math.min(
                10 ** 2 / statVal(nodes_map, 'Enemy_Spread') ** 2,
                1,
              ) *
                (number_of_enemies - 1)
            if (toggleVal(nodes_map, 'enemy-distant')) {
              AOE_Hits =
                Math.min(
                  10 ** 2 / statVal(nodes_map, 'Enemy_Spread') ** 2,
                  1,
                ) * number_of_enemies
            }

            Non_Skill_Damage_Total +=
              0.5 *
              aspectVal(nodes_map, 'xfals-corroded-signet')[0] *
              statVal(
                nodes_map,
                'Total_Lucky_Hit_Chance_Multiplier',
              ) *
              BarbarianDamageMultiplier(
                new Set(Dot_Tag[0]),
                nodes_map,
              ) *
              statVal(nodes_map, 'Total_Hits') *
              AOE_Hits
          }
        }

        // Vampiric Power infection
        // Hitting enemies with direct damage infects them with Pox. Inflicting Pox 8 times on an enemy expunges their infection, dealing 70% Poison damage.
        if (
          vampiricPowerVal(nodes_map, 'infection') &&
          triggerVal(nodes_map, 'Flat_Damage') > 0
        ) {
          Non_Skill_Damage_Total +=
            (0.7 *
              BarbarianDamageMultiplier(
                new Set(['poison']),
                nodes_map,
              ) *
              statVal(nodes_map, 'Total_Hits')) /
            8
        }

        // Vampiric Power blood-boil
        // When your Core Skills Overpower an enemy, you spawn 3 Volatile Blood Drops. Collecting a Volatile Blood Drop causes it to explode, dealing 60% Physical damage around you. Every 20 seconds, your next Skill is guaranteed to Overpower.
        if (
          vampiricPowerVal(nodes_map, 'blood-boil') &&
          tagsVal(nodes_map).has('core')
        ) {
          const Overpower_Chance = statVal(
            nodes_map,
            'Overpower_Chance',
          )

          let Blood_Boil_Hits =
            1 +
            Math.min(
              10 ** 2 / statVal(nodes_map, 'Enemy_Spread') ** 2,
              1,
            ) *
              (number_of_enemies - 1)
          if (toggleVal(nodes_map, 'enemy-distant')) {
            Blood_Boil_Hits =
              Math.min(
                10 ** 2 / statVal(nodes_map, 'Enemy_Spread') ** 2,
                1,
              ) * number_of_enemies
          }
          Non_Skill_Damage_Total +=
            0.6 * // AoE damage modifier
            3 * // Number of Blood Drops
            BarbarianDamageMultiplier(
              new Set(['physical']),
              nodes_map,
            ) *
            Blood_Boil_Hits *
            Overpower_Chance
        }

        return Non_Skill_Damage_Total
      },
    ),

    Total_Damage_Over_Time: new TriggerNode(
      'Total_Damage_Over_Time',
      () => {
        const bleed_damage = triggerVal(nodes_map, 'Skill_Dot_Damage')
        const other_dot_damage = triggerVal(
          nodes_map,
          'Non_Skill_Dot_Damage',
        )

        return (
          (bleed_damage + other_dot_damage) *
          statVal(nodes_map, 'Number_Of_Cast')
        )
      },
    ),

    Total_Flat_Damage: new TriggerNode('Total_Flat_Damage', () => {
      const flat_damage =
        triggerVal(nodes_map, 'Flat_Damage') +
        triggerVal(nodes_map, 'Non_Skill_Flat_Damage')

      const passive_flat_damage =
        statVal(nodes_map, 'Passive_Dps') *
        statVal(nodes_map, 'Elapsed_Time')

      return (
        flat_damage * statVal(nodes_map, 'Number_Of_Cast') +
        passive_flat_damage
      )
    }),
  }
}
