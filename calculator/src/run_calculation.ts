/* eslint-disable @typescript-eslint/no-unused-vars */

import {
  CreateModifierNodes,
  CreateParagonModifierNodes,
  CreateVampiricNodes,
} from './all_class_graph'
import {
  CreateBarbarianAspectNodes,
  CreateBarbarianMalignantHeartNodes,
  CreateBarbarianParagonNodes,
  CreateBarbarianSkillNodes,
  CreateBarbarianStatsNodes,
  CreateBarbarianTagsNode,
  CreateBarbarianTalentModifierMap,
  CreateBarbarianTalentNodes,
  CreateBarbarianToggleNodes,
  CreateBarbarianTriggerNodes,
} from './barbarian_graph'
import {
  CooldownThenDpsSkillRankFn,
  DpsSkillRankFn,
  RunBarbarianPreSim,
  RunDruidPreSim,
  RunNecromancerPreSim,
  RunRoguePreSim,
  RunSorcererPreSim,
} from './class_based_sims'
import {
  AllSkillsNode,
  BarbarianPreSimNode,
  BaseStatsNode,
  BookOfTheDeadNode,
  BookOfTheDeadValue,
  ComputeNode,
  CreateAggregationNodes,
  DruidPreSimNode,
  EnchantmentNode,
  ExpertiseNode,
  NecromancerPreSimNode,
  NodesMap,
  RoguePreSimNode,
  SkillNode,
  SorcererPreSimNode,
  SpecializationNode,
  SpiritBoonNode,
} from './computation_graph'
import {
  CreateDruidAspectNodes,
  CreateDruidMalignantHeartNodes,
  CreateDruidParagonNodes,
  CreateDruidSkillNodes,
  CreateDruidStatsNodes,
  CreateDruidTagsNode,
  CreateDruidTalentModifierMap,
  CreateDruidTalentNodes,
  CreateDruidToggleNodes,
  CreateDruidTriggerNodes,
} from './druid_graph'
import {
  allSkillsVal,
  baseStatVal,
  currentSkillVal,
  skillVal,
  statVal,
  triggerVal,
} from './graph_values'
import {
  CreateNecromancerAspectNodes,
  CreateNecromancerMalignantHeartNodes,
  CreateNecromancerParagonNodes,
  CreateNecromancerSkillNodes,
  CreateNecromancerStatsNodes,
  CreateNecromancerTagsNode,
  CreateNecromancerTalentModifierMap,
  CreateNecromancerTalentNodes,
  CreateNecromancerToggleNodes,
  CreateNecromancerTriggerNodes,
} from './necromancer_graph'
import {
  Armor,
  BarbarianCharacter,
  DruidCharacter,
  instanceOfArmor,
  instanceOfWeapon,
  NecromancerCharacter,
  ParagonAttributes,
  PlayerCharacter,
  RogueCharacter,
  SorcererCharacter,
} from './player_character'
import {
  CreateRogueAspectNodes,
  CreateRogueMalignantHeartNodes,
  CreateRogueParagonNodes,
  CreateRogueSkillNodes,
  CreateRogueStatsNodes,
  CreateRogueTagsNode,
  CreateRogueTalentModifierMap,
  CreateRogueTalentNodes,
  CreateRogueToggleNodes,
  CreateRogueTriggerNodes,
} from './rogue_graph'
import {
  SetUpAndRankSkillReturns,
  SkillRankFn,
  UpdateSpecialSkills,
} from './run_calculations_helpers'
import {
  CreateSorcererAspectNodes,
  CreateSorcererMalignantHeartNodes,
  CreateSorcererParagonNodes,
  CreateSorcererSkillNodes,
  CreateSorcererStatsNodes,
  CreateSorcererTagsNode,
  CreateSorcererTalentModifierMap,
  CreateSorcererTalentNodes,
  CreateSorcererToggleNodes,
  CreateSorcererTriggerNodes,
} from './sorcerer_graph'
import { CreateAggregateStats } from './stats_tab_helpers'

/*
The run calculations API takes a PlayerCharacter as input and returns a PlayerCalculations object
containing all relevant offensive and defensive values of interest.
*/

// Gives a summary of relevant outputs of using an offensive skill.
export interface SkillReturn {
  _skill_name: string
  _flat_damage: number
  _skill_flat_damage: number
  _dot_damage: number
  _skill_dot_damage: number
  _attack_speed: number

  // This is the cooldown of a skill if there is one, not the attack speed.
  _cooldown_seconds: number

  // The amount of time until the next skill is available after using this move.
  // It is different than 1 / _attack_speed because of channeled moves which are
  // maintained for multiple attacks.
  _elapsed_time_seconds: number

  // Average probability of critical strike with this attack. If the attack does
  // multiple hits the crit is averaged over all hits.
  _critical_strike_chance: number

  // Average probability of critical strike damage multiplier with this attack.
  // If the attack does multiple hits the crit is averaged over all hits.
  _critical_strike_damage: number

  _lucky_hit_chance: number

  _average_hits: number

  _number_enemies_hit: number

  _enemy_kills: number

  _number_of_cast: number

  // Change in resource from using the skill. Can be positive or negative.
  _delta_resources: number

  _delta_resources_from_skill: number

  _resource_gain: number

  _resource_cost: number

  _max_resource: number

  _dot_duration: number

  _overpower_chance: number

  // Barbarian only
  // DW 0, Slashing 1, Bludgeoning 2
  // Other classes this is 0
  _weapon_type: number

  // Rogue only
  // Other classes this is 0
  _generated_combo_points: number

  // Druid only
  // 0 Human, 1 Werewolf, 2 Werebear
  // Other classes this is 0
  _shapeshift_form: number

  _passive_companion_dps: number

  // Sorcerer only
  _crackling_energy_created: number

  // Necromancer only
  _corpse_gain: number

  _corpse_cost: number

  _blood_orb_gain: number
}

interface SkillOutput {
  // Average direct damage against a single enemy that occurs from using the skill.
  // Includes the damage from lucky hits triggered by this ability.
  _single_target_direct_damage: number

  // Average dot damage against a single enemy that occurs from using the skill.
  // Includes the damage from lucky hits triggered by this ability.
  _single_target_dot_damage: number

  // Average AOE damage that occurs from using the skill. Includes the damage
  // from lucky hits triggered by this ability.
  _aoe_damage: number

  //  Weapon speed plus the average attack speed bonus.
  _attack_speed: number

  // Average probability of critical strike with this attack. If the attack does
  // multiple hits the crit is averaged over all hits.
  _critical_strike_chance: number

  // Average probability of critical strike damage multiplier with this attack.
  // If the attack does multiple hits the crit is averaged over all hits.
  _critical_strike_damage: number

  // Change in resource from using the skill. Can be positive or negative.
  _delta_resources: number

  // Average lucky hit chance multiplier when using this skill. This is the base
  // lucky hit chance from the skill, increased by the lucky hit bonus from modifiers,
  // paragon and various bonuses from talents, aspects and paragon.
  _lucky_hit_chance: number

  // This is the cooldown of a skill if there is one, not the attack speed.
  _cooldown_seconds: number

  // The passive DPS from companions summmoned by this skill.
  _passive_companion_dps: number
}

export interface SummaryStats {
  // A single value estimate of the dps. This is the basic/core rotation dps with weaving in cooldown offensive
  // only if they increase the effective dps.
  _effective_dps_single_target: number
  _effective_dps_aoe: number

  _effective_life: number
  _core_ratio: number
}

interface CoreStats {
  _level: number
  _strength: number
  _dexterity: number
  _intelligence: number
  _willpower: number
}

export interface Stat {
  // Display name for the stat.
  label: string
  // Display value for the stat.
  value: number
  // If '%' then should be displayed with a percent sign.
  // The value will be a number out of 100 (will multiply
  // to get a percentage).
  tag: '%' | '#'
}

export interface AggregateStats {
  offensive: { label: 'Offensive'; stats: Stat[] }
  defensive: { label: 'Defensive'; stats: Stat[] }
  utility: { label: 'Utility'; stats: Stat[] }
  core: { label: 'Core'; stats: Stat[] }
}

export class PlayerCalculations {
  _summary_stats!: SummaryStats
  // Keys: Name of offensive skill, Values: Summary of outputs from that skill.
  _skill_value_map!: Record<string, SkillOutput>
  _other_cooldowns: Record<string, number> = {}
  _aggregate_stats!: AggregateStats
}

export function RunCalculations(
  player_character: PlayerCharacter,
): PlayerCalculations {
  const calcs = new PlayerCalculations()
  const nodes_map = CreateNodesMap(
    player_character.class,
    player_character.level,
  )
  const nodes_map_single_target = CreateNodesMap(
    player_character.class,
    player_character.level,
  )
  SetRootNodes(nodes_map, player_character)
  SetRootNodes(nodes_map_single_target, player_character)
  nodes_map_single_target['toggle']!['number-of-enemies'].SetValue = 1

  if (
    player_character.abilities &&
    player_character.abilities.length > 6
  ) {
    throw 'Too many abilities are equipped. Only 6 abilities can be equipped.'
  }

  const pre_sim_skill_returns = ComputeAllSkillReturns(
    nodes_map,
    player_character,
  )

  const pre_sim_skill_returns_single_target = ComputeAllSkillReturns(
    nodes_map_single_target,
    player_character,
  )

  if (!nodes_map['presim']) {
    throw 'No AoE presim node found at all!'
  }
  if (!nodes_map_single_target['presim']) {
    throw 'No single target presim node found at all!'
  }
  switch (player_character.class) {
    case 'Barbarian':
      if (!nodes_map['presim']['barbarian']) {
        throw (
          'No AoE presim node found for class: ' +
          player_character.class
        )
      }
      if (!nodes_map_single_target['presim']['barbarian']) {
        throw (
          'No single target presim node found for class: ' +
          player_character.class
        )
      }
      nodes_map['presim']['barbarian'].SetValue = RunBarbarianPreSim(
        pre_sim_skill_returns,
      )
      nodes_map_single_target['presim']['barbarian'].SetValue =
        RunBarbarianPreSim(pre_sim_skill_returns_single_target)
      break
    case 'Druid':
      if (!nodes_map['presim']['druid']) {
        throw (
          'No AoE presim node found for class: ' +
          player_character.class
        )
      }
      if (!nodes_map_single_target['presim']['druid']) {
        throw (
          'No single target presim node found for class: ' +
          player_character.class
        )
      }
      nodes_map['presim']['druid'].SetValue = RunDruidPreSim(
        pre_sim_skill_returns,
      )
      nodes_map_single_target['presim']['druid'].SetValue =
        RunDruidPreSim(pre_sim_skill_returns_single_target)
      break
    case 'Necromancer':
      if (!nodes_map['presim']['necromancer']) {
        throw (
          'No AoE presim node found for class: ' +
          player_character.class
        )
      }
      if (!nodes_map_single_target['presim']['necromancer']) {
        throw (
          'No single target presim node found for class: ' +
          player_character.class
        )
      }
      nodes_map['presim']['necromancer'].SetValue =
        RunNecromancerPreSim(pre_sim_skill_returns)
      nodes_map_single_target['presim']['necromancer'].SetValue =
        RunNecromancerPreSim(pre_sim_skill_returns_single_target)
      break
    case 'Rogue':
      if (!nodes_map['presim']['rogue']) {
        throw (
          'No AoE presim node found for class: ' +
          player_character.class
        )
      }
      if (!nodes_map_single_target['presim']['rogue']) {
        throw (
          'No single target presim node found for class: ' +
          player_character.class
        )
      }
      nodes_map['presim']['rogue'].SetValue = RunRoguePreSim(
        pre_sim_skill_returns,
      )
      nodes_map_single_target['presim']['rogue'].SetValue =
        RunRoguePreSim(pre_sim_skill_returns_single_target)
      break
    case 'Sorcerer':
      if (!nodes_map['presim']['sorcerer']) {
        throw (
          'No AoE presim node found for class: ' +
          player_character.class
        )
      }
      if (!nodes_map_single_target['presim']['sorcerer']) {
        throw (
          'No single target presim node found for class: ' +
          player_character.class
        )
      }
      nodes_map['presim']['sorcerer'].SetValue = RunSorcererPreSim(
        pre_sim_skill_returns,
      )
      nodes_map_single_target['presim']['sorcerer'].SetValue =
        RunSorcererPreSim(pre_sim_skill_returns_single_target)
      break
  }

  const skill_returns = ComputeAllSkillReturns(
    nodes_map,
    player_character,
  )
  const basic_skill_name = BasicSkill(
    player_character?.abilities ?? [],
    nodes_map,
  )
  const core_skill_names = CoreSkills(
    player_character?.abilities ?? [],
    nodes_map,
  )

  const basic_skill_return = basic_skill_name
    ? skill_returns[basic_skill_name]
    : skill_returns['wait']

  let Max_Core_Rate = 0
  let core_skill_return: SkillReturn | null = null
  if (basic_skill_return) {
    for (const core_skill_name of core_skill_names) {
      if (
        ComputeCoreRate(
          basic_skill_return,
          skill_returns[core_skill_name],
        ) > Max_Core_Rate
      ) {
        Max_Core_Rate = ComputeCoreRate(
          basic_skill_return,
          skill_returns[core_skill_name],
        )
        core_skill_return = skill_returns[core_skill_name]
      }
    }
  }

  const skill_returns_single_target = ComputeAllSkillReturns(
    nodes_map_single_target,
    player_character,
  )

  calcs._skill_value_map = {}
  for (const skill in skill_returns) {
    if (skill != 'wait') {
      calcs._skill_value_map[skill] = ComputeSkillOutput(
        skill_returns_single_target[skill],
        skill_returns[skill],
      )
    }
  }

  calcs._summary_stats = {
    _effective_dps_aoe:
      statVal(nodes_map, 'Total_Attack_Speed') == 0
        ? 0
        : DimSum(skill_returns),
    _effective_dps_single_target:
      statVal(nodes_map, 'Total_Attack_Speed') == 0
        ? 0
        : DimSum(skill_returns_single_target),
    _effective_life: statVal(nodes_map, 'Effective_Life'),
    _core_ratio:
      basic_skill_return != null && core_skill_return != null
        ? ComputeCoreRate(basic_skill_return, core_skill_return) * 100
        : 0,
  }

  calcs._other_cooldowns = FindOtherCooldowns(
    player_character.class,
    nodes_map,
  )

  if (!nodes_map.aggregation) {
    throw (
      'aggregation nodes not set in class' + player_character.class
    )
  }
  calcs._aggregate_stats = CreateAggregateStats(nodes_map)

  return calcs
}

function CreateNodesMap(
  class_name: string,
  player_level: number,
): NodesMap {
  const nodes_map: NodesMap = {}

  if (class_name == 'Barbarian') {
    nodes_map.class = 'Barbarian'
    nodes_map.modifier = CreateModifierNodes()
    nodes_map.aspect = CreateBarbarianAspectNodes()
    nodes_map.talent = CreateBarbarianTalentNodes()
    nodes_map.toggle = CreateBarbarianToggleNodes()
    nodes_map.skill = CreateBarbarianSkillNodes()
    nodes_map.malignant_heart = CreateBarbarianMalignantHeartNodes()
    nodes_map.vampiric = CreateVampiricNodes()
    nodes_map.base_stat = new BaseStatsNode('Barbarian', player_level)
    nodes_map.stat = CreateBarbarianStatsNodes(nodes_map)
    nodes_map.trigger = CreateBarbarianTriggerNodes(nodes_map)
    nodes_map.talent_modifier_map = CreateBarbarianTalentModifierMap()
    nodes_map.tags = CreateBarbarianTagsNode(nodes_map)
    nodes_map.paragon = CreateBarbarianParagonNodes()
    nodes_map.paragon_modifier = CreateParagonModifierNodes()
    nodes_map.expertise = new ExpertiseNode()
    nodes_map.presim = { barbarian: new BarbarianPreSimNode() }
    nodes_map.current_skill = new SkillNode(
      'default',
      '',
      [],
      0,
      0,
      0,
      0,
      0,
    )
  } else if (class_name == 'Sorcerer') {
    nodes_map.class = 'Sorcerer'
    nodes_map.modifier = CreateModifierNodes()
    nodes_map.aspect = CreateSorcererAspectNodes()
    nodes_map.talent = CreateSorcererTalentNodes()
    nodes_map.toggle = CreateSorcererToggleNodes()
    nodes_map.skill = CreateSorcererSkillNodes()
    nodes_map.malignant_heart = CreateSorcererMalignantHeartNodes()
    nodes_map.vampiric = CreateVampiricNodes()
    nodes_map.base_stat = new BaseStatsNode('Sorcerer', player_level)
    nodes_map.stat = CreateSorcererStatsNodes(nodes_map)
    nodes_map.trigger = CreateSorcererTriggerNodes(nodes_map)
    nodes_map.talent_modifier_map = CreateSorcererTalentModifierMap()
    nodes_map.tags = CreateSorcererTagsNode(nodes_map)
    nodes_map.paragon = CreateSorcererParagonNodes()
    nodes_map.paragon_modifier = CreateParagonModifierNodes()
    nodes_map.enchantment = new EnchantmentNode()
    nodes_map.presim = { sorcerer: new SorcererPreSimNode() }
    nodes_map.current_skill = new SkillNode(
      'default',
      '',
      [],
      0,
      0,
      0,
      0,
      0,
    )
  } else if (class_name == 'Druid') {
    nodes_map.class = 'Druid'
    nodes_map.modifier = CreateModifierNodes()
    nodes_map.aspect = CreateDruidAspectNodes()
    nodes_map.talent = CreateDruidTalentNodes()
    nodes_map.toggle = CreateDruidToggleNodes()
    nodes_map.skill = CreateDruidSkillNodes()
    nodes_map.malignant_heart = CreateDruidMalignantHeartNodes()
    nodes_map.vampiric = CreateVampiricNodes()
    nodes_map.base_stat = new BaseStatsNode('Druid', player_level)
    nodes_map.stat = CreateDruidStatsNodes(nodes_map)
    nodes_map.trigger = CreateDruidTriggerNodes(nodes_map)
    nodes_map.talent_modifier_map = CreateDruidTalentModifierMap()
    nodes_map.tags = CreateDruidTagsNode(nodes_map)
    nodes_map.paragon = CreateDruidParagonNodes()
    nodes_map.paragon_modifier = CreateParagonModifierNodes()
    nodes_map.spirit_boon = new SpiritBoonNode()
    nodes_map.presim = { druid: new DruidPreSimNode() }
    nodes_map.current_skill = new SkillNode(
      'default',
      '',
      [],
      0,
      0,
      0,
      0,
      0,
    )
  } else if (class_name == 'Rogue') {
    nodes_map.class = 'Rogue'
    nodes_map.modifier = CreateModifierNodes()
    nodes_map.aspect = CreateRogueAspectNodes()
    nodes_map.talent = CreateRogueTalentNodes()
    nodes_map.toggle = CreateRogueToggleNodes()
    nodes_map.skill = CreateRogueSkillNodes()
    nodes_map.malignant_heart = CreateRogueMalignantHeartNodes()
    nodes_map.vampiric = CreateVampiricNodes()
    nodes_map.base_stat = new BaseStatsNode('Rogue', player_level)
    nodes_map.stat = CreateRogueStatsNodes(nodes_map)
    nodes_map.trigger = CreateRogueTriggerNodes(nodes_map)
    nodes_map.talent_modifier_map = CreateRogueTalentModifierMap()
    nodes_map.paragon = CreateRogueParagonNodes()
    nodes_map.paragon_modifier = CreateParagonModifierNodes()
    nodes_map.specialization = new SpecializationNode()
    nodes_map.tags = CreateRogueTagsNode(nodes_map)
    nodes_map.presim = { rogue: new RoguePreSimNode() }
    nodes_map.current_skill = new SkillNode(
      'default',
      '',
      [],
      0,
      0,
      0,
      0,
      0,
    )
  } else if (class_name == 'Necromancer') {
    nodes_map.class = 'Necromancer'
    nodes_map.modifier = CreateModifierNodes()
    nodes_map.aspect = CreateNecromancerAspectNodes()
    nodes_map.talent = CreateNecromancerTalentNodes()
    nodes_map.toggle = CreateNecromancerToggleNodes()
    nodes_map.skill = CreateNecromancerSkillNodes()
    nodes_map.malignant_heart = CreateNecromancerMalignantHeartNodes()
    nodes_map.vampiric = CreateVampiricNodes()
    nodes_map.base_stat = new BaseStatsNode(
      'Necromancer',
      player_level,
    )
    nodes_map.stat = CreateNecromancerStatsNodes(nodes_map)
    nodes_map.trigger = CreateNecromancerTriggerNodes(nodes_map)
    nodes_map.talent_modifier_map =
      CreateNecromancerTalentModifierMap()
    nodes_map.paragon = CreateNecromancerParagonNodes()
    nodes_map.paragon_modifier = CreateParagonModifierNodes()
    nodes_map.tags = CreateNecromancerTagsNode(nodes_map)
    nodes_map['book_of_the_dead'] = new BookOfTheDeadNode()
    nodes_map.presim = { necromancer: new NecromancerPreSimNode() }
    nodes_map.current_skill = new SkillNode(
      'default',
      '',
      [],
      0,
      0,
      0,
      0,
      0,
    )
  } else {
    throw 'Unimplemented class detected.'
  }

  return nodes_map
}

// Modifiers the nodes in nodes_map with the player_character's input gear, talents, paragons etc
function SetRootNodes(
  nodes_map: NodesMap,
  player_character: PlayerCharacter,
) {
  if (
    !(
      nodes_map.talent_modifier_map &&
      nodes_map.modifier &&
      nodes_map.talent &&
      nodes_map.talent_modifier_map &&
      nodes_map.aspect &&
      nodes_map.paragon &&
      nodes_map.paragon_modifier &&
      nodes_map.toggle &&
      nodes_map.base_stat &&
      nodes_map.malignant_heart &&
      nodes_map.vampiric
    )
  ) {
    throw 'missing important nodes in nodes_map'
  }
  const equipment = [
    'helmet',
    'amulet',
    'chest',
    'boots',
    'gloves',
    'pants',
    'ring1',
    'ring2',
    'mainHand',
    'offHand',
    'twoHandedSlashing',
    'twoHandedBludgeoning',
    'ranged',
  ]
  for (const gear_slot of equipment) {
    if (gear_slot in player_character) {
      const gear =
        player_character[gear_slot as keyof typeof player_character]
      if (gear) {
        if (!(instanceOfArmor(gear) || instanceOfWeapon(gear))) {
          console.log('Gear not armor or weapon error: ' + gear_slot)
          return
        }
        const mods = gear.modifiers ?? []
        for (const [mod_name, value] of mods) {
          if (typeof value !== 'number') {
            console.error(
              // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
              `Error: ${mod_name} - Value is not a number: ${value}`,
            )
            continue
          }
          if (mod_name in nodes_map.talent_modifier_map) {
            for (const talent_name of nodes_map.talent_modifier_map[
              mod_name
            ]) {
              if (!(talent_name in nodes_map['talent'])) {
                console.log('Talent not found error: ' + talent_name)
                continue
              }
              nodes_map['talent'][talent_name].AddTalentModifier(
                value,
              )
            }
          } else {
            if (!mod_name) {
              continue
            }
            if (!(mod_name in nodes_map['modifier'])) {
              console.log(
                'Mod not found in modifier map. Mod name: ' +
                  mod_name,
              )
              continue
            }
            nodes_map['modifier'][mod_name].AddValue(value)
          }
        }
        const { aspect } = gear
        if (aspect instanceof Array) {
          if (
            aspect.length != 2 ||
            !(aspect[0] in nodes_map['aspect'])
          ) {
            // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
            console.log(`${gear_slot} aspect not valid: ${aspect}`)
            continue
          }
          let aspect_val_error = false
          for (const aspect_val of aspect[1]) {
            if (aspect_val && !(typeof aspect_val == 'number')) {
              aspect_val_error = true
            }
          }
          if (aspect_val_error) {
            console.log(
              `Aspect value not a number error: ${aspect[1].toString()}`,
            )
            continue
          }
          nodes_map['aspect'][aspect[0]].AddAspect(aspect[1])
          // (Unique) Harlequin-Crest: "Gain {5/8}% damage Reduction .In addition, gain +4.0 Ranks to all Skills."
          // Misses skills which are purely buffs. Better to use a skills list.
          if (aspect[0] == 'harlequin-crest') {
            for (const skill_name in nodes_map['skill']) {
              if (
                !skillVal(nodes_map, skill_name).tags.has('ultimate')
              ) {
                nodes_map['talent'][skill_name].AddTalentModifier(4)
              }
            }
          }
        }
        if (instanceOfArmor(gear) && gear.malignantHeart) {
          const { malignantHeart } = gear
          if (malignantHeart.armor) {
            nodes_map['modifier']['armor'].AddValue(
              malignantHeart.armor,
            )
          }
          if (
            !malignantHeart.name ||
            !malignantHeart.values ||
            !(malignantHeart.name in nodes_map['malignant_heart'])
          ) {
            console.log(
              `${gear_slot} malignant heart not valid: ` +
                malignantHeart.name,
            )
            continue
          }
          let malignant_heart_val_error = false
          for (const malignant_heart_val of malignantHeart.values) {
            if (
              malignant_heart_val &&
              !(typeof malignant_heart_val == 'number')
            ) {
              malignant_heart_val_error = true
            }
          }
          if (malignant_heart_val_error) {
            // console.log(
            //   // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
            //   `Malignant heart value not a number error: ${malignantHeart.values}`,
            // )
            continue
          }
          nodes_map['malignant_heart'][
            malignantHeart.name
          ].AddMalignantHeart(malignantHeart.values)

          // Malignant Heart (Druid) the-moonrage	Kills: have a [6-10]% chance to summon a Wolf Companion to your side for [20-30] seconds. In addition, gain +3 to Wolves.
          if (malignantHeart.name == 'the-moonrage') {
            nodes_map['talent']['wolves'].AddTalentModifier(3)
          }
        }
      }
    }
  }

  // (TODO) Consider allowing string modifiers.
  // These weapon types and encodings are Barbarian specific.
  switch (player_character.class) {
    case 'Barbarian': {
      if (!nodes_map.expertise) {
        throw 'Barbarian nodes_map missing expertise'
      }
      const barbarian_character =
        player_character as BarbarianCharacter
      if (barbarian_character.mainHand) {
        let main_hand_encoding: number
        switch (barbarian_character.mainHand.weaponType) {
          case 'sword':
            nodes_map['modifier'][
              'one-hand-slashing-damage'
            ].AddValue(barbarian_character.mainHand.weaponDamage ?? 0)
            main_hand_encoding = 0
            break
          case 'axe':
            nodes_map['modifier'][
              'one-hand-slashing-damage'
            ].AddValue(barbarian_character.mainHand.weaponDamage ?? 0)
            main_hand_encoding = 1
            break
          case 'mace':
            nodes_map['modifier'][
              'one-hand-bludgeon-damage'
            ].AddValue(barbarian_character.mainHand.weaponDamage ?? 0)
            main_hand_encoding = 2
            break
          default:
            throw 'Unsupported weapon type for Barbarian Main hand detected.'
        }
        nodes_map['modifier']['main-hand-weapon'].AddValue(
          main_hand_encoding,
        )
        nodes_map['modifier']['main-hand-attack-speed'].SetValue =
          barbarian_character.mainHand.attackSpeed ?? 0
      }
      if (barbarian_character.offHand) {
        let off_hand_encoding: number
        switch (barbarian_character.offHand.weaponType) {
          case 'sword':
            nodes_map['modifier'][
              'one-hand-slashing-damage'
            ].AddValue(barbarian_character.offHand.weaponDamage ?? 0)
            off_hand_encoding = 0
            break
          case 'axe':
            nodes_map['modifier'][
              'one-hand-slashing-damage'
            ].AddValue(barbarian_character.offHand.weaponDamage ?? 0)
            off_hand_encoding = 1
            break
          case 'mace':
            nodes_map['modifier'][
              'one-hand-bludgeon-damage'
            ].AddValue(barbarian_character.offHand.weaponDamage ?? 0)
            off_hand_encoding = 2
            break
          default:
            off_hand_encoding = -1
        }
        nodes_map['modifier']['off-hand-weapon'].AddValue(
          off_hand_encoding,
        )
        nodes_map['modifier']['off-hand-attack-speed'].SetValue =
          barbarian_character.offHand.attackSpeed ?? 0
      }

      if (barbarian_character.twoHandedSlashing) {
        let two_hand_slashing_encoding: number
        switch (barbarian_character.twoHandedSlashing.weaponType) {
          case 'two-handed-sword':
            two_hand_slashing_encoding = 0
            break
          case 'two-handed-axe':
            two_hand_slashing_encoding = 1
            break
          case 'polearm':
            two_hand_slashing_encoding = 2
            break
          default:
            two_hand_slashing_encoding = 0
        }
        nodes_map['modifier']['two-hand-slashing-weapon'].SetValue =
          two_hand_slashing_encoding
        nodes_map['modifier']['two-hand-slashing-damage'].AddValue(
          barbarian_character.twoHandedSlashing.weaponDamage ?? 0,
        )
        nodes_map['modifier'][
          'two-hand-slashing-attack-speed'
        ].SetValue =
          barbarian_character.twoHandedSlashing.attackSpeed ?? 0
      }

      if (barbarian_character.twoHandedBludgeoning) {
        nodes_map['modifier']['two-hand-bludgeon-weapon'].SetValue = 0
        nodes_map['modifier']['two-hand-bludgeon-damage'].AddValue(
          barbarian_character.twoHandedBludgeoning.weaponDamage ?? 0,
        )
        nodes_map['modifier'][
          'two-hand-bludgeon-attack-speed'
        ].SetValue =
          barbarian_character.twoHandedBludgeoning.attackSpeed ?? 0
      }

      if (barbarian_character?.expertise) {
        nodes_map['expertise'].SetValue =
          barbarian_character.expertise
      }
      break
    }
    case 'Necromancer': {
      if (!nodes_map.book_of_the_dead) {
        throw 'Necromancer nodes_map missing book_of_the_dead'
      }
      const necromancer_character =
        player_character as NecromancerCharacter
      if (
        necromancer_character.mainHand &&
        necromancer_character.offHand
      ) {
        if (necromancer_character.offHand.weaponType == 'shield') {
          nodes_map['modifier']['weapon-damage'].AddValue(
            1.8 * (necromancer_character.mainHand.weaponDamage ?? 0),
          )
          nodes_map['modifier']['weapon-attack-speed'].SetValue =
            necromancer_character.mainHand.attackSpeed ?? 0
        } else {
          nodes_map['modifier']['weapon-damage'].AddValue(
            (necromancer_character.mainHand.weaponDamage ?? 0) +
              (necromancer_character.offHand.weaponDamage ?? 0),
          )
          nodes_map['modifier']['weapon-attack-speed'].SetValue =
            ((necromancer_character.mainHand.attackSpeed ?? 0) +
              (necromancer_character.offHand.attackSpeed ?? 0)) /
            2
        }
      }

      if (
        necromancer_character.mainHand &&
        !necromancer_character.offHand
      ) {
        nodes_map['modifier']['weapon-damage'].AddValue(
          necromancer_character.mainHand.weaponDamage ?? 0,
        )
        nodes_map['modifier']['weapon-attack-speed'].SetValue =
          necromancer_character.mainHand.attackSpeed ?? 0
      }

      if (
        !necromancer_character.mainHand &&
        necromancer_character.offHand &&
        necromancer_character.offHand.weaponType != 'shield'
      ) {
        nodes_map['modifier']['weapon-damage'].AddValue(
          necromancer_character.offHand.weaponDamage ?? 0,
        )
        nodes_map['modifier']['weapon-attack-speed'].SetValue =
          necromancer_character.offHand.attackSpeed ?? 0
      }

      const book_of_the_dead_value: BookOfTheDeadValue = {}
      if (necromancer_character.bookOfTheDead) {
        if (
          'skeletalWarriors' in necromancer_character.bookOfTheDead
        ) {
          book_of_the_dead_value['skeletal-warriors'] =
            necromancer_character.bookOfTheDead.skeletalWarriors
        }
        if ('skeletalMages' in necromancer_character.bookOfTheDead) {
          book_of_the_dead_value['skeletal-mages'] =
            necromancer_character.bookOfTheDead.skeletalMages
        }
        if ('golem' in necromancer_character.bookOfTheDead) {
          book_of_the_dead_value['golem'] =
            necromancer_character.bookOfTheDead.golem
        }
      }

      nodes_map['book_of_the_dead'].SetValue = book_of_the_dead_value
      break
    }
    case 'Druid': {
      if (!nodes_map.spirit_boon) {
        throw 'Druid nodes_map missing spirit_boon.'
      }
      const druid_character = player_character as DruidCharacter
      if (druid_character.mainHand && druid_character.offHand) {
        nodes_map['modifier']['weapon-damage'].AddValue(
          (druid_character.mainHand.weaponDamage ?? 0) +
            (druid_character.offHand.weaponDamage ?? 0),
        )
        nodes_map['modifier']['weapon-attack-speed'].SetValue =
          ((druid_character.mainHand.attackSpeed ?? 0) +
            (druid_character.offHand.attackSpeed ?? 0)) /
          2
      }

      if (druid_character.mainHand && !druid_character.offHand) {
        nodes_map['modifier']['weapon-damage'].AddValue(
          druid_character.mainHand.weaponDamage ?? 0,
        )
        nodes_map['modifier']['weapon-attack-speed'].SetValue =
          druid_character.mainHand.attackSpeed ?? 0
      }

      if (!druid_character.mainHand && druid_character.offHand) {
        nodes_map['modifier']['weapon-damage'].AddValue(
          druid_character.offHand.weaponDamage ?? 0,
        )
        nodes_map['modifier']['weapon-attack-speed'].SetValue =
          druid_character.offHand.attackSpeed ?? 0
      }
      if (druid_character.spiritBoon) {
        nodes_map['spirit_boon'].SetValue = druid_character.spiritBoon
      }
      break
    }
    case 'Rogue': {
      if (!nodes_map.specialization) {
        throw 'Rogue nodes_map missing specialization.'
      }
      const rogue_character = player_character as RogueCharacter
      if (rogue_character.mainHand && rogue_character.offHand) {
        nodes_map['modifier']['dual-wield-weapon-damage'].AddValue(
          (rogue_character.mainHand.weaponDamage ?? 0) +
            (rogue_character.offHand.weaponDamage ?? 0),
        )
        nodes_map['modifier']['dual-wield-attack-speed'].SetValue =
          ((rogue_character.mainHand.attackSpeed ?? 0) +
            (rogue_character.offHand.attackSpeed ?? 0)) /
          2
      }

      if (rogue_character.mainHand && !rogue_character.offHand) {
        nodes_map['modifier']['dual-wield-weapon-damage'].AddValue(
          rogue_character.mainHand.weaponDamage ?? 0,
        )
        nodes_map['modifier']['dual-wield-attack-speed'].SetValue =
          rogue_character.mainHand.attackSpeed ?? 0
      }

      if (!rogue_character.mainHand && rogue_character.offHand) {
        nodes_map['modifier']['dual-wield-weapon-damage'].AddValue(
          rogue_character.offHand.weaponDamage ?? 0,
        )
        nodes_map['modifier']['dual-wield-attack-speed'].SetValue =
          rogue_character.offHand.attackSpeed ?? 0
      }

      if (rogue_character.ranged) {
        nodes_map['modifier']['ranged-weapon-damage'].AddValue(
          rogue_character.ranged.weaponDamage ?? 0,
        )
        nodes_map['modifier']['ranged-weapon-attack-speed'].SetValue =
          rogue_character.ranged.attackSpeed ?? 0
      }

      if (rogue_character.mainHand) {
        let main_hand_encoding: number
        switch (rogue_character.mainHand.weaponType) {
          case 'sword':
            main_hand_encoding = 0
            break
          case 'dagger':
            main_hand_encoding = 1
            break
          default:
            throw 'Unsupported weapon type for Rogue Main hand detected.'
        }
        nodes_map['modifier']['main-hand-weapon'].AddValue(
          main_hand_encoding,
        )
      }
      if (rogue_character.offHand) {
        let off_hand_encoding: number
        switch (rogue_character.offHand.weaponType) {
          case 'sword':
            off_hand_encoding = 0
            break
          case 'dagger':
            off_hand_encoding = 1
            break
          default:
            off_hand_encoding = -1
        }
        nodes_map['modifier']['off-hand-weapon'].AddValue(
          off_hand_encoding,
        )
      }
      if (rogue_character.ranged) {
        let ranged_encoding: number
        switch (rogue_character.ranged.weaponType) {
          case 'bow':
            ranged_encoding = 0
            break
          case 'crossbow':
            ranged_encoding = 1
            break
          default:
            ranged_encoding = -1
        }
        nodes_map['modifier']['ranged-weapon'].AddValue(
          ranged_encoding,
        )
      }
      if (rogue_character?.specialization) {
        nodes_map['specialization'].SetValue =
          rogue_character.specialization
      }
      break
    }
    case 'Sorcerer': {
      if (!nodes_map.enchantment) {
        throw 'Sorcerer nodes_map missing enchantments'
      }
      const sorcerer_character = player_character as SorcererCharacter
      if (sorcerer_character.mainHand && sorcerer_character.offHand) {
        nodes_map['modifier']['weapon-damage'].AddValue(
          (sorcerer_character.mainHand.weaponDamage ?? 0) +
            (sorcerer_character.offHand.weaponDamage ?? 0),
        )
        nodes_map['modifier']['weapon-attack-speed'].SetValue =
          ((sorcerer_character.mainHand.attackSpeed ?? 0) +
            (sorcerer_character.offHand.attackSpeed ?? 0)) /
          2
      }

      if (
        sorcerer_character.mainHand &&
        !sorcerer_character.offHand
      ) {
        nodes_map['modifier']['weapon-damage'].AddValue(
          sorcerer_character.mainHand.weaponDamage ?? 0,
        )
        nodes_map['modifier']['weapon-attack-speed'].SetValue =
          sorcerer_character.mainHand.attackSpeed ?? 0
      }

      if (
        !sorcerer_character.mainHand &&
        sorcerer_character.offHand
      ) {
        nodes_map['modifier']['weapon-damage'].AddValue(
          sorcerer_character.offHand.weaponDamage ?? 0,
        )
        nodes_map['modifier']['weapon-attack-speed'].SetValue =
          sorcerer_character.offHand.attackSpeed ?? 0
      }
      if (sorcerer_character?.enchantments?.[0]) {
        nodes_map?.enchantment?.AddValue(
          sorcerer_character.enchantments[0],
        )
      }
      if (sorcerer_character?.enchantments?.[1]) {
        nodes_map?.enchantment?.AddValue(
          sorcerer_character.enchantments[1],
        )
      }
      break
    }
    default:
      break
  }

  for (const [talent_name, points] of Object.entries(
    player_character.talents,
  )) {
    nodes_map['talent'][talent_name].AddTalent(points)
  }

  // (TODO) Add function which checks active toggles and modifies the player_character to only have the active toggles.
  for (const [toggle_name, toggle] of Object.entries(
    player_character.toggles,
  )) {
    if (!nodes_map['toggle'][toggle_name]) {
      console.log('Non-existant toggle found', toggle_name)
    } else {
      nodes_map['toggle'][toggle_name].SetValue = toggle
    }
  }
  for (const attribute of [
    'strength',
    'dexterity',
    'intelligence',
    'willpower',
  ]) {
    if (player_character?.paragons?.attributes) {
      const value =
        player_character.paragons.attributes[
          attribute as keyof ParagonAttributes
        ]
      if (value) {
        nodes_map['paragon_modifier'][attribute].AddValue(value)
      }
    }
  }
  if (player_character?.paragons?.modifiers) {
    for (const [mod_name, value] of player_character.paragons
      .modifiers) {
      if (typeof value === 'undefined') {
        console.log(
          'Undefined value for paragon modifier: ' + mod_name,
        )
      } else if (mod_name in nodes_map['paragon_modifier']) {
        nodes_map['paragon_modifier'][mod_name].AddValue(value)
      } else {
        console.log('Unknown paragon modifier: ' + mod_name)
      }
    }
  }
  if (player_character?.paragons?.powers) {
    for (const paragon_name of player_character.paragons.powers) {
      if (paragon_name in nodes_map['paragon']) {
        nodes_map['paragon'][paragon_name].SetValue = true
      } else {
        console.log(
          'Unknown paragon power for class: ' +
            player_character.class +
            ' power: ' +
            paragon_name,
        )
      }
    }
  }

  if (player_character?.vampiricPowers) {
    for (const vampiric_name of player_character.vampiricPowers) {
      if (vampiric_name in nodes_map['vampiric']) {
        nodes_map['vampiric'][vampiric_name].SetValue = true
      }
    }
  }

  if (player_character.bonusPowers) {
    if (player_character.bonusPowers.modifiers) {
      for (const [mod_name, value] of player_character.bonusPowers
        .modifiers) {
        if (typeof value === 'string') {
          console.log(
            'Value not a number error: ' +
              'Bonus Modifier: ' +
              mod_name +
              ' Value: ' +
              String(value),
          )
          continue
        }
        if (mod_name in nodes_map.talent_modifier_map) {
          for (const talent_name of nodes_map.talent_modifier_map[
            mod_name
          ]) {
            if (!(talent_name in nodes_map['talent'])) {
              console.log('Talent not found error: ' + talent_name)
              continue
            }
            nodes_map['talent'][talent_name].AddTalentModifier(value)
          }
        } else {
          if (!mod_name) {
            continue
          }
          if (!(mod_name in nodes_map['modifier'])) {
            console.log(
              'Mod not found in modifier map. Mod name: ' + mod_name,
            )
            continue
          }
          nodes_map['modifier'][mod_name].AddValue(value)
        }
      }
    }
    if (
      player_character.bonusPowers.aspect &&
      player_character.bonusPowers.aspect instanceof Array
    ) {
      const aspect = player_character.bonusPowers.aspect

      if (aspect.length != 2 || !(aspect[0] in nodes_map['aspect'])) {
        throw 'Bonus aspect error. Aspect length should be 2 and be present in nodes_map.'
      }
      let aspect_val_error = false
      for (const aspect_val of aspect[1]) {
        if (aspect_val && !(typeof aspect_val == 'number')) {
          aspect_val_error = true
        }
      }
      if (aspect_val_error) {
        throw (
          'Aspect value not a number error: ' + aspect[1].toString()
        )
      }
      nodes_map['aspect'][aspect[0]].AddAspect(aspect[1])
      // (Unique) Harlequin-Crest: "Gain {5/8}% damage Reduction .In addition, gain +4.0 Ranks to all Skills."
      // Misses skills which are purely buffs. Better to use a skills list.
      if (aspect[0] == 'harlequin-crest') {
        for (const skill_name in nodes_map['skill']) {
          if (!skillVal(nodes_map, skill_name).tags.has('ultimate')) {
            nodes_map['talent'][skill_name].AddTalentModifier(4)
          }
        }
      }
    }
  }
  nodes_map['aggregation'] = CreateAggregationNodes(nodes_map)
  nodes_map['all_skills'] = new AllSkillsNode(
    player_character.abilities ?? [],
  )
}

export function ComputeSkillReturn(
  class_name: string,
  ability_name: string | null,
  nodes_map: NodesMap,
  weapon_type: string | null = null,
): SkillReturn | null {
  if (!nodes_map['skill']) {
    throw 'Cannot compute skill returns since there are no skill nodes in nodes_map.'
  }
  if (ability_name == null || !(ability_name in nodes_map['skill'])) {
    return null
  }

  const next_ability = nodes_map['skill'][ability_name]
  // if (nodes_map['current_skill']) {
  //   for (const child_node of nodes_map['current_skill']._children) {
  //     next_ability.AddChild(child_node)
  //   }
  // }
  nodes_map['current_skill'] = next_ability
  for (const stat in nodes_map['stat']) {
    nodes_map['stat'][stat].ClearVal()
  }
  for (const trigger in nodes_map['trigger']) {
    nodes_map['trigger'][trigger].ClearVal()
  }
  nodes_map?.tags?.ClearVal()

  // We only set the weapon type for Barbarian which can attach weapons to skills.
  if (
    weapon_type &&
    class_name == 'Barbarian' &&
    nodes_map['stat']?.['Weapon_Type']
  ) {
    switch (weapon_type) {
      case 'dual-wield':
        nodes_map['stat']['Weapon_Type'].SetValue = 0
        break
      case 'two-handed-slashing':
        nodes_map['stat']['Weapon_Type'].SetValue = 1
        break
      case 'two-handed-bludgeoning':
        nodes_map['stat']['Weapon_Type'].SetValue = 2
        break
      default:
        console.log(
          'Invalid weapon type found',
          weapon_type,
          'for skill',
          ability_name + '.',
        )
        break
    }
  }

  // Looks like this was too clever for it's own good. Doesn't seem
  // like there's significant performance gains from doing this.
  // BFS to clear dependent nodes.
  // {
  //   const queue = [
  //     nodes_map['current_skill'],
  //     nodes_map['presim'][class_name.toLowerCase()],
  //   ]
  //   const seen = new Set([
  //     nodes_map['current_skill']._name,
  //     nodes_map['presim'][class_name.toLowerCase()]._name,
  //   ])
  //   while (queue.length > 0) {
  //     const current = queue[0]
  //     for (const node_identifier of current._children) {
  //       if (!seen.has(node_identifier)) {
  //         seen.add(node_identifier)
  //         const [node_type, node_name] = node_identifier.split(':')
  //         let new_node: ComputeNode
  //         // console.log(node_identifier);
  //         if (
  //           ['tags', 'book_of_the_dead', 'spirit_boon'].includes(
  //             node_type,
  //           )
  //         ) {
  //           new_node = nodes_map[node_type]
  //         } else {
  //           new_node = nodes_map[node_type][node_name]
  //         }
  //         new_node.ClearVal()
  //         queue.push(new_node)
  //       }
  //     }
  //     queue.shift()
  //   }
  // }

  if (statVal(nodes_map, 'Total_Attack_Speed') == 0) {
    return {
      _skill_name: ability_name,
      _flat_damage: 0,
      _skill_flat_damage: 0,
      _dot_damage: 0,
      _skill_dot_damage: 0,
      _attack_speed: 0,
      _cooldown_seconds: statVal(nodes_map, 'Cooldown'),
      _elapsed_time_seconds: 0,

      // Average probability of critical strike with this attack. If the attack does
      // multiple hits the crit is averaged over all hits.
      _critical_strike_chance: statVal(nodes_map, 'Critical_Chance'),

      // Average probability of critical strike damage multiplier with this attack.
      // If the attack does multiple hits the crit is averaged over all hits.
      _critical_strike_damage: statVal(
        nodes_map,
        'Critical_Multiplier',
      ),

      _lucky_hit_chance: statVal(
        nodes_map,
        'Total_Lucky_Hit_Chance_Multiplier',
      ),

      _average_hits: 0,

      _number_enemies_hit: 0,

      _enemy_kills: 0,

      _number_of_cast: 0,

      // Change in resource from using the skill. Can be positive or negative.
      _delta_resources: statVal(nodes_map, 'Delta_Resources'),

      _delta_resources_from_skill: statVal(
        nodes_map,
        'Delta_Resources_Per_Cast',
      ),

      _resource_gain: nodes_map['stat']?.Resource_Gain
        ? nodes_map['stat']?.Resource_Gain.GetValue
        : 0,

      _resource_cost: nodes_map['stat']?.Resource_Cost
        ? nodes_map['stat']?.Resource_Cost.GetValue
        : 0,

      _max_resource: nodes_map['stat']?.Max_Resource.GetValue,

      _dot_duration: statVal(nodes_map, 'Max_Dot_Duration'),

      _overpower_chance: statVal(nodes_map, 'Overpower_Chance'),

      _weapon_type:
        class_name == 'Barbarian'
          ? statVal(nodes_map, 'Weapon_Type')
          : -1,

      _generated_combo_points:
        class_name == 'Rogue'
          ? statVal(nodes_map, 'Combo_Points_Generated')
          : 0,

      _shapeshift_form:
        class_name == 'Druid'
          ? statVal(nodes_map, 'Shapeshift_Form')
          : -1,

      _passive_companion_dps: 0,

      _crackling_energy_created:
        class_name == 'Sorcerer'
          ? statVal(nodes_map, 'Crackling_Energy_Created')
          : 0,

      _blood_orb_gain:
        class_name == 'Necromancer'
          ? statVal(nodes_map, 'Blood_Orb_Gain')
          : 0,

      _corpse_cost:
        class_name == 'Necromancer'
          ? statVal(nodes_map, 'Corpse_Cost')
          : 0,

      _corpse_gain:
        class_name == 'Necromancer'
          ? statVal(nodes_map, 'Corpse_Gain')
          : 0,
    }
  }

  let passive_companion_dps = 0
  switch (currentSkillVal(nodes_map).name) {
    case 'wolves':
      passive_companion_dps = statVal(nodes_map, 'Wolves_Passive_DPS')
      break
    case 'ravens':
      passive_companion_dps = statVal(nodes_map, 'Ravens_Passive_DPS')
      break
    case 'poison-creeper':
      passive_companion_dps = statVal(
        nodes_map,
        'Poison_Creeper_Passive_DPS',
      )
      break
    default:
      break
  }

  return {
    _skill_name: ability_name,

    _flat_damage: triggerVal(nodes_map, 'Total_Flat_Damage'),

    _skill_flat_damage:
      triggerVal(nodes_map, 'Flat_Damage') +
      triggerVal(nodes_map, 'Non_Skill_Flat_Damage'),

    _dot_damage: triggerVal(nodes_map, 'Total_Damage_Over_Time'),

    _skill_dot_damage:
      triggerVal(nodes_map, 'Skill_Dot_Damage') +
      triggerVal(nodes_map, 'Non_Skill_Dot_Damage'),

    _attack_speed: statVal(nodes_map, 'Total_Attack_Speed'),

    // This is the cooldown of a skill if there is one, not the attack speed.
    _cooldown_seconds: statVal(nodes_map, 'Cooldown'),

    // The amount of time until the next skill is available after using this move.
    // It is different than 1 / _attack_speed because of channeled moves which are
    // maintained for multiple attacks.
    _elapsed_time_seconds: statVal(nodes_map, 'Elapsed_Time'),

    // Average probability of critical strike with this attack. If the attack does
    // multiple hits the crit is averaged over all hits.
    _critical_strike_chance: statVal(nodes_map, 'Critical_Chance'),

    // Average probability of critical strike damage multiplier with this attack.
    // If the attack does multiple hits the crit is averaged over all hits.
    _critical_strike_damage: statVal(
      nodes_map,
      'Critical_Multiplier',
    ),

    _lucky_hit_chance: statVal(
      nodes_map,
      'Total_Lucky_Hit_Chance_Multiplier',
    ),

    _average_hits: statVal(nodes_map, 'Total_Hits'),

    _number_enemies_hit: statVal(nodes_map, 'Number_Enemies_Hit'),

    _enemy_kills: statVal(nodes_map, 'Enemies_Killed'),

    _number_of_cast: statVal(nodes_map, 'Number_Of_Cast'),

    // Change in resource from using the skill. Can be positive or negative.
    _delta_resources: statVal(nodes_map, 'Delta_Resources'),

    _delta_resources_from_skill: statVal(
      nodes_map,
      'Delta_Resources_Per_Cast',
    ),

    _resource_gain: nodes_map['stat']?.Resource_Gain
      ? nodes_map['stat']?.Resource_Gain.GetValue
      : 0,

    _resource_cost: nodes_map['stat']?.Resource_Cost
      ? nodes_map['stat']?.Resource_Cost.GetValue
      : 0,

    _max_resource: nodes_map['stat']?.Max_Resource.GetValue,

    _dot_duration: statVal(nodes_map, 'Max_Dot_Duration'),

    _overpower_chance: statVal(nodes_map, 'Overpower_Chance'),

    _weapon_type:
      class_name == 'Barbarian'
        ? statVal(nodes_map, 'Weapon_Type')
        : 0,

    _generated_combo_points:
      class_name == 'Rogue'
        ? statVal(nodes_map, 'Combo_Points_Generated')
        : 0,

    _shapeshift_form:
      class_name == 'Druid'
        ? statVal(nodes_map, 'Shapeshift_Form')
        : 0,

    _passive_companion_dps: passive_companion_dps,

    _crackling_energy_created:
      class_name == 'Sorcerer'
        ? statVal(nodes_map, 'Crackling_Energy_Created')
        : 0,

    _blood_orb_gain:
      class_name == 'Necromancer'
        ? statVal(nodes_map, 'Blood_Orb_Gain')
        : 0,

    _corpse_cost:
      class_name == 'Necromancer'
        ? statVal(nodes_map, 'Corpse_Cost')
        : 0,

    _corpse_gain:
      class_name == 'Necromancer'
        ? statVal(nodes_map, 'Corpse_Gain')
        : 0,
  }
}

function CreateWaitSkill(nodes_map: NodesMap): SkillReturn {
  return {
    _skill_name: 'wait',
    _elapsed_time_seconds: 0.5,
    _flat_damage: statVal(nodes_map, 'Passive_Dps') * 0.5,
    _skill_flat_damage: 0,
    _dot_damage: 0,
    _skill_dot_damage: 0,
    _dot_duration: 0,
    _cooldown_seconds: 0,
    _delta_resources: Math.max(
      statVal(nodes_map, 'Resource_Regeneration_Per_Second') * 0.5,
      0.0001,
    ),
    _delta_resources_from_skill: 0,
    _resource_cost: 0,
    _max_resource: statVal(nodes_map, 'Max_Resource'),
    _resource_gain: Math.max(
      statVal(nodes_map, 'Resource_Regeneration_Per_Second') * 0.5,
      0.0001,
    ),
    _critical_strike_chance: 0,
    _overpower_chance: 0,
    _lucky_hit_chance: 0,
    _average_hits: 0,
    _number_enemies_hit: 0,
    _enemy_kills: 0,
    _number_of_cast: 1,
    _crackling_energy_created: 0,
    _generated_combo_points: 0,
    _blood_orb_gain: 0,
    _corpse_cost: 0,
    _corpse_gain: 0,
    _attack_speed: 0,
    _critical_strike_damage: 0,
    _weapon_type: -1,
    _shapeshift_form: -1,
    _passive_companion_dps: 0,
  }
}

export function ComputeSkillReturnsBeforeUpdate(
  nodes_map: NodesMap,
  player_character: PlayerCharacter,
): Record<string, SkillReturn> {
  if (!nodes_map['skill']) {
    throw 'Cannot compute skill returns since there are no skill nodes in nodes_map.'
  }
  // Computing skill returns and offense summary.
  const skill_returns: Record<string, SkillReturn> = {}
  const abilities = player_character.abilities ?? []
  let ability_weapons: (string | null)[] = []
  if (player_character.class == 'Barbarian') {
    const barbarian = player_character as BarbarianCharacter
    ability_weapons = barbarian.abilityWeapons ?? []
  }
  for (let i = 0; i < abilities.length; i++) {
    const skill = abilities[i]
    if (!skill || !(skill in nodes_map['skill'])) {
      continue
    }
    let skill_return: SkillReturn | null
    if (i < ability_weapons.length && ability_weapons[i]) {
      skill_return = ComputeSkillReturn(
        player_character.class,
        skill,
        nodes_map,
        ability_weapons[i],
      )
    } else {
      skill_return = ComputeSkillReturn(
        player_character.class,
        skill,
        nodes_map,
      )
    }
    if (skill_return) {
      skill_returns[skill] = skill_return
    }
  }

  skill_returns['wait'] = CreateWaitSkill(nodes_map)

  return skill_returns
}

function ComputeAllSkillReturns(
  nodes_map: NodesMap,
  player_character: PlayerCharacter,
): Record<string, SkillReturn> {
  const skill_returns = ComputeSkillReturnsBeforeUpdate(
    nodes_map,
    player_character,
  )
  UpdateSpecialSkills(skill_returns, player_character, nodes_map)

  return skill_returns
}

function BasicSkill(
  abilities: string[],
  nodes_map: NodesMap,
): string | null {
  if (!abilities) {
    return null
  }
  if (!nodes_map['skill']) {
    throw 'Cannot compute skill returns since there are no skill nodes in nodes_map.'
  }
  for (const skill of abilities) {
    if (
      skill in nodes_map['skill'] &&
      skillVal(nodes_map, skill).category == 'basic'
    ) {
      return skill
    }
  }
  return null
}

function CoreSkills(
  abilities: string[],
  nodes_map: NodesMap,
): string[] {
  if (!abilities) {
    return []
  }
  if (!nodes_map['skill']) {
    throw 'Cannot compute skill returns since there are no skill nodes in nodes_map.'
  }
  const core_skills: string[] = []
  for (const skill of abilities) {
    if (
      skill in nodes_map['skill'] &&
      (skillVal(nodes_map, skill).category == 'core' ||
        // Sorcerer mastery skills behave like core skills.
        skillVal(nodes_map, skill).category == 'mastery')
    ) {
      core_skills.push(skill)
    }
  }
  return core_skills
}

function ComputeSkillOutput(
  single_target_skill_return: SkillReturn,
  aoe_skill_return: SkillReturn,
): SkillOutput {
  return {
    _single_target_direct_damage:
      single_target_skill_return._skill_flat_damage,
    _single_target_dot_damage:
      single_target_skill_return._skill_dot_damage,
    _aoe_damage:
      aoe_skill_return._skill_flat_damage +
      aoe_skill_return._skill_dot_damage,
    _attack_speed: aoe_skill_return._attack_speed,
    _delta_resources: aoe_skill_return._delta_resources_from_skill,
    _cooldown_seconds: aoe_skill_return._cooldown_seconds,
    _critical_strike_chance:
      aoe_skill_return._critical_strike_chance * 100,
    _critical_strike_damage:
      (aoe_skill_return._critical_strike_damage - 1) * 100,
    _lucky_hit_chance: aoe_skill_return._lucky_hit_chance * 100,
    _passive_companion_dps: aoe_skill_return._passive_companion_dps,
  }
}

export function GeneratorAndSpenderDPS(
  generator_skill_return: SkillReturn,
  spender_skill_return: SkillReturn,
): number {
  if (generator_skill_return._cooldown_seconds > 0) {
    throw 'Generator cannot have a cooldown.'
  }
  if (generator_skill_return._delta_resources <= 0) {
    return 0
  }
  if (spender_skill_return._delta_resources >= 0) {
    return Math.max(
      (spender_skill_return._flat_damage +
        spender_skill_return._dot_damage) /
        spender_skill_return._elapsed_time_seconds,
      (generator_skill_return._flat_damage +
        generator_skill_return._dot_damage) /
        generator_skill_return._elapsed_time_seconds,
    )
  }

  const cost_ratio =
    -spender_skill_return._delta_resources /
    generator_skill_return._delta_resources
  const damage_per_rotation =
    (generator_skill_return._flat_damage +
      generator_skill_return._dot_damage) *
      cost_ratio +
    (spender_skill_return._flat_damage +
      spender_skill_return._dot_damage)
  const time_per_rotation =
    generator_skill_return._elapsed_time_seconds * cost_ratio +
    spender_skill_return._elapsed_time_seconds

  if (time_per_rotation <= 0) {
    return 0
  }

  return damage_per_rotation / time_per_rotation
}

function ComputeCoreRate(
  generator_skill_return: SkillReturn,
  core_skill_return: SkillReturn,
): number {
  if (generator_skill_return._cooldown_seconds > 0) {
    throw 'Generator cannot have a cooldown.'
  }
  if (generator_skill_return._delta_resources <= 0) {
    return 0
  }
  if (core_skill_return._delta_resources >= 0) {
    return 1
  }
  const cost_ratio =
    -core_skill_return._delta_resources /
    generator_skill_return._delta_resources

  const core_cast_time =
    core_skill_return._elapsed_time_seconds /
    core_skill_return._number_of_cast

  const generator_cast_time =
    generator_skill_return._elapsed_time_seconds /
    generator_skill_return._number_of_cast

  return (
    (core_cast_time * core_skill_return._number_of_cast) /
    (core_cast_time * core_skill_return._number_of_cast +
      generator_cast_time * cost_ratio)
  )
}

function FindOtherCooldowns(
  class_name: string,
  nodes_map: NodesMap,
): Record<string, number> {
  let Class_Cooldowns: Record<string, number>
  switch (class_name) {
    case 'Barbarian':
      Class_Cooldowns = {
        'rallying-cry': statVal(nodes_map, 'Shout_Cooldown'),
        'iron-skin': statVal(nodes_map, 'Iron_Skin_Cooldown'),
        'challenging-shout': statVal(nodes_map, 'Shout_Cooldown'),
        'war-cry': statVal(nodes_map, 'Shout_Cooldown'),
        'wrath-of-the-berserker': statVal(
          nodes_map,
          'Wrath_Of_The_Berserker_Cooldown',
        ),
      }
      break
    case 'Druid':
      Class_Cooldowns = {
        'blood-howl': statVal(nodes_map, 'Blood_Howl_Cooldown'),
        'debilitating-roar': statVal(
          nodes_map,
          'Debilitating_Roar_Cooldown',
        ),
        petrify: statVal(nodes_map, 'Petrify_Cooldown'),
        'grizzly-rage': statVal(nodes_map, 'Grizzly_Rage_Cooldown'),
      }
      break
    case 'Necromancer':
      Class_Cooldowns = {
        'bone-prison': statVal(nodes_map, 'Bone_Prison_Cooldown'),
      }
      break
    case 'Rogue':
      Class_Cooldowns = {
        concealment: statVal(nodes_map, 'Concealment_Cooldown'),
        'smoke-grenade': statVal(nodes_map, 'Smoke_Grenade_Cooldown'),
        'shadow-imbuement': statVal(
          nodes_map,
          'Shadow_Imbuement_Cooldown',
        ),
        'poison-imbuement': statVal(
          nodes_map,
          'Poison_Imbuement_Cooldown',
        ),
        'cold-imbuement': statVal(
          nodes_map,
          'Cold_Imbuement_Cooldown',
        ),
      }
      break
    case 'Sorcerer':
      Class_Cooldowns = {
        'ice-armor': statVal(nodes_map, 'Ice_Armor_Cooldown'),
        'frost-nova': statVal(nodes_map, 'Frost_Nova_Cooldown'),
      }
      break
    default:
      console.log('Unknown class: ' + class_name + '.')
      return {}
  }
  const other_cooldowns: Record<string, number> = {}
  for (const skill_name of allSkillsVal(nodes_map)) {
    if (skill_name in Class_Cooldowns) {
      other_cooldowns[skill_name] = Class_Cooldowns[skill_name]
    }
  }

  return other_cooldowns
}

/*
Computes the DPS from a list of:
    * Damage
    * Attack Speed
    * Cooldown
    * Delta resources
for each skill. We use a simulation with a rotation that's
more or less greedy (take the best option) according to some
simple rules.

Challenges with developing a rotation like this are:
    * Some skills will have higher damage at the cost of higher
      resource costs. The tradeoff depends on the DPS opportunity
      costs of using more generator skills.
    * Which generator you want to use may depend on what spenders are
      off cooldown (which affects the resource/damage tradeoff).

To deal with these challenges we use the following rules:
    * Divide skills into generators, spenders and other. Generators
      return positive resources and have no cooldown. Spenders cost
      resources (also can have a cooldown). Others are skills with
      no cost but have a cooldown.
    * For each spender, find the generator which has the optimal
      rotation with it. This will be used whener that spender is
      the higher priority spender at the time.
    * Rank all the skills according to their rotation DPS. For a
      spender, the rotation dps is the dps of its best
      spender/generator rotation. For generator and other skills,
      the rotation dps is just the dps of that skill.
    * Use the following algorithm:
        * When resources > 0, take the highest rank skill off cooldown.
        * When resources < 0, look at the highest rank skill off
          cooldown and use its generator. For generator or other skills,
          they are their own generator.
    * We halt the rotation once the dps is sufficiently stabilized
      (to be defined).
*/
function DimSum(skill_returns: Record<string, SkillReturn>): number {
  const [flat_dps, dot_dps] = DimSumSplit(skill_returns)
  return flat_dps + dot_dps
}

export function DimSumSplit(
  skill_returns: Record<string, SkillReturn>,
): [number, number] {
  // Remove null skills.
  const skills = []
  for (const skill in skill_returns) {
    if (skill) {
      skills.push(skill_returns[skill])
    }
  }

  const n = skills.length
  if (n == 0) {
    return [0, 0]
  }

  const skill_generator_dps = SetUpAndRankSkillReturns(
    skill_returns,
    DpsSkillRankFn,
  )
  const cooldowns = new Array<number>(n).fill(0)
  let resources = 0
  let time = 0
  let damage = 0
  let flat_damage = 0
  let dot_damage = 0
  let dps = 0
  let small_step = 0
  let step = 0
  let corpses = 0
  do {
    step += 1
    for (const skill_tuple of skill_generator_dps) {
      const index = skill_generator_dps.indexOf(skill_tuple)
      if (
        cooldowns[index] == 0 &&
        corpses >= skill_tuple[0]._corpse_cost
      ) {
        let skill
        if (resources >= 0) {
          // Use the skill.
          skill = skill_tuple[0]
        } else {
          // Use the corresponding generator.
          skill = skill_tuple[1]
        }
        const dt = skill._elapsed_time_seconds
        time += dt
        cooldowns.forEach((value, j) => {
          cooldowns[j] = Math.max(value - dt, 0)
        })
        // If this was the generator, the skill is off cooldown
        // and the generator always has no cooldown. So its
        // okay.
        cooldowns[index] = skill._cooldown_seconds
        resources += skill._delta_resources
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

        break
      }
    }
    if (Math.abs(damage / time - dps) / dps < 0.01) {
      small_step += 1
    } else {
      small_step = 0
    }
    dps = damage / time
    // (TODO) change this to be the difference is small for k steps.
  } while (small_step < 10 && step < 1000)
  return [flat_damage / time, dot_damage / time]
}
