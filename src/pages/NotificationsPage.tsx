import { Bell, Check, CheckCheck, MessageSquare, ExternalLink } from 'lucide-react';
import { useStore } from '../store/useStore';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';

export default function NotificationsPage() {
  const { currentUser, notifications, markNotificationRead } = useStore();
  const navigate = useNavigate();
  if (!currentUser) return null;

  const isSuperAdmin = currentUser.role === 'superadmin';

  // Each user sees their own notifications; superadmin also sees system-wide (no userId) ones
  const myNotifications = [...notifications]
    .filter(n => n.userId === currentUser.id || (!n.userId && isSuperAdmin))
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const unreadCount = myNotifications.filter(n => !n.read).length;

  const markAllRead = () => {
    myNotifications.filter(n => !n.read).forEach(n => markNotificationRead(n.id));
  };

  const typeStyle: Record<string, string> = {
    warning: 'bg-red-500/10 border-red-500/20 text-red-400',
    success: 'bg-green-500/10 border-green-500/20 text-green-400',
    info: 'bg-blue-500/10 border-blue-500/20 text-blue-400',
  };
  const dotStyle: Record<string, string> = {
    warning: 'bg-red-400',
    success: 'bg-green-400',
    info: 'bg-blue-400',
  };
  const typeLabel: Record<string, string> = {
    warning: 'Uyarı',
    success: 'Başarı',
    info: 'Bilgi',
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-amber-500/15 flex items-center justify-center">
            <Bell size={16} className="text-amber-400" />
          </div>
          <h1 className="text-xl font-bold text-white">Bildirimler</h1>
          {unreadCount > 0 && (
            <span className="badge bg-red-500/15 text-red-400 border border-red-500/20">{unreadCount} yeni</span>
          )}
        </div>
        {unreadCount > 0 && (
          <button
            onClick={markAllRead}
            className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 transition-colors px-3 py-1.5 rounded-lg border border-slate-700 hover:border-slate-600"
          >
            <CheckCheck size={13} /> Tümünü Okundu İşaretle
          </button>
        )}
      </div>

      {myNotifications.length === 0 ? (
        <div className="card p-16 text-center">
          <Bell size={36} className="mx-auto text-slate-600 mb-3" />
          <p className="text-slate-400 font-medium">Henüz bildirim yok.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {myNotifications.map(n => (
            <div
              key={n.id}
              onClick={() => {
                if (!n.read) markNotificationRead(n.id);
                if (n.link) navigate(n.link);
              }}
              className={`flex items-start gap-4 p-4 rounded-xl border transition-all cursor-pointer ${
                !n.read
                  ? 'bg-amber-500/10 border-amber-500/20 hover:bg-amber-500/15'
                  : 'bg-slate-900/40 border-slate-800/60 hover:bg-slate-900/60'
              } ${n.link ? 'hover:border-cyan-500/30' : ''}`}
            >
              {/* Type indicator dot */}
              <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 mt-1.5 ${dotStyle[n.type] || 'bg-slate-400'}`} />

              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${typeStyle[n.type] || ''}`}>
                    {typeLabel[n.type] || n.type}
                  </span>
                  <span className="text-xs text-slate-600">{format(new Date(n.createdAt), 'd MMMM yyyy, HH:mm', { locale: tr })}</span>
                </div>
                <p className="text-sm text-slate-300 leading-relaxed">{n.message}</p>
                {(() => {
                  const wpMatch = n.message.match(/https:\/\/chat\.whatsapp\.com\/\S+/);
                  return wpMatch ? (
                    <a
                      href={wpMatch[0]}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 mt-2 text-xs bg-green-500/15 text-green-400 border border-green-500/20 px-3 py-1.5 rounded-lg hover:bg-green-500/25 transition-colors"
                      onClick={e => e.stopPropagation()}
                    >
                      <MessageSquare size={12} /> WhatsApp Grubuna Katıl
                    </a>
                  ) : null;
                })()}
              </div>

              {/* Unread indicator / link hint */}
              <div className="flex-shrink-0 flex flex-col items-center gap-1.5">
                {!n.read ? (
                  <div className="w-2 h-2 bg-cyan-400 rounded-full mt-1.5" title="Okunmadı" />
                ) : (
                  <Check size={14} className="text-slate-700 mt-0.5" />
                )}
                {n.link && <ExternalLink size={12} className="text-slate-600" />}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
