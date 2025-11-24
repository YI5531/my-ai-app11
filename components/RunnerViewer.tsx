
import React, { useEffect, useState, useRef } from 'react';
import { getProject, updateProject, addLog, getProjectLogs } from '../services/storageService';
import { prepareHtmlForExecution } from '../services/zipService';
import { Project, APP_CONFIG, LogEntry } from '../types';
import { X, RefreshCw, Bug, Settings as SettingsIcon, Minimize2, LogOut, ShieldAlert } from 'lucide-react';
import clsx from 'clsx';
import { v4 as uuidv4 } from 'uuid';

interface RunnerViewerProps {
  projectId: string;
  project?: Project;
  onClose: () => void;
  onToggleImmersive: (isImmersive: boolean) => void;
}

type ViewMode = 'mobile' | 'expanded';

const RunnerViewer: React.FC<RunnerViewerProps> = ({ projectId, project: initialProject, onClose, onToggleImmersive }) => {
  const [project, setProject] = useState<Project | null>(initialProject || null);
  const [srcDoc, setSrcDoc] = useState<string>('');
  const [viewMode, setViewMode] = useState<ViewMode>('mobile');
  const [isImmersiveMode, setIsImmersiveMode] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [statusMessage, setStatusMessage] = useState('MOUNTING TAPE...');
  const [isBlockedUrl, setIsBlockedUrl] = useState(false);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isConsoleOpen, setIsConsoleOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [tempApiKey, setTempApiKey] = useState('');

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      setStatusMessage('READING DATA...');
      const storedMode = localStorage.getItem('nexus_runner_default_mode') as ViewMode;
      const isMobileDevice = window.innerWidth < 768;
      if (isMobileDevice) {
          setViewMode('expanded');
      } else if (storedMode) {
          setViewMode(storedMode);
      }
      try {
        let p = project;
        if (!p || !p.files || Object.keys(p.files).length === 0) {
            const fullProject = await getProject(projectId);
            if (fullProject) {
                p = fullProject;
                setProject(p);
            } else {
                throw new Error("Data Corruption");
            }
        }
        setTempApiKey(p.settings?.apiKey || '');
        const history = await getProjectLogs(p.id);
        setLogs(history.sort((a, b) => a.timestamp - b.timestamp));
        if (p.type === 'external_url' && p.externalUrl) {
            const urlObj = new URL(p.externalUrl);
            if (APP_CONFIG.blockedHosts.some(host => urlObj.hostname.includes(host))) setIsBlockedUrl(true);
        } else if (p.type === 'web') {
            setStatusMessage('EXECUTING...');
            setTimeout(async () => {
                const globalKey = localStorage.getItem('nexus_global_api_key') || undefined;
                const html = await prepareHtmlForExecution(p!, globalKey);
                setSrcDoc(html);
                setIsLoading(false);
            }, 300);
            return;
        }
      } catch (e) {
        setStatusMessage('READ ERROR.');
      } finally {
        if (project?.type === 'external_url') setIsLoading(false);
      }
    };
    load();
  }, [projectId]);

  useEffect(() => {
      const handleMessage = async (event: MessageEvent) => {
          if (event.data?.type === 'NEXUS_LOG' && project) {
              const newLog: LogEntry = { id: uuidv4(), projectId: project.id, timestamp: Date.now(), type: event.data.payload.type || 'info', message: event.data.payload.message || '' };
              setLogs(prev => [...prev, newLog]);
              await addLog(newLog);
          }
      };
      window.addEventListener('message', handleMessage);
      return () => window.removeEventListener('message', handleMessage);
  }, [project]);

  const handleOpenExternal = () => {
      if (project?.externalUrl) window.open(project.externalUrl, '_blank');
  };

  const handleRefresh = async () => {
      if (iframeRef.current) {
          setIsLoading(true);
          setStatusMessage('REWINDING...');
          if (project?.type === 'external_url') {
              const currentSrc = iframeRef.current.src;
              iframeRef.current.src = '';
              setTimeout(() => { if(iframeRef.current) iframeRef.current.src = currentSrc; setIsLoading(false); }, 500);
          } else if (project) {
              setTimeout(async () => {
                  const globalKey = localStorage.getItem('nexus_global_api_key') || undefined;
                  const html = await prepareHtmlForExecution(project, globalKey);
                  setSrcDoc(html);
                  setIsLoading(false);
              }, 500);
          }
      }
  };

  const handleExitImmersive = () => {
      setIsImmersiveMode(false);
      onToggleImmersive(false);
      if (document.fullscreenElement) document.exitFullscreen().catch(e => console.error(e));
  };

  const saveSettings = async () => {
      if (!project) return;
      localStorage.setItem('nexus_runner_default_mode', viewMode);
      const updatedProject = { ...project, settings: { ...project.settings, apiKey: tempApiKey } };
      await updateProject(updatedProject);
      setProject(updatedProject);
      setIsSettingsOpen(false);
      handleRefresh();
      if (isImmersiveMode) {
          onToggleImmersive(true);
          setViewMode('expanded');
          containerRef.current?.requestFullscreen().catch(e => console.error(e));
      }
  };

  if (isLoading) {
      return (
          <div className="absolute inset-0 bg-cassette-dark z-50 flex flex-col items-center justify-center animate-fade-in font-mono">
             <div className="text-cassette-accent font-industrial text-2xl mb-4 tracking-widest">{statusMessage}</div>
             <div className="w-64 h-4 bg-black border border-cassette-plastic rounded-full overflow-hidden">
                 <div className="h-full bg-cassette-accent animate-[width_2s_ease-in-out_infinite] w-1/2"></div>
             </div>
          </div>
      );
  }

  if (isBlockedUrl) {
      return (
        <div className="absolute inset-0 z-50 bg-cassette-dark flex flex-col font-mono text-white">
            <RunnerHeader title={project?.name} onClose={onClose} logCount={0} />
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center animate-fade-in">
                <div className="bg-cassette-plastic p-10 rounded-sm shadow-xl max-w-md w-full border-2 border-red-900/50">
                    <ShieldAlert size={48} className="text-red-500 mx-auto mb-4" />
                    <h2 className="text-2xl font-industrial mb-2 text-white">PROTOCOL ERROR</h2>
                    <p className="text-gray-400 mb-6 text-sm font-mono">
                        Target domain ({new URL(project!.externalUrl!).hostname}) rejects embedded connection.
                    </p>
                    <button onClick={handleOpenExternal} className="w-full bg-cassette-accent text-black rounded-sm px-6 py-3 font-bold hover:bg-white transition-colors uppercase tracking-widest">
                        Launch Externally
                    </button>
                </div>
            </div>
        </div>
      );
  }

  return (
    <div ref={containerRef} className="absolute inset-0 z-50 bg-cassette-dark flex flex-col animate-fade-in font-mono text-gray-200">
        {!isImmersiveMode && (
            <RunnerHeader 
                title={project?.name} 
                onClose={onClose} 
                showViewToggle={project?.type !== 'external_url'} 
                viewMode={viewMode} 
                onRefresh={handleRefresh}
                onToggleConsole={() => setIsConsoleOpen(!isConsoleOpen)}
                onToggleSettings={() => setIsSettingsOpen(true)}
                logCount={logs.length}
            />
        )}
        
        <div className="flex-1 relative flex flex-col items-center justify-center bg-[#111] overflow-hidden bg-noise shadow-bezel">
            <div className={`transition-all duration-300 relative overflow-hidden flex-shrink-0 origin-center ${
                viewMode === 'mobile' && !isImmersiveMode
                ? 'w-[375px] h-[667px] border-[12px] border-[#252830] rounded-lg shadow-2xl' 
                : 'w-full h-full border-none'
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

        {isImmersiveMode && (
            <button onClick={handleExitImmersive} className="absolute bottom-6 right-6 z-50 bg-cassette-accent/80 hover:bg-white text-black p-3 rounded-sm backdrop-blur-md transition-all shadow-[0_0_15px_rgba(255,153,0,0.6)]">
                <Minimize2 size={24} />
            </button>
        )}

        {isConsoleOpen && !isImmersiveMode && (
            <div className="h-1/3 min-h-[250px] bg-black border-t-4 border-cassette-plastic flex flex-col animate-slide-up absolute bottom-0 w-full z-20 shadow-2xl font-mono text-xs">
                <div className="flex items-center justify-between px-4 py-1 bg-cassette-plastic text-white border-b border-white/10">
                    <span className="font-bold uppercase tracking-wider text-cassette-accent">DEBUG_LOG_OUTPUT</span>
                    <button onClick={() => setIsConsoleOpen(false)}><X size={14} className="text-gray-400 hover:text-white" /></button>
                </div>
                <div className="flex-1 overflow-y-auto p-4 space-y-1 text-cassette-highlight/80">
                     {logs.map(l => (
                        <div key={l.id} className={clsx("p-1 border-b border-white/5", l.type === 'error' ? 'text-red-500' : 'text-green-400')}>
                            <span className="opacity-50 mr-2">[{new Date(l.timestamp).toLocaleTimeString()}]</span>
                            {l.message}
                        </div>
                     ))}
                </div>
            </div>
        )}

        {isSettingsOpen && (
            <div className="absolute inset-0 bg-black/90 backdrop-blur-sm z-30 flex items-center justify-center p-6 animate-fade-in">
                <div className="bg-cassette-plastic w-full max-w-sm p-6 rounded-sm shadow-2xl border border-cassette-accent">
                    <div className="flex justify-between items-center mb-6 border-b border-white/10 pb-2">
                        <h3 className="text-lg font-industrial text-white uppercase tracking-wide">SYS_CONFIG</h3>
                        <button onClick={() => setIsSettingsOpen(false)}><X size={20} className="text-gray-400 hover:text-white" /></button>
                    </div>
                    <div className="space-y-5">
                        <div className="grid grid-cols-2 gap-2 mb-3">
                            <button onClick={() => setViewMode('mobile')} className={`p-3 border rounded-sm text-xs font-bold uppercase ${viewMode === 'mobile' ? 'bg-cassette-accent text-black border-transparent' : 'border-white/20 text-gray-400 hover:text-white'}`}>Mobile</button>
                            <button onClick={() => setViewMode('expanded')} className={`p-3 border rounded-sm text-xs font-bold uppercase ${viewMode === 'expanded' ? 'bg-cassette-accent text-black border-transparent' : 'border-white/20 text-gray-400 hover:text-white'}`}>Wide</button>
                        </div>
                        <button onClick={() => setIsImmersiveMode(!isImmersiveMode)} className={`w-full p-3 border rounded-sm font-bold text-xs uppercase flex justify-between items-center ${isImmersiveMode ? 'bg-cassette-highlight text-black border-transparent' : 'border-white/20 text-gray-400 hover:text-white'}`}>
                            <span>Immersive Mode</span>
                            <div className={`w-3 h-3 rounded-full border border-current ${isImmersiveMode ? 'bg-black border-transparent' : 'bg-transparent'}`}></div>
                        </button>
                        <input type="password" value={tempApiKey} onChange={(e) => setTempApiKey(e.target.value)} placeholder="OVERRIDE_API_KEY" className="w-full bg-black border border-white/20 p-2 text-xs text-cassette-highlight rounded-sm outline-none focus:border-cassette-accent" />
                        <button onClick={saveSettings} className="w-full bg-white text-black font-bold py-3 rounded-sm shadow-md hover:bg-gray-200 transition-all uppercase tracking-widest">Execute</button>
                    </div>
                </div>
            </div>
        )}
    </div>
  );
};

const RunnerHeader = ({ title, onClose, showViewToggle, viewMode, onRefresh, onToggleConsole, onToggleSettings, logCount }: any) => (
    <div className="flex items-center justify-between px-4 py-2 bg-cassette-plastic border-b-4 border-black z-10 shrink-0 h-16 shadow-lg">
        <div className="flex items-center gap-4">
            <button 
                onClick={onClose} 
                className="group flex flex-col items-center justify-center bg-black border border-white/10 hover:border-red-500 w-12 h-10 rounded-sm transition-all active:scale-95"
                title="EJECT TAPE"
            >
                <LogOut size={16} className="text-gray-500 group-hover:text-red-500 mb-[2px]" />
                <span className="text-[8px] text-gray-600 font-bold">EJECT</span>
            </button>
            
            <div className="flex flex-col border-l border-white/10 pl-4">
                <h1 className="font-industrial text-white text-xl tracking-wider uppercase leading-none max-w-[200px] truncate">{title || 'UNKNOWN'}</h1>
                <div className="flex gap-2 items-center">
                    <div className="w-2 h-2 rounded-full bg-cassette-accent animate-pulse"></div>
                    <span className="text-[10px] text-cassette-accent font-mono uppercase tracking-widest">PLAYING</span>
                </div>
            </div>
        </div>
        
        <div className="flex items-center gap-2">
            <button onClick={onToggleConsole} className={clsx("p-2 rounded hover:bg-white/10 transition-colors relative", logCount > 0 ? "text-cassette-highlight" : "text-gray-400")}>
                <Bug size={20} />
                {logCount > 0 && <span className="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full"></span>}
            </button>
            <button onClick={onToggleSettings} className="p-2 text-gray-400 hover:bg-white/10 hover:text-white rounded transition-colors"><SettingsIcon size={20} /></button>
            <button onClick={onRefresh} className="p-2 text-gray-400 hover:bg-white/10 hover:text-white rounded transition-colors"><RefreshCw size={20} /></button>
        </div>
    </div>
);

export default RunnerViewer;
