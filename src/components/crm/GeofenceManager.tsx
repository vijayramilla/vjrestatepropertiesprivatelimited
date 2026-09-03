import { useEffect, useState, useCallback } from 'react';
import { leadSupabase } from '@/services/leadSupabase';
import {
  MapPin, Plus, Pencil, Trash2, Check, Loader2, Globe,
} from 'lucide-react';
import { CrmBtn, CrmCard, CRM_INPUT } from '@/components/crm/CrmUi';

type Geofence = {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  radius_meters: number;
  is_active: boolean;
};

type Props = {
  onClose?: () => void;
};

/**
 * Admin geofence management panel.
 * Create, edit, and delete geofences that restrict where employees can clock in.
 */
export default function GeofenceManager({ onClose }: Props) {
  const [fences, setFences] = useState<Geofence[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', latitude: '', longitude: '', radiusMeters: '200' });
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [myLocation, setMyLocation] = useState<{ lat: number; lng: number } | null>(null);

  const fetchFences = useCallback(async () => {
    try {
      const res = await leadSupabase.geofences.list();
      setFences(res.data ?? []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchFences(); }, [fetchFences]);

  // Get current location for convenience
  useEffect(() => {
    if (showForm && !form.latitude && 'geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setMyLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
          setForm((f) => ({
            ...f,
            latitude: f.latitude || String(pos.coords.latitude.toFixed(6)),
            longitude: f.longitude || String(pos.coords.longitude.toFixed(6)),
          }));
        },
        () => {},
        { enableHighAccuracy: true, timeout: 5000 },
      );
    }
  }, [showForm, form.latitude, form.longitude]);

  const handleSave = async () => {
    if (!form.name || !form.latitude || !form.longitude) return;
    setSaving(true);
    try {
      const lat = parseFloat(form.latitude);
      const lng = parseFloat(form.longitude);
      const radius = parseInt(form.radiusMeters) || 200;
      if (editingId) {
        await leadSupabase.geofences.update(editingId, { name: form.name, latitude: lat, longitude: lng, radiusMeters: radius });
      } else {
        await leadSupabase.geofences.create(form.name, lat, lng, radius);
      }
      setShowForm(false);
      setEditingId(null);
      setForm({ name: '', latitude: '', longitude: '', radiusMeters: '200' });
      await fetchFences();
    } catch (e: any) {
      alert(e?.message ?? 'Failed to save');
    } finally { setSaving(false); }
  };

  const handleEdit = (f: Geofence) => {
    setEditingId(f.id);
    setForm({
      name: f.name,
      latitude: String(f.latitude),
      longitude: String(f.longitude),
      radiusMeters: String(f.radius_meters),
    });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    setDeleting(id);
    try {
      await leadSupabase.geofences.delete(id);
      await fetchFences();
    } catch (e: any) { alert(e?.message ?? 'Failed to delete'); }
    finally { setDeleting(null); }
  };

  const handleToggleActive = async (f: Geofence) => {
    try {
      await leadSupabase.geofences.update(f.id, { isActive: !f.is_active });
      await fetchFences();
    } catch (e: any) { alert(e?.message ?? 'Failed to update'); }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-[16px] font-bold text-[#0A1628]">Geofences</h3>
          <p className="text-[11px] text-[#6b7280]">Restrict clock-ins to approved locations</p>
        </div>
        <CrmBtn variant="gold" onClick={() => { setShowForm(true); setEditingId(null); setForm({ name: '', latitude: '', longitude: '', radiusMeters: '200' }); }}>
          <Plus className="h-3.5 w-3.5" /> Add Geofence
        </CrmBtn>
      </div>

      {/* Form */}
      {showForm && (
        <CrmCard className="p-5">
          <h4 className="mb-3 text-[14px] font-bold text-[#0A1628]">{editingId ? 'Edit Geofence' : 'New Geofence'}</h4>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="mb-1 block text-[10px] font-bold uppercase tracking-[0.14em] text-[#9ca3af]">Name</label>
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Office, Client Site A" className={CRM_INPUT} />
            </div>
            <div>
              <label className="mb-1 block text-[10px] font-bold uppercase tracking-[0.14em] text-[#9ca3af]">Latitude</label>
              <input value={form.latitude} onChange={(e) => setForm({ ...form, latitude: e.target.value })} placeholder="12.9716" type="number" step="any" className={CRM_INPUT} />
            </div>
            <div>
              <label className="mb-1 block text-[10px] font-bold uppercase tracking-[0.14em] text-[#9ca3af]">Longitude</label>
              <input value={form.longitude} onChange={(e) => setForm({ ...form, longitude: e.target.value })} placeholder="77.5946" type="number" step="any" className={CRM_INPUT} />
            </div>
            <div>
              <label className="mb-1 block text-[10px] font-bold uppercase tracking-[0.14em] text-[#9ca3af]">Radius (meters)</label>
              <input value={form.radiusMeters} onChange={(e) => setForm({ ...form, radiusMeters: e.target.value })} type="number" min="50" max="5000" className={CRM_INPUT} />
            </div>
            <div className="flex items-end gap-2">
              {myLocation && (
                <button
                  onClick={() => setForm({ ...form, latitude: String(myLocation.lat.toFixed(6)), longitude: String(myLocation.lng.toFixed(6)) })}
                  className="flex items-center gap-1.5 rounded-xl border border-black/[0.08] bg-[#fafafa] px-3 py-2.5 text-[11px] font-bold text-[#6b7280] hover:bg-[#f0f0f0]"
                >
                  <MapPin className="h-3.5 w-3.5 text-[#96782A]" /> Use my location
                </button>
              )}
            </div>
          </div>
          <div className="mt-4 flex gap-2">
            <CrmBtn variant="gold" onClick={handleSave} disabled={saving || !form.name || !form.latitude || !form.longitude}>
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
              {editingId ? 'Update' : 'Create'}
            </CrmBtn>
            <CrmBtn variant="ghost" onClick={() => { setShowForm(false); setEditingId(null); }}>Cancel</CrmBtn>
          </div>
        </CrmCard>
      )}

      {/* List */}
      {loading ? (
        <div className="rounded-2xl border border-black/[0.05] bg-white p-8 text-center"><Loader2 className="mx-auto h-6 w-6 animate-spin text-[#C9A84C]" /></div>
      ) : fences.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-black/[0.1] bg-white p-10 text-center">
          <Globe className="mx-auto h-8 w-8 text-[#9ca3af]" />
          <p className="mt-2 text-[13px] font-semibold text-[#6b7280]">No geofences configured</p>
          <p className="mt-1 text-[11px] text-[#9ca3af]">Add a geofence to restrict where employees can clock in</p>
        </div>
      ) : (
        <div className="space-y-2">
          {fences.map((f) => (
            <div key={f.id} className={`flex items-center gap-4 rounded-2xl border border-black/[0.06] bg-white p-4 shadow-[0_1px_2px_rgba(10,22,40,0.05)] transition-all ${!f.is_active ? 'opacity-60' : ''}`}>
              <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${f.is_active ? 'bg-emerald-100 text-emerald-600' : 'bg-gray-100 text-gray-400'}`}>
                <MapPin className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-bold text-[#0A1628]">{f.name}</p>
                <p className="text-[10.5px] text-[#6b7280]">
                  {f.latitude.toFixed(5)}, {f.longitude.toFixed(5)} · {f.radius_meters}m radius
                </p>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => handleToggleActive(f)}
                  className={`relative h-6 w-11 rounded-full transition-colors ${f.is_active ? 'bg-emerald-500' : 'bg-gray-300'}`}
                  title={f.is_active ? 'Active — click to disable' : 'Disabled — click to enable'}
                >
                  <div className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${f.is_active ? 'translate-x-[22px]' : 'translate-x-0.5'}`} />
                </button>
                <button onClick={() => handleEdit(f)} className="rounded-lg p-2 text-[#6b7280] hover:bg-[#fafafa] hover:text-[#0A1628]" title="Edit">
                  <Pencil className="h-3.5 w-3.5" />
                </button>
                <button onClick={() => handleDelete(f.id)} disabled={deleting === f.id} className="rounded-lg p-2 text-red-400 hover:bg-red-50 hover:text-red-600" title="Delete">
                  {deleting === f.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
