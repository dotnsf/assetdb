//. db.js
var express = require( 'express' ),
    bodyParser = require( 'body-parser' ),
    { v4: uuidv4 } = require( 'uuid' ),
    api = express();

var PG = require( 'pg' );
var database_url = 'DATABASE_URL' in process.env ? process.env.DATABASE_URL : ''; 
var pg = null;
if( database_url ){
  console.log( 'database_url = ' + database_url );
  pg = new PG.Pool({
    connectionString: database_url,
    idleTimeoutMillis: ( 3 * 86400 * 1000 )
  });
  pg.on( 'error', function( err ){
    console.log( 'error on working', err );
    if( err.code && err.code.startsWith( '5' ) ){
      try_reconnect( 1000 );
    }
  });
}

function try_reconnect( ts ){
  setTimeout( function(){
    console.log( 'reconnecting...' );
    pg = new PG.Pool({
      connectionString: database_url,
      //ssl: { require: true, rejectUnauthorized: false },
      idleTimeoutMillis: ( 3 * 86400 * 1000 )
    });
    pg.on( 'error', function( err ){
      console.log( 'error on retry(' + ts + ')', err );
      if( err.code && err.code.startsWith( '5' ) ){
        ts = ( ts < 10000 ? ( ts + 1000 ) : ts );
        try_reconnect( ts );
      }
    });
  }, ts );
}

var settings_cors = 'CORS' in process.env ? process.env.CORS : '';
api.all( '/*', function( req, res, next ){
  if( settings_cors ){
    res.setHeader( 'Access-Control-Allow-Origin', settings_cors );
    res.setHeader( 'Vary', 'Origin' );
  }
  next();
});


api.use( bodyParser.urlencoded( { extended: true, limit: '50mb' } ) );
api.use( bodyParser.json( { limit: '50mb' }) );
api.use( express.Router() );

//. Create
api.createAsset = async function( asset ){
  return new Promise( async ( resolve, reject ) => {
    if( pg ){
      var conn = await pg.connect();
      if( conn ){
        try{
          var sql = 'insert into assets( id, name, name_a, name_b, created, updated ) values ( $1, $2, $3, $4, $5, $6 )';
          if( !asset.id ){
            asset.id = uuidv4();
          }
          var t = ( new Date() ).getTime();
          asset.created = t;
          asset.updated = t;
          var query = { text: sql, values: [ asset.id, asset.name, asset.name_a, asset.name_b, asset.created, asset.updated ] };
          conn.query( query, async function( err, result ){
            if( err ){
              console.log( err );
              resolve( { status: false, error: err } );
            }else{
              //. #1
              var snapshot = await api.createSnapshot( 'createAsset' );

              resolve( { status: true, result: result } );
            }
          });
        }catch( e ){
          console.log( e );
          resolve( { status: false, error: err } );
        }finally{
          if( conn ){
            conn.release();
          }
        }
      }else{
        resolve( { status: false, error: 'no connection.' } );
      }
    }else{
      resolve( { status: false, error: 'db not ready.' } );
    }
  });
};

//. Read
api.readAsset = async function( asset_id ){
  return new Promise( async ( resolve, reject ) => {
    if( pg ){
      var conn = await pg.connect();
      if( conn ){
        try{
          var sql = 'select * from assets where id = $1';
          var query = { text: sql, values: [ asset_id ] };
          conn.query( query, function( err, result ){
            if( err ){
              console.log( err );
              resolve( { status: false, error: err } );
            }else{
              if( result && result.rows && result.rows.length > 0 ){
                resolve( { status: true, asset: result.rows[0] } );
              }else{
                resolve( { status: false, error: 'no data' } );
              }
            }
          });
        }catch( e ){
          console.log( e );
          resolve( { status: false, error: err } );
        }finally{
          if( conn ){
            conn.release();
          }
        }
      }else{
        resolve( { status: false, error: 'no connection.' } );
      }
    }else{
      resolve( { status: false, error: 'db not ready.' } );
    }
  });
};

//. Reads
api.readAssets = async function(){
  return new Promise( async ( resolve, reject ) => {
    if( pg ){
      var conn = await pg.connect();
      if( conn ){
        try{
          var sql = 'select * from assets order by created desc';
          var query = { text: sql, values: [] };
          conn.query( query, function( err, result ){
            if( err ){
              console.log( err );
              resolve( { status: false, error: err } );
            }else{
              if( result && result.rows ){
                resolve( { status: true, assets: result.rows } );
              }else{
                resolve( { status: false, error: 'no data' } );
              }
            }
          });
        }catch( e ){
          console.log( e );
          resolve( { status: false, error: err } );
        }finally{
          if( conn ){
            conn.release();
          }
        }
      }else{
        resolve( { status: false, error: 'no connection.' } );
      }
    }else{
      resolve( { status: false, error: 'db not ready.' } );
    }
  });
};

//. Plus
api.plusAsset = async function( asset ){
  return new Promise( async ( resolve, reject ) => {
    if( pg ){
      var conn = await pg.connect();
      if( conn ){
        try{
          var sql = 'update assets set num_a = num_a + $1, num_b = num_b + $2, updated = $3 where id = $4';
          var t = ( new Date() ).getTime();
          asset.updated = t;
          var query = { text: sql, values: [ asset.num_a, asset.num_b, asset.updated, asset.id ] };
          conn.query( query, async function( err, result ){
            if( err ){
              console.log( err );
              resolve( { status: false, error: err } );
            }else{
              //. #1
              var snapshot = await api.createSnapshot( 'plusAsset' );

              resolve( { status: true, result: result } );
            }
          });
        }catch( e ){
          console.log( e );
          resolve( { status: false, error: err } );
        }finally{
          if( conn ){
            conn.release();
          }
        }
      }else{
        resolve( { status: false, error: 'no connection.' } );
      }
    }else{
      resolve( { status: false, error: 'db not ready.' } );
    }
  });
};

//. Minus
api.minusAsset = async function( asset ){
  return new Promise( async ( resolve, reject ) => {
    if( pg ){
      var conn = await pg.connect();
      if( conn ){
        try{
          var sql = 'update assets set num_a = num_a - $1, num_b = num_b - $2, updated = $3 where id = $4';
          var t = ( new Date() ).getTime();
          asset.updated = t;
          var query = { text: sql, values: [ asset.num_a, asset.num_b, asset.updated, asset.id ] };
          conn.query( query, async function( err, result ){
            if( err ){
              console.log( err );
              resolve( { status: false, error: err } );
            }else{
              //. #1
              var snapshot = await api.createSnapshot( 'minusAsset' );

              resolve( { status: true, result: result } );
            }
          });
        }catch( e ){
          console.log( e );
          resolve( { status: false, error: err } );
        }finally{
          if( conn ){
            conn.release();
          }
        }
      }else{
        resolve( { status: false, error: 'no connection.' } );
      }
    }else{
      resolve( { status: false, error: 'db not ready.' } );
    }
  });
};

//. Consume (%)
api.consumeAssetPercent = async function( asset_id, percent ){
  return new Promise( async ( resolve, reject ) => {
    if( pg ){
      var conn = await pg.connect();
      if( conn ){
        try{
          var sql = 'update assets set num_a = num_a * $1 / 100, num_b = num_b * $2 / 100, updated = $3 where id = $4';
          var t = ( new Date() ).getTime();
          var query = { text: sql, values: [ percent, percent, t, asset_id ] };
          conn.query( query, async function( err, result ){
            if( err ){
              console.log( err );
              resolve( { status: false, error: err } );
            }else{
              //. #1
              var snapshot = await api.createSnapshot( 'consumeAssetPercent' );

              resolve( { status: true, result: result } );
            }
          });
        }catch( e ){
          console.log( e );
          resolve( { status: false, error: err } );
        }finally{
          if( conn ){
            conn.release();
          }
        }
      }else{
        resolve( { status: false, error: 'no connection.' } );
      }
    }else{
      resolve( { status: false, error: 'db not ready.' } );
    }
  });
};

//. Consume (amount)
api.consumeAssetAmount = async function( asset_id, amount ){
  return new Promise( async ( resolve, reject ) => {
    if( pg ){
      var conn = await pg.connect();
      if( conn ){
        try{
          var r = await api.readAsset( asset_id );
          if( r && r.status ){
            var asset = r.asset;
            var num_a = asset.num_a;
            var num_b = asset.num_b;
            if( typeof num_a == 'string' ){ num_a = parseInt( num_a ); }
            if( typeof num_b == 'string' ){ num_b = parseInt( num_b ); }
            var num = num_a + num_b;
            var amount_a = amount * Math.round( num_a / num );
            var amount_b = amount * Math.round( num_b / num );

            var sql = 'update assets set num_a = num_a - $1, num_b = num_b - $2, updated = $3 where id = $4';
            var t = ( new Date() ).getTime();
            var query = { text: sql, values: [ amount_a, amount_b, t, asset_id ] };
            conn.query( query, async function( err, result ){
              if( err ){
                console.log( err );
                resolve( { status: false, error: err } );
              }else{
                //. #1
                var snapshot = await api.createSnapshot( 'consumeAssetAmount' );

                resolve( { status: true, asset: result } );
              }
            });
          }else{
            resolve( { status: false, error: 'not found for id = ' + asset_id } );
          }
        }catch( e ){
          console.log( e );
          resolve( { status: false, error: err } );
        }finally{
          if( conn ){
            conn.release();
          }
        }
      }else{
        resolve( { status: false, error: 'no connection.' } );
      }
    }else{
      resolve( { status: false, error: 'db not ready.' } );
    }
  });
};

//. Transport
api.transportAsset = async function( asset_id_from, asset_id_to, amount ){
  return new Promise( async ( resolve, reject ) => {
    if( pg ){
      var conn = await pg.connect();
      if( conn ){
        try{
          var r = await api.readAsset( asset_id_from );
          if( r && r.status ){
            var asset = r.asset;
            var num_a = asset.num_a;
            var num_b = asset.num_b;
            if( typeof num_a == 'string' ){ num_a = parseInt( num_a ); }
            if( typeof num_b == 'string' ){ num_b = parseInt( num_b ); }
            var num = num_a + num_b;
            var amount_a = Math.round( amount * num_a / num );
            var amount_b = Math.round( amount * num_b / num );

            var r1 = await api.minusAsset( { id: asset_id_from, num_a: amount_a, num_b: amount_b } );
            if( r1 && r1.status ){
              var r2 = await api.plusAsset( { id: asset_id_to, num_a: amount_a, num_b: amount_b } );
              if( r2 && r2.status ){
                //. #1
                var snapshot = await api.createSnapshot( 'transportAsset' );

                resolve( { status: true, asset_from: r1, asset_to: r2 } );
              }else{
                resolve( r2 );
              }
            }else{
              resolve( r1 );
            }
          }else{
            resolve( { status: false, error: 'not found for id = ' + asset_id_from } );
          }
        }catch( e ){
          console.log( e );
          resolve( { status: false, error: err } );
        }finally{
          if( conn ){
            conn.release();
          }
        }
      }else{
        resolve( { status: false, error: 'no connection.' } );
      }
    }else{
      resolve( { status: false, error: 'db not ready.' } );
    }
  });
};

//. Reset
api.resetAsset = async function( asset_id ){
  return new Promise( async ( resolve, reject ) => {
    if( pg ){
      var conn = await pg.connect();
      if( conn ){
        try{
          var sql = 'update assets set num_a = 0, num_b = 0, updated = $1 where id = $2';
          var t = ( new Date() ).getTime();
          var query = { text: sql, values: [ t, asset_id ] };
          conn.query( query, async function( err, result ){
            if( err ){
              console.log( err );
              resolve( { status: false, error: err } );
            }else{
              //. #1
              var snapshot = await api.createSnapshot( 'resetAsset' );

              resolve( { status: true, result: result } );
            }
          });
        }catch( e ){
          console.log( e );
          resolve( { status: false, error: err } );
        }finally{
          if( conn ){
            conn.release();
          }
        }
      }else{
        resolve( { status: false, error: 'no connection.' } );
      }
    }else{
      resolve( { status: false, error: 'db not ready.' } );
    }
  });
};

//. Resets
api.resetAssets = async function(){
  return new Promise( async ( resolve, reject ) => {
    if( pg ){
      var conn = await pg.connect();
      if( conn ){
        try{
          var sql = 'update assets set num_a = 0, num_b = 0, updated = $1';
          var t = ( new Date() ).getTime();
          var query = { text: sql, values: [ t ] };
          conn.query( query, async function( err, result ){
            if( err ){
              console.log( err );
              resolve( { status: false, error: err } );
            }else{
              //. #1
              var snapshot = await api.createSnapshot( 'resetAssets' );

              resolve( { status: true, result: result } );
            }
          });
        }catch( e ){
          console.log( e );
          resolve( { status: false, error: err } );
        }finally{
          if( conn ){
            conn.release();
          }
        }
      }else{
        resolve( { status: false, error: 'no connection.' } );
      }
    }else{
      resolve( { status: false, error: 'db not ready.' } );
    }
  });
};

//. Remove
api.removeAsset = async function( asset_id ){
  return new Promise( async ( resolve, reject ) => {
    if( pg ){
      var conn = await pg.connect();
      if( conn ){
        try{
          var sql = 'delete from assets where id = $1';
          var query = { text: sql, values: [ asset_id ] };
          conn.query( query, async function( err, result ){
            if( err ){
              console.log( err );
              resolve( { status: false, error: err } );
            }else{
              //. #1
              var snapshot = await api.createSnapshot( 'removeAsset' );

              resolve( { status: true, result: result } );
            }
          });
        }catch( e ){
          console.log( e );
          resolve( { status: false, error: err } );
        }finally{
          if( conn ){
            conn.release();
          }
        }
      }else{
        resolve( { status: false, error: 'no connection.' } );
      }
    }else{
      resolve( { status: false, error: 'db not ready.' } );
    }
  });
};

//. Removes
api.removeAssets = async function(){
  return new Promise( async ( resolve, reject ) => {
    if( pg ){
      var conn = await pg.connect();
      if( conn ){
        try{
          var sql = 'delete from assets';
          var query = { text: sql, values: [] };
          conn.query( query, async function( err, result ){
            if( err ){
              console.log( err );
              resolve( { status: false, error: err } );
            }else{
              //. #1
              var snapshot = await api.createSnapshot( 'removeAssets' );

              resolve( { status: true, result: result } );
            }
          });
        }catch( e ){
          console.log( e );
          resolve( { status: false, error: err } );
        }finally{
          if( conn ){
            conn.release();
          }
        }
      }else{
        resolve( { status: false, error: 'no connection.' } );
      }
    }else{
      resolve( { status: false, error: 'db not ready.' } );
    }
  });
};


//. Create
api.createSnapshot = async function( memo = '' ){
  return new Promise( async ( resolve, reject ) => {
    if( pg ){
      var conn = await pg.connect();
      if( conn ){
        try{
          var r = await api.readAssets();
          if( r && r.status ){
            if( r.assets.length == 0 ){
              resolve( { status: true, count: 0 } );
            }else{
              var key = uuidv4();
              var count = 0;
              for( var i = 0; i < r.assets.length; i ++ ){
                var sql = 'insert into snapshots( id, key, asset_id, num_a, num_b, memo, created, updated ) values ( $1, $2, $3, $4, $5, $6, $7, $8 )';
                var id = uuidv4();
                var t = ( new Date() ).getTime();
                var query = { text: sql, values: [ id, key, r.assets[i].id, r.assets[i].num_a, r.assets[i].num_b, memo, t, t ] };
                conn.query( query, function( err, result ){
                  if( err ){ console.log( err ); }
                  count ++;
                  if( count == r.assets.length ){
                    resolve( { status: true, count: count } );
                  }
                });
              }
            }
          }else{
            resolve( r );
          }
        }catch( e ){
          console.log( e );
          resolve( { status: false, error: err } );
        }finally{
          if( conn ){
            conn.release();
          }
        }
      }else{
        resolve( { status: false, error: 'no connection.' } );
      }
    }else{
      resolve( { status: false, error: 'db not ready.' } );
    }
  });
};

//. Reads
api.readSnapshots = async function(){
  return new Promise( async ( resolve, reject ) => {
    if( pg ){
      var conn = await pg.connect();
      if( conn ){
        try{
          var sql = 'select * from snapshots order by created desc';
          var query = { text: sql, values: [] };
          conn.query( query, function( err, result ){
            if( err ){
              console.log( err );
              resolve( { status: false, error: err } );
            }else{
              if( result && result.rows ){
                resolve( { status: true, snapshots: result.rows } );
              }else{
                resolve( { status: false, error: 'no data' } );
              }
            }
          });
        }catch( e ){
          console.log( e );
          resolve( { status: false, error: err } );
        }finally{
          if( conn ){
            conn.release();
          }
        }
      }else{
        resolve( { status: false, error: 'no connection.' } );
      }
    }else{
      resolve( { status: false, error: 'db not ready.' } );
    }
  });
};

//. Removes
api.removeSnapshots = async function(){
  return new Promise( async ( resolve, reject ) => {
    if( pg ){
      var conn = await pg.connect();
      if( conn ){
        try{
          var sql = 'delete from snapshots';
          var query = { text: sql, values: [] };
          conn.query( query, function( err, result ){
            if( err ){
              console.log( err );
              resolve( { status: false, error: err } );
            }else{
              resolve( { status: true, result: result } );
            }
          });
        }catch( e ){
          console.log( e );
          resolve( { status: false, error: err } );
        }finally{
          if( conn ){
            conn.release();
          }
        }
      }else{
        resolve( { status: false, error: 'no connection.' } );
      }
    }else{
      resolve( { status: false, error: 'db not ready.' } );
    }
  });
};




//. Create
api.post( '/create_asset', async function( req, res ){
  res.contentType( 'application/json; charset=utf-8' );

  var asset = req.body;
  api.createAsset( asset ).then( function( result ){
    res.status( result.status ? 200 : 400 );
    res.write( JSON.stringify( result, null, 2 ) );
    res.end();
  });
});

//. Read
api.get( '/read_asset/:asset_id', async function( req, res ){
  res.contentType( 'application/json; charset=utf-8' );

  var asset_id = req.params.asset_id;
  api.readAsset( asset_id ).then( function( result ){
    res.status( result.status ? 200 : 400 );
    res.write( JSON.stringify( result, null, 2 ) );
    res.end();
  });
});

//. Reads
api.get( '/read_assets', async function( req, res ){
  res.contentType( 'application/json; charset=utf-8' );

  api.readAssets().then( function( result ){
    res.status( result.status ? 200 : 400 );
    res.write( JSON.stringify( result, null, 2 ) );
    res.end();
  });
});

//. Plus
api.post( '/plus_asset', async function( req, res ){
  res.contentType( 'application/json; charset=utf-8' );

  var asset = req.body;
  api.plusAsset( asset ).then( function( result ){
    res.status( result.status ? 200 : 400 );
    res.write( JSON.stringify( result, null, 2 ) );
    res.end();
  });
});

//. Minus
api.post( '/minus_asset', async function( req, res ){
  res.contentType( 'application/json; charset=utf-8' );

  var asset = req.body;
  api.minusAsset( asset ).then( function( result ){
    res.status( result.status ? 200 : 400 );
    res.write( JSON.stringify( result, null, 2 ) );
    res.end();
  });
});

//. Consume(%)
api.post( '/consume_asset_percent/:asset_id', async function( req, res ){
  res.contentType( 'application/json; charset=utf-8' );

  var asset_id = req.params.asset_id;
  var percent = req.body.percent;
  api.consumeAssetPercent( asset_id, percent ).then( function( result ){
    res.status( result.status ? 200 : 400 );
    res.write( JSON.stringify( result, null, 2 ) );
    res.end();
  });
});

//. Consume(amount)
api.post( '/consume_asset_amount/:asset_id', async function( req, res ){
  res.contentType( 'application/json; charset=utf-8' );

  var asset_id = req.params.asset_id;
  var amount = req.body.amount;
  api.consumeAssetAmount( asset_id, amount ).then( function( result ){
    res.status( result.status ? 200 : 400 );
    res.write( JSON.stringify( result, null, 2 ) );
    res.end();
  });
});

//. Transport
api.post( '/transport_asset/:asset_id_from/:asset_id_to', async function( req, res ){
  res.contentType( 'application/json; charset=utf-8' );

  var asset_id_from = req.params.asset_id_from;
  var asset_id_to = req.params.asset_id_to;
  var amount = req.body.amount;
  api.transportAsset( asset_id_from, asset_id_to, amount ).then( function( result ){
    res.status( result.status ? 200 : 400 );
    res.write( JSON.stringify( result, null, 2 ) );
    res.end();
  });
});

//. Reset
api.post( '/reset_asset/:asset_id', async function( req, res ){
  res.contentType( 'application/json; charset=utf-8' );

  var asset_id = req.params.asset_id;
  api.resetAsset( asset_id ).then( function( result ){
    res.status( result.status ? 200 : 400 );
    res.write( JSON.stringify( result, null, 2 ) );
    res.end();
  });
});

//. Resets
api.post( '/reset_assets', async function( req, res ){
  res.contentType( 'application/json; charset=utf-8' );

  api.resetAssets().then( function( result ){
    res.status( result.status ? 200 : 400 );
    res.write( JSON.stringify( result, null, 2 ) );
    res.end();
  });
});

//. Remove
api.delete( '/remove_asset/:asset_id', async function( req, res ){
  res.contentType( 'application/json; charset=utf-8' );

  var asset_id = req.params.asset_id;
  api.removeAsset( asset_id ).then( function( result ){
    res.status( result.status ? 200 : 400 );
    res.write( JSON.stringify( result, null, 2 ) );
    res.end();
  });
});

//. Removes
api.delete( '/remove_assets', async function( req, res ){
  res.contentType( 'application/json; charset=utf-8' );

  api.removeAssets().then( function( result ){
    res.status( result.status ? 200 : 400 );
    res.write( JSON.stringify( result, null, 2 ) );
    res.end();
  });
});

//. Reads
api.get( '/read_snapshots', async function( req, res ){
  res.contentType( 'application/json; charset=utf-8' );

  api.readSnapshots().then( function( result ){
    res.status( result.status ? 200 : 400 );
    res.write( JSON.stringify( result, null, 2 ) );
    res.end();
  });
});

//. Removes
api.delete( '/remove_snapshots', async function( req, res ){
  res.contentType( 'application/json; charset=utf-8' );

  api.removeSnapshots().then( function( result ){
    res.status( result.status ? 200 : 400 );
    res.write( JSON.stringify( result, null, 2 ) );
    res.end();
  });
});


//. api をエクスポート
module.exports = api;
