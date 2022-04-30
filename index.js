// Place your server entry point code here

const fs = require('fs')
const morgan = require('morgan')
const express = require('express')
const cors = require('cors')
const minimist = require('minimist')
const app = express()
const args = require('minimist')(process.argv.slice(2))


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
    console.log(help);
    process.exit(0);
}

const port = args.port || 5000 || process.env.PORT

const server = app.listen(port, () => {
    console.log('App listening on port %PORT%'.replace('%PORT%',port));
});

//serve HTML files here!
app.use(express.static('./public'));

app.use(express.urlencoded({extended: true}));
app.use(express.json());

//logging middleware
app.use(require('./src/middleware/mymiddleware.js'));

if (args.log == 'false') {
    console.log("NOTICE: not creating file access.log");
} else {

    //using morgan ot log fills
    //look for .log file or create one if it doesn't exist
    const logdir = './log/';

    if (!fs.existsSync(logdir)) {
        fs.mkdirSync(logdir);
    }

    const accessLog = fs.createWriteStream('./data/log/access.log', { flags: 'a' })
    app.use(morgan('combined', { stream: accessLog }))
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

app.get('/app/flips/coin/', (req, res) => {
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

if(args.debug === true) {
    app.get('/app/log/access/', (req, res) => {
        const stmt = db.prepare("SELECT * FROM accesslog").all()
        res.status(200).json(stmt)
    });
    app.get('/app/error', (req, res) => {
        throw new Error('Error test successful.')
    });
}   

app.use(function(req, res){
    res.status(404).send('404 NOT FOUND')
});

//-- SERVER STUFF --

process.on('SIGINT', () => {
    server.close(() => {
        console.log('\nApp stopped.');
    });
});