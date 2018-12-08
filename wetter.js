const http = require('http');
const sqlite = require('sqlite');
const express = require('express');

const app = express();
const dbPromise = sqlite.open('./database.sqlite', { Promise });
const delay = 10 * 1000;


app.use(express.static('web_files'));
app.get('/data/:from/:to', (req, res, next) => {
  getAllData(parseInt(req.params.from), parseInt(req.params.to)).then( data => {
    return res.status(200).json(data);
  }).catch(next)
})

app.listen(3000);

dbPromise.then( db => {
  db.migrate();
  console.log('Database initialized.')
})

async function logData (data) {
  try {
    console.log(`Logging Data: ${new Date().toLocaleString('de-DE')} with Temp: ${data.temperature}C, Hum: ${data.humidity}%, Pres: ${data.pressure}mBar.`);

    let db = await dbPromise;
    let stmt = await db.prepare('INSERT INTO Weather VALUES (?, ?, ?, ?);');
    stmt.run(data.temperature, data.humidity, data.pressure, data.timestamp);
  } catch (error) {
    console.error('Error writing to database: ', error)
  } 
}

async function getAllData (from, to) {
  try {
    let db = await dbPromise
    let res = await db.all(`SELECT * FROM Weather WHERE (mesaurement_ts > ${from} AND mesaurement_ts < ${to});`);
    
    console.log(`Returning ${res.length} measurements between ${new Date(from).toLocaleString('de-De')} and ${new Date(to).toLocaleString('de-De')}.`);

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
  } catch (error) {
    console.error('Error reading from database: ' + error);
  }
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
        const data = parseData(rawData);
        logData(data).catch( err => {
          console.log('Error inserting into database: ' + err);
        });
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