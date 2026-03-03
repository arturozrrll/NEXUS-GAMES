
// Rebuild trigger
import React, { useRef, useState, useEffect } from 'react';
import { X, Download, Share2, Loader2, Instagram, Check } from 'lucide-react';
import * as modernScreenshot from 'modern-screenshot';
import { Game } from '../types';

interface ShareStoryModalProps {
  game: Game;
  isOpen: boolean;
  onClose: () => void;
}

export const ShareStoryModal: React.FC<ShareStoryModalProps> = ({ game, isOpen, onClose }) => {
  const storyRef = useRef<HTMLDivElement>(null);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isCopied, setIsCopied] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setGeneratedImage(null);
      setIsCopied(false);
      // Give it a moment to render before capturing
      const timer = setTimeout(() => {
        generateImage();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [isOpen, game]);

  const generateImage = async () => {
    if (!storyRef.current) return;
    setIsGenerating(true);
    try {
      // Ensure images are loaded
      const images = storyRef.current.querySelectorAll('img');
      await Promise.all(Array.from(images).map(img => {
        if (img.complete) return Promise.resolve();
        return new Promise(resolve => {
          img.onload = resolve;
          img.onerror = resolve;
        });
      }));

      const dataUrl = await modernScreenshot.domToPng(storyRef.current, {
        quality: 0.95,
        scale: 2, // High quality
      });
      setGeneratedImage(dataUrl);
    } catch (err) {
      console.error('Failed to generate image', err);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownload = () => {
    if (!generatedImage) return;
    const link = document.createElement('a');
    link.download = `arsur_story_${game.slug}.png`;
    link.href = generatedImage;
    link.click();
  };

  const handleCopy = async () => {
    if (!generatedImage) return;
    try {
      const response = await fetch(generatedImage);
      const blob = await response.blob();
      await navigator.clipboard.write([
        new ClipboardItem({
          [blob.type]: blob
        })
      ]);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy image', err);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
      <div 
        className="absolute inset-0 bg-slate-950/90 backdrop-blur-xl animate-fade-in"
        onClick={onClose}
      />

      <div className="relative w-full max-w-lg bg-[#0b101b] rounded-[32px] shadow-2xl border border-white/10 overflow-hidden flex flex-col max-h-[90vh] animate-slide-up">
        <div className="flex items-center justify-between p-6 border-b border-white/5">
          <h3 className="text-lg font-black text-white flex items-center gap-2">
            <Instagram size={20} className="text-pink-500" /> Compartir en Instagram
          </h3>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-white transition-colors">
            <X size={24} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-8 flex flex-col items-center gap-8 custom-scrollbar">
          
          {/* Hidden Story Template (used for generation) */}
          <div className="absolute top-[-9999px] left-[-9999px]">
            <div 
              ref={storyRef}
              className="w-[1080px] h-[1920px] bg-[#020617] relative overflow-hidden flex flex-col font-sans"
              style={{ width: '1080px', height: '1920px' }}
            >
              {/* Background */}
              <div className="absolute inset-0">
                <img 
                  src={game.bannerUrl} 
                  className="w-full h-full object-cover opacity-30 blur-2xl scale-110" 
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#020617] via-transparent to-[#020617]/50" />
              </div>

              {/* Content Container */}
              <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-16 py-32 text-center">
                
                {/* Cover */}
                <div className="mb-16 transform rotate-[-2deg]">
                  <img 
                    src={game.coverUrl} 
                    className="w-[500px] rounded-[40px] shadow-[0_40px_100px_-20px_rgba(0,0,0,0.8)] border-[4px] border-white/10" 
                    referrerPolicy="no-referrer"
                  />
                </div>

                {/* Game Title */}
                <h1 className="text-[90px] font-black text-white leading-tight tracking-tighter mb-8 drop-shadow-2xl">
                  {game.title}
                </h1>

                {/* Score & Hours Badge */}
                <div className="mb-12 flex gap-8">
                  <div className="inline-flex flex-col items-center bg-white/10 backdrop-blur-3xl border border-white/20 rounded-[40px] px-12 py-8 shadow-2xl">
                    <span className="text-[30px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-2">Mi Nota</span>
                    <div className="flex items-baseline gap-2">
                      <span className="text-[140px] font-black text-brand-primary leading-none">
                        {game.rating10 || '-'}
                      </span>
                      <span className="text-[60px] font-black text-slate-500">/10</span>
                    </div>
                  </div>

                  {game.hoursPlayed > 0 && (
                    <div className="inline-flex flex-col items-center bg-white/10 backdrop-blur-3xl border border-white/20 rounded-[40px] px-12 py-8 shadow-2xl">
                      <span className="text-[30px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-2">Tiempo</span>
                      <div className="flex items-baseline gap-2">
                        <span className="text-[140px] font-black text-white leading-none">
                          {game.hoursPlayed.toFixed(0)}
                        </span>
                        <span className="text-[60px] font-black text-slate-500">h</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Review Text */}
                {game.review && (
                  <div className="max-w-[800px] bg-black/40 backdrop-blur-xl border border-white/5 rounded-[40px] p-12 shadow-2xl">
                    <p className="text-[42px] text-slate-200 leading-relaxed font-medium italic">
                      "{game.review}"
                    </p>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="relative z-10 pb-20 flex flex-col items-center">
                <div className="w-24 h-1 bg-brand-primary rounded-full mb-6" />
                <span className="text-[32px] font-black text-white tracking-[0.3em] uppercase opacity-50">
                  arsur
                </span>
              </div>
            </div>
          </div>

          {/* Preview of generated image */}
          <div className="w-full max-w-[300px] aspect-[9/16] bg-slate-900 rounded-3xl overflow-hidden shadow-2xl border border-white/10 relative">
            {isGenerating ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 text-slate-400">
                <Loader2 size={32} className="animate-spin text-brand-primary" />
                <p className="text-xs font-bold uppercase tracking-widest">Generando Story...</p>
              </div>
            ) : generatedImage ? (
              <img src={generatedImage} className="w-full h-full object-cover animate-fade-in" />
            ) : null}
          </div>

          <p className="text-center text-slate-400 text-sm max-w-xs">
            Se ha generado una imagen optimizada para Instagram Stories con tu reseña y puntuación.
          </p>

          <div className="grid grid-cols-2 gap-4 w-full">
            <button 
              onClick={handleCopy}
              disabled={!generatedImage}
              className={`py-4 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50 ${isCopied ? 'bg-green-500 text-white' : 'bg-white/5 text-white hover:bg-white/10 border border-white/10'}`}
            >
              {isCopied ? <Check size={20} /> : <Share2 size={20} />}
              {isCopied ? 'Copiado!' : 'Copiar Imagen'}
            </button>
            <button 
              onClick={handleDownload}
              disabled={!generatedImage}
              className="py-4 bg-brand-primary hover:bg-brand-primary/90 text-white font-bold rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-brand-primary/20 transition-all active:scale-95 disabled:opacity-50"
            >
              <Download size={20} /> Descargar PNG
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
