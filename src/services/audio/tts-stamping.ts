import type { RoleplayCharacter } from "../../types/character";
import type { ProviderConfig } from "../../types/provider";
import { routeLLMJson } from "../llm/provider-router";
import { saveCardRecord } from "../character/card-storage";
import { getEffectiveAudioDirectorPrompt } from "../config/prompt-config";

export interface CharacterVoiceSpec {
  voiceName: string;
  gender: "female" | "male" | "androgynous";
  ageBracket: "young_adult" | "adult" | "mature" | "elderly";
  vocalTexture: string; // e.g. "velvety with subtle breathy rasp"
  pitchCadence: string; // e.g. "mid-low pitch, dry cynical cadence, deliberate pauses"
  accentDialect: string; // e.g. "Standard British RP", "Mid-Atlantic", "Nordic lilt"
  
  // Qwen-TTS / CosyVoice specific instruct prompt
  qwenInstructPrompt: string;
  
  // In-character reference dialogue for voice clone / reference prompt
  qwenSampleDialogue: string;
  
  // Kokoro Voice Preset Match
  kokoroVoice: string;
  
  // ElevenLabs Recommended Sliders
  elevenLabs: {
    stability: number;
    similarity: number;
    style: number;
    speed: number;
  };
  
  audioTags: string[];
}

export interface VoiceSpecRequest {
  character: RoleplayCharacter;
  customPreferences?: string;
  provider: ProviderConfig;
  autoSaveToLibrary?: boolean;
}

export interface VoiceSpecResult {
  voiceSpec: CharacterVoiceSpec;
  stampedCharacter: RoleplayCharacter;
}

/**
 * Analyzes character's Voice & Language spec, [FORM] presence/timbre, and personality
 * to stamp a high-precision TTS Voice Spec tailored for Qwen3-TTS, CosyVoice, Kokoro, and ElevenLabs.
 */
export async function generateAndStampVoiceSpec(
  request: VoiceSpecRequest
): Promise<VoiceSpecResult> {
  const char = request.character;
  const charName = char.name || "Character";

  const systemPrompt =
    getEffectiveAudioDirectorPrompt(request.provider) ||
    `You are an elite Audio & Voice Director for AI speech synthesis (Qwen-TTS, CosyVoice, Kokoro, ElevenLabs).
Analyze this roleplay character's Voice & Language spec, physical presence/timbre from [FORM], and personality to generate a precise, actionable TTS Voice Specification.

QWEN-TTS / COSYVOICE INSTRUCT PROMPT PRINCIPLES:
- The Qwen/CosyVoice instruct prompt is a dense comma-separated or descriptive prompt telling the TTS model how to deliver the speech.
- Format: "[gender], [age bracket], [tone & timbre texture], [pitch], [dialect/accent], [rhythm/pacing], [emotional subtext]".
  Example: "female, young adult, velvety lower register with subtle breathy rasp, warm yet cynical cadence, deliberate pauses, restrained emotional subtext".

SAMPLE REFERENCE DIALOGUE:
- Write ONE perfect, highly characteristic spoken line that {{char}} would actually say in roleplay.
- Must capture their authentic vocal cadence, emotional armor, and signature contractions.
- Keep to 1-2 spoken sentences. Spoken dialogue only (no stage directions or asterisks).

KOKORO VOICE PRESET MATCH:
Choose the single closest Kokoro preset voice:
- Female: "af_bella" (intimate/soft), "af_sarah" (warm/expressive), "af_nicole" (sharp/cynical), "af_sky" (youthful/light), "bf_alice" (refined British), "bf_emma" (aristocratic), "bf_isabella" (mature/commanding).
- Male: "am_adam" (grounded/deep), "am_michael" (commanding/clear), "am_fenrir" (gritty/gravelly), "bm_george" (dry British wit), "bm_lewis" (formal/aristocratic).

ELEVENLABS SETTINGS:
- stability (0.35 to 0.85): Lower for erratic/emotional, higher for stoic/formal.
- similarity (0.60 to 0.90): Voice clarity lock.
- style (0.0 to 0.65): Dramatic exaggeration.
- speed (0.85 to 1.15): Delivery tempo.

Output STRICT JSON:
{
  "voiceName": "Evocative voice title (e.g. 'Velvet Cynic')",
  "gender": "female" | "male" | "androgynous",
  "ageBracket": "young_adult" | "adult" | "mature" | "elderly",
  "vocalTexture": "Concise sensory description of voice texture",
  "pitchCadence": "Pitch level, speech tempo, and cadence rhythm",
  "accentDialect": "Specific accent or dialect register",
  "qwenInstructPrompt": "Complete Qwen3-TTS / CosyVoice instruct prompt string",
  "qwenSampleDialogue": "1-2 sentence spoken sample capturing their voice",
  "kokoroVoice": "One of: af_bella, af_sarah, af_nicole, af_sky, bf_alice, bf_emma, bf_isabella, am_adam, am_michael, am_fenrir, bm_george, bm_lewis",
  "elevenLabs": {
    "stability": 0.65,
    "similarity": 0.80,
    "style": 0.25,
    "speed": 1.0
  },
  "audioTags": ["tag1", "tag2", "tag3", "tag4"]
}`;

  const userPrompt = `CHARACTER PROFILE:
Name: ${charName}
Personality (Voice & Language Spec):
${char.personality || "Standard natural voice."}

Physical Description ([FORM] & Presence):
${char.description || ""}

${request.customPreferences ? `USER PREFERENCES FOR VOICE:\n${request.customPreferences.trim()}\n` : ""}

Generate the complete TTS Voice Spec for this character.`;

  const messages = [
    { role: "system" as const, content: systemPrompt },
    { role: "user" as const, content: userPrompt },
  ];

  const raw = await routeLLMJson<any>(request.provider, messages);

  const voiceSpec: CharacterVoiceSpec = {
    voiceName: raw.voiceName || `${charName} Voice`,
    gender: raw.gender === "male" ? "male" : raw.gender === "androgynous" ? "androgynous" : "female",
    ageBracket: raw.ageBracket || "young_adult",
    vocalTexture: raw.vocalTexture || "Clear natural conversational tone",
    pitchCadence: raw.pitchCadence || "Natural conversational cadence",
    accentDialect: raw.accentDialect || "Neutral standard",
    qwenInstructPrompt:
      raw.qwenInstructPrompt ||
      `${raw.gender || "female"}, young adult, natural tone, clear conversational cadence`,
    qwenSampleDialogue:
      raw.qwenSampleDialogue ||
      (char.first_mes ? char.first_mes.replace(/[*_#`\n\r]/g, " ").slice(0, 120) : "Hello there."),
    kokoroVoice: raw.kokoroVoice || (raw.gender === "male" ? "am_adam" : "af_bella"),
    elevenLabs: {
      stability: typeof raw.elevenLabs?.stability === "number" ? raw.elevenLabs.stability : 0.65,
      similarity: typeof raw.elevenLabs?.similarity === "number" ? raw.elevenLabs.similarity : 0.80,
      style: typeof raw.elevenLabs?.style === "number" ? raw.elevenLabs.style : 0.25,
      speed: typeof raw.elevenLabs?.speed === "number" ? raw.elevenLabs.speed : 1.0,
    },
    audioTags: Array.isArray(raw.audioTags) ? raw.audioTags : ["natural", raw.gender || "female"],
  };

  // Stamp into Character Extensions
  const existingExt = (char as any).extensions || {};
  const stampedChar: RoleplayCharacter = {
    ...char,
    extensions: {
      ...existingExt,
      chargen: {
        ...(existingExt.chargen || {}),
        tts_spec: voiceSpec,
      },
      // SillyTavern compatible voice extension
      chara_tts: {
        voice_id: voiceSpec.kokoroVoice,
        voice_name: voiceSpec.voiceName,
        qwen_prompt: voiceSpec.qwenInstructPrompt,
        sample_text: voiceSpec.qwenSampleDialogue,
        speed: voiceSpec.elevenLabs.speed,
      },
    },
  };

  if (request.autoSaveToLibrary !== false) {
    try {
      await saveCardRecord(stampedChar);
    } catch (e: any) {
      console.warn("[VoiceSpec] Auto-save to library failed:", e.message);
    }
  }

  return {
    voiceSpec,
    stampedCharacter: stampedChar,
  };
}
