import React, { useState } from 'react';
import { Search, ExternalLink, Zap } from 'lucide-react';
import { Browser } from '@capacitor/browser';

const BrowserView: React.FC = () => {
  const [query, setQuery] = useState('');

  const handleNavigate = async (input: string) => {
    let target = input.trim();
    if (!target) return;

    const isValidDomain = /^([a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}/.test(target);
    const hasProtocol = target.includes('://');

    if (!hasProtocol) {
       if (isValidDomain && !target.includes(' ')) {
           target = `https://${target}`;
       } else {
           target = `https://www.google.com/search?q=${encodeURIComponent(target)}`;
       }
    }

    try {
        await Browser.open({ 
            url: target,
            presentationStyle: 'popover',
            toolbarColor: '#202124'
        });
    } catch (e) {
        // Fallback for web
        window.open(target, '_blank');
    }
  };

  const handleShortcut = (url: string) => {
      handleNavigate(url);
  };

  return (
    <div className="flex flex-col h-full bg-[#202124] w-full items-center justify-center p-4">
        <div className="flex flex-col items-center w-full max-w-[600px] -mt-16 animate-fade-in">
            <h1 className="text-5xl font-bold text-white mb-8 opacity-90 tracking-tight">Nexus Net</h1>

            <form onSubmit={(e) => { e.preventDefault(); handleNavigate(query); }} className="w-full relative mb-8">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Search size={20} className="text-gray-400" />
                </div>
                <input 
                    type="text" 
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    className="w-full pl-12 pr-4 py-4 rounded-full bg-[#303134] text-white border border-gray-600 focus:border-steam-accent focus:bg-[#303134] outline-none shadow-lg transition-all text-lg"
                    placeholder="Search Google or type a URL"
                    autoFocus
                />
            </form>

            <div className="flex gap-4">
                <Shortcut label="AI Studio" icon={<Zap size={24} />} onClick={() => handleShortcut('https://aistudio.google.com')} />
                <Shortcut label="Google" icon={<Search size={24} />} onClick={() => handleShortcut('https://google.com')} />
                <Shortcut label="YouTube" icon={<ExternalLink size={24} />} onClick={() => handleShortcut('https://youtube.com')} />
            </div>

            <p className="mt-12 text-gray-500 text-xs text-center max-w-xs leading-relaxed">
                Browsing is handled by the native system browser (Chrome Custom Tabs) to ensure security, cookie sharing, and full compatibility.
            </p>
        </div>
    </div>
  );
};

const Shortcut = ({ label, icon, onClick }: any) => (
    <button 
        onClick={onClick}
        className="flex flex-col items-center justify-center w-24 h-24 bg-[#303134] rounded-xl hover:bg-[#3c4043] hover:scale-105 transition-all gap-3 shadow-md border border-white/5"
    >
        <div className="p-3 bg-[#202124] rounded-full text-steam-accent shadow-inner">{icon}</div>
        <span className="text-xs text-gray-300 font-medium">{label}</span>
    </button>
);

export default BrowserView;