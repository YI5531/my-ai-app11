
import React, { useState, useEffect } from 'react';
import { X, Save, Key } from 'lucide-react';

interface GlobalSettingsModalProps {
  onClose: () => void;
}

const GlobalSettingsModal: React.FC<GlobalSettingsModalProps> = ({ onClose }) => {
  const [apiKey, setApiKey] = useState('');

  useEffect(() => {
    const stored = localStorage.getItem('nexus_global_api_key');
    if (stored) setApiKey(stored);
  }, []);

  const handleSave = () => {
    localStorage.setItem('nexus_global_api_key', apiKey);
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
              This key will be injected into all runner environments as <code>process.env.API_KEY</code> and <code>window.API_KEY</code>.
            </p>
          </div>

          <button 
            onClick={handleSave}
            className="w-full bg-nexus-accent hover:bg-blue-600 text-white font-bold py-3 rounded-xl transition-all active:scale-95 flex items-center justify-center gap-2 shadow-lg shadow-nexus-accent/20"
          >
            <Save size={18} /> Save Settings
          </button>
        </div>
      </div>
    </div>
  );
};

export default GlobalSettingsModal;