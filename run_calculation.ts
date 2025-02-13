import { Barbarian } from "../Calculator/Barbarian";
import { TalentNode, ToggleNode, ModifierNode, SkillNode, BaseStatsNode, ComputeNode, StatsNode, TriggerNode, NodesMap } from "./computation_graph";
import {CreateBarbarianAspectNodes, CreateBarbarianModifierNodes, CreateBarbarianBaseStatsNode, CreateBarbarianSkillNodes, CreateBarbarianStatsNodes, CreateBarbarianTalentNodes, CreateBarbarianToggleNodes, CreateBarbarianTriggerNodes} from "./barbarian_graph"
/*
The run calculations API takes a PlayerCharacter as input and returns a PlayerCalculations object
containing all relevant offensive and defensive values of interest.
*/

// Gives a summary of relevant outputs of using an offensive skill.
class SkillReturn {
    _flat_damage: number;
    _dot_damage: number;
    _attack_speed: number;

    // This is the cooldown of a skill if there is one, not the attack speed.
    _cooldown_seconds: number;

    // Change in resource from using the skill. Can be positive or negative.
    _delta_resources: number;
    constructor(flat_damage: number, dot_damage: number, attack_speed: number, cooldown_seconds: number, delta_resources: number) {
        this._flat_damage = flat_damage;
        this._dot_damage = dot_damage;
        this._attack_speed = attack_speed;
        this._cooldown_seconds = cooldown_seconds;
        this._delta_resources = delta_resources;

    }
}

interface OffenseSummary {
    // A single value estimate of the dps. This is the basic/core rotation dps with weaving in cooldown offensive
    // only if they increase the effective dps.
    // _effective_dps: number;

    // Assumes the player uses basic skills (resource generators) until they have enough for a core skill (resource spenders).
    // The player can modify these assumptions with toggles for particular basic/core skills which can benefit from different
    // behavior.
    _basic_core_rotation_dps?: number;

    // Name and damage from each offensive skill.
    _basic_skill_damage?: [string, number];
    _core_skill_damage?: [string, number];
    _offensive_abilities?: [string, number][];
}

interface DefenseSummary {
    // Effective life is a form of weighted average of _max_life / _X_resist. The idea is that the effective life pool
    // against fire is _max_life / _fire_resist. To summarize in a single number though, a player is only as defensive
    // as their weakest link, so effective life is weighted heavily toward the minimum value of resist.
    _effective_life?: number;
    _max_life: number;

    // Various mitigations.
    _armor: number;
    _fire_resist: number;
    _cold_resist: number;
    _lightning_resist: number;
    _poison_resist: number;
    _shadow_resist: number;
}

class ResourceSummary {
    // resource_gain_from_basic / resource_cost_of_core
    _basic_core_ratio: number;

    // maximum value of resources allowed.
    _max_resources: number;
    _mana_per_second: number;
    
    // Resource gain from basic skill.
    _basic_skill_generation: number;

    // Resources gained per second with basic skill.
    _resource_generation_rate: number;

    // Resource cost of core skill.
    _core_skill_spend: number;
    constructor(basic_core_ratio: number, max_resources: number, mana_per_second: number, basic_skill_generation: number,  resource_generation_rate: number, core_skill_spend: number,) {
        this._basic_core_ratio = basic_core_ratio;
        this._max_resources = max_resources;
        this._mana_per_second = mana_per_second;
        this._basic_skill_generation = basic_skill_generation;
        this._resource_generation_rate = resource_generation_rate;
        this._core_skill_spend = core_skill_spend;
    }
}

class PlayerCalculations {
    // Keys: Name of offensive skill, Values: Summary of outputs from that skill.
    _skill_value_map: { [key: string]: SkillReturn };
    _offense_summary: OffenseSummary;
    _defense_summary: DefenseSummary;
    _resource_summary: ResourceSummary;
}

// (TODO) Add more classes as they are defined.
type Player_Class = Barbarian;

export function RunCalculations(player_character: Player_Class): PlayerCalculations {
    const calcs = new PlayerCalculations();
    calcs._skill_value_map = {};
    const nodes_map: NodesMap = {};

    if (player_character instanceof Barbarian) {
        nodes_map.modifier = CreateBarbarianModifierNodes(),
        nodes_map.aspect = CreateBarbarianAspectNodes(),
        nodes_map.talent = CreateBarbarianTalentNodes(),
        nodes_map.toggle = CreateBarbarianToggleNodes(),
        nodes_map.skill = CreateBarbarianSkillNodes(),
        nodes_map.base_stat = CreateBarbarianBaseStatsNode(),
        nodes_map.stat = CreateBarbarianStatsNodes(nodes_map),
        nodes_map.trigger = CreateBarbarianTriggerNodes(nodes_map)
    } else {
        throw "Unimplemented class detected."
    }

    // (TODO) Need to handle modifiers which add talent points.
    for (const [equipment_type, gear] of Object.entries(player_character._equipment)) {
        if (gear != null) {
            const mods = gear.GetModifiers;
            for (const [mod_name, value] of mods) {
                nodes_map["modifier"][mod_name].AddValue(value);
            }
        
            const aspect = gear.GetAspect;
            if (aspect != null) {
                nodes_map["aspect"][aspect[0]].AddAspect(aspect[1]);
            }
            
            // (TODO) Consider allowing string modifiers.
            // These weapon types and encodings are Barbarian specific.
            if (player_character instanceof Barbarian) {
                if (equipment_type == "weapon" || equipment_type == "off_hand") {
                    let weapon_encoding: number;
                    switch(gear.GetWeaponType) {
                        case "OneHandSword":
                            weapon_encoding = 0;
                            break;
                        case "OneHandAxe":
                            weapon_encoding = 1;
                            break;
                        case "OneHandAxe":
                            weapon_encoding = 2;
                            break;
                    }
                    if (equipment_type == "weapon") {
                        nodes_map["modifier"]["Main_Hand_Weapon"].AddValue(weapon_encoding);
                        nodes_map["modifier"]["Main_Hand_Attack_Speed"].SetValue = gear.GetAttackSpeed;
                    }
                    if (equipment_type == "off_hand") {
                        nodes_map["modifier"]["Off_Hand_Weapon"].AddValue(weapon_encoding);
                        nodes_map["modifier"]["Off_Hand_Attack_Speed"].SetValue = gear.GetAttackSpeed;
                    }
                }
                if (equipment_type == "two_hand_slashing_weapon") {
                    let weapon_encoding: number;
                    switch(gear.GetWeaponType) {
                        case "TwoHandSword":
                            weapon_encoding = 0;
                            break;
                        case "TwoHandAxe":
                            weapon_encoding = 1;
                            break;
                        case "Polearm":
                            weapon_encoding = 2;
                            break;
                    }
                    nodes_map["modifier"]["Two_Hand_Slashing_Weapon"].SetValue = weapon_encoding;
                    nodes_map["modifier"]["Two_Hand_Slashing_Attack_Speed"].SetValue = gear.GetAttackSpeed;
                }
                if (equipment_type == "two_hand_bludgeon_weapon") {
                    nodes_map["modifier"]["Two_Hand_Bludgeon_Weapon"].SetValue = 0;
                    nodes_map["modifier"]["Two_Hand_Bludgeon_Attack_Speed"].SetValue = gear.GetAttackSpeed;
                }
            }
        }
    }

    for (const [talent_name, [points, max_points]] of Object.entries(player_character._player_talents)) {
        nodes_map["talent"][talent_name].SetTalent = points;
    }

    for (const [toggle_name, toggle] of Object.entries(player_character._toggle_maps._toggle_map)) {
        nodes_map["toggle"][toggle_name].SetValue = toggle.GetValue;
    }

    nodes_map["base_stat"].SetLevel = player_character._level;

    // (TODO) Figure out how to do this in a single simple loop.
    // Computing skill returns and offense summary.
    calcs._offense_summary = {};
    const basic_skill_return = ComputeSkillReturn(player_character._basic_ability_name, nodes_map);
    if (basic_skill_return != null) {
        calcs._skill_value_map[player_character._basic_ability_name] = basic_skill_return;
        calcs._offense_summary._basic_skill_damage = [player_character._basic_ability_name, basic_skill_return._dot_damage + basic_skill_return._flat_damage];
    }
    const core_skill_return = ComputeSkillReturn(player_character._core_ability_name, nodes_map);
    if (core_skill_return != null) {
        calcs._skill_value_map[player_character._core_ability_name] = core_skill_return;
        calcs._offense_summary._core_skill_damage = [player_character._core_ability_name, core_skill_return._dot_damage + core_skill_return._flat_damage];
    }
    const ability_1_skill_return = ComputeSkillReturn(player_character._ability_1_name, nodes_map);
    calcs._offense_summary._offensive_abilities = [];
    if (ability_1_skill_return != null) {
        calcs._skill_value_map[player_character._ability_1_name] = ability_1_skill_return;
        calcs._offense_summary._offensive_abilities.push([player_character._ability_1_name ,ability_1_skill_return._dot_damage + ability_1_skill_return._flat_damage]);
    }
    const ability_2_skill_return = ComputeSkillReturn(player_character._ability_2_name, nodes_map);
    if (ability_2_skill_return != null) {
        calcs._skill_value_map[player_character._ability_2_name] = ability_2_skill_return;
        calcs._offense_summary._offensive_abilities.push([player_character._ability_2_name ,ability_2_skill_return._dot_damage + ability_2_skill_return._flat_damage]);
    }
    const ability_3_skill_return = ComputeSkillReturn(player_character._ability_3_name, nodes_map);
    if (ability_3_skill_return != null) {
        calcs._skill_value_map[player_character._ability_3_name] = ability_3_skill_return;
        calcs._offense_summary._offensive_abilities.push([player_character._ability_3_name ,ability_3_skill_return._dot_damage + ability_3_skill_return._flat_damage]);
    }
    const ability_4_skill_return = ComputeSkillReturn(player_character._ability_4_name, nodes_map);
    if (ability_4_skill_return != null) {
        calcs._skill_value_map[player_character._ability_4_name] = ability_4_skill_return;
        calcs._offense_summary._offensive_abilities.push([player_character._ability_4_name ,ability_4_skill_return._dot_damage + ability_4_skill_return._flat_damage]);
    }
    
    calcs._defense_summary = {
        _max_life: nodes_map["stat"]["Max_Hitpoints"].GetValue,
        _armor: nodes_map["stat"]["Total_Armor"].GetValue,
        _fire_resist: nodes_map["stat"]["Resistance_Fire"].GetValue,
        _cold_resist: nodes_map["stat"]["Resistance_Cold"].GetValue,
        _lightning_resist: nodes_map["stat"]["Resistance_Lightning"].GetValue,
        _poison_resist: nodes_map["stat"]["Resistance_Poison"].GetValue,
        _shadow_resist: nodes_map["stat"]["Resistance_Shadow"].GetValue
    }

    return calcs;
}

function ComputeSkillReturn(ability_name: string | null, nodes_map: NodesMap): SkillReturn | null {
    if (ability_name == null) {
        return null;
    }
    let next_ability = nodes_map["skill"][ability_name];
    // console.log(ability_name);
    if (nodes_map["current_skill"]) {
        for (let child_node of nodes_map["current_skill"]._children) {
            // console.log(child_node);
            next_ability.AddChild(child_node);
        }
    }
    nodes_map["current_skill"] = next_ability;
    // BFS to clear dependent nodes.
    {
        let queue = [nodes_map["current_skill"]];
        let seen = new Set([nodes_map["current_skill"]._name]);
        while (queue.length > 0) {
            const current = queue[0];
            for (const node_identifier of current._children) {
                if(!(seen.has(node_identifier))) {
                    seen.add(node_identifier);
                    const [node_type, node_name] = node_identifier.split(":");
                    let new_node = nodes_map[node_type][node_name];
                    // console.log("Before: " + new_node.GetValue);
                    new_node.ClearVal();
                    // console.log(new_node._value);
                    // console.log("After: " + new_node.GetValue);
                    queue.push(new_node);
                }
            }
            queue.shift();
        }
    }
    return new SkillReturn(nodes_map["trigger"]["Flat_Damage"].GetValue, 
                           nodes_map["trigger"]["Total_Damage_Over_Time"].GetValue, 
                           nodes_map["stat"]["Total_Attack_Speed"].GetValue,
                           nodes_map["stat"]["Cooldown"].GetValue,
                           nodes_map["stat"]["Delta_Resources"].GetValue);
}