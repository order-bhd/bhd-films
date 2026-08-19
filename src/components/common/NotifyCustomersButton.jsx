async function handleClick() {
  setSending(true)
  setError('')
  setResult(null)

  try {
    // Check the current Supabase login session first
    const {
      data: { session },
      error: sessionError
    } = await supabase.auth.getSession()

    console.log('Current session:', session)

    if (sessionError || !session?.access_token) {
      setError('Your login session has expired. Please login again.')
      return
    }

    const { data, error: fnError } = await supabase.functions.invoke(
      'send-push',
      {
        body: { title, body, url, audience: 'all' },
        headers: {
          Authorization: `Bearer ${session.access_token}`
        }
      }
    )

    if (fnError) {
      console.error('Push function error:', fnError)
      setError(fnError.message || 'Could not send notifications.')
      return
    }

    console.log('Push result:', data)
    setResult(data)
  } catch (err) {
    console.error('Unexpected error:', err)
    setError(err.message || 'Could not send notifications.')
  } finally {
    setSending(false)
  }
}