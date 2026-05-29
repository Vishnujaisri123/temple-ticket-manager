import { useState, useRef, useEffect } from 'react';
import { uploadAutoPdf } from '../services/api';
import { toast } from './Toast';

const AutoPdfDropzone = ({ onUploadSuccess }) => {
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef();

  const handleFiles = async (files) => {
    const validFiles = Array.from(files).filter(f => f.type === 'application/pdf');
    if (validFiles.length === 0) {
      toast('Please drop only PDF files', 'error');
      return;
    }
    
    setUploading(true);
    
    const uploadPromises = validFiles.map(async (file) => {
      try {
        const fd = new FormData();
        fd.append('pdf', file);
        const { data } = await uploadAutoPdf(fd);
        toast.success(data.message);
        if (onUploadSuccess) onUploadSuccess(data.booking);
      } catch (err) {
        toast.error(`Error uploading ${file.name}: ${err.response?.data?.message || 'Upload failed'}`);
      }
    });

    await Promise.all(uploadPromises);
    
    setUploading(false);
    if (inputRef.current) inputRef.current.value = '';
  };

  const onDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    handleFiles(e.dataTransfer.files);
  };

  useEffect(() => {
    const handlePaste = (e) => {
      if (e.clipboardData && e.clipboardData.files && e.clipboardData.files.length > 0) {
        handleFiles(e.clipboardData.files);
      }
    };
    
    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, []);

  return (
    <div style={{ marginBottom: '1.5rem' }}>
      <div
        style={{
          border: `2px dashed ${dragging ? 'var(--primary-color)' : 'var(--border-color)'}`,
          backgroundColor: dragging ? 'rgba(230, 92, 0, 0.05)' : 'var(--bg-card)',
          borderRadius: '12px',
          padding: '2rem',
          textAlign: 'center',
          cursor: 'pointer',
          transition: 'all 0.2s',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '0.5rem',
          color: 'var(--text-color)'
        }}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        onClick={() => inputRef.current.click()}
      >
        <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>📄</div>
        <h3 style={{ margin: 0, color: 'var(--primary-color)' }}>
          {uploading ? 'Processing PDFs...' : 'Auto-Match PDF Dropzone'}
        </h3>
        <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.9rem' }}>
          Drag & drop, click to select, or press <kbd style={{ background: 'var(--border-color)', padding: '0.1rem 0.3rem', borderRadius: '4px', fontSize: '0.8rem' }}>Ctrl+V</kbd> to paste PDFs.
        </p>
        
        {uploading && (
          <div style={{ width: '100%', maxWidth: '300px', height: '6px', backgroundColor: 'var(--border-color)', borderRadius: '3px', marginTop: '1rem', overflow: 'hidden' }}>
            <div style={{ width: '50%', height: '100%', backgroundColor: 'var(--primary-color)', animation: 'progress 1.5s infinite linear' }} />
          </div>
        )}
      </div>
      <input ref={inputRef} type="file" accept=".pdf" multiple hidden onChange={(e) => handleFiles(e.target.files)} />
      <style>{`
        @keyframes progress {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(200%); }
        }
      `}</style>
    </div>
  );
};

export default AutoPdfDropzone;
