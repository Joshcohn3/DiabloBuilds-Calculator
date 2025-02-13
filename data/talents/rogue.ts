import { TalentBranchType, TalentTreeDefinition } from './_types'

let index = 0
const iota = () => index++

export const ROGUE_TALENT_TREE: TalentTreeDefinition = {
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
              name: 'Invigorating Strike',
              image: '/images/talents/rogue/InvigoratingStrike.png',
              isUsableSkill: true,
            },
            {
              index: iota(),
              name: 'Enhanced Invigorating Strike',
              image: '/images/talents/rogue/InvigoratingStrike.png',
            },
            {
              index: iota(),
              name: 'Fundamental Invigorating Strike',
              image: '/images/talents/rogue/InvigoratingStrike.png',
            },
            {
              index: iota(),
              name: 'Primary Invigorating Strike',
              image: '/images/talents/rogue/InvigoratingStrike.png',
            },
          ],
        },
        {
          type: TalentBranchType.ReverseTBranch,
          nodes: [
            {
              index: iota(),
              name: 'Blade Shift',
              image: '/images/talents/rogue/BladeShift.png',
              isUsableSkill: true,
            },
            {
              index: iota(),
              name: 'Enhanced Blade Shift',
              image: '/images/talents/rogue/BladeShift.png',
            },
            {
              index: iota(),
              name: 'Fundamental Blade Shift',
              image: '/images/talents/rogue/BladeShift.png',
            },
            {
              index: iota(),
              name: 'Primary Blade Shift',
              image: '/images/talents/rogue/BladeShift.png',
            },
          ],
        },
        {
          type: TalentBranchType.ReverseTBranch,
          nodes: [
            {
              index: iota(),
              name: 'Puncture',
              image: '/images/talents/rogue/Puncture.png',
              isUsableSkill: true,
            },
            {
              index: iota(),
              name: 'Enhanced Puncture',
              image: '/images/talents/rogue/Puncture.png',
            },
            {
              index: iota(),
              name: 'Fundamental Puncture',
              image: '/images/talents/rogue/Puncture.png',
            },
            {
              index: iota(),
              name: 'Primary Puncture',
              image: '/images/talents/rogue/Puncture.png',
            },
          ],
        },
        {
          type: TalentBranchType.ReverseTBranch,
          nodes: [
            {
              index: iota(),
              name: 'Heartseeker',
              image: '/images/talents/rogue/Heartseeker.png',
              isUsableSkill: true,
            },
            {
              index: iota(),
              name: 'Enhanced Heartseeker',
              image: '/images/talents/rogue/Heartseeker.png',
            },
            {
              index: iota(),
              name: 'Fundamental Heartseeker',
              image: '/images/talents/rogue/Heartseeker.png',
            },
            {
              index: iota(),
              name: 'Primary Heartseeker',
              image: '/images/talents/rogue/Heartseeker.png',
            },
          ],
        },
        {
          type: TalentBranchType.ReverseTBranch,
          nodes: [
            {
              index: iota(),
              name: 'Forceful Arrow',
              image: '/images/talents/rogue/ForcefulArrow.png',
              isUsableSkill: true,
            },
            {
              index: iota(),
              name: 'Enhanced Forceful Arrow',
              image: '/images/talents/rogue/ForcefulArrow.png',
            },
            {
              index: iota(),
              name: 'Fundamental Forceful Arrow',
              image: '/images/talents/rogue/ForcefulArrow.png',
            },
            {
              index: iota(),
              name: 'Primary Forceful Arrow',
              image: '/images/talents/rogue/ForcefulArrow.png',
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
              name: 'Barrage',
              image: '/images/talents/rogue/Barrage.png',
              isUsableSkill: true,
            },
            {
              index: iota(),
              name: 'Enhanced Barrage',
              image: '/images/talents/rogue/Barrage.png',
            },
            {
              index: iota(),
              name: 'Improved Barrage',
              image: '/images/talents/rogue/Barrage.png',
            },
            {
              index: iota(),
              name: 'Advanced Barrage',
              image: '/images/talents/rogue/Barrage.png',
            },
          ],
        },
        {
          type: TalentBranchType.ReverseTBranch,
          nodes: [
            {
              index: iota(),
              name: 'Twisting Blades',
              image: '/images/talents/rogue/TwistingBlades.png',
              isUsableSkill: true,
            },
            {
              index: iota(),
              name: 'Enhanced Twisting Blades',
              image: '/images/talents/rogue/TwistingBlades.png',
            },
            {
              index: iota(),
              name: 'Improved Twisting Blades',
              image: '/images/talents/rogue/TwistingBlades.png',
            },
            {
              index: iota(),
              name: 'Advanced Twisting Blades',
              image: '/images/talents/rogue/TwistingBlades.png',
            },
          ],
        },
        {
          type: TalentBranchType.TwoVerticalBranch,
          nodes: [
            {
              index: iota(),
              name: 'Sturdy',
              image: '/images/talents/rogue/Sturdy.png',
            },
            {
              index: iota(),
              name: 'Siphoning Strikes',
              image: '/images/talents/rogue/SiphoningStrikes.png',
            },
          ],
        },
        {
          type: TalentBranchType.ReverseTBranch,
          nodes: [
            {
              index: iota(),
              name: 'Flurry',
              image: '/images/talents/rogue/Flurry.png',
              isUsableSkill: true,
            },
            {
              index: iota(),
              name: 'Enhanced Flurry',
              image: '/images/talents/rogue/Flurry.png',
            },
            {
              index: iota(),
              name: 'Improved Flurry',
              image: '/images/talents/rogue/Flurry.png',
            },
            {
              index: iota(),
              name: 'Advanced Flurry',
              image: '/images/talents/rogue/Flurry.png',
            },
          ],
        },
        {
          type: TalentBranchType.ReverseTBranch,
          nodes: [
            {
              index: iota(),
              name: 'Penetrating Shot',
              image: '/images/talents/rogue/PenetratingShot.png',
              isUsableSkill: true,
            },
            {
              index: iota(),
              name: 'Enhanced Penetrating Shot',
              image: '/images/talents/rogue/PenetratingShot.png',
            },
            {
              index: iota(),
              name: 'Improved Penetrating Shot',
              image: '/images/talents/rogue/PenetratingShot.png',
            },
            {
              index: iota(),
              name: 'Advanced Penetrating Shot',
              image: '/images/talents/rogue/PenetratingShot.png',
            },
          ],
        },
        {
          type: TalentBranchType.SingleNodeBranch,
          nodes: [
            {
              index: iota(),
              name: 'Stutter Step',
              image: '/images/talents/rogue/StutterStep.png',
            },
          ],
        },
        {
          type: TalentBranchType.ReverseTBranch,
          nodes: [
            {
              index: iota(),
              name: 'Rapid Fire',
              image: '/images/talents/rogue/RapidFire.png',
              isUsableSkill: true,
            },
            {
              index: iota(),
              name: 'Enhanced Rapid Fire',
              image: '/images/talents/rogue/RapidFire.png',
            },
            {
              index: iota(),
              name: 'Improved Rapid Fire',
              image: '/images/talents/rogue/RapidFire.png',
            },
            {
              index: iota(),
              name: 'Advanced Rapid Fire',
              image: '/images/talents/rogue/RapidFire.png',
            },
          ],
        },
      ],
    },
    {
      id: 'Agility',
      requiredPoints: 6,
      startingIndex: index,
      branches: [
        {
          type: TalentBranchType.ReverseTBranch,
          nodes: [
            {
              index: iota(),
              name: 'Shadow Step',
              image: '/images/talents/rogue/ShadowStep.png',
              isUsableSkill: true,
            },
            {
              index: iota(),
              name: 'Enhanced Shadow Step',
              image: '/images/talents/rogue/ShadowStep.png',
            },
            {
              index: iota(),
              name: 'Methodical Shadow Step',
              image: '/images/talents/rogue/ShadowStep.png',
            },
            {
              index: iota(),
              name: 'Disciplined Shadow Step',
              image: '/images/talents/rogue/ShadowStep.png',
            },
          ],
        },
        {
          type: TalentBranchType.TwoVerticalBranch,
          nodes: [
            {
              index: iota(),
              name: 'Rugged',
              image: '/images/talents/rogue/Rugged.png',
            },
            {
              index: iota(),
              name: 'Reactive Defense',
              image: '/images/talents/rogue/ReactiveDefense.png',
            },
          ],
        },
        {
          type: TalentBranchType.ReverseTBranch,
          nodes: [
            {
              index: iota(),
              name: 'Caltrops',
              image: '/images/talents/rogue/Caltrops.png',
              isUsableSkill: true,
            },
            {
              index: iota(),
              name: 'Enhanced Caltrops',
              image: '/images/talents/rogue/Caltrops.png',
            },
            {
              index: iota(),
              name: 'Methodical Caltrops',
              image: '/images/talents/rogue/Caltrops.png',
            },
            {
              index: iota(),
              name: 'Disciplined Caltrops',
              image: '/images/talents/rogue/Caltrops.png',
            },
          ],
        },
        {
          type: TalentBranchType.UBranch,
          nodes: [
            {
              index: iota(),
              name: 'Concussive',
              image: '/images/talents/rogue/Concussive.png',
            },
            {
              index: iota(),
              name: 'Rapid Gambits',
              image: '/images/talents/rogue/RapidGambits.png',
            },
            {
              index: iota(),
              name: 'Trick Attacks',
              image: '/images/talents/rogue/TrickAttacks.png',
            },
          ],
        },
        {
          type: TalentBranchType.ReverseTBranch,
          nodes: [
            {
              index: iota(),
              name: 'Dash',
              image: '/images/talents/rogue/Dash.png',
              isUsableSkill: true,
            },
            {
              index: iota(),
              name: 'Enhanced Dash',
              image: '/images/talents/rogue/Dash.png',
            },
            {
              index: iota(),
              name: 'Methodical Dash',
              image: '/images/talents/rogue/Dash.png',
            },
            {
              index: iota(),
              name: 'Disciplined Dash',
              image: '/images/talents/rogue/Dash.png',
            },
          ],
        },
        {
          type: TalentBranchType.SingleNodeBranch,
          nodes: [
            {
              index: iota(),
              name: 'Weapon Mastery',
              image: '/images/talents/rogue/WeaponMastery.png',
            },
          ],
        },
      ],
    },
    {
      id: 'Subterfuge',
      requiredPoints: 11,
      startingIndex: index,
      branches: [
        {
          type: TalentBranchType.TwoVerticalBranch,
          nodes: [
            {
              index: iota(),
              name: 'Agile',
              image: '/images/talents/rogue/Agile.png',
            },
            {
              index: iota(),
              name: 'Mending Obscurity',
              image: '/images/talents/rogue/MendingObscurity.png',
            },
          ],
        },
        {
          type: TalentBranchType.ReverseTBranch,
          nodes: [
            {
              index: iota(),
              name: 'Concealment',
              image: '/images/talents/rogue/Concealment.png',
              isUsableSkill: true,
            },
            {
              index: iota(),
              name: 'Enhanced Concealment',
              image: '/images/talents/rogue/Concealment.png',
            },
            {
              index: iota(),
              name: 'Countering Concealment',
              image: '/images/talents/rogue/Concealment.png',
            },
            {
              index: iota(),
              name: 'Subverting Concealment',
              image: '/images/talents/rogue/Concealment.png',
            },
          ],
        },
        {
          type: TalentBranchType.ReverseTBranch,
          nodes: [
            {
              index: iota(),
              name: 'Smoke Grenade',
              image: '/images/talents/rogue/SmokeGrenade.png',
              isUsableSkill: true,
            },
            {
              index: iota(),
              name: 'Enhanced Smoke Grenade',
              image: '/images/talents/rogue/SmokeGrenade.png',
            },
            {
              index: iota(),
              name: 'Countering Smoke Grenade',
              image: '/images/talents/rogue/SmokeGrenade.png',
            },
            {
              index: iota(),
              name: 'Subverting Smoke Grenade',
              image: '/images/talents/rogue/SmokeGrenade.png',
            },
          ],
        },
        {
          type: TalentBranchType.ReverseTBranch,
          nodes: [
            {
              index: iota(),
              name: 'Poison Trap',
              image: '/images/talents/rogue/PoisonTrap.png',
              isUsableSkill: true,
            },
            {
              index: iota(),
              name: 'Enhanced Poison Trap',
              image: '/images/talents/rogue/PoisonTrap.png',
            },
            {
              index: iota(),
              name: 'Countering Poison Trap',
              image: '/images/talents/rogue/PoisonTrap.png',
            },
            {
              index: iota(),
              name: 'Subverting Poison Trap',
              image: '/images/talents/rogue/PoisonTrap.png',
            },
          ],
        },
        {
          type: TalentBranchType.TwoVerticalBranch,
          nodes: [
            {
              index: iota(),
              name: 'Exploit',
              image: '/images/talents/rogue/Exploit.png',
            },
            {
              index: iota(),
              name: 'Malice',
              image: '/images/talents/rogue/Malice.png',
            },
          ],
        },
        {
          type: TalentBranchType.ReverseTBranch,
          nodes: [
            {
              index: iota(),
              name: 'Dark Shroud',
              image: '/images/talents/rogue/DarkShroud.png',
              isUsableSkill: true,
            },
            {
              index: iota(),
              name: 'Enhanced Dark Shroud',
              image: '/images/talents/rogue/DarkShroud.png',
            },
            {
              index: iota(),
              name: 'Countering Dark Shroud',
              image: '/images/talents/rogue/DarkShroud.png',
            },
            {
              index: iota(),
              name: 'Subverting Dark Shroud',
              image: '/images/talents/rogue/DarkShroud.png',
            },
          ],
        },
      ],
    },
    {
      id: 'Imbuement',
      requiredPoints: 16,
      startingIndex: index,
      branches: [
        {
          type: TalentBranchType.SingleNodeBranch,
          nodes: [
            {
              index: iota(),
              name: 'Precision Imbuement',
              image: '/images/talents/rogue/PrecisionImbuement.png',
            },
          ],
        },
        {
          type: TalentBranchType.TwoVerticalBranch,
          nodes: [
            {
              index: iota(),
              name: 'Shadow Crash',
              image: '/images/talents/rogue/ShadowCrash.png',
            },
            {
              index: iota(),
              name: 'Consuming Shadows',
              image: '/images/talents/rogue/ConsumingShadows.png',
            },
          ],
        },
        {
          type: TalentBranchType.ReverseTBranch,
          nodes: [
            {
              index: iota(),
              name: 'Shadow Imbuement',
              image: '/images/talents/rogue/ShadowImbuement.png',
              isUsableSkill: true,
            },
            {
              index: iota(),
              name: 'Enhanced Shadow Imbuement',
              image: '/images/talents/rogue/ShadowImbuement.png',
            },
            {
              index: iota(),
              name: 'Blended Shadow Imbuement',
              image: '/images/talents/rogue/ShadowImbuement.png',
            },
            {
              index: iota(),
              name: 'Mixed Shadow Imbuement',
              image: '/images/talents/rogue/ShadowImbuement.png',
            },
          ],
        },
        {
          type: TalentBranchType.ReverseTBranch,
          nodes: [
            {
              index: iota(),
              name: 'Poison Imbuement',
              image: '/images/talents/rogue/PoisonImbuement.png',
              isUsableSkill: true,
            },
            {
              index: iota(),
              name: 'Enhanced Poison Imbuement',
              image: '/images/talents/rogue/PoisonImbuement.png',
            },
            {
              index: iota(),
              name: 'Blended Poison Imbuement',
              image: '/images/talents/rogue/PoisonImbuement.png',
            },
            {
              index: iota(),
              name: 'Mixed Poison Imbuement',
              image: '/images/talents/rogue/PoisonImbuement.png',
            },
          ],
        },
        {
          type: TalentBranchType.ShortReverseTBranch,
          nodes: [
            {
              index: iota(),
              name: 'Deadly Venom',
              image: '/images/talents/rogue/DeadlyVenom.png',
            },
            {
              index: iota(),
              name: 'Debilitating Toxins',
              image: '/images/talents/rogue/DebilitatingToxins.png',
            },
            {
              index: iota(),
              name: 'Alchemical Advantage',
              image: '/images/talents/rogue/AlchemicalAdvantage.png',
            },
          ],
        },
        {
          type: TalentBranchType.ReverseTBranch,
          nodes: [
            {
              index: iota(),
              name: 'Cold Imbuement',
              image: '/images/talents/rogue/ColdImbuement.png',
              isUsableSkill: true,
            },
            {
              index: iota(),
              name: 'Enhanced Cold Imbuement',
              image: '/images/talents/rogue/ColdImbuement.png',
            },
            {
              index: iota(),
              name: 'Blended Cold Imbuement',
              image: '/images/talents/rogue/ColdImbuement.png',
            },
            {
              index: iota(),
              name: 'Mixed Cold Imbuement',
              image: '/images/talents/rogue/ColdImbuement.png',
            },
          ],
        },
        {
          type: TalentBranchType.TwoVerticalBranch,
          nodes: [
            {
              index: iota(),
              name: 'Frigid Finesse',
              image: '/images/talents/rogue/FrigidFinesse.png',
            },
            {
              index: iota(),
              name: 'Chilling Weight',
              image: '/images/talents/rogue/ChillingWeight.png',
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
          exclusivityGroup: 'ultimate',
          nodes: [
            {
              index: iota(),
              name: 'Shadow Clone',
              image: '/images/talents/rogue/ShadowClone.png',
              isUsableSkill: true,
            },
            {
              index: iota(),
              name: 'Prime Shadow Clone',
              image: '/images/talents/rogue/ShadowClone.png',
            },
            {
              index: iota(),
              name: 'Supreme Shadow Clone',
              image: '/images/talents/rogue/ShadowClone.png',
            },
          ],
        },
        {
          type: TalentBranchType.ShortReverseTBranch,
          nodes: [
            {
              index: iota(),
              name: 'Innervation',
              image: '/images/talents/rogue/Innervation.png',
            },
            {
              index: iota(),
              name: 'Second Wind',
              image: '/images/talents/rogue/SecondWind.png',
            },
            {
              index: iota(),
              name: "Alchemist's Fortune",
              image: '/images/talents/rogue/AlchemistsFortune.png',
            },
          ],
        },
        {
          type: TalentBranchType.SingleNodeBranch,
          nodes: [
            {
              index: iota(),
              name: 'Trap Mastery',
              image: '/images/talents/rogue/TrapMastery.png',
            },
          ],
        },
        {
          type: TalentBranchType.ThreeVerticalBranch,
          exclusivityGroup: 'ultimate',
          nodes: [
            {
              index: iota(),
              name: 'Death Trap',
              image: '/images/talents/rogue/DeathTrap.png',
              isUsableSkill: true,
            },
            {
              index: iota(),
              name: 'Prime Death Trap',
              image: '/images/talents/rogue/DeathTrap.png',
            },
            {
              index: iota(),
              name: 'Supreme Death Trap',
              image: '/images/talents/rogue/DeathTrap.png',
            },
          ],
        },
        {
          type: TalentBranchType.SingleNodeBranch,
          nodes: [
            {
              index: iota(),
              name: 'Aftermath',
              image: '/images/talents/rogue/Aftermath.png',
            },
          ],
        },
        {
          type: TalentBranchType.ShortReverseTBranch,
          nodes: [
            {
              index: iota(),
              name: 'Adrenaline Rush',
              image: '/images/talents/rogue/AdrenalineRush.png',
            },
            {
              index: iota(),
              name: 'Impetus',
              image: '/images/talents/rogue/Impetus.png',
            },
            {
              index: iota(),
              name: 'Haste',
              image: '/images/talents/rogue/Haste.png',
            },
          ],
        },
        {
          type: TalentBranchType.ThreeVerticalBranch,
          exclusivityGroup: 'ultimate',
          nodes: [
            {
              index: iota(),
              name: 'Rain of Arrows',
              image: '/images/talents/rogue/RainOfArrows.png',
              isUsableSkill: true,
            },
            {
              index: iota(),
              name: 'Prime Rain of Arrows',
              image: '/images/talents/rogue/RainOfArrows.png',
            },
            {
              index: iota(),
              name: 'Supreme Rain of Arrows',
              image: '/images/talents/rogue/RainOfArrows.png',
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
              name: 'Momentum',
              image: '/images/talents/rogue/Momentum.png',
            },
          ],
        },
        {
          type: TalentBranchType.KeyPassiveBranch,
          exclusivityGroup: 'keyPassives',
          nodes: [
            {
              index: iota(),
              name: 'Close Quarters Combat',
              image: '/images/talents/rogue/CloseQuartersCombat.png',
            },
          ],
        },
        {
          type: TalentBranchType.KeyPassiveBranch,
          exclusivityGroup: 'keyPassives',
          nodes: [
            {
              index: iota(),
              name: 'Precision',
              image: '/images/talents/rogue/Precision.png',
            },
          ],
        },
        {
          type: TalentBranchType.KeyPassiveBranch,
          exclusivityGroup: 'keyPassives',
          nodes: [
            {
              index: iota(),
              name: 'Victimize',
              image: '/images/talents/rogue/Victimize.png',
            },
          ],
        },
        {
          type: TalentBranchType.KeyPassiveBranch,
          exclusivityGroup: 'keyPassives',
          nodes: [
            {
              index: iota(),
              name: 'Exposure',
              image: '/images/talents/rogue/Exposure.png',
            },
          ],
        },
      ],
    },
  ],
}
