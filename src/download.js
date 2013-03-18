//@ sourceMappingURL=download.map
// Generated by CoffeeScript 1.6.1
(function() {
  var GDrive, Q, clientId, clientSecret, folderId, fs, gdrive, path, request, _ref;

  GDrive = require('./grive');

  fs = require('fs');

  path = require('path');

  request = require('request');

  Q = require('q');

  try {
    require('source-map-support').install();
  } catch (e) {

  }

  _ref = process.argv, clientId = _ref[2], clientSecret = _ref[3], folderId = _ref[4];

  if (!clientId) {
    console.log('node path-to-grivejs/src/download.js clientId clientSecret folderId');
  }

  gdrive = new GDrive({
    clientId: clientId,
    clientSecret: clientSecret,
    redirectUrl: 'urn:ietf:wg:oauth:2.0:oob'
  }, function(error, client) {
    var drive, folders, onNode;
    if (error) {
      console.error(error);
      return;
    }
    drive = gdrive.client.drive;
    folders = {};
    onNode = function(node, nodePathArray) {
      var link, nodePath, parentPromise, promise, req, _ref1;
      nodePath = path.join.apply(null, ['out'].concat(nodePathArray, node.title));
      if (nodePathArray.length) {
        parentPromise = folders[nodePathArray.slice(0, -1).join('/')];
      }
      if (node.mimeType === gdrive.mimeTypes.folder) {
        promise = Q.nfcall(fs.mkdir, nodePath);
        folders[nodePathArray.join('/')] = (parentPromise != null ? parentPromise.then(promise) : void 0) || promise;
      } else {
        if (link = (_ref1 = node.exportLinks) != null ? _ref1['text/html'] : void 0) {
          nodePath += '.html';
        } else if (link = node.downloadUrl) {

        } else {
          return;
        }
        req = request({
          uri: link,
          qs: {
            access_token: gdrive.oauth2Client.access_token
          }
        });
        if (parentPromise != null) {
          parentPromise.done(function() {
            var stream;
            stream = req.pipe(fs.createWriteStream(nodePath));
            return stream.on('error', console.log.bind(console, nodePath));
          });
        }
      }
      return console.log('node', nodePath);
    };
    return gdrive.scanDir(folderId, onNode, console.log.bind(console, 'finish'));
  });

}).call(this);