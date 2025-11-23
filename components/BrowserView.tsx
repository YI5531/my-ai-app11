
import React, { useState, useRef, useEffect } from 'react';
import { Search, Globe, ArrowLeft, RotateCw, X, Home, Lock, ShieldCheck, ExternalLink, ChevronRight, Plus, Zap, Layout, ArrowUpRight, Maximize2, Minimize2, MoreVertical, Star, UserCircle, LogIn } from 'lucide-react';
import { APP_CONFIG } from '../types';

interface BrowserTab {
  id: string;
  title: string;
  url: string;
  history: string[];
  pointer: number;
  loading: boolean;
  type: 'frame' | 'detached';
  favicon?: string;
}

const NEXUS_HOME = 'nexus://newtab';

// Domains that strictly block iframes (X-Frame-Options: DENY/SAMEORIGIN)
// We must NEVER try to iframe these, or the user gets a broken experience.
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
  // --- STATE ---
  const [tabs, setTabs] = useState<BrowserTab[]>([
    { id: 'tab-1', title: 'New Tab', url: NEXUS_HOME, history: [NEXUS_HOME], pointer: 0, loading: false, type: 'frame' }
  ]);
  const [activeTabId, setActiveTabId] = useState('tab-1');
  const [urlInput, setUrlInput] = useState('');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Computed
  const activeTab = tabs.find(t => t.id === activeTabId) || tabs[0];
  const isHome = activeTab.url === NEXUS_HOME;
  const isDetached = activeTab.type === 'detached';

  // Sync Input
  useEffect(() => {
    setUrlInput(isHome ? '' : activeTab.url);
  }, [activeTab.url, isHome]);

  // --- ACTIONS ---

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

    // Protocol & Search Logic
    const hasProtocol = target.includes('://');
    const isValidDomain = /^([a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}/.test(target);
    const hasSpace = target.includes(' ');

    if (!hasProtocol) {
       if (isValidDomain && !hasSpace) {
           target = `https://${target}`;
       } else {
           // Default to Google Search
           // Note: We do NOT force igu=1 for search here, we let the loadUrl logic handle domain detection
           // But for general search, we can use it to allow embedding results
           target = `https://www.google.com/search?q=${encodeURIComponent(target)}&igu=1`;
       }
    }

    loadUrl(activeTabId, target);
  };

  const loadUrl = (tabId: string, url: string) => {
      const tab = tabs.find(t => t.id === tabId);
      if (!tab) return;
      
      // Don't reload if same URL (unless it's a refresh action, handled separately)
      if (url === tab.url && url !== NEXUS_HOME) return;

      // STRICT DETACHED DETECTION
      // We must identify if this URL belongs to a service that blocks iframes.
      let isDetachedContext = false;
      try {
          const urlObj = new URL(url);
          const hostname = urlObj.hostname;
          
          if (DETACHED_DOMAINS.some(d => hostname.endsWith(d))) {
              isDetachedContext = true;
          }
      } catch(e) {
          // If invalid URL, assume internal or search
      }

      const newHistory = tab.history.slice(0, tab.pointer + 1);
      newHistory.push(url);

      updateTab(tabId, {
          url,
          history: newHistory,
          pointer: newHistory.length - 1,
          loading: !isDetachedContext, // Don't show loading spinner for detached views
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
          setTimeout(() => { 
              if(iframeRef.current) iframeRef.current.src = src; 
          }, 50);
      }
  };

  const handleGoogleLogin = () => {
      // Direct link to Google Service Login with a continue URL that makes sense
      const width = 500;
      const height = 600;
      const left = (window.screen.width - width) / 2;
      const top = (window.screen.height - height) / 2;
      
      window.open(
          'https://accounts.google.com/ServiceLogin?continue=https://aistudio.google.com',
          'GoogleLogin',
          `width=${width},height=${height},top=${top},left=${left},status=yes,toolbar=no,menubar=no,location=yes`
      );
  };

  const getTitleFromUrl = (url: string) => {
      if (url === NEXUS_HOME) return 'New Tab';
      try {
          const host = new URL(url).hostname;
          let name = host.replace('www.', '').split('.')[0];
          return name.charAt(0).toUpperCase() + name.slice(1);
      } catch(e) {
          return 'Browsing';
      }
  };

  // --- RENDER ---

  return (
    <div className="flex flex-col h-full bg-[#dfe1e5] w-full font-sans">
      
      {/* Browser Toolbar (Chromium Design) */}
      <div className="flex flex-col shrink-0">
          
          {/* Tab Strip */}
          <div className="flex items-end px-2 gap-1 overflow-x-auto no-scrollbar pt-2 h-[40px]">
              {tabs.map(tab => (
                  <div 
                    key={tab.id}
                    onClick={() => setActiveTabId(tab.id)}
                    className={`
                        group relative flex items-center gap-2 px-3 pb-2 pt-2.5 max-w-[200px] min-w-[140px] cursor-pointer select-none text-xs font-medium transition-all
                        ${activeTabId === tab.id 
                            ? 'bg-white text-[#1e293b] rounded-t-lg shadow-[0_0_4px_rgba(0,0,0,0.1)] z-10' 
                            : 'bg-transparent text-[#5f6368] hover:bg-white/40 rounded-t-lg'
                        }
                    `}
                  >
                      {/* Active Tab Curves */}
                      {activeTabId === tab.id && (
                        <>
                           <div className="absolute bottom-0 left-[-8px] w-2 h-2 bg-transparent shadow-[4px_0_0_0_#ffffff] rounded-br-lg pointer-events-none"></div>
                           <div className="absolute bottom-0 right-[-8px] w-2 h-2 bg-transparent shadow-[-4px_0_0_0_#ffffff] rounded-bl-lg pointer-events-none"></div>
                        </>
                      )}

                      {tab.loading ? (
                          <RotateCw size={12} className="animate-spin text-blue-500 shrink-0" />
                      ) : tab.type === 'detached' ? (
                          <Lock size={12} className="text-emerald-600 shrink-0" />
                      ) : (
                          <Globe size={12} className={activeTabId === tab.id ? 'text-blue-500' : 'text-slate-400 shrink-0'} />
                      )}
                      
                      <span className="truncate flex-1 text-[11px]">{tab.title}</span>
                      
                      <button 
                        onClick={(e) => closeTab(e, tab.id)}
                        className="opacity-0 group-hover:opacity-100 p-0.5 hover:bg-slate-200 rounded-full transition-all text-slate-500"
                      >
                          <X size={10} />
                      </button>
                  </div>
              ))}
              <button onClick={createTab} className="p-1.5 ml-1 hover:bg-white/40 rounded-full text-[#5f6368] transition-colors mb-1.5">
                  <Plus size={16} />
              </button>
          </div>

          {/* Navigation Bar */}
          <div className="flex items-center gap-2 px-2 py-1.5 bg-white border-b border-[#dfe1e5] shadow-sm z-20">
             <div className="flex items-center gap-0.5">
                <button onClick={goBack} disabled={activeTab.pointer === 0} className="p-1.5 text-[#5f6368] hover:bg-slate-100 disabled:opacity-30 rounded-full transition-colors"><ArrowLeft size={16} /></button>
                <button onClick={goForward} disabled={activeTab.pointer === activeTab.history.length - 1} className="p-1.5 text-[#5f6368] hover:bg-slate-100 disabled:opacity-30 rounded-full transition-colors rotate-180"><ArrowLeft size={16} /></button>
                <button onClick={handleReload} className="p-1.5 text-[#5f6368] hover:bg-slate-100 rounded-full transition-colors"><RotateCw size={14} className={activeTab.loading ? 'animate-spin' : ''} /></button>
             </div>

             <div onClick={() => navigate(NEXUS_HOME)} className="p-1.5 text-[#5f6368] hover:bg-slate-100 rounded-full cursor-pointer" title="Home">
                 <Home size={16} />
             </div>

             {/* OmniBox */}
             <div className="flex-1 relative group max-w-5xl">
                 <form onSubmit={(e) => { e.preventDefault(); navigate(urlInput); }} className="w-full relative">
                     <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none z-10">
                         {isDetached ? <Lock size={12} className="text-emerald-600" /> : <Globe size={13} className="text-slate-400" />}
                     </div>
                     <input 
                         type="text" 
                         value={urlInput}
                         onChange={(e) => setUrlInput(e.target.value)}
                         onFocus={(e) => e.target.select()}
                         className={`w-full bg-[#f1f3f4] hover:bg-[#e8eaed] border-0 rounded-full pl-9 pr-10 py-1.5 text-[13px] text-[#1e293b] focus:outline-none focus:bg-white focus:shadow-[0_1px_6px_rgba(32,33,36,0.28)] transition-all font-normal placeholder-slate-500`}
                         placeholder="Search Google or type a URL"
                     />
                 </form>
             </div>

             {/* Account & Menu */}
             <div className="flex items-center gap-2 pl-2 border-l border-slate-200 ml-1">
                 <button 
                    onClick={handleGoogleLogin}
                    className="flex items-center gap-2 px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-full text-xs font-medium transition-colors shadow-sm"
                    title="Sign in to Google Account"
                 >
                     <UserCircle size={14} />
                     <span>Sign In</span>
                 </button>
                 <button className="p-1.5 text-[#5f6368] hover:bg-slate-100 rounded-full"><MoreVertical size={16} /></button>
             </div>
          </div>
      </div>

      {/* Main Viewport */}
      <div className="flex-1 relative bg-white overflow-hidden w-full h-full">
         
         {/* Loading Bar */}
         {activeTab.loading && (
             <div className="absolute top-0 left-0 right-0 h-0.5 bg-white z-30">
                 <div className="h-full bg-blue-500 animate-[progress_1s_ease-in-out_infinite]"></div>
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
  );
};

/**
 * Detached Session View
 * This mimics the "App Launcher" behavior for secure sites.
 */
const DetachedSessionView = ({ url }: { url: string }) => {
    const isGoogle = url.includes('google.com');
    const isAIStudio = url.includes('aistudio');

    const handleLaunch = () => {
        // Open a window that preserves session cookies
        const width = 1200;
        const height = 800;
        const left = (window.screen.width - width) / 2;
        const top = (window.screen.height - height) / 2;
        window.open(
            url, 
            'NexusSecureWindow', 
            `width=${width},height=${height},top=${top},left=${left},status=yes,toolbar=yes,menubar=no,location=yes`
        );
    };

    return (
        <div className="absolute inset-0 bg-white flex flex-col items-center justify-center p-6 animate-fade-in">
            <div className="max-w-md w-full text-center">
                <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm border border-slate-100">
                     {isAIStudio ? (
                         <Zap size={40} className="text-[#4285F4]" fill="currentColor" />
                     ) : (
                         <ShieldCheck size={40} className="text-emerald-500" />
                     )}
                </div>

                <h1 className="text-xl font-medium text-[#202124] mb-2">
                    {isAIStudio ? 'AI Studio Workspace' : 'Secure Window Required'}
                </h1>
                
                <p className="text-[#5f6368] text-sm mb-8 leading-relaxed px-4">
                    {isAIStudio 
                        ? "Google AI Studio requires a secure, standalone window to access your account and projects."
                        : `To protect your account, ${new URL(url).hostname} must be opened in a secure window.`
                    }
                </p>

                <button 
                    onClick={handleLaunch}
                    className="bg-[#1a73e8] hover:bg-[#1557b0] text-white px-8 py-3 rounded-full font-medium text-sm transition-colors shadow-sm hover:shadow-md flex items-center justify-center gap-2 mx-auto"
                >
                    {isAIStudio ? 'Launch AI Studio' : `Continue to ${new URL(url).hostname}`}
                    <ArrowUpRight size={16} />
                </button>

                <div className="mt-8 pt-8 border-t border-slate-100">
                    <div className="flex items-center justify-center gap-2 text-xs text-slate-400">
                        <Lock size={10} />
                        <span>Authenticated Session Bridge</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

const InternalNewTab: React.FC<{ onNavigate: (url: string) => void }> = ({ onNavigate }) => {
    const [query, setQuery] = useState('');
    
    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        onNavigate(query);
    };

    return (
        <div className="absolute inset-0 bg-white flex flex-col items-center justify-center p-4">
            <div className="w-full max-w-[560px] flex flex-col items-center animate-fade-in -mt-16">
                
                <div className="mb-8 relative select-none">
                   <h1 className="text-[64px] font-bold text-slate-800 tracking-tighter leading-none opacity-[0.15]">
                       Google
                   </h1>
                   <div className="absolute inset-0 flex items-center justify-center top-1">
                        <span className="text-2xl font-medium text-slate-600 bg-white/50 backdrop-blur-sm px-4 py-1 rounded-full">Nexus</span>
                   </div>
                </div>

                <form onSubmit={handleSearch} className="w-full mb-10 relative group shadow-sm hover:shadow-md transition-shadow rounded-full">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <Search size={20} className="text-slate-400" />
                    </div>
                    <input 
                        type="text" 
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Search Google or type a URL"
                        className="w-full pl-12 pr-12 py-3 bg-white border border-[#dfe1e5] hover:border-transparent rounded-full text-base text-[#202124] focus:outline-none"
                        autoFocus
                    />
                </form>

                {/* Shortcuts */}
                <div className="flex flex-wrap justify-center gap-6 w-full">
                    <Shortcut 
                        label="AI Studio" 
                        icon={<Zap size={24} fill="currentColor" />} 
                        onClick={() => onNavigate('https://aistudio.google.com')} 
                        color="bg-blue-50 text-blue-600"
                    />
                    <Shortcut 
                        label="YouTube" 
                        icon={<Layout size={24} />} 
                        onClick={() => onNavigate('https://youtube.com')} 
                        color="bg-red-50 text-red-600"
                    />
                     <Shortcut 
                        label="Colab" 
                        icon={<ExternalLink size={24} />} 
                        onClick={() => onNavigate('https://colab.research.google.com')} 
                        color="bg-orange-50 text-orange-600"
                    />
                </div>
            </div>
        </div>
    );
};

const Shortcut = ({ label, icon, onClick, color }: any) => (
    <button 
        onClick={onClick}
        className="flex flex-col items-center gap-3 p-3 rounded-xl transition-all hover:bg-slate-50 hover:scale-105 active:scale-95 group w-24"
    >
        <div className={`w-12 h-12 rounded-full flex items-center justify-center ${color} shadow-sm group-hover:shadow-md transition-shadow`}>
            {icon}
        </div>
        <span className="text-xs font-medium text-[#202124]">{label}</span>
    </button>
);

export default BrowserView;
