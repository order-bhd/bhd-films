import { useCallback, useEffect, useId, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

// Live wallet balance + realtime updates, so the customer's Available Fund
// on screen always reflects the latest secure server-side state.
//
// This hook is used by several components at once (TopHeader, Wallet page,
// CategoryOrder...). Supabase reuses a Realtime channel whenever the same
// channel name is requested twice, and throws if a second `.on()` is
// attached after the first caller already `.subscribe()`d. So every
// mounted instance of this hook must use its own unique channel name -
// `useId()` gives each component instance a stable, unique id for that.
export function useWallet() {
  const { user } = useAuth()
  const instanceId = useId()
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
      .channel(`wallet-${user.id}-${instanceId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'wallets', filter: `user_id=eq.${user.id}` },
        () => load()
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [user, load, instanceId])

  return { wallet, loading, refresh: load }
}
