import axios from 'axios';

async function listCompanies() {
    try {
        const res = await axios.post('https://www.cse.lk/api/allCompanies', {}, {
            headers: { 'Content-Type': 'application/json', 'User-Agent': 'Mozilla/5.0' }
        });
        console.log('Keys:', Object.keys(res.data));
        if (res.data.reqCompanySummery) {
            console.log('Count:', res.data.reqCompanySummery.length);
            console.log('Sample:', res.data.reqCompanySummery[0]);
        }
    } catch (e) {
        console.error(e.message);
    }
}
listCompanies();
