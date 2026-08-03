import { useState } from 'react'
import { supabase } from '../lib/supabase'

export default function Login() {
  const [email, setEmail] = useState('lucascartocci@gmail.com')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function submit(event) {
    event.preventDefault()
    setLoading(true); setError('')
    const { error: authError } = await supabase.auth.signInWithPassword({ email, password })
    if (authError) setError(authError.message)
    setLoading(false)
  }

  return <main className="login-screen">
    <form className="login-card" onSubmit={submit}>
      <img src={`${import.meta.env.BASE_URL}logo-acquacetosa.png`} alt="Acquacetosa" />
      <p>ARCHIVIO METODOLOGICO ACQUACETOSA</p>
      <h1>ACQ CLOUD</h1>
      <label>EMAIL</label>
      <input value={email} onChange={e => setEmail(e.target.value)} type="email" required />
      <label>PASSWORD</label>
      <input value={password} onChange={e => setPassword(e.target.value)} type="password" required />
      <button disabled={loading}>{loading ? 'ACCESSO…' : 'ACCEDI'}</button>
      {error && <div className="error-box">{error}</div>}
    </form>
  </main>
}
