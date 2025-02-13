import { TalentBranchType, TalentTreeDefinition } from './_types'

let index = 0
const iota = () => index++

export const SORCERER_TALENT_TREE: TalentTreeDefinition = {
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
              name: 'Spark',
              image: '/images/talents/sorcerer/Spark.png',
              isUsableSkill: true,
            },
            {
              index: iota(),
              name: 'Enhanced Spark',
              image: '/images/talents/sorcerer/Spark.png',
            },
            {
              index: iota(),
              name: 'Glinting Spark',
              image: '/images/talents/sorcerer/Spark.png',
            },
            {
              index: iota(),
              name: 'Flickering Spark',
              image: '/images/talents/sorcerer/Spark.png',
            },
          ],
        },
        {
          type: TalentBranchType.ReverseTBranch,
          nodes: [
            {
              index: iota(),
              name: 'Frost Bolt',
              image: '/images/talents/sorcerer/FrostBolt.png',
              isUsableSkill: true,
            },
            {
              index: iota(),
              name: 'Enhanced Frost Bolt',
              image: '/images/talents/sorcerer/FrostBolt.png',
            },
            {
              index: iota(),
              name: 'Glinting Frost Bolt',
              image: '/images/talents/sorcerer/FrostBolt.png',
            },
            {
              index: iota(),
              name: 'Flickering Frost Bolt',
              image: '/images/talents/sorcerer/FrostBolt.png',
            },
          ],
        },
        {
          type: TalentBranchType.ReverseTBranch,
          nodes: [
            {
              index: iota(),
              name: 'Fire Bolt',
              image: '/images/talents/sorcerer/FireBolt.png',
              isUsableSkill: true,
            },
            {
              index: iota(),
              name: 'Enhanced Fire Bolt',
              image: '/images/talents/sorcerer/FireBolt.png',
            },
            {
              index: iota(),
              name: 'Glinting Fire Bolt',
              image: '/images/talents/sorcerer/FireBolt.png',
            },
            {
              index: iota(),
              name: 'Flickering Fire Bolt',
              image: '/images/talents/sorcerer/FireBolt.png',
            },
          ],
        },
        {
          type: TalentBranchType.ReverseTBranch,
          nodes: [
            {
              index: iota(),
              name: 'Arc Lash',
              image: '/images/talents/sorcerer/ArcLash.png',
              isUsableSkill: true,
            },
            {
              index: iota(),
              name: 'Enhanced Arc Lash',
              image: '/images/talents/sorcerer/ArcLash.png',
            },
            {
              index: iota(),
              name: 'Glinting Arc Lash',

              image: '/images/talents/sorcerer/ArcLash.png',
            },
            {
              index: iota(),
              name: 'Flickering Arc Lash',
              image: '/images/talents/sorcerer/ArcLash.png',
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
          type: TalentBranchType.ReverseTBranch,
          nodes: [
            {
              index: iota(),
              name: 'Incinerate',
              image: '/images/talents/sorcerer/Incinerate.png',
              isUsableSkill: true,
            },
            {
              index: iota(),
              name: 'Enhanced Incinerate',
              image: '/images/talents/sorcerer/Incinerate.png',
            },
            {
              index: iota(),
              name: 'Destructive Incinerate',
              image: '/images/talents/sorcerer/Incinerate.png',
            },
            {
              index: iota(),
              name: 'Greater Incinerate',
              image: '/images/talents/sorcerer/Incinerate.png',
            },
          ],
        },
        {
          type: TalentBranchType.ReverseTBranch,
          nodes: [
            {
              index: iota(),
              name: 'Fireball',
              image: '/images/talents/sorcerer/Fireball.png',
              isUsableSkill: true,
            },
            {
              index: iota(),
              name: 'Enhanced Fireball',
              image: '/images/talents/sorcerer/Fireball.png',
            },
            {
              index: iota(),
              name: 'Destructive Fireball',
              image: '/images/talents/sorcerer/Fireball.png',
            },
            {
              index: iota(),
              name: 'Greater Fireball',
              image: '/images/talents/sorcerer/Fireball.png',
            },
          ],
        },
        {
          type: TalentBranchType.ReverseTBranch,
          nodes: [
            {
              index: iota(),
              name: 'Frozen Orb',
              image: '/images/talents/sorcerer/FrozenOrb.png',
              isUsableSkill: true,
            },
            {
              index: iota(),
              name: 'Enhanced Frozen Orb',
              image: '/images/talents/sorcerer/FrozenOrb.png',
            },
            {
              index: iota(),
              name: 'Destructive Frozen Orb',
              image: '/images/talents/sorcerer/FrozenOrb.png',
            },
            {
              index: iota(),
              name: 'Greater Frozen Orb',
              image: '/images/talents/sorcerer/FrozenOrb.png',
            },
          ],
        },
        {
          type: TalentBranchType.ReverseTBranch,
          nodes: [
            {
              index: iota(),
              name: 'Ice Shards',
              image: '/images/talents/sorcerer/IceShards.png',
              isUsableSkill: true,
            },
            {
              index: iota(),
              name: 'Enhanced Ice Shards',
              image: '/images/talents/sorcerer/IceShards.png',
            },
            {
              index: iota(),
              name: 'Destructive Ice Shards',
              image: '/images/talents/sorcerer/IceShards.png',
            },
            {
              index: iota(),
              name: 'Greater Ice Shards',
              image: '/images/talents/sorcerer/IceShards.png',
            },
          ],
        },
        {
          type: TalentBranchType.TwoVerticalBranch,
          nodes: [
            {
              index: iota(),
              name: 'Devastation',
              image: '/images/talents/sorcerer/Devastation.png',
            },
            {
              index: iota(),
              name: 'Elemental Dominance',
              image:
                '/images/talents/sorcerer/ElementalDominance.png',
            },
          ],
        },
        {
          type: TalentBranchType.ReverseTBranch,
          nodes: [
            //chain lightning
            {
              index: iota(),
              name: 'Chain Lightning',
              image: '/images/talents/sorcerer/ChainLightning.png',
              isUsableSkill: true,
            },
            {
              index: iota(),
              name: 'Enhanced Chain Lightning',
              image: '/images/talents/sorcerer/ChainLightning.png',
            },
            {
              index: iota(),
              name: 'Destructive Chain Lightning',
              image: '/images/talents/sorcerer/ChainLightning.png',
            },
            {
              index: iota(),
              name: 'Greater Chain Lightning',
              image: '/images/talents/sorcerer/ChainLightning.png',
            },
          ],
        },
        {
          type: TalentBranchType.ReverseTBranch,
          nodes: [
            {
              index: iota(),
              name: 'Charged Bolts',
              image: '/images/talents/sorcerer/ChargedBolts.png',
              isUsableSkill: true,
            },
            {
              index: iota(),
              name: 'Enhanced Charged Bolts',
              image: '/images/talents/sorcerer/ChargedBolts.png',
            },
            {
              index: iota(),
              name: 'Destructive Charged Bolts',
              image: '/images/talents/sorcerer/ChargedBolts.png',
            },
            {
              index: iota(),
              name: 'Greater Charged Bolts',
              image: '/images/talents/sorcerer/ChargedBolts.png',
            },
          ],
        },
        {
          type: TalentBranchType.SingleNodeBranch,
          nodes: [
            {
              index: iota(),
              name: 'Potent Warding',
              image: '/images/talents/sorcerer/PotentWarding.png',
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
              name: 'Flame Shield',
              image: '/images/talents/sorcerer/FlameShield.png',
              isUsableSkill: true,
            },
            {
              index: iota(),
              name: 'Enhanced Flame Shield',
              image: '/images/talents/sorcerer/FlameShield.png',
            },
            {
              index: iota(),
              name: 'Mystical Flame Shield',
              image: '/images/talents/sorcerer/FlameShield.png',
            },
            {
              index: iota(),
              name: 'Shimmering Flame Shield',
              image: '/images/talents/sorcerer/FlameShield.png',
            },
          ],
        },
        {
          type: TalentBranchType.ReverseTBranch,
          nodes: [
            {
              index: iota(),
              name: 'Teleport',
              image: '/images/talents/sorcerer/Teleport.png',
              isUsableSkill: true,
            },
            {
              index: iota(),
              name: 'Enhanced Teleport',
              image: '/images/talents/sorcerer/Teleport.png',
            },
            {
              index: iota(),
              name: 'Mystical Teleport',
              image: '/images/talents/sorcerer/Teleport.png',
            },
            {
              index: iota(),
              name: 'Shimmering Teleport',
              image: '/images/talents/sorcerer/Teleport.png',
            },
          ],
        },
        {
          type: TalentBranchType.SingleNodeBranch,
          nodes: [
            {
              index: iota(),
              name: 'Glass Cannon',
              image: '/images/talents/sorcerer/GlassCannon.png',
            },
          ],
        },
        {
          type: TalentBranchType.ReverseTBranch,
          nodes: [
            {
              index: iota(),
              name: 'Ice Armor',
              image: '/images/talents/sorcerer/IceArmor.png',
              isUsableSkill: true,
            },
            {
              index: iota(),
              name: 'Enhanced Ice Armor',
              image: '/images/talents/sorcerer/IceArmor.png',
            },
            {
              index: iota(),
              name: 'Mystical Ice Armor',
              image: '/images/talents/sorcerer/IceArmor.png',
            },
            {
              index: iota(),
              name: 'Shimmering Ice Armor',
              image: '/images/talents/sorcerer/IceArmor.png',
            },
          ],
        },
        {
          type: TalentBranchType.ReverseTBranch,
          nodes: [
            {
              index: iota(),
              name: 'Frost Nova',
              image: '/images/talents/sorcerer/FrostNova.png',
              isUsableSkill: true,
            },
            {
              index: iota(),
              name: 'Enhanced Frost Nova',
              image: '/images/talents/sorcerer/FrostNova.png',
            },
            {
              index: iota(),
              name: 'Mystical Frost Nova',
              image: '/images/talents/sorcerer/FrostNova.png',
            },
            {
              index: iota(),
              name: 'Shimmering Frost Nova',
              image: '/images/talents/sorcerer/FrostNova.png',
            },
          ],
        },
        {
          type: TalentBranchType.SingleNodeBranch,
          nodes: [
            {
              index: iota(),
              name: 'Elemental Attunement',
              image:
                '/images/talents/sorcerer/ElementalAttunement.png',
            },
          ],
        },
      ],
    },
    {
      id: 'Conjuration',
      requiredPoints: 11,
      startingIndex: index,
      branches: [
        {
          type: TalentBranchType.ReverseTBranch,
          nodes: [
            {
              index: iota(),
              name: 'Hydra',
              image: '/images/talents/sorcerer/Hydra.png',
              isUsableSkill: true,
            },
            {
              index: iota(),
              name: 'Enhanced Hydra',
              image: '/images/talents/sorcerer/Hydra.png',
            },
            {
              index: iota(),
              name: 'Summoned Hydra',
              image: '/images/talents/sorcerer/Hydra.png',
            },
            {
              index: iota(),
              name: 'Invoked Hydra',
              image: '/images/talents/sorcerer/Hydra.png',
            },
          ],
        },
        {
          type: TalentBranchType.SingleNodeBranch,
          nodes: [
            {
              index: iota(),
              name: 'Precision Magic',
              image: '/images/talents/sorcerer/PrecisionMagic.png',
            },
          ],
        },
        {
          type: TalentBranchType.ReverseTBranch,
          nodes: [
            {
              index: iota(),
              name: 'Ice Blades',
              image: '/images/talents/sorcerer/IceBlades.png',
              isUsableSkill: true,
            },
            {
              index: iota(),
              name: 'Enhanced Ice Blades',
              image: '/images/talents/sorcerer/IceBlades.png',
            },
            {
              index: iota(),
              name: 'Summoned Ice Blades',
              image: '/images/talents/sorcerer/IceBlades.png',
            },
            {
              index: iota(),
              name: 'Invoked Ice Blades',
              image: '/images/talents/sorcerer/IceBlades.png',
            },
          ],
        },
        {
          type: TalentBranchType.ReverseTBranch,
          nodes: [
            {
              index: iota(),
              name: 'Lightning Spear',
              image: '/images/talents/sorcerer/LightningSpear.png',
              isUsableSkill: true,
            },
            {
              index: iota(),
              name: 'Enhanced Lightning Spear',
              image: '/images/talents/sorcerer/LightningSpear.png',
            },
            {
              index: iota(),
              name: 'Summoned Lightning Spear',
              image: '/images/talents/sorcerer/LightningSpear.png',
            },
            {
              index: iota(),
              name: 'Invoked Lightning Spear',
              image: '/images/talents/sorcerer/LightningSpear.png',
            },
          ],
        },
        {
          type: TalentBranchType.SingleNodeBranch,
          nodes: [
            {
              index: iota(),
              name: 'Conjuration Mastery',
              image:
                '/images/talents/sorcerer/ConjurationMastery.png',
            },
          ],
        },
        {
          type: TalentBranchType.ShortReverseTBranch,
          nodes: [
            {
              index: iota(),
              name: 'Align the Elements',
              image: '/images/talents/sorcerer/AlignTheElements.png',
            },
            {
              index: iota(),
              name: 'Mana Shield',
              image: '/images/talents/sorcerer/ManaShield.png',
            },
            {
              index: iota(),
              name: 'Protection',
              image: '/images/talents/sorcerer/Protection.png',
            },
          ],
        },
      ],
    },
    {
      id: 'Mastery',
      requiredPoints: 16,
      startingIndex: index,
      branches: [
        {
          type: TalentBranchType.ShortReverseTBranch,
          nodes: [
            {
              index: iota(),
              name: 'Icy Veil',
              image: '/images/talents/sorcerer/IcyVeil.png',
            },
            {
              index: iota(),
              name: 'Cold Front',
              image: '/images/talents/sorcerer/ColdFront.png',
            },
            {
              index: iota(),
              name: 'Snap Freeze',
              image: '/images/talents/sorcerer/SnapFreeze.png',
            },
          ],
        },
        {
          type: TalentBranchType.ReverseTBranch,
          nodes: [
            {
              index: iota(),
              name: 'Blizzard',
              image: '/images/talents/sorcerer/Blizzard.png',
              isUsableSkill: true,
            },
            {
              index: iota(),
              name: 'Enhanced Blizzard',
              image: '/images/talents/sorcerer/Blizzard.png',
            },
            {
              index: iota(),
              name: "Mage's Blizzard",
              image: '/images/talents/sorcerer/Blizzard.png',
            },
            {
              index: iota(),
              name: "Wizard's Blizzard",
              image: '/images/talents/sorcerer/Blizzard.png',
            },
          ],
        },
        {
          type: TalentBranchType.ReverseTBranch,
          nodes: [
            {
              index: iota(),
              name: 'Meteor',
              image: '/images/talents/sorcerer/Meteor.png',
              isUsableSkill: true,
            },
            {
              index: iota(),
              name: 'Enhanced Meteor',
              image: '/images/talents/sorcerer/Meteor.png',
            },
            {
              index: iota(),
              name: "Mage's Meteor",
              image: '/images/talents/sorcerer/Meteor.png',
            },
            {
              index: iota(),
              name: "Wizard's Meteor",
              image: '/images/talents/sorcerer/Meteor.png',
            },
          ],
        },
        {
          type: TalentBranchType.ShortReverseTBranch,
          nodes: [
            {
              index: iota(),
              name: 'Inner Flames',
              image: '/images/talents/sorcerer/InnerFlames.png',
            },
            {
              index: iota(),
              name: 'Devouring Blaze',
              image: '/images/talents/sorcerer/DevouringBlaze.png',
            },
            {
              index: iota(),
              name: 'Crippling Flames',
              image: '/images/talents/sorcerer/CripplingFlames.png',
            },
          ],
        },
        {
          type: TalentBranchType.ReverseTBranch,
          nodes: [
            {
              index: iota(),
              name: 'Firewall',
              image: '/images/talents/sorcerer/Firewall.png',
              isUsableSkill: true,
            },
            {
              index: iota(),
              name: 'Enhanced Firewall',
              image: '/images/talents/sorcerer/Firewall.png',
            },
            {
              index: iota(),
              name: "Mage's Firewall",
              image: '/images/talents/sorcerer/Firewall.png',
            },
            {
              index: iota(),
              name: "Wizard's Firewall",
              image: '/images/talents/sorcerer/Firewall.png',
            },
          ],
        },
        {
          type: TalentBranchType.ReverseTBranch,
          nodes: [
            {
              index: iota(),
              name: 'Ball Lightning',
              image: '/images/talents/sorcerer/BallLightning.png',
              isUsableSkill: true,
            },
            {
              index: iota(),
              name: 'Enhanced Ball Lightning',
              image: '/images/talents/sorcerer/BallLightning.png',
            },
            {
              index: iota(),
              name: "Mage's Ball Lightning",
              image: '/images/talents/sorcerer/BallLightning.png',
            },
            {
              index: iota(),
              name: "Wizard's Ball Lightning",
              image: '/images/talents/sorcerer/BallLightning.png',
            },
          ],
        },
        {
          type: TalentBranchType.ShortReverseTBranch,
          nodes: [
            {
              index: iota(),
              name: 'Static Discharge',
              image: '/images/talents/sorcerer/StaticDischarge.png',
            },
            {
              index: iota(),
              name: 'Shocking Impact',
              image: '/images/talents/sorcerer/ShockingImpact.png',
            },
            {
              index: iota(),
              name: 'Invigorating Conduit',
              image:
                '/images/talents/sorcerer/InvigoratingConduit.png',
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
          type: TalentBranchType.ReverseHammerBranch,
          nodes: [
            {
              index: iota(),
              name: 'Permafrost',
              image: '/images/talents/sorcerer/Permafrost.png',
            },
            {
              index: iota(),
              name: 'Hoarfrost',
              image: '/images/talents/sorcerer/Hoarfrost.png',
            },
            {
              index: iota(),
              name: 'Icy Touch',
              image: '/images/talents/sorcerer/IcyTouch.png',
            },
            {
              index: iota(),
              name: 'Frigid Breeze',
              image: '/images/talents/sorcerer/FrigidBreeze.png',
            },
          ],
        },
        {
          type: TalentBranchType.ThreeVerticalBranch,
          exclusivityGroup: 'ultimate',
          nodes: [
            {
              index: iota(),
              name: 'Deep Freeze',
              image: '/images/talents/sorcerer/DeepFreeze.png',
              isUsableSkill: true,
            },
            {
              index: iota(),
              name: 'Prime Deep Freeze',
              image: '/images/talents/sorcerer/DeepFreeze.png',
            },
            {
              index: iota(),
              name: 'Supreme Deep Freeze',
              image: '/images/talents/sorcerer/DeepFreeze.png',
            },
          ],
        },
        {
          type: TalentBranchType.ThreeVerticalBranch,
          exclusivityGroup: 'ultimate',
          nodes: [
            {
              index: iota(),
              name: 'Inferno',
              image: '/images/talents/sorcerer/Inferno.png',
              isUsableSkill: true,
            },
            {
              index: iota(),
              name: 'Prime Inferno',
              image: '/images/talents/sorcerer/Inferno.png',
            },
            {
              index: iota(),
              name: 'Supreme Inferno',
              image: '/images/talents/sorcerer/Inferno.png',
            },
          ],
        },
        {
          type: TalentBranchType.ReverseHammerBranch,
          nodes: [
            {
              index: iota(),
              name: 'Fiery Surge',
              image: '/images/talents/sorcerer/FierySurge.png',
            },
            {
              index: iota(),
              name: 'Endless Pyre',
              image: '/images/talents/sorcerer/EndlessPyre.png',
            },
            {
              index: iota(),
              name: 'Soulfire',
              image: '/images/talents/sorcerer/Soulfire.png',
            },
            {
              index: iota(),
              name: 'Warmth',
              image: '/images/talents/sorcerer/Warmth.png',
            },
          ],
        },
        {
          type: TalentBranchType.ThreeVerticalBranch,
          exclusivityGroup: 'ultimate',
          nodes: [
            {
              index: iota(),
              name: 'Unstable Currents',
              image: '/images/talents/sorcerer/UnstableCurrents.png',
              isUsableSkill: true,
            },
            {
              index: iota(),
              name: 'Prime Unstable Currents',
              image: '/images/talents/sorcerer/UnstableCurrents.png',
            },
            {
              index: iota(),
              name: 'Supreme Unstable Currents',
              image: '/images/talents/sorcerer/UnstableCurrents.png',
            },
          ],
        },
        {
          type: TalentBranchType.ReverseHammerBranch,
          nodes: [
            {
              index: iota(),
              name: 'Coursing Currents',
              image: '/images/talents/sorcerer/CoursingCurrents.png',
            },
            {
              index: iota(),
              name: 'Conduction',
              image: '/images/talents/sorcerer/Conduction.png',
            },
            {
              index: iota(),
              name: 'Electrocution',
              image: '/images/talents/sorcerer/Electrocution.png',
            },
            {
              index: iota(),
              name: 'Convulsions',
              image: '/images/talents/sorcerer/Convulsions.png',
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
              name: 'Avalanche',
              image: '/images/talents/sorcerer/Avalanche.png',
            },
          ],
        },
        {
          type: TalentBranchType.KeyPassiveBranch,
          exclusivityGroup: 'keyPassives',
          nodes: [
            {
              index: iota(),
              name: 'Shatter',
              image: '/images/talents/sorcerer/Shatter.png',
            },
          ],
        },
        {
          type: TalentBranchType.KeyPassiveBranch,
          exclusivityGroup: 'keyPassives',
          nodes: [
            {
              index: iota(),
              name: 'Overflowing Energy',
              image: '/images/talents/sorcerer/OverflowingEnergy.png',
            },
          ],
        },
        {
          type: TalentBranchType.KeyPassiveBranch,
          exclusivityGroup: 'keyPassives',
          nodes: [
            {
              index: iota(),
              name: "Vyr's Mastery",
              image: '/images/talents/sorcerer/VyrsMastery.png',
            },
          ],
        },
        {
          type: TalentBranchType.KeyPassiveBranch,
          exclusivityGroup: 'keyPassives',
          nodes: [
            {
              index: iota(),
              name: "Esu's Ferocity",
              image: '/images/talents/sorcerer/EsusFerocity.png',
            },
          ],
        },
        {
          type: TalentBranchType.KeyPassiveBranch,
          exclusivityGroup: 'keyPassives',
          nodes: [
            {
              index: iota(),
              name: 'Combustion',
              image: '/images/talents/sorcerer/Combustion.png',
            },
          ],
        },
      ],
    },
  ],
}
