const readline = require('readline');
const fs = require('fs');
const through = require('through2');
const concat = require('concat-stream');

function lineToJSON(lineString) {
  try {
    var line = lineString.trim();
    if (line[line.length - 1] == ',')
      return JSON.parse(line.slice(0, line.length - 1));
    else
      return JSON.parse(line);
  } catch (err) {
    return {};
  }
}

function matchInReadStream(matchFun, stream, cb) {
  var match = null;

  stream.on('line', (line) => {
    var feature = lineToJSON(line);
    if (matchFun(feature)) {
      match = feature;
      stream.close();
    }
  });

  stream.on('close', () => {
    cb(null, match);
  });
}

function findState(query, cb) {
  var db = readline.createInterface({
    input: fs.createReadStream(__dirname + '/../data/states.json')
  });
  var match = (obj) => (obj.properties && obj.properties.NOM_ENT == query);
  matchInReadStream(match, db, function (err, data) {
    cb(err, data);
  });
}

function findMunicipality(query, cb) {
  var db = readline.createInterface({
    input: fs.createReadStream(__dirname + '/../data/municipalities.json')
  });
  var match = (obj) => (obj.properties && obj.properties.NOM_MUN == query);
  matchInReadStream(match, db, function (err, data) {
    cb(err, data);
  });
}

// through2 streamers

function toStatePolygon() {
  return through((buf, _, next) => {
    var line = buf.toString();
    var name = line.split(',')[0];

    findState(name, function (err, data) {
      if (!err && data) next(null, JSON.stringify(data) + '\n');
      else next();
    });
  });
}

/**
 * Returns a stringified GeoJSON FeatureCollection
 * @param {features} a string buffer delimited by line-breaks
 */
function toFeatureCollection(features) {
  // Note: trim trailing line-break
  var f = features.trim().split('\n').join(',\n');
  return '{"type":"FeatureCollection","features":[\n' + f + '\n]}';
}

// concat-streamers

function concatFeatureCollection() {
  return concat(function (body) {
    console.log(toFeatureCollection(body.toString()));
  });
}

module.exports = {
  concatFeatureCollection: concatFeatureCollection,
  findMunicipality: findMunicipality,
  findState: findState,
  lineToJSON: lineToJSON,
  matchInReadStream: matchInReadStream,
  toFeatureCollection: toFeatureCollection,
  toStatePolygon: toStatePolygon
}
