export type EquipmentData = {
  types: EquipmentType[]
  uniqueItems: EquipmentUniqueItem[]
  aspects: EquipmentAspect[]
  affixModifiers: Record<string, EquipmentAffixModifier[]>
  implicits: EquipmentImplicit[]
}

export type EquipmentType = {
  equipmentType: string
  equipmentTypeSlug: string
  weaponAttackSpeed?: number
  classBarbarian: boolean
  classDruid: boolean
  classNecromancer: boolean
  classRogue: boolean
  classSorcerer: boolean
}

export type EquipmentUniqueItem = {
  class: string
  uniqueName: string
  uniqueSlugName: string
  equipmentType: string
  uniquePower: string
  itemPower: number
  uniquePowerValue1Min: number
  uniquePowerValue1Max: number
  uniquePowerValue2Min: number
  uniquePowerValue2Max: number
  uniquePowerDisplay: string
  implicit1Name: string
  implicit1SlugName: string
  implicit2Name: string
  implicit2SlugName: string
  mod1Name: string
  mod1SlugName: string
  mod2Name: string
  mod2SlugName: string
  mod3Name: string
  mod3SlugName: string
  mod4Name: string
  mod4SlugName: string
  mod1ValuesMin: number
  mod1ValuesMax: number
  mod2ValuesMin: number
  mod2ValuesMax: number
  mod3ValuesMin: number
  mod3ValuesMax: number
  mod4ValuesMin: number
  mod4ValuesMax: number
  uniquePowerDisplay1: string
  uniquePowerDisplay2: string
}

export type EquipmentAspect = {
  id: number
  class: string
  classSlug: string
  category: string
  categorySlug: string
  name: string
  nameSlug: string
  type: string
  typeSlug: string
  description: string
  valueMin1?: number | null
  valueMax1?: number | null
  valueDisplay1?: string | null
  valueMin2?: number | null
  valueMax2?: number | null
  valueDisplay2?: string | null
}

export type EquipmentAffixModifierValue = {
  itemPower: number
  minValue: number
  maxValue: number
  displaySymbol: string
}

export type EquipmentAffixModifier = {
  modifierName: string
  slugModifierName: string
  equipmentType: string
  equipmentTypeSlug: string
  specificClasses: Record<string, boolean>
  uniqueName?: string
  uniqueNameSlug?: string
  values: EquipmentAffixModifierValue[]
}

export type EquipmentImplicit = {
  description: string
  displaySymbol: string
  displayType: string
  equipmentType: string
  equipmentTypeSlug: string
  implicitModifierName: string
  implicitModifierSlugName: string
  values: EquipmentAffixModifierValue[]
}

export type WeaponDpsTable = {
  itemPower: number
  oneHandDps: number
  twoHandDps: number
  aspectItemPowerStrength: number
}
