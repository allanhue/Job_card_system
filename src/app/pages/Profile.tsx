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
    role: "user",
    temp_password: "",
    send_link: true,
  });

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
        await response.json();
        await refreshUser();
        setMessage("Profile updated successfully!");
        setIsEditing(false);
      } else {
        const error = await response.json();
        setMessage(error.detail || "Failed to update profile");
      }
    } catch (error) {
      setMessage("Error updating profile");
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
          role: adminForm.role,
          temp_password: adminForm.temp_password || null,
          send_link: adminForm.send_link,
        }),
      });
      if (!response.ok) throw new Error("Failed to create user");
      pushToast("success", "User created or updated successfully");
      setAdminForm({
        email: "",
        full_name: "",
        role: "user",
        temp_password: "",
        send_link: true,
      });
    } catch (err) {
      pushToast("error", err instanceof Error ? err.message : "Failed to create user");
    } finally {
      setAdminLoading(false);
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
          <div className="flex justify-between items-center mb-4">
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
                    className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm"
                  >
                    {loading ? "Saving..." : "Save"}
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => setIsEditing(true)}
                    className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
                  >
                    Edit Profile
                  </button>
                  <button
                    onClick={logout}
                    className="px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm"
                  >
                    Logout
                  </button>
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

        {user.is_admin && (
          <div className="bg-white rounded-2xl shadow-lg p-3 sm:p-4">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-bold text-slate-900">Admin: Create User</h2>
              </div>
              <span className="inline-flex items-center rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-600">
                Admin Only
              </span>
            </div>
            <form onSubmit={handleAdminCreate} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Email</label>
                <input
                  type="email"
                  value={adminForm.email}
                  onChange={(e) => setAdminForm({ ...adminForm, email: e.target.value })}
                  className="w-full max-w-sm rounded-lg border border-slate-300 px-2 py-1.5 text-xs"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Full Name</label>
                <input
                  type="text"
                  value={adminForm.full_name}
                  onChange={(e) => setAdminForm({ ...adminForm, full_name: e.target.value })}
                  className="w-full max-w-sm rounded-lg border border-slate-300 px-2 py-1.5 text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Role</label>
                <select
                  value={adminForm.role}
                  onChange={(e) => setAdminForm({ ...adminForm, role: e.target.value })}
                  className="w-full max-w-sm rounded-lg border border-slate-300 px-2 py-1.5 text-xs"
                >
                  <option value="user">User</option>
                  <option value="admin">Administrator</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Temporary Password (optional)</label>
                <input
                  type="text"
                  value={adminForm.temp_password}
                  onChange={(e) => setAdminForm({ ...adminForm, temp_password: e.target.value })}
                  className="w-full max-w-sm rounded-lg border border-slate-300 px-2 py-1.5 text-xs"
                />
              </div>

              <label className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-2 py-1.5 text-xs text-slate-600 max-w-sm">
                <input
                  type="checkbox"
                  checked={adminForm.send_link}
                  onChange={(e) => setAdminForm({ ...adminForm, send_link: e.target.checked })}
                />
                Send password setup link via email
              </label>

              <button
                type="submit"
                disabled={adminLoading}
                className="max-w-sm rounded-lg bg-gradient-to-r from-indigo-600 to-blue-600 py-2.5 px-3 text-white font-semibold shadow hover:opacity-90 disabled:opacity-70 flex items-center justify-center gap-2 text-sm cursor-pointer"
              >
                {adminLoading && <LoadingSpinner size={16} variant="light" />}
                Create User
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
