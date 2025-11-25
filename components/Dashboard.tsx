import React from 'react';
import { ProjectMetadata } from '../types';
import { Trash2, HardDrive, Pin, Smartphone } from 'lucide-react';
import clsx from 'clsx';

interface DashboardProps {
  projects: ProjectMetadata[];
  isLoading: boolean;
  onOpen: (p: ProjectMetadata) => void;
  onDelete: (id: string, e: React.MouseEvent) => void;
  onTogglePin: (id: string, e: React.MouseEvent) => void;
  onAddToHome: (p: ProjectMetadata, e: React.MouseEvent) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ projects, isLoading, onOpen, onDelete, onTogglePin, onAddToHome }) => {
  
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

  const pinnedProjects = projects.filter(p => p.isPinned);
  const unpinnedProjects = projects.filter(p => !p.isPinned);

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

  const renderProjectCard = (project: ProjectMetadata) => (
    <div 
        key={project.id}
        onClick={() => handleTap(project)}
        className="group relative flex flex-col cursor-pointer transition-transform duration-200 active:scale-95 touch-manipulation select-none"
    >
        {/* MICRO-CHIP SHELL */}
        <div className={clsx(
            "w-full aspect-square rounded-[4px] relative shadow-plastic border border-black flex flex-col overflow-hidden",
            project.isPinned ? "bg-[#2a2d36] ring-1 ring-cassette-accent/30" : "bg-[#1a1c21]"
        )}>
            
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

        {/* Pin Button - Top Left */}
        <button 
            onClick={(e) => onTogglePin(project.id, e)}
            className={clsx(
                "absolute -top-3 -left-3 z-20 p-3 rounded-full shadow-md transition-all active:scale-90 border border-white/20",
                project.isPinned 
                    ? "bg-cassette-accent text-black opacity-100 shadow-[0_0_10px_rgba(255,153,0,0.4)]" 
                    : "bg-cassette-plastic text-white opacity-0 group-hover:opacity-100 hover:bg-white/20"
            )}
            title={project.isPinned ? "Unpin" : "Pin to Top"}
        >
            <Pin size={16} className={project.isPinned ? "fill-black stroke-2" : ""} />
        </button>

        {/* Home Shortcut Button - Bottom Right */}
        <button 
            onClick={(e) => onAddToHome(project, e)}
            className="absolute -bottom-3 -right-3 z-20 bg-cassette-highlight text-black p-3 rounded-full shadow-md opacity-0 group-hover:opacity-100 transition-all active:scale-90 border border-white/20 hover:shadow-[0_0_10px_rgba(0,229,255,0.4)]"
            title="Add to Home Screen"
        >
            <Smartphone size={16} />
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
  );

  return (
    <div className="p-4 h-full pb-32 bg-cassette-dark overflow-y-auto content-start">
      
      {/* PINNED SECTION */}
      {pinnedProjects.length > 0 && (
        <div className="mb-8 animate-slide-up">
            <div className="flex items-center gap-2 mb-4 text-cassette-accent opacity-90">
                <Pin size={16} className="fill-cassette-accent" />
                <span className="font-industrial tracking-widest text-sm">PINNED SHORTCUTS</span>
                <div className="h-px bg-cassette-accent/30 flex-1"></div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8 gap-3 sm:gap-4">
                {pinnedProjects.map(renderProjectCard)}
            </div>
        </div>
      )}

      {/* MAIN LIBRARY SECTION (If there are pinned projects, show header) */}
      {pinnedProjects.length > 0 && unpinnedProjects.length > 0 && (
          <div className="flex items-center gap-2 mb-4 text-cassette-muted opacity-80 mt-2">
            <HardDrive size={16} />
            <span className="font-industrial tracking-widest text-sm">LIBRARY</span>
            <div className="h-px bg-white/10 flex-1"></div>
          </div>
      )}

      {/* Main Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8 gap-3 sm:gap-4">
        {unpinnedProjects.map(renderProjectCard)}
      </div>

      {unpinnedProjects.length === 0 && pinnedProjects.length === 0 && (
           <div className="flex flex-col items-center justify-center py-20 opacity-50">
               <span className="font-mono text-xs text-cassette-muted">NO DATA FOUND</span>
           </div>
      )}
    </div>
  );
};

export default Dashboard;