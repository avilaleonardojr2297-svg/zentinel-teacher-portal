// src/pages/ViewAnalytics.jsx
import { useState, useEffect } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { supabase } from '../supabase';
import { ArrowLeft, Award, Clock, Brain, BarChart2, PieChart as PieIcon } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie } from 'recharts';

export default function ViewAnalytics() {
  const { studentId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const studentName = location.state?.studentName || "Student";

  const [loading, setLoading] = useState(true);
  const [pretest, setPretest] = useState(null);
  const [evalHistory, setEvalHistory] = useState([]);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    fetchStudentData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [studentId]);

  const fetchStudentData = async () => {
    setLoading(true);
    try {
      // 1. Fetch Pre-test Results
      const { data: ptData } = await supabase
        .from('pretest_results')
        .select('*')
        .eq('user_id', studentId)
        .maybeSingle();
      setPretest(ptData);

      // 2. Fetch Evaluation History
      const { data: evData } = await supabase
        .from('evaluation_results')
        .select('*')
        .eq('student_id', studentId)
        .order('created_at', { ascending: false });
      setEvalHistory(evData || []);

    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div style={{ padding: '40px' }}>Loading Analytics...</div>;

  return (
    <div>
      {/* Back Button & Header */}
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '25px', gap: '15px' }}>
        <button onClick={() => navigate('/students')} style={styles.backBtn}><ArrowLeft size={20} /></button>
        <h1 style={{ margin: 0, color: '#1F2937' }}>{studentName}'s Performance</h1>
      </div>

      {/* QUICK STATS (Pre-test Highlights) */}
      {pretest && (
        <div style={styles.statsRow}>
          <div style={{ ...styles.statCard, backgroundColor: '#EFF6FF' }}>
            <Award color="#3B82F6" />
            <div>
              <p style={styles.statLabel}>Pre-test Grade</p>
              <h2 style={{ margin: 0, color: '#1E3A8A' }}>{pretest.final_grade}%</h2>
            </div>
          </div>
          <div style={{ ...styles.statCard, backgroundColor: '#F0FDF4' }}>
            <Brain color="#10B981" />
            <div>
              <p style={styles.statLabel}>Initial Placement</p>
              <h2 style={{ margin: 0, color: '#064E3B' }}>{pretest.rank_result}</h2>
            </div>
          </div>
          <div style={{ ...styles.statCard, backgroundColor: '#FFFBEB' }}>
            <Clock color="#F59E0B" />
            <div>
              <p style={styles.statLabel}>Time Used</p>
              <h2 style={{ margin: 0, color: '#78350F' }}>{pretest.time_used_seconds}s</h2>
            </div>
          </div>
        </div>
      )}

      {/* TABS */}
      <div style={styles.tabContainer}>
        <button style={activeTab === 'overview' ? styles.activeTab : styles.tab} onClick={() => setActiveTab('overview')}>Overview Charts</button>
        <button style={activeTab === 'history' ? styles.activeTab : styles.tab} onClick={() => setActiveTab('history')}>Quiz History</button>
      </div>

      {/* CHART CONTENT */}
      <div style={styles.card}>
        {activeTab === 'overview' ? (
          <div style={{ height: '400px' }}>
            <h3 style={{ marginBottom: '20px', color: '#4B5563' }}>Evaluation Mastery per Quiz</h3>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={[...evalHistory].reverse().map((item, idx) => ({ name: `Quiz ${idx+1}`, score: item.final_grade }))}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="score" fill="#60A5FA" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          /* TABLE HISTORY */
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Topic</th>
                <th style={styles.th}>Subtopic</th>
                <th style={styles.th}>Score</th>
                <th style={styles.th}>Mastery</th>
                <th style={styles.th}>AI Recommendation</th>
              </tr>
            </thead>
            <tbody>
              {evalHistory.map((item, idx) => (
                <tr key={idx}>
                  <td style={styles.td}>{item.topic}</td>
                  <td style={styles.td}>{item.subtopic}</td>
                  <td style={{...styles.td, fontWeight: 'bold'}}>{item.final_grade}%</td>
                  <td style={styles.td}>
                    <span style={{ padding: '4px 8px', borderRadius: '12px', fontSize: '12px', backgroundColor: '#F3F4F6' }}>
                      {item.mastery_level}
                    </span>
                  </td>
                  <td style={{...styles.td, fontSize: '13px', color: '#6B7280'}}>{item.ai_recommendation}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

const styles = {
  backBtn: { border: 'none', backgroundColor: 'white', padding: '10px', borderRadius: '50%', cursor: 'pointer', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', display: 'flex', alignItems: 'center' },
  statsRow: { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '20px', marginBottom: '30px' },
  statCard: { padding: '20px', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '20px' },
  statLabel: { margin: 0, fontSize: '14px', color: '#6B7280', fontWeight: '500' },
  tabContainer: { display: 'flex', gap: '10px', marginBottom: '20px' },
  tab: { padding: '10px 25px', border: 'none', backgroundColor: '#E5E7EB', color: '#4B5563', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' },
  activeTab: { padding: '10px 25px', border: 'none', backgroundColor: '#3B82F6', color: 'white', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' },
  card: { backgroundColor: 'white', padding: '30px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' },
  table: { width: '100%', borderCollapse: 'collapse' },
  th: { textAlign: 'left', padding: '12px', borderBottom: '2px solid #E5E7EB', color: '#6B7280', fontSize: '13px' },
  td: { padding: '15px 12px', borderBottom: '1px solid #F3F4F6' }
};