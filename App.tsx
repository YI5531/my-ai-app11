
import React, { useState, useEffect } from 'react';
import { Project, ProjectMetadata } from './types';
import { getAllProjects, deleteProject, saveProject } from './services/storageService';
import Dashboard from './components/Dashboard';
import RunnerViewer from './components/RunnerViewer';
import ImportModal from './components/ImportModal';
import GlobalSettingsModal from './components/GlobalSettingsModal';
import BrowserView from './components/BrowserView';
import { Layers, Plus, Settings, Globe, LayoutGrid } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';

const App: React.FC = () => {
  const [view, setView] = useState<'dashboard' | 'runner' | 'browser'>('dashboard');
  const [activeProject, setActiveProject] = useState<Project | null>(null);
  const [projects, setProjects] = useState<ProjectMetadata[]>([]);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

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
    // Pass metadata to runner, which loads full content
    setActiveProject({ ...meta, files: {} } as Project); 
    setView('runner');
  };

  const handleCloseRunner = () => {
    setView('dashboard');
    setActiveProject(null);
  };

  const handleDeleteProject = async (id: string, e: React.MouseEvent) => {
    // Crucial: Stop propagation immediately to prevent opening the app
    e.stopPropagation();
    e.nativeEvent.stopImmediatePropagation();
    
    if (confirm('Are you sure you want to delete this app? This action cannot be undone.')) {
      await deleteProject(id);
      loadProjects();
    }
  };

  const handleImportSuccess = () => {
    setIsImportOpen(false);
    loadProjects();
  };

  return (
    <div className="min-h-screen bg-nexus-dark text-nexus-text font-sans selection:bg-nexus-accent selection:text-white overflow-hidden flex flex-col">
      {/* Top Bar - Light Theme */}
      <header className="flex items-center justify-between px-6 py-4 bg-nexus-card border-b border-nexus-border sticky top-0 z-50">
        <div className="flex items-center gap-3 cursor-pointer group" onClick={() => setView('dashboard')}>
          <div className="p-2 bg-nexus-accent rounded-lg shadow-md shadow-nexus-accent/20 transition-transform group-hover:scale-105">
            <Layers size={20} className="text-white" />
          </div>
          <h1 className="text-xl font-bold tracking-tight text-nexus-text">
            Nexus Runner
          </h1>
        </div>
        
        {view !== 'runner' && (
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setIsSettingsOpen(true)}
              className="p-2.5 rounded-full hover:bg-slate-100 text-nexus-muted hover:text-nexus-text transition-colors"
            >
              <Settings size={20} />
            </button>
            <button 
              onClick={() => setIsImportOpen(true)}
              className="p-2.5 rounded-full bg-nexus-accent hover:bg-blue-700 active:scale-95 transition-all shadow-md shadow-nexus-accent/20"
            >
              <Plus size={20} className="text-white" />
            </button>
          </div>
        )}
      </header>

      {/* Main Content Area */}
      <main className="flex-1 relative overflow-hidden flex flex-col bg-nexus-dark">
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
          />
        )}
      </main>

      {/* Bottom Nav - Light Theme */}
      {view !== 'runner' && (
         <div className="bg-nexus-card border-t border-nexus-border px-6 py-2 flex items-center justify-around pb-6 lg:pb-2 shadow-[0_-5px_15px_rgba(0,0,0,0.02)] z-40">
            <button 
               onClick={() => setView('dashboard')}
               className={`flex flex-col items-center gap-1.5 px-6 py-2 rounded-xl transition-all ${view === 'dashboard' ? 'text-nexus-accent bg-blue-50' : 'text-nexus-muted hover:text-nexus-text'}`}
            >
               <LayoutGrid size={22} strokeWidth={2.5} />
               <span className="text-[10px] font-bold uppercase tracking-wide">Apps</span>
            </button>
            
            <button 
               onClick={() => setView('browser')}
               className={`flex flex-col items-center gap-1.5 px-6 py-2 rounded-xl transition-all ${view === 'browser' ? 'text-nexus-accent bg-blue-50' : 'text-nexus-muted hover:text-nexus-text'}`}
            >
               <Globe size={22} strokeWidth={2.5} />
               <span className="text-[10px] font-bold uppercase tracking-wide">Browser</span>
            </button>
         </div>
      )}

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