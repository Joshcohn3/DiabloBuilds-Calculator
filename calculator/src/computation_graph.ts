import {
  BarbarianPreSimReturn,
  DruidPreSimReturn,
  NecromancerPreSimReturn,
  RoguePreSimReturn,
  SorcererPreSimReturn,
} from './class_based_sims'
import { modifierVal, paragonModifierVal } from './graph_values'
import { SpiritBoon } from './player_character'

/*
This provides the graph implementation for damage computation, both to players and
enemies. The graph consists of nodes of various types which feed into other nodes
used to compute it's output. The graph is directed and must by acyclic for computation
to terminate. The player is expected to update value for root nodes with no dependencies
and all other nodes are computed via propagation through the graph.
*/

export class DiabloNode {
  _name: string
  // Generic name for the value output of a node. Each sub-class
  // provides a function which
  _value: any
  _children: Set<string>
  constructor(name: string) {
    this._name = name
    this._value = null
    this._children = new Set()
  }

  // This is a generic function which should return the output of a particular node.
  // Each sub-class of DiabloNode which is not a root node should override this
  // function.
  get GetValue() {
    return this._value
  }

  // Children should have the form: "<child_node_type>:<child_node_name>".
  AddChild(child_name: string) {
    this._children.add(child_name)
  }
}

export class ModifierNode extends DiabloNode {
  _value: number
  constructor(name: string) {
    super('modifier:' + name)
    this._value = 0
  }

  AddValue(diff: number) {
    const multipliers = new Set([
      'cooldown-reduction',
      'imbuement-cooldown-reduction',
      'rupture-cooldown-reduction',
      'shout-cooldown-reduction',
      'trap-cooldown-reduction',

      'damage-reduction',
      'damage-reduction-from-affected-by-shadow-damage-over-time-enemies',
      'damage-reduction-from-bleeding-enemies',
      'damage-reduction-from-burning-enemies',
      'damage-reduction-from-close-enemies',
      'damage-reduction-from-distant-enemies',
      'damage-reduction-from-poisoned-enemies',
      'damage-reduction-while-fortified',
      'damage-reduction-while-injured',
      'damage-reduction-from-enemies-affected-by-curse-skills', // Bloodmoon Breeches
      'damage-reduction-from-enemies-affected-by-trap-skills', // Scoundrels Leathers

      'dodge-chance-against-close-enemies',
      'dodge-chance-against-distant-enemies',
      'dodge-chance',

      'energy-cost-reduction',
      'essence-cost-reduction',
      'fury-cost-reduction',
      'mana-cost-reduction',
      'spirit-cost-reduction',
      'trap-cooldown-reduction',
      'nature-magic-skill-cooldown-reduction', // Dolmen Stone
    ])
    const mod_name = this._name.split(':')[1]
    if (multipliers.has(mod_name)) {
      this._value = 1 - (1 - this._value) * (1 - diff)
    } else {
      this._value += diff
    }
  }

  set SetValue(value: number) {
    this._value = value
  }

  get GetValue() {
    return this._value
  }
}

export class TalentNode extends DiabloNode {
  _value: number
  _max_talent_points: number
  constructor(name: string, max_talent_points: number) {
    super('talent:' + name)
    this._max_talent_points = max_talent_points
    this._value = 0
  }
  AddTalentModifier(points: number) {
    if (points <= 0) {
      throw (
        'Number of talent points for ' +
        this._name +
        ' must be positive.'
      )
    }

    this._value += Math.floor(points)
    this._max_talent_points += Math.floor(points)
  }

  AddTalent(talent_points: number) {
    if (talent_points < 0) {
      throw (
        'Number of talent points for ' +
        this._name +
        ' must be positive.'
      )
    }

    if (!Number.isInteger(talent_points)) {
      throw (
        'Number of talent points for ' +
        this._name +
        ' must be an integer.'
      )
    }

    if (talent_points > this._max_talent_points) {
      throw (
        'Number of talent points for ' +
        this._name +
        ' must be less than the maximum of ' +
        this._max_talent_points +
        '.'
      )
    }

    this._value += talent_points
  }

  get GetValue() {
    return this._value
  }
}

export class AspectNode extends DiabloNode {
  _value: number[]
  // Player can have multiple of the same aspect equipped. Only the maximum value
  // is accounted for in _value.
  _aspects: number[][]
  // This is the number of values that are variables for this aspect.
  _aspect_length: number
  constructor(name: string, aspect_length: number) {
    super('aspect:' + name)
    this._value = []
    this._aspects = []
    this._aspect_length = aspect_length
  }

  AddAspect(aspect: (number | null)[]) {
    aspect = aspect.filter((num): num is number => num !== null)
    if (aspect.length !== this._aspect_length) {
      console.log(
        `Aspect ${this._name} has the incorrect size. Correct size: ${this._aspect_length}.`,
      )
      return
    }
    const aspectNumbers = aspect as number[]
    this._aspects.push(aspectNumbers)
    // Update _value (best aspect).
    // If _aspect_length = 0, there are no ranks to this aspect.
    if (this._aspect_length === 0) {
      this._value = [0]
      return
    }
    let max_aspect = this._aspects[0]
    let max_value: number | null = aspectNumbers[0] ?? null
    for (const candidate of this._aspects) {
      if (candidate[0] > max_value) {
        max_aspect = candidate
        max_value = candidate[0]
      }
    }
    this._value = max_aspect
  }

  RemoveAspect() {
    this._value = []
    this._aspects = []
  }

  get GetValue() {
    return this._value
  }
}

// NOTE: this class does not capture the display status of the toggle, only it's affect
// on computation. The value for any toggle which is not displayed should be the default,
// but the onus is on the caller of this graph API to enforce that constraint.
export class ToggleNode extends DiabloNode {
  _value: number | boolean | string = false
  _toggle_type: 'number' | 'boolean' | 'string' = 'boolean'
  _allowed_string_values: string[]
  constructor(
    name: string,
    toggle_type: 'number' | 'boolean' | 'string',
    allowed_string_values: string[] = [],
  ) {
    super('toggle:' + name)
    this._toggle_type = toggle_type
    if (toggle_type == 'boolean') {
      this._value = false
      if (allowed_string_values.length > 0) {
        throw 'string_values should be empty for toggle of type boolean.'
      }
    } else if (toggle_type == 'number') {
      this._value = 0
      if (allowed_string_values.length > 0) {
        throw 'string_values should be empty for toggle of type number.'
      }
    } else if (toggle_type == 'string') {
      if (allowed_string_values.length == 0) {
        throw 'string_values should be non-empty for toggle of type string.'
      }
      this._value = allowed_string_values[0]
    }
    this._allowed_string_values = allowed_string_values
  }

  set SetValue(toggle_value: number | boolean | string) {
    if (typeof toggle_value != this._toggle_type) {
      throw (
        'Toggle value for ' +
        this._name +
        ' should be ' +
        this._toggle_type +
        '. Got ' +
        toggle_value +
        ' of type: ' +
        typeof toggle_value +
        '.'
      )
    }
    if (
      typeof toggle_value == 'string' &&
      !this._allowed_string_values.includes(toggle_value)
    ) {
      throw 'Value for string toggle must be in the allowed_string_values.'
    }
    this._value = toggle_value
  }

  get GetValue() {
    return this._value
  }
}

export class BaseStatsNode extends DiabloNode {
  _value: {
    Level: number
    BaseMaxLife: number
    Strength: number
    Intelligence: number
    Willpower: number
    Dexterity: number
  }
  constructor(class_name: string, player_level: number) {
    super('base_stat:' + class_name)
    if (!Number.isInteger(player_level)) {
      throw 'Player level must be an integer. Given: ' + player_level
    }
    const Base_Life = [
      40, 46, 52, 58, 64, 72, 82, 92, 104, 118, 136, 158, 180, 200,
      220, 240, 260, 280, 300, 320, 340, 360, 380, 400, 420, 440, 460,
      480, 500, 520, 540, 560, 580, 600, 620, 640, 660, 680, 700, 720,
      760, 800, 840, 880, 920, 960, 1000, 1040, 1080, 1120, 1165,
      1211, 1260, 1310, 1363, 1417, 1474, 1533, 1594, 1658, 1724,
      1793, 1865, 1939, 2017, 2098, 2182, 2269, 2360, 2454, 2552,
      2654, 2760, 2871, 2986, 3105, 3229, 3359, 3493, 3633, 3778,
      3929, 4086, 4250, 4420, 4596, 4780, 4971, 5170, 5377, 5592,
      5816, 6049, 6290, 6542, 6804, 7076, 7359, 7653, 7959,
    ]
    switch (class_name) {
      case 'Barbarian':
        this._value = {
          Level: player_level,
          BaseMaxLife: Base_Life[player_level - 1],
          Strength: 10 + (player_level - 1),
          Intelligence: 7 + (player_level - 1),
          Willpower: 7 + (player_level - 1),
          Dexterity: 8 + (player_level - 1),
        }
        break
      case 'Sorcerer':
        this._value = {
          Level: player_level,
          BaseMaxLife: Base_Life[player_level - 1],
          Strength: 7 + (player_level - 1),
          Intelligence: 10 + (player_level - 1),
          Willpower: 8 + (player_level - 1),
          Dexterity: 7 + (player_level - 1),
        }
        break
      case 'Druid':
        this._value = {
          Level: player_level,
          BaseMaxLife: Base_Life[player_level - 1],
          Strength: 7 + (player_level - 1),
          Intelligence: 8 + (player_level - 1),
          Willpower: 10 + (player_level - 1),
          Dexterity: 7 + (player_level - 1),
        }
        break
      case 'Rogue':
        this._value = {
          Level: player_level,
          BaseMaxLife: Base_Life[player_level - 1],
          Strength: 7 + (player_level - 1),
          Intelligence: 7 + (player_level - 1),
          Willpower: 8 + (player_level - 1),
          Dexterity: 10 + (player_level - 1),
        }
        break
      case 'Necromancer':
        this._value = {
          Level: player_level,
          BaseMaxLife: Base_Life[player_level - 1],
          Strength: 7 + (player_level - 1),
          Intelligence: 10 + (player_level - 1),
          Willpower: 8 + (player_level - 1),
          Dexterity: 7 + (player_level - 1),
        }
        break
      default:
        throw (
          'Unimplemented class' +
          this._name +
          ' found for BaseStatsNode.'
        )
    }
  }

  get GetValue() {
    return this._value
  }
}

// These nodes represent the skills which do damage. The return value is an object containing various proerties
// important for evaluating modifiers based on the skill used.
export class SkillNode extends DiabloNode {
  _value: {
    name: string
    category: string
    tags: Set<string>
    modifiers: { flat: number; dot: number }
    cooldown_seconds: number
    base_resources_generated: number
    lucky_hit_chance: number
  }
  constructor(
    skill_name: string,
    skill_category: string,
    skill_tags: string[],
    base_flat_modifier: number,
    base_dot_modifier: number,
    skill_cooldown_seconds: number,
    skill_base_resources_generated: number,
    skill_lucky_hit_chance: number,
  ) {
    super('skill:' + skill_name)
    this._value = {
      name: skill_name,
      category: skill_category,
      tags: new Set(skill_tags),
      modifiers: { flat: base_flat_modifier, dot: base_dot_modifier },
      cooldown_seconds: skill_cooldown_seconds,
      base_resources_generated: skill_base_resources_generated,
      lucky_hit_chance: skill_lucky_hit_chance,
    }
  }
}

// Contains all the skills equipped to the player.
export class AllSkillsNode extends DiabloNode {
  _value: Set<string>
  constructor(skill_names: string[]) {
    super('all_skills')
    this._value = new Set(skill_names)
  }
}

export class ParagonNode extends DiabloNode {
  _value: number | boolean
  _paragon_type: 'number' | 'boolean'
  constructor(
    paragon_name: string,
    paragon_type: 'number' | 'boolean',
  ) {
    super('paragon:' + paragon_name)
    this._paragon_type = paragon_type
    switch (paragon_type) {
      case 'number':
        this._value = 0
        break
      case 'boolean':
        this._value = false
    }
  }

  set SetValue(value: number | boolean) {
    this._value = value
  }

  AddValue(diff: number) {
    if (this._paragon_type != 'number') {
      console.log(
        'Cannot add value to non-number paragon node. Node name: ' +
          this._name,
      )
    }
    const multipliers = new Set([
      'cold-resistance',
      'fire-resistance',
      'lightning-resistance',
      'poison-resistance',
      'resistance-to-all-elements',
      'shadow-resistance',
      'cooldown-reduction',
      'imbuement-cooldown-reduction',
      'rupture-cooldown-reduction',
      'shout-cooldown-reduction',
      'damage-reduction-for-your-minions',
      'damage-reduction-from-affected-by-shadow-damage-over-time-enemies',
      'damage-reduction-from-bleeding-enemies',
      'damage-reduction-from-burning-enemies',
      'damage-reduction-from-chilled-enemies',
      'damage-reduction-from-close-enemies',
      'damage-reduction-from-distant-enemies',
      'damage-reduction-from-elites',
      'damage-reduction-from-enemies-affected-by-trap-skills',
      'damage-reduction-from-poisoned-enemies',
      'damage-reduction-from-slowed-enemies',
      'damage-reduction-from-vulnerable-enemies',
      'damage-reduction-while-fortified',
      'damage-reduction-while-healthy',
      'damage-taken-over-time-reduction',
    ])
    const mod_name = this._name.split(':')[1]
    if (multipliers.has(mod_name)) {
      if (typeof this._value === 'number') {
        this._value = 1 - (1 - this._value) * (1 - diff)
      } else {
        console.log(
          'Cannot add value to non-number paragon node. Node name: ' +
            this._name,
        )
      }
    } else if (typeof this._value === 'number') {
      this._value += diff
    } else {
      console.log(
        'Cannot add value to non-number paragon node. Node name: ' +
          this._name,
      )
    }
  }
}

export interface BookOfTheDeadValue {
  'skeletal-warriors'?: [
    'skirmishers' | 'defenders' | 'reapers',
    number,
  ]
  'skeletal-mages'?: ['shadow' | 'cold' | 'bone', number]
  golem?: ['bone' | 'blood' | 'iron', number]
}
export class BookOfTheDeadNode extends DiabloNode {
  _value: BookOfTheDeadValue

  constructor() {
    super('book-of-the-dead')
    this._value = {
      'skeletal-warriors': ['skirmishers', 0],
      'skeletal-mages': ['shadow', 0],
      golem: ['bone', 0],
    }
  }

  set SetValue(value: BookOfTheDeadValue) {
    this._value = value
  }
}

export class SpiritBoonNode extends DiabloNode {
  _value: SpiritBoon

  constructor() {
    super('spirit-boon')
    this._value = {
      deer: [],
      eagle: [],
      snake: [],
      wolf: [],
    }
  }

  set SetValue(value: SpiritBoon) {
    this._value = value
  }
}

export class EnchantmentNode extends DiabloNode {
  _value: Set<string>

  constructor() {
    super('enchantment')
    this._value = new Set()
  }

  AddValue(enchantment: string) {
    this._value.add(enchantment)
  }
}

export class SpecializationNode extends DiabloNode {
  _value: 'combo-points' | 'inner-sight' | 'preparation'

  constructor() {
    super('specialization')
    this._value = 'combo-points'
  }

  set SetValue(
    specialization: 'combo-points' | 'inner-sight' | 'preparation',
  ) {
    this._value = specialization
  }
}

export class ExpertiseNode extends DiabloNode {
  _value:
    | null
    | 'sword'
    | 'axe'
    | 'mace'
    | 'two-handed-sword'
    | 'two-handed-mace'
    | 'two-handed-axe'
    | 'polearm'

  constructor() {
    super('expertise')
    this._value = null
  }

  set SetValue(
    expertise:
      | null
      | 'sword'
      | 'axe'
      | 'mace'
      | 'two-handed-sword'
      | 'two-handed-mace'
      | 'two-handed-axe'
      | 'polearm',
  ) {
    this._value = expertise
  }
}

export class MalignantHeartNode extends DiabloNode {
  _value: number[]
  // Player can have multiple of the same heart equipped. Only the maximum value
  // is accounted for in _value.
  _hearts: number[][]
  // This is the number of values that are variables for this heart.
  _heart_length: number
  constructor(name: string, _heart_length: number) {
    super('malignant-heart:' + name)
    this._value = []
    this._hearts = []
    this._heart_length = _heart_length
  }

  AddMalignantHeart(heart: (number | null)[]) {
    for (const element of heart) {
      if (!element) {
        const index = heart.indexOf(element)
        heart.splice(index, 1)
      }
    }
    if (heart.length != this._heart_length) {
      // console.log(
      //   'Malignant Heart ' +
      //     this._name +
      //     ' has the incorrect size. Correct size: ' +
      //     this._heart_length +
      //     '.',
      // )
      return
    }
    const heartNumbers = heart.filter(
      (num): num is number => num !== null,
    )
    this._hearts.push(heartNumbers)
    // Update _value (best heart).
    // If _heart_length = 0, there are no ranks to this heart.
    // Don't think this actually exists.
    if (this._heart_length == 0) {
      this._value = [0]
      return
    }
    let max_heart = this._hearts[0]
    let max_value = heart[0]
    for (const candidate of this._hearts) {
      if (candidate[0] !== null && candidate[0] > max_value!) {
        max_heart = candidate
        max_value = candidate[0]
      }
    }
    this._value = max_heart
  }

  get GetValue() {
    return this._value
  }
}

export class VampiricNode extends DiabloNode {
  _value: boolean
  constructor(name: string) {
    super('vampiric:' + name)
    this._value = false
  }

  set SetValue(value: boolean) {
    this._value = value
  }
}

export class SeneschalConstructNode extends DiabloNode {
  _value: boolean
  constructor(name: string) {
    super('seneschalconstruct:' + name)
    this._value = false
  }

  set SetValue(value: boolean) {
    this._value = value
  }
}

export class BarbarianPreSimNode extends DiabloNode {
  _value: BarbarianPreSimReturn
  constructor() {
    super('pre-sim')
    this._value = {
      skill_use_rate: {},
      dot_uptime: 0,
      weapon_use_rate: {
        'dual-wield': 0,
        'two-handed-slashing': 0,
        'two-handed-bludgeoning': 0,
      },
      weapon_swap_rate: 0,
      cross_skill_stat: {},
    }
  }

  set SetValue(Pre_Sim: BarbarianPreSimReturn) {
    this._value = Pre_Sim
  }
}

export class DruidPreSimNode extends DiabloNode {
  _value: DruidPreSimReturn

  constructor() {
    super('pre-sim')
    this._value = {
      skill_use_rate: {},
      dot_uptime: 0,

      // Proportion of time spend in each form.
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

      cross_skill_stat: {},
    }
  }

  set SetValue(Pre_Sim: DruidPreSimReturn) {
    this._value = Pre_Sim
  }
}

export class NecromancerPreSimNode extends DiabloNode {
  _value: NecromancerPreSimReturn

  constructor() {
    super('pre-sim')
    this._value = {
      skill_use_rate: {},
      dot_uptime: 0,
      cross_skill_stat: {},
    }
  }

  set SetValue(Pre_Sim: NecromancerPreSimReturn) {
    this._value = Pre_Sim
  }
}

export class RoguePreSimNode extends DiabloNode {
  _value: RoguePreSimReturn

  constructor() {
    super('pre-sim')
    this._value = {
      skill_use_rate: {},
      dot_uptime: 0,
      combo_point_distribution: {},
      cross_skill_stat: {},
    }
  }

  set SetValue(Pre_Sim: RoguePreSimReturn) {
    this._value = Pre_Sim
  }
}

export class SorcererPreSimNode extends DiabloNode {
  _value: SorcererPreSimReturn

  constructor() {
    super('pre-sim')
    this._value = {
      skill_use_rate: {},
      dot_uptime: 0,
      crackling_energy_rate: 0,
      crackling_energy_uptime: 0,
      cross_skill_stat: {},
    }
  }

  set SetValue(Pre_Sim: SorcererPreSimReturn) {
    this._value = Pre_Sim
  }
}

// This is a generic class for a node which is computed based on the value of other nodes. All Compute
// nodes take a callback as an argument `update_value_function` which says how to compute the value
// of the node. Until this callback is called, the value is null.
export class ComputeNode extends DiabloNode {
  // If GetValue is called, and the node has value null, then we update the value. Otherwise we just
  // return the value that was already computed. This way we only calculate the value once.
  _value: any
  // Each compute node has a function used to update its value by references the values of other nodes
  // that it depends on.
  _update_value_function: () => any
  constructor(name: string, update_value_function: () => any) {
    super(name)
    this._update_value_function = update_value_function
    this._value = null
  }

  UpdateValue() {
    this._value = this._update_value_function()
  }

  get GetValue() {
    if (this._value == null) {
      this.UpdateValue()
    }
    return this._value
  }

  // Only used in particular circumstances. Generally should be set using GetValue.
  set SetValue(value: any) {
    this._value = value
  }

  ClearVal(): void {
    this._value = null
  }
}

// Used to aggregate modifiers from different sourcers, mainly affix on gear and paragons. We use
// Aggregation Nodes to more easily report values on gear back to the player.
export class AggregationNode extends ComputeNode {
  // We have a single method to create all the aggregation nodes.
  _value: number | null = null
  _update_value_function: () => number
  constructor(name: string, update_value_function: () => number) {
    super('aggregation:' + name, update_value_function)
    this._update_value_function = update_value_function
  }
}

export function CreateAggregationNodes(
  nodes_map: NodesMap,
): Record<string, StatsNode> {
  const aggregate_modifiers = new Set(
    Object.keys(nodes_map['modifier'] ?? {}),
  )
  for (const name of Object.keys(
    nodes_map['paragon_modifier'] ?? {},
  )) {
    aggregate_modifiers.add(name)
  }

  const aggregation_nodes: Record<string, AggregationNode> = {}
  for (const key of aggregate_modifiers) {
    const node = new AggregationNode(key, () => {
      let value = 0
      const multipliers = new Set([
        // 'cold-resistance',
        // 'fire-resistance',
        // 'lightning-resistance',
        // 'poison-resistance',
        // 'resistance-to-all-elements',
        // 'shadow-resistance',
        'cooldown-reduction',
        'imbuement-cooldown-reduction',
        'rupture-cooldown-reduction',
        'shout-cooldown-reduction',
        'damage-reduction',
        'damage-reduction-from-affected-by-shadow-damage-over-time-enemies',
        'damage-reduction-from-bleeding-enemies',
        'damage-reduction-from-burning-enemies',
        'damage-reduction-from-close-enemies',
        'damage-reduction-from-distant-enemies',
        'damage-reduction-from-poisoned-enemies',
        'damage-reduction-while-fortified',
        'damage-reduction-while-injured',
        'damage-reduction-for-your-minions',
        'damage-reduction-from-elites',
        'damage-reduction-from-enemies-affected-by-trap-skills',
        'damage-reduction-from-slowed-enemies',
        'damage-reduction-from-vulnerable-enemies',
        'damage-reduction-while-healthy',
        'damage-taken-over-time-reduction',
      ])
      if (nodes_map['modifier'] && key in nodes_map['modifier']) {
        if (multipliers.has(key)) {
          value = 1 - (1 - value) * (1 - modifierVal(nodes_map, key))
        } else {
          value += modifierVal(nodes_map, key)
        }
      }
      if (
        nodes_map['paragon_modifier'] &&
        key in nodes_map['paragon_modifier']
      ) {
        if (multipliers.has(key)) {
          value =
            1 - (1 - value) * (1 - paragonModifierVal(nodes_map, key))
        } else {
          value += paragonModifierVal(nodes_map, key)
        }
      }
      return value
    })
    aggregation_nodes[key] = node
  }

  return aggregation_nodes
}

export class StatsNode extends ComputeNode {
  // Stats node should be initially null but becomes an map when it's evaluated. The value is an
  // map which reports values for each combination of Weapon and skill type.
  //
  // e.g. For Barbarian, Crit damage depends on weapon type and skill type, but different skills may
  //      use different weapons.
  //
  // If GetValue is called, and the node has value null, then we update the value. Otherwise we just
  // return the value that was already computed. This way we only calculate the value once.
  _value: number | null = null
  // Each compute node has a function used to update its value by references the values of other nodes
  // that it depends on.
  _update_value_function: () => number
  constructor(name: string, update_value_function: () => number) {
    super('stat:' + name, update_value_function)
    this._update_value_function = update_value_function
  }
}

// (TODO) Trigger and stats nodes have the same API, are triggers needed? Should they be merged with stats somehow?
export class TriggerNode extends ComputeNode {
  // Trigger node should be initially null but becomes an map when it's evaluated. If GetValue is called, and the
  // node has value null, then we update the value. Otherwise we just return the value that was already computed.
  // This way we only calculate the value once.
  _value: number | null = null
  // Each trigger node has a function used to update its value by references the values of other nodes
  // that it depends on.
  _update_value_function: () => number
  constructor(name: string, update_value_function: () => number) {
    super('trigger:' + name, update_value_function)
    this._update_value_function = update_value_function
  }
}

// Used to track all the tags on the current skill. Primarily for Druids which modify their tags.
export class TagsNode extends ComputeNode {
  _value: Set<string> | null = null
  _update_value_function: () => Set<string>
  constructor(
    name: string,
    update_value_function: () => Set<string>,
  ) {
    super('tags:' + name, update_value_function)
    this._update_value_function = update_value_function
  }
}

export interface NodesMap {
  class?: string
  modifier?: Record<string, ModifierNode>
  aspect?: Record<string, AspectNode>
  talent?: Record<string, TalentNode>
  toggle?: Record<string, ToggleNode>
  skill?: Record<string, SkillNode>
  current_skill?: SkillNode
  base_stat?: BaseStatsNode
  stat?: Record<string, StatsNode>
  trigger?: Record<string, TriggerNode>
  tags?: TagsNode
  all_skills?: AllSkillsNode
  paragon_modifier?: Record<string, ParagonNode>
  paragon?: Record<string, ParagonNode>
  talent_modifier_map?: Record<string, string[]>
  // Only populated for Barbarian
  expertise?: ExpertiseNode
  // Only populated for Necromancer.
  book_of_the_dead?: BookOfTheDeadNode
  // Only populated for Druid.
  spirit_boon?: SpiritBoonNode
  // Only populated for Sorcerer.
  enchantment?: EnchantmentNode
  // Only populated for Rogue.
  specialization?: SpecializationNode
  aggregation?: Record<string, AggregationNode>
  // Results from a simulation which inform the final computation.
  presim?: {
    barbarian?: BarbarianPreSimNode
    druid?: DruidPreSimNode
    sorcerer?: SorcererPreSimNode
    rogue?: RoguePreSimNode
    necromancer?: NecromancerPreSimNode
  }
  malignant_heart?: Record<string, MalignantHeartNode>
  vampiric?: Record<string, VampiricNode>
  seneschalconstruct?: Record<string, SeneschalConstructNode>
}
