/* eslint-disable @typescript-eslint/no-unused-vars */

import { paragon } from 'data'

import {
  BinomialDistribution,
  BinomialProbability,
  CooldownFromRanks,
  ProbabilityInAnnulus,
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
  enchantmentVal,
  malignantHeartVal,
  paragonVal,
  seneschalConstructVal,
  skillVal,
  sorcererPresimVal,
  statVal,
  tagsVal,
  talentVal,
  toggleVal,
  triggerVal,
  vampiricPowerVal,
} from './graph_values'

/*
Here we build the computation graph for the Sorcerer. We construct maps for each type of node which contain all nodes of that
type. For nodes types which have no dependencies, we have functions to manually modify and set the value for that node. For
node types which do depend on other nodes, we pass an `update_value_function` into the constructor which uses the value of
other nodes to compute the value of that node. The value need only be computed a single time once all the root nodes are fixed.
We start with the nodes which have no dependencies.
*/

function SorcererDamageMultiplier(
  tags: Set<string>,
  nodes_map: NodesMap,
) {
  const Pre_Sim_Node = sorcererPresimVal(nodes_map)
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
    Number(tags.has('fire')) *
    aggregationVal(nodes_map, 'fire-damage')

  Generic_Damage_Bucket_Multiplier +=
    Number(tags.has('fire')) *
    Number(tags.has('damage-over-time')) *
    aggregationVal(nodes_map, 'fire-damage-over-time')

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
    Number(tags.has('crackling-energy')) *
    aggregationVal(nodes_map, 'crackling-energy-damage')

  Generic_Damage_Bucket_Multiplier +=
    Number(tags.has('ice-spike')) *
    aggregationVal(nodes_map, 'damage-with-ice-spikes')

  Generic_Damage_Bucket_Multiplier +=
    aggregationVal(nodes_map, 'vulnerable-damage') *
    statVal(nodes_map, 'Enemy_Vulnerable')

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

    // Glyph 'electrocute' Your Lightning damage has a +5% increased chance to Critically Strike enemies who are Stunned, Immobilized, or Frozen.
    if (
      paragonVal(nodes_map, 'electrocute') &&
      tags.has('lightning') &&
      (toggleVal(nodes_map, 'enemy-stunned') ||
        toggleVal(nodes_map, 'enemy-immobilized') ||
        toggleVal(nodes_map, 'enemy-frozen'))
    ) {
      Crit_Chance +=
        0.05 * statVal(nodes_map, 'Enemy_Boss_CC_Adjustment')
    }

    //"Esu's_Ferocity": Your Fire Critical Strike Damage is increased by x25% against enemies above 50% Life.
    // Your Fire Critical Strike Chance is increased by +5% against enemies below 50% Life.
    // Killing an enemy or hitting a boss with a Critical Strike grants both bonuses against all enemies for 3 seconds.
    if (
      tags.has('fire') &&
      talentVal(nodes_map, 'esus-ferocity') > 0
    ) {
      let Crit_Kill_Rate = 0
      let Crit_Rate = 0
      for (const Skill in Pre_Sim_Node['skill_use_rate']) {
        Crit_Kill_Rate +=
          Pre_Sim_Node['skill_use_rate'][Skill] *
          Pre_Sim_Node['cross_skill_stat'][Skill]['enemy_kills'] *
          Pre_Sim_Node['cross_skill_stat'][Skill]['critical_chance']

        Crit_Rate +=
          Pre_Sim_Node['skill_use_rate'][Skill] *
          Pre_Sim_Node['cross_skill_stat'][Skill]['critical_chance']
      }
      if (toggleVal(nodes_map, 'enemy-boss')) {
        Crit_Chance += 0.05 * 0.5 * (1 + Math.min(1, Crit_Rate * 3))
      } else {
        Crit_Chance +=
          0.05 * 0.5 * (1 + Math.min(1, Crit_Kill_Rate * 3))
      }
    }

    // Glyph Stalagmite: Your Ice Spikes gain 10%[+] Critical Strike Chance.
    if (
      paragonVal(nodes_map, 'stalagmite') &&
      tags.has('ice-spike')
    ) {
      Crit_Chance += 0.1
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

  //"Esu's_Ferocity": Your Fire Critical Strike Damage is increased by x25% against enemies above 50% Life.
  // Your Fire Critical Strike Chance is increased by +5% against enemies below 50% Life.Killing an enemy with a Critical Strike grants both bonuses against all enemies for 3 seconds.
  if (tags.has('fire') && talentVal(nodes_map, 'esus-ferocity') > 0) {
    let Crit_Kill_Rate = 0
    let Crit_Rate = 0
    for (const Skill in Pre_Sim_Node['skill_use_rate']) {
      Crit_Kill_Rate +=
        Pre_Sim_Node['skill_use_rate'][Skill] *
        Pre_Sim_Node['cross_skill_stat'][Skill]['enemy_kills'] *
        Pre_Sim_Node['cross_skill_stat'][Skill]['critical_chance']

      Crit_Rate +=
        Pre_Sim_Node['skill_use_rate'][Skill] *
        Pre_Sim_Node['cross_skill_stat'][Skill]['critical_chance']
    }
    if (toggleVal(nodes_map, 'enemy-boss')) {
      Critical_Damage_Multiplier *=
        1 + 0.25 * 0.5 * (1 + Math.min(1, Crit_Rate * 3))
    } else {
      Critical_Damage_Multiplier *=
        1 + 0.25 * 0.5 * (1 + Math.min(1, Crit_Kill_Rate * 3))
    }
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

  //["Icy_Touch", 3]: You deal x{4/8/12/16/20/24/28/32/36/40}% increased Cold Damage to Vulnerable enemies.
  if (
    tags.has('cold') &&
    statVal(nodes_map, 'Enemy_Vulnerable') > 0
  ) {
    Talent_Damage_Multiplier *=
      1 +
      0.04 *
        talentVal(nodes_map, 'icy-touch') *
        statVal(nodes_map, 'Enemy_Vulnerable')
  }

  // "Enhanced_Firewall": Enemies take x25% increased Burning damage from you while standing in Firewall.
  if (
    talentVal(nodes_map, 'enhanced-firewall') > 0 &&
    tags.has('burn') &&
    'firewall' in Pre_Sim_Node['skill_use_rate']
  ) {
    Talent_Damage_Multiplier *=
      1 +
      (0.25 *
        Math.min(
          number_of_enemies,
          statVal(nodes_map, 'Total_Hits'),
        )) /
        number_of_enemies
  }

  // ['mages-firewall', 1], //Enemies continue Burning for 3 seconds after leaving Firewall.
  if (
    currentSkillVal(nodes_map)['name'] == 'firewall' &&
    talentVal(nodes_map, 'mages-firewall') > 0
  ) {
    Talent_Damage_Multiplier *= 1 + 3 / 8
  }

  // Flamefeeder: You deal x10% increased direct damage to Burning enemies.
  if (
    !tags.has('damage-over-time') &&
    paragonVal(nodes_map, 'flamefeeder')
  ) {
    if (toggleVal(nodes_map, 'enemy-burning')) {
      Talent_Damage_Multiplier *= 1.1
    } else {
      Talent_Damage_Multiplier *=
        1 + 0.1 * Math.min(1, Pre_Sim_Node['dot_uptime'])
    }
  }

  // Glyph 'winter' Whenever you Chill an enemy, you deal x3% increased Cold Damage for 10 seconds, up to x15%.
  if (paragonVal(nodes_map, 'winter') && tags.has('cold')) {
    const Chill_Skills = new Set([
      'frost-bolt',
      'frozen-orb',
      'blizzard',
      'deep-freeze',
    ])
    let Chill_Rate = 0
    for (const Skill in Pre_Sim_Node['skill_use_rate']) {
      if (Chill_Skills.has(Skill)) {
        Chill_Rate +=
          Pre_Sim_Node['skill_use_rate'][Skill] *
          Pre_Sim_Node['cross_skill_stat'][Skill]['total_hits'] *
          statVal(nodes_map, 'Enemy_Boss_CC_Adjustment')
      }
    }
    if (Chill_Rate * 10 >= 1) {
      Talent_Damage_Multiplier *= 1.15
    } else {
      Talent_Damage_Multiplier *=
        1 + 0.03 * Math.min(1, Chill_Rate * 10)
    }
  }

  // Legendary Paragon'searing-heat': Your Fire skills have their Critical Strike Chance increased by +10%
  // and their Direct Damage is increased by an amount equal to x10% of the total amount of your Bonus Damage with Fire, up to a maximum of x30%.
  if (
    paragonVal(nodes_map, 'searing-heat') &&
    tags.has('fire') &&
    !tags.has('damage-over-time')
  ) {
    Crit_Chance += 0.1
    const Bonus_With_Fire =
      0.1 * aggregationVal(nodes_map, 'fire-damage') +
      aggregationVal(nodes_map, 'non-physical-damage')
    Generic_Damage_Bucket_Multiplier += Math.min(0.3, Bonus_With_Fire)
  }

  // Burning Instinct: Your Burning damage deals bonus damage equal to x10% of the total amount of your Critical Strike Damage bonus, plus x1% for every 75 Intelligence you have.
  // if (tags.has('burn') && paragonVal(nodes_map, 'burning-instinct')) {
  //   // As per discusison on forums, it only works with Bonus +Crit Damage, not from passive default.
  //   // https://us.forums.blizzard.com/en/d4/t/burning-instinct-it-does-not-work/28494/32
  //   Talent_Damage_Multiplier *=
  //     1 +
  //     (Critical_Damage_Bonus - 0.5) *
  //       (0.4 +
  //         Math.floor(statVal(nodes_map, 'Total_Intelligence') / 20) *
  //           0.05)
  // }

  // Glyph Paragon 'pyromaniac' Every Pyromancy Skill you cast or every second you channel Incinerate increases your Fire Damage by x2% for 6 seconds, up to x10%.
  if (tags.has('fire') && paragonVal(nodes_map, 'pyromaniac')) {
    const Fire_Skills = new Set([
      'fire-bolt',
      'incinerate',
      'fireball',
      'flame-shield',
      'hydra',
      'meteor',
      'firewall',
      'inferno',
    ])
    let Pyromancy_Skill_Cast_Rate = 0
    for (const Other_Skill in Pre_Sim_Node['skill_use_rate']) {
      if (Fire_Skills.has(Other_Skill)) {
        Pyromancy_Skill_Cast_Rate +=
          Pre_Sim_Node['skill_use_rate'][Other_Skill]
      }
    }
    if (Pyromancy_Skill_Cast_Rate * 6 > 1) {
      Talent_Damage_Multiplier *= 1.1
    } else {
      Talent_Damage_Multiplier *=
        1 + 0.02 * Math.min(1, Pyromancy_Skill_Cast_Rate * 6)
    }
  }

  // "Glinting_Fire_Bolt": Fire Bolt increases the Burning damage you deal to the enemy by 25% for 3 seconds.
  if (
    talentVal(nodes_map, 'glinting-fire-bolt') > 0 &&
    'fire-bolt' in Pre_Sim_Node['skill_use_rate'] &&
    tags.has('burn')
  ) {
    const Ratio_Enemies_Hit =
      Pre_Sim_Node['cross_skill_stat']['fire-bolt']['total_hits'] /
      number_of_enemies
    Talent_Damage_Multiplier *=
      1 +
      0.25 *
        Math.min(
          1,
          Pre_Sim_Node['skill_use_rate']['fire-bolt'] *
            3 *
            Ratio_Enemies_Hit,
        )
  }

  // Talent ['endless-pyre', 3], You deal increased Burning damage to enemies for each second they remain Burning, up to x{5/10/15/20/25/30/35/40/45/50}% after 5 seconds.
  if (tags.has('burn') && talentVal(nodes_map, 'endless-pyre') > 0) {
    const Max_Bonus = 0.05 * talentVal(nodes_map, 'endless-pyre')
    Talent_Damage_Multiplier *=
      1 +
      (Pre_Sim_Node['dot_uptime'] >= 0.95 ? Max_Bonus : Max_Bonus / 2)
  }

  // Keystone Talent ["Combustion", 1], Your Burning effects deal x20% increased damage,
  //                                   plus an additional x2% increased damage per unique source of Burning you have applied to the enemy.
  if (talentVal(nodes_map, 'combustion') > 0 && tags.has('burn')) {
    const Burning_Skills = new Set([
      'fire-bolt',
      'meteor',
      'firewall',
      'inferno',
      'incinerate',
      'hydra',
    ])

    let Combustion_Bonus = 0.2
    let Burning_Duration = 0
    for (const Other_Skill in Pre_Sim_Node['skill_use_rate']) {
      if (Burning_Skills.has(Other_Skill)) {
        switch (Other_Skill) {
          case 'fire-bolt':
            Burning_Duration = 8
            break
          case 'meteor':
            Burning_Duration = 3
            break
          case 'firewall':
            Burning_Duration = 4
            if (talentVal(nodes_map, 'mages-firewall') > 0) {
              Burning_Duration += 3
            }
            break
          case 'inferno':
            Burning_Duration = 8
            break
          case 'incinerate':
            Burning_Duration = 1
            break
          case 'hydra':
            Burning_Duration = 0
            if (talentVal(nodes_map, 'summoned-hydra') > 0) {
              Burning_Duration = 5
            }
            break
          default:
            break
        }
        Combustion_Bonus +=
          0.02 *
          Math.min(
            1,
            Pre_Sim_Node['skill_use_rate'][Other_Skill] *
              Burning_Duration,
          )
      }
    }
    Talent_Damage_Multiplier *= 1 + Combustion_Bonus
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

  // Aspect_of_Conflagration: While channeling Incinerate, your Burning damage is increased by x{20/40}%.
  if (
    aspectVal(nodes_map, 'aspect-of-conflagration').length > 0 &&
    'incinerate' in Pre_Sim_Node['skill_use_rate'] &&
    tags.has('burn')
  ) {
    const Incinerate_Cast_Rate =
      Pre_Sim_Node['skill_use_rate']['incinerate'] *
      (0.26 / statVal(nodes_map, 'Total_Attack_Speed'))
    Aspect_Damage_Multiplier *=
      1 +
      aspectVal(nodes_map, 'aspect-of-conflagration')[0] *
        Math.min(1, Incinerate_Cast_Rate)
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
  if (tags.has('skill') || tags.has('crackling-energy')) {
    Attribute_Damage_Multiplier = statVal(
      nodes_map,
      'Attribute_Damage_Multiplier',
    )
  }

  // Ceaseless Conduit: Crackling Energy has a 25% chance to not consume a Charge when triggered. Crackling Energy's damage is increased by x3% per 20 total Intelligence you have.
  if (
    paragonVal(nodes_map, 'ceaseless-conduit') &&
    tags.has('crackling-energy')
  ) {
    Talent_Damage_Multiplier *=
      1 + (0.03 * statVal(nodes_map, 'Total_Intelligence')) / 20
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

const SorcererParagonNames: string[] = [
  // Glyph Bonuses
  'enchanter', // For each Skill equipped in your Enchantment Slots, gain +5% Maximum Resistance to that Skill's element.
  'unleash', // After spending 50 Mana, you deal x6.7% increased damage and gain 6.7% increased Mana Regeneration for 3 seconds.
  'elementalist', // Dealing Fire, Cold, or Lightning Damage to an enemy increases all damage you deal to them by x5% for 10 seconds, stacking once per element.
  'adept', // Mastery Skills have 20% increased area.
  'conjurer', // Conjuration Skills have 20% increased duration.
  'charged', // Picking up Crackling Energy grants you x5% increased damage for 5 seconds, up to x15%.
  'torch', // You deal x2.5% increased damage per Nearby Burning enemy, up to x12.5%.
  'pyromaniac', // Every Pyromancy Skill you cast or every second you channel Incinerate increases your Fire Damage by x2% for 6 seconds, up to x10%.
  'frostbite', // Enemies deal 13% reduced damage to you for 5 seconds after they are no longer Frozen.
  'tactician', // You deal x10% increased damage for 4 seconds after casting a Defensive Skill.
  'imbiber', // You gain +30% increased Potion Healing.
  'reinforced', // You gain 15% Damage Reduction while you have an active Barrier.
  'territorial', // You gain 15% Damage Reduction against Close enemies.
  'flamefeeder', // You deal x10% increased direct damage to Burning enemies.
  'winter', // Whenever you Chill an enemy, you deal x3% increased Cold Damage for 10 seconds, up to x15%.
  'electrocute', // Your Lightning damage has a +5% increased chance to Critically Strike enemies who are Stunned, Immobilized, or Frozen.
  'destruction', // Critical Strikes increase all damage the enemy takes from you by x2% for 10 seconds, up to x12%.
  'control', // You deal x10% increased damage to Slowed or Chilled enemies or, instead, x20% increased damage to Stunned or Frozen enemies.
  'warding', // You take reduced damage the less Mana you have, up to 25%.
  'exploit', // Dealing damage to a Vulnerable enemy increases your damage by x1% for 6 seconds, up to x10%.
  'stalagmite', // Your Ice Spikes gain 10%[+] Critical Strike Chance.
  'invocation', // Enemies damaged by your Conjuration Skills deal 1% reduced damage to you for 6 seconds, stacking up to 12%.

  // Legendary Paragon
  'searing-heat', // Your Fire skills have their Critical Strike Chance increased by +10% and their Direct Damage is increased by an amount equal to x10% of the total amount of your Bonus Damage with Fire, up to a maximum of x30%.
  'frigid-fate', // You deal bonus damage to Vulnerable enemies equal to x10% of the total amount of your Bonus Damage with Cold, up to a maximum of x30%.
  'static-surge', // After spending 100 Mana, your next cast of Chain Lightning or Charged Bolts makes enemies Vulnerable for 2 seconds and grants you 10% of your maximum Mana. This Mana cost requirement is reduced by Mana Cost Reduction bonuses.
  'elemental-summoner', // Your Conjuration Skills have 10% reduced Cooldown or Mana cost. They also deal bonus Damage equal to x3% of the total amount of your Bonus Damage with Cold, Fire, and Lightning.
  // They also deal bonus damage equal to 3%[x] of the total amount of your Bonus Damage with Fire, Lightning, and Cold.
  'burning-instinct', // Your Burning damage deals bonus damage equal to x10% of the total amount of your Critical Strike Damage bonus, plus x1% for every 75 Intelligence you have.
  'icefall', // Your Frost skills deal x15% bonus Critical Strike Damage to Vulnerable enemies. This bonus is doubled against Frozen enemies who are Vulnerable.
  'ceaseless-conduit', // Crackling Energy has a 25% chance to not consume a Charge when triggered. Crackling Energy's damage is increased by x2% per 20 total Intelligence you have.
  'enchantment-master', // Your Enchantments are 20% stronger.
]

export function CreateSorcererParagonNodes(): Record<
  string,
  ParagonNode
> {
  const nodes: Record<string, ParagonNode> = {}
  for (const key of SorcererParagonNames) {
    nodes[key] = new ParagonNode(key, 'boolean')
  }
  return nodes
}

/* --------------------------------------------------------------------------
                      MALIGNANT HEARTS
----------------------------------------------------------------------------*/
export function CreateSorcererMalignantHeartNodes(): Record<
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
    // (Sorcerer) omnipower: Core Skills that launch a projectile consume all of your Mana. For every [35 - 45] extra Mana consumed, you launch an additional projectile, and the damage is increased by [.05 - .07]%.
    omnipower: new MalignantHeartNode('omnipower', 2),
    // (Sorcerer) spellbreaking:	After taking Elemental damage, gain [25 - 45]% Resistance to that element for {6/7/8..} seconds.
    spellbreaking: new MalignantHeartNode('spellbreaking', 2),
    // (Sorcerer) spite:	When you are afflicted with a Crowd Control effect, there is a [20 - 40]% chance that the same enemy and enemies around you are also afflicted with the same effect for {2/2.5/3/3.5..} seconds.
    spite: new MalignantHeartNode('spite', 2),
    // (Sorcerer) talrasha:	For each unique element you deal damage with, you deal [.07 - .12]% increased damage for {8/9/10...} seconds.
    talrasha: new MalignantHeartNode('talrasha', 2),
  }
}

/* ------------------------------------------------------------------------------------------------------------------------------- */

const SorcererTalentsToMaxValue: [string, number][] = [
  ['frost-bolt', 5], //Throw a bolt of frost at an enemy, dealing {38%% damage and Chilling them for 15%.
  ['enhanced-frost-bolt', 1], //`Frost Bolt has a 15% chance to explode on Chilled enemies, hitting surrounding enemies. Chance increased to 100% against Frozen enemies.
  ['flickering-frost-bolt', 1], //Frost Bolt makes Frozen enemies Vulnerable for 3 seconds.
  ['glinting-frost-bolt', 1], //Frost Bolt generates 4 Mana when hitting Chilled or Frozen enemies
  ['spark', 5], //Launch a bolt of lightning that shocks an enemy 4 times, dealing {8/8.8/9.6/10.4/11.2/12/12.8/13.6/14.4/15.2}% damage each hit.
  ['enhanced-spark', 1], //Each time Spark hits its primary target, it has a 20% chance to hit up to 3 additional enemies, dealing 7% damage. If there are no other enemies to hit, Spark instead deals x20% increased damage to its primary target.
  ['flickering-spark', 1], //Each time Spark hits an enemy it has a 4% chance to form a Crackling Energy.
  ['glinting-spark', 1], //Spark grants +2% increased Critical Strike Chance per cast for 5 seconds, up to +8%.
  ['arc-lash', 5], //Unleash arcing lightning that deals {42/46.2/50.4/54.6/58.8/63/67.2/71.4/75.6/79.8}% damage to enemies in front of you. Every 10 times Arc Lash swipes, it Stuns all enemies hit for 2 seconds.
  ['enhanced-arc-lash', 1], //If Arc Lash's initial swipe Critically Strikes, it swipes an additional time.
  ['glinting-arc-lash', 1], //Hitting a Stunned enemy with Arc Lash reduces your Cooldowns by 0.15 seconds.
  ['flickering-arc-lash', 1], //`Gain +6% Movement Speed for 5 seconds per enemy hit with Arc Lash, up to +18%.
  ['fire-bolt', 5], //Hurl a flaming bolt, dealing {10}% damage and Burning for {44}% damage over 8 seconds.
  ['enhanced-fire-bolt', 1], //Fire Bolt pierces through Burning enemies.
  ['glinting-fire-bolt', 1], //Fire Bolt increases the Burning damage you deal to the enemy by 25% for 3 seconds.
  ['flickering-fire-bolt', 1], //Fire Bolt generates 2 Mana when hitting an enemy
  ['charged-bolts', 5], //Release 5 bolts of lightning that course along the ground in an erratic pattern, dealing {30%}% damage each.
  ['enhanced-charged-bolts', 1], //Enhanced Charged Bolts  The 3rd time an enemy  is hit by a single cast of Charged  Bolts, that bolt surges upon impact, dealing  its damage  in an area.
  ['greater-charged-bolts', 1], //Charged Bolts deals x25% increased damage to Stunned enemies.
  ['destructive-charged-bolts', 1], // Destructive Charged Bolts Hitting an enemy with Charged Bolts reduces their damage dealt by  25% for 3 seconds.
  ['frozen-orb', 5], //Unleash an orb that Chills for 34% and expels piercing shards, dealing a total of {36}% damage. Upon expiration, Frozen Orb explodes, dealing {34}% damage and Chilling enemies for 8.7%.
  ['enhanced-frozen-orb', 1], //When cast above 40 Mana, Frozen Orb's explosion damage is increased by 30%[x]. Bonus explosion damage is increased to 45%[x] against Elites.
  ['destructive-frozen-orb', 1], //Frozen Orb's explosion restores 5 Mana when hitting a Frozen enemy.
  ['greater-frozen-orb', 1], //Frozen Orb's explosion has a 30% chance to make all enemies hit Vulnerable for 2 seconds. Frozen Orb always makes Frozen enemies Vulnerable.
  ['incinerate', 5], //Channel a beam of fire, Burning enemies for {9.1/10/10.925/11.825/12.75/13.65/14.55/15.475/16.375/17.3}% damage per second. Damage per second increases over 2 seconds, up to {49.1/54/59/63.9/68.9/73.7/78.6/83.6/88.4/93.4}%.
  ['enhanced-incinerate', 1], //While channeling Incinerate, you Burn enemies around you for 15% of the damage per second
  ['destructive-incinerate', 1], //Destructive Incinerate Enemies deal  25% less damage while Burning from Incinerate.
  ['greater-incinerate', 1], //Every 4 seconds an enemy has been hit by Incinerate, they are Immobilized for 1 seconds.
  ['fireball', 5], //Hurl an exploding ball of fire, dealing {60/66/72/78/84/90/96/102/108/114}% damage to surrounding enemies.
  ['enhanced-fireball', 1], //Casting Fireball increases its radius by 50%.
  ['greater-fireball', 1], //Fireball deals 10% of the Burning damage you've applied to enemies as additional direct damage.
  ['destructive-fireball', 1], //Fireball’s Critical Strike Damage is increased by 20%. This bonus is increased to 30% if Fireball hits at least 3 enemies.
  ['chain-lightning', 5], //Unleash a stream of lightning that deals {42/46.2/50.4/54.6/58.8/63/67.2/71.4/75.6/79.8}% damage and chains between Nearby enemies and you up to 6 times, prioritizing enemies.
  ['enhanced-chain-lightning', 1], //Chain Lightning gains a +3% increased Critical Strike Chance per bounce.
  ['greater-chain-lightning', 1], //Each time Chain Lightning bounces, it deals 5% increased damage for its duration.
  ['destructive-chain-lightning', 1], //`When Chain Lightning Critically Strikes, it has a 25% chance to form a Crackling Energy.
  ['ice-shards', 5], //Launch 5 shards that deal {25/27.5/30/32.5/35/37.5/40/42.5/45/47.5}% damage each. Deals x25% increased damage to Frozen enemies.
  ['enhanced-ice-shards', 1], //Ice Shards have a 15% chance to ricochet to another enemy. Ice Shards always ricochet off of Frozen enemies.
  ['greater-ice-shards', 1], //While you have a Barrier active, casts of Ice Shards treat enemies as if they were Frozen.
  ['destructive-ice-shards', 1], //Hitting an enemy with 5 Ice Shards in a single cast makes them Vulnerable for 2 seconds.
  ['devastation', 3], //Your Maximum Mana is increased by {3/6/9/12/15/18/21/24/27/30}.
  ['elemental-dominance', 3], //Your Core Skills deal x{4/8/12/16/20/24/28/32/36/40}% increased damage when cast above 50 Mana.
  ['potent-warding', 3], //After casting a Non-Basic Skill, you gain +3/6/9% Resistance to All Elements and +1/2/3% Maximum Resistance to that Skill's element for 9 seconds.
  ['flame-shield', 5], //Engulf yourself in flames for {2/2.2/2.4/2.6/2.8/3/3.2/3.4/3.6/3.8} seconds, Burning surrounding enemies for {23.4/25.7/28.1/30.4/32.8/35.1/37.4/39.8/42.1/44.5}% damage per second.
  ['enhanced-flame-shield', 1], //Flame Shield grants +25% Movement Speed while active.
  ['mystical-flame-shield', 1], //You gain 25% Mana Cost Reduction while Flame Shield is active.
  ['shimmering-flame-shield', 1], //Flame Shield Heals you for 50% of your missing Life.
  ['frost-nova', 5], //Unleash a torrent of frost, Freezing enemies around you for 2 seconds.
  ['enhanced-frost-nova', 1], //Killing enemies Frozen by Frost Nova reduces its Cooldown by 2 seconds, up to 6 seconds per cast.
  ['mystical-frost-nova', 1], //Frost Nova makes enemies Vulnerable for 4 seconds, increased to 8 seconds against Bosses
  ['shimmering-frost-nova', 1], //Frost Nova generates 4 Mana per enemy hit
  ['ice-armor', 5], //A Barrier of ice forms around you for 6 seconds, absorbing 30% of your Base Life in damage. While Ice Armor is active, 5% of your damage dealt is added to its Barrier
  ['enhanced-ice-armor', 1], //While Ice Armor is active, your Mana Regeneration is increased by x25%
  ['shimmering-ice-armor', 1], //Enemies that hit you while Ice Armor is active have a 15% chance to become Frozen for 3 seconds
  ['mystical-ice-armor', 1], //Damage against Vulnerable enemies contributes 50% more to Ice Armor's Barrier.
  ['teleport', 5], //Transform into lightning, becoming Unstoppable and surging to the target location, dealing {25/27.5/30/32.5/35/37.5/40/42.5/45/47.5}% damage around you upon arrival
  ['enhanced-teleport', 1], //Teleport's Cooldown is decreased by 0.5 seconds per enemy hit, up to 3 seconds
  ['mystical-teleport', 1], // For 4 seconds after Teleporting, Crackling Energy hits 2 additional enemies.
  ['shimmering-teleport', 1], //After Teleporting, you gain 30% Damage Reduction for 3 seconds
  ['elemental-attunement', 3], //Lucky Hit: Critical Strikes up to a {5/10/15/20/25/30/35/40/45/50}% chance to reset the Cooldown of one of your Defensive Skills. Can only happen once every 10 seconds.
  ['glass-cannon', 3], //You deal x{6/12/18/24/30/36/42/48/54/60}% increased damage, but take x{3/6/9/12/15/18/21/24/27/30}% more damage.
  ['hydra', 5], //Summon a 3-headed hydra for 12 seconds. Each head spits fire at enemies, dealing {30/33/36/39/42/45/48/51/54/57}% damage
  ['enhanced-hydra', 1], //While Healthy, your casts of Hydra gain 1 additional head.
  ['invoked-hydra', 1], //After you Critically Strike, your Hydras gain +30% Critical Strike Chance for 3 seconds.
  ['summoned-hydra', 1], //Hydra also Burns enemies for an additional 60% of its Base damage dealt over 6 seconds.
  ['ice-blades', 5], //Conjure a pair of ice blades for 6 seconds that rapidly slash enemies for {30.7/33.7/36.8/39.9/42.9/46/49.1/52.1/55.2/58.3}% damage and have a 30% chance to make them Vulnerable for 2 seconds.
  ['enhanced-ice-blades', 1], //Ice Blades's Cooldown is reduced by .5 second each time it hits a Vulnerable enemy.
  ['summoned-ice-blades', 1], // 20% of Enhanced Ice Blades's Cooldown reduction is applied to your other Skills.
  ['invoked-ice-blades', 1], // Your Ice Blades gain +10% increased Attack Speed per active Ice Blades.
  ['lightning-spear', 5], //Conjure a spear of lightning that seeks out enemies for 6 seconds, dealing {15/16.5/18/19.5/21/22.5/24/25.5/27/28.5}% damage per hit.
  ['enhanced-lightning-spear', 1], //After Critically Striking, Lightning Spear gains a +5% increased stacking Critical Strike Chance for its duration.
  ['summoned-lightning-spear', 1], //Collecting Crackling Energy increases the damage of your next Lightning Spear cast by x20%, up to x160%.
  ['invoked-lightning-spear', 1], //Lightning Spear Stuns enemies for 2 seconds when Critically Striking.
  ['conjuration-mastery', 3], //You deal x{1/2/3/4/5/6/7/8/9/10}% increased damage for each active Conjuration.
  ['precision-magic', 3], //Your Lucky Hit Chance is increased by +{5/10/15/20/25/30/35/40/45/50}%.
  ['align-the-elements', 3], // You gain 3% Damage Reduction against Elites for each second you haven't taken damage from one and persists for 2 seconds after taking damage, up to 40%.
  ['mana-shield', 3], //Every time you spend 100 Mana, you gain {7}% Damage Reduction for 5 seconds.
  ['protection', 3], //Using a Cooldown grants {10/20/30/40/50/60/70/80/90/100}% of your Maximum Life as a Barrier for 3 seconds.
  ['meteor', 5], //Summon a meteor that strikes the target location, dealing {50/55/60/65/70/75/80/85/90/95}% damage and Burning the ground for {35/38.5/42/45.5/49/52.5/56/59.5/63/66.5}% damage over 3 seconds.
  ['enhanced-meteor', 1], //If a cast of Meteor hits 3 or more enemies, there is a 30% chance an additional Meteor falls on the same location.
  ['mages-meteor', 1], //Meteor falls 30% faster.
  ['wizards-meteor', 1], //Meteor's impact Immobilizes enemies for 2 seconds.
  ['blizzard', 5], //Summon a frigid blizzard that deals {130}% damage and continually Chills enemies for 18% over 8 seconds
  ['enhanced-blizzard', 1], //Blizzard deals x25% increased damage to Frozen enemies.
  ['mages-blizzard', 1], //Blizzard's duration is increased by 4 seconds.
  ['wizards-blizzard', 1], //Wizard's Blizzard While you have an active Blizzard, your Core Skills cost  20% less Mana.
  ['ball-lightning', 5], //Discharge a ball of lightning that slowly moves forward, continually zapping enemies for {18/19.8/21.6/23.4/25.2/27/28.8/30.6/32.4/34.2}% damage
  ['enhanced-ball-lightning', 1], //Ball lIghtning rate increased by your Attack Speed Bonus, up to 25%.
  ['wizards-ball-lightning', 1], // If an enemy is hit at least 4 times by a cast of Ball Lightning, a Crackling Energy is formed. Can generate up to 2 per cast.
  ['mages-ball-lightning', 1], //After hitting Close enemies 50 times with Ball Lightning, your next cast of it Stuns enemies hit for 1 seconds.
  ['inner-flames', 3], //Your Pyromancy Skills deal x{3/6/9/12/15/18/21/24/27/30}% increased damage while you are Healthy.
  ['crippling-flames', 3], //Lucky Hit: Your Pyromancy Skills have a {5/10/15/20/25/30/35/40/45/50}% chance to Immobilize enemies for 2 seconds. This chance is doubled while you are Healthy.
  ['devouring-blaze', 3], //You deal x{7}% increased Critical Strike Damage against Burning enemies. If they are also Immobilized, this bonus is increased to x{10}%.
  ['static-discharge', 3], //Lucky Hit: Critical Strikes with Shock Skills have up to a {5/10/15/20/25/30/35/40/45/50}% chance to form a Crackling Energy.
  ['invigorating-conduit', 3], //Upon absorbing Crackling Energy, you gain {4/8/12/16/20/24/28/32/36/40} Mana.
  ['shocking-impact', 3], //Every time you Stun an enemy, you deal {15/30/45/60/75/90/105/120/135/150}% Lightning damage to them.
  ['icy-veil', 3], //Your Barriers have a +{5/10/15/20/25/30/35/40/45/50}% increased duration.
  ['snap-freeze', 3], //Lucky Hit: Frost Skills have a {3/6/9/12/15/18/21/24/27/30}% chance to instantly Freeze.
  ['cold-front', 3], //While you have a Barrier active, you apply x{8/16/24/32/40/48/56/64/72/80}% more Chill.
  ['firewall', 5], //Create a wall of flames that Burns enemies for {160/176/192/208/224/240/256/272/288/304}% damage over 8 seconds.
  ['enhanced-firewall', 1], //Enemies take x25% increased Burning damage from you while standing in Firewall.
  ['wizards-firewall', 1], //Wizard's Firewall You gain 5%[x] increased Mana Regeneration per active Firewall, up to  35%[x].
  ['mages-firewall', 1], //Enemies continue Burning for 3 seconds after leaving Firewall.
  ['inferno', 5], //Summon a fiery serpent that continually constricts the target area, Burning enemies for 295% damage over 8 seconds.
  ['prime-inferno', 1], //Inferno repeatedly Pulls enemies to its center.
  ['supreme-inferno', 1], //While Inferno is active, your Pyromancy Skills cost no Mana.
  ['unstable-currents', 5], //Lightning surges within you for 10 seconds. Whenever you cast a Shock Skill, a random Core, Conjuration, or Mastery Shock Skill is also cast.
  ['prime-unstable-currents', 1], //Unstable Currents increases your Attack Speed by +25% while active
  ['supreme-unstable-currents', 1], // While Unstable Currents is active, Crackling Energy continually pulses 25% faster and consumes no charges.
  ['deep-freeze', 5], //Encase yourself in ice, becoming Immune for 4 seconds, continually dealing 12.5% damage, and Chilling enemies for 20%. When Deep Freeze expires, it deals an additional 100% damage.
  ['prime-deep-freeze', 1], //When Deep Freeze ends, gain 10% of your Base Life as a Barrier for 6 seconds for each enemy you Froze while it was active.
  ['supreme-deep-freeze', 1], // Supreme Deep Freeze When Deep Freeze ends, your Non-Ultimate Cooldowns are reset.
  ['permafrost', 3], //Frost Skills deal x{5/10/15/20/25/30/35/40/45/50}% increased damage to Elites.
  ['hoarfrost', 3], //You deal x{3/6/9/12/15/18/21/24/27/30}% increased damage to Chilled enemies, and x{6/12/18/24/30/36/42/48/54/60}% increased damage to Frozen enemies.
  ['frigid-breeze', 3], //Lucky Hit: Cold Damage against Vulnerable enemies has a 20% chance to generate {5/10/15/20/25/30/35/40/45/50} Mana.
  ['icy-touch', 3], //You deal x{4/8/12/16/20/24/28/32/36/40}% increased Cold Damage to Vulnerable enemies.
  ['coursing-currents', 3], //Hitting enemies with Shock Skills increases your Critical Strike Chance by +{1/2/3/4/5/6/7/8/9/10}%. Resets upon getting a Critical Strike.
  ['electrocution', 3], //Enemies deal {5/10/15/20/25/30/35/40/45/50}% less damage for 5 seconds after being Critically Struck by your Shock Skills.
  ['convulsions', 3], //Lucky Hit: Shock Skills have a {3/6/9/12/15/18/21/24/27/30}% chance to Stun enemies for 3 seconds.
  ['conduction', 3], //Critical Strikes with Shock Skills increase your Movement Speed by +{3/6/9/12/15/18/21/24/27/30}%
  ['fiery-surge', 3], // Killing a Burning enemy increases your Mana Regeneration by +{15}% for 3 seconds.
  ['endless-pyre', 3], //You deal increased Burning damage to enemies for each second they remain Burning, up to x{5/10/15/20/25/30/35/40/45/50}% after 5 seconds.
  ['warmth', 3], // Every 1 second, you Heal for {0.3/0.6/0.9/1.2/1.5/1.8/2.1/2.4/2.7/3}% of your Maximum Life for each Nearby Burning enemy. Healing increased to {0.6/1.2/1.8/2.4/3/3.6/4.2/4.8/5.4/6}% from Bosses.
  ['soulfire', 3], // After standing still for 1.5 seconds, your Pyromancy Skills cost {5/10/15/20/25/30/35/40/45/50}% less Mana.
  ['shatter', 1], // After Freeze expires, enemies explode for 25% of the damage you dealt to them while Frozen.
  ['avalanche', 1], // Lucky Hit: Your Frost Skills have up to a 10% chance to make your next cast of Ice Shards, Frozen Orb, or Blizzard consume no Mana and deal x40% increased damage. Chance is doubled against Vulnerable enemies.
  ['combustion', 1], // Your Burning effects deal x{2/4/6/8/10/12/14/16/18/20}% increased damage per unique source of Burning you have applied to the enemy. If the enemy is Burning from 3 or more sources, this bonus is doubled.
  ['esus-ferocity', 1], // Your Fire Critical Strike Damage is increased by x25% against enemies above 50% Life. Your Fire Critical Strike Chance is increased by +5% against enemies below 50% Life.Killing an enemy or hitting a boss with a Critical Strike grants both bonuses against all enemies for 3 seconds.
  ['overflowing-energy', 1], //Crackling Energy hits 1 additional enemy. Each time Crackling Energy hits an enemy, your Shock Skill Cooldowns are reduced by 0.1 seconds, increased to 0.25 seconds against Elites.
  ['vyrs-mastery', 1], //Close enemies take x15% increased damage from your Shock Skills and deal 20% less damage to you. Critical Strikes increase these bonuses by 25% for 3 seconds.
]

// This creates a map from the talent name above to a talent node with its name. Used to look up
// nodes and add dependencies.
export function CreateSorcererTalentNodes(): Record<
  string,
  TalentNode
> {
  const nodes: Record<string, TalentNode> = {}
  for (const [key, value] of SorcererTalentsToMaxValue) {
    nodes[key] = new TalentNode(key, value)
  }
  return nodes
}

// Map used to identify which talents should be increased for talent modifiers.
export function CreateSorcererTalentModifierMap(): Record<
  string,
  string[]
> {
  return {
    'ranks-of-ball-lightning': ['ball-lightning'],
    'ranks-of-blizzard': ['blizzard'],
    'ranks-of-chain-lightning': ['chain-lightning'],
    'ranks-of-charged-bolts': ['charged-bolts'],
    'ranks-of-fireball': ['fireball'],
    'ranks-of-firewall': ['firewall'],
    'ranks-of-flame-shield': ['flame-shield'],
    'ranks-of-frost-nova': ['frost-nova'],
    'ranks-of-frozen-orb': ['frozen-orb'],
    'ranks-of-hydra': ['hydra'],
    'ranks-of-ice-armor': ['ice-armor'],
    'ranks-of-ice-blades': ['ice-blades'],
    'ranks-of-ice-shards': ['ice-shards'],
    'ranks-of-incinerate': ['incinerate'],
    'ranks-of-lightning-spear': ['lightning-spear'],
    'ranks-of-meteor': ['meteor'],
    'ranks-of-teleport': ['teleport'],
    'ranks-of-the-hoarfrost-passive': ['hoarfrost'],
    'ranks-of-the-conjuration-mastery-passive': [
      'conjuration-mastery',
    ],
    'ranks-of-the-permafrost-passive': ['permafrost'],
    'ranks-of-the-icy-touch-passive': ['icy-touch'],
    'ranks-of-the-glass-cannon-passive': ['glass-cannon'],
    'ranks-of-the-elemental-dominance-passive': [
      'elemental-dominance',
    ],
    'ranks-of-the-inner-flames-passive': ['inner-flames'],
    'ranks-of-the-endless-pyre-passive': ['endless-pyre'],
    'ranks-of-the-devouring-blaze-passive': ['devouring-blaze'],
    'ranks-of-the-shocking-impact-passive': ['shocking-impact'],
    'ranks-of-all-mastery-skills': [
      'blizzard',
      'meteor',
      'firewall',
      'ball-lightning',
    ],
    'ranks-of-all-conjuration-skills': [
      'lightning-spear',
      'ice-blades',
      'hydra',
    ],
    'ranks-of-all-defensive-skills': [
      'flame-shield',
      'teleport',
      'ice-armor',
      'frost-nova',
    ],
    'ranks-of-all-core-skills': [
      'frozen-orb',
      'fireball',
      'ice-shards',
      'chain-lightning',
      'charged-bolts',
      'incinerate',
    ],
  }
}

export function CreateSorcererAspectNodes(): Record<
  string,
  AspectNode
> {
  return {
    /*--------------------------------------------------
                       SORCERER ASPECTS
        --------------------------------------------------*/

    //'Aspect-of-Frozen Memories' The Avalanche Key Passive now applies to 1.0 additional casts.
    'aspect-of-frozen-memories': new AspectNode(
      'aspect-of-frozen-memories',
      0,
    ),

    //Aspect-of-Abundant Energy Crackling Energy has a {30/40}% chance to chain to an additional enemy.
    'aspect-of-abundant-energy': new AspectNode(
      'aspect-of-abundant-energy',
      1,
    ),

    //Shattered Aspect Explosions from the Shatter Key Passive deal x{30/40}% increased damage if enemies die while Frozen.
    'shattered-aspect': new AspectNode('shattered-aspect', 1),

    //Aspect-of-Three-Curses Increase the Critical Strike Damage of Meteor and Fireball by 20%-40%. Double this bonus against Healthy enemies.
    'aspect-of-three-curses': new AspectNode(
      'aspect-of-three-curses',
      1,
    ),

    // Aspect of Piercing Cling: Charged Bolts pierce, but deal 60-40% less damage to targets hit after the first.
    'aspect-of-piercing-cling': new AspectNode(
      'aspect-of-piercing-cling',
      1,
    ),

    //Aspect-of-Frozen Orbit Frozen Orb stays in place after reaching its destination and explodes 2.0 additional times for {20/30}%-of-its damage.
    'aspect-of-frozen-orbit': new AspectNode(
      'aspect-of-frozen-orbit',
      1,
    ),

    //Serpentine Aspect You may have 1.0 additional Hydra active, but Hydra's duration is increased  by {14/24}%.
    'serpentine-aspect': new AspectNode('serpentine-aspect', 1),

    //Aspect-of-Armageddon An hail-of-Meteorites falls during Inferno, dealing {102.5/125} Fire Damage on impact. Your Meteorites Immobilize enemies for 3 seconds.
    'aspect-of-armageddon': new AspectNode('aspect-of-armageddon', 1),

    //Aspect-of-Conflagration While channeling Incinerate, your Burning damage is increased by x{20/40}%.
    'aspect-of-conflagration': new AspectNode(
      'aspect-of-conflagration',
      1,
    ),

    //Aspect-of-Ancient Flame While both bonuses from the Esu's Ferocity Key Passive are active, your Attack Speed is increased by {40/50}%.
    'aspect-of-ancient-flame': new AspectNode(
      'aspect-of-ancient-flame',
      1,
    ),

    //Aspect-of-Engulfing Flames: You deal 10-30% bonus Burning damage to enemies who are below 50% of their total Life or 80-100% if they are affected by more Damage Over Time than their total Life.
    'aspect-of-engulfing-flames': new AspectNode(
      'aspect-of-engulfing-flames',
      2,
    ),

    //Aspect-of-Shattered Stars Meteorites fall around Meteor, dealing 20-30% of Meteor's Damage on impact. Your Meteorites additionally Burn enemies they hit for {225/300} damage over 6.0 seconds.
    'aspect-of-shattered-stars': new AspectNode(
      'aspect-of-shattered-stars',
      2,
    ),

    //Glacial Aspect When you cast Blizzard it will periodically spawn exploding Ice Spikes that deal {100/150} damage. Your Ice Spikes deal x15% increased damage to Frozen enemies.
    'glacial-aspect': new AspectNode('glacial-aspect', 1),

    //Aspect-of-the Frozen Wake While Ice Armor is active, you leave behind exploding Ice Spikes that deal {100/150} damage. Your Ice Spikes Chill enemies for 10%.
    'aspect-of-the-frozen-wake': new AspectNode(
      'aspect-of-the-frozen-wake',
      1,
    ),

    //Aspect-of-Piercing Cold Ice Shards pierce {4/3} times, dealing {20/25}% less damage per subsequent enemy hit.
    'aspect-of-piercing-cold': new AspectNode(
      'aspect-of-piercing-cold',
      2,
    ),

    //Aspect-of-Biting Cold When you Freeze an enemy there is a {30/40}% chance they become Vulnerable for 3.0 seconds.
    'aspect-of-biting-cold': new AspectNode(
      'aspect-of-biting-cold',
      1,
    ),

    //Storm Swell Aspect You deal x{21/30}% increased damage to Vulnerable enemies while you have a Barrier.
    'storm-swell-aspect': new AspectNode('storm-swell-aspect', 1),

    //Aspect-of-the Frozen Tundra While Deep Freeze is active, exploding Ice Spikes form in the area, dealing {125/175} Cold damage. Your Ice Spikes have a 50% increased explosion radius.
    'aspect-of-the-frozen-tundra': new AspectNode(
      'aspect-of-the-frozen-tundra',
      1,
    ),

    //Aspect-of-Overwhelming Currents Unstable Currents has a {10/20}% chance to cast an additional Shock Skill.
    'aspect-of-overwhelming-currents': new AspectNode(
      'aspect-of-overwhelming-currents',
      1,
    ),

    //Gravitational Aspect Ball Lightning orbits around you and its damage is increased by {15/25}%.
    'gravitational-aspect': new AspectNode('gravitational-aspect', 1),

    //Mage-Lord's Aspect: Increase Vyr’s Mastery Key Passive’s Damage Reduction by [6 - 9]% for each Close enemy, up to [18 - 27]%.
    'mage-lords-aspect': new AspectNode('mage-lords-aspect', 2),

    //Aspect-of-Splintering Energy Lightning Spear has a {41/50}% chance to spawn an additional Lightning Spear when you cast it.
    'aspect-of-splintering-energy': new AspectNode(
      'aspect-of-splintering-energy',
      1,
    ),

    //Aspect-of-the Unbroken Tether Chain Lightning has a {30/40}% chance to chain 4.0 additional times.
    'aspect-of-the-unbroken-tether': new AspectNode(
      'aspect-of-the-unbroken-tether',
      1,
    ),

    //Stable Aspect While Unstable Currents is not active, your Shock Skills have a {7/12}% chance to trigger a free cast from it.
    'stable-aspect': new AspectNode('stable-aspect', 1),

    //Elementalist's Aspect Core or Mastery Skills cast at or above 100.0 Mana gain a +{20/40}% increased Critical Strike Chance.
    'elementalists-aspect': new AspectNode('elementalists-aspect', 1),

    //Aspect-of-Control You deal x{25/35}% more damage to Immobilized, Stunned, or Frozen enemies.
    'aspect-of-control': new AspectNode('aspect-of-control', 1),

    //Aspect-of-Binding Embers Flame Shield lets you move unhindered through enemies. Enemies you move through while Flame Shield is active are Immobilized for {2/3} seconds.
    'aspect-of-binding-embers': new AspectNode(
      'aspect-of-binding-embers',
      1,
    ),

    //Aspect-of-Singed Extremities After Immobilize wears off, enemies are Slowed by {40/60}% for 4.0 seconds.
    'aspect-of-singed-extremities': new AspectNode(
      'aspect-of-singed-extremities',
      1,
    ),

    //Aspect-of-Fortune Your Lucky Hit Chance is increased by +{10/20}% while you have a Barrier active.
    'aspect-of-fortune': new AspectNode('aspect-of-fortune', 1),

    //Snowguard's Aspect While within your own Blizzard and for 3 seconds after leaving it, you take 20-25% less damage.
    'snowguards-aspect': new AspectNode('snowguards-aspect', 1),

    //Frostblitz Aspect Frost Nova gains an additional Charge but the Cooldown per Charge is increased by {30/40}%.
    'frostblitz-aspect': new AspectNode('frostblitz-aspect', 1),

    //Snowveiled Aspect Casting Ice Armor grants 10% bonus Armor and makes you Unstoppable for {3/5} seconds.
    'snowveiled-aspect': new AspectNode('snowveiled-aspect', 1),

    //Encased Aspect While Deep Freeze is active, you restore {20/30}%-of-your Maximum Life and Mana per second.
    'encased-aspect': new AspectNode('encased-aspect', 1),

    //Aspect-of-the Unwavering Taking direct damage has a {5/10}% chance to reset the Cooldown-of-one-of-your Defensive Skills.
    'aspect-of-the-unwavering': new AspectNode(
      'aspect-of-the-unwavering',
      1,
    ),

    // Everliving-Aspect You take {20/25}% less damage from Crowd Controlled or Vulnerable enemies.
    'everliving-aspect': new AspectNode('everliving-aspect', 1),

    // Charged Aspect Collecting Crackling Energy increases your Movement Speed by +{10/15}% for 8.0 seconds.
    'charged-aspect': new AspectNode('charged-aspect', 1),

    // Flamewalker's Aspect Coming in contact with your Firewall grants you +{15/25}% Movement Speed for 6.0 seconds.
    'flamewalkers-aspect': new AspectNode('flamewalkers-aspect', 1),

    // Aspect-of-the Bounding Conduit Gain {25/30}% Movement Speed for 3.0 seconds after Teleporting.
    'aspect-of-the-bounding-conduit': new AspectNode(
      'aspect-of-the-bounding-conduit',
      1,
    ),

    //Incendiary Aspect Lucky Hit: Damage from your Pyromancy skills has up to a 12-17% chance to restore 10 Mana.
    'incendiary-aspect': new AspectNode('incendiary-aspect', 1),

    //Recharging Aspect Each time Chain Lightning bounces, you gain 1.5-3 Mana.
    'recharging-aspect': new AspectNode('recharging-aspect', 1),

    //Prodigy's Aspect Using a Cooldown restores {15/25} Mana.
    'prodigys-aspect': new AspectNode('prodigys-aspect', 1),

    //Aspect-of-Concentration Your Mana Regeneration is increased by x{40/50}% if you have not taken damage in the last 2.0 seconds.
    'aspect-of-concentration': new AspectNode(
      'aspect-of-concentration',
      1,
    ),

    //Aspect-of-Efficiency Casting a Basic Skill reduces the Mana cost-of-your next Core Skill by {15/25}%.
    'aspect-of-efficiency': new AspectNode('aspect-of-efficiency', 1),

    // Searing Wards: After spending 200-100 Mana your next Firewall is free to cast and will destroy incoming Small Missiles.
    'searing-wards': new AspectNode('searing-wards', 1),

    // Battle Caster's Aspect (Sorcerer Offensive Aspect): Lucky Hit: When your Conjuration Skills hit you have up to a 30-40% chance to gain +1 Rank to your Conjuration skills for 12 seconds. This can stack up to 3 times.
    'battle-casters-aspect': new AspectNode(
      'battle-casters-aspect',
      1,
    ),

    // Aspect of Shredding Blades: Ice Blades' chance to apply Vulnerable is increased by 20%[+] and the Vulnerable duration is increased by 4 seconds. You gain 15–25%[x] Vulnerable Damage.
    'aspect-of-shredding-blades': new AspectNode(
      'aspect-of-shredding-blades',
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

    // Shard of Dawn Aspect: After 30 seconds of Night's Grasp, gain Dawn's Haste, increasing your Attack Speed by [25-35]%[+] and Movement Speed by 20% for 12 seconds.
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
    // (Unique) Fists-of-Fate: Your attacks randomly deal 1% to {200/300}% of their normal damage.
    'fists-of-fate': new AspectNode('fists-of-fate', 1),

    // Lucky Hit: Up to a [[10 - 20]|%|] chance to trigger a poison nova that applies [Affix_Flat_Value_1] Poisoning damage over 5 seconds to enemies in the area.
    'andariels-visage': new AspectNode('andariels-visage', 2),

    //Raiment-of-the Infinite After using Teleport, Close enemies are Pulled to you and Stunned for {2/3} seconds, but Teleport's Cooldown is increased by x20.0%.
    'raiment-of-the-infinite': new AspectNode(
      'raiment-of-the-infinite',
      1,
    ),

    // (Unique) Flamescar While Channeling Incinerate, you periodically shoot embers that are attracted to enemies, each dealing {50/100} Fire damage.
    flamescar: new AspectNode('flamescar', 1),

    //Iceheart Brais Enemies that die while Frozen have a {11/20}% chance to unleash a Frost Nova.
    'iceheart-brais': new AspectNode('iceheart-brais', 1),

    // (Unique) Staff-of-Endless Rage Every 3rd cast-of-Fireball launches 2 additional projectiles and deals 20-40%[x] damage.
    'staff-of-endless-rage': new AspectNode(
      'staff-of-endless-rage',
      1,
    ),

    // (Unique) Staff-of-Lam Esen: Your cast of Charged Bolts have a 40-60% chance to be attracted to enemies and last 300% longer.
    'staff-of-lam-esen': new AspectNode('staff-of-lam-esen', 1),

    // (Unique) Esadora's Overflowing Cameo Upon collecting Crackling Energy, there's a 15.0% chance to release a lightning nova, dealing {155/200} Lightning Damage.
    //  The Lightning Nova deals 50%  [x] increased damage for every 100 Intelligence you have.
    'esadoras-overflowing-cameo': new AspectNode(
      'esadoras-overflowing-cameo',
      1,
    ),

    // (Unique) Esu's Heirloom Your Critical Strike Chance is increased by {15/25}%-of-your Movement Speed bonus.
    'esus-heirloom': new AspectNode('esus-heirloom', 1),

    // (Unique) Gloves-of-the Illuminator: Fireball now bounces as it travels, exploding each time it hits the ground, but its explosion deals {35-25}% less damage.
    'gloves-of-the-illuminator': new AspectNode(
      'gloves-of-the-illuminator',
      1,
    ), // Similar to Piercing

    // Lucky Hit: Up to a [[15 - 25]|%|] chance to Freeze enemies for 2 seconds.
    frostburn: new AspectNode('frostburn', 1),

    // Gain [10-20] Damage Reduction. In addition, gain +4 Ranks to all Skills.
    'harlequin-crest': new AspectNode('harlequin-crest', 1),

    // Gain 60 maximum Resource. 75% of incoming damage drains 2 Resource for every 1% of Life you would have lost instead.
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

    // Ahavarion Spear of Lycander: Gain a random Shrine effect for [10 - 20] seconds after killing an Elite enemy. Can only occur once every 30 seconds.
    'ahavarion-spear-of-lycander': new AspectNode(
      'ahavarion-spear-of-lycander',
      1,
    ),

    // The Oculus: Gain the effect of the Teleport Enchantment for free. When you Evade using Teleport Enchantment you are taken to a random location.
    'the-oculus': new AspectNode('the-oculus', 0),

    // Tassets of the Dawning Sky (Generic Unique Pants): When you take damage from a Non-Physical damage type, you gain +6-10% Maximum Resistance to that damage type for 6 seconds. This effect can only apply to one damage type at a time.
    'tassets-of-the-dawning-sky': new AspectNode(
      'tassets-of-the-dawning-sky',
      1,
    ),

    // Blue Rose (Sorcerer Unique Ring): Lucky Hit: Damaging an enemy has up to a 30% chance of forming an exploding Ice Spike, dealing [0.25-0.35 flat value] Cold damage. Triple this chance if the enemy is Frozen.
    'blue-rose': new AspectNode('blue-rose', 1),

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

    // tal-rasha-iridescent-loop: For each type of Elemental damage you deal, gain 10-15%[x] increased damage for 4 seconds. Dealing Elemental damage refreshes all bonuses.
    'tal-rasha-iridescent-loop': new AspectNode(
      'tal-rasha-iridescent-loop',
      1,
    ),

    // Paingorger's Gauntlets: Damaging enemies with a cast Non–Basic Skill marks them for 3 seconds. When a Basic Skill first hits a marked enemy, the Basic Skill's damage is echoed to all marked enemies, dealing 100–200%[x] increased damage.
    'paingorgers-gauntlets': new AspectNode(
      'paingorgers-gauntlets',
      1,
    ),

    // Starfall Coronet: Meteor now has 2 charges and a {11–6} second Charge Cooldown instead of a Mana cost and drops 3 additional meteors around the target. Meteor's Enchantment effect and Enhanced Meteor drop 1 additional meteor.
    'starfall-coronet': new AspectNode('starfall-coronet', 1),
  }
}

export function CreateSorcererToggleNodes(): Record<
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
    'enemy-distant': new ToggleNode('enemy-distant', 'boolean'), // enemy is far awayDodged
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

    /* -------------------------------
              SKILL TOGGLES
     -------------------------------*/

    /* -------------------------------
              TALENT TOGGLES
     -------------------------------*/

    /* -------------------------------
              ASPECT TOGGLES
     -------------------------------*/

    // All toggles will need to be present for all classes
    berserking: new ToggleNode('berserking', 'boolean'),
    'enemy-level-difference': new ToggleNode(
      'enemy-level-difference',
      'number',
    ),
  }
}

// Create BaseStatsNode.
export function CreateSorcererBaseStatsNode(): BaseStatsNode {
  return new BaseStatsNode('Sorcerer', 1)
}

function CopyTags(tags: Set<string>): Set<string> {
  const new_tags = new Set<string>()
  for (const tag of tags) {
    new_tags.add(tag)
  }
  return new_tags
}

export function CreateSorcererTagsNode(
  nodes_map: NodesMap,
): TagsNode {
  return new TagsNode('SorcererTags', () => {
    const skill_tags = currentSkillVal(nodes_map)['tags']
    // Deep Copy the skill tags.
    const total_tags = CopyTags(skill_tags)

    // These are the tags for a skill.
    total_tags.add('skill')

    return total_tags
  })
}

// (TODO) Figure out which tags we actually need.
export function CreateSorcererSkillNodes(): Record<
  string,
  SkillNode
> {
  return {
    // Skill Node : (Skill Name, Category, Tags[], Flat Modifier, DoT Modifier, Cooldown, Resource Build/Spend, Lucky Hit)

    // Basic
    'frost-bolt': new SkillNode(
      'frost-bolt',
      'basic',
      ['basic', 'frost', 'chill', 'damage', 'cold', 'crowd-control'],
      0.38,
      0,
      0,
      0,
      0.4,
    ),
    spark: new SkillNode(
      'spark',
      'basic',
      ['basic', 'shock', 'damage', 'lightning'],
      0.1,
      0,
      0,
      0,
      0.09,
    ),
    'arc-lash': new SkillNode(
      'arc-lash',
      'basic',
      ['basic', 'shock', 'damage', 'lightning', 'crowd-control'],
      0.42,
      0,
      0,
      0,
      0.14,
    ),
    'fire-bolt': new SkillNode(
      'fire-bolt',
      'basic',
      ['basic', 'pyromancy', 'damage', 'fire', 'burn'],
      0.18,
      0.44,
      0,
      0,
      0.35,
    ),

    // Core
    'charged-bolts': new SkillNode(
      'charged-bolts',
      'core',
      ['core', 'shock', 'damage', 'lightning', 'mana'],
      0.3,
      0,
      0,
      -30,
      0.2,
    ),
    'frozen-orb': new SkillNode(
      'frozen-orb',
      'core',
      [
        'core',
        'frost',
        'chill',
        'damage',
        'cold',
        'crowd-control',
        'mana',
      ],
      0.36,
      0,
      0,
      -40,
      0.04,
    ),
    incinerate: new SkillNode(
      'incinerate',
      'core',
      [
        'core',
        'pyromancy',
        'channeled',
        'damage',
        'burn',
        'mana',
        'fire',
        'damage-over-time',
        'fire-damage-over-time',
      ],
      0,
      0.54,
      0,
      -13,
      0.16,
    ),
    fireball: new SkillNode(
      'fireball',
      'core',
      ['core', 'pyromancy', 'damage', 'fire', 'mana'],
      0.6,
      0,
      0,
      -35,
      0.33,
    ),
    'chain-lightning': new SkillNode(
      'chain-lightning',
      'core',
      ['core', 'shock', 'damage', 'lightning', 'mana'],
      0.36,
      0,
      0,
      -35,
      0.25,
    ),
    'ice-shards': new SkillNode(
      'ice-shards',
      'core',
      ['core', 'frozen', 'frost', 'damage', 'cold', 'mana'],
      0.25,
      0,
      0,
      -30,
      0.16,
    ),

    //Defensive
    'flame-shield': new SkillNode(
      'flame-shield',
      'defensive',
      [
        'defensive',
        'pyromancy',
        'immune',
        'damage',
        'burn',
        'cooldown',
      ],
      0,
      0.4,
      20,
      0,
      0.35,
    ),
    //"frost-nova": new SkillNode("frost-nova", "defensive", ["defensive", "frost", "frozen", "crowd-control", "cooldown"], 0, 0, 24, 0, 0),
    //"ice-armor": new SkillNode("ice-armor", "defensive", ["defensive", "frost", "barrier", "cooldown", "damage"], 0, 0, 20, 0, 0),
    teleport: new SkillNode(
      'teleport',
      'defensive',
      [
        'defensive',
        'shock',
        'damage',
        'lightning',
        'cooldown',
        'unstoppable',
      ],
      0.25,
      0,
      11,
      0,
      0.65,
    ),

    //conjuration
    hydra: new SkillNode(
      'hydra',
      'conjuration',
      ['conjuration', 'pyromancy', 'damage', 'fire', 'mana'],
      0.12,
      0,
      0,
      -20,
      0.025,
    ),
    'ice-blades': new SkillNode(
      'ice-blades',
      'conjuration',
      [
        'conjuration',
        'frost',
        'vulnerable',
        'damage',
        'cold',
        'cooldown',
      ],
      0.23,
      0,
      16,
      0,
      0.05,
    ),
    'lightning-spear': new SkillNode(
      'lightning-spear',
      'conjuration',
      ['conjuration', 'shock', 'damage', 'lightning', 'cooldown'],
      0.15,
      0,
      20,
      0,
      0.05,
    ),

    // mastery
    meteor: new SkillNode(
      'meteor',
      'mastery',
      ['mastery', 'pyromancy', 'damage', 'fire', 'mana', 'burn'],
      0.8,
      0.35,
      0,
      -40,
      0.4,
    ),
    blizzard: new SkillNode(
      'blizzard',
      'mastery',
      [
        'mastery',
        'frost',
        'chill',
        'damage',
        'cold',
        'damage-over-time',
      ],
      0,
      1.3,
      0,
      -40,
      0.33,
    ),
    'ball-lightning': new SkillNode(
      'ball-lightning',
      'mastery',
      ['mastery', 'shock', 'damage', 'lightning', 'mana'],
      0.18,
      0,
      0,
      -50,
      0.05,
    ),
    firewall: new SkillNode(
      'firewall',
      'mastery',
      [
        'mastery',
        'pyromancy',
        'damage',
        'burn',
        'mana',
        'fire',
        'damage-over-time',
        'fire-damage-over-time',
      ],
      0,
      1.6,
      0,
      -30,
      0.3,
    ),

    // ultimate
    inferno: new SkillNode(
      'inferno',
      'ultimate',
      [
        'ultimate',
        'pyromancy',
        'damage',
        'burn',
        'cooldown',
        'fire',
        'fire-damage-over-time',
        'damage-over-time',
      ],
      0,
      2.95,
      45,
      0,
      0.1,
    ),
    // Even though unstable currents doesn't directly do damage. We keep it in here
    // and add in the damage afterwards by averaging in the casts of all the skills it
    // will trigger.
    'unstable-currents': new SkillNode(
      'unstable-currents',
      'ultimate',
      ['ultimate', 'shock', 'damage', 'lightning', 'cooldown'],
      0,
      0,
      70,
      0,
      0,
    ),
    'deep-freeze': new SkillNode(
      'deep-freeze',
      'ultimate',
      [
        'ultimate',
        'frost',
        'immune',
        'chill',
        'damage',
        'cold',
        'cooldown',
        'crowd-control',
        'damage-reduction',
      ],
      0.25,
      0,
      60,
      0,
      0.02,
    ),
  }
}

/*
These are the nodes that are computed at run time. They all start with value = null and should
depend on each other and the above nodes. Dependencies are added in after all nodes are defined.
*/

export function CreateSorcererStatsNodes(
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

        return Generic_Damage_Bonus
      },
    ),

    Attribute_Damage_Multiplier: new StatsNode(
      'Attribute_Damage_Multiplier',
      () => {
        // Total_Intelligence
        const Attribute_Damage_Multiplier =
          1 + statVal(nodes_map, 'Total_Intelligence') * 0.001

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
        case 'conjuration':
          Skill_Damage_Bonus += aggregationVal(
            nodes_map,
            'conjuration-skill-damage',
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

      if (currentSkillVal(nodes_map)['tags'].has('frost')) {
        Skill_Damage_Bonus += aggregationVal(
          nodes_map,
          'frost-skill-damage',
        )
      }

      // 'mastery-skill-damage'
      if (currentSkillVal(nodes_map)['tags'].has('mastery')) {
        Skill_Damage_Bonus += aggregationVal(
          nodes_map,
          'mastery-skill-damage',
        )
      }

      if (currentSkillVal(nodes_map)['tags'].has('pyromancy')) {
        Skill_Damage_Bonus += aggregationVal(
          nodes_map,
          'pyromancy-skill-damage',
        )
      }

      if (currentSkillVal(nodes_map)['tags'].has('shock')) {
        Skill_Damage_Bonus += aggregationVal(
          nodes_map,
          'shock-skill-damage',
        )
      }

      return Skill_Damage_Bonus
    }),

    Generic_Critical_Chance: new StatsNode(
      'Generic_Critical_Chance',
      () => {
        const Pre_Sim_Node = sorcererPresimVal(nodes_map)
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

        // Glinting Spark: Spark grants +2% increased Critical Strike Chance per cast for 3 seconds, up to +8%.
        if (
          talentVal(nodes_map, 'glinting-spark') > 0 &&
          'spark' in Pre_Sim_Node['skill_use_rate']
        ) {
          const Spark_Rate = Pre_Sim_Node['skill_use_rate']['spark']

          Critical_Chance_Total +=
            0.02 * (Spark_Rate * 3 >= 1 ? 4 : Spark_Rate * 3)
        }

        // (Unique) Esu's Heirloom Your Critical Strike Chance is increased by {15/25}%_of_your Movement Speed bonus.
        if (aspectVal(nodes_map, 'esus-heirloom').length > 0) {
          Critical_Chance_Total += Math.max(
            0,
            aspectVal(nodes_map, 'esus-heirloom')[0] *
              (statVal(nodes_map, 'Total_Movement_Speed') - 1),
          )
        }

        // ["Coursing_Currents", 3]: Hitting enemies with Shock Skills increases your Critical Strike Chance by +{1/2/3/4/5/6/7/8/9/10}%. Resets upon getting a Critical Strike.
        // TODO: Take another look.
        if (currentSkillVal(nodes_map)['tags'].has('shock')) {
          // Geometric Distribution - Mean Uptime * Crit Bonus
          const Coursing_Currents_Crit =
            0.01 * talentVal(nodes_map, 'coursing-currents')
          const Coursing_Currents_Mean =
            (1 - (Critical_Chance_Total + Coursing_Currents_Crit)) /
            (Critical_Chance_Total + Coursing_Currents_Crit)

          Critical_Chance_Total +=
            (Coursing_Currents_Mean - 1) * Coursing_Currents_Crit
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
              (1 + aspectVal(nodes_map, 'smiting-aspect')[0] * 0.65)
        }

        return Generic_Critical_Chance_Multiplier
      },
    ),

    Skill_Critical_Chance: new StatsNode(
      'Skill_Critical_Chance',
      () => {
        const Pre_Sim_Node = sorcererPresimVal(nodes_map)
        const enemy_spread = Number(
          statVal(nodes_map, 'Enemy_Spread'),
        )
        const number_of_enemies = Number(
          toggleVal(nodes_map, 'number-of-enemies'),
        )
        let Critical_Chance_Total = 0

        //Elementalist's Aspect Core or Mastery Skills cast at or above 100.0 Mana gain a +{20/40}% increased Critical Strike Chance.
        if (
          aspectVal(nodes_map, 'elementalists-aspect').length > 0 &&
          (tagsVal(nodes_map).has('core') ||
            tagsVal(nodes_map).has('mastery'))
        ) {
          Critical_Chance_Total += aspectVal(
            nodes_map,
            'elementalists-aspect',
          )[0]
        }

        // "Chain_Lightning": Unleash a stream of lightning that deals {42/46.2/50.4/54.6/58.8/63/67.2/71.4/75.6/79.8}% damage and chains between Nearby enemies and you up to 5 times, prioritizing enemies.
        let Chain_Lightning_Bounces = 5

        // Aspect_of_the Unbroken Tether Chain Lightning has a {30/40}% chance to chain 4.0 additional times.
        if (
          aspectVal(nodes_map, 'aspect-of-the-unbroken-tether')
            .length > 0
        ) {
          Chain_Lightning_Bounces +=
            4 *
            aspectVal(nodes_map, 'aspect-of-the-unbroken-tether')[0]
        }

        const Chain_Lightning_Bounce_Distance = 15
        //Enhanced Chain Lightning: Chain Lightning gains a +3% increased Critical Strike Chance per bounce.
        if (
          currentSkillVal(nodes_map)['name'] == 'chain-lightning' &&
          talentVal(nodes_map, 'enhanced-chain-lightning') > 0
        ) {
          let p = 0
          let q = 0
          if (!toggleVal(nodes_map, 'enemy-distant')) {
            // Probability of a single enemy being within bounce distance.
            p = Math.min(
              Chain_Lightning_Bounce_Distance ** 2 /
                statVal(nodes_map, 'Enemy_Spread') ** 2,
              1,
            )
            // Prob that another enemy is also within bounce distance.
            q = 1 - (1 - p) ** (number_of_enemies - 1)
            // Average crit of all hits on enemies. If no other enemies are nearby, half the hits are on the player.
            Critical_Chance_Total +=
              (q * 0.03 * (Chain_Lightning_Bounces - 1)) / 2 +
              (1 - q) *
                0.03 *
                Math.ceil((Chain_Lightning_Bounces - 2) / 2)
          } else {
            p = ProbabilityInCircle(
              25,
              Chain_Lightning_Bounce_Distance,
              statVal(nodes_map, 'Enemy_Spread'),
            )
            q = 1 - (1 - p) ** (number_of_enemies - 1)
            // If no other enemies are nearby, there are no bounces.
            Critical_Chance_Total +=
              (q * 0.03 * (Chain_Lightning_Bounces - 1)) / 2
          }
        }

        // Enhanced Lightning Spear: After Critically Striking, Lightning Spear gains a +5% increased stacking Critical Strike Chance for its duration.
        if (
          currentSkillVal(nodes_map)['name'] == 'lightning-spear' &&
          talentVal(nodes_map, 'enhanced-lightning-spear') > 0
        ) {
          const Total_Hits = statVal(nodes_map, 'Total_Hits')

          // Set up Dynamic Programming to find the probability distribution of how many crits occur on the jth hit.
          const DP: number[][] = []
          for (let i = 0; i < Math.floor(Total_Hits) + 1; i++) {
            DP.push([])
            for (let j = 0; j < i + 1; j++) {
              DP[i].push(0)
            }
          }

          // DP[i][j] is the probability of getting j crits by the ith hit.
          DP[0][0] = 1
          for (let i = 1; i < Math.floor(Total_Hits) + 1; i++) {
            for (let j = 0; j < i + 1; j++) {
              if (j == 0) {
                DP[i][0] = DP[i - 1][0] * (1 - Critical_Chance_Total)
              } else if (j == i) {
                DP[i][j] =
                  DP[i - 1][j - 1] *
                  Math.min(Critical_Chance_Total + (j - 1) * 0.05, 1)
              } else {
                DP[i][j] =
                  DP[i - 1][j] *
                    (1 -
                      Math.min(Critical_Chance_Total + j * 0.05, 1)) +
                  DP[i - 1][j - 1] *
                    Math.min(
                      Critical_Chance_Total + (j - 1) * 0.05,
                      1,
                    )
              }
            }
          }

          // We cannot go over 100% crit so if we reach the Cap then we don't increase the weight in the expectation.
          // Taking the average crit rate over all the hits.
          let Lightning_Spear_Crit = 0
          const Cap = Math.min(1 - Critical_Chance_Total, 1) / 0.05
          for (let i = 0; i < Math.floor(Total_Hits) + 1; i++) {
            let Expectation = 0
            for (let j = 0; j < i + 1; j++) {
              Expectation += DP[i][j] * Math.min(j, Cap)
            }
            Lightning_Spear_Crit +=
              (Critical_Chance_Total + Expectation * 0.05) /
              Total_Hits
            if (i == Math.floor(Total_Hits)) {
              Lightning_Spear_Crit +=
                ((Critical_Chance_Total + Expectation * 0.05) /
                  Total_Hits) *
                (Total_Hits - Math.floor(Total_Hits))
            }
          }
          Critical_Chance_Total = Lightning_Spear_Crit
        }

        // Talent ['invoked-hydra', 1], After you Critically Strike, your Hydras gain +30% Critical Strike Chance for 3 seconds.
        if (
          talentVal(nodes_map, 'invoked-hydra') > 0 &&
          currentSkillVal(nodes_map)['name'] == 'hydra'
        ) {
          let Player_Critical_Rate = 0
          const Conjuration_Skills = new Set([
            'ice-blades',
            'hydra',
            'lightning-spear',
          ])
          for (const Other_Skill in Pre_Sim_Node['skill_use_rate']) {
            if (!(Other_Skill in Conjuration_Skills)) {
              Player_Critical_Rate +=
                Pre_Sim_Node['skill_use_rate'][Other_Skill] *
                Pre_Sim_Node['cross_skill_stat'][Other_Skill][
                  'critical_chance'
                ] *
                Pre_Sim_Node['cross_skill_stat'][Other_Skill][
                  'total_hits'
                ]
            }
            Critical_Chance_Total +=
              0.3 * Math.min(1, Player_Critical_Rate * 3)
          }
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
        'incinerate',
        'flame-shield',
        'firewall',
        'unstable-currents',
        'inferno',
      ])
      if (Non_Crit_Skills.has(currentSkillVal(nodes_map)['name'])) {
        return 0
      }
      const Pre_Sim_Node = sorcererPresimVal(nodes_map)

      let Critical_Chance =
        statVal(nodes_map, 'Generic_Critical_Chance') +
        statVal(nodes_map, 'Skill_Critical_Chance')

      if (tagsVal(nodes_map).has('physical')) {
        Critical_Chance += aggregationVal(
          nodes_map,
          'critical-strike-chance-with-physical-damage',
        )
      }

      //"Esu's_Ferocity": Your Fire Critical Strike Damage is increased by x25% against enemies above 50% Life.
      // Your Fire Critical Strike Chance is increased by +5% against enemies below 50% Life.
      // TODO: Killing an enemy with a Critical Strike grants both bonuses against all enemies for 3 seconds.
      if (
        tagsVal(nodes_map).has('fire') &&
        talentVal(nodes_map, 'esus-ferocity') > 0
      ) {
        let Crit_Kill_Rate = 0
        let Crit_Rate = 0
        for (const Skill in Pre_Sim_Node['skill_use_rate']) {
          Crit_Kill_Rate +=
            Pre_Sim_Node['skill_use_rate'][Skill] *
            Pre_Sim_Node['cross_skill_stat'][Skill]['enemy_kills'] *
            Pre_Sim_Node['cross_skill_stat'][Skill]['critical_chance']

          Crit_Rate +=
            Pre_Sim_Node['skill_use_rate'][Skill] *
            Pre_Sim_Node['cross_skill_stat'][Skill]['critical_chance']
        }
        if (toggleVal(nodes_map, 'enemy-boss')) {
          Critical_Chance +=
            0.05 * 0.5 * (1 + Math.min(1, Crit_Rate * 3))
        } else {
          Critical_Chance +=
            0.05 * 0.5 * (1 + Math.min(1, Crit_Kill_Rate * 3))
        }
      }

      Critical_Chance *=
        statVal(nodes_map, 'Generic_Critical_Chance_Multiplier') *
        statVal(nodes_map, 'Skill_Critical_Chance_Multiplier')

      return Critical_Chance
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

        return Critical_Bonus_Total
      },
    ),

    Generic_Critical_Damage_Multiplier: new StatsNode(
      'Generic_Critical_Damage_Multiplier',
      () => {
        const Pre_Sim_Node = sorcererPresimVal(nodes_map)

        let Critical_Multiplier_Total = 1.5

        // ["Devouring_Blaze", 3]: You deal x{7}% increased Critical Strike Damage against Burning enemies. If they are also Immobilized, this bonus is increased to x{10}%.
        if (talentVal(nodes_map, 'devouring-blaze') > 0) {
          let Devouring_Blaze_Bonus = 0
          const Dot_Uptime = Math.max(
            Pre_Sim_Node['dot_uptime'],
            enchantmentVal(nodes_map).has('fire-bolt') ? 1 : 0,
          )

          Devouring_Blaze_Bonus +=
            0.07 *
            talentVal(nodes_map, 'devouring-blaze') *
            Dot_Uptime

          if (toggleVal(nodes_map, 'enemy-immobilized')) {
            Devouring_Blaze_Bonus +=
              0.03 *
              talentVal(nodes_map, 'devouring-blaze') *
              Dot_Uptime
          }
          Critical_Multiplier_Total *= 1 + Devouring_Blaze_Bonus
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
        let Critical_Multiplier_Total = 1

        // Aspect_of_Three_Curses: Increase the Critical Strike Damage of Meteor and Fireball by 20%-40%[x].
        //                        Double this bonus against Healthy enemies.
        if (
          (currentSkillVal(nodes_map)['name'] == 'meteor' ||
            currentSkillVal(nodes_map)['name'] == 'fireball') &&
          aspectVal(nodes_map, 'aspect-of-three-curses').length > 0
        ) {
          Critical_Multiplier_Total +=
            aspectVal(nodes_map, 'aspect-of-three-curses')[0] * 1.2
        }

        // "Destructive_Fireball": Fireball’s Critical Strike Damage is increased by 20%. This bonus is increased to 30% if Fireball hits at least 3 enemies.
        if (
          currentSkillVal(nodes_map)['name'] == 'fireball' &&
          talentVal(nodes_map, 'destructive-fireball') > 0
        ) {
          if (statVal(nodes_map, 'Total_Hits') >= 3) {
            Critical_Multiplier_Total += 0.3
          } else {
            Critical_Multiplier_Total += 0.2
          }
        }

        //'icefall', // Your Frost skills deal x15% bonus Critical Strike Damage to Vulnerable enemies. This bonus is doubled against Frozen enemies who are Vulnerable.
        if (
          tagsVal(nodes_map).has('frost') &&
          paragonVal(nodes_map, 'icefall') &&
          statVal(nodes_map, 'Enemy_Vulnerable') > 0
        ) {
          Critical_Multiplier_Total *=
            1 +
            (0.15 + 0.15 * statVal(nodes_map, 'Enemy_Frozen')) *
              statVal(nodes_map, 'Enemy_Vulnerable')
        }

        return Critical_Multiplier_Total
      },
    ),

    Critical_Multiplier: new StatsNode('Critical_Multiplier', () => {
      const Non_Crit_Skills = new Set([
        'incinerate',
        'flame-shield',
        'firewall',
        'unstable-currents',
        'inferno',
      ])
      if (Non_Crit_Skills.has(currentSkillVal(nodes_map)['name'])) {
        return 1
      }
      const Pre_Sim_Node = sorcererPresimVal(nodes_map)

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

      //"Esu's_Ferocity": Your Fire Critical Strike Damage is increased by x25% against enemies above 50% Life.
      // Your Fire Critical Strike Chance is increased by +5% against enemies below 50% Life.Killing an enemy with a Critical Strike grants both bonuses against all enemies for 3 seconds.
      if (
        tagsVal(nodes_map).has('fire') &&
        talentVal(nodes_map, 'esus-ferocity') > 0
      ) {
        let Crit_Kill_Rate = 0
        let Crit_Rate = 0
        for (const Skill in Pre_Sim_Node['skill_use_rate']) {
          Crit_Kill_Rate +=
            Pre_Sim_Node['skill_use_rate'][Skill] *
            Pre_Sim_Node['cross_skill_stat'][Skill]['enemy_kills'] *
            Pre_Sim_Node['cross_skill_stat'][Skill]['critical_chance']

          Crit_Rate +=
            Pre_Sim_Node['skill_use_rate'][Skill] *
            Pre_Sim_Node['cross_skill_stat'][Skill]['critical_chance']
        }
        if (toggleVal(nodes_map, 'enemy-boss')) {
          Critical_Multiplier *=
            1 + 0.25 * 0.5 * (1 + Math.min(1, Crit_Rate * 3))
        } else {
          Critical_Multiplier *=
            1 + 0.25 * 0.5 * (1 + Math.min(1, Crit_Kill_Rate * 3))
        }
      }

      return Critical_Multiplier
    }),

    Non_Aspect_Attack_Speed_Bonus: new StatsNode(
      'Non_Aspect_Attack_Speed_Bonus',
      () => {
        const Pre_Sim_Node = sorcererPresimVal(nodes_map)
        let Attack_Speed_Bonus_Total = 0

        // attack-speed
        Attack_Speed_Bonus_Total += aggregationVal(
          nodes_map,
          'attack-speed',
        )

        if (currentSkillVal(nodes_map)['name'] == 'fireball') {
          Attack_Speed_Bonus_Total += aggregationVal(
            nodes_map,
            'fireball-attack-speed',
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
            'fire-bolt',
            'arc-lash',
            'spark',
            'frost-bolt',
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
        const Pre_Sim_Node = sorcererPresimVal(nodes_map)
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

        // Talent ['invoked-ice-blades', 1], Your Ice Blades gain +10% increased Attack Speed per active Ice Blades.
        if (
          talentVal(nodes_map, 'invoked-ice-blades') > 0 &&
          'ice-blades' in Pre_Sim_Node['skill_use_rate'] &&
          currentSkillVal(nodes_map)['name'] == 'ice-blades'
        ) {
          let Ice_Blades_Duration = 6
          if (paragonVal(nodes_map, 'conjurer')) {
            Ice_Blades_Duration *= 1.2
          }
          const Ice_Blade_Uptime =
            Pre_Sim_Node['skill_use_rate']['ice-blades'] *
            Ice_Blades_Duration
          Attack_Speed_Bonus_Total += 0.1 * Ice_Blade_Uptime
        }

        // Aspect_of_Ancient Flame: While both bonuses from the Esu's Ferocity Key Passive are active, your Attack Speed is increased by {40/50}%.
        if (
          aspectVal(nodes_map, 'aspect-of-ancient-flame').length >
            0 &&
          talentVal(nodes_map, 'esus-ferocity') > 0
        ) {
          let Crit_Kill_Rate = 0
          let Crit_Rate = 0
          for (const Skill in Pre_Sim_Node['skill_use_rate']) {
            Crit_Kill_Rate +=
              Pre_Sim_Node['skill_use_rate'][Skill] *
              Pre_Sim_Node['cross_skill_stat'][Skill]['enemy_kills'] *
              Pre_Sim_Node['cross_skill_stat'][Skill][
                'critical_chance'
              ]

            Crit_Rate +=
              Pre_Sim_Node['skill_use_rate'][Skill] *
              Pre_Sim_Node['cross_skill_stat'][Skill][
                'critical_chance'
              ]
          }
          if (toggleVal(nodes_map, 'enemy-boss')) {
            Attack_Speed_Bonus_Total +=
              aspectVal(nodes_map, 'aspect-of-ancient-flame')[0] *
              Math.min(1, Crit_Rate * 3)
          } else {
            Attack_Speed_Bonus_Total +=
              aspectVal(nodes_map, 'aspect-of-ancient-flame')[0] *
              Math.min(1, Crit_Kill_Rate * 3)
          }
        }

        // Generic Aspect, Accelerating Aspect: Critical Strikes with Core Skills increase your Attack Speed by +[15 - 25]% for 3.0 seconds.
        if (aspectVal(nodes_map, 'accelerating-aspect').length != 0) {
          let Core_Critical_Rate = 0
          const Core_Skills = new Set([
            'frozen-orb',
            'fireball',
            'ice-shards',
            'chain-lightning',
            'charged-bolts',
            'incinerate',
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

          // Chain Lightning Enchantment Effect: Chain Lightning forms automatically after spending 100 Mana.
          if (enchantmentVal(nodes_map).has('chain-lightning')) {
            let Chain_Lightning_Enchantment_Cost = 100
            if (paragonVal(nodes_map, 'enchantment-master')) {
              Chain_Lightning_Enchantment_Cost = 83
            }

            for (const Skill in Pre_Sim_Node['skill_use_rate']) {
              if (
                Pre_Sim_Node['cross_skill_stat'][Skill][
                  'resource_cost'
                ] < 0
              ) {
                Core_Critical_Rate -=
                  (Pre_Sim_Node['skill_use_rate'][Skill] *
                    Pre_Sim_Node['cross_skill_stat'][Skill][
                      'resource_cost'
                    ]) /
                  Chain_Lightning_Enchantment_Cost
              }
            }
          }

          // Frozen Orb Enchantment Effect: Whenever you cast a Non-Basic Skill, you have a 30% chance to launch a Frozen Orb at a Nearby enemy.
          if (enchantmentVal(nodes_map).has('frozen-orb')) {
            const Basic_Skills = new Set([
              'fire-bolt',
              'arc-lash',
              'spark',
              'frost-bolt',
            ])
            let Frozen_Orb_Enchantment_Chance = 0.3
            if (paragonVal(nodes_map, 'enchantment-master')) {
              Frozen_Orb_Enchantment_Chance *= 1.2
            }
            for (const Skill in Pre_Sim_Node['skill_use_rate']) {
              if (!Basic_Skills.has(Skill)) {
                Core_Critical_Rate +=
                  Pre_Sim_Node['skill_use_rate'][Skill] *
                  Frozen_Orb_Enchantment_Chance
              }
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

      let Overpower_Chance = 0.03 // Base 3% Chance to Overpower a Skill

      const Pre_Sim_Node = sorcererPresimVal(nodes_map)
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

    Overpower_Damage: new StatsNode('Overpower_Damage', () => {
      const Overpower_Damage =
        (Number(toggleVal(nodes_map, 'percent-life')) +
          Number(toggleVal(nodes_map, 'percent-fortify'))) *
        statVal(nodes_map, 'Max_Life') *
        statVal(nodes_map, 'Overpower_Multiplier')
      const Tags_Node = CopyTags(tagsVal(nodes_map))
      Tags_Node.add('overpower')
      const Damage_Multiplier = SorcererDamageMultiplier(
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

    // Aspects can be multiplicative with Damage
    Generic_Aspect_Damage_Multiplier: new StatsNode(
      'Generic_Aspect_Damage_Multiplier',
      () => {
        const Pre_Sim_Node = sorcererPresimVal(nodes_map)
        let Aspect_Damage_Multiplier = 1
        const number_of_enemies = Number(
          toggleVal(nodes_map, 'number-of-enemies'),
        )

        // Storm Swell Aspect You deal x{21/30}% increased damage to Vulnerable enemies while you have a Barrier.
        if (
          aspectVal(nodes_map, 'storm-swell-aspect').length > 0 &&
          Number(toggleVal(nodes_map, 'percent-barrier')) > 0 &&
          statVal(nodes_map, 'Enemy_Vulnerable') > 0
        ) {
          Aspect_Damage_Multiplier *=
            1 +
            aspectVal(nodes_map, 'storm-swell-aspect')[0] *
              statVal(nodes_map, 'Enemy_Vulnerable')
        }

        //Aspect_of_Control You deal x{25/35}% more damage to Immobilized, Stunned, or Frozen enemies.
        if (
          aspectVal(nodes_map, 'aspect-of-control').length > 0 &&
          (toggleVal(nodes_map, 'enemy-immobilized') ||
            toggleVal(nodes_map, 'enemy-stunned') ||
            statVal(nodes_map, 'Enemy_Frozen') > 0)
        ) {
          Aspect_Damage_Multiplier *=
            1 +
            aspectVal(nodes_map, 'aspect-of-control')[0] *
              statVal(nodes_map, 'Enemy_Boss_CC_Adjustment')
        }

        // Aspect of Pummeling: "Deal {}} increased damage to Stunned, knocked Down, and Frozen enemies.",
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

        // aspect-of-Inner-Calm: Deal x{5/10}% increased damage for each second you stand still, up to x30.0%.
        if (
          aspectVal(nodes_map, 'aspect-of-inner-calm').length != 0
        ) {
          Aspect_Damage_Multiplier *= 1.3
        }

        // aspect-of-Retribution: Distant enemies have a 8.0% chance to be Stunned for 2.0 seconds when they hit you. You deal x{10/20}% increased damage to Stunned enemies.
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

          // "Teleport": Transform into lightning, becoming Unstoppable and surging to the target location, dealing {25/27.5/30/32.5/35/37.5/40/42.5/45/47.5}% damage around you upon arrival
          if (allSkillsVal(nodes_map).has('teleport')) {
            Tibaults_Will_Uptime +=
              4 / statVal(nodes_map, 'Teleport_Cooldown')
          }

          // Snowveiled Aspect Casting Ice Armor grants 30% bonus Armor and makes you Unstoppable for {3/5} seconds.
          if (
            allSkillsVal(nodes_map).has('ice-armor') &&
            aspectVal(nodes_map, 'snowveiled-aspect').length != 0
          ) {
            Tibaults_Will_Uptime +=
              (aspectVal(nodes_map, 'snowveiled-aspect')[0] + 4) /
              statVal(nodes_map, 'Ice_Armor_Cooldown')
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

        // tal-rasha-iridescent-loop: For each type of Elemental damage you deal, gain 10-15%[x] increased damage for 4 seconds. Dealing Elemental damage refreshes all bonuses.
        if (
          aspectVal(nodes_map, 'tal-rasha-iridescent-loop').length > 0
        ) {
          let Cold_Bonus = 0
          let Fire_Bonus = 0
          let Lightning_Bonus = 0
          let Poison_Bonus = 0
          const Fire_Skills = new Set([
            'fire-bolt',
            'incinerate',
            'fireball',
            'flame-shield',
            'hydra',
            'meteor',
            'firewall',
            'inferno',
          ])
          const Frost_Skills = new Set([
            'frost-bolt',
            'ice-shards',
            'frozen-orb',
            'blizzard',
            'deep-freeze',
            'ice-blades',
          ])
          const Lightning_Skills = new Set([
            'spark',
            'arc-lash',
            'chain-lightning',
            'charged-bolts',
            'lightning-spear',
            'ball-lightning',
            'teleport',
            'unstable-currents',
          ])
          for (const Skill in Pre_Sim_Node['skill_use_rate']) {
            if (Fire_Skills.has(Skill)) {
              Fire_Bonus += Pre_Sim_Node['skill_use_rate'][Skill] * 4
            }
            if (Frost_Skills.has(Skill)) {
              Cold_Bonus += Pre_Sim_Node['skill_use_rate'][Skill] * 4
            }
            if (Lightning_Skills.has(Skill)) {
              Lightning_Bonus +=
                Pre_Sim_Node['skill_use_rate'][Skill] * 4
            }
          }
          // Fire Bolt enchantment will practically guarantee 100% uptime on Fire Bonus and is commonly used
          if (
            (Cold_Bonus > 0 || Lightning_Bonus > 0) &&
            enchantmentVal(nodes_map).has('fire-bolt')
          ) {
            Fire_Bonus += (Cold_Bonus + Lightning_Bonus) * 4
          }
          if (vampiricPowerVal(nodes_map, 'infection')) {
            Poison_Bonus += 1
          }
          if (Cold_Bonus > 0) {
            Cold_Bonus = Math.min(
              1,
              Cold_Bonus + Fire_Bonus + Lightning_Bonus,
            )
          }
          if (Fire_Bonus > 0) {
            Fire_Bonus = Math.min(
              1,
              Cold_Bonus + Fire_Bonus + Lightning_Bonus,
            )
          }
          if (Lightning_Bonus > 0) {
            Lightning_Bonus = Math.min(
              1,
              Cold_Bonus + Fire_Bonus + Lightning_Bonus,
            )
          }
          Aspect_Damage_Multiplier *=
            1 +
            aspectVal(nodes_map, 'tal-rasha-iridescent-loop')[0] *
              (Cold_Bonus +
                Fire_Bonus +
                Lightning_Bonus +
                Poison_Bonus)
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

        // Vampiric Power feed-the-coven
        // Lucky Hit: Conjuration, Companion, Minion and Bat Familiar attacks have up to a 60% chance to restore 10 Primary Resource to you and increase your Damage by 10% for 4 seconds.
        if (vampiricPowerVal(nodes_map, 'feed-the-coven')) {
          const Conjuration_Skills = new Set([
            'hydra',
            'lightning-spear',
            'ice-blades',
          ])
          let Conjuration_Lucky_Hit_Rate = 0
          for (const Skill in Pre_Sim_Node['skill_use_rate']) {
            if (Conjuration_Skills.has(Skill)) {
              Conjuration_Lucky_Hit_Rate +=
                Pre_Sim_Node['skill_use_rate'][Skill] *
                Pre_Sim_Node['cross_skill_stat'][Skill][
                  'lucky_hit_chance'
                ] *
                Pre_Sim_Node['cross_skill_stat'][Skill]['total_hits']
            }
          }
          const Minion_Lucky_Hit_Chance = 0.3 // completely made up value taken from bat stun chance on another vampiric power
          Aspect_Damage_Multiplier *=
            1 +
            0.1 *
              Math.min(
                1,
                (Conjuration_Lucky_Hit_Rate +
                  statVal(nodes_map, 'Vampiric_Bat_Rate') *
                    Minion_Lucky_Hit_Chance) *
                  4,
              )
        }

        return Aspect_Damage_Multiplier
      },
    ),

    // Aspects can be multiplicative with Damage
    Skill_Aspect_Damage_Multiplier: new StatsNode(
      'Skill_Aspect_Damage_Multiplier',
      () => {
        const Pre_Sim_Node = sorcererPresimVal(nodes_map)
        let Aspect_Damage_Multiplier = 1
        const number_of_enemies = Number(
          toggleVal(nodes_map, 'number-of-enemies'),
        )

        // (Unique) Fists-of-Fate: Your attacks randomly deal 1% to {200/300}% of their normal damage.
        if (aspectVal(nodes_map, 'fists-of-fate').length > 0) {
          Aspect_Damage_Multiplier *=
            aspectVal(nodes_map, 'fists-of-fate')[0] / 2
        }

        // Gravitational Aspect Ball Lightning orbits around you and its damage is increased by {15/25}%.
        if (
          currentSkillVal(nodes_map)['name'] == 'ball-lightning' &&
          aspectVal(nodes_map, 'gravitational-aspect').length > 0
        ) {
          Aspect_Damage_Multiplier *=
            1 + aspectVal(nodes_map, 'gravitational-aspect')[0]
        }

        // Edgemaster's-aspect: Skills deal up to x{10-20}% increased damage based on your available Primary Resource when cast, receiving the maximum benefit while you have full Primary Resource.
        if (aspectVal(nodes_map, 'edgemasters-aspect').length > 0) {
          Aspect_Damage_Multiplier *=
            1 + aspectVal(nodes_map, 'edgemasters-aspect')[0]
        }

        // Aspect of Piercing Cling: Charged Bolts pierce, but deal 60-40% less damage to targets hit after the first.
        if (
          currentSkillVal(nodes_map)['name'] == 'charged-bolts' &&
          aspectVal(nodes_map, 'aspect-of-piercing-cling').length > 0
        ) {
          Aspect_Damage_Multiplier *=
            1 - aspectVal(nodes_map, 'aspect-of-piercing-cling')[0]
        }

        // (Unique) Gloves_of_the Illuminator: Fireball now bounces as it travels, exploding each time it hits the ground, but its explosion deals {35-25}% less damage.
        if (
          currentSkillVal(nodes_map)['name'] == 'fireball' &&
          aspectVal(nodes_map, 'gloves-of-the-illuminator').length > 0
        ) {
          Aspect_Damage_Multiplier *=
            1 - aspectVal(nodes_map, 'gloves-of-the-illuminator')[0]
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
          currentSkillVal(nodes_map)['name'] == 'incinerate' &&
          'incinerate' in Pre_Sim_Node['skill_use_rate']
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
            'fire-bolt',
            'arc-lash',
            'spark',
            'frost-bolt',
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
        const Pre_Sim_Node = sorcererPresimVal(nodes_map)

        // Tears of Blood Glyph
        Talent_Damage_Multiplier *=
          1 + aggregationVal(nodes_map, 'damage-')

        //["Glass_Cannon", 3]: You deal x{6/12/18/24/30/36/42/48/54/60}% increased damage, but take x{3/6/9/12/15/18/21/24/27/30}% more damage.
        if (talentVal(nodes_map, 'glass-cannon') > 0) {
          Talent_Damage_Multiplier *=
            1 + 0.06 * talentVal(nodes_map, 'glass-cannon')
        }

        // ["Hoarfrost", 3]: You deal x{3/6/9/12/15/18/21/24/27/30}% increased damage to Chilled enemies, and x{6/12/18/24/30/36/42/48/54/60}% increased damage to Frozen enemies.
        if (statVal(nodes_map, 'Enemy_Frozen') == 1) {
          Talent_Damage_Multiplier *=
            1 +
            0.06 *
              talentVal(nodes_map, 'hoarfrost') *
              statVal(nodes_map, 'Enemy_Boss_CC_Adjustment')
        } else if (statVal(nodes_map, 'Enemy_Chilled') == 1) {
          Talent_Damage_Multiplier *=
            1 +
            0.03 *
              talentVal(nodes_map, 'hoarfrost') *
              statVal(nodes_map, 'Enemy_Boss_CC_Adjustment')
        }

        // Torch: You deal x2.5% increased damage per Nearby Burning enemy, up to x12.5%.
        if (paragonVal(nodes_map, 'torch')) {
          const number_of_enemies = Number(
            toggleVal(nodes_map, 'number-of-enemies'),
          )

          let Nearby_Enemies =
            1 +
            Math.min(
              10 ** 2 / statVal(nodes_map, 'Enemy_Spread') ** 2,
              1,
            ) *
              (number_of_enemies - 1)

          if (toggleVal(nodes_map, 'enemy-distant')) {
            Nearby_Enemies =
              Math.min(
                10 ** 2 / statVal(nodes_map, 'Enemy_Spread') ** 2,
                1,
              ) *
              (number_of_enemies - 1)
          }

          Talent_Damage_Multiplier *=
            1 +
            0.025 *
              Math.min(Nearby_Enemies * Pre_Sim_Node['dot_uptime'], 5)
        }

        // Tactician: You deal x10% increased damage for 4 seconds after casting a Defensive Skill.
        if (paragonVal(nodes_map, 'tactician')) {
          let Tactician_Uptime = 0
          if (allSkillsVal(nodes_map).has('teleport')) {
            Tactician_Uptime +=
              4 / statVal(nodes_map, 'Teleport_Cooldown')
          }
          if (allSkillsVal(nodes_map).has('flame-shield')) {
            Tactician_Uptime +=
              4 / statVal(nodes_map, 'Flame_Shield_Cooldown')
          }
          if (allSkillsVal(nodes_map).has('ice-armor')) {
            Tactician_Uptime +=
              4 / statVal(nodes_map, 'Ice_Armor_Cooldown')
          }
          if (allSkillsVal(nodes_map).has('frost-nova')) {
            Tactician_Uptime +=
              4 / statVal(nodes_map, 'Frost_Nova_Cooldown')
          }
          Talent_Damage_Multiplier *=
            1 + 0.1 * Math.min(Tactician_Uptime, 1)
        }

        // Glyph Control: You deal x10% increased damage to Slowed or Chilled enemies or, instead, x20% increased damage to Stunned or Frozen enemies.
        if (paragonVal(nodes_map, 'control')) {
          if (
            statVal(nodes_map, 'Enemy_Frozen') == 1 ||
            toggleVal(nodes_map, 'enemy-stunned')
          ) {
            Talent_Damage_Multiplier *=
              1 + 0.2 * statVal(nodes_map, 'Enemy_Boss_CC_Adjustment')
          } else if (
            statVal(nodes_map, 'Enemy_Chilled') == 1 ||
            toggleVal(nodes_map, 'enemy-slowed')
          ) {
            Talent_Damage_Multiplier *=
              1 + 0.1 * statVal(nodes_map, 'Enemy_Boss_CC_Adjustment')
          }
        }

        // Glyph Paragon 'unleash', After spending 50 Mana, you deal x6.7% increased damage and gain 6.7% increased Mana Regeneration for 3 seconds.
        if (paragonVal(nodes_map, 'unleash')) {
          let Mana_Use_Rate = 0
          for (const Other_Skill in Pre_Sim_Node['skill_use_rate']) {
            if (
              Pre_Sim_Node['cross_skill_stat'][Other_Skill][
                'resource_cost'
              ] < 0
            ) {
              Mana_Use_Rate +=
                Pre_Sim_Node['skill_use_rate'][Other_Skill] *
                Pre_Sim_Node['cross_skill_stat'][Other_Skill][
                  'resource_cost'
                ]
            }
          }
          Talent_Damage_Multiplier *=
            1 + 0.067 * Math.min(1, (Mana_Use_Rate * 3) / 50)
        }

        // Glyph Paragon 'elementalist': Dealing Fire, Cold, or Lightning Damage to an enemy increases all damage you deal to them by x5% for 10 seconds, stacking once per element.
        if (paragonVal(nodes_map, 'elementalist')) {
          const Fire_Skills = new Set([
            'fire-bolt',
            'incinerate',
            'fireball',
            'flame-shield',
            'hydra',
            'meteor',
            'firewall',
            'inferno',
          ])
          const Frost_Skills = new Set([
            'frost-bolt',
            'ice-shards',
            'frozen-orb',
            'blizzard',
            'deep-freeze',
            'ice-blades',
          ])
          const Lightning_Skills = new Set([
            'spark',
            'arc-lash',
            'chain-lightning',
            'charged-bolts',
            'lightning-spear',
            'ball-lightning',
            'teleport',
            'unstable-currents',
          ])
          let Fire_Damage_Rate = 0
          let Frost_Damage_Rate = 0
          let Lightning_Damage_Rate = 0
          for (const Other_Skill in Pre_Sim_Node['skill_use_rate']) {
            if (Fire_Skills.has(Other_Skill)) {
              Fire_Damage_Rate +=
                Pre_Sim_Node['skill_use_rate'][Other_Skill]
            }
            if (Frost_Skills.has(Other_Skill)) {
              Frost_Damage_Rate +=
                Pre_Sim_Node['skill_use_rate'][Other_Skill]
            }
            if (Lightning_Skills.has(Other_Skill)) {
              Lightning_Damage_Rate +=
                Pre_Sim_Node['skill_use_rate'][Other_Skill]
            }
          }
          if (enchantmentVal(nodes_map).has('fire-bolt')) {
            Fire_Damage_Rate = 1
          }
          if (
            enchantmentVal(nodes_map).has('blizzard') &&
            !toggleVal(nodes_map, 'enemy-distant')
          ) {
            Frost_Damage_Rate = 1
          }
          Talent_Damage_Multiplier *=
            1 +
            0.05 *
              (Math.min(1, Fire_Damage_Rate * 10) +
                Math.min(1, Frost_Damage_Rate * 10) +
                Math.min(1, Lightning_Damage_Rate * 10))
        }

        // Glyph Paragon 'destruction' Critical Strikes increase all damage the enemy takes from you by x2% for 10 seconds, up to x12%.
        if (paragonVal(nodes_map, 'destruction')) {
          let Critical_Strike_Rate = 0
          for (const Other_Skill in Pre_Sim_Node['skill_use_rate']) {
            Critical_Strike_Rate +=
              Pre_Sim_Node['skill_use_rate'][Other_Skill] *
              Pre_Sim_Node['cross_skill_stat'][Other_Skill][
                'critical_chance'
              ]
          }
          if (Critical_Strike_Rate * 10 > 1) {
            Talent_Damage_Multiplier *= 1.12
          } else {
            Talent_Damage_Multiplier *=
              1 + 0.02 * Math.min(1, Critical_Strike_Rate * 10)
          }
        }

        // Glyph Paragon: 'exploit', Dealing damage to a Vulnerable enemy increases your damage by x1% for 6 seconds, up to x10%.
        if (
          paragonVal(nodes_map, 'exploit') &&
          statVal(nodes_map, 'Enemy_Vulnerable') > 0
        ) {
          Talent_Damage_Multiplier *=
            1 + 0.1 * statVal(nodes_map, 'Enemy_Vulnerable') // It's going to stack up, so just assume it's at 10 stacks.
        }

        // Charged Picking up Crackling Energy grants you x5% increased damage for 5 seconds, up to x15%.
        if (paragonVal(nodes_map, 'charged')) {
          Talent_Damage_Multiplier *=
            1 +
            0.05 *
              (Pre_Sim_Node['crackling_energy_rate'] * 5 > 1
                ? 3
                : Pre_Sim_Node['crackling_energy_rate'] * 5)
        }

        // Talent ['conjuration-mastery', 3] You deal x{1/2/3/4/5/6/7/8/9/10}% increased damage for each active Conjuration.
        if (talentVal(nodes_map, 'conjuration-mastery') > 0) {
          //const Conjuration_Skills = new Set (['ice-blades','hydra','lightning-spear'])
          let Conjuration_Uptime = 0
          let Duration_Multiplier = 1

          // Conjurer: Conjuration Skills have 20% increased duration.
          if (paragonVal(nodes_map, 'conjurer')) {
            Duration_Multiplier += 0.2
          }

          for (const Other_Skill in Pre_Sim_Node['skill_use_rate']) {
            switch (Other_Skill) {
              case 'ice-blades':
                Conjuration_Uptime +=
                  Pre_Sim_Node['skill_use_rate'][Other_Skill] *
                  6 *
                  Duration_Multiplier
                break
              case 'hydra':
                // Serpentine_Aspect You may have 1.0 additional Hydra active, and Hydra's duration is increased by {14/24}%.
                if (
                  aspectVal(nodes_map, 'serpentine-aspect').length !=
                  0
                ) {
                  Duration_Multiplier += aspectVal(
                    nodes_map,
                    'serpentine-aspect',
                  )[0]
                }
                Conjuration_Uptime +=
                  Pre_Sim_Node['skill_use_rate'][Other_Skill] *
                  10 *
                  Duration_Multiplier
                break
              case 'lightning-spear':
                Conjuration_Uptime += 3 * Duration_Multiplier
                break
            }
          }

          Talent_Damage_Multiplier *=
            1 +
            0.01 *
              talentVal(nodes_map, 'conjuration-mastery') *
              Conjuration_Uptime
        }

        return Talent_Damage_Multiplier
      },
    ),

    Skill_Talent_Damage_Multiplier: new StatsNode(
      'Skill_Talent_Damage_Multiplier',
      () => {
        const Pre_Sim_Node = sorcererPresimVal(nodes_map)
        let Talent_Damage_Multiplier = 1
        const enemy_spread = Number(
          statVal(nodes_map, 'Enemy_Spread'),
        )
        const number_of_enemies = Number(
          toggleVal(nodes_map, 'number-of-enemies'),
        )
        const Hits_Multiplier = statVal(nodes_map, 'Hits_Multiplier')

        // "Elemental_Dominance": (Up to 3 Points) Your Core Skills deal x3% increased damage when cast above 50 Mana.
        if (
          currentSkillVal(nodes_map)['tags'].has('core') &&
          talentVal(nodes_map, 'elemental-dominance') > 0
        ) {
          Talent_Damage_Multiplier *=
            1 + 0.03 * talentVal(nodes_map, 'elemental-dominance')
        }

        // "Greater_Charged_Bolts": Charged Bolts deals x25% increased damage to Stunned enemies.
        if (
          currentSkillVal(nodes_map)['name'] == 'charged-bolts' &&
          talentVal(nodes_map, 'greater-charged-bolts') == 1 &&
          toggleVal(nodes_map, 'enemy-stunned')
        ) {
          Talent_Damage_Multiplier *= 1.25
        }

        // "Enhanced_Blizzard": Blizzard deals x25% increased damage to Frozen enemies.
        if (
          currentSkillVal(nodes_map)['name'] == 'blizzard' &&
          talentVal(nodes_map, 'enhanced-blizzard') == 1 &&
          statVal(nodes_map, 'Enemy_Frozen')
        ) {
          Talent_Damage_Multiplier *= 1.25
        }

        // ["Inner_Flames", 3]: Your Pyromancy Skills deal x{3/6/9/12/15/18/21/24/27/30}% increased damage while you are Healthy.
        if (
          currentSkillVal(nodes_map)['tags'].has('pyromancy') &&
          Number(toggleVal(nodes_map, 'percent-life')) >= 0.8
        ) {
          Talent_Damage_Multiplier *=
            1 + 0.03 * talentVal(nodes_map, 'inner-flames')
        }

        // ["Permafrost", 3]: Frost Skills deal x{5/10/15/20/25/30/35/40/45/50}% increased damage to Elites.
        if (
          currentSkillVal(nodes_map)['tags'].has('frost') &&
          toggleVal(nodes_map, 'enemy-elite')
        ) {
          Talent_Damage_Multiplier *=
            1 +
            0.05 *
              talentVal(nodes_map, 'permafrost') *
              (1 / number_of_enemies)
        }

        //["Icy_Touch", 3]: You deal x{4/8/12/16/20/24/28/32/36/40}% increased Cold Damage to Vulnerable enemies.
        if (
          currentSkillVal(nodes_map)['tags'].has('cold') &&
          statVal(nodes_map, 'Enemy_Vulnerable') > 0
        ) {
          Talent_Damage_Multiplier *=
            1 +
            0.04 *
              talentVal(nodes_map, 'icy-touch') *
              statVal(nodes_map, 'Enemy_Vulnerable')
        }

        // "Enhanced_Incinerate": While channeling Incinerate, you Burn enemies around you for 15% of the damage per second
        if (
          talentVal(nodes_map, 'enhanced-incinerate') > 0 &&
          currentSkillVal(nodes_map)['name'] == 'incinerate'
        ) {
          const extra_enemy_hits =
            Math.min(
              10 ** 2 / statVal(nodes_map, 'Enemy_Spread') ** 2,
              1,
            ) *
            (number_of_enemies - 1)
          // The number of hits is not determined by the Hits multiplier (for the beam) but by the number of enemies around you.
          Talent_Damage_Multiplier *=
            1 +
            (0.15 *
              (Number(!toggleVal(nodes_map, 'enemy-distant')) +
                extra_enemy_hits)) /
              Hits_Multiplier
        }

        // Keystone Talent ["Avalanche", 1], Lucky Hit: Your Frost Skills have up to a 10% chance to make your next cast of Ice Shards, Frozen Orb, or Blizzard consume no Mana
        // and deal x40% increased damage. Chance is doubled against Vulnerable enemies.
        if (talentVal(nodes_map, 'avalanche') > 0) {
          const Avalanche_Skills = new Set([
            'ice-shards',
            'frozen-orb',
            'blizzard',
          ])
          const Frost_Skills = new Set([
            'frost-bolt',
            'ice-shards',
            'frozen-orb',
            'blizzard',
            'deep-freeze',
            'ice-blades',
          ])
          const Vulnerable_Scaling =
            statVal(nodes_map, 'Enemy_Vulnerable') + 1
          const Current_Skill = currentSkillVal(nodes_map)['name']

          let Frost_Skill_Hit_Rate = 0
          let Avalanche_Skill_Attack_Rate = 0
          let Avalanche_Proc_Rate = 0
          let Avalanche_Stacks_Per_Proc = 1

          //'Aspect-of-Frozen Memories' The Avalanche Key Passive now applies to 1.0 additional casts.
          if (aspectVal(nodes_map, 'aspect-of-frozen-memories')) {
            Avalanche_Stacks_Per_Proc = 2
          }

          for (const Other_Skill in Pre_Sim_Node['skill_use_rate']) {
            if (Frost_Skills.has(Other_Skill)) {
              Avalanche_Proc_Rate +=
                0.1 *
                Vulnerable_Scaling *
                Pre_Sim_Node['skill_use_rate'][Other_Skill] *
                Pre_Sim_Node['cross_skill_stat'][Other_Skill][
                  'lucky_hit_chance'
                ] *
                Pre_Sim_Node['cross_skill_stat'][Other_Skill][
                  'total_hits'
                ]

              Frost_Skill_Hit_Rate +=
                Pre_Sim_Node['skill_use_rate'][Other_Skill] *
                Pre_Sim_Node['cross_skill_stat'][Other_Skill][
                  'total_hits'
                ]
              if (Avalanche_Skills.has(Other_Skill)) {
                Avalanche_Skill_Attack_Rate +=
                  Pre_Sim_Node['skill_use_rate'][Other_Skill]
              }
            }
          }
          if (
            Avalanche_Skills.has(Current_Skill) &&
            Pre_Sim_Node['skill_use_rate'][Current_Skill] > 0 &&
            Frost_Skill_Hit_Rate > 0
          ) {
            // Proportion of avalanche skills from the current skill.
            let alpha =
              Pre_Sim_Node['skill_use_rate'][Current_Skill] /
              Avalanche_Skill_Attack_Rate
            // Chance that at least one proc applies to this skill is 1 - chance that both apply to other skills.
            alpha = 1 - (1 - alpha) ** Avalanche_Stacks_Per_Proc
            const p = Avalanche_Proc_Rate / Frost_Skill_Hit_Rate
            const Time_Between_Casts =
              1 / Pre_Sim_Node['skill_use_rate'][Current_Skill]
            // Estimate 1 - (chance that all avalanche skills fail to proc).
            Talent_Damage_Multiplier *=
              1 +
              0.4 *
                (1 -
                  (1 - p) **
                    (Frost_Skill_Hit_Rate * Time_Between_Casts)) *
                alpha
          }
        }

        // Keystone Talent: ['vyrs-mastery', 1] Close enemies take x15% increased damage from your Shock Skills and deal 20% less damage to you. Critical Strikes increase these bonuses by 25% for 3 seconds.
        if (
          talentVal(nodes_map, 'vyrs-mastery') > 0 &&
          tagsVal(nodes_map).has('shock')
        ) {
          const Vyrs_Mastery_Bonus = 0.15
          let Critical_Rate = 0
          for (const Other_Skill in Pre_Sim_Node['skill_use_rate']) {
            Critical_Rate +=
              Pre_Sim_Node['skill_use_rate'][Other_Skill] *
              Pre_Sim_Node['cross_skill_stat'][Other_Skill][
                'critical_chance'
              ]
          }
          if (toggleVal(nodes_map, 'enemy-distant')) {
            Talent_Damage_Multiplier *=
              1 +
              Vyrs_Mastery_Bonus *
                (1 + 0.25 * Math.min(1, Critical_Rate * 3)) *
                Math.min(
                  1,
                  10 ** 2 / statVal(nodes_map, 'Enemy_Spread') ** 2,
                )
          } else {
            Talent_Damage_Multiplier *=
              1 +
              Vyrs_Mastery_Bonus *
                (1 + 0.25 * Math.min(1, Critical_Rate * 3))
          }
        }

        // Summoned Lightning Spear: Collecting Crackling Energy increases the damage of your next Lightning Spear cast by x20%, up to x160%.
        if (
          currentSkillVal(nodes_map)['name'] == 'lightning-spear' &&
          'lightning-spear' in Pre_Sim_Node['skill_use_rate'] &&
          talentVal(nodes_map, 'summoned-lightning-spear')
        ) {
          const Lightning_Spear_Rate =
            Pre_Sim_Node['skill_use_rate']['lightning-spear']
          const Crackling_Energy_Rate =
            Pre_Sim_Node['crackling_energy_rate']
          Talent_Damage_Multiplier *=
            1 +
            0.2 *
              Math.min(
                8,
                Crackling_Energy_Rate /
                  (Lightning_Spear_Rate + 0.0001),
              )
        }

        return Talent_Damage_Multiplier
      },
    ),

    Hits_Multiplier: new StatsNode('Hits_Multiplier', () => {
      const enemy_spread = Number(statVal(nodes_map, 'Enemy_Spread'))
      const number_of_enemies = Number(
        toggleVal(nodes_map, 'number-of-enemies'),
      )
      const Pre_Sim_Node = sorcererPresimVal(nodes_map)
      let Hits_Multiplier = 1
      const Attack_Speed = statVal(nodes_map, 'Total_Attack_Speed')

      let Ball_Lightning_Radius
      let Blizzard_Duration
      let Blizzard_Range
      let Deep_Freeze_Duration
      let Firewall_Radius
      let Flame_Shield_Duration
      let Hydra_Duration
      let Ice_Blades_Duration
      let Lightning_Spear_Duration
      let Lightning_Spear_Width
      let Meteor_Radius
      let p = 0
      let q = 0

      switch (currentSkillVal(nodes_map)['name']) {
        // Spark: Launch a bolt of lightning that shocks an enemy 4 times, dealing 10%% damage each hit.
        case 'spark':
          Hits_Multiplier = 4
          // Enhanced Spark: Each time Spark hits its primary target, it has a 40% chance to hit up to 3 additional enemies, dealing 7%% damage. If there are no other enemies to hit, Spark instead deals x20% increased damage to its primary target.
          if (
            currentSkillVal(nodes_map)['name'] == 'spark' &&
            talentVal(nodes_map, 'enhanced-spark') == 1
          ) {
            // Chance that a single enemy is near.
            p = toggleVal(nodes_map, 'enemy-distant')
              ? ProbabilityInCircle(
                  25,
                  15,
                  statVal(nodes_map, 'Enemy_Spread'),
                )
              : ProbabilityInCircle(
                  0,
                  15,
                  statVal(nodes_map, 'Enemy_Spread'),
                )
            const Additional_Targets = [
              BinomialProbability(number_of_enemies - 1, p, 0),
              BinomialProbability(number_of_enemies - 1, p, 1),
              BinomialProbability(number_of_enemies - 1, p, 2),
              1 - BinomialDistribution(number_of_enemies - 1, p, 2),
            ]
            Hits_Multiplier *=
              1 +
              0.4 *
                (0.2 * Additional_Targets[0] +
                  0.07 * Additional_Targets[1] +
                  0.14 * Additional_Targets[2] +
                  0.21 * Additional_Targets[3])
          }
          break

        // Arc_Lash: Unleash arcing lightning that deals {42/46.2/50.4/54.6/58.8/63/67.2/71.4/75.6/79.8}% damage to enemies in front of you. Every 10 times Arc Lash swipes, it Stuns all enemies hit for 2 secon
        case 'arc-lash':
          Hits_Multiplier =
            1 +
            ProbabilityInCone(
              10,
              1 / 3,
              statVal(nodes_map, 'Enemy_Spread'),
            ) *
              (number_of_enemies - 1)
          // "Enhanced_Arc_Lash": If Arc Lash's initial swipe Critically Strikes, it swipes an additional time.
          if (talentVal(nodes_map, 'enhanced-arc-lash') > 0) {
            Hits_Multiplier *=
              1 + statVal(nodes_map, 'Critical_Chance')
          }
          break

        // Incinerate: Channel a beam of fire, Burning enemies for {9.1/10/10.925/11.825/12.75/13.65/14.55/15.475/16.375/17.3}% damage per second. Damage per second increases over 2 seconds, up to {49.1/54/59/63.9/68.9/73.7/78.6/83.6/88.4/93.4}%
        case 'incinerate':
          Hits_Multiplier =
            1 +
            ProbabilityInCone(
              60,
              1 / 24,
              statVal(nodes_map, 'Enemy_Spread'),
            ) *
              (number_of_enemies - 1)
          break

        // "Ice_Shards": Launch 5 shards that deal {25/27.5/30/32.5/35/37.5/40/42.5/45/47.5}% damage each. Deals x25% increased damage to Frozen enemies.
        case 'ice-shards':
          {
            Hits_Multiplier = 5

            const Ice_Shards_Enemies_Hit =
              1 +
              ProbabilityIntersectingLineInCircle(
                7,
                60,
                statVal(nodes_map, 'Enemy_Spread'),
              ) *
                (number_of_enemies - 1)

            let Piercing_Cold_Hits_Multiplier = 1
            // Aspect-of-Piercing Cold Ice Shards pierce {4/3} times, dealing {20/25}% less damage per subsequent enemy hit.
            if (
              aspectVal(nodes_map, 'aspect-of-piercing-cold').length >
              0
            ) {
              const penalty = aspectVal(
                nodes_map,
                'aspect-of-piercing-cold',
              )[1]
              const pierce_cap = aspectVal(
                nodes_map,
                'aspect-of-piercing-cold',
              )[0]

              // for (let i = 0; i < pierce_cap; i++) {
              //   Piercing_Cold_Multiplier +=
              //     penalty ** (i + 1) *
              //     (1 -
              //       BinomialDistribution(number_of_enemies - 1, p, i))
              // }
              for (
                let i = 1;
                i < Math.min(pierce_cap, Ice_Shards_Enemies_Hit);
                i++
              ) {
                Piercing_Cold_Hits_Multiplier +=
                  penalty ** i * Ice_Shards_Enemies_Hit
              }
            }

            let Enhanced_Ice_Shards_Multiplier = 1
            // "Enhanced_Ice_Shards": Ice Shards have a 40% chance to ricochet to another enemy. Ice Shards always ricochet off of Frozen enemies.
            if (talentVal(nodes_map, 'enhanced-ice-shards')) {
              if (statVal(nodes_map, 'Enemy_Frozen') > 0) {
                // Assume the first ricochet hits a frozen target and the others don't.
                Enhanced_Ice_Shards_Multiplier *= Math.min(
                  2,
                  number_of_enemies,
                )
              } else {
                // Enhanced_Ice_Shards_Multiplier *=
                //   1 +
                //   (1 + 1 / (1 - 0.4)) *
                //     Math.min(1, number_of_enemies - 1)
                Enhanced_Ice_Shards_Multiplier *= Math.min(
                  1.4,
                  number_of_enemies,
                )
              }
            }

            let Frozen_Enemy_Multiplier = 1
            if (statVal(nodes_map, 'Enemy_Frozen') > 0) {
              Frozen_Enemy_Multiplier = 1.25
            }

            Hits_Multiplier *=
              Piercing_Cold_Hits_Multiplier *
              Enhanced_Ice_Shards_Multiplier *
              Frozen_Enemy_Multiplier
          }
          break

        // "Charged_Bolts": Release 5 bolts of lightning that course along the ground in an erratic pattern, dealing {17.5/19.2/21/22.7/24.5/26.2/28/29.8/31.5/33.2}% damage each.
        case 'charged-bolts': {
          // An extra 5 yard thickness if aspect of static cling.
          let Charged_Bolts_Range = 30
          let Thickness = 5

          //Staff-of-Lam Esen: Your cast of Charged Bolts have a 40-60% chance to be attracted to enemies and last 300% longer.
          if (aspectVal(nodes_map, 'staff-of-lam-esen').length > 0) {
            Thickness +=
              5 * aspectVal(nodes_map, 'staff-of-lam-esen')[0]
            Charged_Bolts_Range +=
              30 * aspectVal(nodes_map, 'staff-of-lam-esen')[0]
          }

          //Aspect of Piercing Cling: Charged Bolts pierce, but deal 60-40% less damage to targets hit after the first.
          // Charged_Bolt_Shotgunning: Player is hitting all 5 charged bolts by being directly adjacent to enemy
          if (toggleVal(nodes_map, 'enemy-distant')) {
            if (
              aspectVal(nodes_map, 'aspect-of-piercing-cling')
                .length > 0
            ) {
              Hits_Multiplier +=
                5 *
                ProbabilityIntersectingLineInCircle(
                  Thickness,
                  Charged_Bolts_Range,
                  statVal(nodes_map, 'Enemy_Spread'),
                ) *
                (number_of_enemies - 1)
              // Staff-of-Lam Esen: Your cast of Charged Bolts have a 40-60% chance to be attracted to enemies and last 300% longer.
            } else if (
              aspectVal(nodes_map, 'staff-of-lam-esen').length > 0
            ) {
              Hits_Multiplier += Math.min(
                ProbabilityInCone(
                  60,
                  1 / 6,
                  statVal(nodes_map, 'Enemy_Spread'),
                ) *
                  (number_of_enemies - 1),
                4,
              )
            } else {
              // We assume target is in the cone and every enemy in the cone gets hit by one bolt.
              Hits_Multiplier += Math.min(
                ProbabilityInCone(
                  30,
                  1 / 6,
                  statVal(nodes_map, 'Enemy_Spread'),
                ) *
                  (number_of_enemies - 1),
                4,
              )
            }
          } else {
            // Enemy close.
            Hits_Multiplier = 5
            // Aspect of Piercing Cling: Charged Bolts pierce, but deal 60-40% less damage to targets hit after the first.
            if (
              aspectVal(nodes_map, 'aspect-of-piercing-cling')
                .length > 0
            ) {
              Hits_Multiplier +=
                5 *
                ProbabilityIntersectingLineInCircle(
                  Thickness,
                  Charged_Bolts_Range,
                  statVal(nodes_map, 'Enemy_Spread'),
                ) *
                (number_of_enemies - 1)
            }
          }
          break
        }
        // "Chain_Lightning": Unleash a stream of lightning that deals {42/46.2/50.4/54.6/58.8/63/67.2/71.4/75.6/79.8}% damage and chains between Nearby enemies and you up to 5 times, prioritizing enemies.
        case 'chain-lightning':
          {
            let Chain_Lightning_Bounces = 5
            // Aspect_of_the Unbroken Tether Chain Lightning has a {30/40}% chance to chain 4.0 additional times.
            if (
              aspectVal(nodes_map, 'aspect-of-the-unbroken-tether')
                .length > 0
            ) {
              Chain_Lightning_Bounces +=
                4 *
                aspectVal(
                  nodes_map,
                  'aspect-of-the-unbroken-tether',
                )[0]
            }

            const Chain_Lightning_Bounce_Distance = 15
            if (!toggleVal(nodes_map, 'enemy-distant')) {
              // Probability of a single enemy being within bounce distance.
              p = Math.min(
                Chain_Lightning_Bounce_Distance ** 2 /
                  statVal(nodes_map, 'Enemy_Spread') ** 2,
                1,
              )
              // Prob that another enemy is also within bounce distance.
              q = 1 - (1 - p) ** (number_of_enemies - 1)
              // If no other enemies are nearby, then half of the bounces hit the player.
              // Each time Chain Lightning bounces, it deals 5% increased damage for its duration.
              if (
                talentVal(nodes_map, 'greater-chain-lightning') > 0
              ) {
                // Hits when two enemies are nearby.
                const n = Chain_Lightning_Bounces
                // Hits when only 1 enemy is nearby.
                const k = Math.ceil(Chain_Lightning_Bounces / 2)
                // This counts the accumulated bonus in the two cases.
                // In case 1, each hit gets a 5% bonus while in case
                // 2 each hit gets a 10% bonus. This is a little confusing
                // so should work it out on paper to check if it's unclear.
                Hits_Multiplier =
                  q * (n + (n * 0.05 * (n - 1)) / 2) +
                  (1 - q) * (k + (0.1 * (k * (k - 1))) / 2)
              } else {
                Hits_Multiplier =
                  q * Chain_Lightning_Bounces +
                  (1 - q) * Math.ceil(Chain_Lightning_Bounces / 2)
              }
            } else {
              p = ProbabilityInCircle(
                25,
                Chain_Lightning_Bounce_Distance,
                statVal(nodes_map, 'Enemy_Spread'),
              )
              q = 1 - (1 - p) ** (number_of_enemies - 1)
              // If no other enemies are nearby, there are no bounces.
              Hits_Multiplier =
                q *
                  (Chain_Lightning_Bounces +
                    talentVal(nodes_map, 'greater-chain-lightning') *
                      ((Chain_Lightning_Bounces *
                        (Chain_Lightning_Bounces - 1)) /
                        2)) +
                (1 - q)
            }
          }
          break

        //"Flame_Shield": Engulf yourself in flames for {2/2.2/2.4/2.6/2.8/3/3.2/3.4/3.6/3.8} seconds, Burning surrounding enemies for {23.4/25.7/28.1/30.4/32.8/35.1/37.4/39.8/42.1/44.5}% damage per second.
        case 'flame-shield':
          Flame_Shield_Duration =
            2 + 0.2 * talentVal(nodes_map, 'flame-shield')
          if (!toggleVal(nodes_map, 'enemy-distant')) {
            // Chance that another enemy is in melee range.
            p = 10 ** 2 / statVal(nodes_map, 'Enemy_Spread') ** 2
            Hits_Multiplier =
              Flame_Shield_Duration *
              (1 + (number_of_enemies - 1) * p)
          } else {
            Hits_Multiplier =
              Flame_Shield_Duration * (number_of_enemies - 1) * p
          }
          break

        case 'hydra':
          // "Hydra": Summon a 3-headed hydra for 10 seconds. Each head spits fire at enemies, dealing {30/33/36/39/42/45/48/51/54/57}% damage
          Hydra_Duration = 10
          // Conjurer: Conjuration Skills have 20% increased duration.
          if (paragonVal(nodes_map, 'conjurer')) {
            Hydra_Duration *= 1.2
          }
          // Serpentine_Aspect You may have 1.0 additional Hydra active, and Hydra's duration is increased by {14/24}%.
          if (aspectVal(nodes_map, 'serpentine-aspect').length > 0) {
            Hydra_Duration *=
              1 + aspectVal(nodes_map, 'serpentine-aspect')[0]
          }

          // "Enhanced_Hydra": While Healthy, your casts of Hydra gain 1 additional head
          if (
            talentVal(nodes_map, 'enhanced-hydra') > 0 &&
            Number(toggleVal(nodes_map, 'percent-life')) >= 0.8
          ) {
            Hits_Multiplier = 4 * Hydra_Duration * Attack_Speed
          } else {
            Hits_Multiplier = 3 * Hydra_Duration * Attack_Speed
          }
          break
        // "Ice_Blades": Conjure a pair of ice blades for 6 seconds that rapidly slash enemies for {30.7/33.7/36.8/39.9/42.9/46/49.1/52.1/55.2/58.3}% damage and have a 30% chance to make them Vulnerable for 2 seconds.
        case 'ice-blades':
          Ice_Blades_Duration = 6
          // Conjurer: Conjuration Skills have 20% increased duration.
          if (paragonVal(nodes_map, 'conjurer')) {
            Ice_Blades_Duration *= 1.2
          }
          Hits_Multiplier = Ice_Blades_Duration * Attack_Speed
          break

        //"Blizzard": Summon a frigid blizzard that deals {130}% damage and continually Chills enemies for 18% over 8 seconds
        case 'blizzard':
          Blizzard_Duration = 8
          // Blizzard's duration is increased by 4 seconds.
          if (talentVal(nodes_map, 'mages-blizzard') > 0) {
            Blizzard_Duration += 4
          }
          // Adept: Mastery Skills have 20% increased area.
          Blizzard_Range = 15
          if (paragonVal(nodes_map, 'adept')) {
            Blizzard_Range *= 1.2
          }
          if (!toggleVal(nodes_map, 'enemy-distant')) {
            p = Math.min(
              Blizzard_Range ** 2 /
                statVal(nodes_map, 'Enemy_Spread') ** 2,
              1,
            )
          } else {
            p = ProbabilityInCircle(
              25,
              Blizzard_Range,
              statVal(nodes_map, 'Enemy_Spread'),
            )
          }
          Hits_Multiplier =
            1 + (p * (number_of_enemies - 1) * Blizzard_Duration) / 8
          break

        // "Ball_Lightning": Discharge a ball of lightning that slowly moves forward, continually zapping enemies for {18/19.8/21.6/23.4/25.2/27/28.8/30.6/32.4/34.2}% damage
        case 'ball-lightning': {
          let Base_Frames_Over_Enemy = 31
          let Frames_Per_Pulse = 9

          Ball_Lightning_Radius = 5
          // Adept: Mastery Skills have 20% increased area.
          if (paragonVal(nodes_map, 'adept')) {
            Ball_Lightning_Radius *= 1.2
            Base_Frames_Over_Enemy *= 1.2
          }

          let Gravitational_Aspect_Hits_Multiplier = 1
          if (
            aspectVal(nodes_map, 'gravitational-aspect').length == 0
          ) {
            // Prob that a random enemy is in the trajectory.
            p = ProbabilityIntersectingLineInCircle(
              Ball_Lightning_Radius,
              60,
              statVal(nodes_map, 'Enemy_Spread'),
            )
          } else {
            Gravitational_Aspect_Hits_Multiplier = 2.5
            p = Math.min(
              1,
              (5 + Ball_Lightning_Radius) ** 2 /
                statVal(nodes_map, 'Enemy_Spread') ** 2,
            )
          }

          // let Enhanced_Ball_Lightning_Bonus = 1
          //["Enhanced_Ball_Lightning", 1], //Ball Lightning's damage rate is increased by your Attack Speed Bonus, up to 25%.
          if (talentVal(nodes_map, 'enhanced-ball-lightning') > 0) {
            // Enhanced_Ball_Lightning_Bonus += 2 * statVal(nodes_map, 'Attack_Speed_Bonus')
            Frames_Per_Pulse /=
              1 +
              Math.min(0.25, statVal(nodes_map, 'Attack_Speed_Bonus'))
          }

          Hits_Multiplier =
            (Base_Frames_Over_Enemy / Frames_Per_Pulse) *
            Gravitational_Aspect_Hits_Multiplier *
            (!toggleVal(nodes_map, 'enemy-distant')
              ? 1 + (number_of_enemies - 1) * p
              : number_of_enemies * p)
          break
        }
        // Fireball: Hurl an exploding ball of fire, dealing {60/66/72/78/84/90/96/102/108/114}% damage to surrounding enemies.
        case 'fireball':
          {
            // Enhanced Fireball: Casting Fireball increases its radius by 50%.
            let Fireball_Radius = 10
            if (talentVal(nodes_map, 'enhanced-fireball') > 0) {
              Fireball_Radius *= 1.5
            }

            Hits_Multiplier =
              1 +
              ProbabilityInCircle(
                10,
                Fireball_Radius,
                statVal(nodes_map, 'Enemy_Spread'),
              ) *
                (number_of_enemies - 1)
            if (toggleVal(nodes_map, 'enemy-distant')) {
              Hits_Multiplier =
                1 +
                ProbabilityInCircle(
                  25,
                  Fireball_Radius,
                  statVal(nodes_map, 'Enemy_Spread'),
                ) *
                  (number_of_enemies - 1)
            }

            // (Unique) gloves-of-the-illuminator: Fireball now bounces as it travels, exploding each time it hits the ground, but its explosion deals {35-25}% less damage.
            if (
              aspectVal(nodes_map, 'gloves-of-the-illuminator')
                .length > 0
            ) {
              Hits_Multiplier =
                1 + talentVal(nodes_map, 'enhanced-fireball') // If enhanced fireball then its radius will cause 2 hits on primary target
              for (let i = 1; i <= 6; i++) {
                Hits_Multiplier +=
                  ProbabilityInCircle(
                    i * 10,
                    Fireball_Radius,
                    statVal(nodes_map, 'Enemy_Spread'),
                  ) *
                  (number_of_enemies - 1)
              }
            }

            // Staff-of-Endless Rage Every 3rd cast-of-Fireball launches 2 additional projectiles and deals 20-40%[x] damage.
            if (
              aspectVal(nodes_map, 'staff-of-endless-rage').length !=
              0
            ) {
              Hits_Multiplier *=
                (2 +
                  3 *
                    (1 +
                      aspectVal(
                        nodes_map,
                        'staff-of-endless-rage',
                      )[0])) /
                3
            }
          }
          break

        case 'frost-bolt':
          // "Enhanced_Frost_Bolt": Frost Bolt has a 15% chance to explode on Chilled enemies, hitting surrounding enemies. Chance increased to 100% against Frozen enemies.
          if (talentVal(nodes_map, 'enhanced-frost-bolt') != 0) {
            // Chance of explosion.
            q = Math.max(
              statVal(nodes_map, 'Enemy_Chilled') * 0.15,
              statVal(nodes_map, 'Enemy_Frozen'),
            )
            if (!toggleVal(nodes_map, 'enemy-distant')) {
              // Chance that another enemy is in melee range.
              p = 10 ** 2 / enemy_spread ** 2
              Hits_Multiplier = 1 + (number_of_enemies - 1) * p * q
            } else {
              // Assume enemy stands at 25 yards and Frost_Bolt explosion range is 10 yards.
              p = ProbabilityInCircle(25, 10, enemy_spread)
              Hits_Multiplier = 1 + (number_of_enemies - 1) * p * q
            }
          }
          break

        // "Enhanced_Fire_Bolt": Fire Bolt pierces through Burning enemies.
        case 'fire-bolt':
          if (talentVal(nodes_map, 'enhanced-fire-bolt') != 0) {
            p =
              ProbabilityIntersectingLineInCircle(
                10,
                60,
                statVal(nodes_map, 'Enemy_Spread'),
              ) * Pre_Sim_Node['dot_uptime']
            Hits_Multiplier = 1 + (number_of_enemies - 1) * p
          }
          break

        // "Frozen_Orb": // Unleash an orb that Chills for 34% and expels piercing shards, dealing a total of {36}% damage.
        //   Upon expiration, Frozen Orb explodes, dealing {34}% damage and Chilling enemies for 8.7%.
        case 'frozen-orb':
          {
            let Frozen_Orb_Distance = 15
            if (toggleVal(nodes_map, 'enemy-distant')) {
              Frozen_Orb_Distance = 30
            }

            // 'enhanced-frozen-orb': When cast above 40 Mana, Frozen Orb's explosion damage is increased by 30%[x]. Bonus explosion damage is increased to 45%[x] against Elites.
            let Enhanced_Frozen_Orb_Multiplier = 1
            if (talentVal(nodes_map, 'enhanced-frozen-orb') > 0) {
              if (toggleVal(nodes_map, 'enemy-elite')) {
                Enhanced_Frozen_Orb_Multiplier =
                  1.3 *
                    ((number_of_enemies - 1) / number_of_enemies) +
                  1.45 * (1 / number_of_enemies)
              } else {
                Enhanced_Frozen_Orb_Multiplier = 1.3
              }
            }

            // We assume everyone in a 15 yard radius from the orb is hit and everyone at the explosion spot is hit again.
            const Frozen_Orb_Projectile_Hits_Multiplier =
              1 +
              ProbabilityIntersectingLineInCircle(
                10,
                Frozen_Orb_Distance,
                statVal(nodes_map, 'Enemy_Spread'),
              ) *
                (number_of_enemies - 1)

            let Frozen_Orb_Explosion_Hits_Multiplier =
              (34 / 36) *
              (1 +
                ProbabilityInCircle(
                  Frozen_Orb_Distance,
                  10,
                  statVal(nodes_map, 'Enemy_Spread'),
                ) *
                  (number_of_enemies - 1))

            // Aspect-of-Frozen Orbit Frozen Orb stays in place after reaching its destination and explodes 2.0 additional times for {20/30}%-of-its damage.
            if (
              aspectVal(nodes_map, 'aspect-of-frozen-orbit').length >
              0
            ) {
              Frozen_Orb_Explosion_Hits_Multiplier *=
                1 +
                aspectVal(nodes_map, 'aspect-of-frozen-orbit')[0] * 2
            }

            Hits_Multiplier =
              Frozen_Orb_Projectile_Hits_Multiplier +
              Frozen_Orb_Explosion_Hits_Multiplier *
                Enhanced_Frozen_Orb_Multiplier
          }
          break

        // "Teleport": Transform into lightning, becoming Unstoppable and surging to the target location, dealing {25/27.5/30/32.5/35/37.5/40/42.5/45/47.5}% damage around you upon arrival
        case 'teleport':
          p = Math.min(
            10 ** 2 / statVal(nodes_map, 'Enemy_Spread') ** 2,
            1,
          )
          Hits_Multiplier = 1 + (number_of_enemies - 1) * p
          break

        // "Frost_Nova": Unleash a torrent of frost, Freezing enemies around you for 2 seconds.
        case 'frost-nova':
          p = Math.min(
            20 ** 2 / statVal(nodes_map, 'Enemy_Spread') ** 2,
            1,
          )
          if (!toggleVal(nodes_map, 'enemy-distant')) {
            Hits_Multiplier = 1 + (number_of_enemies - 1) * p
          } else {
            Hits_Multiplier = (number_of_enemies - 1) * p
          }
          break

        // "Meteor": Summon a meteor that strikes the target location, dealing {50/55/60/65/70/75/80/85/90/95}% damage and Burning the ground for {35/38.5/42/45.5/49/52.5/56/59.5/63/66.5}% damage over 3 seconds.
        case 'meteor':
          // S2 Balance Patch: Effect radius increased by 10%.
          Meteor_Radius = 11 // Originally 10, now 11

          // Adept: Mastery Skills have 20% increased area.
          if (paragonVal(nodes_map, 'adept')) {
            Meteor_Radius *= 1.2
          }
          if (!toggleVal(nodes_map, 'enemy-distant')) {
            p = Math.min(
              Meteor_Radius ** 2 /
                statVal(nodes_map, 'Enemy_Spread') ** 2,
              1,
            )
          } else {
            p = ProbabilityInCircle(
              25,
              Meteor_Radius,
              statVal(nodes_map, 'Enemy_Spread'),
            )
          }
          Hits_Multiplier += (number_of_enemies - 1) * p
          // "Enhanced Meteor": If a cast of Meteor hits 3 or more enemies, there is a 30% chance an additional Meteor falls on the same location.
          if (
            number_of_enemies >= 3 &&
            talentVal(nodes_map, 'enhanced-meteor') > 0
          ) {
            // Binomial probability of hitting at least 2 extra enemies.
            q =
              1 -
              (1 - p) ** (number_of_enemies - 1) -
              (number_of_enemies - 1) *
                p *
                (1 - p) ** (number_of_enemies - 2)
            Hits_Multiplier *= 1 + q
          }
          break

        // "Firewall": Create a wall of flames that Burns enemies for {160/176/192/208/224/240/256/272/288/304}% damage over 8 seconds.
        case 'firewall':
          // (TODO) This is the wrong geometry for this move. Need to revamp.
          Firewall_Radius = 7

          // Adept: Mastery Skills have 20% increased area.
          if (paragonVal(nodes_map, 'adept')) {
            Firewall_Radius *= 1.2
          }

          Hits_Multiplier =
            1 +
            ProbabilityIntersectingLineInCircle(
              Firewall_Radius,
              30,
              statVal(nodes_map, 'Enemy_Spread'),
            ) *
              (number_of_enemies - 1)
          break

        //"Deep_Freeze": Encase yourself in ice, becoming Immune for 4 seconds, continually dealing 12.5% damage, and Chilling enemies for 20%. When Deep Freeze expires, it deals an additional 100% damage.
        case 'deep-freeze':
          p = Math.min(
            20 ** 2 / statVal(nodes_map, 'Enemy_Spread') ** 2,
            1,
          )
          Hits_Multiplier =
            (Number(!toggleVal(nodes_map, 'enemy-distant')) +
              (number_of_enemies - 1) * p) *
            // 7 ticks then a large hit. We average the bonus.
            ((7 / 8) * 1 + ((1 / 8) * 100) / 12.5)
          break

        //"Inferno": Summon a fiery serpent that continually constricts the target area, Burning enemies for 295% damage over 8 seconds.
        case 'inferno':
          p = Math.min(
            20 ** 2 / statVal(nodes_map, 'Enemy_Spread') ** 2,
            1,
          )
          if (!toggleVal(nodes_map, 'enemy-distant')) {
            Hits_Multiplier = 1 + (number_of_enemies - 1) * p
          } else {
            Hits_Multiplier = (number_of_enemies - 1) * p
          }
          break

        case 'lightning-spear':
          Lightning_Spear_Duration = 6
          // Conjurer: Conjuration Skills have 20% increased duration.
          if (paragonVal(nodes_map, 'conjurer')) {
            Lightning_Spear_Duration *= 1.2
          }
          Lightning_Spear_Width = 7
          // We assume Lightning spear moves in 1.5 figure 8 from the center where each loop has diameter 30. This is 1.5 circles from the
          // center and we assume it hits a close enemy 3 times. The width of the hitbox is assumed to be 7 yards.
          Hits_Multiplier =
            3 +
            ProbabilityInAnnulus(
              15,
              15 + Lightning_Spear_Width,
              15 - Lightning_Spear_Width,
              statVal(nodes_map, 'Enemy_Spread'),
            ) *
              (number_of_enemies - 1)

          // Aspect_of_Splintering Energy Lightning Spear has a {41/50}% chance to spawn an additional Lightning Spear when you cast it.
          if (
            aspectVal(nodes_map, 'aspect-of-splintering-energy')
              .length > 0
          ) {
            Hits_Multiplier *=
              1 +
              aspectVal(nodes_map, 'aspect-of-splintering-energy')[0]
          }
          break

        default:
          break
      }

      return Hits_Multiplier
    }),

    // Almost the same as Hits_Multiplier, but this should track the track the quantity of hits not a damage multiplier which could be different.
    Total_Hits: new StatsNode('Total_Hits', () => {
      const enemy_spread = Number(statVal(nodes_map, 'Enemy_Spread'))
      const number_of_enemies = Number(
        toggleVal(nodes_map, 'number-of-enemies'),
      )

      let Number_of_Hits = 1
      const Attack_Speed = statVal(nodes_map, 'Total_Attack_Speed')

      let Ball_Lightning_Radius
      let Blizzard_Duration
      let Blizzard_Range
      let Chain_Lightning_Bounces
      let Fireball_Radius
      let Firewall_Radius
      let Flame_Shield_Duration
      let Hydra_Duration
      let Ice_Blades_Duration
      let Lightning_Spear_Duration
      let Lightning_Spear_Width
      let Meteor_Radius
      let p = 0
      let q = 0

      switch (currentSkillVal(nodes_map)['name']) {
        // Spark: Launch a bolt of lightning that shocks an enemy 4 times, dealing {8/8.8/9.6/10.4/11.2/12/12.8/13.6/14.4/15.2}% damage each hit.
        case 'spark':
          Number_of_Hits = 4
          // Enhanced Spark: Each time Spark hits its primary target, it has a 40% chance to hit up to 3 additional enemies, dealing 7%% damage. If there are no other enemies to hit, Spark instead deals x20% increased damage to its primary target.
          if (
            currentSkillVal(nodes_map)['name'] == 'spark' &&
            talentVal(nodes_map, 'enhanced-spark') == 1
          ) {
            // Chance that a single enemy is near.
            p = toggleVal(nodes_map, 'enemy-distant')
              ? ProbabilityInCircle(
                  25,
                  15,
                  statVal(nodes_map, 'Enemy_Spread'),
                )
              : ProbabilityInCircle(
                  0,
                  15,
                  statVal(nodes_map, 'Enemy_Spread'),
                )
            const Additional_Targets = [
              BinomialProbability(number_of_enemies - 1, p, 0),
              BinomialProbability(number_of_enemies - 1, p, 1),
              BinomialProbability(number_of_enemies - 1, p, 2),
              1 - BinomialDistribution(number_of_enemies - 1, p, 2),
            ]
            Number_of_Hits *=
              1 +
              0.4 *
                (Additional_Targets[1] +
                  2 * Additional_Targets[2] +
                  3 * Additional_Targets[3])
          }
          break

        // Arc_Lash: Unleash arcing lightning that deals {42/46.2/50.4/54.6/58.8/63/67.2/71.4/75.6/79.8}% damage to enemies in front of you. Every 10 times Arc Lash swipes, it Stuns all enemies hit for 2 secon
        case 'arc-lash':
          Number_of_Hits =
            1 +
            ProbabilityInCone(
              10,
              1 / 3,
              statVal(nodes_map, 'Enemy_Spread'),
            ) *
              (number_of_enemies - 1)
          // "Enhanced_Arc_Lash": If Arc Lash's initial swipe Critically Strikes, it swipes an additional time.
          if (talentVal(nodes_map, 'enhanced-arc-lash') > 0) {
            Number_of_Hits *=
              1 + statVal(nodes_map, 'Critical_Chance')
          }
          break

        // Incinerate: Channel a beam of fire, Burning enemies for {9.1/10/10.925/11.825/12.75/13.65/14.55/15.475/16.375/17.3}% damage per second. Damage per second increases over 2 seconds, up to {49.1/54/59/63.9/68.9/73.7/78.6/83.6/88.4/93.4}%
        case 'incinerate':
          Number_of_Hits =
            1 +
            ProbabilityInCone(
              60,
              1 / 24,
              statVal(nodes_map, 'Enemy_Spread'),
            ) *
              (number_of_enemies - 1)
          break

        // "Ice_Shards": Launch 5 shards that deal {25/27.5/30/32.5/35/37.5/40/42.5/45/47.5}% damage each. Deals x25% increased damage to Frozen enemies.
        case 'ice-shards':
          {
            Number_of_Hits = 5

            const Ice_Shards_Enemies_Hit =
              1 +
              ProbabilityIntersectingLineInCircle(
                7,
                60,
                statVal(nodes_map, 'Enemy_Spread'),
              ) *
                (number_of_enemies - 1)

            let Piercing_Cold_Hits_Multiplier = 1
            // Aspect-of-Piercing Cold Ice Shards pierce {4/3} times, dealing {20/25}% less damage per subsequent enemy hit.
            if (
              aspectVal(nodes_map, 'aspect-of-piercing-cold').length >
              0
            ) {
              const pierce_cap = aspectVal(
                nodes_map,
                'aspect-of-piercing-cold',
              )[0]

              // for (let i = 0; i < pierce_cap; i++) {
              //   Piercing_Cold_Multiplier +=
              //     penalty ** (i + 1) *
              //     (1 -
              //       BinomialDistribution(number_of_enemies - 1, p, i))
              // }
              for (
                let i = 1;
                i < Math.min(pierce_cap, Ice_Shards_Enemies_Hit);
                i++
              ) {
                Piercing_Cold_Hits_Multiplier +=
                  Ice_Shards_Enemies_Hit
              }
            }

            let Enhanced_Ice_Shards_Multiplier = 1
            // "Enhanced_Ice_Shards": Ice Shards have a 40% chance to ricochet to another enemy. Ice Shards always ricochet off of Frozen enemies.
            if (talentVal(nodes_map, 'enhanced-ice-shards')) {
              if (statVal(nodes_map, 'Enemy_Frozen') > 0) {
                // Assume the first ricochet hits a frozen target and the others don't.
                Enhanced_Ice_Shards_Multiplier *= Math.min(
                  2,
                  number_of_enemies,
                )
              } else {
                // Enhanced_Ice_Shards_Multiplier *=
                //   1 +
                //   (1 + 1 / (1 - 0.4)) *
                //     Math.min(1, number_of_enemies - 1)
                Enhanced_Ice_Shards_Multiplier *= Math.min(
                  1.4,
                  number_of_enemies,
                )
              }
            }

            Number_of_Hits *=
              Piercing_Cold_Hits_Multiplier *
              Enhanced_Ice_Shards_Multiplier
          }
          break

        // "Charged_Bolts": Release 5 bolts of lightning that course along the ground in an erratic pattern, dealing {17.5/19.2/21/22.7/24.5/26.2/28/29.8/31.5/33.2}% damage each.
        case 'charged-bolts': {
          // Staff-of-Lam Esen: Your cast of Charged Bolts have a 40-60% chance to be attracted to enemies and last 300% longer.
          // An extra 5 yard thickness if aspect of static cling.
          let Charged_Bolts_Range = 30
          let Thickness = 5
          if (aspectVal(nodes_map, 'staff-of-lam-esen').length > 0) {
            Thickness +=
              5 * aspectVal(nodes_map, 'staff-of-lam-esen')[0]
            Charged_Bolts_Range +=
              30 * aspectVal(nodes_map, 'staff-of-lam-esen')[0]
          }
          //Charged_Bolt_Shotgunning: Player is hitting all 5 charged bolts by being directly adjacent to enemy
          if (!toggleVal(nodes_map, 'enemy-distant')) {
            Number_of_Hits = 5
            // Aspect of Piercing Cling: Charged Bolts pierce, but deal 60-40% less damage to targets hit after the first.
            if (
              aspectVal(nodes_map, 'aspect-of-piercing-cling')
                .length > 0
            ) {
              Number_of_Hits +=
                5 *
                ProbabilityIntersectingLineInCircle(
                  Thickness,
                  Charged_Bolts_Range,
                  statVal(nodes_map, 'Enemy_Spread'),
                ) *
                (number_of_enemies - 1)
            }
          } else if (
            aspectVal(nodes_map, 'aspect-of-piercing-cling').length >
            0
          ) {
            Number_of_Hits +=
              5 *
              ProbabilityIntersectingLineInCircle(
                Thickness,
                Charged_Bolts_Range,
                statVal(nodes_map, 'Enemy_Spread'),
              ) *
              (number_of_enemies - 1)
          } else if (
            // Staff-of-Lam Esen: Your casts-of-Charged Bolts have a {15/25}% chance to be attracted to enemies and and last 300.0% longer.
            aspectVal(nodes_map, 'staff-of-lam-esen').length > 0
          ) {
            Number_of_Hits += Math.min(
              ProbabilityInCone(
                60,
                1 / 4,
                statVal(nodes_map, 'Enemy_Spread'),
              ) *
                (number_of_enemies - 1),
              4,
            )
          } else {
            // We assume target is in the cone and every enemy in the cone gets hit by one bolt.
            Number_of_Hits += Math.min(
              ProbabilityInCone(
                30,
                1 / 6,
                statVal(nodes_map, 'Enemy_Spread'),
              ) *
                (number_of_enemies - 1),
              4,
            )
          }
          break
        }
        // "Chain_Lightning": Unleash a stream of lightning that deals {42/46.2/50.4/54.6/58.8/63/67.2/71.4/75.6/79.8}% damage and chains between Nearby enemies and you up to 5 times, prioritizing enemies.
        case 'chain-lightning':
          {
            // "Chain_Lightning": Unleash a stream of lightning that deals {42/46.2/50.4/54.6/58.8/63/67.2/71.4/75.6/79.8}% damage and chains between Nearby enemies and you up to 5 times, prioritizing enemies.
            Chain_Lightning_Bounces = 5

            // Aspect_of_the Unbroken Tether Chain Lightning has a {30/40}% chance to chain 4.0 additional times.
            if (
              aspectVal(nodes_map, 'aspect-of-the-unbroken-tether')
                .length > 0
            ) {
              Chain_Lightning_Bounces +=
                4 *
                aspectVal(
                  nodes_map,
                  'aspect-of-the-unbroken-tether',
                )[0]
            }

            const Chain_Lightning_Bounce_Distance = 15
            if (!toggleVal(nodes_map, 'enemy-distant')) {
              // Probability of a single enemy being within bounce distance.
              p = Math.min(
                Chain_Lightning_Bounce_Distance ** 2 /
                  statVal(nodes_map, 'Enemy_Spread') ** 2,
                1,
              )
              // Prob that another enemy is also within bounce distance.
              q = 1 - (1 - p) ** (number_of_enemies - 1)
              // If no other enemies are nearby, then half of the bounces hit the player.
              Number_of_Hits =
                q * Chain_Lightning_Bounces +
                (1 - q) * Math.ceil(Chain_Lightning_Bounces / 2)
            } else {
              p = ProbabilityInCircle(
                25,
                Chain_Lightning_Bounce_Distance,
                statVal(nodes_map, 'Enemy_Spread'),
              )
              q = 1 - (1 - p) ** (number_of_enemies - 1)
              // If no other enemies are nearby, there are no bounces.
              Number_of_Hits = q * Chain_Lightning_Bounces + (1 - q)
            }
          }
          break

        //"Flame_Shield": Engulf yourself in flames for {2/2.2/2.4/2.6/2.8/3/3.2/3.4/3.6/3.8} seconds, Burning surrounding enemies for {23.4/25.7/28.1/30.4/32.8/35.1/37.4/39.8/42.1/44.5}% damage per second.
        case 'flame-shield':
          Flame_Shield_Duration =
            2 + 0.2 * talentVal(nodes_map, 'flame-shield')
          if (!toggleVal(nodes_map, 'enemy-distant')) {
            // Chance that another enemy is in melee range.
            p = 10 ** 2 / statVal(nodes_map, 'Enemy_Spread') ** 2
            Number_of_Hits =
              Flame_Shield_Duration *
              (1 + (number_of_enemies - 1) * p)
          } else {
            Number_of_Hits =
              Flame_Shield_Duration * (number_of_enemies - 1) * p
          }
          break

        // "Hydra": Summon a 3-headed hydra for 12 seconds. Each head spits fire at enemies, dealing {30/33/36/39/42/45/48/51/54/57}% damage
        case 'hydra':
          Hydra_Duration = 10
          // Conjurer: Conjuration Skills have 20% increased duration.
          if (paragonVal(nodes_map, 'conjurer')) {
            Hydra_Duration *= 1.2
          }
          // Serpentine_Aspect You may have 1.0 additional Hydra active, but Hydra's duration is increased by {14/24}%.
          if (aspectVal(nodes_map, 'serpentine-aspect').length > 0) {
            Hydra_Duration *=
              1 + aspectVal(nodes_map, 'serpentine-aspect')[0]
          }
          // "Enhanced_Hydra": While Healthy, your casts of Hydra gain 1 additional head
          if (
            talentVal(nodes_map, 'enhanced-hydra') > 0 &&
            Number(toggleVal(nodes_map, 'percent-life')) >= 0.8
          ) {
            Number_of_Hits = 4 * Hydra_Duration * Attack_Speed
          } else {
            Number_of_Hits = 3 * Hydra_Duration * Attack_Speed
          }
          break

        // "Ice_Blades": Conjure a pair of ice blades for 6 seconds that rapidly slash enemies for {30.7/33.7/36.8/39.9/42.9/46/49.1/52.1/55.2/58.3}% damage and have a 30% chance to make them Vulnerable for 2 seconds.
        case 'ice-blades':
          Ice_Blades_Duration = 6
          // Conjurer: Conjuration Skills have 20% increased duration.
          if (paragonVal(nodes_map, 'conjurer')) {
            Ice_Blades_Duration *= 1.2
          }
          Number_of_Hits = Ice_Blades_Duration * Attack_Speed
          break

        //"Blizzard": Summon a frigid blizzard that deals {130}% damage and continually Chills enemies for 18% over 8 seconds
        case 'blizzard':
          Blizzard_Duration = 8
          // "mages_Blizzard": Blizzard's duration is increased by 4 seconds.
          if (talentVal(nodes_map, 'mages-blizzard') > 0) {
            Blizzard_Duration += 4
          }
          // Adept: Mastery Skills have 20% increased area.
          Blizzard_Range = 15
          if (paragonVal(nodes_map, 'adept')) {
            Blizzard_Range *= 1.2
          }
          if (!toggleVal(nodes_map, 'enemy-distant')) {
            p = Math.min(
              Blizzard_Range ** 2 /
                statVal(nodes_map, 'Enemy_Spread') ** 2,
              1,
            )
          } else {
            p = ProbabilityInCircle(
              25,
              Blizzard_Range,
              statVal(nodes_map, 'Enemy_Spread'),
            )
          }
          Number_of_Hits =
            (1 + p * (number_of_enemies - 1)) *
            Attack_Speed *
            Blizzard_Duration
          break

        // "Ball_Lightning": Discharge a ball of lightning that slowly moves forward, continually zapping enemies for {18/19.8/21.6/23.4/25.2/27/28.8/30.6/32.4/34.2}% damage
        case 'ball-lightning': {
          let Base_Frames_Over_Enemy = 31
          let Frames_Per_Pulse = 9

          Ball_Lightning_Radius = 5
          // Adept: Mastery Skills have 20% increased area.
          if (paragonVal(nodes_map, 'adept')) {
            Ball_Lightning_Radius *= 1.2
            Base_Frames_Over_Enemy *= 1.2
          }

          // Experimentally derived.
          let Gravitational_Aspect_Hits_Multiplier = 1
          if (
            aspectVal(nodes_map, 'gravitational-aspect').length == 0
          ) {
            // Prob that a random enemy is in the trajectory.
            p = ProbabilityIntersectingLineInCircle(
              Ball_Lightning_Radius,
              60,
              statVal(nodes_map, 'Enemy_Spread'),
            )
          } else {
            // Experimentally derived.
            Gravitational_Aspect_Hits_Multiplier = 2.5
            p = Math.min(
              1,
              (5 + Ball_Lightning_Radius) ** 2 /
                statVal(nodes_map, 'Enemy_Spread') ** 2,
            )
          }

          // let Enhanced_Ball_Lightning_Bonus = 1
          //["Enhanced_Ball_Lightning", 1], //Ball Lightning's damage rate is increased by your Attack Speed Bonus, up to 25%.
          if (talentVal(nodes_map, 'enhanced-ball-lightning') > 0) {
            // Enhanced_Ball_Lightning_Bonus += 2 * statVal(nodes_map, 'Attack_Speed_Bonus')
            Frames_Per_Pulse /=
              1 +
              Math.min(0.25, statVal(nodes_map, 'Attack_Speed_Bonus'))
          }

          Number_of_Hits =
            (Base_Frames_Over_Enemy / Frames_Per_Pulse) *
            Gravitational_Aspect_Hits_Multiplier *
            (!toggleVal(nodes_map, 'enemy-distant')
              ? 1 + (number_of_enemies - 1) * p
              : number_of_enemies * p)
          break
        }

        // Fireball: Hurl an exploding ball of fire, dealing {60/66/72/78/84/90/96/102/108/114}% damage to surrounding enemies.
        case 'fireball':
          // Enhanced Fireball: Fireball's radius is increased based on distance traveled, up to 50%.
          {
            // Enhanced Fireball: Casting Fireball increases its radius by 50%.
            let Fireball_Radius = 10
            if (talentVal(nodes_map, 'enhanced-fireball') > 0) {
              Fireball_Radius *= 1.5
            }

            Number_of_Hits =
              1 +
              ProbabilityInCircle(
                10,
                Fireball_Radius,
                statVal(nodes_map, 'Enemy_Spread'),
              ) *
                (number_of_enemies - 1)
            if (toggleVal(nodes_map, 'enemy-distant')) {
              Number_of_Hits =
                1 +
                ProbabilityInCircle(
                  25,
                  Fireball_Radius,
                  statVal(nodes_map, 'Enemy_Spread'),
                ) *
                  (number_of_enemies - 1)
            }

            // (Unique) gloves-of-the-illuminator: Fireball now bounces as it travels, exploding each time it hits the ground, but its explosion deals {35-25% less damage.
            if (
              aspectVal(nodes_map, 'gloves-of-the-illuminator')
                .length > 0
            ) {
              Number_of_Hits = 0
              for (let i = 1; i <= 6; i++) {
                Number_of_Hits +=
                  ProbabilityInCircle(
                    i * 10,
                    Fireball_Radius,
                    statVal(nodes_map, 'Enemy_Spread'),
                  ) *
                  (number_of_enemies - 1)
              }
            }

            // Staff_of_Endless Rage Every 3rd cast_of_Fireball launches 2 additional projectiles.
            if (aspectVal(nodes_map, 'staff-of-endless-rage')) {
              Number_of_Hits *= 5 / 3
            }
          }
          break

        case 'frost-bolt':
          // "Enhanced_Frost_Bolt": Frost Bolt has a 15% chance to explode on Chilled enemies, hitting surrounding enemies. Chance increased to 100% against Frozen enemies.
          if (talentVal(nodes_map, 'enhanced-frost-bolt') != 0) {
            // Chance of explosion.
            q = Math.max(
              statVal(nodes_map, 'Enemy_Chilled') * 0.15,
              Number(toggleVal(nodes_map, 'enemy-frozen')),
            )
            if (!toggleVal(nodes_map, 'enemy-distant')) {
              // Chance that another enemy is in melee range.
              p = 10 ** 2 / enemy_spread ** 2
              Number_of_Hits = 1 + (number_of_enemies - 1) * p * q
            } else {
              // Assume enemy stands at 25 yards and Frost_Bolt explosion range is 10 yards.
              p = ProbabilityInCircle(25, 10, enemy_spread)
              Number_of_Hits = 1 + (number_of_enemies - 1) * p * q
            }
          }
          break

        // "Enhanced_Fire_Bolt": Fire Bolt pierces through Burning enemies.
        case 'fire-bolt':
          if (talentVal(nodes_map, 'enhanced-fire-bolt') != 0) {
            // Prob that a random enemy is in the trajectory.
            // (TODO) This assumes all enemies are burning. Decide whether it makes sense to only assume target is burning.
            p =
              ProbabilityIntersectingLineInCircle(
                10,
                60,
                statVal(nodes_map, 'Enemy_Spread'),
              ) * Number(toggleVal(nodes_map, 'enemy-burning'))
            Number_of_Hits = 1 + (number_of_enemies - 1) * p
          }
          break

        // "Frozen_Orb": // Unleash an orb that Chills for 34% and expels piercing shards, dealing a total of {31.7/34.9/38/41.2/44.4/47.5/50.7/53.9/57/60.2}% damage.
        //   Upon expiration, Frozen Orb explodes, dealing {29.2/32.2/35.1/38/41/43.9/46.8/49.7/52.6/55.6}% damage and Chilling enemies for 8.7%.
        case 'frozen-orb':
          {
            let Frozen_Orb_Distance = 15
            if (toggleVal(nodes_map, 'enemy-distant')) {
              Frozen_Orb_Distance = 30
            }

            // We assume everyone in a 10 yard radius from the orb is hit and everyone at the explosion spot is hit again.
            const Frozen_Orb_Projectile_Hits =
              1 +
              ProbabilityIntersectingLineInCircle(
                10,
                Frozen_Orb_Distance,
                statVal(nodes_map, 'Enemy_Spread'),
              ) *
                (number_of_enemies - 1)

            let Frozen_Orb_Explosion_Hits =
              1 +
              ProbabilityInCircle(
                Frozen_Orb_Distance,
                10,
                statVal(nodes_map, 'Enemy_Spread'),
              ) *
                (number_of_enemies - 1)

            // Aspect-of-Frozen Orbit Frozen Orb stays in place after reaching its destination and explodes 2.0 additional times for {20/30}%-of-its damage.
            if (
              aspectVal(nodes_map, 'aspect-of-frozen-orbit').length >
              0
            ) {
              Frozen_Orb_Explosion_Hits *= 3
            }

            Number_of_Hits =
              Frozen_Orb_Projectile_Hits + Frozen_Orb_Explosion_Hits
          }
          break

        // "Teleport": Transform into lightning, becoming Unstoppable and surging to the target location, dealing {25/27.5/30/32.5/35/37.5/40/42.5/45/47.5}% damage around you upon arrival
        case 'teleport':
          p = Math.min(
            10 ** 2 / statVal(nodes_map, 'Enemy_Spread') ** 2,
            1,
          )
          Number_of_Hits = 1 + (number_of_enemies - 1) * p
          break

        // "Frost_Nova": Unleash a torrent of frost, Freezing enemies around you for 2 seconds.
        case 'frost-nova':
          p = Math.min(
            20 ** 2 / statVal(nodes_map, 'Enemy_Spread') ** 2,
            1,
          )
          if (!toggleVal(nodes_map, 'enemy-distant')) {
            Number_of_Hits = 1 + (number_of_enemies - 1) * p
          } else {
            Number_of_Hits = (number_of_enemies - 1) * p
          }
          break

        // "Meteor": Summon a meteor that strikes the target location, dealing {50/55/60/65/70/75/80/85/90/95}% damage and Burning the ground for {35/38.5/42/45.5/49/52.5/56/59.5/63/66.5}% damage over 3 seconds.
        case 'meteor':
          Meteor_Radius = 10
          // Adept: Mastery Skills have 20% increased area.
          if (paragonVal(nodes_map, 'adept')) {
            Meteor_Radius *= 1.2
          }
          if (!toggleVal(nodes_map, 'enemy-distant')) {
            p = Math.min(
              Meteor_Radius ** 2 /
                statVal(nodes_map, 'Enemy_Spread') ** 2,
              1,
            )
          } else {
            p = ProbabilityInCircle(
              25,
              Meteor_Radius,
              statVal(nodes_map, 'Enemy_Spread'),
            )
          }
          Number_of_Hits += (number_of_enemies - 1) * p
          // "Enhanced Meteor": If a cast of Meteor hits 3 or more enemies, there is a 30% chance an additional Meteor falls on the same location.
          if (
            number_of_enemies >= 3 &&
            talentVal(nodes_map, 'enhanced-meteor') > 0
          ) {
            // Binomial probability of hitting at least 2 extra enemies.
            q =
              1 -
              (1 - p) ** (number_of_enemies - 1) -
              (number_of_enemies - 1) *
                p *
                (1 - p) ** (number_of_enemies - 2)
            Number_of_Hits *= 1 + q
          }
          break

        // "Firewall": Create a wall of flames that Burns enemies for {160/176/192/208/224/240/256/272/288/304}% damage over 8 seconds.
        case 'firewall':
          // (TODO) This is the wrong geometry for this move. Need to revamp.
          Firewall_Radius = 5
          // Adept: Mastery Skills have 20% increased area.
          if (paragonVal(nodes_map, 'adept')) {
            Firewall_Radius *= 1.2
          }

          Number_of_Hits =
            1 +
            ProbabilityIntersectingLineInCircle(
              Firewall_Radius,
              30,
              statVal(nodes_map, 'Enemy_Spread'),
            ) *
              (number_of_enemies - 1)
          break

        //"Deep_Freeze": Encase yourself in ice, becoming Immune for 4 seconds, continually dealing 12.5% damage, and Chilling enemies for 20%. When Deep Freeze expires, it deals an additional 100% damage.
        case 'deep-freeze':
          p = Math.min(
            20 ** 2 / statVal(nodes_map, 'Enemy_Spread') ** 2,
            1,
          )
          Number_of_Hits =
            Number(!toggleVal(nodes_map, 'enemy-distant')) +
            (number_of_enemies - 1) * p

          break

        //"Inferno": Summon a fiery serpent that continually constricts the target area, Burning enemies for 295% damage over 8 seconds.
        case 'inferno':
          p = Math.min(
            20 ** 2 / statVal(nodes_map, 'Enemy_Spread') ** 2,
            1,
          )
          if (!toggleVal(nodes_map, 'enemy-distant')) {
            Number_of_Hits = 1 + (number_of_enemies - 1) * p
          } else {
            Number_of_Hits = (number_of_enemies - 1) * p
          }
          break

        case 'lightning-spear':
          Lightning_Spear_Duration = 6
          // Conjurer: Conjuration Skills have 20% increased duration.
          if (paragonVal(nodes_map, 'conjurer')) {
            Lightning_Spear_Duration *= 1.2
          }
          Lightning_Spear_Width = 7
          // We assume Lightning spear moves in 1.5 figure 8 from the center where each loop has diameter 30. This is 1.5 circles from the
          // center and we assume it hits a close enemy 3 times. The width of the hitbox is assumed to be 7 yards.
          Number_of_Hits =
            3 +
            ProbabilityInAnnulus(
              15,
              15 + Lightning_Spear_Width,
              15 - Lightning_Spear_Width,
              enemy_spread,
            ) *
              (number_of_enemies - 1)

          // Aspect_of_Splintering Energy: Lightning Spear has a {41/50}% chance to spawn an additional Lightning Spear when you cast it.
          if (
            aspectVal(nodes_map, 'aspect-of-splintering-energy')
              .length > 0
          ) {
            Number_of_Hits *=
              1 +
              aspectVal(nodes_map, 'aspect-of-splintering-energy')[0]
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

      return Math.min(
        number_of_enemies,
        statVal(nodes_map, 'Total_Hits'),
      )
    }),

    Crackling_Energy_Created: new StatsNode(
      'Crackling_Energy_Created',
      () => {
        const Pre_Sim_Node = sorcererPresimVal(nodes_map)
        const enemy_spread = Number(
          statVal(nodes_map, 'Enemy_Spread'),
        )
        const number_of_enemies = Number(
          toggleVal(nodes_map, 'number-of-enemies'),
        )
        const Skill_Name = currentSkillVal(nodes_map)['name']

        let Crackling_Energy_Created_Total = 0

        // "Flickering_Spark": Each time Spark hits an enemy it has a 4% chance to form a Crackling Energy.
        if (
          Skill_Name == 'spark' &&
          talentVal(nodes_map, 'flickering-spark') > 0
        ) {
          Crackling_Energy_Created_Total +=
            0.04 * statVal(nodes_map, 'Total_Hits')
        }

        // "wizards_Ball_Lightning": If an enemy is hit at least 4 times by a cast of Ball Lightning, a Crackling Energy is formed. Can generate up to 2 per cast.
        if (
          Skill_Name == 'ball-lightning' &&
          talentVal(nodes_map, 'wizards-ball-lightning') > 0 &&
          statVal(nodes_map, 'Total_Hits') >= 4
        ) {
          Crackling_Energy_Created_Total += Math.min(
            2,
            number_of_enemies,
          )
        }

        // ["Static_Discharge", 3]: Lucky Hit: Critical Strikes with Shock Skills have up to a {5/10/15/20/25/30/35/40/45/50}% chance to form a Crackling Energy.
        if (currentSkillVal(nodes_map)['tags'].has('shock')) {
          Crackling_Energy_Created_Total +=
            statVal(nodes_map, 'Critical_Chance') *
            (statVal(nodes_map, 'Total_Lucky_Hit_Chance_Multiplier') *
              0.05 *
              talentVal(nodes_map, 'static-discharge'))
        }

        // Destructive Chain Lightning:`When Chain Lightning Critically Strikes, it has a 30% chance to form a Crackling Energy.
        if (
          currentSkillVal(nodes_map)['name'] == 'chain-lightning' &&
          talentVal(nodes_map, 'destructive-chain-lightning') > 0
        ) {
          Crackling_Energy_Created_Total +=
            statVal(nodes_map, 'Critical_Chance') *
            0.3 *
            statVal(nodes_map, 'Total_Hits')
        }

        // Enchantment Spark: +14% chance to form Crackling Energy when you kill an enemy.
        if (enchantmentVal(nodes_map).has('spark')) {
          let Spark_Enchantment_Bonus = 0.14
          if (paragonVal(nodes_map, 'enchantment-master')) {
            Spark_Enchantment_Bonus = 0.17
          }
          Crackling_Energy_Created_Total +=
            Spark_Enchantment_Bonus *
            statVal(nodes_map, 'Enemies_Killed')
        }

        return Crackling_Energy_Created_Total
      },
    ),

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

      // (Unique) Razorplate: Gain {1000/15000} Thorns
      if (aspectVal(nodes_map, 'razorplate').length > 0) {
        Thorns_Total += aspectVal(nodes_map, 'razorplate')[0]
      }
      return Thorns_Total
    }),

    Thorns_Dps: new StatsNode('Thorns_Dps', () => {
      const enemy_spread = Number(statVal(nodes_map, 'Enemy_Spread'))
      const number_of_enemies = Number(
        toggleVal(nodes_map, 'number-of-enemies'),
      )
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
          Math.min(
            10 ** 2 / statVal(nodes_map, 'Enemy_Spread') ** 2,
            1,
          ) *
          (number_of_enemies - 1)
        Hits_Per_Thorns += Needleflare_Hits
      }

      return (
        Thorns *
        (1 - statVal(nodes_map, 'Total_Dodge_Chance')) *
        statVal(nodes_map, 'Enemy_Attacks_Per_Second') *
        Hits_Per_Thorns *
        SorcererDamageMultiplier(
          new Set(['physical', 'thorns']),
          nodes_map,
        )
      )
    }),

    Passive_Dps: new StatsNode('Passive_Dps', () => {
      const Pre_Sim_Node = sorcererPresimVal(nodes_map)
      const Weapon_Damage = aggregationVal(nodes_map, 'weapon-damage')
      const number_of_enemies = Number(
        toggleVal(nodes_map, 'number-of-enemies'),
      )

      let Passive_Dps = statVal(nodes_map, 'Thorns_Dps')

      // Vampiric Power Casting a Mastery, Weapon Mastery, Macabre, Wrath, or Imbuement Skill calls a bat ally to attack nearby enemies, dealing 80% Physical damage with a 30% chance to Stun.
      if (statVal(nodes_map, 'Vampiric_Bat_Rate') > 0) {
        Passive_Dps +=
          statVal(nodes_map, 'Vampiric_Bat_Rate') *
          Weapon_Damage *
          SorcererDamageMultiplier(
            new Set(['physical', 'bat']),
            nodes_map,
          )
      }

      // Vampiric Curse: Killing an enemy affected by your Vampiric Curse stores their soul. Casting a Defensive, Macabre, or Agility Skill will unleash stored souls to attack nearby enemies. You can hold up to 8 souls.
      // Assuming 60% Physical Damage for now. Real Value Unknown
      if (statVal(nodes_map, 'Vampiric_Curse_Uptime') > 0) {
        let Vampiric_Curse_Damage_Modifier = 0.5

        const Defensive_Skills = new Set([
          'flame-shield',
          'ice-armor',
          'teleport',
          'frost-nova',
        ])
        let Defensive_Skill_Rate = 0
        for (const Skill of allSkillsVal(nodes_map)) {
          switch (Skill) {
            case 'flame-shield':
              Defensive_Skill_Rate +=
                1 / statVal(nodes_map, 'Flame_Shield_Cooldown')
              break
            case 'ice-armor':
              Defensive_Skill_Rate +=
                1 / statVal(nodes_map, 'Ice_Armor_Cooldown')
              break
            case 'teleport':
              Defensive_Skill_Rate +=
                1 / statVal(nodes_map, 'Teleport_Cooldown')
              break
            case 'frost-nova':
              Defensive_Skill_Rate +=
                1 / statVal(nodes_map, 'Frost_Nova_Cooldown')
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
          SorcererDamageMultiplier(new Set(['physical']), nodes_map)
      }

      // Vampiric Power jagged-spikes
      // Thorns have a 10% chance to deal 300% increased damage and Chill enemies for 8%.
      if (vampiricPowerVal(nodes_map, 'jagged-spikes')) {
        Passive_Dps += 0.3 * statVal(nodes_map, 'Thorns_Dps')
      }

      // Talent ['shocking-impact', 3], //Every time you Stun an enemy, you deal {15/30/45/60/75/90/105/120/135/150}% Lightning damage to them.
      if (
        talentVal(nodes_map, 'shocking-impact') > 0 &&
        enchantmentVal(nodes_map).has('arc-lash')
      ) {
        if (allSkillsVal(nodes_map).has('ice-armor')) {
          Passive_Dps +=
            0.15 *
            Weapon_Damage *
            (statVal(nodes_map, 'Cast_Time') /
              statVal(nodes_map, 'Ice_Armor_Cooldown')) *
            talentVal(nodes_map, 'shocking-impact') *
            statVal(nodes_map, 'Enemies_Stunned') *
            SorcererDamageMultiplier(
              new Set(['lightning']),
              nodes_map,
            )
        }
        if (allSkillsVal(nodes_map).has('frost-nova')) {
          Passive_Dps +=
            0.15 *
            Weapon_Damage *
            (statVal(nodes_map, 'Cast_Time') /
              statVal(nodes_map, 'Frost_Nova_Cooldown')) *
            talentVal(nodes_map, 'shocking-impact') *
            statVal(nodes_map, 'Enemies_Stunned') *
            SorcererDamageMultiplier(
              new Set(['lightning']),
              nodes_map,
            )
        }
      }

      // Incinerate Enchantment: Every 14 Seconds a Serpent spawns that incinerates for 8 seconds
      if (enchantmentVal(nodes_map).has('incinerate')) {
        let Incinerate_Serpent_Cooldown = 14
        if (paragonVal(nodes_map, 'enchantment-master')) {
          Incinerate_Serpent_Cooldown = 12
        }
        const Incinerate_Base_Cast_Time = 0.26
        const Incinerate_Casts_Per_Second =
          1 / Incinerate_Base_Cast_Time
        const Incinerate_Hits =
          1 +
          ProbabilityIntersectingLineInCircle(
            5,
            20,
            statVal(nodes_map, 'Enemy_Spread'),
          ) *
            (Number(toggleVal(nodes_map, 'number-of-enemies')) - 1)
        Passive_Dps +=
          (8 / Incinerate_Serpent_Cooldown) *
          Incinerate_Casts_Per_Second *
          0.54 *
          Weapon_Damage *
          Incinerate_Hits *
          SorcererDamageMultiplier(
            new Set([
              'burn',
              'damage-over-time',
              'fire',
              'fire-damage-over-time',
            ]),
            nodes_map,
          )
      }
      // Aspect-of-the Frozen Wake While Ice Armor is active, you leave behind exploding Ice Spikes that deal {100/150} damage. Your Ice Spikes Chill enemies for 10%.
      // TODO: How often do I drop these? Right now every 2 secs so 3 per Ice Armor cast.
      // Contibuting the damage to skill based on how much of Ice Armor's cooldown is reduced during the duration of the skill.
      if (
        allSkillsVal(nodes_map).has('ice-armor') &&
        aspectVal(nodes_map, 'aspect-of-the-frozen-wake').length > 0
      ) {
        let Ice_Spike_Radius = 3
        // Aspect-of-the Frozen Tundra While Deep Freeze is active, exploding Ice Spikes form in the area, dealing {125/175} Cold damage. Your Ice Spikes have a 50% increased explosion radius.
        if (
          aspectVal(nodes_map, 'aspect-of-the-frozen-tundra').length >
          0
        ) {
          Ice_Spike_Radius *= 1.5
        }

        const Number_Of_Ice_Spikes = 12 // 2 spikes per 1 second, Ice armor lasts 6 seconds
        const Ice_Spikes_Per_Second =
          Number_Of_Ice_Spikes /
          statVal(nodes_map, 'Ice_Armor_Cooldown')

        let Enemy_Distance = 0
        if (toggleVal(nodes_map, 'enemy-distant')) {
          Enemy_Distance = Math.min(
            25,
            statVal(nodes_map, 'Enemy_Spread'),
          )
        }

        Passive_Dps +=
          aspectVal(nodes_map, 'aspect-of-the-frozen-wake')[0] *
          Ice_Spikes_Per_Second *
          ProbabilityInCircle(
            Enemy_Distance,
            Ice_Spike_Radius,
            statVal(nodes_map, 'Enemy_Spread'),
          ) *
          number_of_enemies *
          SorcererDamageMultiplier(
            new Set(['cold', 'ice-spike']),
            nodes_map,
          )
      }

      // Fire Bolt Enchantment: Direct Damage from Skills applies up to an additional 23% fire damage over 8 seconds
      if (
        enchantmentVal(nodes_map).has('fire-bolt') &&
        triggerVal(nodes_map, 'Flat_Damage') > 0
      ) {
        let Fire_Bolt_Enchantment_Modifier = 0.23
        if (paragonVal(nodes_map, 'enchantment-master')) {
          Fire_Bolt_Enchantment_Modifier = 0.28
        }
        Passive_Dps +=
          (Fire_Bolt_Enchantment_Modifier / 8) *
          Weapon_Damage *
          number_of_enemies *
          SorcererDamageMultiplier(
            new Set(['burn', 'fire', 'damage-over-time']),
            nodes_map,
          )
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
          SorcererDamageMultiplier(new Set(['physical']), nodes_map) *
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
          SorcererDamageMultiplier(new Set(['physical']), nodes_map) *
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
        let Damage_Received_Total = 1

        const Pre_Sim_Node = sorcererPresimVal(nodes_map)
        const number_of_enemies = Number(
          toggleVal(nodes_map, 'number-of-enemies'),
        )
        const enemy_spread = Number(
          statVal(nodes_map, 'Enemy_Spread'),
        )

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
            statVal(nodes_map, 'Enemy_Chilled') *
            statVal(nodes_map, 'Enemy_Boss_CC_Adjustment')

        // While within your own Blizzard and for 3 seconds after leaving it, you take 20-25% less damage.
        if (
          aspectVal(nodes_map, 'snowguards-aspect').length > 0 &&
          (allSkillsVal(nodes_map).has('blizzard') ||
            enchantmentVal(nodes_map).has('blizzard'))
        ) {
          let Blizzard_Uptime = 0
          if ('blizzard' in Pre_Sim_Node['skill_use_rate']) {
            if (talentVal(nodes_map, 'mages-blizzard') > 0) {
              Blizzard_Uptime +=
                Pre_Sim_Node['skill_use_rate']['blizzard'] * 15
            } else {
              Blizzard_Uptime +=
                Pre_Sim_Node['skill_use_rate']['blizzard'] * 11
            }
          }

          if (enchantmentVal(nodes_map).has('blizzard')) {
            // Independence assumption.
            if (paragonVal(nodes_map, 'enchantment-master')) {
              Blizzard_Uptime += 9 / 13
            } else {
              Blizzard_Uptime += 9 / 15
            }
          }
          Damage_Received_Total *=
            1 -
            aspectVal(nodes_map, 'snowguards-aspect')[0] *
              Math.min(1, Blizzard_Uptime)
        }

        //everliving-aspect You take {20/25}% less damage from Crowd Controlled or Vulnerable enemies.
        if (
          aspectVal(nodes_map, 'everliving-aspect').length > 0 &&
          (statVal(nodes_map, 'Enemy_Vulnerable') > 0 ||
            statVal(nodes_map, 'Enemy_Crowd_Controlled') == 1)
        ) {
          Damage_Received_Total *=
            1 -
            aspectVal(nodes_map, 'everliving-aspect')[0] *
              statVal(nodes_map, 'Enemy_Vulnerable')
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

        // Reinforced You gain 15% Damage Reduction while you have an active Barrier.
        if (paragonVal(nodes_map, 'reinforced')) {
          Damage_Received_Total *=
            1 -
            0.15 *
              Number(
                Number(toggleVal(nodes_map, 'percent-barrier')) > 0,
              )
        }

        // Destructive Charged Bolts Hitting an enemy with Charged Bolts reduces their damage dealt by  25% for 3 seconds.
        if (
          talentVal(nodes_map, 'destructive-charged-bolts') > 0 &&
          'charged-bolts' in Pre_Sim_Node['skill_use_rate']
        ) {
          Damage_Received_Total *=
            1 -
            0.25 *
              Math.min(
                1,
                Pre_Sim_Node['skill_use_rate']['charged-bolts'] *
                  3 *
                  Math.min(
                    1,
                    Pre_Sim_Node['cross_skill_stat']['charged-bolts'][
                      'total_hits'
                    ] / number_of_enemies,
                  ),
              )
        }

        // Destructive Incinerate Enemies deal  25% less damage while Burning from Incinerate.
        if (
          talentVal(nodes_map, 'destructive-incinerate') > 0 &&
          'incinerate' in Pre_Sim_Node['skill_use_rate']
        ) {
          Damage_Received_Total *=
            1 -
            0.25 *
              Math.min(
                1,
                Pre_Sim_Node['skill_use_rate']['incinerate'] * 0.26,
              )
        }

        // ['shimmering-teleport', 1] After Teleporting, you gain 30% Damage Reduction for 3 seconds
        if (
          talentVal(nodes_map, 'shimmering-teleport') > 0 &&
          'teleport' in Pre_Sim_Node['skill_use_rate']
        ) {
          Damage_Received_Total *=
            1 -
            0.3 *
              Math.min(
                1,
                Pre_Sim_Node['skill_use_rate']['teleport'] * 3,
              )
        }

        // ["Electrocution", 3]: Enemies deal {5/10/15/20/25/30/35/40/45/50}% less damage for 5 seconds after being Critically Struck by your Shock Skills.
        if (talentVal(nodes_map, 'electrocution') > 0) {
          const Shock_Skills = new Set([
            'arc-lash',
            'spark',
            'charged-bolts',
            'chain-lightning',
            'teleport',
            'ball-lightning',
          ])
          let Electrocution_Rate = 0
          for (const Other_Skill in Pre_Sim_Node['skill_use_rate']) {
            if (Shock_Skills.has(Other_Skill)) {
              Electrocution_Rate +=
                Pre_Sim_Node['skill_use_rate'][Other_Skill] *
                Pre_Sim_Node['cross_skill_stat'][Other_Skill][
                  'critical_chance'
                ] *
                Pre_Sim_Node['cross_skill_stat'][Other_Skill][
                  'total_hits'
                ] *
                (1 / number_of_enemies)
            }
          }
          Damage_Received_Total *=
            1 -
            0.05 *
              talentVal(nodes_map, 'electrocution') *
              Math.min(1, Electrocution_Rate * 5)
        }

        // Talent ['mana-shield', 3] Every time you spend 100 Mana, you gain {7}% Damage Reduction for 5 seconds.
        if (talentVal(nodes_map, 'mana-shield') > 0) {
          let Mana_Use_Rate = 0
          for (const Other_Skill in Pre_Sim_Node['skill_use_rate']) {
            if (
              Pre_Sim_Node['cross_skill_stat'][Other_Skill][
                'resource_cost'
              ] < 0
            ) {
              Mana_Use_Rate +=
                Pre_Sim_Node['skill_use_rate'][Other_Skill] *
                -Pre_Sim_Node['cross_skill_stat'][Other_Skill][
                  'resource_cost'
                ]
            }
          }
          Damage_Received_Total *=
            1 -
            0.07 *
              talentVal(nodes_map, 'mana-shield') *
              Math.min(1, (Mana_Use_Rate * 5) / 100)
        }

        // Keystone Talent: ['vyrs-mastery', 1] Close enemies take x15% increased damage from your Shock Skills and deal 20% less damage to you. Critical Strikes increase these bonuses by 25% for 3 seconds.
        if (talentVal(nodes_map, 'vyrs-mastery') > 0) {
          let Vyrs_Mastery_Bonus = 0.2
          //Mage-Lord's Aspect: Increase Vyr’s Mastery Key Passive’s Damage Reduction by [6 - 9]% for each Close enemy, up to [18 - 27]%.
          if (aspectVal(nodes_map, 'mage-lords-aspect').length > 0) {
            if (toggleVal(nodes_map, 'enemy-distant')) {
              Vyrs_Mastery_Bonus += Math.min(
                aspectVal(nodes_map, 'mage-lords-aspect')[0] *
                  (ProbabilityInCircle(
                    0,
                    10,
                    statVal(nodes_map, 'Enemy_Spread'),
                  ) *
                    number_of_enemies),
                aspectVal(nodes_map, 'mage-lords-aspect')[1],
              )
            } else {
              Vyrs_Mastery_Bonus += Math.min(
                aspectVal(nodes_map, 'mage-lords-aspect')[0] *
                  (1 +
                    ProbabilityInCircle(
                      0,
                      10,
                      statVal(nodes_map, 'Enemy_Spread'),
                    ) *
                      (number_of_enemies - 1)),
                aspectVal(nodes_map, 'mage-lords-aspect')[1],
              )
            }
          }
          let Critical_Rate = 0
          for (const Other_Skill in Pre_Sim_Node['skill_use_rate']) {
            Critical_Rate +=
              Pre_Sim_Node['skill_use_rate'][Other_Skill] *
              Pre_Sim_Node['cross_skill_stat'][Other_Skill][
                'critical_chance'
              ] *
              Pre_Sim_Node['cross_skill_stat'][Other_Skill][
                'total_hits'
              ]
          }
          Damage_Received_Total *=
            1 -
            Vyrs_Mastery_Bonus *
              (1 + 0.25 * Math.min(1, Critical_Rate * 3))
        }

        // (Unique) Harlequin-Crest: "Gain {10/20}% damage Reduction .In addition, gain +4.0 Ranks to all Skills."
        // See run_calculations for the rank bonus.
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

        // Glyph Territorial: You gain 15% Damage Reduction against Close enemies.
        if (paragonVal(nodes_map, 'territorial')) {
          if (!toggleVal(nodes_map, 'enemy-distant')) {
            Damage_Received_Total *=
              1 -
              0.15 *
                Math.min(
                  1,
                  10 ** 2 / statVal(nodes_map, 'Enemy_Spread') ** 2,
                )
          } else {
            Damage_Received_Total *=
              1 -
              0.15 *
                Math.min(
                  1,
                  10 ** 2 / statVal(nodes_map, 'Enemy_Spread') ** 2,
                ) *
                ((number_of_enemies - 1) / number_of_enemies)
          }
        }

        // Glyph 'warding',  You take reduced damage the less Mana you have, up to 25%.
        if (paragonVal(nodes_map, 'warding')) {
          let Resource_Gain_Rate = 0
          let Resource_Cost_Rate = 0
          for (const Skill in Pre_Sim_Node['skill_use_rate']) {
            Resource_Gain_Rate +=
              Pre_Sim_Node['skill_use_rate'][Skill] *
              Pre_Sim_Node['cross_skill_stat'][Skill]['resource_gain']
            Resource_Cost_Rate +=
              Pre_Sim_Node['skill_use_rate'][Skill] *
              Pre_Sim_Node['cross_skill_stat'][Skill]['resource_cost']
          }
          if (Resource_Gain_Rate + Resource_Cost_Rate < 0) {
            Damage_Received_Total *= 1 - 0.25 / 2
          }
        }

        // Glyph 'frostbite',Enemies deal 13% reduced damage to you for 5 seconds after they are no longer Frozen.
        if (paragonVal(nodes_map, 'frostbite')) {
          let Frozen_Uptime = 0
          if (allSkillsVal(nodes_map).has('frost-nova')) {
            Frozen_Uptime +=
              (Math.min(
                1,
                10 ** 2 / statVal(nodes_map, 'Enemy_Spread') ** 2,
              ) *
                5) /
              statVal(nodes_map, 'Frost_Nova_Cooldown')
          }
          if (toggleVal(nodes_map, 'enemy-frozen')) {
            Frozen_Uptime = 0.5
          }

          Damage_Received_Total *=
            1 -
            0.13 *
              Frozen_Uptime *
              statVal(nodes_map, 'Enemy_Boss_CC_Adjustment')
        }

        // Talent 'align-the-elements': You gain 1,2,3% Damage Reduction against Elites for each second you haven't taken damage from one and persists for 2 seconds after taking damage, up to 40%.
        if (
          talentVal(nodes_map, 'align-the-elements') > 0 &&
          toggleVal(nodes_map, 'enemy-elite')
        ) {
          const Time_Between_Elite_Attacks =
            1 /
            (statVal(nodes_map, 'Enemy_Attacks_Per_Second') *
              (1 / number_of_enemies))
          Damage_Received_Total *=
            1 -
            Math.min(
              0.4,
              talentVal(nodes_map, 'align-the-elements') *
                (Time_Between_Elite_Attacks + 2),
            ) *
              (1 / number_of_enemies)
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
          'incinerate' in Pre_Sim_Node['skill_use_rate']
        ) {
          Damage_Received_Total *= 0.7
        }

        /* ----------------------------------
               DAMAGE TAKEN INCREASE
        -------------------------------------*/

        // ["Glass_Cannon", 3]: You deal x{6/12/18/24/30/36/42/48/54/60}% increased damage, but take x{3/6/9/12/15/18/21/24/27/30}% more damage.
        if (talentVal(nodes_map, 'glass-cannon') > 0) {
          Damage_Received_Total *=
            1 + 0.03 * talentVal(nodes_map, 'glass-cannon')
        }

        return 1 - Damage_Received_Total // Total Damage Reduced
      },
    ),

    Non_Physical_Damage_Reduction: new StatsNode(
      'Non_Physical_Damage_Reduction',
      () => {
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
      const Pre_Sim_Node = sorcererPresimVal(nodes_map)

      // armor
      Armor += aggregationVal(nodes_map, 'armor')

      // total-armor
      Armor *= 1 + aggregationVal(nodes_map, 'total-armor')

      // Snowveiled Aspect Casting Ice Armor grants 10% bonus Armor and makes you Unstoppable for {3/5} seconds.
      if (
        aspectVal(nodes_map, 'snowveiled-aspect').length != 0 &&
        allSkillsVal(nodes_map).has('ice-armor')
      ) {
        Armor *=
          1 +
          0.1 *
            Math.min(
              aspectVal(nodes_map, 'snowveiled-aspect')[0] /
                (statVal(nodes_map, 'Ice_Armor_Cooldown') + 0.0001),
              1,
            )
      }

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
      let Cold_Resistance = 0

      Cold_Resistance +=
        aggregationVal(nodes_map, 'cold-resistance') +
        aggregationVal(nodes_map, 'resistance-to-all-elements')

      Cold_Resistance +=
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

      // Enchanter: For each Skill equipped in your Enchantment Slots, gain +5% Maximum Resistance to that Skill's element.
      let Enchanted_Skills = 0
      if (paragonVal(nodes_map, 'enchanter')) {
        for (const skill_name of [
          'frost-bolt',
          'frozen-orb',
          'ice-shards',
          'ice-armor',
          'frost-nova',
          'ice-blades',
          'blizzard',
        ]) {
          if (enchantmentVal(nodes_map).has(skill_name)) {
            Enchanted_Skills++
          }
        }
      }
      Cold_Resistance_Cap += 0.05 * Enchanted_Skills

      // ["Potent_Warding", 3], After casting a Non-Basic Skill, you gain +3/6/9% Resistance to All Elements and +1/2/3% Maximum Resistance to that Skill's element for 9 seconds.
      if (talentVal(nodes_map, 'potent-warding') > 0) {
        const Pre_Sim_Node = sorcererPresimVal(nodes_map)
        const Basic_Skills = new Set([
          'fire-bolt',
          'arc-lash',
          'spark',
          'frost-bolt',
        ])
        const Cold_Skills = new Set([
          'frozen-orb',
          'ice-shards',
          'ice-armor',
          'frost-nova',
          'ice-blades',
          'blizzard',
          'deep-freeze',
        ])
        let Non_Basic_Skill_Use_Rate = 0
        let Cold_Skill_Use_Rate = 0
        for (const Other_Skill in Pre_Sim_Node['skill_use_rate']) {
          if (!Basic_Skills.has(Other_Skill)) {
            Non_Basic_Skill_Use_Rate +=
              Pre_Sim_Node['skill_use_rate'][Other_Skill]
            if (Cold_Skills.has(Other_Skill)) {
              Cold_Skill_Use_Rate +=
                Pre_Sim_Node['skill_use_rate'][Other_Skill]
            }
          }
        }
        Cold_Resistance +=
          talentVal(nodes_map, 'potent-warding') *
          0.02 *
          Math.min(1, Non_Basic_Skill_Use_Rate * 9)
        Cold_Resistance_Cap +=
          talentVal(nodes_map, 'potent-warding') *
          0.01 *
          Math.min(1, Cold_Skill_Use_Rate * 9)
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
        Math.min(0.85, Cold_Resistance_Cap),
        Cold_Resistance - World_Tier_Penalty,
      )
    }),

    Resistance_Fire: new StatsNode('Resistance_Fire', () => {
      let Fire_Resistance_Cap = 0.7
      let Fire_Resistance = 0

      Fire_Resistance +=
        aggregationVal(nodes_map, 'fire-resistance') +
        aggregationVal(nodes_map, 'resistance-to-all-elements')

      Fire_Resistance +=
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

      // Enchanter: For each Skill equipped in your Enchantment Slots, gain 13.3% Resistance to that Skill's element.
      let Enchanted_Skills = 0
      if (paragonVal(nodes_map, 'enchanter')) {
        for (const skill_name of [
          'fire-bolt',
          'incinerate',
          'fireball',
          'flame-shield',
          'hydra',
          'meteor',
          'firewall',
        ]) {
          if (enchantmentVal(nodes_map).has(skill_name)) {
            Enchanted_Skills++
          }
        }
        Fire_Resistance_Cap += 0.05 * Enchanted_Skills
      }

      // ["Potent_Warding", 3], After casting a Non-Basic Skill, you gain +3/6/9% Resistance to All Elements and +1/2/3% Maximum Resistance to that Skill's element for 9 seconds.
      if (talentVal(nodes_map, 'potent-warding') > 0) {
        const Pre_Sim_Node = sorcererPresimVal(nodes_map)
        const Basic_Skills = new Set([
          'fire-bolt',
          'arc-lash',
          'spark',
          'frost-bolt',
        ])
        const Fire_Skills = new Set([
          'incinerate',
          'fireball',
          'flame-shield',
          'hydra',
          'meteor',
          'firewall',
          'inferno',
        ])
        let Non_Basic_Skill_Use_Rate = 0
        let Fire_Skill_Use_Rate = 0
        for (const Other_Skill in Pre_Sim_Node['skill_use_rate']) {
          if (!Basic_Skills.has(Other_Skill)) {
            Non_Basic_Skill_Use_Rate +=
              Pre_Sim_Node['skill_use_rate'][Other_Skill]
            if (Fire_Skills.has(Other_Skill)) {
              Fire_Skill_Use_Rate +=
                Pre_Sim_Node['skill_use_rate'][Other_Skill]
            }
          }
        }
        Fire_Resistance +=
          talentVal(nodes_map, 'potent-warding') *
          0.02 *
          Math.min(1, Non_Basic_Skill_Use_Rate * 9)
        Fire_Resistance_Cap +=
          talentVal(nodes_map, 'potent-warding') *
          0.01 *
          Math.min(1, Fire_Skill_Use_Rate * 9)
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
        Math.min(0.85, Fire_Resistance_Cap),
        Fire_Resistance - World_Tier_Penalty,
      )
    }),

    Resistance_Lightning: new StatsNode(
      'Resistance_Lightning',
      () => {
        let Lightning_Resistance_Cap = 0.7
        let Lightning_Resistance = 0

        Lightning_Resistance +=
          aggregationVal(nodes_map, 'lightning-resistance') +
          aggregationVal(nodes_map, 'resistance-to-all-elements')

        Lightning_Resistance +=
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

        // Enchanter: For each Skill equipped in your Enchantment Slots, gain 13.3% Resistance to that Skill's element.
        let Enchanted_Skills = 0
        if (paragonVal(nodes_map, 'enchanter')) {
          for (const skill_name of [
            'arc-lash',
            'spark',
            'chain-lightning',
            'charged-bolts',
            'lightning-spear',
            'ball-lightning',
            'teleport',
          ]) {
            if (enchantmentVal(nodes_map).has(skill_name)) {
              Enchanted_Skills++
            }
          }
          Lightning_Resistance_Cap += 0.05 * Enchanted_Skills
        }

        // ["Potent_Warding", 3], After casting a Non-Basic Skill, you gain +3/6/9% Resistance to All Elements and +1/2/3% Maximum Resistance to that Skill's element for 9 seconds.
        if (talentVal(nodes_map, 'potent-warding') > 0) {
          const Pre_Sim_Node = sorcererPresimVal(nodes_map)
          const Basic_Skills = new Set([
            'fire-bolt',
            'arc-lash',
            'spark',
            'frost-bolt',
          ])
          const Lightning_Skills = new Set([
            'chain-lightning',
            'charged-bolts',
            'lightning-spear',
            'ball-lightning',
            'teleport',
            'unstable-currents',
          ])
          let Non_Basic_Skill_Use_Rate = 0
          let Lightning_Skill_Use_Rate = 0
          for (const Other_Skill in Pre_Sim_Node['skill_use_rate']) {
            if (!Basic_Skills.has(Other_Skill)) {
              Non_Basic_Skill_Use_Rate +=
                Pre_Sim_Node['skill_use_rate'][Other_Skill]
              if (Lightning_Skills.has(Other_Skill)) {
                Lightning_Skill_Use_Rate +=
                  Pre_Sim_Node['skill_use_rate'][Other_Skill]
              }
            }
          }
          Lightning_Resistance +=
            talentVal(nodes_map, 'potent-warding') *
            0.02 *
            Math.min(1, Non_Basic_Skill_Use_Rate * 9)
          Lightning_Resistance_Cap +=
            talentVal(nodes_map, 'potent-warding') *
            0.01 *
            Math.min(1, Lightning_Skill_Use_Rate * 9)
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
          Math.min(0.85, Lightning_Resistance_Cap),
          Lightning_Resistance_Cap - World_Tier_Penalty,
        )
      },
    ),

    Resistance_Poison: new StatsNode('Resistance_Poison', () => {
      let Poison_Resistance_Cap = 0.7
      let Poison_Resistance = 0

      Poison_Resistance +=
        aggregationVal(nodes_map, 'poison-resistance') +
        aggregationVal(nodes_map, 'resistance-to-all-elements')

      Poison_Resistance +=
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

      // ["Potent_Warding", 3], After casting a Non-Basic Skill, you gain +3/6/9% Resistance to All Elements and +1/2/3% Maximum Resistance to that Skill's element for 9 seconds.
      if (talentVal(nodes_map, 'potent-warding') > 0) {
        const Pre_Sim_Node = sorcererPresimVal(nodes_map)
        const Basic_Skills = new Set([
          'fire-bolt',
          'arc-lash',
          'spark',
          'frost-bolt',
        ])
        let Non_Basic_Skill_Use_Rate = 0
        for (const Other_Skill in Pre_Sim_Node['skill_use_rate']) {
          if (!Basic_Skills.has(Other_Skill)) {
            Non_Basic_Skill_Use_Rate +=
              Pre_Sim_Node['skill_use_rate'][Other_Skill]
          }
        }
        Poison_Resistance +=
          talentVal(nodes_map, 'potent-warding') *
          0.02 *
          Math.min(1, Non_Basic_Skill_Use_Rate * 9)
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
        Math.min(0.85, Poison_Resistance_Cap),
        Poison_Resistance - World_Tier_Penalty,
      )
    }),

    Resistance_Shadow: new StatsNode('Resistance_Shadow', () => {
      let Shadow_Resistance_Cap = 0.7
      let Shadow_Resistance = 0

      Shadow_Resistance +=
        aggregationVal(nodes_map, 'shadow-resistance') +
        aggregationVal(nodes_map, 'resistance-to-all-elements')

      Shadow_Resistance +=
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

      // ["Potent_Warding", 3],After casting a Non-Basic Skill, you gain +3/6/9% Resistance to All Elements and +1/2/3% Maximum Resistance to that Skill's element for 9 seconds.
      if (talentVal(nodes_map, 'potent-warding') > 0) {
        const Pre_Sim_Node = sorcererPresimVal(nodes_map)
        const Basic_Skills = new Set([
          'fire-bolt',
          'arc-lash',
          'spark',
          'frost-bolt',
        ])
        let Non_Basic_Skill_Use_Rate = 0
        for (const Other_Skill in Pre_Sim_Node['skill_use_rate']) {
          if (!Basic_Skills.has(Other_Skill)) {
            Non_Basic_Skill_Use_Rate +=
              Pre_Sim_Node['skill_use_rate'][Other_Skill]
          }
        }
        Shadow_Resistance +=
          talentVal(nodes_map, 'potent-warding') *
          0.02 *
          Math.min(1, Non_Basic_Skill_Use_Rate * 9)
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
        Math.min(0.85, Shadow_Resistance_Cap),
        Shadow_Resistance - World_Tier_Penalty,
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
              (1 - statVal(nodes_map, 'Enemy_Frozen')) *
              (1 - statVal(nodes_map, 'Enemy_Chilled')) *
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
      let Max_Resource = 100

      // maximum-mana (Sorcerer)
      Max_Resource +=
        aggregationVal(nodes_map, 'maximum-mana') +
        aggregationVal(nodes_map, 'maximum-resource')

      // Devastation: Your Maximum Mana is increased by {3/6/9/12/15/18/21/24/27/30}.
      Max_Resource += 3 * talentVal(nodes_map, 'devastation')

      // melted-heart-of-selig Gain 60 maximum Resource. 75% of incoming damage drains 2 Resource for every 1% of Life you would have lost instead.
      if (aspectVal(nodes_map, 'melted-heart-of-selig').length > 0) {
        Max_Resource += 60
      }

      return Max_Resource
    }),

    Delta_Resources_Per_Cast: new StatsNode(
      'Delta_Resources_Per_Cast',
      () => {
        return (
          statVal(nodes_map, 'Resource_Gain_Per_Cast') +
          statVal(nodes_map, 'Resource_Cost_Per_Cast')
        )
      },
    ),

    Resource_Gain_Per_Cast: new StatsNode(
      'Resource_Gain_Per_Cast',
      () => {
        const enemy_spread = Number(
          statVal(nodes_map, 'Enemy_Spread'),
        )
        const number_of_enemies = Number(
          toggleVal(nodes_map, 'number-of-enemies'),
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

        //Recharging Aspect Each time Chain Lightning bounces, you gain 1.5-3 Mana.
        if (
          currentSkillVal(nodes_map)['name'] == 'chain-lightning' &&
          aspectVal(nodes_map, 'recharging-aspect').length > 0
        ) {
          let Chain_Lightning_Bounces = 5

          // Aspect_of_the Unbroken Tether Chain Lightning has a {30/40}% chance to chain 4.0 additional times.
          if (
            aspectVal(nodes_map, 'aspect-of-the-unbroken-tether')
              .length > 0
          ) {
            Chain_Lightning_Bounces +=
              4 *
              aspectVal(nodes_map, 'aspect-of-the-unbroken-tether')[0]
          }
          Resource_Gain_Per_Cast +=
            Chain_Lightning_Bounces *
            aspectVal(nodes_map, 'recharging-aspect')[0]
        }

        // Encased Aspect While Deep Freeze is active, you restore {20/30}%_of_your Maximum Life and Mana per second.
        if (
          currentSkillVal(nodes_map)['name'] == 'deep-freeze' &&
          aspectVal(nodes_map, 'encased-aspect').length > 0
        ) {
          // Cast ~0.5 secs
          Resource_Gain_Per_Cast +=
            (statVal(nodes_map, 'Max_Resource') *
              aspectVal(nodes_map, 'encased-aspect')[0]) /
            2
        }

        // Mothers Embrace: If a Core Skill hits 4 or more enemies, [[20 - 40]|%|] of the Resource cost is refunded.
        if (aspectVal(nodes_map, 'mothers-embrace').length > 0) {
          // p is the probability of extra hits.
          let p = 0
          switch (currentSkillVal(nodes_map)['name']) {
            case 'incinerate':
              p = ProbabilityInCone(
                60,
                1 / 24,
                statVal(nodes_map, 'Enemy_Spread'),
              )
              break

            case 'ice-shards':
            case 'chain-lightning':
            case 'fireball':
            case 'frozen-orb':
              // Too complex to repeat it here. Here's a shortcut.
              if (number_of_enemies > 5) {
                p = ProbabilityIntersectingLineInCircle(
                  15,
                  30,
                  statVal(nodes_map, 'Enemy_Spread'),
                )
              }
              break

            case 'charged-bolts':
              // Aspect of Piercing Cling: Charged Bolts pierce, but deal 60-40% less damage to targets hit after the first.
              if (
                aspectVal(nodes_map, 'aspect-of-piercing-cling')
                  .length > 0
              ) {
                p = ProbabilityIntersectingLineInCircle(
                  5,
                  30,
                  statVal(nodes_map, 'Enemy_Spread'),
                )
              }
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
        const Pre_Sim_Node = sorcererPresimVal(nodes_map)

        let Resource_Cost_Per_Cast = Math.min(
          currentSkillVal(nodes_map)['base_resources_generated'],
          0,
        )

        // Mystical Flame Shield: You gain 25% Mana Cost Reduction while Flame Shield is active.
        Resource_Cost_Per_Cast *=
          1 -
          (0.25 *
            talentVal(nodes_map, 'mystical-flame-shield') *
            Number(allSkillsVal(nodes_map).has('flame-shield')) *
            2) /
            statVal(nodes_map, 'Flame_Shield_Cooldown')

        Resource_Cost_Per_Cast *=
          1 - aggregationVal(nodes_map, 'mana-cost-reduction')

        // Supreme Inferno: While Inferno is active, your Pyromancy Skills cost no Mana.
        if (
          allSkillsVal(nodes_map).has('inferno') &&
          talentVal(nodes_map, 'supreme-inferno') > 0 &&
          tagsVal(nodes_map).has('pyromancy')
        ) {
          Resource_Cost_Per_Cast *=
            1 -
            Math.min(8 / statVal(nodes_map, 'Inferno_Cooldown'), 1)
        }

        // Elemental Summoner: Your Conjuration Skills have a 10% reduced Cooldown or Mana cost per Conjuration Skill you have equipped.
        // They also deal bonus damage equal to 3%[x] of the total amount of your Bonus Damage with Fire, Lightning, and Cold.
        if (
          paragonVal(nodes_map, 'elemental-summoner') &&
          tagsVal(nodes_map).has('conjuration')
        ) {
          let Conjuration_Skill_Count = 0
          for (const skill of [
            'hydra',
            'ice-blades',
            'lightning-spear',
          ]) {
            if (allSkillsVal(nodes_map).has(skill)) {
              Conjuration_Skill_Count += 1
            }
          }
          Resource_Cost_Per_Cast *= 0.9 ** Conjuration_Skill_Count
        }

        // Talent Wizard's Blizzard While you have an active Blizzard, your Core Skills cost  20% less Mana.
        if (
          talentVal(nodes_map, 'wizards-blizzard') > 0 &&
          currentSkillVal(nodes_map)['tags'].has('core')
        ) {
          let Blizzard_Uptime = 0
          let Blizzard_Enchantment_Uptime = 0

          if (enchantmentVal(nodes_map).has('blizzard')) {
            Blizzard_Enchantment_Uptime = 6 / 15 // 6 seconds long, 15 second cooldown, Blizzard Forms over you automatically and follows you
          }

          if ('blizzard' in Pre_Sim_Node['skill_use_rate']) {
            Blizzard_Uptime += Math.min(
              Pre_Sim_Node['skill_use_rate']['blizzard'] * 8,
              1,
            )
          }
          Resource_Cost_Per_Cast *=
            1 -
            0.2 *
              ((1 - Blizzard_Uptime) *
                (1 - Blizzard_Enchantment_Uptime))
        }

        // Talent ['soulfire', 3], // After standing still for 1.5 seconds, your Pyromancy Skills cost {5/10/15/20/25/30/35/40/45/50}% less Mana.
        if (
          talentVal(nodes_map, 'soulfire') > 0 &&
          tagsVal(nodes_map).has('pyromancy')
        ) {
          if (currentSkillVal(nodes_map)['name'] == 'incinerate') {
            Resource_Cost_Per_Cast *=
              1 - 0.05 * talentVal(nodes_map, 'soulfire') * 0.8 // If I use Number_Of_Cast I will create a Loop
          } else {
            Resource_Cost_Per_Cast *=
              1 - 0.05 * talentVal(nodes_map, 'soulfire') * 0.5
          }
        }

        // Keystone Talent ["Avalanche", 1], Lucky Hit: Your Frost Skills have up to a 10% chance to make your next cast of Ice Shards, Frozen Orb, or Blizzard consume no Mana
        // and deal x40% increased damage. Chance is doubled against Vulnerable enemies.
        if (
          talentVal(nodes_map, 'avalanche') > 0 &&
          tagsVal(nodes_map).has('frost')
        ) {
          const Avalanche_Skills = new Set([
            'ice-shards',
            'frozen-orb',
            'blizzard',
          ])
          const Frost_Skills = new Set([
            'frost-bolt',
            'ice-shards',
            'frozen-orb',
            'blizzard',
            'deep-freeze',
            'ice-blades',
          ])
          const Vulnerable_Scaling =
            statVal(nodes_map, 'Enemy_Vulnerable') + 1
          const Current_Skill = currentSkillVal(nodes_map)['name']

          let Avalanche_Proc_Rate = 0
          let Avalanche_Skill_Attack_Rate = 0
          let Avalanche_Stacks_Per_Proc = 1
          let Frost_Skill_Hit_Rate = 0
          //'Aspect-of-Frozen Memories' The Avalanche Key Passive now applies to 1.0 additional casts.
          if (aspectVal(nodes_map, 'aspect-of-frozen-memories')) {
            Avalanche_Stacks_Per_Proc = 2
          }

          for (const Other_Skill in Pre_Sim_Node['skill_use_rate']) {
            if (Frost_Skills.has(Other_Skill)) {
              Avalanche_Proc_Rate +=
                0.1 *
                Vulnerable_Scaling *
                Pre_Sim_Node['skill_use_rate'][Other_Skill] *
                Pre_Sim_Node['cross_skill_stat'][Other_Skill][
                  'lucky_hit_chance'
                ] *
                Pre_Sim_Node['cross_skill_stat'][Other_Skill][
                  'total_hits'
                ]
              Frost_Skill_Hit_Rate +=
                Pre_Sim_Node['skill_use_rate'][Other_Skill] *
                Pre_Sim_Node['cross_skill_stat'][Other_Skill][
                  'total_hits'
                ]
              if (Avalanche_Skills.has(Other_Skill)) {
                Avalanche_Skill_Attack_Rate +=
                  Pre_Sim_Node['skill_use_rate'][Other_Skill]
              }
            }
          }
          if (
            Avalanche_Skills.has(Current_Skill) &&
            Current_Skill in Pre_Sim_Node['skill_use_rate'] &&
            Pre_Sim_Node['skill_use_rate'][Current_Skill] > 0 &&
            Frost_Skill_Hit_Rate > 0
          ) {
            let alpha =
              Pre_Sim_Node['skill_use_rate'][Current_Skill] /
              Avalanche_Skill_Attack_Rate
            // Chance that at least one proc applies to this skill is 1 - chance that both apply to other skills.
            alpha = 1 - (1 - alpha) ** Avalanche_Stacks_Per_Proc
            const p = Avalanche_Proc_Rate / Frost_Skill_Hit_Rate
            const Time_Between_Casts =
              1 / Pre_Sim_Node['skill_use_rate'][Current_Skill]
            // Estimate of the chance that all avalanche skills fail to proc.
            Resource_Cost_Per_Cast *=
              (1 - p) ** (Frost_Skill_Hit_Rate * Time_Between_Casts) *
              alpha
          }
        }

        // Aspect-of-Efficiency Casting a Basic Skill reduces the Mana cost-of-your next Core Skill or Mastery Skill by {15/25}%.
        if (
          aspectVal(nodes_map, 'aspect-of-efficiency').length != 0 &&
          tagsVal(nodes_map).has('core')
        ) {
          const Basic_Skills = new Set([
            'fire-bolt',
            'arc-lash',
            'spark',
            'frost-bolt',
          ])
          const Core_Mastery_Skills = new Set([
            'ice-shards',
            'charged-bolts',
            'chain-lightning',
            'incinerate',
            'fireball',
            'frozen-orb',
            'blizzard',
            'ball-lightning',
            'meteor',
            'firewall',
          ])
          let Basic_Skill_Rate = 0
          let Core_Mastery_Skill_Rate = 0
          for (const Other_Skill in Pre_Sim_Node['skill_use_rate']) {
            if (Basic_Skills.has(Other_Skill)) {
              Basic_Skill_Rate +=
                Pre_Sim_Node['skill_use_rate'][Other_Skill]
            }
            if (Core_Mastery_Skills.has(Other_Skill)) {
              Core_Mastery_Skill_Rate +=
                Pre_Sim_Node['skill_use_rate'][Other_Skill]
            }
          }
          if (Core_Mastery_Skill_Rate > 0) {
            Resource_Cost_Per_Cast *=
              1 -
              aspectVal(nodes_map, 'aspect-of-efficiency')[0] *
                Math.min(
                  1,
                  Basic_Skill_Rate / Core_Mastery_Skill_Rate,
                )
          }
        }

        // Searing Wards: After spending 200-100 Mana your next Firewall is free to cast and will destroy incoming Small Missiles.
        if (
          currentSkillVal(nodes_map)['name'] == 'firewall' &&
          aspectVal(nodes_map, 'searing-wards').length != 0 &&
          'firewall' in Pre_Sim_Node['skill_use_rate']
        ) {
          let Resource_Use_Rate = 0
          for (const Skill in Pre_Sim_Node['skill_use_rate']) {
            Resource_Use_Rate -=
              Pre_Sim_Node['skill_use_rate'][Skill] *
              Pre_Sim_Node['cross_skill_stat'][Skill]['resource_cost']
          }
          const Searing_Wards_Rate =
            Resource_Use_Rate /
            aspectVal(nodes_map, 'searing-wards')[0]

          // Hack to make it non-zero
          const Firewall_Rate =
            Pre_Sim_Node['skill_use_rate']['firewall']

          Resource_Cost_Per_Cast *=
            1 -
            Math.min(
              1,
              Searing_Wards_Rate / (Firewall_Rate + 0.000001),
            )
        }

        // Malignant Heart (All) the-dark-dance:	Every 5 seconds while above 60% Life, Core Skills cost [flat value number] Life instead of your Primary Resource.
        //                                        Skills that consume Life deal [10 - 20]% increased damage.
        if (
          malignantHeartVal(nodes_map, 'the-dark-dance').length !=
            0 &&
          Number(toggleVal(nodes_map, 'percent-life')) > 0.6 &&
          tagsVal(nodes_map).has('core')
        ) {
          let Core_Skill_Rate = 0
          const Core_Skills = new Set([
            'frozen-orb',
            'fireball',
            'ice-shards',
            'chain-lightning',
            'charged-bolts',
            'incinerate',
          ])
          for (const Other_Skill in Pre_Sim_Node['skill_use_rate']) {
            if (Core_Skills.has(Other_Skill)) {
              Core_Skill_Rate +=
                Pre_Sim_Node['skill_use_rate'][Other_Skill]
            }
          }
          const Probability_Dark_Dance_For_Core_Skill = Math.min(
            1,
            1 / (Core_Skill_Rate * 5),
          )
          Resource_Cost_Per_Cast *=
            1 - Probability_Dark_Dance_For_Core_Skill
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

      return Math.min(
        (delta_resources_per_cast + passive_resource_gain) *
          Number_Of_Cast,
        statVal(nodes_map, 'Max_Resource'),
      )
    }),

    Total_Resource_Generation_Multiplier: new StatsNode(
      'Total_Resource_Generation_Multiplier',
      () => {
        let Resource_Gen_Multiplier_Total = 1

        // Total_Willpower - Sorcerer gains +% Resource from Willpower
        Resource_Gen_Multiplier_Total +=
          0.001 * statVal(nodes_map, 'Total_Willpower')

        // resource-generation
        Resource_Gen_Multiplier_Total += aggregationVal(
          nodes_map,
          'resource-generation',
        )

        const Pre_Sim_Node = sorcererPresimVal(nodes_map)
        const number_of_enemies = Number(
          toggleVal(nodes_map, 'number-of-enemies'),
        )
        // Talent Wizard's Firewall You gain 5%[x] increased Mana Regeneration per active Firewall, up to 35%[x].
        if (talentVal(nodes_map, 'wizards-firewall') > 0) {
          let Firewall_Uptime = 0
          if ('firewall' in Pre_Sim_Node['skill_use_rate']) {
            Firewall_Uptime +=
              Pre_Sim_Node['skill_use_rate']['firewall'] * 8 // firewall has 8 second duration
          }
          if ('firewall' in enchantmentVal(nodes_map)) {
            Firewall_Uptime +=
              number_of_enemies *
              Number(toggleVal(nodes_map, 'enemy-burning')) *
              3
          }
          Resource_Gen_Multiplier_Total *=
            1 + Math.min(0.35, Firewall_Uptime * 0.05)
        }

        // Glyph Paragon 'unleash', After spending 50 Mana, you deal x6.7% increased damage and gain 6.7% increased Mana Regeneration for 3 seconds.
        if (paragonVal(nodes_map, 'unleash')) {
          let Mana_Use_Rate = 0
          for (const Other_Skill in Pre_Sim_Node['skill_use_rate']) {
            if (
              Pre_Sim_Node['cross_skill_stat'][Other_Skill][
                'resource_cost'
              ] < 0
            ) {
              Mana_Use_Rate +=
                Pre_Sim_Node['skill_use_rate'][Other_Skill] *
                -Pre_Sim_Node['cross_skill_stat'][Other_Skill][
                  'resource_cost'
                ]
            }
          }
          Resource_Gen_Multiplier_Total *=
            1 + 0.067 * Math.min(1, (Mana_Use_Rate * 3) / 50)
        }

        // Aspect-of-Concentration Your Mana Regeneration is increased by x{40/50}% if you have not taken damage in the last 2.0 seconds.
        if (
          aspectVal(nodes_map, 'aspect-of-concentration').length != 0
        ) {
          // Let the user decide if they are taking damage or not for this aspect
          Resource_Gen_Multiplier_Total *=
            1 + aspectVal(nodes_map, 'aspect-of-concentration')[0]
        }

        // Talent ['fiery-surge', 3], // Killing a Burning enemy increases your Mana Regeneration by +{15}% for 3 seconds.
        if (talentVal(nodes_map, 'fiery-surge') > 0) {
          Resource_Gen_Multiplier_Total =
            1 + 0.15 * Pre_Sim_Node['dot_uptime']
          talentVal(nodes_map, 'fiery-surge') *
            Math.min(1, statVal(nodes_map, 'Enemy_Kill_Rate') * 3)
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

        const Lucky_Hit_Chance = statVal(
          nodes_map,
          'Total_Lucky_Hit_Chance_Multiplier',
        )

        // 'Steal_Mana_Percent', // "[{VALUE}*100|%|] Mana Stolen per Hit",
        // (TO DO) Not sure if stolen mana is based on your % mana or the enemies.

        // (TODO): How do these scale with AOE from explosions? Need to model debuffs on enemies other than the target.

        // "Glinting_Frost_Bolt": Frost Bolt generates 4 Mana when hitting Chilled or Frozen enemies
        if (
          currentSkillVal(nodes_map)['name'] == 'frost-bolt' &&
          talentVal(nodes_map, 'glinting-frost-bolt') > 0 &&
          (toggleVal(nodes_map, 'enemy-frozen') ||
            statVal(nodes_map, 'Enemy_Chilled'))
        ) {
          Resource_Gain_Per_Hit_Total +=
            4 * statVal(nodes_map, 'Enemy_Boss_CC_Adjustment')
        }

        // "Flickering Fire Bolt": Fire Bolt generates 2 Mana when hitting an enemy
        if (
          currentSkillVal(nodes_map)['name'] == 'fire-bolt' &&
          talentVal(nodes_map, 'flickering-fire-bolt') > 0
        ) {
          Resource_Gain_Per_Hit_Total += 2
        }

        // "Destructive_Frozen_Orb": Frozen Orb's explosion restores 5 Mana when hitting a Frozen enemy.
        if (
          currentSkillVal(nodes_map)['name'] == 'frozen-orb' &&
          talentVal(nodes_map, 'destructive-frozen-orb') > 0 &&
          toggleVal(nodes_map, 'enemy-frozen')
        ) {
          Resource_Gain_Per_Hit_Total +=
            5 * statVal(nodes_map, 'Enemy_Boss_CC_Adjustment')
        }

        // "Shimmering_Frost_Nova": Frost Nova generates 4 Mana per enemy hit
        if (
          currentSkillVal(nodes_map)['name'] == 'frost-nova' &&
          talentVal(nodes_map, 'shimmering-frost-nova') > 0
        ) {
          Resource_Gain_Per_Hit_Total +=
            4 * statVal(nodes_map, 'Hits_Multiplier')
        }

        // ["Frigid_Breeze", 3]: Lucky Hit: Cold Damage against Vulnerable enemies has a 20% chance to generate {5/10/15/20/25/30/35/40/45/50} Mana.
        if (
          currentSkillVal(nodes_map)['tags'].has('cold') &&
          statVal(nodes_map, 'Enemy_Vulnerable') > 0
        ) {
          Resource_Gain_Per_Hit_Total +=
            5 *
            talentVal(nodes_map, 'frigid-breeze') *
            (0.2 * Lucky_Hit_Chance) *
            statVal(nodes_map, 'Enemy_Vulnerable')
        }

        //Incendiary Aspect Lucky Hit: Damage from your Pyromancy skills has up to a 12-17% chance to restore 10 Mana.
        if (
          tagsVal(nodes_map).has('pyromancy') &&
          aspectVal(nodes_map, 'incendiary-aspect').length > 0
        ) {
          Resource_Gain_Per_Hit_Total +=
            10 *
            aspectVal(nodes_map, 'incendiary-aspect')[0] *
            statVal(nodes_map, 'Total_Hits')
        }

        //Prodigy's Aspect Using a Cooldown restores {15/25} Mana.
        if (
          currentSkillVal(nodes_map)['tags'].has('cooldown') &&
          aspectVal(nodes_map, 'prodigys-aspect').length > 0
        ) {
          Resource_Gain_Per_Hit_Total += aspectVal(
            nodes_map,
            'prodigys-aspect',
          )[0]
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

        return Resource_Gain_Per_Hit_Total
      },
    ),

    Resource_Regeneration_Per_Second: new StatsNode(
      'Resource_Regeneration_Per_Second',
      () => {
        let Mana_Regeneration_Per_Second = 10
        const Draining_Per_Second = 0
        const Pre_Sim_Node = sorcererPresimVal(nodes_map)
        // Enhanced Ice Armor: While Ice Armor is active, your Mana Regeneration is increased by x25%.
        if (
          allSkillsVal(nodes_map).has('ice-armor') &&
          talentVal(nodes_map, 'enhanced-ice-armor') > 0
        ) {
          Mana_Regeneration_Per_Second *=
            1 +
            0.25 *
              Math.min(
                6 / statVal(nodes_map, 'Ice_Armor_Cooldown'),
                1,
              )
        }

        // Aspect of Assimilation: You have 8% increased Dodge Chance versus enemies affected by Damage Over Time effects. When you Dodge, you gain [5 - 10] of your Primary Resource.
        if (aspectVal(nodes_map, 'assimilation-aspect').length != 0) {
          const Enemy_Attacks_Per_Second = statVal(
            nodes_map,
            'Enemy_Attacks_Per_Second',
          )
          Mana_Regeneration_Per_Second +=
            Enemy_Attacks_Per_Second *
            aspectVal(nodes_map, 'assimilation-aspect')[0] *
            statVal(nodes_map, 'Total_Dodge_Chance')
        }

        //Prodigy's Aspect Using a Cooldown restores {15/25} Mana.
        if (aspectVal(nodes_map, 'prodigys-aspect').length != 0) {
          if (allSkillsVal(nodes_map).has('ice-armor')) {
            Mana_Regeneration_Per_Second +=
              (aspectVal(nodes_map, 'prodigys-aspect')[0] /
                statVal(nodes_map, 'Ice_Armor_Cooldown')) *
              statVal(nodes_map, 'Cast_Time')
          }
          if (allSkillsVal(nodes_map).has('frost-nova')) {
            Mana_Regeneration_Per_Second +=
              (aspectVal(nodes_map, 'prodigys-aspect')[0] /
                statVal(nodes_map, 'Frost_Nova_Cooldown')) *
              statVal(nodes_map, 'Cast_Time')
          }
        }

        // ["Invigorating_Conduit", 3]: Upon absorbing Crackling Energy, you gain {4/8/12/16/20/24/28/32/36/40} Mana.
        Mana_Regeneration_Per_Second +=
          4 *
          Pre_Sim_Node['crackling_energy_rate'] *
          talentVal(nodes_map, 'invigorating-conduit')

        // Tibault's Will (Generic Unique Pants): You deal 20-40% [x] increased damage while Unstoppable and for 4 seconds after. When you become Unstoppable, gain 50 of your Primary Resource.
        if (aspectVal(nodes_map, 'tibaults-will').length != 0) {
          let Tibaults_Proc_Rate = 0

          // "Teleport": Transform into lightning, becoming Unstoppable and surging to the target location, dealing {25/27.5/30/32.5/35/37.5/40/42.5/45/47.5}% damage around you upon arrival
          if (allSkillsVal(nodes_map).has('teleport')) {
            Tibaults_Proc_Rate +=
              1 / statVal(nodes_map, 'Teleport_Cooldown')
          }

          // Snowveiled Aspect Casting Ice Armor grants 30% bonus Armor and makes you Unstoppable for {3/5} seconds.
          if (
            allSkillsVal(nodes_map).has('ice-armor') &&
            aspectVal(nodes_map, 'snowveiled-aspect').length != 0
          ) {
            Tibaults_Proc_Rate +=
              1 / statVal(nodes_map, 'Ice_Armor_Cooldown')
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

          Mana_Regeneration_Per_Second += 50 * Tibaults_Proc_Rate
        }

        // Vampiric Power feed-the-coven
        // Lucky Hit: Conjuration, Companion, Minion and Bat Familiar attacks have up to a 60% chance to restore 10 Primary Resource to you and increase your Damage by 10% for 4 seconds.
        if (vampiricPowerVal(nodes_map, 'feed-the-coven')) {
          const Conjuration_Skills = new Set([
            'hydra',
            'lightning-spear',
            'ice-blades',
          ])
          let Conjuration_Lucky_Hit_Rate = 0
          for (const Skill in Pre_Sim_Node['skill_use_rate']) {
            if (Conjuration_Skills.has(Skill)) {
              Conjuration_Lucky_Hit_Rate +=
                Pre_Sim_Node['skill_use_rate'][Skill] *
                Pre_Sim_Node['cross_skill_stat'][Skill][
                  'lucky_hit_chance'
                ] *
                Pre_Sim_Node['cross_skill_stat'][Skill]['total_hits']
            }
          }
          const Minion_Lucky_Hit_Chance = 0.3 // completely made up value taken from bat stun chance on another vampiric power
          Mana_Regeneration_Per_Second +=
            10 *
            (Conjuration_Lucky_Hit_Rate +
              statVal(nodes_map, 'Vampiric_Bat_Rate') *
                Minion_Lucky_Hit_Chance)
        }

        // melted-heart-of-selig Gain 60 maximum Resource. 75% of incoming damage drains 2 Resource for every 1% of Life you would have lost instead.
        // if (
        //   aspectVal(nodes_map, 'melted-heart-of-selig').length != 0
        // ) {
        //   Draining_Per_Second +=
        //     aspectVal(nodes_map, 'melted-heart-of-selig')[0] *
        //     statVal(nodes_map, 'Enemy_Attacks_Per_Second')
        // }

        return Mana_Regeneration_Per_Second - Draining_Per_Second
      },
    ),

    Total_Lucky_Hit_Chance_Multiplier: new StatsNode(
      'Total_Lucky_Hit_Chance_Multiplier',
      () => {
        let Lucky_Hit_Chance_Bonus_Total = 0

        const Pre_Sim_Node = sorcererPresimVal(nodes_map)

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

        // ["Precision_Magic", 3]: Your Lucky Hit Chance is increased by +{5/10/15/20/25/30/35/40/45/50}%.
        Lucky_Hit_Chance_Bonus_Total +=
          0.05 * talentVal(nodes_map, 'precision-magic')

        //Aspect_of_Fortune Your Lucky Hit Chance is increased by +{10/20}% while you have a Barrier active.
        if (
          aspectVal(nodes_map, 'aspect-of-fortune').length > 0 &&
          Number(toggleVal(nodes_map, 'percent-barrier')) > 0
        ) {
          Lucky_Hit_Chance_Bonus_Total += aspectVal(
            nodes_map,
            'aspect-of-fortune',
          )[0]
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
      const Pre_Sim_Node = sorcererPresimVal(nodes_map)

      const enemy_spread = Number(statVal(nodes_map, 'Enemy_Spread'))
      const number_of_enemies = Number(
        toggleVal(nodes_map, 'number-of-enemies'),
      )
      const current_skill = currentSkillVal(nodes_map)['name']

      let Cooldown_Total = CooldownFromRanks(
        talentVal(nodes_map, current_skill),
        current_skill,
        currentSkillVal(nodes_map)['cooldown_seconds'],
      )

      // Enhanced Teleport: Teleport's Cooldown is decreased by 0.5 seconds per enemy hit, up to 3 seconds
      if (
        talentVal(nodes_map, 'enhanced-teleport') > 0 &&
        currentSkillVal(nodes_map)['name'] == 'teleport'
      ) {
        Cooldown_Total -= Math.min(
          0.5 * statVal(nodes_map, 'Total_Hits'),
          3,
        )
      }

      //Raiment_of_the Infinite After using Teleport, Close enemies are Pulled to you and Stunned for {2/3} seconds, but Teleport's Cooldown is increased by x20.0%.
      if (
        aspectVal(nodes_map, 'raiment-of-the-infinite').length > 0 &&
        currentSkillVal(nodes_map)['name'] == 'teleport'
      ) {
        Cooldown_Total *= 1.2
      }

      //Frostblitz Aspect Frost Nova gains an additional Charge but the Cooldown per Charge is increased by {30/40}%.
      if (
        aspectVal(nodes_map, 'frostblitz-aspect').length > 0 &&
        currentSkillVal(nodes_map)['name'] == 'frost-nova'
      ) {
        Cooldown_Total *=
          1 + aspectVal(nodes_map, 'frostblitz-aspect')[0]
      }

      // cooldown-reduction
      Cooldown_Total *=
        1 - aggregationVal(nodes_map, 'cooldown-reduction')

      // Vampiric Power 'anticipation'
      // Your Ultimate Skills gain 20% Cooldown Reduction. Your Ultimate Skills gain 12% increased damage for each nearby enemy affected by your Damage Over Time effects.
      if (
        tagsVal(nodes_map).has('ultimate') &&
        vampiricPowerVal(nodes_map, 'anticipation')
      ) {
        Cooldown_Total *= 0.8
      }

      // Elemental Summoner: Your Conjuration Skills have 10% reduced Cooldown or Mana cost.
      //                    They also deal bonus Damage equal to x3% of the total amount of your Bonus Damage with Cold, Fire, and Lightning.
      if (
        paragonVal(nodes_map, 'elemental-summoner') &&
        tagsVal(nodes_map).has('conjuration')
      ) {
        let Conjuration_Skill_Count = 0
        for (const skill of [
          'hydra',
          'ice-blades',
          'lightning-spear',
        ]) {
          if (allSkillsVal(nodes_map).has(skill)) {
            Conjuration_Skill_Count += 1
          }
        }
        Cooldown_Total *= 0.9 ** Conjuration_Skill_Count
      }

      // ['glinting-arc-lash', 1], Hitting a Stunned enemy with Arc Lash reduces your Cooldowns by 0.15 seconds.
      if (
        talentVal(nodes_map, 'glinting-arc-lash') > 0 &&
        toggleVal(nodes_map, 'enemy-stunned') &&
        'arc-lash' in Pre_Sim_Node['skill_use_rate']
      ) {
        const Arc_Lash_Total_Hits =
          1 +
          ProbabilityInCone(
            10,
            1 / 3,
            statVal(nodes_map, 'Enemy_Spread'),
          ) *
            (number_of_enemies - 1)
        Cooldown_Total -=
          0.15 *
          Pre_Sim_Node['skill_use_rate']['arc-lash'] *
          Arc_Lash_Total_Hits *
          statVal(nodes_map, 'Enemy_Boss_CC_Adjustment')
      }

      // Supreme Deep Freeze When Deep Freeze ends, your Non-Ultimate Cooldowns are  reset.
      if (
        talentVal(nodes_map, 'supreme-deep-freeze') > 0 &&
        allSkillsVal(nodes_map).has('deep-freeze') &&
        currentSkillVal(nodes_map)['name'] != 'deep-freeze'
      ) {
        Cooldown_Total *=
          1 -
          0.5 *
            (Cooldown_Total /
              statVal(nodes_map, 'Deep_Freeze_Cooldown'))
      }

      // Overflowing Energy: Crackling Energy hits 1 additional enemy. Each time Crackling Energy hits an enemy,
      // your Shock Skill Cooldowns are reduced by 0.1 seconds, increased to 0.25 seconds against Elites.
      if (talentVal(nodes_map, 'overflowing-energy') > 0) {
        const Crackling_Energy_Hits = statVal(
          nodes_map,
          'Crackling_Energy_Hits',
        )

        const Cooldown_Reduction =
          0.15 *
            Math.min(
              Number(toggleVal(nodes_map, 'enemy-elite')),
              Crackling_Energy_Hits,
            ) +
          0.1 * Crackling_Energy_Hits

        const Effective_Crackling_Energy_Time =
          0.5 / (Pre_Sim_Node['crackling_energy_uptime'] + 0.0001)
        Cooldown_Total *=
          Effective_Crackling_Energy_Time /
          (Effective_Crackling_Energy_Time + Cooldown_Reduction)
      }

      // Talent ['enhanced-ice-blades', 1], Ice Blades's Cooldown is reduced by .5 second each time it hits a Vulnerable enemy.
      if (
        talentVal(nodes_map, 'enhanced-ice-blades') > 0 &&
        currentSkillVal(nodes_map)['name'] == 'ice-blades' &&
        'ice-blades' in Pre_Sim_Node['skill_use_rate'] &&
        statVal(nodes_map, 'Enemy_Vulnerable') > 0
      ) {
        const Frost_Blade_Proc_Rate =
          Pre_Sim_Node['skill_use_rate']['ice-blades'] *
          Pre_Sim_Node['cross_skill_stat']['ice-blades'][
            'total_hits'
          ] *
          statVal(nodes_map, 'Enemy_Vulnerable')
        const alpha =
          Cooldown_Total / (1 / Frost_Blade_Proc_Rate + 0.5)
        Cooldown_Total -= alpha * 0.5
      }

      // Talent ['summoned-ice-blades', 1], // 20% of Enhanced Ice Blades's Cooldown reduction is applied to your other Skills.
      if (
        talentVal(nodes_map, 'summoned-ice-blades') > 0 &&
        currentSkillVal(nodes_map)['name'] != 'ice-blades' &&
        Cooldown_Total > 0 &&
        'ice-blades' in Pre_Sim_Node['skill_use_rate'] &&
        statVal(nodes_map, 'Enemy_Vulnerable') > 0
      ) {
        const Frost_Blade_Proc_Rate =
          Pre_Sim_Node['skill_use_rate']['ice-blades'] *
          Pre_Sim_Node['cross_skill_stat']['ice-blades'][
            'total_hits'
          ] *
          statVal(nodes_map, 'Enemy_Vulnerable')
        const alpha =
          Cooldown_Total / (1 / Frost_Blade_Proc_Rate + 0.1)
        Cooldown_Total -= alpha * 0.1
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
          'fire-bolt',
          'arc-lash',
          'spark',
          'frost-bolt',
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

      return Math.max(0, Cooldown_Total)
    }),

    Elemental_Attunement_Rate: new StatsNode(
      'Elemental_Attunement_Rate',
      () => {
        // Talent ['elemental-attunement', 3] Lucky Hit: Critical Strikes up to a {5/10/15/20/25/30/35/40/45/50}% chance to reset the Cooldown of one of your Defensive Skills.
        // Can only happen once every 10 seconds.

        if (talentVal(nodes_map, 'elemental-attunement') == 0) {
          return 0
        }
        const Pre_Sim_Node = sorcererPresimVal(nodes_map)
        let Proc_Rate = 0
        for (const Other_Skill in Pre_Sim_Node['skill_use_rate']) {
          Proc_Rate +=
            0.05 *
            talentVal(nodes_map, 'elemental-attunement') *
            Pre_Sim_Node['skill_use_rate'][Other_Skill] *
            Pre_Sim_Node['cross_skill_stat'][Other_Skill][
              'critical_chance'
            ] *
            Pre_Sim_Node['cross_skill_stat'][Other_Skill][
              'lucky_hit_chance'
            ] *
            Pre_Sim_Node['cross_skill_stat'][Other_Skill][
              'total_hits'
            ]
        }
        Proc_Rate = Math.min(0.1, Proc_Rate) // Proc can only occur once every 10 seconds.
        const Defensive_Skills = new Set([
          'flame-shield',
          'ice-armor',
          'teleport',
          'frost-nova',
        ])

        let Number_Of_Defensive_Skills = 0
        for (const Defensive of Defensive_Skills) {
          if (allSkillsVal(nodes_map).has(Defensive)) {
            Number_Of_Defensive_Skills += 1
          }
        }
        const Effective_Proc_Rate =
          Proc_Rate / Math.max(Number_Of_Defensive_Skills, 1)

        return Effective_Proc_Rate
      },
    ),

    Deep_Freeze_Cooldown: new StatsNode(
      'Deep_Freeze_Cooldown',
      () => {
        const Pre_Sim_Node = sorcererPresimVal(nodes_map)
        let Cooldown_Total = skillVal(nodes_map, 'deep-freeze')[
          'cooldown_seconds'
        ]

        // cooldown-reduction
        Cooldown_Total *=
          1 - aggregationVal(nodes_map, 'cooldown-reduction')

        // Vampiric Power hectic
        // For every 5 Basic Skills you cast, one of your active Cooldowns is reduced by 2 seconds.
        if (
          vampiricPowerVal(nodes_map, 'hectic') &&
          statVal(nodes_map, 'Number_Of_Cooldowns') > 0
        ) {
          let Proc_Rate = 0
          const Basic_Skills = new Set([
            'fire-bolt',
            'arc-lash',
            'spark',
            'frost-bolt',
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

        return Math.max(1, Cooldown_Total)
      },
    ),

    Flame_Shield_Cooldown: new StatsNode(
      'Flame_Shield_Cooldown',
      () => {
        let Flame_Shield_Cooldown_Total = 20
        // cooldown-reduction
        Flame_Shield_Cooldown_Total *=
          1 - aggregationVal(nodes_map, 'cooldown-reduction')

        // Talent ['supreme-deep-freeze', 1], When Deep Freeze ends, your Non-Ultimate Cooldowns are reduced by 100%.
        if (talentVal(nodes_map, 'supreme-deep-freeze') > 0) {
          Flame_Shield_Cooldown_Total *=
            1 -
            0.25 *
              (Flame_Shield_Cooldown_Total /
                statVal(nodes_map, 'Deep_Freeze_Cooldown'))
        }

        const Pre_Sim_Node = sorcererPresimVal(nodes_map)
        // Vampiric Power hectic
        // For every 5 Basic Skills you cast, one of your active Cooldowns is reduced by 2 seconds.
        if (
          vampiricPowerVal(nodes_map, 'hectic') &&
          statVal(nodes_map, 'Number_Of_Cooldowns') > 0
        ) {
          let Proc_Rate = 0
          const Basic_Skills = new Set([
            'fire-bolt',
            'arc-lash',
            'spark',
            'frost-bolt',
          ])
          for (const Skill in Pre_Sim_Node['skill_use_rate']) {
            if (Basic_Skills.has(Skill)) {
              Proc_Rate +=
                Pre_Sim_Node['skill_use_rate'][Skill] /
                (5 * statVal(nodes_map, 'Number_Of_Cooldowns'))
            }
          }
          const alpha =
            Flame_Shield_Cooldown_Total / (1 / Proc_Rate + 2)
          Flame_Shield_Cooldown_Total -= alpha * 2
        }

        // This is the effective proc rate for THIS skill (already divided by num defensive skills).
        let Cooldown_Reset_Rate = statVal(
          nodes_map,
          'Elemental_Attunement_Rate',
        )

        //Aspect-of-the Unwavering Taking direct damage has a {5/10}% chance to reset the Cooldown-of-one-of-your Defensive Skills.
        if (
          aspectVal(nodes_map, 'aspect-of-the-unwavering').length != 0
        ) {
          const Defensive_Skills = new Set([
            'flame-shield',
            'ice-armor',
            'teleport',
            'frost-nova',
          ])
          let Number_Of_Defensive_Skills = 0
          for (const Defensive of Defensive_Skills) {
            if (allSkillsVal(nodes_map).has(Defensive)) {
              Number_Of_Defensive_Skills += 1
            }
          }
          Cooldown_Reset_Rate +=
            (statVal(nodes_map, 'Enemy_Attacks_Per_Second') *
              aspectVal(nodes_map, 'aspect-of-the-unwavering')[0]) /
            Number_Of_Defensive_Skills
        }

        // Resets are Exponential with rate Cooldown_Reset_Rate.
        // Updated cooldown is Updated_Cooldown = min(exp(lambda), Previous_Cooldown)
        if (Cooldown_Reset_Rate > 0) {
          Flame_Shield_Cooldown_Total =
            (1 / Cooldown_Reset_Rate) *
            (1 -
              Math.exp(
                -Cooldown_Reset_Rate * Flame_Shield_Cooldown_Total,
              ))
        }

        return Math.max(1, Flame_Shield_Cooldown_Total)
      },
    ),

    Ice_Armor_Cooldown: new StatsNode('Ice_Armor_Cooldown', () => {
      let Ice_Armor_Cooldown_Total = 20

      // cooldown-reduction
      Ice_Armor_Cooldown_Total *=
        1 - aggregationVal(nodes_map, 'cooldown-reduction')

      // Talent ['supreme-deep-freeze', 1], When Deep Freeze ends, your Non-Ultimate Cooldowns are reduced by 50%.
      if (talentVal(nodes_map, 'supreme-deep-freeze') > 0) {
        Ice_Armor_Cooldown_Total *=
          1 -
          0.25 *
            (Ice_Armor_Cooldown_Total /
              statVal(nodes_map, 'Deep_Freeze_Cooldown'))
      }

      const Pre_Sim_Node = sorcererPresimVal(nodes_map)
      // Vampiric Power hectic
      // For every 5 Basic Skills you cast, one of your active Cooldowns is reduced by 2 seconds.
      if (
        vampiricPowerVal(nodes_map, 'hectic') &&
        statVal(nodes_map, 'Number_Of_Cooldowns') > 0
      ) {
        let Proc_Rate = 0
        const Basic_Skills = new Set([
          'fire-bolt',
          'arc-lash',
          'spark',
          'frost-bolt',
        ])
        for (const Skill in Pre_Sim_Node['skill_use_rate']) {
          if (Basic_Skills.has(Skill)) {
            Proc_Rate +=
              Pre_Sim_Node['skill_use_rate'][Skill] /
              (5 * statVal(nodes_map, 'Number_Of_Cooldowns'))
          }
        }
        const alpha = Ice_Armor_Cooldown_Total / (1 / Proc_Rate + 2)
        Ice_Armor_Cooldown_Total -= alpha * 2
      }

      // This is the effective proc rate for THIS skill (already divided by num defensive skills).
      let Cooldown_Reset_Rate = statVal(
        nodes_map,
        'Elemental_Attunement_Rate',
      )

      //Aspect-of-the Unwavering Taking direct damage has a {5/10}% chance to reset the Cooldown-of-one-of-your Defensive Skills.
      if (
        aspectVal(nodes_map, 'aspect-of-the-unwavering').length != 0
      ) {
        const Defensive_Skills = new Set([
          'flame-shield',
          'ice-armor',
          'teleport',
          'frost-nova',
        ])
        let Number_Of_Defensive_Skills = 0
        for (const Defensive of Defensive_Skills) {
          if (allSkillsVal(nodes_map).has(Defensive)) {
            Number_Of_Defensive_Skills += 1
          }
        }
        Cooldown_Reset_Rate +=
          (statVal(nodes_map, 'Enemy_Attacks_Per_Second') *
            aspectVal(nodes_map, 'aspect-of-the-unwavering')[0]) /
          Number_Of_Defensive_Skills
      }

      // Resets are Exponential with rate Cooldown_Reset_Rate.
      // Updated cooldown is Updated_Cooldown = min(exp(lambda), Previous_Cooldown)
      if (Cooldown_Reset_Rate > 0) {
        Ice_Armor_Cooldown_Total =
          (1 / Cooldown_Reset_Rate) *
          (1 -
            Math.exp(-Cooldown_Reset_Rate * Ice_Armor_Cooldown_Total))
      }

      return Math.max(1, Ice_Armor_Cooldown_Total)
    }),

    Teleport_Cooldown: new StatsNode('Teleport_Cooldown', () => {
      let Teleport_Cooldown_Total = CooldownFromRanks(
        talentVal(nodes_map, 'teleport'),
        'teleport',
        11,
      )

      // cooldown-reduction
      Teleport_Cooldown_Total *=
        1 - aggregationVal(nodes_map, 'cooldown-reduction')

      const Pre_Sim_Node = sorcererPresimVal(nodes_map)
      // Vampiric Power hectic
      // For every 5 Basic Skills you cast, one of your active Cooldowns is reduced by 2 seconds.
      if (
        vampiricPowerVal(nodes_map, 'hectic') &&
        statVal(nodes_map, 'Number_Of_Cooldowns') > 0
      ) {
        let Proc_Rate = 0
        const Basic_Skills = new Set([
          'fire-bolt',
          'arc-lash',
          'spark',
          'frost-bolt',
        ])
        for (const Skill in Pre_Sim_Node['skill_use_rate']) {
          if (Basic_Skills.has(Skill)) {
            Proc_Rate +=
              Pre_Sim_Node['skill_use_rate'][Skill] /
              (5 * statVal(nodes_map, 'Number_Of_Cooldowns'))
          }
        }
        const alpha = Teleport_Cooldown_Total / (1 / Proc_Rate + 2)
        Teleport_Cooldown_Total -= alpha * 2
      }

      // Talent ['supreme-deep-freeze', 1], When Deep Freeze ends, your Non-Ultimate Cooldowns are reduced by 50%.
      if (talentVal(nodes_map, 'supreme-deep-freeze') > 0) {
        Teleport_Cooldown_Total *=
          1 -
          0.25 *
            (Teleport_Cooldown_Total /
              statVal(nodes_map, 'Deep_Freeze_Cooldown'))
      }

      // This is the effective proc rate for THIS skill (already divided by num defensive skills).
      let Cooldown_Reset_Rate = statVal(
        nodes_map,
        'Elemental_Attunement_Rate',
      )

      //Aspect-of-the Unwavering Taking direct damage has a {5/10}% chance to reset the Cooldown-of-one-of-your Defensive Skills.
      if (
        aspectVal(nodes_map, 'aspect-of-the-unwavering').length != 0
      ) {
        const Defensive_Skills = new Set([
          'flame-shield',
          'ice-armor',
          'teleport',
          'frost-nova',
        ])
        let Number_Of_Defensive_Skills = 0
        for (const Defensive of Defensive_Skills) {
          if (allSkillsVal(nodes_map).has(Defensive)) {
            Number_Of_Defensive_Skills += 1
          }
        }
        Cooldown_Reset_Rate +=
          (statVal(nodes_map, 'Enemy_Attacks_Per_Second') *
            aspectVal(nodes_map, 'aspect-of-the-unwavering')[0]) /
          Number_Of_Defensive_Skills
      }

      // Resets are Exponential with rate Cooldown_Reset_Rate.
      // Updated cooldown is Updated_Cooldown = min(exp(lambda), Previous_Cooldown)
      if (Cooldown_Reset_Rate > 0) {
        Teleport_Cooldown_Total =
          (1 / Cooldown_Reset_Rate) *
          (1 -
            Math.exp(-Cooldown_Reset_Rate * Teleport_Cooldown_Total))
      }

      return Math.max(1, Teleport_Cooldown_Total)
    }),

    Frost_Nova_Cooldown: new StatsNode('Frost_Nova_Cooldown', () => {
      const number_of_enemies = Number(
        toggleVal(nodes_map, 'number-of-enemies'),
      )
      let Frost_Nova_Cooldown_Total = CooldownFromRanks(
        talentVal(nodes_map, 'frost-nova'),
        'frost-nova',
        24,
      )

      // cooldown-reduction
      Frost_Nova_Cooldown_Total *=
        1 - aggregationVal(nodes_map, 'cooldown-reduction')

      //Frostblitz Aspect Frost Nova gains an additional Charge but the Cooldown per Charge is increased by {30/40}%.
      if (aspectVal(nodes_map, 'frostblitz-aspect').length > 0) {
        Frost_Nova_Cooldown_Total *=
          1 + aspectVal(nodes_map, 'frostblitz-aspect')[0]
      }

      // Talent ['supreme-deep-freeze', 1], When Deep Freeze ends, your Non-Ultimate Cooldowns are reduced by 50%.
      if (talentVal(nodes_map, 'supreme-deep-freeze') > 0) {
        Frost_Nova_Cooldown_Total *=
          1 -
          0.25 *
            (Frost_Nova_Cooldown_Total /
              statVal(nodes_map, 'Deep_Freeze_Cooldown'))
      }

      const Pre_Sim_Node = sorcererPresimVal(nodes_map)
      // Vampiric Power hectic
      // For every 5 Basic Skills you cast, one of your active Cooldowns is reduced by 2 seconds.
      if (
        vampiricPowerVal(nodes_map, 'hectic') &&
        statVal(nodes_map, 'Number_Of_Cooldowns') > 0
      ) {
        let Proc_Rate = 0
        const Basic_Skills = new Set([
          'fire-bolt',
          'arc-lash',
          'spark',
          'frost-bolt',
        ])
        for (const Skill in Pre_Sim_Node['skill_use_rate']) {
          if (Basic_Skills.has(Skill)) {
            Proc_Rate +=
              Pre_Sim_Node['skill_use_rate'][Skill] /
              (5 * statVal(nodes_map, 'Number_Of_Cooldowns'))
          }
        }
        const alpha = Frost_Nova_Cooldown_Total / (1 / Proc_Rate + 2)
        Frost_Nova_Cooldown_Total -= alpha * 2
      }

      // Enhanced Frost Nova: Killing enemies Frozen by Frost Nova reduces its Cooldown by 1 seconds, up to 4 seconds per cast.
      if (talentVal(nodes_map, 'enhanced-frost-nova') > 0) {
        const Frost_Nova_Uptime = Math.min(
          1,
          3 / Frost_Nova_Cooldown_Total,
        )
        const Frost_Nova_Hits = Math.min(
          number_of_enemies,
          1 +
            ProbabilityInCircle(
              0,
              10,
              statVal(nodes_map, 'Enemy_Spread'),
            ) *
              (number_of_enemies - 1),
        )
        Frost_Nova_Cooldown_Total -= Math.min(
          4,
          1 *
            Frost_Nova_Uptime *
            Frost_Nova_Hits *
            statVal(nodes_map, 'Enemy_Kill_Rate'),
        )
        // const Time_To_Death =
        //   1 / (statVal(nodes_map, 'Enemy_Kill_Rate') + 0.0001)
        // Frost_Nova_Cooldown_Total *=
        //   Time_To_Death / (2 + Time_To_Death)
      }

      // This is the effective proc rate for THIS skill (already divided by num defensive skills).
      let Cooldown_Reset_Rate = statVal(
        nodes_map,
        'Elemental_Attunement_Rate',
      )

      //Aspect-of-the Unwavering Taking direct damage has a {5/10}% chance to reset the Cooldown-of-one-of-your Defensive Skills.
      if (
        aspectVal(nodes_map, 'aspect-of-the-unwavering').length != 0
      ) {
        const Defensive_Skills = new Set([
          'flame-shield',
          'ice-armor',
          'teleport',
          'frost-nova',
        ])
        let Number_Of_Defensive_Skills = 0
        for (const Defensive of Defensive_Skills) {
          if (allSkillsVal(nodes_map).has(Defensive)) {
            Number_Of_Defensive_Skills += 1
          }
        }
        Cooldown_Reset_Rate +=
          (statVal(nodes_map, 'Enemy_Attacks_Per_Second') *
            aspectVal(nodes_map, 'aspect-of-the-unwavering')[0]) /
          Number_Of_Defensive_Skills
      }

      // Resets are Exponential with rate Cooldown_Reset_Rate.
      // Updated cooldown is Updated_Cooldown = min(exp(lambda), Previous_Cooldown)
      if (Cooldown_Reset_Rate > 0) {
        Frost_Nova_Cooldown_Total =
          (1 / Cooldown_Reset_Rate) *
          (1 -
            Math.exp(
              -Cooldown_Reset_Rate * Frost_Nova_Cooldown_Total,
            ))
      }

      return Math.max(1, Frost_Nova_Cooldown_Total)
    }),

    Inferno_Cooldown: new StatsNode('Inferno_Cooldown', () => {
      let Inferno_Cooldown_Total = 45

      // cooldown-reduction
      Inferno_Cooldown_Total *=
        1 - aggregationVal(nodes_map, 'cooldown-reduction')

      const Pre_Sim_Node = sorcererPresimVal(nodes_map)
      // Vampiric Power hectic
      // For every 5 Basic Skills you cast, one of your active Cooldowns is reduced by 2 seconds.
      if (
        vampiricPowerVal(nodes_map, 'hectic') &&
        statVal(nodes_map, 'Number_Of_Cooldowns') > 0
      ) {
        let Proc_Rate = 0
        const Basic_Skills = new Set([
          'fire-bolt',
          'arc-lash',
          'spark',
          'frost-bolt',
        ])
        for (const Skill in Pre_Sim_Node['skill_use_rate']) {
          if (Basic_Skills.has(Skill)) {
            Proc_Rate +=
              Pre_Sim_Node['skill_use_rate'][Skill] /
              (5 * statVal(nodes_map, 'Number_Of_Cooldowns'))
          }
        }
        const alpha = Inferno_Cooldown_Total / (1 / Proc_Rate + 2)
        Inferno_Cooldown_Total -= alpha * 2
      }

      return Math.max(1, Inferno_Cooldown_Total)
    }),

    Total_Movement_Speed: new StatsNode(
      'Total_Movement_Speed',
      () => {
        let Movement_Speed_Total =
          1 + aggregationVal(nodes_map, 'movement-speed')

        const Pre_Sim_Node = sorcererPresimVal(nodes_map)

        // // 'movement-speed-for-seconds-after-killing-an-elite'

        //"Flickering_Arc_Lash":`Gain +6% Movement Speed for 5 seconds per enemy hit with Arc Lash, up to +18%.
        if (talentVal(nodes_map, 'flickering-arc-lash') > 0) {
          let Arc_Lash_Hit_Rate = 0
          if ('arc-lash' in Pre_Sim_Node['skill_use_rate']) {
            Arc_Lash_Hit_Rate =
              Pre_Sim_Node['skill_use_rate']['arc-lash'] *
              Pre_Sim_Node['cross_skill_stat']['arc-lash'][
                'total_hits'
              ]
          }
          if (Arc_Lash_Hit_Rate * 5 > 1) {
            Movement_Speed_Total += 0.18
          } else {
            Movement_Speed_Total +=
              0.06 * Math.min(3, Arc_Lash_Hit_Rate * 5)
          }
        }

        // Aspect-of-the Bounding Conduit Gain {25/30}% Movement Speed for 3.0 seconds after Teleporting.
        if (
          aspectVal(nodes_map, 'aspect-of-the-bounding-conduit')
            .length > 0 &&
          allSkillsVal(nodes_map).has('teleport')
        ) {
          Movement_Speed_Total +=
            aspectVal(
              nodes_map,
              'aspect-of-the-bounding-conduit',
            )[0] *
            Math.min(3 / statVal(nodes_map, 'Teleport_Cooldown'), 1)
        }

        // Enhanced Flame Shield: Flame Shield grants +25% Movement Speed while active.
        Movement_Speed_Total +=
          (1.25 *
            talentVal(nodes_map, 'enhanced-flame-shield') *
            Number(allSkillsVal(nodes_map).has('flame-shield')) *
            2) /
          statVal(nodes_map, 'Flame_Shield_Cooldown')

        // ["Conduction", 3]: Critical Strikes with Shock Skills increase your Movement Speed by +{3/6/9/12/15/18/21/24/27/30}% for 3 seconds
        if (talentVal(nodes_map, 'conduction') > 0) {
          const Shock_Skills = new Set([
            'arc-lash',
            'spark',
            'charged-bolts',
            'chain-lightning',
            'teleport',
            'ball-lightning',
          ])
          let Conduction_Rate = 0
          for (const Other_Skill in Pre_Sim_Node['skill_use_rate']) {
            if (Shock_Skills.has(Other_Skill)) {
              Conduction_Rate +=
                Pre_Sim_Node['skill_use_rate'][Other_Skill] *
                Pre_Sim_Node['cross_skill_stat'][Other_Skill][
                  'critical_chance'
                ] *
                Pre_Sim_Node['cross_skill_stat'][Other_Skill][
                  'total_hits'
                ]
            }
          }
          Movement_Speed_Total +=
            talentVal(nodes_map, 'conduction') *
            0.03 *
            Math.min(1, Conduction_Rate * 3)
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
        // Charged Aspect Collecting Crackling Energy increases your Movement Speed by +{10/15}% for 8.0 seconds.
        if (aspectVal(nodes_map, 'charged-aspect').length > 0) {
          Movement_Speed_Total +=
            Math.min(Pre_Sim_Node['crackling_energy_rate'] * 8, 1) *
            aspectVal(nodes_map, 'charged-aspect')[0]
        }

        // Flamewalker's Aspect Coming in contact with your Firewall grants you +{15/25}% Movement Speed for 6.0 seconds.
        if (aspectVal(nodes_map, 'flamewalkers-aspect').length > 0) {
          if (
            !enchantmentVal(nodes_map).has('firewall') &&
            'firewall' in Pre_Sim_Node['skill_use_rate']
          ) {
            Movement_Speed_Total +=
              aspectVal(nodes_map, 'flamewalkers-aspect')[0] *
              Math.min(
                Pre_Sim_Node['skill_use_rate']['firewall'] * 6,
                1,
              )
          } else if (enchantmentVal(nodes_map).has('firewall')) {
            Movement_Speed_Total +=
              aspectVal(nodes_map, 'flamewalkers-aspect')[0] *
              Pre_Sim_Node['dot_uptime']
          }
        }

        // Vampiric Power moonrise
        // Hitting an enemy with a Basic Skill grants you 4% Attack Speed for 10 seconds, stacking up to 5 times. Upon reaching maximum stacks, you enter a Vampiric Bloodrage, gaining 160% Basic Skill damage and 15% Movement Speed for 10 seconds.
        if (vampiricPowerVal(nodes_map, 'moonrise')) {
          let Basic_Skill_Rate = 0
          const Basic_Skills = new Set([
            'fire-bolt',
            'arc-lash',
            'spark',
            'frost-bolt',
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

    Enemy_Frozen: new StatsNode('Enemy_Frozen', () => {
      let Enemy_Frozen = Number(toggleVal(nodes_map, 'enemy-frozen'))

      // "Greater_Ice_Shards": While you have a Barrier active, casts of Ice Shards treat enemies as if they were Frozen.
      if (
        currentSkillVal(nodes_map)['name'] == 'ice-shards' &&
        talentVal(nodes_map, 'greater-ice-shards') > 0 &&
        Number(toggleVal(nodes_map, 'percent-barrier')) > 0
      ) {
        Enemy_Frozen = 1
      }
      return Enemy_Frozen
    }),

    Number_Of_Cast: new StatsNode('Number_Of_Cast', () => {
      let Number_Of_Cast = 1

      // When a player uses incinerate, they will want to channel the skill as long as possible.
      if (currentSkillVal(nodes_map)['name'] == 'incinerate') {
        const max_mana = statVal(nodes_map, 'Max_Resource')
        const cost_per_cast = -statVal(
          nodes_map,
          'Delta_Resources_Per_Cast',
        )
        Number_Of_Cast = Math.floor(max_mana / cost_per_cast)
      }
      if (currentSkillVal(nodes_map)['name'] == 'deep-freeze') {
        Number_Of_Cast = 8
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
        case 'fire-bolt':
          base_cast_time = 0.65
          break
        case 'frost-bolt':
          base_cast_time = 0.66
          break
        case 'arc-lash':
          base_cast_time = 0.66
          break
        case 'spark':
          base_cast_time = 0.64
          break
        case 'ice-shards':
          base_cast_time = 0.63
          break
        case 'frozen-orb':
          base_cast_time = 0.77
          break
        case 'fireball':
          base_cast_time = 0.81
          break
        case 'incinerate':
          base_cast_time = 0.26
          break
        case 'charged-bolts':
          base_cast_time = 0.77
          break
        case 'chain-lightning':
          base_cast_time = 0.83
          break
        case 'hydra':
          base_cast_time = 1.21
          break
        case 'frost-blades':
          base_cast_time = 1.0
          break
        case 'lightning-spear':
          base_cast_time = 1.03
          break
        case 'blizzard':
          base_cast_time = 0.87
          break
        case 'meteor':
          base_cast_time = 0.85
          break
        case 'firewall':
          base_cast_time = 1.15
          break
        case 'ball-lightning':
          base_cast_time = 0.63
          break
        case 'inferno':
          base_cast_time = 0.63
          break
        case 'deep-freeze':
          base_cast_time = 0.5
          break
        case 'teleport':
          base_cast_time = 0.65
          break
        case 'flame-shield':
          base_cast_time = 0
          break
        case 'unstable-currents':
          base_cast_time = 0
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
      const Pre_Sim_Node = sorcererPresimVal(nodes_map)

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

    Max_Dot_Duration: new StatsNode('Max_Dot_Duration', () => {
      let Dot_Duration = 0
      switch (currentSkillVal(nodes_map)['name']) {
        case 'fire-bolt':
          Dot_Duration = 8
          break
        case 'incinerate':
          Dot_Duration = statVal(nodes_map, 'Number_Of_Cast')
          break
        case 'hydra':
          if (talentVal(nodes_map, 'summoned-hydra') > 0) {
            Dot_Duration = 16
          }
          break
        case 'meteor':
          Dot_Duration = 3
          break
        case 'firewall':
          Dot_Duration = 8
          break
        case 'inferno':
          Dot_Duration = 8
          break
      }

      if (
        enchantmentVal(nodes_map).has('fire-bolt') &&
        currentSkillVal(nodes_map)['modifiers']['flat'] > 0
      ) {
        if (Dot_Duration < 8) {
          Dot_Duration = 8
        }
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

    Crackling_Energy_Hits: new StatsNode(
      'Crackling_Energy_Hits',
      () => {
        const number_of_enemies = Number(
          toggleVal(nodes_map, 'number-of-enemies'),
        )
        let Max_Hits = 3

        // Mystical Teleport: For 4 seconds after Teleporting, Crackling Energy hits 2 additional enemies.
        if (
          talentVal(nodes_map, 'mystical-teleport') > 0 &&
          allSkillsVal(nodes_map).has('teleport')
        ) {
          const Mystical_Teleport_Uptime = Math.min(
            4 / statVal(nodes_map, 'Teleport_Cooldown'),
            1,
          )
          Max_Hits += 2 * Mystical_Teleport_Uptime
        }
        // Overflowing Energy: Crackling Energy hits 1 additional enemy. Each time Crackling Energy hits an enemy,
        // your Shock Skill Cooldowns are reduced by 0.1 seconds, increased to 0.25 seconds against Elites.
        if (talentVal(nodes_map, 'overflowing-energy') > 0) {
          Max_Hits += 1
        }

        // Aspect-of-Abundant Energy: Crackling Energy has a {30/40}% chance to chain to an additional enemy.
        if (
          aspectVal(nodes_map, 'aspect-of-abundant-energy').length > 0
        ) {
          Max_Hits += aspectVal(
            nodes_map,
            'aspect-of-abundant-energy',
          )[0]
        }

        return Math.min(Max_Hits, number_of_enemies)
      },
    ),

    Crackling_Energy_Damage: new StatsNode(
      'Crackling_Energy_Damage',
      () => {
        const Pre_Sim_Node = sorcererPresimVal(nodes_map)
        const Crackling_Energy_Modifier = 0.2

        const Weapon_Damage = aggregationVal(
          nodes_map,
          'weapon-damage',
        )

        let Crackling_Energy_Created = statVal(
          nodes_map,
          'Crackling_Energy_Created',
        )
        const Crackling_Energy_Hits = statVal(
          nodes_map,
          'Crackling_Energy_Hits',
        )

        // Supreme Unstable Currents: While Unstable Currents is active, Crackling Energy continually pulses 25% faster and consumes no charges.
        // Counts for damage purposes but not pick up purposes.
        if (
          talentVal(nodes_map, 'supreme-unstable-currents') &&
          currentSkillVal(nodes_map)['name'] == 'unstable-currents' &&
          'crackling_energy_rate' in Pre_Sim_Node
        ) {
          // S2 UpdateCrackling Energy continually pulses 25% faster

          const Rate = Pre_Sim_Node['crackling_energy_rate']
          if (Rate == 0) {
            return 0
          }

          const Equilibrium_Crackling_Energy =
            Rate * 0.5 > 1 ? 10 : Rate * 0.5
          // No benefit from talent. Already capped
          if (Equilibrium_Crackling_Energy >= 10) {
            Crackling_Energy_Created = 5
          } else {
            // We may or may not have a cracking energy and so we scale up the rate by those odds.
            const lambda = Rate / (1 - Equilibrium_Crackling_Energy)
            const Time_Before_Crackling_Energy =
              (1 / lambda) * (1 - Math.exp(-lambda * 10))
            // Once you have a crackling energy, it dumps into enemies every 0.5 seconds so it's like we created one
            // every 0.5 seconds for the remaining duration of Crackling Energy.
            Crackling_Energy_Created =
              1.25 * 2 * (10 - Time_Before_Crackling_Energy) -
              Math.max(10 * Rate - 10, 0)
          }
        }

        // Ceaseless Conduit: Crackling Energy has a 25% chance to not consume a Charge when triggered. Crackling Energy's damage is increased by x3% per 20 total Intelligence you have.
        if (paragonVal(nodes_map, 'ceaseless-conduit')) {
          // Geometric series.
          Crackling_Energy_Created *= 1 / 0.75
        }

        return (
          Crackling_Energy_Created *
          Crackling_Energy_Modifier *
          Weapon_Damage *
          Crackling_Energy_Hits *
          SorcererDamageMultiplier(
            new Set(['crackling-energy', 'lightning']),
            nodes_map,
          )
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
      const Pre_Sim_Node = sorcererPresimVal(nodes_map)

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
      const Pre_Sim_Node = sorcererPresimVal(nodes_map)
      // Prime Inferno: Inferno repeatedly Pulls enemies to its center.
      if (
        talentVal(nodes_map, 'prime-inferno') &&
        'inferno' in Pre_Sim_Node['skill_use_rate']
      ) {
        enemy_spread -=
          10 *
          Math.min(1, 11 * Pre_Sim_Node['skill_use_rate']['inferno'])
      }

      //Raiment_of_the Infinite After using Teleport, Close enemies are Pulled to you and Stunned for {2/3} seconds, but Teleport's Cooldown is increased by x20.0%.
      if (
        allSkillsVal(nodes_map).has('teleport') &&
        aspectVal(nodes_map, 'raiment-of-the-infinite').length > 0
      ) {
        // Teleport Enchantment
        if (enchantmentVal(nodes_map).has('teleport')) {
          enemy_spread -=
            5 *
            Math.min(
              1,
              5 *
                (1 /
                  CooldownFromRanks(
                    talentVal(nodes_map, 'teleport'),
                    'teleport-enchantment',
                    17,
                  )),
            )
        }

        enemy_spread -=
          5 *
          Math.min(
            1,
            5 * (1 / statVal(nodes_map, 'Teleport_Cooldown')),
          )
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

    Enemies_Stunned: new StatsNode('Enemies_Stunned', () => {
      const number_of_enemies = Number(
        toggleVal(nodes_map, 'number-of-enemies'),
      )

      let Enemies_Stunned = 0

      // Arc Lash every 10th cast stuns
      if (currentSkillVal(nodes_map)['name'] == 'arc-lash') {
        Enemies_Stunned += 0.1 * statVal(nodes_map, 'Total_Hits')
      }

      // Enchantment Arc Lash: When you use a Cooldown, enemies near you are Stunned for .5 seconds.
      if (
        enchantmentVal(nodes_map).has('arc-lash') &&
        statVal(nodes_map, 'Cooldown') > 0
      ) {
        Enemies_Stunned += Math.min(
          1,
          10 ** 2 / statVal(nodes_map, 'Enemy_Spread') ** 2,
        )
      }

      // ['mages-ball-lightning', 1], //After hitting Close enemies 50 times with Ball Lightning, your next cast of it Stuns enemies hit for 1 seconds.
      if (
        currentSkillVal(nodes_map)['name'] == 'ball-lightning' &&
        talentVal(nodes_map, 'mages-ball-lightning') > 0
      ) {
        Enemies_Stunned += Math.min(
          number_of_enemies / 2,
          statVal(nodes_map, 'Total_Hits') ** 2 / 50,
        )
      }

      // ['invoked-lightning-spear', 1], //Lightning Spear Stuns enemies for 2 seconds when Critically Striking.
      if (
        currentSkillVal(nodes_map)['name'] == 'lightning-spear' &&
        talentVal(nodes_map, 'invoked-lightning-spear') > 0
      ) {
        Enemies_Stunned +=
          statVal(nodes_map, 'Total_Hits') *
          statVal(nodes_map, 'Critical_Chance')
      }

      //Talent ['convulsions', 3], //Lucky Hit: Shock Skills have a {3/6/9/12/15/18/21/24/27/30}% chance to Stun enemies for 3 seconds.
      if (
        talentVal(nodes_map, 'convulsions') > 0 &&
        tagsVal(nodes_map).has('shock')
      ) {
        Enemies_Stunned +=
          0.03 *
          talentVal(nodes_map, 'convulsions') *
          statVal(nodes_map, 'Total_Hits') *
          statVal(nodes_map, 'Total_Lucky_Hit_Chance_Multiplier')
      }

      //Raiment_of_the Infinite After using Teleport, Close enemies are Pulled to you and Stunned for {2/3} seconds, but Teleport's Cooldown is increased by x20.0%.
      if (
        allSkillsVal(nodes_map).has('teleport') &&
        aspectVal(nodes_map, 'raiment-of-the-infinite').length > 0
      ) {
        Enemies_Stunned +=
          (1 +
            Math.min(
              1,
              10 ** 2 / statVal(nodes_map, 'Enemy_Spread') ** 2,
            ) *
              (number_of_enemies - 1)) *
          (1 / statVal(nodes_map, 'Teleport_Cooldown'))

        if (enchantmentVal(nodes_map).has('teleport')) {
          Enemies_Stunned +=
            (1 +
              Math.min(
                1,
                10 ** 2 / statVal(nodes_map, 'Enemy_Spread') ** 2,
              ) *
                (number_of_enemies - 1)) *
            (1 /
              CooldownFromRanks(
                talentVal(nodes_map, 'teleport'),
                'teleport-enchantment',
                17,
              ))
        }
      }

      // Vampiric Power flowing-veins
      // Casting a Mastery, Weapon Mastery, Macabre, Wrath, or Imbuement Skill calls a bat ally to attack nearby enemies, dealing 80% Physical damage with a 30% chance to Stun.	call-familiar
      // You deal 60% increased Damage Over Time to enemies that are moving or affected by a Vampiric Curse.
      if (
        vampiricPowerVal(nodes_map, 'flowing-veins') &&
        tagsVal(nodes_map).has('mastery')
      ) {
        Enemies_Stunned += 0.3
      }

      return (
        Math.min(number_of_enemies, Enemies_Stunned) *
        statVal(nodes_map, 'Enemy_Boss_CC_Adjustment')
      )
    }),

    Shatter_Damage_Multiplier: new StatsNode(
      'Shatter_Damage_Multiplier',
      () => {
        const number_of_enemies = Number(
          toggleVal(nodes_map, 'number-of-enemies'),
        )

        let Shatter_Uptime = 0
        // Keystone Talent ['shatter', 1] After Freeze expires, enemies explode for 25% of the damage you dealt to them while Frozen.
        if (talentVal(nodes_map, 'shatter') > 0) {
          if (allSkillsVal(nodes_map).has('frost-nova')) {
            Shatter_Uptime +=
              Math.min(
                1,
                5 / statVal(nodes_map, 'Frost_Nova_Cooldown'),
              ) *
              Math.min(
                1,
                10 ** 2 / statVal(nodes_map, 'Enemy_Spread') ** 2,
              )
          }
          if (toggleVal(nodes_map, 'enemy-frozen')) {
            Shatter_Uptime = Math.min(Shatter_Uptime, 0.25)
          }
        }

        let Shattered_Aspect_Multiplier = 1
        //Shattered Aspect Explosions from the Shatter Key Passive deal x{30/40}% increased damage if enemies die while Frozen.
        if (aspectVal(nodes_map, 'shattered-aspect').length > 0) {
          Shattered_Aspect_Multiplier +=
            aspectVal(nodes_map, 'shattered-aspect')[0] *
            (statVal(nodes_map, 'Enemies_Killed') / number_of_enemies)
        }

        return (
          1 +
          0.25 *
            Shatter_Uptime *
            Shattered_Aspect_Multiplier *
            (1 +
              Math.min(
                1,
                10 ** 2 / statVal(nodes_map, 'Enemy_Spread') ** 2,
              ) *
                (number_of_enemies - 1)) *
            statVal(nodes_map, 'Enemy_Boss_CC_Adjustment')
        )
      },
    ),

    Number_Of_Cooldowns: new StatsNode('Number_Of_Cooldowns', () => {
      let Number_Of_Cooldowns = 0
      const Core_Mastery_Skills = new Set([
        'ice-shards',
        'charged-bolts',
        'chain-lightning',
        'incinerate',
        'fireball',
        'frozen-orb',
        'blizzard',
        'ball-lightning',
        'meteor',
        'firewall',
      ])
      const Basic_Skills = new Set([
        'fire-bolt',
        'arc-lash',
        'spark',
        'frost-bolt',
      ])

      for (const Skill of allSkillsVal(nodes_map)) {
        if (
          !Basic_Skills.has(Skill) &&
          !Core_Mastery_Skills.has(Skill)
        ) {
          Number_Of_Cooldowns += 1
        }
      }

      return Number_Of_Cooldowns
    }),

    Vampiric_Curse_Uptime: new StatsNode(
      'Vampiric_Curse_Uptime',
      () => {
        let Vampiric_Curse_Rate = 0
        const Pre_Sim_Node = sorcererPresimVal(nodes_map)
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
          const Conjuration_Skills = new Set([
            'hydra',
            'lightning-spear',
            'ice-blades',
          ])
          let Conjuration_Skill_Hit_Rate = 0
          for (const Skill in Pre_Sim_Node['skill_use_rate']) {
            if (Conjuration_Skills.has(Skill)) {
              Conjuration_Skill_Hit_Rate +=
                Pre_Sim_Node['skill_use_rate'][Skill] *
                Pre_Sim_Node['cross_skill_stat'][Skill]['total_hits']
            }
          }

          Vampiric_Curse_Rate +=
            0.3 *
            (statVal(nodes_map, 'Vampiric_Bat_Rate') +
              Conjuration_Skill_Hit_Rate)
        }

        return Math.min(1, Vampiric_Curse_Rate / number_of_enemies)
      },
    ),

    Vampiric_Bat_Rate: new StatsNode('Vampiric_Bat_Rate', () => {
      let Vampiric_Bat_Rate = 0

      const Pre_Sim_Node = sorcererPresimVal(nodes_map)

      // Vampiric Power flowing-veins
      // Casting a Mastery, Weapon Mastery, Macabre, Wrath, or Imbuement Skill calls a bat ally to attack nearby enemies, dealing 80% Physical damage with a 30% chance to Stun.	call-familiar
      // You deal 60% increased Damage Over Time to enemies that are moving or affected by a Vampiric Curse.
      if (vampiricPowerVal(nodes_map, 'flowing-veins')) {
        const Conjuration_Skills = new Set([
          'hydra',
          'lightning-spear',
          'ice-blades',
        ])
        const Defensive_Skills = new Set([
          'flame-shield',
          'frost-nova',
          'ice-armor',
          'teleport',
        ])
        for (const Skill of allSkillsVal(nodes_map)) {
          if (
            Conjuration_Skills.has(Skill) &&
            Skill in Pre_Sim_Node['skill_use_rate']
          ) {
            Vampiric_Bat_Rate += Pre_Sim_Node['skill_use_rate'][Skill]
          } else if (Defensive_Skills.has(Skill)) {
            switch (Skill) {
              case 'frost-nova':
                Vampiric_Bat_Rate +=
                  1 / statVal(nodes_map, 'Frost_Nova_Cooldown')
                break
              case 'flame-shield':
                Vampiric_Bat_Rate +=
                  1 / statVal(nodes_map, 'Flame_Shield_Cooldown')
                break
              case 'ice-armor':
                Vampiric_Bat_Rate +=
                  1 / statVal(nodes_map, 'Ice_Armor_Cooldown')
                break
              case 'teleport':
                Vampiric_Bat_Rate +=
                  1 / statVal(nodes_map, 'Teleport_Cooldown')
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

export function CreateSorcererTriggerNodes(
  nodes_map: NodesMap,
): Record<string, TriggerNode> {
  return {
    Skill_Dot_Damage: new TriggerNode('Skill_Dot_Damage', () => {
      const Weapon_Damage = aggregationVal(nodes_map, 'weapon-damage')
      const Skill_Name = currentSkillVal(nodes_map)['name']
      let Skill_DoT_Modifier =
        currentSkillVal(nodes_map)['modifiers']['dot'] *
        (1 + 0.1 * (talentVal(nodes_map, Skill_Name) - 1))

      // Secondary Components
      const Multiple_Hits_Multiplier = statVal(
        nodes_map,
        'Hits_Multiplier',
      )

      // Ultimates Cannot Gain +Ranks
      if (tagsVal(nodes_map).has('ultimate')) {
        Skill_DoT_Modifier =
          currentSkillVal(nodes_map)['modifiers']['dot']
      }

      // "Summoned_Hydra": Hydra also Burns enemies for an additional 60% of its Base damage dealt over 6 seconds.
      if (
        talentVal(nodes_map, 'summoned-hydra') > 0 &&
        currentSkillVal(nodes_map)['name'] == 'hydra'
      ) {
        Skill_DoT_Modifier +=
          0.6 * currentSkillVal(nodes_map)['modifiers']['flat']
      }

      // Incinerate: Channel a beam of fire, Burning enemies for {9.1/10/10.925/11.825/12.75/13.65/14.55/15.475/16.375/17.3}% damage per second. Damage per second increases over 2 seconds, up to {49.1/54/59/63.9/68.9/73.7/78.6/83.6/88.4/93.4}%.
      if (currentSkillVal(nodes_map)['name'] == 'incinerate') {
        let accumulated_damage_bonus = 0
        for (
          let i = 1;
          i < statVal(nodes_map, 'Number_Of_Cast') + 1;
          i++
        ) {
          const number_of_talent_points = talentVal(
            nodes_map,
            'incinerate',
          )
          accumulated_damage_bonus +=
            Math.min((i * statVal(nodes_map, 'Cast_Time')) / 4, 1) *
            0.19 *
            (0.9 + 0.1 * number_of_talent_points)
        }
        Skill_DoT_Modifier +=
          accumulated_damage_bonus /
          statVal(nodes_map, 'Number_Of_Cast')
      }

      const Tags_Node = CopyTags(tagsVal(nodes_map))
      Tags_Node.add('burn')
      Tags_Node.add('fire')
      Tags_Node.add('damage-over-time')
      const Damage_Multiplier = SorcererDamageMultiplier(
        Tags_Node,

        nodes_map,
      )

      return (
        Skill_DoT_Modifier *
        Weapon_Damage *
        Multiple_Hits_Multiplier *
        Damage_Multiplier
      )
    }),

    Flat_Damage: new TriggerNode('Flat_Damage', () => {
      // Primary Components
      const Weapon_Damage = aggregationVal(nodes_map, 'weapon-damage')
      const Skill_Name = currentSkillVal(nodes_map)['name']
      let Skill_Flat_Modifier =
        currentSkillVal(nodes_map)['modifiers']['flat'] *
        (1 + 0.1 * (talentVal(nodes_map, Skill_Name) - 1))

      let Hits_Multiplier = statVal(nodes_map, 'Hits_Multiplier')

      // Ultimates Cannot Gain +Ranks
      if (tagsVal(nodes_map).has('ultimate')) {
        Skill_Flat_Modifier =
          currentSkillVal(nodes_map)['modifiers']['flat']
      }

      // Calculation

      const Tags_Node = CopyTags(tagsVal(nodes_map))
      Tags_Node.delete('burn')
      Tags_Node.delete('damage-over-time')
      Tags_Node.delete('fire-damage-over-time')
      const Damage_Multiplier = SorcererDamageMultiplier(
        Tags_Node,
        nodes_map,
      )

      // Elemental Summoner: Your Conjuration Skills have a 10% reduced Cooldown or Mana cost per Conjuration Skill you have equipped.
      // They also deal bonus damage equal to 3%[x] of the total amount of your Bonus Damage with Fire, Lightning, and Cold.
      if (
        paragonVal(nodes_map, 'elemental-summoner') &&
        tagsVal(nodes_map).has('conjuration')
      ) {
        const Bonus_With_Fire =
          0.1 * aggregationVal(nodes_map, 'fire-damage') +
          aggregationVal(nodes_map, 'non-physical-damage')
        const Bonus_With_Cold =
          0.1 * aggregationVal(nodes_map, 'cold-damage') +
          aggregationVal(nodes_map, 'non-physical-damage')
        const Bonus_With_Lightning =
          0.1 * aggregationVal(nodes_map, 'lightning-damage') +
          aggregationVal(nodes_map, 'non-physical-damage')
        const Elemental_Summoner_Multiplier =
          1 +
          0.03 *
            (Bonus_With_Fire + Bonus_With_Cold + Bonus_With_Lightning)
        Hits_Multiplier *= Elemental_Summoner_Multiplier
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
        const number_of_enemies = Number(
          toggleVal(nodes_map, 'number-of-enemies'),
        )
        const Weapon_Damage = aggregationVal(
          nodes_map,
          'weapon-damage',
        )
        let Non_Skill_Damage_Total = 0

        //Aspect_of_Shattered Stars Meteorites fall around Meteor, dealing 20-30% of Meteor's Damage on impact. Your Meteorites additionally Burn enemies they hit for {225/300} damage over 6.0 seconds.
        const Aspect_of_Shattered_Stars_Meteorites = 3
        const Hits_per_Meteorite = 1
        if (
          currentSkillVal(nodes_map)['name'] == 'meteor' &&
          aspectVal(nodes_map, 'aspect-of-shattered-stars').length > 0
        ) {
          Non_Skill_Damage_Total +=
            Aspect_of_Shattered_Stars_Meteorites *
            Hits_per_Meteorite *
            aspectVal(nodes_map, 'aspect-of-shattered-stars')[1] *
            SorcererDamageMultiplier(
              new Set(['fire', 'damage-over-time']),
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
            Math.min(
              10 ** 2 / statVal(nodes_map, 'Enemy_Spread') ** 2,
              1,
            ) *
              (number_of_enemies - 1)

          Non_Skill_Damage_Total +=
            Average_Procs *
            Average_Hits *
            aspectVal(nodes_map, 'andariels-visage')[1] *
            SorcererDamageMultiplier(
              new Set(['poison', 'damage-over-time']),
              nodes_map,
            )
        }

        // Enchantment Blizzard: Every 15 seconds spawns a blizzard that follows you around and lasts 6 seconds.
        if (enchantmentVal(nodes_map).has('blizzard')) {
          const Blizzard_Enchantment_Duration = 6
          let Blizzard_Enchantment_Cooldown = 15

          // Enchantment Master: Your Enchantments are 20% stronger.
          if (paragonVal(nodes_map, 'enchantment-master')) {
            Blizzard_Enchantment_Cooldown = 13
          }

          const Blizzard_Enchantment_Hits = Math.min(
            10 ** 2 / statVal(nodes_map, 'Enemy_Spread') ** 2,
            1,
          )

          Non_Skill_Damage_Total +=
            (Weapon_Damage *
              Blizzard_Enchantment_Hits *
              skillVal(nodes_map, 'blizzard')['modifiers']['flat'] *
              (1 + 0.1 * (talentVal(nodes_map, 'blizzard') - 1)) *
              SorcererDamageMultiplier(
                new Set([
                  'cold',
                  'mastery',
                  'skill',
                  'damage-over-time',
                ]),
                nodes_map,
              ) *
              Blizzard_Enchantment_Duration) /
            Blizzard_Enchantment_Cooldown
        }

        return Non_Skill_Damage_Total
      },
    ),

    Non_Skill_Flat_Damage: new TriggerNode(
      'Non_Skill_Flat_Damage',
      () => {
        let Non_Skill_Damage_Total = 0
        const Weapon_Damage = aggregationVal(
          nodes_map,
          'weapon-damage',
        )

        const number_of_enemies = Number(
          toggleVal(nodes_map, 'number-of-enemies'),
        )
        const Pre_Sim_Node = sorcererPresimVal(nodes_map)

        const Attack_Speed = statVal(nodes_map, 'Total_Attack_Speed')

        //Aspect_of_Armageddon An hail_of_Meteorites falls during Inferno, dealing {102.5/125} Fire Damage on impact. Your Meteorites Immobilize enemies for 3 seconds.
        const Hits_per_Meteorite = 1
        if (
          currentSkillVal(nodes_map)['name'] == 'inferno' &&
          aspectVal(nodes_map, 'aspect-of-armageddon').length > 0
        ) {
          const Aspect_of_Armageddon_Meteorites = 9 // Needs to be checked

          Non_Skill_Damage_Total +=
            Aspect_of_Armageddon_Meteorites *
            Hits_per_Meteorite *
            aspectVal(nodes_map, 'aspect-of-armageddon')[0] *
            SorcererDamageMultiplier(new Set(['fire']), nodes_map)
        }

        // Aspect_of_Shattered Stars Meteorites fall around Meteor, dealing 20-30% of Meteor's Damage on impact. Your Meteorites additionally Burn enemies they hit for {225/300} damage over 6.0 seconds.
        if (
          currentSkillVal(nodes_map)['name'] == 'meteor' &&
          aspectVal(nodes_map, 'aspect-of-shattered-stars').length > 0
        ) {
          Non_Skill_Damage_Total +=
            triggerVal(nodes_map, 'Flat_Damage') *
            aspectVal(nodes_map, 'aspect-of-shattered-stars')[0]
        }

        //Glacial Aspect When you cast Blizzard it will periodically spawn exploding Ice Spikes that deal {100/150} damage. Your Ice Spikes deal x15% increased damage to Frozen enemies.
        if (
          currentSkillVal(nodes_map)['name'] == 'blizzard' &&
          aspectVal(nodes_map, 'glacial-aspect').length > 0
        ) {
          let Blizzard_Duration = 8
          // Talent ['mages-blizzard', 1], //Blizzard's duration is increased by 4 seconds.
          if (talentVal(nodes_map, 'mages-blizzard') > 0) {
            Blizzard_Duration += 4
          }

          let Ice_Spike_Radius = 3
          // Aspect-of-the Frozen Tundra While Deep Freeze is active, exploding Ice Spikes form in the area, dealing {125/175} Cold damage. Your Ice Spikes have a 50% increased explosion radius.
          if (
            aspectVal(nodes_map, 'aspect-of-the-frozen-tundra')
              .length > 0
          ) {
            Ice_Spike_Radius *= 1.5
          }

          const Glacial_Aspect_Ice_Spikes = 2 * Blizzard_Duration // 2 Spikes per 1 second of Blizzard
          let Hits_per_Ice_Spike = 0 // Ice Spikes are very thin random pillars
          if (toggleVal(nodes_map, 'enemy-distant')) {
            const Enemy_Distance = Math.min(
              25,
              statVal(nodes_map, 'Enemy_Spread'),
            )
            Hits_per_Ice_Spike =
              ProbabilityInCircle(
                Enemy_Distance,
                Ice_Spike_Radius,
                statVal(nodes_map, 'Enemy_Spread'),
              ) * number_of_enemies
          } else {
            Hits_per_Ice_Spike =
              ProbabilityInCircle(
                0,
                Ice_Spike_Radius,
                statVal(nodes_map, 'Enemy_Spread'),
              ) * number_of_enemies
          }

          let Ice_Spike_Multiplier = 1
          if (toggleVal(nodes_map, 'enemy-frozen')) {
            Ice_Spike_Multiplier += 0.15
          }

          Non_Skill_Damage_Total +=
            Glacial_Aspect_Ice_Spikes *
            Hits_per_Ice_Spike *
            Ice_Spike_Multiplier *
            aspectVal(nodes_map, 'glacial-aspect')[0] *
            SorcererDamageMultiplier(
              new Set(['cold', 'ice-spike']),
              nodes_map,
            )
        }

        //Aspect_of_the Frozen Wake: While Ice Armor is active, you leave behind exploding Ice Spikes that deal {100/150} damage. Your Ice Spikes Chill enemies for 10%.

        // (Unique) Flamescar While Channeling Incinerate, you periodically shoot embers that are attracted to enemies, each dealing {50/100} Fire damage.
        if (
          currentSkillVal(nodes_map)['name'] == 'incinerate' &&
          aspectVal(nodes_map, 'flamescar').length > 0
        ) {
          const Number_of_Flames =
            1 * statVal(nodes_map, 'Number_Of_Cast')
          Non_Skill_Damage_Total +=
            Number_of_Flames *
            aspectVal(nodes_map, 'flamescar')[0] *
            SorcererDamageMultiplier(new Set(['fire']), nodes_map)
        }

        // (Unique) Esadora's Overflowing Cameo Upon collecting Crackling Energy, there's a 15.0% chance to release a lightning nova, dealing {155/200} Lightning Damage.
        // The Lightning Nova deals 50%[x] increased damage for every 100 Intelligence you have.
        if (
          aspectVal(nodes_map, 'esadoras-overflowing-cameo').length >
          0
        ) {
          const Crackling_Energy_Created = statVal(
            nodes_map,
            'Crackling_Energy_Created',
          )
          let Esadora_AOE_Hits =
            1 +
            Math.min(
              1,
              10 ** 2 / statVal(nodes_map, 'Enemy_Spread') ** 2,
            ) *
              (number_of_enemies - 1)
          if (toggleVal(nodes_map, 'enemy-distant')) {
            Esadora_AOE_Hits =
              Math.min(
                1,
                10 ** 2 / statVal(nodes_map, 'Enemy_Spread') ** 2,
              ) * number_of_enemies
          }
          Non_Skill_Damage_Total +=
            0.15 *
            aspectVal(nodes_map, 'esadoras-overflowing-cameo')[0] *
            Crackling_Energy_Created *
            Esadora_AOE_Hits *
            SorcererDamageMultiplier(
              new Set(['lightning']),
              nodes_map,
            ) *
            (1 +
              0.5 *
                Math.floor(
                  statVal(nodes_map, 'Total_Intelligence') / 100,
                ))
        }

        // Enhanced Charged Bolts  The 3rd time an enemy  is hit by a single cast of Charged  Bolts, that bolt surges upon impact, dealing  its damage  in an area.
        if (
          currentSkillVal(nodes_map)['name'] == 'charged-bolts' &&
          talentVal(nodes_map, 'enhanced-charged-bolts') > 0 &&
          !toggleVal(nodes_map, 'enemy-distant')
        ) {
          // Gets the average number of enemies hit by the nova and multiplies it to the damage.
          Non_Skill_Damage_Total +=
            (1 / 3) *
            Weapon_Damage *
            number_of_enemies *
            Math.min(
              10 ** 2 / statVal(nodes_map, 'Enemy_Spread') ** 2,
              1,
            ) *
            SorcererDamageMultiplier(
              new Set(['lightning']),
              nodes_map,
            )
        }

        // Talent ['shocking-impact', 3], //Every time you Stun an enemy, you deal {15/30/45/60/75/90/105/120/135/150}% Lightning damage to them.
        if (talentVal(nodes_map, 'shocking-impact') > 0) {
          Non_Skill_Damage_Total +=
            0.15 *
            Weapon_Damage *
            talentVal(nodes_map, 'shocking-impact') *
            statVal(nodes_map, 'Enemies_Stunned') *
            SorcererDamageMultiplier(
              new Set(['lightning']),
              nodes_map,
            )
        }

        // Aspect-of-the Frozen Tundra While Deep Freeze is active, exploding Ice Spikes form in the area, dealing {125/175} Cold damage. Your Ice Spikes have a 50% increased explosion radius.
        // 2 spikes per second
        if (
          currentSkillVal(nodes_map)['name'] == 'deep-freeze' &&
          aspectVal(nodes_map, 'aspect-of-the-frozen-tundra').length >
            0
        ) {
          const Ice_Spike_Radius = 4.5 // 3 yards base radius, 50% increased explosion radius
          const Number_Of_Ice_Spikes = 8 // 2 per second, 4 seconds of deep freeze

          let Enemy_Distance = 0
          if (toggleVal(nodes_map, 'enemy-distant')) {
            Enemy_Distance = Math.min(
              25,
              statVal(nodes_map, 'Enemy_Spread'),
            )
          }

          Non_Skill_Damage_Total +=
            aspectVal(nodes_map, 'aspect-of-the-frozen-wake')[0] *
            Number_Of_Ice_Spikes *
            ProbabilityInCircle(
              Enemy_Distance,
              Ice_Spike_Radius,
              statVal(nodes_map, 'Enemy_Spread'),
            ) *
            SorcererDamageMultiplier(
              new Set(['cold', 'ice-spike']),
              nodes_map,
            )
        }

        // Enchantment Master: Your Enchantments are 20% stronger.
        const Enchantment_Master_Multiplier =
          1 +
          0.2 * Number(paragonVal(nodes_map, 'enchantment-master'))
        // Enchanted Hydra: After spending 200 mana, a 5 headed hydra spawns for 5 seconds.
        if (enchantmentVal(nodes_map).has('hydra')) {
          const Resource_Cost = statVal(nodes_map, 'Resource_Cost')

          Non_Skill_Damage_Total +=
            (-Resource_Cost / 200) *
            Weapon_Damage *
            skillVal(nodes_map, 'hydra')['modifiers']['flat'] *
            (1 + 0.1 * (talentVal(nodes_map, 'hydra') - 1)) *
            Attack_Speed *
            5 *
            5 *
            SorcererDamageMultiplier(new Set(['fire']), nodes_map) *
            Enchantment_Master_Multiplier
        }

        Non_Skill_Damage_Total += statVal(
          nodes_map,
          'Crackling_Energy_Damage',
        )

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

          let Enemy_Distance = Math.min(
            10,
            statVal(nodes_map, 'Enemy_Spread'),
          )
          if (toggleVal(nodes_map, 'enemy-distant')) {
            Enemy_Distance = Math.min(
              25,
              statVal(nodes_map, 'Enemy_Spread'),
            )
          }

          if (Dot_Tag.length > 0) {
            const AOE_Hits =
              1 +
              ProbabilityInCircle(
                Enemy_Distance,
                10,
                statVal(nodes_map, 'Enemy_Spread'),
              ) *
                (number_of_enemies - 1)

            Non_Skill_Damage_Total +=
              0.5 *
              aspectVal(nodes_map, 'xfals-corroded-signet')[0] *
              statVal(
                nodes_map,
                'Total_Lucky_Hit_Chance_Multiplier',
              ) *
              SorcererDamageMultiplier(
                new Set(Dot_Tag[0]),
                nodes_map,
              ) *
              statVal(nodes_map, 'Total_Hits') *
              AOE_Hits
          }
        }

        // Blue Rose (Sorcerer Unique Ring): Lucky Hit: Damaging an enemy has up to a 30% chance of forming an exploding Ice Spike, dealing [0.25-0.35 flat value] Cold damage. Triple this chance if the enemy is Frozen.
        if (aspectVal(nodes_map, 'blue-rose').length > 0) {
          let Ice_Spike_Radius = 3
          // Aspect-of-the Frozen Tundra While Deep Freeze is active, exploding Ice Spikes form in the area, dealing {125/175} Cold damage. Your Ice Spikes have a 50% increased explosion radius.
          if (
            aspectVal(nodes_map, 'aspect-of-the-frozen-tundra')
              .length > 0
          ) {
            Ice_Spike_Radius *= 1.5
          }

          let Hits_per_Ice_Spike = 0 // Ice Spikes are very thin random pillars
          if (toggleVal(nodes_map, 'enemy-distant')) {
            const Enemy_Distance = Math.min(
              25,
              statVal(nodes_map, 'Enemy_Spread'),
            )
            Hits_per_Ice_Spike =
              ProbabilityInCircle(
                Enemy_Distance,
                Ice_Spike_Radius,
                statVal(nodes_map, 'Enemy_Spread'),
              ) * number_of_enemies
          } else {
            Hits_per_Ice_Spike =
              ProbabilityInCircle(
                0,
                Ice_Spike_Radius,
                statVal(nodes_map, 'Enemy_Spread'),
              ) * number_of_enemies
          }
          const Total_Lucky_Hit_Chance = Math.min(
            1,
            0.3 *
              (1 + 2 * Number(toggleVal(nodes_map, 'enemy-frozen'))),
          )
          Non_Skill_Damage_Total +=
            Total_Lucky_Hit_Chance *
            aspectVal(nodes_map, 'blue-rose')[0] *
            statVal(nodes_map, 'Total_Lucky_Hit_Chance_Multiplier') *
            statVal(nodes_map, 'Total_Hits') *
            Hits_per_Ice_Spike *
            SorcererDamageMultiplier(
              new Set(['cold', 'ice-spike']),
              nodes_map,
            )
        }

        // Vampiric Power infection
        // Hitting enemies with direct damage infects them with Pox. Inflicting Pox 8 times on an enemy expunges their infection, dealing 70% Poison damage.
        if (
          vampiricPowerVal(nodes_map, 'infection') &&
          triggerVal(nodes_map, 'Flat_Damage') > 0
        ) {
          Non_Skill_Damage_Total +=
            (0.7 *
              SorcererDamageMultiplier(
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
            SorcererDamageMultiplier(
              new Set(['physical']),
              nodes_map,
            ) *
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
        statVal(nodes_map, 'Shatter_Damage_Multiplier') *
        (flat_damage * statVal(nodes_map, 'Number_Of_Cast') +
          passive_flat_damage)
      )
    }),

    Total_Damage_Over_Time: new TriggerNode(
      'Total_Damage_Over_Time',
      () => {
        const dot_damage =
          triggerVal(nodes_map, 'Skill_Dot_Damage') +
          triggerVal(nodes_map, 'Non_Skill_Dot_Damage')

        return (
          dot_damage *
          statVal(nodes_map, 'Number_Of_Cast') *
          statVal(nodes_map, 'Shatter_Damage_Multiplier')
        )
      },
    ),
  }
}
