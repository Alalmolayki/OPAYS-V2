import { Trophy } from 'lucide-react';
import { useStore } from '../store/useStore';
import { avatarGradient } from '../utils/avatar';

const RANK_STYLES = ['text-amber-400', 'text-slate-300', 'text-orange-400'];
const STAFF_ROLES = ['superadmin', 'admin', 'branch_teacher', 'tech_teacher'];

export default function LeaderboardPage() {
  const { users, selectedSchoolId } = useStore();

  const ranked = users
    .filter(u => u.schoolId === selectedSchoolId && !STAFF_ROLES.includes(u.role) && !u.isBlacklisted)
    .sort((a, b) => (b.points || 0) - (a.points || 0));

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-amber-500/15 flex items-center justify-center">
          <Trophy size={16} className="text-amber-400" />
        </div>
        <h1 className="text-xl font-bold text-white">Liderlik Tablosu</h1>
      </div>

      {ranked.length === 0 ? (
        <div className="card p-16 text-center">
          <Trophy size={36} className="mx-auto text-slate-600 mb-3" />
          <p className="text-slate-400 font-medium">Henüz sıralama yok.</p>
        </div>
      ) : (
        <div className="card divide-y divide-slate-800/60">
          {ranked.map((u, i) => (
            <div key={u.id} className="flex items-center gap-4 p-4">
              <span className={`w-8 text-center font-bold ${RANK_STYLES[i] || 'text-slate-500'}`}>{i + 1}</span>
              {u.photoUrl ? (
                <img src={u.photoUrl} alt="" className="w-9 h-9 rounded-lg object-cover flex-shrink-0" />
              ) : (
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center text-xs font-bold text-white flex-shrink-0 ${avatarGradient(u.id)}`}>
                  {u.firstName[0]}{u.lastName[0]}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-200 truncate">{u.firstName} {u.lastName}</p>
                <p className="text-xs text-slate-500">{u.class ? `${u.class}/${u.section}` : u.role}</p>
              </div>
              <span className="text-sm font-bold text-cyan-400">{u.points || 0} p</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
