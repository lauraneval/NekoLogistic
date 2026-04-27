"use client";

import { useState, useCallback } from "react";
import { Area } from "react-easy-crop";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { getCroppedImg, compressImage } from "@/lib/image-processing";
import { createStaffAction, updateStaffAction, deleteStaffAction } from "@/lib/actions/superadmin-actions";

import { StaffSection } from "@/components/superadmin/StaffSection";
import { StaffFormModal } from "@/components/superadmin/StaffFormModal";
import { ConfirmModal } from "@/components/superadmin/ConfirmModal";
import { ImageCropperModal } from "@/components/superadmin/ImageCropperModal";

export default function StaffPageClient({ initialUsers }: { initialUsers: any[] }) {
  // Use initial data but allow updates (though revalidatePath will handle sync on refresh)
  // For better UX, we can use local state for filtering/immediate feedback
  const [users] = useState<any[]>(initialUsers);
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

        const formData = { ...form, avatar_url: currentAvatarUrl };
        
        if (editingUser) {
          await updateStaffAction(editingUser.user_id, formData);
        } else {
          await createStaffAction(formData);
        }

        closeModal();
        closeConfirm();
      } catch (error: any) {
        alert("Gagal: " + error.message);
      } finally {
        setIsUploading(false);
      }
    };

    if (editingUser) {
      openConfirm("Konfirmasi", "Simpan perubahan profil?", "Simpan", "info", action);
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
  };

  return (
    <>
      <StaffSection 
        users={users} searchTerm={searchTerm} roleFilter={roleFilter}
        onSearchChange={setSearchTerm} onRoleFilterChange={setRoleFilter}
        onAddStaff={() => setModalOpen(true)} onEditStaff={openEditModal}
        onToggleSuspend={(user) => {
          const isSuspending = !user.is_suspended;
          openConfirm(isSuspending ? "Tangguhkan" : "Pulihkan", "Ubah status akses?", "Ya", "warning", 
          () => updateStaffAction(user.user_id, { ...user, is_suspended: isSuspending }).then(closeConfirm));
        }}
        onDeleteStaff={(id) => openConfirm("Hapus", "Hapus akun permanen?", "Hapus", "danger", 
        () => deleteStaffAction(id).then(closeConfirm))}
      />

      <ImageCropperModal 
        isOpen={isCropping} image={tempImage} crop={crop} zoom={zoom}
        onCropChange={setCrop} onZoomChange={setZoom} onCropComplete={onCropComplete}
        onSave={handleSaveCrop} onCancel={() => setIsCropping(false)}
      />

      <ConfirmModal 
        isOpen={!!confirmDialog} {...confirmDialog!} onClose={closeConfirm}
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
