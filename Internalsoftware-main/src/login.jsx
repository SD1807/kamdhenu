
import React, { useState } from 'react';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import { useNavigate } from 'react-router-dom';
import './form.css';
import logo from './assets/logo.png';
const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    const auth = getAuth();
    try {
      await signInWithEmailAndPassword(auth, email, password);
      navigate('/');
    } catch (err) {
      setError('Invalid email or password');
    }
    setLoading(false);
  };

  return (
    <div style={{minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'#f7fafd'}}>
     
      <form onSubmit={handleLogin} className="section-card" style={{padding:32, borderRadius:16, boxShadow:'0 2px 16px #2563eb22', background:'#fff', minWidth:340}}>
      
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 20 }}>
  <img src={logo} alt="Logo" style={{ width: 100, height: 100 }} />
</div>

        <h2 style={{textAlign:'center', color:'#174ea6', fontWeight:900, marginBottom:24}}>Login</h2>

        <div style={{marginBottom:18}}>
          <label>Email</label>
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} required style={{width:'100%', borderRadius:8, padding:10, border:'1.5px solid #b6c7e6', fontFamily:'inherit'}} />
        </div>
        <div style={{marginBottom:18}}>
          <label>Password</label>
          <input type="password" value={password} onChange={e => setPassword(e.target.value)} required style={{width:'100%', borderRadius:8, padding:10, border:'1.5px solid #b6c7e6', fontFamily:'inherit'}} />
        </div>
        {error && <div style={{color:'#ef4444', marginBottom:12, textAlign:'center'}}>{error}</div>}
        <button type="submit" disabled={loading} style={{width:'100%', padding:'12px 0', borderRadius:8, background:'#2563eb', color:'#fff', fontWeight:700, fontSize:'1.1em', border:'none', cursor:'pointer', marginBottom:8}}>
          {loading ? 'Logging in...' : 'Login'}
        </button>
      </form>
    </div>
  );
};

export default Login;
