import {
  AggregationNode,
  AspectNode,
  NodesMap,
} from './computation_graph'
import {
  allSkillsVal,
  aspectVal,
  enchantmentVal,
  necromancerPresimVal,
  paragonVal,
  skillVal,
  statVal,
  talentVal,
  toggleVal,
  triggerVal,
} from './graph_values'
import { PlayerCharacter } from './player_character'
import {
  AggregateStats,
  ComputeSkillReturn,
  ComputeSkillReturnsBeforeUpdate,
  DimSumSplit,
  GeneratorAndSpenderDPS,
  SkillReturn,
  Stat,
} from './run_calculation'

function UnstableCurrentsNumCasts(
  skill_returns: Record<string, SkillReturn>,
  nodes_map: NodesMap,
) {
  if (!('unstable-currents' in skill_returns)) {
    throw 'Can only count the number of casts if Unstable Currents is equipped.'
  }
  // Prime Unstable Currents: Unstable currents increases Attack speed by 25% while active.
  let PUC = 1
  if (
    nodes_map['talent']?.['prime-unstable-currents']?.GetValue == 1
  ) {
    PUC = 1.25
  }

  let nonzero_skill = false
  for (const skill_name in skill_returns) {
    if (skill_returns[skill_name]._elapsed_time_seconds != 0) {
      nonzero_skill = true
      break
    }
  }
  if (!nonzero_skill) {
    return 0
  }

  if ('spark' in skill_returns) {
    return (
      Math.floor(10 / skill_returns['spark']._elapsed_time_seconds) *
      PUC
    )
  }
  if ('arc-lash' in skill_returns) {
    return (
      Math.floor(
        10 / skill_returns['arc-lash']._elapsed_time_seconds,
      ) * PUC
    )
  }

  const generator_names: string[] = []
  if ('fire-bolt' in skill_returns) {
    generator_names.push('fire-bolt')
  }
  if ('frost-bolt' in skill_returns) {
    generator_names.push('frost-bolt')
  }
  const shock_core_names: string[] = []
  if ('chain-lightning' in skill_returns) {
    shock_core_names.push('chain-lightning')
  }
  if ('charged-bolts' in skill_returns) {
    shock_core_names.push('charged-bolts')
  }
  if ('ball-lightning' in skill_returns) {
    shock_core_names.push('ball-lightning')
  }

  let num_casts = 0
  let remaining_time = 10
  if ('teleport' in skill_returns) {
    num_casts += 1
    remaining_time -=
      skill_returns['teleport']._elapsed_time_seconds / PUC
  }
  if ('lightning-spear' in skill_returns) {
    num_casts += 1
    remaining_time -=
      skill_returns['lightning-spear']._elapsed_time_seconds / PUC
  }

  if ('wait' in skill_returns) {
    generator_names.push('wait')
  }

  // Silly placeholder.
  let min_rotation_time = 100
  for (const generator of generator_names) {
    for (const spender of shock_core_names) {
      min_rotation_time = Math.min(
        min_rotation_time,
        GeneratorAndSpenderElapsedTime(
          skill_returns[generator],
          skill_returns[spender],
        ),
      )
    }
  }

  return (
    num_casts + Math.floor((remaining_time * PUC) / min_rotation_time)
  )
}

function UnstableCurrentsDamage(
  skill_returns: Record<string, SkillReturn>,
  nodes_map: NodesMap,
): [number, number] {
  const skill_candidates = [
    'chain-lightning',
    'charged-bolts',
    'lightning-spear',
    'ball-lightning',
  ]

  let flat_damage = 0
  let dot_damage = 0

  for (const skill_name of skill_candidates) {
    const skill_return = ComputeSkillReturn(
      'Sorcerer',
      skill_name,
      nodes_map,
    )
    flat_damage += skill_return?._flat_damage ?? 0
    dot_damage += skill_return?._dot_damage ?? 0
  }

  let number_of_casts = UnstableCurrentsNumCasts(
    skill_returns,
    nodes_map,
  )
  // Aspect-of-Overwhelming Currents Unstable Currents has a {10/20}% chance to cast an additional Shock Skill.
  if (
    aspectVal(nodes_map, 'aspect-of-overwhelming-currents').length > 0
  ) {
    number_of_casts += aspectVal(
      nodes_map,
      'aspect-of-overwhelming-currents',
    )[0]
  }

  return [
    (flat_damage * number_of_casts) / 4,
    (dot_damage * number_of_casts) / 4,
  ]
}

function ShadowCloneDamage(
  skill_returns: Record<string, SkillReturn>,
  nodes_map: NodesMap,
): [number, number] {
  const clone_life_seconds = 15
  const [flat_damage, dot_damage] = DimSumSplit(skill_returns)
  let multiplier =
    clone_life_seconds *
    (0.6 + 0.2 * talentVal(nodes_map, 'supreme-shadow-clone'))
  // No Witnesses: Your Ultimate Skills deal x30% increased damage and grant you x10% increased damage for 20 seconds when cast.
  if (paragonVal(nodes_map, 'no-witnesses')) {
    multiplier *= 1.3
  }
  // Aspect of Imitated Imbuement : Your Shadow Clones also mimic the Imbuements applied to your Skills.
  // Casting an Imbuement Skill grants your active Shadow Clone x{8/16}% increased damage for 9.0 seconds.
  if (
    aspectVal(nodes_map, 'aspect-of-imitated-imbuement').length > 0 &&
    (allSkillsVal(nodes_map).has('poison-imbuement') ||
      allSkillsVal(nodes_map).has('cold-imbuement') ||
      allSkillsVal(nodes_map).has('shadow-imbuement'))
  ) {
    multiplier *=
      1 + aspectVal(nodes_map, 'aspect-of-imitated-imbuement')[0]
  }

  return [flat_damage * multiplier, dot_damage * multiplier]
}

function NaturesFuryDamage(
  nodes_map: NodesMap,
  skill_name: string,
): [number, number] {
  let skill_candidates: string[] = []
  switch (skill_name) {
    case 'earth-spike':
      skill_candidates = ['wind-shear', 'storm-strike']
      break
    case 'landslide':
      skill_candidates = ['tornado', 'lightning-storm']
      break
    case 'earthen-bulwark':
      skill_candidates = ['cyclone-armor']
      break
    case 'boulder':
      skill_candidates = ['hurricane']
      break
    case 'wind-shear':
      skill_candidates = ['earth-spike']
      break
    case 'storm-strike':
      skill_candidates = ['earth-spike']
      break
    case 'tornado':
      skill_candidates = ['landslide']
      break
    case 'lightning-storm':
      skill_candidates = ['landslide']
      break
    case 'cyclone-armor':
      skill_candidates = ['earthen-bulwark']
      break
    case 'hurricane':
      skill_candidates = ['boulder']
      break
  }

  if (skill_candidates.length == 0) {
    return [0, 0]
  }

  let flat_damage = 0
  let dot_damage = 0
  for (const skill_name of skill_candidates) {
    const skill_return = ComputeSkillReturn(
      'Druid',
      skill_name,
      nodes_map,
    )
    flat_damage += skill_return?._flat_damage ?? 0
    dot_damage += skill_return?._dot_damage ?? 0
  }
  return [
    (flat_damage / skill_candidates.length) * 0.3,
    (dot_damage / skill_candidates.length) * 0.3,
  ]
}

function SubterraneanDamage(nodes_map: NodesMap): [number, number] {
  const skill_return = ComputeSkillReturn(
    'Druid',
    'landslide',
    nodes_map,
  )
  if (!skill_return) {
    return [0, 0]
  }

  let flat_damage = 0
  let dot_damage = 0
  flat_damage += skill_return._flat_damage
  dot_damage += skill_return._dot_damage

  return [flat_damage, dot_damage]
}

function GreatstaffOfTheCroneDamage(
  nodes_map: NodesMap,
): [number, number] {
  const skill_return = ComputeSkillReturn(
    'Druid',
    'storm-strike',
    nodes_map,
  )
  if (!skill_return) {
    return [0, 0]
  }
  let flat_damage = 0
  let dot_damage = 0
  flat_damage +=
    skill_return._flat_damage *
    aspectVal(nodes_map, 'greatstaff-of-the-crone')[0]
  dot_damage +=
    skill_return._dot_damage *
    aspectVal(nodes_map, 'greatstaff-of-the-crone')[0]

  return [flat_damage, dot_damage]
}

function UpdateWithEnchantedFrozenOrbDamage(
  skill_returns: Record<string, SkillReturn>,
  nodes_map: NodesMap,
): void {
  if (!enchantmentVal(nodes_map).has('frozen-orb')) {
    return
  }
  const frozen_orb_skill_return = ComputeSkillReturn(
    'Sorcerer',
    'frozen-orb',
    nodes_map,
  )
  if (!frozen_orb_skill_return) {
    return
  }
  // Enchantment Master: Your Enchantments are 20% stronger.
  const Enchantment_Master_Multiplier =
    1 + 0.2 * Number(paragonVal(nodes_map, 'enchantment-master'))
  for (const skill_name in skill_returns) {
    if (skillVal(nodes_map, skill_name).category != 'basic') {
      skill_returns[skill_name]._flat_damage +=
        frozen_orb_skill_return?._flat_damage *
        0.2 *
        Enchantment_Master_Multiplier
      skill_returns[skill_name]._dot_damage +=
        frozen_orb_skill_return?._dot_damage *
        0.2 *
        Enchantment_Master_Multiplier
    }
  }
}

function UpdateWithEnchantedIceShardsDamage(
  skill_returns: Record<string, SkillReturn>,
  nodes_map: NodesMap,
): void {
  if (!enchantmentVal(nodes_map).has('ice-shards')) {
    return
  }
  const ice_shards_skill_return = ComputeSkillReturn(
    'Sorcerer',
    'ice-shards',
    nodes_map,
  )
  if (!ice_shards_skill_return) {
    return
  }
  // Enchantment Master: Your Enchantments are 20% stronger.
  const Enchantment_Master_Multiplier =
    1 + 0.2 * Number(paragonVal(nodes_map, 'enchantment-master'))
  // According to maxroll, there are 1.66 ice shards per second i.e. 1/3 of a cast to all frozen enemies.
  // https://maxroll.gg/d4/resources/sorcerer-enchantment-slots
  for (const skill_name in skill_returns) {
    if (toggleVal(nodes_map, 'enemy-frozen')) {
      skill_returns[skill_name]._flat_damage +=
        (ice_shards_skill_return?._flat_damage / 3) *
        skill_returns[skill_name]._elapsed_time_seconds *
        Enchantment_Master_Multiplier *
        Number(toggleVal(nodes_map, 'number-of-enemies'))
      skill_returns[skill_name]._dot_damage +=
        (ice_shards_skill_return?._dot_damage / 3) *
        skill_returns[skill_name]._elapsed_time_seconds *
        Enchantment_Master_Multiplier *
        Number(toggleVal(nodes_map, 'number-of-enemies'))
    }
  }
}

function UpdateWithEnchantedChainLightningDamage(
  skill_returns: Record<string, SkillReturn>,
  nodes_map: NodesMap,
): void {
  if (!enchantmentVal(nodes_map).has('chain-lightning')) {
    return
  }
  // Enchantment Master: Your Enchantments are 20% stronger.
  const Enchantment_Master_Multiplier =
    1 + 0.2 * Number(paragonVal(nodes_map, 'enchantment-master'))
  const chain_lightning_skill_return = ComputeSkillReturn(
    'Sorcerer',
    'chain-lightning',
    nodes_map,
  )
  if (!chain_lightning_skill_return) {
    return
  }
  for (const skill_name in skill_returns) {
    skill_returns[skill_name]._flat_damage +=
      ((chain_lightning_skill_return?._flat_damage *
        -skill_returns[skill_name]._resource_cost) /
        100) *
      Enchantment_Master_Multiplier
    skill_returns[skill_name]._dot_damage +=
      ((chain_lightning_skill_return?._dot_damage *
        -skill_returns[skill_name]._resource_cost) /
        100) *
      Enchantment_Master_Multiplier
  }
}

function UpdateWithEnchantedMeteorDamage(
  skill_returns: Record<string, SkillReturn>,
  nodes_map: NodesMap,
): void {
  if (!enchantmentVal(nodes_map).has('meteor')) {
    return
  }
  // Enchantment Master: Your Enchantments are 20% stronger.
  const Enchantment_Master_Multiplier =
    1 + 0.2 * Number(paragonVal(nodes_map, 'enchantment-master'))
  const meteor_skill_return = ComputeSkillReturn(
    'Sorcerer',
    'meteor',
    nodes_map,
  )
  if (!meteor_skill_return) {
    return
  }
  for (const skill_name in skill_returns) {
    skill_returns[skill_name]._flat_damage +=
      meteor_skill_return?._flat_damage *
      skill_returns[skill_name]._lucky_hit_chance *
      0.08 *
      Enchantment_Master_Multiplier
    skill_returns[skill_name]._dot_damage +=
      meteor_skill_return?._dot_damage *
      skill_returns[skill_name]._lucky_hit_chance *
      0.08 *
      Enchantment_Master_Multiplier
  }
}

// Enchantment Ball Lightning: Lucky Hit: Crits have up to 25% chance to cast Ball Lightning .
function UpdateWithEnchantedBallLightningDamage(
  skill_returns: Record<string, SkillReturn>,
  nodes_map: NodesMap,
): void {
  if (!enchantmentVal(nodes_map).has('ball-lightning')) {
    return
  }
  const gravitational_aspect = aspectVal(
    nodes_map,
    'gravitational-aspect',
  )

  // Enchantment Ball Lightning is a static orb that does not move. It is not affected by Gravitational Aspect.
  nodes_map['aspect']?.['gravitational-aspect']?.RemoveAspect()

  // Enchantment Master: Your Enchantments are 20% stronger.
  const Enchantment_Master_Multiplier =
    1 + 0.2 * Number(paragonVal(nodes_map, 'enchantment-master'))
  const ball_lightning_skill_return = ComputeSkillReturn(
    'Sorcerer',
    'ball-lightning',
    nodes_map,
  )

  // Need to grab the bonus damage from Gravitational Aspect and add it back in but without the orbiting.
  //let Gravitational_Aspect_Damage_Multiplier = 1
  if (gravitational_aspect.length > 0) {
    nodes_map['aspect']?.['gravitational-aspect']?.AddAspect(
      gravitational_aspect,
    )
    //Gravitational_Aspect_Damage_Multiplier += gravitational_aspect[0]
  }

  if (!ball_lightning_skill_return) {
    return
  }
  for (const skill_name in skill_returns) {
    const Procs_Per_Cast =
      skill_returns[skill_name]._average_hits *
      skill_returns[skill_name]._lucky_hit_chance *
      skill_returns[skill_name]._critical_strike_chance *
      0.25
    skill_returns[skill_name]._flat_damage +=
      ball_lightning_skill_return?._flat_damage *
      //Gravitational_Aspect_Damage_Multiplier * // Add the Gravitational Aspect Ball Lightning Damage back in
      Procs_Per_Cast *
      Enchantment_Master_Multiplier
    skill_returns[skill_name]._dot_damage +=
      ball_lightning_skill_return?._dot_damage *
      Procs_Per_Cast *
      Enchantment_Master_Multiplier
  }
}

// Enchantment Lightning Spear: Absorbing crackling energy has a 10% chance to cast Lightning Spear .
function UpdateWithEnchantedLightningSpear(
  skill_returns: Record<string, SkillReturn>,
  nodes_map: NodesMap,
): void {
  if (!enchantmentVal(nodes_map).has('lightning-spear')) {
    return
  }
  // Enchantment Master: Your Enchantments are 20% stronger.
  const Enchantment_Master_Multiplier =
    1 + 0.2 * Number(paragonVal(nodes_map, 'enchantment-master'))
  const lightning_spear_skill_return = ComputeSkillReturn(
    'Sorcerer',
    'lightning-spear',
    nodes_map,
  )
  if (!lightning_spear_skill_return) {
    return
  }
  for (const skill_name in skill_returns) {
    const Procs_Per_Cast =
      skill_returns[skill_name]._crackling_energy_created * 0.1
    skill_returns[skill_name]._flat_damage +=
      lightning_spear_skill_return?._flat_damage *
      Procs_Per_Cast *
      Enchantment_Master_Multiplier

    skill_returns[skill_name]._dot_damage +=
      lightning_spear_skill_return?._dot_damage *
      Procs_Per_Cast *
      Enchantment_Master_Multiplier
  }
}

// Enchantment Firewall: Lucky Hit Up to 25% chance when dealing burning damage to spawn 2 firewalls for 3 seconds.
function UpdateWithEnchantedFirewallDamage(
  skill_returns: Record<string, SkillReturn>,
  nodes_map: NodesMap,
): void {
  if (!enchantmentVal(nodes_map).has('firewall')) {
    return
  }
  const firewall_skill_return = ComputeSkillReturn(
    'Sorcerer',
    'firewall',
    nodes_map,
  )
  if (!firewall_skill_return) {
    return
  }
  // Enchantment Master: Your Enchantments are 20% stronger.
  const Enchantment_Master_Multiplier =
    1 + 0.2 * Number(paragonVal(nodes_map, 'enchantment-master'))
  const Burning_Skills = new Set([
    'fire-bolt',
    'meteor',
    'firewall',
    'inferno',
    'incinerate',
    'hydra',
  ])

  for (const skill_name in skill_returns) {
    if (
      Burning_Skills.has(skill_name) ||
      enchantmentVal(nodes_map).has('fire-bolt')
    ) {
      const lucky_hit_chance =
        0.25 * skill_returns[skill_name]._lucky_hit_chance
      skill_returns[skill_name]._flat_damage +=
        // 2 Firewalls lasting 3 seconds each is 6 seconds of firewall.
        // Firewall normally lasts 8 seconds so we multiply by 3/4.
        lucky_hit_chance *
        firewall_skill_return?._flat_damage *
        0.75 *
        Enchantment_Master_Multiplier
      skill_returns[skill_name]._dot_damage +=
        lucky_hit_chance *
        firewall_skill_return?._dot_damage *
        0.75 *
        Enchantment_Master_Multiplier
    }
  }
}

// Enchantment Fireball: When you kill an enemy, they explode in a fireball for 50% of its damage.
function UpdateWithEnchantedFireballDamage(
  skill_returns: Record<string, SkillReturn>,
  nodes_map: NodesMap,
): void {
  if (!enchantmentVal(nodes_map).has('fireball')) {
    return
  }

  // // (Unique) Gloves-of-the Illuminator: Fireball now bounces as it travels, exploding each time it hits the ground, but its explosion deals {35-25}% less damage.
  // // Staff-of-Endless Rage Every 3rd cast-of-Fireball launches 2 additional projectiles and deals 20-40%[x] damage.
  const gloves_of_the_illuminator_value = aspectVal(
    nodes_map,
    'gloves-of-the-illuminator',
  )

  const staff_of_endless_rage = aspectVal(
    nodes_map,
    'staff-of-endless-rage',
  )

  nodes_map['aspect']?.['gloves-of-the-illuminator']?.RemoveAspect()
  nodes_map['aspect']?.['staff-of-endless-rage']?.RemoveAspect()

  const fireball_skill_return = ComputeSkillReturn(
    'Sorcerer',
    'fireball',
    nodes_map,
  )
  if (gloves_of_the_illuminator_value.length > 0) {
    nodes_map['aspect']?.['gloves-of-the-illuminator']?.AddAspect(
      gloves_of_the_illuminator_value,
    )
  }
  if (staff_of_endless_rage.length > 0) {
    nodes_map['aspect']?.['staff-of-endless-rage']?.AddAspect(
      staff_of_endless_rage,
    )
  }
  if (!fireball_skill_return) {
    return
  }
  // Enchantment Master: Your Enchantments are 20% stronger.
  const Enchantment_Master_Multiplier =
    1 + 0.2 * Number(paragonVal(nodes_map, 'enchantment-master'))
  for (const skill_name in skill_returns) {
    const enemy_kills = skill_returns[skill_name]._enemy_kills
    // The main enemy is killed so we subtract it from the fireball hits. Only AOE splash is considered.
    skill_returns[skill_name]._flat_damage +=
      ((enemy_kills *
        fireball_skill_return?._flat_damage *
        (fireball_skill_return._average_hits - 1)) /
        fireball_skill_return._average_hits) *
      0.5 *
      Enchantment_Master_Multiplier
    skill_returns[skill_name]._dot_damage +=
      ((enemy_kills *
        fireball_skill_return?._dot_damage *
        (fireball_skill_return._average_hits - 1)) /
        fireball_skill_return._average_hits) *
      0.5 *
      Enchantment_Master_Multiplier
  }
}

// Blood Artisans Cuirass : When you pick up {5/10} Blood Orbs, a free Bone Spirit is spawned, dealing bonus damage based on your current Life percent.
function UpdateWithBloodArtisansCuirass(
  skill_returns: Record<string, SkillReturn>,
  nodes_map: NodesMap,
): void {
  if (aspectVal(nodes_map, 'blood-artisans-cuirass').length == 0) {
    return
  }
  const bone_spirit_skill_return = ComputeSkillReturn(
    'Necromancer',
    'bone-spirit',
    nodes_map,
  )
  if (!bone_spirit_skill_return) {
    return
  }
  for (const skill_name in skill_returns) {
    const Procs_Per_Cast =
      skill_returns[skill_name]._blood_orb_gain /
      aspectVal(nodes_map, 'blood-artisans-cuirass')[0]
    skill_returns[skill_name]._flat_damage +=
      bone_spirit_skill_return?._flat_damage *
      Procs_Per_Cast *
      Number(toggleVal(nodes_map, 'percent-life')) *
      3

    skill_returns[skill_name]._dot_damage +=
      bone_spirit_skill_return?._dot_damage * Procs_Per_Cast
  }
}

function ExplosiveMistDamage(nodes_map: NodesMap): [number, number] {
  const skill_return = ComputeSkillReturn(
    'Necromancer',
    'corpse-explosion',
    nodes_map,
  )
  if (!skill_return) {
    return [0, 0]
  }
  let flat_damage = 0
  let dot_damage = 0
  const Pre_Sim_Node = necromancerPresimVal(nodes_map)
  if ('blood-mist' in Pre_Sim_Node['cross_skill_stat']) {
    // Blows up 5 corpses during duration.
    flat_damage += skill_return._flat_damage * 5
    dot_damage += skill_return._dot_damage * 5
  }

  return [flat_damage, dot_damage]
}

// Scoundrel's Leathers (Rogue Unique Chest): While you have unlimited Energy from Inner Sight, your Core Skills have a 60-80% chance to spawn Caltrops, Poison Trap, or Death Trap.
function ScoundrelsLeathersDamage(
  skill_returns: Record<string, SkillReturn>,
  nodes_map: NodesMap,
): void {
  if (aspectVal(nodes_map, 'scoundrels-leathers').length == 0) {
    return
  }
  const Inner_Sight_Uptime =
    statVal(nodes_map, 'Inner_Sight_Rate') * 4
  const Death_Trap_Skill_Return = ComputeSkillReturn(
    'Rogue',
    'death-trap',
    nodes_map,
  )
  const Poison_Trap_Skill_Return = ComputeSkillReturn(
    'Rogue',
    'poison-trap',
    nodes_map,
  )
  const Caltrops_Skill_Return = ComputeSkillReturn(
    'Rogue',
    'caltrops',
    nodes_map,
  )
  if (
    !Caltrops_Skill_Return ||
    !Poison_Trap_Skill_Return ||
    !Death_Trap_Skill_Return
  ) {
    return
  }
  for (const skill_name in skill_returns) {
    if (skillVal(nodes_map, skill_name).category == 'core') {
      skill_returns[skill_name]._flat_damage +=
        (aspectVal(nodes_map, 'scoundrels-leathers')[0] / 3) *
        Inner_Sight_Uptime *
        (Death_Trap_Skill_Return?._flat_damage +
          Poison_Trap_Skill_Return?._flat_damage +
          Caltrops_Skill_Return?._flat_damage)

      skill_returns[skill_name]._dot_damage +=
        (aspectVal(nodes_map, 'scoundrels-leathers')[0] / 3) *
        Inner_Sight_Uptime *
        (Death_Trap_Skill_Return?._dot_damage +
          Poison_Trap_Skill_Return?._dot_damage +
          Caltrops_Skill_Return?._dot_damage)
    }
  }
  return
}

// Removes aspects from nodes_map and returns Record of the aspects and their values.
function RemoveAspects(
  nodes_map: NodesMap,
  exemptions: string[] = [],
): Record<string, number[]> {
  // Record the aspects for adding them later.
  const AspectStore: Record<string, number[]> = {}
  for (const aspect_name in nodes_map['aspect']) {
    if (exemptions.includes(aspect_name)) {
      continue
    }
    AspectStore[aspect_name] = aspectVal(nodes_map, aspect_name)
  }
  // Remove the aspects.
  for (const aspect_name in nodes_map['aspect']) {
    if (exemptions.includes(aspect_name)) {
      continue
    }
    nodes_map['aspect'][aspect_name].RemoveAspect()
  }
  return AspectStore
}

// Adds back the aspects that were removed from nodes_map.
function AddAspects(
  nodes_map: NodesMap,
  aspect_store: Record<string, number[]>,
): void {
  for (const aspect_name in aspect_store) {
    if (
      nodes_map['aspect']?.[aspect_name] &&
      aspect_store[aspect_name].length > 0
    ) {
      if (nodes_map['aspect'][aspect_name]._aspect_length == 0) {
        nodes_map['aspect'][aspect_name].AddAspect([])
      } else {
        nodes_map['aspect']?.[aspect_name].AddAspect(
          aspect_store[aspect_name],
        )
      }
    }
  }
}

// Removes paragon power from nodes_map and returns Record of the aspects and their values.
function RemoveParagon(
  nodes_map: NodesMap,
  exemptions: string[] = [],
): Record<string, boolean> {
  // Record the Paragons for adding them later.
  const ParagonStore: Record<string, boolean> = {}
  for (const paragon_name in nodes_map['paragon']) {
    if (exemptions.includes(paragon_name)) {
      continue
    }
    ParagonStore[paragon_name] = paragonVal(nodes_map, paragon_name)
  }
  // Remove the Paragons.
  for (const Paragon_name in nodes_map['paragon']) {
    if (exemptions.includes(Paragon_name)) {
      continue
    }
    nodes_map['paragon'][Paragon_name].SetValue = false
  }
  return ParagonStore
}

// Adds back the Paragons that were removed from nodes_map.
function AddParagon(
  nodes_map: NodesMap,
  paragon_store: Record<string, boolean>,
): void {
  for (const paragon_name in paragon_store) {
    if (nodes_map['paragon']?.[paragon_name]) {
      nodes_map['paragon'][paragon_name].SetValue =
        paragon_store[paragon_name]
    }
  }
}

function UpdateShadowClone(
  skill_returns: Record<string, SkillReturn>,
  nodes_map: NodesMap,
  player_character: PlayerCharacter,
): void {
  if (!('shadow-clone' in skill_returns)) {
    return
  }
  const AspectStore = RemoveAspects(nodes_map, [
    'aspect-of-imitated-imbuement',
    'energizing-aspect',
    'accelerating-aspect',
    'rapid-aspect',
    'ashearas-khanjar',
  ])
  const ParagonStore = RemoveParagon(nodes_map, [
    'no-witnesses',
    'fluidity',
    'combat',
  ])
  const ShadowCloneSkillReturns = ComputeSkillReturnsBeforeUpdate(
    nodes_map,
    player_character,
  )
  const [flat_damage, dot_damage] = ShadowCloneDamage(
    ShadowCloneSkillReturns,
    nodes_map,
  )
  AddAspects(nodes_map, AspectStore)
  AddParagon(nodes_map, ParagonStore)

  skill_returns['shadow-clone']._flat_damage += flat_damage
  skill_returns['shadow-clone']._skill_flat_damage += flat_damage
  skill_returns['shadow-clone']._dot_damage += dot_damage
  skill_returns['shadow-clone']._skill_dot_damage += dot_damage
}

function UpdateSkill(
  skill_returns: Record<string, SkillReturn>,
  nodes_map: NodesMap,
  skill_name: string,
): void {
  if (!(skill_name in skill_returns)) {
    return
  }

  let [flat_damage, dot_damage] = [0, 0]
  switch (skill_name) {
    case 'unstable-currents':
      ;[flat_damage, dot_damage] = UnstableCurrentsDamage(
        skill_returns,
        nodes_map,
      )
      break
    case 'earth-spike':
      ;[flat_damage, dot_damage] = NaturesFuryDamage(
        nodes_map,
        'earth-spike',
      )
      break
    case 'landslide':
      ;[flat_damage, dot_damage] = NaturesFuryDamage(
        nodes_map,
        'landslide',
      )
      break
    case 'earthen-bulwark':
      ;[flat_damage, dot_damage] = NaturesFuryDamage(
        nodes_map,
        'earthen-bulwark',
      )
      break
    case 'boulder':
      ;[flat_damage, dot_damage] = NaturesFuryDamage(
        nodes_map,
        'boulder',
      )
      break
    case 'wind-shear':
      ;[flat_damage, dot_damage] = NaturesFuryDamage(
        nodes_map,
        'wind-shear',
      )
      break
    case 'storm-strike':
      ;[flat_damage, dot_damage] = NaturesFuryDamage(
        nodes_map,
        'storm-strike',
      )
      break
    case 'tornado':
      ;[flat_damage, dot_damage] = NaturesFuryDamage(
        nodes_map,
        'tornado',
      )
      break
    case 'lightning-storm':
      ;[flat_damage, dot_damage] = NaturesFuryDamage(
        nodes_map,
        'lightning-storm',
      )
      break
    case 'cyclone-armor':
      ;[flat_damage, dot_damage] = NaturesFuryDamage(
        nodes_map,
        'cyclone-armor',
      )
      break
    case 'hurricane':
      ;[flat_damage, dot_damage] = NaturesFuryDamage(
        nodes_map,
        'hurricane',
      )
      break
    case 'claw':
      ;[flat_damage, dot_damage] =
        GreatstaffOfTheCroneDamage(nodes_map)
      break
    case 'poison-creeper':
      ;[flat_damage, dot_damage] = SubterraneanDamage(nodes_map)
      break
    case 'blood-mist':
      ;[flat_damage, dot_damage] = ExplosiveMistDamage(nodes_map)
      break
  }
  skill_returns[skill_name]._flat_damage += flat_damage
  skill_returns[skill_name]._skill_flat_damage += flat_damage
  skill_returns[skill_name]._dot_damage += dot_damage
  skill_returns[skill_name]._skill_dot_damage += dot_damage
}

export function UpdateSpecialSkills(
  skill_returns: Record<string, SkillReturn>,
  player_character: PlayerCharacter,
  nodes_map: NodesMap,
): void {
  switch (player_character.class) {
    case 'Sorcerer':
      UpdateSkill(skill_returns, nodes_map, 'unstable-currents')
      UpdateWithEnchantedFrozenOrbDamage(skill_returns, nodes_map)
      UpdateWithEnchantedIceShardsDamage(skill_returns, nodes_map)
      UpdateWithEnchantedChainLightningDamage(
        skill_returns,
        nodes_map,
      )
      UpdateWithEnchantedMeteorDamage(skill_returns, nodes_map)
      UpdateWithEnchantedBallLightningDamage(skill_returns, nodes_map)
      UpdateWithEnchantedLightningSpear(skill_returns, nodes_map)
      UpdateWithEnchantedFirewallDamage(skill_returns, nodes_map)
      UpdateWithEnchantedFireballDamage(skill_returns, nodes_map)
      break
    case 'Rogue':
      UpdateShadowClone(skill_returns, nodes_map, player_character)
      ScoundrelsLeathersDamage(skill_returns, nodes_map)
      break
    case 'Druid':
      // Nature's Fury: Casting an Earth Skill has a 30% chance to trigger a free Storm Skill of the same category.
      if (talentVal(nodes_map, 'natures-fury') == 1) {
        UpdateSkill(skill_returns, nodes_map, 'earth-spike')
        UpdateSkill(skill_returns, nodes_map, 'landslide')
        UpdateSkill(skill_returns, nodes_map, 'earthen-bulwark')
        UpdateSkill(skill_returns, nodes_map, 'wind-shear')
        UpdateSkill(skill_returns, nodes_map, 'storm-strike')
        UpdateSkill(skill_returns, nodes_map, 'tornado')
        UpdateSkill(skill_returns, nodes_map, 'lightning-storm')
        UpdateSkill(skill_returns, nodes_map, 'cyclone-armor')
        UpdateSkill(skill_returns, nodes_map, 'hurricane')
      }
      // Greatstaff of the Crone : Claw is now a Storm Skill and also casts Storm Strike at {120/150}% normal damage.
      if (
        aspectVal(nodes_map, 'greatstaff-of-the-crone').length > 0
      ) {
        UpdateSkill(skill_returns, nodes_map, 'claw')
      }
      //Subterranean Aspect: Poison Creeper's active also casts Landslide in a circle around you. Earth Skills deal [10 - 20]% increased damage to Poisoned enemies. (Druid Only)
      if (aspectVal(nodes_map, 'subterranean').length > 0) {
        UpdateSkill(skill_returns, nodes_map, 'poison-creeper')
      }
      break
    case 'Necromancer':
      // Blood Artisans Cuirass : When you pick up {5/10} Blood Orbs, a free Bone Spirit is spawned, dealing bonus damage based on your current Life percent.
      // We never pick up blood orbs if you have Gore quills and blood lance.
      if (
        aspectVal(nodes_map, 'blood-artisans-cuirass').length > 0 &&
        (aspectVal(nodes_map, 'gore-quills').length == 0 ||
          !allSkillsVal(nodes_map).has('blood-lance'))
      ) {
        UpdateWithBloodArtisansCuirass(skill_returns, nodes_map)
      }
      UpdateSkill(skill_returns, nodes_map, 'blood-mist')
      break
  }
}

function GeneratorAndSpenderElapsedTime(
  generator_skill_return: SkillReturn,
  spender_skill_return: SkillReturn,
): number {
  if (generator_skill_return._cooldown_seconds > 0) {
    throw 'Generator cannot have a cooldown.'
  }
  if (generator_skill_return._delta_resources <= 0) {
    throw 'Generator cannot cost resources.'
  }
  if (spender_skill_return._delta_resources >= 0) {
    return spender_skill_return._elapsed_time_seconds
  }

  const cost_ratio =
    -spender_skill_return._delta_resources /
    generator_skill_return._delta_resources

  const time_per_rotation =
    generator_skill_return._elapsed_time_seconds * cost_ratio +
    spender_skill_return._elapsed_time_seconds

  return Math.max(time_per_rotation, 0)
}

/**
 * Returns the optimal generator and spender pairings for a given set of skills.
 * If a skill is a spender:
 *   * First index is the skill
 *   * Second is the optimal paired generator
 *   * Third is the dps of the skill/generator pair.
 * Otherwise the second value is the skill again.
 *
 * @param {Object.<string, SkillReturn>} skill_returns - The set of skills to rank.
 * @param {SkillRankFn} skill_rank_function - The function to use to rank the skills.
 *
 * @returns {Array<[SkillReturn, SkillReturn, number]>} The optimal generator and spender pairings for the given set of skills.
 */
export function SetUpAndRankSkillReturns(
  skill_returns: Record<string, SkillReturn>,
  skill_rank_function: SkillRankFn,
): [SkillReturn, SkillReturn, number][] {
  // Remove null skills.
  const skills: SkillReturn[] = []
  for (const skill of Object.values(skill_returns)) {
    if (skill) {
      skills.push(skill)
    }
  }

  const n = skills.length
  const generator_indices: number[] = []
  for (const [index, skill] of skills.entries()) {
    if (skill._delta_resources > 0 && skill._cooldown_seconds == 0) {
      generator_indices.push(index)
    }
  }

  // For index i, if skills[i] is a spender:
  //   * First index is the skill
  //   * Second is the optimal paired generator
  //   * Third is the dps of the skill/generator pair.
  // Otherwise the second value is the skill again.
  const skill_generator_dps = new Array<
    [SkillReturn, SkillReturn, number]
  >(n)
  for (const [index, skill] of skills.entries()) {
    if (skill._delta_resources < 0) {
      let best_dps = 0
      let best_generator_index = -1
      let candidate_dps = 0
      for (const generator_index of generator_indices) {
        candidate_dps = GeneratorAndSpenderDPS(
          skills[generator_index],
          skill,
        )
        if (candidate_dps >= best_dps) {
          best_generator_index = generator_index
          best_dps = candidate_dps
        }
      }
      // (TODO) Fail more gracefully. We should just ignore spenders here.
      if (best_generator_index == -1) {
        return []
      }
      skill_generator_dps[index] = [
        skill,
        skills[best_generator_index],
        best_dps,
      ]
    } else {
      skill_generator_dps[index] = [
        skill,
        skill,
        (skill._flat_damage + skill._dot_damage) /
          Math.max(skill._elapsed_time_seconds, 0.00001),
      ]
    }
  }

  skill_generator_dps.sort(skill_rank_function)
  return skill_generator_dps
}

export type SkillRankFn = (
  a: [SkillReturn, SkillReturn, number],
  b: [SkillReturn, SkillReturn, number],
) => number
