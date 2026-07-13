
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
  name: string;
  mimeType: string;
  data: string; // Base64
  url: string; // Data URL or Blob URL for preview
  localUrl?: string; // Fallback to IndexedDB key
  type: 'image' | 'video' | 'file' | 'pdf' | 'document' | 'spreadsheet' | 'text';
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
  localUrl?: string; // Fallback to IndexedDB key
  prompt: string;
  timestamp: Date;
}

export type Intent = 'record' | 'analyze' | 'generate' | 'query' | 'action' | 'unknown';

export interface Message {
  id: string;
  role: Role;
  text: string;
  timestamp: Date;
  intent?: Intent;
  origin?: 'user' | 'ai';
  requiresProcessing?: boolean;
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
  showKeyCTA?: boolean;
}

export interface Task {
  id: string;
  text: string;
  completed: boolean;
  priority: 'low' | 'medium' | 'high';
  createdAt: Date;
}

export interface Project {
  id: string;
  name: string;
  description: string;
  sessionIds: string[];
  taskIds: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface ChatSession {
  id: string;
  title: string;
  messages: Message[];
  updatedAt: Date;
}

export type AgentType = 'Executor' | 'Strategic' | 'Creative';

export interface ApiKey {
  id: string;
  name: string;
  key: string;
  service: string;
  isActive: boolean;
  createdAt: Date;
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
  plan?: 'free' | 'pro' | 'max';
  selectedAgent?: AgentType;
  usage?: {
    prompts: number;
    imageGenerations: number;
    videoGenerations: number;
    lastReset: Date;
  };
  syncIndex?: number;
  protocolVersion?: string;
  protocolStage?: number;
  cognitiveAlignment?: {
    analytical: number;
    creative: number;
    strategic: number;
    empathic: number;
  };
  customDirectives?: string[];
}

export enum ProcessingState {
  IDLE = 'idle',
  DETECTING_INTENT = 'detecting_intent',
  THINKING = 'thinking',
  STREAMING = 'streaming',
  IMAGEN = 'generating_image',
  EDITING_IMAGE = 'editing_image',
  GENERATING_VIDEO = 'generating_video',
  REMOVING_BACKGROUND = 'removing_background',
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
  pitch: number;
  speed: number;
  enabled: boolean;
  autoPlay: boolean;
}

export interface StreamResponseResult {
  text: string;
  requiresProcessing?: boolean;
  functionCall?: {
    name: string;
    args: any;
  };
}
