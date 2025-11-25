import React from 'react';
import { ProjectMetadata } from '../types';
import { Trash2, HardDrive, ArrowDownToLine, Link2, Share2 } from 'lucide-react';
import clsx from 'clsx';

interface DashboardProps {
  projects: ProjectMetadata[];
  isLoading: boolean;
  onOpen: (p: ProjectMetadata) => void;
  onDelete: (id: string, e: React.MouseEvent) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ projects, isLoading, onOpen, onDelete }) => {
  
  const getFormattedTime = (timestamp: number) => {
      const now = Date.now();
      const diff = now - timestamp;
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      return days === 0 ? "NEW" : `${days}D`;
  };

  const handleTap = (p: ProjectMetadata) => {
      // Haptic feedback for touch
      if (navigator.vibrate) navigator.vibrate(10);
      onOpen(p);
  }

  const handleCopyLink = (e: React.MouseEvent, id: string) => {
      e.stopPropagation();
      // Generate a URL that opens this specific project
      const url = `${window.location.origin}${window.location.pathname}?id=${id}`;
      navigator.clipboard.writeText(url);
      if (navigator.vibrate) navigator.vibrate([20, 50, 20]);
      alert("Shortcut Link Copied! \n\nCreate a shortcut on your homescreen with this URL to launch this tape directly.");
  };

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center bg-cassette-dark">
        <div className="flex flex-col items-center gap-4">
           <div className="w-8 h-8 border-2 border-cassette-plastic border-t-cassette-accent rounded-full animate-spin"></div>
           <div className="text-cassette-accent font-industrial tracking-widest text-[10px] animate-pulse">LOADING CHIPS...</div>
        </div>
      </div>
    );
  }

  if (projects.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center bg-cassette-dark p-8 opacity-60">
        <HardDrive size={48} className="text-cassette-muted mb-4" />
        <h2 className="text-xl font-industrial text-white mb-2 tracking-widest">NO DATA</h2>
        <p className="text-cassette-muted font-mono text-xs">Tap + to insert tape.</p>
      </div>
    );
  }

  return (
    <div className="p-4 grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8 gap-3 sm:gap-4 content-start overflow-y-auto h-full pb-32 bg-cassette-dark">
      {projects.map((project) => (
        <div 
          key={project.id}
          onClick={() => handleTap(project)}
          className="group relative flex flex-col cursor-pointer transition-transform duration-200 active:scale-95 touch-manipulation select-none"
        >
            {/* MICRO-CHIP SHELL */}
            <div className="w-full aspect-square bg-[#1a1c21] rounded-[4px] relative shadow-plastic border border-black flex flex-col overflow-hidden">
                
                {/* Top Grip Area */}
                <div className="h-2 bg-grip w-full border-b border-black opacity-50"></div>

                {/* Main Body */}
                <div className="flex-1 p-2 relative flex flex-col bg-[#252830]">
                    
                    {/* Screw Detail */}
                    <div className="absolute top-1 left-1 w-1.5 h-1.5 bg-[#0a0a0a] rounded-full shadow-inner opacity-50"></div>

                    {/* THE LABEL (Sticker) */}
                    <div className="bg-[#f0f0f0] rounded-[2px] shadow-sm p-1.5 relative flex-1 flex flex-col overflow-hidden border-l-2 border-cassette-accent/20">
                        {/* Texture Overlay */}
                        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/paper.png')] opacity-20 pointer-events-none"></div>
                        
                        {/* Project Name (Handwritten) */}
                        <div className="flex-1 flex items-center justify-center text-center overflow-hidden">
                           <h3 className="font-marker text-black text-sm leading-none -rotate-1 break-words w-full line-clamp-3">
                               {project.name}
                           </h3>
                        </div>

                        {/* Footer Info */}
                        <div className="flex justify-between items-end mt-1 border-t border-black/10 pt-1">
                            <span className={clsx(
                                "text-[8px] font-bold px-1 rounded-[1px] leading-none",
                                project.type === 'web' ? 'bg-blue-100 text-blue-900' : 'bg-orange-100 text-orange-900'
                            )}>
                                {project.type === 'web' ? 'APP' : 'LNK'}
                            </span>
                            <span className="font-marker text-[#cc0000] text-[8px]">
                                {getFormattedTime(project.createdAt)}
                            </span>
                        </div>
                    </div>

                    {/* Bottom Pins / Connector */}
                    <div className="h-2 mt-1 bg-[#111] mx-2 border border-white/10 flex gap-[2px] justify-center px-[2px]">
                         {[...Array(6)].map((_, i) => (
                             <div key={i} className="w-[3px] h-full bg-[#b8860b] opacity-80"></div>
                         ))}
                    </div>

                </div>
            </div>

            {/* Link/Shortcut Button - Top Left */}
            <button 
                onClick={(e) => handleCopyLink(e, project.id)}
                className="absolute -top-3 -left-3 z-20 bg-cassette-highlight text-black p-3 rounded-full shadow-md opacity-0 group-hover:opacity-100 transition-all active:scale-90 border border-white/20"
                title="Copy Shortcut Link"
            >
                <Link2 size={16} />
            </button>

            {/* Delete Button - Top Right */}
            <button 
                onClick={(e) => onDelete(project.id, e)}
                className="absolute -top-3 -right-3 z-20 bg-[#cc0000] text-white p-3 rounded-full shadow-md opacity-0 group-hover:opacity-100 transition-all active:scale-90 border border-white/20"
                title="Destroy Chip"
            >
                <Trash2 size={16} />
            </button>
        </div>
      ))}
    </div>
  );
};

export default Dashboard;