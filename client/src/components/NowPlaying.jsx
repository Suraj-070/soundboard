import './NowPlaying.css';

function NowPlaying({ sound }) {
  return (
    <div className="now-playing">
      <div className="now-playing-content">
        <div className="now-playing-icon">🔊</div>
        <div className="now-playing-info">
          <div className="now-playing-label">Now Playing</div>
          <div className="now-playing-name">{sound.name}</div>
          <div className="now-playing-category">{sound.category}</div>
        </div>
      </div>
      <div className="now-playing-animation">
        <span></span>
        <span></span>
        <span></span>
      </div>
    </div>
  );
}

export default NowPlaying;