import {
  camelCase,
  flatMap,
  groupBy,
  map,
  uniq,
  uniqBy,
} from 'lodash'
import Papa from 'papaparse'

import {
  EquipmentAffixModifier,
  EquipmentAffixModifierValue,
  EquipmentAspect,
  EquipmentData,
  EquipmentImplicit,
  EquipmentType,
  EquipmentUniqueItem,
} from './_types'
import { EQUIPMENT_AFFIX_MODIFIER_TABLE } from './affix-modifier-table'
import { EQUIPMENT_ASPECT_TABLE } from './aspect-table'
import { EQUIPMENT_TABLE } from './equipment-table'
import { EQUIPMENT_IMPLICIT_TABLE } from './implicit-table'
import { EQUIPMENT_UNIQUE_TABLE } from './unique-table'

export const loadEquipmentData = (
  playerClass: string,
  classProperty: keyof EquipmentType,
): EquipmentData => {
  const types = loadEquipmentTypesTable().filter(
    (item) => item[classProperty],
  )

  const equipmentTypeSlugs = types.map(
    (item) => item.equipmentTypeSlug,
  )

  const aspects = loadAspectsTable().filter(
    (aspect) =>
      aspect.class === playerClass || aspect.class === 'Generic',
  )

  const uniqueItems = loadUniqueEquipmentTable().filter(
    (uniqueItem) => {
      return (
        equipmentTypeSlugs.includes(uniqueItem.equipmentType) &&
        [playerClass.toLowerCase(), 'generic'].includes(
          uniqueItem.class.toLowerCase(),
        )
      )
    },
  )

  const implicits = loadImplicitsTable()
  const affixModifiers = Object.entries(
    loadAffixModifiersTable(),
  ).reduce(
    (acc, [key, value]) => {
      acc[key] = value.filter(
        (modifier) =>
          modifier.specificClasses['All'] ||
          modifier.specificClasses[playerClass],
      )
      return acc
    },
    {} as Record<string, EquipmentAffixModifier[]>,
  )

  return {
    types,
    uniqueItems,
    aspects,
    affixModifiers,
    implicits,
  }
}

/**
 * This function is deprecated and should not be used.
 * Use {@link getEquipmentTypesFromDatabase} instead. Will remove at future date.
 * @deprecated
 * @see getEquipmentTypesFromDatabase
 */
export const loadEquipmentTypesTable = () => {
  const parseResult = Papa.parse<EquipmentType>(
    EQUIPMENT_TABLE.trim(),
    {
      delimiter: ',',
      header: true,
      transformHeader: (header: string) => {
        return camelCase(header)
      },
      transform(value: string, field: string | number): any {
        if ((field as string).startsWith('class')) {
          return !!parseInt(value, 10)
        }

        if (
          [
            'weaponAttackSpeed',
            'modifierMultiplier',
            'offensiveAspectMultiplier',
            'defensiveAspectMultiplier',
            'resourceAspectMultiplier',
            'utilityAspectMultiplier',
            'mobilityAspectMultiplier',
          ].includes(field as string)
        ) {
          return parseFloat(value)
        }

        return value
      },
    },
  )

  return parseResult.data
}

/**
 * This function is deprecated and should not be used.
 * Use {@link getUniqueItemsFromDatabase} instead. Will remove at future date.
 * @deprecated
 * @see getUniqueItemsFromDatabase
 */
export const loadUniqueEquipmentTable = () => {
  const parseResult = Papa.parse<EquipmentUniqueItem>(
    EQUIPMENT_UNIQUE_TABLE.trim(),
    {
      delimiter: ',',
      header: true,
      transformHeader: (header: string) => {
        return camelCase(header)
      },
      transform(value: string, field: string | number): any {
        if (
          [
            'itemPower',
            'uniquePowerValue1Min',
            'uniquePowerValue1Max',
            'uniquePowerValue2Min',
            'uniquePowerValue2Max',
            'mod1ValuesMin',
            'mod1ValuesMax',
            'mod2ValuesMin',
            'mod2ValuesMax',
            'mod3ValuesMin',
            'mod3ValuesMax',
            'mod4ValuesMin',
            'mod4ValuesMax',
          ].includes(field as string)
        ) {
          return parseFloat(value)
        }

        return value
      },
    },
  )

  return parseResult.data
}

/**
 * This function is deprecated and should not be used.
 * Use {@link getAspectsFromDatabase} instead. Will remove at future date.
 * @deprecated
 * @see getAspectsFromDatabase
 */
export const loadAspectsTable = () => {
  const parseResult = Papa.parse<EquipmentAspect>(
    EQUIPMENT_ASPECT_TABLE.trim(),
    {
      delimiter: ',',
      header: true,
      transformHeader: (header: string) => {
        return camelCase(header)
      },
      transform(value: string, field: string | number): any {
        if (
          [
            'valueMax1',
            'valueMin1',
            'valueMax2',
            'valueMin2',
          ].includes(field as string)
        ) {
          return parseFloat(value)
        }

        return value
      },
    },
  )

  return parseResult.data
}

/**
 * This function is deprecated and should not be used.
 * Use {@link getAffixModifiersFromDatabase} instead. Will remove at future date.
 * @deprecated
 * @see getAffixModifiersFromDatabase
 */
export const loadAffixModifiersTable = () => {
  const parseResult = Papa.parse<{
    modifierName: string
    slugModifierName: string
    equipmentType: string
    equipmentTypeSlug: string
    itemPower: number
    minValue: number
    maxValue: number
    displaySymbol: string
    classSpecific1: string
    classSpecific2: string
    classSpecific3: string
    classSpecific4: string
  }>(EQUIPMENT_AFFIX_MODIFIER_TABLE.trim(), {
    delimiter: ',',
    header: true,
    transformHeader: (header: string) => {
      return camelCase(header)
    },
    transform(value: string, field: string | number): any {
      switch (field) {
        case 'itemPower':
          return parseInt(value, 10)
        case 'minValue':
        case 'maxValue':
          return parseFloat(value)
        default:
          return value
      }
    },
  })

  const groupedBySlot = groupBy(parseResult.data, 'equipmentTypeSlug')

  return Object.fromEntries(
    map(groupedBySlot, (modifiers, slot) => {
      const uniqueSlugs = uniq(
        modifiers.map((modifier) => modifier.slugModifierName),
      )

      const reduced = uniqueSlugs.map((slug) => {
        const modifier = modifiers.find(
          (modifier) => modifier.slugModifierName === slug,
        )

        if (modifier === undefined) {
          throw new Error(`Modifier ${slug} not found`)
        }

        const values = uniqBy(
          modifiers.filter(
            (modifier) => modifier.slugModifierName === slug,
          ),
          'itemPower',
        ).map(
          (modifier) =>
            ({
              itemPower: modifier.itemPower,
              minValue: modifier.minValue,
              maxValue: modifier.maxValue,
              displaySymbol: modifier.displaySymbol,
            }) as EquipmentAffixModifierValue,
        )

        return {
          modifierName: modifier.modifierName,
          slugModifierName: modifier.slugModifierName,
          equipmentType: modifier.equipmentType,
          equipmentTypeSlug: modifier.equipmentTypeSlug,
          specificClasses: {
            [modifier.classSpecific1]: true,
            [modifier.classSpecific2]: true,
            [modifier.classSpecific3]: true,
            [modifier.classSpecific4]: true,
          },
          values,
        } as EquipmentAffixModifier
      })

      return [slot, reduced]
    }),
  )
}

/**
 * This function is deprecated and should not be used.
 * Use {@link getImplicitsFromDatabase} instead. Will remove at future date.
 * @deprecated
 * @see getImplicitsFromDatabase
 */
export const loadImplicitsTable = () => {
  const parseResult = Papa.parse<
    EquipmentImplicit & {
      implicitMaxValue: number
      implicitMinValue: number
      itemPower: number
      displayType: string
    }
  >(EQUIPMENT_IMPLICIT_TABLE.trim(), {
    delimiter: ',',
    header: true,
    transformHeader: (header: string) => {
      return camelCase(header)
    },
    transform(value: string, field: string | number): any {
      if (value.toLowerCase() === '') {
        return null
      }

      if (
        [
          'implicitMaxValue',
          'implicitMinValue',
          'itemPower',
        ].includes(field as string)
      ) {
        return parseFloat(value)
      }

      return value
    },
  })

  return flatMap(
    groupBy(parseResult.data, 'equipmentTypeSlug'),
    (implicitsByWeaponType) => {
      return map(
        groupBy(implicitsByWeaponType, 'implicitModifierSlugName'),
        (implicits) => {
          return {
            ...implicits[0],
            values: implicits.map((implicit) => ({
              itemPower: implicit.itemPower,
              minValue: implicit.implicitMinValue,
              maxValue: implicit.implicitMaxValue,
              description: implicit.description,
              displaySymbol: implicit.displaySymbol,
            })) as EquipmentAffixModifierValue[],
          } as EquipmentImplicit
        },
      )
    },
  )
}

export const toPercent = (value: number) => {
  const numberDisplay = value * 100
  return `${numberDisplay.toFixed(1)}%`
}

export type normalizedModifierValue = {
  modifierName: string
  slugModifierName: string
  normalizedValue: number
  displaySymbol: string
}

export const normalizedAffixModifiers = (playerClass: string) => {
  const normalizedModifiers: Record<string, normalizedModifierValue> =
    {}
  const modifiersTable: Record<string, EquipmentAffixModifier[]> =
    loadAffixModifiersTable()
  for (const key of Object.keys(modifiersTable)) {
    for (const modifier of modifiersTable[key]) {
      if (modifier.slugModifierName in normalizedModifiers) {
        continue
      }
      if (
        !(
          modifier.specificClasses['All'] ||
          modifier.specificClasses[playerClass]
        )
      ) {
        continue
      }
      let normalizedValue = 0
      let displaySymbol = ''
      let maxItemPower = 0
      for (const value of modifier.values) {
        displaySymbol = value.displaySymbol
        if (value.itemPower >= maxItemPower) {
          normalizedValue = (value.maxValue + value.minValue) / 2
          maxItemPower = value.itemPower
        }
      }
      normalizedModifiers[modifier.slugModifierName] = {
        modifierName: modifier.modifierName,
        slugModifierName: modifier.slugModifierName,
        normalizedValue: normalizedValue,
        displaySymbol: displaySymbol,
      }
    }
  }
  return normalizedModifiers
}

export type topBreakpointModifierValue = {
  modifierName: string
  slugModifierName: string
  minValue: number
  maxValue: number
  displaySymbol: string
}

export const topBreakpointAffixModifiers = (playerClass: string) => {
  const topBreakpointModifiers: Record<
    string,
    topBreakpointModifierValue
  > = {}
  const modifiersTable: Record<string, EquipmentAffixModifier[]> =
    loadAffixModifiersTable()
  for (const key of Object.keys(modifiersTable)) {
    for (const modifier of modifiersTable[key]) {
      if (modifier.slugModifierName in topBreakpointModifiers) {
        continue
      }
      if (
        !(
          modifier.specificClasses['All'] ||
          modifier.specificClasses[playerClass]
        )
      ) {
        continue
      }
      let minValue = 0
      let maxValue = 0
      let displaySymbol = ''
      let maxItemPower = 0
      for (const value of modifier.values) {
        displaySymbol = value.displaySymbol
        if (value.itemPower >= maxItemPower) {
          minValue = value.minValue
          maxValue = value.maxValue
          maxItemPower = value.itemPower
        }
      }
      topBreakpointModifiers[modifier.slugModifierName] = {
        modifierName: modifier.modifierName,
        slugModifierName: modifier.slugModifierName,
        minValue: minValue,
        maxValue: maxValue,
        displaySymbol: displaySymbol,
      }
    }
  }
  return topBreakpointModifiers
}
