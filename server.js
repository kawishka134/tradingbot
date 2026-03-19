import express from 'express';
import cors from 'cors';
import { createClient } from '@supabase/supabase-js';
import axios from 'axios';
import * as cheerio from 'cheerio';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs'; const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json());

// Log all requests
app.use((req, res, next) => {
    console.log(`[${new Date().toLocaleTimeString()}] ${req.method} ${req.url}`);
    next();
});

// Serve static files from the React app
app.use(express.static(path.join(__dirname, 'dist')));

// Supabase Setup
const supabaseUrl = 'https://wgdatsboryieahzrpnzb.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndnZGF0c2JvcnlpZWFoenJwbnpiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI3MjY3ODAsImV4cCI6MjA4ODMwMjc4MH0.mzD8CfVH8jeurXZWjJxszcrD0ky_7pekOMhlhnkwM8M';
const supabase = createClient(supabaseUrl, supabaseKey);

// -----------------------------------------------------------------
// TELEGRAM & PORTFOLIO LOGIC
// -----------------------------------------------------------------

const TELEGRAM_TOKEN = '7983489797:AAHr9fLoGHuKWg5i1_Qfjpm5VsRXC3necVI';
const TELEGRAM_CHAT_ID = '8514265667';

// -----------------------------------------------------------------
// PORTFOLIO BOT CREDENTIALS 
// (The user will insert the new bot token and chat ID here)
// -----------------------------------------------------------------
const PORTFOLIO_TELEGRAM_TOKEN = '8760504635:AAGoOpMX8jGBHWtApkVvfe-Ah7SObnoXGYA';
const PORTFOLIO_CHAT_ID = '8514265667';

async function sendTelegramAlert(message) {
    try {
        await axios.post(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
            chat_id: TELEGRAM_CHAT_ID,
            text: message,
            parse_mode: 'HTML'
        });
        console.log(`[TELEGRAM] Alert sent successfully.`);
    } catch (err) {
        console.error('[TELEGRAM] Error sending message:', err.response?.data?.description || err.message);
    }
}

async function sendPortfolioAlert(message) {
    if (PORTFOLIO_TELEGRAM_TOKEN === 'YOUR_NEW_BOT_TOKEN_HERE') {
        console.log('[PORTFOLIO-BOT] Credentials not set yet. Message would be:', message);
        return;
    }
    try {
        await axios.post(`https://api.telegram.org/bot${PORTFOLIO_TELEGRAM_TOKEN}/sendMessage`, {
            chat_id: PORTFOLIO_CHAT_ID,
            text: message,
            parse_mode: 'HTML'
        });
        console.log(`[PORTFOLIO-BOT] Alert sent successfully.`);
    } catch (err) {
        console.error('[PORTFOLIO-BOT] Error sending message:', err.response?.data?.description || err.message);
    }
}

const PORTFOLIO_FILE = path.join(__dirname, 'portfolio.json');

function getLocalPortfolio() {
    try {
        if (!fs.existsSync(PORTFOLIO_FILE)) {
            fs.writeFileSync(PORTFOLIO_FILE, JSON.stringify([]));
            return [];
        }
        const data = fs.readFileSync(PORTFOLIO_FILE, 'utf8');
        return JSON.parse(data);
    } catch (e) {
        return [];
    }
}

function saveLocalPortfolio(data) {
    try {
        fs.writeFileSync(PORTFOLIO_FILE, JSON.stringify(data, null, 2));
    } catch (e) {
        console.error('Error saving portfolio:', e);
    }
}
// -----------------------------------------------------------------

// 1. Fetch Real CSE Data & Sector Insights
async function fetchCSEData() {
    try {
        const commonHeaders = {
            'Content-Type': 'application/json',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Origin': 'https://www.cse.lk',
            'Referer': 'https://www.cse.lk/pages/market-summary/market-summary.component.html',
            'Accept': 'application/json, text/plain, */*'
        };

        const [tradeRes, sectorRes] = await Promise.all([
            axios.post('https://www.cse.lk/api/tradeSummary', {}, { headers: commonHeaders, timeout: 8000 }),
            axios.post('https://www.cse.lk/api/allSectors', {}, { headers: commonHeaders, timeout: 8000 })
        ]);

        const allStocks = tradeRes.data?.reqTradeSummery || [];
        const sectors = sectorRes.data || [];

        const stocks = allStocks
            .filter(s => s.price > 0)
            .map(s => ({
                id: s.id,
                symbol: s.symbol,
                name: s.name,
                price: s.price,
                change: s.change || 0,
                percentageChange: s.percentageChange || 0,
                volume: s.sharevolume || 0,
                turnover: s.turnover || 0,
                marketCap: s.marketCap || 0,
                high: s.high || 0,
                low: s.low || 0,
                previousClose: s.previousClose || 0
            }));

        return { stocks, sectors };
    } catch (error) {
        console.error('Error fetching CSE:', error.message);
        return { stocks: [], sectors: [] };
    }
}

// 2. The Core AI / Algorithm Logic (Wealthy Minds Strategy V3)
function analyzeMarket(stocks, sectors, currentNews = []) {
    const recommendations = [];

    // --- Market Sentiment Analysis ---
    const gainers = stocks.filter(s => s.percentageChange > 0).length;
    const losers = stocks.filter(s => s.percentageChange < 0).length;
    const adRatio = gainers / (losers || 1);

    // Market is in crash mode if losers are significantly higher than gainers
    const isMarketCrash = (adRatio < 0.15 && losers > 50) || (stocks.reduce((acc, s) => acc + (s.percentageChange || 0), 0) / (stocks.length || 1) < -2.5);
    const avgMarketChange = stocks.reduce((acc, s) => acc + (s.percentageChange || 0), 0) / (stocks.length || 1);

    // --- Global News Pulse ---
    const globalNegativeCount = currentNews.filter(n => n.impact === 'NEGATIVE').length;
    const globalPositiveCount = currentNews.filter(n => n.impact === 'POSITIVE').length;
    const isHighRiskEnv = globalNegativeCount > globalPositiveCount || isMarketCrash;

    // Check for specific oil news
    const oilPricesSurging = currentNews.some(n =>
        (n.title.toLowerCase().includes('oil') || n.title.toLowerCase().includes('fuel')) &&
        (n.title.toLowerCase().includes('surge') || n.title.toLowerCase().includes('rise') || n.title.toLowerCase().includes('high'))
    );

    stocks.forEach(stock => {
        let action = 'තබා ගන්න (HOLD)';
        let confidence = 40;
        let targetPrice = stock.price;
        let stopLoss = stock.price * 0.95;
        let rationale = 'මෙම කොටස දැනට ස්ථාවර මට්ටමක පවතී.';
        let safetyScore = 50;

        // 1. Fundamental & Liquidity Check
        const isLiquid = stock.turnover > 200000;
        safetyScore = Math.min(95, 40 + (stock.marketCap > 10000000000 ? 30 : 10));

        // 2. Market Sentiment Adjustment
        if (isMarketCrash) {
            safetyScore -= 30;
            rationale = "වෙළඳපොල දැඩි ලෙස පහත වැටෙමින් පවතී (Systemic Sell-off). ප්‍රවේශම් වන්න. ";
        } else if (isHighRiskEnv) {
            safetyScore -= 15;
            rationale = "ගෝලීය දේශපාලනික තත්වය හමුවේ තරමක් අවදානම් සහගතයි. ";
        }

        if (oilPricesSurging) {
            const rawName = stock.name.toLowerCase();
            if (rawName.includes('transport') || rawName.includes('logistics') || rawName.includes('manufacturing')) {
                safetyScore -= 20;
                rationale += "තෙල් මිල ඉහළ යාම නිසා නිෂ්පාදන පිරිවැය වැඩි විය හැක. ";
            }
        }

        // 3. Technical Sentiment (Wealthy Minds Rule)
        if (isLiquid) {
            // During a crash, we increase the threshold for "BUY"
            const buyThreshold = isMarketCrash ? -5 : -4;

            if (stock.percentageChange <= buyThreshold) {
                // Only strong buy if market isn't in a total freefall, or if it's a very solid company
                if (isMarketCrash) {
                    if (safetyScore >= 35 && stock.turnover > 2000000) {
                        action = 'අඩුවට එකතු කරන්න (ACCUMULATE)';
                        confidence = 70;
                        targetPrice = stock.price * 1.15;
                        stopLoss = stock.price * 0.90;
                        rationale += `මාර්කට් එක සමග මිල බැස තිබුණද මූලික පදනම ශක්තිමත් බැවින් අඩුවට එකතුකරගත හැක (Quality at Discount).`;
                    } else {
                        action = 'අවදානම් (HIGH RISK)';
                        confidence = 30;
                        rationale += `මිල බැස තිබුණද වෙළඳපොල තත්වය නිසා මිලදී ගැනීම මුදල් අහිමිවීමේ අවදානමයි.`;
                    }
                } else {
                    action = 'අනිවාර්යයෙන් මිලදී ගන්න (STRONG BUY)';
                    confidence = 85;
                    targetPrice = stock.price * 1.12;
                    stopLoss = stock.price * 0.94;
                    rationale += `මිල සැලකිය යුතු ලෙස බැස ඇත. Rebound එකක් බලාපොරොත්තු විය හැක.`;
                }
            }
            else if (stock.percentageChange < -1 && stock.turnover > 1000000 && !isMarketCrash) {
                action = 'මිලදී ගැනීමට සුදුසුයි (BUY)';
                confidence = 75;
                targetPrice = stock.price * 1.07;
                rationale += `වෙළඳපොල පවතින තත්වය අනුව සාධාරණ මිලට වඩා අඩුවෙන් පවතී.`;
            }
            else if (stock.percentageChange >= 7) {
                action = 'විකුණන්න (SELL)';
                confidence = 90;
                targetPrice = stock.price * 0.93;
                rationale += `මිල අධික ලෙස ඉහළ ගොස් ඇත (Overvalued). ලාභය ලබා ගන්න.`;
            }
        }

        recommendations.push({
            symbol: stock.symbol,
            name: stock.name,
            currentPrice: stock.price,
            action,
            confidence: Math.round(confidence),
            targetPrice: targetPrice.toFixed(2),
            stopLoss: Math.max(0, stopLoss).toFixed(2),
            rationale,
            safetyScore: Math.max(0, safetyScore),
            percentageChange: (stock.percentageChange || 0).toFixed(2),
            turnover: stock.turnover,
            isMarketCrash: isMarketCrash
        });
    });

    return recommendations.sort((a, b) => b.confidence - a.confidence);
}

// Health Check
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', time: new Date().toISOString() });
});

// Portfolio Routes
app.get('/api/portfolio', (req, res) => {
    res.json(getLocalPortfolio());
});

app.post('/api/portfolio', (req, res) => {
    const newTrade = req.body; // Expects { id, symbol, buyPrice, quantity, targetPrice, stopLoss, notifiedTarget, notifiedStop }
    const portfolio = getLocalPortfolio();
    portfolio.push(newTrade);
    saveLocalPortfolio(portfolio);

    const msg = `📥 <b>නව ආයෝජනයක් ඇතුලත් කළා! (New Trade)</b>\n\n` +
                `<b>සමාගම:</b> ${newTrade.symbol}\n` +
                `<b>මිලදී ගත් මිල:</b> Rs. ${Number(newTrade.buyPrice).toFixed(2)}\n` +
                `<b>කොටස් ගණන:</b> ${newTrade.quantity} Shares\n` +
                `<b>මුළු ආයෝජනය:</b> Rs. ${(Number(newTrade.buyPrice) * Number(newTrade.quantity)).toLocaleString()}\n\n` +
                `🎯 <b>Target Price:</b> ${newTrade.targetPrice ? 'Rs. ' + Number(newTrade.targetPrice).toFixed(2) : 'N/A'}\n` +
                `🛡️ <b>Stop Loss:</b> ${newTrade.stopLoss ? 'Rs. ' + Number(newTrade.stopLoss).toFixed(2) : 'N/A'}\n\n` +
                `<i>මෙම ආයෝජනයේ මිල වෙනස්වීම් මෙතැන් සිට ස්වයංක්‍රීයව නිරීක්ෂණය කෙරේ... </i>👁️`;
    
    sendPortfolioAlert(msg);

    res.json({ status: 'success', data: portfolio });
});

app.delete('/api/portfolio/:id', (req, res) => {
    const { id } = req.params;
    let portfolio = getLocalPortfolio();
    portfolio = portfolio.filter(p => String(p.id) !== String(id));
    saveLocalPortfolio(portfolio);
    res.json({ status: 'success', data: portfolio });
});

app.put('/api/portfolio/:id/notified', (req, res) => {
    const { id } = req.params;
    const { type } = req.body;
    let portfolio = getLocalPortfolio();
    portfolio = portfolio.map(p => {
        if (String(p.id) === String(id)) {
            if (type === 'target') p.notifiedTarget = true;
            if (type === 'stop') p.notifiedStop = true;
        }
        return p;
    });
    saveLocalPortfolio(portfolio);
    res.json({ status: 'success', data: portfolio });
});

// Routes
app.get('/api/market', async (req, res) => {
    const force = req.query.force === 'true';
    const [{ stocks, sectors }, news] = await Promise.all([
        fetchCSEData(),
        fetchRealNews(force)
    ]);

    const analysis = analyzeMarket(stocks, sectors, news);

    // Sort for Gainers/Losers summaries
    const gainers = [...stocks].sort((a, b) => b.percentageChange - a.percentageChange).slice(0, 5);
    const losers = [...stocks].sort((a, b) => a.percentageChange - b.percentageChange).slice(0, 5);
    const highVolume = [...stocks].sort((a, b) => b.turnover - a.turnover).slice(0, 5);

    const now = new Date();
    const lastUpdated = now.toLocaleTimeString('en-US', { hour12: true, hour: '2-digit', minute: '2-digit', second: '2-digit' });

    const totalGainers = stocks.filter(s => s.percentageChange > 0).length;
    const totalLosers = stocks.filter(s => s.percentageChange < 0).length;

    res.json({
        status: 'success',
        timestamp: now.toISOString(),
        lastUpdated: lastUpdated,
        fullMarket: stocks, // Send all stocks to allow searching
        sectors: sectors,
        aiRecommendations: analysis.slice(0, 40),
        summaries: {
            gainers,
            losers,
            highVolume,
            counts: { gainers: totalGainers, losers: totalLosers },
            isMarketCrash: (totalGainers / (totalLosers || 1)) < 0.15
        },
        globalSentiment: (
            // Primary: Market breadth (gainers vs losers is the most accurate signal)
            totalLosers > totalGainers ||
            // Secondary: News is mostly negative AND market is also negative
            (news.filter(n => n.impact === 'NEGATIVE').length > news.filter(n => n.impact === 'POSITIVE').length && totalLosers >= totalGainers)
        ) ? 'NEGATIVE' : 'POSITIVE'
    });
});

// Cache for news to avoid hitting APIs too often
let newsCache = {
    data: [],
    lastFetched: 0
};

async function fetchRealNews(force = false) {
    const now = Date.now();
    // Cache for 5 minutes, unless forced
    if (!force && newsCache.data.length > 0 && (now - newsCache.lastFetched) < 5 * 60 * 1000) {
        return newsCache.data;
    }

    // --- Global Financial News Sources (8 sources) ---
    const sources = [
        // Sri Lanka Local
        { name: 'Ada Derana Biz', url: 'http://bizenglish.adaderana.lk/feed/', type: 'LOCAL' },
        { name: 'Ada Derana', url: 'http://www.adaderana.lk/rss.php', type: 'LOCAL' },

        // South Asia / India (directly impacts CSE via FII flows)
        { name: 'Economic Times', url: 'https://economictimes.indiatimes.com/markets/rssfeeds/1977021501.cms', type: 'REGIONAL' },
        { name: 'NDTV Business', url: 'https://feeds.feedburner.com/ndtvprofit-latest', type: 'REGIONAL' },

        // Global Finance & Markets
        { name: 'Reuters Business', url: 'https://feeds.reuters.com/reuters/businessNews', type: 'GLOBAL' },
        { name: 'BBC Business', url: 'https://feeds.bbci.co.uk/news/business/rss.xml', type: 'GLOBAL' },
        { name: 'Investing.com', url: 'https://www.investing.com/rss/news.rss', type: 'GLOBAL' },
        { name: 'The Guardian Markets', url: 'https://www.theguardian.com/business/markets/rss', type: 'GLOBAL' },
        { name: 'Yahoo Finance', url: 'https://finance.yahoo.com/news/rssindex', type: 'GLOBAL' },
    ];

    let allNews = [];

    // --- Enhanced Financial Sentiment Keywords ---
    const negativeKeywords = [
        // Geopolitical
        'war', 'conflict', 'attack', 'tension', 'crisis', 'sanction', 'strike', 'explosion', 'threat',
        // Economic Negative
        'inflation', 'recession', 'stagflation', 'default', 'downgrade', 'bankruptcy', 'layoffs', 'job cuts',
        'rate hike', 'interest rate rise', 'tariff', 'trade war', 'deficit', 'debt ceiling',
        // Market Negative
        'crash', 'plunge', 'sell-off', 'selloff', 'bear market', 'correction', 'slump', 'tumble',
        'drop', 'fall', 'decline', 'sank', 'sunk', 'hit', 'cut', 'loss', 'shortage', 'blackout',
        // Commodity Negative (for Sri Lanka)
        'oil surge', 'fuel price', 'petrol rise', 'gas prices rise',
        // Sinhala
        'අර්බුදය', 'පහර', 'අඩු', 'පහත', 'වැටේ', 'මියගිය', 'නතර', 'බද්ද'
    ];

    const positiveKeywords = [
        // Economic Positive
        'profit', 'growth', 'recovery', 'rebound', 'surplus', 'investment', 'expansion', 'gdp growth',
        'rate cut', 'interest rate cut', 'stimulus', 'rally', 'bull market', 'boom', 'record high',
        // Market Positive
        'gain', 'rise', 'surge', 'jump', 'soar', 'climb', 'upgrade', 'dividend', 'buyback', 'earnings beat',
        'strong', 'stable', 'optimism', 'confidence', 'deal', 'merger', 'acquisition',
        // Sinhala
        'ලාභ', 'වර්ධනය', 'ආයෝජන', 'ස්ථාවර', 'ජය'
    ];

    // High-impact financial topics that strongly affect emerging markets like CSE
    const highImpactNegative = [
        'federal reserve', 'fed rate', 'us inflation', 'dollar surge', 'emerging market sell',
        'china slowdown', 'china crisis', 'oil price surge', 'global recession', 'imf warning', 'world bank warning'
    ];

    const highImpactPositive = [
        'fed rate cut', 'us economy growth', 'china stimulus', 'global recovery', 'emerging market rally',
        'oil price drop', 'dollar weakens', 'imf growth forecast', 'trade deal'
    ];

    const fetchPromises = sources.map(async (source) => {
        try {
            const response = await axios.get(source.url, {
                timeout: 10000,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                    'Accept': 'application/xml, text/xml, application/rss+xml, */*'
                }
            });
            const $ = cheerio.load(response.data, { xmlMode: true });
            
            let items = [];
            $('item').slice(0, 6).each((i, el) => {
                const title = $(el).find('title').text().trim();
                const description = $(el).find('description').text().trim();
                if (!title) return;

                let impact = 'NEUTRAL';
                let marketRelevance = 'LOW'; // How relevant the news is to stock market
                const lowerTitle = (title + ' ' + description.substring(0, 200)).toLowerCase();

                // Check high-impact topics first (override)
                if (highImpactNegative.some(phrase => lowerTitle.includes(phrase))) {
                    impact = 'NEGATIVE';
                    marketRelevance = 'HIGH';
                } else if (highImpactPositive.some(phrase => lowerTitle.includes(phrase))) {
                    impact = 'POSITIVE';
                    marketRelevance = 'HIGH';
                } else {
                    // Standard keyword check
                    const negScore = negativeKeywords.filter(w => lowerTitle.includes(w)).length;
                    const posScore = positiveKeywords.filter(w => lowerTitle.includes(w)).length;
                    if (negScore > posScore) impact = 'NEGATIVE';
                    else if (posScore > negScore) impact = 'POSITIVE';

                    // If it's a financial source, it's more relevant by default
                    if (['Reuters Business', 'MarketWatch', 'Investing.com', 'Yahoo Finance', 'CNN Business', 'Economic Times'].includes(source.name)) {
                        marketRelevance = 'MEDIUM';
                    }
                }

                // Oil-specific override (always negative for Sri Lanka)
                if ((lowerTitle.includes('oil') || lowerTitle.includes('fuel') || lowerTitle.includes('petrol') || lowerTitle.includes('crude')) &&
                    (lowerTitle.includes('surge') || lowerTitle.includes('rise') || lowerTitle.includes('high') || lowerTitle.includes('jump'))) {
                    impact = 'NEGATIVE';
                    marketRelevance = 'HIGH';
                }

                items.push({
                    id: `${source.name}-${i}-${Date.now()}`,
                    title: title,
                    source: source.name,
                    impact: impact,
                    type: source.type,
                    marketRelevance: marketRelevance,
                    date: new Date().toLocaleTimeString(),
                    summary: description.replace(/<[^>]*>/g, '').substring(0, 150) + '...'
                });
            });
            console.log(`[NEWS] Fetched ${items.length} items from ${source.name}`);
            return items;
        } catch (err) {
            console.error(`[NEWS] Error fetching from ${source.name}: ${err.message}`);
            return [];
        }
    });

    const results = await Promise.all(fetchPromises);
    allNews = results.flat();

    // Sort: HIGH relevance first, then by impact weight
    allNews.sort((a, b) => {
        const relevanceOrder = { HIGH: 0, MEDIUM: 1, LOW: 2 };
        return (relevanceOrder[a.marketRelevance] || 2) - (relevanceOrder[b.marketRelevance] || 2);
    });

    if (allNews.length > 0) {
        newsCache = {
            data: allNews,
            lastFetched: now
        };
    }
    return newsCache.data;
}

app.get('/api/news', async (req, res) => {
    try {
        const force = req.query.force === 'true';
        const news = await fetchRealNews(force);
        res.json(news);
    } catch (error) {
        console.error('Failed to fetch news:', error);
        res.status(500).json({ error: 'Failed to fetch news' });
    }
});

// The "catchall" handler: for any request that doesn't
// match one above, send back React's index.html file.
app.use((req, res, next) => {
    // Only handle GET requests that don't start with /api
    if (req.method === 'GET' && !req.url.startsWith('/api')) {
        res.sendFile(path.join(__dirname, 'dist/index.html'));
    } else {
        next();
    }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`\n=========================================`);
    console.log(`🚀 TRADING SERVER STARTED SUCCESSFULLY`);
    console.log(`🔗 API URL: http://localhost:${PORT}/api/market`);
    console.log(`=========================================\n`);
});

// -----------------------------------------------------------------
// BACKGROUND MARKET WATCHER (TELEGRAM BOT)
// -----------------------------------------------------------------
const notifiedStrongBuys = new Set();
const notifiedIntradayAlerts = new Set();
const notifiedNewsAlerts = new Set();  // track sent news alerts by title to avoid spam
let endOfDaySummarySent = false;
let previousPrices = {}; // { 'SAMP.N0000': 50.5 }

// Determine if market is currently open mathematically correctly for SLST (+5:30)
function checkIsMarketOpen() {
    const now = new Date();
    const utcTime = now.getTime() + (now.getTimezoneOffset() * 60000);
    const slstTime = new Date(utcTime + (3600000 * 5.5));
    const day = slstTime.getDay();
    const hours = slstTime.getHours();
    const minutes = slstTime.getMinutes();
    const timeInMinutes = hours * 60 + minutes;

    // Market open: Mon-Fri, 9:30 AM (570) to 2:30 PM (870)
    if (day === 0 || day === 6) return false;
    return timeInMinutes >= 570 && timeInMinutes <= 870;
}

// Ensure endOfDaySummarySent resets every morning
setInterval(() => {
    const now = new Date();
    const utcTime = now.getTime() + (now.getTimezoneOffset() * 60000);
    const slstTime = new Date(utcTime + (3600000 * 5.5));
    if (slstTime.getHours() === 1 && slstTime.getMinutes() === 0) {
        endOfDaySummarySent = false;
        notifiedStrongBuys.clear();
        notifiedIntradayAlerts.clear();
        notifiedNewsAlerts.clear();
        previousPrices = {};
    }
}, 60 * 1000);

async function runMarketWatcher() {
    console.log('[WATCHER] Checking market for Telegram alerts at', new Date().toLocaleTimeString());
    try {
        const [{ stocks, sectors }, news] = await Promise.all([
            fetchCSEData(),
            fetchRealNews()
        ]);

        // -------------------------------------------------------
        // STEP 0: 24/7 NEWS & COMPANY ALERTS (News → Telegram)
        // -------------------------------------------------------
        // Send news alerts ALL THE TIME, even if market is closed (stocks empty)
        const validStocks = stocks || [];

        news.forEach(article => {
            const newsKey = article.title.substring(0, 60).toLowerCase().replace(/\s+/g, '-');
            if (!notifiedNewsAlerts.has(newsKey)) {
                let isCompanyNews = false;
                let mentionedCompany = '';
                let isPortfolioCompany = false;

                for (let s of validStocks) {
                    if (s.symbol && s.symbol.length > 2 && article.title.includes(s.symbol)) {
                        isCompanyNews = true;
                        mentionedCompany = s.symbol;
                        break;
                    }
                    if (s.name && s.name.length > 4) {
                        const shortName = s.name.split(' ')[0];
                        if (shortName.length > 3 && article.title.includes(shortName)) {
                            isCompanyNews = true;
                            mentionedCompany = s.name;
                            break;
                        }
                    }
                }

                if (isCompanyNews) {
                    let portfolio = getLocalPortfolio();
                    isPortfolioCompany = portfolio.some(p => p.symbol === mentionedCompany || (p.name && mentionedCompany && p.name.includes(mentionedCompany)));
                }

                if (article.marketRelevance === 'HIGH' || article.marketRelevance === 'MEDIUM' || isCompanyNews || article.type === 'LOCAL') {
                    notifiedNewsAlerts.add(newsKey);

                    const impactEmoji = article.impact === 'NEGATIVE' ? '🔴' : article.impact === 'POSITIVE' ? '🟢' : '⚪';
                    const typeLabel = article.type === 'LOCAL' ? '🇱🇰 ශ්‍රී ලංකා' : article.type === 'REGIONAL' ? '🌏 දකුණු ආසියා' : '🌍 ගෝලීය';

                    let marketExplanation = '';
                    const lowerTitle = article.title.toLowerCase();
                    if (isCompanyNews) {
                        marketExplanation = `🏢 <i>මෙම ප්‍රවෘත්තිය <b>${mentionedCompany}</b> සමාගමට ඍජුවම අදාළ වේ.</i>`;
                    } else if (lowerTitle.includes('fed') || lowerTitle.includes('federal reserve') || lowerTitle.includes('rate hike')) {
                        marketExplanation = '⚠️ <i>ඇමරිකාවේ Fed Rate ඉහළ ගියාම ශ්‍රී ලංකා market වලටත් සෘණ බලපෑමක් ඇති විය හැක. Foreign investors withdraw කරයි.</i>';
                    } else if (lowerTitle.includes('oil') || lowerTitle.includes('crude') || lowerTitle.includes('fuel')) {
                        marketExplanation = '⚠️ <i>තෙල් මිල ඉහළ ගියාම ශ්‍රී ලංකාවේ ප්‍රවාහන සහ නිෂ්පාදන සමාගම්වලට සෘජු බලපෑමක් ඇති වේ.</i>';
                    } else if (lowerTitle.includes('dollar') || lowerTitle.includes('usd')) {
                        marketExplanation = '⚠️ <i>US Dollar ශක්තිමත් වීම import-dependent ශ්‍රී ලංකාවට ඍණ බලපෑමක් ඇති කළ හැකිය.</i>';
                    } else if (lowerTitle.includes('china') || lowerTitle.includes('trade war') || lowerTitle.includes('tariff')) {
                        marketExplanation = '⚠️ <i>ගෝලීය වෙළඳ ගැටලු emerging markets (ශ්‍රී ලංකා ඇතුළු) වලට indirect impact ඇති කළ හැකිය.</i>';
                    } else if (lowerTitle.includes('recession') || lowerTitle.includes('crash')) {
                        marketExplanation = '🚨 <i>ගෝලීය recession සං‍ඥා CSE market sell-off trigger කළ හැකිය. ප්‍රවේශ වන්න.</i>';
                    } else if (article.impact === 'POSITIVE') {
                        marketExplanation = '✅ <i>ධනාත්මක ගෝලීය outlook CSE market ද ඉහළ නංවා ගැනීමට හේතු විය හැකිය.</i>';
                    } else {
                        marketExplanation = '<i>මෙම ප්‍රවෘත්තිය මූල්‍ය සහ ආර්ථිකයට වැදගත් වේ.</i>';
                    }

                    const message = `📰 <b>MARKET NEWS ALERT</b> ${impactEmoji}\n\n` +
                        `${typeLabel} | <b>${article.source}</b>\n\n` +
                        `<b>${article.title}</b>\n\n` +
                        `${marketExplanation}`;

                    // Send to standard bot
                    sendTelegramAlert(message);

                    // IF it's a portfolio company, ALSO send it to the dedicated Portfolio Bot
                    if (isPortfolioCompany) {
                        sendPortfolioAlert(`🚨 <b>PORTFOLIO NEWS ALERT</b> 🚨\n\nඔබේ Portfolio හි ඇති <b>${mentionedCompany}</b> සමාගමට අදාළ විශේෂ පුවතක්!\n\n<b>${article.title}</b>`);
                    }

                    console.log(`[NEWS-ALERT] Sent Telegram for: ${article.title.substring(0, 50)}`);
                }
            }
        });
        // -------------------------------------------------------

        if (!stocks || stocks.length === 0) return; // Exit if market is closed for below portfolio actions

        const analysis = analyzeMarket(stocks, sectors, news);
        let portfolio = getLocalPortfolio();
        let portfolioChanged = false;

        // 1. Check Portfolio (Take Profit, Stop Loss, and Micro-Movements)
        portfolio.forEach((trade) => {
            const stock = stocks.find(s => s.symbol === trade.symbol);
            if (!stock) return;

            // Micro-movement tracker
            const portKey = `PORTFOLIO_${stock.symbol}`;
            const lastTrackedPrice = previousPrices[portKey];

            // Check if price changed by even 0.1 (dasama ganak)
            if (lastTrackedPrice && lastTrackedPrice !== stock.price) {
                const diff = stock.price - lastTrackedPrice;
                const directionText = diff > 0 ? '🔺 ඉහළට ගියා' : '🔻 පහළට ගියා';
                const emoji = diff > 0 ? '🟢' : '🔴';

                sendPortfolioAlert(`${emoji} <b>PORTFOLIO එකේ මිල වෙනසක්!</b>\n\n<b>${stock.symbol}</b> හි අලුත්ම මිල තත්වය:\n\n` +
                    `පෙර මිල: Rs. ${lastTrackedPrice.toFixed(2)}\n` +
                    `නව මිල: Rs. ${stock.price.toFixed(2)}\n` +
                    `වෙනස: <b>Rs. ${Math.abs(diff).toFixed(2)} (${directionText})</b>\n\n` +
                    `<i>ඔබේ Target Price සහ Stop Loss ගැන සැලකිලිමත් වන්න.</i>`
                );
                previousPrices[portKey] = stock.price; // Update tracker
            } else if (!lastTrackedPrice) {
                previousPrices[portKey] = stock.price; // Initial track
            }

            if (trade.targetPrice > 0 && stock.price >= trade.targetPrice && !trade.notifiedTarget) {
                const tpMsg = `✅ <b>TAKE PROFIT HIT!</b>\n\n<b>${stock.symbol}</b> සමාගමේ කොටස් මිල ඔයාගේ Target Price එකට ඇවිත්!\n\nCurrent Price: Rs. ${stock.price}\nTarget Price: Rs. ${trade.targetPrice}\n\n<i>පරක්කු නොවී ලාභය ගන්න විකුණන්න!</i> 💰`;
                sendTelegramAlert(tpMsg);
                sendPortfolioAlert(tpMsg);
                trade.notifiedTarget = true;
                portfolioChanged = true;
            }

            if (trade.stopLoss > 0 && stock.price <= trade.stopLoss && !trade.notifiedStop) {
                const slMsg = `🚨 <b>STOP LOSS ALERT!</b>\n\n<b>${stock.symbol}</b> සමාගමේ මිල ආපසු හැරී ඔබගේ අවදානම් සීමාවට වැටී ඇත!\n\nCurrent Price: Rs. ${stock.price}\nStop Loss Limit: Rs. ${trade.stopLoss}\n\n<i>තවත් පාඩු වීමට පෙර විකුණා දැමීම සුදුසුයි!</i> 🛡️`;
                sendTelegramAlert(slMsg);
                sendPortfolioAlert(slMsg);
                trade.notifiedStop = true;
                portfolioChanged = true;
            }
        });

        if (portfolioChanged) {
            saveLocalPortfolio(portfolio);
        }

        // 2. Check for "100% like" Super Strong Opportunities
        const eliteSignals = analysis.filter(s =>
            (s.action.includes('මිලදී') || s.action.includes('STRONG BUY')) &&
            s.safetyScore >= 80 &&
            s.confidence >= 80 &&
            !s.isMarketCrash // Do not send strong buys during crash
        );

        eliteSignals.forEach(signal => {
            const cacheKey = `${signal.symbol}-${new Date().toISOString().split('T')[0]}`; // Once per day
            if (!notifiedStrongBuys.has(cacheKey)) {
                sendTelegramAlert(`💎 <b>VIP TRADE OPPORTUNITY</b> 💎\n\n<b>${signal.symbol}</b> (${signal.name})\n\nCurrent Price: Rs. ${signal.currentPrice}\nTarget Price: Rs. ${signal.targetPrice}\nStop Loss: Rs. ${signal.stopLoss}\n\n<b>Safety Score:</b> ${signal.safetyScore}%\n<b>Confidence:</b> ${signal.confidence}%\n\n<b>Why:</b> ${signal.rationale}`);
                notifiedStrongBuys.add(cacheKey);
            }
        });

        // 3. Intraday Movement Alerts - fires every time price moves 4% from LAST ALERT baseline
        stocks.forEach(stock => {
            if (stock.price <= 0) return;
            const prevPrice = previousPrices[stock.symbol];

            if (prevPrice) {
                const diffPercent = ((stock.price - prevPrice) / prevPrice) * 100;

                if (diffPercent >= 4 && stock.turnover > 500000) {
                    // Big jump - alert and reset baseline so next 4% jump also alerts
                    sendTelegramAlert(`🚀 <b>SUDDEN JUMP ALERT!</b>\n\n<b>${stock.symbol}</b> is moving up fast!\n\nNew Price: Rs. ${stock.price}\nPrevious: Rs. ${prevPrice.toFixed(2)}\nChange: <b>+${diffPercent.toFixed(1)}%</b>\n\nGainers Side | High Volume\n<i>Keep an eye on this opportunity!</i> 📈`);
                    // Reset baseline to current price so next 4% from here also alerts
                    previousPrices[stock.symbol] = stock.price;

                } else if (diffPercent <= -4 && stock.turnover > 500000) {
                    // Big drop - alert and reset baseline
                    sendTelegramAlert(`⚠️ <b>SUDDEN DROP ALERT!</b>\n\n<b>${stock.symbol}</b> is falling rapidly!\n\nNew Price: Rs. ${stock.price}\nPrevious: Rs. ${prevPrice.toFixed(2)}\nChange: <b>${diffPercent.toFixed(1)}%</b>\n\n<i>Be careful if you are holding this stock!</i> 📉`);
                    // Reset baseline to current price
                    previousPrices[stock.symbol] = stock.price;
                }
                // If less than 4% change, do NOT reset baseline - accumulate the movement
            } else {
                // Initial recording for the day
                previousPrices[stock.symbol] = stock.price;
            }
        });

        // 4. End of Day Summary (Sent automatically around 2:31 PM SLST)
        const now = new Date();
        const utcTime = now.getTime() + (now.getTimezoneOffset() * 60000);
        const slstTime = new Date(utcTime + (3600000 * 5.5));
        const day = slstTime.getDay();
        const timeInMinutes = slstTime.getHours() * 60 + slstTime.getMinutes();

        // 871 minutes = 2:31 PM (Just after market closes)
        if (day >= 1 && day <= 5 && timeInMinutes >= 871 && timeInMinutes <= 880 && !endOfDaySummarySent) {

            const gainers = stocks.filter(s => s.percentageChange > 0).length;
            const losers = stocks.filter(s => s.percentageChange < 0).length;
            const topGainer = [...stocks].sort((a, b) => b.percentageChange - a.percentageChange)[0];
            const topLoser = [...stocks].sort((a, b) => a.percentageChange - b.percentageChange)[0];
            const topVolume = [...stocks].sort((a, b) => b.turnover - a.turnover)[0];

            const summaryMsg = `🔔 <b>MARKET CLOSED - DAILY SUMMARY</b> 🔔\n\n` +
                `Today's trading session has ended. Here's what happened:\n\n` +
                `📊 <b>General Market:</b>\n` +
                `• Stocks Up (Gainers): ${gainers} 🟢\n` +
                `• Stocks Down (Losers): ${losers} 🔴\n\n` +
                `🏆 <b>Top Performer:</b>\n` +
                `• ${topGainer.symbol}: Rs. ${topGainer.price} (+${topGainer.percentageChange.toFixed(2)}%)\n\n` +
                `🔻 <b>Worst Performer:</b>\n` +
                `• ${topLoser.symbol}: Rs. ${topLoser.price} (${topLoser.percentageChange.toFixed(2)}%)\n\n` +
                `💸 <b>Most Active (High Vol):</b>\n` +
                `• ${topVolume.symbol} (Rs. ${(topVolume.turnover / 1000000).toFixed(1)}M traded)\n\n` +
                `<i>Have a great evening! See you tomorrow.</i> 🌙`;

            sendTelegramAlert(summaryMsg);
            endOfDaySummarySent = true;
        }

    } catch (err) {
        console.error('[WATCHER] Error in watcher loop:', err.message);
    }
}

// Run watcher every 2 minutes for faster price change detection
setInterval(runMarketWatcher, 2 * 60 * 1000);
// Run once on startup after 10 seconds to setup everything instantly
setTimeout(() => {
    runMarketWatcher();

    // Initial Welcome Message on startup
    sendTelegramAlert('✅ <b>Trading Alert System Started</b>\nMonitoring market changes and portfolio updates...');
    sendPortfolioAlert('🤖 <b>PORTFOLIO BOT සම්බන්ධ විය! (System Started)</b>\n\nමම සූදානම්! මෙතැන් පටන් ඔබගේ Portfolio එකේ සෑම සියුම් මිල වෙනස්වීමක්ම සහ අදාළ සමාගම් පුවත් ඔබට ක්ෂණිකව ලබා දෙනවා. ✅');

    // For manual test of EOD summary right now
    const forceSmsTest = process.argv.includes('--test-summary');
    if (forceSmsTest) {
        console.log("SENDING TEST SUMMARY");
        fetchCSEData().then((data) => {
            if (!data.stocks || data.stocks.length === 0) return;
            const stocks = data.stocks;
            const gainers = stocks.filter(s => s.percentageChange > 0).length;
            const losers = stocks.filter(s => s.percentageChange < 0).length;
            const topGainer = [...stocks].sort((a, b) => b.percentageChange - a.percentageChange)[0];
            const topLoser = [...stocks].sort((a, b) => a.percentageChange - b.percentageChange)[0];
            const topVolume = [...stocks].sort((a, b) => b.turnover - a.turnover)[0];

            const summaryMsg = `🧪 <b>[TEST] DAILY SUMMARY</b> 🧪\n\n` +
                `📊 <b>General Market:</b>\n` +
                `• Stocks Up (Gainers): ${gainers} 🟢\n` +
                `• Stocks Down (Losers): ${losers} 🔴\n\n` +
                `🏆 <b>Top Performer:</b>\n` +
                `• ${topGainer?.symbol || 'N/A'}: Rs. ${topGainer?.price} (+${topGainer?.percentageChange?.toFixed(2)}%)\n\n` +
                `🔻 <b>Worst Performer:</b>\n` +
                `• ${topLoser?.symbol || 'N/A'}: Rs. ${topLoser?.price} (${topLoser?.percentageChange?.toFixed(2)}%)\n\n` +
                `💸 <b>Most Active (High Vol):</b>\n` +
                `• ${topVolume?.symbol || 'N/A'} (Rs. ${((topVolume?.turnover || 0) / 1000000).toFixed(1)}M traded)`;

            sendTelegramAlert(summaryMsg);
        });
    }

}, 10000);
