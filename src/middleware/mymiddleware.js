// Middleware function definitions go here

const db = require('../services/database.js')

function logging(req, res, next) {
    let logdata = {
        remoteaddr: req.ip ?? null,
        remoteuser: req.user ?? null,
        time: Date.now() ?? null,
        method: req.method ?? null,
        url: req.url ?? null,
        protocol: req.protocol ?? null,
        httpversion: req.httpVersion ?? null,
        secure: req.secure.toString() ?? null, // TODO: is this ok?
        status: res.statusCode ?? null,
        referer: req.headers['referer'] ?? null,
        useragent: req.headers['user-agent'] ?? null
    }

    const stmt = db.prepare(`INSERT INTO accesslogs (remoteaddr, remoteuser, time, 
        method, url, protocol, httpversion, secure, status, referer, useragent) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`)

    const info = stmt.run(logdata.remoteaddr, logdata.remoteuser, logdata.time,
        logdata.method, logdata.url, logdata.protocol,
        logdata.httpversion, logdata.secure, logdata.status,
        logdata.referer, logdata.useragent)
    next()
}

module.exports = logging