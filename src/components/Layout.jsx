// src/components/Layout.jsx
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../supabase';
import { 
  LayoutDashboard, Users, BookOpen, FileUp, 
  LogOut, ClipboardList, ShieldCheck, UserCircle 
} from 'lucide-react';
import { useState, useEffect } from 'react';
import appLogo from '../assets/icon.png';

export default function Layout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [userEmail, setUserEmail] = useState('');
  const [userName, setUserName] = useState('Teacher Account');
  const [avatarUrl, setAvatarUrl] = useState(null);

  useEffect(() => {
    const getUserData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        setUserEmail(user.email);

        // Option 1: Kunin ang picture galing sa Google Auth Metadata
        let pic = user.user_metadata?.avatar_url || user.user_metadata?.picture;
        let name = user.user_metadata?.full_name || user.user_metadata?.name;

        // Option 2: Kung walang metadata, kunin sa 'profiles' table mo
        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name, avatar_url')
          .eq('id', user.id)
          .single();

        if (profile) {
          // Kung may naka-save na pangalan at picture sa database, ito ang gagamitin
          if (profile.full_name) name = profile.full_name;
          if (profile.avatar_url) pic = profile.avatar_url;
        }

        if (name) setUserName(name);
        if (pic) setAvatarUrl(pic);
      }
    };
    
    getUserData();
  }, []);

  const handleLogout = async () => {
    const confirmLogout = window.confirm("You are about to log out of the Zentinel Admin Portal. Continue?");
    if (confirmLogout) {
      await supabase.auth.signOut();
      navigate('/');
    }
  };

  const isActive = (path) => location.pathname === path;

  return (
    <div style={styles.container}>
      {/* SIDEBAR */}
      <aside style={styles.sidebar}>
        {/* BRANDING SECTION */}
        <div style={styles.logoContainer}>
          <div style={styles.logoIcon}>
            <img src={appLogo} alt="Zentinel Logo" style={styles.customLogo} />
          </div>
          <div>
            <h2 style={styles.logoText}>ZENTINEL APP</h2>
            <span style={styles.logoSubtext}>Teacher Portal v1.0.0</span>
          </div>
        </div>

        {/* USER PROFILE SECTION */}
        <div style={styles.userSection}>
          <div style={styles.avatar}>
            {avatarUrl ? (
              <img src={avatarUrl} alt="Profile" style={styles.profileImg} />
            ) : (
              <div style={styles.initialsAvatar}>
                {userName ? userName.charAt(0).toUpperCase() : 'T'}
              </div>
            )}
          </div>
          <div style={styles.userInfo}>
            <p style={styles.userName}>{userName}</p>
            <p style={styles.userEmail}>{userEmail || 'teacher@zentinel.edu'}</p>
          </div>
        </div>

        {/* NAVIGATION GROUP 1: MAIN */}
        <div style={styles.menuLabel}>MAIN MENU</div>
        <nav style={styles.nav}>
          <button 
            style={isActive('/dashboard') ? styles.activeNavBtn : styles.navBtn} 
            onClick={() => navigate('/dashboard')}
          >
            <LayoutDashboard size={18} style={styles.icon} />
            Overview
          </button>
          
          <button 
            style={isActive('/students') ? styles.activeNavBtn : styles.navBtn} 
            onClick={() => navigate('/students')}
          >
            <Users size={18} style={styles.icon} />
            Student List
          </button>

          <button 
            style={isActive('/records') ? styles.activeNavBtn : styles.navBtn} 
            onClick={() => navigate('/records')}
          >
            <ClipboardList size={18} style={styles.icon} />
            Class Performance
          </button>
        </nav>

        {/* NAVIGATION GROUP 2: CONTENT MANAGEMENT */}
        <div style={styles.menuLabel}>CONTENTS</div>
        <nav style={styles.nav}>
          <button 
            style={isActive('/lessons') ? styles.activeNavBtn : styles.navBtn} 
            onClick={() => navigate('/lessons')}
          >
            <BookOpen size={18} style={styles.icon} />
            Lesson Modules
          </button>

          <button 
            style={isActive('/questions') ? styles.activeNavBtn : styles.navBtn} 
            onClick={() => navigate('/questions')}
          >
            <FileUp size={18} style={styles.icon} />
            Question Bank
          </button>
        </nav>

        {/* NAVIGATION GROUP 3: ACCOUNT */}
        <div style={styles.menuLabel}>ACCOUNT SETTINGS</div>
        <nav style={styles.nav}>
          <button 
            style={isActive('/profile') ? styles.activeNavBtn : styles.navBtn} 
            onClick={() => navigate('/profile')}
          >
            {/* Siguraduhing in-import mo ang 'Settings' o 'User' sa lucide-react */}
            <UserCircle size={18} style={styles.icon} />
            My Profile
          </button>
        </nav>

        {/* FOOTER SECTION */}
        <div style={styles.footer}>
          <button style={styles.logoutBtn} onClick={handleLogout}>
            <LogOut size={18} style={styles.icon} />
            Sign Out
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <main style={styles.mainContent}>
        <div style={styles.contentWrapper}>
          <Outlet />
        </div>
      </main>
    </div>
  );
}

const styles = {
  container: { 
    display: 'flex', 
    minHeight: '100vh', 
    backgroundColor: '#F8FAFC', 
    fontFamily: "'Inter', system-ui, sans-serif" 
  },
  sidebar: { 
    width: '280px', 
    backgroundColor: '#0F172A', 
    color: 'white', 
    display: 'flex', 
    flexDirection: 'column', 
    padding: '0 15px',
    boxShadow: '4px 0 24px rgba(0,0,0,0.15)'
  },
  logoContainer: { 
    padding: '30px 10px', 
    display: 'flex', 
    alignItems: 'center', 
    gap: '12px',
    borderBottom: '1px solid #1E293B'
  },
  logoIcon: {
    backgroundColor: 'transparent',
    padding: '5px',
    borderRadius: '12px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  customLogo: {
    width: '32px',
    height: '32px',
    objectFit: 'contain'
  },
  logoText: { margin: 0, fontSize: '20px', fontWeight: '800', letterSpacing: '1px', color: 'white' },
  logoSubtext: { fontSize: '10px', color: '#64748B', fontWeight: 'bold' },
  
  userSection: {
    margin: '20px 0',
    padding: '15px',
    backgroundColor: '#1E293B',
    borderRadius: '12px',
    display: 'flex',
    alignItems: 'center',
    gap: '12px'
  },
  avatar: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileImg: {
    width: '40px',
    height: '40px',
    borderRadius: '50%', 
    objectFit: 'cover', 
    border: '2px solid #3B82F6' 
  },
  initialsAvatar: {
    width: '40px',
    height: '40px',
    borderRadius: '50%',
    backgroundColor: '#3B82F6', 
    color: 'white',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '18px',
    fontWeight: 'bold',
    boxShadow: '0 2px 5px rgba(0,0,0,0.2)'
  },
  userInfo: { overflow: 'hidden' },
  userName: { margin: 0, fontSize: '13px', fontWeight: 'bold', color: 'white', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
  userEmail: { margin: 0, fontSize: '11px', color: '#94A3B8', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
  
  menuLabel: {
    fontSize: '11px',
    fontWeight: '800',
    color: '#475569',
    padding: '15px 15px 10px 15px',
    letterSpacing: '1.5px'
  },
  nav: { display: 'flex', flexDirection: 'column', gap: '4px' },
  navBtn: { 
    display: 'flex', 
    alignItems: 'center', 
    padding: '12px 15px', 
    backgroundColor: 'transparent', 
    border: 'none', 
    color: '#94A3B8', 
    fontSize: '14px', 
    fontWeight: '500',
    cursor: 'pointer', 
    borderRadius: '10px', 
    transition: 'all 0.3s ease', 
    textAlign: 'left' 
  },
  activeNavBtn: { 
    display: 'flex', 
    alignItems: 'center', 
    padding: '12px 15px', 
    backgroundColor: 'rgba(59, 130, 246, 0.1)', 
    border: 'none', 
    color: '#60A5FA', 
    fontSize: '14px', 
    fontWeight: '700', 
    cursor: 'pointer', 
    borderRadius: '10px', 
    textAlign: 'left',
    boxShadow: 'inset 4px 0 0 #3B82F6' 
  },
  icon: { marginRight: '14px' },
  footer: { 
    marginTop: 'auto',
    padding: '5px 0 5px 0',
    borderTop: '1px solid #1E293B'
  },
  logoutBtn: { 
    display: 'flex', 
    alignItems: 'center', 
    width: '100%', 
    padding: '12px 15px', 
    backgroundColor: 'transparent', 
    border: 'none', 
    color: '#FDA4AF', 
    fontSize: '14px', 
    fontWeight: '600', 
    cursor: 'pointer', 
    borderRadius: '10px',
    transition: '0.2s'
  },
  mainContent: { 
    flex: 1, 
    height: '100vh',
    overflowY: 'auto'
  },
  contentWrapper: {
    padding: '40px',
    maxWidth: '1400px',
    margin: '0 auto'
  }
};