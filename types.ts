
export enum PostSize {
  INSTAGRAM = '1:1',
  A4_PORTRAIT = '3:4',
  A4_LANDSCAPE = '4:3',
  STORY = '9:16'
}

export enum DesignStyle {
  MINIMALIST = 'Minimalist & Modern',
  VIBRANT = 'Vibrant & Bold',
  CORPORATE = 'Professional & Clean',
  ARTISTIC = 'Creative & Abstract',
  RETRO = 'Retro & Vintage',
  REALISTIC = 'Photorealistic & Cinematic'
}

export interface GroundingSource {
  title: string;
  uri: string;
}

export interface TemplateSuggestion {
  name: string;
  description: string;
  searchUrl: string;
}

export interface LogEntry {
  id: string;
  message: string;
  status: 'pending' | 'success' | 'error';
  timestamp: string;
}

export interface FileAttachment {
  id: string;
  name: string;
  data: string; // base64
  mimeType: string;
  type: 'image' | 'pdf' | 'document' | 'other';
}

export interface SocialPlatform {
  id: string;
  name: string;
  icon: string;
  connected: boolean;
  color: string;
}

export interface GeneratedPost {
  id: string;
  topic: string;
  instructions?: string;
  caption: string;
  hashtags: string[];
  imageUrl: string;
  size: PostSize;
  styles: DesignStyle[];
  sources: GroundingSource[];
  templateSuggestions: TemplateSuggestion[];
  timestamp: number;
}

export interface AppState {
  posts: GeneratedPost[];
  isGenerating: boolean;
  activityLog: LogEntry[];
  error: string | null;
}
