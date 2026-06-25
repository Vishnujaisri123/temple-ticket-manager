import { useState, useEffect, useRef } from 'react';
import { getTempleMedia, uploadTempleVoiceMessage, deleteTempleVoiceMessage } from '../services/api';
import { toast } from '../components/Toast';
import {
  FiSettings,
  FiMusic,
  FiUploadCloud,
  FiTrash2,
  FiActivity,
  FiVolume2,
  FiAlertCircle,
  FiCheckCircle,
} from 'react-icons/fi';

const Settings = () => {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const fileInputRef = useRef(null);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const { data } = await getTempleMedia();
      setSettings(data);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to fetch settings');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check file type - accept audio files
    if (!file.type.startsWith('audio/')) {
      toast.error('Please upload an audio file (e.g., .mp3, .ogg, .wav)');
      return;
    }

    // 15MB size limit
    if (file.size > 15 * 1024 * 1024) {
      toast.error('File size exceeds 15MB limit');
      return;
    }

    const formData = new FormData();
    formData.append('voiceMessage', file);

    setUploading(true);
    const toastId = toast.loading ? toast.loading('Uploading temple voice message...') : null;

    try {
      const { data } = await uploadTempleVoiceMessage(formData);
      setSettings(data);
      if (toastId) toast.dismiss(toastId);
      toast.success('Temple voice message uploaded successfully!');
    } catch (err) {
      if (toastId) toast.dismiss(toastId);
      toast.error(err.response?.data?.message || 'Failed to upload voice message');
    } finally {
      setUploading(false);
      // Reset input value so same file can be uploaded again
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete the global temple voice message? This will stop official WhatsApp Business API deliveries until a new message is uploaded.')) {
      return;
    }

    setDeleting(true);
    const toastId = toast.loading ? toast.loading('Deleting voice message...') : null;

    try {
      const { data } = await deleteTempleVoiceMessage();
      setSettings(data);
      if (toastId) toast.dismiss(toastId);
      toast.success('Temple voice message deleted successfully.');
    } catch (err) {
      if (toastId) toast.dismiss(toastId);
      toast.error(err.response?.data?.message || 'Failed to delete voice message');
    } finally {
      setDeleting(false);
    }
  };

  const triggerFileInput = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
        <FiActivity className="icon-spin" style={{ fontSize: '2.5rem', color: 'var(--primary)', marginBottom: '1rem' }} />
        <div>Loading System Settings...</div>
      </div>
    );
  }

  const voiceMessageUrl = settings?.templeVoiceMessageUrl;
  const voiceMessageFilename = settings?.templeVoiceMessageFilename || 'temple_voice_message.mp3';

  return (
    <div className="settings-container" style={{ maxWidth: '800px', margin: '0 auto', padding: '1rem 0' }}>
      {/* Settings Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1.5rem' }}>
        <FiSettings className="icon-glow" style={{ fontSize: '1.5rem', color: 'var(--primary)' }} />
        <div>
          <h2 style={{ fontSize: '1.3rem', color: 'var(--primary)', margin: 0 }}>System Settings</h2>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0 }}>Configure global communication variables and media assets</p>
        </div>
      </div>

      {/* Main Settings Card */}
      <div className="admin-stat-card" style={{ padding: '1.5rem', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '12px', marginBottom: '2rem' }}>
        <div style={{ borderBottom: '1px solid var(--border)', paddingBottom: '0.75rem', marginBottom: '1.25rem' }}>
          <h3 style={{ fontSize: '1.1rem', color: 'var(--text)', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <FiVolume2 style={{ color: 'var(--accent)' }} /> Temple Media Settings
          </h3>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: '0.25rem 0 0 0' }}>
            Manage files distributed to clients through automated and manual communication
          </p>
        </div>

        {/* Voice Message Sub-section */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <h4 style={{ fontSize: '0.9rem', color: 'var(--text)', margin: '0 0 0.25rem 0', fontWeight: 600 }}>
              Temple Voice Message
            </h4>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0, lineHeight: '1.4' }}>
              This audio file is sent automatically to every customer at the end of the WhatsApp Business API delivery sequence.
              It is also provided for download in the manual browser send options.
            </p>
          </div>

          {/* Hidden File Input */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept="audio/*"
            style={{ display: 'none' }}
          />

          {voiceMessageUrl ? (
            /* Voice Message Configured State */
            <div style={{
              background: 'rgba(59, 130, 246, 0.04)',
              border: '1px solid rgba(59, 130, 246, 0.15)',
              borderRadius: '8px',
              padding: '1.25rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '1rem'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '50%',
                  background: 'rgba(59, 130, 246, 0.1)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--primary)'
                }}>
                  <FiMusic style={{ fontSize: '1.2rem' }} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text)', fontWeight: 600, wordBreak: 'break-all' }}>
                    {voiceMessageFilename}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.25rem', marginTop: '0.15rem' }}>
                    <FiCheckCircle style={{ color: '#22c55e' }} /> Configured & Active
                  </div>
                </div>
              </div>

              {/* HTML5 Audio Player */}
              <div style={{
                background: 'rgba(15, 23, 42, 0.4)',
                border: '1px solid var(--border)',
                borderRadius: '8px',
                padding: '0.5rem'
              }}>
                <audio
                  src={voiceMessageUrl}
                  controls
                  style={{ width: '100%', display: 'block', height: '40px' }}
                />
              </div>

              {/* Controls */}
              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.25rem', flexWrap: 'wrap' }}>
                <button
                  className="btn btn-outline btn-sm"
                  onClick={triggerFileInput}
                  disabled={uploading || deleting}
                  style={{ flex: '1 1 auto', fontSize: '0.8rem', padding: '0.5rem 1rem' }}
                >
                  <FiUploadCloud style={{ marginRight: '0.4rem' }} /> Replace File
                </button>
                <button
                  className="btn btn-danger btn-sm"
                  onClick={handleDelete}
                  disabled={uploading || deleting}
                  style={{
                    flex: '1 1 auto',
                    fontSize: '0.8rem',
                    padding: '0.5rem 1rem',
                    background: 'rgba(239, 68, 68, 0.1)',
                    borderColor: 'rgba(239, 68, 68, 0.3)',
                    color: '#ef4444',
                    boxShadow: 'none'
                  }}
                >
                  <FiTrash2 style={{ marginRight: '0.4rem' }} /> Delete Voice Message
                </button>
              </div>
            </div>
          ) : (
            /* Voice Message Empty State */
            <div
              onClick={triggerFileInput}
              style={{
                border: '2px dashed var(--border)',
                borderRadius: '8px',
                padding: '2.5rem 1.5rem',
                textAlign: 'center',
                cursor: 'pointer',
                background: 'rgba(255, 255, 255, 0.01)',
                transition: 'all 0.2s',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '0.75rem'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = 'var(--primary)';
                e.currentTarget.style.background = 'rgba(59, 130, 246, 0.02)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'var(--border)';
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.01)';
              }}
            >
              <div style={{
                width: '50px',
                height: '50px',
                borderRadius: '50%',
                background: 'rgba(255, 255, 255, 0.03)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--text-muted)',
                fontSize: '1.5rem',
                border: '1px solid var(--border)'
              }}>
                <FiUploadCloud />
              </div>
              <div>
                <div style={{ fontSize: '0.9rem', color: 'var(--text)', fontWeight: 600 }}>
                  Upload Temple Voice Message
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                  Click to select audio file (MP3, OGG, WAV, max 15MB)
                </div>
              </div>
            </div>
          )}

          {/* Configuration Warning Notice */}
          {!voiceMessageUrl && (
            <div style={{
              display: 'flex',
              gap: '0.6rem',
              background: 'rgba(219, 124, 6, 0.05)',
              border: '1px solid rgba(219, 124, 6, 0.2)',
              borderRadius: '8px',
              padding: '0.8rem 1rem',
              marginTop: '0.5rem'
            }}>
              <FiAlertCircle style={{ color: '#D97706', fontSize: '1.1rem', flexShrink: 0, marginTop: '0.1rem' }} />
              <div style={{ fontSize: '0.78rem', color: '#D97706', lineHeight: '1.4' }}>
                <strong>Attention Required:</strong> Since no temple voice message is currently uploaded, official WhatsApp Business API sending features are temporarily disabled. Please upload a voice message file to activate automated deliveries.
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Settings;
