
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
  mimeType: string;
  data: string; // Base64
}

export interface ImageGenerationConfig {
  style: string;
  aspectRatio: '1:1' | '16:9' | '9:16' | '4:3' | '3:4';
  imageSize: '1K' | '2K' | '4K';
  numberOfImages: number;
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
  attachment?: Attachment;
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

export enum ProcessingState {
  IDLE = 'idle',
  THINKING = 'thinking',
  STREAMING = 'streaming',
  IMAGEN = 'generating_image',
  EDITING_IMAGE = 'editing_image',
  ERROR = 'error'
}
