/*
This file includes implementation for toggles. A toggle is meant to represent some state
which may of may not be satisfied at a given time. This state could mean something like:
    *   Enemy debuffs (vulnerable, slowed etc.)
    *   Player buff (Self buff from a skill or Lucky hit)
    *   Stacks accrued of some buff or enemy debuff due to a talent or aspect.
The toggle can be a check box (boolean) or some number of stacks (integer). Some toggles
are always available for the player to modify but other toggles should only appear in
the UI when the `requirements` of that aspect are met. Requirements can be due to:
    *   A skill is equipped (skill based toggles)
    *   An aspect is equipped (aspect based toggles)
    *   The player has a particular talent (talent based toggles).
Each time we modify the equipment, talents or skills, we have to check again if all the
related toggles should have their visibility modified.

When a skill is used, we will have to refer to relevant toggles for modifiers to the damage.
*/

type ToggleType = "boolean" | "number" | "string";


export class Toggle {
    _name: string;
    // When _active_status = false, should be set to default of false for bool or 0 for int.
    _value: boolean | number | string;
    // Requirements should have the form:
    //  *   "requirement_type:<requirement_name>"
    //  *   "skill:Flay"
    //  *   "talent:Battle Flay" etc
    // Valid requirement types are skill, talent, aspect. A requirement can also be the 
    // OR of various requirements of the same type e.g.
    //  *   Ancestral Echoes toggle has a requirement "skill:Leap||Upheaval||Whirlwind" 
    //      which only requires at least one of those skills.
    //
    // (TODO) Add validation in Toggle constructor
    _requirements:  Set<string>;
    _active_status: boolean;
    _description: string;
    _allowed_string_values: string[];
    constructor(name: string, toggle_type: ToggleType, requirements: string[], description: string, allowed_string_values: string[] = []){
        this._name = name;
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
        this._requirements = new Set();
        for (let req of requirements) {
            this._requirements.add(req);
        }
        this._active_status = false;
        this._description = description;
        this._allowed_string_values = allowed_string_values;
    }

    set SetValue(value: boolean | number | string) {
        if (typeof(value) != typeof(this._value)) {
            throw "Value must match the toggle type."
        }
        if (typeof(value) == "string" && this._allowed_string_values.includes(value)) {
                throw "Value for string toggle must be in the allowed_string_values."
        }
        this._value = value;
    }

    get GetValue(): boolean | number | string {
        return this._value;
    }

    get GetRequirements(): Set<string> {
        return this._requirements;
    }

    set SetActiveStatus(active_status: boolean) {
        // Set value to default if we turn off a Toggle.
        if (active_status == false) {
            if (typeof(this._value) == 'boolean') {
                this._value = false;
            } else {
                this._value = 0;
            }
        }
        this._active_status = active_status;
    }

    get GetActiveStatus(): boolean {
        return this._active_status;
    }

    get GetDescription(): string {
        return this._description;
    }

    get AllowedStringValues(): string[] {
        return this._allowed_string_values;
    }
}

export class ToggleMaps {
    _toggle_map: { [key: string]: Toggle };
    _skill_toggle_map: { [key: string]: string[] };
    _talent_toggle_map: { [key: string]: string[] };
    _aspect_toggle_map: { [key: string]: string[] };
    constructor(toggle_map: { [key: string]: Toggle }, skill_toggle_map: { [key: string]: string[] }, talent_toggle_map: { [key: string]: string[] }, aspect_toggle_map: { [key: string]: string[] }) {
        this._toggle_map = toggle_map;
        this._skill_toggle_map = skill_toggle_map;
        this._talent_toggle_map = talent_toggle_map;
        this._aspect_toggle_map = aspect_toggle_map;
    }
}