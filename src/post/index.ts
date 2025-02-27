import {
  cliExecute,
  equip,
  itemAmount,
  mallPrice,
  myAdventures,
  myLevel,
  myLocation,
  putCloset,
  reverseNumberology,
  use,
  useSkill,
} from "kolmafia";
import {
  $effect,
  $familiar,
  $item,
  $items,
  $location,
  $skill,
  $slot,
  AutumnAton,
  FloristFriar,
  get,
  getRemainingStomach,
  have,
  JuneCleaver,
  uneffect,
  withProperty,
} from "libram";
import { acquire } from "../acquire";
import bestAutumnatonLocation from "./autumnaton";
import { garboAdventure, Macro } from "../combat";
import { globalOptions } from "../config";
import { computeDiet, consumeDiet } from "../diet";
import {
  bestJuneCleaverOption,
  juneCleaverChoiceValues,
  safeInterrupt,
  safeRestore,
  setChoice,
  valueJuneCleaverOption,
} from "../lib";
import { teleportEffects } from "../mood";
import { garboAverageValue, garboValue, sessionSinceStart } from "../session";
import { estimatedGarboTurns, remainingUserTurns } from "../turns";
import handleWorkshed from "./workshed";

function closetStuff(): void {
  for (const i of $items`bowling ball, funky junk key`) putCloset(itemAmount(i), i);
}

function floristFriars(): void {
  if (!FloristFriar.have() || myLocation() !== $location`Barf Mountain` || FloristFriar.isFull()) {
    return;
  }
  [FloristFriar.StealingMagnolia, FloristFriar.AloeGuvnor, FloristFriar.PitcherPlant].forEach(
    (flower) => flower.plant()
  );
}

function fillPantsgivingFullness(): void {
  if (
    getRemainingStomach() > 0 &&
    (!globalOptions.prefs.yachtzeechain || get("_garboYachtzeeChainCompleted", false))
  ) {
    consumeDiet(computeDiet().pantsgiving(), "PANTSGIVING");
  }
}

function fillSweatyLiver(): void {
  if (globalOptions.prefs.yachtzeechain && !get("_garboYachtzeeChainCompleted", false)) return;

  const castsWanted = 3 - get("_sweatOutSomeBoozeUsed");
  if (castsWanted <= 0 || !have($item`designer sweatpants`)) return;

  const sweatNeeded = 25 * castsWanted;
  if (get("sweat") >= sweatNeeded) {
    while (get("_sweatOutSomeBoozeUsed") < 3) {
      useSkill($skill`Sweat Out Some Booze`);
    }
    consumeDiet(computeDiet().sweatpants(), "SWEATPANTS");
  }
}

function numberology(): void {
  if (
    myAdventures() > 0 &&
    Object.keys(reverseNumberology()).includes("69") &&
    get("_universeCalculated") < get("skillLevel144")
  ) {
    cliExecute("numberology 69");
  }
}

function updateMallPrices(): void {
  sessionSinceStart().value(garboValue);
}

let juneCleaverSkipChoices: (typeof JuneCleaver.choices)[number][] | null;
function skipJuneCleaverChoices(): void {
  if (!juneCleaverSkipChoices) {
    juneCleaverSkipChoices = [...JuneCleaver.choices]
      .sort(
        (a, b) =>
          valueJuneCleaverOption(juneCleaverChoiceValues[a][bestJuneCleaverOption(a)]) -
          valueJuneCleaverOption(juneCleaverChoiceValues[b][bestJuneCleaverOption(b)])
      )
      .splice(0, 3);
  }

  if (JuneCleaver.skipsRemaining() > 0) {
    for (const choice of juneCleaverSkipChoices) {
      setChoice(choice, 4);
    }
  } else {
    for (const choice of juneCleaverSkipChoices) {
      setChoice(choice, bestJuneCleaverOption(choice));
    }
  }
}
function juneCleave(): void {
  if (get("_juneCleaverFightsLeft") <= 0 && teleportEffects.every((e) => !have(e))) {
    equip($slot`weapon`, $item`June cleaver`);
    skipJuneCleaverChoices();
    withProperty("recoveryScript", "", () => {
      garboAdventure($location`Noob Cave`, Macro.abort());
      if (["Poetic Justice", "Lost and Found"].includes(get("lastEncounter"))) {
        uneffect($effect`Beaten Up`);
      }
    });
  }
}

function stillsuit() {
  if (itemAmount($item`tiny stillsuit`)) {
    const familiarTarget = $familiar`Blood-Faced Volleyball`;
    if (have(familiarTarget)) equip(familiarTarget, $item`tiny stillsuit`);
  }
}

let funguyWorthIt = true;
function funguySpores() {
  // Mush-Mouth will drop an expensive mushroom if you do a combat with one turn of it left
  if (
    myLevel() >= 15 && // It applies -100 to all stats, and Level 15 seems to be a reasonable place where you will survive -100 to all stats
    !have($effect`Mush-Mouth`) &&
    (!globalOptions.ascend || myAdventures() > 11) &&
    get("dinseyRollercoasterNext") && // If it were to expire on a rails adventure, you'd waste the cost of the spore. Using it when next turn is rails is easiest way to make sure it won't
    funguyWorthIt
  ) {
    // According to wiki, it has a 75% chance of being a stat mushroom and 25% chance of being another mushroom
    const value =
      0.75 *
        garboAverageValue(
          ...$items`Boletus Broletus mushroom, Omphalotus Omphaloskepsis mushroom, Gyromitra Dynomita mushroom`
        ) +
      0.25 *
        garboAverageValue(
          ...$items`Helvella Haemophilia mushroom, Stemonitis Staticus mushroom, Tremella Tarantella mushroom`
        );
    if (
      mallPrice($item`Fun-Guy spore`) < value &&
      acquire(1, $item`Fun-Guy spore`, value, false) > 0
    ) {
      use($item`Fun-Guy spore`);
    } else funguyWorthIt = false;
  }
}

export default function postCombatActions(skipDiet = false): void {
  closetStuff();
  juneCleave();
  numberology();
  if (!skipDiet && !globalOptions.nodiet) {
    fillPantsgivingFullness();
    fillSweatyLiver();
  }
  floristFriars();
  handleWorkshed();
  safeInterrupt();
  safeRestore();
  updateMallPrices();
  stillsuit();
  funguySpores();
  if (
    globalOptions.ascend ||
    AutumnAton.turnsForQuest() < estimatedGarboTurns() + remainingUserTurns()
  ) {
    AutumnAton.sendTo(bestAutumnatonLocation);
  }
}
