import React from 'react';
import { Users, Calendar, MapPin, ChevronRight } from 'lucide-react';
import Link from 'next/link';

interface GroupCardProps {
  id: string | number;
  name: string;
  startDate: string;
  endDate: string;
  memberCount: number;
  location: string;
}

const GroupCard: React.FC<GroupCardProps> = ({ id, name, startDate, endDate, memberCount, location }) => {
  return (
    <div className="bg-slate-800 rounded-[2rem] border-2 border-slate-700 p-8 hover:border-blue-500/50 transition-all group shadow-xl relative overflow-hidden">
      {/* Background Glow */}
      <div className="absolute -top-24 -right-24 w-48 h-48 bg-blue-600/5 rounded-full blur-3xl group-hover:bg-blue-600/10 transition-colors"></div>
      
      <div className="flex justify-between items-start mb-6 relative z-10">
        <h3 className="text-2xl font-black text-white tracking-tight leading-tight">{name}</h3>
        <span className="px-4 py-1.5 bg-blue-600/20 text-blue-400 text-xs font-black uppercase tracking-widest rounded-full border border-blue-500/30">
          進行中
        </span>
      </div>
      
      <div className="space-y-4 relative z-10">
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
      
      <div className="mt-8 pt-6 border-t border-slate-700 flex justify-between items-center relative z-10">
        <div className="flex -space-x-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="w-8 h-8 rounded-full border-2 border-slate-800 bg-slate-700 flex items-center justify-center text-[10px] font-black">
              {String.fromCharCode(64 + i)}
            </div>
          ))}
          <div className="w-8 h-8 rounded-full border-2 border-slate-800 bg-blue-600 flex items-center justify-center text-[10px] font-black">
            +{Math.max(0, memberCount - 3)}
          </div>
        </div>
        
        <Link 
          href={`/groups/${id}/edit`}
          className="flex items-center gap-2 bg-slate-900 hover:bg-blue-600 text-slate-400 hover:text-white px-5 py-2.5 rounded-xl font-black transition-all border border-slate-700 hover:border-blue-400 uppercase tracking-widest text-[10px]"
        >
          <span>管理詳情</span>
          <ChevronRight className="w-4 h-4" />
        </Link>
      </div>
    </div>
  );
};

export default GroupCard;
