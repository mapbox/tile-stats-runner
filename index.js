'use strict';

var queue = require('d3-queue').queue;
var request = require('request');
var tilebelt = require('tilebelt');
var mkdirp = require('mkdirp');
var hash = require('shorthash').unique;
var path = require('path');
var fs = require('fs');

module.exports = runStats;

var defaultOptions = {
    width: 2880,
    height: 1800,
    minZoom: 0,
    maxZoom: 16,
    center: [-77.03275, 38.91279],
    cacheDir: path.join(__dirname, '/tile-cache')
};

function runStats(url, processTile, callback, options) {

    options = extend(Object.create(defaultOptions), options || {});

    var cachePath = path.join(options.cacheDir, hash(url));

    mkdirp(cachePath);

    var q = queue(4);

    for (var z = options.minZoom; z <= options.maxZoom; z++) {
        var p = tilebelt.pointToTileFraction(options.center[0], options.center[1], z);
        var z2 = Math.pow(2, z);

        var minX = Math.max(Math.floor(p[0] - 0.5 * options.width / 512), 0);
        var minY = Math.max(Math.floor(p[1] - 0.5 * options.height / 512), 0);
        var maxX = Math.min(Math.floor(p[0] + 0.5 * options.width / 512), z2 - 1);
        var maxY = Math.min(Math.floor(p[1] + 0.5 * options.height / 512), z2 - 1);

        for (var x = minX; x <= maxX; x++) {
            for (var y = minY; y <= maxY; y++) {
                q.defer(loadTile, z, x, y, url, cachePath, processTile);
            }
        }
    }

    q.awaitAll(function () {
        process.stdout.write('\n');
        callback();
    });
}

function loadTile(z, x, y, urlTemplate, cachePath, processTile, done) {
    var tilePath = path.join(cachePath, z + '-' + x + '-' + y);
    var tile = readFileIfExists(tilePath);

    if (tile) {
        processTile(tile, z);
        process.stdout.write('.');
        done();

    } else {
        var url = urlTemplate
            .replace('{x}', x)
            .replace('{y}', y)
            .replace('{z}', z);

        request({url: url, encoding: null, gzip: true}, function (err, response, body) {
            if (err) throw err;
            if (response.statusCode === 200) {
                processTile(body, z);
                process.stdout.write('+');

            } else if (response.statusCode === 404) {
                process.stdout.write('_');

            } else {
                throw new Error(response.statusCode + ' ' + url);
            }
            fs.writeFileSync(tilePath, body);
            done();
        });
    }
}

function readFileIfExists(path) {
    try {
        return fs.readFileSync(path);
    } catch (e) {
        return null;
    }
}

function extend(dest, src) {
    for (var i in src) {
        dest[i] = src[i];
    }
    return dest;
}
