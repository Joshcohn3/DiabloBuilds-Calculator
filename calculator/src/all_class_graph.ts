import {
  ModifierNode,
  ParagonNode,
  VampiricNode,
} from './computation_graph'

const ModifierNames: string[] = [
  /*--------------------------------------------------
                    OFFENSIVE MODIFIERS
    --------------------------------------------------*/
  // S2 New Mods
  'lucky-hit:-chance-to-gain-damage-for-4-seconds',
  'rupture-cooldown-reduction', //Fields of Crimson S2 Update
  'critical-strike-chance-against-close-enemies', // Gohrs Gloves S2 Update
  'minions-inherit-critical-strike-chance',
  'minions-inherit-%-of-your-thorns',
  'maximum-resource', // Tibaults Will S2 Update
  'nature-magic-skill-cooldown-reduction', // Dolmen Stone
  'damage-reduction-from-enemies-affected-by-curse-skills', // Bloodmoon Breeches
  'damage-reduction-from-enemies-affected-by-trap-skills', // Scoundrels Leathers
  'damage-to-enemies-affected-by-trap-skills',
  'damage-with-ice-spikes',
  'ultimate-skill-cooldown-reduction', // airidahs-inexorable-will Druid Malignant Ring

  // Generic Damage
  'damage',
  'damage-for-4-seconds-after-picking-up-a-blood-orb',
  'damage-for-4-seconds-after-dodging-an-attack',
  'damage-over-time',
  'damage-to-affected-by-shadow-damage-over-time-enemies',
  'damage-to-bleeding-enemies',
  'damage-to-burning-enemies',
  'damage-to-chilled-enemies',
  'damage-to-close-enemies',
  'damage-to-crowd-controlled-enemies',
  'damage-to-daze-enemies',
  'damage-to-distant-enemies',
  'damage-to-elites',
  'damage-to-frozen-enemies', // TODO: Add it in
  'damage-to-immobilized-enemies', // TODO: Add it in
  'damage-to-knocked-down-enemies', // TODO: Add it in
  'damage-for-4-seconds-after-killing-an-elite',
  'damage-to-freeze-enemies',
  'damage-to-healthy-enemies',
  'damage-to-injured-enemies',
  'damage-to-poisoned-enemies',
  'damage-to-slowed-enemies',
  'damage-to-stun-enemies',
  'damage-to-trap-enemies',
  'damage-while-berserking',
  'damage-while-healthy',
  'damage-while-in-human',
  'damage-while-shapeshifted',
  'fire-damage',
  'cold-damage',
  'lightning-damage',
  'non-physical-damage',
  'physical-damage',
  'poison-damage',
  'shadow-clone-damage', // Unique Grasp of Shadow
  'shadow-damage',
  'shadow-damage-over-time',
  'fire-damage-over-time',
  'physical-damage-over-time',

  // Skill Damage
  'basic-skill-damage',
  'blood-skill-damage',
  'bone-skill-damage',
  'brawling-skill-damage',
  'companion-skill-damage',
  'conjuration-skill-damage',
  'core-skill-damage',
  'cutthroat-skill-damage',
  'damage-with-dual-wielded-weapons',
  'damage-with-ranged-weapons',
  'damage-with-skills-that-swap-to-new-weapons',
  'damage-with-two-handed-bludgeoning-weapons',
  'damage-with-two-handed-slashing-weapons',
  'darkness-skill-damage',
  'earth-skill-damage',
  'frost-skill-damage',
  'ice-spike-damage', // TODO: Add it in
  'imbued-skill-damage',
  'imbuement-skill-damage',
  'marksman-skill-damage',
  'pyromancy-skill-damage',
  'shock-skill-damage',
  'storm-skill-damage',
  'summoning-skill-damage',
  'trap-skill-damage',
  'mastery-skill-damage',
  'ultimate-skill-damage',
  'weapon-mastery-skill-damage',
  'werebear-skill-damage',
  'werewolf-skill-damage',

  // Attack Speed
  'attack-speed',
  'attack-speed-for-4-seconds-after-dodging-an-attack',
  'basic-attack-speed',
  'corpse-attack-speed',
  'fireball-attack-speed',

  // Critical Strikes
  'critical-strike-chance',
  'critical-strike-chance-against-injured-enemies',
  'critical-strike-chance-with-physical-damage',
  'critical-strike-damage',
  'critical-strike-damage-to-crowd-controlled-enemies',
  'critical-strike-damage-to-vulnerable-enemies', // Gems
  'critical-strike-damage-with-imbued-skills',
  'critical-strike-damage-with-bone-skills',
  'critical-strike-damage-with-earth-skills',
  'critical-strike-chance-with-physical-damage-against-elites',
  'lightning-critical-strike-damage',
  'critical-strike-damage-with-werewolf-skills',

  // Overpower
  'overpower-damage',
  'overpower-damage-with-two-handed-bludgeoning-weapons',
  'overpower-damage-with-werebear-skills',

  // Vulnerable
  'vulnerable-damage',

  // Thorns
  'thorns',
  'skeletal-warriors-inherit-%-of-your-thorns', //Removed in S2 Update
  'skeletal-mages-inherit-%-of-your-thorns', //Removed in S2 Update
  'golem-inherit-%-of-your-thorns', //Removed in S2 Update

  // Lucky Hit
  'lucky-hit-chance',
  'lucky-hit-chance-while-you-have-a-barrier',
  'lucky-hit-chance-with-fire-damage', // Unique Flamescar
  'lucky-hit-chance-immobilize', // Unique Fists of Fate
  'lucky-hit-chance-daze', // Unique Fists of Fate
  'lucky-hit-chance-with-shadow-damage', // Unique Greaves of the Empty Tomb
  'lucky-hit:-up-to-a-%-chance-to-slow',
  'lucky-hit:-up-to-a-%-chance-to-stun',
  'lucky-hit:-up-to-a-%-chance-to-fear',

  /*--------------------------------------------------
                  DEFENSIVE MODIFIERS
    --------------------------------------------------*/

  // Health Related
  '%-maximum-life',
  'blood-orb-healing',
  'fortify-generation',
  'healing-over-time',
  'healing-received',
  'life-on-kill',
  'life-steal',
  'maximum-life',
  'lucky-hit:-up-to-a-5%-chance-to-heal-life',
  'life-regeneration-while-not-damaged-recently',

  // Resistances
  'cold-resistance',
  'fire-resistance',
  'lightning-resistance',
  'poison-resistance',
  'resistance-to-all-elements',
  'shadow-resistance',

  // Armor
  'armor',
  'total-armor',
  'total-armor-while-in-werebear-form',
  'total-armor-while-in-werewolf-form',

  // Dodge
  'dodge-chance',
  'dodge-chance-against-close-enemies',
  'dodge-chance-against-distant-enemies',

  // Barrier
  'barrier-generation',

  // Damage Reduction
  'block-chance',
  'blocked-damage-reduction',
  'damage-reduction',
  'damage-reduction-from-affected-by-shadow-damage-over-time-enemies',
  'damage-reduction-from-bleeding-enemies',
  'damage-reduction-from-burning-enemies',
  'damage-reduction-from-close-enemies',
  'damage-reduction-from-distant-enemies',
  'damage-reduction-from-elites', // TODO: Add it in
  'damage-reduction-from-poisoned-enemies',
  'damage-reduction-while-fortified',
  'damage-reduction-while-injured',
  'damage-taken-over-time-reduction', // Gems or Paragon

  /*--------------------------------------------------
                  MISCELLANEOUS MODIFIERS
    --------------------------------------------------*/

  // Resource
  'maximum-energy',
  'maximum-essence',
  'maximum-fury',
  'maximum-mana',
  'maximum-spirit',
  'resource-generation',
  'lucky-hit:-up-to-a-5%-chance-to-restore-primary-resource',

  // Cost Reduction
  'energy-cost-reduction',
  'essence-cost-reduction',
  'fury-cost-reduction',
  'mana-cost-reduction',
  'spirit-cost-reduction',

  // Cooldowns:
  'cooldown-reduction',
  'imbuement-cooldown-reduction',
  'trap-cooldown-reduction',

  // Attributes
  'all-stats',
  '%-dexterity',
  'dexterity',
  '%-intelligence',
  'intelligence',
  '%-strength',
  'strength',
  '%-willpower',
  'willpower',

  // Movement
  'evade-briefly-grants-movement-speed',
  'movement-speed',
  'movement-speed-for-4-seconds-after-killing-an-elite',

  // Other
  'ranks-of-all-skills', // Unique Harlequin Crest
  'attacks-reduce-evades-cooldown-by-1-second',
  'berserking-duration',
  'bleeding-duration',
  'reduces-the-arm-time-of-your-trap-by-second',
  'control-impaired-duration-reduction',
  'companion-movement-speed',
  'crackling-energy-damage',
  'crowd-control-duration',
  'empty',
  'freeze-duration',
  'ignores-durability-loss',
  'main-hand-weapon-damage',
  'max-evade-charge',
  'maximum-minion-life',
  '%-maximum-minion-life',
  'minion-attack-speed',
  'minion-resistance-to-all-elements',
  'potion-charges',
  'potion-drop-rate',
  'shrine-buff-duration',
  'lucky-hit:-up-to-a-chance-to-execute-injured-non-elites',
  'while-injured-your-potion-also-grants-maximum-life-as-barrier',
  'while-injured-your-potion-also-grants-movement-speed-for-2-seconds',
  'while-injured-your-potion-also-restores-resource',
  'slow-duration-reduction',
  'gem-strength-in-this-item', // TODO: Figure out how to handle this (if its in the game)
  'crafting-material-drop-rate',

  /*--------------------------------------------------
                    Gem Only Modifiers
  --------------------------------------------------*/
  'damage-reduction-while-control-impaired',

  /*--------------------------------------------------
                    HELPER MODIFIERS
      --------------------------------------------------*/
  // Not actual modifier but are also set based on gear.

  // Barbarian
  'one-hand-slashing-damage',
  'one-hand-bludgeon-damage',
  'two-hand-slashing-damage',
  'two-hand-bludgeon-damage',
  'main-hand-attack-speed',
  'off-hand-attack-speed',
  'two-hand-slashing-attack-speed',
  'two-hand-bludgeon-attack-speed',
  'main-hand-weapon', // 0 sword, 1 axe, 2 mace
  'off-hand-weapon', // 0 sword, 1 axe, 2 mace
  'two-hand-slashing-weapon', // 0 sword, 1 axe, 2 polearm
  'two-hand-bludgeon-weapon', // 0 mace

  // Mage/Druid/Necromancer
  'weapon-damage',
  'weapon-attack-speed',

  // Rogue
  'dual-wield-weapon-damage',
  'ranged-weapon-damage',
  'ranged-weapon-attack-speed', // Raw Ranged Weapon Attack Speed
  'dual-wield-attack-speed', // Raw Weapon Attack Speed
  'main-hand-weapon', // 0 sword, 1 dagger
  'off-hand-weapon', // 0 sword, 1 dagger
  'ranged-weapon', // 0 bow, 1 crossbow
]

// This creates a map from the modifier name above to a modifier node with its name. Used to look up
// nodes and add dependencies.
export function CreateModifierNodes(): Record<string, ModifierNode> {
  const nodes: Record<string, ModifierNode> = {}
  for (const key of ModifierNames) {
    nodes[key] = new ModifierNode(key)
  }
  return nodes
}

const ParagonModifierNames: string[] = [
  /*--------------------------------------------------
                    OFFENSIVE MODIFIERS
    --------------------------------------------------*/

  // S2 New Mods
  'damage-', // Tears of Blood Glyph
  'damage-with-earthquakes', // rumble glyph
  'damage-with-dust-devils', // twister glyph
  'damage-with-ice-spikes', // stalagmite glyph
  'damage-with-stun-grenade', //explosive glyph
  'damage-with-lightning-bolts', // electrocution glyph
  'corpse-skill-damage', // exhumation glyph
  'damage-with-desecrated-ground', // desecration glyph

  // Generic Damage
  'burning-damage',
  'cold-damage',
  'damage',
  'damage-for-4-seconds-after-dodging-an-attack',
  'damage-to-affected-by-shadow-damage-over-time-enemies',
  'damage-to-bleeding-enemies',
  'damage-to-burning-enemies',
  'damage-to-chilled-enemies',
  'damage-to-close-enemies',
  'damage-to-crowd-controlled-enemies',
  'damage-to-distant-enemies',
  'damage-to-elites',
  'damage-for-4-seconds-after-killing-an-elite',
  'damage-to-healthy-enemies',
  'damage-to-injured-enemies',
  'damage-to-poisoned-enemies',
  'damage-to-stun-enemies',
  'damage-to-slowed-enemies',
  'damage-to-trap-enemies',
  'damage-while-berserking',
  'damage-while-fortified',
  'damage-while-golem-active',
  'damage-while-healthy',
  'damage-while-in-werebear-form',
  'damage-while-werebear',
  'damage-while-werewolf',
  'damage-while-human',
  'fire-damage',
  'fire-damage-over-time',
  'lightning-damage',
  'non-physical-damage',
  'physical-damage',
  'physical-damage-over-time',
  'poison-damage',
  'shadow-damage',
  'shadow-damage-over-time',
  'damage-for-4-seconds-after-picking-up-a-blood-orb',

  // Skill Damage
  'basic-skill-damage',
  'bone-skill-damage',
  'conjuration-skill-damage',
  'core-skill-damage',
  'damage-with-axe',
  'damage-with-sword',
  'damage-with-mace',
  'damage-with-polearm',
  'damage-with-onehanded',
  // 'damage-with-twohanded-bludgeoning-weapons',
  // 'damage-with-twohanded-slashing-weapons',
  'damage-with-two-handed-slashing-weapons',
  'damage-with-two-handed-bludgeoning-weapons',
  'earth-skill-damage',
  'imbued-skill-damage',
  'nature-magic-skill-damage',
  'shapeshifting-skill-damage', // paragon only
  'mastery-skill-damage',
  'storm-skill-damage',
  'trap-skill-damage',
  'werebear-skill-damage',
  'werewolf-skill-damage',
  'damage-with-skills-that-swap-to-new-weapons',

  // Attack Speed
  'attack-speed',

  // Critical Strikes
  'critical-strike-chance-with-bone-skills',
  'critical-strike-damage',
  'critical-strike-damage-to-crowd-controlled-enemies',
  'critical-strike-damage-with-bone-skills',
  'critical-strike-damage-with-earth-skills',
  'critical-strike-damage-with-werewolf-skills',
  'critical-strike-damage-with-onehanded',
  'critical-strike-damage-with-core-skills',

  // Overpower
  'overpower-damage',
  'overpower-chance', // TODO: Add it in

  // Vulnerable
  'vulnerable-damage',

  // Lucky Hit
  'lucky-hit-chance',

  /*--------------------------------------------------
                  DEFENSIVE MODIFIERS
    --------------------------------------------------*/

  // Health Related
  'blood-orb-healing',
  'fortify-generation',
  'healing-over-time',
  'healing-received',
  'maximum-life',
  '%-maximum-life',
  'life-regeneration-while-not-damaged-recently',

  // Resistances
  'cold-resistance',
  'fire-resistance',
  'lightning-resistance',
  'poison-resistance',
  'resistance-to-all-elements',
  'shadow-resistance',

  // Armor
  'armor',
  'total-armor-while-golem-are-active',
  'total-armor-while-in-werebear-form',
  'total-armor-while-in-werewolf-form',

  // Damage Reduction
  'damage-reduction-for-your-minions',
  'damage-reduction-from-affected-by-shadow-damage-over-time-enemies',
  'damage-reduction-from-bleeding-enemies',
  'damage-reduction-from-burning-enemies',
  'damage-reduction-from-chilled-enemies',
  'damage-reduction-from-close-enemies',
  'damage-reduction-from-distant-enemies',
  'damage-reduction-from-elites',
  'damage-reduction-from-enemies-affected-by-trap-skills',
  'damage-reduction-from-poisoned-enemies',
  'damage-reduction-from-slowed-enemies',
  'damage-reduction-from-vulnerable-enemies',
  'damage-reduction-while-fortified',
  'damage-reduction-while-healthy',
  'damage-taken-over-time-reduction',

  /*--------------------------------------------------
                  MISCELLANEOUS MODIFIERS
    --------------------------------------------------*/

  // Resource
  'essence-on-kill',
  'fury-on-kill',
  'spirit-on-kill',
  'mana-on-kill',
  'energy-on-kill',
  'maximum-essence',
  'maximum-fury',
  'maximum-mana',
  'maximum-spirit',
  'maximum-energy',

  // Cooldowns:
  'imbuement-cooldown-reduction',
  'trap-cooldown-reduction',
  'shout-cooldown-reduction',
  'storm-cooldown-reduction', // TODO: Add it in,
  'rain-of-arrows-cooldown-reduction', // TODO: Add it in,

  // Attributes
  'dexterity',
  'intelligence',
  'strength',
  'willpower',

  // Movement
  'movement-speed-for-seconds-after-killing-an-elite',

  // Other
  'berserking-duration',
  'chill-application',
  'control-impaired-duration-reduction',
  'crackling-energy-damage',
  'empty',
  'golem-armor',
  'golem-attack-speed',
  'golem-damage',
  'golem-maximum-life',
  'golem-resistance-to-all-elements',
  'maximum-minion-life',
  'minion-armor',
  'minion-attack-speed',
  'minion-damage',
  'potion-healing',
  'skeletonmage-damage',
  'minion-resistance-to-all-elements',
  'skeletonmage-resistance-to-all-elements',
  'skeletonwarrior-armor',
  'skeletonwarrior-damage',
  'lucky-hit:-up-to-a-chance-to-execute-injured-non-elites',
  'reduces-the-arm-time-of-your-trap-by-second',
  'mount-armor',
]

// This creates a map from the paragon name above to a paragon node with its name. Used to look up
// nodes and add dependencies.
export function CreateParagonModifierNodes(): Record<
  string,
  ParagonNode
> {
  const nodes: Record<string, ParagonNode> = {}
  for (const key of ParagonModifierNames) {
    nodes[key] = new ParagonNode(key, 'number')
  }
  return nodes
}

/* --------------------------------------------------------------------------
                      Vampiric Powers
----------------------------------------------------------------------------*/
export function CreateVampiricNodes(): Record<string, VampiricNode> {
  return {
    // Vampiric Curse: Killing an enemy affected by your Vampiric Curse stores their soul. Casting a Defensive, Macabre, or Agility Skill will unleash stored souls to attack nearby enemies. You can hold up to 8 souls.
    // Assuming 60% Physical Damage for now. Real Value Unknown

    // Your Ultimate Skills gain 20% Cooldown Reduction. Your Ultimate Skills gain 12% increased damage for each nearby enemy affected by your Damage Over Time effects.
    anticipation: new VampiricNode('anticipation'),

    // Your Conjuration, Companion, Minion, and Bat Familiar attacks deal 52% increased damage to Crowd Controlled enemies. Lucky Hit: Your Conjuration, Companion, Minion, and Bat Familiar have up to a 30% chance to inflict Vampiric Curse when hitting enemies.
    // covens-fangs
    'covens-fangs': new VampiricNode('covens-fangs'),

    // You deal 24% increased damage to enemies who are Stunned, Immobilized, Frozen, or Feared. If they're also Injured and not an Elite, they're instantly killed.
    // domination
    domination: new VampiricNode('domination'),

    // Lucky Hit: Conjuration, Companion, Minion and Bat Familiar attacks have up to a 60% chance to restore 10 Primary Resource to you and increase your Damage by 10% for 4 seconds.
    // feed-the-coven
    'feed-the-coven': new VampiricNode('feed-the-coven'),

    // For every 5 Basic Skills you cast, one of your active Cooldowns is reduced by 2 seconds.
    // hectic
    hectic: new VampiricNode('hectic'),

    // Your attacks deal 80% of your Maximum Life as Physical damage to nearby enemies. This can only occur once every 4 seconds. You heal for 1% of your Maximum Life for each enemy damaged this way.
    // hemomancy
    hemomancy: new VampiricNode('hemomancy'),

    // Hitting enemies with direct damage infects them with Pox. Inflicting Pox 8 times on an enemy expunges their infection, dealing 70% Poison damage.
    // infection
    infection: new VampiricNode('infection'),

    // Thorns have a 10% chance to deal 300% increased damage and Chill enemies for 8%.
    // jagged-spikes
    'jagged-spikes': new VampiricNode('jagged-spikes'),

    // You deal 16% increased damage to Vulnerable enemies. Enemies are Vulnerable while affected by a Vampiric Curse from your other Vampiric Powers.
    // prey-on-the-weak
    'prey-on-the-weak': new VampiricNode('prey-on-the-weak'),

    // After not moving for 3 seconds, you gain a Barrier for 40% of your Maximum Life for 6 seconds. This effect can occur once every 20 seconds.
    // rampart
    rampart: new VampiricNode('rampart'),

    // Lucky Hit: Up to a 20% chance to increase your Attack Speed by 40% of your Total Movement Speed for 6 seconds.
    // ravenous
    ravenous: new VampiricNode('ravenous'),

    // You gain 1% Damage Reduction for each 2% Life you are missing.
    // resilience
    resilience: new VampiricNode('resilience'),

    // When you kill an enemy, Fortify for 6% of your Base Life. While you have more Fortify than half of your Maximum Life, you gain 8% Critical Strike Chance.
    // sanguine-brace
    'sanguine-brace': new VampiricNode('sanguine-brace'),

    // When struck, you have a 14% chance to Fear nearby enemies and Slow them by 80% for 2 seconds. You are guaranteed to Critically Strike enemies who are Feared.
    // terror
    terror: new VampiricNode('terror'),

    // Casting Skills heals you for 3% Life. Double this bonus while below 50% Life.
    // undying
    undying: new VampiricNode('undying'),

    // Lucky Hit: Up to a 44% chance to inflict Vampiric Curse on enemies. Enemies with the Vampiric Curse have a 15% chance to spread it to other surrounding enemies. Accursed Souls deal 200% increased damage.
    // accursed-touch
    'accursed-touch': new VampiricNode('accursed-touch'),

    // While Channeling a Skill, you form a pool of blood beneath you. While channeling a skill in a pool, your Channeled Skills deal 40% increased damage and you gain 30% Damage Reduction. A pool can only form once every 8 seconds.
    // bathe-in-blood
    'bathe-in-blood': new VampiricNode('bathe-in-blood'),

    // When your Core Skills Overpower an enemy, you spawn 3 Volatile Blood Drops. Collecting a Volatile Blood Drop causes it to explode, dealing 60% Physical damage around you. Every 20 seconds, your next Skill is guaranteed to Overpower.
    // blood-boil
    'blood-boil': new VampiricNode('blood-boil'),

    // Casting a Mastery, Weapon Mastery, Macabre, Wrath, or Imbuement Skill calls a bat ally to attack nearby enemies, dealing 80% Physical damage with a 30% chance to Stun.	call-familiar
    // You deal 60% increased Damage Over Time to enemies that are moving or affected by a Vampiric Curse.
    // flowing-veins
    'flowing-veins': new VampiricNode('flowing-veins'),

    // When you Evade you turn into a cloud of bats, becoming Unstoppable for 4 seconds. Enemies along your path take 160% Physical damage and are inflicted with Vampiric Curse.
    // metamorphosis
    metamorphosis: new VampiricNode('metamorphosis'),

    // Hitting an enemy with a Basic Skill grants you 4% Attack Speed for 10 seconds, stacking up to 5 times. Upon reaching maximum stacks, you enter a Vampiric Bloodrage, gaining 160% Basic Skill damage and 15% Movement Speed for 10 seconds.
    // moonrise
    moonrise: new VampiricNode('moonrise'),
  }
}
/* ------------------------------------------------------------------------------------------------------------------------------- */
