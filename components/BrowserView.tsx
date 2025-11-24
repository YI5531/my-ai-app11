import React, { useState, useRef, useEffect } from 'react';
import { Search, Globe, ArrowLeft, RotateCw, X, Home, Lock, ShieldCheck, ExternalLink, ArrowUpRight, Maximize2, Minimize2, Plus, Zap } from 'lucide-react';

interface BrowserTab {
  id: string;
  title: string;
  url: string;
  history: string[];
  pointer: number;
  loading: boolean;
  type: 'frame' | 'detached';
}

const NEXUS_HOME = 'nexus://newtab';

const DETACHED_DOMAINS = [
    'accounts.google.com',
    'myaccount.google.com',
    'aistudio.google.com',
    'generativelanguage.googleapis.com',
    'colab.research.google.com',
    'github.com/login',
    'twitter.com',
    'x.com',
    'chatgpt.com',
    'openai.com'
];

const BrowserView: React.FC = () => {
  const [tabs, setTabs] = useState<BrowserTab[]>([
    { id: 'tab-1', title: 'New Tab', url: NEXUS_HOME, history: [NEXUS_HOME], pointer: 0, loading: false, type: 'frame' }
  ]);
  const [activeTabId, setActiveTabId] = useState('tab-1');
  const [urlInput, setUrlInput] = useState('');
  const [isFullscreen, setIsFullscreen] = useState(false);
  
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const activeTab = tabs.find(t => t.id === activeTabId) || tabs[0];
  const isHome = activeTab.url === NEXUS_HOME;
  const isDetached = activeTab.type === 'detached';

  useEffect(() => {
    setUrlInput(isHome ? '' : activeTab.url);
  }, [activeTab.url, isHome]);

  const toggleFullscreen = () => {
      if (!document.fullscreenElement) {
          containerRef.current?.requestFullscreen().catch(err => console.error(err));
      } else {
          document.exitFullscreen().catch(err => console.error(err));
      }
  };

  const updateTab = (id: string, updates: Partial<BrowserTab>) => {
    setTabs(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t));
  };

  const createTab = () => {
    const newId = `tab-${Date.now()}`;
    const newTab: BrowserTab = {
        id: newId,
        title: 'New Tab',
        url: NEXUS_HOME,
        history: [NEXUS_HOME],
        pointer: 0,
        loading: false,
        type: 'frame'
    };
    setTabs(prev => [...prev, newTab]);
    setActiveTabId(newId);
  };

  const closeTab = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (tabs.length === 1) {
        updateTab(id, { url: NEXUS_HOME, history: [NEXUS_HOME], pointer: 0, title: 'New Tab', type: 'frame' });
        return;
    }
    const newTabs = tabs.filter(t => t.id !== id);
    setTabs(newTabs);
    if (activeTabId === id) {
        setActiveTabId(newTabs[newTabs.length - 1].id);
    }
  };

  const navigate = (input: string) => {
    let target = input.trim();
    if (!target) return;

    if (target === 'nexus://newtab') {
        loadUrl(activeTabId, NEXUS_HOME);
        return;
    }

    const hasProtocol = target.includes('://');
    const isValidDomain = /^([a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}/.test(target);
    const hasSpace = target.includes(' ');

    if (!hasProtocol) {
       if (isValidDomain && !hasSpace) {
           target = `https://${target}`;
       } else {
           target = `https://www.google.com/search?q=${encodeURIComponent(target)}&igu=1`;
       }
    }

    loadUrl(activeTabId, target);
  };

  const loadUrl = (tabId: string, url: string) => {
      const tab = tabs.find(t => t.id === tabId);
      if (!tab) return;
      if (url === tab.url && url !== NEXUS_HOME) return;

      let isDetachedContext = false;
      try {
          const urlObj = new URL(url);
          const hostname = urlObj.hostname;
          if (DETACHED_DOMAINS.some(d => hostname.endsWith(d))) isDetachedContext = true;
      } catch(e) {}

      const newHistory = tab.history.slice(0, tab.pointer + 1);
      newHistory.push(url);

      updateTab(tabId, {
          url,
          history: newHistory,
          pointer: newHistory.length - 1,
          loading: !isDetachedContext,
          title: getTitleFromUrl(url),
          type: isDetachedContext ? 'detached' : 'frame'
      });
  };

  const goBack = () => {
      if (activeTab.pointer > 0) {
          const newPointer = activeTab.pointer - 1;
          const url = activeTab.history[newPointer];
          
          let isDetachedContext = false;
          try {
             if (DETACHED_DOMAINS.some(d => new URL(url).hostname.endsWith(d))) isDetachedContext = true;
          } catch(e) {}

          updateTab(activeTabId, { pointer: newPointer, url, title: getTitleFromUrl(url), type: isDetachedContext ? 'detached' : 'frame' });
      }
  };

  const goForward = () => {
      if (activeTab.pointer < activeTab.history.length - 1) {
          const newPointer = activeTab.pointer + 1;
          const url = activeTab.history[newPointer];
          
          let isDetachedContext = false;
          try {
             if (DETACHED_DOMAINS.some(d => new URL(url).hostname.endsWith(d))) isDetachedContext = true;
          } catch(e) {}

          updateTab(activeTabId, { pointer: newPointer, url, title: getTitleFromUrl(url), type: isDetachedContext ? 'detached' : 'frame' });
      }
  };

  const handleReload = () => {
      if (isDetached) return;
      if (iframeRef.current) {
          const src = iframeRef.current.src;
          iframeRef.current.src = '';
          updateTab(activeTabId, { loading: true });
          setTimeout(() => { if(iframeRef.current) iframeRef.current.src = src; }, 50);
      }
  };

  const getTitleFromUrl = (url: string) => {
      if (url === NEXUS_HOME) return 'New Tab';
      try {
          const host = new URL(url).hostname;
          return host.replace('www.', '');
      } catch(e) {
          return 'Web Page';
      }
  };

  return (
    <div ref={containerRef} className="flex flex-col h-full bg-[#202124] w-full">
      
      {/* Chrome Dark Toolbar */}
      <div className="flex flex-col shrink-0 bg-[#202124]">
          
          {/* Tab Strip */}
          <div className="flex items-end px-2 pt-2 gap-1 overflow-x-auto no-scrollbar bg-[#171717]">
              {tabs.map(tab => (
                  <div 
                    key={tab.id}
                    onClick={() => setActiveTabId(tab.id)}
                    className={`
                        group relative flex items-center gap-2 px-4 py-2 min-w-[140px] max-w-[220px] cursor-pointer select-none text-xs rounded-t-md transition-all
                        ${activeTabId === tab.id 
                            ? 'bg-[#323639] text-white' 
                            : 'bg-transparent text-gray-400 hover:bg-[#202124] hover:text-gray-200'
                        }
                    `}
                  >
                      {tab.loading ? (
                          <RotateCw size={12} className="animate-spin shrink-0 text-steam-accent" />
                      ) : tab.type === 'detached' ? (
                          <Lock size={12} className="shrink-0 text-yellow-500" />
                      ) : (
                          <Globe size={12} className="shrink-0" />
                      )}
                      
                      <span className="truncate flex-1">{tab.title}</span>
                      
                      <button 
                        onClick={(e) => closeTab(e, tab.id)}
                        className="opacity-0 group-hover:opacity-100 hover:bg-white/10 p-0.5 rounded-full"
                      >
                          <X size={12} />
                      </button>
                  </div>
              ))}
              <button onClick={createTab} className="p-1.5 ml-1 text-gray-400 hover:text-white hover:bg-white/10 rounded-full mb-1">
                  <Plus size={16} />
              </button>
          </div>

          {/* Navigation Bar */}
          <div className="flex items-center gap-2 px-3 py-2 bg-[#323639] shadow-md z-10">
             <div className="flex items-center gap-1">
                <button onClick={goBack} disabled={activeTab.pointer === 0} className="p-1.5 text-gray-300 hover:bg-white/10 rounded-full disabled:opacity-30"><ArrowLeft size={16} /></button>
                <button onClick={goForward} disabled={activeTab.pointer === activeTab.history.length - 1} className="p-1.5 text-gray-300 hover:bg-white/10 rounded-full disabled:opacity-30 rotate-180"><ArrowLeft size={16} /></button>
                <button onClick={handleReload} className="p-1.5 text-gray-300 hover:bg-white/10 rounded-full"><RotateCw size={14} className={activeTab.loading ? 'animate-spin' : ''} /></button>
             </div>

             <div onClick={() => navigate(NEXUS_HOME)} className="p-1.5 text-gray-300 hover:bg-white/10 rounded-full cursor-pointer" title="Home">
                 <Home size={16} />
             </div>

             {/* OmniBox */}
             <div className="flex-1 relative group max-w-4xl mx-auto">
                 <form onSubmit={(e) => { e.preventDefault(); navigate(urlInput); }} className="w-full relative">
                     <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none z-10 text-gray-500">
                         {isDetached ? <Lock size={12} className="text-steam-green" /> : <Search size={12} />}
                     </div>
                     <input 
                         type="text" 
                         value={urlInput}
                         onChange={(e) => setUrlInput(e.target.value)}
                         onFocus={(e) => e.target.select()}
                         className="w-full bg-[#202124] border border-transparent rounded-full pl-8 pr-10 py-1.5 text-sm text-white focus:outline-none focus:bg-[#202124] focus:border-steam-accent focus:ring-1 focus:ring-steam-accent transition-all placeholder-gray-500 shadow-inner"
                         placeholder="Search Google or type a URL"
                     />
                 </form>
             </div>

             {/* Actions */}
             <div className="flex items-center gap-2">
                 <button 
                    onClick={toggleFullscreen}
                    className="p-1.5 text-gray-400 hover:text-white transition-colors"
                 >
                    {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
                 </button>
             </div>
          </div>
      </div>

      {/* Main Viewport */}
      <div className="flex-1 relative bg-[#202124] w-full h-full">
         <div className="w-full h-full relative bg-white">
            {/* Loading Bar */}
            {activeTab.loading && (
                <div className="absolute top-0 left-0 right-0 h-0.5 bg-[#e0e0e0] z-30">
                    <div className="h-full bg-steam-accent animate-[progress_1.5s_ease-in-out_infinite]"></div>
                </div>
            )}

            {isHome ? (
                <InternalNewTab onNavigate={navigate} />
            ) : isDetached ? (
                <DetachedSessionView url={activeTab.url} />
            ) : (
                <iframe 
                    ref={iframeRef}
                    src={activeTab.url}
                    className="w-full h-full border-0 block bg-white"
                    onLoad={() => updateTab(activeTabId, { loading: false })}
                    sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox allow-presentation allow-downloads allow-modals allow-storage-access-by-user-activation"
                    allow="camera; microphone; geolocation; autoplay; clipboard-write; encrypted-media; picture-in-picture; fullscreen"
                />
            )}
         </div>
      </div>
    </div>
  );
};

const DetachedSessionView = ({ url }: { url: string }) => {
    const isAIStudio = url.includes('aistudio');

    const handleLaunch = () => {
        const width = 1200;
        const height = 800;
        const left = (window.screen.width - width) / 2;
        const top = (window.screen.height - height) / 2;
        window.open(url, 'NexusSecureWindow', `width=${width},height=${height},top=${top},left=${left},status=yes,toolbar=yes,menubar=no,location=yes`);
    };

    return (
        <div className="absolute inset-0 bg-[#202124] flex flex-col items-center justify-center p-6 text-center">
            <div className="max-w-md w-full bg-[#292a2d] p-8 rounded-lg shadow-2xl border border-white/5">
                <div className="w-16 h-16 bg-[#323639] rounded-full flex items-center justify-center mx-auto mb-6">
                     {isAIStudio ? <Zap size={32} className="text-steam-accent" /> : <ShieldCheck size={32} className="text-steam-green" />}
                </div>

                <h1 className="text-xl font-bold text-white mb-2">
                    {isAIStudio ? 'AI Studio Workspace' : 'Secure Content'}
                </h1>
                
                <p className="text-gray-400 text-sm mb-8 leading-relaxed">
                    This content requires a secure popup window to function correctly.
                </p>

                <button 
                    onClick={handleLaunch}
                    className="bg-steam-accent hover:bg-blue-400 text-white px-8 py-3 rounded text-sm font-bold shadow-lg transition-all flex items-center justify-center gap-2 mx-auto"
                >
                    {isAIStudio ? 'Launch AI Studio' : `Open ${new URL(url).hostname}`}
                    <ArrowUpRight size={16} />
                </button>
            </div>
        </div>
    );
};

const InternalNewTab: React.FC<{ onNavigate: (url: string) => void }> = ({ onNavigate }) => {
    const [query, setQuery] = useState('');
    
    return (
        <div className="absolute inset-0 bg-[#202124] flex flex-col items-center justify-center p-4">
            <div className="flex flex-col items-center w-full max-w-[600px] -mt-16">
                <h1 className="text-5xl font-bold text-white mb-8 opacity-90">Google</h1>

                <form onSubmit={(e) => { e.preventDefault(); onNavigate(query); }} className="w-full relative mb-8">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <Search size={20} className="text-gray-400" />
                    </div>
                    <input 
                        type="text" 
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        className="w-full pl-12 pr-4 py-3 rounded-full bg-[#303134] text-white border border-gray-600 focus:border-white focus:bg-[#303134] outline-none shadow-lg transition-all"
                        placeholder="Search Google or type a URL"
                        autoFocus
                    />
                </form>

                <div className="flex gap-4">
                    <Shortcut label="AI Studio" icon={<Zap size={20} />} onClick={() => onNavigate('https://aistudio.google.com')} />
                    <Shortcut label="YouTube" icon={<ExternalLink size={20} />} onClick={() => onNavigate('https://youtube.com')} />
                </div>
            </div>
        </div>
    );
};

const Shortcut = ({ label, icon, onClick }: any) => (
    <button 
        onClick={onClick}
        className="flex flex-col items-center justify-center w-24 h-24 bg-[#303134] rounded-lg hover:bg-[#3c4043] transition-colors gap-2"
    >
        <div className="p-3 bg-[#202124] rounded-full text-steam-accent">{icon}</div>
        <span className="text-xs text-gray-300">{label}</span>
    </button>
);

export default BrowserView;