import React, { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { User, Phone, Download, MessageCircle, X, ChevronDown, ChevronUp, AlertTriangle, Loader2, MapPin } from 'lucide-react';
import { Group } from '@/types/database';

interface LeaderCardProps {
  leader_name?: string | null;
  leader_ename?: string | null;
  leader_phone?: string | null;
  leader_photo?: string | null;
  leader_line_id?: string | null;
  onSOSClick?: () => void;
  isSOSLoading?: boolean;
}

export default function LeaderCard({ 
  leader_name,
  leader_ename,
  leader_phone,
  leader_photo,
  leader_line_id,
  onSOSClick,
  isSOSLoading = false
}: LeaderCardProps) {
  const [showQr, setShowQr] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [locationLoading, setLocationLoading] = useState(false);

  if (!leader_name) return null;

  const handleSendLocation = () => {
    setLocationLoading(true);
    if (!navigator.geolocation) {
      alert('您的裝置不支援地理位置功能');
      setLocationLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        const mapUrl = `https://www.google.com/maps?q=${latitude},${longitude}`;
        const message = `領隊救命！我迷路了，這是我目前的位置：\n${mapUrl}`;
        const lineUrl = `https://line.me/R/msg/text/?${encodeURIComponent(message)}`;
        window.location.href = lineUrl;
        setLocationLoading(false);
      },
      (error) => {
        console.error('Error getting location:', error);
        alert('無法獲取您的位置，請確認已開啟定位權限');
        setLocationLoading(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  const handleDownloadVcf = async () => {
    const vcfContent = [
      'BEGIN:VCARD',
      'VERSION:3.0',
      `FN:${leader_name} ${leader_ename || ''}`,
      `N:${leader_name};;;;`,
      `TEL;TYPE=CELL:${leader_phone}`,
      leader_line_id ? `X-SOCIALPROFILE;type=line:${leader_line_id}` : '',
      'END:VCARD'
    ].join('\n');

    // Add BOM for UTF-8 support
    const blob = new Blob(['\uFEFF' + vcfContent], { type: 'text/vcard;charset=utf-8' });

    try {
      // Try Web Share API (Mobile friendly)
      // Check if the browser supports sharing files
      const file = new File([blob], `${leader_name || 'leader'}.vcf`, { type: 'text/vcard' });
      
      if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: '領隊聯絡資訊',
          text: `這是領隊 ${leader_name} 的聯絡資訊`,
        });
        return;
      }
    } catch (error) {
      console.log('Web Share API failed or not supported, falling back to download:', error);
    }

    // Fallback: Standard Download
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${leader_name || 'leader'}.vcf`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // Cleanup
    setTimeout(() => URL.revokeObjectURL(url), 100);
  };

  const contactUrl = `tel:${leader_phone}`;

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden mb-6 transition-all">
      <div className="bg-gradient-to-r from-blue-600 to-blue-500 p-0 text-white relative">
        <div className="flex items-stretch relative z-10 min-h-[80px]">
          {/* Left: Leader Info Toggle */}
          <div 
            onClick={() => setIsOpen(!isOpen)}
            className="flex-1 flex items-center gap-3 p-4 cursor-pointer hover:bg-white/10 transition-colors active:bg-white/20"
          >
            <div className="w-12 h-12 rounded-full border-2 border-white/30 overflow-hidden bg-white shrink-0">
              {leader_photo ? (
                <img src={leader_photo} alt={leader_name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-blue-100 text-blue-500">
                  <User size={20} />
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1 text-[10px] font-medium opacity-90 mb-0.5">
                您的領隊
                {isOpen ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
              </div>
              <h3 className="text-lg font-bold truncate pr-2">{leader_name}</h3>
            </div>
          </div>

          {/* Divider */}
          <div className="w-px bg-white/20 my-2" />

          {/* Right: SOS Button */}
          {onSOSClick && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onSOSClick();
              }}
              disabled={isSOSLoading}
              className="px-6 flex flex-col items-center justify-center gap-1 bg-red-500/0 hover:bg-red-500/20 active:bg-red-500/30 transition-colors text-white disabled:opacity-70 disabled:cursor-not-allowed group"
            >
              <div className="bg-red-500 w-10 h-10 rounded-full flex items-center justify-center shadow-lg group-active:scale-95 transition-transform border-2 border-white/20">
                {isSOSLoading ? (
                  <Loader2 size={20} className="animate-spin" />
                ) : (
                  <AlertTriangle size={20} className="fill-white stroke-red-600" />
                )}
              </div>
              <span className="text-[10px] font-black tracking-wider opacity-90">SOS</span>
            </button>
          )}
        </div>
        
        {/* Decorative circle */}
        <div className="absolute -right-6 -bottom-10 w-32 h-32 bg-white/5 rounded-full blur-2xl pointer-events-none"></div>
      </div>

      {isOpen && (
        <div className="p-5 space-y-4 animate-in slide-in-from-top-2 fade-in duration-200">
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
          <a 
            href={`https://line.me/ti/p/~${leader_line_id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-4 p-3 rounded-xl hover:bg-slate-50 transition-colors"
          >
            <div className="w-10 h-10 rounded-full bg-[#06C755]/10 flex items-center justify-center text-[#06C755] shrink-0">
              <MessageCircle size={20} />
            </div>
            <div>
              <div className="text-xs text-slate-500">LINE ID (點擊加入LINE)</div>
              <div className="font-bold text-slate-800">{leader_line_id}</div>
            </div>
          </a>
        )}

        <div className="grid grid-cols-2 gap-3 pt-2">
          <button
            onClick={handleDownloadVcf}
            className="flex flex-col items-center justify-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 py-3 rounded-xl font-medium text-sm transition-colors"
          >
            <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-slate-600 shadow-sm">
              <Download size={16} />
            </div>
            存入通訊錄
          </button>
          
          <button
            onClick={() => setShowQr(!showQr)}
            className="flex flex-col items-center justify-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 py-3 rounded-xl font-medium text-sm transition-colors"
          >
            <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-slate-600 shadow-sm">
              <User size={16} />
            </div>
            {showQr ? '隱藏名片' : '顯示名片'}
          </button>
        </div>

        {/* QR Code Section */}
        {showQr && contactUrl && (
          <div className="mt-4 p-4 bg-white border-2 border-slate-100 rounded-xl flex flex-col items-center animate-in zoom-in-95 duration-200">
            <QRCodeSVG value={contactUrl} size={180} />
            <p className="mt-3 text-xs text-slate-500 font-medium">掃描上方 QR Code 撥打電話給領隊</p>
          </div>
        )}

        {/* Send Location Button */}
        <button
          onClick={handleSendLocation}
          disabled={locationLoading}
          className="w-full mt-4 bg-orange-500 hover:bg-orange-600 text-white p-4 rounded-xl font-bold flex items-center justify-center gap-2 transition-all active:scale-95 shadow-lg shadow-orange-500/20"
        >
          {locationLoading ? (
            <Loader2 size={20} className="animate-spin" />
          ) : (
            <MapPin size={20} />
          )}
          {locationLoading ? '定位中...' : '我找不到路，傳送位置給領隊'}
        </button>
      </div>
      )}
    </div>
  );
}
