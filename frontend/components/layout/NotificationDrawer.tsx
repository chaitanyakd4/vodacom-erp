'use client';
import { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import api from '../../lib/api';

type Notification = {
  id: number;
  title: string;
  message: string;
  type: string;
  is_read: boolean;
  reference_id: number;
  created_at: string;
};

export function NotificationDrawer() {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const { user } = useAuth();
  const [sendingId, setSendingId] = useState<number | null>(null);

  const fetchNotifications = async () => {
    try {
      const res = await api.get('/api/notifications');
      setNotifications(res.data);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    if (user) {
      fetchNotifications();
      const interval = setInterval(fetchNotifications, 60000); // poll every minute
      return () => clearInterval(interval);
    }
  }, [user]);

  const markAsRead = async (id: number) => {
    try {
      await api.post(`/api/notifications/${id}/read`);
      setNotifications(prev => prev.filter(n => n.id !== id));
    } catch (e) {}
  };

  const sendReminderEmail = async (amcId: number, notifId: number) => {
    try {
      setSendingId(notifId);
      const res = await api.post(`/api/amc/${amcId}/send-email`);
      if (res.status === 200 || res.data?.status === 'success') {
        alert("Reminder email sent successfully!");
        markAsRead(notifId);
      } else {
        alert("Failed to send email");
      }
    } catch (e: any) {
      alert("Failed to send email: " + (e.response?.data?.detail || "Error sending email"));
    } finally {
      setSendingId(null);
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        title="Notifications"
        className="relative w-9 h-9 flex items-center justify-center rounded-lg
                   bg-vodacom-surface border border-white/5
                   hover:bg-vodacom-blue/20 hover:border-vodacom-blue/30 transition-all duration-200"
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
             stroke="#94a3b8" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
             className={`transition-colors ${isOpen ? 'stroke-white' : 'hover:stroke-white'}`}>
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
          <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
        </svg>
        {notifications.length > 0 && (
          <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border border-vodacom-surface animate-pulse" />
        )}
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute right-0 mt-2 w-80 bg-vodacom-surface border border-white/10 rounded-lg shadow-2xl z-50 overflow-hidden">
            <div className="px-4 py-3 border-b border-white/5 bg-vodacom-darker/50 flex justify-between items-center">
              <h3 className="text-sm font-semibold text-white">Notifications</h3>
              <span className="text-xs bg-red-500/20 text-red-400 px-2 py-0.5 rounded-full font-medium">
                {notifications.length} new
              </span>
            </div>
            <div className="max-h-96 overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="px-4 py-8 text-center text-vodacom-muted text-sm">
                  No new notifications
                </div>
              ) : (
                notifications.map(n => (
                  <div key={n.id} className="p-4 border-b border-white/5 hover:bg-white/[0.02] transition-colors group">
                    <div className="flex items-start justify-between">
                      <h4 className="text-sm font-medium text-vodacom-text mb-1">{n.title}</h4>
                      <button 
                        onClick={() => markAsRead(n.id)}
                        className="text-vodacom-muted hover:text-white opacity-0 group-hover:opacity-100 transition-opacity"
                        title="Dismiss"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M18 6L6 18M6 6l12 12"/>
                        </svg>
                      </button>
                    </div>
                    <p className="text-xs text-vodacom-muted leading-relaxed mb-3">{n.message}</p>
                    
                    {n.type === 'amc_expiry' && (
                      <button
                        disabled={sendingId === n.id}
                        onClick={() => sendReminderEmail(n.reference_id, n.id)}
                        className="w-full flex items-center justify-center gap-2 py-2 px-3 text-xs font-medium bg-vodacom-blue hover:bg-blue-600 text-white rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {sendingId === n.id ? (
                          <>
                            <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            Sending...
                          </>
                        ) : (
                          <>
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <line x1="22" y1="2" x2="11" y2="13"/>
                              <polygon points="22 2 15 22 11 13 2 9 22 2"/>
                            </svg>
                            Send Reminder Email
                          </>
                        )}
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
