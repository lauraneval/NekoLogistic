import React from 'react';
import { X, Camera, RefreshCcw } from 'lucide-react';

interface StaffFormModalProps {
  isOpen: boolean;
  editingUser: any;
  form: any;
  previewUrl: string | null;
  isUploading: boolean;
  onClose: () => void;
  onFormChange: (field: string, value: any) => void;
  onFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSubmit: (e: React.FormEvent) => void;
}

export function StaffFormModal({
  isOpen,
  editingUser,
  form,
  previewUrl,
  isUploading,
  onClose,
  onFormChange,
  onFileUpload,
  onSubmit
}: StaffFormModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-md p-4 sm:p-6 animate-in fade-in duration-200">
      <div className="w-full max-w-2xl bg-[#1a1410] border border-orange-500/20 rounded-[3rem] p-6 sm:p-10 shadow-[0_0_50px_rgba(0,0,0,0.5)] relative overflow-y-auto max-h-[90vh] custom-scrollbar">
        <button onClick={onClose} className="absolute top-6 right-6 p-3 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors"><X size={20} className="text-slate-300" /></button>
        <h2 className="text-3xl font-black tracking-tight text-white mb-2">{editingUser ? 'Perbarui Data Staf.' : 'Registrasi Staf Baru.'}</h2>
        <p className="text-slate-400 mb-8 font-medium text-sm">Formulir otorisasi dan identitas keamanan NekoLogistic.</p>

        <form onSubmit={onSubmit} className="space-y-6">
          <div className="flex flex-col items-center justify-center gap-4 mb-8 bg-black/20 p-6 rounded-[2rem] border border-white/5">
            <div className="relative group cursor-pointer">
              <div className="h-32 w-32 rounded-[2rem] bg-slate-900 overflow-hidden border-2 border-white/10 shadow-xl transition-all group-hover:border-orange-500/50">
                {(previewUrl || form.avatar_url) ? (
                  <img src={previewUrl || form.avatar_url} alt="Avatar" className="h-full w-full object-cover" />
                ) : (
                  <div className="h-full w-full flex items-center justify-center text-4xl font-black text-slate-600">
                    {form.full_name ? form.full_name.charAt(0).toUpperCase() : '?'}
                  </div>
                )}
              </div>
              <label className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 text-white opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer backdrop-blur-sm rounded-[2rem]">
                <Camera size={28} className="mb-2 text-orange-400" />
                <span className="text-[9px] font-black uppercase tracking-widest text-center px-2">Ubah<br/>Foto</span>
                <input type="file" className="hidden" accept="image/*" onChange={onFileUpload} disabled={isUploading} />
              </label>
            </div>
            <p className="text-[10px] font-black uppercase tracking-widest text-orange-500/70">
              {isUploading ? 'MEMPROSES DATA...' : 'FORMAT: JPG/PNG/WEBP'}
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-2">Nama Lengkap</label>
              <input required value={form.full_name} onChange={e => onFormChange('full_name', e.target.value)} type="text" placeholder="John Doe" className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-sm font-bold text-white outline-none focus:border-orange-500/50 focus:ring-2 focus:ring-orange-500/20 transition-all" />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-2">Nomor Induk Pegawai (NIP)</label>
              <input value={form.employee_id} onChange={e => onFormChange('employee_id', e.target.value)} type="text" placeholder="NEKO-12345" className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-sm font-bold text-white outline-none focus:border-orange-500/50 focus:ring-2 focus:ring-orange-500/20 transition-all" />
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-6 bg-black/20 p-5 rounded-[2rem] border border-white/5">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-2">Alamat Email (Kredensial)</label>
              <input required readOnly={!!editingUser} value={form.email} onChange={e => onFormChange('email', e.target.value)} type="email" placeholder="nama@nekologistic.id" className={`w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-sm font-bold text-white outline-none focus:border-orange-500/50 focus:ring-2 focus:ring-orange-500/20 transition-all ${editingUser ? 'opacity-50 cursor-not-allowed' : ''}`} />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-2">{editingUser ? 'Kata Sandi Baru (Opsional)' : 'Kata Sandi Sementara'}</label>
              <input required={!editingUser} value={form.password} onChange={e => onFormChange('password', e.target.value)} type="password" placeholder={editingUser ? "Kosongkan jika tidak diubah" : "Minimal 8 Karakter"} className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-sm font-bold text-white outline-none focus:border-orange-500/50 focus:ring-2 focus:ring-orange-500/20 transition-all" />
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-2">Hak Akses Sistem</label>
              <select value={form.role} onChange={e => onFormChange('role', e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-sm font-bold text-white outline-none focus:border-orange-500/50 focus:ring-2 focus:ring-orange-500/20 transition-all appearance-none cursor-pointer">
                <option value="kurir" className="bg-[#1a1410]">Kurir Pengiriman</option>
                <option value="admin_gudang" className="bg-[#1a1410]">Administrator Gudang</option>
                <option value="superadmin" className="bg-[#1a1410]">Super Administrator</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-2">Nomor Kontak Aktif</label>
              <input value={form.phone} onChange={e => onFormChange('phone', e.target.value)} type="tel" placeholder="+62 8..." className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-sm font-bold text-white outline-none focus:border-orange-500/50 focus:ring-2 focus:ring-orange-500/20 transition-all" />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-2">Alamat Domisili</label>
            <textarea value={form.address} onChange={e => onFormChange('address', e.target.value)} rows={3} placeholder="Alamat lengkap sesuai identitas..." className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-sm font-bold text-white outline-none focus:border-orange-500/50 focus:ring-2 focus:ring-orange-500/20 transition-all resize-none"></textarea>
          </div>

          <button disabled={isUploading} type="submit" className="w-full bg-orange-600 text-white py-5 rounded-2xl font-black text-[11px] uppercase tracking-[0.3em] shadow-[0_0_30px_rgba(249,115,22,0.3)] hover:bg-orange-500 transition-all hover:scale-[1.02] active:scale-95 border border-orange-500/50 disabled:opacity-50 disabled:cursor-not-allowed">
            {isUploading ? (
              <span className="flex items-center justify-center gap-2">
                <RefreshCcw className="animate-spin" size={16} /> MENYIMPAN DATA...
              </span>
            ) : (
              editingUser ? 'Simpan Pembaruan Identitas' : 'Otorisasi Anggota Baru'
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
