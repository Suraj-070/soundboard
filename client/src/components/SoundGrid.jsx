import './SoundGrid.css';

function SoundGrid({ sounds, onPlay, onDelete }) {
  const formatDuration = (seconds) => {
    if (!seconds) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return '0 KB';
    const kb = bytes / 1024;
    if (kb < 1024) return `${kb.toFixed(1)} KB`;
    const mb = kb / 1024;
    return `${mb.toFixed(1)} MB`;
  };

  return (
    <div className="sound-grid">
      {sounds.map(sound => (
        <div key={sound._id} className="sound-card">
          <div className="sound-card-header">
            <div className="sound-icon">🎵</div>
            <button 
              className="delete-btn"
              onClick={() => onDelete(sound._id)}
              title="Delete sound"
            >
              🗑️
            </button>
          </div>

          <div className="sound-card-body">
            <h3 className="sound-name">{sound.name}</h3>
            <span className="sound-category">{sound.category}</span>
            
            <div className="sound-meta">
              <span className="meta-item">
                ⏱️ {formatDuration(sound.duration)}
              </span>
              <span className="meta-item">
                📦 {formatFileSize(sound.fileSize)}
              </span>
              <span className="meta-item">
                ▶️ {sound.playCount || 0} plays
              </span>
            </div>
          </div>

          <button 
            className="play-btn"
            onClick={() => onPlay(sound._id)}
          >
            <span className="play-icon">▶️</span>
            Play
          </button>
        </div>
      ))}
    </div>
  );
}

export default SoundGrid;