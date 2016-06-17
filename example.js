'use strict';

var runStats = require('./');

var ids = 'mapbox.mapbox-streets-v7';
var token = 'pk.eyJ1IjoicmVkdWNlciIsImEiOiJrS3k2czVJIn0.CjwU0V9fO4FAf3ukyV4eqQ';
var url = 'https://b.tiles.mapbox.com/v4/' + ids + '/{z}/{x}/{y}.vector.pbf?access_token=' + token;

var result = {};

runStats(url, processTile, publishStats, {
    width: 2880,
    height: 1800,
    minZoom: 0,
    maxZoom: 16,
    center: [-77.032751, 38.912792]
});

function processTile(body, z) {
    result[z] = (result[z] || 0) + body.length;
}

function publishStats() {
    console.log(JSON.stringify(result, null, 2));
}
