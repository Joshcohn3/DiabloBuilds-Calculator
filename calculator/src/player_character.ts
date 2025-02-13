export interface PlayerCharacter {
  level: number
  class: string

  helmet?: Armor
  amulet?: Armor
  chest?: Armor
  boots?: Armor
  gloves?: Armor
  pants?: Armor
  ring1?: Armor
  ring2?: Armor

  mainHand?: Weapon
  offHand?: Weapon

  // Map from talent name to the number of points.
  // We use underscores instead of spaces in the talent
  // names.
  talents: Record<string, number>
  // Keyed by the toggle name Each toggle has a value
  // type. Supported types are number, boolean or Enum
  // (represented by string).
  toggles: Record<string, number | boolean | string>
  // Paragon is a map with string keys and either number or boolean values. The
  // legendary paragons and glyphs are the toggles with boolean value.
  paragons?: {
    // The sum total of all attributes across the player's paragon tree. This
    // includes bonuses from glyphs and attributes from magic and rare nodes.
    attributes?: ParagonAttributes
    // The name value pair of each non-attribute modifier on rare and magic nodes.
    // These should *NOT* be added together since for certain modifiers, they combine
    /// in a multiplicative way. The name should be the slug name of the modifier.
    modifiers?: [string, number][]
    // The name of each legendary paragon and glyph which has an active bonus power.
    powers?: string[]
  }

  // The name of each vampiric power equipped by the player.
  vampiricPowers?: string[]

  // Season 3 Seneschal Construct.  Players get a pet construct with 2 skills (Governing Stones) and each skill has up to 3 upgrades (Tuning Stones)
  seneschalConstruct?: {
    governing1: string | null
    governing2: string | null
    tuning1: [string | null, string | null, string | null]
    tuning2: [string | null, string | null, string | null]
  }
  // **DEPRECATED**
  basicAbility?: string
  // **DEPRECATED**
  coreAbility?: string
  // Contains the names of all the other equipped abilities (up to 6).
  abilities?: string[]

  // This should only be set internally for the purposes of running suggestive analytics.
  bonusPowers?: {
    modifiers?: [string, number][]
    aspect?: [string, number[]]
  }
}

export interface ParagonAttributes {
  strength: number
  dexterity: number
  intelligence: number
  willpower: number
}

// Barbarians can choose a weapon expertise that always applies regardless of which
// weapon the player is using
export type ExpertiseWeaponType =
  | null
  | 'sword'
  | 'axe'
  | 'mace'
  | 'two-handed-sword'
  | 'two-handed-mace'
  | 'two-handed-axe'
  | 'polearm'

// Barbarians have 3 sets of weapons. Two types of 2-handers and dual wield.
export interface BarbarianCharacter extends PlayerCharacter {
  class: 'Barbarian'
  twoHandedBludgeoning?: Weapon
  twoHandedSlashing?: Weapon
  expertise?: ExpertiseWeaponType
  // Used to assign weapons to particular skills. Should be the same length as abilities, otherwise
  // we pad with null.
  abilityWeapons?: (
    | null
    | 'two-handed-bludgeoning'
    | 'two-handed-slashing'
    | 'dual-wield'
  )[]
}

export interface SorcererCharacter extends PlayerCharacter {
  class: 'Sorcerer'
  // Sorcerers can enchant any two non-ultimate skills to grant them additional
  // effects. we just represent them here as a pair of string names for the two
  // skills that are enchanted.
  enchantments?: EnchantedSkill[]
}

export type EnchantedSkill =
  | null
  | undefined
  | 'arc-lash'
  | 'spark'
  | 'fire-bolt'
  | 'frost-bolt'
  | 'incinerate'
  | 'fireball'
  | 'frozen-orb'
  | 'ice-shards'
  | 'chain-lightning'
  | 'charged-bolts'
  | 'flame-shield'
  | 'teleport'
  | 'ice-armor'
  | 'frost-nova'
  | 'hydra'
  | 'ice-blades'
  | 'lightning-spear'
  | 'blizzard'
  | 'meteor'
  | 'firewall'
  | 'ball-lightning'

// Player can choose one power from each of Deer, Eagle, Snake and Wolf. They
// can also specialize in one of the spirits and get two powers.
export interface SpiritBoon {
  // "prickleskin", "gift-of-the-stag", "wariness", "advantageous-beast"
  deer: string[]
  // "scythe-talons", "iron-feather", "swooping-attacks", "avian-wrath"
  eagle: string[]
  // "obsidian-slam", "overlord", "masochistic", "calm-before-the-storm"
  snake: string[]
  // "packleader", "energize", "bolster", "calamity"
  wolf: string[]
}
export interface DruidCharacter extends PlayerCharacter {
  class: 'Druid'
  spiritBoon?: SpiritBoon
}

export type SpecializationNode =
  | null
  | 'combo-points'
  | 'inner-sight'
  | 'preparation'

export interface RogueCharacter extends PlayerCharacter {
  class: 'Rogue'
  ranged?: Weapon
  // Rogue can select one of the three specializations and get additional powers.
  specialization?: SpecializationNode
}

// Player can choose one power from each of the Skeletal Warriors, Skeletal Mages and Golem
// sets. Each set has 9 choices which are divided into 3 groups of 3.
export interface BookOfTheDead {
  skeletalWarriors?: ['skirmishers' | 'defenders' | 'reapers', number]
  skeletalMages?: ['shadow' | 'cold' | 'bone', number]
  golem?: ['bone' | 'blood' | 'iron', number]
}

export interface NecromancerCharacter extends PlayerCharacter {
  class: 'Necromancer'
  bookOfTheDead?: BookOfTheDead
}

export interface Armor {
  // Each modifier is a pair [name, value]. There is a list (or eventually db) of modifiers
  // which are available for each class/slot. Modifiers should include things like implicits
  // and armor.
  modifiers?: [string, number][]
  // Name of the aspect and all the values. Note some aspects depend on multiple values and
  // so we require an array of numbers. The order should be the same as the order in the
  // tooltip.
  aspect?: [string, (number | null)[]]

  // Season 1 mechanic. This can only appear in the gem slot for amulet and rings.
  malignantHeart?: {
    // Slug name of the malignant heart.
    name: string
    // The armor value of the malignant heart.
    armor: number
    // The values for the various powers in the malignantHeart. Each malignant heart has 1 or 2
    // values associated with them which determine the strength of its powers. The values should
    // appear in the array in the order they appear in the tooltip.
    values: (number | null)[]
  }
}

export function instanceOfArmor(object: any): object is Armor {
  return 'modifiers' in object
}

export type WeaponType =
  | 'two-handed-sword'
  | 'two-handed-mace'
  | 'two-handed-axe'
  | 'polearm'
  | 'axe'
  | 'mace'
  | 'sword'
  | 'bow'
  | 'dagger'
  | 'staff'
  | 'scythe'
  | 'two-handed-scythe'
  | 'wand'
  | 'focus'
  | 'crossbow'
  | 'totem'
  | 'shield'

export interface Weapon {
  weaponType: WeaponType
  attackSpeed: number | null
  // This goes by different names for different weapon types such as `Weapon_Attack` for
  // casters and Damage per Hit for melee weapons. We only need the average damage per hit
  // for weapons which list both a top/low end damage.
  weaponDamage: number | null
  modifiers?: [string, number][]
  aspect?: [string, (number | null)[]]
}

export function instanceOfWeapon(object: any): object is Weapon {
  return (
    'attackSpeed' in object &&
    'weaponDamage' in object &&
    'weaponType' in object
  )
}
