
import React, { useRef, useState } from 'react';
import { X, UploadCloud, Link as LinkIcon, Folder, AlertCircle, Loader2, FileCode, Smartphone } from 'lucide-react';
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
  const mobileFilesInputRef = useRef<HTMLInputElement>(null);
  const htmlInputRef = useRef<HTMLInputElement>(null);
  
  const [urlInput, setUrlInput] = useState('');

  const handleZipChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.name.endsWith('.zip')) {
        setError("Please upload a .zip file");
        return;
    }
    processImport(async () => await processZipFile(file));
  };

  const handleFolderChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    processImport(async () => await processFolder(files));
  };

  const handleHtmlChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    processImport(async () => await processSingleFile(file));
  };

  const processImport = async (importFn: () => Promise<any>) => {
      setIsProcessing(true);
      setError(null);
      try {
          const project = await importFn();
          await saveProject(project);
          onSuccess();
      } catch (err) {
          console.error(err);
          setError("Import failed. Please check the file format.");
      } finally {
          setIsProcessing(false);
      }
  };

  const handleUrlSubmit = async () => {
    if (!urlInput) return;
    setIsProcessing(true);
    try {
        const project = {
            id: uuidv4(),
            name: new URL(urlInput).hostname,
            description: `External link to ${urlInput}`,
            createdAt: Date.now(),
            type: 'external_url' as const,
            externalUrl: urlInput,
            files: {},
            settings: { injectConsole: false }
        };
        await saveProject(project);
        onSuccess();
    } catch (e) {
        setError("Invalid URL");
    } finally {
        setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in">
      <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden animate-slide-up border border-nexus-border">
        <div className="flex items-center justify-between p-4 border-b border-nexus-border">
          <h3 className="font-bold text-lg text-nexus-text">Import Project</h3>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-slate-100 text-nexus-muted hover:text-nexus-text">
            <X size={20} />
          </button>
        </div>

        <div className="p-6">
          <div className="flex gap-2 mb-6 bg-slate-100 p-1 rounded-lg overflow-x-auto no-scrollbar">
            {[
                { id: 'zip', label: 'ZIP' },
                { id: 'folder', label: 'Folder' },
                { id: 'html', label: 'HTML' },
                { id: 'url', label: 'URL' }
            ].map((tab) => (
                <button 
                  key={tab.id}
                  onClick={() => setMode(tab.id as any)}
                  className={`flex-1 min-w-[80px] py-2 text-sm font-medium rounded-md transition-all ${mode === tab.id ? 'bg-white text-nexus-accent shadow-sm' : 'text-nexus-muted hover:text-nexus-text'}`}
                >
                  {tab.label}
                </button>
            ))}
          </div>

          {error && (
             <div className="mb-4 p-3 bg-red-50 border border-red-100 rounded-lg flex items-center gap-2 text-red-600 text-sm">
                <AlertCircle size={16} />
                {error}
             </div>
          )}

          <div className="min-h-[200px] flex flex-col justify-center">
             {mode === 'zip' && (
                <div 
                  onClick={() => !isProcessing && fileInputRef.current?.click()}
                  className={`border-2 border-dashed border-slate-200 rounded-xl p-8 flex flex-col items-center justify-center cursor-pointer hover:border-nexus-accent/50 hover:bg-blue-50 transition-colors ${isProcessing ? 'opacity-50 pointer-events-none' : ''}`}
                >
                  <input type="file" accept=".zip" ref={fileInputRef} className="hidden" onChange={handleZipChange} />
                  {isProcessing ? <Loader2 size={40} className="text-nexus-accent animate-spin mb-3" /> : <UploadCloud size={40} className="text-nexus-muted mb-3" />}
                  <p className="font-medium text-nexus-text">Select ZIP File</p>
                </div>
             )}

             {mode === 'folder' && (
                <div className="space-y-3">
                    {/* Desktop Folder Selection */}
                    <div 
                      onClick={() => !isProcessing && folderInputRef.current?.click()}
                      className={`border-2 border-dashed border-slate-200 rounded-xl p-6 flex flex-col items-center justify-center cursor-pointer hover:border-nexus-accent/50 hover:bg-blue-50 transition-colors ${isProcessing ? 'opacity-50 pointer-events-none' : ''}`}
                    >
                      <input 
                        type="file" 
                        ref={folderInputRef} 
                        className="hidden" 
                        onChange={handleFolderChange} 
                        {...{ webkitdirectory: "", directory: "", multiple: true } as any}
                      />
                      {isProcessing ? <Loader2 size={32} className="text-nexus-accent animate-spin mb-2" /> : <Folder size={32} className="text-nexus-muted mb-2" />}
                      <p className="font-medium text-nexus-text">Select Folder (Desktop)</p>
                    </div>

                    {/* Mobile File Batch Selection (Fallback) */}
                    <div 
                      onClick={() => !isProcessing && mobileFilesInputRef.current?.click()}
                      className={`border border-slate-200 rounded-xl p-4 flex items-center justify-center gap-3 cursor-pointer hover:bg-slate-50 transition-colors ${isProcessing ? 'opacity-50 pointer-events-none' : ''}`}
                    >
                         <input 
                            type="file" 
                            ref={mobileFilesInputRef} 
                            className="hidden" 
                            onChange={handleFolderChange} 
                            multiple
                          />
                         <Smartphone size={20} className="text-nexus-muted" />
                         <span className="text-sm font-medium text-nexus-text">Select Files (Mobile)</span>
                    </div>
                </div>
             )}

             {mode === 'html' && (
                <div 
                  onClick={() => !isProcessing && htmlInputRef.current?.click()}
                  className={`border-2 border-dashed border-slate-200 rounded-xl p-8 flex flex-col items-center justify-center cursor-pointer hover:border-nexus-accent/50 hover:bg-blue-50 transition-colors ${isProcessing ? 'opacity-50 pointer-events-none' : ''}`}
                >
                  <input type="file" accept=".html,.htm" ref={htmlInputRef} className="hidden" onChange={handleHtmlChange} />
                  {isProcessing ? <Loader2 size={40} className="text-nexus-accent animate-spin mb-3" /> : <FileCode size={40} className="text-nexus-muted mb-3" />}
                  <p className="font-medium text-nexus-text">Select HTML File</p>
                </div>
             )}

             {mode === 'url' && (
                <div className="space-y-4">
                  <input 
                      type="url" 
                      placeholder="https://example.com"
                      value={urlInput}
                      onChange={(e) => setUrlInput(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 text-nexus-text focus:outline-none focus:border-nexus-accent focus:bg-white transition-colors"
                  />
                  <button 
                    onClick={handleUrlSubmit}
                    disabled={isProcessing}
                    className="w-full bg-nexus-accent hover:bg-blue-600 text-white font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-nexus-accent/20"
                  >
                    {isProcessing ? <Loader2 size={18} className="animate-spin" /> : "Add Link"}
                  </button>
                </div>
             )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ImportModal;
