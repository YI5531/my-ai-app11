
export interface FileNode {
  path: string;
  name: string;
  content: Blob | string;
  type: 'file' | 'directory';
}

export interface ProjectSettings {
  apiKey?: string;
  entryPoint?: string;
  injectConsole?: boolean;
}

export interface LogEntry {
  id: string;
  projectId: string;
  timestamp: number;
  type: 'info' | 'warn' | 'error' | 'debug';
  message: string;
  stack?: string;
}

export interface ProjectMetadata {
  id: string;
  name: string;
  description: string;
  createdAt: number;
  type: 'web' | 'external_url' | 'code_snippet';
  thumbnail?: string;
  externalUrl?: string;
  entryPoint?: string;
  settings?: ProjectSettings;
  isPinned?: boolean;
}

export interface Project extends ProjectMetadata {
  files: Record<string, Blob>;
}

export interface BrowserHistoryItem {
  id: string;
  url: string;
  title: string;
  timestamp: number;
  visitCount: number;
}

export interface AppConfig {
  blockedHosts: string[];
}

export const APP_CONFIG: AppConfig = {
  blockedHosts: [
    'aistudio.google.com',
    'generativelanguage.googleapis.com',
    'colab.research.google.com',
    'accounts.google.com',
    'google.com',
    'www.google.com',
    'youtube.com'
  ]
};

// Global augmentation
declare global {
  interface Window {
    Babel?: {
      transform: (code: string, options: any) => { code: string };
    }
  }
}