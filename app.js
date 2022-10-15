//. app.js
var express = require( 'express' ),
    app = express();

require( 'dotenv' ).config();

var db = require( './api/db' );
app.use( '/api/db', db );

app.use( express.Router() );
app.use( express.static( __dirname + '/public' ) );

app.set( 'views', __dirname + '/views' );
app.set( 'view engine', 'ejs' );


app.get( '/', function( req, res ){
  res.contentType( 'application/json; charset=utf-8' );
  res.write( JSON.stringify( { status: true }, null, 2 ) );
  res.end();
});

var http_port = process.env.PORT || 8080;
app.listen( http_port );
console.log( "server starting on " + http_port + " ..." );

module.exports = app;
