import React, { useState, useEffect } from 'react';
import { Project, ProjectMetadata } from './types';
import { getAllProjects, deleteProject, toggleProjectPin, getProject } from './services/storageService';
import Dashboard from './components/Dashboard';
import RunnerViewer from './components/RunnerViewer';
import ImportModal from './components/ImportModal';
import GlobalSettingsModal from './components/GlobalSettingsModal';
import BrowserView from './components/BrowserView';
import ErrorBoundary from './components/ErrorBoundary';
import { Disc, Plus, Settings } from 'lucide-react';
import { App as CapacitorApp, URLOpenListenerEvent } from '@capacitor/app';
import { registerPlugin, Capacitor } from '@capacitor/core';
import { Browser } from '@capacitor/browser';
import clsx from 'clsx';

// Manual definition of the plugin interface to avoid import errors
interface PinnedShortcutsPlugin {
  pin(options: {
    id: string;
    shortLabel: string;
    longLabel: string;
    icon: string;
    intent: string;
  }): Promise<void>;
}

// Safely register the plugin. If native implementation is missing (web), it will just not work.
const PinnedShortcuts = registerPlugin<PinnedShortcutsPlugin>('PinnedShortcuts');

const App: React.FC = () => {
  const [view, setView] = useState<'dashboard' | 'runner' | 'browser'>('dashboard');
  const [activeProject, setActiveProject] = useState<Project | null>(null);
  const [projects, setProjects] = useState<ProjectMetadata[]>([]);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isImmersive, setIsImmersive] = useState(false);

  const loadProjects = async () => {
    setIsLoading(true);
    try {
      const list = await getAllProjects();
      setProjects(list);
    } catch (error) {
      console.error("Failed to load projects", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadProjects();
  }, []);

  // Extract project id from various deep link shapes (nexus://run?id=xxx or https://host/run?id=xxx)
  const extractProjectIdFromUrl = (url: string): string | null => {
    try {
      const urlObj = new URL(url);
      const id = urlObj.searchParams.get('id');
      if (!id) return null;

      // Accept our custom scheme or https domains that route to /run
      const isCustomScheme = urlObj.protocol === 'nexus:';
      const isRunPath = urlObj.pathname.includes('/run') || urlObj.hostname === 'run';
      if (isCustomScheme || isRunPath) return id;
    } catch (e) {
      console.error('Deep Link Parse Error', e);
    }
    return null;
  };

  // Helper function to open external links based on platform
  const openExternalLink = async (url: string) => {
    if (Capacitor.isNativePlatform()) {
        try {
            await Browser.open({ 
                url, 
                presentationStyle: 'popover', 
                toolbarColor: '#1a1c21' 
            });
        } catch (e) {
            console.error("Browser Open Failed", e);
        }
    } else {
        console.log('正在尝试打开 Deep Link / External URL:', url);
        window.open(url, '_blank');
    }
  };

  // Handle Deep Links (Shortcuts)
  useEffect(() => {
    const handleUrlOpen = async (event: URLOpenListenerEvent) => {
        console.log('App URL Open:', event.url);
        
      const projectId = extractProjectIdFromUrl(event.url);

      if (projectId) {
        const project = await getProject(projectId);
        if (project) {
          setActiveProject(project);
          setView('runner');
          setIsImmersive(true); // Deep links jump straight into immersive playback
        } else {
          console.warn('Project not found for ID:', projectId);
        }
        return;
      }

      // Fallback: open in external browser
      openExternalLink(event.url);
    };

    CapacitorApp.addListener('appUrlOpen', handleUrlOpen);

    return () => {
        CapacitorApp.removeAllListeners();
    };
  }, []);

  // Hardware Back Button Handler (Android)
  useEffect(() => {
    let listenerHandle: any = null;

    const setupBackListener = async () => {
        listenerHandle = await CapacitorApp.addListener('backButton', ({ canGoBack }) => {
            if (isImportOpen) {
                setIsImportOpen(false);
                return;
            }
            if (isSettingsOpen) {
                setIsSettingsOpen(false);
                return;
            }

            if (view === 'runner') {
                if (isImmersive) {
                    // Let RunnerViewer handle immersive exit via its own logic if needed,
                    // or simply toggle state here.
                    setIsImmersive(false);
                } else {
                    handleCloseRunner();
                }
            } else if (view === 'browser') {
                setView('dashboard');
            } else {
                // If on dashboard, exit the app
                CapacitorApp.exitApp();
            }
        });
    };

    setupBackListener();

    return () => {
        if (listenerHandle) listenerHandle.remove();
    };
  }, [view, isImmersive, isImportOpen, isSettingsOpen]);

  const handleOpenProject = async (meta: ProjectMetadata) => {
    setActiveProject({ ...meta, files: {} } as Project); 
    setView('runner');
    setIsImmersive(false);
  };

  const handleCloseRunner = () => {
    setView('dashboard');
    setActiveProject(null);
    setIsImmersive(false);
  };

  const handleDeleteProject = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    e.nativeEvent.stopImmediatePropagation();
    
    // Use navigator.vibrate for haptic feedback
    if (navigator.vibrate) navigator.vibrate(50);

    if (confirm('ERASE TAPE DATA? This action is permanent.')) {
      await deleteProject(id);
      loadProjects();
    }
  };

  const handleTogglePin = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    e.nativeEvent.stopImmediatePropagation();
    if (navigator.vibrate) navigator.vibrate(20);
    
    await toggleProjectPin(id);
    loadProjects();
  };

  const handleAddToHome = async (project: ProjectMetadata, e: React.MouseEvent) => {
    e.stopPropagation();
    if (navigator.vibrate) navigator.vibrate(20);

    // 先检查是否支持
    if (!Capacitor.isNativePlatform()) {
        alert('桌面快捷方式仅在 Android 应用中可用');
        return;
    }

    try {
        // 使用 Capacitor App 插件的 canOpenUrl 作为临时解决方案
        // 创建一个 Deep Link 并提示用户手动添加书签
        const deepLink = `nexus://run?id=${project.id}`;
        
        alert(`📌 创建桌面快捷方式：\n\n由于系统限制，请手动操作：\n\n1. 在浏览器中打开:\n${deepLink}\n\n2. 点击"添加到主屏幕"\n\n或者，将此项目标记为"固定"以便快速访问`);
        
        // 自动固定项目作为替代方案
        await toggleProjectPin(project.id);
        loadProjects();
    } catch (error: any) {
        console.error("Failed to add shortcut", error);
        alert(`操作失败：${error?.message || '未知错误'}`);
    }
  };

  const handleImportSuccess = () => {
    setIsImportOpen(false);
    loadProjects();
  };

  return (
    <ErrorBoundary fallbackMessage="Nexus Runner 遇到了一个严重错误">
      <div className={clsx(
        "min-h-screen bg-cassette-dark text-cassette-text font-mono overflow-hidden flex flex-col bg-noise",
        // Only apply safe-area bottom padding if NOT in immersive mode to allow full-screen content
        isImmersive ? "pb-0" : "pb-[env(safe-area-inset-bottom)]"
    )}>
      {/* Cyber Deck Header */}
      {!isImmersive && (
        <header className="pt-[env(safe-area-inset-top)] bg-cassette-base border-b-4 border-black flex flex-col shrink-0 z-20 shadow-plastic relative transition-all">
          {/* Stripes Decoration */}
          <div className="absolute top-0 left-0 w-full h-1 bg-cassette-accent opacity-50 bg-stripes"></div>

          <div className="flex items-center justify-between px-4 h-[70px]">
            <div className="flex items-center gap-3 cursor-pointer group" onClick={() => setView('dashboard')}>
              <div className="bg-cassette-plastic p-2 rounded border border-white/10 group-hover:border-cassette-accent transition-colors">
                 <Disc size={24} className="text-cassette-accent animate-[spin_10s_linear_infinite]" />
              </div>
              <div className="flex flex-col">
                 <h1 className="text-xl font-industrial tracking-wider text-white leading-none">NEXUS</h1>
                 <span className="text-[9px] text-cassette-accent tracking-[0.3em] uppercase">Mobile Deck</span>
              </div>
            </div>
            
            <nav className="flex items-center gap-1 bg-black/30 p-1 rounded">
              <button 
                onClick={() => setView('dashboard')}
                className={`px-3 sm:px-6 py-2 rounded-sm text-xs sm:text-sm font-bold uppercase transition-all ${
                  view === 'dashboard' 
                    ? 'bg-cassette-accent text-black shadow-[0_0_10px_rgba(255,153,0,0.5)]' 
                    : 'text-cassette-muted hover:text-white hover:bg-white/5'
                }`}
              >
                TAPES
              </button>
              <button 
                onClick={() => setView('browser')}
                className={`px-3 sm:px-6 py-2 rounded-sm text-xs sm:text-sm font-bold uppercase transition-all ${
                  view === 'browser' 
                    ? 'bg-cassette-highlight text-black shadow-[0_0_10px_rgba(0,229,255,0.5)]' 
                    : 'text-cassette-muted hover:text-white hover:bg-white/5'
                }`}
              >
                NET
              </button>
            </nav>
            
            {view !== 'runner' && (
              <div className="hidden sm:flex items-center gap-2">
                 {/* Desktop-only extra controls can go here */}
              </div>
            )}
          </div>
        </header>
      )}

      {/* Floating Action Button for Mobile Import (if not immersive) */}
      {!isImmersive && view !== 'runner' && (
        <div className="absolute bottom-6 right-6 z-30 flex flex-col gap-4 pb-[env(safe-area-inset-bottom)]">
            <button 
              onClick={() => setIsSettingsOpen(true)}
              className="bg-cassette-plastic border border-white/10 text-white p-3 rounded-full shadow-lg hover:bg-white/10"
            >
               <Settings size={20} />
            </button>
            <button 
              onClick={() => setIsImportOpen(true)}
              className="bg-cassette-accent text-black p-4 rounded-full shadow-[0_0_15px_rgba(255,153,0,0.5)] active:scale-95 transition-transform"
            >
              <Plus size={24} strokeWidth={3} />
            </button>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 relative overflow-hidden flex flex-col">
        
        {view === 'dashboard' && (
          <Dashboard 
            projects={projects} 
            isLoading={isLoading}
            onOpen={handleOpenProject}
            onDelete={handleDeleteProject}
            onTogglePin={handleTogglePin}
            onAddToHome={handleAddToHome}
          />
        )}
        
        {view === 'browser' && (
          <BrowserView />
        )}

        {view === 'runner' && activeProject && (
          <RunnerViewer 
            projectId={activeProject.id} 
            project={activeProject}
            onClose={handleCloseRunner}
            onToggleImmersive={setIsImmersive}
          />
        )}
      </main>

      {/* Modals */}
      {isImportOpen && (
        <ImportModal 
          onClose={() => setIsImportOpen(false)} 
          onSuccess={handleImportSuccess} 
        />
      )}

      {isSettingsOpen && (
        <GlobalSettingsModal 
          onClose={() => setIsSettingsOpen(false)} 
        />
      )}
    </div>
    </ErrorBoundary>
  );
};

export default App;