import { TalentBranchType, TalentTreeDefinition } from './_types'

let index = 0
const iota = () => index++

export const NECROMANCER_TALENT_TREE: TalentTreeDefinition = {
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
              name: 'Reap',
              image: '/images/talents/necromancer/Reap.png',
              isUsableSkill: true,
            },
            {
              index: iota(),
              name: 'Enhanced Reap',
              image: '/images/talents/necromancer/Reap.png',
            },
            {
              index: iota(),
              name: "Acolyte's Reap",
              image: '/images/talents/necromancer/Reap.png',
            },
            {
              index: iota(),
              name: "Initiate's Reap",
              image: '/images/talents/necromancer/Reap.png',
            },
          ],
        },
        {
          type: TalentBranchType.ReverseTBranch,
          nodes: [
            {
              index: iota(),
              name: 'Decompose',
              image: '/images/talents/necromancer/Decompose.png',
              isUsableSkill: true,
            },
            {
              index: iota(),
              name: 'Enhanced Decompose',
              image: '/images/talents/necromancer/Decompose.png',
            },
            {
              index: iota(),
              name: "Acolyte's Decompose",
              image: '/images/talents/necromancer/Decompose.png',
            },
            {
              index: iota(),
              name: "Initiate's Decompose",
              image: '/images/talents/necromancer/Decompose.png',
            },
          ],
        },
        {
          type: TalentBranchType.ReverseTBranch,
          nodes: [
            {
              index: iota(),
              name: 'Hemorrhage',
              image: '/images/talents/necromancer/Hemorrhage.png',
              isUsableSkill: true,
            },
            {
              index: iota(),
              name: 'Enhanced Hemorrhage',
              image: '/images/talents/necromancer/Hemorrhage.png',
            },
            {
              index: iota(),
              name: "Acolyte's Hemorrhage",
              image: '/images/talents/necromancer/Hemorrhage.png',
            },
            {
              index: iota(),
              name: "Initiate's Hemorrhage",
              image: '/images/talents/necromancer/Hemorrhage.png',
            },
          ],
        },
        {
          type: TalentBranchType.ReverseTBranch,
          nodes: [
            {
              index: iota(),
              name: 'Bone Splinters',
              image: '/images/talents/necromancer/BoneSplinters.png',
              isUsableSkill: true,
            },
            {
              index: iota(),
              name: 'Enhanced Bone Splinters',
              image: '/images/talents/necromancer/BoneSplinters.png',
            },
            {
              index: iota(),
              name: "Acolyte's Bone Splinters",
              image: '/images/talents/necromancer/BoneSplinters.png',
            },
            {
              index: iota(),
              name: "Initiate's Bone Splinters",
              image: '/images/talents/necromancer/BoneSplinters.png',
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
          type: TalentBranchType.TwoVerticalBranch,
          nodes: [
            {
              index: iota(),
              name: 'Unliving Energy',
              image: '/images/talents/necromancer/UnlivingEnergy.png',
            },
            {
              index: iota(),
              name: 'Imperfectly Balanced',
              image:
                '/images/talents/necromancer/ImperfectlyBalanced.png',
            },
          ],
        },
        {
          type: TalentBranchType.ReverseTBranch,
          nodes: [
            {
              index: iota(),
              name: 'Blood Lance',
              image: '/images/talents/necromancer/BloodLance.png',
              isUsableSkill: true,
            },
            {
              index: iota(),
              name: 'Enhanced Blood Lance',
              image: '/images/talents/necromancer/BloodLance.png',
            },
            {
              index: iota(),
              name: 'Paranormal Blood Lance',
              image: '/images/talents/necromancer/BloodLance.png',
            },
            {
              index: iota(),
              name: 'Supernatural Blood Lance',
              image: '/images/talents/necromancer/BloodLance.png',
            },
          ],
        },
        {
          type: TalentBranchType.ReverseTBranch,
          nodes: [
            {
              index: iota(),
              name: 'Blood Surge',
              image: '/images/talents/necromancer/BloodSurge.png',
              isUsableSkill: true,
            },
            {
              index: iota(),
              name: 'Enhanced Blood Surge',
              image: '/images/talents/necromancer/BloodSurge.png',
            },
            {
              index: iota(),
              name: 'Paranormal Blood Surge',
              image: '/images/talents/necromancer/BloodSurge.png',
            },
            {
              index: iota(),
              name: 'Supernatural Blood Surge',
              image: '/images/talents/necromancer/BloodSurge.png',
            },
          ],
        },
        {
          type: TalentBranchType.ReverseTBranch,
          nodes: [
            {
              index: iota(),
              name: 'Blight',
              image: '/images/talents/necromancer/Blight.png',
              isUsableSkill: true,
            },
            {
              index: iota(),
              name: 'Enhanced Blight',
              image: '/images/talents/necromancer/Blight.png',
            },
            {
              index: iota(),
              name: 'Paranormal Blight',
              image: '/images/talents/necromancer/Blight.png',
            },
            {
              index: iota(),
              name: 'Supernatural Blight',
              image: '/images/talents/necromancer/Blight.png',
            },
          ],
        },
        {
          type: TalentBranchType.ReverseTBranch,
          nodes: [
            {
              index: iota(),
              name: 'Sever',
              image: '/images/talents/necromancer/Sever.png',
              isUsableSkill: true,
            },
            {
              index: iota(),
              name: 'Enhanced Sever',
              image: '/images/talents/necromancer/Sever.png',
            },
            {
              index: iota(),
              name: 'Paranormal Sever',
              image: '/images/talents/necromancer/Sever.png',
            },
            {
              index: iota(),
              name: 'Supernatural Sever',
              image: '/images/talents/necromancer/Sever.png',
            },
          ],
        },
        {
          type: TalentBranchType.SingleNodeBranch,
          nodes: [
            {
              index: iota(),
              name: 'Hewed Flesh',
              image: '/images/talents/necromancer/HewedFlesh.png',
            },
          ],
        },
        {
          type: TalentBranchType.ReverseTBranch,
          nodes: [
            {
              index: iota(),
              name: 'Bone Spear',
              image: '/images/talents/necromancer/BoneSpear.png',
              isUsableSkill: true,
            },
            {
              index: iota(),
              name: 'Enhanced Bone Spear',
              image: '/images/talents/necromancer/BoneSpear.png',
            },
            {
              index: iota(),
              name: 'Paranormal Bone Spear',
              image: '/images/talents/necromancer/BoneSpear.png',
            },
            {
              index: iota(),
              name: 'Supernatural Bone Spear',
              image: '/images/talents/necromancer/BoneSpear.png',
            },
          ],
        },
      ],
    },
    {
      id: 'Corpse Macabre',
      requiredPoints: 6,
      startingIndex: index,
      branches: [
        {
          type: TalentBranchType.ReverseTBranch,
          nodes: [
            {
              index: iota(),
              name: 'Blood Mist',
              image: '/images/talents/necromancer/BloodMist.png',
              isUsableSkill: true,
            },
            {
              index: iota(),
              name: 'Enhanced Blood Mist',
              image: '/images/talents/necromancer/BloodMist.png',
            },
            {
              index: iota(),
              name: 'Ghastly Blood Mist',
              image: '/images/talents/necromancer/BloodMist.png',
            },
            {
              index: iota(),
              name: 'Dreadful Blood Mist',
              image: '/images/talents/necromancer/BloodMist.png',
            },
          ],
        },
        {
          type: TalentBranchType.SingleNodeBranch,
          nodes: [
            {
              index: iota(),
              name: 'Spiked Armor',
              image: '/images/talents/necromancer/SpikedArmor.png',
            },
          ],
        },
        {
          type: TalentBranchType.SingleNodeBranch,
          nodes: [
            {
              index: iota(),
              name: 'Skeletal Warrior Mastery',
              image:
                '/images/talents/necromancer/SkeletalWarriorMastery.png',
            },
          ],
        },
        {
          type: TalentBranchType.ReverseTBranch,
          nodes: [
            {
              index: iota(),
              name: 'Bone Prison',
              image: '/images/talents/necromancer/BonePrison.png',
              isUsableSkill: true,
            },
            {
              index: iota(),
              name: 'Enhanced Bone Prison',
              image: '/images/talents/necromancer/BonePrison.png',
            },
            {
              index: iota(),
              name: 'Ghastly Bone Prison',
              image: '/images/talents/necromancer/BonePrison.png',
            },
            {
              index: iota(),
              name: 'Dreadful Bone Prison',
              image: '/images/talents/necromancer/BonePrison.png',
            },
          ],
        },
        {
          type: TalentBranchType.TwoVerticalBranch,
          nodes: [
            {
              index: iota(),
              name: 'Grim Harvest',
              image: '/images/talents/necromancer/GrimHarvest.png',
            },
            {
              index: iota(),
              name: 'Fueled by Death',
              image: '/images/talents/necromancer/FueledByDeath.png',
            },
          ],
        },
        {
          type: TalentBranchType.ReverseTBranch,
          nodes: [
            {
              index: iota(),
              name: 'Corpse Explosion',
              image:
                '/images/talents/necromancer/CorpseExplosion.png',
              isUsableSkill: true,
            },
            {
              index: iota(),
              name: 'Enhanced Corpse Explosion',
              image:
                '/images/talents/necromancer/CorpseExplosion.png',
            },
            {
              index: iota(),
              name: 'Blighted Corpse Explosion',
              image:
                '/images/talents/necromancer/CorpseExplosion.png',
            },
            {
              index: iota(),
              name: 'Plagued Corpse Explosion',
              image:
                '/images/talents/necromancer/CorpseExplosion.png',
            },
          ],
        },
      ],
    },
    {
      id: 'Curse',
      requiredPoints: 11,
      startingIndex: index,
      branches: [
        {
          type: TalentBranchType.SingleNodeBranch,
          nodes: [
            {
              index: iota(),
              name: "Death's Embrace",
              image: '/images/talents/necromancer/DeathsEmbrace.png',
            },
          ],
        },
        {
          type: TalentBranchType.ReverseTBranch,
          nodes: [
            {
              index: iota(),
              name: 'Iron Maiden',
              image: '/images/talents/necromancer/IronMaiden.png',
              isUsableSkill: true,
            },
            {
              index: iota(),
              name: 'Enhanced Iron Maiden',
              image: '/images/talents/necromancer/IronMaiden.png',
            },
            {
              index: iota(),
              name: 'Abhorrent Iron Maiden',
              image: '/images/talents/necromancer/IronMaiden.png',
            },
            {
              index: iota(),
              name: 'Horrid Iron Maiden',
              image: '/images/talents/necromancer/IronMaiden.png',
            },
          ],
        },
        {
          type: TalentBranchType.SingleNodeBranch,
          nodes: [
            {
              index: iota(),
              name: 'Amplify Damage',
              image: '/images/talents/necromancer/AmplifyDamage.png',
            },
          ],
        },
        {
          type: TalentBranchType.ReverseTBranch,
          nodes: [
            {
              index: iota(),
              name: 'Decrepify',
              image: '/images/talents/necromancer/Decrepify.png',
              isUsableSkill: true,
            },
            {
              index: iota(),
              name: 'Enhanced Decrepify',
              image: '/images/talents/necromancer/Decrepify.png',
            },
            {
              index: iota(),
              name: 'Abhorrent Decrepify',
              image: '/images/talents/necromancer/Decrepify.png',
            },
            {
              index: iota(),
              name: 'Horrid Decrepify',
              image: '/images/talents/necromancer/Decrepify.png',
            },
          ],
        },
        {
          type: TalentBranchType.SingleNodeBranch,
          nodes: [
            {
              index: iota(),
              name: 'Skeletal Mage Mastery',
              image:
                '/images/talents/necromancer/SkeletalMageMastery.png',
            },
          ],
        },
        {
          type: TalentBranchType.SingleNodeBranch,
          nodes: [
            {
              index: iota(),
              name: "Death's Reach",
              image: '/images/talents/necromancer/DeathsReach.png',
            },
          ],
        },
      ],
    },
    {
      id: 'Corpse Macabre 2',
      requiredPoints: 16,
      startingIndex: index,
      branches: [
        {
          type: TalentBranchType.ReverseHammerWithExtraOnLeftMiddleBranch,
          nodes: [
            {
              index: iota(),
              name: 'Gruesome Mending',
              image:
                '/images/talents/necromancer/GruesomeMending.png',
            },
            {
              index: iota(),
              name: 'Drain Vitality',
              image: '/images/talents/necromancer/DrainVitality.png',
            },
            {
              index: iota(),
              name: 'Coalesced Blood',
              image: '/images/talents/necromancer/CoalescedBlood.png',
            },
            {
              index: iota(),
              name: 'Transfusion',
              image: '/images/talents/necromancer/Transfusion.png',
            },
            {
              index: iota(),
              name: 'Tides of Blood',
              image: '/images/talents/necromancer/TidesOfBlood.png',
            },
          ],
        },
        {
          type: TalentBranchType.ReverseTBranch,
          nodes: [
            {
              index: iota(),
              name: 'Corpse Tendrils',
              image: '/images/talents/necromancer/CorpseTendrils.png',
              isUsableSkill: true,
            },
            {
              index: iota(),
              name: 'Enhanced Corpse Tendrils',
              image: '/images/talents/necromancer/CorpseTendrils.png',
            },
            {
              index: iota(),
              name: 'Blighted Corpse Tendrils',
              image: '/images/talents/necromancer/CorpseTendrils.png',
            },
            {
              index: iota(),
              name: 'Plagued Corpse Tendrils',
              image: '/images/talents/necromancer/CorpseTendrils.png',
            },
          ],
        },
        {
          type: TalentBranchType.SingleNodeBranch,
          nodes: [
            {
              index: iota(),
              name: 'Necrotic Carapace',
              image:
                '/images/talents/necromancer/NecroticCarapace.png',
            },
          ],
        },
        {
          type: TalentBranchType.ReverseTBranch,
          nodes: [
            {
              index: iota(),
              name: 'Bone Spirit',
              image: '/images/talents/necromancer/BoneSpirit.png',
              isUsableSkill: true,
            },
            {
              index: iota(),
              name: 'Enhanced Bone Spirit',
              image: '/images/talents/necromancer/BoneSpirit.png',
            },
            {
              index: iota(),
              name: 'Dreadful Bone Spirit',
              image: '/images/talents/necromancer/BoneSpirit.png',
            },
            {
              index: iota(),
              name: 'Ghastly Bone Spirit',
              image: '/images/talents/necromancer/BoneSpirit.png',
            },
          ],
        },
        {
          type: TalentBranchType.ReverseHammerBranch,
          nodes: [
            {
              index: iota(),
              name: 'Serration',
              image: '/images/talents/necromancer/Serration.png',
            },
            {
              index: iota(),
              name: 'Rapid Ossification',
              image:
                '/images/talents/necromancer/RapidOssification.png',
            },
            {
              index: iota(),
              name: 'Compound Fracture',
              image:
                '/images/talents/necromancer/CompoundFracture.png',
            },
            {
              index: iota(),
              name: 'Evulsion',
              image: '/images/talents/necromancer/Evulsion.png',
            },
          ],
        },
        {
          type: TalentBranchType.ReverseHammerBranch,
          nodes: [
            {
              index: iota(),
              name: "Reaper's Pursuit",
              image: '/images/talents/necromancer/ReapersPursuit.png',
            },
            {
              index: iota(),
              name: 'Crippling Darkness',
              image:
                '/images/talents/necromancer/CripplingDarkness.png',
            },
            {
              index: iota(),
              name: 'Gloom',
              image: '/images/talents/necromancer/Gloom.png',
            },
            {
              index: iota(),
              name: 'Terror',
              image: '/images/talents/necromancer/Terror.png',
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
              name: 'Blood Wave',
              image: '/images/talents/necromancer/BloodWave.png',
              isUsableSkill: true,
            },
            {
              index: iota(),
              name: 'Prime Blood Wave',
              image: '/images/talents/necromancer/BloodWave.png',
            },
            {
              index: iota(),
              name: 'Supreme Blood Wave',
              image: '/images/talents/necromancer/BloodWave.png',
            },
          ],
        },
        {
          type: TalentBranchType.SingleNodeBranch,
          nodes: [
            {
              index: iota(),
              name: 'Golem Mastery',
              image: '/images/talents/necromancer/GolemMastery.png',
            },
          ],
        },
        {
          type: TalentBranchType.ThreeVerticalBranch,
          exclusivityGroup: 'ultimate',
          nodes: [
            {
              index: iota(),
              name: 'Army of the Dead',
              image: '/images/talents/necromancer/ArmyOfTheDead.png',
              isUsableSkill: true,
            },
            {
              index: iota(),
              name: 'Prime Army of the Dead',
              image: '/images/talents/necromancer/ArmyOfTheDead.png',
            },
            {
              index: iota(),
              name: 'Supreme Army of the Dead',
              image: '/images/talents/necromancer/ArmyOfTheDead.png',
            },
          ],
        },
        {
          type: TalentBranchType.DoubleLBranch,
          nodes: [
            {
              index: iota(),
              name: 'Bonded in Essence',
              image:
                '/images/talents/necromancer/BondedInEssence.png',
            },
            {
              index: iota(),
              name: 'Inspiring Leader',
              image:
                '/images/talents/necromancer/InspiringLeader.png',
            },
            {
              index: iota(),
              name: "Death's Defense",
              image: '/images/talents/necromancer/DeathsDefense.png',
            },
            {
              index: iota(),
              name: 'Hellbent Commander',
              image:
                '/images/talents/necromancer/HellbentCommander.png',
            },
          ],
        },
        {
          type: TalentBranchType.ThreeVerticalBranch,
          exclusivityGroup: 'ultimate',
          nodes: [
            {
              index: iota(),
              name: 'Bone Storm',
              image: '/images/talents/necromancer/BoneStorm.png',
              isUsableSkill: true,
            },
            {
              index: iota(),
              name: 'Prime Bone Storm',
              image: '/images/talents/necromancer/BoneStorm.png',
            },
            {
              index: iota(),
              name: 'Supreme Bone Storm',
              image: '/images/talents/necromancer/BoneStorm.png',
            },
          ],
        },
        {
          type: TalentBranchType.TwoVerticalBranch,
          nodes: [
            {
              index: iota(),
              name: 'Stand Alone',
              image: '/images/talents/necromancer/StandAlone.png',
            },
            {
              index: iota(),
              name: 'Memento Mori',
              image: '/images/talents/necromancer/MementoMori.png',
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
              name: 'Ossified Essence',
              image:
                '/images/talents/necromancer/OssifiedEssence.png',
            },
          ],
        },
        {
          type: TalentBranchType.KeyPassiveBranch,
          exclusivityGroup: 'keyPassives',
          nodes: [
            {
              index: iota(),
              name: "Rathma's Vigor",
              image: '/images/talents/necromancer/RathmasVigor.png',
            },
          ],
        },
        {
          type: TalentBranchType.KeyPassiveBranch,
          exclusivityGroup: 'keyPassives',
          nodes: [
            {
              index: iota(),
              name: 'Shadowblight',
              image: '/images/talents/necromancer/Shadowblight.png',
            },
          ],
        },
        {
          type: TalentBranchType.KeyPassiveBranch,
          exclusivityGroup: 'keyPassives',
          nodes: [
            {
              index: iota(),
              name: "Kalan's Edict",
              image: '/images/talents/necromancer/KalansEdict.png',
            },
          ],
        },
      ],
    },
    {
      id: 'Summoning',
      requiredPoints: 0,
      hidden: true,
      startingIndex: index,
      branches: [
        {
          type: TalentBranchType.KeyPassiveBranch,
          nodes: [
            {
              index: iota(),
              name: 'Raise Skeleton',
              image: '/images/talents/necromancer/RaiseSkeleton.png',
              isUsableSkill: true,
            },
          ],
        },
        {
          type: TalentBranchType.KeyPassiveBranch,
          nodes: [
            {
              index: iota(),
              name: 'Golem',
              image: '/images/talents/necromancer/Golem.png',
              isUsableSkill: true,
            },
          ],
        },
      ],
    },
  ],
}
