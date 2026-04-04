// src/components/AlertModal.jsx
import { CheckCircle, XCircle, AlertCircle, HelpCircle, X } from 'lucide-react';

export default function AlertModal({ 
  isOpen, 
  type = 'info', // 'success', 'error', 'confirm', 'info'
  title, 
  message, 
  onClose, 
  onConfirm 
}) {
  if (!isOpen) return null;

  // Configuration base sa type
  const config = {
    success: { icon: <CheckCircle size={48} color="#10B981" />, color: '#10B981', btnText: 'Okay' },
    error: { icon: <XCircle size={48} color="#EF4444" />, color: '#EF4444', btnText: 'Close' },
    confirm: { icon: <HelpCircle size={48} color="#3B82F6" />, color: '#3B82F6', btnText: 'Yes, Proceed' },
    info: { icon: <AlertCircle size={48} color="#6B7280" />, color: '#6B7280', btnText: 'Got it' },
  };

  const current = config[type] || config.info;

  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>
        <button onClick={onClose} style={styles.closeIconBtn}><X size={20} /></button>
        
        <div style={styles.iconContainer}>
          {current.icon}
        </div>

        <h2 style={{ ...styles.title, color: current.color }}>{title}</h2>
        <p style={styles.message}>{message}</p>

        <div style={styles.buttonGroup}>
          {type === 'confirm' ? (
            <>
              <button onClick={onClose} style={styles.cancelBtn}>Cancel</button>
              <button 
                onClick={() => { onConfirm(); onClose(); }} 
                style={{ ...styles.actionBtn, backgroundColor: current.color }}
              >
                {current.btnText}
              </button>
            </>
          ) : (
            <button 
              onClick={onClose} 
              style={{ ...styles.actionBtn, backgroundColor: current.color, width: '100%' }}
            >
              {current.btnText}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

const styles = {
  overlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 9999 },
  modal: { backgroundColor: 'white', padding: '30px', borderRadius: '16px', width: '100%', maxWidth: '350px', textAlign: 'center', position: 'relative', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)' },
  closeIconBtn: { position: 'absolute', top: '15px', right: '15px', border: 'none', background: 'none', cursor: 'pointer', color: '#9CA3AF' },
  iconContainer: { marginBottom: '20px', display: 'flex', justifyContent: 'center' },
  title: { margin: '0 0 10px 0', fontSize: '22px', fontWeight: 'bold' },
  message: { margin: '0 0 25px 0', color: '#4B5563', lineHeight: '1.5', fontSize: '15px' },
  buttonGroup: { display: 'flex', gap: '10px', justifyContent: 'center' },
  actionBtn: { border: 'none', color: 'white', padding: '12px 20px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', fontSize: '15px' },
  cancelBtn: { border: '1px solid #D1D5DB', backgroundColor: 'white', color: '#4B5563', padding: '12px 20px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', fontSize: '15px', flex: 1 }
};