import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { API_BASE_URL, apiFetch } from "../../util/auth";
import CloudinaryImg from "../../../lib/CloudinaryImg";

const CLOUDINARY_CLOUD_NAME = "dq9gemegi";
const CLOUDINARY_UPLOAD_PRESET = "Sponsors";
const CLOUDINARY_FOLDER = "SponsorsLogos";

type Sponsor = {
  id: number;
  name: string;
  url: string | null;
  logo: string | null;
  tier: string | null;
};

type Tier = {
  id: number;
  key: string;
  label: string;
  blurb?: string | null;
  columns?: number | null;
  logo_max_width?: number | null;
  sort_order?: number | null;
};

const SponsorsAdmin: React.FC = () => {
  const navigate = useNavigate();
  const [tiers, setTiers] = useState<Tier[]>([]);
  const [sponsorsByTier, setSponsorsByTier] = useState<Record<string, Sponsor[]>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [showDrawer, setShowDrawer] = useState(false);
  const [editingSponsor, setEditingSponsor] = useState<Sponsor | null>(null);

  const [tierDraft, setTierDraft] = useState({ key: "", label: "", columns: 4, logo_max_width: 220 });
  const [showAddTier, setShowAddTier] = useState(false);

  const [sponsorDraft, setSponsorDraft] = useState({
    name: "",
    tier: "",
    url: "",
    logo: "" as string | null,
  });

  const [logoUploading, setLogoUploading] = useState(false);
  const [logoUploadError, setLogoUploadError] = useState<string | null>(null);
  const [logoPreviewUrl, setLogoPreviewUrl] = useState<string | null>(null);

  const resetSponsorDraft = (tierKey: string) => {
    setSponsorDraft({ name: "", tier: tierKey, url: "", logo: null });
    setLogoPreviewUrl(null);
    setLogoUploadError(null);
    setEditingSponsor(null);
  };

  const load = async () => {
    try {
      setLoading(true);
      setError(null);

      const [tiersRes, sponsorsRes] = await Promise.all([
        apiFetch(`${API_BASE_URL}/api/sponsor-tiers/`),
        apiFetch(`${API_BASE_URL}/api/sponsors/`),
      ]);

      if (!tiersRes.ok) throw new Error("Failed to load tiers");
      if (!sponsorsRes.ok) throw new Error("Failed to load sponsors");

      const tiersData: Tier[] = await tiersRes.json();
      const sponsorsData: Sponsor[] = await sponsorsRes.json();

      const grouped: Record<string, Sponsor[]> = {};
      for (const s of sponsorsData) {
        const k = (s.tier || "").trim();
        if (!k) continue;
        grouped[k] = grouped[k] || [];
        grouped[k].push(s);
      }

      setTiers(tiersData);
      setSponsorsByTier(grouped);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const openAddSponsor = (tierKey: string) => {
    resetSponsorDraft(tierKey);
    setShowDrawer(true);
  };

  const openEditSponsor = (tierKey: string, sponsor: Sponsor) => {
    setEditingSponsor(sponsor);
    setSponsorDraft({
      name: sponsor.name,
      tier: sponsor.tier || tierKey,
      url: sponsor.url || "",
      logo: sponsor.logo || null,
    });
    setLogoPreviewUrl(null);
    setLogoUploadError(null);
    setShowDrawer(true);
  };

  const closeDrawer = () => {
    setShowDrawer(false);
    setEditingSponsor(null);
    setLogoUploading(false);
    setLogoUploadError(null);
  };

  const uploadLogoToCloudinary = async (file: File) => {
    setLogoUploading(true);
    setLogoUploadError(null);
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);
      form.append("folder", CLOUDINARY_FOLDER);

      const res = await fetch(
        `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
        {
          method: "POST",
          body: form,
        },
      );
      if (!res.ok) throw new Error("Cloudinary upload failed");
      const data = await res.json();

      const publicId = typeof data.public_id === "string" ? data.public_id : null;
      const secureUrl =
        typeof data.secure_url === "string" ? (data.secure_url as string) : null;
      if (!publicId) throw new Error("Cloudinary did not return public_id");

      setSponsorDraft((p) => ({ ...p, logo: publicId }));
      setLogoPreviewUrl(secureUrl);
    } catch (e) {
      setLogoUploadError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setLogoUploading(false);
    }
  };

  const createTier = async () => {
    const payload = {
      key: tierDraft.key.trim(),
      label: tierDraft.label.trim(),
      columns: Number(tierDraft.columns) || 4,
      logo_max_width: Number(tierDraft.logo_max_width) || 220,
    };
    const res = await apiFetch(`${API_BASE_URL}/api/sponsor-tiers/`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error("Failed to create tier");
    setShowAddTier(false);
    setTierDraft({ key: "", label: "", columns: 4, logo_max_width: 220 });
    await load();
  };

  const deleteTier = async (tier: Tier) => {
    if (!confirm(`Delete tier "${tier.label}"? This will delete sponsors in it.`)) return;
    const res = await apiFetch(`${API_BASE_URL}/api/sponsor-tiers/${tier.id}?delete_sponsors=true`, {
      method: "DELETE",
    });
    if (!res.ok) throw new Error("Failed to delete tier");
    await load();
  };

  const saveSponsor = async () => {
    const payload = {
      name: sponsorDraft.name.trim(),
      tier: sponsorDraft.tier.trim(),
      website: sponsorDraft.url.trim() || null,
      logo: sponsorDraft.logo || null,
    };

    const url = editingSponsor
      ? `${API_BASE_URL}/api/sponsors/${editingSponsor.id}`
      : `${API_BASE_URL}/api/sponsors/`;
    const method = editingSponsor ? "PUT" : "POST";

    const res = await apiFetch(url, {
      method,
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error("Failed to save sponsor");

    closeDrawer();
    await load();
  };

  const deleteSponsor = async (s: Sponsor) => {
    if (!confirm(`Delete sponsor "${s.name}"?`)) return;
    const res = await apiFetch(`${API_BASE_URL}/api/sponsors/${s.id}`, {
      method: "DELETE",
    });
    if (!res.ok) throw new Error("Failed to delete sponsor");
    await load();
  };

  const uiTiers = useMemo(() => tiers, [tiers]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-orange-100 to-orange-200 py-16 px-4">
      <div className="max-w-6xl mx-auto">
        <button
          onClick={() => navigate("/admin")}
          className="mb-6 px-4 py-2 bg-white text-blue-900 rounded-lg hover:bg-blue-50 hover:text-blue-700 font-semibold flex items-center gap-2 transition-colors"
          style={{ fontFamily: "'Lato', sans-serif" }}
        >
          ← Back to Admin Panel
        </button>

        <div className="bg-white/90 border-4 border-black rounded-3xl shadow-[12px_12px_0px_0px_rgba(0,0,0,0.2)] p-6 md:p-12">
          <div className="flex flex-col gap-4 md:flex-row md:justify-between md:items-center mb-8">
            <h1 className="text-4xl md:text-5xl text-blue-900" style={{ fontFamily: "'Permanent Marker', cursive" }}>
              Sponsors
            </h1>
            <button
              onClick={() => setShowAddTier(true)}
              className="px-6 py-3 bg-yellow-400 text-blue-900 font-bold uppercase tracking-wide rounded-xl border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,0.2)] hover:bg-yellow-300 transition"
              style={{ fontFamily: "'Lato', sans-serif" }}
            >
              + Add Tier
            </button>
          </div>

          {loading ? (
            <p className="text-blue-900">Loading…</p>
          ) : error ? (
            <p className="text-red-700">{error}</p>
          ) : null}

          {showAddTier && (
            <div className="mb-8 p-6 bg-blue-50 rounded-xl border-2 border-blue-200">
              <h2 className="text-2xl font-bold text-blue-900 mb-4">Add Tier</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <label className="text-sm font-semibold text-blue-900">
                  Key
                  <input
                    className="mt-2 w-full rounded-xl border-2 border-black px-4 py-3 bg-white text-blue-900"
                    value={tierDraft.key}
                    onChange={(e) => setTierDraft((p) => ({ ...p, key: e.target.value }))}
                    placeholder="e.g. financial"
                  />
                </label>
                <label className="text-sm font-semibold text-blue-900">
                  Label
                  <input
                    className="mt-2 w-full rounded-xl border-2 border-black px-4 py-3 bg-white text-blue-900"
                    value={tierDraft.label}
                    onChange={(e) => setTierDraft((p) => ({ ...p, label: e.target.value }))}
                    placeholder="e.g. Financial Sponsors"
                  />
                </label>
                <label className="text-sm font-semibold text-blue-900">
                  Columns
                  <input
                    type="number"
                    min={1}
                    className="mt-2 w-full rounded-xl border-2 border-black px-4 py-3 bg-white text-blue-900"
                    value={tierDraft.columns}
                    onChange={(e) => setTierDraft((p) => ({ ...p, columns: Number(e.target.value) }))}
                  />
                </label>
                <label className="text-sm font-semibold text-blue-900">
                  Logo max width
                  <input
                    type="number"
                    min={1}
                    className="mt-2 w-full rounded-xl border-2 border-black px-4 py-3 bg-white text-blue-900"
                    value={tierDraft.logo_max_width}
                    onChange={(e) => setTierDraft((p) => ({ ...p, logo_max_width: Number(e.target.value) }))}
                  />
                </label>
              </div>
              <div className="mt-4 flex gap-3">
                <button
                  onClick={() => createTier().catch((e) => alert(e instanceof Error ? e.message : "Failed"))}
                  className="px-6 py-3 bg-yellow-400 text-blue-900 font-bold uppercase tracking-wide rounded-xl border-2 border-black"
                >
                  Save Tier
                </button>
                <button
                  onClick={() => setShowAddTier(false)}
                  className="px-6 py-3 bg-gray-200 text-blue-900 font-bold uppercase tracking-wide rounded-xl border-2 border-black"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          <div className="space-y-6">
            {uiTiers.map((t) => (
              <section key={t.id} className="p-5 bg-white border-2 border-black rounded-xl shadow-[4px_4px_0px_0px_rgba(0,0,0,0.2)]">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <h3 className="text-2xl font-bold text-blue-900">{t.label}</h3>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => openAddSponsor(t.key)}
                      className="px-4 py-2 bg-blue-400 text-white font-semibold rounded-lg border-2 border-black hover:bg-blue-500 transition"
                      title="Add sponsor"
                    >
                      +
                    </button>
                    <button
                      onClick={() => deleteTier(t).catch((e) => alert(e instanceof Error ? e.message : "Failed"))}
                      className="px-4 py-2 bg-red-400 text-white font-semibold rounded-lg border-2 border-black hover:bg-red-500 transition"
                      title="Delete tier"
                    >
                      Delete
                    </button>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  {(sponsorsByTier[t.key] || []).length === 0 ? (
                    <span className="text-sm text-blue-700/80">No sponsors yet</span>
                  ) : (
                    (sponsorsByTier[t.key] || []).map((s) => (
                      <div
                        key={s.id}
                        className="group inline-flex h-10 items-center gap-2 overflow-hidden rounded-full border border-black/20 bg-blue-50 px-3 text-sm leading-none text-blue-900 whitespace-nowrap"
                      >
                        <span className="font-semibold min-w-0 truncate max-w-[14rem]">{s.name}</span>
                        <button
                          className="hidden group-hover:inline-flex h-7 items-center rounded bg-white border border-black/20 px-2 text-xs leading-none"
                          onClick={() => openEditSponsor(t.key, s)}
                        >
                          Edit
                        </button>
                        <button
                          className="hidden group-hover:inline-flex h-7 items-center rounded bg-white border border-black/20 px-2 text-xs leading-none"
                          onClick={() => deleteSponsor(s).catch((e) => alert(e instanceof Error ? e.message : "Failed"))}
                        >
                          Remove
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </section>
            ))}
          </div>
        </div>
      </div>

      {/* Side drawer */}
      {showDrawer && (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/40" onClick={closeDrawer} />
          <aside className="absolute right-0 top-0 h-full w-full max-w-md bg-white border-l-4 border-black p-6 overflow-y-auto">
            <h2 className="text-2xl font-bold text-blue-900 mb-4">
              {editingSponsor ? "Edit Sponsor" : "Add Sponsor"}
            </h2>

            <div className="space-y-4">
              <label className="block text-sm font-semibold text-blue-900">
                Name
                <input
                  className="mt-2 w-full rounded-xl border-2 border-black px-4 py-3 bg-white text-blue-900"
                  value={sponsorDraft.name}
                  onChange={(e) => setSponsorDraft((p) => ({ ...p, name: e.target.value }))}
                />
              </label>

              <label className="block text-sm font-semibold text-blue-900">
                Tier
                <input
                  className="mt-2 w-full rounded-xl border-2 border-black px-4 py-3 bg-white text-blue-900"
                  value={sponsorDraft.tier}
                  onChange={(e) => setSponsorDraft((p) => ({ ...p, tier: e.target.value }))}
                />
                <p className="mt-1 text-xs text-blue-700/80">
                  Auto-filled from the tier you clicked (+), but you can edit it.
                </p>
              </label>

              <label className="block text-sm font-semibold text-blue-900">
                URL
                <input
                  className="mt-2 w-full rounded-xl border-2 border-black px-4 py-3 bg-white text-blue-900"
                  value={sponsorDraft.url}
                  onChange={(e) => setSponsorDraft((p) => ({ ...p, url: e.target.value }))}
                  placeholder="https://example.com"
                />
              </label>

              <label className="block text-sm font-semibold text-blue-900">
                Logo
                <div className="mt-2 space-y-3">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) uploadLogoToCloudinary(file);
                    }}
                    className="w-full rounded-xl border-2 border-black px-4 py-3 bg-white text-blue-900"
                    disabled={logoUploading}
                  />

                  {logoUploadError ? (
                    <p className="text-sm text-red-700">{logoUploadError}</p>
                  ) : null}

                  <div className="flex items-center gap-3">
                    {sponsorDraft.logo ? (
                      <span className="text-xs text-blue-700 break-all">
                        {sponsorDraft.logo}
                      </span>
                    ) : (
                      <span className="text-xs text-blue-700/80">
                        No logo uploaded yet
                      </span>
                    )}
                    {sponsorDraft.logo ? (
                      <button
                        type="button"
                        onClick={() => {
                          // Setting logo to null will trigger backend to delete old asset on save.
                          setSponsorDraft((p) => ({ ...p, logo: null }));
                          setLogoPreviewUrl(null);
                        }}
                        className="ml-auto px-3 py-2 bg-gray-200 text-blue-900 font-bold rounded-lg border-2 border-black"
                      >
                        Remove logo
                      </button>
                    ) : null}
                  </div>

                  <div className="rounded-xl border-2 border-black bg-white p-3">
                    {logoPreviewUrl ? (
                      <img
                        src={logoPreviewUrl}
                        alt="Logo preview"
                        className="h-16 w-full object-contain"
                      />
                    ) : sponsorDraft.logo ? (
                      <CloudinaryImg
                        src={sponsorDraft.logo}
                        alt="Logo preview"
                        width={300}
                        className="h-16 w-full object-contain"
                      />
                    ) : (
                      <div className="h-16 flex items-center justify-center text-blue-700/70 text-sm">
                        Preview will appear here
                      </div>
                    )}
                  </div>
                </div>
              </label>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => saveSponsor().catch((e) => alert(e instanceof Error ? e.message : "Failed"))}
                  className="flex-1 px-6 py-3 bg-yellow-400 text-blue-900 font-bold uppercase tracking-wide rounded-xl border-2 border-black"
                >
                  Save
                </button>
                <button
                  onClick={closeDrawer}
                  className="flex-1 px-6 py-3 bg-gray-200 text-blue-900 font-bold uppercase tracking-wide rounded-xl border-2 border-black"
                >
                  Cancel
                </button>
              </div>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
};

export default SponsorsAdmin;

