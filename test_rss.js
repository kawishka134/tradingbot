
import axios from 'axios';

const urls = [
    'https://www.hirunews.lk/rss/sinhala.xml',
    'http://www.adaderana.lk/rss.php',
    'http://feeds.feedburner.com/adaderana/news',
    'https://www.newsfirst.lk/feed/'
];

async function check() {
    for (const url of urls) {
        try {
            const res = await axios.get(url, { timeout: 5000 });
            console.log(`URL: ${url} - Status: ${res.status} - Length: ${res.data.length}`);
        } catch (e) {
            console.log(`URL: ${url} - Error: ${e.message}`);
        }
    }
}

check();
