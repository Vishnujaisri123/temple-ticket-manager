import { useState, useRef } from 'react';
import { uploadPdf } from '../services/api';
import { toast } from './Toast';

const UploadCell = ({ booking, onUploaded }) => {
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState(false);
  const inputRef = useRef();

  const handleFile = async (file) => {
    if (!file || file.type !== 'application/pdf') {
      toast('Only PDF files allowed', 'error');
      return;
    }
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('pdf', file);
      fd.append('id', booking._id);
      const { data } = await uploadPdf(fd);
      onUploaded(booking._id, data.booking);
      toast('PDF uploaded successfully');
    } catch (err) {
      toast(err.response?.data?.message || 'Upload failed', 'error');
    } finally {
      setUploading(false);
    }
  };

  const onDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    handleFile(e.dataTransfer.files[0]);
  };

  // Use local URL for in-app preview (works on localhost)
  const previewUrl = booking.localPdfUrl || booking.pdfUrl;

  if (previewUrl) {
    return (
      <>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <button
            className="pdf-link"
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
            onClick={() => setPreview(true)}
          >
            📄 View PDF
          </button>
          <a
            href={previewUrl}
            download
            className="btn btn-sm btn-outline"
            style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem' }}
            title="Download"
          >⬇</a>
          <button
            className="btn btn-sm btn-outline"
            style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem' }}
            title="Replace PDF"
            onClick={() => inputRef.current.click()}
          >↺</button>
        </div>

        {/* PDF Preview Modal */}
        {preview && (
          <div
            style={{
              position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)',
              zIndex: 9999, display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center', padding: '1rem',
            }}
            onClick={() => setPreview(false)}
          >
            <div
              style={{ background: '#fff', borderRadius: '12px', overflow: 'hidden', width: '90%', maxWidth: '900px', height: '90vh', display: 'flex', flexDirection: 'column' }}
              onClick={(e) => e.stopPropagation()}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem 1rem', borderBottom: '1px solid #eee', background: '#b5451b' }}>
                <span style={{ color: '#fff', fontWeight: 600, fontSize: '0.9rem' }}>📄 {booking.member1} — Ticket</span>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <a href={previewUrl} download className="btn btn-sm" style={{ background: '#fff', color: '#b5451b', padding: '0.3rem 0.75rem' }}>⬇ Download</a>
                  <button onClick={() => setPreview(false)} style={{ background: 'rgba(255,255,255,0.2)', border: 'none', color: '#fff', borderRadius: '6px', padding: '0.3rem 0.75rem', cursor: 'pointer', fontWeight: 700 }}>✕</button>
                </div>
              </div>
              <iframe
                src={previewUrl}
                style={{ flex: 1, border: 'none', width: '100%' }}
                title="PDF Preview"
              />
            </div>
          </div>
        )}

        <input ref={inputRef} type="file" accept=".pdf" hidden onChange={(e) => handleFile(e.target.files[0])} />
      </>
    );
  }

  return (
    <div className="upload-cell">
      <div
        className={`drop-zone ${dragging ? 'drag-over' : ''}`}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        onClick={() => inputRef.current.click()}
      >
        <span className="drop-icon">📎</span>
        {uploading ? 'Uploading...' : 'Drop PDF'}
      </div>
      {uploading && (
        <div className="upload-progress">
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: '60%' }} />
          </div>
        </div>
      )}
      <input ref={inputRef} type="file" accept=".pdf" hidden onChange={(e) => handleFile(e.target.files[0])} />
    </div>
  );
};

export default UploadCell;
