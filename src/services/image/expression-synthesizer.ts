/**
 * 28-Emotion Canonical Palette & Personality-Driven Expression Synthesizer.
 *
 * Implements:
 * 1. Full 28-emotion canonical palette supported by SillyTavern, Lumiverse, RisuAI, and emotion classifiers (Laya, Kev-0.8B).
 * 2. Neutral-anchored reference conditioning: neutral sprite serves as identity reference.
 * 3. Classifier label descriptions: trigger descriptions stored in card extensions.
 * 4. Intensity tiers (e.g. tier 1 subtle vs tier 2 intense).
 * 5. Personality-driven dynamic expression selector: uses psychometrics/personality to pick tailored sets.
 */

import type { RoleplayCharacter } from "../../types/character";

export interface ExpressionDefinition {
  key: string;
  label: string;
  category: "neutral" | "positive" | "negative" | "surprise" | "complex";
  description: string; // Used by downstream local classifiers (Laya/Kev)
  positiveDelta: string;
  negativeDelta: string;
  denoise: number;
  intensityTier?: 1 | 2;
}

export const CANONICAL_28_EXPRESSIONS: Record<string, ExpressionDefinition> = {
  neutral: {
    key: "neutral",
    label: "Neutral / Composed",
    category: "neutral",
    description: "Composed baseline face, calm direct eye contact, relaxed closed lips.",
    positiveDelta: "neutral expression, closed mouth, calm steady gaze, relaxed face",
    negativeDelta: "smiling, grinning, angry, frowning, crying, open mouth, exaggerated emotion",
    denoise: 0.30,
    intensityTier: 1,
  },
  joy: {
    key: "joy",
    label: "Joy / Warm Smile",
    category: "positive",
    description: "Warm genuine smile, soft squinting eyes, joyful relaxed look.",
    positiveDelta: "warm genuine smile, soft squinting joyful eyes, cheerful relaxed face, subtle cheek flush",
    negativeDelta: "frown, sad, angry, tears, scowl, gloomy, grimace",
    denoise: 0.36,
    intensityTier: 1,
  },
  amused: {
    key: "amused",
    label: "Amused / Laughing",
    category: "positive",
    description: "Broad laughing smile, eyes crinkled in amusement, head tilted slightly.",
    positiveDelta: "laughing, big open smile, crinkled amused eyes, head tilted slightly, overjoyed",
    negativeDelta: "serious, deadpan, frown, crying, somber, grimace",
    denoise: 0.40,
    intensityTier: 2,
  },
  smug: {
    key: "smug",
    label: "Smug / Teasing",
    category: "positive",
    description: "Confident smirk, raised single eyebrow, teasing playful glance.",
    positiveDelta: "smug playful smirk, raised single eyebrow, half-closed confident eyes, teasing side glance",
    negativeDelta: "worried, terrified, submissive, weeping, confused",
    denoise: 0.38,
    intensityTier: 1,
  },
  blush: {
    key: "blush",
    label: "Flustered / Blushing",
    category: "positive",
    description: "Rosy cheeks, shy flustered expression, averting gaze in embarrassment.",
    positiveDelta: "flustered blush, heavy rosy cheeks, bashful averting eyes, shy nervous expression, parted lips",
    negativeDelta: "confident, stoic, menacing, emotionless, deadpan",
    denoise: 0.38,
    intensityTier: 1,
  },
  pout: {
    key: "pout",
    label: "Pouting / Sulking",
    category: "negative",
    description: "Puffed cheeks, cute sulking frown, furrowed eyebrows.",
    positiveDelta: "pouting face, puffed cheeks, cute sulking frown, furrowed cute brows, looking slightly aside",
    negativeDelta: "smiling, laughing, cheerful, terrified, crying",
    denoise: 0.38,
    intensityTier: 1,
  },
  winking: {
    key: "winking",
    label: "Winking / Flirtatious",
    category: "positive",
    description: "One eye playfully closed, subtle charming smile.",
    positiveDelta: "winking, one eye playfully closed, charming subtle smirk, flirtatious glance",
    negativeDelta: "both eyes open, angry, crying, serious, dull eyes",
    denoise: 0.38,
    intensityTier: 1,
  },
  seductive: {
    key: "seductive",
    label: "Seductive / Sultry",
    category: "positive",
    description: "Half-lidded bedroom eyes, parted lips, intimate sultry blush.",
    positiveDelta: "half-lidded sultry eyes, bedroom eyes, parted lips, faint alluring blush, intense intimate eye contact",
    negativeDelta: "goofy, childish, angry, panicked, frightened, crying",
    denoise: 0.38,
    intensityTier: 2,
  },
  love: {
    key: "love",
    label: "Enamored / Affectionate",
    category: "positive",
    description: "Gentle loving gaze, glowing soft eyes, warm tender smile.",
    positiveDelta: "gentle loving gaze, tender affectionate smile, glistening warm eyes, soft dreamy expression",
    negativeDelta: "aggressive, disgusted, cold, hostile, mocking",
    denoise: 0.36,
    intensityTier: 1,
  },
  curious: {
    key: "curious",
    label: "Curious / Inquisitive",
    category: "neutral",
    description: "Head tilted inquisitively, one eyebrow arched, attentive focused eyes.",
    positiveDelta: "curious expression, head tilted inquisitively, raised single eyebrow, attentive focused gaze",
    negativeDelta: "bored, asleep, weeping, furious, deadpan",
    denoise: 0.36,
    intensityTier: 1,
  },
  confused: {
    key: "confused",
    label: "Confused / Perplexed",
    category: "surprise",
    description: "Slight squint, furrowed brow, puzzled question mark expression.",
    positiveDelta: "confused expression, furrowed puzzled brow, slightly squinting eyes, head cocked, perplexed face",
    negativeDelta: "confident, knowing, ecstatic, weeping, furious",
    denoise: 0.36,
    intensityTier: 1,
  },
  surprised: {
    key: "surprised",
    label: "Surprised / Startled",
    category: "surprise",
    description: "Wide pupils, raised eyebrows, lips slightly parted in sudden realization.",
    positiveDelta: "surprised, wide open eyes, raised eyebrows, parted gasping lips, sudden startled expression",
    negativeDelta: "calm, asleep, bored, deadpan, scowling",
    denoise: 0.38,
    intensityTier: 1,
  },
  shocked: {
    key: "shocked",
    label: "Shocked / Stunned Disbelief",
    category: "surprise",
    description: "Wide shocked pupils, frozen breath, stunned jaw drop.",
    positiveDelta: "stunned disbelief, wide shocked dilated pupils, frozen breath, completely dumbfounded expression",
    negativeDelta: "smiling, relaxed, sleepy, composed",
    denoise: 0.42,
    intensityTier: 2,
  },
  excited: {
    key: "excited",
    label: "Excited / Thrilled",
    category: "positive",
    description: "Bright sparkling eyes, beaming broad smile, energetic anticipation.",
    positiveDelta: "excited, bright sparkling eyes, beaming radiant smile, flushed cheeks, high energy expression",
    negativeDelta: "tired, depressed, bored, melancholic, deadpan",
    denoise: 0.38,
    intensityTier: 2,
  },
  nervous: {
    key: "nervous",
    label: "Nervous / Awkward",
    category: "negative",
    description: "Uneasy tight smile, sweat drop, guarded glancing eyes.",
    positiveDelta: "nervous tight smile, sweat drop, tense awkward expression, darting eyes, uneasy posture",
    negativeDelta: "confident, regal, relaxed, menacing, serene",
    denoise: 0.38,
    intensityTier: 1,
  },
  fear: {
    key: "fear",
    label: "Fear / Terrified",
    category: "negative",
    description: "Pale complexion, wide terrified eyes, trembling lips.",
    positiveDelta: "terrified, wide fearful eyes, trembling lips, pale complexion, panic expression, tense face",
    negativeDelta: "brave, fearless, smiling, laughing, confident, calm",
    denoise: 0.42,
    intensityTier: 2,
  },
  sad: {
    key: "sad",
    label: "Sad / Melancholic",
    category: "negative",
    description: "Downcast eyes, faint sorrowful frown, subdued melancholy gaze.",
    positiveDelta: "downcast gaze, faint sorrowful frown, melancholic gentle expression, somber subdued face",
    negativeDelta: "smiling, laughing, joyful, furious, arrogant",
    denoise: 0.36,
    intensityTier: 1,
  },
  crying: {
    key: "crying",
    label: "Crying / Tearful",
    category: "negative",
    description: "Glistening wet eyes, tears streaming down cheeks, quivering mouth.",
    positiveDelta: "crying, glistening wet eyes, tears streaming down cheeks, quivering lips, heartbreaking weeping expression",
    negativeDelta: "smiling, laughing, cheerful, dry eyes, calm",
    denoise: 0.42,
    intensityTier: 2,
  },
  grief: {
    key: "grief",
    label: "Grief / Devastated",
    category: "negative",
    description: "Hollow haunted stare, anguish, shattered emotional composure.",
    positiveDelta: "devastated grief, hollow haunted gaze, intense anguish, trembling clenched mouth, shattered composure",
    negativeDelta: "happy, amused, playful, smiling, serene",
    denoise: 0.44,
    intensityTier: 2,
  },
  disappointed: {
    key: "disappointed",
    label: "Disappointed / Let Down",
    category: "negative",
    description: "Subtle downward mouth curl, tired eyes, resigned sigh.",
    positiveDelta: "disappointed expression, heavy eyelids, subtle downward mouth curl, weary resigned gaze",
    negativeDelta: "enthusiastic, joyful, delighted, beaming",
    denoise: 0.36,
    intensityTier: 1,
  },
  angry: {
    key: "angry",
    label: "Angry / Scowling",
    category: "negative",
    description: "Furrowed brow, sharp glare, irritated grimace.",
    positiveDelta: "furrowed brow, sharp intense glare, irritated grimace, tight clenched jaw, angry scowl",
    negativeDelta: "smiling, gentle, blush, crying, timid, serene",
    denoise: 0.38,
    intensityTier: 1,
  },
  furious: {
    key: "furious",
    label: "Furious / Enraged",
    category: "negative",
    description: "Bared teeth, fiery wrathful eyes, veins or intense rage flush.",
    positiveDelta: "furious rage, bared clenched teeth, wrathful burning eyes, fierce menacing grimace, violent anger",
    negativeDelta: "calm, gentle, smiling, peaceful, timid",
    denoise: 0.44,
    intensityTier: 2,
  },
  annoyed: {
    key: "annoyed",
    label: "Annoyed / Irritated",
    category: "negative",
    description: "Twitching brow, dry unamused stare, stern unimpressed face.",
    positiveDelta: "annoyed, dry unamused stare, slight brow twitch, stern unimpressed mouth, irritated side eye",
    negativeDelta: "friendly, thrilled, weeping, panicked",
    denoise: 0.36,
    intensityTier: 1,
  },
  disgust: {
    key: "disgust",
    label: "Disgust / Contempt",
    category: "negative",
    description: "Curled upper lip, disdainful sneer, recoiling gaze.",
    positiveDelta: "disgusted, contemptuous sneer, curled upper lip, disdainful side eye, recoiling with aversion",
    negativeDelta: "friendly, admiring, cheerful, loving, affectionate",
    denoise: 0.38,
    intensityTier: 1,
  },
  bored: {
    key: "bored",
    label: "Bored / Apathetic",
    category: "neutral",
    description: "Deadpan unbothered eyes, flat slack mouth, uninvested posture.",
    positiveDelta: "bored deadpan expression, half-closed unbothered eyes, slack neutral mouth, indifferent flat gaze",
    negativeDelta: "excited, passionate, furious, screaming, smiling",
    denoise: 0.34,
    intensityTier: 1,
  },
  sleepy: {
    key: "sleepy",
    label: "Sleepy / Exhausted",
    category: "neutral",
    description: "Heavy drooping eyelids, yawning mouth, drowsy calm face.",
    positiveDelta: "sleepy, heavy drooping eyelids, drowsy calm face, yawning slightly, relaxed exhausted gaze",
    negativeDelta: "hyperactive, alert, terrified, sharp piercing eyes",
    denoise: 0.36,
    intensityTier: 1,
  },
  relieved: {
    key: "relieved",
    label: "Relieved / Calmed",
    category: "positive",
    description: "Soft exhale, relaxed shoulders, gentle peaceful smile.",
    positiveDelta: "relieved expression, soft relaxed shoulders, gentle peaceful faint smile, tension leaving face",
    negativeDelta: "panicked, terrified, tense, scowling, weeping",
    denoise: 0.34,
    intensityTier: 1,
  },
  guilty: {
    key: "guilty",
    label: "Guilty / Ashamed",
    category: "negative",
    description: "Averting eyes downward, remorseful frown, biting lower lip.",
    positiveDelta: "ashamed guilty look, averting eyes downward, remorseful frown, biting lower lip, penitent face",
    negativeDelta: "proud, arrogant, laughing, brazen, smug",
    denoise: 0.38,
    intensityTier: 1,
  },
};

/**
 * Dynamically curates an optimal expression palette tailored to character psychometrics & archetype.
 */
export function selectPersonalityExpressions(
  character: RoleplayCharacter,
  count: number = 28
): ExpressionDefinition[] {
  const all = Object.values(CANONICAL_28_EXPRESSIONS);
  if (count >= 28) return all;

  const text = `${character.personality || ""} ${character.description || ""} ${(character.tags || []).join(" ")}`.toLowerCase();

  // Scoring weights based on character traits
  const scores = new Map<string, number>();
  all.forEach((exp) => scores.set(exp.key, 10)); // Baseline

  // Always include neutral
  scores.set("neutral", 100);

  // Trait heuristics
  const isStoic = /stoic|calm|composed|cold|unemotional|kuudere|disciplined|warrior|assassin/i.test(text);
  const isTsundere = /tsundere|feisty|hot-headed|stubborn|prickly|defensive/i.test(text);
  const isCheerful = /cheerful|energetic|bubbly|outgoing|extrovert|genki|playful/i.test(text);
  const isMelancholic = /depressed|melancholic|sorrow|gloomy|trauma|haunted|grief/i.test(text);
  const isSeductive = /flirt|seductive|alluring|succubus|tease|sensual|charismatic/i.test(text);
  const isHostile = /aggressive|hostile|villain|cruel|ruthless|furious|sadistic/i.test(text);
  const isShy = /shy|dandere|timid|introvert|flustered|modest|anxious/i.test(text);

  if (isStoic) {
    scores.set("bored", 30);
    scores.set("annoyed", 25);
    scores.set("curious", 20);
    scores.set("disappointed", 20);
    scores.set("sad", 15);
    scores.set("amused", -10);
    scores.set("excited", -20);
  }

  if (isTsundere) {
    scores.set("pout", 45);
    scores.set("blush", 40);
    scores.set("annoyed", 35);
    scores.set("angry", 30);
    scores.set("smug", 25);
    scores.set("curious", 15);
  }

  if (isCheerful) {
    scores.set("joy", 45);
    scores.set("excited", 40);
    scores.set("amused", 35);
    scores.set("winking", 30);
    scores.set("relieved", 20);
    scores.set("grief", -15);
  }

  if (isMelancholic) {
    scores.set("sad", 45);
    scores.set("crying", 40);
    scores.set("grief", 35);
    scores.set("disappointed", 30);
    scores.set("guilty", 25);
    scores.set("joy", -10);
  }

  if (isSeductive) {
    scores.set("seductive", 45);
    scores.set("smug", 40);
    scores.set("winking", 35);
    scores.set("love", 30);
    scores.set("amused", 25);
  }

  if (isHostile) {
    scores.set("angry", 45);
    scores.set("furious", 40);
    scores.set("disgust", 35);
    scores.set("smug", 30);
    scores.set("annoyed", 25);
  }

  if (isShy) {
    scores.set("blush", 45);
    scores.set("nervous", 40);
    scores.set("guilty", 30);
    scores.set("pout", 25);
    scores.set("fear", 20);
  }

  return all
    .sort((a, b) => (scores.get(b.key) || 0) - (scores.get(a.key) || 0))
    .slice(0, count);
}
