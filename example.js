'use strict';

const Pbf = require('pbf');
const runStats = require('./');

const ids = 'mapbox.mapbox-streets-v7';
const token = '<your-token-here>';
const url = `https://b.tiles.mapbox.com/v4/${ids}/{z}/{x}/{y}.vector.pbf?access_token=${token}`;

const result = {};

runStats(url, {
    width: 2880,
    height: 1800,
    minZoom: 0,
    maxZoom: 16,
    center: [-77.032751, 38.912792]
}, ({z, data}) => {
    if (data) result[z] = new Pbf(data).readFields(readTileField, result[z] || {});
}).then(() => {
    console.log(JSON.stringify(result, null, 2));
}).catch(console.error);

function readTileField(tag, stats, pbf) {
    if (tag === 3) {
        const pos = pbf.pos;
        const name = pbf.readMessage(readLayerField, {}).name;
        stats[name] = stats[name] || 0;
        stats[name] += pbf.pos - pos;
    }
}
function readLayerField(tag, layer, pbf) {
    if (tag === 1) {
        layer.name = pbf.readString();
    }
}
