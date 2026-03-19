import { useState, useEffect } from 'react';
import axios from 'axios';
import {
  TrendingUp, TrendingDown, DollarSign, Activity, Wallet, Target,
  BarChart2, Bell, Shield, ChevronRight, Zap, RefreshCw, AlertTriangle, Briefcase,
  Search, List, ArrowUpRight, ArrowDownRight
} from 'lucide-react';
// Removed supabase for now to prevent crashes
// import { supabase } from './supabaseClient';

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [capital, setCapital] = useState(100000);
  const [riskPerTrade, setRiskPerTrade] = useState(2);
  const [marketData, setMarketData] = useState([]);
  const [newsData, setNewsData] = useState([]);
  const [aiSignals, setAiSignals] = useState([]);
  const [sectors, setSectors] = useState([]);
  const [summaries, setSummaries] = useState({ gainers: [], losers: [], highVolume: [] });
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState('');
  const [marketStatus, setMarketStatus] = useState({ isOpen: false, text: '' });
  const [globalSentiment, setGlobalSentiment] = useState('NEUTRAL');
  const [error, setError] = useState(null);
  const [selectedSector, setSelectedSector] = useState('All');
  const [portfolio, setPortfolio] = useState([]);

  const notifyUser = (title, message) => {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(title, { body: message });
    } else {
      // Fallback for some webviews if Notification API is blocked
      console.log(`[ALERT] ${title}: ${message}`);
      // Only alert if we really need to, otherwise it interrupts the user too much. But for testing, it's fine.
    }
  };

  useEffect(() => {
    if ('Notification' in window && Notification.permission !== 'granted' && Notification.permission !== 'denied') {
      Notification.requestPermission();
    }
  }, []);



  const checkMarketStatus = () => {
    const now = new Date();
    // Convert current time to Sri Lanka Standard Time (UTC+5:30)
    const slstTimeString = now.toLocaleString("en-US", { timeZone: "Asia/Colombo" });
    // Use the localized string to create a new Date object representing SLST relative values
    // To handle timezone precisely without external libraries:
    const utcTime = now.getTime() + (now.getTimezoneOffset() * 60000);
    const slstTime = new Date(utcTime + (3600000 * 5.5));

    const day = slstTime.getDay();
    const hours = slstTime.getHours();
    const minutes = slstTime.getMinutes();

    const timeInMinutes = hours * 60 + minutes;
    const openTime = 9 * 60 + 30; // 9:30 AM
    const closeTime = 14 * 60 + 30; // 2:30 PM

    if (day === 0 || day === 6) {
      setMarketStatus({ isOpen: false, text: 'වෙළඳපොල වසා ඇත (සති අන්තය)' });
    } else if (timeInMinutes >= openTime && timeInMinutes <= closeTime) {
      setMarketStatus({ isOpen: true, text: 'වෙළඳපොල විවෘතයි (ගනුදෙනු සිදුවේ)' });
    } else {
      setMarketStatus({ isOpen: false, text: 'වෙළඳපොල වසා ඇත (වේලාව අවසන්)' });
    }
  };

  const fetchMarketInsights = async (isForced = false) => {
    setLoading(true);
    setError(null);
    const API_BASE = import.meta.env.MODE === 'production' ? '' : 'http://localhost:3001';
    const forceQuery = isForced ? '?force=true' : '';

    try {
      const { data } = await axios.get(`${API_BASE}/api/market${forceQuery}`);
      if (data && data.status === 'success') {
        const fullMarket = data.fullMarket || [];
        setMarketData(fullMarket);
        setAiSignals(data.aiRecommendations || []);
        setSectors(data.sectors || []);
        setSummaries(data.summaries || { gainers: [], losers: [], highVolume: [] });
        setLastUpdated(data.lastUpdated || '');
        setGlobalSentiment(data.globalSentiment || 'NEUTRAL');

        // Check Portfolio for Notifications
        let updatedPortfolio = false;
        const newPortfolio = portfolio.map(trade => {
          const stock = fullMarket.find(s => s.symbol === trade.symbol);
          if (stock) {
            if (trade.targetPrice > 0 && stock.price >= trade.targetPrice && !trade.notifiedTarget) {
              notifyUser('✅ TARGET PRICE HIT!', `${stock.symbol} වෙනුවෙන් ඔයාගේ ලාභ සීමාවට ඇවිත්! (Rs. ${stock.price})`);
              updatedPortfolio = true;
              return { ...trade, notifiedTarget: true };
            }
            if (trade.stopLoss > 0 && stock.price <= trade.stopLoss && !trade.notifiedStop) {
              notifyUser('🚨 STOP LOSS ALERT!', `${stock.symbol} වෙනුවෙන් ඔයාගේ ආරක්ෂිත සීමාව කැඩිලා! (Rs. ${stock.price})`);
              updatedPortfolio = true;
              return { ...trade, notifiedStop: true };
            }
          }
          return trade;
        });

        if (updatedPortfolio) {
          setPortfolio(newPortfolio);
        }
      }

      const newsResponse = await axios.get(`${API_BASE}/api/news`);
      if (newsResponse.data) {
        setNewsData(newsResponse.data);
      }

      /* Supabase logging disabled to prevent 404 crashes
      try {
        if (data && data.aiRecommendations) {
          // await supabase.from('analysis_logs').insert([
          //   { generated_at: new Date(), insights_count: data.aiRecommendations.length }
          // ]);
        }
      } catch (sbErr) {
        console.warn("Supabase logging failed:", sbErr.message);
      }
      */

    } catch (error) {
      console.error("Critical error fetching market data:", error);
      const errorMsg = error.response ?
        `Server Error: ${error.response.status}` :
        (error.request ? "Network Error: Server එකට සම්බන්ධ විය නොහැක (Port 3001)." : error.message);
      setError(`දත්ත ලබා ගැනීමට නොහැකි විය. (${errorMsg})`);
    } finally {
      setLoading(false);
    }
  };

  const fetchPortfolio = async () => {
    try {
      const API_BASE = import.meta.env.MODE === 'production' ? '' : 'http://localhost:3001';
      const { data } = await axios.get(`${API_BASE}/api/portfolio`);
      if (Array.isArray(data)) {
        setPortfolio(data);
      }
    } catch (err) {
      console.error('Error fetching portfolio:', err);
    }
  };

  useEffect(() => {
    let isSubscribed = true;

    const performUpdate = async () => {
      await fetchPortfolio();
      if (isSubscribed) {
        await fetchMarketInsights();
      }
    };

    performUpdate();
    checkMarketStatus();

    const interval = setInterval(performUpdate, 300000);
    const statusInterval = setInterval(checkMarketStatus, 60000);

    return () => {
      isSubscribed = false;
      clearInterval(interval);
      clearInterval(statusInterval);
    };
  }, []);

  const calculateAllocation = (signal) => {
    const riskAmount = capital * (riskPerTrade / 100);
    const riskPerShare = Math.abs(signal.currentPrice - signal.stopLoss);
    if (riskPerShare === 0 || isNaN(riskPerShare)) return { shares: 0, totalInvestment: 0, potentialProfit: 0, riskAmount: 0 };

    const shares = Math.floor(riskAmount / riskPerShare);
    const totalInvestment = shares * signal.currentPrice;
    const potentialProfit = shares * Math.abs(signal.targetPrice - signal.currentPrice);
    return { shares, totalInvestment, potentialProfit, riskAmount };
  };

  const LiveTicker = () => (
    <div className="ticker-wrap">
      <div className="ticker">
        {marketData.slice(0, 20).map((s, i) => (
          <div key={i} className="ticker-item">
            <span className="ticker-symbol">{s.symbol}</span>
            <span className="ticker-price">Rs. {s.price.toFixed(2)}</span>
            <span className={s.percentageChange >= 0 ? 'text-success' : 'text-danger'}>
              {s.percentageChange >= 0 ? '▲' : '▼'} {Math.abs(s.percentageChange).toFixed(2)}%
            </span>
          </div>
        ))}
        {/* Duplicate for seamless scrolling */}
        {marketData.slice(0, 20).map((s, i) => (
          <div key={`dup-${i}`} className="ticker-item">
            <span className="ticker-symbol">{s.symbol}</span>
            <span className="ticker-price">Rs. {s.price.toFixed(2)}</span>
            <span className={s.percentageChange >= 0 ? 'text-success' : 'text-danger'}>
              {s.percentageChange >= 0 ? '▲' : '▼'} {Math.abs(s.percentageChange).toFixed(2)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );

  const renderDashboard = () => (
    <div className="animate-fade-in">
      <LiveTicker />
      <div className="flex-between mb-4 mt-4" style={{ flexWrap: 'wrap', gap: '1rem', alignItems: 'flex-start' }}>
        <div style={{ flex: '1 1 300px' }}>
          <h1 className="mb-2">අද දවසේ වෙළඳපොල තත්වය <span className="emoji">🚀</span></h1>
          <p className="text-muted">කොළඹ කොටස් වෙළඳපොලේ (CSE) කොටස් පිළිබඳ විශ්ලේෂණ අනෙක් අයට පෙර මෙතනින් බලන්න.</p>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '0.5rem', flex: '1 1 auto' }}>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <div className={`badge ${globalSentiment === 'NEGATIVE' ? 'badge-danger' : 'badge-success'}`}>
              SENTIMENT: {globalSentiment === 'NEGATIVE' ? '🔴 BEARISH (පහත වැටේ)' : '🟢 BULLISH (ස්ථාවරයි)'}
            </div>
            <div className={`badge ${marketStatus.isOpen ? 'badge-success' : 'badge-danger'}`}>
              {marketStatus.text}
            </div>
          </div>
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap', width: '100%' }}>
            {lastUpdated && <span className="text-muted" style={{ fontSize: '0.75rem' }}>අවසන් යාවත්කාලීන කිරීම: {lastUpdated}</span>}
            <button className="btn btn-icon" onClick={() => fetchMarketInsights(true)} disabled={loading} style={{ padding: '0.5rem 1rem', fontSize: '0.8rem' }}>
              <RefreshCw size={16} className={loading ? "spin" : ""} /> යාවත්කාලීන කරන්න
            </button>
          </div>
        </div>
      </div>

      {/* Market Breadth Indicator */}
      <div className="glass-card mb-4" style={{ background: 'linear-gradient(90deg, rgba(247, 37, 133, 0.05) 0%, rgba(0, 245, 212, 0.05) 100%)' }}>
        <div className="flex-between">
          <div style={{ flex: 1 }}>
            <h4 className="text-muted" style={{ fontSize: '0.8rem', textTransform: 'uppercase' }}>Market Breadth (A/D Ratio)</h4>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginTop: '0.5rem' }}>
              <div style={{ flex: 1, height: '8px', background: 'rgba(255,255,255,0.05)', borderRadius: '4px', overflow: 'hidden', display: 'flex' }}>
                <div style={{ width: `${(summaries.counts?.gainers / ((summaries.counts?.gainers + summaries.counts?.losers) || 1) * 100) || 50}%`, background: 'var(--success)', height: '100%' }}></div>
                <div style={{ width: `${(summaries.counts?.losers / ((summaries.counts?.gainers + summaries.counts?.losers) || 1) * 100) || 50}%`, background: 'var(--danger)', height: '100%' }}></div>
              </div>
              <div style={{ fontSize: '0.9rem', fontWeight: 'bold' }}>
                <span className="text-success">{summaries.counts?.gainers || 0} ↑</span> / <span className="text-danger">{summaries.counts?.losers || 0} ↓</span>
              </div>
            </div>
          </div>
          <div style={{ marginLeft: '2rem', textAlign: 'right' }}>
            <div className="text-muted" style={{ fontSize: '0.7rem' }}>MARKET STATUS</div>
            <div style={{ fontSize: '1.2rem', fontWeight: 'bold' }} className={globalSentiment === 'NEGATIVE' ? 'text-danger' : 'text-success'}>
              {globalSentiment === 'NEGATIVE' ? 'Market is Down' : 'Market is Healthy'}
            </div>
          </div>
        </div>
      </div>

      <div className="grid-3 mb-4">
        {/* Gainers Summary */}
        <div className="glass-card" style={{ borderTop: '4px solid var(--success)' }}>
          <h4 className="flex-center gap-2 mb-3" style={{ justifyContent: 'flex-start' }}>
            <TrendingUp size={18} className="text-success" /> වැඩිපුරම මිල ඉහළ ගිය (Gainers)
          </h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {summaries.gainers.map((s, idx) => (
              <div key={idx} className="flex-between p-2" style={{ background: 'rgba(255,255,255,0.02)', borderRadius: '6px' }}>
                <span style={{ fontSize: '0.85rem' }}>{s.symbol}</span>
                <span className="text-success" style={{ fontWeight: 'bold', fontSize: '0.85rem' }}>+{s.percentageChange.toFixed(2)}%</span>
              </div>
            ))}
          </div>
        </div>

        {/* Losers Summary */}
        <div className="glass-card" style={{ borderTop: '4px solid var(--danger)' }}>
          <h4 className="flex-center gap-2 mb-3" style={{ justifyContent: 'flex-start' }}>
            <TrendingDown size={18} className="text-danger" /> වැඩිපුරම මිල අඩු වූ (Losers)
          </h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {summaries.losers.map((s, idx) => (
              <div key={idx} className="flex-between p-2" style={{ background: 'rgba(255,255,255,0.02)', borderRadius: '6px' }}>
                <span style={{ fontSize: '0.85rem' }}>{s.symbol}</span>
                <span className="text-danger" style={{ fontWeight: 'bold', fontSize: '0.85rem' }}>{s.percentageChange.toFixed(2)}%</span>
              </div>
            ))}
          </div>
        </div>

        {/* High Volume Summary */}
        <div className="glass-card" style={{ borderTop: '4px solid var(--primary)' }}>
          <h4 className="flex-center gap-2 mb-3" style={{ justifyContent: 'flex-start' }}>
            <Activity size={18} className="text-primary" /> වැඩිම ගනුදෙනු (High Volume)
          </h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {summaries.highVolume.map((s, idx) => (
              <div key={idx} className="flex-between p-2" style={{ background: 'rgba(255,255,255,0.02)', borderRadius: '6px' }}>
                <span style={{ fontSize: '0.85rem' }}>{s.symbol}</span>
                <span className="text-primary" style={{ fontWeight: 'bold', fontSize: '0.85rem' }}>Rs. {(s.turnover / 1000000).toFixed(1)}M</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid-3 mb-4">
        <div className="glass-card" style={{ border: '1px solid var(--success-glow)' }}>
          <div className="flex-between mb-2">
            <h4 className="text-success">විශේෂිතම කොටස (Top Pick)</h4>
            <div className="btn-icon bg-success"><Zap size={20} className="text-success" /></div>
          </div>
          {aiSignals.length > 0 ? (
            <>
              <div className="stat-value text-success">{aiSignals[0].name} ({aiSignals[0].symbol})</div>
              <div className="badge badge-success mb-2">{aiSignals[0].action}</div>
              <p className="text-muted" style={{ fontSize: '0.85rem' }}>{aiSignals[0].reason}</p>
            </>
          ) : <p>Loading...</p>}
        </div>

        <div className="glass-card" style={{ gridColumn: 'span 2' }}>
          <h4 className="text-muted mb-4">🌍 ලෝකෙ වෙළඳපොලට බලපාන සැබෑ පුවත් (Global Market News)</h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
            {newsData.length === 0 ? <p className="text-muted p-4">පුවත් පූරණය වෙමින් පවතී...</p> :
              newsData.slice(0, 8).map((news) => {
                const isHighImpact = news.marketRelevance === 'HIGH';
                const typeColor = news.type === 'LOCAL' ? '#00f5d4' : news.type === 'REGIONAL' ? '#f7a432' : '#a78bfa';
                const typeName = news.type === 'LOCAL' ? '🇱🇰 LOCAL' : news.type === 'REGIONAL' ? '🌏 REGIONAL' : '🌍 GLOBAL';
                return (
                  <div key={news.id} style={{
                    display: 'flex', alignItems: 'flex-start', gap: '1rem', padding: '0.9rem',
                    background: isHighImpact ? (news.impact === 'NEGATIVE' ? 'rgba(247,37,133,0.08)' : 'rgba(0,245,212,0.06)') : 'rgba(255,255,255,0.02)',
                    borderRadius: '8px',
                    border: isHighImpact ? `1px solid ${news.impact === 'NEGATIVE' ? 'rgba(247,37,133,0.4)' : 'rgba(0,245,212,0.35)'}` : '1px solid transparent',
                    borderLeft: `4px solid ${news.impact === 'NEGATIVE' ? 'var(--danger)' : news.impact === 'POSITIVE' ? 'var(--success)' : 'var(--border-light)'}`
                  }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', minWidth: '28px' }}>
                      <div className={`btn-icon ${news.impact === 'NEGATIVE' ? 'bg-danger' : news.impact === 'POSITIVE' ? 'bg-success' : ''}`} style={{ width: '28px', height: '28px' }}>
                        <Activity size={14} />
                      </div>
                      {isHighImpact && <span style={{ fontSize: '0.55rem', background: 'rgba(255,200,0,0.2)', color: '#ffd700', padding: '1px 4px', borderRadius: '3px', fontWeight: 'bold' }}>HOT</span>}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap', marginBottom: '4px' }}>
                        <span style={{ fontSize: '0.58rem', padding: '1px 5px', borderRadius: '3px', background: `${typeColor}22`, color: typeColor, fontWeight: 'bold', border: `1px solid ${typeColor}44` }}>{typeName}</span>
                        <span className="badge" style={{ fontSize: '0.58rem', padding: '1px 5px', background: 'var(--primary-glow)', color: 'var(--primary)' }}>{news.source}</span>
                        <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>{news.date}</span>
                      </div>
                      <strong style={{ fontSize: '0.88rem', display: 'block', lineHeight: '1.3' }}>{news.title}</strong>
                    </div>
                    <div style={{ textAlign: 'right', minWidth: '80px' }}>
                      <div className={`text-${news.impact === 'NEGATIVE' ? 'danger' : news.impact === 'POSITIVE' ? 'success' : 'muted'}`} style={{ fontSize: '0.65rem', fontWeight: 'bold' }}>
                        {news.impact === 'NEGATIVE' ? '🔴 NEGATIVE' : news.impact === 'POSITIVE' ? '🟢 POSITIVE' : '⚪ NEUTRAL'}
                      </div>
                    </div>
                  </div>
                );
              })
            }
          </div>
        </div>
      </div>

      <div className="glass-card mb-4" style={{ background: 'linear-gradient(90deg, rgba(37, 99, 235, 0.1) 0%, rgba(0,0,0,0) 100%)' }}>
        <h4 className="mb-3 flex-center gap-2" style={{ justifyContent: 'flex-start' }}><Shield size={20} className="text-primary" /> Wealthy Minds Expert Strategy (Advanced Analysis)</h4>
        <div className="grid-3">
          <div className="p-3">
            <strong className="text-primary">01. Fundamental First</strong>
            <p className="text-muted" style={{ fontSize: '0.8rem' }}>මුලින්ම සමාගමේ ලාභය (Profit) සහ වත්කම් (Assets) පරීක්ෂා කරන්න. AI මගින් දැන් මේවා ස්වයංක්‍රීයව පරීක්ෂා කරයි.</p>
          </div>
          <div className="p-3">
            <strong className="text-primary">02. Safety Over Greed</strong>
            <p className="text-muted" style={{ fontSize: '0.8rem' }}>අඩු Safety Score ඇති කොටස් වලින් වළකින්න. විශාල සමාගම් (Blue Chip) සැමවිටම ආරක්ෂිතයි.</p>
          </div>
          <div className="p-3">
            <strong className="text-primary">03. Market News Impact</strong>
            <p className="text-muted" style={{ fontSize: '0.8rem' }}>වෙළඳපොල පුවත් සහ ගෝලීය තත්වයන් ඔබේ ආයෝජන තීරණ වලට ඍජුවම බලපාන බව මතක තබා ගන්න.</p>
          </div>
        </div>
      </div>

      <h3 className="mb-2 mt-4 text-primary">කොටස් මිලදී ගැනීමේ සහ විකිණීමේ තීරණ</h3>
      <p className="text-muted mb-4">මෘදුකාංගය මගින් විශ්ලේෂණය කර ලබා දෙන තීරණ (AI Predictions):</p>

      <div className="grid-layout mt-4">
        {aiSignals.map((signal, idx) => (
          <div key={idx} className="glass-card" style={{ borderLeft: signal.action.includes('BUY') ? '4px solid var(--success)' : signal.action.includes('SELL') ? '4px solid var(--danger)' : '4px solid var(--warning)' }}>
            <div className="flex-between mb-2">
              <h3 style={{ fontWeight: 800 }}>{signal.name} <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{signal.symbol}</span></h3>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <div className="text-right mr-2">
                  <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)' }}>SAFETY SCORE</div>
                  <strong className={signal.safetyScore > 70 ? 'text-success' : 'text-warning'}>{signal.safetyScore}%</strong>
                </div>
                <span className={`badge ${signal.action.includes('මිලදී') ? 'badge-success' : signal.action.includes('විකුණන්න') ? 'badge-danger' : 'badge-warning'}`}>{signal.action}</span>
              </div>
            </div>

            <p className="text-muted mb-4" style={{ fontSize: '0.9rem' }}>{signal.rationale}</p>

            <div className="res-grid-3" style={{ background: 'rgba(0,0,0,0.3)', padding: '1rem', borderRadius: '8px' }}>
              <div>
                <span className="text-muted" style={{ fontSize: '0.7rem' }}>දැනට පවතින මිල</span><br />
                <strong>Rs {Number(signal.currentPrice || 0).toFixed(2)}</strong>
              </div>
              <div>
                <span className="text-muted" style={{ fontSize: '0.7rem' }}>බලාපොරොත්තු විය හැකි මිල</span><br />
                <strong className="text-success">Rs {Number(signal.targetPrice || 0).toFixed(2)}</strong>
              </div>
              <div>
                <span className="text-muted" style={{ fontSize: '0.7rem' }}>ආරක්ෂිත මිල (Stop Loss)</span><br />
                <strong className="text-danger">Rs {Number(signal.stopLoss || 0).toFixed(2)}</strong>
              </div>
            </div>

            <button className="btn btn-primary mt-4" style={{ width: '100%' }} onClick={() => setActiveTab('allocator')}>
              ගණනය කරන්න <ChevronRight size={16} />
            </button>
          </div>
        ))}
      </div>

    </div>
  );

  const renderMarketWatch = () => {

    // Sort all stocks alphabetically or by turnover for realism
    const sortedMarket = [...marketData].sort((a, b) => b.turnover - a.turnover);

    const filteredStocks = sortedMarket.filter(s => {
      const matchesSearch = s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.symbol.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesSector = selectedSector === 'All' || s.sector === selectedSector; // We might need to add sector to stock model
      return matchesSearch && matchesSector;
    });

    return (
      <div className="animate-fade-in">
        <LiveTicker />
        <div className="flex-between mb-4 mt-4" style={{ flexWrap: 'wrap', gap: '1rem', alignItems: 'flex-start' }}>
          <div style={{ flex: '1 1 300px' }}>
            <h1 className="mb-2">සම්පූර්ණ වෙළඳපොල (Market Watch) <span className="emoji">📊</span></h1>
            <p className="text-muted">කොළඹ කොටස් වෙළඳපොලේ සියලුම කොටස්වල තොරතුරු මෙතැනින් පරීක්ෂා කරන්න.</p>
          </div>
          <div style={{ position: 'relative', width: '100%', maxWidth: '300px', flex: '1 1 auto' }}>
            <Search style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} size={18} />
            <input
              type="text"
              placeholder="කොටසෙහි නම හෝ සලකුණ සොයන්න..."
              className="input-field"
              style={{ paddingLeft: '40px', marginBottom: 0 }}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
          <div className="table-container" style={{ maxHeight: '70vh' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '600px' }}>
              <thead style={{ position: 'sticky', top: 0, background: 'var(--card-bg)', zIndex: 1, borderBottom: '1px solid var(--border-light)' }}>
                <tr>
                  <th style={{ padding: '1.2rem' }}>කොටස (Stock)</th>
                  <th style={{ padding: '1.2rem' }}>මිල (Price)</th>
                  <th className="hide-mobile" style={{ padding: '1.2rem' }}>වෙනස (Change)</th>
                  <th style={{ padding: '1.2rem' }}>ප්‍රතිශතය (%)</th>
                  <th className="hide-mobile" style={{ padding: '1.2rem' }}>පරිමාව (Turnover)</th>
                  <th style={{ padding: '1.2rem' }}></th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan="6" style={{ textAlign: 'center', padding: '3rem', color: 'var(--primary)' }}>දත්ත පූරණය වෙමින් පවතී... <RefreshCw size={20} className="spin" /></td></tr>
                ) : error ? (
                  <tr><td colSpan="6" style={{ textAlign: 'center', padding: '3rem', color: 'var(--danger)' }}>{error}</td></tr>
                ) : filteredStocks.length === 0 ? (
                  <tr><td colSpan="6" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>දත්ත සොයාගත නොහැක. කරුණාකර නැවත උත්සාහ කරන්න.</td></tr>
                ) : (
                  filteredStocks.map((stock, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid var(--border-light)', transition: 'background 0.2s' }} className="table-row-hover">
                      <td style={{ padding: '1.2rem' }}>
                        <div style={{ fontWeight: 'bold', color: 'var(--text-main)' }}>{stock.symbol}</div>
                        <div className="hide-mobile" style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{stock.name}</div>
                      </td>
                      <td style={{ padding: '1.2rem', fontWeight: 'bold' }}>Rs. {Number(stock.price || 0).toFixed(2)}</td>
                      <td style={{ padding: '1.2rem', textAlign: 'right' }} className={(stock.change || 0) >= 0 ? 'text-success hide-mobile' : 'text-danger hide-mobile'}>
                        {(stock.change || 0) >= 0 ? '+' : ''}{(stock.change || 0).toFixed(2)}
                      </td>
                      <td style={{ padding: '1.2rem' }} className={(stock.percentageChange || 0) >= 0 ? 'text-success' : 'text-danger'}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          {(stock.percentageChange || 0) >= 0 ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                          {Math.abs(stock.percentageChange || 0).toFixed(2)}%
                        </div>
                      </td>
                      <td className="hide-mobile" style={{ padding: '1.2rem', color: 'var(--text-muted)' }}>Rs. {((stock.turnover || 0) / 1000000).toFixed(2)}M</td>
                      <td style={{ padding: '1.2rem' }}>
                        <button className="btn btn-icon p-1" title="Analyze" onClick={() => { setSearchTerm(stock.symbol); setActiveTab('dashboard'); }}>
                          <Zap size={16} />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    );
  };

  const renderWealthyIntelligence = () => {
    // Strategy: Only show high-probability "BUY" and "STRONG BUY" signals with >70% Safety Score
    const isCrash = summaries?.isMarketCrash || false;
    const eliteSignals = aiSignals.filter(s => (s.action.includes('මිලදී') || s.action.includes('STRONG BUY') || s.action.includes('ACCUMULATE')) && s.safetyScore >= (isCrash ? 35 : 70));
    return (
      <div className="animate-fade-in">
        <div className="flex-between mb-6" style={{ flexWrap: 'wrap', gap: '1rem', alignItems: 'flex-start' }}>
          <div style={{ flex: '1 1 300px' }}>
            <h1 className="mb-2 text-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
              Wealthy Intelligence (Live) <span className="emoji">💎</span>
            </h1>
            <p className="text-muted">භාවිතා කරන උපායමාර්ගය: Fundamental Stability + Technical Momentum (Wealthy Minds Strategy)</p>
          </div>
          <div className="badge badge-primary" style={{ padding: '0.8rem 1.2rem', whiteSpace: 'nowrap' }}>
            <Activity size={16} className="mr-2" /> LIVE MARKET ANALYSIS
          </div>
        </div>

        <div className="grid-layout">
          {isCrash && (
            <div className="glass-card mb-4" style={{ gridColumn: 'span 2', borderLeft: '10px solid var(--danger)', background: 'rgba(247, 37, 133, 0.1)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                <AlertTriangle size={60} className="text-danger" />
                <div>
                  <h2 className="text-danger">මාර්කට් එක අද ගොඩක් භයානකයි! (CRASH ALERT) 🔴</h2>
                  <p>කොළඹ කොටස් වෙළඳපොලේ විකුණුම්කරුන් (Sellers) ඉතා වැඩි බැවින් AI එක මිලදී ගැනීමේ සංඥා (Buy Signals) තාවකාලිකව සීමා කර ඇත. මෙය ඔබේ මුදල් ආරක්ෂා කර ගැනීමට ගත් පියවරකි.</p>
                </div>
              </div>
            </div>
          )}

          {eliteSignals.length === 0 ? (
            <div style={{ gridColumn: 'span 2' }}>
              <div className="glass-card mb-4" style={{ borderLeft: '4px solid var(--primary)', background: 'rgba(99,102,241,0.08)' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1.5rem' }}>
                  <div style={{ fontSize: '3rem', lineHeight: 1 }}>🔍</div>
                  <div style={{ flex: 1 }}>
                    <h3 className="text-primary mb-2">දැනට ඉහළ-ශ්‍රේණියේ BUY signals නොමැත</h3>
                    <p className="text-muted mb-3" style={{ fontSize: '0.9rem', lineHeight: '1.6' }}>
                      <strong>Wealthy Intelligence</strong> tab එකේ ONLY ඉතා ඉහළ confidence ඇති stocks show කරනවා.
                      Rules: Safety Score <b>≥70%</b> + Action <b>BUY/STRONG BUY</b>. ඊට less qualify stocks Dashboard tab වල show වෙනවා.
                    </p>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '0.8rem' }}>
                      <div style={{ padding: '0.8rem', background: 'rgba(0,0,0,0.3)', borderRadius: '8px', textAlign: 'center' }}>
                        <div style={{ fontSize: '1.4rem', fontWeight: 'bold', color: 'var(--primary)' }}>{aiSignals.length}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Total AI Signals</div>
                      </div>
                      <div style={{ padding: '0.8rem', background: 'rgba(0,0,0,0.3)', borderRadius: '8px', textAlign: 'center' }}>
                        <div style={{ fontSize: '1.4rem', fontWeight: 'bold', color: 'var(--success)' }}>
                          {aiSignals.filter(s => s.action.includes('මිලදී') || s.action.includes('BUY')).length}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>BUY Signals Found</div>
                      </div>
                      <div style={{ padding: '0.8rem', background: 'rgba(0,0,0,0.3)', borderRadius: '8px', textAlign: 'center' }}>
                        <div style={{ fontSize: '1.4rem', fontWeight: 'bold', color: 'var(--warning)' }}>70%+</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Safety Score Required</div>
                      </div>
                      <div style={{ padding: '0.8rem', background: 'rgba(0,0,0,0.3)', borderRadius: '8px', textAlign: 'center' }}>
                        <div style={{ fontSize: '1.4rem', fontWeight: 'bold', color: marketStatus.isOpen ? 'var(--success)' : 'var(--danger)' }}>
                          {marketStatus.isOpen ? '🟢 OPEN' : '🔴 CLOSED'}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>CSE Market Status</div>
                      </div>
                    </div>
                    {!marketStatus.isOpen && (
                      <div style={{ marginTop: '1rem', padding: '0.8rem', background: 'rgba(247,37,133,0.08)', borderRadius: '8px', border: '1px solid rgba(247,37,133,0.2)', fontSize: '0.85rem' }}>
                        ⏰ <strong>Market Closed:</strong> CSE market ඉරිදා - සිකුරාදා 9:30 AM - 2:30 PM (SLST) ගනුදෙනු සිදු කරනවා. Market open වූ දා signals automatically appear වෙනවා.
                      </div>
                    )}
                  </div>
                </div>
              </div>
              {aiSignals.filter(s => s.action.includes('මිලදී') || s.action.includes('BUY')).length > 0 && (
                <div className="glass-card" style={{ borderLeft: '4px solid var(--warning)' }}>
                  <h4 className="text-warning mb-3">⚡ සමීපවී ඇති Signals - Safety Score 70% ට ආසන්නයි</h4>
                  <p className="text-muted mb-3" style={{ fontSize: '0.85rem' }}>BUY signal ලත් නමුත් Safety Score 70% ට වඩා අඩු. Dashboard tab එකේ සියල්ල බලන්න.</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                    {aiSignals.filter(s => s.action.includes('මිලදී') || s.action.includes('BUY')).slice(0, 5).map((s, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.7rem 1rem', background: 'rgba(255,255,255,0.02)', borderRadius: '8px' }}>
                        <div style={{ flex: 1 }}>
                          <strong>{s.symbol}</strong>
                          <span className="text-muted" style={{ fontSize: '0.8rem', marginLeft: '0.5rem' }}>{s.name}</span>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Safety Score</div>
                          <strong className={s.safetyScore >= 60 ? 'text-warning' : 'text-danger'}>{s.safetyScore}%</strong>
                        </div>
                        <span className="badge badge-success" style={{ fontSize: '0.7rem' }}>{s.action.split('(')[0].trim()}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <>
              {isCrash && (
                <div style={{ gridColumn: 'span 2', marginBottom: '1rem' }}>
                  <h3 className="text-warning">දැන් ඉතා අඩුවට ඇති ගුණාත්මක කොටස් (Quality Stocks at Discount):</h3>
                  <p className="text-muted">වැදගත්: මේවා මිලදී ගැනීමට පෙර වෙළඳපොල ස්ථාවර වන තෙක් (Bottom-out) බලා සිටින්න.</p>
                </div>
              )}
              {eliteSignals.map((signal, idx) => {
                const allocation = calculateAllocation(signal);
                return (
                  <div key={idx} className="glass-card" style={{ border: '2px solid var(--success-glow)', position: 'relative', overflow: 'hidden' }}>
                    <div style={{ position: 'absolute', top: 0, right: 0, padding: '0.5rem 1rem', background: 'var(--success)', color: 'white', fontSize: '0.7rem', fontWeight: 'bold', borderBottomLeftRadius: '12px' }}>
                      HIGH CONFIDENCE: {signal.confidence}%
                    </div>

                    <div className="mb-4">
                      <h2 className="text-primary" style={{ fontSize: '1.8rem' }}>{signal.symbol}</h2>
                      <h4 className="text-muted">{signal.name}</h4>
                    </div>

                    <div className="res-grid-2 mb-6" style={{ gap: '1rem' }}>
                      <div className="p-3" style={{ background: 'rgba(255,255,255,0.02)', borderRadius: '8px' }}>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>SAFETY SCORE</div>
                        <div style={{ fontSize: '1.5rem', fontWeight: '800' }} className="text-success">{signal.safetyScore}%</div>
                      </div>
                      <div className="p-3" style={{ background: 'rgba(255,255,255,0.02)', borderRadius: '8px' }}>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>CURRENT PRICE</div>
                        <div style={{ fontSize: '1.5rem', fontWeight: '800' }}>Rs. {signal.currentPrice}</div>
                      </div>
                    </div>


                    <div className="p-4 mb-6" style={{ background: 'rgba(0,0,0,0.4)', borderRadius: '12px', borderLeft: '4px solid var(--primary)' }}>
                      <h5 className="mb-2 text-primary">විශ්ලේෂණය (Rationale):</h5>
                      <p style={{ fontSize: '0.9rem', lineHeight: '1.5' }}>{signal.rationale}</p>
                    </div>

                    <div className="grid-2 mb-6" style={{ gap: '2rem' }}>
                      <div>
                        <h5 className="text-success mb-2">TARGET PRICE (ලාභය):</h5>
                        <div style={{ fontSize: '1.4rem', fontWeight: 'bold' }}>Rs. {signal.targetPrice}</div>
                        <div className="text-success" style={{ fontSize: '0.8rem' }}>Expected Profit: +{((signal.targetPrice - signal.currentPrice) / signal.currentPrice * 100).toFixed(1)}%</div>
                      </div>
                      <div>
                        <h5 className="text-danger mb-2">STOP LOSS (ආරක්ෂිත සීමාව):</h5>
                        <div style={{ fontSize: '1.4rem', fontWeight: 'bold' }}>Rs. {signal.stopLoss}</div>
                        <div className="text-danger" style={{ fontSize: '0.8rem' }}>Max Risk per Share: Rs. {(signal.currentPrice - signal.stopLoss).toFixed(2)}</div>
                      </div>
                    </div>

                    <div style={{ padding: '1.5rem', background: 'var(--primary-glow)', borderRadius: '12px' }}>
                      <div className="flex-between mb-3">
                        <strong className="text-primary">100% ආරක්ෂිත ආයෝජන සැලසුම:</strong>
                        <Shield size={20} className="text-primary" />
                      </div>
                      <div className="res-grid-2">
                        <div>
                          <div style={{ fontSize: '0.75rem' }}>මිලදී ගතයුතු ප්‍රමාණය</div>
                          <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{allocation.shares} Shares</div>
                        </div>
                        <div className="portfolio-total-inv">
                          <div style={{ fontSize: '0.75rem' }}>මුළු ආයෝජනය</div>
                          <div style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>Rs. {allocation.totalInvestment.toLocaleString()}</div>
                        </div>
                      </div>

                    </div>
                  </div>
                );
              })}
            </>
          )}
        </div>
      </div>
    );
  };

  const renderSmartAllocator = () => (
    <div className="animate-fade-in">
      <div className="flex-between mb-4">
        <div>
          <h1 className="mb-2">100% අවදානම් කළමනාකරණය <span className="emoji">🧮</span></h1>
          <p className="text-muted">ඔබේ උපයාගත් මුදල් සුරක්ෂිතව කොටස් වෙළඳපොලේ ආයෝජනය කිරීමට අවශ්‍ය ගණනය කිරීම් මෙතනින් ලබාදේ.</p>
        </div>
      </div>

      <div className="grid-layout" style={{ gridTemplateColumns: '1fr 2fr' }}>
        <div className="glass-card">
          <h3 className="mb-4">1. ඔබේ ආයෝජන මූලධනය (Capital)</h3>

          <div className="input-group">
            <label className="input-label">ඔබ ආයෝජනය කිරීමට බලාපොරොත්තු වන මුදල කොපමණද? (Rs.)</label>
            <input
              type="number"
              className="input-field"
              value={capital}
              onChange={(e) => setCapital(Number(e.target.value))}
            />
          </div>

          <div className="input-group">
            <label className="input-label">එක් ගනුදෙනුවක් සඳහා ඔබ දැරීමට කැමති උපරිම පාඩුව (%)</label>
            <input
              type="number"
              step="0.5"
              className="input-field"
              value={riskPerTrade}
              onChange={(e) => setRiskPerTrade(Number(e.target.value))}
            />
            <span className="text-muted" style={{ fontSize: '0.8rem', marginTop: '4px' }}>
              උපදෙස: කොටස් වෙළඳපොලේදී ඔබේ මුදල් ආරක්ෂා කරගැනීමට සමස්ත මූලධනයෙන් 2% කට වඩා එක් ගනුදෙනුවකට අවදානමක් නොගන්න.
            </span>
          </div>

          <div style={{ marginTop: '2rem', padding: '1rem', background: 'var(--success-bg)', borderRadius: '12px', border: '1px solid var(--success-glow)' }}>
            <div className="flex-center gap-2 mb-2">
              <Shield size={20} className="text-success" />
              <strong className="text-success">ආරක්ෂිත සීමාව (Guaranteed Protection Limit)</strong>
            </div>
            <p className="text-success" style={{ fontSize: '0.9rem', textAlign: 'center' }}>
              වෙළඳපොල කඩා වැටුනද හෝ මෙම තීරණය වැරදුනද, ඔබට සිදුවිය හැකි උපරිම පාඩුව <strong style={{ fontSize: '1.2rem' }}>Rs. {(capital * (riskPerTrade / 100)).toLocaleString()}</strong> පමණි. ඉතිරි මුදල් සියල්ල සම්පූර්ණයෙන්ම සුරක්ෂිතයි!
            </p>
          </div>
        </div>

        <div className="glass-card">
          <h3 className="mb-4 flex-center gap-2" style={{ justifyContent: 'flex-start' }}><Briefcase size={20} className="text-primary" /> 2. අද දිනයේ ඔබට මිලදීගත හැකි හොඳම කොටස්:</h3>

          {loading && <p>Calculations karamin pawathi... hold on!</p>}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {aiSignals.filter(s => s.action.includes('මිලදී')).map((signal, i) => {
              const allocation = calculateAllocation(signal);
              return (
                <div key={i} className="glass-card" style={{ padding: '1.5rem', background: 'linear-gradient(145deg, rgba(255,255,255,0.02) 0%, rgba(255,255,255,0.05) 100%)' }}>
                  <div className="res-grid-2" style={{ gap: '2rem' }}>
                    <div>

                    <h3 style={{ color: 'var(--primary)', marginBottom: '0.5rem' }}>{signal.name}</h3>
                    <p className="text-muted" style={{ fontSize: '0.9rem', marginBottom: '1rem' }}>{signal.rationale}</p>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                      <div className="flex-between">
                        <span className="text-muted" style={{ fontSize: '0.9rem' }}>දැනට එක් කොටසක මිල:</span>
                        <strong style={{ fontSize: '1.1rem' }}>Rs. {Number(signal.currentPrice).toFixed(2)}</strong>
                      </div>
                      <div className="flex-between">
                        <span className="text-muted" style={{ fontSize: '0.9rem' }}>ලාභ සහිතව විකිණීමට අපේක්ෂිත මිල:</span>
                        <strong className="text-success" style={{ fontSize: '1.1rem' }}>Rs. {Number(signal.targetPrice).toFixed(2)}</strong>
                      </div>
                      <div className="flex-between">
                        <span className="text-muted" style={{ fontSize: '0.9rem' }}>පාඩුවක් වුවහොත් විකුණා දැමිය යුතු මිල (Stop Loss):</span>
                        <strong className="text-danger" style={{ fontSize: '1.1rem' }}>Rs. {Number(signal.stopLoss).toFixed(2)}</strong>
                      </div>
                    </div>
                  </div>

                  <div style={{ borderLeft: '1px solid var(--border-light)', paddingLeft: '2rem', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>

                    <div style={{ background: 'rgba(0,0,0,0.3)', padding: '1rem', borderRadius: '12px', marginTop: '0.5rem' }}>
                      <span style={{ fontSize: '1.1rem', color: 'var(--text-main)', fontWeight: 'bold' }}>ඔබේ මුදලට අනුව පහත පරිදි කටයුතු කරන්න:</span>
                      <br /><br />
                      <div className="res-grid-2" style={{ gap: '1rem' }}>
                        <div>
                          <div className="text-muted" style={{ fontSize: '0.8rem', marginBottom: '4px' }}>මිලදී ගතයුතු කොටස් (Shares)</div>
                          <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--success)' }}>{allocation.shares} </div>
                        </div>
                        <div>
                          <div className="text-muted" style={{ fontSize: '0.8rem', marginBottom: '4px' }}>ඒ සඳහා වැයවන මුදල:</div>
                          <div style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>Rs. {allocation.totalInvestment.toLocaleString()}</div>
                        </div>
                      </div>

                    </div>

                    <div style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'space-between' }}>
                      <div>
                        <div className="text-muted" style={{ fontSize: '0.8rem' }}>සාර්ථක වුවහොත් ලැබෙන අපේක්ෂිත ලාභය:</div>
                        <strong className="text-success">+ Rs. {allocation.potentialProfit.toLocaleString()}</strong>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div className="text-muted" style={{ fontSize: '0.8rem' }}>වැරදුනහොත් සිදුවන උපරිම පාඩුව:</div>
                        <strong className="text-danger">- Rs. {allocation.riskAmount.toLocaleString()}</strong>
                      </div>
                    </div>

                    <button
                      className="btn btn-primary mt-4"
                      style={{ width: '100%', padding: '0.8rem', fontWeight: 'bold', background: 'var(--success)' }}
                      onClick={() => addToPortfolioDirectly(signal, allocation)}
                    >
                      + Portfolio එකට එකතු කරන්න
                    </button>
                  </div>
                </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );


  const [newTrade, setNewTrade] = useState({ symbol: '', buyPrice: '', quantity: '', targetPrice: '', stopLoss: '' });

  const addToPortfolioDirectly = async (signal, allocation) => {
    if (allocation.shares <= 0 || !allocation.shares) {
      alert("ප්‍රමාණවත් මුදල් නොමැත. කරුණාකර Capital එක වෙනස් කරන්න.");
      return;
    }
    const tradeData = {
      id: Date.now(),
      symbol: signal.symbol,
      buyPrice: signal.currentPrice,
      quantity: allocation.shares,
      targetPrice: signal.targetPrice,
      stopLoss: signal.stopLoss,
      notifiedTarget: false,
      notifiedStop: false
    };
    const API_BASE = import.meta.env.MODE === 'production' ? '' : 'http://localhost:3001';
    try {
      const { data } = await axios.post(`${API_BASE}/api/portfolio`, tradeData);
      if (data.status === 'success') {
        setPortfolio(data.data);
        alert(`${signal.symbol} කොටස් ${allocation.shares} ක් Portfolio එකට සාර්ථකව එකතු කළා!`);
      }
    } catch (err) {
      console.error('Error adding trade directly:', err);
      alert('Portfolio එකට එකතු කිරීමේදී දෝෂයක් මතු විය.');
    }
  };

  const addTrade = async () => {
    if (!newTrade.symbol || !newTrade.buyPrice || !newTrade.quantity) return;
    const API_BASE = import.meta.env.MODE === 'production' ? '' : 'http://localhost:3001';
    const tradeData = { ...newTrade, id: Date.now(), symbol: newTrade.symbol.toUpperCase(), notifiedTarget: false, notifiedStop: false };

    try {
      const { data } = await axios.post(`${API_BASE}/api/portfolio`, tradeData);
      if (data.status === 'success') {
        setPortfolio(data.data);
        setNewTrade({ symbol: '', buyPrice: '', quantity: '', targetPrice: '', stopLoss: '' });
      }
    } catch (err) {
      console.error('Error adding trade:', err);
      alert('වෙබ් අඩවියට සම්බන්ධ වීමේ දෝෂයකි.');
    }
  };

  const removeTrade = async (id) => {
    const API_BASE = import.meta.env.MODE === 'production' ? '' : 'http://localhost:3001';
    try {
      const { data } = await axios.delete(`${API_BASE}/api/portfolio/${id}`);
      if (data.status === 'success') {
        setPortfolio(data.data);
      }
    } catch (err) {
      console.error('Error removing trade:', err);
      alert('වෙබ් අඩවියට සම්බන්ධ වීමේ දෝෂයකි.');
    }
  };

  const renderPortfolio = () => (
    <div className="animate-fade-in">
      <div className="flex-between mb-4">
        <div>
          <h1 className="mb-2">මගේ ආයෝජන (My Portfolio) <span className="emoji">💼</span></h1>
          <p className="text-muted">ඔබ මිලදී ගත් කොටස් මෙහි ඇතුලත් කරන්න. අදාළ ඉලක්ක වලට ආ විට ඔබට Notification එකක් ලැබෙනු ඇත.</p>
        </div>
      </div>

      <div className="glass-card mb-4" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem', alignItems: 'end' }}>
        <div>
          <label className="text-muted" style={{ fontSize: '0.8rem' }}>සලකුණ (Symbol)</label>
          <input type="text" className="input-field" placeholder="උදා: SAMP.N0000" value={newTrade.symbol} onChange={e => setNewTrade({ ...newTrade, symbol: e.target.value })} style={{ marginBottom: 0 }} />
        </div>
        <div>
          <label className="text-muted" style={{ fontSize: '0.8rem' }}>මිලදී ගත් මිල</label>
          <input type="number" className="input-field" placeholder="Rs." value={newTrade.buyPrice} onChange={e => setNewTrade({ ...newTrade, buyPrice: e.target.value })} style={{ marginBottom: 0 }} />
        </div>
        <div>
          <label className="text-muted" style={{ fontSize: '0.8rem' }}>කොටස් ගණන</label>
          <input type="number" className="input-field" placeholder="Qty" value={newTrade.quantity} onChange={e => setNewTrade({ ...newTrade, quantity: e.target.value })} style={{ marginBottom: 0 }} />
        </div>
        <div>
          <label className="text-muted" style={{ fontSize: '0.8rem' }}>Target Price (ලාභය)</label>
          <input type="number" className="input-field" placeholder="Rs." value={newTrade.targetPrice} onChange={e => setNewTrade({ ...newTrade, targetPrice: e.target.value })} style={{ marginBottom: 0 }} />
        </div>
        <div>
          <label className="text-muted" style={{ fontSize: '0.8rem' }}>Stop Loss (පාඩුව)</label>
          <input type="number" className="input-field" placeholder="Rs." value={newTrade.stopLoss} onChange={e => setNewTrade({ ...newTrade, stopLoss: e.target.value })} style={{ marginBottom: 0 }} />
        </div>
        <button className="btn btn-primary" onClick={addTrade} style={{ padding: '0.8rem' }}>+ එකතු කරන්න</button>
      </div>

      <div className="grid-layout">
        {portfolio.length === 0 ? (
          <div className="glass-card text-center" style={{ padding: '3rem' }}>තාම කිසිම කොටසක් ඇතුලත් කරලා නැහැ.</div>
        ) : (
          portfolio.map(trade => {
            const stock = marketData.find(s => s.symbol === trade.symbol);
            const currentPrice = stock ? stock.price : Number(trade.buyPrice);
            const totalInvested = Number(trade.buyPrice) * Number(trade.quantity);
            const currentValue = currentPrice * Number(trade.quantity);
            const pnl = currentValue - totalInvested;
            const pnlPercent = (pnl / totalInvested) * 100;

            return (
              <div key={trade.id} className="glass-card" style={{ borderLeft: `5px solid ${pnl >= 0 ? 'var(--success)' : 'var(--danger)'}` }}>
                <div className="flex-between mb-3">
                  <h3 className="text-primary">{trade.symbol}</h3>
                  <button onClick={() => removeTrade(trade.id)} style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer' }}>ඉවත් කරන්න</button>
                </div>

                <div className="res-grid-2" style={{ gap: '1rem', marginBottom: '1rem' }}>
                  <div>
                    <div className="text-muted" style={{ fontSize: '0.8rem' }}>මිලදී ගත් මිල</div>
                    <div>Rs. {Number(trade.buyPrice).toFixed(2)}</div>
                  </div>
                  <div>
                    <div className="text-muted" style={{ fontSize: '0.8rem' }}>දැනට පවතින මිල (Live)</div>
                    <div style={{ fontWeight: 'bold' }}>Rs. {currentPrice.toFixed(2)}</div>
                  </div>
                  <div>
                    <div className="text-muted" style={{ fontSize: '0.8rem' }}>කොටස් ගණන</div>
                    <div>{trade.quantity} Shares</div>
                  </div>
                  <div>
                    <div className="text-muted" style={{ fontSize: '0.8rem' }}>ලාභ/අලාභය (P&L)</div>
                    <div className={pnl >= 0 ? 'text-success' : 'text-danger'} style={{ fontWeight: 'bold' }}>
                      {pnl >= 0 ? '+' : ''}Rs. {pnl.toFixed(2)} ({pnlPercent.toFixed(2)}%)
                    </div>
                  </div>
                </div>

                <div className="res-grid-2" style={{ gap: '1rem', background: 'rgba(0,0,0,0.2)', padding: '0.5rem', borderRadius: '8px' }}>
                  <div>
                    <span className="text-muted" style={{ fontSize: '0.75rem' }}>Target: </span>
                    <strong className="text-success">{trade.targetPrice ? `Rs. ${trade.targetPrice}` : '-'}</strong>
                  </div>
                  <div>
                    <span className="text-muted" style={{ fontSize: '0.75rem' }}>Stop Loss: </span>
                    <strong className="text-danger">{trade.stopLoss ? `Rs. ${trade.stopLoss}` : '-'}</strong>
                  </div>
                </div>

              </div>
            );
          })
        )}
      </div>
    </div>
  );

  return (
    <div className="app-container">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-logo" style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
          <div style={{ width: '40px', height: '40px', background: 'linear-gradient(135deg, var(--primary), var(--accent))', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <TrendingUp size={24} color="white" />
          </div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: '800', letterSpacing: '1px' }}>Trader<span className="text-primary">AI</span></h2>
        </div>


        <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <button
            onClick={() => setActiveTab('dashboard')}
            style={{
              display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.8rem 1rem',
              borderRadius: '12px', background: activeTab === 'dashboard' ? 'var(--primary-glow)' : 'transparent',
              color: activeTab === 'dashboard' ? 'var(--primary)' : 'var(--text-main)', border: 'none', cursor: 'pointer',
              fontWeight: activeTab === 'dashboard' ? '600' : '400', transition: 'all 0.3s'
            }}
          >
            <BarChart2 size={20} /> විශේෂතා (Overview)
          </button>
          <button
            onClick={() => setActiveTab('marketwatch')}
            style={{
              display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.8rem 1rem',
              borderRadius: '12px', background: activeTab === 'marketwatch' ? 'var(--primary-glow)' : 'transparent',
              color: activeTab === 'marketwatch' ? 'var(--primary)' : 'var(--text-main)', border: 'none', cursor: 'pointer',
              fontWeight: activeTab === 'marketwatch' ? '600' : '400', transition: 'all 0.3s'
            }}
          >
            <List size={20} /> වෙළඳපොල (Market Watch)
          </button>
          <button
            onClick={() => setActiveTab('wealthy')}
            style={{
              display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.8rem 1rem',
              borderRadius: '12px', background: activeTab === 'wealthy' ? 'var(--primary-glow)' : 'transparent',
              color: activeTab === 'wealthy' ? 'var(--primary)' : 'var(--text-main)', border: 'none', cursor: 'pointer',
              fontWeight: activeTab === 'wealthy' ? '600' : '400', transition: 'all 0.3s'
            }}
          >
            <Zap size={20} /> Wealthy Intelligence 💎
          </button>
          <button
            onClick={() => setActiveTab('portfolio')}
            style={{
              display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.8rem 1rem',
              borderRadius: '12px', background: activeTab === 'portfolio' ? 'var(--primary-glow)' : 'transparent',
              color: activeTab === 'portfolio' ? 'var(--primary)' : 'var(--text-main)', border: 'none', cursor: 'pointer',
              fontWeight: activeTab === 'portfolio' ? '600' : '400', transition: 'all 0.3s'
            }}
          >
            <Briefcase size={20} /> මගේ ආයෝජන
          </button>
          <button
            onClick={() => setActiveTab('allocator')}
            style={{
              display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.8rem 1rem',
              borderRadius: '12px', background: activeTab === 'allocator' ? 'var(--primary-glow)' : 'transparent',
              color: activeTab === 'allocator' ? 'var(--primary)' : 'var(--text-main)', border: 'none', cursor: 'pointer',
              fontWeight: activeTab === 'allocator' ? '600' : '400', transition: 'all 0.3s'
            }}
          >
            <Shield size={20} /> අවදානම් කළමනාකරණය
          </button>
        </nav>
      </aside>

      <main className="main-content">
        {activeTab === 'dashboard' && renderDashboard()}
        {activeTab === 'marketwatch' && renderMarketWatch()}
        {activeTab === 'wealthy' && renderWealthyIntelligence()}
        {activeTab === 'portfolio' && renderPortfolio()}
        {activeTab === 'allocator' && renderSmartAllocator()}
      </main>
    </div>
  );
}
