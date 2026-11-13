"""
Expression Preset Dictionary & Prompt Delta Modifier.

Deterministic Zero-LLM expression definitions.
Maps all 28 canonical emotions and intensity levels to targeted prompt tokens, negative suppressors,
classifier label descriptions, and recommended KSampler denoising strengths (0.30 - 0.44).
"""

EXPRESSION_PRESETS = {
    "neutral": {
        "label": "Neutral / Composed",
        "category": "Basic",
        "description": "Composed baseline face, calm direct eye contact, relaxed closed lips.",
        "positive_delta": "neutral expression, closed mouth, calm steady gaze, relaxed face",
        "negative_delta": "smiling, grinning, angry, frowning, crying, open mouth, exaggerated emotion",
        "default_denoise": 0.30,
        "intensity_tier": 1,
    },
    "joy": {
        "label": "Joy / Warm Smile",
        "category": "Happy",
        "description": "Warm genuine smile, soft squinting eyes, joyful relaxed look.",
        "positive_delta": "warm genuine smile, soft squinting joyful eyes, cheerful relaxed face, subtle cheek flush",
        "negative_delta": "frown, sad, angry, tears, scowl, gloomy, grimace",
        "default_denoise": 0.36,
        "intensity_tier": 1,
    },
    "amused": {
        "label": "Amused / Laughing",
        "category": "Happy",
        "description": "Broad laughing smile, eyes crinkled in amusement, head tilted slightly.",
        "positive_delta": "laughing, big open smile, crinkled amused eyes, head tilted slightly, overjoyed",
        "negative_delta": "serious, deadpan, frown, crying, somber, grimace",
        "default_denoise": 0.40,
        "intensity_tier": 2,
    },
    "smug": {
        "label": "Smug / Teasing",
        "category": "Playful",
        "description": "Confident smirk, raised single eyebrow, teasing playful glance.",
        "positive_delta": "smug playful smirk, raised single eyebrow, half-closed confident eyes, teasing side glance",
        "negative_delta": "worried, terrified, submissive, weeping, confused",
        "default_denoise": 0.38,
        "intensity_tier": 1,
    },
    "blush": {
        "label": "Flustered / Blushing",
        "category": "Playful",
        "description": "Rosy cheeks, shy flustered expression, averting gaze in embarrassment.",
        "positive_delta": "flustered blush, heavy rosy cheeks, bashful averting eyes, shy nervous expression, parted lips",
        "negative_delta": "confident, stoic, menacing, emotionless, deadpan",
        "default_denoise": 0.38,
        "intensity_tier": 1,
    },
    "pout": {
        "label": "Pouting / Sulking",
        "category": "Playful",
        "description": "Puffed cheeks, cute sulking frown, furrowed eyebrows.",
        "positive_delta": "pouting face, puffed cheeks, cute sulking frown, furrowed cute brows, looking slightly aside",
        "negative_delta": "smiling, laughing, cheerful, terrified, crying",
        "default_denoise": 0.38,
        "intensity_tier": 1,
    },
    "winking": {
        "label": "Winking / Flirtatious",
        "category": "Playful",
        "description": "One eye playfully closed, subtle charming smile.",
        "positive_delta": "winking, one eye playfully closed, charming subtle smirk, flirtatious glance",
        "negative_delta": "both eyes open, angry, crying, serious, dull eyes",
        "default_denoise": 0.38,
        "intensity_tier": 1,
    },
    "seductive": {
        "label": "Seductive / Sultry",
        "category": "Playful",
        "description": "Half-lidded bedroom eyes, parted lips, intimate sultry blush.",
        "positive_delta": "half-lidded sultry eyes, bedroom eyes, parted lips, faint alluring blush, intense intimate eye contact",
        "negative_delta": "goofy, childish, angry, panicked, frightened, crying",
        "default_denoise": 0.38,
        "intensity_tier": 2,
    },
    "love": {
        "label": "Enamored / Affectionate",
        "category": "Positive",
        "description": "Gentle loving gaze, glowing soft eyes, warm tender smile.",
        "positive_delta": "gentle loving gaze, tender affectionate smile, glistening warm eyes, soft dreamy expression",
        "negative_delta": "aggressive, disgusted, cold, hostile, mocking",
        "default_denoise": 0.36,
        "intensity_tier": 1,
    },
    "curious": {
        "label": "Curious / Inquisitive",
        "category": "Basic",
        "description": "Head tilted inquisitively, one eyebrow arched, attentive focused eyes.",
        "positive_delta": "curious expression, head tilted inquisitively, raised single eyebrow, attentive focused gaze",
        "negative_delta": "bored, asleep, weeping, furious, deadpan",
        "default_denoise": 0.36,
        "intensity_tier": 1,
    },
    "confused": {
        "label": "Confused / Perplexed",
        "category": "Surprise",
        "description": "Slight squint, furrowed brow, puzzled question mark expression.",
        "positive_delta": "confused expression, furrowed puzzled brow, slightly squinting eyes, head cocked, perplexed face",
        "negative_delta": "confident, knowing, ecstatic, weeping, furious",
        "default_denoise": 0.36,
        "intensity_tier": 1,
    },
    "surprised": {
        "label": "Surprised / Startled",
        "category": "Surprise",
        "description": "Wide pupils, raised eyebrows, lips slightly parted in sudden realization.",
        "positive_delta": "surprised, wide open eyes, raised eyebrows, parted gasping lips, sudden startled expression",
        "negative_delta": "calm, asleep, bored, deadpan, scowling",
        "default_denoise": 0.38,
        "intensity_tier": 1,
    },
    "shocked": {
        "label": "Shocked / Stunned Disbelief",
        "category": "Surprise",
        "description": "Wide shocked pupils, frozen breath, stunned jaw drop.",
        "positive_delta": "stunned disbelief, wide shocked dilated pupils, frozen breath, completely dumbfounded expression",
        "negative_delta": "smiling, relaxed, sleepy, composed",
        "default_denoise": 0.42,
        "intensity_tier": 2,
    },
    "excited": {
        "label": "Excited / Thrilled",
        "category": "Happy",
        "description": "Bright sparkling eyes, beaming broad smile, energetic anticipation.",
        "positive_delta": "excited, bright sparkling eyes, beaming radiant smile, flushed cheeks, high energy expression",
        "negative_delta": "tired, depressed, bored, melancholic, deadpan",
        "default_denoise": 0.38,
        "intensity_tier": 2,
    },
    "nervous": {
        "label": "Nervous / Awkward",
        "category": "Negative",
        "description": "Uneasy tight smile, sweat drop, guarded glancing eyes.",
        "positive_delta": "nervous tight smile, sweat drop, tense awkward expression, darting eyes, uneasy posture",
        "negative_delta": "confident, regal, relaxed, menacing, serene",
        "default_denoise": 0.38,
        "intensity_tier": 1,
    },
    "fear": {
        "label": "Fear / Terrified",
        "category": "Negative",
        "description": "Pale complexion, wide terrified eyes, trembling lips.",
        "positive_delta": "terrified, wide fearful eyes, trembling lips, pale complexion, panic expression, tense face",
        "negative_delta": "brave, fearless, smiling, laughing, confident, calm",
        "default_denoise": 0.42,
        "intensity_tier": 2,
    },
    "sad": {
        "label": "Sad / Melancholic",
        "category": "Sorrow",
        "description": "Downcast eyes, faint sorrowful frown, subdued melancholy gaze.",
        "positive_delta": "downcast gaze, faint sorrowful frown, melancholic gentle expression, somber subdued face",
        "negative_delta": "smiling, laughing, joyful, furious, arrogant",
        "default_denoise": 0.36,
        "intensity_tier": 1,
    },
    "crying": {
        "label": "Crying / Tearful",
        "category": "Sorrow",
        "description": "Glistening wet eyes, tears streaming down cheeks, quivering mouth.",
        "positive_delta": "crying, glistening wet eyes, tears streaming down cheeks, quivering lips, heartbreaking weeping expression",
        "negative_delta": "smiling, laughing, cheerful, dry eyes, calm",
        "default_denoise": 0.42,
        "intensity_tier": 2,
    },
    "grief": {
        "label": "Grief / Devastated",
        "category": "Sorrow",
        "description": "Hollow haunted stare, anguish, shattered emotional composure.",
        "positive_delta": "devastated grief, hollow haunted gaze, intense anguish, trembling clenched mouth, shattered composure",
        "negative_delta": "happy, amused, playful, smiling, serene",
        "default_denoise": 0.44,
        "intensity_tier": 2,
    },
    "disappointed": {
        "label": "Disappointed / Let Down",
        "category": "Negative",
        "description": "Subtle downward mouth curl, tired eyes, resigned sigh.",
        "positive_delta": "disappointed expression, heavy eyelids, subtle downward mouth curl, weary resigned gaze",
        "negative_delta": "enthusiastic, joyful, delighted, beaming",
        "default_denoise": 0.36,
        "intensity_tier": 1,
    },
    "angry": {
        "label": "Angry / Scowling",
        "category": "Hostile",
        "description": "Furrowed brow, sharp glare, irritated grimace.",
        "positive_delta": "furrowed brow, sharp intense glare, irritated grimace, tight clenched jaw, angry scowl",
        "negative_delta": "smiling, gentle, blush, crying, timid, serene",
        "default_denoise": 0.38,
        "intensity_tier": 1,
    },
    "furious": {
        "label": "Furious / Enraged",
        "category": "Hostile",
        "description": "Bared teeth, fiery wrathful eyes, intense rage flush.",
        "positive_delta": "furious rage, bared clenched teeth, wrathful burning eyes, fierce menacing grimace, violent anger",
        "negative_delta": "calm, gentle, smiling, peaceful, timid",
        "default_denoise": 0.44,
        "intensity_tier": 2,
    },
    "annoyed": {
        "label": "Annoyed / Irritated",
        "category": "Hostile",
        "description": "Twitching brow, dry unamused stare, stern unimpressed face.",
        "positive_delta": "annoyed, dry unamused stare, slight brow twitch, stern unimpressed mouth, irritated side eye",
        "negative_delta": "friendly, thrilled, weeping, panicked",
        "default_denoise": 0.36,
        "intensity_tier": 1,
    },
    "disgust": {
        "label": "Disgust / Contempt",
        "category": "Hostile",
        "description": "Curled upper lip, disdainful sneer, recoiling gaze.",
        "positive_delta": "disgusted, contemptuous sneer, curled upper lip, disdainful side eye, recoiling with aversion",
        "negative_delta": "friendly, admiring, cheerful, loving, affectionate",
        "default_denoise": 0.38,
        "intensity_tier": 1,
    },
    "bored": {
        "label": "Bored / Apathetic",
        "category": "Passive",
        "description": "Deadpan unbothered eyes, flat slack mouth, uninvested posture.",
        "positive_delta": "bored deadpan expression, half-closed unbothered eyes, slack neutral mouth, indifferent flat gaze",
        "negative_delta": "excited, passionate, furious, screaming, smiling",
        "default_denoise": 0.34,
        "intensity_tier": 1,
    },
    "sleepy": {
        "label": "Sleepy / Exhausted",
        "category": "Passive",
        "description": "Heavy drooping eyelids, yawning mouth, drowsy calm face.",
        "positive_delta": "sleepy, heavy drooping eyelids, drowsy calm face, yawning slightly, relaxed exhausted gaze",
        "negative_delta": "hyperactive, alert, terrified, sharp piercing eyes",
        "default_denoise": 0.36,
        "intensity_tier": 1,
    },
    "relieved": {
        "label": "Relieved / Calmed",
        "category": "Positive",
        "description": "Soft exhale, relaxed shoulders, gentle peaceful smile.",
        "positive_delta": "relieved expression, soft relaxed shoulders, gentle peaceful faint smile, tension leaving face",
        "negative_delta": "panicked, terrified, tense, scowling, weeping",
        "default_denoise": 0.34,
        "intensity_tier": 1,
    },
    "guilty": {
        "label": "Guilty / Ashamed",
        "category": "Negative",
        "description": "Averting eyes downward, remorseful frown, biting lower lip.",
        "positive_delta": "ashamed guilty look, averting eyes downward, remorseful frown, biting lower lip, penitent face",
        "negative_delta": "proud, arrogant, laughing, brazen, smug",
        "default_denoise": 0.38,
        "intensity_tier": 1,
    },
}


def build_expression_prompt(base_positive: str, expression_key: str, custom_delta: str = "") -> str:
    """Combines character base tags with deterministic expression tags."""
    preset = EXPRESSION_PRESETS.get(expression_key, {})
    delta = custom_delta.strip() if custom_delta.strip() else preset.get("positive_delta", "")
    clean_base = base_positive.strip()
    if clean_base and delta:
        return f"{clean_base}, {delta}"
    return clean_base or delta


def build_expression_negative(base_negative: str, expression_key: str) -> str:
    """Suppresses conflicting expressions from negative prompt."""
    preset = EXPRESSION_PRESETS.get(expression_key, {})
    neg_delta = preset.get("negative_delta", "")
    clean_base = base_negative.strip()
    if clean_base and neg_delta:
        return f"{clean_base}, {neg_delta}"
    return clean_base or neg_delta
