# Graph Based Calculator

Contains libraries for creating characters and computing damage output. The files can roughly be divided as follows:

- Files which define parts of the computation graph.
- Files which define the `PlayerCharacter` input and `PlayerCalculations` output API.
- Files which define DPS simulations on top of the computation graph results.
- Files which include test cases.

## Structure

### Computational Graph (`computation_graph.ts`)
  
The core functionality of the calculator runs by calculating values on a directed computational graph. The graph is comprised of **Nodes** and each Node has a unique value. The value depends on the type of node and can itself be a object with many fields. Each class has a completely separate graph but many of the root nodes have the same definitions. The nodes which depend on other nodes are called **ComputeNodes** and most of the code is dedicated to defining how to compute the value of these nodes using other nodes.

- `computation_graph.ts` - Defines all the types of nodes in the computation graph.
- `all_class_graph.ts` - Defines computation graph nodes which are shared across all classes. These are all Root nodes.
- `barbarian_graph.ts` - Defines Barbarian specific graph nodes.
- `druid_graph.ts` - Defines Druid specific graph nodes.
- `necromancer_graph.ts` - Defines Necromancer specific graph nodes.
- `rogue_graph.ts` - Defines Barbarian specific graph nodes.
- `sorcerer_graph.ts` - Defines Sorcerer specific graph nodes.

### Running Calculations (`run_calculation.ts`)

The API to the calculator. Uses the input `PlayerCharacter` to set the root nodes and runs the Computational graph to compute the `SkillReturn` for each skill. The SkillReturns are used to run a simulation which weaves the skills in a rotation to compute the aggregate DPS metrics.

- `player_character.ts` - Definition for the `PlayerCharacter` API which is the input for `RunCalculations`.
- `run_calculation.ts` - Contains the `RunCalculations` function which is the API to the calculator and the definition of `PlayerCalculations` which is the return value of the calculator.
- `run_calculation_helpers.ts` - Certain skills will trigger a different skill on cast, whose damage should be attibuted to the original skill. This library contains functions which help find the damage associated with such skills.
- `class_based_sims.ts` - Contains functions to run Pre-Sims which run a simulation to estimate aggregate metrics which are then fed into the final simulation. Different metrics are measured for each class.
- `calculation_helpers.ts` - Generic helper functions for geometry and probabilities. Mainly used for AOE calculations.

### Test Characters

The `test_characters` directory containing a variety of test cases. Currently these are only being run locally using `pnpm run dev`.
