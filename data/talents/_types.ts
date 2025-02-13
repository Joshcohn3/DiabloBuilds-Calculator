export enum TalentBranchType {
  DoubleLBranch,
  KeyPassiveBranch,
  ReverseHammerBranch,
  ReverseHammerWithExtraOnLeftBottomBranch,
  ReverseHammerWithExtraOnLeftMiddleBranch,
  ReverseTBranch,
  ShortReverseTBranch,
  SingleNodeBranch,
  ThreeVerticalBranch,
  TwoVerticalBranch,
  UBranch,
}

export type TalentNode = {
  name: string
  image: string
  index: number
  isUsableSkill?: boolean
}

export type TalentBranch = {
  type: TalentBranchType
  exclusivityGroup?: string
  nodes: TalentNode[]
}

export type TalentTier = {
  id: string
  requiredPoints: number
  startingIndex: number
  branches: TalentBranch[]
  hidden?: boolean
}

export type TalentTreeDefinition = {
  tiers: TalentTier[]
}
