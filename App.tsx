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
    <div className="min-h-screen bg-cassette-dark text-cassette-text font-mono overflow-hidden flex flex-col bg-noise">
      {/* Cyber Deck Header */}
      {!isImmersive && (
        <header className="h-[70px] bg-cassette-base border-b-4 border-black flex items-center justify-between px-6 shrink-0 z-20 shadow-plastic relative">
          {/* Stripes Decoration */}
          <div className="absolute top-0 left-0 w-full h-1 bg-cassette-accent opacity-50 bg-stripes"></div>

          <div className="flex items-center gap-8">
            <div className="flex items-center gap-3 cursor-pointer group" onClick={() => setView('dashboard')}>
              <div className="bg-cassette-plastic p-2 rounded border border-white/10 group-hover:border-cassette-accent transition-colors">
                 <Disc size={28} className="text-cassette-accent animate-[spin_10s_linear_infinite]" />
              </div>
              <div className="flex flex-col">
                 <h1 className="text-2xl font-industrial tracking-wider text-white leading-none">NEXUS</h1>
                 <span className="text-[10px] text-cassette-accent tracking-[0.3em] uppercase">Data Deck 2.0</span>
              </div>
            </div>
            
            <nav className="flex items-center gap-2 bg-black/30 p-1 rounded">
              <button 
                onClick={() => setView('dashboard')}
                className={`px-6 py-2 rounded-sm text-sm font-bold uppercase transition-all ${
                  view === 'dashboard' 
                    ? 'bg-cassette-accent text-black shadow-[0_0_10px_rgba(255,153,0,0.5)]' 
                    : 'text-cassette-muted hover:text-white hover:bg-white/5'
                }`}
              >
                TAPES
              </button>
              <button 
                onClick={() => setView('browser')}
                className={`px-6 py-2 rounded-sm text-sm font-bold uppercase transition-all ${
                  view === 'browser' 
                    ? 'bg-cassette-highlight text-black shadow-[0_0_10px_rgba(0,229,255,0.5)]' 
                    : 'text-cassette-muted hover:text-white hover:bg-white/5'
                }`}
              >
                NET
              </button>
            </nav>
          </div>
          
          {view !== 'runner' && (
            <div className="flex items-center gap-4">
              <button 
                onClick={() => setIsImportOpen(true)}
                className="flex items-center gap-2 border border-cassette-accent text-cassette-accent hover:bg-cassette-accent hover:text-black px-4 py-2 rounded-sm text-xs font-bold tracking-widest transition-all uppercase"
              >
                <Plus size={16} strokeWidth={3} />
                New Tape
              </button>
              
              <button 
                onClick={() => setIsSettingsOpen(true)}
                className="p-2 text-cassette-muted hover:text-white hover:bg-white/10 rounded-sm transition-colors"
                title="System Config"
              >
                <Settings size={20} />
              </button>
            </div>
          )}
        </header>
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