import React, { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { User, Phone, Download, MessageCircle, X } from 'lucide-react';
import { Group } from '@/types/database';

interface LeaderCardProps {
  leader_name?: string | null;
  leader_ename?: string | null;
  leader_phone?: string | null;
  leader_photo?: string | null;
  leader_line_id?: string | null;
}

export default function LeaderCard({ 
  leader_name,
  leader_ename,
  leader_phone,
  leader_photo,
  leader_line_id
}: LeaderCardProps) {
  const [showQr, setShowQr] = useState(false);

  if (!leader_name) return null;

  const handleDownloadVcf = () => {
    const vcfContent = [
      'BEGIN:VCARD',
      'VERSION:3.0',
      `FN:${leader_name} ${leader_ename || ''}`,
      `N:${leader_name};;;;`,
      `TEL;TYPE=CELL:${leader_phone}`,
      leader_line_id ? `X-SOCIALPROFILE;type=line:${leader_line_id}` : '',
      'END:VCARD'
    ].join('\n');

    const blob = new Blob([vcfContent], { type: 'text/vcard;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${leader_name}.vcf`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const contactUrl = `tel:${leader_phone}`;

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden mb-6">
      <div className="bg-gradient-to-r from-blue-600 to-blue-500 p-6 text-white relative">
        <div className="flex items-center gap-4 relative z-10">
          <div className="w-20 h-20 rounded-full border-4 border-white/30 overflow-hidden bg-white shrink-0">
            {leader_photo ? (
              <img src={leader_photo} alt={leader_name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-blue-100 text-blue-500">
                <User size={32} />
              </div>
            )}
          </div>
          <div>
            <div className="text-xs font-medium opacity-90 mb-1">您的領隊 / Tour Leader</div>
            <h3 className="text-2xl font-bold">{leader_name}</h3>
            {leader_ename && <p className="text-sm opacity-90">{leader_ename}</p>}
          </div>
        </div>
        
        {/* Decorative circle */}
        <div className="absolute -right-6 -bottom-10 w-32 h-32 bg-white/10 rounded-full blur-2xl"></div>
      </div>

      <div className="p-5 space-y-4">
        {/* Phone */}
        {leader_phone && (
          <a href={`tel:${leader_phone}`} className="flex items-center gap-4 p-3 rounded-xl hover:bg-slate-50 transition-colors">
            <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center text-green-600 shrink-0">
              <Phone size={20} />
            </div>
            <div>
              <div className="text-xs text-slate-500">手機號碼 (點擊撥打)</div>
              <div className="font-bold text-slate-800 text-lg">{leader_phone}</div>
            </div>
          </a>
        )}

        {/* LINE */}
        {leader_line_id && (
          <div className="flex items-center gap-4 p-3 rounded-xl hover:bg-slate-50 transition-colors">
            <div className="w-10 h-10 rounded-full bg-[#06C755]/10 flex items-center justify-center text-[#06C755] shrink-0">
              <MessageCircle size={20} />
            </div>
            <div>
              <div className="text-xs text-slate-500">LINE ID</div>
              <div className="font-bold text-slate-800">{leader_line_id}</div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3 pt-2">
          <button
            onClick={handleDownloadVcf}
            className="flex flex-col items-center justify-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 py-3 rounded-xl font-medium text-sm transition-colors"
          >
            <Download size={20} />
            <span>存入通訊錄</span>
          </button>
          
          <button
            onClick={() => setShowQr(true)}
            className="flex flex-col items-center justify-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 py-3 rounded-xl font-medium text-sm transition-colors"
          >
            <User size={20} />
            <span>救命 QR Code</span>
          </button>
        </div>
      </div>

      {/* QR Code Modal */}
      {showQr && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-8 w-full max-w-sm relative text-center">
            <button 
              onClick={() => setShowQr(false)}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
            >
              <X size={24} />
            </button>

            <div className="mb-6">
              <h3 className="text-2xl font-bold text-slate-900 mb-2">救命 QR Code</h3>
              <p className="text-slate-500 text-sm">
                萬一走失，請請路人掃描此條碼<br/>即可直接聯繫您的領隊
              </p>
            </div>

            <div className="bg-white p-4 rounded-2xl shadow-inner border border-slate-100 inline-block mb-6">
              <QRCodeSVG 
                value={`tel:${leader_phone}`}
                size={200}
                level="H"
                includeMargin={true}
              />
            </div>

            <div className="text-left bg-slate-50 p-4 rounded-xl text-sm text-slate-600">
              <p className="font-bold mb-1">🆘 緊急聯繫資訊：</p>
              <p>Name: {leader_name}</p>
              <p>Phone: {leader_phone}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
