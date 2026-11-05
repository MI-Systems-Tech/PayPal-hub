import { useState } from 'react';

export default function Register() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error?.message || 'Signup failed. Please try again.');
      }

      localStorage.setItem('token', data.token);
      window.location.href = '/hub'; 
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="auth-wrapper">
      <div className="auth-card bento-card">
        <h2>Create Account</h2>
        {error && <div className="auth-error">{error}</div>}
        <form onSubmit={handleSubmit} className="auth-form">
          <input 
            type="email" 
            placeholder="Email address" 
            value={email} 
            onChange={e => setEmail(e.target.value)} 
            required 
          />
          <input 
            type="password" 
            placeholder="Password (min 8 characters)" 
            value={password} 
            onChange={e => setPassword(e.target.value)} 
            required 
            minLength={8}
          />
          <button type="submit" className="pill-btn filled-blue">Sign Up</button>
        </form>
        <p className="auth-link">Already have an account? <a href="/login">Log in</a></p>
      </div>
    </div>
  );
}
