/**
 * The values the analysis form offers, as the AI insights may suggest them.
 *
 * Gemini is asked for structured output whose enums are these lists, so every suggestion
 * it makes is one the form can take as-is. They mirror the app's
 * components/shared/common/Formfieldsconfig.tsx, lib/clarity.ts and lib/treatments.ts —
 * a value added there and not here simply never gets suggested.
 */

export const AI_SHAPES = [
  "Round", "Oval", "Rectangle", "Square", "Triangle", "Hexagon", "Pentagon",
  "Rectangular octagon", "Square octagon", "Rectangular cushion", "Square cushion",
  "Pear", "Heart", "Drop", "Briolette", "Ball", "Maquise (Navette)", "Baguette",
  "Tapered baguette", "Lozenge", "Trillion", "Trapeze", "Freeform",
]

export const AI_CUTTING_STYLES = [
  "Brilliant cut", "Princess cut", "Step cut", "Asscher cut", "Fancy cut", "Flower cut",
  "Scissor cut", "Rose cut", "Radiant cut", "French cut", "Single cabochon",
  "Double cabochon",
]

export const AI_TRANSPARENCY = ["Transparent", "Translucent", "Opaque"]

export const AI_TONE_SATURATION = ["Low", "Medium", "High"]

export const AI_GRADES = ["Ex", "Fine", "Good", "Fair", "Poor"]

/** The standard clarity scale and the emerald one — the form picks which applies. */
export const AI_CLARITY_STANDARD = ["FL", "LC 1", "LC 2", "EC 1", "EC 2", "VI 1", "VI 2", "HI 1", "HI 2"]
export const AI_CLARITY_EMERALD = ["LC", "EC", "SI", "MI", "HI"]

export const AI_CLARITY_ENHANCEMENT = ["None", "E 1", "E 2", "E 3"]

/** The colour names the form lists, offered to the model as the lab's vocabulary. */
export const AI_STANDARD_COLOURS = [
  "Medium intense red (Hot Pink)", "Intense red", "Vivid red (Pigeon blood red)",
  "Deep red (Royal red)", "Dark red",
  "Light green", "Medium green", "Intense green", "Vivid green", "Vibrant green",
  "Deep green", "Dark green",
  "Light blue", "Intense blue", "Vivid Blue", "Cornflower blue", "Royal blue",
  "Deep blue", "Dark blue",
  "Light", "Intense", "Medium", "Vivid", "Deep", "Dark",
]

export const AI_TREATMENT_KEYS = [
  "heatTreatment", "irradiationTreatment", "hpht", "diffusionTreatment", "dyeing",
  "bleaching", "fractureFillingOil", "fractureFillingResinGlass", "laserDrilling", "hpnt",
  "coating", "assembledStone",
]
