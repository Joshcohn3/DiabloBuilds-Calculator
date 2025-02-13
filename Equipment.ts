  
export type EquipmentType = "helmet" | "chest" | "pants" | "boots" | "gloves" | "amulet" | "ring" | "weapon" | "offhand";
export type WeaponType = "TwoHandSword" | "TwoHandMace" | "TwoHandAxe" | "Polearm" | "OneHandAxe" | "OneHandMace" | "OneHandSword" | null;

export class Equipment {
  _equipment_type: EquipmentType;
  _weapon_type: WeaponType;
  _implicit_modifiers: Array<[string, number]>;
  _modifiers: Array<[string, number] | null> ;
  _aspect: [string, number[]] | null;
  _attack_speed: number | null;

  constructor(implicit_modifiers: Array<[string, number]>, equipment_type: EquipmentType, num_modifiers: number, weapon_type: WeaponType = null, weapon_attack_speed: number | null = null) {
    if (weapon_type != null && equipment_type != "weapon") {
      throw "weapon type should be null for EquipmentType != weapon."
    }
    this._equipment_type = equipment_type;
    this._weapon_type = weapon_type;
    this._implicit_modifiers = implicit_modifiers;
    this._modifiers = Array(num_modifiers).fill(null);
    this._aspect = null;
    this._attack_speed = weapon_attack_speed;
  }

  get GetModifiers(): Array<[string, number]> {
      let present_modifiers = [].concat(this._implicit_modifiers);
      for (const mod of this._modifiers) {
        if (mod != null) {
          present_modifiers.push(mod);
        }
      }
      return present_modifiers;
  }

  // Modifies a modifier in a particular slot of the helmet.
  ChangeModifier(idx: number, modifier: [string, number]): void {
    this._modifiers[idx] = modifier;
  }

  // Removes a modifier in a particular slot of the helmet.
  RemoveModifier(idx: number): void {
    this._modifiers[idx] = null;
  }

  // Returns the aspect if there is one.
  get GetAspect(): [string, number[]] | null {
      return this._aspect;
  }

  // Adds an aspect with the given name.
  set SetAspect(aspect: [string, number[]]) {
    this._aspect = aspect;
  }

  // Removes the aspect if there is one.
  RemoveAspect(): void {
    this._aspect = null;
  }

  get GetEquipmentType(): EquipmentType {
    return this._equipment_type;
  }

  get GetWeaponType(): WeaponType {
    return this._weapon_type;
  }

  get GetAttackSpeed(): number | null {
    return this._attack_speed;
  }
}

export const OneHandWeaponTypes = new Set(["OneHandAxe", "OneHandMace", "OneHandSword"]);
export const TwoHandWeaponTypes = new Set(["TwoHandAxe", "TwoHandMace", "TwoHandSword", "Polearm"]);
export const TwoHandSlashingWeaponTypes = new Set(["TwoHandAxe", "TwoHandSword", "Polearm"]);
export const TwoHandBludgeonWeaponTypes = new Set(["TwoHandMace"]);

export const WeaponTypesToDamage: { [key: string]: string } = {
  TwoHandSword: "2HSlashingDamage",
  TwoHandMace: "2HBludgeonDamage",
  TwoHandAxe: "2HSlashingDamage",
  Polearm: "2HSlashingDamage",
  OneHandMace: "DualWieldDamage",
  OneHandSword: "DualWieldDamage",
  OneHandAxe: "DualWieldDamage"
};