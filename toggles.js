"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.ToggleMaps = exports.Toggle = void 0;
class Toggle {
    constructor(name, toggle_type, requirements, description, allowed_string_values = []) {
        this._name = name;
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
        this._requirements = new Set();
        for (let req of requirements) {
            this._requirements.add(req);
        }
        this._active_status = false;
        this._description = description;
        this._allowed_string_values = allowed_string_values;
    }
    set SetValue(value) {
        if (typeof (value) != typeof (this._value)) {
            throw "Value must match the toggle type.";
        }
        if (typeof (value) == "string" && this._allowed_string_values.includes(value)) {
            throw "Value for string toggle must be in the allowed_string_values.";
        }
        this._value = value;
    }
    get GetValue() {
        return this._value;
    }
    get GetRequirements() {
        return this._requirements;
    }
    set SetActiveStatus(active_status) {
        // Set value to default if we turn off a Toggle.
        if (active_status == false) {
            if (typeof (this._value) == 'boolean') {
                this._value = false;
            }
            else {
                this._value = 0;
            }
        }
        this._active_status = active_status;
    }
    get GetActiveStatus() {
        return this._active_status;
    }
    get GetDescription() {
        return this._description;
    }
    get AllowedStringValues() {
        return this._allowed_string_values;
    }
}
exports.Toggle = Toggle;
class ToggleMaps {
    constructor(toggle_map, skill_toggle_map, talent_toggle_map, aspect_toggle_map) {
        this._toggle_map = toggle_map;
        this._skill_toggle_map = skill_toggle_map;
        this._talent_toggle_map = talent_toggle_map;
        this._aspect_toggle_map = aspect_toggle_map;
    }
}
exports.ToggleMaps = ToggleMaps;
//# sourceMappingURL=toggles.js.map