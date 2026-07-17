import React, { useState, useEffect } from 'react';
import './index.css';

// Frontend API_BASE'i dinamik yapıyoruz (Telefon üzerinden de bağlanabilmek için)
const API_BASE = window.location.hostname === 'localhost' 
  ? 'http://localhost:3001/api' 
  : `http://${window.location.hostname}:3001/api`;

function App() {
  const [view, setView] = useState('login'); // login, home, beach
  const [user, setUser] = useState(null);
  const [selectedBeach, setSelectedBeach] = useState(null);

  // States for Login
  const [username, setUsername] = useState('Sarp');
  const [password, setPassword] = useState('123');
  const [loginError, setLoginError] = useState('');

  // States for Home
  const [searchQuery, setSearchQuery] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API_BASE}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      const data = await res.json();
      if (data.success) {
        setUser(data.username);
        setView('home');
      } else {
        setLoginError(data.message);
      }
    } catch (err) {
      setLoginError('Sunucuya bağlanılamadı. (Node sunucusunun açık olduğundan emin olun)');
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.toLowerCase().includes('yapraklı')) {
      setView('beach');
    } else {
      alert('Şimdilik sadece "Yapraklı Koy" destekleniyor.');
    }
  };

  return (
    <div className="app-container">
      {view === 'login' && (
        <LoginScreen 
          username={username} setUsername={setUsername}
          password={password} setPassword={setPassword}
          handleLogin={handleLogin} loginError={loginError}
        />
      )}
      {view === 'home' && (
        <HomeScreen 
          user={user} 
          onSelectBeach={(placeId) => { setSelectedBeach(placeId); setView('beach'); }} 
        />
      )}
      {view === 'beach' && (
        <BeachScreen user={user} beachInfo={selectedBeach} onBack={() => setView('home')} />
      )}
      
      {/* Global Version Indicator */}
      <div style={{ position: 'fixed', bottom: '10px', right: '10px', fontSize: '12px', color: 'rgba(0,0,0,0.3)', zIndex: 1000, fontWeight: 'bold', pointerEvents: 'none' }}>
        v0.2
      </div>
    </div>
  );
}

function LoginScreen({ username, setUsername, password, setPassword, handleLogin, loginError }) {
  return (
    <div className="screen screen-desktop animate-fade-in" style={{ justifyContent: 'center' }}>
      <div className="login-container">
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <h1 style={{ color: 'var(--primary-color)', fontSize: '42px', marginBottom: '8px' }}>Seaday</h1>
          <p>Deniz gezilerinin rehberi.</p>
        </div>
        
        <div className="card">
        <h2 style={{ marginBottom: '20px' }}>Giriş Yap</h2>
        <form onSubmit={handleLogin}>
          <input 
            type="text" 
            className="input-field" 
            placeholder="Kullanıcı Adı (Örn: Sarp)" 
            value={username} 
            onChange={(e) => setUsername(e.target.value)} 
          />
          <input 
            type="password" 
            className="input-field" 
            placeholder="Şifre" 
            value={password} 
            onChange={(e) => setPassword(e.target.value)} 
          />
          {loginError && <p style={{ color: '#ff3b30', marginBottom: '12px', fontSize: '14px' }}>{loginError}</p>}
          <button type="submit" className="btn">Giriş Yap</button>
        </form>
      </div>
      </div>
    </div>
  );
}

function HomeScreen({ user, onSelectBeach }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    const delayDebounceFn = setTimeout(async () => {
      if (searchQuery.length > 2) {
        setIsSearching(true);
        try {
          const res = await fetch(`${API_BASE}/search?q=${searchQuery}`);
          const data = await res.json();
          if (data.success) {
            setSearchResults(data.results);
          }
        } catch (err) {
          console.error(err);
        }
        setIsSearching(false);
      } else {
        setSearchResults([]);
      }
    }, 500); // 500ms debounce

    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery]);

  return (
    <div className="screen screen-desktop animate-fade-in">
      <div className="header" style={{ justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ fontSize: '24px' }}>Merhaba, {user}</h1>
          <p>Bugün nereye gitmek istersin?</p>
        </div>
        <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: 'var(--primary-color)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
          {user.charAt(0)}
        </div>
      </div>

      <div style={{ marginBottom: '24px', position: 'relative' }}>
        <input 
          type="text" 
          className="input-field" 
          placeholder="Plaj veya koy ara... (Örn: Yapraklı Koy)" 
          value={searchQuery} 
          onChange={(e) => setSearchQuery(e.target.value)} 
        />
        {isSearching && <span style={{ position: 'absolute', right: '15px', top: '15px', fontSize: '12px', color: 'gray' }}>Aranıyor...</span>}
      </div>

      <h3 style={{ marginBottom: '16px' }}>{searchResults.length > 0 ? 'Arama Sonuçları' : 'Önerilenler'}</h3>
      
      <div className="search-results-grid">
        {searchResults.length > 0 ? (
          searchResults.map(result => (
          <div key={result.place_id} className="search-result animate-fade-in" onClick={() => onSelectBeach(result)}>
            <div className="search-info" style={{ padding: '20px' }}>
              <h3 style={{ marginBottom: '4px' }}>{result.name}</h3>
              <p style={{ opacity: 0.8, fontSize: '12px' }}>{result.location}</p>
            </div>
          </div>
        ))
      ) : (
        <div className="search-result" onClick={() => onSelectBeach({place_id: 'mock_yaprakli', name: 'Yapraklı Koy', location: 'Mersin'})}>
          <img src="https://images.unsplash.com/photo-1520050735087-1ed65d9b0273?q=80&w=200&auto=format&fit=crop" alt="Yapraklı Koy" className="search-img" />
          <div className="search-info">
            <h3>Yapraklı Koy (Önerilen)</h3>
            <p>Mersin, Türkiye</p>
          </div>
        </div>
        )}
      </div>
    </div>
  );
}

function BeachScreen({ user, beachInfo, onBack }) {
  const [beachData, setBeachData] = useState(null);
  const [statuses, setStatuses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiSummary, setAiSummary] = useState(null);
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [activeTab, setActiveTab] = useState('summary'); 
  
  const statusOptions = ['Çok Kalabalık', 'Deniz Temiz', 'Dalgalı', 'Kirli', 'Sakin'];

  useEffect(() => {
    const fetchBeach = async () => {
      setLoading(true);
      try {
        const url = new URL(`${API_BASE}/place-details/${beachInfo.place_id}`);
        if (beachInfo.name) url.searchParams.append('name', beachInfo.name);
        if (beachInfo.location) url.searchParams.append('location', beachInfo.location);

        const res = await fetch(url.toString());
        const data = await res.json();
        if(data.success) {
          setBeachData(data.data);
          setAiSummary(data.data.aiSummary);
        }
      } catch (err) {
        console.error(err);
      }
      
      try {
        const res2 = await fetch(`${API_BASE}/status/${beachInfo.place_id}`);
        const statusData = await res2.json();
        setStatuses(statusData);
      } catch (err) {
        console.error(err);
      }
      
      setLoading(false);
    };
    if (beachInfo && beachInfo.place_id) fetchBeach();
  }, [beachInfo]);

  const handleGenerateSummary = async () => {
    setIsAiLoading(true);
    try {
      const res = await fetch(`${API_BASE}/ai-summary`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          name: beachData.name, 
          reviews: beachData.reviews,
          isFreeMode: beachInfo.place_id.startsWith('osm_')
        })
      });
      const data = await res.json();
      setAiSummary(data.summary);
    } catch (err) {
      console.error(err);
      setAiSummary("Yapay zeka özetine erişilemiyor.");
    }
    setIsAiLoading(false);
  };

  const handlePostStatus = async (statusLabel) => {
    try {
      const res = await fetch(`${API_BASE}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: user, beach: beachInfo.place_id, status: statusLabel })
      });
      const data = await res.json();
      if(data.success) {
        setStatuses([data.newStatus, ...statuses]);
      }
    } catch(err) {
      console.error(err);
    }
  };

  if (loading) {
    return (
      <div className="screen animate-fade-in" style={{ justifyContent: 'center', alignItems: 'center' }}>
        <div style={{ width: '40px', height: '40px', border: '3px solid var(--primary-color)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (!beachData) {
    return (
      <div className="screen animate-fade-in">
        <div className="header">
          <button className="back-btn" onClick={onBack}>←</button>
          <h2>Hata</h2>
        </div>
        <p>Veriler yüklenemedi. (Backend sunucusunu çalıştırdığınızdan emin olun)</p>
      </div>
    );
  }

  return (
    <div className="screen screen-desktop animate-fade-in" style={{ padding: 0 }}>
      <div className="beach-desktop-layout" style={{ padding: '24px' }}>
        
        <div className="beach-hero">
          <img src={beachData.image} alt={beachData.name} />
          <button 
            className="back-btn" 
            onClick={onBack} 
            style={{ position: 'absolute', top: '24px', left: '24px', backgroundColor: 'rgba(255,255,255,0.9)', color: 'var(--text-primary)', boxShadow: 'var(--shadow-sm)' }}
          >
            ←
          </button>
        </div>

        <div className="beach-content">
          
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '24px' }}>
          <div>
            <h1 style={{ marginBottom: '4px' }}>{beachData.name}</h1>
            <p style={{ display: 'flex', alignItems: 'center' }}>
              <span style={{ marginRight: '4px' }}>📍</span> {beachData.location}
            </p>
          </div>
          {user === 'admin' && (
            <button 
              className="btn" 
              onClick={() => setShowAdminPanel(true)} 
              style={{ padding: '8px 12px', fontSize: '13px', width: 'auto', backgroundColor: '#333' }}
            >
              🔧 Admin Paneli
            </button>
          )}
        </div>

        <div className="wave-rating-container">
          <p>Güncel Dalga Seviyesi</p>
          <div className="wave-score">{beachData.waveRating}<span style={{fontSize: '24px', fontWeight: 500, opacity: 0.8}}>/10</span></div>
          <p style={{ fontSize: '13px', opacity: 0.9 }}>
            {beachData.waveRating <= 3 ? 'Durgun Deniz' : beachData.waveRating <= 6 ? 'Hafif Dalgalı' : 'Çok Dalgalı'} 
            <span style={{margin: '0 8px'}}>•</span> 
            {beachData.windSpeed} km/s Rüzgar
          </p>
        </div>

        <div className="tabs">
          <div className={`tab ${activeTab === 'summary' ? 'active' : ''}`} onClick={() => setActiveTab('summary')}>AI Özet</div>
          <div className={`tab ${activeTab === 'reviews' ? 'active' : ''}`} onClick={() => setActiveTab('reviews')}>Yorumlar</div>
          <div className={`tab ${activeTab === 'realtime' ? 'active' : ''}`} onClick={() => setActiveTab('realtime')}>Anlık Durum</div>
        </div>

        {activeTab === 'summary' && (
          <div className="card animate-fade-in">
            <h3 style={{ display: 'flex', alignItems: 'center', marginBottom: '12px', color: 'var(--primary-color)' }}>
              <span style={{ fontSize: '20px', marginRight: '8px' }}>✨</span> Gemini Yapay Zeka Özeti
            </h3>
            
            {aiSummary ? (
              <p style={{ color: 'var(--text-primary)', lineHeight: 1.6 }}>{aiSummary}</p>
            ) : isAiLoading ? (
              <div style={{ textAlign: 'center', padding: '20px' }}>
                <div style={{ width: '30px', height: '30px', border: '3px solid var(--primary-color)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 10px' }}></div>
                <p style={{ color: 'var(--text-secondary)' }}>Yapay zeka analiz ediyor...</p>
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '20px' }}>
                <p style={{ color: 'var(--text-secondary)', marginBottom: '16px', lineHeight: 1.5 }}>
                  Bu plaj hakkındaki genel durumu yapay zeka ile özetleyebilirsiniz.
                </p>
                <button className="btn" onClick={handleGenerateSummary} style={{ padding: '10px 20px', display: 'inline-block', width: 'auto' }}>
                  ✨ Özeti Oluştur
                </button>
              </div>
            )}
          </div>
        )}

        {activeTab === 'reviews' && (
          <div className="card animate-fade-in" style={{ padding: '0 20px' }}>
            {beachData.reviews && beachData.reviews.length > 0 ? (
              beachData.reviews.map((r, idx) => (
                <div key={idx} className="review-item">
                  <div className="review-header">
                    {r.profile_photo_url ? 
                      <img src={r.profile_photo_url} className="reviewer-img" alt={r.author} /> : 
                      <div className="reviewer-img"></div>
                    }
                    <div>
                      <div className="reviewer-name">{r.author}</div>
                      <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{'⭐'.repeat(Math.round(r.rating || 5))}</div>
                    </div>
                  </div>
                  <div className="review-text">{r.text}</div>
                </div>
              ))
            ) : (
              <p style={{ padding: '20px 0' }}>Yorum bulunamadı.</p>
            )}
          </div>
        )}

        {activeTab === 'realtime' && (
          <div className="animate-fade-in">
            <div className="card" style={{ marginBottom: '24px' }}>
              <h3>Durum Bildir</h3>
              <p style={{ marginBottom: '16px', fontSize: '13px' }}>Şu an oradaysan diğerlerine bilgi ver:</p>
              <div style={{ display: 'flex', flexWrap: 'wrap' }}>
                {statusOptions.map(opt => (
                  <span key={opt} className="badge" onClick={() => handlePostStatus(opt)}>
                    + {opt}
                  </span>
                ))}
              </div>
            </div>

            <h3 style={{ marginBottom: '16px' }}>Son Bildirimler (Sıcağı Sıcağına)</h3>
            {statuses.length > 0 ? (
              statuses.map((s) => (
                <div key={s.id} className="card" style={{ padding: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                      <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: 'var(--primary-color)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', marginRight: '10px' }}>
                        {s.username.charAt(0)}
                      </div>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '14px' }}>{s.username}</div>
                        <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{new Date(s.timestamp).toLocaleTimeString('tr-TR', {hour: '2-digit', minute:'2-digit'})}</div>
                      </div>
                    </div>
                    <div className="badge active" style={{ margin: 0 }}>{s.status}</div>
                  </div>
                </div>
              ))
            ) : (
              <p>Henüz anlık durum bildirimi yok.</p>
            )}
          </div>
        )}

        </div>
      </div>

      {/* ADMIN PANEL MODAL */}
      {showAdminPanel && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div className="card animate-fade-in" style={{ maxWidth: '400px', width: '100%', position: 'relative' }}>
            <button 
              onClick={() => setShowAdminPanel(false)} 
              style={{ position: 'absolute', top: '15px', right: '15px', background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer' }}
            >
              ✕
            </button>
            <h2 style={{ marginBottom: '16px', color: '#ff9500' }}>🔧 Yönetici Bilgi Paneli</h2>
            <div style={{ fontSize: '14px', lineHeight: 1.6, color: 'var(--text-primary)' }}>
              
              <div style={{ backgroundColor: '#f0f0f5', padding: '12px', borderRadius: '8px', marginBottom: '16px' }}>
                <h3 style={{ margin: '0 0 8px 0', fontSize: '15px' }}>Sunucudan Gelen Veriler:</h3>
                <p style={{ margin: '4px 0' }}>🌊 <strong>Dalga Seviyesi:</strong> {beachData.waveRating} / 10</p>
                <p style={{ margin: '4px 0' }}>💨 <strong>Rüzgar Hızı:</strong> {beachData.windSpeed} km/s</p>
              </div>

              <p style={{ marginBottom: '12px' }}><strong>Bu Değerler Nereden Geliyor?</strong></p>
              <p style={{ marginBottom: '12px' }}>Rüzgar hızı verisi anlık olarak <strong>Open-Meteo API</strong> üzerinden çekilmektedir. Harita sağlayıcısından (OpenStreetMap/Google) alınan <em>Enlem ve Boylam</em> koordinatları kullanılarak o bölgenin canlı rüzgar durumu tespit edilir.</p>
              <p style={{ marginBottom: '12px' }}><strong>Dalga Seviyesi Nasıl Hesaplanıyor?</strong></p>
              <p>Dalga seviyesi (1-10 arası) rüzgar hızına dayalı dinamik bir matematiksel formülle hesaplanmaktadır. 0 km/h rüzgar 1 puan (tamamen durgun), 35+ km/h rüzgar ise 10 puan (çok dalgalı/tehlikeli) olarak ölçeklendirilmiştir.</p>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

export default App;
