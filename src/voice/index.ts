/**
 * Voice System Exports
 * صادرات کامل سیستم صوتی Q Network
 */

export { WakeWordDetector, wakeWordDetector } from "./wake-word-detector";
export type { VoiceEngineConfig, VoiceLoopState } from "./stream-voice-engine";
export { StreamVoiceEngine, voiceEngine } from "./stream-voice-engine";

export {
  VoiceGmailBridge,
  voiceGmailBridge,
  useVoiceGmail,
  setupVoiceGmailIntegration,
} from "./voice-gmail-bridge";
export type { GmailVoiceCommand } from "./voice-gmail-bridge";
