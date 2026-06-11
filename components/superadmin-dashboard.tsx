"use client";

import { useState } from "react";
import { packageStatusLabels, type PackageStatus } from "@/lib/types";

type UserItem = {
  user_id: string;
  full_name: string;
  email: string;
  role: "admin_gudang" | "kurir" | string;
  created_at: string;
  updated_at: string;
};

type PackageItem = {
  id: string;
  resi: string;
  package_name?: string | null;
  receiver_name: string;
  receiver_address: string;
  destination_city?: string | null;
  weight_kg: number | string;
  status: PackageStatus;
  created_at: string;
};

type BagItemPackage = {
  id: string;
  resi: string;
  package_name?: string | null;
  receiver_name: string;
  receiver_address: string;
  destination_city?: string | null;
  status: PackageStatus;
};

type BaggingItem = {
  id: string;
  bag_code: string;
  destination_city?: string | null;
  status: string;
  created_at: string;
  bag_items?: Array<{
    packages?: BagItemPackage | BagItemPackage[] | null;
  }>;
};

type AnalyticsResponse = {
  metrics: {
    totalPackages: number;
    deliveredPackages: number;
    successRate: number;
  };
  users: UserItem[];
  packages: PackageItem[];
  baggings: BaggingItem[];
  recentActivities: Array<{
    id: number;
    action: string;
    entity: string;
    entity_id: string | null;
    metadata: Record<string, unknown>;
    created_at: string;
  }>;
};

type Props = {
  initialData: AnalyticsResponse;
};

export function SuperadminDashboard({ initialData }: Props) {
  const [data, setData] = useState<AnalyticsResponse>(initialData);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [userForm, setUserForm] = useState({
    email: "",
    password: "",
    fullName: "",
    role: "admin_gudang",
  });
  const [createStatus, setCreateStatus] = useState<string | null>(null);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editUserForm, setEditUserForm] = useState({
    fullName: "",
    role: "admin_gudang",
  });

  function roleLabel(role: string) {
    return role === "admin_gudang" ? "Warehouse Admin" : role === "kurir" ? "Courier" : role;
  }

  function packageName(pkg: PackageItem | BagItemPackage) {
    return (pkg.package_name ?? "").trim() || `Package ${pkg.resi}`;
  }

  function packageCity(pkg: PackageItem | BagItemPackage) {
    const city = (pkg.destination_city ?? "").trim();

    if (city) {
      return city;
    }

    const parts = pkg.receiver_address.split(",").map((part) => part.trim()).filter(Boolean);
    return parts.at(-1) ?? "-";
  }

  function describeLog(log: AnalyticsResponse["recentActivities"][number]) {
    const metadata = log.metadata ?? {};
    const resi = typeof metadata.resi === "string" ? metadata.resi : null;
    const role = typeof metadata.role === "string" ? roleLabel(metadata.role) : null;
    const fullName = typeof metadata.full_name === "string" ? metadata.full_name : null;
    const city = typeof metadata.destination_city === "string" ? metadata.destination_city : null;

    const rolePart     = role     ? " as " + role           : "";
    const namePart     = fullName ? " " + fullName           : "";
    const toRolePart   = role     ? " to role " + role       : "";
    const deleteRole   = role     ? " (" + role + ")"        : "";
    const resiPart     = resi     ? " with tracking no. " + resi : "";
    const resiRef      = resi     ? " " + resi               : "";
    const cityPart     = city     ? " for " + city           : "";

    switch (log.action) {
      case "REGISTER_USER":   return "Registered new user" + rolePart + ".";
      case "UPDATE_USER":     return "Updated user" + namePart + toRolePart + ".";
      case "DELETE_USER":     return "Deleted user" + namePart + deleteRole + ".";
      case "CREATE_PACKAGE":  return "Created new package" + resiPart + ".";
      case "UPDATE_PACKAGE":  return "Edited package info" + resiRef + ".";
      case "UPDATE_PACKAGE_STATUS": return "Updated package status" + resiRef + ".";
      case "DELETE_PACKAGE":  return "Deleted package" + resiRef + " from database.";
      case "CREATE_BAGGING":  return "Created or filled bag" + cityPart + ".";
      case "REMOVE_PACKAGE_FROM_BAGGING": return "Removed package from bag without deleting it.";
      default: return log.action.replaceAll("_", " ").toLowerCase() + " on " + log.entity + ".";
    }
  }

  async function loadAnalytics() {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/superadmin/analytics", { cache: "no-store" });
      const json = await response.json();

      if (!response.ok || !json.ok) {
        setError(json?.error?.message ?? "Failed to load analytics");
        return;
      }

      setData(json.data as AnalyticsResponse);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateUser(event: React.SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    setCreateStatus(null);

    const response = await fetch("/api/superadmin/users", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(userForm),
    });

    const json = await response.json();

    if (!response.ok || !json.ok) {
      setCreateStatus(json?.error?.message ?? "Failed to create account");
      return;
    }

    setCreateStatus("Account " + json.data.email + " created successfully.");
    setUserForm({ email: "", password: "", fullName: "", role: "admin_gudang" });
    void loadAnalytics();
  }

  function startEditUser(user: UserItem) {
    setEditingUserId(user.user_id);
    setEditUserForm({
      fullName: user.full_name,
      role: user.role,
    });
  }

  function cancelEditUser() {
    setEditingUserId(null);
    setEditUserForm({ fullName: "", role: "admin_gudang" });
  }

  async function handleUpdateUser(userId: string) {
    setError(null);

    const response = await fetch("/api/superadmin/users", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId,
        fullName: editUserForm.fullName,
        role: editUserForm.role,
      }),
    });
    const json = await response.json();

    if (!response.ok || !json.ok) {
      setError(json?.error?.message ?? "Failed to update user");
      return;
    }

    cancelEditUser();
    await loadAnalytics();
  }

  async function handleDeleteUser(user: UserItem) {
    const confirmed = window.confirm("Delete user " + user.full_name + "?");

    if (!confirmed) {
      return;
    }

    setError(null);

    const response = await fetch(`/api/superadmin/users?userId=${encodeURIComponent(user.user_id)}`, {
      method: "DELETE",
    });
    const json = await response.json();

    if (!response.ok || !json.ok) {
      setError(json?.error?.message ?? "Failed to delete user");
      return;
    }

    await loadAnalytics();
  }

  return (
    <section className="space-y-8">
      <div className="grid gap-4 md:grid-cols-3">
        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs uppercase tracking-[0.15em] text-slate-500">Total Packages</p>
          <p className="mt-2 text-3xl font-bold text-slate-900">{loading ? "..." : data.metrics.totalPackages}</p>
        </article>
        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs uppercase tracking-[0.15em] text-slate-500">Delivered</p>
          <p className="mt-2 text-3xl font-bold text-slate-900">{loading ? "..." : data.metrics.deliveredPackages}</p>
        </article>
        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs uppercase tracking-[0.15em] text-slate-500">Success Rate</p>
          <p className="mt-2 text-3xl font-bold text-slate-900">{loading ? "..." : data.metrics.successRate}%</p>
        </article>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="font-mono text-xl font-semibold text-slate-900">Register New User</h2>
          <form onSubmit={handleCreateUser} className="mt-4 space-y-3">
            <input
              value={userForm.fullName}
              onChange={(event) => setUserForm((prev) => ({ ...prev, fullName: event.target.value }))}
              placeholder="Full Name"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              required
            />
            <input
              value={userForm.email}
              onChange={(event) => setUserForm((prev) => ({ ...prev, email: event.target.value }))}
              type="email"
              placeholder="Email"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              required
            />
            <input
              value={userForm.password}
              onChange={(event) => setUserForm((prev) => ({ ...prev, password: event.target.value }))}
              type="password"
              placeholder="Password (min. 10 characters)"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              minLength={10}
              required
            />
            <select
              value={userForm.role}
              onChange={(event) => setUserForm((prev) => ({ ...prev, role: event.target.value }))}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            >
              <option value="admin_gudang">Warehouse Admin</option>
              <option value="kurir">Courier</option>
            </select>
            <button className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white" type="submit">
              Save User
            </button>
            {createStatus ? <p className="text-sm text-slate-600">{createStatus}</p> : null}
          </form>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="font-mono text-xl font-semibold text-slate-900">Activity Logs</h2>
          {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}
          <button
            type="button"
            onClick={() => {
              void loadAnalytics();
            }}
            className="mt-2 rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700"
          >
            Refresh Data
          </button>
          <div className="mt-3 max-h-80 space-y-3 overflow-auto pr-2">
            {data.recentActivities.map((log) => (
              <article key={log.id} className="rounded-lg border border-slate-100 bg-slate-50 p-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-700">{log.action}</p>
                <p className="text-sm font-medium text-slate-800">{describeLog(log)}</p>
                <p className="text-xs text-slate-500">
                  Target: {log.entity} {log.entity_id ?? "-"}
                </p>
                <p className="text-xs text-slate-500">{new Date(log.created_at).toLocaleString("en-US")}</p>
              </article>
            ))}
            {!loading && data.recentActivities.length === 0 ? (
              <p className="text-sm text-slate-500">No activity logs yet.</p>
            ) : null}
          </div>
        </section>
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="font-mono text-xl font-semibold text-slate-900">User List</h2>
          <button
            type="button"
            onClick={() => void loadAnalytics()}
            className="w-fit rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700"
          >
            Refresh
          </button>
        </div>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-190 text-left text-sm">
            <thead className="border-b border-slate-200 text-xs uppercase text-slate-500">
              <tr>
                <th className="py-3 pe-3">Name</th>
                <th className="px-3 py-3">Email</th>
                <th className="px-3 py-3">Role</th>
                <th className="px-3 py-3">Created</th>
                <th className="py-3 ps-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.users.map((user) => {
                const isEditing = editingUserId === user.user_id;

                return (
                  <tr key={user.user_id} className="align-top">
                    <td className="py-3 pe-3">
                      {isEditing ? (
                        <input
                          value={editUserForm.fullName}
                          onChange={(event) =>
                            setEditUserForm((prev) => ({ ...prev, fullName: event.target.value }))
                          }
                          className="w-full rounded-lg border border-slate-300 px-2 py-1 text-sm"
                        />
                      ) : (
                        <p className="font-semibold text-slate-900">{user.full_name}</p>
                      )}
                    </td>
                    <td className="px-3 py-3 text-slate-600">{user.email || "-"}</td>
                    <td className="px-3 py-3">
                      {isEditing ? (
                        <select
                          value={editUserForm.role}
                          onChange={(event) =>
                            setEditUserForm((prev) => ({ ...prev, role: event.target.value }))
                          }
                          className="rounded-lg border border-slate-300 bg-white px-2 py-1 text-sm"
                        >
                          <option value="admin_gudang">Warehouse Admin</option>
                          <option value="kurir">Courier</option>
                        </select>
                      ) : (
                        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                          {roleLabel(user.role)}
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-3 text-slate-600">
                      {new Date(user.created_at).toLocaleString("en-US")}
                    </td>
                    <td className="py-3 ps-3">
                      {isEditing ? (
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => void handleUpdateUser(user.user_id)}
                            className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white"
                          >
                            Save
                          </button>
                          <button
                            type="button"
                            onClick={cancelEditUser}
                            className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => startEditUser(user)}
                            className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => void handleDeleteUser(user)}
                            className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-600"
                          >
                            Delete
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {!data.users.length ? <p className="py-6 text-sm text-slate-500">No users yet.</p> : null}
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="font-mono text-xl font-semibold text-slate-900">Package List</h2>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-215 text-left text-sm">
            <thead className="border-b border-slate-200 text-xs uppercase text-slate-500">
              <tr>
                <th className="py-3 pe-3">Tracking No.</th>
                <th className="px-3 py-3">Package</th>
                <th className="px-3 py-3">Address</th>
                <th className="px-3 py-3">City</th>
                <th className="px-3 py-3">Weight</th>
                <th className="py-3 ps-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.packages.map((pkg) => (
                <tr key={pkg.id} className="align-top">
                  <td className="py-3 pe-3 font-mono text-xs font-semibold text-slate-900">{pkg.resi}</td>
                  <td className="px-3 py-3">
                    <p className="font-semibold text-slate-900">{packageName(pkg)}</p>
                    <p className="text-slate-500">{pkg.receiver_name}</p>
                  </td>
                  <td className="max-w-xs px-3 py-3 text-slate-600">{pkg.receiver_address}</td>
                  <td className="px-3 py-3 text-slate-700">{packageCity(pkg)}</td>
                  <td className="px-3 py-3 text-slate-700">{pkg.weight_kg} kg</td>
                  <td className="py-3 ps-3">
                    <span className="rounded-full bg-orange-100 px-3 py-1 text-xs font-semibold text-orange-700">
                      {packageStatusLabels[pkg.status] ?? pkg.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!data.packages.length ? <p className="py-6 text-sm text-slate-500">No packages yet.</p> : null}
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="font-mono text-xl font-semibold text-slate-900">Bag List</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {data.baggings.map((bag) => {
            const items = bag.bag_items ?? [];

            return (
              <article key={bag.id} className="rounded-lg border border-slate-200 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-mono text-sm font-semibold text-slate-900">{bag.bag_code}</p>
                    <p className="text-sm text-slate-600">Destination: {bag.destination_city ?? "-"}</p>
                  </div>
                  <span className="rounded-full bg-orange-100 px-3 py-1 text-xs font-semibold text-orange-700">
                    {items.length} {items.length === 1 ? "package" : "packages"}
                  </span>
                </div>
                <div className="mt-3 space-y-2">
                  {items.map((item, index) => {
                    const pkg = Array.isArray(item.packages) ? item.packages[0] : item.packages;

                    return pkg ? (
                      <div key={`${bag.id}-${pkg.id}`} className="rounded-lg bg-slate-50 px-3 py-2 text-sm">
                        <p className="font-semibold text-slate-900">
                          {packageName(pkg)} - {pkg.resi}
                        </p>
                        <p className="text-slate-600">{pkg.receiver_name}</p>
                        <p className="text-xs font-semibold text-slate-500">
                          {packageStatusLabels[pkg.status] ?? pkg.status}
                        </p>
                      </div>
                    ) : (
                      <p key={`${bag.id}-${index}`} className="text-sm text-slate-500">
                        Package details not available.
                      </p>
                    );
                  })}
                </div>
              </article>
            );
          })}
        </div>
        {!data.baggings.length ? <p className="mt-4 text-sm text-slate-500">No bags yet.</p> : null}
      </section>
    </section>
  );
}
