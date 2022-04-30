// Place your server entry point code here

const fs = require('fs')
const morgan = require('morgan')
const express = require('express')
const cors = require('cors')
const minimist = require('minimist')
const app = express()
const args = require('minimist')(process.argv.slice(2))

if (args.log == 'false') {
    console.log("NOTICE: not creating file access.log")
} else {

    //using morgan ot log fills
    //look for .log file or create one if it doesn't exist
    const logdir = './log/';

    if (!fs.existsSync(logdir)) {
        fs.mkdirSync(logdir);
    }

    const accessLog = fs.createWriteStream('access.log', { flags: 'a' })
    app.use(morgan('combined', { stream: accessLog }))
}

app.use(express.urlencoded({extended: true}))

const db = require('./src/services/database')

//serve HTML files here!
app.use(express.static('./public'))

const port = args.port || 5000

const server = app.listen(port, () => {
    console.log('App listening on port %PORT%'.replace('%PORT%',port))
});

const help = (`
server.js [options]
--port	Set the port number for the server to listen on. Must be an integer
            between 1 and 65535.
--debug	If set to true, creates endlpoints /app/log/access/ which returns
            a JSON access log from the database and /app/error which throws 
            an error with the message "Error test successful." Defaults to 
            false.
--log		If set to false, no log files are written. Defaults to true.
            Logs are always written to database.
--help	Return this message and exit.
`)
// If --help or -h, echo help text to STDOUT and exit
if (args.help || args.h) {
    console.log(help)
    process.exit(0)
}

app.use((req, res, next) => {
    let logdata = {
        remoteaddr: req.ip,
        remoteuser: req.user,
        time: Date.now(),
        method: req.method,
        url: req.url,
        protocol: req.protocol,
        httpversion: req.httpVersion,
        status: res.statusCode,
        referrer: req.headers['referer'],
        useragent: req.headers['user-agent']
    };
    const stmt = db.prepare('INSERT INTO accesslog (remoteaddr, remoteuser, time, method, url, protocol, httpversion, status, referrer, useragent) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
    const info = stmt.run(logdata.remoteaddr, logdata.remoteuser, logdata.time, logdata.method, logdata.url, logdata.protocol, logdata.httpversion, logdata.status, logdata.referrer, logdata.useragent)
    next();
})

if(args.debug === true) {
    app.get('/app/log/access/', (req, res) => {
        const stmt = db.prepare("SELECT * FROM accesslog").all()
        res.status(200).json(stmt)
    });
    app.get('/app/error', (req, res) => {
        throw new Error('Error test successful.')
    });
}   

// -- OLD CODE --

function coinFlip() {
    return (Math.random() > 0.5 ? 'heads' : 'tails');
}

function coinFlips(flips) {
    let arr_coins = [];
  
    if (!flips) {
      arr_coins.push(coinFlip());
    } else {
      for (var i = 0; i < flips; i++) {
        Math.random() > 0.5 ? arr_coins.push("heads") : arr_coins.push("tails");
      }
    }
  
    return arr_coins;
}

function countFlips(array) {
    var heads = 0;
    var tails = 0;
    for (let i = 0; i < array.length; i++) {
      if (array[i] == "heads") {
        heads++;
      } else {
        tails++;
      }
    }
  
    if (heads > 0 && tails == 0) {
      return { "heads": heads}
    } else if (tails > 0 && heads == 0) {
      return { "tails": tails}
    } else {
      return { "heads": heads, "tails": tails }
    }
}

function flipACoin(call) {
    var verdict = 'win';
    var flip = coinFlip();
  
    if (!(call == flip)) {
      verdict = 'lose';
    }
  
    return { 'call': call, 'flip': flip, 'result': verdict };
}

// -- ENDPOINTS --

app.get('/app', (req, res, next) => {
    res.json({ "message" : "your API works! (200)"})
    res.status(200)
})

app.get('/app/', (req, res, next) => {
    res.statusCode = 200;
    res.statusMessage = 'OK';
    //res.writeHead(res.statusCode, {'Content-Type' : 'text/plain'});
    res.end(res.statusCode + ' ' + res.statusMessage)
});

app.get('/app/flip/', (req, res) => {
    res.status(200);
    const ans = coinFlip();
    const flipResult = {"flip" : ans};
    res.json(flipResult);
});

app.get('/app/flips/coins/', (req, res), next => {
    res.status(200);
    const flips = req.body.number;
    const rawjson = {
        "raw" : flips,
        "summary": countFlips(flips)
    };
    res.json(rawjson)
});

app.post('/app/flip/call/', (req, res, next) => {
    const flip = flipACoin(req.body.guess)
    res.status(200).json(flip)
});

app.post('/app/flips/:number', (req, res, next) => {
    const flips = coinFlips(req.params.number);
    const counts = countFlips(flips);
    res.status(200).json({"raw": flips, "summary": counts});
  });

app.get('/app/flip/call/heads/', (req, res, next) => {
    res.status(200);
    res.json(flipACoin('heads'));
});

app.get('/app/flip/call/tails/', (req, res, next) => {
    res.status(200);
    res.json(flipACoin('tails'));
});

app.use(function(req, res){
    res.status(404).send('404 NOT FOUND')
});

process.on('SIGINT', () => {
    server.close(() => {
        console.log('\nApp stopped.');
    });
});