import { VoicePreset, TagCategory } from '../types';

export const KOKORO_VOICES: VoicePreset[] = [
  { id: 'af_heart', name: 'Heart (Atmospheric)', accent: 'American', gender: 'Female', sampleText: 'The beginning of the horror passed almost unnoticed in the quiet darkness.' },
  { id: 'af_sky', name: 'Sky (Eerie Whisper)', accent: 'American', gender: 'Female', sampleText: 'I heard a quiet rhythmic tapping on the glass window twenty feet above.' },
  { id: 'af_nicole', name: 'Nicole (Sinister)', accent: 'American', gender: 'Female', sampleText: 'The creature on the glass began to scratch softly against the reinforced frame.' },
  { id: 'af_bella', name: 'Bella (Haunting)', accent: 'American', gender: 'Female', sampleText: 'Standing in the porch light was a bone white figure wearing a hollow mask.' },
  { id: 'am_adam', name: 'Adam (Narrator Deep)', accent: 'American', gender: 'Male', sampleText: 'The terror which would not end for twenty-eight years began with a whisper.' },
  { id: 'am_michael', name: 'Michael (Gravitas)', accent: 'American', gender: 'Male', sampleText: 'When death comes in the dark, even the floorboards begin to warp upward.' },
  { id: 'bf_emma', name: 'Emma (Gothic British)', accent: 'British', gender: 'Female', sampleText: 'In the high fens of West Yorkshire, locals never walk past the black cairn.' },
  { id: 'bf_isabella', name: 'Isabella (Chilling)', accent: 'British', gender: 'Female', sampleText: 'The old portrait depicted a shadowed horned silhouette looming behind him.' },
  { id: 'bm_fable', name: 'Fable (Dark Folk)', accent: 'British', gender: 'Male', sampleText: 'He carries a lantern lit not with fire, but with lost human memories.' },
  { id: 'bm_george', name: 'George (Grim)', accent: 'British', gender: 'Male', sampleText: 'Do not make eye contact with the man in the grey suit standing on the tracks.' },
];

export const TAG_CATEGORIES: TagCategory[] = [
  {
    category: "Occult and Supernatural",
    blueprint: "VHS found-footage aesthetic, grainy analog media distortion, CRT scanlines, 90s low-budget horror, eerie static, shadow-drenched composition",
    tags: ["Beings and Entities", "Demons and Possession", "Ghosts and Spirits", "Occult", "Magic and Witchcraft", "Religion and Spirituality", "Rites and Rituals", "Hell and the Afterlife", "Myths and Legends", "Folklore and Folktales"]
  },
  {
    category: "Psychological and Mental",
    blueprint: "Arkham Asylum graphic novel art style, expressionist distorted angles, clinical bleakness, harsh flickering fluorescent lights, heavy surreal shadows",
    tags: ["Psychological Horror", "Madness and Mental Illness", "Paranoia", "Dreams and Nightmares"]
  },
  {
    category: "Crime and Violence",
    blueprint: "Gritty 80s slasher cinema art style, high-contrast chiaroscuro, autumn atmosphere, harsh neon red and deep blue rim lighting, suburban horror vibe",
    tags: ["Deaths, Murders, and Disappearances", "Investigations and Crimes", "Torture and Cannibalism", "Slashers and Gore"]
  },
  {
    category: "Bio Horror",
    blueprint: "The Last of Us post-apocalyptic concept art style, overgrown ruined environments, tactile decay, gritty realism, mute earthy tones, visceral texture",
    tags: ["Monsters", "Creatures and Cryptids", "Zombies and the Undead", "Body Horror", "Insects and Spiders", "Animals and Wildlife"]
  },
  {
    category: "Cosmic",
    blueprint: "Bloodborne gothic art style, dark Victorian architecture, towering cosmic dread, swirling ominous sky, eldritch moonlight, painterly digital art",
    tags: ["Space and Cosmic Horror"]
  },
  {
    category: "SciFi",
    blueprint: "1979 Alien industrial sci-fi aesthetic, cold claustrophobic spaceships, clunky retro-futuristic machinery, H.R. Giger biomechanical details, amber screens",
    tags: ["Science Fiction and Aliens", "Science and Experimentation"]
  }
];
