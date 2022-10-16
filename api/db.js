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
api.createFacility = async function( facility ){
  return new Promise( async ( resolve, reject ) => {
    if( pg ){
      var conn = await pg.connect();
      if( conn ){
        try{
          var sql = 'insert into facilities( id, name, asset_a_name, asset_b_name, asset_max, created, updated ) values ( $1, $2, $3, $4, $5, $6, $7 )';
          if( !facility.id ){
            facility.id = uuidv4();
          }
          var t = ( new Date() ).getTime();
          var query = { text: sql, values: [ facility.id, facility.name, facility.asset_a_name, facility.asset_a_name, facility.asset_max, t, t ] };
          conn.query( query, async function( err, result ){
            if( err ){
              console.log( err );
              resolve( { status: false, error: err } );
            }else{
              //. #1
              var snapshot = await api.createSnapshot( 'createFacility' );

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
api.readFacility = async function( facility_id ){
  return new Promise( async ( resolve, reject ) => {
    if( pg ){
      var conn = await pg.connect();
      if( conn ){
        try{
          var sql = 'select * from facilities where id = $1';
          var query = { text: sql, values: [ facility_id ] };
          conn.query( query, function( err, result ){
            if( err ){
              console.log( err );
              resolve( { status: false, error: err } );
            }else{
              if( result && result.rows && result.rows.length > 0 ){
                resolve( { status: true, facility: result.rows[0] } );
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
api.readFacilities = async function(){
  return new Promise( async ( resolve, reject ) => {
    if( pg ){
      var conn = await pg.connect();
      if( conn ){
        try{
          var sql = 'select * from facilities order by created desc';
          var query = { text: sql, values: [] };
          conn.query( query, function( err, result ){
            if( err ){
              console.log( err );
              resolve( { status: false, error: err } );
            }else{
              if( result && result.rows ){
                resolve( { status: true, facilities: result.rows } );
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
api.plusAsset = async function( facility ){
  return new Promise( async ( resolve, reject ) => {
    if( pg ){
      var conn = await pg.connect();
      if( conn ){
        try{
          var r = await api.readFacility( facility.id );
          if( r && r.status ){
            var f = r.facility;
            var new_amount = facility.asset_a_num + facility.asset_b_num + f.asset_a_num + f.asset_b_num;
            if( f.asset_max == -1 || new_amount <= f.asset_max ){
              var sql = 'update facilities set asset_a_num = asset_a_num + $1, asset_b_num = asset_b_num + $2, updated = $3 where id = $4';
              var t = ( new Date() ).getTime();
              var query = { text: sql, values: [ facility.asset_a_num, facility.asset_b_num, t, facility.id ] };
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
            }else{
              resolve( { status: false, error: 'no enough space for asset' } );
            }
          }else{
            resolve( r );
          }
        }catch( e ){
          console.log( e );
          resolve( { status: false, error: e } );
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
api.minusAsset = async function( facility ){
  return new Promise( async ( resolve, reject ) => {
    if( pg ){
      var conn = await pg.connect();
      if( conn ){
        try{
          var r = await api.readFacility( facility.id );
          if( r && r.status ){
            var f = r.facility;
            var new_amount = f.asset_a_num + f.asset_b_num - facility.asset_a_num - facility.asset_b_num;
            if( new_amount >= 0 ){
              var sql = 'update facilities set asset_a_num = asset_a_num - $1, asset_b_num = asset_b_num - $2, updated = $3 where id = $4';
              var t = ( new Date() ).getTime();
              var query = { text: sql, values: [ facility.asset_a_num, facility.asset_b_num, t, facility.id ] };
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
            }else{
              resolve( { status: false, error: 'no enough asset for this transaction' } );
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

//. Consume (%)
api.consumeAssetPercent = async function( facility_id, percent ){
  return new Promise( async ( resolve, reject ) => {
    if( pg ){
      var conn = await pg.connect();
      if( conn ){
        try{
          if( typeof percent == 'string' ){
            parcent = parseFloat( percent );
          }

          if( percent < 0.0 || percent > 100.0 ){
            resolve( { status: false, error: 'percent have to be between 0.0 and 100.0.' } );
          }else{
            var sql = 'update facilities set asset_a_num = asset_a_num * $1 / 100, asset_b_num = asset_b_num * $2 / 100, updated = $3 where id = $4';
            var t = ( new Date() ).getTime();
            var query = { text: sql, values: [ percent, percent, t, facility_id ] };
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

//. Consume (amount)
api.consumeAssetAmount = async function( facility_id, amount ){
  return new Promise( async ( resolve, reject ) => {
    if( pg ){
      var conn = await pg.connect();
      if( conn ){
        try{
          var r = await api.readFacility( facility_id );
          if( r && r.status ){
            if( typeof amount == 'string' ){
              amount = parseInt( amount );
            }

            var facility = r.facility;
            var asset_a_num = facility.asset_a_num;
            var asset_b_num = facility.asset_b_num;
            if( typeof asset_a_num == 'string' ){ asset_a_num = parseInt( asset_a_num ); }
            if( typeof asset_b_num == 'string' ){ asset_b_num = parseInt( asset_b_num ); }

            var new_amount = asset_a_num + asset_b_num - amount;
            if( new_amount >= 0 ){
              var num = asset_a_num + asset_b_num;
              var amount_a = amount * Math.round( asset_a_num / num );
              var amount_b = amount * Math.round( asset_b_num / num );

              var sql = 'update facilities set asset_a_num = asset_a_num - $1, asset_b_num = asset_b_num - $2, updated = $3 where id = $4';
              var t = ( new Date() ).getTime();
              var query = { text: sql, values: [ amount_a, amount_b, t, facility_id ] };
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
              resolve( { status: false, error: 'no enough asset for this transaction' } );
            }
          }else{
            resolve( { status: false, error: 'not found for id = ' + facility_id } );
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
api.transportAsset = async function( facility_id_from, facility_id_to, amount ){
  return new Promise( async ( resolve, reject ) => {
    if( pg ){
      var conn = await pg.connect();
      if( conn ){
        try{
          if( typeof amount == 'string' ){
            amount = parseInt( amount );
          }

          var res1 = await api.readFacility( facility_id_from );
          var res2 = await api.readFacility( facility_id_to );
          if( res1 && res1.status && res2 && res2.status ){
            var facility = res1.facility;
            var from_asset_a_num = facility.asset_a_num;
            var from_asset_b_num = facility.asset_b_num;
            if( typeof from_asset_a_num == 'string' ){ from_asset_a_num = parseInt( from_asset_a_num ); }
            if( typeof from_asset_b_num == 'string' ){ from_asset_b_num = parseInt( from_asset_b_num ); }

            var new_amount_from = from_asset_a_num + from_asset_b_num - amount;
            if( new_amount_from >= 0 ){
              facility = res2.facility;
              var to_asset_a_num = facility.asset_a_num;
              var to_asset_b_num = facility.asset_b_num;
              if( typeof to_asset_a_num == 'string' ){ to_asset_a_num = parseInt( to_asset_a_num ); }
              if( typeof to_asset_b_num == 'string' ){ to_asset_b_num = parseInt( to_asset_b_num ); }

              var new_amount_to = to_asset_a_num + to_asset_b_num + amount;
              if( facility.asset_max == -1 || new_amount_to <= facility.asset_max ){
                var num = from_asset_a_num + from_asset_b_num;
                var amount_a = Math.round( amount * from_asset_a_num / num );
                var amount_b = Math.round( amount * from_asset_b_num / num );

                var r1 = await api.minusAsset( { id: facility_id_from, asset_a_num: amount_a, asset_b_num: amount_b } );
                if( r1 && r1.status ){
                  var r2 = await api.plusAsset( { id: facility_id_to, asset_a_num: amount_a, asset_b_num: amount_b } );
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
                resolve( { status: false, error: 'no enough space for this transaction' } );
              }
            }else{
              resolve( { status: false, error: 'no enough asset for this transaction' } );
            }
          }else{
            resolve( { status: false, error: 'not found for id = ' + facility_id_from + ', and/or ' + facility_id_to } );
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
api.resetFacility = async function( facility_id ){
  return new Promise( async ( resolve, reject ) => {
    if( pg ){
      var conn = await pg.connect();
      if( conn ){
        try{
          var sql = 'update facilities set asset_a_num = 0, asset_b_num = 0, updated = $1 where id = $2';
          var t = ( new Date() ).getTime();
          var query = { text: sql, values: [ t, facility_id ] };
          conn.query( query, async function( err, result ){
            if( err ){
              console.log( err );
              resolve( { status: false, error: err } );
            }else{
              //. #1
              var snapshot = await api.createSnapshot( 'resetFacility' );

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
api.resetFacilities = async function(){
  return new Promise( async ( resolve, reject ) => {
    if( pg ){
      var conn = await pg.connect();
      if( conn ){
        try{
          var sql = 'update facilities set asset_a_num = 0, asset_b_num = 0, updated = $1';
          var t = ( new Date() ).getTime();
          var query = { text: sql, values: [ t ] };
          conn.query( query, async function( err, result ){
            if( err ){
              console.log( err );
              resolve( { status: false, error: err } );
            }else{
              //. #1
              var snapshot = await api.createSnapshot( 'resetFacilities' );

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
api.removeFacility = async function( facility_id ){
  return new Promise( async ( resolve, reject ) => {
    if( pg ){
      var conn = await pg.connect();
      if( conn ){
        try{
          var sql = 'delete from facilities where id = $1';
          var query = { text: sql, values: [ facility_id ] };
          conn.query( query, async function( err, result ){
            if( err ){
              console.log( err );
              resolve( { status: false, error: err } );
            }else{
              //. #1
              var snapshot = await api.createSnapshot( 'removeFacility' );

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
api.removeFacilities = async function(){
  return new Promise( async ( resolve, reject ) => {
    if( pg ){
      var conn = await pg.connect();
      if( conn ){
        try{
          var sql = 'delete from facilities';
          var query = { text: sql, values: [] };
          conn.query( query, async function( err, result ){
            if( err ){
              console.log( err );
              resolve( { status: false, error: err } );
            }else{
              //. #1
              var snapshot = await api.createSnapshot( 'removeFacilities' );

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
          var r = await api.readFacilities();
          if( r && r.status ){
            if( r.facilities.length == 0 ){
              resolve( { status: true, count: 0 } );
            }else{
              var key = uuidv4();
              var count = 0;
              for( var i = 0; i < r.facilities.length; i ++ ){
                var sql = 'insert into snapshots( id, key, facility_id, asset_a_num, asset_b_num, memo, created, updated ) values ( $1, $2, $3, $4, $5, $6, $7, $8 )';
                var id = uuidv4();
                var t = ( new Date() ).getTime();
                var query = { text: sql, values: [ id, key, r.facilities[i].id, r.facilities[i].asset_a_num, r.facilities[i].asset_b_num, memo, t, t ] };
                conn.query( query, function( err, result ){
                  if( err ){ console.log( err ); }
                  count ++;
                  if( count == r.facilities.length ){
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
          var sql1 = 'select distinct(key) from snapshots';
          var query1 = { text: sql1, values: [] };
          conn.query( query1, function( err, result1 ){
            if( err ){
              console.log( err );
              resolve( { status: false, error: err } );
            }else{
              if( result1 && result1.rows ){
                if( result1.rows.length > 0 ){
                  var snapshots = [];
                  var count = 0;
                  for( var i = 0; i < result1.rows.length; i ++ ){
                    var key = result1.rows[i].key;

                    var sql2 = 'select * from snapshots where key = $1 order by created desc';
                    var query2 = { text: sql2, values: [ key ] };
                    conn.query( query2, function( err, result2 ){
                      count ++;
                      if( err ){
                        console.log( err );
                      }else{
                        if( result2 && result2.rows ){
                          snapshots.push( { key: key, snapshots: result2.rows } );
                        }else{
                          snapshots.push( { key: key, snapshots: [] } );
                        }
                      }

                      if( count == result1.rows.length ){
                        resolve( { status: true, snapshots: snapshots } );
                      }
                    });
                  }
                }else{
                  resolve( { status: true, snapshots: [] } );
                }
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
api.post( '/create_facility', async function( req, res ){
  res.contentType( 'application/json; charset=utf-8' );

  var facility = req.body;
  api.createFacility( facility ).then( function( result ){
    res.status( result.status ? 200 : 400 );
    res.write( JSON.stringify( result, null, 2 ) );
    res.end();
  });
});

//. Read
api.get( '/read_facility/:facility_id', async function( req, res ){
  res.contentType( 'application/json; charset=utf-8' );

  var facility_id = req.params.facility_id;
  api.readFacility( facility_id ).then( function( result ){
    res.status( result.status ? 200 : 400 );
    res.write( JSON.stringify( result, null, 2 ) );
    res.end();
  });
});

//. Reads
api.get( '/read_facilities', async function( req, res ){
  res.contentType( 'application/json; charset=utf-8' );

  api.readFacilities().then( function( result ){
    res.status( result.status ? 200 : 400 );
    res.write( JSON.stringify( result, null, 2 ) );
    res.end();
  });
});

//. Plus
api.post( '/plus_asset', async function( req, res ){
  res.contentType( 'application/json; charset=utf-8' );

  var facility = req.body;
  api.plusAsset( facility ).then( function( result ){
    res.status( result.status ? 200 : 400 );
    res.write( JSON.stringify( result, null, 2 ) );
    res.end();
  });
});

//. Minus
api.post( '/minus_asset', async function( req, res ){
  res.contentType( 'application/json; charset=utf-8' );

  var facility = req.body;
  api.minusAsset( facility ).then( function( result ){
    res.status( result.status ? 200 : 400 );
    res.write( JSON.stringify( result, null, 2 ) );
    res.end();
  });
});

//. Consume(%)
api.post( '/consume_asset_percent/:facility_id', async function( req, res ){
  res.contentType( 'application/json; charset=utf-8' );

  var facility_id = req.params.facility_id;
  var percent = req.body.percent;
  api.consumeAssetPercent( asset_id, percent ).then( function( result ){
    res.status( result.status ? 200 : 400 );
    res.write( JSON.stringify( result, null, 2 ) );
    res.end();
  });
});

//. Consume(amount)
api.post( '/consume_asset_amount/:facility_id', async function( req, res ){
  res.contentType( 'application/json; charset=utf-8' );

  var facility_id = req.params.facility_id;
  var amount = req.body.amount;
  api.consumeAssetAmount( facility_id, amount ).then( function( result ){
    res.status( result.status ? 200 : 400 );
    res.write( JSON.stringify( result, null, 2 ) );
    res.end();
  });
});

//. Transport
api.post( '/transport_asset/:facility_id_from/:facility_id_to', async function( req, res ){
  res.contentType( 'application/json; charset=utf-8' );

  var facility_id_from = req.params.facility_id_from;
  var facility_id_to = req.params.facility_id_to;
  var amount = req.body.amount;
  api.transportAsset( facility_id_from, facility_id_to, amount ).then( function( result ){
    res.status( result.status ? 200 : 400 );
    res.write( JSON.stringify( result, null, 2 ) );
    res.end();
  });
});

//. Reset
api.post( '/reset_facility/:facility_id', async function( req, res ){
  res.contentType( 'application/json; charset=utf-8' );

  var facility_id = req.params.facility_id;
  api.resetFacility( facility_id ).then( function( result ){
    res.status( result.status ? 200 : 400 );
    res.write( JSON.stringify( result, null, 2 ) );
    res.end();
  });
});

//. Resets
api.post( '/reset_facilities', async function( req, res ){
  res.contentType( 'application/json; charset=utf-8' );

  api.resetFacilities().then( function( result ){
    res.status( result.status ? 200 : 400 );
    res.write( JSON.stringify( result, null, 2 ) );
    res.end();
  });
});

//. Remove
api.delete( '/remove_facility/:facility_id', async function( req, res ){
  res.contentType( 'application/json; charset=utf-8' );

  var facility_id = req.params.facility_id;
  api.removeFacility( facility_id ).then( function( result ){
    res.status( result.status ? 200 : 400 );
    res.write( JSON.stringify( result, null, 2 ) );
    res.end();
  });
});

//. Removes
api.delete( '/remove_facilities', async function( req, res ){
  res.contentType( 'application/json; charset=utf-8' );

  api.removeFacilities().then( function( result ){
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
