
import React from 'react';
import { ProjectMetadata } from '../types';
import { Trash2, HardDrive, ArrowDownToLine } from 'lucide-react';
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
        <p className="text-cassette-muted font-mono text-xs">Insert new tape to begin.</p>
      </div>
    );
  }

  return (
    <div className="p-4 grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8 2xl:grid-cols-10 gap-3 content-start overflow-y-auto h-full pb-32 bg-cassette-dark">
      {projects.map((project) => (
        <div 
          key={project.id}
          onClick={() => onOpen(project)}
          className="group relative flex flex-col cursor-pointer hover:-translate-y-1 transition-transform duration-200"
        >
            {/* MICRO-CHIP SHELL */}
            <div className="w-full aspect-square bg-[#1a1c21] rounded-[2px] relative shadow-plastic border border-black flex flex-col overflow-hidden">
                
                {/* Top Grip Area */}
                <div className="h-1.5 bg-grip w-full border-b border-black opacity-50"></div>

                {/* Main Body */}
                <div className="flex-1 p-1.5 relative flex flex-col bg-[#252830]">
                    
                    {/* Screw Detail */}
                    <div className="absolute top-1 left-1 w-1 h-1 bg-[#0a0a0a] rounded-full shadow-inner opacity-50"></div>

                    {/* THE LABEL (Sticker) */}
                    <div className="bg-[#f0f0f0] rounded-[1px] shadow-sm p-1 relative flex-1 flex flex-col overflow-hidden border-l-2 border-cassette-accent/20">
                        {/* Texture Overlay */}
                        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/paper.png')] opacity-20 pointer-events-none"></div>
                        
                        {/* Project Name (Handwritten) */}
                        <div className="flex-1 flex items-center justify-center text-center overflow-hidden">
                           <h3 className="font-marker text-black text-xs sm:text-sm leading-none -rotate-1 break-words w-full line-clamp-2">
                               {project.name}
                           </h3>
                        </div>

                        {/* Footer Info */}
                        <div className="flex justify-between items-end mt-1 border-t border-black/10 pt-0.5">
                            <span className={clsx(
                                "text-[6px] font-bold px-0.5 rounded-[1px] leading-none",
                                project.type === 'web' ? 'bg-blue-100 text-blue-900' : 'bg-orange-100 text-orange-900'
                            )}>
                                {project.type === 'web' ? 'APP' : 'LNK'}
                            </span>
                            <span className="font-marker text-[#cc0000] text-[7px]">
                                {getFormattedTime(project.createdAt)}
                            </span>
                        </div>
                    </div>

                    {/* Bottom Pins / Connector */}
                    <div className="h-1.5 mt-1 bg-[#111] mx-2 border border-white/10 flex gap-[1px] justify-center px-[2px]">
                         {[...Array(6)].map((_, i) => (
                             <div key={i} className="w-[2px] h-full bg-[#b8860b] opacity-80"></div>
                         ))}
                    </div>

                </div>
            </div>

            {/* HOVER: INSERT OVERLAY */}
            <div className="absolute inset-0 bg-cassette-accent/90 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-150 rounded-[2px] z-10 backdrop-blur-[1px]">
                <div className="flex flex-col items-center text-black">
                    <ArrowDownToLine size={16} strokeWidth={3} className="animate-bounce mb-1" />
                    <span className="font-industrial text-[8px] tracking-widest">INSERT</span>
                </div>
            </div>

            {/* Delete Button */}
            <button 
                onClick={(e) => onDelete(project.id, e)}
                className="absolute -top-1.5 -right-1.5 z-20 bg-[#cc0000] text-white p-1 rounded-[1px] shadow-md opacity-0 group-hover:opacity-100 transition-all hover:scale-110 border border-white/20"
                title="Destroy Chip"
            >
                <Trash2 size={10} />
            </button>
        </div>
      ))}
    </div>
  );
};

export default Dashboard;
