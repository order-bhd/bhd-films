import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

// Live wallet balance + realtime updates, so the customer's Available Fund
// on screen always reflects the latest secure server-side state.
export function useWallet() {
  const { user } = useAuth()
  const [wallet, setWallet] = useState(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    if (!user) {
      setWallet(null)
      setLoading(false)
      return
    }
    setLoading(true)
    const { data } = await supabase.from('wallets').select('*').eq('user_id', user.id).maybeSingle()
    setWallet(data)
    setLoading(false)
  }, [user])

  useEffect(() => {
    load()
    if (!user) return undefined

    const channel = supabase
      .channel(`wallet-${user.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'wallets', filter: `user_id=eq.${user.id}` },
        () => load()
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [user, load])

  return { wallet, loading, refresh: load }
}
