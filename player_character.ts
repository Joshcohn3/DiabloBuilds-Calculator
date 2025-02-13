import { Toggle, ToggleMaps } from './toggles';
import { Equipment, WeaponType, TwoHandWeaponTypes, EquipmentType} from './equipment'

// PlayerCharacter is a representation of 
export class PlayerCharacter {
    _level: number;
    _equipment: { [key: string]: Equipment | null };

    _basic_ability_name: string | null;
    _core_ability_name: string | null;
    _ability_1_name: string | null;
    _ability_2_name: string | null;
    _ability_3_name: string | null;
    _ability_4_name: string | null;

    _player_talents: { [key: string]: [number, number] };

    _toggle_maps: ToggleMaps;

    // Count from each aspect name to the number on the character.
    // This is only used to keep track of the current toggles.
    _player_aspects: { [key: string]: number };

    constructor(level: number) {
        this._level = level;
        this._equipment = {
            helmet: null, 
            bodyArmor: null, 
            pants: null, 
            boots: null, 
            gloves: null, 
            amulet: null, 
            ring1: null, 
            ring2: null, 
            weapon: null,
            off_hand: null
        }

        this._basic_ability_name = null
        this._core_ability_name = null;
        this._ability_1_name = null;
        this._ability_2_name = null;;
        this._ability_3_name = null;
        this._ability_4_name = null;

        this._player_aspects = {};
    }

    set SetNotRingArmor(new_armor: Equipment) {
        if (new_armor.GetEquipmentType == "ring" || new_armor.GetEquipmentType == "weapon" || new_armor.GetEquipmentType == "offhand") {
            throw "SetNotRingArmor should not be used with equipment of type " + new_armor.GetEquipmentType + "!";
        }
        this._equipment[new_armor.GetEquipmentType] = new_armor;
        if (new_armor._aspect != null) {
            this.AddAspect(new_armor._aspect[0]);
        }
    }

    RemoveNotRingArmor(armor_type: EquipmentType): void {
        if (armor_type == "ring" || armor_type == "weapon" || armor_type == "offhand") {
            throw "RemoveNotRingArmor should not be used with EquipmentType " + armor_type + "!";
        }
        let previous_armor = this._equipment[armor_type];
        if (previous_armor != null) {
            let previous_aspect = previous_armor.GetAspect;
            if (previous_aspect != null) {
                this.RemoveAspect(previous_aspect[0]);
            }
        }
        this._equipment[armor_type] = null;
    }

    SetRingArmor(new_ring: Equipment, slot: 1 | 2): void {
        if (new_ring.GetEquipmentType != "ring") {
            throw "SetRingArmor should only be used with rings!";
        }
        let key: string;
        if (slot == 1) {
            key = "ring1"
        } else {
            key = "ring2"
        }
        this._equipment[key] = new_ring;
        if (new_ring._aspect != null) {
            this.AddAspect(new_ring._aspect[0]);
        }
    }

    RemoveRingArmor(slot: 1 | 2): void {
        let key: string;
        if (slot == 1) {
            key = "ring1"
        } else {
            key = "ring2"
        }
        let previous_ring = this._equipment[key];
        if (previous_ring != null) {
            let previous_aspect = previous_ring.GetAspect;
            if (previous_aspect != null) {
                this.RemoveAspect(previous_aspect[0]);
            }
        }
        this._equipment[key] = null;
    }

    set SetWeapon(weapon: Equipment) {
        if (weapon.GetEquipmentType != "weapon") {
            throw "SetWeapon should not be used with equipment of type " + weapon.GetEquipmentType + "!";
        }
        this.RemoveWeapon();
        this._equipment.weapon = weapon;
        if (weapon._aspect != null) {
            this.AddAspect(weapon._aspect[0]);
        }
    }

    RemoveWeapon(): void {
        const weapon = this._equipment.weapon;
        if (weapon == null) {
            return;
        }
        this._equipment.weapon = null;
        let previous_aspect = weapon.GetAspect;
        if (previous_aspect != null) {
            this.RemoveAspect(previous_aspect[0]);
        }
    }

    set SetOffHand(offhand: Equipment) {
        if (offhand.GetEquipmentType != "offhand") {
            throw "SetOffHand must be applied to a weapon of type 'OffHand'."
        }
        this.RemoveOffHand();
        this._equipment.off_hand = offhand;
        if (offhand._aspect != null) {
            this.AddAspect(offhand._aspect[0]);
        }
    }

    RemoveOffHand(): void {
        let weapon_type = this.GetWeaponType;
        if (weapon_type != null && TwoHandWeaponTypes.has(weapon_type)) {
            if (this._equipment.off_hand != null) {
                throw "Found both off-hand and Two handed weapon equipped."
            }
        this.RemoveWeapon;
        return;
        }
        const off_hand = this._equipment.off_hand;
        if (off_hand == null) {
            return;
        }
        this._equipment.off_hand = null;
        let previous_aspect = off_hand.GetAspect;
        if (previous_aspect != null) {
            this.RemoveAspect(previous_aspect[0]);
        }
    }

    get GetWeaponType(): WeaponType {
        let weapon = this._equipment["weapon"];
        if (weapon == null) {
            return null;
        }
        return weapon.GetWeaponType;
    }

    AddTalent(talent_name: string): void {
        if (!(talent_name in this._player_talents)) {
            throw "Cannot add unsupported talent " + talent_name + "."
        }
        if (this._player_talents[talent_name][0] >= this._player_talents[talent_name][1]) {
            throw "Cannot add talent. Already at maximum points allowed.";
        }
        this._player_talents[talent_name][0] += 1;
        if (talent_name in this._toggle_maps._talent_toggle_map) {
            for (const toggle_name of this._toggle_maps._talent_toggle_map[talent_name]) {
                let toggle = this._toggle_maps._toggle_map[toggle_name]; 
                if (this.SatisfiesToggleRequirements(toggle)) {
                    toggle.SetActiveStatus = true;
                }
            }
        }
    }

    RemoveTalent(talent_name: string): void {
        if (!(talent_name in this._player_talents)) {
            throw "Cannot remove unsupported talent " + talent_name + "."
        }
        if (this._player_talents[talent_name][0] <= 0) {
            throw "There are no talents to remove.";
        }
        this._player_talents[talent_name][0] -= 1;
        if(this._player_talents[talent_name][0] == 0) {
            if (talent_name in this._toggle_maps._talent_toggle_map) {
                for (const toggle_name of this._toggle_maps._talent_toggle_map[talent_name]) {
                    this._toggle_maps._toggle_map[toggle_name].SetActiveStatus = false;
                }
            }
        }
    }

    GetTalentPoints(talent_name: string): number {
        return this._player_talents[talent_name][0];
    }

    // Returns true if at least one of skill_names are equipped.
    HasAnyOfSkill(skill_names: string[]) {
        for (const skill of skill_names) {
            if (this._basic_ability_name == skill || this._core_ability_name == skill ||
                this._ability_1_name == skill || this._ability_2_name == skill || 
                this._ability_3_name == skill || this._ability_4_name == skill ) {
                    return true;
            }
        }
        return false;
    }

    HasTalent(talent_name: string) {
        return this.GetTalentPoints(talent_name) > 0;
    }

    HasAspect(aspect_name: string) {
        return aspect_name in this._player_aspects;
    }

    AddAspect(aspect_name: string) { 
        if (aspect_name in this._player_aspects) {
            this._player_aspects[aspect_name] += 1;
        } else {
            this._player_aspects[aspect_name] = 1;
        }
        this.UpdateAspectToggles(aspect_name);
    }

    SatisfiesToggleRequirements(toggle: Toggle): boolean {
        if (!toggle) {
            throw "Undefined toggle has no requirements!"
        }
        for (const req of toggle.GetRequirements) {
            let split_req = req.split(":");
            if (split_req[0] == "talent" && !this.HasTalent(split_req[1])) {
                return false;
            }
            if (split_req[0] == "aspect" && !this.HasAspect(split_req[1])) {
                return false;
            }
            // Used for skills
            if (split_req[0] == "skill" && !this.HasAnyOfSkill(split_req[1].split("|"))) {
                return false;
            }
        }
        return true;
    }

    UpdateAspectToggles(aspect_name: string): void {
        if (!(aspect_name in this._toggle_maps._aspect_toggle_map)) {
            throw " Can't update toggle. No toggle found for aspect" + aspect_name + "."
        }
        for (let toggle_name of this._toggle_maps._aspect_toggle_map[aspect_name]) {
            let toggle = this._toggle_maps._toggle_map[toggle_name];
            if (this.SatisfiesToggleRequirements(toggle)) {
                toggle.SetActiveStatus = true;
            }
        }
    }

    RemoveAspect(aspect_name: string): void {
        if (this._player_aspects[aspect_name] <= 0) {
            throw "Cannot remove aspect " + aspect_name + " when there are none found."
        }
        this._player_aspects[aspect_name] -= 1;
        // Remove aspect from map if there are no more on the player.
        if (this._player_aspects[aspect_name] == 0) {
            delete this._player_aspects[aspect_name];
            if (aspect_name in this._toggle_maps._aspect_toggle_map) {
                for (const toggle_name of this._toggle_maps._aspect_toggle_map[aspect_name]) {
                    this._toggle_maps._toggle_map[toggle_name].SetActiveStatus = false;
                }
            }
        }
    }

    UpdateSkillToggles(skill_name: string, previous_skill_name: string | null): void {
        if (previous_skill_name != null && (previous_skill_name in this._toggle_maps._skill_toggle_map)) {
            for (const toggle_name of this._toggle_maps._skill_toggle_map[previous_skill_name]) {
                this._toggle_maps._toggle_map[toggle_name].SetActiveStatus = false ;
            }
        }
        if (skill_name in this._toggle_maps._skill_toggle_map) {
            for (let toggle_name of this._toggle_maps._skill_toggle_map[skill_name]) {
                let toggle = this._toggle_maps._toggle_map[toggle_name];
                if (this.SatisfiesToggleRequirements(toggle)) {
                    toggle.SetActiveStatus = true;
                }
            }
        }
    }

    UpdateToggleValue(toggle_name: string, value: boolean | number): void {
        if (!(toggle_name in this._toggle_maps._toggle_map.hasOwnProperty)) {
            throw "Cannot update toggle with toggle name " + toggle_name + " since it doesn't exist!"
        }
        let toggle = this._toggle_maps._toggle_map[toggle_name];
        if (!toggle.GetActiveStatus) {
            throw "Cannot update toggle value for disabled toggle."
        }
        toggle.SetValue = value;
    }
}