import React from 'react';
import Cropper, { Area } from 'react-easy-crop';
import { X, ZoomIn, ZoomOut } from 'lucide-react';

interface ImageCropperModalProps {
  isOpen: boolean;
  image: string | null;
  crop: { x: number; y: number };
  zoom: number;
  onCropChange: (crop: { x: number; y: number }) => void;
  onZoomChange: (zoom: number) => void;
  onCropComplete: (area: Area, pixels: Area) => void;
  onSave: () => void;
  onCancel: () => void;
}

export function ImageCropperModal({
  isOpen,
  image,
  crop,
  zoom,
  onCropChange,
  onZoomChange,
  onCropComplete,
  onSave,
  onCancel
}: ImageCropperModalProps) {
  if (!isOpen || !image) return null;

  return (
    <div className="fixed inset-0 z-[300] flex flex-col items-center justify-center bg-black/95 backdrop-blur-xl p-4 sm:p-10 animate-in fade-in duration-300">
      <div className="w-full max-w-xl flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-black text-white tracking-tight">Sesuaikan Foto.</h2>
            <p className="text-[10px] font-black uppercase tracking-widest text-orange-500">Geser dan Zoom untuk Presisi Optimal</p>
          </div>
          <button onClick={onCancel} className="p-3 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors">
            <X size={20} className="text-slate-300" />
          </button>
        </div>

        <div className="relative h-[350px] sm:h-[450px] w-full bg-slate-900 rounded-[3rem] overflow-hidden border border-white/10 shadow-2xl">
          <Cropper
            image={image}
            crop={crop}
            zoom={zoom}
            aspect={1}
            onCropChange={onCropChange}
            onCropComplete={onCropComplete}
            onZoomChange={onZoomChange}
            cropShape="rect"
            showGrid={true}
          />
        </div>

        <div className="bg-white/5 border border-white/10 p-6 rounded-[2.5rem] flex flex-col gap-6">
          <div className="flex items-center gap-6">
            <ZoomOut size={18} className="text-slate-500" />
            <input
              type="range"
              value={zoom}
              min={1}
              max={3}
              step={0.1}
              aria-labelledby="Zoom"
              onChange={(e) => onZoomChange(Number(e.target.value))}
              className="flex-1 accent-orange-500 h-1.5 bg-white/10 rounded-full appearance-none cursor-pointer"
            />
            <ZoomIn size={18} className="text-slate-500" />
          </div>

          <div className="flex gap-4">
            <button 
              onClick={onCancel} 
              className="flex-1 bg-white/5 border border-white/10 text-white font-black text-[10px] uppercase tracking-widest py-5 rounded-2xl hover:bg-white/10 transition-colors"
            >
              Batal
            </button>
            <button 
              onClick={onSave} 
              className="flex-1 bg-orange-600 text-white font-black text-[10px] uppercase tracking-widest py-5 rounded-2xl hover:bg-orange-500 transition-all shadow-[0_0_20px_rgba(249,115,22,0.3)]"
            >
              Terapkan Potongan
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
