"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RunCalculations = void 0;
const Barbarian_1 = require("../Calculator/Barbarian");
const barbarian_graph_1 = require("./barbarian_graph");
/*
The run calculations API takes a PlayerCharacter as input and returns a PlayerCalculations object
containing all relevant offensive and defensive values of interest.
*/
// Gives a summary of relevant outputs of using an offensive skill.
class SkillReturn {
    constructor(flat_damage, dot_damage, attack_speed, cooldown_seconds, delta_resources) {
        this._flat_damage = flat_damage;
        this._dot_damage = dot_damage;
        this._attack_speed = attack_speed;
        this._cooldown_seconds = cooldown_seconds;
        this._delta_resources = delta_resources;
    }
}
class ResourceSummary {
    constructor(basic_core_ratio, max_resources, mana_per_second, basic_skill_generation, resource_generation_rate, core_skill_spend) {
        this._basic_core_ratio = basic_core_ratio;
        this._max_resources = max_resources;
        this._mana_per_second = mana_per_second;
        this._basic_skill_generation = basic_skill_generation;
        this._resource_generation_rate = resource_generation_rate;
        this._core_skill_spend = core_skill_spend;
    }
}
class PlayerCalculations {
}
function RunCalculations(player_character) {
    const calcs = new PlayerCalculations();
    calcs._skill_value_map = {};
    const nodes_map = {};
    if (player_character instanceof Barbarian_1.Barbarian) {
        nodes_map.modifier = (0, barbarian_graph_1.CreateBarbarianModifierNodes)(),
            nodes_map.aspect = (0, barbarian_graph_1.CreateBarbarianAspectNodes)(),
            nodes_map.talent = (0, barbarian_graph_1.CreateBarbarianTalentNodes)(),
            nodes_map.toggle = (0, barbarian_graph_1.CreateBarbarianToggleNodes)(),
            nodes_map.skill = (0, barbarian_graph_1.CreateBarbarianSkillNodes)(),
            nodes_map.base_stat = (0, barbarian_graph_1.CreateBarbarianBaseStatsNode)(),
            nodes_map.stat = (0, barbarian_graph_1.CreateBarbarianStatsNodes)(nodes_map),
            nodes_map.trigger = (0, barbarian_graph_1.CreateBarbarianTriggerNodes)(nodes_map);
    }
    else {
        throw "Unimplemented class detected.";
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
            if (player_character instanceof Barbarian_1.Barbarian) {
                if (equipment_type == "weapon" || equipment_type == "off_hand") {
                    let weapon_encoding;
                    switch (gear.GetWeaponType) {
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
                    let weapon_encoding;
                    switch (gear.GetWeaponType) {
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
        calcs._offense_summary._offensive_abilities.push([player_character._ability_1_name, ability_1_skill_return._dot_damage + ability_1_skill_return._flat_damage]);
    }
    const ability_2_skill_return = ComputeSkillReturn(player_character._ability_2_name, nodes_map);
    if (ability_2_skill_return != null) {
        calcs._skill_value_map[player_character._ability_2_name] = ability_2_skill_return;
        calcs._offense_summary._offensive_abilities.push([player_character._ability_2_name, ability_2_skill_return._dot_damage + ability_2_skill_return._flat_damage]);
    }
    const ability_3_skill_return = ComputeSkillReturn(player_character._ability_3_name, nodes_map);
    if (ability_3_skill_return != null) {
        calcs._skill_value_map[player_character._ability_3_name] = ability_3_skill_return;
        calcs._offense_summary._offensive_abilities.push([player_character._ability_3_name, ability_3_skill_return._dot_damage + ability_3_skill_return._flat_damage]);
    }
    const ability_4_skill_return = ComputeSkillReturn(player_character._ability_4_name, nodes_map);
    if (ability_4_skill_return != null) {
        calcs._skill_value_map[player_character._ability_4_name] = ability_4_skill_return;
        calcs._offense_summary._offensive_abilities.push([player_character._ability_4_name, ability_4_skill_return._dot_damage + ability_4_skill_return._flat_damage]);
    }
    calcs._defense_summary = {
        _max_life: nodes_map["stat"]["Max_Hitpoints"].GetValue,
        _armor: nodes_map["stat"]["Total_Armor"].GetValue,
        _fire_resist: nodes_map["stat"]["Resistance_Fire"].GetValue,
        _cold_resist: nodes_map["stat"]["Resistance_Cold"].GetValue,
        _lightning_resist: nodes_map["stat"]["Resistance_Lightning"].GetValue,
        _poison_resist: nodes_map["stat"]["Resistance_Poison"].GetValue,
        _shadow_resist: nodes_map["stat"]["Resistance_Shadow"].GetValue
    };
    return calcs;
}
exports.RunCalculations = RunCalculations;
function ComputeSkillReturn(ability_name, nodes_map) {
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
                if (!(seen.has(node_identifier))) {
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
    return new SkillReturn(nodes_map["trigger"]["Flat_Damage"].GetValue, nodes_map["trigger"]["Total_Damage_Over_Time"].GetValue, nodes_map["stat"]["Total_Attack_Speed"].GetValue, nodes_map["stat"]["Cooldown"].GetValue, nodes_map["stat"]["Delta_Resources"].GetValue);
}
//# sourceMappingURL=run_calculation.js.map