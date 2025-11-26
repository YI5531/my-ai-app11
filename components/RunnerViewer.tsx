
import React, { useEffect, useState, useRef } from 'react';
import { getProject, updateProject, addLog, getProjectLogs } from '../services/storageService';
import { prepareHtmlForExecution } from '../services/zipService';
import { Project, APP_CONFIG, LogEntry } from '../types';
import { X, RefreshCw, Bug, Settings as SettingsIcon, LogOut, ShieldCheck, Smartphone, Monitor, ExternalLink, Globe } from 'lucide-react';
import { Browser } from '@capacitor/browser';
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
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isConsoleOpen, setIsConsoleOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [tempApiKey, setTempApiKey] = useState('');
  const wakeLockRef = useRef<any>(null);

  // Request Wake Lock for background Audio/Games
  useEffect(() => {
    const requestWakeLock = async () => {
        if ('wakeLock' in navigator) {
            try {
                wakeLockRef.current = await (navigator as any).wakeLock.request('screen');
                console.log('Screen Wake Lock active');
            } catch (err) {
                console.warn(`Wake Lock Error: ${err}`);
            }
        }
    };
    
    // Call immediately
    requestWakeLock();

    // Re-acquire lock if visibility changes (app switching)
    const handleVisibilityChange = () => {
        if (document.visibilityState === 'visible') {
            requestWakeLock();
        }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
        document.removeEventListener('visibilitychange', handleVisibilityChange);
        if (wakeLockRef.current) {
            wakeLockRef.current.release().catch((e: any) => console.log('Wake Lock release error', e));
        }
    };
  }, []);

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
        
        // If it is a web project, prepare the HTML
        if (p.type === 'web') {
            setStatusMessage('EXECUTING...');
            setTimeout(async () => {
                const globalKey = localStorage.getItem('nexus_global_api_key') || undefined;
                const html = await prepareHtmlForExecution(p!, globalKey);
                setSrcDoc(html);
                setIsLoading(false);
            }, 300);
        } else {
            // External URL projects don't need compilation
            setIsLoading(false);
        }

      } catch (e) {
        setStatusMessage('READ ERROR.');
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

  const handleLaunchNative = async () => {
      if (!project?.externalUrl) return;
      try {
          await Browser.open({ 
              url: project.externalUrl,
              presentationStyle: 'popover',
              toolbarColor: '#1a1c21'
          });
      } catch (e) {
          console.error("Failed to open native browser", e);
          // Fallback for non-capacitor environments
          window.open(project.externalUrl, '_blank');
      }
  };

  const handleRefresh = async () => {
      if (navigator.vibrate) navigator.vibrate(20);
      if (project?.type === 'web') {
          setIsLoading(true);
          setStatusMessage('REWINDING...');
          setTimeout(async () => {
              const globalKey = localStorage.getItem('nexus_global_api_key') || undefined;
              const html = await prepareHtmlForExecution(project, globalKey);
              setSrcDoc(html);
              setIsLoading(false);
          }, 500);
      } else {
          // Re-launch for external
          handleLaunchNative();
      }
  };

  const handleExitImmersive = () => {
      if (navigator.vibrate) navigator.vibrate(10);
      setIsImmersiveMode(false);
      onToggleImmersive(false);
      if (document.fullscreenElement) document.exitFullscreen().catch(e => console.error(e));
  };

  const toggleViewMode = () => {
      setViewMode(prev => prev === 'mobile' ? 'expanded' : 'mobile');
  };

  const saveSettings = async () => {
      if (!project) return;
      localStorage.setItem('nexus_runner_default_mode', viewMode);
      const updatedProject = { ...project, settings: { ...project.settings, apiKey: tempApiKey } };
      await updateProject(updatedProject);
      setProject(updatedProject);
      setIsSettingsOpen(false);
      if (project.type === 'web') handleRefresh();
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

  // --- RENDER EXTERNAL URL LAUNCHER (No Iframe) ---
  if (project?.type === 'external_url') {
      return (
        <div className="absolute inset-0 z-50 bg-cassette-dark flex flex-col font-mono text-white">
            <RunnerHeader title={project.name} onClose={onClose} showViewToggle={false} logCount={0} onToggleSettings={() => setIsSettingsOpen(true)} />
            
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center animate-fade-in bg-noise relative">
                {/* Background Decoration */}
                <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-cassette-highlight via-transparent to-transparent"></div>

                <div className="bg-[#1e293b] p-8 sm:p-12 rounded-lg shadow-2xl max-w-md w-full border border-white/10 relative overflow-hidden group">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-cassette-accent to-transparent opacity-50"></div>
                    
                    <div className="w-20 h-20 bg-black rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner border border-white/5 group-hover:scale-110 transition-transform duration-500">
                        <Globe size={40} className="text-cassette-accent" />
                    </div>

                    <h2 className="text-2xl font-industrial mb-2 text-white tracking-wide">{project.name}</h2>
                    <p className="text-gray-400 mb-8 text-sm font-mono break-all line-clamp-2">
                        {project.externalUrl}
                    </p>

                    <div className="space-y-4">
                        <button 
                            onClick={handleLaunchNative} 
                            className="w-full bg-cassette-accent text-black rounded-sm px-6 py-4 font-bold hover:bg-white transition-all active:scale-95 uppercase tracking-widest shadow-[0_0_20px_rgba(255,153,0,0.3)] hover:shadow-[0_0_30px_rgba(255,153,0,0.5)] flex items-center justify-center gap-2"
                        >
                            <ExternalLink size={20} />
                            Launch Native
                        </button>
                        <p className="text-[10px] text-gray-500 uppercase tracking-wider">
                            <ShieldCheck size={10} className="inline mr-1" />
                            Secure Browser Environment
                        </p>
                    </div>
                </div>
            </div>

             {isSettingsOpen && (
                <div className="absolute inset-0 bg-black/90 backdrop-blur-sm z-30 flex items-center justify-center p-6 animate-fade-in">
                    <div className="bg-cassette-plastic w-full max-w-sm p-6 rounded-sm shadow-2xl border border-cassette-accent">
                        <div className="flex justify-between items-center mb-6 border-b border-white/10 pb-2">
                            <h3 className="text-lg font-industrial text-white uppercase tracking-wide">OPTIONS</h3>
                            <button onClick={() => setIsSettingsOpen(false)}><X size={24} className="text-gray-400 hover:text-white" /></button>
                        </div>
                         <div className="space-y-5">
                            <p className="text-xs text-gray-400">External links are handled by the system browser to ensure compatibility with Google Logins and complex web apps.</p>
                            <button onClick={() => setIsSettingsOpen(false)} className="w-full bg-white text-black font-bold py-3 rounded-sm">CLOSE</button>
                         </div>
                    </div>
                </div>
            )}
        </div>
      );
  }

  // --- RENDER INTERNAL APP (Iframe) ---
  return (
    <div ref={containerRef} className="absolute inset-0 z-50 bg-cassette-dark flex flex-col animate-fade-in font-mono text-gray-200">
        {!isImmersiveMode && (
            <div className="pt-[env(safe-area-inset-top)] bg-cassette-plastic border-b-4 border-black z-10 shrink-0 shadow-lg">
                <RunnerHeader 
                    title={project?.name} 
                    onClose={onClose} 
                    showViewToggle={true} 
                    viewMode={viewMode} 
                    onRefresh={handleRefresh}
                    onToggleConsole={() => setIsConsoleOpen(!isConsoleOpen)}
                    onToggleSettings={() => setIsSettingsOpen(true)}
                    logCount={logs.length}
                    onToggleViewMode={toggleViewMode}
                />
            </div>
        )}
        
        {isImmersiveMode && (
            // Invisible touch area at the very top to exit immersive mode
            <div 
                className="absolute top-0 left-0 right-0 h-4 z-[60] flex justify-center items-start pt-1 cursor-pointer group opacity-0 hover:opacity-100 transition-opacity"
                onClick={handleExitImmersive}
                onTouchEnd={handleExitImmersive}
            >
                {/* Visual indicator only on hover or interaction, otherwise invisible */}
                 <div className="w-20 h-1 bg-white/30 rounded-full backdrop-blur-md"></div>
            </div>
        )}
        
        <div className="flex-1 relative flex flex-col items-center justify-center bg-[#111] overflow-hidden bg-noise shadow-bezel">
            <div className={`transition-all duration-300 relative overflow-hidden flex-shrink-0 origin-center ${
                viewMode === 'mobile' && !isImmersiveMode
                ? 'w-[375px] h-[667px] border-[12px] border-[#252830] rounded-lg shadow-2xl scale-90 sm:scale-100' 
                : 'w-full h-full border-none'
            }`}>
                <iframe
                    ref={iframeRef}
                    title="app-runner"
                    srcDoc={srcDoc}
                    sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals allow-downloads allow-pointer-lock allow-presentation allow-orientation-lock allow-top-navigation"
                    className="w-full h-full bg-white block"
                    allow="camera *; microphone *; geolocation *; autoplay *; clipboard-write; encrypted-media *; picture-in-picture *; fullscreen *; accelerometer *; gyroscope *; magnetometer *; vibration *; wake-lock *; midi *; payment *"
                />
            </div>
        </div>

        {isConsoleOpen && !isImmersiveMode && (
            <div className="h-1/3 min-h-[250px] bg-black border-t-4 border-cassette-plastic flex flex-col animate-slide-up absolute bottom-0 w-full z-20 shadow-2xl font-mono text-xs pb-[env(safe-area-inset-bottom)]">
                <div className="flex items-center justify-between px-4 py-2 bg-cassette-plastic text-white border-b border-white/10">
                    <span className="font-bold uppercase tracking-wider text-cassette-accent">DEBUG_LOG_OUTPUT</span>
                    <button onClick={() => setIsConsoleOpen(false)}><X size={16} className="text-gray-400 hover:text-white" /></button>
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
                        <button onClick={() => setIsSettingsOpen(false)}><X size={24} className="text-gray-400 hover:text-white" /></button>
                    </div>
                    <div className="space-y-5">
                        <div className="grid grid-cols-2 gap-2 mb-3">
                            <button onClick={() => setViewMode('mobile')} className={`p-4 border rounded-sm text-xs font-bold uppercase flex flex-col items-center gap-2 ${viewMode === 'mobile' ? 'bg-cassette-accent text-black border-transparent' : 'border-white/20 text-gray-400 hover:text-white'}`}>
                                <Smartphone size={20}/> Mobile
                            </button>
                            <button onClick={() => setViewMode('expanded')} className={`p-4 border rounded-sm text-xs font-bold uppercase flex flex-col items-center gap-2 ${viewMode === 'expanded' ? 'bg-cassette-accent text-black border-transparent' : 'border-white/20 text-gray-400 hover:text-white'}`}>
                                <Monitor size={20}/> Full
                            </button>
                        </div>
                        <button onClick={() => {
                            const newValue = !isImmersiveMode;
                            setIsImmersiveMode(newValue);
                            onToggleImmersive(newValue);
                        }} className={`w-full p-4 border rounded-sm font-bold text-xs uppercase flex justify-between items-center ${isImmersiveMode ? 'bg-cassette-highlight text-black border-transparent' : 'border-white/20 text-gray-400 hover:text-white'}`}>
                            <span>Immersive Mode</span>
                            <div className={`w-3 h-3 rounded-full border border-current ${isImmersiveMode ? 'bg-black border-transparent' : 'bg-transparent'}`}></div>
                        </button>
                        <input type="password" value={tempApiKey} onChange={(e) => setTempApiKey(e.target.value)} placeholder="OVERRIDE_API_KEY" className="w-full bg-black border border-white/20 p-3 text-xs text-cassette-highlight rounded-sm outline-none focus:border-cassette-accent" />
                        <button onClick={saveSettings} className="w-full bg-white text-black font-bold py-3 rounded-sm shadow-md hover:bg-gray-200 transition-all uppercase tracking-widest">Execute</button>
                    </div>
                </div>
            </div>
        )}
    </div>
  );
};

const RunnerHeader = ({ title, onClose, showViewToggle, viewMode, onRefresh, onToggleConsole, onToggleSettings, logCount, onToggleViewMode }: any) => (
    <div className="flex items-center justify-between px-4 py-2 h-16 w-full max-w-full overflow-hidden">
        <div className="flex items-center gap-4 shrink-1 min-w-0">
            <button 
                onClick={onClose} 
                className="group flex flex-col items-center justify-center bg-black border border-white/10 hover:border-red-500 w-12 h-10 rounded-sm transition-all active:scale-95 shrink-0"
                title="EJECT TAPE"
            >
                <LogOut size={16} className="text-gray-500 group-hover:text-red-500 mb-[2px]" />
                <span className="text-[8px] text-gray-600 font-bold">EJECT</span>
            </button>
            
            <div className="flex flex-col border-l border-white/10 pl-4 overflow-hidden">
                <h1 className="font-industrial text-white text-lg sm:text-xl tracking-wider uppercase leading-none truncate">{title || 'UNKNOWN'}</h1>
                <div className="flex gap-2 items-center">
                    <div className="w-2 h-2 rounded-full bg-cassette-accent animate-pulse"></div>
                    <span className="text-[9px] text-cassette-accent font-mono uppercase tracking-widest truncate">RUNNING</span>
                </div>
            </div>
        </div>
        
        <div className="flex items-center gap-1 sm:gap-2 shrink-0">
            {showViewToggle && (
                 <button onClick={onToggleViewMode} className="p-2 text-gray-400 hover:bg-white/10 hover:text-white rounded transition-colors hidden sm:block">
                    {viewMode === 'mobile' ? <Monitor size={20} /> : <Smartphone size={20} />}
                 </button>
            )}
            {showViewToggle && (
                <button onClick={onToggleConsole} className={clsx("p-2 rounded hover:bg-white/10 transition-colors relative", logCount > 0 ? "text-cassette-highlight" : "text-gray-400")}>
                    <Bug size={20} />
                    {logCount > 0 && <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>}
                </button>
            )}
            <button onClick={onToggleSettings} className="p-2 text-gray-400 hover:bg-white/10 hover:text-white rounded transition-colors"><SettingsIcon size={20} /></button>
            {showViewToggle && <button onClick={onRefresh} className="p-2 text-gray-400 hover:bg-white/10 hover:text-white rounded transition-colors"><RefreshCw size={20} /></button>}
        </div>
    </div>
);

export default RunnerViewer;
