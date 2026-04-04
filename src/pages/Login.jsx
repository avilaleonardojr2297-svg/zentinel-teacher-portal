// src/pages/Login.jsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabase';
import { LogIn, Mail, Lock, ShieldCheck, Key, Hash, ArrowLeft } from 'lucide-react';
import appLogo from '../assets/icon.png';
import AlertModal from '../components/AlertModal';

export default function Login() {
  // --- VIEW STATE ---
  // 'login' | 'forgot' | 'otp'
  const [viewMode, setViewMode] = useState('login');

  // --- FORM STATES ---
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  const [resetEmail, setResetEmail] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  // --- MODAL STATE ---
  const [alertConfig, setAlertConfig] = useState({
    isOpen: false, type: 'info', title: '', message: '', onConfirm: () => {}
  });

  const showAlert = (type, title, message, onConfirm = () => {}) => {
    setAlertConfig({ isOpen: true, type, title, message, onConfirm });
  };

  // ==========================================
  // 1. LOGIN LOGIC
  // ==========================================
  const handleLogin = async (e) => {
    e.preventDefault(); 
    setLoading(true);
    
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;

      if (data.user) {
        navigate('/dashboard');
      }
    } catch (error) {
      console.error("Login Error:", error);
      showAlert('error', 'Authentication Failed', 'Invalid email or password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // ==========================================
  // 2. FORGOT PASSWORD (SEND OTP) LOGIC
  // ==========================================
  const handleSendOTP = async (e) => {
    e.preventDefault();
    if (!resetEmail) {
      showAlert('info', 'Missing Email', 'Please enter your registered email address.');
      return;
    }
    setLoading(true);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(resetEmail);
      if (error) throw error;

      showAlert('success', 'Code Sent!', 'Check your email for the 6-digit reset code.');
      setViewMode('otp'); // Lipat sa OTP verification view
    } catch (error) {
      console.error("OTP Error:", error);
      showAlert('error', 'Request Failed', error.message);
    } finally {
      setLoading(false);
    }
  };

  // ==========================================
  // 3. VERIFY OTP & RESET PASSWORD LOGIC
  // ==========================================
  const handleVerifyAndReset = async (e) => {
    e.preventDefault();
    if (!otpCode || !newPassword) {
      showAlert('info', 'Missing Fields', 'Please enter the OTP code and your new password.');
      return;
    }
    if (newPassword.length < 6) {
      showAlert('info', 'Weak Password', 'Password must be at least 6 characters.');
      return;
    }

    setLoading(true);
    try {
      // Step A: Verify OTP (Gaya ng sa App)
      const { error: verifyError } = await supabase.auth.verifyOtp({
        email: resetEmail,
        token: otpCode,
        type: 'recovery'
      });

      if (verifyError) throw new Error("Invalid or expired code. Please try again.");

      // Step B: Update Password
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (updateError) throw updateError;

      showAlert('success', 'Success!', 'Your password has been successfully reset.');
      
      // I-reset ang mga states at bumalik sa login screen
      setViewMode('login');
      setOtpCode('');
      setNewPassword('');
      setPassword(''); 
      setEmail(resetEmail); // Ilagay na agad sa login email field para madali mag-login

    } catch (error) {
      console.error("Reset Error:", error);
      showAlert('error', 'Reset Failed', error.message);
    } finally {
      setLoading(false);
    }
  };

  // ==========================================
  // UI RENDERERS
  // ==========================================
  return (
    <div style={styles.container}>
      {/* Background Decors */}
      <div style={styles.bgCircle1}></div>
      <div style={styles.bgCircle2}></div>

      <div style={styles.card}>
        <div style={styles.header}>
          <div style={styles.logoWrapper}>
            <img src={appLogo} alt="Zentinel Logo" style={styles.logoImg} />
          </div>
          
          {/* Dynamic Header based on View */}
          {viewMode === 'login' && (
            <>
              <h1 style={styles.title}>Zentinel Admin</h1>
              <p style={styles.subtitle}>SIGN IN TO TEACHER PORTAL PANEL</p>
            </>
          )}
          {viewMode === 'forgot' && (
            <>
              <h1 style={styles.title}>Reset Password</h1>
              <p style={styles.subtitle}>ENTER YOUR REGISTERED EMAIL</p>
            </>
          )}
          {viewMode === 'otp' && (
            <>
              <h1 style={styles.title}>Enter Reset Code</h1>
              <p style={styles.subtitle}>VERIFY OTP AND SET NEW PASSWORD</p>
            </>
          )}
        </div>

        {/* 1. LOGIN FORM */}
        {viewMode === 'login' && (
          <form onSubmit={handleLogin} style={styles.form}>
            <div style={styles.inputGroup}>
              <label style={styles.label}>Email Address</label>
              <div style={styles.inputWrapper}>
                <Mail size={18} color="#9CA3AF" style={styles.inputIcon} />
                <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} style={styles.input} placeholder="teacher@school.edu" />
              </div>
            </div>

            <div style={styles.inputGroup}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label style={styles.label}>Password</label>
                <span style={styles.textLink} onClick={() => setViewMode('forgot')}>Forgot Password?</span>
              </div>
              <div style={styles.inputWrapper}>
                <Lock size={18} color="#9CA3AF" style={styles.inputIcon} />
                <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} style={styles.input} placeholder="••••••••" />
              </div>
            </div>

            <button type="submit" disabled={loading} style={styles.button}>
              {loading ? 'Authenticating...' : <><LogIn size={18} style={{ marginRight: '8px' }} /> Sign In</>}
            </button>
          </form>
        )}

        {/* 2. FORGOT PASSWORD FORM */}
        {viewMode === 'forgot' && (
          <form onSubmit={handleSendOTP} style={styles.form}>
            <div style={styles.inputGroup}>
              <label style={styles.label}>Email Address</label>
              <div style={styles.inputWrapper}>
                <Mail size={18} color="#9CA3AF" style={styles.inputIcon} />
                <input type="email" required value={resetEmail} onChange={(e) => setResetEmail(e.target.value)} style={styles.input} placeholder="email@domain.com" />
              </div>
            </div>

            <button type="submit" disabled={loading} style={styles.button}>
              {loading ? 'Sending Code...' : <><Key size={18} style={{ marginRight: '8px' }} /> Send Reset Link</>}
            </button>

            <button type="button" onClick={() => setViewMode('login')} style={styles.backButton}>
              <ArrowLeft size={16} style={{ marginRight: '5px' }} /> Back to Login
            </button>
          </form>
        )}

        {/* 3. OTP VERIFICATION FORM */}
        {viewMode === 'otp' && (
          <form onSubmit={handleVerifyAndReset} style={styles.form}>
            <div style={styles.inputGroup}>
              <label style={styles.label}>6-Digit OTP Code</label>
              <div style={styles.inputWrapper}>
                <Hash size={18} color="#9CA3AF" style={styles.inputIcon} />
                <input type="text" required value={otpCode} onChange={(e) => setOtpCode(e.target.value)} style={styles.input} placeholder="123456" maxLength={6} />
              </div>
            </div>

            <div style={styles.inputGroup}>
              <label style={styles.label}>New Password</label>
              <div style={styles.inputWrapper}>
                <Lock size={18} color="#9CA3AF" style={styles.inputIcon} />
                <input type="password" required value={newPassword} onChange={(e) => setNewPassword(e.target.value)} style={styles.input} placeholder="••••••••" minLength={6} />
              </div>
            </div>

            <button type="submit" disabled={loading} style={{ ...styles.button, backgroundColor: '#10B981', boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)' }}>
              {loading ? 'Verifying...' : <><Lock size={18} style={{ marginRight: '8px' }} /> Update Password</>}
            </button>

            <button type="button" onClick={() => setViewMode('login')} style={styles.backButton}>
              <ArrowLeft size={16} style={{ marginRight: '5px' }} /> Back to Login
            </button>
          </form>
        )}

        <div style={styles.footer}>
          <ShieldCheck size={14} style={{ marginRight: '5px' }} />
          <span>Protected by Zentinel Admin Security</span>
        </div>
      </div>

      {/* ALERT MODAL */}
      <AlertModal 
        isOpen={alertConfig.isOpen}
        type={alertConfig.type}
        title={alertConfig.title}
        message={alertConfig.message}
        onClose={() => setAlertConfig({ ...alertConfig, isOpen: false })}
        onConfirm={alertConfig.onConfirm}
      />
    </div>
  );
}

const styles = {
  container: { position: 'relative', display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', backgroundColor: '#F8FAFC', fontFamily: "'Inter', system-ui, -apple-system, sans-serif", overflow: 'hidden' },
  bgCircle1: { position: 'absolute', top: '-10%', left: '-5%', width: '400px', height: '400px', backgroundColor: '#DBEAFE', borderRadius: '50%', filter: 'blur(80px)', zIndex: 0 },
  bgCircle2: { position: 'absolute', bottom: '-10%', right: '-5%', width: '300px', height: '300px', backgroundColor: '#E0E7FF', borderRadius: '50%', filter: 'blur(60px)', zIndex: 0 },
  card: { position: 'relative', zIndex: 1, backgroundColor: 'white', padding: '40px 40px 30px 40px', borderRadius: '24px', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.01)', width: '100%', maxWidth: '420px', border: '1px solid #F1F5F9' },
  header: { textAlign: 'center', marginBottom: '35px' },
  logoWrapper: { display: 'flex', justifyContent: 'center', marginBottom: '20px' },
  logoImg: { width: '64px', height: '64px', objectFit: 'contain', backgroundColor: '#EFF6FF', padding: '12px', borderRadius: '16px', boxShadow: '0 4px 14px rgba(59, 130, 246, 0.15)' },
  title: { color: '#0F172A', margin: '0 0 8px 0', fontSize: '26px', fontWeight: '800', letterSpacing: '-0.5px' },
  subtitle: { color: '#64748B', margin: 0, fontSize: '13px', fontWeight: 'bold', letterSpacing: '0.5px' },
  form: { display: 'flex', flexDirection: 'column', gap: '22px' },
  inputGroup: { display: 'flex', flexDirection: 'column', gap: '8px' },
  label: { color: '#334155', fontWeight: '700', fontSize: '13px' },
  inputWrapper: { position: 'relative', display: 'flex', alignItems: 'center' },
  inputIcon: { position: 'absolute', left: '16px', pointerEvents: 'none' },
  input: { width: '100%', padding: '14px 14px 14px 45px', borderRadius: '12px', border: '1px solid #E2E8F0', backgroundColor: '#F8FAFC', fontSize: '15px', outline: 'none', color: '#0F172A', transition: 'all 0.2s ease', boxSizing: 'border-box' },
  button: { backgroundColor: '#3B82F6', color: 'white', padding: '15px', borderRadius: '12px', border: 'none', fontSize: '15px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', marginTop: '10px', boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)', transition: 'background-color 0.2s ease' },
  textLink: { color: '#3B82F6', fontSize: '13px', fontWeight: 'bold', cursor: 'pointer' },
  backButton: { backgroundColor: 'transparent', color: '#64748B', border: 'none', fontSize: '14px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', marginTop: '-5px' },
  footer: { marginTop: '30px', display: 'flex', justifyContent: 'center', alignItems: 'center', color: '#94A3B8', fontSize: '12px', fontWeight: '600' }
};