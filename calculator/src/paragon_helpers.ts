/* eslint-disable @typescript-eslint/no-unused-vars */
import { ParagonGlyph, ParagonNode } from 'data/paragon/_types'

import { BaseStatsNode } from './computation_graph'
import { instanceOfArmor, instanceOfWeapon } from './player_character'
import { PlayerCharacter } from '.'

function ModifierSatisfiesType(
  modifier: string,
  type: string,
): boolean {
  const non_physical_mods = [
    'non-physical-damage',
    'resistance-to-all-elements',
    'shadow-damage',
    'shadow-resistance',
  ]
  const physical_mods = [
    'armor',
    'physical-damage',
    'physical-damage-over-time',
  ]
  const fire_mods = ['fire-damage', 'fire-resistance']
  const cold_mods = ['cold-damage', 'cold-resistance']
  const lightning_mods = ['lightning-damage', 'lightning-resistance']
  const minion_mods = [
    'minion-damage',
    'damage-reduction-for-your-minions',
    'golem-damage',
  ]

  switch (type) {
    case 'non-physical':
      return non_physical_mods.includes(modifier)
    case 'physical':
      return physical_mods.includes(modifier)
    case 'fire':
      return fire_mods.includes(modifier)
    case 'cold':
      return cold_mods.includes(modifier)
    case 'lightning':
      return lightning_mods.includes(modifier)
    case 'minion':
      return minion_mods.includes(modifier)
    default:
      return false
  }
}

function RoundModifier(modifier: string, value: number): number {
  const Int_Modifiers = new Set([
    'strength',
    'dexterity',
    'intelligence',
    'willpower',
    'all-stats',
    'maximum-life',
    'essence-on-kill',
    'fury-on-kill',
    'spirit-on-kill',
    'maximum-essence',
    'maximum-fury',
    'maximum-mana',
    'maximum-spirit',
    'maximum-energy',
    'armor',
    'life-regeneration-while-not-damaged-recently',
  ])
  if (Int_Modifiers.has(modifier)) {
    return Math.round(value)
  }
  return Math.round(value * 1000) / 1000
}

export function modifierWithGlyphBonus(
  modifierSlug: string,
  modifierValue: number,
  nodeRarity: string,
  glyph: ParagonGlyph,
  level: number,
): number {
  if (!['normal', 'magic', 'rare'].includes(nodeRarity)) {
    console.log(
      'Invalid node passed to modifierWithGlyphBonus. Should be normal, magic or rare. Found: ' +
        nodeRarity +
        '.',
    )
    return modifierValue
  }
  if (glyph.mod === 'empty' && glyph.scalingNodes === undefined) {
    console.log(
      'Invalid glyph detected with name' +
        glyph.name +
        '. If the mod is empty then scalingNodes should not be undefined.',
    )
    return modifierValue
  }
  if (glyph.rarity === 'unique') {
    if (
      glyph.scalingNodes2 &&
      (glyph.scalingNodes2 === nodeRarity ||
        ModifierSatisfiesType(modifierSlug, glyph.scalingNodes2))
    ) {
      return RoundModifier(
        modifierSlug,
        modifierValue *
          (1 +
            (Number(glyph.displayValue2) / 100) *
              (1 +
                // Tears of Blood Unique Glyph maybe only scales every 10 levels, but it seems not.
                Number(glyph.levelScaling2) *
                  Math.max(level - 1, 0))),
      )
    }
    return modifierValue
  }
  if (glyph.mod && glyph.mod != 'empty') {
    // Glyphs which give a modifier based on nearby attributes. These do not affect the nearby nodes.
    return modifierValue
  }
  if (
    glyph.scalingNodes === nodeRarity ||
    ModifierSatisfiesType(modifierSlug, glyph.scalingNodes)
  ) {
    return RoundModifier(
      modifierSlug,
      modifierValue *
        (1 +
          (Number(glyph.displayValue) / 100) *
            (1 +
              Number(glyph.levelScaling) * Math.max(level - 1, 0))),
    )
  }

  return modifierValue
}

export function computeFinalModifierValue(
  modifierSlug: string,
  modifierValue: number,
  node: ParagonNode,
  paragonRepresentation: CalculatorParagon,
): number {
  const glyphNode = glyphInRange(node, paragonRepresentation)
  if (glyphNode) {
    return modifierWithGlyphBonus(
      modifierSlug,
      modifierValue,
      node.rarity,
      glyphNode,
      paragonRepresentation.boardState[node.boardIndex].glyph
        ?.level ?? 1,
    )
  }
  return modifierValue
}

export function glyphInRange(
  node: ParagonNode,
  paragonRepresentation: CalculatorParagon,
): ParagonGlyph | null {
  const glyph =
    paragonRepresentation.boardState[node.boardIndex].glyph
  if (!glyph) {
    return null
  }
  const glyphRow =
    paragonRepresentation.boardState[node.boardIndex].glyphRow
  const glyphColumn =
    paragonRepresentation.boardState[node.boardIndex].glyphColumn
  if (!glyphRow || !glyphColumn) {
    return null
  }
  const glyphNode =
    paragonRepresentation.glyphs[
      ComputeLocationRepresentation(
        node.boardIndex,
        glyphRow,
        glyphColumn,
      )
    ]
  const glyphRange = GlyphRange(glyphNode, glyph.level)
  if (
    Math.abs(glyphRow - node.row) +
      Math.abs(glyphColumn - node.column) <=
    glyphRange
  ) {
    return glyphNode
  }
  return null
}

export interface Attributes {
  strength: number
  dexterity: number
  intelligence: number
  willpower: number
}

/**
 * Rare paragon nodes have a bonus modifier which is only active if the player has a certain number of an attribute.
 * The amount required depends on the board number with successive boards more challenging to satisfy the requirement.
 * Since the attribute can come from any source (equipment, gear, paragon nodes (including this one)), we need to
 * calculate whether to add this bonus in after everything else had been added to the chararacter.
 *
 *
 * @param {PlayerCharacter} characterInput - The player character with all the inputs except for possibly the rare
 *                                           node bonuses.
 *
 * @returns {Attributes} Total attributes of the player which can be used to calculate the rare node bonuses.
 */
export function calculateCharacterAttributes(
  characterInput: PlayerCharacter,
): Attributes {
  const baseStats = new BaseStatsNode(
    characterInput.class,
    characterInput.level,
  )

  const totalAttributes: Attributes = {
    strength: baseStats.GetValue.Strength,
    dexterity: baseStats.GetValue.Dexterity,
    intelligence: baseStats.GetValue.Intelligence,
    willpower: baseStats.GetValue.Willpower,
  }

  const Num_Altars = Number(
    characterInput['toggles']['altars-of-lilith-gathered'],
  )

  // Altar of Lilith
  const Strength_Altars = [
    0, 0, 0, 0, 0, 2, 4, 4, 4, 6, 6, 6, 6, 8, 8, 8, 10, 10, 10, 10,
    12, 12, 12, 14, 14, 16, 16, 16, 16, 16, 16, 16, 18, 18, 18, 18,
    18, 18, 18, 20, 20, 20, 20, 20, 20, 22, 22, 22, 24, 24, 24, 24,
    24, 24, 24, 26, 26, 26, 26, 26, 26, 26, 26, 28, 28, 28, 30, 32,
    32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 34, 34, 34, 34,
    34, 36, 36, 36, 38, 38, 38, 40, 42, 42, 42, 42, 42, 42, 42, 42,
    42, 44, 44, 44, 44, 46, 46, 46, 48, 48, 48, 48, 48, 48, 48, 50,
    50, 52, 54, 54, 54, 54, 54, 56, 56, 56, 56, 56, 58, 60, 60, 60,
    60, 60, 60, 60, 60, 60, 60, 60, 60, 60, 60, 60, 60, 62, 62, 62,
    64, 66, 68, 68, 68, 68, 68, 68, 68, 68, 68, 68, 68,
  ]

  totalAttributes.strength += Strength_Altars[Num_Altars]

  const Intelligence_Altars = [
    0, 0, 0, 2, 2, 2, 2, 2, 4, 4, 4, 4, 4, 4, 4, 6, 6, 6, 6, 6, 6, 6,
    6, 6, 6, 6, 6, 8, 10, 12, 12, 12, 12, 12, 12, 12, 14, 14, 16, 16,
    18, 20, 20, 20, 20, 20, 20, 22, 22, 24, 24, 24, 26, 26, 28, 28,
    28, 28, 28, 28, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30,
    30, 30, 32, 32, 34, 36, 36, 36, 36, 36, 36, 36, 36, 36, 38, 40,
    40, 40, 40, 40, 40, 40, 40, 40, 40, 40, 42, 42, 44, 44, 46, 46,
    46, 46, 46, 48, 48, 48, 48, 50, 50, 50, 52, 52, 52, 52, 52, 54,
    54, 54, 54, 54, 54, 54, 54, 54, 54, 54, 56, 56, 58, 58, 60, 62,
    62, 62, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 66,
    68, 68, 68, 68, 68, 68, 68, 68, 68,
  ]

  totalAttributes.intelligence += Intelligence_Altars[Num_Altars]

  const Dexterity_Altars = [
    0, 2, 2, 2, 4, 4, 4, 4, 4, 4, 6, 6, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8,
    8, 8, 8, 8, 8, 8, 8, 8, 10, 10, 10, 10, 12, 14, 14, 14, 14, 14,
    14, 14, 16, 16, 16, 16, 18, 18, 18, 18, 18, 20, 20, 22, 22, 22,
    24, 26, 26, 26, 26, 26, 26, 26, 26, 26, 26, 26, 28, 28, 28, 30,
    32, 32, 32, 32, 32, 32, 34, 34, 34, 36, 36, 36, 36, 36, 36, 36,
    36, 38, 40, 40, 40, 42, 42, 42, 44, 44, 44, 44, 44, 44, 44, 44,
    46, 46, 46, 46, 46, 46, 46, 46, 48, 48, 48, 48, 48, 48, 48, 48,
    48, 50, 50, 50, 52, 54, 54, 54, 54, 54, 54, 54, 54, 54, 54, 54,
    56, 58, 58, 58, 58, 58, 58, 60, 60, 60, 62, 64, 64, 64, 64, 64,
    64, 64, 64, 64, 66, 66, 66, 68, 68,
  ]

  totalAttributes.dexterity += Dexterity_Altars[Num_Altars]

  const Willpower_Altars = [
    0, 0, 2, 2, 2, 2, 2, 2, 2, 2, 2, 4, 4, 4, 4, 4, 4, 4, 6, 8, 8, 10,
    10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 12, 12, 12, 12, 14,
    14, 14, 14, 14, 14, 16, 18, 18, 18, 18, 18, 18, 20, 20, 20, 20,
    20, 20, 20, 20, 22, 22, 22, 22, 24, 24, 26, 28, 28, 28, 28, 30,
    30, 30, 30, 32, 32, 34, 34, 34, 34, 34, 34, 34, 36, 38, 38, 38,
    38, 38, 38, 38, 38, 38, 38, 38, 38, 38, 38, 38, 38, 40, 40, 40,
    40, 42, 42, 42, 42, 42, 42, 42, 42, 42, 42, 42, 42, 42, 44, 44,
    44, 44, 46, 46, 48, 48, 48, 48, 50, 50, 50, 50, 50, 50, 50, 50,
    50, 50, 50, 50, 50, 52, 54, 56, 58, 58, 60, 60, 60, 60, 60, 60,
    60, 60, 60, 60, 60, 62, 62, 64, 66, 66, 68,
  ]

  totalAttributes.willpower += Willpower_Altars[Num_Altars]

  // strength
  let strength_mod = 0
  let dexterity_mod = 0
  let intelligence_mod = 0
  let willpower_mod = 0

  let all_stats_mod = 0

  let percent_strength_mod = 0
  let percent_dexterity_mod = 0
  let percent_intelligence_mod = 0
  let percent_willpower_mod = 0

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
    if (gear_slot in characterInput) {
      const gear =
        characterInput[gear_slot as keyof typeof characterInput]
      if (gear) {
        if (!(instanceOfArmor(gear) || instanceOfWeapon(gear))) {
          console.log('Gear not armor or weapon error: ' + gear_slot)
          continue
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
          switch (mod_name) {
            case 'strength':
              strength_mod += value
              break
            case 'dexterity':
              dexterity_mod += value
              break
            case 'intelligence':
              intelligence_mod += value
              break
            case 'willpower':
              willpower_mod += value
              break
            case '%-strength':
              percent_strength_mod += value
              break
            case '%-dexterity':
              percent_dexterity_mod += value
              break
            case '%-intelligence':
              percent_intelligence_mod += value
              break
            case '%-willpower':
              percent_willpower_mod += value
              break
            case 'all-stats':
              all_stats_mod += value
              break
            default:
              continue
          }
        }
      }
    }
  }

  strength_mod += characterInput?.paragons?.attributes?.strength ?? 0
  dexterity_mod +=
    characterInput?.paragons?.attributes?.dexterity ?? 0
  intelligence_mod +=
    characterInput?.paragons?.attributes?.intelligence ?? 0
  willpower_mod +=
    characterInput?.paragons?.attributes?.willpower ?? 0

  if (characterInput?.paragons?.modifiers) {
    for (const [mod_name, value] of characterInput.paragons
      .modifiers) {
      if (typeof value === 'undefined') {
        console.log(
          'Undefined value for paragon modifier: ' + mod_name,
        )
      }
      switch (mod_name) {
        case '%-strength':
          percent_strength_mod += value
          break
        case '%-dexterity':
          percent_dexterity_mod += value
          break
        case '%-intelligence':
          percent_intelligence_mod += value
          break
        case '%-willpower':
          percent_willpower_mod += value
          break
        case 'all-stats':
          all_stats_mod += value
          break
        default:
          continue
      }
    }
  }

  totalAttributes.strength += strength_mod + all_stats_mod
  totalAttributes.dexterity += dexterity_mod + all_stats_mod
  totalAttributes.intelligence += intelligence_mod + all_stats_mod
  totalAttributes.willpower += willpower_mod + all_stats_mod

  totalAttributes.strength = Math.round(
    totalAttributes.strength * (1 + percent_strength_mod),
  )
  totalAttributes.dexterity = Math.round(
    totalAttributes.dexterity * (1 + percent_dexterity_mod),
  )
  totalAttributes.intelligence = Math.round(
    totalAttributes.intelligence * (1 + percent_intelligence_mod),
  )
  totalAttributes.willpower = Math.round(
    totalAttributes.willpower * (1 + percent_willpower_mod),
  )

  return totalAttributes
}

/**
 * Rare paragon nodes have a bonus modifier which is only active if the player has a certain number of an attribute.
 * The amount required depends on the board number with successive boards more challenging to satisfy the requirement.
 * Since the attribute can come from any source (equipment, gear, paragon nodes (including this one)), we need to
 * calculate whether to add this bonus in after everything else had been added to the chararacter.
 *
 * @param {ParagonNode} rareNode - The paragon node whose requirements we are checking.
 * @param {number} boardNumber - The board number which contains the rare node. Starting board has number 1.
 * @param {Attributes} totalAttributes - Total attributes on the character including base stats, equipment and paragon.
 *
 * @logs {Error} If a node other than a rare node is passed. Or if rareNode's bonus requirements are invalid.
 *
 * @returns {number} Whether or not the bonus is active. If some validation fails, returns false
 */
function isRareBonusActive(
  rareNode: ParagonNode,
  boardNumber: number,
  totalAttributes: Attributes,
): boolean {
  if (rareNode.rarity != 'rare') {
    console.log(
      'Non-rate node passed to isRareBonusActive. Found: ' +
        rareNode.name +
        'of rarity' +
        rareNode.rarity +
        '.',
    )
    return false
  }

  if (rareNode.bonusRequirementMod1) {
    const scalingAttribute =
      rareNode.bonusRequirementMod1.toLowerCase()
    const requirementValue = rareNode.bonusRequirementValue1
    const scalingValue = Number(rareNode.bonusRequirementScaling1)
    if (!(scalingAttribute in totalAttributes)) {
      console.log(
        'Invalid bonus requirement modifier. Should be an attribute but found ' +
          scalingAttribute +
          '.',
      )
      return false
    }
    if (
      totalAttributes[scalingAttribute as keyof Attributes] <
      requirementValue + scalingValue * (boardNumber - 1)
    ) {
      return false
    }
  }
  if (rareNode.bonusRequirementMod2) {
    const scalingAttribute =
      rareNode.bonusRequirementMod2.toLowerCase()
    const requirementValue = rareNode.bonusRequirementValue2
    const scalingValue = Number(rareNode.bonusRequirementScaling2)
    if (!(scalingAttribute in totalAttributes)) {
      console.log(
        'Invalid bonus requirement modifier. Should be an attribute but found ' +
          scalingAttribute +
          '.',
      )
      return false
    }
    if (
      totalAttributes[scalingAttribute as keyof Attributes] <
      requirementValue + scalingValue * (boardNumber - 1)
    ) {
      return false
    }
  }

  return true
}

// A representation of the selected paragon board nodes which is effiencient for computing
// glyph bonuses and rare node bonuses. This representation is generated using the ParagonBoardState
// and a list of all the selected paragon nodes and all of the glyphs.
//
// Keys for the records are a representation of the node's position on the board of the form:
//  <boardIndex>-<row>-<column>
// For glyphs, we also include the glyph level as the second value in the array.
// boardState maps index to the state.
export interface CalculatorParagon {
  normalNode: Record<string, ParagonNode>
  magicNode: Record<string, ParagonNode>
  rareNode: Record<string, ParagonNode>
  legendaryNode: Record<string, ParagonNode>
  glyphs: Record<string, ParagonGlyph>
  boardState: Record<number, ParagonBoardState>
}

/**
 * Rare paragon nodes have a bonus modifier which is only active if the player has a certain number of an attribute.
 * The amount required depends on the board number with successive boards more challenging to satisfy the requirement.
 * Since the attribute can come from any source (equipment, gear, paragon nodes (including this one)), we need to
 * calculate whether to add this bonus in after everything else had been added to the chararacter.
 *
 * @param {PlayerCharacter} characterInput - The player character with all the inputs except for the rare node bonuses.
 *
 * @logs {Error} If a node other than a rare node is passed. Or if rareNode's bonus requirements are invalid.
 */
export function rareParagonBonusValue(
  rareNode: ParagonNode,
  characterInput: PlayerCharacter,
  paragonRepresentation: CalculatorParagon,
): number {
  const board =
    paragonRepresentation.boardState?.[rareNode.boardIndex]
  if (!board) {
    return 0
  }
  const Total_Attributes =
    calculateCharacterAttributes(characterInput)
  if (
    !isRareBonusActive(
      rareNode,
      paragonRepresentation.boardState[rareNode.boardIndex]
        .boardOrderNumber,
      Total_Attributes,
    )
  ) {
    return 0
  }
  if (!characterInput?.paragons?.modifiers) {
    throw 'Character paragons not initialized when trying to calculate rare node bonuses.'
  }

  const glyph = glyphInRange(rareNode, paragonRepresentation)

  if (glyph) {
    return modifierWithGlyphBonus(
      rareNode.bonusMod,
      rareNode.bonusValue,
      'rare',
      glyph,
      paragonRepresentation.boardState[rareNode.boardIndex].glyph
        ?.level ?? 1,
    )
  }
  return rareNode.bonusValue
}

/**
 * Rare paragon nodes have a bonus modifier which is only active if the player has a certain number of an attribute.
 * The amount required depends on the board number with successive boards more challenging to satisfy the requirement.
 * Since the attribute can come from any source (equipment, gear, paragon nodes (including this one)), we need to
 * calculate whether to add this bonus in after everything else had been added to the chararacter.
 *
 * @param {PlayerCharacter} characterInput - The player character with all the inputs except for the rare node bonuses.
 *
 * @logs {Error} If a node other than a rare node is passed. Or if rareNode's bonus requirements are invalid.
 */
export function allRareParagonBonusModifiers(
  characterInput: PlayerCharacter,
  paragonRepresentation: CalculatorParagon,
): [string, number][] {
  return Object.values(paragonRepresentation.rareNode).flatMap(
    (rareNode) => {
      const modValue = rareParagonBonusValue(
        rareNode,
        characterInput,
        paragonRepresentation,
      )
      if (modValue > 0) {
        return [[rareNode.bonusMod, modValue]]
      }
      return []
    },
  )
}

interface ParagonBoardState {
  boardIndex: number
  boardOrderNumber: number
  glyphRow: number | null
  glyphColumn: number | null
  glyph: {
    name: string
    level: number
  } | null
}

function ComputeLocationRepresentation(
  boardIndex: number,
  row: number,
  column: number,
): string {
  return `${boardIndex}-${row}-${column}`
}

function ParseLocationRepresentation(
  recordKey: string,
): [number, number, number] {
  const [boardIndex, row, column] = recordKey.split('-')
  return [Number(boardIndex), Number(row), Number(column)]
}

function GlyphRange(glyph: ParagonGlyph, level: number) {
  switch (glyph.rarity) {
    case 'magic':
      if (level >= 4) {
        return 3
      } else {
        return 2
      }
    case 'rare':
      if (level >= 15) {
        return 4
      } else {
        return 3
      }
    case 'unique':
      if (level >= 50) {
        return 5
      } else {
        return 4
      }
    default:
      console.log(
        'Invalid glyph cannot be used to calculate range. Glyph rarity is ' +
          glyph.rarity,
        +'.',
      )
      return 0
  }
}

// Finds the attributes from the scalingNode which is in range of a glyph.
function AttributesFromNode(
  glyph: ParagonGlyph,
  level: number,
  scalingNode: ParagonNode,
): Attributes {
  const Bonus_Attributes: Attributes = {
    strength: 0,
    dexterity: 0,
    intelligence: 0,
    willpower: 0,
  }
  if (
    scalingNode.rarity != 'normal' &&
    scalingNode.rarity != 'magic' &&
    scalingNode.rarity != 'rare'
  ) {
    return Bonus_Attributes
  }
  if (glyph.mod === 'empty' && glyph.scalingNodes === undefined) {
    console.log(
      'Invalid glyph detected with name',
      glyph.name,
      '. If the mod is empty then scalingNodes should not be undefined.',
    )
    return Bonus_Attributes
  }
  if (scalingNode.mod1 in Bonus_Attributes) {
    Bonus_Attributes[scalingNode.mod1 as keyof Attributes] +=
      modifierWithGlyphBonus(
        scalingNode.mod1,
        scalingNode.value1,
        scalingNode.rarity,
        glyph,
        level,
      )
  }
  if (scalingNode.mod2 in Bonus_Attributes) {
    Bonus_Attributes[scalingNode.mod2 as keyof Attributes] +=
      modifierWithGlyphBonus(
        scalingNode.mod2,
        scalingNode.value2,
        scalingNode.rarity,
        glyph,
        level,
      )
  }
  return Bonus_Attributes
}

// Calculates the modifier value for a glyph. This only applies to glyphs which give a modifier
// that scales by the attributes from nearby nodes.
export function CalculateGlyphModifierValue(
  glyph: ParagonGlyph,
  paragonRepresentation: CalculatorParagon,
): number {
  const board = Object.values(paragonRepresentation.boardState).find(
    (board) => board?.glyph?.name === glyph.name,
  )
  if (!glyph.mod || glyph.mod === 'empty') {
    return 0
  }
  if (!board) {
    return 0
  }
  const { boardIndex, glyphRow, glyphColumn } = board
  if (!glyphRow || !glyphColumn) {
    return 0
  }
  const level = board.glyph?.level ?? 0
  const range = GlyphRange(glyph, level)
  const glyphModifierAttribute = glyph.scalingMod
  let glyphModifierAttributeValue = 0
  for (let i = -range; i <= range; i++) {
    for (
      let j = -(range - Math.abs(i));
      j <= range - Math.abs(i);
      j++
    ) {
      if (i == 0 && j == 0) {
        continue
      }
      const nodeLocation = ComputeLocationRepresentation(
        boardIndex,
        glyphRow + i,
        glyphColumn + j,
      )
      let node: ParagonNode
      if (nodeLocation in paragonRepresentation.rareNode) {
        node = paragonRepresentation.rareNode[nodeLocation]
      } else if (nodeLocation in paragonRepresentation.magicNode) {
        node = paragonRepresentation.magicNode[nodeLocation]
      } else if (nodeLocation in paragonRepresentation.normalNode) {
        node = paragonRepresentation.normalNode[nodeLocation]
      } else {
        continue
      }
      const nodeAttributes = AttributesFromNode(glyph, level, node)
      if (glyphModifierAttribute === 'core') {
        glyphModifierAttributeValue +=
          nodeAttributes.strength +
          nodeAttributes.dexterity +
          nodeAttributes.intelligence +
          nodeAttributes.willpower
      } else {
        glyphModifierAttributeValue +=
          nodeAttributes[glyphModifierAttribute as keyof Attributes]
      }
    }
  }
  return RoundModifier(
    glyph.mod,
    Number(glyph.calculatorValuePerPoint) *
      (1 + Number(glyph.levelScaling) * Math.max(level - 1, 0)) *
      glyphModifierAttributeValue,
  )
}

// Calculates the total selected attributes nearby the glyph which contributes toward the additional bonus requirement.
export function CalculateGlyphAdditionalBonusAttributes(
  glyph: ParagonGlyph,
  paragonRepresentation: CalculatorParagon,
): number {
  const board = Object.values(paragonRepresentation.boardState).find(
    (board) => board?.glyph?.name === glyph.name,
  )
  if (!glyph.additionalBonusRequirementMod) {
    return 0
  }
  if (!board) {
    return 0
  }
  const { boardIndex, glyphRow, glyphColumn } = board
  if (!glyphRow || !glyphColumn) {
    return 0
  }
  const level = board.glyph?.level ?? 0
  const range = GlyphRange(glyph, level)
  const glyphBonusAttribute = glyph.additionalBonusRequirementMod
  let glyphBonusAttributeValue = 0
  for (let i = -range; i <= range; i++) {
    for (
      let j = -(range - Math.abs(i));
      j <= range - Math.abs(i);
      j++
    ) {
      if (i == 0 && j == 0) {
        continue
      }
      const nodeLocation = ComputeLocationRepresentation(
        boardIndex,
        glyphRow + i,
        glyphColumn + j,
      )
      let node: ParagonNode
      if (nodeLocation in paragonRepresentation.rareNode) {
        node = paragonRepresentation.rareNode[nodeLocation]
      } else if (nodeLocation in paragonRepresentation.magicNode) {
        node = paragonRepresentation.magicNode[nodeLocation]
      } else if (nodeLocation in paragonRepresentation.normalNode) {
        node = paragonRepresentation.normalNode[nodeLocation]
      } else {
        continue
      }
      const nodeAttributes = AttributesFromNode(glyph, level, node)
      glyphBonusAttributeValue +=
        nodeAttributes[glyphBonusAttribute as keyof Attributes]
    }
  }
  return glyphBonusAttributeValue
}

export function GlyphDisplayValue(
  glyph: ParagonGlyph,
  level: number,
) {
  return (
    Number(glyph.displayValue) *
    (1 + Number(glyph.levelScaling) * Math.max(level - 1, 0))
  )
}

export function GlyphDisplayValue2(
  glyph: ParagonGlyph,
  level: number,
) {
  return (
    Number(glyph.displayValue2) *
    (1 +
      Number(glyph.levelScaling2) *
        Math.floor(Math.max(level - 1, 0)))
  )
}
