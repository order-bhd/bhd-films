import { useCallback, useEffect, useId, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

// Notification Bell data source. Reuses the existing public.notifications
// table (already used elsewhere in the app) - no new table needed.
// Realtime-subscribes to new rows for the logged-in user so the badge
// count updates instantly when Admin replies to a support ticket.
export function useNotifications() {
  const { user } = useAuth()
  const instanceId = useId()
  const [notifications, setNotifications] = useState([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    if (!user) {
      setNotifications([])
      setLoading(false)
      return
    }
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(30)
    setNotifications(data || [])
    setLoading(false)
  }, [user])

  useEffect(() => {
    load()
    if (!user) return undefined
    const channel = supabase
      .channel(`notifications-${user.id}-${instanceId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` }, () => load())
      .subscribe()
    return () => {
      supabase.removeChannel(channel)
    }
  }, [user, load, instanceId])

  const unreadCount = notifications.filter((n) => !n.is_read).length

  async function markRead(id) {
    await supabase.from('notifications').update({ is_read: true }).eq('id', id)
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)))
  }

  return { notifications, unreadCount, loading, refresh: load, markRead }
}
