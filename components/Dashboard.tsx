
import React from 'react';
import { ProjectMetadata } from '../types';
import { Trash2, Globe, FileCode, Link as LinkIcon, Plus, Box } from 'lucide-react';
import clsx from 'clsx';

interface DashboardProps {
  projects: ProjectMetadata[];
  isLoading: boolean;
  onOpen: (p: ProjectMetadata) => void;
  onDelete: (id: string, e: React.MouseEvent) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ projects, isLoading, onOpen, onDelete }) => {
  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-4 border-nexus-border border-t-nexus-accent"></div>
      </div>
    );
  }

  if (projects.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center animate-fade-in bg-nexus-dark">
        <div className="bg-white p-6 rounded-3xl mb-4 shadow-sm border border-nexus-border">
          <Box size={40} className="text-nexus-muted" />
        </div>
        <h2 className="text-xl font-bold text-nexus-text mb-1">No Apps Installed</h2>
        <p className="text-nexus-muted text-sm">Import a project to get started</p>
      </div>
    );
  }

  return (
    <div className="p-6 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 content-start overflow-y-auto h-full pb-32">
      {projects.map((project) => (
        <div 
          key={project.id}
          onClick={() => onOpen(project)}
          className="group relative bg-white rounded-2xl p-4 cursor-pointer transition-all duration-300 hover:shadow-xl hover:shadow-slate-200 hover:-translate-y-1 active:scale-95 flex flex-col h-36 border border-slate-100 hover:border-slate-200"
        >
            {/* Delete Button - Completely Isolated */}
            <div className="absolute top-2 right-2 z-30">
                 <div 
                   onClick={(e) => {
                     e.stopPropagation();
                     e.nativeEvent.stopImmediatePropagation();
                     onDelete(project.id, e);
                   }}
                   className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors cursor-pointer opacity-100 lg:opacity-0 lg:group-hover:opacity-100"
                   title="Delete App"
                 >
                   <Trash2 size={16} />
                 </div>
            </div>

            <div className="flex-1 flex flex-col justify-between pt-1">
                <div className="flex justify-between items-start">
                    <div className={clsx(
                        "w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-md shadow-slate-200",
                        project.type === 'web' ? 'bg-gradient-to-br from-blue-500 to-blue-600' : 
                        project.type === 'external_url' ? 'bg-gradient-to-br from-emerald-400 to-emerald-600' : 
                        'bg-gradient-to-br from-violet-500 to-violet-600'
                    )}>
                        {project.type === 'web' && <Globe size={24} strokeWidth={2} />}
                        {project.type === 'external_url' && <LinkIcon size={24} strokeWidth={2} />}
                        {project.type === 'code_snippet' && <FileCode size={24} strokeWidth={2} />}
                    </div>
                </div>

                <div className="mt-3">
                    <h3 className="font-bold text-nexus-text text-sm leading-tight line-clamp-2 group-hover:text-nexus-accent transition-colors">
                        {project.name}
                    </h3>
                    <p className="text-[10px] text-nexus-muted font-bold uppercase tracking-wider mt-1 opacity-70">
                        {project.type === 'external_url' ? 'External' : 'Local App'}
                    </p>
                </div>
            </div>
        </div>
      ))}
    </div>
  );
};

export default Dashboard;
