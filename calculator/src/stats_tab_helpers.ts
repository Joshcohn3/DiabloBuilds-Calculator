import { NodesMap } from './computation_graph'
import {
  aggregationVal,
  aspectVal,
  baseStatVal,
  bookOfTheDeadVal,
  currentSkillVal,
  enchantmentVal,
  malignantHeartVal,
  paragonVal,
  spiritBoonVal,
  statVal,
  talentVal,
  toggleVal,
} from './graph_values'
import { AggregateStats, Stat } from './run_calculation'

interface modifierType {
  label: string
  tag: '%' | '#'
  category: 'offensive' | 'defensive' | 'utility' | 'core'
  calculation: (nodes_map: NodesMap) => number
}

function CreateStatDisplays(nodes_map: NodesMap): modifierType[] {
  return [
    {
      label: 'Weapon Damage',
      tag: '#',
      category: 'offensive',
      calculation: () => {
        const Weapon_Damage = aggregationVal(
          nodes_map,
          'weapon-damage',
        )
        return Math.ceil(Weapon_Damage)
      },
    },
    {
      label: 'Ranged Weapon Damage',
      tag: '#',
      category: 'offensive',
      calculation: () => {
        const Ranged_Weapon_Damage = aggregationVal(
          nodes_map,
          'ranged-weapon-damage',
        )
        return Math.ceil(Ranged_Weapon_Damage)
      },
    },
    {
      label: 'Bludgeoning Weapon Damage',
      tag: '#',
      category: 'offensive',
      calculation: () => {
        const Bludgeon_Weapon_Damage = aggregationVal(
          nodes_map,
          'two-hand-bludgeon-damage',
        )
        return Math.ceil(Bludgeon_Weapon_Damage)
      },
    },
    {
      label: 'Dual Wielded Weapon Damage',
      tag: '#',
      category: 'offensive',
      calculation: () => {
        const Dual_Wield_Weapon_Damage =
          aggregationVal(nodes_map, 'one-hand-slashing-damage') +
          aggregationVal(nodes_map, 'one-hand-bludgeon-damage') +
          aggregationVal(nodes_map, 'dual-wield-weapon-damage')
        return Math.ceil(Dual_Wield_Weapon_Damage)
      },
    },
    {
      label: 'Slashing Weapon Damage',
      tag: '#',
      category: 'offensive',
      calculation: () => {
        const Slashing_Weapon_Damage = aggregationVal(
          nodes_map,
          'two-hand-slashing-damage',
        )
        return Math.ceil(Slashing_Weapon_Damage)
      },
    },
    {
      label: 'Weapon Speed',
      tag: '#',
      category: 'offensive',
      calculation: () => {
        let Weapon_Speed = aggregationVal(
          nodes_map,
          'weapon-attack-speed',
        )
        switch (nodes_map.class) {
          case 'Barbarian':
            Weapon_Speed = aggregationVal(
              nodes_map,
              'two-hand-slashing-attack-speed',
            )
            break
          case 'Rogue':
            Weapon_Speed = aggregationVal(
              nodes_map,
              'dual-wield-attack-speed',
            )
            break
        }
        return Weapon_Speed
      },
    },
    {
      label: 'Attack Speed Bonus',
      tag: '%',
      category: 'offensive',
      calculation: () => {
        let Attack_Speed_Bonus = aggregationVal(
          nodes_map,
          'attack-speed',
        )
        switch (nodes_map.class) {
          case 'Barbarian':
            break
          case 'Druid':
            if (
              spiritBoonVal(nodes_map)['eagle'].includes(
                'swooping-attacks',
              )
            ) {
              Attack_Speed_Bonus += 0.1
            }

            if (aspectVal(nodes_map, 'mad-wolfs-glee').length > 0) {
              Attack_Speed_Bonus +=
                0.25 * talentVal(nodes_map, 'bestial-rampage')
            }
            break
          case 'Necromancer':
            if (
              bookOfTheDeadVal(nodes_map, 'golem')[0] == 'bone' &&
              bookOfTheDeadVal(nodes_map, 'golem')[1] == 3
            ) {
              let sacrificial_aspect = 1 // Sacrificial Aspect : Your Sacrifice bonuses are increased by {15/25}%.
              if (
                aspectVal(nodes_map, 'sacrificial-aspect').length != 0
              ) {
                sacrificial_aspect += aspectVal(
                  nodes_map,
                  'sacrificial-aspect',
                )[0]
              }
              Attack_Speed_Bonus += 0.1 * sacrificial_aspect
            }
            break
          case 'Rogue':
            break
          case 'Sorcerer':
            break
        }
        return Attack_Speed_Bonus
      },
    },
    {
      label: 'Minion Attack Speed',
      tag: '%',
      category: 'offensive',
      calculation: () => {
        const Minion_Attack_Speed_Bonus = aggregationVal(
          nodes_map,
          'minion-attack-speed',
        )
        switch (nodes_map.class) {
          case 'Barbarian':
            break
          case 'Druid':
            break
          case 'Necromancer':
            break
          case 'Rogue':
            break
          case 'Sorcerer':
            break
        }
        return Minion_Attack_Speed_Bonus
      },
    },
    {
      label: 'Critical Strike Chance',
      tag: '%',
      category: 'offensive',
      calculation: () => {
        let Critical_Strike_Chance =
          0.05 + aggregationVal(nodes_map, 'critical-strike-chance')
        switch (nodes_map.class) {
          case 'Barbarian':
            Critical_Strike_Chance +=
              statVal(nodes_map, 'Total_Dexterity') * 0.0002
            break
          case 'Druid':
            Critical_Strike_Chance +=
              statVal(nodes_map, 'Total_Dexterity') * 0.0002

            // Scythe Talons: Gain +5% increased Critical Strike Chance.
            if (
              spiritBoonVal(nodes_map)['eagle'].includes(
                'scythe-talons',
              )
            ) {
              Critical_Strike_Chance += 0.05
            }
            break
          case 'Necromancer':
            Critical_Strike_Chance +=
              statVal(nodes_map, 'Total_Dexterity') * 0.0002

            if (
              bookOfTheDeadVal(nodes_map, 'skeletal-warriors')[0] ==
                'skirmishers' &&
              bookOfTheDeadVal(nodes_map, 'skeletal-warriors')[1] == 3
            ) {
              let sacrificial_aspect = 1 // Sacrificial Aspect : Your Sacrifice bonuses are increased by {15/25}%.
              if (
                aspectVal(nodes_map, 'sacrificial-aspect').length != 0
              ) {
                sacrificial_aspect += aspectVal(
                  nodes_map,
                  'sacrificial-aspect',
                )[0]
              }
              let Memento_Mori = 0 // ['memento-mori', 3] Sacrificing both Skeletal Warriors and Skeletal Mages increases their Sacrifice bonuses by {['20%', '40%', '60%']}
              if (
                talentVal(nodes_map, 'memento-mori') > 0 &&
                bookOfTheDeadVal(nodes_map, 'skeletal-warriors')[1] ==
                  3 &&
                bookOfTheDeadVal(nodes_map, 'skeletal-mages')[1] == 3
              ) {
                Memento_Mori =
                  talentVal(nodes_map, 'memento-mori') * 0.2
              }

              Critical_Strike_Chance +=
                0.05 * sacrificial_aspect * (1 + Memento_Mori)
            }
            break
          case 'Rogue':
            Critical_Strike_Chance +=
              statVal(nodes_map, 'Total_Intelligence') * 0.0002
            break
          case 'Sorcerer':
            Critical_Strike_Chance +=
              statVal(nodes_map, 'Total_Dexterity') * 0.0002
            break
        }
        return Critical_Strike_Chance
      },
    },
    {
      label: 'Critical Strike Chance vs Injured',
      tag: '%',
      category: 'offensive',
      calculation: () => {
        const Critical_Strike_Chance = aggregationVal(
          nodes_map,
          'critical-strike-chance-against-injured-enemies',
        )
        switch (nodes_map.class) {
          case 'Barbarian':
            break
          case 'Druid':
            break
          case 'Necromancer':
            break
          case 'Rogue':
            break
          case 'Sorcerer':
            break
        }
        return Critical_Strike_Chance
      },
    },
    {
      label: 'Critical Strike Chance with Physical',
      tag: '%',
      category: 'offensive',
      calculation: () => {
        const Critical_Strike_Chance = aggregationVal(
          nodes_map,
          'critical-strike-chance-with-physical-damage',
        )
        switch (nodes_map.class) {
          case 'Barbarian':
            break
          case 'Druid':
            break
          case 'Necromancer':
            break
          case 'Rogue':
            break
          case 'Sorcerer':
            break
        }
        return Critical_Strike_Chance
      },
    },
    {
      label: 'Critical Strike Damage',
      tag: '%',
      category: 'offensive',
      calculation: () => {
        let Critical_Damage_Multiplier = 1.5
        const Critical_Strike_Damage = aggregationVal(
          nodes_map,
          'critical-strike-damage',
        )
        switch (nodes_map.class) {
          case 'Barbarian':
            break
          case 'Druid':
            // Avian Wrath: Gain 30%[x] Critical Strike Damage.
            if (
              spiritBoonVal(nodes_map)['eagle'].includes(
                'avian-wrath',
              )
            ) {
              Critical_Damage_Multiplier *= 1.3
            }
            break
          case 'Necromancer':
            // Sacrifice - x30% increased critical damage; unable to summon all types of Golems.
            if (
              bookOfTheDeadVal(nodes_map, 'golem')[0] == 'iron' &&
              bookOfTheDeadVal(nodes_map, 'golem')[1] == 3
            ) {
              let sacrificial_aspect = 1 // Sacrificial Aspect : Your Sacrifice bonuses are increased by {15/25}%.
              if (
                aspectVal(nodes_map, 'sacrificial-aspect').length != 0
              ) {
                sacrificial_aspect += aspectVal(
                  nodes_map,
                  'sacrificial-aspect',
                )[0]
              }

              Critical_Damage_Multiplier *=
                1 + 0.3 * sacrificial_aspect
            }
            break
          case 'Rogue':
            break
          case 'Sorcerer':
            break
        }
        return (
          (1 + Critical_Strike_Damage) * Critical_Damage_Multiplier -
          1
        )
      },
    },
    {
      label: 'Critical Strike Damage vs Crowd Controlled',
      tag: '%',
      category: 'offensive',
      calculation: () => {
        const Critical_Strike_Damage = aggregationVal(
          nodes_map,
          'critical-strike-damage-to-crowd-controlled-enemies',
        )
        switch (nodes_map.class) {
          case 'Barbarian':
            break
          case 'Druid':
            break
          case 'Necromancer':
            break
          case 'Rogue':
            break
          case 'Sorcerer':
            break
        }
        return Critical_Strike_Damage
      },
    },
    {
      label: 'Critical Strike Damage vs Vulnerable',
      tag: '%',
      category: 'offensive',
      calculation: () => {
        const Critical_Strike_Damage = aggregationVal(
          nodes_map,
          'critical-strike-damage-to-vulnerable-enemies',
        )
        switch (nodes_map.class) {
          case 'Barbarian':
            break
          case 'Druid':
            break
          case 'Necromancer':
            break
          case 'Rogue':
            break
          case 'Sorcerer':
            break
        }
        return Critical_Strike_Damage
      },
    },
    {
      label: 'Critical Strike Damage with Bone',
      tag: '%',
      category: 'offensive',
      calculation: () => {
        const Critical_Strike_Damage = aggregationVal(
          nodes_map,
          'critical-strike-damage-with-bone-skills',
        )
        switch (nodes_map.class) {
          case 'Barbarian':
            break
          case 'Druid':
            break
          case 'Necromancer':
            break
          case 'Rogue':
            break
          case 'Sorcerer':
            break
        }
        return Critical_Strike_Damage
      },
    },
    {
      label: 'Critical Strike Damage with Earth',
      tag: '%',
      category: 'offensive',
      calculation: () => {
        const Critical_Strike_Damage = aggregationVal(
          nodes_map,
          'critical-strike-damage-with-earth-skills',
        )
        switch (nodes_map.class) {
          case 'Barbarian':
            break
          case 'Druid':
            break
          case 'Necromancer':
            break
          case 'Rogue':
            break
          case 'Sorcerer':
            break
        }
        return Critical_Strike_Damage
      },
    },
    {
      label: 'Critical Strike Damage with Imbued',
      tag: '%',
      category: 'offensive',
      calculation: () => {
        const Critical_Strike_Damage = aggregationVal(
          nodes_map,
          'critical-strike-damage-with-imbued-skills',
        )
        switch (nodes_map.class) {
          case 'Barbarian':
            break
          case 'Druid':
            break
          case 'Necromancer':
            break
          case 'Rogue':
            break
          case 'Sorcerer':
            break
        }
        return Critical_Strike_Damage
      },
    },
    {
      label: 'Critical Strike Damage with Lightning',
      tag: '%',
      category: 'offensive',
      calculation: () => {
        const Critical_Strike_Damage = aggregationVal(
          nodes_map,
          'lightning-critical-strike-damage',
        )
        switch (nodes_map.class) {
          case 'Barbarian':
            break
          case 'Druid':
            break
          case 'Necromancer':
            break
          case 'Rogue':
            break
          case 'Sorcerer':
            break
        }
        return Critical_Strike_Damage
      },
    },
    {
      label: 'Critical Strike Damage with Werewolf',
      tag: '%',
      category: 'offensive',
      calculation: () => {
        const Critical_Strike_Damage = aggregationVal(
          nodes_map,
          'critical-strike-damage-with-werewolf-skills',
        )
        switch (nodes_map.class) {
          case 'Barbarian':
            break
          case 'Druid':
            break
          case 'Necromancer':
            break
          case 'Rogue':
            break
          case 'Sorcerer':
            break
        }
        return Critical_Strike_Damage
      },
    },
    {
      label: 'Overpower Chance',
      tag: '%',
      category: 'offensive',
      calculation: () => {
        const Overpower_Chance = 0.03
        switch (nodes_map.class) {
          case 'Barbarian':
            break
          case 'Druid':
            break
          case 'Necromancer':
            break
          case 'Rogue':
            break
          case 'Sorcerer':
            break
        }
        return Overpower_Chance
      },
    },
    {
      label: 'Overpower Damage',
      tag: '%',
      category: 'offensive',
      calculation: () => {
        let Overpower_Multiplier = 1.5
        const Overpower_Damage =
          aggregationVal(nodes_map, 'overpower-damage') +
          0.0025 * statVal(nodes_map, 'Total_Willpower')

        switch (nodes_map.class) {
          case 'Barbarian':
            break
          case 'Druid':
            break
          case 'Necromancer': {
            if (
              bookOfTheDeadVal(nodes_map, 'skeletal-mages')[0] ==
                'bone' &&
              bookOfTheDeadVal(nodes_map, 'skeletal-mages')[1] == 3
            ) {
              let Sacrifice_Bonus = 0.4
              // Sacrificial Aspect : Your Sacrifice bonuses are increased by {15/25}%.
              if (
                aspectVal(nodes_map, 'sacrificial-aspect').length != 0
              ) {
                Sacrifice_Bonus *=
                  1 + aspectVal(nodes_map, 'sacrificial-aspect')[0]
              }
              let Memento_Mori = 0 // ['memento-mori', 3] Sacrificing both Skeletal Warriors and Skeletal Mages increases their Sacrifice bonuses by {['20%', '40%', '60%']}
              if (
                talentVal(nodes_map, 'memento-mori') > 0 &&
                bookOfTheDeadVal(nodes_map, 'skeletal-warriors')[1] ==
                  3 &&
                bookOfTheDeadVal(nodes_map, 'skeletal-mages')[1] == 3
              ) {
                Memento_Mori =
                  talentVal(nodes_map, 'memento-mori') * 0.2
              }
              Overpower_Multiplier *=
                (1 + Sacrifice_Bonus) *
                (1 + Sacrifice_Bonus * Memento_Mori)
            }
            break
          }
          case 'Rogue':
            break
          case 'Sorcerer':
            break
        }
        return (1 + Overpower_Damage) * Overpower_Multiplier - 1
      },
    },
    {
      label: 'Vulnerable Damage',
      tag: '%',
      category: 'offensive',
      calculation: () => {
        const Vulnerable_Damage =
          1.2 * (1 + aggregationVal(nodes_map, 'vulnerable-damage')) -
          1
        switch (nodes_map.class) {
          case 'Barbarian':
            break
          case 'Druid':
            break
          case 'Necromancer':
            break
          case 'Rogue':
            break
          case 'Sorcerer':
            break
        }
        return Vulnerable_Damage
      },
    },
    {
      label: 'All Damage',
      tag: '%',
      category: 'offensive',
      calculation: () => {
        const All_Damage = aggregationVal(nodes_map, 'damage')
        let Damage_Multiplier = 1
        // aspect-of-Inner-Calm: Deal x{5/10}% increased damage for each second you stand still, up to x30.0%.
        if (
          aspectVal(nodes_map, 'aspect-of-inner-calm').length != 0
        ) {
          Damage_Multiplier *= 1.3
        }
        switch (nodes_map.class) {
          case 'Barbarian':
            break
          case 'Druid':
            if (aspectVal(nodes_map, 'insatiable-fury').length > 0) {
              Damage_Multiplier *=
                1 + 0.3 * talentVal(nodes_map, 'bestial-rampage')
            }
            break
          case 'Necromancer':
            break
          case 'Rogue':
            break
          case 'Sorcerer':
            // Glass Cannon: You deal x{6/12/18/24/30/36/42/48/54/60}% increased damage, but take x{3/6/9/12/15/18/21/24/27/30}% more damage.
            Damage_Multiplier *=
              1 + 0.06 * talentVal(nodes_map, 'glass-cannon')
            break
        }
        return (All_Damage + 1) * Damage_Multiplier - 1
      },
    },
    {
      label: 'Damage vs Elites',
      tag: '%',
      category: 'offensive',
      calculation: () => {
        const Damage = aggregationVal(nodes_map, 'damage-to-elites')
        switch (nodes_map.class) {
          case 'Barbarian':
            break
          case 'Druid':
            break
          case 'Necromancer':
            break
          case 'Rogue':
            break
          case 'Sorcerer':
            break
        }
        return Damage
      },
    },
    {
      label: 'Damage with Crowd Controlled',
      tag: '%',
      category: 'offensive',
      calculation: () => {
        const Damage = aggregationVal(
          nodes_map,
          'damage-to-crowd-controlled-enemies',
        )
        switch (nodes_map.class) {
          case 'Barbarian':
            break
          case 'Druid':
            break
          case 'Necromancer':
            break
          case 'Rogue':
            break
          case 'Sorcerer':
            break
        }
        return Damage
      },
    },
    {
      label: 'Damage vs Slowed',
      tag: '%',
      category: 'offensive',
      calculation: () => {
        const Damage = aggregationVal(
          nodes_map,
          'damage-to-slowed-enemies',
        )
        switch (nodes_map.class) {
          case 'Barbarian':
            break
          case 'Druid':
            break
          case 'Necromancer':
            break
          case 'Rogue':
            break
          case 'Sorcerer':
            break
        }
        return Damage
      },
    },
    {
      label: 'Damage vs Stunned',
      tag: '%',
      category: 'offensive',
      calculation: () => {
        const Damage = aggregationVal(
          nodes_map,
          'damage-to-stun-enemies',
        )
        switch (nodes_map.class) {
          case 'Barbarian':
            break
          case 'Druid':
            break
          case 'Necromancer':
            break
          case 'Rogue':
            break
          case 'Sorcerer':
            break
        }
        return Damage
      },
    },
    {
      label: 'Damage vs Chilled',
      tag: '%',
      category: 'offensive',
      calculation: () => {
        const Damage = aggregationVal(
          nodes_map,
          'damage-to-chilled-enemies',
        )
        switch (nodes_map.class) {
          case 'Barbarian':
            break
          case 'Druid':
            break
          case 'Necromancer':
            break
          case 'Rogue':
            break
          case 'Sorcerer':
            break
        }
        return Damage
      },
    },
    {
      label: 'Damage vs Frozen',
      tag: '%',
      category: 'offensive',
      calculation: () => {
        const Damage = aggregationVal(
          nodes_map,
          'damage-to-freeze-enemies',
        )
        switch (nodes_map.class) {
          case 'Barbarian':
            break
          case 'Druid':
            break
          case 'Necromancer':
            break
          case 'Rogue':
            break
          case 'Sorcerer':
            break
        }
        return Damage
      },
    },
    {
      label: 'Damage vs Close',
      tag: '%',
      category: 'offensive',
      calculation: () => {
        const Damage = aggregationVal(
          nodes_map,
          'damage-to-close-enemies',
        )
        let Damage_Multiplier = 1
        switch (nodes_map.class) {
          case 'Barbarian':
            // Pit Fighter (Talent up to 3 points): You deal x3% increased damage to Close Enemies and gain 2% Distant Damage Reduction
            Damage_Multiplier *=
              1 + 0.03 * talentVal(nodes_map, 'pit-fighter')
            break
          case 'Druid':
            break
          case 'Necromancer':
            break
          case 'Rogue':
            break
          case 'Sorcerer':
            break
        }
        return (1 + Damage) * Damage_Multiplier - 1
      },
    },
    {
      label: 'Damage vs Distant',
      tag: '%',
      category: 'offensive',
      calculation: () => {
        const Damage = aggregationVal(
          nodes_map,
          'damage-to-distant-enemies',
        )
        switch (nodes_map.class) {
          case 'Barbarian':
            break
          case 'Druid':
            break
          case 'Necromancer':
            break
          case 'Rogue':
            break
          case 'Sorcerer':
            break
        }
        return Damage
      },
    },
    {
      label: 'Damage vs Healthy',
      tag: '%',
      category: 'offensive',
      calculation: () => {
        const Damage = aggregationVal(
          nodes_map,
          'damage-to-healthy-enemies',
        )
        switch (nodes_map.class) {
          case 'Barbarian':
            break
          case 'Druid':
            break
          case 'Necromancer':
            break
          case 'Rogue':
            break
          case 'Sorcerer':
            break
        }
        return Damage
      },
    },
    {
      label: 'Damage vs Injured',
      tag: '%',
      category: 'offensive',
      calculation: () => {
        const Damage = aggregationVal(
          nodes_map,
          'damage-to-injured-enemies',
        )
        switch (nodes_map.class) {
          case 'Barbarian':
            break
          case 'Druid':
            break
          case 'Necromancer':
            break
          case 'Rogue':
            break
          case 'Sorcerer':
            break
        }
        return Damage
      },
    },
    {
      label: 'Damage vs Poisoned',
      tag: '%',
      category: 'offensive',
      calculation: () => {
        const Damage = aggregationVal(
          nodes_map,
          'damage-to-poisoned-enemies',
        )
        switch (nodes_map.class) {
          case 'Barbarian':
            break
          case 'Druid':
            break
          case 'Necromancer':
            break
          case 'Rogue':
            break
          case 'Sorcerer':
            break
        }
        return Damage
      },
    },
    {
      label: 'Damage vs Trap',
      tag: '%',
      category: 'offensive',
      calculation: () => {
        const Damage = aggregationVal(
          nodes_map,
          'damage-to-trap-enemies',
        )
        let Damage_Multiplier = 1
        switch (nodes_map.class) {
          case 'Barbarian':
            break
          case 'Druid':
            break
          case 'Necromancer':
            break
          case 'Rogue':
            // Enemies affected by Trap Skills take x10% increased damage from you.
            if (paragonVal(nodes_map, 'ambush')) {
              Damage_Multiplier *= 1.1
            }
            break
          case 'Sorcerer':
            break
        }
        return Damage * Damage_Multiplier
      },
    },
    {
      label: 'Damage vs Shadow DoT',
      tag: '%',
      category: 'offensive',
      calculation: () => {
        const Damage = aggregationVal(
          nodes_map,
          'damage-to-affected-by-shadow-damage-over-time-enemies',
        )
        switch (nodes_map.class) {
          case 'Barbarian':
            break
          case 'Druid':
            break
          case 'Necromancer':
            break
          case 'Rogue':
            break
          case 'Sorcerer':
            break
        }
        return Damage
      },
    },
    {
      label: 'Damage while Fortified',
      tag: '%',
      category: 'offensive',
      calculation: () => {
        const Damage = aggregationVal(
          nodes_map,
          'damage-while-fortified',
        )
        switch (nodes_map.class) {
          case 'Barbarian':
            break
          case 'Druid':
            break
          case 'Necromancer':
            break
          case 'Rogue':
            break
          case 'Sorcerer':
            break
        }
        return Damage
      },
    },
    {
      label: 'Damage while Berserking',
      tag: '%',
      category: 'offensive',
      calculation: () => {
        const Damage = aggregationVal(
          nodes_map,
          'damage-while-berserking',
        )
        switch (nodes_map.class) {
          case 'Barbarian':
            break
          case 'Druid':
            break
          case 'Necromancer':
            break
          case 'Rogue':
            break
          case 'Sorcerer':
            break
        }
        return Damage
      },
    },
    {
      label: 'Damage with Fire',
      tag: '%',
      category: 'offensive',
      calculation: () => {
        const Damage =
          aggregationVal(nodes_map, 'fire-damage') +
          aggregationVal(nodes_map, 'non-physical-damage')
        let Damage_Multiplier = 1
        switch (nodes_map.class) {
          case 'Barbarian':
            break
          case 'Druid':
            // Keeper: You and your Companions deal x10% increased Non-Physical damage.
            if (paragonVal(nodes_map, 'keeper')) {
              Damage_Multiplier *= 1.1
            }
            break
          case 'Necromancer':
            // Abyssal: You and your Minions deal x10% increased Non-Physical damage.
            if (paragonVal(nodes_map, 'abyssal')) {
              Damage_Multiplier *= 1.1
            }
            break
          case 'Rogue':
            break
          case 'Sorcerer':
            break
        }
        return (1 + Damage) * Damage_Multiplier - 1
      },
    },
    {
      label: 'Damage with Lightning',
      tag: '%',
      category: 'offensive',
      calculation: () => {
        const Damage =
          aggregationVal(nodes_map, 'lightning-damage') +
          aggregationVal(nodes_map, 'non-physical-damage')
        let Damage_Multiplier = 1
        switch (nodes_map.class) {
          case 'Barbarian':
            break
          case 'Druid':
            // Keeper: You and your Companions deal x10% increased Non-Physical damage.
            if (paragonVal(nodes_map, 'keeper')) {
              Damage_Multiplier *= 1.1
            }
            break
          case 'Necromancer':
            // Abyssal: You and your Minions deal x10% increased Non-Physical damage.
            if (paragonVal(nodes_map, 'abyssal')) {
              Damage_Multiplier *= 1.1
            }
            break
          case 'Rogue':
            break
          case 'Sorcerer':
            break
        }
        return (1 + Damage) * Damage_Multiplier - 1
      },
    },
    {
      label: 'Damage with Cold',
      tag: '%',
      category: 'offensive',
      calculation: () => {
        const Damage =
          aggregationVal(nodes_map, 'cold-damage') +
          aggregationVal(nodes_map, 'non-physical-damage')
        let Damage_Multiplier = 1
        switch (nodes_map.class) {
          case 'Barbarian':
            break
          case 'Druid':
            // Keeper: You and your Companions deal x10% increased Non-Physical damage.
            if (paragonVal(nodes_map, 'keeper')) {
              Damage_Multiplier *= 1.1
            }
            break
          case 'Necromancer':
            // Abyssal: You and your Minions deal x10% increased Non-Physical damage.
            if (paragonVal(nodes_map, 'abyssal')) {
              Damage_Multiplier *= 1.1
            }
            break
          case 'Rogue':
            break
          case 'Sorcerer':
            break
        }
        return (1 + Damage) * Damage_Multiplier - 1
      },
    },
    {
      label: 'Damage with Poison',
      tag: '%',
      category: 'offensive',
      calculation: () => {
        const Damage =
          aggregationVal(nodes_map, 'poison-damage') +
          aggregationVal(nodes_map, 'non-physical-damage')
        let Damage_Multiplier = 1
        switch (nodes_map.class) {
          case 'Barbarian':
            break
          case 'Druid':
            // Keeper: You and your Companions deal x10% increased Non-Physical damage.
            if (paragonVal(nodes_map, 'keeper')) {
              Damage_Multiplier *= 1.1
            }
            break
          case 'Necromancer':
            // Abyssal: You and your Minions deal x10% increased Non-Physical damage.
            if (paragonVal(nodes_map, 'abyssal')) {
              Damage_Multiplier *= 1.1
            }
            break
          case 'Rogue':
            break
          case 'Sorcerer':
            break
        }
        return (1 + Damage) * Damage_Multiplier - 1
      },
    },
    {
      label: 'Damage with Shadow',
      tag: '%',
      category: 'offensive',
      calculation: () => {
        const Damage =
          aggregationVal(nodes_map, 'shadow-damage') +
          aggregationVal(nodes_map, 'non-physical-damage')
        let Damage_Multiplier = 1
        switch (nodes_map.class) {
          case 'Barbarian':
            break
          case 'Druid':
            // Keeper: You and your Companions deal x10% increased Non-Physical damage.
            if (paragonVal(nodes_map, 'keeper')) {
              Damage_Multiplier *= 1.1
            }
            break
          case 'Necromancer':
            {
              // Abyssal: You and your Minions deal x10% increased Non-Physical damage.
              if (paragonVal(nodes_map, 'abyssal')) {
                Damage_Multiplier *= 1.1
              }
              // Reapers Perk 3 Sacrifice - You deal x15% increased Shadow damage, but you can no longer raise Skeletal Warriors.
              if (
                bookOfTheDeadVal(nodes_map, 'skeletal-warriors')[0] ==
                  'reapers' &&
                bookOfTheDeadVal(nodes_map, 'skeletal-warriors')[1] ==
                  3
              ) {
                let Sacrifice_Bonus = 0.15
                // Sacrificial Aspect : Your Sacrifice bonuses are increased by {15/25}%.
                if (
                  aspectVal(nodes_map, 'sacrificial-aspect').length !=
                  0
                ) {
                  Sacrifice_Bonus *=
                    1 + aspectVal(nodes_map, 'sacrificial-aspect')[0]
                }
                let Memento_Mori = 0 // ['memento-mori', 3] Sacrificing both Skeletal Warriors and Skeletal Mages increases their Sacrifice bonuses by {['20%', '40%', '60%']}
                if (
                  talentVal(nodes_map, 'memento-mori') > 0 &&
                  bookOfTheDeadVal(
                    nodes_map,
                    'skeletal-warriors',
                  )[1] == 3 &&
                  bookOfTheDeadVal(nodes_map, 'skeletal-mages')[1] ==
                    3
                ) {
                  Memento_Mori =
                    talentVal(nodes_map, 'memento-mori') * 0.2
                }
                Damage_Multiplier *=
                  (1 + Sacrifice_Bonus) *
                  (1 + Sacrifice_Bonus * Memento_Mori)
              }
            }

            break
          case 'Rogue':
            break
          case 'Sorcerer':
            break
        }
        return (1 + Damage) * Damage_Multiplier - 1
      },
    },
    {
      label: 'Damage with Bleeding',
      tag: '%',
      category: 'offensive',
      calculation: () => {
        const Damage =
          aggregationVal(nodes_map, 'physical-damage-over-time') +
          aggregationVal(nodes_map, 'damage-over-time')
        switch (nodes_map.class) {
          case 'Barbarian':
            break
          case 'Druid':
            break
          case 'Necromancer':
            break
          case 'Rogue':
            break
          case 'Sorcerer':
            break
        }
        return Damage
      },
    },
    {
      label: 'Damage with Burning',
      tag: '%',
      category: 'offensive',
      calculation: () => {
        const Damage =
          aggregationVal(nodes_map, 'fire-damage-over-time') +
          aggregationVal(nodes_map, 'damage-over-time')
        let Damage_Multiplier = 1
        switch (nodes_map.class) {
          case 'Barbarian':
            break
          case 'Druid':
            break
          case 'Necromancer':
            break
          case 'Rogue':
            break
          case 'Sorcerer':
            // Flamefeeder: You deal x10% increased direct damage to Burning enemies.
            if (paragonVal(nodes_map, 'flamefeeder')) {
              Damage_Multiplier *= 1.1
            }
            break
        }
        return (1 + Damage) * Damage_Multiplier - 1
      },
    },
    {
      label: 'Damage with Poisoning',
      tag: '%',
      category: 'offensive',
      calculation: () => {
        const Damage = aggregationVal(nodes_map, 'damage-over-time')
        switch (nodes_map.class) {
          case 'Barbarian':
            break
          case 'Druid':
            break
          case 'Necromancer':
            break
          case 'Rogue':
            break
          case 'Sorcerer':
            break
        }
        return Damage
      },
    },
    {
      label: 'Damage with Shadow Damage Over Time',
      tag: '%',
      category: 'offensive',
      calculation: () => {
        const Damage =
          aggregationVal(nodes_map, 'shadow-damage-over-time') +
          aggregationVal(nodes_map, 'damage-over-time')
        switch (nodes_map.class) {
          case 'Barbarian':
            break
          case 'Druid':
            break
          case 'Necromancer':
            break
          case 'Rogue':
            break
          case 'Sorcerer':
            break
        }
        return Damage
      },
    },
    {
      label: 'Damage with Physical',
      tag: '%',
      category: 'offensive',
      calculation: () => {
        const Damage = aggregationVal(nodes_map, 'physical-damage')
        let Damage_Multiplier = 1
        switch (nodes_map.class) {
          case 'Barbarian':
            break
          case 'Druid':
            break
          case 'Necromancer':
            // Glyph Corporeal You and your Minions deal x10% increased Physical damage.
            if (paragonVal(nodes_map, 'corporeal')) {
              Damage_Multiplier *= 1.1
            }
            break
          case 'Rogue':
            break
          case 'Sorcerer':
            break
        }
        return Damage * Damage_Multiplier
      },
    },
    {
      label: 'Damage with Basic',
      tag: '%',
      category: 'offensive',
      calculation: () => {
        const Damage = aggregationVal(nodes_map, 'basic-skill-damage')
        switch (nodes_map.class) {
          case 'Barbarian':
            break
          case 'Druid':
            break
          case 'Necromancer':
            break
          case 'Rogue':
            break
          case 'Sorcerer':
            break
        }
        return Damage
      },
    },
    {
      label: 'Damage with Core',
      tag: '%',
      category: 'offensive',
      calculation: () => {
        const Damage = aggregationVal(nodes_map, 'core-skill-damage')
        switch (nodes_map.class) {
          case 'Barbarian':
            break
          case 'Druid':
            break
          case 'Necromancer':
            break
          case 'Rogue':
            break
          case 'Sorcerer':
            break
        }
        return Damage
      },
    },
    {
      label: 'Damage with Mastery',
      tag: '%',
      category: 'offensive',
      calculation: () => {
        const Damage = aggregationVal(
          nodes_map,
          'mastery-skill-damage',
        )
        switch (nodes_map.class) {
          case 'Barbarian':
            break
          case 'Druid':
            break
          case 'Necromancer':
            break
          case 'Rogue':
            break
          case 'Sorcerer':
            break
        }
        return Damage
      },
    },
    {
      label: 'Damage with Bone',
      tag: '%',
      category: 'offensive',
      calculation: () => {
        const Damage = aggregationVal(nodes_map, 'bone-skill-damage')
        switch (nodes_map.class) {
          case 'Barbarian':
            break
          case 'Druid':
            break
          case 'Necromancer':
            break
          case 'Rogue':
            break
          case 'Sorcerer':
            break
        }
        return Damage
      },
    },
    {
      label: 'Damage with Blood',
      tag: '%',
      category: 'offensive',
      calculation: () => {
        const Damage = aggregationVal(nodes_map, 'blood-skill-damage')
        switch (nodes_map.class) {
          case 'Barbarian':
            break
          case 'Druid':
            break
          case 'Necromancer':
            break
          case 'Rogue':
            break
          case 'Sorcerer':
            break
        }
        return Damage
      },
    },
    {
      label: 'Damage with Brawling',
      tag: '%',
      category: 'offensive',
      calculation: () => {
        const Damage = aggregationVal(
          nodes_map,
          'brawling-skill-damage',
        )
        let Damage_Multiplier = 1
        switch (nodes_map.class) {
          case 'Barbarian':
            // Brawl: Brawling Skills deal x18% increased damage.
            if (
              paragonVal(nodes_map, 'brawl') &&
              currentSkillVal(nodes_map)['tags'].has('brawling')
            ) {
              Damage_Multiplier *= 1.18
            }
            break
          case 'Druid':
            break
          case 'Necromancer':
            break
          case 'Rogue':
            break
          case 'Sorcerer':
            break
        }
        return (1 + Damage) * Damage_Multiplier - 1
      },
    },
    {
      label: 'Damage with Companion',
      tag: '%',
      category: 'offensive',
      calculation: () => {
        const Damage = aggregationVal(
          nodes_map,
          'companion-skill-damage',
        )
        switch (nodes_map.class) {
          case 'Barbarian':
            break
          case 'Druid':
            break
          case 'Necromancer':
            break
          case 'Rogue':
            break
          case 'Sorcerer':
            break
        }
        return Damage
      },
    },
    {
      label: 'Damage with Cutthroat',
      tag: '%',
      category: 'offensive',
      calculation: () => {
        const Damage = aggregationVal(
          nodes_map,
          'cutthroat-skill-damage',
        )
        switch (nodes_map.class) {
          case 'Barbarian':
            break
          case 'Druid':
            break
          case 'Necromancer':
            break
          case 'Rogue':
            break
          case 'Sorcerer':
            break
        }
        return Damage
      },
    },
    {
      label: 'Damage with Summoning',
      tag: '%',
      category: 'offensive',
      calculation: () => {
        const Damage = aggregationVal(
          nodes_map,
          'summoning-skill-damage',
        )
        switch (nodes_map.class) {
          case 'Barbarian':
            break
          case 'Druid':
            break
          case 'Necromancer':
            break
          case 'Rogue':
            break
          case 'Sorcerer':
            break
        }
        return Damage
      },
    },
    {
      label: 'Damage with Darkness',
      tag: '%',
      category: 'offensive',
      calculation: () => {
        const Damage = aggregationVal(
          nodes_map,
          'darkness-skill-damage',
        )
        switch (nodes_map.class) {
          case 'Barbarian':
            break
          case 'Druid':
            break
          case 'Necromancer':
            break
          case 'Rogue':
            break
          case 'Sorcerer':
            break
        }
        return Damage
      },
    },
    {
      label: 'Damage with Earth',
      tag: '%',
      category: 'offensive',
      calculation: () => {
        const Damage = aggregationVal(nodes_map, 'earth-skill-damage')
        switch (nodes_map.class) {
          case 'Barbarian':
            break
          case 'Druid':
            break
          case 'Necromancer':
            break
          case 'Rogue':
            break
          case 'Sorcerer':
            break
        }
        return Damage
      },
    },
    {
      label: 'Damage with Crackling Energy',
      tag: '%',
      category: 'offensive',
      calculation: () => {
        const Damage = aggregationVal(
          nodes_map,
          'crackling-energy-damage',
        )
        switch (nodes_map.class) {
          case 'Barbarian':
            break
          case 'Druid':
            break
          case 'Necromancer':
            break
          case 'Rogue':
            break
          case 'Sorcerer':
            break
        }
        return Damage
      },
    },
    {
      label: 'Damage with Frost',
      tag: '%',
      category: 'offensive',
      calculation: () => {
        const Damage = aggregationVal(nodes_map, 'frost-skill-damage')
        switch (nodes_map.class) {
          case 'Barbarian':
            break
          case 'Druid':
            break
          case 'Necromancer':
            break
          case 'Rogue':
            break
          case 'Sorcerer':
            break
        }
        return Damage
      },
    },
    {
      label: 'Damage with Imbued',
      tag: '%',
      category: 'offensive',
      calculation: () => {
        const Damage = aggregationVal(
          nodes_map,
          'imbued-skill-damage',
        )
        switch (nodes_map.class) {
          case 'Barbarian':
            break
          case 'Druid':
            break
          case 'Necromancer':
            break
          case 'Rogue':
            break
          case 'Sorcerer':
            break
        }
        return Damage
      },
    },
    {
      label: 'Damage with Imbuement',
      tag: '%',
      category: 'offensive',
      calculation: () => {
        const Damage = aggregationVal(
          nodes_map,
          'imbuement-skill-damage',
        )
        switch (nodes_map.class) {
          case 'Barbarian':
            break
          case 'Druid':
            break
          case 'Necromancer':
            break
          case 'Rogue':
            break
          case 'Sorcerer':
            break
        }
        return Damage
      },
    },
    {
      label: 'Damage with Marksman',
      tag: '%',
      category: 'offensive',
      calculation: () => {
        const Damage = aggregationVal(
          nodes_map,
          'marksman-skill-damage',
        )
        switch (nodes_map.class) {
          case 'Barbarian':
            break
          case 'Druid':
            break
          case 'Necromancer':
            break
          case 'Rogue':
            break
          case 'Sorcerer':
            break
        }
        return Damage
      },
    },
    {
      label: 'Damage with Pyromancy',
      tag: '%',
      category: 'offensive',
      calculation: () => {
        const Damage = aggregationVal(
          nodes_map,
          'pyromancy-skill-damage',
        )
        switch (nodes_map.class) {
          case 'Barbarian':
            break
          case 'Druid':
            break
          case 'Necromancer':
            break
          case 'Rogue':
            break
          case 'Sorcerer':
            break
        }
        return Damage
      },
    },
    {
      label: 'Damage with Shock',
      tag: '%',
      category: 'offensive',
      calculation: () => {
        const Damage = aggregationVal(nodes_map, 'shock-skill-damage')
        switch (nodes_map.class) {
          case 'Barbarian':
            break
          case 'Druid':
            break
          case 'Necromancer':
            break
          case 'Rogue':
            break
          case 'Sorcerer':
            break
        }
        return Damage
      },
    },
    {
      label: 'Damage with Storm',
      tag: '%',
      category: 'offensive',
      calculation: () => {
        const Damage = aggregationVal(nodes_map, 'storm-skill-damage')
        switch (nodes_map.class) {
          case 'Barbarian':
            break
          case 'Druid':
            break
          case 'Necromancer':
            break
          case 'Rogue':
            break
          case 'Sorcerer':
            break
        }
        return Damage
      },
    },
    {
      label: 'Damage with Trap',
      tag: '%',
      category: 'offensive',
      calculation: () => {
        const Damage = aggregationVal(nodes_map, 'trap-skill-damage')
        switch (nodes_map.class) {
          case 'Barbarian':
            break
          case 'Druid':
            break
          case 'Necromancer':
            break
          case 'Rogue':
            break
          case 'Sorcerer':
            break
        }
        return Damage
      },
    },
    {
      label: 'Damage with Two Handed Bludgeoning',
      tag: '%',
      category: 'offensive',
      calculation: () => {
        const Damage = aggregationVal(
          nodes_map,
          'damage-with-two-handed-bludgeoning-weapons',
        )
        let Damage_Multiplier = 1
        switch (nodes_map.class) {
          case 'Barbarian':
            // Might: You deal x8% increased damage while wielding Two-Handed weapons.
            if (paragonVal(nodes_map, 'might')) {
              Damage_Multiplier *= 1.08
            }
            break
          case 'Druid':
            break
          case 'Necromancer':
            break
          case 'Rogue':
            break
          case 'Sorcerer':
            break
        }
        return (1 + Damage) * Damage_Multiplier - 1
      },
    },
    {
      label: 'Damage with Two Handed Slashing',
      tag: '%',
      category: 'offensive',
      calculation: () => {
        const Damage = aggregationVal(
          nodes_map,
          'damage-with-two-handed-slashing-weapons',
        )
        let Damage_Multiplier = 1
        switch (nodes_map.class) {
          case 'Barbarian':
            // Might: You deal x8% increased damage while wielding Two-Handed weapons.
            if (paragonVal(nodes_map, 'might')) {
              Damage_Multiplier *= 1.08
            }
            break
          case 'Druid':
            break
          case 'Necromancer':
            break
          case 'Rogue':
            break
          case 'Sorcerer':
            break
        }
        return (1 + Damage) * Damage_Multiplier - 1
      },
    },
    {
      label: 'Damage with Dual Wield',
      tag: '%',
      category: 'offensive',
      calculation: () => {
        const Damage = aggregationVal(
          nodes_map,
          'damage-with-dual-wielded-weapons',
        )
        let Damage_Multiplier = 1
        switch (nodes_map.class) {
          case 'Barbarian':
            // Ambidextrous: // You deal x8% increased damage while wielding One-Handed weapons.
            if (paragonVal(nodes_map, 'ambidextrous')) {
              Damage_Multiplier *= 1.08
            }
            break
          case 'Druid':
            break
          case 'Necromancer':
            break
          case 'Rogue':
            break
          case 'Sorcerer':
            break
        }
        return (1 + Damage) * Damage_Multiplier - 1
      },
    },
    {
      label: 'Damage with Ultimate',
      tag: '%',
      category: 'offensive',
      calculation: () => {
        const Damage = aggregationVal(
          nodes_map,
          'ultimate-skill-damage',
        )
        switch (nodes_map.class) {
          case 'Barbarian':
            break
          case 'Druid':
            break
          case 'Necromancer':
            break
          case 'Rogue':
            break
          case 'Sorcerer':
            break
        }
        return Damage
      },
    },
    {
      label: 'Damage with Swapped Weapons',
      tag: '%',
      category: 'offensive',
      calculation: () => {
        const Damage = aggregationVal(
          nodes_map,
          'damage-with-skills-that-swap-to-new-weapons',
        )
        switch (nodes_map.class) {
          case 'Barbarian':
            break
          case 'Druid':
            break
          case 'Necromancer':
            break
          case 'Rogue':
            break
          case 'Sorcerer':
            break
        }
        return Damage
      },
    },
    {
      label: 'Damage with Warrior',
      tag: '%',
      category: 'offensive',
      calculation: () => {
        const Damage = aggregationVal(
          nodes_map,
          'skeletonwarrior-damage',
        )
        let Damage_Multiplier = 1
        switch (nodes_map.class) {
          case 'Barbarian':
            break
          case 'Druid':
            break
          case 'Necromancer':
            // 'skeletal-warrior-mastery' Increase the damage and Life of your Skeletal Warriors by {['15%', '30%', '45%',} .
            Damage_Multiplier *=
              1 +
              0.15 * talentVal(nodes_map, 'skeletal-warrior-mastery')
            break
          case 'Rogue':
            break
          case 'Sorcerer':
            break
        }
        return (1 + Damage) * Damage_Multiplier - 1
      },
    },
    {
      label: 'Damage with Mages',
      tag: '%',
      category: 'offensive',
      calculation: () => {
        const Damage = aggregationVal(
          nodes_map,
          'skeletonmage-damage',
        )
        let Damage_Multiplier = 1
        switch (nodes_map.class) {
          case 'Barbarian':
            break
          case 'Druid':
            break
          case 'Necromancer':
            Damage_Multiplier *=
              1 + 0.2 * talentVal(nodes_map, 'skeletal-mage-mastery')
            break
          case 'Rogue':
            break
          case 'Sorcerer':
            break
        }
        return (1 + Damage) * Damage_Multiplier - 1
      },
    },
    {
      label: 'Damage with Golem',
      tag: '%',
      category: 'offensive',
      calculation: () => {
        const Damage = aggregationVal(nodes_map, 'golem-damage')
        let Damage_Multiplier = 1
        switch (nodes_map.class) {
          case 'Barbarian':
            break
          case 'Druid':
            break
          case 'Necromancer':
            // 'golem-mastery' Increase the damage and Life of your Golem by 25%.
            Damage_Multiplier *=
              1 + 0.25 * talentVal(nodes_map, 'golem-mastery')
            break
          case 'Rogue':
            break
          case 'Sorcerer':
            break
        }
        return (1 + Damage) * Damage_Multiplier - 1
      },
    },
    {
      label: 'Damage with Werebear',
      tag: '%',
      category: 'offensive',
      calculation: () => {
        const Damage = aggregationVal(
          nodes_map,
          'werebear-skill-damage',
        )
        switch (nodes_map.class) {
          case 'Barbarian':
            break
          case 'Druid':
            break
          case 'Necromancer':
            break
          case 'Rogue':
            break
          case 'Sorcerer':
            break
        }
        return Damage
      },
    },
    {
      label: 'Damage with Werewolf',
      tag: '%',
      category: 'offensive',
      calculation: () => {
        const Damage = aggregationVal(
          nodes_map,
          'werewolf-skill-damage',
        )
        switch (nodes_map.class) {
          case 'Barbarian':
            break
          case 'Druid':
            break
          case 'Necromancer':
            break
          case 'Rogue':
            break
          case 'Sorcerer':
            break
        }
        return Damage
      },
    },
    {
      label: 'Damage from Elite Kill',
      tag: '%',
      category: 'offensive',
      calculation: () => {
        const Damage = aggregationVal(
          nodes_map,
          'damage-for-4-seconds-after-killing-an-elite',
        )
        switch (nodes_map.class) {
          case 'Barbarian':
            break
          case 'Druid':
            break
          case 'Necromancer':
            break
          case 'Rogue':
            break
          case 'Sorcerer':
            break
        }
        return Damage
      },
    },
    {
      label: 'Damage from Blood Orb',
      tag: '%',
      category: 'offensive',
      calculation: () => {
        const Damage = aggregationVal(
          nodes_map,
          'damage-for-4-seconds-after-picking-up-a-blood-orb',
        )
        switch (nodes_map.class) {
          case 'Barbarian':
            break
          case 'Druid':
            break
          case 'Necromancer':
            break
          case 'Rogue':
            break
          case 'Sorcerer':
            break
        }
        return Damage
      },
    },
    {
      label: 'Lucky Hit Execute',
      tag: '%',
      category: 'offensive',
      calculation: () => {
        const Lucky_Hit_Execute = aggregationVal(
          nodes_map,
          'lucky-hit:-up-to-a-chance-to-execute-injured-non-elites',
        )
        switch (nodes_map.class) {
          case 'Barbarian':
            break
          case 'Druid':
            break
          case 'Necromancer':
            break
          case 'Rogue':
            break
          case 'Sorcerer':
            break
        }
        return Lucky_Hit_Execute
      },
    },
    {
      label: 'Thorns',
      tag: '#',
      category: 'offensive',
      calculation: () => {
        let Thorns = aggregationVal(nodes_map, 'thorns')
        let Thorns_Multiplier = 1
        switch (nodes_map.class) {
          case 'Barbarian':
            // (Talent) Outburst: Gain 4% Base Life in Thorns. Also gain 2% Base Life in Thorns for each 10% Base Life Bonus Maximum life you have.
            if (talentVal(nodes_map, 'outburst') > 0) {
              const Base_Life = baseStatVal(nodes_map)['BaseMaxLife']
              const Max_Life = statVal(nodes_map, 'Max_Life')
              Thorns += Math.floor(
                0.04 * Base_Life + 0.2 * (Max_Life - Base_Life),
              )
            }

            // (Talent) Tough as Nails: Increase your Thorns by +3% (up to 3 points). When enemies hit you, they take an additional 10% of your Thorns as Bleeding Damage over 5 seconds.
            Thorns_Multiplier *=
              1 + 0.03 * talentVal(nodes_map, 'tough-as-nails')
            break
          case 'Druid':
            // Prickleskin: Gain 60% of base life in thorns.
            if (
              spiritBoonVal(nodes_map)['deer'].includes('prickleskin')
            ) {
              Thorns += baseStatVal(nodes_map)['BaseMaxLife'] * 0.6
            }
            break
          case 'Necromancer':
            // Spiked Armor: Gain {.1,.2,.3} Base Life, Thorns
            if (talentVal(nodes_map, 'spiked-armor') > 0) {
              Thorns +=
                0.1 *
                talentVal(nodes_map, 'spiked-armor') *
                baseStatVal(nodes_map)['BaseMaxLife']
            }
            break
          case 'Rogue':
            break
          case 'Sorcerer':
            break
        }
        return Math.round(Thorns * Thorns_Multiplier)
      },
    },
    {
      label: 'Warrior Thorns',
      tag: '%',
      category: 'offensive',
      calculation: () => {
        const Warrior_Thorns = aggregationVal(
          nodes_map,
          'skeletal-warriors-inherit-%-of-your-thorns',
        )
        switch (nodes_map.class) {
          case 'Barbarian':
            break
          case 'Druid':
            break
          case 'Necromancer':
            break
          case 'Rogue':
            break
          case 'Sorcerer':
            break
        }
        return Warrior_Thorns
      },
    },
    {
      label: 'Mage Thorns',
      tag: '%',
      category: 'offensive',
      calculation: () => {
        const Mage_Thorns = aggregationVal(
          nodes_map,
          'skeletal-mages-inherit-%-of-your-thorns',
        )
        switch (nodes_map.class) {
          case 'Barbarian':
            break
          case 'Druid':
            break
          case 'Necromancer':
            break
          case 'Rogue':
            break
          case 'Sorcerer':
            break
        }
        return Mage_Thorns
      },
    },
    {
      label: 'Golem Thorns',
      tag: '%',
      category: 'offensive',
      calculation: () => {
        const Golem_Thorns = aggregationVal(
          nodes_map,
          'golem-inherit-%-of-your-thorns',
        )
        switch (nodes_map.class) {
          case 'Barbarian':
            break
          case 'Druid':
            break
          case 'Necromancer':
            break
          case 'Rogue':
            break
          case 'Sorcerer':
            break
        }
        return Golem_Thorns
      },
    },
    {
      label: 'Maximum Life',
      tag: '#',
      category: 'defensive',
      calculation: () => {
        const Base_Life = baseStatVal(nodes_map)['BaseMaxLife']
        const Bonus_Life = aggregationVal(nodes_map, 'maximum-life')
        let Life_Multiplier =
          1 + aggregationVal(nodes_map, '%-maximum-life')
        switch (nodes_map.class) {
          case 'Barbarian':
            Life_Multiplier *=
              1 + 0.05 * talentVal(nodes_map, 'imposing-presence')
            break
          case 'Druid':
            if (aspectVal(nodes_map, 'insatiable-fury').length > 0) {
              Life_Multiplier *=
                1 + 0.2 * talentVal(nodes_map, 'ursine-strength')
            }
            break
          case 'Necromancer':
            // Sacrifice - +10% max HP; unable to summon all types of Golems.
            if (
              bookOfTheDeadVal(nodes_map, 'golem')[0] == 'blood' &&
              bookOfTheDeadVal(nodes_map, 'golem')[1] == 3
            ) {
              let sacrificial_aspect = 1 // Sacrificial Aspect : Your Sacrifice bonuses are increased by {15/25}%.
              if (
                aspectVal(nodes_map, 'sacrificial-aspect').length != 0
              ) {
                sacrificial_aspect += aspectVal(
                  nodes_map,
                  'sacrificial-aspect',
                )[0]
              }

              Life_Multiplier *= 1 + 0.1 * (1 + sacrificial_aspect)
            }

            // Talent ['rathmas-vigor', 1], Increase your Maximum Life by 10%. After being Healthy for 12 seconds, your next Blood Skill Overpowers.
            if (talentVal(nodes_map, 'rathmas-vigor')) {
              Life_Multiplier *= 1.1
            }
            break
          case 'Rogue':
            break
          case 'Sorcerer':
            break
        }
        return Math.floor(Base_Life * Life_Multiplier + Bonus_Life)
      },
    },
    {
      label: 'Minion Life Bonus',
      tag: '%',
      category: 'defensive',
      calculation: () => {
        const Minion_Life = aggregationVal(
          nodes_map,
          '%-maximum-minion-life',
        )
        switch (nodes_map.class) {
          case 'Barbarian':
            break
          case 'Druid':
            break
          case 'Necromancer':
            break
          case 'Rogue':
            break
          case 'Sorcerer':
            break
        }
        return Minion_Life
      },
    },
    {
      label: 'Warrior Life Bonus',
      tag: '%',
      category: 'defensive',
      calculation: () => {
        switch (nodes_map.class) {
          case 'Barbarian':
            break
          case 'Druid':
            break
          case 'Necromancer':
            break
          case 'Rogue':
            break
          case 'Sorcerer':
            break
        }
        return 0
      },
    },
    {
      label: 'Mage Life Bonus',
      tag: '%',
      category: 'defensive',
      calculation: () => {
        switch (nodes_map.class) {
          case 'Barbarian':
            break
          case 'Druid':
            break
          case 'Necromancer':
            break
          case 'Rogue':
            break
          case 'Sorcerer':
            break
        }
        return 0
      },
    },
    {
      label: 'Golem Life Bonus',
      tag: '%',
      category: 'defensive',
      calculation: () => {
        const Golem_Base_Life =
          1.57 * baseStatVal(nodes_map)['BaseMaxLife']
        const Golem_Life =
          Golem_Base_Life +
          aggregationVal(nodes_map, 'golem-maximum-life')
        let Golem_Life_Multiplier = 1
        switch (nodes_map.class) {
          case 'Barbarian':
            break
          case 'Druid':
            break
          case 'Necromancer':
            // 'golem-mastery' Increase the damage and Life of your Golem by 25%.
            Golem_Life_Multiplier *=
              1 + 0.25 * talentVal(nodes_map, 'golem-mastery')
            break
          case 'Rogue':
            break
          case 'Sorcerer':
            break
        }
        return Golem_Life * Golem_Life_Multiplier - Golem_Base_Life
      },
    },
    {
      label: 'Potion Capacity',
      tag: '#',
      category: 'defensive',
      calculation: () => {
        const Potion_Capacity =
          9 + aggregationVal(nodes_map, 'potion-charges')
        switch (nodes_map.class) {
          case 'Barbarian':
            break
          case 'Druid':
            break
          case 'Necromancer':
            break
          case 'Rogue':
            break
          case 'Sorcerer':
            break
        }
        return Potion_Capacity
      },
    },
    {
      label: 'All Healing',
      tag: '%',
      category: 'defensive',
      calculation: () => {
        let All_Healing = aggregationVal(
          nodes_map,
          'healing-received',
        )
        switch (nodes_map.class) {
          case 'Barbarian':
            break
          case 'Druid':
            if (aspectVal(nodes_map, 'insatiable-fury').length > 0) {
              All_Healing += 0.05 * talentVal(nodes_map, 'mending')
            }
            break
          case 'Necromancer':
            break
          case 'Rogue':
            break
          case 'Sorcerer':
            break
        }
        return All_Healing
      },
    },
    {
      label: 'Healing from Potions',
      tag: '%',
      category: 'defensive',
      calculation: () => {
        const Potion_Healing = aggregationVal(
          nodes_map,
          'potion-healing',
        )
        switch (nodes_map.class) {
          case 'Barbarian':
            break
          case 'Druid':
            break
          case 'Necromancer':
            break
          case 'Rogue':
            break
          case 'Sorcerer':
            break
        }
        return Potion_Healing
      },
    },
    {
      label: 'Healing from Blood Orbs',
      tag: '%',
      category: 'defensive',
      calculation: () => {
        const Blood_Orb_Healing = aggregationVal(
          nodes_map,
          'blood-orb-healing',
        )
        switch (nodes_map.class) {
          case 'Barbarian':
            break
          case 'Druid':
            break
          case 'Necromancer':
            break
          case 'Rogue':
            break
          case 'Sorcerer':
            break
        }
        return Blood_Orb_Healing
      },
    },
    {
      label: 'Life Regeneration',
      tag: '#',
      category: 'defensive',
      calculation: () => {
        const Life_Regen = aggregationVal(
          nodes_map,
          'life-regeneration-while-not-damaged-recently',
        )
        switch (nodes_map.class) {
          case 'Barbarian':
            break
          case 'Druid':
            break
          case 'Necromancer':
            break
          case 'Rogue':
            break
          case 'Sorcerer':
            break
        }
        return Life_Regen
      },
    },
    {
      label: 'Lucky Hit Life',
      tag: '#',
      category: 'defensive',
      calculation: () => {
        const Lucky_Hit_Life = aggregationVal(
          nodes_map,
          'lucky-hit:-up-to-a-5%-chance-to-heal-life',
        )
        switch (nodes_map.class) {
          case 'Barbarian':
            break
          case 'Druid':
            break
          case 'Necromancer':
            break
          case 'Rogue':
            break
          case 'Sorcerer':
            break
        }
        return Lucky_Hit_Life
      },
    },
    {
      label: 'Life on Kill',
      tag: '#',
      category: 'defensive',
      calculation: () => {
        const Life_On_Kill = aggregationVal(nodes_map, 'life-on-kill')
        switch (nodes_map.class) {
          case 'Barbarian':
            break
          case 'Druid':
            break
          case 'Necromancer':
            break
          case 'Rogue':
            break
          case 'Sorcerer':
            break
        }
        return Life_On_Kill
      },
    },
    {
      label: 'Life Steal',
      tag: '%',
      category: 'defensive',
      calculation: () => {
        const Life_Steal = aggregationVal(nodes_map, 'life-steal')
        switch (nodes_map.class) {
          case 'Barbarian':
            break
          case 'Druid':
            break
          case 'Necromancer':
            break
          case 'Rogue':
            break
          case 'Sorcerer':
            break
        }
        return Life_Steal
      },
    },
    {
      label: 'Armor',
      tag: '#',
      category: 'defensive',
      calculation: () => {
        const Armor =
          (aggregationVal(nodes_map, 'armor') +
            statVal(nodes_map, 'Total_Strength')) *
          (1 + aggregationVal(nodes_map, 'total-armor'))
        switch (nodes_map.class) {
          case 'Barbarian':
            break
          case 'Druid':
            break
          case 'Necromancer':
            break
          case 'Rogue':
            break
          case 'Sorcerer':
            break
        }
        return Math.floor(Armor)
      },
    },
    {
      label: 'Armor Contribution',
      tag: '%',
      category: 'defensive',
      calculation: () => {
        switch (nodes_map.class) {
          case 'Barbarian':
            break
          case 'Druid':
            break
          case 'Necromancer':
            break
          case 'Rogue':
            break
          case 'Sorcerer':
            break
        }
        return 0.5
      },
    },
    {
      label: 'Block Chance',
      tag: '%',
      category: 'defensive',
      calculation: () => {
        const Block_Chance = aggregationVal(nodes_map, 'block-chance')
        switch (nodes_map.class) {
          case 'Barbarian':
            break
          case 'Druid':
            break
          case 'Necromancer':
            break
          case 'Rogue':
            break
          case 'Sorcerer':
            break
        }
        return Block_Chance
      },
    },
    {
      label: 'Block Reduction',
      tag: '%',
      category: 'defensive',
      calculation: () => {
        const Blocked_Damage_Reduction = aggregationVal(
          nodes_map,
          'blocked-damage-reduction',
        )
        switch (nodes_map.class) {
          case 'Barbarian':
            break
          case 'Druid':
            break
          case 'Necromancer':
            break
          case 'Rogue':
            break
          case 'Sorcerer':
            break
        }
        return Blocked_Damage_Reduction
      },
    },
    {
      label: 'Dodge Chance',
      tag: '%',
      category: 'defensive',
      calculation: () => {
        const Dodge_Chance =
          aggregationVal(nodes_map, 'dodge-chance') +
          statVal(nodes_map, 'Total_Dexterity') * 0.0001
        switch (nodes_map.class) {
          case 'Barbarian':
            break
          case 'Druid':
            break
          case 'Necromancer':
            break
          case 'Rogue':
            break
          case 'Sorcerer':
            break
        }
        return Dodge_Chance
      },
    },
    {
      label: 'Dodge Chance Against Close Enemies',
      tag: '%',
      category: 'defensive',
      calculation: () => {
        const Dodge_Chance = aggregationVal(
          nodes_map,
          'dodge-chance-against-close-enemies',
        )
        switch (nodes_map.class) {
          case 'Barbarian':
            break
          case 'Druid':
            break
          case 'Necromancer':
            break
          case 'Rogue':
            break
          case 'Sorcerer':
            break
        }
        return Dodge_Chance
      },
    },
    {
      label: 'Dodge Chance Against Distant Enemies',
      tag: '%',
      category: 'defensive',
      calculation: () => {
        const Dodge_Chance = aggregationVal(
          nodes_map,
          'dodge-chance-against-distant-enemies',
        )
        switch (nodes_map.class) {
          case 'Barbarian':
            break
          case 'Druid':
            break
          case 'Necromancer':
            break
          case 'Rogue':
            break
          case 'Sorcerer':
            break
        }
        return Dodge_Chance
      },
    },
    {
      label: 'Fortify Bonus',
      tag: '%',
      category: 'defensive',
      calculation: () => {
        let Fortify_Bonus = aggregationVal(
          nodes_map,
          'fortify-generation',
        )
        switch (nodes_map.class) {
          case 'Barbarian':
            break
          case 'Druid':
            Fortify_Bonus +=
              0.05 * talentVal(nodes_map, 'defensive-posture')
            break
          case 'Necromancer':
            break
          case 'Rogue':
            break
          case 'Sorcerer':
            break
        }
        return Fortify_Bonus
      },
    },
    {
      label: 'Barrier Bonus',
      tag: '%',
      category: 'defensive',
      calculation: () => {
        const Barrier_Bonus = aggregationVal(
          nodes_map,
          'barrier-generation',
        )
        switch (nodes_map.class) {
          case 'Barbarian':
            break
          case 'Druid':
            break
          case 'Necromancer':
            break
          case 'Rogue':
            break
          case 'Sorcerer':
            break
        }
        return Barrier_Bonus
      },
    },
    {
      label: 'Fire Resistance',
      tag: '%',
      category: 'defensive',
      calculation: () => {
        let Resistance_Cap = 0.7
        let Player_Resist =
          aggregationVal(nodes_map, 'fire-resistance') +
          aggregationVal(nodes_map, 'resistance-to-all-elements') +
          statVal(nodes_map, 'Total_Intelligence') * 0.00025

        let World_Tier_Penalty = 0
        if (toggleVal(nodes_map, 'world-tier') == 3) {
          World_Tier_Penalty = 0.25
        }
        if (
          toggleVal(nodes_map, 'world-tier') == 4 ||
          toggleVal(nodes_map, 'world-tier') == 5
        ) {
          World_Tier_Penalty = 0.5
        }
        switch (nodes_map.class) {
          case 'Barbarian':
            break
          case 'Druid':
            // Ancestral Fortitude: You gain +5/10/15% Resistance to All Elements.
            Player_Resist +=
              0.05 * talentVal(nodes_map, 'ancestral-fortitude')
            break
          case 'Necromancer':
            // Sacrifice - You gain +20% Non-Physical Resistance, but you can no longer raise Skeletal Warriors.
            if (
              bookOfTheDeadVal(nodes_map, 'skeletal-warriors')[0] ==
                'defenders' &&
              bookOfTheDeadVal(nodes_map, 'skeletal-warriors')[1] == 3
            ) {
              let Sacrificial_Bonus = 0.2 // Sacrificial Aspect : Your Sacrifice bonuses are increased by {15/25}%.
              if (
                aspectVal(nodes_map, 'sacrificial-aspect').length != 0
              ) {
                Sacrificial_Bonus *=
                  1 + aspectVal(nodes_map, 'sacrificial-aspect')[0]
              }
              let Memento_Mori = 0 // ['memento-mori', 3] Sacrificing both Skeletal Warriors and Skeletal Mages increases their Sacrifice bonuses by {['20%', '40%', '60%']}
              if (
                talentVal(nodes_map, 'memento-mori') > 0 &&
                bookOfTheDeadVal(nodes_map, 'skeletal-warriors')[1] ==
                  3 &&
                bookOfTheDeadVal(nodes_map, 'skeletal-mages')[1] == 3
              ) {
                Memento_Mori +=
                  talentVal(nodes_map, 'memento-mori') * 0.2
              }
              Player_Resist +=
                Sacrificial_Bonus + Sacrificial_Bonus * Memento_Mori
            }
            break
          case 'Rogue':
            break
          case 'Sorcerer': {
            // Enchanter: For each Skill equipped in your Enchantment Slots, gain +5% Maximum Resistance to that Skill's element.
            let Enchanted_Skills = 0
            if (paragonVal(nodes_map, 'enchanter')) {
              for (const skill_name of [
                'fire-bolt',
                'incinerate',
                'fireball',
                'flame-shield',
                'hydra',
                'meteor',
                'firewall',
              ]) {
                if (enchantmentVal(nodes_map).has(skill_name)) {
                  Enchanted_Skills++
                }
              }
            }
            Resistance_Cap += 0.05 * Enchanted_Skills
            break
          }
        }
        return Math.min(
          Resistance_Cap,
          Player_Resist - World_Tier_Penalty,
        )
      },
    },
    {
      label: 'Cold Resistance',
      tag: '%',
      category: 'defensive',
      calculation: () => {
        let Resistance_Cap = 0.7
        let Player_Resist =
          aggregationVal(nodes_map, 'cold-resistance') +
          aggregationVal(nodes_map, 'resistance-to-all-elements') +
          statVal(nodes_map, 'Total_Intelligence') * 0.00025

        let World_Tier_Penalty = 0
        if (toggleVal(nodes_map, 'world-tier') == 3) {
          World_Tier_Penalty = 0.25
        }
        if (
          toggleVal(nodes_map, 'world-tier') == 4 ||
          toggleVal(nodes_map, 'world-tier') == 5
        ) {
          World_Tier_Penalty = 0.5
        }

        switch (nodes_map.class) {
          case 'Barbarian':
            break
          case 'Druid':
            // Ancestral Fortitude: You gain +5/10/15% Resistance to All Elements.
            Player_Resist +=
              0.05 * talentVal(nodes_map, 'ancestral-fortitude')
            break
          case 'Necromancer':
            // Sacrifice - You gain 20% Non-Physical Resistance, but you can no longer raise Skeletal Warriors.
            if (
              bookOfTheDeadVal(nodes_map, 'skeletal-warriors')[0] ==
                'defenders' &&
              bookOfTheDeadVal(nodes_map, 'skeletal-warriors')[1] == 3
            ) {
              let Sacrificial_Bonus = 0.2 // Sacrificial Aspect : Your Sacrifice bonuses are increased by {15/25}%.
              if (
                aspectVal(nodes_map, 'sacrificial-aspect').length != 0
              ) {
                Sacrificial_Bonus *=
                  1 + aspectVal(nodes_map, 'sacrificial-aspect')[0]
              }
              let Memento_Mori = 0 // ['memento-mori', 3] Sacrificing both Skeletal Warriors and Skeletal Mages increases their Sacrifice bonuses by {['20%', '40%', '60%']}
              if (
                talentVal(nodes_map, 'memento-mori') > 0 &&
                bookOfTheDeadVal(nodes_map, 'skeletal-warriors')[1] ==
                  3 &&
                bookOfTheDeadVal(nodes_map, 'skeletal-mages')[1] == 3
              ) {
                Memento_Mori +=
                  talentVal(nodes_map, 'memento-mori') * 0.2
              }
              Player_Resist +=
                Sacrificial_Bonus + Sacrificial_Bonus * Memento_Mori
            }
            break
          case 'Rogue':
            break
          case 'Sorcerer': {
            // Enchanter: For each Skill equipped in your Enchantment Slots, gain 13.3% Resistance to that Skill's element.
            let Enchanted_Skills = 0
            if (paragonVal(nodes_map, 'enchanter')) {
              for (const skill_name of [
                'frost-bolt',
                'frozen-orb',
                'ice-shards',
                'ice-armor',
                'frost-nova',
                'ice-blades',
                'blizzard',
              ]) {
                if (enchantmentVal(nodes_map).has(skill_name)) {
                  Enchanted_Skills++
                }
              }
            }
            Resistance_Cap += 0.05 * Enchanted_Skills
            break
          }
        }
        return Math.min(
          Resistance_Cap,
          Player_Resist - World_Tier_Penalty,
        )
      },
    },
    {
      label: 'Lightning Resistance',
      tag: '%',
      category: 'defensive',
      calculation: () => {
        let Resistance_Cap = 0.7
        let Player_Resist =
          aggregationVal(nodes_map, 'lightning-resistance') +
          aggregationVal(nodes_map, 'resistance-to-all-elements') +
          statVal(nodes_map, 'Total_Intelligence') * 0.00025

        let World_Tier_Penalty = 0
        if (toggleVal(nodes_map, 'world-tier') == 3) {
          World_Tier_Penalty = 0.25
        }
        if (
          toggleVal(nodes_map, 'world-tier') == 4 ||
          toggleVal(nodes_map, 'world-tier') == 5
        ) {
          World_Tier_Penalty = 0.5
        }

        switch (nodes_map.class) {
          case 'Barbarian':
            break
          case 'Druid':
            // Ancestral Fortitude: You gain +5/10/15% Resistance to All Elements.
            Player_Resist +=
              0.05 * talentVal(nodes_map, 'ancestral-fortitude')
            break
          case 'Necromancer':
            // Sacrifice - You gain 20% Non-Physical Resistance, but you can no longer raise Skeletal Warriors.
            if (
              bookOfTheDeadVal(nodes_map, 'skeletal-warriors')[0] ==
                'defenders' &&
              bookOfTheDeadVal(nodes_map, 'skeletal-warriors')[1] == 3
            ) {
              let Sacrificial_Bonus = 0.2 // Sacrificial Aspect : Your Sacrifice bonuses are increased by {15/25}%.
              if (
                aspectVal(nodes_map, 'sacrificial-aspect').length != 0
              ) {
                Sacrificial_Bonus *=
                  1 + aspectVal(nodes_map, 'sacrificial-aspect')[0]
              }
              let Memento_Mori = 0 // ['memento-mori', 3] Sacrificing both Skeletal Warriors and Skeletal Mages increases their Sacrifice bonuses by {['20%', '40%', '60%']}
              if (
                talentVal(nodes_map, 'memento-mori') > 0 &&
                bookOfTheDeadVal(nodes_map, 'skeletal-warriors')[1] ==
                  3 &&
                bookOfTheDeadVal(nodes_map, 'skeletal-mages')[1] == 3
              ) {
                Memento_Mori +=
                  talentVal(nodes_map, 'memento-mori') * 0.2
              }
              Player_Resist +=
                Sacrificial_Bonus + Sacrificial_Bonus * Memento_Mori
            }
            break
          case 'Rogue':
            break
          case 'Sorcerer': {
            // Enchanter: For each Skill equipped in your Enchantment Slots, gain 13.3% Resistance to that Skill's element.
            let Enchanted_Skills = 0
            if (paragonVal(nodes_map, 'enchanter')) {
              for (const skill_name of [
                'arc-lash',
                'spark',
                'chain-lightning',
                'charged-bolts',
                'lightning-spear',
                'ball-lightning',
                'teleport',
              ]) {
                if (enchantmentVal(nodes_map).has(skill_name)) {
                  Enchanted_Skills++
                }
              }
            }
            Resistance_Cap += 0.05 * Enchanted_Skills
            break
          }
        }
        return Math.min(
          Resistance_Cap,
          Player_Resist - World_Tier_Penalty,
        )
      },
    },
    {
      label: 'Poison Resistance',
      tag: '%',
      category: 'defensive',
      calculation: () => {
        const Resistance_Cap = 0.7
        let Player_Resist =
          aggregationVal(nodes_map, 'poison-resistance') +
          aggregationVal(nodes_map, 'resistance-to-all-elements') +
          statVal(nodes_map, 'Total_Intelligence') * 0.00025

        // console.log('poison-resistance',aggregationVal(nodes_map, 'poison-resistance'))
        // console.log('resistance-to-all-elements',aggregationVal(nodes_map, 'resistance-to-all-elements'))
        // console.log('Intelligence Resistance', statVal(nodes_map, 'Total_Intelligence') * 0.00025)
        let World_Tier_Penalty = 0
        if (toggleVal(nodes_map, 'world-tier') == 3) {
          World_Tier_Penalty = 0.25
        }
        if (
          toggleVal(nodes_map, 'world-tier') == 4 ||
          toggleVal(nodes_map, 'world-tier') == 5
        ) {
          World_Tier_Penalty = 0.5
        }
        switch (nodes_map.class) {
          case 'Barbarian':
            break
          case 'Druid':
            // Ancestral Fortitude: You gain +5/10/15% Resistance to All Elements.
            Player_Resist +=
              0.05 * talentVal(nodes_map, 'ancestral-fortitude')
            break
          case 'Necromancer':
            // Sacrifice - You gain 20% Non-Physical Resistance, but you can no longer raise Skeletal Warriors.
            if (
              bookOfTheDeadVal(nodes_map, 'skeletal-warriors')[0] ==
                'defenders' &&
              bookOfTheDeadVal(nodes_map, 'skeletal-warriors')[1] == 3
            ) {
              let Sacrificial_Bonus = 0.2 // Sacrificial Aspect : Your Sacrifice bonuses are increased by {15/25}%.
              if (
                aspectVal(nodes_map, 'sacrificial-aspect').length != 0
              ) {
                Sacrificial_Bonus *=
                  1 + aspectVal(nodes_map, 'sacrificial-aspect')[0]
              }
              let Memento_Mori = 0 // ['memento-mori', 3] Sacrificing both Skeletal Warriors and Skeletal Mages increases their Sacrifice bonuses by {['20%', '40%', '60%']}
              if (
                talentVal(nodes_map, 'memento-mori') > 0 &&
                bookOfTheDeadVal(nodes_map, 'skeletal-warriors')[1] ==
                  3 &&
                bookOfTheDeadVal(nodes_map, 'skeletal-mages')[1] == 3
              ) {
                Memento_Mori +=
                  talentVal(nodes_map, 'memento-mori') * 0.2
              }
              Player_Resist +=
                Sacrificial_Bonus + Sacrificial_Bonus * Memento_Mori
            }
            break
          case 'Rogue':
            break
          case 'Sorcerer':
            break
        }
        return Math.min(
          Resistance_Cap,
          Player_Resist - World_Tier_Penalty,
        )
      },
    },
    {
      label: 'Shadow Resistance',
      tag: '%',
      category: 'defensive',
      calculation: () => {
        const Resistance_Cap = 0.7
        let Player_Resist =
          aggregationVal(nodes_map, 'shadow-resistance') +
          aggregationVal(nodes_map, 'resistance-to-all-elements') +
          statVal(nodes_map, 'Total_Intelligence') * 0.00025

        let World_Tier_Penalty = 0
        if (toggleVal(nodes_map, 'world-tier') == 3) {
          World_Tier_Penalty = 0.25
        }
        if (
          toggleVal(nodes_map, 'world-tier') == 4 ||
          toggleVal(nodes_map, 'world-tier') == 5
        ) {
          World_Tier_Penalty = 0.5
        }
        switch (nodes_map.class) {
          case 'Barbarian':
            break
          case 'Druid':
            // Ancestral Fortitude: You gain +5/10/15% Resistance to All Elements.
            Player_Resist +=
              0.05 * talentVal(nodes_map, 'ancestral-fortitude')
            break
          case 'Necromancer':
            // Sacrifice - You gain +20% Non-Physical Resistance, but you can no longer raise Skeletal Warriors.
            if (
              bookOfTheDeadVal(nodes_map, 'skeletal-warriors')[0] ==
                'defenders' &&
              bookOfTheDeadVal(nodes_map, 'skeletal-warriors')[1] == 3
            ) {
              let Sacrificial_Bonus = 0.2 // Sacrificial Aspect : Your Sacrifice bonuses are increased by {15/25}%.
              if (
                aspectVal(nodes_map, 'sacrificial-aspect').length != 0
              ) {
                Sacrificial_Bonus *=
                  1 + aspectVal(nodes_map, 'sacrificial-aspect')[0]
              }
              let Memento_Mori = 0 // ['memento-mori', 3] Sacrificing both Skeletal Warriors and Skeletal Mages increases their Sacrifice bonuses by {['20%', '40%', '60%']}
              if (
                talentVal(nodes_map, 'memento-mori') > 0 &&
                bookOfTheDeadVal(nodes_map, 'skeletal-warriors')[1] ==
                  3 &&
                bookOfTheDeadVal(nodes_map, 'skeletal-mages')[1] == 3
              ) {
                Memento_Mori +=
                  talentVal(nodes_map, 'memento-mori') * 0.2
              }
              Player_Resist +=
                Sacrificial_Bonus + Sacrificial_Bonus * Memento_Mori
            }
            break
          case 'Rogue':
            break
          case 'Sorcerer':
            break
        }
        return Math.min(
          Resistance_Cap,
          Player_Resist - World_Tier_Penalty,
        )
      },
    },
    {
      label: 'All Damage Reduction',
      tag: '%',
      category: 'defensive',
      calculation: () => {
        let Damage_Taken =
          1 - aggregationVal(nodes_map, 'damage-reduction')
        switch (nodes_map.class) {
          case 'Barbarian':
            break
          case 'Druid':
            if (aspectVal(nodes_map, 'insatiable-fury').length > 0) {
              Damage_Taken *=
                1 - 0.03 * talentVal(nodes_map, 'iron-fur')
            }
            break
          case 'Necromancer':
            break
          case 'Rogue':
            break
          case 'Sorcerer':
            break
        }
        return 1 - Damage_Taken
      },
    },
    {
      label: 'DoT Damage Reduction',
      tag: '%',
      category: 'defensive',
      calculation: () => {
        const Damage_Reduction = aggregationVal(
          nodes_map,
          'damage-taken-over-time-reduction',
        )
        switch (nodes_map.class) {
          case 'Barbarian':
            break
          case 'Druid':
            break
          case 'Necromancer':
            break
          case 'Rogue':
            break
          case 'Sorcerer':
            break
        }
        return Damage_Reduction
      },
    },
    {
      label: 'Damage Reduction from Vulnerable',
      tag: '%',
      category: 'defensive',
      calculation: () => {
        const Damage_Reduction = aggregationVal(
          nodes_map,
          'damage-reduction-from-vulnerable-enemies',
        )
        switch (nodes_map.class) {
          case 'Barbarian':
            break
          case 'Druid':
            break
          case 'Necromancer':
            break
          case 'Rogue':
            break
          case 'Sorcerer':
            break
        }
        return Damage_Reduction
      },
    },
    {
      label: 'Damage Reduction from Close',
      tag: '%',
      category: 'defensive',
      calculation: () => {
        let Damage_Taken =
          1 -
          aggregationVal(
            nodes_map,
            'damage-reduction-from-close-enemies',
          )
        switch (nodes_map.class) {
          case 'Barbarian':
            break
          case 'Druid':
            break
          case 'Necromancer':
            // Territorial: You gain 10% Damage Reduction against Close enemies.
            if (paragonVal(nodes_map, 'territorial')) {
              Damage_Taken *= 0.9
            }
            break
          case 'Rogue':
            // Sturdy: You gain {['4%', '8%', '12%',} Close Damage Reduction.
            Damage_Taken *= 1 - talentVal(nodes_map, 'sturdy') * 0.04
            break
          case 'Sorcerer':
            // Territorial: You gain 15% Damage Reduction against Close enemies.
            if (paragonVal(nodes_map, 'territorial')) {
              Damage_Taken *= 0.85
            }
            break
        }
        return 1 - Damage_Taken
      },
    },
    {
      label: 'Damage Reduction from Distant',
      tag: '%',
      category: 'defensive',
      calculation: () => {
        let Damage_Taken =
          1 -
          aggregationVal(
            nodes_map,
            'damage-reduction-from-distant-enemies',
          )
        switch (nodes_map.class) {
          case 'Barbarian':
            // Pit Fighter (Talent up to 3 points): You deal x3% increased damage to Close Enemies and gain 2% Distant Damage Reduction
            if (!toggleVal(nodes_map, 'enemy-distant')) {
              Damage_Taken *=
                1 - 0.02 * talentVal(nodes_map, 'pit-fighter')
            }
            break
          case 'Druid':
            break
          case 'Necromancer':
            break
          case 'Rogue':
            break
          case 'Sorcerer':
            break
        }
        return 1 - Damage_Taken
      },
    },
    {
      label: 'Damage Reduction from Shadow DoT',
      tag: '%',
      category: 'defensive',
      calculation: () => {
        const Damage_Reduction = aggregationVal(
          nodes_map,
          'damage-reduction-from-affected-by-shadow-damage-over-time-enemies',
        )
        switch (nodes_map.class) {
          case 'Barbarian':
            break
          case 'Druid':
            break
          case 'Necromancer':
            break
          case 'Rogue':
            break
          case 'Sorcerer':
            break
        }
        return Damage_Reduction
      },
    },
    {
      label: 'Damage Reduction from Bleeding',
      tag: '%',
      category: 'defensive',
      calculation: () => {
        const Damage_Reduction = aggregationVal(
          nodes_map,
          'damage-reduction-from-bleeding-enemies',
        )
        switch (nodes_map.class) {
          case 'Barbarian':
            break
          case 'Druid':
            break
          case 'Necromancer':
            break
          case 'Rogue':
            break
          case 'Sorcerer':
            break
        }
        return Damage_Reduction
      },
    },
    {
      label: 'Damage Reduction from Burning',
      tag: '%',
      category: 'defensive',
      calculation: () => {
        const Damage_Reduction = aggregationVal(
          nodes_map,
          'damage-reduction-from-burning-enemies',
        )
        switch (nodes_map.class) {
          case 'Barbarian':
            break
          case 'Druid':
            break
          case 'Necromancer':
            break
          case 'Rogue':
            break
          case 'Sorcerer':
            break
        }
        return Damage_Reduction
      },
    },
    {
      label: 'Damage Reduction from Chilled',
      tag: '%',
      category: 'defensive',
      calculation: () => {
        const Damage_Reduction = aggregationVal(
          nodes_map,
          'damage-reduction-from-chilled-enemies',
        )
        switch (nodes_map.class) {
          case 'Barbarian':
            break
          case 'Druid':
            break
          case 'Necromancer':
            break
          case 'Rogue':
            break
          case 'Sorcerer':
            break
        }
        return Damage_Reduction
      },
    },
    {
      label: 'Damage Reduction from Elites',
      tag: '%',
      category: 'defensive',
      calculation: () => {
        let Damage_Taken =
          1 -
          aggregationVal(nodes_map, 'damage-reduction-from-elites')
        switch (nodes_map.class) {
          case 'Barbarian':
            // Martial Vigor: Damage Reduction against Elites is increased by 3% (up to 3 points)
            Damage_Taken *=
              1 - 0.03 * talentVal(nodes_map, 'martial-vigor')
            break
          case 'Druid':
            // Wariness: Take 10% reduced damage from Elites.
            Damage_Taken *=
              1 -
              0.1 *
                Number(
                  spiritBoonVal(nodes_map)['deer'].includes(
                    'wariness',
                  ),
                )
            break
          case 'Necromancer':
            break
          case 'Rogue':
            break
          case 'Sorcerer':
            break
        }
        return 1 - Damage_Taken
      },
    },
    {
      label: 'Damage Reduction from Poisoned',
      tag: '%',
      category: 'defensive',
      calculation: () => {
        const Damage_Reduction = aggregationVal(
          nodes_map,
          'damage-reduction-from-poisoned-enemies',
        )
        switch (nodes_map.class) {
          case 'Barbarian':
            break
          case 'Druid':
            break
          case 'Necromancer':
            break
          case 'Rogue':
            break
          case 'Sorcerer':
            break
        }
        return Damage_Reduction
      },
    },
    {
      label: 'Damage Reduction from Trapped',
      tag: '%',
      category: 'defensive',
      calculation: () => {
        const Damage_Reduction = aggregationVal(
          nodes_map,
          'damage-reduction-from-enemies-affected-by-trap-skills',
        )
        switch (nodes_map.class) {
          case 'Barbarian':
            break
          case 'Druid':
            break
          case 'Necromancer':
            break
          case 'Rogue':
            break
          case 'Sorcerer':
            break
        }
        return Damage_Reduction
      },
    },
    {
      label: 'Damage Reduction while Fortified',
      tag: '%',
      category: 'defensive',
      calculation: () => {
        let Damage_Taken =
          1 -
          aggregationVal(
            nodes_map,
            'damage-reduction-while-fortified',
          )
        switch (nodes_map.class) {
          case 'Barbarian':
            // Defensive Stance (Talent up to 3 points): Increases the Damage Reduction gained while you are fortified by an additional 2%
            Damage_Taken *=
              1 - 0.02 * talentVal(nodes_map, 'defensive-stance')
            break
          case 'Druid':
            break
          case 'Necromancer':
            break
          case 'Rogue':
            break
          case 'Sorcerer':
            break
        }
        return 1 - Damage_Taken
      },
    },
    {
      label: 'Damage Reduction While Healthy',
      tag: '%',
      category: 'defensive',
      calculation: () => {
        const Damage_Reduction = aggregationVal(
          nodes_map,
          'damage-reduction-while-healthy',
        )
        switch (nodes_map.class) {
          case 'Barbarian':
            break
          case 'Druid':
            break
          case 'Necromancer':
            break
          case 'Rogue':
            break
          case 'Sorcerer':
            break
        }
        return Damage_Reduction
      },
    },
    {
      label: 'Damage Reduction while Injured',
      tag: '%',
      category: 'defensive',
      calculation: () => {
        const Damage_Reduction = aggregationVal(
          nodes_map,
          'damage-reduction-while-injured',
        )
        switch (nodes_map.class) {
          case 'Barbarian':
            break
          case 'Druid':
            break
          case 'Necromancer':
            break
          case 'Rogue':
            break
          case 'Sorcerer':
            break
        }
        return Damage_Reduction
      },
    },
    {
      label: 'Class Damage Reduction',
      tag: '%',
      category: 'defensive',
      calculation: () => {
        let Damage_Reduction = 0
        switch (nodes_map.class) {
          case 'Barbarian':
            Damage_Reduction += 0.1
            break
          case 'Druid':
            break
          case 'Necromancer':
            break
          case 'Rogue':
            break
          case 'Sorcerer':
            break
        }
        return Damage_Reduction
      },
    },
    {
      label: 'Maximum Resource',
      tag: '#',
      category: 'utility',
      calculation: () => {
        let Maximum_Resource =
          100 + aggregationVal(nodes_map, 'maximum-resource')

        // melted-heart-of-selig Gain 60 maximum Resource. 75% of incoming damage drains 2 Resource for every 1% of Life you would have lost instead.
        if (
          aspectVal(nodes_map, 'melted-heart-of-selig').length > 0
        ) {
          Maximum_Resource += 60
        }

        switch (nodes_map.class) {
          case 'Barbarian':
            Maximum_Resource += aggregationVal(
              nodes_map,
              'maximum-fury',
            )
            Maximum_Resource +=
              3 * talentVal(nodes_map, 'tempered-fury')
            break
          case 'Druid':
            Maximum_Resource += aggregationVal(
              nodes_map,
              'maximum-spirit',
            )

            // Heart of the Wild: Maximum Spirit is increased by {[3, 6, 9]} .
            Maximum_Resource +=
              talentVal(nodes_map, 'heart-of-the-wild') * 3

            // Gift of the Stag: Gain +20 Maximum Spirit.
            if (
              spiritBoonVal(nodes_map)['deer'].includes(
                'gift-of-the-stag',
              )
            ) {
              Maximum_Resource += 20
            }
            break
          case 'Necromancer':
            Maximum_Resource += aggregationVal(
              nodes_map,
              'maximum-essence',
            )
            // Unliving Energy Your Maximum essence is increased by [3,6,9]
            Maximum_Resource +=
              3 * talentVal(nodes_map, 'unliving-energy')
            // Sacrifice - +15 maximum essence; unable to summon all types of Skeletal Mages.
            if (
              bookOfTheDeadVal(nodes_map, 'skeletal-mages')[0] ==
                'shadow' &&
              bookOfTheDeadVal(nodes_map, 'skeletal-mages')[1] == 3
            ) {
              let sacrificial_aspect = 1 // Sacrificial Aspect : Your Sacrifice bonuses are increased by {15/25}%.
              if (
                aspectVal(nodes_map, 'sacrificial-aspect').length != 0
              ) {
                sacrificial_aspect += aspectVal(
                  nodes_map,
                  'sacrificial-aspect',
                )[0]
              }
              let Memento_Mori = 0 // ['memento-mori', 3] Sacrificing both Skeletal Warriors and Skeletal Mages increases their Sacrifice bonuses by {['20%', '40%', '60%']}
              if (
                talentVal(nodes_map, 'memento-mori') > 0 &&
                bookOfTheDeadVal(nodes_map, 'skeletal-warriors')[1] ==
                  3 &&
                bookOfTheDeadVal(nodes_map, 'skeletal-mages')[1] == 3
              ) {
                Memento_Mori =
                  talentVal(nodes_map, 'memento-mori') * 0.2
              }
              Maximum_Resource +=
                15 * sacrificial_aspect * (1 + Memento_Mori)

              // Requiem Aspect : You gain {3/5} Maximum Essence per active Minion.
              if (
                aspectVal(nodes_map, 'requiem-aspect').length != 0
              ) {
                Maximum_Resource +=
                  aspectVal(nodes_map, 'requiem-aspect')[0] *
                  statVal(nodes_map, 'Max_Number_Of_Minions')
              }
            }
            break
          case 'Rogue':
            Maximum_Resource += aggregationVal(
              nodes_map,
              'maximum-energy',
            )
            break
          case 'Sorcerer':
            Maximum_Resource += aggregationVal(
              nodes_map,
              'maximum-mana',
            )

            // Devastation: Your Maximum Mana is increased by {3/6/9/12/15/18/21/24/27/30}.
            Maximum_Resource +=
              talentVal(nodes_map, 'devastation') * 3
            break
        }
        return Math.round(Maximum_Resource)
      },
    },
    {
      label: 'Resource Cost Reduction',
      tag: '%',
      category: 'utility',
      calculation: () => {
        let Resource_Cost_Reduction = 0
        switch (nodes_map.class) {
          case 'Barbarian':
            Resource_Cost_Reduction += aggregationVal(
              nodes_map,
              'fury-cost-reduction',
            )
            break
          case 'Druid':
            Resource_Cost_Reduction += aggregationVal(
              nodes_map,
              'spirit-cost-reduction',
            )
            break
          case 'Necromancer':
            Resource_Cost_Reduction += aggregationVal(
              nodes_map,
              'essence-cost-reduction',
            )
            break
          case 'Rogue':
            Resource_Cost_Reduction += aggregationVal(
              nodes_map,
              'energy-cost-reduction',
            )
            break
          case 'Sorcerer':
            Resource_Cost_Reduction += aggregationVal(
              nodes_map,
              'mana-cost-reduction',
            )
            break
        }
        return Resource_Cost_Reduction
      },
    },
    {
      label: 'Resource Regeneration',
      tag: '#',
      category: 'utility',
      calculation: () => {
        let Resource_Regeneration = 0
        switch (nodes_map.class) {
          case 'Barbarian':
            break
          case 'Druid':
            break
          case 'Necromancer':
            Resource_Regeneration += 3
            break
          case 'Rogue':
            Resource_Regeneration += 8
            break
          case 'Sorcerer':
            Resource_Regeneration += 10
            break
        }
        return Resource_Regeneration
      },
    },
    {
      label: 'Resource Generation',
      tag: '%',
      category: 'utility',
      calculation: () => {
        const Resource_Generation = aggregationVal(
          nodes_map,
          'resource-generation',
        )
        switch (nodes_map.class) {
          case 'Barbarian':
            break
          case 'Druid':
            break
          case 'Necromancer':
            break
          case 'Rogue':
            break
          case 'Sorcerer':
            break
        }
        return Resource_Generation
      },
    },
    {
      label: 'Movement Speed',
      tag: '%',
      category: 'utility',
      calculation: () => {
        let Movement_Speed =
          1 + aggregationVal(nodes_map, 'movement-speed')

        // Aspect of Slaughter You gain 20% Movement Speed. Lose this bonus for 2.5-5 seconds after taking damage.
        if (aspectVal(nodes_map, 'aspect-of-slaughter').length > 0) {
          Movement_Speed += 0.2
        }

        switch (nodes_map.class) {
          case 'Barbarian':
            Movement_Speed += 0.04 * talentVal(nodes_map, 'swiftness')
            break
          case 'Druid':
            if (aspectVal(nodes_map, 'mad-wolfs-glee').length > 0) {
              Movement_Speed +=
                0.03 * talentVal(nodes_map, 'digitigrade-gait')
            }
            break
          case 'Necromancer':
            break
          case 'Rogue':
            // Haste: While at or above 50% maximum Energy, gain {['5%', '10%', '15%',} increased Movement Speed.
            Movement_Speed += 0.05 * talentVal(nodes_map, 'haste')
            break
          case 'Sorcerer':
            break
        }
        return Movement_Speed
      },
    },
    {
      label: 'Elite Kill Movement Speed',
      tag: '%',
      category: 'utility',
      calculation: () => {
        const Movement_Speed = aggregationVal(
          nodes_map,
          'movement-speed-for-4-seconds-after-killing-an-elite',
        )
        switch (nodes_map.class) {
          case 'Barbarian':
            break
          case 'Druid':
            break
          case 'Necromancer':
            break
          case 'Rogue':
            break
          case 'Sorcerer':
            break
        }
        return Movement_Speed
      },
    },
    {
      label: 'Cooldown Reduction',
      tag: '%',
      category: 'utility',
      calculation: () => {
        const Cooldown_Reduction = aggregationVal(
          nodes_map,
          'cooldown-reduction',
        )
        switch (nodes_map.class) {
          case 'Barbarian':
            break
          case 'Druid':
            break
          case 'Necromancer':
            break
          case 'Rogue':
            break
          case 'Sorcerer':
            break
        }
        return Cooldown_Reduction
      },
    },
    {
      label: 'Lucky Hit Chance Bonus',
      tag: '%',
      category: 'utility',
      calculation: () => {
        let Lucky_Hit_Chance = aggregationVal(
          nodes_map,
          'lucky-hit-chance',
        )
        switch (nodes_map.class) {
          case 'Barbarian':
            break
          case 'Druid':
            break
          case 'Necromancer':
            break
          case 'Rogue':
            break
          case 'Sorcerer':
            // ["Precision_Magic", 3]: Your Lucky Hit Chance is increased by +{5/10/15/20/25/30/35/40/45/50}%.
            Lucky_Hit_Chance +=
              0.05 * talentVal(nodes_map, 'precision-magic')
            break
        }
        return Lucky_Hit_Chance
      },
    },
    {
      label: 'Lucky Hit Chance with Barrier',
      tag: '%',
      category: 'utility',
      calculation: () => {
        const Lucky_Hit_Chance = aggregationVal(
          nodes_map,
          'lucky-hit-chance-while-you-have-a-barrier',
        )
        switch (nodes_map.class) {
          case 'Barbarian':
            break
          case 'Druid':
            break
          case 'Necromancer':
            break
          case 'Rogue':
            break
          case 'Sorcerer':
            break
        }
        return Lucky_Hit_Chance
      },
    },
    {
      label: 'Crowd Control Duration Bonus',
      tag: '%',
      category: 'utility',
      calculation: () => {
        const Crowd_Control_Duration = aggregationVal(
          nodes_map,
          'crowd-control-duration',
        )
        switch (nodes_map.class) {
          case 'Barbarian':
            break
          case 'Druid':
            break
          case 'Necromancer':
            break
          case 'Rogue':
            break
          case 'Sorcerer':
            break
        }
        return Crowd_Control_Duration
      },
    },
    {
      label: 'Control Impaired Duration Reduction',
      tag: '%',
      category: 'utility',
      calculation: () => {
        let Control_Impaired_Duration =
          1 -
          aggregationVal(
            nodes_map,
            'control-impaired-duration-reduction',
          )
        switch (nodes_map.class) {
          case 'Barbarian':
            break
          case 'Druid':
            // Advantageous Beast: Reduce the duration of Control Impairing Effects by 15%.
            if (
              spiritBoonVal(nodes_map)['deer'].includes(
                'advantageous-beast',
              )
            ) {
              Control_Impaired_Duration *= 0.85
            }
            Control_Impaired_Duration *=
              1 - 0.03 * talentVal(nodes_map, 'unrestrained')
            break
          case 'Necromancer':
            break
          case 'Rogue':
            break
          case 'Sorcerer':
            break
        }
        return 1 - Control_Impaired_Duration
      },
    },
    {
      label: 'Slow Duration Reduction',
      tag: '%',
      category: 'utility',
      calculation: () => {
        const Slow_Duration_Reduction = aggregationVal(
          nodes_map,
          'slow-duration-reduction',
        )
        switch (nodes_map.class) {
          case 'Barbarian':
            break
          case 'Druid':
            break
          case 'Necromancer':
            break
          case 'Rogue':
            break
          case 'Sorcerer':
            break
        }
        return Slow_Duration_Reduction
      },
    },
    {
      label: 'Lucky Hit Resource',
      tag: '%',
      category: 'utility',
      calculation: () => {
        const Lucky_Hit = aggregationVal(
          nodes_map,
          'lucky-hit:-up-to-a-5%-chance-to-restore-primary-resource',
        )
        switch (nodes_map.class) {
          case 'Barbarian':
            break
          case 'Druid':
            break
          case 'Necromancer':
            break
          case 'Rogue':
            break
          case 'Sorcerer':
            break
        }
        return Lucky_Hit
      },
    },
    {
      label: 'Lucky Hit Daze',
      tag: '%',
      category: 'utility',
      calculation: () => {
        const Lucky_Hit = aggregationVal(
          nodes_map,
          'lucky-hit-chance-daze',
        )
        switch (nodes_map.class) {
          case 'Barbarian':
            break
          case 'Druid':
            break
          case 'Necromancer':
            break
          case 'Rogue':
            break
          case 'Sorcerer':
            break
        }
        return Lucky_Hit
      },
    },
    // Last we checked, this isn't in the character display.
    // {
    //   label: 'Lucky Hit Fear',
    //   tag: '%',
    //   category: 'utility',
    //   calculation: () => {
    //     const Lucky_Hit = aggregationVal(
    //       nodes_map,
    //       'lucky-hit:-up-to-a-%-chance-to-fear',
    //     )
    //     switch (nodes_map.class) {
    //       case 'Barbarian':
    //         break
    //       case 'Druid':
    //         break
    //       case 'Necromancer':
    //         break
    //       case 'Rogue':
    //         break
    //       case 'Sorcerer':
    //         break
    //     }
    //     return Lucky_Hit
    //   },
    // },
    {
      label: 'Lucky Hit Slow',
      tag: '%',
      category: 'utility',
      calculation: () => {
        const Lucky_Hit = aggregationVal(
          nodes_map,
          'lucky-hit:-up-to-a-%-chance-to-slow',
        )
        switch (nodes_map.class) {
          case 'Barbarian':
            break
          case 'Druid':
            break
          case 'Necromancer':
            break
          case 'Rogue':
            break
          case 'Sorcerer':
            break
        }
        return Lucky_Hit
      },
    },
    {
      label: 'Lucky Hit Immobilize',
      tag: '%',
      category: 'utility',
      calculation: () => {
        const Lucky_Hit = aggregationVal(
          nodes_map,
          'lucky-hit-chance-immobilize',
        )
        switch (nodes_map.class) {
          case 'Barbarian':
            break
          case 'Druid':
            break
          case 'Necromancer':
            break
          case 'Rogue':
            break
          case 'Sorcerer':
            break
        }
        return Lucky_Hit
      },
    },
    {
      label: 'Lucky Hit Stun',
      tag: '%',
      category: 'utility',
      calculation: () => {
        const Lucky_Hit = aggregationVal(
          nodes_map,
          'lucky-hit:-up-to-a-%-chance-to-stun',
        )
        switch (nodes_map.class) {
          case 'Barbarian':
            break
          case 'Druid':
            break
          case 'Necromancer':
            break
          case 'Rogue':
            break
          case 'Sorcerer':
            break
        }
        return Lucky_Hit
      },
    },
    {
      label: 'Level',
      tag: '#',
      category: 'core',
      calculation: () => {
        const Strength = baseStatVal(nodes_map).Level
        switch (nodes_map.class) {
          case 'Barbarian':
            break
          case 'Druid':
            break
          case 'Necromancer':
            break
          case 'Rogue':
            break
          case 'Sorcerer':
            break
        }
        return Strength
      },
    },
    {
      label: 'Strength',
      tag: '#',
      category: 'core',
      calculation: () => {
        const Strength = statVal(nodes_map, 'Total_Strength')
        switch (nodes_map.class) {
          case 'Barbarian':
            break
          case 'Druid':
            break
          case 'Necromancer':
            break
          case 'Rogue':
            break
          case 'Sorcerer':
            break
        }
        return Strength
      },
    },
    {
      label: 'Intelligence',
      tag: '#',
      category: 'core',
      calculation: () => {
        const Intelligence = statVal(nodes_map, 'Total_Intelligence')
        switch (nodes_map.class) {
          case 'Barbarian':
            break
          case 'Druid':
            break
          case 'Necromancer':
            break
          case 'Rogue':
            break
          case 'Sorcerer':
            break
        }
        return Intelligence
      },
    },
    {
      label: 'Willpower',
      tag: '#',
      category: 'core',
      calculation: () => {
        const Willpower = statVal(nodes_map, 'Total_Willpower')
        switch (nodes_map.class) {
          case 'Barbarian':
            break
          case 'Druid':
            break
          case 'Necromancer':
            break
          case 'Rogue':
            break
          case 'Sorcerer':
            break
        }
        return Willpower
      },
    },
    {
      label: 'Dexterity',
      tag: '#',
      category: 'core',
      calculation: () => {
        const Dexterity = statVal(nodes_map, 'Total_Dexterity')
        switch (nodes_map.class) {
          case 'Barbarian':
            break
          case 'Druid':
            break
          case 'Necromancer':
            break
          case 'Rogue':
            break
          case 'Sorcerer':
            break
        }
        return Dexterity
      },
    },
  ]
}

/**
 * Given a set of aggregation nodes, creates an object containing the aggregate stats.
 *
 * @param {NodesMap} The collection of nodes which contain the graph for this character.
 *
 * @returns {AggregateStats} An object containing the aggregate stats.
 */
export function CreateAggregateStats(
  nodes_map: NodesMap,
): AggregateStats {
  const return_map: AggregateStats = {
    offensive: { label: 'Offensive', stats: [] },
    defensive: { label: 'Defensive', stats: [] },
    utility: { label: 'Utility', stats: [] },
    core: { label: 'Core', stats: [] },
  }

  const stat_displays = CreateStatDisplays(nodes_map)
  for (const display_stat of stat_displays) {
    const stat_value = display_stat.calculation(nodes_map)
    const stat: Stat = {
      label: display_stat.label,
      value:
        display_stat.tag == '%'
          ? 100 * Number(stat_value)
          : Number(stat_value),
      tag: display_stat.tag,
    }
    if (stat.value != 0) {
      return_map[
        display_stat.category as keyof typeof return_map
      ].stats.push(stat)
    }
  }
  return return_map
}
