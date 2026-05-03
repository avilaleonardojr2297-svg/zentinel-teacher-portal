// src/pages/ClassRecords.jsx
import { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { ChevronDown, FileSpreadsheet, X } from 'lucide-react';
import * as XLSX from 'xlsx';

export default function ClassRecords() {
  const [loading, setLoading] = useState(true);
  const [classRecords, setClassRecords] = useState({});
  const [availableQuizzes, setAvailableQuizzes] = useState([]);
  const [selectedQuiz, setSelectedQuiz] = useState(null);
  
  // --- BAGO: State for Detailed Breakdown Modal ---
  const [selectedRecordDetails, setSelectedRecordDetails] = useState(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // 1. KUNIN ANG MGA ESTUDYANTE
      const { data: students } = await supabase
        .from('profiles')
        .select('id, full_name')
        .eq('teacher_id', user.id);

      // 2. KUNIN ANG MASTER LIST NG MGA QUIZ + target_time
      const { data: questions } = await supabase
        .from('evaluation_questions')
        .select('topic, subtopic, created_at, target_time')
        .eq('teacher_id', user.id)
        .order('created_at', { ascending: true });

      const masterQuizzes = [];
      const seenBatches = new Set();
      let quizCounter = 1;
      const batchTargetTimes = {};

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
          batchTargetTimes[batchKey] = 0;
        }
        batchTargetTimes[batchKey] += parseInt(q.target_time) || 0;
      });

      // 3. KUNIN ANG LAHAT NG SCORES + time_used_seconds & earned_difficulty
      const { data: results } = await supabase
        .from('evaluation_results')
        .select('student_id, topic, subtopic, final_grade, total_correct, total_items, created_at, time_used_seconds, earned_difficulty, maximum_difficulty')
        .eq('teacher_id', user.id)
        .order('created_at', { ascending: true });

      // 4. I-MATCH ANG SCORES SA MGA QUIZZES AT COMPUTE PERFORMANCE
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
              let performance = 'N/A';
              let perfColor = '#6B7280';
              let perfBg = '#F3F4F6';
              
              const totalTimeGiven = batchTargetTimes[targetQuiz.key];
              const timeUsed = res.time_used_seconds || 0; 
              const scoreRatio = res.total_correct / res.total_items;

              // BEHAVIORAL PERFORMANCE LOGIC
              if (totalTimeGiven > 0) {
                const timeRatio = timeUsed / totalTimeGiven;
                if (timeRatio <= 0.5 && scoreRatio >= 0.75) {
                    performance = 'Excellent';
                    perfColor = '#10B981'; 
                    perfBg = '#D1FAE5';
                } else if (timeRatio >= 0.74 || scoreRatio < 0.5) {
                    performance = 'Struggling';
                    perfColor = '#EF4444'; 
                    perfBg = '#FEE2E2';
                } else {
                    performance = 'Good';
                    perfColor = '#F59E0B'; 
                    perfBg = '#FEF3C7';
                }
              } else {
                if (res.final_grade >= 90) { performance = 'Excellent'; perfColor = '#10B981'; perfBg = '#D1FAE5'; } 
                else if (res.final_grade < 75) { performance = 'Struggling'; perfColor = '#EF4444'; perfBg = '#FEE2E2'; } 
                else { performance = 'Good'; perfColor = '#F59E0B'; perfBg = '#FEF3C7'; }
              }

              // COMPUTATION BREAKDOWN LOGIC
              const baseScorePercent = ((res.total_correct / res.total_items) * 100 * 0.70).toFixed(2);
              const baseTimePercent = totalTimeGiven > 0 ? (Math.max(0, (1 - (timeUsed / totalTimeGiven)) * 100) * 0.15).toFixed(2) : "0.00";
              
              // Use explicit earned_difficulty if it exists in DB, otherwise use reverse computation
              let baseComplexityPercent;
              if (res.earned_difficulty !== null && res.maximum_difficulty !== null) {
                  baseComplexityPercent = ((res.earned_difficulty / res.maximum_difficulty) * 15).toFixed(2);
              } else {
                  baseComplexityPercent = (res.final_grade - parseFloat(baseScorePercent) - parseFloat(baseTimePercent)).toFixed(2);
              }

              groupedData[targetQuiz.key].records.push({
                name: studentInfo ? studentInfo.full_name : 'Unknown Student',
                raw_score: res.total_correct,
                total_items: res.total_items,
                score: `${res.total_correct} / ${res.total_items}`,
                grade: res.final_grade,
                time_used: timeUsed,
                total_time: totalTimeGiven,
                performance: performance,
                perfColor: perfColor,
                perfBg: perfBg,
                breakdown: {
                    scoreWeight: baseScorePercent,
                    timeWeight: baseTimePercent,
                    complexityWeight: baseComplexityPercent
                },
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
    <div style={{ fontFamily: 'sans-serif', position: 'relative' }}>
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
                <th style={styles.th}>Performance</th>
                <th style={styles.th}>Date Taken</th>
              </tr>
            </thead>
            <tbody>
              {classRecords[selectedQuiz.key].records.map((r, i) => (
                <tr 
                  key={i} 
                  style={styles.trHover} 
                  onClick={() => setSelectedRecordDetails(r)}
                  title="Click to view full breakdown"
                >
                  <td style={styles.td}><strong>{r.name}</strong></td>
                  <td style={styles.td}><span style={styles.scoreBadge}>{r.score}</span></td>
                  <td style={{ ...styles.td, color: r.grade >= 75 ? '#10B981' : '#EF4444', fontWeight: 'bold' }}>{r.grade}%</td>
                  <td style={styles.td}>
                    <span style={{ backgroundColor: r.perfBg, color: r.perfColor, padding: '4px 10px', borderRadius: '6px', fontSize: '12px', fontWeight: 'bold', border: `1px solid ${r.perfColor}` }}>
                      {r.performance.toUpperCase()}
                    </span>
                  </td>
                  <td style={{ ...styles.td, color: '#6B7280', fontSize: '14px' }}>{r.date}</td>
                </tr>
              ))}
              {classRecords[selectedQuiz.key].records.length === 0 && (
                <tr><td colSpan="5" style={{ textAlign: 'center', padding: '30px', color: '#9CA3AF' }}>No students have taken this quiz yet.</td></tr>
              )}
            </tbody>
          </table>
        ) : (
          <p>No quiz events found.</p>
        )}
      </div>

      {/* --- DETAILED BREAKDOWN MODAL --- */}
      {selectedRecordDetails && (
        <div style={styles.modalOverlay} onClick={() => setSelectedRecordDetails(null)}>
          <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            
            {/* Modal Header */}
            <div style={{ backgroundColor: selectedRecordDetails.grade >= 75 ? '#3B82F6' : '#EF4444', padding: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'white' }}>
              <div>
                <h2 style={{ margin: 0, fontSize: '20px' }}>{selectedRecordDetails.name}</h2>
                <p style={{ margin: '5px 0 0 0', fontSize: '13px', opacity: 0.9 }}>{selectedQuiz?.label}</p>
              </div>
              <button onClick={() => setSelectedRecordDetails(null)} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer' }}>
                <X size={24} />
              </button>
            </div>

            <div style={{ padding: '25px' }}>
              
              {/* Performance Status */}
              <div style={{ textAlign: 'center', marginBottom: '25px' }}>
                <p style={{ margin: '0 0 5px 0', fontSize: '12px', fontWeight: 'bold', color: '#6B7280', letterSpacing: '1px' }}>BEHAVIORAL PERFORMANCE</p>
                <span style={{ backgroundColor: selectedRecordDetails.perfBg, color: selectedRecordDetails.perfColor, border: `1px solid ${selectedRecordDetails.perfColor}`, padding: '6px 20px', borderRadius: '20px', fontWeight: 'bold', fontSize: '16px' }}>
                  {selectedRecordDetails.performance.toUpperCase()}
                </span>
              </div>

              {/* Raw Stats Cards */}
              <div style={{ display: 'flex', gap: '15px', marginBottom: '25px' }}>
                <div style={{ flex: 1, backgroundColor: '#F3F4F6', padding: '15px', borderRadius: '10px', textAlign: 'center' }}>
                  <p style={{ margin: '0 0 5px 0', fontSize: '11px', fontWeight: 'bold', color: '#6B7280' }}>RAW SCORE</p>
                  <h3 style={{ margin: 0, color: '#3B82F6', fontSize: '20px' }}>{selectedRecordDetails.score}</h3>
                </div>
                <div style={{ flex: 1, backgroundColor: '#F3F4F6', padding: '15px', borderRadius: '10px', textAlign: 'center' }}>
                  <p style={{ margin: '0 0 5px 0', fontSize: '11px', fontWeight: 'bold', color: '#6B7280' }}>TIME USED</p>
                  <h3 style={{ margin: 0, color: '#D97706', fontSize: '20px' }}>{selectedRecordDetails.time_used}s / {selectedRecordDetails.total_time}s</h3>
                </div>
              </div>

              {/* Computation Breakdown */}
              <h3 style={{ fontSize: '14px', color: '#1F2937', marginBottom: '15px', borderBottom: '2px solid #E5E7EB', paddingBottom: '5px' }}>COMPUTATION BREAKDOWN</h3>
              
              <div style={{ backgroundColor: '#EFF6FF', border: '1px solid #BFDBFE', padding: '15px', borderRadius: '8px', marginBottom: '10px' }}>
                <p style={{ margin: '0 0 5px 0', fontWeight: 'bold', color: '#2563EB', fontSize: '13px' }}>1. Score Weight (70%)</p>
                <p style={{ margin: 0, fontSize: '12px', color: '#4B5563' }}>Formula: (Score / Items) * 100 * 0.70</p>
                <p style={{ margin: '5px 0 0 0', fontSize: '12px', color: '#1F2937' }}>Computation: ({selectedRecordDetails.raw_score} / {selectedRecordDetails.total_items}) * 100 * 0.70</p>
                <p style={{ margin: '8px 0 0 0', fontWeight: 'bold', color: '#2563EB', textAlign: 'right' }}>= {selectedRecordDetails.breakdown.scoreWeight}%</p>
              </div>

              <div style={{ backgroundColor: '#FEF3C7', border: '1px solid #FDE68A', padding: '15px', borderRadius: '8px', marginBottom: '10px' }}>
                <p style={{ margin: '0 0 5px 0', fontWeight: 'bold', color: '#D97706', fontSize: '13px' }}>2. Time Efficiency (15%)</p>
                <p style={{ margin: 0, fontSize: '12px', color: '#4B5563' }}>Formula: (1 - (Time Used / Total Time)) * 100 * 0.15</p>
                <p style={{ margin: '5px 0 0 0', fontSize: '12px', color: '#1F2937' }}>Computation: (1 - ({selectedRecordDetails.time_used} / {selectedRecordDetails.total_time})) * 100 * 0.15</p>
                <p style={{ margin: '8px 0 0 0', fontWeight: 'bold', color: '#D97706', textAlign: 'right' }}>= {selectedRecordDetails.breakdown.timeWeight}%</p>
              </div>

              <div style={{ backgroundColor: '#F3F4F6', border: '1px solid #E5E7EB', padding: '15px', borderRadius: '8px', marginBottom: '20px' }}>
                <p style={{ margin: '0 0 5px 0', fontWeight: 'bold', color: '#4B5563', fontSize: '13px' }}>3. AI Complexity Bonus (15%)</p>
                <p style={{ margin: 0, fontSize: '12px', color: '#6B7280' }}>Formula: (Earned Difficulty / Max Difficulty) * 15</p>
                <p style={{ margin: '8px 0 0 0', fontWeight: 'bold', color: '#374151', textAlign: 'right' }}>= {selectedRecordDetails.breakdown.complexityWeight}%</p>
              </div>

              {/* Final Grade Footer */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '2px solid #E5E7EB', paddingTop: '20px' }}>
                <h3 style={{ margin: 0, color: '#1F2937' }}>FINAL GRADE</h3>
                <h2 style={{ margin: 0, color: selectedRecordDetails.grade >= 75 ? '#10B981' : '#EF4444', fontSize: '28px' }}>
                  {selectedRecordDetails.grade}%
                </h2>
              </div>

            </div>
          </div>
        </div>
      )}

    </div>
  );
}

const styles = {
  card: { backgroundColor: 'white', padding: '30px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' },
  select: { width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #D1D5DB', fontSize: '15px', appearance: 'none', cursor: 'pointer', outline: 'none', backgroundColor: '#F9FAFB' },
  table: { width: '100%', borderCollapse: 'collapse' },
  th: { textAlign: 'left', padding: '15px 12px', borderBottom: '2px solid #E5E7EB', color: '#6B7280', fontSize: '13px', textTransform: 'uppercase' },
  td: { padding: '15px 12px', borderBottom: '1px solid #F3F4F6' },
  trHover: { cursor: 'pointer', transition: 'background-color 0.2s', ':hover': { backgroundColor: '#F9FAFB' } }, // Simple hover effect
  scoreBadge: { backgroundColor: '#EFF6FF', color: '#3B82F6', padding: '4px 10px', borderRadius: '6px', fontWeight: 'bold', fontSize: '13px', border: '1px solid #DBEAFE' },
  exportBtn: { display: 'flex', alignItems: 'center', backgroundColor: '#10B981', color: 'white', padding: '10px 20px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontWeight: 'bold' },
  
  // Modal Styles
  modalOverlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0, 0, 0, 0.6)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 },
  modalContent: { backgroundColor: 'white', width: '90%', maxWidth: '450px', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)', maxHeight: '90vh', overflowY: 'auto' }
};
