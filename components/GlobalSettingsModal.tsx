import React, { useState, useEffect } from 'react';
import { X, Save, Key, Monitor, Smartphone } from 'lucide-react';

interface GlobalSettingsModalProps { onClose: () => void; }

const GlobalSettingsModal: React.FC<GlobalSettingsModalProps> = ({ onClose }) => {
  const [apiKey, setApiKey] = useState('');
  const [defaultView, setDefaultView] = useState<'mobile' | 'expanded'>('mobile');

  useEffect(() => {
    const storedKey = localStorage.getItem('nexus_global_api_key'); if (storedKey) setApiKey(storedKey);
    const storedView = localStorage.getItem('nexus_runner_default_mode'); if (storedView === 'expanded') setDefaultView('expanded');
  }, []);

  const handleSave = () => {
    localStorage.setItem('nexus_global_api_key', apiKey); localStorage.setItem('nexus_runner_default_mode', defaultView); onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in font-sans">
      <div className="bg-[#1b2838] w-full max-w-md rounded-sm shadow-2xl border border-[#2a475e]">
        
        <div className="flex items-center justify-between p-4 bg-gradient-to-r from-[#171a21] to-[#1b2838] border-b border-[#2a475e]">
          <h3 className="font-bold text-lg text-white tracking-wide uppercase">Settings</h3>
          <button onClick={onClose} className="text-steam-muted hover:text-white"><X size={20} /></button>
        </div>
        
        <div className="p-6 space-y-6">
          <div className="space-y-2">
            <label className="text-xs font-bold text-steam-accent uppercase tracking-wider">Gemini API Key</label>
            <input type="password" value={apiKey} onChange={(e) => setApiKey(e.target.value)} className="w-full bg-[#0e1116] border border-[#2a475e] text-white p-3 text-sm rounded focus:border-steam-accent outline-none placeholder-gray-600" placeholder="Paste API Key here..." />
          </div>
          
          <div className="space-y-2">
             <label className="text-xs font-bold text-steam-accent uppercase tracking-wider">Default View Mode</label>
             <div className="grid grid-cols-2 gap-3">
                <button onClick={() => setDefaultView('mobile')} className={`p-3 border rounded text-xs font-bold uppercase flex gap-2 justify-center items-center transition-all ${defaultView === 'mobile' ? 'bg-[#2a475e] text-white border-transparent' : 'border-[#2a475e] text-steam-muted hover:text-white'}`}><Smartphone size={16}/> Mobile</button>
                <button onClick={() => setDefaultView('expanded')} className={`p-3 border rounded text-xs font-bold uppercase flex gap-2 justify-center items-center transition-all ${defaultView === 'expanded' ? 'bg-[#2a475e] text-white border-transparent' : 'border-[#2a475e] text-steam-muted hover:text-white'}`}><Monitor size={16}/> Desktop</button>
             </div>
          </div>
          
          <button onClick={handleSave} className="w-full bg-steam-accent hover:brightness-110 text-white font-bold py-3 rounded shadow-md transition-all flex justify-center gap-2 items-center mt-4">
            <Save size={18} /> Save Changes
          </button>
        </div>
      </div>
    </div>
  );
};
export default GlobalSettingsModal;