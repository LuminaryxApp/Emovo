"use client";

import { Camera, LogOut, Trash2, X, Pencil, Check, Globe } from "lucide-react";
import { useState } from "react";

import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/providers/toast-provider";
import { useAuthStore } from "@/stores/auth.store";

export default function ProfilePage() {
  const { user, updateProfile, logout, logoutAll, deleteAccount } = useAuthStore();
  const { addToast } = useToast();

  // Edit profile state
  const [editing, setEditing] = useState(false);
  const [displayName, setDisplayName] = useState(user?.displayName || "");
  const [username, setUsername] = useState(user?.username || "");
  const [bio, setBio] = useState(user?.bio || "");
  const [saving, setSaving] = useState(false);

  // Delete account state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState("");

  // Avatar removal state
  const [removingAvatar, setRemovingAvatar] = useState(false);

  // Timezone state
  const [editingTimezone, setEditingTimezone] = useState(false);
  const [timezoneValue, setTimezoneValue] = useState(user?.timezone || "");
  const [savingTimezone, setSavingTimezone] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateProfile({
        displayName,
        username: username || undefined,
        bio: bio || undefined,
      });
      addToast("success", "Profile updated");
      setEditing(false);
    } catch {
      addToast("error", "Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (deleteConfirm !== "DELETE") return;
    try {
      await deleteAccount();
    } catch {
      addToast("error", "Failed to delete account");
    }
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = (reader.result as string).split(",")[1];
      try {
        await updateProfile({ avatarBase64: base64 });
        addToast("success", "Photo updated");
      } catch {
        addToast("error", "Failed to update photo");
      }
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveAvatar = async () => {
    setRemovingAvatar(true);
    try {
      await updateProfile({ avatarBase64: null });
      addToast("success", "Photo removed");
    } catch {
      addToast("error", "Failed to remove photo");
    } finally {
      setRemovingAvatar(false);
    }
  };

  const handleSaveTimezone = async () => {
    if (!timezoneValue.trim()) return;
    setSavingTimezone(true);
    try {
      await updateProfile({ timezone: timezoneValue.trim() });
      addToast("success", "Timezone updated");
      setEditingTimezone(false);
    } catch {
      addToast("error", "Failed to update timezone");
    } finally {
      setSavingTimezone(false);
    }
  };

  const handleCancelTimezone = () => {
    setTimezoneValue(user?.timezone || "");
    setEditingTimezone(false);
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-text-primary">Profile</h1>

      {/* Profile card */}
      <Card className="p-6">
        <div className="flex items-start gap-4">
          {/* Avatar with upload + remove */}
          <div className="relative">
            <Avatar src={user?.avatarBase64} name={user?.displayName} size="2xl" />
            {/* Upload button */}
            <label className="absolute bottom-0 right-0 flex h-8 w-8 cursor-pointer items-center justify-center rounded-full bg-brand-green text-white shadow-md hover:bg-brand-green-dark transition-colors">
              <Camera size={14} />
              <input
                type="file"
                accept="image/*"
                onChange={handleAvatarChange}
                className="hidden"
              />
            </label>
            {/* Remove avatar button (only shown when avatar exists) */}
            {user?.avatarBase64 && (
              <button
                onClick={handleRemoveAvatar}
                disabled={removingAvatar}
                className="absolute -right-1 -top-1 flex h-6 w-6 items-center justify-center rounded-full bg-error text-white shadow-md transition-opacity hover:opacity-90 disabled:opacity-50"
                title="Remove photo"
              >
                <X size={12} />
              </button>
            )}
          </div>

          {/* Profile info / edit form */}
          <div className="flex-1">
            {editing ? (
              <div className="space-y-3">
                <Input
                  label="Display Name"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                />
                <Input
                  label="Username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                />
                <Textarea
                  label="Bio"
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  maxLength={500}
                  rows={2}
                />
                <div className="flex gap-2">
                  <Button onClick={handleSave} loading={saving}>
                    Save
                  </Button>
                  <Button variant="ghost" onClick={() => setEditing(false)}>
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <div>
                <h2 className="text-xl font-bold text-text-primary">{user?.displayName}</h2>
                {user?.username && <p className="text-sm text-text-secondary">@{user.username}</p>}
                {user?.bio && <p className="mt-2 text-sm text-text-secondary">{user.bio}</p>}
                <p className="mt-1 text-xs text-text-tertiary">{user?.email}</p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-3"
                  onClick={() => {
                    setDisplayName(user?.displayName || "");
                    setUsername(user?.username || "");
                    setBio(user?.bio || "");
                    setEditing(true);
                  }}
                >
                  Edit Profile
                </Button>
              </div>
            )}
          </div>
        </div>
      </Card>

      {/* Timezone */}
      <Card className="p-4">
        <h3 className="mb-3 flex items-center gap-1.5 text-sm font-semibold uppercase text-section-label">
          <Globe size={16} />
          Timezone
        </h3>
        {editingTimezone ? (
          <div className="flex items-end gap-2">
            <div className="flex-1">
              <Input
                label="Timezone (e.g. America/New_York)"
                value={timezoneValue}
                onChange={(e) => setTimezoneValue(e.target.value)}
                placeholder="America/New_York"
              />
            </div>
            <Button
              size="sm"
              onClick={handleSaveTimezone}
              loading={savingTimezone}
              disabled={!timezoneValue.trim()}
            >
              <Check size={14} className="mr-1" />
              Save
            </Button>
            <Button variant="ghost" size="sm" onClick={handleCancelTimezone}>
              Cancel
            </Button>
          </div>
        ) : (
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-text-primary">{user?.timezone || "Not set"}</p>
              <p className="text-xs text-text-tertiary">
                Used for mood entry timestamps and statistics
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setTimezoneValue(user?.timezone || "");
                setEditingTimezone(true);
              }}
            >
              <Pencil size={14} className="mr-1" />
              Edit
            </Button>
          </div>
        )}
      </Card>

      {/* Account actions */}
      <Card className="p-4">
        <h3 className="mb-3 text-sm font-semibold uppercase text-section-label">Account</h3>
        <div className="space-y-2">
          <button
            onClick={() => logout()}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-text-secondary hover:bg-surface-elevated"
          >
            <LogOut size={18} />
            Log Out
          </button>
          <button
            onClick={() => logoutAll()}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-text-secondary hover:bg-surface-elevated"
          >
            <LogOut size={18} />
            Log Out All Devices
          </button>
          <button
            onClick={() => setShowDeleteModal(true)}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-error hover:bg-error/5"
          >
            <Trash2 size={18} />
            Delete Account
          </button>
        </div>
      </Card>

      {/* Delete modal */}
      <Modal
        open={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        title="Delete Account?"
      >
        <p className="text-sm text-text-secondary">
          This will permanently delete your account and all data. This cannot be undone.
        </p>
        <Input
          label="Type DELETE to confirm"
          value={deleteConfirm}
          onChange={(e) => setDeleteConfirm(e.target.value)}
          className="mt-4"
        />
        <div className="mt-4 flex gap-2 justify-end">
          <Button variant="ghost" onClick={() => setShowDeleteModal(false)}>
            Cancel
          </Button>
          <Button variant="danger" onClick={handleDelete} disabled={deleteConfirm !== "DELETE"}>
            Delete Account
          </Button>
        </div>
      </Modal>
    </div>
  );
}
