import React, { useRef, useState, useEffect } from 'react';
import { X, UploadCloud, Link as LinkIcon, Folder, AlertCircle, Loader2, FileCode, Archive } from 'lucide-react';
import { processZipFile, processFolder, processSingleFile } from '../services/zipService';
import { saveProject } from '../services/storageService';
import { v4 as uuidv4 } from 'uuid';

interface ImportModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

const ImportModal: React.FC<ImportModalProps> = ({ onClose, onSuccess }) => {
  const [mode, setMode] = useState<'zip' | 'folder' | 'html' | 'url'>('zip');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);
  const htmlInputRef = useRef<HTMLInputElement>(null);
  const [urlInput, setUrlInput] = useState('');
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

  useEffect(() => { if (isMobile) setMode('zip'); }, []);

  const handleZipChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    processImport(async () => await processZipFile(file));
  };
  const handleFolderChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files; if (!files || files.length === 0) return;
    processImport(async () => await processFolder(files));
  };
  const handleHtmlChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    processImport(async () => await processSingleFile(file));
  };
  const processImport = async (importFn: () => Promise<any>) => {
      setIsProcessing(true); setError(null);
      try { const project = await importFn(); await saveProject(project); onSuccess(); } 
      catch (err) { setError("Failed to process file."); } finally { setIsProcessing(false); }
  };
  const handleUrlSubmit = async () => {
    if (!urlInput) return; setIsProcessing(true);
    try {
        const project = { id: uuidv4(), name: new URL(urlInput).hostname, description: `External Link: ${urlInput}`, createdAt: Date.now(), type: 'external_url' as const, externalUrl: urlInput, files: {}, settings: { injectConsole: false } };
        await saveProject(project); onSuccess();
    } catch (e) { setError("Invalid URL."); } finally { setIsProcessing(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in font-sans">
      <div className="bg-[#1b2838] w-full max-w-lg rounded-sm shadow-2xl border border-[#2a475e]">
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 bg-gradient-to-r from-[#171a21] to-[#1b2838] border-b border-[#2a475e]">
          <h3 className="font-bold text-lg text-white tracking-wide uppercase">Add Non-Steam Game</h3>
          <button onClick={onClose} className="text-steam-muted hover:text-white transition-colors"><X size={24} /></button>
        </div>

        <div className="p-6">
          <div className="flex gap-2 mb-6 bg-[#171a21] p-1 rounded-sm">
            {[{ id: 'zip', label: 'ZIP', icon: Archive }, { id: 'folder', label: 'Folder', icon: Folder }, { id: 'html', label: 'HTML', icon: FileCode }, { id: 'url', label: 'Link', icon: LinkIcon }]
            .map((tab) => (
                <button key={tab.id} onClick={() => setMode(tab.id as any)} className={`flex-1 py-2 text-xs font-bold uppercase rounded-sm flex items-center justify-center gap-2 transition-all ${mode === tab.id ? 'bg-[#2a475e] text-white shadow-md' : 'text-steam-muted hover:text-white hover:bg-white/5'}`}>
                  <tab.icon size={14} /> {tab.label}
                </button>
            ))}
          </div>

          {error && <div className="mb-4 p-3 bg-red-900/20 border border-red-500/50 text-red-400 text-xs flex items-center gap-2 rounded"><AlertCircle size={16} /> {error}</div>}

          <div className="min-h-[160px] flex flex-col justify-center items-center border-2 border-dashed border-[#2a475e] hover:border-steam-accent hover:bg-[#20252e] rounded-sm transition-all cursor-pointer group"
               onClick={() => !isProcessing && (mode === 'zip' ? fileInputRef : mode === 'folder' ? folderInputRef : htmlInputRef).current?.click()}>
             
             {mode === 'url' ? (
                <div className="w-full space-y-4 px-8 cursor-default" onClick={e => e.stopPropagation()}>
                    <input type="url" placeholder="https://..." value={urlInput} onChange={(e) => setUrlInput(e.target.value)} className="w-full bg-[#0e1116] border border-[#2a475e] p-3 text-sm text-white rounded focus:border-steam-accent outline-none" />
                    <button onClick={handleUrlSubmit} disabled={isProcessing} className="w-full bg-steam-accent hover:brightness-110 text-white font-bold py-3 rounded shadow-md transition-all">
                        {isProcessing ? "Connecting..." : "Add to Library"}
                    </button>
                </div>
             ) : (
                <>
                    <input type="file" ref={mode === 'zip' ? fileInputRef : mode === 'folder' ? folderInputRef : htmlInputRef} className="hidden" onChange={mode === 'zip' ? handleZipChange : mode === 'folder' ? handleFolderChange : handleHtmlChange} {...(mode === 'folder' ? { webkitdirectory: "", directory: "", multiple: true } : { accept: mode === 'zip' ? '.zip' : '.html,.htm' }) as any} />
                    {isProcessing ? <Loader2 size={48} className="animate-spin text-steam-accent mb-2" /> : <UploadCloud size={48} className="text-[#2a475e] group-hover:text-steam-accent mb-2 transition-colors" />}
                    <p className="font-bold text-steam-text group-hover:text-white transition-colors">BROWSE FILES</p>
                    <p className="text-xs text-steam-muted mt-1">{mode === 'folder' ? 'Select directory' : `Select ${mode.toUpperCase()} file`}</p>
                </>
             )}
          </div>
        </div>
      </div>
    </div>
  );
};
export default ImportModal;