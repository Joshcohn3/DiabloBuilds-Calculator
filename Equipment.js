"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WeaponTypesToDamage = exports.TwoHandBludgeonWeaponTypes = exports.TwoHandSlashingWeaponTypes = exports.TwoHandWeaponTypes = exports.OneHandWeaponTypes = exports.Equipment = void 0;
class Equipment {
    constructor(implicit_modifiers, equipment_type, num_modifiers, weapon_type = null, weapon_attack_speed = null) {
        if (weapon_type != null && equipment_type != "weapon") {
            throw "weapon type should be null for EquipmentType != weapon.";
        }
        this._equipment_type = equipment_type;
        this._weapon_type = weapon_type;
        this._implicit_modifiers = implicit_modifiers;
        this._modifiers = Array(num_modifiers).fill(null);
        this._aspect = null;
        this._attack_speed = weapon_attack_speed;
    }
    get GetModifiers() {
        let present_modifiers = [].concat(this._implicit_modifiers);
        for (const mod of this._modifiers) {
            if (mod != null) {
                present_modifiers.push(mod);
            }
        }
        return present_modifiers;
    }
    // Modifies a modifier in a particular slot of the helmet.
    ChangeModifier(idx, modifier) {
        this._modifiers[idx] = modifier;
    }
    // Removes a modifier in a particular slot of the helmet.
    RemoveModifier(idx) {
        this._modifiers[idx] = null;
    }
    // Returns the aspect if there is one.
    get GetAspect() {
        return this._aspect;
    }
    // Adds an aspect with the given name.
    set SetAspect(aspect) {
        this._aspect = aspect;
    }
    // Removes the aspect if there is one.
    RemoveAspect() {
        this._aspect = null;
    }
    get GetEquipmentType() {
        return this._equipment_type;
    }
    get GetWeaponType() {
        return this._weapon_type;
    }
    get GetAttackSpeed() {
        return this._attack_speed;
    }
}
exports.Equipment = Equipment;
exports.OneHandWeaponTypes = new Set(["OneHandAxe", "OneHandMace", "OneHandSword"]);
exports.TwoHandWeaponTypes = new Set(["TwoHandAxe", "TwoHandMace", "TwoHandSword", "Polearm"]);
exports.TwoHandSlashingWeaponTypes = new Set(["TwoHandAxe", "TwoHandSword", "Polearm"]);
exports.TwoHandBludgeonWeaponTypes = new Set(["TwoHandMace"]);
exports.WeaponTypesToDamage = {
    TwoHandSword: "2HSlashingDamage",
    TwoHandMace: "2HBludgeonDamage",
    TwoHandAxe: "2HSlashingDamage",
    Polearm: "2HSlashingDamage",
    OneHandMace: "DualWieldDamage",
    OneHandSword: "DualWieldDamage",
    OneHandAxe: "DualWieldDamage"
};
//# sourceMappingURL=equipment.js.map