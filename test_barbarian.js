"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const equipment_1 = require("./equipment");
const Barbarian_1 = require("./Barbarian");
const run_calculation_1 = require("../graph_based_calculator/run_calculation");
let helmet = new equipment_1.Equipment([["Armor_Bonus", 25]], "helmet", 4);
helmet.ChangeModifier(0, ["Resource_Cost_Reduction_Percent_All", .05]);
helmet.ChangeModifier(1, ["Hitpoints_Max_Bonus", 20]);
helmet.ChangeModifier(2, ["Attack_Speed_Percent_Bonus", 0.015]);
let ring = new equipment_1.Equipment([["Resistance#Cold", .15]], "ring", 2);
ring.ChangeModifier(0, ["Crit_Percent_Bonus", .05]);
ring.ChangeModifier(1, ["Flat_Damage_Bonus", 20]);
let sword = new equipment_1.Equipment([["One_Hand_Slashing_Damage", 150]], "weapon", 4, "OneHandSword", 1.4);
sword.ChangeModifier(0, ["Crit_Percent_Bonus_To_Vulnerable", .05]);
sword.ChangeModifier(1, ["Damage_Bonus_To_Near", .12]);
sword.ChangeModifier(2, ["Damage_Percent_Bonus_Basic_Skill", 0.15]);
let axe = new equipment_1.Equipment([["One_Hand_Slashing_Damage", 150]], "weapon", 4, "OneHandAxe", 1.3);
axe.ChangeModifier(0, ["Damage_Percent_Bonus_Two_handed", .1]);
axe.ChangeModifier(1, ["Overpower_Chance_Bonus", .1]);
let Sam = new Barbarian_1.Barbarian(10);
Sam.SetNotRingArmor = helmet;
Sam.SetRingArmor(ring, 1);
Sam.SetWeapon = sword;
Sam.SetOffHand = axe;
Sam.AddTalent("Flay");
for (let i = 0; i < 5; i++) {
    Sam.AddTalent("Rend");
}
Sam.SetBasicSkill("Flay");
Sam.SetCoreSkill("Rend");
// console.log(helmet.GetModifiers)
// console.log(ring.GetModifiers)
// console.log(sword.GetModifiers)
// console.log(Sam._equipment.off_hand.GetModifiers)
const test_return = (0, run_calculation_1.RunCalculations)(Sam);
for (const [key, val] of Object.entries(test_return)) {
    for (const [key2, val2] of Object.entries(val)) {
        if (key2 == "Flay" || key2 == "Rend") {
            for (const [key3, val3] of Object.entries(val2)) {
                console.log(key2 + "::" + key3 + "::" + val3);
            }
        }
        else {
            console.log(key2 + "::" + val2);
        }
    }
}
//# sourceMappingURL=test_barbarian.js.map