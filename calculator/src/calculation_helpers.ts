// If we choose a point at random in the circle of radius `total_radius`, this is the probability
// of being within `enemy_hit_radius` of the vertical line.
export function ProbabilityIntersectingLineInCircle(
  enemy_hit_radius: number,
  line_length: number,
  total_radius: number,
) {
  let area = 0
  if (enemy_hit_radius > total_radius) {
    area = Math.PI * total_radius ** 2
  } else if (line_length < total_radius) {
    // Pill bottle
    area =
      Math.PI * enemy_hit_radius ** 2 + enemy_hit_radius * line_length
  } else {
    // Draw the pill with widge 2 * enemy_hit_radius and draw line from center to intersection
    // with the total_radius circle.
    const theta = Math.asin(enemy_hit_radius / total_radius)
    const side_triangle_area =
      0.5 * enemy_hit_radius * total_radius * Math.cos(theta)
    const center_section_area =
      ((2 * theta) / (2 * Math.PI)) * Math.PI * total_radius ** 2

    area =
      0.5 * Math.PI * enemy_hit_radius ** 2 +
      2 * side_triangle_area +
      center_section_area
  }

  return area / (Math.PI * total_radius ** 2)
}

// Assume enemies are instead in a semi-circle when using a cone.
export function ProbabilityInCone(
  cone_length: number,
  cone_circle_proportion: number,
  total_radius: number,
) {
  const area =
    Math.min(total_radius, cone_length) ** 2 *
    Math.min(cone_circle_proportion, 0.5)
  return (2 * area) / total_radius ** 2
}

export function ProbabilityInCircle(
  circle_distance: number,
  aoe_radius: number,
  enemy_radius: number,
) {
  let intersection_area: number
  if (circle_distance > enemy_radius + aoe_radius) {
    return 0
  } else if (circle_distance + aoe_radius <= enemy_radius) {
    return aoe_radius ** 2 / enemy_radius ** 2
  } else if (circle_distance + enemy_radius <= aoe_radius) {
    return 1
  } else {
    const r = aoe_radius
    const rr = aoe_radius ** 2
    const R = enemy_radius
    const RR = enemy_radius ** 2
    const d = circle_distance

    const theta_R = Math.acos((RR + d ** 2 - rr) / (2 * R * d)) * 2
    const theta_r = Math.acos((rr + d ** 2 - RR) / (2 * r * d)) * 2

    intersection_area =
      0.5 * theta_R * RR -
      0.5 * RR * Math.sin(theta_R) +
      0.5 * theta_r * rr -
      0.5 * rr * Math.sin(theta_r)
    return intersection_area / (Math.PI * RR)
  }
}

export function ProbabilityInAnnulus(
  center_distance: number,
  outer_radius: number,
  inner_radius: number,
  enemy_radius: number,
) {
  if (inner_radius > outer_radius) {
    throw 'Annulus outer radius must be at least at larget as inner radius.'
  }
  return (
    ProbabilityInCircle(center_distance, outer_radius, enemy_radius) -
    ProbabilityInCircle(center_distance, inner_radius, enemy_radius)
  )
}

/* I don't want to bother importing a binomial probability calculator so I'll just implement it here */
function factorial(n: number): number {
  if (n === 0) {
    return 1
  }
  return n * factorial(n - 1)
}

function combination(n: number, k: number): number {
  if (k > n) {
    return 0
  }
  return factorial(n) / (factorial(k) * factorial(n - k))
}

export function BinomialProbability(
  n: number,
  p: number,
  k: number,
): number {
  if (n <= 0) {
    return Number(k == 0)
  }
  p = Math.max(Math.min(p, 1), 0)
  return combination(n, k) * p ** k * (1 - p) ** (n - k)
}
// Returns the probability of getting k or less successes in n trials with probability p of success.
export function BinomialDistribution(
  n: number,
  p: number,
  k: number,
): number {
  if (k > n) {
    return 1
  }
  let probability = 0
  for (let i = 0; i <= k; i++) {
    probability += BinomialProbability(n, p, i)
  }
  return probability
}

export function WeightedResistanceAverage(resistances: number[]) {
  let total = 0
  for (const resistance of resistances) {
    total += Math.max(resistance, 0) ** 0.5
  }
  return (total / resistances.length) ** 2
}

// Computes the cooldown reduction from
export function CooldownFromRanks(
  ranks: number,
  skill_name: string,
  base_cooldown: number,
) {
  if (ranks < 0) {
    return base_cooldown
  }
  let initial_reduction = 0
  switch (skill_name) {
    case 'kick':
      initial_reduction = 0.65
      break
    case 'rupture':
      initial_reduction = 0.5
      break
    case 'ground-stomp':
      initial_reduction = 0.8
      break
    case 'charge':
      initial_reduction = 0.85
      break
    case 'leap':
      initial_reduction = 0.85
      break
    case 'steel-grasp':
      initial_reduction = 0.55
      break
    case 'frost-nova':
      initial_reduction = 1.2
      break
    case 'teleport':
      initial_reduction = 0.55
      break
    case 'teleport-enchantment':
      initial_reduction = 0.9
      break
    case 'debilitating-roar':
      initial_reduction = 1.1
      break
    case 'corpse-tendrils':
      0.55
      break
    default:
      return base_cooldown
  }
  const ReductionScalarPerRank = [
    0, 1, 2, 2.8, 3.6, 4.2, 4.8, 5.2, 5.6, 6, 6.4, 6.8,
  ]
  if (ranks >= ReductionScalarPerRank.length) {
    return (
      base_cooldown -
      initial_reduction *
        ReductionScalarPerRank[ReductionScalarPerRank.length - 1]
    )
  }

  return (
    base_cooldown -
    initial_reduction * ReductionScalarPerRank[ranks - 1]
  )
}

/**
 * Given a modifier name and base modifier value, returns the value after applying upgrades.
 * The upgrade level should be an integer between 0 and 5 and modName should be the slug name for the
 * modifier
 *
 * @param {string} modName - The slug name of the modifier. e.g. 'damage-reduction', 'cold-damage', etc.
 * @param {number} modBaseValue - The value that we are scaling. For affix modifiers this is generally
 *                                either the min value or max value of the modifier range.
 * @param {number} upgradeLevel - The upgrade level of the equipment.
 *
 * @returns {number} The value of the implicit modifier that should be visible on the piece of equipment.
 */
export function ScaleModifierRangeByUpgradeLevel(
  modName: string,
  modBaseValue: number,
  upgradeLevel: number,
): number {
  const Percent_Scaling_Mods = new Set([
    'slow-duration-reduction',
    'control-impaired-duration-reduction',
    'cooldown-reduction',
    'damage-reduction',
    'damage-reduction-from-affected-by-shadow-damage-over-time-enemies',
    'damage-reduction-from-burning-enemies',
    'damage-reduction-from-close-enemies',
    'damage-reduction-from-distant-enemies',
    'damage-reduction-from-poisoned-enemies',
    'damage-reduction-from-bleeding-enemies',
    'damage-reduction-while-fortified',
    'damage-reduction-while-injured',
    'energy-cost-reduction',
    'essence-cost-reduction',
    'fury-cost-reduction',
    'imbuement-cooldown-reduction',
    'shout-cooldown-reduction',
    'mana-cost-reduction',
    'spirit-cost-reduction',
    'trap-cooldown-reduction',
    'dodge-chance-against-close-enemies',
    'dodge-chance-against-distant-enemies',
    'dodge-chance',

    'nature-magic-skill-cooldown-reduction', // Dolmen Stone
    'damage-reduction-from-enemies-affected-by-curse-skills', // Bloodmoon Breeches
    'damage-reduction-from-enemies-affected-by-trap-skills', // Scoundrels Leathers
    'rupture-cooldown-reduction', //Fields of Crimson S2 Update
  ])

  if (Percent_Scaling_Mods.has(modName)) {
    let current_value = modBaseValue
    for (let i = 0; i < upgradeLevel; i++) {
      current_value +=
        modBaseValue * 0.1 -
        0.065 * current_value ** 2 +
        0.002 * current_value
    }
    return current_value
  } else if (
    modName.includes('ranks-of-') ||
    modName == 'max-evade-charge' ||
    modName == 'potion-charges'
  ) {
    // S2 Update where 5/5 upgrades for +ranks have a minimum of 2
    if (
      modName.includes('ranks-of-') &&
      upgradeLevel == 5 &&
      Math.floor(modBaseValue * (1 + 0.1 * upgradeLevel)) == 1
    ) {
      return 2
    } else {
      return Math.floor(modBaseValue * (1 + 0.1 * upgradeLevel))
    }
  } else {
    return modBaseValue * (1 + 0.1 * upgradeLevel)
  }
}

/**
 * Given the equipment, implicit modifier name, item power and upgrade level,
 * returns the value of the implicit modifier that should be visible on the
 * piece of equipment. Implicits values do not have a range of values and only
 * depend on the item power and upgrade level.
 *
 * @param {string} equipmentSlug - The slug name of the equipment slot. e.g. 'helm', 'chest', 'two-handed-sword', etc.
 * @param {string} implicitSlug - The slug name of the implicit modifier. e.g. 'damage-to-healthy-enemies' etc.
 * @param {number} itemPower - The base item power of the equipment (without upgrades).
 * @param {number} upgradeLevel - The upgrade level of the equipment.
 *
 * @throws {Error} If an invalid equipmentSlug or implicitSlug is passed.
 *
 * @returns {number} The value of the implicit modifier that should be visible on the piece of equipment.
 */
export function ScaleImplicitValueByItemPower(
  equipmentSlug: string,
  implicitSlug: string,
  itemPower: number,
  upgradeLevel: number,
): number {
  itemPower += 5 * upgradeLevel
  let base_modifier = 0
  let breakpoints: Record<number, number> = {}
  itemPower += 5 * upgradeLevel
  switch (equipmentSlug) {
    case 'axe':
      switch (implicitSlug) {
        case 'damage-to-healthy-enemies':
          breakpoints = {
            1: 0.035,
            150: 0.09,
            340: 0.12,
            460: 0.16,
            625: 0.2,
            780: 0.28,
          }
          break
        default:
          throw 'Invalid implicit ' + implicitSlug + ' for axe.'
      }
      break
    case 'two-handed-axe':
      switch (implicitSlug) {
        case 'damage-to-healthy-enemies':
          breakpoints = {
            1: 0.07,
            150: 0.18,
            340: 0.24,
            460: 0.32,
            625: 0.4,
            780: 0.56,
          }
          break
        default:
          throw (
            'Invalid implicit ' +
            implicitSlug +
            ' for two-handed-axe.'
          )
      }
      break
    case 'bow':
      switch (implicitSlug) {
        case 'damage-to-distant-enemies':
          breakpoints = {
            1: 0.06,
            150: 0.12,
            340: 0.17,
            460: 0.23,
            625: 0.28,
            780: 0.4,
          }
          break
        default:
          throw 'Invalid implicit ' + implicitSlug + ' for bow.'
      }
      break
    case 'crossbow':
      switch (implicitSlug) {
        case 'vulnerable-damage':
          breakpoints = {
            1: 0.03,
            150: 0.09,
            340: 0.14,
            460: 0.18,
            625: 0.23,
            780: 0.32,
          }
          break
        default:
          throw 'Invalid implicit ' + implicitSlug + ' for crossbow.'
      }
      break
    case 'dagger':
      switch (implicitSlug) {
        case 'damage-to-close-enemies':
          breakpoints = {
            1: 0.03,
            150: 0.06,
            340: 0.085,
            460: 0.115,
            625: 0.14,
            780: 0.2,
          }
          break
        default:
          throw 'Invalid implicit ' + implicitSlug + ' for dagger.'
      }
      break
    case 'focus':
      switch (implicitSlug) {
        case 'cooldown-reduction':
          breakpoints = {
            1: 0.015,
            150: 0.025,
            340: 0.035,
            460: 0.045,
            625: 0.055,
            780: 0.07,
          }
          break
        default:
          throw 'Invalid implicit ' + implicitSlug + ' for focus.'
      }
      break
    case 'totem':
      switch (implicitSlug) {
        case 'cooldown-reduction':
          breakpoints = {
            1: 0.015,
            150: 0.025,
            340: 0.035,
            460: 0.045,
            625: 0.055,
            780: 0.07,
          }
          break
        default:
          throw 'Invalid implicit ' + implicitSlug + ' for totem.'
      }
      break
    case 'mace':
      switch (implicitSlug) {
        case 'overpower-damage':
          breakpoints = {
            1: 0.06,
            150: 0.143,
            340: 0.203,
            460: 0.278,
            625: 0.345,
            780: 0.473,
          }
          break
        default:
          throw 'Invalid implicit ' + implicitSlug + ' for mace.'
      }
      break
    case 'two-handed-mace':
      switch (implicitSlug) {
        case 'overpower-damage':
          breakpoints = {
            1: 0.12,
            150: 0.285,
            340: 0.405,
            460: 0.555,
            625: 0.69,
            780: 0.945,
          }
          break
        default:
          throw (
            'Invalid implicit ' +
            implicitSlug +
            ' for two-handed-mace.'
          )
      }
      break
    case 'polearm':
      switch (implicitSlug) {
        case 'damage-to-injured-enemies':
          breakpoints = {
            1: 0.06,
            150: 0.12,
            340: 0.24,
            460: 0.33,
            625: 0.4,
            780: 0.6,
          }
          break
        default:
          throw 'Invalid implicit ' + implicitSlug + ' for polearm.'
      }
      break
    case 'scythe':
      switch (implicitSlug) {
        case 'life-on-kill':
          breakpoints = {
            1: 1,
            151: 2,
            181: 3,
            211: 4,
            251: 5,
            281: 6,
            311: 7,
            340: 8,
            341: 9,
            371: 10,
            401: 11,
            421: 12,
            451: 13,
            461: 14,
            471: 15,
            481: 16,
            491: 17,
            501: 18,
            521: 19,
            531: 20,
            541: 21,
            551: 22,
            571: 23,
            581: 24,
            591: 25,
            601: 26,
            611: 27,
            621: 28,
            625: 34,
            631: 35,
            641: 37,
            651: 38,
            661: 40,
            671: 41,
            681: 43,
            691: 45,
            701: 47,
            711: 48,
            721: 50,
            731: 52,
            741: 54,
            751: 57,
            761: 59,
            771: 61,
            781: 90,
            791: 94,
            801: 98,
            811: 102,
            821: 106,
            831: 110,
            841: 114,
          }
          break
        default:
          throw 'Invalid implicit ' + implicitSlug + ' for scythe.'
      }
      break
    case 'two-handed-scythe':
      switch (implicitSlug) {
        case 'life-on-kill':
          breakpoints = {
            1: 2,
            141: 3,
            161: 4,
            181: 5,
            191: 6,
            211: 7,
            221: 8,
            241: 9,
            251: 10,
            271: 11,
            281: 12,
            301: 13,
            321: 14,
            331: 15,
            341: 17,
            351: 18,
            361: 19,
            381: 20,
            391: 21,
            401: 22,
            421: 23,
            431: 24,
            451: 25,
            461: 28,
            462: 29,
            471: 30,
            481: 32,
            491: 34,
            501: 35,
            511: 37,
            521: 38,
            531: 40,
            541: 42,
            551: 43,
            561: 45,
            571: 47,
            581: 48,
            591: 50,
            601: 52,
            611: 55,
            621: 57,
            625: 68,
            631: 71,
            641: 74,
            651: 77,
            661: 80,
            671: 83,
            681: 86,
            691: 90,
            701: 93,
            711: 97,
            721: 101,
            731: 105,
            741: 109,
            751: 113,
            761: 118,
            771: 123,
            781: 180,
            791: 188,
            801: 195,
            811: 203,
            821: 211,
            831: 220,
            841: 228,
          }
          break
        default:
          throw (
            'Invalid implicit ' +
            implicitSlug +
            ' for two-handed-scythe.'
          )
      }
      break
    case 'shield':
      switch (implicitSlug) {
        case 'thorns':
          breakpoints = {
            1: 1,
            111: 2,
            150: 6,
            151: 7,
            161: 8,
            171: 9,
            181: 10,
            191: 12,
            201: 13,
            211: 14,
            221: 16,
            231: 17,
            241: 18,
            251: 20,
            261: 21,
            271: 22,
            281: 23,
            291: 25,
            301: 26,
            311: 27,
            321: 29,
            331: 30,
            340: 41,
            341: 43,
            351: 45,
            361: 47,
            371: 49,
            381: 50,
            391: 52,
            401: 54,
            411: 56,
            421: 58,
            431: 59,
            441: 61,
            451: 63,
            461: 84,
            462: 86,
            471: 91,
            481: 96,
            491: 101,
            501: 106,
            511: 110,
            521: 115,
            531: 120,
            541: 125,
            551: 130,
            561: 134,
            571: 140,
            581: 145,
            591: 151,
            601: 157,
            611: 164,
            621: 170,
            625: 213,
            631: 221,
            641: 230,
            651: 239,
            661: 249,
            671: 259,
            681: 269,
            691: 280,
            701: 291,
            711: 303,
            721: 315,
            731: 327,
            741: 340,
            751: 354,
            761: 368,
            771: 383,
            780: 536,
            781: 557,
            791: 580,
            801: 603,
            811: 627,
            821: 652,
            831: 678,
            841: 705,
          }
          break
        case 'block-chance':
          base_modifier = 0.2
          break
        case 'blocked-damage-reduction':
          breakpoints = {
            1: 0.4,
            150: 0.45,
            340: 0.5,
            460: 0.53,
            625: 0.56,
            780: 0.6,
          }
          break
        case 'main-hand-weapon-damage':
          base_modifier = 0.8
          break
        default:
          throw 'Invalid implicit ' + implicitSlug + ' for shield.'
      }
      break
    case 'staff':
      switch (implicitSlug) {
        case 'damage-to-crowd-controlled-enemies':
          breakpoints = {
            1: 0.06,
            150: 0.12,
            340: 0.24,
            460: 0.33,
            625: 0.4,
            780: 0.6,
          }
          break
        default:
          throw 'Invalid implicit ' + implicitSlug + ' for staff.'
      }
      break
    case 'sword':
      switch (implicitSlug) {
        case 'critical-strike-damage':
          breakpoints = {
            1: 0.03,
            150: 0.05,
            340: 0.07,
            460: 0.09,
            625: 0.11,
            780: 0.14,
          }
          break
        default:
          throw 'Invalid implicit ' + implicitSlug + ' for sword.'
      }
      break
    case 'two-handed-sword':
      switch (implicitSlug) {
        case 'critical-strike-damage':
          breakpoints = {
            1: 0.06,
            150: 0.1,
            340: 0.14,
            460: 0.18,
            625: 0.22,
            780: 0.28,
          }
          break
        default:
          throw (
            'Invalid implicit ' +
            implicitSlug +
            ' for two-handed-sword.'
          )
      }
      break
    case 'wand':
      switch (implicitSlug) {
        case 'lucky-hit-chance':
          breakpoints = {
            1: 0.02,
            150: 0.03,
            340: 0.045,
            460: 0.06,
            625: 0.07,
            780: 0.1,
          }
          break
        default:
          throw 'Invalid implicit ' + implicitSlug + ' for wand.'
      }
      break
    case 'amulet':
      switch (implicitSlug) {
        case 'resistance-to-all-elements':
          // This is linear capped at 0.04 <= modifier <= 0.185.
          // We then round to near thousandths.
          breakpoints = {
            1: 0.02,
            119: Math.min(
              0.1,
              0.02 + 0.001 * Math.floor((itemPower - 113) / 6),
            ),
            629: Math.min(
              0.12,
              0.1 + 0.001 * Math.floor((itemPower - 625) / 4),
            ),
            780: Math.min(
              0.19,
              0.12 + 0.001 * Math.floor((itemPower - 780) / 1.5),
            ),
          }
          break
        default:
          throw 'Invalid implicit ' + implicitSlug + ' for amulet.'
      }
      break
    case 'boots':
      switch (implicitSlug) {
        case 'max-evade-charge':
          breakpoints = {
            1: 1,
            625: 2,
          }
          break
        case 'evade-briefly-grants-movement-speed':
          breakpoints = {
            1: 0.3,
            625: 0.5,
          }
          break
        case 'attacks-reduce-evades-cooldown-by-1-second':
          breakpoints = {
            1: 0.6,
            625: 0.8,
          }
          break
        default:
          throw 'Invalid implicit ' + implicitSlug + ' for boots.'
      }
      break
    case 'pants':
      switch (implicitSlug) {
        case 'while-injured-your-potion-also-grants-maximum-life-as-barrier':
          breakpoints = {
            1: 0.1,
            625: 0.2,
          }
          break
        case 'while-injured-your-potion-also-grants-movement-speed-for-2-seconds':
          breakpoints = {
            1: 0.2,
            625: 0.3,
          }
          break
        case 'while-injured-your-potion-also-restores-resource':
          breakpoints = {
            1: 0.1,
            625: 0.2,
          }
          break
        default:
          throw 'Invalid implicit ' + implicitSlug + ' for pants.'
      }
      break
    case 'ring':
      switch (implicitSlug) {
        case 'resistance-to-all-elements':
        case 'cold-resistance':
        case 'fire-resistance':
        case 'lightning-resistance':
        case 'poison-resistance':
        case 'shadow-resistance':
          // This is linear capped at 0.06 <= modifier <= 0.25.
          // We then round to near thousandths.
          breakpoints = {
            1: 0.015,
            210: Math.min(
              0.04,
              0.015 + 0.001 * Math.floor((itemPower - 210) / 14.5),
            ),
            625: Math.min(
              0.05,
              0.04 + 0.001 * Math.floor((itemPower - 625) / 8.5),
            ),
            780: Math.min(
              0.08,
              0.05 + 0.001 * Math.floor((itemPower - 780) / 3.5),
            ),
          }
          break
        default:
          throw 'Invalid implicit ' + implicitSlug + ' for ring.'
      }
      break
    default:
      throw 'Invalid equipment ' + equipmentSlug + '.'
  }

  function SelectModifierBreakpoint(
    breakpoints: Record<number, number>,
    itemPower: number,
  ): number {
    let currentBreakpoint = 0
    for (const key of Object.keys(breakpoints)) {
      if (itemPower >= parseInt(key)) {
        currentBreakpoint = Math.max(currentBreakpoint, parseInt(key))
      }
    }
    return breakpoints[currentBreakpoint]
  }
  if (Object.keys(breakpoints).length > 0) {
    base_modifier = SelectModifierBreakpoint(breakpoints, itemPower)
  }
  return ScaleModifierRangeByUpgradeLevel(
    implicitSlug,
    base_modifier,
    upgradeLevel,
  )
}

/**
 * Given the equipment, item power and upgrade level, returns the armor value on the piece of equipment.
 *
 * @param {string} equipmentSlug - The slug name of the equipment slot. e.g. 'helm', 'chest', 'malignant-heart', etc.
 * @param {number} itemPower - The base item power of the equipment (without upgrades).
 * @param {number} upgradeLevel - The upgrade level of the equipment. Should be `0` for malignant hearts.
 *
 * @throws {Error} If an invalid equipmentSlug.
 *
 * @returns {number} The armor value on the piece of equipment.
 */
export function ScaleArmorValueByItemPower(
  equipmentSlug: string,
  itemPower: number,
  upgradeLevel: number,
) {
  if (equipmentSlug != 'malignant-heart') {
    itemPower += 5 * upgradeLevel
  }
  let return_armor = 0
  switch (equipmentSlug) {
    case 'helm':
      return_armor = 1.25 * itemPower
      break
    case 'chest':
      return_armor = 1.75 * itemPower
      break
    case 'gloves':
      return_armor = 0.5 * itemPower
      break
    case 'pants':
      return_armor = itemPower
      break
    case 'boots':
      return_armor = 0.5 * itemPower
      break
    case 'malignant-heart':
      return_armor = 0.4 * itemPower
      break
    default:
      throw 'Invalid equipment slug for armor implicit.'
  }
  return Math.floor(return_armor)
}

/**
 * Given item power, a value and the upgradELevel, returns a flat value range for the item power of the equipment. This can
 * be used for aspects or malignant hearts which have `display == 'flat-value'` in the tables.
 *
 * @param {number} itemPower - The base item power of the equipment or malignant heart (not including upgrades).
 * @param {number} value - The min or max value for the flat value.
 * @param {number} upgradeLevel - The upgrade level of the equipment.
 *
 * @returns {number} The updated min or max value which should be the actual range on the equipment.
 */
export function ScaleFlatValueByItemPower(
  itemPower: number,
  value: number,
  upgradeLevel: number,
) {
  // Caps the scaling we allow since we have no data above 875.
  itemPower = Math.min(itemPower + 5 * upgradeLevel, 950)

  // The ramp is what we increase the multiplier by every 10 itemPower. When the ramp doesn't change,
  // we still increase the multiplier by the same value as the previous ramp. Mostly the ramp increases
  // over time (positive second derivative), but there are some intermediate fluctuations and big jumps.
  const ramps: Record<number, number> = {
    1: 0,
    81: 6,
    121: 8,
    131: 10,
    151: 17,
    161: 14,
    171: 18,
    181: 22,
    191: 17,
    201: 20,
    471: 40,
    571: 45,
    581: 46,
    591: 49,
    601: 50,
    611: 55,
    621: 52,
    631: 425,
    641: 74,
    651: 76,
    661: 80,
    671: 83,
    681: 86,
    691: 90,
    701: 93,
    711: 97,
    721: 101,
    731: 105,
    741: 109,
    751: 114,
    761: 118,
    771: 122,
    781: 791,
    791: 160,
    801: 165.4,
    811: 172.2,
    821: 179.2,
    831: 186.2,
    841: 193.8,
    851: 201.6,
    861: 209.6,
    871: 217.8,
    881: 226.8,
    891: 235.6,
    901: 245.2,
    911: 255,
    921: 265.2,
    931: 275.8,
    941: 286.8,
  }

  let multiplier_value = 40
  let current_ramp = 0
  for (let i = 0; i < 95 && 10 * i + 1 <= itemPower; i++) {
    if (10 * i + 1 in ramps) {
      current_ramp = ramps[10 * i + 1]
    }
    multiplier_value += current_ramp
  }
  return value * multiplier_value
}
