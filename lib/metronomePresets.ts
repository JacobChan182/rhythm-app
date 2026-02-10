/**
 * Metronome sound presets from assets/metronomes (WAV files).
 * Credits: Ludwig Peter Müller, CC0 1.0.
 */

export type MetronomeSoundPreset = {
  id: string;
  label: string;
  hi: number;
  lo: number;
};

const presets: MetronomeSoundPreset[] = [
  { id: "perc_can", label: "Can", hi: require("@/assets/metronomes/Perc_Can_hi.wav"), lo: require("@/assets/metronomes/Perc_Can_lo.wav") },
  { id: "perc_castanet", label: "Castanet", hi: require("@/assets/metronomes/Perc_Castanet_hi.wav"), lo: require("@/assets/metronomes/Perc_Castanet_lo.wav") },
  { id: "perc_chair", label: "Chair", hi: require("@/assets/metronomes/Perc_Chair_hi.wav"), lo: require("@/assets/metronomes/Perc_Chair_lo.wav") },
  { id: "perc_clackhead", label: "Clackhead", hi: require("@/assets/metronomes/Perc_Clackhead_hi.wav"), lo: require("@/assets/metronomes/Perc_Clackhead_lo.wav") },
  { id: "perc_clap", label: "Clap", hi: require("@/assets/metronomes/Perc_Clap_hi.wav"), lo: require("@/assets/metronomes/Perc_Clap_lo.wav") },
  { id: "perc_clicktoy", label: "Click Toy", hi: require("@/assets/metronomes/Perc_ClickToy_hi.wav"), lo: require("@/assets/metronomes/Perc_ClickToy_lo.wav") },
  { id: "perc_glass", label: "Glass", hi: require("@/assets/metronomes/Perc_Glass_hi.wav"), lo: require("@/assets/metronomes/Perc_Glass_lo.wav") },
  { id: "perc_headknock", label: "Head Knock", hi: require("@/assets/metronomes/Perc_HeadKnock_hi.wav"), lo: require("@/assets/metronomes/Perc_HeadKnock_lo.wav") },
  { id: "perc_keyboard", label: "Keyboard", hi: require("@/assets/metronomes/Perc_Keyboard_hi.wav"), lo: require("@/assets/metronomes/Perc_Keyboard_lo.wav") },
  { id: "perc_metal", label: "Metal", hi: require("@/assets/metronomes/Perc_Metal_hi.wav"), lo: require("@/assets/metronomes/Perc_Metal_lo.wav") },
  { id: "perc_metronome_quartz", label: "Metronome Quartz", hi: require("@/assets/metronomes/Perc_MetronomeQuartz_hi.wav"), lo: require("@/assets/metronomes/Perc_MetronomeQuartz_lo.wav") },
  { id: "perc_mouthpop", label: "Mouth Pop", hi: require("@/assets/metronomes/Perc_MouthPop_hi.wav"), lo: require("@/assets/metronomes/Perc_MouthPop_lo.wav") },
  { id: "perc_musicstand", label: "Music Stand", hi: require("@/assets/metronomes/Perc_MusicStand_hi.wav"), lo: require("@/assets/metronomes/Perc_MusicStand_lo.wav") },
  { id: "perc_practicepad", label: "Practice Pad", hi: require("@/assets/metronomes/Perc_PracticePad_hi.wav"), lo: require("@/assets/metronomes/Perc_PracticePad_lo.wav") },
  { id: "perc_snap", label: "Snap", hi: require("@/assets/metronomes/Perc_Snap_hi.wav"), lo: require("@/assets/metronomes/Perc_Snap_lo.wav") },
  { id: "perc_squeak", label: "Squeak", hi: require("@/assets/metronomes/Perc_Squeak_hi.wav"), lo: require("@/assets/metronomes/Perc_Squeak_lo.wav") },
  { id: "synth_tick_f", label: "Synth Tick F", hi: require("@/assets/metronomes/Synth_Tick_F_hi.wav"), lo: require("@/assets/metronomes/Synth_Tick_F_lo.wav") },
  { id: "synth_tick_g", label: "Synth Tick G", hi: require("@/assets/metronomes/Synth_Tick_G_hi.wav"), lo: require("@/assets/metronomes/Synth_Tick_G_lo.wav") },
  { id: "synth_tick_h", label: "Synth Tick H", hi: require("@/assets/metronomes/Synth_Tick_H_hi.wav"), lo: require("@/assets/metronomes/Synth_Tick_H_lo.wav") },
  { id: "synth_weird_a", label: "Synth Weird A", hi: require("@/assets/metronomes/Synth_Weird_A_hi.wav"), lo: require("@/assets/metronomes/Synth_Weird_A_lo.wav") },
  { id: "synth_weird_b", label: "Synth Weird B", hi: require("@/assets/metronomes/Synth_Weird_B_hi.wav"), lo: require("@/assets/metronomes/Synth_Weird_B_lo.wav") },
  { id: "synth_weird_c", label: "Synth Weird C", hi: require("@/assets/metronomes/Synth_Weird_C_hi.wav"), lo: require("@/assets/metronomes/Synth_Weird_C_lo.wav") },
  { id: "synth_weird_d", label: "Synth Weird D", hi: require("@/assets/metronomes/Synth_Weird_D_hi.wav"), lo: require("@/assets/metronomes/Synth_Weird_D_lo.wav") },
  { id: "synth_weird_e", label: "Synth Weird E", hi: require("@/assets/metronomes/Synth_Weird_E_hi.wav"), lo: require("@/assets/metronomes/Synth_Weird_E_lo.wav") },
];

export const METRONOME_SOUND_PRESETS = presets;
export type MetronomeSoundId = (typeof presets)[number]["id"];
export const DEFAULT_METRONOME_SOUND: MetronomeSoundId = "perc_metronome_quartz";
