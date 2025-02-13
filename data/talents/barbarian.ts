import { TalentBranchType, TalentTreeDefinition } from './_types'

let index = 0
const iota = () => index++

export const BARBARIAN_TALENT_TREE: TalentTreeDefinition = {
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
              name: 'Lunging Strike',
              image: '/images/talents/barbarian/lunging_strike.png',
              isUsableSkill: true,
            },
            {
              index: iota(),
              name: 'Enhanced Lunging Strike',
              image: '/images/talents/barbarian/lunging_strike.png',
            },
            {
              index: iota(),
              name: 'Battle Lunging Strike',
              image: '/images/talents/barbarian/lunging_strike.png',
            },
            {
              index: iota(),
              name: 'Combat Lunging Strike',
              image: '/images/talents/barbarian/lunging_strike.png',
            },
          ],
        },
        {
          type: TalentBranchType.ReverseTBranch,
          nodes: [
            {
              index: iota(),
              name: 'Bash',
              image: '/images/talents/barbarian/bash.png',
              isUsableSkill: true,
            },
            {
              index: iota(),
              name: 'Enhanced Bash',
              image: '/images/talents/barbarian/bash.png',
            },
            {
              index: iota(),
              name: 'Battle Bash',
              image: '/images/talents/barbarian/bash.png',
            },
            {
              index: iota(),
              name: 'Combat Bash',
              image: '/images/talents/barbarian/bash.png',
            },
          ],
        },
        {
          type: TalentBranchType.ReverseTBranch,
          nodes: [
            {
              index: iota(),
              name: 'Frenzy',
              image: '/images/talents/barbarian/frenzy.png',
              isUsableSkill: true,
            },
            {
              index: iota(),
              name: 'Enhanced Frenzy',
              image: '/images/talents/barbarian/frenzy.png',
            },
            {
              index: iota(),
              name: 'Battle Frenzy',
              image: '/images/talents/barbarian/frenzy.png',
            },
            {
              index: iota(),
              name: 'Combat Frenzy',
              image: '/images/talents/barbarian/frenzy.png',
            },
          ],
        },
        {
          type: TalentBranchType.ReverseTBranch,
          nodes: [
            {
              index: iota(),
              name: 'Flay',
              image: '/images/talents/barbarian/flay.png',
              isUsableSkill: true,
            },
            {
              index: iota(),
              name: 'Enhanced Flay',
              image: '/images/talents/barbarian/flay.png',
            },
            {
              index: iota(),
              name: 'Battle Flay',
              image: '/images/talents/barbarian/flay.png',
            },
            {
              index: iota(),
              name: 'Combat Flay',
              image: '/images/talents/barbarian/flay.png',
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
              name: 'Whirlwind',
              image: '/images/talents/barbarian/whirlwind.png',
              isUsableSkill: true,
            },
            {
              index: iota(),
              name: 'Enhanced Whirlwind',
              image: '/images/talents/barbarian/whirlwind.png',
            },
            {
              index: iota(),
              name: 'Violent Whirlwind',
              image: '/images/talents/barbarian/whirlwind.png',
            },
            {
              index: iota(),
              name: 'Furious Whirlwind',
              image: '/images/talents/barbarian/whirlwind.png',
            },
          ],
        },
        {
          type: TalentBranchType.ReverseTBranch,
          nodes: [
            {
              index: iota(),
              name: 'Hammer of the Ancients',
              image:
                '/images/talents/barbarian/hammer_of_the_ancients.png',
              isUsableSkill: true,
            },
            {
              index: iota(),
              name: 'Enhanced Hammer of the Ancients',
              image:
                '/images/talents/barbarian/hammer_of_the_ancients.png',
            },
            {
              index: iota(),
              name: 'Violent Hammer of the Ancients',
              image:
                '/images/talents/barbarian/hammer_of_the_ancients.png',
            },
            {
              index: iota(),
              name: 'Furious Hammer of the Ancients',
              image:
                '/images/talents/barbarian/hammer_of_the_ancients.png',
            },
          ],
        },
        {
          type: TalentBranchType.SingleNodeBranch,
          nodes: [
            {
              index: iota(),
              name: 'Pressure Point',
              image: '/images/talents/barbarian/pressure_point.png',
            },
          ],
        },
        {
          type: TalentBranchType.ReverseTBranch,
          nodes: [
            {
              index: iota(),
              name: 'Upheaval',
              image: '/images/talents/barbarian/upheaval.png',
              isUsableSkill: true,
            },
            {
              index: iota(),
              name: 'Enhanced Upheaval',
              image: '/images/talents/barbarian/upheaval.png',
            },
            {
              index: iota(),
              name: 'Violent Upheaval',
              image: '/images/talents/barbarian/upheaval.png',
            },
            {
              index: iota(),
              name: 'Furious Upheaval',
              image: '/images/talents/barbarian/upheaval.png',
            },
          ],
        },
        {
          type: TalentBranchType.ReverseTBranch,
          nodes: [
            {
              index: iota(),
              name: 'Double Swing',
              image: '/images/talents/barbarian/double_swing.png',
              isUsableSkill: true,
            },
            {
              index: iota(),
              name: 'Enhanced Double Swing',
              image: '/images/talents/barbarian/double_swing.png',
            },
            {
              index: iota(),
              name: 'Violent Double Swing',
              image: '/images/talents/barbarian/double_swing.png',
            },
            {
              index: iota(),
              name: 'Furious Double Swing',
              image: '/images/talents/barbarian/double_swing.png',
            },
          ],
        },
        {
          type: TalentBranchType.SingleNodeBranch,
          nodes: [
            {
              index: iota(),
              name: 'Endless Fury',
              image: '/images/talents/barbarian/endless_fury.png',
            },
          ],
        },
        {
          type: TalentBranchType.ReverseTBranch,
          nodes: [
            {
              index: iota(),
              name: 'Rend',
              image: '/images/talents/barbarian/rend.png',
              isUsableSkill: true,
            },
            {
              index: iota(),
              name: 'Enhanced Rend',
              image: '/images/talents/barbarian/rend.png',
            },
            {
              index: iota(),
              name: 'Violent Rend',
              image: '/images/talents/barbarian/rend.png',
            },
            {
              index: iota(),
              name: 'Furious Rend',
              image: '/images/talents/barbarian/rend.png',
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
              name: 'Ground Stomp',
              image: '/images/talents/barbarian/ground_stomp.png',
              isUsableSkill: true,
            },
            {
              index: iota(),
              name: 'Enhanced Ground Stomp',
              image: '/images/talents/barbarian/ground_stomp.png',
            },
            {
              index: iota(),
              name: 'Tactical Ground Stomp',
              image: '/images/talents/barbarian/ground_stomp.png',
            },
            {
              index: iota(),
              name: 'Strategic Ground Stomp',
              image: '/images/talents/barbarian/ground_stomp.png',
            },
          ],
        },
        {
          type: TalentBranchType.TwoVerticalBranch,
          nodes: [
            {
              index: iota(),
              name: 'Imposing Presence',
              image:
                '/images/talents/barbarian/imposing_presence.png',
            },
            {
              index: iota(),
              name: 'Martial Vigor',
              image: '/images/talents/barbarian/martial_vigor.png',
            },
          ],
        },
        {
          type: TalentBranchType.ReverseTBranch,
          nodes: [
            {
              index: iota(),
              name: 'Rallying Cry',
              image: '/images/talents/barbarian/rallying_cry.png',
              isUsableSkill: true,
            },
            {
              index: iota(),
              name: 'Enhanced Rallying Cry',
              image: '/images/talents/barbarian/rallying_cry.png',
            },
            {
              index: iota(),
              name: 'Tactical Rallying Cry',
              image: '/images/talents/barbarian/rallying_cry.png',
            },
            {
              index: iota(),
              name: 'Strategic Rallying Cry',
              image: '/images/talents/barbarian/rallying_cry.png',
            },
          ],
        },
        {
          type: TalentBranchType.ReverseTBranch,
          nodes: [
            {
              index: iota(),
              name: 'Iron Skin',
              image: '/images/talents/barbarian/iron_skin.png',
              isUsableSkill: true,
            },
            {
              index: iota(),
              name: 'Enhanced Iron Skin',
              image: '/images/talents/barbarian/iron_skin.png',
            },
            {
              index: iota(),
              name: 'Tactical Iron Skin',
              image: '/images/talents/barbarian/iron_skin.png',
            },
            {
              index: iota(),
              name: 'Strategic Iron Skin',
              image: '/images/talents/barbarian/iron_skin.png',
            },
          ],
        },
        {
          type: TalentBranchType.TwoVerticalBranch,
          nodes: [
            {
              index: iota(),
              name: 'Outburst',
              image: '/images/talents/barbarian/outburst.png',
            },
            {
              index: iota(),
              name: 'Tough as Nails',
              image: '/images/talents/barbarian/tough_as_nails.png',
            },
          ],
        },
        {
          type: TalentBranchType.ReverseTBranch,
          nodes: [
            {
              index: iota(),
              name: 'Challenging Shout',
              image:
                '/images/talents/barbarian/challenging_shout.png',
              isUsableSkill: true,
            },
            {
              index: iota(),
              name: 'Enhanced Challenging Shout',
              image:
                '/images/talents/barbarian/challenging_shout.png',
            },
            {
              index: iota(),
              name: 'Tactical Challenging Shout',
              image:
                '/images/talents/barbarian/challenging_shout.png',
            },
            {
              index: iota(),
              name: 'Strategic Challenging Shout',
              image:
                '/images/talents/barbarian/challenging_shout.png',
            },
          ],
        },
      ],
    },
    {
      id: 'Brawling',
      requiredPoints: 11,
      startingIndex: index,
      branches: [
        {
          type: TalentBranchType.ReverseTBranch,
          nodes: [
            {
              index: iota(),
              name: 'Kick',
              image: '/images/talents/barbarian/kick.png',
              isUsableSkill: true,
            },
            {
              index: iota(),
              name: 'Enhanced Kick',
              image: '/images/talents/barbarian/kick.png',
            },
            {
              index: iota(),
              name: 'Mighty Kick',
              image: '/images/talents/barbarian/kick.png',
            },
            {
              index: iota(),
              name: 'Power Kick',
              image: '/images/talents/barbarian/kick.png',
            },
          ],
        },
        {
          type: TalentBranchType.ReverseTBranch,
          nodes: [
            {
              index: iota(),
              name: 'War Cry',
              image: '/images/talents/barbarian/war_cry.png',
              isUsableSkill: true,
            },
            {
              index: iota(),
              name: 'Enhanced War Cry',
              image: '/images/talents/barbarian/war_cry.png',
            },
            {
              index: iota(),
              name: 'Mighty War Cry',
              image: '/images/talents/barbarian/war_cry.png',
            },
            {
              index: iota(),
              name: 'Power War Cry',
              image: '/images/talents/barbarian/war_cry.png',
            },
          ],
        },
        {
          type: TalentBranchType.ShortReverseTBranch,
          nodes: [
            {
              index: iota(),
              name: 'Booming Voice',
              image: '/images/talents/barbarian/booming_voice.png',
            },
            {
              index: iota(),
              name: 'Raid Leader',
              image: '/images/talents/barbarian/raid_leader.png',
            },
            {
              index: iota(),
              name: 'Guttural Yell',
              image: '/images/talents/barbarian/guttural_yell.png',
            },
          ],
        },
        {
          type: TalentBranchType.ReverseTBranch,
          nodes: [
            {
              index: iota(),
              name: 'Charge',
              image: '/images/talents/barbarian/charge.png',
              isUsableSkill: true,
            },
            {
              index: iota(),
              name: 'Enhanced Charge',
              image: '/images/talents/barbarian/charge.png',
            },
            {
              index: iota(),
              name: 'Mighty Charge',
              image: '/images/talents/barbarian/charge.png',
            },
            {
              index: iota(),
              name: 'Power Charge',
              image: '/images/talents/barbarian/charge.png',
            },
          ],
        },
        {
          type: TalentBranchType.ReverseTBranch,
          nodes: [
            {
              index: iota(),
              name: 'Leap',
              image: '/images/talents/barbarian/leap.png',
              isUsableSkill: true,
            },
            {
              index: iota(),
              name: 'Enhanced Leap',
              image: '/images/talents/barbarian/leap.png',
            },
            {
              index: iota(),
              name: 'Mighty Leap',
              image: '/images/talents/barbarian/leap.png',
            },
            {
              index: iota(),
              name: 'Power Leap',
              image: '/images/talents/barbarian/leap.png',
            },
          ],
        },
        {
          type: TalentBranchType.ShortReverseTBranch,
          nodes: [
            {
              index: iota(),
              name: 'Aggressive Resistance',
              image:
                '/images/talents/barbarian/aggressive_resistance.png',
            },
            {
              index: iota(),
              name: 'Battle Fervor',
              image: '/images/talents/barbarian/battle_fervor.png',
            },
            {
              index: iota(),
              name: 'Prolific Fury',
              image: '/images/talents/barbarian/prolific_fury.png',
            },
          ],
        },
        {
          type: TalentBranchType.TwoVerticalBranch,
          nodes: [
            {
              index: iota(),
              name: 'Swiftness',
              image: '/images/talents/barbarian/swiftness.png',
            },
            {
              index: iota(),
              name: 'Quick Impulses',
              image: '/images/talents/barbarian/quick_impulses.png',
            },
          ],
        },
      ],
    },
    {
      id: 'Weapon Mastery',
      requiredPoints: 16,
      startingIndex: index,
      branches: [
        {
          type: TalentBranchType.ReverseHammerBranch,
          nodes: [
            {
              index: iota(),
              name: 'Pit Fighter',
              image: '/images/talents/barbarian/pit_fighter.png',
            },
            {
              index: iota(),
              name: 'No Mercy',
              image: '/images/talents/barbarian/no_mercy.png',
            },
            {
              index: iota(),
              name: 'Slaying Strike',
              image: '/images/talents/barbarian/slaying_strike.png',
            },
            {
              index: iota(),
              name: 'Expose Vulnerability',
              image:
                '/images/talents/barbarian/expose_vulnerability.png',
            },
          ],
        },
        {
          type: TalentBranchType.ReverseTBranch,
          nodes: [
            {
              index: iota(),
              name: 'Rupture',
              image: '/images/talents/barbarian/rupture.png',
              isUsableSkill: true,
            },
            {
              index: iota(),
              name: 'Enhanced Rupture',
              image: '/images/talents/barbarian/rupture.png',
            },
            {
              index: iota(),
              name: "Warrior's Rupture",
              image: '/images/talents/barbarian/rupture.png',
            },
            {
              index: iota(),
              name: "Fighter's Rupture",
              image: '/images/talents/barbarian/rupture.png',
            },
          ],
        },
        {
          type: TalentBranchType.TwoVerticalBranch,
          nodes: [
            {
              index: iota(),
              name: 'Hamstring',
              image: '/images/talents/barbarian/hamstring.png',
            },
            {
              index: iota(),
              name: 'Cut to the Bone',
              image: '/images/talents/barbarian/cut_to_the_bone.png',
            },
          ],
        },
        {
          type: TalentBranchType.ReverseTBranch,
          nodes: [
            {
              index: iota(),
              name: 'Steel Grasp',
              image: '/images/talents/barbarian/steel_grasp.png',
              isUsableSkill: true,
            },
            {
              index: iota(),
              name: 'Enhanced Steel Grasp',
              image: '/images/talents/barbarian/steel_grasp.png',
            },
            {
              index: iota(),
              name: "Warrior's Steel Grasp",
              image: '/images/talents/barbarian/steel_grasp.png',
            },
            {
              index: iota(),
              name: "Fighter's Steel Grasp",
              image: '/images/talents/barbarian/steel_grasp.png',
            },
          ],
        },
        {
          type: TalentBranchType.ShortReverseTBranch,
          nodes: [
            {
              index: iota(),
              name: 'Thick Skin',
              image: '/images/talents/barbarian/thick_skin.png',
            },
            {
              index: iota(),
              name: 'Defensive Stance',
              image: '/images/talents/barbarian/defensive_stance.png',
            },
            {
              index: iota(),
              name: 'Counteroffensive',
              image: '/images/talents/barbarian/counteroffensive.png',
            },
          ],
        },
        {
          type: TalentBranchType.ReverseTBranch,
          nodes: [
            {
              index: iota(),
              name: 'Death Blow',
              image: '/images/talents/barbarian/death_blow.png',
              isUsableSkill: true,
            },
            {
              index: iota(),
              name: 'Enhanced Death Blow',
              image: '/images/talents/barbarian/death_blow.png',
            },
            {
              index: iota(),
              name: "Warrior's Death Blow",
              image: '/images/talents/barbarian/death_blow.png',
            },
            {
              index: iota(),
              name: "Fighter's Death Blow",
              image: '/images/talents/barbarian/death_blow.png',
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
              name: 'Call of the Ancients',
              image:
                '/images/talents/barbarian/call_of_the_ancients.png',
              isUsableSkill: true,
            },
            {
              index: iota(),
              name: 'Prime Call of the Ancients',
              image:
                '/images/talents/barbarian/call_of_the_ancients.png',
            },
            {
              index: iota(),
              name: 'Supreme Call of the Ancients',
              image:
                '/images/talents/barbarian/call_of_the_ancients.png',
            },
          ],
        },
        {
          type: TalentBranchType.SingleNodeBranch,
          nodes: [
            {
              index: iota(),
              name: 'Duelist',
              image: '/images/talents/barbarian/duelist.png',
            },
          ],
        },
        {
          type: TalentBranchType.ThreeVerticalBranch,
          exclusivityGroup: 'ultimates',
          nodes: [
            {
              index: iota(),
              name: 'Iron Maelstrom',
              image: '/images/talents/barbarian/iron_maelstrom.png',
              isUsableSkill: true,
            },
            {
              index: iota(),
              name: 'Prime Iron Maelstrom',
              image: '/images/talents/barbarian/iron_maelstrom.png',
            },
            {
              index: iota(),
              name: 'Supreme Iron Maelstrom',
              image: '/images/talents/barbarian/iron_maelstrom.png',
            },
          ],
        },
        {
          type: TalentBranchType.ShortReverseTBranch,
          nodes: [
            {
              index: iota(),
              name: 'Tempered Fury',
              image: '/images/talents/barbarian/tempered_fury.png',
            },
            {
              index: iota(),
              name: 'Furious Impulse',
              image: '/images/talents/barbarian/furious_impulse.png',
            },
            {
              index: iota(),
              name: 'Invigorating Fury',
              image:
                '/images/talents/barbarian/invigorating_fury.png',
            },
          ],
        },
        {
          type: TalentBranchType.ThreeVerticalBranch,
          exclusivityGroup: 'ultimates',
          nodes: [
            {
              index: iota(),
              name: 'Wrath of the Berserker',
              image:
                '/images/talents/barbarian/wrath_of_the_berserker.png',
              isUsableSkill: true,
            },
            {
              index: iota(),
              name: 'Prime Wrath of the Berserker',
              image:
                '/images/talents/barbarian/wrath_of_the_berserker.png',
            },
            {
              index: iota(),
              name: 'Supreme Wrath of the Berserker',
              image:
                '/images/talents/barbarian/wrath_of_the_berserker.png',
            },
          ],
        },
        {
          type: TalentBranchType.DoubleLBranch,
          nodes: [
            {
              index: iota(),
              name: 'Heavy Handed',
              image: '/images/talents/barbarian/heavy_handed.png',
            },
            {
              index: iota(),
              name: 'Wallop',
              image: '/images/talents/barbarian/wallop.png',
            },
            {
              index: iota(),
              name: 'Brute Force',
              image: '/images/talents/barbarian/brute_force.png',
            },
            {
              index: iota(),
              name: 'Concussion',
              image: '/images/talents/barbarian/concussion.png',
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
              name: 'Unconstrained',
              image: '/images/talents/barbarian/unconstrained.png',
            },
          ],
        },
        {
          type: TalentBranchType.KeyPassiveBranch,
          exclusivityGroup: 'keyPassives',
          nodes: [
            {
              index: iota(),
              name: 'Walking Arsenal',
              image: '/images/talents/barbarian/walking_arsenal.png',
            },
          ],
        },
        {
          type: TalentBranchType.KeyPassiveBranch,
          exclusivityGroup: 'keyPassives',
          nodes: [
            {
              index: iota(),
              name: 'Unbridled Rage',
              image: '/images/talents/barbarian/unbridled_rage.png',
            },
          ],
        },
        {
          type: TalentBranchType.KeyPassiveBranch,
          exclusivityGroup: 'keyPassives',
          nodes: [
            {
              index: iota(),
              name: 'Gushing Wounds',
              image: '/images/talents/barbarian/gushing_wounds.png',
            },
          ],
        },
      ],
    },
  ],
}
