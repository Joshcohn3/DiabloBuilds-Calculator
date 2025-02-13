/* eslint-disable @typescript-eslint/no-unused-vars */

import { SkillReturn } from './run_calculation'
import {
  SetUpAndRankSkillReturns,
  SkillRankFn,
} from './run_calculations_helpers'

/*
This file contains variants of the DimSum algorithm in run_calculations.ts which are class based. These
are used to estimate some parameters which are passed as inputs to calculate the skill outputs which are
used in the final DimSum. Some examples of things we track here:
    * Cast rate for each skill.
    * Dot uptime.
    * [Barbarian] Weapon swap Rates
    * [Rogue] Combo point distribution.
    * [Druid] Werebear/Werewolf form uptime.
    * [Necromancer] Minion uptime.
The results from the simulations here are stored in nodes in the calculation graph for the DimSum.
*/

// Sort by rank with highest priority first.
export const DpsSkillRankFn: SkillRankFn = function (
  a: [SkillReturn, SkillReturn, number],
  b: [SkillReturn, SkillReturn, number],
) {
  if (a[2] > b[2]) {
    return -1
  }
  if (a[2] < b[2]) {
    return 1
  }
  return 0
}

export const CooldownThenDpsSkillRankFn: SkillRankFn = function (
  a: [SkillReturn, SkillReturn, number],
  b: [SkillReturn, SkillReturn, number],
) {
  if (a[0]._cooldown_seconds > b[0]._cooldown_seconds) {
    return -1
  }
  if (a[0]._cooldown_seconds < b[0]._cooldown_seconds) {
    return 1
  }
  if (a[2] > b[2]) {
    return -1
  }
  if (a[2] < b[2]) {
    return 1
  }
  return 0
}

function SelectIndexForBalance(
  skill_generator_dps: [SkillReturn, SkillReturn, number][],
  cooldowns: number[],
  time_since_cast: number[],
): number {
  // Select the max time rank skill which is off cooldown.
  let Max_Time = 0
  let Max_Time_Index = -1
  for (const [i, candidate_tuple] of skill_generator_dps.entries()) {
    if (cooldowns[i] > 0) {
      continue
    }
    if (candidate_tuple[0]._skill_name == 'wait') {
      continue
    }
    if (time_since_cast[i] >= Max_Time) {
      Max_Time = time_since_cast[i]
      Max_Time_Index = i
    }
  }
  if (Max_Time_Index === -1) {
    for (const [
      i,
      candidate_tuple,
    ] of skill_generator_dps.entries()) {
      if (candidate_tuple[1]._skill_name == 'wait') {
        Max_Time_Index = i
      }
    }
  }
  return Max_Time_Index
}

interface CrossSkillStats {
  critical_chance: number
  overpower_chance: number
  lucky_hit_chance: number
  total_hits: number
  enemy_kills: number
  number_enemies_hit: number
  resource_cost: number
  resource_gain: number
  dot_duration: number
  elapsed_time: number
  cooldown: number
}

function SetUpCrossSkillStats(
  skill_generator_dps: [SkillReturn, SkillReturn, number][],
): Record<string, CrossSkillStats> {
  // Set up cross skill stats.
  const cross_skill_stats: Record<string, CrossSkillStats> = {}
  for (const [skill] of skill_generator_dps) {
    cross_skill_stats[skill._skill_name] = {
      critical_chance:
        skill._flat_damage > 0 ? skill._critical_strike_chance : 0,
      overpower_chance: skill._overpower_chance,
      lucky_hit_chance: skill._lucky_hit_chance,
      total_hits: skill._average_hits * skill._number_of_cast,
      enemy_kills: skill._enemy_kills,
      number_enemies_hit: skill._number_enemies_hit,
      resource_cost: skill._resource_cost,
      resource_gain: skill._resource_gain,
      dot_duration: skill._dot_duration,
      elapsed_time: skill._elapsed_time_seconds,
      cooldown: skill._cooldown_seconds,
    }
  }
  return cross_skill_stats
}

function SetUpNecromancerCrossSkillStats(
  skill_generator_dps: [SkillReturn, SkillReturn, number][],
): Record<string, NecromancerCrossSkillStats> {
  // Set up cross skill stats.
  const cross_skill_stats: Record<
    string,
    NecromancerCrossSkillStats
  > = {}
  for (const [skill] of skill_generator_dps) {
    cross_skill_stats[skill._skill_name] = {
      critical_chance:
        skill._flat_damage > 0 ? skill._critical_strike_chance : 0,
      overpower_chance: skill._overpower_chance,
      lucky_hit_chance: skill._lucky_hit_chance,
      total_hits: skill._average_hits * skill._number_of_cast,
      enemy_kills: skill._enemy_kills,
      number_enemies_hit: skill._number_enemies_hit,
      resource_cost: skill._resource_cost,
      resource_gain: skill._resource_gain,
      dot_duration: skill._dot_duration,
      elapsed_time: skill._elapsed_time_seconds,
      cooldown: skill._cooldown_seconds,
      corpse_cost: skill._corpse_cost,
      corpse_gain: skill._corpse_gain,
      blood_orb_gain: skill._blood_orb_gain,
    }
  }
  return cross_skill_stats
}

function CleanUpWaitSkill(pre_sim_return: any): void {
  if (pre_sim_return?.cross_skill_stat) {
    delete pre_sim_return.cross_skill_stat.wait
  }
  if (pre_sim_return?.skill_use_rate) {
    delete pre_sim_return.skill_use_rate.wait
  }
  if (pre_sim_return?.combo_point_distribution) {
    delete pre_sim_return.combo_point_distribution.wait
  }
}

export interface RoguePreSimReturn {
  // How many times per second each skill is used on average
  skill_use_rate: Record<string, number>
  dot_uptime: number
  // Probability distribution of combo points for each Core Skill.
  combo_point_distribution: Record<
    string,
    [number, number, number, number]
  >
  cross_skill_stat: Record<string, CrossSkillStats>
}

export function RunRoguePreSim(
  skill_returns: Record<string, SkillReturn>,
): RoguePreSimReturn {
  // Remove null skills.
  const skills = []
  for (const skill in skill_returns) {
    if (skill) {
      skills.push(skill_returns[skill])
    }
  }

  if (skills.length == 0) {
    return {
      skill_use_rate: {},
      dot_uptime: 0,
      cross_skill_stat: {},
      combo_point_distribution: {},
    }
  }
  const skill_generator_dps = SetUpAndRankSkillReturns(
    skill_returns,
    DpsSkillRankFn,
  )
  if (skill_generator_dps.length == 0) {
    return {
      skill_use_rate: {},
      dot_uptime: 0,
      cross_skill_stat: {},
      combo_point_distribution: {},
    }
  }
  const n = skill_generator_dps.length
  const cooldowns = new Array<number>(n).fill(0)
  const time_since_cast = new Array<number>(n).fill(0)
  const skill_cast_count: Record<string, number> = {}
  for (const skill_tuple of skill_generator_dps) {
    skill_cast_count[skill_tuple[0]._skill_name] = 0
  }
  const cross_skill_stats = SetUpCrossSkillStats(skill_generator_dps)

  let resources = 0
  let time = 0
  let dot_time = 0
  let current_dot_duration = 0
  let damage = 0
  let flat_damage = 0
  let dot_damage = 0
  let dps = 0
  let small_step = 0
  let step = 0

  // Rogue Specific
  // *****************************************************************************************
  let combo_points = 0
  const Core_Skills = [
    'barrage',
    'twisting-blades',
    'flurry',
    'penetrating-strike',
    'rapid-fire',
  ]
  // Tracks how many combo points were present for each use of the Core skill.
  const Combo_Point_Counter: Record<
    string,
    [number, number, number, number]
  > = {}
  for (const skill_tuple of skill_generator_dps) {
    const skill_name = skill_tuple[0]._skill_name
    if (Core_Skills.includes(skill_name)) {
      Combo_Point_Counter[skill_name] = [0, 0, 0, 0]
    }
  }
  // *****************************************************************************************
  do {
    step += 1
    const skill_index = SelectIndexForBalance(
      skill_generator_dps,
      cooldowns,
      time_since_cast,
    )
    const skill_tuple = skill_generator_dps[skill_index]
    // This should never happen since we can always at least wait.
    if (!skill_tuple) {
      return {
        skill_use_rate: {},
        dot_uptime: 0,
        cross_skill_stat: {},
        combo_point_distribution: {},
      }
    }
    let skill
    if (resources >= 0) {
      // Use the skill.
      skill = skill_tuple[0]
    } else {
      // Use the corresponding generator.
      skill = skill_tuple[1]
    }
    skill_cast_count[skill._skill_name] += 1
    const dt = skill._elapsed_time_seconds
    time += dt
    dot_time += Math.min(current_dot_duration, dt)
    if (skill._dot_duration < 0) {
      // Means dot is dropped
      current_dot_duration = 0
    } else {
      current_dot_duration = Math.max(
        current_dot_duration - dt,
        skill._dot_duration,
        0,
      )
    }

    for (let j = 0; j < cooldowns.length; j++) {
      cooldowns[j] = cooldowns[j] - dt
      time_since_cast[j] = time_since_cast[j] + dt
    }
    // If this was the generator, the skill is off cooldown
    // and the generator always has no cooldown. So its
    // okay.
    cooldowns[skill_index] = skill._cooldown_seconds
    time_since_cast[skill_index] = 0
    resources = Math.min(
      resources + skill._delta_resources,
      skill._max_resource - 100,
    )
    damage += skill._flat_damage + skill._dot_damage
    flat_damage += skill._flat_damage
    dot_damage += skill._dot_damage

    // Rogue Specific
    // *****************************************************************************************
    // Combo Point Tracking
    if (skill?._generated_combo_points) {
      combo_points += skill._generated_combo_points
    }
    if (Core_Skills.includes(skill._skill_name)) {
      if (combo_points >= 3) {
        Combo_Point_Counter[skill._skill_name][3] += 1
        combo_points = 0
      } else {
        Combo_Point_Counter[skill._skill_name][
          Math.floor(combo_points)
        ] += 1
        combo_points -= Math.floor(combo_points)
      }
    }
    // *****************************************************************************************
    if (Math.abs(damage / time - dps) / dps < 0.01) {
      small_step += 1
    } else {
      small_step = 0
    }
    dps = damage / time
    // (TODO) change this to be the difference is small for k steps.
  } while (small_step < 10 && step < 1000)

  for (const skill in skill_cast_count) {
    skill_cast_count[skill] /= time
  }
  for (const skill in Combo_Point_Counter) {
    const total =
      Combo_Point_Counter[skill][0] +
      Combo_Point_Counter[skill][1] +
      Combo_Point_Counter[skill][2] +
      Combo_Point_Counter[skill][3]
    if (total > 0) {
      Combo_Point_Counter[skill][0] /= total
      Combo_Point_Counter[skill][1] /= total
      Combo_Point_Counter[skill][2] /= total
      Combo_Point_Counter[skill][3] /= total
    } else {
      // Handle case where we don't use the skill at all. Here we should
      // just use the basic/core rotation to esimate the combo points if
      // we were to include it.
      const Core_Delta_Resource =
        cross_skill_stats[skill].resource_gain +
        cross_skill_stats[skill].resource_cost
      if (Core_Delta_Resource >= 0) {
        // This doesn't cost anything so we never build combo points to use it.
        Combo_Point_Counter[skill][0] = 1
      } else {
        for (const skill_tuple of skill_generator_dps) {
          if (skill_tuple[0]._skill_name != skill) {
            continue
          }
          const Generator_Delta_Resource =
            skill_tuple[1]._resource_gain +
            skill_tuple[1]._resource_cost
          if (Generator_Delta_Resource <= 0) {
            console.log(
              'Error: Generator for ' + skill + ' costs resources.',
            )
            Combo_Point_Counter[skill][0] = 1
            break
          }
          const ratio =
            -Core_Delta_Resource / Generator_Delta_Resource
          const ratio_floor = Math.floor(ratio)
          if (ratio_floor >= 3) {
            Combo_Point_Counter[skill][3] = 1
          } else {
            const ratio_frac = ratio - ratio_floor
            Combo_Point_Counter[skill][ratio_floor] = 1 - ratio_frac
            Combo_Point_Counter[skill][ratio_floor + 1] = ratio_frac
          }
        }
      }
    }
  }
  const Return: RoguePreSimReturn = {
    skill_use_rate: skill_cast_count,
    dot_uptime: dot_time / time,
    combo_point_distribution: Combo_Point_Counter,
    cross_skill_stat: cross_skill_stats,
  }
  CleanUpWaitSkill(Return)

  return Return
}

export interface BarbarianPreSimReturn {
  // How many times per second each skill is used on average
  skill_use_rate: Record<string, number>
  dot_uptime: number
  cross_skill_stat: Record<string, CrossSkillStats>

  // Attacks with dual-wield, two-handed-slashing and two-handed-bludgeoning per second.
  weapon_use_rate: {
    'dual-wield': number
    'two-handed-slashing': number
    'two-handed-bludgeoning': number
  }
  // Weapon swap rate per second.
  weapon_swap_rate: number
}

export function RunBarbarianPreSim(
  skill_returns: Record<string, SkillReturn>,
): BarbarianPreSimReturn {
  // Remove null skills.
  const skills = []
  for (const skill in skill_returns) {
    if (skill) {
      skills.push(skill_returns[skill])
    }
  }

  if (skills.length == 0) {
    return {
      skill_use_rate: {},
      dot_uptime: 0,
      cross_skill_stat: {},
      weapon_use_rate: {
        'dual-wield': 0,
        'two-handed-slashing': 0,
        'two-handed-bludgeoning': 0,
      },
      weapon_swap_rate: 0,
    }
  }
  const skill_generator_dps = SetUpAndRankSkillReturns(
    skill_returns,
    DpsSkillRankFn,
  )
  if (skill_generator_dps.length == 0) {
    return {
      skill_use_rate: {},
      dot_uptime: 0,
      cross_skill_stat: {},
      weapon_use_rate: {
        'dual-wield': 0,
        'two-handed-slashing': 0,
        'two-handed-bludgeoning': 0,
      },
      weapon_swap_rate: 0,
    }
  }
  const n = skill_generator_dps.length
  const cooldowns = new Array<number>(n).fill(0)
  const time_since_cast = new Array<number>(n).fill(0)
  const skill_cast_count: Record<string, number> = {}
  for (const skill_tuple of skill_generator_dps) {
    skill_cast_count[skill_tuple[0]._skill_name] = 0
  }
  const cross_skill_stats = SetUpCrossSkillStats(skill_generator_dps)

  let resources = 0
  let time = 0
  let dot_time = 0
  let current_dot_duration = 0
  let damage = 0
  let flat_damage = 0
  let dot_damage = 0
  let dps = 0
  let small_step = 0
  let step = 0

  // Barbarian Specific
  // *****************************************************************************************
  let swaps_count = 0
  let current_weapon_type = 0
  const weapon_use_count: {
    'dual-wield': number
    'two-handed-slashing': number
    'two-handed-bludgeoning': number
  } = {
    'dual-wield': 0,
    'two-handed-slashing': 0,
    'two-handed-bludgeoning': 0,
  }
  // *****************************************************************************************

  do {
    step += 1
    const skill_index = SelectIndexForBalance(
      skill_generator_dps,
      cooldowns,
      time_since_cast,
    )
    const skill_tuple = skill_generator_dps[skill_index]
    if (!skill_tuple) {
      return {
        skill_use_rate: {},
        dot_uptime: 0,
        cross_skill_stat: {},
        weapon_use_rate: {
          'dual-wield': 0,
          'two-handed-slashing': 0,
          'two-handed-bludgeoning': 0,
        },
        weapon_swap_rate: 0,
      }
    }
    let skill
    if (resources >= 0) {
      // Use the skill.
      skill = skill_tuple[0]
    } else {
      // Use the corresponding generator.
      skill = skill_tuple[1]
    }
    skill_cast_count[skill._skill_name] += 1
    const dt = skill._elapsed_time_seconds
    time += dt
    dot_time += Math.min(current_dot_duration, dt)
    if (skill._dot_duration < 0) {
      // Means dot is dropped
      current_dot_duration = 0
    } else {
      current_dot_duration = Math.max(
        current_dot_duration - dt,
        skill._dot_duration,
        0,
      )
    }

    for (let j = 0; j < cooldowns.length; j++) {
      cooldowns[j] = cooldowns[j] - dt
      time_since_cast[j] = time_since_cast[j] + dt
    }
    // If this was the generator, the skill is off cooldown
    // and the generator always has no cooldown. So its
    // okay.
    cooldowns[skill_index] = skill._cooldown_seconds
    time_since_cast[skill_index] = 0
    resources = Math.min(
      resources + skill._delta_resources,
      skill._max_resource - 100,
    )
    damage += skill._flat_damage + skill._dot_damage
    flat_damage += skill._flat_damage
    dot_damage += skill._dot_damage

    // Barbarian Specific
    // *****************************************************************************************
    if (skill._weapon_type === 0 || skill?._weapon_type) {
      if (skill._weapon_type != current_weapon_type) {
        swaps_count += 1
        current_weapon_type = skill._weapon_type
      }
      switch (skill._weapon_type) {
        case 0:
          weapon_use_count['dual-wield'] += 1
          break
        case 1:
          weapon_use_count['two-handed-slashing'] += 1
          break
        case 2:
          weapon_use_count['two-handed-bludgeoning'] += 1
          break
      }
    }
    // *****************************************************************************************
    if (Math.abs(damage / time - dps) / dps < 0.01) {
      small_step += 1
    } else {
      small_step = 0
    }
    dps = damage / time
    // (TODO) change this to be the difference is small for k steps.
  } while (small_step < 10 && step < 1000)

  for (const skill_name in skill_cast_count) {
    skill_cast_count[skill_name] /= time
  }
  weapon_use_count['dual-wield'] /= time
  weapon_use_count['two-handed-slashing'] /= time
  weapon_use_count['two-handed-bludgeoning'] /= time

  const Return: BarbarianPreSimReturn = {
    skill_use_rate: skill_cast_count,
    dot_uptime: dot_time / time,
    cross_skill_stat: cross_skill_stats,
    weapon_use_rate: weapon_use_count,
    weapon_swap_rate: swaps_count / time,
  }
  CleanUpWaitSkill(Return)

  return Return
}

export interface DruidPreSimReturn {
  // How many times per second each skill is used on average
  skill_use_rate: Record<string, number>
  dot_uptime: number
  cross_skill_stat: Record<string, CrossSkillStats>

  // Proportion of time spend in each form.
  shapeshift_uptime: {
    human: number
    werebear: number
    werewolf: number
  }

  // Swaps to each form per second.
  shapeshift_swap_rate: {
    human: number
    werebear: number
    werewolf: number
  }
}

export function RunDruidPreSim(
  skill_returns: Record<string, SkillReturn>,
): DruidPreSimReturn {
  // Remove null skills.
  const skills = []
  for (const skill in skill_returns) {
    if (skill) {
      skills.push(skill_returns[skill])
    }
  }

  if (skills.length == 0) {
    return {
      skill_use_rate: {},
      dot_uptime: 0,
      cross_skill_stat: {},
      shapeshift_uptime: {
        human: 1,
        werebear: 0,
        werewolf: 0,
      },

      // Swaps to each form per second.
      shapeshift_swap_rate: {
        human: 0,
        werebear: 0,
        werewolf: 0,
      },
    }
  }
  const skill_generator_dps = SetUpAndRankSkillReturns(
    skill_returns,
    DpsSkillRankFn,
  )
  if (skill_generator_dps.length == 0) {
    return {
      skill_use_rate: {},
      dot_uptime: 0,
      cross_skill_stat: {},
      shapeshift_uptime: {
        human: 1,
        werebear: 0,
        werewolf: 0,
      },

      // Swaps to each form per second.
      shapeshift_swap_rate: {
        human: 0,
        werebear: 0,
        werewolf: 0,
      },
    }
  }
  const n = skill_generator_dps.length
  const cooldowns = new Array<number>(n).fill(0)
  const time_since_cast = new Array<number>(n).fill(0)
  const skill_cast_count: Record<string, number> = {}
  for (const skill of skill_generator_dps) {
    skill_cast_count[skill[0]._skill_name] = 0
  }
  const cross_skill_stats = SetUpCrossSkillStats(skill_generator_dps)

  let resources = 0
  let time = 0
  let dot_time = 0
  let current_dot_duration = 0
  let damage = 0
  let flat_damage = 0
  let dot_damage = 0
  let dps = 0
  let small_step = 0
  let step = 0

  // Druid Specific
  // *****************************************************************************************
  let current_shapeshift_form = 0
  const shapeshift_swap_count = {
    human: 0,
    werebear: 0,
    werewolf: 0,
  }

  const shapeshift_time = {
    human: 0,
    werebear: 0,
    werewolf: 0,
  }
  // *****************************************************************************************

  do {
    step += 1
    const skill_index = SelectIndexForBalance(
      skill_generator_dps,
      cooldowns,
      time_since_cast,
    )
    const skill_tuple = skill_generator_dps[skill_index]
    // This should never happen since we can always at least wait.
    if (!skill_tuple) {
      return {
        skill_use_rate: {},
        dot_uptime: 0,
        cross_skill_stat: {},
        shapeshift_uptime: {
          human: 1,
          werebear: 0,
          werewolf: 0,
        },

        // Swaps to each form per second.
        shapeshift_swap_rate: {
          human: 0,
          werebear: 0,
          werewolf: 0,
        },
      }
    }
    let skill
    if (resources >= 0) {
      // Use the skill.
      skill = skill_tuple[0]
    } else {
      // Use the corresponding generator.
      skill = skill_tuple[1]
    }
    skill_cast_count[skill._skill_name] += 1
    const dt = skill._elapsed_time_seconds
    time += dt
    dot_time += Math.min(current_dot_duration, dt)
    if (skill._dot_duration < 0) {
      // Means dot is dropped
      current_dot_duration = 0
    } else {
      current_dot_duration = Math.max(
        current_dot_duration - dt,
        skill._dot_duration,
        0,
      )
    }

    for (let j = 0; j < cooldowns.length; j++) {
      cooldowns[j] = cooldowns[j] - dt
      time_since_cast[j] = time_since_cast[j] + dt
    }
    // If this was the generator, the skill is off cooldown
    // and the generator always has no cooldown. So its
    // okay.
    cooldowns[skill_index] = skill._cooldown_seconds
    time_since_cast[skill_index] = 0
    resources = Math.min(
      resources + skill._delta_resources,
      skill._max_resource - 100,
    )
    damage += skill._flat_damage + skill._dot_damage
    flat_damage += skill._flat_damage
    dot_damage += skill._dot_damage

    // Druid Specific
    // *****************************************************************************************
    if (skill?._shapeshift_form) {
      switch (skill._shapeshift_form) {
        case 0:
          shapeshift_time['human'] += dt
          break
        case 1:
          shapeshift_time['werewolf'] += dt
          break
        case 2:
          shapeshift_time['werebear'] += dt
          break
      }
      if (skill._shapeshift_form != current_shapeshift_form) {
        switch (skill._shapeshift_form) {
          case 0:
            shapeshift_swap_count['human'] += 1
            break
          case 1:
            shapeshift_swap_count['werewolf'] += 1
            break
          case 2:
            shapeshift_swap_count['werebear'] += 1
            break
        }
      }
      current_shapeshift_form = skill._shapeshift_form
    }
    // *****************************************************************************************

    if (Math.abs(damage / time - dps) / dps < 0.01) {
      small_step += 1
    } else {
      small_step = 0
    }
    dps = damage / time
    // (TODO) change this to be the difference is small for k steps.
  } while (small_step < 10 && step < 1000)

  for (const skill_name in skill_cast_count) {
    skill_cast_count[skill_name] /= time
  }
  shapeshift_time['human'] /= time
  shapeshift_time['werewolf'] /= time
  shapeshift_time['werebear'] /= time

  shapeshift_swap_count['human'] /= time
  shapeshift_swap_count['werewolf'] /= time
  shapeshift_swap_count['werebear'] /= time

  const Return: DruidPreSimReturn = {
    skill_use_rate: skill_cast_count,
    dot_uptime: dot_time / time,
    cross_skill_stat: cross_skill_stats,
    shapeshift_uptime: shapeshift_time,
    shapeshift_swap_rate: shapeshift_swap_count,
  }

  CleanUpWaitSkill(Return)

  return Return
}

interface NecromancerCrossSkillStats extends CrossSkillStats {
  corpse_gain: number
  corpse_cost: number
  blood_orb_gain: number
}

export interface NecromancerPreSimReturn {
  // How many times per second each skill is used on average
  skill_use_rate: Record<string, number>
  dot_uptime: number
  cross_skill_stat: Record<string, NecromancerCrossSkillStats>
}

export function RunNecromancerPreSim(
  skill_returns: Record<string, SkillReturn>,
): NecromancerPreSimReturn {
  // Remove null skills.
  const skills = []
  for (const skill in skill_returns) {
    if (skill) {
      skills.push(skill_returns[skill])
    }
  }

  if (skills.length == 0) {
    return {
      skill_use_rate: {},
      dot_uptime: 0,
      cross_skill_stat: {},
    }
  }
  const skill_generator_dps = SetUpAndRankSkillReturns(
    skill_returns,
    DpsSkillRankFn,
  )
  if (skill_generator_dps.length == 0) {
    return {
      skill_use_rate: {},
      dot_uptime: 0,
      cross_skill_stat: {},
    }
  }
  const n = skill_generator_dps.length
  const cooldowns = new Array<number>(n).fill(0)
  const time_since_cast = new Array<number>(n).fill(0)
  const skill_cast_count: Record<string, number> = {}
  for (const skill_generator of skill_generator_dps) {
    skill_cast_count[skill_generator[0]._skill_name] = 0
  }
  const cross_skill_stats = SetUpNecromancerCrossSkillStats(
    skill_generator_dps,
  )

  let resources = 0
  let time = 0
  let dot_time = 0
  let current_dot_duration = 0
  let damage = 0
  let flat_damage = 0
  let dot_damage = 0
  let dps = 0
  let small_step = 0
  let step = 0

  // Necro Specific
  // *****************************************************************************************
  let corpses = 0
  // *****************************************************************************************

  do {
    step += 1
    const skill_index = SelectIndexForBalance(
      skill_generator_dps,
      cooldowns,
      time_since_cast,
    )
    const skill_tuple = skill_generator_dps[skill_index]
    // This should never happen since we can always at least wait.
    if (!skill_tuple) {
      return {
        skill_use_rate: {},
        dot_uptime: 0,
        cross_skill_stat: {},
      }
    }
    let skill
    if (resources >= 0) {
      // Use the skill.
      skill = skill_tuple[0]
    } else {
      // Use the corresponding generator.
      skill = skill_tuple[1]
    }
    skill_cast_count[skill._skill_name] += 1
    const dt = skill._elapsed_time_seconds
    time += dt
    dot_time += Math.min(current_dot_duration, dt)
    if (skill._dot_duration < 0) {
      // Means dot is dropped
      current_dot_duration = 0
    } else {
      current_dot_duration = Math.max(
        current_dot_duration - dt,
        skill._dot_duration,
        0,
      )
    }

    for (let j = 0; j < cooldowns.length; j++) {
      cooldowns[j] = cooldowns[j] - dt
      time_since_cast[j] = time_since_cast[j] + dt
    }
    // If this was the generator, the skill is off cooldown
    // and the generator always has no cooldown. So its
    // okay.
    cooldowns[skill_index] = skill._cooldown_seconds
    time_since_cast[skill_index] = 0
    resources = Math.min(
      resources + skill._delta_resources,
      skill._max_resource - 100,
    )
    damage += skill._flat_damage + skill._dot_damage
    flat_damage += skill._flat_damage
    dot_damage += skill._dot_damage

    // Necro Specific
    // *****************************************************************************************
    if (skill._corpse_cost == -1) {
      corpses = 0
    } else {
      corpses -= skill._corpse_cost
    }
    corpses += skill._corpse_gain
    // *****************************************************************************************

    if (Math.abs(damage / time - dps) / dps < 0.01) {
      small_step += 1
    } else {
      small_step = 0
    }
    dps = damage / time
    // (TODO) change this to be the difference is small for k steps.
  } while (small_step < 10 && step < 1000)

  for (const skill_name in skill_cast_count) {
    skill_cast_count[skill_name] /= time
  }

  const Return: NecromancerPreSimReturn = {
    skill_use_rate: skill_cast_count,
    dot_uptime: dot_time / time,
    cross_skill_stat: cross_skill_stats,
  }
  CleanUpWaitSkill(Return)

  return Return
}

export interface SorcererPreSimReturn {
  // How many times per second each skill is used on average
  skill_use_rate: Record<string, number>
  dot_uptime: number
  cross_skill_stat: Record<string, CrossSkillStats>
  crackling_energy_rate: number
  crackling_energy_uptime: number
}

export function RunSorcererPreSim(
  skill_returns: Record<string, SkillReturn>,
): SorcererPreSimReturn {
  // Remove null skills.
  const skills = []
  for (const skill of Object.values(skill_returns)) {
    if (skill) {
      skills.push(skill)
    }
  }

  if (skills.length == 0) {
    return {
      skill_use_rate: {},
      dot_uptime: 0,
      cross_skill_stat: {},
      crackling_energy_rate: 0,
      crackling_energy_uptime: 0,
    }
  }
  const skill_generator_dps = SetUpAndRankSkillReturns(
    skill_returns,
    DpsSkillRankFn,
  )

  if (skill_generator_dps.length == 0) {
    return {
      skill_use_rate: {},
      dot_uptime: 0,
      cross_skill_stat: {},
      crackling_energy_rate: 0,
      crackling_energy_uptime: 0,
    }
  }
  const n = skill_generator_dps.length
  const cooldowns = new Array<number>(n).fill(0)
  const time_since_cast = new Array<number>(n).fill(0)
  const skill_cast_count: Record<string, number> = {}
  for (const skill of skill_generator_dps) {
    skill_cast_count[skill[0]._skill_name] = 0
  }
  const cross_skill_stats = SetUpCrossSkillStats(skill_generator_dps)

  let resources = 0
  let time = 0
  let dot_time = 0
  let current_dot_duration = 0
  let damage = 0
  let flat_damage = 0
  let dot_damage = 0
  let dps = 0
  let small_step = 0
  let step = 0

  // Sorc Specific
  // *****************************************************************************************
  let crackling_energy = 0
  let current_crackling_energy_duration = 0
  let crackling_energy_time = 0
  // *****************************************************************************************

  do {
    step += 1
    const skill_index = SelectIndexForBalance(
      skill_generator_dps,
      cooldowns,
      time_since_cast,
    )
    const skill_tuple = skill_generator_dps[skill_index]
    if (!skill_tuple) {
      return {
        skill_use_rate: {},
        dot_uptime: 0,
        cross_skill_stat: {},
        crackling_energy_rate: 0,
        crackling_energy_uptime: 0,
      }
    }
    let skill
    if (resources >= 0) {
      // Use the skill.
      skill = skill_tuple[0]
    } else {
      // Use the corresponding generator.
      skill = skill_tuple[1]
    }

    skill_cast_count[skill._skill_name] += 1
    const dt = skill._elapsed_time_seconds
    time += dt
    dot_time += Math.min(current_dot_duration, dt)
    if (skill._dot_duration < 0) {
      // Means dot is dropped
      current_dot_duration = 0
    } else {
      current_dot_duration = Math.max(
        current_dot_duration - dt,
        skill._dot_duration,
        0,
      )
    }

    for (let j = 0; j < cooldowns.length; j++) {
      cooldowns[j] = cooldowns[j] - dt
      time_since_cast[j] = time_since_cast[j] + dt
    }
    // If this was the generator, the skill is off cooldown
    // and the generator always has no cooldown. So its
    // okay.
    cooldowns[skill_index] = skill._cooldown_seconds
    time_since_cast[skill_index] = 0
    resources = Math.min(
      resources + skill._delta_resources,
      skill._max_resource - 100,
    )
    damage += skill._flat_damage + skill._dot_damage
    flat_damage += skill._flat_damage
    dot_damage += skill._dot_damage

    // Sorc Specific
    // *****************************************************************************************
    crackling_energy_time += Math.min(
      current_crackling_energy_duration,
      dt,
    )

    current_crackling_energy_duration = Math.max(
      current_crackling_energy_duration - dt,
      skill._crackling_energy_created * 0.5,
      0,
    )
    crackling_energy += skill._crackling_energy_created
    // *****************************************************************************************

    if (Math.abs(damage / time - dps) / dps < 0.01) {
      small_step += 1
    } else {
      small_step = 0
    }
    dps = damage / time
    // (TODO) change this to be the difference is small for k steps.
  } while (small_step < 10 && step < 1000)

  for (const skill_name in skill_cast_count) {
    skill_cast_count[skill_name] /= time
  }

  const Return: SorcererPreSimReturn = {
    skill_use_rate: skill_cast_count,
    dot_uptime: dot_time / time,
    cross_skill_stat: cross_skill_stats,
    crackling_energy_rate: crackling_energy / time,
    crackling_energy_uptime: crackling_energy_time / time,
  }
  CleanUpWaitSkill(Return)

  return Return
}
