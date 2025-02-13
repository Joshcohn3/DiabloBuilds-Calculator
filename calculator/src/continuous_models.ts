export function DamageReductionFromArmor(
  enemy_level: number,
  armor: number,
): number {
  if (enemy_level <= 0) {
    throw 'Level must be greater than 0.'
  }
  if (armor < 0) {
    throw 'Armor must be non-negative.'
  }
  const Low_Level_Constant: Record<number, number> = {
    1: 0.00365,
    2: 0.00112,
    3: 0.000563,
    4: 0.000344,
    5: 0.000234,
    6: 0.00015,
    7: 0.0000973,
    8: 0.0000788,
    9: 0.0000667,
    10: 0.0000561,
    11: 0.000044,
    12: 0.0000403,
    13: 0.0000308,
    14: 0.0000278,
    15: 0.0000248,
    16: 0.0000229,
    17: 0.0000204,
    18: 0.0000189,
    19: 0.0000178,
    20: 0.0000163,
  }
  if (enemy_level <= 20) {
    return (
      Math.min(
        Math.round(Low_Level_Constant[enemy_level] * armor ** 2),
        85,
      ) / 100
    )
  }

  return (
    Math.min(
      Math.round(
        (((enemy_level + 88.1) / enemy_level) * 0.0202 * armor ** 2) /
          (armor + 255 * enemy_level),
      ),
      85,
    ) / 100
  )
}

export function EnemyDamageReduction(enemy_level: number) {
  return Math.round(0.0256 + enemy_level / (enemy_level + 40))
}
