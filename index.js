'use strict';

const PQueue = require('p-queue');
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

function runStats(url, processTile, options) {

    options = Object.assign(Object.create(defaultOptions), options || {});

    const cachePath = path.join(options.cacheDir, hash(url));
    mkdirp(cachePath);

    const q = new PQueue({concurrency: 4});

    const handleTileLoad = (tile) => {
        if (tile) processTile(tile);
    };

    for (let z = options.minZoom; z <= options.maxZoom; z++) {
        const p = tilebelt.pointToTileFraction(options.center[0], options.center[1], z);
        const z2 = Math.pow(2, z);

        const minX = Math.max(Math.floor(p[0] - 0.5 * options.width / 512), 0);
        const minY = Math.max(Math.floor(p[1] - 0.5 * options.height / 512), 0);
        const maxX = Math.min(Math.floor(p[0] + 0.5 * options.width / 512), z2 - 1);
        const maxY = Math.min(Math.floor(p[1] + 0.5 * options.height / 512), z2 - 1);

        for (let x = minX; x <= maxX; x++) {
            for (let y = minY; y <= maxY; y++) {
                q.add(loadTile(z, x, y, url, cachePath)).then(handleTileLoad);
            }
        }
    }

    return q.onIdle().then(() => {
        process.stderr.write('\n');
    });
}

function loadTile(z, x, y, urlTemplate, cachePath) {
    return async () => {
        const tilePath = path.join(cachePath, z + '-' + x + '-' + y);
        try {
            const data = fs.readFileSync(tilePath);
            process.stderr.write('.');
            return {z, x, y, data};

        } catch (e) {
            const url = urlTemplate
                .replace('{x}', x)
                .replace('{y}', y)
                .replace('{z}', z);

            const response = await fetch(url);

            if (response.status === 200) {
                const data = await response.buffer();
                process.stderr.write('+');
                fs.writeFileSync(tilePath, data);
                return {z, x, y, data};

            } else if (response.status === 404) {
                process.stderr.write('_');

            } else {
                throw new Error(response.status + ' ' + url);
            }
        }
        return null;
    };
}
