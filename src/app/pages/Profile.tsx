"use client";

import { useState, useEffect } from "react";
import { useAuth } from "../Utils/auth";
import { useToast } from "../Utils/toast";
import LoadingSpinner from "../components/LoadingSpinner";

export default function ProfilePage() {
  const { user, logout, refreshUser } = useAuth();
  const { pushToast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [profileData, setProfileData] = useState({
    full_name: "",
    phone: "",
    address: "",
    company: "",
    bio: ""
  });
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [adminLoading, setAdminLoading] = useState(false);
  const [adminForm, setAdminForm] = useState({
    email: "",
    full_name: "",
    phone: "",
    role: "user",
    temp_password: "",
    send_link: true,
  });
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [adminMessage, setAdminMessage] = useState("");
  const [adminUsers, setAdminUsers] = useState<
    { id: number; email: string; full_name?: string; is_admin: boolean; last_seen?: string | null }[]
  >([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [usersError, setUsersError] = useState("");
  const [openUserMenu, setOpenUserMenu] = useState<number | null>(null);

  const getInitials = (name: string) =>
    name
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("") || "U";

  useEffect(() => {
    if (user) {
      setProfileData({
        full_name: user.full_name || "",
        phone: user.phone || "",
        address: user.address || "",
        company: user.company || "",
        bio: user.bio || ""
      });
    }
  }, [user]);

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  useEffect(() => {
    if (user?.is_admin) {
      fetchAdminUsers();
    }
  }, [user?.is_admin]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/auth/profile`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(profileData),
      });

      if (response.ok) {
        const data = await response.json();
        if (data?.user) {
          setProfileData({
            full_name: data.user.full_name || "",
            phone: data.user.phone || "",
            address: data.user.address || "",
            company: data.user.company || "",
            bio: data.user.bio || "",
          });
        }
        await refreshUser();
        pushToast("success", "Profile updated successfully");
        setMessage("Profile updated successfully");
        setIsEditing(false);
      } else {
        const error = await response.json();
        const msg = error.detail || "Failed to update profile";
        setMessage(msg);
        pushToast("error", msg);
      }
    } catch (error) {
      setMessage("Error updating profile");
      pushToast("error", "Error updating profile");
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setProfileData({
      ...profileData,
      [e.target.name]: e.target.value
    });
  };

  const handleAdminCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdminLoading(true);
    setAdminMessage("");
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/auth/admin/create-user`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          email: adminForm.email,
          full_name: adminForm.full_name || null,
          phone: adminForm.phone || null,
          role: adminForm.role,
          temp_password: adminForm.temp_password || null,
          send_link: adminForm.send_link,
        }),
      });
      if (!response.ok) throw new Error("Failed to create user");
      pushToast("success", "User created or updated successfully");
      setAdminMessage("User created or updated successfully.");
      setAdminForm({
        email: "",
        full_name: "",
        phone: "",
        role: "user",
        temp_password: "",
        send_link: true,
      });
      fetchAdminUsers();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to create user";
      pushToast("error", msg);
      setAdminMessage(msg);
    } finally {
      setAdminLoading(false);
    }
  };

  const fetchAdminUsers = async () => {
    setUsersLoading(true);
    setUsersError("");
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/auth/users`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "Failed to load users");
      }
      const data = await res.json();
      setAdminUsers(Array.isArray(data) ? data : []);
    } catch (err) {
      setUsersError(err instanceof Error ? err.message : "Failed to load users");
    } finally {
      setUsersLoading(false);
    }
  };

  const handleDeleteUser = async (userId: number) => {
    if (!confirm("Delete this user and all related data? This cannot be undone.")) return;
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/auth/admin/users/${userId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to delete user");
      pushToast("success", "User deleted");
      fetchAdminUsers();
    } catch (err) {
      pushToast("error", err instanceof Error ? err.message : "Failed to delete user");
    }
  };

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-slate-900">Please login to view your profile</h2>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-3 sm:p-4">
      <div className="max-w-4xl mx-auto space-y-4">
        <div className="bg-white rounded-2xl shadow-lg p-3 sm:p-4">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
            <h1 className="text-xl font-bold text-slate-900">Profile</h1>
            <div className="flex gap-4">
              {isEditing ? (
                <>
                  <button
                    onClick={() => setIsEditing(false)}
                    className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSubmit}
                    disabled={loading}
                    className="px-3 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 text-sm"
                  >
                    {loading ? "Saving..." : "Save"}
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => setIsEditing(true)}
                    className="px-3 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 text-sm"
                  >
                    Edit Profile
                  </button>
                  {user.is_admin && (
                    <button
                      onClick={() => setShowAdminModal(true)}
                      className="px-3 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 text-sm"
                    >
                      Create User
                    </button>
                  )}
                  {/* <button
                    onClick={logout}
                    className="px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm"
                  >
                    Logout
                  </button> */}
                </>
              )}
            </div>
          </div>
          
          {message && (
            <div className={`mb-6 p-4 rounded-lg ${
              message.includes("successfully") ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
            }`}>
              {message}
            </div>
          )}

          <div className="space-y-6">
            <div className="flex items-center gap-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
              <div className="relative h-14 w-14 overflow-hidden rounded-full bg-gradient-to-br from-slate-900 to-slate-600 text-white flex items-center justify-center text-lg font-semibold">
                {getInitials(user.full_name || user.email)}
                <div className="absolute bottom-0 right-0 rounded-full bg-white p-1 shadow">
                  <svg
                    className="h-3.5 w-3.5 text-slate-700"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M16 14a4 4 0 10-8 0m8 0a4 4 0 01-8 0m8 0v1a2 2 0 01-2 2H10a2 2 0 01-2-2v-1"
                    />
                  </svg>
                </div>
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-900">{user.full_name || "User"}</p>
                <p className="text-xs text-slate-500">{user.email}</p>
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Email</label>
              <p className="text-base text-slate-900">{user.email}</p>
            </div>
            
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Role</label>
              <p className="text-base">
                <span className={`inline-flex px-3 py-1 rounded-full text-sm font-medium ${
                  user.is_admin 
                    ? "bg-purple-100 text-purple-800" 
                    : "bg-blue-100 text-blue-800"
                }`}>
                  {user.is_admin ? "Administrator" : "User"}
                </span>
              </p>
            </div>

            {isEditing ? (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Full Name</label>
                  <input
                    type="text"
                    name="full_name"
                    value={profileData.full_name}
                    onChange={handleChange}
                    className="w-full max-w-sm rounded-lg border border-slate-300 px-2 py-1.5 text-xs"
                  />
                </div>
                
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Phone</label>
                  <input
                    type="tel"
                    name="phone"
                    value={profileData.phone}
                    onChange={handleChange}
                    className="w-full max-w-sm rounded-lg border border-slate-300 px-2 py-1.5 text-xs"
                  />
                </div>
                
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Address</label>
                  <textarea
                    name="address"
                    value={profileData.address}
                    onChange={handleChange}
                    rows={3}
                    className="w-full max-w-sm rounded-lg border border-slate-300 px-2 py-1.5 text-xs"
                  />
                </div>
                
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Company</label>
                  <input
                    type="text"
                    name="company"
                    value={profileData.company}
                    onChange={handleChange}
                    className="w-full max-w-sm rounded-lg border border-slate-300 px-2 py-1.5 text-xs"
                  />
                </div>
                
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Bio</label>
                  <textarea
                    name="bio"
                    value={profileData.bio}
                    onChange={handleChange}
                    rows={4}
                    className="w-full max-w-sm rounded-lg border border-slate-300 px-2 py-1.5 text-xs"
                  />
                </div>
              </form>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Full Name</label>
                  <p className="text-base text-slate-900">{profileData.full_name || "Not provided"}</p>
                </div>
                
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Phone</label>
                  <p className="text-base text-slate-900">{profileData.phone || "Not provided"}</p>
                </div>
                
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Address</label>
                  <p className="text-base text-slate-900">{profileData.address || "Not provided"}</p>
                </div>
                
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Company</label>
                  <p className="text-base text-slate-900">{profileData.company || "Not provided"}</p>
                </div>
                
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Bio</label>
                  <p className="text-base text-slate-900">{profileData.bio || "Not provided"}</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {user.is_admin && showAdminModal && (
          <div className="fixed inset-0 z-50 bg-black/40">
            <div className="flex min-h-full items-start justify-center px-4 pt-16 pb-10">
              <div className="w-full max-w-lg rounded-2xl bg-white p-5 shadow-xl border border-slate-200 max-h-[90vh] overflow-hidden">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-lg font-bold text-slate-900">Create User</h2>
                    <p className="text-xs text-slate-500">Admin only</p>
                  </div>
                  <button
                    onClick={() => setShowAdminModal(false)}
                    className="text-xs text-slate-500 hover:text-slate-700"
                  >
                    Close
                  </button>
                </div>
                <div className="space-y-4 overflow-y-auto pr-1 max-h-[78vh]">
                  {adminMessage && (
                    <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700">
                      {adminMessage}
                    </div>
                  )}
                  <form onSubmit={handleAdminCreate} className="space-y-4">
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">Email</label>
                      <input
                        type="email"
                        value={adminForm.email}
                        onChange={(e) => setAdminForm({ ...adminForm, email: e.target.value })}
                        className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-xs"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">Full Name</label>
                      <input
                        type="text"
                        value={adminForm.full_name}
                        onChange={(e) => setAdminForm({ ...adminForm, full_name: e.target.value })}
                        className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-xs"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">Phone (SMS)</label>
                      <input
                        type="tel"
                        value={adminForm.phone}
                        onChange={(e) => setAdminForm({ ...adminForm, phone: e.target.value })}
                        className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-xs"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">Role</label>
                      <select
                        value={adminForm.role}
                        onChange={(e) => setAdminForm({ ...adminForm, role: e.target.value })}
                        className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-xs"
                      >
                        <option value="user">User</option>
                        <option value="admin">Administrator</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">
                        Temporary Password (optional)
                      </label>
                      <input
                        type="text"
                        value={adminForm.temp_password}
                        onChange={(e) => setAdminForm({ ...adminForm, temp_password: e.target.value })}
                        className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-xs"
                      />
                    </div>

                    <label className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-2 py-1.5 text-xs text-slate-600">
                      <input
                        type="checkbox"
                        checked={adminForm.send_link}
                        onChange={(e) => setAdminForm({ ...adminForm, send_link: e.target.checked })}
                      />
                      Send password setup link via email
                    </label>
                    <p className="text-[11px] text-slate-500">
                      If you set a temporary password, the user can still reset via the email link.
                    </p>

                    <button
                      type="submit"
                      disabled={adminLoading}
                      className="w-full rounded-lg bg-gradient-to-r from-orange-500 to-orange-600 py-2.5 px-3 text-white font-semibold shadow hover:opacity-90 disabled:opacity-70 flex items-center justify-center gap-2 text-sm cursor-pointer"
                    >
                      {adminLoading && <LoadingSpinner size={16} variant="light" />}
                      Create User
                    </button>
                  </form>

                  <div className="text-[11px] text-slate-500">
                    Use the Manage Users section below to delete or review user status.
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      {user?.is_admin && (
        <div className="max-w-4xl mx-auto mt-4 rounded-2xl bg-white p-4 shadow-lg">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold text-slate-900">Manage Users</h2>
            <button
              onClick={fetchAdminUsers}
              className="text-xs text-slate-500 hover:text-slate-700"
            >
              Refresh
            </button>
          </div>
          {usersLoading && <p className="text-xs text-slate-500">Loading users...</p>}
          {usersError && <p className="text-xs text-red-600">{usersError}</p>}
          <div className="mt-2 max-h-72 space-y-2 overflow-auto">
            {adminUsers
              .filter((u) => u.email !== user?.email)
              .map((u) => (
              <div
                key={u.id}
                className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs"
              >
                <div>
                  <p className="font-semibold text-slate-800">{u.full_name || "User"}</p>
                  <p className="text-slate-500">{u.email}</p>
                </div>
                <div className="relative">
                  <button
                    onClick={() => setOpenUserMenu(openUserMenu === u.id ? null : u.id)}
                    className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs text-slate-600 hover:text-slate-800"
                  >
                    ...
                  </button>
                  {openUserMenu === u.id && (
                    <div className="absolute right-0 mt-2 w-44 rounded-lg border border-slate-200 bg-white p-2 shadow-lg z-10">
                      <div className="px-2 py-1 text-[11px] text-slate-500">
                        Status: {u.last_seen && new Date(u.last_seen).getTime() > Date.now() - 5 * 60 * 1000 ? "Online" : "Offline"}
                      </div>
                      {u.last_seen && (
                        <div className="px-2 py-1 text-[10px] text-slate-400">
                          Last seen: {new Date(u.last_seen).toLocaleString()}
                        </div>
                      )}
                      <button
                        onClick={() => handleDeleteUser(u.id)}
                        className="flex w-full items-center gap-2 rounded-md px-2 py-1 text-xs text-red-600 hover:bg-red-50"
                      >
                        <span>Delete</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
            {adminUsers.filter((u) => u.email !== user?.email).length === 0 && !usersLoading && (
              <p className="text-xs text-slate-500">No users found.</p>
            )}
          </div>
        </div>
      )}

      </div>
    </div>
  );
}
