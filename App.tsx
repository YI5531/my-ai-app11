import React, { useState, useEffect } from 'react';
import { Project, ProjectMetadata } from './types';
import { getAllProjects, deleteProject, saveProject } from './services/storageService';
import Dashboard from './components/Dashboard';
import RunnerViewer from './components/RunnerViewer';
import ImportModal from './components/ImportModal';
import GlobalSettingsModal from './components/GlobalSettingsModal';
import BrowserView from './components/BrowserView';
import { Disc, Globe, Plus, Settings, Gamepad2, Database } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { App as CapacitorApp, URLOpenListenerEvent } from '@capacitor/app';

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

  // Deep Link / Shortcut Handler
  useEffect(() => {
    // 1. Handle Cold Start (App launched from scratch via URL)
    if (!isLoading && projects.length > 0) {
        const checkUrl = (urlStr: string) => {
            try {
                const url = new URL(urlStr);
                // Support both ?id=... and ?project_id=...
                const targetId = url.searchParams.get('id') || url.searchParams.get('project_id');
                
                if (targetId) {
                    const target = projects.find(p => p.id === targetId);
                    if (target) {
                        console.log("Deep link activated:", target.name);
                        handleOpenProject(target);
                        setIsImmersive(true);
                    }
                }
            } catch (e) {
                console.warn("Invalid Deep Link URL", urlStr);
            }
        };

        // Check current URL immediately
        checkUrl(window.location.href);

        // 2. Handle Warm Start (App resumed from background)
        // This is critical for Android Shortcuts when app is already open
        const listener = CapacitorApp.addListener('appUrlOpen', (data: URLOpenListenerEvent) => {
            console.log('App opened with URL:', data.url);
            checkUrl(data.url);
        });

        return () => {
            listener.then(handle => handle.remove());
        };
    }
  }, [isLoading, projects]);

  const handleOpenProject = async (meta: ProjectMetadata) => {
    setActiveProject({ ...meta, files: {} } as Project); 
    setView('runner');
    setIsImmersive(false);
  };

  const handleCloseRunner = () => {
    setView('dashboard');
    setActiveProject(null);
    setIsImmersive(false);
    
    // Clear URL params on close to prevent loop on refresh
    const url = new URL(window.location.href);
    url.search = '';
    window.history.replaceState({}, '', url.toString());
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

  const handleImportSuccess = () => {
    setIsImportOpen(false);
    loadProjects();
  };

  return (
    <div className="min-h-screen bg-cassette-dark text-cassette-text font-mono overflow-hidden flex flex-col bg-noise pb-[env(safe-area-inset-bottom)]">
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
  );
};

export default App;