export const CLASS_MECHANICS_TABLE = `id,class,type,subType,name,slug,value,description,description2
1,Barbarian,Expertise,,One-Handed Sword Expertise,sword,,When using any weapon: Lucky Hit: Up to a 20% chance to gain 5 Fury when hitting a Crowd Controlled Enemy,
2,Barbarian,Expertise,,One-Handed Axe Expertise,axe,,When using any weapon: +10.0% increased Critical Strike Chance against Injured enemies.,
3,Barbarian,Expertise,,One-Handed Mace Expertise,mace,,When using any weapon: x20% increased damage to Stunned enemies.,
4,Barbarian,Expertise,,Two-Handed Sword Expertise,two-handed-sword,,When using any weapon: +20% of direct damage you deal is inflicted as Bleeding damage over 5 seconds.,
5,Barbarian,Expertise,,Two-Handed Axe Expertise,two-handed-mace,,When using any weapon: x15.0% increased damage to Vulnerable enemies.,
6,Barbarian,Expertise,,Two-Handed Mace Expertise,two-handed-axe,,When using any weapon: Lucky Hit: Up to a 10% chance to gain 2 Fury when hitting an enemy. Double the amount of Fury gained while Berserking.,
7,Barbarian,Expertise,,Polearm Expertise,polearm,,When using any weapon: x10% Increased Lucky Hit Chance.,
8,Sorcerer,Enchantment,basic,Arc Lash Enchantment,arc-lash,0.5,"When you use a Cooldown, enemies are you are Stunned for {value} seconds.",
9,Sorcerer,Enchantment,basic,Spark Enchantment,spark,14,Killing an enemy has a {value} chance to form a Crackling Energy.,
10,Sorcerer,Enchantment,basic,Fire Bolt Enchantment,fire-bolt,23,Direct damage from Skills applies up to an additional {value}% [Damage] Burning damage over 8 seconds.,
11,Sorcerer,Enchantment,basic,Frost Bolt Enchantment,frost-bolt,15,Direct damage from Skills applies up to {value}% Chill.,
12,Sorcerer,Enchantment,core,Incinerate Enchantment,incinerate,14,"Every {value} seconds, a serpent spawns and Incinerates enemies for 8 seconds.",
13,Sorcerer,Enchantment,core,Fireball Enchantment,fireball,50,"When you kill an enemy, they explode in a Fireball for {value}% of its damage.",
14,Sorcerer,Enchantment,core,Frozen Orb Enchantment,frozen-orb,30,"Whenever you cast a Non-Basic Skill, you have a {value}% chance to launch a Frozen Orb at a Nearby enemy.",
15,Sorcerer,Enchantment,core,Ice Shards Enchantment,ice-shards,0,Ice Shards automatically conjure and fly towards Frozen Enemies,
16,Sorcerer,Enchantment,core,Chain Lightning Enchantment,chain-lightning,100,Chain Lightning forms automatically after spending {value} mana.,
17,Sorcerer,Enchantment,core,Charged Bolts Enchantment,charged-bolts,40,"When you Stun an enemy, theres a {value}% chance to release 3 Charged Bolts from them.",
18,Sorcerer,Enchantment,defensive,Flame Shield Enchantment,flame-shield,120,Flame Shield automatically activates when you take fatal damage. Can only happen once every {value} seconds.,
19,Sorcerer,Enchantment,defensive,Teleport Enchantment,teleport,17,Evade is replaced with a short range Teleport on a {value} second cooldown.,
20,Sorcerer,Enchantment,defensive,Ice Armor Enchantment,ice-armor,5,"Upon getting hit, you have a {value}% chance to apply Ice Armor.",
21,Sorcerer,Enchantment,defensive,Frost Nova Enchantment,frost-nova,30,Lucky Hit: Your Conjuration Skills have up to a {value}% chance to unleash a Frost Nova when hitting enemies.,
22,Sorcerer,Enchantment,conjuration,Hydra Enchantment,hydra,200,"After Spending {value} Mana, a 5-headed Hydra Spawns for 5 seconds",
23,Sorcerer,Enchantment,conjuration,Ice Blades Enchantment,ice-blades,40,"For every {value} seconds in Cooldowns you spend, you spawn an Ice Blades on a random enemy.",
24,Sorcerer,Enchantment,conjuration,Lightning Spear Enchantment,lightning-spear,10,Absorbing Crackling Energy has a {value}% chance to conjure a Lightning Spear,
25,Sorcerer,Enchantment,mastery,Blizzard Enchantment,blizzard,15,"Every {value} seconds, a Blizzard forms over you and follows you for 6 seconds.",
26,Sorcerer,Enchantment,mastery,Meteor Enchantment,meteor,8,Lucky Hit: Up to a {value}% chance for a meteor to fall on enemies.,
27,Sorcerer,Enchantment,mastery,Firewall Enchantment,firewall,5,"Each time an enemy takes Burning damage, there's a {value}% chance to spawn 2 Firewalls underneath them for 3 seconds.",
28,Sorcerer,Enchantment,mastery,Ball Lightning Enchantment,ball-lightning,25,Lucky Hit: Critical Strikes have up to a {value}% chance to spawn a static Ball Lightning.,
29,Necromancer,Skeletal Warriors,Skirmishers,Skirmishers Upgrade 1,"skeletalWarriors: ['skirmishers', 1]",,Sword-wielding skeletal minions that deal 30% increased damage but have 15% reduced Life.,You can raise one additional Skirmisher Warrior.
30,Necromancer,Skeletal Warriors,Skirmishers,Skirmishers Upgrade 2,"skeletalWarriors: ['skirmishers', 2]",,Sword-wielding skeletal minions that deal 30% increased damage but have 15% reduced Life.,"Each time you Critically Strike, your Skirmishers Warriors' next attack Critically Strikes and deals x50% bonus Critical Strike damage. Can only happen every 3 seconds."
31,Necromancer,Skeletal Warriors,Skirmishers,Skirmishers Sacrifice,"skeletalWarriors: ['skirmishers', 3]",,Sword-wielding skeletal minions that deal 30% increased damage but have 15% reduced Life.,"Your Critical Strike Chance is increased by +5%, but you can no longer raise Skeletal Warriors."
32,Necromancer,Skeletal Warriors,Defenders,Defenders Upgrade 1,"skeletalWarriors: ['defenders', 1]",,Durable shield-bearers with 15% increased Life.,Every 6 seconds your Skeletal Defenders negate the next instance of Direct Damage they would take.
33,Necromancer,Skeletal Warriors,Defenders,Defenders Upgrade 2,"skeletalWarriors: ['defenders', 2]",,Durable shield-bearers with 15% increased Life.,Increase the amount of Thorns that Defender Warriors inhereit from you from 40% to 50%.
34,Necromancer,Skeletal Warriors,Defenders,Defenders Sacrifice,"skeletalWarriors: ['defenders', 3]",,Durable shield-bearers with 15% increased Life.,"You gain 15% Non-Physical Resistance, but you can no longer raise Skeletal Warriors."
35,Necromancer,Skeletal Warriors,Reapers,Reapers Upgrade 1,"skeletalWarriors: ['reapers', 1]",,"Wields a powerful scythe that has a special wind-up attack, dealing heavy damage every 10 seconds.","Reaper attacks against enemies who are Immobilized, Slowed, Stunned, or Vulnerable reduce the cooldown of their powerful wind-up-attack by 2 seconds."
36,Necromancer,Skeletal Warriors,Reapers,Reapers Upgrade 2,"skeletalWarriors: ['reapers', 2]",,"Wields a powerful scythe that has a special wind-up attack, dealing heavy damage every 10 seconds.","Reapers have a 15% chance to carve the flesh off enemies, forming a corpse."
37,Necromancer,Skeletal Warriors,Reapers,Reapers Sacrifice,"skeletalWarriors: ['reapers', 3]",,"Wields a powerful scythe that has a special wind-up attack, dealing heavy damage every 10 seconds.","You deal x15% increased Shadow damage, but you can no longer raise Skeletal Warriors."
38,Necromancer,Skeletal Mages,Shadow,Shadow Upgrade 1,"skeletalMages: ['shadow', 1]",,Shadow Mages wield power from the beyond dealing moderate Shadow damage.,Shadow Mage attacks have a 10% chance to Stun for 2 seconds. This cannot happen on the same enemy more than once every 5 seconds.
39,Necromancer,Skeletal Mages,Shadow,Shadow Upgrade 2,"skeletalMages: ['shadow', 2]",,Shadow Mages wield power from the beyond dealing moderate Shadow damage.,Shadow Mages fire an additional shadowbolt every 4th attack.
40,Necromancer,Skeletal Mages,Shadow,Shadow Sacrifice,"skeletalMages: ['shadow', 3]",,Shadow Mages wield power from the beyond dealing moderate Shadow damage.,"Your Maximum Essence is increased by 15%, but you can no longer raise Skeletal Mages."
41,Necromancer,Skeletal Mages,Cold,Cold Upgrade 1,"skeletalMages: ['cold', 1]",,Cold Mages attacks will chill enemies eventually freezing them in their tracks.,"Each time your Cold Mages damage enemies with their primary attack, you gain 2 Essence."
42,Necromancer,Skeletal Mages,Cold,Cold Upgrade 2,"skeletalMages: ['cold', 2]",,Cold Mages attacks will chill enemies eventually freezing them in their tracks.,Enemies who are frozen by or damaged while Frozen by your Cold Mages' primary attack are made Vulnerable for 4 seconds.
43,Necromancer,Skeletal Mages,Cold,Cold Sacrifice,"skeletalMages: ['cold', 3]",,Cold Mages attacks will chill enemies eventually freezing them in their tracks.,"You deal x15% increased damage to Vulnerable enemies, but you can no longer raise Skeletal Mages."
44,Necromancer,Skeletal Mages,Bone,Bone Upgrade 1,"skeletalMages: ['bone', 1]",,"Bone mages use their own bodies as projectiles, dealing heavy damage at the cost of their own Life.","Reduce the Life cost of your Bone Mages' attacks from 15% to 10%. After being alive for 5 seconds, Bone Mages deal x40% increases damage."
45,Necromancer,Skeletal Mages,Bone,Bone Upgrade 2,"skeletalMages: ['bone', 2]",,"Bone mages use their own bodies as projectiles, dealing heavy damage at the cost of their own Life.","Each time a Bone Mage dies from its own attack, they leave behind a corpse and Fortify you for 20% of your base life."
46,Necromancer,Skeletal Mages,Bone,Bone Sacrifice,"skeletalMages: ['bone', 3]",,"Bone mages use their own bodies as projectiles, dealing heavy damage at the cost of their own Life.","Your overpower damage is increased by x40%, but you can no longer raise Skeletal Mages."
47,Necromancer,Golem,Bone,Golem Bone Upgrade 1,"golem: ['bone', 1]",,"A horrid protector that taunts enemies, forcing them to attack the Golem.","Each time your Bone Golem takes up to 20% of its Maximum Life as damage, it sheds a corpse."
48,Necromancer,Golem,Bone,Golem Bone Upgrade 2,"golem: ['bone', 2]",,"A horrid protector that taunts enemies, forcing them to attack the Golem.",Your Bone Golem gains 10% Maximum Life and the amount of Thorns they inherit from you is increased from 30% to 50%.
49,Necromancer,Golem,Bone,Golem Bone Sacrifice,"golem: ['bone', 3]",,"A horrid protector that taunts enemies, forcing them to attack the Golem.","You gain +10% increased Attack Speed, but you lose the ability to summon a Golem."
50,Necromancer,Golem,Blood,Golem Blood Upgrade 1,"golem: ['blood', 1]",,Drains Life from nearby enemies to heal and bolster itself.,Your Blood Golem absorbs 15% of damage you would take.
51,Necromancer,Golem,Blood,Golem Blood Upgrade 2,"golem: ['blood', 2]",,Drains Life from nearby enemies to heal and bolster itself.,"While Healthy, your Blood Golem gains 25% Damage Reduction and x50% increased damage."
52,Necromancer,Golem,Blood,Golem Blood Sacrifice,"golem: ['blood', 3]",,Drains Life from nearby enemies to heal and bolster itself.,"Your Maximum Life is increased by x10%, but you lose the ability to summon a Golem."
53,Necromancer,Golem,Iron,Golem Iron Upgrade 1,"golem: ['iron', 1]",,An amalgamation of steel that slams the ground and Stuns enemies.,"Every 4th Iron Golem attacks causes a shockwave, dealing [30%] damage to the primary enemy and to enemies behind them."
54,Necromancer,Golem,Iron,Golem Iron Upgrade 2,"golem: ['iron', 2]",,An amalgamation of steel that slams the ground and Stuns enemies.,Your Iron Golem's slam attack also makes enemies Vulnerable for 3 seconds.
55,Necromancer,Golem,Iron,Golem Iron Sacrifice,"golem: ['iron', 3]",,An amalgamation of steel that slams the ground and Stuns enemies.,"You deal x30% increased Critical Strike Damage, but you lose the ability to summon a Golem."
56,Rogue,Specialization,,Combo Points,combo-points,,Your Basic Skills now generate Combo Points. Core Skills consume Combo Points for additional effects.,
57,Rogue,Specialization,,Inner Sight,inner-sight,,"Attack marked enemies to fill up your Inner Sight gauge. When it's full, gain unlimited Energy for 4 seconds.",
58,Rogue,Specialization,,Preparation,preparation,,Every 100 Energy you spend reduces your Ultimate Skill's Cooldown by 4 seconds. Using an Ultimate Skill resets the Cooldowns of your other Skills.,
59,Druid,Spirit Boon,Deer,Prickleskin,prickleskin,,Gain +15% of Base Life Thorns.,
60,Druid,Spirit Boon,Deer,Gift of the Stag,gift-of-the-stag,,Gain +10 Maximum Spirit.,
61,Druid,Spirit Boon,Deer,Wariness,wariness,,Take 10% reduced damage from Elites.,
62,Druid,Spirit Boon,Deer,Advantageous Beast,advantageous-beast,,Reduce the duration of Control Impariting Effects by 15%.,
63,Druid,Spirit Boon,Eagle,Scythe Talons,scythe-talons,,Gain +5% increased Critical Strike Chance.,
64,Druid,Spirit Boon,Eagle,Iron Feather,iron-feather,,Gain x14% Maximum Life,
65,Druid,Spirit Boon,Eagle,Swooping Attacks,swooping-attacks,,Gain +10% Attack Speed.,
66,Druid,Spirit Boon,Eagle,Avian Wrath,avian-wrath,,Gain x30% Critical Strike Damage.,
67,Druid,Spirit Boon,Wolf,Packleader,packleader,,Lucky Hit: Critical Strikes have up to a 20% chance to reset the Cooldowns of your Companion Skills.,
68,Druid,Spirit Boon,Wolf,Energize,energize,,Lucky Hit: Dealing damage has up to a 15% chance to restore 10 Spirit.,
69,Druid,Spirit Boon,Wolf,Bolster,bolster,,Fortify for 15% of your Maximum Life when you use a Defensive Skill.,
70,Druid,Spirit Boon,Wolf,Calamity,calamity,,Extend the duration of Ultimate Skills by 25%.,
71,Druid,Spirit Boon,Snake,Obsidian Slam,obsidian-slam,,Every 20th kill will cause your next Earth Skill to Overpower.,
72,Druid,Spirit Boon,Snake,Overload,overload,,"Lucky Hit: Dealing Lightning damage has up to a 40% chance to cause the target to emit a static discharge, dealing 25% [Damage] Lightning damage to surrounding enemies.",
73,Druid,Spirit Boon,Snake,masochistic,masochistic,,Lucky Hit: Up to a 75% that Critical Strikes with Shapeshifting Skills heal you for 3% Maximum Life.,
74,Druid,Spirit Boon,Snake,Calm Before the Storm,calm-before-the-storm,,Lucky Hit: Nature Magic Skills have up to a 10% chance to reduce the Cooldown of your Ultimate Skill by 2 seconds.,
`
