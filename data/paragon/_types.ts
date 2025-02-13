export type ParagonNode = {
  class: string
  board: string
  boardIndex: number
  row: number
  column: number
  jsonName: string
  name: string | null
  rarity: string
  description: string
  mod1: string
  value1: number
  mod2: string
  value2: number
  mod3: string
  value3: number
  mod4: string
  value4: number
  bonusMod: string
  bonusValue: number
  bonusDescription: string
  bonusRequirement: string
  bonusRequirementScaling1: string
  bonusRequirementValue1: number
  bonusRequirementMod1: string
  bonusRequirementScaling2: string
  bonusRequirementValue2: number
  bonusRequirementMod2: string
}

export type ParagonDataMap = Record<
  number,
  Record<number, Record<number, ParagonNode>>
>

export type ParagonDataByRarity = Record<string, ParagonNode[]>

export type ParagonGlyph = {
  class?: string
  name: string
  rarity: string
  description: string
  displayValue: number
  calculatorValuePerPoint: string
  levelScaling?: string
  maxGlyphLevel: number
  mod?: string
  scalingMod: string
  scalingNodes: string
  additionalBonusDescription: string
  additionalBonusRequirementMod: string
  additionalBonusRequirementValue: string
  image?: string
  description2?: string
  displayValue2?: number
  calculatorValuePerPoint2?: string
  levelScaling2?: string
  scalingNodes2?: string
}
