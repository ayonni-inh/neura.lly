
export enum Role {
  USER = 'user',
  MODEL = 'model'
}

export type AppTheme = 'dark' | 'light';

export interface GroundingSource {
  title: string;
  uri: string;
}

export interface Attachment {
  id: string;
  mimeType: string;
  data: string; // Base64
  url: string; // Data URL or Blob URL for preview
  type: 'image' | 'video' | 'file';
}

export interface ImageGenerationConfig {
  style: string;
  aspectRatio: '1:1' | '16:9' | '9:16' | '4:3' | '3:4';
  imageSize: '1K' | '2K' | '4K';
  numberOfImages: number;
  enhancePrompt?: boolean;
}

export interface SavedImage {
  id: string;
  url: string;
  prompt: string;
  timestamp: Date;
}

export interface Message {
  id: string;
  role: Role;
  text: string;
  timestamp: Date;
  isStreaming?: boolean;
  sources?: GroundingSource[];
  generatedImageUrl?: string; // Deprecated in favor of generatedImageUrls
  generatedImageUrls?: string[];
  generatedVideoUrl?: string;
  generatedAudioUrl?: string;
  attachment?: Attachment; // Keep for backward compatibility if needed, but prefer attachments
  attachments?: Attachment[];
  isBookmarked?: boolean;
  feedback?: 'positive' | 'negative';
  isError?: boolean;
}

export interface Task {
  id: string;
  text: string;
  completed: boolean;
  priority: 'low' | 'medium' | 'high';
  createdAt: Date;
}

export interface ChatSession {
  id: string;
  title: string;
  messages: Message[];
  updatedAt: Date;
}

export interface UserProfile {
  name: string;
  email?: string;
  avatar?: string;
  bio?: string;
  role: string;
  goals: string[];
  constraints: string[];
  preferences: {
    tone: 'professional' | 'casual' | 'concise' | 'detailed';
    expertise: string;
    interests: string[];
  };
}

export enum ProcessingState {
  IDLE = 'idle',
  THINKING = 'thinking',
  STREAMING = 'streaming',
  IMAGEN = 'generating_image',
  EDITING_IMAGE = 'editing_image',
  GENERATING_VIDEO = 'generating_video',
  ERROR = 'error'
}

export interface LogEntry {
  id?: number;
  timestamp: Date;
  level: 'info' | 'warn' | 'error';
  message: string;
  details?: any;
}

export type VoiceName = 'Puck' | 'Charon' | 'Kore' | 'Fenrir' | 'Zephyr';

export interface VoiceSettings {
  voiceName: VoiceName;
  style: string;
  enabled: boolean;
  autoPlay: boolean;
}

export interface UserBelief {
  id: string;
  belief: string;
  firstMentioned: Date;
  lastUpdated: Date;
  frequency: number;
}

export interface ConversationTheme {
  id: string;
  theme: string;
  messages: string[];
  intensity: number;
  firstDetected: Date;
  lastDetected: Date;
}

export interface GrowthMetric {
  id: string;
  metric: string;
  baseline: any;
  current: any;
  change: number;
  trackedSince: Date;
  lastUpdated: Date;
}

export interface PersonalityProfile {
  id: string;
  communicationStyle: 'direct' | 'collaborative' | 'exploratory' | 'technical';
  emotionalPattern: 'calm' | 'energetic' | 'anxious' | 'focused';
  decisionStyle: 'analytical' | 'intuitive' | 'pragmatic' | 'balanced';
  responsePreference: 'detailed' | 'concise' | 'structured' | 'narrative';
  adaptationScore: number;
  lastUpdated: Date;
}

export interface CognitiveState {
  beliefs: UserBelief[];
  themes: ConversationTheme[];
  growthMetrics: GrowthMetric[];
  personality: PersonalityProfile;
  recentPatterns: string[];
}
