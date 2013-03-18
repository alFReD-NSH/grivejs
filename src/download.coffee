GDrive  = require './grive'
fs      = require 'fs'
path    = require 'path'
request = require 'request'
Q       = require 'q'

try
    require('source-map-support').install()
catch e

{ 2: clientId, 3: clientSecret, 4: folderId } = process.argv

if !clientId
    console.log 'node path-to-grivejs/src/download.js clientId clientSecret folderId'

gdrive = new GDrive { clientId, clientSecret, redirectUrl: 'urn:ietf:wg:oauth:2.0:oob' }, (error, client) ->
    if error
        console.error error
        return
    drive = gdrive.client.drive
    folders = {}
    onNode = (node, nodePathArray) ->
        nodePath = path.join.apply null, ['out'].concat nodePathArray, node.title
        if nodePathArray.length
            parentPromise = folders[nodePathArray.slice(0, -1).join '/']
        if (node.mimeType is gdrive.mimeTypes.folder)
            promise = Q.nfcall(fs.mkdir, nodePath)
            folders[nodePathArray.join '/'] = (parentPromise?.then promise) or promise
        else
            if link = node.exportLinks?['text/html']
                nodePath += '.html'
            else if link = node.downloadUrl
            else return
            req = request
                uri: link,
                qs:
                    access_token: gdrive.oauth2Client.access_token
            parentPromise?.done ->
                stream = req.pipe fs.createWriteStream nodePath
                stream.on 'error', console.log.bind console, nodePath
        console.log 'node', nodePath
    gdrive.scanDir folderId, onNode, console.log.bind(console, 'finish')