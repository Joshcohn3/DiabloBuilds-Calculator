/*
This provides the graph implementation for damage computation, both to players and
enemies. The graph consists of nodes of various types which feed into other nodes
used to compute it's output. The graph is directed and must by acyclic for computation
to terminate. The player is expected to update value for root nodes with no dependencies
and all other nodes are computed via propagation through the graph.
*/

export class DiabloNode {
    _name: string;
    // Generic name for the value output of a node. Each sub-class
    // provides a function which 
    _value: any;
    _children: Set<string>;
    constructor(name: string) {
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
    AddChild(child_name: string) {
        this._children.add(child_name);
    }
}

export class ModifierNode extends DiabloNode {
    _value: number;
    constructor(name: string) {
        super("modifier:" + name);
        this._value = 0;
    }

    AddValue(diff: number) {
        this._value += diff;
    }

    set SetValue(value: number) {
        this._value = value;
    }

    get GetValue() {
        return this._value;
    }
}

export class TalentNode extends DiabloNode {
    _value: number;
    _max_talent_points: number;
    constructor(name: string, max_talent_points: number) {
        super("talent:" + name);
        if (!Number.isInteger(max_talent_points)) {
            throw "Number of talent points for " + this._name + " must be an integer."
        }
        this._max_talent_points = max_talent_points;
        this._value = 0;
    }

    set SetTalent(talent_points: number) {
        if (talent_points < 0) {
            throw "Number of talent points for " + this._name + " must be positive."
        }

        if (!Number.isInteger(talent_points)) {
            throw "Number of talent points for " + this._name + " must be an integer."
        }

        if (talent_points > this._max_talent_points) {
            throw "Number of talent points for " + this._name + " must be less than the maximum of " + this._max_talent_points + "."
        }

        this._value = talent_points;
    }

    get GetValue() {
        return this._value;
    }
}

export class AspectNode extends DiabloNode {
    _value: number[];
    // Player can have multiple of the same aspect equipped. Only the maximum value
    // is accounted for in _value.
    _aspects: number[][];
    // This is the number of values that are variables for this aspect.
    _aspect_length: number;
    constructor(name: string, aspect_length: number) {
        super("aspect:" + name);
        this._value = [];
        this._aspects = [];
        this._aspect_length = aspect_length;
    }

    AddAspect(aspect: number[]) {
        if (aspect.length != this._aspect_length) {
            throw "Aspect " + aspect + " has the incorrect size. Correct size: " + this._aspect_length + "."
        }
        this._aspects.push(aspect);
        // Update _value (best aspect).
        // If _aspect_length = 0, there are no ranks to this aspect.
        if (this._aspect_length == 0) {
            this._value = aspect;
        }
        let max_aspect = this._aspects[0];
        let max_value = aspect[0]; 
        for (const candidate of this._aspects){
            if (candidate[0] > max_value) {
                max_aspect = candidate;
                max_value = candidate[0];
            }
        }
        this._value = max_aspect;
    }

    RemoveAspect(aspect: number[]) {
        if (aspect.length != this._aspect_length) {
            throw "Aspect " + aspect + " has the incorrect size. Correct size: " + this._aspect_length + "."
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
        for (const candidate of this._aspects){
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

// NOTE: this class does not capture the display status of the toggle, only it's affect
// on computation. The value for any toggle which is not displayed should be the default,
// but the onus is on the caller of this graph API to enforce that constraint.
export class ToggleNode extends DiabloNode {
    _value: number | boolean | string;
    _toggle_type: "number" | "boolean" | "string";
    _allowed_string_values: string[];
    constructor(name: string, toggle_type: "number" | "boolean" | "string", allowed_string_values: string[] = []) {
        super("toggle:" + name);
        this._toggle_type = toggle_type;
        if (toggle_type == "boolean") {
            this._value = false;
            if (allowed_string_values.length > 0) {
                throw "string_values should be empty for toggle of type boolean."
            }
        } else if (toggle_type == "number") {
            this._value = 0;
            if (allowed_string_values.length > 0) {
                throw "string_values should be empty for toggle of type number."
            }
        } else if (toggle_type == "string") {
            if (allowed_string_values.length == 0) {
                throw "string_values should be non-empty for toggle of type string."
            }
            this._value = allowed_string_values[0];
        }
        this._allowed_string_values = allowed_string_values;
    }

    set SetValue(toggle_value: number | boolean | string) {
        if (typeof(toggle_value) != this._toggle_type) {
            throw "Toggle value for " + this._name + " should be " + this._toggle_type + 
                ". Got " + toggle_value + " of type: " + typeof(toggle_value) + "."
        }
        // (TODO) Is this a true constraint?
        if (this._toggle_type == "number" && !Number.isInteger(toggle_value)) {
            throw "Toggle value for " + this._name + " must be an integer."
        }
        if (typeof(toggle_value) == "string" && !this._allowed_string_values.includes(toggle_value)) {
                throw "Value for string toggle must be in the allowed_string_values."
        }
        this._value = toggle_value;
    }

    get GetValue() {
        return this._value;
    }
}

export class BaseStatsNode extends DiabloNode {
    _value: {[key: string]: number};
    _player_level: 1;
    constructor(class_name: "Barbarian" | "Druid" | "Necromancer" | "Rogue" | "Sorcerer", player_level: number) {
        super("base_stat:" + class_name);
        this.SetLevel = player_level;
    }

    set SetLevel(player_level: number) {
        if (!Number.isInteger(player_level)) {
            throw "Player level must be an integer. Given: " + player_level;
        }
        switch(this._name) {
            case "base_stat:Barbarian":
                this._value = {
                    "Level": player_level,
                    "BaseMaxLife": player_level < 13 ? [40,46,52,58,64,72,82,92,104,118,136,158][player_level - 1] : 180 + 20 * (player_level - 13),
                    "Strength": 10 + player_level,
                    "Intelligence": 7 + player_level,
                    "Willpower": 7 + player_level,
                    "Dexterity": 8 + player_level
                }
                break;
            default:
                throw "Unimplemented class" + this._name + " found for BaseStatsNode."
        }
    }

    get GetValue() {
        return this._value;
    }
}

// These nodes represent the skills which do damage. The return value is an object containing various proerties
// important for evaluating modifiers based on the skill used.
export class SkillNode extends DiabloNode {
    _value: object;
    constructor(skill_name: string, 
                skill_category: string,  
                skill_tags: string[], 
                base_flat_modifier: number,
                base_dot_modifier: number,
                skill_cooldown_seconds: number,
                skill_base_resources_generated: number,
                skill_lucky_hit_chance: number) {
        super("skill:" + skill_name);
        this._value = {
            name: skill_name,
            category: skill_category,
            tags: new Set(skill_tags),
            modifiers: {flat: base_flat_modifier, dot: base_dot_modifier},
            cooldown_seconds: skill_cooldown_seconds,
            base_resources_generated: skill_base_resources_generated,
            lucky_hit_chance: skill_lucky_hit_chance
        }
    }
}

// This is a generic class for a node which is computed based on the value of other nodes. All Compute
// nodes take a callback as an argument `update_value_function` which says how to compute the value
// of the node. Until this callback is called, the value is null.
export class ComputeNode extends DiabloNode {
    // If GetValue is called, and the node has value null, then we update the value. Otherwise we just
    // return the value that was already computed. This way we only calculate the value once.
    _value: any;
    // Each compute node has a function used to update its value by references the values of other nodes
    // that it depends on.
    _update_value_function: (parent_val: (parent_node: DiabloNode) => any) => any;
    constructor(name: string, update_value_function: (parent_val: (parent_node: DiabloNode) => any) => any) {
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

    ParentVal(parent_node: DiabloNode): any {
        // console.log(this._name);
        // console.log(parent_node._name);
        // console.log(parent_node.GetValue);
        parent_node.AddChild(this._name);
        return parent_node.GetValue
    }

    ClearVal(): void {
        this._value = null;
    }
}

export class StatsNode extends ComputeNode {
    // Stats node should be initially null but becomes an map when it's evaluated. The value is an
    // map which reports values for each combination of Weapon and skill type.
    //
    // e.g. For Barbarian, Crit damage depends on weapon type and skill type, but different skills may
    //      use different weapons.
    //
    // If GetValue is called, and the node has value null, then we update the value. Otherwise we just
    // return the value that was already computed. This way we only calculate the value once.
    _value: number | null;
    // Each compute node has a function used to update its value by references the values of other nodes
    // that it depends on.
    _update_value_function: (parent_val: (parent_node: DiabloNode) => any) => number;
    constructor(name: string, update_value_function: (parent_val: (parent_node: DiabloNode) => any) => number) {
        super("stat:" + name, update_value_function);
        this._update_value_function = update_value_function;
    }
}

// (TODO) Trigger and stats nodes have the same API, are triggers needed? Should they be merged with stats somehow?
export class TriggerNode extends ComputeNode {
    // Trigger node should be initially null but becomes an map when it's evaluated. If GetValue is called, and the 
    // node has value null, then we update the value. Otherwise we just return the value that was already computed.
    // This way we only calculate the value once.
    _value: number | null;
     // Each trigger node has a function used to update its value by references the values of other nodes
     // that it depends on.
    _update_value_function: (parent_val: (parent_node: DiabloNode) => any) => number;
    constructor(name: string, update_value_function: (parent_val: (parent_node: DiabloNode) => any) => number) {
        super("trigger:" + name, update_value_function);
        this._update_value_function = update_value_function;
    }
}

export interface NodesMap {
    "modifier"?: { [key: string]: ModifierNode };
    "aspect"?: { [key: string]: AspectNode };
    "talent"?: { [key: string]: TalentNode };
    "toggle"?: { [key: string]: ToggleNode };
    "skill"?: { [key: string]: SkillNode };
    "current_skill"?: SkillNode;
    "base_stat"?: BaseStatsNode;
    "stat"?: { [key: string]: StatsNode };
    "trigger"?: { [key: string]: TriggerNode };
}