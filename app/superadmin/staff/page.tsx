"use client";

import { useEffect, useState, useCallback } from "react";
import { Area } from "react-easy-crop";
import { RefreshCcw } from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { getCroppedImg, compressImage } from "@/lib/image-processing";

import { StaffSection } from "@/components/superadmin/StaffSection";
import { StaffFormModal } from "@/components/superadmin/StaffFormModal";
import { ConfirmModal } from "@/components/superadmin/ConfirmModal";
import { ImageCropperModal } from "@/components/superadmin/ImageCropperModal";

export default function StaffPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  
  // Cropper States
  const [isCropping, setIsCropping] = useState(false);
  const [tempImage, setTempImage] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  
  // UI States
  const [isModalOpen, setModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");

  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    actionLabel: string;
    type: 'danger' | 'warning' | 'info';
    onConfirm: () => void;
  } | null>(null);

  const [form, setForm] = useState({ 
    email: '', password: '', full_name: '', role: 'kurir',
    phone: '', employee_id: '', address: '', avatar_url: ''
  });

  const supabase = createSupabaseBrowserClient();

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/superadmin/users");
      const json = await res.json();
      if (json.ok) setUsers(json.data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const openConfirm = (title: string, message: string, actionLabel: string, type: 'danger'|'warning'|'info', onConfirm: () => void) => {
    setConfirmDialog({ isOpen: true, title, message, actionLabel, type, onConfirm });
  };

  const closeConfirm = () => setConfirmDialog(null);

  const onCropComplete = useCallback((_area: Area, pixels: Area) => {
    setCroppedAreaPixels(pixels);
  }, []);

  const handleSaveCrop = async () => {
    if (!tempImage || !croppedAreaPixels) return;
    try {
      const croppedBlob = await getCroppedImg(tempImage, croppedAreaPixels);
      if (!croppedBlob) return;
      const compressedFile = await compressImage(croppedBlob);
      const url = URL.createObjectURL(compressedFile);
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setPreviewUrl(url);
      setSelectedFile(compressedFile);
      setIsCropping(false);
      setTempImage(null);
    } catch (e) {
      console.error(e);
      alert("Gagal memproses gambar");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const action = async () => {
      setIsUploading(true);
      let currentAvatarUrl = form.avatar_url;
      try {
        if (selectedFile) {
          const fileName = `${editingUser?.user_id || `new-${Date.now()}`}-${Math.random()}.jpg`;
          const filePath = `avatars/${fileName}`;
          const { error: uploadError } = await supabase.storage.from('avatars').upload(filePath, selectedFile);
          if (uploadError) throw uploadError;
          const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(filePath);
          currentAvatarUrl = publicUrl;
        }

        const url = editingUser ? `/api/superadmin/users/${editingUser.user_id}` : "/api/superadmin/users";
        const method = editingUser ? "PATCH" : "POST";
        const res = await fetch(url, {
          method,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...form, avatar_url: currentAvatarUrl }),
        });

        if (res.ok) {
          closeModal();
          fetchUsers();
          closeConfirm();
        } else {
          alert("Terjadi kesalahan saat menyimpan data.");
        }
      } catch (error: any) {
        alert("Gagal memproses data: " + error.message);
      } finally {
        setIsUploading(false);
      }
    };

    if (editingUser) {
      openConfirm("Konfirmasi Pembaruan", "Apakah Anda yakin ingin memperbarui data profil staf ini?", "Perbarui Data", "info", action);
    } else {
      action(); 
    }
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingUser(null);
    setForm({ email: '', password: '', full_name: '', role: 'kurir', phone: '', employee_id: '', address: '', avatar_url: '' });
    setSelectedFile(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setIsCropping(false);
    setTempImage(null);
  };

  const openEditModal = (user: any) => {
    setEditingUser(user);
    setForm({ 
      email: user.email || '', password: '', full_name: user.full_name, role: user.role,
      phone: user.phone || '', employee_id: user.employee_id || '', address: user.address || '', avatar_url: user.avatar_url || ''
    });
    setModalOpen(true);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    setTempImage(url);
    setIsCropping(true);
    setZoom(1);
    setCrop({ x: 0, y: 0 });
  };

  const handleToggleSuspend = (user: any) => {
    const isSuspending = !user.is_suspended;
    openConfirm(
      isSuspending ? "Tangguhkan Akses" : "Pulihkan Akses",
      `Apakah Anda yakin ingin ${isSuspending ? 'menangguhkan' : 'memulihkan'} akses untuk ${user.full_name}?`,
      isSuspending ? "Ya, Tangguhkan" : "Ya, Pulihkan",
      isSuspending ? "warning" : "info",
      async () => {
        await fetch(`/api/superadmin/users/${user.user_id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...user, is_suspended: isSuspending }),
        });
        fetchUsers();
        closeConfirm();
      }
    );
  };

  const handleDeleteUser = (userId: string, userName: string) => {
    openConfirm(
      "Hapus Staf Permanen",
      `Apakah Anda yakin ingin menghapus akun ${userName} secara permanen?`,
      "Hapus Permanen",
      "danger",
      async () => {
        await fetch(`/api/superadmin/users/${userId}`, { method: "DELETE" });
        fetchUsers();
        closeConfirm();
      }
    );
  };

  if (loading && users.length === 0) {
    return <div className="flex h-96 items-center justify-center text-orange-500"><RefreshCcw className="animate-spin" size={32} /></div>;
  }

  return (
    <>
      <StaffSection 
        users={users}
        searchTerm={searchTerm}
        roleFilter={roleFilter}
        onSearchChange={setSearchTerm}
        onRoleFilterChange={setRoleFilter}
        onAddStaff={() => setModalOpen(true)}
        onEditStaff={openEditModal}
        onToggleSuspend={handleToggleSuspend}
        onDeleteStaff={handleDeleteUser}
      />

      <ImageCropperModal 
        isOpen={isCropping} image={tempImage} crop={crop} zoom={zoom}
        onCropChange={setCrop} onZoomChange={setZoom} onCropComplete={onCropComplete}
        onSave={handleSaveCrop} onCancel={() => { setIsCropping(false); setTempImage(null); }}
      />

      <ConfirmModal 
        isOpen={!!confirmDialog}
        title={confirmDialog?.title || ""}
        message={confirmDialog?.message || ""}
        actionLabel={confirmDialog?.actionLabel || ""}
        type={confirmDialog?.type || "info"}
        onConfirm={confirmDialog?.onConfirm || (() => {})}
        onClose={closeConfirm}
      />

      <StaffFormModal 
        isOpen={isModalOpen} editingUser={editingUser} form={form}
        previewUrl={previewUrl} isUploading={isUploading} onClose={closeModal}
        onFormChange={(field, value) => setForm(prev => ({ ...prev, [field]: value }))}
        onFileUpload={handleFileUpload} onSubmit={handleSubmit}
      />
    </>
  );
}
