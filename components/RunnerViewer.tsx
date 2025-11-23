
import React, { useEffect, useState, useRef } from 'react';
import { getProject, updateProject, addLog, getProjectLogs, clearProjectLogs } from '../services/storageService';
import { prepareHtmlForExecution } from '../services/zipService';
import { Project, APP_CONFIG, LogEntry } from '../types';
import { X, ExternalLink, RefreshCw, Smartphone, Monitor, ShieldAlert, Bug, Settings as SettingsIcon, Save, Trash2, Globe, Activity, Loader2, Maximize, Minimize } from 'lucide-react';
import clsx from 'clsx';
import { v4 as uuidv4 } from 'uuid';

interface RunnerViewerProps {
  projectId: string;
  project?: Project;
  onClose: () => void;
}

type ViewMode = 'mobile' | 'expanded' | 'fullscreen';

const RunnerViewer: React.FC<RunnerViewerProps> = ({ projectId, project: initialProject, onClose }) => {
  const [project, setProject] = useState<Project | null>(initialProject || null);
  const [srcDoc, setSrcDoc] = useState<string>('');
  
  // View State
  const [viewMode, setViewMode] = useState<ViewMode>('mobile');
  const [isNativeFullscreen, setIsNativeFullscreen] = useState(false);

  const [isLoading, setIsLoading] = useState(true);
  const [statusMessage, setStatusMessage] = useState('Booting environment...');
  const [isBlockedUrl, setIsBlockedUrl] = useState(false);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isConsoleOpen, setIsConsoleOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [tempApiKey, setTempApiKey] = useState('');

  // Initial Load & Settings
  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      setStatusMessage('Loading project files...');

      // 1. Check Global Preference for View Mode
      const storedMode = localStorage.getItem('nexus_runner_default_mode') as ViewMode;
      const isMobileDevice = window.innerWidth < 768;
      
      // On actual mobile devices, default to 'expanded' (full width) to avoid double-boxing
      if (isMobileDevice) {
          setViewMode('expanded');
      } else if (storedMode) {
          setViewMode(storedMode);
      }

      try {
        let p = project;
        
        // Force DB fetch if files are missing
        if (!p || !p.files || Object.keys(p.files).length === 0) {
            const fullProject = await getProject(projectId);
            if (fullProject) {
                p = fullProject;
                setProject(p);
            } else {
                throw new Error("Project data missing");
            }
        }
        
        setTempApiKey(p.settings?.apiKey || '');

        const history = await getProjectLogs(p.id);
        setLogs(history.sort((a, b) => a.timestamp - b.timestamp));

        if (p.type === 'external_url' && p.externalUrl) {
            const urlObj = new URL(p.externalUrl);
            if (APP_CONFIG.blockedHosts.some(host => urlObj.hostname.includes(host))) {
                setIsBlockedUrl(true);
            }
        } else if (p.type === 'web') {
            setStatusMessage('Transpiling code...');
            setTimeout(async () => {
                const globalKey = localStorage.getItem('nexus_global_api_key') || undefined;
                const html = await prepareHtmlForExecution(p!, globalKey);
                setSrcDoc(html);
                setIsLoading(false);
            }, 100);
            return;
        }
      } catch (e) {
        console.error("Runner load error:", e);
        setStatusMessage('Error loading project');
      } finally {
        if (project?.type === 'external_url') setIsLoading(false);
      }
    };
    load();
  }, [projectId]);

  // Handle Fullscreen Toggle
  const toggleNativeFullscreen = () => {
      if (!document.fullscreenElement) {
          containerRef.current?.requestFullscreen().catch(err => console.error(err));
          setIsNativeFullscreen(true);
          setViewMode('expanded'); // Force expand in fullscreen
      } else {
          document.exitFullscreen();
          setIsNativeFullscreen(false);
      }
  };

  // Sync Fullscreen State listener
  useEffect(() => {
      const handler = () => setIsNativeFullscreen(!!document.fullscreenElement);
      document.addEventListener('fullscreenchange', handler);
      return () => document.removeEventListener('fullscreenchange', handler);
  }, []);

  // Message Listener for Logs
  useEffect(() => {
      const handleMessage = async (event: MessageEvent) => {
          if (event.data?.type === 'NEXUS_LOG' && project) {
              const newLog: LogEntry = {
                  id: uuidv4(),
                  projectId: project.id,
                  timestamp: event.data.payload.timestamp || Date.now(),
                  type: event.data.payload.type || 'info',
                  message: event.data.payload.message || ''
              };
              setLogs(prev => [...prev, newLog]);
              await addLog(newLog);
          }
      };
      window.addEventListener('message', handleMessage);
      return () => window.removeEventListener('message', handleMessage);
  }, [project]);

  const handleOpenExternal = () => {
      if (project?.externalUrl) {
          window.open(project.externalUrl, '_blank');
      }
  };

  const handleRefresh = async () => {
      if (iframeRef.current) {
          if (project?.type === 'external_url') {
              const currentSrc = iframeRef.current.src;
              iframeRef.current.src = '';
              setTimeout(() => { if(iframeRef.current) iframeRef.current.src = currentSrc; }, 10);
          } else if (project) {
              setIsLoading(true);
              setStatusMessage('Recompiling...');
              setTimeout(async () => {
                  const globalKey = localStorage.getItem('nexus_global_api_key') || undefined;
                  const html = await prepareHtmlForExecution(project, globalKey);
                  setSrcDoc(html);
                  setIsLoading(false);
              }, 50);
          }
      }
  };

  const handleClearLogs = async () => {
      if (project) {
          await clearProjectLogs(project.id);
          setLogs([]);
      }
  };

  const saveSettings = async () => {
      if (!project) return;
      
      // Save View Preference if changed
      localStorage.setItem('nexus_runner_default_mode', viewMode === 'fullscreen' ? 'expanded' : viewMode);

      const updatedProject = {
          ...project,
          settings: {
              ...project.settings,
              apiKey: tempApiKey
          }
      };
      await updateProject(updatedProject);
      setProject(updatedProject);
      setIsSettingsOpen(false);
      handleRefresh();
  };

  if (isLoading) {
      return (
          <div className="absolute inset-0 bg-white z-50 flex flex-col items-center justify-center animate-fade-in">
             <div className="relative mb-6">
                <Loader2 className="h-12 w-12 text-nexus-accent animate-spin" />
             </div>
             <p className="text-nexus-text text-lg font-bold">{statusMessage}</p>
          </div>
      );
  }

  // Fallback for Blocked Sites
  if (isBlockedUrl) {
      return (
        <div className="absolute inset-0 z-50 bg-slate-50 flex flex-col">
            <RunnerHeader title={project?.name} onClose={onClose} logCount={0} />
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center animate-fade-in relative overflow-hidden">
                <div className="bg-white p-10 rounded-3xl border border-slate-200 shadow-xl max-w-md w-full relative z-10">
                    <ShieldAlert size={40} className="text-yellow-500 mx-auto mb-6" />
                    <h2 className="text-2xl font-bold text-nexus-text mb-3">External Link Required</h2>
                    <p className="text-nexus-muted mb-8 leading-relaxed">
                        To protect your security, <strong>{new URL(project!.externalUrl!).hostname}</strong> cannot be embedded.
                    </p>
                    <button 
                        onClick={handleOpenExternal}
                        className="w-full bg-nexus-accent hover:bg-blue-600 text-white px-6 py-4 rounded-xl font-bold flex items-center justify-center gap-3 transition-all"
                    >
                        <span>Open in Browser</span>
                        <ExternalLink size={20} />
                    </button>
                </div>
            </div>
        </div>
      );
  }

  return (
    <div ref={containerRef} className="absolute inset-0 z-50 bg-nexus-dark flex flex-col animate-fade-in">
        <RunnerHeader 
            title={project?.name} 
            onClose={onClose} 
            showViewToggle={project?.type !== 'external_url'} 
            viewMode={viewMode} 
            onRefresh={handleRefresh}
            onToggleConsole={() => setIsConsoleOpen(!isConsoleOpen)}
            onToggleSettings={() => setIsSettingsOpen(true)}
            onToggleFullscreen={toggleNativeFullscreen}
            isNativeFullscreen={isNativeFullscreen}
            logCount={logs.length}
        />
        
        <div className="flex-1 relative flex flex-col items-center justify-center bg-slate-200 overflow-hidden">
            <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(#94a3b8 1px, transparent 1px)', backgroundSize: '24px 24px' }}></div>

            <div className={`transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] relative bg-white overflow-hidden shadow-2xl flex-shrink-0 origin-center ${
                viewMode === 'mobile' && !isNativeFullscreen
                ? 'w-[375px] h-[667px] rounded-[36px] border-[8px] border-[#1e293b] ring-1 ring-white/10 shadow-[0_20px_60px_rgba(0,0,0,0.3)]' 
                : 'w-full h-full rounded-none border-none'
            }`}>
                <iframe
                    ref={iframeRef}
                    title="app-runner"
                    src={project?.type === 'external_url' ? project.externalUrl : undefined}
                    srcDoc={project?.type !== 'external_url' ? srcDoc : undefined}
                    sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals allow-downloads allow-pointer-lock allow-presentation"
                    className="w-full h-full bg-white"
                    allow="camera; microphone; geolocation; autoplay; clipboard-write"
                />
            </div>
        </div>

        {/* Console Panel */}
        {isConsoleOpen && (
            <div className="h-1/3 min-h-[250px] bg-[#1e293b] border-t border-slate-700 flex flex-col animate-slide-up absolute bottom-0 w-full z-20 shadow-2xl">
                <div className="flex items-center justify-between px-4 py-2 bg-[#0f172a] border-b border-slate-700">
                    <div className="flex items-center gap-3">
                        <Bug size={18} className="text-white" />
                        <span className="text-sm font-bold text-white uppercase tracking-wider">Console</span>
                        <span className="bg-nexus-accent text-white text-[10px] font-bold px-2 py-0.5 rounded-full">{logs.length}</span>
                    </div>
                    <div className="flex gap-2">
                        <button onClick={handleClearLogs} className="flex items-center gap-1 text-xs text-slate-400 hover:text-red-400 px-3 py-1.5 hover:bg-white/5 rounded-lg transition-colors">
                            <Trash2 size={14} /> Clear
                        </button>
                        <button onClick={() => setIsConsoleOpen(false)} className="p-1.5 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg">
                            <X size={16} />
                        </button>
                    </div>
                </div>
                <div className="flex-1 overflow-y-auto p-4 font-mono text-xs space-y-1.5 scroll-smooth text-slate-300">
                     {/* Logs rendering... */}
                     {logs.length === 0 ? <div className="text-center text-slate-600 mt-10">No logs</div> : logs.map(l => (
                        <div key={l.id} className={clsx("p-1", l.type === 'error' ? 'text-red-400' : 'text-slate-300')}>{l.message}</div>
                     ))}
                </div>
            </div>
        )}

        {/* Settings Modal */}
        {isSettingsOpen && (
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm z-30 flex items-center justify-center p-6 animate-fade-in">
                <div className="bg-white w-full max-w-sm rounded-2xl p-6 shadow-2xl animate-slide-up border border-slate-200">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-lg font-bold text-nexus-text">Configuration</h3>
                        <button onClick={() => setIsSettingsOpen(false)}><X size={20} className="text-nexus-muted" /></button>
                    </div>
                    <div className="space-y-5">
                        {/* View Mode Settings */}
                        <div>
                            <label className="block text-[10px] font-bold uppercase tracking-wider text-nexus-muted mb-3">Screen Mode</label>
                            <div className="grid grid-cols-2 gap-2">
                                <button 
                                    onClick={() => setViewMode('mobile')} 
                                    className={`flex flex-col items-center gap-2 p-3 rounded-xl border transition-all ${viewMode === 'mobile' ? 'border-nexus-accent bg-blue-50 text-nexus-accent' : 'border-slate-200 hover:bg-slate-50 text-nexus-muted'}`}
                                >
                                    <Smartphone size={20} />
                                    <span className="text-xs font-bold">Mobile Sim</span>
                                </button>
                                <button 
                                    onClick={() => setViewMode('expanded')} 
                                    className={`flex flex-col items-center gap-2 p-3 rounded-xl border transition-all ${viewMode === 'expanded' ? 'border-nexus-accent bg-blue-50 text-nexus-accent' : 'border-slate-200 hover:bg-slate-50 text-nexus-muted'}`}
                                >
                                    <Monitor size={20} />
                                    <span className="text-xs font-bold">Expanded</span>
                                </button>
                            </div>
                        </div>

                        <div>
                            <label className="block text-[10px] font-bold uppercase tracking-wider text-nexus-muted mb-2">API Key</label>
                            <input 
                                type="password" 
                                value={tempApiKey}
                                onChange={(e) => setTempApiKey(e.target.value)}
                                placeholder="Inherit from Global Settings"
                                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-3 text-sm focus:outline-none focus:border-nexus-accent"
                            />
                        </div>

                        <button 
                            onClick={saveSettings}
                            className="w-full bg-nexus-accent hover:bg-blue-600 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-nexus-accent/20"
                        >
                            <Save size={18} /> Apply & Reload
                        </button>
                    </div>
                </div>
            </div>
        )}
    </div>
  );
};

const RunnerHeader = ({ 
    title, onClose, showViewToggle, viewMode, onRefresh, onToggleConsole, onToggleSettings, onToggleFullscreen, isNativeFullscreen, logCount
}: any) => (
    <div className="flex items-center justify-between px-4 py-2 bg-white border-b border-nexus-border z-10 shrink-0 shadow-sm h-14">
        <div className="flex items-center gap-3 overflow-hidden">
            <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full text-nexus-muted hover:text-nexus-text">
                <X size={20} />
            </button>
            <div className="flex flex-col">
                <h1 className="font-bold text-nexus-text text-sm truncate max-w-[120px] sm:max-w-xs">{title || 'Runner'}</h1>
                <span className="text-[10px] text-green-600 flex items-center gap-1 uppercase tracking-wider font-bold">
                    <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span>
                    Running
                </span>
            </div>
        </div>
        
        <div className="flex items-center gap-2">
            {showViewToggle && (
                <button 
                    onClick={onToggleFullscreen} 
                    className={`hidden sm:flex p-2 rounded-lg transition-colors ${isNativeFullscreen ? 'text-nexus-accent bg-blue-50' : 'text-nexus-muted hover:bg-slate-100'}`}
                    title="Toggle Fullscreen"
                >
                    {isNativeFullscreen ? <Minimize size={18} /> : <Maximize size={18} />}
                </button>
            )}

            <button onClick={onToggleConsole} className={clsx(
                "relative p-2 rounded-lg transition-all",
                logCount > 0 ? "text-nexus-accent bg-blue-50" : "text-nexus-muted hover:text-nexus-text hover:bg-slate-100"
            )}>
                <Bug size={18} />
            </button>
            <button onClick={onToggleSettings} className="p-2 text-nexus-muted hover:text-nexus-text hover:bg-slate-100 rounded-lg">
                <SettingsIcon size={18} />
            </button>
            <button onClick={onRefresh} className="p-2 text-nexus-muted hover:text-nexus-text hover:bg-slate-100 rounded-lg active:rotate-180 duration-500">
                <RefreshCw size={18} />
            </button>
        </div>
    </div>
);

export default RunnerViewer;
