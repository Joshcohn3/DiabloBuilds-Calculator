import { TalentBranchType, TalentTreeDefinition } from './_types'

let index = 0
const iota = () => index++

export const DRUID_TALENT_TREE: TalentTreeDefinition = {
  tiers: [
    {
      id: 'Basic',
      requiredPoints: 0,
      startingIndex: index,
      branches: [
        {
          type: TalentBranchType.ReverseTBranch,
          nodes: [
            {
              index: iota(),
              name: 'Earth Spike',
              image: '/images/talents/druid/EarthSpike.png',
              isUsableSkill: true,
            },
            {
              index: iota(),
              name: 'Enhanced Earth Spike',
              image: '/images/talents/druid/EarthSpike.png',
            },
            {
              index: iota(),
              name: 'Fierce Earth Spike',
              image: '/images/talents/druid/EarthSpike.png',
            },
            {
              index: iota(),
              name: 'Wild Earth Spike',
              image: '/images/talents/druid/EarthSpike.png',
            },
          ],
        },
        {
          type: TalentBranchType.ReverseTBranch,
          nodes: [
            {
              index: iota(),
              name: 'Wind Shear',
              image: '/images/talents/druid/WindShear.png',
              isUsableSkill: true,
            },
            {
              index: iota(),
              name: 'Enhanced Wind Shear',
              image: '/images/talents/druid/WindShear.png',
            },
            {
              index: iota(),
              name: 'Fierce Wind Shear',
              image: '/images/talents/druid/WindShear.png',
            },
            {
              index: iota(),
              name: 'Wild Wind Shear',
              image: '/images/talents/druid/WindShear.png',
            },
          ],
        },
        {
          type: TalentBranchType.ReverseTBranch,
          nodes: [
            {
              index: iota(),
              name: 'Storm Strike',
              image: '/images/talents/druid/StormStrike.png',
              isUsableSkill: true,
            },
            {
              index: iota(),
              name: 'Enhanced Storm Strike',
              image: '/images/talents/druid/StormStrike.png',
            },
            {
              index: iota(),
              name: 'Fierce Storm Strike',
              image: '/images/talents/druid/StormStrike.png',
            },
            {
              index: iota(),
              name: 'Wild Storm Strike',
              image: '/images/talents/druid/StormStrike.png',
            },
          ],
        },
        {
          type: TalentBranchType.ReverseTBranch,
          nodes: [
            {
              index: iota(),
              name: 'Claw',
              image: '/images/talents/druid/Claw.png',
              isUsableSkill: true,
            },
            {
              index: iota(),
              name: 'Enhanced Claw',
              image: '/images/talents/druid/Claw.png',
            },
            {
              index: iota(),
              name: 'Fierce Claw',
              image: '/images/talents/druid/Claw.png',
            },
            {
              index: iota(),
              name: 'Wild Claw',
              image: '/images/talents/druid/Claw.png',
            },
          ],
        },
        {
          type: TalentBranchType.ReverseTBranch,
          nodes: [
            {
              index: iota(),
              name: 'Maul',
              image: '/images/talents/druid/Maul.png',
              isUsableSkill: true,
            },
            {
              index: iota(),
              name: 'Enhanced Maul',
              image: '/images/talents/druid/Maul.png',
            },
            {
              index: iota(),
              name: 'Fierce Maul',
              image: '/images/talents/druid/Maul.png',
            },
            {
              index: iota(),
              name: 'Wild Maul',
              image: '/images/talents/druid/Maul.png',
            },
          ],
        },
      ],
    },
    {
      id: 'Core',
      requiredPoints: 2,
      startingIndex: index,
      branches: [
        {
          type: TalentBranchType.ShortReverseTBranch,
          nodes: [
            {
              index: iota(),
              name: 'Heart of the Wild',
              image: '/images/talents/druid/HeartOfTheWild.png',
            },
            {
              index: iota(),
              name: 'Abundance',
              image: '/images/talents/druid/Abundance.png',
            },
            {
              index: iota(),
              name: 'Wild Impulses',
              image: '/images/talents/druid/WildImpulses.png',
            },
          ],
        },
        {
          type: TalentBranchType.ReverseTBranch,
          nodes: [
            {
              index: iota(),
              name: 'Lightning Storm',
              image: '/images/talents/druid/LightningStorm.png',
              isUsableSkill: true,
            },
            {
              index: iota(),
              name: 'Enhanced Lightning Storm',
              image: '/images/talents/druid/LightningStorm.png',
            },
            {
              index: iota(),
              name: 'Primal Lightning Storm',
              image: '/images/talents/druid/LightningStorm.png',
            },
            {
              index: iota(),
              name: 'Raging Lightning Storm',
              image: '/images/talents/druid/LightningStorm.png',
            },
          ],
        },
        {
          type: TalentBranchType.ReverseTBranch,
          nodes: [
            {
              index: iota(),
              name: 'Tornado',
              image: '/images/talents/druid/Tornado.png',
              isUsableSkill: true,
            },
            {
              index: iota(),
              name: 'Enhanced Tornado',
              image: '/images/talents/druid/Tornado.png',
            },
            {
              index: iota(),
              name: 'Primal Tornado',
              image: '/images/talents/druid/Tornado.png',
            },
            {
              index: iota(),
              name: 'Raging Tornado',
              image: '/images/talents/druid/Tornado.png',
            },
          ],
        },
        {
          type: TalentBranchType.ReverseTBranch,
          nodes: [
            {
              index: iota(),
              name: 'Pulverize',
              image: '/images/talents/druid/Pulverize.png',
              isUsableSkill: true,
            },
            {
              index: iota(),
              name: 'Enhanced Pulverize',
              image: '/images/talents/druid/Pulverize.png',
            },
            {
              index: iota(),
              name: 'Primal Pulverize',
              image: '/images/talents/druid/Pulverize.png',
            },
            {
              index: iota(),
              name: 'Raging Pulverize',
              image: '/images/talents/druid/Pulverize.png',
            },
          ],
        },
        {
          type: TalentBranchType.ReverseTBranch,
          nodes: [
            {
              index: iota(),
              name: 'Shred',
              image: '/images/talents/druid/Shred.png',
              isUsableSkill: true,
            },
            {
              index: iota(),
              name: 'Enhanced Shred',
              image: '/images/talents/druid/Shred.png',
            },
            {
              index: iota(),
              name: 'Primal Shred',
              image: '/images/talents/druid/Shred.png',
            },
            {
              index: iota(),
              name: 'Raging Shred',
              image: '/images/talents/druid/Shred.png',
            },
          ],
        },
        {
          type: TalentBranchType.ShortReverseTBranch,
          nodes: [
            {
              index: iota(),
              name: 'Predatory Instinct',
              image: '/images/talents/druid/PredatoryInstinct.png',
            },
            {
              index: iota(),
              name: 'Digitigrade Gait',
              image: '/images/talents/druid/DigitigradeGait.png',
            },
            {
              index: iota(),
              name: 'Iron Fur',
              image: '/images/talents/druid/IronFur.png',
            },
          ],
        },
        {
          type: TalentBranchType.ReverseTBranch,
          nodes: [
            {
              index: iota(),
              name: 'Landslide',
              image: '/images/talents/druid/Landslide.png',
              isUsableSkill: true,
            },
            {
              index: iota(),
              name: 'Enhanced Landslide',
              image: '/images/talents/druid/Landslide.png',
            },
            {
              index: iota(),
              name: 'Primal Landslide',
              image: '/images/talents/druid/Landslide.png',
            },
            {
              index: iota(),
              name: 'Raging Landslide',
              image: '/images/talents/druid/Landslide.png',
            },
          ],
        },
      ],
    },
    {
      id: 'Defensive',
      requiredPoints: 6,
      startingIndex: index,
      branches: [
        {
          type: TalentBranchType.ReverseTBranch,
          nodes: [
            {
              index: iota(),
              name: 'Earthen Bulwark',
              image: '/images/talents/druid/EarthenBulwark.png',
              isUsableSkill: true,
            },
            {
              index: iota(),
              name: 'Enhanced Earthen Bulwark',
              image: '/images/talents/druid/EarthenBulwark.png',
            },
            {
              index: iota(),
              name: 'Innate Earthen Bulwark',
              image: '/images/talents/druid/EarthenBulwark.png',
            },
            {
              index: iota(),
              name: 'Preserving Earthen Bulwark',
              image: '/images/talents/druid/EarthenBulwark.png',
            },
          ],
        },
        {
          type: TalentBranchType.ReverseTBranch,
          nodes: [
            {
              index: iota(),
              name: 'Cyclone Armor',
              image: '/images/talents/druid/CycloneArmor.png',
              isUsableSkill: true,
            },
            {
              index: iota(),
              name: 'Enhanced Cyclone Armor',
              image: '/images/talents/druid/CycloneArmor.png',
            },
            {
              index: iota(),
              name: 'Innate Cyclone Armor',
              image: '/images/talents/druid/CycloneArmor.png',
            },
            {
              index: iota(),
              name: 'Preserving Cyclone Armor',
              image: '/images/talents/druid/CycloneArmor.png',
            },
          ],
        },
        {
          type: TalentBranchType.ReverseTBranch,
          nodes: [
            {
              index: iota(),
              name: 'Blood Howl',
              image: '/images/talents/druid/BloodHowl.png',
              isUsableSkill: true,
            },
            {
              index: iota(),
              name: 'Enhanced Blood Howl',
              image: '/images/talents/druid/BloodHowl.png',
            },
            {
              index: iota(),
              name: 'Innate Blood Howl',
              image: '/images/talents/druid/BloodHowl.png',
            },
            {
              index: iota(),
              name: 'Preserving Blood Howl',
              image: '/images/talents/druid/BloodHowl.png',
            },
          ],
        },
        {
          type: TalentBranchType.ReverseTBranch,
          nodes: [
            {
              index: iota(),
              name: 'Debilitating Roar',
              image: '/images/talents/druid/DebilitatingRoar.png',
              isUsableSkill: true,
            },
            {
              index: iota(),
              name: 'Enhanced Debilitating Roar',
              image: '/images/talents/druid/DebilitatingRoar.png',
            },
            {
              index: iota(),
              name: 'Innate Debilitating Roar',
              image: '/images/talents/druid/DebilitatingRoar.png',
            },
            {
              index: iota(),
              name: 'Preserving Debilitating Roar',
              image: '/images/talents/druid/DebilitatingRoar.png',
            },
          ],
        },
        {
          type: TalentBranchType.TwoVerticalBranch,
          nodes: [
            {
              index: iota(),
              name: 'Ancestral Fortitude',
              image: '/images/talents/druid/AncestralFortitude.png',
            },
            {
              index: iota(),
              name: 'Vigilance',
              image: '/images/talents/druid/Vigilance.png',
            },
          ],
        },
      ],
    },
    {
      id: 'Companion',
      requiredPoints: 11,
      startingIndex: index,
      branches: [
        {
          type: TalentBranchType.ReverseTBranch,
          nodes: [
            {
              index: iota(),
              name: 'Wolves',
              image: '/images/talents/druid/Wolves.png',
              isUsableSkill: true,
            },
            {
              index: iota(),
              name: 'Enhanced Wolves',
              image: '/images/talents/druid/Wolves.png',
            },
            {
              index: iota(),
              name: 'Brutal Wolves',
              image: '/images/talents/druid/Wolves.png',
            },
            {
              index: iota(),
              name: 'Ferocious Wolves',
              image: '/images/talents/druid/Wolves.png',
            },
          ],
        },
        {
          type: TalentBranchType.SingleNodeBranch,
          nodes: [
            {
              index: iota(),
              name: "Nature's Reach",
              image: '/images/talents/druid/NaturesReach.png',
            },
          ],
        },
        {
          type: TalentBranchType.ReverseTBranch,
          nodes: [
            {
              index: iota(),
              name: 'Poison Creeper',
              image: '/images/talents/druid/PoisonCreeper.png',
              isUsableSkill: true,
            },
            {
              index: iota(),
              name: 'Enhanced Poison Creeper',
              image: '/images/talents/druid/PoisonCreeper.png',
            },
            {
              index: iota(),
              name: 'Brutal Poison Creeper',
              image: '/images/talents/druid/PoisonCreeper.png',
            },
            {
              index: iota(),
              name: 'Ferocious Poison Creeper',
              image: '/images/talents/druid/PoisonCreeper.png',
            },
          ],
        },
        {
          type: TalentBranchType.SingleNodeBranch,
          nodes: [
            {
              index: iota(),
              name: 'Clarity',
              image: '/images/talents/druid/Clarity.png',
            },
          ],
        },
        {
          type: TalentBranchType.ReverseTBranch,
          nodes: [
            {
              index: iota(),
              name: 'Ravens',
              image: '/images/talents/druid/Ravens.png',
              isUsableSkill: true,
            },
            {
              index: iota(),
              name: 'Enhanced Ravens',
              image: '/images/talents/druid/Ravens.png',
            },
            {
              index: iota(),
              name: 'Brutal Ravens',
              image: '/images/talents/druid/Ravens.png',
            },
            {
              index: iota(),
              name: 'Ferocious Ravens',
              image: '/images/talents/druid/Ravens.png',
            },
          ],
        },
        {
          type: TalentBranchType.SingleNodeBranch,
          nodes: [
            {
              index: iota(),
              name: 'Call of the Wild',
              image: '/images/talents/druid/CallOfTheWild.png',
            },
          ],
        },
      ],
    },
    {
      id: 'Wrath',
      requiredPoints: 16,
      startingIndex: index,
      branches: [
        {
          type: TalentBranchType.ReverseHammerWithExtraOnLeftBottomBranch,
          nodes: [
            {
              index: iota(),
              name: 'Elemental Exposure',
              image: '/images/talents/druid/ElementalExposure.png',
            },
            {
              index: iota(),
              name: 'Charged Atmosphere',
              image: '/images/talents/druid/ChargedAtmosphere.png',
            },
            {
              index: iota(),
              name: 'Endless Tempest',
              image: '/images/talents/druid/EndlessTempest.png',
            },
            {
              index: iota(),
              name: 'Electric Shock',
              image: '/images/talents/druid/ElectricShock.png',
            },
            {
              index: iota(),
              name: 'Bad Omen',
              image: '/images/talents/druid/BadOmen.png',
            },
          ],
        },
        {
          type: TalentBranchType.ReverseTBranch,
          nodes: [
            {
              index: iota(),
              name: 'Hurricane',
              image: '/images/talents/druid/Hurricane.png',
              isUsableSkill: true,
            },
            {
              index: iota(),
              name: 'Enhanced Hurricane',
              image: '/images/talents/druid/Hurricane.png',
            },
            {
              index: iota(),
              name: 'Natural Hurricane',
              image: '/images/talents/druid/Hurricane.png',
            },
            {
              index: iota(),
              name: 'Savage Hurricane',
              image: '/images/talents/druid/Hurricane.png',
            },
          ],
        },
        {
          type: TalentBranchType.ReverseTBranch,
          nodes: [
            {
              index: iota(),
              name: 'Boulder',
              image: '/images/talents/druid/Boulder.png',
              isUsableSkill: true,
            },
            {
              index: iota(),
              name: 'Enhanced Boulder',
              image: '/images/talents/druid/Boulder.png',
            },
            {
              index: iota(),
              name: 'Natural Boulder',
              image: '/images/talents/druid/Boulder.png',
            },
            {
              index: iota(),
              name: 'Savage Boulder',
              image: '/images/talents/druid/Boulder.png',
            },
          ],
        },
        {
          type: TalentBranchType.ShortReverseTBranch,
          nodes: [
            {
              index: iota(),
              name: 'Crushing Earth',
              image: '/images/talents/druid/CrushingEarth.png',
            },
            {
              index: iota(),
              name: 'Safeguard',
              image: '/images/talents/druid/Safeguard.png',
            },
            {
              index: iota(),
              name: 'Stone Guard',
              image: '/images/talents/druid/StoneGuard.png',
            },
          ],
        },
        {
          type: TalentBranchType.ReverseTBranch,
          nodes: [
            {
              index: iota(),
              name: 'Rabies',
              image: '/images/talents/druid/Rabies.png',
              isUsableSkill: true,
            },
            {
              index: iota(),
              name: 'Enhanced Rabies',
              image: '/images/talents/druid/Rabies.png',
            },
            {
              index: iota(),
              name: 'Natural Rabies',
              image: '/images/talents/druid/Rabies.png',
            },
            {
              index: iota(),
              name: 'Savage Rabies',
              image: '/images/talents/druid/Rabies.png',
            },
          ],
        },
        {
          type: TalentBranchType.ShortReverseTBranch,
          nodes: [
            {
              index: iota(),
              name: 'Neurotoxin',
              image: '/images/talents/druid/Neurotoxin.png',
            },
            {
              index: iota(),
              name: 'Envenom',
              image: '/images/talents/druid/Envenom.png',
            },
            {
              index: iota(),
              name: 'Toxic Claws',
              image: '/images/talents/druid/ToxicClaws.png',
            },
          ],
        },
        {
          type: TalentBranchType.ReverseTBranch,
          nodes: [
            {
              index: iota(),
              name: 'Trample',
              image: '/images/talents/druid/Trample.png',
              isUsableSkill: true,
            },
            {
              index: iota(),
              name: 'Enhanced Trample',
              image: '/images/talents/druid/Trample.png',
            },
            {
              index: iota(),
              name: 'Natural Trample',
              image: '/images/talents/druid/Trample.png',
            },
            {
              index: iota(),
              name: 'Savage Trample',
              image: '/images/talents/druid/Trample.png',
            },
          ],
        },
        {
          type: TalentBranchType.TwoVerticalBranch,
          nodes: [
            {
              index: iota(),
              name: 'Mending',
              image: '/images/talents/druid/Mending.png',
            },
            {
              index: iota(),
              name: 'Provocation',
              image: '/images/talents/druid/Provocation.png',
            },
          ],
        },
      ],
    },
    {
      id: 'Ultimate',
      requiredPoints: 23,
      startingIndex: index,
      branches: [
        {
          type: TalentBranchType.ThreeVerticalBranch,
          exclusivityGroup: 'ultimates',
          nodes: [
            {
              index: iota(),
              name: 'Petrify',
              image: '/images/talents/druid/Petrify.png',
              isUsableSkill: true,
            },
            {
              index: iota(),
              name: 'Prime Petrify',
              image: '/images/talents/druid/Petrify.png',
            },
            {
              index: iota(),
              name: 'Supreme Petrify',
              image: '/images/talents/druid/Petrify.png',
            },
          ],
        },
        {
          type: TalentBranchType.ReverseHammerBranch,
          nodes: [
            {
              index: iota(),
              name: 'Defiance',
              image: '/images/talents/druid/Defiance.png',
            },
            {
              index: iota(),
              name: 'Circle of Life',
              image: '/images/talents/druid/CircleOfLife.png',
            },
            {
              index: iota(),
              name: 'Natural Disaster',
              image: '/images/talents/druid/NaturalDisaster.png',
            },
            {
              index: iota(),
              name: 'Resonance',
              image: '/images/talents/druid/Resonance.png',
            },
          ],
        },
        {
          type: TalentBranchType.ThreeVerticalBranch,
          exclusivityGroup: 'ultimates',
          nodes: [
            {
              index: iota(),
              name: 'Cataclysm',
              image: '/images/talents/druid/Cataclysm.png',
              isUsableSkill: true,
            },
            {
              index: iota(),
              name: 'Prime Cataclysm',
              image: '/images/talents/druid/Cataclysm.png',
            },
            {
              index: iota(),
              name: 'Supreme Cataclysm',
              image: '/images/talents/druid/Cataclysm.png',
            },
          ],
        },
        {
          type: TalentBranchType.ThreeVerticalBranch,
          exclusivityGroup: 'ultimates',
          nodes: [
            {
              index: iota(),
              name: 'Lacerate',
              image: '/images/talents/druid/Lacerate.png',
              isUsableSkill: true,
            },
            {
              index: iota(),
              name: 'Prime Lacerate',
              image: '/images/talents/druid/Lacerate.png',
            },
            {
              index: iota(),
              name: 'Supreme Lacerate',
              image: '/images/talents/druid/Lacerate.png',
            },
          ],
        },
        {
          type: TalentBranchType.ShortReverseTBranch,
          nodes: [
            {
              index: iota(),
              name: 'Quickshift',
              image: '/images/talents/druid/Quickshift.png',
            },
            {
              index: iota(),
              name: 'Natural Fortitude',
              image: '/images/talents/druid/NaturalFortitude.png',
            },
            {
              index: iota(),
              name: 'Heightened Senses',
              image: '/images/talents/druid/HeightenedSenses.png',
            },
          ],
        },
        {
          type: TalentBranchType.ThreeVerticalBranch,
          exclusivityGroup: 'ultimates',
          nodes: [
            {
              index: iota(),
              name: 'Grizzly Rage',
              image: '/images/talents/druid/GrizzlyRage.png',
              isUsableSkill: true,
            },
            {
              index: iota(),
              name: 'Prime Grizzly Rage',
              image: '/images/talents/druid/GrizzlyRage.png',
            },
            {
              index: iota(),
              name: 'Supreme Grizzly Rage',
              image: '/images/talents/druid/GrizzlyRage.png',
            },
          ],
        },
        {
          type: TalentBranchType.ReverseHammerBranch,
          nodes: [
            {
              index: iota(),
              name: 'Defensive Posture',
              image: '/images/talents/druid/DefensivePosture.png',
            },
            {
              index: iota(),
              name: 'Thick Hide',
              image: '/images/talents/druid/ThickHide.png',
            },
            {
              index: iota(),
              name: "Nature's Resolve",
              image: '/images/talents/druid/NaturesResolve.png',
            },
            {
              index: iota(),
              name: 'Unrestrained',
              image: '/images/talents/druid/Unrestrained.png',
            },
          ],
        },
      ],
    },
    {
      id: 'Key Passive',
      requiredPoints: 33,
      startingIndex: index,
      branches: [
        {
          type: TalentBranchType.KeyPassiveBranch,
          exclusivityGroup: 'keyPassives',
          nodes: [
            {
              index: iota(),
              name: 'Perfect Storm',
              image: '/images/talents/druid/PerfectStorm.png',
            },
          ],
        },
        {
          type: TalentBranchType.KeyPassiveBranch,
          exclusivityGroup: 'keyPassives',
          nodes: [
            {
              index: iota(),
              name: "Nature's Fury",
              image: '/images/talents/druid/NaturesFury.png',
            },
          ],
        },
        {
          type: TalentBranchType.KeyPassiveBranch,
          exclusivityGroup: 'keyPassives',
          nodes: [
            {
              index: iota(),
              name: 'Earthen Might',
              image: '/images/talents/druid/EarthenMight.png',
            },
          ],
        },
        {
          type: TalentBranchType.KeyPassiveBranch,
          exclusivityGroup: 'keyPassives',
          nodes: [
            {
              index: iota(),
              name: 'Lupine Ferocity',
              image: '/images/talents/druid/LupineFerocity.png',
            },
          ],
        },
        {
          type: TalentBranchType.KeyPassiveBranch,
          exclusivityGroup: 'keyPassives',
          nodes: [
            {
              index: iota(),
              name: 'Bestial Rampage',
              image: '/images/talents/druid/BestialRampage.png',
            },
          ],
        },
        {
          type: TalentBranchType.KeyPassiveBranch,
          exclusivityGroup: 'keyPassives',
          nodes: [
            {
              index: iota(),
              name: 'Ursine Strength',
              image: '/images/talents/druid/UrsineStrength.png',
            },
          ],
        },
      ],
    },
  ],
}
