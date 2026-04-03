import { useState } from 'react';
import axios from 'axios';
import './UploadModal.css';

function UploadModal({ onClose, onSuccess }) {
  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    
    if (!selectedFile) return;

    // Validate file type
    if (selectedFile.type !== 'audio/mpeg' && selectedFile.type !== 'audio/mp3') {
      setError('Only MP3 files are allowed');
      return;
    }

    // Validate file size (10MB max)
    if (selectedFile.size > 10 * 1024 * 1024) {
      setError('File size must be less than 10MB');
      return;
    }

    setFile(selectedFile);
    setError('');

    // Auto-fill name if empty
    if (!name) {
      const fileName = selectedFile.name.replace(/\.mp3$/i, '');
      setName(fileName);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!name || !category || !file) {
      setError('Please fill in all fields');
      return;
    }

    setUploading(true);

    try {
      const formData = new FormData();
      formData.append('name', name);
      formData.append('category', category.toLowerCase().trim());
      formData.append('audio', file);

      await axios.post('/api/sounds/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      onSuccess();
    } catch (err) {
      console.error('Upload error:', err);
      setError(err.response?.data?.error || 'Failed to upload sound');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>📤 Upload Sound</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <form onSubmit={handleSubmit} className="upload-form">
          <div className="form-group">
            <label htmlFor="name">Sound Name *</label>
            <input
              type="text"
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Epic Fail"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="category">Category *</label>
            <input
              type="text"
              id="category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="memes"
              required
            />
            <small>Use lowercase (e.g., memes, sfx, music)</small>
          </div>

          <div className="form-group">
            <label htmlFor="file">Audio File (MP3, max 10MB) *</label>
            <div className="file-input-wrapper">
              <input
                type="file"
                id="file"
                accept=".mp3,audio/mpeg"
                onChange={handleFileChange}
                required
              />
              {file && (
                <div className="file-info">
                  ✅ {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
                </div>
              )}
            </div>
          </div>

          {error && <div className="error-message">{error}</div>}

          <div className="modal-actions">
            <button 
              type="button" 
              className="btn-secondary"
              onClick={onClose}
              disabled={uploading}
            >
              Cancel
            </button>
            <button 
              type="submit" 
              className="btn-primary"
              disabled={uploading}
            >
              {uploading ? 'Uploading...' : 'Upload Sound'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default UploadModal;