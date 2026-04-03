import './Header.css';

function Header({ user, onLogout, onUploadClick }) {
  return (
    <header className="header">
      <div className="header-content">
        <div className="header-left">
          <h1 className="logo">
            <span className="logo-icon">🎵</span>
            Soundboard
          </h1>
        </div>

        <div className="header-right">
          <button className="upload-btn" onClick={onUploadClick}>
            <span>📤</span>
            Upload Sound
          </button>

          <div className="user-menu">
            <img 
              src={user.avatar} 
              alt={user.username}
              className="user-avatar"
            />
            <span className="username">{user.username}</span>
            <button className="logout-btn" onClick={onLogout}>
              Logout
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}

export default Header;