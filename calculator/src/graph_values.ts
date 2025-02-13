import {
  BarbarianPreSimReturn,
  DruidPreSimReturn,
  NecromancerPreSimReturn,
  RoguePreSimReturn,
  SorcererPreSimReturn,
} from './class_based_sims'
import { NodesMap } from './computation_graph'
import { SpiritBoon } from './player_character'

export function modifierVal(
  nodes_map: NodesMap,
  node_name: string,
): number {
  if (!nodes_map.modifier) {
    console.log('There are no modifiers in nodes_map!')
    return 0
  }
  if (!(node_name in nodes_map.modifier)) {
    console.log('Unknown modifier name ', node_name, '.')
    return 0
  }
  return nodes_map.modifier[node_name].GetValue
}

export function aspectVal(
  nodes_map: NodesMap,
  node_name: string,
): number[] {
  if (!nodes_map.aspect) {
    console.log('There are no aspects in nodes_map!')
    return []
  }
  if (!(node_name in nodes_map.aspect)) {
    console.log('Unknown aspect name ', node_name, '.')
    return []
  }
  return nodes_map.aspect[node_name].GetValue
}

export function talentVal(
  nodes_map: NodesMap,
  node_name: string,
): number {
  if (!nodes_map.talent) {
    console.log('There are no talents in nodes_map!')
    return 0
  }
  if (!(node_name in nodes_map.talent)) {
    console.log('Unknown talent name ', node_name, '.')
    return 0
  }
  return nodes_map.talent[node_name].GetValue
}

export function toggleVal(
  nodes_map: NodesMap,
  node_name: string,
): number | boolean | string {
  if (!nodes_map.toggle) {
    console.log('There are no toggles in nodes_map!')
    return 0
  }
  if (!(node_name in nodes_map.toggle)) {
    console.log('Unknown toggle name ', node_name, '.')
    return 0
  }
  return nodes_map.toggle[node_name].GetValue
}

export function skillVal(
  nodes_map: NodesMap,
  node_name: string,
): {
  name: string
  category: string
  tags: Set<string>
  modifiers: { flat: number; dot: number }
  cooldown_seconds: number
  base_resources_generated: number
  lucky_hit_chance: number
} {
  if (!nodes_map.skill) {
    console.log('There are no skills in nodes_map!')
    return {
      name: '',
      category: '',
      tags: new Set<string>(),
      modifiers: { flat: 0, dot: 0 },
      cooldown_seconds: 0,
      base_resources_generated: 0,
      lucky_hit_chance: 0,
    }
  }
  if (!(node_name in nodes_map.skill)) {
    if (node_name != 'wait') {
      console.log('Unknown skill name', node_name, '.')
    }
    return {
      name: '',
      category: '',
      tags: new Set<string>(),
      modifiers: { flat: 0, dot: 0 },
      cooldown_seconds: 0,
      base_resources_generated: 0,
      lucky_hit_chance: 0,
    }
  }
  return nodes_map.skill[node_name].GetValue
}

export function currentSkillVal(nodes_map: NodesMap): {
  name: string
  category: string
  tags: Set<string>
  modifiers: { flat: number; dot: number }
  cooldown_seconds: number
  base_resources_generated: number
  lucky_hit_chance: number
} {
  if (!nodes_map.current_skill) {
    console.log('There is no current_skill in nodes_map!')
    return {
      name: '',
      category: '',
      tags: new Set<string>(),
      modifiers: { flat: 0, dot: 0 },
      cooldown_seconds: 0,
      base_resources_generated: 0,
      lucky_hit_chance: 0,
    }
  }
  return nodes_map.current_skill.GetValue
}

export function baseStatVal(nodes_map: NodesMap): {
  Level: number
  BaseMaxLife: number
  Strength: number
  Intelligence: number
  Willpower: number
  Dexterity: number
} {
  if (!nodes_map.base_stat) {
    console.log('There are no base_stats in nodes_map!')
    return {
      Level: 0,
      BaseMaxLife: 0,
      Strength: 0,
      Intelligence: 0,
      Willpower: 0,
      Dexterity: 0,
    }
  }
  return nodes_map.base_stat.GetValue
}

export function statVal(
  nodes_map: NodesMap,
  node_name: string,
): number {
  if (!nodes_map.stat) {
    console.log('There are no stats in nodes_map!')
    return 0
  }
  if (!(node_name in nodes_map.stat)) {
    console.log('Unknown stat name ', node_name, '.')
    return 0
  }
  return nodes_map.stat[node_name].GetValue
}

export function triggerVal(
  nodes_map: NodesMap,
  node_name: string,
): number {
  if (!nodes_map.trigger) {
    console.log('There are no triggers in nodes_map!')
    return 0
  }
  if (!(node_name in nodes_map.trigger)) {
    console.log('Unknown trigger name ', node_name, '.')
    return 0
  }
  return nodes_map.trigger[node_name].GetValue
}

export function tagsVal(nodes_map: NodesMap): Set<string> {
  if (!nodes_map.tags) {
    console.log('There are no tags in nodes_map!')
    return new Set<string>()
  }
  return nodes_map.tags.GetValue
}

export function allSkillsVal(nodes_map: NodesMap): Set<string> {
  if (!nodes_map.all_skills) {
    console.log('There is no AllSkillsNode in nodes_map!')
    return new Set()
  }
  return nodes_map.all_skills.GetValue
}

export function paragonModifierVal(
  nodes_map: NodesMap,
  node_name: string,
): number {
  if (!nodes_map.paragon_modifier) {
    console.log('There are no paragon modifiers in nodes_map!')
    return 0
  }
  if (!(node_name in nodes_map.paragon_modifier)) {
    console.log('Unknown paragon_modifier name ', node_name, '.')
    return 0
  }
  return nodes_map.paragon_modifier[node_name].GetValue
}

export function paragonVal(
  nodes_map: NodesMap,
  node_name: string,
): boolean {
  if (!nodes_map.paragon) {
    console.log('There are no paragons in nodes_map!')
    return false
  }
  if (!(node_name in nodes_map.paragon)) {
    console.log('Unknown paragon name ', node_name, '.')
    return false
  }
  return nodes_map.paragon[node_name].GetValue
}

export function expertiseVal(
  nodes_map: NodesMap,
):
  | null
  | 'sword'
  | 'axe'
  | 'mace'
  | 'two-handed-sword'
  | 'two-handed-mace'
  | 'two-handed-axe'
  | 'polearm' {
  if (!nodes_map.expertise) {
    console.log('There is no expertise node in nodes_map!')
    return null
  }
  return nodes_map.expertise.GetValue
}

export function bookOfTheDeadVal(
  nodes_map: NodesMap,
  minion_type: 'skeletal-warriors' | 'skeletal-mages' | 'golem',
): [string, 0 | 1 | 2 | 3] {
  if (!nodes_map?.book_of_the_dead) {
    console.log('There is no book of the dead node in nodes_map!')
    switch (minion_type) {
      case 'skeletal-warriors': {
        return ['skirmishers', 0]
      }
      case 'skeletal-mages': {
        return ['shadow', 0]
      }
      case 'golem': {
        return ['bone', 0]
      }
      default:
        return ['unknown', 0]
    }
  }
  if (!(minion_type in nodes_map.book_of_the_dead.GetValue)) {
    return [minion_type, 0]
  }
  return nodes_map.book_of_the_dead.GetValue[minion_type]
}

export function spiritBoonVal(nodes_map: NodesMap): SpiritBoon {
  if (!nodes_map.spirit_boon) {
    console.log('There is no spirit boon node in nodes_map!')
    return {
      deer: [],
      eagle: [],
      snake: [],
      wolf: [],
    }
  }
  return nodes_map.spirit_boon.GetValue
}

export function aggregationVal(
  nodes_map: NodesMap,
  node_name: string,
): number {
  if (!nodes_map.aggregation) {
    console.log('There are no modifier aggregations in nodes_map!')
    return 0
  }
  if (!(node_name in nodes_map.aggregation)) {
    console.log('Unknown aggregation name ', node_name, '.')
    return 0
  }
  return nodes_map.aggregation[node_name].GetValue
}

export function enchantmentVal(nodes_map: NodesMap): Set<string> {
  if (!nodes_map.enchantment) {
    console.log('There is no enchantment node in nodes_map!')
    return new Set<string>()
  }
  return nodes_map.enchantment.GetValue
}

export function specializationVal(
  nodes_map: NodesMap,
): 'combo-points' | 'inner-sight' | 'preparation' {
  if (!nodes_map.specialization) {
    console.log('There is no specialization node in nodes_map!')
    return 'combo-points'
  }
  return nodes_map.specialization.GetValue
}

export function barbarianPresimVal(
  nodes_map: NodesMap,
): BarbarianPreSimReturn {
  if (!nodes_map.presim?.barbarian) {
    console.log('There is no barbarian presim node in nodes_map!')
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

  return nodes_map.presim.barbarian.GetValue
}

export function druidPresimVal(
  nodes_map: NodesMap,
): DruidPreSimReturn {
  if (!nodes_map.presim?.druid) {
    console.log('There is no druid presim node in nodes_map!')
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

  return nodes_map.presim.druid.GetValue
}

export function necromancerPresimVal(
  nodes_map: NodesMap,
): NecromancerPreSimReturn {
  if (!nodes_map.presim?.necromancer) {
    console.log('There is no necromancer presim node in nodes_map!')
    return {
      skill_use_rate: {},
      dot_uptime: 0,
      cross_skill_stat: {},
    }
  }

  return nodes_map.presim.necromancer.GetValue
}

export function roguePresimVal(
  nodes_map: NodesMap,
): RoguePreSimReturn {
  if (!nodes_map.presim?.rogue) {
    console.log('There is no barbarian presim node in nodes_map!')
    return {
      skill_use_rate: {},
      dot_uptime: 0,
      cross_skill_stat: {},
      combo_point_distribution: {},
    }
  }

  return nodes_map.presim.rogue.GetValue
}

export function sorcererPresimVal(
  nodes_map: NodesMap,
): SorcererPreSimReturn {
  if (!nodes_map.presim?.sorcerer) {
    console.log('There is no sorcerer presim node in nodes_map!')
    return {
      skill_use_rate: {},
      dot_uptime: 0,
      cross_skill_stat: {},
      crackling_energy_rate: 0,
      crackling_energy_uptime: 0,
    }
  }

  return nodes_map.presim.sorcerer.GetValue
}

export function malignantHeartVal(
  nodes_map: NodesMap,
  node_name: string,
): number[] {
  if (!nodes_map.malignant_heart) {
    console.log('There are no malignant hearts in nodes_map!')
    return []
  }
  if (!(node_name in nodes_map.malignant_heart)) {
    console.log('Unknown malignant heart name ', node_name, '.')
    return []
  }
  return nodes_map.malignant_heart[node_name].GetValue
}

export function vampiricPowerVal(
  nodes_map: NodesMap,
  node_name: string,
): number[] {
  if (!nodes_map.vampiric) {
    console.log('There are no vampiric powers in nodes_map!')
    return []
  }
  if (!(node_name in nodes_map.vampiric)) {
    console.log('Unknown vampiric power name ', node_name, '.')
    return []
  }
  return nodes_map.vampiric[node_name].GetValue
}

export function seneschalConstructVal(
  nodes_map: NodesMap,
  node_name: string,
): number[] {
  if (!nodes_map.seneschalconstruct) {
    console.log('There is no Seneschal Construct in nodes_map!')
    return []
  }
  if (!(node_name in nodes_map.seneschalconstruct)) {
    console.log('Unknown Seneschal Construct name ', node_name, '.')
    return []
  }
  return nodes_map.seneschalconstruct[node_name].GetValue
}
