import React, { useState } from 'react';
import { CarTaxiFront, X, Map, Phone, User, Volume2 } from 'lucide-react';
import { Hotel } from '@/types/database';

interface TaxiModeProps {
  hotel: Hotel;
  leaderPhone?: string;
}

export default function TaxiMode({ hotel, leaderPhone }: TaxiModeProps) {
  const [isOpen, setIsOpen] = useState(false);

  const handleOpen = () => {
    setIsOpen(true);
  };

  const handleClose = () => {
    setIsOpen(false);
    window.speechSynthesis.cancel(); // Stop speaking when closed
  };

  const detectLanguage = (text: string) => {
    if (/[\u3040-\u309f\u30a0-\u30ff]/.test(text)) return 'ja-JP'; // Hiragana/Katakana
    if (/[\uac00-\ud7af]/.test(text)) return 'ko-KR'; // Hangul
    if (/[\u0e00-\u0e7f]/.test(text)) return 'th-TH'; // Thai
    return 'zh-TW'; // Default to Traditional Chinese
  };

  const playAudio = async (text: string, lang: string) => {
    try {
      const audio = new Audio(`/api/tts?text=${encodeURIComponent(text)}&lang=${lang}`);
      await audio.play();
    } catch (e) {
      console.error('Audio playback failed', e);
      alert('語音播放失敗，請檢查網路連線');
    }
  };

  const handleSpeak = () => {
    if (typeof window === 'undefined') return;
    
    const text = `${hotel.local_name || hotel.name}。${hotel.local_address || hotel.address}`;
    const lang = detectLanguage(text);
    const win = window as any;

    // First try Native TTS
    if (win.speechSynthesis) {
      // Check if voices are loaded
      const voices = win.speechSynthesis.getVoices();
      
      // If voices are empty (common in some WebViews), try to force API or wait?
      // For immediate user satisfaction, if voices are 0, use API fallback.
      if (voices.length === 0) {
        console.warn('Native TTS voices empty, using API fallback');
        playAudio(text, lang);
        return;
      }

      win.speechSynthesis.cancel(); // Stop any current speech
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = lang; 
      utterance.rate = 0.8; 
      utterance.pitch = 1;
      utterance.volume = 1;

      const voice = voices.find((v: any) => v.lang.includes(lang.replace('-', '_')) || v.lang.includes(lang));
      if (voice) utterance.voice = voice;

      // Add error handling for utterance
      utterance.onerror = (e: any) => {
        console.error('Native TTS error', e);
        playAudio(text, lang);
      };

      win.speechSynthesis.speak(utterance);
    } else {
      // Fallback: Use our hidden API Proxy (no redirect)
      playAudio(text, lang);
    }
  };

  if (!hotel) return null;

  return (
    <>
      <button
        onClick={handleOpen}
        className="flex items-center justify-center gap-2 bg-yellow-400 text-black px-6 py-4 rounded-2xl font-black shadow-lg shadow-yellow-400/20 active:scale-95 transition-all w-full text-lg uppercase tracking-wider"
      >
        <CarTaxiFront size={28} />
        <span>計程車助手 / Taxi Mode</span>
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 bg-black text-white flex flex-col p-6 overflow-y-auto">
          {/* Close Button */}
          <button 
            onClick={handleClose}
            className="absolute top-4 right-4 p-2 bg-gray-800 rounded-full text-white hover:bg-gray-700 z-50"
          >
            <X size={32} />
          </button>

          <div className="flex-1 flex flex-col justify-center space-y-8 mt-10">
            {/* Header */}
            <div className="text-center space-y-2">
              <p className="text-xs text-gray-500 mb-2 font-bold animate-pulse">💡 建議調高螢幕亮度以利閱讀</p>
              <p className="text-xl text-gray-400">請帶我去這家飯店</p>
              <h2 className="text-3xl font-bold text-yellow-400">Please take me to this hotel</h2>
            </div>

            {/* Hotel Name */}
            <div className="text-center space-y-4">
              <h1 className="text-5xl font-black leading-tight break-words">
                {hotel.local_name || hotel.name}
              </h1>
              {hotel.local_name && hotel.name && (
                <p className="text-xl text-gray-400">{hotel.name}</p>
              )}
            </div>

            {/* Hotel Address */}
            <div className="bg-gray-900 p-6 rounded-xl border border-gray-700">
               <p className="text-2xl font-bold leading-relaxed text-center break-words">
                 {hotel.local_address || hotel.address}
               </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="mt-8 space-y-4 pb-8">
            {/* Speak Address */}
            <button
              onClick={handleSpeak}
              className="flex items-center justify-center gap-3 w-full bg-purple-600 hover:bg-purple-700 text-white py-4 rounded-xl text-xl font-bold"
            >
              <Volume2 size={28} />
              朗讀地址給司機聽
            </button>

            {/* Google Map */}
            <a
              href={hotel.google_map_url || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent((hotel.local_name || hotel.name) + ' ' + (hotel.local_address || hotel.address))}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-3 w-full bg-blue-600 hover:bg-blue-700 text-white py-4 rounded-xl text-xl font-bold"
            >
              <Map size={28} />
              開啟 Google Map 導航
            </a>

            {/* Call Hotel */}
            <a
              href={`tel:${hotel.phone}`}
              className="flex items-center justify-center gap-3 w-full bg-green-600 hover:bg-green-700 text-white py-4 rounded-xl text-xl font-bold"
            >
              <Phone size={28} />
              撥打飯店電話
            </a>

            {/* Call Leader */}
            {leaderPhone && (
              <a
                href={`tel:${leaderPhone}`}
                className="flex items-center justify-center gap-3 w-full bg-red-600 hover:bg-red-700 text-white py-4 rounded-xl text-xl font-bold"
              >
                <User size={28} />
                聯絡領隊協助溝通
              </a>
            )}
          </div>
        </div>
      )}
    </>
  );
}
