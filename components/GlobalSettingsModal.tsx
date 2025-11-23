
import React, { useState, useEffect } from 'react';
import { X, Save, Key, Monitor, Smartphone } from 'lucide-react';

interface GlobalSettingsModalProps {
  onClose: () => void;
}

const GlobalSettingsModal: React.FC<GlobalSettingsModalProps> = ({ onClose }) => {
  const [apiKey, setApiKey] = useState('');
  const [defaultView, setDefaultView] = useState<'mobile' | 'expanded'>('mobile');

  useEffect(() => {
    const storedKey = localStorage.getItem('nexus_global_api_key');
    if (storedKey) setApiKey(storedKey);

    const storedView = localStorage.getItem('nexus_runner_default_mode');
    if (storedView === 'expanded') setDefaultView('expanded');
  }, []);

  const handleSave = () => {
    localStorage.setItem('nexus_global_api_key', apiKey);
    localStorage.setItem('nexus_runner_default_mode', defaultView);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl animate-slide-up border border-nexus-border">
        <div className="flex items-center justify-between p-4 border-b border-nexus-border">
          <h3 className="font-bold text-lg text-nexus-text">Global Settings</h3>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-slate-100 text-nexus-muted hover:text-nexus-text">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* API Key Section */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-nexus-text flex items-center gap-2">
              <Key size={16} className="text-nexus-accent" /> Gemini API Key
            </label>
            <input 
              type="password" 
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="AIza..."
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 text-nexus-text focus:outline-none focus:border-nexus-accent focus:bg-white transition-colors"
            />
            <p className="text-xs text-nexus-muted">
              This key will be injected into all runner environments.
            </p>
          </div>

          {/* View Mode Section */}
          <div className="space-y-2">
             <label className="text-sm font-medium text-nexus-text flex items-center gap-2">
               <Monitor size={16} className="text-nexus-accent" /> Default Runner View
             </label>
             <div className="grid grid-cols-2 gap-3">
                <button 
                   onClick={() => setDefaultView('mobile')}
                   className={`flex items-center justify-center gap-2 py-3 rounded-lg border transition-all ${defaultView === 'mobile' ? 'border-nexus-accent bg-blue-50 text-nexus-accent font-bold' : 'border-slate-200 text-nexus-muted hover:bg-slate-50'}`}
                >
                   <Smartphone size={18} /> Mobile Sim
                </button>
                <button 
                   onClick={() => setDefaultView('expanded')}
                   className={`flex items-center justify-center gap-2 py-3 rounded-lg border transition-all ${defaultView === 'expanded' ? 'border-nexus-accent bg-blue-50 text-nexus-accent font-bold' : 'border-slate-200 text-nexus-muted hover:bg-slate-50'}`}
                >
                   <Monitor size={18} /> Expanded
                </button>
             </div>
             <p className="text-xs text-nexus-muted">
               'Mobile Sim' mimics a phone screen. 'Expanded' uses the full window width.
             </p>
          </div>

          <button 
            onClick={handleSave}
            className="w-full bg-nexus-accent hover:bg-blue-600 text-white font-bold py-3 rounded-xl transition-all active:scale-95 flex items-center justify-center gap-2 shadow-lg shadow-nexus-accent/20 mt-2"
          >
            <Save size={18} /> Save Settings
          </button>
        </div>
      </div>
    </div>
  );
};

export default GlobalSettingsModal;
