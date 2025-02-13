/* eslint-disable @typescript-eslint/no-unused-vars */

import { paragon } from 'data'

import {
  BinomialDistribution,
  BinomialProbability,
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
  baseStatVal,
  currentSkillVal,
  druidPresimVal,
  malignantHeartVal,
  paragonVal,
  seneschalConstructVal,
  skillVal,
  spiritBoonVal,
  statVal,
  tagsVal,
  talentVal,
  toggleVal,
  triggerVal,
  vampiricPowerVal,
} from './graph_values'

/*
  Here we build the computation graph for the Druid. We construct maps for each type of node which contain all nodes of that
  type. For nodes types which have no dependencies, we have functions to manually modify and set the value for that node. For
  node types which do depend on other nodes, we pass an `update_value_function` into the constructor which uses the value of
  other nodes to compute the value of that node. The value need only be computed a single time once all the root nodes are fixed.
  We start with the nodes which have no dependencies.
  */

function DruidDamageMultiplier(
  tags: Set<string>,
  nodes_map: NodesMap,
) {
  let Generic_Damage_Bucket_Multiplier =
    1 + statVal(nodes_map, 'Generic_Damage_Bonus')

  const Pre_Sim_Node = druidPresimVal(nodes_map)

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
    statVal(nodes_map, 'Enemy_Crowd_Controlled') *
    aggregationVal(nodes_map, 'damage-to-crowd-controlled-enemies')

  Generic_Damage_Bucket_Multiplier +=
    Number(tags.has('werebear')) *
    (aggregationVal(nodes_map, 'damage-while-in-werebear-form') +
      aggregationVal(nodes_map, 'damage-while-werebear'))

  Generic_Damage_Bucket_Multiplier +=
    Number(tags.has('werebear')) *
    aggregationVal(nodes_map, 'damage-while-werewolf')

  // Needs fixing like below.
  Generic_Damage_Bucket_Multiplier +=
    Number(!tags.has('werebear') && !tags.has('werewolf')) *
    (aggregationVal(nodes_map, 'damage-while-human') +
      aggregationVal(nodes_map, 'damage-while-in-human'))

  // Not quite right. We would need some way to track form.
  Generic_Damage_Bucket_Multiplier +=
    Number(tags.has('shapeshifting')) *
    aggregationVal(nodes_map, 'damage-while-shapeshifted')

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
    Number(
      (tags.has('shadow') && tags.has('damage-over-time')) ||
        tags.has('shadow-damage-over-time'),
    ) * aggregationVal(nodes_map, 'shadow-damage-over-time')

  Generic_Damage_Bucket_Multiplier +=
    aggregationVal(nodes_map, 'vulnerable-damage') *
    statVal(nodes_map, 'Enemy_Vulnerable')

  // 'damage-with-lightning-bolts',  electrocution glyph
  Generic_Damage_Bucket_Multiplier +=
    aggregationVal(nodes_map, 'damage-with-lightning-bolts') *
    Number(tags.has('lightning-bolt'))

  const Vulnerable_Damage_Bucket_Multiplier =
    1 + 0.2 * statVal(nodes_map, 'Enemy_Vulnerable')

  // Multiplier which should be applied to all sources of damage from the character which can crit, not just skills.
  let Crit_Chance = 0
  if (
    !tags.has('thorns') &&
    !tags.has('damage-over-time') &&
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

    // Lupine Ferocity: Every 6th Werewolf Skill hit Critically Strikes and deals 70% increased damage.
    if (
      tags.has('skill') &&
      tags.has('werewolf') &&
      talentVal(nodes_map, 'lupine-ferocity') > 0
    ) {
      // Each hit is 1/6 of closing the gap to a crit.
      Crit_Chance += 1 - Crit_Chance / 6
    }

    // Supreme Lacerate: Lacerate's initial strike is guaranteed to Critically Strike and deals 150% increased damage.
    if (
      tags.has('skill') &&
      currentSkillVal(nodes_map)['name'] == 'lacerate' &&
      talentVal(nodes_map, 'supreme-lacerate') > 0
    ) {
      // First hit is a guaranteed crit is instead averaged so that each hit gets 1/Total_Hits of the way closer to a crit.
      Crit_Chance +=
        (1 - Crit_Chance) / statVal(nodes_map, 'Total_Hits')
    }
  }

  let Critical_Damage_Bonus = statVal(
    nodes_map,
    'Generic_Critical_Bonus',
  )
  if (tags.has('lightning')) {
    Critical_Damage_Bonus += aggregationVal(
      nodes_map,
      'lightning-critical-strike-damage',
    )
  }
  let Critical_Damage_Multiplier = statVal(
    nodes_map,
    'Generic_Critical_Damage_Multiplier',
  )
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

  // Bane: Poisoning damage effects have a 10% chance to deal double the amount of damage over their duration.
  if (tags.has('poison')) {
    Talent_Damage_Multiplier *=
      1 + 0.1 * Number(paragonVal(nodes_map, 'bane'))
  }

  // Keeper: You and your Companions deal x10% increased Non-Physical damage.
  if (!tags.has('physical')) {
    Talent_Damage_Multiplier *=
      1 + 0.1 * Number(paragonVal(nodes_map, 'keeper'))
  }

  // Fulminate: You deal x12% increased Lightning damage to both Healthy and Injured enemies.
  if (tags.has('lightning')) {
    Talent_Damage_Multiplier *=
      1 +
      ((0.12 * 0.55) / (1 + 0.12 * 0.45)) *
        Number(paragonVal(nodes_map, 'fulminate'))
  }

  // Outmatch: You deal x16% increased Physical damage to Non-Elites and Bosses.
  if (tags.has('physical') && !toggleVal(nodes_map, 'enemy-elite')) {
    Talent_Damage_Multiplier *=
      1 + 0.16 * Number(paragonVal(nodes_map, 'outmatch'))
  }

  // Call of the Wild: Your Companion Skills deal {['10%', '20%', '30%']} bonus damage.
  Talent_Damage_Multiplier *=
    1 +
    0.1 *
      talentVal(nodes_map, 'call-of-the-wild') *
      Number(tags.has('companion'))

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

  // Vampiric Power covens-fangs
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
    !tags.has('damage-over-time') &&
    tags.has('skill') &&
    !tags.has('channeled')
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
    Vulnerable_Damage_Bucket_Multiplier *
    (1 -
      Math.min(Crit_Chance, 1) +
      Math.min(Crit_Chance, 1) * Critical_Damage_Multiplier) *
    (1 - Overpower_Chance + Overpower_Chance * Overpower_Multiplier) *
    Talent_Damage_Multiplier *
    Aspect_Damage_Multiplier *
    Attribute_Damage_Multiplier
  )
}

// Modifier Nodes Dependencies

const DruidParagonNames: string[] = [
  // Glyph Bonuses
  'guzzler', // You gain +30% increased Potion Healing.
  'protector', // You gain 10% Damage Reduction while you have an active Barrier.
  'poise', // You have a 30% chance when Shapeshifting to gain a Barrier that absorbs 5% of your Maximum Life in damage for 4 seconds.
  'territorial', // You gain 10% Damage Reduction against Close enemies.
  'exploit', // When an enemy is damaged by you, they become Vulnerable for 3 seconds. This cannot happen more than once every 20 seconds per enemy.
  'undaunted', // You gain up to 10% Damage Reduction the more Fortify you have.
  'dominate', // When you Overpower an enemy, all damage they take from you is increased by x12% for 5 seconds.
  'fang-and-claw', // While in Werewolf or Werebear form, Close enemies take x12% increased damage from you.
  'earth-and-sky', // Nature Magic Skills deal x10% increased damage to Crowd Controlled or Vulnerable enemies.
  'wilds', // The Passive portion of Companion Skills deal x80% increased damage.
  'werebear', // You gain 10% Damage Reduction while in Werebear form.
  'werewolf', // You gain 10% Damage Reduction while in Werewolf form.
  'human', // You gain 10% Damage Reduction while in Human form.
  'bane', // Poisoning damage effects have a 10% chance to deal double the amount of damage over their duration.
  'keeper', // You and your Companions deal x10% increased Non-Physical damage.
  'fulminate', // You deal x12% increased Lightning damage to both Healthy and Injured enemies.
  'tracker', // Poisoning damage effects last x33.3% longer.
  'outmatch', // You deal x16% increased Physical damage to Non-Elites and Bosses.
  'spirit', // Critical Strikes increase the damage an enemy takes from you by x2% for 20 seconds, up to x12%.
  'shapeshifter', // Shapeshifting has a 20% chance to cause the Skill's damage to Critically Strike.
  'electrocution', // Enemies damaged by your Lightning Bolts or Dancing Bolts take 20%[x] increased damage from you for 5 seconds.
  'tectonic', // You gain 15% [+] Lucky Hit Chance.

  // Legendary Paragon
  'thunderstruck', // Storm Skills deal bonus damage equal to 50%[x] of the total amount of your Damage to Close and Damage to Distant bonuses.
  'earthen-devastation', // Earth Skills deal 10%[x] increased Critical Strike Damage, increased by 20%[x] of the total amount of your Bonus Damage to Crowd Controlled up to 40%[x].
  'survival-instincts', // While in Werebear form, you deal x1% increased damage, up to x50%, for every 1% difference in current Life percent between you and the enemy.
  'lust-for-carnage', // Critical Strikes with Werewolf Skills restore 2 Spirit.
  'heightened-malice', // While there are 3 or more Poisoned enemies Nearby, you deal x45% increased damage.
  'inner-beast', // After shapeshifting, your Spirit costs are reduced by 10% for 5 seconds, up to 30%.
  'constricting-tendrils', // Lucky Hit: Nature Magic Skills have up to a 15% chance to entangle the enemy with vines, Immobilizing them for 2 seconds and Poisoning them for 120% of the Base damage dealt over 4 seconds.
  'ancestral-guidance', // After spending 75 Spirit, you deal x30% increased damage for 5 seconds.
]

export function CreateDruidParagonNodes(): Record<
  string,
  ParagonNode
> {
  const nodes: Record<string, ParagonNode> = {}
  for (const key of DruidParagonNames) {
    nodes[key] = new ParagonNode(key, 'boolean')
  }
  return nodes
}

/* --------------------------------------------------------------------------
                      MALIGNANT HEARTS
----------------------------------------------------------------------------*/
export function CreateDruidMalignantHeartNodes(): Record<
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
    // (Druid) inexorable-force:	Up to [{minValue1} - {maxValue1}] Distant enemies are pulled toward you while you have an Ultimate Skill active.
    'inexorable-force': new MalignantHeartNode('inexorable-force', 1),
    // (Druid) the-agitated-winds:	When [{minValue1} - {maxValue1}] Close enemies, automatically cast Cyclone Armor. This cannot occur more than once every  [{minValue1} - {maxValue1}] seconds.
    'the-agitated-winds': new MalignantHeartNode(
      'the-agitated-winds',
      2,
    ),
    // (Druid) the-moonrage	Kills: have a {minValue1}% chance to summon a Wolf Companion to your side for [{minValue2} - {maxValue2}] seconds. In addition, gain +3 to Wolves.
    'the-moonrage': new MalignantHeartNode('the-moonrage', 2),
    // (Druid) the-unconstrained-beast:	When you are hit with a Stun, Freeze or Knock Down effect, there is a [{minValue1} - {maxValue1}]% chance to automatically activate Grizzly Rage for 2 seconds.
    'the-unconstrained-beast': new MalignantHeartNode(
      'the-unconstrained-beast',
      1,
    ),
  }
}
/* ------------------------------------------------------------------------------------------------------------------------------- */

// Prickleskin: Gain # Thorns.
// Gift of the Stag: Gain +20 Maximum Spirit. // Done
// Wariness: Take 10% reduced damage from Elites.
// Advantageous Beast: Reduce the duration of Control Impairing Effects by 15%.

// Scythe Talons: Gain +5% increased Critical Strike Chance. // Done
// Iron Feather: Gain x10% Maximum Life. // Done
// Swooping Attacks: Gain +10% Attack Speed // Done
// Avian Wrath: Gain +30% Critical Strike Damage. // Done

// Obsidian Slam: Every 20th kill will cause your next Earth Skill to Overpower.
// Overload: Lucky Hit: Dealing Lightning damage has up to a 40% chance to cause the target to emit a static discharge, dealing 25% Lightning damage to surrounding enemies. // Done
// Masochistic: Lucky Hit: up to a 75% chance that Critical Strikes with Shapeshifting Skills Heal you for 3% Maximum Life
// Calm Before the Storm: Lucky Hit: Nature Magic Skills have up to a 10% chance to reduce the Cooldown of your Ultimate Skill by 2 seconds.

// Packleader:Lucky Hit: Critical Strikes have up to a 20% chance to reset the Cooldowns of your Companion Skills.
// Energize: Lucky Hit: Dealing damage has up to a 15% chance to restore 10 Spirit. // Done
// Bolster: Fortify for 15% of your Maximum Life when you use a Defensive Skill.
// Calamity: Extend the duration of Ultimate Skills by 25%. // Done

const DruidTalentsToMaxValue: [string, number][] = [
  ['claw', 5], // Shapeshift into a Werewolf and claw at an enemy for {['20%', '22%', '24%', '26%', '28%']} damage.
  ['enhanced-claw', 1], // Enhanced Claw Claw's Attack Speed is increased by  15%[+].
  ['fierce-claw', 1], // Claw applies 15% Poisoning damage over 6 seconds. // DONE
  ['wild-claw', 1], // Claw has a 15% chance to attack twice. // DONE
  ['earth-spike', 5], // Sunder the earth, impaling the first enemy hit for {['16%', '18%', '19%', '21%', '22%']} damage.
  ['enhanced-earth-spike', 1], // Earth Spike has a 10% chance to Stun for 2.5 seconds. // IGNORE
  ['fierce-earth-spike', 1], // Fortify for 8% of your Base Life whenever Earth Spike damages enemies who are Stunned, Immobilized, or Knocked Back. // IGNORE
  ['wild-earth-spike', 1], // Summon a second Earth Spike when hitting an Immobilized or Stunned enemy. // DONE
  ['maul', 5], // Shapeshift into a Werebear and maul enemies in front of you, dealing {['20%', '22%', '24%', '26%', '28%']} damage.
  ['enhanced-maul', 1], // If an enemy is hit by Maul, then Fortify for 3% of your Base Life. // IGNORE
  ['fierce-maul', 1], // Increases the range and radius of Maul by 30%. // TODO
  ['wild-maul', 1], // Maul has a 10% chance to Knock Down enemies for 1.5 seconds. // IGNORE
  ['storm-strike', 5], // Electricity gathers around your weapon, dealing {['20%', '22%', '24%', '26%', '28%']} damage to your target and chaining to up to 3 surrounding enemies, dealing 20% less damage each time it chains.
  ['enhanced-storm-strike', 1], // Storm Strike has a 15% chance to Immobilize all enemies hit for 2.5 seconds. // IGNORE
  ['fierce-storm-strike', 1], // Storm Strike has a 50% chance to make enemies Vulnerable for 3 seconds. // IGNORE
  ['wild-storm-strike', 1], // Storm Strike chains to 2 additional targets. // TODO
  ['wind-shear', 5], // Conjure a piercing blade of wind, dealing {['17%', '19%', '20%', '22%', '24%']} damage.
  ['enhanced-wind-shear', 1], // Wind Shear has a 20% chance to make enemies Vulnerable for 4 seconds. // IGNORE
  ['fierce-wind-shear', 1], // Each enemy hit by Wind Shear increases your Movement Speed by 5% for 5 seconds, up to 20%. // TODO
  ['wild-wind-shear', 1], // Wind Shear grants 3 additional Spirit for each enemy hit beyond the first. // DONE
  ['landslide', 5], // Crush enemies between 2 pillars of earth, dealing up to {['113%', '124%', '135%', '146%', '157%']} damage.
  ['enhanced-landslide', 1], // After Landslide damages enemies 4 times, the next hit will Immobilize enemies for 3 seconds. // IGNORE
  ['raging-landslide', 1], // When you strike an Immobilized or Stunned enemy with Landslide, an additional pillar of earth is formed. // DONE
  ['primal-landslide', 1], // When you Immobilize or Stun an enemy, you gain a Terramote. Each enemy hit by Landslide consumes a Terramote causing a guaranteed Critical Strike with 40% Critical Strike Damage. Bosses always have up to a 10% chance to grant a Terramote when hit. // TODO
  ['lightning-storm', 5], // Conjure a growing lightning storm that deals {['25%', '28%', '30%', '32%', '35%']} damage per strike and increases the number of strikes the longer it is channeled up to a maximum of 5.
  ['enhanced-lightning-storm', 1], // The size of your Lightning Storm is preserved for 6 seconds after channeling. // IGNORE
  ['raging-lightning-storm', 1], // Lightning Storm gains 1 additional lightning strike. // DONE
  ['primal-lightning-storm', 1], // Lightning Storm has a 12% chance to Immobilize enemies hit for 3 seconds. // IGNORE
  ['pulverize', 5], // Shapeshift into a Werebear and slam the ground, dealing {['50%', '55%', '60%', '65%', '70%']} damage to surrounding enemies.
  ['enhanced-pulverize', 1], // Your next Pulverize will Overpower every 12 seconds while you remain Healthy. // TODO
  ['raging-pulverize', 1], // Enemies Overpowered by Pulverize are Stunned for 2 seconds. // IGNORE
  ['primal-pulverize', 1], // Enemies hit with Pulverize deal 20% reduced damage for 4 seconds. // TODO
  ['shred', 5], // Shapeshift into a Werewolf and perform a trio of combo attacks:
  ['enhanced-shred', 1], // Shred gains 30% Attack Speed and Heals for 2% of your Maximum Life if an enemy is struck. // DONE
  ['raging-shred', 1], // Shred's third combo attack is larger and applies an additional 70% Poisoning damage over 5 seconds. // DONE
  ['primal-shred', 1], // Shred's second and third attacks also perform a dash. In addition, Shred's Critical Strike Damage is increased by 30%. // DONE
  ['tornado', 5], // Conjure a swirling tornado that deals {['35%', '39%', '42%', '46%', '49%']} damage.
  ['enhanced-tornado', 1], // Each time you cast Tornado, you have a 20% chance to spawn an additional Tornado. // DONE
  ['raging-tornado', 1], // Enemies hit with Tornado have a 10% chance to become Vulnerable for 3 seconds. // IGNORE
  ['primal-tornado', 1], // Enemies damaged by Tornado are Slowed by 8% for 3 seconds, stacking up to 40%. // IGNORE
  ['blood-howl', 5], // Shapeshift into a Werewolf and howl furiously, Healing you for {['20%', '21.8%', '23.5%', '25.2%', '26.8%']} of your Maximum Life.
  ['enhanced-blood-howl', 1], // Kills reduce the Cooldown of Blood Howl by 1 second. // TODO
  ['preserving-blood-howl', 1], // Blood Howl also increases your Attack Speed by 15% for 4 seconds. // TODO
  ['innate-blood-howl', 1], // Innate Blood Howl: Blood Howl also generates 20 Spirit.
  ['cyclone-armor', 5], // <b>Passive</b>: Powerful winds surround you, granting {['20%', '21.8%', '23.5%', '25.2%', '26.8%']} Non-Physical DamageReduction.
  ['enhanced-cyclone-armor', 1], // Enemies who are Knocked Back by Cyclone Armor are also Slowed by 70% for 1.5 seconds. // IGNORE
  ['innate-cyclone-armor', 1], // Enemies Knocked Back by Cyclone Armor become Vulnerable for 3 seconds. // IGNORE
  ['preserving-cyclone-armor', 1], // Every 10 seconds, Cyclone Armor intensifies, causing incoming damage to grant you 30% Damage Reduction for 2 seconds. // DONE
  ['debilitating-roar', 5], // Shapeshift into a Werebear and bellow a mighty roar, reducing Nearby enemies' damage dealt by 50% for 4 seconds. // TODO
  ['enhanced-debilitating-roar', 1], // Debilitating Roar also Fortifies you for 22% Base Life. // IGNORE
  ['innate-debilitating-roar', 1], // Debilitating Roar also Slows enemies by 40% for its duration. // IGNORE
  ['preserving-debilitating-roar', 1], // Debilitating Roar also Heals you for 4% of your Maximum Life (2) each second for its duration. // IGNORE
  ['earthen-bulwark', 5], // Rock's surround you for 3 seconds, granting a Barrier that absorbs {['45%', '50%', '54%', '58%', '63%']} of your Base Life in damage. // TODO
  ['enhanced-earthen-bulwark', 1], // Earthen Bulwark makes you Unstoppable while active. // IGNORE
  ['innate-earthen-bulwark', 1], // Rock shrapnel flies outward when Earthen Bulwark is destroyed or expires, dealing [X] damage to surrounding enemies. This damage is increased by Barrier bonuses. // TODO
  ['preserving-earthen-bulwark', 1], // Casting Earthen Bulwark grants 18% Base Life as Fortify. // IGNORE
  ['ravens', 5], // <b>Passive</b>: 1 Raven flies above you and periodically attacks your enemies for {['13%', '13%', '13%', '13%', '13%']} damage every 5 seconds.
  ['enhanced-ravens', 1], // You have 8% increased Critical Strike Chance for 6 seconds against Enemies hit by Ravens. // DONE
  ['ferocious-ravens', 1], // Enemies inside the swarm of Ravens when it is activated become Vulnerable for 3 seconds. // IGNORE
  ['brutal-ravens', 1], // 2 additional Ravens periodically attack enemies and Increase the passive damage of Ravens by 40%.
  ['poison-creeper', 5], // <b>Passive</b>: A poison creeper periodically emerges from the ground every 7 seconds and applies {['36%', '40%', '43%', '47%', '50%']} Poisoning damage over 6 seconds to an enemy in the area. // TODO
  ['enhanced-poison-creeper', 1], // poison creeper's Immobilize duration is increased by 1 second. // IGNORE
  ['ferocious-poison-creeper', 1], // poison creeper's active Poisoning duration is increased by 3 seconds. // TODO
  ['brutal-poison-creeper', 1], // Your Critical Strike Chance is increased by 20% against enemies strangled by poison creeper. // IGNORE
  ['wolves', 5], // <b>Passive</b>: Summon 2 wolf companions that bite enemies for 7% damage. // TODO
  ['enhanced-wolves', 1], // Wolves deal 25% increased damage to Immobilized, Stunned, Slowed, or Poisoned enemies.
  ['ferocious-wolves', 1], // Lucky Hit: Your Wolves' attacks have up to a 40% chance to Fortify you for 8% Base Life. // IGNORE
  ['brutal-wolves', 1], // When you Critically Strike, your Wolves gain 25% Attack Speed for 3 seconds. // TODO
  ['boulder', 5], // Unearth a large rolling boulder that Knocks Back and crushes enemies, dealing {['33%', '36%', '40%', '43%', '46%']} damage with each hit.
  ['enhanced-boulder', 1], // When Boulder reaches the end of its path, enemies hit are Slowed by 30% for 3 seconds. If Boulder Overpowered, enemies are Stunned for 4 seconds instead. // IGNORE
  ['natural-boulder', 1], // While you have any Fortify, Boulder has 20% increased Critical Strike Chance. // DONE
  ['savage-boulder', 1], // Boulder's Critical Strike Chance is increased by 3%[+] each time it deals damage.
  ['hurricane', 5], // Form a hurricane around you that deals {['97%', '107%', '117%', '127%', '136%']} damage to surrounding enemies over 8 seconds.
  ['enhanced-hurricane', 1], // Enemies who are damaged by Hurricane are Slowed by 25% for 2 seconds. // IGNORE
  ['natural-hurricane', 1], // Hurricane has a 15% chance to make enemies Vulnerable for 3 seconds. // IGNORE
  ['savage-hurricane', 1], // Enemies affected by Hurricane deal 20% less damage.
  ['rabies', 5], // Shapeshift into a Werewolf and perform an infectious bite on the target dealing {['28%', '31%', '34%', '36%', '39%']} damage, and applying an additional {value2} Poisoning damage over 6 seconds. // TODO
  ['enhanced-rabies', 1], // Rabies' Poisoning damage also increases over the lifetime of the disease, dealing 60% bonus damage at max duration. // TODO
  ['natural-rabies', 1], // Rabies spreads 100% faster. // IGNORE
  ['savage-rabies', 1], // Rabies deals its total Poisoning damage in 4 seconds instead of 6. // IGNORE
  ['trample', 5], // Shapeshift into a Werebear, become Unstoppable, and charge forward, dealing {['25%', '28%', '30%', '32%', '35%']} damage and Knocking Back enemies. // TODO
  ['enhanced-trample', 1], // Trample deals 30% bonus damage. This bonus is reduced by 15% for each enemy hit after the first. // TODO
  ['natural-trample', 1], // Casting Trample grants 20% Base Life as Fortify. // IGNORE
  ['savage-trample', 1], // Savage Trample Casting Trample grants  40 Spirit.
  ['cataclysm', 1], // A massive storm follows you for 8 seconds. Tornadoes Knock Back enemies, and lightning strikes wildly dealing 52% damage. // TODO
  ['prime-cataclysm', 1], // Cataclysm's duration is increased by 2 seconds. // TODO
  ['supreme-cataclysm', 1], // Lightning strikes from Cataclysm make enemies Vulnerable for 3 seconds.
  ['grizzly-rage', 1], // Shapeshift into a Dire Werebear for 10 seconds gaining 20% bonus damage and 20% Damage Reduction. Damage bonus is increased by 3% each second while in this form. // TODO
  ['prime-grizzly-rage', 1], // Prime Grizzly Rage  Grizzly Rage makes you Unstoppable  for 6 seconds.
  ['supreme-grizzly-rage', 1], // Gain 8% Base Life as Fortify per second while Grizzly Rage is active. // IGNORE
  ['lacerate', 1], // Shapeshift into a Werewolf, become Immune and quickly dash 10 times between enemies in the area dealing up to 400% damage. // TODO
  ['prime-lacerate', 1], // Prime Lacerate Lacerate hits Heal for 3% Maximum Life, doubled on Critical Strikes.
  ['supreme-lacerate', 1], // Lacerate's initial strike is guaranteed to Critically Strike and deals 150% increased damage. // TODO
  ['petrify', 1], // Encase all Nearby enemies in stone, Stunning them for 3 seconds. You deal 30% increased Critical Strike Damage to enemies affected by Petrify. // TODO
  ['prime-petrify', 1], // Petrify's effect durations are increased by 1 second. // TODO
  ['supreme-petrify', 1], // Killing an enemy affected by Petrify grants 25 Spirit.
  ['abundance', 3], // Basic Skills generate {['10%', '20%', '30%']} more Spirit. // DONE
  ['ancestral-fortitude', 3], // Increase your Resistances to all elements by {['5%', '10%', '15%']} . // DONE
  ['bad-omen', 3], // Lucky Hit: Up to a {['10%', '20%', '30%']} chance when dealing damage to a Vulnerable, Immobilized or Stunned enemy that a lightning strike also hits dealing 55% damage. // DONE
  ['bestial-rampage', 1], // After being a Werewolf for 2 seconds, gain 30% Attack Speed for 15 seconds. After being a Werebear for 2 seconds, deal 30% increased damage for 15 seconds. // TODO
  ['call-of-the-wild', 3], // Your companions deal {['10%', '20%', '30%']} bonus damage. // TODO
  ['charged-atmosphere', 3], // Every {[14, 11, 8]} seconds, a lightning strike hits a Nearby enemy dealing 45% damage. // DONE
  ['circle-of-life', 3], // Nature Magic Skills that consume Spirit Heal you for {['1%', '2%', '3%']} of your Maximum Life. // IGNORE
  ['clarity', 3], // Gain {[2, 4, 6]} Spirit when transforming into Human form.
  ['crushing-earth', 3], // Earth Skills deal {['5%', '10%', '15%']} increased damage to Slowed, Stunned, Immobilized or Knocked Back enemies. // DONE
  ['defensive-posture', 3], // Increases the amount of Fortify you gain from all sources by {['6%', '12%', '18%']} . // IGNORE
  ['defiance', 3], // Nature Magic Skills deal {['4%', '8%', '12%']} increased damage to Elites. // DONE
  ['digitigrade-gait', 3], // You gain {['3%', '6%', '9%']} Movement Speed while in Werewolf form. // IGNORE
  ['earthen-might', 1], // Lucky Hit: Damaging enemies with Earth Skills has up to a 5% chance to: // TODO
  ['electric-shock', 3], // Lucky Hit: Dealing Lightning damage to enemies has up to a {['8', '16%', '24%']} chance to Immobilize them for 3 seconds.
  // Bonus damage to Immobilized enemies increased 7/14/21%.
  ['elemental-exposure', 3], // Lucky Hit: Your Storm Skills have up to a 10% chance to make enemies Vulnerable for {[1, 2, 3]} seconds. // IGNORE
  ['endless-tempest', 3], // Increase the duration of Hurricane and Cataclysm by {['5%', '10%', '15%']} . // TODO
  ['envenom', 3], // You and your Companions cause poisoned enemies to take {['10%', '20%', '30%']} additional Critical Strike Damage. // DONE
  ['heart-of-the-wild', 3], // Maximum Spirit is increased by {[3, 6, 9]} .
  ['heightened-senses', 3], // Upon shapeshifting into a Werewolf or Werebear, gain {['4%', '8%', '12%']} Damage Reduction against Elites for 5 seconds.
  ['iron-fur', 3], // You gain {['3%', '6%', '9%']} Damage Reduction while in Werebear form. // TODO
  ['lupine-ferocity', 1], // Every 6th Werewolf Skill hit Critically Strikes and deals 140% increased damage. // DONE
  ['mending', 3], // While in Werebear form, you receive {['5%', '10%', '15%']} additional Healing from all sources. // IGNORE
  ['natural-disaster', 3], // Your Earth Skills deal {['4%', '8%', '12%']} increased damage to Vulnerable enemies. // DONE
  ['natural-fortitude', 3], // Shapeshifting Fortifies you for {['2%]} Base Life. // IGNORE
  ['natures-fury', 1], // Casting an Earth Skill has a 30% chance to trigger a free Storm Skill of the same category. These free Skills count as both Earth and Storm Skills.
  ['natures-reach', 3], // Deal {['3%', '6%', '9%']} increased damage to Distant enemies. Double this bonus if they are also Slowed, Stunned, Immobilized, or Knocked Back. // DONE
  ['natures-resolve', 3], // {['5%', '10%', '15%']} chance when struck to Fortify you for 4% Base Life. // IGNORE
  ['neurotoxin', 3], // Poisoned enemies are slowed by {['8%', '16%', '24%']} . // IGNORE
  ['perfect-storm', 1], // Your Storm Skills grant 1 Spirit and deal 15% increased damage when damaging a Vulnerable, Immobilized or Slowed enemy. // DONE
  ['predatory-instinct', 3], // Critical Strike Chance against Close enemies is increased by {['3%', '6%', '9%']} . // DONE
  ['provocation', 3], // When you remain in Werebear form for at least {[24, 20, 16]} seconds, your next Skill will Overpower.
  ['quickshift', 3], // When a Shapeshifting Skill transforms you into a different form, it deals {['5%', '10%', '15%']} increased damage.
  ['resonance', 3], // Nature Magic Skills deal {['2%', '4%', '6%']} increased damage. Triple this bonus if an Earth Skill is the next Skill cast after a Storm Skill, or a Storm Skill is the next Skill cast after an Earth Skill. // TODO
  ['safeguard', 3], // Critical Strikes with Earth Skills Fortify you for {['2%', '4%', '7%']} Base Life. // IGNORE
  ['stone-guard', 3], // While you have Fortify for over 50% of your Maximum Life, your Earth Skills deal {['4%', '8%', '12%']} increased damage. // DONE
  ['thick-hide', 3], // Whenever you are Stunned, Immobilized, or Knocked Down, Fortify for {[10%]} Base Life. // IGNORE
  ['toxic-claws', 3], // Critical Strikes with Werewolf Skills deal {['8%', '15%', '23%']} of their Base damage as Poisoning damage over 4 seconds. // DONE
  ['unrestrained', 3], // Reduce the duration of Control Impairing Effects by {['5%']} . Double this effect while you have Fortify for over 50% of your Maximum Life. // IGNORE
  ['ursine-strength', 1], // While Healthy, deal 25% (multiplicative damage) [x] increased damage, and 25%[x] increased Overpower damage.
  // Gain 20%[x] additional Maximum Life while in Werebear form and for 3 seconds after leaving Werebear form.
  ['vigilance', 3], // You gain {['5%', '10%', '15%']} Damage Reduction for 6 seconds after using a Defensive Skill. // TODO
  ['wild-impulses', 3], // Your Core Skills cost {['3%', '6%', '9%']} more Spirit but deal {['5%', '10%', '15%']}  increased damage. // DONE
]

// This creates a map from the talent name above to a talent node with its name. Used to look up
// nodes and add dependencies.
export function CreateDruidTalentNodes(): Record<string, TalentNode> {
  const nodes: Record<string, TalentNode> = {}
  for (const [key, value] of DruidTalentsToMaxValue) {
    nodes[key] = new TalentNode(key, value)
  }
  return nodes
}

// Map used to identify which talents should be increased for talent modifiers.
export function CreateDruidTalentModifierMap(): Record<
  string,
  string[]
> {
  return {
    'ranks-of-blood-howl': ['blood-howl'],
    'ranks-of-boulder': ['boulder'],
    'ranks-of-cyclone-armor': ['cyclone-armor'],
    'ranks-of-debilitating-roar': ['debilitating-roar'],
    'ranks-of-earthen-bulwark': ['earthen-bulwark'],
    'ranks-of-hurricane': ['hurricane'],
    'ranks-of-lightning-storm': ['lightning-storm'],
    'ranks-of-pulverize': ['pulverize'],
    'ranks-of-rabies': ['rabies'],
    'ranks-of-ravens': ['ravens'],
    'ranks-of-shred': ['shred'],
    'ranks-of-tornado': ['tornado'],
    'ranks-of-landslide': ['landslide'],
    'ranks-of-trample': ['trample'],
    'ranks-of-poison-creeper': ['poison-creeper'],
    'ranks-of-wolves': ['wolves'],
    'ranks-of-claw': ['claw'],

    // Passive Talents
    'ranks-of-the stone-guard-passive': ['stone-guard'],
    'ranks-of-the-natures-reach-passive': ['natures-reach'],
    'ranks-of-the-wild-impulses-passive': ['wild-impulses'],
    'ranks-of-the-envenom-passive': ['envenom'],
    'ranks-of-the-crushing-earth-passive': ['crushing-earth'],
    'ranks-of-the-resonance-passive': ['resonance'],
    'ranks-of-the-defiance-passive': ['defiance'],
    'ranks-of-the-natural-disaster-passive': ['natural-disaster'],
    'ranks-of-the-call-of-the-wild-passive': ['call-of-the-wild'],
    'ranks-of-the-quickshift-passive': ['quickshift'],
    'ranks-of-the-toxic-claws-passive': ['toxic-claws'],
    'ranks-of-the-stone-guard-passive': ['stone-guard'],
    'ranks-of-the-heightened-senses-passive': ['heightened-senses'],
    'ranks-of-defiance-passive': ['defiance'],

    // Skill Talents
    'ranks-of-all-defensive-skills': [
      'earthen-bulwark',
      'cyclone-armor',
      'blood-howl',
      'debilitating-roar',
    ],
    'ranks-of-all-companion-skills': [
      'wolves',
      'poison-creeper',
      'ravens',
    ],
    'ranks-of-all-wrath-skills': [
      'trample',
      'hurricane',
      'boulder',
      'rabies',
    ],
    'ranks-of-all-core-skills': [
      'pulverize',
      'shred',
      'tornado',
      'lightning-storm',
      'landslide',
    ],
  }
}

export function CreateDruidAspectNodes(): Record<string, AspectNode> {
  return {
    /*--------------------------------------------------
                         DRUID ASPECTS
          --------------------------------------------------*/
    // Lightning dancers Aspect : Lightning Storm Critical Strikes spawn 3.0 Dancing Bolts that seek enemies in the area dealing {70/80%} Lightning damage. // TODO
    'lightning-dancers-aspect': new AspectNode(
      'lightning-dancers-aspect',
      1,
    ),

    // Dire wolfs Aspect : Grizzly Rage now shapeshifts you into a Dire Werewolf. As a Dire Werewolf you gain +{15/25}% Movement Speed instead of Damage Reduction and a {30/50}% Spirit cost reduction bonus. In addition, kills Heal you for 10.0% of your Maximum Life. // TODO
    'dire-wolfs-aspect': new AspectNode('dire-wolfs-aspect', 2),

    // Aspect of the Stampede : Gain 1 additional Companion. In addition, your Companion Skills deal x{100/150}% bonus damage. // TODO
    'aspect-of-the-stampede': new AspectNode(
      'aspect-of-the-stampede',
      1,
    ),

    // Aspect of Metamorphic Stone : Boulder is now a Core Skill and costs 40.0 Spirit to cast dealing {80/100}% of normal damage. // DONE
    'aspect-of-metamorphic-stone': new AspectNode(
      'aspect-of-metamorphic-stone',
      1,
    ),

    // Aspect of the Blurred Beast : While dashing, Shred seeks out Nearby Poisoned enemies deals [20/40%] increased damage to them.
    'aspect-of-the-blurred-beast': new AspectNode(
      'aspect-of-the-blurred-beast',
      1,
    ),

    // Aspect of the Tempest : Hurricane damage is increased by x{7/15}% each second while active. // TODO
    'aspect-of-the-tempest': new AspectNode(
      'aspect-of-the-tempest',
      1,
    ),

    // Crashstone Aspect : Earth Skills deal x{30/40}% more Critical Strike Damage to Crowd Controlled enemies. // DONE
    'crashstone-aspect': new AspectNode('crashstone-aspect', 1),

    // Overcharged Aspect : Lucky Hit: Up to a {10/20}% chance when dealing Lightning damage to overload the target for 3.0 seconds, causing any direct damage you deal to them to pulse [70% Item Power Strength] additional damage to surrounding enemies.
    'overcharged-aspect': new AspectNode('overcharged-aspect', 2),

    // Aspect of Natural Balance : Casting a Storm Skill grants your Earth Skills x{30/45}% Critical Strike Damage for 4.0 seconds.
    //Casting a Earth Skill increases the Critical Strike Chance of Storm Skills by +{8/12}% for 4.0 seconds.
    'aspect-of-natural-balance': new AspectNode(
      'aspect-of-natural-balance',
      2,
    ),

    // Seismic-shift Aspect : Earth Spike launches spikes in a line and has a {1-2} second Cooldown. // TODO
    'seismic-shift-aspect': new AspectNode('seismic-shift-aspect', 1),

    // Aspect of the Trampled Earth : Trample now summons 6.0 Landslide pillars of earth during its duration that deal {70/80}% normal damage. Trample is now also a Nature Magic and Earth Skill. // TODO
    'aspect-of-the-trampled-earth': new AspectNode(
      'aspect-of-the-trampled-earth',
      1,
    ),

    // Stormclaw's Aspect : Critical Strikes with Shred deal {20/30}% of the damage dealt as Lightning damage to the target and surrounding enemies. // TODO
    'stormclaws-aspect': new AspectNode('stormclaws-aspect', 1),

    // Aspect of The Aftershock : Landslide's earth pillars each strike a second time and deal an additional {6/12}% bonus damage per hit. // DONE
    'aspect-of-the-aftershock': new AspectNode(
      'aspect-of-the-aftershock',
      1,
    ),

    // Aspect of the Ursine Horror : Pulverize is now also an Earth Skill. After casting Pulverize, tectonic spikes continue to deal {175/250} damage over 2.0 seconds. // TODO
    'aspect-of-the-ursine-horror': new AspectNode(
      'aspect-of-the-ursine-horror',
      1,
    ),

    // Aspect of Retaliation : Your Core Skills deal up to x{20/30}% increased damage based on your amount of Fortify. // DONE
    'aspect-of-retaliation': new AspectNode(
      'aspect-of-retaliation',
      1,
    ),

    // Shockwave Aspect : Pulverize creates a shockwave that travels forward, dealing {60/100}% of its damage to targets in the path. // TODO
    'shockwave-aspect': new AspectNode('shockwave-aspect', 1),

    // Aspect of the Alpha : Your Wolf Companions are now Werewolf Companions. Werewolf Companions deal x{90/115}% additional damage and can spread Rabies. // TODO
    'aspect-of-the-alpha': new AspectNode('aspect-of-the-alpha', 1),

    // Nighthowler's Aspect : Blood Howl increases Critical Strike Chance by +{5/10}%. In addition, Blood Howl also affects Nearby Companions and Players for 3.0 seconds. // TODO
    'nighthowlers-aspect': new AspectNode('nighthowlers-aspect', 1),

    // Aspect of natures Savagery : Werewolf Skills function as Storm Skills and Werebear Skills function as Earth Skills for the natures Fury Key Passive.
    'aspect-of-natures-savagery': new AspectNode(
      'aspect-of-natures-savagery',
      0,
    ),

    // Shepherds Aspect : Core Skills deal an additional x{6/8}% damage for each active Companion. // TODO
    'shepherds-aspect': new AspectNode('shepherds-aspect', 1),

    // Aspect of the Rampaging Werebeast : The duration of Grizzly Rage is increased by {1/5} seconds. In addition, Critical Strikes while Grizzly Rage is active increase your Critical Strike Damage by x10% for the duration. // TODO
    // Critical Strike Damage bonus amount now has a maximum of 200%
    'aspect-of-the-rampaging-werebeast': new AspectNode(
      'aspect-of-the-rampaging-werebeast',
      1,
    ),

    // Aspect of the Wildrage : Your Companions gain the bonuses from the Bestial Rampage Key Passive.
    'aspect-of-the-wildrage': new AspectNode(
      'aspect-of-the-wildrage',
      0,
    ),

    // stormchasers Aspect : Tornado will seek up to {1/3} targets.
    'stormchasers-aspect': new AspectNode('stormchasers-aspect', 1),

    // runeworkers Conduit Aspect : Critical Strikes with Storm Skills charge the air around you for {1/2} seconds causing a Lightning Strike to periodically hit an enemy in the area for [100-140% Weapon Damage] Lightning damage. This duration can be extended by additional Critical Strikes. // DONE
    'runeworkers-conduit-aspect': new AspectNode(
      'runeworkers-conduit-aspect',
      2,
    ),

    // Mighty storms Aspect : The Earthen Might Key Passive also applies to your Storm Skills. // TODO
    'mighty-storms-aspect': new AspectNode('mighty-storms-aspect', 0),

    // Aspect of the Unsatiated : After killing an enemy with Shred, your next Werewolf Skill generates x{30/40}% more Spirit and deals x{30/40}% increased damage.
    'aspect-of-the-unsatiated': new AspectNode(
      'aspect-of-the-unsatiated',
      2,
    ),

    // Mangled Aspect : When you are struck as a Werebear you have a {30/40}% chance to gain [1-3] Spirit. // IGNORE
    'mangled-aspect': new AspectNode('mangled-aspect', 2),

    // Aspect of the Calm Breeze : Lucky Hit: Wind Shear has up to a {5/10}% chance to fully restore your Spirit. // DONE
    'aspect-of-the-calm-breeze': new AspectNode(
      'aspect-of-the-calm-breeze',
      1,
    ),

    // Aspect of the Changeling's Debt : Damaging a Poisoned enemy with a Werebear Skill will instantly deal {120/150}% of the Poisoning damage and consume the Poisoning.
    'aspect-of-the-changelings-debt': new AspectNode(
      'aspect-of-the-changelings-debt',
      1,
    ),

    // Balanced Aspect : Increase your Maximum Spirit by {30/50} and Spirit Generation by x20% while Grizzly Rage is active. // TODO
    'balanced-aspect': new AspectNode('balanced-aspect', 1),

    // Aspect of Quicksand : Damage from Earth Skills Slow enemies hit by {25/50}% for 5.0 seconds. // IGNORE
    'aspect-of-quicksand': new AspectNode('aspect-of-quicksand', 1),

    // Aspect of the Dark Howl : Debilitating Roar is now a Werewolf Skill. In addition, Debilitating Roar will Immobilize Poisoned enemies for {2/4} seconds. // IGNORE
    'aspect-of-the-dark-howl': new AspectNode(
      'aspect-of-the-dark-howl',
      1,
    ),

    // Ballistic Aspect : When you have Fortify your Earth Skills gain +2 Ranks. // TODO
    'ballistic-aspect': new AspectNode('ballistic-aspect', 0),

    // Stormshifter's Aspect : While Hurricane is active, gain +2 Ranks to your Shapeshifting Skills. // TODO
    'stormshifters-aspect': new AspectNode('stormshifters-aspect', 0),

    // Symbiotic Aspect : When the natures Fury Key Passive triggers a free Skill, your non-Ultimate Cooldowns of the opposite type are reduced by {4/8} seconds. // TODO
    'symbiotic-aspect': new AspectNode('symbiotic-aspect', 1),

    // Aspect of Mending Stone : The duration of Earthen Bulwark is increased by 6 seconds. In addition, killing an enemy with Earth Skills replenishes {25/50} of your active Earthen Bulwark's Barrier. // TODO
    'aspect-of-mending-stone': new AspectNode(
      'aspect-of-mending-stone',
      1,
    ),

    // Skinwalkers Aspect : When you use a Shapeshifting Skill that changes your form, gain {25/50} Life. If you are at full Life, gain the same amount as Fortify. // IGNORE
    'skinwalkers-aspect': new AspectNode('skinwalkers-aspect', 1),

    // Aspect of Cyclonic Force : Cyclone Armor also provides Physical Damage Reduction. In addition, Cyclone Armor will also be applied to all Nearby Allies.
    'aspect-of-cyclonic-force': new AspectNode(
      'aspect-of-cyclonic-force',
      0,
    ),

    // Vigorous Aspect : Gain {10/15}% Damage Reduction while Shapeshifted into a Werewolf.
    'vigorous-aspect': new AspectNode('vigorous-aspect', 1),

    // Earthguard Aspect : Gain {15/25}% bonus amount to your next Earthen Bulwark for each enemy you Crowd Control up to a maximum of 100.0%.  // IGNORE
    'earthguard-aspect': new AspectNode('earthguard-aspect', 1),

    //Subterranean Aspect: Poison Creeper's active also casts Landslide in a circle around you. Earth Skills deal [10 - 20]% increased damage to Poisoned enemies. (Druid Only)
    subterranean: new AspectNode('subterranean', 1),

    // Raw Might Aspect (Druid Offensive Aspect): After you hit 15 enemies with your Werebear Skills, your next Werebear Skill will deal 30-50% (multiplicative damage) [x] more damage and Stun enemies for 2 seconds.
    'raw-might-aspect': new AspectNode('raw-might-aspect', 1),

    // Virulent Aspect: (Druid Offensive Aspect) When Rabies infects an enemy, reduce its cooldown by 0.3–0.6 seconds. This cooldown reduction is tripled when infecting Elites.
    'virulent-aspect': new AspectNode('virulent-aspect', 1),

    /*--------------------------------------------------
                         GENERIC ASPECTS
      --------------------------------------------------*/

    // Accelerating Aspect: Critical Strikes with Core Skills increase your Attack Speed by +[15 - 25]% for 3.0 seconds.
    'accelerating-aspect': new AspectNode('accelerating-aspect', 1),

    // Starlight-aspect: Gain {10/20} of your Primary Resource for every 20.0% of your Life that you Heal. // IGNORE
    'starlight-aspect': new AspectNode('starlight-aspect', 1),

    // aspect-of-Might: basic Skills grant 25.0% damage Reduction for {2/6} seconds. // DONE
    'aspect-of-might': new AspectNode('aspect-of-might', 1),

    // aspect-of-the-Protector: Damaging an Elite enemy grants you a Barrier absorbing up to {375/750} damage for 10.0 seconds. This effect can only happen once every 30 seconds. // IGNORE
    'aspect-of-the-protector': new AspectNode(
      'aspect-of-the-protector',
      1,
    ),

    // aspect-of-Inner-Calm: Deal x{3/10}% increased damage for each second you stand still, up to x30.0%. // TODO
    'aspect-of-inner-calm': new AspectNode('aspect-of-inner-calm', 1),

    // Wind-Striker-aspect: Critical Strikes grant +{8/16}% Movement Speed for 1.0 second, up to 6 seconds. // TODO
    'wind-striker-aspect': new AspectNode('wind-striker-aspect', 1),

    // aspect-of-the-Umbral: Restore {1/4} of your Primary Resource when you Crowd Control an enemy. // IGNORE
    'aspect-of-the-umbral': new AspectNode('aspect-of-the-umbral', 1),

    // (Unique) Ring-of-Starless-Skies: // Spending resources reduces your resource costs and increases your damage by 10%[x] for 3 seconds, up to 40%.
    'ring-of-starless-skies': new AspectNode(
      'ring-of-starless-skies',
      0,
    ),

    // Conceited-aspect: Deal x{15-25}% increased damage while you have a Barrier active. // IGNORE
    'conceited-aspect': new AspectNode('conceited-aspect', 1),

    // Protecting-aspect: When hit while not Healthy, a magical bubble is summoned around you for {3/5} seconds. While standing in the bubble players are Immune. Can only occur once every 90.0 seconds. // IGNORE
    'protecting-aspect': new AspectNode('protecting-aspect', 1),

    // aspect-of-Disobedience: You gain x{0.25/0.5}% increased Armor for 4.0 seconds when you deal any form of damage, stacking up to x{25/66}%. // TODO
    'aspect-of-disobedience': new AspectNode(
      'aspect-of-disobedience',
      2,
    ),

    // Aspect of Pummeling: "Deal {}} increased damage to Stunned, knocked Down, and Frozen enemies." // DONE
    'aspect-of-pummeling': new AspectNode('aspect-of-pummeling', 1),

    // Rapid-aspect: basic Skills gain +{15-30}% Attack Speed. // DONE
    'rapid-aspect': new AspectNode('rapid-aspect', 1),

    // Edgemaster's-aspect: Skills deal up to x{10-20}% increased damage based on your available Primary Resource when cast, receiving the maximum benefit while you have full Primary Resource. // TODO
    'edgemasters-aspect': new AspectNode('edgemasters-aspect', 1),

    //aspect-of-the-Crowded-Sage: You Heal for {2.5/10} Life per second for each close enemy, up to 50 Life per second. // IGNORE
    'aspect-of-the-crowded-sage': new AspectNode(
      'aspect-of-the-crowded-sage',
      2,
    ),

    // aspect-of-the-Expectant: Attacking enemies with a basic Skill increases the damage of your next Core Skill cast by x{5/10}%, up to x30.0%. // TODO
    'aspect-of-the-expectant': new AspectNode(
      'aspect-of-the-expectant',
      1,
    ),

    // Ghostwalker-aspect: While Unstoppable and for 2.0 seconds after, you gain +{10/25}% increased Movement Speed and can move freely through enemies. // IGNORE
    'ghostwalker-aspect': new AspectNode('ghostwalker-aspect', 1),

    //aspect-of-Shared-Misery: Lucky Hit: When you hit a Crowd Controlled enemy, there is up to a {30/50}% chance for that Crowd Control effect to spread to another unaffected enemy. // IGNORE
    'aspect-of-shared-misery': new AspectNode(
      'aspect-of-shared-misery',
      1,
    ),

    // Eluding-aspect: Becoming Injured while Crowd Controlled grants you Unstoppable for 4.0 seconds. This effect has a {20/40} second Cooldown. // IGNORE
    'eluding-aspect': new AspectNode('eluding-aspect', 1),

    // Assimilation-aspect: You have +8.0% increased Dodge chance versus enemies affected by damage Over Time effects. When you Dodge you gain {5/10} of your Primary Resource. // TODO
    'assimilation-aspect': new AspectNode('assimilation-aspect', 1),

    // Needleflare-aspect: Thorns damage dealt has a {20/40}% chance to deal damage to all enemies around you. // TODO
    'needleflare-aspect': new AspectNode('needleflare-aspect', 1),

    // aspect-of-the-Deflecting-Barrier: While you have a Barrier active, there is a {7/13}% chance to ignore incoming direct damage from Distant enemies. // IGNORE
    'aspect-of-the-deflecting-barrier': new AspectNode(
      'aspect-of-the-deflecting-barrier',
      1,
    ),

    // aspect-of-Retribution: Distant enemies have a 15.0% chance to be Stunned for 2.0 seconds when they hit you. You deal x{30/50}% increased damage to Stunned enemies. // DONE
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

    // Mad wolfs Glee : Werewolf form is now your true form, and you gain +3 Ranks to all Werewolf Skills
    'mad-wolfs-glee': new AspectNode('mad-wolfs-glee', 0),

    // Insatiable Fury : Werebear form is now your true form, and you gain +3 Ranks to all Werebear Skills.
    'insatiable-fury': new AspectNode('insatiable-fury', 0),

    // storms Companion : Your Wolf Companions are infused with the power of the storm, dealing Lightning damage and gaining the Storm Howl ability. // TODO
    'storms-companion': new AspectNode('storms-companion', 0),

    // hunters Zenith : Gain a bonus when you kill with a Shapeshifting Skill:
    //• Werewolf: Your next Non-Ultimate Werebear Skill costs no Resource and has no Cooldown.
    //• Werebear: Your next Werewolf Skill will Heal you for {50/100} when damage is first dealt. // TODO
    'hunters-zenith': new AspectNode('hunters-zenith', 1),

    // (Unique) Razorplate: Gain {1000/15000} Thorns // DONE
    razorplate: new AspectNode('razorplate', 1),

    // (Unique) Fists-of-Fate: Your attacks randomly deal 1% to {200/300}% of their normal damage. // DONE
    'fists-of-fate': new AspectNode('fists-of-fate', 1),

    // (Unique) Andariel's-Visage: Lucky Hit: Up to a {10/20}% chance to trigger a poison nova that applies 1125 Poisoning damage over 5.0 seconds to enemies in the area. // DONE
    'andariels-visage': new AspectNode('andariels-visage', 2),

    // (Unique) Melted Heart of Selig: Gain 60 maximum Resource. 75% of incoming damage drains 2 Resource for every 1% of Life you would have lost instead.
    'melted-heart-of-selig': new AspectNode(
      'melted-heart-of-selig',
      0,
    ),

    // Greatstaff of the Crone : Claw is now a Storm Skill and also casts Storm Strike at {120/150}% normal damage. // TODO
    'greatstaff-of-the-crone': new AspectNode(
      'greatstaff-of-the-crone',
      1,
    ),

    // (Unique) Penitent-Greaves: You leave behind a trail of frost that chills enemies. You deal x{7/10}% more damage to chilled enemies.
    'penitent-greaves': new AspectNode('penitent-greaves', 1),

    // (Unique) frostburn: Lucky Hit: Up to a {15/25}% chance to Freeze enemies for 2.0 seconds. // IGNORE
    frostburn: new AspectNode('frostburn', 1),

    // (Unique) Harlequin-Crest: "Gain {5/8}% damage Reduction .In addition, gain +2.0 Ranks to all Skills." // TODO (Ranks to all skills)
    'harlequin-crest': new AspectNode('harlequin-crest', 1),

    // (Unique) Mother's-Embrace: If a Core Skill hits 4 or more enemies, {20/40}% of the Resource cost is refunded. // TODO
    'mothers-embrace': new AspectNode('mothers-embrace', 1),

    // (Unique) Temerity: Effects that Heal you beyond 100.0% Life grant you a Barrier up to {50/100}% of your Maximum Life that lasts for 30.0 seconds. // IGNORE
    temerity: new AspectNode('temerity', 1),

    // Tempest Roar : Lucky Hit: Storm Skills have up to a {15/25}% chance to grant 10.0 Spirit. // DONE
    //Your base Storm Skills are now also Werewolf Skills
    'tempest-roar': new AspectNode('tempest-roar', 1),

    // Lucky Hit: Up to a 100% chance to lose all of your Resource.
    'ring-of-misfortune': new AspectNode('ring-of-misfortune', 0),

    // Waxing Gibbous : Gain Stealth for 2 seconds when killing enemies with Shred. Breaking Stealth with an attack grants Ambush which guarantees Critical Strikes for {1/2.5} seconds. // IGNORE
    'waxing-gibbous': new AspectNode('waxing-gibbous', 1),

    // Vasily's Prayer : Your Earth Skills are now also Werebear Skills and Fortify you for {1/2}. // DONE
    'vasilys-prayer': new AspectNode('vasilys-prayer', 1),

    // Ahavarion Spear of Lycander: Gain a random Shrine effect for [10 - 20] seconds after killing an Elite enemy. Can only occur once every 30 seconds.
    'ahavarion-spear-of-lycander': new AspectNode(
      'ahavarion-spear-of-lycander',
      1,
    ),

    // Fleshrender: Debilitating Roar and Blood Howl deal {flat-value} damage to Nearby Poisoned enemies.
    // The damage dealt to Poisoned enemies from Debilitating Roar and Blood Howl is now increased by x10% for each 100 Willpower you have.
    fleshrender: new AspectNode('fleshrender', 1),

    // Tassets of the Dawning Sky (Generic Unique Pants): When you take damage from a Non-Physical damage type, you gain +6-10% Maximum Resistance to that damage type for 6 seconds. This effect can only apply to one damage type at a time.
    'tassets-of-the-dawning-sky': new AspectNode(
      'tassets-of-the-dawning-sky',
      1,
    ),

    // Dolmen Stone (Druid Unique Amulet): Casting Boulder while Hurricane is active will cause your boulders to rotate around you.
    'dolmen-stone': new AspectNode('dolmen-stone', 0),

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

    // airidahs-inexorable-will: When casting an Ultimate Skill and again 5 seconds after, Pull in Distant enemies and deal [{value1}] Physical damage to them. This damage is increased by 1%[x] per 1 point of Willpower you have.
    'airidahs-inexorable-will': new AspectNode(
      'airidahs-inexorable-will',
      1,
    ),

    // Paingorger's Gauntlets: Damaging enemies with a cast Non–Basic Skill marks them for 3 seconds. When a Basic Skill first hits a marked enemy, the Basic Skill's damage is echoed to all marked enemies, dealing 100–200%[x] increased damage.
    'paingorgers-gauntlets': new AspectNode(
      'paingorgers-gauntlets',
      1,
    ),

    // unsung-ascetics-wraps: Lightning Storm gains 1 additional strike each time it grows. Lightning Storm Critical Strikes cause lightning to strike twice, dealing 10-20% increased damage.
    'unsung-ascetics-wraps': new AspectNode(
      'unsung-ascetics-wraps',
      1,
    ),
  }
}

export function CreateDruidToggleNodes(): Record<string, ToggleNode> {
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
    'enemy-feared': new ToggleNode('enemy-feared', 'boolean'),
    'enemy-trapped': new ToggleNode('enemy-trapped', 'boolean'),
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
    'altars-of-lilith-gathered': new ToggleNode(
      'altars-of-lilith-gathered',
      'number',
    ), // Which Act the player has gathered altars of lilith for

    // Recent Event Triggers _ Recently could have a variety of time spans so its easiest to set it as a toggle with the onus on the player
    'overpower-recently': new ToggleNode(
      'overpower-recently',
      'boolean',
    ), // Player has Overpowered Recently
    'killed-enemy-recently': new ToggleNode(
      'killed-enemy-recently',
      'boolean',
    ),
    'crit-recently': new ToggleNode('crit-recently', 'boolean'),
    // All toggles will need to be present for all classes
    berserking: new ToggleNode('berserking', 'boolean'),
    'enemy-level-difference': new ToggleNode(
      'enemy-level-difference',
      'number',
    ),

    /* -------------------------------
                SKILL TOGGLES
       -------------------------------*/

    /* -------------------------------
                TALENT TOGGLES
       -------------------------------*/

    /* -------------------------------
                ASPECT TOGGLES
       -------------------------------*/
  }
}

// Create BaseStatsNode.
export function CreateDruidBaseStatsNode(): BaseStatsNode {
  return new BaseStatsNode('Druid', 1)
}

function CopyTags(tags: Set<string>): Set<string> {
  const new_tags = new Set<string>()
  for (const tag of tags) {
    new_tags.add(tag)
  }
  return new_tags
}

export function CreateDruidTagsNode(nodes_map: NodesMap): TagsNode {
  return new TagsNode('DruidTags', () => {
    const skill_tags = currentSkillVal(nodes_map)['tags']

    // Deep Copy the skill tags.
    const total_tags = CopyTags(skill_tags)

    // These are the tags for a skill.
    total_tags.add('skill')

    // Aspect of Metamorphic Stone : Boulder is now a Core Skill and costs 40.0 Spirit to cast dealing {100-120}% of normal damage.
    if (
      currentSkillVal(nodes_map)['name'] == 'boulder' &&
      aspectVal(nodes_map, 'aspect-of-metamorphic-stone').length > 0
    ) {
      total_tags.add('core')
    }

    // Tempest Roar : Lucky Hit: Storm Skills have up to a {15/25}% chance to grant 10.0 Spirit.
    // Your base Storm Skills are now also Werewolf Skills
    if (
      currentSkillVal(nodes_map)['tags'].has('storm') &&
      aspectVal(nodes_map, 'tempest-roar').length > 0
    ) {
      total_tags.add('werewolf')
    }

    // Vasily's Prayer : Your Earth Skills are now also Werebear Skills
    if (
      currentSkillVal(nodes_map)['tags'].has('earth') &&
      aspectVal(nodes_map, 'vasilys-prayer').length > 0
    ) {
      total_tags.add('werebear')
    }

    // Aspect of the Trampled Earth : Trample is now also a Nature Magic and Earth Skill.
    if (
      aspectVal(nodes_map, 'aspect-of-the-trampled-earth').length >
        0 &&
      currentSkillVal(nodes_map)['name'] == 'trample'
    ) {
      total_tags.add('nature-magic')
      total_tags.add('earth')
    }

    // Aspect of the Ursine Horror : Pulverize is now also an Earth Skill. After casting Pulverize, tectonic spikes continue to deal {175/250} damage over 2.0 seconds.
    if (
      aspectVal(nodes_map, 'aspect-of-the-ursine-horror').length >
        0 &&
      currentSkillVal(nodes_map)['name'] == 'pulverize'
    ) {
      total_tags.add('earth')
    }

    // Greatstaff of the Crone : Claw is now a Storm Skill and also casts Storm Strike at {120/150}% normal damage.
    if (
      aspectVal(nodes_map, 'greatstaff-of-the-crone').length > 0 &&
      currentSkillVal(nodes_map)['name'] == 'claw'
    ) {
      total_tags.add('storm')
    }

    // storms Companion : Your Wolf Companions are infused with the power of the storm, dealing Lightning damage and gaining the Storm Howl ability.
    if (
      aspectVal(nodes_map, 'storms-companion').length > 0 &&
      currentSkillVal(nodes_map)['name'] == 'wolves'
    ) {
      total_tags.add('lightning')
      total_tags.delete('physical')
    }

    // Aspect of the Alpha : Your Wolf Companions are now Werewolf Companions. Werewolf Companions deal x{90/115}% additional damage and can spread Rabies.
    if (
      aspectVal(nodes_map, 'aspect-of-the-alpha').length > 0 &&
      currentSkillVal(nodes_map)['name'] == 'wolves'
    ) {
      total_tags.add('werewolf')
    }

    return total_tags
  })
}

// (TODO) Figure out which tags we actually need.
export function CreateDruidSkillNodes(): Record<string, SkillNode> {
  return {
    // Skill Node : (Skill Name, Category, Tags[], Flat Modifier, DoT Modifier, Cooldown, Resource Build/Spend, Lucky Hit)
    claw: new SkillNode(
      'claw',
      'basic',
      ['basic', 'werewolf', 'shapeshifting', 'physical'],
      0.22,
      0.0,
      0,
      12,
      0.5,
    ),
    'earth-spike': new SkillNode(
      'earth-spike',
      'basic',
      ['basic', 'nature-magic', 'earth', 'physical'],
      0.1775,
      0.0,
      0,
      13,
      0.35,
    ),
    maul: new SkillNode(
      'maul',
      'basic',
      ['basic', 'werebear', 'shapeshifting', 'physical'],
      0.2225,
      0.0,
      0,
      17,
      0.3,
    ),
    'storm-strike': new SkillNode(
      'storm-strike',
      'basic',
      ['basic', 'storm', 'nature-magic', 'lightning'],
      0.2,
      0.0,
      0,
      15,
      0.25,
    ),
    'wind-shear': new SkillNode(
      'wind-shear',
      'basic',
      ['basic', 'storm', 'nature-magic', 'physical'],
      0.18,
      0.0,
      0,
      14,
      0.2,
    ),
    landslide: new SkillNode(
      'landslide',
      'core',
      ['core', 'nature-magic', 'earth', 'physical'],
      0.75,
      0.0,
      0,
      -30,
      0.2,
    ),
    'lightning-storm': new SkillNode(
      'lightning-storm',
      'core',
      ['core', 'storm', 'nature-magic', 'channeled', 'lightning'],
      0.4,
      0.0,
      0,
      -15,
      0.15,
    ),
    pulverize: new SkillNode(
      'pulverize',
      'core',
      ['core', 'werebear', 'shapeshifting', 'physical'],
      0.5,
      0.0,
      0,
      -35,
      0.25,
    ),
    shred: new SkillNode(
      'shred',
      'core',
      ['core', 'werewolf', 'shapeshifting', 'physical'],
      0.25 + 0.35 + 0.7,
      0,
      0,
      -35,
      0.2,
    ),
    tornado: new SkillNode(
      'tornado',
      'core',
      ['core', 'storm', 'nature-magic', 'physical'],
      0.35,
      0.0,
      0,
      -40,
      0.08,
    ),
    // "blood-howl": new SkillNode("blood-howl", "defensive", ["defensive", "werewolf", "shapeshifting", "heal"], 0, 0.0, 15, 0, 0),
    'cyclone-armor': new SkillNode(
      'cyclone-armor',
      'defensive',
      [
        'defensive',
        'storm',
        'nature-magic',
        'cooldown',
        'damage-reduction',
        'non-physical',
        'physical',
        'crowd-control',
      ],
      0.3,
      0,
      18,
      0,
      0.25,
    ),
    // "debilitating-roar": new SkillNode("debilitating-roar", "defensive", ["defensive", "werebear", "shapeshifting", "cooldown", "damage-reduction"], 0.0, 0.0, 22, 0, 0),
    'earthen-bulwark': new SkillNode(
      'earthen-bulwark',
      'defensive',
      [
        'defensive',
        'nature-magic',
        'earth',
        'barrier',
        'cooldown',
        'physical',
      ],
      0.0,
      0.0,
      16,
      0,
      0.3,
    ),
    ravens: new SkillNode(
      'ravens',
      'companion',
      ['companion', 'physical', 'cooldown'],
      2.5,
      0,
      15,
      0,
      0.45,
    ),
    'poison-creeper': new SkillNode(
      'poison-creeper',
      'companion',
      ['companion', 'poison', 'cooldown', 'crowd-control'],
      0,
      0.45,
      20,
      0,
      0.28,
    ),
    wolves: new SkillNode(
      'wolves',
      'companion',
      ['companion', 'cooldown', 'physical'],
      1.35,
      0,
      11,
      0,
      0.5,
    ),
    boulder: new SkillNode(
      'boulder',
      'wrath',
      ['wrath', 'nature-magic', 'earth', 'physical', 'crowd-control'],
      0.46,
      0.0,
      10,
      0,
      0.04,
    ),
    hurricane: new SkillNode(
      'hurricane',
      'wrath',
      ['wrath', 'storm', 'nature-magic', 'physical', 'cooldown'],
      1.34,
      0.0,
      20,
      0,
      0.21,
    ),
    rabies: new SkillNode(
      'rabies',
      'wrath',
      ['wrath', 'werewolf', 'shapeshifting', 'poison', 'cooldown'],
      0.28,
      1.4,
      12,
      0,
      0.5,
    ),
    trample: new SkillNode(
      'trample',
      'wrath',
      [
        'wrath',
        'werebear',
        'shapeshifing',
        'physical',
        'cooldown',
        'crowd-control',
      ],
      0.75,
      0,
      14,
      0,
      0.2,
    ),
    cataclysm: new SkillNode(
      'cataclysm',
      'ultimate',
      [
        'ultimate',
        'storm',
        'nature-magic',
        'lightning',
        'crowd-contol',
        'cooldown',
      ],
      0.95,
      0.0,
      60,
      0,
      0.62,
    ),
    // "grizzly-rage": new SkillNode("grizzly-rage", "ultimate", ["ultimate", "werebear", "shapeshifting", "damage", "cooldown", "damage-reduction"], 0.0, 0.0, 50, 0, 0),
    lacerate: new SkillNode(
      'lacerate',
      'ultimate',
      [
        'ultimate',
        'werewolf',
        'shapeshifting',
        'immune',
        'physical',
        'cooldown',
        'damage-reduction',
      ],
      0.46,
      0.0,
      35,
      0,
      0.07,
    ),
    // "petrify": new SkillNode("petrify", "ultimate", ["ultimate", "nature-magic", "earth", "stun", "crowd-control", "cooldown", "critical-strikes"], 0.0, 0.0, 50, 0, 0)
  }
}

/*
  These are the nodes that are computed at run time. They all start with value = null and should
  depend on each other and the above nodes. Dependencies are added in after all nodes are defined.
  */

export function CreateDruidStatsNodes(
  nodes_map: NodesMap,
): Record<string, StatsNode> {
  if (nodes_map['toggle'] == undefined) {
    throw 'nodes_map is not fully populated.'
  }
  return {
    /*--------------------------------------------------
                      OFFENSIVE STATS NODES
    --------------------------------------------------*/

    Total_Weapon_Damage: new StatsNode('Total_Weapon_Damage', () => {
      const Weapon_Damage_Total = aggregationVal(
        nodes_map,
        'weapon-damage',
      )

      return Weapon_Damage_Total
    }),

    Raw_Attack_Speed: new StatsNode('Raw_Attack_Speed', () => {
      return aggregationVal(nodes_map, 'weapon-attack-speed')
    }),

    // Includes generic damage bonus which do not depend on tags.
    Generic_Damage_Bonus: new StatsNode(
      'Generic_Damage_Bonus',
      () => {
        let Generic_Damage_Bonus = 0
        const number_of_enemies = Number(
          toggleVal(nodes_map, 'number-of-enemies'),
        )
        Generic_Damage_Bonus += aggregationVal(nodes_map, 'damage')

        Generic_Damage_Bonus +=
          Math.min(
            statVal(nodes_map, 'Enemy_Attacks_Per_Second') * 4,
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

        Generic_Damage_Bonus +=
          Number(toggleVal(nodes_map, 'enemy-burning')) *
          aggregationVal(nodes_map, 'damage-to-burning-enemies')

        Generic_Damage_Bonus +=
          statVal(nodes_map, 'Enemy_Chilled') *
          aggregationVal(nodes_map, 'damage-to-chilled-enemies')

        Generic_Damage_Bonus += toggleVal(nodes_map, 'enemy-distant')
          ? aggregationVal(nodes_map, 'damage-to-distant-enemies')
          : aggregationVal(nodes_map, 'damage-to-close-enemies')

        Generic_Damage_Bonus +=
          statVal(nodes_map, 'Enemy_Crowd_Controlled') *
          aggregationVal(
            nodes_map,
            'damage-to-crowd-controlled-enemies',
          )

        Generic_Damage_Bonus +=
          Number(toggleVal(nodes_map, 'enemy-dazed')) *
          aggregationVal(nodes_map, 'damage-to-daze-enemies')

        Generic_Damage_Bonus +=
          (aggregationVal(nodes_map, 'damage-to-elites') *
            Number(toggleVal(nodes_map, 'enemy-elite'))) /
          number_of_enemies

        Generic_Damage_Bonus +=
          Number(toggleVal(nodes_map, 'enemy-frozen')) *
          aggregationVal(nodes_map, 'damage-to-freeze-enemies')

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
          aggregationVal(nodes_map, 'damage-to-stun-enemies') *
          statVal(nodes_map, 'Enemy_Boss_CC_Adjustment')

        Generic_Damage_Bonus +=
          Number(toggleVal(nodes_map, 'enemy-trapped')) *
          aggregationVal(nodes_map, 'damage-to-trap-enemies')

        Generic_Damage_Bonus +=
          Number(
            Number(toggleVal(nodes_map, 'percent-fortify')) >=
              Number(toggleVal(nodes_map, 'percent-life')),
          ) * aggregationVal(nodes_map, 'damage-while-fortified')

        Generic_Damage_Bonus +=
          Number(toggleVal(nodes_map, 'percent-life')) >= 0.8
            ? aggregationVal(nodes_map, 'damage-while-healthy')
            : 0

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

        // Grizzly Rage: Shapeshift into a Dire Werebear for 10 seconds gaining 20% bonus damage and 20% Damage Reduction. Damage bonus is increased by 3% each second while in this form.
        if (
          allSkillsVal(nodes_map).has('grizzly-rage') &&
          tagsVal(nodes_map).has('werebear')
        ) {
          const Grizzly_Rage_Duration = statVal(
            nodes_map,
            'Grizzly_Rage_Duration',
          )
          Generic_Damage_Bonus +=
            (0.335 * Grizzly_Rage_Duration) /
            statVal(nodes_map, 'Grizzly_Rage_Cooldown')
        }

        return Generic_Damage_Bonus
      },
    ),

    Attribute_Damage_Multiplier: new StatsNode(
      'Attribute_Damage_Multiplier',
      () => {
        const Attribute_Damage_Multiplier =
          1 + statVal(nodes_map, 'Total_Willpower') * 0.001

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
        case 'companion':
          Skill_Damage_Bonus += aggregationVal(
            nodes_map,
            'companion-skill-damage',
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

      if (tagsVal(nodes_map).has('earth')) {
        Skill_Damage_Bonus += aggregationVal(
          nodes_map,
          'earth-skill-damage',
        )
      }

      if (tagsVal(nodes_map).has('shock')) {
        Skill_Damage_Bonus += aggregationVal(
          nodes_map,
          'shock-skill-damage',
        )
      }

      if (tagsVal(nodes_map).has('storm')) {
        Skill_Damage_Bonus += aggregationVal(
          nodes_map,
          'storm-skill-damage',
        )
      }

      if (tagsVal(nodes_map).has('werebear')) {
        Skill_Damage_Bonus += aggregationVal(
          nodes_map,
          'werebear-skill-damage',
        )
      }

      if (tagsVal(nodes_map).has('werewolf')) {
        Skill_Damage_Bonus += aggregationVal(
          nodes_map,
          'werewolf-skill-damage',
        )
      }

      // Legendary Paragon 'thunderstruck',
      // Storm Skills deal bonus damage equal to 50%[x] of the total amount of your Damage to Close and Damage to Distant bonuses.
      if (
        paragonVal(nodes_map, 'thunderstruck') &&
        tagsVal(nodes_map).has('storm')
      ) {
        Skill_Damage_Bonus +=
          0.5 *
          (aggregationVal(nodes_map, 'damage-to-distant-enemies') +
            aggregationVal(nodes_map, 'damage-to-close-enemies'))
      }

      return Skill_Damage_Bonus
    }),

    Generic_Critical_Chance: new StatsNode(
      'Generic_Critical_Chance',
      () => {
        const Pre_Sim_Node = druidPresimVal(nodes_map)

        const enemy_spread = Number(
          statVal(nodes_map, 'Enemy_Spread'),
        )
        const number_of_enemies = Number(
          toggleVal(nodes_map, 'number-of-enemies'),
        )

        let Critical_Chance_Total = 0.05 // 5.0% Base Crit chance for All Classes

        // Total_Dexterity
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

        // Enhanced Ravens: You have 8% increased Critical Strike Chance for 6 seconds against Enemies hit by Ravens.
        if (
          allSkillsVal(nodes_map).has('ravens') &&
          talentVal(nodes_map, 'enhanced-ravens') > 0 &&
          'ravens' in Pre_Sim_Node['skill_use_rate']
        ) {
          const Ravens_Uptime = Math.min(
            1,
            Pre_Sim_Node['skill_use_rate']['ravens'] * 6,
          )
          const Probability_Affected_By_Ravens =
            (1 +
              Math.min(10 ** 2 / enemy_spread ** 2, 1) *
                (number_of_enemies - 1)) /
            number_of_enemies

          Critical_Chance_Total +=
            0.08 * Ravens_Uptime * Probability_Affected_By_Ravens
        }

        // Predatory Instinct: Critical Strike Chance against Close enemies is increased by {['3%', '6%', '9%']} .
        if (!toggleVal(nodes_map, 'enemy-distant')) {
          Critical_Chance_Total +=
            0.03 * talentVal(nodes_map, 'predatory-instinct')
        }

        // Scythe Talons: Gain +5% increased Critical Strike Chance.
        if (
          spiritBoonVal(nodes_map)['eagle'].includes('scythe-talons')
        ) {
          Critical_Chance_Total += 0.05
        }

        // Nighthowler's Aspect : Blood Howl increases Critical Strike Chance by +{5/10}%. In addition, Blood Howl also affects Nearby Companions and Players for 3.0 seconds.
        if (
          aspectVal(nodes_map, 'nighthowlers-aspect').length != 0 &&
          allSkillsVal(nodes_map).has('blood-howl')
        ) {
          Critical_Chance_Total +=
            (aspectVal(nodes_map, 'nighthowlers-aspect')[0] * 3) /
            statVal(nodes_map, 'Blood_Howl_Cooldown')
        }

        // Brutal Poison Creeper: Your Critical Strike Chance is increased by 20% against enemies strangled by poison creeper.
        if (
          talentVal(nodes_map, 'brutal-poison-creeper') &&
          'poison-creeper' in Pre_Sim_Node['skill_use_rate']
        ) {
          const Poison_Creeper_Duration =
            2 + talentVal(nodes_map, 'enhanced-poison-creeper')
          Critical_Chance_Total +=
            0.2 *
            Math.min(
              Poison_Creeper_Duration *
                Pre_Sim_Node['skill_use_rate']['poison-creeper'],
              1,
            )
        }

        // Keystone Talent ['earthen-might', 1],  Lucky Hit: Damaging enemies with Earth Skills has up to a 5% chance to:
        //    Restore all of your Spirit
        //    Cause your attacks to be guaranteed Critical Strikes for 5 seconds
        // This chance is increased by:
        //    10% for Critical Strikes
        //    10% if the target is Stunned, Immobilized, or Knocked Back
        if (talentVal(nodes_map, 'earthen-might') > 0) {
          // Mighty storms Aspect : The Earthen Might Key Passive also applies to your Storm Skills.
          const Earthen_Might_Skills = new Set([
            'earth-spike',
            'landslide',
            'boulder',
            'petrify',
          ])
          if (
            aspectVal(nodes_map, 'mighty-storms-aspect').length != 0
          ) {
            Earthen_Might_Skills.add('wind-shear')
              .add('lightning-storm')
              .add('tornado')
              .add('hurricane')
              .add('cataclysm')
          }
          let Earthen_Might_Proc_Rate = 0
          let Skill_Critical_Chance = 0
          let Crowd_Control_Earthen_Might_Bonus = 0
          if (
            toggleVal(nodes_map, 'enemy-stunned') ||
            toggleVal(nodes_map, 'enemy-immobilized')
          ) {
            Crowd_Control_Earthen_Might_Bonus += 0.1
          }
          for (const Other_Skill in Pre_Sim_Node['skill_use_rate']) {
            if (Earthen_Might_Skills.has(Other_Skill)) {
              Skill_Critical_Chance =
                Pre_Sim_Node['cross_skill_stat'][Other_Skill][
                  'critical_chance'
                ]
              Earthen_Might_Proc_Rate +=
                (0.05 +
                  0.1 * Skill_Critical_Chance +
                  Crowd_Control_Earthen_Might_Bonus) *
                Pre_Sim_Node['skill_use_rate'][Other_Skill] *
                Pre_Sim_Node['cross_skill_stat'][Other_Skill][
                  'lucky_hit_chance'
                ] *
                Pre_Sim_Node['cross_skill_stat'][Other_Skill][
                  'total_hits'
                ]
            }
          }
          Critical_Chance_Total +=
            (1 - Critical_Chance_Total) *
            Math.min(1, Earthen_Might_Proc_Rate * 5)
        }

        // Vampiric Power sanguine-brace
        // When you kill an enemy, Fortify for 6% of your Base Life. While you have more Fortify than half of your Maximum Life, you gain 8% Critical Strike Chance.
        if (
          vampiricPowerVal(nodes_map, 'sanguine-brace') &&
          Number(toggleVal(nodes_map, 'percent-fortify')) > 0.5
        ) {
          Critical_Chance_Total += 0.08
        }

        // Waxing Gibbous : Gain Stealth for 2 seconds when killing enemies with Shred. Breaking Stealth with an attack grants Ambush which guarantees Critical Strikes for {1/2.5} seconds. // IGNORE
        if (
          aspectVal(nodes_map, 'waxing-gibbous').length != 0 &&
          'shred' in Pre_Sim_Node['skill_use_rate']
        ) {
          const Waxing_Gibbous_Rate = Math.min(
            Pre_Sim_Node['cross_skill_stat']['shred']['enemy_kills'],
            Pre_Sim_Node['skill_use_rate']['shred'],
          )
          const Waxing_Gibbous_Uptime = Math.min(
            1,
            aspectVal(nodes_map, 'waxing-gibbous')[0] *
              Waxing_Gibbous_Rate,
          )
          Critical_Chance_Total +=
            (1 - Critical_Chance_Total) * Waxing_Gibbous_Uptime
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
              (1 + aspectVal(nodes_map, 'smiting-aspect')[0] * 0.65)
        }

        return Generic_Critical_Chance_Multiplier
      },
    ),

    Skill_Critical_Chance: new StatsNode(
      'Skill_Critical_Chance',
      () => {
        const Pre_Sim_Node = druidPresimVal(nodes_map)
        let Critical_Chance_Total = 0

        // Natural Boulder: While you have any Fortify, Boulder has 20% increased Critical Strike Chance.
        if (
          currentSkillVal(nodes_map)['name'] == 'boulder' &&
          talentVal(nodes_map, 'natural-boulder') > 0 &&
          Number(toggleVal(nodes_map, 'percent-fortify')) > 0
        ) {
          Critical_Chance_Total += 0.2
        }

        // Shapeshifter: Shapeshifting has a 20% chance to cause the Skill's damage to Critically Strike.
        // TODO: This isn't correct. Needs to check the rate at which this skill causes shapeshifting.
        if (tagsVal(nodes_map).has('shapeshifting')) {
          Critical_Chance_Total += 0.2
        }

        // Aspect of Natural Balance : Casting a Storm Skill grants your Earth Skills x{30/45}% Critical Strike Damage for 4.0 seconds.
        // Casting a Earth Skill increases the Critical Strike Chance of Storm Skills by +{8/12}% for 4.0 seconds.
        if (
          aspectVal(nodes_map, 'aspect-of-natural-balance').length >
            0 &&
          tagsVal(nodes_map).has('storm')
        ) {
          const Aspect_Of_Natural_Balance = aspectVal(
            nodes_map,
            'aspect-of-natural-balance',
          )[1]
          const Earth_Skills = new Set([
            'earth-spike',
            'landslide',
            'boulder',
            'petrify',
          ])
          let Earth_Skill_Rate = 0
          for (const Other_Skill in Pre_Sim_Node['skill_use_rate']) {
            if (Earth_Skills.has(Other_Skill)) {
              Earth_Skill_Rate +=
                Pre_Sim_Node['skill_use_rate'][Other_Skill]
            }
          }
          Critical_Chance_Total +=
            Aspect_Of_Natural_Balance *
            Math.min(1, Earth_Skill_Rate * 4)
        }

        // Savage Boulder: Boulder's Critical Strike Chance is increased by 3%[+] each time it deals damage.
        if (
          talentVal(nodes_map, 'savage-boulder') > 0 &&
          currentSkillVal(nodes_map)['name'] == 'boulder'
        ) {
          Critical_Chance_Total +=
            1.5 * (statVal(nodes_map, 'Total_Hits') - 1)
        }

        return Math.min(Critical_Chance_Total, 1)
      },
    ),

    Skill_Critical_Chance_Multiplier: new StatsNode(
      'Skill_Critical_Chance_Multiplier',
      () => {
        const Critical_Chance_Multiplier = 1

        return Critical_Chance_Multiplier
      },
    ),

    Critical_Chance: new StatsNode('Critical_Chance', () => {
      const Non_Crit_Skills = new Set([
        'poison-creeper',
        'petrify',
        'grizzly-rage',
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

      // Lupine Ferocity: Every 6th Werewolf Skill hit Critically Strikes and deals 140% increased damage.
      if (
        tagsVal(nodes_map).has('skill') &&
        tagsVal(nodes_map).has('werewolf') &&
        talentVal(nodes_map, 'lupine-ferocity') > 0
      ) {
        // Each hit is 1/6 of closing the gap to a crit.
        Critical_Chance += 1 - Critical_Chance / 6
      }

      // Supreme Lacerate: Lacerate's initial strike is guaranteed to Critically Strike and deals 150% increased damage.
      if (
        tagsVal(nodes_map).has('skill') &&
        currentSkillVal(nodes_map)['name'] == 'lacerate' &&
        talentVal(nodes_map, 'supreme-lacerate') > 0
      ) {
        // First hit is a guaranteed crit is instead averaged so that each hit gets 1/Total_Hits of the way closer to a crit.
        Critical_Chance +=
          (1 - Critical_Chance) / statVal(nodes_map, 'Total_Hits')
      }

      return Math.min(Critical_Chance, 1)
    }),

    // These are the things which give +Critical Damage.
    Generic_Critical_Bonus: new StatsNode(
      'Generic_Critical_Bonus',
      () => {
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

        // Petrify: Encase all Nearby enemies in stone, Stunning them for 3 seconds. You deal 30% increased Critical Strike Damage to enemies affected by Petrify.
        // Prime Petrify: Petrify's effect durations are increased by 1 second.
        if (allSkillsVal(nodes_map).has('petrify')) {
          let Petrify_Bonus =
            (0.3 * (3 + talentVal(nodes_map, 'prime-petrify'))) /
            statVal(nodes_map, 'Petrify_Cooldown')
          if (toggleVal(nodes_map, 'enemy-boss')) {
            Petrify_Bonus =
              (0.6 * (6 + talentVal(nodes_map, 'prime-petrify'))) /
              statVal(nodes_map, 'Petrify_Cooldown')
          }
          Critical_Bonus_Total += Petrify_Bonus
        }

        // Envenom:  You and your Companions cause poisoned enemies to take {['10%', '20%', '30%']} additional Critical Strike Damage.
        if (toggleVal(nodes_map, 'enemy-poisoned')) {
          Critical_Bonus_Total +=
            0.1 * talentVal(nodes_map, 'envenom')
        }

        return Critical_Bonus_Total
      },
    ),

    Generic_Critical_Damage_Multiplier: new StatsNode(
      'Generic_Critical_Damage_Multiplier',
      () => {
        const Pre_Sim_Node = druidPresimVal(nodes_map)
        let Critical_Multiplier_Total = 1.5

        // Aspect of the Rampaging Werebeast : The duration of Grizzly Rage is increased by {1/5} seconds.
        // In addition, Critical Strikes while Grizzly Rage is active increase your Critical Strike Damage by x10% for the duration.
        // S2 Update Critical Strike Damage bonus amount now has a maximum of 200%
        if (
          aspectVal(nodes_map, 'aspect-of-the-rampaging-werebeast')
            .length != 0 &&
          allSkillsVal(nodes_map).has('grizzly-rage')
        ) {
          const Bear_Skills = new Set([
            'maul',
            'pulverize',
            'trample',
          ])
          let Rampaging_Werebeast_Critical_Rate = 0
          for (const Other_Skill in Pre_Sim_Node['skill_use_rate']) {
            if (Bear_Skills.has(Other_Skill)) {
              Rampaging_Werebeast_Critical_Rate +=
                Pre_Sim_Node['skill_use_rate'][Other_Skill] *
                Pre_Sim_Node['cross_skill_stat'][Other_Skill][
                  'critical_chance'
                ] *
                Pre_Sim_Node['cross_skill_stat'][Other_Skill][
                  'total_hits'
                ]
            }
          }
          const Grizzly_Rage_Duration = statVal(
            nodes_map,
            'Grizzly_Rage_Duration',
          )
          const Grizzly_Rage_Cooldown = statVal(
            nodes_map,
            'Grizzly_Rage_Cooldown',
          )
          // Renaming for math clarity.
          const N = Grizzly_Rage_Cooldown
          const lambda = Math.max(
            Rampaging_Werebeast_Critical_Rate,
            0.0001,
          )

          if (tagsVal(nodes_map).has('werebear')) {
            // Average bonus times the uptime.
            Critical_Multiplier_Total *=
              1 +
              // Expected remaining proportion of Grizzly Rage duration after a crit occurs.
              0.1 *
                (1 - (1 / (lambda * N)) * (1 - Math.exp(-lambda * N)))
            Math.min(Grizzly_Rage_Duration / Grizzly_Rage_Cooldown, 1)
          }
        }

        // Avian Wrath: Gain 30%[x] Critical Strike Damage.
        if (
          spiritBoonVal(nodes_map)['eagle'].includes('avian-wrath')
        ) {
          Critical_Multiplier_Total *= 1.3
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

        Critical_Bonus_Total +=
          aggregationVal(
            nodes_map,
            'critical-strike-damage-with-earth-skills',
          ) * Number(tagsVal(nodes_map).has('earth'))

        // Primal Shred: Shred's second and third attacks also perform a dash. In addition, Shred's Critical Strike Damage is increased by 30%.
        if (
          currentSkillVal(nodes_map)['name'] == 'shred' &&
          talentVal(nodes_map, 'primal-shred') > 0
        ) {
          Critical_Bonus_Total += 0.3
        }

        return Critical_Bonus_Total
      },
    ),

    Skill_Critical_Damage_Multiplier: new StatsNode(
      'Skill_Critical_Damage_Multiplier',
      () => {
        const Pre_Sim_Node = druidPresimVal(nodes_map)
        let Critical_Multiplier_Total = 1

        // Crashstone Aspect : Earth Skills deal x{30/40}% more Critical Strike Damage to Crowd Controlled enemies.
        if (
          tagsVal(nodes_map).has('earth') &&
          statVal(nodes_map, 'Enemy_Crowd_Controlled') &&
          aspectVal(nodes_map, 'crashstone-aspect').length > 0
        ) {
          Critical_Multiplier_Total += aspectVal(
            nodes_map,
            'crashstone-aspect',
          )[0]
        }

        // Aspect of Natural Balance : Casting a Storm Skill grants your Earth Skills x{30/45}% Critical Strike Damage for 4.0 seconds.
        // Casting a Earth Skill increases the Critical Strike Chance of Storm Skills by +{8/12}% for 4.0 seconds.
        if (
          aspectVal(nodes_map, 'aspect-of-natural-balance').length >
            0 &&
          tagsVal(nodes_map).has('earth')
        ) {
          const Aspect_Of_Natural_Balance = aspectVal(
            nodes_map,
            'aspect-of-natural-balance',
          )[0]
          const Storm_Skills = new Set([
            'wind-shear',
            'lightning-storm',
            'tornado',
            'hurricane',
            'cataclysm',
          ])
          let Storm_Skill_Rate = 0
          for (const Other_Skill in Pre_Sim_Node['skill_use_rate']) {
            if (Storm_Skills.has(Other_Skill)) {
              Storm_Skill_Rate +=
                Pre_Sim_Node['skill_use_rate'][Other_Skill]
            }
          }
          Critical_Multiplier_Total *=
            1 +
            Aspect_Of_Natural_Balance *
              Math.min(1, Storm_Skill_Rate * 4)
        }

        // Legendary Paragon'earthen-devastation',
        // Earth Skills deal 10%[x] increased Critical Strike Damage, increased by 20%[x] of the total amount of your Bonus Damage to Crowd Controlled up to 40%[x].
        if (
          paragonVal(nodes_map, 'earthen-devastation') &&
          tagsVal(nodes_map).has('earth')
        ) {
          Critical_Multiplier_Total *=
            1 +
            Math.min(
              0.4,
              0.1 +
                0.2 *
                  aggregationVal(
                    nodes_map,
                    'damage-to-crowd-controlled-enemies',
                  ),
            )
        }

        return Critical_Multiplier_Total
      },
    ),

    Critical_Multiplier: new StatsNode('Critical_Multiplier', () => {
      const Non_Crit_Skills = new Set([
        'poison-creeper',
        'petrify',
        'grizzly-rage',
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
        const Pre_Sim_Node = druidPresimVal(nodes_map)
        let Attack_Speed_Bonus_Total = 0

        // attack-speed
        Attack_Speed_Bonus_Total += aggregationVal(
          nodes_map,
          'attack-speed',
        )

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
            'earth-spike',
            'wind-shear',
            'storm-strike',
            'maul',
            'claw',
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
        const Pre_Sim_Node = druidPresimVal(nodes_map)
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

        // Enhanced Claw Claw's Attack Speed is increased by  15%[+].
        if (
          currentSkillVal(nodes_map)['name'] == 'claw' &&
          talentVal(nodes_map, 'enhanced-claw') > 0
        ) {
          Attack_Speed_Bonus_Total += 0.15
        }

        // (TODO) Does this mean for the next attack? What about the next time you use shred?
        // Enhanced Shred: Shred gains 30% Attack Speed and Heals for 1% of your Maximum Life if an enemy is struck.
        if (
          currentSkillVal(nodes_map)['name'] == 'shred' &&
          talentVal(nodes_map, 'enhanced-shred') > 0
        ) {
          // Only 2 of the 3 attacks get the bonus speed.
          Attack_Speed_Bonus_Total += 0.2
        }

        // Preserving Blood Howl: Blood Howl also increases your Attack Speed by 15% for 4 seconds.
        if (
          allSkillsVal(nodes_map).has('blood-howl') &&
          talentVal(nodes_map, 'preserving-blood-howl') > 0
        ) {
          Attack_Speed_Bonus_Total +=
            0.15 *
            Math.min(4 / statVal(nodes_map, 'Blood_Howl_Cooldown'), 1)
        }

        // Spirit Boon Swooping Attacks: Gain +10% Attack Speed
        if (
          spiritBoonVal(nodes_map)['eagle'].includes(
            'swooping-attacks',
          )
        ) {
          Attack_Speed_Bonus_Total += 0.1
        }

        // Keystone Talent: ['bestial-rampage', 1] After being a Werewolf for 2 seconds, gain 30% Attack Speed for 15 seconds.
        //                                         After being a Werebear for 2 seconds, deal 30% increased damage for 15 seconds.
        if (talentVal(nodes_map, 'bestial-rampage') > 0) {
          const Werewolf_Uptime =
            Pre_Sim_Node['shapeshift_uptime']['werewolf']

          // Aspect of the Wildrage : Your Companions gain the bonuses from the Bestial Rampage Key Passive.
          if (!tagsVal(nodes_map).has('companion')) {
            Attack_Speed_Bonus_Total +=
              0.3 * Math.min(1, Werewolf_Uptime * 6)
          } else if (
            aspectVal(nodes_map, 'aspect-of-the-wildrage').length > 0
          ) {
            Attack_Speed_Bonus_Total +=
              0.3 * Math.min(1, Werewolf_Uptime * 6)
          }
        }
        // Generic Aspect, Accelerating Aspect: Critical Strikes with Core Skills increase your Attack Speed by +[15 - 25]% for 3.0 seconds.
        if (aspectVal(nodes_map, 'accelerating-aspect').length != 0) {
          let Core_Critical_Rate = 0
          const Core_Skills = new Set([
            'pulverize',
            'shred',
            'tornado',
            'lightning-storm',
            'landslide',
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

    Attack_Speed_Bonus: new StatsNode('Attack_Speed_Bonus', () => {
      return (
        statVal(nodes_map, 'Aspect_Attack_Speed_Bonus') +
        statVal(nodes_map, 'Non_Aspect_Attack_Speed_Bonus')
      )
    }),

    // Attack Speed Stats Node http://www.vhpg.com/diablo-4-attack-speed/
    Total_Attack_Speed: new StatsNode('Total_Attack_Speed', () => {
      const Raw_Weapon_Attack_Speed = aggregationVal(
        nodes_map,
        'weapon-attack-speed',
      ) // Can also be nodes_map["stat"]["Raw_Attack_Speed"]) but Non-Barbarian use 1 Weapon
      const Attack_Speed_Total =
        1 + statVal(nodes_map, 'Attack_Speed_Bonus')

      return Raw_Weapon_Attack_Speed * Attack_Speed_Total
    }),

    Overpower_Chance: new StatsNode('Overpower_Chance', () => {
      if (currentSkillVal(nodes_map)['tags'].has('channeled')) {
        // Channeled Skills Cannot Overpower
        return 0
      }

      const Pre_Sim_Node = druidPresimVal(nodes_map)

      let Overpower_Chance_Total = 0.03 // Base 3% chance to Overpower a Skill

      // Talent ['provocation', 3],  When you remain in Werebear form for at least {[24, 20, 16]} seconds, your next Skill will Overpower.
      if (
        talentVal(nodes_map, 'provocation') > 0 &&
        Pre_Sim_Node['shapeshift_uptime']['werebear'] >= 0.9
      ) {
        let Overpower_Capable_Skill_Rate = 0
        for (const Skill in Pre_Sim_Node['skill_use_rate']) {
          if (
            Pre_Sim_Node['cross_skill_stat'][Skill][
              'overpower_chance'
            ] > 0
          ) {
            Overpower_Capable_Skill_Rate +=
              Pre_Sim_Node['skill_use_rate'][Skill]
          }
        }
        if (
          currentSkillVal(nodes_map)['name'] in
            Pre_Sim_Node['skill_use_rate'] &&
          Pre_Sim_Node['cross_skill_stat'][
            currentSkillVal(nodes_map)['name']
          ]['overpower_chance'] > 0
        ) {
          Overpower_Chance_Total +=
            (1 - Overpower_Chance_Total) /
            (Overpower_Capable_Skill_Rate *
              (24 - 4 * talentVal(nodes_map, 'provocation')))
        }
      }

      // Enhanced Pulverize: Your next Pulverize will Overpower every 12 seconds while you remain Healthy.
      if (
        talentVal(nodes_map, 'enhanced-pulverize') > 0 &&
        currentSkillVal(nodes_map)['name'] == 'pulverize' &&
        'pulverize' in Pre_Sim_Node['skill_use_rate']
      ) {
        const N = 12 * Pre_Sim_Node['skill_use_rate']['pulverize']
        const p = 1 - Overpower_Chance_Total
        const T = (1 / p ** N - 1) / (1 - p)
        Overpower_Chance_Total += (1 / (T + 1)) * p
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
          if (skill != 'lightning-storm') {
            Total_Skill_Use_Rate +=
              Pre_Sim_Node['skill_use_rate'][skill]
          }
        }
        const N = 30 * Total_Skill_Use_Rate
        // Need the expected number of attacks until we get N failed
        // Overpowers in a row. This is the same as the Martigale problem of 'How many coin flips
        // on average until we get N Heads in a row?' The answer is (2^N - 1)/ 2, but we generalize
        // here.
        const p = 1 - Overpower_Chance_Total
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
        Overpower_Chance_Total += (1 / (alpha * T + 1)) * p * alpha
      }

      // Vampiric Power blood-boil
      // When your Core Skills Overpower an enemy, you spawn 3 Volatile Blood Drops. Collecting a Volatile Blood Drop causes it to explode, dealing 60% Physical damage around you.
      // Every 20 seconds, your next Skill is guaranteed to Overpower.
      if (vampiricPowerVal(nodes_map, 'blood-boil')) {
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
          Overpower_Chance_Total +=
            (1 - Overpower_Chance_Total) *
            Probability_Overpower_Guaranteed
        }
      }

      // Spirit Boon Obsidian Slam: Every 20th kill will cause your next Earth Skill to Overpower.
      if (
        spiritBoonVal(nodes_map)['snake'].includes('obsidian-slam') &&
        tagsVal(nodes_map).has('earth')
      ) {
        const Earth_Skills = new Set([
          'earth-spike',
          'boulder',
          'landslide',
        ])
        // Aspect of the Trampled Earth : Trample is now also a Nature Magic and Earth Skill.
        if (
          aspectVal(nodes_map, 'aspect-of-the-trampled-earth')
            .length > 0
        ) {
          Earth_Skills.add('trample')
        }
        // Aspect of the Ursine Horror : Pulverize is now also an Earth Skill. After casting Pulverize, tectonic spikes continue to deal {175/250} damage over 2.0 seconds.
        if (
          aspectVal(nodes_map, 'aspect-of-the-ursine-horror').length >
          0
        ) {
          Earth_Skills.add('pulverize')
        }
        let Earth_Skill_Rate = 0
        const Obsidian_Slam_Rate =
          statVal(nodes_map, 'Enemy_Kill_Rate') / 20
        for (const Skill in Pre_Sim_Node['skill_use_rate']) {
          Earth_Skill_Rate += Pre_Sim_Node['skill_use_rate'][Skill]
        }
        if (Earth_Skill_Rate > 0) {
          const Probability_Obsidian_Slam = Math.min(
            1,
            Obsidian_Slam_Rate / Earth_Skill_Rate,
          )
          Overpower_Chance_Total +=
            (1 - Overpower_Chance_Total) * Probability_Obsidian_Slam
        }
      }

      // Banished Lord's Talisman (Unique Generic Amulet): After you spend 300 of your Primary Resource, your next Core Skill is guaranteed to Overpower. Your Critical Strikes that Overpower deal 80-120% [x] increased damage.
      if (
        aspectVal(nodes_map, 'banished-lords-talisman').length > 0 &&
        tagsVal(nodes_map).has('core') &&
        Overpower_Chance_Total != 0
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
          Overpower_Chance_Total +=
            (1 - Overpower_Chance_Total) *
            Probability_Overpower_Guaranteed
        }
      }

      return Math.min(1, Overpower_Chance_Total)
    }),

    Overpower_Damage: new StatsNode('Overpower_Damage', () => {
      const Overpower_Damage =
        (Number(toggleVal(nodes_map, 'percent-life')) +
          Number(toggleVal(nodes_map, 'percent-fortify'))) *
        statVal(nodes_map, 'Max_Life') *
        statVal(nodes_map, 'Overpower_Multiplier')
      const Tags_Node = CopyTags(tagsVal(nodes_map))
      Tags_Node.add('overpower')
      const Damage_Multiplier = DruidDamageMultiplier(
        Tags_Node,
        nodes_map,
      )

      // Overpower current Fortify + Current Hitpoints x Overpower Multiplier to Weapon Damage
      return Overpower_Damage * Damage_Multiplier
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

        // 'overpower-damage-with-werebear-skills'
        if (tagsVal(nodes_map).has('werebear')) {
          Overpower_Damage_Bonus += aggregationVal(
            nodes_map,
            'overpower-damage-with-werebear-skills',
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

        // Keystone Talent ['ursine-strength', 1], // While Healthy, deal 25% (multiplicative damage) [x] increased damage, and 25%[x] increased Overpower damage.
        // Gain 20%[x] additional Maximum Life while in Werebear form and for 3 seconds after leaving Werebear form.
        if (
          talentVal(nodes_map, 'ursine-strength') > 0 &&
          Number(toggleVal(nodes_map, 'percent-life')) >= 0.8
        ) {
          Overpower_Multiplier_Total *= 1.25
        }

        return Overpower_Multiplier_Total
      },
    ),

    // Aspect which are multiplicative with damage for all sources. If it depends on the tags of a non-skill, it should be in the DruidDamageMultiplier
    // function directly.
    Generic_Aspect_Damage_Multiplier: new StatsNode(
      'Generic_Aspect_Damage_Multiplier',
      () => {
        let Aspect_Damage_Multiplier = 1
        const Pre_Sim_Node = druidPresimVal(nodes_map)

        // Aspect of Pummeling: "Deal {}} increased damage to Stunned, knocked Down, and Frozen enemies.",
        if (
          aspectVal(nodes_map, 'aspect-of-pummeling').length != 0 &&
          (toggleVal(nodes_map, 'enemy-stunned') ||
            toggleVal(nodes_map, 'enemy-knocked-down') ||
            toggleVal(nodes_map, 'enemy-frozen'))
        ) {
          Aspect_Damage_Multiplier *=
            1 + aspectVal(nodes_map, 'aspect-of-pummeling')[0]
        }

        // aspect-of-Retribution: Distant enemies have a 15.0% chance to be Stunned for 2.0 seconds when they hit you. You deal x{30/50}% increased damage to Stunned enemies.
        if (
          aspectVal(nodes_map, 'aspect-of-retribution').length != 0 &&
          toggleVal(nodes_map, 'enemy-stunned')
        ) {
          Aspect_Damage_Multiplier *=
            1 + aspectVal(nodes_map, 'aspect-of-retribution')[0]
        }

        // aspect-of-Inner-Calm: Deal x{5/10}% increased damage for each second you stand still, up to x30.0%.
        if (
          aspectVal(nodes_map, 'aspect-of-inner-calm').length != 0
        ) {
          Aspect_Damage_Multiplier *= 1.3
        }

        // Conceited-aspect: Deal x{15-25}% increased damage while you have a Barrier active.
        if (
          aspectVal(nodes_map, 'conceited-aspect').length != 0 &&
          toggleVal(nodes_map, 'percent-barrier') != 0
        ) {
          Aspect_Damage_Multiplier *=
            1 + aspectVal(nodes_map, 'conceited-aspect')[0]
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

        // Tibault's Will (Generic Unique Pants): You deal 20-40% [x] increased damage while Unstoppable and for 4 seconds after. When you become Unstoppable, gain 50 of your Primary Resource.
        if (aspectVal(nodes_map, 'tibaults-will').length != 0) {
          let Tibaults_Will_Uptime = 0

          // Trample: Shapeshift into a Werebear, become Unstoppable, and charge forward, dealing {['25%', '28%', '30%', '32%', '35%']} damage and Knocking Back enemies.
          if ('trample' in Pre_Sim_Node['skill_use_rate']) {
            Tibaults_Will_Uptime +=
              (1 / Pre_Sim_Node['skill_use_rate']['trample']) * 5
          }

          // ['enhanced-earthen-bulwark', 1], // Earthen Bulwark makes you Unstoppable while active.
          if (
            allSkillsVal(nodes_map).has('earthen-bulwark') &&
            talentVal(nodes_map, 'enhanced-earthen-bulwark') > 0
          ) {
            Tibaults_Will_Uptime +=
              7 / statVal(nodes_map, 'Earthen_Bulwark_Cooldown')
          }

          //['prime-grizzly-rage', 1], // Prime Grizzly Rage  Grizzly Rage makes you Unstoppable  for 6 seconds.
          if (
            allSkillsVal(nodes_map).has('grizzly-rage') &&
            talentVal(nodes_map, 'prime-grizzly-rage') > 0
          ) {
            Tibaults_Will_Uptime +=
              10 / statVal(nodes_map, 'Grizzly_Rage_Cooldown')
          }

          // Vampiric Power metamorphosis
          // When you Evade you turn into a cloud of bats, becoming Unstoppable for 4 seconds. Enemies along your path take 160% Physical damage and are inflicted with Vampiric Curse.
          if (vampiricPowerVal(nodes_map, 'metamorphosis')) {
            Tibaults_Will_Uptime += 9 / 10
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
          statVal(nodes_map, 'Enemy_Vulnerable') > 0
        ) {
          Aspect_Damage_Multiplier *=
            1 + 0.16 * statVal(nodes_map, 'Enemy_Vulnerable')
        }

        // Vampiric Power feed-the-coven
        // Lucky Hit: Conjuration, Companion, Minion and Bat Familiar attacks have up to a 60% chance to restore 10 Primary Resource to you and increase your Damage by 10% for 4 seconds.
        if (vampiricPowerVal(nodes_map, 'feed-the-coven')) {
          let Number_Of_Wolves = 0
          // Wolves Passive: Summon 2 wolf companions that bite enemies for 11% damage.
          if (allSkillsVal(nodes_map).has('wolves')) {
            Number_Of_Wolves = 2
            // Aspect of the Stampede : Gain 1 additional Companion. In addition, your Companion Skills deal x{100/150}% bonus damage.
            Number_Of_Wolves += Number(
              aspectVal(nodes_map, 'aspect-of-the-stampede').length >
                0,
            )
          }
          // Ravens Passive: 1 Raven flies above you and periodically attacks your enemies for {24%} damage every 5 seconds.
          let Number_Of_Ravens = 0
          if (allSkillsVal(nodes_map).has('ravens')) {
            Number_Of_Ravens += 1

            // Brutal Ravens: 2 additional Ravens periodically attack enemies and Increase the passive damage of Ravens by x40%..
            Number_Of_Ravens +=
              2 *
              Number(aspectVal(nodes_map, 'brutal-ravens').length > 0)

            // Aspect of the Stampede : Gain 1 additional Companion. In addition, your Companion Skills deal x{100/150}% bonus damage.
            Number_Of_Ravens += Number(
              aspectVal(nodes_map, 'aspect-of-the-stampede').length >
                0,
            )
          }
          let Number_Of_Posion_Creeper = 0
          if (allSkillsVal(nodes_map).has('poison-creeper')) {
            Number_Of_Posion_Creeper += 1
            // Aspect of the Stampede : Gain 1 additional Companion. In addition, your Companion Skills deal x{100/150}% bonus damage.
            Number_Of_Posion_Creeper += Number(
              aspectVal(nodes_map, 'aspect-of-the-stampede').length >
                0,
            )
          }
          const Companion_Hit_Rate =
            Number_Of_Wolves +
            Number_Of_Ravens / 5 +
            Number_Of_Posion_Creeper / 6
          const Minion_Lucky_Hit_Chance = 0.3 // completely made up value taken from bat stun chance on another vampiric power
          Aspect_Damage_Multiplier *=
            1 +
            0.1 *
              Math.min(
                1,
                (statVal(nodes_map, 'Vampiric_Bat_Rate') +
                  Companion_Hit_Rate) *
                  Minion_Lucky_Hit_Chance *
                  4,
              )
        }

        return Aspect_Damage_Multiplier
      },
    ),

    // Aspects which only apply to skills.
    Skill_Aspect_Damage_Multiplier: new StatsNode(
      'Skill_Aspect_Damage_Multiplier',
      () => {
        let Aspect_Damage_Multiplier = 1
        const Pre_Sim_Node = druidPresimVal(nodes_map)

        // (Unique) Fists-of-Fate: Your attacks randomly deal 1% to {200/300}% of their normal damage.
        if (aspectVal(nodes_map, 'fists-of-fate').length > 0) {
          Aspect_Damage_Multiplier *=
            aspectVal(nodes_map, 'fists-of-fate')[0] / 2
        }

        // Aspect of the Stampede : Gain 1 additional Companion. In addition, your Companion Skills deal x{100/150}% bonus damage.
        if (
          aspectVal(nodes_map, 'aspect-of-the-stampede').length !=
            0 &&
          tagsVal(nodes_map).has('companion')
        ) {
          Aspect_Damage_Multiplier *=
            1 + aspectVal(nodes_map, 'aspect-of-the-stampede')[0]
        }

        // Aspect of Retaliation : Your Core Skills deal up to x{20/30}% increased damage based on your amount of Fortify.
        if (
          aspectVal(nodes_map, 'aspect-of-retaliation').length > 0 &&
          tagsVal(nodes_map).has('core')
        ) {
          Aspect_Damage_Multiplier *=
            1 +
            Number(toggleVal(nodes_map, 'percent-fortify')) *
              aspectVal(nodes_map, 'aspect-of-retaliation')[0]
        }

        // Shepherd's Aspect : Core Skills deal an additional x{6/8}% damage for each active Companion.
        if (
          aspectVal(nodes_map, 'shepherds-aspect').length > 0 &&
          tagsVal(nodes_map).has('core')
        ) {
          const All_Skills = allSkillsVal(nodes_map)
          const Number_Of_Companions =
            Number(All_Skills.has('wolves')) +
            Number(All_Skills.has('ravens')) +
            Number(All_Skills.has('poison-creeper'))
          Aspect_Damage_Multiplier *=
            1 +
            Number_Of_Companions *
              aspectVal(nodes_map, 'shepherds-aspect')[0]
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

        // Edgemaster's-aspect: Skills deal up to x{10-20}% increased damage based on your available Primary Resource when cast, receiving the maximum benefit while you have full Primary Resource.
        if (aspectVal(nodes_map, 'edgemasters-aspect').length > 0) {
          Aspect_Damage_Multiplier *=
            1 + aspectVal(nodes_map, 'edgemasters-aspect')[0]
        }

        // Aspect of Metamorphic Stone : Boulder is now a Core Skill and costs 40.0 Spirit to cast dealing {100/120}% of normal damage.
        if (
          currentSkillVal(nodes_map)['name'] == 'boulder' &&
          aspectVal(nodes_map, 'aspect-of-metamorphic-stone').length >
            0
        ) {
          Aspect_Damage_Multiplier *= aspectVal(
            nodes_map,
            'aspect-of-metamorphic-stone',
          )[0]
        }

        //Subterranean Aspect: Poison Creeper's active also casts Landslide in a circle around you. Earth Skills deal [10 - 20]% increased damage to Poisoned enemies. (Druid Only)
        if (
          aspectVal(nodes_map, 'subterranean').length != 0 &&
          tagsVal(nodes_map).has('earth') &&
          toggleVal(nodes_map, 'enemy-poisoned')
        ) {
          Aspect_Damage_Multiplier *=
            1 + aspectVal(nodes_map, 'subterranean')[0]
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

        // Raw Might Aspect (Druid Offensive Aspect): After you hit 15 enemies with your Werebear Skills, your next Werebear Skill will deal 30-50% (multiplicative damage) [x] more damage and Stun enemies for 2 seconds.
        if (
          aspectVal(nodes_map, 'raw-might-aspect').length > 0 &&
          tagsVal(nodes_map).has('werebear')
        ) {
          let Raw_Might_Rate = 0
          let Werebear_Skill_Rate = 0
          let Werebear_Skills = new Set([
            'maul',
            'pulverize',
            'trample',
          ])
          //const Storm_Skills = new Set(['lightning-storm', 'wind-shear', 'storm-strike', 'tornado', 'hurricane', 'cataclysm'])
          const Earth_Skills = new Set([
            'earth-spike',
            'boulder',
            'landslide',
          ])

          // Vasily's Prayer : Your Earth Skills are now also Werebear Skills
          if (aspectVal(nodes_map, 'vasilys-prayer').length > 0) {
            Werebear_Skills = new Set([
              ...Werebear_Skills,
              ...Earth_Skills,
            ])
          }

          for (const Skill in Pre_Sim_Node['skill_use_rate']) {
            if (Werebear_Skills.has(Skill)) {
              Raw_Might_Rate +=
                (Pre_Sim_Node['skill_use_rate'][Skill] *
                  Pre_Sim_Node['cross_skill_stat'][Skill][
                    'total_hits'
                  ]) /
                15
              Werebear_Skill_Rate +=
                Pre_Sim_Node['skill_use_rate'][Skill]
            }
          }
          Aspect_Damage_Multiplier *=
            1 +
            aspectVal(nodes_map, 'raw-might-aspect')[0] *
              Math.min(
                1,
                Raw_Might_Rate / (Werebear_Skill_Rate + 0.00001),
              )
        }

        // Aspect of the Unsatiated : After killing an enemy with Shred, your next Werewolf Skill generates x{30/40}% more Spirit and deals x{30/40}% increased damage.
        if (
          aspectVal(nodes_map, 'aspect-of-the-unsatiated').length >
            0 &&
          'shred' in Pre_Sim_Node['skill_use_rate']
        ) {
          const Enemy_Kill_Rate = statVal(
            nodes_map,
            'Enemy_Kill_Rate',
          )
          const Shred_Rate =
            Pre_Sim_Node['skill_use_rate']['shred'] + 0.000001 // to prevent undefined
          let Werewolf_Skills = new Set([
            'claw',
            'shred',
            'lacerate',
            'rabies',
          ])
          const Storm_Skills = new Set([
            'wind-shear',
            'lightning-storm',
            'tornado',
            'hurricane',
            'cataclysm',
          ])

          // Tempest Roar : Lucky Hit: Storm Skills have up to a {15/25}% chance to grant 10.0 Spirit.
          // Your base Storm Skills are now also Werewolf Skills
          if (aspectVal(nodes_map, 'tempest-roar').length > 0) {
            Werewolf_Skills = new Set([
              ...Werewolf_Skills,
              ...Storm_Skills,
            ])
          }

          let Werewolf_Skill_Rate = 0
          for (const Skill in Pre_Sim_Node['skill_use_rate']) {
            if (Werewolf_Skills.has(Skill)) {
              Werewolf_Skill_Rate +=
                Pre_Sim_Node['skill_use_rate'][Skill]
            }
          }

          if (Werewolf_Skill_Rate > 0) {
            const Aspect_Of_The_Unsatiated_Rate =
              Math.min(1, Enemy_Kill_Rate / Shred_Rate) * Shred_Rate
            Aspect_Damage_Multiplier *=
              1 +
              aspectVal(nodes_map, 'aspect-of-the-unsatiated')[1] *
                Math.min(
                  1,
                  Werewolf_Skill_Rate / Aspect_Of_The_Unsatiated_Rate,
                )
          }
        }

        // Vampiric Power bathe-in-blood
        // While Channeling a Skill, you form a pool of blood beneath you. While channeling a skill in a pool, your Channeled Skills deal 40% increased damage and you gain 30% Damage Reduction. A pool can only form once every 8 seconds.
        if (
          vampiricPowerVal(nodes_map, 'bathe-in-blood') &&
          currentSkillVal(nodes_map)['name'] == 'lightning-storm' &&
          'lightning-storm' in Pre_Sim_Node['skill_use_rate']
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
            'earth-spike',
            'wind-shear',
            'storm-strike',
            'maul',
            'claw',
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

        return Aspect_Damage_Multiplier
      },
    ),

    Generic_Talent_Damage_Multiplier: new StatsNode(
      'Generic_Talent_Damage_Multiplier',
      () => {
        let Talent_Damage_Multiplier = 1
        const Pre_Sim_Node = druidPresimVal(nodes_map)
        const number_of_enemies = Number(
          toggleVal(nodes_map, 'number-of-enemies'),
        )
        const enemy_spread = Number(
          statVal(nodes_map, 'Enemy_Spread'),
        )

        // Tears of Blood Glyph
        Talent_Damage_Multiplier *=
          1 + aggregationVal(nodes_map, 'damage-')

        // natures Reach: Deal {['3%', '6%', '9%']} increased damage to Distant enemies. Double this bonus if they are also Slowed, Stunned, Immobilized, or Knocked Back.
        if (toggleVal(nodes_map, 'enemy-distant')) {
          let Natures_Reach_Bonus =
            0.03 * talentVal(nodes_map, 'natures-reach')
          if (
            toggleVal(nodes_map, 'enemy-slowed') ||
            toggleVal(nodes_map, 'enemy-stunned') ||
            toggleVal(nodes_map, 'enemy-immobilized') ||
            toggleVal(nodes_map, 'enemy-knocked-down')
          ) {
            Natures_Reach_Bonus *= 2
          }
          Talent_Damage_Multiplier *= 1 + Natures_Reach_Bonus
        }

        // Glyph: 'spirit' Critical Strikes increase the damage an enemy takes from you by x2% for 20 seconds, up to x12%.
        if (paragonVal(nodes_map, 'spirit')) {
          let Critical_Rate = 0
          for (const Other_Skill in Pre_Sim_Node['skill_use_rate']) {
            Critical_Rate +=
              Pre_Sim_Node['skill_use_rate'][Other_Skill] *
              Pre_Sim_Node['cross_skill_stat'][Other_Skill][
                'critical_chance'
              ]
          }
          if (Critical_Rate * 20 > 1) {
            Talent_Damage_Multiplier *= 1.12
          } else {
            Talent_Damage_Multiplier *=
              1 + 0.02 * Math.min(1, Critical_Rate * 20)
          }
        }

        // Legendary Paragon: 'ancestral-guidance', After spending 75 Spirit, you deal x30% increased damage for 5 seconds.
        if (paragonVal(nodes_map, 'ancestral-guidance')) {
          let Spirit_Cost_Rate = 0
          for (const Other_Skill in Pre_Sim_Node['skill_use_rate']) {
            if (
              Pre_Sim_Node['cross_skill_stat'][Other_Skill][
                'resource_cost'
              ] < 0
            ) {
              Spirit_Cost_Rate +=
                Pre_Sim_Node['skill_use_rate'][Other_Skill] *
                -Pre_Sim_Node['cross_skill_stat'][Other_Skill][
                  'resource_cost'
                ]
            }
          }
          Talent_Damage_Multiplier *=
            1 + 0.3 * Math.min(1, (Spirit_Cost_Rate * 5) / 75)
        }

        // Keystone Talent: ['bestial-rampage', 1] After being a Werewolf for 2 seconds, gain 30% Attack Speed for 15 seconds.
        //                                         After being a Werebear for 2 seconds, deal 30% increased damage for 15 seconds.
        if (talentVal(nodes_map, 'bestial-rampage') > 0) {
          const Werebear_Uptime =
            Pre_Sim_Node['shapeshift_uptime']['werebear']

          // Aspect of the Wildrage : Your Companions gain the bonuses from the Bestial Rampage Key Passive.
          if (
            aspectVal(nodes_map, 'aspect-of-the-wildrage').length >
              0 ||
            !tagsVal(nodes_map).has('companion')
          ) {
            Talent_Damage_Multiplier *=
              1 + 0.3 * Math.min(1, Werebear_Uptime * 6)
          }
        }

        // Talent electric-shock: Bonus damage to Immobilized enemies increased 7/14/21%.
        if (
          talentVal(nodes_map, 'electric-shock') > 0 &&
          toggleVal(nodes_map, 'enemy-immobilized')
        ) {
          Talent_Damage_Multiplier *=
            1 + 0.07 * talentVal(nodes_map, 'electric-shock')
        }

        // Glyph: 'fang-and-claw', While in Werewolf or Werebear form, Close enemies take x12% increased damage from you.
        if (
          paragonVal(nodes_map, 'fang-and-claw') &&
          !toggleVal(nodes_map, 'enemy-distant')
        ) {
          const Werewolf_Uptime =
            Pre_Sim_Node['shapeshift_uptime']['werewolf']
          const Werebear_Uptime =
            Pre_Sim_Node['shapeshift_uptime']['werebear']
          Talent_Damage_Multiplier *=
            1 + 0.12 * Math.min(1, Werewolf_Uptime + Werebear_Uptime)
        }

        // Legendary Paragon 'heightened-malice' While there are 3 or more Poisoned enemies Nearby, you deal x45% increased damage.
        if (
          paragonVal(nodes_map, 'heightened-malice') &&
          toggleVal(nodes_map, 'enemy-poisoned')
        ) {
          let Nearby_Enemies =
            1 +
            (10 ** 2 / statVal(nodes_map, 'Enemy_Spread') ** 2) *
              (number_of_enemies - 1)
          if (toggleVal(nodes_map, 'enemy-distant')) {
            Nearby_Enemies =
              (10 ** 2 / statVal(nodes_map, 'Enemy_Spread') ** 2) *
              number_of_enemies
          }
          if (Nearby_Enemies >= 3) {
            Talent_Damage_Multiplier *= 1.45
          }
        }

        // Glyph 'electrocution', Enemies damaged by your Lightning Bolts or Dancing Bolts take 20%[x] increased damage from you for 5 seconds.
        if (paragonVal(nodes_map, 'electrocution')) {
          let Electrocution_Rate = 0

          if ('lightning-storm' in Pre_Sim_Node['skill_use_rate']) {
            Electrocution_Rate +=
              Pre_Sim_Node['skill_use_rate']['lightning-storm'] *
              Pre_Sim_Node['cross_skill_stat']['lightning-storm'][
                'total_hits'
              ]
            // Lightning dancers Aspect : Lightning Storm Critical Strikes spawn 3.0 Dancing Bolts that seek enemies in the area dealing {70/80%} Lightning damage.
            if (
              aspectVal(nodes_map, 'lightning-dancers-aspect')
                .length > 0
            ) {
              Electrocution_Rate +=
                3 *
                Pre_Sim_Node['skill_use_rate']['lightning-storm'] *
                Pre_Sim_Node['cross_skill_stat']['lightning-storm'][
                  'critical_chance'
                ] *
                Pre_Sim_Node['cross_skill_stat']['lightning-storm'][
                  'total_hits'
                ]
            }
          }

          if ('cataclysm' in Pre_Sim_Node['skill_use_rate']) {
            Electrocution_Rate +=
              Pre_Sim_Node['skill_use_rate']['cataclysm'] *
              Pre_Sim_Node['cross_skill_stat']['cataclysm'][
                'total_hits'
              ]
          }

          // Charged Atmosphere: Every {[14, 11, 8]} seconds, a lightning bolt hits a Nearby enemy dealing 45% damage.
          if (talentVal(nodes_map, 'charged-atmosphere') > 0) {
            Electrocution_Rate +=
              1 /
              (14 - 3 * talentVal(nodes_map, 'charged-atmosphere'))
          }

          if (Electrocution_Rate > 0) {
            Talent_Damage_Multiplier *=
              1 +
              0.2 *
                Math.min(
                  1,
                  (Electrocution_Rate * 5) / number_of_enemies,
                )
          }
        }

        // Keystone Talent ['ursine-strength', 1], // While Healthy, deal 25% (multiplicative damage) [x] increased damage, and 25%[x] increased Overpower damage.
        // Gain 20%[x] additional Maximum Life while in Werebear form and for 3 seconds after leaving Werebear form.
        if (
          talentVal(nodes_map, 'ursine-strength') > 0 &&
          Number(toggleVal(nodes_map, 'percent-life')) >= 0.8
        ) {
          Talent_Damage_Multiplier *= 1.25
        }

        return Talent_Damage_Multiplier
      },
    ),

    Skill_Talent_Damage_Multiplier: new StatsNode(
      'Skill_Talent_Damage_Multiplier',
      () => {
        let Talent_Damage_Multiplier = 1

        const Pre_Sim_Node = druidPresimVal(nodes_map)

        // Supreme Lacerate: Lacerate's initial strike is guaranteed to Critically Strike and deals 150% increased damage.
        if (
          currentSkillVal(nodes_map)['name'] == 'lacerate' &&
          talentVal(nodes_map, 'supreme-lacerate') > 0
        ) {
          Talent_Damage_Multiplier *= 1.05
        }

        // Wild Impulses: Your Core Skills cost {['3%', '6%', '9%']} more Spirit but deal {['5%', '10%', '15%']}  increased damage.
        if (tagsVal(nodes_map).has('core')) {
          Talent_Damage_Multiplier *=
            1 + 0.05 * talentVal(nodes_map, 'wild-impulses')
        }

        // Crushing Earth: Earth Skills deal {['5%', '10%', '15%']} increased damage to Slowed, Stunned, Immobilized or Knocked Back enemies.
        if (currentSkillVal(nodes_map)['tags'].has('earth')) {
          Talent_Damage_Multiplier *=
            1 +
            0.05 *
              talentVal(nodes_map, 'crushing-earth') *
              Number(
                toggleVal(nodes_map, 'enemy-slowed') ||
                  toggleVal(nodes_map, 'enemy-stunned') ||
                  toggleVal(nodes_map, 'enemy-immobilized') ||
                  toggleVal(nodes_map, 'enemy-knocked-down'),
              )
        }

        // Defiance: Nature Magic Skills deal {['4%', '8%', '12%']} increased damage to Elites.
        if (
          tagsVal(nodes_map).has('nature-magic') &&
          toggleVal(nodes_map, 'enemy-elite')
        ) {
          Talent_Damage_Multiplier *=
            1 + 0.04 * talentVal(nodes_map, 'defiance')
        }

        // Lupine Ferocity: Every 6th Werewolf Skill hit Critically Strikes and deals 140% increased damage.
        if (
          tagsVal(nodes_map).has('werewolf') &&
          talentVal(nodes_map, 'lupine-ferocity') > 0
        ) {
          // Average the bonus across all hits.
          Talent_Damage_Multiplier +=
            1 + (1.4 / 6) * statVal(nodes_map, 'Total_Hits')
        }

        // Natural Disaster: Your Earth Skills deal {['4%', '8%', '12%']} increased damage to Vulnerable enemies.
        if (
          tagsVal(nodes_map).has('earth') &&
          statVal(nodes_map, 'Enemy_Vulnerable') > 0
        ) {
          Talent_Damage_Multiplier *=
            1 +
            0.04 *
              talentVal(nodes_map, 'natural-disaster') *
              statVal(nodes_map, 'Enemy_Vulnerable')
        }

        // Perfect Storm: Your Storm Skills grant 1 Spirit and deal 15% increased damage when damaging a Vulnerable, Immobilized or Slowed enemy.
        if (
          tagsVal(nodes_map).has('storm') &&
          (statVal(nodes_map, 'Enemy_Vulnerable') > 0 ||
            toggleVal(nodes_map, 'enemy-immobilized') ||
            toggleVal(nodes_map, 'enemy-slowed'))
        ) {
          if (
            toggleVal(nodes_map, 'enemy-immobilized') ||
            toggleVal(nodes_map, 'enemy-slowed')
          ) {
            Talent_Damage_Multiplier *=
              1 + 0.15 * talentVal(nodes_map, 'perfect-storm')
          } else {
            Talent_Damage_Multiplier *=
              1 + 0.15 * statVal(nodes_map, 'Enemy_Vulnerable')
          }
        }

        // Stone Guard: While you have Fortify for over 50% of your Maximum Life, your Earth Skills deal {['4%', '8%', '12%']} increased damage.
        if (
          Number(toggleVal(nodes_map, 'percent-fortify')) > 0.5 &&
          tagsVal(nodes_map).has('earth')
        ) {
          Talent_Damage_Multiplier *=
            1 + 0.04 * talentVal(nodes_map, 'stone-guard')
        }

        if (
          currentSkillVal(nodes_map)['name'] == 'rabies' &&
          tagsVal(nodes_map).has('poison')
        ) {
          // Enhanced Rabies: Rabies' Poisoning damage also increases over the lifetime of the disease, dealing 60% bonus damage at max duration.
          Talent_Damage_Multiplier *=
            1 + 0.3 * talentVal(nodes_map, 'enhanced-rabies')
        }

        // Enhanced Wolves: Wolves deal 25% increased damage to Immobilized, Stunned, Slowed, or Poisoned enemies.
        const enhanced_wolves_multiplier =
          1 +
          0.25 *
            Number(
              toggleVal(nodes_map, 'enemy-immobilized') ||
                toggleVal(nodes_map, 'enemy-stunned') ||
                toggleVal(nodes_map, 'enemy-slowed') ||
                toggleVal(nodes_map, 'enemy-poisoned'),
            ) *
            Number(talentVal(nodes_map, 'enhanced-wolves'))
        if (currentSkillVal(nodes_map)['name'] == 'wolves') {
          Talent_Damage_Multiplier *= enhanced_wolves_multiplier
        }

        // Earth and Sky: Nature Magic Skills deal x10% increased damage to Crowd Controlled or Vulnerable enemies.
        if (
          paragonVal(nodes_map, 'earth-and-sky') &&
          (statVal(nodes_map, 'Enemy_Crowd_Controlled') ||
            statVal(nodes_map, 'Enemy_Vulnerable') > 0) &&
          tagsVal(nodes_map).has('nature-magic')
        ) {
          if (statVal(nodes_map, 'Enemy_Crowd_Controlled')) {
            Talent_Damage_Multiplier *=
              1 + 0.1 * statVal(nodes_map, 'Enemy_Crowd_Controlled')
          } else {
            Talent_Damage_Multiplier *=
              1 + 0.1 * statVal(nodes_map, 'Enemy_Vulnerable')
          }
        }

        // Talent ['resonance', 3], // Nature Magic Skills deal {['2%', '4%', '6%']} increased damage.
        if (
          // Triple this bonus if an Earth Skill is the next Skill cast after a Storm Skill, or a Storm Skill is the next Skill cast after an Earth Skill.

          talentVal(nodes_map, 'resonance') > 0 &&
          tagsVal(nodes_map).has('nature-magic')
        ) {
          const Resonance_Bonus =
            0.02 * talentVal(nodes_map, 'resonance')
          const Earth_Skills = new Set([
            'earth-spike',
            'landslide',
            'boulder',
            'petrify',
          ])
          const Storm_Skills = new Set([
            'wind-shear',
            'lightning-storm',
            'tornado',
            'hurricane',
            'cataclysm',
          ])
          let Earth_Skill_Rate = 0
          let Storm_Skill_Rate = 0
          for (const Other_Skill in Pre_Sim_Node['skill_use_rate']) {
            if (Earth_Skills.has(Other_Skill)) {
              Earth_Skill_Rate +=
                Pre_Sim_Node['skill_use_rate'][Other_Skill]
            }
            if (Storm_Skills.has(Other_Skill)) {
              Storm_Skill_Rate +=
                Pre_Sim_Node['skill_use_rate'][Other_Skill]
            }
          }
          if (
            tagsVal(nodes_map).has('earth') &&
            Earth_Skill_Rate > 0
          ) {
            Talent_Damage_Multiplier *=
              1 +
              Resonance_Bonus +
              2 *
                Resonance_Bonus *
                Math.min(
                  1,
                  Storm_Skill_Rate /
                    (Earth_Skill_Rate + Storm_Skill_Rate),
                )
          }
          if (
            tagsVal(nodes_map).has('storm') &&
            Storm_Skill_Rate > 0
          ) {
            Talent_Damage_Multiplier *=
              1 +
              Resonance_Bonus +
              2 *
                Resonance_Bonus *
                Math.min(
                  1,
                  Earth_Skill_Rate /
                    (Earth_Skill_Rate + Storm_Skill_Rate),
                )
          }
        }

        // Talent: ['quickshift', 3], When a Shapeshifting Skill transforms you into a different form, it deals {['5%', '10%', '15%']} increased damage.
        if (talentVal(nodes_map, 'quickshift') > 0) {
          const Shapeshift_Swap_Rate =
            Pre_Sim_Node['shapeshift_swap_rate']['werewolf'] +
            Pre_Sim_Node['shapeshift_swap_rate']['werebear'] +
            Pre_Sim_Node['shapeshift_swap_rate']['human']
          let Skill_Use_Rate_Total = 0
          for (const Other_Skill in Pre_Sim_Node['skill_use_rate']) {
            Skill_Use_Rate_Total +=
              Pre_Sim_Node['skill_use_rate'][Other_Skill]
          }
          Talent_Damage_Multiplier *=
            1 +
            0.05 *
              talentVal(nodes_map, 'quickshift') *
              Math.min(
                1,
                Shapeshift_Swap_Rate /
                  (Skill_Use_Rate_Total + 0.00001),
              )
        }

        // Innate Earthen Bulwark: Rock shrapnel flies outward when Earthen Bulwark is destroyed or expires, dealing [X] damage to surrounding enemies. This damage is increased by Barrier bonuses.
        if (
          currentSkillVal(nodes_map)['name'] == 'earthen-bulwark' &&
          talentVal(nodes_map, 'innate-earthen-bulwark') > 0
        ) {
          Talent_Damage_Multiplier *=
            1 + aggregationVal(nodes_map, 'barrier-generation')
        }

        return Talent_Damage_Multiplier
      },
    ),

    Hits_Multiplier: new StatsNode('Hits_Multiplier', () => {
      const number_of_enemies = Number(
        toggleVal(nodes_map, 'number-of-enemies'),
      )
      const Pre_Sim_Node = druidPresimVal(nodes_map)
      const enemy_spread = Number(statVal(nodes_map, 'Enemy_Spread'))

      let Aggregate_Hits
      let Hits_Multiplier = 1
      let hit_1
      let hit_2
      let hit_3
      let maul_range
      let maul_radius
      let Number_Of_Cast
      let p

      switch (currentSkillVal(nodes_map)['name']) {
        // Claw: Shapeshift into a Werewolf and claw at an enemy for {['20%', '22%', '24%', '26%', '28%']} damage.
        case 'claw':
          Hits_Multiplier =
            1 +
            ProbabilityInCone(10, 1 / 3, enemy_spread) *
              (number_of_enemies - 1)
          // Wild Claw: Claw has a 15% chance to attack twice.
          if (talentVal(nodes_map, 'wild-claw') > 0) {
            Hits_Multiplier *= 1.15
          }
          break

        //Earth Spike: Sunder the earth, impaling the first enemy hit for {['16%', '18%', '19%', '21%', '22%']} damage.
        case 'earth-spike':
          Hits_Multiplier =
            1 +
            ProbabilityInCone(15, 1 / 8, enemy_spread) *
              (number_of_enemies - 1)
          // Seismic-shift Aspect : Earth Spike launches spikes in a line and has a {1 - 2} second Cooldown.
          if (
            aspectVal(nodes_map, 'seismic-shift-aspect').length > 0
          ) {
            Hits_Multiplier +=
              ProbabilityIntersectingLineInCircle(
                10,
                60,
                enemy_spread,
              ) *
              (number_of_enemies - 1)
          }
          // Wild Earth Spike: Summon a second Earth Spike when hitting an Immobilized or Stunned enemy.
          if (
            currentSkillVal(nodes_map)['name'] == 'earth-spike' &&
            talentVal(nodes_map, 'wild-earth-spike') &&
            (toggleVal(nodes_map, 'enemy-immobilized') ||
              toggleVal(nodes_map, 'enemy-stunned'))
          ) {
            Hits_Multiplier *= 2
          }
          break

        // Maul: Shapeshift into a Werebear and maul enemies in front of you, dealing {['20%', '22%', '24%', '26%', '28%']} damage.
        case 'maul':
          maul_range = 10
          maul_radius = 1 / 3
          // Fierce Maul: Increases the range and radius of Maul by 25%
          if (talentVal(nodes_map, 'fierce-maul') > 0) {
            maul_range *= 1.25
            maul_radius *= 1.25
          }
          Hits_Multiplier =
            1 +
            ProbabilityInCone(maul_range, maul_radius, enemy_spread) *
              (number_of_enemies - 1)
          break

        // Storm Strike: Electricity gathers around your weapon, dealing {['20%', '22%', '24%', '26%', '28%']} damage to your target and chaining to up to 3 surrounding enemies, dealing 20% less damage each time it chains.
        case 'storm-strike':
          p = Math.min(15 ** 2 / enemy_spread ** 2, 1)
          Hits_Multiplier =
            BinomialProbability(number_of_enemies - 1, p, 0) +
            BinomialProbability(number_of_enemies - 1, p, 1) * 1.8 +
            (1 - BinomialDistribution(number_of_enemies - 1, p, 1)) *
              (1 + 0.8 + 0.8 ** 2)
          // Wild Storm Strike: Storm Strike chains to 2 additional targets.
          if (talentVal(nodes_map, 'wild-storm-strike') > 0) {
            Hits_Multiplier =
              BinomialProbability(number_of_enemies - 1, p, 0) +
              BinomialProbability(number_of_enemies - 1, p, 1) *
                (1 + 0.8) +
              BinomialProbability(number_of_enemies - 1, p, 2) *
                (1 + 0.8 + 0.8 ** 2) +
              BinomialProbability(number_of_enemies - 1, p, 3) *
                (1 + 0.8 + 0.8 ** 2 + 0.8 ** 3) +
              (1 -
                BinomialDistribution(number_of_enemies - 1, p, 3)) *
                (1 + 0.8 + 0.8 ** 2 + 0.8 ** 3 + 0.8 ** 4)
          }
          if (number_of_enemies == 1) {
            Hits_Multiplier = 1
          }
          break

        case 'wind-shear':
          Hits_Multiplier =
            1 +
            ProbabilityIntersectingLineInCircle(
              10,
              60,
              enemy_spread,
            ) *
              (number_of_enemies - 1)
          break

        //Landslide: Crush enemies between 2 pillars of earth, dealing up to 75% damage.
        case 'landslide':
          Hits_Multiplier =
            1 +
            Math.min(10 ** 2 / enemy_spread ** 2, 1) *
              (number_of_enemies - 1)
          // Raging Landslide: When you strike an Immobilized or Stunned enemy with Landslide, an additional pillar of earth is formed.
          if (
            talentVal(nodes_map, 'raging-landslide') > 0 &&
            (toggleVal(nodes_map, 'enemy-immobilized') ||
              toggleVal(nodes_map, 'enemy-stunned'))
          ) {
            Hits_Multiplier *= 2
          }
          // Aspect of The Aftershock : Landslide's earth pillars each strike a second time and deal an additional {6/12}% bonus damage per hit.
          if (
            aspectVal(nodes_map, 'aspect-of-the-aftershock').length >
            0
          ) {
            Hits_Multiplier *=
              2 + aspectVal(nodes_map, 'aspect-of-the-aftershock')[0]
          }
          break

        // Lightning Storm Conjure a growing lightning storm that deals {['25%', '28%', '30%', '32%', '35%']} damage per strike and increases the number of strikes the longer it is channeled up to a maximum of 5.
        case 'lightning-storm':
          Number_Of_Cast = statVal(nodes_map, 'Number_Of_Cast')
          // We model the hits in the following way.
          //  - If the enemy is not elite, then the first bolt hits the target and the others hit random circles of melee radius (5 yards).
          //  - If the enemy is elite, then the first two bolts hit the target and the others hit random circles of melee radius.
          //  - If the enemy is a boss, then the first three bolts hit the target and the others hit random circles of melee radius.
          Aggregate_Hits = 0
          for (let i = 0; i < Number_Of_Cast; i++) {
            // With more bolts they spread out more, so assume they are at 5 * number_of_bolts yards.
            // Raging Lightning Storm: Lightning Storm gains 1 additional lightning strike.
            const number_of_bolts =
              Math.min(i + 1, 5) +
              talentVal(nodes_map, 'raging-lightning-storm')
            if (
              !toggleVal(nodes_map, 'enemy-elite') &&
              !toggleVal(nodes_map, 'enemy-boss')
            ) {
              Aggregate_Hits +=
                1 +
                Math.max(number_of_bolts - 1, 0) *
                  ProbabilityInCircle(
                    5 * number_of_bolts,
                    10,
                    enemy_spread,
                  ) *
                  (number_of_enemies - 1)
            } else if (
              toggleVal(nodes_map, 'enemy-elite') &&
              !toggleVal(nodes_map, 'enemy-boss')
            ) {
              Aggregate_Hits +=
                2 +
                Math.max(number_of_bolts - 2, 0) *
                  ProbabilityInCircle(
                    5 * number_of_bolts,
                    10,
                    enemy_spread,
                  ) *
                  (number_of_enemies - 2)
            } else {
              Aggregate_Hits +=
                3 +
                Math.max(number_of_bolts - 3, 0) *
                  ProbabilityInCircle(
                    5 * number_of_bolts,
                    10,
                    enemy_spread,
                  ) *
                  (number_of_enemies - 2)
            }
            // The Hits_Multiplier is the average per GCD.
            Hits_Multiplier = Aggregate_Hits / Number_Of_Cast
          }
          break

        // Pulverize: Shapeshift into a Werebear and slam the ground, dealing {['50%', '55%', '60%', '65%', '70%']} damage to surrounding enemies.
        case 'pulverize':
          Hits_Multiplier =
            1 +
            Math.min(10 ** 2 / enemy_spread ** 2, 1) *
              (number_of_enemies - 1)
          if (aspectVal(nodes_map, 'shockwave-aspect').length > 0) {
            // Shockwave Aspect : Pulverize creates a shockwave that travels forward, dealing {60/100}% of its damage to targets in the path.
            Hits_Multiplier +=
              aspectVal(nodes_map, 'shockwave-aspect')[0] *
              (1 +
                ProbabilityIntersectingLineInCircle(
                  10,
                  60,
                  enemy_spread,
                ) *
                  (number_of_enemies - 1))
          }
          break
        // Shred: Shapeshift into a Werewolf and perform a trio of combo attacks:
        // 1st Attack 25% Damage, 2nd Attack 35% Damage, 3rd Attack 75% Damage with larger cleave
        case 'shred':
          hit_1 =
            1 +
            ProbabilityInCone(10, 1 / 3, enemy_spread) *
              (number_of_enemies - 1)
          hit_2 =
            1 +
            ProbabilityInCone(10, 1 / 3, enemy_spread) *
              (number_of_enemies - 1)
          hit_3 =
            1 +
            ProbabilityInCone(10, 1 / 2, enemy_spread) *
              (number_of_enemies - 1)

          // Hit 1 is the Dash
          // Aspect of the Blurred Beast : While dashing, Shred seeks out Nearby Poisoned enemies deals [20/40%] increased damage to them.
          if (
            aspectVal(nodes_map, 'aspect-of-the-blurred-beast')
              .length > 0 &&
            toggleVal(nodes_map, 'enemy-poisoned')
          ) {
            hit_1 =
              (1 +
                ProbabilityInCircle(0, 10, enemy_spread) *
                  (number_of_enemies - 1)) *
              (1 +
                aspectVal(
                  nodes_map,
                  'aspect-of-the-blurred-beast',
                )[0])
          }

          Hits_Multiplier =
            (0.25 * hit_1 + 0.35 * hit_2 + 0.75 * hit_3) /
            (0.25 + 0.35 + 0.75)

          break

        // Tornado: Conjure a swirling tornado that deals {['35%', '39%', '42%', '46%', '49%']} damage.
        case 'tornado':
          // Assume for now that it shoots forward in a line for 40 yards. Really it moves around but that's harder to model.
          Hits_Multiplier =
            1 +
            ProbabilityInCone(40, 1 / 8, enemy_spread) *
              (number_of_enemies - 1)

          // stormchasers Aspect : Tornado will seek up to {1/3} targets.
          if (
            aspectVal(nodes_map, 'stormchasers-aspect').length > 0
          ) {
            Hits_Multiplier =
              1 +
              aspectVal(nodes_map, 'stormchasers-aspect')[0] +
              ProbabilityInCone(40, 1 / 6, enemy_spread) *
                (number_of_enemies - 1)
          }

          // Enhanced Tornado: Each time you cast Tornado, you have a 20% chance to spawn an additional Tornado.
          if (
            currentSkillVal(nodes_map)['name'] == 'tornado' &&
            talentVal(nodes_map, 'enhanced-tornado') > 0
          ) {
            Hits_Multiplier *= 1.2
          }

          break

        // Cyclone Armor: Winds expand knocking back enemies and dealing {30%} damage.
        case 'cyclone-armor':
          Hits_Multiplier =
            1 +
            Math.min(15 ** 2 / enemy_spread ** 2, 1) *
              (number_of_enemies - 1)
          break

        // Ravens: The target area is swarmed with ravens dealing {250%} damage over 6 seconds.
        case 'ravens':
          Hits_Multiplier =
            1 +
            Math.min(10 ** 2 / enemy_spread ** 2, 1) *
              (number_of_enemies - 1)
          break

        case 'wolves':
          {
            let Number_Of_Wolves = 2

            // Aspect of the Stampede : Gain 1 additional Companion. In addition, your Companion Skills deal x{100/150}% bonus damage.
            if (
              aspectVal(nodes_map, 'aspect-of-the-stampede').length >
              0
            ) {
              Number_Of_Wolves += 1
            }

            Hits_Multiplier = Number_Of_Wolves
            // storms Companion : Your Wolf Companions are infused with the power of the storm, dealing Lightning damage and gaining the Storm Howl ability.
            if (aspectVal(nodes_map, 'storms-companion').length > 0) {
              let Enemy_Distance = 10
              if (toggleVal(nodes_map, 'enemy-distant')) {
                Enemy_Distance = Math.min(
                  25,
                  statVal(nodes_map, 'Enemy_Spread'),
                )
              }
              Hits_Multiplier =
                Number_Of_Wolves *
                (1 +
                  ProbabilityInCircle(
                    Enemy_Distance,
                    10,
                    statVal(nodes_map, 'Enemy_Spread'),
                  ) *
                    (number_of_enemies - 1))
            }
          }
          break
        // poison creeper: Vines strangle all surrounding enimies, immobilizing them for 2 seconds and Poisoning them for {45} damage over 2 seconds.
        case 'poison-creeper':
          Hits_Multiplier =
            1 +
            Math.min(15 ** 2 / enemy_spread ** 2, 1) *
              (number_of_enemies - 1)
          break

        // Boulder: Unearth a large rolling boulder that Knocks Back and crushes enemies, dealing {['33%', '36%', '40%', '43%', '46%']} damage with each hit.
        case 'boulder':
          Hits_Multiplier =
            1 +
            ProbabilityIntersectingLineInCircle(
              15,
              60,
              statVal(nodes_map, 'Enemy_Spread'),
            ) *
              (number_of_enemies - 1)

          // Dolmen Stone (Druid Unique Amulet): Casting Boulder while Hurricane is active will cause your boulders to rotate around you.
          if (
            aspectVal(nodes_map, 'dolmen-stone').length > 0 &&
            'hurricane' in Pre_Sim_Node['skill_use_rate']
          ) {
            const Hurricane_Uptime = Math.min(
              1,
              (1 / Pre_Sim_Node['skill_use_rate']['hurricane']) * 8,
            )

            let Multiple_Boulder_Multiplier = 1

            // If Cooldown is less than 8, multiple boulders can be active at once during a hurricane
            if (statVal(nodes_map, 'Cooldown') < 8) {
              Multiple_Boulder_Multiplier +=
                (8 - statVal(nodes_map, 'Cooldown')) / 8 +
                Math.max(0, (4 - statVal(nodes_map, 'Cooldown')) / 4)
            }

            Hits_Multiplier =
              (1 - Hurricane_Uptime) *
                (1 +
                  ProbabilityIntersectingLineInCircle(
                    15,
                    60,
                    statVal(nodes_map, 'Enemy_Spread'),
                  ) *
                    (number_of_enemies - 1)) +
              Hurricane_Uptime *
                Multiple_Boulder_Multiplier *
                3 *
                (1 +
                  Math.min(
                    1,
                    15 ** 2 / statVal(nodes_map, 'Enemy_Spread') ** 2,
                  ) *
                    number_of_enemies -
                  1)
          }
          break

        // Hurricane: Form a hurricane around you that deals {['97%', '107%', '117%', '127%', '136%']} damage to surrounding enemies over 8 seconds.
        case 'hurricane':
          Hits_Multiplier =
            1 +
            Math.min(15 ** 2 / enemy_spread ** 2, 1) *
              (number_of_enemies - 1)
          // Endless Tempest: Increase the duration of Hurricane and Cataclysm by {['5%', '10%', '15%']} .
          Hits_Multiplier *=
            1 + talentVal(nodes_map, 'endless-tempest') * 0.05
          // Aspect of the Tempest : Hurricane damage is increased by x{7/15}% each second while active.
          if (
            aspectVal(nodes_map, 'aspect-of-the-tempest').length > 0
          ) {
            const Hurricane_Duration =
              8 * (1 + talentVal(nodes_map, 'endless-tempest') * 0.05)
            Hits_Multiplier *=
              1 +
              (aspectVal(nodes_map, 'aspect-of-the-tempest')[0] *
                (Hurricane_Duration - 1)) /
                2
          }
          break

        // Trample: Shapeshift into a Werebear, become Unstoppable, and charge forward, dealing {['25%', '28%', '30%', '32%', '35%']} damage and Knocking Back enemies.
        case 'trample':
          Hits_Multiplier =
            1 +
            ProbabilityIntersectingLineInCircle(
              20,
              30,
              enemy_spread,
            ) *
              (number_of_enemies - 1)
          // Enhanced Trample: Trample deals 150% bonus damage. This bonus is reduced by 50% for each enemy hit after the first.
          if (talentVal(nodes_map, 'enhanced-trample') > 0) {
            Hits_Multiplier = 2.5
            p = ProbabilityIntersectingLineInCircle(
              20,
              30,
              enemy_spread,
            )
            for (let i = 1; i < number_of_enemies; i++) {
              // The ith enemy is hit when at least i enemies are hit (duh). We add the damage they take to the multiplier times that probability.
              Hits_Multiplier +=
                Math.max(2.5 - 0.5 * i, 1) *
                (1 -
                  BinomialDistribution(
                    number_of_enemies - 1,
                    p,
                    i - 1,
                  ))
            }
          }
          break

        // Cataclysm: A massive storm follows you for 8 seconds. Tornadoes Knock Back enemies, and lightning strikes wildly dealing 52% damage.
        case 'cataclysm':
          // (TODO) Figure out how this works. For now just assume it hits a target every second.
          Hits_Multiplier = 8
          // Prime Cataclysm Cataclysm's duration is increased by  4 seconds.
          if (talentVal(nodes_map, 'prime-cataclysm') > 0) {
            Hits_Multiplier += 4
          }
          // Endless Tempest: Increase the duration of Hurricane and Cataclysm by {['5%', '10%', '15%']} .
          if (talentVal(nodes_map, 'endless-tempest') > 0) {
            Hits_Multiplier *=
              1 + talentVal(nodes_map, 'endless-tempest') * 0.05
          }
          // Calamity: Extend the duration of Ultimate Skills by 25%.
          if (spiritBoonVal(nodes_map)['wolf'].includes('calamity')) {
            Hits_Multiplier *= 1.25
          }
          break

        // Lacerate: Shapeshift into a Werewolf, become Immune and quickly dash 10 times between enemies in the area dealing up to 400% damage.
        case 'lacerate':
          // (TODO) Figure out how this works. For assume it does 10 hits over 2 gcd. So 5 hits per gcd.
          Hits_Multiplier = 5
          // Calamity: Extend the duration of Ultimate Skills by 25%.
          if (spiritBoonVal(nodes_map)['wolf'].includes('calamity')) {
            Hits_Multiplier *= 1.25
          }
          break

        case 'earthen-bulwark':
          if (talentVal(nodes_map, 'innate-earthen-bulwark') > 0) {
            Hits_Multiplier = Math.min(15 ** 2 / enemy_spread ** 2)
          }
          break

        default:
          break
      }

      return Hits_Multiplier
    }),

    // Almost the same as Hits_Multiplier, but this should track the track the quantity of hits not a damage multiplier which could be different.
    Total_Hits: new StatsNode('Total_Hits', () => {
      const number_of_enemies = Number(
        toggleVal(nodes_map, 'number-of-enemies'),
      )
      const Pre_Sim_Node = druidPresimVal(nodes_map)
      const enemy_spread = Number(statVal(nodes_map, 'Enemy_Spread'))

      const Attack_Speed = statVal(nodes_map, 'Total_Attack_Speed')

      let Aggregate_Hits
      let hit_1
      let hit_2
      let hit_3
      let Number_of_Hits = 1
      let Number_Of_Cast
      let maul_range
      let maul_radius
      let p

      switch (currentSkillVal(nodes_map)['name']) {
        // Claw: Shapeshift into a Werewolf and claw at an enemy for {['20%', '22%', '24%', '26%', '28%']} damage.
        case 'claw':
          Number_of_Hits =
            1 +
            ProbabilityInCone(10, 1 / 3, enemy_spread) *
              (number_of_enemies - 1)
          // Wild Claw: Claw has a 15% chance to attack twice.
          if (talentVal(nodes_map, 'wild-claw') > 0) {
            Number_of_Hits *= 1.15
          }
          break

        //Earth Spike: Sunder the earth, impaling the first enemy hit for {['16%', '18%', '19%', '21%', '22%']} damage.
        case 'earth-spike':
          Number_of_Hits =
            1 +
            ProbabilityInCone(15, 1 / 8, enemy_spread) *
              (number_of_enemies - 1)
          // Seismic-shift Aspect : Earth Spike launches spikes in a line and has a {1.5/2.5} second Cooldown.
          if (
            aspectVal(nodes_map, 'seismic-shift-aspect').length > 0
          ) {
            Number_of_Hits +=
              ProbabilityIntersectingLineInCircle(
                10,
                60,
                enemy_spread,
              ) *
              (number_of_enemies - 1)
          }
          // Wild Earth Spike: Summon a second Earth Spike when hitting an Immobilized or Stunned enemy.
          if (
            currentSkillVal(nodes_map)['name'] == 'earth-spike' &&
            talentVal(nodes_map, 'wild-earth-spike') &&
            (toggleVal(nodes_map, 'enemy-immobilized') ||
              toggleVal(nodes_map, 'enemy-stunned'))
          ) {
            Number_of_Hits *= 2
          }
          break

        // Maul: Shapeshift into a Werebear and maul enemies in front of you, dealing {['20%', '22%', '24%', '26%', '28%']} damage.
        case 'maul':
          maul_range = 10
          maul_radius = 1 / 3
          // Fierce Maul: Increases the range and radius of Maul by 30%
          if (talentVal(nodes_map, 'fierce-maul') > 0) {
            maul_range *= 1.3
            maul_radius *= 1.3
          }
          Number_of_Hits =
            1 +
            ProbabilityInCone(maul_range, maul_radius, enemy_spread) *
              (number_of_enemies - 1)
          break

        // Storm Strike: Electricity gathers around your weapon, dealing {['20%', '22%', '24%', '26%', '28%']} damage to your target and chaining to up to 3 surrounding enemies, dealing 20% less damage each time it chains.
        case 'storm-strike':
          p = Math.min(15 ** 2 / enemy_spread ** 2, 1)
          Number_of_Hits =
            BinomialProbability(number_of_enemies - 1, p, 0) +
            BinomialProbability(number_of_enemies - 1, p, 1) * 2 +
            (1 - BinomialDistribution(number_of_enemies - 1, p, 1)) *
              3

          // Wild Storm Strike: Storm Strike chains to 2 additional targets.
          if (talentVal(nodes_map, 'wild-storm-strike') > 0) {
            Number_of_Hits =
              BinomialProbability(number_of_enemies - 1, p, 0) +
              BinomialProbability(number_of_enemies - 1, p, 1) * 2 +
              BinomialProbability(number_of_enemies - 1, p, 2) * 3 +
              BinomialProbability(number_of_enemies - 1, p, 3) * 4 +
              (1 -
                BinomialDistribution(number_of_enemies - 1, p, 3)) *
                5
          }
          break

        case 'wind-shear':
          Number_of_Hits =
            1 +
            ProbabilityIntersectingLineInCircle(
              10,
              60,
              enemy_spread,
            ) *
              (number_of_enemies - 1)
          break

        // Landslide: Crush enemies between 2 pillars of earth, dealing up to {['113%', '124%', '135%', '146%', '157%']} damage.
        case 'landslide':
          Number_of_Hits =
            1 +
            Math.min(10 ** 2 / enemy_spread ** 2, 1) *
              (number_of_enemies - 1)
          // Raging Landslide: When you strike an Immobilized or Stunned enemy with Landslide, an additional pillar of earth is formed.
          if (
            talentVal(nodes_map, 'wild-earth-spike') > 0 &&
            (toggleVal(nodes_map, 'enemy-immobilized') ||
              toggleVal(nodes_map, 'enemy-stunned'))
          ) {
            Number_of_Hits *= 2
          }

          // Aspect of The Aftershock : Landslide's earth pillars each strike a second time and deal an additional {6/12}% bonus damage per hit.
          if (
            aspectVal(nodes_map, 'aspect-of-the-aftershock').length >
            0
          ) {
            Number_of_Hits *= 2
          }
          break

        // Lightning Storm Conjure a growing lightning storm that deals {['25%', '28%', '30%', '32%', '35%']} damage per strike and increases the number of strikes the longer it is channeled up to a maximum of 5.
        case 'lightning-storm':
          Number_Of_Cast = statVal(nodes_map, 'Number_Of_Cast')
          // We model the hits in the following way.
          //  - If the enemy is not elite, then the first bolt hits the target and the others hit random circles of melee radius (5 yards).
          //  - If the enemy is elite, then the first two bolts hit the target and the others hit random circles of melee radius.
          //  - If the enemy is a boss, then the first three bolts hit the target and the others hit random circles of melee radius.
          Aggregate_Hits = 0
          for (let i = 0; i < Number_Of_Cast; i++) {
            // With more bolts they spread out more, so assume they are at 5 * number_of_bolts yards.
            // Raging Lightning Storm: Lightning Storm gains 1 additional lightning strike.
            const number_of_bolts =
              Math.min(i + 1, 5) +
              talentVal(nodes_map, 'raging-lightning-storm')
            if (
              !toggleVal(nodes_map, 'enemy-elite') &&
              !toggleVal(nodes_map, 'enemy-boss')
            ) {
              Aggregate_Hits +=
                1 +
                Math.max(number_of_bolts - 1, 0) *
                  ProbabilityInCircle(
                    5 * number_of_bolts,
                    10,
                    enemy_spread,
                  ) *
                  (number_of_enemies - 1)
            } else if (
              toggleVal(nodes_map, 'enemy-elite') &&
              !toggleVal(nodes_map, 'enemy-boss')
            ) {
              Aggregate_Hits +=
                2 +
                Math.max(number_of_bolts - 2, 0) *
                  ProbabilityInCircle(
                    5 * number_of_bolts,
                    10,
                    enemy_spread,
                  ) *
                  (number_of_enemies - 2)
            } else {
              Aggregate_Hits +=
                3 +
                Math.max(number_of_bolts - 3, 0) *
                  ProbabilityInCircle(
                    5 * number_of_bolts,
                    10,
                    enemy_spread,
                  ) *
                  (number_of_enemies - 2)
            }
            // The Hits_Multiplier is the average per GCD.
            Number_of_Hits = Aggregate_Hits / Number_Of_Cast
          }
          break

        // Pulverize: Shapeshift into a Werebear and slam the ground, dealing {['50%', '55%', '60%', '65%', '70%']} damage to surrounding enemies.
        case 'pulverize':
          Number_of_Hits =
            1 +
            Math.min(10 ** 2 / enemy_spread ** 2, 1) *
              (number_of_enemies - 1)
          // Shockwave Aspect : Pulverize creates a shockwave that travels forward, dealing {90/130}% of its damage to targets in the path.
          if (aspectVal(nodes_map, 'shockwave-aspect').length > 0) {
            Number_of_Hits +=
              aspectVal(nodes_map, 'shockwave-aspect')[0] *
              (1 +
                ProbabilityIntersectingLineInCircle(
                  10,
                  60,
                  enemy_spread,
                ) *
                  (number_of_enemies - 1))
          }
          break

        // Shred: Shapeshift into a Werewolf and perform a trio of combo attacks:
        case 'shred':
          hit_1 =
            1 +
            ProbabilityInCone(10, 1 / 3, enemy_spread) *
              (number_of_enemies - 1)
          hit_2 =
            1 +
            ProbabilityInCone(10, 1 / 3, enemy_spread) *
              (number_of_enemies - 1)
          hit_3 =
            1 +
            ProbabilityInCone(10, 1 / 2, enemy_spread) *
              (number_of_enemies - 1)

          Number_of_Hits = hit_1 + hit_2 + hit_3
          break

        // Tornado: Conjure a swirling tornado that deals {['35%', '39%', '42%', '46%', '49%']} damage.
        case 'tornado':
          Number_of_Hits =
            1 +
            ProbabilityInCone(40, 1 / 8, enemy_spread) *
              (number_of_enemies - 1)

          // stormchasers Aspect : Tornado will seek up to {1/3} targets.
          if (
            aspectVal(nodes_map, 'stormchasers-aspect').length > 0
          ) {
            Number_of_Hits =
              1 +
              aspectVal(nodes_map, 'stormchasers-aspect')[0] +
              ProbabilityInCone(40, 1 / 6, enemy_spread) *
                (number_of_enemies - 1)
          }
          // Enhanced Tornado: Each time you cast Tornado, you have a 20% chance to spawn an additional Tornado.
          if (
            currentSkillVal(nodes_map)['name'] == 'tornado' &&
            talentVal(nodes_map, 'enhanced-tornado') > 0
          ) {
            Number_of_Hits *= 1.2
          }

          break

        // Cyclone Armor: Winds expand knocking back enemies and dealing {30%} damage.
        case 'cyclone-armor':
          Number_of_Hits =
            1 +
            Math.min(15 ** 2 / enemy_spread ** 2, 1) *
              (number_of_enemies - 1)
          break

        // Ravens: The target area is swarmed with ravens dealing {250%} damage over 6 seconds.
        case 'ravens':
          Number_of_Hits =
            1 +
            Math.min(10 ** 2 / enemy_spread ** 2, 1) *
              (number_of_enemies - 1)
          break
        case 'wolves':
          {
            let Number_Of_Wolves = 2

            // Aspect of the Stampede : Gain 1 additional Companion. In addition, your Companion Skills deal x{100/150}% bonus damage.
            if (
              aspectVal(nodes_map, 'aspect-of-the-stampede').length >
              0
            ) {
              Number_Of_Wolves += 1
            }

            Number_of_Hits = Number_Of_Wolves
            // storms Companion : Your Wolf Companions are infused with the power of the storm, dealing Lightning damage and gaining the Storm Howl ability.
            if (aspectVal(nodes_map, 'storms-companion').length > 0) {
              let Enemy_Distance = 10
              if (toggleVal(nodes_map, 'enemy-distant')) {
                Enemy_Distance = Math.min(
                  25,
                  statVal(nodes_map, 'Enemy_Spread'),
                )
              }
              Number_of_Hits =
                Number_Of_Wolves *
                (1 +
                  ProbabilityInCircle(
                    Enemy_Distance,
                    10,
                    statVal(nodes_map, 'Enemy_Spread'),
                  ) *
                    (number_of_enemies - 1))
            }
          }
          break
        // poison creeper: Vines strangle all surrounding enimies, immobilizing them for 2 seconds and Poisoning them for {90%} damage over 2 seconds.
        case 'poison-creeper':
          Number_of_Hits =
            1 +
            Math.min(15 ** 2 / enemy_spread ** 2, 1) *
              (number_of_enemies - 1)
          break

        // Boulder: Unearth a large rolling boulder that Knocks Back and crushes enemies, dealing {['33%', '36%', '40%', '43%', '46%']} damage with each hit.
        case 'boulder':
          Number_of_Hits =
            1 +
            ProbabilityIntersectingLineInCircle(
              15,
              60,
              enemy_spread,
            ) *
              (number_of_enemies - 1)

          // Dolmen Stone (Druid Unique Amulet): Casting Boulder while Hurricane is active will cause your boulders to rotate around you.
          if (
            aspectVal(nodes_map, 'dolmen-stone').length > 0 &&
            'hurricane' in Pre_Sim_Node['skill_use_rate']
          ) {
            const Hurricane_Uptime = Math.min(
              1,
              (1 / Pre_Sim_Node['skill_use_rate']['hurricane']) * 8,
            )

            let Multiple_Boulder_Multiplier = 1

            // Aspect of Metamorphic Stone : Boulder is now a Core Skill and costs 40.0 Spirit to cast dealing {100/120}% of normal damage.
            // If Cooldown is less than 8, multiple boulders can be active at once during a hurricane
            if (
              statVal(nodes_map, 'Cooldown') < 8 &&
              aspectVal(nodes_map, 'aspect-of-metamorphic-stone')
                .length == 0
            ) {
              Multiple_Boulder_Multiplier +=
                (8 - statVal(nodes_map, 'Cooldown')) / 8 +
                Math.max(0, (4 - statVal(nodes_map, 'Cooldown')) / 4)
            } else if (
              aspectVal(nodes_map, 'aspect-of-metamorphic-stone')
                .length > 0 &&
              'boulder' in Pre_Sim_Node['skill_use_rate']
            ) {
              Multiple_Boulder_Multiplier +=
                Pre_Sim_Node['skill_use_rate']['boulder'] /
                Pre_Sim_Node['skill_use_rate']['hurricane']
            }

            Number_of_Hits =
              (1 - Hurricane_Uptime) *
                (1 +
                  ProbabilityIntersectingLineInCircle(
                    15,
                    60,
                    statVal(nodes_map, 'Enemy_Spread'),
                  ) *
                    (number_of_enemies - 1)) +
              Hurricane_Uptime *
                Multiple_Boulder_Multiplier *
                3 *
                (1 +
                  Math.min(
                    1,
                    15 ** 2 / statVal(nodes_map, 'Enemy_Spread') ** 2,
                  ) *
                    number_of_enemies -
                  1)
          }
          break

        // Hurricane: Form a hurricane around you that deals {['97%', '107%', '117%', '127%', '136%']} damage to surrounding enemies over 8 seconds.
        case 'hurricane':
          Number_of_Hits =
            1 +
            Math.min(15 ** 2 / enemy_spread ** 2, 1) *
              (number_of_enemies - 1)
          // Endless Tempest: Increase the duration of Hurricane and Cataclysm by {['5%', '10%', '15%']} .
          if (talentVal(nodes_map, 'endless-tempest') > 0) {
            Number_of_Hits *=
              1 + talentVal(nodes_map, 'endless-tempest') * 0.05
          }
          break

        // Trample: Shapeshift into a Werebear, become Unstoppable, and charge forward, dealing {['25%', '28%', '30%', '32%', '35%']} damage and Knocking Back enemies.
        case 'trample':
          Number_of_Hits =
            1 +
            ProbabilityIntersectingLineInCircle(
              20,
              30,
              enemy_spread,
            ) *
              (number_of_enemies - 1)
          break

        // Cataclysm: A massive storm follows you for 8 seconds. Tornadoes Knock Back enemies, and lightning strikes wildly dealing 52% damage.
        case 'cataclysm':
          // (TODO) Figure out how this works. For now just assume it hits a target every second.
          Number_of_Hits = 8
          // Prime Cataclysm Cataclysm's duration is increased by  4 seconds.
          if (talentVal(nodes_map, 'prime-cataclysm') > 0) {
            Number_of_Hits += 4
          }
          // Endless Tempest: Increase the duration of Hurricane and Cataclysm by {['5%', '10%', '15%']} .
          if (talentVal(nodes_map, 'endless-tempest') > 0) {
            Number_of_Hits *=
              1 + talentVal(nodes_map, 'endless-tempest') * 0.05
          }
          // Calamity: Extend the duration of Ultimate Skills by 25%.
          if (spiritBoonVal(nodes_map)['wolf'].includes('calamity')) {
            Number_of_Hits *= 1.25
          }
          break

        // Lacerate: Shapeshift into a Werewolf, become Immune and quickly dash 10 times between enemies in the area dealing up to 400% damage.
        case 'lacerate':
          // (TODO) Figure out how this works. For assume it does 10 hits over 2 gcd. So 5 hits per gcd.
          Number_of_Hits = 5
          // Calamity: Extend the duration of Ultimate Skills by 25%.
          if (spiritBoonVal(nodes_map)['wolf'].includes('calamity')) {
            Number_of_Hits *= 1.25
          }
          break

        case 'earthen-bulwark':
          if (talentVal(nodes_map, 'innate-earthen-bulwark') > 0) {
            Number_of_Hits = Math.min(15 ** 2 / enemy_spread ** 2)
          }
          break

        default:
          break
      }
      return Number_of_Hits
    }),

    Number_Enemies_Hit: new StatsNode('Number_Enemies_Hit', () => {
      const number_of_enemies = Number(
        toggleVal(nodes_map, 'number-of-enemies'),
      )

      const enemy_spread = Number(statVal(nodes_map, 'Enemy_Spread'))

      let Aggregate_Hits
      let hit_1
      let hit_2
      let hit_3
      let Number_of_Hits = 1
      let Number_Of_Cast
      let maul_range
      let maul_radius
      let p
      let Total_Hits

      switch (currentSkillVal(nodes_map)['name']) {
        // Claw: Shapeshift into a Werewolf and claw at an enemy for {['20%', '22%', '24%', '26%', '28%']} damage.
        case 'claw':
          Number_of_Hits =
            1 +
            ProbabilityInCone(10, 1 / 3, enemy_spread) *
              (number_of_enemies - 1)
          break

        //Earth Spike: Sunder the earth, impaling the first enemy hit for {['16%', '18%', '19%', '21%', '22%']} damage.
        case 'earth-spike':
          Number_of_Hits =
            1 +
            ProbabilityInCone(15, 1 / 8, enemy_spread) *
              (number_of_enemies - 1)
          break

        // Maul: Shapeshift into a Werebear and maul enemies in front of you, dealing {['20%', '22%', '24%', '26%', '28%']} damage.
        case 'maul':
          maul_range = 10
          maul_radius = 1 / 3
          // Fierce Maul: Increases the range and radius of Maul by 30%
          if (talentVal(nodes_map, 'fierce-maul') > 0) {
            maul_range *= 1.3
            maul_radius *= 1.3
          }
          Number_of_Hits =
            1 +
            ProbabilityInCone(maul_range, maul_radius, enemy_spread) *
              (number_of_enemies - 1)
          break

        // Storm Strike: Electricity gathers around your weapon, dealing {['20%', '22%', '24%', '26%', '28%']} damage to your target and chaining to up to 3 surrounding enemies, dealing 20% less damage each time it chains.
        case 'storm-strike':
          p = Math.min(15 ** 2 / enemy_spread ** 2, 1)
          Number_of_Hits =
            BinomialProbability(number_of_enemies - 1, p, 0) +
            BinomialProbability(number_of_enemies - 1, p, 1) * 2 +
            (1 - BinomialDistribution(number_of_enemies - 1, p, 1)) *
              3

          // Wild Storm Strike: Storm Strike chains to 2 additional targets.
          if (talentVal(nodes_map, 'wild-storm-strike') > 0) {
            Number_of_Hits =
              BinomialProbability(number_of_enemies - 1, p, 0) +
              BinomialProbability(number_of_enemies - 1, p, 1) * 2 +
              BinomialProbability(number_of_enemies - 1, p, 2) * 3 +
              BinomialProbability(number_of_enemies - 1, p, 3) * 4 +
              (1 -
                BinomialDistribution(number_of_enemies - 1, p, 3)) *
                5
          }

          break

        case 'wind-shear':
          Number_of_Hits =
            1 +
            ProbabilityIntersectingLineInCircle(
              10,
              60,
              enemy_spread,
            ) *
              (number_of_enemies - 1)
          break

        // Landslide: Crush enemies between 2 pillars of earth, dealing up to {['113%', '124%', '135%', '146%', '157%']} damage.
        case 'landslide':
          Number_of_Hits =
            1 +
            Math.min(10 ** 2 / enemy_spread ** 2, 1) *
              (number_of_enemies - 1)
          break

        // Lightning Storm Conjure a growing lightning storm that deals {['25%', '28%', '30%', '32%', '35%']} damage per strike and increases the number of strikes the longer it is channeled up to a maximum of 5.
        case 'lightning-storm':
          Number_of_Hits = Math.min(
            number_of_enemies,
            statVal(nodes_map, 'Number_Of_Cast'),
          )
          break

        // Pulverize: Shapeshift into a Werebear and slam the ground, dealing {['50%', '55%', '60%', '65%', '70%']} damage to surrounding enemies.
        case 'pulverize':
          Number_of_Hits =
            1 +
            Math.min(10 ** 2 / enemy_spread ** 2, 1) *
              (number_of_enemies - 1)
          break

        // Shred: Shapeshift into a Werewolf and perform a trio of combo attacks:
        case 'shred':
          hit_1 =
            1 +
            ProbabilityInCone(10, 1 / 3, enemy_spread) *
              (number_of_enemies - 1)
          hit_2 =
            1 +
            ProbabilityInCone(10, 1 / 3, enemy_spread) *
              (number_of_enemies - 1)
          hit_3 =
            1 +
            ProbabilityInCone(10, 1 / 3, enemy_spread) *
              (number_of_enemies - 1)
          Number_of_Hits = (hit_1 + hit_2 + hit_3) / 3
          break

        // Tornado: Conjure a swirling tornado that deals {['35%', '39%', '42%', '46%', '49%']} damage.
        case 'tornado':
          // Assume for now that it shoots forward in a line for 60 yards. Really it moves around but that's harder to model.
          Number_of_Hits =
            1 +
            ProbabilityIntersectingLineInCircle(
              10,
              60,
              enemy_spread,
            ) *
              (number_of_enemies - 1)
          break

        // Cyclone Armor: Winds expand knocking back enemies and dealing {30%} damage.
        case 'cyclone-armor':
          Number_of_Hits =
            1 +
            Math.min(15 ** 2 / enemy_spread ** 2, 1) *
              (number_of_enemies - 1)
          break

        // Ravens: The target area is swarmed with ravens dealing {250%} damage over 6 seconds.
        case 'ravens':
          Number_of_Hits =
            1 +
            Math.min(10 ** 2 / enemy_spread ** 2, 1) *
              (number_of_enemies - 1)
          break

        // poison creeper: Vines strangle all surrounding enimies, immobilizing them for 2 seconds and Poisoning them for {90%} damage over 2 seconds.
        case 'poison-creeper':
          Number_of_Hits =
            1 +
            Math.min(15 ** 2 / enemy_spread ** 2, 1) *
              (number_of_enemies - 1)
          break

        // Boulder: Unearth a large rolling boulder that Knocks Back and crushes enemies, dealing {['33%', '36%', '40%', '43%', '46%']} damage with each hit.
        case 'boulder':
          Number_of_Hits =
            1 +
            ProbabilityIntersectingLineInCircle(
              20,
              60,
              enemy_spread,
            ) *
              (number_of_enemies - 1)
          break

        // Hurricane: Form a hurricane around you that deals {['97%', '107%', '117%', '127%', '136%']} damage to surrounding enemies over 8 seconds.
        case 'hurricane':
          Number_of_Hits =
            1 +
            Math.min(15 ** 2 / enemy_spread ** 2, 1) *
              (number_of_enemies - 1)
          break

        // Trample: Shapeshift into a Werebear, become Unstoppable, and charge forward, dealing {['25%', '28%', '30%', '32%', '35%']} damage and Knocking Back enemies.
        case 'trample':
          Number_of_Hits =
            1 +
            ProbabilityIntersectingLineInCircle(
              20,
              30,
              enemy_spread,
            ) *
              (number_of_enemies - 1)
          break

        // Cataclysm: A massive storm follows you for 8 seconds. Tornadoes Knock Back enemies, and lightning strikes wildly dealing 52% damage.
        case 'cataclysm':
          Total_Hits = statVal(nodes_map, 'Total_Hits')
          Number_of_Hits =
            number_of_enemies *
            (1 - (1 - 1 / number_of_enemies) ** Total_Hits)
          break

        // Lacerate: Shapeshift into a Werewolf, become Immune and quickly dash 10 times between enemies in the area dealing up to 400% damage.
        case 'lacerate':
          Total_Hits = statVal(nodes_map, 'Total_Hits')
          Number_of_Hits =
            number_of_enemies *
            (1 - (1 - 1 / number_of_enemies) ** Total_Hits)
          break

        case 'earthen-bulwark':
          if (talentVal(nodes_map, 'innate-earthen-bulwark') > 0) {
            Number_of_Hits = Math.min(15 ** 2 / enemy_spread ** 2)
          }
          break

        default:
          break
      }
      return Number_of_Hits
    }),

    /*--------------------------------------------------
                      PLAYER STATS NODES
          --------------------------------------------------*/

    Max_Life: new StatsNode('Max_Life', () => {
      const Base_Life = baseStatVal(nodes_map)['BaseMaxLife']
      const Pre_Sim_Node = druidPresimVal(nodes_map)

      // maximum-life
      const Bonus_Life = aggregationVal(nodes_map, 'maximum-life')

      // %-maximum-life
      let Life_Multiplier =
        1 + aggregationVal(nodes_map, '%-maximum-life')

      // Iron Feather: Gain x14% Maximum Life.
      if (
        spiritBoonVal(nodes_map)['eagle'].includes('iron-feather')
      ) {
        Life_Multiplier *= 1.14
      }

      // Keystone Talent ['ursine-strength', 1], // While Healthy, deal 25% (multiplicative damage) [x] increased damage, and 25%[x] increased Overpower damage.
      // Gain 20%[x] additional Maximum Life while in Werebear form and for 3 seconds after leaving Werebear form.
      if (talentVal(nodes_map, 'ursine-strength') > 0) {
        let Skill_Use_Rate = 0
        for (const Skill in Pre_Sim_Node['skill_use_rate']) {
          Skill_Use_Rate += Pre_Sim_Node['skill_use_rate'][Skill]
        }
        const Ursine_Strength_Uptime = Math.min(
          1,
          Skill_Use_Rate *
            Pre_Sim_Node['shapeshift_uptime']['werebear'] *
            3,
        )

        Life_Multiplier *= 1 + 0.2 * Ursine_Strength_Uptime
      }

      return Math.floor(Base_Life * Life_Multiplier + Bonus_Life)
    }),

    Total_Thorns: new StatsNode('Total_Thorns', () => {
      let Thorns_Total = 0

      // thorns
      Thorns_Total += aggregationVal(nodes_map, 'thorns')

      // (Unique) Razorplate: Gain {1000/2000} Thorns
      if (aspectVal(nodes_map, 'razorplate').length > 0) {
        Thorns_Total += aspectVal(nodes_map, 'razorplate')[0]
      }

      // Prickleskin: Gain 6% of base life in thorns.
      if (spiritBoonVal(nodes_map)['deer'].includes('prickleskin')) {
        Thorns_Total += baseStatVal(nodes_map)['BaseMaxLife'] * 0.6
      }

      return Thorns_Total
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
        DruidDamageMultiplier(
          new Set(['physical', 'thorns']),

          nodes_map,
        )
      )
    }),

    Passive_Dps: new StatsNode('Passive_Dps', () => {
      let Passive_Dps = statVal(nodes_map, 'Thorns_Dps')
      const Weapon_Damage = statVal(nodes_map, 'Total_Weapon_Damage')
      const Pre_Sim_Node = druidPresimVal(nodes_map)
      const number_of_enemies = Number(
        toggleVal(nodes_map, 'number-of-enemies'),
      )

      // Vampiric Power Casting a Mastery, Weapon Mastery, Macabre, Wrath, or Imbuement Skill calls a bat ally to attack nearby enemies, dealing 80% Physical damage with a 30% chance to Stun.
      if (statVal(nodes_map, 'Vampiric_Bat_Rate') > 0) {
        Passive_Dps +=
          statVal(nodes_map, 'Vampiric_Bat_Rate') *
          Weapon_Damage *
          DruidDamageMultiplier(
            new Set(['physical', 'bat']),
            nodes_map,
          )
      }

      // Vampiric Curse: Killing an enemy affected by your Vampiric Curse stores their soul. Casting a Defensive, Macabre, or Agility Skill will unleash stored souls to attack nearby enemies. You can hold up to 8 souls.
      // Assuming 50% Physical Damage for now. Real Value Unknown
      if (statVal(nodes_map, 'Vampiric_Curse_Uptime') > 0) {
        let Vampiric_Curse_Damage_Modifier = 0.5

        let Defensive_Skill_Rate = 0
        for (const Skill of allSkillsVal(nodes_map)) {
          switch (Skill) {
            case 'earthen-bulwark':
              if (
                'earthen-bulwark' in Pre_Sim_Node['skill_use_rate']
              ) {
                Defensive_Skill_Rate +=
                  Pre_Sim_Node['skill_use_rate'][Skill]
              }
              break
            case 'cyclone-armor':
              if ('cyclone-armor' in Pre_Sim_Node['skill_use_rate']) {
                Defensive_Skill_Rate +=
                  Pre_Sim_Node['skill_use_rate'][Skill]
              }
              break
            case 'blood-howl':
              Defensive_Skill_Rate +=
                1 / statVal(nodes_map, 'Blood_Howl_Cooldown')
              break
            case 'debilitating-roar':
              Defensive_Skill_Rate +=
                1 / statVal(nodes_map, 'Debilitating_Roar_Cooldown')
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
          DruidDamageMultiplier(new Set(['physical']), nodes_map)
      }

      // Vampiric Power jagged-spikes
      // Thorns have a 10% chance to deal 300% increased damage and Chill enemies for 8%.
      if (vampiricPowerVal(nodes_map, 'jagged-spikes')) {
        Passive_Dps += 0.3 * statVal(nodes_map, 'Thorns_Dps')
      }

      // Unique Fleshrender: Debilitating Roar and Blood Howl deal {flat-value} damage to Nearby Poisoned enemies.
      // The damage dealt to Poisoned enemies from Debilitating Roar and Blood Howl is now increased by x10% for each 100 Willpower you have.
      if (
        aspectVal(nodes_map, 'fleshrender').length > 0 &&
        toggleVal(nodes_map, 'enemy-poisoned') &&
        (allSkillsVal(nodes_map).has('debilitating-roar') ||
          allSkillsVal(nodes_map).has('blood-howl'))
      ) {
        let Fleshrender_Hits =
          1 +
          Math.min(
            10 ** 2 / statVal(nodes_map, 'Enemy_Spread') ** 2,
            1,
          ) *
            (number_of_enemies - 1)
        if (toggleVal(nodes_map, 'enemy-distant')) {
          Fleshrender_Hits =
            Math.min(
              10 ** 2 / statVal(nodes_map, 'Enemy_Spread') ** 2,
              1,
            ) * number_of_enemies
        }
        let Fleshrender_Rate = 0
        if (allSkillsVal(nodes_map).has('debilitating-roar')) {
          Fleshrender_Rate +=
            1 / statVal(nodes_map, 'Debilitating_Roar_Cooldown')
        }
        if (allSkillsVal(nodes_map).has('blood-howl')) {
          Fleshrender_Rate +=
            1 / statVal(nodes_map, 'Blood_Howl_Cooldown')
        }

        const Fleshrender_Willpower_Multiplier =
          1 +
          0.1 *
            Math.floor(statVal(nodes_map, 'Total_Willpower') / 100)
        Passive_Dps +=
          aspectVal(nodes_map, 'fleshrender')[0] *
          Fleshrender_Hits *
          Fleshrender_Rate *
          Fleshrender_Willpower_Multiplier *
          DruidDamageMultiplier(new Set(['physical']), nodes_map)
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
          DruidDamageMultiplier(new Set(['physical']), nodes_map) *
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
          DruidDamageMultiplier(new Set(['physical']), nodes_map) *
          (1 +
            Math.min(
              1,
              15 ** 2 / statVal(nodes_map, 'Enemy_Spread') ** 2,
            ) *
              (number_of_enemies - 1))
      }

      // airidahs-inexorable-will: When casting an Ultimate Skill and again 5 seconds after, Pull in Distant enemies and deal [{value1}] Physical damage to them. This damage is increased by 1%[x] per 1 point of Willpower you have.
      if (
        aspectVal(nodes_map, 'airidahs-inexorable-will').length > 0
      ) {
        let Airidahs_Inexorable_Will_Rate = 0
        if (allSkillsVal(nodes_map).has('grizzly-rage')) {
          Airidahs_Inexorable_Will_Rate +=
            2 / statVal(nodes_map, 'Grizzly_Rage_Cooldown')
        }
        if (allSkillsVal(nodes_map).has('petrify')) {
          Airidahs_Inexorable_Will_Rate +=
            2 / statVal(nodes_map, 'Petrify_Cooldown')
        }
        if (
          allSkillsVal(nodes_map).has('lacerate') &&
          'lacerate' in Pre_Sim_Node['skill_use_rate']
        ) {
          Airidahs_Inexorable_Will_Rate +=
            2 * Pre_Sim_Node['skill_use_rate']['lacerate']
        }
        if (
          allSkillsVal(nodes_map).has('cataclysm') &&
          'cataclysm' in Pre_Sim_Node['skill_use_rate']
        ) {
          Airidahs_Inexorable_Will_Rate +=
            2 * Pre_Sim_Node['skill_use_rate']['cataclysm']
        }
        const Hits =
          1 -
          Math.min(
            1,
            10 ** 2 /
              Number(toggleVal(nodes_map, 'enemy-spread-yards')) ** 2,
          )
        const Willpower_Multiplier =
          1 + 0.01 * statVal(nodes_map, 'Total_Willpower')
        Passive_Dps +=
          aspectVal(nodes_map, 'airidahs-inexorable-will')[0] *
          Airidahs_Inexorable_Will_Rate *
          Hits *
          Willpower_Multiplier *
          DruidDamageMultiplier(new Set(['physical']), nodes_map)
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
        const Pre_Sim_Node = druidPresimVal(nodes_map)
        let Damage_Received_Total = 1

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
          1 -
          (Number(toggleVal(nodes_map, 'percent-life')) <= 0.35
            ? aggregationVal(
                nodes_map,
                'damage-reduction-while-injured',
              )
            : 0)

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

        // damage-reduction-while-fortified
        const Fortified_Damage_Reduction =
          1 -
          0.9 *
            (1 -
              aggregationVal(
                nodes_map,
                'damage-reduction-while-fortified',
              ))
        Damage_Received_Total *=
          1 -
          Fortified_Damage_Reduction *
            Number(toggleVal(nodes_map, 'percent-fortify'))

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

        // Preserving Cyclone Armor: Every 10 seconds, Cyclone Armor intensifies, causing incoming damage to grant you 30% Damage Reduction for 2 seconds.
        if (
          allSkillsVal(nodes_map).has('cyclone-armor') &&
          talentVal(nodes_map, 'preserving-cyclone-armor') > 0
        ) {
          Damage_Received_Total *= 1 - 0.3 / 5
        }

        // Aspect of Cyclonic Force : Cyclone Armor also provides Physical Damage Reduction. In addition, Cyclone Armor will also be applied to all Nearby Allies.
        if (
          allSkillsVal(nodes_map).has('cyclone-armor') &&
          aspectVal(nodes_map, 'aspect-of-cyclonic-force').length > 0
        ) {
          Damage_Received_Total *=
            1 -
            0.2 * (0.9 + 0.1 * talentVal(nodes_map, 'cyclone-armor'))
        }

        // (Unique) Harlequin-Crest: "Gain {5/8}% damage Reduction .In addition, gain +2.0 Ranks to all Skills."
        if (aspectVal(nodes_map, 'harlequin-crest').length > 0) {
          Damage_Received_Total *=
            1 - aspectVal(nodes_map, 'harlequin-crest')[0]
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

        // Debilitating Roar: Shapeshift into a Werebear and bellow a mighty roar, reducing Nearby enemies' damage dealt by 70% for 4 seconds.
        if (allSkillsVal(nodes_map).has('debilitating-roar')) {
          Damage_Received_Total *=
            1 -
            (0.7 * 4) /
              statVal(nodes_map, 'Debilitating_Roar_Cooldown')
        }

        // Grizzly Rage: Shapeshift into a Dire Werebear for 10 seconds gaining 20% bonus damage and 20% Damage Reduction. Damage bonus is increased by 3% each second while in this form.
        // Dire wolfs Aspect : Grizzly Rage now shapeshifts you into a Dire Werewolf. As a Dire Werewolf you gain +{15/25}% Movement Speed instead of Damage Reduction and a {30/50}% Spirit cost reduction bonus. In addition, kills Heal you for 10.0% of your Maximum Life. // TODO
        if (
          allSkillsVal(nodes_map).has('grizzly-rage') &&
          aspectVal(nodes_map, 'dire-wolfs-aspect').length == 0
        ) {
          const Grizzly_Rage_Duration = statVal(
            nodes_map,
            'Grizzly_Rage_Duration',
          )
          Damage_Received_Total *=
            1 -
            (0.2 * Grizzly_Rage_Duration) /
              statVal(nodes_map, 'Grizzly_Rage_Cooldown')
        }

        // Vigilance: You gain {['5%', '10%', '15%']} Damage Reduction for 6 seconds after using a Defensive Skill.
        // TODO: Use updated cooldowns for damaging skills.
        const Defensive_Cooldowns = []
        if (allSkillsVal(nodes_map).has('earthen-bulwark')) {
          Defensive_Cooldowns.push(16)
        }
        if (allSkillsVal(nodes_map).has('cyclone-armor')) {
          Defensive_Cooldowns.push(18)
        }
        if (allSkillsVal(nodes_map).has('blood-howl')) {
          Defensive_Cooldowns.push(
            statVal(nodes_map, 'Blood_Howl_Cooldown'),
          )
        }
        if (allSkillsVal(nodes_map).has('debilitating-roar')) {
          Defensive_Cooldowns.push(
            statVal(nodes_map, 'Debilitating_Roar_Cooldown'),
          )
        }
        let Vigilance_Downtime = 1
        for (const cooldown of Defensive_Cooldowns) {
          Vigilance_Downtime *= 1 - 6 / cooldown
        }
        Damage_Received_Total *=
          1 -
          0.05 *
            talentVal(nodes_map, 'vigilance') *
            (1 - Vigilance_Downtime)

        // Protector: You gain 10% Damage Reduction while you have an active Barrier.
        if (
          Number(toggleVal(nodes_map, 'percent-barrier')) > 0 &&
          paragonVal(nodes_map, 'protector')
        ) {
          Damage_Received_Total *= 0.9
        }

        // Territorial: You gain 10% Damage Reduction against Close enemies.
        if (
          paragonVal(nodes_map, 'territorial') &&
          !toggleVal(nodes_map, 'enemy-distant')
        ) {
          Damage_Received_Total *= 0.9
        }

        // Undaunted: You gain up to 10% Damage Reduction the more Fortify you have.
        Damage_Received_Total *=
          1 -
          0.1 *
            Number(toggleVal(nodes_map, 'percent-fortify')) *
            Number(paragonVal(nodes_map, 'undaunted'))

        // Wariness: Take 10% reduced damage from Elites.
        Damage_Received_Total *=
          1 -
          0.1 *
            Number(
              spiritBoonVal(nodes_map)['deer'].includes('wariness') &&
                toggleVal(nodes_map, 'enemy-elite'),
            )

        // Primal Pulverize: Enemies hit with Pulverize deal 20% reduced damage for 4 seconds.
        if (
          talentVal(nodes_map, 'primal-pulverize') > 0 &&
          'pulverize' in Pre_Sim_Node['skill_use_rate']
        ) {
          Damage_Received_Total *=
            1 -
            0.2 *
              Math.min(
                Pre_Sim_Node['skill_use_rate']['pulverize'] * 4,
                1,
              )
        }

        // Talent ['savage-hurricane', 1],  Enemies affected by Hurricane deal 20% less damage.
        if (
          talentVal(nodes_map, 'savage-hurricane') > 0 &&
          !toggleVal(nodes_map, 'enemy-distant')
        ) {
          const Hurricane_Duration = 8
          let Hurricane_Rate = 0
          if ('hurricane' in Pre_Sim_Node['skill_use_rate']) {
            Hurricane_Rate =
              Pre_Sim_Node['skill_use_rate']['hurricane']
          }
          Damage_Received_Total *=
            1 - 0.2 * Math.min(1, Hurricane_Rate * Hurricane_Duration)
        }

        //Talent: ['heightened-senses', 3] Upon shapeshifting into a Werewolf or Werebear, gain {['4%', '8%', '12%']} Damage Reduction against Elites for 5 seconds.
        if (
          talentVal(nodes_map, 'heightened-senses') > 0 &&
          toggleVal(nodes_map, 'enemy-elite')
        ) {
          const Werewolf_Swap_Rate =
            Pre_Sim_Node['shapeshift_swap_rate']['werewolf']
          const Werebear_Swap_Rate =
            Pre_Sim_Node['shapeshift_swap_rate']['werebear']
          Damage_Received_Total *=
            1 -
            0.04 *
              talentVal(nodes_map, 'heightened-senses') *
              Math.min(
                1,
                (Werewolf_Swap_Rate + Werebear_Swap_Rate) * 5,
              )
        }

        // Talent: ['iron-fur', 3], // You gain {['3%', '6%', '9%']} Damage Reduction while in Werebear form.
        if (talentVal(nodes_map, 'iron-fur') > 0) {
          const Werebear_Uptime =
            Pre_Sim_Node['shapeshift_uptime']['werebear']
          Damage_Received_Total *=
            1 -
            0.03 * talentVal(nodes_map, 'iron-fur') * Werebear_Uptime
        }

        // Glyph: 'werebear', You gain 10% Damage Reduction while in Werebear form.
        if (paragonVal(nodes_map, 'werebear')) {
          Damage_Received_Total *=
            1 - 0.1 * Pre_Sim_Node['shapeshift_uptime']['werebear']
        }

        // Glyph: 'werewolf', You gain 10% Damage Reduction while in Werewolf form.
        if (paragonVal(nodes_map, 'werewolf')) {
          Damage_Received_Total *=
            1 - 0.1 * Pre_Sim_Node['shapeshift_uptime']['werewolf']
        }

        // Glyph: 'human', You gain 10% Damage Reduction while in Human form.
        if (paragonVal(nodes_map, 'human')) {
          Damage_Received_Total *=
            1 - 0.1 * Pre_Sim_Node['shapeshift_uptime']['human']
        }

        // Vigorous Aspect : Gain {10/15}% Damage Reduction while Shapeshifted into a Werewolf.
        if (aspectVal(nodes_map, 'vigorous-aspect').length != 0) {
          Damage_Received_Total *=
            1 -
            aspectVal(nodes_map, 'vigorous-aspect')[0] *
              Pre_Sim_Node['shapeshift_uptime']['werewolf']
        }

        // Storm Strike You gain  15% Damage Reduction for 3 seconds after dealing damage with Storm Strike .
        if (
          allSkillsVal(nodes_map).has('storm-strike') &&
          'storm-strike' in Pre_Sim_Node['skill_use_rate']
        ) {
          Damage_Received_Total *=
            1 -
            0.15 *
              Math.min(
                1,
                Pre_Sim_Node['skill_use_rate']['storm-strike'] * 3,
              )
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
          'lightning-storm' in Pre_Sim_Node['skill_use_rate']
        ) {
          Damage_Received_Total *= 0.7
        }

        return 1 - Damage_Received_Total // Total Damage Reduced
      },
    ),

    Non_Physical_Damage_Reduction: new StatsNode(
      'Non_Physical_Damage_Reduction',
      () => {
        let Damage_Received_Total = 1

        // Cyclone Armor: (Passive) Powerful winds surround you, granting 10% Non-Physical DamageReduction.
        // If we have Aspect of Cyclonic Force, we add it to the total damage reduction instead.
        if (
          allSkillsVal(nodes_map).has('cyclone-armor') &&
          aspectVal(nodes_map, 'aspect-of-cyclonic-force').length == 0
        ) {
          Damage_Received_Total *=
            1 -
            0.1 * (0.9 + 0.1 * talentVal(nodes_map, 'cyclone-armor'))
        }

        return 1 - Damage_Received_Total // Total Damage Reduced
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
      const Pre_Sim_Node = druidPresimVal(nodes_map)

      // armor
      Armor += aggregationVal(nodes_map, 'armor')

      // total-armor-while-in-werebear-form (Druid Only)

      // total-armor
      Armor *=
        1 +
        aggregationVal(nodes_map, 'total-armor') +
        aggregationVal(
          nodes_map,
          'total-armor-while-in-werebear-form',
        ) +
        aggregationVal(
          nodes_map,
          'total-armor-while-in-werewolf-form',
        )

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
        Math.min(Fire_Resistance_Cap, 85),
        mod_resist + int_resist - World_Tier_Penalty,
      )
    }),

    Resistance_Lightning: new StatsNode(
      'Resistance_Lightning',
      () => {
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

        // healing-received
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
      let Maximum_Resources = 100

      // maximum-spirit (Druid)
      Maximum_Resources +=
        aggregationVal(nodes_map, 'maximum-spirit') +
        aggregationVal(nodes_map, 'maximum-resource')

      // Gift of the Stag: Gain +20 Maximum Spirit.
      if (
        spiritBoonVal(nodes_map)['deer'].includes('gift-of-the-stag')
      ) {
        Maximum_Resources += 20
      }

      // Heart of the Wild: Maximum Spirit is increased by {[3, 6, 9]} .
      Maximum_Resources +=
        talentVal(nodes_map, 'heart-of-the-wild') * 3

      // Balanced Aspect : Increase your Maximum Spirit by {30/50} and Spirit Generation by x20% while Grizzly Rage is active.
      if (
        aspectVal(nodes_map, 'balanced-aspect').length > 0 &&
        allSkillsVal(nodes_map).has('grizzly-rage')
      ) {
        Maximum_Resources +=
          (aspectVal(nodes_map, 'balanced-aspect')[0] *
            statVal(nodes_map, 'Grizzly_Rage_Duration')) /
          statVal(nodes_map, 'Grizzly_Rage_Cooldown')
      }

      // melted-heart-of-selig Gain 60 maximum Resource. 75% of incoming damage drains 2 Resource for every 1% of Life you would have lost instead.
      if (aspectVal(nodes_map, 'melted-heart-of-selig').length > 0) {
        Maximum_Resources += 60
      }

      return Maximum_Resources
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
        const Pre_Sim_Node = druidPresimVal(nodes_map)
        let Resource_Gain_Per_Cast = Math.max(
          currentSkillVal(nodes_map)['base_resources_generated'],
          0,
        )

        // Abundance: Basic Skills generate {['6%', '12%', '18%']} more Spirit.
        if (tagsVal(nodes_map).has('basic')) {
          Resource_Gain_Per_Cast *=
            1 + talentVal(nodes_map, 'abundance') * 0.06
        }

        // (TODO) Use probability distribution instead.
        // Wild Wind Shear: Wind Shear grants 3 additional Spirit for each enemy hit beyond the first.
        if (
          currentSkillVal(nodes_map)['name'] == 'wind-shear' &&
          talentVal(nodes_map, 'wild-wind-shear') > 0
        ) {
          Resource_Gain_Per_Cast += Math.max(
            3 * (statVal(nodes_map, 'Total_Hits') - 1),
            0,
          )
        }

        // Aspect of the Calm Breeze : Lucky Hit: Wind Shear has up to a {5/10}% chance to fully restore your Spirit.
        if (
          currentSkillVal(nodes_map)['name'] == 'wind-shear' &&
          aspectVal(nodes_map, 'aspect-of-the-calm-breeze').length > 0
        ) {
          // Assume all your spirit is 1/2 maximum since we don't know current spirit.
          Resource_Gain_Per_Cast +=
            (aspectVal(nodes_map, 'aspect-of-the-calm-breeze')[0] *
              statVal(
                nodes_map,
                'Total_Lucky_Hit_Chance_Multiplier',
              ) *
              statVal(nodes_map, 'Max_Resource')) /
            2
        }

        // Savage Trample Casting Trample grants  40 Spirit.
        if (
          currentSkillVal(nodes_map)['name'] == 'trample' &&
          talentVal(nodes_map, 'savage-trample') > 0
        ) {
          Resource_Gain_Per_Cast += 40
        }

        // Aspect of the Unsatiated : After killing an enemy with Shred, your next Werewolf Skill generates x{30/40}% more Spirit and deals x{30/40}% increased damage.
        if (
          aspectVal(nodes_map, 'aspect-of-the-unsatiated').length >
            0 &&
          'shred' in Pre_Sim_Node['skill_use_rate'] &&
          tagsVal(nodes_map).has('basic')
        ) {
          const Enemy_Kill_Rate = statVal(
            nodes_map,
            'Enemy_Kill_Rate',
          )
          const Shred_Rate =
            Pre_Sim_Node['skill_use_rate']['shred'] + 0.000001 // to prevent undefined
          let Werewolf_Skills = new Set([
            'claw',
            'shred',
            'lacerate',
            'rabies',
          ])
          const Storm_Skills = new Set([
            'wind-shear',
            'lightning-storm',
            'tornado',
            'hurricane',
            'cataclysm',
          ])

          // Tempest Roar : Lucky Hit: Storm Skills have up to a {15/25}% chance to grant 10.0 Spirit.
          // Your base Storm Skills are now also Werewolf Skills
          if (aspectVal(nodes_map, 'tempest-roar').length > 0) {
            Werewolf_Skills = new Set([
              ...Werewolf_Skills,
              ...Storm_Skills,
            ])
          }

          let Werewolf_Skill_Rate = 0
          for (const Skill in Pre_Sim_Node['skill_use_rate']) {
            if (Werewolf_Skills.has(Skill)) {
              Werewolf_Skill_Rate +=
                Pre_Sim_Node['skill_use_rate'][Skill]
            }
          }

          if (Werewolf_Skill_Rate > 0) {
            const Aspect_Of_The_Unsatiated_Rate =
              Math.min(1, Enemy_Kill_Rate / Shred_Rate) * Shred_Rate
            Resource_Gain_Per_Cast *=
              1 +
              aspectVal(nodes_map, 'aspect-of-the-unsatiated')[0] *
                Math.min(
                  1,
                  Werewolf_Skill_Rate / Aspect_Of_The_Unsatiated_Rate,
                )
          }
        }

        Resource_Gain_Per_Cast +=
          statVal(nodes_map, 'Resource_Gain_Per_Hit') *
          statVal(nodes_map, 'Total_Hits')

        Resource_Gain_Per_Cast *= statVal(
          nodes_map,
          'Total_Resource_Generation_Multiplier',
        )

        // Mothers Embrace: If a Core Skill hits 4 or more enemies, [[20 - 40]|%|] of the Resource cost is refunded.
        if (aspectVal(nodes_map, 'mothers-embrace').length > 0) {
          // p is the probability of extra hits.
          let p = 0
          switch (currentSkillVal(nodes_map)['name']) {
            case 'lightning-storm':
              // Too complex to repeat it here. Here's a shortcut.
              p = Math.min(
                Math.max(statVal(nodes_map, 'Total_Hits') - 1, 0) /
                  number_of_enemies,
                1,
              )
              break

            case 'tornado':
              p = ProbabilityIntersectingLineInCircle(
                10,
                60,
                enemy_spread,
              )
              break

            case 'pulverize':
              p = Math.min(
                10 ** 2 / statVal(nodes_map, 'Enemy_Spread') ** 2,
                1,
              )
              break

            case 'shred':
              p = ProbabilityInCone(
                10,
                1 / 3,
                statVal(nodes_map, 'Enemy_Spread'),
              )
              break

            case 'landslide':
              p = Math.min(
                10 ** 2 / statVal(nodes_map, 'Enemy_Spread') ** 2,
                1,
              )
              break
          }
          Resource_Gain_Per_Cast +=
            -statVal(nodes_map, 'Resource_Cost_Per_Cast') *
            aspectVal(nodes_map, 'mothers-embrace')[0] *
            (1 - BinomialDistribution(number_of_enemies - 1, p, 3))
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

        const Pre_Sim_Node = druidPresimVal(nodes_map)

        // Aspect of Metamorphic Stone : Boulder is now a Core Skill and costs 40.0 Spirit to cast dealing {100/120}% of normal damage.
        if (
          currentSkillVal(nodes_map)['name'] == 'boulder' &&
          aspectVal(nodes_map, 'aspect-of-metamorphic-stone').length >
            0
        ) {
          Resource_Cost_Per_Cast = -40
        }

        // Wild Impulses: Your Core Skills cost {['3%', '6%', '9%']} more Spirit but deal {['5%', '10%', '15%']}  increased damage.
        if (currentSkillVal(nodes_map)['tags'].has('core')) {
          Resource_Cost_Per_Cast *=
            1 + talentVal(nodes_map, 'wild-impulses') * 0.03
        }

        // Dire wolfs Aspect : Grizzly Rage now shapeshifts you into a Dire Werewolf. As a Dire Werewolf you gain +{15/25}% Movement Speed instead of Damage Reduction and a {30/50}% Spirit cost reduction bonus. In addition, kills Heal you for 10.0% of your Maximum Life. // TODO
        if (
          allSkillsVal(nodes_map).has('grizzly-rage') &&
          aspectVal(nodes_map, 'dire-wolfs-aspect').length > 0
        ) {
          const Grizzly_Rage_Duration = statVal(
            nodes_map,
            'Grizzly_Rage_Duration',
          )
          Resource_Cost_Per_Cast *=
            1 -
            (aspectVal(nodes_map, 'dire-wolfs-aspect')[1] *
              Grizzly_Rage_Duration) /
              statVal(nodes_map, 'Grizzly_Rage_Cooldown')
        }

        Resource_Cost_Per_Cast *=
          1 - aggregationVal(nodes_map, 'spirit-cost-reduction')

        // Legendary Paragon: 'inner-beast' After shapeshifting, your Spirit costs are reduced by 10% for 5 seconds, up to 30%.
        if (paragonVal(nodes_map, 'inner-beast')) {
          let Shapeshift_Rate = 0
          for (const [Form, Value] of Object.entries(
            Pre_Sim_Node['shapeshift_swap_rate'],
          )) {
            Shapeshift_Rate += Value
          }
          Resource_Cost_Per_Cast *=
            1 -
            0.1 * (Shapeshift_Rate * 5 > 1 ? 3 : Shapeshift_Rate * 5)
        }

        // hunters Zenith : Gain a bonus when you kill with a Shapeshifting Skill:
        //• Werewolf: Your next Non-Ultimate Werebear Skill costs no Resource and has no Cooldown.
        //• Werebear: Your next Werewolf Skill will Heal you for {50/100} when damage is first dealt. // TODO
        if (
          aspectVal(nodes_map, 'hunters-zenith').length > 0 &&
          tagsVal(nodes_map).has('werebear') &&
          !tagsVal(nodes_map).has('ultimate')
        ) {
          let Werebear_Skills = new Set([
            'maul',
            'pulverize',
            'trample',
          ])
          let Werewolf_Skills = new Set([
            'claw',
            'shred',
            'lacerate',
            'rabies',
          ])
          const Earth_Skills = new Set([
            'earth-spike',
            'landslide',
            'boulder',
          ])
          const Storm_Skills = new Set([
            'wind-shear',
            'lightning-storm',
            'tornado',
            'hurricane',
            'cataclysm',
          ])
          // Tempest Roar : Lucky Hit: Storm Skills have up to a {15/25}% chance to grant 10.0 Spirit.
          // Your base Storm Skills are now also Werewolf Skills
          if (aspectVal(nodes_map, 'tempest-roar').length > 0) {
            Werewolf_Skills = new Set([
              ...Werewolf_Skills,
              ...Storm_Skills,
            ])
          }
          // Vasily's Prayer : Your Earth Skills are now also Werebear Skills
          if (aspectVal(nodes_map, 'vasilys-prayer').length > 0) {
            Werebear_Skills = new Set([
              ...Werebear_Skills,
              ...Earth_Skills,
            ])
          }
          let Werewolf_Kill_Rate = 0
          let Werebear_Skill_Rate = 0
          for (const Skill in Pre_Sim_Node['skill_use_rate']) {
            if (Werebear_Skills.has(Skill)) {
              Werebear_Skill_Rate +=
                Pre_Sim_Node['skill_use_rate'][Skill]
            }
            if (Werewolf_Skills.has(Skill)) {
              Werewolf_Kill_Rate +=
                Pre_Sim_Node['skill_use_rate'][Skill] *
                Pre_Sim_Node['cross_skill_stat'][Skill]['enemy_kills']
            }
          }
          const Hunters_Zenith_Rate = Math.min(
            Werewolf_Kill_Rate,
            Werebear_Skill_Rate,
          )
          if (Hunters_Zenith_Rate > 0) {
            Resource_Cost_Per_Cast *=
              1 -
              Math.min(
                1,
                Hunters_Zenith_Rate /
                  (Werebear_Skill_Rate + 0.0000001),
              )
          }
        }

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
      const cost_per_cast = statVal(
        nodes_map,
        'Resource_Cost_Per_Cast',
      )
      const Number_Of_Cast = statVal(nodes_map, 'Number_Of_Cast')

      return cost_per_cast * Number_Of_Cast
    }),

    Delta_Resources_Per_Cast: new StatsNode(
      'Delta_Resources_Per_Cast',
      () => {
        const Resource_Gain = statVal(
          nodes_map,
          'Resource_Gain_Per_Cast',
        )
        const Resource_Cost = statVal(
          nodes_map,
          'Resource_Cost_Per_Cast',
        )

        return Resource_Gain + Resource_Cost
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

      return (
        (delta_resources_per_cast + passive_resource_gain) *
        Number_Of_Cast
      )
    }),

    Total_Resource_Generation_Multiplier: new StatsNode(
      'Total_Resource_Generation_Multiplier',
      () => {
        let Resource_Gen_Multiplier_Total = 1

        // Total_Intellligence
        Resource_Gen_Multiplier_Total +=
          0.001 * statVal(nodes_map, 'Total_Intelligence')

        // resource-generation
        Resource_Gen_Multiplier_Total += aggregationVal(
          nodes_map,
          'resource-generation',
        )

        // Balanced Aspect : Increase your Maximum Spirit by {30/50} and Spirit Generation by x20% while Grizzly Rage is active.
        if (
          aspectVal(nodes_map, 'balanced-aspect').length > 0 &&
          allSkillsVal(nodes_map).has('grizzly-rage')
        ) {
          Resource_Gen_Multiplier_Total *=
            1 +
            (0.2 * statVal(nodes_map, 'Grizzly_Rage_Duration')) /
              statVal(nodes_map, 'Grizzly_Rage_Cooldown')
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
        let Resource_Gain_Per_Hit_Total = 0

        // Energize: Lucky Hit: Dealing damage has up to a 15% chance to restore 10 Spirit.
        if (spiritBoonVal(nodes_map)['wolf'].includes('energize')) {
          Resource_Gain_Per_Hit_Total +=
            10 *
            Math.min(
              0.15 *
                statVal(
                  nodes_map,
                  'Total_Lucky_Hit_Chance_Multiplier',
                ),
              1,
            )
        }

        // Lust for Carnage: Critical Strikes with Werewolf Skills restore 2 Spirit.
        if (
          tagsVal(nodes_map).has('werewolf') &&
          paragonVal(nodes_map, 'lust-for-carnage')
        ) {
          Resource_Gain_Per_Hit_Total +=
            2 * statVal(nodes_map, 'Critical_Chance')
        }

        // Keystone Talent ['earthen-might', 1],  Lucky Hit: Damaging enemies with Earth Skills has up to a 5% chance to:
        //    Restore all of your Spirit
        //    Cause your attacks to be guaranteed Critical Strikes for 5 seconds
        // This chance is increased by:
        //    10% for Critical Strikes
        //    10% if the target is Stunned, Immobilized, or Knocked Back
        if (talentVal(nodes_map, 'earthen-might') > 0) {
          // Mighty storms Aspect : The Earthen Might Key Passive also applies to your Storm Skills.
          const Skill_Critical_Chance = 0
          let Crowd_Control_Earthen_Might_Bonus = 0
          let Earthen_Might_Proc_Chance = 0
          if (
            toggleVal(nodes_map, 'enemy-stunned') ||
            toggleVal(nodes_map, 'enemy-immobilized')
          ) {
            Crowd_Control_Earthen_Might_Bonus += 0.1
          }
          if (
            tagsVal(nodes_map).has('earth') ||
            (aspectVal(nodes_map, 'mighty-storms-aspect').length !=
              0 &&
              tagsVal(nodes_map).has('storm'))
          ) {
            Earthen_Might_Proc_Chance +=
              (0.05 +
                0.1 * Skill_Critical_Chance +
                Crowd_Control_Earthen_Might_Bonus) *
              statVal(
                nodes_map,
                'Total_Lucky_Hit_Chance_Multiplier',
              ) *
              statVal(nodes_map, 'Total_Hits')

            Resource_Gain_Per_Hit_Total +=
              statVal(nodes_map, 'Max_Resource') *
              Math.min(1, Earthen_Might_Proc_Chance)
          }
        }

        // 'lucky-hit:-up-to-a-5%-chance-to-restore-primary-resource'
        Resource_Gain_Per_Hit_Total +=
          0.05 *
          statVal(nodes_map, 'Total_Lucky_Hit_Chance_Multiplier') *
          aggregationVal(
            nodes_map,
            'lucky-hit:-up-to-a-5%-chance-to-restore-primary-resource',
          ) *
          statVal(nodes_map, 'Max_Resource')

        // Perfect Storm: Your Storm Skills grant 1 Spirit and deal 15% increased damage when damaging a Vulnerable, Immobilized or Slowed enemy.
        if (currentSkillVal(nodes_map)['tags'].has('storm')) {
          if (
            statVal(nodes_map, 'Enemy_Vulnerable') == 1 ||
            toggleVal(nodes_map, 'enemy-slowed') ||
            toggleVal(nodes_map, 'enemy-immobilized')
          ) {
            Resource_Gain_Per_Hit_Total +=
              1 * talentVal(nodes_map, 'perfect-storm')
          }
        }

        // Tempest Roar : Lucky Hit: Storm Skills have up to a {15/25}% chance to grant 10.0 Spirit.
        if (
          tagsVal(nodes_map).has('storm') &&
          aspectVal(nodes_map, 'tempest-roar').length > 0
        ) {
          Resource_Gain_Per_Hit_Total +=
            10 *
            Math.min(
              aspectVal(nodes_map, 'tempest-roar')[0] *
                statVal(
                  nodes_map,
                  'Total_Lucky_Hit_Chance_Multiplier',
                ),
              1,
            )
        }

        return Resource_Gain_Per_Hit_Total
      },
    ),

    Resource_Regeneration_Per_Second: new StatsNode(
      'Resource_Regeneration_Per_Second',
      () => {
        let Regeneration_Per_Second = 0
        const Draining_Per_Second = 0
        const Pre_Sim_Node = druidPresimVal(nodes_map)

        // Innate Blood Howl: Blood Howl also generates 20 Spirit.
        if (
          allSkillsVal(nodes_map).has('blood-howl') &&
          talentVal(nodes_map, 'innate-blood-howl') > 0
        ) {
          Regeneration_Per_Second +=
            20 / statVal(nodes_map, 'Blood_Howl_Cooldown')
        }

        // Talent ['clarity', 3], Gain {[2, 4, 6]} Spirit when transforming into Human form.
        if (talentVal(nodes_map, 'clarity') > 0) {
          const Human_Swap_Rate =
            Pre_Sim_Node['shapeshift_swap_rate']['human']
          Regeneration_Per_Second +=
            2 * talentVal(nodes_map, 'clarity') * Human_Swap_Rate
        }

        // Talent ['supreme-petrify', 1], Killing an enemy affected by Petrify grants 25 Spirit.
        if (
          talentVal(nodes_map, 'supreme-petrify') > 0 &&
          allSkillsVal(nodes_map).has('petrify')
        ) {
          const Petrify_Uptime =
            3 / statVal(nodes_map, 'Petrify_Cooldown')
          Regeneration_Per_Second +=
            25 *
            Number(toggleVal(nodes_map, 'enemy-kill-rate')) *
            Petrify_Uptime
        }

        // Aspect of Assimilation: You have 8% increased Dodge Chance versus enemies affected by Damage Over Time effects. When you Dodge, you gain [5 - 10] of your Primary Resource.
        if (aspectVal(nodes_map, 'assimilation-aspect').length != 0) {
          const Enemy_Attacks_Per_Second = statVal(
            nodes_map,
            'Enemy_Attacks_Per_Second',
          )
          Regeneration_Per_Second +=
            Enemy_Attacks_Per_Second *
            aspectVal(nodes_map, 'assimilation-aspect')[0] *
            statVal(nodes_map, 'Total_Dodge_Chance')
        }

        // Mangled Aspect : When you are struck as a Werebear you have a {30/40}% chance to gain 1.0 Spirit.
        if (aspectVal(nodes_map, 'mangled-aspect').length > 0) {
          const Werebear_Uptime =
            Pre_Sim_Node['shapeshift_uptime']['werebear']
          Regeneration_Per_Second +=
            aspectVal(nodes_map, 'mangled-aspect')[0] *
            Werebear_Uptime *
            statVal(nodes_map, 'Enemy_Attacks_Per_Second')
        }

        // melted-heart-of-selig Gain 60 maximum Resource. 75% of incoming damage drains 2 Resource for every 1% of Life you would have lost instead.
        // if (
        //   aspectVal(nodes_map, 'melted-heart-of-selig').length != 0
        // ) {
        //   Draining_Per_Second +=
        //     aspectVal(nodes_map, 'melted-heart-of-selig')[0] *
        //     statVal(nodes_map, 'Enemy_Attacks_Per_Second')
        // }

        // Vampiric Power feed-the-coven
        // Lucky Hit: Conjuration, Companion, Minion and Bat Familiar attacks have up to a 60% chance to restore 10 Primary Resource to you and increase your Damage by 10% for 4 seconds.
        if (vampiricPowerVal(nodes_map, 'feed-the-coven')) {
          let Number_Of_Wolves = 0
          // Wolves Passive: Summon 2 wolf companions that bite enemies for 11% damage.
          if (allSkillsVal(nodes_map).has('wolves')) {
            Number_Of_Wolves = 2
            // Aspect of the Stampede : Gain 1 additional Companion. In addition, your Companion Skills deal x{100/150}% bonus damage.
            Number_Of_Wolves += Number(
              aspectVal(nodes_map, 'aspect-of-the-stampede').length >
                0,
            )
          }
          // Ravens Passive: 1 Raven flies above you and periodically attacks your enemies for {24%} damage every 5 seconds.
          let Number_Of_Ravens = 0
          if (allSkillsVal(nodes_map).has('ravens')) {
            Number_Of_Ravens += 1

            // Brutal Ravens: 2 additional Ravens periodically attack enemies and Increase the passive damage of Ravens by x40%..
            Number_Of_Ravens +=
              2 *
              Number(aspectVal(nodes_map, 'brutal-ravens').length > 0)

            // Aspect of the Stampede : Gain 1 additional Companion. In addition, your Companion Skills deal x{100/150}% bonus damage.
            Number_Of_Ravens += Number(
              aspectVal(nodes_map, 'aspect-of-the-stampede').length >
                0,
            )
          }
          let Number_Of_Posion_Creeper = 0
          if (allSkillsVal(nodes_map).has('poison-creeper')) {
            Number_Of_Posion_Creeper += 1
            // Aspect of the Stampede : Gain 1 additional Companion. In addition, your Companion Skills deal x{100/150}% bonus damage.
            Number_Of_Posion_Creeper += Number(
              aspectVal(nodes_map, 'aspect-of-the-stampede').length >
                0,
            )
          }
          const Companion_Hit_Rate =
            Number_Of_Wolves +
            Number_Of_Ravens / 5 +
            Number_Of_Posion_Creeper / 6
          const Minion_Lucky_Hit_Chance = 0.3 // completely made up value taken from bat stun chance on another vampiric power
          Regeneration_Per_Second +=
            10 *
            (statVal(nodes_map, 'Vampiric_Bat_Rate') +
              Companion_Hit_Rate) *
            Minion_Lucky_Hit_Chance
        }

        // Tibault's Will (Generic Unique Pants): You deal 20-40% [x] increased damage while Unstoppable and for 4 seconds after. When you become Unstoppable, gain 50 of your Primary Resource.
        if (aspectVal(nodes_map, 'tibaults-will').length != 0) {
          let Tibaults_Proc_Rate = 0

          // Trample: Shapeshift into a Werebear, become Unstoppable, and charge forward, dealing {['25%', '28%', '30%', '32%', '35%']} damage and Knocking Back enemies.
          if ('trample' in Pre_Sim_Node['skill_use_rate']) {
            Tibaults_Proc_Rate +=
              Pre_Sim_Node['skill_use_rate']['trample']
          }

          // ['enhanced-earthen-bulwark', 1], // Earthen Bulwark makes you Unstoppable while active.
          if (
            allSkillsVal(nodes_map).has('earthen-bulwark') &&
            talentVal(nodes_map, 'enhanced-earthen-bulwark') > 0
          ) {
            Tibaults_Proc_Rate +=
              1 / statVal(nodes_map, 'Earthen_Bulwark_Cooldown')
          }

          //['prime-grizzly-rage', 1], // Prime Grizzly Rage  Grizzly Rage makes you Unstoppable  for 6 seconds.
          if (
            allSkillsVal(nodes_map).has('grizzly-rage') &&
            talentVal(nodes_map, 'prime-grizzly-rage') > 0
          ) {
            Tibaults_Proc_Rate +=
              1 / statVal(nodes_map, 'Grizzly_Rage_Cooldown')
          }

          // Vampiric Power metamorphosis
          // When you Evade you turn into a cloud of bats, becoming Unstoppable for 4 seconds. Enemies along your path take 160% Physical damage and are inflicted with Vampiric Curse.
          if (vampiricPowerVal(nodes_map, 'metamorphosis')) {
            Tibaults_Proc_Rate += 1 / 5
          }

          // Eluding-aspect: Becoming Injured while Crowd Controlled grants you Unstoppable for 4.0 seconds. This effect has a {20/40} second Cooldown.
          if (
            aspectVal(nodes_map, 'eluding-aspect').length != 0 &&
            Number(toggleVal(nodes_map, 'percent-life')) <= 0.35
          ) {
            Tibaults_Proc_Rate +=
              1 / aspectVal(nodes_map, 'eluding-aspect')[0]
          }

          Regeneration_Per_Second += 50 * Tibaults_Proc_Rate
        }

        return Regeneration_Per_Second
      },
    ),

    Resource_On_Kill: new StatsNode('Resource_On_Kill', () => {
      let Resource_On_Kill_Total = 0

      // spirit-on-kill (Druid)
      Resource_On_Kill_Total += aggregationVal(
        nodes_map,
        'spirit-on-kill',
      )

      return Resource_On_Kill_Total
    }),

    Total_Lucky_Hit_Chance_Multiplier: new StatsNode(
      'Total_Lucky_Hit_Chance_Multiplier',
      () => {
        let Lucky_Hit_Chance_Bonus_Total = 0

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

        // Glyph 'tectonic', You gain 15% [+] Lucky Hit Chance.
        if (paragonVal(nodes_map, 'tectonic')) {
          Lucky_Hit_Chance_Bonus_Total += 0.15
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
      const current_skill = currentSkillVal(nodes_map)['name']
      let Cooldown_Total = CooldownFromRanks(
        talentVal(nodes_map, current_skill),
        current_skill,
        currentSkillVal(nodes_map)['cooldown_seconds'],
      )

      const Pre_Sim_Node = druidPresimVal(nodes_map)

      // Aspect of Metamorphic Stone : Boulder is now a Core Skill and costs 40.0 Spirit to cast dealing {100/120}% of normal damage.
      if (
        currentSkillVal(nodes_map)['name'] == 'boulder' &&
        aspectVal(nodes_map, 'aspect-of-metamorphic-stone').length > 0
      ) {
        Cooldown_Total = 0
      }
      // Seismic-shift Aspect : Earth Spike launches spikes in a line and has a {1 - 2} second Cooldown.
      if (
        currentSkillVal(nodes_map)['name'] == 'earth-spike' &&
        aspectVal(nodes_map, 'seismic-shift-aspect').length > 0
      ) {
        Cooldown_Total = aspectVal(
          nodes_map,
          'seismic-shift-aspect',
        )[0]
      }

      // cooldown-reduction
      Cooldown_Total *=
        1 - aggregationVal(nodes_map, 'cooldown-reduction')

      // 'nature-magic-skill-cooldown-reduction'
      if (tagsVal(nodes_map).has('nature-magic')) {
        Cooldown_Total *=
          1 -
          aggregationVal(
            nodes_map,
            'nature-magic-skill-cooldown-reduction',
          )
      }

      // 'ultimate-skill-cooldown-reduction'
      if (tagsVal(nodes_map).has('ultimate')) {
        Cooldown_Total *=
          1 -
          aggregationVal(
            nodes_map,
            'ultimate-skill-cooldown-reduction',
          )
      }

      // Vampiric Power 'anticipation'
      // Your Ultimate Skills gain 20% Cooldown Reduction. Your Ultimate Skills gain 12% increased damage for each nearby enemy affected by your Damage Over Time effects.
      if (
        tagsVal(nodes_map).has('ultimate') &&
        vampiricPowerVal(nodes_map, 'anticipation')
      ) {
        Cooldown_Total *= 0.8
      }

      // Snake Spirit Boon: Calm Before the Storm: Lucky Hit: Nature Magic Skills have up to a 10% chance to reduce the Cooldown of your Ultimate Skill by 2 seconds.
      if (
        spiritBoonVal(nodes_map)['snake'].includes(
          'calm-before-the-storm',
        )
      ) {
        const Earth_Skills = new Set([
          'earth-spike',
          'landslide',
          'boulder',
          'petrify',
        ])
        const Storm_Skills = new Set([
          'wind-shear',
          'lightning-storm',
          'tornado',
          'hurricane',
          'cataclysm',
        ])
        let Calm_Before_The_Storm_Proc_Rate = 0
        for (const Other_Skill in Pre_Sim_Node['skill_use_rate']) {
          if (
            Earth_Skills.has(Other_Skill) ||
            Storm_Skills.has(Other_Skill)
          ) {
            Calm_Before_The_Storm_Proc_Rate +=
              0.1 *
              Pre_Sim_Node['skill_use_rate'][Other_Skill] *
              statVal(
                nodes_map,
                'Total_Lucky_Hit_Chance_Multiplier',
              ) *
              Pre_Sim_Node['cross_skill_stat'][Other_Skill][
                'lucky_hit_chance'
              ] *
              Pre_Sim_Node['cross_skill_stat'][Other_Skill][
                'total_hits'
              ]
          }
        }
        if (
          currentSkillVal(nodes_map)['name'] == 'cataclysm' ||
          currentSkillVal(nodes_map)['name'] == 'lacerate'
        ) {
          const alpha =
            Cooldown_Total / (1 / Calm_Before_The_Storm_Proc_Rate + 2)
          Cooldown_Total -= alpha * 2
        }
      }

      // Symbiotic Aspect : When the natures Fury Key Passive triggers a free Skill, your non-Ultimate Cooldowns of the opposite type are reduced by {4/8} seconds.
      // Keystone Talent: ['natures-fury', 1], // Casting an Earth Skill has a 30% chance to trigger a free Storm Skill of the same category.
      //                                          casting a Storm skill has a 30% chance to trigger a free Earth skill of the same category.
      // These free Skills count as both Earth and Storm Skills.
      if (
        aspectVal(nodes_map, 'symbiotic-aspect').length > 0 &&
        talentVal(nodes_map, 'natures-fury') > 0
      ) {
        const Earth_Skills = new Set([
          'earth-spike',
          'landslide',
          'boulder',
          'petrify',
        ])
        const Storm_Skills = new Set([
          'wind-shear',
          'lightning-storm',
          'tornado',
          'hurricane',
          'cataclysm',
        ])
        // Aspect of natures Savagery : Werewolf Skills function as Storm Skills and Werebear Skills function as Earth Skills for the natures Fury Key Passive.
        if (
          aspectVal(nodes_map, 'aspect-of-natures-savagery').length !=
          0
        ) {
          Storm_Skills.add('claw')
            .add('shred')
            .add('rabies')
            .add('lacerate')
          Earth_Skills.add('maul').add('pulverize').add('trample')
        }
        const Current_Skill = currentSkillVal(nodes_map)['name']
        let Symbiotic_Aspect_Rate = 0
        for (const Other_Skill in Pre_Sim_Node['skill_use_rate']) {
          if (
            Earth_Skills.has(Other_Skill) &&
            Storm_Skills.has(Current_Skill) &&
            Current_Skill != 'cataclysm' &&
            Current_Skill != 'lacerate'
          ) {
            Symbiotic_Aspect_Rate +=
              0.3 * Pre_Sim_Node['skill_use_rate'][Other_Skill]
          }
          if (
            Storm_Skills.has(Other_Skill) &&
            Earth_Skills.has(Current_Skill) &&
            Current_Skill != 'petrify'
          ) {
            Symbiotic_Aspect_Rate +=
              0.3 * Pre_Sim_Node['skill_use_rate'][Other_Skill]
          }
        }
        const alpha =
          Cooldown_Total /
          (1 / Symbiotic_Aspect_Rate +
            aspectVal(nodes_map, 'symbiotic-aspect')[0])
        Cooldown_Total -=
          alpha * aspectVal(nodes_map, 'symbiotic-aspect')[0]
      }

      // Packleader:Lucky Hit: Critical Strikes have up to a 20% chance to reset the Cooldowns of your Companion Skills.
      if (
        spiritBoonVal(nodes_map)['wolf'].includes('packleader') &&
        tagsVal(nodes_map).has('companion')
      ) {
        let Packleader_Proc_Rate = 0
        for (const Other_Skill in Pre_Sim_Node['skill_use_rate']) {
          Packleader_Proc_Rate +=
            0.2 *
            Pre_Sim_Node['skill_use_rate'][Other_Skill] *
            Pre_Sim_Node['cross_skill_stat'][Other_Skill][
              'lucky_hit_chance'
            ] *
            Pre_Sim_Node['cross_skill_stat'][Other_Skill][
              'total_hits'
            ] *
            Pre_Sim_Node['cross_skill_stat'][Other_Skill][
              'critical_chance'
            ]
        }
        if (
          tagsVal(nodes_map).has('companion') &&
          Packleader_Proc_Rate > 0
          // Cooldown = min (Exp(rate), Old_Cooldown)
        ) {
          Cooldown_Total =
            (1 / Packleader_Proc_Rate) *
            (1 - Math.exp(-Packleader_Proc_Rate * Cooldown_Total))
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
          'earth-spike',
          'wind-shear',
          'storm-strike',
          'maul',
          'claw',
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

      // hunters Zenith : Gain a bonus when you kill with a Shapeshifting Skill:
      //• Werewolf: Your next Non-Ultimate Werebear Skill costs no Resource and has no Cooldown.
      //• Werebear: Your next Werewolf Skill will Heal you for {50/100} when damage is first dealt. // TODO
      if (
        aspectVal(nodes_map, 'hunters-zenith').length > 0 &&
        tagsVal(nodes_map).has('werebear') &&
        !tagsVal(nodes_map).has('ultimate')
      ) {
        let Werebear_Skills = new Set([
          'maul',
          'pulverize',
          'trample',
        ])
        let Werewolf_Skills = new Set([
          'claw',
          'shred',
          'lacerate',
          'rabies',
        ])
        const Earth_Skills = new Set([
          'earth-spike',
          'landslide',
          'boulder',
        ])
        const Storm_Skills = new Set([
          'wind-shear',
          'lightning-storm',
          'tornado',
          'hurricane',
          'cataclysm',
        ])
        // Tempest Roar : Lucky Hit: Storm Skills have up to a {15/25}% chance to grant 10.0 Spirit.
        // Your base Storm Skills are now also Werewolf Skills
        if (aspectVal(nodes_map, 'tempest-roar').length > 0) {
          Werewolf_Skills = new Set([
            ...Werewolf_Skills,
            ...Storm_Skills,
          ])
        }
        // Vasily's Prayer : Your Earth Skills are now also Werebear Skills
        if (aspectVal(nodes_map, 'vasilys-prayer').length > 0) {
          Werebear_Skills = new Set([
            ...Werebear_Skills,
            ...Earth_Skills,
          ])
        }
        let Werewolf_Kill_Rate = 0
        let Werebear_Skill_Rate = 0
        for (const Skill in Pre_Sim_Node['skill_use_rate']) {
          if (Werebear_Skills.has(Skill)) {
            Werebear_Skill_Rate +=
              Pre_Sim_Node['skill_use_rate'][Skill]
          }
          if (Werewolf_Skills.has(Skill)) {
            Werewolf_Kill_Rate +=
              Pre_Sim_Node['skill_use_rate'][Skill] *
              Pre_Sim_Node['cross_skill_stat'][Skill]['enemy_kills']
          }
        }
        const Hunters_Zenith_Rate = Math.min(
          Werewolf_Kill_Rate,
          Werebear_Skill_Rate,
        )
        if (Hunters_Zenith_Rate > 0) {
          Cooldown_Total *=
            1 -
            Math.min(
              1,
              Hunters_Zenith_Rate / (Werebear_Skill_Rate + 0.0000001),
            )
        }
      }

      return Math.max(0, Cooldown_Total)
    }),

    Total_Movement_Speed: new StatsNode(
      'Total_Movement_Speed',
      () => {
        const Pre_Sim_Node = druidPresimVal(nodes_map)
        const number_of_enemies = Number(
          toggleVal(nodes_map, 'number-of-enemies'),
        )
        const enemy_spread = Number(
          statVal(nodes_map, 'Enemy_Spread'),
        )

        let Movement_Speed_Total =
          1 + aggregationVal(nodes_map, 'movement-speed')

        // 'movement-speed-for-seconds-after-killing-an-elite'

        // Dire wolfs Aspect : Grizzly Rage now shapeshifts you into a Dire Werewolf. As a Dire Werewolf you gain +{15/25}% Movement Speed instead of Damage Reduction and a {30/50}% Spirit cost reduction bonus. In addition, kills Heal you for 10.0% of your Maximum Life. // TODO
        if (
          allSkillsVal(nodes_map).has('grizzly-rage') &&
          aspectVal(nodes_map, 'dire-wolfs-aspect').length > 0
        ) {
          const Grizzly_Rage_Duration = statVal(
            nodes_map,
            'Grizzly_Rage_Duration',
          )
          Movement_Speed_Total +=
            (aspectVal(nodes_map, 'dire-wolfs-aspect')[0] *
              Grizzly_Rage_Duration) /
            statVal(nodes_map, 'Grizzly_Rage_Cooldown')
        }

        // Fierce Wind Shear: Each enemy hit by Wind Shear increases your Movement Speed by 5% for 5 seconds, up to 20%.
        if (
          talentVal(nodes_map, 'fierce-wind-shear') > 0 &&
          'wind-shear' in Pre_Sim_Node['skill_use_rate']
        ) {
          const Wind_Shear_Rate =
            Pre_Sim_Node['skill_use_rate']['wind-shear']
          const Wind_Shear_Hits =
            1 +
            ProbabilityIntersectingLineInCircle(
              10,
              60,
              enemy_spread,
            ) *
              (number_of_enemies - 1)
          Movement_Speed_Total *=
            Wind_Shear_Rate > 1
              ? 1.2
              : 1 +
                0.05 * Math.min(Wind_Shear_Hits, 4) * Wind_Shear_Rate
        }

        // Talent: ['digitigrade-gait', 3], // You gain {['3%', '6%', '9%']} Movement Speed while in Werewolf form.
        if (talentVal(nodes_map, 'digitigrade-gait') > 0) {
          const Werewolf_Uptime =
            Pre_Sim_Node['shapeshift_uptime']['werewolf']
          Movement_Speed_Total +=
            0.03 *
            talentVal(nodes_map, 'digitigrade-gait') *
            Werewolf_Uptime
        }

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

          Movement_Speed_Total +=
            Math.min(Crit_Rate, 1) *
            aspectVal(nodes_map, 'wind-striker-aspect')[0]
        }

        // Craven Aspect: You gain [20 - 40]% increased Movement Speed when moving away from Slowed or Chilled enemies.
        if (
          aspectVal(nodes_map, 'craven-aspect').length > 0 &&
          (toggleVal(nodes_map, 'enemy-slowed') ||
            statVal(nodes_map, 'Enemy_Chilled') == 1)
        ) {
          Movement_Speed_Total += aspectVal(
            nodes_map,
            'craven-aspect',
          )[0]
        }

        // Vampiric Power moonrise
        // Hitting an enemy with a Basic Skill grants you 4% Attack Speed for 10 seconds, stacking up to 5 times. Upon reaching maximum stacks, you enter a Vampiric Bloodrage, gaining 160% Basic Skill damage and 15% Movement Speed for 10 seconds.
        if (vampiricPowerVal(nodes_map, 'moonrise')) {
          let Basic_Skill_Rate = 0
          const Basic_Skills = new Set([
            'earth-spike',
            'wind-shear',
            'storm-strike',
            'maul',
            'claw',
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
            Movement_Speed_Total *=
              1 + 0.15 * Vampiric_Bloodrage_Uptime
          }
        }

        return Math.min(Movement_Speed_Total, 2) // Max Movement Speed is 200%
      },
    ),

    Number_Of_Cast: new StatsNode('Number_Of_Cast', () => {
      const Number_Of_Cast = 1
      // //Shred: Shapeshift into a Werewolf and perform a trio of combo attacks:
      // if (currentSkillVal(nodes_map)['name'] == 'shred') {
      //   Number_Of_Cast = 3
      // }

      return Number_Of_Cast
    }),

    Cast_Time: new StatsNode('Cast_Time', () => {
      const Total_Attack_Speed = statVal(
        nodes_map,
        'Total_Attack_Speed',
      )

      let base_cast_time = 1
      switch (currentSkillVal(nodes_map)['name']) {
        case 'earth-spike':
          base_cast_time = 0.57
          break

        case 'wind-shear':
          base_cast_time = 0.68
          break

        case 'maul':
          base_cast_time = 0.755
          break

        case 'claw':
          base_cast_time = 0.607
          break

        case 'storm-stike':
          base_cast_time = 0.676
          break

        case 'pulverize':
          base_cast_time = 0.83
          break

        case 'tornado':
          base_cast_time = 0.71
          break

        case 'lightning-storm':
          base_cast_time = 1
          break

        case 'shred':
          base_cast_time = 1.85
          break

        case 'landslide':
          base_cast_time = 0.91
          break

        case 'lacerate':
          base_cast_time = 2.47
          break

        case 'ravens':
          base_cast_time = 0.82
          break

        case 'hurricane':
          base_cast_time = 0.63
          break

        case 'trample':
          base_cast_time = 0.57
          break

        case 'boulder':
          base_cast_time = 0.7
          break

        case 'rabies':
          base_cast_time = 0.77
          break

        case 'cataclysm':
          base_cast_time = 0.76
          break

        case 'poison-creeper':
          base_cast_time = 0.67
          break

        case 'wolves':
          base_cast_time = 0.86
          break

        case 'earthen-bulwark':
          base_cast_time = 0
          break

        case 'cyclone-armor':
          base_cast_time = 0.63
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

    Total_Dodge_Chance: new StatsNode('Total_Dodge_Chance', () => {
      const Pre_Sim_Node = druidPresimVal(nodes_map)
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

    Wolves_Passive_DPS: new StatsNode('Wolves_Passive_DPS', () => {
      const Weapon_Damage = aggregationVal(nodes_map, 'weapon-damage')
      const Pre_Sim_Node = druidPresimVal(nodes_map)
      const Wolves_Tags = new Set(['physical', 'wolves', 'companion'])
      let Companion_Damage = 0

      // Wolves Passive: Summon 2 wolf companions that bite enemies for 11% damage.
      if (allSkillsVal(nodes_map).has('wolves')) {
        let number_of_wolves = 2
        // Enhanced Wolves: Wolves deal 25% increased damage to Immobilized, Stunned, Slowed, or Poisoned enemies.
        const enhanced_wolves_multiplier =
          1 +
          0.25 *
            Number(
              toggleVal(nodes_map, 'enemy-immobilized') ||
                toggleVal(nodes_map, 'enemy-stunned') ||
                toggleVal(nodes_map, 'enemy-slowed') ||
                toggleVal(nodes_map, 'enemy-poisoned'),
            ) *
            Number(talentVal(nodes_map, 'enhanced-wolves'))

        // Brutal Wolves: When you Critically Strike, your Wolves gain 25% Attack Speed for 3 seconds.
        let Brutal_Wolves_Bonus = 0
        if (
          talentVal(nodes_map, 'brutal-wolves') > 0 &&
          'wolves' in Pre_Sim_Node['skill_use_rate']
        ) {
          let Crit_Rate = 0
          for (const skill in Pre_Sim_Node['skill_use_rate']) {
            Crit_Rate +=
              Pre_Sim_Node['skill_use_rate'][skill] *
              Pre_Sim_Node['cross_skill_stat'][skill][
                'critical_chance'
              ]
          }
          Brutal_Wolves_Bonus = 0.25 * Math.min(Crit_Rate * 3, 1)
        }

        // Aspect of the Stampede : Gain 1 additional Companion. In addition, your Companion Skills deal x{100/150}% bonus damage.
        number_of_wolves += Number(
          aspectVal(nodes_map, 'aspect-of-the-stampede').length > 0,
        )

        // Aspect of the Alpha : Your Wolf Companions are now Werewolf Companions. Werewolf Companions deal x{90/115}% additional damage and can spread Rabies.
        let Werewolf_Companion_Bonus = 0
        if (aspectVal(nodes_map, 'aspect-of-the-alpha').length > 0) {
          Wolves_Tags.add('werewolf')
          Werewolf_Companion_Bonus = aspectVal(
            nodes_map,
            'aspect-of-the-alpha',
          )[0]
        }
        Companion_Damage +=
          Weapon_Damage * 0.11 * (1 + Werewolf_Companion_Bonus)
        number_of_wolves *
          (0.9 + 0.1 * talentVal(nodes_map, 'wolves')) *
          enhanced_wolves_multiplier *
          (1 + Brutal_Wolves_Bonus)
      }

      // Wilds: The Passive portion of Companion Skills deal x80% increased damage.
      if (paragonVal(nodes_map, 'wilds')) {
        Companion_Damage *= 1.8
      }

      // storms Companion : Your Wolf Companions are infused with the power of the storm, dealing Lightning damage and gaining the Storm Howl ability.
      if (aspectVal(nodes_map, 'storms-companion').length > 0) {
        Wolves_Tags.add('lightning')
      }

      const Damage_Multiplier = DruidDamageMultiplier(
        Wolves_Tags,
        nodes_map,
      )

      return Companion_Damage * Damage_Multiplier
    }),

    Ravens_Passive_DPS: new StatsNode('Ravens_Passive_DPS', () => {
      const Weapon_Damage = aggregationVal(nodes_map, 'weapon-damage')
      const Pre_Sim_Node = druidPresimVal(nodes_map)
      const Damage_Multiplier = DruidDamageMultiplier(
        new Set(['physical', 'raven', 'companion']),
        nodes_map,
      )
      let Companion_Damage = 0
      // Ravens Passive: 1 Raven flies above you and periodically attacks your enemies for {24%} damage every 5 seconds.
      if (allSkillsVal(nodes_map).has('ravens')) {
        // Brutal Ravens: 2 additional Ravens periodically attack enemies and Increase the passive damage of Ravens by x40%..
        // Aspect of the Stampede : Gain 1 additional Companion. In addition, your Companion Skills deal x{100/150}% bonus damage.
        let Brutal_Ravens_Multiplier = 1
        if (talentVal(nodes_map, 'brutal-ravens') > 0) {
          Brutal_Ravens_Multiplier += 0.4
        }
        Companion_Damage +=
          ((Weapon_Damage * 0.24) / 5) *
          (2 * talentVal(nodes_map, 'brutal-ravens') +
            Number(
              aspectVal(nodes_map, 'aspect-of-the-stampede').length >
                0,
            ) +
            1) *
          Brutal_Ravens_Multiplier
      }

      // Wilds: The Passive portion of Companion Skills deal x80% increased damage.
      if (paragonVal(nodes_map, 'wilds')) {
        Companion_Damage *= 1.8
      }

      return Companion_Damage * Damage_Multiplier
    }),

    Flat_Companion_Damage: new StatsNode(
      'Flat_Companion_Damage',
      () => {
        return (
          (statVal(nodes_map, 'Wolves_Passive_DPS') +
            statVal(nodes_map, 'Ravens_Passive_DPS')) *
          statVal(nodes_map, 'Elapsed_Time')
        )
      },
    ),

    Poison_Creeper_Passive_DPS: new StatsNode(
      'Poison_Creeper_Passive_DPS',
      () => {
        const Weapon_Damage = aggregationVal(
          nodes_map,
          'weapon-damage',
        )
        const number_of_enemies = Number(
          toggleVal(nodes_map, 'number-of-enemies'),
        )

        let Companion_Damage = 0

        // poison creeper Passive: A poison creeper periodically emerges from the ground every 7 seconds and applies 6% Poisoning damage over 6 seconds to an enemy in the area.
        if (allSkillsVal(nodes_map).has('poison-creeper')) {
          Companion_Damage +=
            (Weapon_Damage *
              0.06 *
              (1 +
                Number(
                  aspectVal(nodes_map, 'aspect-of-the-stampede')
                    .length > 0,
                )) *
              (0.9 + 0.1 * talentVal(nodes_map, 'poison-creeper'))) /
            7
        }

        // Wilds: The Passive portion of Companion Skills deal x80% increased damage.
        if (paragonVal(nodes_map, 'wilds')) {
          Companion_Damage *= 1.8
        }

        return Companion_Damage
      },
    ),

    Dot_Companion_Damage: new StatsNode(
      'Dot_Companion_Damage',
      () => {
        return (
          statVal(nodes_map, 'Poison_Creeper_Passive_DPS') *
          statVal(nodes_map, 'Elapsed_Time')
        )
      },
    ),

    Blood_Howl_Cooldown: new StatsNode('Blood_Howl_Cooldown', () => {
      let Cooldown = 15

      Cooldown *= 1 - aggregationVal(nodes_map, 'cooldown-reduction')

      // Talent ['enhanced-blood-howl', 1], // Kills reduce the Cooldown of Blood Howl by 1 second.
      if (talentVal(nodes_map, 'enhanced-blood-howl') > 0) {
        const alpha =
          Cooldown /
          (1 / Number(toggleVal(nodes_map, 'enemy-kill-rate')) + 1)
        Cooldown -= alpha
      }

      return Cooldown
    }),

    Debilitating_Roar_Cooldown: new StatsNode(
      'Debilitating_Roar_Cooldown',
      () => {
        let Cooldown = CooldownFromRanks(
          talentVal(nodes_map, 'debilitating-roar'),
          'debilitating-roar',
          22,
        )

        Cooldown *=
          1 - aggregationVal(nodes_map, 'cooldown-reduction')

        return Math.max(1, Cooldown)
      },
    ),

    Earthen_Bulwark_Cooldown: new StatsNode(
      'Earthen_Bulwark_Cooldown',
      () => {
        let Cooldown = CooldownFromRanks(
          talentVal(nodes_map, 'earthen-bulwark'),
          'earthen-bulwark',
          16,
        )

        Cooldown *=
          1 - aggregationVal(nodes_map, 'cooldown-reduction')

        Cooldown *=
          1 -
          aggregationVal(
            nodes_map,
            'nature-magic-skill-cooldown-reduction',
          )

        return Math.max(1, Cooldown)
      },
    ),

    Grizzly_Rage_Cooldown: new StatsNode(
      'Grizzly_Rage_Cooldown',
      () => {
        let Cooldown = 50

        Cooldown *=
          1 - aggregationVal(nodes_map, 'cooldown-reduction')

        const Pre_Sim_Node = druidPresimVal(nodes_map)

        // 'ultimate-skill-cooldown-reduction'
        if (tagsVal(nodes_map).has('ultimate')) {
          Cooldown *=
            1 -
            aggregationVal(
              nodes_map,
              'ultimate-skill-cooldown-reduction',
            )
        }

        // Snake Spirit Boon: Calm Before the Storm: Lucky Hit: Nature Magic Skills have up to a 10% chance to reduce the Cooldown of your Ultimate Skill by 2 seconds.
        if (
          spiritBoonVal(nodes_map)['snake'].includes(
            'calm-before-the-storm',
          )
        ) {
          const Earth_Skills = new Set([
            'earth-spike',
            'landslide',
            'boulder',
            'petrify',
          ])
          const Storm_Skills = new Set([
            'wind-shear',
            'lightning-storm',
            'tornado',
            'hurricane',
            'cataclysm',
          ])
          let Calm_Before_The_Storm_Proc_Rate = 0
          for (const Other_Skill in Pre_Sim_Node['skill_use_rate']) {
            if (
              Earth_Skills.has(Other_Skill) ||
              Storm_Skills.has(Other_Skill)
            ) {
              Calm_Before_The_Storm_Proc_Rate +=
                0.1 *
                Pre_Sim_Node['skill_use_rate'][Other_Skill] *
                statVal(
                  nodes_map,
                  'Total_Lucky_Hit_Chance_Multiplier',
                ) *
                Pre_Sim_Node['cross_skill_stat'][Other_Skill][
                  'lucky_hit_chance'
                ] *
                Pre_Sim_Node['cross_skill_stat'][Other_Skill][
                  'total_hits'
                ]
            }
          }
          const alpha =
            Cooldown / (1 / Calm_Before_The_Storm_Proc_Rate + 2)
          Cooldown -= alpha * 2
        }

        return Math.max(1, Cooldown)
      },
    ),

    Grizzly_Rage_Duration: new StatsNode(
      'Grizzly_Rage_Duration',
      () => {
        let Duration = 10

        // Aspect of the Rampaging Werebeast : The duration of Grizzly Rage is increased by {1/5} seconds.
        // In addition, Critical Strikes while Grizzly Rage is active increase your Critical Strike Damage by x10% for the duration.
        // Critical Strike Damage bonus amount now has a maximum of 200%
        if (
          aspectVal(nodes_map, 'aspect-of-the-rampaging-werebeast')
            .length > 0
        ) {
          Duration += aspectVal(
            nodes_map,
            'aspect-of-the-rampaging-werebeast',
          )[0]
        }

        return Duration
      },
    ),

    // Petrify: Encase all Nearby enemies in stone, Stunning them for 3 seconds. You deal 30% increased Critical Strike Damage to enemies affected by Petrify.
    Petrify_Cooldown: new StatsNode('Petrify_Cooldown', () => {
      let Cooldown = 50

      Cooldown *= 1 - aggregationVal(nodes_map, 'cooldown-reduction')
      Cooldown *=
        1 -
        aggregationVal(
          nodes_map,
          'nature-magic-skill-cooldown-reduction',
        )

      // 'ultimate-skill-cooldown-reduction'
      if (tagsVal(nodes_map).has('ultimate')) {
        Cooldown *=
          1 -
          aggregationVal(
            nodes_map,
            'ultimate-skill-cooldown-reduction',
          )
      }

      const Pre_Sim_Node = druidPresimVal(nodes_map)

      // Snake Spirit Boon: Calm Before the Storm: Lucky Hit: Nature Magic Skills have up to a 10% chance to reduce the Cooldown of your Ultimate Skill by 2 seconds.
      if (
        spiritBoonVal(nodes_map)['snake'].includes(
          'calm-before-the-storm',
        )
      ) {
        const Earth_Skills = new Set([
          'earth-spike',
          'landslide',
          'boulder',
          'petrify',
        ])
        const Storm_Skills = new Set([
          'wind-shear',
          'lightning-storm',
          'tornado',
          'hurricane',
          'cataclysm',
        ])
        let Calm_Before_The_Storm_Proc_Rate = 0
        for (const Other_Skill in Pre_Sim_Node['skill_use_rate']) {
          if (
            Earth_Skills.has(Other_Skill) ||
            Storm_Skills.has(Other_Skill)
          ) {
            Calm_Before_The_Storm_Proc_Rate +=
              0.1 *
              Pre_Sim_Node['skill_use_rate'][Other_Skill] *
              statVal(
                nodes_map,
                'Total_Lucky_Hit_Chance_Multiplier',
              ) *
              Pre_Sim_Node['cross_skill_stat'][Other_Skill][
                'lucky_hit_chance'
              ] *
              Pre_Sim_Node['cross_skill_stat'][Other_Skill][
                'total_hits'
              ]
          }
        }
        const alpha =
          Cooldown / (1 / Calm_Before_The_Storm_Proc_Rate + 2)
        Cooldown -= alpha * 2
      }

      // Flickerstep (Generic Unique Boots): Each enemy you Evade through reduces your active Ultimate Cooldown by 2-4 seconds, up to 10 seconds.
      if (aspectVal(nodes_map, 'flickerstep').length != 0) {
        const Evade_Rate = 1 / 5
        const alpha =
          Cooldown /
          (1 / Evade_Rate + aspectVal(nodes_map, 'flickerstep')[0])
        Cooldown -= alpha * aspectVal(nodes_map, 'flickerstep')[0]
      }

      return Math.max(1, Cooldown)
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
        const Non_Physical_Damage_Reduction = statVal(
          nodes_map,
          'Non_Physical_Damage_Reduction',
        )
        const Cold_Resistance = statVal(nodes_map, 'Resistance_Cold')
        return (
          1 -
          (1 - Cold_Resistance) *
            (1 - Player_Damage_Reduction) *
            (1 - Non_Physical_Damage_Reduction)
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
        const Non_Physical_Damage_Reduction = statVal(
          nodes_map,
          'Non_Physical_Damage_Reduction',
        )
        const Fire_Resistance = statVal(nodes_map, 'Resistance_Fire')
        return (
          1 -
          (1 - Fire_Resistance) *
            (1 - Player_Damage_Reduction) *
            (1 - Non_Physical_Damage_Reduction)
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
        const Non_Physical_Damage_Reduction = statVal(
          nodes_map,
          'Non_Physical_Damage_Reduction',
        )
        const Lightning_Resistance = statVal(
          nodes_map,
          'Resistance_Lightning',
        )
        return (
          1 -
          (1 - Lightning_Resistance) *
            (1 - Player_Damage_Reduction) *
            (1 - Non_Physical_Damage_Reduction)
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
        const Non_Physical_Damage_Reduction = statVal(
          nodes_map,
          'Non_Physical_Damage_Reduction',
        )
        const Poison_Resistance = statVal(
          nodes_map,
          'Resistance_Poison',
        )
        return (
          1 -
          (1 - Poison_Resistance) *
            (1 - Player_Damage_Reduction) *
            (1 - Non_Physical_Damage_Reduction)
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
        const Non_Physical_Damage_Reduction = statVal(
          nodes_map,
          'Non_Physical_Damage_Reduction',
        )
        const Shadow_Resistance = statVal(
          nodes_map,
          'Resistance_Shadow',
        )

        return (
          1 -
          (1 - Shadow_Resistance) *
            (1 - Player_Damage_Reduction) *
            (1 - Non_Physical_Damage_Reduction)
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

      return (
        (Current_Life + Current_Barrier) /
        (1 - Effective_Damage_Reduction) /
        (1 - Dodge_Chance)
      )
    }),

    Shapeshift_Form: new StatsNode('Shapeshift_Form', () => {
      const Tags = tagsVal(nodes_map)
      if (Tags.has('werewolf')) {
        return 1
      }
      if (Tags.has('werebear')) {
        return 2
      }
      return 0
    }),

    Max_Dot_Duration: new StatsNode('Max_Dot_Duration', () => {
      let Dot_Duration = 0
      switch (currentSkillVal(nodes_map)['name']) {
        case 'poison-creeper':
          Dot_Duration = 2
          if (talentVal(nodes_map, 'ferocious-poison-creeper') > 0) {
            Dot_Duration += 3
          }
          break
        case 'rabies':
          Dot_Duration = 6
          if (talentVal(nodes_map, 'savage-rabies') > 0) {
            Dot_Duration = 4
          }
          break
        case 'claw':
          if (talentVal(nodes_map, 'fierce-claw') > 0) {
            Dot_Duration = 6
          }
          break
        case 'shred':
          if (talentVal(nodes_map, 'raging-shred') > 0) {
            Dot_Duration = 5
          }
          break
      }

      if (
        talentVal(nodes_map, 'toxic-claws') > 0 &&
        tagsVal(nodes_map).has('werewolf')
      ) {
        Dot_Duration = Math.max(
          Dot_Duration,
          4 * statVal(nodes_map, 'Critical_Chance'),
        )
      }

      return Dot_Duration
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
      const Pre_Sim_Node = druidPresimVal(nodes_map)
      let Kill_Rate = 0
      for (const Skill in Pre_Sim_Node['skill_use_rate']) {
        Kill_Rate +=
          Pre_Sim_Node['skill_use_rate'][Skill] *
          Pre_Sim_Node['cross_skill_stat'][Skill]['enemy_kills']
      }

      return Kill_Rate
    }),

    Enemy_Spread: new StatsNode('Enemy_Spread', () => {
      let enemy_spread = Number(
        toggleVal(nodes_map, 'enemy-spread-yards'),
      )
      const Pre_Sim_Node = druidPresimVal(nodes_map)
      const number_of_enemies = Number(
        toggleVal(nodes_map, 'number-of-enemies'),
      )

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

      // airidahs-inexorable-will: When casting an Ultimate Skill and again 5 seconds after, Pull in Distant enemies and deal [{value1}] Physical damage to them. This damage is increased by 1%[x] per 1 point of Willpower you have.
      if (
        aspectVal(nodes_map, 'airidahs-inexorable-will').length > 0
      ) {
        let Airidahs_Inexorable_Will_Rate = 0
        if (allSkillsVal(nodes_map).has('grizzly-rage')) {
          Airidahs_Inexorable_Will_Rate +=
            2 / statVal(nodes_map, 'Grizzly_Rage_Cooldown')
        }
        if (allSkillsVal(nodes_map).has('petrify')) {
          Airidahs_Inexorable_Will_Rate +=
            2 / statVal(nodes_map, 'Petrify_Cooldown')
        }
        if (
          allSkillsVal(nodes_map).has('lacerate') &&
          'lacerate' in Pre_Sim_Node['skill_use_rate']
        ) {
          Airidahs_Inexorable_Will_Rate +=
            2 / Pre_Sim_Node['skill_use_rate']['lacerate']
        }
        if (
          allSkillsVal(nodes_map).has('cataclysm') &&
          'cataclysm' in Pre_Sim_Node['skill_use_rate']
        ) {
          Airidahs_Inexorable_Will_Rate +=
            2 / Pre_Sim_Node['skill_use_rate']['cataclysm']
        }
        // If spread is very large, pull range should extend farther up to a max distance 50 yards
        let Pull_Range = 10
        if (enemy_spread > 30) {
          Pull_Range = Math.min(20, (enemy_spread - 10) / 2)
        }
        const Distant_Enemies_Pulled =
          1 - Math.min(1, 10 ** 2 / enemy_spread ** 2)
        enemy_spread -=
          Pull_Range *
          Math.min(1, Airidahs_Inexorable_Will_Rate) *
          Distant_Enemies_Pulled
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

    Number_Of_Cooldowns: new StatsNode('Number_Of_Cooldowns', () => {
      let Number_Of_Cooldowns = 0
      const Core_Skills = new Set([
        'pulverize',
        'shred',
        'tornado',
        'lightning-storm',
        'landslide',
      ])
      const Basic_Skills = new Set([
        'earth-spike',
        'wind-shear',
        'storm-strike',
        'maul',
        'claw',
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
        const Pre_Sim_Node = druidPresimVal(nodes_map)
        const number_of_enemies = Number(
          toggleVal(nodes_map, 'number-of-enemies'),
        )

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
          let Number_Of_Wolves = 0
          // Wolves Passive: Summon 2 wolf companions that bite enemies for 11% damage.
          if (allSkillsVal(nodes_map).has('wolves')) {
            Number_Of_Wolves = 2

            // Aspect of the Stampede : Gain 1 additional Companion. In addition, your Companion Skills deal x{100/150}% bonus damage.
            Number_Of_Wolves += Number(
              aspectVal(nodes_map, 'aspect-of-the-stampede').length >
                0,
            )
          }

          // Ravens Passive: 1 Raven flies above you and periodically attacks your enemies for {24%} damage every 5 seconds.
          let Number_Of_Ravens = 0
          if (allSkillsVal(nodes_map).has('ravens')) {
            Number_Of_Ravens += 1

            // Brutal Ravens: 2 additional Ravens periodically attack enemies and Increase the passive damage of Ravens by x40%..
            Number_Of_Ravens +=
              2 *
              Number(aspectVal(nodes_map, 'brutal-ravens').length > 0)

            // Aspect of the Stampede : Gain 1 additional Companion. In addition, your Companion Skills deal x{100/150}% bonus damage.
            Number_Of_Ravens += Number(
              aspectVal(nodes_map, 'aspect-of-the-stampede').length >
                0,
            )
          }

          let Number_Of_Posion_Creeper = 0
          if (allSkillsVal(nodes_map).has('poison-creeper')) {
            Number_Of_Posion_Creeper += 1

            // Aspect of the Stampede : Gain 1 additional Companion. In addition, your Companion Skills deal x{100/150}% bonus damage.
            Number_Of_Posion_Creeper += Number(
              aspectVal(nodes_map, 'aspect-of-the-stampede').length >
                0,
            )
          }

          const Companion_Hit_Rate =
            Number_Of_Wolves +
            Number_Of_Ravens / 5 +
            Number_Of_Posion_Creeper / 6
          Vampiric_Curse_Rate +=
            0.3 *
            (statVal(nodes_map, 'Vampiric_Bat_Rate') +
              Companion_Hit_Rate)
        }

        return Math.min(1, Vampiric_Curse_Rate / number_of_enemies)
      },
    ),

    Vampiric_Bat_Rate: new StatsNode('Vampiric_Bat_Rate', () => {
      let Vampiric_Bat_Rate = 0

      const Pre_Sim_Node = druidPresimVal(nodes_map)
      const number_of_enemies = Number(
        toggleVal(nodes_map, 'number-of-enemies'),
      )

      // Vampiric Power flowing-veins
      // Casting a Mastery, Weapon Mastery, Macabre, Wrath, or Imbuement Skill calls a bat ally to attack nearby enemies, dealing 80% Physical damage with a 30% chance to Stun.	call-familiar
      // You deal 60% increased Damage Over Time to enemies that are moving or affected by a Vampiric Curse.
      if (vampiricPowerVal(nodes_map, 'flowing-veins')) {
        const Wrath_Skills = new Set([
          'hurricane',
          'boulder',
          'rabies',
          'trample',
        ])
        const Defensive_Skills = new Set([
          'earthen-bulwark',
          'cyclone-armor',
          'blood-howl',
          'debilitating-roar',
        ])
        for (const Skill of allSkillsVal(nodes_map)) {
          if (
            Wrath_Skills.has(Skill) &&
            Skill in Pre_Sim_Node['skill_use_rate']
          ) {
            Vampiric_Bat_Rate += Pre_Sim_Node['skill_use_rate'][Skill]
          } else if (Defensive_Skills.has(Skill)) {
            switch (Skill) {
              case 'earthen-bulwark':
                if (
                  'earthen-bulwark' in Pre_Sim_Node['skill_use_rate']
                ) {
                  Vampiric_Bat_Rate +=
                    Pre_Sim_Node['skill_use_rate'][Skill]
                }
                break
              case 'cyclone-armor':
                if (
                  'cyclone-armor' in Pre_Sim_Node['skill_use_rate']
                ) {
                  Vampiric_Bat_Rate +=
                    Pre_Sim_Node['skill_use_rate'][Skill]
                }
                break
              case 'blood-howl':
                Vampiric_Bat_Rate +=
                  1 / statVal(nodes_map, 'Blood_Howl_Cooldown')
                break
              case 'debilitating-roar':
                Vampiric_Bat_Rate +=
                  1 / statVal(nodes_map, 'Debilitating_Roar_Cooldown')
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

export function CreateDruidTriggerNodes(
  nodes_map: NodesMap,
): Record<string, TriggerNode> {
  return {
    Skill_Dot_Damage: new TriggerNode('Skill_Dot_Damage', () => {
      const Pre_Sim_Node = druidPresimVal(nodes_map)
      // Primary Components
      const Weapon_Damage = aggregationVal(nodes_map, 'weapon-damage')
      const Skill_Name = currentSkillVal(nodes_map)['name']
      let Skill_Ranks = talentVal(nodes_map, Skill_Name)
      // Ballistic Aspect : When you have Fortify your Earth Skills gain +2 Ranks.
      if (
        aspectVal(nodes_map, 'ballistic-aspect').length > 0 &&
        Number(toggleVal(nodes_map, 'percent-fortify')) > 0 &&
        tagsVal(nodes_map).has('earth')
      ) {
        Skill_Ranks += 3
      }
      // Mad wolfs Glee : Werewolf form is now your true form, and you gain +3 Ranks to all Werewolf Skills.
      if (
        aspectVal(nodes_map, 'mad-wolfs-glee').length > 0 &&
        tagsVal(nodes_map).has('werewolf')
      ) {
        Skill_Ranks += 3
      }
      // Insatiable Fury : Werebear form is now your true form, and you gain +3 Ranks to all Werebear Skills.
      if (
        aspectVal(nodes_map, 'insatiable-fury').length > 0 &&
        tagsVal(nodes_map).has('werebear')
      ) {
        Skill_Ranks += 3
      }

      // Stormshifter's Aspect : While Hurricane is active, gain +2 Ranks to your Shapeshifting Skills.
      if (
        aspectVal(nodes_map, 'stormshifters-aspect').length > 0 &&
        tagsVal(nodes_map).has('shapeshifting')
      ) {
        let Hurricane_Uptime = 0
        if ('hurricane' in Pre_Sim_Node['skill_use_rate']) {
          Hurricane_Uptime =
            Pre_Sim_Node['skill_use_rate']['hurricane'] * 8
        }
        Skill_Ranks += 2 * Math.min(1, Hurricane_Uptime)
      }

      let Skill_DoT_Modifier =
        currentSkillVal(nodes_map)['modifiers']['dot'] *
        (1 + 0.1 * (Skill_Ranks - 1))

      // Ultimates Cannot Gain +Ranks
      if (tagsVal(nodes_map).has('ultimate')) {
        Skill_DoT_Modifier =
          currentSkillVal(nodes_map)['modifiers']['dot']
      }

      const Critical_Chance = statVal(nodes_map, 'Critical_Chance')
      const number_of_enemies = Number(
        toggleVal(nodes_map, 'number-of-enemies'),
      )
      const enemy_spread = Number(statVal(nodes_map, 'Enemy_Spread'))
      // Secondary Components
      let Multiple_Hits_Multiplier = statVal(
        nodes_map,
        'Hits_Multiplier',
      )

      // Rabies: Shapeshift into a Werewolf and perform an infectious bite on the target dealing {['28%', '31%', '34%', '36%', '39%']} damage, and applying an additional {53%} Poisoning damage over 6 seconds.
      if (currentSkillVal(nodes_map)['name'] == 'rabies') {
        Multiple_Hits_Multiplier =
          1 +
          Math.min(15 ** 2 / enemy_spread ** 2, 1) *
            (number_of_enemies - 1)
      }

      // // Fierce Claw: Claw applies 15% Poisoning damage over 6 seconds.
      // if (
      //   currentSkillVal(nodes_map)['name'] == 'claw' &&
      //   talentVal(nodes_map, 'fierce-claw') > 0
      // ) {
      //   Skill_DoT_Modifier += 0.15
      // }

      // // Raging Shred: Shred's third combo attack is larger and applies an additional 70% Poisoning damage over 5 seconds.
      // if (
      //   currentSkillVal(nodes_map)['name'] == 'shred' &&
      //   talentVal(nodes_map, 'raging-shred') > 0
      // ) {
      //   Skill_DoT_Modifier += 0.7
      // }

      // // Toxic Claws: Critical Strikes with Werewolf Skills deal {['8%', '15%', '23%']} of their Base damage as Poisoning damage over 4 seconds.
      // if (tagsVal(nodes_map).has('werewolf')) {
      //   Skill_DoT_Modifier +=
      //     0.075 *
      //     Critical_Chance *
      //     talentVal(nodes_map, 'toxic-claws') *
      //     currentSkillVal(nodes_map)['modifiers']['flat']
      // }

      const Tags_Node = CopyTags(tagsVal(nodes_map))
      Tags_Node.add('damage-over-time')
      const Damage_Multiplier = DruidDamageMultiplier(
        Tags_Node,
        nodes_map,
      )

      // Calculation
      return (
        Skill_DoT_Modifier *
        Weapon_Damage *
        Damage_Multiplier *
        Multiple_Hits_Multiplier *
        statVal(nodes_map, 'Number_Of_Cast')
      )
    }),

    Flat_Damage: new TriggerNode('Flat_Damage', () => {
      const Pre_Sim_Node = druidPresimVal(nodes_map)
      // Primary Components
      const Weapon_Damage = aggregationVal(nodes_map, 'weapon-damage')
      const Skill_Name = currentSkillVal(nodes_map)['name']
      let Skill_Ranks = talentVal(nodes_map, Skill_Name)
      // Ballistic Aspect : When you have Fortify your Earth Skills gain +2 Ranks.
      if (
        aspectVal(nodes_map, 'ballistic-aspect').length > 0 &&
        Number(toggleVal(nodes_map, 'percent-fortify')) > 0 &&
        tagsVal(nodes_map).has('earth')
      ) {
        Skill_Ranks += 2
      }
      // Mad wolfs Glee : Werewolf form is now your true form, and you gain +2 Ranks to all Werewolf Skills.
      if (
        aspectVal(nodes_map, 'mad-wolfs-glee').length > 0 &&
        tagsVal(nodes_map).has('werewolf')
      ) {
        Skill_Ranks += 3
      }
      // Insatiable Fury : Werebear form is now your true form, and you gain +2 Ranks to all Werebear Skills.
      if (
        aspectVal(nodes_map, 'insatiable-fury').length > 0 &&
        tagsVal(nodes_map).has('werebear')
      ) {
        Skill_Ranks += 3
      }

      // Stormshifter's Aspect : While Hurricane is active, gain +2 Ranks to your Shapeshifting Skills.
      if (
        aspectVal(nodes_map, 'stormshifters-aspect').length > 0 &&
        tagsVal(nodes_map).has('shapeshifting')
      ) {
        let Hurricane_Uptime = 0
        if ('hurricane' in Pre_Sim_Node['skill_use_rate']) {
          Hurricane_Uptime =
            Pre_Sim_Node['skill_use_rate']['hurricane'] * 8
        }
        Skill_Ranks += 2 * Math.min(1, Hurricane_Uptime)
      }

      let Skill_Flat_Modifier =
        currentSkillVal(nodes_map)['modifiers']['flat'] *
        (1 + 0.1 * (Skill_Ranks - 1))

      // Ultimates Cannot Gain +Ranks
      if (tagsVal(nodes_map).has('ultimate')) {
        Skill_Flat_Modifier =
          currentSkillVal(nodes_map)['modifiers']['flat']
      }

      const Hits_Multiplier = statVal(nodes_map, 'Hits_Multiplier')

      // Innate Earthen Bulwark: Rock shrapnel flies outward when Earthen Bulwark is destroyed or expires, dealing [X] damage to surrounding enemies. This damage is increased by Barrier bonuses.
      if (
        Skill_Name == 'earthen-bulwark' &&
        talentVal(nodes_map, 'innate-earthen-bulwark') > 0
      ) {
        Skill_Flat_Modifier = 0.3 * (1 + 0.1 * (Skill_Ranks - 1))
      }

      // Calculation

      const Tags_Node = CopyTags(tagsVal(nodes_map))
      Tags_Node.delete('poison')
      Tags_Node.delete('damage-over-time')
      const Damage_Multiplier = DruidDamageMultiplier(
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
        let Non_Skill_Damage_Total = 0
        const number_of_enemies = Number(
          toggleVal(nodes_map, 'number-of-enemies'),
        )
        const enemy_spread = Number(
          statVal(nodes_map, 'Enemy_Spread'),
        )
        const Total_Hits = statVal(nodes_map, 'Total_Hits')
        const Weapon_Damage = aggregationVal(
          nodes_map,
          'weapon-damage',
        )

        // Fierce Claw: Claw applies 15% Poisoning damage over 6 seconds.
        if (
          currentSkillVal(nodes_map)['name'] == 'claw' &&
          talentVal(nodes_map, 'fierce-claw') == 1
        ) {
          Non_Skill_Damage_Total +=
            0.15 *
            Weapon_Damage *
            DruidDamageMultiplier(
              new Set(['poison', 'damage-over-time']),
              nodes_map,
            )
        }

        // Raging Shred: Shred's third combo attack is larger and applies an additional 70% Poisoning damage over 5 seconds.
        if (
          currentSkillVal(nodes_map)['name'] == 'shred' &&
          talentVal(nodes_map, 'raging-shred') == 1
        ) {
          const Third_Shred_Attack_Hits =
            1 +
            ProbabilityInCone(
              10,
              1 / 2,
              statVal(nodes_map, 'Enemy_Spread'),
            ) *
              (number_of_enemies - 1)
          Non_Skill_Damage_Total +=
            0.7 *
            Weapon_Damage *
            DruidDamageMultiplier(
              new Set(['poison', 'damage-over-time']),
              nodes_map,
            ) *
            Third_Shred_Attack_Hits
        }

        // Toxic Claws: Critical Strikes with Werewolf Skills deal {['7.5%', '15%', '22.5%']} of their Base damage as Poisoning damage over 4 seconds.
        if (tagsVal(nodes_map).has('werewolf')) {
          const Skill_Ranks =
            talentVal(nodes_map, currentSkillVal(nodes_map)['name']) +
            3 *
              Number(
                aspectVal(nodes_map, 'mad-wolfs-glee').length > 0,
              )
          const Base_Damage =
            Weapon_Damage *
            currentSkillVal(nodes_map)['modifiers']['flat'] *
            (1 + 0.1 * (Skill_Ranks - 1))

          Non_Skill_Damage_Total += 0.075 * Base_Damage
          statVal(nodes_map, 'Critical_Chance') *
            talentVal(nodes_map, 'toxic-claws') *
            DruidDamageMultiplier(
              new Set(['poison', 'damage-over-time']),
              nodes_map,
            ) *
            statVal(nodes_map, 'Total_Hits')
        }

        // Andariels Visage: Lucky Hit: Up to a [[10 - 20]|%|] chance to trigger a poison nova that applies [Affix_Flat_Value_1] Poisoning damage over 5 seconds to enemies in the area.
        if (aspectVal(nodes_map, 'andariels-visage').length > 0) {
          const Average_Procs =
            statVal(nodes_map, 'Total_Lucky_Hit_Chance_Multiplier') *
            aspectVal(nodes_map, 'andariels-visage')[0] *
            statVal(nodes_map, 'Total_Hits')
          const Average_Hits =
            1 +
            Math.min(
              10 ** 2 / statVal(nodes_map, 'Enemy_Spread') ** 2,
              1,
            ) *
              (number_of_enemies - 1)

          Non_Skill_Damage_Total +=
            Average_Procs *
            Average_Hits *
            aspectVal(nodes_map, 'andariels-visage')[1] *
            DruidDamageMultiplier(
              new Set(['poison', 'damage-over-time']),
              nodes_map,
            )
        }

        Non_Skill_Damage_Total +=
          statVal(nodes_map, 'Dot_Companion_Damage') *
          DruidDamageMultiplier(
            new Set(['poison', 'damage-over-time']),
            nodes_map,
          )

        // Constricting Tendrils: Lucky Hit: Nature Magic Skills have up to a 15% chance to entangle the enemy with vines, Immobilizing them for 2 seconds and Poisoning them for 120% of the Base damage dealt over 4 seconds.
        if (
          paragonVal(nodes_map, 'constricting-tendrils') &&
          tagsVal(nodes_map).has('nature-magic')
        ) {
          const Skill_Name = currentSkillVal(nodes_map)['name']
          Non_Skill_Damage_Total +=
            1.2 *
            currentSkillVal(nodes_map)['modifiers']['flat'] *
            (1 + 0.1 * (talentVal(nodes_map, Skill_Name) - 1)) *
            Total_Hits *
            DruidDamageMultiplier(
              new Set(['poison', 'damage-over-time']),

              nodes_map,
            )
        }

        // Aspect of the Ursine Horror : Pulverize is now also an Earth Skill. After casting Pulverize, tectonic spikes continue to deal {175/250} damage over 2.0 seconds. // TODO
        if (
          aspectVal(nodes_map, 'aspect-of-the-ursine-horror').length >
            0 &&
          currentSkillVal(nodes_map)['name'] == 'pulverize'
        ) {
          Non_Skill_Damage_Total +=
            aspectVal(nodes_map, 'aspect-of-the-ursine-horror')[0] *
            (1 +
              Math.min(1, 10 ** 2 / enemy_spread ** 2) *
                (number_of_enemies - 1)) *
            DruidDamageMultiplier(
              new Set(['earth', 'damage-over-time']),

              nodes_map,
            )
        }
        return Non_Skill_Damage_Total
      },
    ),

    Non_Skill_Flat_Damage: new TriggerNode(
      'Non_Skill_Flat_Damage',
      () => {
        const Weapon_Damage = aggregationVal(
          nodes_map,
          'weapon-damage',
        )
        const Critical_Chance = statVal(nodes_map, 'Critical_Chance')
        const number_of_enemies = Number(
          toggleVal(nodes_map, 'number-of-enemies'),
        )
        const enemy_spread = Number(
          statVal(nodes_map, 'Enemy_Spread'),
        )
        const Total_Hits = statVal(nodes_map, 'Total_Hits')
        const Pre_Sim_Node = druidPresimVal(nodes_map)

        let Non_Skill_Damage_Total = 0

        // Bad Omen: Lucky Hit: Up to a {['10%', '20%', '30%']} chance when dealing damage to a Vulnerable, Immobilized or Stunned enemy that a lightning strike also hits dealing 55% damage.
        if (
          toggleVal(nodes_map, 'enemy-immobilized') ||
          toggleVal(nodes_map, 'enemy-stunned') ||
          statVal(nodes_map, 'Enemy_Vulnerable') > 0
        ) {
          let Condition_Multiplier = 0
          if (
            toggleVal(nodes_map, 'enemy-immobilized') ||
            toggleVal(nodes_map, 'enemy-stunned')
          ) {
            Condition_Multiplier = 1
          } else if (statVal(nodes_map, 'Enemy_Vulnerable') > 0) {
            Condition_Multiplier = statVal(
              nodes_map,
              'Enemy_Vulnerable',
            )
          }
          Non_Skill_Damage_Total +=
            0.55 *
            Weapon_Damage *
            Condition_Multiplier *
            Math.min(
              statVal(
                nodes_map,
                'Total_Lucky_Hit_Chance_Multiplier',
              ) *
                Total_Hits *
                0.1 *
                talentVal(nodes_map, 'bad-omen'),
              1,
            ) *
            DruidDamageMultiplier(new Set(['lightning']), nodes_map)
        }

        // Charged Atmosphere: Every {[14, 11, 8]} seconds, a lightning bolt hits a Nearby enemy dealing 45% damage.
        if (talentVal(nodes_map, 'charged-atmosphere') > 0) {
          Non_Skill_Damage_Total +=
            ((0.45 *
              Weapon_Damage *
              statVal(nodes_map, 'Elapsed_Time')) /
              (17 - 3 * talentVal(nodes_map, 'charged-atmosphere'))) *
            DruidDamageMultiplier(new Set(['lightning']), nodes_map)
        }

        // Aspect of the Trampled Earth :
        // Trample now summons 6.0 Landslide pillars of earth during its duration that deal {70/80}% normal damage. Trample is now also a Nature Magic and Earth Skill.
        if (
          aspectVal(nodes_map, 'aspect-of-the-trampled-earth')
            .length > 0 &&
          currentSkillVal(nodes_map)['name'] == 'trample'
        ) {
          const Landslide_Damage =
            1.5 *
            aspectVal(nodes_map, 'aspect-of-the-trampled-earth')[0] *
            Weapon_Damage *
            (1 + 0.1 * (talentVal(nodes_map, 'landslide') - 1))
          for (let i = 0; i < 6; i++) {
            const Landslide_HIts = ProbabilityInCircle(
              i * 5,
              10,
              statVal(nodes_map, 'Enemy_Spread'),
            )
            Non_Skill_Damage_Total +=
              Landslide_Damage *
              Landslide_HIts *
              DruidDamageMultiplier(
                new Set(['earth', 'nature-magic', 'physical']),
                nodes_map,
              )
          }
        }

        // runeworkers Conduit Aspect : Critical Strikes with Storm Skills charge the air around you for {1/2} seconds causing a Lightning Strike to periodically hit an enemy in the area for 500 Lightning damage. This duration can be extended by additional Critical Strikes.
        if (
          tagsVal(nodes_map).has('storm') &&
          aspectVal(nodes_map, 'runeworkers-conduit-aspect').length >
            0
        ) {
          Non_Skill_Damage_Total +=
            500 *
            aspectVal(nodes_map, 'runeworkers-conduit-aspect')[0] *
            Critical_Chance *
            DruidDamageMultiplier(
              new Set(['lightning']),

              nodes_map,
            )
        }

        Non_Skill_Damage_Total +=
          statVal(nodes_map, 'Flat_Companion_Damage') *
          DruidDamageMultiplier(new Set(['physical']), nodes_map)

        // Overload: Lucky Hit: Dealing Lightning damage has up to a 40% chance to cause the target to emit a static discharge, dealing 25% Lightning damage to surrounding enemies.
        if (
          spiritBoonVal(nodes_map)['snake'].includes('overload') &&
          tagsVal(nodes_map).has('lightning')
        ) {
          const proc_chance = Math.min(
            0.4 *
              statVal(nodes_map, 'Total_Lucky_Hit_Chance_Multiplier'),
            1,
          )
          let p: number
          if (toggleVal(nodes_map, 'enemy-distant')) {
            p = ProbabilityInCircle(25, 15, enemy_spread)
          } else {
            p = Math.min(15 ** 2 / enemy_spread ** 2, 1)
          }
          Non_Skill_Damage_Total +=
            0.25 *
            Weapon_Damage *
            proc_chance *
            (1 + p * (number_of_enemies - 1)) *
            Total_Hits *
            DruidDamageMultiplier(
              new Set(['lightning']),

              nodes_map,
            )
        }

        // Lightning dancers Aspect : Lightning Storm Critical Strikes spawn 3.0 Dancing Bolts that seek enemies in the area dealing {70/80%} Lightning damage.
        if (
          currentSkillVal(nodes_map)['name'] == 'lightning-storm' &&
          aspectVal(nodes_map, 'lightning-dancers-aspect').length > 0
        ) {
          // TODO: Will the bolts always hit something if its there? Is there an area component?
          Non_Skill_Damage_Total +=
            3 *
            aspectVal(nodes_map, 'lightning-dancers-aspect')[0] *
            statVal(nodes_map, 'Critical_Chance') *
            statVal(nodes_map, 'Total_Hits') *
            DruidDamageMultiplier(new Set(['lightning']), nodes_map)
        }

        // Stormclaw's Aspect : Critical Strikes with Shred deal {20/30}% of the damage dealt as Lightning damage to the target and surrounding enemies.
        if (
          aspectVal(nodes_map, 'stormclaws-aspect').length > 0 &&
          currentSkillVal(nodes_map)['name'] == 'shred'
        ) {
          const Lightning_Hits =
            1 +
            ProbabilityInCircle(
              5,
              10,
              statVal(nodes_map, 'Enemy_Spread'),
            )

          Non_Skill_Damage_Total +=
            aspectVal(nodes_map, 'stormclaws-aspect')[0] *
            triggerVal(nodes_map, 'Flat_Damage')
          Lightning_Hits *
            statVal(nodes_map, 'Total_Hits') *
            statVal(nodes_map, 'Critical_Chance')
          DruidDamageMultiplier(new Set(['lightning']), nodes_map)
        }

        const Lightning_Skills = new Set([
          'lightning-storm',
          'cataclysm',
        ])
        // Overcharged Aspect : Lucky Hit: Up to a {10/20}% chance when dealing Lightning damage to overload the target for 3.0 seconds, causing any direct damage you deal to them to pulse [70% Item Power Strength] additional damage to surrounding enemies. // TODO
        if (
          currentSkillVal(nodes_map)['modifiers']['flat'] > 0 &&
          aspectVal(nodes_map, 'overcharged-aspect').length != 0
        ) {
          let Overcharged_Aspect_Uptime = 0
          for (const Other_Skill in Pre_Sim_Node['skill_use_rate']) {
            if (Lightning_Skills.has(Other_Skill)) {
              Overcharged_Aspect_Uptime +=
                (3 *
                  aspectVal(nodes_map, 'overcharged-aspect')[0] *
                  Pre_Sim_Node['skill_use_rate'][Other_Skill] *
                  Pre_Sim_Node['cross_skill_stat'][Other_Skill][
                    'lucky_hit_chance'
                  ] *
                  Pre_Sim_Node['cross_skill_stat'][Other_Skill][
                    'total_hits'
                  ]) /
                number_of_enemies
            }
          }
          Non_Skill_Damage_Total +=
            aspectVal(nodes_map, 'overcharged-aspect')[1] *
            statVal(nodes_map, 'Total_Hits') *
            Math.min(1, Overcharged_Aspect_Uptime) *
            DruidDamageMultiplier(
              new Set(['lightning']),

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
              DruidDamageMultiplier(new Set(Dot_Tag[0]), nodes_map) *
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
              DruidDamageMultiplier(new Set(['poison']), nodes_map) *
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
            DruidDamageMultiplier(new Set(['physical']), nodes_map) *
            Blood_Boil_Hits *
            Overpower_Chance
        }

        return Non_Skill_Damage_Total
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

    Total_Damage_Over_Time: new TriggerNode(
      'Total_Damage_Over_Time',
      () => {
        const dot_damage =
          triggerVal(nodes_map, 'Skill_Dot_Damage') +
          triggerVal(nodes_map, 'Non_Skill_Dot_Damage')

        return dot_damage * statVal(nodes_map, 'Number_Of_Cast')
      },
    ),
  }
}
