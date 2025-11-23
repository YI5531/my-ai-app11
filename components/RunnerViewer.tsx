
import React, { useEffect, useState, useRef } from 'react';
import { getProject, updateProject, addLog, getProjectLogs, clearProjectLogs } from '../services/storageService';
import { prepareHtmlForExecution } from '../services/zipService';
import { Project, APP_CONFIG, LogEntry } from '../types';
import { X, ExternalLink, RefreshCw, Smartphone, Monitor, ShieldAlert, Bug, Settings as SettingsIcon, Save, Trash2, Globe, Activity, Loader2 } from 'lucide-react';
import clsx from 'clsx';
import { v4 as uuidv4 } from 'uuid';

interface RunnerViewerProps {
  projectId: string;
  project?: Project;
  onClose: () => void;
}

const RunnerViewer: React.FC<RunnerViewerProps> = ({ projectId, project: initialProject, onClose }) => {
  const [project, setProject] = useState<Project | null>(initialProject || null);
  const [srcDoc, setSrcDoc] = useState<string>('');
  const [viewMode, setViewMode] = useState<'mobile' | 'desktop'>('mobile');
  const [isLoading, setIsLoading] = useState(true);
  const [statusMessage, setStatusMessage] = useState('Booting environment...');
  const [isBlockedUrl, setIsBlockedUrl] = useState(false);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isConsoleOpen, setIsConsoleOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [tempApiKey, setTempApiKey] = useState('');

  // Initial Load
  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      setStatusMessage('Loading project files...');
      try {
        let p = project;
        
        // Force DB fetch if files are missing (fix for Loaded Files 0)
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
            // Small delay to allow UI to update before heavy transpilation
            setTimeout(async () => {
                const globalKey = localStorage.getItem('nexus_global_api_key') || undefined;
                const html = await prepareHtmlForExecution(p!, globalKey);
                setSrcDoc(html);
                setIsLoading(false);
            }, 100);
            return; // Return here to avoid setting loading false immediately
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
             <p className="mt-2 text-nexus-muted text-sm font-medium tracking-wider animate-pulse">
                {project?.name || 'SYSTEM'}
             </p>
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
    <div className="absolute inset-0 z-50 bg-nexus-dark flex flex-col animate-fade-in">
        <RunnerHeader 
            title={project?.name} 
            onClose={onClose} 
            showViewToggle={project?.type !== 'external_url'} 
            viewMode={viewMode} 
            setViewMode={setViewMode}
            onRefresh={handleRefresh}
            onToggleConsole={() => setIsConsoleOpen(!isConsoleOpen)}
            onToggleSettings={() => setIsSettingsOpen(true)}
            logCount={logs.length}
        />
        
        <div className="flex-1 relative flex flex-col items-center justify-center bg-slate-200 overflow-hidden">
            <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(#94a3b8 1px, transparent 1px)', backgroundSize: '24px 24px' }}></div>

            <div className={`transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] relative bg-white overflow-hidden shadow-2xl flex-shrink-0 origin-center ${
                viewMode === 'mobile' 
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

        {/* Console Panel (Dark theme for code contrast) */}
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
                    {logs.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-slate-600 gap-2">
                            <Activity size={32} />
                            <p>No logs recorded.</p>
                        </div>
                    ) : (
                        logs.map((log) => (
                            <div key={log.id} className={clsx(
                                "flex gap-3 p-2 rounded transition-colors border-l-2 select-text",
                                log.type === 'error' ? 'bg-red-900/20 border-red-500 text-red-200' :
                                log.type === 'warn' ? 'bg-yellow-900/20 border-yellow-500 text-yellow-200' :
                                'hover:bg-white/5 border-transparent'
                            )}>
                                <span className="opacity-50 shrink-0 w-20 pt-0.5">
                                    {new Date(log.timestamp).toLocaleTimeString([], { hour12: false, hour: '2-digit', minute:'2-digit', second:'2-digit' })}
                                </span>
                                <span className="flex-1 break-all whitespace-pre-wrap font-medium">
                                    {log.message}
                                </span>
                            </div>
                        ))
                    )}
                </div>
            </div>
        )}

        {isSettingsOpen && (
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm z-30 flex items-center justify-center p-6 animate-fade-in">
                <div className="bg-white w-full max-w-sm rounded-2xl p-6 shadow-2xl animate-slide-up border border-slate-200">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-lg font-bold text-nexus-text">App Configuration</h3>
                        <button onClick={() => setIsSettingsOpen(false)}><X size={20} className="text-nexus-muted" /></button>
                    </div>
                    <div className="space-y-5">
                        <div>
                            <label className="block text-[10px] font-bold uppercase tracking-wider text-nexus-muted mb-2">Instance Name</label>
                            <input disabled value={project?.name} className="w-full bg-slate-100 border border-slate-200 rounded-lg px-3 py-2 text-nexus-muted cursor-not-allowed text-sm" />
                        </div>
                        <div>
                            <label className="block text-[10px] font-bold uppercase tracking-wider text-nexus-muted mb-2">Environment API Key</label>
                            <input 
                                type="password" 
                                value={tempApiKey}
                                onChange={(e) => setTempApiKey(e.target.value)}
                                placeholder="Inherit from Global Settings"
                                className="w-full bg-white border border-slate-200 rounded-lg px-3 py-3 text-nexus-text focus:outline-none focus:border-nexus-accent transition-colors text-sm"
                            />
                        </div>
                        <button 
                            onClick={saveSettings}
                            className="w-full bg-nexus-accent hover:bg-blue-600 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 mt-2 transition-transform active:scale-95 shadow-lg shadow-nexus-accent/20"
                        >
                            <Save size={18} /> Apply Changes
                        </button>
                    </div>
                </div>
            </div>
        )}
    </div>
  );
};

const RunnerHeader = ({ 
    title, onClose, showViewToggle, viewMode, setViewMode, onRefresh, onToggleConsole, onToggleSettings, logCount
}: any) => (
    <div className="flex items-center justify-between px-4 py-2 bg-white border-b border-nexus-border z-10 shrink-0 shadow-sm h-14">
        <div className="flex items-center gap-3 overflow-hidden">
            <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors active:scale-90 text-nexus-muted hover:text-nexus-text">
                <X size={20} />
            </button>
            <div className="flex flex-col">
                <h1 className="font-bold text-nexus-text text-sm truncate max-w-[120px] sm:max-w-xs">{title || 'Runner'}</h1>
                <span className="text-[10px] text-green-600 flex items-center gap-1 uppercase tracking-wider font-bold">
                    <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span>
                    Active
                </span>
            </div>
        </div>
        
        <div className="flex items-center gap-2">
            <button onClick={onToggleConsole} className={clsx(
                "relative p-2 rounded-lg transition-all",
                logCount > 0 ? "text-nexus-accent bg-blue-50" : "text-nexus-muted hover:text-nexus-text hover:bg-slate-100"
            )} title="System Diary">
                <Bug size={18} />
                {logCount > 0 && <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-nexus-accent rounded-full border-2 border-white"></span>}
            </button>
            <button onClick={onToggleSettings} className="p-2 text-nexus-muted hover:text-nexus-text hover:bg-slate-100 rounded-lg transition-colors" title="Settings">
                <SettingsIcon size={18} />
            </button>
            <button onClick={onRefresh} className="p-2 text-nexus-muted hover:text-nexus-text hover:bg-slate-100 rounded-lg transition-colors active:rotate-180 duration-500" title="Reload System">
                <RefreshCw size={18} />
            </button>
            
            {showViewToggle && (
                <div className="hidden sm:flex bg-slate-100 rounded-lg p-1 border border-slate-200 ml-2">
                    <button 
                        onClick={() => setViewMode('mobile')}
                        className={`p-1.5 rounded-md transition-all ${viewMode === 'mobile' ? 'bg-white text-nexus-accent shadow-sm' : 'text-nexus-muted hover:text-nexus-text'}`}
                    >
                        <Smartphone size={16} />
                    </button>
                    <button 
                        onClick={() => setViewMode('desktop')}
                        className={`p-1.5 rounded-md transition-all ${viewMode === 'desktop' ? 'bg-white text-nexus-accent shadow-sm' : 'text-nexus-muted hover:text-nexus-text'}`}
                    >
                        <Monitor size={16} />
                    </button>
                </div>
            )}
        </div>
    </div>
);

export default RunnerViewer;