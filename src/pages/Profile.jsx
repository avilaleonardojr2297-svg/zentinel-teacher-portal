// src/pages/Profile.jsx
import { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { User, Camera, Save, Mail, Lock } from 'lucide-react'; // Idinagdag ang Lock icon
import AlertModal from '../components/AlertModal';

export default function Profile() {
  const [loading, setLoading] = useState(true);
  
  // States para sa Profile Info
  const [savingProfile, setSavingProfile] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);

  // BAGO: States para sa Change Password
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);

  const [alertConfig, setAlertConfig] = useState({
    isOpen: false, type: 'info', title: '', message: '', onConfirm: () => {}
  });

  const showAlert = (type, title, message, onConfirm = () => {}) => {
    setAlertConfig({ isOpen: true, type, title, message, onConfirm });
  };

  useEffect(() => {
    fetchProfile(); 
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      
      setEmail(user.email);

      const { data, error } = await supabase
        .from('profiles')
        .select('full_name, avatar_url')
        .eq('id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') throw error; 
      
      if (data) {
        setFullName(data.full_name || '');
        setAvatarUrl(data.avatar_url || '');
      }
    } catch (error) {
      console.error(error);
      showAlert('error', 'Error', 'Failed to load profile data.');
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  // --- 1. HANDLE PROFILE SUBMIT ---
  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setSavingProfile(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      let newAvatarUrl = avatarUrl;

      if (selectedFile) {
        setUploading(true);
        const fileExt = selectedFile.name.split('.').pop();
        const filePath = `${user.id}/profile_${Date.now()}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from('avatars')
          .upload(filePath, selectedFile, { upsert: true });

        if (uploadError) throw uploadError;

        const { data: publicUrlData } = supabase.storage
          .from('avatars')
          .getPublicUrl(filePath);

        newAvatarUrl = publicUrlData.publicUrl;
        setAvatarUrl(newAvatarUrl);
        setUploading(false);
      }

      const { error: updateError } = await supabase
        .from('profiles')
        .upsert({ 
          id: user.id, 
          full_name: fullName, 
          avatar_url: newAvatarUrl,
          role: 'Teacher' 
        });

      if (updateError) throw updateError;

      showAlert('success', 'Profile Updated', 'Your profile details have been saved successfully. (Please refresh the page to see changes in the sidebar).');
      setSelectedFile(null);

    } catch (error) {
      console.error(error);
      setUploading(false);
      showAlert('error', 'Update Failed', 'An error occurred while updating your profile.');
    } finally {
      setSavingProfile(false);
    }
  };

  // --- 2. BAGO: HANDLE PASSWORD SUBMIT ---
  const handlePasswordChange = async (e) => {
    e.preventDefault();

    // Validations
    if (newPassword !== confirmPassword) {
      showAlert('error', 'Password Mismatch', 'The new passwords you entered do not match.');
      return;
    }
    if (newPassword.length < 6) {
      showAlert('info', 'Weak Password', 'Your new password must be at least 6 characters long.');
      return;
    }

    setSavingPassword(true);
    try {
      // Supabase Auth function para mag-update ng password
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) throw error;

      showAlert('success', 'Security Updated', 'Your password has been successfully changed!');
      
      // Clear inputs pagkatapos mag-success
      setNewPassword('');
      setConfirmPassword('');

    } catch (error) {
      console.error(error);
      showAlert('error', 'Update Failed', error.message);
    } finally {
      setSavingPassword(false);
    }
  };

  if (loading) return <div style={{ padding: '40px', color: '#6B7280' }}>Loading profile...</div>;

  return (
    <div>
      <h1 style={{ color: '#1F2937', margin: '0 0 20px 0' }}>My Profile</h1>

      {/* CARD 1: PROFILE INFORMATION */}
      <div style={styles.card}>
        <form onSubmit={handleSaveProfile}>
          <div style={styles.avatarSection}>
            <div style={styles.avatarPreview}>
              {selectedFile ? (
                <img src={URL.createObjectURL(selectedFile)} alt="Preview" style={styles.avatarImg} />
              ) : avatarUrl ? (
                <img src={avatarUrl} alt="Avatar" style={styles.avatarImg} />
              ) : (
                <div style={styles.initialsAvatar}>{fullName ? fullName.charAt(0).toUpperCase() : 'T'}</div>
              )}
            </div>
            
            <div style={{ flex: 1 }}>
              <h3 style={{ margin: '0 0 10px 0', color: '#374151' }}>Profile Picture</h3>
              <p style={{ fontSize: '13px', color: '#6B7280', marginBottom: '15px' }}>Upload a new avatar. Recommended size is 256x256px.</p>
              
              <label style={styles.uploadBtn}>
                <Camera size={16} style={{ marginRight: '8px' }} />
                {uploading ? 'Uploading...' : 'Choose Image'}
                <input type="file" accept="image/png, image/jpeg" onChange={handleFileChange} style={{ display: 'none' }} />
              </label>
              {selectedFile && <span style={{ marginLeft: '10px', fontSize: '13px', color: '#10B981' }}>Image selected!</span>}
            </div>
          </div>

          <hr style={{ border: 'none', borderTop: '1px solid #E5E7EB', margin: '30px 0' }} />

          <h3 style={{ margin: '0 0 20px 0', color: '#374151' }}>Account Details</h3>
          
          <div style={styles.inputGroup}>
            <label style={styles.label}>Full Name</label>
            <div style={styles.inputWrapper}>
              <User size={18} color="#9CA3AF" style={styles.inputIcon} />
              <input 
                type="text" 
                value={fullName} 
                onChange={(e) => setFullName(e.target.value)} 
                placeholder="e.g. Juan Dela Cruz" 
                style={styles.input} 
                required
              />
            </div>
          </div>

          <div style={styles.inputGroup}>
            <label style={styles.label}>Email Address (Read-only)</label>
            <div style={styles.inputWrapper}>
              <Mail size={18} color="#9CA3AF" style={styles.inputIcon} />
              <input 
                type="email" 
                value={email} 
                disabled 
                style={{ ...styles.input, backgroundColor: '#F3F4F6', color: '#6B7280' }} 
              />
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '30px' }}>
            <button type="submit" disabled={savingProfile || uploading} style={styles.saveBtn}>
              {savingProfile ? 'Saving...' : <><Save size={18} style={{ marginRight: '8px' }} /> Save Profile</>}
            </button>
          </div>
        </form>
      </div>

      {/* CARD 2: BAGO - SECURITY & PASSWORD */}
      <div style={{ ...styles.card, marginTop: '20px' }}>
        <form onSubmit={handlePasswordChange}>
          <h3 style={{ margin: '0 0 20px 0', color: '#374151', display: 'flex', alignItems: 'center' }}>
            <Lock size={20} color="#3B82F6" style={{ marginRight: '10px' }} /> 
            Security Settings
          </h3>
          
          <p style={{ fontSize: '14px', color: '#6B7280', marginBottom: '20px' }}>
            Ensure your account is using a long, random password to stay secure.
          </p>

          <div style={styles.inputGroup}>
            <label style={styles.label}>New Password</label>
            <div style={styles.inputWrapper}>
              <Lock size={18} color="#9CA3AF" style={styles.inputIcon} />
              <input 
                type="password" 
                value={newPassword} 
                onChange={(e) => setNewPassword(e.target.value)} 
                placeholder="Enter new password" 
                style={styles.input} 
                required
                minLength={6}
              />
            </div>
          </div>

          <div style={styles.inputGroup}>
            <label style={styles.label}>Confirm New Password</label>
            <div style={styles.inputWrapper}>
              <Lock size={18} color="#9CA3AF" style={styles.inputIcon} />
              <input 
                type="password" 
                value={confirmPassword} 
                onChange={(e) => setConfirmPassword(e.target.value)} 
                placeholder="Re-type new password" 
                style={styles.input} 
                required
                minLength={6}
              />
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '20px' }}>
            <button type="submit" disabled={savingPassword} style={{ ...styles.saveBtn, backgroundColor: '#3B82F6' }}>
              {savingPassword ? 'Updating...' : 'Update Password'}
            </button>
          </div>
        </form>
      </div>

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
  card: { backgroundColor: 'white', padding: '35px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', maxWidth: '700px' },
  avatarSection: { display: 'flex', alignItems: 'center', gap: '25px' },
  avatarPreview: { width: '100px', height: '100px', borderRadius: '50%', border: '3px solid #E5E7EB', display: 'flex', justifyContent: 'center', alignItems: 'center', overflow: 'hidden', backgroundColor: '#F9FAFB' },
  avatarImg: { width: '100%', height: '100%', objectFit: 'cover' },
  initialsAvatar: { width: '100%', height: '100%', backgroundColor: '#3B82F6', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '36px', fontWeight: 'bold' },
  uploadBtn: { display: 'inline-flex', alignItems: 'center', backgroundColor: '#EFF6FF', color: '#3B82F6', padding: '10px 15px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', border: '1px solid #BFDBFE', transition: '0.2s', fontSize: '14px' },
  inputGroup: { marginBottom: '20px' },
  label: { display: 'block', color: '#4B5563', fontWeight: 'bold', fontSize: '14px', marginBottom: '8px' },
  inputWrapper: { display: 'flex', alignItems: 'center', position: 'relative' },
  inputIcon: { position: 'absolute', left: '15px' },
  input: { width: '100%', padding: '12px 12px 12px 45px', borderRadius: '8px', border: '1px solid #D1D5DB', fontSize: '15px', outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' },
  saveBtn: { display: 'flex', alignItems: 'center', backgroundColor: '#10B981', color: 'white', padding: '12px 25px', borderRadius: '8px', border: 'none', fontSize: '15px', fontWeight: 'bold', cursor: 'pointer' }
};