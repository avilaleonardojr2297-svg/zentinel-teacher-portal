// src/pages/StudentsList.jsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabase';
// Idinagdag ang FileSpreadsheet dito sa import
import { Search, Trash2, CheckCircle, XCircle, FileSpreadsheet } from 'lucide-react';
import * as XLSX from 'xlsx';
import AlertModal from '../components/AlertModal';

export default function StudentsList() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('enrolled');
  const [approvedStudents, setApprovedStudents] = useState([]);
  const [pendingStudents, setPendingStudents] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

    const [alertConfig, setAlertConfig] = useState({
    isOpen: false,
    type: 'info',
    title: '',
    message: '',
    onConfirm: () => {}
    });

    const showAlert = (type, title, message, onConfirm = () => {}) => {
    setAlertConfig({ isOpen: true, type, title, message, onConfirm });
    };

  useEffect(() => {
    fetchStudents();
  }, []);

  const fetchStudents = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, rank, level, teacher_approval_status')
        .eq('role', 'Student')
        .eq('teacher_id', user.id)
        .order('full_name', { ascending: true });

      if (error) throw error;

      setApprovedStudents(data.filter(s => s.teacher_approval_status === 'Approved'));
      setPendingStudents(data.filter(s => s.teacher_approval_status === 'Pending'));
    } catch (error) {
      console.error("Error fetching students:", error);
      alert("Failed to load students.");
    } finally {
      setLoading(false);
    }
  };

  const handleApproval = async (studentId, studentName, status) => {
  const actionText = status === 'Approved' ? 'approve' : 'reject';

    // PALITAN ANG confirm():
    showAlert('confirm', 'Confirm Action', `Are you sure you want to ${actionText} ${studentName}?`, async () => {
        setLoading(true);
        try {
        if (status === 'Approved') {
            await supabase.from('profiles').update({ teacher_approval_status: 'Approved' }).eq('id', studentId);
        } else {
            await supabase.from('profiles').update({ teacher_id: null, teacher_approval_status: 'Pending' }).eq('id', studentId);
        }
        fetchStudents();
        showAlert('success', 'Success!', `Student has been ${status.toLowerCase()}.`); // PALITAN ANG alert()
        } catch (error) {
        showAlert('error', 'Failed', error.message); // PALITAN ANG alert()
        } finally {
        setLoading(false);
        }
    });
  };

  const handleClearClass = async () => {
    if (!window.confirm("Are you sure you want to remove ALL enrolled students from your class?")) return;

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('profiles')
        .update({ teacher_id: null, teacher_approval_status: 'Pending' })
        .eq('teacher_id', user.id)
        .eq('teacher_approval_status', 'Approved');

      if (error) throw error;

      alert("Your class list has been cleared for the new school year.");
      fetchStudents();
    } catch (error) {
      console.error(error);
      alert("Failed to clear the class: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const exportClassRecords = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: results, error } = await supabase
        .from('evaluation_results')
        .select('student_id, topic, subtopic, final_grade, total_correct, total_items, created_at')
        .eq('teacher_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (!results || results.length === 0) {
        alert("No records found to export.");
        return;
      }

      const excelData = results.map(res => {
        const student = approvedStudents.find(s => s.id === res.student_id);
        return {
          "Student Name": student ? student.full_name : "Unknown",
          "Topic": res.topic,
          "Subtopic": res.subtopic,
          "Score": `${res.total_correct} / ${res.total_items}`,
          "Grade (%)": `${res.final_grade}%`,
          "Date Taken": new Date(res.created_at).toLocaleDateString()
        };
      });

      const worksheet = XLSX.utils.json_to_sheet(excelData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Class Records");
      XLSX.writeFile(workbook, `Zentinel_Class_Records_${new Date().toLocaleDateString()}.xlsx`);

    } catch (error) {
      console.error(error);
      alert("Failed to export records: " + error.message);
    }
  };

  const filteredStudents = approvedStudents.filter(student => 
    student.full_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h1 style={{ color: '#1F2937', margin: 0 }}>My Students</h1>

        <div style={{ display: 'flex', gap: '10px' }}>
            {/* EXPORT BUTTON */}
            <button style={styles.successBtn} onClick={exportClassRecords}>
                <FileSpreadsheet size={16} style={{ marginRight: '8px' }} />
                Export to Excel
            </button>

            {approvedStudents.length > 0 && (
                <button style={styles.dangerBtn} onClick={handleClearClass}>
                    <Trash2 size={16} style={{ marginRight: '8px' }} />
                    End of School Year (Clear Class)
                </button>
            )}
        </div>
      </div>

      {/* TABS */}
      <div style={styles.tabContainer}>
        <button 
          style={activeTab === 'enrolled' ? styles.activeTab : styles.tab} 
          onClick={() => setActiveTab('enrolled')}
        >
          Enrolled ({approvedStudents.length})
        </button>
        <button 
          style={activeTab === 'pending' ? styles.activeTab : styles.tab} 
          onClick={() => setActiveTab('pending')}
        >
          Pending Requests {pendingStudents.length > 0 ? `(${pendingStudents.length})` : ''}
        </button>
      </div>

      {/* CONTENT AREA */}
      <div style={styles.card}>
        {loading ? (
          <p style={{ textAlign: 'center', color: '#6B7280' }}>Loading students...</p>
        ) : activeTab === 'enrolled' ? (
          <>
            <div style={styles.searchBar}>
              <Search size={20} color="#9CA3AF" />
              <input 
                type="text" 
                placeholder="Search enrolled student..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={styles.searchInput} 
              />
            </div>
            
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Student Name</th>
                  <th style={styles.th}>Rank</th>
                  <th style={styles.th}>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredStudents.length > 0 ? (
                  filteredStudents.map(student => (
                    <tr key={student.id}>
                      <td style={{...styles.td, fontWeight: 'bold'}}>{student.full_name || "Unknown"}</td>
                      <td style={{...styles.td, color: '#D97706', fontWeight: 'bold'}}>{student.rank || 'Pending'}</td>
                      <td style={styles.td}>
                        <button style={styles.actionBtn} 
                            onClick={() => navigate(`/analytics/${student.id}`, { state: { studentName: student.full_name } })} >
                            View Analytics
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr><td colSpan="3" style={{ textAlign: 'center', padding: '20px', color: '#6B7280' }}>No students found.</td></tr>
                )}
              </tbody>
            </table>
          </>
        ) : (
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Student Name</th>
                <th style={styles.th}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {pendingStudents.length > 0 ? (
                pendingStudents.map(student => (
                  <tr key={student.id}>
                    <td style={{...styles.td, fontWeight: 'bold', color: '#92400E'}}>{student.full_name || "Unknown"}</td>
                    <td style={styles.td}>
                      <div style={{ display: 'flex', gap: '10px' }}>
                        <button style={styles.rejectBtn} onClick={() => handleApproval(student.id, student.full_name, 'Rejected')}>
                          <XCircle size={18} style={{ marginRight: '5px' }} /> Reject
                        </button>
                        <button style={styles.approveBtn} onClick={() => handleApproval(student.id, student.full_name, 'Approved')}>
                          <CheckCircle size={18} style={{ marginRight: '5px' }} /> Approve
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr><td colSpan="2" style={{ textAlign: 'center', padding: '20px', color: '#6B7280' }}>No pending requests.</td></tr>
              )}
            </tbody>
          </table>
        )}
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
  successBtn: { display: 'flex', alignItems: 'center', backgroundColor: '#DCFCE7', color: '#16A34A', border: '1px solid #BBF7D0', padding: '8px 15px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' },
  dangerBtn: { display: 'flex', alignItems: 'center', backgroundColor: '#FEE2E2', color: '#DC2626', border: '1px solid #FECACA', padding: '8px 15px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' },
  tabContainer: { display: 'flex', gap: '10px', marginBottom: '20px' },
  tab: { padding: '10px 20px', border: 'none', backgroundColor: '#E5E7EB', color: '#4B5563', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', transition: '0.2s' },
  activeTab: { padding: '10px 20px', border: 'none', backgroundColor: '#60A5FA', color: 'white', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', transition: '0.2s' },
  card: { backgroundColor: 'white', padding: '25px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' },
  searchBar: { display: 'flex', alignItems: 'center', backgroundColor: '#F9FAFB', padding: '12px 15px', borderRadius: '8px', border: '1px solid #E5E7EB', marginBottom: '20px' },
  searchInput: { border: 'none', backgroundColor: 'transparent', outline: 'none', marginLeft: '10px', width: '100%', fontSize: '15px', color: '#1F2937' },
  table: { width: '100%', borderCollapse: 'collapse' },
  th: { textAlign: 'left', padding: '12px', borderBottom: '2px solid #E5E7EB', color: '#6B7280', fontSize: '14px', textTransform: 'uppercase' },
  td: { padding: '15px 12px', borderBottom: '1px solid #F3F4F6', color: '#1F2937' },
  actionBtn: { backgroundColor: '#F3F4F6', border: '1px solid #D1D5DB', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer', color: '#374151', fontWeight: 'bold', transition: '0.2s' },
  rejectBtn: { display: 'flex', alignItems: 'center', backgroundColor: '#FEE2E2', border: '1px solid #FECACA', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer', color: '#DC2626', fontWeight: 'bold' },
  approveBtn: { display: 'flex', alignItems: 'center', backgroundColor: '#DCFCE7', border: '1px solid #BBF7D0', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer', color: '#16A34A', fontWeight: 'bold' }
};