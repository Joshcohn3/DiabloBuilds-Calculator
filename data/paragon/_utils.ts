import csvParser from 'csv-parser'
import { camelCase } from 'lodash'
import Papa from 'papaparse'

import type {
  ParagonDataByRarity,
  ParagonDataMap,
  ParagonGlyph,
  ParagonNode,
} from './_types'
import { PARAGON_GLYPHS } from './Glyphs'

const parseParagonData = (paragonCSV: string) => {
  const paragon = Papa.parse(paragonCSV, {
    delimiter: ',',
    header: true,
    transformHeader: (header: string, _index: number) => {
      const mapping = {
        'board-index': 'boardIndex',
        'json-name': 'jsonName',
        'bonus-mod': 'bonusMod',
        'bonus-value': 'bonusValue',
        'bonus-description': 'bonusDescription',
        'bonus-requirement': 'bonusRequirement',
        'bonus-requirement-scaling1': 'bonusRequirementScaling1',
        'bonus-requirement-value1': 'bonusRequirementValue1',
        'bonus-requirement-mod1': 'bonusRequirementMod1',
        'bonus-requirement-scaling2': 'bonusRequirementScaling2',
        'bonus-requirement-value2': 'bonusRequirementValue2',
        'bonus-requirement-mod2': 'bonusRequirementMod2',
      } as Record<string, string>

      return mapping[header] || header
    },
    transform: (value: string, field: string | number) => {
      if (value === 'empty') {
        return null
      }

      switch (field) {
        case 'boardIndex':
        case 'row':
        case 'column':
        case 'value1':
        case 'value2':
        case 'value3':
        case 'value4':
        case 'bonusValue':
        case 'bonusRequirementValue1':
          return parseFloat(value)
        default:
          return value
      }
    },
  })

  return paragon.data as ParagonNode[]
}

export const createParagonDataMap = (paragonCSV: string) => {
  const paragonNodes = parseParagonData(paragonCSV)
  const paragonDataMap = paragonNodes.reduce((map, node) => {
    const { boardIndex, row, column, jsonName } = node
    if (!jsonName) return map

    if (!map[boardIndex]) map[boardIndex] = {}
    if (!map[boardIndex][row]) map[boardIndex][row] = {}

    map[boardIndex][row][column] = node
    return map
  }, {} as ParagonDataMap)

  return paragonDataMap
}

export const createParagonDataByRarity = (paragonCSV: string) => {
  const paragonNodes = parseParagonData(paragonCSV)
  const paragonDataByRarity = paragonNodes.reduce((map, node) => {
    const { rarity } = node
    if (!map[rarity]) {
      map[rarity] = []
    }
    map[rarity].push(node)
    return map
  }, {} as ParagonDataByRarity)
  return paragonDataByRarity
}

export const parseGlyphData = () => {
  const glyphs = Papa.parse(PARAGON_GLYPHS, {
    delimiter: ',',
    header: true,
    transformHeader: (header: string, _index: number) => {
      return camelCase(header)
    },
    transform: (value: string, field: string | number) => {
      if (value === '') {
        return null
      }

      switch (field) {
        case 'calculatorValuePerPoint':
        case 'displayValue':
        case 'maxGlyphLevel':
        case 'additionalBonusRequirementValue':
        case 'displayValue2':
        case 'calculatorValuePerPoint2':
        case 'levelScaling2':
          return parseFloat(value)

        default:
          return value
      }
    },
  })

  return glyphs.data as ParagonGlyph[]
}

export function generateMappingTable() {
  type Glyphs = Record<string, Record<string, ParagonGlyph>>
  const glyphs: Glyphs = {}
  csvParser({ headers: false, skipLines: 1 })
    .on('data', (row: string[]) => {
      const [
        classType,
        name,
        rarity,
        description,
        mod,
        displayValue,
        calculatorValuePerPoint,
        levelScaling,
        maxGlyphLevel,
        scalingMod,
        scalingNodes,
        additionalBonusDescription,
        additionalBonusRequirementMod,
        additionalBonusRequirementValue,
        image,
        description2,
        displayValue2,
        calculatorValuePerPoint2,
        levelScaling2,
        scalingNodes2,
      ] = row
      if (!glyphs[classType]) {
        glyphs[classType] = {}
      }
      const glyph: ParagonGlyph = {
        name,
        rarity,
        description,
        mod,
        displayValue: Number(displayValue),
        calculatorValuePerPoint,
        levelScaling,
        maxGlyphLevel: Number(maxGlyphLevel),
        scalingMod,
        scalingNodes,
        additionalBonusDescription,
        additionalBonusRequirementMod,
        additionalBonusRequirementValue,
        image,
        description2,
        displayValue2: Number(displayValue2),
        calculatorValuePerPoint2,
        levelScaling2,
        scalingNodes2,
      }
      glyphs[classType][name] = glyph
    })
    .write(PARAGON_GLYPHS)
  return glyphs
}
