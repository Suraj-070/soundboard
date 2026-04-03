import { useState, useEffect } from 'react';
import axios from 'axios';
import { io } from 'socket.io-client';
import Header from './Header';
import SoundGrid from './SoundGrid';
import UploadModal from './UploadModal';
import NowPlaying from './NowPlaying';
import './Dashboard.css';

function Dashboard({ user, onLogout }) {
  const [sounds, setSounds] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [loading, setLoading] = useState(true);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [nowPlaying, setNowPlaying] = useState(null);
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    // Connect to Socket.IO
    const newSocket = io('http://localhost:5000', {
      withCredentials: true,
    });

    newSocket.on('connect', () => {
      console.log('✅ Connected to Socket.IO');
    });

    newSocket.on('now-playing', (data) => {
      console.log('🔊 Now playing:', data);
      setNowPlaying(data);
      
      // Clear after 5 seconds
      setTimeout(() => {
        setNowPlaying(null);
      }, 5000);
    });

    newSocket.on('disconnect', () => {
      console.log('❌ Disconnected from Socket.IO');
    });

    setSocket(newSocket);

    // Cleanup
    return () => {
      newSocket.close();
    };
  }, []);

  useEffect(() => {
    loadSounds();
    loadCategories();
  }, []);

  const loadSounds = async () => {
    try {
      const response = await axios.get('/api/sounds');
      setSounds(response.data);
    } catch (error) {
      console.error('Error loading sounds:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadCategories = async () => {
    try {
      const response = await axios.get('/api/sounds/meta/categories');
      setCategories(response.data);
    } catch (error) {
      console.error('Error loading categories:', error);
    }
  };

  const handlePlaySound = (soundId) => {
    if (!socket) {
      console.error('Socket not connected');
      return;
    }

    socket.emit('play-sound', { soundId });
  };

  const handleUploadSuccess = () => {
    loadSounds();
    loadCategories();
    setShowUploadModal(false);
  };

  const handleDeleteSound = async (soundId) => {
    if (!confirm('Are you sure you want to delete this sound?')) {
      return;
    }

    try {
      await axios.delete(`/api/sounds/${soundId}`);
      loadSounds();
      loadCategories();
    } catch (error) {
      console.error('Error deleting sound:', error);
      alert('Failed to delete sound');
    }
  };

  const filteredSounds = selectedCategory === 'all'
    ? sounds
    : sounds.filter(sound => sound.category === selectedCategory);

  return (
    <div className="dashboard">
      <Header 
        user={user} 
        onLogout={onLogout}
        onUploadClick={() => setShowUploadModal(true)}
      />

      <div className="dashboard-content">
        <aside className="sidebar">
          <div className="sidebar-section">
            <h3>Categories</h3>
            <button
              className={`category-btn ${selectedCategory === 'all' ? 'active' : ''}`}
              onClick={() => setSelectedCategory('all')}
            >
              <span className="category-icon">📚</span>
              All Sounds
              <span className="category-count">{sounds.length}</span>
            </button>

            {categories.map(category => {
              const count = sounds.filter(s => s.category === category).length;
              return (
                <button
                  key={category}
                  className={`category-btn ${selectedCategory === category ? 'active' : ''}`}
                  onClick={() => setSelectedCategory(category)}
                >
                  <span className="category-icon">🎵</span>
                  {category}
                  <span className="category-count">{count}</span>
                </button>
              );
            })}
          </div>

          <div className="sidebar-stats">
            <div className="stat">
              <div className="stat-value">{sounds.length}/100</div>
              <div className="stat-label">Sounds</div>
            </div>
            <div className="stat">
              <div className="stat-value">{categories.length}</div>
              <div className="stat-label">Categories</div>
            </div>
          </div>
        </aside>

        <main className="main-content">
          {nowPlaying && <NowPlaying sound={nowPlaying} />}

          <div className="content-header">
            <h2>
              {selectedCategory === 'all' 
                ? 'All Sounds' 
                : selectedCategory.charAt(0).toUpperCase() + selectedCategory.slice(1)
              }
            </h2>
            <p className="sound-count">{filteredSounds.length} sounds</p>
          </div>

          {loading ? (
            <div className="loading">Loading sounds...</div>
          ) : filteredSounds.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">🎵</div>
              <h3>No sounds yet</h3>
              <p>Upload your first sound to get started!</p>
              <button 
                className="upload-btn-large"
                onClick={() => setShowUploadModal(true)}
              >
                Upload Sound
              </button>
            </div>
          ) : (
            <SoundGrid 
              sounds={filteredSounds}
              onPlay={handlePlaySound}
              onDelete={handleDeleteSound}
            />
          )}
        </main>
      </div>

      {showUploadModal && (
        <UploadModal
          onClose={() => setShowUploadModal(false)}
          onSuccess={handleUploadSuccess}
        />
      )}
    </div>
  );
}

export default Dashboard;