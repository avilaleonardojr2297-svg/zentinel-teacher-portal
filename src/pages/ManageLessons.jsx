// src/pages/ManageLessons.jsx
import { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { UploadCloud, Search, FileText, Trash2, Eye } from 'lucide-react';
import AlertModal from '../components/AlertModal';

export default function ManageLessons() {
  const [lessons, setLessons] = useState([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Form states
  const [title, setTitle] = useState('');
  const [topic, setTopic] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  
  // Filter/Sort states
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all');

  // --- MODAL STATE ---
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
    fetchLessons(); // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchLessons = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('learning_materials')
        .select('*')
        .eq('teacher_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setLessons(data || []);
    } catch (error) {
      console.error("Error fetching lessons:", error);
      showAlert('error', 'Fetch Failed', 'Failed to load the lessons.');
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    
    if (!title || !topic || !selectedFile) {
      showAlert('info', 'Missing Details', 'Please fill in the Title, Topic, and select a file.');
      return;
    }

    setUploading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not found");

      const cleanFileName = selectedFile.name.replace(/[^a-zA-Z0-9.]/g, '_');
      const filePath = `${user.id}/${Date.now()}_${cleanFileName}`;

      const { error: uploadError } = await supabase.storage
        .from('lesson_files')
        .upload(filePath, selectedFile, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) throw uploadError;

      const { data: publicUrlData } = supabase.storage
        .from('lesson_files')
        .getPublicUrl(filePath);

      const fileUrl = publicUrlData.publicUrl;

      const { error: dbError } = await supabase.from('learning_materials').insert({
        teacher_id: user.id,
        title: title,
        topic: topic,
        file_name: cleanFileName,
        file_url: fileUrl
      });

      if (dbError) throw dbError;

      // SUCCESS ALERT DITO DAPAT NAKALAGAY:
      showAlert('success', 'Upload Successful', 'Successfully uploaded the lesson module.');
      
      setTitle('');
      setTopic('');
      setSelectedFile(null);
      document.getElementById('file-upload').value = ""; 
      fetchLessons();

    } catch (error) {
      console.error("Upload error:", error);
      showAlert('error', 'Upload Failed', error.message);
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id, fileUrl) => {
    showAlert('confirm', 'Delete Lesson', 'Are you sure you want to remove this lesson?', async () => {
      try {
        const pathParts = fileUrl.split('/lesson_files/');
        if (pathParts.length > 1) {
          const filePath = pathParts[1];
          await supabase.storage.from('lesson_files').remove([filePath]);
        }
        const { error } = await supabase.from('learning_materials').delete().eq('id', id);
        if (error) throw error;
        
        fetchLessons();
        showAlert('success', 'Deleted', 'The lesson has been successfully removed.');
      } catch (err) {
        console.error(err);
        showAlert('error', 'Error', 'Failed to delete the lesson.');
      }
    });
  };

  const handleView = (url) => {
    window.open(url, '_blank');
  };

  const getFilteredLessons = () => {
    let filtered = lessons;
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(lesson => 
        lesson.title.toLowerCase().includes(query) || 
        lesson.file_name.toLowerCase().includes(query)
      );
    }
    if (filterType !== 'all') {
      filtered = filtered.filter(lesson => {
        const ext = lesson.file_name.split('.').pop().toLowerCase();
        if (filterType === 'pdf') return ext === 'pdf';
        if (filterType === 'docx') return ext === 'doc' || ext === 'docx';
        if (filterType === 'pptx') return ext === 'ppt' || ext === 'pptx';
        return true;
      });
    }
    return filtered;
  };

  const displayedLessons = getFilteredLessons();

  return (
    <div>
      <h1 style={{ color: '#1F2937', margin: '0 0 20px 0' }}>Manage Lessons</h1>

      <div style={styles.card}>
        <h2 style={{ fontSize: '18px', marginTop: 0, color: '#374151' }}>Upload New Module</h2>
        <form onSubmit={handleUpload} style={styles.formGrid}>
          <div style={styles.inputGroup}>
            <label style={styles.label}>Lesson Title</label>
            <input type="text" required value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Integers" style={styles.input} />
          </div>
          <div style={styles.inputGroup}>
            <label style={styles.label}>Topic Category</label>
            <input type="text" required value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="e.g. Math" style={styles.input} />
          </div>
          <div style={{ ...styles.inputGroup, gridColumn: '1 / -1' }}>
            <label style={styles.label}>Select File (PDF, Word, PPT)</label>
            <div style={styles.fileUploadWrapper}>
              <input id="file-upload" type="file" required accept=".pdf,.doc,.docx,.ppt,.pptx" onChange={handleFileChange} style={styles.fileInput} />
            </div>
          </div>
          <div style={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'flex-end', marginTop: '10px' }}>
            <button type="submit" disabled={uploading} style={styles.uploadBtn}>
              {uploading ? 'Uploading...' : <><UploadCloud size={18} style={{ marginRight: '8px' }} /> Upload Lesson</>}
            </button>
          </div>
        </form>
      </div>

      <div style={{ ...styles.card, marginTop: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '15px' }}>
          <h2 style={{ fontSize: '18px', margin: 0, color: '#374151' }}>Uploaded Lessons ({lessons.length})</h2>
          <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
            {/* IBALIK NATIN ITO PARA MAGAMIT SI setFilterType */}
            <div style={{ display: 'flex', gap: '5px' }}>
            {['all', 'pdf', 'docx', 'pptx'].map(type => (
                <button 
                key={type}
                type="button" // Siguraduhing type button ito
                onClick={() => setFilterType(type)}
                style={filterType === type ? styles.activeChip : styles.chip}
                >
                {type === 'all' ? 'All' : type.toUpperCase()}
                </button>
            ))}
            </div>

            <div style={styles.searchBox}>
            <Search size={18} color="#9CA3AF" />
            <input type="text" placeholder="Search..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} style={styles.searchInput} />
            </div>
        </div>
        </div>

        {loading ? (
          <p style={{ textAlign: 'center', color: '#6B7280' }}>Loading lessons...</p>
        ) : (
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Lesson Detail</th>
                <th style={styles.th}>File Name</th>
                <th style={styles.th}>Date</th>
                <th style={{ ...styles.th, textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {displayedLessons.map(lesson => (
                <tr key={lesson.id}>
                  <td style={styles.td}>
                    <div style={{ fontWeight: 'bold' }}>{lesson.title}</div>
                    <div style={{ fontSize: '12px', color: '#60A5FA' }}>{lesson.topic}</div>
                  </td>
                  <td style={styles.td}>{lesson.file_name}</td>
                  <td style={styles.td}>{new Date(lesson.created_at).toLocaleDateString()}</td>
                  <td style={{ ...styles.td, textAlign: 'right' }}>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                      <button style={styles.iconBtn} onClick={() => handleView(lesson.file_url)}><Eye size={18} color="#3B82F6" /></button>
                      <button style={styles.iconBtnDanger} onClick={() => handleDelete(lesson.id, lesson.file_url)}><Trash2 size={18} color="#EF4444" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* ITO ANG NAWALA KANINA - DAPAT LAGING NASA DULO NG JSX */}
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
  formGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' },
  inputGroup: { display: 'flex', flexDirection: 'column', gap: '8px' },
  label: { color: '#374151', fontWeight: 'bold', fontSize: '14px' },
  input: { padding: '12px', borderRadius: '8px', border: '1px solid #D1D5DB', fontSize: '15px', outline: 'none' },
  fileUploadWrapper: { border: '2px dashed #D1D5DB', borderRadius: '8px', padding: '15px', backgroundColor: '#F9FAFB' },
  fileInput: { width: '100%', cursor: 'pointer' },
  uploadBtn: { backgroundColor: '#60A5FA', color: 'white', padding: '12px 24px', borderRadius: '8px', border: 'none', fontSize: '15px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center' },
  searchBox: { display: 'flex', alignItems: 'center', backgroundColor: '#F9FAFB', padding: '8px 15px', borderRadius: '8px', border: '1px solid #E5E7EB' },
  searchInput: { border: 'none', backgroundColor: 'transparent', outline: 'none', marginLeft: '8px', fontSize: '14px' },
  table: { width: '100%', borderCollapse: 'collapse' },
  th: { textAlign: 'left', padding: '12px', borderBottom: '2px solid #E5E7EB', color: '#6B7280', fontSize: '13px', textTransform: 'uppercase' },
  td: { padding: '15px 12px', borderBottom: '1px solid #F3F4F6' },
  iconBtn: { background: '#EFF6FF', border: 'none', padding: '8px', borderRadius: '6px', cursor: 'pointer' },
  iconBtnDanger: { background: '#FEE2E2', border: 'none', padding: '8px', borderRadius: '6px', cursor: 'pointer' }
};