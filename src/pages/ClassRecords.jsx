// src/pages/ClassRecords.jsx
import { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { ClipboardList, ChevronDown, User, CheckCircle2, FileSpreadsheet } from 'lucide-react';
import * as XLSX from 'xlsx';

export default function ClassRecords() {
  const [loading, setLoading] = useState(true);
  const [classRecords, setClassRecords] = useState({});
  const [availableQuizzes, setAvailableQuizzes] = useState([]);
  const [selectedQuiz, setSelectedQuiz] = useState(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // 1. KUNIN ANG MGA ESTUDYANTE (Para sa mapping ng pangalan)
      const { data: students } = await supabase
        .from('profiles')
        .select('id, full_name')
        .eq('teacher_id', user.id);

      // 2. KUNIN ANG MASTER LIST NG MGA QUIZ (Grouping logic base sa mobile code)
      const { data: questions } = await supabase
        .from('evaluation_questions')
        .select('topic, subtopic, created_at')
        .eq('teacher_id', user.id)
        .order('created_at', { ascending: true });

      const masterQuizzes = [];
      const seenBatches = new Set();
      let quizCounter = 1;

      questions?.forEach(q => {
        const batchTime = q.created_at.substring(0, 16); 
        const batchKey = `${q.topic}|${q.subtopic || ''}|${batchTime}`;
        if (!seenBatches.has(batchKey)) {
          seenBatches.add(batchKey);
          masterQuizzes.push({
            topic: q.topic,
            subtopic: q.subtopic,
            key: batchKey,
            label: `Quiz ${quizCounter}: ${q.subtopic || q.topic}`
          });
          quizCounter++;
        }
      });

      // 3. KUNIN ANG LAHAT NG SCORES
      const { data: results } = await supabase
        .from('evaluation_results')
        .select('*')
        .eq('teacher_id', user.id)
        .order('created_at', { ascending: true });

      // 4. I-MATCH ANG SCORES SA MGA QUIZZES
      const groupedData = {};
      masterQuizzes.forEach(mq => {
        groupedData[mq.key] = { ...mq, records: [] };
      });

      if (results) {
        const studentHistory = {};
        results.forEach(res => {
          if (!studentHistory[res.student_id]) studentHistory[res.student_id] = [];
          studentHistory[res.student_id].push(res);
        });

        Object.keys(studentHistory).forEach(studentId => {
          const studentResults = studentHistory[studentId];
          const studentInfo = students?.find(s => s.id === studentId);
          const topicUsage = {}; 

          studentResults.forEach(res => {
            const topicKey = `${res.topic}|${res.subtopic || ''}`;
            if (!topicUsage[topicKey]) topicUsage[topicKey] = 0;
            const matchingQuizzes = masterQuizzes.filter(mq => mq.topic === res.topic && mq.subtopic === res.subtopic);
            const targetQuiz = matchingQuizzes[topicUsage[topicKey]];
            
            if (targetQuiz) {
              groupedData[targetQuiz.key].records.push({
                name: studentInfo ? studentInfo.full_name : 'Unknown Student',
                score: `${res.total_correct} / ${res.total_items}`,
                grade: res.final_grade,
                date: new Date(res.created_at).toLocaleDateString()
              });
              topicUsage[topicKey]++;
            }
          });
        });
      }

      setClassRecords(groupedData);
      setAvailableQuizzes(masterQuizzes);
      if (masterQuizzes.length > 0) setSelectedQuiz(masterQuizzes[masterQuizzes.length - 1]);

    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const exportCurrentToExcel = () => {
    if (!selectedQuiz || !classRecords[selectedQuiz.key].records.length) return;
    const worksheet = XLSX.utils.json_to_sheet(classRecords[selectedQuiz.key].records);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Records");
    XLSX.writeFile(workbook, `${selectedQuiz.label}.xlsx`);
  };

  return (
    <div style={{ fontFamily: 'sans-serif' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
        <h1 style={{ color: '#1F2937', margin: 0 }}>Class Records</h1>
        <button onClick={exportCurrentToExcel} style={styles.exportBtn}>
          <FileSpreadsheet size={18} style={{ marginRight: '8px' }} />
          Export Current Quiz
        </button>
      </div>

      <div style={styles.card}>
        <div style={{ marginBottom: '25px' }}>
          <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '8px', color: '#4B5563' }}>Select Quiz Event:</label>
          <div style={{ position: 'relative', width: '100%', maxWidth: '400px' }}>
            <select 
              style={styles.select}
              value={selectedQuiz?.key || ''}
              onChange={(e) => setSelectedQuiz(availableQuizzes.find(q => q.key === e.target.value))}
            >
              {availableQuizzes.map(q => <option key={q.key} value={q.key}>{q.label}</option>)}
            </select>
            <ChevronDown size={20} style={{ position: 'absolute', right: '12px', top: '12px', pointerEvents: 'none', color: '#9CA3AF' }} />
          </div>
        </div>

        {loading ? (
          <p>Loading records...</p>
        ) : selectedQuiz && classRecords[selectedQuiz.key] ? (
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Student Name</th>
                <th style={styles.th}>Raw Score</th>
                <th style={styles.th}>Final Grade</th>
                <th style={styles.th}>Date Taken</th>
              </tr>
            </thead>
            <tbody>
              {classRecords[selectedQuiz.key].records.map((r, i) => (
                <tr key={i}>
                  <td style={styles.td}><strong>{r.name}</strong></td>
                  <td style={styles.td}><span style={styles.scoreBadge}>{r.score}</span></td>
                  <td style={{ ...styles.td, color: r.grade >= 75 ? '#10B981' : '#EF4444', fontWeight: 'bold' }}>{r.grade}%</td>
                  <td style={{ ...styles.td, color: '#6B7280', fontSize: '14px' }}>{r.date}</td>
                </tr>
              ))}
              {classRecords[selectedQuiz.key].records.length === 0 && (
                <tr><td colSpan="4" style={{ textAlign: 'center', padding: '30px', color: '#9CA3AF' }}>No students have taken this quiz yet.</td></tr>
              )}
            </tbody>
          </table>
        ) : (
          <p>No quiz events found.</p>
        )}
      </div>
    </div>
  );
}

const styles = {
  card: { backgroundColor: 'white', padding: '30px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' },
  select: { width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #D1D5DB', fontSize: '15px', appearance: 'none', cursor: 'pointer', outline: 'none', backgroundColor: '#F9FAFB' },
  table: { width: '100%', borderCollapse: 'collapse' },
  th: { textAlign: 'left', padding: '15px 12px', borderBottom: '2px solid #E5E7EB', color: '#6B7280', fontSize: '13px', textTransform: 'uppercase' },
  td: { padding: '15px 12px', borderBottom: '1px solid #F3F4F6' },
  scoreBadge: { backgroundColor: '#EFF6FF', color: '#3B82F6', padding: '4px 10px', borderRadius: '6px', fontWeight: 'bold', fontSize: '13px', border: '1px solid #DBEAFE' },
  exportBtn: { display: 'flex', alignItems: 'center', backgroundColor: '#10B981', color: 'white', padding: '10px 20px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontWeight: 'bold' }
};