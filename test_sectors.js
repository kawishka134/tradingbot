import axios from 'axios';

async function testSectors() {
    const headers = {
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0'
    };
    try {
        console.log('Testing allSectors...');
        const res = await axios.post('https://www.cse.lk/api/allSectors', {}, { headers });
        console.log('Status:', res.status);
        console.log('Data:', JSON.stringify(res.data).substring(0, 1000));
    } catch (e) {
        console.error('Error:', e.message);
    }
}

testSectors();
