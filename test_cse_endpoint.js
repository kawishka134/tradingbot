import axios from 'axios';

async function testCSE() {
    try {
        const commonHeaders = {
            'Content-Type': 'application/json',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Origin': 'https://www.cse.lk',
            'Referer': 'https://www.cse.lk/pages/market-summary/market-summary.component.html',
            'Accept': 'application/json, text/plain, */*'
        };

        console.log("Fetching...");
        const res = await axios.post('https://www.cse.lk/api/tradeSummary', {}, { headers: commonHeaders, timeout: 8000 });
        console.log("Data:", res.data ? "Received data length: " + JSON.stringify(res.data).length : "No data");
        if (res.data && res.data.reqTradeSummery) {
             console.log("Items:", res.data.reqTradeSummery.length);
        } else {
             console.log("No reqTradeSummery in response");
        }
    } catch (e) {
        console.error("Error:", e.message);
        if (e.response) {
            console.error("Status:", e.response.status);
            console.error("Data:", e.response.data);
        }
    }
}

testCSE();
