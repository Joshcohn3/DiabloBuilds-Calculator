"use strict";
/*
This provides the graph implementation for damage computation, both to players and
enemies. The graph consists of nodes of various types which feed into other nodes
used to compute it's output. The graph is directed and must by acyclic for computation
to terminate. The player is expected to update value for root nodes with no dependencies
and all other nodes are computed via propagation through the graph.
*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.TriggerNode = exports.StatsNode = exports.ComputeNode = exports.SkillNode = exports.BaseStatsNode = exports.ToggleNode = exports.AspectNode = exports.TalentNode = exports.ModifierNode = exports.DiabloNode = void 0;
class DiabloNode {
    constructor(name) {
        this._name = name;
        this._value = null;
        this._children = new Set();
    }
    // This is a generic function which should return the output of a particular node.
    // Each sub-class of DiabloNode which is not a root node should override this
    // function.
    get GetValue() {
        return this._value;
    }
    // Children should have the form: "<child_node_type>:<child_node_name>".
    AddChild(child_name) {
        this._children.add(child_name);
    }
}
exports.DiabloNode = DiabloNode;
class ModifierNode extends DiabloNode {
    constructor(name) {
        super("modifier:" + name);
        this._value = 0;
    }
    AddValue(diff) {
        this._value += diff;
    }
    set SetValue(value) {
        this._value = value;
    }
    get GetValue() {
        return this._value;
    }
}
exports.ModifierNode = ModifierNode;
class TalentNode extends DiabloNode {
    constructor(name, max_talent_points) {
        super("talent:" + name);
        if (!Number.isInteger(max_talent_points)) {
            throw "Number of talent points for " + this._name + " must be an integer.";
        }
        this._max_talent_points = max_talent_points;
        this._value = 0;
    }
    set SetTalent(talent_points) {
        if (talent_points < 0) {
            throw "Number of talent points for " + this._name + " must be positive.";
        }
        if (!Number.isInteger(talent_points)) {
            throw "Number of talent points for " + this._name + " must be an integer.";
        }
        if (talent_points > this._max_talent_points) {
            throw "Number of talent points for " + this._name + " must be less than the maximum of " + this._max_talent_points + ".";
        }
        this._value = talent_points;
    }
    get GetValue() {
        return this._value;
    }
}
exports.TalentNode = TalentNode;
class AspectNode extends DiabloNode {
    constructor(name, aspect_length) {
        super("aspect:" + name);
        this._value = [];
        this._aspects = [];
        this._aspect_length = aspect_length;
    }
    AddAspect(aspect) {
        if (aspect.length != this._aspect_length) {
            throw "Aspect " + aspect + " has the incorrect size. Correct size: " + this._aspect_length + ".";
        }
        this._aspects.push(aspect);
        // Update _value (best aspect).
        // If _aspect_length = 0, there are no ranks to this aspect.
        if (this._aspect_length == 0) {
            this._value = aspect;
        }
        let max_aspect = this._aspects[0];
        let max_value = aspect[0];
        for (const candidate of this._aspects) {
            if (candidate[0] > max_value) {
                max_aspect = candidate;
                max_value = candidate[0];
            }
        }
        this._value = max_aspect;
    }
    RemoveAspect(aspect) {
        if (aspect.length != this._aspect_length) {
            throw "Aspect " + aspect + " has the incorrect size. Correct size: " + this._aspect_length + ".";
        }
        for (const [index, candidate] of this._aspects.entries()) {
            // Remove aspect if the first entry matches.
            // (TODO) Can they fail to match in other entries or are they based on ranks?
            if (candidate[0] == aspect[0]) {
                this._aspects.splice(index, 1);
            }
        }
        // Update _value (best aspect).
        if (this._aspects.length == 0) {
            this._value = [];
        }
        let max_aspect = this._aspects[0];
        let max_value = aspect[0];
        for (const candidate of this._aspects) {
            if (candidate[0] > max_value) {
                max_aspect = candidate;
                max_value = candidate[0];
            }
        }
        this._value = max_aspect;
    }
    get GetValue() {
        return this._value;
    }
}
exports.AspectNode = AspectNode;
// NOTE: this class does not capture the display status of the toggle, only it's affect
// on computation. The value for any toggle which is not displayed should be the default,
// but the onus is on the caller of this graph API to enforce that constraint.
class ToggleNode extends DiabloNode {
    constructor(name, toggle_type, allowed_string_values = []) {
        super("toggle:" + name);
        this._toggle_type = toggle_type;
        if (toggle_type == "boolean") {
            this._value = false;
            if (allowed_string_values.length > 0) {
                throw "string_values should be empty for toggle of type boolean.";
            }
        }
        else if (toggle_type == "number") {
            this._value = 0;
            if (allowed_string_values.length > 0) {
                throw "string_values should be empty for toggle of type number.";
            }
        }
        else if (toggle_type == "string") {
            if (allowed_string_values.length == 0) {
                throw "string_values should be non-empty for toggle of type string.";
            }
            this._value = allowed_string_values[0];
        }
        this._allowed_string_values = allowed_string_values;
    }
    set SetValue(toggle_value) {
        if (typeof (toggle_value) != this._toggle_type) {
            throw "Toggle value for " + this._name + " should be " + this._toggle_type +
                ". Got " + toggle_value + " of type: " + typeof (toggle_value) + ".";
        }
        // (TODO) Is this a true constraint?
        if (this._toggle_type == "number" && !Number.isInteger(toggle_value)) {
            throw "Toggle value for " + this._name + " must be an integer.";
        }
        if (typeof (toggle_value) == "string" && !this._allowed_string_values.includes(toggle_value)) {
            throw "Value for string toggle must be in the allowed_string_values.";
        }
        this._value = toggle_value;
    }
    get GetValue() {
        return this._value;
    }
}
exports.ToggleNode = ToggleNode;
class BaseStatsNode extends DiabloNode {
    constructor(class_name, player_level) {
        super("base_stat:" + class_name);
        this.SetLevel = player_level;
    }
    set SetLevel(player_level) {
        if (!Number.isInteger(player_level)) {
            throw "Player level must be an integer. Given: " + player_level;
        }
        switch (this._name) {
            case "base_stat:Barbarian":
                this._value = {
                    "Level": player_level,
                    "BaseMaxLife": player_level < 13 ? [40, 46, 52, 58, 64, 72, 82, 92, 104, 118, 136, 158][player_level - 1] : 180 + 20 * (player_level - 13),
                    "Strength": 10 + player_level,
                    "Intelligence": 7 + player_level,
                    "Willpower": 7 + player_level,
                    "Dexterity": 8 + player_level
                };
                break;
            default:
                throw "Unimplemented class" + this._name + " found for BaseStatsNode.";
        }
    }
    get GetValue() {
        return this._value;
    }
}
exports.BaseStatsNode = BaseStatsNode;
// These nodes represent the skills which do damage. The return value is an object containing various proerties
// important for evaluating modifiers based on the skill used.
class SkillNode extends DiabloNode {
    constructor(skill_name, skill_category, skill_tags, base_flat_modifier, base_dot_modifier, skill_cooldown_seconds, skill_base_resources_generated, skill_lucky_hit_chance) {
        super("skill:" + skill_name);
        this._value = {
            name: skill_name,
            category: skill_category,
            tags: new Set(skill_tags),
            modifiers: { flat: base_flat_modifier, dot: base_dot_modifier },
            cooldown_seconds: skill_cooldown_seconds,
            base_resources_generated: skill_base_resources_generated,
            lucky_hit_chance: skill_lucky_hit_chance
        };
    }
}
exports.SkillNode = SkillNode;
// This is a generic class for a node which is computed based on the value of other nodes. All Compute
// nodes take a callback as an argument `update_value_function` which says how to compute the value
// of the node. Until this callback is called, the value is null.
class ComputeNode extends DiabloNode {
    constructor(name, update_value_function) {
        super(name);
        this._update_value_function = update_value_function;
        this._value = null;
    }
    UpdateValue() {
        this._value = this._update_value_function(this.ParentVal.bind(this));
    }
    get GetValue() {
        if (this._value == null) {
            this.UpdateValue();
        }
        return this._value;
    }
    ParentVal(parent_node) {
        // console.log(this._name);
        // console.log(parent_node._name);
        // console.log(parent_node.GetValue);
        parent_node.AddChild(this._name);
        return parent_node.GetValue;
    }
    ClearVal() {
        this._value = null;
    }
}
exports.ComputeNode = ComputeNode;
class StatsNode extends ComputeNode {
    constructor(name, update_value_function) {
        super("stat:" + name, update_value_function);
        this._update_value_function = update_value_function;
    }
}
exports.StatsNode = StatsNode;
// (TODO) Trigger and stats nodes have the same API, are triggers needed? Should they be merged with stats somehow?
class TriggerNode extends ComputeNode {
    constructor(name, update_value_function) {
        super("trigger:" + name, update_value_function);
        this._update_value_function = update_value_function;
    }
}
exports.TriggerNode = TriggerNode;
//# sourceMappingURL=computation_graph.js.map