'use strict';

const tilebelt = require('tilebelt');
const mkdirp = require('mkdirp');
const hash = require('shorthash').unique;
const path = require('path');
const fs = require('fs');
const fetch = require('node-fetch');

module.exports = runStats;

const defaultOptions = {
    width: 2880,
    height: 1800,
    minZoom: 0,
    maxZoom: 16,
    center: [-77.03275, 38.91279],
    cacheDir: path.join(__dirname, '/tile-cache')
};

async function runStats(url, options, processTile) {

    options = Object.assign(Object.create(defaultOptions), options || {});

    const cachePath = path.join(options.cacheDir, hash(url));
    mkdirp(cachePath);

    const tilePromises = [];

    for (let z = options.minZoom; z <= options.maxZoom; z++) {
        const p = tilebelt.pointToTileFraction(options.center[0], options.center[1], z);
        const z2 = Math.pow(2, z);

        const minX = Math.max(Math.floor(p[0] - 0.5 * options.width / 512), 0);
        const minY = Math.max(Math.floor(p[1] - 0.5 * options.height / 512), 0);
        const maxX = Math.min(Math.floor(p[0] + 0.5 * options.width / 512), z2 - 1);
        const maxY = Math.min(Math.floor(p[1] + 0.5 * options.height / 512), z2 - 1);

        for (let x = minX; x <= maxX; x++) {
            for (let y = minY; y <= maxY; y++) {
                tilePromises.push(loadTile(z, x, y, url, cachePath));
            }
        }
    }

    const tiles = await Promise.all(tilePromises);
    for (const tile of tiles) processTile(tile);

    process.stderr.write('\n');
}

async function loadTile(z, x, y, urlTemplate, cachePath) {
    const tilePath = path.join(cachePath, z + '-' + x + '-' + y);

    if (fs.existsSync(tilePath)) {
        const data = fs.readFileSync(tilePath);
        process.stderr.write('.');
        return {z, x, y, data};
    }

    const url = urlTemplate
        .replace('{x}', x)
        .replace('{y}', y)
        .replace('{z}', z);

    const response = await fetch(url);

    if (response.status === 200) {
        const data = await response.buffer();
        fs.writeFileSync(tilePath, data);
        process.stderr.write('+');
        return {z, x, y, data};
    }
    if (response.status === 404) {
        const data = null;
        process.stderr.write('_');
        return {z, x, y, data};
    }

    throw new Error(response.status + ' ' + url);
}
