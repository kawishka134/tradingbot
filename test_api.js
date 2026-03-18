import axios from 'axios';

async function testCSE() {
    try {
        console.log('Fetching CSE data...');
        const response = await axios.post('https://www.cse.lk/api/tradeSummary', {}, {
            headers: {
                'Content-Type': 'application/json',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Origin': 'https://www.cse.lk',
                'Referer': 'https://www.cse.lk/pages/market-summary/market-summary.component.html'
            }
        });
        console.log('Response status:', response.status);
        console.log('Data type:', typeof response.data);
        console.log('Data keys:', Object.keys(response.data));

        const allStocks = Array.isArray(response.data) ? response.data :
            (response.data && Array.isArray(response.data.reqTradeSummery) ? response.data.reqTradeSummery : []);

        console.log('Stocks count:', allStocks.length);
        if (allStocks.length > 0) {
            console.log('First stock sample:', allStocks[0]);
        }
    } catch (error) {
        console.error('Error:', error.message);
        if (error.response) {
            console.error('Response data:', error.response.data);
        }
    }
}

testCSE();
