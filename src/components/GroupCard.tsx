import React from 'react';
import { Users, Calendar, MapPin, ChevronRight } from 'lucide-react';

interface GroupCardProps {
  name: string;
  startDate: string;
  endDate: string;
  memberCount: number;
  location: string;
}

const GroupCard: React.FC<GroupCardProps> = ({ name, startDate, endDate, memberCount, location }) => {
  return (
    <div className="bg-slate-800 rounded-[2rem] border-2 border-slate-700 p-8 hover:border-blue-500/50 transition-all group shadow-xl">
      <div className="flex justify-between items-start mb-6">
        <h3 className="text-2xl font-black text-white tracking-tight leading-tight">{name}</h3>
        <span className="px-4 py-1.5 bg-blue-600/20 text-blue-400 text-xs font-black uppercase tracking-widest rounded-full border border-blue-500/30">
          進行中
        </span>
      </div>
      
      <div className="space-y-4">
        <div className="flex items-center text-slate-400">
          <div className="bg-slate-900 p-2 rounded-lg mr-3">
            <Calendar className="w-5 h-5 text-blue-500" />
          </div>
          <span className="font-bold">{startDate} ~ {endDate}</span>
        </div>
        
        <div className="flex items-center text-slate-400">
          <div className="bg-slate-900 p-2 rounded-lg mr-3">
            <MapPin className="w-5 h-5 text-blue-500" />
          </div>
          <span className="font-bold">{location}</span>
        </div>
        
        <div className="flex items-center text-slate-400">
          <div className="bg-slate-900 p-2 rounded-lg mr-3">
            <Users className="w-5 h-5 text-blue-500" />
          </div>
          <span className="font-bold">{memberCount} 位團員</span>
        </div>
      </div>
      
      <div className="mt-8 pt-6 border-t border-slate-700 flex justify-between items-center">
        <div className="flex -space-x-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="w-8 h-8 rounded-full border-2 border-slate-800 bg-slate-700 flex items-center justify-center text-[10px] font-black">
              {String.fromCharCode(64 + i)}
            </div>
          ))}
          <div className="w-8 h-8 rounded-full border-2 border-slate-800 bg-blue-600 flex items-center justify-center text-[10px] font-black">
            +{memberCount - 3}
          </div>
        </div>
        
        <button className="flex items-center gap-1 font-black text-blue-400 hover:text-blue-300 transition-colors uppercase tracking-widest text-xs">
          <span>管理詳情</span>
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

export default GroupCard;
