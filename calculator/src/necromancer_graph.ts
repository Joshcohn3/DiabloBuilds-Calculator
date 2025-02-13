/* eslint-disable @typescript-eslint/no-unused-vars */

import { paragon } from 'data'

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
  baseStatVal,
  bookOfTheDeadVal,
  currentSkillVal,
  malignantHeartVal,
  necromancerPresimVal,
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
  Here we build the computation graph for the Necromancer. We construct maps for each type of node which contain all nodes of that
  type. For nodes types which have no dependencies, we have functions to manually modify and set the value for that node. For
  node types which do depend on other nodes, we pass an `update_value_function` into the constructor which uses the value of
  other nodes to compute the value of that node. The value need only be computed a single time once all the root nodes are fixed.
  We start with the nodes which have no dependencies.
  */

function NecromancerDamageMultiplier(
  tags: Set<string>,
  nodes_map: NodesMap,
) {
  const Pre_Sim_Node = necromancerPresimVal(nodes_map)
  const number_of_enemies = Number(
    toggleVal(nodes_map, 'number-of-enemies'),
  )
  const enemy_spread = Number(statVal(nodes_map, 'Enemy_Spread'))

  // 0.3 if minion tag is present otherwise 1
  const Minion_Penalty = 1 - 0.7 * Number(tags.has('minion'))

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
    aggregationVal(nodes_map, 'fire-damage-over-time')

  Generic_Damage_Bucket_Multiplier +=
    Number(tags.has('shadow')) *
    Number(
      tags.has('damage-over-time') ||
        tags.has('shadow-damage-over-time'),
    ) *
    aggregationVal(nodes_map, 'shadow-damage-over-time')

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
    (Number(tags.has('minion')) *
      (aggregationVal(nodes_map, 'minion-damage') +
        aggregationVal(nodes_map, 'summoning-skill-damage'))) /
    Minion_Penalty

  Generic_Damage_Bucket_Multiplier +=
    (Number(tags.has('golem')) *
      aggregationVal(nodes_map, 'golem-damage')) /
    Minion_Penalty

  Generic_Damage_Bucket_Multiplier +=
    (Number(tags.has('skeleton-warrior')) *
      aggregationVal(nodes_map, 'skeletonwarrior-damage')) /
    Minion_Penalty

  Generic_Damage_Bucket_Multiplier +=
    (Number(tags.has('skeleton-mage')) *
      aggregationVal(nodes_map, 'skeletonmage-damage')) /
    Minion_Penalty

  Generic_Damage_Bucket_Multiplier +=
    aggregationVal(nodes_map, 'vulnerable-damage') *
    statVal(nodes_map, 'Enemy_Vulnerable')

  // 'damage-with-desecrated-ground' desecration glyph
  Generic_Damage_Bucket_Multiplier +=
    aggregationVal(nodes_map, 'damage-with-desecrated-ground') *
    Number(tags.has('desecrated-ground'))

  Generic_Damage_Bucket_Multiplier *= Minion_Penalty

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
  let Talent_Damage_Multiplier = 1

  // 'supernatural-blight' You and your Minions deal 15% increased damage to enemies within Blight.
  if (
    'blight' in Pre_Sim_Node['skill_use_rate'] &&
    talentVal(nodes_map, 'supernatural-blight') > 0
  ) {
    const Blight_Proportion =
      Pre_Sim_Node['skill_use_rate']['blight'] *
      6 *
      Math.min(1, 10 ** 2 / statVal(nodes_map, 'Enemy_Spread') ** 2)
    Talent_Damage_Multiplier *=
      1 + 0.15 * Math.min(1, Blight_Proportion)
  }

  // Talent 'amplify-damage' You deal {4%} increased damage to Cursed enemies.
  // (TODO) Revisit this eventually. It's not clear that its worth the effort in the short term.
  if (
    allSkillsVal(nodes_map).has('iron-maiden') ||
    allSkillsVal(nodes_map).has('decrepify') ||
    malignantHeartVal(nodes_map, 'the-decrepit-aura').length != 0
  ) {
    Talent_Damage_Multiplier *=
      1 +
      0.04 *
        talentVal(nodes_map, 'amplify-damage') *
        ProbabilityInCircle(
          0,
          30,
          statVal(nodes_map, 'Enemy_Spread'),
        ) *
        Minion_Penalty
  }

  // "deaths-embrace" Close enemies take {['2%', '4%', '6%',} more damage from you and deal 3% less damage to you.
  if (
    talentVal(nodes_map, 'deaths-embrace') > 0 &&
    !toggleVal(nodes_map, 'enemy-distant')
  ) {
    Talent_Damage_Multiplier *=
      1 +
      0.02 *
        talentVal(nodes_map, 'deaths-embrace') *
        Math.min(
          1,
          10 ** 2 / statVal(nodes_map, 'Enemy_Spread') ** 2,
        ) *
        Minion_Penalty
  }

  // "deaths-reach" You deal {['4%', '8%', '12%',} increased damage to Distant enemies.
  if (talentVal(nodes_map, 'deaths-reach') > 0) {
    if (toggleVal(nodes_map, 'enemy-distant')) {
      Talent_Damage_Multiplier *=
        1 +
        0.04 * talentVal(nodes_map, 'deaths-reach') * Minion_Penalty
    } else {
      Talent_Damage_Multiplier *=
        1 +
        0.04 *
          talentVal(nodes_map, 'deaths-reach') *
          (1 -
            Math.min(
              1,
              10 ** 2 / statVal(nodes_map, 'Enemy_Spread') ** 2,
            )) *
          Minion_Penalty
    }
  }

  // Cold Mage Sacrifice - x15% damage against vulnerable enemies; unable to summon all types of Skeletal Mages.
  if (
    statVal(nodes_map, 'Enemy_Vulnerable') > 0 &&
    bookOfTheDeadVal(nodes_map, 'skeletal-mages')[0] == 'cold' &&
    bookOfTheDeadVal(nodes_map, 'skeletal-mages')[1] == 3
  ) {
    let Sacrificial_Bonus = 0.15 // Sacrificial Aspect : Your Sacrifice bonuses are increased by {15/25}%.
    if (aspectVal(nodes_map, 'sacrificial-aspect').length != 0) {
      Sacrificial_Bonus *=
        1 + aspectVal(nodes_map, 'sacrificial-aspect')[0]
    }
    let Memento_Mori = 0 // ['memento-mori', 3] Sacrificing both Skeletal Warriors and Skeletal Mages increases their Sacrifice bonuses by {['20%', '40%', '60%']}
    if (
      talentVal(nodes_map, 'memento-mori') > 0 &&
      bookOfTheDeadVal(nodes_map, 'skeletal-warriors')[1] == 3 &&
      bookOfTheDeadVal(nodes_map, 'skeletal-mages')[1] == 3
    ) {
      Memento_Mori = talentVal(nodes_map, 'memento-mori') * 0.2
    }
    Talent_Damage_Multiplier *=
      1 +
      (1 + Sacrificial_Bonus) *
        (1 + Sacrificial_Bonus * Memento_Mori) *
        Minion_Penalty *
        statVal(nodes_map, 'Enemy_Vulnerable')
  }

  // Talent ['fueled-by-death', 3] You deal 3% increased damage for 6 seconds after consuming a Corpse.
  if (talentVal(nodes_map, 'fueled-by-death') > 0) {
    Talent_Damage_Multiplier *=
      1 +
      0.03 *
        talentVal(nodes_map, 'fueled-by-death') *
        Math.min(
          1,
          statVal(nodes_map, 'Corpse_Consumption_Rate') * 6,
        ) *
        Minion_Penalty
  }

  // Talent 'ossified-essence' Your Bone Skills deal .50% increased damage for each point of Essence you have above 50 upon cast.
  if (
    talentVal(nodes_map, 'ossified-essence') > 0 &&
    tags.has('bone')
  ) {
    Talent_Damage_Multiplier *=
      1 + (statVal(nodes_map, 'Max_Resource') - 50) / 400

    // Aspect of Serration : The Ossified Essence Key Passive also increases the Critical Strike Damage of your Bone Skills by 1.0%[x] per Essence above 50.0, up to {30/40}%[x].
    if (aspectVal(nodes_map, 'aspect-of-serration').length != 0) {
      Critical_Damage_Multiplier += Math.min(
        aspectVal(nodes_map, 'aspect-of-serration')[0],
        (statVal(nodes_map, 'Max_Resource') - 50) / 200,
      )
    }
  }

  // Control: You and your Minions deal x10% increased damage to Slowed or Chilled enemies or, instead, x20% increased damage to Stunned or Frozen enemies.
  if (paragonVal(nodes_map, 'control')) {
    let Control_Multiplier = 1
    if (
      toggleVal(nodes_map, 'enemy-slowed') ||
      statVal(nodes_map, 'Enemy_Chilled') == 1
    ) {
      Control_Multiplier =
        1.1 *
        statVal(nodes_map, 'Enemy_Boss_CC_Adjustment') *
        statVal(nodes_map, 'Enemy_Boss_CC_Adjustment')
    }
    if (
      toggleVal(nodes_map, 'enemy-stunned') ||
      toggleVal(nodes_map, 'enemy-frozen')
    ) {
      Control_Multiplier =
        1.2 * statVal(nodes_map, 'Enemy_Boss_CC_Adjustment')
    }
    Talent_Damage_Multiplier *= Control_Multiplier
  }

  // Scourge: You and your Minions deal x10% increased damage to enemies affected by Shadow damage over time effects.
  if (paragonVal(nodes_map, 'scourge')) {
    const Shadow_DoT_Skills = new Set(['blight', 'decompose'])
    if (talentVal(nodes_map, 'blighted-corpse-explosion') > 0) {
      Shadow_DoT_Skills.add('corpse-explosion')
    }
    if (
      aspectVal(nodes_map, 'greaves-of-the-empty-tomb').length != 0
    ) {
      Shadow_DoT_Skills.add('sever')
    }
    if (
      aspectVal(nodes_map, 'aspect-of-ultimate-shadow').length != 0
    ) {
      Shadow_DoT_Skills.add('bone-storm')
      Shadow_DoT_Skills.add('blood-wave')
    }
    let Shadow_Damage_Over_Time_Uptime = 0
    for (const Skill in Pre_Sim_Node['skill_use_rate']) {
      if (Shadow_DoT_Skills.has(Skill)) {
        Shadow_Damage_Over_Time_Uptime +=
          Pre_Sim_Node['skill_use_rate'][Skill] *
          Pre_Sim_Node['cross_skill_stat'][Skill]['dot_duration']
      }
    }
    Talent_Damage_Multiplier *=
      1 + 0.1 * Math.min(1, Shadow_Damage_Over_Time_Uptime)
  }

  // Glyph 'gravekeeper': You deal x2% increased damage, up to x12%, for every Close Corpse.
  if (paragonVal(nodes_map, 'gravekeeper')) {
    if (
      statVal(nodes_map, 'Corpse_Spawn_Rate') >
      statVal(nodes_map, 'Corpse_Consumption_Rate')
    ) {
      Talent_Damage_Multiplier *= 1 + 0.12 * Minion_Penalty
    }
  }

  // Glyph Paragon: 'exploit', Dealing damage to a Vulnerable enemy increases your damage by x1% for 6 seconds, up to x10%.
  if (
    paragonVal(nodes_map, 'exploit') &&
    statVal(nodes_map, 'Enemy_Vulnerable') > 0
  ) {
    Talent_Damage_Multiplier *=
      1 +
      0.1 * statVal(nodes_map, 'Enemy_Vulnerable') * Minion_Penalty // It's going to stack up, so just assume it's at 10 stacks.
  }

  // Legendary Paragon 'bone-graft', Hitting enemies with Bone Skills increases your damage by x1% and your Maximum Essence by 3 for 8 seconds, stacks up to x8% increased damage and 24 Maximum Essence.
  if (paragonVal(nodes_map, 'bone-graft')) {
    const Bone_Skills = new Set([
      'bone-splinters',
      'bone-spirit',
      'bone-spear',
      'bone-storm',
    ])
    let Bone_Graft_Rate = 0
    for (const Skill in Pre_Sim_Node['skill_use_rate']) {
      if (Bone_Skills.has(Skill)) {
        Bone_Graft_Rate +=
          Pre_Sim_Node['skill_use_rate'][Skill] *
          Pre_Sim_Node['cross_skill_stat'][Skill]['total_hits']
      }
    }
    if (Bone_Graft_Rate * 8 >= 1) {
      Talent_Damage_Multiplier *= 1.08
    } else {
      Talent_Damage_Multiplier *=
        1 + 0.01 * Math.min(1, Bone_Graft_Rate * 8) * Minion_Penalty
    }
  }

  if (tags.has('skill')) {
    Talent_Damage_Multiplier *= statVal(
      nodes_map,
      'Skill_Talent_Damage_Multiplier',
    )
  }

  // Glyph Corporeal You and your Minions deal x10% increased Physical damage.
  if (tags.has('physical') && paragonVal(nodes_map, 'corporeal')) {
    Talent_Damage_Multiplier *= 1.1
  }

  // Glyph 'sacrificial' You deal x10% increased damage while you have no active Minions.
  if (
    paragonVal(nodes_map, 'sacrificial') &&
    statVal(nodes_map, 'Max_Number_Of_Minions') == 0
  ) {
    Talent_Damage_Multiplier *= 1.1
  }

  // Glyph 'deadraiser' Whenever your Minions deal damage to an enemy, that enemy takes x1% increased damage from you and your Minions, up to x12%, for 10 seconds.
  if (
    paragonVal(nodes_map, 'deadraiser') &&
    statVal(nodes_map, 'Max_Number_Of_Minions') > 0
  ) {
    const Skeleton_Warrior_Targets =
      statVal(nodes_map, 'Skeleton_Warrior_Uptime') *
      statVal(nodes_map, 'Max_Number_Of_Skeleton_Warriors') *
      statVal(nodes_map, 'Skeleton_Warrior_Hits')
    const Skeleton_Mage_Targets =
      statVal(nodes_map, 'Skeleton_Mage_Uptime') *
      statVal(nodes_map, 'Max_Number_Of_Skeleton_Mages') *
      statVal(nodes_map, 'Skeleton_Mage_Hits')
    const Golem_Targets =
      statVal(nodes_map, 'Golem_Uptime') *
      statVal(nodes_map, 'Max_Number_Of_Golems') *
      statVal(nodes_map, 'Golem_Hits')

    Talent_Damage_Multiplier *=
      1 +
      0.12 *
        Math.min(
          1,
          (Skeleton_Warrior_Targets +
            Skeleton_Mage_Targets +
            Golem_Targets) /
            number_of_enemies,
        )
  }

  // 'cult-leader' (Legendary Paragon) Your Minions deal x15% increased damage for each Minion type you have active. This only applies to the Minion types: Skeletal Warrior, Skeletal Mage, and Golem.
  if (tags.has('minion')) {
    const Active_Skeleton_Warriors =
      statVal(nodes_map, 'Max_Number_Of_Skeleton_Warriors') *
        statVal(nodes_map, 'Skeleton_Warrior_Uptime') >
      0
        ? 1
        : 0
    const Active_Skeleton_Mages =
      statVal(nodes_map, 'Max_Number_Of_Skeleton_Mages') *
        statVal(nodes_map, 'Skeleton_Mage_Uptime') >
      0
        ? 1
        : 0
    const Active_Golems =
      statVal(nodes_map, 'Max_Number_Of_Golems') *
        statVal(nodes_map, 'Golem_Uptime') >
      0
        ? 1
        : 0
    Talent_Damage_Multiplier *=
      1 +
      0.15 *
        (Active_Skeleton_Warriors +
          Active_Skeleton_Mages +
          Active_Golems)
  }

  // 'gloom' When you damage enemies with Darkness Skills, they take {['2%', '4%', '6%',} increased Shadow Damage from you and your Minions for 2 seconds, stacking up to 3 times.
  if (talentVal(nodes_map, 'gloom') > 0 && tags.has('shadow')) {
    const Darkness_Skills = new Set([
      'reap',
      'decompose',
      'blight',
      'sever',
    ])
    let Gloom_Application_Rate = 0
    for (const Other_Skill in Pre_Sim_Node['skill_use_rate']) {
      if (Darkness_Skills.has(Other_Skill)) {
        Gloom_Application_Rate +=
          (Pre_Sim_Node['skill_use_rate'][Other_Skill] *
            Pre_Sim_Node['cross_skill_stat'][Other_Skill][
              'total_hits'
            ]) /
          number_of_enemies
      }
    }
    let Gloom_Bonus = 0
    if (Gloom_Application_Rate >= 0.5) {
      // Determines if debuff stacks or not
      Gloom_Bonus = 0.06
    } else {
      Gloom_Bonus = 0.02
    }
    Talent_Damage_Multiplier *=
      1 +
      talentVal(nodes_map, 'gloom') *
        Gloom_Bonus *
        Math.min(1, Gloom_Application_Rate * 2)
  }

  // Talent ['shadowblight', 1] Shadow damage infects enemies with Shadowblight for 2 seconds.
  //Every 10th time an enemy receives Shadow damage from you or your Minions while they are affected by Shadowblight, they take an additional 22% Shadow damage.
  // Shadowblight's damage is increased by 100% [x] of your Shadow Damage over Time bonus.
  if (talentVal(nodes_map, 'shadowblight') > 0) {
    Talent_Damage_Multiplier *=
      1 +
      0.1 * Math.min(1, statVal(nodes_map, 'Shadowblight_Rate') * 2)
  }

  // Abyssal: You and your Minions deal x10% increased Non-Physical damage.
  if (!tags.has('physical') && paragonVal(nodes_map, 'abyssal')) {
    Talent_Damage_Multiplier *= 1.1
  }

  // Glyph 'amplify',  Enemies affected by Curse Skills take x10% increased damage from you and your Minions.
  if (
    paragonVal(nodes_map, 'amplify') &&
    (allSkillsVal(nodes_map).has('iron-maiden') ||
      allSkillsVal(nodes_map).has('decrepify') ||
      malignantHeartVal(nodes_map, 'the-decrepit-aura').length != 0)
  ) {
    Talent_Damage_Multiplier *=
      1 + 0.1 * ProbabilityInCircle(0, 30, enemy_spread)
  }

  // Wither: Your Shadow damage over time effects have a x5% chance to deal x50% bonus damage each time they deal damage.
  // This chance is increased by x1% and bonus damage is increased by x4% for each 40 Intelligence you have.
  if (
    tags.has('shadow-damage-over-time') &&
    paragonVal(nodes_map, 'wither') &&
    !tags.has('minion')
  ) {
    Talent_Damage_Multiplier *=
      1 +
      (0.05 +
        (0.01 * statVal(nodes_map, 'Total_Intelligence')) / 40) *
        (0.5 + (0.04 * statVal(nodes_map, 'Total_Intelligence')) / 40)
  }

  // Reapers Perk 3 Sacrifice - You deal x15% increased Shadow damage, but you can no longer raise Skeletal Warriors.
  if (
    tags.has('shadow') &&
    bookOfTheDeadVal(nodes_map, 'skeletal-warriors')[0] ==
      'reapers' &&
    bookOfTheDeadVal(nodes_map, 'skeletal-warriors')[1] == 3
  ) {
    let Sacrifice_Bonus = 0.15
    // Sacrificial Aspect : Your Sacrifice bonuses are increased by {15/25}%.
    if (aspectVal(nodes_map, 'sacrificial-aspect').length != 0) {
      Sacrifice_Bonus *=
        1 + aspectVal(nodes_map, 'sacrificial-aspect')[0]
    }
    let Memento_Mori = 0 // ['memento-mori', 3] Sacrificing both Skeletal Warriors and Skeletal Mages increases their Sacrifice bonuses by {['20%', '40%', '60%']}
    if (
      talentVal(nodes_map, 'memento-mori') > 0 &&
      bookOfTheDeadVal(nodes_map, 'skeletal-warriors')[1] == 3 &&
      bookOfTheDeadVal(nodes_map, 'skeletal-mages')[1] == 3
    ) {
      Memento_Mori = talentVal(nodes_map, 'memento-mori') * 0.2
    }
    Talent_Damage_Multiplier *=
      (1 + Sacrifice_Bonus) *
      (1 + Sacrifice_Bonus * Memento_Mori) *
      Minion_Penalty
  }

  // 'skeletal-warrior-mastery' Increase the damage and Life of your Skeletal Warriors by {['15%', '30%', '45%',} .
  if (tags.has('skeleton-warrior')) {
    Talent_Damage_Multiplier *=
      1 + 0.15 * talentVal(nodes_map, 'skeletal-warrior-mastery')
  }

  if (tags.has('golem')) {
    // 'golem-mastery' Increase the damage and Life of your Golem by 25%.
    Talent_Damage_Multiplier *=
      1 + 0.25 * talentVal(nodes_map, 'golem-mastery')
  }

  if (tags.has('skeleton-mage')) {
    // 'skeletal-mage-mastery' Increase the damage and Life of your Skeletal Mages by 20% .
    Talent_Damage_Multiplier *=
      1 + 0.2 * talentVal(nodes_map, 'skeletal-mage-mastery')
  }

  // 'hellbent-commander'  Your Minions deal {['10%', '20%', '30%',} increased damage while you are Close to them.
  if (
    talentVal(nodes_map, 'hellbent-commander') > 0 &&
    statVal(nodes_map, 'Max_Number_Of_Minions') > 0 &&
    tags.has('minion')
  ) {
    if (tags.has('skeleton-mage')) {
      Talent_Damage_Multiplier *=
        1 + 0.1 * talentVal(nodes_map, 'hellbent-commander')
    } else if (tags.has('skeleton-warrior') || tags.has('golem')) {
      Talent_Damage_Multiplier *=
        1 +
        0.1 *
          talentVal(nodes_map, 'hellbent-commander') *
          ProbabilityInCircle(
            0,
            12,
            statVal(nodes_map, 'Enemy_Spread'),
          )
    }
  }

  // Talent ['terror', 3], // Shadow Damage deals {['3%', '6%', '9%',} bonus damage to enemies who are Chilled or Slowed, and {['3%', '6%', '9%',} bonus damage to enemies who are Frozen, Stunned or Immobilized. These bonuses stack and apply to Shadow Damage dealt by your Minions.
  if (tags.has('shadow') && talentVal(nodes_map, 'terror') > 0) {
    Talent_Damage_Multiplier *=
      1 +
      0.03 *
        talentVal(nodes_map, 'terror') *
        (Number(
          toggleVal(nodes_map, 'enemy-slowed') ||
            statVal(nodes_map, 'Enemy_Chilled') == 1,
        ) +
          Number(
            toggleVal(nodes_map, 'enemy-stunned') ||
              toggleVal(nodes_map, 'enemy-immobilized') ||
              toggleVal(nodes_map, 'enemy-frozen'),
          )) *
        statVal(nodes_map, 'Enemy_Boss_CC_Adjustment')
  }

  // Multiplier which should be applied to all sources of damage from the character, not just skills.
  let Aspect_Damage_Multiplier = statVal(
    nodes_map,
    'Generic_Aspect_Damage_Multiplier',
  )

  // (Unique) Fists-of-Fate: Your attacks randomly deal 1% to {200/300}% of their normal damage.
  if (
    aspectVal(nodes_map, 'fists-of-fate').length > 0 &&
    !tags.has('minion') &&
    tags.has('skill')
  ) {
    Aspect_Damage_Multiplier *=
      aspectVal(nodes_map, 'fists-of-fate')[0] / 2
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
        Minion_Penalty *
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
        Minion_Penalty *
        statVal(nodes_map, 'Enemy_Boss_CC_Adjustment')
  }

  // Conceited-aspect: Deal x{15-25}% increased damage while you have a Barrier active.
  if (
    aspectVal(nodes_map, 'conceited-aspect').length != 0 &&
    Number(toggleVal(nodes_map, 'percent-barrier')) != 0
  ) {
    Aspect_Damage_Multiplier *=
      1 + aspectVal(nodes_map, 'conceited-aspect')[0] * Minion_Penalty
  }

  // Aspect of the Damned : You deal x{40/50}% increased Shadow Damage to enemies afflicted by both Decrepify and Iron Maiden.
  if (
    aspectVal(nodes_map, 'aspect-of-the-damned').length != 0 &&
    tags.has('shadow')
  ) {
    if (
      allSkillsVal(nodes_map).has('iron-maiden') &&
      (allSkillsVal(nodes_map).has('decrepify') ||
        malignantHeartVal(nodes_map, 'the-decrepit-aura').length != 0)
    ) {
      Aspect_Damage_Multiplier *=
        1 +
        aspectVal(nodes_map, 'aspect-of-the-damned')[0] *
          Math.min(1, 30 ** 2 / statVal(nodes_map, 'Enemy_Spread')) *
          Minion_Penalty
    }
  }

  // Aspect of Reanimation : Your Minions gain increased damage while alive, up to x{30/40}% after 10.0 seconds.
  if (
    aspectVal(nodes_map, 'aspect-of-reanimation').length > 0 &&
    tags.has('minion')
  ) {
    let Lifetime = 200
    if (tags.has('skeleton-warrior')) {
      Lifetime = statVal(nodes_map, 'Skeleton_Warrior_Lifetime')
    } else if (tags.has('skeleton-mage')) {
      Lifetime = statVal(nodes_map, 'Skeleton_Mage_Lifetime')
    } else if (tags.has('golem')) {
      Lifetime = statVal(nodes_map, 'Golem_Lifetime')
    }

    Aspect_Damage_Multiplier *=
      1 +
      Math.max(0, (Lifetime - 10) / Lifetime) *
        aspectVal(nodes_map, 'aspect-of-reanimation')[0]
  }

  // 'hulking-monstrosity'  Your Golem has x40% increased Maximum Life and deals x100% increased damage.
  if (
    paragonVal(nodes_map, 'hulking-monstrosity') &&
    tags.has('golem')
  ) {
    Talent_Damage_Multiplier *= 2
  }

  // Blood Golem Perk 2 - While Healthy (the golem), your Blood Golem gains 25% Damage Reduction and x50% increased damage.
  if (
    bookOfTheDeadVal(nodes_map, 'golem')[0] == 'blood' &&
    bookOfTheDeadVal(nodes_map, 'golem')[1] == 2 &&
    tags.has('golem')
  ) {
    Talent_Damage_Multiplier *= 1.5
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
        Penitent_Greaves_Chill_Adjustment *
        Minion_Penalty
  }

  // Legendary Paragon 'flesh-eater' Consuming 5 Corpses grants x40% increased damage for 6 seconds.
  if (paragonVal(nodes_map, 'flesh-eater')) {
    Aspect_Damage_Multiplier *=
      1 +
      0.4 *
        Math.min(
          1,
          statVal(nodes_map, 'Corpse_Consumption_Rate') * (6 / 5),
        ) *
        Minion_Penalty
  }

  // Legendary Paragon 'scent-of-death' With at least 2 Corpses Nearby, you gain 15% Damage Reduction. With no Corpses Nearby, you deal x15% increased damage.
  if (
    paragonVal(nodes_map, 'scent-of-death') &&
    statVal(nodes_map, 'Corpse_Consumption_Rate') >=
      statVal(nodes_map, 'Corpse_Spawn_Rate')
  ) {
    Aspect_Damage_Multiplier *= 1 + 0.15 * Minion_Penalty
  }

  // Legendary Paragon 'blood-begets-blood' Blood Orbs grant x5% increased damage, up to x15%, for 5 seconds.
  if (
    paragonVal(nodes_map, 'blood-begets-blood') &&
    aspectVal(nodes_map, 'gore-quills').length == 0
  ) {
    if (statVal(nodes_map, 'Blood_Orb_Spawn_Rate') * 5 >= 1) {
      Aspect_Damage_Multiplier *= 1 + 0.15 * Minion_Penalty
    } else {
      Aspect_Damage_Multiplier *=
        1 +
        0.05 *
          statVal(nodes_map, 'Blood_Orb_Pickup_Rate') *
          5 *
          Minion_Penalty
    }
  }

  // Glyph 'desecration', While standing in your Desecrated Ground, you deal 15%[x] increased Shadow Damage.
  if (paragonVal(nodes_map, 'desecration') && tags.has('shadow')) {
    let Descration_Uptime = 0
    for (const Skill in Pre_Sim_Node['skill_use_rate']) {
      switch (Skill) {
        case 'blight':
          Descration_Uptime +=
            Pre_Sim_Node['skill_use_rate'][Skill] * 6
          break
        case 'corpse-explosion':
          if (talentVal(nodes_map, 'blighted-corpse-explosion') > 0) {
            Descration_Uptime +=
              Pre_Sim_Node['skill_use_rate'][Skill] * 6
          }
          break
        case 'sever':
          // Aspect of Empowering Reaper : Sever has a {10/20}% chance to spawn a pool of Blight under the target that deals {40/80}% bonus damage. This effect can only happen once every 3.0 seconds.
          if (
            aspectVal(nodes_map, 'aspect-of-empowering-reaper')
              .length != 0
          ) {
            Descration_Uptime +=
              Pre_Sim_Node['skill_use_rate'][Skill] * 6
          }
          break
        default:
          break
      }
    }
    if (
      allSkillsVal(nodes_map).has('bone-prison') &&
      aspectVal(nodes_map, 'aspect-of-plunging-darkness').length != 0
    ) {
      Descration_Uptime +=
        6 / statVal(nodes_map, 'Bone_Prison_Cooldown')
    }

    Aspect_Damage_Multiplier *=
      1 + 0.15 * Math.min(1, Descration_Uptime)
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

  if (tags.has('skill')) {
    Aspect_Damage_Multiplier *= statVal(
      nodes_map,
      'Skill_Aspect_Damage_Multiplier',
    )
  }

  let Attribute_Damage_Multiplier = 1
  if (tags.has('skill')) {
    Attribute_Damage_Multiplier = statVal(
      nodes_map,
      'Attribute_Damage_Multiplier',
    )
  }

  if (tags.has('minion')) {
    Crit_Chance = (Crit_Chance - 0.05) * 0.3 + 0.05

    // Skirmishers Perk 2 - Each time you Critically Strike, your Skirmishers Warriors' next attack Critically Strikes and deals x50% bonus Critical Strike damage. Can only happen every 3 seconds
    if (
      tags.has('skeleton-warrior') &&
      bookOfTheDeadVal(nodes_map, 'skeletal-warriors')[0] ==
        'skirmishers' &&
      bookOfTheDeadVal(nodes_map, 'skeletal-warriors')[1] == 2
    ) {
      let Player_Crit_Rate = 0
      for (const Skill in Pre_Sim_Node['skill_use_rate']) {
        Player_Crit_Rate +=
          Pre_Sim_Node['skill_use_rate'][Skill] *
          Pre_Sim_Node['cross_skill_stat'][Skill]['critical_chance'] *
          Pre_Sim_Node['cross_skill_stat'][Skill]['total_hits']
      }
      const Skirmishers_Perk2_Proc_Rate = Math.min(
        1 / 3,
        Player_Crit_Rate,
      )
      const Skeleton_Warrior_Attack_Rate = statVal(
        nodes_map,
        'Skeleton_Warrior_Attack_Speed',
      )
      Crit_Chance =
        Skirmishers_Perk2_Proc_Rate / Skeleton_Warrior_Attack_Rate +
        (1 -
          Skirmishers_Perk2_Proc_Rate /
            Skeleton_Warrior_Attack_Rate) *
          Crit_Chance
      Critical_Damage_Multiplier *=
        1 +
        0.5 *
          (Skirmishers_Perk2_Proc_Rate / Skeleton_Warrior_Attack_Rate)
    }
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

const NecromancerParagonNames: string[] = [
  // Glyph Bonuses
  'imbiber', // You gain +30% increased Potion Healing.
  'territorial', // You gain 10% Damage Reduction against Close enemies.
  'control', // You and your Minions deal x10% increased damage to Slowed or Chilled enemies or, instead, x20% increased damage to Stunned or Frozen enemies.
  'revenge', // Thorns damage increases all damage an enemy takes from you and your Minions by x1%, up to x10%, for 10 seconds.
  'undaunted', // You gain up to 10% Damage Reduction the more Fortify you have.
  'dominate', // When you Overpower an enemy, all damage they take from you and your Minions is increased by x12% for 5 seconds.
  'corporeal', // You and your Minions deal x10% increased Physical damage.
  'abyssal', // You and your Minions deal x10% increased Non-Physical damage.
  'warrior', // Skeletal Warriors gain +30% increased Armor.
  'gravekeeper', // You deal x2% increased damage, up to x12%, for every Close Corpse.
  'essence', // Critical Strikes deal x22% increased damage to enemies that are not Healthy.
  'sacrificial', // You deal x10% increased damage while you have no active Minions.
  'blood-drinker', // Blood Orbs Fortify you for 6.7% of your Maximum Life.
  'deadraiser', // Whenever your Minions deal damage to an enemy, that enemy takes x1% increased damage from you and your Minions, up to x12%, for 10 seconds.
  'mage', // Skeletal Mages gain 35% increased Resistance to All Elements.
  'amplify', // Enemies affected by Curse Skills take x10% increased damage from you and your Minions.
  'golem', // Golems gain x25% increased Maximum Life.
  'scourge', // You and your Minions deal x10% increased damage to enemies affected by Shadow damage over time effects.
  'darkness', // Whenever you or your Minions deal Shadow damage to an enemy, that enemy deals 2% reduced damage, up to 10%, for 5 seconds.
  'exploit', // Dealing damage to a Vulnerable enemy increases your damage by x1% for 6 seconds, up to x10%.
  'exhumation', // Consuming a Corpse Fortifies you for 4% of your Maximum Life and grants 4% Damage Reduction for 4 seconds.
  'desecration', // While standing in your Desecrated Ground, you deal 15%[x] increased Shadow Damage.

  // Legendary Paragon
  'cult-leader', // Your Minions deal x15% increased damage for each Minion type you have active. This only applies to the Minion types: Skeletal Warrior, Skeletal Mage, and Golem.
  'hulking-monstrosity', // Your Golem has x40% increased Maximum Life and deals x100% increased damage.
  'flesh-eater', // Consuming 5 Corpses grants x40% increased damage for 6 seconds.
  'scent-of-death', // With at least 2 Corpses Nearby, you gain 15% Damage Reduction. With no Corpses Nearby, you deal x15% increased damage.
  'bone-graft', // Hitting enemies with Bone Skills increases your damage by x1% and your Maximum Essence by 2 for 8 seconds, stacks up to x8% increased damage and 16 Maximum Essence.
  'blood-begets-blood', // Blood Orbs grant x5% increased damage, up to x15%, for 5 seconds.
  'bloodbath', // All Overpowered attacks deal 35% [x] increased Overpower damage.
  'wither', // Your Shadow damage over time effects have a x5% chance to deal x50% bonus damage each time they deal damage. This chance is increased by x1% and bonus damage is increased by x4% for each 40 intelligence you have.
]

export function CreateNecromancerParagonNodes(): Record<
  string,
  ParagonNode
> {
  const nodes: Record<string, ParagonNode> = {}
  for (const key of NecromancerParagonNames) {
    nodes[key] = new ParagonNode(key, 'boolean')
  }
  return nodes
}

/* --------------------------------------------------------------------------
                      MALIGNANT HEARTS
----------------------------------------------------------------------------*/
export function CreateNecromancerMalignantHeartNodes(): Record<
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
    // (Necromancer) frozen-terror:	Lucky Hit: Up to a [10-20]% chance of inflicting Fear for {2/3/4/5..} seconds. Feared enemies are Chilled for 20% every second.
    'frozen-terror': new MalignantHeartNode('frozen-terror', 2),
    // (Necromancer) the-decrepit-aura:	When at least {4/3/2/1/0} enemies are near you, gain an aura that automatically curses surrounding enemies with Decrepify for [6-17] seconds.
    'the-decrepit-aura': new MalignantHeartNode(
      'the-decrepit-aura',
      2,
    ),
    // (Necromancer) the-great-feast:	Each Minion drains [1-2] Essence per second but deals [55-80]]% increased damage. With no Minions, this bonus applies to you and drains 5 Essence per second.
    'the-great-feast': new MalignantHeartNode('the-great-feast', 2),
    // (Necromancer) the-sacrilegious:	Walking near a Corpse automatically activates an equipped Corpse Skill every second, dealing [22-32]% reduced damage.
    'the-sacrilegious': new MalignantHeartNode('the-sacrilegious', 1),
  }
}

/* ------------------------------------------------------------------------------------------------------------------------------- */

/* ----------------------------------------------------------------
                        BOOK OF THE DEAD
    ---------------------------------------------------------------- */
/* Raise Skeleton - Raise a Skeleton from a Corpse to fight for you.
    Once all of your Skeletons have been summoned, Raise Skeleton briefly summons a Skeletal Priest
    to empower your Minions for 5 seconds, increasing their damage by 20% and healing them for 10% of their Maximum Life*/

// Fast-attacking Skirmishers, which have increased damage but reduced Life.
// Sword and board Defenders, which have bonus Life.
// Scythe wielding Reapers, which have a slower attack, deals AoE in front of them, and have a wind-up attack that deals a high amount of damage.

// Skirmisher: 14% damage and deal 30% more damage but have 15% reduced Life.
// Defender: 14% damage
// Reaper: 14 damage
// Shadow Mage: 46.4% damage
// Cold Mage: 46.4% damage
// Bone Mage: 68.1% damage

// Golem
// You are protected by a Golem with {#} Life that attacks for 17% damage.
// Example: "You are protected by a golem with 659 Life that attacks for 17% damage. The Golem sheds Corpses as it takes damage."
// When your Golem dies, it respawns after 20 seconds.

// skeletal-warriors-skirmishers: Sword-wielding damage dealers that deal {30%} increased damage but have {15%} reduced Life.
// Perk 1 - You can raise one additional Skirmisher Warrior.
// Perk 2 - Each time you Critically Strike, your Skirmishers Warriors' next attack Critically Strikes and deals x50% bonus Critical Strike damage. Can only happen every 3 seconds
// Sacrifice - Your Critical Strike Chance is increased by +5%, but you can no longer raise Skeletal Warriors.

// skeletal-warriors-defenders: Durable shield-bearers with {15%} increased Life.
// Perk 1 - Every 6 seconds your Skeletal Defenders negate the next instance of Direct Damage they would take.
// Perk 2 - Increase the amount of Thorns that Defender Warriors inherit from you from 30% to 50%.
// Sacrifice - You gain 15% Non-Physical Resistance, but you can no longer raise Skeletal Warriors.

// skeletal-warriors-reapers: Wields a powerful scythe that has a special wind-up attack, dealing heavy damage every {10} seconds.
// Perk 1 - Reaper attacks against enemies who are Immobilized, Slowed, Stunned, or Vulnerable reduce the cooldown of their powerful wind-up attack by {2} seconds.
// Perk 2 - Reapers have a {15%} chance to carve the flesh off enemies, forming a Corpse.
// Sacrifice - You deal x15% increased Shadow damage, but you can no longer raise Skeletal Warriors.

// skeletal-mages-shadow: Shadow Mages wield power from the beyond dealing moderate Shadow Damage.
// Perk 1 - +10% chance to stun for two seconds; can only happen to the same enemy once every five seconds.
// Perk 2 - Fire an additional shadow bolt every 4th attack.
// Sacrifice - +15 maximum essence; unable to summon all types of Skeletal Mages.

// skeletal-mages-cold: Cold Mages attacks will chill enemies eventually freezing them in their tracks.
// Perk 1 - Gain +2 essence when Cold Mages deal damage with their normal attack.
// Perk 2 - Enemies frozen or damaged while frozen by your Cold Mages become vulnerable for three seconds.
// Sacrifice - +15% damage against vulnerable enemies; unable to summon all types of Skeletal Mages.

// skeletal-mages-bone: Bone Mages use their own bodies as projectiles, dealing heavy damage at the cost of {15%} their own Life.
// Perk 1 - Reduce the Life cost of your Bone Mages' attacks from {15%} to {10%}. After being alive for {5} seconds, Bone Mages deal {40%} increased damage.
// Perk 2 - Each time a Bone Mage dies from its own attack, they leave behind a Corpse and Fortify you for {20%} of your Base Life.
// Sacrifice - Your Overpower damage is increased by x25%, but you can no longer raise Skeletal Mages.

// golem-bone: A horrid protector that taunts enemies, forcing them to attack the Golem.
// golem-bone Active: Your Golem becomes Unstoppable and Taunts Nearby enemies and takes 30% reduced damage for the next 6 seconds
// Perk 1 - Each time your Bone Golem takes up to 20% of its Maximum Life as damage, it sheds a Corpse
// Perk 2 - Your Bone Golem gains 10% Maximum Life and the amount of Thorns they inherit from you is increased from 30% to 50%.
// Sacrifice - +10% attack speed; unable to summon all types of Golems.

// golem-blood: Drains Life from nearby enemies to heal and bolster itself.
// golem-blood Active: Your Golem becomes Unstoppable and drains the blood of enemies in the area, dealing {140%}% damage and healing {5}% of its Life for each enemy drained. Damage and healing received are tripled if only one enemy is drained.
// Perk 1 - The Blood Golem absorbs 15% of the damage you take.
// Perk 2 - While Healthy (the golem), your Blood Golem gains 25% Damage Reduction and x50% increased damage.
// Sacrifice - +10% max HP; unable to summon all types of Golems.

// golem-iron: An amalgamation of steel that slams the ground and Stuns enemies.
// golem-iron Active: Command your Golem to go to the targeted area, they become Unstoppable and slam their fists into the ground, dealing 200% damage and Stunning surrounding enemies for 3 seconds. This has a [(NecroArmy_Spec_For_Pet_Type#2==2 and 10 or 16)] second cooldown.
// Perk 1 - Every 4th Iron Golem attack causes a shockwave, dealing 40% damage to the primary enemy and to enemies behind them.
// Perk 2 - Your Iron Golem's slam attack also makes enemies Vulnerable for 3 seconds.
// Sacrifice - +30% increased critical damage; unable to summon all types of Golems.

// EXAMPLE USING BOOK OF THE DEAD
// nodes_map["book_of_the_dead"])["skeletal-warriors"] == ["reapers", 1]
// when the players has selected Perk 1 from skeletal-warriors-reapers.

const NecromancerTalentsToMaxValue: [string, number][] = [
  ['bone-splinters', 5], // Fire 3 bone splinters, dealing {9%} damage each. Each subsequent time an enemy is hit by the same cast of Bone Splinters, you gain 1 Essence.
  ['enhanced-bone-splinters', 1], // Bone Splinters has a 25% chance to fire 2 additional projectiles if cast while you have 50 or more Essence. -- Done
  ['acolytes-bone-splinters', 1], // Hitting the same enemy at least 3 times with the same cast of Bone Splinters grants 8% Critical Strike Chance for 4 seconds.
  ['initiates-bone-splinters', 1], // Bone Splinters has a 20% chance per hit to make enemies Vulnerable for 2 seconds.
  ['decompose', 5], // Tear the flesh from an enemy, dealing {33%} damage per second and forming a usable Corpse with the flesh every 2 seconds.
  ['enhanced-decompose', 1], // If an enemy dies while being Decomposed, you gain 10 Essence.
  ['acolytes-decompose', 1], // Every 1.5 seconds, Decompose makes enemies Vulnerable for 4 seconds.
  ['initiates-decompose', 1], // Decompose Slows enemies by 50%, and if you channel Decompose for at least 1.5 seconds, you gain 30%[+] Movement Speed for 5 seconds after ending the channel
  ['hemorrhage', 5], // Burst an enemy's blood, dealing {27%} damage. Hemorrhage has a 20% chance to form a Blood Orb.
  ['enhanced-hemorrhage', 1], // After picking up a Blood Orb, your next Hemorrhage also deals damage to enemies around your target and grants 2 additional Essence per enemy hit.
  ['acolytes-hemorrhage', 1], // Hemorrhage gains an additional 20% Attack Speed while Healthy.
  ['initiates-hemorrhage', 1], // Hemorrhage grants 1.6% Base Life as Fortify each time it hits an enemy, and has a 1.5% chance per enemy hit to Fortify you for 100% Base Life.
  ['reap', 5], // Sweep an ethereal scythe in front of you, dealing {13}% damage. Hitting an enemy with Reap increases your Damage Reduction by 15% for 2 seconds.
  ['enhanced-reap', 1], // If an enemy hit by Reap dies within 2 seconds, you gain 30% Attack Speed for 3 seconds.
  ['acolytes-reap', 1], // Reap forms a Corpse under the first enemy hit. Can only occur every 4 seconds.
  ['initiates-reap', 1], // Reap instantly kills targets below 5% Life.
  ['blight', 5], // Unleash concentrated blight that deals {['30%', '33%', '36%', '39%', '42%',} damage and leaves behind a defiled area, dealing {value2} damage over 6 seconds.
  ['enhanced-blight', 1], // Blight Slows enemies by 25%.
  ['supernatural-blight', 1], // You and your Minions deal 15% increased damage to enemies within Blight.
  ['paranormal-blight', 1], // Blight has a 30% chance to Immobilize enemies for 1.5 seconds on impact.
  ['blood-lance', 5], // Throw a blood lance that lingers in an enemy for 3 seconds, dealing {['45%', '50%', '54%', '58%', '63%',} damage to the enemy and all other lanced enemies.
  ['enhanced-blood-lance', 1], // Enhanced Blood Lance Blood Lance pierces through enemies who are currently lanced, dealing  10% reduced damage to subsequent enemies after the first.
  ['supernatural-blood-lance', 1], // After casting Blood Lance 6 times, your next cast of Blood Lance is guaranteed to Overpower and spawns a Blood Orb under the first enemy hit.
  ['paranormal-blood-lance', 1], // While at least 2 enemies or a Boss are affected by Blood Lance, you gain 15% Attack Speed and Blood Lance's Essence cost is reduced by 2.
  ['blood-surge', 5], // Draw blood from enemies, dealing {['20%', '22%', '24%', '26%', '28%',} damage, and expel a blood nova, dealing {value2} damage. Blood Surge's nova damage is increased by 10% per enemy drained, up to 50%.
  ['enhanced-blood-surge', 1], // Enhanced Blood Surge Blood Surge Heals you for  3.0% of your Maximum Life  (50) when drawing blood from enemies. If 4 or more enemies are drawn from, then Heal for an additional  3.0% of your Maximum Life  (50).
  ['supernatural-blood-surge', 1], // Each time an enemy is hit by Blood Surge's nova, you are Fortified for 1% Base Life. While you have Fortify for over 50% of your Maximum Life, Blood Surge deals 20% increased damage.
  ['paranormal-blood-surge', 1], // If an enemy is damaged by Blood Surge's nova while you are Healthy, gain 1 stack of Overwhelming Blood. When you have 5 stacks of Overwhelming Blood, your next Blood Surge Overpowers.
  ['bone-spear', 5], // Conjure a bone spear from the ground, dealing {['85%', '94%', '102%', '111%', '119%',} damage and piercing through enemies.
  ['enhanced-bone-spear', 1], // Bone Spear breaks into 3 shards when it is destroyed, dealing 10% damage each.
  ['supernatural-bone-spear', 1], // Bone Spear makes the first enemy hit Vulnerable for 3 seconds.
  ['unliving-energy', 3], // Your Maximum essence is increased by [3,6,9]
  ['paranormal-bone-spear', 1], // Bone Spear has a 5% increased Critical Strike Chance. If Bone Spear's primary projectile Critically Strikes, it fires 2 additional bone shards upon being destroyed.
  ['sever', 5], // A specter of you charges forward and attacks with its scythe for {66%} damage then returns to you and attacks again for {value2} damage.
  ['enhanced-sever', 1], // Sever damages enemies along its path for 40% of its initial damage.
  ['supernatural-sever', 1], // Sever deals 2% increased damage for each Minion you have upon cast.
  ['paranormal-sever', 1], // Paranormal Sever Every  3rd cast of Sever makes enemies Vulnerable for 2 seconds.
  ['blood-mist', 5], // Disperse into a bloody mist, becoming Immune for 3 seconds. Your Movement Speed is reduced by 20% and you periodically deal 2% damage to enemies and Healing for {value2} of your Maximum Life.
  ['enhanced-blood-mist', 1], // Casting a Skill that Overpowers reduces the cooldown of Blood Mist by 2 seconds.
  ['ghastly-blood-mist', 1], // Blood Mist leaves behind a Corpse every 1 second.
  ['dreadful-blood-mist', 1], // You gain +10% Critical Strike Chance for 4 seconds after Blood Mist ends.
  ['bone-prison', 5], // Unearth a prison of bone with [X], Life that surrounds the target area for 6 seconds.
  ['enhanced-bone-prison', 1], // Enemies inside of Bone Prison are Vulnerable.
  ['ghastly-bone-prison', 1], // If an enemy is trapped by Bone Prison, gain  25 Essence, plus an additional 5 per enemy trapped.
  ['dreadful-bone-prison', 1], // Reduce your active cooldowns by 0.5 seconds for each enemy trapped by Bone Prison, up to 3 seconds.
  ['bone-spirit', 5], // Consume all of your Essence to conjure a spirit of bone that seeks enemies. Upon reaching an enemy, the spirit explodes, dealing {['80%', '88%', '96%', '104%', '112%',} damage to the target and all surrounding enemies. Damage is increased by 4% for each point of Essence spent casting Bone Spirit.
  ['enhanced-bone-spirit', 1], // If Bone Spirit Critically Strikes, its Cooldown is reduced by 7 seconds. This effect can only happen once per cast.
  ['ghastly-bone-spirit', 1], // Bone Spirit has an additional 10% Critical Strike Chance.
  ['dreadful-bone-spirit', 1], // After Bone spirit hits an enemy, you generate 30% of your Maximum Essence over the next 4 seconds.
  ['decrepify', 5], // Curse the target area. Enemies afflicted by Decrepify are Slowed by {['40.0%', '43.0%', '45.8%', '48.5%', '51.1%',} and deal 20% less damage for 10 seconds.
  ['enhanced-decrepify', 1], // Lucky Hit: Enemies hit while afflicted with Decrepify have up to a 10% chance to Stun them for 2 seconds.
  ['abhorrent-decrepify', 1], // Lucky Hit: Enemies hit while afflicted with Decrepify have up to a 20% chance to reduce your active Cooldowns by 1 second.
  ['horrid-decrepify', 1], // When you or your Minions hit an enemy afflicted with Decrepify below 10% Life, they are instantly killed. Does not work on Bosses.
  ['iron-maiden', 5], // Curse the target area. Enemies afflicted by Iron Maiden take {20%} damage each time they deal direct damage. Lasts 10 seconds.
  ['enhanced-iron-maiden', 1], // Iron Maiden no longer costs Essence. Instead, gain 5 Essence for each enemy Cursed. Does not work with enemies who are already Cursed with Iron Maiden.
  ['abhorrent-iron-maiden', 1], // Abhorrent Iron Maiden Heal for  7% of your Maximum Life  (116) when an enemy dies while afflicted with Iron Maiden.
  ['horrid-iron-maiden', 1], // When at least 3 enemies are afflicted by Iron Maiden, its damage is increased by 30%.
  ['corpse-explosion', 5], // Detonate a Corpse, dealing 50% damage to surrounding enemies.
  ['enhanced-corpse-explosion', 1], // Corpse Explosion's radius is increased by 15%.
  ['blighted-corpse-explosion', 1], // Corpse Explosion becomes a Darkness Skill and, instead of exploding, releases a vile miasma dealing 95% Shadow Damage over 6 seconds.
  ['plagued-corpse-explosion', 1], // Corpse Explosion deals 10% increased damage to enemies that are Slowed, Stunned or Vulnerable. These damage bonuses can stack.
  ['corpse-tendrils', 5], // Veins burst out of a Corpse, Pulling in enemies, Stunning them for 3 seconds, and dealing {value2} damage to them. Does not consume the Corpse.
  ['enhanced-corpse-tendrils', 1], // Enemies who are in range of Corpse Tendrils are Slowed by 50% before being Pulled.
  ['blighted-corpse-tendrils', 1], // Corpse Tendrils has a 35% chance when damaging enemies to drop a Blood Orb.
  ['plagued-corpse-tendrils', 1], // Enemies damaged by Corpse Tendrils are made Vulnerable for 3 seconds.
  ['army-of-the-dead', 1], // Call forth the deep buried dead. Volatile Skeletons emerge over the next 7 seconds that explode when around enemies, dealing 30% damage.
  ['prime-army-of-the-dead', 1], // When Army of the Dead‘s Volatile Skeletons explode, they have a 100% chance to leave behind a Corpse.
  ['supreme-army-of-the-dead', 1], // Army of the Dead also raises your Skeletal Warriors and Skeletal Mages.
  ['blood-wave', 1], // Conjure a tidal wave of blood that deals 90% damage and Knocks Back enemies.
  ['prime-blood-wave', 1], // Blood Wave Slows enemies by 50% for 4 seconds.
  ['supreme-blood-wave', 1], // Blood Wave leaves behind 3 Blood Orbs as it travels.
  ['bone-storm', 1], // A swirling storm of bones appears around you and your Golem, dealing 180% to surrounding enemies over 10 seconds.
  ['prime-bone-storm', 1], // Your Damage Reduction is increased by 15% while Bone Storm is active.
  ['supreme-bone-storm', 1], // Your Critical Strike Chance is increased by 20% while Bone Storm is active.
  ['amplify-damage', 3], // You deal {4%} increased damage to Cursed enemies.
  ['bonded-in-essence', 3], // Every 8 seconds, your Skeletal Priest's Healing will Heal your skeletons for an additional {['20%', '40%', '60%',} of their Maximum Life.
  ['coalesced-blood', 3], // While Healthy your Blood Skills deal {['6%', '12%', '18%',} increased damage.
  ['compound-fracture', 3], // After Critically Striking 10 times with Bone Skills, your Bone Skills deal {['5%', '10%', '15%',} increased damage for 5 seconds.
  ['crippling-darkness', 3], // Lucky Hit: Darkness Skills have up to a 15% chance to Stun for {[1, 2, 3],} seconds.
  ['deaths-defense', 3], // Your Minions gain +4/8/12% Armor and 8/16/24% Resistance to All Elements.
  ['deaths-embrace', 3], // Close enemies take {['2%', '4%', '6%',} more damage from you and deal {value2} less damage to you.
  ['deaths-reach', 3], // You deal {['4%', '8%', '12%',} increased damage to Distant enemies.
  ['drain-vitality', 3], // Lucky Hit: Hitting enemies with Blood Skills has up to a 30% chance to Fortify you for {['2%', '5%', '8%',} Base Life.
  ['evulsion', 3], // Your Bone Skills deal {5%} increased Critical Strike Damage to Vulnerable enemies.
  ['fueled-by-death', 3], // You deal 3% increased damage for 6 seconds after consuming a Corpse.
  ['gloom', 3], // When you damage enemies with Darkness Skills, they take {['2%', '4%', '6%',} increased Shadow Damage from you and your Minions for 2 seconds, stacking up to 3 times.
  ['golem-mastery', 3], // Increase the damage and Life of your Golem by 25%.
  ['grim-harvest', 3], // Consuming a Corpse generates {[2, 4, 6],} Essence.
  ['gruesome-mending', 3], // Receive 10/20/30%+ more Healing from all sources.
  ['hellbent-commander', 3], // Your Minions deal {['10%', '20%', '30%',} increased damage while you are Close to them.
  ['hewed-flesh', 3], // Lucky Hit: Your damage has up to a {['4%', '8%', '12%',} chance to create a Corpse at the target‘s location.
  ['imperfectly-balanced', 3], // Your Core Skills cost 3% more Essence, but deal 5% increased damage.
  ['inspiring-leader', 3], // After you have been Healthy for at least 2 seconds, you and your Minions gain {['4%', '8%', '12%',} Attack Speed.
  ['kalans-edict', 1], // After you have not taken damage in the last 2 seconds, your Minions gain 15% Attack Speed. While you have at least 7 Minions, this bonus is doubled.
  ['memento-mori', 3], // Sacrificing both Skeletal Warriors and Skeletal Mages increases their Sacrifice bonuses by {['20%', '40%', '60%',} .
  ['necrotic-carapace', 3], // When a Corpse is formed from your Skills or your Minions, Fortify for 2% Base Life.
  ['ossified-essence', 1], // Your Bone Skills deal 1% increased damage for each point of Essence you have above 50 upon cast.
  ['rapid-ossification', 3], // Every 100 Essence you spend reduces the cooldowns of your Bone Skills by {[0.5, 1, 1.5],} seconds.
  ['rathmas-vigor', 1], // After being Healthy for 12 seconds, your next Blood Skill Overpowers. This timer is reduced by 2 seconds each time Blood Orbs Heal or Overheal you for an amount greater than or equal to your base Life.
  ['reapers-pursuit', 3], // Damaging enemies with Darkness Skills increases your Movement Speed by {['5%', '10%', '15%',} for 3 seconds.
  ['serration', 3], // Your Bone Skills have a {['0.3%', '.6%', '.9%',} increased Critical Strike Chance for each 30 Essence you have upon cast.
  ['shadowblight', 1], // Talent ['shadowblight', 1] Shadow damage infects enemies with Shadowblight for 2 seconds.
  //Every 10th time an enemy receives Shadow damage from you or your Minions while they are affected by Shadowblight, they take an additional 22% Shadow damage.
  // Shadowblight's damage is increased by 100% [x] of your Shadow Damage over Time bonus.
  ['skeletal-mage-mastery', 3], // Increase the damage and Life of your Skeletal Mages by 20% .
  ['skeletal-warrior-mastery', 3], // Increase the damage and Life of your Skeletal Warriors by {['15%', '30%', '45%',} .
  ['spiked-armor', 3], // Gain {.1,.2,.3}, Thorns.
  ['stand-alone', 3], // Increases Damage Reduction by 6/12/18% when you have no minions. Each active minion reduces this bonus by 2%.
  ['terror', 3], // Shadow Damage deals {['3%', '6%', '9%',} bonus damage to enemies who are Chilled or Slowed, and {value2} bonus damage to enemies who are Frozen, Stunned or Immobilized. These bonuses stack and apply to Shadow Damage dealt by your Minions.
  ['tides-of-blood', 3], // Your Blood Skills deal {['5%', '10%', '15%',} increased Overpower damage. This bonus is doubled while you are Healthy.
  ['transfusion', 3], // Lucky Hit: Blood Skills have a 3/6/9% chance on hit to spawn a Blood Orb. This can only occur once every 4 seconds. This chance is doubled against bosses.
]

// This creates a map from the talent name above to a talent node with its name. Used to look up
// nodes and add dependencies.
export function CreateNecromancerTalentNodes(): Record<
  string,
  TalentNode
> {
  const nodes: Record<string, TalentNode> = {}
  for (const [key, value] of NecromancerTalentsToMaxValue) {
    nodes[key] = new TalentNode(key, value)
  }
  return nodes
}
// Map used to identify which talents should be increased for talent modifiers.
export function CreateNecromancerTalentModifierMap(): Record<
  string,
  string[]
> {
  return {
    'ranks-of-blight': ['blight'],
    'ranks-of-blood-lance': ['blood-lance'],
    'ranks-of-blood-mist': ['blood-mist'],
    'ranks-of-blood-surge': ['blood-surge'],
    'ranks-of-bone-prison': ['bone-prison'],
    'ranks-of-bone-spear': ['bone-spear'],
    'ranks-of-bone-spirit': ['bone-spirit'],
    'ranks-of-corpse-explosion': ['corpse-explosion'],
    'ranks-of-corpse-tendrils': ['corpse-tendrils'],
    'ranks-of-decrepify': ['decrepify'],
    'ranks-of-iron-maiden': ['iron-maiden'],
    'ranks-of-sever': ['sever'],

    // Passive Talents
    'ranks-of-the-gloom-passive': ['gloom'],
    'ranks-of-the-deaths-reach-passive': ['deaths-reach'],
    'ranks-of-the-deaths-embrace-passive': ['deaths-embrace'],
    'ranks-of-the-terror-passive': ['terror'],
    'ranks-of-the-coalesced-blood-passive': ['coalesced-blood'],
    'ranks-of-the-imperfectly-balanced-passive': [
      'imperfectly-balanced',
    ],
    'ranks-of-the-compound-fracture-passive': ['compound-fracture'],
    'ranks-of-the-tides-of-blood-passive': ['tides-of-blood'],
    'ranks-of-the-evulsion-passive': ['evulsion'],
    'ranks-of-the-hellbent-commander-passive': ['hellbent-commander'],
    'ranks-of-the-amplify-damage-passive': ['amplify-damage'],
    'ranks-of-the-fueled-by-death-passive': ['fueled-by-death'],
    'ranks-of-the-hewed-flesh-passive': ['hewed-flesh'],

    // Skill Talents
    'ranks-of-all-corpse-skills': [
      'corpse-tendrils',
      'corpse-explosion',
    ],
    'ranks-of-all-curse-skills': ['decrepify', 'iron-maiden'],
    'ranks-of-all-macabre-skills': [
      'blood-mist',
      'bone-prison',
      'bone-spirit',
    ],
    'ranks-of-all-defensive-skills': [],
    'ranks-of-all-core-skills': [
      'blood-lance',
      'blood-surge',
      'blight',
      'sever',
      'bone-spear',
    ],
  }
}

export function CreateNecromancerAspectNodes(): Record<
  string,
  AspectNode
> {
  return {
    /*--------------------------------------------------
                         Necromancer Aspect
          --------------------------------------------------*/
    // Aspect of Ultimate Shadow : Bone Storm and Blood Wave are also Darkness Skills, deal Shadow damage, and gain additional effects:
    //• Enemies damaged by Bone Storm take {80/110} Shadow damage over 2.0 seconds.
    //• Blood Wave desecrates the ground it travels over, dealing {1280/1760} Shadow damage over 4.0 seconds
    'aspect-of-ultimate-shadow': new AspectNode(
      'aspect-of-ultimate-shadow',
      2,
    ),

    // Aspect of Explosive Mist : Blood Mist triggers Corpse Explosion on surrounding Corpses. When Blood Mist detonates a Corpse, its Cooldown is reduced by {.2/.5} seconds.
    'aspect-of-explosive-mist': new AspectNode(
      'aspect-of-explosive-mist',
      1,
    ),

    // Aspect of Frenzied Dead : Each time one of your Summoning Minions damages an enemy, they gain +{10/14}% Attack Speed for 3.0 seconds, up to +{30/42}%.
    'aspect-of-frenzied-dead': new AspectNode(
      'aspect-of-frenzied-dead',
      2,
    ),

    // Splintering Aspect : Bone Spear's primary attack makes enemies hit beyond the first Vulnerable for {1.5/2.5} seconds. Bone Shards from Bone Spear deal {30/60}% bonus damage to Vulnerable enemies and pierce them.
    'splintering-aspect': new AspectNode('splintering-aspect', 2),

    // Aspect of Plunging Darkness : Bone Prison spawns a pool of Blight that deals {75/125}% bonus damage over 6.0 seconds.
    'aspect-of-plunging-darkness': new AspectNode(
      'aspect-of-plunging-darkness',
      1,
    ),

    // Rotting Aspect : Decompose can chain up to 2.0 additional targets. When Decompose spawns a Corpse, it has a {50/100}% chance to spawn a Corpse under all afflicted targets.
    'rotting-aspect': new AspectNode('rotting-aspect', 1),

    // Aspect of Empowering Reaper : Sever has a {10/20}% chance to spawn a pool of Blight under the target that deals {40/80}% bonus damage. This effect can only happen once every 3.0 seconds.
    'aspect-of-empowering-reaper': new AspectNode(
      'aspect-of-empowering-reaper',
      2,
    ),

    // Blood Seeker's Aspect : Blood Lance deals x{15/25}% increased damage to its primary target per lanced enemy.
    'blood-seekers-aspect': new AspectNode('blood-seekers-aspect', 1),

    // Aspect of Hungry Blood : Each cast of Blood Lance will launch an additional Blood Lance at a Nearby enemy when it first hits an enemy that is already lanced, dealing 48% of normal damage.
    'aspect-of-hungry-blood': new AspectNode(
      'aspect-of-hungry-blood',
      1,
    ),

    // Blood-soaked Aspect : Blood Mist leaves a trail that lasts for 4.0 seconds and deals {75/100} Shadow damage per second to enemies who stand in it. Your Movement Speed is no longer reduced while Blood Mist is active.
    'blood-soaked-aspect': new AspectNode('blood-soaked-aspect', 1),

    // Aspect of Swelling Curse : Bone Spirit’s Critical Strike Chance is increased by 15–25%[+]. Your Maximum Essence is increased by 2 for each enemy hit for 15 seconds.
    'aspect-of-swelling-curse': new AspectNode(
      'aspect-of-swelling-curse',
      1,
    ),

    // Aspect of Bursting Bones : When a segment of Bone Prison is destroyed or expires, it deals {11/15} damage in an area around itself.
    'aspect-of-bursting-bones': new AspectNode(
      'aspect-of-bursting-bones',
      1,
    ),

    // Unyielding Commander's Aspect : While Army of the Dead is active, your Minions gain +{70/100}% Attack Speed and take 90% reduced damage.
    'unyielding-commanders-aspect': new AspectNode(
      'unyielding-commanders-aspect',
      1,
    ),

    // Aspect of Grasping Veins : Gain +{10/20}% increased Critical Strike Chance for 6.0 seconds when you cast Corpse Tendrils. You deal x{20/40}% bonus Critical Strike Damage to enemies damaged by Corpse Tendrils.
    'aspect-of-grasping-veins': new AspectNode(
      'aspect-of-grasping-veins',
      2,
    ),

    // Aspect of Serration : The Ossified Essence Key Passive also increases the Critical Strike Damage of your Bone Skills by +1.0%x per Essence above 50.0, up to +{30/40}%.
    'aspect-of-serration': new AspectNode('aspect-of-serration', 1),

    // Osseous Gale Aspect : Bone Storm consumes up to 8 Corpses to increase its duration by up to {5/10} seconds.
    'osseous-gale-aspect': new AspectNode('osseous-gale-aspect', 1),

    // Blighted Aspect : You deal x{50/120}% increased damage for 6.0 seconds after the Shadowblight Key Passive damages enemies 10.0 times.
    'blighted-aspect': new AspectNode('blighted-aspect', 1),

    // Aspect of the Damned : You deal x{40/50}% increased Shadow Damage to enemies afflicted by both Decrepify and Iron Maiden.
    'aspect-of-the-damned': new AspectNode('aspect-of-the-damned', 1),

    // Aspect of Decay : Each time the Shadowblight Key Passive deals damage to enemies, it increases the next Shadowblight's damage within 10.0 seconds by x{25/45}%, stacking up to 5.0 times.
    'aspect-of-decay': new AspectNode('aspect-of-decay', 1),

    // Blood-bathed Aspect : Blood Surge's nova echoes again after a short delay, dealing x{50/60}% less damage.
    'blood-bathed-aspect': new AspectNode('blood-bathed-aspect', 1),

    // Tidal Aspect : Blood Wave fires two additional waves, each dealing x{40-50}% less damage than the previous.
    'tidal-aspect': new AspectNode('tidal-aspect', 1),

    // Aspect of Rathma's Chosen : Whenever your Blood Skills Overpower you gain +{20/50}% Attack Speed for 4.0 seconds.
    'aspect-of-rathmas-chosen': new AspectNode(
      'aspect-of-rathmas-chosen',
      1,
    ),

    // Aspect of Untimely Death : Each percent of your Maximum Life you Heal beyond 100.0% grants you +0.5% bonus Overpower damage on your next Overpowering attack, up to a {20/60}% bonus.
    'aspect-of-untimely-death': new AspectNode(
      'aspect-of-untimely-death',
      1,
    ),

    // Sacrificial Aspect : Your Sacrifice bonuses are increased by {15/25}%.
    'sacrificial-aspect': new AspectNode('sacrificial-aspect', 1),

    // Aspect of Reanimation : Your Minions gain increased damage while alive, up to x{30/40}% after 10.0 seconds.
    'aspect-of-reanimation': new AspectNode(
      'aspect-of-reanimation',
      1,
    ),

    // Cadaverous Aspect : Consuming a Corpse increases the damage of your next Core Skill by x{5/10}%, up to x{25/50}%.
    'cadaverous-aspect': new AspectNode('cadaverous-aspect', 2),

    // Flesh-Rending Aspect : After Decompose spawns a Corpse, gain {10/20} Essence.
    'flesh-rending-aspect': new AspectNode('flesh-rending-aspect', 1),

    // Aspect of Torment: Critical Strikes with Bone Skills increase your Essence Regeneration by x[90-170]% for 4 seconds.
    'aspect-of-torment': new AspectNode('aspect-of-torment', 1),

    // Aspect of Exposed Flesh : Lucky Hit: Up to a 10.0% chance to generate {30/50} Essence when hitting a Vulnerable enemy.
    'aspect-of-exposed-flesh': new AspectNode(
      'aspect-of-exposed-flesh',
      1,
    ),

    // Fastblood Aspect : Blood Orbs reduce your Ultimate Cooldown by {1-1.5} seconds.
    'fastblood-aspect': new AspectNode('fastblood-aspect', 1),

    // Aspect of Potent Blood : While healthy Life, Blood Orbs grant {10/20} Essence.
    'aspect-of-potent-blood': new AspectNode(
      'aspect-of-potent-blood',
      1,
    ),

    // Hulking Aspect : Your Golem has a {2-5}% chance to reduce its active Cooldown by 2.0 seconds and a {1-2.5}% chance to spawn a Corpse each time it damages an enemy with its normal attack.
    'hulking-aspect': new AspectNode('hulking-aspect', 2),

    // Requiem Aspect : You gain {3/5} Maximum Essence per active Minion.
    'requiem-aspect': new AspectNode('requiem-aspect', 1),

    // Aspect of the Void : Blight's defiled area, when spawned, Pulls in enemies around the affected area.
    'aspect-of-the-void': new AspectNode('aspect-of-the-void', 0),

    // Coldbringer's Aspect : Every 8.0 seconds, your keletal Mages cast a blizzard that deals {250/300} Cold damage and continuously Chills enemies for 8% over 6.0 seconds.
    'coldbringers-aspect': new AspectNode('coldbringers-aspect', 1),

    // Viscous Aspect : Your maximum number of Skeletal Mages is increased by 2.
    // renamed occult dominion aspect
    'viscous-aspect': new AspectNode('viscous-aspect', 0),

    // Blood Getter's Aspect : Your maximum number of Skeletal Warriors is increased by 2.
    'blood-getters-aspect': new AspectNode('blood-getters-aspect', 0),

    // Torturous Aspect : Iron Maiden is now also a Darkness skill and deals Shadow damage. Enemies afflicted by your Iron Maiden have a [15–25]% chance to be Stunned for 1 second when they deal direct damage.
    'torturous-aspect': new AspectNode('torturous-aspect', 1),

    // Bloodless Scream : Your Darkness Skills Chill enemies for up to 100.0%.
    //Lucky Hit: Your Darkness Skills have up to a 100.0% chance to generate {7/10} additional Essence against Frozen targets.
    //  Darkness Skills deal x20-x50% bonus damage to Frozen enemies.
    'bloodless-scream': new AspectNode('bloodless-scream', 2),

    // Aspect of Shielding Storm : Each time that Bone Storm damages an enemy, gain a Barrier equal to {2/5}% of your Base Life for 10.0 seconds.
    'aspect-of-shielding-storm': new AspectNode(
      'aspect-of-shielding-storm',
      1,
    ),

    // Aspect of Hardened Bones : While you have 7.0 or more Minions, your Minions gain {15/20}% increased Damage Reduction.
    'aspect-of-hardened-bones': new AspectNode(
      'aspect-of-hardened-bones',
      1,
    ),

    // Aspect of the Embalmer : Consuming a Corpse has a {20/30}% chance to spawn a Blood Orb.
    'aspect-of-the-embalmer': new AspectNode(
      'aspect-of-the-embalmer',
      1,
    ),

    // Gore Quills Aspect: Blood Lance will consome Blood Orbs to also conjure lances from them. Each additional Blood Lance deals [20 -50]% of normal damage and prioritizes targeting un-lanced enemies.
    'gore-quills': new AspectNode('gore-quills', 1),

    // Aspect of the Long Shadow (Necromancer Offensive Aspect): Lucky Hit: Your Shadow Damage Over Time effects have a 10-30% chance to generate 3 Essence. Damage from your Shadowblight Key Passive will always generate 2 Essence.
    'aspect-of-the-long-shadow': new AspectNode(
      'aspect-of-the-long-shadow',
      1,
    ),

    // Shattered Spirit's Aspect: Casting Bone Spirit also launches 18 Bone Splinters in all directions, dealing 200–400%[x] increased damage and generating 6 Essence per enemy hit.
    'shattered-spirits-aspect': new AspectNode(
      'shattered-spirits-aspect',
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

    // Black River : Corpse Explosion consumes up to 4.0 additional Corpses around the initial Corpse, dealing x{122/130}% increased damage and with a {21/25}% larger radius per additional Corpse.
    'black-river': new AspectNode('black-river', 2),

    // Deathspeaker's Pendant : Blood Surge casts a mini nova on your Minions, dealing {50/75} damage. Damage is increased by 10.0% per target drained by the initial cast, up to 50.0%.
    'deathspeakers-pendant': new AspectNode(
      'deathspeakers-pendant',
      1,
    ),

    // Greaves of the Empty Tomb : Create desecrated ground beneath your Sever spectres as they travel, damaging enemies for {150/210} Shadow damage over 2.0 seconds.
    'greaves-of-the-empty-tomb': new AspectNode(
      'greaves-of-the-empty-tomb',
      1,
    ),

    // Blood Artisans Cuirass : When you pick up {5/10} Blood Orbs, a free Bone Spirit is spawned, dealing bonus damage based on your current Life percent.
    'blood-artisans-cuirass': new AspectNode(
      'blood-artisans-cuirass',
      1,
    ),

    // Lucky Hit: Up to a [0.7|%|] chance to deal 0.7*825 Shadow damage to surrounding enemies and reduce their damage done by 20% for 3 seconds.
    doombringer: new AspectNode('doombringer', 2),

    // Howl from Below : Instead of detonating immediately, Corpse Explosion summons a Volatile Skeleton that charges at a random enemy and explodes. Corpse Explosion's damage is increased by x{30/40}%.
    'howl-from-below': new AspectNode('howl-from-below', 1),

    // Deathless Visage : Bone Spear leaves behind echoes as it travels that explode, dealing {125/175} damage.
    //                    The Echoes left behind by Bone Spear from the Unique power now deal 5% [x] increased damage for every +30% of your Critical Strike Bonus Damage stat.
    'deathless-visage': new AspectNode('deathless-visage', 1),

    // Ring of Mendeln : Lucky Hit: Up to a 10.0% chance to empower all of your Minions, causing the next attack from each to explode for {1500/2000} Physical damage.
    'ring-of-mendeln': new AspectNode('ring-of-mendeln', 1),

    // (Unique) Ring-of-Starless-Skies: Spending resources reduces your resource costs and increases your damage by 10%[x] for 3 seconds, up to 40%.
    'ring-of-starless-skies': new AspectNode(
      'ring-of-starless-skies',
      0,
    ),

    // (Unique) Razorplate: Gain {1000/2000} Thorns
    razorplate: new AspectNode('razorplate', 1),

    // (Unique) Fists-of-Fate: Your attacks randomly deal 1% to {200/300}% of their normal damage.
    'fists-of-fate': new AspectNode('fists-of-fate', 1),

    // (Unique) Andariel's-Visage: Lucky Hit: Up to a {10/20}% chance to trigger a poison nova that applies 1125 Poisoning damage over 5.0 seconds to enemies in the area.
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

    // (Unique) Mother's-Embrace: If a Core Skill hits 4 or more enemies, {20/40}% of the Resource cost is refunded.
    'mothers-embrace': new AspectNode('mothers-embrace', 1),

    // Lucky Hit: Up to a 100% chance to lose all of your Resource.
    'ring-of-misfortune': new AspectNode('ring-of-misfortune', 0),

    // (Unique) Temerity: Effects that Heal you beyond 100.0% Life grant you a Barrier up to {50/100}% of your Maximum Life that lasts for 30.0 seconds.
    temerity: new AspectNode('temerity', 1),

    // Increases your Critical Strike Damage by [[60 - 100]|%x|]. The other properties on this weapon can roll higher than normal.
    'the-grandfather': new AspectNode('the-grandfather', 1),

    // Lidless Wall: Lucky Hit: While you have an active Bone Storm, hitting an unaffected enemy has a [5 – 25]% chance to spawn an additional storm at their location. Each of your active Sacrifice bonuses increases the chance by 25% and the total additional Bone Storms you can have by +1.
    'lidless-wall': new AspectNode('lidless-wall', 1),

    // Tassets of the Dawning Sky (Generic Unique Pants): When you take damage from a Non-Physical damage type, you gain +6-10% Maximum Resistance to that damage type for 6 seconds. This effect can only apply to one damage type at a time.
    'tassets-of-the-dawning-sky': new AspectNode(
      'tassets-of-the-dawning-sky',
      1,
    ),

    // Blood Moon Breeches (Necromancer Unique Pants): Your Minions have a 3-7% chance to curse enemies. Enemies affected by at least 1 of your curses take 70% [x] (multiplicative damage) increased Overpower damage from you.
    'blood-moon-breeches': new AspectNode('blood-moon-breeches', 1),

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

    // ring-of-the-sacrilegious-soul: Automatically activate the following equipped Skills on Corpses around you:
    // Raise Skeleton every 1-2 seconds. Corpse Explosion every 1-2 seconds. Corpse Tendrils every 8-16 seconds.
    'ring-of-the-sacrilegious-soul': new AspectNode(
      'ring-of-the-sacrilegious-soul',
      0,
    ),

    // Paingorger's Gauntlets: Damaging enemies with a cast Non–Basic Skill marks them for 3 seconds. When a Basic Skill first hits a marked enemy, the Basic Skill's damage is echoed to all marked enemies, dealing 100–200%[x] increased damage.
    'paingorgers-gauntlets': new AspectNode(
      'paingorgers-gauntlets',
      1,
    ),

    // Mutilator Plate: You are Blood Lanced, and when Blood Lance would deal damage to you it instead Fortifies you for [{value1}]% of your Maximum Life and has a 5% chance to form a Blood Orb. Blood Lance deals [{value2}]%[x] increased damage.
    'mutilator-plate': new AspectNode('mutilator-plate', 2),
  }
}

export function CreateNecromancerToggleNodes(): Record<
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
    'enemy-feared': new ToggleNode('enemy-feared', 'boolean'),
    'enemy-trapped': new ToggleNode('enemy-trapped', 'boolean'),
    'enemy-blighted': new ToggleNode('enemy-blighted', 'boolean'), // Enemy is standing in Blight (Core Skill)
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

    // Recent Event Triggers - recently could have a letiety of time spans so its easiest to set it as a toggle with the onus on the player
    'crit-recently': new ToggleNode('crit-recently', 'boolean'),
    'killed-enemy-recently': new ToggleNode(
      'killed-enemy-recently',
      'boolean',
    ),
    'overpower-recently': new ToggleNode(
      'overpower-recently',
      'boolean',
    ), // Player has Overpowered recently
    'picked-up-blood-orb-recently': new ToggleNode(
      'picked-up-blood-orb-recently',
      'boolean',
    ),

    'damage-not-taken-recently': new ToggleNode(
      'damage-not-taken-recently',
      'boolean',
    ), // Player has not taken damage recently
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
export function CreateNecromancerBaseStatsNode(): BaseStatsNode {
  return new BaseStatsNode('Necromancer', 1)
}

function CopyTags(tags: Set<string>): Set<string> {
  const new_tags = new Set<string>()
  for (const tag of tags) {
    new_tags.add(tag)
  }
  return new_tags
}

export function CreateNecromancerTagsNode(
  nodes_map: NodesMap,
): TagsNode {
  return new TagsNode('NecromancerTags', () => {
    const skill_tags = currentSkillVal(nodes_map)['tags']
    // Deep Copy the skill tags.
    const total_tags = CopyTags(skill_tags)

    // These are the tags for a skill.
    total_tags.add('skill')

    //'blighted-corpse-explosion' Corpse Explosion becomes a Darkness Skill and, instead of exploding, releases a vile miasma dealing 95% Shadow Damage over 6 seconds.
    if (
      talentVal(nodes_map, 'blighted-corpse-explosion') > 0 &&
      currentSkillVal(nodes_map)['name'] == 'corpse-explosion'
    ) {
      total_tags.add('darkness')
      total_tags.add('shadow-damage-over-time')
      total_tags.add('shadow')
      total_tags.delete('physical')
    }

    // Aspect of Ultimate Shadow : Bone Storm and Blood Wave are also Darkness Skills, deal Shadow damage, and gain additional effects:
    //• Enemies damaged by Bone Storm take {80/110} Shadow damage over 2.0 seconds.
    //• Blood Wave desecrates the ground it travels over, dealing {1280/1760} Shadow damage over 4.0 seconds
    if (
      aspectVal(nodes_map, 'aspect-of-ultimate-shadow').length > 0 &&
      (currentSkillVal(nodes_map)['name'] == 'bone-storm' ||
        currentSkillVal(nodes_map)['name'] == 'blood-wave')
    ) {
      total_tags.add('darkness')
      total_tags.add('shadow-damage-over-time')
      total_tags.add('shadow')
      total_tags.delete('physical')
    }

    return total_tags
  })
}

// (TODO) Figure out which tags we actually need.
export function CreateNecromancerSkillNodes(): Record<
  string,
  SkillNode
> {
  return {
    // Skill Node : (Skill Name, Category, Tags[], Flat Modifier, DoT Modifier, Cooldown, Resource Build/Spend, Lucky Hit)
    'bone-splinters': new SkillNode(
      'bone-splinters',
      'basic',
      ['basic', 'bone', 'physical', 'vulnerable'],
      0.09,
      0.0,
      0,
      7,
      0.17,
    ),
    decompose: new SkillNode(
      'decompose',
      'basic',
      [
        'basic',
        'darkness',
        'shadow',
        'shadow-damage-over-time',
        'channeled',
      ],
      0.33,
      0.0,
      0,
      8,
      0.4,
    ),
    hemorrhage: new SkillNode(
      'hemorrhage',
      'basic',
      ['basic', 'blood', 'physical', 'fortify', 'healthy'],
      0.27,
      0.0,
      0,
      9,
      0.35,
    ),
    reap: new SkillNode(
      'reap',
      'basic',
      ['basic', 'darkness', 'shadow', 'damage-reduction'],
      0.13,
      0.0,
      0,
      4,
      0.17,
    ),
    blight: new SkillNode(
      'blight',
      'core',
      [
        'core',
        'darkness',
        'shadow',
        'shadow-damage-over-time',
        'slow',
        'immobilize',
      ],
      0.3,
      0.95,
      0,
      -25,
      0.4,
    ),
    'blood-lance': new SkillNode(
      'blood-lance',
      'core',
      ['core', 'blood', 'physical', 'overpower'],
      0.8,
      0.0,
      0,
      -15,
      0.33,
    ),
    'blood-surge': new SkillNode(
      'blood-surge',
      'core',
      [
        'core',
        'blood',
        'physical',
        'fortify',
        'heal',
        'healthy',
        'overpower',
      ],
      0.7,
      0,
      0,
      -30,
      0.12,
    ),
    'bone-spear': new SkillNode(
      'bone-spear',
      'core',
      ['core', 'bone', 'physical', 'vulnerable'],
      0.85,
      0.0,
      0,
      -25,
      0.5,
    ),
    sever: new SkillNode(
      'sever',
      'core',
      ['core', 'darkness', 'shadow', 'vulnerable'],
      0.75,
      0.0,
      0,
      -20,
      0.2,
    ),
    'blood-mist': new SkillNode(
      'blood-mist',
      'macabre',
      [
        'macabre',
        'blood',
        'physical',
        'immune',
        'heal',
        'overpower',
        'movement-speed',
      ],
      0.0,
      0.0,
      24,
      0,
      0.09,
    ),
    //"bone-prison": new SkillNode("bone-prison", "macabre", ["macabre", "bone", "fortify", "vulnerable"], 0.0, 0.0, 18, 0, 0),
    'bone-spirit': new SkillNode(
      'bone-spirit',
      'macabre',
      ['macabre', 'physical', 'bone'],
      0.8,
      0.0,
      12,
      0,
      0.33,
    ),
    //"decrepify": new SkillNode("decrepify", "corruption", ["curse", "corruption", "stun", "slow", "lucky-hit"], 0, 0, 0, -10, 0),
    'iron-maiden': new SkillNode(
      'iron-maiden',
      'corruption',
      ['curse', 'corruption', 'heal'],
      0.3,
      0,
      10,
      -10,
      0,
    ),
    'corpse-explosion': new SkillNode(
      'corpse-explosion',
      'corpse',
      ['corpse', 'corruption', 'stun', 'slow', 'physical'],
      0.7,
      0.0,
      0,
      0,
      0.25,
    ),
    'corpse-tendrils': new SkillNode(
      'corpse-tendrils',
      'corpse',
      [
        'corpse',
        'corruption',
        'physical',
        'stun',
        'slow',
        'vulnerable',
        'pull',
      ],
      0.2,
      0.0,
      11,
      0,
      0.2,
    ),
    'army-of-the-dead': new SkillNode(
      'army-of-the-dead',
      'ultimate',
      ['ultimate', 'physical'],
      0.45,
      0.0,
      70,
      0,
      0.63,
    ),
    'blood-wave': new SkillNode(
      'blood-wave',
      'ultimate',
      ['ultimate', 'blood', 'physical', 'slow', 'knock-back'],
      1.2,
      0.0,
      50,
      0,
      0.2,
    ),
    'bone-storm': new SkillNode(
      'bone-storm',
      'ultimate',
      ['ultimate', 'bone', 'physical', 'damage-reduction'],
      1.8,
      0.0,
      60,
      0,
      0.4,
    ),

    // 'raise-skeleton': new SkillNode(
    //   'raise-skeleton',
    //   'summoning',
    //   ['summoning',
    //   0,
    //   0.0,
    //   0,
    //   0,
    //   0
    // ),
    //
    // golem: new SkillNode(
    //   'golem',
    //   'summoning',
    //   ['summoning',
    //   0,
    //   0.0,
    //   0,
    //   0,
    //   0
    // )
  }
}

/*
  These are the nodes that are computed at run time. They all start with value = null and should
  depend on each other and the above nodes. Dependencies are added in after all nodes are defined.
  */

export function CreateNecromancerStatsNodes(
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
          aggregationVal(
            nodes_map,
            'damage-for-4-seconds-after-picking-up-a-blood-orb',
          ) *
          Math.min(1, statVal(nodes_map, 'Blood_Orb_Pickup_Rate') * 4)

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

        // 'damage-while-golem-active',

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

        case 'ultimate':
          Skill_Damage_Bonus += aggregationVal(
            nodes_map,
            'ultimate-skill-damage',
          )
          break

        default:
          break
      }

      if (tagsVal(nodes_map).has('bone')) {
        Skill_Damage_Bonus += aggregationVal(
          nodes_map,
          'bone-skill-damage',
        )
      }

      if (tagsVal(nodes_map).has('blood')) {
        Skill_Damage_Bonus += aggregationVal(
          nodes_map,
          'blood-skill-damage',
        )
      }

      if (tagsVal(nodes_map).has('darkness')) {
        Skill_Damage_Bonus += aggregationVal(
          nodes_map,
          'darkness-skill-damage',
        )
      }

      if (tagsVal(nodes_map).has('summoning')) {
        Skill_Damage_Bonus += aggregationVal(
          nodes_map,
          'summoning-skill-damage',
        )
      }

      // 'corpse-skill-damage', exhumation glyph
      Skill_Damage_Bonus +=
        aggregationVal(nodes_map, 'corpse-skill-damage') *
        Number(tagsVal(nodes_map).has('corpse'))

      return Skill_Damage_Bonus
    }),

    Generic_Critical_Chance: new StatsNode(
      'Generic_Critical_Chance',
      () => {
        const Pre_Sim_Node = necromancerPresimVal(nodes_map)
        let Critical_Chance_Total = 0.05 // 5.0% Base Crit chance for All Classes
        const enemy_spread = Number(
          statVal(nodes_map, 'Enemy_Spread'),
        )
        const number_of_enemies = Number(
          toggleVal(nodes_map, 'number-of-enemies'),
        )

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

        // Skirmisher Warriors Sacrifice - Your Critical Strike Chance is increased by +5%, but you can no longer raise Skeletal Warriors.
        if (
          bookOfTheDeadVal(nodes_map, 'skeletal-warriors')[0] ==
            'skirmishers' &&
          bookOfTheDeadVal(nodes_map, 'skeletal-warriors')[1] == 3
        ) {
          let Sacrifice_Bonus = 0.05 // Sacrificial Aspect : Your Sacrifice bonuses are increased by {15/25}%.
          if (
            aspectVal(nodes_map, 'sacrificial-aspect').length != 0
          ) {
            Sacrifice_Bonus *=
              1 + aspectVal(nodes_map, 'sacrificial-aspect')[0]
          }
          let Memento_Mori = 0 // ['memento-mori', 3] Sacrificing both Skeletal Warriors and Skeletal Mages increases their Sacrifice bonuses by {['20%', '40%', '60%']}
          if (
            talentVal(nodes_map, 'memento-mori') > 0 &&
            bookOfTheDeadVal(nodes_map, 'skeletal-warriors')[1] ==
              3 &&
            bookOfTheDeadVal(nodes_map, 'skeletal-mages')[1] == 3
          ) {
            Memento_Mori += talentVal(nodes_map, 'memento-mori') * 0.2
          }

          Critical_Chance_Total +=
            0.05 * (1 + Sacrifice_Bonus * (1 + Memento_Mori))
        }

        // Talent 'serration': Your Bone Skills have a {['0.3%', '.6%', '.9%',} increased Critical Strike Chance for each 30 Essence you have upon cast.
        if (
          talentVal(nodes_map, 'serration') > 0 &&
          tagsVal(nodes_map).has('bone')
        ) {
          const Serration_Stacks =
            (50 + (statVal(nodes_map, 'Max_Resource') - 50) / 2) / 30
          Critical_Chance_Total +=
            0.003 *
            talentVal(nodes_map, 'serration') *
            Serration_Stacks
        }

        // 'supreme-bone-storm' Your Critical Strike Chance is increased by 20% while Bone Storm is active.
        if (talentVal(nodes_map, 'supreme-bone-storm') > 0) {
          const Bone_Storm_Duration = statVal(
            nodes_map,
            'Bone_Storm_Duration',
          )
          const Bone_Storm_Cooldown = 60
          if (currentSkillVal(nodes_map)['name'] != 'bone-storm') {
            Critical_Chance_Total +=
              0.2 * (Bone_Storm_Duration / Bone_Storm_Cooldown)
          } else {
            Critical_Chance_Total += 0.2
          }
        }

        // "acolytes-bone-splinters" Hitting the same enemy at least 3 times with the same cast of Bone Splinters grants 8% Critical Strike Chance for 4 seconds.
        if (
          talentVal(nodes_map, 'acolytes-bone-splinters') > 0 &&
          'bone-splinters' in Pre_Sim_Node['skill_use_rate']
        ) {
          // 1 - (1-p)**(number_of_enemies-1), Probability of hitting at least 1 enemy with shotgun.
          let Probability_Of_Shotgun =
            1 -
            (1 - ProbabilityInCone(10, 1 / 6, enemy_spread)) **
              (number_of_enemies - 1)
          if (!toggleVal(nodes_map, 'enemy-distant')) {
            Probability_Of_Shotgun = 1
          }
          Critical_Chance_Total +=
            0.08 *
            Probability_Of_Shotgun *
            Math.min(
              Pre_Sim_Node['skill_use_rate']['bone-splinters'] * 4,
              1,
            )
        }

        // ['dreadful-blood-mist', 1], // You gain +10% Critical Strike Chance for 4 seconds after Blood Mist ends.
        if (
          'blood-mist' in Pre_Sim_Node['skill_use_rate'] &&
          talentVal(nodes_map, 'dreadful-blood-mist') > 0
        ) {
          Critical_Chance_Total +=
            0.1 *
            Math.min(
              4 * Pre_Sim_Node['skill_use_rate']['blood-mist'],
              1,
            )
        }

        // Aspect of Grasping Veins : Gain +{10/20}% increased Critical Strike Chance for 6.0 seconds when you cast Corpse Tendrils. You deal x{20/40}% bonus Critical Strike Damage to enemies damaged by Corpse Tendrils.
        if (
          aspectVal(nodes_map, 'aspect-of-grasping-veins').length > 0
        ) {
          let Corpse_Tendrils_Use_Rate = 0
          if ('corpse-tendrils' in Pre_Sim_Node['skill_use_rate']) {
            Corpse_Tendrils_Use_Rate =
              Pre_Sim_Node['skill_use_rate']['corpse-tendrils']
          }

          // ring-of-the-sacrilegious-soul: Automatically activate the following equipped Skills on Corpses around you:
          if (
            aspectVal(nodes_map, 'ring-of-the-sacrilegious-soul')
              .length > 0
          ) {
            Corpse_Tendrils_Use_Rate += 1 / 8
          }

          Critical_Chance_Total +=
            aspectVal(nodes_map, 'aspect-of-grasping-veins')[0] *
            Math.min(6 * Corpse_Tendrils_Use_Rate, 1)
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
        let Critical_Chance_Total = 0

        // critical-strike-chance-with-bone-skills (Necromancer)
        if (currentSkillVal(nodes_map)['tags'].has('bone')) {
          Critical_Chance_Total += aggregationVal(
            nodes_map,
            'critical-strike-chance-with-bone-skills',
          )
        }

        // Aspect of Swelling Curse : Bone Spirit’s Critical Strike Chance is increased by 15–25%[+]. Your Maximum Essence is increased by 2 for each enemy hit for 15 seconds.
        if (
          aspectVal(nodes_map, 'aspect-of-swelling-curse').length !=
            0 &&
          currentSkillVal(nodes_map)['name'] == 'bone-spirit'
        ) {
          Critical_Chance_Total += aspectVal(
            nodes_map,
            'aspect-of-swelling-curse',
          )[0]
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
        'decompose',
        'blood-mist',
        'bone-prison',
        'iron-maiden',
        'decrepify',
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
        const Pre_Sim_Node = necromancerPresimVal(nodes_map)
        let Critical_Multiplier_Total = 1.5

        // Increases your Critical Strike Damage by [[60 - 100]|%x|]. The other properties on this weapon can roll higher than normal.
        if (aspectVal(nodes_map, 'the-grandfather').length > 0) {
          Critical_Multiplier_Total *=
            1 + aspectVal(nodes_map, 'the-grandfather')[0]
        }

        // Aspect of Grasping Veins : Gain +{10/20}% increased Critical Strike Chance for 6.0 seconds when you cast Corpse Tendrils. You deal x{20/40}% bonus Critical Strike Damage to enemies damaged by Corpse Tendrils.
        if (
          aspectVal(nodes_map, 'aspect-of-grasping-veins').length > 0
        ) {
          let Corpse_Tendrils_Use_Rate = 0
          if ('corpse-tendrils' in Pre_Sim_Node['skill_use_rate']) {
            Corpse_Tendrils_Use_Rate =
              Pre_Sim_Node['skill_use_rate']['corpse-tendrils']
          }

          // ring-of-the-sacrilegious-soul: Automatically activate the following equipped Skills on Corpses around you:
          if (
            aspectVal(nodes_map, 'ring-of-the-sacrilegious-soul')
              .length > 0
          ) {
            Corpse_Tendrils_Use_Rate += 1 / 8
          }

          Critical_Multiplier_Total *=
            1 +
            aspectVal(nodes_map, 'aspect-of-grasping-veins')[1] *
              Math.min(6 * Corpse_Tendrils_Use_Rate, 1)
        }

        // Essence: Critical Strikes deal x22% increased damage to enemies that are not Healthy.
        if (paragonVal(nodes_map, 'essence')) {
          Critical_Multiplier_Total *=
            1 + (0.22 * 0.8) / (1 + 0.22 * 0.2)
        }

        // Sacrifice - x30% increased critical damage; unable to summon all types of Golems.
        if (
          bookOfTheDeadVal(nodes_map, 'golem')[0] == 'iron' &&
          bookOfTheDeadVal(nodes_map, 'golem')[1] == 3
        ) {
          let sacrificial_aspect = 1 // Sacrificial Aspect : Your Sacrifice bonuses are increased by {15/25}%.
          if (
            aspectVal(nodes_map, 'sacrificial-aspect').length != 0
          ) {
            sacrificial_aspect += aspectVal(
              nodes_map,
              'sacrificial-aspect',
            )[0]
          }

          Critical_Multiplier_Total *= 1 + 0.3 * sacrificial_aspect
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

        //'critical-strike-damage-with-bone-skills' (Necromancer)
        Critical_Bonus_Total +=
          aggregationVal(
            nodes_map,
            'critical-strike-damage-with-bone-skills',
          ) * Number(currentSkillVal(nodes_map)['tags'].has('bone'))

        // 'evulsion' Your Bone Skills deal {5%} increased Critical Strike Damage to Vulnerable enemies.
        if (
          tagsVal(nodes_map).has('bone') &&
          talentVal(nodes_map, 'evulsion') > 0 &&
          statVal(nodes_map, 'Enemy_Vulnerable') > 0
        ) {
          Critical_Bonus_Total +=
            0.05 *
            talentVal(nodes_map, 'evulsion') *
            statVal(nodes_map, 'Enemy_Vulnerable')
        }

        // Ghastly Bone Spirit: Bone Spirit has an additional 10% Critical Strike Chance.
        if (
          currentSkillVal(nodes_map)['name'] == 'bone-spirit' &&
          talentVal(nodes_map, 'ghastly-bone-spirit') > 0
        ) {
          Critical_Bonus_Total += 0.1
        }

        return Critical_Bonus_Total
      },
    ),

    Skill_Critical_Damage_Multiplier: new StatsNode(
      'Skill_Critical_Damage_Multiplier',
      () => {
        const Critical_Multiplier_Total = 1

        return Critical_Multiplier_Total
      },
    ),

    Critical_Multiplier: new StatsNode('Critical_Multiplier', () => {
      const Non_Crit_Skills = new Set([
        'decompose',
        'blood-mist',
        'bone-prison',
        'iron-maiden',
        'decrepify',
      ])
      if (Non_Crit_Skills.has(currentSkillVal(nodes_map)['name'])) {
        return 1
      }
      let Critical_Multiplier =
        1 +
        (statVal(nodes_map, 'Skill_Critical_Bonus') +
          statVal(nodes_map, 'Generic_Critical_Bonus'))

      Critical_Multiplier *=
        statVal(nodes_map, 'Generic_Critical_Damage_Multiplier') *
        statVal(nodes_map, 'Skill_Critical_Damage_Multiplier')

      return Critical_Multiplier
    }),

    Non_Aspect_Attack_Speed_Bonus: new StatsNode(
      'Non_Aspect_Attack_Speed_Bonus',
      () => {
        const Pre_Sim_Node = necromancerPresimVal(nodes_map)
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
            'reap',
            'decompose',
            'hemorrhage',
            'bone-splinters',
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
        const Pre_Sim_Node = necromancerPresimVal(nodes_map)
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

        // "acolytes-hemorrhage" Hemorrhage gains an additional 20% Attack Speed while Healthy.
        if (
          talentVal(nodes_map, 'acolytes-hemorrhage') > 0 &&
          currentSkillVal(nodes_map)['name'] == 'hemorrhage' &&
          Number(toggleVal(nodes_map, 'percent-life')) >= 0.8
        ) {
          Attack_Speed_Bonus_Total += 0.2
        }

        // 'paranormal-blood-lance' While at least 2 enemies or a Boss are affected by Blood Lance, you gain 15% Attack Speed and Blood Lance's Essence cost is reduced by 2.
        if (
          talentVal(nodes_map, 'paranormal-blood-lance') > 0 &&
          currentSkillVal(nodes_map)['name'] == 'blood-lance' &&
          (Number(toggleVal(nodes_map, 'number-of-enemies')) >= 2 ||
            toggleVal(nodes_map, 'enemy-boss'))
        ) {
          Attack_Speed_Bonus_Total += 0.15
        }

        // Bone Golem Sacrifice - +10% attack speed; unable to summon all types of Golems.
        if (
          bookOfTheDeadVal(nodes_map, 'golem')[0] == 'bone' &&
          bookOfTheDeadVal(nodes_map, 'golem')[1] == 3
        ) {
          let sacrificial_aspect = 1 // Sacrificial Aspect : Your Sacrifice bonuses are increased by {15/25}%.
          if (
            aspectVal(nodes_map, 'sacrificial-aspect').length != 0
          ) {
            sacrificial_aspect += aspectVal(
              nodes_map,
              'sacrificial-aspect',
            )[0]
          }
          Attack_Speed_Bonus_Total += 0.1 * sacrificial_aspect
        }

        // Talent 'enhanced-reap': If an enemy hit by Reap dies within 2 seconds, you gain 30% Attack Speed for 3 seconds.
        if (
          'reap' in Pre_Sim_Node['skill_use_rate'] &&
          talentVal(nodes_map, 'enhanced-reap') > 0
        ) {
          Attack_Speed_Bonus_Total +=
            0.3 *
            Math.min(
              1,
              Pre_Sim_Node['skill_use_rate']['reap'] *
                2 *
                Math.min(1, statVal(nodes_map, 'Enemy_Kill_Rate')),
            )
        }

        // Aspect of Rathma's Chosen : Whenever your Blood Skills Overpower you gain +{20/50}% Attack Speed for 4.0 seconds.
        if (
          aspectVal(nodes_map, 'aspect-of-rathmas-chosen').length != 0
        ) {
          const Blood_Skills = new Set([
            'blood-lance',
            'blood-surge',
            'hemorrhage',
            'blood-wave',
          ])

          let Overpower_Rate = 0
          for (const Other_Skill in Pre_Sim_Node['skill_use_rate']) {
            if (Blood_Skills.has(Other_Skill)) {
              Overpower_Rate +=
                Pre_Sim_Node['cross_skill_stat'][Other_Skill][
                  'overpower_chance'
                ] * Pre_Sim_Node['skill_use_rate'][Other_Skill]
            }
          }
          Attack_Speed_Bonus_Total +=
            aspectVal(nodes_map, 'aspect-of-rathmas-chosen')[0] *
            Math.min(1, Overpower_Rate * 4)
        }

        // Generic Aspect, Accelerating Aspect: Critical Strikes with Core Skills increase your Attack Speed by +[15 - 25]% for 3.0 seconds.
        if (aspectVal(nodes_map, 'accelerating-aspect').length != 0) {
          let Core_Critical_Rate = 0
          const Core_Skills = new Set([
            'blood-lance',
            'blood-surge',
            'blight',
            'sever',
            'bone-spear',
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

      let Attack_Speed_Total =
        1 + statVal(nodes_map, 'Attack_Speed_Bonus')

      // ['inspiring-leader', 3] After you have been Healthy for at least 2 seconds, you and your Minions gain {['4%', '8%', '12%',} Attack Speed.
      if (
        talentVal(nodes_map, 'inspiring-leader') > 0 &&
        Number(toggleVal(nodes_map, 'percent-life')) >= 0.8
      ) {
        Attack_Speed_Total +=
          0.04 * talentVal(nodes_map, 'inspiring-leader')
      }

      return Raw_Weapon_Attack_Speed * Attack_Speed_Total
    }),

    Overpower_Chance: new StatsNode('Overpower_Chance', () => {
      if (currentSkillVal(nodes_map)['tags'].has('channeled')) {
        // Channeled Skills Cannot Overpower
        return 0
      }
      const Pre_Sim_Node = necromancerPresimVal(nodes_map)

      let Overpower_Chance_Total = 0.03 // Base 3% chance to Overpower a Skill

      //'supernatural-blood-lance' After casting Blood Lance 6 times, your next cast of Blood Lance is guaranteed to Overpower and spawns a Blood Orb under the first enemy hit.
      if (
        talentVal(nodes_map, 'supernatural-blood-lance') > 0 &&
        currentSkillVal(nodes_map)['name'] == 'blood-lance'
      ) {
        Overpower_Chance_Total += (1 - Overpower_Chance_Total) / 7
      }

      // 'paranormal-blood-surge' If an enemy is damaged by Blood Surge's nova while you are Healthy, gain 1 stack of Overwhelming Blood. When you have 5 stacks of Overwhelming Blood, your next Blood Surge Overpowers.
      if (
        talentVal(nodes_map, 'paranormal-blood-surge') > 0 &&
        currentSkillVal(nodes_map)['name'] == 'blood-surge' &&
        Number(toggleVal(nodes_map, 'percent-life')) >= 0.8
      ) {
        Overpower_Chance_Total +=
          ((1 - Overpower_Chance_Total) / 5) *
          Math.min(5, statVal(nodes_map, 'Total_Hits'))
      }

      // Talent ['rathmas-vigor', 1], After being Healthy for 12 seconds, your next Blood Skill Overpowers.
      // This timer is reduced by 2 seconds each time Blood Orbs Heal or Overheal you for an amount greater than or equal to your base Life.
      if (
        talentVal(nodes_map, 'rathmas-vigor') > 0 &&
        Number(toggleVal(nodes_map, 'percent-life')) >= 0.8 &&
        tagsVal(nodes_map).has('blood')
      ) {
        Overpower_Chance_Total +=
          ((1 - Overpower_Chance_Total) *
            statVal(nodes_map, 'Cast_Time')) /
          12
      }

      // Dominate: After not Overpowering for 30 seconds, your next attack will Overpower.
      if (
        paragonVal(nodes_map, 'dominate') &&
        currentSkillVal(nodes_map)['name'] in
          Pre_Sim_Node['skill_use_rate'] &&
        Overpower_Chance_Total != 0
      ) {
        let Total_Skill_Use_Rate = 0
        for (const skill in Pre_Sim_Node['skill_use_rate']) {
          // Channeled skills can't overpower.
          if (!skillVal(nodes_map, skill)['tags'].has('channeled')) {
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
      if (
        vampiricPowerVal(nodes_map, 'blood-boil') &&
        Overpower_Chance_Total != 0
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
      const Damage_Multiplier = NecromancerDamageMultiplier(
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
        const number_of_enemies = Number(
          toggleVal(nodes_map, 'number-of-enemies'),
        )
        let Overpower_Multiplier_Total =
          1 + 0.5 * Number(toggleVal(nodes_map, 'percent-life'))

        // Tides of Blood: Your Blood Skills deal {['5%', '10%', '15%',}[x] increased Overpower damage. This bonus is doubled while you are Healthy.
        Overpower_Multiplier_Total *=
          1 +
          0.05 *
            talentVal(nodes_map, 'tides-of-blood') *
            (1 +
              Number(
                Number(toggleVal(nodes_map, 'percent-life')) > 0.8,
              ))

        // Bone Mage Sacrifice - Your Overpower damage is increased by x25%, but you can no longer raise Skeletal Mages.
        if (
          bookOfTheDeadVal(nodes_map, 'skeletal-mages')[0] ==
            'bone' &&
          bookOfTheDeadVal(nodes_map, 'skeletal-mages')[1] == 3
        ) {
          let Sacrifice_Bonus = 0.25
          // Sacrificial Aspect : Your Sacrifice bonuses are increased by {15/25}%.
          if (
            aspectVal(nodes_map, 'sacrificial-aspect').length != 0
          ) {
            Sacrifice_Bonus *=
              1 + aspectVal(nodes_map, 'sacrificial-aspect')[0]
          }
          let Memento_Mori = 0 // ['memento-mori', 3] Sacrificing both Skeletal Warriors and Skeletal Mages increases their Sacrifice bonuses by {['20%', '40%', '60%']}
          if (
            talentVal(nodes_map, 'memento-mori') > 0 &&
            bookOfTheDeadVal(nodes_map, 'skeletal-warriors')[1] ==
              3 &&
            bookOfTheDeadVal(nodes_map, 'skeletal-mages')[1] == 3
          ) {
            Memento_Mori = talentVal(nodes_map, 'memento-mori') * 0.2
          }
          Overpower_Multiplier_Total *=
            (1 + Sacrifice_Bonus) *
            (1 + Sacrifice_Bonus * Memento_Mori)
        }

        // Blood Moon Breeches (Necromancer Unique Pants): Your Minions have a 3-7% chance to curse enemies. Enemies affected by at least 1 of your curses take 70% [x] (multiplicative damage) increased Overpower damage from you.
        if (aspectVal(nodes_map, 'blood-moon-breeches').length > 0) {
          let Proportion_Of_Enemies_Affected = 0
          if (
            allSkillsVal(nodes_map).has('decrepify') ||
            allSkillsVal(nodes_map).has('iron-maiden')
          ) {
            Proportion_Of_Enemies_Affected += Math.min(
              1,
              30 ** 2 / statVal(nodes_map, 'Enemy_Spread') ** 2,
            )
          }
          if (statVal(nodes_map, 'Max_Number_Of_Minions') > 0) {
            Proportion_Of_Enemies_Affected +=
              statVal(nodes_map, 'Max_Number_Of_Minions') /
              number_of_enemies
          }
          Overpower_Multiplier_Total *=
            1 + 0.7 * Math.min(1, Proportion_Of_Enemies_Affected)
        }

        // 'bloodbath',  All Overpowered attacks deal 35% [x] increased Overpower damage.
        if (paragonVal(nodes_map, 'bloodbath')) {
          Overpower_Multiplier_Total *= 1.35
        }

        return Overpower_Multiplier_Total
      },
    ),

    Generic_Aspect_Damage_Multiplier: new StatsNode(
      'Generic_Aspect_Damage_Multiplier',
      () => {
        let Aspect_Damage_Multiplier = 1

        // Tears of Blood Glyph
        Aspect_Damage_Multiplier *=
          1 + aggregationVal(nodes_map, 'damage-')

        // aspect-of-Inner-Calm: Deal x{5/10}% increased damage for each second you stand still, up to x30.0%.
        if (
          aspectVal(nodes_map, 'aspect-of-inner-calm').length != 0
        ) {
          Aspect_Damage_Multiplier *= 1.3
        }

        // Blighted Aspect : You deal x{50/120}% increased damage for 6.0 seconds after the Shadowblight Key Passive damages enemies 10.0 times.
        if (aspectVal(nodes_map, 'blighted-aspect').length != 0) {
          const Shadowblight_Rate = statVal(
            nodes_map,
            'Shadowblight_Rate',
          )
          const Blighted_Aspect_Uptime =
            6 / (6 + 100 / Shadowblight_Rate)
          Aspect_Damage_Multiplier *=
            1 +
            aspectVal(nodes_map, 'blighted-aspect')[0] *
              Blighted_Aspect_Uptime
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

        return Aspect_Damage_Multiplier
      },
    ),

    // Aspects can be multiplicative with Damage from skills.
    Skill_Aspect_Damage_Multiplier: new StatsNode(
      'Skill_Aspect_Damage_Multiplier',
      () => {
        const Pre_Sim_Node = necromancerPresimVal(nodes_map)
        let Aspect_Damage_Multiplier = 1

        // Blood Seeker's Aspect : Blood Lance deals x{15/25}% increased damage to its primary target per lanced enemy.
        if (
          aspectVal(nodes_map, 'blood-seekers-aspect').length > 0 &&
          currentSkillVal(nodes_map)['name'] == 'blood-lance'
        ) {
          // This will get multiplied by Hits multiplier later so there is no need to scale it here.
          Aspect_Damage_Multiplier *=
            1 + aspectVal(nodes_map, 'blood-seekers-aspect')[0]
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

        // Howl from Below : Instead of detonating immediately, Corpse Explosion summons a Volatile Skeleton that charges at a random enemy and explodes. Corpse Explosion's damage is increased by x{30/40}%.
        if (
          aspectVal(nodes_map, 'howl-from-below').length != 0 &&
          currentSkillVal(nodes_map)['name'] == 'corpse-explosion'
        ) {
          Aspect_Damage_Multiplier *=
            1 + aspectVal(nodes_map, 'howl-from-below')[0]
        }

        // Black River : Corpse Explosion consumes up to 4.0 additional Corpses around the initial Corpse, dealing x{122/130}% increased damage and with a {21/25}% larger radius per additional Corpse.
        if (
          aspectVal(nodes_map, 'black-river').length != 0 &&
          currentSkillVal(nodes_map)['name'] == 'corpse-explosion'
        ) {
          Aspect_Damage_Multiplier *=
            1 + aspectVal(nodes_map, 'black-river')[0]
        }

        // Cadaverous Aspect : Consuming a Corpse increases the damage of your next Core Skill by x{5/10}%, up to x{25/50}%.
        if (
          aspectVal(nodes_map, 'cadaverous-aspect').length != 0 &&
          tagsVal(nodes_map).has('core')
        ) {
          let Core_Skill_Rate = 0
          const Core_Skills = new Set([
            'blood-lance',
            'blood-surge',
            'blight',
            'sever',
            'bone-spear',
          ])
          for (const Skill in Pre_Sim_Node['skill_use_rate']) {
            if (Core_Skills.has(Skill)) {
              ;``
              Core_Skill_Rate += Pre_Sim_Node['skill_use_rate'][Skill]
            }
          }
          if (Core_Skill_Rate > 0) {
            Aspect_Damage_Multiplier *=
              1 +
              aspectVal(nodes_map, 'cadaverous-aspect')[0] *
                Math.min(
                  5,
                  statVal(nodes_map, 'Corpse_Consumption_Rate') /
                    Core_Skill_Rate,
                )
          }
        }

        // Bloodless Scream : Your Darkness Skills Chill enemies for up to 100.0%.
        // Lucky Hit: Your Darkness Skills have up to a 100.0% chance to generate {7/10} additional Essence against Frozen targets.
        //  Darkness Skills deal x20-x50% bonus damage to Frozen enemies.
        if (
          aspectVal(nodes_map, 'bloodless-scream').length > 0 &&
          tagsVal(nodes_map).has('darkness') &&
          toggleVal(nodes_map, 'enemy-frozen')
        ) {
          Aspect_Damage_Multiplier *=
            1 + aspectVal(nodes_map, 'bloodless-scream')[1]
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
          currentSkillVal(nodes_map)['name'] == 'decompose' &&
          'decompose' in Pre_Sim_Node['skill_use_rate']
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
            'reap',
            'decompose',
            'hemorrhage',
            'bone-splinters',
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
          const Minion_Attack_Rate =
            statVal(nodes_map, 'Skeleton_Mage_Attack_Speed') +
            statVal(nodes_map, 'Skeleton_Warrior_Attack_Speed') +
            statVal(nodes_map, 'Golem_Attack_Speed')

          const Minion_Lucky_Hit_Chance = 0.3 // completely made up value taken from bat stun chance on another vampiric power
          Aspect_Damage_Multiplier *=
            1 +
            0.1 *
              Math.min(
                1,
                (statVal(nodes_map, 'Vampiric_Bat_Rate') +
                  Minion_Attack_Rate) *
                  Minion_Lucky_Hit_Chance *
                  4,
              )
        }

        return Aspect_Damage_Multiplier
      },
    ),

    Skill_Talent_Damage_Multiplier: new StatsNode(
      'Skill_Talent_Damage_Multiplier',
      () => {
        let Talent_Damage_Multiplier = 1
        const Pre_Sim_Node = necromancerPresimVal(nodes_map)
        const number_of_enemies = Number(
          toggleVal(nodes_map, 'number-of-enemies'),
        )
        const enemy_spread = Number(
          statVal(nodes_map, 'Enemy_Spread'),
        )

        // 'supernatural-sever' Sever deals 2% increased damage for each Minion you have upon cast.
        if (
          talentVal(nodes_map, 'supernatural-sever') > 0 &&
          currentSkillVal(nodes_map)['name'] == 'sever'
        ) {
          const number_skeleton_warriors =
            4 * statVal(nodes_map, 'Skeleton_Warrior_Uptime')
          const number_skeleton_mages =
            3 * statVal(nodes_map, 'Skeleton_Mage_Uptime')
          const number_golem = 1 * statVal(nodes_map, 'Golem_Uptime')
          Talent_Damage_Multiplier *=
            1 +
            0.02 *
              (number_skeleton_warriors +
                number_skeleton_mages +
                number_golem)
        }

        // 'plagued-corpse-explosion' Corpse Explosion deals 10% increased damage to enemies that are Slowed, Stunned or Vulnerable. These damage bonuses can stack.
        if (
          talentVal(nodes_map, 'plagued-corpse-explosion') > 0 &&
          currentSkillVal(nodes_map)['name'] == 'corpse-explosion'
        ) {
          Talent_Damage_Multiplier *=
            1 +
            0.1 *
              (Number(toggleVal(nodes_map, 'enemy-slowed')) *
                statVal(nodes_map, 'Enemy_Boss_CC_Adjustment') +
                Number(toggleVal(nodes_map, 'enemy-stunned')) *
                  statVal(nodes_map, 'Enemy_Boss_CC_Adjustment') +
                statVal(nodes_map, 'Enemy_Vulnerable'))
        }

        // 'coalesced-blood' While Healthy your Blood Skills deal {['6%', '12%', '18%',} increased damage.
        if (
          Number(toggleVal(nodes_map, 'percent-life')) >= 0.8 &&
          tagsVal(nodes_map).has('blood')
        ) {
          Talent_Damage_Multiplier *=
            1 + 0.06 * talentVal(nodes_map, 'coalesced-blood')
        }

        // 'imperfectly-balanced' Your Core Skills cost 3% more Essence, but deal 5% increased damage.
        if (
          talentVal(nodes_map, 'imperfectly-balanced') > 0 &&
          tagsVal(nodes_map).has('core')
        ) {
          Talent_Damage_Multiplier *=
            1 + 0.05 * talentVal(nodes_map, 'imperfectly-balanced')
        }

        // Supernatural Blood Surge Each time an enemy is hit by Blood Surge's nova, you are Fortified for 1% Base Life. While you have Fortify for over 50% of your Maximum Life, Blood Surge deals 20% increased damage.
        if (
          talentVal(nodes_map, 'supernatural-blood-surge') > 0 &&
          Number(toggleVal(nodes_map, 'percent-fortify')) > 0.5 &&
          currentSkillVal(nodes_map)['name'] == 'blood-surge'
        ) {
          Talent_Damage_Multiplier *= 1.2
        }

        //'compound-fracture' After Critically Striking 10 times with Bone Skills, your Bone Skills deal {['5%', '10%', '15%',} increased damage for 5 seconds.
        if (
          talentVal(nodes_map, 'compound-fracture') > 0 &&
          tagsVal(nodes_map).has('bone')
        ) {
          const Critical_Chance_Bone_Skills = new Set([
            'bone-splinters',
            'bone-spirit',
            'bone-spear',
            'bone-storm',
          ])
          let Bone_Skill_Crit_Rate = 0
          for (const Other_Skill in Pre_Sim_Node['skill_use_rate']) {
            if (Critical_Chance_Bone_Skills.has(Other_Skill)) {
              Bone_Skill_Crit_Rate +=
                Pre_Sim_Node['skill_use_rate'][Other_Skill] *
                Pre_Sim_Node['cross_skill_stat'][Other_Skill][
                  'total_hits'
                ] *
                Pre_Sim_Node['cross_skill_stat'][Other_Skill][
                  'critical_chance'
                ]
            }
          }
          Talent_Damage_Multiplier *=
            1 +
            talentVal(nodes_map, 'compound-fracture') *
              0.05 *
              Math.min(1, (Bone_Skill_Crit_Rate * 5) / 10)
        }

        // Revenge Thorns damage increases all damage an enemy takes from you by x1%, up to x8%, for 10 seconds.
        if (
          paragonVal(nodes_map, 'revenge') &&
          statVal(nodes_map, 'Total_Thorns') > 0
        ) {
          Talent_Damage_Multiplier *= 1 + 0.08
        }

        return Talent_Damage_Multiplier
      },
    ),

    Hits_Multiplier: new StatsNode('Hits_Multiplier', () => {
      const number_of_enemies = Number(
        toggleVal(nodes_map, 'number-of-enemies'),
      )
      const enemy_spread = Number(statVal(nodes_map, 'Enemy_Spread'))
      const Pre_Sim_Node = necromancerPresimVal(nodes_map)

      const Cast_Time = statVal(nodes_map, 'Cast_Time')

      let Army_Size
      let Hits_Multiplier = 1
      let Enhanced_Hemo_Chance = 0
      const Bone_Storm_Duration = statVal(
        nodes_map,
        'Bone_Storm_Duration',
      )

      switch (currentSkillVal(nodes_map)['name']) {
        // Reap: Sweep an ethereal scythe in front of you, dealing {['12%', '13%', '14%', '16%', '17%']} damage. Hitting an enemy with Reap increases your Damage Reduction by 15% for 2 seconds.
        case 'reap':
          Hits_Multiplier =
            1 +
            ProbabilityInCone(15, 1 / 3, enemy_spread) *
              number_of_enemies
          break

        case 'decompose':
          // Rotting Aspect : Decompose can chain up to 2.0 additional targets. When Decompose spawns a Corpse, it has a {50 /100}% chance to spawn a Corpse under all afflicted targets.
          if (aspectVal(nodes_map, 'rotting-aspect').length != 0) {
            let Additional_Decompose_Chains = 0
            if (toggleVal(nodes_map, 'enemy-distant')) {
              Additional_Decompose_Chains = Math.min(
                2,
                ProbabilityInCircle(25, 20, enemy_spread) *
                  (number_of_enemies - 1),
              )
            } else {
              Additional_Decompose_Chains = Math.min(
                2,
                ProbabilityInCircle(15, 20, enemy_spread) *
                  (number_of_enemies - 1),
              )
            }
            Hits_Multiplier += Additional_Decompose_Chains
          }
          break

        case 'hemorrhage':
          //'enhanced-hemorrhage' After picking up a Blood Orb, your next Hemorrhage also deals damage to enemies around your target and grants 2 additional Essence per enemy hit.
          if (
            'hemorrhage' in Pre_Sim_Node['skill_use_rate'] &&
            talentVal(nodes_map, 'enhanced-hemorrhage') > 0
          ) {
            Enhanced_Hemo_Chance = Math.min(
              1,
              statVal(nodes_map, 'Blood_Orb_Pickup_Rate') /
                (Pre_Sim_Node['skill_use_rate']['hemorrhage'] +
                  0.0001),
            )
          }
          Hits_Multiplier =
            1 +
            Enhanced_Hemo_Chance *
              ProbabilityInCircle(
                25 * Number(toggleVal(nodes_map, 'enemy-distant')),
                10,
                enemy_spread,
              ) *
              (number_of_enemies - 1)
          break

        // Bone Splinters: Fire 3 bone splinters, dealing {['22%', '25%', '27%', '29%', '31%']} damage each. Each subsequent time an enemy is hit by the same cast of Bone Splinters, you gain 1 Essence.
        case 'bone-splinters':
          if (toggleVal(nodes_map, 'enemy-distant')) {
            // We assume target is in the cone and every enemy in the cone gets hit by one bolt.
            Hits_Multiplier +=
              ProbabilityInCone(40, 1 / 6, enemy_spread) *
              (number_of_enemies - 1)
          } else {
            // Enemy close.
            Hits_Multiplier =
              3 +
              ProbabilityInCone(40, 1 / 6, enemy_spread) *
                (number_of_enemies - 1)
            // 'enhanced-bone-splinters' Bone Splinters has a 25% chance to fire 2 additional projectiles if cast while you have 50 or more Essence.
            if (
              talentVal(nodes_map, 'enhanced-bone-splinters') > 0 &&
              currentSkillVal(nodes_map)['name'] == 'bone-splinters'
            ) {
              // Assuming uniform probability for current essence
              const Probability_Above_50_Essence = 1
              // (statVal(nodes_map, 'Max_Resource') - 50) /
              // statVal(nodes_map, 'Max_Resource')
              Hits_Multiplier +=
                (3 + 2 * 0.25 * Probability_Above_50_Essence) *
                ProbabilityInCone(40, 1 / 6, enemy_spread) *
                (number_of_enemies - 1)
            }
          }
          break

        case 'blood-lance':
          {
            const Lance_Uptime = 3
            const Num_Lances = statVal(nodes_map, 'Number_Of_Cast')
            Hits_Multiplier = Num_Lances
            let Lanced_Enemies = 0
            // Max number of lances that can be maintined through spamming blood lance.
            const Lance_Cap = Math.min(
              Math.floor(Lance_Uptime / (Cast_Time + 0.0001)),
              number_of_enemies,
            )
            for (let i = 1; i < Num_Lances + 1; i++) {
              Hits_Multiplier += Lanced_Enemies
              // Assume each time we "start" using Blood Lance, we get all the Gore Quills benefit.
              if (
                i == 1 &&
                aspectVal(nodes_map, 'gore-quills').length > 0
              ) {
                // Gore Quills Aspect: Blood Lance will consume Blood Orbs to also conjure lances from them. Each additional Blood Lance deals [20 -50]% of normal damage and prioritizes targeting un-lanced enemies.
                let Current_Blood_Orbs = 0
                if ('blood-lance' in Pre_Sim_Node['skill_use_rate']) {
                  Current_Blood_Orbs = // Artificial cap on number of blood orbs spawned. If the pre-sim doesn't use blood-lance this would blow up otherwise.
                    Math.min(
                      statVal(nodes_map, 'Blood_Orb_Spawn_Rate') *
                        (1 /
                          Pre_Sim_Node['skill_use_rate'][
                            'blood-lance'
                          ] +
                          0.0001),
                      20,
                    )
                }
                Hits_Multiplier +=
                  aspectVal(nodes_map, 'gore-quills')[0] *
                  Current_Blood_Orbs

                Lanced_Enemies = Math.min(
                  Current_Blood_Orbs,
                  number_of_enemies,
                )
              }
              // When you've reached the Lance Cap (3 seconds in), then the inital Gore Quills lances are gone
              // and you're now capped by the rate at which you can use Blood Lance. We ignore the extra lances
              // from Hungry Blood for simplicity.
              if (i > Lance_Cap) {
                Lanced_Enemies = Lance_Cap
              } else {
                Lanced_Enemies = Math.min(
                  number_of_enemies,
                  Lanced_Enemies + 1,
                )
              }

              // (TODO) This only should effect enemies which are already lanced. This is an overestimate.
              // 'enhanced-blood-lance' Blood Lance pierces through enemies who are currently lanced, dealing 10% reduced damage to subsequent enemies after the first.
              if (talentVal(nodes_map, 'enhanced-blood-lance') > 0) {
                const p =
                  ProbabilityIntersectingLineInCircle(
                    20,
                    30,
                    enemy_spread,
                  ) *
                  (Lanced_Enemies / number_of_enemies)
                for (let j = 1; j < number_of_enemies; j++) {
                  // Aspect of Hungry Blood : Each cast of Blood Lance will launch an additional Blood Lance at a Nearby enemy when it first hits an enemy that is already lanced, dealing 48% of normal damage.
                  // For now we assume that the first hit is a new target but that piercing hits are already lanced. This is not a great assumption.
                  if (
                    aspectVal(nodes_map, 'aspect-of-hungry-blood')
                      .length > 0
                  ) {
                    // The ith enemy is hit when at least i enemies are hit (duh). We add the damage they take to the multiplier times that probability.
                    Hits_Multiplier +=
                      (1 +
                        aspectVal(
                          nodes_map,
                          'aspect-of-hungry-blood',
                        )[0]) *
                      0.9 ** j *
                      (1 -
                        BinomialDistribution(
                          number_of_enemies - 1,
                          p,
                          j - 1,
                        ))
                  } else {
                    Hits_Multiplier +=
                      0.9 ** j *
                      (1 -
                        BinomialDistribution(
                          number_of_enemies - 1,
                          p,
                          j - 1,
                        ))
                  }
                }
              }
            }

            Hits_Multiplier /= Num_Lances
          }
          break

        // Blood Surge: Draw blood from enemies, dealing {['20%', '22%', '24%', '26%', '28%']} damage, and expel a blood nova, dealing {50%} damage. Blood Surge's nova damage is increased by 10% per enemy drained, up to 50%.
        case 'blood-surge':
          {
            const Blood_Surge_Hits =
              1 +
              Math.min(20 ** 2 / enemy_spread ** 2, 1) *
                (number_of_enemies - 1)
            const Initial_AOE = (2 / 7) * Blood_Surge_Hits
            let Nova_AOE =
              (5 / 7) *
              Blood_Surge_Hits *
              (1 + 0.1 * Math.min(5, Blood_Surge_Hits))

            // Blood Bathed Aspect: Blood Surge's nova echoes again after a short delay, dealing x{50/60}% less damage
            if (
              aspectVal(nodes_map, 'blood-bathed-aspect').length > 0
            ) {
              Nova_AOE *=
                2 *
                (1 - aspectVal(nodes_map, 'blood-bathed-aspect')[0])
            }

            Hits_Multiplier = Initial_AOE + Nova_AOE
          }
          break

        // Blight: Unleash concentrated blight that deals {['30%', '33%', '36%', '39%', '42%']} damage and leaves behind a defiled area, dealing {value2} damage over 6 seconds.
        case 'blight':
          Hits_Multiplier =
            1 +
            Math.min(10 ** 2 / enemy_spread ** 2, 1) *
              (number_of_enemies - 1)
          break

        // Sever: A specter of you charges forward and attacks with its scythe for {['75%]} damage then returns to you and attacks again for {25%} damage.
        case 'sever':
          Hits_Multiplier =
            1 +
            ProbabilityInCone(10, 3 / 4, enemy_spread) *
              (number_of_enemies - 1) +
            (1 +
              (ProbabilityInCone(10, 1 / 4, enemy_spread) *
                (number_of_enemies - 1)) /
                3)
          // 'enhanced-sever' Sever damages enemies along its path for 40% of its initial damage.
          if (talentVal(nodes_map, 'enhanced-sever') > 0) {
            Hits_Multiplier =
              1.4 *
                (1 +
                  ProbabilityInCone(10, 3 / 4, enemy_spread) *
                    (number_of_enemies - 1)) +
              (1 +
                ProbabilityInCone(10, 1 / 4, enemy_spread) *
                  (number_of_enemies - 1)) /
                3
          }
          break

        // Bone Spear: Conjure a bone spear from the ground, dealing {['85%', '94%', '102%', '111%', '119%']} damage and piercing through enemies.
        case 'bone-spear':
          Hits_Multiplier =
            1 +
            ProbabilityIntersectingLineInCircle(
              10,
              40,
              enemy_spread,
            ) *
              (number_of_enemies - 1)
          break

        // Corpse Explosion: Detonate a Corpse, dealing 50% damage to surrounding enemies.
        case 'corpse-explosion':
          {
            let Corpse_Explosion_Radius_Multiplier = 1
            Hits_Multiplier =
              1 +
              Math.min(
                20 ** 2 / statVal(nodes_map, 'Enemy_Spread') ** 2,
                1,
              ) *
                (number_of_enemies - 1)

            //'enhanced-corpse-explosion' Corpse Explosion's radius is increased by 15%.
            if (
              talentVal(nodes_map, 'enhanced-corpse-explosion') > 0
            ) {
              Corpse_Explosion_Radius_Multiplier += 0.15
              Hits_Multiplier =
                1 +
                Math.min(
                  (20 * Corpse_Explosion_Radius_Multiplier) ** 2 /
                    statVal(nodes_map, 'Enemy_Spread') ** 2,
                  1,
                ) *
                  (number_of_enemies - 1)
            }

            // Black River : Corpse Explosion consumes up to 4.0 additional Corpses around the initial Corpse, dealing x{122/130}% increased damage and with a {21/25}% larger radius per additional Corpse.
            if (aspectVal(nodes_map, 'black-river').length != 0) {
              Corpse_Explosion_Radius_Multiplier += aspectVal(
                nodes_map,
                'black-river',
              )[1]
              Hits_Multiplier =
                1 +
                Math.min(
                  (20 * Corpse_Explosion_Radius_Multiplier) ** 2 /
                    statVal(nodes_map, 'Enemy_Spread') ** 2,
                  1,
                ) *
                  (number_of_enemies - 1)
            }
          }
          break

        // Iron Maiden: Curse the target area. Enemies afflicted by Iron Maiden take {['20%']} damage each time they deal direct damage. Lasts 10 seconds.
        case 'iron-maiden':
          Hits_Multiplier =
            ((1 +
              Math.min(30 ** 2 / enemy_spread ** 2, 1) *
                (number_of_enemies - 1)) *
              statVal(nodes_map, 'Enemy_Attacks_Per_Second')) /
            number_of_enemies
          // 'horrid-iron-maiden' When at least 3 enemies are afflicted by Iron Maiden, its damage is increased by 30%.
          if (talentVal(nodes_map, 'horrid-iron-maiden') > 0) {
            Hits_Multiplier *=
              1 +
              0.3 *
                (1 -
                  BinomialDistribution(
                    number_of_enemies - 1,
                    Math.min(
                      30 ** 2 /
                        statVal(nodes_map, 'Enemy_Spread') ** 2,
                      1,
                    ),
                    1,
                  ))
          }
          break

        // Decrepify: Curse the target area. Enemies afflicted by Decrepify are Slowed by {['40.0%', '43.0%', '45.8%', '48.5%', '51.1%']} and deal {value2} less damage for 10 seconds.
        case 'decrepify':
          Hits_Multiplier =
            1 +
            Math.min(
              30 ** 2 / statVal(nodes_map, 'Enemy_Spread') ** 2,
              1,
            ) *
              (number_of_enemies - 1)
          break

        // Corpse Tendrils: Veins burst out of a Corpse, Pulling in enemies, Stunning them for 3 seconds, and dealing {value2} damage to them. Does not consume the Corpse.
        case 'corpse-tendrils':
          Hits_Multiplier =
            1 +
            Math.min(
              20 ** 2 / statVal(nodes_map, 'Enemy_Spread') ** 2,
              1,
            ) *
              (number_of_enemies - 1)
          break

        // Bone Spirit: Consume all of your Essence to conjure a spirit of bone that seeks enemies. Upon reaching an enemy, the spirit explodes, dealing {['80%', '88%', '96%', '104%', '112%']} damage to the target and all surrounding enemies. Damage is increased by 3% for each point of Essence spent casting Bone Spirit.
        case 'bone-spirit':
          Hits_Multiplier =
            1 +
            Math.min(
              20 ** 2 / statVal(nodes_map, 'Enemy_Spread') ** 2,
              1,
            ) *
              (number_of_enemies - 1)
          break

        case 'blood-mist':
          Hits_Multiplier =
            1 +
            ProbabilityInCircle(
              0,
              10,
              statVal(nodes_map, 'Enemy_Spread'),
            ) *
              (number_of_enemies - 1)
          break

        // Blood Wave: Conjure a tidal wave of blood that deals 90% damage and Knocks Back enemies.
        case 'blood-wave':
          Hits_Multiplier =
            1 +
            ProbabilityInCone(
              60,
              1 / 6,
              statVal(nodes_map, 'Enemy_Spread'),
            ) *
              (number_of_enemies - 1)

          // Tidal Aspect : Blood Wave fires two additional waves, each dealing x{40-50}% less damage than the previous.
          if (aspectVal(nodes_map, 'tidal-aspect').length > 0) {
            const Tidal_Aspect_Multiplier = aspectVal(
              nodes_map,
              'tidal-aspect',
            )[0]
            Hits_Multiplier *=
              1 +
              Tidal_Aspect_Multiplier +
              Tidal_Aspect_Multiplier ** 2
          }
          break

        // Army of the Dead: Call forth the deep buried dead. Volatile Skeletons emerge over the next 7 seconds that explode when around enemies, dealing 30% damage.
        case 'army-of-the-dead':
          Army_Size = 7
          Hits_Multiplier =
            Army_Size *
            (1 +
              Math.min(
                10 ** 2 / statVal(nodes_map, 'Enemy_Spread') ** 2,
                1,
              ) *
                (number_of_enemies - 1))
          break

        // Bone Storm: A swirling storm of bones appears around you and your Golem, dealing 180% to surrounding enemies over 10 seconds.
        case 'bone-storm':
          Hits_Multiplier =
            (Bone_Storm_Duration / 10) *
            (1 +
              Math.min(
                20 ** 2 / statVal(nodes_map, 'Enemy_Spread') ** 2,
                1,
              ) *
                (number_of_enemies - 1))
          break
      }

      return Hits_Multiplier
    }),

    // Almost the same as Hits_Multiplier, but this should track the track the quantity of hits not a damage multiplier which could be different.
    Total_Hits: new StatsNode('Total_Hits', () => {
      const number_of_enemies = Number(
        toggleVal(nodes_map, 'number-of-enemies'),
      )
      const enemy_spread = Number(statVal(nodes_map, 'Enemy_Spread'))
      const Pre_Sim_Node = necromancerPresimVal(nodes_map)

      let Number_of_Hits = 1
      const Cast_Time = statVal(nodes_map, 'Cast_Time')
      let Bone_Splinter_Hits = 0
      let Number_Of_Bone_Splinters = 0
      let Enhanced_Hemo_Chance = 0
      const Bone_Storm_Duration = statVal(
        nodes_map,
        'Bone_Storm_Duration',
      )

      switch (currentSkillVal(nodes_map)['name']) {
        // Reap: Sweep an ethereal scythe in front of you, dealing {['12%', '13%', '14%', '16%', '17%']} damage. Hitting an enemy with Reap increases your Damage Reduction by 15% for 2 seconds.
        case 'reap':
          Number_of_Hits =
            1 +
            ProbabilityInCone(
              15,
              1 / 3,
              statVal(nodes_map, 'Enemy_Spread'),
            ) *
              number_of_enemies
          break
        case 'decompose':
          Number_of_Hits = 1

          // Rotting Aspect : Decompose can chain up to 2.0 additional targets. When Decompose spawns a Corpse, it has a {50/100}% chance to spawn a Corpse under all afflicted targets.
          if (aspectVal(nodes_map, 'rotting-aspect').length != 0) {
            let Additional_Decompose_Chains = 0
            if (toggleVal(nodes_map, 'enemy-distant')) {
              Additional_Decompose_Chains = Math.min(
                2,
                ProbabilityInCircle(
                  25,
                  20,
                  statVal(nodes_map, 'Enemy_Spread'),
                ) *
                  (number_of_enemies - 1),
              )
            } else {
              Additional_Decompose_Chains = Math.min(
                2,
                ProbabilityInCircle(
                  15,
                  20,
                  statVal(nodes_map, 'Enemy_Spread'),
                ) *
                  (number_of_enemies - 1),
              )
            }
            Number_of_Hits += Additional_Decompose_Chains
          }
          break
        //Bone Splinters: Fire 3 bone splinters, dealing {['22%', '25%', '27%', '29%', '31%']} damage each. Each subsequent time an enemy is hit by the same cast of Bone Splinters, you gain 1 Essence.
        case 'bone-splinters':
          if (toggleVal(nodes_map, 'enemy-distant')) {
            // We assume target is in the cone and every enemy in the cone gets hit by one bolt.
            Number_of_Hits +=
              ProbabilityInCone(
                40,
                1 / 6,
                statVal(nodes_map, 'Enemy_Spread'),
              ) *
              (number_of_enemies - 1)
          } else {
            // Enemy close.
            // 'enhanced-bone-splinters'Bone Splinters has a 25% chance to fire 2 additional projectiles if cast while you have 50 or more Essence.
            Number_of_Hits =
              (3 + 2 * 0.25) *
              (1 +
                ProbabilityInCone(
                  40,
                  1 / 6,
                  statVal(nodes_map, 'Enemy_Spread'),
                ) *
                  (number_of_enemies - 1))
          }
          break

        case 'hemorrhage':
          //'enhanced-hemorrhage' After picking up a Blood Orb, your next Hemorrhage also deals damage to enemies around your target and grants 2 additional Essence per enemy hit.
          if (
            'hemorrhage' in Pre_Sim_Node['skill_use_rate'] &&
            talentVal(nodes_map, 'enhanced-hemorrhage') > 0
          ) {
            Enhanced_Hemo_Chance = Math.min(
              1,
              statVal(nodes_map, 'Blood_Orb_Pickup_Rate') /
                (Pre_Sim_Node['skill_use_rate']['hemorrhage'] +
                  0.0001),
            )
          }
          Number_of_Hits =
            1 +
            Enhanced_Hemo_Chance *
              ProbabilityInCircle(
                25 * Number(toggleVal(nodes_map, 'enemy-distant')),
                10,
                enemy_spread,
              ) *
              (number_of_enemies - 1)
          break

        // Blood Surge: Draw blood from enemies, dealing {['20%', '22%', '24%', '26%', '28%']} damage, and expel a blood nova, dealing {50%} damage. Blood Surge's nova damage is increased by 10% per enemy drained, up to 50%.
        case 'blood-surge':
          Number_of_Hits =
            1 +
            Math.min(
              20 ** 2 / statVal(nodes_map, 'Enemy_Spread') ** 2,
              1,
            ) *
              (number_of_enemies - 1)

          // Blood Bathed Aspect: Blood Surge's nova echoes again after a short delay, dealing x{50/60}% less damage
          if (
            aspectVal(nodes_map, 'blood-bathed-aspect').length > 0
          ) {
            Number_of_Hits *= 2
          }
          break

        case 'blood-lance':
          {
            const Lance_Uptime = 3
            const Num_Lances = statVal(nodes_map, 'Number_Of_Cast')
            Number_of_Hits = Num_Lances
            let Lanced_Enemies = 0
            // Max number of lances that can be maintined through spamming blood lance.
            const Lance_Cap = Math.min(
              Math.floor(Lance_Uptime / (Cast_Time + 0.0001)),
              number_of_enemies,
            )
            for (let i = 1; i < Num_Lances + 1; i++) {
              Number_of_Hits += Lanced_Enemies
              // Assume each time we "start" using Blood Lance, we get all the Gore Quills benefit.
              if (
                i == 1 &&
                aspectVal(nodes_map, 'gore-quills').length > 0 &&
                'blood-lance' in Pre_Sim_Node['skill_use_rate']
              ) {
                // Gore Quills Aspect: Blood Lance will consume Blood Orbs to also conjure lances from them. Each additional Blood Lance deals [20 -50]% of normal damage and prioritizes targeting un-lanced enemies.
                const Current_Blood_Orbs = // Artificial cap on number of blood orbs spawned. If the pre-sim doesn't use blood-lance this would blow up otherwise.
                  Math.min(
                    statVal(nodes_map, 'Blood_Orb_Spawn_Rate') *
                      (1 /
                        Pre_Sim_Node['skill_use_rate'][
                          'blood-lance'
                        ] +
                        0.0001),
                    20,
                  )
                Number_of_Hits += Current_Blood_Orbs

                Lanced_Enemies = Math.min(
                  Current_Blood_Orbs,
                  number_of_enemies,
                )
              }
              // When you've reached the Lance Cap (3 seconds in), then the inital Gore Quills lances are gone
              // and you're now capped by the rate at which you can use Blood Lance. We ignore the extra lances
              // from Hungry Blood for simplicity.
              if (i > Lance_Cap) {
                Lanced_Enemies = Lance_Cap
              } else {
                Lanced_Enemies = Math.min(
                  number_of_enemies,
                  Lanced_Enemies + 1,
                )
              }

              // (TODO) This only should effect enemies which are already lanced. This is an overestimate.
              // 'enhanced-blood-lance' Blood Lance pierces through enemies who are currently lanced, dealing 10% reduced damage to subsequent enemies after the first.
              if (talentVal(nodes_map, 'enhanced-blood-lance') > 0) {
                const p =
                  (ProbabilityIntersectingLineInCircle(
                    10,
                    30,
                    enemy_spread,
                  ) *
                    Lanced_Enemies) /
                  number_of_enemies
                for (let j = 1; j < number_of_enemies; j++) {
                  // Aspect of Hungry Blood : Each cast of Blood Lance will launch an additional Blood Lance at a Nearby enemy when it first hits an enemy that is already lanced, dealing [38 - 48]% of normal damage.
                  // For now we assume that the first hit is a new target but that piercing hits are already lanced. This is not a great assumption.
                  if (
                    aspectVal(nodes_map, 'aspect-of-hungry-blood')
                      .length > 0
                  ) {
                    // The ith enemy is hit when at least i enemies are hit (duh). We add the damage they take to the multiplier times that probability.
                    Number_of_Hits +=
                      2 *
                      (1 -
                        BinomialDistribution(
                          number_of_enemies - 1,
                          p,
                          j - 1,
                        ))
                  } else {
                    Number_of_Hits +=
                      1 -
                      BinomialDistribution(
                        number_of_enemies - 1,
                        p,
                        j - 1,
                      )
                  }
                }
              }
            }
            Number_of_Hits /= Num_Lances
          }
          break

        // Blight: Unleash concentrated blight that deals {['30%', '33%', '36%', '39%', '42%']} damage and leaves behind a defiled area, dealing {value2} damage over 6 seconds.
        case 'blight':
          Number_of_Hits =
            1 +
            Math.min(
              10 ** 2 / statVal(nodes_map, 'Enemy_Spread') ** 2,
              1,
            ) *
              (number_of_enemies - 1)
          break

        // Sever: A specter of you charges forward and attacks with its scythe for {['75%} damage then returns to you and attacks again for {25%} damage.
        case 'sever':
          Number_of_Hits =
            2 +
            ProbabilityInCone(
              10,
              3 / 4,
              statVal(nodes_map, 'Enemy_Spread'),
            ) *
              (number_of_enemies - 1) +
            ProbabilityInCone(
              10,
              1 / 4,
              statVal(nodes_map, 'Enemy_Spread'),
            ) *
              (number_of_enemies - 1)
          // 'enhanced-sever' Sever damages enemies along its path for 40% of its initial damage.
          if (talentVal(nodes_map, 'enhanced-sever') > 0) {
            let Sever_Distance = 15
            if (toggleVal(nodes_map, 'enemy-distant')) {
              Sever_Distance = 25
            }
            Number_of_Hits +=
              1 +
              ProbabilityIntersectingLineInCircle(
                10,
                Sever_Distance,
                enemy_spread,
              ) *
                (number_of_enemies - 1)
          }
          break

        // Bone Spear: Conjure a bone spear from the ground, dealing {['85%', '94%', '102%', '111%', '119%']} damage and piercing through enemies.
        case 'bone-spear':
          Number_of_Hits =
            1 +
            ProbabilityIntersectingLineInCircle(
              10,
              40,
              statVal(nodes_map, 'Enemy_Spread'),
            ) *
              (number_of_enemies - 1)

          // 'enhanced-bone-spear' Bone Spear breaks into 3 shards when it is destroyed, dealing 25% damage each.
          if (talentVal(nodes_map, 'enhanced-bone-spear') > 0) {
            Number_Of_Bone_Splinters += 3
            if (toggleVal(nodes_map, 'enemy-distant')) {
              Bone_Splinter_Hits += 3
            } else {
              Bone_Splinter_Hits += Math.min(
                3,
                ProbabilityInCone(
                  30,
                  1 / 6,
                  statVal(nodes_map, 'Enemy_Spread'),
                ),
              )
            }
          }
          // 'paranormal-bone-spear' Bone Spear has a 5% increased Critical Strike Chance. If Bone Spear's primary projectile Critically Strikes, it fires 2 additional bone shards upon being destroyed.
          if (talentVal(nodes_map, 'paranormal-bone-spear') > 0) {
            Number_Of_Bone_Splinters +=
              2 * statVal(nodes_map, 'Critical_Chance')
            if (toggleVal(nodes_map, 'enemy-distant')) {
              Bone_Splinter_Hits +=
                2 * statVal(nodes_map, 'Critical_Chance')
            } else {
              Bone_Splinter_Hits += Math.min(
                2,
                ProbabilityInCone(
                  30,
                  1 / 6,
                  statVal(nodes_map, 'Enemy_Spread'),
                ) * statVal(nodes_map, 'Critical_Chance'),
              )
            }
          }
          // Splintering Aspect : Bone Spear's primary attack makes enemies hit beyond the first Vulnerable for {1.5/2.5} seconds. Bone Shards from Bone Spear deal {30/60}% bonus damage to Vulnerable enemies and pierce them.
          if (
            aspectVal(nodes_map, 'splintering-aspect').length > 0 &&
            statVal(nodes_map, 'Enemy_Vulnerable') > 0
          ) {
            Number_of_Hits +=
              Number_Of_Bone_Splinters *
              ProbabilityIntersectingLineInCircle(
                5,
                30,
                statVal(nodes_map, 'Enemy_Spread'),
              ) *
              (number_of_enemies - 1) *
              statVal(nodes_map, 'Enemy_Vulnerable')
          }
          break

        // Corpse Explosion: Detonate a Corpse, dealing {['75%', '83%', '90%', '97%', '105%']} damage to surrounding enemies.
        case 'corpse-explosion':
          {
            let Corpse_Explosion_Radius_Multiplier = 1
            Number_of_Hits =
              1 +
              Math.min(20 ** 2 / enemy_spread ** 2, 1) *
                (number_of_enemies - 1)

            //'enhanced-corpse-explosion' Corpse Explosion's radius is increased by 15%.
            if (
              talentVal(nodes_map, 'enhanced-corpse-explosion') > 0
            ) {
              Corpse_Explosion_Radius_Multiplier += 0.15
              Number_of_Hits =
                1 +
                Math.min(
                  (20 * Corpse_Explosion_Radius_Multiplier) ** 2 /
                    statVal(nodes_map, 'Enemy_Spread') ** 2,
                  1,
                ) *
                  (number_of_enemies - 1)
            }

            // Black River : Corpse Explosion consumes up to 4.0 additional Corpses around the initial Corpse, dealing x{122/130}% increased damage and with a {21/25}% larger radius per additional Corpse.
            if (aspectVal(nodes_map, 'black-river').length != 0) {
              Corpse_Explosion_Radius_Multiplier += aspectVal(
                nodes_map,
                'black-river',
              )[1]
              Number_of_Hits =
                1 +
                Math.min(
                  (20 * Corpse_Explosion_Radius_Multiplier) ** 2 /
                    statVal(nodes_map, 'Enemy_Spread') ** 2,
                  1,
                ) *
                  (number_of_enemies - 1)
            }
          }
          break

        // Iron Maiden: Curse the target area. Enemies afflicted by Iron Maiden take {['10%', '11%', '12%', '13%', '14%']} damage each time they deal direct damage. Lasts 10 seconds.
        case 'iron-maiden':
          Number_of_Hits =
            1 +
            Math.min(
              30 ** 2 / statVal(nodes_map, 'Enemy_Spread') ** 2,
              1,
            ) *
              (number_of_enemies - 1)
          break

        // Decrepify: Curse the target area. Enemies afflicted by Decrepify are Slowed by {['40.0%', '43.0%', '45.8%', '48.5%', '51.1%']} and deal {value2} less damage for 10 seconds.
        case 'decrepify':
          Number_of_Hits =
            1 +
            Math.min(
              30 ** 2 / statVal(nodes_map, 'Enemy_Spread') ** 2,
              1,
            ) *
              (number_of_enemies - 1)
          break

        // Corpse Tendrils: Veins burst out of a Corpse, Pulling in enemies, Stunning them for 3 seconds, and dealing {value2} damage to them. Does not consume the Corpse.
        case 'corpse-tendrils':
          Number_of_Hits =
            1 +
            Math.min(
              20 ** 2 / statVal(nodes_map, 'Enemy_Spread') ** 2,
              1,
            ) *
              (number_of_enemies - 1)
          break

        // Bone Spirit: Consume all of your Essence to conjure a spirit of bone that seeks enemies. Upon reaching an enemy, the spirit explodes, dealing {['80%', '88%', '96%', '104%', '112%']} damage to the target and all surrounding enemies. Damage is increased by 3% for each point of Essence spent casting Bone Spirit.
        case 'bone-spirit':
          Number_of_Hits =
            1 +
            Math.min(
              20 ** 2 / statVal(nodes_map, 'Enemy_Spread') ** 2,
              1,
            ) *
              (number_of_enemies - 1)
          break

        case 'blood-mist':
          Number_of_Hits =
            1 +
            ProbabilityInCircle(
              0,
              10,
              statVal(nodes_map, 'Enemy_Spread'),
            ) *
              (number_of_enemies - 1)
          break

        // Blood Wave: Conjure a tidal wave of blood that deals 90% damage and Knocks Back enemies.
        case 'blood-wave':
          Number_of_Hits =
            1 +
            ProbabilityInCone(
              60,
              1 / 6,
              statVal(nodes_map, 'Enemy_Spread'),
            ) *
              (number_of_enemies - 1)

          // Tidal Aspect : Blood Wave fires two additional waves, each dealing x{50/60}% less damage than the previous.
          if (aspectVal(nodes_map, 'tidal-aspect').length > 0) {
            Number_of_Hits *= 3
          }
          break

        // Army of the Dead: Call forth the deep buried dead. Volatile Skeletons emerge over the next 7 seconds that explode when around enemies, dealing 30% damage.
        case 'army-of-the-dead':
          Number_of_Hits =
            1 +
            Math.min(
              10 ** 2 / statVal(nodes_map, 'Enemy_Spread') ** 2,
              1,
            ) *
              (number_of_enemies - 1)
          break

        // Bone Storm: A swirling storm of bones appears around you and your Golem, dealing 180% to surrounding enemies over 10 seconds.
        case 'bone-storm':
          Number_of_Hits =
            (Bone_Storm_Duration / 10) *
            (1 +
              Math.min(
                20 ** 2 / statVal(nodes_map, 'Enemy_Spread') ** 2,
                1,
              ) *
                (number_of_enemies - 1))
          break
      }

      return Number_of_Hits
    }),

    Number_Enemies_Hit: new StatsNode('Number_Enemies_Hit', () => {
      const number_of_enemies = Number(
        toggleVal(nodes_map, 'number-of-enemies'),
      )
      const enemy_spread = Number(statVal(nodes_map, 'Enemy_Spread'))

      let Number_of_Hits = 1
      const Attack_Speed = statVal(nodes_map, 'Total_Attack_Speed')

      switch (currentSkillVal(nodes_map)['name']) {
        // Reap: Sweep an ethereal scythe in front of you, dealing {['12%', '13%', '14%', '16%', '17%']} damage. Hitting an enemy with Reap increases your Damage Reduction by 15% for 2 seconds.
        case 'reap':
          Number_of_Hits =
            1 +
            ProbabilityInCone(
              15,
              1 / 3,
              statVal(nodes_map, 'Enemy_Spread'),
            ) *
              number_of_enemies
          break
        //Bone Splinters: Fire 3 bone splinters, dealing {['22%', '25%', '27%', '29%', '31%']} damage each. Each subsequent time an enemy is hit by the same cast of Bone Splinters, you gain 1 Essence.
        case 'bone-splinters':
          // We assume target is in the cone and every enemy in the cone gets hit by one bolt.
          Number_of_Hits +=
            ProbabilityInCone(
              40,
              1 / 6,
              statVal(nodes_map, 'Enemy_Spread'),
            ) *
            (number_of_enemies - 1)
          break

        // Blood Surge: Draw blood from enemies, dealing {['20%', '22%', '24%', '26%', '28%']} damage, and expel a blood nova, dealing {value2} damage. Blood Surge's nova damage is increased by 10% per enemy drained, up to 50%.
        case 'blood-surge':
          Number_of_Hits =
            1 +
            Math.min(
              20 ** 2 / statVal(nodes_map, 'Enemy_Spread') ** 2,
              1,
            ) *
              (number_of_enemies - 1)
          break

        case 'blood-lance':
          {
            const Lance_Uptime = 3
            const Num_Lances = statVal(nodes_map, 'Number_Of_Cast')
            const Lance_Cap = Math.floor(Lance_Uptime * Attack_Speed)
            for (let i = 1; i < Lance_Cap + 1; i++) {
              Number_of_Hits += Math.min(
                i,
                Lance_Cap,
                number_of_enemies,
              )
              // (TODO) This only should effect enemies which are already lanced. This is an overestimate.
              // 'enhanced-blood-lance' Blood Lance pierces through enemies who are currently lanced, dealing 10% reduced damage to subsequent enemies after the first.
              if (talentVal(nodes_map, 'enhanced-blood-lance') > 0) {
                let p = ProbabilityIntersectingLineInCircle(
                  20,
                  30,
                  statVal(nodes_map, 'Enemy_Spread'),
                )
                for (let j = 1; j < number_of_enemies; j++) {
                  // Aspect of Hungry Blood : Each cast of Blood Lance will launch an additional Blood Lance at a Nearby enemy when it first hits an enemy that is already lanced, dealing 48% of normal damage.
                  // For now we assume that the first hit is a new target but that piercing hits are already lanced. This is not a great assumption.
                  if (
                    aspectVal(nodes_map, 'aspect-of-hungry-blood')
                      .length > 0
                  ) {
                    p *=
                      1 +
                      aspectVal(
                        nodes_map,
                        'aspect-of-hungry-blood',
                      )[0]
                  }
                  // The ith enemy is hit when at least i enemies are hit (duh). We add the damage they take to the multiplier times that probability.
                  Number_of_Hits +=
                    1 *
                    0.9 ** j *
                    (1 -
                      BinomialDistribution(
                        number_of_enemies - 1,
                        p,
                        j - 1,
                      ))
                }
              }
            }

            Number_of_Hits /= Num_Lances
          }
          break

        // Blight: Unleash concentrated blight that deals {['30%', '33%', '36%', '39%', '42%']} damage and leaves behind a defiled area, dealing {value2} damage over 6 seconds.
        case 'blight':
          Number_of_Hits =
            1 +
            Math.min(
              10 ** 2 / statVal(nodes_map, 'Enemy_Spread') ** 2,
              1,
            ) *
              (number_of_enemies - 1)
          break

        // Sever: A specter of you charges forward and attacks with its scythe for {[75%]} damage then returns to you and attacks again for {21%} damage.
        case 'sever':
          Number_of_Hits +=
            ProbabilityInCone(
              10,
              3 / 4,
              statVal(nodes_map, 'Enemy_Spread'),
            ) *
            (number_of_enemies - 1)
          break

        // Bone Spear: Conjure a bone spear from the ground, dealing {['85%', '94%', '102%', '111%', '119%']} damage and piercing through enemies.
        case 'bone-spear':
          Number_of_Hits =
            1 +
            ProbabilityIntersectingLineInCircle(
              10,
              40,
              statVal(nodes_map, 'Enemy_Spread'),
            ) *
              (number_of_enemies - 1)

          break

        // Corpse Explosion: Detonate a Corpse, dealing {['75%', '83%', '90%', '97%', '105%']} damage to surrounding enemies.
        case 'corpse-explosion':
          Number_of_Hits =
            1 +
            Math.min(
              20 ** 2 / statVal(nodes_map, 'Enemy_Spread') ** 2,
              1,
            ) *
              (number_of_enemies - 1)

          //'enhanced-corpse-explosion' Corpse Explosion's radius is increased by 15%.
          if (talentVal(nodes_map, 'enhanced-corpse-explosion') > 0) {
            Number_of_Hits =
              1 +
              Math.min(
                (20 * 1.15) ** 2 /
                  statVal(nodes_map, 'Enemy_Spread') ** 2,
                1,
              ) *
                (number_of_enemies - 1)
          }
          break

        // Iron Maiden: Curse the target area. Enemies afflicted by Iron Maiden take {['10%', '11%', '12%', '13%', '14%']} damage each time they deal direct damage. Lasts 10 seconds.
        case 'iron-maiden':
          Number_of_Hits =
            1 +
            Math.min(
              30 ** 2 / statVal(nodes_map, 'Enemy_Spread') ** 2,
              1,
            ) *
              (number_of_enemies - 1)
          break

        // Decrepify: Curse the target area. Enemies afflicted by Decrepify are Slowed by {['40.0%', '43.0%', '45.8%', '48.5%', '51.1%']} and deal {value2} less damage for 10 seconds.
        case 'decrepify':
          Number_of_Hits =
            1 +
            Math.min(
              30 ** 2 / statVal(nodes_map, 'Enemy_Spread') ** 2,
              1,
            ) *
              (number_of_enemies - 1)
          break

        // Corpse Tendrils: Veins burst out of a Corpse, Pulling in enemies, Stunning them for 3 seconds, and dealing {value2} damage to them. Does not consume the Corpse.
        case 'corpse-tendrils':
          Number_of_Hits =
            1 +
            Math.min(
              20 ** 2 / statVal(nodes_map, 'Enemy_Spread') ** 2,
              1,
            ) *
              (number_of_enemies - 1)
          break

        // Bone Spirit: Consume all of your Essence to conjure a spirit of bone that seeks enemies. Upon reaching an enemy, the spirit explodes, dealing {['80%', '88%', '96%', '104%', '112%']} damage to the target and all surrounding enemies. Damage is increased by 3% for each point of Essence spent casting Bone Spirit.
        case 'bone-spirit':
          Number_of_Hits =
            1 +
            Math.min(
              20 ** 2 / statVal(nodes_map, 'Enemy_Spread') ** 2,
              1,
            ) *
              (number_of_enemies - 1)
          break

        case 'blood-mist':
          Number_of_Hits =
            1 +
            ProbabilityInCircle(
              0,
              10,
              statVal(nodes_map, 'Enemy_Spread'),
            ) *
              (number_of_enemies - 1)
          break

        // Blood Wave: Conjure a tidal wave of blood that deals 90% damage and Knocks Back enemies.
        case 'blood-wave':
          Number_of_Hits =
            1 +
            ProbabilityInCone(
              60,
              1 / 6,
              statVal(nodes_map, 'Enemy_Spread'),
            ) *
              (number_of_enemies - 1)
          break

        // Army of the Dead: Call forth the deep buried dead. Volatile Skeletons emerge over the next 7 seconds that explode when around enemies, dealing 30% damage.
        case 'army-of-the-dead':
          Number_of_Hits =
            1 +
            Math.min(
              10 ** 2 / statVal(nodes_map, 'Enemy_Spread') ** 2,
              1,
            ) *
              (number_of_enemies - 1)
          break

        // Bone Storm: A swirling storm of bones appears around you and your Golem, dealing 180% to surrounding enemies over 10 seconds.
        case 'bone-storm':
          Number_of_Hits =
            1 +
            Math.min(
              20 ** 2 / statVal(nodes_map, 'Enemy_Spread') ** 2,
              1,
            ) *
              (number_of_enemies - 1)
          break
      }

      return Number_of_Hits
    }),

    /*--------------------------------------------------
                      PLAYER STATS NODES
          --------------------------------------------------*/

    Max_Life: new StatsNode('Max_Life', () => {
      const Base_Life = baseStatVal(nodes_map)['BaseMaxLife']

      const Bonus_Life = aggregationVal(nodes_map, 'maximum-life')

      // %-maximum-life
      let Life_Multiplier =
        1 + aggregationVal(nodes_map, '%-maximum-life')

      // Sacrifice - +10% max HP; unable to summon all types of Golems.
      if (
        bookOfTheDeadVal(nodes_map, 'golem')[0] == 'blood' &&
        bookOfTheDeadVal(nodes_map, 'golem')[1] == 3
      ) {
        let sacrificial_aspect = 1 // Sacrificial Aspect : Your Sacrifice bonuses are increased by {15/25}%.
        if (aspectVal(nodes_map, 'sacrificial-aspect').length != 0) {
          sacrificial_aspect += aspectVal(
            nodes_map,
            'sacrificial-aspect',
          )[0]
        }
        Life_Multiplier *= 1 + 0.1 * sacrificial_aspect
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

      // Spiked Armor: Gain {.1,.2,.3} Base Life, Thorns
      if (talentVal(nodes_map, 'spiked-armor') > 0) {
        Thorns_Total +=
          0.1 *
          talentVal(nodes_map, 'spiked-armor') *
          baseStatVal(nodes_map)['BaseMaxLife']
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
        NecromancerDamageMultiplier(
          new Set(['physical', 'thorns']),
          nodes_map,
        )
      )
    }),

    Passive_Dps: new StatsNode('Passive_Dps', () => {
      const Pre_Sim_Node = necromancerPresimVal(nodes_map)
      const Weapon_Damage = statVal(nodes_map, 'Total_Weapon_Damage')
      let Passive_Dps =
        statVal(nodes_map, 'Thorns_Dps') +
        statVal(nodes_map, 'Minion_Dps')
      const number_of_enemies = Number(
        toggleVal(nodes_map, 'number-of-enemies'),
      )
      const enemy_spread = statVal(nodes_map, 'Enemy_Spread')

      // Vampiric Power Casting a Mastery, Weapon Mastery, Macabre, Wrath, or Imbuement Skill calls a bat ally to attack nearby enemies, dealing 80% Physical damage with a 30% chance to Stun.
      if (statVal(nodes_map, 'Vampiric_Bat_Rate') > 0) {
        Passive_Dps +=
          statVal(nodes_map, 'Vampiric_Bat_Rate') *
          Weapon_Damage *
          NecromancerDamageMultiplier(
            new Set(['physical', 'bat']),
            nodes_map,
          )
      }

      // Vampiric Curse: Killing an enemy affected by your Vampiric Curse stores their soul. Casting a Defensive, Macabre, or Agility Skill will unleash stored souls to attack nearby enemies. You can hold up to 8 souls.
      // Assuming 60% Physical Damage for now. Real Value Unknown
      if (statVal(nodes_map, 'Vampiric_Curse_Uptime') > 0) {
        let Vampiric_Curse_Damage_Modifier = 0.5

        let Defensive_Skill_Rate = 0
        for (const Skill of allSkillsVal(nodes_map)) {
          switch (Skill) {
            case 'bone-spirit':
              if ('bone-spirit' in Pre_Sim_Node['skill_use_rate']) {
                Defensive_Skill_Rate +=
                  Pre_Sim_Node['skill_use_rate'][Skill]
              }
              break
            case 'bone-prison':
              Defensive_Skill_Rate +=
                1 / statVal(nodes_map, 'Bone_Prison_Cooldown')
              break
            case 'blood-mist':
              if ('blood-mist' in Pre_Sim_Node['skill_use_rate']) {
                Defensive_Skill_Rate +=
                  Pre_Sim_Node['skill_use_rate'][Skill]
              }
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
          NecromancerDamageMultiplier(
            new Set(['physical']),
            nodes_map,
          )
      }

      // Vampiric Power jagged-spikes
      // Thorns have a 10% chance to deal 300% increased damage and Chill enemies for 8%.
      if (vampiricPowerVal(nodes_map, 'jagged-spikes')) {
        Passive_Dps += 0.3 * statVal(nodes_map, 'Thorns_Dps')
      }

      // Aspect of Plunging Darkness : Bone Prison spawns a pool of Blight that deals {75/125}% bonus damage over 6.0 seconds.
      if (
        allSkillsVal(nodes_map).has('bone-prison') &&
        aspectVal(nodes_map, 'aspect-of-plunging-darkness').length > 0
      ) {
        let Hits_Multiplier =
          1 +
          ProbabilityInCircle(5, 10, enemy_spread) *
            (number_of_enemies - 1)
        if (toggleVal(nodes_map, 'enemy-distant')) {
          Hits_Multiplier =
            1 +
            ProbabilityInCircle(25, 10, enemy_spread) *
              (number_of_enemies - 1)
        }

        Passive_Dps +=
          (aspectVal(nodes_map, 'aspect-of-plunging-darkness')[0] *
            NecromancerDamageMultiplier(
              new Set([
                'shadow',
                'damage-over-time',
                'shadow-damage-over-time',
              ]),
              nodes_map,
            ) *
            Hits_Multiplier *
            statVal(nodes_map, 'Cast_Time')) /
          statVal(nodes_map, 'Bone_Prison_Cooldown')
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
          NecromancerDamageMultiplier(
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
          NecromancerDamageMultiplier(
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
        const Pre_Sim_Node = necromancerPresimVal(nodes_map)
        const enemy_spread = Number(
          statVal(nodes_map, 'Enemy_Spread'),
        )
        let Damage_Received_Total = 1

        // damage-reduction
        Damage_Received_Total *=
          1 - aggregationVal(nodes_map, 'damage-reduction')

        Damage_Received_Total *=
          1 -
          aggregationVal(
            nodes_map,
            'damage-reduction-from-close-enemies',
          ) *
            Number(!toggleVal(nodes_map, 'enemy-distant'))

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
        Damage_Received_Total *=
          1 -
          aggregationVal(
            nodes_map,
            'damage-reduction-while-fortified',
          ) *
            statVal(nodes_map, 'Player_Fortified')

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

        // 'damage-reduction-from-enemies-affected-by-curse-skills'
        if (
          allSkillsVal(nodes_map).has('decrepify') ||
          allSkillsVal(nodes_map).has('iron-maiden')
        ) {
          Damage_Received_Total *=
            1 -
            aggregationVal(
              nodes_map,
              'damage-reduction-from-enemies-affected-by-curse-skills',
            ) *
              Math.min(
                1,
                30 ** 2 / statVal(nodes_map, 'Enemy_Spread') ** 2,
              )
        }

        // block-chance & 'blocked-damage-reduction'
        Damage_Received_Total *=
          1 -
          statVal(nodes_map, 'Total_Block_Chance') *
            aggregationVal(nodes_map, 'blocked-damage-reduction')

        // 'prime-bone-storm' Your Damage Reduction is increased by 15% while Bone Storm is active.
        if (talentVal(nodes_map, 'prime-bone-storm') > 0) {
          const Bone_Storm_Duration = 10
          const Bone_Storm_Cooldown = 60

          // Osseous Gale Aspect : Bone Storm consumes up to 8 Corpses to increase its duration by up to {5/10} seconds.

          Damage_Received_Total *=
            1 - (0.15 * Bone_Storm_Duration) / Bone_Storm_Cooldown
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

        // 'decrepify' Curse the target area. Enemies afflicted by Decrepify are Slowed by {['40.0%', '43.0%', '45.8%', '48.5%', '51.1%',} and deal 20% less damage for 10 seconds.
        if (
          allSkillsVal(nodes_map).has('decrepify') ||
          malignantHeartVal(nodes_map, 'the-decrepit-aura').length !=
            0
        ) {
          Damage_Received_Total *=
            1 -
            (0.2 + 0.008 * talentVal(nodes_map, 'decrepify')) *
              ProbabilityInCircle(0, 30, enemy_spread)
        }

        // "deaths-embrace" Close enemies take {['2%', '4%', '6%',} more damage from you and deal 3% less damage to you.
        if (
          talentVal(nodes_map, 'deaths-embrace') > 0 &&
          !toggleVal(nodes_map, 'enemy-distant')
        ) {
          Damage_Received_Total *=
            1 -
            0.03 *
              talentVal(nodes_map, 'deaths-embrace') *
              Math.min(
                1,
                10 ** 2 / statVal(nodes_map, 'Enemy_Spread') ** 2,
              )
        }

        // Territorial: You gain 10% Damage Reduction against Close enemies.
        Damage_Received_Total *=
          1 -
          0.1 *
            Number(
              !toggleVal(nodes_map, 'enemy-distant') &&
                paragonVal(nodes_map, 'territorial'),
            ) *
            Math.min(
              1,
              10 ** 2 / statVal(nodes_map, 'Enemy_Spread') ** 2,
            )

        // Undaunted: You gain up to 10% Damage Reduction the more Fortify you have.
        Damage_Received_Total *=
          1 -
          0.1 *
            Number(toggleVal(nodes_map, 'percent-fortify')) *
            Number(paragonVal(nodes_map, 'undaunted'))

        // ['stand-alone', 3]: Increases Damage Reduction by 6/12/18% when you have no minions. Each active minion reduces this bonus by 2%.
        const Active_Skeleton_Warriors =
          statVal(nodes_map, 'Skeleton_Warrior_Uptime') *
          statVal(nodes_map, 'Max_Number_Of_Skeleton_Warriors')
        const Active_Skeleton_Mages =
          statVal(nodes_map, 'Skeleton_Mage_Uptime') *
          statVal(nodes_map, 'Max_Number_Of_Skeleton_Mages')
        const Active_Golem =
          statVal(nodes_map, 'Golem_Uptime') *
          statVal(nodes_map, 'Max_Number_Of_Golems')
        Damage_Received_Total *=
          1 -
          Math.max(
            0,
            0.06 * talentVal(nodes_map, 'stand-alone') -
              0.02 *
                (Active_Skeleton_Warriors +
                  Active_Skeleton_Mages +
                  Active_Golem),
          )

        // Blood Golem Perk 1 - The Blood Golem absorbs 15% of the damage you take.
        if (
          bookOfTheDeadVal(nodes_map, 'golem')[0] == 'blood' &&
          bookOfTheDeadVal(nodes_map, 'golem')[1] == 1
        ) {
          Damage_Received_Total *=
            1 - 0.15 * statVal(nodes_map, 'Golem_Uptime')
        }

        // Skill: ['reap', 5] Sweep an ethereal scythe in front of you, dealing {13}% damage. Hitting an enemy with Reap increases your Damage Reduction by 15% for 2 seconds.
        if (allSkillsVal(nodes_map).has('reap')) {
          Damage_Received_Total *=
            1 -
            0.15 *
              Math.min(
                1,
                necromancerPresimVal(nodes_map)['skill_use_rate'][
                  'reap'
                ] / 0.5,
              )
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

        // Vampiric Power bathe-in-blood
        // While Channeling a Skill, you form a pool of blood beneath you. While channeling a skill in a pool, your Channeled Skills deal 40% increased damage and you gain 30% Damage Reduction. A pool can only form once every 8 seconds.
        if (
          vampiricPowerVal(nodes_map, 'bathe-in-blood') &&
          'decompose' in Pre_Sim_Node['skill_use_rate']
        ) {
          Damage_Received_Total *= 0.7
        }

        // Unique Doombringer: Lucky Hit: Up to a [0.7|%|] chance to deal 0.7*825 Shadow damage to surrounding enemies and reduce their damage done by 20% for 3 seconds.
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

        // Legendary Paragon 'scent-of-death' With at least 2 Corpses Nearby, you gain 15% Damage Reduction. With no Corpses Nearby, you deal x15% increased damage.
        if (
          paragonVal(nodes_map, 'scent-of-death') &&
          statVal(nodes_map, 'Corpse_Consumption_Rate') <
            statVal(nodes_map, 'Corpse_Spawn_Rate')
        ) {
          Damage_Received_Total *= 0.85
        }

        // Glyph 'darkness',  Whenever you or your Minions deal Shadow damage to an enemy, that enemy deals 2% reduced damage, up to 10%, for 5 seconds.
        if (paragonVal(nodes_map, 'darkness')) {
          const Darkness_Skills = new Set([
            'reap',
            'decompose',
            'blight',
            'sever',
          ])
          let Darkness_Skill_Rate = 0
          for (const Skill in Pre_Sim_Node['skill_use_rate']) {
            if (Darkness_Skills.has(Skill)) {
              Darkness_Skill_Rate +=
                Pre_Sim_Node['skill_use_rate'][Skill]
            }
          }
          if (
            Darkness_Skill_Rate * 5 >= 1 ||
            (bookOfTheDeadVal(nodes_map, 'skeletal-mages')[0] ==
              'shadow' &&
              statVal(nodes_map, 'Skeleton_Mage_Uptime') > 0)
          )
            Damage_Received_Total *= 0.9
        }

        // Glyph 'exhumation', // Consuming a Corpse Fortifies you for 4% of your Maximum Life and grants 4% Damage Reduction for 4 seconds.
        if (paragonVal(nodes_map, 'exhumation')) {
          Damage_Received_Total *=
            1 -
            0.04 *
              Math.min(
                1,
                statVal(nodes_map, 'Corpse_Consumption_Rate') * 4,
              )
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

      Willpower += aggregationVal(nodes_map, 'willpower')

      // all stats
      Willpower += aggregationVal(nodes_map, 'all-stats')

      // %-Willpower
      Willpower *= 1 + aggregationVal(nodes_map, '%-willpower')

      return Math.round(Willpower)
    }),

    Total_Armor: new StatsNode('Total_Armor', () => {
      let Armor = statVal(nodes_map, 'Total_Strength')
      const Pre_Sim_Node = necromancerPresimVal(nodes_map)

      Armor += aggregationVal(nodes_map, 'armor')

      // total-armor
      // total-armor-while-golem-are-active (Necromancer Only)
      let Armor_Multiplier =
        1 + aggregationVal(nodes_map, 'total-armor')
      if (
        bookOfTheDeadVal(nodes_map, 'golem')[1] != 3 &&
        allSkillsVal(nodes_map).has('golem')
      ) {
        Armor_Multiplier += aggregationVal(
          nodes_map,
          'total-armor-while-golem-are-active',
        )
      }

      Armor *= Armor_Multiplier

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

      let Sac_Resist = 0
      // Defender Warrior Sacrifice - You gain 20% Resistance to All Elements, but you can no longer raise Skeletal Warriors.
      if (
        bookOfTheDeadVal(nodes_map, 'skeletal-warriors')[0] ==
          'defenders' &&
        bookOfTheDeadVal(nodes_map, 'skeletal-warriors')[1] == 3
      ) {
        let Sacrificial_Bonus = 0.2 // Sacrificial Aspect : Your Sacrifice bonuses are increased by {15/25}%.
        if (aspectVal(nodes_map, 'sacrificial-aspect').length != 0) {
          Sacrificial_Bonus *=
            1 + aspectVal(nodes_map, 'sacrificial-aspect')[0]
        }
        let Memento_Mori = 0 // ['memento-mori', 3] Sacrificing both Skeletal Warriors and Skeletal Mages increases their Sacrifice bonuses by {['20%', '40%', '60%']}
        if (
          talentVal(nodes_map, 'memento-mori') > 0 &&
          bookOfTheDeadVal(nodes_map, 'skeletal-warriors')[1] == 3 &&
          bookOfTheDeadVal(nodes_map, 'skeletal-mages')[1] == 3
        ) {
          Memento_Mori += talentVal(nodes_map, 'memento-mori') * 0.2
        }
        Sac_Resist =
          1 -
          (1 - Sacrificial_Bonus) *
            (1 - Sacrificial_Bonus * Memento_Mori)
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
        mod_resist + int_resist - World_Tier_Penalty + Sac_Resist,
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

      let Sac_Resist = 0
      // Defender Warrior Sacrifice - You gain 20% Resistance to All Elements, but you can no longer raise Skeletal Warriors.
      if (
        bookOfTheDeadVal(nodes_map, 'skeletal-warriors')[0] ==
          'defenders' &&
        bookOfTheDeadVal(nodes_map, 'skeletal-warriors')[1] == 3
      ) {
        let Sacrificial_Bonus = 0.2 // Sacrificial Aspect : Your Sacrifice bonuses are increased by {15/25}%.
        if (aspectVal(nodes_map, 'sacrificial-aspect').length != 0) {
          Sacrificial_Bonus *=
            1 + aspectVal(nodes_map, 'sacrificial-aspect')[0]
        }
        let Memento_Mori = 0 // ['memento-mori', 3] Sacrificing both Skeletal Warriors and Skeletal Mages increases their Sacrifice bonuses by {['20%', '40%', '60%']}
        if (
          talentVal(nodes_map, 'memento-mori') > 0 &&
          bookOfTheDeadVal(nodes_map, 'skeletal-warriors')[1] == 3 &&
          bookOfTheDeadVal(nodes_map, 'skeletal-mages')[1] == 3
        ) {
          Memento_Mori += talentVal(nodes_map, 'memento-mori') * 0.2
        }
        Sac_Resist =
          1 -
          (1 - Sacrificial_Bonus) *
            (1 - Sacrificial_Bonus * Memento_Mori)
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
        mod_resist + int_resist - World_Tier_Penalty + Sac_Resist,
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

        let Sac_Resist = 0
        // Defender Warrior Sacrifice - You gain 20% Resistance to All Elements, but you can no longer raise Skeletal Warriors.
        if (
          bookOfTheDeadVal(nodes_map, 'skeletal-warriors')[0] ==
            'defenders' &&
          bookOfTheDeadVal(nodes_map, 'skeletal-warriors')[1] == 3
        ) {
          let Sacrificial_Bonus = 0.2 // Sacrificial Aspect : Your Sacrifice bonuses are increased by {15/25}%.
          if (
            aspectVal(nodes_map, 'sacrificial-aspect').length != 0
          ) {
            Sacrificial_Bonus *=
              1 + aspectVal(nodes_map, 'sacrificial-aspect')[0]
          }
          let Memento_Mori = 0 // ['memento-mori', 3] Sacrificing both Skeletal Warriors and Skeletal Mages increases their Sacrifice bonuses by {['20%', '40%', '60%']}
          if (
            talentVal(nodes_map, 'memento-mori') > 0 &&
            bookOfTheDeadVal(nodes_map, 'skeletal-warriors')[1] ==
              3 &&
            bookOfTheDeadVal(nodes_map, 'skeletal-mages')[1] == 3
          ) {
            Memento_Mori += talentVal(nodes_map, 'memento-mori') * 0.2
          }
          Sac_Resist =
            1 -
            (1 - Sacrificial_Bonus) *
              (1 - Sacrificial_Bonus * Memento_Mori)
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
          mod_resist + int_resist - World_Tier_Penalty + Sac_Resist,
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

      let Sac_Resist = 0
      // Defender Warrior Sacrifice - You gain 20% Resistance to All Elements, but you can no longer raise Skeletal Warriors.
      if (
        bookOfTheDeadVal(nodes_map, 'skeletal-warriors')[0] ==
          'defenders' &&
        bookOfTheDeadVal(nodes_map, 'skeletal-warriors')[1] == 3
      ) {
        let Sacrificial_Bonus = 0.2 // Sacrificial Aspect : Your Sacrifice bonuses are increased by {15/25}%.
        if (aspectVal(nodes_map, 'sacrificial-aspect').length != 0) {
          Sacrificial_Bonus *=
            1 + aspectVal(nodes_map, 'sacrificial-aspect')[0]
        }
        let Memento_Mori = 0 // ['memento-mori', 3] Sacrificing both Skeletal Warriors and Skeletal Mages increases their Sacrifice bonuses by {['20%', '40%', '60%']}
        if (
          talentVal(nodes_map, 'memento-mori') > 0 &&
          bookOfTheDeadVal(nodes_map, 'skeletal-warriors')[1] == 3 &&
          bookOfTheDeadVal(nodes_map, 'skeletal-mages')[1] == 3
        ) {
          Memento_Mori += talentVal(nodes_map, 'memento-mori') * 0.2
        }
        Sac_Resist =
          1 -
          (1 - Sacrificial_Bonus) *
            (1 - Sacrificial_Bonus * Memento_Mori)
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
        mod_resist + int_resist - World_Tier_Penalty + Sac_Resist,
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

      let Sac_Resist = 0
      // Defender Warrior Sacrifice - You gain 20% Resistance to All Elements, but you can no longer raise Skeletal Warriors.
      if (
        bookOfTheDeadVal(nodes_map, 'skeletal-warriors')[0] ==
          'defenders' &&
        bookOfTheDeadVal(nodes_map, 'skeletal-warriors')[1] == 3
      ) {
        let Sacrificial_Bonus = 0.2 // Sacrificial Aspect : Your Sacrifice bonuses are increased by {15/25}%.
        if (aspectVal(nodes_map, 'sacrificial-aspect').length != 0) {
          Sacrificial_Bonus *=
            1 + aspectVal(nodes_map, 'sacrificial-aspect')[0]
        }
        let Memento_Mori = 0 // ['memento-mori', 3] Sacrificing both Skeletal Warriors and Skeletal Mages increases their Sacrifice bonuses by {['20%', '40%', '60%']}
        if (
          talentVal(nodes_map, 'memento-mori') > 0 &&
          bookOfTheDeadVal(nodes_map, 'skeletal-warriors')[1] == 3 &&
          bookOfTheDeadVal(nodes_map, 'skeletal-mages')[1] == 3
        ) {
          Memento_Mori += talentVal(nodes_map, 'memento-mori') * 0.2
        }
        Sac_Resist =
          1 -
          (1 - Sacrificial_Bonus) *
            (1 - Sacrificial_Bonus * Memento_Mori)
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
        mod_resist + int_resist - World_Tier_Penalty + Sac_Resist,
      )
    }),

    Total_Dodge_Chance: new StatsNode('Total_Dodge_Chance', () => {
      const Pre_Sim_Node = necromancerPresimVal(nodes_map)
      let Total_Dodge = 0.0001 * statVal(nodes_map, 'Total_Dexterity')

      // dodge-chance
      Total_Dodge += aggregationVal(nodes_map, 'dodge-chance')

      // dodge-chance-against-distant-enemies
      Total_Dodge += toggleVal(nodes_map, 'enemy-distant')
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
        Total_Dodge += 0.08 * Math.min(Pre_Sim_Node['dot_uptime'], 1)
      }

      return Total_Dodge
    }),

    Total_Block_Chance: new StatsNode('Total_Block_Chance', () => {
      const Total_Block_Chance = aggregationVal(
        nodes_map,
        'block-chance',
      )

      return Total_Block_Chance
    }),

    Bonus_Healing_Received: new StatsNode(
      'Bonus_Healing_Received',
      () => {
        let Increased_Healing_Received = 0

        Increased_Healing_Received += aggregationVal(
          nodes_map,
          'healing-received',
        )

        // 'gruesome-mending' Receive 10/20/30%+ more Healing from all sources.

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

        Control_Impaired_Duration_Reduction *=
          1 -
          aggregationVal(
            nodes_map,
            'control-impaired-duration-reduction',
          )

        return Control_Impaired_Duration_Reduction
      },
    ),

    Blood_Orb_Healing: new StatsNode('Blood_Orb_Healing', () => {
      // Gore quills uses all blood orbs.
      if (aspectVal(nodes_map, 'gore-quills').length > 0) {
        return 0
      }
      // Blood Orbs Heal you for 15% of your Maximum Life when picked up
      let Blood_Orb_Healing = 0.15 * statVal(nodes_map, 'Total_Life')

      // blood-orb-healing
      Blood_Orb_Healing *=
        1 + aggregationVal(nodes_map, 'blood-orb-healing')

      return Blood_Orb_Healing
    }),

    Potion_Charges: new StatsNode('Potion_Charges', () => {
      const Potion_Charges_Number = 5

      return Potion_Charges_Number
    }),

    /*--------------------------------------------------
                      MICELLANEOUS NODES
          --------------------------------------------------*/
    Enemy_Crowd_Controlled: new StatsNode(
      'Enemy_Crowd_Controlled',
      () => {
        return (
          1 -
          (1 - Number(toggleVal(nodes_map, 'enemy-slowed'))) *
            (1 - Number(toggleVal(nodes_map, 'enemy-dazed'))) *
            (1 - Number(toggleVal(nodes_map, 'enemy-stunned'))) *
            (1 - Number(toggleVal(nodes_map, 'enemy-frozen'))) *
            (1 - Number(toggleVal(nodes_map, 'enemy-chilled'))) *
            (1 - Number(toggleVal(nodes_map, 'enemy-knocked-down'))) *
            (1 - Number(toggleVal(nodes_map, 'enemy-immobilized')))
        )
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
      const Pre_Sim_Node = necromancerPresimVal(nodes_map)

      Max_Resource +=
        aggregationVal(nodes_map, 'maximum-essence') +
        aggregationVal(nodes_map, 'maximum-resource')

      // 'unliving-energy' Your Maximum essence is increased by [3,6,9]
      Max_Resource += 3 * talentVal(nodes_map, 'unliving-energy')

      // Shadow Mage Sacrifice - +15 maximum essence; unable to summon all types of Skeletal Mages.
      if (
        bookOfTheDeadVal(nodes_map, 'skeletal-mages')[0] ==
          'shadow' &&
        bookOfTheDeadVal(nodes_map, 'skeletal-mages')[1] == 3
      ) {
        let sacrificial_aspect = 1 // Sacrificial Aspect : Your Sacrifice bonuses are increased by {15/25}%.
        if (aspectVal(nodes_map, 'sacrificial-aspect').length != 0) {
          sacrificial_aspect += aspectVal(
            nodes_map,
            'sacrificial-aspect',
          )[0]
        }
        let Memento_Mori = 0 // ['memento-mori', 3] Sacrificing both Skeletal Warriors and Skeletal Mages increases their Sacrifice bonuses by {['20%', '40%', '60%']}
        if (
          talentVal(nodes_map, 'memento-mori') > 0 &&
          bookOfTheDeadVal(nodes_map, 'skeletal-warriors')[1] == 3 &&
          bookOfTheDeadVal(nodes_map, 'skeletal-mages')[1] == 3
        ) {
          Memento_Mori = talentVal(nodes_map, 'memento-mori') * 0.2
        }
        Max_Resource += 15 * sacrificial_aspect * (1 + Memento_Mori)
      }

      // Requiem Aspect : You gain {3/5} Maximum Essence per active Minion.
      if (aspectVal(nodes_map, 'requiem-aspect').length != 0) {
        Max_Resource +=
          aspectVal(nodes_map, 'requiem-aspect')[0] *
          statVal(nodes_map, 'Max_Number_Of_Minions')
      }

      // Legendary Paragon 'bone-graft', Hitting enemies with Bone Skills increases your damage by x1% and your Maximum Essence by 2 for 8 seconds, stacks up to x8% increased damage and 16 Maximum Essence.
      if (paragonVal(nodes_map, 'bone-graft')) {
        const Bone_Skills = new Set([
          'bone-splinters',
          'bone-spirit',
          'bone-spear',
          'bone-storm',
        ])
        let Bone_Graft_Rate = 0
        for (const Skill in Pre_Sim_Node['skill_use_rate']) {
          if (Bone_Skills.has(Skill)) {
            Bone_Graft_Rate +=
              Pre_Sim_Node['skill_use_rate'][Skill] *
              Pre_Sim_Node['cross_skill_stat'][Skill]['total_hits']
          }
        }
        if (Bone_Graft_Rate * 8 >= 1) {
          Max_Resource += 16
        } else {
          Max_Resource += 2 * Math.min(1, Bone_Graft_Rate * 8)
        }
      }

      // melted-heart-of-selig Gain 60 maximum Resource. 75% of incoming damage drains 2 Resource for every 1% of Life you would have lost instead.
      if (aspectVal(nodes_map, 'melted-heart-of-selig').length > 0) {
        Max_Resource += 60
      }

      return Math.round(Max_Resource)
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
        const Pre_Sim_Node = necromancerPresimVal(nodes_map)

        let Resource_Gain_Per_Cast = Math.max(
          currentSkillVal(nodes_map)['base_resources_generated'],
          0,
        )

        // Bone Splinters: Fire 3 bone splinters, dealing {9%} damage each. Each subsequent time an enemy is hit by the same cast of Bone Splinters, you gain 1 Essence.
        if (currentSkillVal(nodes_map)['name'] == 'bone-splinters') {
          Resource_Gain_Per_Cast += ProbabilityInCone(
            10,
            1 / 6,
            enemy_spread,
          )
        }

        // Flesh-Rending Aspect : After Decompose spawns a Corpse, gain {10/20} Essence.
        if (
          aspectVal(nodes_map, 'flesh-rending-aspect').length != 0 &&
          currentSkillVal(nodes_map)['name'] == 'decompose'
        ) {
          Resource_Gain_Per_Cast +=
            aspectVal(nodes_map, 'flesh-rending-aspect')[0] / 2
          // Rotting Aspect : Decompose can chain up to 2.0 additional targets. When Decompose spawns a Corpse, it has a {50/100}% chance to spawn a Corpse under all afflicted targets.
          if (aspectVal(nodes_map, 'rotting-aspect').length != 0) {
            let Additional_Decompose_Chains = 0
            if (toggleVal(nodes_map, 'enemy-distant')) {
              Additional_Decompose_Chains = Math.min(
                2,
                ProbabilityInCircle(25, 20, enemy_spread) *
                  (number_of_enemies - 1),
              )
            } else {
              Additional_Decompose_Chains = Math.min(
                2,
                ProbabilityInCircle(15, 20, enemy_spread) *
                  (number_of_enemies - 1),
              )
            }
            Resource_Gain_Per_Cast +=
              (Additional_Decompose_Chains *
                aspectVal(nodes_map, 'rotting-aspect')[0] *
                aspectVal(nodes_map, 'flesh-rending-aspect')[0]) /
              2
          }
        }

        // 'dreadful-bone-spirit' After Bone spirit hits an enemy, you generate 30% of your Maximum Essence over the next 4 seconds.
        if (
          talentVal(nodes_map, 'dreadful-bone-spirit') > 0 &&
          currentSkillVal(nodes_map)['name'] == 'bone-spirit'
        ) {
          Resource_Gain_Per_Cast +=
            0.3 * statVal(nodes_map, 'Max_Resource')
        }

        // Avoiding loop with Blood Lance
        let total_hits = 0
        if (currentSkillVal(nodes_map)['name'] == 'blood-lance') {
          total_hits =
            Pre_Sim_Node['cross_skill_stat']?.['blood-lance']?.[
              'total_hits'
            ] ?? 0
        } else {
          total_hits = statVal(nodes_map, 'Total_Hits')
        }

        Resource_Gain_Per_Cast +=
          statVal(nodes_map, 'Resource_Gain_Per_Hit') * total_hits

        Resource_Gain_Per_Cast *= statVal(
          nodes_map,
          'Total_Resource_Generation_Multiplier',
        )

        // Mothers Embrace: If a Core Skill hits 4 or more enemies, [[20 - 40]|%|] of the Resource cost is refunded.
        if (aspectVal(nodes_map, 'mothers-embrace').length > 0) {
          // p is the probability of extra hits.
          let p = 0
          switch (currentSkillVal(nodes_map)['name']) {
            case 'blood-lance':
              p = Math.min(
                Math.max(total_hits - 1, 0) / number_of_enemies,
                1,
              )
              break

            case 'blood-surge':
              p = Math.min(20 ** 2 / enemy_spread ** 2, 1)
              break

            case 'blight':
              p = Math.min(10 ** 2 / enemy_spread ** 2, 1)
              break

            case 'sever':
              p = ProbabilityInCone(15, 1 / 4, enemy_spread)
              break

            case 'bone-spear':
              p = ProbabilityIntersectingLineInCircle(
                10,
                40,
                enemy_spread,
              )
              break
          }
          Resource_Gain_Per_Cast +=
            -statVal(nodes_map, 'Resource_Cost_Per_Cast') *
            aspectVal(nodes_map, 'mothers-embrace')[0] *
            (1 - BinomialDistribution(number_of_enemies - 1, p, 3))
        }

        // Aspect of the Long Shadow (Necromancer Offensive Aspect): Lucky Hit: Your Shadow Damage Over Time effects have a 10-30% chance to generate 3 Essence.
        // Damage from your Shadowblight Key Passive will always generate 2 Essence.
        if (
          aspectVal(nodes_map, 'aspect-of-the-long-shadow').length !=
            0 &&
          (tagsVal(nodes_map).has('shadow-damage-over-time') ||
            (tagsVal(nodes_map).has('shadow') &&
              tagsVal(nodes_map).has('damage-over-time')))
        ) {
          Resource_Gain_Per_Cast +=
            3 *
            aspectVal(nodes_map, 'aspect-of-the-long-shadow')[0] *
            statVal(nodes_map, 'Total_Lucky_Hit_Chance_Multiplier') *
            total_hits
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
        const Pre_Sim_Node = necromancerPresimVal(nodes_map)

        // 'paranormal-blood-lance' While at least 2 enemies or a Boss are affected by Blood Lance, you gain 15% Attack Speed and Blood Lance's Essence cost is reduced by 2.
        if (
          Resource_Cost_Per_Cast < -2 &&
          talentVal(nodes_map, 'paranormal-blood-lance') > 0 &&
          currentSkillVal(nodes_map)['name'] == 'blood-lance' &&
          (Number(toggleVal(nodes_map, 'number-of-enemies')) >= 2 ||
            toggleVal(nodes_map, 'enemy-boss'))
        ) {
          Resource_Cost_Per_Cast += 2
        }

        // 'imperfectly-balanced' Your Core Skills cost 3% more Essence, but deal 5% increased damage.
        if (
          talentVal(nodes_map, 'imperfectly-balanced') > 0 &&
          tagsVal(nodes_map).has('core')
        ) {
          Resource_Cost_Per_Cast *=
            1 + 0.03 * talentVal(nodes_map, 'imperfectly-balanced')
        }

        Resource_Cost_Per_Cast *=
          1 - aggregationVal(nodes_map, 'essence-cost-reduction')

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
        (statVal(nodes_map, 'Resource_Regeneration_Per_Second') -
          statVal(nodes_map, 'Resource_Drain_Per_Second')) *
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
        const number_of_enemies = Number(
          toggleVal(nodes_map, 'number-of-enemies'),
        )
        const enemy_spread = Number(
          statVal(nodes_map, 'Enemy_Spread'),
        )

        const Pre_Sim_Node = necromancerPresimVal(nodes_map)

        // Total_Willpower
        Resource_Gen_Multiplier_Total +=
          0.001 * statVal(nodes_map, 'Total_Willpower')

        // resource-generation
        Resource_Gen_Multiplier_Total += aggregationVal(
          nodes_map,
          'resource-generation',
        )

        // Aspect of Torment: Critical Strikes with Bone Skills increase your Essence Regeneration by x[90-170]% for 4 seconds.
        if (aspectVal(nodes_map, 'aspect-of-torment').length != 0) {
          const Critical_Chance_Bone_Skills = new Set([
            'bone-splinters',
            'bone-spirit',
            'bone-spear',
            'bone-storm',
          ])
          const Critical_Chance = statVal(
            nodes_map,
            'Critical_Chance',
          )
          let Bone_Skill_Crit_Rate = 0
          for (const Skill in Pre_Sim_Node['skill_use_rate']) {
            if (Critical_Chance_Bone_Skills.has(Skill)) {
              Bone_Skill_Crit_Rate +=
                Pre_Sim_Node['skill_use_rate'][Skill] *
                Pre_Sim_Node['cross_skill_stat'][Skill][
                  'critical_chance'
                ] *
                Pre_Sim_Node['cross_skill_stat'][Skill]['total_hits']
            }
          }
          Resource_Gen_Multiplier_Total *=
            1 +
            aspectVal(nodes_map, 'aspect-of-torment')[0] *
              Math.min(1, Bone_Skill_Crit_Rate * 4)
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
        const Pre_Sim_Node = necromancerPresimVal(nodes_map)
        const enemy_spread = Number(
          statVal(nodes_map, 'Enemy_Spread'),
        )
        let Resource_Gain_Per_Hit = 0

        // 'enhanced-hemorrhage' After picking up a Blood Orb, your next Hemorrhage also deals damage to enemies around your target and grants 2 additional Essence per enemy hit.
        if (
          talentVal(nodes_map, 'enhanced-hemorrhage') > 0 &&
          currentSkillVal(nodes_map)['name'] == 'hemorrhage'
        ) {
          let Enhanced_Hemo_Chance = 0
          if ('hemorrhage' in Pre_Sim_Node['skill_use_rate']) {
            Enhanced_Hemo_Chance = Math.min(
              1,
              statVal(nodes_map, 'Blood_Orb_Pickup_Rate') /
                (Pre_Sim_Node['skill_use_rate']['hemorrhage'] +
                  0.0001),
            )
          }
          const Area = Math.min(10 ** 2 / enemy_spread ** 2, 1)
          // Work it out on paper. Need to worry about case where it isn't enhanced.
          Resource_Gain_Per_Hit +=
            2 -
            (2 * (1 - Enhanced_Hemo_Chance)) /
              (1 + Enhanced_Hemo_Chance * Area)
        }

        // 'enhanced-iron-maiden' Iron Maiden no longer costs Essence. Instead, gain 5 Essence for each enemy Cursed. Does not work with enemies who are already Cursed with Iron Maiden.
        if (
          talentVal(nodes_map, 'enhanced-iron-maiden') > 0 &&
          currentSkillVal(nodes_map)['name'] == 'iron-maiden'
        ) {
          Resource_Gain_Per_Hit +=
            10 + 5 * statVal(nodes_map, 'Total_Hits')
        }

        // Aspect of Exposed Flesh : Lucky Hit: Up to a 10.0% chance to generate {30/50} Essence when hitting a Vulnerable enemy.
        if (
          aspectVal(nodes_map, 'aspect-of-exposed-flesh').length >
            0 &&
          statVal(nodes_map, 'Enemy_Vulnerable') > 0
        ) {
          Resource_Gain_Per_Hit +=
            aspectVal(nodes_map, 'aspect-of-exposed-flesh')[0] *
            0.1 *
            statVal(nodes_map, 'Total_Lucky_Hit_Chance_Multiplier') *
            statVal(nodes_map, 'Enemy_Vulnerable')
        }

        // Bloodless Scream : Your Darkness Skills Chill enemies for up to 100.0%.
        // Lucky Hit: Your Darkness Skills have up to a 100.0% chance to generate {7/10} additional Essence against Frozen targets.
        //  Darkness Skills deal x20-x50% bonus damage to Frozen enemies.
        if (
          aspectVal(nodes_map, 'bloodless-scream').length > 0 &&
          tagsVal(nodes_map).has('darkness') &&
          toggleVal(nodes_map, 'enemy-frozen')
        ) {
          Resource_Gain_Per_Hit +=
            aspectVal(nodes_map, 'bloodless-scream')[0] *
            statVal(nodes_map, 'Total_Lucky_Hit_Chance_Multiplier') *
            statVal(nodes_map, 'Enemy_Boss_CC_Adjustment')
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
        const number_of_enemies = Number(
          toggleVal(nodes_map, 'number-of-enemies'),
        )
        const enemy_spread = Number(
          statVal(nodes_map, 'Enemy_Spread'),
        )

        let Regeneration_Per_Second = 3
        const Draining_Per_Second = 0

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

        // Cold Mage Perk 1 - Gain +2 essence when Cold Mages deal damage with their normal attack
        if (
          bookOfTheDeadVal(nodes_map, 'skeletal-mages')[0] ==
            'cold' &&
          bookOfTheDeadVal(nodes_map, 'skeletal-mages')[1] == 1
        ) {
          Regeneration_Per_Second +=
            2 *
            statVal(nodes_map, 'Skeleton_Mage_Attack_Speed') *
            statVal(nodes_map, 'Max_Number_Of_Skeleton_Mages') *
            statVal(nodes_map, 'Skeleton_Mage_Uptime')
        }

        // Aspect of Potent Blood : While healthy Life, Blood Orbs grant {10/20} Essence.
        if (
          aspectVal(nodes_map, 'aspect-of-potent-blood').length > 0 &&
          Number(toggleVal(nodes_map, 'percent-life')) >= 0.8
        ) {
          Regeneration_Per_Second +=
            aspectVal(nodes_map, 'aspect-of-potent-blood')[0] *
            statVal(nodes_map, 'Blood_Orb_Pickup_Rate')
        }

        //Talent ['grim-harvest', 3] Consuming a Corpse generates {[2, 4, 6],} Essence.
        Regeneration_Per_Second +=
          2 *
          talentVal(nodes_map, 'grim-harvest') *
          statVal(nodes_map, 'Corpse_Consumption_Rate')

        // Talent ghastly Bone Prison: If an enemy is trapped by Bone Prison, gain  25 Essence, plus an additional 5 per enemy trapped.
        if (
          allSkillsVal(nodes_map).has('bone-prison') &&
          talentVal(nodes_map, 'ghastly-bone-prison') > 0
        ) {
          if (toggleVal(nodes_map, 'enemy-distant')) {
            Regeneration_Per_Second +=
              (30 +
                5 *
                  ProbabilityInCircle(25, 10, enemy_spread) *
                  (number_of_enemies - 1)) /
              statVal(nodes_map, 'Bone_Prison_Cooldown')
          } else {
            Regeneration_Per_Second +=
              30 +
              (5 *
                ProbabilityInCircle(10, 10, enemy_spread) *
                (number_of_enemies - 1)) /
                statVal(nodes_map, 'Bone_Prison_Cooldown')
          }
        }

        // Aspect of the Long Shadow (Necromancer Offensive Aspect): Lucky Hit: Your Shadow Damage Over Time effects have a 10-30% chance to generate 3 Essence.
        // Damage from your Shadowblight Key Passive will always generate 2 Essence.
        if (
          aspectVal(nodes_map, 'aspect-of-the-long-shadow').length !=
          0
        ) {
          Regeneration_Per_Second +=
            2 * statVal(nodes_map, 'Shadowblight_Rate')
        }

        // melted-heart-of-selig Gain 60 maximum Resource. 75% of incoming damage drains 2 Resource for every 1% of Life you would have lost instead.
        // if (
        //   aspectVal(nodes_map, 'melted-heart-of-selig').length != 0
        // ) {
        //   Draining_Per_Second +=
        //     aspectVal(nodes_map, 'melted-heart-of-selig')[0] *
        //     statVal(nodes_map, 'Enemy_Attacks_Per_Second')
        // }

        // Tibault's Will (Generic Unique Pants): You deal 20-40% [x] increased damage while Unstoppable and for 4 seconds after. When you become Unstoppable, gain 50 of your Primary Resource.
        if (aspectVal(nodes_map, 'tibaults-will').length != 0) {
          let Tibaults_Proc_Rate = 0

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

        // Vampiric Power feed-the-coven
        // Lucky Hit: Conjuration, Companion, Minion and Bat Familiar attacks have up to a 60% chance to restore 10 Primary Resource to you and increase your Damage by 10% for 4 seconds.
        if (vampiricPowerVal(nodes_map, 'feed-the-coven')) {
          const Minion_Attack_Rate =
            statVal(nodes_map, 'Skeleton_Mage_Attack_Speed') +
            statVal(nodes_map, 'Skeleton_Warrior_Attack_Speed') +
            statVal(nodes_map, 'Golem_Attack_Speed')
          const Minion_Lucky_Hit_Chance = 0.3 // completely made up value taken from bat stun chance on another vampiric power
          Regeneration_Per_Second +=
            10 *
            (statVal(nodes_map, 'Vampiric_Bat_Rate') +
              Minion_Attack_Rate) *
            Minion_Lucky_Hit_Chance
        }

        return Regeneration_Per_Second - Draining_Per_Second
      },
    ),

    Resource_Drain_Per_Second: new StatsNode(
      'Resource_Drain_Per_Second',
      () => {
        let Draining_Per_Second = 0

        // Malignant Heart (All) determination:	Resource draining effects are [50 - 60]% less effective. In addition, gain [3 - 8]% increased Resource Generation.
        if (
          malignantHeartVal(nodes_map, 'determination').length != 0 &&
          Draining_Per_Second > 0
        ) {
          Draining_Per_Second *=
            1 - malignantHeartVal(nodes_map, 'determination')[0]
        }

        // Malignant Heart (Necromancer) the-great-feast:	Each Minion drains [1-2] Essence per second but deals [55-80]]% increased damage. With no Minions, this bonus applies to you and drains 5 Essence per second.
        if (
          malignantHeartVal(nodes_map, 'the-great-feast').length != 0
        ) {
          let Average_Minion_Uptime = 0
          if (statVal(nodes_map, 'Skeleton_Warrior_Uptime') != 0) {
            Average_Minion_Uptime +=
              statVal(nodes_map, 'Skeleton_Warrior_Uptime') *
              statVal(nodes_map, 'Max_Number_Of_Skeleton_Warriors')
          }
          if (statVal(nodes_map, 'Skeleton_Mage_Uptime') != 0) {
            Average_Minion_Uptime +=
              statVal(nodes_map, 'Skeleton_Mage_Uptime') *
              statVal(nodes_map, 'Max_Number_Of_Skeleton_Mages')
          }
          if (
            allSkillsVal(nodes_map).has('golem') &&
            statVal(nodes_map, 'Golem_Uptime') != 0
          ) {
            Average_Minion_Uptime += statVal(
              nodes_map,
              'Golem_Uptime',
            )
          }

          if (statVal(nodes_map, 'Max_Number_Of_Minions') > 0) {
            Draining_Per_Second +=
              Average_Minion_Uptime *
              malignantHeartVal(nodes_map, 'the-great-feast')[0]
          } else {
            Draining_Per_Second += 5
          }
        }

        return Draining_Per_Second
      },
    ),

    Resource_On_Kill: new StatsNode('Resource_On_Kill', () => {
      let Resource_On_Kill_Total = 0

      // essence-on-kill (Necromancer)
      Resource_On_Kill_Total += aggregationVal(
        nodes_map,
        'essence-on-kill',
      )

      // 'enhanced-decompose' If an enemy dies while being Decomposed, you gain 10 Essence.
      if (
        talentVal(nodes_map, 'enhanced-decompose') > 0 &&
        currentSkillVal(nodes_map)['name'] == 'Decompose'
      ) {
        Resource_On_Kill_Total +=
          10 * statVal(nodes_map, 'Enemies_Killed')
      }

      return Resource_On_Kill_Total
    }),

    Total_Lucky_Hit_Chance_Multiplier: new StatsNode(
      'Total_Lucky_Hit_Chance_Multiplier',
      () => {
        let Lucky_Hit_Chance_Bonus_Total = 0

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
      const enemy_spread = Number(statVal(nodes_map, 'Enemy_Spread'))
      // Iron maiden doesn't stack with itself, so you only want to use it every 10 secs.
      if (currentSkillVal(nodes_map)['name'] == 'iron-maiden') {
        return 10
      }

      const Pre_Sim_Node = necromancerPresimVal(nodes_map)

      let Cooldown_Total = CooldownFromRanks(
        talentVal(nodes_map, current_skill),
        current_skill,
        currentSkillVal(nodes_map)['cooldown_seconds'],
      )
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

      // 'enhanced-bone-spirit' If Bone Spirit Critically Strikes, its Cooldown is reduced by 7 seconds. This effect can only happen once per cast.
      if (
        talentVal(nodes_map, 'enhanced-bone-spirit') > 0 &&
        currentSkillVal(nodes_map)['name'] == 'bone-spirit'
      ) {
        Cooldown_Total -= 7 * statVal(nodes_map, 'Critical_Chance')
      }

      // ['enhanced-blood-mist', 1],  Casting a Skill that Overpowers reduces the cooldown of Blood Mist by 2 seconds.
      if (
        currentSkillVal(nodes_map)['name'] == 'blood-mist' &&
        talentVal(nodes_map, 'enhanced-blood-mist') > 0
      ) {
        let Overpower_Rate = 0
        for (const Other_Skill in Pre_Sim_Node['skill_use_rate']) {
          Overpower_Rate +=
            Pre_Sim_Node['cross_skill_stat'][Other_Skill][
              'overpower_chance'
            ] * Pre_Sim_Node['skill_use_rate'][Other_Skill]
        }
        const Time_Between_Overpowers = 1 / (Overpower_Rate + 0.0001)
        Cooldown_Total *=
          Time_Between_Overpowers / (Time_Between_Overpowers + 2)
      }

      // ['rapid-ossification', 3] Every 100 Essence you spend reduces the cooldowns of your Bone Skills by {[0.5, 1, 1.5],} seconds.
      if (
        talentVal(nodes_map, 'rapid-ossification') > 0 &&
        tagsVal(nodes_map).has('bone')
      ) {
        let Essence_Spent_Rate = 0
        for (const Skill in Pre_Sim_Node['skill_use_rate']) {
          if (
            Pre_Sim_Node['cross_skill_stat'][Skill]['resource_cost'] <
            0
          ) {
            Essence_Spent_Rate +=
              Pre_Sim_Node['skill_use_rate'][Skill] *
              Pre_Sim_Node['cross_skill_stat'][Skill]['resource_cost']
          }
        }
        const Rapid_Ossification_Rate = -Essence_Spent_Rate / 100
        const alpha =
          Cooldown_Total /
          (1 / Rapid_Ossification_Rate +
            0.5 * talentVal(nodes_map, 'rapid-ossification'))
        Cooldown_Total -=
          alpha * 0.5 * talentVal(nodes_map, 'rapid-ossification')
      }

      // ['abhorrent-decrepify', 1] Lucky Hit: Enemies hit while afflicted with Decrepify have up to a 20% chance to reduce your active Cooldowns by 1 second.
      if (
        talentVal(nodes_map, 'abhorrent-decrepify') > 0 &&
        allSkillsVal(nodes_map).has('decrepify')
      ) {
        const Active_Cooldown_Skills = new Set([
          'blood-mist',
          'bone-prison',
          'corpse-tendrils',
          'blood-wave',
          'army-of-the-dead',
          'bone-storm',
        ])
        let Abhorrent_Decrepify_Proc_Rate = 0
        for (const Skill in Pre_Sim_Node['skill_use_rate']) {
          Abhorrent_Decrepify_Proc_Rate +=
            0.2 *
            ProbabilityInCircle(0, 30, enemy_spread) *
            Pre_Sim_Node['skill_use_rate'][Skill] *
            Pre_Sim_Node['cross_skill_stat'][Skill]['total_hits'] *
            Pre_Sim_Node['cross_skill_stat'][Skill][
              'lucky_hit_chance'
            ]
        }
        if (
          Abhorrent_Decrepify_Proc_Rate > 0 &&
          Active_Cooldown_Skills.has(
            currentSkillVal(nodes_map)['name'],
          )
        ) {
          const alpha =
            Cooldown_Total / (1 / Abhorrent_Decrepify_Proc_Rate + 1)
          Cooldown_Total -= alpha * 1
        }
      }

      // Fastblood Aspect : Blood Orbs reduce your Ultimate Cooldown by {1-1.5} seconds.
      if (
        aspectVal(nodes_map, 'fastblood-aspect').length != 0 &&
        currentSkillVal(nodes_map)['category'] == 'ultimate'
      ) {
        const alpha =
          Cooldown_Total /
          (1 /
            (statVal(nodes_map, 'Blood_Orb_Pickup_Rate') + 0.0001) +
            aspectVal(nodes_map, 'fastblood-aspect')[0])
        Cooldown_Total -=
          alpha * aspectVal(nodes_map, 'fastblood-aspect')[0]
      }

      // Aspect of Explosive Mist : Blood Mist triggers Corpse Explosion on surrounding Corpses. When Blood Mist detonates a Corpse, its Cooldown is reduced by {.2/.5} seconds.
      if (
        aspectVal(nodes_map, 'aspect-of-explosive-mist').length !=
          0 &&
        currentSkillVal(nodes_map)['name'] == 'blood-mist'
      ) {
        // Assume we always blow up 3 corpses with blood-mist.
        Cooldown_Total -=
          aspectVal(nodes_map, 'aspect-of-explosive-mist')[0] * 3

        // Black River : Corpse Explosion consumes up to 4.0 additional Corpses around the initial Corpse, dealing x{122/130}% increased damage and with a {21/25}% larger radius per additional Corpse.
        if (aspectVal(nodes_map, 'black-river').length != 0) {
          //const Corpses_Between_Blood_Mist = (statVal(nodes_map, 'Corpse_Spawn_Rate') - statVal(nodes_map, 'Corpse_Consumption_Rate')) * Cooldown_Total
          Cooldown_Total -=
            aspectVal(nodes_map, 'aspect-of-explosive-mist')[0] * 3
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
          'reap',
          'decompose',
          'hemorrhage',
          'bone-splinters',
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

      // ['dreadful-bone-prison', 1], // Reduce your active cooldowns by 0.5 seconds for each enemy trapped by Bone Prison, up to 3 seconds.
      if (
        allSkillsVal(nodes_map).has('bone-prison') &&
        talentVal(nodes_map, 'dreadful-bone-prison') > 0
      ) {
        const Bone_Prison_Rate =
          1 / statVal(nodes_map, 'Bone_Prison_Cooldown')
        const Dreadful_Bone_Prison_CDR = Math.min(
          3,
          0.5 *
            (1 +
              ProbabilityInCircle(10, 10, enemy_spread) *
                (Number(toggleVal(nodes_map, 'number-of-enemies')) -
                  1)),
        )

        const alpha =
          Cooldown_Total /
          (1 / Bone_Prison_Rate + Dreadful_Bone_Prison_CDR)
        Cooldown_Total -= alpha * Dreadful_Bone_Prison_CDR
      }

      return Math.max(0, Cooldown_Total)
    }),

    Bone_Prison_Cooldown: new StatsNode(
      'Bone_Prison_Cooldown',
      () => {
        let Cooldown_Total = 18

        Cooldown_Total *=
          1 - 0.05 * (talentVal(nodes_map, 'bone-prison') - 1)

        // cooldown-reduction
        Cooldown_Total *=
          1 - aggregationVal(nodes_map, 'cooldown-reduction')

        const Pre_Sim_Node = necromancerPresimVal(nodes_map)
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

    Total_Movement_Speed: new StatsNode(
      'Total_Movement_Speed',
      () => {
        let Movement_Speed_Total =
          1 + aggregationVal(nodes_map, 'movement-speed')

        const Pre_Sim_Node = necromancerPresimVal(nodes_map)

        // 'movement-speed-for-seconds-after-killing-an-elite'

        // ['reapers-pursuit', 3] Damaging enemies with Darkness Skills increases your Movement Speed by {['5%', '10%', '15%',} for 3 seconds.
        if (talentVal(nodes_map, 'reapers-pursuit') > 0) {
          const Darkness_Skills = new Set([
            'reap',
            'decompose',
            'blight',
            'sever',
          ])
          let Darkness_Skill_Use_Rate = 0
          for (const Other_Skill in Pre_Sim_Node['skill_use_rate']) {
            if (Darkness_Skills.has(Other_Skill)) {
              if (Other_Skill == 'blight') {
                Darkness_Skill_Use_Rate +=
                  Pre_Sim_Node['skill_use_rate'][Other_Skill] * 6 // Blight lasts 6 seconds on the ground and assume it always refreshes reapers-pursuit
              } else {
                Darkness_Skill_Use_Rate +=
                  Pre_Sim_Node['skill_use_rate'][Other_Skill]
              }
            }
          }
          Movement_Speed_Total +=
            0.05 *
            talentVal(nodes_map, 'reapers-pursuit') *
            Math.min(1, Darkness_Skill_Use_Rate * 3)
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
            'reap',
            'decompose',
            'hemorrhage',
            'bone-splinters',
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
      let Number_Of_Cast = 1

      if (currentSkillVal(nodes_map)['name'] == 'blood-lance') {
        const Max_Essence = statVal(nodes_map, 'Max_Resource')
        const number_of_enemies = Number(
          toggleVal(nodes_map, 'number-of-enemies'),
        )
        const Lance_Cost = statVal(
          nodes_map,
          'Delta_Resources_Per_Cast',
        )

        if (Lance_Cost >= 0) {
          return number_of_enemies
        }
        Number_Of_Cast = Math.floor(-Max_Essence / Lance_Cost)
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
        case 'reap':
          base_cast_time = 0.66
          break
        case 'decompose':
          base_cast_time = 0.85
          break
        case 'bone-splinters':
          base_cast_time = 0.68
          break
        case 'hemmorhage':
          base_cast_time = 0.68
          break
        case 'blood-lance':
          base_cast_time = 0.65
          break
        case 'sever':
          base_cast_time = 0.73
          break
        case 'blight':
          base_cast_time = 0.7
          break
        case 'blood-surge':
          base_cast_time = 0.7
          break
        case 'bone-spear':
          base_cast_time = 0.65
          break
        case 'corpse-explosion':
          base_cast_time = 0.44
          break
        case 'bone-prison':
          base_cast_time = 0.64
          break
        case 'bone-storm':
          base_cast_time = 0.93
          break
        case 'iron-maiden':
          base_cast_time = 0.47
          break
        case 'blood-wave':
          base_cast_time = 0.7
          break
        case 'army-of-the-dead':
          base_cast_time = 0.8
          break
        case 'blood-mist':
          base_cast_time = 0
          break
        case 'corpse-tendrils':
          base_cast_time = 0.5
      }
      return Total_Attack_Speed == 0
        ? 0
        : base_cast_time / Total_Attack_Speed
    }),

    Elapsed_Time: new StatsNode('Elapsed_Time', () => {
      // // Blood mist lasts 3 seconds and you can't use other skills.
      // // Doesn't scale with attack speed.
      // if (
      //   currentSkillVal(nodes_map)['name'] ==
      //   'blood-mist'
      // ) {
      //   return 3
      // }
      return (
        statVal(nodes_map, 'Number_Of_Cast') *
        statVal(nodes_map, 'Cast_Time')
      )
    }),

    /*--------------------------------------------------
                      MINION NODES
      --------------------------------------------------*/
    Corpse_Spawn_Rate: new StatsNode('Corpse_Spawn_Rate', () => {
      const Pre_Sim_Node = necromancerPresimVal(nodes_map)
      let Corpse_Creation_Rate = 0

      for (const Skill in Pre_Sim_Node['skill_use_rate']) {
        Corpse_Creation_Rate +=
          Pre_Sim_Node['skill_use_rate'][Skill] *
          Pre_Sim_Node['cross_skill_stat'][Skill]['corpse_gain']
      }

      return Corpse_Creation_Rate
    }),

    Corpse_Gain: new StatsNode('Corpse_Gain', () => {
      const Pre_Sim_Node = necromancerPresimVal(nodes_map)
      const number_of_enemies = Number(
        toggleVal(nodes_map, 'number-of-enemies'),
      )
      const enemy_spread = Number(statVal(nodes_map, 'Enemy_Spread'))
      let Corpse_Gain = statVal(nodes_map, 'Enemies_Killed')
      const Army_Of_The_Dead_Size = 7

      switch (currentSkillVal(nodes_map)['name']) {
        // Reap: Sweep an ethereal scythe in front of you, dealing {['12%', '13%', '14%', '16%', '17%']} damage. Hitting an enemy with Reap increases your Damage Reduction by 15% for 2 seconds.
        case 'reap':
          // "acolytes-reap" Reap forms a Corpse under the first enemy hit. Can only occur every 4 seconds.
          if (
            talentVal(nodes_map, 'acolytes-reap') > 0 &&
            'reap' in Pre_Sim_Node['skill_use_rate']
          ) {
            if (Pre_Sim_Node['skill_use_rate']['reap'] <= 0.25) {
              Corpse_Gain += 1
            } else {
              Corpse_Gain +=
                0.25 / Pre_Sim_Node['skill_use_rate']['reap']
            }
          }
          break
        case 'decompose':
          Corpse_Gain += 0.5

          // Rotting Aspect : Decompose can chain up to 2.0 additional targets. When Decompose spawns a Corpse, it has a {50/100}% chance to spawn a Corpse under all afflicted targets.
          if (aspectVal(nodes_map, 'rotting-aspect').length != 0) {
            let Additional_Decompose_Chains = 0
            if (toggleVal(nodes_map, 'enemy-distant')) {
              Additional_Decompose_Chains = Math.min(
                2,
                ProbabilityInCircle(25, 20, enemy_spread) *
                  (number_of_enemies - 1),
              )
            } else {
              Additional_Decompose_Chains = Math.min(
                2,
                ProbabilityInCircle(15, 20, enemy_spread) *
                  (number_of_enemies - 1),
              )
            }
            Corpse_Gain +=
              0.5 *
              Math.min(1, aspectVal(nodes_map, 'rotting-aspect')[0]) *
              Additional_Decompose_Chains
          }
          break

        // Army of the Dead: Call forth the deep buried dead. Volatile Skeletons emerge over the next 7 seconds that explode when around enemies, dealing 30% damage.
        case 'army-of-the-dead':
          // 'prime-army-of-the-dead' When Army of the Dead‘s Volatile Skeletons explode, they have a 100% chance to leave behind a Corpse.
          Corpse_Gain += Army_Of_The_Dead_Size
          break
      }

      // 'ghastly-blood-mist' Blood Mist leaves behind a Corpse every 1 second.
      if (
        talentVal(nodes_map, 'ghastly-blood-mist') > 0 &&
        currentSkillVal(nodes_map)['name'] == 'blood-mist'
      ) {
        Corpse_Gain += 3
      }

      // 'hewed-flesh' Lucky Hit: Your damage has up to a {['4%', '8%', '12%',} chance to create a Corpse at the target‘s location.
      if (talentVal(nodes_map, 'hewed-flesh') > 0) {
        Corpse_Gain +=
          0.04 *
          talentVal(nodes_map, 'hewed-flesh') *
          statVal(nodes_map, 'Total_Lucky_Hit_Chance_Multiplier')
      }

      // Hulking Aspect : Your Golem has a {2-5}% chance to reduce its active Cooldown by 2.0 seconds and a {1-2.5}% chance to spawn a Corpse each time it damages an enemy with its normal attack.
      if (
        aspectVal(nodes_map, 'hulking-aspect').length != 0 &&
        allSkillsVal(nodes_map).has('golem')
      ) {
        Corpse_Gain +=
          aspectVal(nodes_map, 'hulking-aspect')[1] *
          (statVal(nodes_map, 'Cast_Time') /
            statVal(nodes_map, 'Golem_Attack_Speed')) *
          statVal(nodes_map, 'Golem_Hits') *
          statVal(nodes_map, 'Golem_Uptime')
      }

      // Bone Golem Perk 1 - Each time your Bone Golem takes up to 20% of its Maximum Life as damage, it sheds a Corpse
      if (
        allSkillsVal(nodes_map).has('golem') &&
        bookOfTheDeadVal(nodes_map, 'golem')[0] == 'bone' &&
        bookOfTheDeadVal(nodes_map, 'golem')[1] == 1
      ) {
        const Golem_Life_Decay =
          2.5 * statVal(nodes_map, 'Golem_Uptime')
        Corpse_Gain +=
          (20 / Golem_Life_Decay) * statVal(nodes_map, 'Cast_Time')
      }

      // Reapers Perk 2 - Reapers have a {15%} chance to carve the flesh off enemies, forming a Corpse.
      if (
        bookOfTheDeadVal(nodes_map, 'skeletal-warriors')[0] ==
          'reapers' &&
        bookOfTheDeadVal(nodes_map, 'skeletal-warriors')[1] == 2 &&
        statVal(nodes_map, 'Skeleton_Warrior_Uptime') != 0
      ) {
        Corpse_Gain +=
          0.15 *
          statVal(nodes_map, 'Skeleton_Warrior_Attack_Speed') *
          statVal(nodes_map, 'Skeleton_Warrior_Uptime') *
          statVal(nodes_map, 'Max_Number_Of_Skeleton_Warriors') *
          statVal(nodes_map, 'Cast_Time')
      }

      // Bone Mage Perk 2 - Each time a Bone Mage dies from its own attack, they leave behind a Corpse and Fortify you for {20%} of your Maximum Life.
      if (
        bookOfTheDeadVal(nodes_map, 'skeletal-mages')[0] == 'bone' &&
        bookOfTheDeadVal(nodes_map, 'skeletal-mages')[1] == 2
      ) {
        Corpse_Gain +=
          (statVal(nodes_map, 'Max_Number_Of_Skeleton_Mages') /
            statVal(nodes_map, 'Skeleton_Mage_Lifetime')) *
          statVal(nodes_map, 'Cast_Time')
      }

      return Corpse_Gain
    }),

    Corpse_Consumption_Rate: new StatsNode(
      'Corpse_Consumption_Rate',
      () => {
        let Corpse_Use_Rate = 0
        const Pre_Sim_Node = necromancerPresimVal(nodes_map)

        // if (aspectVal(nodes_map, 'aspect-of-explosive-mist').length != 0) {
        //   Corpse_Use_Rate += 3
        // }

        // if (aspectVal(nodes_map, 'osseous-gale-aspect').length != 0) {
        //   Corpse_Use_Rate += 8
        // }

        for (const Skill in Pre_Sim_Node['skill_use_rate']) {
          Corpse_Use_Rate +=
            Pre_Sim_Node['skill_use_rate'][Skill] *
            Pre_Sim_Node['cross_skill_stat'][Skill]['corpse_cost']
        }

        return Math.min(
          statVal(nodes_map, 'Corpse_Spawn_Rate'),
          Corpse_Use_Rate,
        )
      },
    ),

    Corpse_Cost: new StatsNode('Corpse_Cost', () => {
      let Corpse_Cost = 0

      switch (currentSkillVal(nodes_map)['name']) {
        case 'corpse-explosion':
          Corpse_Cost = 1

          // Black River : Corpse Explosion consumes up to 4.0 additional Corpses around the initial Corpse, dealing x{122/130}% increased damage and with a {21/25}% larger radius per additional Corpse.
          if (aspectVal(nodes_map, 'black-river').length != 0) {
            Corpse_Cost = 2
            //Corpse_Cost = -1
          }
          break

        case 'bone-storm':
          Corpse_Cost = 0
          // Osseous Gale Aspect : Bone Storm consumes up to 8 Corpses to increase its duration by up to {5/10} seconds.
          if (
            aspectVal(nodes_map, 'osseous-gale-aspect').length != 0
          ) {
            Corpse_Cost = -1
          }
          break

        case 'blood-mist':
          // Aspect of Explosive Mist : Blood Mist triggers Corpse Explosion on surrounding Corpses. When Blood Mist detonates a Corpse, its Cooldown is reduced by {.2/.5} seconds.
          if (
            aspectVal(nodes_map, 'aspect-of-explosive-mist').length !=
            0
          ) {
            Corpse_Cost = 3
          }
          break
      }

      return Corpse_Cost
    }),

    Minion_Attack_Speed_Bonus: new StatsNode(
      'Minion_Attack_Speed_Bonus',
      () => {
        const Pre_Sim_Node = necromancerPresimVal(nodes_map)

        let Minion_Attack_Speed_Multiplier =
          1 + 0.3 * statVal(nodes_map, 'Attack_Speed_Bonus')

        // 'minion-attack-speed'
        Minion_Attack_Speed_Multiplier += aggregationVal(
          nodes_map,
          'minion-attack-speed',
        )

        // ['inspiring-leader', 3] After you have been Healthy for at least 2 seconds, you and your Minions gain {['4%', '8%', '12%',} Attack Speed.
        if (
          talentVal(nodes_map, 'inspiring-leader') > 0 &&
          Number(toggleVal(nodes_map, 'percent-life')) >= 0.8
        ) {
          Minion_Attack_Speed_Multiplier +=
            0.04 * talentVal(nodes_map, 'inspiring-leader')
        }

        // bookOfTheDeadVal(nodes_map, 'golem')[0] == 'bone' &&
        // bookOfTheDeadVal(nodes_map, 'golem')[1] != 3 &&
        // ["kalan's-edict", 1] After you have not taken damage in the last 2 seconds, your Minions gain 15% Attack Speed. While you have at least 7 Minions, this bonus is doubled.
        // TODO: Some other builds might be able to trigger this.
        // golem-bone Active: Your Golem becomes Unstoppable and Taunts Nearby enemies and takes 30% reduced damage for the next 6 seconds
        if (
          talentVal(nodes_map, 'kalans-edict') > 0 &&
          statVal(nodes_map, 'Max_Number_Of_Minions') > 0
        ) {
          const Melee_Range_Skills = new Set([
            'reap',
            'blood-surge',
            'bone-storm',
          ])
          let Kalans_Edict_Bonus = 0.15
          let Average_Minion_Number = 0
          if (statVal(nodes_map, 'Max_Number_Of_Minions') >= 7) {
            if (statVal(nodes_map, 'Skeleton_Warrior_Uptime') != 0) {
              Average_Minion_Number +=
                statVal(nodes_map, 'Skeleton_Warrior_Uptime') *
                statVal(nodes_map, 'Max_Number_Of_Skeleton_Warriors')
            }
            if (statVal(nodes_map, 'Skeleton_Mage_Uptime') != 0) {
              Average_Minion_Number +=
                statVal(nodes_map, 'Skeleton_Mage_Uptime') *
                statVal(nodes_map, 'Max_Number_Of_Skeleton_Mages')
            }
            if (
              allSkillsVal(nodes_map).has('golem') &&
              statVal(nodes_map, 'Golem_Uptime') != 0
            ) {
              Average_Minion_Number += statVal(
                nodes_map,
                'Golem_Uptime',
              )
            }
            // const Bonus_Uptime =
            //   1 -
            //   BinomialDistribution(
            //     statVal(nodes_map, 'Max_Number_Of_Minions'),
            //     Average_Minion_Number,
            //     6,
            //   )

            Kalans_Edict_Bonus += 0.15
          }
          let Melee_Skill_Rate = 0
          let Total_Skill_Rate = 0.0000001
          for (const Skill in Pre_Sim_Node['skill_use_rate']) {
            if (Melee_Range_Skills.has(Skill)) {
              Melee_Skill_Rate +=
                Pre_Sim_Node['skill_use_rate'][Skill]
            }
            Total_Skill_Rate += Pre_Sim_Node['skill_use_rate'][Skill]
          }
          const Probability_Hit =
            (1 - Melee_Skill_Rate / Total_Skill_Rate) /
            Average_Minion_Number
          const Average_Time_Between_Hits =
            1 /
            (statVal(nodes_map, 'Enemy_Attacks_Per_Second') *
              Probability_Hit)
          if (Average_Time_Between_Hits >= 2) {
            Minion_Attack_Speed_Multiplier +=
              Kalans_Edict_Bonus *
              ((Average_Time_Between_Hits - 2) /
                Average_Time_Between_Hits)
          }
        }

        // Unyielding Commander's Aspect : While Army of the Dead is active, your Minions gain +{70/100}% Attack Speed and take 90% reduced damage.
        if (
          aspectVal(nodes_map, 'unyielding-commanders-aspect')
            .length != 0 &&
          allSkillsVal(nodes_map).has('army-of-the-dead')
        ) {
          const Army_of_the_Dead_Cooldown = skillVal(
            nodes_map,
            'army-of-the-dead',
          )['cooldown_seconds']
          const Army_of_the_Dead_Duration = 7

          Minion_Attack_Speed_Multiplier +=
            (Army_of_the_Dead_Duration / Army_of_the_Dead_Cooldown) *
            aspectVal(nodes_map, 'unyielding-commanders-aspect')[0]
        }

        return Minion_Attack_Speed_Multiplier
      },
    ),

    Minion_Damage_Reduction: new StatsNode(
      'Minion_Damage_Reduction',
      () => {
        let Damage_Reduction =
          1 - 0.3 * statVal(nodes_map, 'Player_Damage_Reduction')

        // Aspect of Hardened Bones : While you have 7.0 or more Minions, your Minions gain {15/20}% increased Damage Reduction.
        if (
          aspectVal(nodes_map, 'aspect-of-hardened-bones').length !=
            0 &&
          statVal(nodes_map, 'Max_Number_Of_Minions') >= 7
        ) {
          Damage_Reduction *=
            1 - aspectVal(nodes_map, 'aspect-of-hardened-bones')[0]
        }

        return 1 - Damage_Reduction
      },
    ),

    Max_Number_Of_Minions: new StatsNode(
      'Max_Number_Of_Minions',
      () => {
        let Max_Number_Of_Minions = 0

        Max_Number_Of_Minions += statVal(
          nodes_map,
          'Max_Number_Of_Skeleton_Warriors',
        )
        Max_Number_Of_Minions += statVal(
          nodes_map,
          'Max_Number_Of_Skeleton_Mages',
        )
        Max_Number_Of_Minions += statVal(
          nodes_map,
          'Max_Number_Of_Golems',
        )

        return Max_Number_Of_Minions
      },
    ),

    // -------------  Skeleton Warrior  ----------------
    Skeleton_Warrior_Damage: new StatsNode(
      'Skeleton_Warrior_Damage',
      () => {
        if (
          !allSkillsVal(nodes_map).has('raise-skeleton') ||
          bookOfTheDeadVal(nodes_map, 'skeletal-warriors')[1] == 3
        ) {
          return 0
        }

        const Weapon_Damage = statVal(
          nodes_map,
          'Total_Weapon_Damage',
        )

        let Minion_Modifier = 0
        switch (bookOfTheDeadVal(nodes_map, 'skeletal-warriors')[0]) {
          case 'skirmishers':
            Minion_Modifier = 0.14 * 1.3
            break
          case 'defender':
            Minion_Modifier = 0.14
            break
          case 'reapers':
            Minion_Modifier = 0.14 * 1.1
            // Reaper Perk 1 - Reaper attacks against enemies who are Immobilized, Slowed, Stunned, or Vulnerable reduce the cooldown of their powerful wind-up attack by {2} seconds.
            if (
              bookOfTheDeadVal(nodes_map, 'skeletal-warriors')[0] ==
                'reapers' &&
              bookOfTheDeadVal(nodes_map, 'skeletal-warriors')[1] ==
                1 &&
              (toggleVal(nodes_map, 'enemy-slowed') ||
                toggleVal(nodes_map, 'enemy-stunned') ||
                toggleVal(nodes_map, 'enemy-immobilized') ||
                toggleVal(nodes_map, 'enemy-vulnerable'))
            ) {
              Minion_Modifier = 0.14 * 1.2
            }

            break
        }

        const Damage_Multiplier = NecromancerDamageMultiplier(
          new Set(['physical', 'minion', 'skeleton-warrior']),
          nodes_map,
        )

        return Weapon_Damage * Minion_Modifier * Damage_Multiplier
      },
    ),

    Skeleton_Warrior_Attack_Speed: new StatsNode(
      'Skeleton_Warrior_Attack_Speed',
      () => {
        let Base_Attack_Rate = 0

        if (
          !allSkillsVal(nodes_map).has('raise-skeleton') ||
          bookOfTheDeadVal(nodes_map, 'skeletal-warriors')[1] == 3
        ) {
          return Base_Attack_Rate
        }

        switch (bookOfTheDeadVal(nodes_map, 'skeletal-warriors')[0]) {
          case 'skirmishers':
            Base_Attack_Rate = 1.25
            break
          case 'defender':
            Base_Attack_Rate = 1.25
            break
          case 'reapers':
            Base_Attack_Rate = 1.0
            break
        }

        Base_Attack_Rate *=
          1 +
          0.3 * (aggregationVal(nodes_map, 'weapon-attack-speed') - 1)

        let Minion_Attack_Speed_Multiplier =
          1 + statVal(nodes_map, 'Minion_Attack_Speed_Bonus')

        // Aspect of Frenzied Dead : Each time one of your Summoning Minions damages an enemy, they gain +{10/14}% Attack Speed for 3.0 seconds, up to +{30/42}%.
        if (
          aspectVal(nodes_map, 'aspect-of-frenzied-dead').length != 0
        ) {
          const Lifetime = statVal(
            nodes_map,
            'Skeleton_Warrior_Lifetime',
          )
          // ----- SEEMS BUGGED -----
          // let Time = 0
          // const Aspect_Bonus = aspectVal(
          //   nodes_map,
          //   'aspect-of-frenzied-dead',
          // )[0]
          // let Accumulated_Attack_Speed = 0
          // let Current_Bonus = 0
          // let Current_Attack_Speed =
          //   Attack_Rate * Minion_Attack_Speed_Multiplier
          // while (Time < Lifetime) {
          //   const dt = Math.min(
          //     1 / Current_Attack_Speed,
          //     Lifetime - Time,
          //   )
          //   Time += dt
          //   Accumulated_Attack_Speed += Current_Attack_Speed * dt
          //   Current_Bonus = Math.min(
          //     Current_Bonus + Aspect_Bonus,
          //     3 * Aspect_Bonus,
          //   )
          //   // Imperfect measure of the 3 second drop off but works for now.
          //   if (Math.floor(Time / Attack_Rate) % 3 == 0) {
          //     Current_Bonus -= Aspect_Bonus
          //   }
          //   Current_Attack_Speed =
          //     Attack_Rate *
          //     (Minion_Attack_Speed_Multiplier + Current_Bonus)
          // }
          // Attack_Rate = Accumulated_Attack_Speed / Lifetime

          const Max_Frenzied_Stacks_Time =
            3 / (Base_Attack_Rate * Minion_Attack_Speed_Multiplier)
          Minion_Attack_Speed_Multiplier +=
            ((Lifetime - Max_Frenzied_Stacks_Time) / Lifetime) *
              aspectVal(nodes_map, 'aspect-of-frenzied-dead')[1] +
            (Max_Frenzied_Stacks_Time / Lifetime) *
              aspectVal(nodes_map, 'aspect-of-frenzied-dead')[0] *
              1.5
        }

        return Base_Attack_Rate * Minion_Attack_Speed_Multiplier
      },
    ),

    Skeleton_Warrior_Hits: new StatsNode(
      'Skeleton_Warrior_Hits',
      () => {
        const number_of_enemies = Number(
          toggleVal(nodes_map, 'number-of-enemies'),
        )
        const enemy_spread = Number(
          statVal(nodes_map, 'Enemy_Spread'),
        )
        let Hits = 0
        if (
          !allSkillsVal(nodes_map).has('raise-skeleton') ||
          bookOfTheDeadVal(nodes_map, 'skeletal-warriors')[1] == 3
        ) {
          return Hits
        }

        switch (bookOfTheDeadVal(nodes_map, 'skeletal-warriors')[0]) {
          case 'skirmishers':
            Hits = 1.0
            break
          case 'defender':
            Hits = 1.0
            break
          case 'reapers':
            // Average enemy hits per attack. 1 / 10 attacks is single target
            Hits =
              (1 +
                ProbabilityInCone(10, 1 / 3, enemy_spread) *
                  (number_of_enemies - 1)) *
                0.9 +
              0.1

            // Reaper Perk 1 - Reaper attacks against enemies who are Immobilized, Slowed, Stunned, or Vulnerable reduce the cooldown of their powerful wind-up attack by {2} seconds.
            if (
              bookOfTheDeadVal(nodes_map, 'skeletal-warriors')[0] ==
                'reapers' &&
              bookOfTheDeadVal(nodes_map, 'skeletal-warriors')[1] ==
                1 &&
              (toggleVal(nodes_map, 'enemy-slowed') ||
                toggleVal(nodes_map, 'enemy-stunned') ||
                toggleVal(nodes_map, 'enemy-immobilized') ||
                toggleVal(nodes_map, 'enemy-vulnerable'))
            ) {
              Hits =
                (1 +
                  ProbabilityInCone(10, 1 / 3, enemy_spread) *
                    (number_of_enemies - 1)) *
                  0.8 +
                0.2
            }
            break
        }

        return Hits
      },
    ),

    Skeleton_Warrior_Life: new StatsNode(
      'Skeleton_Warrior_Damage',
      () => {
        let Skeletal_Warrior_Life = 1

        switch (bookOfTheDeadVal(nodes_map, 'skeletal-warriors')[0]) {
          case 'skirmishers':
            Skeletal_Warrior_Life *= 0.85
            break
          case 'defender':
            Skeletal_Warrior_Life *= 1.15
            break
          case 'reapers':
            Skeletal_Warrior_Life *= 1
            break
        }

        // 'skeletal-warrior-mastery' Increase the damage and Life of your Skeletal Warriors by {['15%', '30%', '45%',} .
        Skeletal_Warrior_Life *=
          1 + 0.15 * talentVal(nodes_map, 'skeletal-warrior-mastery')

        return Skeletal_Warrior_Life
      },
    ),

    Skeleton_Warrior_Armor: new StatsNode(
      'Skeleton_Warrior_Damage',
      () => {
        let Armor = statVal(nodes_map, 'Total_Strength')

        Armor += aggregationVal(nodes_map, 'armor')

        // total-armor
        let Armor_Multiplier =
          1 + aggregationVal(nodes_map, 'total-armor')

        // total-armor-while-golem-are-active (Necromancer Only)
        if (
          bookOfTheDeadVal(nodes_map, 'golem')[1] != 3 &&
          allSkillsVal(nodes_map).has('golem')
        ) {
          Armor_Multiplier += aggregationVal(
            nodes_map,
            'total-armor-while-golem-are-active',
          )
        }

        // skeletonwarrior-armor
        Armor_Multiplier += aggregationVal(
          nodes_map,
          'skeletonwarrior-armor',
        )

        // minion-armor
        Armor_Multiplier += aggregationVal(nodes_map, 'minion-armor')

        // 'warrior': Skeletal Warriors gain +30% increased Armor.
        if (paragonVal(nodes_map, 'warrior')) {
          Armor_Multiplier += 0.3
        }

        Armor *= Armor_Multiplier

        return Armor
      },
    ),

    Skeleton_Warrior_Damage_Reduction: new StatsNode(
      'Skeleton_Warrior_Damage_Reduction',
      () => {
        const Damage_Reduction = statVal(
          nodes_map,
          'Minion_Damage_Reduction',
        )

        return Damage_Reduction
      },
    ),

    Skeleton_Warrior_Resistance: new StatsNode(
      'Skeleton_Warrior_Resistance',
      () => {
        const Resistance =
          (statVal(nodes_map, 'Resistance_Cold') +
            statVal(nodes_map, 'Resistance_Fire') +
            statVal(nodes_map, 'Resistance_Lightning') +
            statVal(nodes_map, 'Resistance_Shadow') +
            statVal(nodes_map, 'Resistance_Poison')) /
          5

        return Resistance
      },
    ),

    Skeleton_Warrior_Thorns: new StatsNode(
      'Skeleton_Warrior_Thorns',
      () => {
        let Thorns_Multiplier = 0.3

        // Skeletal Defenders Perk 2: Increases the Amount of Thorns that Defender Warriors inherit from you from 30% to 50%
        if (
          bookOfTheDeadVal(nodes_map, 'skeletal-warriors')[0] ==
            'defenders' &&
          bookOfTheDeadVal(nodes_map, 'skeletal-warriors')[1] == 2
        ) {
          Thorns_Multiplier = 0.5
        }

        // 'skeletal-warriors-inherit-%-of-your-thorns'
        Thorns_Multiplier += aggregationVal(
          nodes_map,
          'minions-inherit-%-of-your-thorns',
        )

        const Thorns =
          statVal(nodes_map, 'Total_Thorns') * Thorns_Multiplier

        return Thorns
      },
    ),

    Skeleton_Warrior_Lifetime: new StatsNode(
      'Skeleton_Warrior_Lifetime',
      () => {
        // Assume a natural decay rate of 5% per second
        let Decay_Percentage_Rate = 10

        /* Raise Skeleton - Raise a Skeleton from a Corpse to fight for you.
        Once all of your Skeletons have been summoned, Raise Skeleton briefly summons a Skeletal Priest
        to empower your Minions for 5 seconds, increasing their damage by 20% and healing them for 10% of their Maximum Life*/
        let Skeleton_Priest_Healing = 10
        // Talent ['bonded-in-essence', 3] Every 8 seconds, your Skeletal Priest's Healing will Heal your skeletons for an additional {['20%', '40%', '60%',} of their Maximum Life.
        if (talentVal(nodes_map, 'bonded-in-essence') > 0) {
          Skeleton_Priest_Healing +=
            20 * talentVal(nodes_map, 'bonded-in-essence')
        }
        Decay_Percentage_Rate -= Skeleton_Priest_Healing / 8

        return 100 / Math.min(0.01, Decay_Percentage_Rate)
      },
    ),

    Skeleton_Warrior_Uptime: new StatsNode(
      'Skeleton_Warrior_Uptime',
      () => {
        let Uptime = 1

        if (
          bookOfTheDeadVal(nodes_map, 'skeletal-warriors')[1] == 3 ||
          !allSkillsVal(nodes_map).has('raise-skeleton')
        ) {
          Uptime = 0
        }

        if (!toggleVal(nodes_map, 'enemy-boss')) {
          Uptime = 1
        } else {
          Uptime = 1
        }

        // Talent ['bonded-in-essence', 3]: Every 8 seconds, your Skeletal Priest's Healing will Heal your skeletons for an additional {['20%', '40%', '60%',} of their Maximum Life.

        // Defenders Perk 1 - Every 6 seconds your Skeletal Defenders negate the next instance of Direct Damage they would take.
        if (
          bookOfTheDeadVal(nodes_map, 'skeletal-warriors')[0] ==
            'defenders' &&
          bookOfTheDeadVal(nodes_map, 'skeletal-warriors')[1] == 2
        ) {
          const Enemy_Attack_Rate = statVal(
            nodes_map,
            'Enemy_Attacks_Per_Second',
          )
          let Time_To_Proc_Defender = statVal(
            nodes_map,
            'Enemy_Attacks_Per_Second',
          )
          while (Time_To_Proc_Defender <= 6) {
            Time_To_Proc_Defender += Enemy_Attack_Rate
          }
          Uptime *= 1 + 1 / Time_To_Proc_Defender
        }

        return Math.max(1, Uptime)
      },
    ),

    Max_Number_Of_Skeleton_Warriors: new StatsNode(
      'Max_Number_Of_Skeleton_Warriors',
      () => {
        let Max_Number = 4

        // Blood Getter's Aspect : Your maximum number of Skeletal Warriors is increased by 2.
        if (
          aspectVal(nodes_map, 'blood-getters-aspect').length != 0
        ) {
          Max_Number += aspectVal(
            nodes_map,
            'blood-getters-aspect',
          )[0]
        }

        // Skirmisher Upgrade 1: You can raise 1 additional Skeleton Warrior
        if (
          bookOfTheDeadVal(nodes_map, 'skeletal-warriors')[0] ==
            'skirmishers' &&
          bookOfTheDeadVal(nodes_map, 'skeletal-warriors')[1] == 1
        ) {
          Max_Number += 1
        }

        if (
          bookOfTheDeadVal(nodes_map, 'skeletal-warriors')[1] == 3 ||
          !allSkillsVal(nodes_map).has('raise-skeleton')
        ) {
          Max_Number = 0
        }

        return Max_Number
      },
    ),

    // -------------  Skeleton Mage ----------------
    Skeleton_Mage_Damage: new StatsNode(
      'Skeleton_Mage_Damage',
      () => {
        if (
          !allSkillsVal(nodes_map).has('raise-skeleton') ||
          bookOfTheDeadVal(nodes_map, 'skeletal-mages')[1] == 3
        ) {
          return 0
        }

        // Shadow Mage: 46.4% damage
        // Cold Mage: 46.4% damage
        // Bone Mage: 68.1% damage
        let Minion_Modifier = 0
        let Damage_Multiplier = 1
        switch (bookOfTheDeadVal(nodes_map, 'skeletal-mages')[0]) {
          case 'cold':
            Minion_Modifier = 0.464
            Damage_Multiplier = NecromancerDamageMultiplier(
              new Set(['cold', 'minion', 'skeleton-mage']),
              nodes_map,
            )
            break
          case 'shadow':
            Minion_Modifier = 0.464
            Damage_Multiplier = NecromancerDamageMultiplier(
              new Set(['shadow', 'minion', 'skeleton-mage']),
              nodes_map,
            )
            break
          case 'bone':
            Minion_Modifier = 0.681
            Damage_Multiplier = NecromancerDamageMultiplier(
              new Set(['physical', 'minion', 'skeleton-mage']),
              nodes_map,
            )
            break
        }

        const Weapon_Damage = statVal(
          nodes_map,
          'Total_Weapon_Damage',
        )
        const number_of_enemies = Number(
          toggleVal(nodes_map, 'number-of-enemies'),
        )

        // Bone Mage Perk 1 - Reduce the Life cost of your Bone Mages' attacks from {15%} to {10%}. After being alive for {5} seconds, Bone Mages deal {40%} increased damage.
        if (
          bookOfTheDeadVal(nodes_map, 'skeletal-mages')[0] ==
            'bone' &&
          bookOfTheDeadVal(nodes_map, 'skeletal-mages')[1] == 1
        ) {
          Damage_Multiplier *=
            1 +
            0.4 *
              Math.max(
                0,
                (statVal(nodes_map, 'Skeleton_Mage_Lifetime') - 5) /
                  statVal(nodes_map, 'Skeleton_Mage_Lifetime'),
              )
        }

        // Coldbringer's Aspect : Every 8 seconds, your Skeletal Mages cast a blizzard that deals {Flat Value} Cold damage and continuously Chills enemies for 8% over 6.0 seconds.
        let Coldbringer_Damage = 0
        if (aspectVal(nodes_map, 'coldbringers-aspect').length != 0) {
          const Coldbringer_Blizzard_Hits =
            ProbabilityInCircle(
              15,
              15,
              statVal(nodes_map, 'Enemy_Spread'),
            ) * number_of_enemies
          Minion_Modifier *= 8 / 9 // Assuming 1.0s Blizzard Cast Time and it takes away from Auto Attack Uptime
          Coldbringer_Damage =
            (1 / 9) *
            aspectVal(nodes_map, 'coldbringers-aspect')[0] *
            Coldbringer_Blizzard_Hits *
            NecromancerDamageMultiplier(
              new Set(['cold', 'minion', 'skeleton-mage']),
              nodes_map,
            )
        }

        return (
          (Weapon_Damage * Minion_Modifier + Coldbringer_Damage) *
          Damage_Multiplier
        )
      },
    ),

    Skeleton_Mage_Attack_Speed: new StatsNode(
      'Skeleton_Mage_Attack_Speed',
      () => {
        let Base_Attack_Rate = 0

        if (
          !allSkillsVal(nodes_map).has('raise-skeleton') ||
          bookOfTheDeadVal(nodes_map, 'skeletal-mages')[1] == 3
        ) {
          return Base_Attack_Rate
        }

        switch (bookOfTheDeadVal(nodes_map, 'skeletal-mages')[0]) {
          case 'shadow':
            Base_Attack_Rate = 1 / 1.3
            break
          case 'cold':
            Base_Attack_Rate = 1 / 1.3
            break
          case 'bone':
            Base_Attack_Rate = 1 / 1.5
            break
        }

        // Weapon Attack Speed Adjustment
        Base_Attack_Rate *=
          1 +
          0.3 * (aggregationVal(nodes_map, 'weapon-attack-speed') - 1)

        let Minion_Attack_Speed_Multiplier =
          1 + statVal(nodes_map, 'Minion_Attack_Speed_Bonus')

        // Aspect of Frenzied Dead : Each time one of your Summoning Minions damages an enemy, they gain +{10/14}% Attack Speed for 3.0 seconds, up to +{30/42}%.
        if (
          aspectVal(nodes_map, 'aspect-of-frenzied-dead').length != 0
        ) {
          // const Lifetime = statVal(
          //   nodes_map,
          //   'Skeleton_Mage_Lifetime',
          // )

          // TODO: Was causing an infinite loop with Skeleton_Mage_Lifetime. Find a way to get around the loop using the presim.
          const Lifetime = 10
          //   let Time = 0
          //   const Aspect_Bonus = aspectVal(
          //     nodes_map,
          //     'aspect-of-frenzied-dead',
          //   )[0]
          //   let Accumulated_Attack_Speed = 0
          //   let Current_Bonus = 0
          //   let Current_Attack_Speed =
          //     Attack_Rate * Minion_Attack_Speed_Multiplier
          //   while (Time < Lifetime) {
          //     const dt = Math.min(
          //       1 / Current_Attack_Speed,
          //       Lifetime - Time,
          //     )
          //     Time += dt
          //     Accumulated_Attack_Speed += Current_Attack_Speed * dt
          //     Current_Bonus = Math.min(
          //       Current_Bonus + Aspect_Bonus,
          //       3 * Aspect_Bonus,
          //     )
          //     // Imperfect measure of the 3 second drop off but works for now.
          //     if (Math.floor(Time / Attack_Rate) % 3 == 0) {
          //       Current_Bonus -= Aspect_Bonus
          //     }
          //     Current_Attack_Speed =
          //       Attack_Rate *
          //       (Minion_Attack_Speed_Multiplier + Current_Bonus)
          //   }
          //   Attack_Rate = Accumulated_Attack_Speed / Lifetime
          // }

          const Max_Frenzied_Stacks_Time =
            3 / (Base_Attack_Rate * Minion_Attack_Speed_Multiplier)
          Minion_Attack_Speed_Multiplier +=
            ((Lifetime - Max_Frenzied_Stacks_Time) / Lifetime) *
              aspectVal(nodes_map, 'aspect-of-frenzied-dead')[1] +
            (Max_Frenzied_Stacks_Time / Lifetime) *
              aspectVal(nodes_map, 'aspect-of-frenzied-dead')[0] *
              1.5
        }

        return Base_Attack_Rate * Minion_Attack_Speed_Multiplier
      },
    ),

    Skeleton_Mage_Hits: new StatsNode('Skeleton_Mage_Hits', () => {
      let Hits = 0
      const number_of_enemies = Number(
        toggleVal(nodes_map, 'number-of-enemies'),
      )
      const enemy_spread = Number(statVal(nodes_map, 'Enemy_Spread'))
      const Enemy_Distance = toggleVal(nodes_map, 'enemy-distant')
        ? 25
        : 0
      if (
        !allSkillsVal(nodes_map).has('raise-skeleton') ||
        bookOfTheDeadVal(nodes_map, 'skeletal-mages')[1] == 3
      ) {
        return Hits
      }

      switch (bookOfTheDeadVal(nodes_map, 'skeletal-mages')[0]) {
        case 'shadow':
          Hits = 1.0
          break
        case 'cold':
          Hits = 1.0
          break
        case 'bone':
          Hits = 1.0
          break
      }

      // Shadow Skeleton Book of the Dead Perk 2 - Fire an additional shadow bolt every 4th attack.
      if (
        bookOfTheDeadVal(nodes_map, 'skeletal-mages')[0] ==
          'shadow' &&
        bookOfTheDeadVal(nodes_map, 'skeletal-mages')[1] == 2
      ) {
        Hits = 1.25
      }

      return Hits
    }),

    Skeleton_Mage_Life: new StatsNode('Skeleton_Mage_Life', () => {
      let Skeletal_Mage_Life = 1

      // maximum-minion-life

      // 'skeletal-mage-mastery' Increase the damage and Life of your Skeletal Mages by 20% .
      Skeletal_Mage_Life *=
        1 + 0.2 * talentVal(nodes_map, 'skeletal-mage-mastery')

      return Skeletal_Mage_Life
    }),

    Skeleton_Mage_Armor: new StatsNode('Skeleton_Mage_Armor', () => {
      let Armor = statVal(nodes_map, 'Total_Strength')

      Armor += aggregationVal(nodes_map, 'armor')

      // total-armor
      let Armor_Multiplier =
        1 + aggregationVal(nodes_map, 'total-armor')

      // total-armor-while-golem-are-active (Necromancer Only)
      if (
        bookOfTheDeadVal(nodes_map, 'golem')[1] != 3 &&
        allSkillsVal(nodes_map).has('golem')
      ) {
        Armor_Multiplier += aggregationVal(
          nodes_map,
          'total-armor-while-golem-are-active',
        )
      }

      // minion-armor
      Armor_Multiplier += aggregationVal(nodes_map, 'minion-armor')

      Armor *= Armor_Multiplier

      return Armor
    }),

    Skeleton_Mage_Damage_Reduction: new StatsNode(
      'Skeleton_Mage_Damage_Reduction',
      () => {
        const Damage_Reduction = statVal(
          nodes_map,
          'Minion_Damage_Reduction',
        )

        return Damage_Reduction
      },
    ),

    Skeleton_Mage_Thorns: new StatsNode(
      'Skeleton_Mage_Thorns',
      () => {
        let Thorns_Multiplier = 0.3

        // 'skeletal-mages-inherit-%-of-your-thorns'
        Thorns_Multiplier += aggregationVal(
          nodes_map,
          'minions-inherit-%-of-your-thorns',
        )

        const Thorns =
          statVal(nodes_map, 'Total_Thorns') * Thorns_Multiplier

        return Thorns
      },
    ),

    Skeleton_Mage_Effective_Life: new StatsNode(
      'Skeleton_Mage_Effective_Life',
      () => {
        // damage-reduction-for-your-minions

        return 1
      },
    ),

    Skeleton_Mage_Lifetime: new StatsNode(
      'Skeleton_Mage_Lifetime',
      () => {
        // Assume a natural decay rate of 5% per second
        let Decay_Percentage_Rate = 5

        /* Raise Skeleton - Raise a Skeleton from a Corpse to fight for you.
        Once all of your Skeletons have been summoned, Raise Skeleton briefly summons a Skeletal Priest
        to empower your Minions for 5 seconds, increasing their damage by 20% and healing them for 10% of their Maximum Life*/
        let Skeleton_Priest_Healing = 10
        // Talent ['bonded-in-essence', 3] Every 8 seconds, your Skeletal Priest's Healing will Heal your skeletons for an additional {['20%', '40%', '60%',} of their Maximum Life.
        if (talentVal(nodes_map, 'bonded-in-essence') > 0) {
          Skeleton_Priest_Healing +=
            20 * talentVal(nodes_map, 'bonded-in-essence')
        }
        Decay_Percentage_Rate -= Skeleton_Priest_Healing / 8

        // Bone Skeleton Passive: Bone Mages use their own bodies as projectiles, dealing heavy damage at the cost of {15%} their own Life.
        if (
          bookOfTheDeadVal(nodes_map, 'skeletal-mages')[0] ==
            'bone' &&
          bookOfTheDeadVal(nodes_map, 'skeletal-mages')[1] != 1
        ) {
          Decay_Percentage_Rate =
            5 +
            15 *
              (1 / statVal(nodes_map, 'Skeleton_Mage_Attack_Speed'))
        }
        // Bone Mage Perk 1 - Reduce the Life cost of your Bone Mages' attacks from {15%} to {10%}. After being alive for {5} seconds, Bone Mages deal {40%} increased damage.
        else if (
          bookOfTheDeadVal(nodes_map, 'skeletal-mages')[0] ==
            'bone' &&
          bookOfTheDeadVal(nodes_map, 'skeletal-mages')[1] == 1
        ) {
          Decay_Percentage_Rate =
            5 +
            10 *
              (1 / statVal(nodes_map, 'Skeleton_Mage_Attack_Speed'))
        }

        return 100 / Math.min(0.01, Decay_Percentage_Rate)
      },
    ),

    Skeleton_Mage_Resistance: new StatsNode(
      'Skeleton_Mage_Resistance',
      () => {
        let Resistance =
          (statVal(nodes_map, 'Resistance_Cold') +
            statVal(nodes_map, 'Resistance_Fire') +
            statVal(nodes_map, 'Resistance_Lightning') +
            statVal(nodes_map, 'Resistance_Shadow') +
            statVal(nodes_map, 'Resistance_Poison')) /
          5

        // Skeletal Mages gain 35% increased Resistance to All Elements.
        if (paragonVal(nodes_map, 'mage')) {
          Resistance += 35
        }

        return Resistance
      },
    ),

    Skeleton_Mage_Uptime: new StatsNode(
      'Skeleton_Mage_Uptime',
      () => {
        let Uptime = 1

        if (
          bookOfTheDeadVal(nodes_map, 'skeletal-mages')[1] == 3 ||
          !allSkillsVal(nodes_map).has('raise-skeleton')
        ) {
          Uptime = 0
        }

        // skeletal-mages-bone: Bone Mages use their own bodies as projectiles, dealing heavy damage at the cost of {15%} their own Life.

        return Uptime
      },
    ),

    Max_Number_Of_Skeleton_Mages: new StatsNode(
      'Max_Number_Of_Skeleton_Mages',
      () => {
        let Max_Number = 3

        // Viscous Aspect : Your maximum number of Skeletal Mages is increased by 2.
        if (aspectVal(nodes_map, 'viscous-aspect').length != 0) {
          Max_Number += aspectVal(nodes_map, 'viscous-aspect')[0]
        }

        if (
          bookOfTheDeadVal(nodes_map, 'skeletal-mages')[1] == 3 ||
          !allSkillsVal(nodes_map).has('raise-skeleton')
        ) {
          Max_Number = 0
        }
        return Max_Number
      },
    ),

    // -------------  Golem  ----------------
    Golem_Damage: new StatsNode('Golem_Damage', () => {
      let Minion_Modifier = 0

      switch (bookOfTheDeadVal(nodes_map, 'golem')[0]) {
        case 'bone':
          Minion_Modifier = 0.56
          break
        case 'blood':
          Minion_Modifier = 0.56
          break
        case 'iron':
          Minion_Modifier = 0.56

          // Iron Book of the Dead 1: Every 4th Iron Golem Attack causes a shockwave, dealing 40% Damage to the primary enemy and to enemies behind them
          if (bookOfTheDeadVal(nodes_map, 'golem')[1] == 1) {
            Minion_Modifier = 0.75 * 0.28 + 0.25 * 0.4
          }
          break
      }

      const Weapon_Damage = statVal(nodes_map, 'Total_Weapon_Damage')

      const Damage_Multiplier = NecromancerDamageMultiplier(
        new Set(['physical', 'minion', 'golem']),
        nodes_map,
      )

      return Weapon_Damage * Minion_Modifier * Damage_Multiplier
    }),

    Golem_Attack_Speed: new StatsNode('Golem_Attack_Speed', () => {
      let Base_Attack_Rate = 0

      if (
        !allSkillsVal(nodes_map).has('golem') ||
        bookOfTheDeadVal(nodes_map, 'golem')[1] == 3
      ) {
        return Base_Attack_Rate
      }

      switch (bookOfTheDeadVal(nodes_map, 'golem')[0]) {
        case 'bone':
          Base_Attack_Rate = 1 / 1.75
          break
        case 'blood':
          Base_Attack_Rate = 1 / 1.25
          break
        case 'iron':
          Base_Attack_Rate = 1 / 1.5
          break
      }

      Base_Attack_Rate *=
        1 +
        0.3 * (aggregationVal(nodes_map, 'weapon-attack-speed') - 1)

      // 'golem-attack-speed
      let Golem_Attack_Speed_Multiplier =
        1 +
        statVal(nodes_map, 'Minion_Attack_Speed_Bonus') +
        aggregationVal(nodes_map, 'golem-attack-speed')

      // Aspect of Frenzied Dead : Each time one of your Summoning Minions damages an enemy, they gain +{10/14}% Attack Speed for 3.0 seconds, up to +{30/42}%.
      if (
        aspectVal(nodes_map, 'aspect-of-frenzied-dead').length != 0
      ) {
        const Lifetime = statVal(
          nodes_map,
          'Skeleton_Warrior_Lifetime',
        )
        // let Time = 0
        // const Aspect_Bonus = aspectVal(
        //   nodes_map,
        //   'aspect-of-frenzied-dead',
        // )[0]
        // let Accumulated_Attack_Speed = 0
        // let Current_Bonus = 0
        // let Current_Attack_Speed =
        //   Attack_Rate * Golem_Attack_Speed_Multiplier
        // while (Time < Lifetime) {
        //   const dt = Math.min(
        //     1 / Current_Attack_Speed,
        //     Lifetime - Time,
        //   )
        //   Time += dt
        //   Accumulated_Attack_Speed += Current_Attack_Speed * dt
        //   Current_Bonus = Math.min(
        //     Current_Bonus + Aspect_Bonus,
        //     3 * Aspect_Bonus,
        //   )
        //   // Imperfect measure of the 3 second drop off but works for now.
        //   if (Math.floor(Time / Attack_Rate) % 3 == 0) {
        //     Current_Bonus -= Aspect_Bonus
        //   }
        //   Current_Attack_Speed =
        //     Attack_Rate *
        //     (Golem_Attack_Speed_Multiplier + Current_Bonus)
        // }
        // Attack_Rate = Accumulated_Attack_Speed / Lifetime

        const Max_Frenzied_Stacks_Time =
          3 / (Base_Attack_Rate * Golem_Attack_Speed_Multiplier)
        Golem_Attack_Speed_Multiplier +=
          ((Lifetime - Max_Frenzied_Stacks_Time) / Lifetime) *
            aspectVal(nodes_map, 'aspect-of-frenzied-dead')[1] +
          (Max_Frenzied_Stacks_Time / Lifetime) *
            aspectVal(nodes_map, 'aspect-of-frenzied-dead')[0] *
            1.5
      }

      return Base_Attack_Rate * Golem_Attack_Speed_Multiplier
    }),

    Golem_Hits: new StatsNode('Golem_Hits', () => {
      const number_of_enemies = Number(
        toggleVal(nodes_map, 'number-of-enemies'),
      )
      let Hits = 0
      if (
        !allSkillsVal(nodes_map).has('golem') ||
        bookOfTheDeadVal(nodes_map, 'golem')[1] == 3
      ) {
        return Hits
      }

      switch (bookOfTheDeadVal(nodes_map, 'golem')[0]) {
        case 'bone':
          Hits = 2.0
          Hits *=
            1 +
            ProbabilityInCone(
              10,
              1 / 3,
              statVal(nodes_map, 'Enemy_Spread'),
            ) *
              (number_of_enemies - 1)
          break
        case 'blood':
          Hits =
            1 +
            ProbabilityInCircle(
              10,
              5,
              statVal(nodes_map, 'Enemy_Spread'),
            ) *
              (number_of_enemies - 1)
          break
        case 'iron':
          // Iron Book of the Dead 1: Every 4th Iron Golem Attack causes a shockwave, dealing 40% Damage to the primary enemy and to enemies behind them
          if (bookOfTheDeadVal(nodes_map, 'golem')[1] == 1) {
            Hits =
              0.75 *
                (1 +
                  ProbabilityInCircle(
                    10,
                    5,
                    statVal(nodes_map, 'Enemy_Spread'),
                  ) *
                    (number_of_enemies - 1)) +
              0.25 *
                (1 +
                  ProbabilityInCone(
                    15,
                    1 / 4,
                    statVal(nodes_map, 'Enemy_Spread'),
                  ) *
                    (number_of_enemies - 1))
          }
          break
      }

      return Hits
    }),

    Golem_Life: new StatsNode('Golem_Life', () => {
      let Golem_Max_Life =
        1.57 * baseStatVal(nodes_map)['BaseMaxLife']
      // golem-maximum-life
      // maximum-minion-life

      // 'golem-mastery' Increase the damage and Life of your Golem by 25%.
      Golem_Max_Life *=
        1 + 0.25 * talentVal(nodes_map, 'golem-mastery')

      // 'hulking-monstrosity'  Your Golem has x40% increased Maximum Life and deals x40% increased damage.
      Golem_Max_Life *=
        1 + 0.4 * Number(paragonVal(nodes_map, 'hulking-monstrosity'))

      // Bone Golem Perk 2 - Your Bone Golem gains 10% Maximum Life and the amount of Thorns they inherit from you is increased from 30% to 50%.
      if (
        bookOfTheDeadVal(nodes_map, 'golem')[0] == 'bone' &&
        bookOfTheDeadVal(nodes_map, 'golem')[1] == 2
      ) {
        Golem_Max_Life *= 1.1
      }

      // Golem: Golems gain x25% increased Maximum Life.
      if (paragonVal(nodes_map, 'golem')) {
        Golem_Max_Life *= 1.25
      }

      return Golem_Max_Life
    }),

    Golem_Armor: new StatsNode('Golem_Armor', () => {
      let Armor = statVal(nodes_map, 'Total_Strength')

      Armor += aggregationVal(nodes_map, 'armor')

      // total-armor
      let Armor_Multiplier =
        1 + aggregationVal(nodes_map, 'total-armor')

      // total-armor-while-golem-are-active (Necromancer Only)
      if (
        bookOfTheDeadVal(nodes_map, 'golem')[1] != 3 &&
        allSkillsVal(nodes_map).has('golem')
      ) {
        Armor_Multiplier += aggregationVal(
          nodes_map,
          'total-armor-while-golem-are-active',
        )
      }

      // golem-armor
      Armor_Multiplier += aggregationVal(nodes_map, 'golem-armor')

      // minion-armor
      Armor_Multiplier += aggregationVal(nodes_map, 'minion-armor')

      Armor *= Armor_Multiplier

      return Armor
    }),

    Golem_Damage_Reduction: new StatsNode(
      'Golem_Damage_Reduction',
      () => {
        let Damage_Reduction = statVal(
          nodes_map,
          'Minion_Damage_Reduction',
        )

        // Blood Golem Perk 2 - While Healthy (the golem), your Blood Golem gains 25% Damage Reduction and x50% increased damage.
        if (
          bookOfTheDeadVal(nodes_map, 'golem')[0] == 'blood' &&
          bookOfTheDeadVal(nodes_map, 'golem')[1] == 2 &&
          Number(toggleVal(nodes_map, 'percent-life')) >= 0.8
        ) {
          Damage_Reduction *= 1 - 0.25
        }

        // golem-bone Active: Your Golem becomes Unstoppable and Taunts Nearby enemies and takes 30% reduced damage for the next 6 seconds
        if (
          bookOfTheDeadVal(nodes_map, 'golem')[0] == 'bone' &&
          bookOfTheDeadVal(nodes_map, 'golem')[1] != 3
        ) {
          Damage_Reduction *=
            1 -
            0.3 *
              Math.min(
                1,
                6 / statVal(nodes_map, 'Golem_Active_Cooldown'),
              )
        }

        return 1 - Damage_Reduction
      },
    ),

    Golem_Resistance: new StatsNode('Golem_Resistance', () => {
      let Resistance =
        (statVal(nodes_map, 'Resistance_Cold') +
          statVal(nodes_map, 'Resistance_Fire') +
          statVal(nodes_map, 'Resistance_Lightning') +
          statVal(nodes_map, 'Resistance_Shadow') +
          statVal(nodes_map, 'Resistance_Poison')) /
        5

      Resistance = Resistance / 0.6

      // 'golem-resistance-to-all-elements'
      Resistance *=
        1 -
        (1 - Resistance) *
          (1 -
            aggregationVal(
              nodes_map,
              'golem-resistance-to-all-elements',
            ))

      return Resistance * 0.6
    }),

    Golem_Thorns: new StatsNode('Golem_Thorns', () => {
      let Thorns_Multiplier = 0.3

      // Bone Golem Perk 2 - Your Bone Golem gains 10% Maximum Life and the amount of Thorns they inherit from you is increased from 30% to 50%.
      if (
        bookOfTheDeadVal(nodes_map, 'golem')[0] == 'bone' &&
        bookOfTheDeadVal(nodes_map, 'golem')[1] == 2
      ) {
        Thorns_Multiplier += 0.2
      }

      // 'golem-inherit-%-of-your-thorns'
      Thorns_Multiplier += aggregationVal(
        nodes_map,
        'minions-inherit-%-of-your-thorns',
      )

      const Thorns =
        statVal(nodes_map, 'Total_Thorns') * Thorns_Multiplier

      return Thorns
    }),

    Golem_Effective_Life: new StatsNode(
      'Golem_Effective_Life',
      () => {
        // damage-reduction-for-your-minions

        return 1
      },
    ),

    Golem_Lifetime: new StatsNode('Skeleton_Warrior_Lifetime', () => {
      const Lifetime = 300

      return Lifetime
    }),

    Golem_Uptime: new StatsNode('Golem_Uptime', () => {
      let Uptime = 1

      if (
        bookOfTheDeadVal(nodes_map, 'golem')[1] == 3 ||
        !allSkillsVal(nodes_map).has('golem')
      ) {
        Uptime = 0
      }

      return Uptime
    }),

    Max_Number_Of_Golems: new StatsNode(
      'Max_Number_Of_Golems',
      () => {
        let Max_Number = 1

        if (
          bookOfTheDeadVal(nodes_map, 'golem')[1] == 3 ||
          !allSkillsVal(nodes_map).has('golem')
        ) {
          Max_Number = 0
        }

        return Max_Number
      },
    ),

    Golem_Active_Cooldown: new StatsNode(
      'Golem_Active_Cooldown',
      () => {
        let Golem_Active_Cooldown = 16

        // Hulking Aspect : Your Golem has a {2-5}% chance to reduce its active Cooldown by 2.0 seconds and a {1-2.5}% chance to spawn a Corpse each time it damages an enemy with its normal attack.
        if (
          aspectVal(nodes_map, 'hulking-aspect').length != 0 &&
          allSkillsVal(nodes_map).has('golem')
        ) {
          const alpha =
            Golem_Active_Cooldown /
            (1 /
              (statVal(nodes_map, 'Golem_Attack_Speed') *
                aspectVal(nodes_map, 'hulking-aspect')[0] *
                statVal(nodes_map, 'Golem_Hits')) +
              2)
          Golem_Active_Cooldown -= alpha * 2
        }

        return Math.max(1, Golem_Active_Cooldown)
      },
    ),

    Golem_Active_DPS: new StatsNode(
      'Golem_Active_Damage_Per_Second',
      () => {
        const number_of_enemies = Number(
          toggleVal(nodes_map, 'number-of-enemies'),
        )
        const Golem_Active_Cooldown = statVal(
          nodes_map,
          'Golem_Active_Cooldown',
        )
        const Weapon_Damage = statVal(
          nodes_map,
          'Total_Weapon_Damage',
        )
        const Damage_Multiplier = NecromancerDamageMultiplier(
          new Set(['physical', 'minion', 'golem']),
          nodes_map,
        )

        let Golem_Active_Hits_Multiplier = 0
        // Blood Golem Active Cooldown: Drains Life for 140% damage from nearby enemies to heal and bolster itself.
        if (bookOfTheDeadVal(nodes_map, 'golem')[0] == 'blood') {
          Golem_Active_Hits_Multiplier =
            1.4 *
            (1 +
              ProbabilityInCircle(
                10,
                10,
                statVal(nodes_map, 'Enemy_Spread'),
              ) *
                (number_of_enemies - 1))
        }

        if (bookOfTheDeadVal(nodes_map, 'golem')[0] == 'iron') {
          // Iron Golem Active Cooldown: An amalgamation of steel that slams the ground for 200% damage and Stuns enemies.
          Golem_Active_Hits_Multiplier =
            2 *
            (1 +
              ProbabilityInCircle(
                10,
                10,
                statVal(nodes_map, 'Enemy_Spread'),
              ) *
                (number_of_enemies - 1))
        }

        return (
          (Weapon_Damage *
            Damage_Multiplier *
            Golem_Active_Hits_Multiplier) /
          Golem_Active_Cooldown
        )
      },
    ),

    Ring_Of_Mendeln_DPS: new StatsNode('Ring_Of_Mendeln_DPS', () => {
      let Ring_Of_Mendeln_DPS = 0
      // Ring of Mendeln :
      //• Lucky Hit: Up to a 10.0% chance to empower all of your Minions, causing the next attack from each to explode for {1500/2000} Physical damage.
      if (aspectVal(nodes_map, 'ring-of-mendeln').length != 0) {
        const Pre_Sim_Node = necromancerPresimVal(nodes_map)
        const number_of_enemies = Number(
          toggleVal(nodes_map, 'number-of-enemies'),
        )

        const Ring_Of_Mendeln_Damage = aspectVal(
          nodes_map,
          'ring-of-mendeln',
        )[0]
        const Ring_Of_Mendeln_AOE =
          1 +
          ProbabilityInCircle(
            5,
            10,
            statVal(nodes_map, 'Enemy_Spread'),
          ) *
            (number_of_enemies - 1)
        // const Proc_Rate =
        //   0.1 *
        //   Skill_Lucky_Hit_Chance *
        //   statVal(nodes_map, 'Total_Hits') *
        //   statVal(nodes_map, 'Total_Attack_Speed')
        let Ring_Of_Mendeln_Proc_Rate = 0
        for (const Skill in Pre_Sim_Node['skill_use_rate']) {
          Ring_Of_Mendeln_Proc_Rate +=
            0.1 *
            Pre_Sim_Node['skill_use_rate'][Skill] *
            Pre_Sim_Node['cross_skill_stat'][Skill]['total_hits'] *
            Pre_Sim_Node['cross_skill_stat'][Skill][
              'lucky_hit_chance'
            ]
        }
        const Skeleton_Warrior_Proc_Rate = Math.min(
          Ring_Of_Mendeln_Proc_Rate,
          statVal(nodes_map, 'Skeleton_Warrior_Attack_Speed'),
        )
        const Skeleton_Mage_Proc_Rate = Math.min(
          Ring_Of_Mendeln_Proc_Rate,
          statVal(nodes_map, 'Skeleton_Mage_Attack_Speed'),
        )
        const Golem_Proc_Rate = Math.min(
          Ring_Of_Mendeln_Proc_Rate,
          statVal(nodes_map, 'Golem_Attack_Speed'),
        )

        const Skeleton_Warrior_Damage_Portion =
          statVal(nodes_map, 'Max_Number_Of_Skeleton_Warriors') *
          Skeleton_Warrior_Proc_Rate *
          statVal(nodes_map, 'Skeleton_Warrior_Uptime') *
          NecromancerDamageMultiplier(
            new Set(['physical', 'minion', 'skeleton-warrior']),
            nodes_map,
          )

        const Skeleton_Mage_Damage_Portion =
          statVal(nodes_map, 'Max_Number_Of_Skeleton_Mages') *
          Skeleton_Mage_Proc_Rate *
          statVal(nodes_map, 'Skeleton_Mage_Uptime') *
          NecromancerDamageMultiplier(
            new Set(['physical', 'minion', 'skeleton-mage']),
            nodes_map,
          )

        const Golem_Damage_Portion =
          statVal(nodes_map, 'Max_Number_Of_Golems') *
          Golem_Proc_Rate *
          statVal(nodes_map, 'Golem_Uptime') *
          NecromancerDamageMultiplier(
            new Set(['physical', 'minion', 'golem']),
            nodes_map,
          )

        Ring_Of_Mendeln_DPS +=
          Ring_Of_Mendeln_Damage *
          Ring_Of_Mendeln_AOE *
          (Skeleton_Warrior_Damage_Portion +
            Skeleton_Mage_Damage_Portion +
            Golem_Damage_Portion)
      }

      return Ring_Of_Mendeln_DPS
    }),

    Minion_Dps: new StatsNode('Minion_Dps', () => {
      const Skeleton_Warrior_Dps =
        statVal(nodes_map, 'Skeleton_Warrior_Damage') *
        statVal(nodes_map, 'Skeleton_Warrior_Attack_Speed') *
        statVal(nodes_map, 'Skeleton_Warrior_Hits') *
        statVal(nodes_map, 'Skeleton_Warrior_Uptime') *
        statVal(nodes_map, 'Max_Number_Of_Skeleton_Warriors')

      const Skeleton_Mage_Dps =
        statVal(nodes_map, 'Skeleton_Mage_Damage') *
        statVal(nodes_map, 'Skeleton_Mage_Attack_Speed') *
        statVal(nodes_map, 'Skeleton_Mage_Hits') *
        statVal(nodes_map, 'Skeleton_Mage_Uptime') *
        statVal(nodes_map, 'Max_Number_Of_Skeleton_Mages')

      const Golem_Dps =
        statVal(nodes_map, 'Golem_Damage') *
          statVal(nodes_map, 'Golem_Attack_Speed') *
          statVal(nodes_map, 'Golem_Hits') *
          statVal(nodes_map, 'Golem_Uptime') *
          statVal(nodes_map, 'Max_Number_Of_Golems') +
        statVal(nodes_map, 'Golem_Active_DPS')

      return (
        Skeleton_Mage_Dps +
        Skeleton_Warrior_Dps +
        Golem_Dps +
        statVal(nodes_map, 'Ring_Of_Mendeln_DPS')
      )
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
        case 'decompose':
          Dot_Duration = statVal(nodes_map, 'Number_Of_Cast')
          break
        case 'blight':
          Dot_Duration = 6
          break
        case 'corpse-explosion':
          if (talentVal(nodes_map, 'blighted-corpse-explosion') > 0) {
            Dot_Duration = 6
          }
          break
        // Aspect of Ultimate Shadow : Bone Storm and Blood Wave are also Darkness Skills, deal Shadow damage, and gain additional effects:
        //• Enemies damaged by Bone Storm take {80/110} Shadow damage over 2.0 seconds.
        //• Blood Wave desecrates the ground it travels over, dealing {1280/1760} Shadow damage over 4.0 seconds
        case 'bone-storm':
          if (
            aspectVal(nodes_map, 'aspect-of-ultimate-shadow').length >
            0
          ) {
            Dot_Duration =
              statVal(nodes_map, 'Bone_Storm_Duration') + 1
          }
          break
        case 'blood-wave':
          if (
            aspectVal(nodes_map, 'aspect-of-ultimate-shadow').length >
            0
          ) {
            Dot_Duration = 4
          }
          break
        case 'blood-mist':
          if (
            aspectVal(nodes_map, 'blood-soaked-aspect').length > 0
          ) {
            Dot_Duration = 4
          }
          break
        case 'sever':
          if (
            aspectVal(nodes_map, 'greaves-of-the-empty-tomb').length >
            0
          ) {
            Dot_Duration = 2
          }
          break
      }

      return Dot_Duration
    }),

    Shadowblight_Rate: new StatsNode('Shadowblight_Rate', () => {
      // Talent ['shadowblight', 1] Shadow damage infects enemies with Shadowblight for 2 seconds.
      //Every 10th time an enemy receives Shadow damage from you or your Minions while they are affected by Shadowblight, they take an additional 22% Shadow damage.
      // Shadowblight's damage is increased by 100% [x] of your Shadow Damage over Time bonus.
      if (talentVal(nodes_map, 'shadowblight') > 0) {
        const Pre_Sim_Node = necromancerPresimVal(nodes_map)
        const number_of_enemies = Number(
          toggleVal(nodes_map, 'number-of-enemies'),
        )
        const enemy_spread = Number(
          statVal(nodes_map, 'Enemy_Spread'),
        )

        const Darkness_Skills = new Set([
          'reap',
          'decompose',
          'blight',
          'sever',
          'blood-wave',
          'blood-mist',
          'bone-storm',
        ])
        let Shadowblight_Application_Rate = 0
        for (const Other_Skill in Pre_Sim_Node['skill_use_rate']) {
          if (Darkness_Skills.has(Other_Skill)) {
            switch (Other_Skill) {
              case 'reap':
                Shadowblight_Application_Rate +=
                  Pre_Sim_Node['skill_use_rate'][Other_Skill] *
                  Pre_Sim_Node['cross_skill_stat'][Other_Skill][
                    'total_hits'
                  ]
                break

              case 'decompose':
                Shadowblight_Application_Rate +=
                  Pre_Sim_Node['skill_use_rate'][Other_Skill] *
                  Pre_Sim_Node['cross_skill_stat'][Other_Skill][
                    'total_hits'
                  ] *
                  Pre_Sim_Node['cross_skill_stat'][Other_Skill][
                    'dot_duration'
                  ]
                break

              case 'blight':
                Shadowblight_Application_Rate +=
                  1 +
                  2 *
                    Pre_Sim_Node['skill_use_rate'][Other_Skill] *
                    Pre_Sim_Node['cross_skill_stat'][Other_Skill][
                      'total_hits'
                    ] *
                    Pre_Sim_Node['cross_skill_stat'][Other_Skill][
                      'dot_duration'
                    ]
                break
              case 'sever':
                Shadowblight_Application_Rate +=
                  Pre_Sim_Node['skill_use_rate'][Other_Skill] *
                    Pre_Sim_Node['cross_skill_stat'][Other_Skill][
                      'total_hits'
                    ] +
                  Pre_Sim_Node['skill_use_rate'][Other_Skill] *
                    ProbabilityIntersectingLineInCircle(
                      10,
                      30,
                      enemy_spread,
                    ) *
                    Pre_Sim_Node['cross_skill_stat'][Other_Skill][
                      'dot_duration'
                    ]
                break
              case 'blood-mist':
                Shadowblight_Application_Rate +=
                  Pre_Sim_Node['skill_use_rate'][Other_Skill] *
                  Pre_Sim_Node['cross_skill_stat'][Other_Skill][
                    'total_hits'
                  ] *
                  Pre_Sim_Node['cross_skill_stat'][Other_Skill][
                    'dot_duration'
                  ]
                break
              case 'blood-wave':
                Shadowblight_Application_Rate +=
                  Pre_Sim_Node['skill_use_rate'][Other_Skill] *
                  Pre_Sim_Node['cross_skill_stat'][Other_Skill][
                    'total_hits'
                  ] *
                  Pre_Sim_Node['cross_skill_stat'][Other_Skill][
                    'dot_duration'
                  ]
                break
              case 'bone-storm':
                Shadowblight_Application_Rate +=
                  10 *
                  Pre_Sim_Node['skill_use_rate'][Other_Skill] *
                  Pre_Sim_Node['cross_skill_stat'][Other_Skill][
                    'total_hits'
                  ] *
                  Pre_Sim_Node['cross_skill_stat'][Other_Skill][
                    'dot_duration'
                  ]
                break
              default:
                break
            }
          }
        }
        if (
          bookOfTheDeadVal(nodes_map, 'skeletal-mages')[0] ==
            'shadow' &&
          bookOfTheDeadVal(nodes_map, 'skeletal-mages')[1] != 3
        ) {
          Shadowblight_Application_Rate +=
            statVal(nodes_map, 'Skeleton_Mage_Attack_Speed') *
            statVal(nodes_map, 'Max_Number_Of_Skeleton_Mages') *
            statVal(nodes_map, 'Skeleton_Mage_Uptime') *
            statVal(nodes_map, 'Skeleton_Mage_Hits')
        }
        return Shadowblight_Application_Rate
      } else {
        return 0
      }
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
      const Pre_Sim_Node = necromancerPresimVal(nodes_map)
      let Kill_Rate = 0
      for (const Skill in Pre_Sim_Node['skill_use_rate']) {
        Kill_Rate +=
          Pre_Sim_Node['skill_use_rate'][Skill] *
          Pre_Sim_Node['cross_skill_stat'][Skill]['enemy_kills']
      }

      return Kill_Rate
    }),

    Blood_Orb_Spawn_Rate: new StatsNode(
      'Blood_Orb_Spawn_Rate',
      () => {
        let Blood_Orb_Spawn_Rate = 0
        const Pre_Sim_Node = necromancerPresimVal(nodes_map)

        for (const Skill in Pre_Sim_Node['skill_use_rate']) {
          Blood_Orb_Spawn_Rate +=
            Pre_Sim_Node['skill_use_rate'][Skill] *
            Pre_Sim_Node['cross_skill_stat'][Skill]['blood_orb_gain']
        }

        return Blood_Orb_Spawn_Rate
      },
    ),

    Blood_Orb_Pickup_Rate: new StatsNode(
      'Blood_Orb_Pickup_Rate',
      () => {
        if (
          aspectVal(nodes_map, 'gore-quills').length != 0 &&
          allSkillsVal(nodes_map).has('blood-lance')
        ) {
          return 0
        }

        return statVal(nodes_map, 'Blood_Orb_Spawn_Rate')
      },
    ),

    Blood_Orb_Gain: new StatsNode('Blood_Orb_Gain', () => {
      let Blood_Orb_Gain = 0
      const Pre_Sim_Node = necromancerPresimVal(nodes_map)

      // ['hemorrhage', 5], Burst an enemy's blood, dealing {27%} damage. Hemorrhage has a 20% chance to form a Blood Orb.
      if (currentSkillVal(nodes_map)['name'] == 'hemorrhage') {
        Blood_Orb_Gain += 0.2
      }

      // ['supernatural-blood-lance', 1], After casting Blood Lance 6 times, your next cast of Blood Lance is guaranteed to Overpower and spawns a Blood Orb under the first enemy hit.
      if (
        talentVal(nodes_map, 'supernatural-blood-lance') > 0 &&
        currentSkillVal(nodes_map)['name'] == 'blood-lance'
      ) {
        Blood_Orb_Gain += statVal(nodes_map, 'Number_Of_Cast') / 7
      }

      // ['blighted-corpse-tendrils', 1], // Corpse Tendrils has a 35% chance when damaging enemies to drop a Blood Orb.
      if (
        talentVal(nodes_map, 'blighted-corpse-tendrils') > 0 &&
        currentSkillVal(nodes_map)['name'] == 'corpse-tendrils'
      ) {
        Blood_Orb_Gain += 0.35 * statVal(nodes_map, 'Total_Hits')
      }

      // ['supreme-blood-wave', 1], // Blood Wave leaves behind 3 Blood Orbs as it travels.
      if (
        talentVal(nodes_map, 'supreme-blood-wave') > 0 &&
        'blood-wave' in Pre_Sim_Node['skill_use_rate']
      ) {
        Blood_Orb_Gain += 3
      }

      // Aspect of the Embalmer : Consuming a Corpse has a {20/30}% chance to spawn a Blood Orb.
      if (
        aspectVal(nodes_map, 'aspect-of-the-embalmer').length != 0
      ) {
        // In cases where we always use all our corpses, we attribute the blood orb gain to the
        // corpse gain instead of the cost for simplicity.
        if (
          aspectVal(nodes_map, 'aspect-of-explosive-mist').length !=
            0 &&
          allSkillsVal(nodes_map).has('blood-mist')
        ) {
          Blood_Orb_Gain +=
            aspectVal(nodes_map, 'aspect-of-the-embalmer')[0] *
            statVal(nodes_map, 'Corpse_Gain')
        } else if (
          aspectVal(nodes_map, 'osseous-gale-aspect').length != 0 &&
          allSkillsVal(nodes_map).has('bone-storm')
        ) {
          Blood_Orb_Gain +=
            aspectVal(nodes_map, 'aspect-of-the-embalmer')[0] *
            statVal(nodes_map, 'Corpse_Gain')
        } else {
          Blood_Orb_Gain +=
            aspectVal(nodes_map, 'aspect-of-the-embalmer')[0] *
            statVal(nodes_map, 'Corpse_Cost')
        }
      }

      return Blood_Orb_Gain
    }),

    Bone_Storm_Duration: new StatsNode('Bone_Storm_Duration', () => {
      let Bone_Storm_Duration = 10
      const Pre_Sim_Node = necromancerPresimVal(nodes_map)

      // Osseous Gale Aspect : Bone Storm consumes up to 8 Corpses to increase its duration by up to {5/10} seconds.
      if (
        aspectVal(nodes_map, 'osseous-gale-aspect').length != 0 &&
        'bone-storm' in Pre_Sim_Node['skill_use_rate']
      ) {
        let Other_Corpse_Use_Rate = 0
        for (const Skill in Pre_Sim_Node['skill_use_rate']) {
          if (Skill != 'bone-storm') {
            Other_Corpse_Use_Rate =
              Pre_Sim_Node['skill_use_rate'][Skill] *
              Pre_Sim_Node['cross_skill_stat'][Skill]['corpse_cost']
          }
        }

        Bone_Storm_Duration +=
          (aspectVal(nodes_map, 'osseous-gale-aspect')[0] *
            Math.min(
              8,
              Pre_Sim_Node['cross_skill_stat']['bone-storm'][
                'cooldown'
              ] *
                Math.max(
                  0,
                  statVal(nodes_map, 'Corpse_Spawn_Rate') -
                    Other_Corpse_Use_Rate,
                ),
            )) /
          8
      }

      return Bone_Storm_Duration
    }),

    Enemy_Spread: new StatsNode('Enemy_Spread', () => {
      let enemy_spread = Number(
        toggleVal(nodes_map, 'enemy-spread-yards'),
      )

      const Pre_Sim_Node = necromancerPresimVal(nodes_map)

      // Corpse Tendrils: Veins burst out of a Corpse, Pulling in enemies, Stunning them for 3 seconds, and dealing {value2} damage to them. Does not consume the Corpse.
      if ('corpse-tendrils' in Pre_Sim_Node['skill_use_rate']) {
        enemy_spread -=
          10 *
          Math.min(
            1,
            3 * Pre_Sim_Node['skill_use_rate']['corpse-tendrils'],
          )
      }

      // ring-of-the-sacrilegious-soul: Automatically activate the following equipped Skills on Corpses around you:
      if (
        aspectVal(nodes_map, 'ring-of-the-sacrilegious-soul').length >
        0
      ) {
        enemy_spread -= 10 * (3 / 8)
      }

      // Aspect of the Void : Blight's defiled area, when spawned, Pulls in enemies around the affected area.
      if (
        'blight' in Pre_Sim_Node['skill_use_rate'] &&
        aspectVal(nodes_map, 'aspect-of-the-void').length != 0
      ) {
        enemy_spread -=
          5 *
          Math.min(1, 3 * Pre_Sim_Node['skill_use_rate']['blight'])
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

    Number_Of_Cooldowns: new StatsNode('Number_Of_Cooldowns', () => {
      let Number_Of_Cooldowns = 0
      const Core_Skills = new Set([
        'blood-lance',
        'blood-surge',
        'blight',
        'sever',
        'bone-spear',
      ])
      const Basic_Skills = new Set([
        'reap',
        'decompose',
        'hemorrhage',
        'bone-splinters',
      ])
      const Curse_Skills = new Set(['decrepify', 'iron-maiden'])

      for (const Skill of allSkillsVal(nodes_map)) {
        if (
          !Basic_Skills.has(Skill) &&
          !Core_Skills.has(Skill) &&
          !Curse_Skills.has(Skill)
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
        const Pre_Sim_Node = necromancerPresimVal(nodes_map)
        const number_of_enemies = Number(
          toggleVal(nodes_map, 'number-of-enemies'),
        )

        // Vampiric Power accursed-touch
        // Lucky Hit: Up to a 44% chance to inflict Vampiric Curse on enemies. Enemies with the Vampiric Curse have a 15% chance to spread it to other surrounding enemies. Accursed Souls deal 200% increased damage.
        if (vampiricPowerVal(nodes_map, 'accursed-touch')) {
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
          for (const Skill in Pre_Sim_Node['skill_use_rate']) {
            Vampiric_Curse_Rate +=
              0.44 *
              Pre_Sim_Node['skill_use_rate'][Skill] *
              Pre_Sim_Node['cross_skill_stat'][Skill][
                'lucky_hit_chance'
              ] *
              //Pre_Sim_Node['cross_skill_stat'][Skill]['total_hits'] *
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
          const Minion_Attack_Rate =
            statVal(nodes_map, 'Skeleton_Mage_Attack_Speed') +
            statVal(nodes_map, 'Skeleton_Warrior_Attack_Speed') +
            statVal(nodes_map, 'Golem_Attack_Speed')
          Vampiric_Curse_Rate +=
            0.3 *
            (statVal(nodes_map, 'Vampiric_Bat_Rate') +
              Minion_Attack_Rate)
        }

        return Math.min(1, Vampiric_Curse_Rate / number_of_enemies)
      },
    ),

    Vampiric_Bat_Rate: new StatsNode('Vampiric_Bat_Rate', () => {
      let Vampiric_Bat_Rate = 0

      const Pre_Sim_Node = necromancerPresimVal(nodes_map)

      // Vampiric Power flowing-veins
      // Casting a Mastery, Weapon Mastery, Macabre, Wrath, or Imbuement Skill calls a bat ally to attack nearby enemies, dealing 80% Physical damage with a 30% chance to Stun.	call-familiar
      // You deal 60% increased Damage Over Time to enemies that are moving or affected by a Vampiric Curse.
      if (vampiricPowerVal(nodes_map, 'flowing-veins')) {
        for (const Skill of allSkillsVal(nodes_map)) {
          switch (Skill) {
            case 'bone-spirit':
              if (Skill in Pre_Sim_Node['skill_use_rate']) {
                Vampiric_Bat_Rate +=
                  Pre_Sim_Node['skill_use_rate'][Skill]
              }
              break
            case 'bone-prison':
              Vampiric_Bat_Rate +=
                1 / statVal(nodes_map, 'Bone_Prison_Cooldown')
              break
            case 'blood-mist':
              if (Skill in Pre_Sim_Node['skill_use_rate']) {
                Vampiric_Bat_Rate +=
                  Pre_Sim_Node['skill_use_rate'][Skill]
              }
              break
            default:
              break
          }
        }
      }

      return Vampiric_Bat_Rate
    }),
  }
}

export function CreateNecromancerTriggerNodes(
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

      // Secondary Components
      const Hits_Multiplier = statVal(nodes_map, 'Hits_Multiplier')

      const Tags_Node = CopyTags(tagsVal(nodes_map))
      Tags_Node.add('damage-over-time')
      Tags_Node.add('shadow')
      Tags_Node.add('shadow-damage-over-time')
      const Damage_Multiplier = NecromancerDamageMultiplier(
        Tags_Node,
        nodes_map,
      )

      // Ultimates Cannot Gain +Ranks
      if (tagsVal(nodes_map).has('ultimate')) {
        Skill_DoT_Modifier =
          currentSkillVal(nodes_map)['modifiers']['dot']
      }

      //'blighted-corpse-explosion' Corpse Explosion becomes a Darkness Skill and, instead of exploding, releases a vile miasma dealing 95% Shadow Damage over 6 seconds.
      if (
        talentVal(nodes_map, 'blighted-corpse-explosion') > 0 &&
        currentSkillVal(nodes_map)['name'] == 'corpse-explosion'
      ) {
        Skill_DoT_Modifier =
          0.95 *
          (1 + 0.1 * (talentVal(nodes_map, 'corpse-explosion') - 1))
      }

      return (
        Skill_DoT_Modifier *
        Weapon_Damage *
        Damage_Multiplier *
        Hits_Multiplier
      )
    }),

    Flat_Damage: new TriggerNode('Flat_Damage', () => {
      // Primary Components
      let Weapon_Damage = statVal(nodes_map, 'Total_Weapon_Damage')
      const Skill_Name = currentSkillVal(nodes_map)['name']
      let Skill_Flat_Modifier =
        currentSkillVal(nodes_map)['modifiers']['flat'] *
        (1 + 0.1 * (talentVal(nodes_map, Skill_Name) - 1))

      // Secondary Components
      const Hits_Multiplier = statVal(nodes_map, 'Hits_Multiplier')

      // Ultimates Cannot Gain +Ranks
      if (tagsVal(nodes_map).has('ultimate')) {
        Skill_Flat_Modifier =
          currentSkillVal(nodes_map)['modifiers']['flat']
      }

      // 'blood-mist' Disperse into a bloody mist, becoming Immune for 3 seconds. Your Movement Speed is reduced by 20% and you periodically deal 2% damage to enemies and Healing for 0.5% of your Maximum Life.
      // (TODO) Take another look. I read this differently.
      if (currentSkillVal(nodes_map)['name'] == 'blood-mist') {
        Weapon_Damage = 0.017 * statVal(nodes_map, 'Max_Life')
        Skill_Flat_Modifier = 1
      }

      //'blighted-corpse-explosion' Corpse Explosion becomes a Darkness Skill and, instead of exploding, releases a vile miasma dealing 95% Shadow Damage over 6 seconds.
      if (
        talentVal(nodes_map, 'blighted-corpse-explosion') > 0 &&
        currentSkillVal(nodes_map)['name'] == 'corpse-explosion'
      ) {
        Skill_Flat_Modifier = 0
      }

      // Calculation

      const Tags_Node = CopyTags(tagsVal(nodes_map))
      Tags_Node.delete('shadow-damage-over-time')
      Tags_Node.delete('damage-over-time')
      const Damage_Multiplier = NecromancerDamageMultiplier(
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
        let Hits_Multiplier = 1
        const Pre_Sim_Node = necromancerPresimVal(nodes_map)

        const number_of_enemies = Number(
          toggleVal(nodes_map, 'number-of-enemies'),
        )
        const enemy_spread = Number(
          statVal(nodes_map, 'Enemy_Spread'),
        )
        const Enemy_Distance = toggleVal(nodes_map, 'enemy-distant')
          ? 25
          : 0

        // Aspect of Ultimate Shadow : Bone Storm and Blood Wave are also Darkness Skills, deal Shadow damage, and gain additional effects:
        //• Enemies damaged by Bone Storm take {80/110} Shadow damage over 2.0 seconds.
        //• Blood Wave desecrates the ground it travels over, dealing {1280/1760} Shadow damage over 4.0 seconds
        if (
          aspectVal(nodes_map, 'aspect-of-ultimate-shadow').length > 0
        ) {
          if (currentSkillVal(nodes_map)['name'] == 'bone-storm') {
            Hits_Multiplier =
              1 + ProbabilityInCircle(0, 20, enemy_spread)
            Non_Skill_Damage_Total +=
              Hits_Multiplier *
              aspectVal(nodes_map, 'aspect-of-ultimate-shadow')[0] *
              NecromancerDamageMultiplier(
                new Set([
                  'skill',
                  'darkness',
                  'shadow',
                  'damage-over-time',
                  'shadow-damage-over-time',
                ]),
                nodes_map,
              )
          }
          if (currentSkillVal(nodes_map)['name'] == 'blood-wave') {
            Hits_Multiplier =
              1 +
              ProbabilityInCone(60, 1 / 6, enemy_spread) *
                (number_of_enemies - 1)
            Non_Skill_Damage_Total +=
              Hits_Multiplier *
              aspectVal(nodes_map, 'aspect-of-ultimate-shadow')[1] *
              NecromancerDamageMultiplier(
                new Set([
                  'skill',
                  'darkness',
                  'shadow',
                  'damage-over-time',
                  'shadow-damage-over-time',
                ]),
                nodes_map,
              )
          }
        }

        // Aspect of Empowering Reaper: Sever has a {10/20}% chance to spawn a pool of Blight under the target that deals {40/80}% bonus damage. This effect can only happen once every 3.0 seconds.
        if (
          currentSkillVal(nodes_map)['name'] == 'sever' &&
          aspectVal(nodes_map, 'aspect-of-empowering-reaper')
            .length != 0 &&
          'sever' in Pre_Sim_Node['skill_use_rate']
        ) {
          const Blight_AOE_Hits = Math.min(
            10 ** 2 / statVal(nodes_map, 'Enemy_Spread') ** 2,
            1,
          )
          const Sever_Hits_Rate =
            Pre_Sim_Node['skill_use_rate']['sever'] *
            Pre_Sim_Node['cross_skill_stat']['sever']['total_hits']
          let Empowering_Reaper_Internal_CD_Multiplier = 1

          Empowering_Reaper_Internal_CD_Multiplier = Math.min(
            1,
            1 / ((Sever_Hits_Rate + 0.0000001) * 3),
          )

          // Each hit from Sever has a chance of spawning the pool. Each pool can hit other nearby enemies. Each enemy can only be affected by one pool though.
          Non_Skill_Damage_Total +=
            aspectVal(nodes_map, 'aspect-of-empowering-reaper')[0] *
            statVal(nodes_map, 'Total_Hits') *
            aspectVal(nodes_map, 'aspect-of-empowering-reaper')[1] *
            (1 + Blight_AOE_Hits * (number_of_enemies - 1)) *
            NecromancerDamageMultiplier(
              new Set([
                'shadow',
                'damage-over-time',
                'shadow-damage-over-time',
              ]),
              nodes_map,
            ) *
            Empowering_Reaper_Internal_CD_Multiplier
        }

        // Greaves of the Empty Tomb : Create desecrated ground beneath your Sever spectres as they travel, damaging enemies for {150/210} Shadow damage over 2.0 seconds.
        if (
          aspectVal(nodes_map, 'greaves-of-the-empty-tomb').length >
            0 &&
          currentSkillVal(nodes_map)['name'] == 'sever'
        ) {
          Non_Skill_Damage_Total +=
            ProbabilityIntersectingLineInCircle(
              10,
              30,
              statVal(nodes_map, 'Enemy_Spread'),
            ) *
            number_of_enemies *
            aspectVal(nodes_map, 'greaves-of-the-empty-tomb')[0] *
            NecromancerDamageMultiplier(
              new Set([
                'shadow',
                'damage-over-time',
                'shadow-damage-over-time',
              ]),
              nodes_map,
            )
        }

        // Blood-soaked Aspect : Blood Mist leaves a trail that lasts for 4.0 seconds and deals {75/100} Shadow damage per second to enemies who stand in it. Your Movement Speed is no longer reduced while Blood Mist is active.
        if (
          aspectVal(nodes_map, 'blood-soaked-aspect').length > 0 &&
          currentSkillVal(nodes_map)['name'] == 'blood-mist'
        ) {
          Non_Skill_Damage_Total +=
            ProbabilityInCircle(0, 12.5, enemy_spread) *
            aspectVal(nodes_map, 'blood-soaked-aspect')[0] *
            NecromancerDamageMultiplier(
              new Set([
                'shadow',
                'damage-over-time',
                'shadow-damage-over-time',
              ]),
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
            NecromancerDamageMultiplier(
              new Set(['poison', 'damage-over-time']),
              nodes_map,
            )
        }

        return Non_Skill_Damage_Total
      },
    ),

    Non_Skill_Flat_Damage: new TriggerNode(
      'Non_Skill_Flat_Damage',
      () => {
        const Weapon_Damage = statVal(
          nodes_map,
          'Total_Weapon_Damage',
        )
        let Non_Skill_Damage_Total = 0

        const Pre_Sim_Node = necromancerPresimVal(nodes_map)
        const number_of_enemies = Number(
          toggleVal(nodes_map, 'number-of-enemies'),
        )
        const enemy_spread = Number(
          statVal(nodes_map, 'Enemy_Spread'),
        )

        // 'enhanced-bone-spear' Bone Spear breaks into 3 shards when it is destroyed, dealing 25% damage each.
        // 'paranormal-bone-spear' Bone Spear has a 5% increased Critical Strike Chance. If Bone Spear's primary projectile Critically Strikes, it fires 2 additional bone shards upon being destroyed.
        // We assume target is in the cone and every enemy in the cone gets hit by one bolt.
        if (
          currentSkillVal(nodes_map)['name'] == 'bone-spear' &&
          talentVal(nodes_map, 'enhanced-bone-spear') > 0
        ) {
          // We assume target is in the cone and every enemy in the cone gets hit by one bolt.
          const Critical_Chance = statVal(
            nodes_map,
            'Critical_Chance',
          )
          let p = ProbabilityInCone(40, 1 / 6, enemy_spread)
          let Shard_Hits_Multiplier = Math.min(
            1 + p * (number_of_enemies - 1),
            3,
          )
          if (talentVal(nodes_map, 'paranormal-bone-spear') > 0) {
            const Bone_Spear_Shards_Non_Crit =
              (1 - Critical_Chance) *
              Math.min(1 + p * (number_of_enemies - 1), 3)
            const Bone_Spear_Shards_Crit =
              Critical_Chance *
              Math.min(1 + p * (number_of_enemies - 1), 5)
            Shard_Hits_Multiplier =
              Bone_Spear_Shards_Non_Crit + Bone_Spear_Shards_Crit
          }
          // Splintering Aspect : Bone Spear's primary attack makes enemies hit beyond the first Vulnerable for {1.5/2.5} seconds.
          // Bone Shards from Bone Spear deal {30/60}% bonus damage to Vulnerable enemies and pierce them.
          let Shard_Bonus_Multiplier = 1
          if (
            aspectVal(nodes_map, 'splintering-aspect').length > 0 &&
            statVal(nodes_map, 'Enemy_Vulnerable') > 0
          ) {
            // Due to limitations in the conal approach, we want to avoid this being weaker than the non-splintering version.
            p = Math.max(
              3 *
                ProbabilityIntersectingLineInCircle(
                  7,
                  40,
                  enemy_spread,
                ),
              p,
            )
            Shard_Hits_Multiplier = 1 + p * (number_of_enemies - 1)
            if (talentVal(nodes_map, 'paranormal-bone-spear') > 0) {
              const Bone_Spear_Shards_Non_Crit =
                (1 - Critical_Chance) * 1 +
                p * (number_of_enemies - 1)
              const Bone_Spear_Shards_Crit =
                Critical_Chance * 1 + p * (number_of_enemies - 1)
              Shard_Hits_Multiplier =
                Bone_Spear_Shards_Non_Crit + Bone_Spear_Shards_Crit
              Shard_Bonus_Multiplier =
                1 +
                aspectVal(nodes_map, 'splintering-aspect')[0] *
                  statVal(nodes_map, 'Enemy_Vulnerable')
            }
          }
          Non_Skill_Damage_Total +=
            0.25 *
            Weapon_Damage *
            Shard_Hits_Multiplier *
            Shard_Bonus_Multiplier *
            NecromancerDamageMultiplier(
              new Set(['bone', 'physical']),
              nodes_map,
            )
        }

        const Shadowblight_Rate = statVal(
          nodes_map,
          'Shadowblight_Rate',
        )
        let Aspect_Of_Decay_Bonus = 1
        // Aspect of Decay : Each time the Shadowblight Key Passive deals damage to enemies, it increases the next Shadowblight's damage within 10.0 seconds by x{25/45}%, stacking up to 5.0 times.
        if (aspectVal(nodes_map, 'aspect-of-decay').length != 0) {
          if (Shadowblight_Rate >= 1) {
            Aspect_Of_Decay_Bonus =
              1 + 5 * aspectVal(nodes_map, 'aspect-of-decay')[0]
          } else {
            Aspect_Of_Decay_Bonus =
              1 +
              Shadowblight_Rate *
                aspectVal(nodes_map, 'aspect-of-decay')[0]
          }
        }

        // Talent ['shadowblight', 1] Shadow damage infects enemies with Shadowblight for 2 seconds.
        //Every 10th time an enemy receives Shadow damage from you or your Minions while they are affected by Shadowblight, they take an additional 22% Shadow damage.
        // Shadowblight's damage is increased by 100% [x] of your Shadow Damage over Time bonus.
        let Shadowblight_Ticks = 0

        if (talentVal(nodes_map, 'shadowblight') > 0) {
          if (
            tagsVal(nodes_map).has('shadow') &&
            currentSkillVal(nodes_map)['modifiers']['flat'] > 0
          ) {
            Shadowblight_Ticks = statVal(nodes_map, 'Total_Hits')
          }
          if (tagsVal(nodes_map).has('shadow-damage-over-time')) {
            Shadowblight_Ticks =
              2 *
              statVal(nodes_map, 'Total_Hits') *
              statVal(nodes_map, 'Max_Dot_Duration')
          }
          if (
            bookOfTheDeadVal(nodes_map, 'skeletal-mages')[0] ==
              'shadow' &&
            bookOfTheDeadVal(nodes_map, 'skeletal-mages')[1] != 3
          ) {
            Shadowblight_Ticks +=
              statVal(nodes_map, 'Cast_Time') *
              statVal(nodes_map, 'Skeleton_Mage_Attack_Speed') *
              statVal(nodes_map, 'Max_Number_Of_Skeleton_Mages') *
              statVal(nodes_map, 'Skeleton_Mage_Uptime')
          }
        }

        Non_Skill_Damage_Total +=
          0.22 *
          Weapon_Damage *
          NecromancerDamageMultiplier(
            new Set(['shadow', 'shadow-damage-over-time']),

            nodes_map,
          ) *
          (1 + Aspect_Of_Decay_Bonus * (Shadowblight_Ticks / 10))

        // Doombringer: Lucky Hit: Up to a [0.7|%|] chance to deal 0.7*825 Shadow damage to surrounding enemies and reduce their damage done by 20% for 3 seconds.
        if (aspectVal(nodes_map, 'doombringer').length > 0) {
          const Hits =
            1 +
            Math.min(10 ** 2 / enemy_spread ** 2, 1) *
              (number_of_enemies - 1)
          Non_Skill_Damage_Total +=
            statVal(nodes_map, 'Total_Lucky_Hit_Chance_Multiplier') *
            Hits *
            aspectVal(nodes_map, 'doombringer')[0] *
            aspectVal(nodes_map, 'doombringer')[1]
          NecromancerDamageMultiplier(new Set(['shadow']), nodes_map)
        }

        // Unique Deathless Visage : Bone Spear leaves behind echoes as it travels that explode, dealing {125/175} damage.
        //                           The Echoes left behind by Bone Spear from the Unique power now deal 5% [x] increased damage for every +30% of your Critical Strike Bonus Damage stat.
        if (
          aspectVal(nodes_map, 'deathless-visage').length != 0 &&
          currentSkillVal(nodes_map)['name'] == 'bone-spear'
        ) {
          const Echo_Bonus_Damage_Multiplier =
            1 +
            0.05 *
              ((statVal(nodes_map, 'Generic_Critical_Bonus') *
                statVal(
                  nodes_map,
                  'Generic_Critical_Damage_Multiplier',
                )) /
                0.3)

          Non_Skill_Damage_Total +=
            aspectVal(nodes_map, 'deathless-visage')[0] *
            Echo_Bonus_Damage_Multiplier *
            NecromancerDamageMultiplier(
              new Set(['physical']),
              nodes_map,
            ) *
            (1 +
              ProbabilityIntersectingLineInCircle(
                20,
                60,
                statVal(nodes_map, 'Enemy_Spread'),
              )) *
            (number_of_enemies - 1)
        }

        // Aspect of Bursting Bones : When a segment of Bone Prison is destroyed or expires, it deals {11/15} damage in an area around itself.
        if (
          aspectVal(nodes_map, 'aspect-of-bursting-bones').length !=
            0 &&
          currentSkillVal(nodes_map)['name'] == 'bone-prison'
        ) {
          for (let i = 0; i < 6; i++) {
            Non_Skill_Damage_Total +=
              ProbabilityInCircle(i * 5, 10, enemy_spread) *
              aspectVal(nodes_map, 'aspect-of-bursting-bones')[0] *
              number_of_enemies *
              NecromancerDamageMultiplier(
                new Set(['physical']),
                nodes_map,
              )
          }
        }

        // Deathspeaker's Pendant : Blood Surge casts a mini nova on your Minions, dealing {50/75} damage. Damage is increased by 10.0% per target drained by the initial cast, up to 50.0%.
        if (
          aspectVal(nodes_map, 'deathspeakers-pendant').length != 0 &&
          currentSkillVal(nodes_map)['name'] == 'blood-surge'
        ) {
          const Skeleton_Warrior_Surges =
            statVal(nodes_map, 'Skeleton_Warrior_Uptime') *
            statVal(nodes_map, 'Max_Number_Of_Skeleton_Warriors')
          const Skeleton_Mage_Surges =
            statVal(nodes_map, 'Skeleton_Mage_Uptime') *
            statVal(nodes_map, 'Max_Number_Of_Skeleton_Mage')
          const Deathspeaker_Multiplier =
            1 +
            0.1 *
              Math.min(
                5,
                ProbabilityInCircle(
                  10,
                  10,
                  statVal(nodes_map, 'Enemy_Spread'),
                ) * number_of_enemies,
              )
          Non_Skill_Damage_Total =
            aspectVal(nodes_map, 'deathspeakers-pendant')[0] *
            NecromancerDamageMultiplier(
              new Set(['physical']),
              nodes_map,
            ) *
            (Skeleton_Warrior_Surges + Skeleton_Mage_Surges) *
            Deathspeaker_Multiplier *
            ProbabilityInCircle(
              10,
              10,
              statVal(nodes_map, 'Enemy_Spread'),
            ) *
            number_of_enemies
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
              NecromancerDamageMultiplier(
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
              NecromancerDamageMultiplier(
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
            NecromancerDamageMultiplier(
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
