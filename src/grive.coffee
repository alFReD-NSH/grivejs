async            = require 'async'
_                = require 'lodash'
googleapis       = require 'googleapis'
readline         = require 'readline'
fs               = require 'fs'
util             = require 'util'
{ EventEmitter } = require 'events'

OAuth2Client = googleapis.OAuth2Client;

GDrive = ({clientId, clientSecret, redirectUrl}, next) ->
    EventEmitter.call @
    @oauth2Client = new OAuth2Client clientId, clientSecret, redirectUrl
    @execute = @execute.bind @

    async.parallel [
        @getCredentials.bind(@),
        (next) ->
            console.log 'getting api'
            googleapis.load 'drive', 'v2', next
    ], (error, {1: @client }) =>
        console.log 'both donw'
        next error, @client

util.inherits GDrive, EventEmitter

GDrive::getCredentials = (next) ->
    oc = @oauth2Client
    try
        oc.credentials = require '../credentials.json'
        next()
    catch e
        url = oc.generateAuthUrl
          access_type: 'offline',
          scope: 'https://www.googleapis.com/auth/drive'
    
        async.waterfall [
            _.partial(getAuthCode, url)
            oc.getToken.bind(oc)
            (res, conn, next) =>
                console.log 'writing file'
                oc.credentials = res
                console.time 'file'
                fs.writeFile 'credentials.json', JSON.stringify(res), next
        ], next

getAuthCode = (url, next) ->
    i = readline.createInterface
        input: process.stdin
        output: process.stdout
    console.log url
    i.question "Please try this shit in your browser and paste the url here:",
        _.partial next, null

GDrive::execute = (req, next) ->
    req.withAuthClient(@oauth2Client)
        .execute(next)

GDrive::scanDir = (folderId, onNode, next, path=[]) ->
    { client } = @
    async.waterfall [
        _.partial @execute, client.drive.children.list({ folderId })
        (result, response, next) =>
            req = client.newBatchRequest()
            if result.items
                result.items.forEach (child) ->
                    req.add client.drive.files.get fileId: child.id
                @execute req, next
            else next null, [], null
        (results, response, next) =>
            async.each _.compact(results), (result, next) =>
                onNode result, path
                if result.mimeType = @mimeTypes.folder
                    newPath = path.slice()
                    newPath.push result.title
                    @scanDir result.id, onNode, next, newPath
                else
                    next()
            , next
    ], next

GDrive::mimeTypes =
    folder: 'application/vnd.google-apps.folder'
    html: 'text/html'

module.exports = GDrive