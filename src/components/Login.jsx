import React, { useState } from 'react';
import { supabaseClient } from '../services/supabaseClient'; // Vérifiez le chemin vers supabaseClient

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');

    try {
      const { data, error } = await supabaseClient.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;
      
      alert('Connexion réussie !');
      // Redirection ou mise à jour d'état après connexion si nécessaire
    } catch (error) {
      setErrorMsg(error.message || 'Erreur lors de la connexion');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      maxWidth: '400px',
      margin: '60px auto',
      padding: '24px',
      borderRadius: '8px',
      border: '1px solid var(--border)',
      background: 'var(--bg-surface)',
      boxShadow: 'var(--shadow-md)'
    }}>
      <h2 style={{ marginBottom: '8px' }}>Connexion</h2>
      <p style={{ marginBottom: '20px', color: 'var(--text-muted)' }}>
        Connectez-vous pour accéder à votre plateforme.
      </p>

      {errorMsg && (
        <div style={{
          padding: '10px',
          borderRadius: '6px',
          background: 'rgba(239, 68, 68, 0.1)',
          border: '1px solid var(--danger)',
          color: 'var(--danger)',
          fontSize: '13px',
          marginBottom: '16px'
        }}>
          {errorMsg}
        </div>
      )}

      <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div>
          <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500' }}>Email</label>
          <input
            type="email"
            placeholder="votre.email@exemple.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            style={{
              width: '100%',
              padding: '10px',
              borderRadius: '6px',
              border: '1px solid var(--border)',
              background: 'var(--bg-main)',
              color: 'var(--text-main)',
              outline: 'none'
            }}
          />
        </div>

        <div>
          <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500' }}>Mot de passe</label>
          <input
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            style={{
              width: '100%',
              padding: '10px',
              borderRadius: '6px',
              border: '1px solid var(--border)',
              background: 'var(--bg-main)',
              color: 'var(--text-main)',
              outline: 'none'
            }}
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          style={{
            padding: '12px',
            background: 'var(--primary)',
            color: '#ffffff',
            border: 'none',
            borderRadius: '6px',
            fontWeight: '600',
            cursor: loading ? 'not-allowed' : 'pointer',
            opacity: loading ? 0.7 : 1,
            marginTop: '8px'
          }}
        >
          {loading ? 'Connexion en cours...' : 'Se connecter'}
        </button>
      </form>
    </div>
  );
}