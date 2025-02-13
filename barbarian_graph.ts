import { ModifierNode, TalentNode, ToggleNode, BaseStatsNode, TriggerNode, StatsNode, AspectNode, SkillNode, DiabloNode, NodesMap } from "./computation_graph";

/*
Here we build the computation graph for the Barbarian. We construct maps for each type of node which contain all nodes of that
type. For nodes types which have no dependencies, we have functions to manually modify and set the value for that node. For
node types which do depend on other nodes, we pass an `update_value_function` into the constructor which uses the value of
other nodes to compute the value of that node. The value need only be computed a single time once all the root nodes are fixed.
We start with the nodes which have no dependencies.
*/


const BarbarianModifierNames: string[] = [

    /*--------------------------------------------------
                  OFFENSIVE MODIFIERS
    --------------------------------------------------*/

    //Damage Multiplier Node:
    "Damage_Bonus_At_High_Health", // "+[{VALUE}*100|1%|] Damage While Healthy",
    "Damage_Bonus_On_Elite_Kill_Combined", // "+[{VALUE}*100|1%|] Damage for {VALUE2} seconds on Elite kill",
    "Damage_Bonus_Percent_After_Dodge", // "+[{VALUE}*100|1%|] Damage for {VALUE2} Seconds After Dodging an Attack",
    "Damage_Bonus_To_Far", // "+[{VALUE}*100|1%|] Damage To Distant Enemies",
    "Damage_Bonus_To_High_Health", // "+[{VALUE}*100|1%|] Damage to Healthy Enemies",
    "Damage_Bonus_To_Low_Health", // "+[{VALUE}*100|1%|] Damage to Injured Enemies",
    "Damage_Bonus_To_Near", // "+[{VALUE}*100|1%|] Damage To Close Enemies",
    //"Damage_Percent_All_From_Skills", // "+[{VALUE}*100|1%|] Damage",
    //"Damage_Percent_Bonus_Against_Dot_Type", // "+[{VALUE2}*100|1%|] Damage To {VALUE1} Enemies", => "Damage_Percent_Bonus_Against_Bleed" For Barbarian
    // "Damage_Percent_Bonus_Per_Power_Category", // "+[{VALUE2}*100|1%|] {VALUE1} Skill Damage", =>  https://diablo.fandom.com/wiki/Power_(Diablo_IV)

    // "Damage_Percent_Bonus_Per_Shapeshift_Form", // "+[{VALUE2}*100|1%|] Damage While in {VALUE1}", Druid Only
    // "Damage_Percent_Bonus_Per_Skill_Cat", // "+[{VALUE2}*100|1%|] {VALUE1} Skill Damage", (Maybe Druid only?)
    // "Damage_Percent_Bonus_Per_Skill_Tag", // "+[{VALUE2}*100|1%|] {VALUE1} Skill Damage", => Bludgeon, Fire, Slashing, Lightning, etc.
    "Damage_Percent_Bonus_Basic_Skill",
    "Damage_Percent_Bonus_Core_Skill",
    "Damage_Percent_Bonus_Brawling_Skill",
    "Damage_Percent_Bonus_Weapon_Mastery_Skill",
    "Damage_Percent_Bonus_Defensive_Skill",
    "Damage_Percent_Bonus_Ultimate_Skill",
    "Damage_Percent_Bonus_Physical_Damage",
    "Damage_Percent_Bonus_Physical_Damage_Over_Time",
    "Damage_Percent_Bonus_Bludgeon_Damage",
    "Damage_Percent_Bonus_Slashing_Damage",
    //"Damage_Percent_Bonus_Per_Weapon_Requirement", // "+[{VALUE2}*100|1%|] Damage With {VALUE1}",
    "Damage_Percent_Bonus_Two_handed",
    "Damage_Percent_Bonus_Dualwield_Damage",
    //"Damage_Percent_Bonus_To_Targets_Affected_By_Skill_Cat", // "+[{VALUE2}*100|1%|] Damage To Enemies Affected by {VALUE1} Skills",
    //"Damage_Percent_Bonus_To_Targets_Affected_By_Skill_Tag", // "+[{VALUE2}*100|1%|] Damage To Enemies Affected by {VALUE1} Skills",
    "Damage_Percent_Bonus_To_Targets_Affected_By_Basic_Skill",
    "Damage_Percent_Bonus_To_Targets_Affected_By_Core_Skill",
    "Damage_Percent_Bonus_To_Targets_Affected_By_Brawling_Skill",
    "Damage_Percent_Bonus_To_Targets_Affected_By_Weapon_Mastery_Skill",
    "Damage_Percent_Bonus_To_Targets_Affected_By_Defensive_Skill",
    "Damage_Percent_Bonus_To_Targets_Affected_By_Ultimate_Skill",
    "Damage_Percent_Bonus_To_Targets_Affected_By_Physical_Damage",
    "Damage_Percent_Bonus_To_Targets_Affected_By_Physical_Damage_Over_Time",
    "Damage_Percent_Bonus_To_Targets_Affected_By_Bludgeon_Damage",
    "Damage_Percent_Bonus_To_Targets_Affected_By_Dualwield_Damage",
    "Damage_Percent_Bonus_To_Targets_Affected_By_Slashing_Damage",
    "Damage_Percent_Bonus_Vs_CC_All", // "+[{VALUE}*100|1%|] Damage to Crowd Controlled Enemies",
    //"Damage_Percent_Bonus_Vs_CC_Target", // "+[{VALUE2}*100|%|] Damage to {VALUE1} Enemies",
    "Damage_Percent_Bonus_Vs_Dazed_Target",
    "Damage_Percent_Bonus_Vs_Slowed_Target",
    "Damage_Percent_Bonus_Vs_Stunned_Target",
    "Damage_Percent_Bonus_Vs_Elites", // "+[{VALUE}*100|1%|] Damage to Elites",
    "Damage_Percent_Bonus_When_Fortified", // "+[{VALUE}*100|1%|] Damage While Fortified",
    "Damage_Percent_Bonus_When_Weapon_Swapping", // "+[{VALUE}*100|1%|] Damage When Swapping Weapons", (Barbarian Only)
    //"Damage_Percent_Bonus_While_Affected_By_Power", // "+[{VALUE2}*100|1%|] Damage While {VALUE1}",
    "Damage_Percent_Bonus_While_Berserking",
    //"Damage_Percent_Bonus_While_Shapeshifted", // "+[{VALUE}*100|1%|] Damage While Shapeshifted", (Druid only)
    //"Damage_Type_Percent_Bonus", // "+[{VALUE2}*100|1%|] {VALUE1} Damage",
    //"Damage_Type_Percent_Bonus_Vs_Elites", // "+[{VALUE2}*100|1%|] {VALUE1} Damage to Elites",
    "Damage_Percent_Bonus_Physical_Damage_Vs_Elites",
    "Damage_Percent_Bonus_Physical_Damage_Over_Time_Vs_Elites",
    "Damage_Percent_Bonus_Bludgeon_Damage_Vs_Elites",
    "Damage_Percent_Bonus_Dualwield_Damage_Vs_Elites",
    "Damage_Percent_Bonus_Slashing_Damag_Vs_Elites",
    "NonPhysical_Damage_Percent_Bonus", // "+[{VALUE} * 100|1%|] Non-Physical Damage",


    // Berserk
    "Berserk_Damage_Percent_Bonus",  //"Power_Damage_Percent_Bonus", // "+[{VALUE2}*100|1%|] Damage with {VALUE1}"

    // Weapon Damage Node: This value is added to Weapon Damage, prior to all the +% Damage Modifiers
    "Weapon_Damage_Bonus", // "[{VALUE}|~|] Weapon Damage".
    "Main_Hand_Damage_Percent_Bonus", // "+[{vALUE} * 100|%|] Bonus to Main Hand Weapon Damage",

    // Flat Damage Node: // Not sure exactly how it works.  For now treat this as Damage added after +% Damage Modifiers
    "Flat_Damage_Bonus", // "+{VALUE2} {VALUE1} Damage", // Additive Flat Damage
    "Flat_Damage_On_Hit", // "+[{VALUE}] Damage Chance on Hit", // Chance to deal additive flat damage

    // Attack Speed Node:
    "Attack_Speed_Bonus_After_Dodge", // "[{VALUE}*100|1%|] Increased Attack Speed for {VALUE2} Seconds After Dodging an Attack",
    "Attack_Speed_Percent_Bonus", // "+[{VALUE} * 100|1%|] Attack Speed",
    "Attack_Speed_Percent_Bonus_For_Power", // "+[{VALUE2} * 100|%|] Attack Speed of {VALUE1}",
    "Attack_Speed_Percent_Bonus_While_Fortified", // "+[{VALUE} * 100|1%|] Attack Speed While Fortified",
    "Weapon_Speed_Percent_Bonus", // "+[{VALUE} * 100|%|] Weapon Speed",

    // Crit Chance Node: Default Critical Damage Chance = 5.0%
    "Crit_Chance_Bonus_To_Far", //  "+[{VALUE}*100|1%|] Critical Chance to Distant Enemies",
    "Crit_Chance_Bonus_To_Near", //  "+[{VALUE}*100|1%|] Critical Chance to Close Enemies",
    "Damage_Type_Crit_Chance_Bonus_Vs_Elites", //  "+[{VALUE2}*100|1%|] Critical Strike Chance For {VALUE1} Damage Against Elites",
    "Damage_Type_Crit_Percent_Bonus", //  "+[{VALUE2}*100|1%|] Critical Strike Chance For {VALUE1} Damage",
    "Crit_Percent_Bonus", //  "+[{VALUE}*100|1%|] Critical Strike Chance",
    "Crit_Percent_Bonus_Per_Power_Cat", //  "+[{VALUE2}*100|1%|] Critical Strike Chance For {VALUE1} Skills",
    "Crit_Percent_Bonus_Per_Skill_Cat", //  "+[{VALUE2}*100|%|] Critical Strike Chance for {VALUE1} Skills",
    "Crit_Percent_Bonus_Per_Skill_Tag", //  "+[{VALUE2}*100|%|] Critical Strike Chance for {VALUE1} Skills",
    "Crit_Percent_Bonus_Per_Weapon_Requirement", //  "+[{VALUE2}*100|1%|] Critical Strike Chance With {VALUE1}",
    "Crit_Percent_Bonus_To_Low_Health", //  "+[{VALUE}*100|%|] Critical Strike Chance Against Low Health Enemies",
    "Crit_Percent_Bonus_To_High_Health",
    "Crit_Percent_Bonus_To_Vulnerable", //  "+[{VALUE}*100|1%|] Critical Hit Chance Against Vulnerable Enemies",
    "Crit_Percent_Bonus_Vs_CC_Target", //  "+[{VALUE2}*100|1%|] Critical Hit Chance Against {VALUE1} Enemies",
    "Crit_Percent_Bonus_Vs_CC_Target_Any", //  "+[{VALUE}*100|1%|] Critical Hit Chance Against Crowd Controlled Enemies",
    "Crit_Percent_Bonus_Vs_Stunned",
    "Crit_Percent_Bonus_Vs_Frozen",
    "Crit_Percent_Bonus_Vs_Dazed",
    "Crit_Percent_Bonus_Vs_Slowed",
    
    // Crit Multiplier Node: Default Critical Damage Multiplier is +50% Damage on Critical Hit
    "Crit_Damage_Bonus_To_Far", // "+[{VALUE}*100|1%|] Critical Strike Damage to Distant Enemies",
    "Crit_Damage_Bonus_To_Near", // "+[{VALUE}*100|1%|] Critical Strike Damage to Close Enemies",
    "Crit_Damage_Percent", // "+[{VALUE}*100|1%|] Critical Strike Damage",
    "Crit_Damage_Percent_Bonus_To_Vulnerable", // "+[{VALUE}*100|1%|] Critical Strike Damage to Vulnerable Enemies",
    "Crit_Damage_Percent_Bonus_Vs_CC_Target_Any", // "+[{VALUE}*100|1%|] Critical Strike Damage to Crowd-Controlled Enemies",
    "Crit_Damage_Percent_Bonus_Vs_Slowed",
    "Crit_Damage_Percent_Bonus_Vs_Frozen",
    "Crit_Damage_Percent_Bonus_Vs_Dazed",
    "Crit_Damage_Percent_Bonus_Vs_Stunned",
    "Crit_Damage_Percent_For_Power", // "+[{VALUE2}*100|1%|] Critical Strike Damage for {VALUE1}",
    "Crit_Damage_Percent_Per_Power_Cat", // "+[{VALUE2}*100|1%|] Critical Strike Damage for {VALUE1} Skills",
    "Crit_Damage_Percent_Per_Skill_Cat", // "+[{VALUE2}*100|1%|] Critical Strike Damage for {VALUE1} Skills",
    "Crit_Damage_Percent_Per_Skill_Tag", // "+[{VALUE2}*100|1%|] Critical Strike Damage for {VALUE1} Skills",
    "Crit_Damage_Percent_Per_Weapon_Requirement", // "+[{VALUE2}*100|1%|] Critical Strike Damage With {VALUE1}",
    "Damage_Type_Crit_Damage_Percent_Bonus", // "+[{VALUE2}*100|1%|] Critical Strike {VALUE1} Damage",
    "Damage_Type_Crit_Percent_Bonus_Vs_Elites", // "+[{VALUE2}*100|1%|] {VALUE1} Damage to Elites",
    "Imbued_Skill_Crit_Damage_Percent_Bonus", // "+[{VALUE}*100|%|] Critical Damage for Imbued Skills",
    "Non_Physical_Crit_Damage_Percent_Bonus", // "+[{VALUE}*100|%|] Non-Physical Critical Strike Damage",
    "Crit_Damage_Percent_Slashing", // "+[{VALUE2}*100|1%|] Critical Strike Damage With {VALUE1}",
    "Crit_Damage_Percent_Bludgeoning",
    "Crit_Damage_Percent_Dual_Wielding",
    "Crit_Damage_Percent_Two_Hand",


    // Overpower Chance Node: (Base Chance is 3.0% to Overpower)
    "Overpower_Chance_Bonus", // "+[{VALUE}*100|1%|] Overpower Chance",
    
    // Overpower Damage Node: 
    // Overpower adds to Weapon Damage.  (Base Damage Overpower = Current Life + Fortify).  Overpower Minimum Bonus = +50% Weapon Damage, if current life & fortify are low it still adds damage.
    // Overpower Damage is a multiplier for the value that Overpower provides.
    "Overpower_Damage_Percent_Bonus", // "+[{VALUE}*100}|1%|] Overpower Damage",
    "Overpower_Damage_Percent_Bonus_Per_Skill_Cat", // "+[{VALUE2}*100|1|]% Overpower Damage for {VALUE1}",
    "Overpower_Damage_Percent_Bonus_Per_Skill_Tag", // "+[{VALUE2}*100|1|]% Overpower Damage for {VALUE1}",
    "Overpower_Damage_Percent_Bonus_Per_Weapon_Requirement", // "+[{VALUE2}*100|1%|] Overpower Damage With {VALUE1}",

    // Crushing Blow Chance Node:
    "Crushing_Blow_Chance_Bonus", // "+[{VALUE}*100|1%|] Crushing Chance", Deals a percentage of Enemy targets current % Life

    // Crushing Blow Damage Node:
    "Crushing_Blow_Damage_Percent_Bonus", // "+[{VALUE}*100}|1%|] Crushing Damage",

    // Vulnerable Node: Increases the Bonus Damage a vulnerable enemy receives.  Base Vulnerable Damage multiplier is +20%
    "Vulnerable_Damage_Bonus", // "+[{VALUE}*100|1%|] Vulnerable Damage",

    // Minion Damage Node:
    "Pet_Equipped_Other_Attacker_Damage_Bonus", // "+[{VALUE}*100|%|] Damage for each other Minion attacking the same Enemy",
    "Amplify_Damage_From_Pets_Per_Player_Percent", // "+[{VALUE}*100|%|] Minion Damage",
    "Pet_Damage_Bonus_Percent", // "+[{VALUE}*100|1%|] Minion Damage",
    "NecroArmy_Pet_Type_Damage_Bonus_Pct", // "+[{VALUE2}*100|1%|] {VALUE1} Damage",
    "Pet_Equipped_Solo_Attacker_Damage_Bonus", // "+[{VALUE}*100|%|] Damage if this is the only Minion attacking the Enemy",
    "Pet_Equipped_Recently_Summoned_Damage_Bonus", // "+[{VALUE}*100|%|] Damage for 8 seconds after being summoned",
    "Per_Damage_Type_Buff_Duration_Bonus_Percent", // "+[{VALUE2}*100|%|] Duration of {VALUE1} Damage Over Time Effects",

    // Thorns Node:
    "Thorns_Flat", // "+[{VALUE}] Thorns",

    // Skill Ranks: These are Mods are add +Ranks to Skills
    "Skill_Rank_All_Bonus", // "+{VALUE1} |4Rank:Ranks; to All Skills",
    "Skill_Rank_Bonus", // "+{VALUE2} |4Rank:Ranks; to {VALUE1}",
    "Skill_Rank_Power_Category_Bonus", // "+{VALUE2} |4Rank:Ranks; to {VALUE1} Skills",
    "Skill_Rank_Skill_Category_Bonus", // "+{VALUE2} |4Rank:Ranks; to {VALUE1} Skills",
    "Skill_Rank_Skill_Tag_Bonus", // "+{VALUE2} |4Rank:Ranks; to {VALUE1} Skills",

    // Talents which are not Skills
    "Talent_Rank_Bonus", // "+{VALUE2} |4Rank:Ranks; to the {VALUE1} Passive", // Add Ranks to Talents that are not skills

    // On Hit Effects
    "On_Crit_CC_Proc_Chance", // "{c_label}Lucky Hit:{/c} Critical Strikes have up to +[{VALUE2} * 100|1%|] {VALUE1} Chance",
    "On_Hit_CC_Proc_Chance", // "{c_label}Lucky Hit:{/c} Up to +[{VALUE2} * 100|1%|] Chance to {VALUE1}",
    "On_Hit_Execute_Low_Health_Non_Elite_Chance", // "{c_label}Lucky Hit:{/c} Up to +[{VALUE}*100|1%|] Chance to Execute Injured Non-Elites",
    "On_Hit_Knockback_Proc_Chance", // "{c_label}Lucky Hit:{/c} Up to [{VALUE} * 100|1%|] Chance to Knockback",
    "On_Hit_Vulnerable_Proc", // "{c_label}Lucky Hit:{/c} Up to [{VALUE}*100|1%|] Chance to Make Enemies Vulnerable for {VALUE2} Seconds",
    "Combat_Effect_Chance_Bonus", // "+[{VALUE}*100|1%|] Lucky Hit Chance",
    "Combat_Effect_Chance_Bonus_Per_Damage_Type", // "+[{VALUE2}*100|1%|] Lucky Hit Chance For {VALUE1} Damage","Vulnerable_Health_Application_Bonus": "(PH)",
    "Combat_Effect_Chance_Bonus_Per_Skill", // "(PH)",
    "Vulnerable_Health_Application_Bonus", // "(PH)",
    "Vulnerable_Health_Flat_Amount_On_Crit", // "[{VALUE}] Vulnerable on Critical Strike",
    "Lucky_Hit_Chance_Bonus", // Flat +% Increases to Lucky Hit Chance effects

    /*--------------------------------------------------
                  DEFENSIVE MODIFIERS
    --------------------------------------------------*/
   
    // Hit Points/Life:
    "Hitpoints_Max_Bonus", // "[{VALUE}|~|] Life",
    "Hitpoints_Max_Percent_Bonus", // "[{VALUE}*100|~%|] Life",
    "Hitpoints_Max_Percent_Bonus_Item", // "[{VALUE}*100|~%|] Life",
    "Hitpoints_Percent", // "[{VALUE}*100|~%|] Life",

    // Healing
    "Hitpoints_On_Elite_Kill", // "[{VALUE}*100|%|] Heal on Elite kill",
    "Hitpoints_Regen_Bonus_Percent", // "[{VALUE}*100|~%|] Bonus Hitpoint Regeneration",
    "Hitpoints_Regen_Per_Second", // "[{VALUE}] Regenerated Life per Second",
    "No_Damage_Taken_Flat_Hitpoints_Regen_Per_Second", // "+[{VALUE}] Life Regeneration per Second",
    "Flat_Damage_Shield_On_Kill", // "+[{VALUE}] Damage Shield after Each Kill",
    "Flat_Heal_Absorb", // "{c_label}Lucky Hit:{/c} 5% chance to absorb [{VALUE}] healing",
    "Flat_Hitpoints_Granted", // "Restores [{VALUE}] Life",
    "Flat_Hitpoints_On_Hit", // "(PH)",
    "Flat_Hitpoints_On_Kill", // "[{VALUE}|~|] Life On Kill",
    "Steal_Health_Percent", // "[{VALUE}*100|2%|] of Damage Dealt Is Converted to Life",
    "Blood_Orb_Pickup_Healing_Percent_Bonus", // "+[{VALUE}*100|1%|] Blood Orb Healing",
    "Bonus_Healing_Received_Percent", // "+[{VALUE}*100|%|] Healing Received",
    "OOC_Flat_Hitpoints_Regen_Per_Second", // "[{VALUE}] Life Regeneration per Second While Out of Combat",
    "Core_Stat_Bonus_Healing_Received_Percent", // "+[{vALUE}*100|1|]% Healing",
    "Percent_Life_On_Kill", // "+[{VALUE}*100|%|] Life on Kill",

    // Resistances
    "Resistance#Cold", // "[{VALUE}*100|1%|] Cold Resistance",
    "Resistance#Fire", // "[{VALUE}*100|1%|] Fire Resistance",
    "Resistance#Lightning", // "[{VALUE}*100|1%|] Lightning Resistance",
    "Resistance#Poison", // "[{VALUE}*100|1%|] Poison Resistance",
    "Resistance#Shadow", // "[{VALUE}*100|1%|] Shadow Resistance",
    "Resistance_All", // "[{VALUE}*100|1%|] Resistance to All Elements",

    // Armor Node:
    "Armor_Bonus", // "+[{VALUE}] Armor", // Flat Bonus Armor
    "Armor_Percent", // "+[{VALUE}*100|1%|] Armor", // % Increase in Total Armor

    // Player Damage Reduction Node:
    "Damage_Percent_Reduction_From_CCed_Target", // "[{VALUE2}*100|%|] Damage Reduction From {VALUE1} Enemies",
    "Damage_Percent_Reduction_From_Dotted_Enemy", // "[{VALUE2}*100|1%|] Damage Reduction From Enemies That Are {VALUE1}",
    "Damage_Percent_Reduction_From_Elites", // "[{VALUE}*100|1%|] Elite Damage Reduction",
    "Damage_Percent_Reduction_From_Targets_With_Skill_Category", // "[{VALUE2} * 100|%|] Damage Reduction from Enemies Affected By {VALUE1} Skills",
    "Damage_Percent_Reduction_From_Targets_With_Skill_Tag", // "[{VALUE2} * 100|%|] Damage Reduction from Enemies Affected By {VALUE1} Skills",
    "Damage_Percent_Reduction_From_Vulnerable_Target", // "[{VALUE}*100|1%|] Damage Reduction From Vulnerable Enemies",
    "Damage_Reduction", // "[{VALUE}*100|1%|] Damage Reduction",
    "Damage_Reduction_At_High_Health", // "[{VALUE}*100|%|] Damage Reduction while Healthy",
    "Damage_Reduction_At_Low_Health", // "[{VALUE}*100|1%|] Damage Reduction when Below 35% Health",
    "Damage_Reduction_During_Evade", // "[{VALUE}*100|1%|] Damage Reduction while Evading",
    "Damage_Reduction_From_Far", // "[{VALUE}*100|1%|] Distant Damage Reduction",
    "Damage_Reduction_From_Near", // "[{VALUE}*100|1%|] Close Damage Reduction",
    "Damage_Reduction_On_Elite_Kill_Combined", // "[{VALUE}*100|1%|] Damage Reduction for {VALUE2} seconds on Elite Kill",
    "Damage_Reduction_While_Crowd_Controlled", // "[{VALUE}*100|1%|] Damage Reduction While Control Impaired",
    "Damage_Reduction_While_Having_Shield", // "[{VALUE}*100|%|] Damage Reduction with an Active Barrier",
    "Damage_Reduction_While_Stationary", // "[{VALUE}*100|1%|] Damage Reduction While Standing Still",

    // Fortify:
    "Fortified_When_Struck_Chance", // "[{VALUE}*100|1%|] Chance When Struck to Fortify {VALUE2} Life",
    "Fortified_Health_Application_Bonus", // "[{VALUE}*100|1%|] Bonus Fortify",
    "Fortified_Health_Damage_Reduction_Bonus", // "[{VALUE}*100|1%|] Damage Reduction While Fortified",


    // Reduced Damage Taken Node:
    "Damage_Absorb_Percent_All", // "[{VALUE}*100|1%|] Damage Reduction",
    "Immunity", // "Immune to {VALUE1} Damage",

    // Increased Damage Taken:
    "Damage_Increase_From_Far", // "+[{VALUE}*100|1%|] Damage Taken From Distant Enemies",
    "Damage_Increase_From_Near", // "+[{VALUE}*100|1%|] Damage Taken From Close Enemies",
    "Damage_Increase_While_Stationary", //"+[{VALUE}*100|1%|] Damage While Stationary",

    // Potions
    "Faster_Healing_Percent", // "+{VALUE%} Faster Healing from Potions",
    "Potion_Bonus_Heal_Percent", // "[{VALUE}*100|1%|] Potion Healing",
    "Potion_Charge_Generation_Bonus_Pct", // "+[{VALUE2}*100|1|]% Potion Drop Rate",
    "Potion_Cooldown_Reduction_Percent", // "[{VALUE}*100|1%|] Reduced Potion Cooldown",
    "Potion_Max_Doses_Bonus", // "+{vALUE2} Potion Doses",
    "Potion_Use_Granted_Barrier_Percent", // "Your Potion Also Grants [{vALUE2}*100|%|] Maximum Life as Barrier",
    "Potion_Use_Granted_Primary_Resource_Amount", // "Your Potion Also Restores [{vALUE2}]% Resource",
    "Potion_Use_Granted_Unstoppable_Seconds", // "Your Potion Also Grants [{vALUE2}*100|%|] Movement Speed",

    // Chance to Ignore Damage Taken Node:
    "Armor_Ignore_Damage_Percent", // "+[{VALUE}*100|%|] Chance to Ignore Damage Taken",

    // Block Chance Node:
    "Block_Chance", // "[{vALUE}*100|%|] Chance to Block"

    // Block Value Node:
    "Flat_Block_Amount", // "[{VALUE}] {c:FF888888}Shield Block Value{/c:FF888888}", // Flat Shield Block Value
    "Block_Damage_Percent", // "[{vALUE}*100|%|] Blocked Damage Reduction", // % Reduced Damage on Block

    // Dodge Node:
    "Dodge_Chance_Bonus", // "+[{VALUE} * 100|1%|] Dodge Chance",
    "Dodge_Chance_Bonus_From_Dotted_Enemies", // "+[{VALUE2}*100|1%|] Dodge Chance From Enemies That Are {VALUE1}",

    // Barrier Node:
    "Barrier_Bonus_Percent", // "+[{VALUE}*100|1%|] Barrier Potency",
    "Barrier_When_Struck_Chance", // "[{VALUE}*100|1%|] Chance When Struck to Gain {s1} Life As a Barrier for {s2} Seconds",

    // Various Defensive Mods
    "Flat_Damage_Shield_On_Kill", // "+[{VALUE}] Damage Shield after Each Kill",
    "Gethit_Immune", // "Immune to stagger.",


    /*--------------------------------------------------
                  RESOURCE MODIFIERS
    --------------------------------------------------*/

    // Resource Generation
    "Proc_Resource_On_Hit_Percent", // "Chance per Hit to gain +[{VALUE2}*100|1%|] {VALUE1}",
    "Proc_Resource_On_Hit_Percent_All_Primary", // "{c_label}Lucky Hit:{/c} Up to a 5% chance to gain [{VALUE}*100|1%|] Primary Resource",
    //"Resource_Gain_Bonus_Percent", // "+[{VALUE2}*100|%|] {VALUE1} Generation",
    "Resource_Gain_Bonus_Percent_All_Primary", // "+[{VALUE}*100|%|] Resource Generation",
    "Fury_Gain_Bonus_Percent",
    "Resource_On_Crit", // "Grants {VALUE2} {VALUE1} per Critical Strike",
    "Resource_On_Kill", // "Grants {VALUE2} {VALUE1} per Kill",
    //"Resource_Regen_Bonus_Percent", // "[{VALUE2}*100|~%|] Bonus {VALUE1} Regeneration",
    "Max_Fury", // Increase Maximum Fury Capacity

    // Resource Cost Reduction 
    "Resource_Cost_Reduction_Percent", // "[{VALUE2} * 100|%|] {VALUE1} Cost Reduction",
    "Resource_Cost_Reduction_Percent_All", // "[{VALUE}*100|%|] Resource Cost Reduction",

    // Cooldown Reduction
    "Power_Category_Cooldown_Reduction_Percent", // "[{VALUE2} * 100|%|] Cooldown Reduction for {VALUE1} Skills",
    "Power_Cooldown_Reduction_Percent_All", // "[{VALUE1}*100|1%|] Cooldown Reduction",
    "Skill_Category_Cooldown_Reduction_Percent", // "[{VALUE2} * 100w|%|] Cooldown Reduction for {VALUE1} Skills",
    "Skill_Category_Resource_Cost_Reduction_Percent", // "[{VALUE2}*100|%|] Resource Cost Reduction for {VALUE1} Skills",
    "Skill_Tag_Cooldown_Reduction_Percent", // "[{VALUE2} * 100|%|] Cooldown Reduction for {VALUE1} Skills",
    "Skill_Tag_Resource_Cost_Reduction_Percent", // "[{VALUE2}*100|%|] Resource Cost Reduction for {VALUE1} Skills",

    // Mana
    "Steal_Mana_Percent", // "[{VALUE}*100|%|] Mana Stolen per Hit",

    /*--------------------------------------------------
                  MISCELLANEOUS MODIFIERS
    --------------------------------------------------*/
   
    // Sockets
    "Sockets", // "Sockets ([{VALUE}-{VALUE2}])",

    // Attributes
    "Plus_All_Stats", //"[{VALUE}|~|] All Stats",
    "Dexterity", // "[{VALUE}|~|] Dexterity",
    "Dexterity_Percent_Bonus", // "+[{vALUE2}*100|1|]% Dexterity",
    "Intelligence_Percent_Bonus", // "+[{vALUE2}*100|1|]% Intelligence",
    "Intelligence", // "[{VALUE}|~|] Intelligence",
    "Willpower_Percent_Bonus", // "+[{vALUE2}*100|1|]% Willpower",
    "Willpower", // "[{VALUE}|~|] Willpower",
    "Strength_Percent_Bonus", // "+[{vALUE2}*100|1|]% Strength",
    "Strength", // "[{VALUE}|~|] Strength",
    "Gem_Attributes_Multiplier", // "[{VALUE}*100|1%|] Gem Strength in This Item",

    // Crowd Control Related Mods
    "Chill_Bonus_Percent", // "+[{VALUE}*100|%|] to Chill Effects",

    // Movement 
    "Movement_Bonus_Run_Speed", // "+[{VALUE}*100|1%|] Movement Speed",
    "Movement_Speed_Bonus_On_Elite_Kill", // "[{VALUE}*100|%|] Movement Speed on Elite Kill",
    "Run_Speed_Duration", // "Increases movement speed for [{VALUE}] seconds. Effect ends if you deal or receive damage.",

    // Buff Duration
    "Harmful_Buff_Duration_Bonus_Percent", // "+[{VALUE}*100|%|] Harmful Effect Duration",
    "Helpful_Buff_Duration_Bonus_Percent", // "+[{VALUE}*100|%|] Helpful Effect Duration",
    "Shrine_Elixir_Duration_Bonus", // "+[{VALUE}*100|1%|] Shrine Buff Duration",
    
    "Requirements_Ease_Percent", // "[{VALUE}*100|~%|] Requirements",
    "Pierce_Chance", // "[{VALUE}*100|%|] Chance to Pierce",

    // (TODO) Add to these for other classes.
    "One_Hand_Slashing_Damage",
    "One_Hand_Bludgeon_Damage",
    "Two_Hand_Slashing_Damage",
    "Two_Hand_Bludgeon_Damage",
    "Main_Hand_Attack_Speed",
    "Off_Hand_Attack_Speed",
    "Two_Hand_Slashing_Attack_Speed",
    "Two_Hand_Bludgeon_Attack_Speed",
    "Main_Hand_Weapon", // 0 sword, 1 axe, 2 mace
    "Off_Hand_Weapon", // 0 sword, 1 axe, 2 mace
    "Two_Hand_Slashing_Weapon",  // 0 sword, 1 axe, 2 polearm
    "Two_Hand_Bludgeon_Weapon"  // 0 mace
]

// This creates a map from the modifier name above to a modifier node with its name. Used to look up
// nodes and add dependencies.
export function CreateBarbarianModifierNodes(): { [key: string]: ModifierNode } { 
    let nodes = {};
    for (const key of BarbarianModifierNames) {
        nodes[key] = new ModifierNode(key);
    }
    return nodes;
}
// Modifier Nodes Dependencies

const BarbarianTalentsToMaxValue: [string, number][] = [
    ["Flay", 5],
    ["Enhanced Flay", 1],
    ["Battle Flay", 1],
    ["Combat Flay", 1],
    ["Frenzy", 5],
    ["Enhanced Frenzy", 1],
    ["Battle Frenzy", 1],
    ["Combat Frenzy", 1],
    ["Bash", 5],
    ["Enhanced Bash", 1],
    ["Battle Bash", 1],
    ["Combat Bash", 1],
    ["Lunging Strike", 5],
    ["Enhanced Lunging Strike", 1],
    ["Battle Lunging Strike", 1],
    ["Combat Lunging Strike", 1],
    ["Whirlwind", 5],
    ["Enhanced Whirlwind", 1],
    ["Violent Whirlwind", 1],
    ["Furious Whirlwind", 1],
    ["Hammer of the Ancients", 5],
    ["Enhanced Hammer of the Ancients", 1],
    ["Violent Hammer of the Ancients", 1],
    ["Furious Hammer of the Ancients", 1],
    ["Pressure Point", 3],
    ["Endless Fury", 3],
    ["Upheaval", 5],
    ["Enhanced Upheaval", 1],
    ["Violent Upheaval", 1],
    ["Furious Upheaval", 1],
    ["Double Swing", 5],
    ["Enhanced Double Swing", 1],
    ["Violent Double Swing", 1],
    ["Furious Double Swing", 1],
    ["Rend", 5],
    ["Enhanced Rend", 1],
    ["Violent Rend", 1],
    ["Furious Rend", 1],
    ["Ground Stomp", 5],
    ["Enhanced Ground Stomp", 1],
    ["Tactical Ground Stomp", 1],
    ["Strategic Ground Stomp", 1],
    ["Rallying Cry", 5],
    ["Enhanced Rallying Cry", 1],
    ["Tactical Rallying Cry", 1],
    ["Strategic Rallying Cry", 1],
    ["Iron Skin", 5],
    ["Enhanced Iron Skin", 1],
    ["Tactical Iron Skin", 1],
    ["Strategic Iron Skin", 1],
    ["Challenging Shout", 5],
    ["Enhanced Challenging Shout", 1],
    ["Tactical Challenging Shout", 1],
    ["Strategic Challenging Shout", 1],
    ["Imposing Presence", 3],
    ["Martial Vigor", 3],
    ["Outburst", 3],
    ["Tough as Nails", 3],
    ["Kick", 5],
    ["Enhanced Kick", 1],
    ["Mighty Kick", 1],
    ["Power Kick", 1],
    ["War Cry", 5],
    ["Enhanced War Cry", 1],
    ["Mighty War Cry", 1],
    ["Power War Cry", 1],
    ["Charge", 5],
    ["Enhanced Charge", 1],
    ["Mighty Charge", 1],
    ["Power Charge", 1],
    ["Leap", 5],
    ["Enhanced Leap", 1],
    ["Mighty Leap", 1],
    ["Power Leap", 1],
    ["Swiftness", 3],
    ["Quick Impulses", 3],
    ["Booming Voice", 3],
    ["Raid Leader", 3],
    ["Guttural Yell", 3],
    ["Aggressive Resistance", 3],
    ["Battle Fervor", 3],
    ["Prolific Fury", 3],
    ["Death Blow", 5],
    ["Enhanced Death Blow", 1],
    ["Warrior's Death Blow", 1],
    ["Fighter's Death Blow", 1],
    ["Rupture", 5],
    ["Enhanced Rupture", 1],
    ["Warrior's Rupture", 1],
    ["Fighter's Rupture", 1],
    ["Steel Grasp", 5],
    ["Enhanced Steel Grasp", 1],
    ["Warrior's Steel Grasp", 1],
    ["Fighter's Steel Grasp", 1],
    ["Pit Fighter", 3],
    ["No Mercy", 3],
    ["Slaying Strike", 3],
    ["Expose Vulnerability", 3],
    ["Hamstring", 3],
    ["Cut to the Bone", 3],
    ["Thick Skin", 3],
    ["Defensive Stance", 3],
    ["Counteroffensive", 3],
    ["Call of the Ancients", 1],
    ["Prime Call of the Ancients", 1],
    ["Supreme Call of the Ancients", 1],
    ["Iron Maelstrom", 1],
    ["Prime Iron Maelstrom", 1],
    ["Supreme Iron Maelstrom", 1],
    ["Wrath of the Berserker", 1],
    ["Prime Wrath of the Berserker", 1],
    ["Supreme Wrath of the Berserker", 1],
    ["Duelist", 3],
    ["Tempered Fury", 3],
    ["Furious Impulse", 3],
    ["Invigorating Fury", 3],
    ["Heavy Handed", 3],
    ["Brute Force", 3],
    ["Wallop", 3],
    ["Concussion", 3],
    ["Unconstrained", 1],
    ["Walking Arsenal", 1],
    ["Unbridled Rage", 1],
    ["Gushing Wounds", 1]
];

// This creates a map from the talent name above to a talent node with its name. Used to look up
// nodes and add dependencies.
export function CreateBarbarianTalentNodes(): { [key: string]: TalentNode } { 
    let nodes = {};
    for (const [key, value] of BarbarianTalentsToMaxValue) {
        nodes[key] = new TalentNode(key, value);
    }
    return nodes;
}

export function CreateBarbarianAspectNodes(): { [key: string]: AspectNode } { 
    return {
       /*--------------------------------------------------
                       BARBARIAN ASPECTS
        --------------------------------------------------*/

        // 100,000 Steps: After gaining the final damage bonus from the Walking Arsenal Key Passive, you automatically cast Ground Stomp and gain {32/50} Fury. This cannot happen more than once every 30 seconds.
        "100,000 Steps": new AspectNode("100,000 Steps", 1), // IGNORE FOR NOW
        
        // (Unique) Ancients' Oath: Steel Grasp launches 2 additional chains. Enemies hit by Steel Grasp are Slowed by {55/65}% for 3.0 seconds. 
        "Ancients' Oath": new AspectNode("Ancients' Oath", 1), // IGNORE FOR NOW

        // Aspect of Ancestral Echoes: Lucky Hit: Damaging enemies with Leap, Upheaval, or Whirlwind has up to a {40/50}% chance to summon an Ancient to perform the same Skill. Can only happen once every 5.0 seconds.
        "Aspect of Ancestral Echoes": new AspectNode("Aspect of Ancestral Echoes", 1), // ** COMPLETE **
        
        // Aspect of Ancestral Force: Hammer of the Ancients quakes outwards, dealing {32/50}% of its damage to enemies.
        "Aspect of Ancestral Force": new AspectNode("Aspect of Ancestral Force", 1),  // ** COMPLETE **
        
        // Aspect of Anemia: Lucky Hit: Direct damage against Bleeding enemies has up to a {31/40}% chance to Stun them for 2.0 seconds.
        "Aspect of Anemia": new AspectNode("Aspect of Anemia", 1), // IGNORE
        
        // Aspect of Berserk Fury: You gain {3/6} Fury per second while Berserking.
        "Aspect of Berserk Fury": new AspectNode("Aspect of Berserk Fury", 1), // TO DO
        
        // Aspect of Berserk Ripping: Whenever you deal direct damage while Berserking, inflict {22/40}% of the Base damage dealt as additional Bleeding damage over 5.0 seconds.
        "Aspect of Berserk Ripping": new AspectNode("Aspect of Berserk Ripping", 1), // ** COMPLETE **
        
        // Aspect of Bul-Kathos: Leap creates an Earthquake that deals {195/380} Physical damage over 4 seconds. While standing in Earthquakes, you gain {5/15}% increased Damage Reduction.
        "Aspect of Bul-Kathos": new AspectNode("Aspect of Bul-Kathos", 2), // ** COMPLETE **
        
        // Aspect of Burning Rage: While Berserking, you deal {40/70} Fire damage every second to surrounding enemies.
        "Aspect of Burning Rage": new AspectNode("Aspect of Burning Rage", 1), // ** COMPLETE **
        
        // Aspect of Echoing Fury: Your Shout Skills generate {2/4} Fury per second while active.
        "Aspect of Echoing Fury": new AspectNode("Aspect of Echoing Fury", 1), // ** COMPLETE **
        
        // Aspect of Encroaching Wrath: After spending 100.0 Fury, your next Weapon Mastery Skill deals x{82/100}% increased damage.
        "Aspect of Encroaching Wrath": new AspectNode("Aspect of Encroaching Wrath", 1), // TO DO
        
        // Aspect of Giant Strides: Reduces the Cooldown of Leap by {3/5} seconds per enemy hit, up to a maximum of 9 seconds.
        "Aspect of Giant Strides": new AspectNode("Aspect of Giant Strides", 1),  // IGNORE

        // Aspect of Grasping Whirlwind: Whirlwind periodically Pulls enemies to you.
        "Aspect of Grasping Whirlwind": new AspectNode("Aspect of Grasping Whirlwind", 1), // IGNORE

        // Aspect of Limitless Rage: Each point of Fury you generate while at Maximum Fury grants your next Core Skill x{2/4}% increased damage, up to x{60/120}%.
        "Aspect of Limitless Rage": new AspectNode("Aspect of Limitless Rage", 2), // IGNORE FOR NOW, BUT INCLUDE LATER

        // Aspect of Numbing Wrath: Each point of Fury generated while at Maximum Fury grants {1.5/3} Fortify.
        "Aspect of Numbing Wrath": new AspectNode("Aspect of Numbing Wrath", 1), // IGNORE

        // Aspect of Perpetual Stomping: Damaging an enemy with Kick or Ground Stomp resets Leap's Cooldown.
        "Aspect of Perpetual Stomping": new AspectNode("Aspect of Perpetual Stomping", 0), // IGNORE FOR NOW

        // Aspect of Tempering Blows: After swapping weapons 6.0 times, gain {55/100} Fortify.
        "Aspect of Tempering Blows": new AspectNode("Aspect of Tempering Blows", 1), // IGNORE
        
        // Aspect of the Dire Whirlwind: Whirlwind's Critical Strike Chance is increased by +{5/10}% for each second it is channeled, up to +{20/40}%.
        "Aspect of the Dire Whirlwind": new AspectNode("Aspect of the Dire Whirlwind", 2), // ** COMPLETE **

        // Aspect of the Iron Warrior: Iron Skin grants Unstoppable, and {10/20}% Damage Reduction.
        "Aspect of the Iron Warrior": new AspectNode("Aspect of the Iron Warrior", 1), // ** COMPLETE **

        // Aspect of the Relentless Armsmaster: Gain x{20/36}% increased Fury Generation while all damage bonuses from the Walking Arsenal Key Passive are active.
        "Aspect of the Relentless Armsmaster": new AspectNode("Aspect of the Relentless Armsmaster", 1), // ** COMPLETE **
        
        // Aspect of Unrelenting Fury: Killing an enemy with a Core Skill refunds {10/20}% of its base Fury cost. Can only happen once per Skill cast.
        "Aspect of Unrelenting Fury": new AspectNode("Aspect of Unrelenting Fury", 1), // IGNORE

        // (Unique) Battle Trance: Increase Frenzy's maximum stacks by 2. While you have maximum Frenzy, your other Skills gain +{10/20}% increased Attack Speed.
        "Battle Trance": new AspectNode("Battle Trance", 1), // ** COMPLETE **

        // Battle-Mad Aspect: Gain Berserking for {1/2.5} seconds after swapping weapons 10.0 times.
        "Battle-Mad Aspect": new AspectNode("Battle-Mad Aspect", 1), // IGNORE

        // Bear Clan Berserker's Aspect: Killing an enemy while Berserking has a 40.0% chance to grant {16/32}% increased Cooldown Reduction to your Brawling Skills for 2.0 seconds.
        "Bear Clan Berserker's Aspect": new AspectNode("Bear Clan Berserker's Aspect", 1), // IGNORE

        // Bold Chieftain's Aspect: Whenever you cast a Shout Skill, its Cooldown is reduced by {2.7/5.4} seconds per Nearby enemy, up to a maximum of 12.0 seconds.
        "Bold Chieftain's Aspect": new AspectNode("Bold Chieftain's Aspect", 1), // IGNORE FOR NOW

        // Brawler's Aspect: Enemies damaged by Kick or Charge will explode if they are killed within the next 2.0 seconds, dealing {500/650} damage to surrounding enemies.
        "Brawler's Aspect": new AspectNode("Brawler's Aspect", 1), // IGNORE

        // Death Wish Aspect: Gain {55/100} Thorns while Berserking.
        "Death Wish Aspect": new AspectNode("Death Wish Aspect", 1), // ** COMPLETE **

        // Devilish Aspect: After generating 100.0 Fury your next Core Skill creates a Dust Devil that deals {100/180} damage to enemies behind the target.
        "Devilish Aspect": new AspectNode("Devilish Aspect", 1), // TO DO 

        // Dust Devil's Aspect: Whirlwind leaves behind Dust Devils that deal {80/125} damage to surrounding enemies.
        "Dust Devil's Aspect": new AspectNode("Dust Devil's Aspect", 1), // ** COMPLETE **

        // Earthquake Aspect: Ground Stomp creates an Earthquake damaging enemies for {195/380} Physical damage over 4 seconds. While standing in Earthquakes, you deal x{5/15}% increased damage.
        "Earthquake Aspect": new AspectNode("Earthquake Aspect", 1), // ** COMPLETE **

        // Earthstriker's Aspect: After swapping weapons 10.0 times, your next attack will Overpower and deal x{30/50}% increased Overpower damage.
        "Earthstriker's Aspect": new AspectNode("Earthstriker's Aspect", 1), // ** COMPLETE ** BUT TAKE ANOTHER LOOK AT

        // (Unique) Fields of Crimson: While using this weapon, damaging at least one enemy with Rupture creates a blood pool that inflicts {90/170} Bleeding damage over 6.0 seconds. Enemies standing in the pool take x10% increased Bleeding damage.
        "Fields of Crimson": new AspectNode("Fields of Crimson", 1), // ** COMPLETE ** NEEDS ANOTHER LOOK AT
        
        // (Unique) Gohr's Devastating Grips: Whirlwind explodes after it ends, dealing {50/70}% of the total Base damage dealt to surrounding enemies as Fire damage.
        "Gohr's Devastating Grips": new AspectNode("Gohr's Devastating Grips", 1), // TO DO
        
        // (Unique) Hellhammer: Upheaval ignites the ground Burning enemies for an additional {175/250} damage over 3.0 seconds.
        "Hellhammer": new AspectNode("Hellhammer", 1), // ** COMPLETE **
        
        // Iron Blood Aspect: Gain {2/4}% Damage Reduction for each Nearby Bleeding enemy up to {10/20}% maximum.
        "Iron Blood Aspect": new AspectNode("Iron Blood Aspect", 1), // ** COMPLETE **
        
        // Luckbringer Aspect: Gain x{12/20}% increased Lucky Hit Chance while all damage bonuses from the Walking Arsenal Key Passive are active.
        "Luckbringer Aspect": new AspectNode("Luckbringer Aspect", 1), // ** COMPLETE **
        
        // (Unique) Overkill: Death Blow creates a shockwave, dealing {16/30}% of its Base damage to enemies. Enemies who die to this effect also reset Death Blow's Cooldown.
        "Overkill": new AspectNode("Overkill", 1), // ** COMPLETE **
        
        // (Unique) Rage of Harrogath: Lucky Hit: Up to a {20/40}% chance to reduce the Cooldowns of your Non-Ultimate Skills by 1.5 seconds when you inflict Bleeding on Elites.
        "Rage of Harrogath": new AspectNode("Rage of Harrogath", 1), // IGNORE
        
        // (Unique) Ramaladni's Magnum Opus: Skills using this weapon deal x{0.7/1}% increased damage per point of Fury you have, but you lose 2.0 Fury every second.
        "Ramaladni's Magnum Opus": new AspectNode("Ramaladni's Magnum Opus", 1),  // IGNORE
        
        // Relentless Berserker's Aspect: Lucky Hit: Damaging an enemy with a Core Skill has up to a {22/40}% chance to extend the duration of Berserking by 1 second. Double this duration if it was a Critical Strike.
        "Relentless Berserker's Aspect": new AspectNode("Relentless Berserker's Aspect", 1), // IGNORE
        
        // Skullbreaker's Aspect: Stunning a Bleeding enemy deals {22/40}% of their total Bleeding amount to them as Physical damage.
        "Skullbreaker's Aspect": new AspectNode("Skullbreaker's Aspect", 1), // MAYBE TO DO?
        
        // Slaking Aspect: Lucky Hit: You have up to a {30/50}% chance to gain 20.0 Fury when Rend deals direct damage to at least one Bleeding enemy.
        "Slaking Aspect": new AspectNode("Slaking Aspect", 1), // ** COMPLETE **
        
        // Steadfast Berserker's Aspect: Lucky Hit: Up to a 35% chance to gain {80/160} Fortify whenever you deal direct damage while Berserking.
        "Steadfast Berserker's Aspect": new AspectNode("Steadfast Berserker's Aspect", 1), // IGNORE
        
        // Veteran Brawler's Aspect: Each time a Core Skill deals direct damage to an enemy, your next Charge or Leap deals x{15/20}% increased damage, up to x{225/300}%.
        "Veteran Brawler's Aspect": new AspectNode("Veteran Brawler's Aspect", 2), // ** COMPLETE **
    
        // "Weapon Master's Aspect: Your Weapon Mastery Skills have an additional Charge. Lucky Hit: Damaging an enemy with a Weapon Mastery Skill has up to a {32/50}% chance to Stun them for 2 seconds."
        "Weapon Master's Aspect": new AspectNode("Weapon Master's Aspect", 1),  // IGNORE
        
        // Windlasher Aspect: Casting Double Swing twice within 1.5 seconds creates a Dust Devil that deals {80/125} damage to enemies behind the target.
        "Windlasher Aspect": new AspectNode("Windlasher Aspect", 1), // ** COMPLETE **

         /*--------------------------------------------------
                       GENERIC ASPECTS
        --------------------------------------------------*/

        // "Round(FloatRandomRangeWithInterval(10, 10, 20))"
        "Starlight Aspect": new AspectNode("Starlight Aspect", 1), //"Gain {c_random}[Affix_Value_1]{/c} resource for every {c_number}[Affix.\"Static Value 0\"|%|]{/c} Life healed.", {10, 10, 20)}
        // IGNORE

        // FloatRandomRangeWithInterval(8, 4, 8)
        "Aspect of Might": new AspectNode("Aspect of Might", 1), // {c_important}Basic{/c} skills grant {c_number}[Affix.\"Static Value 0\"|%|]{/c} damage reduction for {c_random}[Affix_Value_1|1|]{/c} seconds.",
        // ** COMPLETE **

        // values = [0.15, "ExpectedLevelForIPower()", FloatRandomRangeWithInterval(10, 10, 20)
        "Aspect of the Protector": new AspectNode("Aspect of the Protector", 2), // Every {c_random}[Affix_Value_1]{/c} seconds, gain a {c_important}Barrier{/c} absorbing up to {c_number}[Affix_Flat_Value_1]{/c} damage.",
        // IGNORE

        // values = [3, FloatRandomRangeWithInterval(10, 3, 10)]
        "Aspect of Inner Calm": new AspectNode("Aspect of Inner Calm", 2), // "desc": "Deal {c_random}x[Affix_Value_1|1%|]{/c} increased damage for each second you stand still, up to {c_number}x[Affix.\"Static Value 0\"|%|]{/c}.",
        // MAYBE INCLUDE? Use Standing Still toggle and assume 1/2 or 1/3 maximum stacks

        // FloatRandomRangeWithInterval(8, 8, 16)
        "Wind Striker Aspect": new AspectNode("Wind Striker Aspect", 1), // "Critical Strikes grant {c_random}[Affix_Value_1|1%|]{/c} Movement Speed for {c_number}[Affix.\"Static Value 0\"]{/c} second. The duration can be extended.",
        // ** COMPLETE **

        // Round(FloatRandomRangeWithInterval(3, 1, 4))
        "Aspect of the Umbral": new AspectNode("Aspect of the Umbral", 1), // "Restore {c_random}[Affix_Value_1]{/c} resource when you Crowd Control an enemy.",
        // MAYBE INCLUDE?

        // FloatRandomRangeWithInterval(5, 5, 10)
        "Ominous Aspect": new AspectNode("Ominous Aspect", 1), // "Each consecutive {c_important}Core{/c} Skill cast reduces the resource cost of your next {c_important}Core{/c} Skills by {c_random}[Affix_Value_1|%|]{/c}, up to a maximum of {c_number}[Affix.\"Static Value 0\"|
        // IGNORE FOR NOW

        // FloatRandomRangeWithInterval(10, 23, 33)
        "Conceited Aspect": new AspectNode("Conceited Aspect", 1), // "Deal {c_random}x[Affix_Value_1|%|]{/c} increased damage while you have a {c_important}Barrier{/c} active.",
        // ** COMPLETE ** 

        // values = [2, FloatRandomRangeWithInterval(10, 10, 20)]
        "Protecting Aspect": new AspectNode("Protecting Aspect", 1), // When struck, a magical bubble forms around you for {c_number}[Affix.\"Static Value 0\"]{/c} seconds, absorbing {c_number}[Affix_Flat_Value_1]{/c} damage. Can only occur once per {c_random}[Affix_Value_1]{/c} seconds.",
        // IGNORE

        // FloatRandomRangeWithInterval(10, 20, 30)
        "Aspect of Disobedience": new AspectNode("Aspect of Disobedience", 1), // Enemies afflicted with a damage over time effect deal {c_random}[Affix_Value_1|%|]{/c} less damage to you.",
        // ** COMPLETE **

        // FloatRandomRangeWithInterval(10, 40, 50)
        "Aspect of Pummeling": new AspectNode("Aspect of Pummeling", 1), // "Deal {c_random}x[Affix_Value_1|%|]{/if}{/c} increased damage to Stunned, Knocked Down, and Frozen enemies.",
        // ** COMPLETE **

        // FloatRandomRangeWithInterval(10, 23, 33)
        "Rapid Aspect": new AspectNode("Rapid Aspect", 1), // {c_important}Basic{/c} Skills gain {c_random}[Affix_Value_1|%|]{/c } Attack Speed.",
        // ** COMPLETE **

        // FloatRandomRangeWithInterval(10, 24, 34)
        "Edgemaster's Aspect": new AspectNode("Edgemaster's Aspect", 1), // "Skills deal up to {c_random}x[Affix_Value_1|%|]{/c} increased damage based on available resource when cast, receiving the full benefit while at full resource.",
        // IGNORE FOR NOW

        //"values": [0.03,"ExpectedLevelForIPower()","FloatRandomRangeWithInterval(2, 3, 5)"]
        "Aspect of the Patient Sage": new AspectNode("Aspect of the Patient Sage", 2), //"After standing still for {c_random}[Affix_Value_1]{/c} seconds, you regenerate {c_number}[Affix_Flat_Value_1]{/c} Life per second while enemies are Close.",
        // MAYBE INCLUDE? - we have standing still & enemy close toggles.  Would need a life regeneration stat node

        // values: [4, RoundToDecimalPlace(FloatRandomRangeWithInterval(10, 5, 10), 1)]
        "Aspect of the Expectant": new AspectNode("Aspect of the Expectant", 2), // "Enemies hit with {c_important}Basic{/c} Skills increases the damage of your next {c_important}Core{/c} Skill by {c_random}x[Affix_Value_1|1%|]{/c}, up to {c_number}x[Affix.\"Static Value 0\"|%|]{/c}.",
        // ** COMPLETE **

        // FloatRandomRangeWithInterval(10, 40, 70)
        "Ghostwalker Aspect": new AspectNode("Ghostwalker Aspect", 1), // You may move freely through enemies while below {c_random}[Affix_Value_1|%|]{/c} total Life.",
        // IGNORE

        // "FloatRandomRangeWithInterval(10, 30, 50)"
        "Aspect of Shared Misery": new AspectNode("Aspect of Shared Misery", 1), // "{c_gold}Lucky Strike:{/c} When you hit a Crowd Controlled enemy, there is up to a {c_random}[Affix_Value_1|%|]{/c} chance for that Crowd Control effect to spread to another unaffected enemy.",
        // IGNORE

        // "Floor(FloatRandomRangeWithInterval(10, 15, 35))"
        "Eluding Aspect": new AspectNode("Eluding Aspect", 1), //"Taking {c_random}[Affix_Value_1|%|]{/c} of your total Life in damage while Stunned, Frozen or Immobilized will clear the effect.",
        // IGNORE

        // "Floor(FloatRandomRangeWithInterval(10, 15, 35))"
        "Aspect of Assimilation": new AspectNode("Aspect of Assimilation", 1), //You have 8% increased Dodge Chance versus enemies affected by Damage Over Time effects. When you Dodge, you gain [5 - 10] of your Primary Resource.
        // ** COMPLETE **

        // "FloatRandomRangeWithInterval(10, 20, 40)"
        "Needleflare Aspect": new AspectNode("Needleflare Aspect", 1), //"Thorns damage dealt has a {c_random}[Affix_Value_1|%|]{/c} chance to deal damage to all enemies around you.",
        // IGNORE FOR NOW

        // "FloatRandomRangeWithInterval(10, 20, 30)"
        "Aspect of the Deflecting Barrier": new AspectNode("Aspect of the Deflecting Barrier", 1), // "While you have a {c_important}Barrier{/c} active, there is a {c_random}[Affix_Value_1|%|]{/c} chance to ignore incoming direct damage from Distant enemies.",
        // IGNORE FOR NOW - we have an enemy far toggle

        // "RandomInt(50, 100)"
        "Restorative Aspect": new AspectNode("Restorative Aspect", 1), //"Effects that heal you beyond {c_number}[Affix.\"Static Value 0\"|%|]{/c} Life grant you a {c_important}Barrier{/c} up to {c_random}[Affix_Value_1|%|]{/c} of your Maximum Life that lasts for {c_number}[Affix.\"Static Value 1\"]{/c} seconds.",
        // IGNORE

        // FloatRandomRangeWithInterval(12, 0.13, 0.25)
        "Smiting Aspect": new AspectNode("Smiting Aspect", 1) // You have [13 - 25%] increased Critical Strike Chance against Injured enemies. While you are Healthy, you gain [25 - 50%] increased Crowd Control Duration.
        // ** COMPLETE **

    };
}

export function CreateBarbarianToggleNodes(): { [key: string]: ToggleNode } { 
    return {
        // Enemy Toggles
        "Enemy_Boss": new ToggleNode("Enemy_Boss", "boolean"), // Enemy is a Boss
        "Enemy_Elite": new ToggleNode("Enemy_Elite", "boolean"), // Enemy is Elite
        "Enemy_Vulnerable": new ToggleNode("Enemy_Vulnerable", "boolean"), // Enemy has debuff Vulnerable
        "Enemy_Healthy": new ToggleNode("Enemy_Healthy", "boolean"),
        "Enemy_Injured": new ToggleNode("Enemy_Injured", "boolean"),
        "Enemy_Slowed": new ToggleNode("Enemy_Slowed", "boolean"),
        "Enemy_Dazed": new ToggleNode("Enemy_Dazed", "boolean"),
        "Enemy_Stunned": new ToggleNode("Enemy_Stunned", "boolean"),
        "Enemy_Frozen": new ToggleNode("Enemy_Frozen", "boolean"),
        "Enemy_Knocked_Down": new ToggleNode("Enemy_Knocked_Down", "boolean"),
        "Enemy_Far": new ToggleNode("Enemy_Far", "boolean"), // Enemy is Far away
        "Enemy_Near": new ToggleNode("Enemy_Close", "boolean"), // Enemy is in Close Proximity
        "Enemy_Chilled": new ToggleNode("Enemy_Chilled", "boolean"),
        "Enemy_Affected_By_Dot": new ToggleNode("Enemy_Affected_By_Dot", "boolean"), // Enemy has a DoT on them

        // Player Toggles
        "Storyline_Act": new ToggleNode("Storyline_Act", "number"), // Storyline Act - Reduces player resistances
        "Percent_Hitpoints": new ToggleNode("Percent_Hitpoints", "number"), // Set your current Hitpoints. Important for Overpower and Healthy/Injured Status
        "Percent_Fortify": new ToggleNode("Percent_Fortify", "number"), // Set your current fortify.  When Fortify > Current healthy you become "Fortified" which makes the player receive 10% less damage.
        "Barrier_Amount": new ToggleNode("Barrier_Amount", "number"), // Set the amount of Barrier you have active
        "Berserking": new ToggleNode("Berserking", "boolean"), // Player is Berserking
        "Walking_Arsenal": new ToggleNode("Walking_Arsenal", "boolean"), // Player has Walking Arsenal Active, depends on Weapon Swapping
        "Player_Stationary": new ToggleNode("Player_Stationary","boolean"), // Player is Standing Still
        "Current_Fury": new ToggleNode("Current_Fury", "number"), // How much Fury do you currently have
        
        // Recent Event Triggers - Recently could have a variety of time spans so its easiest to set it as a toggle with the onus on the player
        "Overpower_Recently": new ToggleNode("Overpower_Recently","boolean"), // Player has Overpowered Recently
        "Killed_Enemy_Recently": new ToggleNode("Killed_Enemy_Recently","boolean"),
        "Crit_Recently": new ToggleNode("Crit_Recently","boolean"),
        "Dodged Recently": new ToggleNode("Dodged Recently", "boolean"), // Player has Dodged Recently. Dodge is a % Chance to avoid being hit. Dodge should not be confused with Evade.

        // Battle Flay: When Flay deals direct damage to an enemy, they take x10% increased Bleeding damage from you for the next 3 seconds.
        "Battle Flay": new ToggleNode("Battle Flay", "boolean"),

        // Combat Flay: When Flay deals direct damage to an enemy, you gain 3% Damage Reduction and 50 Thorns for 3 seconds. This stacks up to 4 times.
        "Combat Flay Stacks": new ToggleNode("Combat Flay Stacks", "number"),

        // Frenzy: If Frenzy hits an enemy, its Attack Speed is increased by +20% for 3 seconds, up to +60%.
        // Enhanced Frenzy: While Frenzy is granting +60% bonus Attack Speed, it also generates 2 additional Fury.
        // Combat Frenzy: You gain 8% Damage Reduction for each stack of Frenzy you currently have.
        "Frenzy Stacks": new ToggleNode("Frenzy Stacks", "number"),

        // After using Whirlwind for 2 seconds, Whirlwind deals x30% increased damage until it is cancelled.
        "Violent Whirlwind": new ToggleNode("Whirlwind", "boolean"),

        // Furious Hammer of the Ancients: Hammer of the Ancients deals x1% additional damage for each point of Fury you had when using it.
        "Furious Hammer of the Ancients": new ToggleNode("Hammer of the Ancients", "number"),

        // Violent Hammer of the Ancients: After Overpowering with Hammer of the Ancients, you deal x30% more damage for 2.5 seconds.
        "Violent Hammer of the Ancients": new ToggleNode("Hammer of the Ancients", "boolean"),

        // Furious Upheaval: Dealing direct damage to an enemy with a Skill that is not Upheaval causes your next cast of Upheaval to deal x8% increased damage, stacking up to 10 times.
        "Furious Upheaval": new ToggleNode("Upheaval", "number"),

        // Challenging Shout: Taunt Nearby enemies and gain {40/45/50/55/60/65/70/75/80/85}% Damage Reduction for 8 seconds.
        // Enhanced Challenging Shout: While Challenging Shout is active, gain x20% bonus Maximum Life.
        // Strategic Challenging Shout: While Challenging Shout is active, gain Thorns equal to 50% of your Maximum Life.
        // Tactical Challenging Shout: While Challenging Shout is active, you gain 3 Fury each time you take damage.
        "Challenging Shout": new ToggleNode("Challenging Shout", "boolean"),

        // Iron Skin: Steel yourself, gaining a Barrier that absorbs {50/55/60/65/70/75/80/85/90/95}% of your missing Life for 5 seconds.
        // Enhanced Iron Skin: Iron Skin's Barrier absorbs 5% more of your Maximum Life.
        // Strategic Iron Skin: Iron Skin also grants 9% Base Life as Fortify. Double this amount if cast while below 50% Life.
        // Tactical Iron Skin: While Iron Skin is active, Heal for 10% of the Barrier's original amount as Life per second.
        "Iron Skin": new ToggleNode("Iron Skin", "boolean"),

        // Rallying Cry: Bellow a rallying cry, increasing your Movement Speed by +30% and Resource Generation by x{50/55/60/65/70/75/80/85/90/95}% for 6 seconds, and Nearby allies for 3 seconds.
        // Enhanced Rallying Cry: Rallying Cry grants you Unstoppable while active.
        // Tactical Rallying Cry: Rallying Cry generates 25 Fury and grants you an additional x50% Resource Generation.
        // Strategic Rallying Cry: `Rallying Cry grants you 10% Base Life as Fortify. While Rallying Cry is active, you gain an additional 2% Base Life as Fortify each time you take or deal direct damage.
        "Rallying Cry": new ToggleNode("Rallying Cry", "boolean"),

        // Mighty Kick: Kicked enemies deal 54% damage to enemies they collide with while being Knocked Back. Enemies damaged this way are Knocked Down for 2 seconds.
        "Mighty Kick": new ToggleNode("Mighty Kick", "boolean"),

        // War Cry: Bellow a mighty war cry, increasing your damage dealt by x{15/16.5/18/19.5/21/22.5/24/25.5/27/28.5}% for 8 seconds, and Nearby allies for 4 seconds.
        // Enhanced War Cry: War Cry grants you Berserking for 4 seconds
        // Mighty War Cry: War Cry grants you 28% Base Life as Fortify.
        "War Cry": new ToggleNode("War Cry", "boolean"),

        // Power War Cry: If at least 6 enemies are Nearby when you cast War Cry, your damage bonus is increased to x{30/31.5/33/34.5/36/37.5/39/40.5/42/43.5}%
        "Power War Cry": new ToggleNode("War Cry", "boolean"),

        // Supreme Wrath of Berserker: While Wrath of Berserker is active, every 50 Fury you spend increases Berserk's Damage Bonus by x25%
        "Supreme Wrath of the Berserker Stacks": new ToggleNode("Supreme Wrath of the Berserker Stacks", "number"),

        // If default is set, the weapon type which will maximize damage will be used.
        "Weapon Type": new ToggleNode("Weapon Type", "string", ["Default", "Dual_Wield", "Two_Hand_Slashing", "Two_Hand_Bludgeon"]),

        // Iron Blood Aspect: Gain {2/4}% Damage Reduction for each Nearby Bleeding enemy up to {10/20}% maximum.
        "Iron Blood Aspect": new ToggleNode("Iron Blood Aspect", "number"),

        // Veteran Brawler's Aspect: Each time a Core Skill deals direct damage to an enemy, your next Charge or Leap deals x{15/20}% increased damage, up to x{225/300}%.
        "Veteran Brawler's Aspect Stacks": new ToggleNode("Iron Blood Aspect", "number"),

        // Warrior's Rupture (Talent): Hitting enemies with Rupture increases your Attack Speed by +20% for 4 seconds
        "Ruptured Recently": new ToggleNode("Ruptured Recently", "boolean"),

        // Prime Call of the Ancients: While Call of the Ancients is active, gain +10% bonus Attack Speed and x10% Increased Damage
        "Call of the Ancients": new ToggleNode("Call of the Ancients", "boolean")

    }
}

// Create BaseStatsNode.
export function CreateBarbarianBaseStatsNode (): BaseStatsNode { 
    return new BaseStatsNode("Barbarian", 1);
}

// (TODO) Figure out which tags we actually need.
export function CreateBarbarianSkillNodes (): { [key: string]: SkillNode } { 
    return {
        // Skill Node : (Skill Name, Category, Tags[], Flat Modifier, DoT Modifier, Cooldown, Resource Build/Spend)

        // Basic Skills 
        "Flay": new SkillNode("Flay", "Basic", ["Basic", "Bleed", "Slashing", "Fury", "Damage", "Physical"], .05, .36, 0, 9, .5),
        "Frenzy": new SkillNode("Frenzy", "Basic", ["Basic", "Dual Wield", "Attack Speed", "Fury", "Damage", "Physical"], .2, 0, 0, 4, .3),
        "Lunging Strike": new SkillNode("Lunging Strike", "Basic", ["Basic", "Damage", "Physical", "Fury", "Movement"], .30, 0, 0, 9, .5),
        "Bash": new SkillNode("Bash", "Basic", ["Basic", "Bludgeoning", "Physical", "Fury", "Damage", "Two-Handed", "Crowd Control"], .3, 0, 0, 10, .5),
    
        // Core Skills
        "Whirlwind": new SkillNode("Whirlwind", "Core", ["Core", "Channeled", "Fury", "Physical", "Damage"], .13, 0, 0, -20, .2), // Note - Whirlwind is getting damage buffed in May 12th beta
        "Upheaval": new SkillNode("Upheaval", "Core", ["Core", "Fury", "Physical", "Damage", "Two-Handed"], .70, 0, 0, -40, .2),
        "Rend": new SkillNode("Rend", "Core", ["Core", "Bleed", "Damage", "Physical", "Fury", "Slashing"], .12, .96, 0, -35, .33),
        "Hammer of the Ancients": new SkillNode("Hammer of the Ancients", "Core", ["Core", "Bludgeoning", "Fury", "Physical", "Damage", "Two-Handed"], .56, 0, 0, -35, .4),
        "Double Swing": new SkillNode("Double Swing", "Core", ["Core", "Dual Wield", "Damage", "Physical", "Fury"], .72, 0, 0, -25, .3),

        // Weapon Mastery Skills
        "Death Blow": new SkillNode("Death Blow", "Weapon Mastery", ["Weapon Mastery", "Damage", "Physical", "Cooldown"], 1.20, 0, 15, 0, .5),
        "Rupture": new SkillNode("Rupture", "Weapon Mastery", ["Weapon Mastery", "Bleed", "Damage", "Physical", "Cooldown", "Slashing"], .13, 0, 10, 0, .5),
        "Steel Grasp": new SkillNode("Steel Grasp", "Weapon Mastery", ["Weapon Mastery", "Crowd Control", "Damage", "Physical", "Cooldown"], .23, 0, 11, 0, .25),

        // Brawling Skills
        "Kick": new SkillNode("Kick", "Brawling", ["Brawling", "Crowd Control", "Damage", "Physical", "Cooldown"], .18, 0, 17, 0, 1.0),
        "Charge": new SkillNode("Charge", "Brawling", ["Brawling", "Unstoppable", "Crowd Control", "Damage", "Physical"], .25, 0, 17, 0, .33),
        "Leap": new SkillNode("Leap", "Brawling", ["Brawling", "Crowd Control", "Damage", "Physical", "Cooldown"], .325, 0, 17, 0, .33),

        // Defensive Skills
        "Ground Stomp": new SkillNode("Ground Stomp", "Defensive", ["Defensive", "Crowd Control", "Damage", "Physical", "Cooldown"], .095, 0, 16, 0, .33),

        // Ultimate Skills
        "Call of the Ancients": new SkillNode("Call of the Ancients", "Ultimate", ["Ultimate", "Damage", "Physical", "Cooldown"], 1.04 + .39 + 1.95, 0, 50, 0, .30),
        "Iron Maelstrom": new SkillNode("Iron Maelstrom", "Ultimate", ["Ultimate", "Crowd Control", "Bleed", "Damage", "Physical", "Cooldown", "Two-Handed", "Bludgeoning", "Dual Wield", "Slashing"], 0.60 + 0.20 + 0.65, 1.2, 60, 0, .40),
    };
}

/*
These are the nodes that are computed at run time. They all start with value = null and should
depend on each other and the above nodes. Dependencies are added in after all nodes are defined.
*/
/*    // Weapon Damage Node: This value is added to Weapon Damage, prior to all the +% Damage Modifiers
    "Weapon_Damage_Bonus", // "[{VALUE}|~|] Weapon Damage".
    "Main_Hand_Damage_Percent_Bonus", // "+[{VALUE} * 100|%|] Bonus to Main Hand Weapon Damage",
*/
export function CreateBarbarianStatsNodes (nodes_map: NodesMap): { [key: string]: StatsNode } {
    if (nodes_map["toggle"] == undefined) {
        throw "nodes_map is not fully populated."
    }
    return {
        /*--------------------------------------------------
                    OFFENSIVE STATS NODES
        --------------------------------------------------*/

        // (TODO) Skills may have restrictions on allowed weapon types. Need to incorporate this.
        "Weapon_Type": new StatsNode("Weapon_Type", (parent_val: (parent_node: DiabloNode) => any) => {
            switch(parent_val(nodes_map["toggle"]["Weapon Type"])) {
                case "Dual_Wield":
                    return 0;
                case "Two_Hand_Slashing":
                    return 1;
                case "Two_Hand_Bludgeon":
                    return 2;
                default:
                    const dual_wield_dps = parent_val(nodes_map["stat"]["Raw_Dual_Wield_Damage"]) * parent_val(nodes_map["stat"]["Raw_Dual_Wield_Attack_Speed"]);
                    const two_hand_slashing_dps = parent_val(nodes_map["modifier"]["Two_Hand_Slashing_Damage"]) * parent_val(nodes_map["modifier"]["Two_Hand_Slashing_Attack_Speed"]);
                    const two_hand_bludgeon_dps = parent_val(nodes_map["modifier"]["Two_Hand_Bludgeon_Damage"]) * parent_val(nodes_map["modifier"]["Two_Hand_Bludgeon_Attack_Speed"]);

                    const max_dps = Math.max(dual_wield_dps, two_hand_slashing_dps, two_hand_bludgeon_dps);
           
                    if (dual_wield_dps == max_dps) {
                        return 0
                    } else if (two_hand_slashing_dps == max_dps) {
                        return 1;
                    } else {
                        return 2;
                    }
            }
        }),

       "Raw_Dual_Wield_Damage": new StatsNode("Raw_Dual_Wield_Damage", (parent_val: (parent_node: DiabloNode) => any) => {
            return (parent_val(nodes_map["modifier"]["One_Hand_Slashing_Damage"]) + 
                    parent_val(nodes_map["modifier"]["One_Hand_Bludgeon_Damage"])
            )
        }),

        "Raw_Dual_Wield_Attack_Speed": new StatsNode("Raw_Dual_Wield_Attack_Speed", (parent_val: (parent_node: DiabloNode) => any) => {
            return (parent_val(nodes_map["modifier"]["Main_Hand_Attack_Speed"]) + 
                    parent_val(nodes_map["modifier"]["Off_Hand_Attack_Speed"])) / 2
        }),

        "Total_Weapon_Damage": new StatsNode("Total_Weapon_Damage", (parent_val: (parent_node: DiabloNode) => any) => {
            const weapon_type = parent_val(nodes_map["stat"]["Weapon_Type"]);
            const dual_wield_damage = parent_val(nodes_map["stat"]["Raw_Dual_Wield_Damage"]) + parent_val(nodes_map["modifier"]["Weapon_Damage_Bonus"]);
            const two_hand_slashing_damage = parent_val(nodes_map["modifier"]["Two_Hand_Slashing_Damage"]) + parent_val(nodes_map["modifier"]["Weapon_Damage_Bonus"]);
            const two_hand_bludgeon_damage = parent_val(nodes_map["modifier"]["Two_Hand_Bludgeon_Damage"]) + parent_val(nodes_map["modifier"]["Weapon_Damage_Bonus"]);

            switch(weapon_type) {
                case 0:
                    return dual_wield_damage;
                case 1:
                    return two_hand_slashing_damage;
                default:
                    return two_hand_bludgeon_damage;
            } 
        }),

        "Raw_Attack_Speed": new StatsNode("Raw_Attack_Speed", (parent_val: (parent_node: DiabloNode) => any) => {
            const weapon_type = parent_val(nodes_map["stat"]["Weapon_Type"]);
            const dual_wield_attack_speed = parent_val(nodes_map["stat"]["Raw_Dual_Wield_Attack_Speed"]);
            const two_hand_slashing_attack_speed = parent_val(nodes_map["modifier"]["Two_Hand_Slashing_Attack_Speed"]);
            const two_hand_bludgeon_attack_speed = parent_val(nodes_map["modifier"]["Two_Hand_Bludgeon_Attack_Speed"]);

            switch(weapon_type) {
                case 0:
                    return dual_wield_attack_speed;
                case 1:
                    return two_hand_slashing_attack_speed;
                default:
                    return two_hand_bludgeon_attack_speed;
            } 
        }),

        "Flat_Damage_Bonus": new StatsNode("Flat_Damage_Bonus", (parent_val: (parent_node: DiabloNode) => any) => {
            return parent_val(nodes_map["modifier"]["Flat_Damage_Bonus"]) + 
                   (parent_val(nodes_map["modifier"]["Flat_Damage_On_Hit"]) * parent_val(nodes_map["current_skill"])["lucky_hit_chance"]);
            // (TODO) include Main Hand Percent Bonus where if dual wield they receive 1/2 benefit
        }),

        "Damage_Multiplier": new StatsNode("Damage_Multiplier", (parent_val: (parent_node: DiabloNode) => any) => {
            return 1 + (parent_val(nodes_map["stat"]["Total_Strength"]) * 0.1) +
                    (parent_val(nodes_map["toggle"]["Percent_Hitpoints"]) >= .8 ? parent_val(nodes_map["modifier"]["Damage_Bonus_At_High_Health"]) : 0) +
                    (parent_val(nodes_map["toggle"]["Enemy_Elite"]) * parent_val(nodes_map["modifier"]["Damage_Bonus_On_Elite_Kill_Combined"])) +
                    (parent_val(nodes_map["toggle"]["Dodged Recently"]) * parent_val(nodes_map["modifier"]["Damage_Bonus_Percent_After_Dodge"])) +
                    (parent_val(nodes_map["toggle"]["Enemy_Far"]) * parent_val(nodes_map["modifier"]["Damage_Bonus_To_Far"])) +
                    (parent_val(nodes_map["toggle"]["Enemy_Near"]) * parent_val(nodes_map["modifier"]["Damage_Bonus_To_Near"])) +
                    (parent_val(nodes_map["toggle"]["Enemy_Injured"]) *  parent_val(nodes_map["modifier"]["Damage_Bonus_To_Low_Health"])) +
                    (parent_val(nodes_map["toggle"]["Enemy_Healthy"]) * parent_val(nodes_map["modifier"]["Damage_Bonus_To_High_Health"])); 
                    // Need to Add Skill Tag & category Damages
                    /*
                    "Damage_Percent_Bonus_Basic_Skill",
                    "Damage_Percent_Bonus_Core_Skill",
                    "Damage_Percent_Bonus_Brawling_Skill",
                    "Damage_Percent_Bonus_Weapon_Mastery_Skill",
                    "Damage_Percent_Bonus_Defensive_Skill",
                    "Damage_Percent_Bonus_Ultimate_Skill",
                    "Damage_Percent_Bonus_Physical_Damage",
                    "Damage_Percent_Bonus_Bludgeon_Damage",
                    "Damage_Percent_Bonus_Slashing_Damage",
                    */
                            
        }),

        "Enemy_Crowd_Controlled": new StatsNode("Enemy_Crowd_Controlled", (parent_val: (parent_node: DiabloNode) => any) => {
            return 1 - (1 - Number(parent_val(nodes_map["toggle"]["Enemy_Slowed"]))) * 
                    (1 - Number(parent_val(nodes_map["toggle"]["Enemy_Dazed"]))) * 
                    (1 - Number(parent_val(nodes_map["toggle"]["Enemy_Stunned"]))) * 
                    (1 - Number(parent_val(nodes_map["toggle"]["Enemy_Frozen"]))) *
                    (1 - Number(parent_val(nodes_map["toggle"]["Enemy_Knocked_Down"])));
        }),
    /*
        // Crit Chance Node: Default Critical Damage Chance = 5.0%
        "Crit_Chance_Bonus_To_Far", //  "+[{VALUE}*100|1%|] Critical Chance to Distant Enemies",
        "Crit_Chance_Bonus_To_Near", //  "+[{VALUE}*100|1%|] Critical Chance to Close Enemies",
        "Damage_Type_Crit_Chance_Bonus_Vs_Elites", //  "+[{VALUE2}*100|1%|] Critical Strike Chance For {VALUE1} Damage Against Elites",
        "Damage_Type_Crit_Percent_Bonus", //  "+[{VALUE2}*100|1%|] Critical Strike Chance For {VALUE1} Damage",
        "Crit_Percent_Bonus", //  "+[{VALUE}*100|1%|] Critical Strike Chance",
        "Crit_Percent_Bonus_Per_Power_Cat", //  "+[{VALUE2}*100|1%|] Critical Strike Chance For {VALUE1} Skills",
        "Crit_Percent_Bonus_Per_Skill_Cat", //  "+[{VALUE2}*100|%|] Critical Strike Chance for {VALUE1} Skills",
        "Crit_Percent_Bonus_Per_Skill_Tag", //  "+[{VALUE2}*100|%|] Critical Strike Chance for {VALUE1} Skills",
        "Crit_Percent_Bonus_Per_Weapon_Requirement", //  "+[{VALUE2}*100|1%|] Critical Strike Chance With {VALUE1}",
        "Crit_Percent_Bonus_To_Low_Health", //  "+[{VALUE}*100|%|] Critical Strike Chance Against Low Health Enemies",
        "Crit_Percent_Bonus_To_Vulnerable", //  "+[{VALUE}*100|1%|] Critical Hit Chance Against Vulnerable Enemies",
        "Crit_Percent_Bonus_Vs_CC_Target", //  "+[{VALUE2}*100|1%|] Critical Hit Chance Against {VALUE1} Enemies",
        "Crit_Percent_Bonus_Vs_CC_Target_Any", //  "+[{VALUE}*100|1%|] Critical Hit Chance Against Crowd Controlled Enemies",
    */
        "Critical_Chance": new StatsNode("Critical_Chance", (parent_val: (parent_node: DiabloNode) => any) => {

            var One_Hand_Axe_Expertise = 0; // 1-H Axe Expertise: 5.0% increased Critical Strike Chance against injured enemies. Double this amount when using two Axes.
            if (parent_val(nodes_map["stat"]["Weapon_Type"]) == 0) {
                if ((parent_val(nodes_map["modifier"]["Main_Hand_Weapon"]) == 1) && (parent_val(nodes_map["toggle"]["Enemy_Injured"]))) {
                    One_Hand_Axe_Expertise += .05;
                }
                if ((parent_val(nodes_map["modifier"]["Off_Hand_Weapon"]) == 1) && (parent_val(nodes_map["toggle"]["Enemy_Injured"]))) {
                    One_Hand_Axe_Expertise += .05;
            }}

            var Two_Hand_Axe_Expertise = 0 // 2-H Axe Expertise: 10% increased Critical Strike Chance against Vulnerable enemies.
            if ((parent_val(nodes_map["stat"]["Weapon_Type"]) == 1) && (parent_val(nodes_map["modifier"]["Two_Hand_Slashing_Weapon"]) == 1) && (parent_val(nodes_map["toggle"]["Enemy_Vulnerable"]))) {
                Two_Hand_Axe_Expertise += 0.10;
            }

            var Aspect_Critical_Chance_Bonus = 0;
            var Talent_Critical_Chance_Bonus = 0;

            // Aspect of the Dire Whirlwind: Whirlwind's Critical Strike Chance is increased by +{5/10}% for each second it is channeled, up to +{20/40}%.
            if ((parent_val(nodes_map["aspect"]["Aspect of the Dire Whirlwind"]).length != 0) && (parent_val(nodes_map["current_skill"])["name"] == "Whirlwind")) {
                Aspect_Critical_Chance_Bonus += parent_val(nodes_map["aspect"]["Aspect of the Dire Whirlwind"])[0];
            }

            // "Smiting Aspect": You have [13-25]%[x] increased Critical Strike Chance against Iniured enemies. While you are Healthy, you gain [25-50]%[x] increased Crowd Control Duration. 
            if ((parent_val(nodes_map["aspect"]["Smiting Aspect"]).length != 0) && (parent_val(nodes_map["toggle"]["Enemy_Injured"]))) {
                Aspect_Critical_Chance_Bonus += parent_val(nodes_map["aspect"]["Smiting Aspect"])[0];
            }

            // No Mercy (Talent up to 3 points) You have +3% increased Critical Chance against Immobilized, Stunned, or Slowed enemies
            if ((parent_val(nodes_map["toggle"]["Enemy_Stunned"]) == 1) || (parent_val(nodes_map["toggle"]["Enemy_Slowed"]) == 1) || (parent_val(nodes_map["toggle"]["Enemy_Frozen"]) == 1) || (parent_val(nodes_map["toggle"]["Enemy_Knocked_Down"]) == 1)) {
                Talent_Critical_Chance_Bonus += 0.03 * parent_val(nodes_map["talent"]["No Mercy"]);
            }

            return (0.050 + // 5.0% Base Crit Chance for All Classes
                parent_val(nodes_map["modifier"]["Crit_Percent_Bonus"]) +
                parent_val(nodes_map["stat"]["Total_Dexterity"]) * 0.02 +
                Aspect_Critical_Chance_Bonus +
                Talent_Critical_Chance_Bonus +

                // Enemy Toggle Critical Chance Bonus
                parent_val(nodes_map["modifier"]["Crit_Chance_Bonus_To_Far"]) * Number(parent_val(nodes_map["toggle"]["Enemy_Far"])) +
                parent_val(nodes_map["modifier"]["Crit_Chance_Bonus_To_Near"]) * Number(parent_val(nodes_map["toggle"]["Enemy_Near"])) +
                parent_val(nodes_map["modifier"]["Crit_Percent_Bonus_To_Vulnerable"]) * Number(parent_val(nodes_map["toggle"]["Enemy_Vulnerable"])) +
                parent_val(nodes_map["modifier"]["Crit_Percent_Bonus_To_Low_Health"]) * Number(parent_val(nodes_map["toggle"]["Enemy_Injured"])) +
                parent_val(nodes_map["modifier"]["Crit_Percent_Bonus_To_High_Health"]) * Number(parent_val(nodes_map["toggle"]["Enemy_Healthy"])) +

                // Crowd Control Critical Chance Bonus
                parent_val(nodes_map["modifier"]["Crit_Percent_Bonus_Vs_CC_Target_Any"]) * parent_val(nodes_map["stat"]["Enemy_Crowd_Controlled"]) +
                parent_val(nodes_map["modifier"]["Crit_Percent_Bonus_Vs_Slowed"]) * Number(parent_val(nodes_map["toggle"]["Enemy_Slowed"])) + 
                parent_val(nodes_map["modifier"]["Crit_Percent_Bonus_Vs_Dazed"]) * Number(parent_val(nodes_map["toggle"]["Enemy_Dazed"])) + 
                parent_val(nodes_map["modifier"]["Crit_Percent_Bonus_Vs_Frozen"]) * Number(parent_val(nodes_map["toggle"]["Enemy_Frozen"])) + 
                parent_val(nodes_map["modifier"]["Crit_Percent_Bonus_Vs_Stunned"]) * Number(parent_val(nodes_map["toggle"]["Enemy_Stunned"])) + 
                One_Hand_Axe_Expertise + Two_Hand_Axe_Expertise
                );

            // Skill Category, Tags, Weapon Type}

        }),

        "Critical_Multiplier": new StatsNode("Critical_Multiplier", (parent_val: (parent_node: DiabloNode) => any) => {
            var Weapon_Type = parent_val(nodes_map["stat"]["Weapon_Type"]);

            var Additive_Crit_Damage_Bonus = 0; // 2-H Mace Expertise: You deal 15% increased Critical Strike Damage to Stunned and Vulnerable enemies while Berserking.
            if ((Weapon_Type == 2) && (parent_val(nodes_map["toggle"]["Enemy_Vulnerable"]) || parent_val(nodes_map["toggle"]["Enemy_Stunned"]))) {
                Additive_Crit_Damage_Bonus += 0.15;
            }
            // Dual Wield.
            if (Weapon_Type == 0) {
                Additive_Crit_Damage_Bonus += parent_val(nodes_map["modifier"]["Crit_Damage_Percent_Dual_Wielding"]);
            }
            // Two Handed Weapons.
            if (Weapon_Type == 1 || Weapon_Type == 2) {
                Additive_Crit_Damage_Bonus += parent_val(nodes_map["modifier"]["Crit_Damage_Percent_Two_Hand"]);
                // Heavy Handed (Talent up to 3 Points): While using Two-Handed weapons you deal x5% increased Crtiical Strike Damage
                Additive_Crit_Damage_Bonus += 0.05 * parent_val(nodes_map["talent"]["Heavy Handed"]);
            }

            if (parent_val(nodes_map["current_skill"])["tags"].has("Slashing") == true) {
                Additive_Crit_Damage_Bonus += parent_val(nodes_map["modifier"]["Crit_Damage_Percent_Slashing"]);
            }
            if (parent_val(nodes_map["current_skill"])["tags"].has("Bludgeoning") == true) {
                Additive_Crit_Damage_Bonus += parent_val(nodes_map["modifier"]["Crit_Damage_Percent_Bludgeoning"]);
            }


            return 1.50 + // +50.0% Base Crit Damage Bonus for All Classes
                parent_val(nodes_map["modifier"]["Crit_Damage_Percent"]) +

                // Enemy Toggle Critical Chance Bonus
                parent_val(nodes_map["modifier"]["Crit_Damage_Bonus_To_Far"]) * Number(parent_val(nodes_map["toggle"]["Enemy_Far"])) +
                parent_val(nodes_map["modifier"]["Crit_Damage_Bonus_To_Near"]) * Number(parent_val(nodes_map["toggle"]["Enemy_Near"])) +
                parent_val(nodes_map["modifier"]["Crit_Damage_Percent_Bonus_To_Vulnerable"]) * Number(parent_val(nodes_map["toggle"]["Enemy_Vulnerable"])) +

                // Crowd Control Critical Chance Bonus
                parent_val(nodes_map["modifier"]["Crit_Damage_Percent_Bonus_Vs_CC_Target_Any"]) * parent_val(nodes_map["stat"]["Enemy_Crowd_Controlled"]) +
                parent_val(nodes_map["modifier"]["Crit_Damage_Percent_Bonus_Vs_Slowed"]) * Number(parent_val(nodes_map["toggle"]["Enemy_Slowed"])) + 
                parent_val(nodes_map["modifier"]["Crit_Damage_Percent_Bonus_Vs_Dazed"]) * Number(parent_val(nodes_map["toggle"]["Enemy_Dazed"])) + 
                parent_val(nodes_map["modifier"]["Crit_Damage_Percent_Bonus_Vs_Frozen"]) * Number(parent_val(nodes_map["toggle"]["Enemy_Frozen"])) + 
                parent_val(nodes_map["modifier"]["Crit_Damage_Percent_Bonus_Vs_Stunned"]) * Number(parent_val(nodes_map["toggle"]["Enemy_Stunned"])) + 
                Additive_Crit_Damage_Bonus;
        }),

        // Attack Speed Stats Node http://www.vhpg.com/diablo-4-attack-speed/
        "Total_Attack_Speed": new StatsNode("Total_Attack_Speed", (parent_val: (parent_node: DiabloNode) => any) => {
            var Talent_Attack_Speed_Bonus = 0;
            var Aspect_Attack_Speed_Bonus = 0;

            var One_Hand_Sword_Expertise = 0; // 1-H Sword Expertise: Killing a Crowd Controlled enemy grants 15% increased Attack Speed for 3 seconds. The increase is doubled if using two Swords.
            if (parent_val(nodes_map["stat"]["Weapon_Type"]) == 0 && parent_val(nodes_map["toggle"]["Killed_Enemy_Recently"])) {
                if (parent_val(nodes_map["modifier"]["Main_Hand_Weapon"]) == 0) {
                    One_Hand_Sword_Expertise += 0.15;
                }
                if (parent_val(nodes_map["modifier"]["Off_Hand_Weapon"]) == 0) {
                    One_Hand_Sword_Expertise += 0.15;
                }
            }

            // Frenzy: If Frenzy hits an enemy, its Attack Speed is increased by +20% for 3 seconds, up to +60%.
            Talent_Attack_Speed_Bonus +=  (parent_val(nodes_map["current_skill"])["name"] == "Frenzy" ? 0.20 * parent_val(nodes_map["toggle"]["Frenzy Stacks"]) : 0);

            // Battle Frenzy: While Berserking, your other Skills gain +5% Attack Speed for each stack of Frenzy you have.
            if (parent_val(nodes_map["talent"]["Battle Frenzy"]) > 0 && parent_val(nodes_map["current_skill"])["name"] != "Frenzy" && parent_val(nodes_map["toggle"]["Berserking"])) {
                Talent_Attack_Speed_Bonus += .05 * parent_val(nodes_map["toggle"]["Frenzy Stacks"]);
            }

            // (Unique) Battle Trance: Increase Frenzy's maximum stacks by 2. While you have maximum Frenzy, your other Skills gain +{10/20}% increased Attack Speed.
            if ((parent_val(nodes_map["aspect"]["Battle Trance"]).length != 0) && (parent_val(nodes_map["current_skill"])["name"] != "Frenzy") && (parent_val(nodes_map["toggle"]["Frenzy Stacks"]) == 5)) {
                Aspect_Attack_Speed_Bonus += parent_val(nodes_map["aspect"]["Battle Trance"])[0];
            }

            // "Rapid Aspect" FloatRandomRangeWithInterval(10, 23, 33){c_important}Basic{/c} Skills gain {c_random}[Affix_Value_1|%|]{/c } Attack Speed.",
            if ((parent_val(nodes_map["aspect"]["Rapid Aspect"]).length != 0) && (parent_val(nodes_map["current_skill"])["category"] == "Basic")) {
                Aspect_Attack_Speed_Bonus += parent_val(nodes_map["aspect"]["Rapid Aspect"])[0];
            }

            // Warrior's Rupture (Talent): Hitting enemies with Rupture increases your Attack Speed by +20% for 4 seconds
            if ((parent_val(nodes_map["toggle"]["Ruptured Recently"]) == 1) && (parent_val(nodes_map["talent"]["Warrior's Rupture"]) == 1)) {
                Talent_Attack_Speed_Bonus += 0.20;
            }

            // Prime Call of the Ancients: While Call of the Ancients is active, gain +10% bonus Attack Speed and x10% Increased Damage
            if ((parent_val(nodes_map["toggle"]["Call of the Ancients"]) == 1) && (parent_val(nodes_map["talent"]["Prime Call of the Ancients"]) == 1)){
                Talent_Attack_Speed_Bonus += 0.10;
            }

            // Duelist (Talent up to 3 points): Attack Speed is increased by +3% while using One Handed Weapons
            if (parent_val(nodes_map["stat"]["Weapon_Type"]) == 0) {
                Talent_Attack_Speed_Bonus += 0.03 * parent_val(nodes_map["talent"]["Duelist"]);
            }

            var Total_Attack_Speed = (1 + parent_val(nodes_map["modifier"]["Weapon_Speed_Percent_Bonus"]) * 
                                     (parent_val(nodes_map['stat']["Raw_Attack_Speed"]) *
                                     (1 + parent_val(nodes_map["modifier"]["Attack_Speed_Percent_Bonus"]) +
                                     One_Hand_Sword_Expertise +
                                     Talent_Attack_Speed_Bonus +
                                     Aspect_Attack_Speed_Bonus +

                                     // Toggles
                                     (parent_val(nodes_map["modifier"]["Attack_Speed_Bonus_After_Dodge"]) * Number(parent_val(nodes_map["toggle"]["Dodged Recently"]))) +
                                     (parent_val(nodes_map["modifier"]["Attack_Speed_Percent_Bonus_While_Fortified"]) * parent_val(nodes_map["stat"]["Player_Fortified"]))
                                     // (TO DO) "Attack_Speed_Percent_Bonus_For_Power", // "+[{VALUE2} * 100|%|] Attack Speed of {VALUE1}",
           
            )));

            // The 1-H Axe Expertise attack speed is probably additive and not multiplicative...but I didn't know how to factor in the uptime without making it look clunky. 
            var One_Hand_Axe_Expertise = 1.0; // One_Hand Axe Expertise - Lucky Hit: Critical Strikes have up to a 55% chance to grant 6% increased Attack Speed for 2 seconds. Double the Attack Speed bonus when using two Axes.
            var Critical_Chance = parent_val(nodes_map["stat"]["Critical_Chance"]);
            if (parent_val(nodes_map["stat"]["Weapon_Type"]) == 0) {
                if (parent_val(nodes_map["modifier"]["Main_Hand_Weapon"]) == 1) {
                    One_Hand_Axe_Expertise += Math.min(.06, .06 * 0.55 * Critical_Chance * (2 / Total_Attack_Speed)); // Uptime of Attack Speed Buff
                }
                if (parent_val(nodes_map["modifier"]["Off_Hand_Weapon"]) == 1) {
                    One_Hand_Axe_Expertise += Math.min(.06, .06 * 0.55 * Critical_Chance * (2 / Total_Attack_Speed));
                }
            }

            // Formula = Weapon Speed Bonus * (Average Weapon Speed * Total Attack Speed Bonus)
            return Total_Attack_Speed * One_Hand_Axe_Expertise;

        }),

        "Overpower_Chance": new StatsNode("Overpower_Chance", (parent_val: (parent_node: DiabloNode) => any) => {
            return 0.03 + parent_val(nodes_map["modifier"]["Overpower_Chance_Bonus"]);
        }),

        "Overpower_Damage": new StatsNode("Overpower_Damage", (parent_val: (parent_node: DiabloNode) => any) => {  // Overpower Fortify + Current Hitpoints to Weapon Damage or atleast +50% Weapon Damage
            
            var Talent_Overpower_Bonus = 0;
            // Brute Force (Talent up to 3 points): Your Overpowers deal x15% increased damage when using a Two-Handed weapon
            if (parent_val(nodes_map["stat"]["Weapon_Type"]) == 1 || parent_val(nodes_map["stat"]["Weapon_Type"]) == 2) {
                Talent_Overpower_Bonus += 0.15 * parent_val(nodes_map["talent"]["Brute Force"]);
            }

            return Math.max(parent_val(nodes_map["stat"]["Total_Weapon_Damage"]) * 0.5, 
                        (parent_val(nodes_map["toggle"]["Percent_Hitpoints"]) + parent_val(nodes_map["toggle"]["Percent_Fortify"])) * parent_val(nodes_map["stat"]["Max_Hitpoints"]) * (parent_val(nodes_map["modifier"]["Overpower_Damage_Percent_Bonus"]))) *
                        Talent_Overpower_Bonus;
        }),

        "Vulnerable_Multiplier": new StatsNode("Vulnerable_Multiplier", (parent_val: (parent_node: DiabloNode) => any) => {
            return 0.2 + parent_val(nodes_map["modifier"]["Vulnerable_Damage_Bonus"])
        }),

        "Berserking_Multiplier": new StatsNode("Berserking_Multiplier", (parent_val: (parent_node: DiabloNode) => any) => {

            // Unconstrained (Talent): Increases Berserk's Maximum Duration by 5 Seconds and increase its damage bonus by +25%
            var Unconstrained_Bonus = 0;
            if (parent_val(nodes_map["talent"]["Unconstrained"]) == 1) {
                Unconstrained_Bonus += 0.25;
            }

            const Supreme_Wrath_of_the_Berserker_Bonus = 0.25 * parent_val(nodes_map["toggle"]["Supreme Wrath of the Berserker Stacks"]);
            
            return 0.25 + 
                   parent_val(nodes_map["modifier"]["Berserk_Damage_Percent_Bonus"]) + 
                   Supreme_Wrath_of_the_Berserker_Bonus +
                   Unconstrained_Bonus;
        }),

        "Weapon_Expertise_Multiplier": new StatsNode("Weapon_Expertise_Multiplier", (parent_val: (parent_node: DiabloNode) => any) => {
            
            // 1-Handed Mace Expertise: 10% increased damage to Stunned enemies. Doubles the effect when using two Maces.
            var One_Hand_Mace_Expertise_Damage_Multiplier = 1;
            if (parent_val(nodes_map["stat"]["Weapon_Type"]) == 0 && parent_val(nodes_map["toggle"]["Enemy_Stunned"])) {
                if (parent_val(nodes_map["modifier"]["Main_Hand_Weapon"]) == 2) {
                    One_Hand_Mace_Expertise_Damage_Multiplier += 0.1;
                }
                if (parent_val(nodes_map["modifier"]["Off_Hand_Weapon"]) == 2) {
                    One_Hand_Mace_Expertise_Damage_Multiplier += 0.1;
                }
            }
            
            // 2-Handed Axe Expertise: 15.0% increased damage to Vulnerable enemies.
            var Two_Hand_Axe_Expertise_Damage_Multiplier = 1;
            if (parent_val(nodes_map["stat"]["Weapon_Type"]) == 1 && parent_val(nodes_map["modifier"]["Two_Hand_Slashing_Weapon"]) && parent_val(nodes_map["toggle"]["Enemy_Vulnerable"])) {
                    Two_Hand_Axe_Expertise_Damage_Multiplier += 0.15;
            }
            
            // Polearm Expertise: You deal 10% increased damage while Healthy.
            var Polearm_Expertise_Damage_Multipler = 1;
            if ((parent_val(nodes_map["stat"]["Weapon_Type"]) == 1) && (parent_val(nodes_map["modifier"]["Two_Hand_Slashing_Weapon"]) == 2) && (parent_val(nodes_map["toggle"]["Percent_Hitpoints"]) >= 0.8)) {
                    Polearm_Expertise_Damage_Multipler += 0.10;
            }

            return One_Hand_Mace_Expertise_Damage_Multiplier * Two_Hand_Axe_Expertise_Damage_Multiplier * Polearm_Expertise_Damage_Multipler;
        
        }),

        // Aspects can be multiplicative with Damage
        "Aspect_Multiplier": new StatsNode("Aspect_Multiplier", (parent_val: (parent_node: DiabloNode) => any) => {
            var aspect_damage_multiplier = 1;

            // Aspect of Ancestral Force: Hammer of the Ancients quakes outwards, dealing {32/50}% of its damage to enemies.
            if ((parent_val(nodes_map["stat"]["Weapon_Type"]) == 2) && (parent_val(nodes_map["aspect"]["Aspect of Ancestral Force"]).length != 0)) { 
                aspect_damage_multiplier *= (1 + parent_val(nodes_map["aspect"]["Aspect of Ancestral Force"])[0])}

            // Aspect of Ancestral Echoes: Lucky Hit: Damaging enemies with Leap, Upheaval, or Whirlwind has up to a {40/50}% chance to summon an Ancient to perform the same Skill. Can only happen once every 5.0 seconds.
            if (parent_val(nodes_map["aspect"]["Aspect of Ancestral Force"]).length != 0) {
                if (["Leap", "Upheaval", "Whirlwind"].includes(parent_val(nodes_map["current_skill"])["name"])) {
                    const Total_Attack_Speed = parent_val(nodes_map["stat"]["Total_Attack_Speed"]);
                    aspect_damage_multiplier *= (1 + (1 / (Total_Attack_Speed * 5)) * parent_val(nodes_map["aspect"]["Aspect of Ancestral Force"])[0]);
                }
            } // FIX LATER

            // Earthquake Aspect: Ground Stomp creates an Earthquake damaging enemies for {195/380} Physical damage over 4 seconds. While standing in Earthquakes, you deal x{5/15}% increased damage.
            if (parent_val(nodes_map["aspect"]["Earthquake Aspect"]).length != 0) { // Needs to Check Ground Slam chosen & CD
                const Ground_Slam_Cooldown = parent_val(nodes_map["skill"]["cooldown_seconds"]);
                const Earthquake_Aspect_Uptime = 4 / Ground_Slam_Cooldown;
                aspect_damage_multiplier *= (1 + (parent_val(nodes_map["aspect"]["Earthquake Aspect"])[0] * Earthquake_Aspect_Uptime));}
            
            // (Unique) Overkill: Death Blow creates a shockwave, dealing {16/30}% of its Base damage to enemies. Enemies who die to this effect also reset Death Blow's Cooldown.
            if ((parent_val(nodes_map["aspect"]["Overkill"]).length != 0) && (parent_val(nodes_map["current_skill"])["name"] == "Death Blow")) {
                aspect_damage_multiplier *= 1 + parent_val(nodes_map["aspect"]["Overkill"])[0];
            }

            // Veteran Brawler's Aspect: Each time a Core Skill deals direct damage to an enemy, your next Charge or Leap deals x{15/20}% increased damage, up to x{225/300}%.
            if ((parent_val(nodes_map["aspect"]["Veteran Brawler's Aspect"]).length != 0) && (parent_val(nodes_map["current_skill"])["name"] == "Charge" || parent_val(nodes_map["current_skill"])["name"] == "Leap")) {
                aspect_damage_multiplier *= 1 + Math.min(parent_val(nodes_map["aspect"]["Veteran Brawler's Aspect"])[1], parent_val(nodes_map["aspect"]["Veteran Brawler's Aspect"])[0] * parent_val(nodes_map["toggle"]["Veteran Brawler's Aspect Stacks"]));
            }

            //"Conceited Aspect": FloatRandomRangeWithInterval(10, 23, 33)"Deal {c_random}x[Affix_Value_1|%|]{/c} increased damage while you have a {c_important}Barrier{/c} active.",
            if ((parent_val(nodes_map["aspect"]["Conceited Aspect"]).length != 0) && (parent_val(nodes_map["toggle"]["Barrier_Active"]) != 0)) {
                aspect_damage_multiplier *= parent_val(nodes_map["aspect"]["Conceited Aspect"])[0];
            }

            // "Aspect of Pummeling" FloatRandomRangeWithInterval(10, 40, 50) "Deal {c_random}x[Affix_Value_1|%|]{/if}{/c} increased damage to Stunned, Knocked Down, and Frozen enemies.",
            if ((parent_val(nodes_map["aspect"]["Aspect of Pummeling"]).length != 0) && (parent_val(nodes_map["stat"]["Enemy_Crowd_Controlled"]) == 1)) {            
                aspect_damage_multiplier *= parent_val(nodes_map["aspect"]["Aspect of Pummeling"])[0];
            }

            // Aspect of the Expectant: Attacking enemies with a Basic Skill increases the damage of your next Core Skill cast by [5-10][x], up to [50]%[x]. 
            if ((parent_val(nodes_map["aspect"]["Aspect of the Expectant"]).length != 0) && (parent_val(nodes_map["current_skill"])["category"] == "Core")) {  
                
                const Basic_Skill_Fury_Generation = 9; // This is a dummy placeholder value until we can look at other skills
                
                const Total_Basic_Skill_Fury_Generation = (Basic_Skill_Fury_Generation + parent_val(nodes_map["stat"]["Fury_Gain_Per_Hit"])) * parent_val(nodes_map['stat']["Total_Resource_Generation_Multiplier"]);
                const Core_Skill_Fury_Cost = parent_val(nodes_map["stat"]["Delta_Resources"]);
                const Core_Basic_Ratio = Core_Skill_Fury_Cost / Total_Basic_Skill_Fury_Generation;

                aspect_damage_multiplier *= 1 + Math.min(parent_val(nodes_map["aspect"]["Aspect of the Expectant"])[0] * Core_Basic_Ratio, parent_val(nodes_map["aspect"]["Aspect of the Expectant"])[1]);
            }

            return aspect_damage_multiplier;
            
        }),

        // Talents can be multiplicative with Damage
        "Talent_Multiplier": new StatsNode("Talent_Multiplier", (parent_val: (parent_node: DiabloNode) => any) => {
            var talent_damage_multiplier = 1;

            // Enhanced Lunging Strike: Lunging Strike deals x30% increased damage and Heals you for 2% maximum life when it damages a Healthy Enemy
            if ((parent_val(nodes_map["current_skill"])["name"] == "Lunging Strike") && parent_val(nodes_map["talent"]["Enhanced Lunging Strike"]) == 1 && parent_val(nodes_map["toggle"]["Enemy_Healthy"])) {
                talent_damage_multiplier *= 1.30;
            }

            var War_Cry_Multiplier = 1; // "War Cry" 
            if ((parent_val(nodes_map["toggle"]["War Cry"]) == 1) && (parent_val(nodes_map["talent"]["War Cry"]) > 0)) {
                War_Cry_Multiplier = 1.15 + 0.015 * (parent_val(nodes_map["talent"]["War Cry"]) - 1);

                // Power War Cry: If at least 6 enemies are Nearby when you cast War Cry, your damage bonus is increased to x{30/31.5/33/34.5/36/37.5/39/40.5/42/43.5}%
                if (parent_val(nodes_map["toggle"]["Power War Cry"]) == 1) { 
                    War_Cry_Multiplier = 1.30 + 0.015 * (parent_val(nodes_map["talent"]["War Cry"]) - 1); // Same Talent Point Scaling as Normal Warcry but has a flat 15% Bonus
                }
                talent_damage_multiplier *= War_Cry_Multiplier;
            }
            
            // Violent Whirlwind: After using Whirlwind for 2 seconds, Whirlwind deals x30% increased damage until it is cancelled.
            if ((parent_val(nodes_map["current_skill"])["name"] == "Whirlwind") && parent_val(nodes_map["toggle"]["Violent Whirlwind"]) == 1 && (parent_val(nodes_map["talent"]["Violent Whirlwind"]) == 1)) {
                talent_damage_multiplier *= 1.30;
            }

            // Furious Hammer of the Ancients: Hammer of the Ancients deals x1% additional damage for each point of Fury you had when using it.
            if (parent_val(nodes_map["current_skill"])["name"] == "Hammer of the Ancients" && parent_val(nodes_map["toggle"]["Furious Hammer of the Ancients"]) && parent_val(nodes_map["talent"]["Furious Hammer of the Ancients"]) == 1) {
                talent_damage_multiplier *= 1 + 0.01 * parent_val(nodes_map["toggle"]["Current_Fury"]);
            }

            // Violent Hammer of the Ancients: After Overpowering with Hammer of the Ancients, you deal x30% more damage for 2.5 seconds.
            if ((parent_val(nodes_map["toggle"]["Violent Hammer of the Ancients"]) == 1) && (parent_val(nodes_map["talent"]["Violent Hammer of the Ancients"]) == 1)) {
                talent_damage_multiplier *= 1.30; 
            }

            // Furious Upheaval: Dealing direct damage to an enemy with a Skill that is not Upheaval causes your next cast of Upheaval to deal x8% increased damage, stacking up to 10 times.
            if (parent_val(nodes_map["current_skill"])["name"] == "Upheaval" && parent_val(nodes_map["toggle"]["Furious Upheaval"]) == 1 && parent_val(nodes_map["talent"]["Furious Upheaval"]) == 1) {
                talent_damage_multiplier *= 1 + Math.min(0.80, .08 * parent_val(nodes_map["toggle"]["Furious Upheaval"]));
            }

            // Violent Rend: Rend deals x12% increased damage to vulnerable enemies
            if (parent_val(nodes_map["current_skill"])["name"] == "Rend" && parent_val(nodes_map["toggle"]["Enemy_Vulnerable"]) && parent_val(nodes_map["talent"]["Violent Rend"]) == 1) {
                talent_damage_multiplier *= 1.12;
            }

            // Mighty Kick: Kicked enemies deal 54% damage to enemies they collide with while being Knocked Back. Enemies damaged this way are Knocked Down for 2 seconds.
            if (parent_val(nodes_map["current_skill"])["name"] == "Kick" && parent_val(nodes_map["toggle"]["Mighty Kick"]) == 1) {
                talent_damage_multiplier *= 1.54;
            }

            // Power Kick: If Kick damages an enemy, it consumes all of your Fury and deals an additional 20% damage per 10 fury spent. Kick no longer knocks back enemies.
            if (parent_val(nodes_map["current_skill"])["name"] == "Kick" && parent_val(nodes_map["toggle"]["Power Kick"])) {
                talent_damage_multiplier *= 1 + 0.20 * Math.floor(parent_val(nodes_map["toggle"]["Current_Fury"]) / 10);
            }

            // Pit Fighter (Talent up to 3 points): You deal x3% increased damage to Close Enemies and gain 2% Distant Damage Reduction
            if (parent_val(nodes_map["toggle"]["Enemy_Near"])) {
                talent_damage_multiplier *= 1 + 0.03 * parent_val(nodes_map["talent"]["Pit Fighter"]);
            }

            // Slaying Strike (Talent up to 3 points): You deal x7.5% increased damage against injured enemies
            if (parent_val(nodes_map["toggle"]["Enemy_Injured"])) {
                talent_damage_multiplier *= 1 + 0.075 * parent_val(nodes_map["talent"]["Slaying Strike"]);
            }

            // Counteroffensive (Talent up to 3 points): While you have Fortify for over 50% of your Maximum life, you deal x5% increased damage
            if (parent_val(nodes_map["toggle"]["Percent_Fortify"]) >= 0.50) {
                talent_damage_multiplier *= 1 + 0.050 * parent_val(nodes_map["talent"]["Counteroffensive"]);
            }

            // Prime Call of the Ancients: While Call of the Ancients is active, gain +10% bonus Attack Speed and x10% Increased Damage
            if ((parent_val(nodes_map["toggle"]["Call of the Ancients"]) == 1) && (parent_val(nodes_map["talent"]["Prime Call of the Ancients"]) == 1)){
                talent_damage_multiplier *= 1 + 0.10;
            }

            // Wallop (Talent up to 3 Points): Your Skills using Bludgeoning Weapons deal x5% increased Damage if the enemy is Stunned or Vulnerable
            if ((parent_val(nodes_map["stat"]["Weapon_Type"]) == 2) || ((parent_val(nodes_map["stat"]["Weapon_Type"]) == 0) && (parent_val(nodes_map["modifier"]["Main_Hand_Weapon"]) == 2))) {
                if ((parent_val(nodes_map["toggle"]["Enemy_Stunned"])) || (parent_val(nodes_map["toggle"]["Enemy_Vulnerable"]))) {
                    talent_damage_multiplier *= 1 + 0.05 * parent_val(nodes_map["talent"]["Wallop"]);
                }
            }

            // Walking Arsenal: Dealing Damage with a Two-Handed Bludgeoning, Two-Handed Slashing, or Dual Wielded weapon grants x10% increased damage for 6 seconds.  While all three damage bonuses are active, you gain an additional x15% increased damage
            if (parent_val(nodes_map["talent"]["Walking Arsenal"]) == 1) {
                talent_damage_multiplier *= 1.45;
            }

            //Unbridled Rage (Talent 1 point): Core Skills deal x135% increased damage, but cost x100 more Fury
            if ((parent_val(nodes_map["talent"]["Unbridled Rage"]) == 1) && (parent_val(nodes_map["current_skill"])["category"] == "Core")) {
                talent_damage_multiplier *= 2.35;
            }


            return talent_damage_multiplier;

        }), 

        /*--------------------------------------------------
                    PLAYER STATS NODES
        --------------------------------------------------*/

        "Max_Hitpoints": new StatsNode("Max_Hitpoints", (parent_val: (parent_node: DiabloNode) => any) => {
            
            var Talent_Hitpoints_Percent_Bonus = 1;

            // Imposing Presence (Talent): Gain x5% additional Maximum Life (up to 3 Points)
            Talent_Hitpoints_Percent_Bonus += .05 * parent_val(nodes_map["talent"]["Imposing Presence"]);

            // Enhanced Challenging Shout: While Challenging Shout is active, gain x20% bonus maximum life
            if ((parent_val(nodes_map["talent"]["Enhanced Challenging Shout"])) && (parent_val(nodes_map["toggle"]["Challenging Shout"]) == 1)) {
                Talent_Hitpoints_Percent_Bonus += 0.20;
            }

            return (parent_val(nodes_map["base_stat"])["BaseMaxLife"] + 
                (parent_val(nodes_map["modifier"]["Hitpoints_Max_Bonus"]) * (1 + parent_val(nodes_map["modifier"]["Hitpoints_Max_Percent_Bonus"])))) *
                (1 + Talent_Hitpoints_Percent_Bonus + parent_val(nodes_map["modifier"]["Hitpoints_Percent"]));
        }),

        "Total_Thorns": new StatsNode("Total_Thorns", (parent_val: (parent_node: DiabloNode) => any) => {
            var Total_Thorns = parent_val(nodes_map["modifier"]["Thorns_Flat"]);
            var Thorns_Multiplier = 1;

            // Death Wish Aspect: Gain {55/100} Thorns while Berserking.
            if ((parent_val(nodes_map["aspect"]["Death Wish Aspect"]).length > 0) && (parent_val(nodes_map["toggle"]["Berserking"]) == 1)) {
                Total_Thorns += parent_val(nodes_map["aspect"]["Death Wish Aspect"])[0]
            }

            // Combat Flay: When Flay deals direct damage to an enemy, you gain 3% Damage Reduction and 50 Thorns for 3 seconds. This stacks up to 4 times.
            Total_Thorns += 50 * parent_val(nodes_map["toggle"]["Combat Flay Stacks"]);

            // (Talent) Outburst: Gain 20 Thorns. Also gain 20 Thorns for each 25 Bonus Maximum life you have.
            Total_Thorns += (20/25) * (parent_val(nodes_map["modifier"]["Hitpoints_Max_Bonus"]) * (1 + parent_val(nodes_map["modifier"]["Hitpoints_Max_Percent_Bonus"])));

            // (Talent) Tough as Nails: Increase your Thorns by +20% (up to 3 points). When enemies hit you, they take an additional 1% of your Thorns as Bleeding Damage over 5 seconds.
            Thorns_Multiplier += 0.20 * parent_val(nodes_map["talent"]["Tough as Nails"]);

            // Strategic Challenging Shout: While Challenging Shout is active, gain Thorns equal to 50% of your maximum life.
            if ((parent_val(nodes_map["toggle"]["Challenging Shout"]) == 1) && (parent_val(nodes_map["talent"]["Strategic Challenging Shout"]) == 1)){
                Total_Thorns += 0.50 * parent_val(nodes_map["stat"]["Max_Hitpoints"]);
            }
            
            return Total_Thorns * Thorns_Multiplier;
        }),

        // Fortified - returns boolean
        "Player_Fortified": new StatsNode("Player_Fortified", (parent_val: (parent_node: DiabloNode) => any) => {
            return (parent_val(nodes_map["toggle"]["Percent_Fortify"]) >= parent_val(nodes_map["toggle"]["Percent_Hitpoints"]) ? 1 : 0);
        }),

        "Player_Damage_Reduction": new StatsNode("Player_Damage_Reduction", (parent_val: (parent_node: DiabloNode) => any) => {
            
            var Aspect_Damage_Reduction = 1;
            var Talent_Damage_Reduction = 1;

            // Martial Vigor: Damage Reduction against Elites is increased by 4% (up to 3 points)
            if (parent_val(nodes_map["toggle"]["Enemy_Elite"]) == 1) {
                Talent_Damage_Reduction *= 1 - 0.04 * parent_val(nodes_map["toggle"]["Enemy_Elite"])
            }

            // Fortified Damage Reduction
            var Fortified_Damage_Reduction = 0.10 * parent_val(nodes_map["stat"]["Player_Fortified"]) // Fortified Damage Reduction is Multiplied
            // Defensive Stance (Talent up to 3 points): Increases the Damage Reduction gained while you are fortified by an additional 3%
            Fortified_Damage_Reduction += .03 * parent_val(nodes_map["talent"]["Defensive Stance"]);

            // Aspect of Bul-Kathos: Leap creates an Earthquake that deals {195/380} Physical damage over 4 seconds. While standing in Earthquakes, you gain {5/15}% increased Damage Reduction.
            if ((parent_val(nodes_map["current_skill"])["name"] == "Leap") && (parent_val(nodes_map["aspect"]["Aspect of Bul-Kathos"]).length != 0)) {
                Aspect_Damage_Reduction *= 1 - parent_val(nodes_map["aspect"]["Aspect of Bul-Kathos"])[1];
            }

            // Aspect of the Iron Warrior: Iron Skin grants Unstoppable, and {10/20}% Damage Reduction.
            if ((parent_val(nodes_map["toggle"]["Iron Skin"]) == 1) && (parent_val(nodes_map["aspect"]["Aspect of the Iron Warrior"]).length != 0)) {
                Aspect_Damage_Reduction *= 1 - parent_val(nodes_map["aspect"]["Aspect of the Iron Warrior"])[1];
            }

            // Iron Blood Aspect: Gain {2/4}% Damage Reduction for each Nearby Bleeding enemy up to {10/20}% maximum.
            if ((parent_val(nodes_map["toggle"]["Iron Blood Aspect"]) != 0) && (parent_val(nodes_map["aspect"]["Iron Blood Aspect"]).length != 0)) {
                Aspect_Damage_Reduction *= 1 - Math.min(parent_val(nodes_map["aspect"]["Iron Blood Aspect"])[1], parent_val(nodes_map["toggle"]["Iron Blood Aspect"]) * parent_val(nodes_map["aspect"]["Iron Blood Aspect"])[0]);
            }

            // "Aspect of Might" FloatRandomRangeWithInterval(8, 4, 8) Basic{/c} skills grant {c_number}[Affix.\"Static Value 0\"|%|]{/c} damage reduction for {c_random}[Affix_Value_1|1|]{/c} seconds.",
            if (parent_val(nodes_map["Aspect of Might"]).length != 0) {
                Aspect_Damage_Reduction *= 1 - parent_val(nodes_map["Aspect of Might"])[0];
            }

            // "Aspect of Disobedience" FloatRandomRangeWithInterval(10, 20, 30) Enemies afflicted with a damage over time effect deal {c_random}[Affix_Value_1|%|]{/c} less damage to you.",
            if ((parent_val(nodes_map["aspect"]["Aspect of Disobedience"]).length != 0) && (parent_val(nodes_map["toggle"]["Enemy_Affected_By_Dot"]) == 1)){
                Aspect_Damage_Reduction *= 1 - parent_val(nodes_map["Aspect of Disobedience"])[0];
            }

            // Challenging Shout: Taunt Nearby Enemies and gain 40% Damage Reduction for 8 Seconds
            if (parent_val(nodes_map["toggle"]["Challenging Shout"]) == 1) {
                Talent_Damage_Reduction *= .6
            }

            // Guttural Yell (up to 3 points): Your Shout skills cause enemies to deal 8% less damage for 5 seconds 
            if (parent_val(nodes_map["toggle"]["Challenging Shout"]) || parent_val(nodes_map["toggle"]["War Cry"]) || parent_val(nodes_map["toggle"]["Rallying Cry"])) {
                Talent_Damage_Reduction *= 1 - .08 * parent_val(nodes_map["talent"]["Guttural Yell"])
            }

            // Aggressive Resistance (up to 3 points): Gain 4% Damage Reduction While Berserking
            if (parent_val(nodes_map["toggle"]["Berserking"]) == 1) {
                Talent_Damage_Reduction *= 1 - .04 * parent_val(nodes_map["talent"]["Aggressive Resistance"])
            }            

            // Pit Fighter (Talent up to 3 points): You deal x3% increased damage to Close Enemies and gain 2% Distant Damage Reduction
            if (parent_val(nodes_map["toggle"]["Enemy_Far"])) {
                Talent_Damage_Reduction *= 1 - 0.02 * parent_val(nodes_map["talent"]["Pit Fighter"]);
            }

            return 1 - (0.9 * // Barbarians have 10% Damage Reduction Built-in
                    Aspect_Damage_Reduction * 
                    Talent_Damage_Reduction *
                   (1 - Fortified_Damage_Reduction) *
                   (1 - (parent_val(nodes_map["toggle"]["Combat Flay Stacks"]) * .03)) *  // Combat Flay provides 3% Damage Reduction & 50 Thorns per Stack
                   (1 - ((parent_val(nodes_map["modifier"]["Damage_Percent_Reduction_From_CCed_Target"]) * parent_val(nodes_map["stat"]["Enemy_Crowd_Controlled"])) +
                   (parent_val(nodes_map["modifier"]["Damage_Percent_Reduction_From_Elites"]) * parent_val(nodes_map["toggle"]["Enemy_Elite"])) +
                   (parent_val(nodes_map["toggle"]["Percent_Hitpoints"]) >= 0.8 * parent_val(nodes_map["stat"]["Max_Hitpoints"]) ? parent_val(nodes_map["modifier"]["Damage_Reduction_At_High_Health"]) : 0) +
                   (parent_val(nodes_map["toggle"]["Percent_Hitpoints"]) < 0.35 * parent_val(nodes_map["stat"]["Max_Hitpoints"]) ? parent_val(nodes_map["modifier"]["Damage_Reduction_At_Low_Health"]) : 0) +
                   (parent_val(nodes_map["modifier"]["Damage_Reduction_From_Far"]) * parent_val(nodes_map["toggle"]["Enemy_Far"])) +
                   (parent_val(nodes_map["modifier"]["Damage_Reduction_From_Near"]) * parent_val(nodes_map["toggle"]["Enemy_Near"])) +
                   (parent_val(nodes_map["modifier"]["Damage_Reduction_While_Stationary"]) * parent_val(nodes_map["toggle"]["Player_Stationary"]))
                   )));
        }),

        "Total_Dodge_Chance": new StatsNode("Total_Dodge_Chance", (parent_val: (parent_node: DiabloNode) => any) => {
            var Total_Dodge_Chance = parent_val(nodes_map["modifier"]["Dodge_Chance_Bonus"]);
            //"Dodge_Chance_Bonus_From_Dotted_Enemies", // "+[{VALUE2}*100|1%|] Dodge Chance From Enemies That Are {VALUE1}",
            
            //Aspect of Assimilation: You have 8% increased Dodge Chance versus enemies affected by Damage Over Time effects. When you Dodge, you gain [5 - 10] of your Primary Resource.
            if ((parent_val(nodes_map["aspect"]["Aspect of Assimilation"]).length != 0) && (parent_val(nodes_map["toggle"]["Enemy_Affected_By_Dot"]) == 1)) {
                Total_Dodge_Chance += 8;
            }

            return Total_Dodge_Chance;
        }),

        "Total_Strength": new StatsNode("Total_Strength", (parent_val: (parent_node: DiabloNode) => any) => {
            return (parent_val(nodes_map["base_stat"])["Strength"]+ parent_val(nodes_map["modifier"]["Strength"]) + parent_val(nodes_map["modifier"]["Plus_All_Stats"])) * (1 + parent_val(nodes_map["modifier"]["Strength_Percent_Bonus"]));
        }),

        "Total_Intelligence": new StatsNode("Total_Strength", (parent_val: (parent_node: DiabloNode) => any) => {
            return (parent_val(nodes_map["base_stat"])["Intelligence"] + parent_val(nodes_map["modifier"]["Intelligence"]) + parent_val(nodes_map["modifier"]["Plus_All_Stats"])) * (1 + parent_val(nodes_map["modifier"]["Intelligence_Percent_Bonus"]));
        }),

        "Total_Dexterity": new StatsNode("Total_Dexterity", (parent_val: (parent_node: DiabloNode) => any) => {
            return (parent_val(nodes_map["base_stat"])["Dexterity"] + parent_val(nodes_map["modifier"]["Dexterity"]) + parent_val(nodes_map["modifier"]["Plus_All_Stats"])) * (1 + parent_val(nodes_map["modifier"]["Dexterity_Percent_Bonus"]));
        }),

        "Total_Willpower": new StatsNode("Total_Willpower", (parent_val: (parent_node: DiabloNode) => any) => {
            return (parent_val(nodes_map["base_stat"])["Willpower"] + parent_val(nodes_map["modifier"]["Willpower"]) + parent_val(nodes_map["modifier"]["Plus_All_Stats"])) * (1 + parent_val(nodes_map["modifier"]["Willpower_Percent_Bonus"]));
        }),

        "Total_Armor": new StatsNode("Total_Armor", (parent_val: (parent_node: DiabloNode) => any) => {
            return (1 + parent_val(nodes_map["modifier"]["Armor_Percent"])) * (
                parent_val(nodes_map["stat"]["Total_Strength"]) +
                parent_val(nodes_map["modifier"]["Armor_Bonus"])
            )
        }),

        /*
        NOTE RESISTANCES ARE NON-LINEAR.  THEY HAVE DIMINISHING RETURNS
        */

        "Resistance_Cold": new StatsNode("Resistance_Cold", (parent_val: (parent_node: DiabloNode) => any) => {
            const Resistance =  parent_val(nodes_map["modifier"]["Resistance#Cold"]) +
                                parent_val(nodes_map["modifier"]["Resistance_All"]) +
                                (parent_val(nodes_map["stat"]["Total_Intelligence"]) * .05) -
                                ((parent_val(nodes_map["toggle"]["Storyline_Act"]) == 2) || (parent_val(nodes_map["toggle"]["Storyline_Act"]) == 3) ? 20.0 : 0) -
                                ((parent_val(nodes_map["toggle"]["Storyline_Act"]) == 4) || (parent_val(nodes_map["toggle"]["Storyline_Act"]) == 5) ? 40.0 : 0);
            return Resistance;
        }),
        "Resistance_Fire": new StatsNode("Resistance_Fire", (parent_val: (parent_node: DiabloNode) => any) => {
            const Resistance =  parent_val(nodes_map["modifier"]["Resistance#Fire"]) +
                                parent_val(nodes_map["modifier"]["Resistance_All"]) +
                                (parent_val(nodes_map["stat"]["Total_Intelligence"]) * .05) - 
                                ((parent_val(nodes_map["toggle"]["Storyline_Act"]) == 2) || (parent_val(nodes_map["toggle"]["Storyline_Act"]) == 3) ? 20.0 : 0) -
                                ((parent_val(nodes_map["toggle"]["Storyline_Act"]) == 4) || (parent_val(nodes_map["toggle"]["Storyline_Act"]) == 5) ? 40.0 : 0);
            return Resistance;
        }),
        "Resistance_Lightning": new StatsNode("Resistance_Lightning", (parent_val: (parent_node: DiabloNode) => any) => {
            const Resistance =  parent_val(nodes_map["modifier"]["Resistance#Lightning"]) +
                                parent_val(nodes_map["modifier"]["Resistance_All"]) +
                                (parent_val(nodes_map["stat"]["Total_Intelligence"]) * .05) - 
                                ((parent_val(nodes_map["toggle"]["Storyline_Act"]) == 2) || (parent_val(nodes_map["toggle"]["Storyline_Act"]) == 3) ? 20.0 : 0) -
                                ((parent_val(nodes_map["toggle"]["Storyline_Act"]) == 4) || (parent_val(nodes_map["toggle"]["Storyline_Act"]) == 5) ? 40.0 : 0);
            return Resistance;
        }),
        "Resistance_Poison": new StatsNode("Resistance_Poison", (parent_val: (parent_node: DiabloNode) => any) => {
            const Resistance =  parent_val(nodes_map["modifier"]["Resistance#Poison"]) +
                                parent_val(nodes_map["modifier"]["Resistance_All"]) +
                                (parent_val(nodes_map["stat"]["Total_Intelligence"]) * .05) -
                                ((parent_val(nodes_map["toggle"]["Storyline_Act"]) == 2) || (parent_val(nodes_map["toggle"]["Storyline_Act"]) == 3) ? 20.0 : 0) -
                                ((parent_val(nodes_map["toggle"]["Storyline_Act"]) == 4) || (parent_val(nodes_map["toggle"]["Storyline_Act"]) == 5) ? 40.0 : 0);
            return Resistance;
        }),
        "Resistance_Shadow": new StatsNode("Resistance_Shadow", (parent_val: (parent_node: DiabloNode) => any) => {
            const Resistance =  parent_val(nodes_map["modifier"]["Resistance#Shadow"]) +
                                parent_val(nodes_map["modifier"]["Resistance_All"]) +
                                (parent_val(nodes_map["stat"]["Total_Intelligence"]) * .05) -
                                ((parent_val(nodes_map["toggle"]["Storyline_Act"]) == 2) || (parent_val(nodes_map["toggle"]["Storyline_Act"]) == 3) ? 20.0 : 0) -
                                ((parent_val(nodes_map["toggle"]["Storyline_Act"]) == 4) || (parent_val(nodes_map["toggle"]["Storyline_Act"]) == 5) ? 40.0 : 0);
            return Resistance;
        }),

        /*--------------------------------------------------
                    MICELLANEOUS NODES
        --------------------------------------------------*/

        "Max_Fury": new StatsNode("Max_Fury", (parent_val: (parent_node: DiabloNode) => any) => { // Created This node for Resource Generation based on % Maximum Resource
            return 100 + parent_val(nodes_map["stat"]["Max_Fury"]);
        }),

        "Delta_Resources": new StatsNode("Delta_Resources", (parent_val: (parent_node: DiabloNode) => any) => {
            let delta_fury_skill = parent_val(nodes_map["current_skill"])["base_resources_generated"];

            // (Talent) Endless Fury: Basic Skills generate x5% (max 3 points) more Fury when using Two-Handed Weapons
            if ((parent_val(nodes_map["current_skill"])["category"] == "Basic") && (parent_val(nodes_map["talent"]["Endless Fury"]) > 0) && (parent_val(nodes_map["stat"]["Weapon_Type"]) == 1 || parent_val(nodes_map["stat"]["Weapon_Type"]) == 2)) {
                delta_fury_skill *= 1 + 0.05 * parent_val(nodes_map["talent"]["Endless Fury"]);
            }

            const fury_gain = (Math.max(delta_fury_skill, 0) + parent_val(nodes_map["stat"]["Fury_Gain_Per_Hit"])) * parent_val(nodes_map["stat"]["Total_Resource_Generation_Multiplier"])
            
            var Unbridled_Rage_Cost_Multiplier = 1; //Unbridled Rage (Talent 1 point): Core Skills deal x135% increased damage, but cost x100 more Fury
            if (parent_val(nodes_map["talent"]["Unbridled Rage"]) == 1) {
                Unbridled_Rage_Cost_Multiplier *= 2;
            }

            const fury_cost = Math.min(delta_fury_skill * Unbridled_Rage_Cost_Multiplier, 0) * 
                       (1 - (parent_val(nodes_map["modifier"]["Resource_Cost_Reduction_Percent"]) + // Fury Specific Resource Cost Reduction
                        parent_val(nodes_map["modifier"]["Resource_Cost_Reduction_Percent_All"]) // Generic Resource Cost Reduction
                       ));
            return fury_gain + fury_cost;
        }),

        "Total_Resource_Generation_Multiplier": new StatsNode("Total_Resource_Generation_Multiplier", (parent_val: (parent_node: DiabloNode) => any) => {
            const Willpower_Bonus = 0.10 * parent_val(nodes_map["stat"]["Total_Willpower"]);
            
            var Aspect_of_the_Relentless_Armsmaster = 0; // Aspect of the Relentless Armsmaster: Gain x{20/36}% increased Fury Generation while all damage bonuses from the Walking Arsenal Key Passive are active.
            if (parent_val(nodes_map["toggle"]["Walking_Arsenal"]) && parent_val(nodes_map["talent"]["Walking Arsenal"]) != 0 && parent_val(nodes_map["aspect"]["Aspect of the Relentless Armsmaster"]).length != 0) {
                Aspect_of_the_Relentless_Armsmaster += parent_val(nodes_map["aspect"]["Aspect of the Relentless Armsmaster"])[0];}
            
            var Rallying_Cry_Bonus = 0; // Rallying Cry: Increases Movement speed by +30% and Resource Generation by x50% for 6 seconds
            if (parent_val(nodes_map["toggle"]["Rallying Cry"]) == 1) {
                Rallying_Cry_Bonus += 0.50;

                // Tactical Rallying Cry: Rallying Cry Generates 25 Fury and grants you an additional x50% Resource Generation
                if (parent_val(nodes_map["talent"]["Tactical Rallying Cry"]) == 1) {
                    Rallying_Cry_Bonus += 0.50;
                }
            }

            var Prolific_Fury = 0; // Prolific Fury (up to 3 Points): While Berserking, fury generation is increased by 6%
            if (parent_val(nodes_map["toggle"]["Berserking"])) {
                Prolific_Fury += 0.06 * parent_val(nodes_map["talent"]["Prolific_Fury"]);
            }

            return 1 + Willpower_Bonus + 
                   Aspect_of_the_Relentless_Armsmaster +
                   Rallying_Cry_Bonus +
                   Prolific_Fury + 
                   parent_val(nodes_map["modifier"]["Resource_Gain_Bonus_Percent_All_Primary"]) + 
                   parent_val(nodes_map["modifier"]["Fury_Gain_Bonus_Percent"]);
        }),

        "Fury_Gain_Per_Hit": new StatsNode("Fury_Gain_Per_Hit", (parent_val: (parent_node: DiabloNode) => any) => {
            const Lucky_Hit_Chance = parent_val(nodes_map["current_skill"])["lucky_hit_chance"] + parent_val(nodes_map["stat"]["Total_Lucky_Hit_Chance_Bonus"]);
            const Critical_Chance = parent_val(nodes_map["stat"]["Critical_Chance"]);

            var One_Hand_Sword_Expertise = 0; // 1-H Sword Expertise: Lucky Hit: Up to a 10% chance to gain 5 Fury when hitting a Crowd Controlled enemy. Double this chance when using two Swords.
            if ((parent_val(nodes_map["stat"]["Weapon_Type"]) == 0) && (parent_val(nodes_map["stat"]["Enemy_Crowd_Controlled"]) == 1)) {
                if (parent_val(nodes_map["modifier"]["Main_Hand_Weapon"]) == 0) {
                    One_Hand_Sword_Expertise += 5 * (0.10 + parent_val(nodes_map["stat"]["Total_Lucky_Hit_Chance_Bonus"]));}
                if (parent_val(nodes_map["modifier"]["Off_Hand_Weapon"]) == 0) {
                    One_Hand_Sword_Expertise += 5 * (0.10 + parent_val(nodes_map["stat"]["Total_Lucky_Hit_Chance_Bonus"]));}
            }

            var Two_Hand_Mace_Expertise = 0; //Lucky Hit: Up to a 10% chance to gain 2 Fury when hitting an enemy. The Fury gain is doubled while Berserking.
            if (parent_val(nodes_map["stat"]["Weapon_Type"]) == 2) {
                if (parent_val(nodes_map["toggle"]["Berserking"])) {
                    return 4 * (0.10 + parent_val(nodes_map["stat"]["Total_Lucky_Hit_Chance_Bonus"]));
                }
                return 2 * (0.10 + parent_val(nodes_map["stat"]["Total_Lucky_Hit_Chance_Bonus"]));
            }

            var Talent_Fury_Gain_On_Hit = 0;
            // Battle Bash: Damaging a Stunned enemy with Bash generates an additional 3 Fury, or 4 fury if using a Two-Hand Weapon
            if ((parent_val(nodes_map["current_skill"])["name"] == "Bash") && (parent_val(nodes_map["talent"]["Battle Bash"]) > 0) && (parent_val(nodes_map["toggle"]["Enemy_Stunned"]) == 1)) {
                Talent_Fury_Gain_On_Hit += 3;
                if (parent_val(nodes_map["stat"]["Weapon_Type"]) == 2) {
                    Talent_Fury_Gain_On_Hit += 1;
                }
            }

            // Enhanced Whirlwind: Gain 1 Fury each time whirlwind deals direct damage to an enemy, or 3 fury against elite enemies
            if ((parent_val(nodes_map["current_skill"])["name"] == "Whirlwind") && (parent_val(nodes_map["talent"]["Enhanced Whirlwind"]) > 0)) {
                Talent_Fury_Gain_On_Hit += 1;
                if (parent_val(nodes_map["toggle"]["Enemy_Elite"]) == 1) {
                    Talent_Fury_Gain_On_Hit += 2;
                }
            }

            // Enhanced Double Swing: If Double Swing damages a Stunned or Knocked Down enemy, gain 15 Fury
            if ((parent_val(nodes_map["current_skill"])["name"] == "Double Swing") && (parent_val(nodes_map["talent"]["Enhanced Double Swing"]) > 0))
            {
                if ((parent_val(nodes_map["toggle"]["Enemy_Stunned"]) == 1) || (parent_val(nodes_map["toggle"]["Enemy_Knocked_Down"]) == 1)) {
                    Talent_Fury_Gain_On_Hit += 15;
                }
            }

            // Furious Rend: Direct damage with Rend grants 4 Fury per enemy hit, up to a maximum 20 Fury
            if ((parent_val(nodes_map["current_skill"])["name"] == "Rend") && (parent_val(nodes_map["talent"]["Furious Rend"]) > 0)) {
                Talent_Fury_Gain_On_Hit += 4; // (TO DO) Scale this with the number of enemies
            }

            // Tactical Ground Stomp: Ground Stomp generates 25 Fury
            if ((parent_val(nodes_map["current_skill"])["name"] == "Ground Stomp") && (parent_val(nodes_map["talent"]["Tactical Ground Stomp"]) > 0)) {
                Talent_Fury_Gain_On_Hit += 25;
            }

            // Power Leap: If Leap damages at least one enemy, gain 40 Fury
            if ((parent_val(nodes_map["current_skill"])["name"] == "Leap") && (parent_val(nodes_map["talent"]["Power Leap"]) > 0)) {
                Talent_Fury_Gain_On_Hit += 40;
            }

            var Slaking_Aspect = 0; // Slaking Aspect: Lucky Hit: You have up to a {30/50}% chance to gain 20.0 Fury when Rend deals direct damage to at least one Bleeding enemy.
            if ((parent_val(nodes_map["aspect"]["Slaking Aspect"]).length != 0) && (parent_val(nodes_map["current_skill"])["name"] == "Rend")) {
                Slaking_Aspect += 20 * (parent_val(nodes_map["aspect"]["Slaking Aspect"]) + parent_val(nodes_map["stat"]["Total_Lucky_Hit_Chance_Bonus"]));
            }

            return (parent_val(nodes_map["modifier"]["Proc_Resource_On_Hit_Percent"]) * Lucky_Hit_Chance) + // "Proc_Resource_On_Hit_Percent", // "Chance per Hit to gain +[{VALUE2}*100|1%|] {VALUE1}
                   (parent_val(nodes_map["modifier"]["Resource_On_Crit"]) * Critical_Chance) + // "Resource_On_Crit", // "Grants {VALUE2} {VALUE1} per Critical Strike",
                   (parent_val(nodes_map["modifier"]["Proc_Resource_On_Hit_Percent_All_Primary"]) *.05) +// "Proc_Resource_On_Hit_Percent_All_Primary", // "{c_label}Lucky Hit:{/c} Up to a 5% chance to gain [{VALUE}*100|1%|] Primary Resource",
                    One_Hand_Sword_Expertise +
                    Two_Hand_Mace_Expertise + 
                    Slaking_Aspect + 
                    Talent_Fury_Gain_On_Hit;
                }),

        "Fury_Regeneration_Per_Second": new StatsNode("Fury_Regeneration_Per_Second", (parent_val: (parent_node: DiabloNode) => any) => {
            var Fury_Regeneration_Per_Second = 0;
     
            // Aspect of Echoing Fury: Your Shout Skills generate {2/4} Fury per second while active.
            if (parent_val(nodes_map["aspect"]["Aspect of Echoing Fury"]).length != 0) {
                if (parent_val(nodes_map["toggle"]["Rallying Cry"]) || parent_val(nodes_map["toggle"]["Challenging Shout"]) || parent_val(nodes_map["toggle"]["War Cry"])) {
                    Fury_Regeneration_Per_Second += parent_val(nodes_map["aspect"]["Aspect of Echoing Fury"])[0];
                }
            }

            //Aspect of Assimilation: You have 8% increased Dodge Chance versus enemies affected by Damage Over Time effects. When you Dodge, you gain [5 - 10] of your Primary Resource.
            if ((parent_val(nodes_map["aspect"]["Aspect of Assimilation"]).length != 0) && (parent_val(nodes_map["toggle"]["Enemy_Affected_By_Dot"]) == 1)) {
                const Enemy_Attack_Speed = 1.0;
                Fury_Regeneration_Per_Second += Enemy_Attack_Speed * parent_val(nodes_map["aspect"]["Aspect of Assimilation"])[0] * parent_val(nodes_map["stat"]["Total_Dodge_Chance"]);
            }

            return Fury_Regeneration_Per_Second;
        }),

        "Total_Lucky_Hit_Chance_Bonus": new StatsNode("Total_Lucky_Hit_Chance_Bonus", (parent_val: (parent_node: DiabloNode) => any) => {
            var Polearm_Expertise_Lucky_Hit_Bonus = 0;
            if ((parent_val(nodes_map["stat"]["Weapon_Type"]) == 1) && (parent_val(nodes_map["modifier"]["Two_Hand_Slashing_Weapon"]) == 2)) {
                Polearm_Expertise_Lucky_Hit_Bonus += 0.10;
            }

            var Luckbringer_Aspect = 0; // Luckbringer Aspect: Gain x{12/20}% increased Lucky Hit Chance while all damage bonuses from the Walking Arsenal Key Passive are active.
            if ((parent_val(nodes_map["toggle"]["Walking_Arsenal"])) && (parent_val(nodes_map["aspect"]["Luckbringer Aspect"]).length != 0)) {
                Luckbringer_Aspect += parent_val(nodes_map["aspect"]["Luckbringer Aspect"])[0];
            }

            return parent_val(nodes_map["modifier"]["Lucky_Hit_Chance_Bonus"]) +
                   Polearm_Expertise_Lucky_Hit_Bonus +
                   Luckbringer_Aspect;
        }),

        "Cooldown": new StatsNode("Cooldown", (parent_val: (parent_node: DiabloNode) => any) => {
            return parent_val(nodes_map["current_skill"])["cooldown_seconds"];
        }),


        "Total_Movement_Speed": new StatsNode("Total_Movement_Speed", (parent_val: (parent_node: DiabloNode) => any) => {
            var Total_Movement_Speed = 100 + parent_val(nodes_map["modifier"]["Movement_Bonus_Run_Speed"]);

            //"Wind Striker Aspect": FloatRandomRangeWithInterval(8, 8, 16) "Critical Strikes grant {c_random}[Affix_Value_1|1%|]{/c} Movement Speed for 1 second {c_number}[Affix.\"Static Value 0\"]{/c} up to 6 seconds. The duration can be extended.",
            if (parent_val(nodes_map["aspect"]["Wind Strike Aspect"]).length != 0) {
                const Critical_Chance = parent_val(nodes_map["stat"]["Critical_Chance"]);
                const Total_Attack_Speed = parent_val(nodes_map["stat"]["Total_Attack_Speed"]);
                const Wind_Striker_Uptime = Total_Attack_Speed * Critical_Chance;

                Total_Movement_Speed += Wind_Striker_Uptime * parent_val(nodes_map["aspect"]["Wind Strike Aspect"])[0];
            }

            // Rallying Cry: Increases Movement speed by +30% and Resource Generation by x50% for 6 seconds
            if (parent_val(nodes_map["toggle"]["Rallying Cry"]) == 1) {
                Total_Movement_Speed += 30;
            }

            return Total_Movement_Speed;
        }),
        /*
        "100_Fury_Generation_Time": new StatsNode("100_Fury_Generation_Time", (parent_val: (parent_node: DiabloNode) => any) => {
            const Total_Attack_Speed = parent_val(nodes_map["stat"]["Total_Attack_Speed"]);
            const Fury_Gain_Per_Hit = parent_val(nodes_map["stat"]["Fury_Gain_Per_Hit"]);
            const Fury_Regeneration_Per_Second = parent_val(nodes_map["stat"]["Fury_Regeneration_Per_Second"]);
            const Total_Resource_Generation_Multiplier = parent_val(nodes_map["stat"]["Total_Resource_Generation_Multiplier"]);
            const Basic_Skill_Generation = 9;
            const Core_Skill_Cost = 35;
            const Basic_Core_Ratio = Total_Attack_Speed * Fury_Gain_Per_Hit + Fury_Regeneration_Per_Second
            
            return 1;
        }),
        */

    };
}

// For Barbarians, triggers report damage with all 3 weapon types and core/basic skills. Triggers do not account for 
// skill modifiers, instead they are applied afterwards with the skill.
export function CreateBarbarianTriggerNodes (nodes_map: NodesMap): { [key: string]:  TriggerNode } { 
    return {
        "Bleed": new TriggerNode("Bleed", (parent_val: (parent_node: DiabloNode) => any) => {
            
            // Primary Components
            const Weapon_Damage = parent_val(nodes_map["stat"]["Total_Weapon_Damage"]);
            const Skill_DoT_Modifier = parent_val(nodes_map["current_skill"])["modifiers"]["dot"];
            const Damage_Multiplier =  parent_val(nodes_map["stat"]["Damage_Multiplier"]);
            const Vulnerable_Multiplier = parent_val(nodes_map["stat"]["Vulnerable_Multiplier"]) * Number(parent_val(nodes_map["toggle"]["Enemy_Vulnerable"]));
            const Berserking_Multiplier = parent_val(nodes_map["stat"]["Berserking_Multiplier"]) * Number(parent_val(nodes_map["toggle"]["Berserking"]));
            const Overpower_Chance = parent_val(nodes_map["stat"]["Overpower_Chance"]);
            const Overpower_Damage = parent_val(nodes_map["stat"]["Overpower_Damage"]);
            const Weapon_Expertise_Damage_Multiplier = parent_val(nodes_map["stat"]["Weapon_Expertise_Multiplier"]);
            const Talent_Damage_Multiplier = parent_val(nodes_map["stat"]["Talent_Multiplier"]);
            const Aspect_Damage_Multiplier = parent_val(nodes_map["stat"]["Aspect_Multiplier"]);
            const Weapon_Type = parent_val(nodes_map["stat"]["Weapon_Type"])

            // Secondary Components
            const Battle_Flay = 1 + (parent_val(nodes_map["toggle"]["Battle Flay"]) * 0.1); // Battle Flay: When Flay deals direct damage to an enemy, they take x10% increased Bleeding damage from you for the next 3 seconds.

            var Added_Flat_Bleed_Damage = 0;
            // Battle Lunging Strike: Lunging Strike also inflicts 20% Bleeding Damage over 5 seconds
            if ((parent_val(nodes_map["talent"]["Battle Lunging Strike"]) > 0 ) && (parent_val(nodes_map["current_skill"])["name"] == "Lunging Strike")) {
                Added_Flat_Bleed_Damage += Weapon_Damage * 0.20;
            }

            // Furious Whirlwind: While using a Slashing Weapon, Whirlwind also inflicts 20% of its Base Damage as Bleeding Damage over 5 Seconds
            if ((parent_val(nodes_map["talent"]["Furious Whirlwind"]) > 0 ) && (parent_val(nodes_map["current_skill"])["name"] == "Whirlwind")) {
                if (Weapon_Type == 1) {
                    Added_Flat_Bleed_Damage += Weapon_Damage * 0.20;
                } else if (Weapon_Type == 0) {
                    if ([0, 1].includes(parent_val(nodes_map["modifier"]["Main_Hand_Weapon"]))) {
                        Added_Flat_Bleed_Damage += Weapon_Damage * 0.10;
                    }
                    if ([0, 1].includes(parent_val(nodes_map["modifier"]["Off_Hand_Weapon"]))) {
                        Added_Flat_Bleed_Damage += Weapon_Damage * 0.10;
                    }
                }
            }

            // Two-Hand Sword Expertise: 20% of direct damage you deal is inflicted as Bleeding damage over 5 seconds.
            if ((Weapon_Type == 1) && (parent_val(nodes_map["modifier"]["Two_Hand_Slashing_Weapon"]) == 0)) {
                Added_Flat_Bleed_Damage += 0.20 * parent_val(nodes_map["stat"]["Flat_Damage"]);}

            var Two_Hand_Sword_Expertise_Multiplier = 1; // Two-Hand Sword Expertise: You deal 30% increased Bleeding damage for 5 seconds after killing an enemy.
            if ((Weapon_Type == 1) && (parent_val(nodes_map["modifier"]["Two_Hand_Slashing_Weapon"]) == 0) && parent_val(nodes_map["toggle"]["Killed_Enemy_Recently"])) {
                Two_Hand_Sword_Expertise_Multiplier += 0.30;}

            // Aspect of Berserk Ripping: Whenever you deal direct damage while Berserking, inflict {22/40}% of the Base damage dealt as additional Bleeding damage over 5.0 seconds.
            if ((parent_val(nodes_map["aspect"]["Aspect of Berserk Ripping"]).length != 0) && parent_val(nodes_map["toggle"]["Berserking"])) {
                Added_Flat_Bleed_Damage +=  parent_val(nodes_map["aspect"]["Aspect of Berserk Ripping"])[0] * parent_val(nodes_map["trigger"]["Flat_Damage"]);
            }

            var Earthstriker_Aspect_Overpower = 0; // Earthstriker's Aspect: After swapping weapons 10.0 times, your next attack will Overpower and deal x{30/50}% increased Overpower damage
            if (parent_val(nodes_map["aspect"]["Earthstriker's Aspect"]).length != 0 && parent_val(nodes_map["toggle"]["Walking_Arsenal"])) {
                Earthstriker_Aspect_Overpower += (1 / 10) * (Overpower_Damage * (1 + parent_val(nodes_map["aspect"]["Earthstriker's Aspect"])[0]) - (Overpower_Chance * Overpower_Damage));
            }

            var Fields_of_Crimson_Damage = 0; // (Unique) Fields of Crimson: While using this weapon, damaging at least one enemy with Rupture creates a blood pool that inflicts {90/170} Bleeding damage over 6.0 seconds. Enemies standing in the pool take x10% increased Bleeding damage.
            var Fields_of_Crimson_Multiplier = 1;
            if (parent_val(nodes_map["aspect"]["Fields of Crimson"]).length != 0) { // NEED TO INCLUDE A CHECK FOR WHETHER RUPTURE IS ALLOCATED
                const Rupture_Cooldown = parent_val(nodes_map["skill"]["Rupture"])["cooldown_seconds"];
                Fields_of_Crimson_Multiplier += 0.10 * (6 / (Rupture_Cooldown + 1)); // The +1 is just to account for Player Suboptimal Play and Enemy Movement
                if (parent_val(nodes_map["current_skill"])["name"] == "Rupture") {
                    Fields_of_Crimson_Damage += parent_val(nodes_map["aspect"]["Fields of Crimson"])[0];
                }
            }

            // Cut to the Bone (Talent up to 3 points): Your Bleeding effects deal x6% increased damage to Vulnerable enemies
            var Cut_to_the_Bone_Multiplier = 1 + 0.06 * parent_val(nodes_map["talent"]["Cut to the Bone"]) * Number(parent_val(nodes_map["toggle"]["Enemy_Vulnerable"]));

            // Gushing Wounds (Talent): When causing an enemy to bleed, you have a chance equal to your Critical Strike Chance to increase the Bleed amount by 100% of your Critical Strike Damage Bonus.
                                               //                        ..also Overpowering a Bleeding Enemy creates an explosion that inflicts 11% Bleeding Damage over 5 seconds.
            var Gushing_Wounds_Multiplier = 1 + parent_val(nodes_map["stat"]["Critical_Chance"]) * parent_val(nodes_map["stat"]["Critical_Multiplier"]) * parent_val(nodes_map["talent"]["Gushing Wounds"]);

            return  ((Skill_DoT_Modifier * // DoT Skill Modifier
                    (Weapon_Damage + (Overpower_Chance * Overpower_Damage) + Earthstriker_Aspect_Overpower) *  // Need to Take another check at this) *  // Overpower is Additive to Weapon Damage
                    (Damage_Multiplier + parent_val(nodes_map["modifier"]["Damage_Percent_Bonus_Physical_Damage_Over_Time"]))) +
                    (Fields_of_Crimson_Damage + Added_Flat_Bleed_Damage)) *
                    Fields_of_Crimson_Multiplier * 
                    Battle_Flay * 
                    Vulnerable_Multiplier *
                    Berserking_Multiplier *
                    Weapon_Expertise_Damage_Multiplier * // Total Multiplier for Weapon Expertise
                    Two_Hand_Sword_Expertise_Multiplier * 
                    Talent_Damage_Multiplier *
                    Aspect_Damage_Multiplier *
                    Cut_to_the_Bone_Multiplier *
                    Gushing_Wounds_Multiplier;
        }),

        "Flat_Damage": new TriggerNode("Flat_Damage", (parent_val: (parent_node: DiabloNode) => any) => {

            // Primary Components
            const Weapon_Damage = parent_val(nodes_map["stat"]["Total_Weapon_Damage"]);
            const Flat_Damage_Bonus = parent_val(nodes_map["stat"]["Flat_Damage_Bonus"]);
            const Skill_Flat_Modifier = parent_val(nodes_map["current_skill"])["modifiers"]["flat"];
            const Damage_Multiplier =  parent_val(nodes_map["stat"]["Damage_Multiplier"]); 
            const Critical_Chance = parent_val(nodes_map["stat"]["Critical_Chance"]);
            const Critical_Multiplier = parent_val(nodes_map["stat"]["Critical_Multiplier"]);
            const Vulnerable_Multiplier = 1 + parent_val(nodes_map["stat"]["Vulnerable_Multiplier"]) * Number(parent_val(nodes_map["toggle"]["Enemy_Vulnerable"]));;
            const Berserking_Multiplier = 1 + parent_val(nodes_map["stat"]["Berserking_Multiplier"]) * Number(parent_val(nodes_map["toggle"]["Berserking"]));
            const Overpower_Chance = parent_val(nodes_map["stat"]["Overpower_Chance"]);
            const Overpower_Damage = parent_val(nodes_map["stat"]["Overpower_Damage"]);
            const Weapon_Expertise_Damage_Multiplier = parent_val(nodes_map["stat"]["Weapon_Expertise_Multiplier"]);
            const Talent_Damage_Multiplier = parent_val(nodes_map["stat"]["Talent_Multiplier"]);
            const Aspect_Damage_Multiplier = parent_val(nodes_map["stat"]["Aspect_Multiplier"]);

            // Earthstriker's Aspect: After swapping weapons 10.0 times, your next attack will Overpower and deal x{30/50}% increased Overpower damage
            var Earthstriker_Aspect_Overpower = 0;          
            if (parent_val(nodes_map["aspect"]["Earthstriker's Aspect"]).length != 0 && parent_val(nodes_map["toggle"]["Walking_Arsenal"])) {
                Earthstriker_Aspect_Overpower += (1 / 10) * (Overpower_Damage * (1 + parent_val(nodes_map["aspect"]["Earthstriker's Aspect"])[0]) - (Overpower_Chance * Overpower_Damage));
            }

            const Flat_Damage_Total = ((Skill_Flat_Modifier * // Flat Skill Modifier
                                 (Weapon_Damage + Overpower_Chance * Overpower_Damage + Earthstriker_Aspect_Overpower) *  // Need to Take another check at this
                                  Damage_Multiplier *  (1 + Critical_Chance * Critical_Multiplier)
                                 ) + Flat_Damage_Bonus) * // Flat Damage Added After all Multipliers
                                 Weapon_Expertise_Damage_Multiplier * // Total Multiplier for Weapon Expertise
                                 Vulnerable_Multiplier *
                                 Berserking_Multiplier *
                                 Talent_Damage_Multiplier *
                                 Aspect_Damage_Multiplier;

            return Flat_Damage_Total;
        }),

        // There are Non-Bleed Physical Damage over Time
        "Physical_Damage_Over_Time": new TriggerNode("Physical_Damage_Over_Time", (parent_val: (parent_node: DiabloNode) => any) => {
            
            var Physical_Damage_Over_Time = 0; 

            // Primary Components
            const Vulnerable_Multiplier = 1 + parent_val(nodes_map["stat"]["Vulnerable_Multiplier"]) * parent_val(nodes_map["toggle"]["Enemy_Vulnerable"]);;
            const Berserking_Multiplier = 1 + parent_val(nodes_map["stat"]["Berserking_Multiplier"]) * parent_val(nodes_map["toggle"]["Berserking"]);
            // const Weapon_Expertise_Damage_Multiplier = parent_val(nodes_map["stat"]["Weapon_Expertise_Multiplier"]);
            
            var Physical_Damage_Over_Time = 0; 

            // Aspect of Bul-Kathos: Leap creates an Earthquake that deals {195/380} Physical damage over 4 seconds. While standing in Earthquakes, you gain {5/15}% increased Damage Reduction.
            if ((parent_val(nodes_map["current_skill"])["name"] == "Leap") && (parent_val(nodes_map["aspect"]["Aspect of Bul-Kathos"]).length != 0)) {
                Physical_Damage_Over_Time += parent_val(nodes_map["aspect"]["Aspect of Bul-Kathos"])[0];
            }
            
            // Earthquake Aspect: Ground Stomp creates an Earthquake damaging enemies for {195/380} Physical damage over 4 seconds. While standing in Earthquakes, you deal x{5/15}% increased damage.
            if ((parent_val(nodes_map["current_skill"])["name"] == "Ground Stomp") && (parent_val(nodes_map["aspect"]["Earthquake Aspect"]).length != 0)) {
                Physical_Damage_Over_Time += parent_val(nodes_map["aspect"]["Earthquake Aspect"])[0];
            }

            return  (parent_val(nodes_map["modifier"]["Damage_Percent_Bonus_Physical_Damage_Over_Time"])) *
                    Vulnerable_Multiplier *
                    Berserking_Multiplier; 
                    // * Weapon_Expertise_Damage_Multiplier; // Total Multiplier for Weapon Expertise
        }),

        "Non_Physical_Damage_Over_Time": new TriggerNode("Non_Physical_Damage_Over_Time", (parent_val: (parent_node: DiabloNode) => any) => {
            // Primary Components
            const Vulnerable_Multiplier = 1 + parent_val(nodes_map["stat"]["Vulnerable_Multiplier"]) * parent_val(nodes_map["toggle"]["Enemy_Vulnerable"]);
            const Berserking_Multiplier = 1 + parent_val(nodes_map["stat"]["Berserking_Multiplier"]) * parent_val(nodes_map["toggle"]["Berserking"]);
            // const Weapon_Expertise_Damage_Multiplier = parent_val(nodes_map["stat"]["Weapon_Expertise_Multiplier"]);
            // const Total_Attack_Speed = parent_val(nodes_map["stat"]["Total_Attack_Speed"]);
            const Dust_Devil_Hits_Per_Second = 0.25;

            var Non_Physical_Damage_Over_Time = 0; 

            // (TODO) Consider if this should find another route to DPS, it doesn't depend on the skill.
            // Aspect of Burning Rage: While Berserking, you deal {40/70} Fire damage every second to surrounding enemies.
            if (parent_val(nodes_map["aspect"]["Aspect of Burning Rage"]).length != 0) {
                Non_Physical_Damage_Over_Time += parent_val(nodes_map["aspect"]["Aspect of Burning Rage"])[1] / parent_val(nodes_map["stat"]["Total_Attack_Speed"]);
            }

            // Devilish Aspect: After generating 100.0 Fury your next Core Skill creates a Dust Devil that deals {100/180} damage to enemies behind the target.
            if (parent_val(nodes_map["aspect"]["Devilish Aspect"]).length != 0) {
                Non_Physical_Damage_Over_Time += Math.max(parent_val(["stat"]["Delta_Resources"]), 0) / 100 * parent_val(nodes_map["aspect"]["Devilish Aspect"])[0];
            }
            
            // Dust Devil's Aspect: Whirlwind leaves behind Dust Devils that deal {80/125} damage to surrounding enemies.
            if ((parent_val(nodes_map["aspect"]["Dust Devil's Aspect"]).length != 0) && (parent_val(nodes_map["current_skill"])["name"] == "Whirlwind")) {
                Non_Physical_Damage_Over_Time += Dust_Devil_Hits_Per_Second * parent_val(nodes_map["aspect"]["Dust Devil's Aspect"])[0];
            }
            
            // (Unique) Hellhammer: Upheaval ignites the ground Burning enemies for an additional {175/250} damage over 3.0 seconds.
            if ((parent_val(nodes_map["aspect"]["Hellhammer"]).length != 0) && (parent_val(nodes_map["current_skill"])["name"] == "Upheaval")) {
                Non_Physical_Damage_Over_Time += parent_val(nodes_map["aspect"]["Hellhammer"])[0];
            }

            // Windlasher Aspect: Casting Double Swing twice within 1.5 seconds creates a Dust Devil that deals {80/125} damage to enemies behind the target.
            if ((parent_val(nodes_map["aspect"]["Windlasher Aspect"]).length != 0) && (parent_val(nodes_map["current_skill"])["name"] == "Double Swing")) {
                Non_Physical_Damage_Over_Time += 0.5 * Dust_Devil_Hits_Per_Second * parent_val(nodes_map["aspect"]["Windlasher Aspect"])[0];
            }

            return  Non_Physical_Damage_Over_Time *
                    Vulnerable_Multiplier *
                    Berserking_Multiplier; 
                    // * Weapon_Expertise_Damage_Multiplier; // Total Multiplier for Weapon Expertise
        }),

        "Total_Damage_Over_Time": new TriggerNode("Total_Damage_Over_Time", (parent_val: (parent_node: DiabloNode) => any) => {  
            const bleed_damage = parent_val(nodes_map["trigger"]["Bleed"]);
            const other_physical_dot = parent_val(nodes_map["trigger"]["Physical_Damage_Over_Time"]);
            const non_physical_dot = parent_val(nodes_map["trigger"]["Non_Physical_Damage_Over_Time"]);

            return bleed_damage + other_physical_dot + non_physical_dot;
        })
    };
}