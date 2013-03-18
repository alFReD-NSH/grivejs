//@ sourceMappingURL=grive.map
// Generated by CoffeeScript 1.6.1
(function() {
  var EventEmitter, GDrive, OAuth2Client, async, fs, getAuthCode, googleapis, readline, request, util, _;

  async = require('async');

  request = require('request');

  _ = require('lodash');

  googleapis = require('googleapis');

  readline = require('readline');

  fs = require('fs');

  util = require('util');

  EventEmitter = require('events').EventEmitter;

  OAuth2Client = googleapis.OAuth2Client;

  GDrive = function(_arg, next) {
    var clientId, clientSecret, redirectUrl,
      _this = this;
    clientId = _arg.clientId, clientSecret = _arg.clientSecret, redirectUrl = _arg.redirectUrl;
    EventEmitter.call(this);
    this.oauth2Client = new OAuth2Client(clientId, clientSecret, redirectUrl);
    this.execute = this.execute.bind(this);
    return async.parallel([
      this.getCredentials.bind(this), function(next) {
        console.log('getting api');
        return googleapis.load('drive', 'v2', next);
      }
    ], function(error, _arg1) {
      _this.client = _arg1[1];
      console.log('both donw');
      return next(error, _this.client);
    });
  };

  util.inherits(GDrive, EventEmitter);

  GDrive.prototype.getCredentials = function(next) {
    var oc, url,
      _this = this;
    oc = this.oauth2Client;
    try {
      oc.credentials = require('../credentials.json');
      return next();
    } catch (e) {
      url = oc.generateAuthUrl({
        access_type: 'offline',
        scope: 'https://www.googleapis.com/auth/drive'
      });
      return async.waterfall([
        _.partial(getAuthCode, url), oc.getToken.bind(oc), function(res, conn, next) {
          console.log('writing file');
          oc.credentials = res;
          console.time('file');
          return fs.writeFile('credentials.json', JSON.stringify(res), next);
        }
      ], next);
    }
  };

  getAuthCode = function(url, next) {
    var i;
    i = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    console.log(url);
    return i.question("Please try this shit in your browser and paste the url here:", _.partial(next, null));
  };

  GDrive.prototype.execute = function(req, next) {
    return req.withAuthClient(this.oauth2Client).execute(next);
  };

  GDrive.prototype.scanDir = function(folderId, onNode, next, path) {
    var client,
      _this = this;
    if (path == null) {
      path = [];
    }
    client = this.client;
    return async.waterfall([
      _.partial(this.execute, client.drive.children.list({
        folderId: folderId
      })), function(result, response, next) {
        var req;
        req = client.newBatchRequest();
        if (result.items) {
          result.items.forEach(function(child) {
            return req.add(client.drive.files.get({
              fileId: child.id
            }));
          });
          return _this.execute(req, next);
        } else {
          return next(null, [], null);
        }
      }, function(results, response, next) {
        return async.each(_.compact(results), function(result, next) {
          var newPath;
          onNode(result, path);
          if (result.mimeType = _this.mimeTypes.folder) {
            newPath = path.slice();
            newPath.push(result.title);
            return _this.scanDir(result.id, onNode, next, newPath);
          } else {
            return next();
          }
        }, next);
      }
    ], next);
  };

  GDrive.prototype.mimeTypes = {
    folder: 'application/vnd.google-apps.folder'
  };

  module.exports = GDrive;

}).call(this);