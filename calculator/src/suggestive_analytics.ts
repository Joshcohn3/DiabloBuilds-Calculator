import {
  normalizedAffixModifiers,
  topBreakpointAffixModifiers,
} from 'data'

import {
  ScaleFlatValueByItemPower,
  ScaleModifierRangeByUpgradeLevel,
} from './calculation_helpers'
import {
  instanceOfArmor,
  instanceOfWeapon,
  PlayerCharacter,
} from './player_character'
import { RunCalculations } from './run_calculation'

export function RankModifiers(player_character: PlayerCharacter): {
  name: string
  value: string
  dps: number
}[] {
  const normalized_values: {
    name: string
    value: string
    dps: number
  }[] = []
  for (const value of Object.values(
    normalizedAffixModifiers(player_character.class),
  )) {
    player_character.bonusPowers = {}
    const BaseDps =
      RunCalculations(player_character)._summary_stats
        ._effective_dps_aoe
    const upgraded_normalized_value: number =
      ScaleModifierRangeByUpgradeLevel(
        value.slugModifierName,
        value.normalizedValue,
        5,
      )

    player_character.bonusPowers = {
      modifiers: [
        [
          value.slugModifierName,
          // Use the 5/5 upgrade value.
          upgraded_normalized_value,
        ],
      ],
    }
    const AfterDps =
      RunCalculations(player_character)._summary_stats
        ._effective_dps_aoe
    let value_string = ''
    if (value.displaySymbol === '%') {
      value_string =
        (upgraded_normalized_value * 100).toFixed(1) + '%'
    } else {
      value_string = upgraded_normalized_value.toFixed(0)
    }
    if (AfterDps - BaseDps > 0) {
      normalized_values.push({
        name: value.modifierName,
        value: value_string,
        dps: Math.round(AfterDps - BaseDps),
      })
    }
  }
  function DpsRankFn(
    a: {
      name: string
      value: string
      dps: number
    },
    b: {
      name: string
      value: string
      dps: number
    },
  ): number {
    if (a.dps > b.dps) {
      return -1
    }
    if (a.dps < b.dps) {
      return 1
    }
    return 0
  }

  normalized_values.sort(DpsRankFn)
  return normalized_values
}

interface MultiValueModifier {
  name: string
  value_0: string
  dps_0: number
  life_0: number
  value_25: string
  dps_25: number
  life_25: number
  value_50: string
  dps_50: number
  life_50: number
  value_75: string
  dps_75: number
  life_75: number
  value_100: string
  dps_100: number
  life_100: number
}

export function ComputeMultiValueModifiers(
  player_character: PlayerCharacter,
): MultiValueModifier[] {
  const modifier_values: {
    name: string
    value_0: string
    dps_0: number
    life_0: number
    value_25: string
    dps_25: number
    life_25: number
    value_50: string
    dps_50: number
    life_50: number
    value_75: string
    dps_75: number
    life_75: number
    value_100: string
    dps_100: number
    life_100: number
  }[] = []
  for (const value of Object.values(
    topBreakpointAffixModifiers(player_character.class),
  )) {
    if (value.modifierName === 'Thorns') {
      continue
    }
    const modifier_result = {
      name: value.modifierName,
      value_0: '',
      dps_0: 0,
      life_0: 0,
      value_25: '',
      dps_25: 0,
      life_25: 0,
      value_50: '',
      dps_50: 0,
      life_50: 0,
      value_75: '',
      dps_75: 0,
      life_75: 0,
      value_100: '',
      dps_100: 0,
      life_100: 0,
    }
    player_character.bonusPowers = {}
    let CalcOutput = RunCalculations(player_character)
    let PrevDps = CalcOutput._summary_stats._effective_dps_aoe
    let PrevLife = CalcOutput._summary_stats._effective_life

    const dpsArray: number[] = []
    const lifeArray: number[] = []
    for (let i = 0; i < 5; i++) {
      const modifier_value =
        value.minValue + 0.25 * i * (value.maxValue - value.minValue)
      const upgraded_modifier_value: number =
        ScaleModifierRangeByUpgradeLevel(
          value.slugModifierName,
          modifier_value,
          5,
        )

      player_character.bonusPowers = {
        modifiers: [
          [
            value.slugModifierName,
            // Use the 5/5 upgrade value.
            upgraded_modifier_value,
          ],
        ],
      }
      CalcOutput = RunCalculations(player_character)
      const AfterDps = CalcOutput._summary_stats._effective_dps_aoe
      const AfterLife = CalcOutput._summary_stats._effective_life

      dpsArray.push(AfterDps - PrevDps)
      lifeArray.push(AfterLife - PrevLife)
      let value_string = ''
      if (value.displaySymbol === '%') {
        value_string =
          (upgraded_modifier_value * 100).toFixed(1) + '%'
      } else {
        value_string = upgraded_modifier_value.toFixed(0)
      }
      switch (i) {
        case 0:
          modifier_result.value_0 = value_string
          modifier_result.dps_0 =
            PrevDps > 0
              ? Math.round(
                  Math.max(
                    ((AfterDps - PrevDps) / PrevDps) * 1000,
                    0,
                  ),
                ) / 10
              : 0
          modifier_result.life_0 =
            PrevLife > 0
              ? Math.round(
                  Math.max(
                    ((AfterLife - PrevLife) / PrevLife) * 1000,
                    0,
                  ),
                ) / 10
              : 0

          break
        case 1:
          modifier_result.value_25 = value_string
          modifier_result.dps_25 =
            PrevDps > 0
              ? Math.round(
                  Math.max(
                    ((AfterDps - PrevDps) / PrevDps) * 1000,
                    0,
                  ),
                ) / 10
              : 0
          modifier_result.life_25 =
            PrevLife > 0
              ? Math.round(
                  Math.max(
                    ((AfterLife - PrevLife) / PrevLife) * 1000,
                    0,
                  ),
                ) / 10
              : 0
          break
        case 2:
          modifier_result.value_50 = value_string
          modifier_result.dps_50 =
            PrevDps > 0
              ? Math.round(
                  Math.max(
                    ((AfterDps - PrevDps) / PrevDps) * 1000,
                    0,
                  ),
                ) / 10
              : 0
          modifier_result.life_50 =
            PrevLife > 0
              ? Math.round(
                  Math.max(
                    ((AfterLife - PrevLife) / PrevLife) * 1000,
                    0,
                  ),
                ) / 10
              : 0
          break
        case 3:
          modifier_result.value_75 = value_string
          modifier_result.dps_75 =
            PrevDps > 0
              ? Math.round(
                  Math.max(
                    ((AfterDps - PrevDps) / PrevDps) * 1000,
                    0,
                  ),
                ) / 10
              : 0
          modifier_result.life_75 =
            PrevLife > 0
              ? Math.round(
                  Math.max(
                    ((AfterLife - PrevLife) / PrevLife) * 1000,
                    0,
                  ),
                ) / 10
              : 0
          break
        case 4:
          modifier_result.value_100 = value_string
          modifier_result.dps_100 =
            PrevDps > 0
              ? Math.round(
                  Math.max(
                    ((AfterDps - PrevDps) / PrevDps) * 1000,
                    0,
                  ),
                ) / 10
              : 0
          modifier_result.life_100 =
            PrevLife > 0
              ? Math.round(
                  Math.max(
                    ((AfterLife - PrevLife) / PrevLife) * 1000,
                    0,
                  ),
                ) / 10
              : 0
          break
      }
      PrevDps = Math.max(AfterDps, PrevDps)
      PrevLife = Math.max(AfterLife, PrevLife)
    }
    modifier_values.push(modifier_result)
  }
  return modifier_values
}

export function DpsRankMultiValueModifiers(
  multi_value_modifiers: MultiValueModifier[],
): {
  name: string
  value_0: string
  dps_0: number
  value_25: string
  dps_25: number
  value_50: string
  dps_50: number
  value_75: string
  dps_75: number
  value_100: string
  dps_100: number
}[] {
  const modifier_values: {
    name: string
    value_0: string
    dps_0: number
    value_25: string
    dps_25: number
    value_50: string
    dps_50: number
    value_75: string
    dps_75: number
    value_100: string
    dps_100: number
  }[] = []
  for (const value of multi_value_modifiers) {
    const dps_values = {
      name: value.name,
      value_0: value.value_0,
      dps_0: value.dps_0,
      value_25: value.value_25,
      dps_25: value.dps_25,
      value_50: value.value_50,
      dps_50: value.dps_50,
      value_75: value.value_75,
      dps_75: value.dps_75,
      value_100: value.value_100,
      dps_100: value.dps_100,
    }
    if (
      dps_values.dps_0 +
        dps_values.dps_25 +
        dps_values.dps_50 +
        dps_values.dps_75 +
        dps_values.dps_100 >
      0
    ) {
      modifier_values.push(dps_values)
    }
  }

  function DpsRankFn(
    a: {
      name: string
      value_0: string
      dps_0: number
      value_25: string
      dps_25: number
      value_50: string
      dps_50: number
      value_75: string
      dps_75: number
      value_100: string
      dps_100: number
    },
    b: {
      name: string
      value_0: string
      dps_0: number
      value_25: string
      dps_25: number
      value_50: string
      dps_50: number
      value_75: string
      dps_75: number
      value_100: string
      dps_100: number
    },
  ): number {
    const a_sum = a.dps_0 + a.dps_25 + a.dps_50 + a.dps_75 + a.dps_100
    const b_sum = b.dps_0 + b.dps_25 + b.dps_50 + b.dps_75 + b.dps_100
    if (a_sum > b_sum) {
      return -1
    }
    if (a_sum < b_sum) {
      return 1
    }
    return 0
  }

  modifier_values.sort(DpsRankFn)
  return modifier_values
}

export function LifeRankMultiValueModifiers(
  multi_value_modifiers: MultiValueModifier[],
): {
  name: string
  value_0: string
  life_0: number
  value_25: string
  life_25: number
  value_50: string
  life_50: number
  value_75: string
  life_75: number
  value_100: string
  life_100: number
}[] {
  const modifier_values: {
    name: string
    value_0: string
    life_0: number
    value_25: string
    life_25: number
    value_50: string
    life_50: number
    value_75: string
    life_75: number
    value_100: string
    life_100: number
  }[] = []
  for (const value of multi_value_modifiers) {
    const life_values = {
      name: value.name,
      value_0: value.value_0,
      life_0: value.life_0,
      value_25: value.value_25,
      life_25: value.life_25,
      value_50: value.value_50,
      life_50: value.life_50,
      value_75: value.value_75,
      life_75: value.life_75,
      value_100: value.value_100,
      life_100: value.life_100,
    }
    if (
      life_values.life_0 +
        life_values.life_25 +
        life_values.life_50 +
        life_values.life_75 +
        life_values.life_100 >
      0
    ) {
      modifier_values.push(life_values)
    }
  }

  function LifeRankFn(
    a: {
      name: string
      value_0: string
      life_0: number
      value_25: string
      life_25: number
      value_50: string
      life_50: number
      value_75: string
      life_75: number
      value_100: string
      life_100: number
    },
    b: {
      name: string
      value_0: string
      life_0: number
      value_25: string
      life_25: number
      value_50: string
      life_50: number
      value_75: string
      life_75: number
      value_100: string
      life_100: number
    },
  ): number {
    const a_sum =
      a.life_0 + a.life_25 + a.life_50 + a.life_75 + a.life_100
    const b_sum =
      b.life_0 + b.life_25 + b.life_50 + b.life_75 + b.life_100
    if (a_sum > b_sum) {
      return -1
    }
    if (a_sum < b_sum) {
      return 1
    }
    return 0
  }

  modifier_values.sort(LifeRankFn)
  return modifier_values
}

function RemoveAspectIfPresent(
  player_character: PlayerCharacter,
  aspectSlug: string,
) {
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
      if (!(instanceOfArmor(gear) || instanceOfWeapon(gear))) {
        console.log('Gear not armor or weapon error: ' + gear_slot)
        return
      }
      if (gear) {
        const { aspect } = gear
        if (aspect instanceof Array) {
          if (aspect.length != 2) {
            // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
            console.log(`${gear_slot} aspect not valid: ${aspect}`)
            continue
          }
          if (aspect[0] === aspectSlug) {
            gear.aspect = undefined
          }
        }
      }
    }
  }
}

const isTwoHandWeapon = (equipmentTypeSlug: string) =>
  [
    'two-handed-axe',
    'two-handed-mace',
    'two-handed-sword',
    'polearm',
    'two-handed-scythe',
    'staff',
    'bow',
    'crossbow',
    'offensive',
  ].includes(equipmentTypeSlug)

function CategoryIncludesMultiplierType(
  categorySlug: string,
  multiplierType: string,
): boolean {
  switch (multiplierType) {
    case 'standard':
      return ![
        'two-handed-axe',
        'two-handed-mace',
        'two-handed-sword',
        'polearm',
        'two-handed-scythe',
        'staff',
        'bow',
        'crossbow',
        'amulet',
        'mobility',
      ].includes(categorySlug)

    case 'amulet':
      return [
        'amulet',
        'offensive',
        'defensive',
        'mobility',
        //'resource',
        'utility',
      ].includes(categorySlug)

    case 'twoHanded':
      return [
        'two-handed-axe',
        'two-handed-mace',
        'two-handed-sword',
        'polearm',
        'two-handed-scythe',
        'staff',
        'bow',
        'crossbow',
        'offensive',
      ].includes(categorySlug)
    default:
      return false
  }
}

// Uniques which have a fixed slot do not need to get a multiplier.
function AspectValueMultiplier(
  categorySlug: string,
  multiplierType: string,
): number {
  switch (multiplierType) {
    case 'standard':
      return 1

    case 'amulet':
      if (categorySlug === 'amulet') {
        return 1
      }
      return 1.5

    case 'twoHanded':
      if (categorySlug === 'offensive') {
        return 2
      }
      return 1
    default:
      return 1
  }
}

export function ComputeAspectRankingValues(
  aspect_inputs: {
    aspectName: string
    aspectSlug: string
    aspectValues: [number, string][]
    categorySlug: string
  }[],
  player_character: PlayerCharacter,
): {
  name: string
  dps: number
  amuletDps: number
  twoHandedDps: number
  life: number
  amuletLife: number
  twoHandedLife: number
}[] {
  const aspect_outputs: {
    name: string
    dps: number
    amuletDps: number
    twoHandedDps: number
    life: number
    amuletLife: number
    twoHandedLife: number
  }[] = []
  for (const value of aspect_inputs) {
    const aspect_output = {
      name: value.aspectName,
      dps: 0,
      amuletDps: 0,
      twoHandedDps: 0,
      life: 0,
      amuletLife: 0,
      twoHandedLife: 0,
    }
    player_character.bonusPowers = {}
    const characterCopy: PlayerCharacter = JSON.parse(
      JSON.stringify(player_character),
    )
    RemoveAspectIfPresent(characterCopy, value.aspectSlug)
    let CalcOutput = RunCalculations(characterCopy)
    const BaseDps = CalcOutput._summary_stats._effective_dps_aoe
    const BaseLife = CalcOutput._summary_stats._effective_life

    let PrevDps = BaseDps
    let PrevLife = BaseLife
    for (const multiplierType of [
      'standard',
      'amulet',
      'twoHanded',
    ]) {
      if (
        !CategoryIncludesMultiplierType(
          value.categorySlug,
          multiplierType,
        )
      ) {
        continue
      }
      const multiplier = AspectValueMultiplier(
        value.categorySlug,
        multiplierType,
      )
      const scaled_values = value.aspectValues.map(
        ([value, displayType]) => {
          if (displayType === 'flat-value') {
            return (
              ScaleFlatValueByItemPower(800, value, 0) * multiplier
            )
          } else {
            return value * multiplier
          }
        },
      )
      characterCopy.bonusPowers = {
        aspect: [value.aspectSlug, scaled_values],
      }

      try {
        CalcOutput = RunCalculations(characterCopy)
      } catch (error) {
        continue
      }
      const AfterDps = CalcOutput._summary_stats._effective_dps_aoe
      const AfterLife = CalcOutput._summary_stats._effective_life
      // The incremental % increase in DPS or life from the aspect over the weaker version.
      const percent_dps =
        BaseDps > 0
          ? Math.round(
              Math.max(
                ((AfterDps - BaseDps) / BaseDps -
                  (PrevDps - BaseDps) / BaseDps) *
                  1000,
                0,
              ),
            ) / 10
          : 0

      const percent_life =
        BaseLife > 0
          ? Math.round(
              Math.max(
                ((AfterLife - BaseLife) / BaseLife -
                  (PrevLife - BaseLife) / BaseLife) *
                  1000,
                0,
              ),
            ) / 10
          : 0

      PrevDps = Math.max(PrevDps, AfterDps)
      PrevLife = Math.max(PrevLife, AfterLife)
      switch (multiplierType) {
        case 'standard':
          aspect_output.dps = percent_dps
          aspect_output.life = percent_life
          break
        case 'amulet':
          aspect_output.amuletDps = percent_dps
          aspect_output.amuletLife = percent_life
          break
        case 'twoHanded':
          aspect_output.twoHandedDps = percent_dps
          aspect_output.twoHandedLife = percent_life
          break
      }
    }

    aspect_outputs.push(aspect_output)
  }
  return aspect_outputs
}

export function DpsRankAspects(
  aspectResults: {
    name: string
    dps: number
    amuletDps: number
    twoHandedDps: number
    life: number
    amuletLife: number
    twoHandedLife: number
  }[],
): {
  name: string
  dps: number
  amuletDps: number
  twoHandedDps: number
}[] {
  const aspect_dps_results: {
    name: string
    dps: number
    amuletDps: number
    twoHandedDps: number
  }[] = []
  for (const value of aspectResults) {
    const dps_values = {
      name: value.name,
      dps: value.dps,
      amuletDps: value.amuletDps,
      twoHandedDps: value.twoHandedDps,
    }
    if (
      dps_values.dps +
        dps_values.amuletDps +
        dps_values.twoHandedDps >
      0
    ) {
      aspect_dps_results.push(dps_values)
    }
  }

  function DpsRankFn(
    a: {
      name: string
      dps: number
      amuletDps: number
      twoHandedDps: number
    },
    b: {
      name: string
      dps: number
      amuletDps: number
      twoHandedDps: number
    },
  ): number {
    if (
      a.dps + a.amuletDps + a.twoHandedDps >
      b.dps + b.amuletDps + b.twoHandedDps
    ) {
      return -1
    }
    if (
      a.dps + a.amuletDps + a.twoHandedDps <
      b.dps + b.amuletDps + b.twoHandedDps
    ) {
      return 1
    }
    return 0
  }

  aspect_dps_results.sort(DpsRankFn)
  return aspect_dps_results
}

export function LifeRankAspects(
  aspectResults: {
    name: string
    dps: number
    amuletDps: number
    twoHandedDps: number
    life: number
    amuletLife: number
    twoHandedLife: number
  }[],
): {
  name: string
  life: number
  amuletLife: number
  twoHandedLife: number
}[] {
  const aspect_life_results: {
    name: string
    life: number
    amuletLife: number
    twoHandedLife: number
  }[] = []
  for (const value of aspectResults) {
    const life_values = {
      name: value.name,
      life: value.life,
      amuletLife: value.amuletLife,
      twoHandedLife: value.twoHandedLife,
    }
    if (
      life_values.life +
        life_values.amuletLife +
        life_values.twoHandedLife >
      0
    ) {
      aspect_life_results.push(life_values)
    }
  }

  function LifeRankFn(
    a: {
      name: string
      life: number
      amuletLife: number
      twoHandedLife: number
    },
    b: {
      name: string
      life: number
      amuletLife: number
      twoHandedLife: number
    },
  ): number {
    if (
      a.life + a.amuletLife + a.twoHandedLife >
      b.life + b.amuletLife + b.twoHandedLife
    ) {
      return -1
    }
    if (
      a.life + a.amuletLife + a.twoHandedLife <
      b.life + b.amuletLife + b.twoHandedLife
    ) {
      return 1
    }
    return 0
  }

  aspect_life_results.sort(LifeRankFn)
  return aspect_life_results
}
