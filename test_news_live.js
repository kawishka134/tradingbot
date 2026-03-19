import axios from 'axios';
import * as cheerio from 'cheerio';

async function fetchRealNews() {
    const sources = [
        { name: 'Ada Derana', url: 'http://www.adaderana.lk/rss.php', type: 'LOCAL' },
        { name: 'NDTV', url: 'https://feeds.feedburner.com/ndtvnews-top-stories', type: 'GLOBAL' },
        { name: 'CNN', url: 'http://rss.cnn.com/rss/edition.rss', type: 'GLOBAL' }
    ];

    let allNews = [];

    for (const source of sources) {
        try {
            console.log(`Fetching ${source.name}...`);
            const response = await axios.get(source.url, { timeout: 10000 });
            const $ = cheerio.load(response.data, { xmlMode: true });

            $('item').slice(0, 3).each((i, el) => {
                const title = $(el).find('title').text();
                const description = $(el).find('description').text();

                let impact = 'NEUTRAL';
                const lowerTitle = title.toLowerCase();
                const negativeKeywords = ['war', 'conflict', 'sank', 'attack', 'tension', 'crisis', 'inflation', 'strike', 'missing', 'dead', 'environmental damage'];
                const positiveKeywords = ['profit', 'growth', 'rebound', 'gain', 'investment', 'stable', 'surplus'];

                if (negativeKeywords.some(word => lowerTitle.includes(word))) impact = 'NEGATIVE';
                if (positiveKeywords.some(word => lowerTitle.includes(word))) impact = 'POSITIVE';

                if ((lowerTitle.includes('oil') || lowerTitle.includes('fuel')) &&
                    (lowerTitle.includes('price') || lowerTitle.includes('surge') || lowerTitle.includes('rise'))) {
                    impact = 'NEGATIVE';
                }

                allNews.push({
                    title: title,
                    source: source.name,
                    impact: impact
                });
            });
        } catch (err) {
            console.error(`Error ${source.name}:`, err.message);
        }
    }
    return allNews;
}

fetchRealNews().then(news => {
    console.log('--- FETCHED NEWS ---');
    console.log(JSON.stringify(news, null, 2));
});
