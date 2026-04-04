// src/pages/ManageQuestions.jsx
import { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import Papa from 'papaparse';
import { FileUp, Edit3, Trash2, Eye, X, PlusCircle, CheckCircle, Save } from 'lucide-react';
import AlertModal from '../components/AlertModal';

export default function ManageQuestions() {
  const [fileGroups, setFileGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  // --- MODAL STATES ---
  const [viewingFile, setViewingFile] = useState(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingQuestionId, setEditingQuestionId] = useState(null);
  const [saving, setSaving] = useState(false);

  // --- FORM STATES ---
  const [manualFileName, setManualFileName] = useState('');
  const [manualTimestamp, setManualTimestamp] = useState(''); // Ang magic fix natin kanina!
  const [manualTopic, setManualTopic] = useState('');
  const [manualSubtopic, setManualSubtopic] = useState('');
  const [manualQuestion, setManualQuestion] = useState('');
  const [manualOptA, setManualOptA] = useState('');
  const [manualOptB, setManualOptB] = useState('');
  const [manualOptC, setManualOptC] = useState('');
  const [manualOptD, setManualOptD] = useState('');
  const [manualCorrect, setManualCorrect] = useState('A');
  const [manualDiff, setManualDiff] = useState(0);
  const [manualTime, setManualTime] = useState('20');

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
    fetchQuestions();
  }, []);

  const fetchQuestions = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('evaluation_questions')
        .select('*')
        .eq('teacher_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (data) {
        const grouped = data.reduce((acc, curr) => {
          const fName = curr.file_name || 'Unknown_File.csv';
          if (!acc[fName]) acc[fName] = [];
          acc[fName].push(curr);
          return acc;
        }, {});

        const filesArray = Object.keys(grouped).map(key => ({
          fileName: key,
          questions: grouped[key]
        }));

        setFileGroups(filesArray);
      }
    } catch (error) {
      console.error("Error fetching questions:", error);
    } finally {
      setLoading(false);
    }
  };

  // --- CSV UPLOAD LOGIC (Web Version) ---
  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);
    const fileName = file.name;

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (parsed) => {
        if (parsed.errors.length > 0) {
          // Gagamit na tayo ng showAlert dito
          showAlert('error', 'Parsing Error', 'There was an error reading the CSV file.');
          setUploading(false);
          return;
        }

        try {
          const { data: { user } } = await supabase.auth.getUser();
          const formattedData = parsed.data.map(row => ({
            teacher_id: user.id,
            file_name: fileName,
            topic: row['Topic'] || 'General',
            subtopic: row['Subtopic'] || 'General',
            difficulty: (row['Difficulty'] !== undefined && row['Difficulty'] !== '') ? parseInt(row['Difficulty']) : 0,
            question_text: row['Question'] || '',
            options_raw: `A) ${row['Option A']}, B) ${row['Option B']}, C) ${row['Option C']}, D) ${row['Option D']}`,
            correct_key: row['Correct Answer'] || 'A',
            target_time: parseInt(row['Target Time']) || 20,
          }));

          const { error } = await supabase.from('evaluation_questions').insert(formattedData);
          if (error) throw error;

          // Gagamit na tayo ng showAlert dito
          showAlert('success', 'Upload Success', `${fileName} uploaded successfully!`);
          document.getElementById('csv-upload').value = ""; 
          fetchQuestions();
        } catch (err) {
          console.error(err);
          showAlert('error', 'Upload Failed', 'Failed to save questions to the database.');
        } finally {
          setUploading(false);
        }
      }
    });
  };

  // --- MANUAL QUESTION LOGIC ---
  const handleSaveManualQuestion = async (e) => {
    e.preventDefault();
    if (!manualFileName || !manualTopic || !manualSubtopic || !manualQuestion || !manualOptA || !manualOptB || !manualOptC || !manualOptD || !manualTime) {
      showAlert('info', 'Missing Info', 'Please fill in all the required fields.');
      return;
    }

    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const questionData = {
        teacher_id: user.id,
        file_name: manualFileName,
        topic: manualTopic,
        subtopic: manualSubtopic,
        difficulty: parseInt(manualDiff) || 0,
        question_text: manualQuestion,
        options_raw: `A) ${manualOptA}, B) ${manualOptB}, C) ${manualOptC}, D) ${manualOptD}`,
        correct_key: manualCorrect,
        target_time: parseInt(manualTime) || 20,
      };

      if (isEditMode) {
        const { error } = await supabase.from('evaluation_questions').update(questionData).eq('id', editingQuestionId);
        if (error) throw error;
        showAlert('success', 'Updated', 'Question successfully updated!');
        setIsCreateModalOpen(false);
        setIsEditMode(false);
        setEditingQuestionId(null);
      } else {
        questionData.created_at = manualTimestamp;
        const { error } = await supabase.from('evaluation_questions').insert([questionData]);
        if (error) throw error;
        showAlert('success', 'Added', 'Question successfully added to the quiz!');
      }

      setManualQuestion('');
      setManualOptA(''); setManualOptB(''); setManualOptC(''); setManualOptD('');
      setManualCorrect('A');
      fetchQuestions();

    } catch (error) {
      console.error(error);
      showAlert('error', 'Save Failed', 'Failed to save the question.');
    } finally {
      setSaving(false);
    }
  };

  const openCreateModal = () => {
    setIsEditMode(false);
    setEditingQuestionId(null);
    setManualFileName('');
    setManualTopic(''); setManualSubtopic('');
    setManualQuestion('');
    setManualOptA(''); setManualOptB(''); setManualOptC(''); setManualOptD('');
    
    setManualTimestamp(new Date().toISOString());
    setIsCreateModalOpen(true);
  };

  const openEditModal = (q) => {
    setManualFileName(q.file_name);
    setManualTopic(q.topic);
    setManualSubtopic(q.subtopic);
    setManualQuestion(q.question_text);
    setManualDiff(parseInt(q.difficulty) || 0);
    setManualTime(q.target_time ? q.target_time.toString() : '20');
    setManualCorrect(q.correct_key || 'A');

    const rawChoices = q.options_raw || "";
    const optionsRegex = /A\)\s*(.*?),\s*B\)\s*(.*?),\s*C\)\s*(.*?),\s*D\)\s*(.*)/;
    const match = rawChoices.match(optionsRegex);
    
    if (match) {
      setManualOptA(match[1].trim()); setManualOptB(match[2].trim());
      setManualOptC(match[3].trim()); setManualOptD(match[4].trim());
    }

    setEditingQuestionId(q.id);
    setIsEditMode(true);
    setIsViewModalOpen(false);
    setIsCreateModalOpen(true);
  };

  const handleDeleteSpecificFile = async (fileName) => {
    showAlert('confirm', 'Confirm Delete', `Are you sure you want to delete ALL questions from ${fileName}?`, async () => {
      setLoading(true);
      try {
        const { data: { user } } = await supabase.auth.getUser();
        const { error } = await supabase.from('evaluation_questions').delete().eq('teacher_id', user.id).eq('file_name', fileName);
        if (error) throw error;
        
        showAlert('success', 'Deleted', 'Successfully deleted the file and its questions.');
        fetchQuestions();
      } catch (err) {
        console.error(err);
        showAlert('error', 'Error', 'Failed to delete the file: ' + err.message);
        setLoading(false);
      }
    });
  };

  return (
    <div>
      <h1 style={{ color: '#1F2937', margin: '0 0 20px 0' }}>Manage Quiz Questions</h1>

      {/* ACTION BUTTONS */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '30px' }}>
        
        {/* CSV Upload Card */}
        <div style={{ ...styles.card, backgroundColor: '#ECFDF5', border: '1px solid #A7F3D0' }}>
          <h3 style={{ color: '#065F46', margin: '0 0 10px 0', display: 'flex', alignItems: 'center' }}>
            <FileUp size={20} style={{ marginRight: '8px' }} /> Batch Upload via CSV
          </h3>
          <p style={{ fontSize: '14px', color: '#047857', marginBottom: '15px' }}>Upload multiple questions at once using the standard Excel/CSV template.</p>
          <label style={styles.csvUploadBtn}>
            {uploading ? 'Processing CSV...' : 'Select CSV File'}
            <input 
              id="csv-upload"
              type="file" 
              accept=".csv" 
              onChange={handleFileUpload} 
              style={{ display: 'none' }} 
              disabled={uploading}
            />
          </label>
        </div>

        {/* Manual Create Card */}
        <div style={{ ...styles.card, backgroundColor: '#EFF6FF', border: '1px solid #BFDBFE' }}>
          <h3 style={{ color: '#1E3A8A', margin: '0 0 10px 0', display: 'flex', alignItems: 'center' }}>
            <Edit3 size={20} style={{ marginRight: '8px' }} /> Create Manually
          </h3>
          <p style={{ fontSize: '14px', color: '#1D4ED8', marginBottom: '15px' }}>Type your questions directly into the system to build a quiz.</p>
          <button onClick={openCreateModal} style={styles.createBtn}>
            <PlusCircle size={18} style={{ marginRight: '8px' }} /> Open Quiz Creator
          </button>
        </div>
      </div>

      {/* UPLOADED FILES LIST */}
      <div style={styles.card}>
        <h2 style={{ fontSize: '18px', margin: '0 0 20px 0', color: '#374151' }}>Uploaded Question Banks ({fileGroups.length})</h2>
        
        {loading ? (
          <p style={{ textAlign: 'center', color: '#6B7280' }}>Loading questions...</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            {fileGroups.length === 0 ? (
              <p style={{ textAlign: 'center', color: '#6B7280' }}>No files uploaded yet.</p>
            ) : (
              fileGroups.map((fileObj, index) => (
                <div key={index} style={styles.fileRow}>
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    <div style={styles.fileIcon}><FileUp size={24} color="#60A5FA" /></div>
                    <div>
                      <div style={{ fontWeight: 'bold', color: '#1F2937', fontSize: '16px' }}>{fileObj.fileName}</div>
                      <div style={{ fontSize: '13px', color: '#6B7280', marginTop: '4px' }}>{fileObj.questions.length} total items</div>
                    </div>
                  </div>
                  
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button style={styles.viewBtn} onClick={() => { setViewingFile(fileObj); setIsViewModalOpen(true); }}>
                      <Eye size={16} style={{ marginRight: '5px' }} /> View Items
                    </button>
                    <button style={styles.deleteBtn} onClick={() => handleDeleteSpecificFile(fileObj.fileName)}>
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* --- MODALS --- */}
      
      {/* 1. VIEW FILE MODAL */}
      {isViewModalOpen && viewingFile && (
        <div style={styles.modalOverlay}>
          <div style={{ ...styles.modalContent, maxWidth: '800px' }}>
            <div style={styles.modalHeader}>
              <h2 style={{ margin: 0, fontSize: '20px' }}>{viewingFile.fileName}</h2>
              <button onClick={() => setIsViewModalOpen(false)} style={styles.closeBtn}><X size={24} /></button>
            </div>
            <div style={styles.modalBody}>
              {viewingFile.questions.map((q, index) => (
                <div key={q.id} style={styles.questionCard}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                    <span style={{ fontWeight: 'bold', color: '#60A5FA' }}>Q{index + 1} - {q.subtopic}</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                      <span style={{ fontSize: '12px', fontWeight: 'bold', color: parseInt(q.difficulty) === 2 ? '#EF4444' : parseInt(q.difficulty) === 1 ? '#F59E0B' : '#10B981' }}>
                        {parseInt(q.difficulty) === 0 ? 'EASY' : parseInt(q.difficulty) === 1 ? 'MODERATE' : 'HARD'}
                      </span>
                      <button onClick={() => openEditModal(q)} style={styles.editIconBtn} title="Edit Question"><Edit3 size={16} color="#60A5FA" /></button>
                    </div>
                  </div>
                  <p style={{ fontWeight: 'bold', color: '#374151', margin: '0 0 10px 0' }}>{q.question_text}</p>
                  <p style={{ fontSize: '13px', color: '#6B7280', margin: '0 0 5px 0' }}>Options: {q.options_raw}</p>
                  <p style={{ fontSize: '13px', color: '#10B981', fontWeight: 'bold', margin: 0 }}>Correct: Option {q.correct_key}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 2. CREATE/EDIT QUESTION MODAL */}
      {isCreateModalOpen && (
        <div style={styles.modalOverlay}>
          <div style={{ ...styles.modalContent, maxWidth: '600px' }}>
            <div style={styles.modalHeader}>
              <h2 style={{ margin: 0, fontSize: '20px' }}>{isEditMode ? 'Edit Question' : 'Create New Question'}</h2>
              <button onClick={() => { setIsCreateModalOpen(false); setIsEditMode(false); }} style={styles.closeBtn}><X size={24} /></button>
            </div>
            
            <form onSubmit={handleSaveManualQuestion} style={styles.modalBody}>
              <h3 style={styles.sectionTitle}>1. Quiz Title / File Name</h3>
              <input required value={manualFileName} onChange={(e) => setManualFileName(e.target.value)} placeholder="e.g. Quiz 1 - Quarter 1" style={{...styles.input, fontWeight: 'bold', fontSize: '16px', marginBottom: '20px'}} />

              <h3 style={styles.sectionTitle}>2. Topic Categories</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '20px' }}>
                <input required value={manualTopic} onChange={(e) => setManualTopic(e.target.value)} placeholder="Main Topic" style={styles.input} />
                <input required value={manualSubtopic} onChange={(e) => setManualSubtopic(e.target.value)} placeholder="Subtopic" style={styles.input} />
              </div>

              <h3 style={styles.sectionTitle}>3. Question Details</h3>
              <textarea required value={manualQuestion} onChange={(e) => setManualQuestion(e.target.value)} placeholder="Type your question here..." style={{...styles.input, minHeight: '80px', resize: 'vertical', marginBottom: '15px'}} />
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '15px' }}>
                <input required value={manualOptA} onChange={(e) => setManualOptA(e.target.value)} placeholder="Option A" style={styles.input} />
                <input required value={manualOptB} onChange={(e) => setManualOptB(e.target.value)} placeholder="Option B" style={styles.input} />
                <input required value={manualOptC} onChange={(e) => setManualOptC(e.target.value)} placeholder="Option C" style={styles.input} />
                <input required value={manualOptD} onChange={(e) => setManualOptD(e.target.value)} placeholder="Option D" style={styles.input} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
                <div>
                  <label style={{ fontWeight: 'bold', fontSize: '14px', color: '#374151', display: 'block', marginBottom: '8px' }}>Correct Answer</label>
                  <select value={manualCorrect} onChange={(e) => setManualCorrect(e.target.value)} style={styles.input}>
                    <option value="A">Option A</option>
                    <option value="B">Option B</option>
                    <option value="C">Option C</option>
                    <option value="D">Option D</option>
                  </select>
                </div>
                
                <div>
                  <label style={{ fontWeight: 'bold', fontSize: '14px', color: '#374151', display: 'block', marginBottom: '8px' }}>Difficulty</label>
                  <select value={manualDiff} onChange={(e) => setManualDiff(parseInt(e.target.value))} style={styles.input}>
                    <option value={0}>Easy (0)</option>
                    <option value={1}>Moderate (1)</option>
                    <option value={2}>Hard (2)</option>
                  </select>
                </div>
              </div>

              <div>
                <label style={{ fontWeight: 'bold', fontSize: '14px', color: '#374151', display: 'block', marginBottom: '8px' }}>Target Time (Seconds)</label>
                <input type="number" required value={manualTime} onChange={(e) => setManualTime(e.target.value)} placeholder="20" style={{...styles.input, width: '100px'}} />
              </div>

              <div style={{ marginTop: '30px', display: 'flex', justifyContent: 'flex-end' }}>
                <button type="submit" disabled={saving} style={styles.saveBtn}>
                  {saving ? 'Saving...' : <><Save size={18} style={{ marginRight: '8px' }} /> Save Question</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* ALERT MODAL INTEGRATION */}
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
  card: { backgroundColor: 'white', padding: '25px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' },
  csvUploadBtn: { display: 'inline-block', backgroundColor: '#10B981', color: 'white', padding: '10px 20px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', textAlign: 'center' },
  createBtn: { display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#3B82F6', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', width: '100%' },
  
  fileRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px', backgroundColor: '#F9FAFB', borderRadius: '10px', border: '1px solid #E5E7EB' },
  fileIcon: { backgroundColor: '#EFF6FF', padding: '12px', borderRadius: '10px', marginRight: '15px' },
  viewBtn: { display: 'flex', alignItems: 'center', backgroundColor: 'white', border: '1px solid #D1D5DB', padding: '8px 12px', borderRadius: '6px', cursor: 'pointer', color: '#374151', fontWeight: 'bold' },
  deleteBtn: { display: 'flex', alignItems: 'center', backgroundColor: '#FEE2E2', border: '1px solid #FECACA', padding: '8px', borderRadius: '6px', cursor: 'pointer', color: '#EF4444' },
  
  // Modal Styles
  modalOverlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, padding: '20px' },
  modalContent: { backgroundColor: 'white', borderRadius: '12px', width: '100%', maxHeight: '90vh', display: 'flex', flexDirection: 'column', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)' },
  modalHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 25px', borderBottom: '1px solid #E5E7EB', backgroundColor: '#F9FAFB', borderTopLeftRadius: '12px', borderTopRightRadius: '12px' },
  closeBtn: { background: 'none', border: 'none', cursor: 'pointer', color: '#6B7280' },
  modalBody: { padding: '25px', overflowY: 'auto' },
  
  questionCard: { backgroundColor: '#F9FAFB', border: '1px solid #E5E7EB', borderRadius: '8px', padding: '20px', marginBottom: '15px' },
  editIconBtn: { background: '#EFF6FF', border: '1px solid #BFDBFE', padding: '6px', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center' },
  
  // Form Styles
  sectionTitle: { fontSize: '15px', color: '#60A5FA', margin: '0 0 10px 0', textTransform: 'uppercase' },
  input: { width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #D1D5DB', fontSize: '15px', outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' },
  saveBtn: { display: 'flex', alignItems: 'center', backgroundColor: '#10B981', color: 'white', padding: '12px 24px', borderRadius: '8px', border: 'none', fontSize: '15px', fontWeight: 'bold', cursor: 'pointer' }
};