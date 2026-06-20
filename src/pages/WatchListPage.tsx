import { useState } from 'react';
import { Eye, X } from 'lucide-react';
import { useStore } from '../store/useStore';
import { avatarGradient } from '../utils/avatar';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';

export default function WatchListPage() {
  const { users, watchList, removeFromWatchList, selectedSchoolId } = useStore();
  const [showResolved, setShowResolved] = useState(false);

  const entries = watchList
    .filter(w => {
      const u = users.find(usr => usr.id === w.userId);
      if (!u || u.schoolId !== selectedSchoolId) return false;
      return showResolved ? true : w.isActive;
    })
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-red-500/15 flex items-center justify-center">
            <Eye size={16} className="text-red-400" />
          </div>
          <h1 className="text-xl font-bold text-white">Gözlem Listesi</h1>
          <span className="badge bg-slate-800 text-slate-400 border border-slate-700">{entries.filter(e => e.isActive).length} aktif</span>
        </div>
        <button
          onClick={() => setShowResolved(v => !v)}
          className="text-xs text-slate-400 hover:text-slate-200 transition-colors px-3 py-1.5 rounded-lg border border-slate-700 hover:border-slate-600"
        >
          {showResolved ? 'Sadece Aktif' : 'Geçmişi Göster'}
        </button>
      </div>

      {entries.length === 0 ? (
        <div className="card p-16 text-center">
          <Eye size={36} className="mx-auto text-slate-600 mb-3" />
          <p className="text-slate-400 font-medium">Gözlem listesi boş.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {entries.map(w => {
            const u = users.find(usr => usr.id === w.userId);
            if (!u) return null;
            return (
              <div key={w.id} className={`card p-4 flex items-start gap-3 ${!w.isActive ? 'opacity-50' : ''}`}>
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center text-xs font-bold text-white flex-shrink-0 ${avatarGradient(u.id)}`}>
                  {u.firstName[0]}{u.lastName[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-200">{u.firstName} {u.lastName}</p>
                  <p className="text-xs text-slate-400 mt-0.5">{w.reason}</p>
                  <p className="text-xs text-slate-600 mt-1">{format(new Date(w.date), 'd MMM yyyy', { locale: tr })} · {w.addedBy}</p>
                </div>
                {w.isActive && (
                  <button onClick={() => removeFromWatchList(w.id)} className="text-slate-600 hover:text-green-400 transition-colors flex-shrink-0" title="Listeden çıkar">
                    <X size={16} />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
