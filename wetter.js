const http = require('http');
const sqlite = require('sqlite');
const express = require('express');

const app = express();
const dbPromise = sqlite.open('./database.sqlite', { Promise });
const delay = 10 * 1000;


app.use(express.static('web_files'));
app.get('/data', (req, res, next) => {
  getAllData().then( data => {
    return res.status(200).json(data);
  }).catch(next)
})

app.listen(3000);

dbPromise.then( db => {
  db.migrate();
  console.log('Database initialized.')
})

async function logData (data) {
  let db = await dbPromise
  let stmt = await db.prepare('INSERT INTO Weather VALUES (?, ?, ?, ?);');
  stmt.run(data.temperature, data.humidity, data.pressure, data.timestamp);
}

async function getAllData () {
  let db = await dbPromise

  let res = await db.all(`SELECT * FROM Weather WHERE datetime(mesaurement_ts / 1000, 'unixepoch') > datetime('now', '-1 HOUR');`)
  
  temp_data = res.map(m => {
    return { x: m.mesaurement_ts, y: m.temperature };
  })
  pressure_data = res.map(m => {
    return { x: m.mesaurement_ts, y: m.pressure }
  })
  humidity_data = res.map(m => {
    return { x: m.mesaurement_ts, y: m.humidity }
  })

  return { temp_data, pressure_data, humidity_data };
}


function parseData (raw) {
  let lines = raw.split('\r\n')
  return reading = {
    timestamp: new Date(),
    temperature: parseFloat(lines[5]),
    humidity: parseFloat(lines[8]),
    pressure: parseFloat(lines[11])
  }
}

function readData () {
  http.get('http://192.168.178.67/', (res) => {
    const { statusCode } = res;
    const contentType = res.headers['content-type'];

    let error;
    if (statusCode !== 200) {
      error = new Error('Request Failed.\n' +
                        `Status Code: ${statusCode}`);
    }
    if (error) {
      console.error(error.message);
      // consume response data to free up memory
      res.resume();
      setTimeout(readData, delay);
      return;
    }

    res.setEncoding('utf8');
    let rawData = '';
    res.on('data', (chunk) => { rawData += chunk; });
    res.on('end', () => {
      try {
        let data = parseData(rawData);
        logData(data).catch( err => {
          console.log('Error inserting into database: ' + err);
        });

        console.log(data);
      } catch (e) {
        console.error(e.message);
      } finally {
        setTimeout(readData, delay);
      }
    });
  }).on('error', (e) => {
    console.error(`Got error: ${e.message}`);
    setTimeout(readData, delay);
  });
}

readData();
getAllData();