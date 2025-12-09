
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
  // 严格阻止的域名（CSP/X-Frame-Options 限制）
  strictlyBlockedHosts: string[];
  // 建议使用外部浏览器的域名（用户体验更好）
  preferExternalHosts: string[];
}

export const APP_CONFIG: AppConfig = {
  // 这些域名因为安全策略无法在 iframe 中加载
  strictlyBlockedHosts: [
    'accounts.google.com',
    'login.microsoftonline.com',
    'github.com/login',
  ],
  // 这些域名可以在 iframe 中加载，但建议使用外部浏览器以获得完整功能
  preferExternalHosts: [
    'aistudio.google.com',
    'colab.research.google.com',
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