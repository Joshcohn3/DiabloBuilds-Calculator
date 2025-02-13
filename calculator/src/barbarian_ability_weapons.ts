// This object stores the allowed assignable weapons for each ability.
// The empty array means that no weapons can be assigned to that ability.
// Note that some of these abilities should technically only be allowed
// to use dual-wield if the weapons are slashing or bludgeoning, but we
// allow players to shoot themselved in the foot if they want to.
export const BarbarianAbilityWeapons: Record<string, string[]> = {
  'lunging-strike': [
    'dual-wield',
    'two-handed-slashing',
    'two-handed-bludgeoning',
  ],
  bash: ['dual-wield', 'two-handed-bludgeoning'],
  frenzy: ['dual-wield'],
  flay: ['dual-wield', 'two-handed-slashing'],
  whirlwind: [
    'dual-wield',
    'two-handed-slashing',
    'two-handed-bludgeoning',
  ],
  'Hammer-of-the-ancients': ['two-handed-bludgeoning'],
  upheaval: ['two-handed-slashing', 'two-handed-bludgeoning'],
  'double-swing': ['dual-wield'],
  rend: ['dual-wield', 'two-handed-slashing'],
  'ground-stomp': [
    'dual-wield',
    'two-handed-slashing',
    'two-handed-bludgeoning',
  ],
  'rallying-cry': [],
  'iron-skin': [],
  'challenging-shout': [],
  kick: [
    'dual-wield',
    'two-handed-slashing',
    'two-handed-bludgeoning',
  ],
  'war-cry': [],
  charge: [
    'dual-wield',
    'two-handed-slashing',
    'two-handed-bludgeoning',
  ],
  leap: [
    'dual-wield',
    'two-handed-slashing',
    'two-handed-bludgeoning',
  ],
  rupture: ['dual-wield', 'two-handed-slashing'],
  'steel-grasp': [
    'dual-wield',
    'two-handed-slashing',
    'two-handed-bludgeoning',
  ],
  'death-blow': [
    'dual-wield',
    'two-handed-slashing',
    'two-handed-bludgeoning',
  ],
  'call-of-the-ancients': [],
  'iron-maelstrom': [],
  'wrath-of-the-berserker': [],
}
