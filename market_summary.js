
import axios from 'axios';

async function checkMarket() {
    try {
        const res = await axios.post('https://www.cse.lk/api/tradeSummary', {}, { timeout: 8000 });
        const stocks = res.data.reqTradeSummery || [];

        let gainers = 0;
        let losers = 0;
        let neutral = 0;
        let totalChange = 0;

        stocks.forEach(s => {
            if (s.percentageChange > 0) gainers++;
            else if (s.percentageChange < 0) losers++;
            else neutral++;
            totalChange += (s.percentageChange || 0);
        });

        console.log(`Gainers: ${gainers}`);
        console.log(`Losers: ${losers}`);
        console.log(`Neutral: ${neutral}`);
        console.log(`Average Change: ${(totalChange / stocks.length).toFixed(2)}%`);

    } catch (e) {
        console.error(e.message);
    }
}

checkMarket();
