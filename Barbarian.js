"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CreateBarbarianAspectToToggleMap = exports.CreateBarbarianTalentToToggleMap = exports.CreateBarbarianSkillToToggleMap = exports.CreateBarbarianToggleMap = exports.Barbarian = void 0;
const player_character_1 = require("./player_character");
const equipment_1 = require("./equipment");
const toggles_1 = require("./toggles");
class Barbarian extends player_character_1.PlayerCharacter {
    constructor(level) {
        super(level);
        this._equipment["two_hand_bludgeon_weapon"] = null;
        this._equipment["two_hand_slashing_weapon"] = null;
        this._player_talents = {
            'Flay': [0, 5],
            'Enhanced Flay': [0, 1],
            'Battle Flay': [0, 1],
            'Combat Flay': [0, 1],
            'Frenzy': [0, 5],
            'Enhanced Frenzy': [0, 1],
            'Battle Frenzy': [0, 1],
            'Combat Frenzy': [0, 1],
            'Bash': [0, 5],
            'Enhanced Bash': [0, 1],
            'Battle Bash': [0, 1],
            'Combat Bash': [0, 1],
            'Lunging Strike': [0, 5],
            'Enhanced Lunging Strike': [0, 1],
            'Battle Lunging Strike': [0, 1],
            'Combat Lunging Strike': [0, 1],
            'Whirlwind': [0, 5],
            'Enhanced Whirlwind': [0, 1],
            'Violent Whirlwind': [0, 1],
            'Furious Whirlwind': [0, 1],
            'Hammer of the Ancients': [0, 5],
            'Enhanced Hammer of the Ancients': [0, 1],
            'Violent Hammer of the Ancients': [0, 1],
            'Furious Hammer of the Ancients': [0, 1],
            'Pressure Point': [0, 3],
            'Endless Fury': [0, 3],
            'Upheaval': [0, 5],
            'Enhanced Upheaval': [0, 1],
            'Violent Upheaval': [0, 1],
            'Furious Upheaval': [0, 1],
            'Double Swing': [0, 5],
            'Enhanced Double Swing': [0, 1],
            'Violent Double Swing': [0, 1],
            'Furious Double Swing': [0, 1],
            'Rend': [0, 5],
            'Enhanced Rend': [0, 1],
            'Violent Rend': [0, 1],
            'Furious Rend': [0, 1],
            'Ground Stomp': [0, 5],
            'Enhanced Ground Stomp': [0, 1],
            'Tactical Ground Stomp': [0, 1],
            'Strategic Ground Stomp': [0, 1],
            'Rallying Cry': [0, 5],
            'Enhanced Rallying Cry': [0, 1],
            'Tactical Rallying Cry': [0, 1],
            'Strategic Rallying Cry': [0, 1],
            'Iron Skin': [0, 5],
            'Enhanced Iron Skin': [0, 1],
            'Tactical Iron Skin': [0, 1],
            'Strategic Iron Skin': [0, 1],
            'Challenging Shout': [0, 5],
            'Enhanced Challenging Shout': [0, 1],
            'Tactical Challenging Shout': [0, 1],
            'Strategic Challenging Shout': [0, 1],
            'Imposing Presence': [0, 3],
            'Martial Vigor': [0, 3],
            'Outburst': [0, 3],
            'Tough as Nails': [0, 3],
            'Kick': [0, 5],
            'Enhanced Kick': [0, 1],
            'Mighty Kick': [0, 1],
            'Power Kick': [0, 1],
            'War Cry': [0, 5],
            'Enhanced War Cry': [0, 1],
            'Mighty War Cry': [0, 1],
            'Power War Cry': [0, 1],
            'Charge': [0, 5],
            'Enhanced Charge': [0, 1],
            'Mighty Charge': [0, 1],
            'Power Charge': [0, 1],
            'Leap': [0, 5],
            'Enhanced Leap': [0, 1],
            'Mighty Leap': [0, 1],
            'Power Leap': [0, 1],
            'Swiftness': [0, 3],
            'Quick Impulses': [0, 3],
            'Booming Voice': [0, 3],
            'Raid Leader': [0, 3],
            'Guttural Yell': [0, 3],
            'Aggressive Resistance': [0, 3],
            'Battle Fervor': [0, 3],
            'Prolific Fury': [0, 3],
            'Death Blow': [0, 5],
            'Enhanced Death Blow': [0, 1],
            "Warrior's Death Blow": [0, 1],
            "Fighter's Death Blow": [0, 1],
            'Rupture': [0, 5],
            'Enhanced Rupture': [0, 1],
            "Warrior's Rupture": [0, 1],
            "Fighter's Rupture": [0, 1],
            'Steel Grasp': [0, 5],
            'Enhanced Steel Grasp': [0, 1],
            "Warrior's Steel Grasp": [0, 1],
            "Fighter's Steel Grasp": [0, 1],
            'Pit Fighter': [0, 3],
            'No Mercy': [0, 3],
            'Slaying Strike': [0, 3],
            'Expose Vulnerability': [0, 3],
            'Hamstring': [0, 3],
            'Cut to the Bone': [0, 3],
            'Thick Skin': [0, 3],
            'Defensive Stance': [0, 3],
            'Counteroffensive': [0, 3],
            "Call of the Ancients": [0, 1],
            "Prime Call of the Ancients": [0, 1],
            "Supreme Call of the Ancients": [0, 1],
            "Iron Maelstrom": [0, 1],
            "Prime Iron Maelstrom": [0, 1],
            "Supreme Iron Maelstrom": [0, 1],
            "Wrath of the Berserker": [0, 1],
            "Prime Wrath of the Berserker": [0, 1],
            "Supreme Wrath of the Berserker": [0, 1],
            'Duelist': [0, 3],
            'Tempered Fury': [0, 3],
            'Furious Impulse': [0, 3],
            'Invigorating Fury': [0, 3],
            'Heavy Handed': [0, 3],
            'Brute Force': [0, 3],
            'Wallop': [0, 3],
            'Concussion': [0, 3],
            "Unconstrained": [0, 1],
            "Walking Arsenal": [0, 1],
            "Unbridled Rage": [0, 1],
            "Gushing Wounds": [0, 1]
        };
        this._toggle_maps = new toggles_1.ToggleMaps(CreateBarbarianToggleMap(), CreateBarbarianSkillToToggleMap(), CreateBarbarianTalentToToggleMap(), CreateBarbarianAspectToToggleMap());
        for (let toggle of Object.values(this._toggle_maps._toggle_map)) {
            if (this.SatisfiesToggleRequirements(toggle)) {
                toggle.SetActiveStatus = true;
            }
        }
    }
    // For Barbarian, the SetWeapon function is reserved for OneHandWeaponTypes.
    // TwoHandWeaponTypes should be set to "two_hand_slashing_weapon" or
    // "two_hand_bludgeon_weapon".
    // (TODO): Consider using the same function to clean up the class.
    set SetWeapon(weapon) {
        if (weapon.GetEquipmentType != "weapon") {
            throw "SetWeapon should not be used with equipment of type " + weapon.GetEquipmentType + "!";
        }
        if (!equipment_1.OneHandWeaponTypes.has(weapon.GetWeaponType)) {
            throw "Barbarians can only set one-hand weapons in this slot.";
        }
        this.RemoveWeapon();
        this._equipment.weapon = weapon;
        if (weapon._aspect != null) {
            this.AddAspect(weapon._aspect[0]);
        }
    }
    // For Barbarian, the offhand are also one-hand weapons.
    set SetOffHand(off_hand) {
        let weapon_type = off_hand.GetWeaponType;
        if (!equipment_1.OneHandWeaponTypes.has(weapon_type)) {
            throw "Barbarians can only set one-hand weapons in this slot.";
        }
        this.RemoveOffHand();
        this._equipment.off_hand = off_hand;
        if (off_hand._aspect != null) {
            this.AddAspect(off_hand._aspect[0]);
        }
    }
    set SetTwoHandSlashingWeapon(weapon) {
        if (weapon.GetEquipmentType != "weapon") {
            throw "SetWeapon should not be used with equipment of type " + weapon.GetEquipmentType + "!";
        }
        if (!equipment_1.TwoHandSlashingWeaponTypes.has(weapon.GetWeaponType)) {
            throw "Barbarians can only set two-hand slashing weapons in this slot.";
        }
        this.RemoveTwoHandSlashingWeapon();
        this._equipment.two_hand_slashing_weapon = weapon;
        if (weapon._aspect != null) {
            this.AddAspect(weapon._aspect[0]);
        }
    }
    RemoveTwoHandSlashingWeapon() {
        const weapon = this._equipment.two_hand_slashing_weapon;
        if (weapon == null) {
            return;
        }
        this._equipment.two_hand_slashing_weapon = null;
        let previous_aspect = weapon.GetAspect;
        if (previous_aspect != null) {
            this.RemoveAspect(previous_aspect[0]);
        }
    }
    set SetTwoHandBludgeonWeapon(weapon) {
        if (weapon.GetEquipmentType != "weapon") {
            throw "SetWeapon should not be used with equipment of type " + weapon.GetEquipmentType + "!";
        }
        if (!equipment_1.TwoHandBludgeonWeaponTypes.has(weapon.GetWeaponType)) {
            throw "Barbarians can only set two-hand bludgeon weapons in this slot.";
        }
        this.RemoveTwoHandBludgeonWeapon();
        this._equipment.two_hand_bludgeon_weapon = weapon;
        this._equipment.weapon = weapon;
        if (weapon._aspect != null) {
            this.AddAspect(weapon._aspect[0]);
        }
    }
    RemoveTwoHandBludgeonWeapon() {
        const weapon = this._equipment.two_hand_bludgeon_weapon;
        if (weapon == null) {
            return;
        }
        this._equipment.two_hand_bludgeon_weapon = null;
        let previous_aspect = weapon.GetAspect;
        if (previous_aspect != null) {
            this.RemoveAspect(previous_aspect[0]);
        }
    }
    // (TODO) Dont allow players to equip the same skill twice.
    SetBasicSkill(skill_name) {
        this.UpdateSkillToggles(skill_name, this._basic_ability_name);
        this._basic_ability_name = skill_name;
    }
    SetCoreSkill(skill_name) {
        this.UpdateSkillToggles(skill_name, this._basic_ability_name);
        this._core_ability_name = skill_name;
    }
}
exports.Barbarian = Barbarian;
function CreateBarbarianToggleMap() {
    // Enemy Status Toggles
    return {
        "Enemy_Boss": new toggles_1.Toggle("Enemy_Boss", "boolean", [], "Enemy is a boss."),
        "Enemy_Elite": new toggles_1.Toggle("Enemy_Elite", "boolean", [], "Enemy is an elite."),
        "Enemy_Vulnerable": new toggles_1.Toggle("Enemy_Vulnerable", "boolean", [], "Enemy is vulnerable."),
        "Enemy_Chilled": new toggles_1.Toggle("Enemy_Chilled", "boolean", [], "Enemy is chilled."),
        "Enemy_Frozen": new toggles_1.Toggle("Enemy_Frozen", "boolean", [], "Enemy is frozen."),
        // (TODO) Somehow avoid both being active at the same time.
        "Enemy_Healthy": new toggles_1.Toggle("Enemy_Healthy", "boolean", [], "Enemy Current Life > 80% Max Life."),
        "Enemy_Injured": new toggles_1.Toggle("Enemy_Injured", "boolean", [], "Enemy Current Life < 35% Max Life."),
        "Enemy_Slowed": new toggles_1.Toggle("Enemy_Slowed", "boolean", [], "Enemy is slowed."),
        "Enemy_Dazed": new toggles_1.Toggle("Enemy_Dazed", "boolean", [], "Enemy is dazed."),
        // Player Toggles
        "Storyline_Act": new toggles_1.Toggle("Storyline_Act", "number", [], "Storyline Act."),
        "Percent_Hitpoints": new toggles_1.Toggle("Percent_Hitpoints", "number", [], "Current hit point %."),
        "Percent_Fortify": new toggles_1.Toggle("Percent_Fortify", "number", [], "Current fortify %. If greater than health then Fortified."),
        "Dodged Recently": new toggles_1.Toggle("Dodged Recently", "boolean", [], "Player has Dodged Recently."),
        //(TODO) Berserking toggle.
        // Basic Skills
        "Battle Flay": new toggles_1.Toggle("Battle Flay", "boolean", ["skill:Flay", "talent:Battle Flay"], "Flay has dealt direct damage in last 3 seconds."),
        "Combat Flay Stacks": new toggles_1.Toggle("Combat Flay Stacks", "number", ["skill:Flay", "talent:Combat Flay"], "Number of stacks of Combat Flay."),
        "Frenzy Stacks": new toggles_1.Toggle("Frenzy Stacks", "number", ["skill:Frenzy"], "Number of current stacks of Frenzy. Maximum is 3."),
        //(TODO) Combat Bash toggle?
        // Core Skills
        "Violent Whirlwind": new toggles_1.Toggle("Whirlwind", "boolean", ["skill:Whirlwind", "talent:Violent Whirlwind"], "Whirlwind has been channeling for at least 2 seconds."),
        "Furious Hammer of the Ancients": new toggles_1.Toggle("Hammer of the Ancients", "number", ["skill:Hammer of the Ancients", "talent:Furious Hammer of the Ancients"], "Current Fury"),
        "Violent Hammer of the Ancients": new toggles_1.Toggle("Hammer of the Ancients", "boolean", ["skill:Hammer of the Ancients", "talent:Violent Hammer of the Ancients"], "Has Hammer of the Ancients Recently Been Overpowered?"),
        // (TODO) Enhanced Hammer of the Ancients? What about double swing? Player might be standing on top of enemy for the 2x damange.
        "Furious Upheaval": new toggles_1.Toggle("Upheaval", "number", ["skill:Upheaval", "talent:Furious Upheaval"], "Number of Furious Upheveal Stacks"),
        // Defensive Skills
        "Challenging Shout": new toggles_1.Toggle("Challenging Shout", "boolean", ["skill:Challenging Shout"], "Is Challenging Shout Active?"),
        "Iron Skin": new toggles_1.Toggle("Iron Skin", "boolean", ["skill:Iron Skin"], "Is Iron Skin Active?"),
        "Rallying Cry": new toggles_1.Toggle("Rallying Cry", "boolean", ["skill:Rallying Cry"], "Is Rallying Cry Active?"),
        // Brawling Skills
        "Mighty Kick": new toggles_1.Toggle("Mighty Kick", "boolean", ["skill:Kick", "talent:Mighty Kick"], "Will knocked enemies collide?"),
        "War Cry": new toggles_1.Toggle("War Cry", "boolean", ["skill:War Cry"], "Is War Cry active?"),
        "Power War Cry": new toggles_1.Toggle("War Cry", "boolean", ["skill:War Cry", "talent:Power War Cry"], "Are there atleast 6 enemies nearby?"),
        "Weapon Type": new toggles_1.Toggle("Weapon Type", "string", [], "If Default is set, the maximum allowed damage will be used.", ["Default", "Dual_Wield", "Two_Hand_Slashing", "Two_Hand_Bludgeon"])
        // Weapon Mastery Skills - None Required ((TODO) What about Warrior's Rupture?)
        // Ultimate Skills - None Required ((TODO) What about Prime call of the ancients/ prime wrath of the berserker)
    };
}
exports.CreateBarbarianToggleMap = CreateBarbarianToggleMap;
// This is an inverse map of requirements. For each skill, maps to the 
// toggles for which it is a requirement.
function CreateBarbarianSkillToToggleMap() {
    return {
        // Basic Skills
        "Flay": ["Battle Flay", "Combat Flay Stacks"],
        "Frenzy": ["Frenzy Stacks"],
        // Core Skills
        "Whirlwind": ["Violent Whirlwind"],
        "Hammer of the Ancients": ["Violent Hammer of the Ancients", "Furious Hammer of the Ancients"],
        "Upheaval": ["Furious Upheaval"],
        // Defensive Skills
        "Challenging Shout": ["Challenging Shout"],
        "Iron Skin": ["Iron Skin"],
        "Rallying Cry": ["Rallying Cry"],
        // Brawling Skills
        "Kick": ["Mighty Kick"],
        "War Cry": ["War Cry", "Power War Cry"]
        // Weapon Mastery Skills - None
        // Ultimate Skills - None
    };
}
exports.CreateBarbarianSkillToToggleMap = CreateBarbarianSkillToToggleMap;
// This is an inverse map of requirements. For each talent, maps to the 
// toggles for which it is a requirement.
function CreateBarbarianTalentToToggleMap() {
    return {
        // Basic Talents
        "Battle Flay": ["Battle Flay"],
        "Combat Flay": ["Combat Flay Stacks"],
        // Core Talents
        "Violent Whirlwind": ["Violent Whirlwind"],
        "Violent Hammer of the Ancients": ["Violent Hammer of the Ancients"],
        "Furious Hammer of the Ancients": ["Furious Hammer of the Ancients"],
        "Furious Upheaval": ["Furious Upheaval"],
        // Defensive Skills
        "Challenging Shout": ["Challenging Shout"],
        "Iron Skin": ["Iron Skin"],
        "Rallying Cry": ["Rallying Cry"],
        // Brawling Skills
        "Mighty Kick": ["Mighty Kick"],
        "Power War Cry": ["Power War Cry"]
        // Weapon Mastery Skills - None
        // Ultimate Skills - None
    };
}
exports.CreateBarbarianTalentToToggleMap = CreateBarbarianTalentToToggleMap;
// This is an inverse map of requirements. For each aspect, maps to the 
// toggles for which it is a requirement.
function CreateBarbarianAspectToToggleMap() {
    return {};
}
exports.CreateBarbarianAspectToToggleMap = CreateBarbarianAspectToToggleMap;
/* (TODO Class Upgrade - Weapon Expertise)
    https://www.ginx.tv/en/diablo-4/barbarian-arsenal-weapon-expertise

    1H Sword: Lucky Hit: Up to a {10%} chance to gain {5} Fury when hitting a Crowd Controlled enemy. Double this chance when using two Swords.
                Rank (10): Killing a Crowd Controlled enemy grants {+15%} increased Attack Speed for {3} seconds. Double this amount for kills with two Swords.

    1H Axe: {+5.0%} increased Critical Strike Chance against injured enemies. Double this amount when using two Axes.
            Rank (10): Lucky Hit: Critical Strikes have up to a {55%} chance to grant {+0.6%} increased Attack Speed for {2} seconds. Double the Attack Speed bonus when using two Axes.

    1H Mace: {x10%} increased damage to Stunned enemies. Double this amount when using two Maces.
                Rank (10): Lucky Hit: Up to a {10%} chance to gain Berserking for {1.50} seconds when you hit a Stunned enemy. Double this chance when using two Maces.
    
    Polearm: {x10%} increased Lucky Hit Chance.
                Rank (10): You deal {+10%} increased damage while Healthy.
    
    2H Sword: {+20%} of direct damage you deal is inflicted as Bleeding damage over 5 seconds.
                Rank (10): You deal {x30%} increased Bleeding damage for {5} seconds after killing an enemy.
    
    2H Axe: {x15.0%} increased damage to Vulnerable enemies.
            Rank (10): {+10%} increased Critical Strike Chance against Vulnerable enemies.
    
    2H Mace: Lucky Hit: Up to a {10%} chance to gain {2} Fury when hitting an enemy. Double the amount of Fury gained while Berserking.
                Rank (10): You deal {x15%} increased Critical Strike Damage to Stunned and Vulnerable enemies while Berserking.
*/ 
//# sourceMappingURL=Barbarian.js.map