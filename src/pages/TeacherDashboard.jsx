// src/pages/TeacherDashboard.jsx
import { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { Users, BookOpen, FileQuestion, TrendingUp } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

export default function TeacherDashboard() {
  const [stats, setStats] = useState({
    studentCount: 0,
    lessonCount: 0,
    quizCount: 0,
    recentActivity: []
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // 1. Bilangin ang Students
      const { count: sCount } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('teacher_id', user.id)
        .eq('role', 'Student')
        .eq('teacher_approval_status', 'Approved');

      // 2. Bilangin ang Lessons
      const { count: lCount } = await supabase
        .from('learning_materials')
        .select('*', { count: 'exact', head: true })
        .eq('teacher_id', user.id);

      // 3. Bilangin ang unique Quizzes (File Names)
      const { data: qData } = await supabase
        .from('evaluation_questions')
        .select('file_name')
        .eq('teacher_id', user.id);
      
      const uniqueQuizzes = new Set(qData?.map(q => q.file_name)).size;

      // 4. Kunin ang activity para sa Chart (Huling 5 days na may results)
      const { data: activityData } = await supabase
        .from('evaluation_results')
        .select('created_at')
        .eq('teacher_id', user.id)
        .order('created_at', { ascending: false })
        .limit(100);

      // I-format ang data para sa Recharts
      const chartMap = {};
      activityData?.forEach(item => {
        const date = new Date(item.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        chartMap[date] = (chartMap[date] || 0) + 1;
      });

      const formattedChartData = Object.keys(chartMap).map(key => ({
        day: key,
        count: chartMap[key]
      })).reverse().slice(-7); // Last 7 active days

      setStats({
        studentCount: sCount || 0,
        lessonCount: lCount || 0,
        quizCount: uniqueQuizzes || 0,
        recentActivity: formattedChartData
      });

    } catch (error) {
      console.error("Dashboard error:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div style={{ padding: '40px', textAlign: 'center' }}>Loading Overview...</div>;

  return (
    <div>
      <h1 style={{ color: '#1F2937', marginBottom: '30px' }}>Dashboard Overview</h1>

      {/* STAT CARDS ROW */}
      <div style={styles.statsRow}>
        <div style={{ ...styles.statCard, borderLeft: '4px solid #60A5FA' }}>
          <div style={styles.statIcon}><Users color="#60A5FA" /></div>
          <div>
            <p style={styles.statLabel}>Enrolled Students</p>
            <h3 style={styles.statNumber}>{stats.studentCount}</h3>
          </div>
        </div>

        <div style={{ ...styles.statCard, borderLeft: '4px solid #10B981' }}>
          <div style={{ ...styles.statIcon, backgroundColor: '#ECFDF5' }}><BookOpen color="#10B981" /></div>
          <div>
            <p style={styles.statLabel}>Lesson Modules</p>
            <h3 style={styles.statNumber}>{stats.lessonCount}</h3>
          </div>
        </div>

        <div style={{ ...styles.statCard, borderLeft: '4px solid #F59E0B' }}>
          <div style={{ ...styles.statIcon, backgroundColor: '#FFFBEB' }}><FileQuestion color="#F59E0B" /></div>
          <div>
            <p style={styles.statLabel}>Quiz Banks</p>
            <h3 style={styles.statNumber}>{stats.quizCount}</h3>
          </div>
        </div>
      </div>
    </div>
  );
}

const styles = {
  statsRow: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px', marginBottom: '30px' },
  statCard: { backgroundColor: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', display: 'flex', alignItems: 'center', gap: '20px' },
  statIcon: { backgroundColor: '#EFF6FF', padding: '12px', borderRadius: '10px' },
  statLabel: { margin: 0, color: '#6B7280', fontSize: '14px', fontWeight: '500' },
  statNumber: { margin: '5px 0 0 0', fontSize: '24px', color: '#1F2937', fontWeight: 'bold' },
  chartContainer: { backgroundColor: 'white', padding: '30px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }
};