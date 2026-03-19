import axios from 'axios';

async function testEndpoints(symbol) {
    const commonHeaders = {
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Origin': 'https://www.cse.lk',
        'Referer': 'https://www.cse.lk/pages/market-summary/market-summary.component.html'
    };

    const endpoints = [
        { name: 'tradeSummary (All Stocks)', url: 'https://www.cse.lk/api/tradeSummary', body: {} },
        { name: 'companyInfoSummery', url: 'https://www.cse.lk/api/companyInfoSummery', body: { symbol } },
        { name: 'getCompanyDetails', url: 'https://www.cse.lk/api/getCompanyDetails', body: { symbol } },
        { name: 'getFinancialAnnouncement', url: 'https://www.cse.lk/api/getFinancialAnnouncement', body: { symbol } }
    ];

    for (const ep of endpoints) {
        try {
            console.log(`--- Testing ${ep.name} ---`);
            const response = await axios.post(ep.url, ep.body, { headers: commonHeaders });
            console.log('Status:', response.status);
            console.log('Sample Keys:', Object.keys(response.data).slice(0, 10));
            // Print a bit of the data to see if it has P/E, EPS, etc.
            if (ep.name === 'companyInfoSummery') {
                console.log('Data Snippet:', JSON.stringify(response.data).substring(0, 500));
            }
        } catch (error) {
            console.error(`Error ${ep.name}:`, error.message);
        }
    }
}

testEndpoints('JKH.N0000');
