/* eslint-disable @typescript-eslint/no-unused-vars */

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
  malignantHeartVal,
  paragonVal,
  roguePresimVal,
  seneschalConstructVal,
  skillVal,
  specializationVal,
  statVal,
  tagsVal,
  talentVal,
  toggleVal,
  triggerVal,
  vampiricPowerVal,
} from './graph_values'

/*
Here we build the computation graph for the Rogue. We construct maps for each type of node which contain all nodes of that
type. For nodes types which have no dependencies, we have functions to manually modify and set the value for that node. For
node types which do depend on other nodes, we pass an `update_value_function` into the constructor which uses the value of
other nodes to compute the value of that node. The value need only be computed a single time once all the root nodes are fixed.
We start with the nodes which have no dependencies.
*/

function RogueDamageMultiplier(
  tags: Set<string>,
  nodes_map: NodesMap,
) {
  const Pre_Sim_Node = roguePresimVal(nodes_map)
  const enemy_spread = Number(statVal(nodes_map, 'Enemy_Spread'))
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

  Generic_Damage_Bucket_Multiplier += aggregationVal(
    nodes_map,
    'damage',
  )

  Generic_Damage_Bucket_Multiplier +=
    Number(tags.has('damage-over-time')) *
    aggregationVal(nodes_map, 'damage-over-time')

  Generic_Damage_Bucket_Multiplier +=
    Number(toggleVal(nodes_map, 'enemy-affected-by-shadow')) *
    aggregationVal(
      nodes_map,
      'damage-to-affected-by-shadow-damage-over-time-enemies',
    )

  Generic_Damage_Bucket_Multiplier +=
    Number(toggleVal(nodes_map, 'enemy-bleeding')) *
    aggregationVal(nodes_map, 'damage-to-bleeding-enemies')

  Generic_Damage_Bucket_Multiplier +=
    Number(toggleVal(nodes_map, 'enemy-burning')) *
    aggregationVal(nodes_map, 'damage-to-burning-enemies')

  Generic_Damage_Bucket_Multiplier +=
    statVal(nodes_map, 'Enemy_Chilled') *
    aggregationVal(nodes_map, 'damage-to-chilled-enemies')

  Generic_Damage_Bucket_Multiplier += toggleVal(
    nodes_map,
    'enemy-distant',
  )
    ? aggregationVal(nodes_map, 'damage-to-distant-enemies')
    : aggregationVal(nodes_map, 'damage-to-close-enemies')

  Generic_Damage_Bucket_Multiplier +=
    statVal(nodes_map, 'Enemy_Crowd_Controlled') *
    aggregationVal(nodes_map, 'damage-to-crowd-controlled-enemies')

  Generic_Damage_Bucket_Multiplier +=
    Number(toggleVal(nodes_map, 'enemy-dazed')) *
    aggregationVal(nodes_map, 'damage-to-daze-enemies')

  Generic_Damage_Bucket_Multiplier +=
    (aggregationVal(nodes_map, 'damage-to-elites') *
      Number(toggleVal(nodes_map, 'enemy-elite'))) /
    number_of_enemies

  Generic_Damage_Bucket_Multiplier +=
    Number(toggleVal(nodes_map, 'enemy-frozen')) *
    aggregationVal(nodes_map, 'damage-to-freeze-enemies')

  Generic_Damage_Bucket_Multiplier +=
    0.2 * aggregationVal(nodes_map, 'damage-to-healthy-enemies')

  Generic_Damage_Bucket_Multiplier +=
    0.35 * aggregationVal(nodes_map, 'damage-to-injured-enemies')

  Generic_Damage_Bucket_Multiplier +=
    Number(toggleVal(nodes_map, 'enemy-poisoned')) *
    aggregationVal(nodes_map, 'damage-to-poisoned-enemies')

  Generic_Damage_Bucket_Multiplier +=
    Number(toggleVal(nodes_map, 'enemy-stunned')) *
    aggregationVal(nodes_map, 'damage-to-stun-enemies')

  Generic_Damage_Bucket_Multiplier +=
    Number(toggleVal(nodes_map, 'enemy-trapped')) *
    aggregationVal(nodes_map, 'damage-to-trap-enemies')

  Generic_Damage_Bucket_Multiplier +=
    Number(
      Number(toggleVal(nodes_map, 'percent-fortify')) >=
        Number(toggleVal(nodes_map, 'percent-life')),
    ) * aggregationVal(nodes_map, 'damage-while-fortified')

  Generic_Damage_Bucket_Multiplier +=
    Number(toggleVal(nodes_map, 'percent-life')) >= 0.8
      ? aggregationVal(nodes_map, 'damage-while-healthy')
      : 0

  Generic_Damage_Bucket_Multiplier +=
    Number(tags.has('shadow-clone')) *
    aggregationVal(nodes_map, 'shadow-clone-damage')

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

  //'damage-with-stun-grenade', explosive glyph
  Generic_Damage_Bucket_Multiplier +=
    Number(tags.has('stun-grenade')) *
    aggregationVal(nodes_map, 'damage-with-stun-grenade')

  Generic_Damage_Bucket_Multiplier +=
    aggregationVal(nodes_map, 'vulnerable-damage') *
    statVal(nodes_map, 'Enemy_Vulnerable')

  // vulnerable-damage
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

    // Enhanced Barrage: Barrage's ricochet chance is increased to 100% for arrows that damage a Vulnerable enemy or Critical Strike an enemy. // DONE
    // Advanced Barrage: Whenever a single cast of Barrage ricochets at least 4 times, your next cast gains 20% increased Critical Strike Chance.
    if (
      currentSkillVal(nodes_map)['name'] == 'barrage' &&
      tags.has('skill')
    ) {
      // Assume a shotgun if enemy near.
      let prob_4_hits = 1
      let prob_5_hits = 1
      if (toggleVal(nodes_map, 'enemy-distant')) {
        // Chance that an enemy is near a randomly hit enemy.
        const p = ProbabilityInCone(60, 1 / 6, enemy_spread)
        prob_4_hits = BinomialProbability(number_of_enemies - 1, p, 3)
        prob_5_hits =
          1 - BinomialDistribution(number_of_enemies - 1, p, 3)
      }
      let Ricochet_Chance = 0.2
      // Enhanced Barrage Barrage's ricochet chance is increased to 100% for arrows that damage a Vulnerable enemy or Critical Strike an enemy.
      if (talentVal(nodes_map, 'enhanced-barrage') > 0) {
        if (toggleVal(nodes_map, 'enemy-vulnerable')) {
          Ricochet_Chance = 1
        } else {
          Ricochet_Chance =
            1 -
            (1 - Ricochet_Chance) *
              (1 - Crit_Chance) *
              (1 - statVal(nodes_map, 'Enemy_Vulnerable'))
        }
      }
      Crit_Chance +=
        0.2 *
        (Ricochet_Chance ** 4 * prob_4_hits +
          0.2 *
            (1 - BinomialDistribution(5, Ricochet_Chance, 3)) *
            prob_5_hits) *
        Number(talentVal(nodes_map, 'advanced-barrage') > 0)
    }

    // countering concealment: The Skill that breaks Concealment will always be a guaranteed Critical Strike.
    if (
      tags.has('skill') &&
      allSkillsVal(nodes_map).has('concealment') &&
      talentVal(nodes_map, 'countering-concealment') > 0 &&
      currentSkillVal(nodes_map)['name'] in
        Pre_Sim_Node['skill_use_rate']
    ) {
      let Total_Skill_Use_Rate = 0
      for (const Skill in Pre_Sim_Node['skill_use_rate']) {
        Total_Skill_Use_Rate += Pre_Sim_Node['skill_use_rate'][Skill]
      }
      const Concealment_Rate =
        1 / Math.max(statVal(nodes_map, 'Concealment_Cooldown'), 1)
      Crit_Chance +=
        (1 - Crit_Chance) *
        Math.min(Concealment_Rate / Total_Skill_Use_Rate, 1)
    }

    // Precision: Critical Strikes with Marksman Skills grant you Precision. You gain 4% increased Critical Strike Damage per stack of Precision, up to a maximum of 20%.
    // At max Precision, your next marksman skill is a guaranteed crit with 40% increased Critical Strike Damage. You then reset your stacks.
    if (
      tags.has('skill') &&
      talentVal(nodes_map, 'precision') > 0 &&
      tags.has('marksman')
    ) {
      const Marksman_Skills = new Set([
        'puncture',
        'heartseeker',
        'forceful-arrow',
        'rain-of-arrows',
        'barrage',
        'rapid-fire',
        'penetrating-shot',
      ])
      let Marksman_Crit_Rate = 0
      let Marksman_Use_Rate = 0
      for (const Skill in Pre_Sim_Node['skill_use_rate']) {
        if (Marksman_Skills.has(Skill)) {
          Marksman_Crit_Rate +=
            Pre_Sim_Node['skill_use_rate'][Skill] *
            Pre_Sim_Node['cross_skill_stat'][Skill][
              'critical_chance'
            ] *
            Pre_Sim_Node['cross_skill_stat'][Skill]['total_hits']
          Marksman_Use_Rate += Pre_Sim_Node['skill_use_rate'][Skill]
        }
      }

      if (Marksman_Use_Rate > 0) {
        Crit_Chance +=
          (1 - Crit_Chance) *
          Math.min(Marksman_Crit_Rate / (5 * Marksman_Use_Rate), 1)
      }
    }
  }

  let Critical_Damage_Bonus = statVal(
    nodes_map,
    'Generic_Critical_Bonus',
  )
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

  if (tags.has('poison')) {
    // Deadly Venom You deal {['3%', '6%', '9%',} increased Poisoning damage.
    Talent_Damage_Multiplier *=
      1 + talentVal(nodes_map, 'deadly-venom') * 0.03
    // Bane: Poisoning damage effects have a 10% chance to deal double the amount of damage over their duration.
    Talent_Damage_Multiplier *=
      1 + 0.1 * Number(paragonVal(nodes_map, 'bane'))

    // Subverting Poison Trap: You deal 10% increased Poison Damage to enemies standing inside your Pọison Trap.
    const Poison_Trap_Cooldown = statVal(
      nodes_map,
      'Poison_Trap_Cooldown',
    )
    const Poison_Trap_Duration = 9
    Talent_Damage_Multiplier *=
      1 +
      0.1 *
        Math.min(Poison_Trap_Duration / Poison_Trap_Cooldown, 1) *
        talentVal(nodes_map, 'subverting-poison-trap')
  }

  if (tags.has('physical')) {
    // Pride: You deal x13% increased Physical damage to both Healthy and Injured enemies.
    Talent_Damage_Multiplier *=
      1 +
      ((0.13 * 0.55) / (1 + 0.13 * 0.45)) *
        Number(paragonVal(nodes_map, 'pride'))
  }

  // Mixed Shadow Imbuement: Enemies infected by Shadow Imbued Skills take 12% increased Non-Physical damage from you for 8 seconds.
  if (
    !tags.has('physical') &&
    talentVal(nodes_map, 'mixed-shadow-imbuement') > 0
  ) {
    let Shadow_Imbuement_Application_Rate = 0
    for (const Skill in Pre_Sim_Node['skill_use_rate']) {
      if (skillVal(nodes_map, Skill)['tags'].has('imbueable')) {
        let Shadow_Imbuement_Chance = 0
        if (
          Skill == 'rain-of-arrows' &&
          aspectVal(nodes_map, 'word-of-hakan').length > 0
        ) {
          Shadow_Imbuement_Chance = 1
        } else if (
          skillVal(nodes_map, Skill)['tags'].has('imbueable')
        ) {
          Shadow_Imbuement_Chance = statVal(
            nodes_map,
            'Shadow_Imbuement_Uptime',
          )
        }
        // (Rogue) the-vile-apothecary:	Your attacks have a [5-15]% chance to apply all Imbuement effects at [50-60]% of normal potency.
        if (
          malignantHeartVal(nodes_map, 'the-vile-apothecary').length >
          0
        ) {
          Shadow_Imbuement_Chance =
            1 -
            (1 - Shadow_Imbuement_Chance) *
              (1 -
                malignantHeartVal(
                  nodes_map,
                  'the-vile-apothecary',
                )[0])
        }

        Shadow_Imbuement_Application_Rate +=
          Pre_Sim_Node['skill_use_rate'][Skill] *
          Pre_Sim_Node['cross_skill_stat'][Skill][
            'number_enemies_hit'
          ] *
          Shadow_Imbuement_Chance
      }
    }

    Talent_Damage_Multiplier *=
      1 +
      0.12 *
        Math.min(
          (Shadow_Imbuement_Application_Rate / number_of_enemies) * 8,
          1,
        )
  }

  // Aspect of Imitated Imbuement : Your Shadow Clones also mimic the Imbuements applied to your Skills.
  // Casting an Imbuement Skill grants your active Shadow Clone x{8/16}% increased damage for 9.0 seconds.
  if (
    aspectVal(nodes_map, 'aspect-of-imitated-imbuement').length > 0 &&
    tags.has('shadow-clone')
  ) {
    let Imbuement_Rate = 0
    if (allSkillsVal(nodes_map).has('poison-imbuement')) {
      Imbuement_Rate +=
        1 / statVal(nodes_map, 'Poison_Imbuement_Cooldown')
    }
    if (allSkillsVal(nodes_map).has('cold-imbuement')) {
      Imbuement_Rate +=
        1 / statVal(nodes_map, 'Cold_Imbuement_Cooldown')
    }
    if (allSkillsVal(nodes_map).has('shadow-imbuement')) {
      Imbuement_Rate +=
        1 / statVal(nodes_map, 'Shadow_Imbuement_Cooldown')
    }
    Talent_Damage_Multiplier *=
      1 +
      aspectVal(nodes_map, 'aspect-of-imitated-imbuement')[0] *
        Math.min(1, Imbuement_Rate * 9)
  }

  // Eldritch Bounty: When you attack with an Imbued Skill, you gain +3% Maximum Resistance and 20% increased damage for that Imbuement's element for 9 seconds.
  if (paragonVal(nodes_map, 'eldritch-bounty')) {
    let Cold_Imbued_Rate = 0
    let Poison_Imbued_Rate = 0
    let Shadow_Imbued_Rate = 0
    for (const Skill in Pre_Sim_Node['skill_use_rate']) {
      let Cold_Imbued_Chance = 0
      let Poison_Imbued_Chance = 0
      let Shadow_Imbued_Chance = 0
      if (
        Skill == 'rain-of-arrows' &&
        aspectVal(nodes_map, 'word-of-hakan').length > 0
      ) {
        Cold_Imbued_Chance = 1
        Poison_Imbued_Chance = 1
        Shadow_Imbued_Chance = 1
      } else if (
        // Pestilent Points: Every third cast of Puncture is Poison Imbued with [100 - 150]% of normal potency.
        aspectVal(nodes_map, 'pestilent-points').length > 0 &&
        Skill == 'puncture'
      ) {
        Cold_Imbued_Chance = 0
        Poison_Imbued_Chance = 1 / 3
        Shadow_Imbued_Chance = 0
      } else if (
        skillVal(nodes_map, Skill)['tags'].has('imbueable')
      ) {
        Cold_Imbued_Chance = statVal(
          nodes_map,
          'Cold_Imbuement_Uptime',
        )
        Poison_Imbued_Chance = statVal(
          nodes_map,
          'Poison_Imbuement_Uptime',
        )
        Shadow_Imbued_Chance = statVal(
          nodes_map,
          'Shadow_Imbuement_Uptime',
        )
      }

      Cold_Imbued_Rate +=
        Pre_Sim_Node['skill_use_rate'][Skill] * Cold_Imbued_Chance
      Poison_Imbued_Rate +=
        Pre_Sim_Node['skill_use_rate'][Skill] * Poison_Imbued_Chance
      Shadow_Imbued_Rate +=
        Pre_Sim_Node['skill_use_rate'][Skill] * Shadow_Imbued_Chance
    }
    if (tags.has('cold')) {
      Talent_Damage_Multiplier *=
        1 + 0.2 * Math.min(9 * Cold_Imbued_Rate, 1)
    } else if (tags.has('poison')) {
      Talent_Damage_Multiplier *=
        1 + 0.2 * Math.min(9 * Poison_Imbued_Rate, 1)
    } else if (tags.has('shadow')) {
      Talent_Damage_Multiplier *=
        1 + 0.2 * Math.min(9 * Shadow_Imbued_Rate, 1)
    }
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

  // Aspect of Artful Initiative (Rogue Offensive Aspect): When you spend 100 Energy you release a cluster of exploding Stun Grenades that deal 0.2-0.3 total Physical damage and Stun enemies for 0.5 seconds. Your Grenade Skills deal 15% [x] more damage.
  if (
    aspectVal(nodes_map, 'aspect-of-artful-initiative').length != 0 &&
    tags.has('stun-grenade')
  ) {
    Aspect_Damage_Multiplier *= 1.15
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

  // Aspect of Noxious Ice : Chilled enemies Poisoned by Poison Imbuement will be further Chilled for 20% per second. You deal x{14/29}% additional Poison damage to Frozen enemies.
  if (
    tags.has('poison') &&
    toggleVal(nodes_map, 'enemy-frozen') &&
    aspectVal(nodes_map, 'aspect-of-noxious-ice').length > 0
  ) {
    Aspect_Damage_Multiplier *=
      1 + aspectVal(nodes_map, 'aspect-of-noxious-ice')[0]
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

const RogueParagonNames: string[] = [
  // Glyph Bonuses
  'turf', // You gain 10% Damage Reduction against Close enemies.
  'exploit', // When an enemy is damaged by you, they become Vulnerable for 3 seconds. This cannot happen more than once every 20 seconds per enemy.
  'control', // You deal x10% increased damage to Slowed or Chilled enemies or, instead, x20% increased damage to Stunned or Frozen enemies.
  'bane', // Poisoning damage effects have a 10% chance to deal double the amount of damage over their duration.
  'tracker', // Poisoning damage effects last x33.3% longer.
  'versatility', // Non-Basic and Non-Core Skills deal x15% increased damage.
  'closer', // While wielding a Melee weapon, you take 10% reduced damage.
  'ranger', // While wielding a Ranged weapon, you take 10% reduced damage.
  'chip', // Physical damage increases the damage an enemy takes from you by x1%, up to x10%, for 15 seconds.
  'frostfeeder', // You gain x20% increased Chill effect.
  'fluidity', // When you cast an Agility Skill, you gain x9% increased Energy Regeneration for 6 seconds.
  'infusion', // Casting an Imbuement Skill reduces the active Cooldown of another random Imbuement Skill by 0.5 seconds.
  'devious', // When you hit an enemy with a Crowd Controlling effect, they take x2%, up to x10%, increased damage from you for 20 seconds.
  'combat', // Skills that Critically Strike restore 12% of their Energy cost.
  'canny', // Non-Physical damage increases all the Non-Physical damage an enemy takes from you by x1%, up to x10%, for 15 seconds.
  'efficacy', // Imbuement Skill effects have x20% increased potency.
  'snare', // Non-Ultimate Trap Skills have x25% increased area.
  'pride', // You deal x13% increased Physical damage to both Healthy and Injured enemies.
  'ambush', // Enemies affected by Trap Skills take x10% increased damage from you.
  'diminish', // You take 10% reduced Physical damage from Vulnerable enemies.
  'explosive', // You gain 10%[x] Damage Reduction for 2 seconds after dropping a Stun Grenade.
  'nightstalker', // Entering Stealth reduces the active cooldown of Shadow Imbuement by 4 seconds.

  // Legendary Paragon
  'eldritch-bounty', // When you attack with an Imbued Skill, you gain +3% Maximum Resistance and 20% increased damage for that Imbuement's element for 9 seconds.
  'tricks-of-the-trade', // Your Marksman Skills grant your next Cutthroat Skill x25% increased damage. Your Cutthroat Skills grant your next Marksman Skill x25% increased damage.
  'cheap-shot', // You deal x5% increased damage for each Nearby enemy that is Crowd Controlled, up to x25%.
  'deadly-ambush', // You deal x22.5% increased Critical Strike Damage to enemies affected by your Trap Skills.
  "leyrana's-instinct", // When Inner Sight's gauge becomes full, you gain 100%[+] Dodge Chance for 2 seconds. Your next 3 Core skills deal additional damage equal to 20%[x] of your Core Skill Damage bonus.
  'no-witnesses', // Your Ultimate Skills gain an additional 10% [x] damage from your Damage with Ultimate bonus and grant this bonus to all Skills for 8 seconds when cast.
  'exploit-weakness', // Whenever you deal damage to a Vulnerable enemy, they take x1% increased damage from you for 6 seconds, up to x15%.
  'cunning-stratagem', // Your non-damage Combo Point bonuses are increased by 1/3 when you spend 3 Combo Points.
]

export function CreateRogueParagonNodes(): Record<
  string,
  ParagonNode
> {
  const nodes: Record<string, ParagonNode> = {}
  for (const key of RogueParagonNames) {
    nodes[key] = new ParagonNode(key, 'boolean')
  }
  return nodes
}

/* --------------------------------------------------------------------------
                      MALIGNANT HEARTS
----------------------------------------------------------------------------*/
export function CreateRogueMalignantHeartNodes(): Record<
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
    // (Rogue) cluster-munitions:	Lucky Hit: You have up to a 20% chance to launch {2/3/4...} Stun Grenades that deal [flat value number] Physical damage and Stun enemies for 0.50 seconds.
    'cluster-munitions': new MalignantHeartNode(
      'cluster-munitions',
      2,
    ),
    // (Rogue) the-clipshot:	Lucky Hit: Up to a [20-40]% chance for your Cutthroat Skills to Slow by 40% for {4/5/6..} seconds and your Marksman Skills to Knock Back enemies.
    'the-clipshot': new MalignantHeartNode('the-clipshot', 2),
    // (Rogue) the-vile-apothecary:	Your attacks have a [5-15]% chance to apply all Imbuement effects at [50-60]% of normal potency.
    'the-vile-apothecary': new MalignantHeartNode(
      'the-vile-apothecary',
      2,
    ),
    // (Rogue) trickery:	When you use a Subterfuge Skill, leave behind an unstable Shadow Decoy Trap that Taunts enemies. The Shadow Decoy Trap will explode after {5.5/5/4.5/...} seconds dealing [flat-value number] Shadow damage. Cannot occur more than once every 5 seconds.
    trickery: new MalignantHeartNode('trickery', 2),
  }
}
/* ------------------------------------------------------------------------------------------------------------------------------- */

const RogueTalentsToMaxValue: [string, number][] = [
  ['blade-shift', 5], // Quickly stab your victim for {['15%', '17%', '18%', '20%', '21%']} damage and shift, allowing you to move freely through enemies for 3 seconds. // DONE
  ['enhanced-blade-shift', 1], // Damaging an enemy with Blade Shift grants 5% Movement Speed while Blade Shift is active, up to 20%. // IGNORE
  ['fundamental-blade-shift', 1], // Moving through enemies while Blade Shift is active refreshes its duration. After moving through enemies 5 times, your next Blade Shift will Daze enemies for 2 seconds. // IGNORE
  ['primary-blade-shift', 1], // While Blade Shift is active, you gain 15% to all Non-Physical Resistances and reduce the duration of incoming Control Imparing Effects by 20%. // TODO
  ['forceful-arrow', 5], // Fire a powerful arrow at an enemy, dealing {['20%', '22%', '24%', '26%', '28%']} damage. Every 3rd cast makes the enemy Vulnerable for 2 seconds. // DONE
  ['enhanced-forceful-arrow', 1], // Every 3rd cast of Forceful Arrow additionally has a 15% increased Critical Strike Chance. // DONE
  ['fundamental-forceful-arrow', 1], // Forceful Arrow Knocks Back Non-Elite enemies if they are Close. If they collide with another enemy, both or Knocked Down for 1.5 seconds. //IGNORE
  ['primary-forceful-arrow', 1], // Every third cast pierces enemies.
  ['heartseeker', 5], // Fire an arrow that seeks an enemy, dealing {['22%', '24%', '26%', '29%', '31%']} damage and increasing your Critical Strike Chance against them by 5% for 4 seconds, up to 15%. // Done
  ['enhanced-heartseeker', 1], // When Heartseeker Critically Strikes, gain 8% Attack Speed for 4 seconds. Double this amount if the enemy is Vulnerable. // DONE
  ['fundamental-heartseeker', 1], // Heartseeker also increases the Critical Strike Damage the enemy takes from you by 5% for 4 seconds, up to 25%. // Done
  ['primary-heartseeker', 1], // Heartseeker ricochets to an additonal enemy, dealing 75% of the original damage. // DONE
  ['invigorating-strike', 5], // Melee attack an enemy, dealing {['23%', '25%', '28%', '30%', '32%',} damage and increasing Energy Regeneration by 20% for 3 seconds. // DONE
  ['enhanced-invigorating-strike', 1], // Damaging a Crowd Controlled or Injured enemy with Invigorating Strike increases its Energy Regeneration bonus to 30%. // DONE
  ['fundamental-invigorating-strike', 1], // Hitting an enemy with Invigorating Strike while you are below 85%% Energy makes them Vulnerable for 3 seconds. // IGNORE
  ['primary-invigorating-strike', 1], // Invigorating Strike additionally grants 8% Lucky Hit Chance. Hitting a Crowd Controlled or Injured enemy increases this bonus to 16% Lucky Hit Chance. // DONE
  ['puncture', 5], // Throw blades a short distance, dealing {['21%', '23%', '25%', '27%', '29%',} damage. Every 3rd cast Slows enemies by 20% for 2 seconds. Critical Strikes will always Slow. // DONE
  ['enhanced-puncture', 1], // Gain 2 Energy when Puncture damages a Crowd Controlled enemy. // DONE
  ['fundamental-puncture', 1], // Punture now throws 3 blades in a spread, each dealing 35% of its Base damage. Hitting an enemy with at least 2 blades at once makes them Vulnerable for 2 seconds. // DONE
  ['primary-puncture', 1], // Every 3rd cast of Puncture will also ricochet up to 2 times. Critical Strikes will always ricochet. // DONE
  ['barrage', 5], // Unleash a barrage of 5 arrows that expands outwards, each dealing {['21%', '23%', '25%', '27%', '29%',} damage. Each arrows has a 20% chance to ricochet off an enemy up to 1 time. Ricochets deal 40% of the arrow's Base damage. // DONE
  ['enhanced-barrage', 1], // Barrage's ricochet chance is increased to 100% for arrows that damage a Vulnerable enemy or Critical Strike an enemy. // DONE
  ['advanced-barrage', 1], // Whenever a single cast of Barrage ricochets at least 4 times, your next cast gains 20% increased Critical Strike Chance. // DONE
  ['improved-barrage', 1], // Every 3rd cast of Barrage makes enemies Vulnerable for 2 seconds. // IGNORE
  ['flurry', 5], // Unleash a flurry of stabs and slashes, striking enemies in front of you 4 times and dealing {['60%', '66%', '72%', '78%', '84%',} damage to each. // Done
  ['enhanced-flurry', 1], // Each time Flurry damages a Crowd Controlled or Vulnerable enemy, you are Healed for 1% of your Maximum Life, up to 12% Maximum Life per cast. // IGNORE
  ['advanced-flurry', 1], // Evading through an enemy will cause your next Flurry to Stun enemies for 2.5 seconds. // IGNORE
  ['improved-flurry', 1], // If Flurry hits any Vulnerable enemy it will make all enemies hit by that cast Vulnerable for 3 seconds. // IGNORE
  ['penetrating-shot', 5], // Fire an arrow that pierces through all enemies in a line, dealing {['70%', '77%', '84%', '91%', '98%',} damage. // DONE
  ['enhanced-penetrating-shot', 1], // Penetrating Shot has a 10%[+] increased Critical Strike Chance. If Penetrating Shot damages at least 3 enemies, gain 10%[+] Critical Strike Chance for 5 seconds.
  ['advanced-penetrating-shot', 1], // When cast with full Energy, Penetrating Shot will Slow all enemies hit by 50% for 3 seconds. Elite enemies will also be Knocked Down for 1.5 seconds. // IGNORE
  ['improved-penetrating-shot', 1], // Penetrating Shot deals an additional 10%[x] increased damage per enemy it hits.
  ['rapid-fire', 5], // Rapidly fire 5 arrows, each dealing {['24%', '26%', '29%', '31%', '34%',} damage.
  ['enhanced-rapid-fire', 1], // Each subsequent arrow from Rapid Fire has 5% increased Critical Strike Chance, up to 25% for the 5th arrow. // DONE
  ['advanced-rapid-fire', 1], // Advanced Rapid Fire Rapid Fire deals 30%[x] increased Critical Strike Damage for  5 seconds after you Evade.
  ['improved-rapid-fire', 1], // Gain 15 Energy per cast of Rapid Fire when it damages a Vulnerable enemy. // DONE
  ['twisting-blades', 5], // Impale an enemy with your blades, dealing {['45%', '50%', '54%', '58%', '63%',} damage and making them take 8% increased damage from you while impaled. After 1.5 seconds, the blades return to you, piercing enemies for {value2} damage. // DONE
  ['enhanced-twisting-blades', 1], // Twisting Blades deals 30% increased damage when returning. // DONE
  ['advanced-twisting-blades', 1], // When your Twisting Blades return, your active Cooldowns are reduced by .1 second per enemy they passed through, up to 2 seconds. // TODO
  ['improved-twisting-blades', 1], // Enemies are Dazed while impaled with Twisting Blade. // IGNORE
  ['concealment', 5], // Vanishes from sight, gaining an advanced form of Stealth for 4 seconds that will not be removed by taking damage. // IGNORE
  ['enhanced-concealment', 1], // You gain 40 Energy when you enter Concealment. // DONE
  ['countering-concealment', 1], // The Skill that breaks Concealment will always be a guaranteed Critical Strike. // TODO
  ['subverting-concealment', 1], // The Skill that breaks Concealment makes enemies Vulnerable for 3 seconds. // IGNORE
  ['dark-shroud', 5], // Surround yourself with up to 5 protective shadows. Gain {['4%'} Damage Reduction per active shadow. Each time you take direct damage, that damage is reduced and a shadow is consumed. // TODO
  ['enhanced-dark-shroud', 1], // Enhanced Dark Shroud Dark Shroud's shadows have a  14% chance to not be consumed.
  ['countering-dark-shroud', 1], // While you have at least 2 active shadows from Dark Shroud, gain 8% Critical Strike Chance. // TODO
  ['subverting-dark-shroud', 1], // Each active shadow from Dark Shroud grants you 4% increased Movement Speed. // TODO
  ['poison-trap', 5], // Place a trap that arms after 1.25 seconds. It activates when an enemy moves within range, applying {['344%', '379%', '413%', '447%', '482%',} Poisoning damage over 9 seconds to enemies in the area.
  ['enhanced-poison-trap', 1], // Pọison Trap Knocks Down enemies for 1.5 seconds when it activates.
  ['countering-poison-trap', 1], // Pọison Trap has a 30% chance to reset your Imbuement Skill Cooldowns when activated.
  ['subverting-poison-trap', 1], // You deal 10% increased Poison Damage to enemies standing inside your Pọison Trap.
  ['smoke-grenade', 5], // Throw a smoky concoction at enemies that Dazes them for {[4, 4.4, 4.8, 5.2, 5.6],} seconds.
  ['enhanced-smoke-grenade', 1], // Enhanced Smoke Grenade Enemies affected by Smoke Grenade take  25%[x] increased damage from you.
  ['countering-smoke-grenade', 1], // Lucky Hit: Dealing direct damage to enemies affected by Smoke Grenade has up to a 25% chance to reduce its Cooldown by 1 second, or by 2 seconds instead if the enemy is Vulnerable.
  ['subverting-smoke-grenade', 1], // If an enemy is Vulnerable, Slowed, or Chilled then Smoke Grenade will Daze them for 20% longer.
  ['caltrops', 5], // Leap backwards and throw caltrops on the ground, dealing {['30%', '33%', '36%', '39%', '42%',} damage and Slowing enemies by {value2} . Lasts 6 seconds.
  ['enhanced-caltrops', 1], // Enemies take 5% increased damage from you each second they are in Caltrops. // TODO
  ['methodical-caltrops', 1], // Caltrops now deal Cold damage and Chills enemies for 25% per second. // TODO
  ['disciplined-caltrops', 1], // You have 5% Critical Strike Chance against enemies inside your Caltrops. Double this amount against Vulnerable enemies. // TODO
  ['dash', 5], // Dash forward and slash enemies for {value2} damage. // DONE
  ['enhanced-dash', 1], // Enemies damaged by Dash take 15% increased Critical Strike Damage from you for 5 seconds. // DONE
  ['methodical-dash', 1], // Dealing damage to Crowd Controlled enemies with Dash reduces its Charge Cooldown by 0.5 seconds, up to 3 seconds per cast. // DONE
  ['disciplined-dash', 1], // Dash Slows enemies hit by 30% for 3 seconds. Any enemy already Slowed will be Dazed for 2 seconds instead. // IGNORE
  ['shadow-step', 5], // Become Unstoppable and quickly move through the sahdows to stab your victim from behind for {['72%', '79%', '86%', '94%', '101%',} damage. Gain 50% increases Movement Speed for 2 seconds afterwards. // DONE
  ['enhanced-shadow-step', 1], // Damaging an enemy with Shadow Step increases your Critical Strike Chance against them by 8% for 3 seconds. // TODO
  ['methodical-shadow-step', 1], // Enemies damaged by Shadow Step are Stunned for 2 seconds. // IGNORE
  ['disciplined-shadow-step', 1], // Shadow Step's Cooldown is reduced by 3 seconds when it damages an enemy you haven't hit with Shadow Step in the last 4 seconds. // TODO
  ['cold-imbuement', 5], // Imbue your weapons with frigid energies. Your next 2 Imbueable Skills deal Cold damage and Chill enemies for {['25%', '28%', '30%', '33%', '35%',} per hit. // DONE
  ['enhanced-cold-imbuement', 1], // Enhanced Cold Imbuement Lucky Hit: Cold Imbued Skills have up to a  40% chance to make enemies Vulnerable for 3 seconds.
  ['blended-cold-imbuement', 1], // Lucky Hit: Critical Strikes with Cold Imbued Skills have up to a 20% chance to instantly Freeze enemies for 3 seconds. // IGNORE
  ['mixed-cold-imbuement', 1], // Cold Imbued Skills deal 20% damage to Crowd Controlled enemies. Double this bonus against Frozen enemies. // Done
  ['poison-imbuement', 5], // Imbue your weapons with lethal poison. Your next 2 Imbueable Skills deal Poison damage and apply {['100%', ...],} of their Base damage as additional Poisoning damage over 5 seconds. // Done
  ['enhanced-poison-imbuement', 1], // Poison Imbuement's Poisoning Duration is increased by 1 second. // TODO
  ['blended-poison-imbuement', 1], // Critical Strikes with Poison Imbued Skills deal 75% increased Poisioning damage. // DONE
  ['mixed-poison-imbuement', 1], // Lucky Hit: Poison Imbued skills have up to a 30% chance to reduce Poison Imbuement's cooldown by 2 seconds.
  ['shadow-imbuement', 5], // Imbue your weapons with festering shadows. Your next 2 Imbueable Skills deal Shadow damage and infect enemies for 6 seconds. Infected enemies explode on death, dealing {['40%', '44%', '48%', '52%', '56%',} damage to all surrounding enemies. If the infection expires before the enemy dies, it will deal 40% damage to only that enemy.// TODO
  ['enhanced-shadow-imbuement', 1], // You have 15% increased Critical Strike Chance against Injured enemies infected by Shadow Imbuement. // DONE
  ['blended-shadow-imbuement', 1], // Shadow Imbuement's primary explosion makes enemies Vulnerable for 2 seconds. // IGNORE
  ['mixed-shadow-imbuement', 1], // Enemies infected by Shadow Imbued Skills take 12% increased Non-Physical damage from you for 8 seconds. // TODO
  ['death-trap', 1], // Place a trap that arms after 1.25 seconds. It activates when an enemy moves within range, dealing 250% damage to each enemy in the area. // DONE
  ['prime-death-trap', 1], // Enemies are Pulled into Death Trap when it activates. // DONE
  ['supreme-death-trap', 1], // Supreme Death Trap If Death Trap kills an enemy, its Cooldown is reduced by  12 seconds.
  ['rain-of-arrows', 1], // Arrows rain down over a large area 2 times, each wave dealing 100% damage. // DONE
  ['prime-rain-of-arrows', 1], // lmbuement Skill effects applied by Rain of Arrows have 30% increased potency. // DONE
  ['supreme-rain-of-arrows', 1], // Rain of Arrows' first wave Knocks Down enemies for 3 seconds. // IGNORE
  ['shadow-clone', 1], // Your shadow mimicks your actions for 15 seconds. // TODO
  ['prime-shadow-clone', 1], // You are Unstoppable for 5 seconds after casting Shadow Clone. // IGNORE
  ['supreme-shadow-clone', 1], // Your Shadow Clone deals an additional 20% of your damage. // TODO
  ['adrenaline-rush', 3], // While moving, you gain {['5%', '10%', '15%',} increased Energy Regeneration. // DONE
  ['aftermath', 3], // After using an Ultimate Skill, restore {[25, 50, 75],} Energy. // DONE
  ['agile', 3], // Using a Cooldown increases your Dodge Chance by 4/8/12% for 3 seconds. // TODO
  ['alchemical-advantage', 3], // You gain {['1%', '2%', '3%',} increased Attack Speed for each enemy you've Poisoned, up to 15%. // TODO
  ['alchemists-fortune', 3], // Non-Physical damage you deal has a {['5%', '10%', '15%',} increased Lucky Hit Chance. // DONE
  ['chilling-weight', 3], // Chilled enemies have their Movement Speed further reduced by up to {['10%', '20%', '30%',} . // IGNORE
  ['close-quarters-combat', 1], // Damaging a Close enemy with Marksman or Cutthroat Skills each grant a 15% [+] Attack Speed bonus for 8 seconds. While both Attack Speed bonuses are active, your damage dealt is increased by 10%[x] of the total amount of your Damage vs Crowd Controlled bonus.
  ['concussive', 3], // After Knocking Back or Knocking Down an enemy, you gain 4% increased Critical Strike Chance for 4 seconds.
  ['consuming-shadows', 3], // Each time you kill an enemy with Shadow Damage, you generate {[10, 20, 30],} Energy. // TODO
  ['deadly-venom', 3], // You deal {['3%', '6%', '9%',} increased Poisoning damage. // DONE
  ['debilitating-toxins', 3], // Poisoned enemies deal {['5%', '10%', '15%',} less damage. // DONE
  ['exploit', 3], // You deal {['6%', '12%', '18%',} increased damage to Healthy and injured enemies. // DONE
  ['exposure', 1], // Lucky Hit: Dealing direct damage to an enemy affected by a Trap Skill has up to a 25% chance to: // TODO
  ['frigid-finesse', 3], // You deal {['5%', '10%', '15%',} increased damage to Chilled enemies. This bonus increases to {2x} against Frozen enemies. // DONE
  ['haste', 3], // While at or above 50% maximum Energy, gain {['5%', '10%', '15%',} increased Movement Speed. While below 50% maximum Energy, gain {['5%', '10%', '15%',} increased Attack Speed. // TODO
  ['impetus', 3], // After moving 15 meters, your next attack deals {['7%', '14%', '21%',} increased damage. // TODO
  ['innervation', 3], // Lucky Hit: Up to a {['10%', '20%', '30%',} chance to gain 8 Energy. // DONE
  ['malice', 3], // You deal {['3%', '6%', '9%',} increased damage to Vulnerable enemies. // DONE
  ['mending-obscurity', 3], // While Stealthed, you Heal for 4/8/12% Maximum Life per second. // IGNORE
  ['momentum', 1], // Cutthroat Skills grant a stack of Momentum for 8 seconds if they either: // TODO
  ['precision', 1], // Each Marksman skill cast grants 1 stack of Precision, or 2 if it has Critically Struck. When you reach 6 stacks, your next Marksman Core or Ultimate Skill is a guaranteed Critical Strike that deals 50%[x] increased Critical Strike Damage, consuming all stacks of Precision. This damage is further increased by an amount equal to x15% of your Critical Strike Damage bonus.
  ['precision-imbuement', 3], // Imbued Skills gains 3/6/9% increased Critical Strike Chance. // DONE
  ['rapid-gambits', 3], // Your Evade Cooldown is reduced by {[0.5, 1, 1.5],} seconds when you Daze an enemy. // IGNORE
  ['reactive-defense', 3], // Gain 6/12/18% Damage Reduction while inflicted with Control Impairing Effects. // IGNORE
  ['rugged', 3], // Gain {['9%', '18%', '27%',} Damage Reduction against Damage Over Time effects. // TODO
  ['second-wind', 3], // Every 100 Energy you spend grants you {['5%', '10%', '15%',} increased Lucky Hit Chance for 5 seconds. // TODO
  ['shadow-crash', 3], // Lucky Hit: Shadow damage has up to a 10% chance to Stun for {[0.5, 1, 1.5],} seconds. // IGNORE
  ['siphoning-strikes', 3], // Lucky Hit: Critical Strikes against Close enemies have a 85% chance to Heal for {['1%', '2%', '3%',} of your Maximum Life when you Critically Strike Close enemies. // IGNORE
  ['sturdy', 3], // You gain {['4%', '8%', '12%',} Close Damage Reduction. // DONE
  ['stutter-step', 3], // Critically Striking an enemy grants {['5%', '10%', '15%',} Movement Speed for 4 seconds. // TODO
  ['trap-mastery', 3], // When Poison Trap or Death Trap activates, you gain {['4%', '8%', '12%',} increased Critical Strike Chance against Vulnerable and Crowd Controlled enemies for 4 seconds. // TODO
  ['trick-attacks', 3], // When you Critically Strike a Dazed enemy, they are Knocked Down for {[0.5, 1, 1.5],} seconds. // IGNORE
  ['victimize', 1], // Lucky Hit: Dealing direct damage to a Vulnerable enemy has up to a 45% chance to cause an explosion, dealing 23% of the original damage to them and surrounding enemies. // DONE
  ['weapon-mastery', 3], // Gain a bonus when attacking based on weapon type: // DONE
]

// This creates a map from the talent name above to a talent node with its name. Used to look up
// nodes and add dependencies.
export function CreateRogueTalentNodes(): Record<string, TalentNode> {
  const nodes: Record<string, TalentNode> = {}
  for (const [key, value] of RogueTalentsToMaxValue) {
    nodes[key] = new TalentNode(key, value)
  }
  return nodes
}
// Map used to identify which talents should be increased for talent modifiers.
export function CreateRogueTalentModifierMap(): Record<
  string,
  string[]
> {
  return {
    'ranks-of-barrage': ['barrage'],
    'ranks-of-caltrops': ['caltrops'],
    'ranks-of-dash': ['dash'],
    'ranks-of-cold-imbuement': ['cold-imbuement'],
    'ranks-of-concealment': ['concealment'],
    'ranks-of-dark-shroud': ['dark-shroud'],
    'ranks-of-penetrating-shot': ['penetrating-shot'],
    'ranks-of-poison-imbuement': ['poison-imbuement'],
    'ranks-of-shadow-imbuement': ['shadow-imbuement'],
    'ranks-of-shadow-step': ['shadow-step'],
    'ranks-of-poison-trap': ['poison-trap'],
    'ranks-of-smoke-grenade': ['smoke-grenade'],
    'ranks-of-rapid-fire': ['rapid-fire'],
    'ranks-of-twisting-blades': ['twisting-blades'],
    'ranks-of-flurry': ['flurry'],

    // Passive Talents
    'ranks-of-the-deadly-venom-passive': ['deadly-venom'],
    'ranks-of-the-exploit-passive': ['exploit'],
    'ranks-of-the-frigid-finesse-passive': ['frigid-finesse'],
    'ranks-of-the-malice-passive': ['malice'],
    'ranks-of-the-weapon-mastery-passive': ['weapon-mastery'],
    'ranks-of-the-impetus-passive': ['impetus'],
    'ranks-of-the-concussive-passive': ['concussive'],

    // Skill Talents
    'ranks-of-all-agility-skills': [
      'shadow-step',
      'caltrops',
      'dash',
    ],
    'ranks-of-all-imbuement-skills': [
      'shadow-imbuement',
      'poison-imbuement',
      'cold-imbuement',
    ],
    'ranks-of-all-subterfuge-skills': [
      'concealment',
      'smoke-grenade',
      'poison-trap',
      'dark-shroud',
    ],
    'ranks-of-all-core-skills': [
      'barrage',
      'rapid-fire',
      'penetrating-shot',
      'flurry',
      'twisting-blades',
    ],
    'ranks-of-all-defensive-skills': [],
  }
}

export function CreateRogueAspectNodes(): Record<string, AspectNode> {
  return {
    /*--------------------------------------------------
                       Rogue Aspect
        --------------------------------------------------*/

    // Repeating Aspect : Rapid Fire has a {30/45}% chance to ricochet to another target. // DONE
    'repeating-aspect': new AspectNode('repeating-aspect', 1),

    // Aspect of Imitated Imbuement : Your Shadow Clones also mimic the Imbuements applied to your Skills. // TODO
    // Casting an Imbuement Skill grants your active Shadow Clone x{8/16}% increased damage for 9.0 seconds.
    'aspect-of-imitated-imbuement': new AspectNode(
      'aspect-of-imitated-imbuement',
      1,
    ),

    // Trickshot Aspect : Whenever Penetrating Shot damages an enemy, 2 additional arrows split off to either side. These side arrows deal {10/25}% of Penetrating Shot's Base damage and do not split. // DONE
    'trickshot-aspect': new AspectNode('trickshot-aspect', 1),

    // Aspect of Encircling Blades : Flurry damages enemies in a circle around you and deals x{8/15}% increased damage. // DONE
    'aspect-of-encircling-blades': new AspectNode(
      'aspect-of-encircling-blades',
      1,
    ),

    // Aspect of Volatile Shadows : When a Dark Shroud shadow would be removed you trigger an explosion around yourself that deals {54/97} Shadow damage. // TODO
    'aspect-of-volatile-shadows': new AspectNode(
      'aspect-of-volatile-shadows',
      1,
    ),

    // Aspect of Surprise : When you Evade or Shadow Step, you leave behind a cluster of exploding Stun Grenades that deal {50/100} total Physical damage and Stun enemies for 0.5 seconds. // DONE
    'aspect-of-surprise': new AspectNode('aspect-of-surprise', 1),

    // Trickster's Aspect : Caltrops also throw a cluster of exploding Stun Grenades that deal {100/150} total Physical damage and Stun enemies for 0.5 seconds. // DONE
    'tricksters-aspect': new AspectNode('tricksters-aspect', 1),

    // Aspect of Unstable Imbuements : When casting an Imbuement Skill you trigger an Imbued explosion around yourself, applying the Imbuement effects and dealing {140/275} damage of the same type. // TODO
    'aspect-of-unstable-imbuements': new AspectNode(
      'aspect-of-unstable-imbuements',
      1,
    ),

    // bladedancers Aspect : Twisting Blades orbit for a short time after they return to you, dealing 20–30% of Twisting Blade's return damage per hit.
    'bladedancers-aspect': new AspectNode('bladedancers-aspect', 1),

    // Toxic alchemists Aspect : Lucky Hit: Shadow Imbued Skills have up to a 75% chance to create a toxic explosion that applies 0.2–0.3 Poisoning damage over 5 seconds to the target and surrounding enemies.
    // If the enemy was already Poisoned, increase this damage by 100%[x].
    'toxic-alchemists-aspect': new AspectNode(
      'toxic-alchemists-aspect',
      1,
    ),

    // Icy alchemists Aspect : Lucky Hit: Shadow Imbued Skill have up to a 75% chance to release an explosion that deals 0.3–0.48 Cold damage to the target and surrounding enemies, Chilling them for 25%.
    // If they were already Chilled or Frozen, increase this damage by 100%[x].
    'icy-alchemists-aspect': new AspectNode(
      'icy-alchemists-aspect',
      1,
    ),

    // Shadowslicer Aspect : When you cast Dash, a Shadow Clone is spawned at your location that also casts Dash, dealing {80/100}% of the Base damage. // DONE
    'shadowslicer-aspect': new AspectNode('shadowslicer-aspect', 1),

    // Aspect of Arrow Storms : Lucky Hit: Your Marksman Skills have up to a 10.0% chance to create an arrow storm at the enemy's location, dealing {540/675} Physical damage over 3.0 seconds. You can have up to 5.0 active arrow storms. // DONE
    'aspect-of-arrow-storms': new AspectNode(
      'aspect-of-arrow-storms',
      1,
    ),

    // Aspect of Bursting Venoms : Lucky Hit: Poison Imbued Skills have up to a 15.0% chance to create a toxic pool that deals [{value1}] Poisoning damage over 3.0 seconds to enemies within.
    //                             While standing in the pool Poison Imbuement has no Cooldown and no Charge limit.
    'aspect-of-bursting-venoms': new AspectNode(
      'aspect-of-bursting-venoms',
      1,
    ),

    // Aspect of Branching Volleys : Barrage's arrows have a {15/25}% chance to split into 2 arrows whenever they ricochet. // DONE
    'aspect-of-branching-volleys': new AspectNode(
      'aspect-of-branching-volleys',
      1,
    ),

    // Blast-trappers Aspect : Lucky Hit: Dealing direct damage to enemies affected by your Trap Skills has up to a {30/50}% chance to make them Vulnerable for 3.0 seconds.
    'blast-trappers-aspect': new AspectNode(
      'blast-trappers-aspect',
      1,
    ),

    // Vengeful Aspect : Lucky Hit: Making an enemy Vulnerable has up to a {40/60}% chance to grant +3.0% increased Critical Strike Chance for 3.0 seconds, up to +9%. // TODO
    'vengeful-aspect': new AspectNode('vengeful-aspect', 1),

    // opportunists Aspect : When you break Stealth with an attack, you drop a cluster of exploding Stun Grenades around your location that deal {360/450} total Physical damage and Stun enemies for 0.5 seconds.
    'opportunists-aspect': new AspectNode('opportunists-aspect', 1),

    // TODO Shadow Imbuement
    // Aspect of Corruption : Your Imbuement Skill effects have x{20/40}% increased potency against Vulnerable enemies. // DONE
    'aspect-of-corruption': new AspectNode('aspect-of-corruption', 1),

    // Aspect of Synergy : Using an Agility Skill reduces the Cooldown of your next Subterfuge Skill by 20%. Using a Subterfuge Skill increases the damage of your next Agility Skill by x{30/50}%. // TODO
    'aspect-of-synergy': new AspectNode('aspect-of-synergy', 1),

    // infiltrators Aspect : Poison Trap no longer breaks Stealth and triggers no Cooldown or arm time while you are in Stealth. All Poison Traps activate when you exit Stealth and Poison Trap's Cooldown will be {5/8} seconds per trap placed.
    'infiltrators-aspect': new AspectNode('infiltrators-aspect', 1),

    // Snap Frozen Aspect : Each Chilled or Frozen enemy you Evade through grants you a Barrier that absorbs {25/50} damage for 5.0 seconds, absorbing up to a maximum of {125/250} damage. IGNORE
    'snap-frozen-aspect': new AspectNode('snap-frozen-aspect', 2),

    // Enshrouding Aspect : Gain a free Dark Shroud shadow every 3.0 seconds when standing still. Each Dark Shroud shadow grants {2/4}% increased Damage Reduction. // TODO
    'enshrouding-aspect': new AspectNode('enshrouding-aspect', 1),

    // Aspect of Uncanny Treachery : Dealing direct damage to a Dazed Enemy with an Agility Skill grants Stealth for 4.0 seconds. Breaking Stealth with an attack grants you {15/45}% Control Impaired Duration Reduction for 4.0 seconds. // IGNORE
    'aspect-of-uncanny-treachery': new AspectNode(
      'aspect-of-uncanny-treachery',
      1,
    ),

    // Aspect of Cruel Sustenance : Explosions from the Victimize Key Passive Heal you for {25/45} Life for each enemy damaged, up to a maximum of {75/135} Life. // TODO
    'aspect-of-cruel-sustenance': new AspectNode(
      'aspect-of-cruel-sustenance',
      2,
    ),

    // Escape artists Aspect : Upon taking damage from surrounding enemies, you drop a Smoke Grenade and Dodge the next {2/7} attacks within 10.0 seconds. This effect can only occur once every 45 seconds.
    'escape-artists-aspect': new AspectNode(
      'escape-artists-aspect',
      1,
    ),

    // Aspect of Stolen Vigor : Each stack of the Momentum Key Passive Heals you for {10/30} Life per second and grants you 5% Damage Reduction.. // TODO
    'aspect-of-stolen-vigor': new AspectNode(
      'aspect-of-stolen-vigor',
      1,
    ),

    // Cheat's Aspect : You take {15/25}% less damage from Crowd Controlled enemies. Whenever a Crowd Controlled enemy deals direct damage to you, gain +15.0% Movement Speed for 2.0 seconds. // DONE (TODO: add movement speed)
    'cheats-aspect': new AspectNode('cheats-aspect', 1),

    // Aspect of Siphoned Victuals : Lucky Hit: Damaging a Vulnerable enemy with a Core Skill has up to a {10/20}% chance to drop a Healing Potion. // IGNORE
    'aspect-of-siphoned-victuals': new AspectNode(
      'aspect-of-siphoned-victuals',
      1,
    ),

    // Umbrous Aspect : Lucky Hit: Critical Strikes with Marksman Skills have up to a {40/60}% chance to grant a free Dark Shroud shadow. // TODO
    'umbrous-aspect': new AspectNode('umbrous-aspect', 1),

    // Aspect of Lethal Dusk : Evading through an enemy infected by Shadow Imbuement grants Stealth for 4.0 seconds. Breaking Stealth with an attack grants you {1/5}% Maximum Life on Kill for 6.0 seconds. // IGNORE
    'aspect-of-lethal-dusk': new AspectNode(
      'aspect-of-lethal-dusk',
      1,
    ),

    // Aspect of Elusive Menace : While you have both bonuses from the Close Quarters Combat Key Passive active, your Dodge Chance increases by +{3/7}% whenever you're hit by an enemy. Successfully Dodging resets this bonus. // TODO
    'aspect-of-elusive-menace': new AspectNode(
      'aspect-of-elusive-menace',
      1,
    ),

    // Energizing Aspect : Damaging an Elite enemy with a Basic Skill generates {5/9} Energy. // DONE
    'energizing-aspect': new AspectNode('energizing-aspect', 1),

    // Ravenous Aspect : Killing a Vulnerable enemy grants you x{50/70}% increased Energy Regeneration for 4.0 seconds. // TODO
    'ravenous-aspect': new AspectNode('ravenous-aspect', 1),

    // TODO movement speed
    // Aspect of Explosive Verve : Your Grenade Skills count as Trap Skills. Whenever you arm a Trap or drop Grenades, you gain +{10/18}% increased Movement Speed for 3.0 seconds. // DONE
    'aspect-of-explosive-verve': new AspectNode(
      'aspect-of-explosive-verve',
      1,
    ),

    // Aspect of Quickening Fog : You automatically drop a Smoke Grenade at the end of Dash. Dash's Cooldown is reduced by {.4-.6} seconds for each enemy Dazed this way, up to {2-3} seconds.
    'aspect-of-quickening-fog': new AspectNode(
      'aspect-of-quickening-fog',
      2,
    ),

    // manglers Aspect : Lucky Hit: Dealing direct damage to a Vulnerable enemy has up to a {25/45}% chance to Daze them for 2.0 seconds.
    'manglers-aspect': new AspectNode('manglers-aspect', 1),

    // Aspect of Noxious Ice : Chilled enemies Poisoned by Poison Imbuement will be further Chilled for 20% per second. You deal x{14/29}% additional Poison damage to Frozen enemies. // DONE
    'aspect-of-noxious-ice': new AspectNode(
      'aspect-of-noxious-ice',
      1,
    ),

    // Frostbitten Aspect : Chilled enemies hit by your Grenade Skills have a chance equal to double your Critical Strike Chance to be instantly Frozen for 2.0 seconds. You deal x{10/25}% increased Critical Strike Damage against Frozen enemies. // DONE
    'frostbitten-aspect': new AspectNode('frostbitten-aspect', 1),

    // Ravager's Aspect : Shadow Step has an additional Charge. Killing an enemy with Shadow Step refunds a Charge and increases the damage of Shadow Step by x{1/6}% for 2.0 seconds, up to x{5/30}%. // TODO
    'ravagers-aspect': new AspectNode('ravagers-aspect', 2),

    // Pestilent Points: Every third cast of Puncture is Poison Imbued with [100 - 150]% of normal potency.
    'pestilent-points': new AspectNode('pestilent-points', 1),

    // Aspect of Artful Initiative (Rogue Offensive Aspect): When you spend 100 Energy you release a cluster of exploding Stun Grenades that deal 0.2-0.3 total Physical damage and Stun enemies for 0.5 seconds. Your Grenade Skills deal 15% [x] more damage.
    'aspect-of-artful-initiative': new AspectNode(
      'aspect-of-artful-initiative',
      1,
    ),

    // Resistant Assailant's Aspect: Breaking Concealment grants +10% Resistance and Maximum Resist to all elements for 4 seconds. Killing an Elite enemy reduces Concealment's cooldown by 6–10 seconds.
    'resistant-assailants-aspect': new AspectNode(
      'resistant-assailants-aspect',
      1,
    ),

    /*--------------------------------------------------
                       Generic Aspects
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

    // aspect-of-Inner-Calm: Deal x{5/10}% increased damage for each second you stand still, up to x30.0%.
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

    // edgemasters-aspect: Skills deal up to x{10-20}% increased damage based on your available Primary Resource when cast, receiving the maximum benefit while you have full Primary Resource.
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

    // ashearas Khanjar : Hits with this weapon increase your Attack Speed by +{4/6}% for 4.0 seconds, up to +{20/30}%.
    'ashearas-khanjar': new AspectNode('ashearas-khanjar', 2),

    // Eyes in the Dark : Unless it hits a Boss or Player, Death Trap will continue to re-arm itself until it kills an enemy. However, Death Trap's Cooldown is increased by {20/15}%.
    // increases the damage of Death Trap by 30-50%.
    'eyes-in-the-dark': new AspectNode('eyes-in-the-dark', 2),

    // Condemnation : Your Core Skills deal x{20/40}% increased damage when spending 3 Combo Points. Your Basic Skills using this weapon have a 30% chance to generate 3 Combo Points.
    condemnation: new AspectNode('condemnation', 1),

    // Skyhunter : The first direct damage you deal to an enemy is a guaranteed Critical Strike.
    // When you consume Precision casting a Skill, that Skill gains x10–30% increased Critical Strike Damage and you gain 20–40 Energy.
    skyhunter: new AspectNode('skyhunter', 2),

    // Grasp of Shadow : Lucky Hit: Damaging a Vulnerable enemy with a Marksman or Cutthroat Skill has up to a {20/30}% chance to summon a Shadow Clone that mimics your attack.
    'grasp-of-shadow': new AspectNode('grasp-of-shadow', 1),

    // Cowl of the Nameless : You gain x{15/25}% increased Lucky Hit Chance against Crowd Controlled enemies.
    'cowl-of-the-nameless': new AspectNode('cowl-of-the-nameless', 1),

    // (Unique) razorplate Gain [2 - 4]*825 Thorns
    razorplate: new AspectNode('razorplate', 1),

    // (Unique) Fists-of-Fate: Your attacks randomly deal 1% to {200/300}% of their normal damage.
    'fists-of-fate': new AspectNode('fists-of-fate', 1),

    // (Unique) andariels-Visage: Lucky Hit: Up to a {10/20}% chance to trigger a poison nova that applies 1125 Poisoning damage over 5.0 seconds to enemies in the area.
    'andariels-visage': new AspectNode('andariels-visage', 2),

    // (Unique) Melted Heart of Selig: Gain 60 maximum Resource. 75% of incoming damage drains 2 Resource for every 1% of Life you would have lost instead.
    'melted-heart-of-selig': new AspectNode(
      'melted-heart-of-selig',
      0,
    ),

    // (Unique) Penitent-Greaves: You leave behind a trail of frost that chills enemies. You deal x{7/10}% more damage to chilled enemies.
    'penitent-greaves': new AspectNode('penitent-greaves', 1),

    // (Unique) frostburn: Lucky Hit: Up to a {15/25}% chance to Freeze enemies for 2.0 seconds.
    frostburn: new AspectNode('frostburn', 1),

    // (Unique) Harlequin-Crest: "Gain {5/8}% damage Reduction.In addition, gain +2.0 Ranks to all Skills."
    'harlequin-crest': new AspectNode('harlequin-crest', 1),

    // (Unique) mothers-Embrace: If a Core Skill hits 4 or more enemies, {20/40}% of the Resource cost is refunded.
    'mothers-embrace': new AspectNode('mothers-embrace', 1),

    // Lucky Hit: Up to a 100% chance to lose all of your Resource.
    'ring-of-misfortune': new AspectNode('ring-of-misfortune', 0),

    // (Unique) Ring-of-Starless-Skies: // Spending resources reduces your resource costs and increases your damage by 10%[x] for 3 seconds, up to 40%.
    'ring-of-starless-skies': new AspectNode(
      'ring-of-starless-skies',
      0,
    ),

    // Lucky Hit: Up to a [0.7|%|] chance to deal 0.7*825 Shadow damage to surrounding enemies and reduce their damage done by 20% for 3 seconds.
    doombringer: new AspectNode('doombringer', 2),

    // (Unique) Temerity: Effects that Heal you beyond 100.0% Life grant you a Barrier up to {50/100}% of your Maximum Life that lasts for 30.0 seconds.
    temerity: new AspectNode('temerity', 1),

    // Windforce : Lucky Hit: Hits with this weapon have up to a {30/40}% chance to deal double damage and Knock Back the target.
    windforce: new AspectNode('windforce', 1),

    // Word of Hakan : Your Rain of Arrows is always Imbued with all Imbuements at once.
    'word-of-hakan': new AspectNode('word-of-hakan', 0),

    // Eaglehorn: Penetrating Shot makes enemies Vulnerable for 3 seconds. Every 4th cast bounces off walls and scenery and deals 20%–40%[x] bonus damage.
    eaglehorn: new AspectNode('eaglehorn', 1),

    // Tassets of the Dawning Sky (Generic Unique Pants): When you take damage from a Non-Physical damage type, you gain +6-10% Maximum Resistance to that damage type for 6 seconds. This effect can only apply to one damage type at a time.
    'tassets-of-the-dawning-sky': new AspectNode(
      'tassets-of-the-dawning-sky',
      1,
    ),

    // Scoundrel's Leathers (Rogue Unique Chest): While you have unlimited Energy from Inner Sight, your Core Skills have a 60-80% chance to spawn Caltrops, Poison Trap, or Death Trap.
    'scoundrels-leathers': new AspectNode('scoundrels-leathers', 1),

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

    // writhing-band-of-trickery: Casting a Subterfuge Skill leaves behind a Decoy Trap that continuously Taunts and lures enemies. The Decoy Trap explodes after 3 seconds dealing [{value1}] Shadow damage. Can occur every 12 seconds.
    'writhing-band-of-trickery': new AspectNode(
      'writhing-band-of-trickery',
      1,
    ),

    // Paingorger's Gauntlets: Damaging enemies with a cast Non–Basic Skill marks them for 3 seconds. When a Basic Skill first hits a marked enemy, the Basic Skill's damage is echoed to all marked enemies, dealing 100–200%[x] increased damage.
    'paingorgers-gauntlets': new AspectNode(
      'paingorgers-gauntlets',
      1,
    ),

    // Beastfall Boots: When you cast an Ultimate skill, your next Core skill consumes all of your energy and deals 0.5–1.5% increased damage per Energy consumed. Using a Cooldown restores 5 energy.
    'beastfall-boots': new AspectNode('beastfall-boots', 1),
  }
}

export function CreateRogueToggleNodes(): Record<string, ToggleNode> {
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

    // Recent Event Triggers - recently could have a variety of time spans so its easiest to set it as a toggle with the onus on the player
    'overpower-recently': new ToggleNode(
      'overpower-recently',
      'boolean',
    ), // Player has Overpowered recently
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
              aspect TOGGLES
     -------------------------------*/
  }
}

// Create BaseStatsNode.
export function CreateRogueBaseStatsNode(): BaseStatsNode {
  return new BaseStatsNode('Rogue', 1)
}

function CopyTags(tags: Set<string>): Set<string> {
  const new_tags = new Set<string>()
  for (const tag of tags) {
    new_tags.add(tag)
  }
  return new_tags
}

export function CreateRogueTagsNode(nodes_map: NodesMap): TagsNode {
  return new TagsNode('RogueTags', () => {
    const skill_tags = currentSkillVal(nodes_map)['tags']

    // Deep Copy the skill tags.
    const total_tags = CopyTags(skill_tags)

    // These are the tags for a skill.
    total_tags.add('skill')

    // Methodical Caltrops: Caltrops now deal Cold damage and Chills enemies for 25% per second. // TODO
    if (
      currentSkillVal(nodes_map)['name'] == 'caltrops' &&
      talentVal(nodes_map, 'methodical-caltrops') > 0
    ) {
      total_tags.add('cold')
      total_tags.delete('physical')
    }

    return total_tags
  })
}

// (TODO) Figure out which tags we actually need.
export function CreateRogueSkillNodes(): Record<string, SkillNode> {
  return {
    // Skill Node : (Skill Name, Category, Tags[], Flat Modifier, DoT Modifier, Cooldown, Resource Build/Spend, Lucky Hit)
    'blade-shift': new SkillNode(
      'blade-shift',
      'basic',
      [
        'basic',
        'cutthroat',
        'daze',
        'movement-speed',
        'resistance',
        'physical',
      ],
      0.2,
      0.0,
      0,
      0,
      0.5,
    ),
    'forceful-arrow': new SkillNode(
      'forceful-arrow',
      'basic',
      [
        'basic',
        'marksman',
        'knock-back',
        'vulnerable',
        'close-enemies',
        'physical',
      ],
      0.22,
      0.0,
      0,
      0,
      0.5,
    ),
    heartseeker: new SkillNode(
      'heartseeker',
      'basic',
      ['basic', 'marksman', 'vulnerable', 'physical'],
      0.24,
      0.0,
      0,
      0,
      0.5,
    ),
    'invigorating-strike': new SkillNode(
      'invigorating-strike',
      'basic',
      [
        'basic',
        'cutthroat',
        'vulnerable',
        'injured',
        'lucky-hit',
        'physical',
      ],
      0.25,
      0.0,
      0,
      0,
      0.5,
    ),
    puncture: new SkillNode(
      'puncture',
      'basic',
      ['basic', 'marksman', 'slow', 'vulnerable', 'physical'],
      0.21,
      0.0,
      0,
      0,
      0.35,
    ),
    barrage: new SkillNode(
      'barrage',
      'core',
      ['core', 'imbueable', 'marksman', 'vulnerable', 'physical'],
      0.22,
      0.0,
      0,
      -30,
      0.16,
    ),
    flurry: new SkillNode(
      'flurry',
      'core',
      [
        'core',
        'imbueable',
        'cutthroat',
        'stun',
        'vulnerable',
        'heal',
        'physical',
      ],
      0.6,
      0.0,
      0,
      -25,
      0.1,
    ),
    'penetrating-shot': new SkillNode(
      'penetrating-shot',
      'core',
      [
        'core',
        'imbueable',
        'marksman',
        'slow',
        'knock-down',
        'physical',
      ],
      0.7,
      0.0,
      0,
      -35,
      0.5,
    ),
    'rapid-fire': new SkillNode(
      'rapid-fire',
      'core',
      ['core', 'imbueable', 'marksman', 'vulnerable', 'physical'],
      0.3,
      0.0,
      0,
      -25,
      0.2,
    ),
    'twisting-blades': new SkillNode(
      'twisting-blades',
      'core',
      ['core', 'imbueable', 'cutthroat', 'daze', 'physical'],
      0.45,
      0.0,
      0,
      -30,
      0.33,
    ),
    //"concealment": new SkillNode("concealment", "subterfuge", ["subterfuge", "vulnerable", "unstoppable", "movement-speed", "stealth"], 0.0, 0.0, 20, 0, 0),
    'dark-shroud': new SkillNode(
      'dark-shroud',
      'subterfuge',
      ['subterfuge', 'damage-reduction', 'movement-speed'],
      0.0,
      0.0,
      20,
      0,
      0,
    ),
    'poison-trap': new SkillNode(
      'poison-trap',
      'subterfuge',
      ['subterfuge', 'trap', 'knock-down', 'poison'],
      0,
      3.96,
      10,
      0,
      0.2,
    ),
    //"smoke-grenade": new SkillNode("smoke-grenade", "subterfuge", ["subterfuge", "grenade", "slow", "chill", "daze", "vulnerable", "lucky-hit"], 0.0, 0.0, 13, 0, 0),
    caltrops: new SkillNode(
      'caltrops',
      'agility',
      ['agility', 'trap', 'slow', 'chill', 'vulnerable', 'physical'],
      0.4,
      0,
      12,
      0,
      0.25,
    ),
    dash: new SkillNode(
      'dash',
      'agility',
      [
        'agility',
        'imbueable',
        'cutthroat',
        'slow',
        'daze',
        'physical',
      ],
      0.37,
      0.0,
      12,
      0,
      0.25,
    ),
    'shadow-step': new SkillNode(
      'shadow-step',
      'agility',
      [
        'agility',
        'imbueable',
        'cutthroat',
        'stun',
        'unstoppable',
        'movement-speed',
        'physical',
      ],
      0.72,
      0.0,
      9,
      0,
      1.0,
    ),
    // "cold-imbuement": new SkillNode("cold-imbuement", "imbuement", ["imbuement", "chill", "freeze", "vulnerable"], 0.25, 0.0, 13, 0, 0),
    // "poison-imbuement": new SkillNode("poison-imbuement", "imbuement", ["imbuement", "poison", "lucky-hit"], 0.0, 0.0, 13, 0, 0.33),
    // "shadow-imbuement": new SkillNode("shadow-imbuement", "imbuement", ["imbuement", "vulnerable", "injured"], 0.0, 0.0, 13, 0, 0.33),
    'death-trap': new SkillNode(
      'death-trap',
      'ultimate',
      ['ultimate', 'trap', 'pull', 'shadow'],
      2.5,
      0.0,
      50,
      0,
      0.04,
    ),
    'rain-of-arrows': new SkillNode(
      'rain-of-arrows',
      'ultimate',
      ['ultimate', 'imbueable', 'marksman', 'knock-down', 'physical'],
      1.0,
      0.0,
      55,
      0,
      0.02,
    ),
    'shadow-clone': new SkillNode(
      'shadow-clone',
      'ultimate',
      ['ultimate', 'unstoppable'],
      0.0,
      0.0,
      60,
      0,
      0,
    ),
  }
}

/*
These are the nodes that are computed at run time. They all start with value = null and should
depend on each other and the above nodes. Dependencies are added in after all nodes are defined.
*/

export function CreateRogueStatsNodes(
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
      const Ranged_Weapon_Damage = aggregationVal(
        nodes_map,
        'ranged-weapon-damage',
      )
      const Dual_Wield_Weapon_Damage =
        aggregationVal(nodes_map, 'dual-wield-weapon-damage') +
        aggregationVal(nodes_map, 'main-hand-weapon-damage')

      let Weapon_Damage_Total
      if (
        tagsVal(nodes_map).has('marksman') &&
        currentSkillVal(nodes_map)['name'] != 'puncture'
      ) {
        Weapon_Damage_Total = Ranged_Weapon_Damage
      } else if (tagsVal(nodes_map).has('cutthroat')) {
        Weapon_Damage_Total =
          aggregationVal(nodes_map, 'dual-wield-weapon-damage') +
          aggregationVal(nodes_map, 'main-hand-weapon-damage')
      } else {
        Weapon_Damage_Total = Math.max(
          Dual_Wield_Weapon_Damage,
          Ranged_Weapon_Damage,
        )
      }

      return Weapon_Damage_Total
    }),

    Raw_Attack_Speed: new StatsNode('Raw_Attack_Speed', () => {
      let Attack_Speed
      if (tagsVal(nodes_map).has('marksman')) {
        Attack_Speed = aggregationVal(
          nodes_map,
          'ranged-weapon-attack-speed',
        )
      } else {
        Attack_Speed = aggregationVal(
          nodes_map,
          'dual-wield-attack-speed',
        )
      }
      return Attack_Speed
    }),

    // Includes generic damage bonus which do not depend on tags.
    Generic_Damage_Bonus: new StatsNode(
      'Generic_Damage_Bonus',
      () => {
        let Generic_Damage_Bonus = 0

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

        Generic_Damage_Bonus +=
          Number(toggleVal(nodes_map, 'enemy-burning')) *
          aggregationVal(nodes_map, 'damage-to-burning-enemies')

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
          Number(toggleVal(nodes_map, 'enemy-elite')) *
          aggregationVal(nodes_map, 'damage-to-elites')

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
          aggregationVal(nodes_map, 'damage-to-stun-enemies') *
          statVal(nodes_map, 'Enemy_Boss_CC_Adjustment')

        Generic_Damage_Bonus +=
          aggregationVal(nodes_map, 'damage-to-trap-enemies') *
          statVal(nodes_map, 'Trap_Uptime')

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
        // Total_Dexterity
        const Attribute_Damage_Multiplier =
          1 + statVal(nodes_map, 'Total_Dexterity') * 0.001

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
        case 'ultimate':
          Skill_Damage_Bonus += aggregationVal(
            nodes_map,
            'ultimate-skill-damage',
          )
          break
        default:
          break
      }

      if (tagsVal(nodes_map).has('cutthroat')) {
        Skill_Damage_Bonus += aggregationVal(
          nodes_map,
          'cutthroat-skill-damage',
        )
      }

      let Imbuement_Uptime = 0
      if (
        currentSkillVal(nodes_map)['name'] == 'rain-of-arrows' &&
        aspectVal(nodes_map, 'word-of-hakan').length > 0
      ) {
        Imbuement_Uptime = 1
      } else if (
        // Pestilent Points: Every third cast of Puncture is Poison Imbued with [100 - 150]% of normal potency.
        aspectVal(nodes_map, 'pestilent-points').length > 0 &&
        currentSkillVal(nodes_map)['name'] == 'puncture'
      ) {
        Imbuement_Uptime = 1 / 3
      } else if (tagsVal(nodes_map).has('imbueable')) {
        Imbuement_Uptime =
          statVal(nodes_map, 'Cold_Imbuement_Uptime') +
          statVal(nodes_map, 'Poison_Imbuement_Uptime') +
          statVal(nodes_map, 'Shadow_Imbuement_Uptime')
      }
      // (Rogue) the-vile-apothecary:	Your attacks have a [5-15]% chance to apply all Imbuement effects at [50-60]% of normal potency.
      if (
        malignantHeartVal(nodes_map, 'the-vile-apothecary').length > 0
      ) {
        Imbuement_Uptime =
          1 -
          (1 - Imbuement_Uptime) *
            (1 -
              malignantHeartVal(nodes_map, 'the-vile-apothecary')[0])
      }
      Skill_Damage_Bonus +=
        Imbuement_Uptime *
        aggregationVal(nodes_map, 'imbued-skill-damage')

      if (tagsVal(nodes_map).has('marksman')) {
        Skill_Damage_Bonus += aggregationVal(
          nodes_map,
          'marksman-skill-damage',
        )
      }

      Skill_Damage_Bonus +=
        aggregationVal(nodes_map, 'trap-skill-damage') *
        Number(tagsVal(nodes_map).has('trap'))

      if (tagsVal(nodes_map).has('marksman')) {
        Skill_Damage_Bonus += aggregationVal(
          nodes_map,
          'damage-with-ranged-weapons',
        )
      } else {
        Skill_Damage_Bonus += aggregationVal(
          nodes_map,
          'damage-with-dual-wielded-weapons',
        )
      }

      return Skill_Damage_Bonus
    }),

    Generic_Critical_Chance: new StatsNode(
      'Generic_Critical_Chance',
      () => {
        const number_of_enemies = Number(
          toggleVal(nodes_map, 'number-of-enemies'),
        )
        const Pre_Sim_Node = roguePresimVal(nodes_map)
        let Critical_Chance_Total = 0.05 // 5.0% Base Crit chance for All Classes

        // Total_Intelligence
        Critical_Chance_Total +=
          statVal(nodes_map, 'Total_Intelligence') * 0.0002

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

        // Heartseeker: Fire an arrow that seeks an enemy, dealing {['22%', '24%', '26%', '29%', '31%']} damage and increasing your Critical Strike Chance against them by 5% for 4 seconds, up to 15%.
        // Assumes the player is weaving in heartseekers and spends half their time to build stacks and the other half to damage.
        if (
          allSkillsVal(nodes_map).has('heartseeker') &&
          !('heartseeker' in Pre_Sim_Node['skill_use_rate'])
        ) {
          // Worries about loops. Should add an "attack-speed-on-gear" node.
          const Heartseeker_Attack_Speed =
            statVal(nodes_map, 'Raw_Attack_Speed') +
            aggregationVal(nodes_map, 'attack-speed') +
            aggregationVal(nodes_map, 'basic-attack-speed')
          // Spends 2 seconds to build stacks.
          Critical_Chance_Total += Math.min(
            0.03 * 2 * Heartseeker_Attack_Speed,
            0.15,
          )
        } else if ('heartseeker' in Pre_Sim_Node['skill_use_rate']) {
          Critical_Chance_Total +=
            Pre_Sim_Node['skill_use_rate']['heartseeker'] * 4 > 1
              ? 0.15
              : (Pre_Sim_Node['skill_use_rate']['heartseeker'] *
                  4 *
                  0.05) /
                2
        }

        // Enhanced Shadow Imbuement: You have 15% increased Critical Strike Chance against Injured enemies infected by Shadow Imbuement.
        // TODO: Revisit
        // Not doing the time to kill scaling since its more complicated and less significant in a shared bucket.
        if (
          allSkillsVal(nodes_map).has('shadow-imbuement') &&
          talentVal(nodes_map, 'enhanced-shadow-imbuement') > 0
        ) {
          let Shadow_Imbuement_Application_Rate = 0
          for (const Skill in Pre_Sim_Node['skill_use_rate']) {
            let Shadow_Imbuement_Chance = 0
            if (
              Skill == 'rain-of-arrows' &&
              aspectVal(nodes_map, 'word-of-hakan').length > 0
            ) {
              Shadow_Imbuement_Chance = 1
            } else if (
              skillVal(nodes_map, Skill)['tags'].has('imbueable')
            ) {
              Shadow_Imbuement_Chance = statVal(
                nodes_map,
                'Shadow_Imbuement_Uptime',
              )
            }
            // (Rogue) the-vile-apothecary:	Your attacks have a [5-15]% chance to apply all Imbuement effects at [50-60]% of normal potency.
            if (
              malignantHeartVal(nodes_map, 'the-vile-apothecary')
                .length > 0
            ) {
              Shadow_Imbuement_Chance =
                1 -
                (1 - Shadow_Imbuement_Chance) *
                  (1 -
                    malignantHeartVal(
                      nodes_map,
                      'the-vile-apothecary',
                    )[0])
            }
            Shadow_Imbuement_Application_Rate +=
              Pre_Sim_Node['skill_use_rate'][Skill] *
              Pre_Sim_Node['cross_skill_stat'][Skill][
                'number_enemies_hit'
              ] *
              Shadow_Imbuement_Chance
          }
          const Shadow_Imbuement_Debuff_Uptime = Math.min(
            (Shadow_Imbuement_Application_Rate / number_of_enemies) *
              6,
            1,
          )
          // Assumes the debuff is always on your targets.
          Critical_Chance_Total +=
            Shadow_Imbuement_Debuff_Uptime * 0.15 * 0.35
        }

        // Trap Mastery: When Poison Trap or Death Trap activates, you gain {['4%', '8%', '12%',} increased Critical Strike Chance against Vulnerable and Crowd Controlled enemies for 4 seconds.
        if (
          talentVal(nodes_map, 'trap-mastery') > 0 &&
          (statVal(nodes_map, 'Enemy_Vulnerable') > 0 ||
            statVal(nodes_map, 'Enemy_Crowd_Controlled') > 0)
        ) {
          const Condition_Uptime = Math.max(
            statVal(nodes_map, 'Enemy_Vulnerable'),
            statVal(nodes_map, 'Enemy_Crowd_Controlled'),
          )
          if (allSkillsVal(nodes_map).has('poison-trap')) {
            Critical_Chance_Total +=
              ((0.04 * talentVal(nodes_map, 'trap-mastery') * 4) /
                statVal(nodes_map, 'Poison_Trap_Cooldown')) *
              Condition_Uptime
          }
          if (allSkillsVal(nodes_map).has('death-trap')) {
            Critical_Chance_Total +=
              ((0.04 * talentVal(nodes_map, 'trap-mastery') * 4) /
                statVal(nodes_map, 'Death_Trap_Cooldown')) *
              Condition_Uptime
          }
        }

        // Disciplined Caltrops: You have 5% Critical Strike Chance against enemies inside your Caltrops. Double this amount against Vulnerable enemies.
        if (
          talentVal(nodes_map, 'disciplined-caltrops') > 0 &&
          allSkillsVal(nodes_map).has('caltrops')
        ) {
          Critical_Chance_Total +=
            0.05 *
            (6 /
              Math.max(6, statVal(nodes_map, 'Caltrops_Cooldown'))) *
            (1 + statVal(nodes_map, 'Enemy_Vulnerable'))
        }

        // Countering Dark Shroud: While you have at least 2 active shadows from Dark Shroud, gain 8% Critical Strike Chance.
        if (talentVal(nodes_map, 'countering-dark-shroud') > 0) {
          Critical_Chance_Total +=
            (0.08 * statVal(nodes_map, 'Dark_Shroud_Uptime') * 4) / 5
        }

        //Concussive: After Knocking Back or Knocking Down an enemy, you gain 4% increased Critical Strike Chance for 4 seconds.
        // TODO use Knocked down rate instead
        if (toggleVal(nodes_map, 'enemy-knocked-down')) {
          Critical_Chance_Total +=
            0.04 * talentVal(nodes_map, 'concussive')
        }

        // Vengeful Aspect : Lucky Hit: Making an enemy Vulnerable has up to a {40/60}% chance to grant +3.0% increased Critical Strike Chance for 3.0 seconds, up to +9%.
        // TODO: This should depend on vulnerable application rate.
        if (
          aspectVal(nodes_map, 'vengeful-aspect').length > 0 &&
          statVal(nodes_map, 'Enemy_Vulnerable') == 1
        ) {
          Critical_Chance_Total += 0.09
        }

        // Vampiric Power sanguine-brace
        // When you kill an enemy, Fortify for 6% of your Base Life. While you have more Fortify than half of your Maximum Life, you gain 8% Critical Strike Chance.
        if (
          vampiricPowerVal(nodes_map, 'sanguine-brace') &&
          Number(toggleVal(nodes_map, 'percent-fortify')) > 0.5
        ) {
          Critical_Chance_Total += 0.08
        }

        // 'enhanced-penetrating-shot' Penetrating Shot has a 10%[+] increased Critical Strike Chance. If Penetrating Shot damages at least 3 enemies, gain 10%[+] Critical Strike Chance for 5 seconds.
        if (
          'penetrating-shot' in Pre_Sim_Node['skill_use_rate'] &&
          talentVal(nodes_map, 'enhanced-penetrating-shot') > 0
        ) {
          if (
            Pre_Sim_Node['cross_skill_stat']['penetrating-shot'][
              'total_hits'
            ] >= 3
          ) {
            Critical_Chance_Total +=
              0.1 *
              Math.min(
                1,
                Pre_Sim_Node['skill_use_rate']['penetrating-shot'] *
                  5,
              )
          }
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
        const Pre_Sim_Node = roguePresimVal(nodes_map)
        const number_of_enemies = Number(
          toggleVal(nodes_map, 'number-of-enemies'),
        )
        const enemy_spread = Number(
          statVal(nodes_map, 'Enemy_Spread'),
        )
        let Critical_Chance_Total = 0

        //Enhanced Forceful Arrow: Every 3rd cast of Forceful Arrow additionally has a 15% increased Critical Strike Chance.
        if (
          currentSkillVal(nodes_map)['name'] == 'forceful-arrow' &&
          talentVal(nodes_map, 'enhanced-forceful-arrow') > 0
        ) {
          Critical_Chance_Total += 0.05
        }

        // 'enhanced-penetrating-shot' Penetrating Shot has a 10%[+] increased Critical Strike Chance. If Penetrating Shot damages at least 3 enemies, gain 10%[+] Critical Strike Chance for 5 seconds.
        if (
          currentSkillVal(nodes_map)['name'] == 'penetrating-shot' &&
          talentVal(nodes_map, 'enhanced-penetrating-shot') > 0
        ) {
          Critical_Chance_Total += 0.1
        }

        // Enhanced Rapid Fire: Each subsequent arrow from Rapid Fire has 5% increased Critical Strike Chance, up to 25% for the 5th arrow.
        if (
          currentSkillVal(nodes_map)['name'] == 'rapid-fire' &&
          talentVal(nodes_map, 'enhanced-rapid-fire') > 0
        ) {
          let Rapid_Arrows = 5
          if (
            'rapid-fire' in
              Pre_Sim_Node['combo_point_distribution'] &&
            specializationVal(nodes_map) == 'combo-points'
          ) {
            // [number, number, number, number] (should sum to 1)
            const Combo_Point_Distribution =
              Pre_Sim_Node['combo_point_distribution']['rapid-fire']
            let Average_Combo_Points = 0
            for (let i = 0; i < 4; i++) {
              Average_Combo_Points += Combo_Point_Distribution[i] * i
            }
            // Cunning Strategem: Your non-damage Combo Point bonuses are increased by 1/3 when you spend 3 Combo Points.
            if (paragonVal(nodes_map, 'cunning-stratagem')) {
              Average_Combo_Points += Combo_Point_Distribution[3]
            }
            Rapid_Arrows += Average_Combo_Points
          }

          // Work it out on paper.
          Critical_Chance_Total += 0.25 - 0.5 / Rapid_Arrows
        }

        // Precision Imbuement: Imbued Skills gains 3/6/9% increased Critical Strike Chance.
        let Imbuement_Uptime = 0
        if (
          currentSkillVal(nodes_map)['name'] == 'rain-of-arrows' &&
          aspectVal(nodes_map, 'word-of-hakan').length > 0
        ) {
          Imbuement_Uptime = 1
        } else if (
          // Pestilent Points: Every third cast of Puncture is Poison Imbued with [100 - 150]% of normal potency.
          aspectVal(nodes_map, 'pestilent-points').length > 0 &&
          currentSkillVal(nodes_map)['name'] == 'puncture'
        ) {
          Imbuement_Uptime = 1 / 3
        } else if (tagsVal(nodes_map).has('imbueable')) {
          Imbuement_Uptime =
            statVal(nodes_map, 'Cold_Imbuement_Uptime') +
            statVal(nodes_map, 'Poison_Imbuement_Uptime') +
            statVal(nodes_map, 'Shadow_Imbuement_Uptime')
        }
        // (Rogue) the-vile-apothecary:	Your attacks have a [5-15]% chance to apply all Imbuement effects at [50-60]% of normal potency.
        if (
          malignantHeartVal(nodes_map, 'the-vile-apothecary').length >
          0
        ) {
          Imbuement_Uptime = malignantHeartVal(
            nodes_map,
            'the-vile-apothecary',
          )[0]
        }
        // (Rogue) the-vile-apothecary:	Your attacks have a [5-15]% chance to apply all Imbuement effects at [50-60]% of normal potency.
        Critical_Chance_Total +=
          0.03 *
          talentVal(nodes_map, 'precision-imbuement') *
          Imbuement_Uptime

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
        'shadow-clone',
        'concealment',
        'smoke-grenade',
        'dark-shroud',
      ])
      if (Non_Crit_Skills.has(currentSkillVal(nodes_map)['name'])) {
        return 0
      }
      const Pre_Sim_Node = roguePresimVal(nodes_map)
      const number_of_enemies = Number(
        toggleVal(nodes_map, 'number-of-enemies'),
      )
      const enemy_spread = Number(statVal(nodes_map, 'Enemy_Spread'))

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

      // Enhanced Barrage: Barrage's ricochet chance is increased to 100% for arrows that damage a Vulnerable enemy or Critical Strike an enemy. // DONE
      // Advanced Barrage: Whenever a single cast of Barrage ricochets at least 4 times, your next cast gains 20% increased Critical Strike Chance.
      if (currentSkillVal(nodes_map)['name'] == 'barrage') {
        // Assume a shotgun if enemy near.
        let prob_4_hits = 1
        let prob_5_hits = 1
        if (toggleVal(nodes_map, 'enemy-distant')) {
          // Chance that an enemy is near a randomly hit enemy.
          const p = ProbabilityInCone(60, 1 / 6, enemy_spread)
          prob_4_hits = BinomialProbability(
            number_of_enemies - 1,
            p,
            3,
          )
          prob_5_hits =
            1 - BinomialDistribution(number_of_enemies - 1, p, 3)
        }
        let Ricochet_Chance = 0.2
        // Enhanced Barrage Barrage's ricochet chance is increased to 100% for arrows that damage a Vulnerable enemy or Critical Strike an enemy.
        if (talentVal(nodes_map, 'enhanced-barrage') > 0) {
          if (toggleVal(nodes_map, 'enemy-vulnerable')) {
            Ricochet_Chance = 1
          } else {
            Ricochet_Chance =
              1 -
              (1 - Ricochet_Chance) *
                (1 - Critical_Chance) *
                (1 - statVal(nodes_map, 'Enemy_Vulnerable'))
          }
        }
        Critical_Chance +=
          0.2 *
          (Ricochet_Chance ** 4 * prob_4_hits +
            0.2 *
              (1 - BinomialDistribution(5, Ricochet_Chance, 3)) *
              prob_5_hits) *
          Number(talentVal(nodes_map, 'advanced-barrage') > 0)
      }

      // countering concealment: The Skill that breaks Concealment will always be a guaranteed Critical Strike.
      if (
        allSkillsVal(nodes_map).has('concealment') &&
        talentVal(nodes_map, 'countering-concealment') > 0 &&
        currentSkillVal(nodes_map)['name'] in
          Pre_Sim_Node['skill_use_rate']
      ) {
        let Total_Skill_Use_Rate = 0
        for (const Skill in Pre_Sim_Node['skill_use_rate']) {
          Total_Skill_Use_Rate +=
            Pre_Sim_Node['skill_use_rate'][Skill]
        }
        const Concealment_Rate =
          1 / Math.max(statVal(nodes_map, 'Concealment_Cooldown'), 1)
        Critical_Chance +=
          (1 - Critical_Chance) *
          Math.min(Concealment_Rate / Total_Skill_Use_Rate, 1)
      }

      // Precision: Each Marksman skill cast grants 1 stack of Precision, or 2 if it has Critically Struck.
      // When you reach 6 stacks, your next Marksman Core or Ultimate Skill is a guaranteed Critical Strike that deals 50%[x] increased Critical Strike Damage, consuming all stacks of Precision. This damage is further increased by an amount equal to x15% of your Critical Strike Damage bonus.
      // if (
      //   talentVal(nodes_map, 'precision') > 0 &&
      //   tagsVal(nodes_map).has('marksman')
      // ) {
      //   const Marksman_Skills = new Set([
      //     'puncture',
      //     'heartseeker',
      //     'forceful-arrow',
      //     'rain-of-arrows',
      //     'barrage',
      //     'rapid-fire',
      //     'penetrating-shot',
      //   ])
      //   let Marksman_Crit_Rate = 0
      //   let Marksman_Use_Rate = 0
      //   for (const Skill in Pre_Sim_Node['skill_use_rate']) {
      //     if (Marksman_Skills.has(Skill)) {
      //       Marksman_Crit_Rate +=
      //         Pre_Sim_Node['skill_use_rate'][Skill] *
      //         Pre_Sim_Node['cross_skill_stat'][Skill][
      //           'critical_chance'
      //         ] *
      //         Pre_Sim_Node['cross_skill_stat'][Skill]['total_hits']
      //       Marksman_Use_Rate += Pre_Sim_Node['skill_use_rate'][Skill]
      //     }
      //   }

      //   if (Marksman_Use_Rate > 0) {
      //     Critical_Chance +=
      //       (1 - Critical_Chance) *
      //       Math.min(Marksman_Crit_Rate / (5 * Marksman_Use_Rate), 1)
      //   }
      // }

      return Critical_Chance
    }),

    // These are the things which give +Critical Damage.
    Generic_Critical_Bonus: new StatsNode(
      'Generic_Critical_Bonus',
      () => {
        const Pre_Sim_Node = roguePresimVal(nodes_map)
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

        if (
          allSkillsVal(nodes_map).has('dash') &&
          talentVal(nodes_map, 'enhanced-dash') > 0
        ) {
          const Dash_Cooldown = statVal(nodes_map, 'Dash_Cooldown')
          // Enhanced Dash: Enemies damaged by Dash take 15% increased Critical Strike Damage from you for 5 seconds.
          // Assumes we dash on cooldown and that all targets get hit. Likely makes the talent overvalued.
          Critical_Bonus_Total +=
            0.15 * Math.min(5 / Dash_Cooldown, 1)
        }

        //critical-strike-damage-with-imbued-skills
        // Fundamental Heartseeker: Heartseeker also increases the Critical Strike Damage the enemy takes from you by 5% for 4 seconds, up to 25%.
        // (TODO) Needs work.
        // Heartseeker: Fire an arrow that seeks an enemy, dealing {['22%', '24%', '26%', '29%', '31%']} damage and increasing your Critical Strike Chance against them by 3% for 4 seconds, up to 15%.
        // Assumes the player is weaving in heartseekers and spends half their time to build stacks and the other half to damage.
        if (
          allSkillsVal(nodes_map).has('heartseeker') &&
          talentVal(nodes_map, 'fundamental-heartseeker') > 0
        ) {
          if (!('heartseeker' in Pre_Sim_Node['skill_use_rate'])) {
            // Worries about loops. Should add an "attack-speed-on-gear" node.
            const Heartseeker_Attack_Speed =
              statVal(nodes_map, 'Raw_Attack_Speed') +
              aggregationVal(nodes_map, 'attack-speed') +
              aggregationVal(nodes_map, 'basic-attack-speed')
            // Spends 2 seconds to build stacks.
            Critical_Bonus_Total += Math.min(
              0.05 * 2 * Heartseeker_Attack_Speed,
              0.25,
            )
          } else if (
            'heartseeker' in Pre_Sim_Node['skill_use_rate']
          ) {
            Critical_Bonus_Total +=
              Pre_Sim_Node['skill_use_rate']['heartseeker'] * 4 > 1
                ? 0.15
                : (Pre_Sim_Node['skill_use_rate']['heartseeker'] *
                    4 *
                    0.03) /
                  2
          }
        }

        // Precision: Each Marksman skill cast grants 1 stack of Precision, or 2 if it has Critically Struck.
        // When you reach 6 stacks, your next Marksman Core or Ultimate Skill is a guaranteed Critical Strike that deals 50%[x] increased Critical Strike Damage, consuming all stacks of Precision. This damage is further increased by an amount equal to x15% of your Critical Strike Damage bonus.
        // if (
        //   talentVal(nodes_map, 'precision') > 0 &&
        //   tagsVal(nodes_map).has('marksman')
        // ) {
        //   const Marksman_Skills = new Set([
        //     'puncture',
        //     'heartseeker',
        //     'forceful-arrow',
        //     'rain-of-arrows',
        //     'barrage',
        //     'rapid-fire',
        //     'penetrating-shot',
        //   ])
        //   let Marksman_Crit_Rate = 0
        //   let Marksman_Use_Rate = 0
        //   for (const Skill in Pre_Sim_Node['skill_use_rate']) {
        //     if (Marksman_Skills.has(Skill)) {
        //       Marksman_Crit_Rate +=
        //         Pre_Sim_Node['skill_use_rate'][Skill] *
        //         Pre_Sim_Node['cross_skill_stat'][Skill][
        //           'critical_chance'
        //         ] *
        //         Pre_Sim_Node['cross_skill_stat'][Skill]['total_hits']
        //       Marksman_Use_Rate +=
        //         Pre_Sim_Node['skill_use_rate'][Skill]
        //     }
        //   }
        //   if (Marksman_Use_Rate > 0) {
        //     // Average Bonus
        //     Critical_Bonus_Total += 0.1
        //   }
        // }

        return Critical_Bonus_Total
      },
    ),

    Generic_Critical_Damage_Multiplier: new StatsNode(
      'Generic_Critical_Damage_Multiplier',
      () => {
        let Critical_Multiplier_Total = 1.5

        // Frostbitten Aspect : Chilled enemies hit by your Grenade Skills have a chance equal to double your Critical Strike Chance to be instantly Frozen for 2.0 seconds. You deal x{10/25}% increased Critical Strike Damage against Frozen enemies.
        if (
          aspectVal(nodes_map, 'frostbitten-aspect').length > 0 &&
          toggleVal(nodes_map, 'enemy-frozen')
        ) {
          Critical_Multiplier_Total *=
            1 + aspectVal(nodes_map, 'frostbitten-aspect')[0]
        }

        // Deadly Ambush: You deal x22.5% increased Critical Strike Damage to enemies affected by your Trap Skills.
        if (
          paragonVal(nodes_map, 'deadly-ambush') &&
          toggleVal(nodes_map, 'enemy-trapped')
        ) {
          Critical_Multiplier_Total *= 1.225
        }

        return Critical_Multiplier_Total
      },
    ),

    Skill_Critical_Bonus: new StatsNode(
      'Skill_Critical_Bonus',
      () => {
        const Pre_Sim_Node = roguePresimVal(nodes_map)
        let Critical_Bonus_Total = 0

        // 'critical-strike-damage-with-core-skills'
        if (currentSkillVal(nodes_map)['tags'].has('core')) {
          Critical_Bonus_Total += aggregationVal(
            nodes_map,
            'critical-strike-damage-with-core-skills',
          )
        }

        // Precision: Critical Strikes with Marksman Skills grant you Precision. You gain 4% increased Critical Strike Damage per stack of Precision, up to a maximum of 20%.
        // At max Precision, your next marksman skill is a guaranteed crit with 40% increased Critical Strike Damage. You then reset your stacks.
        if (
          talentVal(nodes_map, 'precision') > 0 &&
          tagsVal(nodes_map).has('marksman')
        ) {
          const Marksman_Skills = new Set([
            'puncture',
            'heartseeker',
            'forceful-arrow',
            'rain-of-arrows',
            'barrage',
            'rapid-fire',
            'penetrating-shot',
          ])
          let Marksman_Crit_Rate = 0
          let Marksman_Use_Rate = 0
          for (const Skill in Pre_Sim_Node['skill_use_rate']) {
            if (Marksman_Skills.has(Skill)) {
              Marksman_Crit_Rate +=
                Pre_Sim_Node['skill_use_rate'][Skill] *
                Pre_Sim_Node['cross_skill_stat'][Skill][
                  'critical_chance'
                ] *
                Pre_Sim_Node['cross_skill_stat'][Skill]['total_hits']
              Marksman_Use_Rate +=
                Pre_Sim_Node['skill_use_rate'][Skill]
            }
          }
          if (Marksman_Use_Rate > 0) {
            Critical_Bonus_Total +=
              // Max stack bonus.
              0.3 *
              Math.min(
                Marksman_Crit_Rate / (5 * Marksman_Use_Rate),
                1,
              )
          }
        }

        return Critical_Bonus_Total
      },
    ),

    Skill_Critical_Damage_Multiplier: new StatsNode(
      'Skill_Critical_Damage_Multiplier',
      () => {
        let Critical_Multiplier_Total = 1

        // Weapon Mastery : Crossbow x5% Critical Strike Damage
        // Ava tested and it only applies to skills.
        if (
          tagsVal(nodes_map).has('marksman') &&
          aggregationVal(nodes_map, 'ranged-weapon') == 1
        ) {
          Critical_Multiplier_Total *=
            1 + 0.05 * talentVal(nodes_map, 'weapon-mastery')
        }

        // ['advanced-rapid-fire', 1], Advanced Rapid Fire Rapid Fire deals 30%[x] increased Critical Strike Damage for  5 seconds after you Evade.
        if (
          talentVal(nodes_map, 'advanced-rapid-fire') > 0 &&
          currentSkillVal(nodes_map)['name'] == 'rapid-fire'
        ) {
          const Evade_Cooldown = 5
          Critical_Multiplier_Total *=
            1 + 0.3 * Math.min(1, 5 / Evade_Cooldown)
        }

        return Critical_Multiplier_Total
      },
    ),

    Critical_Multiplier: new StatsNode('Critical_Multiplier', () => {
      const Non_Crit_Skills = new Set([
        'shadow-clone',
        'concealment',
        'smoke-grenade',
        'dark-shroud',
      ])
      if (Non_Crit_Skills.has(currentSkillVal(nodes_map)['name'])) {
        return 1
      }
      let Critical_Multiplier =
        1 +
        statVal(nodes_map, 'Skill_Critical_Bonus') +
        statVal(nodes_map, 'Generic_Critical_Bonus')

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
        const Pre_Sim_Node = roguePresimVal(nodes_map)
        let Attack_Speed_Bonus_Total = 0

        // attack-speed
        Attack_Speed_Bonus_Total += aggregationVal(
          nodes_map,
          'attack-speed',
        )

        // attack-speed-for-seconds-after-dodging-an-attack
        Attack_Speed_Bonus_Total +=
          aggregationVal(
            nodes_map,
            'attack-speed-for-4-seconds-after-dodging-an-attack',
          ) *
          Math.min(
            statVal(nodes_map, 'Enemy_Attacks_Per_Second') *
              4 *
              statVal(nodes_map, 'Total_Dodge_Chance'),
            1,
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
            'blade-shift',
            'forceful-arrow',
            'heartseeker',
            'invigorating-strike',
            'puncture',
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
        const Pre_Sim_Node = roguePresimVal(nodes_map)
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

        // ['alchemical-advantage', 3], // You gain {['1%', '2%', '3%',} increased Attack Speed for each enemy you've Poisoned, up to 15%.
        if (talentVal(nodes_map, 'alchemical-advantage') > 0) {
          const Poison_Uptime = Math.max(
            Number(toggleVal(nodes_map, 'enemy-poisoned')),
            Pre_Sim_Node['dot_uptime'],
          )
          Attack_Speed_Bonus_Total += Math.min(
            0.15,
            0.01 *
              Poison_Uptime *
              talentVal(nodes_map, 'alchemical-advantage'),
          )
        }

        // Haste: While at or above 50% maximum Energy, gain {['5%', '10%', '15%',} increased Movement Speed. While below 50% maximum Energy, gain {['5%', '10%', '15%',} increased Attack Speed.
        // In combat assume they are dumping energy.
        Attack_Speed_Bonus_Total +=
          talentVal(nodes_map, 'haste') * 0.05

        // ashearas Khanjar : Hits with this weapon increase your Attack Speed by +{4/6}% for 4.0 seconds, up to +{20/30}%.
        if (aspectVal(nodes_map, 'ashearas-khanjar').length > 0) {
          const Melee_Skills = new Set([
            'invigorating-strike',
            'blade-shift',
            'puncture',
            'twisting-blades',
            'flurry',
            'dash',
            'shadow-step',
          ])
          let Weapon_Use_Rate = 0
          for (const Skill in Pre_Sim_Node['skill_use_rate']) {
            if (Melee_Skills.has(Skill)) {
              Weapon_Use_Rate += Pre_Sim_Node['skill_use_rate'][Skill]
            }
          }
          Attack_Speed_Bonus_Total +=
            aspectVal(nodes_map, 'ashearas-khanjar')[0] *
            (Weapon_Use_Rate * 4 < 1 ? Weapon_Use_Rate * 4 : 5)
        }

        //Enhanced Heartseeker: When Heartseeker Critically Strikes, gain 8% Attack Speed for 4 seconds. Double this amount if the enemy is Vulnerable.
        // Assumes the player is weaving in heartseekers and keeps the buff up.
        if (
          allSkillsVal(nodes_map).has('heartseeker') &&
          talentVal(nodes_map, 'enhanced-heartseeker') > 0
        ) {
          Attack_Speed_Bonus_Total +=
            0.08 + 0.08 * statVal(nodes_map, 'Enemy_Vulnerable')
        }

        // Generic Aspect, Accelerating Aspect: Critical Strikes with Core Skills increase your Attack Speed by +[15 - 25]% for 3.0 seconds.
        if (aspectVal(nodes_map, 'accelerating-aspect').length != 0) {
          let Core_Critical_Rate = 0
          const Core_Skills = new Set([
            'twisting-blades',
            'rapid-fire',
            'barrage',
            'flurry',
            'penetrating-shot',
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

        // Damaging a Close enemy with Marksman or Cutthroat Skills each grant a 15% [+] Attack Speed bonus for 8 seconds.
        // While both Attack Speed bonuses are active, your damage dealt is increased by 10%[x] of the total amount of your Damage vs Crowd Controlled bonus.
        if (
          talentVal(nodes_map, 'close-quarters-combat') > 0 &&
          Object.keys(Pre_Sim_Node['skill_use_rate']).length > 0 &&
          !toggleVal(nodes_map, 'enemy-distant')
        ) {
          const Marksman_Skills = new Set([
            'puncture',
            'heartseeker',
            'forceful-arrow',
            'rain-of-arrows',
            'barrage',
            'rapid-fire',
            'penetrating-shot',
          ])
          const Cutthroat_Skills = new Set([
            'invigorating-strike',
            'blade-shift',
            'twisting-blades',
            'flurry',
            'dash',
            'shadow-step',
          ])
          let Marksman_Use_Rate = 0
          let Cutthroat_Use_Rate = 0
          for (const Skill in Pre_Sim_Node['skill_use_rate']) {
            if (Marksman_Skills.has(Skill)) {
              Marksman_Use_Rate +=
                Pre_Sim_Node['skill_use_rate'][Skill]
            }
            if (Cutthroat_Skills.has(Skill)) {
              Cutthroat_Use_Rate +=
                Pre_Sim_Node['skill_use_rate'][Skill]
            }
          }
          Attack_Speed_Bonus_Total +=
            0.15 * Math.min(Marksman_Use_Rate * 8, 1) +
            0.15 * Math.min(Cutthroat_Use_Rate * 8, 1)
        }

        if (
          'flurry' in Pre_Sim_Node['combo_point_distribution'] &&
          currentSkillVal(nodes_map)['name'] == 'flurry' &&
          specializationVal(nodes_map) == 'combo-points'
        ) {
          // [number, number, number, number] (should sum to 1)
          const Combo_Point_Distribution =
            Pre_Sim_Node['combo_point_distribution']['flurry']
          let Average_Combo_Points = 0
          for (let i = 0; i < 4; i++) {
            Average_Combo_Points += Combo_Point_Distribution[i] * i
          }
          // Cunning Strategem: Your non-damage Combo Point bonuses are increased by 1/3 when you spend 3 Combo Points.
          if (paragonVal(nodes_map, 'cunning-stratagem')) {
            Average_Combo_Points += Combo_Point_Distribution[3]
          }
          Attack_Speed_Bonus_Total += 0.15 * Average_Combo_Points
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
      const Raw_Weapon_Attack_Speed = statVal(
        nodes_map,
        'Raw_Attack_Speed',
      ) // Can also be nodes_map["stat"]["Raw_Attack_Speed"]) but Non-Barbarian use 1 Weapon
      const Attack_Speed_Total =
        1 + statVal(nodes_map, 'Attack_Speed_Bonus')

      return Raw_Weapon_Attack_Speed * Attack_Speed_Total
    }),

    Overpower_Chance: new StatsNode('Overpower_Chance', () => {
      if (tagsVal(nodes_map).has('channeled')) {
        // Channeled Skills Cannot Overpower
        return 0
      }
      const Pre_Sim_Node = roguePresimVal(nodes_map)
      let Overpower_Chance_Total = 0.03 // Base 3% chance to Overpower a Skill

      // Vampiric Power blood-boil
      // When your Core Skills Overpower an enemy, you spawn 3 Volatile Blood Drops. Collecting a Volatile Blood Drop causes it to explode, dealing 60% Physical damage around you.
      // Every 20 seconds, your next Skill is guaranteed to Overpower.
      // Legendary Paragon 'bone-breaker':  Every 12 seconds, your next Skill is guaranteed to Overpower
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
      const Damage_Multiplier = RogueDamageMultiplier(
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
        const Overpower_Multiplier_Total =
          1 + 0.5 * Number(toggleVal(nodes_map, 'percent-life'))

        return Overpower_Multiplier_Total
      },
    ),

    // aspects can be multiplicative with Damage
    Generic_Aspect_Damage_Multiplier: new StatsNode(
      'Generic_Aspect_Damage_Multiplier',
      () => {
        let Aspect_Damage_Multiplier = 1

        // aspect of pummeling: "Deal {}} increased damage to Stunned, knocked Down, and Frozen enemies.",
        if (
          aspectVal(nodes_map, 'aspect-of-pummeling').length != 0 &&
          (toggleVal(nodes_map, 'enemy-stunned') ||
            toggleVal(nodes_map, 'enemy-knocked-down') ||
            toggleVal(nodes_map, 'enemy-frozen'))
        ) {
          Aspect_Damage_Multiplier *=
            1 + aspectVal(nodes_map, 'aspect-of-pummeling')[0]
        }

        // aspect-of-retribution: Distant enemies have a 8.0% chance to be Stunned for 2.0 seconds when they hit you. You deal x{10/20}% increased damage to Stunned enemies.
        if (
          aspectVal(nodes_map, 'aspect-of-retribution').length != 0 &&
          toggleVal(nodes_map, 'enemy-stunned')
        ) {
          Aspect_Damage_Multiplier *=
            1 + aspectVal(nodes_map, 'aspect-of-retribution')[0]
        }

        // Conceited-aspect: Deal x{15-25}% increased damage while you have a Barrier active.
        if (
          aspectVal(nodes_map, 'conceited-aspect').length != 0 &&
          Number(toggleVal(nodes_map, 'percent-barrier')) != 0
        ) {
          Aspect_Damage_Multiplier *=
            1 + aspectVal(nodes_map, 'conceited-aspect')[0]
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

        // Tibault's Will (Generic Unique Pants): You deal 20-40% [x] increased damage while Unstoppable and for 4 seconds after. When you become Unstoppable, gain 50 of your Primary Resource.
        if (aspectVal(nodes_map, 'tibaults-will').length != 0) {
          let Tibaults_Will_Uptime = 0

          // Shadow Step: Become Unstoppable and quickly move through the sahdows to stab your victim from behind for {['72%', '79%', '86%', '94%', '101%',} damage. Gain 50% increases Movement Speed for 2 seconds afterwards.
          if (allSkillsVal(nodes_map).has('shadow-step')) {
            Tibaults_Will_Uptime +=
              4 / statVal(nodes_map, 'Shadow_Step_Cooldown')
          }

          // Concealment Unstoppable
          if (allSkillsVal(nodes_map).has('concealment')) {
            Tibaults_Will_Uptime +=
              4 / statVal(nodes_map, 'Concealment_Cooldown')
          }

          // ['prime-shadow-clone', 1], // You are Unstoppable for 5 seconds after casting Shadow Clone.
          if (
            allSkillsVal(nodes_map).has('shadow-clone') &&
            talentVal(nodes_map, 'prime-shadow-clone') > 0
          ) {
            Tibaults_Will_Uptime +=
              9 / statVal(nodes_map, 'Shadow_Clone_Cooldown')
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

    // aspects can be multiplicative with Damage
    Skill_Aspect_Damage_Multiplier: new StatsNode(
      'Skill_Aspect_Damage_Multiplier',
      () => {
        let Aspect_Damage_Multiplier = 1
        const Pre_Sim_Node = roguePresimVal(nodes_map)
        const number_of_enemies = Number(
          toggleVal(nodes_map, 'number-of-enemies'),
        )
        // (Unique) Fists-of-Fate: Your attacks randomly deal 1% to {200/300}% of their normal damage.
        if (aspectVal(nodes_map, 'fists-of-fate').length > 0) {
          Aspect_Damage_Multiplier *=
            aspectVal(nodes_map, 'fists-of-fate')[0] / 2
        }

        // Aspect of Encircling Blades : Flurry damages enemies in a circle around you and deals x{8/15}% increased damage.
        if (
          aspectVal(nodes_map, 'aspect-of-encircling-blades').length >
            0 &&
          currentSkillVal(nodes_map)['name'] == 'flurry'
        ) {
          Aspect_Damage_Multiplier *=
            1 + aspectVal(nodes_map, 'aspect-of-encircling-blades')[0]
        }

        // Windforce : Lucky Hit: Hits with this weapon have up to a {30/40}% chance to deal double damage and Knock Back the target.
        if (
          tagsVal(nodes_map).has('marksman') &&
          aspectVal(nodes_map, 'windforce').length > 0
        ) {
          Aspect_Damage_Multiplier *=
            1 +
            aspectVal(nodes_map, 'windforce')[0] *
              statVal(nodes_map, 'Skill_Lucky_Hit_Chance_Multiplier')
        }

        // Aspect of Synergy : Using an Agility Skill reduces the Cooldown of your next Subterfuge Skill by 20%. Using a Subterfuge Skill increases the damage of your next Agility Skill by x{30/50}%.
        if (
          aspectVal(nodes_map, 'aspect-of-synergy').length > 0 &&
          tagsVal(nodes_map).has('agility')
        ) {
          const Shadow_Step_Cooldown = statVal(
            nodes_map,
            'Shadow_Step_Cooldown',
          )
          const Caltrops_Cooldown = statVal(
            nodes_map,
            'Caltrops_Cooldown',
          )
          const Dash_Cooldown = statVal(nodes_map, 'Dash_Cooldown')
          // Avoiding a loop.
          const Concealment_Cooldown = statVal(
            nodes_map,
            'Concealment_Cooldown',
          )
          const Dark_Shroud_Cooldown = statVal(
            nodes_map,
            'Dark_Shroud_Cooldown',
          )
          const Poison_Trap_Cooldown = statVal(
            nodes_map,
            'Poison_Trap_Cooldown',
          )
          const Smoke_Grenade_Cooldown = statVal(
            nodes_map,
            'Smoke_Grenade_Cooldown',
          )
          // Adding 1 because cast time + they wont just get spammed.
          const Agility_Skill_Use_Rate =
            (1 / (1 + Shadow_Step_Cooldown)) *
              Number(allSkillsVal(nodes_map).has('shadow-step')) +
            (1 / (1 + Caltrops_Cooldown)) *
              Number(allSkillsVal(nodes_map).has('caltrops')) +
            (1 / (1 + Dash_Cooldown)) *
              Number(allSkillsVal(nodes_map).has('dash'))

          const Subterfuge_Skill_Use_Rate =
            (1 / (1 + Concealment_Cooldown)) *
              Number(allSkillsVal(nodes_map).has('concealment')) +
            (1 / (1 + Smoke_Grenade_Cooldown)) *
              Number(allSkillsVal(nodes_map).has('smoke-grenade')) +
            (1 / (1 + Dark_Shroud_Cooldown)) *
              Number(allSkillsVal(nodes_map).has('dark-shroud')) +
            (1 / (1 + Poison_Trap_Cooldown)) *
              Number(allSkillsVal(nodes_map).has('poison-trap'))

          if (Agility_Skill_Use_Rate > 0) {
            Aspect_Damage_Multiplier *=
              1 +
              aspectVal(nodes_map, 'aspect-of-synergy')[0] *
                Math.min(
                  Subterfuge_Skill_Use_Rate / Agility_Skill_Use_Rate,
                  1,
                )
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

        // Edgemaster's-aspect: Skills deal up to x{10-20}% increased damage based on your available Primary Resource when cast, receiving the maximum benefit while you have full Primary Resource.
        if (aspectVal(nodes_map, 'edgemasters-aspect').length > 0) {
          Aspect_Damage_Multiplier *=
            1 + aspectVal(nodes_map, 'edgemasters-aspect')[0]
        }

        // Eyes in the Dark : Unless it hits a Boss or Player, Death Trap will continue to re-arm itself until it kills an enemy. However, Death Trap's Cooldown is increased by {20/15}%.
        // increases the damage of Death Trap by 30-50%.
        if (
          aspectVal(nodes_map, 'eyes-in-the-dark').length > 0 &&
          currentSkillVal(nodes_map)['name'] == 'death-trap'
        ) {
          Aspect_Damage_Multiplier *=
            1 + aspectVal(nodes_map, 'eyes-in-the-dark')[0]
        }

        // Ravager's Aspect : Shadow Step has an additional Charge. Killing an enemy with Shadow Step refunds a Charge and increases the damage of Shadow Step by x{1/6}% for 2.0 seconds, up to x{5/30}%. // TODO
        if (
          aspectVal(nodes_map, 'ravagers-aspect').length > 0 &&
          currentSkillVal(nodes_map)['name'] == 'shadow-step'
        ) {
          Aspect_Damage_Multiplier *=
            1 +
            Math.min(
              aspectVal(nodes_map, 'ravagers-aspect')[1],
              (aspectVal(nodes_map, 'ravagers-aspect')[0] *
                (number_of_enemies - 1)) /
                2,
            )
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

        // Vampiric Power moonrise
        // Hitting an enemy with a Basic Skill grants you 4% Attack Speed for 10 seconds, stacking up to 5 times. Upon reaching maximum stacks, you enter a Vampiric Bloodrage, gaining 160% Basic Skill damage and 15% Movement Speed for 10 seconds.
        if (
          vampiricPowerVal(nodes_map, 'moonrise') &&
          tagsVal(nodes_map).has('basic')
        ) {
          let Basic_Skill_Rate = 0
          const Basic_Skills = new Set([
            'blade-shift',
            'forceful-arrow',
            'heartseeker',
            'invigorating-strike',
            'puncture',
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
        const number_of_enemies = Number(
          toggleVal(nodes_map, 'number-of-enemies'),
        )
        const enemy_spread = Number(
          statVal(nodes_map, 'Enemy_Spread'),
        )
        const Pre_Sim_Node = roguePresimVal(nodes_map)

        // Tears of Blood Glyph
        Talent_Damage_Multiplier *=
          1 + aggregationVal(nodes_map, 'damage-')

        // Exploit: You deal {['6%', '12%', '18%',} increased damage to Healthy and injured enemies.
        Talent_Damage_Multiplier *=
          1 +
          (0.06 * talentVal(nodes_map, 'exploit') * 0.55) /
            (1 + 0.06 * talentVal(nodes_map, 'exploit') * 0.45)

        // Frigid Finesse: You deal {['5%', '10%', '15%',} increased damage to Chilled enemies. This bonus increases to {2x} against Frozen enemies.
        if (
          statVal(nodes_map, 'Enemy_Chilled') == 1 &&
          !toggleVal(nodes_map, 'enemy-frozen')
        ) {
          Talent_Damage_Multiplier *=
            1 + 0.05 * talentVal(nodes_map, 'frigid-finesse')
        }
        if (toggleVal(nodes_map, 'enemy-frozen')) {
          Talent_Damage_Multiplier *=
            1 + 2 * 0.05 * talentVal(nodes_map, 'frigid-finesse')
        }

        // Malice You deal {['3%', '6%', '9%',} increased damage to Vulnerable enemies.
        if (statVal(nodes_map, 'Enemy_Vulnerable') > 0) {
          Talent_Damage_Multiplier *=
            1 +
            0.03 *
              talentVal(nodes_map, 'malice') *
              statVal(nodes_map, 'Enemy_Vulnerable')
        }

        // Enhanced Smoke Grenade Enemies affected by Smoke Grenade take  25%[x] increased damage from you.
        if (allSkillsVal(nodes_map).has('smoke-grenade')) {
          const Smoke_Grenade_Cooldown = statVal(
            nodes_map,
            'Smoke_Grenade_Cooldown',
          )
          let Smoke_Grenade_Duration = 4
          // Subverting Smoke Grenade: If an enemy is Vulnerable, Slowed, or Chilled then Smoke Grenade will Daze them for 20% longer.
          if (
            talentVal(nodes_map, 'subverting-smoke-grenade') > 0 &&
            (statVal(nodes_map, 'Enemy_Vulnerable') == 1 ||
              toggleVal(nodes_map, 'enemy-slowed') ||
              statVal(nodes_map, 'Enemy_Chilled') == 1)
          ) {
            Smoke_Grenade_Duration *= 1.25
          }
          Talent_Damage_Multiplier *=
            1 +
            (0.2 *
              talentVal(nodes_map, 'enhanced-smoke-grenade') *
              Smoke_Grenade_Duration) /
              Smoke_Grenade_Cooldown
        }

        // Control: You deal x10% increased damage to Slowed or Chilled enemies or, instead, x20% increased damage to Stunned or Frozen enemies.
        if (paragonVal(nodes_map, 'control')) {
          let Control_Multiplier = 1
          if (
            toggleVal(nodes_map, 'enemy-slowed') ||
            statVal(nodes_map, 'Enemy_Chilled') == 1
          ) {
            Control_Multiplier = 1.1
          }
          if (
            toggleVal(nodes_map, 'enemy-stunned') ||
            toggleVal(nodes_map, 'enemy-frozen')
          ) {
            Control_Multiplier = 1.2
          }
          Talent_Damage_Multiplier *= Control_Multiplier
        }

        // Twisting Blades: Impale an enemy with your blades, dealing {['45%', '50%', '54%', '58%', '63%',} damage and making them take 8% increased damage from you while impaled.
        if ('twisting-blades' in Pre_Sim_Node['skill_use_rate']) {
          Talent_Damage_Multiplier *=
            1 +
            0.08 *
              Math.min(
                Pre_Sim_Node['skill_use_rate']['twisting-blades'] *
                  1.5,
                1,
              )
        }

        // Ambush: Enemies affected by Trap Skills take x10% increased damage from you.
        if (
          paragonVal(nodes_map, 'ambush') &&
          toggleVal(nodes_map, 'enemy-trapped')
        ) {
          Talent_Damage_Multiplier *= 1.1
        }

        // Cheap Shot: You deal x5% increased damage for each Nearby enemy that is Crowd Controlled, up to x25%.
        if (
          paragonVal(nodes_map, 'cheap-shot') &&
          statVal(nodes_map, 'Enemy_Crowd_Controlled')
        ) {
          let Nearby_Enemies = 0
          if (!toggleVal(nodes_map, 'enemy-distant')) {
            Nearby_Enemies += 1
          }
          Nearby_Enemies +=
            Math.min(10 ** 2 / enemy_spread ** 2, 1) *
            (number_of_enemies - 1)
          Talent_Damage_Multiplier *=
            1 + 0.05 * Math.min(Nearby_Enemies, 5)
        }

        // Enhanced Caltrops: Enemies in Caltrops take 10%[x] increased damage from you, increased by 5%[x] each second.
        if (
          talentVal(nodes_map, 'enhanced-caltrops') > 0 &&
          allSkillsVal(nodes_map).has('caltrops')
        ) {
          Talent_Damage_Multiplier *=
            1 + 0.2 * (7 / statVal(nodes_map, 'Caltrops_Cooldown'))
        }

        // Close quarters combat: // Damaging a Close enemy with Marksman or Cutthroat Skills each grant a 15% [+] Attack Speed bonus for 8 seconds.
        // While both Attack Speed bonuses are active, your damage dealt is increased by 10%[x] of the total amount of your Damage vs Crowd Controlled bonus.
        if (
          talentVal(nodes_map, 'close-quarters-combat') > 0 &&
          Object.keys(Pre_Sim_Node['skill_use_rate']).length > 0 &&
          !toggleVal(nodes_map, 'enemy-distant')
        ) {
          const Marksman_Skills = new Set([
            'puncture',
            'heartseeker',
            'forceful-arrow',
            'rain-of-arrows',
            'barrage',
            'rapid-fire',
            'penetrating-shot',
          ])
          const Cutthroat_Skills = new Set([
            'invigorating-strike',
            'blade-shift',
            'twisting-blades',
            'flurry',
            'dash',
            'shadow-step',
          ])
          let Marksman_Uptime = 0
          let Cutthroat_Uptime = 0
          for (const Skill in Pre_Sim_Node['skill_use_rate']) {
            if (Marksman_Skills.has(Skill)) {
              Marksman_Uptime +=
                Pre_Sim_Node['skill_use_rate'][Skill] * 8
            }
            if (Cutthroat_Skills.has(Skill)) {
              Cutthroat_Uptime +=
                Pre_Sim_Node['skill_use_rate'][Skill] * 8
            }
          }
          const Close_Quarters_Uptime =
            Math.min(1, Marksman_Uptime) *
            Math.min(1, Cutthroat_Uptime)

          Talent_Damage_Multiplier *=
            1 +
            0.1 *
              aggregationVal(
                nodes_map,
                'damage-to-crowd-controlled-enemies',
              ) *
              Close_Quarters_Uptime
        }

        // Chip: Physical damage increases the damage an enemy takes from you by x1%, up to x10%, for 15 seconds.
        // Canny: Non-Physical damage increases all the Non-Physical damage an enemy takes from you by x1%, up to x10%, for 15 seconds.
        if (
          paragonVal(nodes_map, 'chip') ||
          paragonVal(nodes_map, 'canny')
        ) {
          let Physical_Damage_Use_Rate = 0
          let Non_Physical_Damage_Use_Rate = 0
          const Non_Physical_Skills = new Set([
            'poison-trap',
            'death-trap',
          ])
          const Ignore_Skils = new Set(['shadow-clone'])
          // TODO Use actual physical tags.
          for (const Skill in Pre_Sim_Node['skill_use_rate']) {
            let Non_Physical_Chance = 0
            if (
              aspectVal(nodes_map, 'word-of-hakan').length > 0 &&
              Skill == 'rain-of-arrows'
            ) {
              Non_Physical_Chance = 1
            } else if (
              // Pestilent Points: Every third cast of Puncture is Poison Imbued with [100 - 150]% of normal potency.
              aspectVal(nodes_map, 'pestilent-points').length > 0 &&
              Skill == 'puncture'
            ) {
              Non_Physical_Chance = 1 / 3
            } else if (
              skillVal(nodes_map, Skill)['tags'].has('imbueable')
            ) {
              Non_Physical_Chance =
                statVal(nodes_map, 'Cold_Imbuement_Uptime') +
                statVal(nodes_map, 'Poison_Imbuement_Uptime') +
                statVal(nodes_map, 'Shadow_Imbuement_Uptime')
            } else if (Non_Physical_Skills.has(Skill)) {
              Non_Physical_Chance = 1
            }
            if (
              malignantHeartVal(nodes_map, 'the-vile-apothecary')
                .length > 0
            ) {
              Non_Physical_Chance =
                1 -
                (1 - Non_Physical_Chance) *
                  (1 -
                    malignantHeartVal(
                      nodes_map,
                      'the-vile-apothecary',
                    )[0])
            }
            if (Ignore_Skils.has(Skill)) {
              continue
            }
            Physical_Damage_Use_Rate +=
              (1 - Non_Physical_Chance) *
              Pre_Sim_Node['skill_use_rate'][Skill]
            Non_Physical_Damage_Use_Rate +=
              Non_Physical_Chance *
              Pre_Sim_Node['skill_use_rate'][Skill]
          }

          if (paragonVal(nodes_map, 'chip')) {
            Talent_Damage_Multiplier *=
              1 +
              0.01 *
                (15 * Physical_Damage_Use_Rate > 1
                  ? 10
                  : 15 * Physical_Damage_Use_Rate)
          }

          if (paragonVal(nodes_map, 'canny')) {
            Talent_Damage_Multiplier *=
              1 +
              0.01 *
                (15 * Non_Physical_Damage_Use_Rate > 1
                  ? 10
                  : 15 * Non_Physical_Damage_Use_Rate)
          }
        }

        //Exploit Weakness: Whenever you deal damage to a Vulnerable enemy, they take x1% increased damage from you for 6 seconds, up to x15%.
        if (
          paragonVal(nodes_map, 'exploit-weakness') &&
          statVal(nodes_map, 'Enemy_Vulnerable') > 0
        ) {
          let Skill_Use_Rate = 0
          // TODO Use actual physical tags.
          for (const Skill in Pre_Sim_Node['skill_use_rate']) {
            Skill_Use_Rate +=
              Pre_Sim_Node['skill_use_rate'][Skill] *
              Pre_Sim_Node['cross_skill_stat'][Skill]['total_hits']
          }

          Talent_Damage_Multiplier *=
            1 +
            0.01 *
              (6 * Skill_Use_Rate > 1 ? 15 : 6 * Skill_Use_Rate) *
              statVal(nodes_map, 'Enemy_Vulnerable')
        }

        // devious: When you hit an enemy with a Crowd Controlling effect, they take x2%, up to x10%, increased damage from you for 20 seconds.
        // TODO: Debuff application rate instead.
        if (
          paragonVal(nodes_map, 'devious') &&
          statVal(nodes_map, 'Enemy_Crowd_Controlled') == 1
        ) {
          Talent_Damage_Multiplier *= 1.1
        }

        return Talent_Damage_Multiplier
      },
    ),

    Skill_Talent_Damage_Multiplier: new StatsNode(
      'Skill_Talent_Damage_Multiplier',
      () => {
        const Pre_Sim_Node = roguePresimVal(nodes_map)
        let Talent_Damage_Multiplier = 1
        let Skill

        // Mixed Cold Imbuement: Cold Imbued Skills deal 20% damage to Crowd Controlled enemies. Double this bonus against Frozen enemies.
        if (
          talentVal(nodes_map, 'mixed-cold-imbuement') &&
          statVal(nodes_map, 'Enemy_Crowd_Controlled') == 1
        ) {
          let Cold_Imbuement_Chance = 0
          if (
            currentSkillVal(nodes_map)['name'] == 'rain-of-arrows' &&
            aspectVal(nodes_map, 'word-of-hakan').length > 0
          ) {
            Cold_Imbuement_Chance = 1
          } else if (tagsVal(nodes_map).has('imbueable')) {
            Cold_Imbuement_Chance = statVal(
              nodes_map,
              'Cold_Imbuement_Uptime',
            )
          }
          if (
            malignantHeartVal(nodes_map, 'the-vile-apothecary')
              .length > 0
          ) {
            Cold_Imbuement_Chance =
              1 -
              (1 - Cold_Imbuement_Chance) *
                (1 -
                  malignantHeartVal(
                    nodes_map,
                    'the-vile-apothecary',
                  )[0])
          }
          Talent_Damage_Multiplier *=
            1 +
            (0.2 +
              0.2 * Number(toggleVal(nodes_map, 'enemy-frozen'))) *
              Cold_Imbuement_Chance
        }

        // Versatility: Non-Basic and Non-Core Skills deal x15% increased damage.
        if (
          paragonVal(nodes_map, 'versatility') &&
          !tagsVal(nodes_map).has('basic') &&
          !tagsVal(nodes_map).has('core')
        ) {
          Talent_Damage_Multiplier *= 1.15
        }

        // No Witnesses: Your Ultimate Skills gain an additional 10% [x] damage from your Damage with Ultimate bonus and grant this bonus to all Skills for 8 seconds when cast.
        if (
          tagsVal(nodes_map).has('ultimate') &&
          paragonVal(nodes_map, 'no-witnesses')
        ) {
          Talent_Damage_Multiplier *= 1.3
        }

        // Impetus: After moving 12 meters, your next non-Basic attack deals {['7%', '14%', '21%',} increased damage.
        if (talentVal(nodes_map, 'impetus') > 0) {
          // Asumes 3 m/s base.
          const Movement_Rate =
            (statVal(nodes_map, 'Total_Movement_Speed') * 3) / 12
          let Non_Basic_Skill_Use_Rate = 0
          const Basic_Skills = new Set([
            'blade-shift',
            'forceful-arrow',
            'heartseeker',
            'invigorating-strike',
            'puncture',
          ])
          for (Skill in Pre_Sim_Node['skill_use_rate']) {
            if (!Basic_Skills.has(Skill)) {
              Non_Basic_Skill_Use_Rate +=
                Pre_Sim_Node['skill_use_rate'][Skill]
            }
          }
          Talent_Damage_Multiplier *=
            1 +
            talentVal(nodes_map, 'impetus') *
              0.07 *
              Math.min(Movement_Rate / Non_Basic_Skill_Use_Rate, 1)
        }

        // Tricks of the Trade: Your Marksman Skills grant your next Cutthroat Skill x25% increased damage. Your Cutthroat Skills grant your next Marksman Skill x25% increased damage.
        if (
          paragonVal(nodes_map, 'tricks-of-the-trade') &&
          (tagsVal(nodes_map).has('marksman') ||
            tagsVal(nodes_map).has('cutthroat'))
        ) {
          const Marksman_Skills = new Set([
            'puncture',
            'heartseeker',
            'forceful-arrow',
            'rain-of-arrows',
            'barrage',
            'rapid-fire',
            'penetrating-shot',
          ])
          const Cutthroat_Skills = new Set([
            'invigorating-strike',
            'blade-shift',
            'twisting-blades',
            'flurry',
            'dash',
            'shadow-step',
          ])
          let Marksman_Use_Rate = 0
          let Cutthroat_Use_Rate = 0
          for (const Skill in Pre_Sim_Node['skill_use_rate']) {
            if (Marksman_Skills.has(Skill)) {
              Marksman_Use_Rate +=
                Pre_Sim_Node['skill_use_rate'][Skill]
            }
            if (Cutthroat_Skills.has(Skill)) {
              Cutthroat_Use_Rate +=
                Pre_Sim_Node['skill_use_rate'][Skill]
            }
          }
          if (Marksman_Use_Rate + Cutthroat_Use_Rate > 0) {
            if (tagsVal(nodes_map).has('marksman')) {
              Talent_Damage_Multiplier *=
                1 +
                (0.25 * Cutthroat_Use_Rate) /
                  (Marksman_Use_Rate + Cutthroat_Use_Rate)
            } else {
              Talent_Damage_Multiplier *=
                1 +
                (0.25 * Marksman_Use_Rate) /
                  (Marksman_Use_Rate + Cutthroat_Use_Rate)
            }
          }
        }

        // No Witnesses: Your Ultimate Skills gain an additional 10% [x] damage from your Damage with Ultimate bonus and grant this bonus to all Skills for 8 seconds when cast.
        if (paragonVal(nodes_map, 'no-witnesses')) {
          const No_Witnesses_Bonus =
            0.1 * aggregationVal(nodes_map, 'ultimate-skill-damage')
          if (tagsVal(nodes_map).has('ultimate')) {
            Talent_Damage_Multiplier *= 1 + No_Witnesses_Bonus
          } else {
            if (allSkillsVal(nodes_map).has('shadow-clone')) {
              Talent_Damage_Multiplier *=
                1 +
                No_Witnesses_Bonus *
                  Math.min(
                    8 / statVal(nodes_map, 'Shadow_Clone_Cooldown'),
                    1,
                  )
            }
            if (allSkillsVal(nodes_map).has('death-trap')) {
              Talent_Damage_Multiplier *=
                1 +
                No_Witnesses_Bonus *
                  Math.min(
                    8 / statVal(nodes_map, 'Death_Trap_Cooldown'),
                    1,
                  )
            }
            if (allSkillsVal(nodes_map).has('rain-of-arrows')) {
              Talent_Damage_Multiplier *=
                1 +
                No_Witnesses_Bonus *
                  Math.min(
                    8 / statVal(nodes_map, 'Rain_Of_Arrows_Cooldown'),
                    1,
                  )
            }
          }
        }

        // Weapon Mastery : Daggers x5% Damage against Healthy Enemies
        // Ava tested and it only applies to skills.
        if (!tagsVal(nodes_map).has('marksman')) {
          let Weapon_Mastery_Bonus = 0
          if (aggregationVal(nodes_map, 'main-hand-weapon') == 1) {
            Weapon_Mastery_Bonus += 0.025
          }
          if (aggregationVal(nodes_map, 'off-hand-weapon') == 1) {
            Weapon_Mastery_Bonus += 0.025
          }
          Talent_Damage_Multiplier *=
            1 +
            (Weapon_Mastery_Bonus * 0.2) /
              (1 + Weapon_Mastery_Bonus * 0.8)
          talentVal(nodes_map, 'weapon-mastery')
        }

        // Weapon Mastery : Sword 3% Damage
        // Ava tested and it only applies to skills.
        if (!tagsVal(nodes_map).has('marksman')) {
          let Sword_Weapon_Mastery_Bonus = 0
          if (aggregationVal(nodes_map, 'main-hand-weapon') == 0) {
            Sword_Weapon_Mastery_Bonus += 0.015
          }
          if (aggregationVal(nodes_map, 'off-hand-weapon') == 0) {
            Sword_Weapon_Mastery_Bonus += 0.015
          }
          Talent_Damage_Multiplier *=
            1 +
            Sword_Weapon_Mastery_Bonus *
              talentVal(nodes_map, 'weapon-mastery')
        }

        // Weapon Mastery : Bow x4% Damage against Vulnerable
        // Ava tested and it only applies to skills.
        if (tagsVal(nodes_map).has('marksman')) {
          let Bow_Weapon_Mastery_Bonus = 0
          if (
            aggregationVal(nodes_map, 'ranged-weapon') == 0 &&
            statVal(nodes_map, 'Enemy_Vulnerable') > 0
          ) {
            Bow_Weapon_Mastery_Bonus +=
              0.04 * statVal(nodes_map, 'Enemy_Vulnerable')
          }
          Talent_Damage_Multiplier *=
            1 +
            Bow_Weapon_Mastery_Bonus *
              talentVal(nodes_map, 'weapon-mastery')
        }

        // Legendary Paragon 'leyranas-instinct', // When Inner Sight's gauge becomes full, you gain 100%[+] Dodge Chance for 2 seconds.
        // Your next 3 Core skills deal additional damage equal to 20%[x] of your Core Skill Damage bonus.
        if (paragonVal(nodes_map, "leyrana's-instinct")) {
          const Core_Skills = new Set([
            'twisting-blades',
            'rapid-fire',
            'barrage',
            'flurry',
            'penetrating-shot',
          ])
          Talent_Damage_Multiplier *=
            1 + 0.2 * statVal(nodes_map, 'Inner_Sight_Rate')
        }

        return Talent_Damage_Multiplier
      },
    ),

    Hits_Multiplier: new StatsNode('Hits_Multiplier', () => {
      const number_of_enemies = Number(
        toggleVal(nodes_map, 'number-of-enemies'),
      )
      const enemy_spread = Number(statVal(nodes_map, 'Enemy_Spread'))
      const Pre_Sim_Node = roguePresimVal(nodes_map)

      const Critical_Chance = statVal(nodes_map, 'Critical_Chance')

      let Average_Combo_Points
      let Barrage_Arrows
      let Bladedancer_Hits
      let Bladedancer_Multiplier
      let Combo_Point_Distribution
      let Hits_Multiplier = 1
      let Poison_Trap_Area
      let Rapid_Arrows
      let Return_Multiplier
      let Return_Hits
      let Ricochet_Chance
      let Ricochet_Distance
      let Trap_Range
      let p

      switch (currentSkillVal(nodes_map)['name']) {
        case 'forceful-arrow':
          // Primary Forceful Arrow: Every third cast pierces enemies.
          if (talentVal(nodes_map, 'primary-forceful-arrow') > 0) {
            Hits_Multiplier =
              1 +
              (1 / 3) *
                ProbabilityIntersectingLineInCircle(
                  10,
                  60,
                  enemy_spread,
                ) *
                (number_of_enemies - 1)
          }
          break

        case 'heartseeker':
          // Primary Heartseeker: Heartseeker ricochets to an additonal enemy, dealing 75% of the original damage.
          if (
            talentVal(nodes_map, 'primary-heartseeker') > 0 &&
            number_of_enemies > 1
          ) {
            Hits_Multiplier = 1.75
          }
          break

        case 'puncture':
          // Fundamental Puncture: Punture now throws 3 blades in a spread, each dealing 35% of its Base damage. Hitting an enemy with at least 2 blades at once makes them Vulnerable for 2 seconds.
          if (talentVal(nodes_map, 'fundamental-puncture') > 0) {
            // Shotgunning: Player is hitting all 3 directly adjacent to enemy
            if (toggleVal(nodes_map, 'enemy-distant')) {
              // We assume target is in the cone and every enemy in the cone gets hit by one blade.
              Hits_Multiplier =
                0.35 *
                (1 +
                  Math.min(
                    ProbabilityInCone(30, 1 / 8, enemy_spread) *
                      (number_of_enemies - 1),
                    2,
                  ))
            } else {
              // Enemy close.
              Hits_Multiplier = 0.35 * 3
            }
          }

          // Primary Puncture: Every 3rd cast of Puncture will also ricochet up to 2 times. Critical Strikes will always ricochet.
          Ricochet_Distance = 15
          if (talentVal(nodes_map, 'primary-puncture') > 0) {
            const ricochet_rate = (2 / 3) * Critical_Chance + 1 / 3
            p
            if (!toggleVal(nodes_map, 'enemy-distant')) {
              // Probability of a single enemy being within bounce distance.
              p = Math.min(
                Ricochet_Distance ** 2 / enemy_spread ** 2,
                1,
              )
            } else {
              p = ProbabilityInCircle(
                25,
                Ricochet_Distance,
                enemy_spread,
              )
            }
            Hits_Multiplier *=
              1 +
              ricochet_rate *
                (1 -
                  BinomialDistribution(number_of_enemies - 1, p, 0) +
                  1 -
                  BinomialDistribution(number_of_enemies - 1, p, 1))
          }
          break

        case 'barrage':
          // Barrage: Unleash a barrage of 5 arrows that expands outwards, each dealing {['21%', '23%', '25%', '27%', '29%',} damage.
          // Each arrows has a 20% chance to ricochet off an enemy up to 1 time. Ricochets deal 40% of the arrow's Base damage.
          Ricochet_Distance = 15
          Ricochet_Chance = 0.2
          Barrage_Arrows = 5
          if (
            'barrage' in Pre_Sim_Node['combo_point_distribution'] &&
            specializationVal(nodes_map) == 'combo-points'
          ) {
            // [number, number, number, number] (should sum to 1)
            const Combo_Point_Distribution =
              Pre_Sim_Node['combo_point_distribution']['barrage']
            let Average_Combo_Points = 0
            for (let i = 0; i < 4; i++) {
              Average_Combo_Points += Combo_Point_Distribution[i] * i
            }
            // Cunning Strategem: Your non-damage Combo Point bonuses are increased by 1/3 when you spend 3 Combo Points.
            if (paragonVal(nodes_map, 'cunning-stratagem')) {
              Average_Combo_Points += Combo_Point_Distribution[3]
            }
            Barrage_Arrows += Average_Combo_Points
          }
          // Enhanced Barrage Barrage's ricochet chance is increased to 100% for arrows that damage a Vulnerable enemy or Critical Strike an enemy.
          if (talentVal(nodes_map, 'enhanced-barrage') > 0) {
            if (toggleVal(nodes_map, 'enemy-vulnerable')) {
              Ricochet_Chance = 1
            } else {
              Ricochet_Chance =
                1 -
                (1 - Ricochet_Chance) *
                  (1 - Critical_Chance) *
                  (1 - statVal(nodes_map, 'Enemy_Vulnerable'))
            }
          }
          // Aspect of Branching Volleys : Barrage's arrows have a {15/25}% chance to split into 2 arrows whenever they ricochet.
          if (
            aspectVal(nodes_map, 'aspect-of-branching-volleys')
              .length > 0
          ) {
            // We just multiply the chance by the average number of arrows which scales the hits when ricochet happens.
            Ricochet_Chance *=
              1 +
              aspectVal(nodes_map, 'aspect-of-branching-volleys')[0]
          }
          if (toggleVal(nodes_map, 'enemy-distant')) {
            // Chance that an enemy is near the main target.
            const p_0 = ProbabilityInCircle(
              25,
              Ricochet_Distance,
              enemy_spread,
            )
            // Chance that an enemy is near a randomly hit enemy.
            const p_1 = ProbabilityInCircle(
              enemy_spread / 2,
              Ricochet_Distance,
              enemy_spread,
            )
            Hits_Multiplier =
              1 +
              0.4 * Ricochet_Chance * p_0 +
              // Assume each enemy hit is at half the enemy_spread range. Then look around them for a bounce target.
              Math.min(
                ProbabilityInCone(60, 1 / 6, enemy_spread) *
                  (number_of_enemies - 1),
                Barrage_Arrows - 1,
              ) *
                (1 + 0.4 * Ricochet_Chance * p_1)
          } else {
            // Enemy close.
            p = Math.min(
              Ricochet_Distance ** 2 / enemy_spread ** 2,
              1,
            )
            Hits_Multiplier =
              Barrage_Arrows *
              (1 +
                0.4 *
                  Ricochet_Chance *
                  (1 - (1 - p) ** (number_of_enemies - 1)))
          }
          break

        // Flurry: Unleash a flurry of stabs and slashes, striking enemies in front of you 4 times and dealing {['60%', '66%', '72%', '78%', '84%',} damage to each.
        case 'flurry':
          Hits_Multiplier =
            1 +
            ProbabilityInCone(10, 1 / 4, enemy_spread) *
              (number_of_enemies - 1)
          // Aspect of Encircling Blades : Flurry damages enemies in a circle around you and deals x{8/15}% increased damage.
          if (
            aspectVal(nodes_map, 'aspect-of-encircling-blades')
              .length > 0
          ) {
            Hits_Multiplier =
              1 +
              ProbabilityInCircle(0, 10, enemy_spread) *
                (number_of_enemies - 1)
          }
          break

        // Penetrating Shot: Fire an arrow that pierces through all enemies in a line, dealing {['70%', '77%', '84%', '91%', '98%',} damage.
        //   ['improved-penetrating-shot', 1], // Penetrating Shot deals an additional 10%[x] increased damage per enemy it hits.
        // Trickshot Aspect : Whenever Penetrating Shot damages an enemy, 2 additional arrows split off to either side. These side arrows deal {10/25}% of Penetrating Shot's Base damage and do not split.
        // (TODO) Trickshot aspect is more properly a cord.
        case 'penetrating-shot':
          p = ProbabilityIntersectingLineInCircle(
            10,
            60,
            enemy_spread,
          )
          for (let i = 1; i < number_of_enemies; i++) {
            Hits_Multiplier +=
              (1 +
                0.1 *
                  i *
                  Number(
                    talentVal(
                      nodes_map,
                      'improved-penetrating-shot',
                    ) > 0,
                  ) +
                2 *
                  aspectVal(nodes_map, 'trickshot-aspect')[0] *
                  (1 - (1 - p / 2) ** (number_of_enemies - 1))) *
              (1 -
                BinomialDistribution(number_of_enemies - 1, p, i - 1))
          }
          break

        // Twisting Blades: Impale an enemy with your blades, dealing {['45%', '50%', '54%', '58%', '63%',} damage and making them take 8% increased damage from you while impaled.
        // After 1.5 seconds, the blades return to you, piercing enemies for {'72%',...} damage.
        case 'twisting-blades':
          // Enhanced Twising Blades: Twisting Blades deals 30% increased damage when returning.
          Return_Multiplier =
            (72 / 45) *
            (1 +
              0.3 *
                Number(
                  talentVal(nodes_map, 'enhanced-twisting-blades') >
                    0,
                ))
          // bladedancers Aspect : Twisting Blades orbit for a short time after they return to you, dealing 20–30% of Twisting Blade's return damage per hit.
          // Based on the distance the blades returned, the orbit damage increases up to {20/30}% of the return damage.
          // Model:
          //  - Blades circle around the player twice, hitting each target within 10 yards 2x.
          //  - Max return banefit occurs at 30 yards.
          //  - Player runs to enemy_spread - 10 yards away from the original target.
          //  - Original target gets hit by the return but not by the orbit unless the player moves 10 yards or less.
          Bladedancer_Multiplier = 0
          Bladedancer_Hits = 0
          if (
            aspectVal(nodes_map, 'bladedancers-aspect').length > 0
          ) {
            const Blade_Dancer_Bonus = aspectVal(
              nodes_map,
              'bladedancers-aspect',
            )[0]

            Bladedancer_Multiplier =
              Return_Multiplier * Blade_Dancer_Bonus
            // Only hit original target if didn't move more than 10 yards.
            Bladedancer_Hits =
              2 *
              (1 +
                Math.min(1, 10 ** 2 / enemy_spread ** 2) *
                  (number_of_enemies - 1))
          }
          Return_Hits =
            1 +
            ProbabilityIntersectingLineInCircle(
              10,
              enemy_spread,
              enemy_spread,
            ) *
              (number_of_enemies - 1)
          Hits_Multiplier =
            1 +
            // Return damage
            Return_Multiplier * Return_Hits +
            // Bladedancer damage
            Bladedancer_Multiplier * Bladedancer_Hits

          break

        //Poison Trap: Place a trap that arms after 1.25 seconds. It activates when an enemy moves within range, applying {['344%', '379%', '413%', '447%', '482%',} Poisoning damage over 9 seconds to enemies in the area.
        case 'poison-trap':
          Poison_Trap_Area = 10
          // Snare: Non-Ultimate Trap Skills have x25% increased area.
          if (paragonVal(nodes_map, 'snare')) {
            Poison_Trap_Area *= 1.25
          }
          Hits_Multiplier =
            1 +
            Math.min(Poison_Trap_Area ** 2 / enemy_spread ** 2, 1) *
              (number_of_enemies - 1)
          break

        // Caltrops: Leap backwards and throw caltrops on the ground, dealing {['30%', '33%', '36%', '39%', '42%',} damage and Slowing enemies by {value2} . Lasts 7 seconds.
        case 'caltrops':
          if (toggleVal(nodes_map, 'enemy-distant')) {
            Hits_Multiplier =
              1 +
              ProbabilityInCircle(25, 20, enemy_spread) *
                (number_of_enemies - 1)
          } else {
            Hits_Multiplier =
              1 +
              Math.min(20 ** 2 / enemy_spread ** 2, 1) *
                (number_of_enemies - 1)
          }
          break
        // Dash: Dash forward and slash enemies for {value2} damage.
        case 'dash':
          Hits_Multiplier =
            1 +
            ProbabilityIntersectingLineInCircle(
              20,
              30,
              enemy_spread,
            ) *
              (number_of_enemies - 1)
          // Shadowslicer Aspect : When you cast Dash, a Shadow Clone is spawned at your location that also casts Dash, dealing {80/100}% of the Base damage.
          if (
            aspectVal(nodes_map, 'shadowslicer-aspect').length > 0
          ) {
            Hits_Multiplier *=
              1 + aspectVal(nodes_map, 'shadowslicer-aspect')[0]
          }
          break

        // Death Trap: Place a trap that arms after 1.25 seconds. It activates when an enemy moves within range, dealing 250% damage to each enemy in the area.
        case 'death-trap':
          Trap_Range = 20
          Hits_Multiplier =
            1 +
            Math.min(
              1,
              Trap_Range ** 2 /
                statVal(nodes_map, 'Enemy_Spread') ** 2,
            ) *
              (number_of_enemies - 1)
          if (toggleVal(nodes_map, 'enemy-distant')) {
            Hits_Multiplier =
              Math.min(
                1,
                Trap_Range ** 2 /
                  statVal(nodes_map, 'Enemy_Spread') ** 2,
              ) * number_of_enemies
          }

          // Eyes in the Dark : Unless it hits a Boss or Player, Death Trap will continue to re-arm itself until it kills an enemy. However, Death Trap's Cooldown is increased by {20/15}%.
          // increases the damage of Death Trap by 30-50%.
          if (
            aspectVal(nodes_map, 'eyes-in-the-dark').length > 0 &&
            statVal(nodes_map, 'Enemies_Killed') < 1 &&
            !toggleVal(nodes_map, 'enemy-boss')
          ) {
            Hits_Multiplier *= 2
          }

          break

        // Rain of Arrows: Arrows rain down over a large area 2 times, each wave dealing 100% damage.
        case 'rain-of-arrows':
          // We model this as hitting 1/2 screen 2x. The target gets hit both times (in the center)?
          Hits_Multiplier = 1 + number_of_enemies
          break

        // Repeating Aspect : Rapid Fire has a {30/45}% chance to ricochet to another target.
        // Rapidly fire 5 arrows, each dealing {['24%', '26%', '29%', '31%', '34%',} damage.
        case 'rapid-fire':
          Rapid_Arrows = 5
          if (
            'rapid-fire' in
              Pre_Sim_Node['combo_point_distribution'] &&
            specializationVal(nodes_map) == 'combo-points'
          ) {
            // [number, number, number, number] (should sum to 1)
            Combo_Point_Distribution =
              Pre_Sim_Node['combo_point_distribution']['rapid-fire']
            Average_Combo_Points = 0
            for (let i = 0; i < 4; i++) {
              Average_Combo_Points += Combo_Point_Distribution[i] * i
            }
            // Cunning Strategem: Your non-damage Combo Point bonuses are increased by 1/3 when you spend 3 Combo Points.
            if (paragonVal(nodes_map, 'cunning-stratagem')) {
              Average_Combo_Points += Combo_Point_Distribution[3]
            }
            Rapid_Arrows += Average_Combo_Points
          }
          Hits_Multiplier = Rapid_Arrows
          if (aspectVal(nodes_map, 'repeating-aspect').length > 0) {
            const Ricochet_Distance = 15
            let p = 0
            const Ricochet_Chance = aspectVal(
              nodes_map,
              'repeating-aspect',
            )[0]
            if (toggleVal(nodes_map, 'enemy-distant')) {
              // Chance that an enemy is near the main target.
              p =
                1 -
                (1 -
                  ProbabilityInCircle(
                    25,
                    Ricochet_Distance,
                    enemy_spread,
                  )) **
                  (number_of_enemies - 1)
            } else {
              // Enemy close.
              p =
                1 -
                (1 -
                  Math.min(
                    Ricochet_Distance ** 2 / enemy_spread ** 2,
                    1,
                  )) **
                  (number_of_enemies - 1)
            }
            Hits_Multiplier = Rapid_Arrows * (1 + Ricochet_Chance * p)
          }
          break
        case 'dark-shroud':
          Hits_Multiplier = 0
          break
      }

      return Hits_Multiplier
    }),

    Primary_Hits: new StatsNode('Primary_Hits', () => {
      const Pre_Sim_Node = roguePresimVal(nodes_map)

      let Average_Combo_Points
      let Barrage_Arrows
      let Combo_Point_Distribution
      let Number_of_Hits = 1
      let Rapid_Arrows

      switch (currentSkillVal(nodes_map)['name']) {
        case 'puncture':
          // Fundamental Puncture: Punture now throws 3 blades in a spread, each dealing 35% of its Base damage. Hitting an enemy with at least 2 blades at once makes them Vulnerable for 2 seconds.
          if (talentVal(nodes_map, 'fundamental-puncture') > 0) {
            // Shotgunning: Player is hitting all 3 directly adjacent to enemy
            if (toggleVal(nodes_map, 'enemy-distant')) {
              // We assume target is in the cone and every enemy in the cone gets hit by one blade.
              Number_of_Hits = 1
            } else {
              // Enemy close.
              Number_of_Hits = 3
            }
          }
          break

        case 'barrage':
          // Barrage: Unleash a barrage of 5 arrows that expands outwards, each dealing {['21%', '23%', '25%', '27%', '29%',} damage.
          // Each arrows has a 20% chance to ricochet off an enemy up to 1 time. Ricochets deal 40% of the arrow's Base damage.
          Barrage_Arrows = 5
          if (
            'barrage' in Pre_Sim_Node['combo_point_distribution'] &&
            specializationVal(nodes_map) == 'combo-points'
          ) {
            // [number, number, number, number] (should sum to 1)
            Combo_Point_Distribution =
              Pre_Sim_Node['combo_point_distribution']['barrage']
            Average_Combo_Points = 0
            for (let i = 0; i < 4; i++) {
              Average_Combo_Points += Combo_Point_Distribution[i] * i
            }
            // Cunning Strategem: Your non-damage Combo Point bonuses are increased by 1/3 when you spend 3 Combo Points.
            if (paragonVal(nodes_map, 'cunning-stratagem')) {
              Average_Combo_Points += Combo_Point_Distribution[3]
            }
            Barrage_Arrows += Average_Combo_Points
          }
          if (toggleVal(nodes_map, 'enemy-distant')) {
            Number_of_Hits = 1
          } else {
            // Enemy close.
            Number_of_Hits = Barrage_Arrows
          }
          break

        // Flurry: Unleash a flurry of stabs and slashes, striking enemies in front of you 4 times and dealing {['60%', '66%', '72%', '78%', '84%',} damage to each.
        case 'flurry':
          // (TODO) x4?
          Number_of_Hits = 4
          break

        // Twisting Blades: Impale an enemy with your blades, dealing {['45%', '50%', '54%', '58%', '63%',} damage and making them take 8% increased damage from you while impaled.
        // After 1.5 seconds, the blades return to you, piercing enemies for {'72%',...} damage.
        case 'twisting-blades':
          Number_of_Hits = 2
          break

        // Dash: Dash forward and slash enemies for {value2} damage.
        case 'dash':
          // Shadowslicer Aspect : When you cast Dash, a Shadow Clone is spawned at your location that also casts Dash, dealing {80/100}% of the Base damage.
          if (
            aspectVal(nodes_map, 'shadowslicer-aspect').length > 0
          ) {
            Number_of_Hits = 2
          }
          break

        // Rain of Arrows: Arrows rain down over a large area 2 times, each wave dealing 100% damage.
        case 'rain-of-arrows':
          // We model this as hitting 1/2 screen 2x. The target gets hit both times (in the center)?
          Number_of_Hits = 2
          break

        // Repeating Aspect : Rapid Fire has a {30/45}% chance to ricochet to another target.
        // Rapidly fire 5 arrows, each dealing {30}% damage.
        case 'rapid-fire':
          Rapid_Arrows = 5
          if (
            'rapid-fire' in
              Pre_Sim_Node['combo_point_distribution'] &&
            specializationVal(nodes_map) == 'combo-points'
          ) {
            // [number, number, number, number] (should sum to 1)
            Combo_Point_Distribution =
              Pre_Sim_Node['combo_point_distribution']['rapid-fire']
            Average_Combo_Points = 0
            for (let i = 0; i < 4; i++) {
              Average_Combo_Points += Combo_Point_Distribution[i] * i
            }
            // Cunning Strategem: Your non-damage Combo Point bonuses are increased by 1/3 when you spend 3 Combo Points.
            if (paragonVal(nodes_map, 'cunning-stratagem')) {
              Average_Combo_Points += Combo_Point_Distribution[3]
            }
            Rapid_Arrows += Average_Combo_Points
          }
          Number_of_Hits = Rapid_Arrows
          break
        case 'shadow-clone':
          Number_of_Hits = 0
          break
        case 'dark-shroud':
          Number_of_Hits = 0
          break
      }

      return Number_of_Hits
    }),

    Secondary_Hits: new StatsNode('Secondary_Hits', () => {
      const number_of_enemies = Number(
        toggleVal(nodes_map, 'number-of-enemies'),
      )
      const enemy_spread = Number(statVal(nodes_map, 'Enemy_Spread'))
      const Critical_Chance = statVal(nodes_map, 'Critical_Chance')
      const Pre_Sim_Node = roguePresimVal(nodes_map)

      let Average_Combo_Points
      let Barrage_Arrows
      let Bladedancer_Hits
      let Combo_Point_Distribution
      let Number_of_Hits = 0
      let Return_Hits
      let Rapid_Arrows
      let Ricochet_Chance
      let Ricochet_Distance
      let p
      let Poison_Trap_Area
      let Trap_Range

      switch (currentSkillVal(nodes_map)['name']) {
        case 'forceful-arrow':
          // Primary Forceful Arrow: Forceful Arrows pierces through Vulnerable enemies.
          if (statVal(nodes_map, 'Enemy_Vulnerable') == 1) {
            Number_of_Hits =
              1 +
              ProbabilityIntersectingLineInCircle(
                10,
                60,
                enemy_spread,
              ) *
                (number_of_enemies - 1)
          }
          break

        case 'heartseeker':
          // Primary Heartseeker: Heartseeker ricochets to an additional enemy, dealing 30% of the original damage.
          if (
            talentVal(nodes_map, 'primary-heartseeker') > 0 &&
            number_of_enemies > 1
          ) {
            Number_of_Hits = 1
          }
          break

        case 'puncture':
          // Fundamental Puncture: Punture now throws 3 blades in a spread, each dealing 35% of its Base damage. Hitting an enemy with at least 2 blades at once makes them Vulnerable for 2 seconds.
          if (talentVal(nodes_map, 'fundamental-puncture') > 0) {
            // Shotgunning: Player is hitting all 3 directly adjacent to enemy
            if (toggleVal(nodes_map, 'enemy-distant')) {
              // We assume target is in the cone and every enemy in the cone gets hit by one blade.
              Number_of_Hits = Math.min(
                ProbabilityInCone(30, 1 / 8, enemy_spread) *
                  (number_of_enemies - 1),
                2,
              )
            } else {
              // Enemy close.
              Number_of_Hits = 0
            }
          }

          // Primary Puncture: Every 3rd cast of Puncture will also ricochet up to 2 times. Critical Strikes will always ricochet.
          Ricochet_Distance = 15
          if (talentVal(nodes_map, 'primary-puncture') > 0) {
            const ricochet_rate = (2 / 3) * Critical_Chance + 1 / 3
            if (!toggleVal(nodes_map, 'enemy-distant')) {
              // Probability of a single enemy being within bounce distance.
              p = Math.min(
                Ricochet_Distance ** 2 / enemy_spread ** 2,
                1,
              )
            } else {
              p = ProbabilityInCircle(
                25,
                Ricochet_Distance,
                enemy_spread,
              )
            }
            Number_of_Hits =
              (statVal(nodes_map, 'Primary_Hits') + Number_of_Hits) *
                (1 +
                  ricochet_rate *
                    (1 -
                      BinomialDistribution(
                        number_of_enemies - 1,
                        p,
                        0,
                      ) +
                      1 -
                      BinomialDistribution(
                        number_of_enemies - 1,
                        p,
                        1,
                      ))) -
              statVal(nodes_map, 'Primary_Hits')
          }
          break

        case 'barrage':
          // Barrage: Unleash a barrage of 5 arrows that expands outwards, each dealing {['21%', '23%', '25%', '27%', '29%',} damage.
          // Each arrows has a 20% chance to ricochet off an enemy up to 1 time. Ricochets deal 40% of the arrow's Base damage.
          Ricochet_Distance = 15
          Ricochet_Chance = 0.2
          Barrage_Arrows = 5
          if (
            'barrage' in Pre_Sim_Node['combo_point_distribution'] &&
            specializationVal(nodes_map) == 'combo-points'
          ) {
            // [number, number, number, number] (should sum to 1)
            Combo_Point_Distribution =
              Pre_Sim_Node['combo_point_distribution']['barrage']
            Average_Combo_Points = 0
            for (let i = 0; i < 4; i++) {
              Average_Combo_Points += Combo_Point_Distribution[i] * i
            }
            // Cunning Strategem: Your non-damage Combo Point bonuses are increased by 1/3 when you spend 3 Combo Points.
            if (paragonVal(nodes_map, 'cunning-stratagem')) {
              Average_Combo_Points += Combo_Point_Distribution[3]
            }
            Barrage_Arrows += Average_Combo_Points
          }
          // Enhanced Barrage: Barrage's ricochet chance is increased to 100% for arrows that damage a Vulnerable enemy or Critical Strike an enemy.
          if (talentVal(nodes_map, 'enhanced-barrage') > 0) {
            if (statVal(nodes_map, 'Enemy_Vulnerable') == 1) {
              Ricochet_Chance = 1
            } else {
              Ricochet_Chance =
                1 - (1 - Ricochet_Chance) * (1 - Critical_Chance)
            }
          }
          // Aspect of Branching Volleys : Barrage's arrows have a {15/25}% chance to split into 2 arrows whenever they ricochet.
          if (
            aspectVal(nodes_map, 'aspect-of-branching-volleys')
              .length > 0
          ) {
            // We just multiply the chance by the average number of arrows which scales the hits when ricochet happens.
            Ricochet_Chance *=
              1 +
              aspectVal(nodes_map, 'aspect-of-branching-volleys')[0]
          }
          if (toggleVal(nodes_map, 'enemy-distant')) {
            // Chance that an enemy is near the main target.
            const p_0 = ProbabilityInCircle(
              25,
              Ricochet_Distance,
              enemy_spread,
            )
            // Chance that an enemy is near a randomly hit enemy.
            const p_1 = ProbabilityInCircle(
              enemy_spread / 2,
              Ricochet_Distance,
              enemy_spread,
            )
            Number_of_Hits =
              Ricochet_Chance * p_0 +
              // Assume each enemy hit is at half the enemy_spread range. Then look around them for a bounce target.
              Math.min(
                ProbabilityInCone(60, 1 / 6, enemy_spread) *
                  (number_of_enemies - 1),
                Barrage_Arrows - 1,
              ) *
                (1 + Ricochet_Chance * p_1)
          } else {
            // Enemy close.
            p = Math.min(
              Ricochet_Distance ** 2 / enemy_spread ** 2,
              1,
            )
            // (TODO) Should be binomial I think but dont have time to work it out.
            Number_of_Hits =
              Barrage_Arrows *
              Ricochet_Chance *
              (1 - (1 - p) ** (number_of_enemies - 1))
          }
          break

        // Flurry: Unleash a flurry of stabs and slashes, striking enemies in front of you 4 times and dealing {['60%', '66%', '72%', '78%', '84%',} damage to each.
        case 'flurry':
          // (TODO) x4?
          Number_of_Hits =
            4 *
            ProbabilityInCone(10, 1 / 4, enemy_spread) *
            (number_of_enemies - 1)
          // Aspect of Encircling Blades : Flurry damages enemies in a circle around you and deals x{8/15}% increased damage.
          if (
            aspectVal(nodes_map, 'aspect-of-encircling-blades')
              .length > 0
          ) {
            Number_of_Hits =
              ProbabilityInCircle(0, 10, enemy_spread) *
              (number_of_enemies - 1)
          }
          break

        // Penetrating Shot: Fire an arrow that pierces through all enemies in a line, dealing {['70%', '77%', '84%', '91%', '98%',} damage.
        case 'penetrating-shot':
          Number_of_Hits =
            ProbabilityIntersectingLineInCircle(
              10,
              60,
              enemy_spread,
            ) *
            (number_of_enemies - 1)
          break

        // Twisting Blades: Impale an enemy with your blades, dealing {['45%', '50%', '54%', '58%', '63%',} damage and making them take 8% increased damage from you while impaled.
        // After 1.5 seconds, the blades return to you, piercing enemies for {'72%',...} damage.
        case 'twisting-blades':
          // bladedancers Aspect : Twisting Blades orbit for a short time after they return to you, dealing 20–30% of Twisting Blade's return damage per hit.
          // Based on the distance the blades returned, the orbit damage increases up to {20/30}% of the return damage.
          // Model:
          //  - Blades circle around the player twice, hitting each target within 10 yards 2x.
          //  - Max return banefit occurs at 30 yards.
          //  - Player runs to enemy_spread - 10 yards away from the original target.
          //  - Original target gets hit by the return but not by the orbit unless the player moves 10 yards or less.
          Bladedancer_Hits = 0
          if (
            aspectVal(nodes_map, 'bladedancers-aspect').length > 0
          ) {
            Bladedancer_Hits =
              2 *
              (1 +
                Math.min(1, 10 ** 2 / enemy_spread ** 2) *
                  (number_of_enemies - 1))
          }
          Return_Hits =
            ProbabilityIntersectingLineInCircle(
              10,
              enemy_spread,
              enemy_spread,
            ) *
            (number_of_enemies - 1)
          // Assumes the player runs back 20 yards and hits the original target again.
          Number_of_Hits = Return_Hits + Bladedancer_Hits
          break

        //Poison Trap: Place a trap that arms after 1.25 seconds. It activates when an enemy moves within range, applying {['344%', '379%', '413%', '447%', '482%',} Poisoning damage over 9 seconds to enemies in the area.
        case 'poison-trap':
          Poison_Trap_Area = 10
          // Snare: Non-Ultimate Trap Skills have x25% increased area.
          if (paragonVal(nodes_map, 'snare')) {
            Poison_Trap_Area *= 1.25
          }
          Number_of_Hits =
            Math.min(Poison_Trap_Area ** 2 / enemy_spread ** 2, 1) *
            (number_of_enemies - 1)
          break

        // Caltrops: Leap backwards and throw caltrops on the ground, dealing {['30%', '33%', '36%', '39%', '42%',} damage and Slowing enemies by {value2} . Lasts 7 seconds.
        case 'caltrops':
          if (toggleVal(nodes_map, 'enemy-distant')) {
            Number_of_Hits =
              ProbabilityInCircle(25, 20, enemy_spread) *
              (number_of_enemies - 1)
          } else {
            Number_of_Hits =
              Math.min(20 ** 2 / enemy_spread ** 2, 1) *
              (number_of_enemies - 1)
          }
          break
        // Dash: Dash forward and slash enemies for {value2} damage.
        case 'dash':
          Number_of_Hits =
            ProbabilityIntersectingLineInCircle(
              20,
              30,
              enemy_spread,
            ) *
            (number_of_enemies - 1)
          // Shadowslicer Aspect : When you cast Dash, a Shadow Clone is spawned at your location that also casts Dash, dealing {80/100}% of the Base damage.
          if (
            aspectVal(nodes_map, 'shadowslicer-aspect').length > 0
          ) {
            Number_of_Hits *= 2
          }
          break

        // Death Trap: Place a trap that arms after 1.25 seconds. It activates when an enemy moves within range, dealing 250% damage to each enemy in the area.
        case 'death-trap':
          //Prime Death Trap: Enemies are Pulled into Death Trap when it activates.
          Trap_Range = 20
          if (toggleVal(nodes_map, 'enemy-distant')) {
            Number_of_Hits =
              ProbabilityInCircle(25, Trap_Range, enemy_spread) *
              (number_of_enemies - 1)
          } else {
            Number_of_Hits =
              Math.min(Trap_Range ** 2 / enemy_spread ** 2, 1) *
              (number_of_enemies - 1)
          }
          break

        // Rain of Arrows: Arrows rain down over a large area 2 times, each wave dealing 100% damage.
        case 'rain-of-arrows':
          // We model this as hitting 1/2 screen 2x. The target gets hit both times (in the center)?
          Number_of_Hits = number_of_enemies - 1
          break

        // Repeating Aspect : Rapid Fire has a {30/45}% chance to ricochet to another target.
        // Rapidly fire 5 arrows, each dealing {30}% damage.
        case 'rapid-fire':
          Rapid_Arrows = 5
          if (
            'rapid-fire' in
              Pre_Sim_Node['combo_point_distribution'] &&
            specializationVal(nodes_map) == 'combo-points'
          ) {
            // [number, number, number, number] (should sum to 1)
            Combo_Point_Distribution =
              Pre_Sim_Node['combo_point_distribution']['rapid-fire']
            Average_Combo_Points = 0
            for (let i = 0; i < 4; i++) {
              Average_Combo_Points += Combo_Point_Distribution[i] * i
            }
            // Cunning Strategem: Your non-damage Combo Point bonuses are increased by 1/3 when you spend 3 Combo Points.
            if (paragonVal(nodes_map, 'cunning-stratagem')) {
              Average_Combo_Points += Combo_Point_Distribution[3]
            }
            Rapid_Arrows += Average_Combo_Points
          }
          if (aspectVal(nodes_map, 'repeating-aspect').length > 0) {
            const Ricochet_Distance = 15
            let p = 0
            const Ricochet_Chance = aspectVal(
              nodes_map,
              'repeating-aspect',
            )[0]
            if (toggleVal(nodes_map, 'enemy-distant')) {
              // Chance that an enemy is near the main target.
              p =
                1 -
                (1 -
                  ProbabilityInCircle(
                    25,
                    Ricochet_Distance,
                    enemy_spread,
                  )) **
                  (number_of_enemies - 1)
            } else {
              // Enemy close.
              p =
                1 -
                (1 -
                  Math.min(
                    Ricochet_Distance ** 2 / enemy_spread ** 2,
                    1,
                  )) **
                  (number_of_enemies - 1)
            }
            Number_of_Hits =
              Rapid_Arrows *
              Ricochet_Chance *
              p *
              (number_of_enemies - 1)
          }
          break
        case 'shadow-clone':
          Number_of_Hits = 0
          break
        case 'dark-shroud':
          Number_of_Hits = 0
          break
      }

      return Number_of_Hits
    }),

    // Almost the same as Hits_Multiplier, but this should track the track the quantity of hits not a damage multiplier which could be different.
    Total_Hits: new StatsNode('Total_Hits', () => {
      return (
        statVal(nodes_map, 'Primary_Hits') +
        statVal(nodes_map, 'Secondary_Hits')
      )
    }),

    Number_Enemies_Hit: new StatsNode('Number_Enemies_Hit', () => {
      const number_of_enemies = Number(
        toggleVal(nodes_map, 'number-of-enemies'),
      )
      const enemy_spread = Number(statVal(nodes_map, 'Enemy_Spread'))
      const Critical_Chance = statVal(nodes_map, 'Critical_Chance')
      const Pre_Sim_Node = roguePresimVal(nodes_map)

      let Average_Combo_Points
      let Barrage_Arrows
      let Bladedancer_Hits
      let Combo_Point_Distribution
      let Number_of_Hits = 1
      let Rapid_Arrows
      let Ricochet_Chance
      let Ricochet_Distance
      let p
      let Poison_Trap_Area
      let Trap_Range
      const Extra_Return_Hits =
        (ProbabilityIntersectingLineInCircle(
          10,
          enemy_spread,
          enemy_spread,
        ) -
          ProbabilityIntersectingLineInCircle(10, 10, enemy_spread)) *
        (number_of_enemies - 1)

      switch (currentSkillVal(nodes_map)['name']) {
        case 'forceful-arrow':
          // Primary Forceful Arrow: Forceful Arrows pierces through Vulnerable enemies.
          if (statVal(nodes_map, 'Enemy_Vulnerable') == 1) {
            Number_of_Hits +=
              ProbabilityIntersectingLineInCircle(
                10,
                60,
                enemy_spread,
              ) *
              (number_of_enemies - 1)
          }
          break

        case 'heartseeker':
          // Primary Heartseeker: Heartseeker ricochets to an additional enemy, dealing 30% of the original damage.
          if (
            talentVal(nodes_map, 'primary-heartseeker') > 0 &&
            number_of_enemies > 1
          ) {
            Number_of_Hits = 2
          }
          break

        case 'puncture':
          // Fundamental Puncture: Punture now throws 3 blades in a spread, each dealing 35% of its Base damage. Hitting an enemy with at least 2 blades at once makes them Vulnerable for 2 seconds.
          if (talentVal(nodes_map, 'fundamental-puncture') > 0) {
            // Shotgunning: Player is hitting all 3 directly adjacent to enemy
            if (toggleVal(nodes_map, 'enemy-distant')) {
              // We assume target is in the cone and every enemy in the cone gets hit by one blade.
              Number_of_Hits =
                1 +
                Math.min(
                  ProbabilityInCone(30, 1 / 8, enemy_spread) *
                    (number_of_enemies - 1),
                  2,
                )
            } else {
              // Enemy close.
              Number_of_Hits = 1
            }
          }

          // Primary Puncture: Every 3rd cast of Puncture will also ricochet up to 2 times. Critical Strikes will always ricochet.
          Ricochet_Distance = 15
          if (talentVal(nodes_map, 'primary-puncture') > 0) {
            const ricochet_rate = (2 / 3) * Critical_Chance + 1 / 3
            if (!toggleVal(nodes_map, 'enemy-distant')) {
              // Probability of a single enemy being within bounce distance.
              p = Math.min(
                Ricochet_Distance ** 2 / enemy_spread ** 2,
                1,
              )
            } else {
              p = ProbabilityInCircle(
                25,
                Ricochet_Distance,
                enemy_spread,
              )
            }
            Number_of_Hits =
              (statVal(nodes_map, 'Primary_Hits') + Number_of_Hits) *
                (1 +
                  ricochet_rate *
                    (1 -
                      BinomialDistribution(
                        number_of_enemies - 1,
                        p,
                        0,
                      ) +
                      1 -
                      BinomialDistribution(
                        number_of_enemies - 1,
                        p,
                        1,
                      ))) -
              statVal(nodes_map, 'Primary_Hits')
          }
          break

        case 'barrage':
          // Barrage: Unleash a barrage of 5 arrows that expands outwards, each dealing {['21%', '23%', '25%', '27%', '29%',} damage.
          // Each arrows has a 20% chance to ricochet off an enemy up to 1 time. Ricochets deal 40% of the arrow's Base damage.
          Ricochet_Distance = 15
          Ricochet_Chance = 0.2
          Barrage_Arrows = 5
          if (
            'barrage' in Pre_Sim_Node['combo_point_distribution'] &&
            specializationVal(nodes_map) == 'combo-points'
          ) {
            // [number, number, number, number] (should sum to 1)
            Combo_Point_Distribution =
              Pre_Sim_Node['combo_point_distribution']['barrage']
            Average_Combo_Points = 0
            for (let i = 0; i < 4; i++) {
              Average_Combo_Points += Combo_Point_Distribution[i] * i
            }
            // Cunning Strategem: Your non-damage Combo Point bonuses are increased by 1/3 when you spend 3 Combo Points.
            if (paragonVal(nodes_map, 'cunning-stratagem')) {
              Average_Combo_Points += Combo_Point_Distribution[3]
            }
            Barrage_Arrows += Average_Combo_Points
          }
          // Enhanced Barrage: Barrage's ricochet chance is increased to 100% for arrows that damage a Vulnerable enemy or Critical Strike an enemy.
          if (talentVal(nodes_map, 'enhanced-barrage') > 0) {
            if (toggleVal(nodes_map, 'enemy-vulnerable')) {
              Ricochet_Chance = 1
            } else {
              Ricochet_Chance =
                1 -
                (1 - Ricochet_Chance) *
                  (1 - Critical_Chance) *
                  (1 - statVal(nodes_map, 'Enemy_Vulnerable'))
            }
          }
          // Aspect of Branching Volleys : Barrage's arrows have a {15/25}% chance to split into 2 arrows whenever they ricochet.
          if (
            aspectVal(nodes_map, 'aspect-of-branching-volleys')
              .length > 0
          ) {
            // We just multiply the chance by the average number of arrows which scales the hits when ricochet happens.
            Ricochet_Chance *=
              1 +
              aspectVal(nodes_map, 'aspect-of-branching-volleys')[0]
          }
          if (toggleVal(nodes_map, 'enemy-distant')) {
            // Chance that an enemy is near the main target.
            const p_0 = ProbabilityInCircle(
              25,
              Ricochet_Distance,
              enemy_spread,
            )
            // Chance that an enemy is near a randomly hit enemy.
            const p_1 = ProbabilityInCircle(
              enemy_spread / 2,
              Ricochet_Distance,
              enemy_spread,
            )
            Number_of_Hits = Math.min(
              1 +
                Ricochet_Chance * p_0 +
                // Assume each enemy hit is at half the enemy_spread range. Then look around them for a bounce target.
                Math.min(
                  ProbabilityInCone(60, 1 / 6, enemy_spread) *
                    (number_of_enemies - 1),
                  Barrage_Arrows - 1,
                ) *
                  (1 + Ricochet_Chance * p_1),
              number_of_enemies,
            )
          } else {
            // Enemy close.
            p = Math.min(
              Ricochet_Distance ** 2 / enemy_spread ** 2,
              1,
            )
            // (TODO) Should be binomial I think but dont have time to work it out.
            Number_of_Hits = Math.min(
              1 +
                Barrage_Arrows *
                  Ricochet_Chance *
                  (1 - (1 - p) ** (number_of_enemies - 1)),
              number_of_enemies,
            )
          }
          break

        // Flurry: Unleash a flurry of stabs and slashes, striking enemies in front of you 4 times and dealing {['60%', '66%', '72%', '78%', '84%',} damage to each.
        case 'flurry':
          Number_of_Hits =
            1 +
            ProbabilityInCone(10, 1 / 4, enemy_spread) *
              (number_of_enemies - 1)
          // Aspect of Encircling Blades : Flurry damages enemies in a circle around you and deals x{8/15}% increased damage.
          if (
            aspectVal(nodes_map, 'aspect-of-encircling-blades')
              .length > 0
          ) {
            Number_of_Hits =
              1 +
              ProbabilityInCircle(0, 10, enemy_spread) *
                (number_of_enemies - 1)
          }
          break

        // Penetrating Shot: Fire an arrow that pierces through all enemies in a line, dealing {['70%', '77%', '84%', '91%', '98%',} damage.
        case 'penetrating-shot':
          Number_of_Hits =
            1 +
            ProbabilityIntersectingLineInCircle(
              10,
              60,
              enemy_spread,
            ) *
              (number_of_enemies - 1)
          break

        // Twisting Blades: Impale an enemy with your blades, dealing {['45%', '50%', '54%', '58%', '63%',} damage and making them take 8% increased damage from you while impaled.
        // After 1.5 seconds, the blades return to you, piercing enemies for {'72%',...} damage.
        case 'twisting-blades':
          // bladedancers Aspect : Twisting Blades orbit for a short time after they return to you, dealing 20–30% of Twisting Blade's return damage per hit.
          // Based on the distance the blades returned, the orbit damage increases up to {20/30}% of the return damage.
          // Model:
          //  - Blades circle around the player twice, hitting each target within 10 yards 2x.
          //  - Max return banefit occurs at 30 yards.
          //  - Player runs to enemy_spread - 10 yards away from the original target.
          //  - Original target gets hit by the return but not by the orbit unless the player moves 10 yards or less.
          Bladedancer_Hits = 0
          if (
            aspectVal(nodes_map, 'bladedancers-aspect').length > 0
          ) {
            Bladedancer_Hits =
              Math.min(1, 10 ** 2 / enemy_spread ** 2) *
              (number_of_enemies - 1)
          }

          // Assumes the player runs back 20 yards and hits the original target again.
          Number_of_Hits = 1 + Extra_Return_Hits + Bladedancer_Hits
          break

        //Poison Trap: Place a trap that arms after 1.25 seconds. It activates when an enemy moves within range, applying {['344%', '379%', '413%', '447%', '482%',} Poisoning damage over 9 seconds to enemies in the area.
        case 'poison-trap':
          Poison_Trap_Area = 10
          // Snare: Non-Ultimate Trap Skills have x25% increased area.
          if (paragonVal(nodes_map, 'snare')) {
            Poison_Trap_Area *= 1.25
          }
          Number_of_Hits =
            1 +
            Math.min(Poison_Trap_Area ** 2 / enemy_spread ** 2, 1) *
              (number_of_enemies - 1)
          break

        // Caltrops: Leap backwards and throw caltrops on the ground, dealing {['30%', '33%', '36%', '39%', '42%',} damage and Slowing enemies by {value2} . Lasts 7 seconds.
        case 'caltrops':
          if (toggleVal(nodes_map, 'enemy-distant')) {
            Number_of_Hits =
              1 +
              ProbabilityInCircle(25, 20, enemy_spread) *
                (number_of_enemies - 1)
          } else {
            Number_of_Hits =
              1 +
              Math.min(20 ** 2 / enemy_spread ** 2, 1) *
                (number_of_enemies - 1)
          }
          break
        // Dash: Dash forward and slash enemies for {value2} damage.
        case 'dash':
          Number_of_Hits =
            1 +
            ProbabilityIntersectingLineInCircle(
              20,
              30,
              enemy_spread,
            ) *
              (number_of_enemies - 1)
          break

        // Death Trap: Place a trap that arms after 1.25 seconds. It activates when an enemy moves within range, dealing 250% damage to each enemy in the area.
        case 'death-trap':
          //Prime Death Trap: Enemies are Pulled into Death Trap when it activates.
          Trap_Range = 20
          if (toggleVal(nodes_map, 'enemy-distant')) {
            Number_of_Hits =
              1 +
              ProbabilityInCircle(25, Trap_Range, enemy_spread) *
                (number_of_enemies - 1)
          } else {
            Number_of_Hits =
              1 +
              Math.min(Trap_Range ** 2 / enemy_spread ** 2, 1) *
                (number_of_enemies - 1)
          }
          break

        // Rain of Arrows: Arrows rain down over a large area 2 times, each wave dealing 100% damage.
        case 'rain-of-arrows':
          // We model this as hitting 1/2 screen 2x. The target gets hit both times (in the center)?
          Number_of_Hits = number_of_enemies
          break

        // Repeating Aspect : Rapid Fire has a {30/45}% chance to ricochet to another target.
        // Rapidly fire 5 arrows, each dealing {30}% damage.
        case 'rapid-fire':
          Rapid_Arrows = 5
          if (
            'rapid-fire' in
              Pre_Sim_Node['combo_point_distribution'] &&
            specializationVal(nodes_map) == 'combo-points'
          ) {
            // [number, number, number, number] (should sum to 1)
            Combo_Point_Distribution =
              Pre_Sim_Node['combo_point_distribution']['rapid-fire']
            Average_Combo_Points = 0
            for (let i = 0; i < 4; i++) {
              Average_Combo_Points += Combo_Point_Distribution[i] * i
            }
            // Cunning Strategem: Your non-damage Combo Point bonuses are increased by 1/3 when you spend 3 Combo Points.
            if (paragonVal(nodes_map, 'cunning-stratagem')) {
              Average_Combo_Points += Combo_Point_Distribution[3]
            }
            Rapid_Arrows += Average_Combo_Points
          }
          if (aspectVal(nodes_map, 'repeating-aspect').length > 0) {
            const Ricochet_Distance = 15
            let p = 0
            const Ricochet_Chance = aspectVal(
              nodes_map,
              'repeating-aspect',
            )[0]
            if (toggleVal(nodes_map, 'enemy-distant')) {
              // Chance that an enemy is near the main target.
              p =
                1 -
                (1 -
                  ProbabilityInCircle(
                    25,
                    Ricochet_Distance,
                    enemy_spread,
                  )) **
                  (number_of_enemies - 1)
            } else {
              // Enemy close.
              p =
                1 -
                (1 -
                  Math.min(
                    Ricochet_Distance ** 2 / enemy_spread ** 2,
                    1,
                  )) **
                  (number_of_enemies - 1)
            }
            Number_of_Hits = Math.min(
              1 +
                Rapid_Arrows *
                  Ricochet_Chance *
                  p *
                  (number_of_enemies - 1),
              number_of_enemies,
            )
          }
          break
        case 'shadow-clone':
          Number_of_Hits = 0
          break
        case 'dark-shroud':
          Number_of_Hits = 0
          break
      }

      return Number_of_Hits
    }),

    /*--------------------------------------------------
                    PLAYER STATS NODES
        --------------------------------------------------*/

    Max_Life: new StatsNode('Max_Life', () => {
      const Base_Life = baseStatVal(nodes_map)['BaseMaxLife']

      // maximum-life
      const Bonus_Life = aggregationVal(nodes_map, 'maximum-life')

      // %-maximum-life
      const Life_Multiplier =
        1 + aggregationVal(nodes_map, '%-maximum-life')

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
        RogueDamageMultiplier(
          new Set(['physical', 'thorns']),

          nodes_map,
        )
      )
    }),

    Passive_Dps: new StatsNode('Passive_Dps', () => {
      const Weapon_Damage = statVal(nodes_map, 'Total_Weapon_Damage')
      const Pre_Sim_Node = roguePresimVal(nodes_map)
      const number_of_enemies = Number(
        toggleVal(nodes_map, 'number-of-enemies'),
      )

      let Passive_Dps = statVal(nodes_map, 'Thorns_Dps')

      // Vampiric Power Casting a Mastery, Weapon Mastery, Macabre, Wrath, or Imbuement Skill calls a bat ally to attack nearby enemies, dealing 80% Physical damage with a 30% chance to Stun.
      if (statVal(nodes_map, 'Vampiric_Bat_Rate') > 0) {
        Passive_Dps +=
          statVal(nodes_map, 'Vampiric_Bat_Rate') *
          Weapon_Damage *
          RogueDamageMultiplier(
            new Set(['physical', 'bat']),
            nodes_map,
          )
      }

      // Aspect of Unstable Imbuements : When casting an Imbuement Skill you trigger an Imbued explosion around yourself, applying the Imbuement effects and dealing {140/275} damage of the same type.
      if (
        aspectVal(nodes_map, 'aspect-of-unstable-imbuements').length >
        0
      ) {
        const Hits =
          1 +
          Math.min(
            10 ** 2 / statVal(nodes_map, 'Enemy_Spread') ** 2,
            1,
          )
        if (allSkillsVal(nodes_map).has('cold-imbuement')) {
          Passive_Dps +=
            Hits *
            aspectVal(nodes_map, 'aspect-of-unstable-imbuements')[0] *
            RogueDamageMultiplier(new Set(['cold']), nodes_map) *
            (1 /
              (statVal(nodes_map, 'Cold_Imbuement_Cooldown') +
                0.000001))
        }
        if (allSkillsVal(nodes_map).has('poison-imbuement')) {
          Passive_Dps +=
            Hits *
            aspectVal(nodes_map, 'aspect-of-unstable-imbuements')[0] *
            RogueDamageMultiplier(new Set(['poison']), nodes_map) *
            (1 /
              (statVal(nodes_map, 'Poison_Imbuement_Cooldown') +
                0.000001))
        }
        if (allSkillsVal(nodes_map).has('shadow-imbuement')) {
          Passive_Dps +=
            Hits *
            aspectVal(nodes_map, 'aspect-of-unstable-imbuements')[0] *
            RogueDamageMultiplier(new Set(['shadow']), nodes_map) *
            (1 /
              (statVal(nodes_map, 'Shadow_Imbuement_Cooldown') +
                0.000001))
        }
      }

      // Vampiric Curse: Killing an enemy affected by your Vampiric Curse stores their soul. Casting a Defensive, Macabre, or Agility Skill will unleash stored souls to attack nearby enemies. You can hold up to 8 souls.
      // Assuming 60% Physical Damage for now. Real Value Unknown
      if (statVal(nodes_map, 'Vampiric_Curse_Uptime') > 0) {
        let Vampiric_Curse_Damage_Modifier = 0.5

        let Defensive_Skill_Rate = 0
        for (const Skill of allSkillsVal(nodes_map)) {
          switch (Skill) {
            case 'cold-imbuement':
              Defensive_Skill_Rate +=
                1 / statVal(nodes_map, 'Cold_Imbuement_Cooldown')
              break
            case 'poison-imbuement':
              Defensive_Skill_Rate +=
                1 / statVal(nodes_map, 'Poison_Imbuement_Cooldown')
              break
            case 'shadow-imbuement':
              Defensive_Skill_Rate +=
                1 / statVal(nodes_map, 'Shadow_Imbuement_Cooldown')
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
          RogueDamageMultiplier(new Set(['physical']), nodes_map)
      }

      // Vampiric Power jagged-spikes
      // Thorns have a 10% chance to deal 300% increased damage and Chill enemies for 8%.
      if (vampiricPowerVal(nodes_map, 'jagged-spikes')) {
        Passive_Dps += 0.3 * statVal(nodes_map, 'Thorns_Dps')
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
          RogueDamageMultiplier(new Set(['physical']), nodes_map) *
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
          RogueDamageMultiplier(new Set(['physical']), nodes_map) *
          (1 +
            Math.min(
              1,
              15 ** 2 / statVal(nodes_map, 'Enemy_Spread') ** 2,
            ) *
              (number_of_enemies - 1))
      }

      // writhing-band-of-trickery: Casting a Subterfuge Skill leaves behind a Decoy Trap that continuously Taunts and lures enemies. The Decoy Trap explodes after 3 seconds dealing [{value1}] Shadow damage. Can occur every 12 seconds.
      if (
        aspectVal(nodes_map, 'writhing-band-of-trickery').length > 0
      ) {
        let Subterfuge_Rate = 0
        if (allSkillsVal(nodes_map).has('concealment')) {
          Subterfuge_Rate +=
            1 / statVal(nodes_map, 'Concealment_Cooldown')
        }
        if (allSkillsVal(nodes_map).has('poison-trap')) {
          Subterfuge_Rate +=
            1 / statVal(nodes_map, 'Poison_Trap_Cooldown')
        }
        if (allSkillsVal(nodes_map).has('smoke-grenade')) {
          Subterfuge_Rate +=
            1 / statVal(nodes_map, 'Smoke_Grenade_Cooldown')
        }
        if (allSkillsVal(nodes_map).has('dark-shroud')) {
          Subterfuge_Rate +=
            1 / statVal(nodes_map, 'Dark_Shroud_Cooldown')
        }
        const Writhing_Band_Of_Trickery_Rate = Math.min(
          1 / 12,
          Subterfuge_Rate,
        )
        let Decoy_Trap_Hits =
          1 +
          Math.min(
            1,
            10 ** 2,
            statVal(nodes_map, 'Enemy_Spread') ** 2,
          ) *
            (number_of_enemies - 1)
        if (toggleVal(nodes_map, 'enemy-distant')) {
          Decoy_Trap_Hits =
            Math.min(
              1,
              10 ** 2,
              statVal(nodes_map, 'Enemy_Spread') ** 2,
            ) * number_of_enemies
        }
        Passive_Dps +=
          aspectVal(nodes_map, 'writhing-band-of-trickery')[0] *
          Writhing_Band_Of_Trickery_Rate *
          Decoy_Trap_Hits *
          RogueDamageMultiplier(
            new Set(['shadow', 'trap']),
            nodes_map,
          )
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
        const Pre_Sim_Node = roguePresimVal(nodes_map)
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

        // Sturdy: You gain {['4%', '8%', '12%',} Close Damage Reduction.
        Damage_Received_Total *=
          1 -
          talentVal(nodes_map, 'sturdy') *
            0.04 *
            Number(!toggleVal(nodes_map, 'enemy-distant'))

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
        Damage_Received_Total *=
          1 -
          aggregationVal(nodes_map, 'damage-to-trap-enemies') *
            statVal(nodes_map, 'Trap_Uptime')

        // damage-reduction-from-poisoned-enemies
        Damage_Received_Total *=
          1 -
          aggregationVal(
            nodes_map,
            'damage-reduction-from-poisoned-enemies',
          ) *
            Number(toggleVal(nodes_map, 'enemy-poisoned'))

        // Debilitating Toxins: Poisoned enemies deal {['5%', '10%', '15%',} less damage.
        Damage_Received_Total *=
          1 -
          talentVal(nodes_map, 'debilitating-toxins') *
            0.05 *
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
        // Cheat's Aspect : You take {15/25}% less damage from Crowd Controlled enemies. Whenever a Crowd Controlled enemy deals direct damage to you, gain +15.0% Movement Speed for 2.0 seconds.
        if (
          aspectVal(nodes_map, 'cheats-aspect').length > 0 &&
          statVal(nodes_map, 'Enemy_Crowd_Controlled') == 1
        ) {
          Damage_Received_Total *=
            1 - aspectVal(nodes_map, 'cheats-aspect')[0]
        }

        // Turf: You gain 10% Damage Reduction against Close enemies.
        if (
          paragonVal(nodes_map, 'turf') &&
          !toggleVal(nodes_map, 'enemy-distant')
        ) {
          Damage_Received_Total *= 1 - 0.1
        }

        // Diminish: You take 10% reduced Physical damage from Vulnerable enemies.
        if (
          paragonVal(nodes_map, 'diminish') &&
          statVal(nodes_map, 'Enemy_Vulnerable') > 0
        ) {
          Damage_Received_Total *=
            1 - 0.1 * statVal(nodes_map, 'Enemy_Vulnerable')
        }

        // Closer: While wielding a Melee weapon, you take 10% reduced damage.
        // Ranger: While wielding a Ranged weapon, you take 10% reduced damage.
        if (
          paragonVal(nodes_map, 'closer') ||
          paragonVal(nodes_map, 'ranger')
        ) {
          const Ranged_Skills = new Set([
            'heartseeker',
            'forceful-arrow',
            'rain-of-arrows',
            'barrage',
            'rapid-fire',
            'penetrating-shot',
          ])
          const Melee_Skills = new Set([
            'invigorating-strike',
            'blade-shift',
            'puncture',
            'twisting-blades',
            'flurry',
            'dash',
            'shadow-step',
          ])
          let Melee_Use_Rate = 0
          let Ranged_Use_Rate = 0
          for (const Skill in Pre_Sim_Node['skill_use_rate']) {
            if (Melee_Skills.has(Skill)) {
              Melee_Use_Rate += Pre_Sim_Node['skill_use_rate'][Skill]
            }
            if (Ranged_Skills.has(Skill)) {
              Ranged_Use_Rate += Pre_Sim_Node['skill_use_rate'][Skill]
            }
          }
          if (Melee_Use_Rate > 0 || Ranged_Use_Rate > 0) {
            Damage_Received_Total *=
              1 -
              0.1 *
                (Ranged_Use_Rate /
                  (Melee_Use_Rate + Ranged_Use_Rate)) *
                Number(paragonVal(nodes_map, 'ranger'))
            Damage_Received_Total *=
              1 -
              0.1 *
                (Melee_Use_Rate /
                  (Melee_Use_Rate + Ranged_Use_Rate)) *
                Number(paragonVal(nodes_map, 'closer'))
          }
        }

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

        // Dark Shroud: Surround yourself with up to 5 protective shadows. Gain {['8%'} Damage Reduction per active shadow. Each time you take direct damage, that damage is reduced and a shadow is consumed.
        // Enshrouding Aspect : Gain a free Dark Shroud shadow every 3.0 seconds when standing still. Each Dark Shroud shadow grants {2/4}% increased Damage Reduction.
        if (allSkillsVal(nodes_map).has('dark-shroud')) {
          let Dark_Shroud_Damage_Reduction = 0.05
          if (aspectVal(nodes_map, 'enshrouding-aspect').length > 0) {
            Dark_Shroud_Damage_Reduction += aspectVal(
              nodes_map,
              'enshrouding-aspect',
            )[0]
          }
          Damage_Received_Total *=
            1 -
            0.2 *
              (1 +
                Dark_Shroud_Damage_Reduction *
                  (talentVal(nodes_map, 'dark-shroud') - 1)) *
              statVal(nodes_map, 'Dark_Shroud_Uptime')
        }

        if (
          talentVal(nodes_map, 'momentum') > 0 &&
          statVal(nodes_map, 'Momentum_Stacks') == 3
        ) {
          Damage_Received_Total *= 1 - 0.2
        }

        // Glyph 'explosive', You gain 10%[x] Damage Reduction for 2 seconds after dropping a Stun Grenade.
        if (paragonVal(nodes_map, 'explosive')) {
          let Stun_Grenade_Rate = 0

          // Aspect of Surprise : When you Evade or Shadow Step, you leave behind a cluster of exploding Stun Grenades that deal {50/100} total Physical damage and Stun enemies for 0.5 seconds. // DONE
          if (aspectVal(nodes_map, 'aspect-of-surprise').length > 0) {
            Stun_Grenade_Rate +=
              1 / 5 + 1 / statVal(nodes_map, 'Shadow_Step_Cooldown')
          }

          // Trickster's Aspect : Caltrops also throw a cluster of exploding Stun Grenades that deal {100/150} total Physical damage and Stun enemies for 0.5 seconds. // DONE
          if (aspectVal(nodes_map, 'tricksters-aspect').length > 0) {
            Stun_Grenade_Rate +=
              1 / statVal(nodes_map, 'Caltrops_Cooldown')
          }

          // opportunists Aspect : When you break Stealth with an attack, you drop a cluster of exploding Stun Grenades around your location that deal {360/450} total Physical damage and Stun enemies for 0.5 seconds.
          if (
            aspectVal(nodes_map, 'opportunists-aspect').length > 0
          ) {
            Stun_Grenade_Rate +=
              1 / statVal(nodes_map, 'Concealment_Cooldown')
          }

          // Aspect of Artful Initiative (Rogue Offensive Aspect): When you spend 100 Energy you release a cluster of exploding Stun Grenades that deal 0.2-0.3 total Physical damage and Stun enemies for 0.5 seconds. Your Grenade Skills deal 15% [x] more damage.
          if (
            aspectVal(nodes_map, 'aspect-of-artful-initiative')
              .length > 0
          ) {
            let Artful_Initiative_Rate = 0
            for (const Skill in Pre_Sim_Node['skill_use_rate']) {
              if (
                Pre_Sim_Node['cross_skill_stat'][Skill][
                  'resource_cost'
                ] < 0
              ) {
                Artful_Initiative_Rate -=
                  (Pre_Sim_Node['skill_use_rate'][Skill] *
                    Math.abs(
                      Pre_Sim_Node['cross_skill_stat'][Skill][
                        'resource_cost'
                      ],
                    )) /
                  100
              }
            }
            Stun_Grenade_Rate += Artful_Initiative_Rate
          }

          // Exposure: Lucky Hit: Dealing direct damage to an enemy affected by a Trap Skill has up to a 25% chance to:
          //   - Reduce active cooldowns of trap skills by 20%.
          //   - Drop exploding stun grenades that deal 40% total physical damage and stun enemies for 0.5 seconds.
          if (
            talentVal(nodes_map, 'exposure') > 0 &&
            (allSkillsVal(nodes_map).has('poison-trap') ||
              allSkillsVal(nodes_map).has('death-trap'))
          ) {
            const Direct_Damage_Skills = new Set([
              'blade-shift',
              'forceful-arrow',
              'heartseeker',
              'invigorating-strike',
              'puncture',
              'twisting-blades',
              'rapid-fire',
              'barrage',
              'flurry',
              'penetrating-shot',
              'shadow-step',
              'dash',
              'caltrops',
            ])
            let Exposure_Rate = 0
            for (const Skill in Pre_Sim_Node['skill_use_rate']) {
              if (Direct_Damage_Skills.has(Skill)) {
                Exposure_Rate +=
                  0.25 *
                  Pre_Sim_Node['skill_use_rate'][Skill] *
                  Pre_Sim_Node['cross_skill_stat'][Skill][
                    'total_hits'
                  ] *
                  Pre_Sim_Node['cross_skill_stat'][Skill][
                    'lucky_hit_chance'
                  ]
              }
            }
            const Trap_Uptime = statVal(nodes_map, 'Trap_Uptime')
            Stun_Grenade_Rate += Trap_Uptime * Exposure_Rate
          }
          Damage_Received_Total *=
            1 - 0.1 * Math.min(1, Stun_Grenade_Rate * 2)
        }

        // Aspect of Stolen Vigor: Each stack of Momentum Key Passive Heals you for 0.04–0.08 Life per second and grants you 5% Damage Reduction.
        if (
          aspectVal(nodes_map, 'aspect-of-stolen-vigor').length > 0
        ) {
          Damage_Received_Total *=
            1 - 0.05 * statVal(nodes_map, 'Momentum_Stacks')
        }

        return 1 - Damage_Received_Total // Total Damage Reduced
      },
    ),

    Non_Physical_Damage_Reduction: new StatsNode(
      'Non_Physical_Damage_Reduction',
      () => {
        const Pre_Sim_Node = roguePresimVal(nodes_map)

        const Damage_Received_Total = 1

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

        // Talent: Rugged: Gain {9%} Damage Reduction against Damage Over Time effects.
        Damage_Received_Over_Time *=
          1 - talentVal(nodes_map, 'rugged') * 0.09

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
      const Pre_Sim_Node = roguePresimVal(nodes_map)

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

      const Pre_Sim_Node = roguePresimVal(nodes_map)
      let Primary_Blade_Shift_Resistance = 0
      // Primary Blade Shift: While Blade Shift is active, you gain +15% Resistance to All Elements and reduce the duration of incoming Control Impairing effects by 20%.
      if (
        'blade-shift' in Pre_Sim_Node['skill_use_rate'] &&
        talentVal(nodes_map, 'primary-blade-shift') > 0
      ) {
        Primary_Blade_Shift_Resistance +=
          0.15 *
          Math.min(
            3 * Pre_Sim_Node['skill_use_rate']['blade-shift'],
            1,
          )
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

      // Eldritch Bounty: When you attack with an Imbued Skill, you gain +3% Maximum Resistance and 20% increased damage for that Imbuement's element for 9 seconds.
      if (
        allSkillsVal(nodes_map).has('cold-imbuement') &&
        paragonVal(nodes_map, 'eldritch-bounty')
      ) {
        Cold_Resistance_Cap += Math.max(
          0,
          0.03 * (9 / statVal(nodes_map, 'Cold_Imbuement_Cooldown')),
        )
      }

      return Math.min(
        Math.min(Cold_Resistance_Cap, 0.85),
        mod_resist +
          int_resist -
          World_Tier_Penalty +
          Primary_Blade_Shift_Resistance,
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

      const Pre_Sim_Node = roguePresimVal(nodes_map)
      let Primary_Blade_Shift_Resistance = 0
      // Primary Blade Shift: While Blade Shift is active, you gain +15% Resistance to All Elements and reduce the duration of incoming Control Impairing effects by 20%.
      if (
        'blade-shift' in Pre_Sim_Node['skill_use_rate'] &&
        talentVal(nodes_map, 'primary-blade-shift') > 0
      ) {
        Primary_Blade_Shift_Resistance +=
          0.15 *
          Math.min(
            3 * Pre_Sim_Node['skill_use_rate']['blade-shift'],
            1,
          )
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
        mod_resist +
          int_resist -
          World_Tier_Penalty +
          Primary_Blade_Shift_Resistance,
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

        const Pre_Sim_Node = roguePresimVal(nodes_map)
        let Primary_Blade_Shift_Resistance = 0
        // Primary Blade Shift: While Blade Shift is active, you gain +15% Resistance to All Elements and reduce the duration of incoming Control Impairing effects by 20%.
        if (
          'blade-shift' in Pre_Sim_Node['skill_use_rate'] &&
          talentVal(nodes_map, 'primary-blade-shift') > 0
        ) {
          Primary_Blade_Shift_Resistance +=
            0.15 *
            Math.min(
              3 * Pre_Sim_Node['skill_use_rate']['blade-shift'],
              1,
            )
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
          mod_resist +
            int_resist -
            World_Tier_Penalty +
            Primary_Blade_Shift_Resistance,
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

      const Pre_Sim_Node = roguePresimVal(nodes_map)
      let Primary_Blade_Shift_Resistance = 0
      // Primary Blade Shift: While Blade Shift is active, you gain +15% Resistance to All Elements and reduce the duration of incoming Control Impairing effects by 20%.
      if (
        'blade-shift' in Pre_Sim_Node['skill_use_rate'] &&
        talentVal(nodes_map, 'primary-blade-shift') > 0
      ) {
        Primary_Blade_Shift_Resistance +=
          0.15 *
          Math.min(
            3 * Pre_Sim_Node['skill_use_rate']['blade-shift'],
            1,
          )
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

      // Eldritch Bounty: When you attack with an Imbued Skill, you gain +3% Maximum Resistance and 20% increased damage for that Imbuement's element for 9 seconds.
      if (
        allSkillsVal(nodes_map).has('poison-imbuement') &&
        paragonVal(nodes_map, 'eldritch-bounty')
      ) {
        Poison_Resistance_Cap += Math.max(
          0,
          0.03 *
            (9 / statVal(nodes_map, 'Poison_Imbuement_Cooldown')),
        )
      }

      return Math.min(
        Math.min(Poison_Resistance_Cap, 0.85),
        mod_resist +
          int_resist -
          World_Tier_Penalty +
          Primary_Blade_Shift_Resistance,
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

      const Pre_Sim_Node = roguePresimVal(nodes_map)
      let Primary_Blade_Shift_Resistance = 0
      // Primary Blade Shift: While Blade Shift is active, you gain +15% Resistance to All Elements and reduce the duration of incoming Control Impairing effects by 20%.
      if (
        'blade-shift' in Pre_Sim_Node['skill_use_rate'] &&
        talentVal(nodes_map, 'primary-blade-shift') > 0
      ) {
        Primary_Blade_Shift_Resistance +=
          0.15 *
          Math.min(
            3 * Pre_Sim_Node['skill_use_rate']['blade-shift'],
            1,
          )
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

      // Eldritch Bounty: When you attack with an Imbued Skill, you gain +3% Maximum Resistance and 20% increased damage for that Imbuement's element for 9 seconds.
      if (
        allSkillsVal(nodes_map).has('shadow-imbuement') &&
        paragonVal(nodes_map, 'eldritch-bounty')
      ) {
        Shadow_Resistance_Cap += Math.max(
          0,
          0.03 *
            (9 / statVal(nodes_map, 'Shadow_Imbuement_Cooldown')),
        )
      }

      return Math.min(
        Math.min(Shadow_Resistance_Cap, 0.85),
        mod_resist +
          int_resist -
          World_Tier_Penalty +
          Primary_Blade_Shift_Resistance,
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

      // maximum-energy
      Max_Resource +=
        aggregationVal(nodes_map, 'maximum-energy') +
        aggregationVal(nodes_map, 'maximum-resource')

      // melted-heart-of-selig Gain 60 maximum Resource. 75% of incoming damage drains 2 Resource for every 1% of Life you would have lost instead.
      if (aspectVal(nodes_map, 'melted-heart-of-selig').length > 0) {
        Max_Resource += 60
      }
      return Max_Resource
    }),

    Resource_Gain_Per_Cast: new StatsNode(
      'Resource_Gain_Per_Cast',
      () => {
        const Pre_Sim_Node = roguePresimVal(nodes_map)
        const number_of_enemies = Number(
          toggleVal(nodes_map, 'number-of-enemies'),
        )
        const enemy_spread = Number(
          statVal(nodes_map, 'Enemy_Spread'),
        )
        let Resource_Gain_Per_Cast = Math.max(
          currentSkillVal(nodes_map)['base_resources_generated'],
          0,
        )

        Resource_Gain_Per_Cast +=
          statVal(nodes_map, 'Resource_Gain_Per_Hit') *
          statVal(nodes_map, 'Total_Hits')

        Resource_Gain_Per_Cast *= statVal(
          nodes_map,
          'Total_Resource_Generation_Multiplier',
        )

        // Combat: Skills that Critically Strike restore 12% of their Energy cost.
        if (
          paragonVal(nodes_map, 'combat') &&
          currentSkillVal(nodes_map)['modifiers']['flat'] > 0
        ) {
          Resource_Gain_Per_Cast +=
            0.12 *
            statVal(nodes_map, 'Resource_Cost_Per_Cast') *
            (1 -
              (1 - statVal(nodes_map, 'Critical_Chance')) **
                statVal(nodes_map, 'Total_Hits'))
        }

        // Aftermath: After using an Ultimate Skill, restore {[30. 60, 90],} Energy.
        if (
          talentVal(nodes_map, 'aftermath') > 0 &&
          tagsVal(nodes_map).has('ultimate')
        ) {
          Resource_Gain_Per_Cast +=
            30 * talentVal(nodes_map, 'aftermath')
        }

        // Improved Rapid Fire: Gain 15 Energy per cast of Rapid Fire when it damages a Vulnerable enemy.
        if (
          currentSkillVal(nodes_map)['name'] == 'rapid-fire' &&
          talentVal(nodes_map, 'improved-rapid-fire') > 0 &&
          statVal(nodes_map, 'Enemy_Vulnerable') > 0
        ) {
          Resource_Gain_Per_Cast +=
            15 * statVal(nodes_map, 'Enemy_Vulnerable')
        }

        // Mothers Embrace: If a Core Skill hits 4 or more enemies, [[20 - 40]|%|] of the Resource cost is refunded.
        if (aspectVal(nodes_map, 'mothers-embrace').length > 0) {
          // p is the probability of extra hits.
          let p = 0
          switch (currentSkillVal(nodes_map)['name']) {
            case 'rapid-fire':
            case 'barrage':
            case 'twisting-blades':
              // Too complex to repeat it here. Here's a shortcut.
              if (number_of_enemies > 5) {
                p = Math.min(
                  Math.max(statVal(nodes_map, 'Total_Hits') - 1, 0) /
                    number_of_enemies,
                  1,
                )
              }
              break

            case 'flurry':
              p = ProbabilityInCone(10, 1 / 4, enemy_spread)
              break

            case 'penetrating-shot':
              p = ProbabilityIntersectingLineInCircle(
                10,
                60,
                enemy_spread,
              )
              break
          }
          Resource_Gain_Per_Cast +=
            -statVal(nodes_map, 'Resource_Cost_Per_Cast') *
            aspectVal(nodes_map, 'mothers-embrace')[0] *
            (1 - BinomialDistribution(number_of_enemies - 1, p, 3))
        }

        // Malignant Heart (All) the-malignant-pact:	Cycle through a Malignant bonus every 20 kills: Vicious: Gain {20/21/22...}% Attack Speed.
        // Devious: Core and Basic Skills have a {15/16/17...}% chance to fully restore your Primary Resource. Brutal: Every {20/19/18..} seconds, gain a Barrier absorbing [flat value number] damage.
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

        // Consuming Shadows: Each time you kill an enemy with Shadow Damage, you generate {[10, 20, 30],} Energy.
        if (talentVal(nodes_map, 'consuming-shadows') > 0) {
          if (tagsVal(nodes_map).has('shadow')) {
            Resource_Gain_Per_Cast +=
              10 *
              talentVal(nodes_map, 'consuming-shadows') *
              statVal(nodes_map, 'Enemies_Killed')
          } else {
            let Shadow_Imbuement_Chance = 0
            if (
              currentSkillVal(nodes_map)['name'] ==
                'rain-of-arrows' &&
              aspectVal(nodes_map, 'word-of-hakan').length > 0
            ) {
              Shadow_Imbuement_Chance = 1
            } else if (tagsVal(nodes_map).has('imbueable')) {
              Shadow_Imbuement_Chance = statVal(
                nodes_map,
                'Shadow_Imbuement_Uptime',
              )
            }
            // (Rogue) the-vile-apothecary:	Your attacks have a [5-15]% chance to apply all Imbuement effects at [50-60]% of normal potency.
            if (
              malignantHeartVal(nodes_map, 'the-vile-apothecary')
                .length > 0
            ) {
              Shadow_Imbuement_Chance =
                1 -
                (1 - Shadow_Imbuement_Chance) *
                  (1 -
                    malignantHeartVal(
                      nodes_map,
                      'the-vile-apothecary',
                    )[0])
            }
            Resource_Gain_Per_Cast +=
              10 *
              talentVal(nodes_map, 'consuming-shadows') *
              statVal(nodes_map, 'Enemies_Killed') *
              Shadow_Imbuement_Chance
          }
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
        const Pre_Sim_Node = roguePresimVal(nodes_map)

        Resource_Cost_Per_Cast *=
          1 - aggregationVal(nodes_map, 'energy-cost-reduction')

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
        (delta_resources_per_cast +
          passive_resource_gain +
          statVal(nodes_map, 'Inner_Sight_Energy_Gain_Rate')) *
        Number_Of_Cast
      )
    }),

    Total_Resource_Generation_Multiplier: new StatsNode(
      'Total_Resource_Generation_Multiplier',
      () => {
        let Resource_Gen_Multiplier_Total = 1

        // Total_Strength
        Resource_Gen_Multiplier_Total +=
          0.001 * statVal(nodes_map, 'Total_Strength')

        // resource-generation
        Resource_Gen_Multiplier_Total += aggregationVal(
          nodes_map,
          'resource-generation',
        )

        // Malignant Heart (All) determination:	Resource draining effects are [50 - 60]% less effective. In addition, gain [3 - 8]% increased Resource Generation.
        if (
          malignantHeartVal(nodes_map, 'determination').length != 0
        ) {
          Resource_Gen_Multiplier_Total *=
            1 + malignantHeartVal(nodes_map, 'determination')[1]
        }

        // Ravenous Aspect : Killing a Vulnerable enemy grants you x{50/70}% increased Energy Regeneration for 4.0 seconds.
        if (
          aspectVal(nodes_map, 'ravenous-aspect').length > 0 &&
          statVal(nodes_map, 'Enemy_Vulnerable') > 0
        ) {
          Resource_Gen_Multiplier_Total *=
            1 +
            aspectVal(nodes_map, 'ravenous-aspect')[0] *
              Math.min(
                Number(toggleVal(nodes_map, 'enemy-kill-rate')) * 4,
                1,
              ) *
              statVal(nodes_map, 'Enemy_Vulnerable')
        }

        if (
          talentVal(nodes_map, 'momentum') > 0 &&
          statVal(nodes_map, 'Momentum_Stacks') == 3
        ) {
          Resource_Gen_Multiplier_Total += 0.3
        }

        return Resource_Gen_Multiplier_Total
      },
    ),

    Resource_Gain_Per_Hit: new StatsNode(
      'Resource_Gain_Per_Hit',
      () => {
        let Resource_Gain_Per_Hit = 0

        // Enhanced Puncture: Gain 2 Energy when Puncture damages a Crowd Controlled enemy.
        if (
          currentSkillVal(nodes_map)['name'] == 'puncture' &&
          talentVal(nodes_map, 'enhanced-puncture') > 0 &&
          statVal(nodes_map, 'Enemy_Crowd_Controlled') > 0
        ) {
          Resource_Gain_Per_Hit += 2
        }

        // Innervation: Lucky Hit: Up to a {['10%', '20%', '30%',} chance to gain 8 Energy.
        Resource_Gain_Per_Hit +=
          8 *
          (0.1 * talentVal(nodes_map, 'innervation')) *
          statVal(nodes_map, 'Total_Lucky_Hit_Chance_Multiplier')

        // Energizing Aspect : Damaging an Elite enemy with a Basic Skill generates {3/7} Energy.
        if (
          aspectVal(nodes_map, 'energizing-aspect').length > 0 &&
          toggleVal(nodes_map, 'enemy-elite') &&
          tagsVal(nodes_map).has('basic')
        ) {
          Resource_Gain_Per_Hit += aspectVal(
            nodes_map,
            'energizing-aspect',
          )[0]
        }

        // 'lucky-hit:-up-to-a-5%-chance-to-restore-primary-resource'
        Resource_Gain_Per_Hit +=
          0.05 *
          statVal(nodes_map, 'Total_Lucky_Hit_Chance_Multiplier') *
          aggregationVal(
            nodes_map,
            'lucky-hit:-up-to-a-5%-chance-to-restore-primary-resource',
          ) *
          statVal(nodes_map, 'Max_Resource')

        return Resource_Gain_Per_Hit
      },
    ),

    Resource_Regeneration_Per_Second: new StatsNode(
      'Resource_Regeneration_Per_Second',
      () => {
        const Pre_Sim_Node = roguePresimVal(nodes_map)
        let Energy_Regeneration_Per_Second = 10
        const Draining_Per_Second = 0

        if ('invigorating-strike' in Pre_Sim_Node['skill_use_rate']) {
          let Invigorating_Strike_Bonus = 0.2
          const Invigorating_Strike_Duration = 3
          // Enhanced Invigorating Strike: Damaging a Crowd Controlled or Injured enemy with Invigorating Strike increases its Energy Regeneration bonus to 30%.
          if (
            talentVal(nodes_map, 'enhanced-invigorating-strike') > 0
          ) {
            if (statVal(nodes_map, 'Enemy_Crowd_Controlled') > 0) {
              Invigorating_Strike_Bonus = 0.3
            } else {
              Invigorating_Strike_Bonus = 0.235
            }
          }
          Energy_Regeneration_Per_Second *=
            1 +
            Invigorating_Strike_Bonus *
              Math.min(
                1,
                Invigorating_Strike_Duration *
                  Pre_Sim_Node['skill_use_rate'][
                    'invigorating-strike'
                  ],
              )
        }

        // Adrenaline Rush: While moving, you gain {['5%', '10%', '15%',} increased Energy Regeneration.
        // Assumes movement 70% of the time.
        Energy_Regeneration_Per_Second *=
          1 + 0.7 * talentVal(nodes_map, 'adrenaline-rush') * 0.05

        // Enhanced Concelment: You gain 40 Energy when you enter Concealment.
        if (
          talentVal(nodes_map, 'enhanced-concealment') > 0 &&
          allSkillsVal(nodes_map).has('concealment')
        ) {
          const Concealment_Cooldown = statVal(
            nodes_map,
            'Concealment_Cooldown',
          )
          // Assume the skill is used on cooldown and average in the energy gain.
          Energy_Regeneration_Per_Second +=
            40 / Math.max(Concealment_Cooldown, 1)
        }

        // Fluidity: When you cast an Agility Skill, you gain x9% increased Energy Regeneration for 6 seconds.
        if (paragonVal(nodes_map, 'fluidity')) {
          let Fluidity_Uptime = 0
          if (allSkillsVal(nodes_map).has('shadow-step')) {
            Fluidity_Uptime =
              1 -
              (1 - Fluidity_Uptime) *
                (1 -
                  Math.min(
                    6 / statVal(nodes_map, 'Shadow_Step_Cooldown'),
                    1,
                  ))
          }
          if (allSkillsVal(nodes_map).has('caltrops')) {
            Fluidity_Uptime =
              1 -
              (1 - Fluidity_Uptime) *
                (1 -
                  Math.min(
                    6 / statVal(nodes_map, 'Caltrops_Cooldown'),
                    1,
                  ))
          }
          if (allSkillsVal(nodes_map).has('dash')) {
            Fluidity_Uptime =
              1 -
              (1 - Fluidity_Uptime) *
                (1 -
                  Math.min(
                    6 / statVal(nodes_map, 'Dash_Cooldown'),
                    1,
                  ))
          }
          Energy_Regeneration_Per_Second += Fluidity_Uptime * 0.09
        }

        // Aspect of Assimilation: You have 8% increased Dodge Chance versus enemies affected by Damage Over Time effects. When you Dodge, you gain [5 - 10] of your Primary Resource.
        if (aspectVal(nodes_map, 'assimilation-aspect').length != 0) {
          const Enemy_Attacks_Per_Second = statVal(
            nodes_map,
            'Enemy_Attacks_Per_Second',
          )
          Energy_Regeneration_Per_Second +=
            Enemy_Attacks_Per_Second *
            aspectVal(nodes_map, 'assimilation-aspect')[0] *
            statVal(nodes_map, 'Total_Dodge_Chance')
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
          const Minion_Lucky_Hit_Chance = 0.3 // completely made up value taken from bat stun chance on another vampiric power
          Energy_Regeneration_Per_Second +=
            10 *
            statVal(nodes_map, 'Vampiric_Bat_Rate') *
            Minion_Lucky_Hit_Chance
        }

        // Tibault's Will (Generic Unique Pants): You deal 20-40% [x] increased damage while Unstoppable and for 4 seconds after. When you become Unstoppable, gain 50 of your Primary Resource.
        if (aspectVal(nodes_map, 'tibaults-will').length != 0) {
          let Tibaults_Proc_Rate = 0

          // Shadow Step: Become Unstoppable and quickly move through the sahdows to stab your victim from behind for {['72%', '79%', '86%', '94%', '101%',} damage. Gain 50% increases Movement Speed for 2 seconds afterwards.
          if (allSkillsVal(nodes_map).has('shadow-step')) {
            Tibaults_Proc_Rate +=
              1 / statVal(nodes_map, 'Shadow_Step_Cooldown')
          }

          // Concealment Unstoppable
          if (allSkillsVal(nodes_map).has('concealment')) {
            Tibaults_Proc_Rate +=
              1 / statVal(nodes_map, 'Concealment_Cooldown')
          }

          // ['prime-shadow-clone', 1], // You are Unstoppable for 5 seconds after casting Shadow Clone.
          if (
            allSkillsVal(nodes_map).has('shadow-clone') &&
            talentVal(nodes_map, 'prime-shadow-clone') > 0
          ) {
            Tibaults_Proc_Rate +=
              1 / statVal(nodes_map, 'Shadow_Clone_Cooldown')
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

          Energy_Regeneration_Per_Second += 50 * Tibaults_Proc_Rate
        }

        return Energy_Regeneration_Per_Second
      },
    ),

    Resource_On_Kill: new StatsNode('Resource_On_Kill', () => {
      const Resource_On_Kill_Total = 0

      return 0
    }),

    Total_Lucky_Hit_Chance_Bonus: new StatsNode(
      'Total_Lucky_Hit_Chance_Bonus',
      () => {
        const Pre_Sim_Node = roguePresimVal(nodes_map)

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
        if (tagsVal(nodes_map).has('fire')) {
          Lucky_Hit_Chance_Bonus_Total += aggregationVal(
            nodes_map,
            'lucky-hit-chance-with-fire-damage',
          )
        }

        // Primary Invigorating Strike: Invigorating Strike additionally grants 8% Lucky Hit Chance. Hitting a Crowd Controlled or Injured enemy increases this bonus to 16% Lucky Hit Chance.
        if (
          'invigorating-strike' in Pre_Sim_Node['skill_use_rate'] &&
          talentVal(nodes_map, 'primary-invigorating-strike') > 0
        ) {
          const Invigorating_Strike_Duration = 3
          Lucky_Hit_Chance_Bonus_Total +=
            0.08 *
            Math.min(
              1,
              Invigorating_Strike_Duration *
                Pre_Sim_Node['skill_use_rate']['invigorating-strike'],
            )
          if (statVal(nodes_map, 'Enemy_Crowd_Controlled') > 0) {
            Lucky_Hit_Chance_Bonus_Total +=
              0.08 *
              Math.min(
                1,
                Invigorating_Strike_Duration *
                  Pre_Sim_Node['skill_use_rate'][
                    'invigorating-strike'
                  ],
              )
          } else {
            Lucky_Hit_Chance_Bonus_Total +=
              0.08 *
              0.35 *
              Math.min(
                1,
                Invigorating_Strike_Duration *
                  Pre_Sim_Node['skill_use_rate'][
                    'invigorating-strike'
                  ],
              )
          }
        }

        // alchemists Fortune: Non-Physical damage you deal has a {['5%', '10%', '15%',} increased Lucky Hit Chance.
        if (!tagsVal(nodes_map).has('physical')) {
          Lucky_Hit_Chance_Bonus_Total +=
            talentVal(nodes_map, 'alchemists-fortune') * 0.05
        }

        // Cowl of the Nameless : You gain x{15/25}% increased Lucky Hit Chance against Crowd Controlled enemies.
        if (
          aspectVal(nodes_map, 'cowl-of-the-nameless').length > 0 &&
          statVal(nodes_map, 'Enemy_Crowd_Controlled')
        ) {
          Lucky_Hit_Chance_Bonus_Total *=
            1 + aspectVal(nodes_map, 'cowl-of-the-nameless')[0]
        }

        // Second Wind Every 100 Energy you spend grants you {['5%', '10%', '15%',} increased Lucky Hit Chance for 5 seconds.
        if (
          talentVal(nodes_map, 'second-wind') > 0 &&
          Object.keys(Pre_Sim_Node['skill_use_rate']).length > 0
        ) {
          let Energy_Use_Rate = 0
          for (const Skill in Pre_Sim_Node['skill_use_rate']) {
            // Resource cost it negative.
            Energy_Use_Rate -=
              Pre_Sim_Node['skill_use_rate'][Skill] *
              Pre_Sim_Node['cross_skill_stat'][Skill]['resource_cost']
          }
          Lucky_Hit_Chance_Bonus_Total +=
            0.05 * Math.min(1, (Energy_Use_Rate * 5) / 100)
        }

        return Lucky_Hit_Chance_Bonus_Total
      },
    ),

    Skill_Lucky_Hit_Chance_Multiplier: new StatsNode(
      'Skill_Lucky_Hit_Chance_Multiplier',
      () => {
        const Pre_Sim_Node = roguePresimVal(nodes_map)

        let Skill_Lucky_Hit_Chance =
          currentSkillVal(nodes_map)['lucky_hit_chance']

        if (
          'penetrating-shot' in
            Pre_Sim_Node['combo_point_distribution'] &&
          currentSkillVal(nodes_map)['name'] == 'penetrating-shot' &&
          specializationVal(nodes_map) == 'combo-points'
        ) {
          // [number, number, number, number] (should sum to 1)
          const Combo_Point_Distribution =
            Pre_Sim_Node['combo_point_distribution'][
              'penetrating-shot'
            ]
          let Average_Combo_Points = 0
          for (let i = 0; i < 4; i++) {
            Average_Combo_Points += Combo_Point_Distribution[i] * i
          }
          // Cunning Strategem: Your non-damage Combo Point bonuses are increased by 1/3 when you spend 3 Combo Points.
          if (paragonVal(nodes_map, 'cunning-stratagem')) {
            Average_Combo_Points += Combo_Point_Distribution[3]
          }
          Skill_Lucky_Hit_Chance += 0.1 * Average_Combo_Points
        }

        return Math.min(
          (1 + statVal(nodes_map, 'Total_Lucky_Hit_Chance_Bonus')) *
            Math.min(Skill_Lucky_Hit_Chance, 1),
          1,
        )
      },
    ),

    Poison_Imbuement_Lucky_Hit_Chance_Multiplier: new StatsNode(
      'Poison_Imbuement_Lucky_Hit_Chance_Multiplier',
      () => {
        let Poison_Imbuement_Chance =
          statVal(nodes_map, 'Poison_Imbuement_Uptime') *
          Number(tagsVal(nodes_map).has('imbueable'))
        if (
          aspectVal(nodes_map, 'word-of-hakan').length > 0 &&
          currentSkillVal(nodes_map)['name'] == 'rain-of-arrows'
        ) {
          Poison_Imbuement_Chance = 1
        }
        if (
          // Pestilent Points: Every third cast of Puncture is Poison Imbued with [100 - 150]% of normal potency.
          aspectVal(nodes_map, 'pestilent-points').length > 0 &&
          currentSkillVal(nodes_map)['name'] == 'puncture'
        ) {
          Poison_Imbuement_Chance = 1 / 3
        }

        const Poison_Imbuement_Lucky_Hit_Chance =
          0.33 * Poison_Imbuement_Chance

        return Math.min(
          (1 + statVal(nodes_map, 'Total_Lucky_Hit_Chance_Bonus')) *
            Math.min(Poison_Imbuement_Lucky_Hit_Chance, 1),
          1,
        )
      },
    ),

    Total_Lucky_Hit_Chance_Multiplier: new StatsNode(
      'Total_Lucky_Hit_Chance_Multiplier',
      () => {
        // TODO: Should be able to go above 1, but something causes it to reduce damage.
        return (
          statVal(nodes_map, 'Skill_Lucky_Hit_Chance_Multiplier') +
          statVal(
            nodes_map,
            'Poison_Imbuement_Lucky_Hit_Chance_Multiplier',
          )
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
      const Pre_Sim_Node = roguePresimVal(nodes_map)

      const current_skill = currentSkillVal(nodes_map)['name']
      let Cooldown_Total = CooldownFromRanks(
        talentVal(nodes_map, current_skill),
        current_skill,
        currentSkillVal(nodes_map)['cooldown_seconds'],
      )

      const enemy_spread = Number(statVal(nodes_map, 'Enemy_Spread'))
      const number_of_enemies = Number(
        toggleVal(nodes_map, 'number-of-enemies'),
      )

      // Eyes in the Dark : Unless it hits a Boss or Player, Death Trap will continue to re-arm itself until it kills an enemy. However, Death Trap's Cooldown is increased by {20/15}%.
      // increases the damage of Death Trap by 30-50%.
      if (
        aspectVal(nodes_map, 'eyes-in-the-dark').length > 0 &&
        currentSkillVal(nodes_map)['name'] == 'death-trap'
      ) {
        Cooldown_Total *=
          1 + aspectVal(nodes_map, 'eyes-in-the-dark')[1]
      }

      // Disciplined Shadow Step: Shadow Step's Cooldown is reduced by 3 seconds when it damages an enemy you haven't hit with Shadow Step in the last 4 seconds.
      if (
        currentSkillVal(nodes_map)['name'] == 'shadow-step' &&
        'shadow-step' in Pre_Sim_Node['cross_skill_stat']
      ) {
        const Pre_Sim_Cooldown =
          Pre_Sim_Node['cross_skill_stat']['shadow-step']['cooldown']
        // Plenty of unique enemies to shadow step to.
        if ((Pre_Sim_Cooldown - 3) * number_of_enemies > 4) {
          Cooldown_Total -= 3
        } else {
          // Shadow step to each enemy before getting the full duration.
          Cooldown_Total *=
            Cooldown_Total * (1 / (number_of_enemies + 1)) +
            (Cooldown_Total - 3) *
              (number_of_enemies / (number_of_enemies + 1))
        }
      }

      // cooldown-reduction
      Cooldown_Total *=
        1 - aggregationVal(nodes_map, 'cooldown-reduction')

      if (tagsVal(nodes_map).has('trap')) {
        Cooldown_Total *=
          1 - aggregationVal(nodes_map, 'trap-cooldown-reduction')
      }

      if (tagsVal(nodes_map).has('imbuement')) {
        Cooldown_Total *=
          1 -
          aggregationVal(nodes_map, 'imbuement-cooldown-reduction')
      }

      // Vampiric Power 'anticipation'
      // Your Ultimate Skills gain 20% Cooldown Reduction. Your Ultimate Skills gain 12% increased damage for each nearby enemy affected by your Damage Over Time effects.
      if (
        tagsVal(nodes_map).has('ultimate') &&
        vampiricPowerVal(nodes_map, 'anticipation')
      ) {
        Cooldown_Total *= 0.8
      }

      // Aspect of Synergy : Using an Agility Skill reduces the Cooldown of your next Subterfuge Skill by 20%. Using a Subterfuge Skill increases the damage of your next Agility Skill by x{30/50}%.
      if (
        aspectVal(nodes_map, 'aspect-of-synergy').length > 0 &&
        tagsVal(nodes_map).has('subterfuge')
      ) {
        const Shadow_Step_Cooldown = statVal(
          nodes_map,
          'Shadow_Step_Cooldown',
        )
        const Caltrops_Cooldown = statVal(
          nodes_map,
          'Caltrops_Cooldown',
        )
        const Dash_Cooldown = statVal(nodes_map, 'Dash_Cooldown')
        const Concealment_Cooldown = statVal(
          nodes_map,
          'Concealment_Cooldown',
        )
        const Smoke_Grenade_Cooldown = statVal(
          nodes_map,
          'Smoke_Grenade_Cooldown',
        )
        const Dark_Shroud_Cooldown = statVal(
          nodes_map,
          'Dark_Shroud_Cooldown',
        )
        const Poison_Trap_Cooldown = statVal(
          nodes_map,
          'Poison_Trap_Cooldown',
        )
        // Adding 1 because cast time + they wont just get spammed.
        const Agility_Skill_Use_Rate =
          (1 / (1 + Shadow_Step_Cooldown)) *
            Number(allSkillsVal(nodes_map).has('shadow-step')) +
          (1 / (1 + Caltrops_Cooldown)) *
            Number(allSkillsVal(nodes_map).has('caltrops')) +
          (1 / (1 + Dash_Cooldown)) *
            Number(allSkillsVal(nodes_map).has('dash'))

        const Subterfuge_Skill_Use_Rate =
          (1 / (1 + Concealment_Cooldown)) *
            Number(allSkillsVal(nodes_map).has('concealment')) +
          (1 / (1 + Smoke_Grenade_Cooldown)) *
            Number(allSkillsVal(nodes_map).has('smoke-grenade')) +
          (1 / (1 + Dark_Shroud_Cooldown)) *
            Number(allSkillsVal(nodes_map).has('dark-shroud')) +
          (1 / (1 + Poison_Trap_Cooldown)) *
            Number(allSkillsVal(nodes_map).has('poison-trap'))

        if (Subterfuge_Skill_Use_Rate > 0) {
          Cooldown_Total *=
            1 -
            0.2 *
              Math.min(
                Agility_Skill_Use_Rate / Subterfuge_Skill_Use_Rate,
                1,
              )
        }
      }

      // Rogue Specialization Preparation: Every 100 energy you spend reduces ultimate cooldown by 5 seconds.
      // Using an ultimate resets the cooldown on all other skills.
      if (specializationVal(nodes_map) == 'preparation') {
        let Energy_Use_Rate = 0
        for (const Skill in Pre_Sim_Node['skill_use_rate']) {
          // Resource cost it negative.
          Energy_Use_Rate -=
            Pre_Sim_Node['skill_use_rate'][Skill] *
            Pre_Sim_Node['cross_skill_stat'][Skill]['resource_cost']
        }
        if (tagsVal(nodes_map).has('ultimate')) {
          if (Energy_Use_Rate > 0) {
            // Same solution and other cooldown reduction nodes.
            const D = 5
            const X = 100 / Energy_Use_Rate
            Cooldown_Total *= X / (X + D)
          }
        } else {
          const Ultimate_Rate = statVal(nodes_map, 'Ultimate_Rate')
          // Cooldown = min (Exp(rate), Old_Cooldown)
          if (Ultimate_Rate > 0) {
            Cooldown_Total =
              (1 / Ultimate_Rate) *
              (1 - Math.exp(-Ultimate_Rate * Cooldown_Total))
          }
        }
      }

      // Aspect of Quickening Fog : You automatically drop a Smoke Grenade at the end of Dash. Dash's Cooldown is reduced by {.4-.6} seconds for each enemy Dazed this way, up to {2-3} seconds.
      if (
        currentSkillVal(nodes_map)['name'] == 'dash' &&
        aspectVal(nodes_map, 'aspect-of-quickening-fog').length != 0
      ) {
        const Hits =
          Math.min(10 ** 2 / enemy_spread ** 2, 1) * number_of_enemies
        Cooldown_Total -= Math.min(
          aspectVal(nodes_map, 'aspect-of-quickening-fog')[1],
          Hits * aspectVal(nodes_map, 'aspect-of-quickening-fog')[0],
        )
      }

      // Methodical Dash Dealing damage to Crowd Controlled enemies with Dash reduces its Charge Cooldown by 0.5 seconds, up to  4 seconds per cast.
      if (
        currentSkillVal(nodes_map)['name'] == 'dash' &&
        statVal(nodes_map, 'Enemy_Crowd_Controlled') > 0 &&
        talentVal(nodes_map, 'methodical-dash') > 0
      ) {
        Cooldown_Total -= Math.min(
          4,
          0.5 * statVal(nodes_map, 'Total_Hits'),
        )
      }

      // Advanced Twisting Blades: When your Twisting Blades return, your active Cooldowns are reduced by .1 second per enemy they passed through, up to 2 seconds.
      if (
        talentVal(nodes_map, 'advanced-twisting-blades') > 0 &&
        'twisting-blades' in Pre_Sim_Node['skill_use_rate'] &&
        Pre_Sim_Node['skill_use_rate']['twisting-blades'] > 0 &&
        'twisting-blades' in Pre_Sim_Node['cross_skill_stat'] &&
        Cooldown_Total > 0
      ) {
        // Subtract the initial hit.
        const Hits =
          Pre_Sim_Node['cross_skill_stat']['twisting-blades'][
            'total_hits'
          ] - 1
        const d = Math.min(0.1 * Hits, 2)
        const T = Cooldown_Total
        // If the remaining cooldown is less than the reduction, then the reduction takes the cooldown to 0.
        // On average that's half the benefit.
        let Reduction_Per_Attack = 0
        if (d > T) {
          Reduction_Per_Attack -= T / 2
        } else {
          Reduction_Per_Attack = ((d / T) * d) / 2 + ((T - d) / T) * d
        }
        // Average number twisting blades times reduction Per Attack
        const Twisting_Blades_Seconds =
          1 / Pre_Sim_Node['skill_use_rate']['twisting-blades']
        Cooldown_Total *=
          Twisting_Blades_Seconds /
          (Twisting_Blades_Seconds + Reduction_Per_Attack)
      }

      // Exposure: Lucky Hit: Dealing direct damage to an enemy affected by a Trap Skill has up to a 25% chance to:
      //   - Reduce active cooldowns of trap skills by 20%.
      //   - Drop exploding stun grenades that deal 40% total physical damage and stun enemies for 0.5 seconds.
      if (
        talentVal(nodes_map, 'exposure') > 0 &&
        tagsVal(nodes_map).has('trap')
      ) {
        const Trap_Uptime = statVal(nodes_map, 'Trap_Uptime')

        let Lucky_Hit_Rate = 0
        // TODO: Filter to actual direct damage
        for (const Skill in Pre_Sim_Node['skill_use_rate']) {
          Lucky_Hit_Rate +=
            0.25 *
            Pre_Sim_Node['skill_use_rate'][Skill] *
            Pre_Sim_Node['cross_skill_stat'][Skill][
              'lucky_hit_chance'
            ] *
            Trap_Uptime *
            Pre_Sim_Node['cross_skill_stat'][Skill]['total_hits']
        }
        if (Lucky_Hit_Rate > 0) {
          // Problem can be framed as follows:
          //   Start with cooldown Y, each X seconds we reduce the remaining cooldown by a factor of (1 - D).
          //   Solve for number of repetitions:
          //     (((Y - X) * (1 - D) - X) * (1 - D) - X) * (1 - D) ... = 0
          //   For k repetitions LHS =:
          //   Y * (1 - D) ^ k - X * ((1 - D) ^ k - 1) * (1 - D) / D = 0
          //   Solve for k to get the following.
          const X = 1 / Lucky_Hit_Rate
          const D = 0.2
          const Y = Cooldown_Total
          const alpha =
            Math.log((X * (1 - D)) / D / ((X * (1 - D)) / D + Y)) /
            Math.log(1 - D)
          Cooldown_Total = alpha * X
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
          'blade-shift',
          'forceful-arrow',
          'heartseeker',
          'invigorating-strike',
          'puncture',
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

      return Math.max(Cooldown_Total, 0)
    }),

    Concealment_Cooldown: new StatsNode(
      'Concealment_Cooldown',
      () => {
        const Pre_Sim_Node = roguePresimVal(nodes_map)

        let Concealment_Cooldown = CooldownFromRanks(
          talentVal(nodes_map, 'concealment'),
          'concealment',
          20,
        )

        // cooldown-reduction
        Concealment_Cooldown *=
          1 - aggregationVal(nodes_map, 'cooldown-reduction')

        // Vampiric Power hectic
        // For every 5 Basic Skills you cast, one of your active Cooldowns is reduced by 2 seconds.
        if (
          vampiricPowerVal(nodes_map, 'hectic') &&
          statVal(nodes_map, 'Number_Of_Cooldowns') > 0
        ) {
          let Proc_Rate = 0
          const Basic_Skills = new Set([
            'blade-shift',
            'forceful-arrow',
            'heartseeker',
            'invigorating-strike',
            'puncture',
          ])
          for (const Skill in Pre_Sim_Node['skill_use_rate']) {
            if (Basic_Skills.has(Skill)) {
              Proc_Rate +=
                Pre_Sim_Node['skill_use_rate'][Skill] /
                (5 * statVal(nodes_map, 'Number_Of_Cooldowns'))
            }
          }
          const alpha = Concealment_Cooldown / (1 / Proc_Rate + 2)
          Concealment_Cooldown -= alpha * 2
        }

        // Aspect of Synergy : Using an Agility Skill reduces the Cooldown of your next Subterfuge Skill by 20%. Using a Subterfuge Skill increases the damage of your next Agility Skill by x{30/50}%.
        if (aspectVal(nodes_map, 'aspect-of-synergy').length > 0) {
          const Shadow_Step_Cooldown = statVal(
            nodes_map,
            'Shadow_Step_Cooldown',
          )
          const Caltrops_Cooldown = statVal(
            nodes_map,
            'Caltrops_Cooldown',
          )
          const Dash_Cooldown = statVal(nodes_map, 'Dash_Cooldown')
          // Avoiding a loop.
          const Smoke_Grenade_Cooldown = 13
          const Dark_Shroud_Cooldown = 20
          const Poison_Trap_Cooldown = 10
          // Adding 1 because cast time + they wont just get spammed.
          const Agility_Skill_Use_Rate =
            (1 / (1 + Shadow_Step_Cooldown)) *
              Number(allSkillsVal(nodes_map).has('shadow-step')) +
            (1 / (1 + Caltrops_Cooldown)) *
              Number(allSkillsVal(nodes_map).has('caltrops')) +
            (1 / (1 + Dash_Cooldown)) *
              Number(allSkillsVal(nodes_map).has('dash'))

          const Subterfuge_Skill_Use_Rate =
            (1 / (1 + Concealment_Cooldown)) *
              Number(allSkillsVal(nodes_map).has('concealment')) +
            (1 / (1 + Smoke_Grenade_Cooldown)) *
              Number(allSkillsVal(nodes_map).has('smoke-grenade')) +
            (1 / (1 + Dark_Shroud_Cooldown)) *
              Number(allSkillsVal(nodes_map).has('dark-shroud')) +
            (1 / (1 + Poison_Trap_Cooldown)) *
              Number(allSkillsVal(nodes_map).has('poison-trap'))

          if (Subterfuge_Skill_Use_Rate > 0) {
            Concealment_Cooldown *=
              1 -
              0.2 *
                Math.min(
                  Agility_Skill_Use_Rate / Subterfuge_Skill_Use_Rate,
                  1,
                )
          }
        }

        // Advanced Twisting Blades: When your Twisting Blades return, your active Cooldowns are reduced by .1 second per enemy they passed through, up to 2 seconds.
        if (
          talentVal(nodes_map, 'advanced-twisting-blades') > 0 &&
          'twisting-blades' in Pre_Sim_Node['skill_use_rate'] &&
          Pre_Sim_Node['skill_use_rate']['twisting-blades'] > 0 &&
          'twisting-blades' in Pre_Sim_Node['cross_skill_stat'] &&
          Concealment_Cooldown > 0
        ) {
          // Subtract the initial hit.
          const Hits =
            Pre_Sim_Node['cross_skill_stat']['twisting-blades'][
              'total_hits'
            ] - 1
          const d = Math.min(0.1 * Hits, 2)
          const T = Concealment_Cooldown
          // If the remaining cooldown is less than the reduction, then the reduction takes the cooldown to 0.
          // On average that's half the benefit.
          let Reduction_Per_Attack = 0
          if (d > T) {
            Reduction_Per_Attack -= T / 2
          } else {
            Reduction_Per_Attack =
              ((d / T) * d) / 2 + ((T - d) / T) * d
          }
          // Average number twisting blades times reduction Per Attack
          const Twisting_Blades_Seconds =
            1 / Pre_Sim_Node['skill_use_rate']['twisting-blades']
          Concealment_Cooldown *=
            Twisting_Blades_Seconds /
            (Twisting_Blades_Seconds + Reduction_Per_Attack)
        }

        // Rogue Specialization Preparation: Every 100 energy you spend reduces ultimate cooldown by 5 seconds.
        // Using an ultimate resets the cooldown on all other skills.
        if (specializationVal(nodes_map) == 'preparation') {
          const Ultimate_Rate = statVal(nodes_map, 'Ultimate_Rate')
          // Cooldown = min (Exp(rate), Old_Cooldown)
          if (Ultimate_Rate > 0) {
            Concealment_Cooldown =
              (1 / Ultimate_Rate) *
              (1 - Math.exp(-Ultimate_Rate * Concealment_Cooldown))
          }
        }

        return Math.max(1, Concealment_Cooldown)
      },
    ),

    Smoke_Grenade_Cooldown: new StatsNode(
      'Smoke_Grenade_Cooldown',
      () => {
        const Pre_Sim_Node = roguePresimVal(nodes_map)

        let Smoke_Grenade_Cooldown = 13

        // cooldown-reduction
        Smoke_Grenade_Cooldown *=
          1 - aggregationVal(nodes_map, 'cooldown-reduction')

        // Vampiric Power hectic
        // For every 5 Basic Skills you cast, one of your active Cooldowns is reduced by 2 seconds.
        if (
          vampiricPowerVal(nodes_map, 'hectic') &&
          statVal(nodes_map, 'Number_Of_Cooldowns') > 0
        ) {
          let Proc_Rate = 0
          const Basic_Skills = new Set([
            'blade-shift',
            'forceful-arrow',
            'heartseeker',
            'invigorating-strike',
            'puncture',
          ])
          for (const Skill in Pre_Sim_Node['skill_use_rate']) {
            if (Basic_Skills.has(Skill)) {
              Proc_Rate +=
                Pre_Sim_Node['skill_use_rate'][Skill] /
                (5 * statVal(nodes_map, 'Number_Of_Cooldowns'))
            }
          }
          const alpha = Smoke_Grenade_Cooldown / (1 / Proc_Rate + 2)
          Smoke_Grenade_Cooldown -= alpha * 2
        }

        // Aspect of Synergy : Using an Agility Skill reduces the Cooldown of your next Subterfuge Skill by 20%. Using a Subterfuge Skill increases the damage of your next Agility Skill by x{30/50}%.
        if (aspectVal(nodes_map, 'aspect-of-synergy').length > 0) {
          const Shadow_Step_Cooldown = statVal(
            nodes_map,
            'Shadow_Step_Cooldown',
          )
          const Caltrops_Cooldown = statVal(
            nodes_map,
            'Caltrops_Cooldown',
          )
          const Dash_Cooldown = statVal(nodes_map, 'Dash_Cooldown')
          // Avoiding a loop.
          const Concealment_Cooldown = 20
          const Dark_Shroud_Cooldown = 20
          const Poison_Trap_Cooldown = 10
          // Adding 1 because cast time + they wont just get spammed.
          const Agility_Skill_Use_Rate =
            (1 / (1 + Shadow_Step_Cooldown)) *
              Number(allSkillsVal(nodes_map).has('shadow-step')) +
            (1 / (1 + Caltrops_Cooldown)) *
              Number(allSkillsVal(nodes_map).has('caltrops')) +
            (1 / (1 + Dash_Cooldown)) *
              Number(allSkillsVal(nodes_map).has('dash'))

          const Subterfuge_Skill_Use_Rate =
            (1 / (1 + Concealment_Cooldown)) *
              Number(allSkillsVal(nodes_map).has('concealment')) +
            (1 / (1 + Smoke_Grenade_Cooldown)) *
              Number(allSkillsVal(nodes_map).has('smoke-grenade')) +
            (1 / (1 + Dark_Shroud_Cooldown)) *
              Number(allSkillsVal(nodes_map).has('dark-shroud')) +
            (1 / (1 + Poison_Trap_Cooldown)) *
              Number(allSkillsVal(nodes_map).has('poison-trap'))

          if (Subterfuge_Skill_Use_Rate > 0) {
            Smoke_Grenade_Cooldown *=
              1 -
              0.2 *
                Math.min(
                  Agility_Skill_Use_Rate / Subterfuge_Skill_Use_Rate,
                  1,
                )
          }
        }

        // Advanced Twisting Blades: When your Twisting Blades return, your active Cooldowns are reduced by .1 second per enemy they passed through, up to 2 seconds.
        if (
          talentVal(nodes_map, 'advanced-twisting-blades') > 0 &&
          'twisting-blades' in Pre_Sim_Node['skill_use_rate'] &&
          Pre_Sim_Node['skill_use_rate']['twisting-blades'] > 0 &&
          'twisting-blades' in Pre_Sim_Node['cross_skill_stat'] &&
          Smoke_Grenade_Cooldown > 0
        ) {
          // Subtract the initial hit.
          const Hits =
            Pre_Sim_Node['cross_skill_stat']['twisting-blades'][
              'total_hits'
            ] - 1
          const d = Math.min(0.1 * Hits, 2)
          const T = Smoke_Grenade_Cooldown
          // If the remaining cooldown is less than the reduction, then the reduction takes the cooldown to 0.
          // On average that's half the benefit.
          let Reduction_Per_Attack = 0
          if (d > T) {
            Reduction_Per_Attack -= T / 2
          } else {
            Reduction_Per_Attack =
              ((d / T) * d) / 2 + ((T - d) / T) * d
          }
          // Average number twisting blades times reduction Per Attack
          const Twisting_Blades_Seconds =
            1 / Pre_Sim_Node['skill_use_rate']['twisting-blades']
          Smoke_Grenade_Cooldown *=
            Twisting_Blades_Seconds /
            (Twisting_Blades_Seconds + Reduction_Per_Attack)
        }

        // Countering Smoke Grenade: Lucky Hit: Dealing direct damage to enemies affected by Smoke Grenade has up to a
        // 25% chance to reduce its Cooldown by 1 second, or by 2 seconds instead if the enemy is Vulnerable.
        if (
          Object.keys(Pre_Sim_Node['skill_use_rate']).length > 0 &&
          talentVal(nodes_map, 'countering-smoke-grenade') > 0
        ) {
          let Lucky_Hit_Rate = 0
          for (const Skill in Pre_Sim_Node['skill_use_rate']) {
            if (skillVal(nodes_map, Skill)['modifiers']['flat'] > 0) {
              Lucky_Hit_Rate +=
                Pre_Sim_Node['skill_use_rate'][Skill] *
                0.25 *
                Pre_Sim_Node['cross_skill_stat'][Skill][
                  'lucky_hit_chance'
                ] *
                Pre_Sim_Node['cross_skill_stat'][Skill]['total_hits']
            }
          }
          const Lucky_Hit_Seconds = 1 / Lucky_Hit_Rate
          const Reduction = 1 + statVal(nodes_map, 'Enemy_Vulnerable')
          Smoke_Grenade_Cooldown *=
            Lucky_Hit_Seconds / (Lucky_Hit_Seconds + Reduction)
        }

        // Rogue Specialization Preparation: Every 100 energy you spend reduces ultimate cooldown by 5 seconds.
        // Using an ultimate resets the cooldown on all other skills.
        if (specializationVal(nodes_map) == 'preparation') {
          const Ultimate_Rate = statVal(nodes_map, 'Ultimate_Rate')
          // Cooldown = min (Exp(rate), Old_Cooldown)
          if (Ultimate_Rate > 0) {
            Smoke_Grenade_Cooldown =
              (1 / Ultimate_Rate) *
              (1 - Math.exp(-Ultimate_Rate * Smoke_Grenade_Cooldown))
          }
        }

        return Math.max(1, Smoke_Grenade_Cooldown)
      },
    ),

    Dark_Shroud_Cooldown: new StatsNode(
      'Dark_Shroud_Cooldown',
      () => {
        const Pre_Sim_Node = roguePresimVal(nodes_map)

        let Cooldown = 20

        // cooldown-reduction
        Cooldown *=
          1 - aggregationVal(nodes_map, 'cooldown-reduction')

        // Vampiric Power hectic
        // For every 5 Basic Skills you cast, one of your active Cooldowns is reduced by 2 seconds.
        if (
          vampiricPowerVal(nodes_map, 'hectic') &&
          statVal(nodes_map, 'Number_Of_Cooldowns') > 0
        ) {
          let Proc_Rate = 0
          const Basic_Skills = new Set([
            'blade-shift',
            'forceful-arrow',
            'heartseeker',
            'invigorating-strike',
            'puncture',
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

        // Aspect of Synergy : Using an Agility Skill reduces the Cooldown of your next Subterfuge Skill by 20%. Using a Subterfuge Skill increases the damage of your next Agility Skill by x{30/50}%.
        if (aspectVal(nodes_map, 'aspect-of-synergy').length > 0) {
          const Shadow_Step_Cooldown = statVal(
            nodes_map,
            'Shadow_Step_Cooldown',
          )
          const Caltrops_Cooldown = statVal(
            nodes_map,
            'Caltrops_Cooldown',
          )
          const Dash_Cooldown = statVal(nodes_map, 'Dash_Cooldown')
          // Avoiding a loop.
          const Concealment_Cooldown = 20
          const Smoke_Grenade_Cooldown = 13
          const Poison_Trap_Cooldown = 10
          // Adding 1 because cast time + they wont just get spammed.
          const Agility_Skill_Use_Rate =
            (1 / (1 + Shadow_Step_Cooldown)) *
              Number(allSkillsVal(nodes_map).has('shadow-step')) +
            (1 / (1 + Caltrops_Cooldown)) *
              Number(allSkillsVal(nodes_map).has('caltrops')) +
            (1 / (1 + Dash_Cooldown)) *
              Number(allSkillsVal(nodes_map).has('dash'))

          const Subterfuge_Skill_Use_Rate =
            (1 / (1 + Concealment_Cooldown)) *
              Number(allSkillsVal(nodes_map).has('concealment')) +
            (1 / (1 + Smoke_Grenade_Cooldown)) *
              Number(allSkillsVal(nodes_map).has('smoke-grenade')) +
            (1 / (1 + Cooldown)) *
              Number(allSkillsVal(nodes_map).has('dark-shroud')) +
            (1 / (1 + Poison_Trap_Cooldown)) *
              Number(allSkillsVal(nodes_map).has('poison-trap'))

          if (Subterfuge_Skill_Use_Rate > 0) {
            Cooldown *=
              1 -
              0.2 *
                Math.min(
                  Agility_Skill_Use_Rate / Subterfuge_Skill_Use_Rate,
                  1,
                )
          }
        }

        // Advanced Twisting Blades: When your Twisting Blades return, your active Cooldowns are reduced by .1 second per enemy they passed through, up to 2 seconds.
        if (
          talentVal(nodes_map, 'advanced-twisting-blades') > 0 &&
          'twisting-blades' in Pre_Sim_Node['skill_use_rate'] &&
          Pre_Sim_Node['skill_use_rate']['twisting-blades'] > 0 &&
          'twisting-blades' in Pre_Sim_Node['cross_skill_stat'] &&
          Cooldown > 0
        ) {
          // Subtract the initial hit.
          const Hits =
            Pre_Sim_Node['cross_skill_stat']['twisting-blades'][
              'total_hits'
            ] - 1
          const d = Math.min(0.1 * Hits, 2)
          const T = Cooldown
          // If the remaining cooldown is less than the reduction, then the reduction takes the cooldown to 0.
          // On average that's half the benefit.
          let Reduction_Per_Attack = 0
          if (d > T) {
            Reduction_Per_Attack -= T / 2
          } else {
            Reduction_Per_Attack =
              ((d / T) * d) / 2 + ((T - d) / T) * d
          }
          // Average number twisting blades times reduction Per Attack
          const Twisting_Blades_Seconds =
            1 / Pre_Sim_Node['skill_use_rate']['twisting-blades']
          Cooldown *=
            Twisting_Blades_Seconds /
            (Twisting_Blades_Seconds + Reduction_Per_Attack)
        }

        // Rogue Specialization Preparation: Every 100 energy you spend reduces ultimate cooldown by 5 seconds.
        // Using an ultimate resets the cooldown on all other skills.
        if (specializationVal(nodes_map) == 'preparation') {
          const Ultimate_Rate = statVal(nodes_map, 'Ultimate_Rate')
          // Cooldown = min (Exp(rate), Old_Cooldown)
          if (Ultimate_Rate > 0) {
            Cooldown =
              (1 / Ultimate_Rate) *
              (1 - Math.exp(-Ultimate_Rate * Cooldown))
          }
        }

        return Math.max(1, Cooldown)
      },
    ),

    Poison_Trap_Cooldown: new StatsNode(
      'Poison_Trap_Cooldown',
      () => {
        const Pre_Sim_Node = roguePresimVal(nodes_map)

        let Poison_Trap_Cooldown = 10

        // cooldown-reduction
        Poison_Trap_Cooldown *=
          1 - aggregationVal(nodes_map, 'cooldown-reduction')

        Poison_Trap_Cooldown *=
          1 - aggregationVal(nodes_map, 'trap-cooldown-reduction')

        // Vampiric Power hectic
        // For every 5 Basic Skills you cast, one of your active Cooldowns is reduced by 2 seconds.
        if (
          vampiricPowerVal(nodes_map, 'hectic') &&
          statVal(nodes_map, 'Number_Of_Cooldowns') > 0
        ) {
          let Proc_Rate = 0
          const Basic_Skills = new Set([
            'blade-shift',
            'forceful-arrow',
            'heartseeker',
            'invigorating-strike',
            'puncture',
          ])
          for (const Skill in Pre_Sim_Node['skill_use_rate']) {
            if (Basic_Skills.has(Skill)) {
              Proc_Rate +=
                Pre_Sim_Node['skill_use_rate'][Skill] /
                (5 * statVal(nodes_map, 'Number_Of_Cooldowns'))
            }
          }
          const alpha = Poison_Trap_Cooldown / (1 / Proc_Rate + 2)
          Poison_Trap_Cooldown -= alpha * 2
        }

        // Aspect of Synergy : Using an Agility Skill reduces the Cooldown of your next Subterfuge Skill by 20%. Using a Subterfuge Skill increases the damage of your next Agility Skill by x{30/50}%.
        if (aspectVal(nodes_map, 'aspect-of-synergy').length > 0) {
          const Shadow_Step_Cooldown = statVal(
            nodes_map,
            'Shadow_Step_Cooldown',
          )
          const Caltrops_Cooldown = statVal(
            nodes_map,
            'Caltrops_Cooldown',
          )
          const Dash_Cooldown = statVal(nodes_map, 'Dash_Cooldown')
          // Avoiding a loop.
          const Concealment_Cooldown = 20
          const Smoke_Grenade_Cooldown = 13
          const Dark_Shroud_Cooldown = 20

          // Adding 1 because cast time + they wont just get spammed.
          const Agility_Skill_Use_Rate =
            (1 / (1 + Shadow_Step_Cooldown)) *
              Number(allSkillsVal(nodes_map).has('shadow-step')) +
            (1 / (1 + Caltrops_Cooldown)) *
              Number(allSkillsVal(nodes_map).has('caltrops')) +
            (1 / (1 + Dash_Cooldown)) *
              Number(allSkillsVal(nodes_map).has('dash'))

          const Subterfuge_Skill_Use_Rate =
            (1 / (1 + Concealment_Cooldown)) *
              Number(allSkillsVal(nodes_map).has('concealment')) +
            (1 / (1 + Smoke_Grenade_Cooldown)) *
              Number(allSkillsVal(nodes_map).has('smoke-grenade')) +
            (1 / (1 + Dark_Shroud_Cooldown)) *
              Number(allSkillsVal(nodes_map).has('dark-shroud')) +
            (1 / (1 + Poison_Trap_Cooldown)) *
              Number(allSkillsVal(nodes_map).has('poison-trap'))

          if (Subterfuge_Skill_Use_Rate > 0) {
            Poison_Trap_Cooldown *=
              1 -
              0.2 *
                Math.min(
                  Agility_Skill_Use_Rate / Subterfuge_Skill_Use_Rate,
                  1,
                )
          }
        }

        // Advanced Twisting Blades: When your Twisting Blades return, your active Cooldowns are reduced by .1 second per enemy they passed through, up to 2 seconds.
        if (
          talentVal(nodes_map, 'advanced-twisting-blades') > 0 &&
          'twisting-blades' in Pre_Sim_Node['skill_use_rate'] &&
          Pre_Sim_Node['skill_use_rate']['twisting-blades'] > 0 &&
          'twisting-blades' in Pre_Sim_Node['cross_skill_stat'] &&
          Poison_Trap_Cooldown > 0
        ) {
          // Subtract the initial hit.
          const Hits =
            Pre_Sim_Node['cross_skill_stat']['twisting-blades'][
              'total_hits'
            ] - 1
          const d = Math.min(0.1 * Hits, 2)
          const T = Poison_Trap_Cooldown
          // If the remaining cooldown is less than the reduction, then the reduction takes the cooldown to 0.
          // On average that's half the benefit.
          let Reduction_Per_Attack = 0
          if (d > T) {
            Reduction_Per_Attack -= T / 2
          } else {
            Reduction_Per_Attack =
              ((d / T) * d) / 2 + ((T - d) / T) * d
          }
          // Average number twisting blades times reduction Per Attack
          const Twisting_Blades_Seconds =
            1 / Pre_Sim_Node['skill_use_rate']['twisting-blades']
          Poison_Trap_Cooldown *=
            Twisting_Blades_Seconds /
            (Twisting_Blades_Seconds + Reduction_Per_Attack)
        }

        // Exposure: Lucky Hit: Dealing direct damage to an enemy affected by a Trap Skill has up to a 25% chance to:
        //   - Reduce active cooldowns of trap skills by 20%.
        //   - Drop exploding stun grenades that deal 40% total physical damage and stun enemies for 0.5 seconds.
        // if (talentVal(nodes_map, 'exposure') > 0) {
        //   const Trap_Uptime = statVal(nodes_map, 'Trap_Uptime')
        //   let Lucky_Hit_Rate = 0
        //   // TODO: Filter to actual direct damage
        //   for (const Skill in Pre_Sim_Node['skill_use_rate']) {
        //     Lucky_Hit_Rate +=
        //       0.25 *
        //       Pre_Sim_Node['skill_use_rate'][Skill] *
        //       Pre_Sim_Node['cross_skill_stat'][Skill][
        //         'lucky_hit_chance'
        //       ] *
        //       Trap_Uptime *
        //       Pre_Sim_Node['cross_skill_stat'][Skill]['total_hits']
        //   }
        //   if (Lucky_Hit_Rate > 0) {
        //     // Problem can be framed as follows:
        //     //   Start with cooldown Y, each X seconds we reduce the remaining cooldown by a factor of (1 - D).
        //     //   Solve for number of repetitions:
        //     //     (((Y - X) * (1 - D) - X) * (1 - D) - X) * (1 - D) ... = 0
        //     //   For k repetitions LHS =:
        //     //   Y * (1 - D) ^ k - X * ((1 - D) ^ k - 1) * (1 - D) / D = 0
        //     //   Solve for k to get the following.
        //     const X = 1 / Lucky_Hit_Rate
        //     const D = 0.2
        //     const Y = Poison_Trap_Cooldown
        //     const alpha =
        //       Math.log((X * (1 - D)) / D / ((X * (1 - D)) / D + Y)) /
        //       Math.log(1 - D)
        //     Poison_Trap_Cooldown = alpha * X
        //   }
        // }

        // Rogue Specialization Preparation: Every 100 energy you spend reduces ultimate cooldown by 5 seconds.
        // Using an ultimate resets the cooldown on all other skills.
        if (specializationVal(nodes_map) == 'preparation') {
          const Ultimate_Rate = statVal(nodes_map, 'Ultimate_Rate')
          // Cooldown = min (Exp(rate), Old_Cooldown)
          if (Ultimate_Rate > 0) {
            Poison_Trap_Cooldown =
              (1 / Ultimate_Rate) *
              (1 - Math.exp(-Ultimate_Rate * Poison_Trap_Cooldown))
          }
        }

        return Math.max(1, Poison_Trap_Cooldown)
      },
    ),

    Death_Trap_Cooldown: new StatsNode('Death_Trap_Cooldown', () => {
      const Pre_Sim_Node = roguePresimVal(nodes_map)
      const enemy_spread = Number(statVal(nodes_map, 'Enemy_Spread'))
      const number_of_enemies = Number(
        toggleVal(nodes_map, 'number-of-enemies'),
      )

      let Death_Trap_Cooldown = 50

      // cooldown-reduction
      Death_Trap_Cooldown *=
        1 - aggregationVal(nodes_map, 'cooldown-reduction')

      Death_Trap_Cooldown *=
        1 - aggregationVal(nodes_map, 'trap-cooldown-reduction')

      // Eyes in the Dark : Unless it hits a Boss or Player, Death Trap will continue to re-arm itself until it kills an enemy. However, Death Trap's Cooldown is increased by {20/15}%.
      // increases the damage of Death Trap by 30-50%.
      if (aspectVal(nodes_map, 'eyes-in-the-dark').length > 0) {
        Death_Trap_Cooldown *=
          1 + aspectVal(nodes_map, 'eyes-in-the-dark')[1]
      }

      // Supreme Death Trap: If Death Trap kills an enemy, its Cooldown is reduced by 12 seconds.
      if (talentVal(nodes_map, 'supreme-death-trap') > 0) {
        // Copied From Enemy_Kills
        const Trap_Range =
          20 + 10 * talentVal(nodes_map, 'prime-death-trap')
        const Kill_Hits =
          Math.min(Trap_Range ** 2 / enemy_spread ** 2, 1) *
            (number_of_enemies - 1) +
          Number(
            !(
              toggleVal(nodes_map, 'enemy-boss') ||
              toggleVal(nodes_map, 'enemy-elite')
            ),
          )
        Death_Trap_Cooldown -= (12 * Kill_Hits * 2) / 5
      }

      // Vampiric Power hectic
      // For every 5 Basic Skills you cast, one of your active Cooldowns is reduced by 2 seconds.
      if (
        vampiricPowerVal(nodes_map, 'hectic') &&
        statVal(nodes_map, 'Number_Of_Cooldowns') > 0
      ) {
        let Proc_Rate = 0
        const Basic_Skills = new Set([
          'blade-shift',
          'forceful-arrow',
          'heartseeker',
          'invigorating-strike',
          'puncture',
        ])
        for (const Skill in Pre_Sim_Node['skill_use_rate']) {
          if (Basic_Skills.has(Skill)) {
            Proc_Rate +=
              Pre_Sim_Node['skill_use_rate'][Skill] /
              (5 * statVal(nodes_map, 'Number_Of_Cooldowns'))
          }
        }
        const alpha = Death_Trap_Cooldown / (1 / Proc_Rate + 2)
        Death_Trap_Cooldown -= alpha * 2
      }

      // Advanced Twisting Blades: When your Twisting Blades return, your active Cooldowns are reduced by .1 second per enemy they passed through, up to 2 seconds.
      if (
        talentVal(nodes_map, 'advanced-twisting-blades') > 0 &&
        'twisting-blades' in Pre_Sim_Node['skill_use_rate'] &&
        Pre_Sim_Node['skill_use_rate']['twisting-blades'] > 0 &&
        'twisting-blades' in Pre_Sim_Node['cross_skill_stat'] &&
        Death_Trap_Cooldown > 0
      ) {
        // Subtract the initial hit.
        const Hits =
          Pre_Sim_Node['cross_skill_stat']['twisting-blades'][
            'total_hits'
          ] - 1
        const d = Math.min(0.1 * Hits, 2)
        const T = Death_Trap_Cooldown
        // If the remaining cooldown is less than the reduction, then the reduction takes the cooldown to 0.
        // On average that's half the benefit.
        let Reduction_Per_Attack = 0
        if (d > T) {
          Reduction_Per_Attack -= T / 2
        } else {
          Reduction_Per_Attack = ((d / T) * d) / 2 + ((T - d) / T) * d
        }
        // Average number twisting blades times reduction Per Attack
        const Twisting_Blades_Seconds =
          1 / Pre_Sim_Node['skill_use_rate']['twisting-blades']
        Death_Trap_Cooldown *=
          Twisting_Blades_Seconds /
          (Twisting_Blades_Seconds + Reduction_Per_Attack)
      }

      // Exposure: Lucky Hit: Dealing direct damage to an enemy affected by a Trap Skill has up to a 25% chance to:
      //   - Reduce active cooldowns of trap skills by 20%.
      //   - Drop exploding stun grenades that deal 40% total physical damage and stun enemies for 0.5 seconds.
      // if (talentVal(nodes_map, 'exposure') > 0) {
      //   const Trap_Uptime = statVal(nodes_map, 'Trap_Uptime')

      //   let Lucky_Hit_Rate = 0
      //   // TODO: Filter to actual direct damage
      //   for (const Skill in Pre_Sim_Node['skill_use_rate']) {
      //     Lucky_Hit_Rate +=
      //       0.25 *
      //       Pre_Sim_Node['skill_use_rate'][Skill] *
      //       Pre_Sim_Node['cross_skill_stat'][Skill][
      //         'lucky_hit_chance'
      //       ] *
      //       Trap_Uptime *
      //       Pre_Sim_Node['cross_skill_stat'][Skill]['total_hits']
      //   }
      //   if (Lucky_Hit_Rate > 0) {
      //     // Problem can be framed as follows:
      //     //   Start with cooldown Y, each X seconds we reduce the remaining cooldown by a factor of (1 - D).
      //     //   Solve for number of repetitions:
      //     //     (((Y - X) * (1 - D) - X) * (1 - D) - X) * (1 - D) ... = 0
      //     //   For k repetitions LHS =:
      //     //   Y * (1 - D) ^ k - X * ((1 - D) ^ k - 1) * (1 - D) / D = 0
      //     //   Solve for k to get the following.
      //     const X = 1 / Lucky_Hit_Rate
      //     const D = 0.2
      //     const Y = Death_Trap_Cooldown
      //     const alpha =
      //       Math.log((X * (1 - D)) / D / ((X * (1 - D)) / D + Y)) /
      //       Math.log(1 - D)
      //     Death_Trap_Cooldown = alpha * X
      //   }
      // }

      // Rogue Specialization Preparation: Every 100 energy you spend reduces ultimate cooldown by 5 seconds.
      // Using an ultimate resets the cooldown on all other skills.
      if (specializationVal(nodes_map) == 'preparation') {
        let Energy_Use_Rate = 0
        for (const Skill in Pre_Sim_Node['skill_use_rate']) {
          // Resource cost is negative.
          Energy_Use_Rate -=
            Pre_Sim_Node['skill_use_rate'][Skill] *
            Pre_Sim_Node['cross_skill_stat'][Skill]['resource_cost']
        }
        if (Energy_Use_Rate > 0) {
          // Same solution and other cooldown reduction nodes.
          const D = 5
          const X = 100 / Energy_Use_Rate
          Death_Trap_Cooldown *= X / (X + D)
        }
      }

      // Flickerstep (Generic Unique Boots): Each enemy you Evade through reduces your active Ultimate Cooldown by 2-4 seconds, up to 10 seconds.
      if (aspectVal(nodes_map, 'flickerstep').length != 0) {
        const Evade_Rate = 1 / 5
        const alpha =
          Death_Trap_Cooldown /
          (1 / Evade_Rate + aspectVal(nodes_map, 'flickerstep')[0])
        Death_Trap_Cooldown -=
          alpha * aspectVal(nodes_map, 'flickerstep')[0]
      }

      return Math.max(1, Death_Trap_Cooldown)
    }),

    Shadow_Step_Cooldown: new StatsNode(
      'Shadow_Step_Cooldown',
      () => {
        const Pre_Sim_Node = roguePresimVal(nodes_map)
        const number_of_enemies = Number(
          toggleVal(nodes_map, 'number-of-enemies'),
        )

        let Cooldown = 9

        // Vampiric Power hectic
        // For every 5 Basic Skills you cast, one of your active Cooldowns is reduced by 2 seconds.
        if (
          vampiricPowerVal(nodes_map, 'hectic') &&
          statVal(nodes_map, 'Number_Of_Cooldowns') > 0
        ) {
          let Proc_Rate = 0
          const Basic_Skills = new Set([
            'blade-shift',
            'forceful-arrow',
            'heartseeker',
            'invigorating-strike',
            'puncture',
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

        // Disciplined Shadow Step: Shadow Step's Cooldown is reduced by 3 seconds when it damages an enemy you haven't hit with Shadow Step in the last 4 seconds.
        if ('shadow-step' in Pre_Sim_Node['cross_skill_stat']) {
          const Pre_Sim_Cooldown =
            Pre_Sim_Node['cross_skill_stat']['shadow-step'][
              'cooldown'
            ]
          // Plenty of unique enemies to shadow step to.
          if ((Pre_Sim_Cooldown - 3) * number_of_enemies > 4) {
            Cooldown -= 3
          } else {
            // Shadow step to each enemy before getting the full duration.
            Cooldown *=
              Cooldown * (1 / (number_of_enemies + 1)) +
              (Cooldown - 3) *
                (number_of_enemies / (number_of_enemies + 1))
          }
        }

        // cooldown-reduction
        Cooldown *=
          1 - aggregationVal(nodes_map, 'cooldown-reduction')

        // Advanced Twisting Blades: When your Twisting Blades return, your active Cooldowns are reduced by .1 second per enemy they passed through, up to 2 seconds.
        if (
          talentVal(nodes_map, 'advanced-twisting-blades') > 0 &&
          'twisting-blades' in Pre_Sim_Node['skill_use_rate'] &&
          Pre_Sim_Node['skill_use_rate']['twisting-blades'] > 0 &&
          'twisting-blades' in Pre_Sim_Node['cross_skill_stat'] &&
          Cooldown > 0
        ) {
          // Subtract the initial hit.
          const Hits =
            Pre_Sim_Node['cross_skill_stat']['twisting-blades'][
              'total_hits'
            ] - 1
          const d = Math.min(0.1 * Hits, 2)
          const T = Cooldown
          // If the remaining cooldown is less than the reduction, then the reduction takes the cooldown to 0.
          // On average that's half the benefit.
          let Reduction_Per_Attack = 0
          if (d > T) {
            Reduction_Per_Attack -= T / 2
          } else {
            Reduction_Per_Attack =
              ((d / T) * d) / 2 + ((T - d) / T) * d
          }
          // Average number twisting blades times reduction Per Attack
          const Twisting_Blades_Seconds =
            1 / Pre_Sim_Node['skill_use_rate']['twisting-blades']
          Cooldown *=
            Twisting_Blades_Seconds /
            (Twisting_Blades_Seconds + Reduction_Per_Attack)
        }

        // Rogue Specialization Preparation: Every 100 energy you spend reduces ultimate cooldown by 5 seconds.
        // Using an ultimate resets the cooldown on all other skills.
        if (specializationVal(nodes_map) == 'preparation') {
          const Ultimate_Rate = statVal(nodes_map, 'Ultimate_Rate')
          // Cooldown = min (Exp(rate), Old_Cooldown)
          if (Ultimate_Rate > 0) {
            Cooldown =
              (1 / Ultimate_Rate) *
              (1 - Math.exp(-Ultimate_Rate * Cooldown))
          }
        }

        return Math.max(1, Cooldown)
      },
    ),

    Caltrops_Cooldown: new StatsNode('Caltrops_Cooldown', () => {
      const Pre_Sim_Node = roguePresimVal(nodes_map)
      let Cooldown = 12

      // cooldown-reduction
      Cooldown *= 1 - aggregationVal(nodes_map, 'cooldown-reduction')

      // Vampiric Power hectic
      // For every 5 Basic Skills you cast, one of your active Cooldowns is reduced by 2 seconds.
      if (
        vampiricPowerVal(nodes_map, 'hectic') &&
        statVal(nodes_map, 'Number_Of_Cooldowns') > 0
      ) {
        let Proc_Rate = 0
        const Basic_Skills = new Set([
          'blade-shift',
          'forceful-arrow',
          'heartseeker',
          'invigorating-strike',
          'puncture',
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

      // Advanced Twisting Blades: When your Twisting Blades return, your active Cooldowns are reduced by .1 second per enemy they passed through, up to 2 seconds.
      if (
        talentVal(nodes_map, 'advanced-twisting-blades') > 0 &&
        'twisting-blades' in Pre_Sim_Node['skill_use_rate'] &&
        Pre_Sim_Node['skill_use_rate']['twisting-blades'] > 0 &&
        'twisting-blades' in Pre_Sim_Node['cross_skill_stat'] &&
        Cooldown > 0
      ) {
        // Subtract the initial hit.
        const Hits =
          Pre_Sim_Node['cross_skill_stat']['twisting-blades'][
            'total_hits'
          ] - 1
        const d = Math.min(0.1 * Hits, 2)
        const T = Cooldown
        // If the remaining cooldown is less than the reduction, then the reduction takes the cooldown to 0.
        // On average that's half the benefit.
        let Reduction_Per_Attack = 0
        if (d > T) {
          Reduction_Per_Attack -= T / 2
        } else {
          Reduction_Per_Attack = ((d / T) * d) / 2 + ((T - d) / T) * d
        }
        // Average number twisting blades times reduction Per Attack
        const Twisting_Blades_Seconds =
          1 / Pre_Sim_Node['skill_use_rate']['twisting-blades']
        Cooldown *=
          Twisting_Blades_Seconds /
          (Twisting_Blades_Seconds + Reduction_Per_Attack)
      }

      // Rogue Specialization Preparation: Every 100 energy you spend reduces ultimate cooldown by 5 seconds.
      // Using an ultimate resets the cooldown on all other skills.
      if (specializationVal(nodes_map) == 'preparation') {
        const Ultimate_Rate = statVal(nodes_map, 'Ultimate_Rate')
        // Cooldown = min (Exp(rate), Old_Cooldown)
        if (Ultimate_Rate > 0) {
          Cooldown =
            (1 / Ultimate_Rate) *
            (1 - Math.exp(-Ultimate_Rate * Cooldown))
        }
      }

      return Math.max(1, Cooldown)
    }),

    Dash_Cooldown: new StatsNode('Dash_Cooldown', () => {
      const Pre_Sim_Node = roguePresimVal(nodes_map)

      const enemy_spread = Number(statVal(nodes_map, 'Enemy_Spread'))
      const number_of_enemies = Number(
        toggleVal(nodes_map, 'number-of-enemies'),
      )
      let Cooldown = CooldownFromRanks(
        talentVal(nodes_map, 'dash'),
        'dash',
        12,
      )

      // cooldown-reduction
      Cooldown *= 1 - aggregationVal(nodes_map, 'cooldown-reduction')

      // Vampiric Power hectic
      // For every 5 Basic Skills you cast, one of your active Cooldowns is reduced by 2 seconds.
      if (
        vampiricPowerVal(nodes_map, 'hectic') &&
        statVal(nodes_map, 'Number_Of_Cooldowns') > 0
      ) {
        let Proc_Rate = 0
        const Basic_Skills = new Set([
          'blade-shift',
          'forceful-arrow',
          'heartseeker',
          'invigorating-strike',
          'puncture',
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

      // Aspect of Quickening Fog : You automatically drop a Smoke Grenade at the end of Dash. Dash's Cooldown is reduced by {0.25/0.35} seconds for each enemy Dazed this way, up to {0.75/1.05} seconds.
      if (
        aspectVal(nodes_map, 'aspect-of-quickening-fog').length != 0
      ) {
        const Hits =
          Math.min(10 ** 2 / enemy_spread ** 2, 1) * number_of_enemies
        Cooldown -=
          Math.min(Hits, 3) *
          aspectVal(nodes_map, 'aspect-of-quickening-fog')[0]
      }

      // Advanced Twisting Blades: When your Twisting Blades return, your active Cooldowns are reduced by .1 second per enemy they passed through, up to 2 seconds.
      if (
        talentVal(nodes_map, 'advanced-twisting-blades') > 0 &&
        'twisting-blades' in Pre_Sim_Node['skill_use_rate'] &&
        Pre_Sim_Node['skill_use_rate']['twisting-blades'] > 0 &&
        'twisting-blades' in Pre_Sim_Node['cross_skill_stat'] &&
        Cooldown > 0
      ) {
        // Subtract the initial hit.
        const Hits =
          Pre_Sim_Node['cross_skill_stat']['twisting-blades'][
            'total_hits'
          ] - 1
        const d = Math.min(0.1 * Hits, 2)
        const T = Cooldown
        // If the remaining cooldown is less than the reduction, then the reduction takes the cooldown to 0.
        // On average that's half the benefit.
        let Reduction_Per_Attack = 0
        if (d > T) {
          Reduction_Per_Attack -= T / 2
        } else {
          Reduction_Per_Attack = ((d / T) * d) / 2 + ((T - d) / T) * d
        }
        // Average number twisting blades times reduction Per Attack
        const Twisting_Blades_Seconds =
          1 / Pre_Sim_Node['skill_use_rate']['twisting-blades']
        Cooldown *=
          Twisting_Blades_Seconds /
          (Twisting_Blades_Seconds + Reduction_Per_Attack)
      }

      // Rogue Specialization Preparation: Every 100 energy you spend reduces ultimate cooldown by 5 seconds.
      // Using an ultimate resets the cooldown on all other skills.
      if (specializationVal(nodes_map) == 'preparation') {
        const Ultimate_Rate = statVal(nodes_map, 'Ultimate_Rate')
        // Cooldown = min (Exp(rate), Old_Cooldown)
        if (Ultimate_Rate > 0) {
          Cooldown =
            (1 / Ultimate_Rate) *
            (1 - Math.exp(-Ultimate_Rate * Cooldown))
        }
      }

      return Math.max(1, Cooldown)
    }),

    Shadow_Clone_Cooldown: new StatsNode(
      'Shadow_Clone_Cooldown',
      () => {
        const Pre_Sim_Node = roguePresimVal(nodes_map)
        let Cooldown = 60

        // cooldown-reduction
        Cooldown *=
          1 - aggregationVal(nodes_map, 'cooldown-reduction')

        // Vampiric Power hectic
        // For every 5 Basic Skills you cast, one of your active Cooldowns is reduced by 2 seconds.
        if (
          vampiricPowerVal(nodes_map, 'hectic') &&
          statVal(nodes_map, 'Number_Of_Cooldowns') > 0
        ) {
          let Proc_Rate = 0
          const Basic_Skills = new Set([
            'blade-shift',
            'forceful-arrow',
            'heartseeker',
            'invigorating-strike',
            'puncture',
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

        // Advanced Twisting Blades: When your Twisting Blades return, your active Cooldowns are reduced by .1 second per enemy they passed through, up to 2 seconds.
        if (
          talentVal(nodes_map, 'advanced-twisting-blades') > 0 &&
          'twisting-blades' in Pre_Sim_Node['skill_use_rate'] &&
          Pre_Sim_Node['skill_use_rate']['twisting-blades'] > 0 &&
          'twisting-blades' in Pre_Sim_Node['cross_skill_stat'] &&
          Cooldown > 0
        ) {
          // Subtract the initial hit.
          const Hits =
            Pre_Sim_Node['cross_skill_stat']['twisting-blades'][
              'total_hits'
            ] - 1
          const d = Math.min(0.1 * Hits, 2)
          const T = Cooldown
          // If the remaining cooldown is less than the reduction, then the reduction takes the cooldown to 0.
          // On average that's half the benefit.
          let Reduction_Per_Attack = 0
          if (d > T) {
            Reduction_Per_Attack -= T / 2
          } else {
            Reduction_Per_Attack =
              ((d / T) * d) / 2 + ((T - d) / T) * d
          }
          // Average number twisting blades times reduction Per Attack
          const Twisting_Blades_Seconds =
            1 / Pre_Sim_Node['skill_use_rate']['twisting-blades']
          Cooldown *=
            Twisting_Blades_Seconds /
            (Twisting_Blades_Seconds + Reduction_Per_Attack)
        }

        // Rogue Specialization Preparation: Every 100 energy you spend reduces ultimate cooldown by 5 seconds.
        // Using an ultimate resets the cooldown on all other skills.
        if (specializationVal(nodes_map) == 'preparation') {
          let Energy_Use_Rate = 0
          for (const Skill in Pre_Sim_Node['skill_use_rate']) {
            // Resource cost is negative.
            Energy_Use_Rate -=
              Pre_Sim_Node['skill_use_rate'][Skill] *
              Pre_Sim_Node['cross_skill_stat'][Skill]['resource_cost']
          }
          if (Energy_Use_Rate > 0) {
            // Same solution and other cooldown reduction nodes.
            const D = 5
            const X = 100 / Energy_Use_Rate
            Cooldown *= X / (X + D)
          }
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
      },
    ),

    Rain_Of_Arrows_Cooldown: new StatsNode(
      'Rain_Of_Arrows_Cooldown',
      () => {
        const Pre_Sim_Node = roguePresimVal(nodes_map)
        let Cooldown = 60

        // cooldown-reduction
        Cooldown *=
          1 - aggregationVal(nodes_map, 'cooldown-reduction')

        // Vampiric Power hectic
        // For every 5 Basic Skills you cast, one of your active Cooldowns is reduced by 2 seconds.
        if (
          vampiricPowerVal(nodes_map, 'hectic') &&
          statVal(nodes_map, 'Number_Of_Cooldowns') > 0
        ) {
          let Proc_Rate = 0
          const Basic_Skills = new Set([
            'blade-shift',
            'forceful-arrow',
            'heartseeker',
            'invigorating-strike',
            'puncture',
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

        // Advanced Twisting Blades: When your Twisting Blades return, your active Cooldowns are reduced by .1 second per enemy they passed through, up to 2 seconds.
        if (
          talentVal(nodes_map, 'advanced-twisting-blades') > 0 &&
          'twisting-blades' in Pre_Sim_Node['skill_use_rate'] &&
          Pre_Sim_Node['skill_use_rate']['twisting-blades'] > 0 &&
          'twisting-blades' in Pre_Sim_Node['cross_skill_stat'] &&
          Cooldown > 0
        ) {
          // Subtract the initial hit.
          const Hits =
            Pre_Sim_Node['cross_skill_stat']['twisting-blades'][
              'total_hits'
            ] - 1
          const d = Math.min(0.1 * Hits, 2)
          const T = Cooldown
          // If the remaining cooldown is less than the reduction, then the reduction takes the cooldown to 0.
          // On average that's half the benefit.
          let Reduction_Per_Attack = 0
          if (d > T) {
            Reduction_Per_Attack -= T / 2
          } else {
            Reduction_Per_Attack =
              ((d / T) * d) / 2 + ((T - d) / T) * d
          }
          // Average number twisting blades times reduction Per Attack
          const Twisting_Blades_Seconds =
            1 / Pre_Sim_Node['skill_use_rate']['twisting-blades']
          Cooldown *=
            Twisting_Blades_Seconds /
            (Twisting_Blades_Seconds + Reduction_Per_Attack)
        }

        // Rogue Specialization Preparation: Every 100 energy you spend reduces ultimate cooldown by 5 seconds.
        // Using an ultimate resets the cooldown on all other skills.
        if (specializationVal(nodes_map) == 'preparation') {
          let Energy_Use_Rate = 0
          for (const Skill in Pre_Sim_Node['skill_use_rate']) {
            // Resource cost is negative.
            Energy_Use_Rate -=
              Pre_Sim_Node['skill_use_rate'][Skill] *
              Pre_Sim_Node['cross_skill_stat'][Skill]['resource_cost']
          }
          if (Energy_Use_Rate > 0) {
            // Same solution and other cooldown reduction nodes.
            const D = 5
            const X = 100 / Energy_Use_Rate
            Cooldown *= X / (X + D)
          }
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
      },
    ),

    Total_Movement_Speed: new StatsNode(
      'Total_Movement_Speed',
      () => {
        const Pre_Sim_Node = roguePresimVal(nodes_map)

        let Movement_Speed_Total =
          1 + aggregationVal(nodes_map, 'movement-speed')

        // Shadow Step: Become Unstoppable and quickly move through the sahdows to stab your victim from behind for {['72%', '79%', '86%', '94%', '101%',} damage. Gain 50% increases Movement Speed for 2 seconds afterwards.
        if (allSkillsVal(nodes_map).has('shadow-step')) {
          const Shadow_Step_Cooldown = statVal(
            nodes_map,
            'Shadow_Step_Cooldown',
          )
          Movement_Speed_Total += (0.5 * 2) / Shadow_Step_Cooldown
        }

        if (
          'twisting-blades' in
            Pre_Sim_Node['combo_point_distribution'] &&
          specializationVal(nodes_map) == 'combo-points'
        ) {
          // [number, number, number, number] (should sum to 1)
          const Combo_Point_Distribution =
            Pre_Sim_Node['combo_point_distribution'][
              'twisting-blades'
            ]
          let Average_Combo_Points = 0
          for (let i = 0; i < 4; i++) {
            Average_Combo_Points += Combo_Point_Distribution[i] * i
          }
          // Cunning Strategem: Your non-damage Combo Point bonuses are increased by 1/3 when you spend 3 Combo Points.
          if (paragonVal(nodes_map, 'cunning-stratagem')) {
            Average_Combo_Points += Combo_Point_Distribution[3]
          }
          if ('twisting-blades' in Pre_Sim_Node['skill_use_rate']) {
            const Twisting_Blades_Use_Rate =
              Pre_Sim_Node['skill_use_rate']['twisting-blades']
            Movement_Speed_Total +=
              Average_Combo_Points *
              0.2 *
              Math.min(1.5 * Twisting_Blades_Use_Rate, 1)
          }
        }

        // Enhanced Blade Shift: Damaging an enemy with Blade Shift grants 20% Movement Speed.
        if ('blade-shift' in Pre_Sim_Node['skill_use_rate']) {
          Movement_Speed_Total +=
            0.05 *
            talentVal(nodes_map, 'enhanced-blade-shift') *
            (3 * Pre_Sim_Node['skill_use_rate']['blade-shift'] >= 1
              ? 4
              : 3 * Pre_Sim_Node['skill_use_rate']['blade-shift'])
        }

        // Stutter Step: Critically Striking an enemy grants {['5%', '10%', '15%',} Movement Speed for 4 seconds.
        let Crit_Rate = 0
        for (const Skill in Pre_Sim_Node['skill_use_rate']) {
          Crit_Rate +=
            Pre_Sim_Node['skill_use_rate'][Skill] *
            Pre_Sim_Node['cross_skill_stat'][Skill][
              'critical_chance'
            ] *
            Pre_Sim_Node['cross_skill_stat'][Skill]['total_hits']
        }
        Movement_Speed_Total +=
          0.05 *
          talentVal(nodes_map, 'stutter-step') *
          Math.min(Crit_Rate * 4, 1)

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

        // Subverting Dark Shroud: Each active shadow from Dark Shroud grants you 4% increased Movement Speed.
        if (talentVal(nodes_map, 'subverting-dark-shroud') > 0) {
          Movement_Speed_Total +=
            0.1 * statVal(nodes_map, 'Dark_Shroud_Uptime')
        }

        if (
          talentVal(nodes_map, 'momentum') > 0 &&
          statVal(nodes_map, 'Momentum_Stacks') == 3
        ) {
          Movement_Speed_Total += 0.15
        }

        // Aspect of Explosive Verve : Your Grenade Skills count as Trap Skills. Whenever you arm a Trap or drop Grenades, you gain +{10/18}% increased Movement Speed for 3.0 seconds.
        if (
          aspectVal(nodes_map, 'aspect-of-explosive-verve').length !=
          0
        ) {
          const Explosive_Verve_Rate =
            1 /
              (statVal(nodes_map, 'Smoke_Grenade_Cooldown') +
                0.0001) +
            1 / (statVal(nodes_map, 'Death_Trap_Cooldown') + 0.0001) +
            1 / (statVal(nodes_map, 'Poison_Trap_Cooldown') + 0.0001)
          Movement_Speed_Total +=
            aspectVal(nodes_map, 'aspect-of-explosive-verve')[0] *
            Math.min(Explosive_Verve_Rate * 3, 1)
        }

        // Cheat's Aspect : You take {15/25}% less damage from Crowd Controlled enemies. Whenever a Crowd Controlled enemy deals direct damage to you, gain +15.0% Movement Speed for 2.0 seconds.
        if (statVal(nodes_map, 'Enemy_Crowd_Controlled')) {
          Movement_Speed_Total += 0.15
        }

        // Vampiric Power moonrise
        // Hitting an enemy with a Basic Skill grants you 4% Attack Speed for 10 seconds, stacking up to 5 times. Upon reaching maximum stacks, you enter a Vampiric Bloodrage, gaining 160% Basic Skill damage and 15% Movement Speed for 10 seconds.
        if (vampiricPowerVal(nodes_map, 'moonrise')) {
          let Basic_Skill_Rate = 0
          const Basic_Skills = new Set([
            'blade-shift',
            'forceful-arrow',
            'heartseeker',
            'invigorating-strike',
            'puncture',
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

        return Math.min(Movement_Speed_Total, 2)
      },
    ),

    Number_Of_Cast: new StatsNode('Number_Of_Cast', () => {
      const Number_Of_Cast = 1

      return Number_Of_Cast
    }),

    Cast_Time: new StatsNode('Cast_Time', () => {
      const Pre_Sim_Node = roguePresimVal(nodes_map)
      const Total_Attack_Speed = statVal(
        nodes_map,
        'Total_Attack_Speed',
      )
      let base_cast_time = 1
      switch (currentSkillVal(nodes_map)['name']) {
        case 'heartseeker':
          base_cast_time = 0.66
          break
        case 'forceful-arrow':
          base_cast_time = 0.65
          break
        case 'puncture':
          base_cast_time = 0.47
          break
        case 'invigorating-strike':
          base_cast_time = 0.59
          break
        case 'blade-shift':
          base_cast_time = 0.35
          break
        case 'barrage':
          base_cast_time = 0.68
          if ('barrage' in Pre_Sim_Node['combo_point_distribution']) {
            const Combo_Point_Distribution =
              Pre_Sim_Node['combo_point_distribution']['barrage']
            let Average_Combo_Points = 0
            for (let i = 0; i < 4; i++) {
              Average_Combo_Points += Combo_Point_Distribution[i] * i
            }
            // Testing showed 0.68 at 0 CP and 0.72 at 3 CP.
            base_cast_time +=
              ((0.72 - 0.682) / 3) * Average_Combo_Points
          }

          break
        case 'rapid-fire':
          base_cast_time = 1.07
          if (
            'rapid-fire' in Pre_Sim_Node['combo_point_distribution']
          ) {
            const Combo_Point_Distribution =
              Pre_Sim_Node['combo_point_distribution']['rapid-fire']
            let Average_Combo_Points = 0
            for (let i = 0; i < 4; i++) {
              Average_Combo_Points += Combo_Point_Distribution[i] * i
            }
            // Testing showed 1.07 at 0 CP and 1.12 at 3 CP.
            base_cast_time +=
              ((1.12 - 1.07) / 3) * Average_Combo_Points
          }
          break
        case 'penetrating-shot':
          base_cast_time = 0.7
          break
        case 'twisting-blades':
          base_cast_time = 0.56
          break
        case 'flurry':
          base_cast_time = 0.79
          break
        case 'dash':
          base_cast_time = 0.58
          break
        case 'caltrops':
          base_cast_time = 1.22
          break
        case 'rain-of-arrows':
          base_cast_time = 0.85
          break
        case 'poison-trap':
          base_cast_time =
            0.72 -
            aggregationVal(
              nodes_map,
              'reduces-the-arm-time-of-your-trap-by-second',
            )
          break
        case 'shadow-clone':
          base_cast_time = 0.6
          break
        case 'dark-shroud':
          base_cast_time = 0
          break
        case 'smoke-grenade':
          base_cast_time = 0.25
          break
        case 'shadow-step':
          base_cast_time = 0.6
          break
        case 'death-trap':
          base_cast_time =
            0.5 -
            aggregationVal(
              nodes_map,
              'reduces-the-arm-time-of-your-trap-by-second',
            )
          break
      }

      return Total_Attack_Speed == 0
        ? 0
        : base_cast_time / Total_Attack_Speed
    }),

    Elapsed_Time: new StatsNode('Elapsed_Time', () => {
      return (
        statVal(nodes_map, 'Number_Of_Cast') *
        statVal(nodes_map, 'Cast_Time')
      )
    }),

    Total_Dodge_Chance: new StatsNode('Total_Dodge_Chance', () => {
      const Pre_Sim_Node = roguePresimVal(nodes_map)
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

      // Agile: Using a Cooldown increases your Dodge Chance by 4/8/12% for 3 seconds.
      // We assume every skill is used on cooldown and the cooldowns are used independently.
      const Rogue_Cooldowns = {
        'shadow-step': 9,
        caltrops: 12,
        dash: 12,
        concealment: 20,
        'smoke-grenade': 15,
        'poison-trap': 10,
        'dark-shroud': 20,
        'shadow-imbuement': 13,
        'poison-imbuement': 13,
        'cold-imbuement': 13,
        'shadow-clone': 60,
        'death-trap': 50,
        'rain-of-arrows': 60,
      }
      let Agile_Uptime = 0
      for (const [skill_name, skill_cooldown] of Object.entries(
        Rogue_Cooldowns,
      )) {
        const Cooldown =
          skill_cooldown *
          (1 - aggregationVal(nodes_map, 'cooldown-reduction'))
        Agile_Uptime =
          1 - (1 - Agile_Uptime) * (1 - Math.min(3 / Cooldown, 1))
      }
      Total_Dodge_Chance +=
        Agile_Uptime * 0.04 * talentVal(nodes_map, 'agile')

      // Aspect of Elusive Menace : While you have both bonuses from the Close Quarters Combat Key Passive active,
      // your Dodge Chance increases by +{3/7}% whenever you're hit by an enemy. Successfully Dodging resets this bonus.
      if (
        aspectVal(nodes_map, 'aspect-of-elusive-menace').length > 0 &&
        talentVal(nodes_map, 'close-quarters-combat') > 0 &&
        Object.keys(Pre_Sim_Node['skill_use_rate']).length > 0
      ) {
        // We try to compute the expected number of attacks before dodging with the CQC active. Then we scale the benefit by the uptime.
        const Base = Total_Dodge_Chance
        const Bonus = aspectVal(
          nodes_map,
          'aspect-of-elusive-menace',
        )[0]
        const Max_Stacks = Math.ceil((1 - Base) / Bonus)
        // We maintain P_k the prob that attacks until dodge >= k starting with k = 1.
        // Expectation = sum_k P_k
        let Expectation = 0
        let P_k = 1
        for (let k = 1; k < Max_Stacks; k++) {
          Expectation += P_k
          P_k *= 1 - (Base + (k - 1) * Bonus)
        }

        const Marksman_Skills = new Set([
          'puncture',
          'heartseeker',
          'forceful-arrow',
          'rain-of-arrows',
          'barrage',
          'rapid-fire',
          'penetrating-shot',
        ])
        const Cutthroat_Skills = new Set([
          'invigorating-strike',
          'blade-shift',
          'twisting-blades',
          'flurry',
          'dash',
          'shadow-step',
        ])
        let Marksman_Use_Rate = 0
        let Cutthroat_Use_Rate = 0
        for (const Skill in Pre_Sim_Node['skill_use_rate']) {
          if (Marksman_Skills.has(Skill)) {
            Marksman_Use_Rate += Pre_Sim_Node['skill_use_rate'][Skill]
          }
          if (Cutthroat_Skills.has(Skill)) {
            Cutthroat_Use_Rate +=
              Pre_Sim_Node['skill_use_rate'][Skill]
          }
        }

        const Elusive_Menace_Uptime =
          Math.min(Marksman_Use_Rate * 8, 1) *
          Math.min(Cutthroat_Use_Rate * 8, 1)

        Total_Dodge_Chance =
          Elusive_Menace_Uptime * (1 / Expectation) +
          (1 - Elusive_Menace_Uptime) * Base
      }

      // Assimilation-aspect: You have +8.0% increased Dodge chance versus enemies affected by damage Over Time effects. When you Dodge you gain {5/10} of your Primary Resource.
      if (aspectVal(nodes_map, 'assimilation-aspect').length > 0) {
        Total_Dodge_Chance +=
          0.08 * Math.min(Pre_Sim_Node['dot_uptime'], 1)
      }

      // Legendary Paragon 'leyranas-instinct', // When Inner Sight's gauge becomes full, you gain 100%[+] Dodge Chance for 2 seconds.
      // Your next 3 Core skills deal additional damage equal to 20%[x] of your Core Skill Damage bonus.
      if (paragonVal(nodes_map, "leyrana's-instinct")) {
        Total_Dodge_Chance +=
          (1 - Total_Dodge_Chance) *
          2 *
          statVal(nodes_map, 'Inner_Sight_Rate')
      }

      return Math.min(1, Total_Dodge_Chance)
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
        const Pre_Sim_Node = roguePresimVal(nodes_map)

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
        const Pre_Sim_Node = roguePresimVal(nodes_map)

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
        const Pre_Sim_Node = roguePresimVal(nodes_map)

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

    Max_Dot_Duration: new StatsNode('Max_Dot_Duration', () => {
      let Dot_Duration = 0
      switch (currentSkillVal(nodes_map)['name']) {
        case 'poison-trap':
          Dot_Duration = 9
          break
      }
      if (
        tagsVal(nodes_map).has('imbueable') &&
        allSkillsVal(nodes_map).has('poison-imbuement')
      ) {
        Dot_Duration = 5
        // Enhanced Poison Imbuement: Poison Imbuement's Poisoning Duration is increased by 1 second.
        if (talentVal(nodes_map, 'enhanced-poison-imbuement') > 0) {
          Dot_Duration += 1
        }
        Dot_Duration *= statVal(nodes_map, 'Poison_Imbuement_Uptime')
      }
      // Tracker: Poisoning damage effects last x33.3% longer.
      if (paragonVal(nodes_map, 'tracker')) {
        Dot_Duration *= 1.333
      }
      // Tracker: Poisoning damage effects last x33.3% longer.
      if (paragonVal(nodes_map, 'tracker')) {
        Dot_Duration *= 1.33
      }

      return Dot_Duration
    }),

    Combo_Points_Generated: new StatsNode(
      'Combo_Points_Generated',
      () => {
        let Combo_Points = 0
        if (
          specializationVal(nodes_map) == 'combo-points' &&
          tagsVal(nodes_map).has('basic')
        ) {
          Combo_Points += 1
          // Condemnation : Your Core Skills deal x{20/40}% increased damage when spending 3 Combo Points. Your Basic Skills using this weapon have a 30% chance to generate 3 Combo Points.
          if (aspectVal(nodes_map, 'condemnation').length > 0) {
            Combo_Points += 0.6
          }
        }

        return Combo_Points
      },
    ),

    Ultimate_Rate: new StatsNode('Ultimate_Rate', () => {
      const All_Skills = allSkillsVal(nodes_map)
      if (All_Skills.has('death-trap')) {
        return 1 / statVal(nodes_map, 'Death_Trap_Cooldown')
      }
      if (All_Skills.has('shadow-clone')) {
        return 1 / statVal(nodes_map, 'Shadow_Clone_Cooldown')
      }
      if (All_Skills.has('rain-of-arrows')) {
        return 1 / statVal(nodes_map, 'Rain_Of_Arrows_Cooldown')
      }
      return 0
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

    Dark_Shroud_Uptime: new StatsNode('Dark_Shroud_Uptime', () => {
      const Pre_Sim_Node = roguePresimVal(nodes_map)

      if (!allSkillsVal(nodes_map).has('dark-shroud')) {
        return 0
      }
      const Dark_Shroud_Cooldown = statVal(
        nodes_map,
        'Dark_Shroud_Cooldown',
      )
      let Dark_Shroud_Count = 5

      // Umbrous Aspect : Lucky Hit: Critical Strikes with Marksman Skills have up to a {40/60}% chance to grant a free Dark Shroud shadow.
      if (aspectVal(nodes_map, 'umbrous-aspect').length > 0) {
        const Marksman_Skills = new Set([
          'puncture',
          'heartseeker',
          'forceful-arrow',
          'rain-of-arrows',
          'barrage',
          'rapid-fire',
          'penetrating-shot',
        ])
        let Marksman_Crit_Rate = 0
        for (const Skill in Pre_Sim_Node['skill_use_rate']) {
          if (Marksman_Skills.has(Skill)) {
            Marksman_Crit_Rate +=
              Pre_Sim_Node['skill_use_rate'][Skill] *
              Pre_Sim_Node['cross_skill_stat'][Skill][
                'critical_chance'
              ] *
              Pre_Sim_Node['cross_skill_stat'][Skill]['total_hits']
          }
        }
        Dark_Shroud_Count +=
          Dark_Shroud_Cooldown *
          aspectVal(nodes_map, 'umbrous-aspect')[0] *
          statVal(nodes_map, 'Total_Lucky_Hit_Chance_Multiplier') *
          Marksman_Crit_Rate
      }
      let Dark_Shroud_Duration =
        Dark_Shroud_Count /
        statVal(nodes_map, 'Enemy_Attacks_Per_Second')

      // Enhanced Dark Shroud: Dark Shroud's shadows have a  14% chance to not be consumed.
      if (talentVal(nodes_map, 'enhanced-dark-shroud') > 0) {
        Dark_Shroud_Duration *= 1 / 0.86
      }

      return Math.min(1, Dark_Shroud_Duration / Dark_Shroud_Cooldown)
    }),

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
      const Pre_Sim_Node = roguePresimVal(nodes_map)
      let Kill_Rate = 0
      for (const Skill in Pre_Sim_Node['skill_use_rate']) {
        Kill_Rate +=
          Pre_Sim_Node['skill_use_rate'][Skill] *
          Pre_Sim_Node['cross_skill_stat'][Skill]['enemy_kills']
      }

      return Kill_Rate
    }),

    Cold_Imbuement_Cooldown: new StatsNode(
      'Cold_Imbuement_Cooldown',
      () => {
        const Pre_Sim_Node = roguePresimVal(nodes_map)

        let Cooldown_Total = 13

        // cooldown-reduction
        Cooldown_Total *=
          1 - aggregationVal(nodes_map, 'cooldown-reduction')

        Cooldown_Total *=
          1 -
          aggregationVal(nodes_map, 'imbuement-cooldown-reduction')

        // Rogue Specialization Preparation: Every 100 energy you spend reduces ultimate cooldown by 5 seconds.
        // Using an ultimate resets the cooldown on all other skills.
        const Ultimate_Rate = statVal(nodes_map, 'Ultimate_Rate')
        // Cooldown = min (Exp(rate), Old_Cooldown)
        if (Ultimate_Rate > 0) {
          Cooldown_Total =
            (1 / Ultimate_Rate) *
            (1 - Math.exp(-Ultimate_Rate * Cooldown_Total))
        }

        // Advanced Twisting Blades: When your Twisting Blades return, your active Cooldowns are reduced by .1 second per enemy they passed through, up to 2 seconds.
        if (
          talentVal(nodes_map, 'advanced-twisting-blades') > 0 &&
          'twisting-blades' in Pre_Sim_Node['skill_use_rate'] &&
          Pre_Sim_Node['skill_use_rate']['twisting-blades'] > 0 &&
          'twisting-blades' in Pre_Sim_Node['cross_skill_stat'] &&
          Cooldown_Total > 0
        ) {
          // Subtract the initial hit.
          const Hits =
            Pre_Sim_Node['cross_skill_stat']['twisting-blades'][
              'total_hits'
            ] - 1
          const d = Math.min(0.1 * Hits, 2)
          const T = Cooldown_Total
          // If the remaining cooldown is less than the reduction, then the reduction takes the cooldown to 0.
          // On average that's half the benefit.
          let Reduction_Per_Attack = 0
          if (d > T) {
            Reduction_Per_Attack -= T / 2
          } else {
            Reduction_Per_Attack =
              ((d / T) * d) / 2 + ((T - d) / T) * d
          }
          // Average number twisting blades times reduction Per Attack
          const Twisting_Blades_Seconds =
            1 / Pre_Sim_Node['skill_use_rate']['twisting-blades']
          Cooldown_Total *=
            Twisting_Blades_Seconds /
            (Twisting_Blades_Seconds + Reduction_Per_Attack)
        }

        // Countering Poison Trap: Pọison Trap has a 30% chance to reset your Imbuement Skill Cooldowns when activated.
        // Similar to Preparation above.
        if (
          'poison-trap' in Pre_Sim_Node['skill_use_rate'] &&
          talentVal(nodes_map, 'countering-poison-trap') > 0
        ) {
          const Countering_Poison_Trap_Rate =
            0.3 * Pre_Sim_Node['skill_use_rate']['poison-trap']
          if (Countering_Poison_Trap_Rate > 0) {
            Cooldown_Total =
              (1 / Countering_Poison_Trap_Rate) *
              (1 -
                Math.exp(
                  -Countering_Poison_Trap_Rate * Cooldown_Total,
                ))
          }
        }

        // Infusion: Casting an Imbuement Skill reduces the active Cooldown of another random Imbuement Skill by 0.5 seconds.
        if (paragonVal(nodes_map, 'infusion')) {
          const Imbuement_Count =
            Number(allSkillsVal(nodes_map).has('cold-imbuement')) +
            Number(allSkillsVal(nodes_map).has('poison-imbuement')) +
            Number(allSkillsVal(nodes_map).has('shadow-imbuement'))
          Cooldown_Total -= 0.5 * (Imbuement_Count - 1)
        }

        return Math.max(Cooldown_Total, 1)
      },
    ),

    Poison_Imbuement_Cooldown: new StatsNode(
      'Poison_Imbuement_Cooldown',
      () => {
        const Pre_Sim_Node = roguePresimVal(nodes_map)

        let Cooldown_Total = 13

        // cooldown-reduction
        Cooldown_Total *=
          1 - aggregationVal(nodes_map, 'cooldown-reduction')

        Cooldown_Total *=
          1 -
          aggregationVal(nodes_map, 'imbuement-cooldown-reduction')

        // Rogue Specialization Preparation: Every 100 energy you spend reduces ultimate cooldown by 5 seconds.
        // Using an ultimate resets the cooldown on all other skills.
        const Ultimate_Rate = statVal(nodes_map, 'Ultimate_Rate')
        // Cooldown = min (Exp(rate), Old_Cooldown)
        if (Ultimate_Rate > 0) {
          Cooldown_Total =
            (1 / Ultimate_Rate) *
            (1 - Math.exp(-Ultimate_Rate * Cooldown_Total))
        }

        // Advanced Twisting Blades: When your Twisting Blades return, your active Cooldowns are reduced by .1 second per enemy they passed through, up to 2 seconds.
        if (
          talentVal(nodes_map, 'advanced-twisting-blades') > 0 &&
          'twisting-blades' in Pre_Sim_Node['skill_use_rate'] &&
          Pre_Sim_Node['skill_use_rate']['twisting-blades'] > 0 &&
          'twisting-blades' in Pre_Sim_Node['cross_skill_stat'] &&
          Cooldown_Total > 0
        ) {
          // Subtract the initial hit.
          const Hits =
            Pre_Sim_Node['cross_skill_stat']['twisting-blades'][
              'total_hits'
            ] - 1
          const d = Math.min(0.1 * Hits, 2)
          const T = Cooldown_Total
          // If the remaining cooldown is less than the reduction, then the reduction takes the cooldown to 0.
          // On average that's half the benefit.
          let Reduction_Per_Attack = 0
          if (d > T) {
            Reduction_Per_Attack -= T / 2
          } else {
            Reduction_Per_Attack =
              ((d / T) * d) / 2 + ((T - d) / T) * d
          }
          // Average number twisting blades times reduction Per Attack
          const Twisting_Blades_Seconds =
            1 / Pre_Sim_Node['skill_use_rate']['twisting-blades']
          Cooldown_Total *=
            Twisting_Blades_Seconds /
            (Twisting_Blades_Seconds + Reduction_Per_Attack)
        }

        // 'mixed-poison-imbuement' Lucky Hit: Poison Imbued skills have up to a 30% chance to reduce Poison Imbuement's cooldown by 2 seconds.

        // Countering Poison Trap: Pọison Trap has a 30% chance to reset your Imbuement Skill Cooldowns when activated.
        // Similar to Preparation above.
        if (
          'poison-trap' in Pre_Sim_Node['skill_use_rate'] &&
          talentVal(nodes_map, 'countering-poison-trap') > 0
        ) {
          const Countering_Poison_Trap_Rate =
            0.3 * Pre_Sim_Node['skill_use_rate']['poison-trap']
          if (Countering_Poison_Trap_Rate > 0) {
            Cooldown_Total =
              (1 / Countering_Poison_Trap_Rate) *
              (1 -
                Math.exp(
                  -Countering_Poison_Trap_Rate * Cooldown_Total,
                ))
          }
        }

        // Infusion: Casting an Imbuement Skill reduces the active Cooldown of another random Imbuement Skill by 0.5 seconds.
        if (paragonVal(nodes_map, 'infusion')) {
          const Imbuement_Count =
            Number(allSkillsVal(nodes_map).has('cold-imbuement')) +
            Number(allSkillsVal(nodes_map).has('poison-imbuement')) +
            Number(allSkillsVal(nodes_map).has('shadow-imbuement'))
          Cooldown_Total -= 0.5 * (Imbuement_Count - 1)
        }

        // Aspect of Bursting Venoms : Lucky Hit: Poison Imbued Skills have up to a 15.0% chance to create a toxic pool that deals [{value1}] Poisoning damage over 3.0 seconds
        // to enemies within. While standing in the pool Poison Imbuement has no Cooldown and no Charge limit.
        if (
          aspectVal(nodes_map, 'aspect-of-bursting-venoms').length > 0
        ) {
          // Approximation of the uptime here to avoid a loop.
          let Imbueable_Skill_Rate = 0
          let Imbueable_Lucky_Hit_Rate = 0
          for (const Skill in Pre_Sim_Node['skill_use_rate']) {
            if (skillVal(nodes_map, Skill)['tags'].has('imbueable')) {
              Imbueable_Skill_Rate +=
                Pre_Sim_Node['skill_use_rate'][Skill]

              Imbueable_Lucky_Hit_Rate +=
                0.15 *
                Pre_Sim_Node['skill_use_rate'][Skill] *
                Pre_Sim_Node['cross_skill_stat'][Skill][
                  'total_hits'
                ] *
                Pre_Sim_Node['cross_skill_stat'][Skill][
                  'lucky_hit_chance'
                ]
            }
          }
          const Poison_Imbuement_Uptime = Math.min(
            1 / (Cooldown_Total + 0.0001) / Imbueable_Skill_Rate,
            1,
          )
          const Pool_Uptime = Math.min(
            1,
            Poison_Imbuement_Uptime * Imbueable_Lucky_Hit_Rate * 3,
          )

          Cooldown_Total *= 1 - Pool_Uptime
        }

        return Math.max(Cooldown_Total, 1)
      },
    ),

    Shadow_Imbuement_Cooldown: new StatsNode(
      'Shadow_Imbuement_Cooldown',
      () => {
        const Pre_Sim_Node = roguePresimVal(nodes_map)

        let Cooldown_Total = 13

        // cooldown-reduction
        Cooldown_Total *=
          1 - aggregationVal(nodes_map, 'cooldown-reduction')

        Cooldown_Total *=
          1 -
          aggregationVal(nodes_map, 'imbuement-cooldown-reduction')

        // Rogue Specialization Preparation: Every 100 energy you spend reduces ultimate cooldown by 5 seconds.
        // Using an ultimate resets the cooldown on all other skills.
        const Ultimate_Rate = statVal(nodes_map, 'Ultimate_Rate')
        // Cooldown = min (Exp(rate), Old_Cooldown)
        if (Ultimate_Rate > 0) {
          Cooldown_Total =
            (1 / Ultimate_Rate) *
            (1 - Math.exp(-Ultimate_Rate * Cooldown_Total))
        }

        // Advanced Twisting Blades: When your Twisting Blades return, your active Cooldowns are reduced by .1 second per enemy they passed through, up to 2 seconds.
        if (
          talentVal(nodes_map, 'advanced-twisting-blades') > 0 &&
          'twisting-blades' in Pre_Sim_Node['skill_use_rate'] &&
          Pre_Sim_Node['skill_use_rate']['twisting-blades'] > 0 &&
          'twisting-blades' in Pre_Sim_Node['cross_skill_stat'] &&
          Cooldown_Total > 0
        ) {
          // Subtract the initial hit.
          const Hits =
            Pre_Sim_Node['cross_skill_stat']['twisting-blades'][
              'total_hits'
            ] - 1
          const d = Math.min(0.1 * Hits, 2)
          const T = Cooldown_Total
          // If the remaining cooldown is less than the reduction, then the reduction takes the cooldown to 0.
          // On average that's half the benefit.
          let Reduction_Per_Attack = 0
          if (d > T) {
            Reduction_Per_Attack -= T / 2
          } else {
            Reduction_Per_Attack =
              ((d / T) * d) / 2 + ((T - d) / T) * d
          }
          // Average number twisting blades times reduction Per Attack
          const Twisting_Blades_Seconds =
            1 / Pre_Sim_Node['skill_use_rate']['twisting-blades']
          Cooldown_Total *=
            Twisting_Blades_Seconds /
            (Twisting_Blades_Seconds + Reduction_Per_Attack)
        }

        // Countering Poison Trap: Pọison Trap has a 30% chance to reset your Imbuement Skill Cooldowns when activated.
        // Similar to Preparation above.
        if (
          'poison-trap' in Pre_Sim_Node['skill_use_rate'] &&
          talentVal(nodes_map, 'countering-poison-trap') > 0
        ) {
          const Countering_Poison_Trap_Rate =
            0.3 * Pre_Sim_Node['skill_use_rate']['poison-trap']
          if (Countering_Poison_Trap_Rate > 0) {
            Cooldown_Total =
              (1 / Countering_Poison_Trap_Rate) *
              (1 -
                Math.exp(
                  -Countering_Poison_Trap_Rate * Cooldown_Total,
                ))
          }
        }

        // Infusion: Casting an Imbuement Skill reduces the active Cooldown of another random Imbuement Skill by 0.5 seconds.
        if (paragonVal(nodes_map, 'infusion')) {
          const Imbuement_Count =
            Number(allSkillsVal(nodes_map).has('cold-imbuement')) +
            Number(allSkillsVal(nodes_map).has('poison-imbuement')) +
            Number(allSkillsVal(nodes_map).has('shadow-imbuement'))
          Cooldown_Total -= 0.5 * (Imbuement_Count - 1)
        }

        // Glyph 'nightstalker', // Entering Stealth reduces the active cooldown of Shadow Imbuement by 4 seconds.
        if (paragonVal(nodes_map, 'nightstalker')) {
          let Nightstalker_Rate = 0

          if (allSkillsVal(nodes_map).has('concealment')) {
            Nightstalker_Rate +=
              1 / statVal(nodes_map, 'Concealment_Cooldown')
          }
          // Aspect of Uncanny Treachery : Dealing direct damage to a Dazed Enemy with an Agility Skill grants Stealth for 4.0 seconds. Breaking Stealth with an attack grants you {15/45}% Control Impaired Duration Reduction for 4.0 seconds. // IGNORE
          if (
            aspectVal(nodes_map, 'aspect-of-uncanny-treachery')
              .length > 0 &&
            allSkillsVal(nodes_map).has('dash')
          ) {
            Nightstalker_Rate +=
              1 / statVal(nodes_map, 'Dash_Cooldown')
          }
          // Aspect of Lethal Dusk : Evading through an enemy infected by Shadow Imbuement grants Stealth for 4.0 seconds. Breaking Stealth with an attack grants you {1/5}% Maximum Life on Kill for 6.0 seconds. // IGNORE
          if (
            aspectVal(nodes_map, 'aspect-of-lethal-dusk').length > 0
          ) {
            Nightstalker_Rate += Math.min(
              1 / 5,
              1 / statVal(nodes_map, 'Shadow_Imbuement_Cooldown'),
            )
          }
          const alpha = Cooldown_Total / (1 / Nightstalker_Rate + 4)
          Cooldown_Total -= alpha * 4
        }

        return Math.max(Cooldown_Total, 1)
      },
    ),

    Momentum_Stacks: new StatsNode('Momentum_Stacks', () => {
      const Pre_Sim_Node = roguePresimVal(nodes_map)
      const Cutthroat_Skills = new Set([
        'invigorating-strike',
        'blade-shift',
        'twisting-blades',
        'flurry',
        'dash',
        'shadow-step',
      ])
      let Cutthroat_Use_Rate = 0
      for (const Skill in Pre_Sim_Node['skill_use_rate']) {
        if (Cutthroat_Skills.has(Skill)) {
          Cutthroat_Use_Rate += Pre_Sim_Node['skill_use_rate'][Skill]
        }
      }

      return Cutthroat_Use_Rate * 8 < 1 ? Cutthroat_Use_Rate * 8 : 3
    }),

    Cold_Imbuement_Uptime: new StatsNode(
      'Cold_Imbuement_Uptime',
      () => {
        if (!allSkillsVal(nodes_map).has('cold-imbuement')) {
          return 0
        }
        const Pre_Sim_Node = roguePresimVal(nodes_map)

        let Imbueable_Skill_Rate = 0
        for (const Skill in Pre_Sim_Node['skill_use_rate']) {
          if (skillVal(nodes_map, Skill)['tags'].has('imbueable')) {
            Imbueable_Skill_Rate +=
              Pre_Sim_Node['skill_use_rate'][Skill]
          }
        }
        const Cold_Imbuement_Rate =
          Number(allSkillsVal(nodes_map).has('cold-imbuement')) /
          (statVal(nodes_map, 'Cold_Imbuement_Cooldown') + 0.0001)
        const Poison_Imbuement_Rate =
          Number(allSkillsVal(nodes_map).has('poison-imbuement')) /
          (statVal(nodes_map, 'Poison_Imbuement_Cooldown') + 0.0001)
        const Shadow_Imbuement_Rate =
          Number(allSkillsVal(nodes_map).has('shadow-imbuement')) /
          (statVal(nodes_map, 'Shadow_Imbuement_Cooldown') + 0.0001)

        const Imbuement_Rate =
          Cold_Imbuement_Rate +
          Poison_Imbuement_Rate +
          Shadow_Imbuement_Rate
        const Uptime =
          (Math.min((2 * Imbuement_Rate) / Imbueable_Skill_Rate, 1) *
            Cold_Imbuement_Rate) /
          Imbuement_Rate
        return Math.max(Uptime, 0)
      },
    ),

    Poison_Imbuement_Uptime: new StatsNode(
      'Poison_Imbuement_Uptime',
      () => {
        if (!allSkillsVal(nodes_map).has('poison-imbuement')) {
          return 0
        }
        const Pre_Sim_Node = roguePresimVal(nodes_map)

        let Imbueable_Skill_Rate = 0
        for (const Skill in Pre_Sim_Node['skill_use_rate']) {
          if (skillVal(nodes_map, Skill)['tags'].has('imbueable')) {
            Imbueable_Skill_Rate +=
              Pre_Sim_Node['skill_use_rate'][Skill]
          }
        }
        const Cold_Imbuement_Rate =
          Number(allSkillsVal(nodes_map).has('cold-imbuement')) /
          (statVal(nodes_map, 'Cold_Imbuement_Cooldown') + 0.0001)
        const Poison_Imbuement_Rate =
          Number(allSkillsVal(nodes_map).has('poison-imbuement')) /
          (statVal(nodes_map, 'Poison_Imbuement_Cooldown') + 0.0001)
        const Shadow_Imbuement_Rate =
          Number(allSkillsVal(nodes_map).has('shadow-imbuement')) /
          (statVal(nodes_map, 'Shadow_Imbuement_Cooldown') + 0.0001)

        const Imbuement_Rate =
          Cold_Imbuement_Rate +
          Poison_Imbuement_Rate +
          Shadow_Imbuement_Rate
        const Uptime =
          (Math.min((2 * Imbuement_Rate) / Imbueable_Skill_Rate, 1) *
            Poison_Imbuement_Rate) /
          Imbuement_Rate
        return Math.max(Uptime, 0)
      },
    ),

    Shadow_Imbuement_Uptime: new StatsNode(
      'Shadow_Imbuement_Uptime',
      () => {
        if (!allSkillsVal(nodes_map).has('shadow-imbuement')) {
          return 0
        }
        const Pre_Sim_Node = roguePresimVal(nodes_map)

        let Imbueable_Skill_Rate = 0
        for (const Skill in Pre_Sim_Node['skill_use_rate']) {
          if (skillVal(nodes_map, Skill)['tags'].has('imbueable')) {
            Imbueable_Skill_Rate +=
              Pre_Sim_Node['skill_use_rate'][Skill]
          }
        }
        const Cold_Imbuement_Rate =
          Number(allSkillsVal(nodes_map).has('cold-imbuement')) /
          (statVal(nodes_map, 'Cold_Imbuement_Cooldown') + 0.0001)
        const Poison_Imbuement_Rate =
          Number(allSkillsVal(nodes_map).has('poison-imbuement')) /
          (statVal(nodes_map, 'Poison_Imbuement_Cooldown') + 0.0001)
        const Shadow_Imbuement_Rate =
          Number(allSkillsVal(nodes_map).has('shadow-imbuement')) /
          (statVal(nodes_map, 'Shadow_Imbuement_Cooldown') + 0.0001)

        const Imbuement_Rate =
          Cold_Imbuement_Rate +
          Poison_Imbuement_Rate +
          Shadow_Imbuement_Rate
        const Uptime =
          (Math.min((2 * Imbuement_Rate) / Imbueable_Skill_Rate, 1) *
            Shadow_Imbuement_Rate) /
          Imbuement_Rate
        return Math.max(Uptime, 0)
      },
    ),

    Enemy_Spread: new StatsNode('Enemy_Spread', () => {
      let enemy_spread = Number(
        toggleVal(nodes_map, 'enemy-spread-yards'),
      )
      const Pre_Sim_Node = roguePresimVal(nodes_map)

      // Prime Death Trap: Enemies are Pulled into Death Trap when it activates.
      if (
        talentVal(nodes_map, 'prime-death-trap') > 0 &&
        'death-trap' in Pre_Sim_Node['skill_use_rate']
      ) {
        enemy_spread -=
          10 *
          ((5 /
            Pre_Sim_Node['cross_skill_stat']['death-trap'][
              'cooldown'
            ]) *
            Math.min(1, 20 ** 2 / enemy_spread ** 2))
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

      // writhing-band-of-trickery: Casting a Subterfuge Skill leaves behind a Decoy Trap that continuously Taunts and lures enemies. The Decoy Trap explodes after 3 seconds dealing [{value1}] Shadow damage. Can occur every 12 seconds.
      if (
        aspectVal(nodes_map, 'writhing-band-of-trickery').length > 0
      ) {
        let Subterfuge_Rate = 0
        if (allSkillsVal(nodes_map).has('concealment')) {
          const Concealment_Cooldown = CooldownFromRanks(
            talentVal(nodes_map, 'concealment'),
            'concealment',
            20,
          )
          Subterfuge_Rate +=
            1 /
            (Concealment_Cooldown *
              (1 - aggregationVal(nodes_map, 'cooldown-reduction')))
        }
        if (allSkillsVal(nodes_map).has('poison-trap')) {
          Subterfuge_Rate +=
            1 /
            (10 *
              (1 - aggregationVal(nodes_map, 'cooldown-reduction')))
        }
        if (allSkillsVal(nodes_map).has('smoke-grenade')) {
          Subterfuge_Rate +=
            1 /
            (13 *
              (1 - aggregationVal(nodes_map, 'cooldown-reduction')))
        }
        if (allSkillsVal(nodes_map).has('dark-shroud')) {
          Subterfuge_Rate +=
            1 /
            (20 *
              (1 - aggregationVal(nodes_map, 'cooldown-reduction')))
        }
        const Writhing_Band_Of_Trickery_Rate = Math.min(
          1 / 12,
          Subterfuge_Rate,
        )
        enemy_spread -= 5 * 3 * Writhing_Band_Of_Trickery_Rate
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
        'twisting-blades',
        'rapid-fire',
        'barrage',
        'flurry',
        'penetrating-shot',
      ])
      const Basic_Skills = new Set([
        'blade-shift',
        'forceful-arrow',
        'heartseeker',
        'invigorating-strike',
        'puncture',
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
        const Pre_Sim_Node = roguePresimVal(nodes_map)
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
          Vampiric_Curse_Rate +=
            0.3 * statVal(nodes_map, 'Vampiric_Bat_Rate')
        }

        return Math.min(1, Vampiric_Curse_Rate / number_of_enemies)
      },
    ),
    Vampiric_Bat_Rate: new StatsNode('Vampiric_Bat_Rate', () => {
      let Vampiric_Bat_Rate = 0

      const Pre_Sim_Node = roguePresimVal(nodes_map)
      const number_of_enemies = Number(
        toggleVal(nodes_map, 'number-of-enemies'),
      )

      // Vampiric Power flowing-veins
      // Casting a Mastery, Weapon Mastery, Macabre, Wrath, or Imbuement Skill calls a bat ally to attack nearby enemies, dealing 80% Physical damage with a 30% chance to Stun.	call-familiar
      // You deal 60% increased Damage Over Time to enemies that are moving or affected by a Vampiric Curse.
      if (vampiricPowerVal(nodes_map, 'flowing-veins')) {
        const Imbuement_Skills = new Set([
          'cold-imbuement',
          'poison-imbuement',
          'shadow-imbuement',
        ])
        for (const Skill of allSkillsVal(nodes_map)) {
          if (Imbuement_Skills.has(Skill)) {
            switch (Skill) {
              case 'cold-imbuement':
                Vampiric_Bat_Rate += statVal(
                  nodes_map,
                  'Cold_Imbuement_Cooldown',
                )
                break
              case 'poison-imbuement':
                Vampiric_Bat_Rate += statVal(
                  nodes_map,
                  'Poison_Imbuement_Cooldown',
                )
                break
              case 'shadow-imbuement':
                Vampiric_Bat_Rate += statVal(
                  nodes_map,
                  'Shadow_Imbuement_Cooldown',
                )
                break
              default:
                break
            }
          }
        }
      }

      return Vampiric_Bat_Rate
    }),

    Inner_Sight_Rate: new StatsNode('Inner_Sight_Rate', () => {
      const Pre_Sim_Node = roguePresimVal(nodes_map)
      const number_of_enemies = Number(
        toggleVal(nodes_map, 'number-of-enemies'),
      )

      // Specialization Inner Sight - 4 Seconds of Unlimited Energy
      if (
        specializationVal(nodes_map) == 'inner-sight' &&
        Object.keys(Pre_Sim_Node['skill_use_rate']).length > 0
      ) {
        const Inner_Sight_Duration = 4
        const Inner_Sight_Cooldown = 5

        let Skill_Hit_Rate = 0
        for (const Skill in Pre_Sim_Node['skill_use_rate']) {
          switch (Skill) {
            case 'shadow-step':
              Skill_Hit_Rate +=
                Pre_Sim_Node['skill_use_rate'][Skill] * 2.5
              break
            default:
              Skill_Hit_Rate +=
                Pre_Sim_Node['skill_use_rate'][Skill] *
                Pre_Sim_Node['cross_skill_stat'][Skill]['total_hits']
              break
          }
        }
        const Time_To_Inner_Sight =
          (10 * number_of_enemies) / Skill_Hit_Rate
        const Inner_Sight_Rate =
          1 /
          (Time_To_Inner_Sight +
            Inner_Sight_Duration +
            Inner_Sight_Cooldown)

        return Inner_Sight_Rate
      }

      return 0
    }),

    Inner_Sight_Energy_Gain_Rate: new StatsNode(
      'Inner_Sight_Energy_Gain_Rate',
      () => {
        const Pre_Sim_Node = roguePresimVal(nodes_map)

        // Specialization Inner Sight - 4 Seconds of Unlimited Energy
        if (statVal(nodes_map, 'Inner_Sight_Rate') > 0) {
          let Energy_Regeneration_Per_Second = 0
          let Top_Spender_Rate = 0
          let Top_Spender_Skill = 'empty'
          for (const Skill in Pre_Sim_Node['skill_use_rate']) {
            if (
              Pre_Sim_Node['cross_skill_stat'][Skill][
                'resource_cost'
              ] < 0 &&
              Top_Spender_Rate < Pre_Sim_Node['skill_use_rate'][Skill]
            ) {
              Top_Spender_Rate = Pre_Sim_Node['skill_use_rate'][Skill]
              Top_Spender_Skill = Skill
            }
          }

          if (Top_Spender_Skill != 'empty') {
            const Number_Of_Top_Spenders_Per_Inner_Sight = 4 // divide by Skill Cast Time
            Energy_Regeneration_Per_Second +=
              -Pre_Sim_Node['cross_skill_stat'][Top_Spender_Skill][
                'resource_cost'
              ] *
              statVal(nodes_map, 'Inner_Sight_Rate') *
              Number_Of_Top_Spenders_Per_Inner_Sight
          }

          return Energy_Regeneration_Per_Second
        }

        return 0
      },
    ),

    Trap_Uptime: new StatsNode('Trap_Uptime', () => {
      let Trap_Uptime = 0
      if (allSkillsVal(nodes_map).has('caltrops')) {
        Trap_Uptime +=
          (7 / statVal(nodes_map, 'Caltrops_Cooldown')) *
          Math.min(
            1,
            20 ** 2 / statVal(nodes_map, 'Enemy_Spread') ** 2,
          )
      }
      if (allSkillsVal(nodes_map).has('poison-trap')) {
        Trap_Uptime +=
          (9 / statVal(nodes_map, 'Poison_Trap_Cooldown')) *
          Math.min(
            1,
            10 ** 2 / statVal(nodes_map, 'Enemy_Spread') ** 2,
          )
      }
      if (allSkillsVal(nodes_map).has('death-trap')) {
        Trap_Uptime +=
          (2 / statVal(nodes_map, 'Death_Trap_Cooldown')) *
          Math.min(
            1,
            20 ** 2 / statVal(nodes_map, 'Enemy_Spread') ** 2,
          )
      }
      return Math.min(1, Trap_Uptime)
    }),
  }
}

export function CreateRogueTriggerNodes(
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

      // Ultimates Cannot Gain +Ranks
      if (tagsVal(nodes_map).has('ultimate')) {
        Skill_DoT_Modifier =
          currentSkillVal(nodes_map)['modifiers']['dot']
      }

      // Secondary Components
      const Multiple_Hits_Multiplier = statVal(
        nodes_map,
        'Hits_Multiplier',
      )

      const Tags_Node = CopyTags(tagsVal(nodes_map))
      Tags_Node.add('damage-over-time')
      const Damage_Multiplier = RogueDamageMultiplier(
        Tags_Node,
        nodes_map,
      )

      return (
        Skill_DoT_Modifier *
        Weapon_Damage *
        Damage_Multiplier *
        Multiple_Hits_Multiplier
      )
    }),

    Flat_Damage: new TriggerNode('Flat_Damage', () => {
      const Pre_Sim_Node = roguePresimVal(nodes_map)
      // Primary Components
      const Weapon_Damage = statVal(nodes_map, 'Total_Weapon_Damage')
      const Skill_Name = currentSkillVal(nodes_map)['name']
      let Skill_Flat_Modifier =
        currentSkillVal(nodes_map)['modifiers']['flat'] *
        (1 + 0.1 * (talentVal(nodes_map, Skill_Name) - 1))

      if (tagsVal(nodes_map).has('ultimate')) {
        Skill_Flat_Modifier =
          currentSkillVal(nodes_map)['modifiers']['flat']
      }

      const Hits_Multiplier = statVal(nodes_map, 'Hits_Multiplier')

      // Combo points for core.
      if (
        specializationVal(nodes_map) == 'combo-points' &&
        tagsVal(nodes_map).has('core') &&
        Skill_Name in Pre_Sim_Node['combo_point_distribution']
      ) {
        // [number, number, number, number] (should sum to 1)
        const Combo_Point_Distribution =
          Pre_Sim_Node['combo_point_distribution'][Skill_Name]
        let Average_Combo_Points = 0
        for (let i = 0; i < 4; i++) {
          Average_Combo_Points += Combo_Point_Distribution[i] * i
        }
        // Bit of a hack to get the bonus from condemnation.
        if (aspectVal(nodes_map, 'condemnation').length > 0) {
          Average_Combo_Points +=
            3 *
            Combo_Point_Distribution[3] *
            aspectVal(nodes_map, 'condemnation')[0]
        }
        switch (Skill_Name) {
          case 'rapid-fire':
            Skill_Flat_Modifier =
              (Combo_Point_Distribution[0] * 0.3 +
                Combo_Point_Distribution[1] * 0.33 +
                Combo_Point_Distribution[2] * 0.368 +
                Combo_Point_Distribution[3] * 0.42) *
              (1 +
                0.1 *
                  Math.floor(talentVal(nodes_map, 'rapid-fire') - 1))
            // Condemnation : Your Core Skills deal x{20/40}% increased damage when spending 3 Combo Points. Your Basic Skills using this weapon have a 30% chance to generate 3 Combo Points.
            if (aspectVal(nodes_map, 'condemnation').length > 0) {
              Skill_Flat_Modifier +=
                Combo_Point_Distribution[3] *
                0.42 *
                aspectVal(nodes_map, 'condemnation')[0] *
                (1 +
                  0.1 *
                    Math.floor(
                      talentVal(nodes_map, 'rapid-fire') - 1,
                    ))
            }
            break
          case 'barrage':
            Skill_Flat_Modifier *= 1 + 0.2 * Average_Combo_Points
            break
          case 'twisting-blades':
            Skill_Flat_Modifier *= 1 + 0.3 * Average_Combo_Points
            break
          case 'flurry':
            Skill_Flat_Modifier *= 1 + 0.25 * Average_Combo_Points
            break
          case 'penetrating-shot':
            Skill_Flat_Modifier *= 1 + 0.2 * Average_Combo_Points
            break
        }
      }

      // Calculation

      const Cold_Imbuement_Uptime = statVal(
        nodes_map,
        'Cold_Imbuement_Uptime',
      )
      const Poison_Imbuement_Uptime = statVal(
        nodes_map,
        'Poison_Imbuement_Uptime',
      )
      const Shadow_Imbuement_Uptime = statVal(
        nodes_map,
        'Shadow_Imbuement_Uptime',
      )

      const Tags_Node = CopyTags(tagsVal(nodes_map))
      Tags_Node.delete('damage-over-time')

      let Damage_Multiplier = 0
      if (
        aspectVal(nodes_map, 'word-of-hakan').length > 0 &&
        currentSkillVal(nodes_map)['name'] == 'rain-of-arrows'
      ) {
        Tags_Node.delete('physical')
        Tags_Node.add('cold')
        Tags_Node.add('poison')
        Tags_Node.add('shadow')
        Damage_Multiplier = RogueDamageMultiplier(
          Tags_Node,
          nodes_map,
        )
      } else if (
        // Pestilent Points: Every third cast of Puncture is Poison Imbued with [100 - 150]% of normal potency.
        aspectVal(nodes_map, 'pestilent-points').length > 0 &&
        currentSkillVal(nodes_map)['name'] == 'puncture'
      ) {
        Damage_Multiplier +=
          (RogueDamageMultiplier(Tags_Node, nodes_map) * 2) / 3

        Tags_Node.delete('physical')
        Tags_Node.add('poison')
        Damage_Multiplier +=
          (RogueDamageMultiplier(Tags_Node, nodes_map) * 1) / 3
      } else if (Tags_Node.has('imbueable')) {
        Damage_Multiplier +=
          RogueDamageMultiplier(Tags_Node, nodes_map) *
          (1 -
            (Cold_Imbuement_Uptime +
              Poison_Imbuement_Uptime +
              Shadow_Imbuement_Uptime))

        Tags_Node.delete('physical')
        Tags_Node.add('cold')
        Damage_Multiplier +=
          RogueDamageMultiplier(Tags_Node, nodes_map) *
          Cold_Imbuement_Uptime

        Tags_Node.delete('cold')
        Tags_Node.add('poison')
        Damage_Multiplier +=
          RogueDamageMultiplier(Tags_Node, nodes_map) *
          Poison_Imbuement_Uptime

        Tags_Node.delete('poison')
        Tags_Node.add('shadow')
        Damage_Multiplier +=
          RogueDamageMultiplier(Tags_Node, nodes_map) *
          Shadow_Imbuement_Uptime
      } else if (
        malignantHeartVal(nodes_map, 'the-vile-apothecary').length > 0
      ) {
        Damage_Multiplier =
          RogueDamageMultiplier(Tags_Node, nodes_map) *
          (1 - malignantHeartVal(nodes_map, 'the-vile-apothecary')[0])

        Tags_Node.delete('physical')
        Tags_Node.add('cold')
        Tags_Node.add('poison')
        Tags_Node.add('shadow')
        Damage_Multiplier =
          RogueDamageMultiplier(Tags_Node, nodes_map) *
          malignantHeartVal(nodes_map, 'the-vile-apothecary')[0]
      } else {
        Damage_Multiplier = RogueDamageMultiplier(
          Tags_Node,
          nodes_map,
        )
      }

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
        const Pre_Sim_Node = roguePresimVal(nodes_map)
        let Non_Skill_Damage_Total = 0

        const enemy_spread = Number(
          statVal(nodes_map, 'Enemy_Spread'),
        )
        const number_of_enemies = Number(
          toggleVal(nodes_map, 'number-of-enemies'),
        )
        const Critical_Chance = statVal(nodes_map, 'Critical_Chance')

        const Weapon_Damage = statVal(
          nodes_map,
          'Total_Weapon_Damage',
        )

        let Num_Hits = 1

        // Toxic Alchemist's Aspect : Lucky Hit: Shadow Imbued Skills have up to a 75% chance to create a toxic explosion that applies 0.2–0.3 Poisoning damage over 5 seconds to the target and surrounding enemies.
        // If the enemy was already Poisoned, increase this damage by 100%[x].
        if (
          aspectVal(nodes_map, 'toxic-alchemists-aspect').length >
            0 &&
          tagsVal(nodes_map).has('imbueable')
        ) {
          Num_Hits =
            1 +
            ProbabilityInCircle(0, 15, enemy_spread) *
              (number_of_enemies - 1)
          if (toggleVal(nodes_map, 'enemy-distant')) {
            Num_Hits =
              1 +
              ProbabilityInCircle(25, 15, enemy_spread) *
                (number_of_enemies - 1)
          }
          let Shadow_Imbuement_Chance = 0
          if (
            currentSkillVal(nodes_map)['name'] == 'rain-of-arrows' &&
            aspectVal(nodes_map, 'word-of-hakan').length > 0
          ) {
            Shadow_Imbuement_Chance = 1
          } else if (tagsVal(nodes_map).has('imbueable')) {
            Shadow_Imbuement_Chance = statVal(
              nodes_map,
              'Shadow_Imbuement_Uptime',
            )
          }

          const Toxic_Alchemist_Damage =
            Shadow_Imbuement_Chance *
            Num_Hits *
            Math.min(
              0.75 *
                statVal(
                  nodes_map,
                  'Skill_Lucky_Hit_Chance_Multiplier',
                ),
              1,
            ) *
            aspectVal(nodes_map, 'toxic-alchemists-aspect')[0] *
            RogueDamageMultiplier(
              new Set(['poison', 'damage-over-time']),
              nodes_map,
            )

          if (toggleVal(nodes_map, 'enemy-poisoned')) {
            Non_Skill_Damage_Total += Toxic_Alchemist_Damage * 2
          } else {
            Non_Skill_Damage_Total += Toxic_Alchemist_Damage
          }
        }

        // TODO Might need to consider the cap somehow.
        // Aspect of Arrow Storms : Lucky Hit: Your Marksman Skills have up to a 10.0% chance to create an arrow storm at the enemy's location, dealing {540/675} Physical damage over 3.0 seconds. You can have up to 5.0 active arrow storms.
        if (
          aspectVal(nodes_map, 'aspect-of-arrow-storms').length > 0 &&
          tagsVal(nodes_map).has('marksman')
        ) {
          if (toggleVal(nodes_map, 'enemy-distant')) {
            Num_Hits =
              1 +
              ProbabilityInCircle(25, 15, enemy_spread) *
                (number_of_enemies - 1)
          } else {
            Num_Hits =
              1 +
              ProbabilityInCircle(0, 15, enemy_spread) *
                (number_of_enemies - 1)
          }
          Non_Skill_Damage_Total +=
            Num_Hits *
            Math.min(
              0.1 *
                statVal(
                  nodes_map,
                  'Skill_Lucky_Hit_Chance_Multiplier',
                ),
              1,
            ) *
            aspectVal(nodes_map, 'aspect-of-arrow-storms')[0] *
            RogueDamageMultiplier(
              new Set(['physical', 'damage-over-time']),

              nodes_map,
            )
        }

        // Aspect of Bursting Venoms : Lucky Hit: Poison Imbued Skills have up to a 15.0% chance to create a toxic pool that deals [{value1}] Poisoning damage over 3.0 seconds to enemies within.
        // While standing in the pool Poison Imbuement has no Cooldown and no Charge limit.
        if (
          aspectVal(nodes_map, 'aspect-of-bursting-venoms').length >
            0 &&
          allSkillsVal(nodes_map).has('poison-imbuement')
        ) {
          if (toggleVal(nodes_map, 'enemy-distant')) {
            Num_Hits =
              1 +
              ProbabilityInCircle(25, 15, enemy_spread) *
                (number_of_enemies - 1)
          } else {
            Num_Hits =
              1 +
              ProbabilityInCircle(0, 15, enemy_spread) *
                (number_of_enemies - 1)
          }
          let Poison_Imbuement_Chance =
            statVal(nodes_map, 'Poison_Imbuement_Uptime') *
            Number(tagsVal(nodes_map).has('imbueable'))
          if (
            aspectVal(nodes_map, 'word-of-hakan').length > 0 &&
            currentSkillVal(nodes_map)['name'] == 'rain-of-arrows'
          ) {
            Poison_Imbuement_Chance = 1
          }
          if (
            // Pestilent Points: Every third cast of Puncture is Poison Imbued with [100 - 150]% of normal potency.
            aspectVal(nodes_map, 'pestilent-points').length > 0 &&
            currentSkillVal(nodes_map)['name'] == 'puncture'
          ) {
            Poison_Imbuement_Chance = 1 / 3
          }

          // (Rogue) the-vile-apothecary:	Your attacks have a [5-15]% chance to apply all Imbuement effects at [50-60]% of normal potency.
          if (
            malignantHeartVal(nodes_map, 'the-vile-apothecary')
              .length > 0
          ) {
            Poison_Imbuement_Chance =
              1 -
              (1 - Poison_Imbuement_Chance) *
                (1 -
                  malignantHeartVal(
                    nodes_map,
                    'the-vile-apothecary',
                  )[0])
          }

          Non_Skill_Damage_Total +=
            Poison_Imbuement_Chance *
            Num_Hits *
            Math.min(
              0.15 *
                statVal(
                  nodes_map,
                  'Skill_Lucky_Hit_Chance_Multiplier',
                ),
              1,
            ) *
            aspectVal(nodes_map, 'aspect-of-bursting-venoms')[0] *
            RogueDamageMultiplier(
              new Set(['poison', 'damage-over-time']),
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
            RogueDamageMultiplier(
              new Set(['poison', 'damage-over-time']),

              nodes_map,
            )
        }

        // Poison Imbuement: Imbue your weapons with lethal poison. Your next 2 Imbueable Skills deal Poison damage and apply {['100%', ...],} of their Base damage as additional Poisoning damage over 5 seconds.
        const Skill_Name = currentSkillVal(nodes_map)['name']
        let Skill_Modifier =
          currentSkillVal(nodes_map)['modifiers']['flat'] *
          (1 + 0.1 * (talentVal(nodes_map, Skill_Name) - 1))

        // Combo points for core.
        if (
          specializationVal(nodes_map) == 'combo-points' &&
          tagsVal(nodes_map).has('core') &&
          Skill_Name in Pre_Sim_Node['combo_point_distribution']
        ) {
          // [number, number, number, number] (should sum to 1)
          const Combo_Point_Distribution =
            Pre_Sim_Node['combo_point_distribution'][Skill_Name]
          let Average_Combo_Points = 0
          for (let i = 0; i < 4; i++) {
            Average_Combo_Points += Combo_Point_Distribution[i] * i
          }
          // Bit of a hack to get the bonus from condemnation.
          if (aspectVal(nodes_map, 'condemnation').length > 0) {
            Average_Combo_Points +=
              3 *
              Combo_Point_Distribution[3] *
              aspectVal(nodes_map, 'condemnation')[0]
          }
          switch (Skill_Name) {
            case 'rapid-fire':
              Skill_Modifier =
                (Combo_Point_Distribution[0] * 0.3 +
                  Combo_Point_Distribution[1] * 0.33 +
                  Combo_Point_Distribution[2] * 0.368 +
                  Combo_Point_Distribution[3] * 0.42) *
                (1 +
                  0.1 *
                    Math.floor(
                      talentVal(nodes_map, 'rapid-fire') - 1,
                    ))
              // Condemnation : Your Core Skills deal x{20/40}% increased damage when spending 3 Combo Points. Your Basic Skills using this weapon have a 30% chance to generate 3 Combo Points.
              if (aspectVal(nodes_map, 'condemnation').length > 0) {
                Skill_Modifier +=
                  Combo_Point_Distribution[3] *
                  0.42 *
                  aspectVal(nodes_map, 'condemnation')[0] *
                  (1 +
                    0.1 *
                      Math.floor(
                        talentVal(nodes_map, 'rapid-fire') - 1,
                      ))
              }
              break
            case 'barrage':
              Skill_Modifier *= 1 + 0.2 * Average_Combo_Points
              break
            case 'twisting-blades':
              Skill_Modifier *= 1 + 0.3 * Average_Combo_Points
              break
            case 'flurry':
              Skill_Modifier *= 1 + 0.25 * Average_Combo_Points
              break
            case 'penetrating-shot':
              Skill_Modifier *= 1 + 0.2 * Average_Combo_Points
              break
          }
        }
        const Base_Skill_Damage =
          Skill_Modifier *
          Weapon_Damage *
          // This is using the original tags, should use poison damage tag.
          (1 + aggregationVal(nodes_map, 'damage'))
        let Poison_Imbuement_Modifier =
          Base_Skill_Damage *
          (1 + 0.1 * (talentVal(nodes_map, 'poison-imbuement') - 1))
        // Aspect of Corruption : Your Imbuement Skill effects have x{20/40}% increased potency against Vulnerable enemies.
        if (
          aspectVal(nodes_map, 'aspect-of-corruption').length > 0 &&
          statVal(nodes_map, 'Enemy_Vulnerable') > 0
        ) {
          Poison_Imbuement_Modifier *=
            1 +
            aspectVal(nodes_map, 'aspect-of-corruption')[0] *
              statVal(nodes_map, 'Enemy_Vulnerable')
        }
        // For now, ignore the overlapping poison issue.
        // Enhanced Poison Imbuement: Poison Imbuement's Poisoning Duration is increased by 1 second.
        if (talentVal(nodes_map, 'enhanced-poison-imbuement') > 0) {
          Poison_Imbuement_Modifier *= 1.2
        }
        // Tracker: Poisoning damage effects last x33.3% longer.
        if (paragonVal(nodes_map, 'tracker')) {
          Poison_Imbuement_Modifier *= 1.333
        }

        let Poison_Imbuement_Chance =
          statVal(nodes_map, 'Poison_Imbuement_Uptime') *
          Number(tagsVal(nodes_map).has('imbueable'))
        if (
          aspectVal(nodes_map, 'word-of-hakan').length > 0 &&
          currentSkillVal(nodes_map)['name'] == 'rain-of-arrows'
        ) {
          Poison_Imbuement_Chance = 1
        }
        if (
          // Pestilent Points: Every third cast of Puncture is Poison Imbued with [100 - 150]% of normal potency.
          aspectVal(nodes_map, 'pestilent-points').length > 0 &&
          currentSkillVal(nodes_map)['name'] == 'puncture'
        ) {
          Poison_Imbuement_Chance = 1 / 3
          Poison_Imbuement_Modifier *= aspectVal(
            nodes_map,
            'pestilent-points',
          )[0]
        }

        let Vile_Apothecary_Chance = 0
        let Vile_Apothecary_Multiplier = 0
        // (Rogue) the-vile-apothecary:	Your attacks have a [5-15]% chance to apply all Imbuement effects at [50-60]% of normal potency.
        if (
          malignantHeartVal(nodes_map, 'the-vile-apothecary').length >
          0
        ) {
          Vile_Apothecary_Chance =
            (1 - Poison_Imbuement_Chance) *
            malignantHeartVal(nodes_map, 'the-vile-apothecary')[0]

          Vile_Apothecary_Multiplier = malignantHeartVal(
            nodes_map,
            'the-vile-apothecary',
          )[1]
        }

        Non_Skill_Damage_Total +=
          Poison_Imbuement_Modifier *
          // Blended Poison Imbuement: Critical Strikes with Poison Imbued Skills deal 75% increased Poisioning damage.;
          (1 +
            0.75 *
              Number(
                talentVal(nodes_map, 'blended-poison-imbuement') > 0,
              ) *
              statVal(nodes_map, 'Critical_Chance')) *
          // Prime Rain of Arrows: lmbuement Skill effects applied by Rain of Arrows have 30% increased potency.
          (1 +
            0.3 *
              Number(
                talentVal(nodes_map, 'prime-rain-of-arrows') > 0,
              ) *
              Number(
                currentSkillVal(nodes_map)['name'] ==
                  'rain-of-arrows',
              )) *
          // Efficacy: Imbuement Skill effects have x20% increased potency.
          (1 + 0.2 * Number(paragonVal(nodes_map, 'efficacy'))) *
          RogueDamageMultiplier(
            new Set(['poison', 'damage-over-time']),
            nodes_map,
          ) *
          statVal(nodes_map, 'Number_Enemies_Hit') *
          (Poison_Imbuement_Chance +
            Vile_Apothecary_Chance * Vile_Apothecary_Multiplier)

        return Non_Skill_Damage_Total
      },
    ),

    Non_Skill_Flat_Damage: new TriggerNode(
      'Non_Skill_Flat_Damage',
      () => {
        let Non_Skill_Damage_Total = 0
        const enemy_spread = Number(
          statVal(nodes_map, 'Enemy_Spread'),
        )
        const number_of_enemies = Number(
          toggleVal(nodes_map, 'number-of-enemies'),
        )
        const Weapon_Damage = statVal(
          nodes_map,
          'Total_Weapon_Damage',
        )
        const Pre_Sim_Node = roguePresimVal(nodes_map)
        const Skill_Name = currentSkillVal(nodes_map)['name']
        const Skill_Flat_Modifier =
          currentSkillVal(nodes_map)['modifiers']['flat'] *
          (1 + 0.1 * (talentVal(nodes_map, Skill_Name) - 1))
        const Base_Damage = Weapon_Damage * Skill_Flat_Modifier

        // Icy Alchemist's Aspect : Lucky Hit: Shadow Imbued Skill have up to a 75% chance to release an explosion that deals 0.3–0.48 Cold damage to the target and surrounding enemies, Chilling them for 25%.
        // If they were already Chilled or Frozen, increase this damage by 100%[x].
        if (
          aspectVal(nodes_map, 'icy-alchemists-aspect').length > 0 &&
          tagsVal(nodes_map).has('imbueable')
        ) {
          let num_hits =
            1 +
            ProbabilityInCircle(0, 15, enemy_spread) *
              (number_of_enemies - 1)
          if (toggleVal(nodes_map, 'enemy-distant')) {
            num_hits =
              1 +
              ProbabilityInCircle(25, 15, enemy_spread) *
                (number_of_enemies - 1)
          }
          let Shadow_Imbuement_Chance = 0
          if (
            currentSkillVal(nodes_map)['name'] == 'rain-of-arrows' &&
            aspectVal(nodes_map, 'word-of-hakan').length > 0
          ) {
            Shadow_Imbuement_Chance = 1
          } else if (tagsVal(nodes_map).has('imbueable')) {
            Shadow_Imbuement_Chance = statVal(
              nodes_map,
              'Shadow_Imbuement_Uptime',
            )
          }

          const Icy_Alchemist_Damage =
            Shadow_Imbuement_Chance *
            num_hits *
            Math.min(
              0.75 *
                statVal(
                  nodes_map,
                  'Skill_Lucky_Hit_Chance_Multiplier',
                ),
              1,
            ) *
            aspectVal(nodes_map, 'icy-alchemists-aspect')[0] *
            RogueDamageMultiplier(new Set(['cold']), nodes_map)

          if (
            statVal(nodes_map, 'Enemy_Chilled') == 1 ||
            toggleVal(nodes_map, 'enemy-frozen')
          ) {
            Non_Skill_Damage_Total += Icy_Alchemist_Damage * 2
          } else {
            Non_Skill_Damage_Total += Icy_Alchemist_Damage
          }
        }

        // Victimize: Lucky Hit: Dealing direct damage to a Vulnerable enemy has up to a 45% chance to cause an explosion, dealing 23% of the original damage to them and surrounding enemies.
        //                       Victimize’s damage is increased by 120% of your Damage vs Vulnerable bonus.
        if (
          talentVal(nodes_map, 'victimize') > 0 &&
          statVal(nodes_map, 'Enemy_Vulnerable') > 0
        ) {
          const Skill_Flat_Damage = triggerVal(
            nodes_map,
            'Flat_Damage',
          )
          let Victimize_Hits_Multiplier = 1
          const Victimize_Lucky_Hit_Chance = 0.45
          if (toggleVal(nodes_map, 'enemy-distant')) {
            Victimize_Hits_Multiplier =
              1 +
              ProbabilityInCircle(25, 15, enemy_spread) *
                (number_of_enemies - 1)
          } else {
            Victimize_Hits_Multiplier =
              1 +
              Math.min(15 ** 2 / enemy_spread ** 2, 1) *
                (number_of_enemies - 1)
          }
          Non_Skill_Damage_Total +=
            Skill_Flat_Damage *
            statVal(nodes_map, 'Enemy_Vulnerable') *
            0.23 *
            (1 + aggregationVal(nodes_map, 'vulnerable-damage') * 1.2) // S2 Update
          Victimize_Hits_Multiplier *
            Math.min(
              Victimize_Lucky_Hit_Chance *
                statVal(
                  nodes_map,
                  'Skill_Lucky_Hit_Chance_Multiplier',
                ),
              1,
            )
        }

        // Grasp of Shadow : Lucky Hit: Damaging a Vulnerable enemy with a Marksman or Cutthroat Skill has up to a {20/30}% chance to summon a Shadow Clone that mimics your attack.
        if (
          aspectVal(nodes_map, 'grasp-of-shadow').length > 0 &&
          (tagsVal(nodes_map).has('marksman') ||
            tagsVal(nodes_map).has('cutthroat')) &&
          statVal(nodes_map, 'Enemy_Vulnerable') > 0
        ) {
          const Shadow_Clone_Damage =
            Base_Damage *
            RogueDamageMultiplier(
              new Set(['physical', 'shadow-clone']),
              nodes_map,
            ) *
            statVal(nodes_map, 'Hits_Multiplier')

          Non_Skill_Damage_Total +=
            aspectVal(nodes_map, 'grasp-of-shadow')[0] *
            statVal(nodes_map, 'Skill_Lucky_Hit_Chance_Multiplier') *
            statVal(nodes_map, 'Enemy_Vulnerable') *
            statVal(nodes_map, 'Total_Hits') *
            Shadow_Clone_Damage
        }

        // Aspect of Surprise : When you Evade or Shadow Step, you leave behind a cluster of exploding Stun Grenades that deal {50/100} total Physical damage and Stun enemies for 0.5 seconds.
        if (
          aspectVal(nodes_map, 'aspect-of-surprise').length > 0 &&
          currentSkillVal(nodes_map)['name'] == 'shadow-step'
        ) {
          let Grenade_Hits =
            1 +
            Math.min(
              1,
              10 ** 2 / statVal(nodes_map, 'Enemy_Spread') ** 2,
            ) *
              (number_of_enemies - 1)
          if (!toggleVal(nodes_map, 'enemy-distant')) {
            Grenade_Hits =
              Math.min(
                1,
                10 ** 2 / statVal(nodes_map, 'Enemy_Spread') ** 2,
              ) * number_of_enemies
          }
          Non_Skill_Damage_Total +=
            aspectVal(nodes_map, 'aspect-of-surprise')[0] *
            Grenade_Hits *
            RogueDamageMultiplier(
              new Set(['physical', 'stun-grenade']),
              nodes_map,
            )
        }

        // Trickster's Aspect : Caltrops also throw a cluster of exploding Stun Grenades that deal {100/150} total Physical damage and Stun enemies for 0.5 seconds.
        if (
          aspectVal(nodes_map, 'tricksters-aspect').length > 0 &&
          currentSkillVal(nodes_map)['name'] == 'caltrops'
        ) {
          let Grenade_Hits =
            1 +
            Math.min(
              1,
              10 ** 2 / statVal(nodes_map, 'Enemy_Spread') ** 2,
            ) *
              (number_of_enemies - 1)
          if (!toggleVal(nodes_map, 'enemy-distant')) {
            Grenade_Hits =
              Math.min(
                1,
                10 ** 2 / statVal(nodes_map, 'Enemy_Spread') ** 2,
              ) * number_of_enemies
          }
          Non_Skill_Damage_Total +=
            aspectVal(nodes_map, 'tricksters-aspect')[0] *
            Grenade_Hits *
            RogueDamageMultiplier(
              new Set(['physical', 'stun-grenade']),
              nodes_map,
            )
        }

        // Exposure: Lucky Hit: Dealing direct damage to an enemy affected by a Trap Skill has up to a 25% chance to:
        //   - Reduce active cooldowns of trap skills by 20%.
        //   - Drop exploding stun grenades that deal 40% total physical damage and stun enemies for 0.5 seconds.
        if (talentVal(nodes_map, 'exposure') > 0) {
          const Trap_Uptime = statVal(nodes_map, 'Trap_Uptime')
          // Average Lucky Hits.
          const Lucky_Hits =
            statVal(nodes_map, 'Skill_Lucky_Hit_Chance_Multiplier') *
            0.25 *
            Number(
              currentSkillVal(nodes_map)['modifiers']['flat'] > 0,
            ) *
            statVal(nodes_map, 'Total_Hits') *
            Trap_Uptime

          let Grenade_Hits =
            1 +
            Math.min(
              1,
              10 ** 2 / statVal(nodes_map, 'Enemy_Spread') ** 2,
            ) *
              (number_of_enemies - 1)
          if (!toggleVal(nodes_map, 'enemy-distant')) {
            Grenade_Hits =
              Math.min(
                1,
                10 ** 2 / statVal(nodes_map, 'Enemy_Spread') ** 2,
              ) * number_of_enemies
          }

          Non_Skill_Damage_Total +=
            Lucky_Hits *
            Grenade_Hits *
            RogueDamageMultiplier(
              new Set(['physical', 'stun-grenade']),
              nodes_map,
            ) *
            0.4 *
            Weapon_Damage
        }

        // Doombringer: Lucky Hit: Up to a [0.7|%|] chance to deal 0.7*825 Shadow damage to surrounding enemies and reduce their damage done by 20% for 3 seconds.
        if (aspectVal(nodes_map, 'doombringer').length > 0) {
          const Hits =
            1 +
            Math.min(10 ** 2 / enemy_spread ** 2, 1) *
              (number_of_enemies - 1)
          Non_Skill_Damage_Total +=
            statVal(nodes_map, 'Total_Lucky_Hit_Chance_Multiplier') *
            Hits *
            aspectVal(nodes_map, 'doombringer')[1] *
            aspectVal(nodes_map, 'doombringer')[0] *
            RogueDamageMultiplier(new Set(['shadow']), nodes_map)
        }

        // Aspect of Volatile Shadows : When a Dark Shroud shadow would be removed you trigger an explosion around yourself that deals {54/97} Shadow damage.
        if (
          aspectVal(nodes_map, 'aspect-of-volatile-shadows').length >
            0 &&
          currentSkillVal(nodes_map)['name'] == 'dark-shroud'
        ) {
          const Hits =
            1 +
            Math.min(10 ** 2 / enemy_spread ** 2, 1) *
              (number_of_enemies - 1)

          Non_Skill_Damage_Total +=
            Hits *
            aspectVal(nodes_map, 'aspect-of-volatile-shadows')[0] *
            RogueDamageMultiplier(new Set(['shadow']), nodes_map)
        }

        // opportunists Aspect : When you break Stealth with an attack, you drop a cluster of exploding Stun Grenades around your location that deal {360/450} total Physical damage and Stun enemies for 0.5 seconds.
        if (
          aspectVal(nodes_map, 'opportunists-aspect').length > 0 &&
          allSkillsVal(nodes_map).has('concealment')
        ) {
          const Hits = 1 + Math.min(10 ** 2 / enemy_spread ** 2, 1)
          Non_Skill_Damage_Total +=
            (Hits *
              aspectVal(nodes_map, 'opportunists-aspect')[0] *
              RogueDamageMultiplier(
                new Set(['physical', 'grenade']),
                nodes_map,
              ) *
              statVal(nodes_map, 'Cast_Time')) /
            (statVal(nodes_map, 'Concealment_Cooldown') + 0.0001)
        }

        // Shadow Imbuement: Imbue your weapons with festering shadows. Your next 2 Imbueable Skills deal Shadow damage and infect enemies for 6 seconds.
        // Infected enemies explode on death, dealing {['40%', '44%', '48%', '52%', '56%',} damage to all surrounding enemies.
        if (allSkillsVal(nodes_map).has('shadow-imbuement')) {
          let Shadow_Imbuement_Application_Rate = 0
          for (const Skill in Pre_Sim_Node['skill_use_rate']) {
            if (skillVal(nodes_map, Skill)['tags'].has('imbueable')) {
              let Shadow_Imbuement_Chance = 0
              if (
                Skill == 'rain-of-arrows' &&
                aspectVal(nodes_map, 'word-of-hakan').length > 0
              ) {
                Shadow_Imbuement_Chance = 1
              } else if (
                skillVal(nodes_map, Skill)['tags'].has('imbueable')
              ) {
                Shadow_Imbuement_Chance = statVal(
                  nodes_map,
                  'Shadow_Imbuement_Uptime',
                )
              }
              // (Rogue) the-vile-apothecary:	Your attacks have a [5-15]% chance to apply all Imbuement effects at [50-60]% of normal potency.
              if (
                malignantHeartVal(nodes_map, 'the-vile-apothecary')
                  .length > 0
              ) {
                Shadow_Imbuement_Chance =
                  1 -
                  (1 - Shadow_Imbuement_Chance) *
                    (1 -
                      malignantHeartVal(
                        nodes_map,
                        'the-vile-apothecary',
                      )[0])
              }
              Shadow_Imbuement_Application_Rate +=
                Pre_Sim_Node['skill_use_rate'][Skill] *
                Pre_Sim_Node['cross_skill_stat'][Skill][
                  'number_enemies_hit'
                ] *
                Shadow_Imbuement_Chance
            }
          }
          // Model for the chance each mob has been affected by shadow imbuement in the past 6 seconds.
          const Shadow_Imbued_Debuff_Chance =
            1 -
            Math.exp(
              (Shadow_Imbuement_Application_Rate /
                number_of_enemies) *
                6,
            )

          const Explosion_Hits =
            1 +
            Math.min(10 ** 2 / enemy_spread ** 2, 1) *
              (number_of_enemies -
                statVal(nodes_map, 'Enemies_Killed'))

          let Shadow_Imbuement_Modifier =
            0.4 *
            (1 +
              0.1 * (talentVal(nodes_map, 'shadow-imbuement') - 1)) *
            // Efficacy: Imbuement Skill effects have x20% increased potency.
            (1 + 0.2 * Number(paragonVal(nodes_map, 'efficacy')))

          // Prime Rain of Arrows: imbuement Skill effects applied by Rain of Arrows have 30% increased potency.
          if (
            talentVal(nodes_map, 'prime-rain-of-arrows') > 0 &&
            'rain-of-arrows' in Pre_Sim_Node['skill_use_rate']
          ) {
            let Rain_Shadow_Imbuement_Chance = statVal(
              nodes_map,
              'Shadow_Imbuement_Uptime',
            )
            if (aspectVal(nodes_map, 'word-of-hakan').length > 0) {
              Rain_Shadow_Imbuement_Chance = 1
            }

            const Rain_Of_Arrows_Application_Rate =
              Pre_Sim_Node['skill_use_rate']['rain-of-arrows'] *
              // TODO replace with Number_Enemies_Hit once its in the presim.
              Pre_Sim_Node['cross_skill_stat']['rain-of-arrows'][
                'number_enemies_hit'
              ] *
              Rain_Shadow_Imbuement_Chance

            const Prime_Rain_Of_Arrows_Debuff_Chance =
              Rain_Of_Arrows_Application_Rate /
              (Shadow_Imbuement_Application_Rate + 0.0001)

            // We get bonus damage if the debuff came from rain of arrows.
            Shadow_Imbuement_Modifier *=
              1 + 0.3 * Prime_Rain_Of_Arrows_Debuff_Chance
          }

          if (
            aspectVal(nodes_map, 'aspect-of-corruption').length > 0 &&
            statVal(nodes_map, 'Enemy_Vulnerable') > 0
          ) {
            Shadow_Imbuement_Modifier *=
              1 +
              aspectVal(nodes_map, 'aspect-of-corruption')[0] *
                statVal(nodes_map, 'Enemy_Vulnerable')
          }

          Non_Skill_Damage_Total +=
            Shadow_Imbuement_Modifier *
            Shadow_Imbued_Debuff_Chance *
            statVal(nodes_map, 'Enemies_Killed') *
            RogueDamageMultiplier(new Set(['shadow']), nodes_map) *
            Explosion_Hits
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
          let AOE_Hits = 0
          if (Dot_Tag.length > 0) {
            AOE_Hits =
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
                'Skill_Lucky_Hit_Chance_Multiplier',
              ) *
              statVal(nodes_map, 'Total_Hits') *
              AOE_Hits *
              RogueDamageMultiplier(new Set(['poison']), nodes_map)
          }

          // Damage from Poison Imbuement Directly.
          let Poison_Imbuement_Chance =
            statVal(nodes_map, 'Poison_Imbuement_Uptime') *
            Number(tagsVal(nodes_map).has('imbueable'))
          if (
            aspectVal(nodes_map, 'word-of-hakan').length > 0 &&
            currentSkillVal(nodes_map)['name'] == 'rain-of-arrows'
          ) {
            Poison_Imbuement_Chance = 1
          }
          if (
            aspectVal(nodes_map, 'pestilent-points').length > 0 &&
            currentSkillVal(nodes_map)['name'] == 'puncture'
          ) {
            Poison_Imbuement_Chance = 1 / 3
          }
          Non_Skill_Damage_Total +=
            0.5 *
            aspectVal(nodes_map, 'xfals-corroded-signet')[0] *
            statVal(
              nodes_map,
              'Poison_Imbuement_Lucky_Hit_Chance_Multiplier',
            ) *
            statVal(nodes_map, 'Total_Hits') *
            AOE_Hits *
            RogueDamageMultiplier(new Set(['poison']), nodes_map) *
            Poison_Imbuement_Chance
        }

        // Vampiric Power infection
        // Hitting enemies with direct damage infects them with Pox. Inflicting Pox 8 times on an enemy expunges their infection, dealing 70% Poison damage.
        if (
          vampiricPowerVal(nodes_map, 'infection') &&
          triggerVal(nodes_map, 'Flat_Damage') > 0
        ) {
          Non_Skill_Damage_Total +=
            (0.7 *
              RogueDamageMultiplier(new Set(['poison']), nodes_map) *
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
            RogueDamageMultiplier(new Set(['physical']), nodes_map) *
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
